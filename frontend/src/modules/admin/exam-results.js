/**
 * exam-results.js - Exam Results Module
 * Modular, scoped component for viewing and filtering exam results
 * Integrates seamlessly into Admin Dashboard without breaking existing functionality
 */

import { resultsAPI } from '../../core/api.js';

// ═══════════════════════════════════════════════════════════════════
// SCOPED STYLES - Prevents conflicts with dashboard CSS
// ═══════════════════════════════════════════════════════════════════
const examResultsStyles = document.createElement('style');
examResultsStyles.textContent = `
  /* EXAM RESULTS SECTION */
  .exam-results-section {
    width: 100%;
  }

  .exam-results-section .summary-cards {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: 1rem;
    margin-bottom: 1.5rem;
  }

  .exam-results-section .summary-card {
    background: var(--bg-secondary) !important;
    padding: 1.5rem !important;
    border-radius: var(--radius-sm) !important;
    text-align: center !important;
    border: 1px solid var(--border-subtle) !important;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05) !important;
    transition: var(--transition) !important;
  }

  .exam-results-section .summary-card:hover {
    box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1) !important;
    border-color: var(--accent-blue) !important;
  }

  .exam-results-section .summary-card h4 {
    font-size: 0.75rem !important;
    color: var(--text-muted) !important;
    text-transform: uppercase !important;
    letter-spacing: 0.05em !important;
    margin: 0 0 0.5rem 0 !important;
    font-weight: 600 !important;
  }

  .exam-results-section .summary-card p {
    font-size: 1.75rem !important;
    margin: 0 !important;
    font-weight: 700 !important;
    color: var(--accent-blue) !important;
  }

  /* FILTERS */
  .exam-results-section .filters {
    display: flex !important;
    gap: 1rem !important;
    margin-bottom: 1.5rem !important;
    flex-wrap: wrap !important;
  }

  .exam-results-section .filters select {
    flex: 1 !important;
    min-width: 200px !important;
    padding: 0.5rem !important;
    border: 1px solid var(--border-subtle) !important;
    border-radius: var(--radius-sm) !important;
    font-size: 0.875rem !important;
    background: var(--bg-secondary) !important;
    color: var(--text-main) !important;
    cursor: pointer !important;
    transition: var(--transition) !important;
  }

  .exam-results-section .filters select:hover,
  .exam-results-section .filters select:focus {
    border-color: var(--accent-blue) !important;
    outline: none !important;
    box-shadow: 0 0 0 3px var(--accent-blue-faded) !important;
  }

  /* TABLE STYLES */
  .exam-results-section .results-table {
    width: 100% !important;
    border-collapse: collapse !important;
  }

  .exam-results-section .results-table thead th {
    background: var(--bg-secondary) !important;
    border-bottom: 2px solid var(--accent-blue) !important;
    padding: 1rem !important;
    text-align: left !important;
    font-weight: 600 !important;
    font-size: 0.875rem !important;
    color: var(--text-main) !important;
  }

  .exam-results-section .results-table tbody tr {
    border-bottom: 1px solid var(--border-subtle) !important;
    transition: var(--transition) !important;
  }

  .exam-results-section .results-table tbody tr.exam-results-row:hover {
    background: var(--bg-hover) !important;
    cursor: pointer !important;
  }

  .exam-results-section .results-table tbody td {
    padding: 1rem !important;
    font-size: 0.875rem !important;
    color: var(--text-main) !important;
  }

  .exam-results-section .results-table .expand-row {
    background: var(--bg-hover) !important;
    display: none !important;
  }

  .exam-results-section .results-table .expand-row.open {
    display: table-row !important;
  }

  .exam-results-section .results-table .expand-cell {
    padding: 1rem !important;
    font-size: 0.85rem !important;
    color: var(--text-muted) !important;
    line-height: 1.6 !important;
  }

  .exam-results-section .results-table .expand-cell strong {
    color: var(--accent-blue) !important;
  }

  /* RESULT BADGE */
  .exam-results-section .result-pass {
    color: var(--success) !important;
    font-weight: 600 !important;
  }

  .exam-results-section .result-fail {
    color: var(--danger) !important;
    font-weight: 600 !important;
  }

  /* EMPTY STATE */
  .exam-results-section .empty-state {
    text-align: center !important;
    padding: 3rem 1rem !important;
    color: var(--text-muted) !important;
  }

  .exam-results-section .empty-state i {
    font-size: 3rem !important;
    opacity: 0.3 !important;
    margin-bottom: 1rem !important;
    display: block !important;
  }

  /* MOBILE RESPONSIVE */
  @media (max-width: 768px) {
    .exam-results-section .summary-cards {
      grid-template-columns: 1fr !important;
    }

    .exam-results-section .filters {
      flex-direction: column !important;
    }

    .exam-results-section .filters select {
      width: 100% !important;
    }

    .exam-results-section .results-table {
      font-size: 0.75rem !important;
    }

    .exam-results-section .results-table th,
    .exam-results-section .results-table td {
      padding: 0.75rem !important;
    }
  }
`;
document.head.appendChild(examResultsStyles);

// ═══════════════════════════════════════════════════════════════════
// DATA FETCHING - Connect to backend exam_results table
// ═══════════════════════════════════════════════════════════════════

/**
 * Fetch exam results from backend API
 */
async function fetchExamResultsFromAPI() {
  try {
    console.log('📡 Fetching exam results from backend...');
    
    // Call backend API to fetch all exam results
    // resultsAPI automatically includes JWT token in Authorization header
    const data = await resultsAPI.getAll();

    if (data.error) {
      throw new Error(data.error);
    }

    console.log('✅ Exam results fetched successfully:', data);
    
    // Transform API data to match our expected format
    examResultsData = transformAPIData(data);
    
    // Render the table
    renderExamResultsTable();
    
  } catch (error) {
    console.error('❌ Failed to fetch exam results:', error);
    
    // Show error message in table
    const tbody = document.getElementById('exam-results-tbody');
    if (tbody) {
      tbody.innerHTML = `
        <tr class="expand-row">
          <td colspan="5" class="empty-state">
            <i class="fas fa-exclamation-circle"></i>
            <p>Failed to load exam results. Please try again later.</p>
            <small>${error.message}</small>
          </td>
        </tr>
      `;
    }
  }
}

/**
 * Transform API response to match expected data format
 * Adjust this function based on your actual API response structure
 */
function transformAPIData(apiData) {
  // Handle both array and object with data property
  const dataArray = Array.isArray(apiData) ? apiData : (apiData.data || []);
  
  return dataArray.map((item, index) => ({
    id: item.id || index + 1,
    roll: item.roll || item.rollNumber || index + 1,
    name: item.name || item.studentName || 'Unknown',
    class: String(item.class || item.classLevel || item.className || ''),
    total: item.total || item.totalMarks || 300,
    obtained: item.obtained || item.marksObtained || 0,
    percentage: ((item.obtained || item.marksObtained || 0) / (item.total || item.totalMarks || 300) * 100),
    result: ((item.obtained || item.marksObtained || 0) / (item.total || item.totalMarks || 300) * 100) >= 33 ? 'Pass' : 'Fail',
    subjects: item.subjects || [
      { name: 'Subject 1', marks: item.subject1Marks || 0 },
      { name: 'Subject 2', marks: item.subject2Marks || 0 },
      { name: 'Subject 3', marks: item.subject3Marks || 0 }
    ]
  }));
}

// ═══════════════════════════════════════════════════════════════════
// MODULE STATE - Encapsulated within this module
// ═══════════════════════════════════════════════════════════════════
let examResultsData = [];
let examResultsExpandedRows = new Set();

// ═══════════════════════════════════════════════════════════════════
// CORE FUNCTIONS
// ═══════════════════════════════════════════════════════════════════

/**
 * Render the exam results table with filtered data
 */
function renderExamResultsTable(filteredData = null) {
  const data = filteredData || examResultsData;
  const tbody = document.getElementById('exam-results-tbody');
  
  if (!tbody) {
    console.warn('⚠️ Exam results table body not found');
    return;
  }

  tbody.innerHTML = '';

  if (data.length === 0) {
    tbody.innerHTML = `
      <tr class="expand-row">
        <td colspan="5" class="empty-state">
          <i class="fas fa-search"></i>
          <p>No exam results found</p>
        </td>
      </tr>
    `;
    updateExamSummary([]);
    return;
  }

  data.forEach((student) => {
    // Main row
    const mainRow = document.createElement('tr');
    mainRow.className = 'exam-results-row';
    mainRow.innerHTML = `
      <td>${student.roll}</td>
      <td>${student.name}</td>
      <td>${student.obtained}/${student.total}</td>
      <td>${student.percentage.toFixed(1)}%</td>
      <td><span class="result-${student.result.toLowerCase()}">${student.result}</span></td>
    `;
    
    mainRow.addEventListener('click', () => toggleExamResultsExpand(student.id));
    tbody.appendChild(mainRow);

    // Expand row (hidden by default)
    const expandRow = document.createElement('tr');
    expandRow.className = `expand-row exam-expand-${student.id}`;
    expandRow.innerHTML = `
      <td colspan="5" class="expand-cell">
        <strong>Subject Breakdown:</strong><br>
        ${student.subjects.map(s => `<strong>${s.name}:</strong> ${s.marks} marks`).join('<br>')}
      </td>
    `;
    tbody.appendChild(expandRow);
  });

  updateExamSummary(data);
}

/**
 * Toggle expand/collapse on exam results row
 */
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

/**
 * Update summary cards based on filtered data
 */
function updateExamSummary(data) {
  const totalEl = document.getElementById('exam-total-students');
  const passPercentEl = document.getElementById('exam-pass-percent');
  const failCountEl = document.getElementById('exam-fail-count');

  if (!totalEl || !passPercentEl || !failCountEl) {
    console.warn('⚠️ Summary card elements not found');
    return;
  }

  const total = data.length;
  const passCount = data.filter(s => s.result === 'Pass').length;
  const failCount = total - passCount;
  const passPercent = total > 0 ? ((passCount / total) * 100).toFixed(1) : 0;

  totalEl.textContent = total;
  passPercentEl.textContent = `${passPercent}%`;
  failCountEl.textContent = failCount;
}

/**
 * Apply filters to exam results
 */
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

/**
 * Initialize exam results module
 * Call this when the Exam Results tab is shown
 */
export function initExamResults() {
  console.log('📊 Initializing Exam Results Module...');

  // Attach event listeners
  const classFilter = document.getElementById('exam-filter-class');
  const resultFilter = document.getElementById('exam-filter-result');

  if (classFilter) {
    classFilter.removeEventListener('change', applyExamFilters);
    classFilter.addEventListener('change', applyExamFilters);
  }
  
  if (resultFilter) {
    resultFilter.removeEventListener('change', applyExamFilters);
    resultFilter.addEventListener('change', applyExamFilters);
  }

  // Fetch exam results from backend API
  fetchExamResultsFromAPI();

  console.log('✅ Exam Results Module initialized');
}

// Auto-initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  setTimeout(() => {
    const tbody = document.getElementById('exam-results-tbody');
    if (tbody) {
      initExamResults();
    }
  }, 300);
});
