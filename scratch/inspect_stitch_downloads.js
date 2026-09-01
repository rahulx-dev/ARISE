const fs = require('fs');
const path = require('path');

const root = 'C:\\Users\\LUCKY\\Downloads\\stitch_arise_gamified_productivity_interface\\stitch_arise_gamified_productivity_interface';

function listRecursive(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach(file => {
    const full = path.join(dir, file);
    const stat = fs.statSync(full);
    if (stat && stat.isDirectory()) {
      results = results.concat(listRecursive(full));
    } else {
      results.push({ path: full, size: stat.size });
    }
  });
  return results;
}

const all = listRecursive(root);
console.log(`Total files: ${all.length}`);
all.forEach(f => {
  console.log(`- ${f.path.replace(root, '')} (${f.size} bytes)`);
});
