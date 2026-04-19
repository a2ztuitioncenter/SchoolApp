# External Integrations

**Mapped:** 2026-04-19

## Database

- PostgreSQL is the primary integration, accessed through `pg` in `backend/src/config/pool.js`.
- Shared pooled access is attached to each request as `req.db` in `backend/src/server.js`.
- Schema creation and bootstrap logic live in `backend/src/config/database.js` and `init-db.js`.
- Raw SQL is used throughout feature modules rather than an ORM.

## Authentication

- JWT-based authentication is implemented locally, not through a third-party auth provider.
- Token issuing happens in `backend/src/features/auth/authRoutes.js`.
- Token verification and role enforcement live in `backend/src/middleware/auth-middleware.js`.
- Browser clients persist tokens in storage through `frontend/src/core/auth-manager.js`.

## File Uploads

- Local filesystem uploads are handled through `multer` in `backend/src/features/materials/materialsRoutes.js`.
- Uploaded material paths are stored as relative URLs such as `/uploads/materials/...` in `backend/src/features/materials/materialsController.js`.
- Download access is routed through authenticated endpoints under `/api/download` in `backend/src/server.js`.

## Browser-To-API Integration

- Frontend modules call the backend through the shared wrapper in `frontend/src/core/api.js`.
- The wrapper injects the bearer token and normalizes JSON/blob responses.
- The wrapper targets `http://localhost:3000` for local work and `https://schoolapp-d9y5.onrender.com` for non-local browser hosts.

## External Hosting Signals

- `frontend/src/core/api.js` references a deployed Render backend URL.
- `frontend/src/core/api.js` also explicitly allows `.trycloudflare.com` hosts in local URL detection.
- This suggests ad hoc remote preview/tunneling rather than a formal environment matrix.

## Environment-Driven Inputs

- `backend/.env` is expected by both `backend/src/server.js` and `backend/src/config/pool.js`.
- `DATABASE_URL`, `JWT_SECRET`, and admin bootstrap variables are hard requirements.
- Missing env vars cause startup failures rather than graceful warnings.

## What Was Not Found

- No third-party email provider integration.
- No payment gateway integration.
- No external object storage integration; uploads remain local.
- No webhook handlers or inbound event processors were found.
- No Sentry/log aggregation/observability integration was found.
# External Integrations

**Analysis Date:** 2026-04-19

## APIs & External Services

**Backend API Consumption:**
- Tuition App backend API - Browser clients call JSON and blob endpoints through `frontend/src/core/api.js`
  - SDK/Client: native `fetch` wrapper in `frontend/src/core/api.js`
  - Auth: Bearer JWT taken from `sessionStorage` / `localStorage` in `frontend/src/core/api.js`
- Tuition App backend API direct fetches - Admin approval and class assignment UI bypasses the shared API wrapper in `frontend/src/modules/admin/admin-dashboard.js` and `frontend/src/modules/admin/admin-pending-approvals.js`
  - SDK/Client: native `fetch`
  - Auth: `Authorization: Bearer <token>` header

**Third-party CDN Assets:**
- Google Fonts - Typography loaded in `frontend/index.html`, `frontend/admin-dashboard.html`, `frontend/student-dashboard.html`, `frontend/teacher-dashboard.html`, and `frontend/src/assets/css/*.css`
  - SDK/Client: stylesheet links / CSS `@import`
  - Auth: None
- Font Awesome CDN - Icon fonts loaded in `frontend/index.html`, `frontend/admin-dashboard.html`, `frontend/student-dashboard.html`, and `frontend/teacher-dashboard.html`
  - SDK/Client: CDN stylesheet links
  - Auth: None
- Chart.js and `chartjs-plugin-datalabels` - Admin analytics visualizations loaded from CDN in `frontend/admin-dashboard.html`
  - SDK/Client: script tags
  - Auth: None

## Data Storage

**Databases:**
- PostgreSQL
  - Connection: `DATABASE_URL`
  - Client: `pg` pool in `backend/src/config/pool.js`
- Schema initialization and migrations are executed from `init-db.js`, `backend/src/config/database.js`, and `backend/migrations/add_username_column.js` / `backend/migrations/add_uploaded_by_id_to_materials.js`

**File Storage:**
- Local filesystem only
  - Upload directories are created in `backend/src/server.js`
  - Uploaded files are written under `backend/uploads/materials`, `backend/uploads/homework`, and `backend/uploads/notifications` by Multer configs in `backend/src/features/materials/materialsRoutes.js`, `backend/src/features/homework/homeworkRoutes.js`, `backend/src/features/notifications/notificationsRoutes.js`, and `backend/src/features/teacher/teacherRoutes.js`
  - Downloads are served from the local uploads tree by `backend/src/features/download/downloadController.js`

**Caching:**
- None detected
- Frontend responses are explicitly served with no-cache headers in `frontend/server.ts`

## Authentication & Identity

**Auth Provider:**
- Custom
  - Implementation: JWT-based auth using `jsonwebtoken` in `backend/src/features/auth/authRoutes.js`, `backend/src/features/auth/authController.js`, and `backend/src/middleware/auth-middleware.js`
  - Credential verification uses `bcryptjs` in `backend/src/features/auth/authRoutes.js` and `backend/src/config/database.js`
  - User and role data are stored in PostgreSQL tables created by `init-db.js` and `backend/src/config/database.js`

## Monitoring & Observability

**Error Tracking:**
- None detected

**Logs:**
- Console logging only
- Request/security logs are emitted by `backend/src/middleware/auth-middleware.js`
- Startup, DB health, and route logs are emitted by `backend/src/server.js`
- Script-level operational logs are emitted by `init-db.js`, `backend/scripts/export-database.js`, and `test-materials-api.js`

## CI/CD & Deployment

**Hosting:**
- Backend production target appears to be Render, based on the hardcoded API base URL in `frontend/src/core/api.js`, `frontend/src/modules/admin/admin-dashboard.js`, and `frontend/src/modules/admin/admin-pending-approvals.js`
- Frontend can run from the same Express process in `backend/src/server.js` or the separate Bun server in `frontend/server.ts`

**CI Pipeline:**
- None detected in the repository root

## Environment Configuration

**Required env vars:**
- `DATABASE_URL` - Required by `backend/src/config/pool.js`, `init-db.js`, `backend/scripts/export-database.js`, and `backend/migrations/*.js`
- `JWT_SECRET` - Required by `backend/src/features/auth/authRoutes.js` and `backend/src/middleware/auth-middleware.js`; optional fallback exists only in `backend/src/features/auth/authController.js`
- `PORT` - Used by `backend/src/server.js` and `frontend/server.ts`
- `INITIALIZE_DB` - Controls bootstrap behavior in `backend/src/server.js`
- `ADMIN_PHONE`, `ADMIN_PASSWORD`, `ADMIN_USERNAME` - Required for default admin seeding in `backend/src/config/database.js`
- `NODE_ENV` - Controls SSL behavior in `backend/src/config/pool.js` and migration scripts under `backend/migrations/`

**Secrets location:**
- Backend secrets are expected in `backend/.env`; the file contents were not read

## Webhooks & Callbacks

**Incoming:**
- None detected

**Outgoing:**
- None detected

---

*Integration audit: 2026-04-19*
