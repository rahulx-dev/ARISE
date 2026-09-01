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
        if (encoding === 'gzip') resolve(zlib.gunzipSync(buf).toString());
        else if (encoding === 'br') resolve(zlib.brotliDecompressSync(buf).toString());
        else resolve(buf.toString());
      });
    }).on('error', reject);
  });
}

async function run() {
  const stitchHtml = fs.readFileSync('C:\\Users\\LUCKY\\.gemini\\antigravity\\brain\\c0b9201d-d038-4e6c-a45e-887122382248\\.system_generated\\steps\\2294\\content.md', 'utf8');
  
  // Find all script URLs in content.md
  const scriptUrls = stitchHtml.match(/https:\/\/[^\s"'<>]+\.js/g) || [];
  console.log('Script URLs:', scriptUrls);
}

run();
