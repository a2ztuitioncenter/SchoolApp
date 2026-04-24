const fs = require('fs');
const content = fs.readFileSync('m:/WebDev/projects/tuition-app/frontend/src/modules/student/student-dashboard.js', 'utf8');
const lines = content.split('\n');

let braces = 0;
let parens = 0;

for (let i = 132; i < lines.length; i++) {
    const line = lines[i];
    for (let char of line) {
        if (char === '{') braces++;
        if (char === '}') braces--;
        if (char === '(') parens++;
        if (char === ')') parens--;
    }
}

console.log(`Balance from line 133: Braces: ${braces}, Parens: ${parens}`);
