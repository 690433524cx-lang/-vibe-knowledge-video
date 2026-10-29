// 截取若干时间点的静帧（JPEG），用于逐张检查。
// 用法：node stills.js [时间点…]   不带参数时截取默认检查清单
//      OUT=目录 指定输出目录（默认 output/pride/stills）
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const DEFAULT = [0, 2.8, 6.0, 7.9, 11.5, 14.0, 17.8, 20.0, 25.0, 32.0, 39.5, 45.0, 50.0, 53.5, 58.0, 64.0, 69.0, 73.0,
  79.0, 83.0, 89.0, 94.5, 98.0, 102.5, 106.0, 110.0, 115.0, 118.8, 122.0, 126.5, 130.5, 136.5, 139.0];

const args = process.argv.slice(2).map(Number).filter(v => Number.isFinite(v));
const times = args.length ? args : DEFAULT;
const PNG = !!process.env.PNG; // PNG=1 时输出无损 PNG，便于排查压缩伪影
const outDir = path.resolve(process.env.OUT || path.join(__dirname, '../../output/pride/stills'));

(async () => {
  fs.mkdirSync(outDir, { recursive: true });
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 });
  const errors = [];
  page.on('pageerror', e => errors.push(String(e)));
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  await page.goto('file://' + path.join(__dirname, 'index.html'));
  await page.evaluate(() => document.fonts.ready);
  await page.waitForFunction(() => window.READY === true, null, { timeout: 30000 });
  for (const t of times) {
    const url = await page.evaluate(([t, fmt]) => { window.render(t); return document.getElementById('c').toDataURL(fmt, 0.92); }, [t, PNG ? 'image/png' : 'image/jpeg']);
    const file = path.join(outDir, `t_${t.toFixed(2).padStart(6, '0')}.${PNG ? 'png' : 'jpg'}`);
    fs.writeFileSync(file, Buffer.from(url.split(',')[1], 'base64'));
    console.log(file);
  }
  await browser.close();
  if (errors.length) { console.error('页面错误：\n' + errors.join('\n')); process.exit(1); }
})();
