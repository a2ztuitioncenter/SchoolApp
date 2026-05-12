/**
 * auth-manager.js - Centralized authentication & route protection
 * Handles login state, role-based access control, and logout
 */

/**
 * Auth state structure stored in localStorage
 * {
 *   isLoggedIn: boolean,
 *   role: 'student' | 'teacher' | 'admin',
 *   userId: string,
 *   name?: string,
 *   phone?: string,
 *   token?: string
 * }
 */

const AUTH_STORAGE_KEY = 'auth';
const AUTH_TIMEOUT = 24 * 60 * 60 * 1000; // 24 hours

const readStoredAuth = () => {
  // Check sessionStorage first (active session), then localStorage (persistent session)
  return sessionStorage.getItem(AUTH_STORAGE_KEY) || localStorage.getItem(AUTH_STORAGE_KEY);
};

/**
 * Store authentication data in sessionStorage
 * Note: JWT token is now managed via HttpOnly cookie — NOT stored in JS
 * @param {Object} authData - Auth data to store
 * @param {string} authData.role - User role (student/teacher/admin)
 * @param {string} authData.userId - User ID
 * @param {string} [authData.name] - User name
 * @param {string} [authData.phone] - User phone
 */
export const setAuth = (authData) => {
  // CRITICAL: Clear ANY existing auth state from both storages before setting new one
  localStorage.removeItem(AUTH_STORAGE_KEY);
  sessionStorage.removeItem(AUTH_STORAGE_KEY);
  
  const auth = {
    isLoggedIn: true,
    role: authData.role,
    userId: authData.userId || authData.user?.id,
    name: authData.name || authData.user?.name || null,
    phone: authData.phone || authData.user?.phone || null,
    teacherId: authData.teacherId || authData.user?.teacherId || null,
    csrfToken: authData.csrfToken || null,
    timestamp: Date.now()
  };
  const serializedAuth = JSON.stringify(auth);
  
  // Store in both for maximum reliability during redirects
  sessionStorage.setItem(AUTH_STORAGE_KEY, serializedAuth);
  localStorage.setItem(AUTH_STORAGE_KEY, serializedAuth);
  
  console.log('[AUTH] State saved:', { role: auth.role, userId: auth.userId });
};

/**
 * Get authentication data from localStorage
 * @returns {Object|null} Auth data or null if not logged in
 */
export const getAuth = () => {
  try {
    const authStr = readStoredAuth();
    if (!authStr) return null;

    const auth = JSON.parse(authStr);
    
    // Check if session has expired
    if (auth.timestamp && Date.now() - auth.timestamp > AUTH_TIMEOUT) {
      console.warn('[AUTH] Session expired, clearing auth');
      clearAuth();
      return null;
    }

    return auth.isLoggedIn ? auth : null;
  } catch (error) {
    console.error('[AUTH] Error reading auth state:', error);
    return null;
  }
};

/**
 * Clear authentication data (logout)
 * Also clears the server-side HttpOnly cookie via API call.
 */
export const clearAuth = () => {
  // Clear all potential auth locations
  localStorage.removeItem(AUTH_STORAGE_KEY);
  sessionStorage.removeItem(AUTH_STORAGE_KEY);
  sessionStorage.clear();
  
  // Clear any role-specific keys used for backward compatibility
  const compatKeys = [
    'studentUserId', 'studentRole', 'studentPhone', 'studentName',
    'teacherId', 'teacherRole', 'teacherPhone',
    'adminUserId', 'adminRole', 'adminPhone'
  ];
  compatKeys.forEach(key => sessionStorage.removeItem(key));

  // Fire-and-forget: clear server-side cookies
  try {
    const base = window.__BASE_API_URL || '';
    fetch(`${base}/api/auth/logout`, { method: 'POST', credentials: 'include' }).catch(() => {});
  } catch (_) { /* ignore */ }
  console.log('[AUTH] State cleared (logged out)');
};

/**
 * Check if user is logged in
 * @returns {boolean}
 */
export const isLoggedIn = () => {
  const auth = getAuth();
  const loggedIn = auth !== null && auth.isLoggedIn === true;
  
  if (!loggedIn) {
    console.warn('[AUTH] Check: User NOT logged in', {
      hasAuthObj: !!auth,
      pathname: window.location.pathname
    });
  } else {
    console.log('[AUTH] Check: User is logged in', {
      role: auth.role,
      userId: auth.userId
    });
  }
  
  return loggedIn;
};

/**
 * Get current user's role
 * @returns {string|null} - 'student', 'teacher', 'admin', or null
 */
export const getUserRole = () => {
  const auth = getAuth();
  return auth?.role || null;
};

/**
 * Get current user's ID
 * @returns {string|null}
 */
export const getUserId = () => {
  const auth = getAuth();
  return auth?.userId || null;
};

/**
 * Get current user's name
 * @returns {string|null}
 */
export const getUserName = () => {
  const auth = getAuth();
  return auth?.name || null;
};

/**
 * Check if user has a specific role
 * @param {string} role - Role to check ('student', 'teacher', 'admin')
 * @returns {boolean}
 */
export const hasRole = (role) => {
  return getUserRole() === role;
};

/**
 * Check if user has one of multiple roles
 * @param {string[]} roles - Array of roles to check
 * @returns {boolean}
 */
export const hasAnyRole = (roles) => {
  const userRole = getUserRole();
  return roles.includes(userRole);
};

/**
 * ROUTE PROTECTION - Redirect to login if not authenticated
 * Call this at the top of protected pages
 */
export const requireLogin = () => {
  if (!isLoggedIn()) {
    console.warn('[AUTH] Route protection: User not logged in, redirecting to index');
    window.location.href = '/';
    return false;
  }
  return true;
};

/**
 * ROLE-BASED PROTECTION - Redirect if wrong role
 * @param {string|string[]} allowedRoles - Single role or array of allowed roles
 */
export const requireRole = (allowedRoles) => {
  if (!isLoggedIn()) {
    console.warn('[AUTH] Route protection: User not logged in, redirecting to index');
    window.location.href = '/';
    return false;
  }

  const roles = Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles];
  const userRole = getUserRole();

  if (!roles.includes(userRole)) {
    console.error(`[AUTH] Route protection: Unauthorized. Role "${userRole}" not in [${roles.join(', ')}]. Redirecting to index...`, {
      currentPath: window.location.pathname,
      allowedRoles: roles
    });
    window.location.href = '/';
    return false;
  }

  console.log(`[AUTH] Route access granted for role: ${userRole}`);
  return true;
};

/**
 * Logout user and redirect to home
 */
export const logout = () => {
  clearAuth();
  console.log('[AUTH] User logged out');
  window.location.href = '/';
};

/**
 * Show loading screen during redirect to prevent flickering
 */
export const showProtectionScreen = () => {
  const screen = document.createElement('div');
  screen.id = 'auth-protection-screen';
  screen.style.cssText = `
    position: fixed;
    inset: 0;
    background: white;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-direction: column;
    z-index: 10000;
    gap: 1rem;
  `;
  screen.innerHTML = `
    <div style="font-size: 2rem;">⏳</div>
    <p style="color: #666; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;">
      Checking access...
    </p>
  `;
  document.body.appendChild(screen);
  return screen;
};

/**
 * Hide protection screen
 */
export const hideProtectionScreen = () => {
  const screen = document.getElementById('auth-protection-screen');
  if (screen) screen.remove();
};

/**
 * Export auth data to sessionStorage for backward compatibility
 * Note: token is no longer synced — it lives in HttpOnly cookie only
 * @param {string} role - User role
 */
export const syncToSessionStorage = (role) => {
  const auth = getAuth();
  if (!auth) return;

  if (role === 'student') {
    sessionStorage.setItem('studentUserId', auth.userId);
    sessionStorage.setItem('studentRole', 'student');
    if (auth.phone) sessionStorage.setItem('studentPhone', auth.phone);
    if (auth.name) sessionStorage.setItem('studentName', auth.name);
  } else if (role === 'teacher') {
    sessionStorage.setItem('teacherId', auth.userId);
    sessionStorage.setItem('teacherRole', 'teacher');
    if (auth.phone) sessionStorage.setItem('teacherPhone', auth.phone);
    if (auth.teacherId) sessionStorage.setItem('teacherTid', auth.teacherId);
  } else if (role === 'admin') {
    sessionStorage.setItem('adminUserId', auth.userId);
    sessionStorage.setItem('adminRole', 'admin');
    if (auth.phone) sessionStorage.setItem('adminPhone', auth.phone);
  }

  console.log('[AUTH] Synced to sessionStorage for backward compatibility');
};
