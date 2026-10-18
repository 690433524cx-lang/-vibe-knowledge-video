// 第一幕 · 0–4.9 秒：黑暗里两扇门，第 0 帧就把问题抛出来。
// 两扇门一分为二、再一分为二……最后成为一整排门。4 秒左右全部停住。
const { W, H } = require('../../../src/config');
const props = require('../../../src/lib/props');
const { prog, smooth, easeInOut, lerp, rng } = require('../../../src/lib/util');

const S = { start: 0, end: 5.0 };
// 地面线：门变小时整体抬到画面中部
const floorY = (t) => lerp(770, 650, smooth(prog(Math.min(t, 3.9), 1.6, 3.4)));

// 复制阶段：[开始时间, 门数, 间距, 门宽]
const STAGES = [
  { at: -1, n: 2, gap: 420, w: 210 },
  { at: 1.0, n: 4, gap: 330, w: 170 },
  { at: 1.6, n: 8, gap: 200, w: 120 },
  { at: 2.2, n: 16, gap: 112, w: 72 },
  { at: 2.85, n: 32, gap: 78, w: 50 },
];
const DUR = 0.5;
const FREEZE = 3.9; // 3.9 起全部停住（约 0.3 秒视觉停顿）

const R = rng(808);
const DOORS = Array.from({ length: 32 }, (_, i) => ({ side: R() < 0.5 ? -1 : 1, open: 0.45 + R() * 0.55, seed: 20 + i }));
DOORS[0].side = -1; DOORS[1].side = 1;

const xOf = (st, i) => W / 2 + (i - (st.n - 1) / 2) * st.gap;

// 第 i 扇门当前的位置与大小：从「父门」的位置分裂出来
function layout(t, i) {
  let si = 0;
  for (let k = 1; k < STAGES.length; k++) if (t >= STAGES[k].at) si = k;
  const st = STAGES[si];
  if (i >= st.n) return null;
  const k = si > 0 ? easeInOut(prog(t, st.at, st.at + DUR)) : 1;
  const prev = STAGES[Math.max(0, si - 1)];
  const parent = Math.min(Math.floor(i / 2), prev.n - 1);
  // 两扇子门都从父门的位置分出来；奇数位的新门淡入
  const from = si > 0 ? { x: xOf(prev, parent), w: prev.w } : { x: xOf(st, i), w: st.w };
  const to = { x: xOf(st, i), w: st.w };
  return { x: lerp(from.x, to.x, k), w: lerp(from.w, to.w, k), a: si > 0 && i % 2 === 1 ? smooth(k * 2) : 1 };
}

// 镜头：第一秒轻推，之后随门变多慢慢后退一点
function camS(t) {
  const tt = Math.min(t, FREEZE);
  return lerp(lerp(1, 1.05, smooth(prog(tt, 0, 1.2))), 1.0, smooth(prog(tt, 2.2, 3.6)));
}

function draw(ctx, t) {
  const frozen = t >= FREEZE;
  const tt = frozen ? FREEZE : t;
  const out = 1 - smooth(prog(t, 4.3, 4.9)); // 4.3 起：中间几扇门交给第二幕变成菜单卡片
  const s = camS(t);
  ctx.save();
  ctx.translate(W / 2, 560);
  ctx.scale(s, s);
  ctx.translate(-W / 2, -560);
  // 地面线
  ctx.save();
  ctx.globalAlpha = 0.35 * out;
  ctx.strokeStyle = 'rgba(214,198,172,0.5)';
  ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(-200, floorY(tt)); ctx.lineTo(W + 200, floorY(tt)); ctx.stroke();
  ctx.restore();
  for (let i = 0; i < 32; i++) {
    const L = layout(tt, i);
    if (!L) continue;
    if (t >= 4.3 && isMenuDoor(i)) continue;
    const d = DOORS[i];
    // 第一秒：两扇门的门缝慢慢开大（第一秒画面就在变化）
    const open = d.open * lerp(0.15, 1, smooth(prog(tt, 0, 1.0)));
    ctx.save();
    ctx.translate(L.x, floorY(tt));
    props.door(ctx, L.w, L.w * 1.95, { open, side: d.side, t: tt, seed: d.seed, alpha: L.a * out, boil: !frozen, glow: 0.85 });
    ctx.restore();
  }
  ctx.restore();
}

// 32 扇门里正中间的 6 扇会变成外卖菜单卡片
const MENU_DOORS = [13, 14, 15, 16, 17, 18];
const isMenuDoor = (i) => MENU_DOORS.includes(i);
// 供第二幕使用：某扇门在屏幕上的矩形（门底中心 + 宽高）
function doorRect(i) {
  const st = STAGES[STAGES.length - 1];
  const s = camS(FREEZE);
  const x = W / 2 + (xOf(st, i) - W / 2) * s;
  const w = st.w * s, h = st.w * 1.95 * s;
  const y = 560 + (floorY(FREEZE) - 560) * s;
  return { x, y: y - h / 2, w, h };
}

function light(t) {
  const k = smooth(prog(t, 2.2, 3.6));
  return { x: 960, y: lerp(600, 560, k), rx: lerp(760, 1100, k), ry: lerp(470, 420, k), i: 1, w: 1 - smooth(prog(t, 4.3, 5.0)) };
}

module.exports = { ...S, draw, light, doorRect, MENU_DOORS };
