<div align="center">

<br>

```
 ██████╗ ██████╗ ███╗   ██╗███████╗    ██████╗ ███╗   ██╗███████╗
██╔════╝██╔═══██╗████╗  ██║██╔════╝    ██╔══██╗████╗  ██║██╔════╝
██║     ██║   ██║██╔██╗ ██║█████╗      ██║  ██║██╔██╗ ██║███████╗
██║     ██║   ██║██║╚██╗██║██╔══╝      ██║  ██║██║╚██╗██║╚════██║
╚██████╗╚██████╔╝██║ ╚████║██║         ██████╔╝██║ ╚████║███████║
 ╚═════╝ ╚═════╝ ╚═╝  ╚═══╝╚═╝         ╚═════╝ ╚═╝  ╚═══╝╚══════╝
```

<br>

# Free DNS Management Platform

**Free subdomains for everyone — install once, run on your own domain**

[![FastAPI](https://img.shields.io/badge/FastAPI-009688?style=for-the-badge&logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com/)
[![React](https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)](https://reactjs.org/)
[![MongoDB](https://img.shields.io/badge/MongoDB-47A248?style=for-the-badge&logo=mongodb&logoColor=white)](https://www.mongodb.com/)
[![Cloudflare](https://img.shields.io/badge/Cloudflare-F38020?style=for-the-badge&logo=cloudflare&logoColor=white)](https://www.cloudflare.com/)
[![Nginx](https://img.shields.io/badge/Nginx-009639?style=for-the-badge&logo=nginx&logoColor=white)](https://nginx.org/)
[![Let's Encrypt](https://img.shields.io/badge/Let's_Encrypt-003A70?style=for-the-badge&logo=letsencrypt&logoColor=white)](https://letsencrypt.org/)

<br>

[Quick Install](#-quick-install) •
[Features](#-features) •
[Configuration](#%EF%B8%8F-configuration) •
[API Docs](#-api-documentation) •
[فارسی](README.fa.md)

<br>

</div>

---

<br>

## 🌐 About

A fully **open-source DNS management platform** that works with your own domain. Users can create **A**, **AAAA**, **CNAME**, and **NS** records for free. Records are applied directly to real DNS via the **Cloudflare API**.

> **Example:** If your domain is `example.com`, users can create subdomains like `mysite.example.com`.

<br>

## ✨ Features

<table>
<tr>
<td width="50%">

### 👤 Users
- Register & login with email and password
- **Sign in with Google** (OAuth) — one-click login
- **Forgot Password** flow with 6-digit email code (requires SMTP)
- Email verification with 6-digit code (optional, admin-configurable)
- Create A, AAAA, CNAME, NS records
- Free records per user (configurable via Free plan limit)
- Edit and delete records
- **Bulk CSV Import / Export** of personal records
- Referral system — earn bonus records by inviting friends

</td>
<td width="50%">

### 🛡 Admin Panel
- Full user management (delete / change plan / reset password)
- View and manage all DNS records
- **Bulk CSV Export** of every user's records
- **Bulk CSV Import** of records on behalf of users (with per-user limit + zone enforcement)
- Plan management (create / edit / delete)
- **Multi-zone Cloudflare support** with per-zone enable/disable toggle
- **Google OAuth configuration** directly from the admin panel
- **Email-signup form toggle** — disable email registration globally (Google-only mode)
- Site settings (Telegram contact, referral bonus, email verification)
- SMTP configuration for email verification & password reset
- Cloudflare API token management & live test
- Bulk actions (batch plan change, batch delete)
- Activity logs with filters
- Automated MongoDB backup scheduler

</td>
</tr>
<tr>
<td width="50%">

### 🤖 Telegram Bot
- Full DNS management via Telegram
- User registration and login
- Create, edit, delete records
- **Multi-zone selection** when adding a record (filters disabled zones automatically)
- View record list and account info
- Admin notifications for new registrations
- Configurable from admin web panel (token, admin chat ID, start/stop)
- Bilingual support (FA/EN)

</td>
<td width="50%">

### 🎨 Design & Technical
- **Terminal-aesthetic UI** with bright emerald accent
- **Bilingual**: Persian (RTL) and English — true RTL support
- Dark and light themes (light by default)
- Responsive design with Shadcn UI
- JWT authentication + Google OAuth
- Direct Cloudflare API integration
- MongoDB database with automatic backups
- **Fully dynamic domain name** (brand = install domain; zone refs = Cloudflare zone)
- Single-source-of-truth plan limits (Free plan defines free record count)
- Automated install with Bash script
- Free SSL with Let's Encrypt
- `ddns-menu` command for quick server management

</td>
</tr>
</table>

<br>

## 🏗 Architecture

```
                    ┌─────────────────────────────────────────┐
                    │              Nginx (443/80)              │
                    │         SSL + Reverse Proxy              │
                    └──────────┬───────────────┬──────────────┘
                               │               │
                    ┌──────────▼──────┐ ┌──────▼──────────────┐
                    │   React SPA     │ │   FastAPI Backend    │
                    │   (Build)       │ │   Port 8001          │
                    │                 │ │                      │
                    │  • Landing Page │ │  • /api/auth/*       │
                    │  • Dashboard    │ │  • /api/dns/*        │
                    │  • Admin Panel  │ │  • /api/admin/*      │
                    │  • Auth Pages   │ │  • /api/referral/*   │
                    │  • i18n (FA/EN) │ │  • /api/plans        │
                    └─────────────────┘ │  • /api/telegram/*   │
                                        └───────┬──────┬───────┘
                                                │      │
                                     ┌──────────▼──┐ ┌─▼────────────┐
                                     │  MongoDB    │ │  Cloudflare  │
                                     │  Database   │ │  DNS API     │
                                     └─────────────┘ └──────────────┘
```

<br>

## 🚀 Quick Install

### Prerequisites

| Software | Version | Notes |
|----------|---------|-------|
| Ubuntu / Debian | 20.04+ / 11+ | OS |
| Root access | — | Required for service installation |
| Domain | — | Must point to server IP |
| Cloudflare | — | API Token + Zone ID |

### One-line Install

```bash
bash <(curl -fsSL https://raw.githubusercontent.com/admin6501/ddns-khalilv2/main/install.sh)
```

Or:

```bash
git clone https://github.com/admin6501/ddns-khalilv2.git
cd ddns-khalilv2
sudo bash install.sh
```

The installer will ask for:

| Question | Example | Description |
|----------|---------|-------------|
| Domain name | `yourdomain.com` | Domain for subdomains |
| SSL email | `you@email.com` | For Let's Encrypt |
| Cloudflare API Token | — | [Create token](https://dash.cloudflare.com/profile/api-tokens) (Edit DNS access) |
| Cloudflare Zone ID | — | From domain Overview dashboard |
| Admin email | `admin@yourdomain.com` | Admin panel login |
| Admin password | — | Min 6 characters |
| MongoDB URL | `mongodb://localhost:27017` | Default: local |
| Database name | `dns_management` | Your choice |

### Management Menu

After installation, access the management menu anytime:

```bash
sudo ddns-menu
```

```
  1 )  Install          Full installation from scratch
  2 )  Start            Start all services
  3 )  Stop             Stop all services
  4 )  Restart          Restart services
  5 )  Uninstall        Full removal (service + database + SSL + files)
  6 )  Status           Service status + RAM usage + SSL expiry
  7 )  Logs             View backend logs
  8 )  Update           Update from GitHub + rebuild
  9 )  SSL Renew        Renew SSL certificate
  t )  Telegram Bot     Configure Telegram bot
  d )  Change Domain    Change domain name
  e )  Export           Backup for server migration
  i )  Import           Restore from backup
```

CLI commands also available:

```bash
sudo bash install.sh start
sudo bash install.sh stop
sudo bash install.sh restart
sudo bash install.sh update
sudo bash install.sh status
sudo bash install.sh export
sudo bash install.sh import
```

<br>

## 🔄 Server Migration

To migrate your site to a new server **without losing data**:

**1. On old server — create backup:**

```bash
sudo bash install.sh export
```

**2. Transfer backup file to new server:**

```bash
scp ~/ddns-backup-*.tar.gz root@NEW_SERVER_IP:~/
```

**3. On new server — install:**

```bash
sudo bash install.sh
# Select option 1 (Install)
# Enter domain and Cloudflare credentials
```

**4. On new server — restore backup:**

```bash
sudo bash install.sh import
# Enter the backup file path
```

During import you can choose:
- **Database + Config** — Full restore (recommended)
- **Database only** — Keep current config
- **Config only** — Keep current database

> **Note:** Update your domain's DNS to point to the new server IP and renew SSL (`sudo ddns-menu` → option 9)

<br>

## ⚙️ Configuration

### Dynamic Domain Name

The domain name is **not hardcoded** and is read from environment variables. When you install with `install.sh`, the domain you enter is automatically displayed throughout the site.

| Variable | File | Description |
|----------|------|-------------|
| `DOMAIN_NAME` | `backend/.env` | Backend domain name |
| `REACT_APP_DOMAIN_NAME` | `frontend/.env` | Frontend domain name |

### Environment Files

<details>
<summary><b>backend/.env</b></summary>

```env
MONGO_URL=mongodb://localhost:27017
DB_NAME=dns_management
CLOUDFLARE_API_TOKEN=your_token_here
CLOUDFLARE_ZONE_ID=your_zone_id_here
JWT_SECRET=auto_generated_on_install
DOMAIN_NAME=yourdomain.com
ADMIN_EMAIL=admin@yourdomain.com
ADMIN_PASSWORD=your_password
TELEGRAM_BOT_TOKEN=your_bot_token (optional)
TELEGRAM_ADMIN_ID=your_telegram_id (optional)
SMTP_EMAIL=your_gmail@gmail.com (optional)
SMTP_PASSWORD=your_app_password (optional)
```
</details>

<details>
<summary><b>frontend/.env</b></summary>

```env
REACT_APP_BACKEND_URL=https://yourdomain.com
REACT_APP_DOMAIN_NAME=yourdomain.com
```
</details>

<br>

## 🔐 Google OAuth Setup (Optional)

The platform supports **Sign in with Google** for one-click registration and login. To enable it, you need a **Google OAuth Client ID and Client Secret** from Google Cloud Console.

### Step 1 — Create a Google Cloud Project

1. Visit [console.cloud.google.com](https://console.cloud.google.com/)
2. Click **Select a project** → **New Project**
3. Give it a name (e.g. `dns-management`) and click **Create**

### Step 2 — Configure the OAuth Consent Screen

1. In the left menu go to **APIs & Services** → **OAuth consent screen**
2. Choose **External** user type → **Create**
3. Fill in:
   - **App name**: your site name (e.g. `yourdomain.com`)
   - **User support email**: your email
   - **Developer contact email**: your email
4. Add scopes: **email** and **profile** (they are usually pre-selected)
5. Save and continue until finished

### Step 3 — Create OAuth Credentials

1. Go to **APIs & Services** → **Credentials**
2. Click **+ Create Credentials** → **OAuth client ID**
3. Application type: **Web application**
4. **Authorized JavaScript origins**:
   ```
   https://yourdomain.com
   ```
5. **Authorized redirect URIs**:
   ```
   https://yourdomain.com
   https://yourdomain.com/login
   https://yourdomain.com/register
   ```
6. Click **Create**

Google will show you the **Client ID** and **Client Secret**. Copy both.

### Step 4 — Add Credentials to the Admin Panel

1. Log in to your site as admin
2. Go to **Admin Panel** → **Settings** tab → **Google OAuth** card
3. Paste your **Client ID** and **Client Secret**
4. Toggle **Enabled** on and save

The "Continue with Google" button will automatically appear on login and registration pages.

> **Tip:** For local development use `http://localhost:3000` instead of your production URL in both the origins and redirect URIs.

<br>

## 📧 SMTP Setup (Optional)

SMTP is required for **Forgot Password** and optional **Email Verification** features.

1. Go to **Admin Panel** → **Settings** → **SMTP Configuration**
2. For Gmail:
   - **SMTP Email**: `you@gmail.com`
   - **SMTP Password**: a [Gmail App Password](https://myaccount.google.com/apppasswords) (not your regular password)
3. Save and test

Without SMTP configured, the "Forgot Password" page shows a graceful "Reset unavailable" message.

<br>

## 📡 API Documentation

All API routes are prefixed with `/api`.

### Authentication

| Method | Path | Description | Auth |
|--------|------|-------------|------|
| `POST` | `/api/auth/register` | Register (with optional referral code) | — |
| `POST` | `/api/auth/login` | Login | — |
| `GET` | `/api/auth/me` | Current user info | Bearer Token |
| `POST` | `/api/auth/verify-email` | Verify email with code | — |
| `POST` | `/api/auth/resend-code` | Resend verification code | — |
| `GET` | `/api/auth/verification-status` | Check if verification is enabled | — |
| `GET` | `/api/auth/signup-status` | Whether the email signup form is enabled | — |
| `GET` | `/api/auth/password-reset-status` | Whether forgot-password is available (SMTP) | — |
| `POST` | `/api/auth/forgot-password` | Request a 6-digit password reset code | — |
| `POST` | `/api/auth/reset-password` | Set a new password using the reset code | — |
| `GET` | `/api/auth/google/config` | Public Google OAuth config (enabled, client_id) | — |
| `POST` | `/api/auth/google` | Exchange a Google ID token for a session | — |
| `POST` | `/api/auth/set-initial-password` | Set a local password for Google-registered users | Bearer Token |

### DNS Records

| Method | Path | Description | Auth |
|--------|------|-------------|------|
| `GET` | `/api/dns/records` | User's records list | Bearer Token |
| `POST` | `/api/dns/records` | Create new record | Bearer Token |
| `PUT` | `/api/dns/records/{id}` | Edit record | Bearer Token |
| `DELETE` | `/api/dns/records/{id}` | Delete record | Bearer Token |
| `GET` | `/api/dns/zones` | List enabled zones available for selection | Bearer Token |
| `GET` | `/api/dns/records/export` | Export user's records as CSV | Bearer Token |
| `POST` | `/api/dns/records/import` | Bulk import records from CSV | Bearer Token |
| `GET` | `/api/dns/records/import/template` | Download CSV template | Bearer Token |

### Referral

| Method | Path | Description | Auth |
|--------|------|-------------|------|
| `GET` | `/api/referral/stats` | Invitation stats | Bearer Token |

### Plans & Public Config

| Method | Path | Description | Auth |
|--------|------|-------------|------|
| `GET` | `/api/plans` | Plans list | — |
| `GET` | `/api/config` | Site config (domain, contact) | — |
| `GET` | `/api/settings/contact` | Telegram contact info | — |

### Admin Panel

<details>
<summary><b>User Management</b></summary>

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/admin/users` | All users list |
| `DELETE` | `/api/admin/users/{id}` | Delete user |
| `PUT` | `/api/admin/users/{id}/plan` | Change user plan |
| `PUT` | `/api/admin/users/{id}/password` | Change user password |
| `GET` | `/api/admin/users/{id}/records` | User's records |
| `POST` | `/api/admin/users/bulk/plan` | Bulk plan change |
| `POST` | `/api/admin/users/bulk/delete` | Bulk delete |

</details>

<details>
<summary><b>Record Management</b></summary>

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/admin/records` | All records list |
| `GET` | `/api/admin/records/export` | Export ALL records as CSV (with user_email column) |
| `GET` | `/api/admin/records/import/template` | Download admin CSV template |
| `POST` | `/api/admin/records/import` | Bulk import records on behalf of users (CSV with user_email column) |
| `POST` | `/api/admin/dns/records` | Create record for user |
| `DELETE` | `/api/admin/dns/records/{id}` | Delete any record |

</details>

<details>
<summary><b>Cloudflare Zones Management</b></summary>

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/admin/zones` | List all zones (primary + additional) with enable/disable status |
| `POST` | `/api/admin/zones` | Add an additional Cloudflare zone (validated against Cloudflare) |
| `PATCH` | `/api/admin/zones/{zone_id}` | Toggle zone enabled/disabled (also for primary) |
| `DELETE` | `/api/admin/zones/{zone_id}` | Remove an additional zone |

> Disabled zones are hidden from record-creation pickers (web + Telegram) and reject new record creation.

</details>

<details>
<summary><b>Telegram Bot Control</b></summary>

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/admin/bot/status` | Get bot status (token masked, running, username) |
| `PUT` | `/api/admin/bot/token` | Update bot token (auto-restart) |
| `PUT` | `/api/admin/bot/admin-id` | Set admin chat ID |
| `POST` | `/api/admin/bot/start` | Start (or restart) the bot |
| `POST` | `/api/admin/bot/stop` | Stop the bot |

</details>

<details>
<summary><b>SMTP & Cloudflare Token</b></summary>

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/admin/smtp/status` | SMTP & verification status |
| `PUT` | `/api/admin/smtp/config` | Update SMTP credentials |
| `PUT` | `/api/admin/smtp/toggle-verification` | Toggle email verification on/off |
| `GET` | `/api/admin/cf-token` | Cloudflare token info (masked) |
| `PUT` | `/api/admin/cf-token` | Update primary Cloudflare token |
| `POST` | `/api/admin/cf-token/test` | Live-test the Cloudflare token |

</details>

<details>
<summary><b>Google OAuth & Auth Controls</b></summary>

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/admin/google-oauth` | Get Google OAuth config (client_id masked) |
| `PUT` | `/api/admin/google-oauth` | Update Google Client ID / Client Secret / enabled |
| `GET` | `/api/admin/auth/signup-status` | Whether email signup form is enabled |
| `PUT` | `/api/admin/auth/toggle-email-signup` | Enable / disable email-and-password signup site-wide |

</details>

<details>
<summary><b>Backup</b></summary>

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/admin/backup/settings` | Get backup schedule |
| `PUT` | `/api/admin/backup/settings` | Update backup schedule |
| `POST` | `/api/admin/backup/run` | Trigger an immediate backup |

</details>

<details>
<summary><b>Plan Management</b></summary>

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/admin/plans` | Plans list |
| `POST` | `/api/admin/plans` | Create new plan |
| `PUT` | `/api/admin/plans/{plan_id}` | Edit plan |
| `DELETE` | `/api/admin/plans/{plan_id}` | Delete plan |

</details>

<details>
<summary><b>Site Settings</b></summary>

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/admin/settings` | Get settings |
| `PUT` | `/api/admin/settings` | Update settings |

</details>

<br>

## 📁 Project Structure

```
├── install.sh                    # Install & management script
├── README.md                     # English documentation
├── README.fa.md                  # Persian documentation
│
├── backend/
│   ├── server.py                 # FastAPI server (all APIs + Telegram bot)
│   ├── requirements.txt          # Python dependencies
│   └── .env                      # Environment variables
│
└── frontend/
    ├── package.json
    ├── tailwind.config.js
    ├── public/
    │   └── index.html
    └── src/
        ├── App.js                # Main routing
        ├── index.css             # Styles & themes
        ├── config/
        │   └── site.js           # Domain config (dynamic from env var)
        ├── lib/
        │   ├── api.js            # API client
        │   └── i18n.js           # Translations (FA/EN)
        ├── contexts/
        │   ├── AuthContext.js     # Auth management
        │   ├── ConfigContext.js   # Site config
        │   ├── ThemeContext.js    # Theme management (dark/light)
        │   └── LanguageContext.js # Language management
        ├── pages/
        │   ├── Landing.js         # Landing page (terminal aesthetic)
        │   ├── Login.js           # Login + Google OAuth
        │   ├── Register.js        # Registration + Google-only fallback
        │   ├── ForgotPassword.js  # Password reset wizard (SMTP-aware)
        │   ├── Dashboard.js       # User dashboard
        │   └── Admin.js           # Admin panel
        └── components/
            ├── Navbar.js              # Navigation bar
            ├── GoogleLoginButton.js   # Google OAuth button
            ├── SecurePasswordInit.js  # First-login password setup (Google users)
            └── ui/                    # Shadcn UI components
```

<br>

## 🎯 Plan System

Plans are manageable from the admin panel (create / edit / delete):

| Plan | Records | Price | Description |
|------|---------|-------|-------------|
| Free | 2 | $0 | Default for all users |
| Pro | 50 | $5/mo | Telegram contact button |
| Enterprise | 500 | $20/mo | Telegram contact button |

> Paid plan buttons link to admin's Telegram profile. Telegram ID is configurable from admin settings.

<br>

## 🤝 Referral System

```
                Invite link
  User A  ─────────────────►  User B registers
     │                                │
     │◄─────── +N bonus records ──────┘
     │
  N is configurable from admin panel
```

- Each user has a **unique invite code**
- Invite link: `https://yourdomain.com/register?ref=CODE`
- For each successful invite, the inviter gets **N bonus records**
- N is configurable from **admin panel settings**

<br>

## 🛠 Local Development

### Backend

```bash
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
# Configure .env variables
uvicorn server:app --host 0.0.0.0 --port 8001 --reload
```

### Frontend

```bash
cd frontend
# Configure .env variables
yarn install
yarn start
```

<br>

## 🔧 Troubleshooting

<details>
<summary><b>Backend won't start</b></summary>

```bash
# Check logs
journalctl -u ddns-backend -f

# Check MongoDB
systemctl status mongod

# Check .env
cat /path/to/install/backend/.env
```
</details>

<details>
<summary><b>/admin path redirects to homepage</b></summary>

Restart nginx or rebuild:
```bash
sudo ddns-menu
# Select option 4 (Restart)
```

Cause: After SSL installation by Certbot, `try_files` in Nginx config may break.
</details>

<details>
<summary><b>SSL won't install</b></summary>

1. Make sure your domain points to the server IP:
```bash
dig +short yourdomain.com
```

2. Test manually:
```bash
sudo certbot --nginx -d yourdomain.com --non-interactive --agree-tos -m your@email.com
```
</details>

<details>
<summary><b>DNS record creation fails</b></summary>

- Verify Cloudflare API Token has **Edit DNS** permission
- Verify Zone ID is correct
- Subdomain name must not be duplicate
</details>

<br>

## 🔒 Security

- Passwords hashed with **bcrypt**
- Authentication with **JWT** (72-hour expiry)
- Admin panel restricted to `admin` role only
- CORS limited to site domain
- Nginx security headers (X-Frame-Options, X-Content-Type-Options)
- SSL/TLS with Let's Encrypt
- Optional email verification for new registrations

<br>

## 📄 License

This project is released under the [MIT](LICENSE) license.

<br>

---

<div align="center">

If this project helped you, give it a star ⭐

</div>
