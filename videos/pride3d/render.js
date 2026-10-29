// 分段渲染《七宗罪·傲慢》粒子版并拼接成 MP4（1920×1080，30fps，H.264 yuv420p，无声）。
// 用法：node render.js            OUT=目录 指定输出目录（默认 output/pride3d）
// 已存在的 p序号.mp4 会被跳过；删除某一段后重跑即可只重渲那一段。
const { chromium } = require('playwright');
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const { serve } = require('./tools/server');

const FPS = 30;
const CUTS = [0, 20, 37, 54, 76.2, 96, 108, 122, 128];
const WORKERS = 3; // 软件 WebGL 比较吃 CPU
const GL_ARGS = ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'];
const outDir = path.resolve(process.env.OUT || path.join(__dirname, '../../output/pride3d'));
const partDir = path.join(outDir, 'parts');
const finalFile = path.join(outDir, '傲慢_1080p.mp4');

function ffmpeg(args, stdin = false) { return spawn('ffmpeg', args, { stdio: [stdin ? 'pipe' : 'ignore', 'ignore', 'pipe'] }); }
function waitExit(proc, label) {
  let err = '';
  proc.stderr.on('data', d => { err += d; if (err.length > 20000) err = err.slice(-20000); });
  return new Promise((res, rej) => proc.on('close', code => (code === 0 ? res() : rej(new Error(`${label} 退出码 ${code}\n${err.slice(-2000)}`)))));
}

async function renderSegment(page, seg) {
  const done = path.join(partDir, `p${seg.i}.mp4`), tmp = path.join(partDir, `p${seg.i}.tmp.mp4`);
  if (fs.existsSync(done)) { console.log(`p${seg.i} 已存在，跳过`); return; }
  const f0 = Math.round(seg.a * FPS), f1 = Math.round(seg.b * FPS);
  const proc = ffmpeg(['-y', '-f', 'image2pipe', '-framerate', String(FPS), '-c:v', 'mjpeg', '-i', '-',
    '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '18', '-pix_fmt', 'yuv420p', '-r', String(FPS), tmp], true);
  const exit = waitExit(proc, `p${seg.i}`);
  const t0 = Date.now();
  for (let f = f0; f < f1; f++) {
    const url = await page.evaluate(fr => { window.render(fr / 30); return document.getElementById('out').toDataURL('image/jpeg', 0.92); }, f);
    const buf = Buffer.from(url.slice(url.indexOf(',') + 1), 'base64');
    if (!proc.stdin.write(buf)) await new Promise(r => proc.stdin.once('drain', r));
    if ((f - f0) % 150 === 0) console.log(`p${seg.i}  帧 ${f - f0}/${f1 - f0}`);
  }
  proc.stdin.end();
  await exit;
  fs.renameSync(tmp, done);
  console.log(`p${seg.i} 完成：${f1 - f0} 帧，用时 ${((Date.now() - t0) / 1000).toFixed(1)} 秒`);
}

(async () => {
  fs.mkdirSync(partDir, { recursive: true });
  const segs = CUTS.slice(0, -1).map((a, k) => ({ i: k + 1, a, b: CUTS[k + 1] }));
  // 先渲长的段，让三个页面尽量同时收尾
  const queue = segs.slice().sort((x, y) => (y.b - y.a) - (x.b - x.a));
  const { srv, url } = await serve(__dirname);
  const browser = await chromium.launch({ args: GL_ARGS });
  const errors = [];
  const worker = async () => {
    const page = await browser.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 });
    page.on('pageerror', e => errors.push(String(e)));
    await page.goto(url + '/index.html');
    await page.evaluate(() => document.fonts.ready);
    await page.waitForFunction(() => window.READY === true || window.FAILED, null, { timeout: 120000 });
    const failed = await page.evaluate(() => window.FAILED);
    if (failed) throw new Error(failed);
    while (queue.length) await renderSegment(page, queue.shift());
    await page.close();
  };
  await Promise.all(Array.from({ length: WORKERS }, worker));
  await browser.close(); srv.close();
  if (errors.length) throw new Error('页面错误：\n' + errors.join('\n'));
  const list = path.join(partDir, 'concat.txt');
  fs.writeFileSync(list, segs.map(s => `file 'p${s.i}.mp4'`).join('\n') + '\n');
  await waitExit(ffmpeg(['-y', '-f', 'concat', '-safe', '0', '-i', list, '-c', 'copy', '-movflags', '+faststart', finalFile]), 'concat');
  console.log('完成：' + finalFile);
})().catch(e => { console.error(e); process.exit(1); });
