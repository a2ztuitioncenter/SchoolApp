/**
 * theme.js — Light mode only theme.
 * Forces light theme across entire application.
 */

function applyLightTheme() {
    document.body.classList.remove('dark-mode');
    document.documentElement.setAttribute('data-theme', 'light');
}

// Apply light theme immediately on script execution
applyLightTheme();

// Legacy exports kept so existing imports don't throw errors
export function initTheme() { applyLightTheme(); }
export function toggleTheme() { applyLightTheme(); }
