// 渲染并导出视频：node render.js --sign leo [--preview]
// 正式版：1080×1920 / 30 帧 / H.264 yuv420p，输出 out/<星座名>_星座召唤.mp4
// 预览版：540×960 / 15 帧 / 粒子数量减半，输出 out/<星座名>_星座召唤_预览.mp4
// 按切点 0、4、8、15、20、25 分 5 段，3 个页面并行；每段先写临时文件、成功后改名；最后 concat 拼接（-c copy）。
// 同时把每帧的文字包围盒写到 <输出>.boxes.json，给 qa.js 检查安全区和重叠。
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const { ROOT, spec, ensureStarmap, loadSign, openBrowser, openPage, grab } = require('./tools/page');

const CUTS = [0, 4, 8, 15, 20, 25];
const WORKERS = 3;
const argv = process.argv.slice(2);
const opt = k => { const i = argv.indexOf(k); return i >= 0 ? argv[i + 1] : null; };
const sign = opt('--sign') || 'leo', preview = argv.includes('--preview');

function ffmpeg(args, stdin = false) { return spawn('ffmpeg', args, { stdio: [stdin ? 'pipe' : 'ignore', 'ignore', 'pipe'] }); }
function waitExit(proc, label) {
  let err = '';
  proc.stderr.on('data', d => { err += d; if (err.length > 20000) err = err.slice(-20000); });
  return new Promise((res, rej) => proc.on('close', code => (code === 0 ? res() : rej(new Error(`${label} 退出码 ${code}\n${err.slice(-2000)}`)))));
}

(async () => {
  const cfg = loadSign(sign); await ensureStarmap(sign);
  const sp = spec(preview);
  const outDir = path.join(ROOT, 'out');
  const finalFile = path.join(outDir, `${cfg.name}_星座召唤${preview ? '_预览' : ''}.mp4`);
  const partDir = path.join(outDir, 'parts', `${cfg.id}${preview ? '_preview' : ''}`);
  fs.rmSync(partDir, { recursive: true, force: true });
  fs.mkdirSync(partDir, { recursive: true });
  const segs = CUTS.slice(0, -1).map((a, k) => ({ i: k + 1, a, b: CUTS[k + 1] }));
  const queue = segs.slice().sort((x, y) => (y.b - y.a) - (x.b - x.a)); // 长的先渲
  const boxes = {};
  const ctx = await openBrowser(); const errors = [];
  const T0 = Date.now();
  const renderSegment = async (page, seg) => {
    const done = path.join(partDir, `p${seg.i}.mp4`), tmp = path.join(partDir, `p${seg.i}.tmp.mp4`);
    const f0 = Math.round(seg.a * sp.fps), f1 = Math.round(seg.b * sp.fps);
    const proc = ffmpeg(['-y', '-f', 'image2pipe', '-framerate', String(sp.fps), '-c:v', 'mjpeg', '-i', '-',
      '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '17', '-pix_fmt', 'yuv420p', '-r', String(sp.fps), tmp], true);
    const exit = waitExit(proc, `p${seg.i}`);
    const t0 = Date.now();
    for (let f = f0; f < f1; f++) {
      const { jpg, info } = await grab(page, f / sp.fps);
      boxes[f] = { t: +(f / sp.fps).toFixed(4), boxes: info.boxes, face: info.face };
      if (!proc.stdin.write(jpg)) await new Promise(r => proc.stdin.once('drain', r));
      if ((f - f0) % 60 === 0) console.log(`第 ${seg.i} 段 ${seg.a}–${seg.b}s：${f - f0}/${f1 - f0} 帧`);
    }
    proc.stdin.end();
    await exit;
    fs.renameSync(tmp, done);
    console.log(`第 ${seg.i} 段完成：${f1 - f0} 帧，用时 ${((Date.now() - t0) / 1000).toFixed(0)} 秒`);
  };
  await Promise.all(Array.from({ length: WORKERS }, async () => {
    const page = await openPage(ctx, sign, sp, errors);
    while (queue.length) await renderSegment(page, queue.shift());
    await page.close();
  }));
  await ctx.browser.close(); ctx.srv.close();
  if (errors.length) throw new Error('页面错误：\n' + [...new Set(errors)].join('\n'));
  const list = path.join(partDir, 'concat.txt');
  fs.writeFileSync(list, segs.map(s => `file 'p${s.i}.mp4'`).join('\n') + '\n');
  await waitExit(ffmpeg(['-y', '-f', 'concat', '-safe', '0', '-i', list, '-c', 'copy', '-movflags', '+faststart', finalFile]), 'concat');
  fs.writeFileSync(finalFile + '.boxes.json', JSON.stringify({ sign, fps: sp.fps, width: sp.w, height: sp.h, frames: boxes }));
  console.log(`完成：${finalFile}（总用时 ${((Date.now() - T0) / 1000).toFixed(0)} 秒）`);
})().catch(e => { console.error(e); process.exit(1); });
