// H · 79.0–97.8 秒：第一次完整知识结构高潮。
//   前面出现过的知识节点被重新连成一条路径：一个节点 → 一根金线 → 下一个节点，约 6.5 s 搭完：
//     开始入睡 → 肌肉放松 → 身体信号发生变化 → 位置·平衡·运动感知 短暂不一致
//     → 可能产生下坠感 → 短暂不自主肌肉抽动 → 瞬间清醒 → 入睡抽动 HYPNIC JERK（最下方中央）
//   86.4 一道很轻的金色脉冲从起点一路走到「入睡抽动」（不爆炸，只亮一次）。
//   I 段（89.2 起）整张图缩到左侧继续保留；J 段（97.0 起）向中心收拢、熄灭。
const L = require('../lib');
const { FONT, G, rgba, lerp, clamp, prog, smooth, easeOut, easeInOut } = L;

const S = { start: 79.0, end: 97.85 };
const R1 = 340, R2 = 610, LINK = 455;
const N = [
  { zh: ['开始入睡'], p: [250, R1] },
  { zh: ['肌肉放松'], p: [680, R1] },
  { zh: ['身体信号发生变化'], p: [1110, R1] },
  { zh: ['位置 · 平衡 · 运动感知', '短暂不一致'], p: [1580, R1] },
  { zh: ['可能产生下坠感'], p: [360, R2] },
  { zh: ['短暂不自主肌肉抽动'], p: [930, R2] },
  { zh: ['瞬间清醒'], p: [1500, R2] },
];
const FIN = [960, 770];
const T0 = 79.6, STEP = 0.85;
const tNode = (k) => T0 + STEP * k;           // k = 7 为「入睡抽动」
// 每一段连线（从节点 k-1 到 k）
function segPath(k) {
  if (k === 4) return [N[3].p, [N[3].p[0], LINK], [120, LINK], [120, R2], [N[4].p[0] - 12, R2]];
  if (k === 7) return L.bez(N[6].p, [N[6].p[0], 720], [FIN[0] + 260, FIN[1]], [FIN[0] + 14, FIN[1]], 30);
  return [N[k - 1].p, N[k].p];
}
const ALL = (() => { let out = []; for (let k = 1; k <= 7; k++) out = out.concat(segPath(k)); return out; })();
const PULSE0 = 86.4, PULSE1 = 88.6;

// I 段：缩到左侧；J 段：收拢
const shrink = (d) => easeInOut(prog(d, 89.2, 90.2));
const collapse = (d) => easeInOut(prog(d, 97.0, 97.8));
const MAP_C = [945, 560];

function draw(ctx, d) {
  const sk = shrink(d), ck = collapse(d);
  const a0 = lerp(1, 0.5, sk) * (1 - smooth(prog(d, 97.0, 97.7)));
  if (a0 <= 0.003) return;
  ctx.save();
  // 缩到左侧：(945,560) → (480,560)，比例 0.52
  const s = lerp(1, 0.52, sk) * lerp(1, 0.2, ck);
  const tx = lerp(lerp(MAP_C[0], 480, sk), 960, ck), ty = lerp(MAP_C[1], 540, ck);
  L.zoomAbout(ctx, MAP_C[0], MAP_C[1], s, tx, ty);
  // 字在缩小后也要能认：缩小时字号补偿一部分
  const comp = lerp(1, 1.35, sk);
  const pulseK = prog(d, PULSE0, PULSE1);
  const totalLen = L.pathLen(ALL);
  // 路径到达各节点的比例
  let acc = 0; const at = [0];
  for (let k = 1; k <= 7; k++) { acc += L.pathLen(segPath(k)); at.push(acc / totalLen); }
  for (let k = 1; k <= 7; k++) {
    const t = tNode(k);
    const gk = easeInOut(prog(d, t - 0.55, t - 0.08));
    L.grow(ctx, segPath(k), gk, { a: 0.85 * a0, w: 1.8 / s * Math.min(1, s * 1.4), glow: 7 });
    if (gk >= 1 && k !== 4 && k !== 7) L.arrowMid(ctx, N[k - 1].p, N[k].p, a0 * 0.8);
  }
  for (let k = 0; k < 7; k++) {
    const n = N[k], t = tNode(k);
    const passed = pulseK > 0 ? Math.exp(-Math.pow((pulseK - at[k]) / 0.03, 2)) : 0;
    L.node(ctx, n.p[0], n.p[1], { r: 9 + 3 * passed, a: a0, pop: prog(d, t, t + 0.3), color: passed > 0.3 ? G.brightRGB : G.goldRGB });
    L.ripple(ctx, n.p[0], n.p[1], d, t, { dur: 0.5, r0: 10, r1: 40 });
    const la = smooth(prog(d, t + 0.1, t + 0.4)) * a0;
    const px = Math.round(40 * comp);
    n.zh.forEach((line, i) => {
      const y = n.p[1] - 34 - (n.zh.length - 1 - i) * Math.round(px * 1.2);
      L.text(ctx, line, n.p[0], y, { font: FONT.sans(i === 0 && n.zh.length > 1 ? Math.round(px * 0.92) : px), color: passed > 0.3 ? G.bright : G.text, a: la, ls: 2 });
    });
  }
  // 入睡抽动
  const tf = tNode(7);
  const hit = pulseK > 0.97 ? Math.exp(-(d - (PULSE0 + (PULSE1 - PULSE0) * 0.97)) / 0.5) : 0;
  L.node(ctx, FIN[0], FIN[1], { r: 12 + 3 * hit, a: a0, pop: prog(d, tf, tf + 0.35), color: G.brightRGB });
  L.ripple(ctx, FIN[0], FIN[1], d, tf, { dur: 0.7, r0: 14, r1: 70 });
  L.ripple(ctx, FIN[0], FIN[1], d, PULSE1, { dur: 0.9, r0: 14, r1: 90 });
  const fa = smooth(prog(d, tf + 0.1, tf + 0.45)) * a0;
  L.text(ctx, '入睡抽动', FIN[0], FIN[1] + 72, { font: FONT.sansMed(Math.round(56 * comp)), color: G.head, a: fa, ls: 8, glow: 6 * hit });
  L.text(ctx, 'HYPNIC JERK', FIN[0], FIN[1] + 110 + (comp - 1) * 30, { font: FONT.interSemi(Math.round(20 * comp)), color: G.gold, a: fa, ls: 8 });
  // 金色脉冲沿整条路径走一遍
  if (pulseK > 0 && pulseK < 1) {
    const q = L.along(ALL, easeInOut(pulseK));
    const g = ctx.createRadialGradient(q[0], q[1], 0, q[0], q[1], 34);
    g.addColorStop(0, rgba(G.brightRGB, 0.9 * a0));
    g.addColorStop(1, rgba(G.brightRGB, 0));
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(q[0], q[1], 34, 0, Math.PI * 2); ctx.fill();
    L.grow(ctx, ALL, easeInOut(pulseK), { a: 0.5 * a0 * (1 - pulseK * 0.3), w: 2.6, glow: 12, color: G.brightRGB, tip: false });
  }
  if (d >= PULSE1) {
    const after = 1 - smooth(prog(d, PULSE1, PULSE1 + 0.8));
    if (after > 0.01) L.grow(ctx, ALL, 1, { a: 0.35 * after * a0, w: 2.6, glow: 12, color: G.brightRGB, tip: false });
  }
  ctx.restore();
}

module.exports = { ...S, draw, collapse };
