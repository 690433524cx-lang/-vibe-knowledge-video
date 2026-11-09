// 质量检查（SERIES.md 第 8 节）：node qa.js <动物>
// 1 每帧亮度 > 240 的像素 ≤ 0.5%   2 任意 0.5 秒内画面有明显变化   3 文字不压眼睛和脸（静帧、收藏卡、视频若干帧）
// 4 事件对齐拍点（误差 < 0.04 秒，拍点网格含十六分音符）
const fs = require('fs'), path = require('path'), { spawnSync } = require('child_process');
const { openBrowser, openPage } = require('./tools/page');
const ep = process.argv[2] || 'wolf';
const dir = path.resolve(__dirname, '../../output/beast', ep);
const video = path.join(dir, `${ep}_觉醒.mp4`);
const W = 480, H = 270, rows = [], fail = [];
const raw = spawnSync('ffmpeg', ['-v', 'error', '-i', video, '-vf', `scale=${W}:${H}`, '-f', 'rawvideo', '-pix_fmt', 'gray', '-'], { maxBuffer: 1 << 30 }).stdout;
const full = spawnSync('ffmpeg', ['-v', 'error', '-i', video, '-f', 'rawvideo', '-pix_fmt', 'gray', '-'], { maxBuffer: 2 ** 31 }).stdout;
const FS = 1920 * 1080, n = full.length / FS;
let worst = 0, worstF = 0;
for (let f = 0; f < n; f++) { let c = 0; for (let i = f * FS; i < (f + 1) * FS; i++) if (full[i] > 240) c++; const r = c / FS; if (r > worst) { worst = r; worstF = f; } }
rows.push(`1. 亮度 > 240 的像素：最多 ${(worst * 100).toFixed(3)}%（第 ${worstF} 帧） ${worst <= 0.005 ? '✓' : '✗'}`); if (worst > 0.005) fail.push(1);
const fsz = W * H; let minD = 1e9, minF = 0;
// 明显变化：0.5 秒前后亮度差 > 12 的像素至少占 0.1%（眼睛、局部的变化也算）
for (let f = 0; f + 15 < n; f++) { let d = 0; for (let i = 0; i < fsz; i++) if (Math.abs(raw[f * fsz + i] - raw[(f + 15) * fsz + i]) > 12) d++; d /= fsz; if (d < minD) { minD = d; minF = f; } }
rows.push(`2. 0.5 秒内的画面变化：明显变化的像素最少占 ${(minD * 100).toFixed(2)}%（第 ${minF} 帧起），阈值 0.1% ${minD >= 0.001 ? '✓' : '✗'}`); if (minD < 0.001) fail.push(2);
{ // 首尾一致：最后一帧接回第 0 帧的变化，不应超过正常相邻两帧之间的变化（画面里有持续的缓慢运动，比如旋转的粒子环）
  const cmp = (fa, fb) => { let d = 0, big = 0; for (let i = 0; i < fsz; i++) { const v = Math.abs(raw[fa * fsz + i] - raw[fb * fsz + i]); d += v; if (v > 24) big++; } return [d / fsz, big / fsz]; };
  const [d, big] = cmp(n - 1, 0), [d01, big01] = cmp(0, 1), [d12, big12] = cmp(1, 2);
  const lim = Math.max(0.003, 1.5 * Math.max(big01, big12)), ok = d < 2 && big <= lim;
  rows.push(`5. 首尾帧一致：最后一帧→第 0 帧 平均差 ${d.toFixed(2)}、大差像素 ${(big * 100).toFixed(2)}%；正常相邻帧（0→1、1→2）大差像素 ${(big01 * 100).toFixed(2)}%、${(big12 * 100).toFixed(2)}%（阈值：平均差 < 2，大差像素 ≤ max(0.3%, 1.5 × 相邻帧)） ${ok ? '✓' : '✗'}`); if (!ok) fail.push(5); }
const ev = JSON.parse(fs.readFileSync(path.join(dir, `${ep}_觉醒_events.json`)));
const bt = JSON.parse(fs.readFileSync(path.join(__dirname, 'beats.json')));
const grid = []; for (let k = -40; k < 80; k++) grid.push(bt.awake_attack + k * bt.beat / 4);   // 起音实测的十六分音符网格
let maxE = 0; const evRows = [];
for (const e of ev.events) { const d = Math.min(...grid.map(g => Math.abs(g - e.music))); maxE = Math.max(maxE, d); const onDown = Math.min(...[-1, 0, 1, 2, 3, 4].map(k => Math.abs(bt.awake_attack + k * 4 * bt.beat - e.music))); evRows.push(`   ${e.name.padEnd(6, '　')} 音乐 ${e.music.toFixed(3)}s  离拍点 ${(d * 1000).toFixed(0)}ms${onDown < 0.04 ? '（小节第一拍）' : ''}`); }
rows.push(`4. 事件对齐拍点：最大误差 ${(maxE * 1000).toFixed(0)}ms ${maxE < 0.04 ? '✓' : '✗'}`, ...evRows); if (maxE >= 0.04) fail.push(4);
(async () => {
  const { srv, url, browser } = await openBrowser();
  const over = [];
  const T = JSON.parse(fs.readFileSync(path.join(dir, `${ep}_觉醒_events.json`))).events;
  const vts = [0, 0.7, 1.6, 2.5, 3.2, 3.7, 4.5, 5.0, 5.25, 5.6, 6.4, 7.2, 8.2, 8.7, 9.2, 9.6, 9.95];
  for (const [mode, ts] of [['video', vts], ['still', [0]], ['card', [0]]]) {
    const page = await openPage(browser, url, `ep=${ep}&mode=${mode}`);
    for (const t of ts) {
      const L = await page.evaluate(t => { window.render(t); return window.LAST; }, t);
      const hit = (b, r) => r.circle ? (() => { const [cx, cy, rr] = r.circle; const nx = Math.max(b.x0, Math.min(cx, b.x1)), ny = Math.max(b.y0, Math.min(cy, b.y1)); return Math.hypot(nx - cx, ny - cy) < rr; })() : b.x0 < r.x1 && b.x1 > r.x0 && b.y0 < r.y1 && b.y1 > r.y0;
      for (const b of L.boxes) { if (b.label === 'logo' || b.label === 'label') continue; for (const r of L.avoid) { if (hit(b, r)) over.push(`${mode}@${t}「${b.label}」压到${r.label}`); } }
    }
    await page.close();
  }
  await browser.close(); srv.close();
  rows.splice(2, 0, `3. 文字不压狼的脸、身体和月亮：${over.length ? '✗ ' + over.join('，') : '✓'}`); if (over.length) fail.push(3);
  const txt = `# ${ep} 质量检查\n\n` + rows.join('\n') + `\n\n结果：${fail.length ? '未通过 ' + fail.join(',') : '全部通过'}\n`;
  fs.writeFileSync(path.join(dir, 'qa.md'), txt); console.log(txt);
})();
