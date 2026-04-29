# RealtyOS Supported Housing Deployment Plan

## Local Development Bootstrap

1. Start Docker Desktop.
2. Run:

```powershell
npm run db:setup-local
```

The script will:

- Start a PostgreSQL 16 container named `realtyos-postgres`.
- Create or reuse a `realtyos` database.
- Write `.env.local` with `DATABASE_URL`.
- Run `db/schema.sql`.
- Create the first agency and admin user if the database is empty.

Then start the application:

```powershell
npm run dev
```

Open:

```text
http://localhost:3000/admin/login
```

## Admin Bootstrap Defaults

Unless overridden with environment variables, the bootstrap creates:

- Agency: `Supported Housing Management Agency`
- Admin email: `admin@realtyos.local`
- Admin password: generated and printed by the setup command
- Shared file root: `\\SERVER\SupportedHousing`

You can override these:

```powershell
$env:REALTYOS_AGENCY_NAME="My Supported Housing Agency"
$env:REALTYOS_ADMIN_EMAIL="admin@example.com"
$env:REALTYOS_ADMIN_PASSWORD="Use-A-Strong-Password"
$env:REALTYOS_SHARED_FILE_ROOT="\\FILESERVER\SupportedHousing"
npm run db:setup-local
```

## Packaging As A Windows .exe

The recommended packaging path is:

1. Keep PostgreSQL as the persistent open-source database.
2. Bundle the Next.js app as the local web application.
3. Create a Windows installer/launcher that:
   - checks whether PostgreSQL is already available;
   - installs or starts the database service;
   - runs the schema migration;
   - creates the first admin account;
   - starts the app service;
   - opens the browser to `/admin/login`.

For production, use Windows Service wrappers for the database/app processes and store secrets outside the application folder.

## Ubuntu VM Deployment

On Ubuntu, install Node.js and PostgreSQL, then create the application database:

```bash
sudo -u postgres psql -c "create user realtyos with password 'CHANGE_ME';"
sudo -u postgres createdb -O realtyos realtyos
```

Create `.env.local`:

```bash
DATABASE_URL=postgres://realtyos:CHANGE_ME@localhost:5432/realtyos
DATABASE_SSL=false
NEXT_PUBLIC_APP_URL=http://YOUR_SERVER_IP:3000
```

Then run:

```bash
npm ci
npm run db:migrate
npm run db:bootstrap-admin
npm run build
npm run start
```

Set these before `db:bootstrap-admin` to control the first account:

```bash
export REALTYOS_AGENCY_NAME="Your Agency Name"
export REALTYOS_ADMIN_EMAIL="admin@example.com"
export REALTYOS_ADMIN_PASSWORD="Use-A-Strong-Password"
export REALTYOS_SHARED_FILE_ROOT="/mnt/shared/SupportedHousing"
```
