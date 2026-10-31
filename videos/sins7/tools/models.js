// node tools/models.js：把候选雕像各渲染一张正面灰模（output/sins7/models/）
const fs = require('fs'); const path = require('path');
const { chromium } = require('playwright'); const { serve } = require('./server'); const { GL_ARGS } = require('./page');
const LIST = JSON.parse(process.argv[2] || '[]');
(async () => {
  const { srv, url } = await serve(path.resolve(__dirname, '..')); const browser = await chromium.launch({ args: GL_ARGS });
  const page = await browser.newPage({ viewport: { width: 800, height: 1000 } }); page.on('pageerror', e => console.log('ERR', String(e)));
  await page.goto(url + '/tools/models.html'); await page.waitForFunction(() => window.READY);
  const out = path.resolve(__dirname, '../../../output/sins7/models'); fs.mkdirSync(out, { recursive: true });
  for (const [name, file, ry, rx] of LIST) {
    const r = await page.evaluate(([f, a, b]) => window.shot(f, a, b), ['../assets/models/' + file, ry, rx]);
    fs.writeFileSync(path.join(out, name + '.png'), Buffer.from(r.png.split(',')[1], 'base64'));
    console.log(name, r.tris, r.size);
  }
  await browser.close(); srv.close();
})();
