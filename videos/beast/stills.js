// 截图：node stills.js <动物> <video|still|card> [秒…]   输出到 output/beast/<动物>/
const fs = require('fs'), path = require('path');
const { openBrowser, openPage, grab } = require('./tools/page');
(async () => {
  const [ep = 'wolf', mode = 'still', ...ts] = process.argv.slice(2);
  const times = ts.length ? ts.map(Number) : [0];
  const outDir = path.resolve(process.env.OUT || path.join(__dirname, '../../output/beast', ep)); fs.mkdirSync(outDir, { recursive: true });
  const { srv, url, browser } = await openBrowser(); const errors = [];
  const t0 = Date.now();
  const page = await openPage(browser, url, `ep=${ep}&mode=${mode}`, errors);
  const meta = await page.evaluate(() => ({ count: window.META.count, surface: window.META.surface }));
  console.log(`${ep} ${mode}：${meta.count} 个粒子（表面 ${meta.surface}），初始化 ${((Date.now() - t0) / 1000).toFixed(1)} 秒`);
  if (process.env.CAM) await page.evaluate(c => { window.CAM_OVERRIDE = JSON.parse(c); }, process.env.CAM);
  for (const t of times) {
    await page.evaluate(t => window.render(t), t);
    const name = mode === 'video' ? `t_${t.toFixed(2)}.png` : `${mode}${process.env.TAG || ''}.png`;
    fs.writeFileSync(path.join(outDir, name), await grab(page));
    const info = await page.evaluate(() => window.LAST);
    fs.writeFileSync(path.join(outDir, name.replace('.png', '.json')), JSON.stringify(info));
    console.log('  ', name);
  }
  await browser.close(); srv.close();
  if (errors.length) { console.error('页面错误：\n' + [...new Set(errors)].join('\n')); process.exit(1); }
})().catch(e => { console.error(e); process.exit(1); });
