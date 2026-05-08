#!/usr/bin/env bash
set -euo pipefail

# Goldenhub RealtyOS - OCI AlmaLinux VM bootstrap
# Run on an AlmaLinux OCI VM as a sudo-capable user:
#   chmod +x ops/oci/bootstrap-almalinux.sh
#   ./ops/oci/bootstrap-almalinux.sh

NODE_MAJOR="20"
APP_USER="realtyos"
APP_DIR="/opt/goldenhub/realtyos"
STORAGE_DIR="/mnt/storage/goldenhub"
POSTGRESQL_MODULE="postgresql:15"

log() {
  printf '\n\033[1;33m[goldenhub-almalinux-bootstrap]\033[0m %s\n' "$1"
}

require_sudo() {
  if ! command -v sudo >/dev/null 2>&1; then
    echo "sudo is required. Run this on AlmaLinux as a sudo-capable user." >&2
    exit 1
  fi
}

require_almalinux_family() {
  if [ ! -f /etc/os-release ]; then
    echo "Unable to detect OS. /etc/os-release is missing." >&2
    exit 1
  fi
  . /etc/os-release
  case "${ID:-}" in
    almalinux|rocky|rhel|centos|ol)
      log "Detected ${PRETTY_NAME:-$ID}"
      ;;
    *)
      echo "This script is intended for AlmaLinux/RHEL-compatible systems. Detected: ${PRETTY_NAME:-unknown}" >&2
      exit 1
      ;;
  esac
}

require_sudo
require_almalinux_family

log "Updating AlmaLinux packages"
sudo dnf -y upgrade --refresh

log "Installing base repositories and packages"
sudo dnf -y install dnf-plugins-core epel-release || sudo dnf -y install dnf-plugins-core
sudo dnf -y install \
  ca-certificates \
  curl \
  git \
  unzip \
  tar \
  gzip \
  firewalld \
  nginx \
  gcc \
  gcc-c++ \
  make \
  python3 \
  python3-pip \
  policycoreutils-python-utils \
  cronie

log "Installing Node.js ${NODE_MAJOR}.x from NodeSource RPM setup"
curl -fsSL "https://rpm.nodesource.com/setup_${NODE_MAJOR}.x" | sudo bash -
sudo dnf -y install nodejs

log "Installing PM2"
sudo npm install -g pm2

log "Installing PostgreSQL server"
if sudo dnf module list postgresql >/dev/null 2>&1; then
  sudo dnf -y module reset postgresql || true
  sudo dnf -y module enable "${POSTGRESQL_MODULE}" || true
fi
sudo dnf -y install postgresql-server postgresql-contrib

if [ ! -f /var/lib/pgsql/data/PG_VERSION ]; then
  log "Initialising PostgreSQL database cluster"
  sudo postgresql-setup --initdb
fi

log "Installing Docker CE"
sudo dnf config-manager --add-repo https://download.docker.com/linux/centos/docker-ce.repo
sudo dnf -y install docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

log "Creating application user and directories"
if ! id "${APP_USER}" >/dev/null 2>&1; then
  sudo useradd --system --create-home --shell /bin/bash "${APP_USER}"
fi
sudo mkdir -p "${APP_DIR}" "${STORAGE_DIR}" /var/log/goldenhub /etc/goldenhub
sudo chown -R "${APP_USER}:${APP_USER}" /opt/goldenhub "${STORAGE_DIR}" /var/log/goldenhub
sudo chmod 750 /etc/goldenhub

log "Configuring SELinux-friendly file contexts where tools are available"
if command -v semanage >/dev/null 2>&1; then
  sudo semanage fcontext -a -t httpd_sys_content_t "/opt/goldenhub(/.*)?" || true
  sudo semanage fcontext -a -t httpd_sys_rw_content_t "${STORAGE_DIR}(/.*)?" || true
  sudo restorecon -Rv /opt/goldenhub "${STORAGE_DIR}" || true
fi

if command -v setsebool >/dev/null 2>&1; then
  sudo setsebool -P httpd_can_network_connect 1 || true
fi

log "Configuring firewalld"
sudo systemctl enable --now firewalld
sudo firewall-cmd --permanent --add-service=ssh
sudo firewall-cmd --permanent --add-service=http
sudo firewall-cmd --permanent --add-service=https
sudo firewall-cmd --reload

log "Enabling services"
sudo systemctl enable --now nginx
sudo systemctl enable --now postgresql
sudo systemctl enable --now docker
sudo systemctl enable --now crond

log "Adding ${APP_USER} to docker group"
sudo usermod -aG docker "${APP_USER}" || true

log "Setting PM2 startup for ${APP_USER}"
PM2_STARTUP_CMD=$(sudo -u "${APP_USER}" pm2 startup systemd -u "${APP_USER}" --hp "/home/${APP_USER}" 2>/dev/null | sed -n 's/^\(sudo env.*\)$/\1/p' || true)
if [ -n "${PM2_STARTUP_CMD}" ]; then
  bash -lc "${PM2_STARTUP_CMD}" || true
fi

log "Writing server info"
cat <<INFO | sudo tee /etc/goldenhub/bootstrap-info.env >/dev/null
APP_USER=${APP_USER}
APP_DIR=${APP_DIR}
STORAGE_DIR=${STORAGE_DIR}
NODE_MAJOR=${NODE_MAJOR}
BOOTSTRAPPED_AT=$(date -u +%Y-%m-%dT%H:%M:%SZ)
INFO
sudo chmod 640 /etc/goldenhub/bootstrap-info.env

log "Bootstrap complete"
node --version
npm --version
pm2 --version
nginx -v
psql --version
docker --version

cat <<'NEXT_STEPS'

Next manual steps:
1. In 20i DNS, point app.goldenhub.co.uk to this OCI VM public IP.
2. SSH into the VM and clone the repo into /opt/goldenhub/realtyos as user realtyos.
3. Create /opt/goldenhub/realtyos/.env.production with database and security secrets.
4. Build RealtyOS and run it with PM2 or Docker.
5. Add the Nginx reverse proxy for app.goldenhub.co.uk.
6. Install SSL using Certbot for AlmaLinux/RHEL.

Useful checks:
  systemctl status nginx postgresql docker firewalld
  firewall-cmd --list-all
  getenforce
  node --version

NEXT_STEPS
