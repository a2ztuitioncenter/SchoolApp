// Master portal init — theme is handled automatically by CSS prefers-color-scheme
function init() {
  console.log('✅ Index JS Init');
  setupGetStartedHandler();
  setupLoginCardHandlers();
  setupHeaderLoginHandler();
  console.log('🚀 Index Page Loaded');
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}

/**
 * Setup Get Started button handler to reveal login modal
 */
function setupGetStartedHandler() {
  const getStartedBtn = document.getElementById('btn-get-started');
  const loginModal = document.getElementById('login-modal');

  if (getStartedBtn && loginModal) {
    getStartedBtn.addEventListener('click', (e) => {
      e.preventDefault();
      console.log('Get Started clicked');
      const isHidden = loginModal.classList.contains('login-modal--hidden');
      
      if (isHidden) {
        loginModal.classList.remove('login-modal--hidden');
        loginModal.classList.add('login-modal--visible');
        document.body.style.overflow = 'hidden';
      } else {
        loginModal.classList.add('login-modal--hidden');
        loginModal.classList.remove('login-modal--visible');
        document.body.style.overflow = 'auto';
      }
    });
  }

  // Close modal when clicking overlay or close button
  const modalOverlay = loginModal.querySelector('.login-modal-overlay');
  const closeBtn = document.getElementById('login-modal-close');

  if (modalOverlay) {
    modalOverlay.addEventListener('click', () => {
      loginModal.classList.add('login-modal--hidden');
      loginModal.classList.remove('login-modal--visible');
      document.body.style.overflow = 'auto';
    });
  }

  if (closeBtn) {
    closeBtn.addEventListener('click', () => {
      loginModal.classList.add('login-modal--hidden');
      loginModal.classList.remove('login-modal--visible');
      document.body.style.overflow = 'auto';
    });
  }

  // Close modal on Escape key
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && loginModal.classList.contains('login-modal--visible')) {
      loginModal.classList.add('login-modal--hidden');
      loginModal.classList.remove('login-modal--visible');
      document.body.style.overflow = 'auto';
    }
  });
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
