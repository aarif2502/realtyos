# Property Certificates

## Purpose

Property certificates track compliance evidence for each property and surface expiry alerts in the Overview. Certificates are scoped by Managing Agent and property.

## Supported Certificate Types

- Gas Safety Certificate
- Electrical Installation Condition Report / EICR
- EPC
- Fire Risk Assessment
- HMO Licence
- Insurance
- PAT Testing
- Asbestos Report
- Legionella Risk Assessment
- Other

## Database Table

`property_certificates`

| Field | Purpose |
| --- | --- |
| `agency_id` | Managing Agent scope |
| `property_id` | Linked property |
| `certificate_type` | Certificate category |
| `certificate_name` | User-facing certificate title |
| `certificate_number` | Optional reference |
| `issuing_authority` | Provider or issuing body |
| `issue_date` | Date issued |
| `expiry_date` | Date the certificate expires |
| `status` | `valid`, `expiring_soon`, `expired`, or `missing_info` |
| `file_path`, `storage_key` | Shared file server reference |
| `created_by_user_id`, `updated_by_user_id` | Audit-friendly staff references |

## Status Rules

Status is calculated centrally in `lib/certificate-status.ts`.

- `missing_info`: certificate title, expiry date, or uploaded file is missing.
- `expired`: expiry date is before today.
- `expiring_soon`: expiry date is within the warning window.
- `valid`: expiry date is beyond the warning window and required fields exist.

Default warning window: `60` days. It can be overridden with `CERTIFICATE_EXPIRY_WARNING_DAYS`.

## User Workflow

1. Open PMS > Properties.
2. Open a property.
3. Select the `Certificates` tab.
4. Choose a certificate type.
5. Enter certificate title, reference, provider, issue date, expiry date, and notes.
6. Upload a PDF or image file.
7. Save. The platform calculates certificate status automatically.

## Dashboard Alerts

The Overview tile previously named Weekly Rent Roll has been replaced by `Certificate Alerts`. It shows:

- Expired certificate count.
- Expiring soon certificate count.
- A combined alert total.

Counts are filtered to the logged-in user's Managing Agent.

## Security

Certificate upload requires an authorized staff session. Records are written with the session Managing Agent and files are stored under the configured shared file server root. API routes verify that the target property belongs to the same Managing Agent.
