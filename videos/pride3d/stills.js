// 截取指定时刻的静帧：node stills.js [秒…]（不带参数时截取默认检查清单）
// OUT=目录 指定输出目录（默认 output/pride3d/stills）
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const { serve } = require('./tools/server');

const DEFAULT = [0, 2.0, 3.6, 6.0, 9.8, 12.0, 14.5, 16.5, 18.8, 21.0, 27.0, 32.0, 35.5, 40.0, 43.0, 48.0, 52.0, 57.0, 62.2, 64.6,
  70.0, 74.0, 78.0, 84.0, 87.0, 90.0, 94.0, 99.0, 103.0, 106.2, 110.0, 114.0, 117.0, 120.5, 124.0, 127.8];
const args = process.argv.slice(2).map(Number).filter(v => Number.isFinite(v));
const times = args.length ? args : DEFAULT;
const outDir = path.resolve(process.env.OUT || path.join(__dirname, '../../output/pride3d/stills'));
const GL_ARGS = ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'];

(async () => {
  fs.mkdirSync(outDir, { recursive: true });
  const { srv, url } = await serve(__dirname);
  const browser = await chromium.launch({ args: GL_ARGS });
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 });
  const errors = [];
  page.on('pageerror', e => errors.push(String(e)));
  page.on('console', m => { if (m.type() === 'error' || m.type() === 'warning') errors.push(m.text()); });
  await page.goto(url + '/index.html');
  await page.evaluate(() => document.fonts.ready);
  await page.waitForFunction(() => window.READY === true || window.FAILED, null, { timeout: 120000 });
  const failed = await page.evaluate(() => window.FAILED);
  if (failed) { console.error(failed); process.exit(1); }
  for (const t of times) {
    const t0 = Date.now();
    const data = await page.evaluate(t => { window.render(t); return document.getElementById('out').toDataURL('image/jpeg', 0.92); }, t);
    const file = path.join(outDir, `t_${t.toFixed(2).padStart(6, '0')}.jpg`);
    fs.writeFileSync(file, Buffer.from(data.split(',')[1], 'base64'));
    console.log(file, `${Date.now() - t0}ms`);
  }
  await browser.close(); srv.close();
  if (errors.length) { console.error('页面消息：\n' + [...new Set(errors)].join('\n')); }
})();
