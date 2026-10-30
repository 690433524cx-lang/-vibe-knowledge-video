// 分段渲染《七宗罪·嫉妒》横屏长版，并拼接成一个完整的 MP4（1920×1080，30fps，H.264 yuv420p，无声）。
// 用法：node render.js [--preview]    --preview：960×540、15fps，输出 out/preview/嫉妒_长版_预览.mp4
// 分段只是内部的临时文件：拼接并校验成功后自动删除。
const { spawn, spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const { openBrowser, openPage } = require('./tools/page');

const WORKERS = 3, ROOT = path.resolve(__dirname, '../..');
function ffmpeg(args, stdin = false) { return spawn('ffmpeg', args, { stdio: [stdin ? 'pipe' : 'ignore', 'ignore', 'pipe'] }); }
function waitExit(proc, label) {
  let err = '';
  proc.stderr.on('data', d => { err += d; if (err.length > 20000) err = err.slice(-20000); });
  return new Promise((res, rej) => proc.on('close', code => (code === 0 ? res() : rej(new Error(`${label} 退出码 ${code}\n${err.slice(-2000)}`)))));
}
(async () => {
  const preview = process.argv.includes('--preview');
  const fps = preview ? 15 : 30;
  const outDir = preview ? path.join(ROOT, 'out/preview') : path.join(ROOT, 'out');
  const name = preview ? '嫉妒_长版_预览' : '嫉妒_长版';
  const tmpDir = path.join(outDir, '.tmp_' + name);
  fs.mkdirSync(tmpDir, { recursive: true });
  const { srv, url, browser } = await openBrowser();
  const errors = [];
  const total = 84 * fps, nSeg = 21;
  const segs = Array.from({ length: nSeg }, (_, i) => ({ i: i + 1, f0: Math.round(total * i / nSeg), f1: Math.round(total * (i + 1) / nSeg) }));
  const queue = segs.slice();
  const worker = async () => {
    const page = await openPage(browser, url, preview, errors);
    while (queue.length) {
      const seg = queue.shift();
      const done = path.join(tmpDir, `p${String(seg.i).padStart(2, '0')}.mp4`), tmp = done.replace('.mp4', '.part.mp4');
      if (fs.existsSync(done)) continue;
      const proc = ffmpeg(['-y', '-f', 'image2pipe', '-framerate', String(fps), '-c:v', 'mjpeg', '-i', '-',
        '-c:v', 'libx264', '-preset', preview ? 'ultrafast' : 'medium', '-crf', preview ? '24' : '20', '-pix_fmt', 'yuv420p', '-r', String(fps), '-g', String(fps * 2), tmp], true);
      const exit = waitExit(proc, `p${seg.i}`);
      const t0 = Date.now();
      for (let f = seg.f0; f < seg.f1; f++) {
        const u = await page.evaluate(([fr, fps]) => { window.render(fr / fps); return document.getElementById('out').toDataURL('image/jpeg', 0.94); }, [f, fps]);
        const buf = Buffer.from(u.slice(u.indexOf(',') + 1), 'base64');
        if (!proc.stdin.write(buf)) await new Promise(r => proc.stdin.once('drain', r));
      }
      proc.stdin.end(); await exit; fs.renameSync(tmp, done);
      console.log(`p${seg.i} 完成：${seg.f1 - seg.f0} 帧，${((Date.now() - t0) / 1000).toFixed(0)} 秒`);
    }
    await page.close();
  };
  await Promise.all(Array.from({ length: WORKERS }, worker));
  await browser.close(); srv.close();
  if (errors.length) throw new Error('页面错误：\n' + [...new Set(errors)].join('\n'));
  const list = path.join(tmpDir, 'concat.txt');
  fs.writeFileSync(list, segs.map(s => `file 'p${String(s.i).padStart(2, '0')}.mp4'`).join('\n') + '\n');
  const finalFile = path.join(outDir, name + '.mp4');
  await waitExit(ffmpeg(['-y', '-f', 'concat', '-safe', '0', '-i', list, '-c', 'copy', '-movflags', '+faststart', finalFile]), 'concat');
  // 校验：时长、帧数、分辨率
  const pr = spawnSync('ffprobe', ['-v', 'error', '-count_frames', '-select_streams', 'v', '-show_entries', 'stream=nb_read_frames,width,height,r_frame_rate,pix_fmt,codec_name', '-show_entries', 'format=duration', '-of', 'json', finalFile]).stdout.toString();
  const j = JSON.parse(pr), st = j.streams[0];
  const ok = st.nb_read_frames == total && Math.abs(Number(j.format.duration) - 84) < 0.05 && st.width == (preview ? 960 : 1920) && st.height == (preview ? 540 : 1080) && st.pix_fmt === 'yuv420p';
  console.log(`校验：${st.width}×${st.height} ${st.r_frame_rate} ${st.codec_name} ${st.pix_fmt}，${st.nb_read_frames} 帧，${Number(j.format.duration).toFixed(3)} 秒 → ${ok ? '通过' : '不通过'}`);
  if (!ok) process.exit(1);
  fs.rmSync(tmpDir, { recursive: true, force: true });
  console.log('完成：' + finalFile + '（分段已删除）');
})().catch(e => { console.error(e); process.exit(1); });
