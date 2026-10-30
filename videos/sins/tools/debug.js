// 调试截图：node tools/debug.js --episode envy --version short 秒 "render 之后、合成之前执行的 JS（参数 K, t）" 输出文件
const fs = require('fs');
const { openBrowser, openPage, parseArgs } = require('./page');
(async () => {
  const q = parseArgs(process.argv.slice(2));
  const [t, code, out] = [Number(q.rest[0]), q.rest[1] || '', q.rest[2] || '/tmp/claude-0/debug.jpg'];
  const { srv, url, browser } = await openBrowser();
  const errors = [];
  const p = await openPage(browser, url, q, errors);
  p.on('console', m => console.log('LOG', m.text()));
  const d = await p.evaluate(([t, code]) => { window.DBG = new Function('K', 't', code); window.render(t); return document.getElementById('out').toDataURL('image/jpeg', 0.92); }, [t, code]);
  fs.writeFileSync(out, Buffer.from(d.split(',')[1], 'base64')); await browser.close(); srv.close(); console.log(out, errors.join('\n'));
})();
