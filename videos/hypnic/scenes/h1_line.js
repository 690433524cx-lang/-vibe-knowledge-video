// A + B · 0.0–14.0 秒：一条金线、一个位置亮点、一个平躺的人体线稿。
//   第 0 帧：金线 + 亮点 + 很淡的人体 + 第一句字幕，完整可读。
//   1.5 s 起亮点开始轻微不稳（人体保持完全水平：身体没动，感觉系统先变了）。
//   3.0 s 前方断开，3.08 s 亮点下坠 145 px（约 13% 画面高度），留 0.25 s 细金残影；3.1 s 人体抽动一次。
//   5.7 s 亮点被拉回、断口重连；7.55 s 再抖一次，金色脉冲从身体中心扩散到四肢。
//   9.0–10.4 s 金线连续收缩成「清醒 → 入睡」时间轴；12.0 s 退到标题后面，12.4 s 标题出现时沿线一道波纹。
//   13.65 s 起交给 h3_axis（同一条线继续生长）。
const L = require('../lib');
const { FONT, G, rgba, lerp, prog, smooth, easeInOut, spring, impulse, env, noise1 } = L;

const S = { start: 0, end: 14.0 };

const LINE0 = { x0: 200, x1: 1720, y: 400 };
const AXIS_B = { x0: 560, x1: 1360, y: 380 };
const AXIS_C = { x0: 440, x1: 1480, y: 360 };
function geom(d) {
  const k1 = easeInOut(prog(d, 9.0, 10.4));
  let g = { x0: lerp(LINE0.x0, AXIS_B.x0, k1), x1: lerp(LINE0.x1, AXIS_B.x1, k1), y: lerp(LINE0.y, AXIS_B.y, k1), a: 1 };
  const k2 = easeInOut(prog(d, 11.9, 12.4));
  g.y = lerp(g.y, 290, k2);
  g.a = lerp(1, 0.3, k2);
  const k3 = easeInOut(prog(d, 13.65, 14.3));
  if (k3 > 0) g = { x0: lerp(g.x0, AXIS_C.x0, k3), x1: lerp(g.x1, AXIS_C.x1, k3), y: lerp(g.y, AXIS_C.y, k3), a: lerp(g.a, 1, k3) };
  return g;
}

const GAP = [1180, 1300];
const BREAK = 3.0, FALL0 = 3.08, FALL = 145, RECALL = 5.7;
const JERK1 = 3.1, JERK2 = 7.55;
const gapOpen = (d) => smooth(prog(d, BREAK, BREAK + 0.08)) * (1 - smooth(prog(d, RECALL + 0.05, RECALL + 0.3)));

function dotA(d) {
  // 0 起缓慢向右，1.5 s 后稍快，3.08 到达断口
  const k = prog(d, 0, FALL0);
  const f = k * k * (0.6 + 0.4 * k) + 0.25 * k * (1 - k);
  let x = 640 + (GAP[0] - 640) * f, y = LINE0.y;
  // 预兆：亮点轻微不稳
  const wob = smooth(prog(d, 1.5, 2.9)) * (d < FALL0 ? 1 : 0);
  y += wob * (noise1(d * 9, 3) * 2.6 + noise1(d * 23, 4) * 1.2);
  if (d > FALL0) {
    const t = d - FALL0;
    x = GAP[0] + 22 * (1 - Math.exp(-t * 9));
    y = LINE0.y + FALL * Math.min(1, (t / 0.2) ** 2);
  }
  if (d > RECALL) y = lerp(LINE0.y + FALL, LINE0.y, spring(d, RECALL, 3.4, 0.75));
  return [x, y, wob];
}
const U_RECALL = (GAP[0] + 22 - LINE0.x0) / (LINE0.x1 - LINE0.x0);
function dotU(d) {
  let u = lerp(U_RECALL, 0.07, easeInOut(prog(d, 9.0, 10.4)));
  if (d > 13.65) u = lerp(0.07, 0.02, prog(d, 13.65, 14.3));
  return u;
}

function bodyState(d) {
  const k = easeInOut(prog(d, 9.0, 10.4));
  const x = 660, y = lerp(800, 700, k);
  let a = 0.36;                                       // 第 0 帧就在，很淡
  if (d >= FALL0) a = lerp(0.95, 0.5, smooth(prog(d, FALL0 + 0.12, FALL0 + 0.8)));
  a *= 1 - smooth(prog(d, 11.9, 12.5));
  const jerk = Math.min(1, impulse(d, JERK1) + impulse(d, JERK2));
  const fl = (t0, k0, tau) => (d >= t0 ? k0 * Math.exp(-(d - t0) / tau) : 0);
  const flash = (fl(FALL0, 0.95, 0.14) + fl(JERK2, 0.6, 0.12)) * (1 - smooth(prog(d, 11.9, 12.2)));
  const pulse = prog(d, JERK2 + 0.02, JERK2 + 0.5);
  return { x, y, a, jerk, flash, pulse };
}

function seg(ctx, a, b, y, alpha) {
  if (b - a < 1) return;
  L.goldStroke(ctx, () => { ctx.beginPath(); ctx.moveTo(a, y); ctx.lineTo(b, y); ctx.stroke(); }, { a: alpha, w: 1.8, glow: 10, color: [226, 180, 102] });
}
function drawLine(ctx, d, g) {
  const open = gapOpen(d);
  const ahead = 1 - 0.4 * smooth(prog(d, 1.5, 2.9)) * (1 - smooth(prog(d, RECALL, RECALL + 0.3)));
  const dx = d < 9.0 ? dotA(d)[0] : null;
  const segs = [];
  const c = (GAP[0] + GAP[1]) / 2, half = ((GAP[1] - GAP[0]) / 2) * open;
  if (open > 0.001) segs.push([g.x0, c - half], [c + half, g.x1]);
  else segs.push([g.x0, g.x1]);
  for (const [a0, a1] of segs) {
    if (dx != null && dx > a0 && dx < a1) { seg(ctx, a0, dx, g.y, g.a); seg(ctx, dx, a1, g.y, g.a * ahead); }
    else seg(ctx, a0, a1, g.y, g.a * (dx != null && a0 >= dx ? ahead : 1));
  }
  if (open > 0.05) {
    L.goldStroke(ctx, () => {
      ctx.beginPath();
      ctx.moveTo(c - half, g.y - 8); ctx.lineTo(c - half, g.y + 8);
      ctx.moveTo(c + half, g.y - 8); ctx.lineTo(c + half, g.y + 8);
      ctx.stroke();
    }, { a: open * 0.9, w: 1.6, glow: 6 });
  }
  // 标题出现：沿线向两侧走一道很轻的金色波纹
  const rk = prog(d, 12.4, 13.1);
  if (rk > 0 && rk < 1) {
    for (const dir of [-1, 1]) {
      const px = 960 + dir * 700 * L.easeOut(rk);
      if (px < g.x0 - 20 || px > g.x1 + 20) continue;
      const gr = ctx.createRadialGradient(px, g.y, 0, px, g.y, 90);
      gr.addColorStop(0, rgba(G.brightRGB, 0.55 * (1 - rk)));
      gr.addColorStop(1, rgba(G.brightRGB, 0));
      ctx.fillStyle = gr;
      ctx.fillRect(px - 90, g.y - 12, 180, 24);
    }
  }
}

function drawAxisB(ctx, d, g) {
  const a = smooth(prog(d, 9.9, 10.3)) * g.a;
  if (a <= 0.003) return;
  L.node(ctx, g.x0, g.y, { r: 7.5, a, pop: prog(d, 9.9, 10.25) });
  L.node(ctx, g.x1, g.y, { r: 7.5, a: a * 0.8, pop: prog(d, 10.0, 10.35), hollow: true });
  const wake = 1 - smooth(prog(d, 11.9, 12.2));
  L.label(ctx, '清醒', 'AWAKE', g.x0, g.y - 34, { a: a * wake, zhPx: 37, enPx: 18, gap: 76 });
  L.label(ctx, '入睡', 'SLEEP', g.x1, g.y - 34, { a: a * 0.85 * wake, zhPx: 37, enPx: 18, gap: 76 });
}

function drawDot(ctx, d) {
  const g = geom(d);
  let x, y, wob = 0;
  if (d < 9.0) [x, y, wob] = dotA(d);
  else { const u = dotU(d); x = lerp(g.x0, g.x1, u); y = g.y; }
  // 下坠残影：0.25 s 内消失的细金线
  if (d > FALL0 && d < FALL0 + 0.5) {
    const fade = 1 - smooth(prog(d, FALL0 + 0.2, FALL0 + 0.45));
    const gr = ctx.createLinearGradient(0, LINE0.y, 0, y);
    gr.addColorStop(0, rgba(G.goldRGB, 0));
    gr.addColorStop(1, rgba(G.brightRGB, 0.85 * fade));
    ctx.save();
    ctx.strokeStyle = gr; ctx.lineWidth = 1.6;
    ctx.beginPath(); ctx.moveTo(GAP[0] + 2, LINE0.y); ctx.lineTo(x, y); ctx.stroke();
    ctx.restore();
  }
  // 拉回时的残影
  if (d > RECALL && d < RECALL + 0.4) {
    const fade = 1 - prog(d, RECALL, RECALL + 0.4);
    ctx.save();
    ctx.strokeStyle = rgba(G.goldRGB, 0.5 * fade); ctx.lineWidth = 1.4;
    ctx.beginPath(); ctx.moveTo(x, LINE0.y + FALL); ctx.lineTo(x, y); ctx.stroke();
    ctx.restore();
  }
  L.ripple(ctx, x, LINE0.y + FALL, d, FALL0 + 0.2, { dur: 0.6, r0: 12, r1: 60 });
  L.ripple(ctx, x, y, d, JERK2 + 0.05, { dur: 0.7, r0: 12, r1: 80 });
  const breathe = 1 + 0.1 * Math.sin(d * 2.4) + wob * 0.15 * noise1(d * 14, 9);
  L.node(ctx, x, y, { r: 9.75 * breathe, a: g.a, color: G.brightRGB });
  const la = env(d, -1, 2.75, 0.3, 0.25);
  if (la > 0.01) {
    L.text(ctx, '位置感', x, y - 34, { font: FONT.sans(28), color: G.text, a: la * 0.9, ls: 2 });
    L.text(ctx, 'POSITION', x, y + 46, { font: FONT.inter(16), color: G.grey, a: la * 0.9, ls: 4 });
  }
}

function draw(ctx, d) {
  const g = geom(d);
  const b = bodyState(d);
  L.body(ctx, b.x, b.y, { a: b.a, jerk: b.jerk, flash: b.flash, pulse: b.pulse, scale: 1.15 });
  drawLine(ctx, d, g);
  drawAxisB(ctx, d, g);
  drawDot(ctx, d);
}

module.exports = { ...S, draw, geom, dotU, AXIS_C };
