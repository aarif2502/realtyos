# Serenity Housing Cycle 100 Import

This guide covers the Phase 2 safe import tooling. The scripts are intentionally dry-run first and must not be run in commit mode until the dry-run output has been reviewed.

## Files Added Or Changed

- Migration: `db/serenity-cycle100-additive.sql`
- Canonical schema updated: `db/schema.sql`
- C100 importer: `scripts/import-serenity-c100.mjs`
- Council tax importer: `scripts/import-serenity-council-tax-2026.mjs`
- Remittance analyzer: `scripts/analyze-cycle98-remittance.mjs`

## Migration

Run the canonical migration:

```bash
npm run db:migrate
```

Or apply only the additive Serenity migration if you are doing a controlled DBA review:

```bash
psql "$DATABASE_URL" -f db/serenity-cycle100-additive.sql
```

The migration is additive. It creates council tax, remittance, landlord rate and landlord payment obligation tables, plus cycle/import linkage columns. It does not drop or reset data.

## Dry-Run Command

```bash
node scripts/import-serenity-c100.mjs --dry-run
```

Optional source path:

```bash
node scripts/import-serenity-c100.mjs --dry-run --source "Serenity Consultancy (UK) Ltd council tax 2026-2027/Serenity Consultancy UK Ltd C100.xlsx"
```

The script requires `DATABASE_URL` because it resolves the Serenity Managing Agent and previews matches against existing Serenity-only PMS records. It prints counts and totals only; it does not print tenant names or full sensitive row data.

## Commit Command

Only after dry-run review:

```bash
node scripts/import-serenity-c100.mjs --commit
```

Commit mode:

- resolves exactly one active Serenity agency
- creates/reuses `Ash-Shahada Housing Association Ltd` for Serenity
- uses `cycle_list_number = 100`
- writes an `import_logs` record
- writes row-level warnings/errors to `import_row_errors`
- upserts Serenity-only properties, rooms, tenants and occupancy records
- creates/updates the Cycle 100 PMS snapshot
- stages C100 finance/remittance lines
- creates/updates the Housing Association payment summary
- runs inside one transaction

## Safe Rerun Behavior

Reruns are designed to update the same Serenity Cycle 100 records rather than duplicate them:

- tenants are matched by Serenity `agency_id` and claim reference where available
- occupancy records are matched by agency, property, room label and tenant
- payment ledger rows use deterministic references
- remittance lines use cycle, claim/reference, address and period
- snapshot and HA payment rows use agency, HA and cycle number

## Validation Rules

Blocking errors:

- missing property address
- missing claim reference
- missing first name or surname
- invalid/missing BCC period

Warnings:

- expected/gross/admin amount missing
- adjustment-only negative net rows
- duplicate claim/period/property keys
- needs-review record status

Warnings are logged and imported as `needs_review` where relevant. Blocking errors prevent commit.

## Local Limitation

The local machine used for the Phase 1 audit did not have `DATABASE_URL` configured, so live create/update counts could not be calculated locally. Run `--dry-run` on the server before any commit.

## Phase 3 Operational Checks

After migration and dry-run review:

1. Confirm the active Serenity Managing Agent exists once only.
2. Run `node scripts/import-serenity-c100.mjs --dry-run`.
3. Run `node scripts/import-serenity-council-tax-2026.mjs --dry-run`.
4. Review import totals, skipped rows, warnings and `needs_review` counts.
5. Confirm UK Support Housing counts are unchanged before commit.
6. Run commit mode only if the dry-runs are clean or the warnings are intentionally accepted.
7. Open Overview and Finance under Serenity context and confirm Cycle 100 totals, council tax review counts, remittance/payment status and Housing Association payment summary.

## Related UI

- Overview: shows Cycle remittance, payment actions and council tax review indicators from live `agency_id` scoped data.
- Finance: supports Housing Association setup, Cycle List snapshots, remittance import/search, landlord rates and manual payment recording.
- Support Notes: supports weekly note creation and PDF export for the active Managing Agent.
