// 截图：node stills.js [--preview] [--upto=N] 秒…      OUT=目录（默认 output/sins7/stills）
const fs = require('fs');
const path = require('path');
const { openBrowser, openPage } = require('./tools/page');
(async () => {
  const args = process.argv.slice(2), preview = args.includes('--preview');
  const upto = (args.find(a => a.startsWith('--upto=')) || '').split('=')[1];
  const times = args.map(Number).filter(v => Number.isFinite(v));
  const outDir = path.resolve(process.env.OUT || path.join(__dirname, '../../output/sins7/stills'));
  fs.mkdirSync(outDir, { recursive: true });
  const { srv, url, browser } = await openBrowser();
  const errors = [];
  const page = await openPage(browser, url, preview, errors, upto);
  for (const t of times) {
    const data = await page.evaluate(t => { window.render(t); return document.getElementById('out').toDataURL('image/jpeg', 0.92); }, t);
    fs.writeFileSync(path.join(outDir, `t_${t.toFixed(2).padStart(6, '0')}.jpg`), Buffer.from(data.split(',')[1], 'base64'));
  }
  await browser.close(); srv.close();
  if (errors.length) { console.error('页面错误：\n' + [...new Set(errors)].join('\n')); process.exit(1); }
})().catch(e => { console.error(e); process.exit(1); });
