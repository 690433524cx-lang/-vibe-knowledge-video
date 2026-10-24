// F · 54.2–68.2 秒：为什么偏偏感觉像踩空。
//   「身体位置」节点向右长出两条随时间推进的曲线：
//     真实位置 REAL POSITION（米白）——始终水平，上面躺着一个很小的人体线稿；
//     运动感知 PERCEIVED MOTION（金）——59.6 s 附近突然向下弯。
//   62.0 从下弯处长出 失重 / 下坠 / 踩空，三条细线汇聚到「下坠感 FALLING SENSATION」。
//   65.2 其余全部压暗，中央只留亮金「踩空」约 1 s；66.3 缩回网络。
//   67.1–68.2 只留「下坠感」，移到 G 段的位置，交给 h6。
const L = require('../lib');
const { FONT, G, rgba, lerp, clamp, prog, smooth, easeOut, easeInOut } = L;
const { F_POS } = require('./h4_mismatch');

const S = { start: 54.21, end: 68.2 };
const X0 = 420, X1 = 1640, YR = 290, YP = 440, DIP = 135;
const DIP_X = 1090;
const G_POS = [300, 520];   // h6 里「下坠感」的位置
const OUT0 = 67.1, OUT1 = 68.2;

// 播放头：先慢后到达下弯处，再走完
function head(d) {
  if (d < 58.6) return lerp(X0, 980, prog(d, 54.6, 58.6));
  if (d < 59.6) return lerp(980, 1150, prog(d, 58.6, 59.6));
  return lerp(1150, X1, easeOut(prog(d, 59.6, 61.4)));
}
// 感知线在 x 处向下偏了多少（0..1）
function dip(x) {
  if (x < DIP_X - 70) return 0;
  if (x < DIP_X) { const k = (x - (DIP_X - 70)) / 70; return k * k * (3 - 2 * k); }
  return 0.3 + 0.7 * Math.exp(-(x - DIP_X) / 120);
}
const KW = [
  { zh: '失重', p: [770, 660], t: 62.0, al: 'right' },
  { zh: '下坠', p: [1090, 690], t: 62.35, al: 'right' },
  { zh: '踩空', p: [1410, 660], t: 62.7, al: 'left' },
];
const FS = [1090, 805];   // 下坠感
const BIG0 = 65.2, BIG1 = 66.3, BACK = 67.0;

function draw(ctx, d) {
  const out = 1 - smooth(prog(d, OUT0, OUT0 + 0.6));
  const big = smooth(prog(d, BIG0, BIG0 + 0.15)) * (1 - smooth(prog(d, BIG1, BACK)));
  const dimAll = lerp(1, 0.14, big);
  const a = out * dimAll;
  const hx = head(d);
  // 起点节点（身体位置）
  L.node(ctx, F_POS[0], F_POS[1], { r: 11, a });
  L.label(ctx, '身体位置', 'BODY POSITION', F_POS[0] - 30, F_POS[1] + 14, { a, zhPx: 42, enPx: 17, gap: 32, align: 'right' });
  // 两条线：从节点分出
  const gk = easeOut(prog(d, 54.3, 54.8));
  const stemR = L.bez(F_POS, [F_POS[0] + 60, F_POS[1]], [X0 - 60, YR], [X0, YR], 20);
  const stemP = L.bez(F_POS, [F_POS[0] + 60, F_POS[1]], [X0 - 60, YP], [X0, YP], 20);
  L.grow(ctx, stemR, gk, { a: 0.6 * a, w: 1.6, glow: 0, color: G.dimLine, tip: false });
  L.grow(ctx, stemP, gk, { a: 0.85 * a, w: 1.8, glow: 6, tip: false });
  const real = [], perc = [];
  for (let x = X0; x <= X1; x += 6) { real.push([x, YR]); perc.push([x, YP + DIP * dip(x)]); }
  const k = clamp((hx - X0) / (X1 - X0)) * (gk >= 1 ? 1 : 0);
  L.grow(ctx, real, k, { a: 0.85 * a, w: 2, glow: 0, color: [236, 226, 207], tip: false });
  L.grow(ctx, perc, k, { a: a, w: 2.2, glow: 9, tip: false });
  if (k > 0 && k < 1) {
    L.node(ctx, hx, YR, { r: 5, a, color: [236, 226, 207] });
    L.node(ctx, hx, YP + DIP * dip(hx), { r: 5.5, a, color: G.brightRGB });
  }
  // 标签
  const la = smooth(prog(d, 54.7, 55.1)) * a;
  const lab = (zh, en, y, col, enCol) => {
    const w = L.text(ctx, zh, X0, y - 22, { font: FONT.sans(38), color: col, a: la, align: 'left', ls: 2 });
    L.text(ctx, en, X0 + w + 16, y - 24, { font: FONT.inter(16), color: enCol, a: la, align: 'left', ls: 4 });
  };
  lab('真实位置', 'REAL POSITION', YR, G.head, G.grey);
  lab('运动感知', 'PERCEIVED MOTION', YP, G.bright, G.gold);
  // 真实位置上躺着的小人：一直没动
  L.body(ctx, 1380, YR - 4, { a: 0.6 * a * smooth(prog(d, 56.5, 57.0)), scale: 0.42 });
  L.text(ctx, '没有移动', 1380 + 110, YR + 44, { font: FONT.sans(26), color: G.grey, a: a * smooth(prog(d, 57.2, 57.6)), ls: 2 });
  // 下弯处
  const dp = [DIP_X + 10, YP + DIP * dip(DIP_X + 10)];
  L.ripple(ctx, dp[0], dp[1], d, 59.6, { dur: 0.8, r0: 10, r1: 70 });
  // 真实 vs 感知之间的错配区（极淡的竖线）
  const ma = a * smooth(prog(d, 59.9, 60.4));
  if (ma > 0.01) {
    ctx.save();
    ctx.strokeStyle = rgba(G.dimLine, 0.3 * ma); ctx.lineWidth = 1; ctx.setLineDash([3, 6]);
    ctx.beginPath(); ctx.moveTo(dp[0], YR + 8); ctx.lineTo(dp[0], dp[1] - 10); ctx.stroke();
    ctx.restore();
  }
  // 三个关键词 → 下坠感
  for (const w of KW) {
    const kk = easeOut(prog(d, w.t, w.t + 0.4));
    const path = L.bez(dp, [dp[0], dp[1] + 40], [w.p[0], w.p[1] - 60], w.p, 24);
    L.grow(ctx, path, kk, { a: 0.75 * a, w: 1.5, glow: 5 });
    const isStep = w.zh === '踩空';
    const ka = (isStep ? out * lerp(1, 1, big) : a);
    L.node(ctx, w.p[0], w.p[1], { r: 7, a: ka * (isStep ? 1 : 1), pop: prog(d, w.t + 0.35, w.t + 0.65) });
    const ta = smooth(prog(d, w.t + 0.35, w.t + 0.6));
    if (!isStep || d < BIG0 || d > BACK) {
      const off = w.al === 'right' ? -22 : 22;
      L.text(ctx, w.zh, w.p[0] + off, w.p[1] + 14, { font: FONT.sansMed(44), color: isStep ? G.bright : G.head, a: ta * (isStep ? out * (1 - big) : a), align: w.al, ls: 4 });
    }
    const ck = easeOut(prog(d, 63.0 + KW.indexOf(w) * 0.15, 63.5 + KW.indexOf(w) * 0.15));
    L.grow(ctx, L.bez(w.p, [w.p[0], w.p[1] + 50], [FS[0], FS[1] - 60], FS, 20), ck, { a: 0.7 * a, w: 1.5, glow: 5 });
  }
  const fa = smooth(prog(d, 63.6, 63.95));
  L.node(ctx, FS[0], FS[1], { r: 10, a: fa * a, pop: prog(d, 63.55, 63.9) });
  // 下坠感：标签在右；退场时移到 G_POS（标签换到下方）
  const mk = easeInOut(prog(d, OUT0, OUT1));
  const fp = [lerp(FS[0], G_POS[0], mk), lerp(FS[1], G_POS[1], mk)];
  if (mk > 0) L.node(ctx, fp[0], fp[1], { r: 10, a: 1 });
  const fla = fa * dimAll * (1 - smooth(prog(d, OUT0, OUT0 + 0.4)));
  const w1 = L.text(ctx, '下坠感', FS[0] + 30, FS[1] + 14, { font: FONT.sansMed(44), color: G.bright, a: fla, align: 'left', ls: 3 });
  L.text(ctx, 'FALLING SENSATION', FS[0] + 30 + w1 + 16, FS[1] + 12, { font: FONT.inter(16), color: G.gold, a: fla * 0.9, align: 'left', ls: 4 });
  const nla = smooth(prog(d, OUT1 - 0.5, OUT1));
  L.label(ctx, '下坠感', 'FALLING SENSATION', fp[0], fp[1] + 66, { a: nla, zhPx: 44, enPx: 17, gap: 36, color: G.bright, enColor: G.gold });

  // 「踩空」：亮金，单独留在中央；之后缩回关键词位置
  if (d > BIG0 && d < BACK + 0.05) {
    const back = easeInOut(prog(d, BIG1, BACK));
    const px = lerp(170, 44, back);
    const st = KW[2];
    const x = lerp(960, st.p[0] + 22, back), y = lerp(600, st.p[1] + 14, back);
    const ba = smooth(prog(d, BIG0, BIG0 + 0.15));
    L.text(ctx, '踩空', x, y, { font: FONT.sansMed(Math.round(px)), color: G.bright, a: ba, align: back > 0.5 ? 'left' : 'center', ls: lerp(18, 4, back), glow: lerp(26, 0, back) });
  }
}

module.exports = { ...S, draw, G_POS };
