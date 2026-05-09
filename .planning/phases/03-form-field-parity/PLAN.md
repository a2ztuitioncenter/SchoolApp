# PLAN: Phase 3 - Form Field Parity & Administrative Refactor

## Context
Phase 3 focuses on ensuring 100% field-level parity for all forms and refactoring User/Student management to follow native mobile standards.

## Proposed Changes

### 1. User Management Refactor
- **[MODIFY] UserDetailsScreen.js**
    - Implement real-time data fetching using `adminService.getUserById` (or similar) to ensure data is fresh.
    - Remove unused `handleToggleStatus` and `handleDelete` methods from this screen.
    - Refactor header to use a single "Edit" icon that navigates to `UserFormScreen`.
    - Improve profile layout with better spacing and iconography.
- **[MODIFY] UserFormScreen.js**
    - Audit all fields to ensure exact match with web backend.
    - Enhance "Account Management" section with modern card-based layout for "Enable/Disable" and "Delete" actions.
    - Ensure correct navigation after delete/update.

### 2. Student Management Refactor
- **[MODIFY] StudentDetailsScreen.js**
    - Align with the new pattern (fresh data fetching, clean header).
- **[MODIFY] StudentFormScreen.js**
    - Ensure field parity with web student registration.
    - Add management options (Delete/Toggle) to the edit form.

### 3. General Form Parity
- **[MODIFY] HomeworkFormScreen.js**
    - Verify fields: Title, Description, Due Date, Class, Section, Subject.
- **[MODIFY] FeeManagementScreen.js**
    - Ensure "Mark as Paid" and "View Receipt" flows are native-smooth.

## Verification Loop
1. **User Flow**: List users -> View Detail -> Click Edit -> Toggle Status -> Save -> Verify in Detail.
2. **Student Flow**: List students -> View Detail -> Click Edit -> Update Info -> Save -> Verify in Detail.
3. **Parity Check**: Compare fields in Mobile with Web.
