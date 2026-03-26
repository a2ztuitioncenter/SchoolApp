const fs = require('fs');

function replaceAdmin() {
    let file = fs.readFileSync('css/admin-dashboard.css', 'utf8');
    
    // Replace variables
    file = file.replace(/--bg-main/g, '--bg-primary');
    file = file.replace(/--bg-sidebar/g, '--bg-secondary');
    file = file.replace(/--bg-card/g, '--bg-secondary');
    file = file.replace(/--border-color/g, '--border-subtle');
    file = file.replace(/--text-primary/g, '--text-main');
    file = file.replace(/--text-secondary/g, '--text-muted');
    file = file.replace(/--accent(?!-)/g, '--accent-blue');
    file = file.replace(/--border-radius/g, '--radius-sm');

    fs.writeFileSync('css/admin-dashboard.css', file);
}

function replaceStudent() {
    let file = fs.readFileSync('css/student-daashboard.css', 'utf8');

    file = file.replace(/--bg-color/g, '--bg-primary');
    file = file.replace(/--sidebar-color/g, '--bg-secondary');
    file = file.replace(/--card-bg/g, '--bg-secondary');
    file = file.replace(/--primary-blue/g, '--accent-blue');
    file = file.replace(/--border-radius/g, '--radius-sm');
    
    // update fonts
    file = file.replace(/font-family: 'Inter', sans-serif;/g, 'font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif;');
    
    // remove shadows
    file = file.replace(/box-shadow: var\(--shadow\);/g, 'border: 1px solid var(--border-subtle);');
    file = file.replace(/box-shadow: 0 4px 12px rgba\(0,0,0,0\.15\);/g, 'border: 1px solid var(--border-subtle);');
    file = file.replace(/var\(--shadow\)/g, 'none');

    fs.writeFileSync('css/student-daashboard.css', file);
}

replaceAdmin();
replaceStudent();
console.log("Done replacing CSS variables");
