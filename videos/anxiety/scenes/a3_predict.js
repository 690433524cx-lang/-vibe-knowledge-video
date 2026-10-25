// 18–25 s：「预测」核心。四路输入依次接入，持续把小光点送进核心；
// 核心向右输出：下一秒 → 下一分钟 → 明天 → 以后。
const L = require('../lib');
const { COL } = L;
const { cam, CORE, INPUTS } = require('../world');
const { prog, smooth, easeOut } = L;

const OUTS = ['下一秒', '下一分钟', '明天', '以后'].map((t, i) => ({ t, en: ['NEXT SECOND', 'NEXT MINUTE', 'TOMORROW', 'LATER'][i], p: [CORE[0] + 520 + i * 360, CORE[1] + 10, CORE[2] + 80 + i * 160], at: 20.6 + i * 0.35 }));

module.exports = {
  start: 17.3, end: 40,
  draw(ctx, d) {
    const c = cam(d);
    const app = smooth(prog(d, 17.9, 18.35));
    if (app <= 0) return;
    // 核心：内核 + 一圈缓慢转动的刻度 + 两段弧
    const P = L.proj(c, CORE);
    if (P.z > 40) {
      const s = P.s;
      ctx.save();
      ctx.translate(P.x, P.y);
      const rot = d * 0.12;
      ctx.strokeStyle = L.rgba(COL.gold, 0.45 * app);
      ctx.lineWidth = 1;
      for (let i = 0; i < 90; i++) {
        const a = rot + (i / 90) * Math.PI * 2, r0 = 190 * s, r1 = (i % 5 ? 198 : 210) * s;
        ctx.beginPath();
        ctx.moveTo(Math.cos(a) * r0, Math.sin(a) * r0);
        ctx.lineTo(Math.cos(a) * r1, Math.sin(a) * r1);
        ctx.stroke();
      }
      ctx.lineWidth = Math.max(1, 1.6 * s);
      ctx.strokeStyle = L.rgba(COL.goldHi, 0.6 * app);
      ctx.beginPath(); ctx.arc(0, 0, 150 * s, -rot * 2.3, -rot * 2.3 + 1.4); ctx.stroke();
      ctx.beginPath(); ctx.arc(0, 0, 150 * s, -rot * 2.3 + Math.PI, -rot * 2.3 + Math.PI + 0.8); ctx.stroke();
      ctx.strokeStyle = L.rgba(COL.gold, 0.22 * app);
      ctx.beginPath(); ctx.arc(0, 0, 120 * s, 0, Math.PI * 2); ctx.stroke();
      ctx.restore();
    }
    L.pulseRing(ctx, c, CORE, prog(d, 18.1, 19.1), { r0: 40, r1: 360, alpha: 0.6 });
    L.node(ctx, c, CORE, { r: 56 * app, color: COL.goldHi, glow: 1.3, coreR: 0.36 });
    L.label(ctx, c, [CORE[0], CORE[1] + 250, CORE[2]], '预测', { size: 46, alpha: app, en: 'PREDICTION', enScale: 0.4, enBelow: false });

    INPUTS.forEach((q, i) => {
      const a = smooth(prog(d, q.t, q.t + 0.25));
      if (a <= 0) return;
      const pts = L.curvePts(q.p, CORE, 0.35, 16);
      L.path(ctx, c, pts, { k1: easeOut(prog(d, q.t + 0.05, q.t + 0.5)), width: 1.6, alpha: 0.85, head: true });
      if (d > q.t + 0.45) L.flow(ctx, c, pts, d, { n: 4, speed: 0.75, phase: i * 0.13, alpha: 0.9 });
      L.pulseRing(ctx, c, q.p, prog(d, q.t, q.t + 0.6), { r0: 14, r1: 90, alpha: 0.7 });
      L.node(ctx, c, q.p, { r: 16 * a, glow: 1.0 });
      const left = q.o[0] < 0;
      L.label(ctx, c, [q.p[0] + (left ? -34 : 34), q.p[1], q.p[2]], q.cn, { size: 30, align: left ? 'right' : 'left', alpha: a, en: q.en, enScale: 0.42, weight: 'reg' });
    });

    // 输出：向右的时间轴
    let prev = CORE;
    OUTS.forEach((o, i) => {
      const pts = L.curvePts(prev, o.p, 0.3, 12);
      L.path(ctx, c, pts, { k1: prog(d, o.at - 0.3, o.at), width: 1.5, alpha: 0.8, head: true });
      const a = smooth(prog(d, o.at - 0.05, o.at + 0.2));
      if (a <= 0) return;
      if (d > o.at) L.flow(ctx, c, pts, d, { n: 2, speed: 0.9, phase: i * 0.25, alpha: 0.7 });
      L.node(ctx, c, o.p, { r: 11, dashed: true, alpha: a, glow: 0.6 });
      L.label(ctx, c, [o.p[0], o.p[1] - 44, o.p[2]], o.t, { size: 26, alpha: a, en: o.en, enScale: 0.42, enBelow: false, weight: 'reg' });
      prev = o.p;
    });
  },
};
