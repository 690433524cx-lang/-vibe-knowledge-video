// 第十幕 · 81.4–86 秒：不断比较、不断搜索、不断拖延——纸条一张张拍下来，越堆越乱，灯也越来越暗。
// 第十一幕（前半）· 86–88.6 秒：开始简化。纸条一批批被拿走：20 → 10 → 5 → 3，画面一下子空下来。
const { W, H } = require('../../../src/config');
const { C, FONT } = require('../../../src/lib/style');
const { pencil } = require('../../../src/lib/draw');
const { prog, smooth, easeInOut, easeIn, lerp, rng } = require('../../../src/lib/util');
const { spring } = require('../../../src/lib/motion');
const { sheet, inkText } = require('../../../src/lib/material');

const S = { start: 81.3, end: 89.2 };

const R = rng(1900);
// 不同质地的真实物件：手机通知、购物小票、网页、笔记本页、便利贴
const NAMED = [
  { text: '继续滑外卖', type: 'phone', at: 81.5 },
  { text: '继续对比商品', type: 'receipt', at: 81.95 },
  { text: '继续搜工作信息', type: 'browser', at: 82.4 },
  { text: '继续看攻略', type: 'note', at: 82.85 },
  { text: '继续问别人', type: 'sticky', at: 83.3 },
];
const TYPES = ['phone', 'receipt', 'browser', 'note', 'sticky'];
const SIZE = { phone: [420, 170], receipt: [250, 380], browser: [480, 190], note: [400, 250], sticky: [250, 240] };
const SLIPS = [
  ...NAMED.map((n, i) => ({ ...n, x: 1130 + (R() - 0.5) * 300, y: 500 + (R() - 0.5) * 280, rot: (R() - 0.5) * 0.24, seed: 1910 + i })),
  ...Array.from({ length: 15 }, (_, i) => ({
    text: ['再比较一下', '再看看评价', '再等等', '再问问', '再搜一次'][i % 5], type: TYPES[(i * 2 + 1) % 5],
    at: 83.6 + i * 0.07, x: 1130 + (R() - 0.5) * 680, y: 520 + (R() - 0.5) * 560, rot: (R() - 0.5) * 0.45, seed: 1930 + i, faint: true,
  })),
].map((s) => ({ ...s, w: SIZE[s.type][0] * (0.92 + R() * 0.16), h: SIZE[s.type][1] * (0.92 + R() * 0.16) }));

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
}

function item(ctx, s, t, lift) {
  const { w, h } = s;
  if (s.type === 'phone') {
    // 手机锁屏上的一条通知
    ctx.save();
    ctx.shadowColor = 'rgba(0,0,0,0.6)'; ctx.shadowBlur = 24 + lift * 30; ctx.shadowOffsetY = 12 + lift * 20;
    roundRect(ctx, -w / 2, -h / 2, w, h, 26); ctx.fillStyle = '#1c1a18'; ctx.fill();
    ctx.restore();
    roundRect(ctx, -w / 2, -h / 2, w, h, 26); ctx.strokeStyle = 'rgba(210,196,170,0.35)'; ctx.lineWidth = 1.4; ctx.stroke();
    ctx.fillStyle = 'rgba(232,222,204,0.12)'; roundRect(ctx, -w / 2 + 16, -h / 2 + 16, w - 32, h - 32, 18); ctx.fill();
    inkText(ctx, '外卖  ·  刚刚', -w / 2 + 38, -h / 2 + 56, { font: FONT.body(22), color: '#a99c86', seed: s.seed, wear: 0, spacing: 2 });
    inkText(ctx, s.text, -w / 2 + 38, h / 2 - 42, { font: FONT.body(s.faint ? 30 : 38), color: '#efe6d3', seed: s.seed + 1, wear: 0, spacing: 3 });
  } else if (s.type === 'receipt') {
    sheet(ctx, w, h, { seed: s.seed, tone: 'bone', light: -2.3, lift: 0.1 + lift * 0.6, shade: 0.4, rough: 4 });
    inkText(ctx, s.text, -w / 2 + 22, -h / 2 + 54, { font: FONT.body(s.faint ? 26 : 30), color: '#2a221c', seed: s.seed + 1, wear: 0.5, spacing: 2 });
    const r = rng(s.seed);
    for (let i = 0; i < 6; i++) {
      const y = -h / 2 + 100 + i * 38;
      ctx.fillStyle = 'rgba(50,40,32,0.5)'; ctx.fillRect(-w / 2 + 22, y, 70 + r() * 50, 5);
      inkText(ctx, `¥${(99 + Math.floor(r() * 300))}`, w / 2 - 22, y + 8, { font: FONT.type(20), color: '#3a3029', align: 'right', seed: s.seed + 10 + i, wear: 0.8 });
    }
  } else if (s.type === 'browser') {
    sheet(ctx, w, h, { seed: s.seed, tone: [204, 205, 198], light: -2.3, lift: 0.1 + lift * 0.6, shade: 0.4, rough: 1 });
    ctx.strokeStyle = 'rgba(60,60,58,0.45)'; ctx.lineWidth = 1.4;
    roundRect(ctx, -w / 2 + 24, -h / 2 + 24, w - 48, 44, 22); ctx.stroke();
    inkText(ctx, s.text, -w / 2 + 48, -h / 2 + 56, { font: FONT.body(s.faint ? 24 : 28), color: '#3a3a36', seed: s.seed + 1, wear: 0.1, spacing: 2 });
    for (let i = 0; i < 3; i++) { ctx.fillStyle = 'rgba(60,60,58,0.3)'; ctx.fillRect(-w / 2 + 28, -h / 2 + 96 + i * 26, w * (0.5 + 0.1 * i), 6); }
  } else if (s.type === 'note') {
    sheet(ctx, w, h, { seed: s.seed, tone: 'cream', light: -2.3, lift: 0.1 + lift * 0.6, shade: 0.4, crease: true });
    ctx.strokeStyle = 'rgba(70,90,110,0.18)'; ctx.lineWidth = 1;
    for (let y = -h / 2 + 60; y < h / 2 - 10; y += 40) { ctx.beginPath(); ctx.moveTo(-w / 2 + 8, y); ctx.lineTo(w / 2 - 8, y); ctx.stroke(); }
    inkText(ctx, s.text, -w / 2 + 34, -h / 2 + 100, { font: FONT.hand(s.faint ? 38 : 46), color: '#2a221c', seed: s.seed + 1, wear: 0.1 });
    for (let i = 0; i < 2; i++) pencil(ctx, [[-w / 2 + 34, -h / 2 + 140 + i * 40], [w / 2 - 60 - i * 60, -h / 2 + 138 + i * 40]], { seed: s.seed + 20 + i, t, width: 1.4, color: 'rgba(48,40,34,0.6)', passes: 1, pressure: 0.6 });
  } else {
    // 便利贴：偏黄、低饱和
    sheet(ctx, w, h, { seed: s.seed, tone: [214, 198, 140], light: -2.3, lift: 0.12 + lift * 0.6, shade: 0.45, rough: 1 });
    inkText(ctx, s.text, -w / 2 + 26, 6, { font: FONT.hand(s.faint ? 36 : 44), color: '#2a221c', seed: s.seed + 1, wear: 0.1 });
  }
}

// 第十一幕：按批拿走，剩下三张
const LEAVE = SLIPS.map((s, i) => (i < 3 ? 99 : i < 13 ? 86.2 + (i % 5) * 0.04 : i < 18 ? 86.8 + (i % 5) * 0.04 : 87.3 + (i % 2) * 0.05));
const KEEP_POS = [[620, 540, -0.03], [1000, 470, 0.02], [1380, 545, -0.015]];
const COUNTS = [[86.0, '20'], [86.6, '10'], [87.1, '5'], [87.6, '3']];

function cam(t) {
  const k = easeInOut(prog(t, 81.4, 85.6));
  const rel = easeInOut(prog(t, 86.0, 88.0));
  return { s: lerp(lerp(1, 1.1, k), 1, rel), rot: lerp(0.012 * k, 0, rel) };
}

function draw(ctx, t) {
  const c = cam(t);
  ctx.save();
  ctx.translate(1100, 520);
  ctx.rotate(c.rot);
  ctx.scale(c.s, c.s);
  ctx.translate(-1100, -520);
  SLIPS.forEach((s, i) => {
    const k = spring(t, s.at, 3.2, 0.6);           // 纸很轻：拍下去有一点回弹
    if (k <= 0) return;
    const lv = easeIn(prog(t, LEAVE[i], LEAVE[i] + 0.45));
    if (lv >= 1) return;
    // 剩下的三张：慢慢摆开，彼此之间留出空间
    const settle = i < 3 ? easeInOut(prog(t, 87.6, 88.5)) : 0;
    const fade = i < 3 ? 1 - smooth(prog(t, 88.4, 89.1)) : 1;
    const x = lerp(s.x, KEEP_POS[Math.min(i, 2)][0], settle) + lv * (i % 2 ? 900 : -900);
    const y = lerp(s.y, KEEP_POS[Math.min(i, 2)][1], settle) - lv * 200;
    ctx.save();
    ctx.globalAlpha *= Math.min(1, k * 1.5) * (1 - lv) * fade;
    ctx.translate(x, y + (1 - Math.min(1, k)) * -60);
    ctx.rotate(lerp(s.rot, KEEP_POS[Math.min(i, 2)][2], settle) + (1 - Math.min(1, k)) * 0.1);
    item(ctx, s, t, 1 - Math.min(1, k));
    ctx.restore();
  });
  ctx.restore();
  // 角落里很小的计数：20 → 10 → 5 → 3
  let cur = null;
  for (const [at, n] of COUNTS) if (t >= at) cur = [at, n];
  if (cur) {
    const a = smooth(prog(t, cur[0], cur[0] + 0.25)) * (1 - smooth(prog(t, 88.4, 89.0)));
    inkText(ctx, cur[1], 150, 220, { font: FONT.en(56), color: '#cbbfa8', seed: 1990, wear: 0.1, alpha: a });
    inkText(ctx, 'OPTIONS', 150, 256, { font: FONT.en(18), color: '#8d8070', seed: 1991, wear: 0.1, spacing: 6, alpha: a });
  }
}

function light(t) {
  const tired = smooth(prog(t, 84.9, 85.8)) * (1 - smooth(prog(t, 86.2, 87.6)));
  return [{
    x: lerp(1120, 1000, smooth(prog(t, 86.5, 88))), y: 520, rx: lerp(900, 1100, smooth(prog(t, 86.5, 88))), ry: 560,
    i: lerp(0.95, 0.55, tired), w: smooth(prog(t, 81.3, 81.8)) * (1 - smooth(prog(t, 88.5, 89.2))),
  }];
}
// 简化以后，画面开始「呼吸」：暗部稍微抬起来一点，色温回暖
function grade(t) { return { warm: lerp(0.0, 0.3, smooth(prog(t, 86.5, 88.5))), ambient: lerp(0.08, 0.16, smooth(prog(t, 86.5, 88.5))) }; }

module.exports = { ...S, draw, light, grade };
