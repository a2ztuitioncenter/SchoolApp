/**
 * initTheme — used by dashboard pages (Admin, Teacher, Student).
 * Applies body.dark-mode class and wires up the #theme-toggle button.
 */
export function initTheme() {
    const themeToggle = document.getElementById('theme-toggle');
    if (!themeToggle) return;

    const savedTheme = localStorage.getItem('theme') || 'light';
    if (savedTheme === 'dark') {
        document.body.classList.add('dark-mode');
    }
    _updateIcon(themeToggle, savedTheme === 'dark');

    themeToggle.addEventListener('click', () => {
        const isDark = document.body.classList.toggle('dark-mode');
        localStorage.setItem('theme', isDark ? 'dark' : 'light');
        _updateIcon(themeToggle, isDark);
    });
}

/**
 * toggleTheme — used by the master portal (index.js).
 * Uses data-theme attribute on <html> for backwards compat.
 */
export function toggleTheme() {
    const current = document.documentElement.getAttribute('data-theme') || 'light';
    const next = current === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', next);
    localStorage.setItem('theme', next);
    const themeToggle = document.getElementById('theme-toggle');
    if (themeToggle) _updateIcon(themeToggle, next === 'dark');
    return next;
}

function _updateIcon(toggleBtn, isDark) {
    const icon = toggleBtn.querySelector('i');
    if (!icon) return;
    if (isDark) {
        icon.classList.remove('fa-moon');
        icon.classList.add('fa-sun');
    } else {
        icon.classList.remove('fa-sun');
        icon.classList.add('fa-moon');
    }
}
