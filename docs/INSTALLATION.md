# Installation

Use `docs/RESELLABLE_PLATFORM_PACKAGE.md` as the master guide. This file is the short installation runbook.

## Docker

```bash
cp .env.example .env
docker compose up -d --build
docker compose exec app npm run first-run
docker compose exec app npm run smoke
```

## Manual

```bash
npm install
npm run db:migrate
npm run db:bootstrap-admin
npm run build
npm run start
```

## First Login

Open `/realtyos/admin/login` and sign in with `REALTYOS_ADMIN_EMAIL` and `REALTYOS_ADMIN_PASSWORD`.

Immediately rotate any temporary password and complete Admin > Setup Panel.
