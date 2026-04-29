# PMS Excel Snapshots

## Template

Reference workbook:

`New Tenant List Cycle 74.xlsx`

Sheets:

- `README`
- `template`
- `lookups`

The export uses the `template` sheet and preserves the workbook structure where practical. Core populated columns are:

`PropertyAddress`, `Room`, `FirstName`, `MiddleName`, `LastName`, `DateOfBirth`, `NINumber`, `CheckinDate`, `CheckoutDate`, `HBClaimRefNumber`, `ReferralAgency`, `Age`, `Gender`, `Religion`, `Ethnicity`, `Nationality`, `Disability`, `SexualOrientation`, `SpokenLanguage`, `RiskAssessment`, `LengthOfStay`, `RecordStatus`.

## Snapshot Rules

Snapshots are stored in `pms_cycle_snapshots`.

Each snapshot includes:

- Managing Agent
- optional Housing Association
- Cycle List Number
- snapshot timestamp
- created-by user
- immutable JSON row copy
- counts and expected payment amount

Exporting a snapshot reuses the stored snapshot rows, so later live PMS edits do not silently change previous cycle exports.

## API

- `GET /api/pms/cycle-snapshots`
- `POST /api/pms/cycle-snapshots`
- `GET /api/pms/cycle-snapshots/:id/export`

All routes are server-side scoped by Managing Agent.
