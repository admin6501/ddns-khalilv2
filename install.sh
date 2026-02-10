#!/usr/bin/env bash
#═══════════════════════════════════════════════════════════════════════════════
#  khalilv2.com DNS Management Platform - Auto Installer
#  GitHub: https://github.com/admin6501/ddns-khalilv2
#  Supports: Ubuntu 20.04/22.04/24.04, Debian 11/12
#═══════════════════════════════════════════════════════════════════════════════

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

# Clean read: strips \r and trailing whitespace (fixes mobile terminals)
clean_read() {
  local varname="$1"
  local prompt="$2"
  local default="${3:-}"
  local raw_val

  read -rp "$(echo -e "${CYAN}[?]${NC} ${prompt}")" raw_val
  # Strip \r, leading/trailing whitespace
  raw_val=$(echo "$raw_val" | tr -d '\r' | sed 's/^[[:space:]]*//;s/[[:space:]]*$//')

  if [[ -z "$raw_val" && -n "$default" ]]; then
    raw_val="$default"
  fi

  eval "$varname=\"\$raw_val\""
}

# Silent read for passwords
clean_read_silent() {
  local varname="$1"
  local prompt="$2"
  local raw_val

  read -srp "$(echo -e "${CYAN}[?]${NC} ${prompt}")" raw_val
  echo ""
  raw_val=$(echo "$raw_val" | tr -d '\r' | sed 's/^[[:space:]]*//;s/[[:space:]]*$//')

  eval "$varname=\"\$raw_val\""
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
    OS_VERSION="${VERSION_ID:-unknown}"
    OS_NAME="${PRETTY_NAME:-$ID}"
    OS_CODENAME="${VERSION_CODENAME:-$(lsb_release -cs 2>/dev/null || echo 'unknown')}"
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
  clean_read DOMAIN "Domain name (e.g. khalilv2.com): "
  if [[ -z "$DOMAIN" ]]; then
    fatal "Domain is required."
  fi

  # Admin email for SSL
  clean_read SSL_EMAIL "Email for SSL certificate (Let's Encrypt): "
  if [[ -z "$SSL_EMAIL" ]]; then
    fatal "Email is required for SSL."
  fi

  echo ""
  separator
  echo -e "${BOLD}Cloudflare Configuration${NC}"
  separator
  echo ""

  clean_read CF_API_TOKEN "Cloudflare API Token: "
  if [[ -z "$CF_API_TOKEN" ]]; then
    fatal "Cloudflare API Token is required."
  fi

  clean_read CF_ZONE_ID "Cloudflare Zone ID: "
  if [[ -z "$CF_ZONE_ID" ]]; then
    fatal "Cloudflare Zone ID is required."
  fi

  echo ""
  separator
  echo -e "${BOLD}Admin Account${NC}"
  separator
  echo ""

  clean_read ADMIN_EMAIL "Admin email [admin@${DOMAIN}]: " "admin@${DOMAIN}"

  while true; do
    clean_read_silent ADMIN_PASSWORD "Admin password (min 6 chars): "
    if [[ ${#ADMIN_PASSWORD} -ge 6 ]]; then
      break
    fi
    warn "Password must be at least 6 characters. Try again."
  done

  echo ""
  separator
  echo -e "${BOLD}MongoDB${NC}"
  separator
  echo ""

  clean_read MONGO_URL "MongoDB URL [mongodb://localhost:27017]: " "mongodb://localhost:27017"
  clean_read DB_NAME "Database name [khalilv2_dns]: " "khalilv2_dns"

  echo ""
  separator
  echo -e "${BOLD}Installation Path${NC}"
  separator
  echo ""

  clean_read INSTALL_DIR "Install directory [/opt/ddns-khalilv2]: " "/opt/ddns-khalilv2"

  # Generate JWT secret
  JWT_SECRET=$(openssl rand -hex 32 2>/dev/null || date +%s%N | sha256sum | head -c 64)

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

  clean_read CONFIRM "Proceed with installation? [Y/n]: " "Y"

  case "$CONFIRM" in
    [Yy]|[Yy][Ee][Ss]) 
      info "Starting installation..."
      ;;
    *)
      fatal "Installation cancelled by user."
      ;;
  esac
}

# ─── Install Prerequisites ───────────────────────────────────────────────────
install_prerequisites() {
  separator
  echo -e "${BOLD}Step 1/8: Installing Prerequisites${NC}"
  separator

  info "Updating package lists..."
  apt-get update -qq 2>/dev/null || {
    warn "apt-get update had issues, continuing anyway..."
  }

  # Ensure basic tools
  info "Installing essential packages..."
  DEBIAN_FRONTEND=noninteractive apt-get install -y -qq \
    curl wget git build-essential software-properties-common \
    python3 python3-pip python3-venv \
    nginx certbot python3-certbot-nginx \
    gnupg lsb-release ca-certificates 2>/dev/null || {
    warn "Some packages may have failed, checking individually..."
  }

  # Verify critical packages
  for cmd in python3 git curl nginx certbot; do
    if command -v "$cmd" &>/dev/null; then
      success "$cmd is available"
    else
      error "$cmd is NOT available - trying to install..."
      apt-get install -y -qq "$cmd" 2>/dev/null || warn "Failed to install $cmd"
    fi
  done

  # ── Node.js 20.x ──
  if command -v node &>/dev/null; then
    success "Node.js already installed: $(node -v)"
  else
    info "Installing Node.js 20.x..."
    curl -fsSL https://deb.nodesource.com/setup_20.x | bash - 2>/dev/null
    apt-get install -y -qq nodejs 2>/dev/null || fatal "Failed to install Node.js"
    success "Node.js installed: $(node -v)"
  fi

  # ── Yarn ──
  if command -v yarn &>/dev/null; then
    success "Yarn already installed: $(yarn -v)"
  else
    info "Installing Yarn..."
    npm install -g yarn 2>/dev/null || fatal "Failed to install Yarn"
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
  if systemctl is-active --quiet mongod 2>/dev/null; then
    success "MongoDB is running"
  else
    info "Starting MongoDB..."
    systemctl start mongod 2>/dev/null || true
    systemctl enable mongod 2>/dev/null || true
    sleep 2
    if systemctl is-active --quiet mongod 2>/dev/null; then
      success "MongoDB started"
    else
      warn "MongoDB may not be running. Check: systemctl status mongod"
      warn "If using external MongoDB, this is OK."
    fi
  fi

  echo ""
  success "Prerequisites check complete!"
}

install_mongodb() {
  # Import MongoDB GPG key
  curl -fsSL https://www.mongodb.org/static/pgp/server-7.0.asc | \
    gpg --dearmor -o /usr/share/keyrings/mongodb-server-7.0.gpg 2>/dev/null || {
    warn "Failed to import MongoDB GPG key"
    return 1
  }

  # Add repo based on OS
  if [[ "$OS_ID" == "ubuntu" ]]; then
    echo "deb [signed-by=/usr/share/keyrings/mongodb-server-7.0.gpg] https://repo.mongodb.org/apt/ubuntu ${OS_CODENAME}/mongodb-org/7.0 multiverse" \
      > /etc/apt/sources.list.d/mongodb-org-7.0.list
  elif [[ "$OS_ID" == "debian" ]]; then
    echo "deb [signed-by=/usr/share/keyrings/mongodb-server-7.0.gpg] https://repo.mongodb.org/apt/debian ${OS_CODENAME}/mongodb-org/7.0 main" \
      > /etc/apt/sources.list.d/mongodb-org-7.0.list
  fi

  apt-get update -qq 2>/dev/null
  DEBIAN_FRONTEND=noninteractive apt-get install -y -qq mongodb-org 2>/dev/null || {
    warn "MongoDB 7.0 from official repo failed. Trying system package..."
    apt-get install -y -qq mongodb 2>/dev/null || {
      warn "Could not install MongoDB. Please install manually."
      return 1
    }
  }

  systemctl start mongod 2>/dev/null || true
  systemctl enable mongod 2>/dev/null || true
  success "MongoDB installed"
}

# ─── Clone Repository ────────────────────────────────────────────────────────
clone_repository() {
  separator
  echo -e "${BOLD}Step 2/8: Cloning Repository${NC}"
  separator

  REPO_URL="https://github.com/admin6501/ddns-khalilv2.git"

  if [[ -d "$INSTALL_DIR/.git" ]]; then
    warn "Repository already exists at $INSTALL_DIR"
    clean_read RECLONE "Pull latest changes instead? [Y/n]: " "Y"
    case "$RECLONE" in
      [Yy]|[Yy][Ee][Ss])
        info "Pulling latest changes..."
        cd "$INSTALL_DIR"
        git pull origin main 2>/dev/null || git pull 2>/dev/null || warn "Git pull failed"
        success "Repository updated"
        ;;
      *)
        clean_read RMDIR "Remove and re-clone? [Y/n]: " "Y"
        case "$RMDIR" in
          [Yy]|[Yy][Ee][Ss])
            rm -rf "$INSTALL_DIR"
            ;;
          *)
            info "Using existing directory."
            return 0
            ;;
        esac
        ;;
    esac
  fi

  if [[ ! -d "$INSTALL_DIR" ]]; then
    info "Cloning from $REPO_URL ..."
    git clone "$REPO_URL" "$INSTALL_DIR" || fatal "Failed to clone repository. Check URL and network."
    success "Repository cloned to $INSTALL_DIR"
  fi
}

# ─── Setup Backend ───────────────────────────────────────────────────────────
setup_backend() {
  separator
  echo -e "${BOLD}Step 3/8: Setting Up Backend${NC}"
  separator

  cd "$INSTALL_DIR/backend"

  # Create .env
  info "Creating backend/.env ..."
  cat > .env << ENVEOF
MONGO_URL=${MONGO_URL}
DB_NAME=${DB_NAME}
CORS_ORIGINS=https://${DOMAIN}
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
  python3 -m venv venv || fatal "Failed to create Python venv"
  source venv/bin/activate

  # Install dependencies
  info "Installing Python dependencies..."
  pip install --upgrade pip -q 2>/dev/null
  pip install -r requirements.txt -q 2>/dev/null || {
    warn "Some pip packages failed, trying individually..."
    pip install fastapi uvicorn motor pymongo python-dotenv bcrypt pyjwt httpx pydantic[email] -q 2>/dev/null
  }
  success "Backend dependencies installed"

  deactivate
}

# ─── Setup Frontend ──────────────────────────────────────────────────────────
setup_frontend() {
  separator
  echo -e "${BOLD}Step 4/8: Setting Up Frontend${NC}"
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
  yarn install 2>/dev/null || yarn install || fatal "Failed to install frontend dependencies"
  success "Frontend dependencies installed"

  # Build for production
  info "Building frontend for production..."
  yarn build 2>/dev/null || yarn build || fatal "Frontend build failed"
  success "Frontend built successfully"
}

# ─── Create Systemd Services ────────────────────────────────────────────────
create_services() {
  separator
  echo -e "${BOLD}Step 5/8: Creating Systemd Services${NC}"
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
  systemctl enable ddns-backend 2>/dev/null
  systemctl restart ddns-backend
  sleep 3

  if systemctl is-active --quiet ddns-backend; then
    success "Backend service is running"
  else
    warn "Backend service may not have started. Check: journalctl -u ddns-backend -f"
  fi
}

# ─── Configure Nginx (HTTP first) ───────────────────────────────────────────
configure_nginx() {
  separator
  echo -e "${BOLD}Step 6/8: Configuring Nginx${NC}"
  separator

  # Remove default site if exists
  rm -f /etc/nginx/sites-enabled/default 2>/dev/null || true

  info "Creating Nginx config for $DOMAIN ..."

  cat > "/etc/nginx/sites-available/ddns-khalilv2" << NGXEOF
server {
    listen 80;
    listen [::]:80;
    server_name ${DOMAIN};

    # Frontend (React static build)
    root ${INSTALL_DIR}/frontend/build;
    index index.html;

    # Backend API proxy
    location /api/ {
        proxy_pass http://127.0.0.1:8001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_read_timeout 300;
        proxy_connect_timeout 300;
        proxy_send_timeout 300;
    }

    # React SPA fallback
    location / {
        try_files \$uri \$uri/ /index.html;
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

  # Enable site
  ln -sf /etc/nginx/sites-available/ddns-khalilv2 /etc/nginx/sites-enabled/

  # Test config
  if nginx -t 2>&1; then
    success "Nginx config is valid"
    systemctl reload nginx
    success "Nginx reloaded"
  else
    error "Nginx config test failed!"
    nginx -t
    fatal "Fix Nginx config and re-run."
  fi
}

# ─── Setup Firewall ─────────────────────────────────────────────────────────
setup_firewall() {
  separator
  echo -e "${BOLD}Step 7/8: Configuring Firewall${NC}"
  separator

  if command -v ufw &>/dev/null; then
    info "Configuring UFW..."
    ufw allow 22/tcp   2>/dev/null || true
    ufw allow 80/tcp   2>/dev/null || true
    ufw allow 443/tcp  2>/dev/null || true
    echo "y" | ufw enable 2>/dev/null || true
    success "UFW configured (22, 80, 443 open)"
  else
    info "UFW not found. Make sure ports 80 and 443 are open."
  fi
}

# ─── Obtain SSL Certificate ─────────────────────────────────────────────────
obtain_ssl() {
  separator
  echo -e "${BOLD}Step 8/8: Obtaining SSL Certificate${NC}"
  separator

  info "Requesting SSL certificate from Let's Encrypt..."
  echo ""
  warn "Make sure your domain ${DOMAIN} points to this server's IP!"
  echo ""

  clean_read DNS_READY "Is ${DOMAIN} already pointing to this server? [Y/n]: " "Y"

  case "$DNS_READY" in
    [Yy]|[Yy][Ee][Ss])
      info "Requesting certificate..."
      ;;
    *)
      warn "Skipping SSL. After setting up DNS, run manually:"
      echo ""
      echo -e "  ${CYAN}sudo certbot --nginx -d ${DOMAIN} --non-interactive --agree-tos -m ${SSL_EMAIL}${NC}"
      echo ""
      return 0
      ;;
  esac

  certbot --nginx \
    -d "$DOMAIN" \
    --non-interactive \
    --agree-tos \
    -m "$SSL_EMAIL" \
    --redirect 2>&1 || {
    warn "SSL certificate request failed."
    warn "This usually means the domain doesn't point to this server yet."
    echo ""
    echo -e "  Fix DNS, then run:"
    echo -e "  ${CYAN}sudo certbot --nginx -d ${DOMAIN} --non-interactive --agree-tos -m ${SSL_EMAIL}${NC}"
    echo ""
    return 0
  }

  success "SSL certificate obtained!"

  # Re-write Nginx config properly for SPA + SSL
  info "Re-writing Nginx config with proper SPA routing..."
  SSL_CERT="/etc/letsencrypt/live/${DOMAIN}/fullchain.pem"
  SSL_KEY="/etc/letsencrypt/live/${DOMAIN}/privkey.pem"

  cat > "/etc/nginx/sites-available/ddns-khalilv2" << NGXEOF
# HTTP -> HTTPS redirect
server {
    listen 80;
    listen [::]:80;
    server_name ${DOMAIN};
    return 301 https://\$host\$request_uri;
}

# HTTPS server
server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name ${DOMAIN};

    ssl_certificate ${SSL_CERT};
    ssl_certificate_key ${SSL_KEY};
    include /etc/letsencrypt/options-ssl-nginx.conf;
    ssl_dhparam /etc/letsencrypt/ssl-dhparams.pem;

    # Frontend
    root ${INSTALL_DIR}/frontend/build;
    index index.html;

    # Backend API
    location /api/ {
        proxy_pass http://127.0.0.1:8001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_read_timeout 300;
        proxy_connect_timeout 300;
        proxy_send_timeout 300;
    }

    # SPA: ALL other routes serve index.html (admin, dashboard, etc.)
    location / {
        try_files \$uri \$uri/ /index.html;
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

  ln -sf /etc/nginx/sites-available/ddns-khalilv2 /etc/nginx/sites-enabled/
  nginx -t 2>&1 && systemctl reload nginx
  success "Nginx reconfigured with SSL + SPA routing"

  # Update backend CORS to https
  sed -i "s|CORS_ORIGINS=.*|CORS_ORIGINS=https://${DOMAIN}|" "$INSTALL_DIR/backend/.env"
  systemctl restart ddns-backend
  success "Backend restarted with HTTPS CORS"
}

# ─── Create Management Script ───────────────────────────────────────────────
create_management_script() {
  info "Creating management command: ddns-ctl"

  cat > /usr/local/bin/ddns-ctl << 'CTLEOF'
#!/usr/bin/env bash
RED='\033[0;31m'; GREEN='\033[0;32m'; CYAN='\033[0;36m'; BOLD='\033[1m'; NC='\033[0m'

# Find install dir from service file
INSTALL_DIR=$(grep "WorkingDirectory" /etc/systemd/system/ddns-backend.service 2>/dev/null | head -1 | cut -d= -f2 | sed 's|/backend||')
INSTALL_DIR="${INSTALL_DIR:-/opt/ddns-khalilv2}"

case "${1:-help}" in
  start)
    echo -e "${CYAN}Starting services...${NC}"
    sudo systemctl start mongod ddns-backend nginx
    echo -e "${GREEN}All services started.${NC}"
    ;;
  stop)
    echo -e "${CYAN}Stopping backend...${NC}"
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
    printf "  %-12s %s\n" "MongoDB:" "$(systemctl is-active mongod 2>/dev/null || echo 'inactive')"
    printf "  %-12s %s\n" "Backend:" "$(systemctl is-active ddns-backend 2>/dev/null || echo 'inactive')"
    printf "  %-12s %s\n" "Nginx:" "$(systemctl is-active nginx 2>/dev/null || echo 'inactive')"
    ;;
  logs)
    echo -e "${CYAN}Backend logs (Ctrl+C to exit):${NC}"
    journalctl -u ddns-backend -f --no-hostname
    ;;
  update)
    echo -e "${CYAN}Updating from GitHub...${NC}"
    cd "$INSTALL_DIR" || exit 1
    git pull origin main || git pull
    echo -e "${CYAN}Rebuilding frontend...${NC}"
    cd frontend && yarn install 2>/dev/null && yarn build
    echo -e "${CYAN}Updating backend...${NC}"
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
    echo "    update      Pull latest & rebuild"
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
  echo -e "    systemctl [start|stop|restart] ddns-backend"
  echo -e "    systemctl [start|stop|restart] nginx"
  echo -e "    systemctl [start|stop|restart] mongod"
  echo ""
  echo -e "${GREEN}═══════════════════════════════════════════════════════════════${NC}"
  echo ""
}

# ─── Main ────────────────────────────────────────────────────────────────────
main() {
  show_banner
  detect_os
  collect_variables

  echo ""
  info "Installation started. This will take a few minutes..."
  echo ""

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
