# Supported Housing Platform

Reusable white-label SaaS-style platform for supported housing operators. The product includes a public website, staff ERP, PMS, CRM, compliance, documents, finance/rent ledger, analytics, and admin setup tools backed by PostgreSQL.

This repository is designed for a single-company deployment per installation. The database has an `agencies` table and agency-scoped records, but the current packaging assumes one operating company per deployed instance. See `docs/RESELLABLE_PLATFORM_PACKAGE.md` before deploying for a client.

## Quick Start

1. Copy environment template:

```bash
cp .env.example .env
```

2. Edit `.env` with client-specific values. Never commit `.env`.

3. Start with Docker:

```bash
docker compose up -d --build
docker compose exec app npm run first-run
```

4. Or run manually:

```bash
npm install
npm run db:migrate
npm run db:bootstrap-admin
npm run dev
```

5. Open:

- Public site: `http://localhost:3000`
- Staff app: `http://localhost:3000/realtyos`
- Admin login: `http://localhost:3000/realtyos/admin/login`

## Core Commands

```bash
npm run dev
npm run lint
npm run build
npm run db:migrate
npm run db:bootstrap-admin
npm run first-run
npm run smoke
```

## Documentation

- `docs/RESELLABLE_PLATFORM_PACKAGE.md` - master deployment, resale, configuration, security, and operations guide.
- `docs/INSTALLATION.md` - fresh installation guide.
- `docs/DEPLOYMENT.md` - server and Docker deployment notes.
- `docs/CONFIGURATION.md` - configuration reference.
- `docs/WHITE_LABEL_GUIDE.md` - rebranding and client setup.
- `docs/OPERATIONS.md` - backup, restore, logs, updates.
- `docs/SECURITY.md` - production security checklist.
- `docs/TROUBLESHOOTING.md` - common issues and fixes.
- `docs/CRM_SYSTEM_OVERVIEW.md` - CRM module technical map.

## Security

Do not commit `.env`, production database dumps, uploaded client files, private keys, or customer data. Use strong `AUTH_SECRET`, strong admin passwords, HTTPS, regular PostgreSQL backups, and restricted server access in production.
