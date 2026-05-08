#!/usr/bin/env bash
set -euo pipefail

DOMAIN="${1:-app.goldenhub.co.uk}"
EMAIL="${2:-info@goldenhub.co.uk}"

log() {
  printf '\n\033[1;33m[goldenhub-ssl]\033[0m %s\n' "$1"
}

log "Installing Certbot"
sudo dnf -y install certbot python3-certbot-nginx

log "Requesting SSL certificate for ${DOMAIN}"
sudo certbot --nginx \
  --non-interactive \
  --agree-tos \
  --redirect \
  --hsts \
  --staple-ocsp \
  -m "${EMAIL}" \
  -d "${DOMAIN}"

log "Testing auto-renewal"
sudo certbot renew --dry-run

log "SSL setup complete"
