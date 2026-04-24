const fs = require('fs');
const content = fs.readFileSync('m:/WebDev/projects/tuition-app/frontend/src/modules/student/student-dashboard.js', 'utf8');

const stack = [];
const lines = content.split('\n');

for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    for (let j = 0; j < line.length; j++) {
        const char = line[j];
        if (char === '{') {
            stack.push({ line: i + 1, col: j + 1 });
        } else if (char === '}') {
            if (stack.length === 0) {
                console.log(`Extra closing brace at line ${i + 1}, col ${j + 1}`);
            } else {
                stack.pop();
            }
        }
    }
}

while (stack.length > 0) {
    const open = stack.pop();
    console.log(`Unclosed brace starting at line ${open.line}, col ${open.col}`);
}
