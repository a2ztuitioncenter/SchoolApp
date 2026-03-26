/**
 * master-dashboard.js - Master Dashboard navigation and login routing
 */
// alert("Welcome to master dashboard")
document.addEventListener('DOMContentLoaded', () => {
  setupLoginCardHandlers();
  setupHeaderLoginHandler();
  console.log(' Master dashboard initialized');
});
// alert("Welcome")
/**
 * Setup login card click handlers
 */
function setupLoginCardHandlers() {
  const loginCards = document.querySelectorAll('.login-card');

  loginCards.forEach(card => {
    card.addEventListener('click', (e) => {
      // Prevent event bubbling if clicking on the arrow
      if (e.target.closest('a')) {
        e.preventDefault();
      }

      const loginType = card.getAttribute('data-login-type');
      console.log('Login card clicked:', loginType);
      handleLoginCardClick(loginType);
    });
  });
}

/**
 * Setup header login button handler
 */
function setupHeaderLoginHandler() {
  const headerLoginBtn = document.getElementById('header-login');
  if (headerLoginBtn) {
    headerLoginBtn.addEventListener('click', (e) => {
      e.preventDefault();
      console.log('Header login clicked');
      // Redirect to student login as default
      window.location.href = '/student-login.html';
    });
  }
}

/**
 * Handle login card click - redirect to appropriate login page
 */
function handleLoginCardClick(loginType) {
  console.log('Handling login for type:', loginType);
  
  switch(loginType) {
    case 'student':
      window.location.href = '/student-login.html';
      break;
    case 'teacher':
      window.location.href = '/teacher-login.html';
      break;

    case 'admin':
      window.location.href = '/admin-login.html';
      break;
    default:
      console.error('Unknown login type:', loginType);
  }
}

export { setupLoginCardHandlers, handleLoginCardClick };
