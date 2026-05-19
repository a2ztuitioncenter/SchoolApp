import { resultsAPI } from '../../core/api.js';
import { getUserId, getUserRole } from '../../core/auth-manager.js';
import { escapeHtml } from '../../core/sanitize.js';

// 🛑 DOM GUARD
const isAdminPage = !!document.getElementById('admin-dashboard-root');

let examResultsData = [];

/**
 * transformAPIData
 * Maps raw backend results to a consistent format for rendering
 */
function transformAPIData(apiData) {
  const dataArray = Array.isArray(apiData) ? apiData : (apiData.data || []);
  return dataArray.map((item, index) => {
    const total = Number(item.total_marks ?? item.totalMarks ?? item.total ?? 300);
    const obtained = Number(item.obtained_marks ?? item.obtainedMarks ?? item.marksObtained ?? item.obtained ?? 0);
    
    // Ensure subjects is an array
    const subjects = Array.isArray(item.subjects) ? item.subjects : [];

    return {
      id: item.id || `res-${index}`,
      classLevel: item.classLevel || item.class_level || 'N/A',
      section: item.section || 'A',
      rollNumber: item.roll_no || item.rollNumber || item.roll_number || 'N/A',
      studentName: item.studentName || item.student_name || 'N/A',
      examTitle: item.examTitle || item.exam_title || 'N/A',
      subjects: subjects,
      totalMarks: total,
      obtainedMarks: obtained,
      percentage: item.percentage ? Number(item.percentage).toFixed(1) : ((obtained / total) * 100).toFixed(1),
      remarks: item.remarks || '',
      createdAt: item.createdAt || item.created_at
    };
  });
}

/**
 * fetchExamResultsFromAPI
 * Calls the backend to get all results for the current school
 */
async function fetchExamResultsFromAPI() {
  const tbody = document.getElementById('exam-results-tbody');
  if (!tbody) return;

  try {
    console.log('📡 Fetching exam results from backend...');
    tbody.innerHTML = '<tr><td colspan="7" class="empty-state"><i class="fas fa-spinner fa-spin" style="color: var(--accent-blue);"></i><p>Loading results...</p></td></tr>';
    
    const data = await resultsAPI.getAll();

    if (data.error) {
      throw new Error(data.error);
    }

    examResultsData = transformAPIData(data);
    
    // Populate dynamic filter options
    populateExamFilters();
    
    // Setup listeners for search & dropdowns
    setupExamFilterListeners();
    
    // Perform initial filtering/stats calculation and render
    filterExamResults();

  } catch (error) {
    console.error('[RESULTS] Failed to fetch exam results:', error);
    if (tbody) {
      tbody.innerHTML = `
        <tr class="expand-row">
          <td colspan="7" class="empty-state">
            <i class="fas fa-exclamation-circle" style="color: var(--danger);"></i>
            <p>Failed to load exam results. ${error.message === 'Server error' ? 'Internal server error occurred.' : error.message}</p>
            <button onclick="fetchExamResultsFromAPI()" class="btn btn-secondary btn-sm" style="margin-top: 10px;">Retry</button>
          </td>
        </tr>
      `;
    }
  }
}

/**
 * populateExamFilters
 * Extracts unique classes from loaded data to fill the filter dropdown
 */
function populateExamFilters() {
  const classDropdown = document.getElementById('exam-filter-class');
  if (!classDropdown) return;

  const uniqueClasses = [...new Set(examResultsData.map(r => r.classLevel))].sort((a, b) => {
    return String(a).localeCompare(String(b), undefined, { numeric: true, sensitivity: 'base' });
  });

  classDropdown.innerHTML = '<option value="">All Classes</option>';
  uniqueClasses.forEach(cls => {
    if (cls && cls !== 'N/A') {
      const option = document.createElement('option');
      option.value = cls;
      option.textContent = `Class ${cls}`;
      classDropdown.appendChild(option);
    }
  });
}

/**
 * setupExamFilterListeners
 * Attaches input and change listeners safely
 */
function setupExamFilterListeners() {
  const searchInput = document.getElementById('exam-search-student');
  const classDropdown = document.getElementById('exam-filter-class');
  const resultDropdown = document.getElementById('exam-filter-result');

  if (searchInput && !searchInput.dataset.listenerAttached) {
    searchInput.addEventListener('input', filterExamResults);
    searchInput.dataset.listenerAttached = 'true';
  }
  if (classDropdown && !classDropdown.dataset.listenerAttached) {
    classDropdown.addEventListener('change', filterExamResults);
    classDropdown.dataset.listenerAttached = 'true';
  }
  if (resultDropdown && !resultDropdown.dataset.listenerAttached) {
    resultDropdown.addEventListener('change', filterExamResults);
    resultDropdown.dataset.listenerAttached = 'true';
  }
}

/**
 * filterExamResults
 * Filters the main dataset locally and triggers stats update + table render
 */
function filterExamResults() {
  const searchQuery = (document.getElementById('exam-search-student')?.value || '').toLowerCase().trim();
  const selectedClass = document.getElementById('exam-filter-class')?.value || '';
  const selectedResult = document.getElementById('exam-filter-result')?.value || '';

  const filtered = examResultsData.filter(res => {
    const isPass = parseFloat(res.percentage) >= 33;
    const resultText = isPass ? 'pass' : 'fail';

    const matchesSearch = !searchQuery || 
      res.studentName.toLowerCase().includes(searchQuery) || 
      res.rollNumber.toLowerCase().includes(searchQuery);

    const matchesClass = !selectedClass || String(res.classLevel) === String(selectedClass);
    const matchesResult = !selectedResult || resultText === selectedResult.toLowerCase();

    return matchesSearch && matchesClass && matchesResult;
  });

  updateResultsStats(filtered);
  renderExamResultsTable(filtered);
}

/**
 * updateResultsStats
 * Dynamically computes key stats based on the active dataset
 */
function updateResultsStats(data) {
  const totalEl = document.getElementById('exam-total-students');
  const passEl = document.getElementById('exam-pass-percent');
  const failEl = document.getElementById('exam-fail-count');
  const avgEl = document.getElementById('exam-average-score');

  const total = data.length;
  if (total === 0) {
    if (totalEl) totalEl.textContent = '0';
    if (passEl) passEl.textContent = '0%';
    if (failEl) failEl.textContent = '0';
    if (avgEl) avgEl.textContent = '0%';
    return;
  }

  let passCount = 0;
  let percentSum = 0;

  data.forEach(r => {
    const isPass = parseFloat(r.percentage) >= 33;
    if (isPass) passCount++;
    percentSum += parseFloat(r.percentage || 0);
  });

  const passRate = ((passCount / total) * 100).toFixed(1);
  const failCount = total - passCount;
  const avgScore = (percentSum / total).toFixed(1);

  if (totalEl) totalEl.textContent = total;
  if (passEl) passEl.textContent = `${passRate}%`;
  if (failEl) failEl.textContent = failCount;
  if (avgEl) avgEl.textContent = `${avgScore}%`;
}

/**
 * renderExamResultsTable
 * Renders the results in the table with 7 correctly mapped headers
 */
function renderExamResultsTable(data = examResultsData) {
  const tbody = document.getElementById('exam-results-tbody');
  if (!tbody) return;

  if (data.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="6" class="empty-state">
          <i class="fas fa-search" style="font-size: 2rem; color: var(--text-muted); margin-bottom: 0.5rem; display: block;"></i>
          <p>No exam results match your active filters.</p>
        </td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = data.map((res) => {
    const isPass = parseFloat(res.percentage) >= 33;
    return `
      <tr class="result-main-row" onclick="toggleResultExpand('${res.id}')" style="cursor: pointer;">
        <td><code>${escapeHtml(res.rollNumber)}</code></td>
        <td><strong style="color: var(--text-main);">${escapeHtml(res.studentName)}</strong></td>
        <td>Class ${escapeHtml(res.classLevel)} - ${escapeHtml(res.section)}</td>
        <td>
          <span style="font-weight: 600;">${res.obtainedMarks}</span>/<span style="color: var(--text-muted); font-size: 0.85rem;">${res.totalMarks}</span>
        </td>
        <td>
          <div style="font-weight: 600; color: var(--accent-blue);">${res.percentage}%</div>
        </td>
        <td>
          <span class="${isPass ? 'result-pass' : 'result-fail'}">
            ${isPass ? 'PASS' : 'FAIL'}
          </span>
        </td>
      </tr>
      <tr id="expand-${res.id}" class="expand-row">
        <td colspan="6" class="expand-cell">
          <div class="expand-details-box" style="padding: 1.5rem; background: var(--bg-hover);">
            <div class="expand-student-card" style="background: var(--bg-primary); border: 1px solid var(--border-subtle); border-radius: 16px; padding: 1.5rem; box-shadow: 0 4px 15px rgba(0,0,0,0.02); max-width: 600px; margin: 0 auto; display: flex; flex-direction: column; gap: 0.75rem;">
              <!-- Student Header -->
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.25rem;">
                <h3 style="margin: 0; font-size: 1.25rem; font-weight: 700; color: var(--text-main);">${escapeHtml(res.studentName)}</h3>
                <span class="${isPass ? 'result-pass' : 'result-fail'}">${isPass ? 'PASS' : 'FAIL'}</span>
              </div>
              
              <!-- Card Rows -->
              <div style="display: flex; flex-direction: column; gap: 0.75rem;">
                <!-- Roll No Row -->
                <div style="display: flex; justify-content: space-between; align-items: center; padding-bottom: 0.75rem; border-bottom: 1px solid var(--border-subtle);">
                  <div style="display: flex; align-items: center; gap: 0.75rem;">
                    <div style="width: 36px; height: 36px; border-radius: 8px; background: rgba(31, 111, 235, 0.08); display: flex; align-items: center; justify-content: center; color: var(--accent-blue);">
                      <i class="fas fa-id-card"></i>
                    </div>
                    <span style="font-size: 0.8rem; font-weight: 600; color: var(--text-muted); letter-spacing: 0.05em;">ROLL NO.</span>
                  </div>
                  <span style="font-weight: 600; color: var(--accent-blue);">${escapeHtml(res.rollNumber)}</span>
                </div>
                
                <!-- Section Row -->
                <div style="display: flex; justify-content: space-between; align-items: center; padding-bottom: 0.75rem; border-bottom: 1px solid var(--border-subtle);">
                  <div style="display: flex; align-items: center; gap: 0.75rem;">
                    <div style="width: 36px; height: 36px; border-radius: 8px; background: rgba(118, 75, 162, 0.08); display: flex; align-items: center; justify-content: center; color: #764ba2;">
                      <i class="fas fa-graduation-cap"></i>
                    </div>
                    <span style="font-size: 0.8rem; font-weight: 600; color: var(--text-muted); letter-spacing: 0.05em;">SECTION</span>
                  </div>
                  <span style="font-weight: 600; color: var(--text-main);">Class ${escapeHtml(res.classLevel)} - ${escapeHtml(res.section)}</span>
                </div>
                
                <!-- Exam Row -->
                <div style="display: flex; justify-content: space-between; align-items: center; padding-bottom: 0.75rem; border-bottom: 1px solid var(--border-subtle);">
                  <div style="display: flex; align-items: center; gap: 0.75rem;">
                    <div style="width: 36px; height: 36px; border-radius: 8px; background: #fff4e6; display: flex; align-items: center; justify-content: center; color: #fd7e14;">
                      <i class="fas fa-file-alt"></i>
                    </div>
                    <span style="font-size: 0.8rem; font-weight: 600; color: var(--text-muted); letter-spacing: 0.05em;">EXAM</span>
                  </div>
                  <span style="font-weight: 600; color: var(--text-main);">${escapeHtml(res.examTitle)}</span>
                </div>
                
                <!-- Marks Row -->
                <div style="display: flex; justify-content: space-between; align-items: center; padding-bottom: 0.75rem; border-bottom: 1px solid var(--border-subtle);">
                  <div style="display: flex; align-items: center; gap: 0.75rem;">
                    <div style="width: 36px; height: 36px; border-radius: 8px; background: #ebfbee; display: flex; align-items: center; justify-content: center; color: #40c057;">
                      <i class="fas fa-clipboard-check"></i>
                    </div>
                    <span style="font-size: 0.8rem; font-weight: 600; color: var(--text-muted); letter-spacing: 0.05em;">MARKS</span>
                  </div>
                  <span style="font-weight: 600; color: var(--text-main);">${res.obtainedMarks}/${res.totalMarks}</span>
                </div>
                
                <!-- Percentage Row -->
                <div style="display: flex; justify-content: space-between; align-items: center;">
                  <div style="display: flex; align-items: center; gap: 0.75rem;">
                    <div style="width: 36px; height: 36px; border-radius: 8px; background: #fff0f6; display: flex; align-items: center; justify-content: center; color: #e64980;">
                      <i class="fas fa-percentage"></i>
                    </div>
                    <span style="font-size: 0.8rem; font-weight: 600; color: var(--text-muted); letter-spacing: 0.05em;">PERCENTAGE</span>
                  </div>
                  <span style="font-weight: 600; color: var(--accent-blue);">${res.percentage}%</span>
                </div>
              </div>
            </div>
          </div>
        </td>
      </tr>
    `;
  }).join('');
}

/**
 * toggleResultExpand
 */
window.toggleResultExpand = function(id) {
  const row = document.getElementById(`expand-${id}`);
  if (row) {
    row.classList.toggle('open');
  }
};

/**
 * initExamResults
 */
export function initExamResults() {
  if (!isAdminPage) return;
  
  // Guard: only admin
  if (getUserRole() !== 'admin') return;

  fetchExamResultsFromAPI();

  // Add styles if not present
  if (!document.getElementById('exam-results-styles')) {
    const examResultsStyles = document.createElement('style');
    examResultsStyles.id = 'exam-results-styles';
    examResultsStyles.textContent = `
      .exam-results-section .results-table { width: 100%; border-collapse: collapse; margin-top: 1.5rem; }
      .exam-results-section .results-table th { text-align: left; padding: 1rem; background: var(--bg-secondary); color: var(--text-muted); font-size: 0.75rem; text-transform: uppercase; letter-spacing: 0.05em; }
      .exam-results-section .results-table tbody tr.result-main-row:hover { background: var(--bg-hover); }
      .exam-results-section .results-table tbody td { padding: 1rem; border-bottom: 1px solid var(--border-subtle); font-size: 0.875rem; }
      .exam-results-section .results-table .expand-row { display: none; background: #f8fafc; }
      .exam-results-section .results-table .expand-row.open { display: table-row; }
      .exam-results-section .results-table .expand-cell { padding: 0; border-bottom: 1px solid var(--border-subtle); }
      .exam-results-section .result-pass { color: #10b981; font-weight: 600; background: rgba(16, 185, 129, 0.1); padding: 4px 10px; border-radius: 20px; font-size: 0.75rem; display: inline-block; }
      .exam-results-section .result-fail { color: #ef4444; font-weight: 600; background: rgba(239, 68, 68, 0.1); padding: 4px 10px; border-radius: 20px; font-size: 0.75rem; display: inline-block; }
      .exam-results-section .empty-state { text-align: center; padding: 3rem 1rem; color: var(--text-muted); }
    `;
    document.head.appendChild(examResultsStyles);
  }
}

// Bind to window for global access from admin-dashboard.js
window.initExamResults = initExamResults;

// Auto-init when tab is loaded (if already on results tab)
if (isAdminPage) {
    document.addEventListener('DOMContentLoaded', () => {
        // Simple polling to check if the results tab is active or element exists
        const checkTab = setInterval(() => {
            const resultsTab = document.getElementById('exam-results-tbody');
            if (resultsTab) {
                initExamResults();
                clearInterval(checkTab);
            }
        }, 500);
        
        // Stop checking after 10 seconds
        setTimeout(() => clearInterval(checkTab), 10000);
    });
}
