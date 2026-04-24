const fs = require('fs');
const content = fs.readFileSync('m:/WebDev/projects/tuition-app/frontend/src/modules/student/student-dashboard.js', 'utf8');

let inString = false;
let quoteChar = '';
let inComment = false;
let inBlockComment = false;
let inTemplateLiteral = false;

for (let i = 0; i < content.length; i++) {
    const char = content[i];
    const nextChar = content[i+1];

    if (inComment) {
        if (char === '\n') inComment = false;
        continue;
    }
    if (inBlockComment) {
        if (char === '*' && nextChar === '/') {
            inBlockComment = false;
            i++;
        }
        continue;
    }
    if (inString) {
        if (char === quoteChar && content[i-1] !== '\\') inString = false;
        continue;
    }
    if (inTemplateLiteral) {
        if (char === '`' && content[i-1] !== '\\') inTemplateLiteral = false;
        continue;
    }

    if (char === '/' && nextChar === '/') {
        inComment = true;
        i++;
    } else if (char === '/' && nextChar === '*') {
        inBlockComment = true;
        i++;
    } else if (char === "'" || char === '"') {
        inString = true;
        quoteChar = char;
    } else if (char === '`') {
        inTemplateLiteral = true;
    }
}

console.log(`Unclosed string: ${inString}`);
console.log(`Unclosed block comment: ${inBlockComment}`);
console.log(`Unclosed template literal: ${inTemplateLiteral}`);
