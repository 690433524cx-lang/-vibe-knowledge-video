// 第五幕 · 34.4 秒 – T：一张黑色档案纸上，「最好 / 最值 / 最合适 / 最正确 / 绝不后悔」不断压上来，
// 越来越多、越来越挤（视觉过载的顶点），但仍然读得清。46 秒起全部暗下去，只剩一个很小的暗红「选对」。
// T-1.0：字散去，剩下一张连满了线的选项网；T-0.6 所有线向中心收缩；T-0.15 静止，只剩一点暗红。
const { W, H, DESIGN_T: D } = require('../../../src/config');
const { C, FONT } = require('../../../src/lib/style');
const { prog, smooth, easeInOut, easeIn, lerp, rng, noise1 } = require('../../../src/lib/util');
const { spring } = require('../../../src/lib/motion');
const { sheet } = require('../../../src/lib/material');

const S = { start: 34.3, end: D - 1e-6 };

const CORE = ['最好', '最值', '最合适', '最正确', '绝不后悔'];
const EXTRA = ['最好', '最值', '最划算', '最合适', '最稳妥', '最正确', '绝不后悔', '万一后悔', '不能选错', '最优解', '最好的那个', '再比较一下'];
const FONTS = [(px) => FONT.serifBlack(px), (px) => FONT.body(px), (px) => FONT.serif(px), (px) => FONT.hand(px)];

// 词的排布：先是五个主词，位置与大小都不一样；之后越来越快、越来越挤
const WORDS = (() => {
  const r = rng(1500);
  const out = [];
  const anchors = [[560, 380, 150], [1260, 300, 112], [1340, 640, 128], [690, 700, 118], [1010, 500, 96]];
  CORE.forEach((w, i) => {
    out.push({ text: w, x: anchors[i][0], y: anchors[i][1], px: anchors[i][2], font: i === 4 ? 1 : 0, rot: (r() - 0.5) * 0.06, at: 34.45 + i * 0.5, a: 0.97, depth: 1 });
  });
  for (let i = 0; i < 46; i++) {
    const at = 38.4 + Math.pow(i / 46, 0.75) * 7.2;
    const px = 26 + r() * r() * 90;
    out.push({
      text: EXTRA[Math.floor(r() * EXTRA.length)], x: 220 + r() * 1480, y: 170 + r() * 720, px,
      font: Math.floor(r() * 4), rot: (r() - 0.5) * 0.14, at, a: 0.35 + r() * 0.5, depth: 1,
    });
  }
  // 前景：两三个很大、失焦的词从镜头前滑过
  out.push({ text: '最好', x: 300, y: 860, px: 260, font: 0, rot: -0.05, at: 42.4, a: 0.35, depth: 1.5, blur: 9 });
  out.push({ text: '不后悔', x: 1700, y: 220, px: 240, font: 2, rot: 0.04, at: 44.2, a: 0.3, depth: 1.5, blur: 10 });
  return out;
})();

function cam(t) {
  const k = easeInOut(prog(t, 34.6, D - 1.4));
  return { s: lerp(1, 1.08, k), dx: noise1(t * 0.15, 1501) * 14, dy: noise1(t * 0.15, 1502) * 8 };
}

// 选项网：T-1.0 出现，T-0.6 收缩，T-0.15 静止
const NODES = (() => {
  const r = rng(1600);
  return Array.from({ length: 30 }, (_, i) => {
    const a = r() * Math.PI * 2, d = 0.25 + r() * 0.75;
    return { x: 960 + Math.cos(a) * d * 720, y: 520 + Math.sin(a) * d * 330, at: D - 1.0 + r() * 0.14 };
  });
})();
const EDGES = (() => {
  const r = rng(1601);
  const out = [];
  for (let i = 0; i < 90; i++) out.push([Math.floor(r() * 30), Math.floor(r() * 30), D - 1.0 + r() * 0.2]);
  return out;
})();

function drawNetwork(ctx, t) {
  if (t < D - 1.0) return;
  const tt = Math.min(t, D - 0.45);               // T-0.45 起完全静止：留出接近黑的暗场
  const c = easeIn(prog(tt, D - 0.75, D - 0.48));  // 向中心收缩
  const pos = (n) => [lerp(n.x, 960, c), lerp(n.y, 520, c)];
  ctx.save();
  ctx.lineWidth = 1;
  for (const [a, b, at] of EDGES) {
    const k = smooth(prog(tt, at, at + 0.15));
    if (k <= 0 || a === b) continue;
    const [x0, y0] = pos(NODES[a]), [x1, y1] = pos(NODES[b]);
    ctx.strokeStyle = `rgba(214,198,172,${0.32 * k * (1 - c * 0.7)})`;
    ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(lerp(x0, x1, k), lerp(y0, y1, k)); ctx.stroke();
  }
  for (const n of NODES) {
    const k = smooth(prog(tt, n.at, n.at + 0.12));
    if (k <= 0) continue;
    const [x, y] = pos(n);
    ctx.fillStyle = `rgba(226,212,188,${0.75 * k * (1 - c)})`;
    ctx.fillRect(x - 3, y - 3, 6, 6);
  }
  // 中心那一点暗红
  ctx.fillStyle = C.subRed;
  ctx.shadowColor = 'rgba(200,70,50,0.6)';
  ctx.shadowBlur = 10;
  ctx.globalAlpha = 1 - 0.5 * smooth(prog(t, D - 0.45, D - 0.2));
  ctx.beginPath(); ctx.arc(960, 520, lerp(4, 6, c), 0, Math.PI * 2); ctx.fill();
  ctx.restore();
}

function draw(ctx, t) {
  const c = cam(t);
  const paperA = smooth(prog(t, 34.3, 34.9)) * (1 - smooth(prog(t, D - 1.0, D - 0.8)));
  ctx.save();
  ctx.translate(W / 2 + c.dx, H / 2 + c.dy);
  ctx.scale(c.s, c.s);
  ctx.translate(-W / 2, -H / 2);
  if (paperA > 0) {
    ctx.save();
    ctx.globalAlpha *= paperA;
    ctx.translate(960, 530);
    ctx.rotate(-0.012);
    sheet(ctx, 1720, 960, { seed: 1510, tone: 'charcoal', light: -2.3, lift: 0.05, shade: 0.4, crease: true });
    ctx.restore();
  }
  // 46 秒起：所有词暗下去
  const dim = smooth(prog(t, 46.0, 47.8));
  const gone = smooth(prog(t, D - 1.0, D - 0.82));
  for (const w of WORDS) {
    if (w.depth > 1) continue;
    const k = spring(t, w.at, 3.4, 0.8);           // 像被压上去：一点点回弹
    if (k <= 0) continue;
    const a = w.a * Math.min(1, smooth(prog(t, w.at, w.at + 0.18))) * (1 - dim * 0.85) * (1 - gone);
    if (a <= 0.003) continue;
    ctx.save();
    ctx.globalAlpha *= a;
    ctx.translate(w.x, w.y);
    ctx.rotate(w.rot);
    const s = lerp(1.06, 1, Math.min(1, k));
    ctx.scale(s, s);
    ctx.font = FONTS[w.font](w.px);
    ctx.letterSpacing = `${Math.round(w.px * 0.06)}px`;
    ctx.textAlign = 'center';
    ctx.fillStyle = w.font === 3 ? '#d9cdb5' : '#e3d8c2';
    ctx.fillText(w.text, 0, w.px * 0.35);
    ctx.restore();
  }
  // 只剩下：选对
  const xk = smooth(prog(t, 46.3, 47.0)) * (1 - smooth(prog(t, D - 1.0, D - 0.85)));
  if (xk > 0) {
    ctx.save();
    ctx.globalAlpha *= xk;
    ctx.font = FONT.serif(46);
    ctx.letterSpacing = '8px';
    ctx.textAlign = 'center';
    ctx.fillStyle = C.subRed;
    ctx.fillText('选对', 964, 536);
    ctx.restore();
  }
  ctx.restore();
}

// 前景层（不受光照遮罩影响太多）：失焦的大字从镜头前滑过
function drawOver(ctx, t) {
  const c = cam(t);
  const dim = smooth(prog(t, 46.0, 47.8));
  for (const w of WORDS) {
    if (w.depth <= 1) continue;
    const a = w.a * smooth(prog(t, w.at, w.at + 0.6)) * (1 - smooth(prog(t, w.at + 2.6, w.at + 3.6))) * (1 - dim);
    if (a <= 0.003) continue;
    ctx.save();
    ctx.globalAlpha = a;
    ctx.filter = `blur(${w.blur}px)`;
    ctx.translate(w.x + (t - w.at) * -40 * w.depth + c.dx * w.depth, w.y + c.dy * w.depth);
    ctx.rotate(w.rot);
    ctx.font = FONTS[w.font](w.px);
    ctx.textAlign = 'center';
    ctx.fillStyle = '#a99c86';
    ctx.fillText(w.text, 0, 0);
    ctx.restore();
  }
  drawNetwork(ctx, t);
}

function light(t) {
  const k = easeInOut(prog(t, D - 1.0, D - 0.75));
  return [
    { x: 960, y: 520, rx: lerp(1100, 760, smooth(prog(t, 46, 48))), ry: lerp(620, 420, smooth(prog(t, 46, 48))), i: lerp(0.95, 0.55, k), w: smooth(prog(t, 34.4, 35.2)) },
  ];
}
function grade(t) { return { warm: lerp(-0.1, 0.05, smooth(prog(t, 40, 46))), ambient: lerp(0.12, 0.06, smooth(prog(t, D - 1, D - 0.5))) }; }

module.exports = { ...S, draw, drawOver, light, grade };
