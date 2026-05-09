# Phase 3 Research Plan: Form Field Parity

## Objective
Analyze all forms in the web frontend and document their structure, validation, and payload to ensure mobile parity.

## Target Files (Web)
- `frontend/admin-dashboard.html`: Admin forms (User, Student, Homework, Fees, Materials, etc.)
- `frontend/student-dashboard.html`: Student-side forms (Profile, etc.)
- `frontend/teacher-dashboard.html`: Teacher-side forms (Attendance, Homework, etc.)
- `frontend/src/core/auth-modal.js`: Login and Unified Registration forms.
- `frontend/src/core/unified-register.js`: Registration logic.

## Analysis Checklist
For each form found in the target files:
1. **Identify Fields**: Label, API Key, Type, Required/Optional, Default.
2. **Validation Rules**: Client-side constraints (regex, min/max, required).
3. **Payload Structure**: JSON body sent to API (captured from JS handlers).
4. **Conditional Logic**: Fields that show/hide based on other inputs.

## Target Files (Mobile)
- `mobile-app/screens/admin/UserFormScreen.js`
- `mobile-app/screens/admin/StudentFormScreen.js`
- `mobile-app/screens/admin/HomeworkFormScreen.js`
- `mobile-app/screens/LoginScreen.js` (and Registration if exists)

## Deliverables
- Comparison tables for each form (Web vs Mobile).
- List of missing/extra fields and validation mismatches.
