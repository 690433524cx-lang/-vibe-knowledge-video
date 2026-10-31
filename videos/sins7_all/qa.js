// 成片检查：node qa.js 视频.mp4
// 1) 亮度：任何一帧平均亮度不超过 190；平均亮度超过 160 的帧不能连续超过 3 帧
// 2) 静止检测：任意 0.5 秒窗口内，画面都要有可见变化（窗口首帧与窗口内任一帧相比，变化超过 10 级灰度的像素 ≥ 0.5%）
const { spawnSync } = require('child_process');
const file = process.argv[2];
if (!file) { console.error('用法：node qa.js 视频.mp4'); process.exit(2); }
const W = 320, H = 180, FPS = 30;
const r = spawnSync('ffmpeg', ['-v', 'error', '-i', file, '-vf', `fps=${FPS},scale=${W}:${H}:flags=area,format=gray`, '-f', 'rawvideo', '-'], { maxBuffer: 1 << 30 });
if (r.status !== 0) { console.error(String(r.stderr)); process.exit(2); }
const buf = r.stdout, N = Math.floor(buf.length / (W * H)), P = W * H;
const frame = i => buf.subarray(i * P, (i + 1) * P);
const mean = new Float64Array(N);
for (let i = 0; i < N; i++) { const f = frame(i); let s = 0; for (let k = 0; k < P; k++) s += f[k]; mean[i] = s / P; }
// ---- 亮度
let maxMean = 0, maxAt = 0, run = 0, maxRun = 0, runAt = 0;
for (let i = 0; i < N; i++) {
  if (mean[i] > maxMean) { maxMean = mean[i]; maxAt = i; }
  run = mean[i] > 160 ? run + 1 : 0; if (run > maxRun) { maxRun = run; runAt = i; }
}
// ---- 静止检测
const changed = (a, b) => { const fa = frame(a), fb = frame(b); let c = 0; for (let k = 0; k < P; k++) if (Math.abs(fa[k] - fb[k]) > 10) c++; return c / P; };
const WIN = Math.round(0.5 * FPS), TH = 0.005;
let worst = 1, worstAt = 0; const still = [];
for (let s = 0; s + WIN < N; s++) {
  let best = 0; for (let k = 1; k <= WIN && best < TH; k++) best = Math.max(best, changed(s, s + k));
  if (best < worst) { worst = best; worstAt = s; }
  if (best < TH) still.push(s);
}
const fmt = i => (i / FPS).toFixed(2) + 's';
const ok1 = maxMean <= 190, ok2 = maxRun <= 3, ok3 = still.length === 0;
console.log(`帧数 ${N}（${(N / FPS).toFixed(2)} 秒）`);
console.log(`[${ok1 ? '通过' : '失败'}] 最亮一帧平均亮度 ${maxMean.toFixed(1)}（${fmt(maxAt)}），上限 190`);
console.log(`[${ok2 ? '通过' : '失败'}] 平均亮度 >160 最多连续 ${maxRun} 帧${maxRun ? '（到 ' + fmt(runAt) + '）' : ''}，上限 3`);
console.log(`[${ok3 ? '通过' : '失败'}] 静止检测：${N - WIN} 个 0.5 秒窗口，最小变化 ${(worst * 100).toFixed(2)}% 像素（窗口起点 ${fmt(worstAt)}），门槛 ${(TH * 100).toFixed(1)}%${still.length ? '；静止窗口起点：' + still.slice(0, 10).map(fmt).join(', ') : ''}`);
process.exit(ok1 && ok2 && ok3 ? 0 : 1);
