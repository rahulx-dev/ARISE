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

async function inspectJs() {
  const assets = [
    'https://app-companion-430619.appspot.com/assets/FileFetch-D8lEi4iB.js',
    'https://app-companion-430619.appspot.com/assets/index-CKG_xk3o.js',
    'https://app-companion-430619.appspot.com/assets/PostMessageClient-B2m7gb6G.js',
  ];

  for (const a of assets) {
    try {
      const code = await fetchUrl(a);
      console.log(`Fetched ${a}, length: ${code.length}`);
      
      // Look for API endpoints / fetch / endpoints / protobuf / rpc
      const urls = code.match(/https?:\/\/[^\s"'`]+|\/[a-zA-Z0-9_\-\/]+/g) || [];
      const apiUrls = urls.filter(u => u.includes('api') || u.includes('project') || u.includes('screen') || u.includes('stitch'));
      console.log(`Matches in ${a}:`, [...new Set(apiUrls)].slice(0, 30));
    } catch (e) {
      console.log(`Error ${a}: ${e.message}`);
    }
  }
}

inspectJs();
