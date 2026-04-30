/**
 * student-results.js - Student Result Module
 * Securely displays only the logged-in student's exam results
 * Integrated into Student Dashboard
 */

import { getUserId } from '../../core/auth-manager.js';
import { studentAPI } from '../../core/api.js';

// ═══════════════════════════════════════════════════════════════════
// SCOPED STYLES - Prevents conflicts with dashboard CSS
// ═══════════════════════════════════════════════════════════════════
const studentResultsStyles = document.createElement('style');
studentResultsStyles.textContent = `
  /* STUDENT RESULTS SECTION */
  .student-results-section {
    width: 100%;
  }

  .student-results-section .result-card {
    background: white;
    border-radius: 8px;
    padding: 1.5rem;
    margin-bottom: 1rem;
    border: 1px solid #e5e7eb;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
  }

  /* HEADER */
  .student-results-section .result-header {
    margin-bottom: 1.5rem;
    border-bottom: 2px solid #f0f2f5;
    padding-bottom: 1rem;
  }

  .student-results-section .result-header h2 {
    margin: 0 0 0.5rem 0;
    font-size: 1.25rem;
    color: #1a1a1a;
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  .student-results-section .result-meta {
    font-size: 0.875rem;
    color: #666666;
    display: flex;
    gap: 1rem;
    flex-wrap: wrap;
  }

  .student-results-section .result-meta span {
    display: flex;
    align-items: center;
    gap: 0.25rem;
  }

  /* SCORE DISPLAY */
  .student-results-section .score-display {
    text-align: center;
    padding: 2rem 1rem;
    background: linear-gradient(135deg, #f8f9fa 0%, #f0f2f5 100%);
    border-radius: 8px;
    margin-bottom: 1.5rem;
  }

  .student-results-section .score-display h1 {
    margin: 0 0 0.5rem 0;
    font-size: 2.5rem;
    font-weight: 700;
    color: #0052cc;
  }

  .student-results-section .score-display p {
    margin: 0;
    color: #666666;
    font-size: 0.875rem;
  }

  /* RESULT BADGE */
  .student-results-section .result-badge {
    display: inline-block;
    padding: 0.5rem 1rem;
    border-radius: 6px;
    font-size: 0.875rem;
    font-weight: 600;
    margin-top: 0.5rem;
  }

  .student-results-section .result-badge.pass {
    background: #d4edda;
    color: #1a7f37;
  }

  .student-results-section .result-badge.fail {
    background: #f8d7da;
    color: #cf222e;
  }

  /* PROGRESS BAR */
  .student-results-section .progress-container {
    margin: 1.5rem 0;
  }

  .student-results-section .progress-label {
    font-size: 0.75rem;
    font-weight: 600;
    color: #666666;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    margin-bottom: 0.5rem;
    display: flex;
    justify-content: space-between;
  }

  .student-results-section .progress-bar-wrapper {
    height: 10px;
    background: #e5e7eb;
    border-radius: 10px;
    overflow: hidden;
  }

  .student-results-section .progress-bar {
    height: 100%;
    background: linear-gradient(90deg, #0052cc 0%, #0043a8 100%);
    transition: width 0.6s ease;
    border-radius: 10px;
  }

  /* SUBJECTS LIST */
  .student-results-section .subjects-container {
    margin-top: 1.5rem;
  }

  .student-results-section .subjects-title {
    font-size: 0.875rem;
    font-weight: 600;
    color: #1a1a1a;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    margin-bottom: 1rem;
    color: #666666;
  }

  .student-results-section .subject-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 0.75rem 0;
    border-bottom: 1px solid #e5e7eb;
    font-size: 0.875rem;
  }

  .student-results-section .subject-item:last-child {
    border-bottom: none;
  }

  .student-results-section .subject-name {
    font-weight: 500;
    color: #1a1a1a;
  }

  .student-results-section .subject-marks {
    color: #0052cc;
    font-weight: 600;
  }

  /* REMARKS */
  .student-results-section .remarks-container {
    margin-top: 1.5rem;
    padding: 1rem;
    border-radius: 8px;
    text-align: center;
    font-weight: 500;
    font-size: 0.95rem;
  }

  .student-results-section .remarks-container.pass {
    background: #d4edda;
    color: #1a7f37;
  }

  .student-results-section .remarks-container.fail {
    background: #f8d7da;
    color: #cf222e;
  }

  /* LOADING & ERROR STATES */
  .student-results-section .loading-state,
  .student-results-section .error-state,
  .student-results-section .empty-state {
    text-align: center;
    padding: 2rem 1rem;
    color: #666666;
  }

  .student-results-section .loading-state i,
  .student-results-section .error-state i,
  .student-results-section .empty-state i {
    font-size: 3rem;
    opacity: 0.3;
    margin-bottom: 1rem;
    display: block;
  }

  .student-results-section .error-state {
    color: #cf222e;
  }

  /* MOBILE RESPONSIVE */
  @media (max-width: 768px) {
    .student-results-section .score-display {
      padding: 1.5rem 1rem;
    }

    .student-results-section .score-display h1 {
      font-size: 2rem;
    }

    .student-results-section .result-meta {
      flex-direction: column;
      gap: 0.5rem;
    }

    .student-results-section .result-card {
      padding: 1rem;
    }
  }
`;
document.head.appendChild(studentResultsStyles);

// ═══════════════════════════════════════════════════════════════════
// MODULE STATE - Encapsulated within this module
// ═══════════════════════════════════════════════════════════════════
let studentResult = null;
let studentId = null;

// ═══════════════════════════════════════════════════════════════════
// CORE FUNCTIONS
// ═══════════════════════════════════════════════════════════════════

/**
 * Fetch result data from backend for logged-in student
 * SECURITY: Only fetch current student's result using their ID
 */
async function fetchStudentResult() {
  try {
    // Get current student ID from auth manager
    studentId = getUserId();
    
    if (!studentId) {
      throw new Error('Student ID not found in session');
    }

    console.log(`📊 Fetching results for student ID: ${studentId}`);

    // Fetch ONLY this student's results using studentAPI
    // studentAPI automatically includes JWT token in Authorization header
    const data = await studentAPI.getResults(studentId);

    if (data.error) {
      console.error('API Error:', data.error);
      throw new Error(data.error);
    }

    console.log('[RESULTS] Student result fetched:', data);

    // Handle both array and object responses
    let resultArray = Array.isArray(data) ? data : (Array.isArray(data.data) ? data.data : []);
    
    if (!resultArray || resultArray.length === 0) {
      console.log('ℹ️ No exam results found for this student yet');
      showEmptyState();
      return;
    }

    // Get the first result to display
    const resultData = resultArray[0];
    studentResult = transformResultData(resultData);
    renderStudentResult();

  } catch (error) {
    console.error('[RESULTS] Failed to fetch student result:', error);
    showErrorState(error.message);
  }
}

/**
 * Transform API response to match expected format
 */
function transformResultData(apiData) {
  // Correctly prioritized fields from API (supporting both snake and camel)
  const obtainedMarks = Number(apiData.obtained_marks || apiData.obtained || apiData.marksObtained || apiData.obtainedMarks || 0);
  const totalMarks = Number(apiData.total_marks || apiData.total || apiData.totalMarks || 300);
  const percentageValue = apiData.percentage !== undefined ? Number(apiData.percentage) : (totalMarks > 0 ? (obtainedMarks / totalMarks * 100) : 0);

  return {
    name: apiData.student_name || apiData.name || apiData.studentName || 'Student',
    class: String(apiData.class_level || apiData.class || apiData.classLevel || apiData.className || 'N/A'),
    roll: apiData.roll_number || apiData.roll_no || apiData.roll || apiData.rollNumber || 'N/A',
    exam: apiData.exam_title || apiData.exam || apiData.examTitle || 'Midterm 2026',
    total: totalMarks,
    obtained: obtainedMarks,
    percentage: Number(percentageValue.toFixed(1)),
    result: apiData.result || (percentageValue >= 33 ? 'Pass' : 'Fail'),
    subjects: apiData.subjects || []
  };
}

/**
 * Render student result in dashboard
 */
function renderStudentResult() {
  const container = document.getElementById('student-results-container');
  
  if (!container || !studentResult) {
    console.warn('⚠️ Result container or data not found');
    return;
  }

  const isPassed = studentResult.result === 'Pass';
  const remarkText = isPassed 
    ? '🎉 Congratulations! You passed.' 
    : '⚠️ Keep improving. You can do better next time!';

  container.innerHTML = `
    <div class="student-results-section">
      <!-- Header with Student Info -->
      <div class="result-card">
        <div class="result-header">
          <h2><i class="fas fa-user"></i> ${studentResult.name}</h2>
          <div class="result-meta">
            <span><i class="fas fa-graduation-cap"></i> Class ${studentResult.class}</span>
            <span><i class="fas fa-id-card"></i> Roll ${studentResult.roll}</span>
            <span><i class="fas fa-book"></i> ${studentResult.exam}</span>
          </div>
        </div>

        <!-- Score Display -->
        <div class="score-display">
          <h1>${Number(studentResult.percentage)}%</h1>
          <p>${Number(studentResult.obtained)}/${Number(studentResult.total)} Marks</p>
          <div class="result-badge ${isPassed ? 'pass' : 'fail'}">
            ${studentResult.result}
          </div>
        </div>

        <!-- Progress Bar -->
        <div class="progress-container">
          <div class="progress-label">
            <span>Progress</span>
          </div>
          <div class="progress-bar-wrapper">
            <div class="progress-bar" style="width: ${studentResult.percentage}%"></div>
          </div>
        </div>
      </div>

      <!-- Subjects -->
      ${studentResult.subjects.length > 0 ? `
        <div class="result-card">
          <div class="subjects-container">
            <div class="subjects-title">Subject Breakdown</div>
            ${studentResult.subjects.map(subject => `
              <div class="subject-item">
                <span class="subject-name">${subject.name || 'Subject'}</span>
                <span class="subject-marks">${Number(subject.marks !== undefined ? subject.marks : (subject.obtained || 0))}/${Number(subject.total || 100)}</span>
              </div>
            `).join('')}
          </div>
        </div>
      ` : ''}

      <!-- Remarks -->
      <div class="result-card">
        <div class="remarks-container ${isPassed ? 'pass' : 'fail'}">
          ${remarkText}
        </div>
      </div>
    </div>
  `;
}

/**
 * Show empty state when no results found
 */
function showEmptyState() {
  const container = document.getElementById('student-results-container');
  if (container) {
    container.innerHTML = `
      <div class="student-results-section">
        <div class="result-card">
          <div class="empty-state">
            <i class="fas fa-file-alt"></i>
            <p>No exam results available yet.</p>
            <p style="font-size: 0.85rem; color: #999;">Check back after your exams are graded.</p>
          </div>
        </div>
      </div>
    `;
  }
}

/**
 * Show error state
 */
function showErrorState(errorMessage) {
  const container = document.getElementById('student-results-container');
  if (container) {
    container.innerHTML = `
      <div class="student-results-section">
        <div class="result-card">
          <div class="error-state">
            <i class="fas fa-exclamation-circle"></i>
            <p>Failed to load results</p>
            <p style="font-size: 0.85rem;">${errorMessage}</p>
          </div>
        </div>
      </div>
    `;
  }
}

/**
 * Initialize student results module
 */
export function initStudentResults() {
  console.log('📊 Initializing Student Results Module...');
  
  // Show loading state
  const container = document.getElementById('student-results-container');
  if (container) {
    container.innerHTML = `
      <div class="student-results-section">
        <div class="result-card">
          <div class="loading-state">
            <i class="fas fa-hourglass-end"></i>
            <p>Loading your results...</p>
          </div>
        </div>
      </div>
    `;
  }

  // Fetch data from backend
  fetchStudentResult();
  
  console.log('[RESULTS] Student Results Module initialized');
}

// Auto-initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  setTimeout(() => {
    const container = document.getElementById('student-results-container');
    if (container) {
      initStudentResults();
    }
  }, 300);
});
