// 第二核心观点 + 第十四幕 · 91.4–102.9 秒。
//   一张纸上叠着三句判断：我就是不行 / 不会有人喜欢我 / 我什么都做不好。一根红铅笔把它们一条条划掉（起笔重、收笔轻）。
//   96.6 换一张新纸。最上面写：最坏会发生什么？下面三个问题一条一条写出来；
//   每写一条，台灯照亮的范围就大一圈——画面里的黑暗缩小一点。没有教程腔，问题本身就是画面。
const { W, H } = require('../../../src/config');
const { FONT } = require('../../../src/lib/style');
const { prog, smooth, lerp, easeInOut } = require('../../../src/lib/util');
const { pencil } = require('../../../src/lib/draw');
const { sheet } = require('../../../src/lib/material');
const { STRIKE } = require('./p12_life');

const S = { start: 91.35, end: 103.1 };
const SWAP = 96.6;
const LINES = [
  { s: '我就是不行', y: 455, at: 92.0 },
  { s: '不会有人喜欢我', y: 635, at: 92.65 },
  { s: '我什么都做不好', y: 815, at: 93.3 },
];
const QS = [
  { s: '1.  它真的一定会发生吗？', y: 500, at: 98.0 },
  { s: '2.  如果发生了，我能做什么？', y: 640, at: 99.6 },
  { s: '3.  除了最坏，还有没有别的可能？', y: 780, at: 101.2 },
];

function written(ctx, s, x, y, font, color, k) {
  if (k <= 0) return;
  ctx.save();
  ctx.font = font;
  const w = ctx.measureText(s).width;
  ctx.beginPath(); ctx.rect(x - 10, y - 140, (w + 20) * Math.min(1, k), 200); ctx.clip();
  ctx.fillStyle = color;
  ctx.fillText(s, x, y);
  ctx.restore();
}

function page1(ctx, t) {
  const out = easeInOut(prog(t, SWAP, SWAP + 0.6));
  if (out >= 1) return;
  ctx.save();
  ctx.translate(-out * 1300, 0);
  ctx.globalAlpha *= 1 - out * 0.6;
  ctx.save(); ctx.translate(960, 620); ctx.rotate(-0.015);
  sheet(ctx, 1340, 1260, { seed: 1401, tone: 'cream', light: -2.3, lift: 0.08, shade: 0.45 });
  ctx.restore();
  for (const L of LINES) {
    ctx.save();
    ctx.font = FONT.hand(100);
    ctx.fillStyle = 'rgba(44,36,32,0.9)';
    ctx.fillText(L.s, STRIKE[0][0], L.y);
    const w = ctx.measureText(L.s).width;
    ctx.restore();
    // 红铅笔划掉：起笔重、收笔轻，略微斜
    pencil(ctx, [[STRIKE[0][0] - 20, L.y - 32], [STRIKE[0][0] + w * 0.5, L.y - 38], [STRIKE[0][0] + w + 30, L.y - 30]],
      { t, seed: 1410 + L.y, width: 7, color: 'rgba(170,40,30,0.92)', progress: easeInOut(prog(t, L.at, L.at + 0.38)), pressure: 0.9, passes: 2 });
  }
  ctx.restore();
}

function page2(ctx, t) {
  const inn = easeInOut(prog(t, SWAP + 0.05, SWAP + 0.7));
  if (inn <= 0) return;
  ctx.save();
  ctx.translate((1 - inn) * 1300, 0);
  ctx.save(); ctx.translate(960, 600); ctx.rotate(0.01);
  sheet(ctx, 1400, 1300, { seed: 1402, tone: 'bone', light: -2.3, lift: 0.08, shade: 0.4 });
  ctx.restore();
  written(ctx, '最坏会发生什么？', 380, 320, FONT.hand(92), 'rgba(44,36,32,0.95)', prog(t, 96.9, 97.6));
  pencil(ctx, [[380, 350], [1010, 344]], { t, seed: 1420, width: 3, color: 'rgba(44,36,32,0.7)', progress: prog(t, 97.6, 97.85), pressure: 0.6 });
  for (const q of QS) written(ctx, q.s, 400, q.y, FONT.hand(64), 'rgba(48,40,34,0.92)', prog(t, q.at, q.at + 0.75));
  ctx.restore();
}

function draw(ctx, t) {
  ctx.save();
  ctx.globalAlpha *= smooth(prog(t, 91.4, 91.75)) * (1 - smooth(prog(t, 102.6, 103.05)));
  ctx.fillStyle = '#251c15';
  ctx.fillRect(0, 0, W, H);
  const push = 1 + 0.02 * prog(t, 91.4, 103);
  ctx.translate(W / 2, H / 2); ctx.scale(push, push); ctx.translate(-W / 2, -H / 2);
  page1(ctx, t);
  page2(ctx, t);
  ctx.restore();
}

// 光：一盏台灯。换纸之后，每多一个问题，光圈就大一圈，暗部也抬一点
function opened(t) { return QS.reduce((n, q) => n + smooth(prog(t, q.at, q.at + 0.8)), 0); }
function light(t) {
  const w = smooth(prog(t, 91.4, 91.75)) * (1 - smooth(prog(t, 102.6, 103.05)));
  const n = opened(t);
  return [{ x: 900, y: 520, rx: 760 + n * 210, ry: 520 + n * 150, i: 0.95, w, color: [255, 216, 168], core: 0.25 + n * 0.08 }];
}
function grade(t) { return { warm: 0.25 + opened(t) * 0.05, ambient: 0.07 + opened(t) * 0.03 }; }

module.exports = { ...S, draw, light, grade };
