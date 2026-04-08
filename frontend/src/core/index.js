// Master portal init — theme is handled automatically by CSS prefers-color-scheme
function init() {
  console.log('✅ Index JS Init');
  setupGetStartedTypingAnimation();
  setupGetStartedHandler();
  setupHeaderSignupHandler();
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
 * Typing animation for "Get Started" button text
 */
function setupGetStartedTypingAnimation() {
  const btn = document.getElementById('btn-get-started');
  if (!btn) return;

  const text = btn.textContent; // "Get Started"
  const speed = 150; // milliseconds per character
  let index = 0;

  // Calculate exact button width needed for full text (before clearing)
  const originalWidth = btn.offsetWidth;
  
  // Freeze the button completely during animation
  btn.style.width = originalWidth + 'px'; // Fix width to prevent resizing
  btn.style.height = btn.offsetHeight + 'px'; // Fix height
  btn.style.transition = 'none'; // Disable transitions
  btn.style.pointerEvents = 'none'; // Disable interactions
  btn.textContent = ''; // Clear the text

  function type() {
    if (index < text.length) {
      btn.textContent += text.charAt(index);
      index++;
      setTimeout(type, speed);
    } else {
      // Re-enable after typing is complete
      btn.style.width = ''; // Restore original width
      btn.style.height = ''; // Restore original height
      btn.style.transition = ''; // Restore original transition
      btn.style.pointerEvents = ''; // Re-enable interactions
    }
  }

  // Start typing when page loads
  type();
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

/**
 * Setup header signup button handler to reveal signup modal
 */
function setupHeaderSignupHandler() {
  const headerSignupBtn = document.getElementById('header-signup');
  const signupModal = document.getElementById('signup-modal');

  if (headerSignupBtn && signupModal) {
    headerSignupBtn.addEventListener('click', (e) => {
      e.preventDefault();
      console.log('Header signup clicked');
      signupModal.classList.remove('signup-modal--hidden');
      signupModal.classList.add('signup-modal--visible');
      document.body.style.overflow = 'hidden';
    });
  }

  // Close modal when clicking overlay or close button
  const modalOverlay = signupModal.querySelector('.signup-modal-overlay');
  const closeBtn = document.getElementById('signup-modal-close');

  if (modalOverlay) {
    modalOverlay.addEventListener('click', () => {
      signupModal.classList.add('signup-modal--hidden');
      signupModal.classList.remove('signup-modal--visible');
      document.body.style.overflow = 'auto';
    });
  }

  if (closeBtn) {
    closeBtn.addEventListener('click', () => {
      signupModal.classList.add('signup-modal--hidden');
      signupModal.classList.remove('signup-modal--visible');
      document.body.style.overflow = 'auto';
    });
  }

  // Close modal on Escape key
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && signupModal.classList.contains('signup-modal--visible')) {
      signupModal.classList.add('signup-modal--hidden');
      signupModal.classList.remove('signup-modal--visible');
      document.body.style.overflow = 'auto';
    }
  });

  // Handle "Log in" link in footer
  const signupToLoginLink = document.getElementById('signup-to-login');
  const loginModal = document.getElementById('login-modal');
  if (signupToLoginLink && loginModal) {
    signupToLoginLink.addEventListener('click', (e) => {
      e.preventDefault();
      // Close signup modal
      signupModal.classList.add('signup-modal--hidden');
      signupModal.classList.remove('signup-modal--visible');
      // Open login modal
      loginModal.classList.remove('login-modal--hidden');
      loginModal.classList.add('login-modal--visible');
    });
  }
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
