# Remittance Processing

Phase 2 adds the schema and analyzer needed to model remittance processing safely. It does not import `Cycle 98.pdf` as Cycle 100 proof.

## Cycle 98 Analyzer

Run:

```bash
node scripts/analyze-cycle98-remittance.mjs
```

Optional source:

```bash
node scripts/analyze-cycle98-remittance.mjs --source "Serenity Consultancy (UK) Ltd council tax 2026-2027/Cycle 98.pdf"
```

The analyzer extracts, where confidence is sufficient:

- property label
- period covered
- payment lines
- days
- payable amount
- declared total payable

It redacts tenant/name text and reports name-token counts only. If extraction confidence is low, it says so and the amounts must not be used without manual confirmation.

## Schema

`db/serenity-cycle100-additive.sql` adds:

- `remittance_batches`
- `remittance_line_items`

Every row is scoped by `agency_id`. Optional `housing_association_id`, `cycle_list_number`, property, tenant and landlord links support future matching and payment workflows.

## Intended Workflow

1. Upload or import a monthly remittance file.
2. Parse property/address, period, tenant/name reference and amount.
3. Match lines against Serenity PMS data by normalized address, tenant/claim, occupancy period and cycle.
4. Mark low-confidence rows as `needs_review`.
5. Confirm matched lines before write.
6. Use confirmed lines to calculate landlord payment obligations.

## Platform Workflow

The Finance workspace now includes a focused remittance section for confirmed/previewed line entry. Lines are entered as:

```text
property address | amount | period start | period end | reference
```

The `/api/remittance` endpoint is server-side scoped by the active Managing Agent. It:

- creates or reuses a remittance batch
- matches each line to a property by normalized address
- flags unmatched properties or missing landlord rates as review items
- creates remittance line records
- creates landlord payment obligations only where a matching property and active rate exist
- blocks duplicate active obligations through the database uniqueness rule

The UI can search by address, including a Kings Road validation search, and shows received amount, cycle, match status, calculated landlord payment due and payment status.

## Duplicate Prevention

`remittance_batches` prevents duplicate source batches for the same agency, Housing Association, cycle and file name.

`remittance_line_items` prevents duplicate lines for the same agency, cycle, reference/address and payment period.

## Cycle 98 Limitation

Cycle 98 is a prior-cycle landlord remittance example. It must not be treated as Cycle 100 payment evidence.

## Safe Commands

```bash
node scripts/analyze-cycle98-remittance.mjs
node scripts/import-serenity-c100.mjs --dry-run
node scripts/import-serenity-council-tax-2026.mjs --dry-run
```

Only run commit modes after reviewing dry-run summaries:

```bash
node scripts/import-serenity-c100.mjs --commit
node scripts/import-serenity-council-tax-2026.mjs --commit
```
