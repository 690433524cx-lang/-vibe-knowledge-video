// 渲染：node src/render.js --from 0 --to 20 --out output/sample.mp4 [--T 52.37] [--music path] [--workers 4]
//
// 视频：逐帧 RGBA → ffmpeg（H.264 / yuv420p / 30fps / 1920×1080）
// 音频：代码合成的音效；若提供 --music（《千年之后》），按 --music-offset 对齐后混入。
const { spawn, execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const { W, H, FPS, T, END } = require('./config');
const { renderFrame, makeCanvas } = require('./frame');
const { mixSfx, writeWav } = require('./audio');

function arg(name, def) {
  const i = process.argv.indexOf(name);
  return i >= 0 ? process.argv[i + 1] : def;
}
const from = parseFloat(arg('--from', '0'));
const to = parseFloat(arg('--to', String(END)));
const out = arg('--out', 'output/render.mp4');
const music = arg('--music');
const musicOffset = parseFloat(arg('--music-offset', '0'));
const crf = arg('--crf', '17');
const workers = parseInt(arg('--workers', '1'), 10);
const segOut = arg('--segment-out');

fs.mkdirSync(path.dirname(out), { recursive: true });
const tmpVideo = out.replace(/\.mp4$/, '.video.mp4');
const tmpAudio = out.replace(/\.mp4$/, '.sfx.wav');

// 多进程：把帧区间切成几段，各自编码，再无损拼接
async function renderParallel(f0, f1) {
  const n = Math.max(1, Math.min(workers, f1 - f0));
  const pass = [];
  for (let i = 2; i < process.argv.length; i++) {
    const a = process.argv[i];
    if (['--workers', '--out', '--from', '--to', '--music', '--music-offset'].includes(a)) { i++; continue; }
    pass.push(a);
  }
  const segs = [];
  const jobs = [];
  for (let k = 0; k < n; k++) {
    const a = f0 + Math.floor(((f1 - f0) * k) / n), b = f0 + Math.floor(((f1 - f0) * (k + 1)) / n);
    const seg = out.replace(/\.mp4$/, `.seg${k}.mp4`);
    segs.push(seg);
    jobs.push(new Promise((res, rej) => {
      const p = spawn(process.execPath, [__filename, ...pass, '--f0', String(a), '--f1', String(b), '--segment-out', seg],
        { stdio: ['ignore', k === 0 ? 'inherit' : 'ignore', 'inherit'], env: process.env });
      p.on('close', (code) => (code === 0 ? res() : rej(new Error(`segment ${k} failed`))));
    }));
  }
  await Promise.all(jobs);
  const list = out.replace(/\.mp4$/, '.segs.txt');
  fs.writeFileSync(list, segs.map((f) => `file '${path.resolve(f)}'`).join('\n'));
  execFileSync('ffmpeg', ['-loglevel', 'error', '-y', '-f', 'concat', '-safe', '0', '-i', list, '-c', 'copy', tmpVideo], { stdio: 'inherit' });
  for (const f of [...segs, list]) fs.unlinkSync(f);
}

async function renderRange(f0, f1, file) {
  const ff = spawn('ffmpeg', ['-loglevel', 'error', '-y',
    '-f', 'rawvideo', '-pix_fmt', 'rgba', '-s', `${W}x${H}`, '-r', String(FPS), '-i', '-',
    '-c:v', 'libx264', '-preset', 'slow', '-crf', crf, '-pix_fmt', 'yuv420p', '-r', String(FPS),
    '-movflags', '+faststart', file], { stdio: ['pipe', 'inherit', 'inherit'] });
  const [canvas, ctx] = makeCanvas();
  const t0 = Date.now();
  for (let f = f0; f < f1; f++) {
    renderFrame(ctx, f / FPS, f);
    const data = canvas.data();
    if (!ff.stdin.write(data)) await new Promise((r) => ff.stdin.once('drain', r));
    if ((f - f0) % 90 === 0) {
      const done = f - f0 + 1, fps = done / ((Date.now() - t0) / 1000);
      console.log(`  frame ${f}  (${(f / FPS).toFixed(1)}s)  ${fps.toFixed(1)} fps`);
    }
  }
  ff.stdin.end();
  await new Promise((r) => ff.on('close', r));
}

async function main() {
  if (segOut) {
    await renderRange(parseInt(arg('--f0'), 10), parseInt(arg('--f1'), 10), segOut);
    return;
  }
  const f0 = Math.round(from * FPS), f1 = Math.round(to * FPS);
  console.log(`T=${T}s END=${END}s  frames ${f0}..${f1 - 1}  workers ${workers}`);
  const t0 = Date.now();
  if (workers > 1) await renderParallel(f0, f1);
  else await renderRange(f0, f1, tmpVideo);

  writeWav(tmpAudio, mixSfx(from, to));
  const dur = (f1 - f0) / FPS;
  const a = ['-loglevel', 'error', '-y', '-i', tmpVideo, '-i', tmpAudio];
  if (music) {
    // 音乐从真实时间 musicOffset 处对齐到画面 0 秒
    a.push('-ss', String(from + musicOffset), '-i', music,
      '-filter_complex', `[2:a]atrim=0:${dur},asetpts=PTS-STARTPTS,volume=0.9[m];[1:a][m]amix=inputs=2:normalize=0[a]`,
      '-map', '0:v', '-map', '[a]');
  } else {
    a.push('-map', '0:v', '-map', '1:a');
  }
  a.push('-c:v', 'copy', '-c:a', 'aac', '-b:a', '256k', '-t', String(dur), '-movflags', '+faststart', out);
  execFileSync('ffmpeg', a, { stdio: 'inherit' });
  fs.unlinkSync(tmpVideo);
  fs.unlinkSync(tmpAudio);
  console.log(`done → ${out}  (${((Date.now() - t0) / 1000).toFixed(0)}s)`);
}
main();
