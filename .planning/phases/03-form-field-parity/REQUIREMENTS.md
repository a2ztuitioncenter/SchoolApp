# Phase 3 Requirements: Form Field Parity

## Objective
Make every mobile form match the web frontend exactly in:
- Fields
- Field names (keys)
- Types (text, number, select, date, file, etc.)
- Validation rules
- Required/optional status
- Default values
- Conditional visibility
- Payload structure sent to API

## Analysis Scope
For EACH form (Onboarding, Registration, User, Student, etc.):

### 1. Extract Fields
For every field capture:
- Label (UI)
- Key (API field name)
- Type (text, email, select, date, file, etc.)
- Required or optional
- Default value
- Placeholder

### 2. Extract Validation Rules
- Required fields
- Min/max length
- Format rules (email, phone, etc.)
- Conditional logic

### 3. Extract Payload Structure
- Final JSON sent to backend
- Nested fields
- Arrays / objects

### 4. Extract UI Flow
- Single-step or multi-step form
- Section grouping
- Submission trigger

## Mobile Implementation Rules
- DO NOT invent new fields
- DO NOT omit any existing field
- DO NOT rename keys
- DO NOT change validation logic
- DO NOT change payload structure
- Web frontend is the single source of truth
- Match web behavior for file/date handling
- Keep UX native but logic identical (e.g., use Bottom Sheets or Full-screen forms as established in Phase 2)

## Constraints
- DO NOT modify backend
- DO NOT redesign UI unnecessarily
- API request body must match web 1:1
