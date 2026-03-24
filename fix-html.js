import fs from 'fs';

const htmlPath = 'm:/WebDev/projects/tuition-app/frontend/admin-dashboard.html';
let html = fs.readFileSync(htmlPath, 'utf8');

const navEndIndex = html.indexOf('</nav>');
// Find logout button
const logoutIndex = html.indexOf('<button class="logout-btn" id="logout-btn">');

// Delete everything between </nav> (inclusive of </nav>) up to the logout button element
// Wait, the navEndIndex actually points to the FIRST </nav>. Let's keep the </nav> and delete everything after it until logout block.
const cleanSidebar = html.substring(0, navEndIndex + 6) + '\n' + html.substring(logoutIndex);

html = cleanSidebar;

// Now append the missing tabs to the main content area, right before the scripts.
const scriptIndex = html.indexOf('<script type="module" src="./js/admin-dashboard.js"></script>');
const beforeScript = html.substring(0, scriptIndex);
const afterScript = html.substring(scriptIndex);

const newTabs = `
            <!-- Attendance Tab -->
            <div id="tab-attendance" class="tab-content" style="display:none;">
                <div class="card-grid">
                    <div class="card" style="grid-column: 1 / -1;">
                        <h2>📋 Attendance Management</h2>
                        <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 1rem; margin-bottom: 1rem;">
                            <div class="form-group">
                                <label>Class</label>
                                <select id="att-class-select" onchange="loadStudentsForAttendance()">
                                    <option value="">-- Select Class --</option>
                                </select>
                            </div>
                            <div class="form-group">
                                <label>Date</label>
                                <input type="date" id="att-date" value="">
                            </div>
                            <div class="form-group" style="align-self: flex-end;">
                                <button class="btn btn-primary" onclick="loadAttendanceSheet()">Load Students</button>
                            </div>
                        </div>
                    </div>
                </div>
                <div id="attendance-sheet" style="display:none; margin-top:20px;">
                    <div class="table-container">
                        <table class="data-table" id="att-sheet-table">
                            <thead>
                                <tr>
                                    <th>Roll No.</th>
                                    <th>Student Name</th>
                                    <th>Present</th>
                                    <th>Absent</th>
                                    <th>Late</th>
                                </tr>
                            </thead>
                            <tbody id="att-sheet-body"></tbody>
                        </table>
                        <button class="btn btn-success" onclick="submitAttendance()" style="margin-top:15px;">✅ Save Attendance</button>
                    </div>
                </div>
                <div class="card-grid" style="margin-top:20px;">
                    <div class="card" style="grid-column: 1 / -1;">
                        <h3>Monthly Summary</h3>
                        <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 1rem;">
                            <div class="form-group">
                                <label>Class</label>
                                <select id="summary-class-select">
                                    <option value="">-- Select Class --</option>
                                </select>
                            </div>
                            <div class="form-group">
                                <label>Month</label>
                                <input type="month" id="summary-month">
                            </div>
                            <div class="form-group" style="align-self: flex-end;">
                                <button class="btn btn-primary" onclick="loadAttendanceSummary()">View Summary</button>
                            </div>
                        </div>
                        <div id="summary-table-container" style="margin-top:15px; overflow-x:auto;"></div>
                    </div>
                </div>
            </div>

            <!-- Homework Tab -->
            <div id="tab-homework" class="tab-content" style="display:none;">
                <div class="card-grid">
                    <div class="card" style="grid-column: 1 / -1;">
                        <h3 id="hw-form-title">➕ Add Homework</h3>
                        <input type="hidden" id="hw-edit-id">
                        <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 1rem;">
                            <div class="form-group">
                                <label>Title *</label>
                                <input type="text" id="hw-title" placeholder="e.g. Chapter 5 Exercise">
                            </div>
                            <div class="form-group">
                                <label>Class *</label>
                                <input type="text" id="hw-class" placeholder="e.g. 10A">
                            </div>
                            <div class="form-group">
                                <label>Subject *</label>
                                <input type="text" id="hw-subject" placeholder="e.g. Mathematics">
                            </div>
                            <div class="form-group">
                                <label>Due Date</label>
                                <input type="date" id="hw-due-date">
                            </div>
                            <div class="form-group" style="grid-column: span 2;">
                                <label>Description</label>
                                <textarea id="hw-description" rows="1" placeholder="Describe the homework..."></textarea>
                            </div>
                        </div>
                        <div style="margin-top: 1rem;">
                            <button class="btn btn-primary" onclick="saveHomework()">💾 Save Homework</button>
                            <button class="btn" style="background:#ddd; margin-left:10px;" onclick="resetHomeworkForm()">🔄 Reset</button>
                        </div>
                    </div>
                </div>
                <div class="card-grid" style="margin-top:20px;">
                    <div class="card" style="grid-column: 1 / -1;">
                        <h3>All Homework</h3>
                        <input type="text" id="hw-filter-class" placeholder="Filter by class..." oninput="filterHomework()" style="margin-bottom:1rem; padding:0.5rem; width:100%; max-width:300px;">
                        <div class="table-container">
                            <table class="data-table">
                                <thead>
                                    <tr>
                                        <th>#</th>
                                        <th>Title</th>
                                        <th>Class</th>
                                        <th>Subject</th>
                                        <th>Due Date</th>
                                        <th>Assigned By</th>
                                        <th>Actions</th>
                                    </tr>
                                </thead>
                                <tbody id="homework-table-body"></tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Fees Management Tab -->
            <div id="tab-fees" class="tab-content" style="display:none;">
                <div class="card-grid">
                    <div class="card">
                        <h3>Total Collected</h3>
                        <div style="font-size: 2rem; color: #2ecc71; font-weight: 700;" id="fee-stat-collected">₹0</div>
                    </div>
                    <div class="card">
                        <h3>Total Pending</h3>
                        <div style="font-size: 2rem; color: #e74c3c; font-weight: 700;" id="fee-stat-pending">₹0</div>
                    </div>
                    <div class="card">
                        <h3>Paid / Unpaid</h3>
                        <div style="font-size: 1.5rem; color: #3498db; font-weight: 700;">
                            <span id="fee-stat-paid-count">0</span> / <span id="fee-stat-unpaid-count">0</span>
                        </div>
                    </div>
                </div>
                <div class="card-grid" style="margin-top:20px;">
                    <div class="card" style="grid-column: 1 / -1;">
                        <h3>➕ Add Fee Record</h3>
                        <div style="display: grid; grid-template-columns: 1fr 1fr 1fr 1fr; gap: 1rem;">
                            <div class="form-group">
                                <label>Student ID *</label>
                                <input type="number" id="fee-student-id" placeholder="Student ID">
                            </div>
                            <div class="form-group">
                                <label>Amount (₹) *</label>
                                <input type="number" id="fee-amount" placeholder="e.g. 2000" step="0.01">
                            </div>
                            <div class="form-group">
                                <label>Due Date *</label>
                                <input type="date" id="fee-due-date">
                            </div>
                            <div class="form-group">
                                <label>Description</label>
                                <input type="text" id="fee-description" placeholder="e.g. Monthly Tuition Fee">
                            </div>
                        </div>
                        <button class="btn btn-primary" style="margin-top:1rem;" onclick="addFeeRecord()">➕ Add Fee</button>
                    </div>
                </div>
                <div class="card-grid" style="margin-top:20px;">
                    <div class="card" style="grid-column: 1 / -1;">
                        <h3>Fee Records</h3>
                        <div style="margin-bottom:1rem;">
                            <button class="btn btn-primary" id="fee-tab-all" onclick="loadFees('all')">All</button>
                            <button class="btn" style="background:#eee;" id="fee-tab-unpaid" onclick="loadFees('unpaid')">Unpaid Only</button>
                        </div>
                        <div class="table-container">
                            <table class="data-table">
                                <thead>
                                    <tr>
                                        <th>#</th>
                                        <th>Student</th>
                                        <th>Class</th>
                                        <th>Amount</th>
                                        <th>Description</th>
                                        <th>Due Date</th>
                                        <th>Status</th>
                                        <th>Actions</th>
                                    </tr>
                                </thead>
                                <tbody id="fees-table-body"></tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Study Materials Tab -->
            <div id="tab-materials" class="tab-content" style="display:none;">
                <div class="card-grid">
                    <div class="card" style="grid-column: 1 / -1;">
                        <div style="display:flex; justify-content:space-between; align-items:center;">
                            <h2>📁 Study Materials</h2>
                            <button class="btn btn-primary" onclick="showAddMaterialModal()">➕ Upload Material</button>
                        </div>
                        <div class="table-container" style="margin-top:20px;">
                            <table class="data-table">
                                <thead>
                                    <tr><th>Title</th><th>Subject</th><th>Class</th><th>Uploaded By</th><th>Actions</th></tr>
                                </thead>
                                <tbody id="materials-list">
                                    <tr><td colspan="5" class="empty-state">No materials found.</td></tr>
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Timetable Tab -->
            <div id="tab-timetable" class="tab-content" style="display:none;">
                <div class="card-grid">
                    <div class="card" style="grid-column: 1 / -1;">
                        <div style="display:flex; justify-content:space-between; align-items:center;">
                            <h2>⏰ Timetable</h2>
                            <button class="btn btn-primary" onclick="showAddTimetableModal()">➕ Add Class</button>
                        </div>
                        <div class="table-container" style="margin-top:20px;">
                            <table class="data-table">
                                <thead>
                                    <tr><th>Day</th><th>Time</th><th>Subject</th><th>Class</th><th>Teacher</th><th>Actions</th></tr>
                                </thead>
                                <tbody id="timetable-list">
                                    <tr><td colspan="6" class="empty-state">No timetable entries found.</td></tr>
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Notifications Tab -->
            <div id="tab-notifications" class="tab-content" style="display:none;">
                <div class="card-grid">
                    <div class="card" style="grid-column: 1 / -1;">
                        <div style="display:flex; justify-content:space-between; align-items:center;">
                            <h2>🔔 Notifications & Notices</h2>
                            <button class="btn btn-primary" onclick="showSendNoticeModal()">➕ Send Notice</button>
                        </div>
                        <div class="table-container" style="margin-top:20px;">
                            <table class="data-table">
                                <thead>
                                    <tr><th>Date</th><th>Title</th><th>Message</th><th>Recipient</th><th>Actions</th></tr>
                                </thead>
                                <tbody id="notifications-list">
                                    <tr><td colspan="5" class="empty-state">No notifications sent.</td></tr>
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Exam Results Tab -->
            <div id="tab-results" class="tab-content" style="display:none;">
                <div class="card-grid">
                    <div class="card" style="grid-column: 1 / -1;">
                        <div style="display:flex; justify-content:space-between; align-items:center;">
                            <h2>📊 Exam Results</h2>
                            <button class="btn btn-primary" onclick="showAddResultModal()">➕ Add Result</button>
                        </div>
                        <div class="table-container" style="margin-top:20px;">
                            <table class="data-table">
                                <thead>
                                    <tr><th>Student</th><th>Exam</th><th>Subject</th><th>Marks</th><th>Remarks</th><th>Actions</th></tr>
                                </thead>
                                <tbody id="results-list">
                                    <tr><td colspan="6" class="empty-state">No results found.</td></tr>
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>
`;

// Insert the newTabs string after the end of main-content closing tags or just before script
let newHtml = beforeScript.trim();
if (newHtml.endsWith('</div>')) {
    // Strip trailing </div> if any to put it inside main-content, then re-add
    newHtml = newHtml.substring(0, newHtml.lastIndexOf('</div>')) + newTabs + '\\n        </div>\\n    </div>\\n\\n';
} else {
    newHtml = newHtml + newTabs;
}

newHtml += '    ' + afterScript;

fs.writeFileSync(htmlPath, newHtml, 'utf8');
console.log('HTML updated');
