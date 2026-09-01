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
  const files = [
    'FileFetch-D8lEi4iB.js',
    'findExternalScreenInstances-DIVu_D77.js',
    'vendor-query-D0ZpAID-.js',
    'editor-xyflow-nqRDgPO3.js',
  ];

  for (const f of files) {
    const url = `https://app-companion-430619.appspot.com/assets/${f}`;
    const code = await fetchBuffer(url);
    fs.writeFileSync(`C:\\Users\\LUCKY\\.gemini\\antigravity\\brain\\c0b9201d-d038-4e6c-a45e-887122382248\\scratch\\${f}`, code);
    console.log(`Saved ${f}, length: ${code.length}`);
  }
}

run();
