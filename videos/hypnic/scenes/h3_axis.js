// C · 14.0–20+ 秒：入睡是过渡，多个系统同时降档。
//   14.0 开场那条线落到中上方，中间长出「困倦」：清醒 → 困倦 → 睡眠；亮点从清醒走到困倦。
//   15.9 从「困倦」节点向下长出主干；17.6（很多系统）主干一分为四，
//   四条细金线以 0.3 s 间隔依次通向：呼吸 / 心率 / 肌肉张力 / 清醒水平，各带一个极简指标。
//   到 20 s：上层状态轴 + 下层四个系统，一个完整的小型系统。
const L = require('../lib');
const { FONT, G, rgba, lerp, clamp, prog, smooth, easeOut, easeInOut } = L;
const H1 = require('./h1_line');

const S = { start: 14.0, end: 23.5 };
const OUT0 = 22.8, OUT1 = 23.5;   // 临时收尾（D 段接上后改为过渡）

function dotU(d) {
  let u = H1.dotU(Math.min(d, 14.3));
  u = lerp(u, 0.5, easeInOut(prog(d, 14.4, 16.4)));
  return u;
}

function drawAxis(ctx, d, g, out) {
  const a = g.a * out;
  const gr = ctx.createLinearGradient(g.x0, 0, g.x1, 0);
  gr.addColorStop(0, rgba([226, 180, 102], a));
  gr.addColorStop(1, rgba([226, 180, 102], 0.45 * a));
  ctx.save();
  ctx.strokeStyle = gr; ctx.lineWidth = 1.8; ctx.lineCap = 'round';
  ctx.shadowColor = rgba(G.goldRGB, 0.55 * a); ctx.shadowBlur = 10;
  ctx.beginPath(); ctx.moveTo(g.x0, g.y); ctx.lineTo(g.x1, g.y); ctx.stroke();
  ctx.restore();
  const xm = lerp(g.x0, g.x1, 0.5);
  // 亮点到达困倦：节点亮一下
  const arrive = smooth(prog(d, 16.2, 16.45)) * (1 - smooth(prog(d, 16.9, 17.6)));
  L.node(ctx, g.x0, g.y, { r: 7.5, a });
  L.node(ctx, xm, g.y, { r: 7.5, a: a * 0.9, pop: prog(d, 14.25, 14.6), ring: arrive });
  L.node(ctx, g.x1, g.y, { r: 7.5, a: a * 0.75, hollow: true });
  const la = smooth(prog(d, 14.1, 14.45)) * out;
  const P = { a: la, zhPx: 38, enPx: 18, gap: 78 };
  L.label(ctx, '清醒', 'AWAKE', g.x0, g.y - 36, P);
  L.label(ctx, '困倦', 'DROWSY', xm, g.y - 36, { ...P, a: la * smooth(prog(d, 14.35, 14.7)), color: arrive > 0.3 ? G.bright : G.text });
  L.label(ctx, '睡眠', 'SLEEP', g.x1, g.y - 36, { ...P, a: la * 0.85 });
  // 箭头：清醒 → 困倦 → 睡眠
  for (const u of [0.25, 0.75]) {
    const x = lerp(g.x0, g.x1, u);
    L.goldStroke(ctx, () => { ctx.beginPath(); ctx.moveTo(x - 6, g.y - 7); ctx.lineTo(x + 2, g.y); ctx.lineTo(x - 6, g.y + 7); ctx.stroke(); }, { a: la * 0.7, w: 1.6, glow: 4 });
  }
}

// ---------- 主干 + 四条支线 ----------
const BR = [
  { zh: '呼吸', en: 'RESPIRATION', x: 480 },
  { zh: '心率', en: 'HEART RATE', x: 800 },
  { zh: '肌肉张力', en: 'MUSCLE TONE', x: 1120 },
  { zh: '清醒水平', en: 'AROUSAL', x: 1440 },
];
const TRUNK0 = 15.9, TRUNK1 = 16.9, SPLIT = 17.6, BSTEP = 0.3;
const SY = 520, NY = 640, IY = 812;

function arrowDown(ctx, x, y, a) {
  L.goldStroke(ctx, () => {
    ctx.beginPath();
    ctx.moveTo(x, y - 22); ctx.lineTo(x, y);
    ctx.moveTo(x - 6, y - 7); ctx.lineTo(x, y); ctx.lineTo(x + 6, y - 7);
    ctx.stroke();
  }, { a, w: 1.8, glow: 4 });
}

function indicator(ctx, i, x, y, d, a) {
  if (a <= 0.003) return;
  const w = 190, t = d - SPLIT;
  ctx.save();
  if (i === 0) {
    // 呼吸：正弦，越来越慢、越来越浅
    const amp = 15 * (1 - 0.4 * prog(d, 18.5, 23.5));
    const pts = [];
    for (let k = 0; k <= 64; k++) {
      const ph = (k / 64) * 2.4 * Math.PI * 2 * lerp(1.0, 0.6, k / 64) - t * 2.2;
      pts.push([x - w / 2 + (w * k) / 64, y + Math.sin(ph) * amp]);
    }
    L.goldStroke(ctx, () => L.polyPartial(ctx, pts, 1), { a: a * 0.9, w: 1.7, glow: 5 });
  } else if (i === 1) {
    // 心率：尖峰间隔逐渐拉长
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
    // 肌肉张力：刻度条明显下降
    const f = lerp(0.92, 0.3, easeInOut(prog(d, 18.9, 22.5)));
    ctx.strokeStyle = rgba(G.dimLine, 0.45 * a); ctx.lineWidth = 1.2;
    ctx.strokeRect(x - w / 2, y - 7, w, 14);
    ctx.fillStyle = rgba(G.goldRGB, 0.95 * a);
    ctx.shadowColor = rgba(G.goldRGB, 0.6 * a); ctx.shadowBlur = 6;
    ctx.fillRect(x - w / 2 + 2, y - 5, (w - 4) * f, 10);
  } else {
    // 清醒水平：五个点，从右往左依次变暗
    const lit = lerp(5, 2.2, easeInOut(prog(d, 19.0, 23.0)));
    for (let k = 0; k < 5; k++) {
      const on = clamp(lit - k);
      L.node(ctx, x - 72 + k * 36, y, { r: 5.5, a: a * (0.2 + 0.8 * on), color: on > 0.5 ? G.brightRGB : G.goldRGB });
    }
  }
  ctx.restore();
}

function drawTree(ctx, d, g, out) {
  if (d < TRUNK0) return;
  const xm = lerp(g.x0, g.x1, 0.5);
  // 主干：困倦节点 → 分叉点
  const tk = easeInOut(prog(d, TRUNK0, TRUNK1));
  L.goldStroke(ctx, () => L.polyPartial(ctx, [[xm, g.y + 58], [xm, SY]], tk), { a: 0.9 * out, w: 1.8, glow: 8 });
  // 主干线头的亮点（信号在往下走）
  if (tk > 0 && tk < 1) L.node(ctx, xm, lerp(g.y + 58, SY, tk), { r: 4.5, a: out, color: G.brightRGB });
  L.node(ctx, xm, SY, { r: 5.5, a: out, pop: prog(d, SPLIT - 0.2, SPLIT + 0.1) });
  L.ripple(ctx, xm, SY, d, SPLIT - 0.05, { dur: 0.5, r0: 8, r1: 40 });
  for (let i = 0; i < BR.length; i++) {
    const b = BR[i], t0 = SPLIT + i * BSTEP;
    const lk = easeOut(prog(d, t0, t0 + 0.35));
    if (lk <= 0) continue;
    const pts = L.bez([xm, SY], [xm, SY + 70], [b.x, NY - 80], [b.x, NY - 12], 40);
    let tip;
    L.goldStroke(ctx, () => { tip = L.polyPartial(ctx, pts, lk); }, { a: 0.8 * out, w: 1.6, glow: 7 });
    if (lk < 1 && tip) L.node(ctx, tip[0], tip[1], { r: 4, a: out, color: G.brightRGB });
    L.node(ctx, b.x, NY, { r: 8, a: out, pop: prog(d, t0 + 0.3, t0 + 0.62) });
    const la = smooth(prog(d, t0 + 0.35, t0 + 0.6)) * out;
    L.label(ctx, b.zh, b.en, b.x, NY + 62, { a: la, zhPx: 35, enPx: 17, gap: 36 });
    ctx.save(); ctx.font = FONT.sans(35); ctx.letterSpacing = '2px';
    const zw = ctx.measureText(b.zh).width; ctx.restore();
    arrowDown(ctx, b.x + zw / 2 + 20, NY + 58, la * smooth(prog(d, t0 + 0.7, t0 + 0.95)));
    indicator(ctx, i, b.x, IY, d, smooth(prog(d, t0 + 0.5, t0 + 0.8)) * out);
  }
}

function draw(ctx, d) {
  const g = H1.geom(d);
  const out = 1 - smooth(prog(d, OUT0, OUT1));
  drawAxis(ctx, d, g, out);
  drawTree(ctx, d, g, out);
  const u = dotU(d);
  const breathe = 1 + 0.1 * Math.sin(d * 2.4);
  L.node(ctx, lerp(g.x0, g.x1, u), g.y, { r: 9.75 * breathe, a: g.a * out, color: G.brightRGB });
}

module.exports = { ...S, draw };
