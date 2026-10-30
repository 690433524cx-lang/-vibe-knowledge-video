// 调试截图：node tools/debug.js 秒 "render 后、合成前执行的 JS（参数 K, t）" 输出文件
const fs = require('fs');
const { openBrowser, openPage } = require('./page');
(async () => {
  const [t, code, out] = [Number(process.argv[2]), process.argv[3] || '', process.argv[4] || '/tmp/claude-0/debug.jpg'];
  const { srv, url, browser } = await openBrowser();
  const errors = [];
  const p = await openPage(browser, url, false, errors);
  p.on('console', m => console.log('LOG', m.text()));
  const d = await p.evaluate(([t, code]) => { window.DBG = new Function('K', 't', code); window.render(t); return document.getElementById('out').toDataURL('image/jpeg', 0.92); }, [t, code]);
  fs.writeFileSync(out, Buffer.from(d.split(',')[1], 'base64')); await browser.close(); srv.close(); console.log(out, errors.join('\n'));
})();
