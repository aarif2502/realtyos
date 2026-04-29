#!/usr/bin/env bash
set -euo pipefail

APP_DIR="${REALTYOS_APP_DIR:-/home/ubuntu/realtyos}"
DB_NAME="${REALTYOS_PG_DATABASE:-realtyos}"
DB_USER="${REALTYOS_PG_USER:-realtyos}"
DB_PASS="${REALTYOS_PG_PASSWORD:-$(openssl rand -hex 24 | tr -d '\n')}"
ADMIN_EMAIL="${REALTYOS_ADMIN_EMAIL:-admin@realtyos.local}"
ADMIN_PASS="${REALTYOS_ADMIN_PASSWORD:-$(openssl rand -base64 18 | tr -d '\n')}"
APP_URL="${NEXT_PUBLIC_APP_URL:-http://localhost:3000}"

cd "$APP_DIR"

sudo systemctl enable postgresql >/dev/null
sudo systemctl start postgresql

if ! sudo -u postgres psql -tAc "select 1 from pg_roles where rolname='${DB_USER}'" | grep -q 1; then
  sudo -u postgres psql -c "create user ${DB_USER} with password '${DB_PASS}';"
else
  sudo -u postgres psql -c "alter user ${DB_USER} with password '${DB_PASS}';"
fi

if ! sudo -u postgres psql -tAc "select 1 from pg_database where datname='${DB_NAME}'" | grep -q 1; then
  sudo -u postgres createdb -O "$DB_USER" "$DB_NAME"
fi

cat > .env.local <<EOF
DATABASE_URL='postgres://${DB_USER}:${DB_PASS}@localhost:5432/${DB_NAME}'
DATABASE_SSL='false'
NEXT_PUBLIC_APP_URL='${APP_URL}'
REALTYOS_AGENCY_NAME='${REALTYOS_AGENCY_NAME:-Supported Housing Management Agency}'
REALTYOS_AGENCY_EMAIL='${REALTYOS_AGENCY_EMAIL:-admin@realtyos.local}'
REALTYOS_ADMIN_NAME='${REALTYOS_ADMIN_NAME:-Platform Administrator}'
REALTYOS_ADMIN_EMAIL='${ADMIN_EMAIL}'
REALTYOS_ADMIN_PASSWORD='${ADMIN_PASS}'
REALTYOS_SHARED_FILE_ROOT='${REALTYOS_SHARED_FILE_ROOT:-/mnt/shared/SupportedHousing}'
EOF
chmod 600 .env.local

npm ci

set -a
# shellcheck disable=SC1091
. ./.env.local
set +a

npm run db:migrate
npm run db:bootstrap-admin
npm run build

printf '\nRealtyOS VM provisioned.\n'
printf 'Admin email: %s\n' "$ADMIN_EMAIL"
printf 'Admin password: %s\n' "$ADMIN_PASS"
