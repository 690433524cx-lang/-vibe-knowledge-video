// 打开渲染页面：无头 Chromium（软件 WebGL）
const { chromium } = require('playwright');
const path = require('path');
const { serve } = require('./server');
const GL_ARGS = ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'];
async function openBrowser() { const { srv, url } = await serve(path.resolve(__dirname, '..')); const browser = await chromium.launch({ args: GL_ARGS }); return { srv, url, browser }; }
async function openPage(browser, url, query, errors = []) {
  const card = /mode=card/.test(query);
  const page = await browser.newPage({ viewport: { width: card ? 1080 : 1920, height: card ? 1350 : 1080 }, deviceScaleFactor: 1 });
  page.on('pageerror', e => errors.push(String(e)));
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); if (process.env.DEBUG_LOG) console.log('LOG', m.text()); });
  await page.goto(`${url}/index.html?${query}`);
  await page.waitForFunction(() => window.READY === true || window.FAILED, null, { timeout: 900000 });
  const failed = await page.evaluate(() => window.FAILED);
  if (failed) throw new Error(failed);
  return page;
}
const grab = (page, type = 'png') => page.evaluate(ty => document.getElementById('out').toDataURL(ty === 'png' ? 'image/png' : 'image/jpeg', 0.95), type).then(d => Buffer.from(d.split(',')[1], 'base64'));
module.exports = { openBrowser, openPage, grab, GL_ARGS };
