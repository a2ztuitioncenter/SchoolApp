# Codebase Concerns

**Mapped:** 2026-04-19

## Security

- `backend/src/features/auth/authController.js` falls back to a hardcoded JWT secret if `JWT_SECRET` is missing; this is dangerous if the file is ever used.
- `backend/src/middleware/auth-middleware.js` reflects any incoming `Origin` header, which is permissive and not a true allowlist.
- Uploaded files are stored locally under `backend/uploads/`, and the repo currently shows tracked PDF artifacts under `backend/uploads/materials/`.
- Root and backend initialization scripts depend on local `.env` files, increasing accidental secret exposure risk if workflows are not careful.

## Data And Schema Drift

- `backend/src/features/materials/materialsController.js` updates `updated_at`, but `init-db.js` does not define `updated_at` for `materials`; this can fail depending on which schema path created the table.
- Schema is duplicated between feature model files like `backend/src/features/materials/Material.js` and the monolithic root `init-db.js`.
- There are manual migrations in `backend/migrations/`, but no unified migration runner is visible.

## Repo Hygiene

- Git status shows duplicate path variants such as `backend\\src\\server.js` and duplicated materials files, which strongly suggests accidental duplicate files or Windows path mishandling.
- Generated upload artifacts are present in version control status.
- There are both current and likely stale auth implementations (`authRoutes.js` and `authController.js`).

## Reliability

- `backend/src/server.js` exits the process immediately on database connection failure.
- Request rate limiting is in-memory only in `backend/src/middleware/auth-middleware.js`, so it resets on restart and does not scale across instances.
- Input validation uses broad regex pattern blocking; it may reject legitimate content and still miss real attack patterns.

## Performance

- Controllers rely on direct SQL with many broad `SELECT *` queries, for example in `backend/src/features/materials/materialsController.js`.
- Verbose request logging and row-by-row debug logging can become noisy in production.
- File uploads remain on local disk rather than durable external storage.

## Maintainability

- The app mixes Bun, Node, and plain browser JS without a single documented dev workflow.
- There is no automated linting, formatting, or test enforcement.
- Frontend and backend contracts are implicit in shared string endpoints rather than typed or generated APIs.

## Immediate Follow-Ups

- Resolve duplicate path/file entries before further structural work.
- Unify schema ownership and migration flow.
- Remove tracked upload artifacts and keep runtime files out of git.
- Add automated regression coverage for auth and materials before further feature expansion.
# Codebase Concerns

**Analysis Date:** 2026-04-19

## Tech Debt

**Schema and naming drift:**
- Issue: The repo maintains multiple incompatible schema definitions and naming conventions at the same time. `backend/schema.sql` uses quoted camelCase columns such as `"teacherId"` and `"classLevel"`, while runtime models and routes use snake_case columns such as `teacher_id` and `class_level`.
- Files: `backend/schema.sql`, `backend/src/features/auth/User.js`, `backend/src/features/teacher/teacherRoutes.js`, `backend/src/features/admin/adminRoutes.js`, `init-db.js`, `backend/migrations/migrate-teachers-to-new-schema.js`
- Impact: New environments, migrations, and production queries can disagree about actual column names, causing runtime failures that only appear after deployment or when bootstrapping a fresh database.
- Fix approach: Choose one canonical schema shape, delete obsolete schema definitions, and make all models, migrations, and raw SQL match that single convention.

**Ad hoc database bootstrap path:**
- Issue: Database creation logic is spread across `backend/src/config/database.js`, `init-db.js`, model `schema` strings, and standalone migration scripts.
- Files: `backend/src/config/database.js`, `init-db.js`, `backend/src/features/auth/User.js`, `backend/src/features/materials/Material.js`, `backend/migrations/add_uploaded_by_id_to_materials.js`
- Impact: Operators have no single reliable source of truth for database state, and drift accumulates whenever one path is updated without the others.
- Fix approach: Replace multi-source schema creation with versioned migrations only, and keep runtime startup from mutating schema except for health checks.

**Hardcoded tenant and environment values:**
- Issue: The code hardcodes `school-001`, the Render deployment URL, and Cloudflare tunnel assumptions directly in app logic.
- Files: `backend/src/features/auth/authRoutes.js`, `backend/src/features/auth/User.js`, `backend/src/features/admin/adminRoutes.js`, `frontend/src/core/api.js`, `frontend/src/modules/admin/admin-dashboard.js`, `frontend/src/modules/admin/admin-pending-approvals.js`
- Impact: Multi-school support, environment promotion, preview deployments, and local staging become brittle and expensive to change.
- Fix approach: Move these values behind configuration and pass tenant context explicitly instead of embedding it in queries and frontend fetch code.

**Large monolithic UI modules:**
- Issue: Dashboard files mix API calls, state, rendering, DOM mutation, and business rules in very large modules.
- Files: `frontend/src/modules/admin/admin-dashboard.js`, `frontend/src/modules/teacher/teacher-dashboard.js`, `frontend/src/modules/student/student-dashboard.js`
- Impact: Small UI changes carry high regression risk, and repeated patterns such as auth reads, fetch logic, rendering, and form behavior are hard to standardize.
- Fix approach: Extract feature-specific controllers/components, centralize repeated fetch/render helpers, and reduce direct `innerHTML` composition.

## Known Bugs

**Teacher materials permission checks query the wrong columns:**
- Symptoms: Teacher material create and update paths can fail even when the teacher is assigned to the class.
- Files: `backend/src/features/teacher/teacherRoutes.js`, `backend/src/features/auth/User.js`, `backend/schema.sql`
- Trigger: Call `POST /api/teacher/materials` or `PUT /api/teacher/materials/:id` after assignments are stored with snake_case columns (`teacher_id`, `class_level`) but the permission query uses `"teacherId"` and `"classLevel"`.
- Workaround: Use admin material routes in `backend/src/features/materials/materialsRoutes.js` or align the table/query schema before using teacher-scoped uploads.

**Student dashboard authorization relies on caller-supplied route params:**
- Symptoms: An authenticated student can request another student's dashboard, attendance, or fee endpoints by changing the `userId` path parameter if they know another user ID.
- Files: `backend/src/server.js`, `backend/src/features/student/studentRoutes.js`, `backend/src/features/student/dataController.js`
- Trigger: Call `GET /api/student/:userId/dashboard`, `GET /api/student/:userId/attendance`, or `GET /api/student/:userId/fees` with a valid token and a different `:userId`.
- Workaround: None in the current code. The routes need ownership middleware such as `requireSelfOrAdmin` from `backend/src/middleware/auth-middleware.js`.

**Attendance sheet response maps roll numbers incorrectly:**
- Symptoms: The teacher attendance sheet can return students without `rollNumber` values even though the SQL aliases it.
- Files: `backend/src/features/teacher/teacherRoutes.js`
- Trigger: `GET /api/teacher/attendance/sheet` selects `roll_number as "rollNumber"` and then serializes `s.roll_number` instead of `s.rollNumber`.
- Workaround: None in current API behavior; consumers must tolerate missing roll numbers.

**Duplicate username-check route definitions invite drift:**
- Symptoms: Behavior for `/api/auth/check-username` depends on which duplicate handler remains aligned with future edits.
- Files: `backend/src/features/auth/authRoutes.js`
- Trigger: The route is declared twice in the same router, once returning HTTP 400 on validation errors and later returning `{ available: false, error }`.
- Workaround: None. Remove one implementation and keep one contract.

## Security Considerations

**Fallback JWT secret exists in code:**
- Risk: Tokens can be forged anywhere this legacy controller is used without `JWT_SECRET` being set.
- Files: `backend/src/features/auth/authController.js`
- Current mitigation: `backend/src/middleware/auth-middleware.js` and `backend/src/features/auth/authRoutes.js` both require `JWT_SECRET`.
- Recommendations: Delete the fallback secret entirely and remove or update `backend/src/features/auth/authController.js` so no code path signs tokens with a hardcoded secret.

**CORS policy reflects arbitrary origins:**
- Risk: `corsSecure()` allows any requesting origin and also enables credentials plus `Access-Control-Allow-Private-Network`, which weakens cross-origin protections.
- Files: `backend/src/middleware/auth-middleware.js`
- Current mitigation: Protected routes still require JWTs.
- Recommendations: Replace reflective CORS with an allowlist from config, scope credentials to trusted frontends only, and remove private-network allowance unless there is a documented requirement.

**Authorization state is duplicated across browser storage:**
- Risk: JWTs and user identifiers live in `sessionStorage`, and the code mirrors role-specific keys for backward compatibility, increasing token exposure to any XSS bug.
- Files: `frontend/src/core/auth-manager.js`, `frontend/src/core/api.js`, `frontend/src/modules/admin/admin-dashboard.js`, `frontend/src/modules/student/student-dashboard.js`, `frontend/src/modules/teacher/teacher-dashboard.js`
- Current mitigation: Some backend inputs are sanitized in `backend/src/utils/sanitize.js`.
- Recommendations: Minimize token copies, stop syncing per-role storage keys, prefer one storage contract, and reduce HTML string rendering of server data.

**Ad hoc HTML rendering expands XSS blast radius:**
- Risk: The frontend renders many server-controlled values through template strings and `innerHTML`.
- Files: `frontend/src/modules/admin/admin-dashboard.js`, `frontend/src/modules/admin/admin-pending-approvals.js`, `frontend/src/modules/student/student-dashboard.js`, `frontend/src/modules/teacher/teacher-dashboard.js`
- Current mitigation: Backend strips tags with `sanitizeText()` in `backend/src/utils/sanitize.js`.
- Recommendations: Render text with `textContent` where possible, escape HTML centrally for remaining templates, and treat backend sanitization as defense-in-depth rather than the primary XSS control.

## Performance Bottlenecks

**Exclusive table locks serialize student creation flows:**
- Problem: Student registration and admin student creation both lock the full `students` table in `ACCESS EXCLUSIVE MODE` to generate roll numbers.
- Files: `backend/src/features/auth/authRoutes.js`, `backend/src/features/admin/adminRoutes.js`
- Cause: Roll numbers are created from `COUNT(*)` instead of a dedicated sequence or conflict-safe allocator.
- Improvement path: Use a per-class/section sequence table or a unique index with retry logic so concurrent registrations do not block the entire table.

**Teacher dashboard assembles data with several broad queries:**
- Problem: The dashboard performs multiple `SELECT *` queries and a nested class assignment count query before every render.
- Files: `backend/src/features/teacher/teacherRoutes.js`
- Cause: Endpoint composition favors convenience over selective projection and shared summary queries.
- Improvement path: Select only needed columns, add targeted indexes for dashboard filters, and precompute summary counts if dashboard traffic grows.

**Student dashboard pulls full row payloads for multiple widgets:**
- Problem: The dashboard fetches homework, timetable, notifications, fee summaries, fee history, and attendance in one request, often using `SELECT *`.
- Files: `backend/src/features/student/dataController.js`, `backend/src/features/attendance/Attendance.js`, `backend/src/features/fees/Fee.js`
- Cause: Widget data is aggregated directly from raw tables without response shaping at the query level.
- Improvement path: Narrow each query to displayed columns, add pagination where lists can grow, and consider separate endpoints for low-priority widgets.

**Verbose request logging can flood output and leak identifiers:**
- Problem: The backend logs every request and several feature handlers log user IDs, roles, class filters, and material metadata.
- Files: `backend/src/server.js`, `backend/src/middleware/auth-middleware.js`, `backend/src/features/materials/materialsController.js`, `backend/src/config/database.js`
- Cause: Debug logging remains enabled in general runtime paths.
- Improvement path: Gate logs by environment, remove per-record dumps, and adopt structured logging with severity levels.

## Fragile Areas

**Materials feature is mid-migration and duplicated in the working tree:**
- Files: `backend/src/features/materials/materialsController.js`, `backend/src/features/materials/materialsRoutes.js`, `backend/src/features/materials/Material.js`, `backend/migrations/add_uploaded_by_id_to_materials.js`
- Why fragile: Upload ownership, section filtering, migration backfill, admin routes, and teacher routes are changing together, and the repo currently shows duplicate path variants for materials files in the working tree.
- Safe modification: Treat materials schema, route wiring, and frontend callers as one change set; verify both admin and teacher flows after edits.
- Test coverage: No automated tests detected for materials; only the ad hoc script `test-materials-api.js` exists.

**Teacher assignment logic is split across old and new schemas:**
- Files: `backend/src/features/auth/User.js`, `backend/src/features/teacher/teacherRoutes.js`, `backend/migrations/migrate-teachers-to-new-schema.js`, `backend/schema.sql`
- Why fragile: Assignment creation uses snake_case in runtime code, camelCase in schema SQL, and both forms appear in migration logic.
- Safe modification: Change assignment schema and queries together and validate `admin` assignment screens plus teacher-scoped CRUD in one pass.
- Test coverage: No automated coverage detected.

**File upload handling leaves metadata and cleanup loosely managed:**
- Files: `backend/src/server.js`, `backend/src/features/materials/materialsRoutes.js`, `backend/src/features/teacher/teacherRoutes.js`, `backend/src/features/notifications/notificationsRoutes.js`, `backend/src/features/download/downloadController.js`
- Why fragile: Upload directories are created at runtime relative to process CWD, files are referenced by stored paths, and deletes do not remove the underlying files from disk.
- Safe modification: Normalize storage roots, centralize upload helpers, and add delete-time filesystem cleanup before changing upload paths.
- Test coverage: No upload integration tests detected.

## Scaling Limits

**Single-process in-memory rate limiting:**
- Current capacity: One Node/Bun process with a local `Map` in `backend/src/middleware/auth-middleware.js`.
- Limit: Rate limiting resets on restart and does not coordinate across multiple instances.
- Scaling path: Move limits to Redis or a reverse proxy so throttling survives restarts and horizontal scaling.

**Static file and upload strategy stays on local disk:**
- Current capacity: Files are stored under `backend/uploads/` and served indirectly through `backend/src/features/download/downloadController.js`.
- Limit: Container restarts, ephemeral disks, and multi-instance deployments can orphan files or make them unavailable.
- Scaling path: Move uploads to object storage and store immutable object keys in the database.

## Dependencies at Risk

**No automated quality toolchain is wired into the repo:**
- Risk: The project has no detected test files, no visible test runner config, and no lint/format scripts in the root or backend package manifests.
- Impact: Regressions in schema, auth, and dashboard flows can ship unnoticed.
- Migration plan: Add a minimal automated baseline around auth, student ownership checks, teacher materials flows, and migrations before expanding coverage.

## Missing Critical Features

**Ownership enforcement for student-scoped APIs:**
- Problem: Student endpoints trust route params instead of consistently binding access to `req.user.userId`.
- Blocks: Safe exposure of student dashboards, attendance, fee history, and any future student-specific endpoints.

**Reliable migration discipline:**
- Problem: The repo lacks a single authoritative migration path for schema evolution.
- Blocks: Safe onboarding of new environments and predictable deployment of schema-changing features such as materials ownership and teacher assignments.

## Test Coverage Gaps

**Auth and authorization flows are untested:**
- What's not tested: Student self-only access, admin-only routes, teacher class assignment permissions, and token verification behavior.
- Files: `backend/src/middleware/auth-middleware.js`, `backend/src/features/auth/authRoutes.js`, `backend/src/features/student/studentRoutes.js`, `backend/src/features/teacher/teacherRoutes.js`
- Risk: Access-control regressions can ship as silent security bugs.
- Priority: High

**Schema migration and bootstrap behavior are untested:**
- What's not tested: Fresh database bootstrap, teacher schema migration, materials ownership migration, and compatibility between `init-db.js` and runtime model schemas.
- Files: `init-db.js`, `backend/src/config/database.js`, `backend/migrations/migrate-teachers-to-new-schema.js`, `backend/migrations/add_uploaded_by_id_to_materials.js`
- Risk: Deployments can fail or drift without detection.
- Priority: High

**UI dashboards are untested:**
- What's not tested: Admin assignment editing, teacher attendance/materials flows, and student dashboard rendering with realistic API data.
- Files: `frontend/src/modules/admin/admin-dashboard.js`, `frontend/src/modules/admin/admin-pending-approvals.js`, `frontend/src/modules/teacher/teacher-dashboard.js`, `frontend/src/modules/student/student-dashboard.js`
- Risk: Large DOM-heavy modules can regress on small edits.
- Priority: Medium

---

*Concerns audit: 2026-04-19*
