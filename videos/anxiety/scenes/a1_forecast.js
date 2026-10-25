// 0–14 s：预测树 → 五种结果 → 最坏结果被放大 → 脉冲向下 → 身体警报。
// 7 s 以后这棵树退到背景（仍在同一空间里），13.5 s 起全部向中央汇聚成「预期性焦虑」。
const L = require('../lib');
const Wd = require('../world');
const { COL } = L;
const { cam, NOW, UNK, L1, L2, L2P, L3, L3P, L4, L4P, TIP_LABELS, OUT, OUT_LABELS, OUT_EN, L3O, WORST, BUS, BODY, BODY_LABELS, BODY_T, TITLE } = Wd;
const { prog, smooth, lerp, easeOut, easeIn, clamp } = L;

// 汇聚：所有「预测出来的」东西被吸向中央
const pull = (d) => easeIn(prog(d, 13.45, 14.25));
const at = (q, k) => (k > 0 ? q.map((v, i) => lerp(v, TITLE[i], k)) : q);

// 五种结果的注意权重（尺寸）与亮度
const W_T = [0.55, 0.62, 1.0, 1.45, 2.45];
const A_T = [0.32, 0.38, 0.78, 0.95, 1.0];
function outW(i, d) { return lerp(1, W_T[i], smooth(prog(d, 2.4 + (4 - i) * 0.05, 3.1))); }
function outA(i, d) { return lerp(0.85, A_T[i], smooth(prog(d, 2.4, 3.0))); }
const danger = (d) => smooth(prog(d, 2.55, 3.2));

// 读数小图：在节点下方
function readout(ctx, c, q, i, d, act) {
  const P = L.proj(c, q);
  if (P.z < 80) return;
  const s = P.s, w = 210 * s, h = 54 * s, x0 = P.x - w / 2, y0 = P.y + 64 * s;
  const a = L.depthAlpha(P.z) * (0.35 + 0.65 * act);
  ctx.save();
  ctx.strokeStyle = L.rgba(COL.goldDim, 0.5 * a);
  ctx.lineWidth = 1;
  ctx.strokeRect(x0, y0, w, h);
  const hot = L.mix(COL.gold, COL.redHi, 0.55 * act);
  ctx.strokeStyle = L.rgba(hot, 0.95 * a);
  ctx.lineWidth = Math.max(1, 1.6 * s);
  ctx.beginPath();
  const n = 64, t0 = d - BODY_T[i];
  if (i === 0) {
    // 心率：心跳越来越密
    const rate = lerp(1.1, 2.4, act);
    for (let k = 0; k <= n; k++) {
      const u = k / n, ph = ((u * 3 - d * rate) % 1 + 1) % 1;
      let v = 0;
      if (ph < 0.06) v = -Math.sin(ph / 0.06 * Math.PI) * 0.9;
      else if (ph < 0.1) v = Math.sin((ph - 0.06) / 0.04 * Math.PI) * 0.35;
      const X = x0 + u * w, Y = y0 + h / 2 + v * h * 0.42 * (0.4 + 0.6 * act);
      k ? ctx.lineTo(X, Y) : ctx.moveTo(X, Y);
    }
  } else if (i === 1) {
    // 呼吸：变浅、变快
    const f = lerp(1.2, 3.4, act), amp = lerp(0.38, 0.17, act);
    for (let k = 0; k <= n; k++) {
      const u = k / n, X = x0 + u * w, Y = y0 + h / 2 + Math.sin((u * f - d * f * 0.5) * Math.PI * 2) * h * amp;
      k ? ctx.lineTo(X, Y) : ctx.moveTo(X, Y);
    }
  } else if (i === 2) {
    // 肌肉张力：水平条上升
    ctx.stroke();
    const lv = lerp(0.18, 0.84, smooth(clamp(t0 / 0.8))) * (1 + Math.sin(d * 9) * 0.02);
    ctx.fillStyle = L.rgba(hot, 0.75 * a);
    ctx.fillRect(x0 + 8 * s, y0 + h * 0.36, (w - 16 * s) * lv, h * 0.28);
    ctx.beginPath();
  } else {
    // 警觉：LOW / MED / HIGH 三格
    ctx.stroke();
    const lvl = act > 0.5 ? 3 : act > 0.05 ? 2 : 1;
    ['LOW', 'MED', 'HIGH'].forEach((t, k) => {
      const on = k < lvl;
      ctx.fillStyle = L.rgba(k === 2 ? COL.redHi : hot, (on ? 0.8 : 0.12) * a);
      ctx.fillRect(x0 + (8 + k * 66) * s, y0 + h * 0.3, 58 * s, h * 0.4);
    });
    ctx.beginPath();
  }
  ctx.stroke();
  ctx.restore();
  const tag = ['RATE ↑', 'SHALLOW · FAST', 'TENSION ↑', act > 0.5 ? 'HIGH' : 'LOW'][i];
  L.label(ctx, c, [q[0], q[1] + 140, q[2]], '', { en: tag, enScale: 1, size: 13, min: 10, max: 18, alpha: a, enColor: act > 0.5 ? L.mix(COL.gold, COL.redHi, 0.5) : COL.ash });
}

module.exports = {
  start: -1, end: 18.5,
  draw(ctx, d) {
    const c = cam(d);
    const k = pull(d);
    const gone = 1 - smooth(prog(d, 14.05, 14.35));
    // 7 s 后退到背景
    const bg = lerp(1, 0.36, smooth(prog(d, 6.4, 7.6)));
    // 钻进最坏结果期间，其它分支被压到背景
    const focus = smooth(prog(d, 3.0, 3.6)) * (1 - smooth(prog(d, 6.4, 7.4)));
    const rest = bg * (1 - 0.6 * focus) * gone;

    const nowP = NOW, unk = at(UNK, k);
    // 现在 → 未知：第 0 帧就已经在走
    const e0 = L.curvePts(nowP, unk, 0.3, 8);
    L.path(ctx, c, e0, { k1: prog(d, -0.09, 0.2), width: 2, alpha: 0.95, head: true, headR: 4 });
    if (d > 0.3) L.flow(ctx, c, e0, d, { n: 2, speed: 0.9, alpha: 0.7 });

    if (gone > 0) {
      const l1 = L1.map((q) => at(q, k)), l2 = L2.map((q) => at(q, k)), l3 = L3.map((q) => at(q, k)), l4 = L4.map((q) => at(q, k));
      const out = OUT.map((q) => at(q, k));
      // 1 → 3
      l1.forEach((q, i) => {
        const pts = L.curvePts(unk, q, 0.4, 12);
        L.path(ctx, c, pts, { k1: prog(d, 0.17, 0.4 + i * 0.02), width: 1.6, alpha: 0.85 * rest, head: true });
        L.node(ctx, c, q, { r: 5, alpha: smooth(prog(d, 0.36, 0.45)) * rest, glow: 0.8 });
      });
      // 3 → 7
      l2.forEach((q, i) => {
        const pts = L.curvePts(l1[L2P[i]], q, 0.4, 12);
        L.path(ctx, c, pts, { k1: prog(d, 0.42 + (i % 3) * 0.02, 0.64 + (i % 2) * 0.03), width: 1.4, alpha: 0.75 * rest, head: true });
        L.node(ctx, c, q, { r: 4.5, alpha: smooth(prog(d, 0.62, 0.72)) * rest, glow: 0.7 });
      });
      // 7 → 15
      l3.forEach((q, i) => {
        const pts = L.curvePts(l2[L3P[i]], q, 0.4, 12);
        const t1 = 0.92 + (i % 4) * 0.025;
        L.path(ctx, c, pts, { k1: prog(d, 0.68 + (i % 3) * 0.02, t1), width: 1.2, alpha: 0.7 * rest, head: true });
        if (d > 0.3 && d < 2.6) L.flow(ctx, c, pts, d, { n: 1, speed: 1.4, phase: i * 0.37, alpha: 0.5 * rest });
        // 末端：还没发生的未来（虚线环）
        L.node(ctx, c, q, { r: 9, dashed: true, alpha: smooth(prog(d, t1 - 0.04, t1 + 0.1)) * rest * 0.9, glow: 0.5 });
        const lab = TIP_LABELS[i];
        if (lab) {
          const la = smooth(prog(d, 0.88 + Object.keys(TIP_LABELS).indexOf(String(i)) * 0.09, 1.25 + Object.keys(TIP_LABELS).indexOf(String(i)) * 0.09)) * (1 - smooth(prog(d, 2.0, 2.4)));
          L.label(ctx, c, [q[0] + 24, q[1], q[2]], lab, { size: 21, align: 'left', alpha: 0.62 * la * rest, color: i === 13 ? L.mix(COL.ivory, COL.redHi, 0.45) : COL.ivory, weight: 'reg', min: 14 });
        }
      });
      // 1–2 s：分支突然变多
      l4.forEach((q, i) => {
        const t = 1.0 + (i / l4.length) * 0.8;
        const pts = L.curvePts(l3[L4P[i]], q, 0.4, 8);
        L.path(ctx, c, pts, { k1: prog(d, t, t + 0.28), width: 0.9, alpha: 0.5 * rest, head: true, headR: 2.2 });
        L.node(ctx, c, q, { r: 3, alpha: smooth(prog(d, t + 0.22, t + 0.32)) * 0.6 * rest, glow: 0.5, ring: false });
      });
      // 2 s：所有末端被归入五种结果
      const dz = danger(d);
      l4.forEach((q, i) => {
        const o = L3O[L4P[i]];
        const t = 2.0 + (i / l4.length) * 0.35;
        const ka = o === 4 ? lerp(0.25, 0.55, dz) : lerp(0.25, 0.1, dz);
        const pts = L.curvePts(q, out[o], 0.45, 12);
        L.path(ctx, c, pts, { k1: prog(d, t, t + 0.35), width: o === 4 ? lerp(0.9, 1.6, dz) : 0.8, alpha: ka * rest, color: o === 4 ? L.mix(COL.gold, COL.redHi, 0.6 * dz) : COL.gold, head: true, headR: 2 });
        if (o === 4 && d > 2.5) L.flow(ctx, c, pts, d, { n: 1, speed: 1.1, phase: i * 0.21, alpha: 0.6 * dz * rest, color: L.mix(COL.goldHi, COL.redHi, 0.5) });
      });
      out.forEach((q, i) => {
        const app = easeOut(prog(d, 1.95 + i * 0.04, 2.3 + i * 0.04));
        if (app <= 0) return;
        const w = outW(i, d), a = outA(i, d) * app;
        const isW = i === 4;
        const cc = isW ? L.mix(COL.gold, COL.redHi, 0.7 * dz) : COL.gold;
        const ra = isW ? bg * gone : rest;
        L.node(ctx, c, q, { r: 22 * w * app, dashed: true, alpha: a * ra, color: cc, glow: isW ? 0.6 + 0.9 * dz : 0.5 });
        L.label(ctx, c, [q[0] + 34 * w + 14, q[1] - 4, q[2]], OUT_LABELS[i], {
          size: 26 * Math.pow(w, 0.7), align: 'left', alpha: a * ra, color: isW ? L.mix(COL.ivory, COL.redHi, 0.4 * dz) : COL.ivory, en: OUT_EN[i], enScale: 0.45, enColor: cc, min: 15,
        });
      });
      // 最坏结果：第一次脉冲
      const wq = out[4];
      for (const [t0, col] of [[3.55, L.mix(COL.goldHi, COL.redHi, 0.6)], [3.78, COL.goldHi]]) {
        L.pulseRing(ctx, c, wq, prog(d, t0, t0 + 0.8), { r0: 50, r1: 260, color: col, width: 2.4, alpha: 0.9 * gone });
      }

      // 4 s：脉冲向下穿过空间 → 身体警报
      const bus = at(BUS, k);
      const vb = L.curvePtsV(wq, bus, 0.5, 14);
      const hot = L.mix(COL.gold, COL.redHi, 0.5);
      const bodyA = lerp(1, 0.4, smooth(prog(d, 6.6, 7.4))) * gone;
      L.path(ctx, c, vb, { k1: prog(d, 3.92, 4.28), width: 2.2, alpha: 0.95 * bodyA, color: hot, head: true, headR: 5, headColor: L.mix(COL.goldHi, COL.redHi, 0.4) });
      if (d > 4.3) L.flow(ctx, c, vb, d, { n: 3, speed: 1.3, alpha: 0.85 * bodyA, color: L.mix(COL.goldHi, COL.redHi, 0.45) });
      L.node(ctx, c, bus, { r: 6, alpha: smooth(prog(d, 4.2, 4.35)) * bodyA, color: hot });
      L.label(ctx, c, [bus[0] + 26, bus[1] - 4, bus[2]], '身体警报', { size: 20, align: 'left', alpha: smooth(prog(d, 4.25, 4.6)) * 0.85 * bodyA, en: 'BODY ALERT', enScale: 0.5, enColor: hot, weight: 'reg' });
      BODY.forEach((q0, i) => {
        const q = at(q0, k);
        const pts = L.curvePts(bus, q, 0.15, 14);
        const pre = smooth(prog(d, 3.95, 4.3)), act = smooth(prog(d, BODY_T[i], BODY_T[i] + 0.25));
        L.path(ctx, c, pts, { k1: prog(d, 4.22, BODY_T[i]), width: 1.8, alpha: 0.9 * bodyA, color: hot, head: true, headR: 4 });
        if (act > 0.5) L.flow(ctx, c, pts, d, { n: 2, speed: 1.0, phase: i * 0.3, alpha: 0.7 * bodyA, color: L.mix(COL.goldHi, COL.redHi, 0.4) });
        const cc = L.mix(COL.ash, L.mix(COL.gold, COL.redHi, 0.45), act);
        L.node(ctx, c, q, { r: 34, alpha: pre * (0.35 + 0.65 * act) * bodyA, color: cc, glow: act * 1.3, coreR: 0.32 });
        L.pulseRing(ctx, c, q, prog(d, BODY_T[i], BODY_T[i] + 0.7), { r0: 34, r1: 120, color: L.mix(COL.goldHi, COL.redHi, 0.5), alpha: 0.85 * bodyA });
        // 全部亮起后，每 0.9 s 一次很克制的同步脉冲
        if (d > 5.4) L.pulseRing(ctx, c, q, ((d - 5.4) % 0.9) / 0.9, { r0: 34, r1: 64, color: hot, width: 1.4, alpha: 0.45 * bodyA });
        L.label(ctx, c, [q[0], q[1] - 70, q[2]], BODY_LABELS[i][0], { size: 26, alpha: pre * (0.45 + 0.55 * act) * bodyA, en: BODY_LABELS[i][1], enBelow: false, enScale: 0.42, enColor: cc });
        if (pre > 0.01) readout(ctx, c, q, i, d, act * bodyA);
      });
    }

    // 0–2.6 s：顶部一条阶段刻度，跟着信号依次点亮：现在 → 未知 → 预测 → 可能的未来
    const ra = 1 - smooth(prog(d, 2.3, 2.8));
    if (ra > 0) {
      const stops = [[nowP, 'NOW', -0.2], [unk, 'UNKNOWN', 0.2], [L2[3], 'PREDICTION', 0.62], [L3[7], 'POSSIBLE FUTURES', 0.95]];
      const xs = stops.map(([q]) => L.proj(c, q).x);
      ctx.save();
      for (let i = 1; i < xs.length; i++) {
        const on = smooth(prog(d, stops[i][2] - 0.15, stops[i][2]));
        ctx.strokeStyle = L.rgba(COL.gold, (0.15 + 0.35 * on) * ra);
        ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(xs[i - 1] + 14, 70); ctx.lineTo(L.lerp(xs[i - 1] + 14, xs[i] - 14, on), 70); ctx.stroke();
      }
      stops.forEach(([, t, t0], i) => {
        const on = smooth(prog(d, t0 - 0.1, t0 + 0.05));
        L.glowDot(ctx, xs[i], 70, 2.6, COL.goldHi, (0.25 + 0.75 * on) * ra);
        L.mono(ctx, t, xs[i], 50, { align: 'center', size: 13, alpha: (0.25 + 0.55 * on) * ra });
      });
      ctx.restore();
    }
    // NOW：全片都在
    const nowPulse = (d % 1.6) / 1.6;
    L.pulseRing(ctx, c, nowP, prog(d, -0.35, 0.55), { r0: 14, r1: 80, alpha: 0.9 });
    if (d > 0.6) L.pulseRing(ctx, c, nowP, nowPulse, { r0: 14, r1: 46, alpha: 0.35, width: 1.4 });
    L.node(ctx, c, nowP, { r: 15, color: COL.goldHi, glow: 1.6, core: 1, coreR: 0.55 });
    L.label(ctx, c, [nowP[0], nowP[1] + 46, nowP[2]], '现在', { size: 22, en: 'NOW', enScale: 0.62, enBelow: false, alpha: 0.9, weight: 'reg' });
    // 未知：一个空环（汇聚时被吸进中央）
    if (gone > 0) {
      L.node(ctx, c, unk, { r: 10, fill: false, alpha: 0.9 * gone, color: COL.ivory, glow: 0.4 });
      L.label(ctx, c, [unk[0], unk[1] - 34, unk[2]], '', { en: 'UNKNOWN', size: 30, enScale: 0.5, alpha: smooth(prog(d, 0.15, 0.4)) * 0.8 * rest });
    }
  },
};
