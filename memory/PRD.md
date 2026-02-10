# khalilv2.com DNS Management Platform - PRD

## Problem Statement
Build a beautiful bilingual (FA/EN) DNS management website for khalilv2.com where users can create accounts, manage free A/AAAA/CNAME records (2 free, paid plans for more). Admin panel for full user/record/settings management.

## Architecture
- **Backend**: FastAPI + MongoDB + Cloudflare API (httpx)
- **Frontend**: React + Shadcn UI + Tailwind CSS
- **Auth**: JWT (email/password) with bcrypt + role-based (user/admin)
- **DNS**: Real Cloudflare API integration
- **i18n**: Persian (RTL) + English (LTR)
- **Theme**: Dark/Light with persistence

## What's Been Implemented
### Phase 1 (Feb 10, 2026) - MVP
- Full JWT auth system (register/login/me) with role field
- Real Cloudflare DNS management (create/read/update/delete)
- Landing page with hero, features, pricing sections
- User dashboard with stats, record table, CRUD dialogs
- Bilingual support (Vazirmatn font for Persian)
- Dark/Light theme with persistence
- Record limit enforcement (2 free)

### Phase 2 (Feb 10, 2026) - Admin Panel
- Admin panel with 3 tabs: Users, Records, Settings
- User management: list, delete users, upgrade/downgrade plans
- Record management: view all records, create for users, delete any
- Settings: Configurable Telegram ID/URL and contact messages
- Pricing buttons link to Telegram for paid plans
- Admin role protection (403 for non-admins)
- Admin user seeded on startup (admin@khalilv2.com)
- Navbar shows Admin Panel link for admin users only

## Prioritized Backlog
### P0
- Payment integration (Stripe) for plan upgrades
### P1
- Email verification, password reset
- User search/filter in admin
### P2
- MX, TXT record support
- Usage analytics dashboard
- API key management
