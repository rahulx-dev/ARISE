const fs = require('fs');

const code = fs.readFileSync('C:\\Users\\LUCKY\\.gemini\\antigravity\\brain\\c0b9201d-d038-4e6c-a45e-887122382248\\scratch\\util-unpacked.js', 'utf8');

function searchPatterns() {
  const patterns = [
    /projects\/\$\{/g,
    /getProject/gi,
    /loadProject/gi,
    /fetchProject/gi,
    /screenInstances/g,
    /htmlCode/g,
    /projectMeta/g,
  ];

  for (const p of patterns) {
    let match;
    let count = 0;
    while ((match = p.exec(code)) !== null && count < 5) {
      count++;
      const start = Math.max(0, match.index - 100);
      const end = Math.min(code.length, match.index + 200);
      console.log(`=== Pattern ${p} ===`);
      console.log(code.slice(start, end));
    }
  }
}

searchPatterns();
