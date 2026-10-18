// 第一幕 · 0–4.9 秒：黑暗里两扇门，第 0 帧就把问题抛出来。
// 门偏在画面右侧，问题落在左下的留白里。两扇门一分为二、再一分为二……
// 每扇门有自己的重量和迟疑，最后成为一整排。3.9 秒全部停住。
const { W, H } = require('../../../src/config');
const { prog, smooth, lerp, rng, noise1 } = require('../../../src/lib/util');
const { spring } = require('../../../src/lib/motion');
const { withCam, toScreen, jit, door } = require('../lib');

const S = { start: 0, end: 5.0 };
const FREEZE = 3.9;

// 复制阶段：门数、中心、间距、门宽
const STAGES = [
  { at: -1, n: 2, cx: 1210, gap: 360, w: 215 },
  { at: 1.0, n: 4, cx: 1120, gap: 270, w: 170 },
  { at: 1.6, n: 8, cx: 1020, gap: 176, w: 118 },
  { at: 2.2, n: 16, cx: 990, gap: 128, w: 86 },
  { at: 2.85, n: 32, cx: 960, gap: 92, w: 62 },
];
const R = rng(808);
const DOORS = Array.from({ length: 32 }, (_, i) => ({
  side: R() < 0.5 ? -1 : 1, open: 0.4 + R() * 0.6, seed: 20 + i, delay: R() * 0.14, variant: R() < 0.3 ? 1 : 0,
}));
DOORS[0].side = -1; DOORS[0].open = 0.8; DOORS[1].side = 1; DOORS[1].open = 0.95;

const floorY = (t) => lerp(780, 660, smooth(prog(Math.min(t, FREEZE), 1.6, 3.4)));
const xOf = (st, i) => st.cx + (i - (st.n - 1) / 2) * st.gap + jit('dx' + st.n + ':' + i, st.gap * 0.06).x;

function layout(t, i) {
  let si = 0;
  for (let k = 1; k < STAGES.length; k++) if (t >= STAGES[k].at) si = k;
  const st = STAGES[si];
  if (i >= st.n) return null;
  const d = DOORS[i];
  // 门很重：临界阻尼弹簧，各扇门起步有先后
  const k = si > 0 ? Math.min(1, spring(t, st.at + d.delay, 1.5, 1.0)) : 1;
  const prev = STAGES[Math.max(0, si - 1)];
  const parent = Math.min(Math.floor(i / 2), prev.n - 1);
  const from = si > 0 ? { x: xOf(prev, parent), w: prev.w } : { x: xOf(st, i), w: st.w };
  const to = { x: xOf(st, i), w: st.w };
  const j = jit('door' + i, 1);
  return { x: lerp(from.x, to.x, k), w: lerp(from.w, to.w, k) * j.s, h: lerp(from.w, to.w, k) * (1.92 + j.k * 0.12), a: si > 0 && i % 2 === 1 ? smooth(k * 1.6) : 1 };
}

// 摄影机：第一秒轻轻推进，门变多时退回一点（像摄影机在找全景）
function cam(t) {
  const tt = Math.min(t, FREEZE);
  const push = spring(tt, 0, 0.45, 1.0);
  const pull = smooth(prog(tt, 2.0, 3.7));
  return { cx: lerp(lerp(990, 1010, push), 960, pull), cy: lerp(560, 545, pull), s: lerp(lerp(1, 1.045, push), 1.0, pull) };
}

function draw(ctx, t) {
  const frozen = t >= FREEZE;
  const tt = frozen ? FREEZE : t;
  const out = 1 - smooth(prog(t, 4.3, 4.9));
  const c = cam(t);
  withCam(ctx, c, 1, () => {
    const fy = floorY(tt);
    // 地面：门缝的光在地上的反射（很淡）
    ctx.save();
    ctx.globalAlpha = out;
    const fg = ctx.createLinearGradient(0, fy, 0, fy + 260);
    fg.addColorStop(0, 'rgba(60,48,38,0.35)');
    fg.addColorStop(1, 'rgba(20,16,13,0)');
    ctx.fillStyle = fg;
    ctx.fillRect(-300, fy, W + 600, 260);
    ctx.restore();
    for (let i = 0; i < 32; i++) {
      const L = layout(tt, i);
      if (!L) continue;
      if (t >= 4.3 && MENU_DOORS.includes(i)) continue;
      const d = DOORS[i];
      // 第一秒：两扇门的门缝慢慢开大
      const open = d.open * lerp(0.12, 1, spring(tt, 0.05, 0.7, 1.0));
      const flick = 1 + noise1(tt * 3 + i, 300 + i) * 0.04;
      ctx.save();
      ctx.translate(L.x, fy + jit('fy' + i, 3).y);
      door(ctx, L.w, L.h, { open, side: d.side, t: tt, seed: d.seed, alpha: L.a * out, boil: !frozen, glow: 0.95 * flick, variant: d.variant });
      ctx.restore();
    }
  });
}

// 32 扇门里中间的 6 扇会变成手机里的外卖列表
const MENU_DOORS = [13, 14, 15, 16, 17, 18];
function doorRect(i) {
  const L = layout(FREEZE, i);
  const c = cam(FREEZE);
  const [x, yb] = toScreen(c, L.x, floorY(FREEZE));
  return { x, y: yb - (L.h * c.s) / 2, w: L.w * c.s, h: L.h * c.s };
}

// 光：门缝就是光源。前两扇门各一道竖向的光；门多了以后变成一条横向的光带
function light(t) {
  const c = cam(Math.min(t, FREEZE));
  const w = 1 - smooth(prog(t, 4.3, 5.0));
  const k = smooth(prog(Math.min(t, FREEZE), 1.4, 3.2));
  const out = [];
  for (let i = 0; i < 2; i++) {
    const L = layout(Math.min(t, FREEZE), i);
    const [x, y] = toScreen(c, L.x + DOORS[i].side * L.w * 0.42, floorY(Math.min(t, FREEZE)) - L.h * 0.35);
    out.push({ x, y, rx: 300, ry: 520, i: 0.95, w: w * (1 - k), core: 0.12 });
  }
  const [bx, by] = toScreen(c, 975, floorY(Math.min(t, FREEZE)) - 60);
  out.push({ x: bx, y: by, rx: 1150, ry: 330, i: 0.9, w: w * k, core: 0.2 });
  return out;
}

function grade(t) { return { warm: 0.35, ambient: 0.1 }; }

module.exports = { ...S, draw, light, grade, doorRect, MENU_DOORS, cam };
