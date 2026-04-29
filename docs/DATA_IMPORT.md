# Excel Data Import

## Overview

The Excel import wizard allows an owner-admin to upload `.xlsx` source data, preview sheets, map columns, validate rows, and confirm import into PostgreSQL.

Route:

- `/realtyos/app/setup?tab=import`

API:

- `GET /realtyos/api/import/excel`
- `POST /realtyos/api/import/excel`

Core service:

- `lib/excel-import.ts`

Audit table:

- `import_logs`

## Supported File Types

- `.xlsx`
- Maximum upload size: 8 MB

Files are parsed server-side. The API is owner-admin only.

## Managing Agent Assignment

Imports are assigned to the Managing Agent from the authenticated staff session. The frontend should show the current Managing Agent context before import, and backend import routes must not trust a client-supplied `agency_id` for normal staff users.

## Supported Destinations

CRM:

- `crm_partners`
- `referrals`

PMS:

- `properties`
- `tenants`
- dedicated tenant-cycle import for `New Tenant List Cycle 74.xlsx`

Overview/Reporting:

- `payment_ledger_entries`

Overview and BI reports are calculated from operational source records, so importing PMS/CRM/ledger records updates dashboards through the normal data layer.

## Smart Detection

The importer looks at sheet names and headers.

Examples:

- `Contacts`, `Customers`, `Clients`, `Accounts`, `Partners` -> CRM contacts/accounts.
- `Leads`, `Referrals`, `Pipeline`, `Applicants` -> CRM referrals.
- `Properties`, `Units`, `Rooms`, `Assets`, `Buildings` -> PMS properties.
- `Tenants`, `Residents`, `Service Users` -> PMS tenants.
- `Payments`, `Rent`, `Ledger`, `Transactions`, `Revenue`, `Costs`, `Metrics` -> reporting ledger.

## Mapping

After upload, each sheet shows:

- detected target
- detected headers
- suggested field mapping
- preview rows

Admins can change target module and column mappings before validation.

## Validation

Validation checks required fields:

- CRM contacts: `organisationName`
- Referrals: `applicantName`
- Properties: `address`
- Tenants: `firstName`, `lastName`
- Ledger/reporting rows: `description`

Validation errors include sheet, row number, field and message.

## Duplicate Handling

The importer avoids obvious duplicates:

- CRM partners: organisation name.
- Referrals: applicant name.
- Properties: existing `(agency_id, address)` unique key.
- Tenants: NI number if available, otherwise first/last name.

Duplicates are skipped and counted in the import result.

## Confirmation

Rows are only written after the admin clicks `Confirm Import to Database`.

The import uses a database transaction. If a write fails, the transaction rolls back and the import log is marked failed.

## Import Logs

Each import records:

- filename
- uploaded admin
- target modules
- sheet count
- rows parsed
- rows imported
- rows skipped
- validation errors
- status
- mapping used
- preview/validation payload
- error summary

## Troubleshooting

Upload rejected:

- Confirm the file is `.xlsx`.
- Confirm file size is below 8 MB.

Headers not detected:

- Ensure the first row has column headers.
- Avoid merged header cells.

Wrong module detected:

- Change the target dropdown for the sheet.

Mapping errors:

- Select the correct source column beside each required field.

Validation errors:

- Fix required fields in the workbook or mapping.

Imported data not visible:

- Refresh the target module.
- Check import log status.
- Confirm rows were imported and not skipped as duplicates.

Permission denied:

- Sign in as configured owner admin.

## Dedicated New Tenant List Cycle 74 Import

The Setup Panel also includes a focused PMS import for `New Tenant List Cycle 74.xlsx`.

Route:

- `/realtyos/app/setup?activity=pms_foundation`

API:

- `GET /realtyos/api/pms/cycle-import`
- `POST /realtyos/api/pms/cycle-import`

Expected workbook:

- `README`
- `template`
- `lookups`

The importer reads the `template` sheet and maps tenant-cycle fields into `properties`, `rooms`, `tenants` and `occupancy_records`.

Unlike the generic importer, this workflow also calculates operational `Record Status` automatically and surfaces status counts on the Overview dashboard.
