import { resultsAPI } from '../../core/api.js';
import { getUserId } from '../../core/auth-manager.js';
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
    tbody.innerHTML = '<tr><td colspan="6" class="empty-state"><i class="fas fa-spinner fa-spin"></i><p>Loading results...</p></td></tr>';
    
    const data = await resultsAPI.getAll();

    if (data.error) {
      throw new Error(data.error);
    }

    examResultsData = transformAPIData(data);
    renderExamResultsTable();

  } catch (error) {
    console.error('[RESULTS] Failed to fetch exam results:', error);
    if (tbody) {
      tbody.innerHTML = `
        <tr class="expand-row">
          <td colspan="6" class="empty-state">
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
 * renderExamResultsTable
 * Renders the results in the table
 */
function renderExamResultsTable() {
  const tbody = document.getElementById('exam-results-tbody');
  if (!tbody) return;

  if (examResultsData.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="6" class="empty-state">
          <i class="fas fa-search"></i>
          <p>No exam results found.</p>
        </td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = examResultsData.map((res) => {
    const isPass = parseFloat(res.percentage) >= 33;
    return `
      <tr class="result-main-row" onclick="toggleResultExpand('${res.id}')" style="cursor: pointer;">
        <td>${escapeHtml(res.studentName)}</td>
        <td>${escapeHtml(res.rollNumber)}</td>
        <td>Class ${escapeHtml(res.classLevel)} - ${escapeHtml(res.section)}</td>
        <td>${escapeHtml(res.examTitle)}</td>
        <td>
          <div style="font-weight: 600;">${res.obtainedMarks} / ${res.totalMarks}</div>
          <div style="font-size: 0.75rem; color: var(--text-muted);">${res.percentage}%</div>
        </td>
        <td>
          <span class="${isPass ? 'result-pass' : 'result-fail'}">
            ${isPass ? 'PASS' : 'FAIL'}
          </span>
        </td>
      </tr>
      <tr id="expand-${res.id}" class="expand-row">
        <td colspan="6" class="expand-cell">
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; padding: 10px;">
            <div>
              <h4 style="margin-bottom: 10px; border-bottom: 1px solid var(--border-subtle);">Subject Wise Marks</h4>
              <table style="width: 100%; border-collapse: collapse;">
                <thead>
                  <tr style="text-align: left; font-size: 0.75rem; color: var(--text-muted);">
                    <th>Subject</th>
                    <th>Obtained</th>
                    <th>Total</th>
                    <th>Grade</th>
                  </tr>
                </thead>
                <tbody>
                  ${res.subjects.map(s => `
                    <tr>
                      <td>${escapeHtml(s.name)}</td>
                      <td>${s.obtained}</td>
                      <td>${s.total}</td>
                      <td><span class="badge-blue">${escapeHtml(s.grade || '-')}</span></td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            </div>
            <div>
              <h4 style="margin-bottom: 10px; border-bottom: 1px solid var(--border-subtle);">Remarks & Info</h4>
              <p><strong>Remarks:</strong> ${escapeHtml(res.remarks || 'No remarks provided.')}</p>
              <p style="margin-top: 10px; font-size: 0.8rem; color: var(--text-muted);">
                Recorded on: ${new Date(res.createdAt).toLocaleString()}
              </p>
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
      .exam-results-section .result-pass { color: #10b981; font-weight: 600; }
      .exam-results-section .result-fail { color: #ef4444; font-weight: 600; }
      .exam-results-section .empty-state { text-align: center; padding: 3rem 1rem; color: var(--text-muted); }
    `;
    document.head.appendChild(examResultsStyles);
  }
}

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
