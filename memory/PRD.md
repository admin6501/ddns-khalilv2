# khalilv2.com DNS Management Platform - PRD

## Problem Statement
Build a beautiful bilingual (FA/EN) DNS management website for khalilv2.com where users can create accounts, manage free A/AAAA/CNAME records (2 free, paid plans for more).

## Architecture
- **Backend**: FastAPI + MongoDB + Cloudflare API (httpx)
- **Frontend**: React + Shadcn UI + Tailwind CSS
- **Auth**: JWT (email/password) with bcrypt
- **DNS**: Real Cloudflare API integration
- **i18n**: Persian (RTL) + English (LTR)
- **Theme**: Dark/Light with persistence

## User Personas
1. **Developer**: Needs free subdomains for side projects
2. **Startup**: Needs multiple DNS records for services
3. **Enterprise**: High-volume DNS management

## Core Requirements
- [x] User registration/login (JWT)
- [x] DNS CRUD (A, AAAA, CNAME) via Cloudflare API
- [x] Free tier: 2 records limit
- [x] Pricing plans display (Free, Pro, Enterprise)
- [x] Bilingual (FA/EN) with RTL support
- [x] Dark/Light theme toggle
- [x] Beautiful landing page with features & pricing
- [x] Responsive dashboard with record management

## What's Been Implemented (Feb 10, 2026)
- Full JWT auth system (register/login/me)
- Real Cloudflare DNS management (create/read/update/delete)
- Landing page with hero, features, pricing sections
- User dashboard with stats, record table, CRUD dialogs
- Bilingual support (Vazirmatn font for Persian)
- Dark/Light theme with persistence
- Record limit enforcement (2 free)
- Glass-morphism navbar with mobile menu

## Prioritized Backlog
### P0
- Payment integration (Stripe) for plan upgrades
### P1
- User profile/settings page
- Email verification on registration
- Password reset flow
### P2
- MX, TXT record support
- Record import/export
- API key management for programmatic access
- Usage analytics dashboard
