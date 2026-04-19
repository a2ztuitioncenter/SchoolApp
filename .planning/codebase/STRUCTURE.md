# Codebase Structure

**Mapped:** 2026-04-19

## Top-Level Layout

- `backend/` — Express API, database setup, migrations, uploaded files.
- `frontend/` — Static HTML pages plus browser JavaScript modules.
- `node_modules/` — installed root dependencies.
- `init-db.js` — root schema bootstrap script.
- `test-materials-api.js` — ad hoc manual API script.

## Backend Layout

- `backend/src/server.js` — composition root for middleware, routes, static file serving, and startup.
- `backend/src/config/` — DB pool and DB initialization helpers.
- `backend/src/middleware/` — auth, CORS, rate limiting, validation, logging.
- `backend/src/features/` — feature folders by domain.
- `backend/migrations/` — manual migration scripts.
- `backend/scripts/` — helper scripts such as `export-database.js`.
- `backend/uploads/` — runtime file storage for uploaded content.

## Feature Folder Pattern

- Auth feature: route-heavy implementation in `backend/src/features/auth/authRoutes.js`.
- Many domains follow a lightweight split:
  - routes file, e.g. `backend/src/features/results/resultsRoutes.js`
  - controller file, e.g. `backend/src/features/results/resultsController.js`
  - schema/model file, e.g. `backend/src/features/results/resultsModel.js`
- Teacher and student features also contain supporting model files like `backend/src/features/teacher/syllabusModel.js`.

## Frontend Layout

- HTML entry pages live directly under `frontend/`.
- Shared client utilities are under `frontend/src/core/`.
- Role-oriented modules live under:
  - `frontend/src/modules/admin/`
  - `frontend/src/modules/student/`
  - `frontend/src/modules/teacher/`

## Naming Conventions

- Backend feature directories are lowercase domain names.
- Route/controller/model filenames commonly use `*Routes.js`, `*Controller.js`, and `*Model.js`.
- Database columns use snake_case, visible in `init-db.js` and feature queries.
- Frontend module names are descriptive per page or capability, such as `frontend/src/modules/admin/admin-dashboard.js`.

## Irregularities

- Duplicate path variants appear in the repo listing: `backend\src\server.js`, `backend\src\features\materials\materialsController.js`, and `backend\src\features\materials\materialsRoutes.js`.
- `frontend/` appears to be treated as a package by the root build script, but there is no `frontend/package.json`.
- There is no dedicated `tests/` directory or formal CI folder structure.

## Key Files To Start With

- `backend/src/server.js`
- `backend/src/middleware/auth-middleware.js`
- `backend/src/features/auth/authRoutes.js`
- `frontend/src/core/api.js`
- `frontend/src/core/auth-manager.js`
- `init-db.js`
