// Master portal init — theme is handled automatically by CSS prefers-color-scheme
function init() {
  console.log('✅ Index JS Init');
  setupLoginCardHandlers();
  setupHeaderLoginHandler();
  console.log('🚀 Index Page Loaded');
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
// alert("Welcome")
/**
 * Setup login card click handlers
 */
function setupLoginCardHandlers() {
  const loginCards = document.querySelectorAll('.login-card');

  loginCards.forEach(card => {
    card.addEventListener('click', (e) => {
      // If clicking the anchor directly, let it handle the navigation
      if (e.target.closest('a')) return;

      const loginType = card.getAttribute('data-login-type');
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
