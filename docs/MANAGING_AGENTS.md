# Managing Agents

The platform now treats each `agencies` row as a Managing Agent. Examples are UK Support Housing, Serenity Housing, and any future managing agent added through setup or direct administration.

## Data Ownership

Operational records are owned by `agency_id`, which is the Managing Agent boundary used by the application. PMS, CRM, Finance, Reporting, Overview, imports, documents, and property certificates all read and write through the logged-in staff user's `agency_id`.

Core Managing Agent fields live in `agencies`:

| Field | Purpose |
| --- | --- |
| `id` | Managing Agent primary key |
| `name` | Display name |
| `trading_name` | Optional trading name |
| `contact_email`, `contact_phone` | Operational contact details |
| `address` | Managing Agent address |
| `status` | `active` or inactive-style state |
| `shared_file_root` | File server root for that agent |
| `currency_code` | Currency for dashboards and finance |
| `logo_path`, `branding` | Optional branding metadata |

## User Scoping

Each `staff_users` record belongs to one `agency_id`. Normal users only see data for that Managing Agent because the repository scope is resolved from the active staff session before falling back to the first active agency for public/non-authenticated rendering.

The `platform_admin` role is available for cross-agent administration. Platform admins see a Managing Agent selector in the top bar. Standard staff do not see this selector and remain restricted to their assigned Managing Agent.

## Adding a Managing Agent

1. Add a row to `agencies`.
2. Create at least one `staff_users` admin for that agency.
3. Assign imported PMS/CRM/Finance records to that agency through setup import or controlled backfill.
4. Verify the new admin sees only that agency's records.

## Platform Admin Switching

`staff_sessions.selected_agency_id` stores the active Managing Agent for a `platform_admin` session. Switching the selector refreshes the workspace so Overview, PMS, CRM, Finance, Reports and Setup Panel queries are recalculated against the selected Managing Agent.

The active context is intentionally visible in the app header. Platform admins receive a selector. Managing Agent admins and normal staff see a fixed badge for their assigned Managing Agent.

## Import, Remittance And Support Notes

All Cycle List imports, council tax records, remittance batches, remittance lines, landlord rates, landlord payment obligations and weekly support notes include `agency_id`. Server-side routes reject or ignore records outside the active Managing Agent context.

For Serenity Cycle List 100, import scripts resolve the Serenity Managing Agent explicitly and only write records scoped to that `agency_id`. UK Support Housing records are not touched by those import paths.

## Current Backfill Approach

Existing operational datasets can be moved between Managing Agents by updating `agency_id` on operational tables inside a transaction. Do not update users, website settings, or unrelated configuration unless that is the intended handover.
