# Configuration

Configuration is split across:

- `.env` for deployment/runtime secrets.
- `lib/platform-config.ts` for generic defaults.
- `website_settings` table for admin-editable branding and website settings.
- `agencies` table for company profile and shared file root.

Never commit `.env`.

Required production variables:

- `DATABASE_URL`
- `AUTH_SECRET`
- `NEXT_PUBLIC_APP_URL`
- `REALTYOS_ADMIN_EMAIL`
- `OWNER_ADMIN_EMAILS`
- `DOCUMENT_STORAGE_ROOT`

Optional integrations:

- `SMTP_*`
- `ANALYTICS_ID`
- `PAYMENT_*`
- `ALLOWED_ORIGINS`

Use Admin > Setup Panel to configure company profile, website branding, platform title/sidebar/logo, contact information, storage root, and staff users.
