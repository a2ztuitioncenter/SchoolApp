import { teacherAPI } from '../../core/api.js';
import { requireRole, getUserId, syncToSessionStorage, logout as authLogout } from '../../core/auth-manager.js';

// ═══════════════════════════════════════════
// ROUTE PROTECTION - Must be first
// ═══════════════════════════════════════════
requireRole('teacher');

// Global logout handler
window.handleLogout = function() {
  console.log('👋 Teacher logging out...');
  authLogout();
};

// ─── Auth State (Managed in init) ───────────────────────────────────────────
let teacherId = null;
let teacherPhone = null;
const teacherRole = 'teacher';

// ─── State ────────────────────────────────────────────────────────────────────
let allHomework  = [];
let allMaterials = [];
let allSyllabus  = [];
let allTimetable = [];
let availableClasses = [];

// ─── Day helpers ──────────────────────────────────────────────────────────────
const DAY_NAMES = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];

function todayName() { return DAY_NAMES[new Date().getDay()]; }

function formatTime(t) {
  if (!t) return '';
  try {
    const [h, m] = t.split(':');
    const d = new Date(); d.setHours(+h, +m);
    return d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
  } catch { return t; }
}

function timeToMinutes(t) {
  if (!t) return 0;
  const [h, m] = t.split(':');
  return +h * 60 + +m;
}

function nowMinutes() {
  const n = new Date();
  return n.getHours() * 60 + n.getMinutes();
}

// ─── Live clock ───────────────────────────────────────────────────────────────
function updateClock() {
  const el = document.getElementById('live-clock');
  if (el) el.textContent = new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true });
}
setInterval(updateClock, 1000);
updateClock();


// ─── Tab Switching ────────────────────────────────────────────────────────────
function setupTabs() {
  document.querySelectorAll('.nav-link[data-tab]').forEach(link => {
    link.addEventListener('click', e => {
      e.preventDefault();
      const tab = link.getAttribute('data-tab');
      document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
      document.querySelectorAll('.tab-content').forEach(t => t.style.display = 'none');
      link.classList.add('active');
      const el = document.getElementById(`tab-${tab}`);
      if (el) el.style.display = 'block';

      if (tab === 'homework')  { loadHomework(); populateHwDropdowns(); }
      if (tab === 'materials') loadMaterials();
      if (tab === 'syllabus')  loadSyllabus();
      if (tab === 'attendance') initAttendanceTab();
      if (tab === 'summary')   initSummaryTab();
    });
  });

  // Logout - uses global handler which properly clears all auth state
  document.getElementById('logout-btn')?.addEventListener('click', window.handleLogout);
}

function init() {
  console.log('📄 Teacher Dashboard initializing...');
  syncToSessionStorage('teacher');
  teacherId = getUserId();
  teacherPhone = sessionStorage.getItem('teacherPhone');

  const nameEl = document.getElementById('teacher-name');
  if (nameEl) nameEl.textContent = `Teacher (${teacherPhone || '–'})`;
  
  setupTabs();
  setupFormListeners();
  loadDashboard();
}

document.addEventListener('DOMContentLoaded', init);

// ─── DASHBOARD ────────────────────────────────────────────────────────────────
async function loadDashboard() {
  try {
    showInfo('Loading dashboard...');
    const [dashRes, matRes] = await Promise.all([
      teacherAPI.getDashboard(teacherId),
      teacherAPI.getMaterials(teacherId),
    ]);
    hideInfo();

    if (dashRes.success) {
      setText('stat-students', dashRes.stats?.totalStudents ?? '–');
      setText('stat-homework', dashRes.homework?.length ?? 0);
      allTimetable = dashRes.timetable || [];
      allHomework  = dashRes.homework  || [];
    }
    if (matRes.success) {
      allMaterials = matRes.data || [];
      setText('stat-materials', allMaterials.length);
    }

    renderTodayTimetable();
    renderWeeklyTimetable();
  } catch (err) {
    hideInfo();
    showError('Failed to load dashboard: ' + err.message);
  }
}

// Timetable — today
function renderTodayTimetable() {
  const today = todayName();
  document.getElementById('today-label').textContent = `— ${today}`;
  const tbody = document.getElementById('today-timetable-body');
  const todayEntries = allTimetable.filter(e => e.dayOfWeek === today);

  if (!todayEntries.length) {
    tbody.innerHTML = renderEmptyState(4, 'No classes today.', 'fa-calendar-times');
    return;
  }

  const now = nowMinutes();
  tbody.innerHTML = todayEntries
    .sort((a, b) => timeToMinutes(a.startTime) - timeToMinutes(b.startTime))
    .map(e => {
      const start = timeToMinutes(e.startTime);
      const end   = timeToMinutes(e.endTime);
      const isNow  = now >= start && now < end;
      const isPast = now >= end;
      const cls    = isNow ? 'timetable-now' : (isPast ? 'timetable-upcoming' : '');
      const chip   = isNow ? '<span class="now-chip">IN SESSION</span>' : '';
      const status = isNow ? '<span class="badge badge-complete">Now</span>' : (isPast ? '<span style="color:var(--text-muted)">Done</span>' : '<span class="badge">Upcoming</span>');
      return `<tr class="${cls}">
        <td>${e.classLevel || '–'}</td>
        <td>${e.subject || '–'}${chip}</td>
        <td class="time-block">${formatTime(e.startTime)} – ${formatTime(e.endTime)}</td>
        <td>${status}</td>
      </tr>`;
    }).join('');
}

// Re-render today highlight every minute
setInterval(() => {
  if (allTimetable.length) renderTodayTimetable();
}, 60000);

// Full weekly timetable
function renderWeeklyTimetable() {
  const container = document.getElementById('weekly-timetable');
  const days = ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
  const grouped = {};
  days.forEach(d => { grouped[d] = []; });
  allTimetable.forEach(e => { if (grouped[e.dayOfWeek]) grouped[e.dayOfWeek].push(e); });

  const today = todayName();
  const html = days.map(day => {
    const entries = grouped[day];
    if (!entries.length) return '';
    return `<div style="margin-bottom:1rem;">
      <div class="syllabus-subject-header" style="${day === today ? 'color:#3fb950;' : ''}">${day}${day === today ? ' 📍 Today' : ''}</div>
      <div class="table-container">
        <table>
          <thead><tr><th>Class</th><th>Subject</th><th>Time</th></tr></thead>
          <tbody>
            ${entries.sort((a,b) => timeToMinutes(a.startTime)-timeToMinutes(b.startTime)).map(e => `
              <tr>
                <td>${e.classLevel || '–'}</td>
                <td>${e.subject || '–'}</td>
                <td>${formatTime(e.startTime)} – ${formatTime(e.endTime)}</td>
              </tr>`).join('')}
          </tbody>
        </table>
      </div>
    </div>`;
  }).join('');
  container.innerHTML = html || '<p style="color:var(--text-muted);">No timetable entries found. Ask admin to configure your timetable.</p>';
}

// ─── ATTENDANCE ───────────────────────────────────────────────────────────────
async function initAttendanceTab() {
  const sel = document.getElementById('att-class-select');
  if (sel.options.length > 1) return; // already loaded
  try {
    const res = await teacherAPI.getAttendanceClasses(teacherId);
    availableClasses = res.data || [];
    sel.innerHTML = '<option value="">-- Select Class --</option>' +
      availableClasses.map(c => `<option value="${c}">${c}</option>`).join('');

    const attDate = document.getElementById('att-date');
    if (!attDate.value) attDate.value = new Date().toISOString().split('T')[0];
  } catch (err) {
    showError('Failed to load classes: ' + err.message);
  }
}

window.onAttClassChange = function() {};

window.loadAttendanceSheet = async function() {
  const classLevel = document.getElementById('att-class-select').value;
  const date       = document.getElementById('att-date').value;
  if (!classLevel || !date) { showError('Select a class and date.'); return; }

  try {
    showInfo('Loading students...');
    const res = await teacherAPI.getAttendanceSheet(teacherId, classLevel, date);
    hideInfo();

    const container = document.getElementById('att-sheet-container');
    const label     = document.getElementById('att-sheet-label');
    const tbody     = document.getElementById('att-sheet-body');

    label.textContent = `Class ${classLevel} — ${date}`;
    const students  = res.students || [];
    const existingMap = res.existing || {};

    if (!students.length) {
      container.style.display = 'block';
      tbody.innerHTML = renderEmptyState(4, 'No students found in this class.');
      return;
    }

    tbody.innerHTML = students.map(s => {
      const cur = existingMap[s.id] || 'present';
      return `<tr>
        <td><strong>${s.name}</strong></td>
        <td><label class="att-radio-group"><input type="radio" name="att_${s.id}" value="present" ${cur==='present'?'checked':''}> Present</label></td>
        <td><label class="att-radio-group"><input type="radio" name="att_${s.id}" value="absent"  ${cur==='absent' ?'checked':''}> Absent</label></td>
        <td><label class="att-radio-group"><input type="radio" name="att_${s.id}" value="late"    ${cur==='late'   ?'checked':''}> Late</label></td>
      </tr>`;
    }).join('');
    container.style.display = 'block';
  } catch (err) {
    hideInfo();
    showError('Failed to load attendance: ' + err.message);
  }
};

window.saveAttendance = async function() {
  const classLevel = document.getElementById('att-class-select').value;
  const date       = document.getElementById('att-date').value;
  const radios     = document.querySelectorAll('#att-sheet-body input[type=radio]:checked');
  const records    = [];

  radios.forEach(r => {
    const studentId = parseInt(r.name.replace('att_', ''));
    records.push({ studentId, classLevel, date, status: r.value });
  });

  if (!records.length) { showError('No data to save.'); return; }

  try {
    showInfo('Saving attendance...');
    await teacherAPI.markBulkAttendance(teacherId, records);
    hideInfo();
    showSuccess(`Attendance saved for ${records.length} students.`);
  } catch (err) {
    hideInfo();
    showError('Failed to save attendance: ' + err.message);
  }
};

// ─── HOMEWORK ─────────────────────────────────────────────────────────────────
async function loadHomework() {
  try {
    const res = await teacherAPI.getHomework(teacherId);
    allHomework = res.data || [];
    renderHomeworkTable();
    renderDppTable();
  } catch (err) {
    showError('Failed to load homework: ' + err.message);
  }
}

function renderHomeworkTable() {
  const tbody = document.getElementById('hw-table-body');
    const onlyHws = allHomework.filter(h => h.type === 'homework');
    if (!onlyHws.length) {
      tbody.innerHTML = renderEmptyState(5, 'No homework yet. Add one!');
      return;
    }
    tbody.innerHTML = onlyHws.map(hw => {
      const due = hw.dueDate ? new Date(hw.dueDate).toLocaleDateString('en-IN') : '–';
      const att = hw.attachmentUrl ? `<a href="${hw.attachmentUrl}" target="_blank" class="btn-sm" style="background:#238636; color:#fff; text-decoration:none;"><i class="fas fa-paperclip"></i></a>` : '';
      return `<tr>
        <td><span class="badge">${hw.classLevel || '–'}</span></td>
        <td>${hw.subject || '–'}</td>
        <td>${hw.title}</td>
        <td>${due}</td>
        <td>
          ${att}
          <button class="btn-sm btn-edit"   onclick="editHomework(${hw.id})"><i class="fas fa-pen"></i></button>
          <button class="btn-sm btn-delete" onclick="deleteHomework(${hw.id})"><i class="fas fa-trash"></i></button>
        </td>
      </tr>`;
    }).join('');
}

async function populateHwDropdowns() {
  const classSel = document.getElementById('hw-classLevel');
  const secSel   = document.getElementById('hw-section');
  if (!classSel || !secSel) return;
  
  if (classSel.options.length > 1 && secSel.options.length > 1) return;

  try {
    const res = await teacherAPI.getAttendanceClasses(teacherId);
    const classes = res.data || [];
    
    // For now, these classes might be 10A, 12B. Let's try to split them if possible or just use them as classLevel.
    // The user wants class and section dropdowns.
    const classSet = new Set();
    const secSet   = new Set();
    
    classes.forEach(c => {
      // Simple heuristic: if it ends with a letter, that's the section.
      const match = c.match(/^(\d+)([A-Z])$/i);
      if (match) {
        classSet.add(match[1]);
        secSet.add(match[2]);
      } else {
        classSet.add(c);
      }
    });

    classSel.innerHTML = '<option value="">Select Class</option>' + 
      Array.from(classSet).sort().map(c => `<option value="${c}">${c}</option>`).join('');
    secSel.innerHTML = '<option value="">Select Section</option>' + 
      Array.from(secSet).sort().map(s => `<option value="${s}">${s}</option>`).join('');
  } catch (err) { console.error('Populate HW dropdowns failed', err); }
}

function renderDppTable() {
  const tbody = document.getElementById('dpp-table-body');
  if(!tbody) return;
  const onlyDpps = allHomework.filter(h => h.type === 'daily_practice');
  if (!onlyDpps.length) {
    tbody.innerHTML = renderEmptyState(5, 'No practice problems yet.');
    return;
  }
  tbody.innerHTML = onlyDpps.map(hw => {
    const posted = `Posted: ${new Date(hw.createdAt).toLocaleDateString('en-IN')}`;
    const att = hw.attachmentUrl ? `<a href="${hw.attachmentUrl}" target="_blank" class="btn-sm" style="background:#238636; color:#fff; text-decoration:none;"><i class="fas fa-paperclip"></i></a>` : '';
    return `<tr>
      <td><span class="badge">${hw.classLevel || '–'}</span></td>
      <td>${hw.subject || '–'}</td>
      <td>${hw.title}</td>
      <td>${posted}</td>
      <td>
        ${att}
        <button class="btn-sm btn-edit"   onclick="editHomework(${hw.id})"><i class="fas fa-pen"></i></button>
        <button class="btn-sm btn-delete" onclick="deleteHomework(${hw.id})"><i class="fas fa-trash"></i></button>
      </td>
    </tr>`;
  }).join('');
}

window.openHwModal = async function(typeOrHw = 'homework') {
  await populateHwDropdowns();
  document.getElementById('hw-form').reset();
  const hw = typeof typeOrHw === 'object' ? typeOrHw : null;
  const type = typeof typeOrHw === 'string' ? typeOrHw : (hw ? hw.type : 'homework');
  const isDpp = type === 'daily_practice';

  document.getElementById('hw-edit-id').value = hw?.id || '';
  document.getElementById('hw-modal-title').textContent = hw ? `Edit ${isDpp ? 'Practice' : 'Homework'}` : `Add ${isDpp ? 'Practice' : 'Homework'}`;
  document.getElementById('hw-type').value = type;
  const dueDateInput = document.getElementById('hw-dueDate');

  if (hw) {
    document.getElementById('hw-classLevel').value   = hw.classLevel || '';
    document.getElementById('hw-section').value      = hw.section    || '';
    document.getElementById('hw-subject').value      = hw.subject    || '';
    document.getElementById('hw-title').value        = hw.title      || '';
    document.getElementById('hw-description').value  = hw.description|| '';
  }

  if (dueDateInput) {
    dueDateInput.required = !isDpp;
    if (isDpp) {
      dueDateInput.value = '';
    } else if (hw) {
      dueDateInput.value = hw.dueDate ? hw.dueDate.split('T')[0] : '';
    }
  }

  const modal = document.getElementById('hw-modal');
  if (modal) {
    modal.style.display = 'flex';
    modal.classList.add('open');
  }

  const dueDateContainer = document.getElementById('hw-dueDate-container');
  if (dueDateContainer) {
    dueDateContainer.style.display = isDpp ? 'none' : 'block';
  }
};

window.closeHwModal = function() {
  const modal = document.getElementById('hw-modal');
  if (modal) {
    modal.classList.remove('open');
    setTimeout(() => { modal.style.display = 'none'; }, 300);
  }
};

window.editHomework = function(id) {
  const hw = allHomework.find(h => h.id === id);
  if (hw) openHwModal(hw);
};

window.deleteHomework = async function(id) {
  if (!confirm('Delete this homework?')) return;
  try {
    await teacherAPI.deleteHomework(id, parseInt(teacherId));
    showSuccess('Homework deleted.');
    await loadHomework();
  } catch (err) { showError(err.message); }
};

function setupFormListeners() {
  document.getElementById('hw-form')?.addEventListener('submit', async e => {
    e.preventDefault();
    const id = document.getElementById('hw-edit-id').value;
    const fd = new FormData();
    fd.append('teacherId',   teacherId);
    fd.append('classLevel',  document.getElementById('hw-classLevel').value);
    fd.append('section',     document.getElementById('hw-section').value);
    fd.append('subject',     document.getElementById('hw-subject').value);
    fd.append('type',        document.getElementById('hw-type')?.value || 'homework');
    fd.append('title',       document.getElementById('hw-title').value);
    fd.append('description', document.getElementById('hw-description').value);
    fd.append('dueDate',     document.getElementById('hw-dueDate').value);
    const file = document.getElementById('hw-file').files[0];
    if (file) fd.append('attachment', file);

    try {
      showInfo(id ? 'Updating homework...' : 'Adding homework...');
      if (id) await teacherAPI.updateHomework(id, fd);
      else    await teacherAPI.createHomework(fd);
      hideInfo();
      showSuccess(id ? 'Homework updated!' : 'Homework added!');
      closeHwModal();
      await loadHomework();
    } catch (err) { hideInfo(); showError(err.message); }
  });

  document.getElementById('mat-form')?.addEventListener('submit', async e => {
    e.preventDefault();
    const id = document.getElementById('mat-edit-id').value;
    const fd = new FormData();
    fd.append('teacherId',    teacherId);
    fd.append('classLevel',   document.getElementById('mat-classLevel').value);
    fd.append('subject',      document.getElementById('mat-subject').value);
    fd.append('title',        document.getElementById('mat-title').value);
    fd.append('description',  document.getElementById('mat-description').value);
    if (id) fd.append('currentFileUrl', document.getElementById('mat-current-file').value);
    const file = document.getElementById('mat-file').files[0];
    if (file) fd.append('materialFile', file);

    try {
      showInfo(id ? 'Updating material...' : 'Uploading material...');
      if (id) await teacherAPI.updateMaterial(id, fd);
      else    await teacherAPI.createMaterial(fd);
      hideInfo();
      showSuccess(id ? 'Material updated!' : 'Material uploaded!');
      closeMatModal();
      await loadMaterials();
    } catch (err) { hideInfo(); showError(err.message); }
  });

  document.getElementById('syl-form')?.addEventListener('submit', async e => {
    e.preventDefault();
    const data = {
      teacherId: parseInt(teacherId),
      classLevel:  document.getElementById('syl-classLevel').value,
      section:     document.getElementById('syl-section').value,
      subject:     document.getElementById('syl-subject').value,
      chapter:     document.getElementById('syl-chapter').value,
      description: document.getElementById('syl-description').value,
    };
    try {
      showInfo('Adding chapter...');
      await teacherAPI.createSyllabus(data);
      hideInfo();
      showSuccess('Chapter added!');
      closeSyllabusModal();
      await loadSyllabus();
    } catch (err) { hideInfo(); showError(err.message); }
  });
}

// ─── MATERIALS ────────────────────────────────────────────────────────────────
async function loadMaterials() {
  try {
    const res = await teacherAPI.getMaterials(teacherId);
    allMaterials = res.data || [];
    renderMaterialsTable();
    setText('stat-materials', allMaterials.length);
  } catch (err) { showError('Failed to load materials: ' + err.message); }
}

function renderMaterialsTable() {
  const tbody = document.getElementById('mat-table-body');
  if (!allMaterials.length) {
    tbody.innerHTML = renderEmptyState(5, 'No materials yet.');
    return;
  }
  tbody.innerHTML = allMaterials.map(m => `
    <tr>
      <td>${m.title}</td>
      <td>${m.subject}</td>
      <td><span class="badge">Class ${m.classLevel}</span></td>
      <td><a href="${m.fileUrl}" target="_blank" class="btn-sm" style="background:#238636; color:#fff; text-decoration:none;"><i class="fas fa-download"></i></a></td>
      <td>
        <button class="btn-sm btn-edit"   onclick="editMaterial(${m.id})"><i class="fas fa-pen"></i></button>
        <button class="btn-sm btn-delete" onclick="deleteMaterial(${m.id})"><i class="fas fa-trash"></i></button>
      </td>
    </tr>`).join('');
}

window.openMatModal = function(m = null) {
  document.getElementById('mat-form').reset();
  document.getElementById('mat-edit-id').value = m?.id || '';
  document.getElementById('mat-current-file').value = m?.fileUrl || '';
  document.getElementById('mat-modal-title').textContent = m ? 'Edit Material' : 'Upload Study Material';
  document.getElementById('mat-file-hint').style.display = m ? 'inline' : 'none';
  if (m) {
    document.getElementById('mat-classLevel').value  = m.classLevel   || '';
    document.getElementById('mat-subject').value     = m.subject      || '';
    document.getElementById('mat-title').value       = m.title        || '';
    document.getElementById('mat-description').value = m.description  || '';
  }
  document.getElementById('mat-modal').classList.add('open');
};
window.closeMatModal  = () => document.getElementById('mat-modal').classList.remove('open');
window.editMaterial   = id => { const m = allMaterials.find(x => x.id === id); if (m) openMatModal(m); };
window.deleteMaterial = async id => {
  if (!confirm('Delete this material?')) return;
  try {
    await teacherAPI.deleteMaterial(id, parseInt(teacherId));
    showSuccess('Material deleted.');
    await loadMaterials();
  } catch (err) { showError(err.message); }
};

// ─── SYLLABUS ─────────────────────────────────────────────────────────────────
async function loadSyllabus() {
  try {
    const res = await teacherAPI.getSyllabus(teacherId);
    allSyllabus = res.data || [];
    renderSyllabus();
  } catch (err) { showError('Failed to load syllabus: ' + err.message); }
}

function renderSyllabus() {
  const container = document.getElementById('syllabus-container');
  if (!allSyllabus.length) {
    container.innerHTML = '<p style="color:var(--text-muted); font-size:0.9rem;">No chapters added yet. Click "Add Chapter" to begin.</p>';
    return;
  }

  // Group by subject
  const bySubject = {};
  allSyllabus.forEach(s => {
    const key = `${s.subject} — Class ${s.classLevel}`;
    if (!bySubject[key]) bySubject[key] = [];
    bySubject[key].push(s);
  });

  const total    = allSyllabus.length;
  const done     = allSyllabus.filter(s => s.completed).length;
  const pct      = total ? Math.round(done * 100 / total) : 0;

  container.innerHTML = `
    <div style="margin-bottom:1.5rem;">
      <div style="display:flex; justify-content:space-between; font-size:0.9rem; color:var(--text-muted); margin-bottom:4px;">
        <span>Overall Progress</span><span>${done}/${total} chapters</span>
      </div>
      <div class="progress-bar-wrap"><div class="progress-bar-fill" style="width:${pct}%"></div></div>
    </div>
    ${Object.entries(bySubject).map(([subj, chapters]) => `
      <div class="syllabus-subject-header">${subj}</div>
      ${chapters.map(c => `
        <div class="chapter-row ${c.completed ? 'done' : ''}" style="padding:0.6rem 0; border-bottom:1px solid var(--border-subtle); display:flex; justify-content:space-between; align-items:center;">
          <div style="display:flex; align-items:center; gap:0.75rem;">
            <input type="checkbox" ${c.completed ? 'checked' : ''} onchange="toggleChapter(${c.id}, this.checked)" style="width:16px; height:16px; cursor:pointer;">
            <div>
              <span class="chapter-text" style="font-size:0.9rem;">${c.chapter}</span>
              ${c.description ? `<div style="font-size:0.78rem; color:var(--text-muted); margin-top:2px;">${c.description}</div>` : ''}
            </div>
          </div>
          <div style="display:flex; gap:0.5rem; align-items:center;">
            <span class="badge ${c.completed ? 'badge-complete' : 'badge-pending'}">${c.completed ? 'Done' : 'Pending'}</span>
            <button class="btn-sm btn-delete" onclick="deleteChapter(${c.id})"><i class="fas fa-trash"></i></button>
          </div>
        </div>`).join('')}
    `).join('')}`;
}

window.openSyllabusModal  = () => { document.getElementById('syl-form').reset(); document.getElementById('syl-modal').classList.add('open'); };
window.closeSyllabusModal = () => document.getElementById('syl-modal').classList.remove('open');

window.toggleChapter = async function(id, completed) {
  try {
    await teacherAPI.updateSyllabus(id, { teacherId: parseInt(teacherId), completed });
    await loadSyllabus();
  } catch (err) { showError(err.message); }
};

window.deleteChapter = async function(id) {
  if (!confirm('Delete this chapter?')) return;
  try {
    await teacherAPI.deleteSyllabus(id, parseInt(teacherId));
    showSuccess('Chapter deleted.');
    await loadSyllabus();
  } catch (err) { showError(err.message); }
};

// ─── ATTENDANCE SUMMARY ───────────────────────────────────────────────────────
async function initSummaryTab() {
  const sel = document.getElementById('sum-class-select');
  if (sel.options.length > 1) return;
  try {
    const res = await teacherAPI.getAttendanceClasses(teacherId);
    const classes = res.data || [];
    sel.innerHTML = '<option value="">-- Select Class --</option>' +
      classes.map(c => `<option value="${c}">${c}</option>`).join('');
    const monthEl = document.getElementById('sum-month');
    if (!monthEl.value) monthEl.value = new Date().toISOString().slice(0, 7);
  } catch { /* silent */ }
}

window.loadAttendanceSummary = async function() {
  const classLevel = document.getElementById('sum-class-select').value;
  const month      = document.getElementById('sum-month').value;
  if (!classLevel || !month) { showError('Select class and month.'); return; }

  try {
    showInfo('Loading summary...');
    const res = await teacherAPI.getAttendanceSummary(teacherId, classLevel, month);
    hideInfo();
    const data = res.data || [];
    const container = document.getElementById('summary-container');

    if (!data.length) { container.innerHTML = '<p style="color:var(--text-muted);">No attendance data for this period.</p>'; return; }

    container.innerHTML = `
      <div class="table-container">
        <table>
          <thead><tr><th>Student</th><th>Present</th><th>Absent</th><th>Late</th><th>Total</th><th>%</th></tr></thead>
          <tbody>
            ${data.map(r => {
              const pct = r.attendancePercent || 0;
              const color = pct >= 75 ? '#3fb950' : pct >= 50 ? '#f0883e' : '#f85149';
              return `<tr>
                <td>${r.name}</td>
                <td>${r.presentCount}</td>
                <td>${r.absentCount}</td>
                <td>${r.lateCount}</td>
                <td>${r.totalDays}</td>
                <td><strong style="color:${color}">${pct}%</strong></td>
              </tr>`;
            }).join('')}
          </tbody>
        </table>
      </div>`;
  } catch (err) { hideInfo(); showError('Failed: ' + err.message); }
};

// ─── Alerts ───────────────────────────────────────────────────────────────────
function showSuccess(msg) { showAlert('success-alert', 'success-text', msg); }
function showError(msg)   { showAlert('error-alert', 'error-text', msg); }
function showInfo(msg)    { const el = document.getElementById('info-alert'); if (el) { document.getElementById('info-text').textContent = msg; el.style.display = 'flex'; } }
function hideInfo()       { const el = document.getElementById('info-alert'); if (el) el.style.display = 'none'; }
function showAlert(id, tid, msg) {
  const el = document.getElementById(id);
  if (!el) return;
  document.getElementById(tid).textContent = msg;
  el.style.display = 'flex';
  setTimeout(() => el.style.display = 'none', 4000);
}
function setText(id, val) { const el = document.getElementById(id); if (el) el.textContent = val; }
function renderEmptyState(colspan, message, icon = 'fa-inbox') {
  return `<tr><td colspan="${colspan}" class="empty-state"><i class="fas ${icon}"></i><p>${message}</p></td></tr>`;
}

export { loadDashboard, loadHomework, loadMaterials, loadSyllabus };
