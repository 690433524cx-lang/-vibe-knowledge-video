// 文字是否压到主体：每 0.1 秒渲染一帧，比较这一帧画出的所有文字框（字幕、钩子大字、标签）和主体（懒惰的脸和帽子、那件事）的屏幕范围
// 同时导出字幕表 subs_greed.json（给 qa.js 检查阅读时间）
const fs = require('fs'), path = require('path');
const { openBrowser, openPage } = require('./page');
(async () => {
  const { srv, url, browser } = await openBrowser(); const errors = [];
  const page = await openPage(browser, url, true, errors);
  const subs = await page.evaluate(async () => (await import('./src/greed.js')).subsList());
  fs.writeFileSync(path.join(__dirname, '../subs_greed.json'), JSON.stringify(subs, null, 1));
  const TL = await page.evaluate(() => window.META.duration);
  const hits = new Map(); let n = 0;
  for (let t = 0; t < TL; t += 0.1) {
    const r = await page.evaluate(t => { window.render(t); return { b: window.LAST_BOXES, s: window.LAST_SUBJ }; }, t); n++;
    for (const b of r.b) for (const s of r.s) {
      const ix = Math.min(b.x1, s.x1) - Math.max(b.x0, s.x0), iy = Math.min(b.y1, s.y1) - Math.max(b.y0, s.y0);
      if (ix > 6 && iy > 6 && b.alpha > 0.3) { const k = `${b.label} × ${s.name}`; if (!hits.has(k)) hits.set(k, []); hits.get(k).push(t.toFixed(1)); }
    }
  }
  await browser.close(); srv.close();
  console.log(`[${hits.size ? '失败' : '通过'}] 文字压主体：检查 ${n} 帧（每 0.1 秒），${hits.size ? '' : '没有文字压到主体的脸、帽子或那件事'}`);
  for (const [k, v] of hits) console.log(`  ${k}：${v.length} 帧（${v[0]}–${v[v.length - 1]} 秒）`);
  process.exit(hits.size ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
