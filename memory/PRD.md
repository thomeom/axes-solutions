"# Axes Solutions — PRD

## Original problem statement
Diploma project for the outsourcing company \"Axes Solutions\" providing HR, IT, accounting and legal specialists on demand. Pages: Home, Services, About, Requests, Contacts, Reviews, plus admin panel. Stack must be vanilla HTML/CSS/JS + Node/FastAPI + SQL.

## Architecture (chosen)
- **Frontend:** Pure static HTML/CSS/JS in `/app/frontend/public/` served by `http-server` on port 3000.
- **Backend:** FastAPI on port 8001 with SQLAlchemy + SQLite (`/app/backend/axes.db`). All routes prefixed `/api`.
- **Auth:** JWT via `python-jose`, bcrypt password hashing.
- **i18n:** RU/KZ/EN dictionaries in `js/i18n.js`, persisted in `localStorage` (`ax.lang`).
- **Theming:** `data-theme=\"dark|light\"` on `<html>`, persisted in `localStorage` (`ax.theme`).

## User personas
- **Visitor / Prospect** — browses services, submits a request, leaves a review.
- **Admin (HR ops at Axes Solutions)** — logs in, manages requests (status / delete), moderates reviews (approve / delete).

## Core requirements (static)
- Hero with slogan \"Время невосполнимо.\"
- 4 service cards (HR, IT, Accounting, Legal)
- Public request form persisted to SQLite
- Reviews page reads from DB, public submission (pending moderation)
- Admin dashboard (Login → Requests + Reviews tabs)
- Light/Dark theme toggle in header
- Multilingual UI (RU/KZ/EN)
- Responsive, modern corporate-SaaS look (indigo / purple / deep-blue)

## Implemented (Feb 2026)
- **Backend** (`server.py`): SQLAlchemy models `User`, `ServiceRequest`, `Review`; auto-seeded admin + 3 approved reviews; endpoints for auth, requests CRUD, reviews CRUD/moderation.
- **Frontend pages**: `index.html`, `services.html`, `about.html`, `requests.html`, `contacts.html`, `reviews.html`, `login.html`, `admin.html`.
- **Shared assets**: `css/style.css`, `js/app.js`, `js/i18n.js`, `partials.js`.
- **Tests**: 17/17 backend pytest tests pass; full frontend Playwright walk-through pass.

## Admin credentials
`admin@axessolution.com` / `Admin@123` (auto-seeded on first startup).

## Backlog (next iterations)
- **P1**: Email notification on new request (Resend/SendGrid).
- **P1**: SEO meta + open-graph images, sitemap.xml.
- **P2**: Pagination & search in admin tables.
- **P2**: Rate-limiting / captcha on public POST endpoints.
- **P2**: Request file attachments (object storage).
- **P3**: Charts on admin dashboard (requests per service / month).
"