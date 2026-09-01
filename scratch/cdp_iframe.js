const { spawn } = require('child_process');
const http = require('http');
const fs = require('fs');

const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const tempUserData = 'C:\\Users\\LUCKY\\.gemini\\antigravity\\brain\\c0b9201d-d038-4e6c-a45e-887122382248\\scratch\\temp_chrome';

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

  console.log('Starting Chrome...');
  const child = spawn(chromePath, args);

  await sleep(4000);

  try {
    const list = await getJson('http://127.0.0.1:9222/json');
    console.log('Tabs:', list.map(t => ({ title: t.title.slice(0, 50), url: t.url.slice(0, 60), wsUrl: t.webSocketDebuggerUrl })));

    const iframeTab = list.find(t => t.url.includes('app-companion-430619.appspot.com'));
    if (!iframeTab || !iframeTab.webSocketDebuggerUrl) {
      console.log('No iframe tab found.');
      child.kill();
      return;
    }

    console.log('Connecting to iframe target:', iframeTab.webSocketDebuggerUrl);
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
    console.log('Connected to iframe CDP!');

    console.log('Waiting 15s for canvas to load screens...');
    await sleep(15000);

    // Capture screenshot of the iframe canvas
    const shot = await send('Page.captureScreenshot', { format: 'png' });
    if (shot && shot.data) {
      fs.writeFileSync('C:\\Users\\LUCKY\\.gemini\\antigravity\\brain\\c0b9201d-d038-4e6c-a45e-887122382248\\scratch\\stitch_canvas.png', Buffer.from(shot.data, 'base64'));
      console.log('Saved stitch_canvas.png');
    }

    // Inspect screen instances and HTML code in React / DOM
    const inspectRes = await send('Runtime.evaluate', {
      expression: `
        (() => {
          const screens = [];
          const nodes = Array.from(document.querySelectorAll('.react-flow__node, [data-testid="screen-node"], [class*="screen"], [class*="node"], [class*="canvas"]'));
          const allText = document.body ? document.body.innerText : '';
          const localKeys = Object.keys(localStorage);
          const htmlSources = [];
          document.querySelectorAll('iframe').forEach(f => {
            try {
              htmlSources.push({ src: f.src, html: f.contentDocument ? f.contentDocument.documentElement.outerHTML : '' });
            } catch(e) {}
          });

          return {
            nodeCount: nodes.length,
            nodeClasses: nodes.slice(0, 10).map(n => n.className),
            allText: allText.slice(0, 2000),
            localKeys,
            htmlSourcesCount: htmlSources.length,
            htmlSources: htmlSources.map(s => ({ src: s.src, len: s.html.length }))
          };
        })()
      `,
      returnByValue: true
    });

    console.log('Inspect result:', JSON.stringify(inspectRes, null, 2));
    fs.writeFileSync('C:\\Users\\LUCKY\\.gemini\\antigravity\\brain\\c0b9201d-d038-4e6c-a45e-887122382248\\scratch\\stitch_inspect.json', JSON.stringify(inspectRes, null, 2));

    ws.close();
  } catch (e) {
    console.error('Error:', e);
  } finally {
    child.kill();
  }
}

run();
