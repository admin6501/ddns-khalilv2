# khalilv2.com DNS Management Platform - PRD

## Architecture
- **Backend**: FastAPI + MongoDB + Cloudflare API
- **Frontend**: React + Shadcn UI + Tailwind CSS
- **Auth**: JWT + role-based (user/admin)

## Implemented Features
### Phase 1: MVP - Auth, DNS CRUD, Landing, Dashboard, Bilingual (FA/EN), Dark/Light
### Phase 2: Admin Panel - User mgmt, Records mgmt, Settings (Telegram)
### Phase 3: Password Change + Plans CRUD (dynamic from MongoDB)
### Phase 4: Bulk Actions (Feb 10, 2026)
- Checkboxes on user rows (admin excluded from selection)
- Select All / deselect all
- Bulk action bar: Change Plan (all at once), Delete Selected
- Backend: POST /api/admin/users/bulk/plan, POST /api/admin/users/bulk/delete
- Both endpoints skip admin users for safety

## Admin: admin@khalilv2.com / admin123456

## Backlog: P0: Stripe, P1: Email verification, password reset, P2: MX/TXT, analytics
