In @backend/src/features/attendance/Attendance.js around lines 113 - 133, getAttendancePercentage currently injects the days value into the SQL via string interpolation (INTERVAL '${days} days'), opening an SQL injection risk; instead validate/coerce days to a non-negative integer in JavaScript (e.g., Number.isInteger and clamp), compute a startDate = now - days2460601000 in JS, and pass that startDate as a parameter to the query (replace the INTERVAL clause with a parameterized WHERE date >= $2 and include startDate in the parameters array) so the SQL uses only prepared parameters and not interpolated strings; update function getAttendancePercentage and its pool.query call and parameter list accordingly.

============================================================================
File: backend/src/features/teacher/teacherRoutes.js
Line: 381 to 400
Type: potential_issue

Comment:
Missing authorization: teacher's class assignment is not verified before marking attendance.

Any authenticated teacher can mark attendance for any class/section. This should validate permission similar to other attendance endpoints.



Proposed fix - add permission check before transaction

     if (!Array.isArray(records) || records.length === 0)
       return res.status(400).json({ success: false, error: 'records array required' });

+    // Verify teacher has permission for all classes/sections in records
+    const uniqueClassSections = [...new Set(records.map(r => ${r.classLevel}:${r.section || 'A'}))];
+    for (const cs of uniqueClassSections) {
+      const [classLevel, section] = cs.split(':');
+      const hasPermission = await checkTeacherClassPermission(pool, teacher.id, classLevel, section);
+      if (!hasPermission) {
+        return res.status(403).json({ success: false, error: Not authorized for class ${classLevel} section ${section} });
+      }
+    }
+
     const client = await pool.connect();

Prompt for AI Agent:
Verify each finding against the current code and only fix it if needed.

In @backend/src/features/teacher/teacherRoutes.js around lines 381 - 400, Before starting the DB transaction that writes attendance, validate the authenticated teacher's assignment for each record's class_level/section: query the teacher assignment (using the current teacher id from the request context) and ensure they are authorized to mark attendance for r.classLevel and r.section (or default 'A'); if any record is outside their assigned classes, return a 403 and do not open the transaction. Apply this check in the same route handler that uses pool.connect() and iterates over records (the block referencing client, records, r.studentId, r.classLevel, r.section, r.date) so the permission check always runs before BEGIN/COMMIT/ROLLBACK.

============================================================================
File: backend/src/features/admin/adminRoutes.js
Line: 434 to 447
Type: potential_issue

Comment:
No overlap/conflict check when creating timetable entries.

The POST handler inserts timetable entries without validating if the teacher or class/section already has a slot at the overlapping time. This could lead to scheduling conflicts.



Would you like me to generate an overlap check query to add before insertion?

Prompt for AI Agent:
Verify each finding against the current code and only fix it if needed.

In @backend/src/features/admin/adminRoutes.js around lines 434 - 447, Add a pre-insert overlap check in the router.post('/timetable') handler: before running the INSERT (the req.db.query that returns result.rows[0]) query the timetable table for the same day_of_week and school_id where times overlap using the condition NOT (end_time = $end), checking both teacher_id OR (class_level AND section) conflicts; if any rows are returned respond with 409 and a clear conflict message instead of inserting, otherwise proceed with the INSERT as implemented.

============================================================================
File: backend/src/features/admin/adminRoutes.js
Line: 214 to 215
Type: potential_issue

Comment:
ACCESS EXCLUSIVE lock severely impacts concurrency.

This lock blocks all concurrent reads and writes to the students table. During high-enrollment periods, this will serialize all student creation requests and potentially cause timeouts.

Consider using FOR UPDATE row-level locking on a counter table, or use a database sequence for roll number generation instead.



Alternative approach using a sequence

-- Create sequence per class/section pattern
CREATE SEQUENCE IF NOT EXISTS roll_number_seq;

-- Or use advisory locks for lighter-weight coordination
SELECT pg_advisory_xact_lock(hashtext($1))  -- lock on class+section key

Prompt for AI Agent:
Verify each finding against the current code and only fix it if needed.

In @backend/src/features/admin/adminRoutes.js around lines 214 - 215, The current code uses client.query('LOCK TABLE students IN ACCESS EXCLUSIVE MODE') which blocks all reads/writes and kills concurrency; replace this with a lighter coordination strategy: either create/use a DB sequence (e.g., roll_number_seq) and call nextval() to generate roll numbers instead of locking the table, or acquire a transaction-scoped advisory lock (SELECT pg_advisory_xact_lock(hashtext(class_section_key))) before generating a roll and commit, or if you must maintain a counter table use SELECT counter FROM roll_counters WHERE key=$1 FOR UPDATE to lock only the counter row; update the code around client.query('BEGIN') and the lock query to call the chosen mechanism (nextval() or pg_advisory_xact_lock(...) or SELECT ... FOR UPDATE on roll_counters) and remove the ACCESS EXCLUSIVE table lock.

============================================================================
File: frontend/src/modules/admin/admin-pending-approvals.js
Line: 425 to 431
Type: potential_issue

Comment:
Bug: data-user-id attribute is never set on rendered elements.

The code attempts to select and remove elements using document.querySelector('[data-user-id="${userId}"]'), but the renderPendingUsers function doesn't add data-user-id attributes to the table rows or mobile cards. The DOM removal will silently fail.




🐛 Fix: Add data-user-id to rendered elements

In renderPendingUsers, add the attribute to table rows:

-
+


And to mobile cards:

-
+


Alternatively, since you're already filtering and re-rendering when the list changes, you could simply call renderPendingUsers() after updating the pendingUsers array instead of manually manipulating the DOM.

Prompt for AI Agent:
Verify each finding against the current code and only fix it if needed.

In @frontend/src/modules/admin/admin-pending-approvals.js around lines 425 - 431, The removal selector fails because rendered elements lack the data-user-id attribute; update renderPendingUsers to set data-user-id on each generated element (e.g., on table row elements and mobile card elements) using the userId so document.querySelector([data-user-id="${userId}"]) can find them, or instead remove the direct DOM-manipulation and simply call renderPendingUsers() after updating the pendingUsers array (referencing renderPendingUsers and pendingUsers in your patch).

============================================================================
File: backend/src/features/teacher/teacherRoutes.js
Line: 408 to 449
Type: potential_issue

Comment:
Missing authorization: teacher's class assignment is not verified.

Similar to the mark-bulk endpoint, any authenticated teacher can view attendance summary for any class. Consider adding a permission check:



Proposed fix

     const teacher = await requireTeacher(req, teacherId);
     if (!teacher) return res.status(403).json({ success: false, error: 'Unauthorized' });

+    if (!classLevel) return res.status(400).json({ success: false, error: 'classLevel required' });
+
+    const hasPermission = await checkTeacherClassPermission(pool, teacher.id, classLevel, section);
+    if (!hasPermission) {
+      return res.status(403).json({ success: false, error: 'Not authorized for this class' });
+    }
+
     let query = `SELECT s.name, s.id AS student_id,

Prompt for AI Agent:
Verify each finding against the current code and only fix it if needed.

In @backend/src/features/teacher/teacherRoutes.js around lines 408 - 449, The route handler for GET /attendance/summary currently only authenticates via requireTeacher but does not verify that the teacher is assigned to the requested class/section; add an authorization check immediately after const teacher = await requireTeacher(req, teacherId) that verifies the teacher's assignment for the requested classLevel (and section when provided) — e.g., check teacher.assignedClasses or teacher.classLevels/includes(classLevel) and if section is used also verify the section matches; if the teacher is not assigned return res.status(403).json({ success: false, error: 'Unauthorized' }) and do not run the attendance query; you can mirror the permission check logic used in the mark-bulk endpoint (or extract into a helper like verifyTeacherAssignment(teacher, classLevel, section)) and call it here.

============================================================================
File: frontend/src/modules/admin/admin-pending-approvals.js
Line: 140 to 145
Type: potential_issue

Comment:
Potential XSS risk when rendering error messages.

The error.message is interpolated directly into innerHTML. While typically error messages are safe, if an attacker can influence the error (e.g., via a crafted server response), this could lead to XSS.




🛡️ Suggested fix using textContent

     } catch (error) {
         console.error('❌ Error fetching pending users:', error);
         const errorMsg = 'Error loading pending users: ' + error.message;
         showMessage(errorMsg, 'error');
-        listContainer.innerHTML = ${errorMsg}Make sure the backend server is running.;
+        const errorDiv = document.createElement('div');
+        errorDiv.style.cssText = 'padding: 20px; text-align: center; color: #d32f2f;';
+        const msgP = document.createElement('p');
+        msgP.textContent = errorMsg;
+        const hintP = document.createElement('p');
+        hintP.style.cssText = 'font-size: 0.9em; margin-top: 10px;';
+        hintP.textContent = 'Make sure the backend server is running.';
+        errorDiv.appendChild(msgP);
+        errorDiv.appendChild(hintP);
+        listContainer.innerHTML = '';
+        listContainer.appendChild(errorDiv);
     }

Prompt for AI Agent:
Verify each finding against the current code and only fix it if needed.

In @frontend/src/modules/admin/admin-pending-approvals.js around lines 140 - 145, The error rendering uses innerHTML with interpolated error.message (in the catch block handling fetch failures), creating an XSS risk; change the code that sets listContainer.innerHTML to instead build DOM nodes and assign text via textContent (or escape the message) so untrusted error.message is never inserted as HTML—locate the catch block around listContainer and showMessage and replace the template-string innerHTML assignment with element creation (e.g., wrapper div, p elements) and set their textContent to the composed errorMsg; also ensure any call to showMessage that passes errorMsg handles it as plain text.

============================================================================
File: backend/src/features/teacher/teacherRoutes.js
Line: 307 to 320
Type: potential_issue

Comment:
Authorization inconsistency: only teacher_class_assignment is checked, not subject_assignments.

Other attendance routes (/classes, /sections) check both subject_assignments and teacher_class_assignment, but this route only checks teacher_class_assignment. Teachers assigned via subject_assignments will pass the class/section selection but receive a 403 when fetching the attendance sheet.

Consider using the existing checkTeacherClassPermission helper for consistency:



Proposed fix

-    // Verify teacher assignment
-    let assignmentCheck;
-    if (section) {
-      assignmentCheck = await pool.query(
-        SELECT id FROM teacher_class_assignment
-             WHERE teacher_id = $1 AND class_level = $2 AND (section = $3 OR section = 'ALL' OR section IS NULL),
-        [teacher.id, classLevel, section]
-      );
-    } else {
-      assignmentCheck = await pool.query(
-        SELECT id FROM teacher_class_assignment
-             WHERE teacher_id = $1 AND class_level = $2,
-        [teacher.id, classLevel]
-      );
-    }
-
-    if (assignmentCheck.rows.length === 0) {
+    // Verify teacher assignment using consistent helper
+    const hasPermission = await checkTeacherClassPermission(pool, teacher.id, classLevel, section);
+    if (!hasPermission) {
       const timetableCheck = await pool.query(

Prompt for AI Agent:
Verify each finding against the current code and only fix it if needed.

In @backend/src/features/teacher/teacherRoutes.js around lines 307 - 320, The route currently only checks teacher_class_assignment (assignmentCheck) causing teachers with entries in subject_assignments to be unauthorized; replace the manual authorization block with the shared helper checkTeacherClassPermission (or call it to validate permissions) passing teacher.id, classLevel, and section, or if you prefer keep inline logic, extend the check to also consider subject_assignments (e.g., OR existence in subject_assignments for that teacher/class/section); update where assignmentCheck is set and the subsequent 403 branch to use the helper result so authorization matches other routes like /classes and /sections.

============================================================================
File: frontend/src/modules/admin/admin-pending-approvals.js
Line: 452 to 470
Type: refactor_suggestion

Comment:
Inconsistent API pattern: Use adminAPI instead of direct fetch.

This function bypasses the adminAPI wrapper and makes a direct fetch call, duplicating token handling and base URL logic. The approveUser function uses adminAPI.approveUser() — consider extending that API method to accept optional classesAssigned rather than maintaining two different patterns.




♻️ Suggested approach

Extend adminAPI.approveUser to accept an optional second parameter:

// In api.js
approveUser: (userId, classesAssigned = null) => {
    const body = classesAssigned ? { classesAssigned } : {};
    return apiCall(/api/auth/admin/approve-user/${userId}, 'POST', body);
}


Then in this file:

 async function approveUserWithClasses(userId, classesAssigned) {
     try {
         window.closeClassAssignmentModal();
-
-        const authStr = sessionStorage.getItem('auth') || localStorage.getItem('auth');
-        const auth = authStr ? JSON.parse(authStr) : {};
-        const token = auth.token;
-
-        const baseUrl = window.location.hostname === 'localhost' ? 'http://localhost:3000' : 'https://schoolapp-d9y5.onrender.com';
-
-        // Make API call with class assignments
-        const response = await fetch(${baseUrl}/api/auth/admin/approve-user/${userId}, {
-            method: 'POST',
-            headers: {
-                'Content-Type': 'application/json',
-                'Authorization': Bearer ${token}
-            },
-            body: JSON.stringify({ classesAssigned })
-        });
-
-        const data = await response.json();
+        const data = await adminAPI.approveUser(userId, classesAssigned);

Prompt for AI Agent:
Verify each finding against the current code and only fix it if needed.

In @frontend/src/modules/admin/admin-pending-approvals.js around lines 452 - 470, The approveUserWithClasses function duplicates token/baseUrl logic by calling fetch directly; instead extend the adminAPI.approveUser method to accept an optional classesAssigned parameter (e.g., adminAPI.approveUser(userId, classesAssigned)) so it builds the request body only when classesAssigned is provided and uses the shared apiCall/token handling in api.js, then replace the fetch call in approveUserWithClasses with a call to adminAPI.approveUser(userId, classesAssigned) and remove the manual token/baseUrl/fetch logic from this function.

============================================================================
File: backend/src/features/admin/adminRoutes.js
Line: 649
Type: potential_issue

Comment:
Unused variable title.

The title is destructured from req.body but never used in the query or response.



Remove or use the variable

- const { content, title } = req.body;
+ const { content } = req.body;


Or if title should be stored, add it to the INSERT/UPDATE query.

Prompt for AI Agent:
Verify each finding against the current code and only fix it if needed.

In @backend/src/features/admin/adminRoutes.js at line 649, The handler currently destructures title from req.body (const { content, title } = req.body) but never uses it; either remove title from the destructuring to avoid an unused variable, or if the title should be persisted, add title to the SQL INSERT/UPDATE and the values array and include it in any returned object/response (update the query referenced in this route handler and ensure any createOrUpdate function/DB call receives the title parameter).

============================================================================
File: backend/src/features/admin/adminRoutes.js
Line: 541 to 545
Type: potential_issue

Comment:
CROSS JOIN with organizations assumes single organization.

If multiple organizations exist, this will return the user's profile repeated for each organization. Consider using the user's organization ID to join explicitly, or ensure only one organization row exists.



Safer approach

- FROM users u
- CROSS JOIN organizations o
- WHERE u.id = $1
+ FROM users u
+ LEFT JOIN organizations o ON o.id = u.organization_id
+ WHERE u.id = $1

Prompt for AI Agent:
Verify each finding against the current code and only fix it if needed.

In @backend/src/features/admin/adminRoutes.js around lines 541 - 545, The query uses a CROSS JOIN on organizations which multiplies rows if multiple organizations exist; modify the SQL in adminRoutes.js to join organizations using the user's organization id (e.g., replace "CROSS JOIN organizations o" with "JOIN organizations o ON o.id = u.organization_id") so the query returns the single organization for the user, keep the WHERE u.id = $1 and the same parameter [req.user.userId]; confirm the correct user→organization foreign key name (u.organization_id) before applying.

============================================================================
File: frontend/src/modules/admin/admin-pending-approvals.js
Line: 172 to 225
Type: potential_issue

Comment:
Critical XSS vulnerability: User data rendered without escaping.

User-provided data (user.name, user.email, user.phone, user.classLevel, user.section, user.role) is interpolated directly into innerHTML. If any of these fields contain malicious HTML/JavaScript, it will execute in the admin's browser.




🛡️ Suggested fix: Add an escape helper and use it

Add this helper function near the top of the file:

function escapeHtml(str) {
    if (str == null) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(//g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}


Then escape all user data before interpolation:

-                        ${user.name || 'N/A'}
+                        ${escapeHtml(user.name) || 'N/A'}


Apply similar escaping to user.email, user.phone, user.role, user.classLevel, and user.section in both the table and mobile card renderers.

Prompt for AI Agent:
Verify each finding against the current code and only fix it if needed.

In @frontend/src/modules/admin/admin-pending-approvals.js around lines 172 - 225, The template currently assigns user-controlled strings directly into listContainer.innerHTML (via pendingUsers.map) causing an XSS risk; add an escapeHtml helper function (as described in the review) near the top of the file and use it to escape all interpolated user fields inside the pendingUsers.map template—specifically escape user.name, user.email, user.phone, user.classLevel, user.section, user.role (and any other user.* values used in the same file, including the mobile/card renderer and values used inside onclick attributes like approveUserHandler/showRejectModal by passing only numeric ids or using data-attributes instead of raw interpolation). Ensure you replace direct ${...} insertions with escaped values (e.g., escapeHtml(user.name)) and avoid injecting unescaped HTML into innerHTML.

============================================================================
File: backend/src/features/admin/adminRoutes.js
Line: 87
Type: potential_issue

Comment:
Hardcoded schoolId limits multi-tenancy.

The hardcoded 'school-001' appears here and in multiple other locations (lines 105, 440). If multi-tenant support is planned, extract this from req.user or request context.



Suggested approach

- const user = await createUser(req.db, { name, phone, email, password, role, schoolId: 'school-001', username, status: 'active', teacherId });
+ const schoolId = req.user.schoolId || 'school-001';
+ const user = await createUser(req.db, { name, phone, email, password, role, schoolId, username, status: 'active', teacherId });

Prompt for AI Agent:
Verify each finding against the current code and only fix it if needed.

In @backend/src/features/admin/adminRoutes.js at line 87, The createUser call in adminRoutes.js is using a hardcoded schoolId ('school-001') which breaks multi-tenancy; change all createUser invocations (and any other places setting schoolId) to derive schoolId from the request context (e.g., req.user.schoolId or req.user.tenantId) instead of a literal. Update the createUser call that currently passes { name, phone, email, password, role, schoolId: 'school-001', username, status: 'active', teacherId } to use a validated value like const schoolId = req.user && req.user.schoolId; if missing return a 400/403; then pass schoolId into createUser; apply the same change for the other occurrences that set schoolId so tenants are correctly scoped.

============================================================================
File: backend/src/features/admin/adminRoutes.js
Line: 449 to 457
Type: potential_issue

Comment:
DELETE returns success even if no row was deleted.

The delete operation doesn't verify if a row was actually deleted, potentially misleading the client.



Suggested fix

 router.delete('/timetable/:id', async (req, res) => {
     try {
-        await req.db.query('DELETE FROM timetable WHERE id = $1', [req.params.id]);
-        res.json({ success: true, message: 'Timetable entry deleted' });
+        const result = await req.db.query('DELETE FROM timetable WHERE id = $1 RETURNING id', [req.params.id]);
+        if (result.rowCount === 0) {
+            return res.status(404).json({ success: false, error: 'Timetable entry not found' });
+        }
+        res.json({ success: true, message: 'Timetable entry deleted' });
     } catch (err) {

Prompt for AI Agent:
Verify each finding against the current code and only fix it if needed.

In @backend/src/features/admin/adminRoutes.js around lines 449 - 457, The DELETE route handler for router.delete('/timetable/:id') currently always returns success; change the delete logic to capture the query result (e.g., const result = await req.db.query('DELETE FROM timetable WHERE id = $1', [req.params.id])) and inspect result.rowCount: if rowCount === 0 respond with a 404 (or 400) and an error message indicating the timetable entry was not found, otherwise send the existing success response; keep the existing try/catch and error logging for DB errors.

============================================================================
File: backend/src/features/admin/adminRoutes.js
Line: 199 to 208
Type: potential_issue

Comment:
Date parsing pivot logic will fail after 2030.

The logic parseInt(yy) > 30 ? '19' : '20' means 31 becomes 1931 rather than 2031. This will cause incorrect dates for students born after 2030 (or before 1931). Additionally, no validation ensures the parsed date is actually valid.



Suggested fix with validation

- const year = yy.length === 2 ? (parseInt(yy) > 30 ? 19${yy} : 20${yy}) : yy;
- dobISO = ${year}-${mm.padStart(2, '0')}-${dd.padStart(2, '0')};
+ const currentYear = new Date().getFullYear();
+ const century = currentYear - (currentYear % 100);
+ const pivot = (currentYear % 100) + 10; // 10 years into future
+ const yyNum = parseInt(yy, 10);
+ const year = yy.length === 2 ? (yyNum > pivot ? century - 100 + yyNum : century + yyNum) : parseInt(yy, 10);
+ dobISO = ${year}-${mm.padStart(2, '0')}-${dd.padStart(2, '0')};
+
+ // Validate the date
+ const parsed = new Date(dobISO);
+ if (isNaN(parsed.getTime())) {
+     return res.status(400).json({ success: false, error: 'Invalid date' });
+ }

Prompt for AI Agent:
Verify each finding against the current code and only fix it if needed.

In @backend/src/features/admin/adminRoutes.js around lines 199 - 208, The current two-digit year pivot (parseInt(yy) > 30 ? '19' : '20') is incorrect for post-2030 dates and lacks validation; update the two-digit-year handling to use a sliding-window pivot based on the current year (e.g., construct year = 2000 + parseInt(yy) and if that year > currentYear + 1 subtract 100 to map to 1900s), then build dobISO from dateOfBirth parts (dd, mm, year) and validate the resulting date using the Date object (check that new Date(year, mm-1, dd) matches year/mm/dd and that month/day ranges are valid); if validation fails, return the 400 error. Ensure you update references for dateOfBirth, parts, dobISO, and the two-digit yy handling in the adminRoutes.js parsing block.

============================================================================
File: backend/src/features/admin/adminRoutes.js
Line: 233 to 237
Type: potential_issue

Comment:
Roll number generation using COUNT is fragile.

If students are deleted and new ones added, COUNT(*) + 1 may generate duplicate roll numbers. Even with table locking, this pattern doesn't guarantee uniqueness over time.



Safer approach using MAX

- const countResult = await client.query(
-     SELECT COUNT(*) FROM students WHERE roll_number LIKE $1,
-     [${prefix}%]
- );
- const rollNumber = ${prefix}${(parseInt(countResult.rows[0].count) + 1).toString().padStart(3, '0')};
+ const maxResult = await client.query(
+     SELECT MAX(CAST(SUBSTRING(roll_number FROM $2) AS INTEGER)) as max_num
+      FROM students WHERE roll_number LIKE $1,
+     [${prefix}%, ${prefix.length + 1}]
+ );
+ const nextNum = (maxResult.rows[0].max_num || 0) + 1;
+ const rollNumber = ${prefix}${nextNum.toString().padStart(3, '0')};

Prompt for AI Agent:
Verify each finding against the current code and only fix it if needed.

In @backend/src/features/admin/adminRoutes.js around lines 233 - 237, The current rollNumber logic uses COUNT(*) which can produce duplicates when rows are deleted; replace the COUNT query with a MAX-based query and compute the next suffix from the highest existing roll_number for the same prefix (or better yet use a DB sequence/serial if available). Specifically, change the query that sets countResult to select MAX(roll_number) FROM students WHERE roll_number LIKE $1, then in the rollNumber computation (where rollNumber is currently set using countResult.rows[0].count) parse the numeric suffix from the MAX result (handle null/empty as zero), increment it, and format it with padStart(3,'0') to produce ${prefix}${nextSuffix}; alternatively, add/use a dedicated integer column with a sequence and derive the roll number from that to guarantee uniqueness.

============================================================================
File: backend/src/features/auth/User.js
Line: 223 to 234
Type: potential_issue

Comment:
Race condition and unbounded loop risk in ID generation.

Two issues:
1. TOCTOU race: Between checking uniqueness (line 230) and the eventual INSERT in createUser, another concurrent request could claim the same ID.
2. Unbounded loop: If IDs become saturated, this loops forever (unlikely with 100K slots, but no safeguard).

Consider using a database sequence or handling unique constraint violations with retry logic.




Alternative approach using INSERT with conflict handling

 export const generateTeacherId = async (pool, role) => {
   const prefix = role === 'teacher' ? 'T' : role === 'staff' ? 'S' : 'T';
-  let teacherId;
-  let isUnique = false;
-  while (!isUnique) {
+  const maxAttempts = 10;
+  for (let attempt = 0; attempt

Prompt for AI Agent:
Verify each finding against the current code and only fix it if needed.

In @backend/src/features/auth/User.js around lines 223 - 234, The current generateTeacherId function has a TOCTOU race and no loop bound; add a maxAttempts limit (e.g., 10-20) to generateTeacherId to avoid infinite loops and return an error if exhausted, and move the final uniqueness enforcement to the database by handling unique constraint violations during the actual insert in createUser: wrap the INSERT that uses teacher_id in a retry loop that catches Postgres unique-violation SQLSTATE '23505', regenerates a new teacherId (calling generateTeacherId or inline generator), and retries up to a retry limit before failing; alternatively consider replacing this scheme with a dedicated DB-backed sequence or a small atomic table that generates unique teacher IDs to eliminate the TOCTOU race.

============================================================================
File: frontend/src/modules/admin/admin-pending-approvals.js
Line: 456 to 458
Type: potential_issue

Comment:
Potential runtime error if stored auth is malformed JSON.

If the stored auth value exists but contains invalid JSON, JSON.parse(authStr) will throw an exception that's not caught, causing the approval to fail silently after the modal is closed.




🛡️ Suggested defensive fix

-        const authStr = sessionStorage.getItem('auth') || localStorage.getItem('auth');
-        const auth = authStr ? JSON.parse(authStr) : {};
+        const authStr = sessionStorage.getItem('auth') || localStorage.getItem('auth');
+        let auth = {};
+        try {
+            auth = authStr ? JSON.parse(authStr) : {};
+        } catch (e) {
+            console.error('Failed to parse auth:', e);
+            showMessage('Authentication error. Please log in again.', 'error');
+            return;
+        }

Prompt for AI Agent:
Verify each finding against the current code and only fix it if needed.

In @frontend/src/modules/admin/admin-pending-approvals.js around lines 456 - 458, The code reads authStr from sessionStorage/localStorage and calls JSON.parse(authStr) directly which can throw on malformed JSON; wrap the parse in a try/catch (or use a safeParse helper) so that if JSON.parse throws you fall back to an empty object and continue; update the logic around authStr/auth/token (variables authStr, auth, token) to catch parse errors and set auth = {} when parsing fails so token becomes undefined instead of crashing the approval flow.

============================================================================
File: frontend/src/modules/admin/admin-dashboard.js
Line: 4745 to 4748
Type: potential_issue

Comment:
Undefined function: openChangePasswordModal is referenced but not defined.

The function openChangePasswordModal() is called when the 'change-password' action is triggered, but it's not defined in this file. This will cause a runtime error when users try to change their password.




🐛 Proposed fix - add stub or implement

window.openChangePasswordModal = function() {
    // TODO: Implement password change modal
    showInfoAlert('Password change feature coming soon!', 3000);
};


Or implement the full modal functionality if the UI elements exist.

Prompt for AI Agent:
Verify each finding against the current code and only fix it if needed.

In @frontend/src/modules/admin/admin-dashboard.js around lines 4745 - 4748, The switch handler references openChangePasswordModal but that function is not defined, causing a runtime error; add a definition for openChangePasswordModal (either a stub that notifies the user or a full modal implementation) and attach it to the same scope used by the handler (e.g., define window.openChangePasswordModal or export/declare openChangePasswordModal in this module). Ensure the new function matches the other modal helpers (like openEditProfileModal) in naming and behaviour so the case 'change-password' can safely call openChangePasswordModal().

============================================================================
File: frontend/src/modules/admin/admin-dashboard.js
Line: 4929 to 4935
Type: potential_issue

Comment:
Potential stored XSS: Content rendered without sanitization.

The content from the API is rendered directly via innerHTML. While this is a content management system where admins control the content, if an admin account is compromised or content is manipulated, malicious scripts could execute. Consider sanitizing HTML before rendering or using a library like DOMPurify.




🛡️ Proposed mitigation

+// At the top of the file, import or include DOMPurify
+// import DOMPurify from 'dompurify';

 window.cm_previewContent = async function(key) {
   const meta = CM_PAGE_LABELS[key] || { label: key };
   try {
     const res = await adminAPI.getContent(key);
     if (res.success && res.data && res.data.content.trim()) {
       const modal = document.getElementById('cm-preview-modal');
       document.getElementById('cm-preview-title').textContent = 'Preview: ' + meta.label;
-      document.getElementById('cm-preview-body').innerHTML = res.data.content;
+      // Sanitize HTML to prevent XSS from stored content
+      document.getElementById('cm-preview-body').innerHTML = DOMPurify.sanitize(res.data.content);
       document.getElementById('cm-preview-ts').textContent = 'Last updated: ' + new Date(res.data.updated_at).toLocaleString();




DOMPurify sanitize HTML JavaScript

Prompt for AI Agent:
Verify each finding against the current code and only fix it if needed.

In @frontend/src/modules/admin/admin-dashboard.js around lines 4929 - 4935, The preview code assigns API HTML directly into the DOM with document.getElementById('cm-preview-body').innerHTML = res.data.content which risks stored XSS; instead sanitize the HTML before inserting (e.g., call a sanitizer like DOMPurify.sanitize(res.data.content)) and assign the sanitized string to 'cm-preview-body'. Ensure DOMPurify (or your chosen sanitizer) is imported/available in this module and used wherever innerHTML is set for previews (the preview handler that sets 'cm-preview-title', 'cm-preview-body', 'cm-preview-ts' and shows 'cm-preview-modal'); if a sanitizer is unavailable, fall back to inserting plain text via textContent or perform server-side sanitization.

============================================================================
File: backend/src/features/auth/authRoutes.js
Line: 202 to 228
Type: potential_issue

Comment:
ACCESS EXCLUSIVE table lock will cause severe contention.

LOCK TABLE students IN ACCESS EXCLUSIVE MODE blocks all concurrent access (reads and writes) to the entire students table. In production with concurrent registrations, this will serialize all operations and cause timeouts/failures.

Consider using advisory locks scoped to the class/section prefix, or SELECT ... FOR UPDATE on a counter row, rather than locking the entire table.




Proposed fix using advisory lock

       await client.query('BEGIN');
-      await client.query('LOCK TABLE students IN ACCESS EXCLUSIVE MODE');
+      // Use advisory lock scoped to class+section for roll number generation
+      const lockKey = Buffer.from(${classPart}${sectionPart}).reduce((a, b) => a + b, 0);
+      await client.query('SELECT pg_advisory_xact_lock($1)', [lockKey]);

Prompt for AI Agent:
Verify each finding against the current code and only fix it if needed.

In @backend/src/features/auth/authRoutes.js around lines 202 - 228, The current use of LOCK TABLE students IN ACCESS EXCLUSIVE MODE around createUser and the roll-number calculation will block all concurrent access; replace that global table lock with a scoped advisory lock or a row-level counter update: compute a stable key from the prefix (classPart+sectionPart) and call pg_advisory_lock/pg_advisory_unlock via client.query before running the COUNT/UPDATE logic (ensuring the lock is released in finally), or alternatively maintain a per-prefix counter row and use SELECT ... FOR UPDATE on that row to increment and read the counter, then generate the roll number; ensure the locking (pg_advisory_lock or SELECT ... FOR UPDATE) surrounds only the count/increment and username update parts (not createUser unless required) and add proper try/finally to always release the advisory lock.

============================================================================
File: frontend/src/modules/admin/admin-dashboard.js
Line: 4687 to 4695
Type: potential_issue

Comment:
Add null check for log.action before calling .includes().

If log.action is null or undefined, calling .includes() will throw a TypeError.




🛡️ Proposed fix


                         ${new Date(log.created_at).toLocaleString()}
                         ${log.admin_name || 'System'}
-                        ${log.action}
+                        ${log.action || '-'}
                         ${log.entity} (${log.entity_id})
                         ${log.details || '-'}

Prompt for AI Agent:
Verify each finding against the current code and only fix it if needed.

In @frontend/src/modules/admin/admin-dashboard.js around lines 4687 - 4695, The template mapping for tbody.innerHTML can throw when log.action is null/undefined; update the badge class expression in the map (the arrow function mapping log => ...) to guard against null by checking log.action before calling includes (e.g. use log.action && log.action.includes('DELETE') or coalesce to an empty string/log.action?.includes) so the ternary for 'badge-danger' vs 'badge-primary' never calls .includes on null.

============================================================================
File: backend/src/features/auth/authRoutes.js
Line: 25 to 32
Type: potential_issue

Comment:
Trimming inside validation doesn't affect the original value.

The function trims username locally for validation but the caller still holds the untrimmed value. In /check-username (line 44), the raw query parameter is passed to isUsernameTaken. If a user checks " validname " (with spaces), validation passes but the actual stored username comparison may differ.

Consider returning the trimmed value or ensuring isUsernameTaken handles trimming consistently.




Proposed fix

-const validateUsername = (username) => {
-  if (!username || typeof username !== 'string') return 'Username is required';
-  username = username.trim();
-  if (username.length  50) return 'Username must be at most 50 characters';
-  if (!/^[a-zA-Z0-9_]+$/.test(username)) return 'Username can only contain letters, numbers, and underscores';
-  return null;
+const validateUsername = (username) => {
+  if (!username || typeof username !== 'string') return { error: 'Username is required' };
+  const trimmed = username.trim();
+  if (trimmed.length  50) return { error: 'Username must be at most 50 characters' };
+  if (!/^[a-zA-Z0-9_]+$/.test(trimmed)) return { error: 'Username can only contain letters, numbers, and underscores' };
+  return { value: trimmed };
 };

Prompt for AI Agent:
Verify each finding against the current code and only fix it if needed.

In @backend/src/features/auth/authRoutes.js around lines 25 - 32, The validation trims the username only locally in validateUsername, so callers (e.g., the /check-username route that calls isUsernameTaken) still have the original untrimmed value; change the flow so trimming is applied consistently: either update validateUsername to return the trimmed value (e.g., return { error: null, username: trimmed } or similar) or ensure the /check-username route trims req.query.username before calling isUsernameTaken and before storing/using it; update references to validateUsername, isUsernameTaken, and the /check-username handler to use the trimmed username consistently.

============================================================================
File: frontend/src/modules/admin/admin-dashboard.js
Line: 1998 to 2002
Type: potential_issue

Comment:
Critical XSS vulnerability: Student name injected directly into onclick handler.

Same issue as the users table - s.name is interpolated directly into the onclick attribute without escaping.




🔒 Proposed fix


-
-                             Delete Student
+
+                             Delete Student

Prompt for AI Agent:
Verify each finding against the current code and only fix it if needed.

In @frontend/src/modules/admin/admin-dashboard.js around lines 1998 - 2002, The markup currently injects s.name directly into an inline onclick attribute (calling deleteStudentById) creating an XSS vector; replace the inline onclick usage with safe data attributes and a delegated/event-attached handler: render the button with data-student-id and data-student-name (no direct interpolation into an onclick), then in your JS add an event listener that reads e.g. button.dataset.studentId and dataset.studentName and calls deleteStudentById(id, name); update where deleteStudentById is referenced so it is invoked from the JS handler (not via inline onclick) to prevent unescaped HTML/JS execution from s.name.

============================================================================
File: backend/src/features/auth/authRoutes.js
Line: 64 to 70
Type: potential_issue

Comment:
Year 2030 cutoff will cause issues for students born in 2031+.

The logic parseInt(yy) > 30 ? '19${yy}' : '20${yy}' will incorrectly parse "31" as 1931 instead of 2031 starting in a few years. This is a Y2K-style issue that will affect student registrations/logins in the future.

Consider requiring 4-digit years or updating the cutoff dynamically based on the current year.




Proposed fix using dynamic cutoff

       const [dd, mm, yy] = parts;
-      const year = yy.length === 2 ? (parseInt(yy) > 30 ? 19${yy} : 20${yy}) : yy;
+      let year = yy;
+      if (yy.length === 2) {
+        const currentYearSuffix = new Date().getFullYear() % 100;
+        year = parseInt(yy) > currentYearSuffix ? 19${yy} : 20${yy};
+      }
       dobISO = ${year}-${mm.padStart(2,'0')}-${dd.padStart(2,'0')};

Prompt for AI Agent:
Verify each finding against the current code and only fix it if needed.

In @backend/src/features/auth/authRoutes.js around lines 64 - 70, The two-digit year parsing (variables parts -> dd, mm, yy, and creation of year/dobISO) uses a hardcoded cutoff of 30 and will mis-classify future birth years; change the logic to either require 4-digit years or compute the century dynamically using the current year: if yy.length === 4 use it directly, if yy.length === 2 compute const current = new Date().getFullYear(), const cutoff = current % 100 and set year = (parseInt(yy) <= cutoff ? Math.floor(current/100)  100 + parseInt(yy) : (Math.floor(current/100)-1)  100 + parseInt(yy)); then build dobISO from year, mm, dd and update the validation error message to accept DD/MM/YYYY (or DD/MM/YY when you support two-digit with the dynamic mapping).

============================================================================
File: backend/src/features/auth/authRoutes.js
Line: 225 to 229
Type: potential_issue

Comment:
Roll number generation may produce duplicates if students are deleted.

Using COUNT(*) to generate the next roll number will produce duplicates if students with that prefix are ever deleted (creating gaps). For example: 3 students exist → delete one → COUNT returns 2 → next insert gets ...003 which may already exist.

Consider using MAX() on the numeric suffix or a separate sequence/counter table.




Proposed fix using MAX

-      const countResult = await client.query(
-        SELECT COUNT(*) FROM students WHERE roll_number LIKE $1,
+      const maxResult = await client.query(
+        SELECT COALESCE(MAX(CAST(SUBSTRING(roll_number FROM $2) AS INTEGER)), 0) as max_num
+         FROM students WHERE roll_number LIKE $1,
-        [${prefix}%]
+        [${prefix}%, ${prefix.length + 1}]
       );
-      const rollNumber = ${prefix}${(parseInt(countResult.rows[0].count) + 1).toString().padStart(3, '0')};
+      const rollNumber = ${prefix}${(maxResult.rows[0].max_num + 1).toString().padStart(3, '0')};

Prompt for AI Agent:
Verify each finding against the current code and only fix it if needed.

In @backend/src/features/auth/authRoutes.js around lines 225 - 229, The current roll number generation uses COUNT(*) (see countResult and rollNumber) which can produce duplicates when rows are deleted; change the query to compute the maximum numeric suffix for the given prefix (e.g., SELECT MAX(CAST(SUBSTRING(roll_number, LENGTH($1)+1) AS INTEGER)) ...) and then set the next suffix to max+1 (or 1 if null) before padding, or alternatively create/use a dedicated sequence/counter table to atomically produce the next suffix; update the client.query call and rollNumber assignment to use the MAX result (or sequence value) instead of countResult.rows[0].count to ensure unique, gap-tolerant roll numbers.

============================================================================
File: frontend/src/modules/admin/admin-dashboard.js
Line: 1678 to 1682
Type: potential_issue

Comment:
Critical XSS vulnerability: User name injected directly into onclick handler.

The u.name value is inserted directly into the onclick attribute without escaping. A malicious name like '); alert('XSS would break out of the string and execute arbitrary JavaScript.




🔒 Proposed fix using data attributes


-
-                             Delete User
+
+                             Delete User



Then attach event listeners separately:

// After rendering, attach click handlers
document.querySelectorAll('[data-action="delete"][data-user-id]').forEach(btn => {
    btn.addEventListener('click', () => {
        const id = btn.dataset.userId;
        const name = btn.dataset.userName;
        deleteUserById(id, name);
    });
});

Prompt for AI Agent:
Verify each finding against the current code and only fix it if needed.

In @frontend/src/modules/admin/admin-dashboard.js around lines 1678 - 1682, The onclick injects u.name directly causing XSS; stop embedding user-provided strings into attributes and instead render a safe button with data attributes (e.g., data-user-id and data-user-name) and remove the inline onclick on the button, then attach a delegated or per-button event listener after rendering that reads dataset.userId/dataset.userName and calls deleteUserById(id, name). Update the template that currently uses onclick="deleteUserById(${u.id}, '${u.name}')" to output data-action="delete" data-user-id="${u.id}" data-user-name="${u.name}" and add the post-render event hookup to call deleteUserById.

============================================================================
File: frontend/src/modules/admin/admin-dashboard.js
Line: 2595 to 2607
Type: potential_issue

Comment:
XSS risk: Single quotes not escaped in onclick handler.

While escapeHtml is used, it typically doesn't escape single quotes. A name like O'Brien would break the JavaScript string in the onclick handler. Use escapeAttrValue (which is already imported as escapeAttr) or escape single quotes explicitly.




🛡️ Proposed fix

-                            dropdown.innerHTML = filtered.map(s =>
-
+                            dropdown.innerHTML = filtered.map(s =>
+


Or better, use data attributes and event delegation:

dropdown.innerHTML = filtered.map(s =>

).join('');

dropdown.querySelectorAll('.autocomplete-item').forEach(item => {
    item.addEventListener('click', () => selectFeeStudent(
        item.dataset.studentId,
        item.dataset.studentName
    ));
});

Prompt for AI Agent:
Verify each finding against the current code and only fix it if needed.

In @frontend/src/modules/admin/admin-dashboard.js around lines 2595 - 2607, The onclick handler in the dropdown HTML injection uses selectFeeStudent(...) with a name interpolated via escapeHtml which doesn't escape single quotes, allowing XSS for names like O'Brien; change the rendering to avoid inline onclick JS: stop injecting selectFeeStudent(...) into dropdown.innerHTML and instead render data attributes (e.g., data-student-id and data-student-name using escapeAttr/escapeAttrValue) on the .autocomplete-item elements, then attach a delegated click handler or addEventListener to each .autocomplete-item that reads item.dataset.studentId and item.dataset.studentName and calls selectFeeStudent(id, name); alternatively, if you must keep inline handlers, use escapeAttr to escape the name before embedding in the single-quoted onclick string.

============================================================================
File: frontend/src/modules/admin/admin-dashboard.js
Line: 339 to 341
Type: potential_issue

Comment:
Potential XSS: API data inserted into HTML without escaping.

Section values from res.data are inserted directly into the HTML template without escaping. If backend data contains special characters (e.g.,  or "), it could cause XSS or malformed HTML.




🛡️ Proposed fix

                 if (sections.length === 0) {
                     sectionSel.innerHTML = 'No Sections';
                 } else {
                     sectionSel.innerHTML = ${allSectionsLabel} +
-                        sections.map(s => ${s}).join('');
+                        sections.map(s => ${escapeHtml(s)}).join('');

Prompt for AI Agent:
Verify each finding against the current code and only fix it if needed.

In @frontend/src/modules/admin/admin-dashboard.js around lines 339 - 341, The code builds option HTML by interpolating unescaped values into sectionSel.innerHTML using sections and allSectionsLabel, which risks XSS; change to create and append option elements instead of setting innerHTML: clear sectionSel, create an option element for the allSectionsLabel and for each entry in sections (use document.createElement('option'), set option.value and option.textContent to the raw values) and append them to sectionSel so values are safely handled by the DOM APIs (references: sectionSel, sections, allSectionsLabel).

Review completed: 70 findings ✔
moslemuddin@MoslemUddin:/mnt/m/WebDev/projects/tuition-app$ 