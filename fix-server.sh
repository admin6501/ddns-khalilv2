#!/usr/bin/env bash
#═══════════════════════════════════════════════════════════════
#  DNS Management Platform - Fix Script
#  1. Removes Emergent traces from built files
#  2. Fixes Nginx config for SPA routing (/admin etc)
#  Run: sudo bash fix-server.sh
#═══════════════════════════════════════════════════════════════
RED='\033[0;31m'; GREEN='\033[0;32m'; CYAN='\033[0;36m'; BOLD='\033[1m'; NC='\033[0m'
info()    { echo -e "${CYAN}[INFO]${NC}  $1"; }
success() { echo -e "${GREEN}[OK]${NC}    $1"; }
warn()    { echo -e "${YELLOW}[WARN]${NC}  $1"; }

if [[ $EUID -ne 0 ]]; then
  echo -e "${RED}Run as root: sudo bash $0${NC}"
  exit 1
fi

# ─── Detect install dir ─────────────────────────────────────
INSTALL_DIR=$(grep "WorkingDirectory" /etc/systemd/system/ddns-backend.service 2>/dev/null | head -1 | cut -d= -f2 | sed 's|/backend||')
INSTALL_DIR="${INSTALL_DIR:-/opt/ddns-khalilv2}"
DOMAIN=$(grep "server_name" /etc/nginx/sites-available/ddns-khalilv2 2>/dev/null | head -1 | awk '{print $2}' | tr -d ';')
DOMAIN="${DOMAIN:-example.com}"

echo ""
echo -e "${BOLD}DNS Management Fix Script${NC}"
echo -e "  Install Dir: ${CYAN}$INSTALL_DIR${NC}"
echo -e "  Domain:      ${CYAN}$DOMAIN${NC}"
echo ""

# ─── Step 1: Clean Emergent from build files ─────────────────
info "Cleaning Emergent traces from built frontend..."

BUILD_DIR="$INSTALL_DIR/frontend/build"

if [[ -f "$BUILD_DIR/index.html" ]]; then
  # Remove the emergent badge (the <a id="emergent-badge"...>...</a> block)
  python3 -c "
import re
with open('$BUILD_DIR/index.html', 'r') as f:
    html = f.read()

# Remove emergent badge link
html = re.sub(r'<a[^>]*id=\"emergent-badge\"[^>]*>.*?</a>', '', html, flags=re.DOTALL)

# Remove emergent script
html = re.sub(r'<script[^>]*emergent-main\.js[^>]*></script>', '', html)

# Remove debug monitor script block
html = re.sub(r'<script>\s*//\s*Only load visual edit.*?</script>', '', html, flags=re.DOTALL)

# Remove posthog analytics
html = re.sub(r'<script>\s*!\(function\s*\(t,\s*e\).*?</script>', '', html, flags=re.DOTALL)

# Fix description meta
html = re.sub(r'content=\"A product of emergent\.sh\"', 'content=\"Free DNS Management on $DOMAIN\"', html)

# Fix title
html = re.sub(r'<title>.*?</title>', '<title>$DOMAIN - DNS Management</title>', html)

with open('$BUILD_DIR/index.html', 'w') as f:
    f.write(html)
print('Done')
" 2>/dev/null && success "Emergent traces removed from build/index.html" || warn "Python cleanup failed, trying sed..."

  # Fallback sed cleanup
  sed -i 's|<script src="https://assets.emergent.sh/scripts/emergent-main.js"></script>||g' "$BUILD_DIR/index.html" 2>/dev/null
  sed -i "s|A product of emergent.sh|Free DNS Management on $DOMAIN|g" "$BUILD_DIR/index.html" 2>/dev/null

  success "Build index.html cleaned"
else
  warn "Build directory not found at $BUILD_DIR"
fi

# Also clean source index.html for future builds
SRC_INDEX="$INSTALL_DIR/frontend/public/index.html"
if [[ -f "$SRC_INDEX" ]]; then
  info "Cleaning source public/index.html..."
  cat > "$SRC_INDEX" << HTMLEOF
<!doctype html>
<html lang="en">
    <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="theme-color" content="#000000" />
        <meta name="description" content="Free DNS Management on ${DOMAIN} - Create A, AAAA, CNAME records for free" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
        <title>${DOMAIN} - DNS Management</title>
    </head>
    <body>
        <noscript>You need to enable JavaScript to run this app.</noscript>
        <div id="root"></div>
    </body>
</html>
HTMLEOF
  success "Source index.html cleaned"
fi

# ─── Step 2: Fix Nginx for SPA routing ──────────────────────
info "Fixing Nginx configuration for SPA routing..."

# Check if SSL is configured (certbot modified the config)
if grep -q "ssl_certificate" /etc/nginx/sites-available/ddns-khalilv2 2>/dev/null; then
  info "SSL detected, creating proper config with SSL..."

  # Extract SSL cert paths from current config
  SSL_CERT=$(grep "ssl_certificate " /etc/nginx/sites-available/ddns-khalilv2 | head -1 | awk '{print $2}' | tr -d ';')
  SSL_KEY=$(grep "ssl_certificate_key" /etc/nginx/sites-available/ddns-khalilv2 | head -1 | awk '{print $2}' | tr -d ';')

  if [[ -z "$SSL_CERT" || -z "$SSL_KEY" ]]; then
    SSL_CERT="/etc/letsencrypt/live/$DOMAIN/fullchain.pem"
    SSL_KEY="/etc/letsencrypt/live/$DOMAIN/privkey.pem"
  fi

  cat > /etc/nginx/sites-available/ddns-khalilv2 << NGXEOF
# HTTP -> HTTPS redirect
server {
    listen 80;
    listen [::]:80;
    server_name $DOMAIN;
    return 301 https://\$host\$request_uri;
}

# HTTPS server
server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name $DOMAIN;

    ssl_certificate $SSL_CERT;
    ssl_certificate_key $SSL_KEY;
    include /etc/letsencrypt/options-ssl-nginx.conf;
    ssl_dhparam /etc/letsencrypt/ssl-dhparams.pem;

    # Frontend
    root $INSTALL_DIR/frontend/build;
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

    # SPA: ALL other routes serve index.html
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

else
  info "No SSL, creating HTTP-only config..."
  cat > /etc/nginx/sites-available/ddns-khalilv2 << NGXEOF
server {
    listen 80;
    listen [::]:80;
    server_name $DOMAIN;

    root $INSTALL_DIR/frontend/build;
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

    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml text/javascript image/svg+xml;
}
NGXEOF
fi

# Ensure symlink
ln -sf /etc/nginx/sites-available/ddns-khalilv2 /etc/nginx/sites-enabled/ 2>/dev/null
rm -f /etc/nginx/sites-enabled/default 2>/dev/null

# Test and reload
if nginx -t 2>&1; then
  success "Nginx config is valid"
  systemctl reload nginx
  success "Nginx reloaded"
else
  echo ""
  nginx -t
  echo ""
  warn "Nginx config has errors. Check above."
fi

# ─── Step 3: Restart backend ────────────────────────────────
info "Restarting backend..."
systemctl restart ddns-backend 2>/dev/null
sleep 2
if systemctl is-active --quiet ddns-backend 2>/dev/null; then
  success "Backend is running"
else
  warn "Backend may not be running. Check: journalctl -u ddns-backend -f"
fi

# ─── Done ────────────────────────────────────────────────────
echo ""
echo -e "${GREEN}═══════════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}  Fix applied successfully!${NC}"
echo -e "${GREEN}═══════════════════════════════════════════════════════════${NC}"
echo ""
echo -e "  Test these URLs:"
echo -e "    https://$DOMAIN          (Landing page)"
echo -e "    https://$DOMAIN/login    (Login page)"
echo -e "    https://$DOMAIN/admin    (Admin panel)"
echo ""
