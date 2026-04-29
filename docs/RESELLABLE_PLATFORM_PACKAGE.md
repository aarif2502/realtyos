# Resellable Platform Package

## A. Executive Summary

This platform is a reusable supported-housing software product. It includes:

- Public marketing website.
- Staff ERP workspace.
- Property management system.
- CRM for referrals, partners, councils and communication history.
- Compliance and support evidence layer.
- Finance/rent ledger and landlord payment features.
- Shared document storage.
- BI/reporting dashboards.
- Admin setup, website editor and platform customisation tools.

Suitable customers include supported housing providers, social housing operators, property-backed care/support organisations, charities managing accommodation, and small-to-mid-size housing agencies.

Deployment model:

- Recommended: one company per deployed installation.
- Database records are agency-scoped, but true multi-company SaaS isolation has not been fully productised.
- PostgreSQL is the system of record.
- Next.js serves the public website, staff app and API routes.

White-label readiness status:

- Business-specific defaults have been moved toward environment variables, database-backed website settings and setup-panel fields.
- The current production deployment can keep its existing database values.
- New deployments should start from `.env.example`, run migrations, bootstrap an admin, then complete the setup checklist.

## B. Fresh Deployment Guide

Prerequisites:

- Node.js 20 or later.
- PostgreSQL 16 recommended.
- npm.
- Optional Docker and Docker Compose.
- Linux server for production, or Windows/macOS for local development.

Server requirements:

- 2 vCPU minimum.
- 4 GB RAM minimum.
- 20 GB storage minimum plus document storage volume.
- HTTPS reverse proxy in production.

Runtime requirements:

- `DATABASE_URL`.
- `AUTH_SECRET`.
- `REALTYOS_ADMIN_EMAIL`.
- `REALTYOS_ADMIN_PASSWORD` for first bootstrap only.
- `OWNER_ADMIN_EMAILS`.
- `DOCUMENT_STORAGE_ROOT`.
- `NEXT_PUBLIC_APP_URL`.

Docker install:

```bash
cp .env.example .env
docker compose up -d --build
docker compose exec app npm run first-run
docker compose exec app npm run smoke
```

Manual install:

```bash
npm install
npm run db:migrate
npm run db:bootstrap-admin
npm run build
npm run start
```

Verification:

- Public homepage loads.
- `/realtyos/admin/login` loads.
- Admin can log in.
- `/realtyos/api/erp` returns `401` when not logged in.
- Setup panel is accessible only to the configured owner admin.
- Staff can create records according to role permissions.

## C. New Company Setup Guide

Required setup:

1. Set `.env` values.
2. Run database migration.
3. Bootstrap the first admin.
4. Log in to `/realtyos/admin/login`.
5. Open Admin > Setup Panel.
6. Complete the white-label setup checklist.

Branding:

- Upload or copy the client logo into `public/` or use Website Admin upload.
- Set website title, tagline, logo path, colours, fonts and footer.
- Set internal platform title, sidebar brand and ERP logo.

Domain:

- Point DNS to the server.
- Set `NEXT_PUBLIC_APP_URL`.
- Configure reverse proxy for HTTPS.
- Keep app path as `/realtyos` unless deliberately changing routing.

Email:

- Fill `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASSWORD`, `SMTP_FROM` when email features are wired for the client.
- Do not expose SMTP secrets in browser-visible settings.

Payment:

- Payment variables are placeholders only unless a provider integration is added.
- Use `PAYMENT_PROVIDER`, `PAYMENT_PUBLIC_KEY`, and `PAYMENT_SECRET_KEY`.
- Keep secret keys server-side only.

Admin/staff:

- Use `REALTYOS_ADMIN_EMAIL` and `REALTYOS_ADMIN_PASSWORD` for first bootstrap.
- Put all owner-admin emails in `OWNER_ADMIN_EMAILS`.
- Rotate temporary passwords after handover.

CRM:

- Add councils, referral partners, charities, support providers and health partners.
- Create leads/referrals and move them through the pipeline.
- Log activity and follow-up tasks.

SEO/legal:

- Update `NEXT_PUBLIC_SEO_TITLE`.
- Update public website copy in Setup > Website.
- Add privacy, terms and cookie policy content before launch.

Launch checklist:

- Strong `AUTH_SECRET`.
- Strong admin password.
- HTTPS enabled.
- PostgreSQL backup configured.
- Document storage path mounted.
- Smoke test passed.
- No production secrets committed.
- Client branding and contact details reviewed.

## D. Configuration Reference

Important files:

- `.env.example` - template for every deployment.
- `lib/platform-config.ts` - generic white-label defaults and app route helper.
- `lib/erp-repository.ts` - database-backed website/platform settings defaults.
- `db/schema.sql` - PostgreSQL schema and generic DB defaults.
- `docker-compose.yml` - Docker services and storage mount.
- `Dockerfile` - production container image.
- `next.config.ts` - routing/rewrites for `/realtyos`.

Important environment variables:

- `DATABASE_URL` - required PostgreSQL connection string.
- `DATABASE_SSL` - optional; set `true` for SSL DB connections.
- `AUTH_SECRET` - required production signing secret.
- `AUTH_COOKIE_SECURE` - set `true` behind HTTPS.
- `NEXT_PUBLIC_APP_URL` - public base URL.
- `NEXT_PUBLIC_PLATFORM_APP_PATH` - public app prefix, default `/realtyos`.
- `NEXT_PUBLIC_PRODUCT_NAME` - white-label product name.
- `NEXT_PUBLIC_DEFAULT_COMPANY_NAME` - generic company fallback.
- `NEXT_PUBLIC_DEFAULT_CONTACT_EMAIL` - generic contact fallback.
- `OWNER_ADMIN_EMAILS` - comma-separated owner-admin emails.
- `REALTYOS_ADMIN_EMAIL` - first bootstrap admin.
- `REALTYOS_ADMIN_PASSWORD` - first bootstrap admin password.
- `DOCUMENT_STORAGE_ROOT` - server-side file storage root.
- `ALLOWED_ORIGINS` - documented allow-list for future CORS hardening.
- `SMTP_*` - email provider settings.
- `ANALYTICS_ID` - analytics placeholder.
- `PAYMENT_*` - payment provider placeholders.

## E. Module Map

Public website:

- Routes: `/`.
- Files: `app/page.tsx`, `app/globals.css`, `components/PublicServiceSelector.tsx`.
- Config: database `website_settings`, `lib/platform-config.ts`.
- Customise: Setup > Website.

Staff workspace:

- Routes: `/realtyos`, `/app`.
- Files: `components/core/AppShell.tsx`, `components/Sidebar.tsx`, `components/Topbar.tsx`.
- Config: `website_settings.platform_*` fields.
- Customise: Setup > ERP Platform.

Authentication:

- Routes: `/realtyos/admin/login`, `/api/auth/*`.
- Files: `app/admin/login/page.tsx`, `app/api/auth/*`, `lib/auth.ts`.
- Tables: `staff_users`, `staff_sessions`.
- Config: `AUTH_SECRET`, `OWNER_ADMIN_EMAILS`, `AUTH_COOKIE_SECURE`.

PMS:

- Routes: `/app/properties`, `/app/tenants`, `/app/maintenance`, `/app/documents`.
- Tables: `properties`, `rooms`, `tenants`, `maintenance_jobs`, `documents`.
- APIs: `/api/erp/[collection]`, `/api/documents/*`, `/api/storage`.

CRM:

- Routes: `/app/crm`.
- File: `app/app/crm/page.tsx`.
- Tables: `crm_partners`, `referrals`, `communication_logs`, `automation_tasks`.
- Documentation: `docs/CRM_SYSTEM_OVERVIEW.md`.

Compliance:

- Routes: `/app/compliance`, `/app/support-notes`.
- Tables: `support_plans`, `risk_assessments`, `support_notes`, `incidents`.

Finance:

- Routes: `/app/finance`, `/app/contracts`, `/app/payments`, `/app/owners`.
- Tables: `tenancy_contracts`, `payment_ledger_entries`, `housing_benefit_claims`, `landlords`, `landlord_payments`, `expense_entries`.

Reports/BI:

- Routes: `/app/analytics`.
- APIs: `/api/reports/bi`, `/api/reports/cube`.
- Files: `lib/reporting.ts`.

Admin/setup:

- Routes: `/app/setup`, `/app/settings`.
- Files: `app/app/setup/page.tsx`, `app/api/setup/route.ts`.
- Permissions: owner admin only for setup.

## F. Codebase Map

Main directories:

- `app/` - Next.js routes and API routes.
- `components/` - shared UI and shell components.
- `lib/` - database, auth, storage, repositories, reporting, config.
- `db/` - schema migration SQL.
- `scripts/` - migration, bootstrap, local setup, smoke tests.
- `docs/` - technical documentation.
- `public/` - static logos/assets.

Where to edit:

- Branding defaults: `lib/platform-config.ts`, `.env`.
- Public pages: `app/page.tsx`.
- Navigation: `components/Sidebar.tsx`, `components/MobileNav.tsx`, `components/Topbar.tsx`.
- Admin pages: `app/app/setup/page.tsx`, `app/app/settings/page.tsx`.
- CRM: `app/app/crm/page.tsx`, `lib/erp-repository.ts`.
- Database: `db/schema.sql`, `scripts/migrate.mjs`.
- Permissions: `app/api/erp/[collection]/route.ts`, `lib/auth.ts`.
- Deployment: `Dockerfile`, `docker-compose.yml`, `scripts/provision-ubuntu.sh`.

## G. Database Map

Core tables:

- `agencies` - company profile and storage root.
- `website_settings` - white-label public and platform settings.
- `staff_users`, `staff_sessions` - auth.
- `landlords`, `properties`, `rooms`, `tenants` - PMS.
- `housing_benefit_claims`, `tenancy_contracts`, `payment_ledger_entries`, `expense_entries`, `landlord_payments` - finance.
- `support_notes`, `incidents`, `support_plans`, `risk_assessments` - compliance.
- `documents` - document registry and permissions.
- `crm_partners`, `referrals`, `communication_logs`, `automation_tasks` - CRM and reminders.
- `maintenance_jobs` - repairs and maintenance.

Migrations:

- Current migration is idempotent SQL in `db/schema.sql`.
- Run with `npm run db:migrate`.

Seed/bootstrap:

- `npm run db:bootstrap-admin` creates the first agency/admin if none exists.
- Demo/sample business data is not required and should not be shipped with production packages unless clearly marked.

Backup:

```bash
pg_dump "$DATABASE_URL" > backup.sql
```

Restore:

```bash
psql "$DATABASE_URL" < backup.sql
```

## H. Operations Guide

Common commands:

```bash
npm run lint
npm run build
npm run db:migrate
npm run first-run
npm run smoke
```

Logs:

- Docker: `docker compose logs -f app`.
- systemd: `journalctl -u realtyos -f`.

Restart:

- Docker: `docker compose restart app`.
- systemd: `sudo systemctl restart realtyos`.

Health checks:

- Homepage returns 200.
- App route returns 200 or redirects.
- Unauthenticated `/realtyos/api/erp` returns 401.
- Authenticated admin can load Setup.

Update:

1. Backup database.
2. Backup uploaded files.
3. Deploy source.
4. Run migrations.
5. Build.
6. Restart service.
7. Run smoke test.

Rollback:

- Restore previous app build/source.
- Restore DB backup only if migration/data changes require it.
- Restart service.

## I. Troubleshooting Guide

Install problems:

- Confirm Node 20+.
- Delete `node_modules` and run `npm install`.

Build problems:

- Run `npm run lint`.
- Check missing environment variables.
- Review Next.js/Turbopack warnings.

Database connection problems:

- Confirm `DATABASE_URL`.
- Confirm PostgreSQL is running.
- Run `npm run db:migrate`.

Migration problems:

- Check DB user permissions.
- Check `pgcrypto` extension permission.

Login/admin problems:

- Confirm `staff_users` contains an active admin.
- Confirm `OWNER_ADMIN_EMAILS` includes the setup owner.
- Reset password with `REALTYOS_RESET_ADMIN_EMAIL` and `REALTYOS_RESET_ADMIN_PASSWORD`.

Email problems:

- Confirm SMTP variables.
- Do not put SMTP secret values in client-visible settings.

Payment problems:

- Payment settings are placeholders unless a provider integration is added.

File upload problems:

- Confirm `DOCUMENT_STORAGE_ROOT` exists and is writable.
- Confirm uploads stay inside configured storage root.
- Confirm document role permissions.

Permission problems:

- Check role in `staff_users`.
- Check `writeRoles` in `app/api/erp/[collection]/route.ts`.

Blank page/routing problems:

- Confirm `/realtyos` rewrites in `next.config.ts`.
- Confirm reverse proxy preserves path.
- Confirm build completed.

## J. Security Checklist

- Use a unique strong `AUTH_SECRET`.
- Set `AUTH_COOKIE_SECURE=true` behind HTTPS.
- Never commit `.env`, keys, DB dumps or uploads.
- Use strong first admin password and rotate it.
- Keep setup restricted to `OWNER_ADMIN_EMAILS`.
- Restrict database access to app/server only.
- Use HTTPS.
- Validate file uploads and keep storage outside source control.
- Back up PostgreSQL and file storage.
- Avoid logging passwords, tokens or customer records.
- Review CORS/rate limiting before public API expansion.
- Keep dependencies patched.

## K. Resale Checklist

Change before selling/deploying:

- `.env` values.
- Company name, logo, colours, fonts.
- Contact details.
- Domain and HTTPS.
- Owner admin email.
- Staff users.
- Storage root.
- Legal/privacy/cookie content.
- SEO metadata.
- Email/payment provider settings if used.

Verify before handover:

- Admin can log in.
- Setup checklist complete.
- Public site has client branding.
- No sample/private data present.
- Backups configured.
- Smoke test passes.

Must remain private:

- `.env`.
- SSH keys.
- Database passwords.
- `AUTH_SECRET`.
- SMTP/payment secrets.
- Production DB dumps.
- Uploaded customer documents.

Third-party services to review:

- Next.js, React, PostgreSQL, Recharts, lucide-react, xlsx, pg and any hosting/email/payment providers. This is technical guidance only, not legal advice.

## L. Changes Made In This Task

Summary:

- Added a reusable configuration layer.
- Generalised business-specific defaults.
- Added white-label setup checklist in Admin Setup.
- Replaced the static setup checklist with a live setup status engine and clickable setup workflow tiles.
- Added owner-admin Excel source-data import with preview, mapping, validation, confirmation and import logs.
- Added owner-admin PMS fresh-start/reset and `New Tenant List Cycle 74.xlsx` import workflow with automatic Record Status calculation.
- Improved `.env.example` for resale/client deployments.
- Made Docker Compose configurable.
- Removed hardcoded smoke-test user data.
- Added commercial packaging documentation.

Files modified or added:

- `.env.example`
- `README.md`
- `docker-compose.yml`
- `package.json`
- `lib/platform-config.ts`
- `lib/erp-repository.ts`
- `lib/auth.ts`
- `lib/storage.ts`
- `app/layout.tsx`
- `app/page.tsx`
- `app/admin/login/page.tsx`
- `app/login/page.tsx`
- `app/not-found.tsx`
- `app/app/setup/page.tsx`
- `components/BrandMark.tsx`
- `components/PortalUnavailable.tsx`
- `components/Sidebar.tsx`
- `components/Topbar.tsx`
- `components/core/WorkspaceAccessGuard.tsx`
- `db/schema.sql`
- `scripts/bootstrap-admin.mjs`
- `scripts/migrate.mjs`
- `scripts/reset-admin-password.mjs`
- `scripts/setup-local-db.mjs`
- `scripts/smoke-test-erp.mjs`
- `lib/setup-status.ts`
- `lib/excel-import.ts`
- `lib/tenant-cycle-import.ts`
- `lib/record-status.ts`
- `app/api/setup/status/route.ts`
- `app/api/import/excel/route.ts`
- `app/api/pms/cycle-import/route.ts`
- `docs/SETUP_CHECKLIST.md`
- `docs/DATA_IMPORT.md`
- Documentation files in `docs/`.

Database changes:

- No destructive production data changes.
- Schema defaults were generalised for fresh deployments.
- Existing production records are not overwritten by these defaults.
- Added `import_logs` for source-data import audit history.
- Added `occupancy_records`, `import_row_errors`, `pms_reset_logs` and tenant record-status support for PMS mobilisation.

Checks:

- Run `npm run lint`.
- Run `npm run build`.
- Run Docker build where practical before packaging.

## Managing Agents and Certificates

The reusable product now treats each agency record as a Managing Agent. Operational modules should scope reads and writes by the authenticated staff session's `agency_id`. Property certificates are stored in `property_certificates`, linked to both Managing Agent and property, and surfaced through the Overview Certificate Alerts tile. See `docs/MANAGING_AGENTS.md`, `docs/MULTI_AGENT_DATA_SCOPING.md`, and `docs/PROPERTY_CERTIFICATES.md`.

## Website Module and Platform Admin

The public website is documented in `docs/WEBSITE_MODULE.md` and uses `modules/website/website.config.ts` plus database-backed `website_settings` for customization. Backend user administration is documented in `docs/POSTGRES_USER_ADMIN.md` and `docs/AUTHENTICATION_AND_PASSWORDS.md`. Use `npm run admin:bootstrap-platform` with `PLATFORM_SUPER_ADMIN_PASSWORD` to safely create or reset `admin@platform.local`; passwords are hashed and never printed.

## Housing Associations, Cycle Lists and Payments

Housing Associations are stored in housing_associations and scoped by Managing Agent. PMS monthly snapshots are stored in pms_cycle_snapshots with immutable snapshot rows and a Cycle List Number. Housing Association payment tracking is stored in housing_association_payments. The PMS cycle Excel export uses New Tenant List Cycle 74.xlsx as its template. See docs/HOUSING_ASSOCIATIONS.md, docs/PMS_EXCEL_SNAPSHOTS.md, docs/CYCLE_LIST_PAYMENTS.md, and docs/DATA_EXPORT.md.
