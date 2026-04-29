# Operations

## Logs

Docker:

```bash
docker compose logs -f app
```

systemd:

```bash
journalctl -u realtyos -f
```

## Backup

```bash
pg_dump "$DATABASE_URL" > backup.sql
tar -czf storage-backup.tar.gz "$DOCUMENT_STORAGE_ROOT"
```

## Restore

```bash
psql "$DATABASE_URL" < backup.sql
tar -xzf storage-backup.tar.gz -C /
```

## Update

1. Backup database and storage.
2. Deploy source.
3. Run migrations.
4. Build.
5. Restart service.
6. Run smoke tests.

## Restart

```bash
docker compose restart app
# or
sudo systemctl restart realtyos
```
