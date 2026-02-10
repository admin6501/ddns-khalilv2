# khalilv2.com DNS Management Platform - PRD

## Architecture
- **Backend**: FastAPI + MongoDB + Cloudflare API
- **Frontend**: React + Shadcn UI + Tailwind CSS
- **Auth**: JWT + role-based (user/admin)
- **DNS**: Real Cloudflare API
- **i18n**: Persian (RTL) + English, **Theme**: Dark/Light

## What's Been Implemented
### Phase 1 - MVP: Auth, DNS CRUD, Landing, Dashboard, Bilingual, Dark/Light
### Phase 2 - Admin Panel: Users tab (delete/plan change), Records tab, Settings (Telegram)
### Phase 3 - Password Change + Plans CRUD (Feb 10, 2026)
- Admin can change any user's password (key icon in users tab)
- Plans stored in MongoDB with full CRUD (create/edit/delete from admin)
- Landing page loads plans dynamically from DB
- Change plan dialog reads plans from DB
- 4 admin tabs: Users, Records, Plans, Settings

## Admin Credentials
- Email: admin@khalilv2.com / Password: admin123456

## Backlog
### P0: Stripe payment integration
### P1: Email verification, password reset, user search/filter
### P2: MX/TXT records, analytics, API keys
