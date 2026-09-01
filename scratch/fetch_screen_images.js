const { spawn } = require('child_process');
const http = require('http');
const fs = require('fs');
const path = require('path');

const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const tempUserData = 'C:\\Users\\LUCKY\\.gemini\\antigravity\\brain\\c0b9201d-d038-4e6c-a45e-887122382248\\scratch\\temp_chrome';
const outDir = 'C:\\Users\\LUCKY\\.gemini\\antigravity\\brain\\c0b9201d-d038-4e6c-a45e-887122382248\\scratch\\stitch_screens';

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }
function getJson(url) {
  return new Promise((resolve, reject) => {
    http.get(url, (res) => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => resolve(JSON.parse(data)));
    }).on('error', reject);
  });
}

async function run() {
  const args = [
    '--remote-debugging-port=9222',
    `--user-data-dir=${tempUserData}`,
    '--profile-directory=Default',
    '--no-first-run',
    '--no-default-browser-check',
    '--window-size=2560,1440',
    '--headless=new',
    'https://stitch.withgoogle.com/projects/6498604016237655731'
  ];

  const child = spawn(chromePath, args);
  await sleep(4000);

  try {
    const list = await getJson('http://127.0.0.1:9222/json');
    const iframeTab = list.find(t => t.url.includes('app-companion-430619.appspot.com'));
    const ws = new WebSocket(iframeTab.webSocketDebuggerUrl);

    let id = 1;
    const pending = new Map();
    ws.onmessage = (event) => {
      const msg = JSON.parse(event.data);
      if (msg.id && pending.has(msg.id)) {
        pending.get(msg.id)(msg.result);
        pending.delete(msg.id);
      }
    };
    function send(method, params = {}) {
      return new Promise((resolve) => {
        const reqId = id++;
        pending.set(reqId, resolve);
        ws.send(JSON.stringify({ id: reqId, method, params }));
      });
    }

    await new Promise(r => ws.onopen = r);
    await sleep(15000);

    // Get all screen instances data from the React / Zustand store
    const fullStoreData = await send('Runtime.evaluate', {
      expression: `
        (() => {
          // Find any __reactFiber or React root or Zustand stores in window / elements
          const result = {};
          
          // Let's inspect images inside nodes
          const screenNodes = document.querySelectorAll('.react-flow__node.screen, .react-flow__node-node-screen');
          result.screens = Array.from(screenNodes).map((node, i) => {
            const img = node.querySelector('img');
            const titleEl = node.querySelector('[class*="title"], [class*="header"], [class*="name"]');
            const title = titleEl ? titleEl.innerText.trim() : ('Screen_' + i);
            const rect = node.getBoundingClientRect();
            return {
              index: i,
              title,
              imgSrc: img ? img.src : null,
              rect: { x: rect.x, y: rect.y, width: rect.width, height: rect.height }
            };
          });

          return result;
        })()
      `,
      returnByValue: true
    });

    console.log('Store Data:', JSON.stringify(fullStoreData, null, 2));

    const screens = fullStoreData.result.value.screens || [];
    for (const s of screens) {
      console.log(`Screen [${s.index}] "${s.title}": rect=${JSON.stringify(s.rect)}, img=${s.imgSrc ? s.imgSrc.slice(0, 80) : 'none'}`);
      
      // If there's an image src, let's download it
      if (s.imgSrc && s.imgSrc.startsWith('http')) {
        // Fetch via page
        const imgFetch = await send('Runtime.evaluate', {
          expression: `
            fetch("${s.imgSrc}").then(r => r.blob()).then(b => new Promise(res => {
              const reader = new FileReader();
              reader.onload = () => res(reader.result);
              reader.readAsDataURL(b);
            }))
          `,
          awaitPromise: true,
          returnByValue: true
        });

        if (imgFetch.result && imgFetch.result.value && imgFetch.result.value.startsWith('data:image')) {
          const base64 = imgFetch.result.value.split(',')[1];
          const safeName = s.title.replace(/[^a-zA-Z0-9_-]/g, '_');
          fs.writeFileSync(path.join(outDir, `${s.index}_${safeName}.png`), Buffer.from(base64, 'base64'));
          console.log(`Saved image for ${s.title}`);
        }
      }

      // Also capture bounding box clip screenshot of the node
      if (s.rect.width > 50 && s.rect.height > 50 && s.rect.x >= 0 && s.rect.y >= 0) {
        const clipShot = await send('Page.captureScreenshot', {
          format: 'png',
          clip: {
            x: Math.max(0, s.rect.x),
            y: Math.max(0, s.rect.y),
            width: s.rect.width,
            height: s.rect.height,
            scale: 1
          }
        });
        if (clipShot && clipShot.data) {
          const safeName = s.title.replace(/[^a-zA-Z0-9_-]/g, '_');
          fs.writeFileSync(path.join(outDir, `clip_${s.index}_${safeName}.png`), Buffer.from(clipShot.data, 'base64'));
          console.log(`Saved clip screenshot for ${s.title}`);
        }
      }
    }

    ws.close();
  } catch(e) {
    console.error('Error:', e);
  } finally {
    child.kill();
  }
}

run();
