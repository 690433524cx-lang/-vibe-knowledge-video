// 质量检查：node qa.js [--preview] [视频文件]
// 视频：①亮度（平均亮度 < 28 的帧）②鲜艳度（画面中部饱和度 < 0.25）③静止（连续 2 秒以上帧间差 < 1.5，77.4–77.8 的停顿除外）
//       ④首尾帧差 < 4 ⑤色相：每秒抽一帧，发光部分的平均色相必须在绿色范围（70°–175°）
// 页面：⑥字幕时长 ≥ max(2.4, 1.0 + 字数 × 0.17)（汉字计数、标点不计、连续数字算一个字；钩子台词除外）
//       ⑦文字距画面边缘 ≥ 60px、互相不重叠
const { spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const { openBrowser, openPage } = require('./tools/page');

const ROOT = path.resolve(__dirname, '../..');
const SW = 192, SH = 108;
const SAFE = { x0: 60, x1: 1860, y0: 60, y1: 1020 };
function frames(file, fps) {
  const r = spawnSync('ffmpeg', ['-v', 'error', '-i', file, '-vf', `fps=${fps},scale=${SW}:${SH}:flags=area`, '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-'], { maxBuffer: 1 << 30 });
  const n = r.stdout.length / (SW * SH * 3), out = [];
  for (let i = 0; i < n; i++) out.push(r.stdout.subarray(i * SW * SH * 3, (i + 1) * SW * SH * 3));
  return out;
}
function edgeFrame(file, last) {
  const args = last ? ['-v', 'error', '-sseof', '-0.2', '-i', file, '-update', '1'] : ['-v', 'error', '-i', file, '-frames:v', '1'];
  const r = spawnSync('ffmpeg', [...args, '-vf', `scale=${SW * 4}:${SH * 4}:flags=area`, '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-'], { maxBuffer: 1 << 28 });
  const sz = SW * 4 * SH * 4 * 3; return r.stdout.subarray(r.stdout.length - sz);
}
const meanDiff = (a, b) => { let s = 0; for (let i = 0; i < a.length; i++) s += Math.abs(a[i] - b[i]); return s / a.length; };
function stats(buf) {
  let L = 0, S = 0, n = 0, hx = 0, hy = 0, hw = 0;
  for (let y = 0; y < SH; y++) for (let x = 0; x < SW; x++) {
    const i = (y * SW + x) * 3, r = buf[i] / 255, g = buf[i + 1] / 255, b = buf[i + 2] / 255;
    const lum = 0.299 * r + 0.587 * g + 0.114 * b; L += lum * 255;
    const mx = Math.max(r, g, b), mn = Math.min(r, g, b), sat = mx > 0.04 ? (mx - mn) / mx : 0;
    if (x > SW * 0.25 && x < SW * 0.75 && y > SH * 0.25 && y < SH * 0.75) { S += sat; n++; }
    // 发光部分的色相（按亮度与饱和度加权的圆周平均）
    if (lum > 0.22 && mx - mn > 0.05) {
      let h; const d = mx - mn;
      if (mx === r) h = ((g - b) / d) % 6; else if (mx === g) h = (b - r) / d + 2; else h = (r - g) / d + 4;
      h *= 60; const w = lum * (mx - mn);
      hx += Math.cos(h * Math.PI / 180) * w; hy += Math.sin(h * Math.PI / 180) * w; hw += w;
    }
  }
  const hue = hw > 0 ? ((Math.atan2(hy, hx) * 180 / Math.PI) + 360) % 360 : null;
  return { luma: L / (SW * SH), sat: S / n, hue };
}
const ranges = ts => { const out = []; for (const t of ts) { const l = out[out.length - 1]; if (l && t - l[1] < 0.6) l[1] = t; else out.push([t, t]); } return out.map(([a, b]) => a === b ? a.toFixed(1) : `${a.toFixed(1)}–${b.toFixed(1)}`); };

(async () => {
  const preview = process.argv.includes('--preview');
  const file = process.argv.slice(2).find(a => a.endsWith('.mp4')) || path.join(ROOT, preview ? 'out/preview/嫉妒_长版_预览.mp4' : 'out/嫉妒_长版.mp4');
  const report = []; let fail = 0;
  const log = (ok, s) => { report.push(`${ok ? '通过' : '不合格'}  ${s}`); if (!ok) fail++; };
  const dur = Number(spawnSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', file]).stdout);
  const fr = frames(file, 2).slice(0, Math.floor(dur * 2));
  const dark = [], dull = [], still = [], hues = [], offHue = [];
  let run = 0;
  fr.forEach((f, i) => {
    const t = i / 2, s = stats(f);
    if (s.luma < 28) dark.push(t);
    if (s.sat < 0.25) dull.push(t);
    if (i % 2 === 0 && s.hue != null) { hues.push(s.hue); if (s.hue < 70 || s.hue > 175) offHue.push(`${t.toFixed(0)}秒(${s.hue.toFixed(0)}°)`); }
    if (i > 0) { const d = meanDiff(f, fr[i - 1]); const pause = t > 77.3 && t < 77.9; run = d < 1.5 && !pause ? run + 0.5 : 0; if (run >= 2) still.push(t); }
  });
  log(dark.length === 0, `亮度：${dark.length ? '平均亮度<28 的时刻 ' + ranges(dark).join('、') : '全部 ≥ 28（没有黑屏或空白画面）'}`);
  log(dull.length === 0, `鲜艳度：${dull.length ? '中部饱和度<0.25 的时刻 ' + ranges(dull).join('、') : '全部 ≥ 0.25'}`);
  log(still.length === 0, `静止：${still.length ? '超过 2 秒几乎不动的时刻 ' + ranges(still).join('、') : '没有超过 2 秒的静止画面'}`);
  log(offHue.length === 0, `色相：每秒抽帧 ${hues.length} 张，发光部分平均色相 ${Math.min(...hues).toFixed(0)}°–${Math.max(...hues).toFixed(0)}°${offHue.length ? '；不在绿色范围：' + offHue.join('、') : '，全部在绿色范围（70°–175°）'}`);
  const d0 = meanDiff(edgeFrame(file, false), edgeFrame(file, true));
  log(d0 < 4, `首尾帧差：${d0.toFixed(2)}（要求 < 4）`);
  // 页面检查
  const { srv, url, browser } = await openBrowser();
  const page = await openPage(browser, url, true);
  const meta = await page.evaluate(() => window.META);
  const bad = [];
  for (const s of meta.subs) {
    if (s.exempt) continue;
    const plain = s.text.replace(/〔[^〕]*〕/g, '');
    const n = (plain.match(/[一-鿿]/g) || []).length + (plain.match(/[0-9]+/g) || []).length;
    const need = Math.max(2.4, 1.0 + n * 0.17), have = s.t1 - s.t0;
    if (have + 1e-6 < need) bad.push(`「${plain}」${have.toFixed(2)} 秒 < ${need.toFixed(2)} 秒`);
  }
  log(bad.length === 0, `字幕时长：${bad.length ? '\n      ' + bad.join('\n      ') : `${meta.subs.length} 句全部合格（钩子台词按分镜执行）`}`);
  const outSafe = new Set(), overlap = new Set();
  for (let t = 0; t <= meta.duration - 0.01; t += 0.25) {
    const boxes = await page.evaluate(t => { window.render(t); return window.LAST_BOXES; }, t);
    for (const b of boxes) if (b.x0 < SAFE.x0 - 1 || b.x1 > SAFE.x1 + 1 || b.y0 < SAFE.y0 - 1 || b.y1 > SAFE.y1 + 1) outSafe.add(`${t.toFixed(2)}「${b.label}」(${b.x0 | 0},${b.y0 | 0})–(${b.x1 | 0},${b.y1 | 0})`);
    for (let i = 0; i < boxes.length; i++) for (let j = i + 1; j < boxes.length; j++) {
      const a = boxes[i], b = boxes[j];
      if (a.x0 < b.x1 - 2 && b.x0 < a.x1 - 2 && a.y0 < b.y1 - 2 && b.y0 < a.y1 - 2) overlap.add(`${t.toFixed(2)}「${a.label}」×「${b.label}」`);
    }
  }
  log(outSafe.size === 0, `文字边距：${outSafe.size ? '\n      ' + [...outSafe].slice(0, 12).join('\n      ') : '全部距画面边缘 ≥ 60px'}`);
  log(overlap.size === 0, `文字重叠：${overlap.size ? '\n      ' + [...overlap].slice(0, 12).join('\n      ') : '没有重叠'}`);
  await browser.close(); srv.close();
  const text = `qa.js ${path.basename(file)}（${dur.toFixed(3)} 秒）${new Date().toISOString()}\n` + report.join('\n') + `\n\n结果：${fail ? fail + ' 项不合格' : '全部合格'}\n`;
  console.log(text);
  fs.writeFileSync(path.join(ROOT, 'output/envy_h', preview ? 'qa_预览.txt' : 'qa_成片.txt'), text);
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
