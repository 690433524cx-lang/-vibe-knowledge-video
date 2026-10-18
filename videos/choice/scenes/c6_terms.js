// 第六幕 · 56.9–64.6 秒：「选对」缩成研究笔记右上角的一枚小印。
// 摄影机退后，看到这是一页研究笔记：标题 CHOICE OVERLOAD / 选择过载，一张手画的曲线；
// 镜头沿着纸往下摇，第二个关键词 PARADOX OF CHOICE / 选择悖论，页脚一条脚注。
const { W, H } = require('../../../src/config');
const { C, FONT } = require('../../../src/lib/style');
const { pencil } = require('../../../src/lib/draw');
const { prog, smooth, easeInOut, lerp } = require('../../../src/lib/util');
const { spring } = require('../../../src/lib/motion');
const { sheet, inkText } = require('../../../src/lib/material');

const S = { start: 56.9, end: 64.9 };
const PAGE = { x: 1290, y: 600, w: 1040, h: 1420, rot: 0.012 };

// 一行字从左到右「打」出来（按宽度裁切）
function reveal(ctx, k, x, y, w, h, fn) {
  if (k <= 0) return;
  ctx.save();
  ctx.beginPath();
  ctx.rect(x - 6, y - h, (w + 12) * Math.min(1, k), h * 1.6);
  ctx.clip();
  fn();
  ctx.restore();
}

function cam(t) {
  const back = spring(t, 56.9, 0.7, 1.0);              // 从「选对」那张纸退出来
  const pan = easeInOut(prog(t, 60.0, 61.1));           // 沿纸往下摇
  return { s: lerp(1.25, 1, Math.min(1, back)) * (1 + 0.025 * smooth(prog(t, 61.2, 64.6))), dy: -pan * 360 };
}

function draw(ctx, t) {
  const c = cam(t);
  const a = smooth(prog(t, 57.2, 58.0)) * (1 - smooth(prog(t, 64.2, 64.9)));
  if (a <= 0) return;
  ctx.save();
  ctx.globalAlpha *= a;
  ctx.translate(W / 2, H / 2);
  ctx.scale(c.s, c.s);
  ctx.translate(-W / 2, -H / 2 + c.dy);
  ctx.save();
  ctx.translate(PAGE.x, PAGE.y);
  ctx.rotate(PAGE.rot);
  sheet(ctx, PAGE.w, PAGE.h, { seed: 1601, tone: 'bone', light: -2.4, lift: 0.04, shade: 0.45, crease: true });
  ctx.restore();
  const L = PAGE.x - PAGE.w / 2 + 70, top = PAGE.y - PAGE.h / 2;
  ctx.save();
  ctx.translate(PAGE.x, PAGE.y); ctx.rotate(PAGE.rot); ctx.translate(-PAGE.x, -PAGE.y);
  inkText(ctx, 'RESEARCH NOTES  —  FILE 08', L, top + 150, { font: FONT.type(17), color: '#6b5e52', seed: 1602, wear: 0.9 });
  inkText(ctx, 'p. 12', PAGE.x + PAGE.w / 2 - 70, top + 150, { font: FONT.type(17), color: '#6b5e52', align: 'right', seed: 1603, wear: 0.9 });
  ctx.fillStyle = 'rgba(60,48,40,0.3)';
  ctx.fillRect(L, top + 168, PAGE.w - 140, 1);
  // 右上角那枚小印（由「选对」缩成）
  if (t > 57.75) {
    const stamp = require('./cx_climax').STAMP;
    ctx.save();
    ctx.translate(1660, 330);
    ctx.rotate(-0.04);
    ctx.scale(0.12, 0.12);
    ctx.drawImage(stamp, -550, -290);
    ctx.restore();
  }
  // 第一个术语：像研究报告的标题
  reveal(ctx, prog(t, 57.4, 58.1), L, top + 330, 640, 60, () =>
    inkText(ctx, 'CHOICE OVERLOAD', L, top + 330, { font: FONT.enMed(58), color: '#231c17', seed: 1604, wear: 0.35, spacing: 9 }));
  inkText(ctx, '选择过载', L, top + 386, { font: FONT.body(30), color: '#4a3d33', seed: 1605, wear: 0.3, spacing: 10, alpha: smooth(prog(t, 58.0, 58.5)) });
  inkText(ctx, '¹', L + 158, top + 372, { font: FONT.en(22), color: '#4a3d33', seed: 1606, alpha: smooth(prog(t, 58.2, 58.6)) });
  // 手画的曲线：选项越多，做出决定的人先多后少
  const ox = L + 30, oy = top + 760, cw = 760, ch = 270;
  const ak = prog(t, 58.2, 58.7);
  pencil(ctx, [[ox, oy - ch], [ox, oy], [ox + cw, oy]], { seed: 1610, t, width: 1.6, color: 'rgba(48,40,34,0.75)', progress: ak, passes: 1, pressure: 0.5 });
  const curve = [];
  for (let i = 0; i <= 40; i++) {
    const u = i / 40;
    curve.push([ox + 20 + u * (cw - 40), oy - 40 - ch * 0.78 * Math.pow(Math.sin(Math.min(1, u * 1.9) * Math.PI / 2), 1.2) * Math.exp(-Math.max(0, u - 0.3) * 2.3)]);
  }
  pencil(ctx, curve, { seed: 1611, t, width: 2.4, color: 'rgba(40,32,26,0.9)', progress: prog(t, 58.6, 59.8), pressure: 0.7 });
  const lk = smooth(prog(t, 59.2, 59.7));
  inkText(ctx, '选项越来越多 →', ox + cw, oy + 40, { font: FONT.body(22), color: '#6b5e52', align: 'right', seed: 1612, alpha: lk, spacing: 2 });
  inkText(ctx, '真正做出决定', ox + 16, oy - ch - 14, { font: FONT.body(22), color: '#6b5e52', seed: 1613, alpha: lk, spacing: 2 });
  // 第二个术语：论文里的关键词
  reveal(ctx, prog(t, 61.0, 61.8), L, top + 1010, 640, 54, () =>
    inkText(ctx, 'PARADOX OF CHOICE', L, top + 1010, { font: FONT.enMed(48), color: '#231c17', seed: 1620, wear: 0.35, spacing: 8 }));
  inkText(ctx, '选择悖论', L, top + 1060, { font: FONT.body(30), color: '#4a3d33', seed: 1621, wear: 0.3, spacing: 10, alpha: smooth(prog(t, 61.7, 62.2)) });
  // 页脚的脚注
  ctx.fillStyle = 'rgba(60,48,40,0.3)';
  ctx.fillRect(L, top + 1230, 220, 1);
  inkText(ctx, '¹ 选项多到一定程度以后，做出决定反而变难。', L, top + 1270, { font: FONT.body(22), color: '#5a4c40', seed: 1622, wear: 0.4, spacing: 1, alpha: smooth(prog(t, 62.4, 63.0)) });
  ctx.restore();
  ctx.restore();
}

function light(t) {
  const c = cam(t);
  return [{ x: 1250, y: lerp(470, 560, smooth(prog(t, 60, 61.1))), rx: 900, ry: 640, i: 0.95, w: smooth(prog(t, 57.4, 58.2)) * (1 - smooth(prog(t, 64.2, 64.9))), rot: 0.2 }];
}
function grade(t) { return { warm: 0.2, ambient: 0.1 }; }

module.exports = { ...S, draw, light, grade };
