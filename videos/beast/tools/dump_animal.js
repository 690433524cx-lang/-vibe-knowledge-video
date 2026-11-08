// 用程序化动物库（vendor/procedural-animals，MIT）在无头浏览器里生成网格，原样存到 assets/models/raw/<名字>.json + .bin
// node tools/dump_animal.js <名字> <物种> [质量=hero] [种子=1] [变种]
const fs = require('fs'), path = require('path');
const { chromium } = require('playwright');
const { serve } = require('./server');
(async () => {
  const [name, species, quality = 'hero', seed = '1', variant] = process.argv.slice(2);
  const { srv, url } = await serve(path.resolve(__dirname, '..'));
  const browser = await chromium.launch();
  const page = await browser.newPage();
  page.on('pageerror', e => console.error('pageerror', e));
  await page.goto(url + '/tools/mesh_page.html');
  await page.waitForFunction(() => window.READY);
  const t0 = Date.now();
  const r = await page.evaluate(([s, o]) => window.dump(s, o), [species, { quality, seed: +seed, ...(variant ? { variant } : {}) }]);
  const out = path.resolve(__dirname, '../assets/models/raw'); fs.mkdirSync(out, { recursive: true });
  const layout = {}, bufs = []; let off = 0;
  for (const [k, v] of Object.entries(r.bin)) { const b = Buffer.from(v.data, 'base64'); layout[k] = { type: v.type, n: v.n, offset: off }; bufs.push(b, Buffer.alloc((4 - b.length % 4) % 4)); off += b.length + (4 - b.length % 4) % 4; }
  fs.writeFileSync(path.join(out, name + '.bin'), Buffer.concat(bufs));
  fs.writeFileSync(path.join(out, name + '.json'), JSON.stringify({ source: { library: 'procedural-animals c95ae49', species, quality, seed: +seed, variant: variant || null }, layout, ...r.meta }));
  console.log(name, species, 'nV', r.meta.nV, 'tris', r.meta.stats.tris, ((Date.now() - t0) / 1000).toFixed(1) + 's');
  await browser.close(); srv.close();
})().catch(e => { console.error(e); process.exit(1); });
