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
const ev = JSON.parse(fs.readFileSync(path.join(dir, `${ep}_觉醒_events.json`)));
const bt = JSON.parse(fs.readFileSync(path.join(__dirname, 'beats.json')));
const grid = []; for (const b of bt.beats) for (let k = 0; k < 4; k++) grid.push(b + k * bt.beat / 4);
let maxE = 0; const evRows = [];
for (const e of ev.events) { const d = Math.min(...grid.map(g => Math.abs(g - e.music))); maxE = Math.max(maxE, d); const onDown = Math.min(...bt.downbeats.map(g => Math.abs(g - e.music))); evRows.push(`   ${e.name.padEnd(6, '　')} 音乐 ${e.music.toFixed(3)}s  离拍点 ${(d * 1000).toFixed(0)}ms${onDown < 0.04 ? '（小节第一拍）' : ''}`); }
rows.push(`4. 事件对齐拍点：最大误差 ${(maxE * 1000).toFixed(0)}ms ${maxE < 0.04 ? '✓' : '✗'}`, ...evRows); if (maxE >= 0.04) fail.push(4);
(async () => {
  const { srv, url, browser } = await openBrowser();
  const over = [];
  for (const [mode, ts] of [['video', [2.2, 2.6, 2.95]], ['still', [0]], ['card', [0]]]) {
    const page = await openPage(browser, url, `ep=${ep}&mode=${mode}`);
    for (const t of ts) {
      const L = await page.evaluate(t => { window.render(t); return window.LAST; }, t);
      const F = L.face, eyeHit = b => L.face.eyes.some(([x, y]) => x > b.x0 - 20 && x < b.x1 + 20 && y > b.y0 - 20 && y < b.y1 + 20);
      for (const b of L.boxes) { const hit = b.x0 < F.x1 && b.x1 > F.x0 && b.y0 < F.y1 && b.y1 > F.y0; if (hit || eyeHit(b)) over.push(`${mode}@${t} ${b.label}`); }
      rows.push(`   ${mode}@${t}：脸框 x ${F.x0.toFixed(0)}–${F.x1.toFixed(0)} y ${F.y0.toFixed(0)}–${F.y1.toFixed(0)}；文字框 ${L.boxes.length} 个`);
    }
    await page.close();
  }
  await browser.close(); srv.close();
  rows.splice(2, 0, `3. 文字不压眼睛和脸：${over.length ? '✗ ' + over.join('，') : '✓'}`); if (over.length) fail.push(3);
  const txt = `# ${ep} 质量检查\n\n` + rows.join('\n') + `\n\n结果：${fail.length ? '未通过 ' + fail.join(',') : '全部通过'}\n`;
  fs.writeFileSync(path.join(dir, 'qa.md'), txt); console.log(txt);
})();
