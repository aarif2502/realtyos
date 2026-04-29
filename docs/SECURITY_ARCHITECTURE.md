# Security Architecture

## Current Controls

- Staff passwords are stored as PBKDF2 hashes in `staff_users.password_hash`.
- Staff sessions are stored in `staff_sessions` and signed into the `realtyos_session` HTTP-only cookie.
- API routes use `requireStaffSession()` for server-side authorization.
- Managing Agent scoping resolves through the authenticated session and `getAgencyId()`.
- Platform admins use `staff_sessions.selected_agency_id` to switch active Managing Agent context.
- File/document APIs verify authenticated access and Managing Agent ownership before opening files.

## Roles

- `platform_admin`: cross-platform access, Managing Agent selector, Setup Panel, imports, exports, user administration.
- `admin`: Managing Agent admin for one assigned Managing Agent.
- `manager`, `housing_officer`, `support_worker`, `finance`, `readonly`: module-scoped operational roles.

## Hardening Added

- Added explicit Housing Association, cycle snapshot, and payment tables scoped by `agency_id`.
- Added server-side export/snapshot endpoints that never trust client-side Managing Agent IDs.
- Added visible Managing Agent context in the top bar for all logged-in users.
- Added safe bootstrap scripts for platform and Managing Agent admins.
- Added documentation for PostgreSQL login administration and password reset safety.

## Security Rules for Developers

- Never accept `agency_id` from normal frontend forms.
- Always query operational records with `agency_id = active session agency`.
- Platform-admin switching must be persisted only after validating the target Managing Agent server-side.
- Passwords must be changed through platform hashing flows, not SQL plaintext.
- Export endpoints must scope by session Managing Agent and reject unauthorized snapshot IDs.
