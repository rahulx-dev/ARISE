const fs = require('fs');
const path = require('path');

const dir = 'C:\\Users\\LUCKY\\.gemini\\antigravity\\brain\\c0b9201d-d038-4e6c-a45e-887122382248\\scratch\\stitch_screens';

const files = fs.readdirSync(dir).filter(f => f.endsWith('.json'));

console.log(`Found ${files.length} screen json files:`);

for (const f of files) {
  const data = JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8'));
  console.log(`\n======================================================`);
  console.log(`FILE: ${f} | TITLE: ${data.title}`);
  console.log(`------------------------------------------------------`);
  console.log(data.innerText.slice(0, 1500));
}
