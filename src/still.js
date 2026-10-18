// 导出关键帧：node src/still.js out_dir 2 6 10 …（秒，真实时间）
const fs = require('fs');
const path = require('path');
const { renderFrame, makeCanvas, FPS } = require('./frame');

const [outDir, ...times] = process.argv.slice(2).filter((a, i, arr) => !a.startsWith('--') && !(arr[i - 1] || '').startsWith('--'));
fs.mkdirSync(outDir, { recursive: true });
const [canvas, ctx] = makeCanvas();
for (const s of times) {
  const t = parseFloat(s);
  const f = Math.round(t * FPS);
  renderFrame(ctx, f / FPS, f);
  const file = path.join(outDir, `frame_${t.toFixed(2).padStart(6, '0')}s.jpg`);
  fs.writeFileSync(file, canvas.toBuffer('image/jpeg', 92));
  console.log(file);
}
