// C + D · 14.0–34.6 秒：入睡是过渡，多个系统同时降档；然后看清每个系统在做什么。
//   14.0 开场那条线落到中上方，中间长出「困倦」：清醒 → 困倦 → 睡眠；亮点从清醒走到困倦。
//   15.9 从「困倦」节点向下长出主干；17.6 主干一分为四：呼吸 / 心率 / 肌肉张力 / 清醒水平。
//   20.0 起镜头缓慢推进整个系统；四个小指标依次展开成数据曲线：呼吸 → 心率 → 肌肉张力 → 清醒水平。
//   27.7 「肌肉也开始放松」：肌肉张力节点提亮，其余变暗。
//   32.6–34.6 推进到肌肉张力：其余结构放大、淡出；肌肉张力节点和它的曲线移到中央，交给 h4。
const L = require('../lib');
const { FONT, G, rgba, lerp, clamp, prog, smooth, easeOut, easeInOut } = L;
const H1 = require('./h1_line');

const S = { start: 14.0, end: 34.6 };

function dotU(d) {
  let u = H1.dotU(Math.min(d, 14.3));
  u = lerp(u, 0.5, easeInOut(prog(d, 14.4, 16.4)));
  return u;
}

// 镜头：20 s 起缓慢推进整个系统
const CAM = { cx: 960, cy: 560 };
const camS = (d) => lerp(1, 1.05, easeInOut(prog(d, 20.0, 26.0)));
const toScreen = (d, p) => { const s = camS(d); return [CAM.cx + (p[0] - CAM.cx) * s, CAM.cy + (p[1] - CAM.cy) * s]; };

function drawAxis(ctx, d, g, a0) {
  const a = g.a * a0;
  const gr = ctx.createLinearGradient(g.x0, 0, g.x1, 0);
  gr.addColorStop(0, rgba([226, 180, 102], a));
  gr.addColorStop(1, rgba([226, 180, 102], 0.45 * a));
  ctx.save();
  ctx.strokeStyle = gr; ctx.lineWidth = 1.8; ctx.lineCap = 'round';
  ctx.shadowColor = rgba(G.goldRGB, 0.55 * a); ctx.shadowBlur = 10;
  ctx.beginPath(); ctx.moveTo(g.x0, g.y); ctx.lineTo(g.x1, g.y); ctx.stroke();
  ctx.restore();
  const xm = lerp(g.x0, g.x1, 0.5);
  const arrive = smooth(prog(d, 16.2, 16.45)) * (1 - smooth(prog(d, 16.9, 17.6)));
  L.node(ctx, g.x0, g.y, { r: 7.5, a });
  L.node(ctx, xm, g.y, { r: 7.5, a: a * 0.9, pop: prog(d, 14.25, 14.6), ring: arrive });
  L.node(ctx, g.x1, g.y, { r: 7.5, a: a * 0.75, hollow: true });
  const la = smooth(prog(d, 14.1, 14.45)) * a0;
  const P = { a: la, zhPx: 44, enPx: 18, gap: 80 };
  L.label(ctx, '清醒', 'AWAKE', g.x0, g.y - 36, P);
  L.label(ctx, '困倦', 'DROWSY', xm, g.y - 36, { ...P, a: la * smooth(prog(d, 14.35, 14.7)), color: arrive > 0.3 ? G.bright : G.text });
  L.label(ctx, '睡眠', 'SLEEP', g.x1, g.y - 36, { ...P, a: la * 0.85 });
  for (const u of [0.25, 0.75]) {
    const x = lerp(g.x0, g.x1, u);
    L.goldStroke(ctx, () => { ctx.beginPath(); ctx.moveTo(x - 6, g.y - 7); ctx.lineTo(x + 2, g.y); ctx.lineTo(x - 6, g.y + 7); ctx.stroke(); }, { a: la * 0.7, w: 1.6, glow: 4 });
  }
}

// ---------- 主干 + 四条支线 ----------
const BR = [
  { zh: '呼吸', en: 'RESPIRATION', x: 480, fn: L.CURVE.resp, on: 23.9 },
  { zh: '心率', en: 'HEART RATE', x: 800, fn: L.CURVE.heart, on: 25.8 },
  { zh: '肌肉张力', en: 'MUSCLE TONE', x: 1120, fn: (u) => L.CURVE.muscle(u), on: 27.7 },
  { zh: '清醒水平', en: 'AROUSAL', x: 1440, fn: L.CURVE.arousal, on: 30.0 },
];
const MUSCLE = 2;
const TRUNK0 = 15.9, TRUNK1 = 16.9, SPLIT = 17.6, BSTEP = 0.3;
const SY = 520, NY = 640, IY = 812;
const chartRect = (x) => ({ x0: x - 120, x1: x + 120, y0: 770, y1: 852 });
const MUSCLE_K = 0.7;   // D 段肌肉曲线只画到 0.7，E 段继续往下
// E 段的大图（h4 用同一组数字）
const BIG = { x0: 380, x1: 1540, y0: 300, y1: 640 };
const bigStart = () => L.rectPt(BIG, 0, L.CURVE.muscle(0));

// 节点亮度：27.7 起肌肉张力最亮，其他变暗；30.0 清醒水平短暂回到正常亮度
function emphasis(d, i) {
  const hi = smooth(prog(d, 27.7, 28.4));
  if (i === MUSCLE) return 1;
  let a = lerp(1, 0.38, hi);
  if (i === 3) a = lerp(a, 0.9, smooth(prog(d, 29.9, 30.3)) * (1 - smooth(prog(d, 32.2, 32.8))));
  return a;
}

function arrowDown(ctx, x, y, a) {
  L.goldStroke(ctx, () => {
    ctx.beginPath();
    ctx.moveTo(x, y - 22); ctx.lineTo(x, y);
    ctx.moveTo(x - 6, y - 7); ctx.lineTo(x, y); ctx.lineTo(x + 6, y - 7);
    ctx.stroke();
  }, { a, w: 1.8, glow: 4 });
}

// 17.6 起的小指标；对应系统的曲线展开时淡出
function indicator(ctx, i, x, y, d, a) {
  if (a <= 0.003) return;
  const w = 190, t = d - SPLIT;
  ctx.save();
  if (i === 0) {
    const amp = 15 * (1 - 0.4 * prog(d, 18.5, 23.5));
    const pts = [];
    for (let k = 0; k <= 64; k++) {
      const ph = (k / 64) * 2.4 * Math.PI * 2 * lerp(1.0, 0.6, k / 64) - t * 2.2;
      pts.push([x - w / 2 + (w * k) / 64, y + Math.sin(ph) * amp]);
    }
    L.goldStroke(ctx, () => L.polyPartial(ctx, pts, 1), { a: a * 0.9, w: 1.7, glow: 5 });
  } else if (i === 1) {
    const per = lerp(0.8, 1.05, prog(d, 18.5, 23.5));
    const pts = [];
    for (let k = 0; k <= 100; k++) {
      const ph = (((k / 100) * 2.2 + t * 0.9) % per) / per;
      let yy = 0;
      if (ph > 0.42 && ph < 0.47) yy = -22 * Math.sin(((ph - 0.42) / 0.05) * Math.PI);
      else if (ph > 0.47 && ph < 0.52) yy = 8 * Math.sin(((ph - 0.47) / 0.05) * Math.PI);
      pts.push([x - w / 2 + (w * k) / 100, y + yy]);
    }
    L.goldStroke(ctx, () => L.polyPartial(ctx, pts, 1), { a: a * 0.9, w: 1.6, glow: 5 });
  } else if (i === 2) {
    const f = lerp(0.92, 0.3, easeInOut(prog(d, 18.9, 22.5)));
    ctx.strokeStyle = rgba(G.dimLine, 0.45 * a); ctx.lineWidth = 1.2;
    ctx.strokeRect(x - w / 2, y - 7, w, 14);
    ctx.fillStyle = rgba(G.goldRGB, 0.95 * a);
    ctx.shadowColor = rgba(G.goldRGB, 0.6 * a); ctx.shadowBlur = 6;
    ctx.fillRect(x - w / 2 + 2, y - 5, (w - 4) * f, 10);
  } else {
    const lit = lerp(5, 2.2, easeInOut(prog(d, 19.0, 23.0)));
    for (let k = 0; k < 5; k++) {
      const on = clamp(lit - k);
      L.node(ctx, x - 72 + k * 36, y, { r: 5.5, a: a * (0.2 + 0.8 * on), color: on > 0.5 ? G.brightRGB : G.goldRGB });
    }
  }
  ctx.restore();
}

// 系统节点 i 的内容（节点、标签、↓、指标 / 曲线）。skipMuscleBody：肌肉张力的节点和曲线另画
function drawBranch(ctx, d, i, xm, a0, skip) {
  const b = BR[i], t0 = SPLIT + i * BSTEP;
  const lk = easeOut(prog(d, t0, t0 + 0.35));
  if (lk <= 0) return;
  const em = emphasis(d, i) * a0;
  const pts = L.bez([xm, SY], [xm, SY + 70], [b.x, NY - 80], [b.x, NY - 12], 40);
  let tip;
  L.goldStroke(ctx, () => { tip = L.polyPartial(ctx, pts, lk); }, { a: 0.8 * em, w: 1.6, glow: 7 });
  if (lk < 1 && tip) L.node(ctx, tip[0], tip[1], { r: 4, a: em, color: G.brightRGB });
  if (skip) return;
  const on = smooth(prog(d, b.on, b.on + 0.3));
  L.node(ctx, b.x, NY, { r: 8 + (i === MUSCLE ? 2 * smooth(prog(d, 27.7, 28.2)) : 0), a: em, pop: prog(d, t0 + 0.3, t0 + 0.62), ring: on * (1 - smooth(prog(d, b.on + 0.8, b.on + 1.4))) });
  L.ripple(ctx, b.x, NY, d, b.on, { dur: 0.6, r0: 10, r1: 48 });
  const la = smooth(prog(d, t0 + 0.35, t0 + 0.6)) * em;
  L.label(ctx, b.zh, b.en, b.x, NY + 64, { a: la, zhPx: 40, enPx: 17, gap: 36, color: i === MUSCLE && d > 27.7 ? G.head : G.text });
  ctx.save(); ctx.font = FONT.sans(40); ctx.letterSpacing = '2px';
  const zw = ctx.measureText(b.zh).width; ctx.restore();
  arrowDown(ctx, b.x + zw / 2 + 20, NY + 60, la * smooth(prog(d, t0 + 0.7, t0 + 0.95)));
  indicator(ctx, i, b.x, IY, d, smooth(prog(d, t0 + 0.5, t0 + 0.8)) * em * (1 - smooth(prog(d, b.on - 0.1, b.on + 0.3))));
  // 数据曲线：1.4 s 画完
  const ck = easeInOut(prog(d, b.on, b.on + 1.4)) * (i === MUSCLE ? MUSCLE_K : 1);
  if (ck > 0) L.chart(ctx, b.fn, chartRect(b.x), ck, { a: em * (i === MUSCLE ? 1 : 0.9), w: i === MUSCLE ? 2.4 : 1.8, glow: i === MUSCLE ? 9 : 5 });
}

function draw(ctx, d) {
  const g = H1.geom(d);
  // 推进到肌肉张力：其余结构以肌肉张力节点为中心放大并淡出
  const fk = easeInOut(prog(d, 32.6, 34.6));
  const others = 1 - smooth(prog(d, 32.6, 34.0));
  const xm = lerp(g.x0, g.x1, 0.5);
  ctx.save();
  L.zoomAbout(ctx, CAM.cx, CAM.cy, camS(d));
  if (fk > 0) L.zoomAbout(ctx, BR[MUSCLE].x, NY, 1 + 0.5 * fk);
  drawAxis(ctx, d, g, others);
  if (d >= TRUNK0) {
    const tk = easeInOut(prog(d, TRUNK0, TRUNK1));
    L.goldStroke(ctx, () => L.polyPartial(ctx, [[xm, g.y + 58], [xm, SY]], tk), { a: 0.9 * others, w: 1.8, glow: 8 });
    if (tk > 0 && tk < 1) L.node(ctx, xm, lerp(g.y + 58, SY, tk), { r: 4.5, a: others, color: G.brightRGB });
    L.node(ctx, xm, SY, { r: 5.5, a: others, pop: prog(d, SPLIT - 0.2, SPLIT + 0.1) });
    L.ripple(ctx, xm, SY, d, SPLIT - 0.05, { dur: 0.5, r0: 8, r1: 40 });
    for (let i = 0; i < BR.length; i++) drawBranch(ctx, d, i, xm, others, i === MUSCLE && fk > 0);
  }
  const u = dotU(d);
  const breathe = 1 + 0.1 * Math.sin(d * 2.4);
  L.node(ctx, lerp(g.x0, g.x1, u), g.y, { r: 9.75 * breathe, a: g.a * others, color: G.brightRGB });
  ctx.restore();

  // 肌肉张力：节点 + 曲线从图谱里的位置移到中央大图（不随镜头放大线宽）
  if (fk > 0) {
    const b = BR[MUSCLE];
    const n0 = toScreen(d, [b.x, NY]);
    const r0 = chartRect(b.x), p0 = toScreen(d, [r0.x0, r0.y0]), p1 = toScreen(d, [r0.x1, r0.y1]);
    const R = L.lerpRect({ x0: p0[0], y0: p0[1], x1: p1[0], y1: p1[1] }, BIG, fk);
    const [nx, ny] = [lerp(n0[0], bigStart()[0], fk), lerp(n0[1], bigStart()[1], fk)];
    L.chart(ctx, b.fn, R, MUSCLE_K, { a: 1, w: lerp(2.4, 2.6, fk), glow: 9, frame: 0.12 + 0.06 * fk, tip: false });
    L.node(ctx, nx, ny, { r: 10, a: 1 });
    label(ctx, nx, ny, fk);
  }
}
// 肌肉张力标签：从节点下方移到大图左上方（h4 用同一个函数）
function label(ctx, nx, ny, k, a = 1) {
  const y = lerp(ny + 64, ny - 78, k);
  L.label(ctx, '肌肉张力', 'MUSCLE TONE', lerp(nx, nx - 20, k), y, { a, zhPx: lerp(40, 46, k), enPx: 17, gap: 36, color: G.head, align: k > 0.5 ? 'left' : 'center' });
}

module.exports = { ...S, draw, BIG, MUSCLE_K, bigStart, label };
