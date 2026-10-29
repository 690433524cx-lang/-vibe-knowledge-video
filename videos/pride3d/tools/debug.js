// 调试截图：node tools/debug.js 秒 "执行于 render 之前的 JS" 输出文件
const { chromium } = require('playwright'); const fs = require('fs'); const path = require('path');
const { serve } = require('./server');
(async () => {
  const [t, code, out] = [Number(process.argv[2]), process.argv[3] || '', process.argv[4] || '/tmp/claude-0/debug.jpg'];
  const { srv, url } = await serve(path.resolve(__dirname, '..'));
  const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const p = await b.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 });
  p.on('pageerror', e => console.log('ERR', String(e))); p.on('console', m => console.log('LOG', m.text()));
  await p.goto(url + '/index.html'); await p.waitForFunction(() => window.READY || window.FAILED, null, { timeout: 120000 });
  const d = await p.evaluate(([t, code]) => { window.DBG = new Function('K', 't', code); window.render(t); return document.getElementById('out').toDataURL('image/jpeg', 0.92); }, [t, code]);
  fs.writeFileSync(out, Buffer.from(d.split(',')[1], 'base64')); await b.close(); srv.close(); console.log(out);
})();
