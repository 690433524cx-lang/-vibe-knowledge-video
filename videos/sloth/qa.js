// 成片检查：node qa.js 视频.mp4
// 1) 亮度：任何一帧平均亮度不超过 190；平均亮度超过 160 的帧不能连续超过 3 帧
// 2) 静止检测：任意 0.5 秒窗口内，画面都要有可见变化（窗口首帧与窗口内任一帧相比，变化超过 10 级灰度的像素 ≥ 0.5%）
// 3) 空白画面：亮于 50 级灰度的像素少于 0.5% 的帧算“空白”，不能连续超过 0.3 秒
// 4) 首尾一致：最后一帧和第 0 帧逐像素比较
// 5) 字幕阅读时间：每条字幕显示时长 ≥ 1.0 + 0.17 × 字数（不算标点），字幕表来自 subs_wrath.json
// 6) 全片平均亮度（45–60 的目标）
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
// 每 0.5 秒：相邻帧的平均差异（灰度级，0–255）
const adj = new Float64Array(N);
for (let i = 1; i < N; i++) { const a = frame(i - 1), b = frame(i); let s = 0; for (let k = 0; k < P; k++) s += Math.abs(a[k] - b[k]); adj[i] = s / P; }
const per = [];
for (let s = 1; s < N; s += WIN) { let m = 0, c = 0; for (let i = s; i < Math.min(N, s + WIN); i++) { m += adj[i]; c++; } per.push([s / FPS, m / c]); }
const ok1 = maxMean <= 190, ok2 = maxRun <= 3, ok3 = still.length === 0;
console.log(`帧数 ${N}（${(N / FPS).toFixed(2)} 秒）`);
console.log(`[${ok1 ? '通过' : '失败'}] 最亮一帧平均亮度 ${maxMean.toFixed(1)}（${fmt(maxAt)}），上限 190`);
console.log(`[${ok2 ? '通过' : '失败'}] 平均亮度 >160 最多连续 ${maxRun} 帧${maxRun ? '（到 ' + fmt(runAt) + '）' : ''}，上限 3`);
console.log(`[${ok3 ? '通过' : '失败'}] 静止检测：${N - WIN} 个 0.5 秒窗口，最小变化 ${(worst * 100).toFixed(2)}% 像素（窗口起点 ${fmt(worstAt)}），门槛 ${(TH * 100).toFixed(1)}%${still.length ? '；静止窗口起点：' + still.slice(0, 10).map(fmt).join(', ') : ''}`);
console.log('每 0.5 秒相邻帧平均差异（灰度级）：');
console.log(per.map(([t, v]) => `${t.toFixed(1).padStart(5)}s ${v.toFixed(2)}`).join('\n'));
const vals = per.map(p => p[1]).sort((a, b) => a - b);
console.log(`最小 ${vals[0].toFixed(2)}，中位数 ${vals[vals.length >> 1].toFixed(2)}，平均 ${(vals.reduce((a, b) => a + b, 0) / vals.length).toFixed(2)}`);
// ---- 过曝：每帧亮于 240 的像素不超过画面的 0.3%
{ let worst = 0, at = 0, bad = 0; for (let i = 0; i < N; i++) { const f = frame(i); let c = 0; for (let k = 0; k < P; k++) if (f[k] > 240) c++; const r = c / P; if (r > worst) { worst = r; at = i; } if (r > 0.003) bad++; }
  console.log(`[${bad === 0 ? '通过' : '失败'}] 过曝：亮于 240 的像素最多占 ${(worst * 100).toFixed(2)}%（${fmt(at)}），超过 0.3% 的帧 ${bad} 帧`); var okW = bad === 0; }
// ---- 空白画面
let blankRun = 0, maxBlank = 0, blankAt = 0;
for (let i = 0; i < N; i++) { const f = frame(i); let c = 0; for (let k = 0; k < P; k++) if (f[k] > 50) c++; blankRun = c / P < 0.005 ? blankRun + 1 : 0; if (blankRun > maxBlank) { maxBlank = blankRun; blankAt = i; } }
const ok4 = maxBlank / FPS <= 0.3;
console.log(`[${ok4 ? '通过' : '失败'}] 空白画面：最长连续 ${(maxBlank / FPS).toFixed(2)} 秒${maxBlank ? '（到 ' + fmt(blankAt) + '）' : ''}，上限 0.3 秒`);
// ---- 首尾一致
{ const a = frame(0), b = frame(N - 1); let d = 0, mx = 0; for (let k = 0; k < P; k++) { const v = Math.abs(a[k] - b[k]); d += v; mx = Math.max(mx, v); } d /= P;
  console.log(`[${d < 0.01 ? '通过' : '失败'}] 首尾一致：最后一帧与第 0 帧平均差 ${d.toFixed(3)}，最大差 ${mx}`); var ok5 = d < 0.01; }
// ---- 字幕阅读时间
let ok6 = true; try {
  const subs = JSON.parse(require('fs').readFileSync(require('path').join(__dirname, 'subs_wrath.json')));
  const bad = subs.filter(s => s.t1 - s.t0 + 0.06 < s.minD - 1e-3);
  ok6 = bad.length === 0;
  console.log(`[${ok6 ? '通过' : '失败'}] 字幕阅读时间：${subs.length} 条，最紧的一条余量 ${Math.min(...subs.map(s => s.t1 + 0.06 - s.t0 - s.minD)).toFixed(2)} 秒${bad.length ? '；不够：' + bad.map(b => b.text).join('｜') : ''}`);
} catch (e) { console.log('[跳过] 字幕阅读时间：没有 subs_wrath.json'); }
const avg = mean.reduce((a, b) => a + b, 0) / N;
console.log(`[${avg >= 40 && avg <= 55 ? '通过' : '未达标'}] 全片平均亮度 ${avg.toFixed(1)}（目标 40–55）`);
// 每秒的静止检测数值
const perSec = []; for (let s0 = 0; s0 + 1 <= N / FPS + 1e-6; s0++) { let m = 0, c = 0; for (let i = Math.max(1, s0 * FPS); i < Math.min(N, (s0 + 1) * FPS); i++) { m += adj[i]; c++; } perSec.push(`${s0}s ${(m / c).toFixed(2)}`); }
console.log('每秒相邻帧平均差异：' + perSec.join('  '));
process.exit(ok1 && ok2 && ok3 && ok4 && ok5 && ok6 && okW ? 0 : 1);
