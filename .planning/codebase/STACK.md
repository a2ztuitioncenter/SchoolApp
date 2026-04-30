# Codebase Stack

**Mapped:** 2026-04-19
**Project root:** `package.json`

## Runtime

- Root package uses ESM (`"type": "module"`) in `package.json`.
- Backend runs on Node/Bun via `backend/package.json`.
- Frontend local static server uses Bun in `frontend/server.ts`.
- Production-style API server is Express 5 in `backend/src/server.js`.

## Languages

- JavaScript is the primary application language across `backend/src/` and `frontend/src/`.
- TypeScript appears only in `frontend/server.ts`.
- SQL schema/migration assets live in `backend/schema.sql` and `backend/migrations/`.

## Backend Dependencies

- `express` powers HTTP routing in `backend/src/server.js`.
- `pg` is the database driver and pool layer in `backend/src/config/pool.js`.
- `jsonwebtoken` handles auth tokens in `backend/src/features/auth/authRoutes.js`.
- `bcryptjs` hashes passwords in `backend/src/config/database.js` and auth flows.
- `multer` handles file uploads in `backend/src/features/materials/materialsRoutes.js`.
- `dotenv` loads `backend/.env` from `backend/src/server.js` and `backend/src/config/pool.js`.
- `compression` and `cors` are installed, but only custom CORS middleware is actively wired in `backend/src/server.js`.

## Frontend Dependencies

- Frontend app code is plain browser JavaScript in `frontend/src/`.
- There is no frontend framework package manifest under `frontend/`.
- Shared API access is centralized in `frontend/src/core/api.js`.
- Shared auth state lives in `frontend/src/core/auth-manager.js`.

## Scripts And Entry Points

- Root `npm run build` installs backend and frontend dependencies from `package.json`.
- Root `npm run start` delegates to backend start.
- Backend `npm start` runs `node src/server.js`.
- Backend `npm run dev` uses `bun --watch run src/server.js`.
- Backend migration/bootstrap commands are exposed as `init-db` and `migrate` in `backend/package.json`.
- Standalone schema bootstrap also exists at root in `init-db.js`.

## Configuration

- `DATABASE_URL` is required in `backend/src/config/pool.js`.
- `JWT_SECRET` is required in `backend/src/middleware/auth-middleware.js`.
- `ADMIN_PHONE`, `ADMIN_PASSWORD`, and `ADMIN_USERNAME` are required when DB initialization runs in `backend/src/config/database.js`.
- `INITIALIZE_DB=true` toggles startup schema initialization in `backend/src/server.js`.
- API base URL switches between localhost and a Render deployment in `frontend/src/core/api.js`.

## Storage And Files

- PostgreSQL is the only persisted data store visible in the repo.
- Uploaded files are stored on disk under `backend/uploads/`.
- Express ensures upload folders exist on startup in `backend/src/server.js`.

## Notable Stack Gaps

- No lint config was found.
- No formatter config was found.
- No test runner config was found.
- Frontend dependency management is inconsistent: root build script references `frontend`, but no `frontend/package.json` exists.
# Technology Stack

**Analysis Date:** 2026-04-19

## Languages

**Primary:**
- JavaScript (ES modules) - Main application language in `backend/src/server.js`, `backend/src/features/**/*.js`, and `frontend/src/**/*.js`
- HTML - Static page entrypoints in `frontend/index.html`, `frontend/admin-dashboard.html`, `frontend/student-dashboard.html`, and `frontend/teacher-dashboard.html`

**Secondary:**
- TypeScript - Bun static frontend server in `frontend/server.ts`
- CSS - Styling and asset imports under `frontend/src/assets/css/`
- SQL - Inline schema and migration SQL in `init-db.js`, `backend/src/config/database.js`, and `backend/migrations/*.js`

## Runtime

**Environment:**
- Node.js - Production backend runtime via `backend/package.json` `start` script targeting `backend/src/server.js`
- Bun - Frontend static server runtime in `frontend/server.ts` and backend development scripts in `backend/package.json`

**Package Manager:**
- npm - Root install/build flow in `package.json`
- Lockfile: present as `package-lock.json`
- Bun lockfile: present as `bun.lock`

## Frameworks

**Core:**
- Express 5.2.1 - Backend HTTP API and static asset serving in `backend/package.json` and `backend/src/server.js`
- Bun runtime HTTP server - Static frontend file hosting in `frontend/server.ts`

**Testing:**
- Not detected as a formal test framework in `package.json` or `backend/package.json`
- Ad hoc verification scripts exist in `test-materials-api.js`

**Build/Dev:**
- Bun watch mode - Backend dev server via `backend/package.json`
- dotenv 17.x - Environment loading in `backend/src/server.js`, `backend/src/config/pool.js`, `init-db.js`, and `backend/scripts/export-database.js`

## Key Dependencies

**Critical:**
- `express` 5.2.1 - Primary API framework in `backend/package.json`
- `pg` 8.20.0 - PostgreSQL client used by `backend/src/config/pool.js`, `init-db.js`, `backend/migrations/*.js`, and `backend/scripts/export-database.js`
- `jsonwebtoken` 9.0.3 - JWT signing and verification in `backend/src/features/auth/authRoutes.js`, `backend/src/features/auth/authController.js`, and `backend/src/middleware/auth-middleware.js`
- `bcryptjs` 2.4.3 - Password hashing and verification in `backend/src/config/database.js` and `backend/src/features/auth/authRoutes.js`
- `multer` 2.1.1 - Multipart upload handling in `backend/src/features/materials/materialsRoutes.js`, `backend/src/features/homework/homeworkRoutes.js`, `backend/src/features/notifications/notificationsRoutes.js`, and `backend/src/features/teacher/teacherRoutes.js`

**Infrastructure:**
- `cors` 2.8.6 - Imported in `backend/src/server.js`, though origin handling is primarily implemented by custom middleware in `backend/src/middleware/auth-middleware.js`
- `compression` 1.8.1 - Registered in `backend/src/server.js`
- `dotenv` 17.4.2 at repo root and 17.3.1 in `backend/package.json` - Used for runtime and scripts
- `@types/bun` latest - Developer type support declared in root `package.json`

## Configuration

**Environment:**
- Backend env is loaded from `backend/.env` by `backend/src/server.js`, `backend/src/config/pool.js`, `init-db.js`, `backend/scripts/export-database.js`, and `backend/migrations/*.js`
- Required backend variables referenced in code: `DATABASE_URL`, `JWT_SECRET`, `PORT`, `INITIALIZE_DB`, `ADMIN_PHONE`, `ADMIN_PASSWORD`, and `ADMIN_USERNAME`
- No repo-local `.env*` file was detected at the repository root during this scan

**Build:**
- Root scripts in `package.json` install backend and frontend dependencies and delegate startup to the backend
- Backend entrypoint is `backend/src/server.js`
- Frontend runtime server is `frontend/server.ts`
- Database bootstrap and migration scripts live in `init-db.js` and `backend/migrations/*.js`

## Platform Requirements

**Development:**
- Install Node.js for `npm` and backend `node` execution used by `backend/package.json`
- Install Bun for `frontend/server.ts` and backend `bun --watch` / Bun migration scripts declared in `backend/package.json`
- Run PostgreSQL reachable through `DATABASE_URL` for all backend startup and migration flows in `backend/src/config/pool.js`

**Production:**
- Backend expects a Node-compatible deployment that exposes an HTTP port and can reach PostgreSQL, as shown by `backend/src/server.js`
- Frontend can be served either by Express static hosting from `backend/src/server.js` or by the separate Bun static server in `frontend/server.ts`
- Remote production API target is hardcoded in `frontend/src/core/api.js`, `frontend/src/modules/admin/admin-dashboard.js`, and `frontend/src/modules/admin/admin-pending-approvals.js` as a Render-hosted URL

---

*Stack analysis: 2026-04-19*
