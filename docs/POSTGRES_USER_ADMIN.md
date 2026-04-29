# PostgreSQL User Administration

## Purpose

This guide explains how backend platform logins are represented in PostgreSQL and how to manage them safely. Do not store plaintext passwords in PostgreSQL.

## Relevant Tables

| Table | Purpose |
| --- | --- |
| `staff_users` | Staff login accounts, role, Managing Agent assignment and password hash. |
| `staff_sessions` | Active staff sessions. Includes selected Managing Agent for `platform_admin`. |
| `agencies` | Managing Agents. `staff_users.agency_id` points here. |

Important `staff_users` fields:

- `agency_id`: user's home Managing Agent.
- `email`: unique login email.
- `role`: `platform_admin`, `admin`, `manager`, `support_worker`, `housing_officer`, `finance`, or `readonly`.
- `password_hash`: PBKDF2 password hash. Never edit with plaintext.
- `active`: disables/enables login.
- `force_password_change`: prompts operational handling for temporary-password accounts.
- `password_updated_at`: last password update timestamp.

## Safe Read-Only Queries

List Managing Agents:

```sql
select id, name, trading_name, status
from agencies
order by name;
```

List users and assignments:

```sql
select u.id, u.full_name, u.email, u.role, u.active, a.name as managing_agent
from staff_users u
join agencies a on a.id = u.agency_id
order by a.name, u.email;
```

List platform admins:

```sql
select id, full_name, email, active
from staff_users
where role = 'platform_admin';
```

## Safe Updates

Assign a staff user to another Managing Agent:

```sql
update staff_users
set agency_id = '<target-agency-uuid>'
where email = '<staff-email@example.com>';
```

Disable a user:

```sql
update staff_users
set active = false
where email = '<staff-email@example.com>';
```

Revoke that user's active sessions:

```sql
update staff_sessions
set revoked_at = now()
where staff_id = (select id from staff_users where email = '<staff-email@example.com>')
  and revoked_at is null;
```

## Password Resets

Do not insert plaintext passwords into `staff_users.password_hash`.

Use the bootstrap/reset script instead:

```bash
PLATFORM_SUPER_ADMIN_PASSWORD='<secure-password>' RESET_PLATFORM_SUPER_ADMIN_PASSWORD=true npm run admin:bootstrap-platform
```

The script hashes the password using the platform PBKDF2 method and does not print the password.

Managing Agent admin bootstrap:

```bash
SERENITY_ADMIN_PASSWORD='<secure-password>' UK_SUPPORT_HOUSING_ADMIN_PASSWORD='<secure-password>' npm run admin:bootstrap-managing-agents
```

This creates or updates Managing Agent admins without printing passwords.

## Super Admin

`admin@platform.local` is the default platform super-admin email. It uses role `platform_admin`. Platform admins can switch the active Managing Agent through the app top bar. Standard users cannot switch Managing Agents.

## Warnings

- Never share database credentials in tickets, screenshots or documentation.
- Never paste password hashes into chat.
- Always revoke sessions after role, agency or password-sensitive changes.
- Prefer application/API flows over direct SQL for day-to-day operations.
