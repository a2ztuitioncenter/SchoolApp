const fs = require('fs');
const content = fs.readFileSync('m:/WebDev/projects/tuition-app/frontend/src/modules/student/student-dashboard.js', 'utf8');

let braces = 0;
let parens = 0;
let line = 1;
let col = 1;

for (let i = 0; i < content.length; i++) {
    const char = content[i];
    if (char === '{') braces++;
    if (char === '}') braces--;
    if (char === '(') parens++;
    if (char === ')') parens--;
    
    if (char === '\n') {
        line++;
        col = 1;
    } else {
        col++;
    }
}

console.log(`Braces balance: ${braces}`);
console.log(`Parens balance: ${parens}`);
