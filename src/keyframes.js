// 导出检查用关键帧（真实时间，随 T / END 自动计算），并拼一张总览图。
// node src/keyframes.js output/keyframes_full [--T 52.37]
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const { T, END, FPS } = require('./config');
const { renderFrame, makeCanvas } = require('./frame');

const outDir = process.argv[2] || 'output/keyframes_full';
fs.mkdirSync(outDir, { recursive: true });
const last = (Math.round(END * FPS) - 1) / FPS;
const points = [
  ['02s', 2], ['06s', 6], ['10s', 10], ['15s', 15], ['19s', 19], ['30s', 30], ['40s', 40],
  ['T-1.0', T - 1], ['T-0.2', T - 0.2], ['T', T], ['T+1.0', T + 1],
  ['T+8', T + 8], ['T+20', T + 20], ['70s', 70], ['75s', 75], ['85s', 85],
  ['ending', END - 3], ['last', last],
];
const [canvas, ctx] = makeCanvas();
const files = [];
points.forEach(([name, t], i) => {
  const f = Math.ceil(t * FPS - 1e-6);
  renderFrame(ctx, f / FPS, f);
  const file = path.join(outDir, `${String(i + 1).padStart(2, '0')}_${name}_${(f / FPS).toFixed(2)}s.jpg`);
  fs.writeFileSync(file, canvas.toBuffer('image/jpeg', 90));
  files.push(file);
  console.log(file);
});
// 总览：每行 3 张
const inputs = files.flatMap((f) => ['-i', f]);
const n = files.length;
const filter = files.map((_, i) => `[${i}:v]scale=640:360,drawtext=text='${points[i][0]}':x=12:y=12:fontsize=24:fontcolor=white:box=1:boxcolor=black@0.5[v${i}]`).join(';')
  + ';' + files.map((_, i) => `[v${i}]`).join('') + `xstack=inputs=${n}:layout=` +
  files.map((_, i) => `${(i % 3) * 640}_${Math.floor(i / 3) * 360}`).join('|') + '[out]';
execFileSync('ffmpeg', ['-loglevel', 'error', '-y', ...inputs, '-filter_complex', filter, '-map', '[out]', '-frames:v', '1', path.join(outDir, '00_contact_sheet.jpg')]);
console.log(path.join(outDir, '00_contact_sheet.jpg'));
