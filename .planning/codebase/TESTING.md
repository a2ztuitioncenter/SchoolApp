# Testing Map

**Mapped:** 2026-04-19

## Current State

- No automated test files were found with common `test` or `spec` naming.
- No Jest, Vitest, or other test runner config files were found.
- No CI-oriented test workflow files were found in the repo areas inspected.

## Existing Verification Style

- Validation today appears to rely on manual execution and local scripts.
- `test-materials-api.js` looks like an ad hoc integration check rather than a formal test suite.
- Health verification is built into `GET /health` in `backend/src/server.js`.
- Startup-time DB connectivity checks fail fast when configuration is broken.

## Areas That Need Coverage First

- Auth flows in `backend/src/features/auth/authRoutes.js`
- Security middleware in `backend/src/middleware/auth-middleware.js`
- Materials upload and section filtering in `backend/src/features/materials/materialsController.js`
- Shared frontend request handling in `frontend/src/core/api.js`
- Student/admin/teacher dashboard boot paths in `frontend/src/modules/`

## Useful Testing Layers

- Unit tests for sanitizers and auth helper logic in `backend/src/utils/sanitize.js` and auth modules.
- Integration tests for Express routes against a temporary PostgreSQL database or a test schema.
- Browser smoke tests for login and dashboard navigation flows across `frontend/*.html`.
- Migration/bootstrap validation for `init-db.js` and `backend/migrations/`.

## Risks From Missing Tests

- Security middleware changes can silently break auth or over-block traffic.
- SQL-heavy controllers have no regression net for shape changes.
- File upload behavior and duplicate path issues can regress unnoticed.
- Frontend API wrapper redirects on 401/403 without automated coverage.

## Recommendation

- Start with backend integration tests around auth and materials, because those are central and actively changing.
- Add a lightweight scriptable runner before introducing large framework overhead.
- Treat `test-materials-api.js` as a candidate seed for real integration tests, not a lasting test strategy.
# Testing Patterns

**Analysis Date:** 2026-04-19

## Test Framework

**Runner:**
- Not detected
- Config: Not detected (`jest.config.*`, `vitest.config.*`, and test scripts were not found in `package.json` or `backend/package.json`)

**Assertion Library:**
- Not detected

**Run Commands:**
```bash
node test-materials-api.js        # Ad hoc database query smoke test from repo root
npm start --prefix backend        # Manual backend verification path
npm install --prefix frontend     # No automated tests; frontend is verified manually in browser
```

## Test File Organization

**Location:**
- No dedicated test directory is present under `tests/`, `backend/test/`, or co-located `*.test.*` / `*.spec.*` files.
- The only test-like artifact detected is the root script `test-materials-api.js`.

**Naming:**
- Ad hoc scripts use descriptive executable names instead of framework suffixes, e.g. `test-materials-api.js`.

**Structure:**
```
project root
├── test-materials-api.js   # Manual database smoke test
├── backend/src/...         # Application code
└── frontend/src/...        # Browser code
```

## Test Structure

**Suite Organization:**
```javascript
import db from './backend/src/config/database.js';

async function testQuery() {
  try {
    const resultB = await db.query('SELECT ...', ['10', 'B']);
    console.log(resultB.rows.length);
    process.exit(0);
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
}

testQuery();
```

**Patterns:**
- Use an executable async function with top-level invocation, as in `test-materials-api.js`.
- Use real infrastructure rather than mocks; `test-materials-api.js` imports the actual database module from `backend/src/config/database.js`.
- Treat success/failure as process exit status and console output rather than framework assertions.

## Mocking

**Framework:** Not used

**Patterns:**
```javascript
// No mocking library or stub helper is present in the repository.
// Existing verification code calls the real database and real application modules.
```

**What to Mock:**
- No project-wide mocking convention exists today.
- If you introduce automated tests, mock browser globals around `frontend/src/core/api.js` and `frontend/src/core/auth-manager.js` only when isolating session storage, redirects, or `fetch`.
- If you introduce backend unit tests, prefer mocking `pool.query()` or providing a fake `req.db` for controller-only checks around files like `backend/src/features/fees/feeController.js` and `backend/src/features/notifications/notificationsController.js`.

**What NOT to Mock:**
- Do not mock SQL shape conversions when the goal is to validate snake_case-to-camelCase mapping in modules such as `backend/src/features/homework/Homework.js` and `backend/src/features/auth/User.js`; those are good candidates for integration tests against a real test database.
- Do not mock route protection behavior entirely when exercising `backend/src/middleware/auth-middleware.js`; verify actual status codes and JSON error envelopes.

## Fixtures and Factories

**Test Data:**
```javascript
const classLevel = '10';
const section = 'B';
const params = [classLevel, section];
```

**Location:**
- No shared fixtures or factories are present.
- Existing manual tests inline their parameters directly inside `test-materials-api.js`.

## Coverage

**Requirements:** None enforced

**View Coverage:**
```bash
# Not available. No coverage tooling is configured.
```

## Test Types

**Unit Tests:**
- Not used.
- The closest unit-like areas, but currently untested, are pure helpers in `backend/src/utils/sanitize.js`, `frontend/src/core/sanitize.js`, and session helpers in `frontend/src/core/auth-manager.js`.

**Integration Tests:**
- Only ad hoc integration-style verification is present.
- `test-materials-api.js` exercises a live PostgreSQL query through the real database module.
- Manual browser verification likely covers page flows powered by `frontend/src/modules/admin/admin-dashboard.js`, `frontend/src/modules/student/student-dashboard.js`, and `frontend/src/modules/teacher/teacher-dashboard.js`, but no reproducible scripted integration suite exists.

**E2E Tests:**
- Not used

## Common Patterns

**Async Testing:**
```javascript
async function runCheck() {
  try {
    const data = await someAsyncCall();
    console.log(data);
    process.exit(0);
  } catch (err) {
    console.error(err.message);
    process.exit(1);
  }
}
```

**Error Testing:**
```javascript
try {
  await db.query(query, params);
} catch (err) {
  console.error('Error:', err.message);
  process.exit(1);
}
```

## Recommended Testing Targets

- Start with backend controller integration tests for `backend/src/features/auth/authRoutes.js`, `backend/src/features/materials/materialsRoutes.js`, and `backend/src/features/student/studentRoutes.js` because these files define externally visible behavior and already return stable JSON shapes.
- Add pure unit tests for `backend/src/utils/sanitize.js` and `frontend/src/core/sanitize.js` because they are deterministic and have no environment setup cost.
- Add focused frontend tests around `frontend/src/core/api.js` and `frontend/src/core/auth-manager.js` if you introduce a runner, since they centralize auth/session behavior used by every dashboard module.
- Treat large page controllers such as `frontend/src/modules/admin/admin-dashboard.js` and `frontend/src/modules/teacher/teacher-dashboard.js` as integration-test targets rather than unit-test targets unless they are first split into smaller DOM helpers.

## Practical Rules

- Assume there is no existing automated testing contract; any new tests must establish their own harness and scripts.
- Until a runner is introduced, keep manual verification steps close to the changed feature and prefer small executable smoke scripts like `test-materials-api.js` over undocumented one-off terminal commands.
- When adding a formal test stack, preserve the current API envelope conventions (`{ data }`, `{ success }`, `{ error }`) from `backend/src/features/*` controllers so tests can lock behavior rather than implementation details.

---

*Testing analysis: 2026-04-19*
