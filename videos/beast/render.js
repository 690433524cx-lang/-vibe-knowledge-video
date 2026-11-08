// 出片：node render.js <动物> [秒数=3.0]   觉醒片段，配上音乐（觉醒时刻对准 episode.music.hit 那个小节第一拍）
// 输出 output/beast/<动物>/<动物>_觉醒.mp4
const { spawn, spawnSync } = require('child_process');
const fs = require('fs'), path = require('path');
const { openBrowser, openPage } = require('./tools/page');
(async () => {
  const [ep = 'wolf', secs = '3.0'] = process.argv.slice(2);
  const FPS = 30, n = Math.round(Number(secs) * FPS);
  const outDir = path.resolve(__dirname, '../../output/beast', ep); fs.mkdirSync(outDir, { recursive: true });
  const { srv, url, browser } = await openBrowser(); const errors = [];
  const page = await openPage(browser, url, `ep=${ep}&mode=video`, errors);
  const meta = await page.evaluate(() => ({ start: window.META.start, music: window.META.music, events: window.META.events }));
  const silent = path.join(outDir, `_${ep}_silent.mp4`), out = path.join(outDir, `${ep}_觉醒.mp4`);
  const ff = spawn('ffmpeg', ['-v', 'error', '-y', '-f', 'image2pipe', '-framerate', String(FPS), '-c:v', 'mjpeg', '-i', '-', '-c:v', 'libx264', '-preset', 'medium', '-crf', '16', '-pix_fmt', 'yuv420p', silent], { stdio: ['pipe', 'inherit', 'inherit'] });
  const done = new Promise((res, rej) => ff.on('close', c => c === 0 ? res() : rej(new Error('ffmpeg ' + c))));
  const t0 = Date.now();
  for (let f = 0; f < n; f++) {
    const b64 = await page.evaluate(t => { window.render(t); return document.getElementById('out').toDataURL('image/jpeg', 0.96); }, f / FPS);
    if (!ff.stdin.write(Buffer.from(b64.split(',')[1], 'base64'))) await new Promise(r => ff.stdin.once('drain', r));
  }
  ff.stdin.end(); await done; await browser.close(); srv.close();
  const dur = n / FPS, st = meta.start;
  const af = `atrim=start=${st.toFixed(4)}:end=${(st + dur).toFixed(4)},asetpts=PTS-STARTPTS,afade=t=in:d=0.02,afade=t=out:st=${(dur - 0.25).toFixed(3)}:d=0.25`;
  const r = spawnSync('ffmpeg', ['-v', 'error', '-y', '-i', silent, '-i', path.join(__dirname, meta.music.file), '-filter_complex', `[1:a]${af}[a]`, '-map', '0:v', '-map', '[a]', '-c:v', 'copy', '-c:a', 'aac', '-b:a', '192k', '-t', dur.toFixed(3), '-movflags', '+faststart', out], { stdio: 'inherit' });
  if (r.status !== 0) throw new Error('合成失败');
  fs.rmSync(silent);
  fs.writeFileSync(path.join(outDir, `${ep}_觉醒_events.json`), JSON.stringify({ start: st, events: meta.events.map(e => ({ ...e, music: +(e.a + st).toFixed(4) })) }, null, 1));
  console.log(out, `${n} 帧，${((Date.now() - t0) / 1000).toFixed(0)} 秒`);
  if (errors.length) { console.error('页面错误：\n' + [...new Set(errors)].join('\n')); process.exit(1); }
})().catch(e => { console.error(e); process.exit(1); });
