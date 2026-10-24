// C · 14.0–23.5 秒：入睡是过渡，不是关机。
//   14.0 开场那条线回到中上方，中间长出「困倦」：清醒 → 困倦 → 睡眠。
//   16.7 轴下方对比两种图形：灰色虚线阶跃（关机？）vs 金色平滑下降（逐渐过渡）。
//   19.2 「降档」：从亮点所在处向下分出四条支线——呼吸 / 心率 / 肌肉张力 / 意识状态，各带一个极简指标。
const L = require('../lib');
const { FONT, G, rgba, lerp, clamp, prog, smooth, easeOut, easeInOut, env } = L;
const H1 = require('./h1_line');

const S = { start: 14.0, end: 23.5 };
const OUT0 = 22.8, OUT1 = 23.5;   // 临时收尾（D 段接上后改为过渡）

function dotU(d) {
  let u = H1.dotU(Math.min(d, 14.7));
  u = lerp(u, 0.3, easeInOut(prog(d, 15.0, 19.2)));
  u = lerp(u, 0.34, easeInOut(prog(d, 21.8, 23.5)));
  return u;
}

// 阶跃与平滑曲线（x 与状态轴对齐）
const GR = { top: 530, bot: 690 };
const stepPts = (g) => [[g.x0, GR.top], [lerp(g.x0, g.x1, 0.54), GR.top], [lerp(g.x0, g.x1, 0.54), GR.bot], [g.x1, GR.bot]];
const sig = (u) => { const f = (v) => 1 / (1 + Math.exp(-(v - 0.5) * 7)); return (f(u) - f(0)) / (f(1) - f(0)); };
const curvePts = (g) => Array.from({ length: 81 }, (_, i) => { const u = i / 80; return [lerp(g.x0, g.x1, u), lerp(GR.top, GR.bot, sig(u))]; });

function drawAxis(ctx, d, g, out) {
  const a = g.a * out;
  // 线：左亮右暗
  const gr = ctx.createLinearGradient(g.x0, 0, g.x1, 0);
  gr.addColorStop(0, rgba(G.goldRGB, 0.95 * a));
  gr.addColorStop(1, rgba(G.goldRGB, 0.38 * a));
  ctx.save();
  ctx.strokeStyle = gr; ctx.lineWidth = 1.6; ctx.lineCap = 'round';
  ctx.shadowColor = rgba(G.goldRGB, 0.5 * a); ctx.shadowBlur = 8;
  ctx.beginPath(); ctx.moveTo(g.x0, g.y); ctx.lineTo(g.x1, g.y); ctx.stroke();
  ctx.restore();
  const xm = lerp(g.x0, g.x1, 0.5);
  L.node(ctx, g.x0, g.y, { r: 6, a });
  L.node(ctx, xm, g.y, { r: 6, a: a * 0.85, pop: prog(d, 14.45, 14.85) });
  L.node(ctx, g.x1, g.y, { r: 6, a: a * 0.7, hollow: true });
  const la = smooth(prog(d, 14.35, 14.75)) * out;
  L.label(ctx, '清醒', 'AWAKE', g.x0, g.y - 30, { a: la, gap: 66 });
  L.label(ctx, '困倦', 'DROWSY', xm, g.y - 30, { a: la * smooth(prog(d, 14.6, 14.95)), gap: 66 });
  L.label(ctx, '睡眠', 'SLEEP', g.x1, g.y - 30, { a: la * 0.85, gap: 66 });
}

function drawGraph(ctx, d, g, out) {
  const a = smooth(prog(d, 16.7, 17.0)) * (1 - smooth(prog(d, 18.9, 19.3))) * out;
  if (a <= 0.003) return;
  // 坐标：只有上下两条极淡的参考线
  ctx.save();
  ctx.strokeStyle = rgba(G.dimLine, 0.12 * a); ctx.lineWidth = 1;
  ctx.setLineDash([2, 8]);
  for (const y of [GR.top, GR.bot]) { ctx.beginPath(); ctx.moveTo(g.x0, y); ctx.lineTo(g.x1, y); ctx.stroke(); }
  ctx.restore();
  L.text(ctx, '清醒程度', g.x0 - 24, GR.top + 8, { font: FONT.sans(18), color: G.grey, a: a * 0.9, align: 'right', ls: 1 });
  // 阶跃：灰色虚线
  const sk = easeOut(prog(d, 16.9, 17.35));
  const sDim = lerp(1, 0.3, smooth(prog(d, 17.6, 17.9)));
  ctx.save();
  ctx.strokeStyle = rgba(G.dimLine, 0.6 * a * sDim); ctx.lineWidth = 1.6; ctx.setLineDash([7, 7]);
  L.polyPartial(ctx, stepPts(g), sk);
  ctx.restore();
  const sx = lerp(g.x0, g.x1, 0.54);
  L.text(ctx, '关机？', sx - 16, 568, { font: FONT.sans(26), color: G.text, a: a * lerp(1, 0.55, smooth(prog(d, 17.6, 17.9))) * smooth(prog(d, 17.05, 17.3)) * 0.9, align: 'right', ls: 2 });
  // 平滑下降：金色
  const ck = easeInOut(prog(d, 17.7, 18.6));
  let tip = null;
  L.goldStroke(ctx, () => { tip = L.polyPartial(ctx, curvePts(g), ck); }, { a: a * 0.95, w: 2, glow: 10 });
  if (ck > 0 && ck < 1 && tip) L.node(ctx, tip[0], tip[1], { r: 4, a, color: G.brightRGB });
  const ga = a * smooth(prog(d, 18.3, 18.6));
  L.text(ctx, '逐渐过渡', lerp(g.x0, g.x1, 0.8), 646, { font: FONT.sans(24), color: G.bright, a: ga, align: 'left', ls: 2 });
  L.text(ctx, 'GRADUAL', lerp(g.x0, g.x1, 0.8), 612, { font: FONT.inter(15), color: G.gold, a: ga * 0.9, align: 'left', ls: 4 });
  // 亮点所在时刻的清醒程度：一条竖向细虚线落到曲线上
  const u = dotU(d);
  const hx = lerp(g.x0, g.x1, u), hy = lerp(GR.top, GR.bot, sig(u));
  const ha = a * smooth(prog(d, 18.4, 18.7));
  if (ha > 0.01) {
    ctx.save();
    ctx.strokeStyle = rgba(G.goldRGB, 0.45 * ha); ctx.lineWidth = 1; ctx.setLineDash([3, 5]);
    ctx.beginPath(); ctx.moveTo(hx, g.y + 12); ctx.lineTo(hx, hy); ctx.stroke();
    ctx.restore();
    L.node(ctx, hx, hy, { r: 4.5, a: ha, color: G.brightRGB });
  }
}

// ---------- 四条支线 ----------
const BR = [
  { zh: '呼吸', en: 'RESPIRATION', x: 510 },
  { zh: '心率', en: 'HEART RATE', x: 810 },
  { zh: '肌肉张力', en: 'MUSCLE TONE', x: 1110 },
  { zh: '意识状态', en: 'AROUSAL', x: 1410 },
];
const B0 = 19.2, BSTEP = 0.36, NY = 640, IY = 790;

function arrowDown(ctx, x, y, a) {
  L.goldStroke(ctx, () => {
    ctx.beginPath();
    ctx.moveTo(x, y - 18); ctx.lineTo(x, y);
    ctx.moveTo(x - 5, y - 6); ctx.lineTo(x, y); ctx.lineTo(x + 5, y - 6);
    ctx.stroke();
  }, { a, w: 1.6, glow: 4 });
}

function indicator(ctx, i, x, y, d, a) {
  if (a <= 0.003) return;
  const w = 170, t = d - B0;
  ctx.save();
  ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  if (i === 0) {
    // 呼吸：正弦，越来越慢、越来越浅
    const amp = 13 * (1 - 0.4 * prog(d, 19.8, 23.5));
    const pts = [];
    let ph = 0;
    for (let k = 0; k <= 60; k++) {
      const xx = x - w / 2 + (w * k) / 60;
      const f = lerp(1.0, 0.6, k / 60);
      ph = (k / 60) * 2.6 * Math.PI * 2 * f - t * 2.2;
      pts.push([xx, y + Math.sin(ph) * amp]);
    }
    L.goldStroke(ctx, () => L.polyPartial(ctx, pts, 1), { a: a * 0.85, w: 1.5, glow: 4 });
  } else if (i === 1) {
    // 心率：基线上的尖峰，间隔逐渐拉长
    const per = lerp(0.8, 1.05, prog(d, 19.8, 23.5));
    const pts = [];
    for (let k = 0; k <= 90; k++) {
      const xx = x - w / 2 + (w * k) / 90;
      const tt = (k / 90) * 2.2 + t * 0.9;
      const ph = (tt % per) / per;
      let yy = 0;
      if (ph > 0.42 && ph < 0.47) yy = -18 * Math.sin(((ph - 0.42) / 0.05) * Math.PI);
      else if (ph > 0.47 && ph < 0.52) yy = 7 * Math.sin(((ph - 0.47) / 0.05) * Math.PI);
      pts.push([xx, y + yy]);
    }
    L.goldStroke(ctx, () => L.polyPartial(ctx, pts, 1), { a: a * 0.85, w: 1.4, glow: 4 });
  } else if (i === 2) {
    // 肌肉张力：一条刻度条，填充明显下降
    const f = lerp(0.9, 0.3, easeInOut(prog(d, 20.4, 23.0)));
    ctx.strokeStyle = rgba(G.dimLine, 0.35 * a); ctx.lineWidth = 1;
    ctx.strokeRect(x - w / 2, y - 6, w, 12);
    ctx.fillStyle = rgba(G.goldRGB, 0.85 * a);
    ctx.shadowColor = rgba(G.goldRGB, 0.6 * a); ctx.shadowBlur = 6;
    ctx.fillRect(x - w / 2 + 2, y - 4, (w - 4) * f, 8);
  } else {
    // 意识状态：五个点，从左往右依次变暗
    const lit = lerp(5, 2.2, easeInOut(prog(d, 20.6, 23.3)));
    for (let k = 0; k < 5; k++) {
      const on = clamp(lit - k);
      L.node(ctx, x - 60 + k * 30, y, { r: 4.5, a: a * (0.18 + 0.82 * on), color: on > 0.5 ? G.brightRGB : G.goldRGB });
    }
  }
  ctx.restore();
}

function drawBranches(ctx, d, g, out) {
  if (d < B0) return;
  const ox = lerp(g.x0, g.x1, dotU(B0)), oy = g.y + 10;
  for (let i = 0; i < BR.length; i++) {
    const b = BR[i], t0 = B0 + i * BSTEP;
    const lk = easeOut(prog(d, t0, t0 + 0.42));
    if (lk <= 0) continue;
    const pts = L.bez([ox, oy], [ox, oy + 150], [b.x, NY - 130], [b.x, NY - 10], 48);
    L.goldStroke(ctx, () => L.polyPartial(ctx, pts, lk), { a: 0.7 * out, w: 1.4, glow: 6 });
    const nk = prog(d, t0 + 0.38, t0 + 0.72);
    L.node(ctx, b.x, NY, { r: 6.5, a: out, pop: nk });
    const la = smooth(prog(d, t0 + 0.45, t0 + 0.75)) * out;
    L.label(ctx, b.zh, b.en, b.x, NY + 52, { a: la, zhPx: 30, enPx: 15, gap: 31 });
    // 小「↓」
    ctx.save(); ctx.font = FONT.sans(30); ctx.letterSpacing = '2px';
    const zw = ctx.measureText(b.zh).width; ctx.restore();
    arrowDown(ctx, b.x + zw / 2 + 18, NY + 50, la * smooth(prog(d, t0 + 0.8, t0 + 1.1)));
    indicator(ctx, i, b.x, IY, d, smooth(prog(d, t0 + 0.6, t0 + 0.95)) * out);
  }
}

function draw(ctx, d) {
  const g = H1.geom(d);
  const out = 1 - smooth(prog(d, OUT0, OUT1));
  drawGraph(ctx, d, g, out);
  drawAxis(ctx, d, g, out);
  drawBranches(ctx, d, g, out);
  // 亮点
  const u = dotU(d);
  const breathe = 1 + 0.12 * Math.sin(d * 2.4);
  L.node(ctx, lerp(g.x0, g.x1, u), g.y, { r: 7.5 * breathe, a: g.a * out, color: G.brightRGB });
  // 分支起点：亮点停住的地方有一圈
  L.ripple(ctx, lerp(g.x0, g.x1, dotU(B0)), g.y, d, B0 - 0.05, { dur: 0.6, r0: 10, r1: 44 });
}

module.exports = { ...S, draw };
