// 封面用的无字幕帧：node tools/cover_frame.js 输出目录 秒…（window.COVER=1 时不画字幕、标题、左上角小字）
const fs = require('fs');
const { openBrowser, openPage } = require('./page');
(async () => {
  const { srv, url, browser } = await openBrowser();
  const p = await openPage(browser, url, false, []);
  const out = process.argv[2]; const ts = process.argv.slice(3).map(Number);
  for (const t of ts) {
    const d = await p.evaluate(t => { window.COVER = 1; window.render(t); return document.getElementById('out').toDataURL('image/png'); }, t);
    fs.writeFileSync(`${out}/cv_${t.toFixed(2)}.png`, Buffer.from(d.split(',')[1], 'base64'));
  }
  await browser.close(); srv.close();
})();
