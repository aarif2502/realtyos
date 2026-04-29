# Multi-Agent Data Scoping

## Summary

The platform uses the existing `agency_id` column as the Managing Agent scope. A staff session contains `agencyId`; server-side repository functions resolve the active Managing Agent from that session and apply it to queries and writes.

## Tables Scoped by Managing Agent

The following operational tables include `agency_id` and are filtered by the active session:

- `website_settings`
- `staff_users`
- `staff_sessions`
- `landlords`
- `properties`
- `rooms`
- `tenants`
- `occupancy_records`
- `housing_benefit_claims`
- `tenancy_contracts`
- `payment_ledger_entries`
- `support_notes`
- `documents`
- `property_certificates`
- `incidents`
- `crm_partners`
- `referrals`
- `communication_logs`
- `support_plans`
- `risk_assessments`
- `automation_tasks`
- `maintenance_jobs`
- `expense_entries`
- `landlord_payments`
- `import_logs`
- `import_row_errors`
- `pms_reset_logs`

## Request Flow

1. User signs in.
2. Session cookie stores staff ID, role, and Managing Agent ID.
3. API route calls `requireStaffSession`.
4. Repository calls `getAgencyId`.
5. `getAgencyId` resolves the Managing Agent from the authenticated session.
6. Queries include `where agency_id = $1`.
7. Creates and imports write records using the same session Managing Agent.

## Security Notes

- Do not rely on client-side filtering for Managing Agent isolation.
- Do not accept arbitrary `agency_id` from frontend forms for normal staff.
- Imports and PMS reset tools must use the authenticated/selected Managing Agent.
- Future cross-agent platform administration should use `platform_admin` plus an explicit server-validated Managing Agent selector.

## Troubleshooting

If a user sees no data:

1. Confirm the user belongs to the expected `agency_id`.
2. Confirm records in the relevant table have the same `agency_id`.
3. Confirm the user has an active session after reassignment.
4. Sign out and sign back in after changing a user's agency.

If a user sees another Managing Agent's data, check for raw SQL routes that do not include `agency_id` and update them to use `getAgencyId`.
