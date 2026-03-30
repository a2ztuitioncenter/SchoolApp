const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname);
const BACKEND = path.join(ROOT, 'backend');
const FRONTEND = path.join(ROOT, 'frontend');

// Maps abstract source to destination relative to ROOT
// Make sure keys and values match the actual folder structure.
const moves = {
  // BACKEND REFACTOR
  'backend/controllers/attendanceController.js': 'backend/src/features/attendance/attendanceController.js',
  'backend/controllers/authController.js': 'backend/src/features/auth/authController.js',
  'backend/controllers/dataController.js': 'backend/src/features/student/dataController.js',
  'backend/controllers/downloadController.js': 'backend/src/features/download/downloadController.js',
  'backend/controllers/feeController.js': 'backend/src/features/fees/feeController.js',
  'backend/controllers/homeworkController.js': 'backend/src/features/homework/homeworkController.js',
  'backend/controllers/materialsController.js': 'backend/src/features/materials/materialsController.js',
  'backend/controllers/notificationsController.js': 'backend/src/features/notifications/notificationsController.js',
  'backend/controllers/resultsController.js': 'backend/src/features/results/resultsController.js',
  
  'backend/models/Attendance.js': 'backend/src/features/attendance/Attendance.js',
  'backend/models/Fee.js': 'backend/src/features/fees/Fee.js',
  'backend/models/Homework.js': 'backend/src/features/homework/Homework.js',
  'backend/models/Material.js': 'backend/src/features/materials/Material.js',
  'backend/models/Notification.js': 'backend/src/features/notifications/Notification.js',
  'backend/models/Student.js': 'backend/src/features/student/Student.js',
  'backend/models/Timetable.js': 'backend/src/features/student/Timetable.js',
  'backend/models/User.js': 'backend/src/features/auth/User.js',
  
  'backend/routes/adminRoutes.js': 'backend/src/features/admin/adminRoutes.js',
  'backend/routes/attendanceRoutes.js': 'backend/src/features/attendance/attendanceRoutes.js',
  'backend/routes/authRoutes.js': 'backend/src/features/auth/authRoutes.js',
  'backend/routes/downloadRoutes.js': 'backend/src/features/download/downloadRoutes.js',
  'backend/routes/feeRoutes.js': 'backend/src/features/fees/feeRoutes.js',
  'backend/routes/homeworkRoutes.js': 'backend/src/features/homework/homeworkRoutes.js',
  'backend/routes/materialsRoutes.js': 'backend/src/features/materials/materialsRoutes.js',
  'backend/routes/notificationsRoutes.js': 'backend/src/features/notifications/notificationsRoutes.js',
  'backend/routes/resultsRoutes.js': 'backend/src/features/results/resultsRoutes.js',
  'backend/routes/studentRoutes.js': 'backend/src/features/student/studentRoutes.js',
  'backend/routes/teacherRoutes.js': 'backend/src/features/teacher/teacherRoutes.js',
  
  'backend/server.js': 'backend/src/server.js',
  'backend/database.js': 'backend/src/config/database.js',
  'backend/pool.js': 'backend/src/config/pool.js',
  
  // FRONTEND REFACTOR
  'frontend/js/api.js': 'frontend/src/core/api.js',
  'frontend/js/auth.js': 'frontend/src/core/auth.js',
  'frontend/js/theme.js': 'frontend/src/core/theme.js',
  'frontend/js/index.js': 'frontend/src/core/index.js',
  
  'frontend/js/admin-dashboard.js': 'frontend/src/modules/admin/admin-dashboard.js',
  'frontend/js/admin-login.js': 'frontend/src/modules/admin/admin-login.js',
  'frontend/js/student-dashboard.js': 'frontend/src/modules/student/student-dashboard.js',
  'frontend/js/student-register.js': 'frontend/src/modules/student/student-register.js',
  'frontend/js/teacher-dashboard.js': 'frontend/src/modules/teacher/teacher-dashboard.js',
  'frontend/js/teacher-login.js': 'frontend/src/modules/teacher/teacher-login.js',
  
  'frontend/css/index.css': 'frontend/src/assets/css/index.css',
  'frontend/css/admin-dashboard.css': 'frontend/src/assets/css/admin-dashboard.css',
  'frontend/css/student-dashboard.css': 'frontend/src/assets/css/student-dashboard.css'
};

const absoluteMovesMap = new Map();
// We force posix-style paths internally for matching, but path.join might use \\ on windows.
// Let's use path.resolve(ROOT, val) safely.
for (const [key, value] of Object.entries(moves)) {
  const normKey = path.resolve(ROOT, ...key.split('/'));
  const normVal = path.resolve(ROOT, ...value.split('/'));
  absoluteMovesMap.set(normKey, normVal);
}

function ensureDir(filePath) {
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function processDirectory(directory, callback) {
  if(!fs.existsSync(directory)) return;
  fs.readdirSync(directory).forEach(file => {
    const fullPath = path.join(directory, file);
    if (fs.statSync(fullPath).isDirectory()) {
      if (['node_modules', '.git', 'uploads'].includes(file)) return;
      processDirectory(fullPath, callback);
    } else {
      if (['.js', '.html', '.css', '.mjs', '.cjs'].includes(path.extname(fullPath))) {
        callback(fullPath);
      }
    }
  });
}

const processedFiles = new Map();

processDirectory(BACKEND, (f) => { processedFiles.set(f, fs.readFileSync(f, 'utf8')); });
processDirectory(FRONTEND, (f) => { processedFiles.set(f, fs.readFileSync(f, 'utf8')); });

function normalizePosix(p) {
  return p.split(path.sep).join('/');
}

// Ensure the server serves from the correct frontend paths
// In server.js we have: app.use(express.static(path.join(__dirname, '../frontend')));
// Wait, we still serve from `frontend/`, but `server.js` moves to `backend/src/server.js`, 
// so `path.join(__dirname, '../frontend')` becomes `../../frontend`.
// This will be handled manually via regex or wait, I should just patch server.js specifically.

for (const [f, content] of processedFiles.entries()) {
  const newThisPath = absoluteMovesMap.get(f) || f;
  const newThisDir = path.dirname(newThisPath);
  const oldThisDir = path.dirname(f);
  
  let modified = content;

  // Regexes for capturing import paths
  const regexes = [
    /(import\s+.*?from\s+['"])(.*?)(['"])/g,
    /(import\s*\(?['"])(.*?)(['"]\)?)/g, // dynamic imports and side-effect imports
    /(export\s+.*?from\s+['"])(.*?)(['"])/g,
    /(require\(['"])(.*?)(['"]\))/g,
    /(src=['"])(.*?)(['"])/g,
    /(href=['"])(.*?)(['"])/g
  ];

  regexes.forEach(regex => {
    modified = modified.replace(regex, (match, prefix, importStr, suffix) => {
      // Ignore absolute URLs and fragments
      if (importStr.startsWith('http') || importStr.startsWith('//') || importStr.startsWith('#')) return match;
      // if import is just a module name without dot
      if (!importStr.startsWith('.')) return match; 
      
      const absoluteImportedPath = path.resolve(oldThisDir, normalizePosix(importStr));
      const newTargetAbsPath = absoluteMovesMap.get(absoluteImportedPath) || absoluteImportedPath;
      
      let relativePath = path.relative(newThisDir, newTargetAbsPath);
      relativePath = normalizePosix(relativePath);
      
      if (!relativePath.startsWith('.')) {
        relativePath = './' + relativePath;
      }
      return `${prefix}${relativePath}${suffix}`;
    });
  });

  // Patch server.js static directory resolution because it's moving a level deeper
  if (f.endsWith('server.js')) {
    modified = modified.replace(/join\(__dirname,\s*'\.\.\/frontend'/g, "join(__dirname, '../../frontend'");
  }

  // Update in map
  processedFiles.set(f, modified);
}

// Write to files
for (const [f, content] of processedFiles.entries()) {
  const targetPath = absoluteMovesMap.get(f) || f;
  ensureDir(targetPath);
  fs.writeFileSync(targetPath, content, 'utf8');
  if (targetPath !== f) {
    try { fs.unlinkSync(f); } catch(e){}
    console.log(`MOVED: ${path.relative(ROOT, f)} -> ${path.relative(ROOT, targetPath)}`);
  }
}

// Clean up empty directories safely
const dirsToClean = [
  path.join(BACKEND, 'controllers'),
  path.join(BACKEND, 'models'),
  path.join(BACKEND, 'routes'),
  path.join(FRONTEND, 'js'),
  path.join(FRONTEND, 'css')
];
dirsToClean.forEach(dir => {
  if (fs.existsSync(dir)) {
    try { fs.rmdirSync(dir, { recursive: true }); } catch(e){}
  }
});

console.log("Migration complete!");
