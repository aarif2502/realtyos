# Roles and Permissions

## Platform Super Admin

Role: `platform_admin`

Can:

- switch between all active Managing Agents
- access Setup Panel for the selected Managing Agent
- manage users for the selected Managing Agent
- import, export and reset selected Managing Agent data
- access PMS, CRM, Finance, Reporting and Overview in selected context
- manage Housing Associations, snapshots and payments in selected context
- create, edit, deactivate and reset staff logins across Managing Agents
- use the top-bar Managing Agent selector to change operational context

## Managing Agent Admin

Role: `admin`

Can:

- access Setup Panel for their own Managing Agent
- create/edit/deactivate staff users for their own Managing Agent
- import/export/reset their own Managing Agent PMS data
- manage PMS, CRM, Finance, Reporting, Housing Associations and cycle payments for their own Managing Agent
- create, edit, deactivate and reset staff users within their own Managing Agent only
- record remittance and landlord-payment activity for their own Managing Agent only

Cannot:

- switch Managing Agents
- view or edit another Managing Agent's data
- grant `platform_admin` access to themselves

## Staff Users

Roles: `manager`, `support_worker`, `housing_officer`, `finance`, `readonly`

Staff users are assigned to one Managing Agent and can only see that Managing Agent's data. Module capabilities are enforced server-side by API route role checks.

## Current Enforcement Points

- `lib/auth.ts` resolves the active staff session and selected Managing Agent.
- `components/Topbar.tsx` shows the active Managing Agent; only `platform_admin` users see the selector.
- `app/api/erp/[collection]/route.ts` requires authenticated staff roles for create, edit and delete operations, including setup/staff operations.
- `lib/erp-repository.ts` scopes PMS, CRM, Finance, Reporting, documents, support notes, remittance and landlord payment queries by `agency_id`.
- `app/api/remittance/route.ts` and `app/api/support-notes/export/route.ts` repeat server-side `agency_id` scoping before reading or writing.

## Bootstrap And Password Safety

Use the existing scripts with environment variables for passwords:

```bash
npm run admin:bootstrap-platform
npm run admin:bootstrap-managing-agents
npm run admin:reset-password -- --email user@example.com
```

Do not place plaintext passwords in committed files, documentation, SQL scripts or screenshots. Password reset tooling uses the platform password hashing method and must not print the password.
