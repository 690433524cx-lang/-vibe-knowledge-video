// G · 68.2–79.6 秒：为什么身体会猛地抖一下。
//   「下坠感」向右长出「运动反应 MOTOR RESPONSE」，再展开一个像电路一样的极简传导图：
//     大脑 → 脊髓 → 左臂 / 右臂 / 左腿 / 右腿（不画真实神经解剖）。
//   70.6 金色信号点从大脑快速向下，过脊髓后分成四路，71.1 到达四肢，右侧人体线稿收紧一次。
//   71.3 「< 1 SEC」停 0.7 s 后缩小。75.6 上方重新出现 清醒 → 困倦 → 睡眠，
//   金点刚到睡眠前缘，77.0 被弹回一点（不退回清醒）。
const L = require('../lib');
const { FONT, G, rgba, lerp, clamp, prog, smooth, easeOut, easeInOut, impulse } = L;
const { G_POS } = require('./h5_falling');

const S = { start: 68.21, end: 79.6 };
const OUT0 = 78.9, OUT1 = 79.6;
const MR = [640, 520];
const BR = [1040, 250];
const SP = { top: [1040, 296], arm: [1040, 410], leg: [1040, 640] };
const LIMBS = [
  { zh: '左臂', path: [SP.arm, [860, 410], [860, 470]] },
  { zh: '右臂', path: [SP.arm, [1220, 410], [1220, 470]] },
  { zh: '左腿', path: [SP.leg, [880, 640], [880, 720]] },
  { zh: '右腿', path: [SP.leg, [1200, 640], [1200, 720]] },
];
const BODY = { x: 1370, y: 660, s: 0.82 };
const SIG0 = 70.6, SIG1 = 70.9, SIG2 = 71.12;
const AX = { x0: 600, x1: 1440, y: 150 };

function draw(ctx, d) {
  const out = 1 - smooth(prog(d, OUT0, OUT1));
  const recede = lerp(1, 0.45, smooth(prog(d, 75.4, 76.0)));
  const a = out * recede;
  // 下坠感 → 运动反应
  L.node(ctx, G_POS[0], G_POS[1], { r: 10, a });
  L.label(ctx, '下坠感', 'FALLING SENSATION', G_POS[0], G_POS[1] + 66, { a, zhPx: 44, enPx: 17, gap: 36, color: G.bright, enColor: G.gold });
  L.grow(ctx, [[G_POS[0] + 14, G_POS[1]], [MR[0] - 12, MR[1]]], easeOut(prog(d, 68.3, 68.75)), { a: 0.85 * a });
  L.arrowMid(ctx, G_POS, MR, a * smooth(prog(d, 68.7, 68.9)));
  L.node(ctx, MR[0], MR[1], { r: 9, a, pop: prog(d, 68.7, 69.0) });
  L.label(ctx, '运动反应', 'MOTOR RESPONSE', MR[0], MR[1] + 66, { a: a * smooth(prog(d, 68.85, 69.15)), zhPx: 42, enPx: 17, gap: 36 });
  // 运动反应 → 大脑
  const toBrain = [[MR[0] + 12, MR[1]], [780, MR[1]], [780, BR[1]], [BR[0] - 72, BR[1]]];
  L.grow(ctx, toBrain, easeInOut(prog(d, 69.0, 69.5)), { a: 0.6 * a, w: 1.4, glow: 4 });
  L.brain(ctx, BR[0], BR[1], { a, pop: prog(d, 69.35, 69.75), glow: Math.exp(-Math.max(0, d - SIG0) / 0.2) * (d > SIG0 ? 1 : 0) });
  L.label(ctx, '大脑', 'BRAIN', BR[0] + 96, BR[1] + 10, { a: a * smooth(prog(d, 69.6, 69.9)), zhPx: 40, enPx: 16, gap: 30, align: 'left' });
  // 脊髓
  const spine = [SP.top, SP.leg];
  L.grow(ctx, spine, easeInOut(prog(d, 69.7, 70.15)), { a: 0.9 * a, w: 2.2, glow: 8 });
  L.label(ctx, '脊髓', 'SPINAL CORD', 1012, 568, { a: a * smooth(prog(d, 70.0, 70.3)), zhPx: 36, enPx: 15, gap: 28, align: 'right' });
  for (let i = 0; i < 4; i++) {
    const lb = LIMBS[i];
    const t0 = 70.05 + (i < 2 ? 0 : 0.15);
    L.grow(ctx, lb.path, easeOut(prog(d, t0, t0 + 0.35)), { a: 0.8 * a, w: 1.7, glow: 6 });
    const end = lb.path[lb.path.length - 1];
    const hit = d > SIG2 ? Math.exp(-(d - SIG2) / 0.25) : 0;
    L.node(ctx, end[0], end[1], { r: 8 + 3 * hit, a, pop: prog(d, t0 + 0.3, t0 + 0.55), color: hit > 0.3 ? G.brightRGB : G.goldRGB });
    L.text(ctx, lb.zh, end[0], end[1] + 50, { font: FONT.sans(36), color: G.text, a: a * smooth(prog(d, t0 + 0.4, t0 + 0.65)), ls: 2 });
  }
  // 信号：大脑 → 脊髓 → 四路
  if (d > SIG0 && d < SIG2 + 0.3) {
    if (d < SIG1) {
      const q = L.along(spine, easeInOut(prog(d, SIG0, SIG1)));
      L.node(ctx, q[0], q[1], { r: 7, a: out, color: G.brightRGB });
    } else {
      for (const lb of LIMBS) {
        const from = lb.path[0][1] === SP.arm[1] ? [[SP.top[0], lerp(SP.top[1], SP.arm[1], 1)], ...lb.path] : lb.path;
        const k = easeOut(prog(d, SIG1 - (lb.path[0] === SP.arm ? 0.12 : 0), SIG2));
        const q = L.along(lb.path, k);
        if (k < 1) L.node(ctx, q[0], q[1], { r: 6, a: out, color: G.brightRGB });
        void from;
      }
    }
    // 走过的路径短暂变亮
    const lit = 1 - smooth(prog(d, SIG2, SIG2 + 0.3));
    L.grow(ctx, spine, easeInOut(prog(d, SIG0, SIG1)), { a: 0.9 * lit * out, w: 3, glow: 14, color: G.brightRGB, tip: false });
  }
  L.ripple(ctx, BR[0], BR[1], d, SIG0, { dur: 0.5, r0: 40, r1: 110 });
  // 人体：收紧一次
  const ba = out * smooth(prog(d, 69.8, 70.3)) * lerp(1, 0.6, smooth(prog(d, 75.4, 76.0)));
  const jerk = Math.min(1, impulse(d, SIG2));
  const flash = d > SIG2 ? 0.9 * Math.exp(-(d - SIG2) / 0.15) : 0;
  L.body(ctx, BODY.x, BODY.y, { a: 0.55 * ba, jerk, flash: flash * out, pulse: prog(d, SIG2 + 0.02, SIG2 + 0.45), scale: BODY.s });
  // < 1 SEC
  const sa = smooth(prog(d, 71.3, 71.45)) * out;
  if (sa > 0.01) {
    const sk = easeInOut(prog(d, 72.0, 72.45));
    L.text(ctx, '< 1 SEC', lerp(1580, 1580, sk), lerp(480, 560, sk), { font: FONT.mono(Math.round(lerp(84, 30, sk))), color: G.bright, a: sa * recede, glow: lerp(18, 0, sk) });
  }
  // 状态轴：重新出现
  const xa = smooth(prog(d, 75.5, 75.9)) * out;
  if (xa > 0.01) {
    L.grow(ctx, [[AX.x0, AX.y], [AX.x1, AX.y]], easeOut(prog(d, 75.5, 76.0)), { a: xa, w: 1.8, glow: 10, color: [226, 180, 102], tip: false });
    const xs = [AX.x0, (AX.x0 + AX.x1) / 2, AX.x1];
    ['清醒', '困倦', '睡眠'].forEach((t, i) => {
      L.node(ctx, xs[i], AX.y, { r: 7.5, a: xa * (i === 2 ? 0.75 : 1), hollow: i === 2 });
      L.text(ctx, t, xs[i], AX.y - 30, { font: FONT.sans(40), color: G.text, a: xa, ls: 2 });
    });
    let u = lerp(0.6, 0.93, easeInOut(prog(d, 75.9, 76.95)));
    if (d > 77.0) u = lerp(0.93, 0.76, L.spring(d, 77.0, 2.2, 0.8));
    const px = lerp(AX.x0, AX.x1, u);
    L.node(ctx, px, AX.y, { r: 9.75, a: xa, color: G.brightRGB });
    L.ripple(ctx, lerp(AX.x0, AX.x1, 0.93), AX.y, d, 77.0, { dur: 0.6, r0: 10, r1: 50 });
    if (d > 77.0 && d < 77.6) {
      for (let i = 1; i <= 6; i++) {
        const uu = lerp(0.93, 0.76, L.spring(d - i * 0.03, 77.0, 2.2, 0.8));
        L.node(ctx, lerp(AX.x0, AX.x1, uu), AX.y, { r: 6 - i * 0.6, a: xa * 0.4 * (1 - prog(d, 77.0, 77.6)) });
      }
    }
  }
}

module.exports = { ...S, draw };
