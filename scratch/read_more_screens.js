const fs = require('fs');
const path = require('path');

const dir = 'C:\\Users\\LUCKY\\.gemini\\antigravity\\brain\\c0b9201d-d038-4e6c-a45e-887122382248\\scratch\\stitch_screens';

const targetScreens = ['2_Screen_2.json', '4_Screen_4.json', '17_Screen_17.json', '18_Screen_18.json'];

for (const f of targetScreens) {
  const p = path.join(dir, f);
  if (fs.existsSync(p)) {
    const data = JSON.parse(fs.readFileSync(p, 'utf8'));
    console.log(`\n======================================================`);
    console.log(`FILE: ${f} | TITLE: ${data.title}`);
    console.log(`------------------------------------------------------`);
    console.log(data.outerHTML ? data.outerHTML.slice(0, 1500) : data.innerText);
  }
}
