# Codebase Architecture

**Mapped:** 2026-04-19

## Overall Shape

- The application is a two-part web app: Express API backend plus static HTML/JS frontend.
- Backend entry point is `backend/src/server.js`.
- Frontend pages are served statically from `frontend/` by the backend, with an alternate Bun file server in `frontend/server.ts`.

## Backend Pattern

- Feature-oriented folders under `backend/src/features/` group routes, controllers, and model/schema logic.
- Route registration is centralized in `backend/src/server.js`.
- Most feature logic uses direct SQL queries through `req.db` instead of service/repository layers.
- Model files such as `backend/src/features/materials/Material.js` mostly export schema strings, not rich domain models.

## Request Flow

1. Request enters Express in `backend/src/server.js`.
2. Security middleware runs first from `backend/src/middleware/auth-middleware.js`.
3. Shared DB pool is attached as `req.db`.
4. Role-gated routers handle feature-specific endpoints.
5. Controllers run SQL directly and return JSON payloads.

## Frontend Pattern

- Pages such as `frontend/admin-dashboard.html` and `frontend/teacher-dashboard.html` load page-specific JS modules.
- Shared browser concerns live in `frontend/src/core/`.
- Feature modules under `frontend/src/modules/` call API helpers in `frontend/src/core/api.js`.
- There is no client-side router; navigation is page-based.

## Main Domains

- Auth: `backend/src/features/auth/`
- Student data and dashboards: `backend/src/features/student/`
- Teacher workflows: `backend/src/features/teacher/`
- Admin operations: `backend/src/features/admin/`
- Attendance, homework, fees, materials, notifications, results, downloads: separate feature folders in `backend/src/features/`

## Data Flow

- Browser stores auth state locally through `frontend/src/core/auth-manager.js`.
- Frontend sends bearer tokens through `frontend/src/core/api.js`.
- Backend validates JWT and role before routing in `backend/src/middleware/auth-middleware.js`.
- Controllers query PostgreSQL and return JSON, or local file downloads for uploaded assets.

## Entry Points

- Root browser entry: `frontend/index.html`
- Backend runtime entry: `backend/src/server.js`
- Alternative frontend static server: `frontend/server.ts`
- Database bootstrap: `init-db.js`

## Architectural Tension

- Some modules are duplicated with Windows-style path artifacts, including `backend\src\server.js` and duplicated materials files.
- The backend imports both `cors` and custom middleware, but only custom CORS is used.
- There is no clear service layer, so route/controller files carry HTTP, validation, and data concerns together.
