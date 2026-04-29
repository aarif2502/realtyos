# Troubleshooting

## Cannot Log In

- Confirm admin exists in `staff_users`.
- Confirm password.
- Confirm `AUTH_SECRET` has not changed unexpectedly.
- Use `REALTYOS_RESET_ADMIN_EMAIL` and `REALTYOS_RESET_ADMIN_PASSWORD` with `npm run admin:reset-password`.

## Setup Panel Forbidden

- Confirm the signed-in email is listed in `OWNER_ADMIN_EMAILS`.
- Confirm role is `admin`.

## Database Error

- Check `DATABASE_URL`.
- Check PostgreSQL is running.
- Run `npm run db:migrate`.

## File Upload Error

- Check `DOCUMENT_STORAGE_ROOT`.
- Ensure the app has write permission.
- Confirm storage path is mounted in Docker.

## Build Error

- Run `npm run lint`.
- Check TypeScript output from `npm run build`.
- Ensure environment variables needed at build time are present.
