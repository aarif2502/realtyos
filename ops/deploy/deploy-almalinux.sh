#!/usr/bin/env bash
set -euo pipefail

# Goldenhub RealtyOS - AlmaLinux production deploy script
# Intended path on VM: /opt/goldenhub/realtyos/ops/deploy/deploy-almalinux.sh
# Run as user: realtyos

APP_DIR="${APP_DIR:-/opt/goldenhub/realtyos}"
BRANCH="${BRANCH:-goldenhub-platform}"
PM2_CONFIG="${PM2_CONFIG:-${APP_DIR}/ops/pm2/ecosystem.config.js}"
ENV_FILE="${ENV_FILE:-${APP_DIR}/.env.production}"
SERVICE_NAME="${SERVICE_NAME:-goldenhub-realtyos}"

log() {
  printf '\n\033[1;33m[goldenhub-deploy]\033[0m %s\n' "$1"
}

if [ ! -d "${APP_DIR}/.git" ]; then
  echo "${APP_DIR} is not a Git checkout. Clone the repo there first." >&2
  exit 1
fi

if [ ! -f "${ENV_FILE}" ]; then
  echo "Missing ${ENV_FILE}. Copy ops/env/.env.production.example to .env.production and fill secrets first." >&2
  exit 1
fi

cd "${APP_DIR}"

log "Fetching latest code"
git fetch origin "${BRANCH}"
git checkout "${BRANCH}"
git pull --ff-only origin "${BRANCH}"

log "Installing production dependencies"
npm ci

log "Running database migrations"
if npm run | grep -q "db:migrate"; then
  set -a
  # shellcheck disable=SC1090
  source "${ENV_FILE}"
  set +a
  npm run db:migrate
fi

log "Building Next.js application"
set -a
# shellcheck disable=SC1090
source "${ENV_FILE}"
set +a
npm run build

log "Starting or restarting PM2 service"
if pm2 describe "${SERVICE_NAME}" >/dev/null 2>&1; then
  pm2 restart "${SERVICE_NAME}" --update-env
else
  pm2 start "${PM2_CONFIG}" --env production
fi
pm2 save

log "Deployment complete"
pm2 status "${SERVICE_NAME}" || pm2 status
