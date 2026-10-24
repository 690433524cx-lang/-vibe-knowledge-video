// E · 34.6–54.2 秒：问题出现在入睡交界处。
//   34.6 肌肉张力放大成中央大图，平滑下降的曲线继续往下画；37.8 出现一次很短的异常波动。
//   39.3 大图收成左上角的小图（波动处留一条虚线），肌肉张力节点移到中央成为枢纽，
//        向外长出 身体位置 / 平衡 / 运动感知，三点连成小网络。
//   42.4 右侧三条平行的小波形（位置 / 平衡 / 运动），先同步；46.2 运动那一条慢了约 0.25 s，
//        用两条竖虚线和「Δt ≈ 0.2–0.3 s」标出；46.8 网络里出现一个小「？」。不用红色、不用故障。
//   51.8 「身体位置」被选中；52.6–54.2 它移到 F 段的位置，其余淡出，交给 h5。
const L = require('../lib');
const { FONT, G, rgba, lerp, clamp, prog, smooth, easeOut, easeInOut } = L;
const H3 = require('./h3_axis');

const S = { start: 34.61, end: 54.2 };
const BIG = H3.BIG;
const THUMB = { x0: 150, x1: 620, y0: 190, y1: 330 };
const SHRINK0 = 39.3, SHRINK1 = 40.3;
const OUT0 = 52.6, OUT1 = 54.2;
const HUB = [960, 430];
const NODES = [
  { zh: '身体位置', en: 'BODY POSITION', p: [640, 640], t: 40.6, lab: 'below' },
  { zh: '平衡', en: 'BALANCE', p: [1280, 640], t: 40.95, lab: 'below' },
  { zh: '运动感知', en: 'MOTION', p: [960, 250], t: 41.3, lab: 'right' },
];
const F_POS = [300, 370];   // h5 里「身体位置」的位置
const WAVES = { x0: 1440, x1: 1820, ys: [330, 430, 530], t: 42.4, lag: 46.2 };

const muscleK = (d) => lerp(H3.MUSCLE_K, 1, easeInOut(prog(d, 35.4, 38.4)));
const blipOn = (d) => smooth(prog(d, 37.7, 37.85));

function drawChart(ctx, d, out) {
  const k = easeInOut(prog(d, SHRINK0, SHRINK1));
  const R = L.lerpRect(BIG, THUMB, k);
  const a = lerp(1, 0.55, k) * out;
  const fn = (u) => L.CURVE.muscle(u, blipOn(d));
  L.chart(ctx, fn, R, muscleK(d), { a, w: lerp(2.6, 1.8, k), glow: 9, frame: lerp(0.18, 0.1, k), tip: d > 35.4 && muscleK(d) < 1 });
  // 时间方向：清醒 → 入睡
  const ta = (1 - k) * smooth(prog(d, 34.8, 35.3)) * out;
  L.text(ctx, '清醒', BIG.x0, BIG.y1 + 46, { font: FONT.sans(26), color: G.grey, a: ta, align: 'left', ls: 2 });
  L.text(ctx, '入睡', BIG.x1, BIG.y1 + 46, { font: FONT.sans(26), color: G.grey, a: ta, align: 'right', ls: 2 });
  L.goldStroke(ctx, () => { ctx.beginPath(); ctx.moveTo(BIG.x0 + 80, BIG.y1 + 37); ctx.lineTo(BIG.x1 - 80, BIG.y1 + 37); ctx.stroke(); }, { a: ta * 0.35, w: 1, glow: 0 });
  L.arrowMid(ctx, [BIG.x1 - 100, BIG.y1 + 37], [BIG.x1 - 80, BIG.y1 + 37], ta * 0.6, 6);
  // 异常波动：到达时亮一下
  const bp = L.rectPt(R, L.BLIP_U, fn(L.BLIP_U) + 0.04);
  if (d > 37.8) {
    L.ripple(ctx, bp[0], bp[1], d, 37.8, { dur: 0.8, r0: 8, r1: 60 });
    const ba = smooth(prog(d, 37.8, 37.95)) * a;
    L.node(ctx, bp[0], bp[1], { r: lerp(5.5, 4, k), a: ba, color: G.brightRGB });
    L.text(ctx, '短暂波动', bp[0] + 18, bp[1] - 22, { font: FONT.sans(lerp(30, 22, k)), color: G.bright, a: ba * smooth(prog(d, 38.0, 38.3)) * (1 - 0.3 * k), align: 'left', ls: 2 });
  }
  return { R, bp, k, a };
}

function wave(ctx, i, d, a) {
  const { x0, x1, ys } = WAVES;
  const y = ys[i];
  // 同一串信号，从右往左流动；运动那一条在 46.2 后慢 0.25 s
  const lag = i === 2 ? 0.25 * smooth(prog(d, WAVES.lag, WAVES.lag + 0.6)) : 0;
  const tt = d - lag;
  const pts = [];
  for (let k = 0; k <= 120; k++) {
    const x = lerp(x0, x1, k / 120);
    const ph = (x - x0) / 150 + tt * 1.1;
    const f = ph - Math.floor(ph);
    const v = Math.exp(-Math.pow((f - 0.5) / 0.07, 2));
    pts.push([x, y - 30 * v]);
  }
  const grown = easeOut(prog(d, WAVES.t + i * 0.25, WAVES.t + i * 0.25 + 0.6));
  L.grow(ctx, pts, grown, { a: a * (i === 2 ? 1 : 0.8), w: 1.7, glow: 5, tip: false });
  ctx.save();
  ctx.strokeStyle = rgba(G.dimLine, 0.16 * a); ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(x0, y + 1); ctx.lineTo(x1, y + 1); ctx.stroke();
  ctx.restore();
  L.text(ctx, ['位置', '平衡', '运动'][i], x0 - 20, y - 2, { font: FONT.sans(30), color: G.text, a: a * smooth(prog(d, WAVES.t + i * 0.25, WAVES.t + i * 0.25 + 0.4)), align: 'right', ls: 2 });
  // 同一个波峰的位置（用于标出时间差）
  const peakX = (lagS) => { const ph0 = (d - lagS) * 1.1; let fx = 0.5 - (ph0 - Math.floor(ph0)); if (fx < 0) fx += 1; return x0 + (fx + 1) * 150; };
  return peakX(lag);
}

function draw(ctx, d) {
  const out = 1 - smooth(prog(d, OUT0, OUT0 + 1.0));
  const C = drawChart(ctx, d, out);
  // 枢纽：肌肉张力节点从大图起点移到中央
  const hk = easeInOut(prog(d, SHRINK0, SHRINK1));
  const st = H3.bigStart();
  const hub = [lerp(st[0], HUB[0], hk), lerp(st[1], HUB[1], hk)];
  const sel = smooth(prog(d, 51.8, 52.3));   // 选中「身体位置」，其余变暗
  const dim = lerp(1, 0.4, sel);
  // 波动处 → 枢纽的虚线
  const la = smooth(prog(d, SHRINK1 - 0.2, SHRINK1 + 0.3)) * out * dim;
  if (la > 0.01) {
    ctx.save();
    ctx.strokeStyle = rgba(G.goldRGB, 0.5 * la); ctx.lineWidth = 1.2; ctx.setLineDash([4, 6]);
    ctx.beginPath(); ctx.moveTo(C.bp[0], C.bp[1]); ctx.quadraticCurveTo(hub[0] - 120, C.bp[1] + 20, hub[0] - 10, hub[1] - 8); ctx.stroke();
    ctx.restore();
  }
  // 三个新节点 + 连线
  const pulseT = d * 0.9;
  for (let i = 0; i < NODES.length; i++) {
    const n = NODES[i];
    const sp = [hub, n.p];
    const lk = easeOut(prog(d, n.t - 0.35, n.t));
    const na = out * (i === 0 ? 1 : dim);
    L.grow(ctx, sp, lk, { a: 0.75 * na, w: 1.6, glow: 6 });
    // 沿连线流动的信号点：46.2 后「运动感知」那条慢半拍
    if (lk >= 1 && d > 42.4) {
      const lag = i === 2 ? 0.25 * smooth(prog(d, WAVES.lag, WAVES.lag + 0.6)) : 0;
      const f = (pulseT - lag * 0.9) % 1;
      const q = L.along(sp, f);
      L.node(ctx, q[0], q[1], { r: 3.5, a: na * 0.8 * Math.sin(Math.PI * f), color: G.brightRGB });
    }
  }
  // 三角网：节点之间
  const tri = easeOut(prog(d, 41.7, 42.3));
  for (const [a, b] of [[0, 1], [1, 2], [2, 0]]) L.grow(ctx, [NODES[a].p, NODES[b].p], tri, { a: 0.32 * out * dim, w: 1.2, glow: 0, tip: false });
  for (let i = 0; i < NODES.length; i++) {
    const n = NODES[i];
    const selI = i === 0 ? sel * (1 - smooth(prog(d, OUT0 + 0.6, OUT1 - 0.1))) : 0;
    let p = n.p;
    if (i === 0) { const k = easeInOut(prog(d, OUT0, OUT1)); p = [lerp(n.p[0], F_POS[0], k), lerp(n.p[1], F_POS[1], k)]; }
    const na = i === 0 ? 1 : out * dim;
    L.node(ctx, p[0], p[1], { r: 8 + 2 * selI + (i === 0 ? 3 * easeInOut(prog(d, OUT0, OUT1)) : 0), a: na, pop: prog(d, n.t - 0.05, n.t + 0.3), ring: selI });
    const lb = smooth(prog(d, n.t + 0.05, n.t + 0.35)) * na;
    if (i === 0) {
      // 移向 h5 时，标签从下方换到左侧
      const mv = smooth(prog(d, OUT0, OUT1));
      L.label(ctx, n.zh, n.en, p[0], p[1] + 64, { a: lb * (1 - mv), zhPx: 42, enPx: 17, gap: 36, color: selI > 0.5 ? G.bright : G.text });
      L.label(ctx, n.zh, n.en, p[0] - 30, p[1] + 14, { a: mv, zhPx: 42, enPx: 17, gap: 32, align: 'right', color: G.text });
    } else if (n.lab === 'below') L.label(ctx, n.zh, n.en, p[0], p[1] + 64, { a: lb, zhPx: 42, enPx: 17, gap: 36 });
    else L.label(ctx, n.zh, n.en, p[0] + 30, p[1] + 12, { a: lb, zhPx: 42, enPx: 17, gap: 34, align: 'left' });
  }
  L.ripple(ctx, NODES[0].p[0], NODES[0].p[1], d, 51.8, { dur: 0.7, r0: 12, r1: 60 });
  // 枢纽节点与标签
  const ha = out * dim;
  L.node(ctx, hub[0], hub[1], { r: 10, a: ha });
  if (hk < 1) H3.label(ctx, hub[0], hub[1], 1, ha * (1 - smooth(prog(d, SHRINK0, SHRINK0 + 0.4))));
  L.label(ctx, '肌肉张力', 'MUSCLE TONE', HUB[0] + 52, HUB[1] - 6, { a: ha * smooth(prog(d, SHRINK1 - 0.3, SHRINK1 + 0.1)), zhPx: 42, enPx: 17, gap: 32, align: 'left', color: G.head });
  // 波形
  const wa = out * dim * smooth(prog(d, WAVES.t, WAVES.t + 0.3));
  if (wa > 0.003) {
    const px = [0, 1, 2].map((i) => wave(ctx, i, d, wa));
    // 时间差标记
    const ma = wa * smooth(prog(d, 46.6, 47.0));
    if (ma > 0.01) {
      ctx.save();
      ctx.strokeStyle = rgba(G.brightRGB, 0.55 * ma); ctx.lineWidth = 1; ctx.setLineDash([3, 5]);
      for (const x of [px[0], px[2]]) { ctx.beginPath(); ctx.moveTo(x, WAVES.ys[0] - 44); ctx.lineTo(x, WAVES.ys[2] + 14); ctx.stroke(); }
      ctx.restore();
      L.text(ctx, 'Δt ≈ 0.2–0.3 s', (px[0] + px[2]) / 2, WAVES.ys[2] + 50, { font: FONT.mono(22), color: G.bright, a: ma });
    }
  }
  // 小「？」
  const qa = smooth(prog(d, 46.8, 47.1)) * out;
  const qp = 1 + 0.08 * Math.sin((d - 46.8) * 5) * smooth(prog(d, 49.5, 50.0));
  L.text(ctx, '？', HUB[0] - 62, HUB[1] - 40, { font: FONT.sansMed(Math.round(56 * qp)), color: G.bright, a: qa, glow: 10 });
  // 50.3 所有连线亮一次
  const fl = Math.exp(-Math.max(0, d - 50.3) / 0.25) * (d > 50.3 ? 1 : 0) * out;
  if (fl > 0.02) for (const n of NODES) L.goldStroke(ctx, () => { ctx.beginPath(); ctx.moveTo(hub[0], hub[1]); ctx.lineTo(n.p[0], n.p[1]); ctx.stroke(); }, { a: fl, w: 2, glow: 12, color: G.brightRGB });
}

module.exports = { ...S, draw, F_POS };
