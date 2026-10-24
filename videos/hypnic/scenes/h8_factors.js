// I · 89.2–97.8 秒：为什么有些晚上特别明显。
//   完整知识图缩到左侧（h7），右侧生成新中心「哪些情况更容易出现？」，
//   金线先分成三股，再各自分叉，依次长出：睡眠不足 / 疲劳 / 压力 / 焦虑 / 咖啡因·刺激物 / 睡前剧烈运动。
//   节点位置不规整，像一张真实的知识网络；94.0 相关节点之间补上虚线；95.0 从中心亮一次。
const L = require('../lib');
const { FONT, G, rgba, lerp, prog, smooth, easeOut, easeInOut } = L;
const { collapse } = require('./h7_map');

const S = { start: 89.4, end: 97.85 };
const C = [1360, 470];
const FORK = [[1215, 360], [1585, 425], [1285, 640]];
const LEAF = [
  { zh: '睡眠不足', p: [1050, 270], f: 0, lab: [0, -30] },
  { zh: '疲劳', p: [1350, 215], f: 0, lab: [0, -30] },
  { zh: '压力', p: [1720, 300], f: 1, lab: [0, -30] },
  { zh: '焦虑', p: [1745, 600], f: 1, lab: [0, 62] },
  { zh: '咖啡因 / 刺激物', p: [1480, 760], f: 2, lab: [0, 62] },
  { zh: '睡前剧烈运动', p: [1080, 745], f: 2, lab: [0, 62] },
];
const C0 = 89.7, L0 = 90.6, LSTEP = 0.45;

function draw(ctx, d) {
  const ck = collapse(d);
  const a = 1 - smooth(prog(d, 97.0, 97.7));
  if (a <= 0.003) return;
  ctx.save();
  L.zoomAbout(ctx, C[0], C[1], lerp(1, 0.2, ck), lerp(C[0], 960, ck), lerp(C[1], 540, ck));
  const flash = d > 95.0 ? Math.exp(-(d - 95.0) / 0.35) : 0;
  // 三股主线 + 分叉
  for (let f = 0; f < 3; f++) {
    const t = L0 - 0.35 + f * LSTEP * 2;
    L.grow(ctx, [C, FORK[f]], easeOut(prog(d, t, t + 0.3)), { a: 0.85 * a, w: 1.8, glow: 7 });
    L.node(ctx, FORK[f][0], FORK[f][1], { r: 4.5, a, pop: prog(d, t + 0.25, t + 0.45) });
  }
  for (let i = 0; i < LEAF.length; i++) {
    const lf = LEAF[i], t = L0 + i * LSTEP;
    const fp = FORK[lf.f];
    const path = L.bez(fp, [lerp(fp[0], lf.p[0], 0.3), lerp(fp[1], lf.p[1], 0.7)], [lerp(fp[0], lf.p[0], 0.75), lf.p[1]], lf.p, 24);
    L.grow(ctx, path, easeOut(prog(d, t, t + 0.4)), { a: 0.75 * a, w: 1.5, glow: 5 });
    L.node(ctx, lf.p[0], lf.p[1], { r: 8 + 2 * flash, a, pop: prog(d, t + 0.35, t + 0.65), color: flash > 0.3 ? G.brightRGB : G.goldRGB });
    L.text(ctx, lf.zh, lf.p[0] + lf.lab[0], lf.p[1] + lf.lab[1] - (lf.lab[1] > 0 ? 20 : 0), { font: FONT.sans(42), color: G.text, a: a * smooth(prog(d, t + 0.4, t + 0.7)), ls: 2 });
  }
  // 相关节点之间的虚线
  const xa = smooth(prog(d, 94.0, 94.5)) * a;
  if (xa > 0.01) {
    ctx.save();
    ctx.strokeStyle = rgba(G.goldRGB, 0.35 * xa); ctx.lineWidth = 1.2; ctx.setLineDash([4, 7]);
    for (const [i, j] of [[0, 1], [2, 3], [4, 5]]) {
      const p = LEAF[i].p, q = LEAF[j].p;
      ctx.beginPath(); ctx.moveTo(p[0], p[1]); ctx.quadraticCurveTo((p[0] + q[0]) / 2 + (q[1] - p[1]) * 0.15, (p[1] + q[1]) / 2 - (q[0] - p[0]) * 0.15, q[0], q[1]); ctx.stroke();
    }
    ctx.restore();
  }
  // 中心
  L.node(ctx, C[0], C[1], { r: 12, a, pop: prog(d, C0, C0 + 0.35), color: G.brightRGB });
  L.ripple(ctx, C[0], C[1], d, 95.0, { dur: 0.8, r0: 14, r1: 120 });
  const ca = smooth(prog(d, C0 + 0.15, C0 + 0.5)) * a;
  // 标签下垫一块底色，让穿过的金线在字后面断开
  ctx.save(); ctx.fillStyle = `rgba(14,12,10,${0.92 * ca})`; ctx.beginPath(); ctx.roundRect(C[0] - 240, C[1] + 22, 480, 96, 10); ctx.fill(); ctx.restore();
  L.text(ctx, '哪些情况更容易出现？', C[0], C[1] + 68, { font: FONT.sansMed(44), color: G.head, a: ca, ls: 3 });
  L.text(ctx, 'WHAT MAKES IT MORE LIKELY?', C[0], C[1] + 104, { font: FONT.inter(17), color: G.gold, a: ca * 0.9, ls: 4 });
  ctx.restore();
}

module.exports = { ...S, draw };
