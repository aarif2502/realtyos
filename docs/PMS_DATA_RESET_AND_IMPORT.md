# PMS Data Reset and Tenant Cycle Import

## Purpose

The Setup Panel now includes a Managing-Agent admin workflow for starting the PMS module fresh and loading the `New Tenant List Cycle 74.xlsx` tenant-cycle template.

The workflow is designed for controlled mobilisation:

- reset existing PMS records only after strong confirmation
- upload and validate the Excel template
- preview rows before import
- calculate `Record Status` automatically
- import properties, rooms, tenants and occupancy records into PostgreSQL
- show status counts on the Overview dashboard

## Admin Permissions

The reset and tenant-cycle import API is protected by `requireStaffSession(["admin"])`. Non-admin staff cannot call the API or use the UI workflow. The backend still scopes reset/import actions to the authenticated admin's Managing Agent.

API route:

- `GET /realtyos/api/pms/cycle-import`
- `POST /realtyos/api/pms/cycle-import`

## PMS Fresh Start

The reset workflow deletes:

- properties
- rooms
- tenants
- occupancy records
- PMS support notes
- housing benefit claims
- tenancy contracts
- property/tenant-linked payment ledger entries

The reset workflow does not delete:

- staff users
- agency settings
- website settings
- CRM partners/referrals
- public website content
- document files or document registry records
- reporting configuration

The admin must type:

`DELETE PMS DATA`

The backend performs the reset inside a PostgreSQL transaction and writes to `pms_reset_logs` plus `import_logs`.

## Managing Agent Scope

Reset and import operations are Managing-Agent scoped. Imported PMS records are written with the authenticated admin user's `agency_id`, and reset actions must only affect the current Managing Agent's PMS data. This prevents a Serenity Housing reset/import from altering UK Support Housing or future Managing Agent datasets.

Related documentation:

- `docs/MANAGING_AGENTS.md`
- `docs/MULTI_AGENT_DATA_SCOPING.md`
- `docs/PROPERTY_CERTIFICATES.md`

## Excel Template

Reference file:

`New Tenant List Cycle 74.xlsx`

Expected workbook structure:

- `README`
- `template`
- `lookups`

The import uses the `template` sheet.

Expected headers:

- `PropertyAddress`
- `Room`
- `FirstName`
- `MiddleName`
- `LastName`
- `DateOfBirth`
- `NINumber`
- `CheckinDate`
- `CheckoutDate`
- `HBClaimRefNumber`
- `ReferralAgency`
- `Age`
- `Gender`
- `Religion`
- `Ethnicity`
- `Nationality`
- `Disability`
- `SexualOrientation`
- `SpokenLanguage`
- `RiskAssessment`
- `LengthOfStay`
- `RecordStatus`

## Mapping

| Excel column | Destination |
|---|---|
| `PropertyAddress` | `properties.address` |
| `Room` | `rooms.room_label`, `occupancy_records.room_label` |
| `FirstName`, `MiddleName`, `LastName` | `tenants` name fields |
| `DateOfBirth` | `tenants.date_of_birth` |
| `NINumber` | `tenants.ni_number` |
| `CheckinDate`, `CheckoutDate` | `tenants` and `occupancy_records` dates |
| `HBClaimRefNumber` | `tenants.hb_claim_ref_number` |
| `ReferralAgency` | `tenants.referral_agency` |
| Demographic/risk fields | matching `tenants` fields |
| `RecordStatus` | `tenants.template_record_status`; automatic status is stored separately |
| payment notes column after RecordStatus | `tenants.payment_status` |

## Record Status Rules

Record status is calculated in `lib/record-status.ts`.

Rules:

- `needs_review`: template status contains `#REF!` or an `Empty` warning, or required fields are missing.
- `pending`: check-in date is missing or invalid.
- `expired`: checkout date is in the past.
- `ending_soon`: checkout date is within 30 days.
- `active`: required fields exist, check-in date exists and there is no past checkout date.
- `vacant`: reserved for rooms with no active tenant.
- `archived`: reserved for future archive behaviour.

Room status is derived from record status:

- `active`, `ending_soon`, `needs_review` -> occupied
- `expired`, `vacant` -> void
- otherwise -> available

## Database Changes

Schema additions:

- `occupancy_records`
- `import_row_errors`
- `pms_reset_logs`
- tenant columns:
  - `template_record_status`
  - `payment_status`
  - `status_reason`
  - `source_import_log_id`
- import log column:
  - `action_type`

Indexes were added for tenant status, NI number, occupancy status, occupancy property/room lookups, import row errors and reset logs.

## Troubleshooting

- Upload rejected: confirm the file is `.xlsx` and under the size limit.
- Missing headers: use the `template` sheet from `New Tenant List Cycle 74.xlsx`.
- Import blocked: fix required-field errors first.
- Warnings appear: records may still be importable, but the dashboard will mark affected records as `Needs Review`.
- Status counts missing: confirm migration has run and the import created `occupancy_records`.
- Duplicate tenant skipped: NI number or matching tenant identity already exists.
