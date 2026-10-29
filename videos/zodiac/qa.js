// 自动验收：node qa.js --sign leo [--preview]（或 node qa.js <视频.mp4>）
// 1. 每秒抽一帧：平均亮度（0–255）< 32 判“太暗”（0–4 秒召唤阶段放宽到 26）；画面中央 60% 区域平均饱和度 < 0.3 判“不够鲜艳”
// 2. 每 0.5 秒抽一帧：相邻两帧平均像素差连续 2 秒以上 < 1.5 判“画面静止”（17.6–17.9 的停顿除外）
// 3. 文字包围盒（render.js 渲染时记录在 <视频>.boxes.json）：必须在安全区 x 80–900、y 200–1520 内；文字之间不能重叠；不能压住神兽的脸
const { execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const argv = process.argv.slice(2);
const opt = k => { const i = argv.indexOf(k); return i >= 0 ? argv[i + 1] : null; };
let file = argv.find(a => a.endsWith('.mp4'));
if (!file) {
  const sign = opt('--sign') || 'leo';
  const cfg = JSON.parse(fs.readFileSync(path.join(__dirname, 'engine/signs', sign + '.json'), 'utf8'));
  file = path.join(__dirname, 'out', `${cfg.name}_星座召唤${argv.includes('--preview') ? '_预览' : ''}.mp4`);
}
if (!fs.existsSync(file)) { console.error('找不到视频：' + file); process.exit(1); }

const probe = JSON.parse(execFileSync('ffprobe', ['-v', 'error', '-select_streams', 'v:0', '-show_entries', 'stream=width,height,r_frame_rate,pix_fmt,codec_name,nb_frames:format=duration', '-of', 'json', file]).toString());
const st = probe.streams[0], dur = +probe.format.duration;
// 解码成 135×240 的小图（足够算亮度、饱和度和帧差），每 0.5 秒一帧
const W = 135, H = 240;
function frameAt(t) {
  return execFileSync('ffmpeg', ['-v', 'error', '-ss', t.toFixed(3), '-i', file, '-frames:v', '1', '-vf', `scale=${W}:${H}:flags=area`, '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-'], { maxBuffer: 1 << 26 });
}
function stats(buf) {
  let lum = 0, sat = 0, ns = 0;
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const i = (y * W + x) * 3, r = buf[i], g = buf[i + 1], b = buf[i + 2];
    lum += 0.299 * r + 0.587 * g + 0.114 * b;
    if (x >= W * 0.2 && x < W * 0.8 && y >= H * 0.2 && y < H * 0.8) {
      const mx = Math.max(r, g, b), mn = Math.min(r, g, b);
      sat += mx === 0 ? 0 : (mx - mn) / mx; ns++;
    }
  }
  return { lum: lum / (W * H), sat: sat / ns };
}
const problems = [];
const samples = [];
for (let t = 0; t < dur - 0.01; t += 0.5) samples.push({ t, buf: frameAt(t) });

console.log(`视频：${file}`);
console.log(`规格：${st.width}×${st.height}，${st.r_frame_rate} fps，${st.codec_name}/${st.pix_fmt}，时长 ${dur.toFixed(2)} 秒`);
console.log('\n秒   亮度   中央饱和度');
for (const s of samples) {
  if (Math.abs(s.t - Math.round(s.t)) > 1e-6) continue;
  const { lum, sat } = stats(s.buf);
  const minLum = s.t < 4 ? 26 : 32;
  const flags = [];
  if (lum < minLum) { flags.push('太暗'); problems.push(`${s.t}s 太暗（亮度 ${lum.toFixed(1)} < ${minLum}）`); }
  if (sat < 0.3) { flags.push('不够鲜艳'); problems.push(`${s.t}s 不够鲜艳（饱和度 ${sat.toFixed(2)} < 0.3）`); }
  console.log(`${String(s.t).padStart(4)}  ${lum.toFixed(1).padStart(5)}  ${sat.toFixed(2)}  ${flags.join(' ')}`);
}
// 静止检测
let runStart = null; const diffs = [];
for (let k = 1; k < samples.length; k++) {
  const a = samples[k - 1].buf, b = samples[k].buf; let d = 0;
  for (let i = 0; i < a.length; i++) d += Math.abs(a[i] - b[i]);
  d /= a.length; diffs.push([samples[k].t, d]);
}
console.log('\n帧差（每 0.5 秒）：' + diffs.map(([t, d]) => `${t}:${d.toFixed(1)}`).join(' '));
for (const [t, d] of [...diffs, [dur + 1, 99]]) {
  const still = d < 1.5 && !(t > 17.6 && t <= 18.0);
  if (still && runStart === null) runStart = t - 0.5;
  if (!still && runStart !== null) { if (t - 0.5 - runStart >= 2) problems.push(`${runStart}–${t - 0.5}s 画面静止`); runStart = null; }
}
// 文字检查
const boxFile = file + '.boxes.json';
if (fs.existsSync(boxFile)) {
  const B = JSON.parse(fs.readFileSync(boxFile, 'utf8'));
  // 同一类问题按时间段合并
  const runs = new Map(); let n = 0;
  const report = (key, msg, t) => { const r = runs.get(key); if (r && t - r.t1 < 0.2) r.t1 = t; else { if (r) problems.push(`${r.msg}（${r.t0}–${r.t1}s）`); runs.set(key, { msg, t0: t, t1: t }); } };
  for (const fr of Object.values(B.frames)) {
    for (const b of fr.boxes) {
      n++;
      if (b.x0 < 80 || b.x1 > 900 || b.y0 < 200 || b.y1 > 1520) report('safe' + b.id, `文字“${b.text}”超出安全区，例如 [${b.x0},${b.y0},${b.x1},${b.y1}]`, fr.t);
      if (fr.face && b.a > 0.3) {
        const f = fr.face, ox = Math.min(b.x1, f.x1) - Math.max(b.x0, f.x0), oy = Math.min(b.y1, f.y1) - Math.max(b.y0, f.y0);
        if (ox > 4 && oy > 4) report('face' + b.id, `文字“${b.text}”压住了神兽的脸`, fr.t);
      }
    }
    for (let i = 0; i < fr.boxes.length; i++) for (let j = i + 1; j < fr.boxes.length; j++) {
      const a = fr.boxes[i], b = fr.boxes[j];
      if (a.a < 0.3 || b.a < 0.3) continue;
      const ox = Math.min(a.x1, b.x1) - Math.max(a.x0, b.x0), oy = Math.min(a.y1, b.y1) - Math.max(a.y0, b.y0);
      if (ox > 2 && oy > 2) report('ov' + a.id + b.id, `文字重叠：“${a.text}” 与 “${b.text}”`, fr.t);
    }
  }
  for (const r of runs.values()) problems.push(`${r.msg}（${r.t0}–${r.t1}s）`);
  console.log(`\n文字检查：${Object.keys(B.frames).length} 帧，${n} 个文字包围盒`);
} else problems.push('缺少文字包围盒记录 ' + boxFile);

console.log('\n' + (problems.length ? '不合格：\n- ' + problems.join('\n- ') : '全部合格 ✓'));
process.exit(problems.length ? 2 : 0);
