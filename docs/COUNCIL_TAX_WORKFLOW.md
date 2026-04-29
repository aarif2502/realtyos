# Council Tax Workflow

Serenity council tax data is imported from `Council Tax Receipt 2026-27.xlsx`. The 28 council tax PDFs are supporting evidence and should be linked to properties/documents later, but the workbook is the authoritative structured source for the first import.

## Schema

Migration `db/serenity-cycle100-additive.sql` adds `council_tax_records`.

Important fields:

- `agency_id`
- `housing_association_id`
- `property_id`
- `account_ref`
- `source_property_address`
- `normalized_property_address`
- `tax_year`
- `liability_start_date`
- `liability_end_date`
- `band`
- `annual_charge`
- `outstanding_debt`
- `six_month_deduction`
- `self_contained`
- `status`
- `needs_review_reason`
- `source_import_log_id`

Uniqueness is enforced on `(agency_id, account_ref, tax_year)` to support safe reruns.

## Dry-Run

```bash
node scripts/import-serenity-council-tax-2026.mjs --dry-run
```

Optional source:

```bash
node scripts/import-serenity-council-tax-2026.mjs --dry-run --source "Serenity Consultancy (UK) Ltd council tax 2026-2027/Council Tax Receipt 2026-27.xlsx"
```

Dry-run resolves the Serenity agency, previews property matching, validates rows, and prints only summary counts and totals.

## Commit

Only after dry-run review:

```bash
node scripts/import-serenity-council-tax-2026.mjs --commit
```

Commit mode creates/reuses `Ash-Shahada Housing Association Ltd`, writes import audit records, and upserts council tax rows for Serenity only.

## Validation

Blocking:

- missing account reference
- missing property address

Warnings:

- unmatched PMS property
- missing/invalid liability start date
- blank council tax band
- missing/formula-only annual charge

The importer now ignores narrative/footer rows in the workbook (totals, explanatory notes, deduction schedule headings) so only actual council-tax data rows are validated and imported.

Unmatched properties are imported with `needs_review`; they are not silently matched to another Managing Agent.

## Status Rules

- `active`: required fields present and property matched
- `missing_info`: important council tax values are missing
- `needs_review`: no safe PMS property match or conflicting data
- `ended`: liability end date is in the past

## Safe Rerun

Reruns update the same `(agency_id, account_ref, tax_year)` row. UK Support Housing and other Managing Agents are not touched.

## Current Serenity Cycle 100 Validation Note

After the Serenity C100 PMS import, the council tax dry-run parsed 42 rows and matched a small number of properties, but still reported 14 blocking validation errors caused by missing account reference or property address fields. Council tax commit must remain blocked until those source rows are corrected, excluded by an explicit reviewed rule, or mapped manually in a future enhancement.

## Assisted Manual Property Matching

The Finance workspace now includes a `Council Tax Assisted Property Match` panel for rows in `needs_review` or `missing_info` status.

Workflow:

1. Open Finance as an authorized role (`admin`, `manager`, `housing_officer`, `finance`).
2. Find a council tax row flagged for review.
3. Select the matching property from the dropdown.
4. Optionally add an audit note.
5. Submit `Apply Match`.

Server endpoint:

`POST /api/council-tax/match`

Server-side safety:

- requires authenticated staff role
- enforces active `agency_id` context
- verifies the council tax row belongs to the same Managing Agent
- verifies the selected property belongs to the same Managing Agent
- writes audit metadata (`matchedByStaffId`, `matchedAt`, optional note)
- recalculates status to `active`, `missing_info`, or `ended` based on required field completeness and end date
