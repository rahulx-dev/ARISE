const fs = require('fs');

const code = fs.readFileSync('C:\\Users\\LUCKY\\.gemini\\antigravity\\brain\\c0b9201d-d038-4e6c-a45e-887122382248\\scratch\\util-unpacked.js', 'utf8');

// Find where `A` is defined or imported, or where `getProject` or `listScreens` is defined
const matches = code.match(/[a-zA-Z0-9_\$]+\s*=\s*class\s*\{[^}]*getProject/g) || [];
console.log('Class with getProject:', matches);

// Let's search for `getProject(` or `listScreens(` or `getProject:`
const m2 = code.match(/async\s+getProject\([^)]*\)\s*\{[^}]*\}/g) || [];
console.log('getProject functions:', m2);

// Let's also look for PostMessageClient or iframe bridge or API client
const m3 = code.match(/class\s+PostMessageClient[^{]*\{[\s\S]*?\}/);
if (m3) console.log('PostMessageClient:', m3[0].slice(0, 500));
