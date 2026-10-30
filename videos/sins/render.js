// 分段渲染并拼接成 MP4（1080×1920，30fps，H.264 yuv420p，无声）。
// 用法：node render.js --episode envy --version short|long [--preview]
//       node render.js --episode pride --version short
// --preview：540×960、15fps，输出到 out/preview/。已存在的分段会被跳过；删掉某一段再跑即可只重渲那一段。
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const { openBrowser, openPage, parseArgs } = require('./tools/page');

const NAMES = { 'envy:short': '嫉妒_竖屏短版', 'envy:long': '嫉妒_长版', 'pride:short': '傲慢_竖屏短版_系列版' };
const WORKERS = 3;
const ROOT = path.resolve(__dirname, '../..');

function ffmpeg(args, stdin = false) { return spawn('ffmpeg', args, { stdio: [stdin ? 'pipe' : 'ignore', 'ignore', 'pipe'] }); }
function waitExit(proc, label) {
  let err = '';
  proc.stderr.on('data', d => { err += d; if (err.length > 20000) err = err.slice(-20000); });
  return new Promise((res, rej) => proc.on('close', code => (code === 0 ? res() : rej(new Error(`${label} 退出码 ${code}\n${err.slice(-2000)}`)))));
}

(async () => {
  const q = parseArgs(process.argv.slice(2));
  const key = `${q.ep}:${q.ver}`;
  if (!NAMES[key]) throw new Error('没有这个版本：' + key);
  const fps = q.preview ? 15 : 30;
  const outDir = q.preview ? path.join(ROOT, 'out/preview') : path.join(ROOT, 'out');
  const name = NAMES[key] + (q.preview ? '_预览' : '');
  const partDir = path.join(outDir, 'parts', name);
  fs.mkdirSync(partDir, { recursive: true });
  const { srv, url, browser } = await openBrowser();
  const errors = [];
  const meta0 = await (async () => { const p = await openPage(browser, url, q, errors); const m = await p.evaluate(() => window.META); await p.close(); return m; })();
  const total = Math.round(meta0.duration * fps);
  // 按约 4 秒一段切分（短版 3 段，长版 21 段）
  const nSeg = Math.max(3, Math.round(meta0.duration / 4));
  const segs = Array.from({ length: nSeg }, (_, i) => ({ i: i + 1, f0: Math.round(total * i / nSeg), f1: Math.round(total * (i + 1) / nSeg) }));
  const queue = segs.slice();
  const worker = async () => {
    const page = await openPage(browser, url, q, errors);
    while (queue.length) {
      const seg = queue.shift();
      const done = path.join(partDir, `p${String(seg.i).padStart(2, '0')}.mp4`), tmp = done.replace('.mp4', '.tmp.mp4');
      if (fs.existsSync(done)) { console.log(`${name} p${seg.i} 已存在，跳过`); continue; }
      const proc = ffmpeg(['-y', '-f', 'image2pipe', '-framerate', String(fps), '-c:v', 'mjpeg', '-i', '-',
        '-c:v', 'libx264', '-preset', q.preview ? 'ultrafast' : 'veryfast', '-crf', q.preview ? '23' : '18', '-pix_fmt', 'yuv420p', '-r', String(fps), tmp], true);
      const exit = waitExit(proc, `p${seg.i}`);
      const t0 = Date.now();
      for (let f = seg.f0; f < seg.f1; f++) {
        const url = await page.evaluate(([fr, fps]) => { window.render(fr / fps); return document.getElementById('out').toDataURL('image/jpeg', 0.93); }, [f, fps]);
        const buf = Buffer.from(url.slice(url.indexOf(',') + 1), 'base64');
        if (!proc.stdin.write(buf)) await new Promise(r => proc.stdin.once('drain', r));
      }
      proc.stdin.end();
      await exit;
      fs.renameSync(tmp, done);
      console.log(`${name} p${seg.i} 完成：${seg.f1 - seg.f0} 帧，用时 ${((Date.now() - t0) / 1000).toFixed(1)} 秒`);
    }
    await page.close();
  };
  await Promise.all(Array.from({ length: WORKERS }, worker));
  await browser.close(); srv.close();
  if (errors.length) throw new Error('页面错误：\n' + [...new Set(errors)].join('\n'));
  const list = path.join(partDir, 'concat.txt');
  fs.writeFileSync(list, segs.map(s => `file 'p${String(s.i).padStart(2, '0')}.mp4'`).join('\n') + '\n');
  const finalFile = path.join(outDir, name + '.mp4');
  await waitExit(ffmpeg(['-y', '-f', 'concat', '-safe', '0', '-i', list, '-c', 'copy', '-movflags', '+faststart', finalFile]), 'concat');
  console.log('完成：' + finalFile);
})().catch(e => { console.error(e); process.exit(1); });
