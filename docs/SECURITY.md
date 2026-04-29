# Security

Production checklist:

- Unique `AUTH_SECRET`.
- `AUTH_COOKIE_SECURE=true` behind HTTPS.
- Strong owner-admin password.
- `OWNER_ADMIN_EMAILS` set correctly.
- PostgreSQL not publicly exposed unless protected.
- `.env`, SSH keys, DB dumps and uploads never committed.
- Document storage writable only by the app/service account.
- Backups encrypted or stored securely.
- Admin setup restricted to owner admin.
- File paths validated under the configured storage root.
- Review third-party libraries and service terms before resale.

This is technical guidance only, not legal advice.
