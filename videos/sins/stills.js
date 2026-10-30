// 截取指定时刻的静帧：node stills.js --episode envy --version short [--preview] 秒…
// OUT=目录 指定输出目录（默认 output/sins/stills/<期>_<版>）
const fs = require('fs');
const path = require('path');
const { openBrowser, openPage, parseArgs } = require('./tools/page');

(async () => {
  const q = parseArgs(process.argv.slice(2));
  const times = q.rest.map(Number).filter(v => Number.isFinite(v));
  const outDir = path.resolve(process.env.OUT || path.join(__dirname, '../../output/sins/stills', `${q.ep}_${q.ver}${q.preview ? '_preview' : ''}`));
  fs.mkdirSync(outDir, { recursive: true });
  const { srv, url, browser } = await openBrowser();
  const errors = [];
  const page = await openPage(browser, url, q, errors);
  for (const t of times) {
    const t0 = Date.now();
    const data = await page.evaluate(t => { window.render(t); return document.getElementById('out').toDataURL('image/jpeg', 0.92); }, t);
    const file = path.join(outDir, `t_${t.toFixed(2).padStart(6, '0')}.jpg`);
    fs.writeFileSync(file, Buffer.from(data.split(',')[1], 'base64'));
    console.log(file, `${Date.now() - t0}ms`);
  }
  await browser.close(); srv.close();
  if (errors.length) { console.error('页面错误：\n' + [...new Set(errors)].join('\n')); process.exit(1); }
})().catch(e => { console.error(e); process.exit(1); });
