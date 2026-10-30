// 质量检查：node qa.js [--preview]
// 视频检查（读 out/ 或 out/preview/ 里的三个文件）：
//   ① 亮度：平均亮度 < 28 的帧  ② 鲜艳：画面中部平均饱和度 < 0.25 的帧（片头 0–2 秒与片尾最后 1 秒是规定的中性色，不计）
//   ③ 静止：连续 2 秒以上帧间差 < 1.5（结尾 77.4–77.8 的停顿除外）
//   ④ 片头一致性：三个视频的第 0 帧两两比较 < 2；每个视频最后一帧与自己的第 0 帧比较 < 4
// 页面检查（逐 0.25 秒渲染文字层的包围盒）：
//   ⑤ 字幕时长：显示窗口（第一个字出现 → 开始淡出）≥ max(2.4, 1.0 + 字数 × 0.17)，钩子里的两句台词除外
//      字数按汉字计，标点不计，连续数字算一个字
//   ⑥ 文字安全区 x 80–900、y 200–1520；文字之间不重叠
const { spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const { openBrowser, openPage, parseArgs } = require('./tools/page');

const ROOT = path.resolve(__dirname, '../..');
const VIDEOS = [['envy', 'short', '嫉妒_竖屏短版'], ['envy', 'long', '嫉妒_长版'], ['pride', 'short', '傲慢_竖屏短版_系列版']];
const SW = 135, SH = 240; // 分析用的缩小尺寸
const SAFE = { x0: 80, x1: 900, y0: 200, y1: 1520 };

function frames(file, fps, opts = '') {
  const r = spawnSync('ffmpeg', ['-v', 'error', '-i', file, '-vf', `${opts}${opts ? ',' : ''}scale=${SW}:${SH}:flags=area`, '-r', String(fps), '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-'], { maxBuffer: 1 << 30 });
  if (r.status !== 0) throw new Error(String(r.stderr));
  const n = r.stdout.length / (SW * SH * 3), out = [];
  for (let i = 0; i < n; i++) out.push(r.stdout.subarray(i * SW * SH * 3, (i + 1) * SW * SH * 3));
  return out;
}
function oneFrame(file, which) {
  // which: 'first' | 'last'
  const args = which === 'first' ? ['-v', 'error', '-i', file, '-frames:v', '1'] : ['-v', 'error', '-sseof', '-0.5', '-i', file, '-update', '1'];
  const r = spawnSync('ffmpeg', [...args, '-vf', `scale=${SW * 4}:${SH * 4}:flags=area`, '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-'], { maxBuffer: 1 << 28 });
  const sz = SW * 4 * SH * 4 * 3;
  return r.stdout.subarray(r.stdout.length - sz);
}
const meanDiff = (a, b) => { let s = 0; for (let i = 0; i < a.length; i++) s += Math.abs(a[i] - b[i]); return s / a.length; };
function stats(buf) {
  let L = 0, S = 0, n = 0;
  for (let y = 0; y < SH; y++) for (let x = 0; x < SW; x++) {
    const i = (y * SW + x) * 3, r = buf[i] / 255, g = buf[i + 1] / 255, b = buf[i + 2] / 255;
    L += (0.299 * r + 0.587 * g + 0.114 * b) * 255;
    if (x > SW * 0.25 && x < SW * 0.75 && y > SH * 0.25 && y < SH * 0.75) { const mx = Math.max(r, g, b), mn = Math.min(r, g, b); S += mx > 0.04 ? (mx - mn) / mx : 0; n++; }
  }
  return { luma: L / (SW * SH), sat: S / n };
}
const ranges = (ts) => { const out = []; for (const t of ts) { const l = out[out.length - 1]; if (l && t - l[1] < 0.6) l[1] = t; else out.push([t, t]); } return out.map(([a, b]) => a === b ? a.toFixed(1) : `${a.toFixed(1)}–${b.toFixed(1)}`); };

(async () => {
  const q = parseArgs(process.argv.slice(2));
  const dir = q.preview ? path.join(ROOT, 'out/preview') : path.join(ROOT, 'out');
  const report = []; let fail = 0;
  const log = (ok, s) => { report.push(`${ok ? '通过' : '不合格'}  ${s}`); if (!ok) fail++; };
  const firsts = {};
  for (const [ep, ver, name] of VIDEOS) {
    const file = path.join(dir, name + (q.preview ? '_预览' : '') + '.mp4');
    if (!fs.existsSync(file)) { log(false, `${name}：文件不存在`); continue; }
    const dur = Number(spawnSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', file]).stdout);
    const fr = frames(file, 2);
    const dark = [], dull = [], still = [];
    fr.forEach((f, i) => {
      const t = i / 2, s = stats(f);
      if (s.luma < 28) dark.push(t);
      if (t >= 2.0 && t < dur - 1 && s.sat < 0.25) dull.push(t);
    });
    // 静止：每 0.5 秒取一帧，相邻帧差 < 1.5 持续 2 秒以上
    let run = 0;
    for (let i = 1; i < fr.length; i++) {
      const t = i / 2, d = meanDiff(fr[i], fr[i - 1]);
      const pause = ep === 'envy' && ver === 'long' && t > 77.3 && t < 77.9;
      run = d < 1.5 && !pause ? run + 0.5 : 0;
      if (run >= 2) still.push(t);
    }
    log(dark.length === 0, `${name}（${dur.toFixed(2)} 秒）亮度：${dark.length ? '偏暗（平均亮度<28）的时刻 ' + ranges(dark).join('、') : '全部 ≥ 28'}`);
    log(dull.length === 0, `${name} 鲜艳度：${dull.length ? '中部饱和度<0.25 的时刻 ' + ranges(dull).join('、') : '全部 ≥ 0.25（片头/片尾中性色不计）'}`);
    log(still.length === 0, `${name} 静止：${still.length ? '超过 2 秒几乎不动的时刻 ' + ranges(still).join('、') : '没有超过 2 秒的静止画面'}`);
    const f0 = oneFrame(file, 'first'), fl = oneFrame(file, 'last');
    firsts[name] = f0;
    const dl = meanDiff(f0, fl);
    log(dl < 4, `${name} 首尾帧差：${dl.toFixed(2)}（要求 < 4）`);
  }
  const names = Object.keys(firsts);
  for (let i = 0; i < names.length; i++) for (let j = i + 1; j < names.length; j++) {
    const d = meanDiff(firsts[names[i]], firsts[names[j]]);
    log(d < 2, `第 0 帧一致性：${names[i]} ↔ ${names[j]} 差 ${d.toFixed(2)}（要求 < 2）`);
  }
  // ---------- 页面检查
  const { srv, url, browser } = await openBrowser();
  for (const [ep, ver, name] of VIDEOS) {
    const page = await openPage(browser, url, { ep, ver, preview: true });
    const meta = await page.evaluate(() => window.META);
    const bad = [];
    for (const s of meta.subs) {
      if (s.exempt) continue;
      // 字数：汉字逐个计数，标点不计，连续的数字算一个字（如「2009年」算 2 个字）
      const plain = s.text.replace(/〔[^〕]*〕/g, '').replace(/\n/g, '');
      const n = (plain.match(/[\u4e00-\u9fff]/g) || []).length + (plain.match(/[0-9]+/g) || []).length;
      // 显示窗口：第一个字开始出现（t0）→ 开始淡出（t1）
      const need = Math.max(2.4, 1.0 + n * 0.17), have = s.t1 - s.t0;
      if (have + 1e-6 < need) bad.push(`「${s.text.replace(/〔[^〕]*〕/g, '').replace(/\n/g, '')}」${have.toFixed(2)} 秒 < ${need.toFixed(2)} 秒`);
    }
    log(bad.length === 0, `${name} 字幕时长：${bad.length ? '\n      ' + bad.join('\n      ') : `${meta.subs.length} 句全部合格（钩子台词按分镜执行）`}`);
    const outSafe = new Set(), overlap = new Set();
    for (let t = 0; t <= meta.duration - 0.01; t += 0.25) {
      const boxes = await page.evaluate(t => { window.render(t); return window.LAST_BOXES; }, t);
      for (const b of boxes) if (b.x0 < SAFE.x0 - 1 || b.x1 > SAFE.x1 + 1 || b.y0 < SAFE.y0 - 1 || b.y1 > SAFE.y1 + 1) outSafe.add(`${t.toFixed(2)}「${b.label}」(${b.x0 | 0},${b.y0 | 0})–(${b.x1 | 0},${b.y1 | 0})`);
      for (let i = 0; i < boxes.length; i++) for (let j = i + 1; j < boxes.length; j++) {
        const a = boxes[i], b = boxes[j];
        if (a.x0 < b.x1 - 2 && b.x0 < a.x1 - 2 && a.y0 < b.y1 - 2 && b.y0 < a.y1 - 2) overlap.add(`${t.toFixed(2)}「${a.label}」×「${b.label}」`);
      }
    }
    log(outSafe.size === 0, `${name} 文字安全区：${outSafe.size ? '\n      ' + [...outSafe].slice(0, 12).join('\n      ') : '全部在 x 80–900、y 200–1520 内'}`);
    log(overlap.size === 0, `${name} 文字重叠：${overlap.size ? '\n      ' + [...overlap].slice(0, 12).join('\n      ') : '没有重叠'}`);
    await page.close();
  }
  await browser.close(); srv.close();
  const text = `qa.js ${q.preview ? '（预览版）' : '（成片）'} ${new Date().toISOString()}\n` + report.join('\n') + `\n\n结果：${fail ? fail + ' 项不合格' : '全部合格'}\n`;
  console.log(text);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, q.preview ? 'qa_预览.txt' : 'qa_成片.txt'), text);
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
