// 打开渲染页面的公共代码：node 端用 playwright 启动无头 Chromium（软件 WebGL）
const { chromium } = require('playwright');
const path = require('path');
const { serve } = require('./server');
const GL_ARGS = ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'];
async function openBrowser() { const { srv, url } = await serve(path.resolve(__dirname, '..')); const browser = await chromium.launch({ args: GL_ARGS }); return { srv, url, browser }; }
async function openPage(browser, url, preview, errors = [], upto) {
  const page = await browser.newPage({ viewport: { width: preview ? 960 : 1920, height: preview ? 540 : 1080 }, deviceScaleFactor: 1 });
  page.on('pageerror', e => errors.push(String(e)));
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); if (process.env.DEBUG_LOG) console.log('LOG', m.text()); });
  const qs = [preview ? 'preview=1' : '', upto != null ? `upto=${upto}` : ''].filter(Boolean).join('&');
  await page.goto(`${url}/index.html${qs ? '?' + qs : ''}`);
  await page.evaluate(() => document.fonts.ready);
  await page.waitForFunction(() => window.READY === true || window.FAILED, null, { timeout: 900000 });
  const failed = await page.evaluate(() => window.FAILED);
  if (failed) throw new Error(failed);
  return page;
}
module.exports = { openBrowser, openPage, GL_ARGS };
