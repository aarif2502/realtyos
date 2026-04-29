# Deployment

The platform can run with Docker Compose or as a Node.js service behind Nginx/Caddy/Apache.

## Production Steps

1. Create `.env` from `.env.example`.
2. Configure PostgreSQL.
3. Configure document storage.
4. Run `npm run db:migrate`.
5. Run `npm run db:bootstrap-admin`.
6. Run `npm run build`.
7. Start the app with `npm run start` or systemd.
8. Put HTTPS reverse proxy in front of the app.
9. Run `npm run smoke`.

## Reverse Proxy

Forward the public domain to the app port, usually `3000`. Preserve the `/realtyos` path.

## Health

The Docker Compose file includes a basic homepage health check. For production monitoring, also test `/realtyos/admin/login` and unauthenticated `/realtyos/api/erp` returning `401`.
