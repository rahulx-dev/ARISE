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
  const code = await fetchBuffer('https://app-companion-430619.appspot.com/assets/PostMessageClient-B2m7gb6G.js');
  console.log('PostMessageClient code:');
  console.log(code);
}

run();
