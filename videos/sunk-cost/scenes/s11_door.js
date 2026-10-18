// 尾声 · 问题：决策卡慢慢长成一扇门。镜头后退，是一间安静、空旷的房间，
// 远处只有一扇半开的门，门缝里一点很淡的光。问题停在那里，不给答案。
const { W, H, DESIGN_END } = require('../../../src/config');
const { C } = require('../../../src/lib/style');
const { pencil, rectPts } = require('../../../src/lib/draw');
const { prog, smooth, easeInOut, lerp } = require('../../../src/lib/util');
const { CARD, camS } = require('./s9_card');

const S = { start: 99.3, end: DESIGN_END + 0.1 };
const DOOR = { x: 960, y: 520, w: 300, h: 560 };

// 镜头：100.6 起慢慢后退
function camScale(t) { return lerp(1, 0.48, easeInOut(prog(t, 100.6, 107.6))); }

const openK = (t) => smooth(prog(t, 100.0, 101.8));
const glow = (t) => openK(t) * (0.7 + 0.3 * smooth(prog(t, 101.8, DESIGN_END)));

function draw(ctx, t) {
  const m = easeInOut(prog(t, 99.3, 100.3));
  const s = camScale(t);
  ctx.save();
  ctx.translate(W / 2, DOOR.y);
  ctx.scale(s, s);
  ctx.translate(-W / 2, -DOOR.y);

  // 房间：背墙、地面与天花板的透视线，随镜头后退显现
  const rk = smooth(prog(t, 101.0, 104.5));
  if (rk > 0) {
    const o = { t, width: 2.4, color: C.light, alpha: rk * 0.55 };
    pencil(ctx, rectPts(380, 140, 1160, 660), { ...o, seed: 1101 });
    pencil(ctx, [[380, 800], [-1100, 1900]], { ...o, seed: 1102 });
    pencil(ctx, [[1540, 800], [3020, 1900]], { ...o, seed: 1103 });
    pencil(ctx, [[380, 140], [-1100, -960]], { ...o, seed: 1104 });
    pencil(ctx, [[1540, 140], [3020, -960]], { ...o, seed: 1105 });
    // 墙脚线
    pencil(ctx, [[380, 780], [1540, 780]], { ...o, seed: 1106, alpha: rk * 0.35, width: 1.2 });
  }

  // 门：由卡片的矩形长成
  const sc = camS(99.3);
  const x = lerp(CARD.x, DOOR.x, m), y = lerp(CARD.y, DOOR.y, m);
  const w = lerp(CARD.w * sc, DOOR.w, m), h = lerp(CARD.h * sc, DOOR.h, m);
  const left = x - w / 2, top = y - h / 2;
  // 门缝里的光
  const pw = w * lerp(1, 0.74, openK(t));
  const gk = glow(t);
  if (gk > 0) {
    // 洒在地上的光
    ctx.save();
    const g = ctx.createLinearGradient(0, top + h, 0, top + h + 700);
    g.addColorStop(0, `rgba(255,214,150,${0.28 * gk})`);
    g.addColorStop(1, 'rgba(255,214,150,0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(left + pw, top + h); ctx.lineTo(left + w, top + h);
    ctx.lineTo(left + w + 520, top + h + 700); ctx.lineTo(left + pw + 160, top + h + 700);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
    ctx.save();
    const lg = ctx.createLinearGradient(left + pw, 0, left + w, 0);
    lg.addColorStop(0, `rgba(255,236,196,${0.95 * gk})`);
    lg.addColorStop(1, `rgba(255,214,150,${0.75 * gk})`);
    ctx.fillStyle = lg;
    ctx.shadowColor = `rgba(255,210,140,${0.7 * gk})`;
    ctx.shadowBlur = 40;
    ctx.fillRect(left + pw, top, w - pw, h);
    ctx.restore();
  }
  // 门板：纸色 → 深色木门
  ctx.save();
  const c0 = [223, 211, 184], c1 = [40, 30, 23];
  const col = c0.map((v, i) => Math.round(lerp(v, c1[i], m)));
  ctx.fillStyle = `rgb(${col.join(',')})`;
  ctx.shadowColor = 'rgba(0,0,0,0.5)';
  ctx.shadowBlur = 18;
  ctx.fillRect(left, top, pw, h);
  ctx.restore();
  if (m > 0.5) {
    const a = smooth(prog(t, 99.8, 100.4));
    const o = { t, width: 1.4, color: C.lightSoft, alpha: a, passes: 1 };
    pencil(ctx, rectPts(left + pw * 0.14, top + 40, pw * 0.72, h * 0.36), { ...o, seed: 1110 });
    pencil(ctx, rectPts(left + pw * 0.14, top + h * 0.5, pw * 0.72, h * 0.4), { ...o, seed: 1111 });
    ctx.save();
    ctx.globalAlpha *= a;
    ctx.fillStyle = 'rgba(230,214,186,0.8)';
    ctx.beginPath(); ctx.arc(left + pw - 26, top + h * 0.52, 6, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
    // 门框
    pencil(ctx, [[left - 14, top + h], [left - 14, top - 14], [left + w + 14, top - 14], [left + w + 14, top + h]],
      { t, seed: 1112, width: 2.2, color: C.light, alpha: a });
  }
  ctx.restore();
}

function light(t) {
  const s = camScale(t);
  return { x: 960, y: 560, rx: lerp(820, 640, 1 - s), ry: lerp(500, 420, 1 - s), i: lerp(1, 0.78, smooth(prog(t, 100, 104))), w: smooth(prog(t, 99.0, 99.4)) };
}

module.exports = { ...S, draw, light };
