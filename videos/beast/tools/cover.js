// 封面：node tools/cover.js [ep=wolf] [type=INFJ]  → output/beast/<ep>/cover/封面_4比5.png
const fs = require('fs'), path = require('path');
const { chromium } = require('playwright');
const { serve } = require('./server');
(async () => {
  const [ep = 'wolf', type = 'INFJ'] = process.argv.slice(2);
  const { srv, url } = await serve(path.resolve(__dirname, '..'));
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1080, height: 1350 } });
  const errs = []; p.on('pageerror', e => errs.push(String(e)));
  await p.goto(`${url}/tools/cover.html?ep=${ep}&type=${type}`); await p.waitForFunction(() => window.READY, null, { timeout: 60000 });
  const d = await p.evaluate(() => document.getElementById('out').toDataURL('image/png'));
  const out = path.resolve(__dirname, '../../../output/beast', ep, 'cover'); fs.mkdirSync(out, { recursive: true });
  fs.writeFileSync(path.join(out, '封面_4比5.png'), Buffer.from(d.split(',')[1], 'base64'));
  await b.close(); srv.close(); if (errs.length) { console.error(errs.join('\n')); process.exit(1); } console.log(path.join(out, '封面_4比5.png'));
})();
