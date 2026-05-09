const fs = require('fs');
const path = require('path');

const targetFile = path.join(__dirname, 'frontend', 'src', 'modules', 'teacher', 'teacher-dashboard.js');
let content = fs.readFileSync(targetFile, 'utf8');

const modals = [
  { id: 'hw-modal', overlay: 'hwDrawerOverlay' },
  { id: 'material-modal', overlay: 'materialDrawerOverlay' },
  { id: 'syl-modal', overlay: 'sylDrawerOverlay' },
  { id: 'edit-profile-modal', overlay: 'editProfileDrawerOverlay' },
  { id: 'cms-modal', overlay: 'cmsDrawerOverlay' },
  { id: 'homework-submissions-modal', overlay: 'homeworkSubmissionsDrawerOverlay' },
  { id: 'review-submission-modal', overlay: 'reviewSubmissionDrawerOverlay' }
];

modals.forEach(({ id, overlay }) => {
  // Regex for open block (with flex)
  const openFlexRegex = new RegExp(
    `const\\s+modal\\s*=\\s*document\\.getElementById\\(['"]${id}['"]\\);[\\s\\n]*if\\s*\\(modal\\)\\s*\\{[\\s\\n]*modal\\.style\\.display\\s*=\\s*['"]flex['"];[\\s\\n]*modal\\.classList\\.add\\(['"]open['"]\\);[\\s\\n]*\\}`, 'g');
  
  // Regex for open block (with block)
  const openBlockRegex = new RegExp(
    `const\\s+modal\\s*=\\s*document\\.getElementById\\(['"]${id}['"]\\);[\\s\\n]*if\\s*\\(modal\\)\\s*\\{[\\s\\n]*modal\\.style\\.display\\s*=\\s*['"]block['"];[\\s\\n]*modal\\.classList\\.add\\(['"]open['"]\\);[\\s\\n]*\\}`, 'g');

  const openReplacement = `const modal = document.getElementById('${id}');
  const overlay = document.getElementById('${overlay}');
  if (modal) {
    modal.classList.add('active');
    if (overlay) overlay.classList.add('active');
  }`;

  // Regex for close block (with setTimeout)
  const closeTimeoutRegex = new RegExp(
    `const\\s+modal\\s*=\\s*document\\.getElementById\\(['"]${id}['"]\\);[\\s\\n]*if\\s*\\(modal\\)\\s*\\{[\\s\\n]*modal\\.classList\\.remove\\(['"]open['"]\\);[\\s\\n]*setTimeout\\(\\(\\)\\s*=>\\s*\\{[\\s\\n]*modal\\.style\\.display\\s*=\\s*['"]none['"];[\\s\\n]*\\},\\s*300\\);[\\s\\n]*\\}`, 'g');
    
  // Simple block regex
  const simpleOpenRegex = new RegExp(`document\\.getElementById\\(['"]${id}['"]\\)\\.style\\.display\\s*=\\s*['"](?:flex|block)['"];?`, 'g');
  const simpleOpenRep = `document.getElementById('${id}').classList.add('active'); document.getElementById('${overlay}').classList.add('active');`;
  
  const simpleCloseRegex = new RegExp(`document\\.getElementById\\(['"]${id}['"]\\)\\.style\\.display\\s*=\\s*['"]none['"];?`, 'g');
  const simpleCloseRep = `document.getElementById('${id}').classList.remove('active'); document.getElementById('${overlay}').classList.remove('active');`;

  const closeReplacement = `const modal = document.getElementById('${id}');
  const overlay = document.getElementById('${overlay}');
  if (modal) {
    modal.classList.remove('active');
    if (overlay) overlay.classList.remove('active');
  }`;

  let original = content;
  content = content.replace(openFlexRegex, openReplacement)
                   .replace(openBlockRegex, openReplacement)
                   .replace(closeTimeoutRegex, closeReplacement);

  // fallback for any single-line assignments remaining
  content = content.replace(simpleOpenRegex, simpleOpenRep)
                   .replace(simpleCloseRegex, simpleCloseRep);
});

// Also manually fix edit-profile-modal double declaration issue if needed, but let's see.

fs.writeFileSync(targetFile, content);
console.log('Replaced modal toggle logic with drawer classes in teacher-dashboard.js');
