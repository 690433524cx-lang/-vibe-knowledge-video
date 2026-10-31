// 渲染：node render.js [--from=秒] [--to=秒] [--name=文件名] [--upto=N] [--jobs=4] [--preview]
// 分段并行：每段一个无头 Chromium，JPEG 帧通过管道送给 ffmpeg（libx264 crf 18）；再 concat 拼接，配上原始立体声音乐
// 音频：从第 0 秒开始、不偏移；loudnorm 到约 −14 LUFS；最后 0.8 秒淡出；AAC 192 kbps。拼完删掉分段。
const { spawn, spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const { openBrowser, openPage } = require('./tools/page');
const arg = (k, d) => { const a = process.argv.find(x => x.startsWith(`--${k}=`)); return a ? a.split('=')[1] : d; };
const ROOT = path.resolve(__dirname, '../..');
const FPS = 30, preview = process.argv.includes('--preview');

async function segment(i, f0, f1, file, upto) {
  const { srv, url, browser } = await openBrowser();
  const errors = [];
  const page = await openPage(browser, url, preview, errors, upto);
  const ff = spawn('ffmpeg', ['-v', 'error', '-y', '-f', 'image2pipe', '-framerate', String(FPS), '-c:v', 'mjpeg', '-i', '-', '-c:v', 'libx264', '-preset', 'medium', '-crf', '18', '-pix_fmt', 'yuv420p', file], { stdio: ['pipe', 'inherit', 'inherit'] });
  const done = new Promise((res, rej) => ff.on('close', c => c === 0 ? res() : rej(new Error('ffmpeg ' + c))));
  for (let f = f0; f < f1; f++) {
    const b64 = await page.evaluate(t => { window.render(t); return document.getElementById('out').toDataURL('image/jpeg', 0.95); }, f / FPS);
    if (!ff.stdin.write(Buffer.from(b64.split(',')[1], 'base64'))) await new Promise(r => ff.stdin.once('drain', r));
    if ((f - f0) % 60 === 0) console.log(`段 ${i}: ${f - f0}/${f1 - f0}`);
  }
  ff.stdin.end(); await done; await browser.close(); srv.close();
  if (errors.length) throw new Error('页面错误：' + [...new Set(errors)].join('\n'));
}

(async () => {
  const beats = JSON.parse(fs.readFileSync(path.join(__dirname, 'beats.json')));
  const from = Number(arg('from', 0)), to = Number(arg('to', beats.end + 0.2));
  const name = arg('name', '七宗罪_总集'), jobs = Number(arg('jobs', 4)), upto = arg('upto');
  const outDir = path.join(ROOT, 'out'), tmp = path.join(outDir, `tmp_${name}`);
  fs.mkdirSync(tmp, { recursive: true });
  const F0 = Math.round(from * FPS), F1 = Math.round(to * FPS), n = F1 - F0, per = Math.ceil(n / jobs);
  const segs = [];
  for (let i = 0; i < jobs; i++) { const a = F0 + i * per, b = Math.min(F1, a + per); if (a < b) segs.push([i, a, b, path.join(tmp, `seg_${i}.mp4`)]); }
  const t0 = Date.now();
  await Promise.all(segs.map(([i, a, b, f]) => segment(i, a, b, f, upto)));
  fs.writeFileSync(path.join(tmp, 'list.txt'), segs.map(s => `file '${s[3]}'`).join('\n'));
  const video = path.join(tmp, 'video.mp4');
  spawnSync('ffmpeg', ['-v', 'error', '-y', '-f', 'concat', '-safe', '0', '-i', path.join(tmp, 'list.txt'), '-c', 'copy', video], { stdio: 'inherit' });
  const dur = n / FPS, out = path.join(outDir, `${name}.mp4`);
  const af = `atrim=start=${from}:end=${to},asetpts=PTS-STARTPTS,loudnorm=I=-14:TP=-1.5:LRA=11,afade=t=out:st=${Math.max(0, dur - 0.8).toFixed(3)}:d=0.8`;
  const r = spawnSync('ffmpeg', ['-v', 'error', '-y', '-i', video, '-i', path.join(__dirname, 'music.wav'), '-filter_complex', `[1:a]${af}[a]`, '-map', '0:v', '-map', '[a]',
    '-c:v', 'copy', '-c:a', 'aac', '-b:a', '192k', '-ar', '44100', '-t', dur.toFixed(3), '-movflags', '+faststart', out], { stdio: 'inherit' });
  if (r.status !== 0) throw new Error('合成失败');
  fs.rmSync(tmp, { recursive: true, force: true });
  const probe = spawnSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration:stream=codec_type,codec_name,width,height,r_frame_rate,channels,sample_rate', '-of', 'compact', out]).stdout.toString();
  console.log(out, '\n' + probe, `用时 ${((Date.now() - t0) / 1000).toFixed(0)} 秒`);
})().catch(e => { console.error(e); process.exit(1); });
