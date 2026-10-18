// 第十三幕 · 100.6–106.4 秒：回到开头那一排门。起初每扇都亮着；然后从两边开始，一扇一扇熄灭。
// 最后只剩一扇——不是因为它一定最好，而是它已经满足了最重要的三个条件（门上别着那张小纸）。
// 结尾 · 106.4–114.5 秒：一扇门，一束光，门慢慢再开一点。问题停在那里。
const { W, H, DESIGN_END } = require('../../../src/config');
const { C, FONT } = require('../../../src/lib/style');
const { pencil } = require('../../../src/lib/draw');
const { prog, smooth, easeInOut, lerp, rng, noise1 } = require('../../../src/lib/util');
const { spring } = require('../../../src/lib/motion');
const { sheet } = require('../../../src/lib/material');
const { door, jit } = require('../lib');

const S = { start: 100.5, end: DESIGN_END + 0.1 };
const N = 21, KEEP = 13, GAP = 108, FLOOR = 700;
const R = rng(2200);
const DOORS = Array.from({ length: N }, (_, i) => ({
  x: 960 + (i - (N - 1) / 2) * GAP + jit('end' + i, 8).x, side: R() < 0.5 ? -1 : 1, open: 0.45 + R() * 0.5, seed: 2210 + i, variant: R() < 0.3 ? 1 : 0,
  off: 0,
}));
// 熄灭顺序：离留下的那扇越远，越早熄
const order = DOORS.map((d, i) => i).filter((i) => i !== KEEP).sort((a, b) => Math.abs(b - KEEP) - Math.abs(a - KEEP));
order.forEach((i, j) => { DOORS[i].off = 101.0 + j * (3.2 / order.length) + R() * 0.1; });
DOORS[KEEP].off = 999;

// 摄影机：慢慢推向最后那扇门
function cam(t) {
  const k = easeInOut(prog(t, 101.2, 109.5));
  const x = DOORS[KEEP].x;
  return { cx: lerp(960, x - 120, k), cy: lerp(560, 520, k), s: lerp(1, 2.05, k) };
}

function draw(ctx, t) {
  const c = cam(t);
  const inA = smooth(prog(t, 100.5, 101.1));
  ctx.save();
  ctx.translate(W / 2, H / 2);
  ctx.scale(c.s, c.s);
  ctx.translate(-c.cx, -c.cy);
  // 地面：只在还亮着的门前有一点反光
  DOORS.forEach((d, i) => {
    const lit = i === KEEP ? 1 : 1 - smooth(prog(t, d.off, d.off + 0.5));
    const panelA = i === KEEP ? 1 : 0.35 + 0.65 * lit;
    const open = i === KEEP ? lerp(d.open, 1.0, smooth(prog(t, 106.8, 112.5))) : d.open;
    ctx.save();
    ctx.translate(d.x, FLOOR);
    door(ctx, 84, 168, { open, side: d.side, t, seed: d.seed, glow: (i === KEEP ? 1 : lit) * (1 + 0.04 * noise1(t * 2 + i, 2250 + i)), alpha: inA * panelA, variant: d.variant, frame: 0.4 + 0.6 * lit, spill: i === KEEP ? 1.4 : 1 });
    ctx.restore();
  });
  // 门上别着的那张小纸：三个勾
  const na = spring(t, 103.0, 1.4, 0.7);
  if (na > 0) {
    const d = DOORS[KEEP];
    ctx.save();
    ctx.globalAlpha *= Math.min(1, na * 1.5);
    ctx.translate(d.x - (d.side > 0 ? 12 : -12), FLOOR - 112);
    ctx.rotate(-0.06);
    sheet(ctx, 30, 40, { seed: 2260, tone: 'bone', light: -2.3, lift: 0.1, shade: 0.4, rough: 1 });
    for (let j = 0; j < 3; j++) {
      pencil(ctx, [[-10, -10 + j * 10], [-7, -7 + j * 10], [-2, -14 + j * 10]], { seed: 2270 + j, t, width: 0.8, color: 'rgba(40,32,26,0.9)', passes: 1, progress: prog(t, 103.3 + j * 0.15, 103.45 + j * 0.15) });
      pencil(ctx, [[1, -10 + j * 10], [10, -10 + j * 10]], { seed: 2280 + j, t, width: 0.6, color: 'rgba(40,32,26,0.5)', passes: 1 });
    }
    ctx.restore();
  }
  ctx.restore();
}

function light(t) {
  const c = cam(t);
  const d = DOORS[KEEP];
  const sx = W / 2 + (d.x + (d.side > 0 ? 34 : -34) - c.cx) * c.s, sy = H / 2 + (FLOOR - 90 - c.cy) * c.s;
  const row = 1 - smooth(prog(t, 101.0, 104.4));
  const end = smooth(prog(t, 106.8, 112.5));
  return [
    { x: 960, y: 650, rx: 1150, ry: 330, i: 0.85, w: smooth(prog(t, 100.5, 101.1)) * row },
    { x: sx, y: sy, rx: lerp(380, 560, end), ry: lerp(440, 620, end), i: lerp(0.85, 1, end), w: smooth(prog(t, 100.5, 101.1)), core: 0.18 },
  ];
}
function grade(t) { return { warm: 0.4, ambient: lerp(0.12, 0.08, smooth(prog(t, 104, 108))) }; }

module.exports = { ...S, draw, light, grade };
