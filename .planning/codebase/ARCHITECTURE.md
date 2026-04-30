# Architecture

**Analysis Date:** 2026-04-19

## Pattern Overview

**Overall:** Feature-oriented monolith with a static multi-page frontend and a single Express API backend.

**Key Characteristics:**
- Use `backend/src/server.js` as the single backend composition root for env loading, middleware, database bootstrap, route mounting, and static asset hosting.
- Organize backend code by feature under `backend/src/features/*`, but allow each feature to choose its own shape: routes-only, routes plus controller, or routes plus model/query helpers.
- Use plain browser JavaScript modules in `frontend/src/core/*` and `frontend/src/modules/*`, with each HTML page loading one module entrypoint directly.

## Layers

**Backend Composition Layer:**
- Purpose: Start the process and wire the application together.
- Location: `backend/src/server.js`
- Contains: Express app creation, upload directory setup, PostgreSQL connectivity check, middleware registration, static file serving, route mounting, health endpoint, final error/fallback handlers.
- Depends on: `backend/src/config/pool.js`, `backend/src/config/database.js`, `backend/src/middleware/auth-middleware.js`, and every route file in `backend/src/features/*`.
- Used by: `backend/package.json` scripts and root `package.json` start flow.

**Backend Infrastructure Layer:**
- Purpose: Provide reusable database and security plumbing.
- Location: `backend/src/config/pool.js`, `backend/src/config/database.js`, `backend/src/middleware/auth-middleware.js`, `backend/src/utils/sanitize.js`
- Contains: PostgreSQL pool creation, table initialization, JWT authentication, role authorization, ownership checks, rate limiting, input validation, and sanitizers.
- Depends on: environment variables and feature model schema exports such as `backend/src/features/auth/User.js` and `backend/src/features/materials/Material.js`.
- Used by: `backend/src/server.js` and most feature handlers.

**Backend Feature API Layer:**
- Purpose: Expose domain-specific HTTP endpoints.
- Location: `backend/src/features/*/*Routes.js`
- Contains: Express routers for auth, student, admin, teacher, attendance, homework, fees, materials, notifications, results, and download.
- Depends on: sibling controllers or model/query helper functions and shared `req.db` / `req.user` state.
- Used by: `backend/src/server.js`.

**Backend Domain/Data Access Layer:**
- Purpose: Hold schema definitions and SQL helpers.
- Location: `backend/src/features/auth/User.js`, `backend/src/features/student/Student.js`, `backend/src/features/attendance/Attendance.js`, `backend/src/features/fees/Fee.js`, `backend/src/features/homework/Homework.js`, `backend/src/features/materials/Material.js`, `backend/src/features/notifications/Notification.js`, `backend/src/features/teacher/syllabusModel.js`, `backend/src/features/teacher/examResultModel.js`, `backend/src/features/results/resultsModel.js`, `backend/src/features/student/Timetable.js`
- Contains: `schema` strings for bootstrapping and raw `pool.query(...)` helpers.
- Depends on: PostgreSQL through `pg`.
- Used by: route files directly in features like `backend/src/features/auth/authRoutes.js` and `backend/src/features/admin/adminRoutes.js`, plus some controller files.

**Frontend Shell Layer:**
- Purpose: Define page structure and load one role-specific script per page.
- Location: `frontend/index.html`, `frontend/admin-dashboard.html`, `frontend/student-dashboard.html`, `frontend/teacher-dashboard.html`
- Contains: markup, tabs, modal shells, inline auth guards, and module script tags.
- Depends on: `frontend/src/core/*`, `frontend/src/modules/*`, and CSS in `frontend/src/assets/css/*`.
- Used by: the browser, either via `backend/src/server.js` static hosting or `frontend/server.ts`.

**Frontend Core Services Layer:**
- Purpose: Centralize shared browser behavior.
- Location: `frontend/src/core/api.js`, `frontend/src/core/auth-manager.js`, `frontend/src/core/auth-modal.js`, `frontend/src/core/sanitize.js`, `frontend/src/core/theme.js`, `frontend/src/core/index.js`
- Contains: fetch wrapper, grouped API clients, auth persistence, modal injection, sanitization helpers, and landing-page bootstrap.
- Depends on: browser storage, DOM APIs, and `fetch`.
- Used by: page modules in `frontend/src/modules/admin/*`, `frontend/src/modules/student/*`, and `frontend/src/modules/teacher/*`.

**Frontend Page Module Layer:**
- Purpose: Orchestrate one dashboard or auth flow per role.
- Location: `frontend/src/modules/admin/admin-dashboard.js`, `frontend/src/modules/student/student-dashboard.js`, `frontend/src/modules/teacher/teacher-dashboard.js`, plus login/register helpers in sibling files.
- Contains: DOM event wiring, tab switching, modal state, fetch calls, and HTML rendering logic.
- Depends on: `frontend/src/core/*` modules and the DOM IDs/classes declared in matching HTML files.
- Used by: corresponding HTML entry points.

## Data Flow

**Authenticated Dashboard Flow:**

1. The browser loads a role page such as `frontend/teacher-dashboard.html`, which performs an inline auth check and imports `frontend/src/modules/teacher/teacher-dashboard.js`.
2. The page module reads auth state through `frontend/src/core/auth-manager.js` and requests data through grouped helpers in `frontend/src/core/api.js`.
3. `frontend/src/core/api.js` builds `/api/...` URLs, injects the JWT from storage, and sends requests to `backend/src/server.js`.
4. `backend/src/server.js` applies security middleware, attaches `req.db = pool`, and forwards the request into a feature router such as `backend/src/features/teacher/teacherRoutes.js`.
5. The route handler runs direct SQL or calls exported query helpers from files like `backend/src/features/auth/User.js` or `backend/src/features/homework/Homework.js`.
6. The frontend module renders the returned JSON into the existing DOM; there is no SPA router or client framework state store.

**Student Login Flow:**

1. `frontend/src/core/auth-modal.js` opens modal-based login UI from `frontend/index.html`.
2. The modal submits through `authAPI.login()` in `frontend/src/core/api.js`.
3. `backend/src/features/auth/authRoutes.js` sanitizes the identifier, resolves the user/student record, validates credentials, and signs a JWT.
4. `frontend/src/core/auth-manager.js` stores role, token, and `userId`.
5. The browser redirects to `frontend/student-dashboard.html`, where `frontend/src/modules/student/student-dashboard.js` loads `/api/student/:userId/*`.

**Database Bootstrap Flow:**

1. `backend/src/server.js` optionally calls `initializeDatabase()` from `backend/src/config/database.js`.
2. `backend/src/config/database.js` executes `schema` strings exported from feature model files such as `backend/src/features/auth/User.js` and `backend/src/features/results/resultsModel.js`.
3. The same initialization path creates or updates the default admin account from env-backed credentials.

**State Management:**
- Keep persistent state in PostgreSQL through raw SQL.
- Keep auth/session state in `sessionStorage` or `localStorage` through `frontend/src/core/auth-manager.js`.
- Keep UI state in module-level variables inside dashboard scripts such as `allHomework`, `allMaterials`, `allSyllabus`, and `allTimetable` in `frontend/src/modules/teacher/teacher-dashboard.js`.

## Key Abstractions

**Feature Router:**
- Purpose: Define the public HTTP surface for one feature.
- Examples: `backend/src/features/auth/authRoutes.js`, `backend/src/features/student/studentRoutes.js`, `backend/src/features/materials/materialsRoutes.js`
- Pattern: One Express router per feature, mounted centrally in `backend/src/server.js`.

**Schema-Carrying Model Module:**
- Purpose: Pair bootstrap SQL with reusable query helpers.
- Examples: `backend/src/features/auth/User.js`, `backend/src/features/student/Student.js`, `backend/src/features/materials/Material.js`
- Pattern: Export a `schema` string plus async SQL helper functions in the same file.

**Direct Route-to-SQL Handler:**
- Purpose: Keep the feature self-contained by running SQL in the route file.
- Examples: `backend/src/features/admin/adminRoutes.js`, `backend/src/features/teacher/teacherRoutes.js`, `backend/src/features/student/studentRoutes.js`
- Pattern: Route handlers read `req.db`, execute queries inline, and shape JSON responses directly.

**Controller-Mediated Feature:**
- Purpose: Move repeated request logic out of the router when a feature already has controller boundaries.
- Examples: `backend/src/features/attendance/attendanceRoutes.js` -> `backend/src/features/attendance/attendanceController.js`, `backend/src/features/homework/homeworkRoutes.js` -> `backend/src/features/homework/homeworkController.js`, `backend/src/features/results/resultsRoutes.js` -> `backend/src/features/results/resultsController.js`
- Pattern: Router delegates to controller functions, but controllers still use raw SQL or query helpers.

**Role Dashboard Module:**
- Purpose: Act as the browser-side orchestrator for one portal.
- Examples: `frontend/src/modules/admin/admin-dashboard.js`, `frontend/src/modules/student/student-dashboard.js`, `frontend/src/modules/teacher/teacher-dashboard.js`
- Pattern: One large module per role owns fetching, tab logic, modal behavior, and render functions.

**Central Browser API Client:**
- Purpose: Normalize backend communication and expose grouped role/feature methods.
- Examples: `frontend/src/core/api.js`
- Pattern: Shared `apiCall()` plus objects such as `adminAPI`, `studentAPI`, `teacherAPI`, `materialsAPI`, and `resultsAPI`.

## Entry Points

**Backend API Server:**
- Location: `backend/src/server.js`
- Triggers: `npm start --prefix backend`, `bun --watch run src/server.js`, or root `npm start`.
- Responsibilities: Load env, connect to PostgreSQL, enforce middleware, mount feature routes, serve `frontend/`, and listen for traffic.

**Frontend Static Server:**
- Location: `frontend/server.ts`
- Triggers: manual Bun execution for frontend-only static serving.
- Responsibilities: Serve files from `frontend/`, set MIME types, and fall back to `frontend/index.html`.

**Landing Page:**
- Location: `frontend/index.html` with `frontend/src/core/index.js`
- Triggers: root browser request to `/`.
- Responsibilities: Render the public shell and bootstrap modal-based auth/signup flows.

**Admin Portal:**
- Location: `frontend/admin-dashboard.html` with `frontend/src/modules/admin/admin-dashboard.js`
- Triggers: successful admin login.
- Responsibilities: Manage users, students, financials, attendance, homework, materials, notifications, and results.

**Student Portal:**
- Location: `frontend/student-dashboard.html` with `frontend/src/modules/student/student-dashboard.js`
- Triggers: successful student login.
- Responsibilities: Render dashboard, homework, materials, fees, timetable, results, and notifications for one student.

**Teacher Portal:**
- Location: `frontend/teacher-dashboard.html` with `frontend/src/modules/teacher/teacher-dashboard.js`
- Triggers: successful teacher login.
- Responsibilities: Render teacher KPIs and manage attendance, homework, materials, syllabus, timetable, and exam results.

## Error Handling

**Strategy:** Handle errors close to the edge, return JSON payloads from backend routes, and show inline alerts or redirects in frontend modules.

**Patterns:**
- Return route-level HTTP errors with `res.status(...).json({ error: ... })` in files such as `backend/src/features/auth/authRoutes.js` and `backend/src/features/admin/adminRoutes.js`.
- Use a final Express error handler and a last-resort fallback route in `backend/src/server.js`.
- Catch fetch failures in page modules such as `frontend/src/modules/student/student-dashboard.js` and `frontend/src/modules/teacher/teacher-dashboard.js`, then render alert boxes or redirect to `/`.

## Cross-Cutting Concerns

**Logging:** Use `console.log`, `console.warn`, and `console.error` throughout `backend/src/*` and `frontend/src/*`; no separate logging package is present.

**Validation:** Apply shared middleware in `backend/src/middleware/auth-middleware.js` and field-level sanitizers from `backend/src/utils/sanitize.js`; frontend modules also perform basic required-field checks before submission.

**Authentication:** Issue JWTs in `backend/src/features/auth/authRoutes.js`, verify them in `backend/src/middleware/auth-middleware.js`, and persist them in browser storage through `frontend/src/core/auth-manager.js`.

---

*Architecture analysis: 2026-04-19*
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
