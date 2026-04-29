/**
 * exam-results.js - Exam Results Module
 * Modular, scoped component for viewing and filtering exam results
 */

import { resultsAPI } from '../../core/api.js';
import { populateERPFilters } from './admin-dashboard.js';

// 🛑 DOM GUARD
const isAdminPage = !!document.getElementById('admin-dashboard-root');
const isStudentPage = !!document.getElementById('student-results-container');
const shouldInitialize = isAdminPage || isStudentPage;

// MODULE STATE
let examResultsData = [];
let examResultsExpandedRows = new Set();

/**
 * Initialize exam results module
 */
export function initExamResults() {
  if (!shouldInitialize) return;
  
  console.log('📊 Initializing Exam Results Module...');

  // Initialize dynamic class filter
  populateERPFilters({
    classSelectId: 'exam-filter-class',
    allClassesLabel: 'All Classes',
    onClassChange: applyExamFilters
  });

  // Attach listener for result filter
  const resultFilter = document.getElementById('exam-filter-result');
  if (resultFilter) {
    resultFilter.removeEventListener('change', applyExamFilters);
    resultFilter.addEventListener('change', applyExamFilters);
  }

  // Fetch exam results from backend API
  fetchExamResultsFromAPI();

  console.log('✅ Exam Results Module initialized');
}

/**
 * Fetch exam results from backend API
 */
async function fetchExamResultsFromAPI() {
  try {
    console.log('📡 Fetching exam results from backend...');
    const data = await resultsAPI.getAll();

    if (data.error) {
      throw new Error(data.error);
    }

    examResultsData = transformAPIData(data);
    renderExamResultsTable();

  } catch (error) {
    console.error('❌ Failed to fetch exam results:', error);
    const tbody = document.getElementById('exam-results-tbody');
    if (tbody) {
      tbody.innerHTML = `
        <tr class="expand-row">
          <td colspan="6" class="empty-state">
            <i class="fas fa-exclamation-circle"></i>
            <p>Failed to load exam results. Please try again later.</p>
            <small>${error.message}</small>
          </td>
        </tr>
      `;
    }
  }
}

function transformAPIData(apiData) {
  const dataArray = Array.isArray(apiData) ? apiData : (apiData.data || []);
  return dataArray.map((item, index) => {
    const total = Number(item.total_marks ?? item.totalMarks ?? item.total ?? 300);
    const obtained = Number(item.obtained_marks ?? item.obtainedMarks ?? item.marksObtained ?? item.obtained ?? 0);
    const percentage = item.percentage !== undefined ? Number(item.percentage) : (total > 0 ? (obtained / total * 100) : 0);
    return {
      id: item.id || index + 1,
      roll: item.roll_number || item.roll_no || item.roll || item.rollNumber || 'N/A',
      name: item.student_name || item.name || item.studentName || 'Unknown',
      class: String(item.class_level || item.class || item.classLevel || item.className || ''),
      section: item.section || 'N/A',
      total: total,
      obtained: obtained,
      percentage: percentage,
      result: item.result || (percentage >= 33 ? 'Pass' : 'Fail'),
      subjects: item.subjects || []
    };
  });
}

function renderExamResultsTable(filteredData = null) {
  const data = filteredData || examResultsData;
  const tbody = document.getElementById('exam-results-tbody');

  if (!tbody) return;
  tbody.innerHTML = '';

  if (data.length === 0) {
    tbody.innerHTML = `
      <tr class="expand-row">
        <td colspan="6" class="empty-state">
          <i class="fas fa-search"></i>
          <p>No exam results found</p>
        </td>
      </tr>
    `;
    updateExamSummary([]);
    return;
  }

  data.forEach((student) => {
    const mainRow = document.createElement('tr');
    mainRow.className = 'exam-results-row';
    mainRow.innerHTML = `
      <td>${student.roll}</td>
      <td>${student.name}</td>
      <td>${student.section}</td>
      <td>${Number(student.obtained)}/${Number(student.total)}</td>
      <td>${Number(student.percentage.toFixed(1))}%</td>
      <td><span class="result-${student.result.toLowerCase()}">${student.result}</span></td>
    `;

    mainRow.addEventListener('click', () => toggleExamResultsExpand(student.id));
    tbody.appendChild(mainRow);

    const expandRow = document.createElement('tr');
    expandRow.className = `expand-row exam-expand-${student.id}`;
    expandRow.innerHTML = `
      <td colspan="6" class="expand-cell">
        <strong>Subject Breakdown:</strong><br>
        ${student.subjects.map(s => `<strong>${s.name}:</strong> ${Number(s.marks !== undefined ? s.marks : (s.obtained || 0))} marks`).join('<br>')}
      </td>
    `;
    tbody.appendChild(expandRow);
  });

  updateExamSummary(data);
}

function toggleExamResultsExpand(studentId) {
  const expandRow = document.querySelector(`.exam-expand-${studentId}`);
  if (expandRow) {
    expandRow.classList.toggle('open');
    if (expandRow.classList.contains('open')) {
      examResultsExpandedRows.add(studentId);
    } else {
      examResultsExpandedRows.delete(studentId);
    }
  }
}

function updateExamSummary(data) {
  const totalEl = document.getElementById('exam-total-students');
  const passPercentEl = document.getElementById('exam-pass-percent');
  const failCountEl = document.getElementById('exam-fail-count');

  if (!totalEl || !passPercentEl || !failCountEl) return;

  const total = data.length;
  const passCount = data.filter(s => s.result === 'Pass').length;
  const failCount = total - passCount;
  const passPercent = total > 0 ? ((passCount / total) * 100).toFixed(1) : 0;

  totalEl.textContent = total;
  passPercentEl.textContent = `${passPercent}%`;
  failCountEl.textContent = failCount;
}

function applyExamFilters() {
  const classFilter = document.getElementById('exam-filter-class').value;
  const resultFilter = document.getElementById('exam-filter-result').value;

  let filtered = examResultsData.filter(student => {
    return (
      (!classFilter || student.class === classFilter) &&
      (!resultFilter || student.result === resultFilter)
    );
  });

  renderExamResultsTable(filtered);
}

// 🎨 Styles
if (shouldInitialize) {
  const examResultsStyles = document.createElement('style');
  examResultsStyles.textContent = `
    .exam-results-section { width: 100%; }
    .exam-results-section .summary-cards { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1rem; margin-bottom: 1.5rem; }
    .exam-results-section .summary-card { background: var(--bg-secondary); padding: 1.5rem; border-radius: var(--radius-sm); text-align: center; border: 1px solid var(--border-subtle); transition: var(--transition); }
    .exam-results-section .summary-card:hover { border-color: var(--accent-blue); }
    .exam-results-section .summary-card h4 { font-size: 0.75rem; color: var(--text-muted); text-transform: uppercase; margin-bottom: 0.5rem; font-weight: 600; }
    .exam-results-section .summary-card p { font-size: 1.75rem; margin: 0; font-weight: 700; color: var(--accent-blue); }
    .exam-results-section .filters { display: flex; gap: 1rem; margin-bottom: 1.5rem; flex-wrap: wrap; }
    .exam-results-section .filters select { flex: 1; min-width: 200px; padding: 0.5rem; border: 1px solid var(--border-subtle); border-radius: var(--radius-sm); background: var(--bg-secondary); color: var(--text-main); }
    .exam-results-section .results-table { width: 100%; border-collapse: collapse; }
    .exam-results-section .results-table thead th { background: var(--bg-secondary); border-bottom: 2px solid var(--accent-blue); padding: 1rem; text-align: left; font-weight: 600; }
    .exam-results-section .results-table tbody tr { border-bottom: 1px solid var(--border-subtle); }
    .exam-results-section .results-table tbody tr:hover { background: var(--bg-hover); cursor: pointer; }
    .exam-results-section .results-table tbody td { padding: 1rem; font-size: 0.875rem; }
    .exam-results-section .results-table .expand-row { display: none; background: var(--bg-hover); }
    .exam-results-section .results-table .expand-row.open { display: table-row; }
    .exam-results-section .results-table .expand-cell { padding: 1rem; font-size: 0.85rem; color: var(--text-muted); line-height: 1.6; }
    .exam-results-section .result-pass { color: var(--success); font-weight: 600; }
    .exam-results-section .result-fail { color: var(--danger); font-weight: 600; }
    .exam-results-section .empty-state { text-align: center; padding: 3rem 1rem; color: var(--text-muted); }
  `;
  document.head.appendChild(examResultsStyles);

  window.initExamResults = initExamResults;
  document.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => {
      const tbody = document.getElementById('exam-results-tbody');
      if (tbody && isAdminPage) {
        initExamResults();
      }
    }, 300);
  });
}
