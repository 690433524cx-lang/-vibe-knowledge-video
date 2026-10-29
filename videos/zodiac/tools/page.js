// 打开渲染页面（无头 Chromium + 软件 WebGL），供 stills.js / render.js / qa.js 共用
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const { serve } = require('./server');
const { build } = require('./build-starmap');

const ROOT = path.join(__dirname, '..');
const GL_ARGS = ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'];

// 规格：正式版 1080×1920 / 30 帧；预览版 540×960 / 15 帧 / 粒子数量减半
function spec(preview) { return preview ? { w: 540, h: 960, fps: 15, q: 0.5 } : { w: 1080, h: 1920, fps: 30, q: 1 }; }

async function ensureStarmap(sign) {
  if (!fs.existsSync(path.join(ROOT, 'engine/assets/starmap', sign + '.json'))) await build([sign]);
}
function loadSign(sign) {
  const f = path.join(ROOT, 'engine/signs', sign + '.json');
  if (!fs.existsSync(f)) throw new Error(`找不到星座配置 ${f}`);
  return JSON.parse(fs.readFileSync(f, 'utf8'));
}

async function openBrowser() {
  const { srv, url } = await serve(ROOT);
  const browser = await chromium.launch({ args: GL_ARGS });
  return { srv, url, browser };
}
async function openPage(ctx, sign, sp, errors = []) {
  const page = await ctx.browser.newPage({ viewport: { width: sp.w, height: sp.h }, deviceScaleFactor: 1 });
  page.on('pageerror', e => errors.push(String(e)));
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  await page.goto(`${ctx.url}/engine/index.html?sign=${sign}&w=${sp.w}&h=${sp.h}&q=${sp.q}`);
  await page.waitForFunction(() => window.READY === true || window.FAILED, null, { timeout: 300000, polling: 500 });
  const failed = await page.evaluate(() => window.FAILED);
  if (failed) throw new Error(failed);
  return page;
}
// 渲染一帧，返回 JPEG 和本帧的文字包围盒
async function grab(page, t) {
  const r = await page.evaluate(t => { window.render(t); return { url: document.getElementById('outCanvas').toDataURL('image/jpeg', 0.92), info: window.__frame }; }, t);
  return { jpg: Buffer.from(r.url.slice(r.url.indexOf(',') + 1), 'base64'), info: r.info };
}
module.exports = { ROOT, spec, ensureStarmap, loadSign, openBrowser, openPage, grab };
