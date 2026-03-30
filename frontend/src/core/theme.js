/**
 * theme.js — Automatic system/browser dark mode detection.
 * Applies body.dark-mode class based on prefers-color-scheme.
 * Listens for live OS theme changes.
 * No manual toggle button required.
 */

function applySystemTheme() {
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    if (prefersDark) {
        document.body.classList.add('dark-mode');
    } else {
        document.body.classList.remove('dark-mode');
    }
    // Also keep data-theme in sync (for index.css backwards compat)
    document.documentElement.setAttribute('data-theme', prefersDark ? 'dark' : 'light');
}

// Apply immediately on script execution
applySystemTheme();

// React live to OS theme changes (e.g. user switches from Light → Dark in Windows/macOS)
window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', applySystemTheme);

// Legacy exports kept so existing imports don't throw errors
export function initTheme() { applySystemTheme(); }
export function toggleTheme() { applySystemTheme(); }
