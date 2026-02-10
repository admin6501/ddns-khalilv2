#!/usr/bin/env bash
#═══════════════════════════════════════════════════════════════════════════════
#  khalilv2.com DNS Management Platform - Auto Installer
#  GitHub: https://github.com/admin6501/ddns-khalilv2
#  Supports: Ubuntu 20.04/22.04/24.04, Debian 11/12
#═══════════════════════════════════════════════════════════════════════════════
set -euo pipefail

# ─── Colors & Helpers ────────────────────────────────────────────────────────
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m'

info()    { echo -e "${CYAN}[INFO]${NC}  $1"; }
success() { echo -e "${GREEN}[OK]${NC}    $1"; }
warn()    { echo -e "${YELLOW}[WARN]${NC}  $1"; }
error()   { echo -e "${RED}[ERR]${NC}   $1"; }
fatal()   { error "$1"; exit 1; }

separator() {
  echo -e "${CYAN}─────────────────────────────────────────────────────────────${NC}"
}

# ─── Root Check ──────────────────────────────────────────────────────────────
if [[ $EUID -ne 0 ]]; then
  fatal "This script must be run as root. Use: sudo bash $0"
fi

# ─── OS Detection ────────────────────────────────────────────────────────────
detect_os() {
  if [[ -f /etc/os-release ]]; then
    . /etc/os-release
    OS_ID="$ID"
    OS_VERSION="$VERSION_ID"
    OS_NAME="$PRETTY_NAME"
  else
    fatal "Cannot detect OS. /etc/os-release not found."
  fi

  case "$OS_ID" in
    ubuntu|debian) ;;
    *) fatal "Unsupported OS: $OS_NAME. Only Ubuntu and Debian are supported." ;;
  esac

  success "Detected OS: $OS_NAME"
}

# ─── Banner ──────────────────────────────────────────────────────────────────
show_banner() {
  clear
  echo -e "${CYAN}"
  echo "  ╔═══════════════════════════════════════════════════════════╗"
  echo "  ║                                                           ║"
  echo "  ║         khalilv2.com DNS Management Installer             ║"
  echo "  ║                                                           ║"
  echo "  ║   github.com/admin6501/ddns-khalilv2                      ║"
  echo "  ║                                                           ║"
  echo "  ╚═══════════════════════════════════════════════════════════╝"
  echo -e "${NC}"
}

# ─── Collect Variables ───────────────────────────────────────────────────────
collect_variables() {
  separator
  echo -e "${BOLD}Configuration${NC}"
  separator
  echo ""

  # Domain
  read -rp "$(echo -e "${CYAN}[?]${NC} Domain name (e.g. khalilv2.com): ")" DOMAIN
  [[ -z "$DOMAIN" ]] && fatal "Domain is required."

  # Admin email for SSL
  read -rp "$(echo -e "${CYAN}[?]${NC} Email for SSL certificate (Let's Encrypt): ")" SSL_EMAIL
  [[ -z "$SSL_EMAIL" ]] && fatal "Email is required for SSL."

  echo ""
  separator
  echo -e "${BOLD}Cloudflare Configuration${NC}"
  separator
  echo ""

  read -rp "$(echo -e "${CYAN}[?]${NC} Cloudflare API Token: ")" CF_API_TOKEN
  [[ -z "$CF_API_TOKEN" ]] && fatal "Cloudflare API Token is required."

  read -rp "$(echo -e "${CYAN}[?]${NC} Cloudflare Zone ID: ")" CF_ZONE_ID
  [[ -z "$CF_ZONE_ID" ]] && fatal "Cloudflare Zone ID is required."

  echo ""
  separator
  echo -e "${BOLD}Admin Account${NC}"
  separator
  echo ""

  read -rp "$(echo -e "${CYAN}[?]${NC} Admin email [admin@${DOMAIN}]: ")" ADMIN_EMAIL
  ADMIN_EMAIL="${ADMIN_EMAIL:-admin@${DOMAIN}}"

  while true; do
    read -srp "$(echo -e "${CYAN}[?]${NC} Admin password (min 6 chars): ")" ADMIN_PASSWORD
    echo ""
    if [[ ${#ADMIN_PASSWORD} -ge 6 ]]; then
      break
    fi
    warn "Password must be at least 6 characters."
  done

  echo ""
  separator
  echo -e "${BOLD}MongoDB${NC}"
  separator
  echo ""

  read -rp "$(echo -e "${CYAN}[?]${NC} MongoDB URL [mongodb://localhost:27017]: ")" MONGO_URL
  MONGO_URL="${MONGO_URL:-mongodb://localhost:27017}"

  read -rp "$(echo -e "${CYAN}[?]${NC} Database name [khalilv2_dns]: ")" DB_NAME
  DB_NAME="${DB_NAME:-khalilv2_dns}"

  echo ""
  separator
  echo -e "${BOLD}Installation Path${NC}"
  separator
  echo ""

  read -rp "$(echo -e "${CYAN}[?]${NC} Install directory [/opt/ddns-khalilv2]: ")" INSTALL_DIR
  INSTALL_DIR="${INSTALL_DIR:-/opt/ddns-khalilv2}"

  # Generate JWT secret
  JWT_SECRET=$(openssl rand -hex 32)

  echo ""
  separator
  echo -e "${BOLD}Review Configuration${NC}"
  separator
  echo ""
  echo -e "  Domain:          ${GREEN}$DOMAIN${NC}"
  echo -e "  SSL Email:       ${GREEN}$SSL_EMAIL${NC}"
  echo -e "  CF Zone ID:      ${GREEN}${CF_ZONE_ID:0:8}...${NC}"
  echo -e "  Admin Email:     ${GREEN}$ADMIN_EMAIL${NC}"
  echo -e "  MongoDB URL:     ${GREEN}$MONGO_URL${NC}"
  echo -e "  Database:        ${GREEN}$DB_NAME${NC}"
  echo -e "  Install Dir:     ${GREEN}$INSTALL_DIR${NC}"
  echo ""

  read -rp "$(echo -e "${CYAN}[?]${NC} Proceed with installation? [Y/n]: ")" CONFIRM
  CONFIRM="${CONFIRM:-Y}"
  [[ ! "$CONFIRM" =~ ^[Yy]$ ]] && fatal "Installation cancelled."
}

# ─── Install Prerequisites ───────────────────────────────────────────────────
install_prerequisites() {
  separator
  echo -e "${BOLD}Installing Prerequisites${NC}"
  separator

  info "Updating package lists..."
  apt-get update -qq

  # List of required packages
  PACKAGES=(
    curl wget git build-essential software-properties-common
    python3 python3-pip python3-venv
    nginx certbot python3-certbot-nginx
    gnupg
  )

  for pkg in "${PACKAGES[@]}"; do
    if dpkg -s "$pkg" &>/dev/null; then
      success "$pkg already installed"
    else
      info "Installing $pkg..."
      apt-get install -y -qq "$pkg" || warn "Failed to install $pkg, continuing..."
    fi
  done

  # ── Node.js 20.x ──
  if command -v node &>/dev/null; then
    NODE_VER=$(node -v)
    success "Node.js already installed: $NODE_VER"
  else
    info "Installing Node.js 20.x..."
    curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
    apt-get install -y -qq nodejs
    success "Node.js installed: $(node -v)"
  fi

  # ── Yarn ──
  if command -v yarn &>/dev/null; then
    success "Yarn already installed: $(yarn -v)"
  else
    info "Installing Yarn..."
    npm install -g yarn
    success "Yarn installed: $(yarn -v)"
  fi

  # ── MongoDB ──
  if command -v mongod &>/dev/null || systemctl is-active --quiet mongod 2>/dev/null; then
    success "MongoDB already installed"
  else
    info "Installing MongoDB 7.0..."
    install_mongodb
  fi

  # Ensure MongoDB is running
  if systemctl is-active --quiet mongod; then
    success "MongoDB is running"
  else
    info "Starting MongoDB..."
    systemctl start mongod || true
    systemctl enable mongod || true
    if systemctl is-active --quiet mongod; then
      success "MongoDB started"
    else
      warn "MongoDB may not be running. Check manually: systemctl status mongod"
    fi
  fi
}

install_mongodb() {
  # Import MongoDB GPG key
  curl -fsSL https://www.mongodb.org/static/pgp/server-7.0.asc | \
    gpg --dearmor -o /usr/share/keyrings/mongodb-server-7.0.gpg

  # Add repo based on OS
  if [[ "$OS_ID" == "ubuntu" ]]; then
    echo "deb [signed-by=/usr/share/keyrings/mongodb-server-7.0.gpg] https://repo.mongodb.org/apt/ubuntu $(lsb_release -cs)/mongodb-org/7.0 multiverse" \
      > /etc/apt/sources.list.d/mongodb-org-7.0.list
  elif [[ "$OS_ID" == "debian" ]]; then
    echo "deb [signed-by=/usr/share/keyrings/mongodb-server-7.0.gpg] https://repo.mongodb.org/apt/debian $(lsb_release -cs)/mongodb-org/7.0 main" \
      > /etc/apt/sources.list.d/mongodb-org-7.0.list
  fi

  apt-get update -qq
  apt-get install -y -qq mongodb-org || {
    warn "MongoDB 7.0 install failed, trying mongosh standalone..."
    apt-get install -y -qq mongodb || true
  }

  systemctl start mongod 2>/dev/null || true
  systemctl enable mongod 2>/dev/null || true
  success "MongoDB installed"
}

# ─── Clone Repository ────────────────────────────────────────────────────────
clone_repository() {
  separator
  echo -e "${BOLD}Cloning Repository${NC}"
  separator

  REPO_URL="https://github.com/admin6501/ddns-khalilv2.git"

  if [[ -d "$INSTALL_DIR" ]]; then
    warn "Directory $INSTALL_DIR already exists."
    read -rp "$(echo -e "${CYAN}[?]${NC} Remove and re-clone? [Y/n]: ")" RECLONE
    RECLONE="${RECLONE:-Y}"
    if [[ "$RECLONE" =~ ^[Yy]$ ]]; then
      rm -rf "$INSTALL_DIR"
    else
      info "Using existing directory."
      return
    fi
  fi

  info "Cloning from $REPO_URL ..."
  git clone "$REPO_URL" "$INSTALL_DIR"
  success "Repository cloned to $INSTALL_DIR"
}

# ─── Setup Backend ───────────────────────────────────────────────────────────
setup_backend() {
  separator
  echo -e "${BOLD}Setting Up Backend${NC}"
  separator

  cd "$INSTALL_DIR/backend"

  # Create .env
  info "Creating backend/.env ..."
  cat > .env << ENVEOF
MONGO_URL="${MONGO_URL}"
DB_NAME="${DB_NAME}"
CORS_ORIGINS="https://${DOMAIN}"
CLOUDFLARE_API_TOKEN=${CF_API_TOKEN}
CLOUDFLARE_ZONE_ID=${CF_ZONE_ID}
JWT_SECRET=${JWT_SECRET}
DOMAIN_NAME=${DOMAIN}
ADMIN_EMAIL=${ADMIN_EMAIL}
ADMIN_PASSWORD=${ADMIN_PASSWORD}
ENVEOF
  success "Backend .env created"

  # Create virtual environment
  info "Creating Python virtual environment..."
  python3 -m venv venv
  source venv/bin/activate

  # Install dependencies
  info "Installing Python dependencies..."
  pip install --upgrade pip -q
  pip install -r requirements.txt -q
  success "Backend dependencies installed"

  deactivate
}

# ─── Setup Frontend ──────────────────────────────────────────────────────────
setup_frontend() {
  separator
  echo -e "${BOLD}Setting Up Frontend${NC}"
  separator

  cd "$INSTALL_DIR/frontend"

  # Create .env
  info "Creating frontend/.env ..."
  cat > .env << ENVEOF
REACT_APP_BACKEND_URL=https://${DOMAIN}
ENVEOF
  success "Frontend .env created"

  # Install dependencies
  info "Installing frontend dependencies (this may take a while)..."
  yarn install --silent 2>/dev/null
  success "Frontend dependencies installed"

  # Build for production
  info "Building frontend for production..."
  yarn build
  success "Frontend built successfully"
}

# ─── Create Systemd Services ────────────────────────────────────────────────
create_services() {
  separator
  echo -e "${BOLD}Creating Systemd Services${NC}"
  separator

  # Backend service
  info "Creating backend service..."
  cat > /etc/systemd/system/ddns-backend.service << SVCEOF
[Unit]
Description=khalilv2 DNS Backend (FastAPI)
After=network.target mongod.service
Wants=mongod.service

[Service]
Type=simple
User=root
WorkingDirectory=${INSTALL_DIR}/backend
Environment=PATH=${INSTALL_DIR}/backend/venv/bin:/usr/local/bin:/usr/bin:/bin
ExecStart=${INSTALL_DIR}/backend/venv/bin/uvicorn server:app --host 127.0.0.1 --port 8001 --workers 2
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
SVCEOF
  success "Backend service created"

  # Enable and start
  systemctl daemon-reload
  systemctl enable ddns-backend
  systemctl start ddns-backend
  sleep 2

  if systemctl is-active --quiet ddns-backend; then
    success "Backend service is running"
  else
    warn "Backend service may not have started. Check: journalctl -u ddns-backend -f"
  fi
}

# ─── Configure Nginx (HTTP first) ───────────────────────────────────────────
configure_nginx() {
  separator
  echo -e "${BOLD}Configuring Nginx${NC}"
  separator

  # Remove default site if exists
  rm -f /etc/nginx/sites-enabled/default

  info "Creating Nginx config for $DOMAIN (HTTP)..."
  cat > /etc/nginx/sites-available/ddns-khalilv2 << 'NGXEOF'
server {
    listen 80;
    listen [::]:80;
    server_name DOMAIN_PLACEHOLDER;

    # Frontend (React static build)
    root INSTALL_DIR_PLACEHOLDER/frontend/build;
    index index.html;

    # Backend API proxy
    location /api/ {
        proxy_pass http://127.0.0.1:8001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 300;
        proxy_connect_timeout 300;
        proxy_send_timeout 300;
    }

    # React SPA fallback
    location / {
        try_files $uri $uri/ /index.html;
    }

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;

    # Gzip
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml text/javascript image/svg+xml;
}
NGXEOF

  # Replace placeholders
  sed -i "s|DOMAIN_PLACEHOLDER|${DOMAIN}|g" /etc/nginx/sites-available/ddns-khalilv2
  sed -i "s|INSTALL_DIR_PLACEHOLDER|${INSTALL_DIR}|g" /etc/nginx/sites-available/ddns-khalilv2

  # Enable site
  ln -sf /etc/nginx/sites-available/ddns-khalilv2 /etc/nginx/sites-enabled/

  # Test config
  if nginx -t 2>/dev/null; then
    success "Nginx config is valid"
    systemctl reload nginx
    success "Nginx reloaded"
  else
    fatal "Nginx config test failed. Check: nginx -t"
  fi
}

# ─── Obtain SSL Certificate ─────────────────────────────────────────────────
obtain_ssl() {
  separator
  echo -e "${BOLD}Obtaining SSL Certificate${NC}"
  separator

  info "Requesting SSL certificate from Let's Encrypt..."
  info "Make sure your domain $DOMAIN points to this server's IP address!"
  echo ""

  read -rp "$(echo -e "${CYAN}[?]${NC} Is $DOMAIN already pointing to this server? [Y/n]: ")" DNS_READY
  DNS_READY="${DNS_READY:-Y}"

  if [[ ! "$DNS_READY" =~ ^[Yy]$ ]]; then
    warn "Please configure your DNS first, then run:"
    echo ""
    echo "  sudo certbot --nginx -d $DOMAIN --non-interactive --agree-tos -m $SSL_EMAIL"
    echo ""
    warn "Skipping SSL for now. Site will run on HTTP only."
    return
  fi

  certbot --nginx \
    -d "$DOMAIN" \
    --non-interactive \
    --agree-tos \
    -m "$SSL_EMAIL" \
    --redirect

  if [[ $? -eq 0 ]]; then
    success "SSL certificate obtained and configured!"
    success "Auto-renewal is enabled via certbot timer."

    # Update backend CORS to https
    sed -i "s|CORS_ORIGINS=.*|CORS_ORIGINS=https://${DOMAIN}|" "$INSTALL_DIR/backend/.env"
    systemctl restart ddns-backend
    success "Backend restarted with HTTPS CORS"
  else
    warn "SSL certificate failed. You can retry manually:"
    echo "  sudo certbot --nginx -d $DOMAIN"
  fi
}

# ─── Setup Firewall ─────────────────────────────────────────────────────────
setup_firewall() {
  separator
  echo -e "${BOLD}Configuring Firewall${NC}"
  separator

  if command -v ufw &>/dev/null; then
    info "Configuring UFW..."
    ufw allow 22/tcp   >/dev/null 2>&1 || true
    ufw allow 80/tcp   >/dev/null 2>&1 || true
    ufw allow 443/tcp  >/dev/null 2>&1 || true
    ufw --force enable  >/dev/null 2>&1 || true
    success "UFW configured (22, 80, 443 open)"
  else
    info "UFW not found. Skipping firewall setup."
    info "Make sure ports 80 and 443 are open."
  fi
}

# ─── Create Management Script ───────────────────────────────────────────────
create_management_script() {
  separator
  echo -e "${BOLD}Creating Management Commands${NC}"
  separator

  cat > /usr/local/bin/ddns-ctl << 'CTLEOF'
#!/usr/bin/env bash
set -euo pipefail

RED='\033[0;31m'; GREEN='\033[0;32m'; CYAN='\033[0;36m'; BOLD='\033[1m'; NC='\033[0m'

case "${1:-help}" in
  start)
    echo -e "${CYAN}Starting services...${NC}"
    sudo systemctl start ddns-backend nginx mongod
    echo -e "${GREEN}All services started.${NC}"
    ;;
  stop)
    echo -e "${CYAN}Stopping services...${NC}"
    sudo systemctl stop ddns-backend
    echo -e "${GREEN}Backend stopped.${NC}"
    ;;
  restart)
    echo -e "${CYAN}Restarting services...${NC}"
    sudo systemctl restart ddns-backend nginx
    echo -e "${GREEN}All services restarted.${NC}"
    ;;
  status)
    echo -e "${BOLD}Service Status:${NC}"
    echo -n "  MongoDB:  "; systemctl is-active mongod  2>/dev/null || echo "inactive"
    echo -n "  Backend:  "; systemctl is-active ddns-backend 2>/dev/null || echo "inactive"
    echo -n "  Nginx:    "; systemctl is-active nginx 2>/dev/null || echo "inactive"
    ;;
  logs)
    echo -e "${CYAN}Backend logs (Ctrl+C to exit):${NC}"
    journalctl -u ddns-backend -f --no-hostname
    ;;
  update)
    echo -e "${CYAN}Updating from GitHub...${NC}"
    INSTALL_DIR=$(systemctl show ddns-backend -p WorkingDirectory --value 2>/dev/null | sed 's|/backend||')
    if [[ -z "$INSTALL_DIR" ]]; then
      echo -e "${RED}Cannot detect install directory.${NC}"
      exit 1
    fi
    cd "$INSTALL_DIR"
    git pull origin main
    echo -e "${CYAN}Rebuilding frontend...${NC}"
    cd frontend && yarn install --silent 2>/dev/null && yarn build
    echo -e "${CYAN}Updating backend dependencies...${NC}"
    cd ../backend && source venv/bin/activate && pip install -r requirements.txt -q && deactivate
    sudo systemctl restart ddns-backend nginx
    echo -e "${GREEN}Update complete!${NC}"
    ;;
  ssl-renew)
    echo -e "${CYAN}Renewing SSL certificate...${NC}"
    sudo certbot renew
    sudo systemctl reload nginx
    echo -e "${GREEN}SSL renewal done.${NC}"
    ;;
  *)
    echo -e "${BOLD}ddns-ctl${NC} - khalilv2.com DNS Management"
    echo ""
    echo "  Usage: ddns-ctl <command>"
    echo ""
    echo "  Commands:"
    echo "    start       Start all services"
    echo "    stop        Stop backend service"
    echo "    restart     Restart all services"
    echo "    status      Show service status"
    echo "    logs        Follow backend logs"
    echo "    update      Pull latest code & rebuild"
    echo "    ssl-renew   Renew SSL certificate"
    ;;
esac
CTLEOF

  chmod +x /usr/local/bin/ddns-ctl
  success "Management script created: ddns-ctl"
}

# ─── Final Summary ───────────────────────────────────────────────────────────
show_summary() {
  echo ""
  echo ""
  echo -e "${GREEN}═══════════════════════════════════════════════════════════════${NC}"
  echo -e "${GREEN}          Installation Complete!                              ${NC}"
  echo -e "${GREEN}═══════════════════════════════════════════════════════════════${NC}"
  echo ""
  echo -e "  ${BOLD}Website:${NC}          https://${DOMAIN}"
  echo -e "  ${BOLD}Admin Panel:${NC}      https://${DOMAIN}/admin"
  echo -e "  ${BOLD}Admin Login:${NC}      ${ADMIN_EMAIL}"
  echo -e "  ${BOLD}Install Path:${NC}     ${INSTALL_DIR}"
  echo ""
  echo -e "  ${BOLD}Management:${NC}"
  echo -e "    ddns-ctl status      Check service status"
  echo -e "    ddns-ctl restart     Restart all services"
  echo -e "    ddns-ctl logs        View backend logs"
  echo -e "    ddns-ctl update      Update from GitHub"
  echo -e "    ddns-ctl ssl-renew   Renew SSL certificate"
  echo ""
  echo -e "  ${BOLD}Services:${NC}"
  echo -e "    Backend:   systemctl [start|stop|restart] ddns-backend"
  echo -e "    Nginx:     systemctl [start|stop|restart] nginx"
  echo -e "    MongoDB:   systemctl [start|stop|restart] mongod"
  echo ""
  echo -e "${GREEN}═══════════════════════════════════════════════════════════════${NC}"
  echo ""
}

# ─── Main ────────────────────────────────────────────────────────────────────
main() {
  show_banner
  detect_os
  collect_variables
  install_prerequisites
  clone_repository
  setup_backend
  setup_frontend
  create_services
  configure_nginx
  setup_firewall
  obtain_ssl
  create_management_script
  show_summary
}

main "$@"
