#!/usr/bin/env bash
#═══════════════════════════════════════════════════════════════════════════════
#  DNS Management Platform - Ultimate Installer & Manager
#  GitHub: https://github.com/admin6501/ddns-khalilv2
#  Supports: Ubuntu 20.04/22.04/24.04, Debian 11/12
#═══════════════════════════════════════════════════════════════════════════════

# ─── Colors ──────────────────────────────────────────────────────────────────
R='\033[0;31m'     # Red
G='\033[0;32m'     # Green
Y='\033[1;33m'     # Yellow
C='\033[0;36m'     # Cyan
B='\033[1m'        # Bold
D='\033[2m'        # Dim
P='\033[0;35m'     # Purple
W='\033[0;37m'     # White
N='\033[0m'        # Reset

# ─── Config ──────────────────────────────────────────────────────────────────
REPO_URL="https://github.com/admin6501/ddns-khalilv2.git"
DEFAULT_INSTALL_DIR="/opt/ddns-khalilv2"
SERVICE_NAME="ddns-backend"
NGINX_CONF="ddns-khalilv2"
CONFIG_FILE="/etc/ddns-khalilv2.conf"

# ─── Helpers ─────────────────────────────────────────────────────────────────
info()    { echo -e "  ${C}▸${N} $1"; }
success() { echo -e "  ${G}✓${N} $1"; }
warn()    { echo -e "  ${Y}⚠${N} $1"; }
fail()    { echo -e "  ${R}✗${N} $1"; }
fatal()   { fail "$1"; exit 1; }
step()    { echo -e "\n  ${P}━━━${N} ${B}$1${N} ${P}━━━${N}"; }

spinner() {
  local pid=$1
  local msg="$2"
  local spin='⣾⣽⣻⢿⡿⣟⣯⣷'
  local i=0
  while kill -0 "$pid" 2>/dev/null; do
    printf "\r  ${C}${spin:i++%${#spin}:1}${N} %s" "$msg"
    sleep 0.1
  done
  printf "\r"
}

clean_read() {
  local varname="$1" prompt="$2" default="${3:-}" raw
  echo -ne "  ${C}▸${N} ${prompt}"
  read -r raw
  raw=$(echo "$raw" | tr -d '\r' | sed 's/^[[:space:]]*//;s/[[:space:]]*$//')
  [[ -z "$raw" && -n "$default" ]] && raw="$default"
  eval "$varname=\"\$raw\""
}

clean_read_silent() {
  local varname="$1" prompt="$2" raw
  echo -ne "  ${C}▸${N} ${prompt}"
  read -sr raw
  echo ""
  raw=$(echo "$raw" | tr -d '\r' | sed 's/^[[:space:]]*//;s/[[:space:]]*$//')
  eval "$varname=\"\$raw\""
}

confirm() {
  local prompt="$1" default="${2:-Y}" ans
  clean_read ans "$prompt [${default}]: " "$default"
  case "$ans" in
    [Yy]|[Yy][Ee][Ss]) return 0 ;;
    *) return 1 ;;
  esac
}

draw_line() {
  local c="${1:-$C}"
  echo -e "${c}  ──────────────────────────────────────────────────────────${N}"
}

# ─── Root Check ──────────────────────────────────────────────────────────────
require_root() {
  [[ $EUID -ne 0 ]] && fatal "Run as root: ${C}sudo bash $0${N}"
}

# ─── Swap Management (for low-RAM servers) ───────────────────────────────────
SWAP_FILE="/swapfile_build"

ensure_swap() {
  local TOTAL_RAM_MB=$(free -m | awk '/^Mem:/{print $2}')
  local TOTAL_SWAP_MB=$(free -m | awk '/^Swap:/{print $2}')

  if (( TOTAL_RAM_MB + TOTAL_SWAP_MB >= 2500 )); then
    return 0
  fi

  local SWAP_SIZE_MB=2048
  info "RAM: ${TOTAL_RAM_MB}MB, Swap: ${TOTAL_SWAP_MB}MB — creating ${SWAP_SIZE_MB}MB swap for build..."

  if [[ -f "$SWAP_FILE" ]]; then
    swapoff "$SWAP_FILE" 2>/dev/null
    rm -f "$SWAP_FILE"
  fi

  dd if=/dev/zero of="$SWAP_FILE" bs=1M count=$SWAP_SIZE_MB status=none 2>/dev/null
  chmod 600 "$SWAP_FILE"
  mkswap "$SWAP_FILE" >/dev/null 2>&1
  swapon "$SWAP_FILE" 2>/dev/null

  local NEW_SWAP=$(free -m | awk '/^Swap:/{print $2}')
  success "Swap active: ${NEW_SWAP}MB total"
}

cleanup_swap() {
  if [[ -f "$SWAP_FILE" ]]; then
    swapoff "$SWAP_FILE" 2>/dev/null
    rm -f "$SWAP_FILE"
    info "Temporary build swap removed"
  fi
}

# ─── OS Detection ────────────────────────────────────────────────────────────
detect_os() {
  [[ -f /etc/os-release ]] && . /etc/os-release || fatal "Cannot detect OS"
  OS_ID="$ID"
  OS_CODENAME="${VERSION_CODENAME:-$(lsb_release -cs 2>/dev/null || echo unknown)}"
  OS_NAME="${PRETTY_NAME:-$ID}"
  case "$OS_ID" in
    ubuntu|debian) ;;
    *) fatal "Unsupported OS: ${R}$OS_NAME${N}. Only Ubuntu/Debian supported." ;;
  esac
}

# ─── Load saved config ──────────────────────────────────────────────────────
load_config() {
  INSTALL_DIR="$DEFAULT_INSTALL_DIR"
  DOMAIN=""
  if [[ -f "$CONFIG_FILE" ]]; then
    source "$CONFIG_FILE"
  fi
  # Try to detect from service if config missing
  if [[ -z "$INSTALL_DIR" || ! -d "$INSTALL_DIR" ]]; then
    local svc_dir=$(grep "WorkingDirectory" /etc/systemd/system/${SERVICE_NAME}.service 2>/dev/null | head -1 | cut -d= -f2 | sed 's|/backend||')
    [[ -n "$svc_dir" && -d "$svc_dir" ]] && INSTALL_DIR="$svc_dir"
  fi
  if [[ -z "$DOMAIN" ]]; then
    DOMAIN=$(grep "server_name" /etc/nginx/sites-available/${NGINX_CONF} 2>/dev/null | head -1 | awk '{print $2}' | tr -d ';')
  fi
}

save_config() {
  cat > "$CONFIG_FILE" << EOF
INSTALL_DIR="${INSTALL_DIR}"
DOMAIN="${DOMAIN}"
EOF
}

# ─── Check Install Status ───────────────────────────────────────────────────
is_installed() {
  [[ -f "/etc/systemd/system/${SERVICE_NAME}.service" && -d "${INSTALL_DIR:-/nonexistent}/backend" ]]
}

get_service_status() {
  local svc="$1"
  if systemctl is-active --quiet "$svc" 2>/dev/null; then
    echo -e "${G}● running${N}"
  elif systemctl is-enabled --quiet "$svc" 2>/dev/null; then
    echo -e "${Y}○ stopped${N}"
  else
    echo -e "${D}○ not found${N}"
  fi
}

# ═══════════════════════════════════════════════════════════════════════════════
#  BANNER
# ═══════════════════════════════════════════════════════════════════════════════
show_banner() {
  clear
  echo ""
  echo -e "${P}   ▄█   ▄█▄    ▄█    █▄      ▄████████  ▄█        ▄█   ▄█▄ "
  echo -e "  ███ ▄███▀   ███    ███    ███    ███ ███       ███ ▄███▀  "
  echo -e "  ███▐██▀     ███    ███    ███    ███ ███       ███▐██▀    "
  echo -e "  ███▐██▄     ███▄▄▄▄███▄▄ ███    ███ ███       ███▐██▄    "
  echo -e "  ███ ▀███▄   ▀▀▀▀▀▀███▀▀▀ ▀███████████ ███       ███ ▀███▄  "
  echo -e "  ███   ▀██▀        ███    ███    ███ ███       ███   ▀██▀ "
  echo -e "  ███     ▀         ███    ███    ███ ███▌    ▄ ███     ▀  "
  echo -e "  █▀                ███    ████████▀  █████▄▄██ █▀        ${N}"
  echo ""
  echo -e "  ${B}DNS Management Platform${N} ${D}Installer${N}"
  echo -e "  ${D}github.com/admin6501/ddns-khalilv2${N}"
  echo ""
}

# ═══════════════════════════════════════════════════════════════════════════════
#  MAIN MENU
# ═══════════════════════════════════════════════════════════════════════════════
show_menu() {
  load_config

  # Status line
  if is_installed; then
    local be_status=$(get_service_status ddns-backend)
    local ng_status=$(get_service_status nginx)
    local mg_status=$(get_service_status mongod)
    echo -e "  ${B}Status:${N} Backend ${be_status}  Nginx ${ng_status}  MongoDB ${mg_status}"
    [[ -n "$DOMAIN" ]] && echo -e "  ${B}Domain:${N} ${C}$DOMAIN${N}  ${B}Path:${N} ${C}$INSTALL_DIR${N}"
  else
    echo -e "  ${Y}Not installed yet${N}"
  fi

  draw_line "$D"
  echo ""
  echo -e "  ${B}${C}1${N} ${B})${N}  Install          ${D}Full installation from scratch${N}"
  echo -e "  ${B}${G}2${N} ${B})${N}  Start            ${D}Start all services${N}"
  echo -e "  ${B}${Y}3${N} ${B})${N}  Stop             ${D}Stop all services${N}"
  echo -e "  ${B}${P}4${N} ${B})${N}  Restart          ${D}Restart all services${N}"
  echo -e "  ${B}${R}5${N} ${B})${N}  Uninstall        ${D}Remove everything${N}"
  echo ""
  draw_line "$D"
  echo -e "  ${B}${W}6${N} ${B})${N}  Status           ${D}Detailed service status${N}"
  echo -e "  ${B}${W}7${N} ${B})${N}  Logs             ${D}View backend logs${N}"
  echo -e "  ${B}${W}8${N} ${B})${N}  Update           ${D}Pull latest code & rebuild${N}"
  echo -e "  ${B}${W}9${N} ${B})${N}  SSL Renew        ${D}Renew SSL certificate${N}"
  echo ""
  draw_line "$D"
  echo -e "  ${B}${C}e${N} ${B})${N}  Export           ${D}Backup data for migration${N}"
  echo -e "  ${B}${C}i${N} ${B})${N}  Import           ${D}Restore data from backup${N}"
  echo -e "  ${B}${C}t${N} ${B})${N}  Telegram Bot     ${D}Configure Telegram bot${N}"
  echo -e "  ${B}${W}0${N} ${B})${N}  Exit"
  echo ""

  clean_read choice "Select option: "
  echo ""

  case "$choice" in
    1) do_install ;;
    2) do_start ;;
    3) do_stop ;;
    4) do_restart ;;
    5) do_uninstall ;;
    6) do_status ;;
    7) do_logs ;;
    8) do_update ;;
    9) do_ssl_renew ;;
    e|E) do_export ;;
    i|I) do_import ;;
    t|T) do_telegram_config ;;
    0|q|Q) echo -e "  ${D}Goodbye!${N}"; echo ""; exit 0 ;;
    *) warn "Invalid option"; sleep 1 ;;
  esac
}

# ═══════════════════════════════════════════════════════════════════════════════
#  1) INSTALL
# ═══════════════════════════════════════════════════════════════════════════════
do_install() {
  if is_installed; then
    warn "Already installed at ${C}$INSTALL_DIR${N}"
    confirm "Re-install? This will overwrite config. Y/n" "n" || { pause_menu; return; }
  fi

  step "Configuration"
  collect_variables

  step "Step 1/7 — Prerequisites"
  install_prerequisites

  step "Step 2/7 — Clone Repository"
  clone_repository

  step "Step 3/7 — Backend Setup"
  setup_backend

  step "Step 4/7 — Frontend Setup"
  setup_frontend

  step "Step 5/7 — Systemd Service"
  create_service

  step "Step 6/7 — Nginx"
  configure_nginx

  step "Step 7/7 — SSL Certificate"
  obtain_ssl

  setup_firewall
  save_config

  echo ""
  draw_line "$G"
  echo -e "  ${G}${B}Installation Complete!${N}"
  draw_line "$G"
  echo ""
  echo -e "  ${B}Website:${N}       ${C}https://${DOMAIN}${N}"
  echo -e "  ${B}Admin Panel:${N}   ${C}https://${DOMAIN}/admin${N}"
  echo -e "  ${B}Admin Login:${N}   ${C}${ADMIN_EMAIL}${N}"
  echo -e "  ${B}Install Path:${N}  ${C}${INSTALL_DIR}${N}"
  echo ""
  draw_line "$G"
  echo ""

  pause_menu
}

collect_variables() {
  echo ""
  clean_read DOMAIN "Domain name (e.g. yourdomain.com): "
  [[ -z "$DOMAIN" ]] && fatal "Domain is required."

  clean_read SSL_EMAIL "Email for SSL (Let's Encrypt): "
  [[ -z "$SSL_EMAIL" ]] && fatal "Email required for SSL."

  echo ""
  echo -e "  ${B}Cloudflare${N}"
  clean_read CF_API_TOKEN "API Token: "
  [[ -z "$CF_API_TOKEN" ]] && fatal "Cloudflare API Token required."
  clean_read CF_ZONE_ID "Zone ID: "
  [[ -z "$CF_ZONE_ID" ]] && fatal "Cloudflare Zone ID required."

  echo ""
  echo -e "  ${B}Admin Account${N}"
  clean_read ADMIN_EMAIL "Admin email [admin@${DOMAIN}]: " "admin@${DOMAIN}"
  while true; do
    clean_read_silent ADMIN_PASSWORD "Admin password (min 6 chars): "
    [[ ${#ADMIN_PASSWORD} -ge 6 ]] && break
    warn "Minimum 6 characters."
  done

  echo ""
  echo -e "  ${B}Database${N}"
  clean_read MONGO_URL "MongoDB URL [mongodb://localhost:27017]: " "mongodb://localhost:27017"
  clean_read DB_NAME "Database name [khalilv2_dns]: " "khalilv2_dns"

  echo ""
  clean_read INSTALL_DIR "Install directory [${DEFAULT_INSTALL_DIR}]: " "${DEFAULT_INSTALL_DIR}"

  JWT_SECRET=$(openssl rand -hex 32 2>/dev/null || date +%s%N | sha256sum | head -c 64)

  echo ""
  echo -e "  ${B}Telegram Bot ${D}(optional)${N}"
  TELEGRAM_BOT_TOKEN=""
  confirm "Enable Telegram bot? y/N" "N" && {
    clean_read TELEGRAM_BOT_TOKEN "Bot token (from @BotFather): "
  }

  echo ""
  draw_line
  echo -e "  ${B}Review:${N}"
  echo -e "    Domain:      ${G}$DOMAIN${N}"
  echo -e "    Admin:       ${G}$ADMIN_EMAIL${N}"
  echo -e "    MongoDB:     ${G}$MONGO_URL${N} / ${G}$DB_NAME${N}"
  echo -e "    Path:        ${G}$INSTALL_DIR${N}"
  [[ -n "$TELEGRAM_BOT_TOKEN" ]] && echo -e "    Telegram:    ${G}Enabled${N}" || echo -e "    Telegram:    ${D}Disabled${N}"
  draw_line
  echo ""
  confirm "Proceed? Y/n" "Y" || fatal "Cancelled."
}

install_prerequisites() {
  info "Updating package lists..."
  apt-get update -qq 2>/dev/null || warn "apt-get update had issues"

  info "Installing packages..."
  DEBIAN_FRONTEND=noninteractive apt-get install -y -qq \
    curl wget git build-essential software-properties-common \
    python3 python3-pip python3-venv \
    nginx certbot python3-certbot-nginx \
    gnupg lsb-release ca-certificates 2>/dev/null || warn "Some packages failed"

  # Node.js
  if command -v node &>/dev/null; then
    success "Node.js $(node -v)"
  else
    info "Installing Node.js 20..."
    curl -fsSL https://deb.nodesource.com/setup_20.x | bash - 2>/dev/null
    apt-get install -y -qq nodejs 2>/dev/null || fatal "Node.js install failed"
    success "Node.js $(node -v)"
  fi

  # Yarn
  if command -v yarn &>/dev/null; then
    success "Yarn $(yarn -v)"
  else
    npm install -g yarn 2>/dev/null || fatal "Yarn install failed"
    success "Yarn $(yarn -v)"
  fi

  # MongoDB
  if command -v mongod &>/dev/null || systemctl is-active --quiet mongod 2>/dev/null; then
    success "MongoDB installed"
  else
    info "Installing MongoDB 7.0..."
    curl -fsSL https://www.mongodb.org/static/pgp/server-7.0.asc | gpg --dearmor -o /usr/share/keyrings/mongodb-server-7.0.gpg 2>/dev/null
    if [[ "$OS_ID" == "ubuntu" ]]; then
      echo "deb [signed-by=/usr/share/keyrings/mongodb-server-7.0.gpg] https://repo.mongodb.org/apt/ubuntu ${OS_CODENAME}/mongodb-org/7.0 multiverse" > /etc/apt/sources.list.d/mongodb-org-7.0.list
    else
      echo "deb [signed-by=/usr/share/keyrings/mongodb-server-7.0.gpg] https://repo.mongodb.org/apt/debian ${OS_CODENAME}/mongodb-org/7.0 main" > /etc/apt/sources.list.d/mongodb-org-7.0.list
    fi
    apt-get update -qq 2>/dev/null
    DEBIAN_FRONTEND=noninteractive apt-get install -y -qq mongodb-org 2>/dev/null || apt-get install -y -qq mongodb 2>/dev/null || warn "MongoDB install failed"
  fi

  systemctl start mongod 2>/dev/null; systemctl enable mongod 2>/dev/null
  success "Prerequisites ready"
}

clone_repository() {
  if [[ -d "$INSTALL_DIR/.git" ]]; then
    info "Pulling latest..."
    cd "$INSTALL_DIR" && git pull 2>/dev/null
    success "Updated"
  else
    [[ -d "$INSTALL_DIR" ]] && rm -rf "$INSTALL_DIR"
    git clone "$REPO_URL" "$INSTALL_DIR" || fatal "Clone failed"
    success "Cloned to $INSTALL_DIR"
  fi
}

setup_backend() {
  cd "$INSTALL_DIR/backend"

  cat > .env << EOF
MONGO_URL=${MONGO_URL}
DB_NAME=${DB_NAME}
CORS_ORIGINS=https://${DOMAIN}
CLOUDFLARE_API_TOKEN=${CF_API_TOKEN}
CLOUDFLARE_ZONE_ID=${CF_ZONE_ID}
JWT_SECRET=${JWT_SECRET}
DOMAIN_NAME=${DOMAIN}
ADMIN_EMAIL=${ADMIN_EMAIL}
ADMIN_PASSWORD=${ADMIN_PASSWORD}
TELEGRAM_BOT_TOKEN=${TELEGRAM_BOT_TOKEN}
EOF
  success "Backend .env created"

  python3 -m venv venv || fatal "Python venv failed"
  source venv/bin/activate
  pip install --upgrade pip -q 2>/dev/null
  pip install -r requirements.txt -q 2>/dev/null || pip install fastapi uvicorn motor pymongo python-dotenv bcrypt pyjwt httpx pydantic[email] -q
  deactivate
  success "Backend dependencies installed"
}

setup_frontend() {
  cd "$INSTALL_DIR/frontend"

  cat > .env << EOF
REACT_APP_BACKEND_URL=https://${DOMAIN}
REACT_APP_DOMAIN_NAME=${DOMAIN}
EOF
  success "Frontend .env created"

  # Clean index.html from any Emergent traces
  cat > public/index.html << EOF
<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta name="theme-color" content="#000000" />
    <meta name="description" content="Free DNS Management on ${DOMAIN}" />
    <title>${DOMAIN} - DNS Management</title>
  </head>
  <body>
    <noscript>You need to enable JavaScript to run this app.</noscript>
    <div id="root"></div>
  </body>
</html>
EOF

  info "Installing frontend dependencies..."
  yarn install 2>/dev/null || yarn install || fatal "Frontend deps failed"
  success "Dependencies installed"

  # Ensure enough memory (swap) for build on low-RAM servers
  ensure_swap

  info "Building production bundle..."
  export NODE_OPTIONS="--max-old-space-size=3072"
  export GENERATE_SOURCEMAP=false
  yarn build 2>/dev/null || yarn build || { cleanup_swap; fatal "Build failed"; }
  unset NODE_OPTIONS GENERATE_SOURCEMAP

  # Remove temporary swap
  cleanup_swap

  # Clean build output from Emergent traces
  if [[ -f build/index.html ]]; then
    python3 -c "
import re
with open('build/index.html','r') as f: h=f.read()
h=re.sub(r'<a[^>]*id=\"emergent-badge\"[^>]*>.*?</a>','',h,flags=re.DOTALL)
h=re.sub(r'<script[^>]*emergent-main\.js[^>]*></script>','',h)
h=re.sub(r'<script>\s*//\s*Only load visual edit.*?</script>','',h,flags=re.DOTALL)
h=re.sub(r'<script>\s*!\(function\s*\(t,\s*e\).*?</script>','',h,flags=re.DOTALL)
with open('build/index.html','w') as f: f.write(h)
" 2>/dev/null
  fi

  success "Frontend built & cleaned"
}

create_service() {
  cat > /etc/systemd/system/${SERVICE_NAME}.service << EOF
[Unit]
Description=khalilv2 DNS Backend
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
EOF

  systemctl daemon-reload
  systemctl enable ${SERVICE_NAME} 2>/dev/null
  systemctl restart ${SERVICE_NAME}
  sleep 3
  systemctl is-active --quiet ${SERVICE_NAME} && success "Backend service running" || warn "Backend may need attention"
}

configure_nginx() {
  rm -f /etc/nginx/sites-enabled/default 2>/dev/null

  cat > /etc/nginx/sites-available/${NGINX_CONF} << 'NGXEOF'
server {
    listen 80;
    listen [::]:80;
    server_name __DOMAIN__;

    root __ROOT__;
    index index.html;

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
    }

    location / {
        try_files $uri $uri/ /index.html;
    }

    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml text/javascript image/svg+xml;
}
NGXEOF

  sed -i "s|__DOMAIN__|${DOMAIN}|g" /etc/nginx/sites-available/${NGINX_CONF}
  sed -i "s|__ROOT__|${INSTALL_DIR}/frontend/build|g" /etc/nginx/sites-available/${NGINX_CONF}

  ln -sf /etc/nginx/sites-available/${NGINX_CONF} /etc/nginx/sites-enabled/
  nginx -t 2>&1 && { systemctl reload nginx; success "Nginx configured"; } || warn "Nginx config error"
}

obtain_ssl() {
  echo ""
  warn "Domain ${B}$DOMAIN${N} must point to this server's IP!"
  echo ""
  confirm "Is DNS configured? Y/n" "Y" || {
    warn "Skipping SSL. Run option 9 later."
    return
  }

  certbot --nginx -d "$DOMAIN" --non-interactive --agree-tos -m "$SSL_EMAIL" --redirect 2>&1 || {
    warn "SSL failed. Run option 9 after fixing DNS."
    return
  }

  success "SSL obtained!"

  # Re-write Nginx properly for SPA + SSL
  local SSL_CERT="/etc/letsencrypt/live/${DOMAIN}/fullchain.pem"
  local SSL_KEY="/etc/letsencrypt/live/${DOMAIN}/privkey.pem"

  cat > /etc/nginx/sites-available/${NGINX_CONF} << NGXEOF
server {
    listen 80;
    listen [::]:80;
    server_name ${DOMAIN};
    return 301 https://\$host\$request_uri;
}
server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name ${DOMAIN};

    ssl_certificate ${SSL_CERT};
    ssl_certificate_key ${SSL_KEY};
    include /etc/letsencrypt/options-ssl-nginx.conf;
    ssl_dhparam /etc/letsencrypt/ssl-dhparams.pem;

    root ${INSTALL_DIR}/frontend/build;
    index index.html;

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
    }

    location / {
        try_files \$uri \$uri/ /index.html;
    }

    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;

    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml text/javascript image/svg+xml;
}
NGXEOF

  ln -sf /etc/nginx/sites-available/${NGINX_CONF} /etc/nginx/sites-enabled/
  nginx -t 2>&1 && systemctl reload nginx

  sed -i "s|CORS_ORIGINS=.*|CORS_ORIGINS=https://${DOMAIN}|" "$INSTALL_DIR/backend/.env"
  systemctl restart ${SERVICE_NAME}
  success "SSL + SPA routing configured"
}

setup_firewall() {
  if command -v ufw &>/dev/null; then
    ufw allow 22/tcp 2>/dev/null; ufw allow 80/tcp 2>/dev/null; ufw allow 443/tcp 2>/dev/null
    echo "y" | ufw enable 2>/dev/null
    success "Firewall configured"
  fi
}

# ═══════════════════════════════════════════════════════════════════════════════
#  2) START
# ═══════════════════════════════════════════════════════════════════════════════
do_start() {
  is_installed || { fail "Not installed. Choose option 1 first."; pause_menu; return; }

  step "Starting Services"

  info "Starting MongoDB..."
  systemctl start mongod 2>/dev/null
  sleep 1
  systemctl is-active --quiet mongod && success "MongoDB $(get_service_status mongod)" || warn "MongoDB issue"

  info "Starting Backend..."
  systemctl start ${SERVICE_NAME} 2>/dev/null
  sleep 2
  systemctl is-active --quiet ${SERVICE_NAME} && success "Backend $(get_service_status ${SERVICE_NAME})" || warn "Backend issue"

  info "Starting Nginx..."
  systemctl start nginx 2>/dev/null
  systemctl is-active --quiet nginx && success "Nginx $(get_service_status nginx)" || warn "Nginx issue"

  echo ""
  [[ -n "$DOMAIN" ]] && success "Site live at ${C}https://${DOMAIN}${N}"
  echo ""
  pause_menu
}

# ═══════════════════════════════════════════════════════════════════════════════
#  3) STOP
# ═══════════════════════════════════════════════════════════════════════════════
do_stop() {
  is_installed || { fail "Not installed."; pause_menu; return; }

  step "Stopping Services"

  info "Stopping Backend..."
  systemctl stop ${SERVICE_NAME} 2>/dev/null
  success "Backend stopped"

  info "Stopping Nginx..."
  systemctl stop nginx 2>/dev/null
  success "Nginx stopped"

  confirm "Stop MongoDB too? (other apps may use it) y/N" "n" && {
    systemctl stop mongod 2>/dev/null
    success "MongoDB stopped"
  }

  echo ""
  success "All services stopped"
  echo ""
  pause_menu
}

# ═══════════════════════════════════════════════════════════════════════════════
#  4) RESTART
# ═══════════════════════════════════════════════════════════════════════════════
do_restart() {
  is_installed || { fail "Not installed."; pause_menu; return; }

  step "Restarting Services"

  info "Restarting MongoDB..."
  systemctl restart mongod 2>/dev/null
  sleep 1

  info "Restarting Backend..."
  systemctl restart ${SERVICE_NAME} 2>/dev/null
  sleep 2

  info "Restarting Nginx..."
  systemctl restart nginx 2>/dev/null
  sleep 1

  echo ""
  echo -e "  MongoDB:  $(get_service_status mongod)"
  echo -e "  Backend:  $(get_service_status ${SERVICE_NAME})"
  echo -e "  Nginx:    $(get_service_status nginx)"
  echo ""
  success "All services restarted"
  echo ""
  pause_menu
}

# ═══════════════════════════════════════════════════════════════════════════════
#  5) UNINSTALL
# ═══════════════════════════════════════════════════════════════════════════════
do_uninstall() {
  is_installed || { fail "Nothing to uninstall."; pause_menu; return; }

  # Read DB_NAME from backend .env
  local UNINSTALL_DB_NAME=""
  if [[ -f "${INSTALL_DIR}/backend/.env" ]]; then
    UNINSTALL_DB_NAME=$(grep "^DB_NAME=" "${INSTALL_DIR}/backend/.env" 2>/dev/null | cut -d= -f2 | tr -d '"' | tr -d "'")
  fi
  UNINSTALL_DB_NAME="${UNINSTALL_DB_NAME:-khalilv2_dns}"

  echo ""
  echo -e "  ${R}${B}WARNING: This will permanently remove:${N}"
  echo -e "  ${R}  • Backend service & config${N}"
  echo -e "  ${R}  • Nginx site config${N}"
  echo -e "  ${R}  • Application files at ${INSTALL_DIR}${N}"
  echo -e "  ${R}  • SSL certificates for ${DOMAIN}${N}"
  echo -e "  ${R}  • MongoDB database: ${UNINSTALL_DB_NAME}${N}"
  echo ""

  confirm "${R}Type Y to confirm uninstall${N} y/N" "n" || { info "Cancelled."; pause_menu; return; }

  step "Uninstalling"

  # Stop services
  info "Stopping services..."
  systemctl stop ${SERVICE_NAME} 2>/dev/null
  systemctl disable ${SERVICE_NAME} 2>/dev/null
  success "Backend stopped & disabled"

  # Remove systemd service
  info "Removing service..."
  rm -f /etc/systemd/system/${SERVICE_NAME}.service
  systemctl daemon-reload
  success "Service removed"

  # Remove Nginx config
  info "Removing Nginx config..."
  rm -f /etc/nginx/sites-enabled/${NGINX_CONF}
  rm -f /etc/nginx/sites-available/${NGINX_CONF}
  nginx -t 2>&1 && systemctl reload nginx 2>/dev/null
  success "Nginx config removed"

  # Remove SSL
  if [[ -d "/etc/letsencrypt/live/${DOMAIN}" ]]; then
    info "Removing SSL certificate..."
    certbot delete --cert-name "$DOMAIN" --non-interactive 2>/dev/null || {
      rm -rf "/etc/letsencrypt/live/${DOMAIN}"
      rm -rf "/etc/letsencrypt/archive/${DOMAIN}"
      rm -f "/etc/letsencrypt/renewal/${DOMAIN}.conf"
    }
    success "SSL certificate removed"
  fi

  # Drop MongoDB database
  info "Dropping database: ${UNINSTALL_DB_NAME}..."
  if command -v mongosh &>/dev/null; then
    mongosh --quiet --eval "db.getSiblingDB('${UNINSTALL_DB_NAME}').dropDatabase()" 2>/dev/null && \
      success "Database ${UNINSTALL_DB_NAME} dropped" || warn "Could not drop database"
  elif command -v mongo &>/dev/null; then
    mongo --quiet --eval "db.getSiblingDB('${UNINSTALL_DB_NAME}').dropDatabase()" 2>/dev/null && \
      success "Database ${UNINSTALL_DB_NAME} dropped" || warn "Could not drop database"
  else
    warn "mongosh/mongo not found. Drop manually: mongosh --eval 'db.getSiblingDB(\"${UNINSTALL_DB_NAME}\").dropDatabase()'"
  fi

  # Remove app files
  info "Removing application files..."
  rm -rf "$INSTALL_DIR"
  success "Files removed: $INSTALL_DIR"

  # Remove config
  rm -f "$CONFIG_FILE"

  # Remove ddns-ctl if exists
  rm -f /usr/local/bin/ddns-ctl 2>/dev/null

  echo ""
  draw_line "$G"
  echo -e "  ${G}${B}Uninstall complete. Everything has been removed.${N}"
  draw_line "$G"
  echo ""

  pause_menu
}

# ═══════════════════════════════════════════════════════════════════════════════
#  6) STATUS
# ═══════════════════════════════════════════════════════════════════════════════
do_status() {
  step "Service Status"

  echo ""
  printf "  ${B}%-14s${N} %-20s %s\n" "Service" "Status" "Details"
  draw_line "$D"

  # MongoDB
  local mg_stat=$(get_service_status mongod)
  local mg_mem=""
  if systemctl is-active --quiet mongod 2>/dev/null; then
    mg_mem=$(ps aux | grep mongod | grep -v grep | awk '{print $6/1024 "MB"}' | head -1)
  fi
  printf "  %-14s %-30b %s\n" "MongoDB" "$mg_stat" "${D}${mg_mem}${N}"

  # Backend
  local be_stat=$(get_service_status ${SERVICE_NAME})
  local be_mem=""
  if systemctl is-active --quiet ${SERVICE_NAME} 2>/dev/null; then
    be_mem=$(ps aux | grep uvicorn | grep -v grep | awk '{total+=$6} END {printf "%.0fMB", total/1024}')
  fi
  printf "  %-14s %-30b %s\n" "Backend" "$be_stat" "${D}${be_mem}${N}"

  # Nginx
  local ng_stat=$(get_service_status nginx)
  printf "  %-14s %-30b\n" "Nginx" "$ng_stat"

  echo ""

  # Disk usage
  if [[ -d "$INSTALL_DIR" ]]; then
    local disk=$(du -sh "$INSTALL_DIR" 2>/dev/null | cut -f1)
    echo -e "  ${B}Disk:${N}    ${disk} used at ${INSTALL_DIR}"
  fi

  # SSL info
  if [[ -n "$DOMAIN" && -f "/etc/letsencrypt/live/${DOMAIN}/fullchain.pem" ]]; then
    local ssl_exp=$(openssl x509 -enddate -noout -in "/etc/letsencrypt/live/${DOMAIN}/fullchain.pem" 2>/dev/null | cut -d= -f2)
    echo -e "  ${B}SSL:${N}     Expires ${C}${ssl_exp}${N}"
  fi

  # URL
  [[ -n "$DOMAIN" ]] && echo -e "  ${B}URL:${N}     ${C}https://${DOMAIN}${N}"

  echo ""
  pause_menu
}

# ═══════════════════════════════════════════════════════════════════════════════
#  7) LOGS
# ═══════════════════════════════════════════════════════════════════════════════
do_logs() {
  is_installed || { fail "Not installed."; pause_menu; return; }
  echo -e "  ${D}Press Ctrl+C to exit logs${N}"
  echo ""
  journalctl -u ${SERVICE_NAME} -f --no-hostname -n 50
  pause_menu
}

# ═══════════════════════════════════════════════════════════════════════════════
#  8) UPDATE
# ═══════════════════════════════════════════════════════════════════════════════
do_update() {
  is_installed || { fail "Not installed."; pause_menu; return; }

  step "Updating Application"

  info "Pulling latest code..."
  cd "$INSTALL_DIR" && git pull origin main 2>/dev/null || git pull 2>/dev/null
  success "Code updated"

  info "Updating backend..."
  cd "$INSTALL_DIR/backend"
  source venv/bin/activate
  pip install -r requirements.txt -q 2>/dev/null
  deactivate
  success "Backend dependencies updated"

  info "Rebuilding frontend..."
  cd "$INSTALL_DIR/frontend"
  yarn install 2>/dev/null
  yarn build 2>/dev/null || yarn build

  # Clean build
  if [[ -f build/index.html ]]; then
    python3 -c "
import re
with open('build/index.html','r') as f: h=f.read()
h=re.sub(r'<a[^>]*id=\"emergent-badge\"[^>]*>.*?</a>','',h,flags=re.DOTALL)
h=re.sub(r'<script[^>]*emergent-main\.js[^>]*></script>','',h)
h=re.sub(r'<script>\s*//\s*Only load visual edit.*?</script>','',h,flags=re.DOTALL)
h=re.sub(r'<script>\s*!\(function\s*\(t,\s*e\).*?</script>','',h,flags=re.DOTALL)
with open('build/index.html','w') as f: f.write(h)
" 2>/dev/null
  fi
  success "Frontend rebuilt"

  info "Restarting services..."
  systemctl restart ${SERVICE_NAME} nginx
  sleep 2
  success "Services restarted"

  echo ""
  success "Update complete!"
  echo ""
  pause_menu
}

# ═══════════════════════════════════════════════════════════════════════════════
#  9) SSL RENEW
# ═══════════════════════════════════════════════════════════════════════════════
do_ssl_renew() {
  step "SSL Certificate"

  if [[ -n "$DOMAIN" && -f "/etc/letsencrypt/live/${DOMAIN}/fullchain.pem" ]]; then
    local ssl_exp=$(openssl x509 -enddate -noout -in "/etc/letsencrypt/live/${DOMAIN}/fullchain.pem" 2>/dev/null | cut -d= -f2)
    info "Current cert expires: ${C}${ssl_exp}${N}"
  fi

  echo ""
  clean_read ssl_action "1) Renew existing  2) New certificate  [1]: " "1"

  case "$ssl_action" in
    2)
      [[ -z "$DOMAIN" ]] && clean_read DOMAIN "Domain: "
      clean_read SSL_EMAIL "Email for SSL: "
      certbot --nginx -d "$DOMAIN" --non-interactive --agree-tos -m "$SSL_EMAIL" --redirect 2>&1 || warn "Failed"
      ;;
    *)
      certbot renew 2>&1 || warn "Renewal failed"
      ;;
  esac

  systemctl reload nginx 2>/dev/null
  success "Done"
  echo ""
  pause_menu
}

# ═══════════════════════════════════════════════════════════════════════════════
#  T) TELEGRAM BOT CONFIG
# ═══════════════════════════════════════════════════════════════════════════════
do_telegram_config() {
  is_installed || { fail "Not installed."; pause_menu; return; }

  step "Telegram Bot Configuration"

  local ENV_FILE="${INSTALL_DIR}/backend/.env"
  local CURRENT_TOKEN=$(grep "^TELEGRAM_BOT_TOKEN=" "$ENV_FILE" 2>/dev/null | cut -d= -f2-)

  if [[ -n "$CURRENT_TOKEN" ]]; then
    echo -e "  ${B}Status:${N} ${G}Enabled${N}"
    echo -e "  ${D}Token: ${CURRENT_TOKEN:0:10}...${N}"
    echo ""
    echo -e "  ${C}1${N}) Change token"
    echo -e "  ${C}2${N}) Disable bot (remove token)"
    echo -e "  ${C}3${N}) Back"
    echo ""
    clean_read tg_choice "Select: " "3"

    case "$tg_choice" in
      1)
        clean_read NEW_TOKEN "New bot token (from @BotFather): "
        [[ -z "$NEW_TOKEN" ]] && { warn "Empty token."; pause_menu; return; }
        sed -i "s|^TELEGRAM_BOT_TOKEN=.*|TELEGRAM_BOT_TOKEN=${NEW_TOKEN}|" "$ENV_FILE"
        success "Token updated"
        info "Restarting backend..."
        systemctl restart ${SERVICE_NAME} 2>/dev/null
        success "Done! Bot should be active now."
        ;;
      2)
        sed -i "s|^TELEGRAM_BOT_TOKEN=.*|TELEGRAM_BOT_TOKEN=|" "$ENV_FILE"
        success "Telegram bot disabled"
        systemctl restart ${SERVICE_NAME} 2>/dev/null
        ;;
      *) ;;
    esac
  else
    echo -e "  ${B}Status:${N} ${R}Disabled${N}"
    echo ""
    echo -e "  ${D}To create a bot:${N}"
    echo -e "  ${D}  1. Open Telegram and search @BotFather${N}"
    echo -e "  ${D}  2. Send /newbot and follow instructions${N}"
    echo -e "  ${D}  3. Copy the token${N}"
    echo ""
    confirm "Enable Telegram bot now? y/N" "N" && {
      clean_read NEW_TOKEN "Bot token: "
      [[ -z "$NEW_TOKEN" ]] && { warn "Empty token."; pause_menu; return; }

      if grep -q "^TELEGRAM_BOT_TOKEN=" "$ENV_FILE" 2>/dev/null; then
        sed -i "s|^TELEGRAM_BOT_TOKEN=.*|TELEGRAM_BOT_TOKEN=${NEW_TOKEN}|" "$ENV_FILE"
      else
        echo "TELEGRAM_BOT_TOKEN=${NEW_TOKEN}" >> "$ENV_FILE"
      fi

      success "Token saved"
      info "Restarting backend..."
      systemctl restart ${SERVICE_NAME} 2>/dev/null
      success "Done! Bot should be active now."
    }
  fi

  pause_menu
}

# ═══════════════════════════════════════════════════════════════════════════════
#  E) EXPORT — Backup data for migration
# ═══════════════════════════════════════════════════════════════════════════════
do_export() {
  is_installed || { fail "Not installed. Nothing to export."; pause_menu; return; }

  step "Export / Backup"

  # Read DB info from backend .env
  local EXPORT_MONGO_URL EXPORT_DB_NAME
  if [[ -f "${INSTALL_DIR}/backend/.env" ]]; then
    EXPORT_MONGO_URL=$(grep "^MONGO_URL=" "${INSTALL_DIR}/backend/.env" 2>/dev/null | cut -d= -f2- | tr -d '"' | tr -d "'")
    EXPORT_DB_NAME=$(grep "^DB_NAME=" "${INSTALL_DIR}/backend/.env" 2>/dev/null | cut -d= -f2- | tr -d '"' | tr -d "'")
  fi
  EXPORT_MONGO_URL="${EXPORT_MONGO_URL:-mongodb://localhost:27017}"
  EXPORT_DB_NAME="${EXPORT_DB_NAME:-dns_management}"

  local TIMESTAMP=$(date +%Y%m%d_%H%M%S)
  local EXPORT_DIR="/tmp/ddns-export-${TIMESTAMP}"
  local EXPORT_FILE="${HOME}/ddns-backup-${TIMESTAMP}.tar.gz"

  mkdir -p "$EXPORT_DIR"

  # ─── 1. Export MongoDB ─────────────────────────────────────
  info "Exporting MongoDB database: ${C}${EXPORT_DB_NAME}${N}..."

  if command -v mongodump &>/dev/null; then
    mongodump --uri="$EXPORT_MONGO_URL" --db="$EXPORT_DB_NAME" --out="$EXPORT_DIR/mongodb" --quiet 2>/dev/null \
      && success "MongoDB dump complete" \
      || { fail "mongodump failed"; rm -rf "$EXPORT_DIR"; pause_menu; return; }
  elif command -v mongosh &>/dev/null; then
    # Fallback: export as JSON using mongosh
    info "mongodump not found, using mongosh JSON export..."
    mkdir -p "$EXPORT_DIR/mongodb_json"
    local collections=("users" "dns_records" "settings" "plans")
    for col in "${collections[@]}"; do
      mongosh --quiet "${EXPORT_MONGO_URL}/${EXPORT_DB_NAME}" --eval "JSON.stringify(db.${col}.find({}).toArray())" 2>/dev/null > "$EXPORT_DIR/mongodb_json/${col}.json" \
        && success "Exported collection: ${col}" \
        || warn "Could not export collection: ${col}"
    done
  elif command -v mongo &>/dev/null; then
    info "mongodump not found, using mongo JSON export..."
    mkdir -p "$EXPORT_DIR/mongodb_json"
    local collections=("users" "dns_records" "settings" "plans")
    for col in "${collections[@]}"; do
      mongo --quiet "${EXPORT_MONGO_URL}/${EXPORT_DB_NAME}" --eval "JSON.stringify(db.${col}.find({}).toArray())" 2>/dev/null > "$EXPORT_DIR/mongodb_json/${col}.json" \
        && success "Exported collection: ${col}" \
        || warn "Could not export collection: ${col}"
    done
  else
    fail "No MongoDB tools found (mongodump/mongosh/mongo). Install mongodb-database-tools."
    rm -rf "$EXPORT_DIR"
    pause_menu
    return
  fi

  # ─── 2. Copy .env files ───────────────────────────────────
  info "Backing up configuration..."
  mkdir -p "$EXPORT_DIR/config"

  [[ -f "${INSTALL_DIR}/backend/.env" ]] && cp "${INSTALL_DIR}/backend/.env" "$EXPORT_DIR/config/backend.env" && success "Backend .env saved"
  [[ -f "${INSTALL_DIR}/frontend/.env" ]] && cp "${INSTALL_DIR}/frontend/.env" "$EXPORT_DIR/config/frontend.env" && success "Frontend .env saved"
  [[ -f "$CONFIG_FILE" ]] && cp "$CONFIG_FILE" "$EXPORT_DIR/config/install.conf" && success "Install config saved"

  # ─── 3. Save metadata ─────────────────────────────────────
  cat > "$EXPORT_DIR/metadata.txt" << EOF
export_date=$(date -Iseconds)
domain=${DOMAIN}
db_name=${EXPORT_DB_NAME}
install_dir=${INSTALL_DIR}
hostname=$(hostname)
os=$(. /etc/os-release && echo "$PRETTY_NAME")
EOF
  success "Metadata saved"

  # ─── 4. Create archive ────────────────────────────────────
  info "Creating archive..."
  tar -czf "$EXPORT_FILE" -C /tmp "ddns-export-${TIMESTAMP}" 2>/dev/null \
    && success "Archive created" \
    || { fail "Archive creation failed"; rm -rf "$EXPORT_DIR"; pause_menu; return; }

  # Cleanup temp
  rm -rf "$EXPORT_DIR"

  local FILE_SIZE=$(du -h "$EXPORT_FILE" | cut -f1)

  echo ""
  draw_line "$G"
  echo -e "  ${G}${B}Export Complete!${N}"
  draw_line "$G"
  echo ""
  echo -e "  ${B}File:${N}     ${C}${EXPORT_FILE}${N}"
  echo -e "  ${B}Size:${N}     ${C}${FILE_SIZE}${N}"
  echo -e "  ${B}Domain:${N}   ${C}${DOMAIN}${N}"
  echo -e "  ${B}Database:${N} ${C}${EXPORT_DB_NAME}${N}"
  echo ""
  echo -e "  ${B}Transfer to new server:${N}"
  echo -e "  ${D}  scp ${EXPORT_FILE} root@NEW_SERVER_IP:~/${N}"
  echo ""
  echo -e "  ${B}Then on new server:${N}"
  echo -e "  ${D}  1. Run install.sh and choose Install${N}"
  echo -e "  ${D}  2. After install, choose Import and provide the backup file path${N}"
  echo ""
  draw_line "$G"
  echo ""

  pause_menu
}

# ═══════════════════════════════════════════════════════════════════════════════
#  I) IMPORT — Restore data from backup
# ═══════════════════════════════════════════════════════════════════════════════
do_import() {
  is_installed || { fail "Not installed. Run Install first, then Import."; pause_menu; return; }

  step "Import / Restore"

  echo ""
  clean_read IMPORT_FILE "Path to backup file (e.g. ~/ddns-backup-*.tar.gz): "
  [[ -z "$IMPORT_FILE" ]] && { fail "No file specified."; pause_menu; return; }

  # Expand ~ to $HOME
  IMPORT_FILE="${IMPORT_FILE/#\~/$HOME}"

  [[ ! -f "$IMPORT_FILE" ]] && { fail "File not found: ${R}$IMPORT_FILE${N}"; pause_menu; return; }

  # Read current DB info
  local IMPORT_MONGO_URL IMPORT_DB_NAME
  if [[ -f "${INSTALL_DIR}/backend/.env" ]]; then
    IMPORT_MONGO_URL=$(grep "^MONGO_URL=" "${INSTALL_DIR}/backend/.env" 2>/dev/null | cut -d= -f2- | tr -d '"' | tr -d "'")
    IMPORT_DB_NAME=$(grep "^DB_NAME=" "${INSTALL_DIR}/backend/.env" 2>/dev/null | cut -d= -f2- | tr -d '"' | tr -d "'")
  fi
  IMPORT_MONGO_URL="${IMPORT_MONGO_URL:-mongodb://localhost:27017}"
  IMPORT_DB_NAME="${IMPORT_DB_NAME:-dns_management}"

  # Extract archive
  local EXTRACT_DIR="/tmp/ddns-import-$$"
  mkdir -p "$EXTRACT_DIR"

  info "Extracting archive..."
  tar -xzf "$IMPORT_FILE" -C "$EXTRACT_DIR" 2>/dev/null || { fail "Failed to extract archive."; rm -rf "$EXTRACT_DIR"; pause_menu; return; }

  # Find the extracted folder
  local DATA_DIR=$(find "$EXTRACT_DIR" -maxdepth 1 -type d -name "ddns-export-*" | head -1)
  [[ -z "$DATA_DIR" ]] && DATA_DIR="$EXTRACT_DIR"

  # Show metadata
  if [[ -f "$DATA_DIR/metadata.txt" ]]; then
    echo ""
    echo -e "  ${B}Backup Info:${N}"
    while IFS='=' read -r key val; do
      [[ -n "$key" && -n "$val" ]] && printf "    ${D}%-14s${N} %s\n" "$key:" "$val"
    done < "$DATA_DIR/metadata.txt"
    echo ""
  fi

  # Ask what to restore
  echo -e "  ${B}What to restore:${N}"
  echo -e "    ${C}1${N}) Database + Config  ${D}(recommended — full restore)${N}"
  echo -e "    ${C}2${N}) Database only      ${D}(keep current .env config)${N}"
  echo -e "    ${C}3${N}) Config only        ${D}(keep current database)${N}"
  echo ""
  clean_read restore_mode "Select [1]: " "1"

  local do_db=false do_conf=false
  case "$restore_mode" in
    2) do_db=true ;;
    3) do_conf=true ;;
    *) do_db=true; do_conf=true ;;
  esac

  # ─── Confirm ──────────────────────────────────────────────
  echo ""
  warn "This will ${R}overwrite${N} existing data!"
  confirm "Proceed with restore? Y/n" "Y" || { info "Cancelled."; rm -rf "$EXTRACT_DIR"; pause_menu; return; }

  # ─── Stop services ────────────────────────────────────────
  info "Stopping backend..."
  systemctl stop ${SERVICE_NAME} 2>/dev/null
  sleep 1

  # ─── Restore Database ─────────────────────────────────────
  if $do_db; then
    step "Restoring Database"

    if [[ -d "$DATA_DIR/mongodb" ]]; then
      # mongodump format
      info "Restoring MongoDB dump..."

      # Find the DB folder inside the dump
      local DUMP_DB_DIR=$(find "$DATA_DIR/mongodb" -maxdepth 1 -type d ! -name "mongodb" | head -1)
      local SOURCE_DB_NAME=$(basename "$DUMP_DB_DIR" 2>/dev/null)

      if [[ -n "$DUMP_DB_DIR" && -d "$DUMP_DB_DIR" ]]; then
        if command -v mongorestore &>/dev/null; then
          # Drop existing and restore
          mongorestore --uri="$IMPORT_MONGO_URL" --db="$IMPORT_DB_NAME" --dir="$DUMP_DB_DIR" --drop --quiet 2>/dev/null \
            && success "Database restored from mongodump (${SOURCE_DB_NAME} → ${IMPORT_DB_NAME})" \
            || fail "mongorestore failed"
        else
          fail "mongorestore not found. Install: apt install mongodb-database-tools"
        fi
      else
        warn "No database folder found in dump"
      fi

    elif [[ -d "$DATA_DIR/mongodb_json" ]]; then
      # JSON format
      info "Restoring from JSON export..."

      local SHELL_CMD=""
      command -v mongosh &>/dev/null && SHELL_CMD="mongosh" || { command -v mongo &>/dev/null && SHELL_CMD="mongo"; }

      if [[ -n "$SHELL_CMD" ]]; then
        for json_file in "$DATA_DIR/mongodb_json"/*.json; do
          local col_name=$(basename "$json_file" .json)
          local doc_count=$(python3 -c "import json; data=json.load(open('$json_file')); print(len(data))" 2>/dev/null || echo "?")

          # Drop and insert
          $SHELL_CMD --quiet "${IMPORT_MONGO_URL}/${IMPORT_DB_NAME}" --eval "db.${col_name}.drop()" 2>/dev/null

          if [[ "$doc_count" != "0" && "$doc_count" != "?" ]]; then
            # Use mongoimport if available
            if command -v mongoimport &>/dev/null; then
              mongoimport --uri="${IMPORT_MONGO_URL}" --db="${IMPORT_DB_NAME}" --collection="${col_name}" --jsonArray --file="$json_file" --quiet 2>/dev/null \
                && success "Restored: ${col_name} (${doc_count} docs)" \
                || warn "Failed to restore: ${col_name}"
            else
              # Fallback: insert via shell
              $SHELL_CMD --quiet "${IMPORT_MONGO_URL}/${IMPORT_DB_NAME}" --eval "
                var data = $(cat "$json_file");
                if (data.length > 0) { db.${col_name}.insertMany(data); }
              " 2>/dev/null \
                && success "Restored: ${col_name} (${doc_count} docs)" \
                || warn "Failed to restore: ${col_name}"
            fi
          else
            info "Skipped empty collection: ${col_name}"
          fi
        done
      else
        fail "No MongoDB shell found (mongosh/mongo)"
      fi
    else
      warn "No database backup found in archive"
    fi
  fi

  # ─── Restore Config ───────────────────────────────────────
  if $do_conf; then
    step "Restoring Configuration"

    if [[ -f "$DATA_DIR/config/backend.env" ]]; then
      # Preserve current MONGO_URL (might be different on new server)
      local current_mongo=$(grep "^MONGO_URL=" "${INSTALL_DIR}/backend/.env" 2>/dev/null)

      cp "$DATA_DIR/config/backend.env" "${INSTALL_DIR}/backend/.env"

      # If user wants to keep local MongoDB URL
      if [[ -n "$current_mongo" ]]; then
        echo ""
        info "Backup has MongoDB URL: $(grep '^MONGO_URL=' "$DATA_DIR/config/backend.env" | cut -d= -f2-)"
        info "Current server has:     $(echo "$current_mongo" | cut -d= -f2-)"
        confirm "Keep current server's MongoDB URL? Y/n" "Y" && {
          sed -i "s|^MONGO_URL=.*|${current_mongo}|" "${INSTALL_DIR}/backend/.env"
          success "Kept current MongoDB URL"
        }
      fi

      success "Backend .env restored"
    else
      warn "No backend .env found in backup"
    fi

    if [[ -f "$DATA_DIR/config/frontend.env" ]]; then
      cp "$DATA_DIR/config/frontend.env" "${INSTALL_DIR}/frontend/.env"
      success "Frontend .env restored"

      # Rebuild frontend with new config
      info "Rebuilding frontend with restored config..."
      cd "${INSTALL_DIR}/frontend"
      yarn build 2>/dev/null || yarn build || warn "Frontend build failed"
      success "Frontend rebuilt"
    fi
  fi

  # ─── Restart ──────────────────────────────────────────────
  info "Starting services..."
  systemctl start ${SERVICE_NAME} 2>/dev/null
  sleep 2
  systemctl reload nginx 2>/dev/null

  # Cleanup
  rm -rf "$EXTRACT_DIR"

  echo ""
  draw_line "$G"
  echo -e "  ${G}${B}Import Complete!${N}"
  draw_line "$G"
  echo ""
  $do_db && echo -e "  ${G}✓${N} Database restored"
  $do_conf && echo -e "  ${G}✓${N} Configuration restored"
  echo ""
  [[ -n "$DOMAIN" ]] && echo -e "  ${B}Site:${N}  ${C}https://${DOMAIN}${N}"
  echo ""
  draw_line "$G"
  echo ""

  pause_menu
}

# ─── Pause ───────────────────────────────────────────────────────────────────
pause_menu() {
  echo ""
  echo -ne "  ${D}Press Enter to return to menu...${N}"
  read -r
}

# ═══════════════════════════════════════════════════════════════════════════════
#  ENTRY POINT
# ═══════════════════════════════════════════════════════════════════════════════
main() {
  require_root
  detect_os

  # Allow CLI arguments for non-interactive use
  case "${1:-}" in
    install)   show_banner; load_config; do_install; exit 0 ;;
    start)     load_config; do_start; exit 0 ;;
    stop)      load_config; do_stop; exit 0 ;;
    restart)   load_config; do_restart; exit 0 ;;
    uninstall) show_banner; load_config; do_uninstall; exit 0 ;;
    status)    load_config; do_status; exit 0 ;;
    logs)      load_config; do_logs; exit 0 ;;
    update)    load_config; do_update; exit 0 ;;
    export)    show_banner; load_config; do_export; exit 0 ;;
    import)    show_banner; load_config; do_import; exit 0 ;;
    telegram)  show_banner; load_config; do_telegram_config; exit 0 ;;
    *)
      # Interactive menu loop
      while true; do
        show_banner
        show_menu
      done
      ;;
  esac
}

main "$@"
