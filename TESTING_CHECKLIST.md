# Integration Testing Checklist - Role-Based Registration & Class Access

## Phase 7 Testing Guide

### Prerequisites
- Database schema has been updated (new `teacherId` column, `teacher_class_assignment` table)
- Backend server is running on port 3000
- Frontend is running
- Migration script has been run (optional, but recommended for existing teachers)

---

## 1. Database Schema Verification

### 1.1 Users Table
- [ ] Verify `teacherId` column exists (VARCHAR(20) UNIQUE)
- [ ] Check that teacherId field is nullable
- [ ] Verify existing users' teacherId is NULL

### 1.2 Teacher Class Assignment Table
- [ ] Verify `teacher_class_assignment` table exists with columns:
  - [ ] id (SERIAL PRIMARY KEY)
  - [ ] teacherId (INTEGER FK to users.id)
  - [ ] classLevel (VARCHAR(50))
  - [ ] section (VARCHAR(10), nullable)
  - [ ] assignedAt (TIMESTAMP DEFAULT CURRENT_TIMESTAMP)
  - [ ] schoolId (VARCHAR(50) DEFAULT 'school-001')
  - [ ] UNIQUE constraint on (teacherId, classLevel, section)
- [ ] Verify indexes exist on teacherId and classLevel

---

## 2. Student Registration (No Changes Expected)

### 2.1 Unified Form - Student Path
- [ ] Navigate to signup page
- [ ] Click "Register for A2Z Tuition"
- [ ] Select role: "Student"
- [ ] Verify student-specific fields appear:
  - [ ] Class Level dropdown (9-12)
  - [ ] Section field
  - [ ] Father's Name
  - [ ] Mother's Name
- [ ] Fill form with valid test data
- [ ] Submit registration
- [ ] Verify success message with Roll Number displayed
- [ ] Check database: User created with role='student', status='active', teacherId=NULL
- [ ] Verify student record created with correct roll number format

### 2.2 Student Login
- [ ] Log in with newly created student account
- [ ] Verify student dashboard loads
- [ ] Verify existing student functionality unchanged

---

## 3. Teacher Registration & TeacherId Generation

### 3.1 Unified Form - Teacher Path
- [ ] Navigate to signup page
- [ ] Click "Register for A2Z Tuition"
- [ ] Select role: "Teacher"
- [ ] Verify teacher-specific fields appear:
  - [ ] Email field (required for teacher)
- [ ] Fill form with valid test data (name, phone 10-digit, email, password)
- [ ] Submit registration
- [ ] **Verify success message displays**:
  - [ ] "Teacher Registration Successful!"
  - [ ] TEACHER ID in format T##### (e.g., "T12345")
- [ ] Check database:
  - [ ] User created with role='teacher', status='pending'
  - [ ] teacherId populated with T##### format
  - [ ] teacherId is unique (no duplicates)

### 3.2 Teacher TeacherId Uniqueness
- [ ] Register 2-3 more teachers
- [ ] Verify each has different unique teacherId
- [ ] Verify teacheId format is consistent (T + 5 digits)

### 3.3 Existing Teacher-Register Endpoint (Backwards Compatibility)
- [ ] Use old teacher-register endpoint directly
- [ ] Verify teacher is still created with teacherId
- [ ] Verify response includes teacherId in payload

---

## 4. Staff Registration & ID Generation

### 4.1 Unified Form - Staff Path
- [ ] Navigate to signup page
- [ ] Click "Register for A2Z Tuition"
- [ ] Select role: "Staff"
- [ ] Verify same fields as teacher (email required)
- [ ] Fill form with valid test data
- [ ] Submit registration
- [ ] **Verify success message displays staff ID in format S##### (e.g., "S54321")**
- [ ] Check database:
  - [ ] User created with role='staff', status='pending'
  - [ ] teacherId populated with S##### format
  - [ ] teacherId is unique

---

## 5. Admin Approval Flow - Students

### 5.1 Simple Student Approval
- [ ] Log in as admin
- [ ] Navigate to "Pending Approvals" tab
- [ ] Verify pending student displayed with:
  - [ ] Avatar with initial
  - [ ] Name
  - [ ] Phone
  - [ ] Email
  - [ ] Class & Section info (blue badge)
  - [ ] Date applied
  - [ ] "Approve" and "Reject" buttons
- [ ] Click "Approve" button
- [ ] Confirm approval dialog
- [ ] Verify student card is removed after approval
- [ ] Check database: user.status = 'active'
- [ ] Verify student can now log in

### 5.2 Student Rejection with Reason
- [ ] From pending approvals, click "Reject" on a student
- [ ] Modal appears with title "Reject Registration"
- [ ] Enter rejection reason (e.g., "Invalid contact number")
- [ ] Click "Reject" button
- [ ] Verify card removed
- [ ] Check database: user.status = 'rejected', rejectionReason populated

---

## 6. Admin Approval Flow - Teachers/Staff (CLASS ASSIGNMENT POPUP)

### 6.1 Teacher Approval with Class Selection
- [ ] Log in as admin
- [ ] Navigate to "Pending Approvals"
- [ ] Locate pending teacher (role badge shows "👨‍🏫 Teacher")
- [ ] Click "Approve" button (should say something like "Approve with Classes")
- [ ] **Verify class assignment modal appears with:**
  - [ ] Title: "Assign Classes"
  - [ ] Instructions: "Select the classes this teacher/staff member should have access to:"
  - [ ] Checkboxes for each available class (9, 10, 11, 12)
  - [ ] Each checkbox shows "Class {level}" label
- [ ] Select classes 10 and 11 (multiple selection)
- [ ] Click "Approve & Assign" button
- [ ] Verify modal closes
- [ ] Verify success message: "✅ Teacher approved with class assignments!"
- [ ] Verify teacher card removed from pending list
- [ ] Check database:
  - [ ] user.status = 'active'
  - [ ] teacher_class_assignment has 2 rows (teacherId, classLevel 10 and 11)

### 6.2 Staff Approval with Class Selection
- [ ] Similar test as above but for staff (role='staff', ID format S#####)
- [ ] Verify same class assignment flow works for staff
- [ ] Verify staff can be assigned to specific classes

### 6.3 No Classes Selected Edge Case
- [ ] Click Approve on teacher
- [ ] Modal appears
- [ ] Do NOT select any checkboxes
- [ ] Click "Approve & Assign"
- [ ] Verify alert message: "Please select at least one class"
- [ ] Verify modal stays open

### 6.4 Teacher Rejection
- [ ] Click "Reject" on pending teacher
- [ ] Modal appears for rejection reason
- [ ] Enter reason (e.g., "Credentials not verified")
- [ ] Click "Reject"
- [ ] Verify success message
- [ ] Verify teacher card removed

---

## 7. Teacher Dashboard Access Control

### 7.1 Login as Approved Teacher (Assigned to Classes 9, 10)
- [ ] Log in as the teacher approved for classes 9, 10
- [ ] Navigate to teacher dashboard
- [ ] Dashboard loads successfully
- [ ] **Verify dashboard shows:**
  - [ ] Only classes 9 and 10 in "Classes" list (not 11, 12)
  - [ ] Student count only includes students from classes 9, 10
  - [ ] Homework count matches teacher's homework

### 7.2 Attendance Tab - Class Filter
- [ ] On teacher dashboard, go to "Attendance" tab
- [ ] Verify class dropdown shows only classes 9, 10
- [ ] Class 11, 12 should NOT be available
- [ ] Try selecting class 9 → attendance sheet loads for that class
- [ ] Verify students displayed are from class 9 only

### 7.3 Attendance Direct API Call (Unauthorized Class)
- [ ] Try accessing attendance sheet for class 11 directly (API call)
- [ ] **Verify API returns 403 error**: "You are not assigned to this class"
- [ ] Also test via manual API call to `/api/teacher/attendance/sheet?teacherId=X&classLevel=11&date=...`

### 7.4 Homework - Only from Assigned Classes
- [ ] Create homework for class 9 by this teacher
- [ ] Verify homework displays on dashboard
- [ ] Verify when creating homework, only assigned classes are available in dropdown

### 7.5 Existing Teacher Without New Schema
- [ ] For backwards compatibility, test an existing teacher (old data, no teacherId, no assignments)
- [ ] Teacher dashboard should still work
- [ ] Fallback should use timetable to identify classes
- [ ] Verify no errors produced

---

## 8. No Breaking Changes - Existing Features

### 8.1 Student Registration (Old Endpoint)
- [ ] Old `/api/auth/register` (student-specific) still works
- [ ] New unified `/api/auth/register` works
- [ ] Both create students correctly

### 8.2 Student Approval (Single Button)
- [ ] Existing student approval UI unchanged
- [ ] Still shows simple "Approve" and "Reject" buttons
- [ ] No class assignment popup for students

### 8.3 Admin Dashboard Tabs
- [ ] All existing admin dashboard tabs still work:
  - [ ] Dashboard stats
  - [ ] Users management
  - [ ] Students onboarding
  - [ ] Fees
  - [ ] Homework
  - [ ] Timetable
  - [ ] Attendance
  - [ ] Results
  - [ ] Notifications

### 8.4 Teacher Dashboard Existing Tabs
- [ ] Attendance tab works
- [ ] Homework tab works
- [ ] Materials tab works
- [ ] Exam Results tab works
- [ ] Timetable tab works

---

## 9. Role Login Endpoints (Backwards Compatibility)

### 9.1 Student Login
- [ ] Student login still works at `/api/auth/login`
- [ ] Token generated correctly
- [ ] No status filter changes (students should work regardless of old/new schema)

### 9.2 Teacher Login
- [ ] Teacher login still works at `/api/auth/teacher-login`
- [ ] Only teachers with status='active' can log in
- [ ] Teachers with status='pending' cannot log in
- [ ] Error messages appropriate

### 9.3 Admin Login
- [ ] Admin login works
- [ ] Master credentials work
- [ ] Database credentials work

---

## 10. Data Integrity & Validation

### 10.1 TeacherId Uniqueness Constraint
- [ ] Attempt to manually insert duplicate teacherId (should fail)
- [ ] Database constraint prevents duplicates

### 10.2 Teacher Class Assignment Uniqueness
- [ ] Attempt to assign same teacher to same class twice
- [ ] ON CONFLICT clause handles gracefully (no error, just skips)

### 10.3 Referential Integrity
- [ ] Delete a teacher → teacher_class_assignment rows also deleted (ON DELETE CASCADE)
- [ ] Verify foreign key constraints working

### 10.4 Soft Delete / Archived Teachers
- [ ] Archive a teacher (change status to 'rejected')
- [ ] Verify they cannot log in
- [ ] Verify class assignments still in table (not deleted)

---

## 11. Migration Script Testing (Phase 6)

### 11.1 Run Migration
- [ ] Backup database (optional but recommended)
- [ ] Run migration script: `node backend/migrations/migrate-teachers-to-new-schema.js`
- [ ] No errors during migration
- [ ] Console output shows migration progress

### 11.2 Verify Post-Migration
- [ ] All existing teachers now have teacherId (T##### format)
- [ ] All existing teachers have entries in teacher_class_assignment
- [ ] Classes assigned match their timetable classes
- [ ] Existing teacher logins still work
- [ ] Existing teacher dashboards still work

---

## 12. Error Scenarios & Edge Cases

### 12.1 Invalid Class Assignment
- [ ] Admin tries to approve teacher with empty classesAssigned array
- [ ] Verify backend validation error
- [ ] Approval fails gracefully

### 12.2 Invalid TeacherId Format
- [ ] Manually try to update teacherId to invalid format (e.g., "INVALID123")
- [ ] Verify database constraint allows it but app logic validates
- [ ] Try to set teacherId to NULL for existing teacher (should work, but app should handle)

### 12.3 Duplicate Phone on Registration
- [ ] Try to register teacher with phone same as existing student
- [ ] Verify error: "Phone number already registered"

### 12.4 Invalid Email Format (Teacher)
- [ ] Try to register teacher with invalid email
- [ ] Verify error: "Invalid email format"

### 12.5 Password Mismatch
- [ ] Try registration with password !== confirmPassword
- [ ] Verify error: "Passwords do not match"

---

## 13. Performance & Scalability

### 13.1 Class Assignment Query Performance
- [ ] Verify teacher_class_assignment indexes are working
- [ ] Dashboard loads quickly even with 100+ students
- [ ] Class filter dropdown loads quickly

### 13.2 Backwards Compatibility Query (Fallback to Timetable)
- [ ] If teacher_class_assignment empty, fallback queries timetable
- [ ] Performance acceptable

---

## 14. UI/UX Verification

### 14.1 Role Selector
- [ ] Dropdown shows "Student", "Teacher", "Staff" options
- [ ] Selecting each role conditionally reveals/hides appropriate fields
- [ ] Form validation clear

### 14.2 Class Assignment Modal
- [ ] Modal centered and positioned correctly
- [ ] Checkboxes easily clickable
- [ ] "Approve & Assign" button prominent
- [ ] Responsive on mobile

### 14.3 Success Messages
- [ ] TeacherId/Staff ID displayed in success message after registration
- [ ] Easy to copy/reference
- [ ] Clear indication account pending admin approval

### 14.4 Pending Approvals Card
- [ ] Teacher/Staff approval button text clear ("Approve with Classes" or similar)
- [ ] Student approval button remains unchanged
- [ ] Role icons/badges clearly distinguish roles

---

## 15. Final Checklist Before Production

- [ ] Database backup created
- [ ] Migration script tested in development
- [ ] All unit tests pass (if applicable)
- [ ] All integration tests pass (steps 1-14)
- [ ] No console errors in browser
- [ ] No backend errors in logs
- [ ] Existing student/teacher/admin workflows still work
- [ ] New teacher/staff registration and approval flows work
- [ ] TeacherId generation is unique and consistent
- [ ] Class access control enforced
- [ ] Documentation updated (README, API docs, etc.)
- [ ] Backup database before production deployment
- [ ] Monitor logs after deployment for any errors

---

## Notes

- **TeacherId Format**: T##### for teachers, S##### for staff (5 random digits)
- **Class Assignment**: Assigned during admin approval, stored in teacher_class_assignment table
- **Backwards Compatibility**: Existing teachers without teacherId/assignments still work via timetable fallback
- **Access Control**: Teachers can only access students from their assigned classes
- **Status workflow**: 
  - Student: pending → active (simple button)
  - Teacher/Staff: pending → (admin selects classes) → active
