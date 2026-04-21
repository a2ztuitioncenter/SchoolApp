# Graph Report - M:\WebDev\projects\tuition-app  (2026-04-21)

## Corpus Check
- 66 files · ~202,008 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 407 nodes · 606 edges · 51 communities detected
- Extraction: 89% EXTRACTED · 11% INFERRED · 0% AMBIGUOUS · INFERRED: 68 edges (avg confidence: 0.8)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- [[_COMMUNITY_Community 0|Community 0]]
- [[_COMMUNITY_Community 1|Community 1]]
- [[_COMMUNITY_Community 2|Community 2]]
- [[_COMMUNITY_Community 3|Community 3]]
- [[_COMMUNITY_Community 4|Community 4]]
- [[_COMMUNITY_Community 5|Community 5]]
- [[_COMMUNITY_Community 6|Community 6]]
- [[_COMMUNITY_Community 7|Community 7]]
- [[_COMMUNITY_Community 8|Community 8]]
- [[_COMMUNITY_Community 9|Community 9]]
- [[_COMMUNITY_Community 10|Community 10]]
- [[_COMMUNITY_Community 11|Community 11]]
- [[_COMMUNITY_Community 12|Community 12]]
- [[_COMMUNITY_Community 13|Community 13]]
- [[_COMMUNITY_Community 14|Community 14]]
- [[_COMMUNITY_Community 15|Community 15]]
- [[_COMMUNITY_Community 16|Community 16]]
- [[_COMMUNITY_Community 17|Community 17]]
- [[_COMMUNITY_Community 18|Community 18]]
- [[_COMMUNITY_Community 19|Community 19]]
- [[_COMMUNITY_Community 20|Community 20]]
- [[_COMMUNITY_Community 21|Community 21]]
- [[_COMMUNITY_Community 22|Community 22]]
- [[_COMMUNITY_Community 23|Community 23]]
- [[_COMMUNITY_Community 24|Community 24]]
- [[_COMMUNITY_Community 25|Community 25]]
- [[_COMMUNITY_Community 26|Community 26]]
- [[_COMMUNITY_Community 27|Community 27]]
- [[_COMMUNITY_Community 28|Community 28]]
- [[_COMMUNITY_Community 29|Community 29]]
- [[_COMMUNITY_Community 30|Community 30]]
- [[_COMMUNITY_Community 31|Community 31]]
- [[_COMMUNITY_Community 32|Community 32]]
- [[_COMMUNITY_Community 33|Community 33]]
- [[_COMMUNITY_Community 34|Community 34]]
- [[_COMMUNITY_Community 35|Community 35]]
- [[_COMMUNITY_Community 36|Community 36]]
- [[_COMMUNITY_Community 37|Community 37]]
- [[_COMMUNITY_Community 38|Community 38]]
- [[_COMMUNITY_Community 39|Community 39]]
- [[_COMMUNITY_Community 40|Community 40]]
- [[_COMMUNITY_Community 41|Community 41]]
- [[_COMMUNITY_Community 42|Community 42]]
- [[_COMMUNITY_Community 43|Community 43]]
- [[_COMMUNITY_Community 44|Community 44]]
- [[_COMMUNITY_Community 45|Community 45]]
- [[_COMMUNITY_Community 46|Community 46]]
- [[_COMMUNITY_Community 47|Community 47]]
- [[_COMMUNITY_Community 48|Community 48]]
- [[_COMMUNITY_Community 49|Community 49]]
- [[_COMMUNITY_Community 50|Community 50]]

## God Nodes (most connected - your core abstractions)
1. `showErrorAlert()` - 16 edges
2. `loadTabContent()` - 13 edges
3. `loadDashboardData()` - 12 edges
4. `editMaterial()` - 11 edges
5. `initDashboard()` - 10 edges
6. `showError()` - 9 edges
7. `sanitizeText()` - 8 edges
8. `sanitizeNullableText()` - 8 edges
9. `getAuth()` - 8 edges
10. `loadDashboardData()` - 8 edges

## Surprising Connections (you probably didn't know these)
- `getExamResults()` --calls--> `loadExamResults()`  [INFERRED]
  M:\WebDev\projects\tuition-app\backend\src\features\teacher\examController.js → M:\WebDev\projects\tuition-app\frontend\src\modules\teacher\teacher-dashboard.js
- `waitForBackend()` --calls--> `initDashboard()`  [INFERRED]
  M:\WebDev\projects\tuition-app\frontend\src\core\api.js → M:\WebDev\projects\tuition-app\frontend\src\modules\admin\admin-dashboard.js
- `getAttendanceByStudentId()` --calls--> `getStudentAttendance()`  [INFERRED]
  M:\WebDev\projects\tuition-app\backend\src\features\attendance\Attendance.js → M:\WebDev\projects\tuition-app\backend\src\features\student\dataController.js
- `createExamResult()` --calls--> `submitExamResult()`  [INFERRED]
  M:\WebDev\projects\tuition-app\backend\src\features\teacher\examController.js → M:\WebDev\projects\tuition-app\frontend\src\modules\teacher\teacher-dashboard.js
- `setAuth()` --calls--> `handleAdminLogin()`  [INFERRED]
  M:\WebDev\projects\tuition-app\frontend\src\core\auth-manager.js → M:\WebDev\projects\tuition-app\frontend\src\modules\admin\admin-login.js

## Communities

### Community 0 - "Community 0"
Cohesion: 0.06
Nodes (38): getFilteredMaterials(), hideInfoAlert(), initAttendanceTab(), initDashboard(), initFeesTab(), initMaterialsTab(), initPendingApprovalsTab(), loadAllHomework() (+30 more)

### Community 1 - "Community 1"
Cohesion: 0.1
Nodes (28): createExamSubjectRow(), getFilteredMaterials(), hideInfo(), initAttendanceTab(), initExamTab(), loadDashboard(), loadExamResults(), loadHomework() (+20 more)

### Community 2 - "Community 2"
Cohesion: 0.11
Nodes (25): createExamResult(), getExamResults(), assertTeacherScope(), editMaterial(), listMaterials(), removeMaterial(), toApiMaterial(), uploadMaterial() (+17 more)

### Community 3 - "Community 3"
Cohesion: 0.11
Nodes (22): displayStudentFeeHistory(), formatDate(), formatTime(), getClassStatus(), getCurrentTimeInMinutes(), getStatusLabel(), isDayToday(), loadDashboardData() (+14 more)

### Community 4 - "Community 4"
Cohesion: 0.08
Nodes (5): requireTeacher(), getUserById(), getUserByPhone(), getUserByPhoneOrUsername(), getUserByUsername()

### Community 5 - "Community 5"
Cohesion: 0.09
Nodes (4): getByStudent(), addFee(), getFeesByStudent(), getStudentById()

### Community 6 - "Community 6"
Cohesion: 0.15
Nodes (19): handleAdminLogin(), showError(), showSuccess(), clearAuth(), getAuth(), getUserId(), getUserName(), getUserRole() (+11 more)

### Community 7 - "Community 7"
Cohesion: 0.17
Nodes (20): setAuth(), clearMessages(), handleAdminLoginModal(), handleStudentLoginModal(), handleStudentSignupModal(), handleTeacherLoginModal(), handleTeacherSignupModal(), openAuthLoginSelector() (+12 more)

### Community 8 - "Community 8"
Cohesion: 0.28
Nodes (9): getAttendanceByStudentId(), getAttendancePercentage(), getAttendanceSummary(), getStudentAttendance(), getStudentByUserId(), getStudentDashboard(), getStudentFees(), getAllStudentFees() (+1 more)

### Community 9 - "Community 9"
Cohesion: 0.2
Nodes (0): 

### Community 10 - "Community 10"
Cohesion: 0.39
Nodes (8): handleLoginCardClick(), init(), setupGetStartedHandler(), setupGetStartedTypingAnimation(), setupHeaderLoginHandler(), setupHeaderSignupHandler(), setupHeroTextAnimation(), setupLoginCardHandlers()

### Community 11 - "Community 11"
Cohesion: 0.39
Nodes (7): approveUser(), approveUserWithClasses(), fetchPendingUsers(), rejectUser(), renderEmptyState(), renderPendingUsers(), showMessage()

### Community 12 - "Community 12"
Cohesion: 0.43
Nodes (6): applyExamFilters(), fetchExamResultsFromAPI(), initExamResults(), renderExamResultsTable(), transformAPIData(), updateExamSummary()

### Community 13 - "Community 13"
Cohesion: 0.29
Nodes (0): 

### Community 14 - "Community 14"
Cohesion: 0.29
Nodes (2): handleHomeworkDelete(), deleteHomework()

### Community 15 - "Community 15"
Cohesion: 0.38
Nodes (4): apiCall(), downloadFile(), getAuthToken(), waitForBackend()

### Community 16 - "Community 16"
Cohesion: 0.52
Nodes (6): fetchStudentResult(), initStudentResults(), renderStudentResult(), showEmptyState(), showErrorState(), transformResultData()

### Community 17 - "Community 17"
Cohesion: 0.5
Nodes (3): createDefaultAdmin(), initializeDatabase(), startServer()

### Community 18 - "Community 18"
Cohesion: 0.4
Nodes (0): 

### Community 19 - "Community 19"
Cohesion: 0.67
Nodes (2): escapeAttr(), escapeHtml()

### Community 20 - "Community 20"
Cohesion: 0.83
Nodes (3): applyLightTheme(), initTheme(), toggleTheme()

### Community 21 - "Community 21"
Cohesion: 1.0
Nodes (2): generateTeacherId(), migrateTeachers()

### Community 22 - "Community 22"
Cohesion: 0.67
Nodes (0): 

### Community 23 - "Community 23"
Cohesion: 0.67
Nodes (0): 

### Community 24 - "Community 24"
Cohesion: 0.67
Nodes (0): 

### Community 25 - "Community 25"
Cohesion: 1.0
Nodes (0): 

### Community 26 - "Community 26"
Cohesion: 1.0
Nodes (0): 

### Community 27 - "Community 27"
Cohesion: 1.0
Nodes (0): 

### Community 28 - "Community 28"
Cohesion: 1.0
Nodes (0): 

### Community 29 - "Community 29"
Cohesion: 1.0
Nodes (0): 

### Community 30 - "Community 30"
Cohesion: 1.0
Nodes (0): 

### Community 31 - "Community 31"
Cohesion: 1.0
Nodes (0): 

### Community 32 - "Community 32"
Cohesion: 1.0
Nodes (0): 

### Community 33 - "Community 33"
Cohesion: 1.0
Nodes (0): 

### Community 34 - "Community 34"
Cohesion: 1.0
Nodes (0): 

### Community 35 - "Community 35"
Cohesion: 1.0
Nodes (0): 

### Community 36 - "Community 36"
Cohesion: 1.0
Nodes (0): 

### Community 37 - "Community 37"
Cohesion: 1.0
Nodes (0): 

### Community 38 - "Community 38"
Cohesion: 1.0
Nodes (0): 

### Community 39 - "Community 39"
Cohesion: 1.0
Nodes (0): 

### Community 40 - "Community 40"
Cohesion: 1.0
Nodes (0): 

### Community 41 - "Community 41"
Cohesion: 1.0
Nodes (0): 

### Community 42 - "Community 42"
Cohesion: 1.0
Nodes (0): 

### Community 43 - "Community 43"
Cohesion: 1.0
Nodes (0): 

### Community 44 - "Community 44"
Cohesion: 1.0
Nodes (0): 

### Community 45 - "Community 45"
Cohesion: 1.0
Nodes (0): 

### Community 46 - "Community 46"
Cohesion: 1.0
Nodes (0): 

### Community 47 - "Community 47"
Cohesion: 1.0
Nodes (0): 

### Community 48 - "Community 48"
Cohesion: 1.0
Nodes (0): 

### Community 49 - "Community 49"
Cohesion: 1.0
Nodes (0): 

### Community 50 - "Community 50"
Cohesion: 1.0
Nodes (0): 

## Knowledge Gaps
- **Thin community `Community 25`** (2 nodes): `init()`, `init-db.js`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 26`** (2 nodes): `migrate()`, `add_uploaded_by_id_to_materials.js`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 27`** (2 nodes): `migrate()`, `add_username_column.js`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 28`** (2 nodes): `rebuild_study_materials_schema.js`, `run()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 29`** (2 nodes): `exportDatabase()`, `export-database.js`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 30`** (2 nodes): `downloadFile()`, `downloadController.js`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 31`** (2 nodes): `migrate()`, `fix_camelcase_columns.js`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 32`** (2 nodes): `server.ts`, `getMimeType()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 33`** (1 nodes): `pool.js`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 34`** (1 nodes): `adminRoutes.js`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 35`** (1 nodes): `attendanceRoutes.js`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 36`** (1 nodes): `downloadRoutes.js`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 37`** (1 nodes): `feeRoutes.js`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 38`** (1 nodes): `homeworkRoutes.js`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 39`** (1 nodes): `Material.js`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 40`** (1 nodes): `materialsRoutes.js`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 41`** (1 nodes): `Notification.js`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 42`** (1 nodes): `notificationsRoutes.js`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 43`** (1 nodes): `resultsModel.js`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 44`** (1 nodes): `resultsRoutes.js`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 45`** (1 nodes): `studentRoutes.js`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 46`** (1 nodes): `Timetable.js`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 47`** (1 nodes): `examResultModel.js`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 48`** (1 nodes): `unified-register.js`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 49`** (1 nodes): `student-register.js`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 50`** (1 nodes): `teacher-register.js`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `initDashboard()` connect `Community 0` to `Community 6`, `Community 15`?**
  _High betweenness centrality (0.188) - this node is a cross-community bridge._
- **Why does `hideProtectionScreen()` connect `Community 0` to `Community 1`, `Community 6`?**
  _High betweenness centrality (0.103) - this node is a cross-community bridge._
- **Why does `getUserId()` connect `Community 6` to `Community 0`, `Community 16`?**
  _High betweenness centrality (0.096) - this node is a cross-community bridge._
- **Are the 8 inferred relationships involving `editMaterial()` (e.g. with `getMaterialById()` and `getTeacherAssignments()`) actually correct?**
  _`editMaterial()` has 8 INFERRED edges - model-reasoned connections that need verification._
- **Are the 3 inferred relationships involving `initDashboard()` (e.g. with `hideProtectionScreen()` and `getUserId()`) actually correct?**
  _`initDashboard()` has 3 INFERRED edges - model-reasoned connections that need verification._
- **Should `Community 0` be split into smaller, more focused modules?**
  _Cohesion score 0.06 - nodes in this community are weakly interconnected._
- **Should `Community 1` be split into smaller, more focused modules?**
  _Cohesion score 0.1 - nodes in this community are weakly interconnected._