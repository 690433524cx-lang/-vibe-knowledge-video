// 7–18 s：沿警报线回溯，掠过生活里的四个「未知」。
//   事件本身是现实（绿色小核：这句话确实发生了），它后面自动长出的三步推演是预测（金色虚线环）。
//   13.5 s 全部分支向中央汇聚 →「预期性焦虑」；背景里的预测线仍在缓慢运行。
//   16.9 s 从命名节点向深处伸出一根金线，相机顺着它进入「预测」核心。
const L = require('../lib');
const { COL } = L;
const { cam, EVENTS, TITLE, CORE, NOW } = require('../world');
const { prog, smooth, lerp, easeIn, easeOut, rng } = L;

const pull = (d) => easeIn(prog(d, 13.45, 14.25));
const at = (q, k) => (k > 0 ? q.map((v, i) => lerp(v, TITLE[i], k)) : q);

// 命名之后，背景里缓慢运行的预测线
const DRIFT = (() => {
  const r = rng(909), out = [];
  for (let i = 0; i < 18; i++) {
    const a = -1.1 + r() * 2.2;
    out.push({ to: [TITLE[0] + Math.cos(a) * (420 + r() * 520), TITLE[1] + Math.sin(a) * (260 + r() * 260), TITLE[2] + 200 + r() * 900], t0: 14.2 + r() * 2.4, life: 2.2 + r() * 1.2 });
  }
  return out;
})();

module.exports = {
  start: 6.5, end: 19.5,
  draw(ctx, d) {
    const c = cam(d);
    const k = pull(d);
    // 事件节点：经过之后留在原处，命名之后逐渐退暗
    const evFade = 1 - 0.9 * smooth(prog(d, 13.8, 14.8));
    EVENTS.forEach((e, i) => {
      const app = smooth(prog(d, e.t - 1.7, e.t - 1.1));
      if (app <= 0) return;
      const a = app * evFade;
      // 推演链：经过时一节一节长出来，汇聚时被吸向中央
      let prev = e.p;
      e.cp.forEach((q0, j) => {
        const q = at(q0, k);
        const t = e.t - 0.55 + j * 0.3;
        const pts = L.curvePts(prev, q, 0.4, 12);
        const g = 1 - smooth(prog(d, 14.0, 14.3));
        L.path(ctx, c, pts, { k1: prog(d, t, t + 0.3), width: 1.5, alpha: 0.85 * g, head: true });
        if (d > t + 0.3) L.flow(ctx, c, pts, d, { n: 1, speed: 0.9, phase: j * 0.3 + i * 0.17, alpha: 0.6 * g });
        const na = smooth(prog(d, t + 0.25, t + 0.4)) * g;
        L.node(ctx, c, q, { r: 9, dashed: true, alpha: na, glow: 0.5, color: j === 2 ? L.mix(COL.gold, COL.redHi, 0.35) : COL.gold });
        L.label(ctx, c, [q[0] + 20, q[1], q[2]], e.chain[j], { size: 24, align: 'left', alpha: na * 0.88 * (1 - smooth(prog(d, 13.3, 13.6))), weight: 'reg', min: 13 });
        prev = q;
      });
      // 现实：一个很小的绿色内核
      L.node(ctx, c, e.p, { r: 13, color: COL.ivory, alpha: a, glow: 0.4, fill: false });
      L.node(ctx, c, e.p, { r: 5, color: COL.green, alpha: a, glow: 0.8, ring: false, coreR: 1 });
      L.label(ctx, c, [e.p[0] - 22, e.p[1], e.p[2]], e.text, { size: 32, align: 'right', alpha: a, en: i === 1 ? 'REALITY · ONE SENTENCE' : 'UNKNOWN', enScale: 0.36, enColor: i === 1 ? COL.green : COL.gold, enAlpha: 0.7 });
    });

    // 13.4 s：所有分支向中央汇聚时，一束光点从四周流入
    const conv = prog(d, 13.4, 14.3);
    if (conv > 0 && conv < 1) {
      EVENTS.forEach((e) => e.cp.forEach((q0) => {
        const q = at(q0, easeIn(conv));
        const P = L.proj(c, q);
        if (P.z > 40) L.glowDot(ctx, P.x, P.y, 2.6, COL.goldHi, 0.8 * (1 - conv));
      }));
    }

    // 命名
    const born = smooth(prog(d, 14.1, 14.5));
    if (born > 0) {
      // 现在 → 预期性焦虑：一直连着
      // 背景预测线
      for (const q of DRIFT) {
        let t = d - q.t0;
        if (t < 0) continue;
        t %= q.life + 0.6;
        const kk = t / q.life;
        if (kk > 1) continue;
        const pts = L.curvePts(TITLE, q.to, 0.4, 14);
        const a = 0.32 * Math.sin(Math.PI * kk) * born;
        L.path(ctx, c, pts, { k1: easeOut(Math.min(1, kk * 1.6)), width: 1, alpha: a, head: true, headR: 2 });
        L.node(ctx, c, q.to, { r: 6, dashed: true, alpha: a * smooth(prog(kk, 0.55, 0.7)), glow: 0.3 });
      }
      L.pulseRing(ctx, c, TITLE, prog(d, 14.15, 15.2), { r0: 20, r1: 340, alpha: 0.7, width: 2 });
      L.pulseRing(ctx, c, TITLE, prog(d, 14.4, 15.6), { r0: 20, r1: 200, alpha: 0.4, width: 1.2 });
      L.node(ctx, c, TITLE, { r: 22 * born, color: COL.goldHi, glow: 1.5, coreR: 0.5 });
      const ta = born * (1 - smooth(prog(d, 17.0, 17.45)));
      L.label(ctx, c, [TITLE[0], TITLE[1] + 150, TITLE[2]], '预期性焦虑', { size: 118, alpha: ta, weight: 'reg', ls: 0.18, max: 120, en: 'ANTICIPATORY ANXIETY', enScale: 0.3, enBelow: false, enColor: COL.gold });
    }

    // 16.9 s：顺着一根金线进入「预测」
    const fly = prog(d, 16.85, 18.25);
    if (fly > 0) {
      const pts = L.curvePts(TITLE, CORE, 0.05, 24);
      L.path(ctx, c, pts, { k1: L.easeInOut(fly), width: 2.2, alpha: 0.95, head: true, headR: 5 });
      if (fly >= 1) L.flow(ctx, c, pts, d, { n: 6, speed: 0.5, alpha: 0.7 });
    }
    void NOW;
  },
};
