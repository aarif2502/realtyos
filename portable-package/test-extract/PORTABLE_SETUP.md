# UK Support Housing Portable Setup

This package contains the full RealtyOS / UK Support Housing platform source code.

## Option A: Docker Setup

1. Install Docker Desktop or Docker Engine.
2. Copy `.env.example` to `.env`.
3. Edit `.env` and set:
   - `DATABASE_URL`
   - `AUTH_SECRET`
   - `OWNER_ADMIN_EMAILS`
   - `DOCUMENT_STORAGE_ROOT`
4. Start the platform:

```bash
docker compose up -d --build
```

5. Run first setup:

```bash
docker compose exec app npm run first-run
```

6. Open:

```text
http://localhost:3000
```

## Option B: Native Node.js Setup

1. Install Node.js 20+ and PostgreSQL 16+.
2. Run:

```bash
npm ci
cp .env.example .env.local
npm run db:migrate
npm run db:bootstrap-admin
npm run build
npm run start
```

3. Store documents in `/mnt/storage` on Linux, or set `DOCUMENT_STORAGE_ROOT` to a local path.

## Default Owner Admins

The platform recognises these owner-admin emails:

- `aesha.akhtar@uksupporthousing.co.uk`
- `admin@uksupporthousing.co.uk`

Rotate temporary passwords immediately after first setup.

## Production Notes

- Put the app behind Nginx or another reverse proxy for HTTPS.
- Back up PostgreSQL and the document storage folder together.
- Keep `.env.local` or `.env` private.
