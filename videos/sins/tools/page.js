// 打开渲染页面的公共代码：node 端用 playwright 启动无头 Chromium（软件 WebGL）
const { chromium } = require('playwright');
const path = require('path');
const { serve } = require('./server');
const GL_ARGS = ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'];
async function openBrowser() { const { srv, url } = await serve(path.resolve(__dirname, '..')); const browser = await chromium.launch({ args: GL_ARGS }); return { srv, url, browser }; }
async function openPage(browser, url, q, errors = []) {
  const preview = q.preview;
  const page = await browser.newPage({ viewport: { width: preview ? 540 : 1080, height: preview ? 960 : 1920 }, deviceScaleFactor: 1 });
  page.on('pageerror', e => errors.push(String(e)));
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  await page.goto(`${url}/index.html?ep=${q.ep}&ver=${q.ver}${preview ? '&preview=1' : ''}`);
  await page.evaluate(() => document.fonts.ready);
  await page.waitForFunction(() => window.READY === true || window.FAILED, null, { timeout: 240000 });
  const failed = await page.evaluate(() => window.FAILED);
  if (failed) throw new Error(failed);
  return page;
}
// 命令行参数：--episode envy --version short --preview
function parseArgs(argv) {
  const q = { ep: 'envy', ver: 'short', preview: false, rest: [] };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--episode') q.ep = argv[++i]; else if (a === '--version') q.ver = argv[++i]; else if (a === '--preview') q.preview = true; else q.rest.push(a);
  }
  return q;
}
module.exports = { openBrowser, openPage, parseArgs, GL_ARGS };
