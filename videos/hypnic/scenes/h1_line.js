// A + B · 0.0–14.0 秒：一条金线和一个位置亮点。
//   第 0 帧：金线 + 亮点 + 第一句字幕，完整可读。
//   2.95 s 前方断开，3.12 s 亮点下坠 108 px，人体轮廓闪现并抽动一次（只一次）。
//   6.0 s 亮点弹回、断口长回，金线缩成「清醒 → 入睡」时间轴；8.6 s 再抖一次，亮点被弹回清醒端。
//   11.6 s 退后、上移，给名字让位；14.0 s 交给 h3_axis（同一条线继续生长）。
const L = require('../lib');
const { FONT, G, rgba, lerp, clamp, prog, smooth, easeInOut, easeOut, spring, impulse, env } = L;

const S = { start: 0, end: 14.0 };

// 开场线 → 时间轴 → （退后）→ h3 的三段状态轴。h3 用同一个函数接着画。
const LINE0 = { x0: 200, x1: 1720, y: 430 };
const AXIS_B = { x0: 560, x1: 1360, y: 400 };
const AXIS_C = { x0: 460, x1: 1460, y: 380 };
function geom(d) {
  let g = { ...LINE0, a: 1 };
  const k1 = easeInOut(prog(d, 6.4, 7.2));
  g = { x0: lerp(LINE0.x0, AXIS_B.x0, k1), x1: lerp(LINE0.x1, AXIS_B.x1, k1), y: lerp(LINE0.y, AXIS_B.y, k1), a: 1 };
  const k2 = easeInOut(prog(d, 11.6, 12.3));
  g.y = lerp(g.y, 250, k2);
  g.a = lerp(1, 0.16, k2);
  const k3 = easeInOut(prog(d, 14.0, 14.7));
  if (k3 > 0) g = { x0: lerp(g.x0, AXIS_C.x0, k3), x1: lerp(g.x1, AXIS_C.x1, k3), y: lerp(g.y, AXIS_C.y, k3), a: lerp(g.a, 1, k3) };
  return g;
}

// 断口
const GAP = [1180, 1290];
function gapOpen(d) {
  return smooth(prog(d, 2.95, 3.07)) * (1 - smooth(prog(d, 6.05, 6.35)));
}

// 亮点：A 段用屏幕坐标，B 段起用轴上的比例 u
const FALL0 = 3.12, FALL = 108;
function dotA(d) {
  // 0.8 起缓慢向右，3.12 到达断口
  const k = prog(d, 0.8, FALL0);
  const f = k * k * (1.5 - 0.5 * k);
  let x = 700 + (GAP[0] - 700) * f, y = LINE0.y;
  if (d > FALL0) {
    const t = d - FALL0;
    x = GAP[0] + 26 * (1 - Math.exp(-t * 9));
    y = LINE0.y + FALL * Math.min(1, (t / 0.22) ** 2);
  }
  if (d > 6.0) y = lerp(LINE0.y + FALL, LINE0.y, spring(d, 6.0, 2.4, 0.7));
  return [x, y];
}
function dotU(d) {
  // B：从开场位置滑到 u = 0.10，再慢慢走向「入睡」；8.6 抽动后被弹回清醒端
  const u0 = (GAP[0] + 26 - LINE0.x0) / (LINE0.x1 - LINE0.x0);
  let u = lerp(u0, 0.1, easeInOut(prog(d, 6.4, 7.2)));
  u = lerp(u, 0.62, easeInOut(prog(d, 7.3, 8.6)));
  if (d > JERK2) u = lerp(0.62, 0.05, spring(d, JERK2, 2.0, 0.78));
  // C 段由 h3 接管，这里只给出交接位置
  if (d > 14.0) u = lerp(0.05, 0.02, prog(d, 14.0, 14.7));
  return u;
}
const JERK1 = 3.17, JERK2 = 8.6;

function bodyState(d) {
  // A：坠落瞬间闪现；B：移到时间轴下方，淡淡地留着
  const k = easeInOut(prog(d, 6.4, 7.2));
  const x = lerp(700, 700, k), y = lerp(770, 720, k);
  let a = 0;
  if (d >= FALL0) a = lerp(0.85, 0.24, smooth(prog(d, FALL0 + 0.15, FALL0 + 0.75)));
  a = lerp(a, 0.42, smooth(prog(d, 6.4, 7.2)));
  a *= 1 - smooth(prog(d, 11.6, 12.4));
  const jerk = Math.min(1, impulse(d, JERK1) + impulse(d, JERK2));
  const flash = 0.9 * Math.exp(-Math.max(0, d - FALL0) / 0.12) * (d >= FALL0 ? 1 : 0) + 0.75 * Math.exp(-Math.max(0, d - JERK2) / 0.14) * (d >= JERK2 ? 1 : 0);
  return { x, y, a, jerk, flash: flash * (1 - smooth(prog(d, 11.6, 12.0))) };
}

function drawLine(ctx, d, g) {
  const open = gapOpen(d);
  // 前方的线在快睡着时慢慢变暗
  const ahead = 1 - 0.5 * smooth(prog(d, 1.6, 2.9)) * (1 - smooth(prog(d, 6.0, 6.4)));
  const dx = d < 6.4 ? dotA(d)[0] : null;
  const segs = [];
  if (open > 0.001) {
    const c = (GAP[0] + GAP[1]) / 2, half = ((GAP[1] - GAP[0]) / 2) * open;
    segs.push([g.x0, c - half], [c + half, g.x1]);
  } else segs.push([g.x0, g.x1]);
  for (const [a0, a1] of segs) {
    if (dx != null && dx > a0 && dx < a1) {
      seg(ctx, a0, dx, g.y, g.a);
      seg(ctx, dx, a1, g.y, g.a * ahead);
    } else seg(ctx, a0, a1, g.y, g.a * (dx != null && a0 >= dx ? ahead : 1));
  }
  // 断口两端的短竖头
  if (open > 0.05) {
    const c = (GAP[0] + GAP[1]) / 2, half = ((GAP[1] - GAP[0]) / 2) * open;
    L.goldStroke(ctx, () => {
      ctx.beginPath();
      ctx.moveTo(c - half, g.y - 7); ctx.lineTo(c - half, g.y + 7);
      ctx.moveTo(c + half, g.y - 7); ctx.lineTo(c + half, g.y + 7);
      ctx.stroke();
    }, { a: open * 0.8, w: 1.5, glow: 6 });
  }
}
function seg(ctx, a, b, y, alpha) {
  if (b - a < 1) return;
  L.goldStroke(ctx, () => { ctx.beginPath(); ctx.moveTo(a, y); ctx.lineTo(b, y); ctx.stroke(); }, { a: 0.9 * alpha, w: 1.6, glow: 8 });
}

// 时间轴（B）：两端节点 + 标签；线从左亮到右暗
function drawAxisB(ctx, d, g) {
  const a = smooth(prog(d, 6.9, 7.3)) * g.a;
  if (a <= 0.003) return;
  const ring = smooth(prog(d, 9.95, 10.1)) * (1 - smooth(prog(d, 11.0, 11.6)));
  L.node(ctx, g.x0, g.y, { r: 6, a, pop: prog(d, 6.9, 7.3), ring });
  L.node(ctx, g.x1, g.y, { r: 6, a: a * 0.75, pop: prog(d, 7.0, 7.4), hollow: true });
  const wake = 1 - smooth(prog(d, 11.6, 12.0));
  L.label(ctx, '清醒', 'AWAKE', g.x0, g.y - 30, { a: a * wake, color: ring > 0.2 ? L.G.bright : L.G.text, gap: 66 });
  L.label(ctx, '入睡', 'SLEEP', g.x1, g.y - 30, { a: a * 0.85 * wake, gap: 66 });
  L.ripple(ctx, g.x0, g.y, d, 9.95, { dur: 0.7, r0: 10, r1: 70 });
}

function drawDot(ctx, d) {
  const g = geom(d);
  let x, y;
  if (d < 6.4) [x, y] = dotA(d);
  else { const u = dotU(d); x = lerp(g.x0, g.x1, u); y = g.y; }
  const a = g.a;
  // 坠落残影：一条竖直的渐隐金线
  if (d > FALL0 && d < 6.2) {
    const fade = 1 - smooth(prog(d, FALL0 + 0.25, FALL0 + 1.4));
    const back = 1 - smooth(prog(d, 6.0, 6.2));
    if (fade * back > 0.01) {
      const gr = ctx.createLinearGradient(0, LINE0.y, 0, y);
      gr.addColorStop(0, rgba(G.goldRGB, 0));
      gr.addColorStop(1, rgba(G.goldRGB, 0.7 * fade * back));
      ctx.save();
      ctx.strokeStyle = gr; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(GAP[0] + 4, LINE0.y); ctx.lineTo(x, y); ctx.stroke();
      ctx.restore();
    }
  }
  // 被弹回时的拖尾
  if (d > JERK2 && d < JERK2 + 0.8) {
    const tail = 1 - prog(d, JERK2, JERK2 + 0.8);
    for (let i = 1; i <= 8; i++) {
      const u = dotU(d - i * 0.025);
      L.node(ctx, lerp(g.x0, g.x1, u), g.y, { r: 5 - i * 0.4, a: a * tail * (0.5 - i * 0.05), color: G.goldRGB });
    }
  }
  const breathe = 1 + 0.12 * Math.sin(d * 2.4);
  L.node(ctx, x, y, { r: 7.5 * breathe, a, color: G.brightRGB });
  // 亮点旁的小标签：位置感
  const la = env(d, -1, 2.65, 0.3, 0.3);
  if (la > 0.01) {
    L.text(ctx, '位置感', x, y - 30, { font: FONT.sans(24), color: G.text, a: la * 0.85, ls: 2 });
    L.text(ctx, 'POSITION', x, y + 40, { font: FONT.inter(15), color: G.grey, a: la * 0.85, ls: 4 });
  }
}

function draw(ctx, d) {
  const g = geom(d);
  const b = bodyState(d);
  L.body(ctx, b.x, b.y, { a: b.a, jerk: b.jerk, flash: b.flash });
  drawLine(ctx, d, g);
  drawAxisB(ctx, d, g);
  drawDot(ctx, d);
}

module.exports = { ...S, draw, geom, dotU, AXIS_C };
