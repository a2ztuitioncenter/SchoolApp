# 📋 Admin Dashboard: Feature Inventory & Parity Tracker

This document serves as the master blueprint for replicating 100% of the Web Admin Dashboard functionality into the React Native mobile app.

---

## 🛡️ 1. User & Access Management
**Source Files**: `admin-dashboard.html` (Tabs: Users, Students, Pending Approvals)

### 1.1 User Management
- [x] **List Users**: Data table with Search & Role filters.
- [x] **Create User**: Full-screen form (Name, Email, Phone, Role, Status).
- [x] **Edit User**: Fetch existing data, update via `PUT /api/admin/users/:id`.
- [x] **Toggle Status**: Quick enable/disable switch in list view.
- [x] **Delete User**: Confirmation dialog and API call.

### 1.2 Student Management
- [x] **List Students**: Card-based view with Class/Section filters.
- [x] **Enroll Student**: Native form with Class/Section/Roll Number/Phone.
- [x] **Edit Profile**: Full-screen update form.
- [x] **Toggle Status**: Active/Inactive status management.
- [x] **Delete Student**: Secure deletion with confirmation.

### 1.3 Pending Approvals
- [x] **Review List**: Applicants table (Teacher/Student/Staff).
- [/] **Approve User**: Role-specific approval (e.g., assign classes for Teachers).
- [x] **Reject User**: Modal for rejection reason.
- [ ] **Class Assignment**: Multi-select modal for teacher access levels.

---

## 📚 2. Academic Operations
**Source Files**: `admin-dashboard.html` (Tabs: Attendance, Homework, Timetable, Materials, Subjects)

### 2.1 Attendance Management
- [x] **Mark Attendance**: Class/Section/Date selection.
- [x] **Attendance Stats**: Total/Present/Absent counter.
- [x] **Mark All Present**: Bulk action button.
- [x] **Monthly Summary**: Table-view of attendance history.

### 2.2 Homework Management
- [x] **Homework List**: Search by title/subject/class.
- [x] **Create/Edit**: Title, Class, Section, Subject, Due Date, Description.
- [x] **Attachments**: PDF/Image upload with progress bar.
- [ ] **Submission Review**: (Web implementation pending/to be verified).

### 2.3 Timetable
- [ ] **Schedule View**: Day-wise tabs (Mon-Sun).
- [ ] **Add Entry**: Start/End Time, Subject, Class, Teacher.
- [ ] **Class-wise Grouping**: View schedule by selected class.

### 2.4 Study Materials
- [x] **Material Library**: Searchable list of uploaded files.
- [x] **Add Material**: Title, Subject, Class, Section, File Upload.
- [x] **Upload Progress**: Visual feedback during file transfer.

### 2.5 Subjects Management
- [ ] **Master Subjects**: Create/Delete global subjects (e.g., Physics, Math).
- [ ] **Class Mapping**: Assign subjects to specific Class/Section.
- [ ] **Teacher Assignment**: Link teachers to class-subjects.

---

## 💰 3. Financials & Results
**Source Files**: `admin-dashboard.html` (Tabs: Fees, Results, Notifications)

### 3.1 Fee Management
- [x] **Financial KPIs**: Cards for Total Collected, Pending, etc.
- [x] **Active Fees**: List of pending/due fees with search.
- [x] **Add Fee**: Student autocomplete, amount, due date, description.
- [x] **Mark as Paid**: Quick action modal with payment date selection.
- [ ] **Payment History**: Record of all past transactions.

### 3.2 Exam Results
- [ ] **Performance Stats**: Pass % and Fail count summary cards.
- [ ] **Marks Entry**: (Verified via table edit/entry pattern).
- [ ] **Result Filtering**: View results by Class or Pass/Fail status.

### 3.3 Notifications & Notices
- [ ] **Notice Board**: List of sent announcements.
- [ ] **Send Notice**: Title, Message, Target Class, Target Role (Teacher/Student).
- [ ] **Attachments**: Attach files to announcements.

---

## ⚙️ 4. System & Content (CMS)
**Source Files**: `admin-dashboard.html` (Modals: CMS, Profile, Logs)

### 4.1 Content Management (CMS)
- [ ] **Dynamic Pages**: Edit Documentation, Help, and Support pages.
- [ ] **Editor Support**: Rich Text (HTML) or Markdown editing.
- [ ] **Preview Mode**: Live preview of content before saving.

### 4.2 Admin Profile
- [x] **Account Edit**: Name, Email, Avatar URL, Designation.
- [x] **Security**: Change Password (current/new/confirm).

### 4.3 System Audit
- [x] **Audit Logs**: View table of system-wide administrative actions.

---

## 🗺️ Mobile UX Standard Checklist
- [x] **Navigation**: Bottom tabs for main modules; Drawer for secondary.
- [x] **Forms**: Full-screen forms with floating bottom action bars.
- [ ] **Feedback**: Replace all `Alert.alert` with native Toast/Snackbar.
- [ ] **Interactions**: Swipe actions for List items (Delete/Edit).
- [x] **Connectivity**: Handle offline states and loading skeletons.
