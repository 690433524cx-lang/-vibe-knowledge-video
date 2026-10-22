// 第十幕 · 81.0–90.4 秒：相册。
//   成年人的手翻着手机相册，越翻越慢：1 月照片很多 → 2 月一些 → 3 月两三张 → 4 月几乎没有
//   → 5 月只有截图和外卖 → 6 月一张地铁。停住。
//   「却只剩几个画面」：手机退开，半年的照片只剩每个月一张，排成一行，其余的都淡掉。
const L = require('../lib');
const { W, H, FONT, rng, noise1, lerp, clamp, prog, smooth } = L;
const phone = require('./t2_phone');

const S = { start: 80.9, end: 90.7 };
const A0 = 81.0, STOP = 85.6, COL = 86.7;
const { w: PWD, h: PHT, r: PR } = phone.PHONE;

// 小缩略图：几笔就能认出来的照片
function thumb(ctx, type, x, y, w, h, seed) {
  const r = rng(seed);
  ctx.save();
  ctx.beginPath(); ctx.rect(x, y, w, h); ctx.clip();
  const g = (a, b) => { const gr = ctx.createLinearGradient(0, y, 0, y + h); gr.addColorStop(0, a); gr.addColorStop(1, b); ctx.fillStyle = gr; ctx.fillRect(x, y, w, h); };
  if (type === 'sea') { g('#e8d8b8', '#7a9aa0'); ctx.fillStyle = '#5a7a84'; ctx.fillRect(x, y + h * 0.55, w, h * 0.2); ctx.fillStyle = '#d8c8a0'; ctx.fillRect(x, y + h * 0.75, w, h); }
  else if (type === 'food') { g('#5a3a2a', '#3a2418'); ctx.fillStyle = '#e8e0d0'; ctx.beginPath(); ctx.arc(x + w / 2, y + h / 2, w * 0.32, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = '#c0603a'; ctx.beginPath(); ctx.arc(x + w / 2, y + h / 2, w * 0.18, 0, Math.PI * 2); ctx.fill(); }
  else if (type === 'friends') { g('#d8a070', '#8a5a40'); ctx.fillStyle = '#3a2a24'; for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.arc(x + w * (0.25 + i * 0.25), y + h * 0.5, w * 0.09, 0, Math.PI * 2); ctx.fill(); ctx.fillRect(x + w * (0.17 + i * 0.25), y + h * 0.6, w * 0.16, h * 0.4); } }
  else if (type === 'city') { g('#2a3048', '#14161e'); for (let i = 0; i < 12; i++) { ctx.fillStyle = `rgba(255,${200 + r() * 40},140,0.8)`; ctx.fillRect(x + r() * w, y + h * 0.3 + r() * h * 0.6, 4, 4); } }
  else if (type === 'sky') { g('#e8c090', '#a87a80'); ctx.fillStyle = '#3a2a2e'; ctx.fillRect(x, y + h * 0.75, w, h); }
  else if (type === 'cake') { g('#3a2a30', '#241a1e'); ctx.fillStyle = '#e8d8c8'; ctx.fillRect(x + w * 0.25, y + h * 0.5, w * 0.5, h * 0.3); ctx.fillStyle = '#ffd890'; ctx.fillRect(x + w * 0.48, y + h * 0.36, 4, h * 0.14); }
  else if (type === 'snow') { g('#c8ccd0', '#e8eaec'); ctx.fillStyle = '#4a4e52'; ctx.fillRect(x + w * 0.45, y + h * 0.4, w * 0.1, h * 0.4); }
  else if (type === 'screen') { ctx.fillStyle = '#f0f0ee'; ctx.fillRect(x, y, w, h); ctx.fillStyle = '#b8bcc0'; for (let i = 0; i < 6; i++) ctx.fillRect(x + 8, y + 12 + i * (h / 7), w * (0.4 + r() * 0.5), 5); }
  else if (type === 'takeaway') { g('#4a4c4e', '#36383a'); ctx.fillStyle = '#16171a'; ctx.fillRect(x + w * 0.15, y + h * 0.25, w * 0.7, h * 0.5); ctx.fillStyle = '#e4ddcf'; ctx.fillRect(x + w * 0.2, y + h * 0.32, w * 0.28, h * 0.36); ctx.fillStyle = '#6a4630'; ctx.fillRect(x + w * 0.52, y + h * 0.32, w * 0.28, h * 0.36); }
  else if (type === 'subway') { g('#4a5654', '#2a3230'); ctx.fillStyle = '#0d1114'; ctx.fillRect(x, y + h * 0.15, w, h * 0.4); ctx.fillStyle = '#4c5e7a'; ctx.fillRect(x, y + h * 0.62, w, h * 0.2); ctx.fillStyle = 'rgba(255,220,160,0.6)'; ctx.fillRect(x + w * 0.2, y + h * 0.3, w * 0.4, 3); }
  ctx.restore();
}

const R = rng(1001);
const VAR = ['sea', 'food', 'friends', 'city', 'sky', 'cake', 'snow'];
const MONTHS = [
  ['1 月', Array.from({ length: 15 }, () => VAR[Math.floor(R() * VAR.length)])],
  ['2 月', Array.from({ length: 7 }, () => VAR[Math.floor(R() * VAR.length)])],
  ['3 月', ['food', 'screen', 'takeaway']],
  ['4 月', ['screen']],
  ['5 月', ['screen', 'takeaway']],
  ['6 月', ['subway']],
];
// 每个月最后留下的那一张
const SURVIVE = [2, 1, 0, 0, 1, 0];

// 相册排版（屏幕坐标系，原点在屏幕左上角）
const TW = (PWD - 24) / 3, HEAD = 70;
const LAYOUT = (() => {
  const out = [];
  let y = 120;
  MONTHS.forEach(([name, list], mi) => {
    out.push({ head: name, y });
    y += HEAD;
    list.forEach((type, i) => {
      out.push({ type, mi, i, x: 6 + (i % 3) * (TW + 6), y: y + Math.floor(i / 3) * (TW + 6), seed: mi * 50 + i });
    });
    y += Math.ceil(list.length / 3) * (TW + 6) + 20;
  });
  return { items: out, total: y };
})();
const scrollAt = (d) => {
  const k = prog(d, A0 + 1.0, STOP);
  const e = 1 - Math.pow(1 - k, 3); // 越翻越慢
  return e * (LAYOUT.total - PHT + 40);
};

function screen(ctx, d) {
  ctx.fillStyle = '#0e1012';
  ctx.fillRect(-PWD / 2, -PHT / 2, PWD, PHT);
  const sc = scrollAt(d);
  ctx.save();
  ctx.translate(-PWD / 2, -PHT / 2 - sc);
  for (const it of LAYOUT.items) {
    const yy = it.y - sc;
    if (yy < -200 || yy > PHT + 50) continue;
    if (it.head) {
      ctx.fillStyle = '#e8e2d6';
      ctx.font = FONT.body(34);
      ctx.fillText(it.head, 14, it.y + 46);
    } else {
      const fadeOthers = it.i === SURVIVE[it.mi] ? 0 : smooth(prog(d, COL, COL + 0.6));
      ctx.globalAlpha = 1 - fadeOthers;
      thumb(ctx, it.type, it.x, it.y, TW, TW, it.seed);
      ctx.globalAlpha = 1;
    }
  }
  ctx.restore();
  // 顶部状态栏
  ctx.fillStyle = 'rgba(14,16,18,0.9)';
  ctx.fillRect(-PWD / 2, -PHT / 2, PWD, 90);
  ctx.fillStyle = '#e8e2d6';
  ctx.font = FONT.body(30);
  ctx.fillText('相册', -PWD / 2 + 14, -PHT / 2 + 66);
}

function draw(ctx, d) {
  ctx.fillStyle = '#16181c';
  ctx.fillRect(0, 0, W, H);
  L.blurred(ctx, 30, (c) => {
    const r = rng(1002);
    for (let i = 0; i < 6; i++) { c.fillStyle = `rgba(${180 + r() * 60},${130 + r() * 40},90,0.2)`; c.beginPath(); c.arc(r() * 800, 200 + r() * 600, 60 + r() * 90, 0, Math.PI * 2); c.fill(); }
  });
  const back = smooth(prog(d, COL, COL + 1.0));
  const enter = smooth(prog(d, A0 - 0.1, A0 + 0.4));
  ctx.save();
  ctx.globalAlpha = enter * (1 - back);
  ctx.translate(phone.PHONE.x + 40, phone.PHONE.y + 20 + back * 60);
  ctx.scale(1 - back * 0.25, 1 - back * 0.25);
  ctx.rotate(phone.PHONE.rot);
  L.lit(ctx, (c) => phone.hand(c, d), { light: -1.9, rim: [170, 190, 220], rimA: 0.6, shadow: 0.5, ambient: 0.9, bbox: [600, 400, 900, 700] });
  ctx.fillStyle = '#0c0d10';
  ctx.beginPath(); ctx.roundRect(-PWD / 2 - 12, -PHT / 2 - 12, PWD + 24, PHT + 24, PR + 10); ctx.fill();
  ctx.save();
  ctx.beginPath(); ctx.roundRect(-PWD / 2, -PHT / 2, PWD, PHT, PR); ctx.clip();
  screen(ctx, d);
  ctx.restore();
  L.lit(ctx, (c) => phone.fingers(c), { light: Math.PI, rim: [200, 210, 230], rimA: 0.5, shadow: 0.4, ambient: 0.9, bbox: [1100, 500, 300, 400] });
  ctx.restore();
  // 半年只剩几个画面：每个月一张，飘出来排成一行
  const out = smooth(prog(d, COL + 0.3, COL + 1.4));
  if (out > 0) {
    const fade = 1 - smooth(prog(d, 90.0, 90.6));
    MONTHS.forEach(([name, list], mi) => {
      const it = LAYOUT.items.find((x) => x.mi === mi && x.i === SURVIVE[mi]);
      const tx = W / 2 + (mi - 2.5) * 250, ty = 470;
      const sx = phone.PHONE.x - PWD / 2 + it.x, sy = phone.PHONE.y - PHT / 2 + it.y - scrollAt(d);
      const x = lerp(sx, tx - 110, out), y = lerp(clamp(sy, -200, H), ty - 110, out);
      ctx.save();
      ctx.globalAlpha = out * fade;
      thumb(ctx, it.type, x, y, 220, 220, it.seed);
      ctx.fillStyle = '#d8d0c0';
      ctx.font = FONT.body(30);
      ctx.textAlign = 'center';
      ctx.fillText(name, x + 110, y + 270);
      ctx.restore();
    });
  }
}

function light(d) { return [{ x: 1000, y: 520, rx: 1100, ry: 820, i: 0.95, color: [185, 200, 225] }]; }
function grade(d) { return { warm: -0.25, ambient: 0.32 }; }

module.exports = { ...S, draw, light, grade, thumb };
