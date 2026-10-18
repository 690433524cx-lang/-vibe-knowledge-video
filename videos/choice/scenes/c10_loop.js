// 第十幕 · 81.4–86 秒：不断比较、不断搜索、不断拖延——纸条一张张拍下来，越堆越乱，灯也越来越暗。
// 第十一幕（前半）· 86–88.6 秒：开始简化。纸条一批批被拿走：20 → 10 → 5 → 3，画面一下子空下来。
const { W, H } = require('../../../src/config');
const { C, FONT } = require('../../../src/lib/style');
const { pencil, sketchEllipse } = require('../../../src/lib/draw');
const { prog, smooth, easeInOut, easeIn, lerp, rng } = require('../../../src/lib/util');
const { spring } = require('../../../src/lib/motion');
const { sheet, inkText } = require('../../../src/lib/material');

const S = { start: 81.3, end: 89.2 };

const R = rng(1900);
const NAMED = [
  { text: '继续滑外卖', icon: 'phone', at: 81.5 },
  { text: '继续对比商品', icon: 'tag', at: 81.95 },
  { text: '继续搜工作信息', icon: 'search', at: 82.4 },
  { text: '继续看攻略', icon: 'book', at: 82.85 },
  { text: '继续问别人', icon: 'bubble', at: 83.3 },
];
const SLIPS = [
  ...NAMED.map((n, i) => ({ ...n, x: 1130 + (R() - 0.5) * 260, y: 500 + (R() - 0.5) * 260, rot: (R() - 0.5) * 0.28, w: 470 + R() * 60, h: 150 + R() * 20, seed: 1910 + i })),
  ...Array.from({ length: 15 }, (_, i) => ({
    text: ['再比较一下', '再看看评价', '再等等', '再问问', '再搜一次'][i % 5], icon: ['phone', 'tag', 'search', 'book', 'bubble'][i % 5],
    at: 83.6 + i * 0.07, x: 1130 + (R() - 0.5) * 620, y: 520 + (R() - 0.5) * 520, rot: (R() - 0.5) * 0.5, w: 380 + R() * 80, h: 130 + R() * 20, seed: 1930 + i, faint: true,
  })),
];
// 第十一幕：按批拿走，剩下三张
const LEAVE = SLIPS.map((s, i) => (i < 3 ? 99 : i < 13 ? 86.2 + (i % 5) * 0.04 : i < 18 ? 86.8 + (i % 5) * 0.04 : 87.3 + (i % 2) * 0.05));
const KEEP_POS = [[690, 520, -0.03], [1000, 470, 0.02], [1310, 540, -0.015]];
const COUNTS = [[86.0, '20'], [86.6, '10'], [87.1, '5'], [87.6, '3']];

function icon(ctx, kind, t, seed) {
  const o = { t, width: 1.6, color: 'rgba(48,40,34,0.8)', passes: 1, pressure: 0.5, seed };
  if (kind === 'phone') pencil(ctx, [[-14, -24], [14, -24], [14, 24], [-14, 24], [-14, -24]], o);
  else if (kind === 'tag') { pencil(ctx, [[-14, -22], [14, -22], [14, 24], [-14, 24], [-14, -22]], o); sketchEllipse(ctx, 0, -14, 3, 3, { ...o, seed: seed + 1 }); }
  else if (kind === 'search') { sketchEllipse(ctx, -4, -4, 14, 14, o); pencil(ctx, [[6, 6], [18, 18]], { ...o, seed: seed + 1 }); }
  else if (kind === 'book') { pencil(ctx, [[-22, -16], [0, -10], [22, -16], [22, 18], [0, 24], [-22, 18], [-22, -16]], o); pencil(ctx, [[0, -10], [0, 24]], { ...o, seed: seed + 1 }); }
  else { pencil(ctx, [[-22, -16], [22, -16], [22, 10], [-4, 10], [-14, 22], [-12, 10], [-22, 10], [-22, -16]], o); }
}

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
    sheet(ctx, s.w, s.h, { seed: s.seed, tone: s.faint ? 'warm' : 'bone', light: -2.3, lift: 0.08 + (1 - Math.min(1, k)) * 0.6, shade: 0.5, rough: 2 });
    ctx.save(); ctx.translate(-s.w / 2 + 56, 0); icon(ctx, s.icon, t, s.seed + 5); ctx.restore();
    inkText(ctx, s.text, -s.w / 2 + 104, 14, { font: FONT.body(s.faint ? 32 : 38), color: '#2a221c', seed: s.seed + 7, wear: 0.4, spacing: 3 });
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
