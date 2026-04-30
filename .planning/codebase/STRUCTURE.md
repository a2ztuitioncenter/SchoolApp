# Codebase Structure

**Analysis Date:** 2026-04-19

## Directory Layout

```text
tuition-app/
├── backend/                 # Express API, database bootstrap, uploads, and migrations
│   ├── migrations/          # Standalone database migration scripts
│   ├── scripts/             # Backend maintenance/export helpers
│   ├── src/
│   │   ├── config/          # Pool creation and database initialization
│   │   ├── features/        # Feature folders containing routes, controllers, and SQL helpers
│   │   ├── middleware/      # Authentication, authorization, validation, rate limiting
│   │   └── utils/           # Shared backend sanitizers
│   ├── uploads/             # Runtime file uploads for materials, homework, notifications
│   ├── package.json         # Backend scripts and dependencies
│   └── schema.sql           # Alternate schema reference script
├── frontend/                # Static HTML pages and browser-side modules
│   ├── src/
│   │   ├── assets/css/      # Page stylesheets
│   │   ├── core/            # Shared API/auth/modal/theme/sanitize modules
│   │   └── modules/         # Role-specific dashboard/login/register modules
│   ├── *.html               # Multi-page entrypoints
│   └── server.ts            # Bun-based static file server
├── .planning/codebase/      # Generated architecture/codebase map documents
├── init-db.js               # Root-level initialization helper
├── test-materials-api.js    # Manual API verification script
├── package.json             # Repo-level wrapper scripts
└── bun.lock / package-lock.json  # Lockfiles for root and nested package usage
```

## Directory Purposes

**`backend/`:**
- Purpose: Hold all server-side code and backend runtime assets.
- Contains: API source under `backend/src/`, migrations in `backend/migrations/`, local uploads in `backend/uploads/`, package metadata in `backend/package.json`.
- Key files: `backend/src/server.js`, `backend/src/config/pool.js`, `backend/src/config/database.js`, `backend/schema.sql`

**`backend/src/config/`:**
- Purpose: Centralize database bootstrap and shared configuration.
- Contains: connection pool and table initialization.
- Key files: `backend/src/config/pool.js`, `backend/src/config/database.js`

**`backend/src/features/`:**
- Purpose: Group backend code by domain capability.
- Contains: one folder per feature, such as `backend/src/features/auth/`, `backend/src/features/student/`, `backend/src/features/teacher/`, `backend/src/features/materials/`.
- Key files: `backend/src/features/auth/authRoutes.js`, `backend/src/features/admin/adminRoutes.js`, `backend/src/features/teacher/teacherRoutes.js`, `backend/src/features/materials/materialsRoutes.js`

**`backend/src/middleware/`:**
- Purpose: Hold request pipeline concerns that apply across routes.
- Contains: JWT verification, authorization, rate limiting, input validation, request/security logging.
- Key files: `backend/src/middleware/auth-middleware.js`

**`backend/src/utils/`:**
- Purpose: Store backend-shared helper utilities.
- Contains: sanitization helpers used by auth and teacher routes.
- Key files: `backend/src/utils/sanitize.js`

**`backend/uploads/`:**
- Purpose: Store uploaded runtime files on the local filesystem.
- Contains: subfolders for materials, homework, and notifications.
- Key files: `backend/uploads/materials/`, `backend/uploads/homework/`, `backend/uploads/notifications/`

**`frontend/`:**
- Purpose: Hold browser-served HTML, JS, CSS, and static assets.
- Contains: page entry HTML files, source modules under `frontend/src/`, image assets, and a Bun static server.
- Key files: `frontend/index.html`, `frontend/admin-dashboard.html`, `frontend/student-dashboard.html`, `frontend/teacher-dashboard.html`, `frontend/server.ts`

**`frontend/src/core/`:**
- Purpose: Store cross-page frontend modules.
- Contains: API wrapper, auth storage/guards, modal orchestration, sanitization helpers, theme helpers, landing-page bootstrap.
- Key files: `frontend/src/core/api.js`, `frontend/src/core/auth-manager.js`, `frontend/src/core/auth-modal.js`, `frontend/src/core/index.js`

**`frontend/src/modules/`:**
- Purpose: Store page- and role-specific UI logic.
- Contains: `admin/`, `student/`, and `teacher/` subdirectories with dashboard, login, register, and supporting modules.
- Key files: `frontend/src/modules/admin/admin-dashboard.js`, `frontend/src/modules/student/student-dashboard.js`, `frontend/src/modules/teacher/teacher-dashboard.js`

**`frontend/src/assets/css/`:**
- Purpose: Store shared page-level stylesheets.
- Contains: dashboard and landing-page CSS files.
- Key files: `frontend/src/assets/css/admin-dashboard.css`, `frontend/src/assets/css/student-dashboard.css`, `frontend/src/assets/css/index.css`

**`.planning/codebase/`:**
- Purpose: Store generated architecture/reference documents for later planning/execution steps.
- Contains: codebase mapping outputs such as this file and `ARCHITECTURE.md`.
- Key files: `.planning/codebase/ARCHITECTURE.md`, `.planning/codebase/STRUCTURE.md`

## Key File Locations

**Entry Points:**
- `backend/src/server.js`: Main backend composition root and HTTP server entrypoint.
- `frontend/server.ts`: Bun-based static frontend server.
- `frontend/index.html`: Public landing page and auth shell.
- `frontend/admin-dashboard.html`: Admin portal shell.
- `frontend/student-dashboard.html`: Student portal shell.
- `frontend/teacher-dashboard.html`: Teacher portal shell.

**Configuration:**
- `package.json`: Root wrapper scripts for installing backend/frontend packages and starting the backend.
- `backend/package.json`: Backend runtime scripts and dependencies.
- `backend/src/config/pool.js`: Shared PostgreSQL pool creation.
- `backend/src/config/database.js`: Table initialization and default admin bootstrap.

**Core Logic:**
- `backend/src/features/auth/authRoutes.js`: Login, registration, approval, and JWT issuance.
- `backend/src/features/admin/adminRoutes.js`: Admin-side CRUD and reporting endpoints.
- `backend/src/features/student/studentRoutes.js`: Student-specific data endpoints.
- `backend/src/features/teacher/teacherRoutes.js`: Teacher dashboard, attendance, homework, materials, syllabus, and exam endpoints.
- `frontend/src/core/api.js`: Shared browser API wrapper and grouped endpoint helpers.
- `frontend/src/modules/admin/admin-dashboard.js`: Admin dashboard orchestration.
- `frontend/src/modules/student/student-dashboard.js`: Student dashboard orchestration.
- `frontend/src/modules/teacher/teacher-dashboard.js`: Teacher dashboard orchestration.

**Testing:**
- `test-materials-api.js`: Manual verification script for materials APIs.
- `init-db.js`: Setup helper used outside the normal server request flow.

## Naming Conventions

**Files:**
- Use lower camelCase for most JavaScript module filenames: `frontend/src/core/auth-manager.js`, `backend/src/features/auth/authRoutes.js`, `backend/src/features/materials/materialsController.js`.
- Use PascalCase for schema/query helper modules that act like model files: `backend/src/features/auth/User.js`, `backend/src/features/student/Student.js`, `backend/src/features/materials/Material.js`, `backend/src/features/attendance/Attendance.js`.
- Use kebab-case for top-level utility scripts and migrations: `test-materials-api.js`, `backend/migrations/add_username_column.js`, `backend/scripts/export-database.js`.
- Use descriptive `*Routes.js`, `*Controller.js`, `*Model.js`, and `*dashboard.js` suffixes for role and feature responsibilities.

**Directories:**
- Use lowercase singular/plural domain names for backend feature folders: `backend/src/features/auth/`, `backend/src/features/materials/`, `backend/src/features/teacher/`.
- Use role-based folders for frontend page logic: `frontend/src/modules/admin/`, `frontend/src/modules/student/`, `frontend/src/modules/teacher/`.
- Use functional buckets for shared code: `frontend/src/core/`, `backend/src/middleware/`, `backend/src/utils/`.

## Where to Add New Code

**New Backend Feature:**
- Primary code: add a new feature folder under `backend/src/features/<feature>/`.
- Routes: create `backend/src/features/<feature>/<feature>Routes.js`.
- Shared query/schema helpers: place them in the same folder, following existing patterns like `backend/src/features/materials/Material.js` or `backend/src/features/results/resultsModel.js`.
- Mounting: import and mount the new router in `backend/src/server.js`.

**New Backend Endpoint inside an Existing Feature:**
- If the feature already uses controller delegation, extend the existing controller pair, such as `backend/src/features/attendance/attendanceRoutes.js` and `backend/src/features/attendance/attendanceController.js`.
- If the feature keeps SQL in the route file, follow that pattern in-place, as in `backend/src/features/admin/adminRoutes.js` or `backend/src/features/teacher/teacherRoutes.js`.
- If reusable SQL is needed, add helper exports to the local model/query file in that feature folder.

**New Frontend Page/Portal Module:**
- Implementation: add the page shell under `frontend/*.html`.
- Role/page logic: add a matching module under `frontend/src/modules/<role>/`.
- Shared fetch/auth/sanitize logic: extend `frontend/src/core/api.js`, `frontend/src/core/auth-manager.js`, or `frontend/src/core/sanitize.js` instead of duplicating helpers in the page module.

**New Dashboard Section in an Existing Role Portal:**
- HTML container: add markup to the matching page shell, such as `frontend/teacher-dashboard.html`.
- Behavior and rendering: add handlers/render functions to the matching large dashboard module, such as `frontend/src/modules/teacher/teacher-dashboard.js`.
- Backend support: wire new API methods through `frontend/src/core/api.js` first, then call them from the dashboard module.

**Utilities:**
- Shared backend helpers: place them in `backend/src/utils/` if they are not tied to one feature.
- Shared backend request concerns: place them in `backend/src/middleware/`.
- Shared frontend helpers: place them in `frontend/src/core/`.

## Special Directories

**`backend/uploads/`:**
- Purpose: Store uploaded files used by materials, homework, and notifications.
- Generated: Yes
- Committed: Mixed current-state usage; the directory exists in the repo and currently also contains uploaded files.

**`backend/migrations/`:**
- Purpose: Hold one-off schema/data migration scripts such as `backend/migrations/add_uploaded_by_id_to_materials.js`.
- Generated: No
- Committed: Yes

**`backend/scripts/`:**
- Purpose: Hold maintenance scripts outside the request lifecycle.
- Generated: No
- Committed: Yes

**`.planning/codebase/`:**
- Purpose: Hold generated architecture/reference docs for later GSD phases.
- Generated: Yes
- Committed: Yes

**`frontend/src/modules/`:**
- Purpose: Hold large role/page modules that are tightly coupled to specific HTML shells.
- Generated: No
- Committed: Yes

## Placement Rules

- Put backend request-entry code in `backend/src/features/*/*Routes.js`; do not create a second server entrypoint when `backend/src/server.js` already owns mounting.
- Keep database bootstrap logic in `backend/src/config/database.js` and pool creation in `backend/src/config/pool.js`; do not scatter pool initialization through feature files.
- Reuse the local feature folder before creating a cross-feature abstraction. Existing backend organization prefers feature-local SQL helpers over global repositories.
- Add new browser API methods to `frontend/src/core/api.js` before calling them from `frontend/src/modules/*`; the current frontend treats `api.js` as the single fetch boundary.
- Keep dashboard-specific DOM code inside the matching role module. The current structure prefers a few large role scripts over many tiny UI components.
- Add new shared CSS to `frontend/src/assets/css/*` and keep page-specific structural markup in the corresponding `frontend/*.html` file.

---

*Structure analysis: 2026-04-19*
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
