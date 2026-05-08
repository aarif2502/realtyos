#!/usr/bin/env bash
set -euo pipefail

# Goldenhub RealtyOS - OCI Ubuntu VM bootstrap
# Run on a fresh Ubuntu OCI VM as a sudo-capable user:
#   chmod +x ops/oci/bootstrap-ubuntu.sh
#   ./ops/oci/bootstrap-ubuntu.sh

NODE_MAJOR="20"
APP_USER="realtyos"
APP_DIR="/opt/goldenhub/realtyos"
STORAGE_DIR="/mnt/storage/goldenhub"

log() {
  printf '\n\033[1;33m[goldenhub-bootstrap]\033[0m %s\n' "$1"
}

if ! command -v sudo >/dev/null 2>&1; then
  echo "sudo is required. Run this on Ubuntu as a sudo-capable user." >&2
  exit 1
fi

log "Updating Ubuntu packages"
sudo apt-get update -y
sudo DEBIAN_FRONTEND=noninteractive apt-get upgrade -y

log "Installing base packages"
sudo DEBIAN_FRONTEND=noninteractive apt-get install -y \
  ca-certificates \
  curl \
  gnupg \
  git \
  unzip \
  ufw \
  nginx \
  postgresql \
  postgresql-contrib \
  build-essential \
  python3 \
  python3-pip

log "Installing Node.js ${NODE_MAJOR}.x from NodeSource"
curl -fsSL "https://deb.nodesource.com/setup_${NODE_MAJOR}.x" | sudo -E bash -
sudo DEBIAN_FRONTEND=noninteractive apt-get install -y nodejs

log "Installing PM2"
sudo npm install -g pm2

log "Installing Docker engine"
sudo install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
sudo chmod a+r /etc/apt/keyrings/docker.gpg
. /etc/os-release
echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu ${VERSION_CODENAME} stable" | \
  sudo tee /etc/apt/sources.list.d/docker.list >/dev/null
sudo apt-get update -y
sudo DEBIAN_FRONTEND=noninteractive apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

log "Creating application user and directories"
if ! id "${APP_USER}" >/dev/null 2>&1; then
  sudo useradd --system --create-home --shell /bin/bash "${APP_USER}"
fi
sudo mkdir -p "${APP_DIR}" "${STORAGE_DIR}" /var/log/goldenhub
sudo chown -R "${APP_USER}:${APP_USER}" /opt/goldenhub "${STORAGE_DIR}" /var/log/goldenhub

log "Configuring firewall"
sudo ufw allow OpenSSH
sudo ufw allow 'Nginx Full'
sudo ufw --force enable

log "Enabling services"
sudo systemctl enable --now nginx
sudo systemctl enable --now postgresql
sudo systemctl enable --now docker

log "Setting PM2 startup for ${APP_USER}"
sudo -u "${APP_USER}" pm2 startup systemd -u "${APP_USER}" --hp "/home/${APP_USER}" | sed -n 's/^\(sudo env.*\)$/\1/p' | bash || true

log "Bootstrap complete"
node --version
npm --version
pm2 --version
nginx -v
psql --version
docker --version

cat <<'NEXT_STEPS'

Next manual steps:
1. Point app.goldenhub.co.uk A record to this OCI VM public IP.
2. Clone the repo into /opt/goldenhub/realtyos as user realtyos.
3. Create .env.production with database and security secrets.
4. Build the app and run it with PM2 or Docker.
5. Add Nginx reverse proxy and SSL.

NEXT_STEPS
