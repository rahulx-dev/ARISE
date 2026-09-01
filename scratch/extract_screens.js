const { spawn } = require('child_process');
const http = require('http');
const fs = require('fs');
const path = require('path');

const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const tempUserData = 'C:\\Users\\LUCKY\\.gemini\\antigravity\\brain\\c0b9201d-d038-4e6c-a45e-887122382248\\scratch\\temp_chrome';
const outDir = 'C:\\Users\\LUCKY\\.gemini\\antigravity\\brain\\c0b9201d-d038-4e6c-a45e-887122382248\\scratch\\stitch_screens';

function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

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
  fs.mkdirSync(outDir, { recursive: true });

  const args = [
    '--remote-debugging-port=9222',
    `--user-data-dir=${tempUserData}`,
    '--profile-directory=Default',
    '--no-first-run',
    '--no-default-browser-check',
    '--window-size=3840,2160',
    '--headless=new',
    'https://stitch.withgoogle.com/projects/6498604016237655731'
  ];

  console.log('Starting Chrome 4K...');
  const child = spawn(chromePath, args);

  await sleep(4000);

  try {
    const list = await getJson('http://127.0.0.1:9222/json');
    const iframeTab = list.find(t => t.url.includes('app-companion-430619.appspot.com'));
    if (!iframeTab || !iframeTab.webSocketDebuggerUrl) {
      console.log('No iframe tab found.');
      child.kill();
      return;
    }

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
    console.log('Waiting 15s for full canvas render...');
    await sleep(15000);

    // Extract all screen node details
    const screensData = await send('Runtime.evaluate', {
      expression: `
        (() => {
          const screens = [];
          const nodes = document.querySelectorAll('.react-flow__node.screen, .react-flow__node-node-screen');
          nodes.forEach((node, idx) => {
            const titleEl = node.querySelector('[class*="title"], [class*="header"], [class*="name"]');
            const title = titleEl ? titleEl.innerText : ('Screen_' + idx);
            
            // Try to find iframes or inner HTML content
            const iframes = Array.from(node.querySelectorAll('iframe'));
            let iframeContent = '';
            iframes.forEach(ifr => {
              try {
                if (ifr.contentDocument) {
                  iframeContent = ifr.contentDocument.documentElement.outerHTML;
                }
              } catch(e) {}
            });

            const rect = node.getBoundingClientRect();

            screens.push({
              index: idx,
              title: title.trim(),
              className: node.className,
              innerText: node.innerText,
              outerHTML: node.outerHTML,
              iframeContent,
              rect: {
                x: rect.x,
                y: rect.y,
                width: rect.width,
                height: rect.height
              }
            });
          });
          return screens;
        })()
      `,
      returnByValue: true
    });

    const screens = screensData.result.value || [];
    console.log(`Extracted ${screens.length} screens from canvas.`);

    screens.forEach((s, idx) => {
      const safeTitle = s.title.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 40) || `screen_${idx}`;
      fs.writeFileSync(path.join(outDir, `${idx}_${safeTitle}.json`), JSON.stringify(s, null, 2));
      if (s.iframeContent) {
        fs.writeFileSync(path.join(outDir, `${idx}_${safeTitle}.html`), s.iframeContent);
      }
      console.log(`[${idx}] ${s.title} -> ${s.innerText.split('\\n').slice(0, 3).join(' | ')}`);
    });

    // Capture full 4K canvas screenshot
    const fullShot = await send('Page.captureScreenshot', { format: 'png' });
    if (fullShot && fullShot.data) {
      fs.writeFileSync(path.join(outDir, 'canvas_full_4k.png'), Buffer.from(fullShot.data, 'base64'));
      console.log('Saved canvas_full_4k.png');
    }

    ws.close();
  } catch (e) {
    console.error('Error:', e);
  } finally {
    child.kill();
  }
}

run();
