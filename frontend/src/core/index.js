// Master portal init — theme is handled automatically by CSS prefers-color-scheme
function init() {
  setupHeroTextAnimation();
  setupGetStartedTypingAnimation();
  setupGetStartedHandler();
  setupHeaderSignupHandler();
  setupLoginCardHandlers();
  setupHeaderLoginHandler();

}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}

/**
 * Animate hero title with letter-by-letter animation
 */
function setupHeroTextAnimation() {
  const titleEl = document.getElementById('heroTitle');
  
  if (titleEl) {
    const text = titleEl.textContent;
    titleEl.textContent = ''; // Clear original text
    
    // Split text into letters and create spans
    const letters = text.split('');
    letters.forEach((letter, index) => {
      const span = document.createElement('span');
      span.className = 'letter';
      span.textContent = letter;
      span.style.animationDelay = `${index * 0.05}s`; // Stagger animation
      titleEl.appendChild(span);
    });
  }
}

/**
 * Continuous animation for "Get Started" button text with always-active clicks
 */
function setupGetStartedTypingAnimation() {
  // Updated to use new hero button
  const btn = document.getElementById('btn-get-started-hero');
  if (!btn) return;

  // Add animation class for hover effects (handled by CSS)
  btn.classList.add('btn-glass-animating');
  
  // Ensure pointer events are always enabled for clicks
  btn.style.pointerEvents = 'auto';
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

      signupModal.classList.remove('signup-modal--hidden');
      signupModal.classList.add('signup-modal--visible');
      document.body.style.overflow = 'hidden';
    });

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
}

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

      // Open auth modal with login selector
      openAuthLoginSelector(e);
    });
  }
}

/**
 * Handle login card click - open auth modal with appropriate role
 */
function handleLoginCardClick(loginType) {

  
  switch(loginType) {
    case 'student':
      openAuthModal('login', 'student');
      break;
    case 'teacher':
      openAuthModal('login', 'teacher');
      break;

    case 'admin':
      openAuthModal('login', 'admin');
      break;
    default:
      console.error('Unknown login type:', loginType);
  }
}

export { setupLoginCardHandlers, handleLoginCardClick };
