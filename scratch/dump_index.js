const https = require('https');
const fs = require('fs');

function fetchUrl(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(data));
    }).on('error', reject);
  });
}

async function run() {
  const code = await fetchUrl('https://app-companion-430619.appspot.com/assets/index-CKG_xk3o.js');
  console.log('--- index-CKG_xk3o.js ---');
  console.log(code.slice(0, 2000));
}

run();
