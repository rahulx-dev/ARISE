const https = require('https');
const zlib = require('zlib');
const fs = require('fs');

function fetchBuffer(url) {
  return new Promise((resolve, reject) => {
    https.get(url, { headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' } }, (res) => {
      const chunks = [];
      res.on('data', c => chunks.push(c));
      res.on('end', () => {
        const buf = Buffer.concat(chunks);
        const encoding = res.headers['content-encoding'];
        let text = '';
        try {
          if (encoding === 'gzip') text = zlib.gunzipSync(buf).toString();
          else if (encoding === 'br') text = zlib.brotliDecompressSync(buf).toString();
          else text = buf.toString();
        } catch {
          text = buf.toString();
        }
        resolve(text);
      });
    }).on('error', reject);
  });
}

async function run() {
  const code = await fetchBuffer('https://app-companion-430619.appspot.com/assets/util-WAbyGcxJ.js');
  fs.writeFileSync('C:\\Users\\LUCKY\\.gemini\\antigravity\\brain\\c0b9201d-d038-4e6c-a45e-887122382248\\scratch\\util-unpacked.js', code);
  console.log('Saved util-unpacked.js, length:', code.length);

  // Search for endpoints or project loading in util
  const matches = code.match(/["'`](https?:\/\/[^"'`]+|\/[a-zA-Z0-9_\-\.\/]+)["'`]/g) || [];
  const clean = [...new Set(matches.map(m => m.slice(1, -1)))];
  console.log('URLs in util:', clean.filter(u => u.includes('/') && !u.startsWith('./')).slice(0, 40));
}

run();
