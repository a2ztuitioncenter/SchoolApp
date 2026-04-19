# Code Conventions

**Mapped:** 2026-04-19

## General Style

- Code is written as ESM with `import`/`export` syntax throughout the repo.
- Semicolons are used consistently in backend and most frontend files.
- Comments are practical and direct, especially in infra files like `backend/src/server.js` and `frontend/src/core/auth-manager.js`.
- Logging is verbose and often emoji-prefixed in feature code and setup scripts.

## Backend Patterns

- Express handlers are usually exported async functions from controller files such as `backend/src/features/materials/materialsController.js`.
- Route files assemble middleware and handler wiring, e.g. `backend/src/features/materials/materialsRoutes.js`.
- SQL is written inline with parameter placeholders (`$1`, `$2`) instead of query builders.
- Request-scoped DB access uses `req.db`.
- Validation often happens near the route/controller boundary with helpers from `backend/src/utils/sanitize.js`.

## Auth And Security Conventions

- JWT auth is required for protected routes using `authenticate` and `authorize` from `backend/src/middleware/auth-middleware.js`.
- Error responses are usually JSON objects with `error`, and sometimes `code`.
- Security middleware tries to centralize rate limiting, input validation, CORS, and audit logging.

## Frontend Patterns

- Shared browser state and role checks live in `frontend/src/core/auth-manager.js`.
- API calls are centralized in `frontend/src/core/api.js`.
- Pages rely on imperative DOM scripting rather than component abstractions.
- Role modules are separated by directory instead of a shared typed UI model.

## Naming

- Functions use camelCase.
- DB tables and fields use snake_case.
- Files are mostly lowercase with suffix-based naming (`auth-manager.js`, `materialsRoutes.js`).
- Frontend page modules mirror page names (`admin-dashboard.js`, `student-dashboard.js`).

## Error Handling

- Backend controllers usually wrap handlers in `try/catch` and respond with status 500 on unexpected failures.
- Errors are logged with `console.error`, often without structured metadata.
- Client API wrapper in `frontend/src/core/api.js` normalizes failed responses into `{ error, success: false }`.

## Consistency Issues

- Some duplicate/legacy files remain, including `backend/src/features/auth/authController.js` alongside route-embedded auth logic.
- Path separator duplication suggests accidental duplicate files in git status.
- There is no visible automated linting or formatting gate to enforce conventions mechanically.
# Coding Conventions

**Analysis Date:** 2026-04-19

## Naming Patterns

**Files:**
- Use lowercase feature files for routes/controllers/utilities, typically with kebab-case or descriptive lowercase names: `backend/src/middleware/auth-middleware.js`, `backend/src/utils/sanitize.js`, `frontend/src/core/auth-manager.js`.
- Use PascalCase filenames for backend model-style modules that encapsulate table logic: `backend/src/features/auth/User.js`, `backend/src/features/homework/Homework.js`, `backend/src/features/student/Student.js`, `backend/src/features/fees/Fee.js`.
- Place frontend browser code under `frontend/src/core/*.js` for shared runtime helpers and `frontend/src/modules/<role>/*.js` for page-specific code such as `frontend/src/modules/admin/admin-login.js` and `frontend/src/modules/student/student-dashboard.js`.

**Functions:**
- Use camelCase for functions and exported APIs: `handleAdminLogin()`, `apiCall()`, `getAuthToken()`, `sanitizeText()`, `getUserByPhone()`, `assignTeacherToClasses()`.
- Use verb-first names for handlers and data access functions: `createMaterial()`, `getAllNotifications()`, `markPaid()`, `requireRole()`.
- Use `init*`, `setup*`, `load*`, and `populate*` prefixes for frontend orchestration functions: `init()`, `setupTabs()`, `loadDashboard()`, `populateSharedDropdowns()` in `frontend/src/modules/teacher/teacher-dashboard.js`.

**Variables:**
- Prefer camelCase locals and state variables: `base_api_url`, `dashboardResponse`, `allowedRolesLower`, `teacherPhone`, `availableClasses`.
- Database column names stay snake_case in SQL and row objects, then are mapped to camelCase for API responses, as shown in `backend/src/features/homework/Homework.js`, `backend/src/features/fees/Fee.js`, and comments in `backend/src/features/student/dataController.js`.
- Constants are uppercase when they are true constants: `JWT_SECRET` in `backend/src/middleware/auth-middleware.js`, `AUTH_STORAGE_KEY` and `AUTH_TIMEOUT` in `frontend/src/core/auth-manager.js`, `DAY_NAMES` in `frontend/src/modules/teacher/teacher-dashboard.js`.

**Types:**
- No TypeScript or runtime schema library is used in application code.
- Type intent is documented with JSDoc comments in selected files such as `backend/src/middleware/auth-middleware.js`, `frontend/src/core/auth-manager.js`, and `frontend/src/core/api.js`.

## Code Style

**Formatting:**
- No formatter config was detected: no `.prettierrc`, `eslint.config.*`, `.eslintrc*`, `biome.json`, `jest.config.*`, or `vitest.config.*` were found under `m:/WebDev/projects/tuition-app`.
- Use ESM syntax consistently (`import` / `export`) across root, backend, and frontend code: `backend/src/server.js`, `backend/src/config/pool.js`, `frontend/src/core/api.js`.
- Prefer two-space indentation and semicolon-terminated statements. Multi-line objects and JSON responses are formatted with trailing commas omitted, as in `backend/src/server.js` and `backend/src/middleware/auth-middleware.js`.
- Keep route/controller files readable with section comments instead of heavy abstraction. Large browser modules use banner comments to separate concerns, for example `frontend/src/modules/teacher/teacher-dashboard.js` and `frontend/src/modules/student/student-dashboard.js`.

**Linting:**
- No lint tool is configured in `package.json` or `backend/package.json`.
- The effective convention is "match surrounding file style" instead of relying on automated lint enforcement.
- Preserve existing mixed naming where it bridges database and API boundaries; do not normalize snake_case SQL columns to camelCase inside SQL strings.

## Import Organization

**Order:**
1. Built-in or external packages first: `express`, `dotenv`, `path`, `bcryptjs`, `jsonwebtoken`, `pg`.
2. Internal feature/config imports second: `./features/...`, `../student/Student.js`, `../../utils/sanitize.js`.
3. Side-effect or same-layer imports last when needed, such as `import './student-results.js';` in `frontend/src/modules/student/student-dashboard.js`.

**Path Aliases:**
- No path aliases are configured.
- Use relative imports with explicit `.js` extensions everywhere: `../../core/api.js`, `../auth/User.js`, `./materialsController.js`.

## Error Handling

**Patterns:**
- Wrap async Express handlers in `try/catch` and return JSON errors through `res.status(...).json(...)`, as in `backend/src/features/fees/feeController.js`, `backend/src/features/notifications/notificationsController.js`, and `backend/src/features/auth/authRoutes.js`.
- Return early for validation failures and missing records:
  - `return res.status(400).json({ error: '...' })`
  - `return res.status(404).json({ error: '...' })`
- Use thrown errors for unrecoverable configuration failures during startup, for example `backend/src/config/pool.js` throws when `DATABASE_URL` is missing and `backend/src/middleware/auth-middleware.js` throws when `JWT_SECRET` is missing.
- In frontend modules, surface backend failures as `response.error` or throw `new Error(...)` from API wrappers, then render a user-facing message in the page, as in `frontend/src/core/api.js`, `frontend/src/modules/admin/admin-login.js`, and `frontend/src/modules/student/student-dashboard.js`.

## Logging

**Framework:** `console`

**Patterns:**
- Use `console.error()` in catch blocks and startup failures: `backend/src/server.js`, `backend/src/features/materials/materialsController.js`, `frontend/src/modules/admin/admin-login.js`.
- Use `console.warn()` for authorization and recoverable UI issues: `backend/src/middleware/auth-middleware.js`, `frontend/src/modules/admin/exam-results.js`.
- Use `console.log()` liberally for request tracing, successful state transitions, and ad hoc debugging: `backend/src/server.js`, `frontend/src/core/auth-manager.js`, `frontend/src/modules/student/student-results.js`.
- Keep existing emoji-prefixed logs when editing files that already use them, but do not introduce a second logging style into a clean file.

## Comments

**When to Comment:**
- Add short file headers for responsibility and context, e.g. `backend/src/middleware/auth-middleware.js`, `frontend/src/core/api.js`, `frontend/src/modules/student/student-dashboard.js`.
- Use comments to explain data-shape bridges or non-obvious behavior, such as snake_case-to-camelCase mapping in `backend/src/features/homework/Homework.js` and auth/session compatibility in `frontend/src/core/auth-manager.js`.
- Use section-divider comments in long browser modules rather than extracting everything into smaller files; see `frontend/src/modules/teacher/teacher-dashboard.js`.

**JSDoc/TSDoc:**
- JSDoc is selective, not universal.
- Add JSDoc to shared utilities and middleware when parameter intent matters, following the style in `backend/src/middleware/auth-middleware.js` and `frontend/src/core/auth-manager.js`.

## Function Design

**Size:** 
- Small backend controllers delegate to model/helper layers and usually stay under 20-40 lines per action: `backend/src/features/fees/feeController.js`, `backend/src/features/notifications/notificationsController.js`.
- Frontend page modules are allowed to be large and stateful. Follow the existing "module as page controller" pattern in `frontend/src/modules/admin/admin-dashboard.js`, `frontend/src/modules/teacher/teacher-dashboard.js`, and `frontend/src/modules/student/student-dashboard.js` unless you are actively refactoring that page.

**Parameters:**
- Backend data functions typically accept `(pool, ...)` or `(req, res)` depending on layer, as seen in `backend/src/features/auth/User.js`, `backend/src/features/homework/Homework.js`, and controller files.
- Use object parameters for create/update payloads when a function consumes many fields, for example `createUser(pool, { ... })` in `backend/src/features/auth/User.js` and `createHomework(pool, { ... })` in `backend/src/features/homework/Homework.js`.
- Frontend helpers usually accept primitive arguments and derive DOM nodes internally, as in `frontend/src/core/api.js` and `frontend/src/modules/student/student-dashboard.js`.

**Return Values:**
- Backend controllers return JSON envelopes, commonly `{ data: ... }`, `{ message: ... }`, or `{ success: true, ... }`.
- Model functions return raw rows or mapped plain objects, not classes, for example `backend/src/features/auth/User.js` and `backend/src/features/homework/Homework.js`.
- Frontend API wrappers return parsed response payloads directly and standardize failures to `{ error, success: false }` in `frontend/src/core/api.js`.

## Module Design

**Exports:**
- Prefer named exports for controllers, helpers, and utility functions: `backend/src/features/notifications/notificationsController.js`, `backend/src/utils/sanitize.js`, `frontend/src/core/sanitize.js`.
- Use default exports for Express routers and singleton-like modules: `backend/src/features/auth/authRoutes.js`, `backend/src/features/download/downloadRoutes.js`, `backend/src/config/pool.js`.
- Some modules expose both named and default exports when multiple routers are needed, as in `backend/src/features/materials/materialsRoutes.js`.

**Barrel Files:** 
- Barrel files are not used.
- Import modules directly from their source file path.

## Practical Rules

- When adding backend code, keep database columns snake_case in SQL and map API payloads to camelCase at the module boundary, following `backend/src/features/homework/Homework.js` and `backend/src/features/auth/User.js`.
- When adding frontend page logic, keep DOM wiring close to the page module and bind in `DOMContentLoaded` or an `init()` function, following `frontend/src/modules/admin/admin-login.js` and `frontend/src/modules/teacher/teacher-dashboard.js`.
- When adding shared browser helpers, place them in `frontend/src/core/` and export named functions, following `frontend/src/core/api.js`, `frontend/src/core/auth-manager.js`, and `frontend/src/core/sanitize.js`.
- When editing existing files, preserve the local style of comments, log verbosity, and JSON response shape because no automated formatter or lint config standardizes them.

---

*Convention analysis: 2026-04-19*
