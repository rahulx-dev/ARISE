const https = require('https');
const fs = require('fs');
const zlib = require('zlib');

function postRpc(url, body, headers = {}) {
  return new Promise((resolve, reject) => {
    const u = new URL(url);
    const req = https.request({
      hostname: u.hostname,
      path: u.pathname + u.search,
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
        ...headers
      }
    }, (res) => {
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
        resolve({ status: res.statusCode, headers: res.headers, body: text });
      });
    });
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

async function testRpc() {
  const projectId = '6498604016237655731';
  // Common Google Boq batched RPC endpoints
  const batchedUrls = [
    'https://stitch.withgoogle.com/_/Nemo/data/batched/GetProject',
    'https://stitch.withgoogle.com/_/Nemo/data/batched/GetScreen',
    'https://stitch.withgoogle.com/_/Nemo/data/batched/ListScreens',
  ];

  // Try typical RPC format: f.req=[[["RPC_ID","[\"PROJECT_ID\"]",null,"generic"]]]
  const rpcBodies = [
    `f.req=${encodeURIComponent(JSON.stringify([[["GetProject", JSON.stringify([projectId]), null, "1"]]]))}`,
    `f.req=${encodeURIComponent(JSON.stringify([[["GetScreen", JSON.stringify([projectId]), null, "1"]]]))}`,
    `f.req=${encodeURIComponent(JSON.stringify([[["ListScreens", JSON.stringify([projectId]), null, "1"]]]))}`,
  ];

  for (let i = 0; i < batchedUrls.length; i++) {
    const res = await postRpc(batchedUrls[i], rpcBodies[i]);
    console.log(`RPC ${batchedUrls[i]} -> Status ${res.status}, Length: ${res.body.length}`);
    if (res.body.length < 2000) {
      console.log('Body:', res.body);
    }
  }
}

testRpc();
