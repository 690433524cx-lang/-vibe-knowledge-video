// 只重渲一段并接回成片：node tools/patch.js 起始秒 结束秒（起始秒需落在关键帧上，即 2 的倍数；结束秒为片尾）
const { spawn, spawnSync } = require('child_process');
const fs = require('fs'), path = require('path');
const { openBrowser, openPage } = require('./page');
(async () => {
  const [a, b] = process.argv.slice(2).map(Number), fps = 30;
  const out = path.resolve(__dirname, '../../../out/嫉妒_长版.mp4'), dir = path.dirname(out);
  const seg = path.join(dir, '.patch_seg.mp4'), head = path.join(dir, '.patch_head.mp4'), list = path.join(dir, '.patch.txt'), tmpOut = path.join(dir, '.patch_out.mp4');
  const { srv, url, browser } = await openBrowser();
  const page = await openPage(browser, url, false);
  const proc = spawn('ffmpeg', ['-y', '-f', 'image2pipe', '-framerate', '30', '-c:v', 'mjpeg', '-i', '-', '-c:v', 'libx264', '-preset', 'medium', '-crf', '20', '-pix_fmt', 'yuv420p', '-r', '30', '-g', '60', seg], { stdio: ['pipe', 'ignore', 'ignore'] });
  for (let f = Math.round(a * fps); f < Math.round(b * fps); f++) {
    const u = await page.evaluate(fr => { window.render(fr / 30); return document.getElementById('out').toDataURL('image/jpeg', 0.94); }, f);
    if (!proc.stdin.write(Buffer.from(u.slice(u.indexOf(',') + 1), 'base64'))) await new Promise(r => proc.stdin.once('drain', r));
  }
  proc.stdin.end(); await new Promise(r => proc.on('close', r));
  await browser.close(); srv.close();
  spawnSync('ffmpeg', ['-v', 'error', '-y', '-i', out, '-frames:v', String(Math.round(a * fps)), '-c', 'copy', head]);
  fs.writeFileSync(list, `file '${head}'\nfile '${seg}'\n`);
  spawnSync('ffmpeg', ['-v', 'error', '-y', '-f', 'concat', '-safe', '0', '-i', list, '-c', 'copy', '-movflags', '+faststart', tmpOut]);
  const n = spawnSync('ffprobe', ['-v', 'error', '-count_frames', '-select_streams', 'v', '-show_entries', 'stream=nb_read_frames', '-of', 'csv=p=0', tmpOut]).stdout.toString().trim();
  console.log('拼接后帧数', n);
  if (Number(n) !== Math.round(b * fps)) { console.error('帧数不对，未替换'); process.exit(1); }
  fs.renameSync(tmpOut, out);
  for (const f of [seg, head, list]) fs.rmSync(f, { force: true });
  console.log('已替换', out);
})().catch(e => { console.error(e); process.exit(1); });
