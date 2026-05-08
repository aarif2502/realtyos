#!/usr/bin/env bash
set -euo pipefail

BACKUP_DIR="${BACKUP_DIR:-/mnt/storage/goldenhub/backups/postgres}"
RETENTION_DAYS="${RETENTION_DAYS:-14}"
DB_NAME="${DB_NAME:-realtyos}"
DB_USER="${DB_USER:-realtyos}"
TIMESTAMP="$(date +%Y%m%d-%H%M%S)"
OUTPUT_FILE="${BACKUP_DIR}/${DB_NAME}-${TIMESTAMP}.sql.gz"

mkdir -p "${BACKUP_DIR}"

printf '\n[goldenhub-backup] Creating PostgreSQL backup: %s\n' "${OUTPUT_FILE}"
pg_dump -U "${DB_USER}" "${DB_NAME}" | gzip > "${OUTPUT_FILE}"

printf '[goldenhub-backup] Removing backups older than %s days\n' "${RETENTION_DAYS}"
find "${BACKUP_DIR}" -type f -name '*.sql.gz' -mtime +"${RETENTION_DAYS}" -delete

printf '[goldenhub-backup] Backup complete\n'
