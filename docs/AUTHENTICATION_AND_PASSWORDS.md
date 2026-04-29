# Authentication and Passwords

## Model

Authentication is PostgreSQL-backed:

- `staff_users` stores staff accounts and PBKDF2 password hashes.
- `staff_sessions` stores active sessions.
- The `realtyos_session` cookie contains a signed session payload.
- Passwords are never stored in plaintext.

## Roles

Supported staff roles:

- `platform_admin`: super-level platform administration and Managing Agent switching.
- `admin`: Managing-Agent admin.
- `manager`
- `support_worker`
- `housing_officer`
- `finance`
- `readonly`

## Platform Admin Bootstrap

Use:

```bash
PLATFORM_SUPER_ADMIN_PASSWORD='<secure-password>' RESET_PLATFORM_SUPER_ADMIN_PASSWORD=true npm run admin:bootstrap-platform
```

This ensures `admin@platform.local` exists with `platform_admin` role, updates the password only when reset is requested, revokes active sessions after reset, and does not print the password.

## Password Change

Every logged-in user can change their own password from Settings/Profile.

The API route is:

- `POST /api/auth/change-password`

Request fields:

- `currentPassword`
- `newPassword`
- `confirmPassword`

Rules:

- current password must verify successfully
- new password must be at least 10 characters
- new password must include uppercase, lowercase, number and symbol characters
- new password and confirmation must match

On success:

- `staff_users.password_hash` is updated using PBKDF2
- `password_updated_at` is set
- `force_password_change` is cleared
- other active sessions are revoked

## Managing Agent Switching

Only `platform_admin` can switch Managing Agents. The selected agent is stored in `staff_sessions.selected_agency_id`. Standard users always use their assigned `staff_users.agency_id`.

API:

- `GET /api/managing-agents`
- `POST /api/managing-agents`

## Staff Creation and Assignment

Managing-Agent admins create staff users in the Setup Panel. Platform admins should first select the target Managing Agent from the top bar, then create the staff login. New staff accounts are created under that active Managing Agent and are marked with `force_password_change = true` when a temporary password is set.

## Troubleshooting

Cannot log in:

1. Confirm user exists in `staff_users`.
2. Confirm `active = true`.
3. Reset password through the bootstrap or reset script.
4. Revoke old sessions if role or agency changed.

Wrong Managing Agent data:

1. Confirm `staff_users.agency_id`.
2. For `platform_admin`, confirm `staff_sessions.selected_agency_id`.
3. Sign out and sign in again after assignment changes.
