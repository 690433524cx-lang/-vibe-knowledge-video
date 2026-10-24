// 插段 · 原片 13.65 s 后的 7.0 s（总时间轴 13.65–20.65）：「长个」误区反转。
//   0.0  标题「入睡抽动」缩小，移到画面上方中央。
//   0.3  中央「等等。」（停 0.3 s）
//   0.95 「你是不是一直以为——」（不到 1 s）
//   1.6  「睡觉突然抖一下，是在长个？」——「长个」暖金；右侧一根身高刻度 160 / 170 / 180，
//        旁边一个站立的极简人体轮廓，头顶一条虚线轮廓沿刻度向上一点（只是示意，不拉长人体）。
//        标题与「长个」之间出现一条虚线：原本假设的连接。
//   2.35 句尾问号变成金色并放大；2.9 问号轻轻一转，一道金线划断那条虚线连接。
//   4.3  刻度、人体和「长个」逐渐变暗；4.9 标题重新亮起，从它向下长出：
//        入睡 → 身体放松 → 神经—肌肉状态变化 → 突然抽动
//   6.2–7.0 其余淡出，「入睡」节点向两侧展开成原片那条状态轴（原片画面从中心展开），标题去到左上角。
const L = require('../lib');
const { FONT, G, rgba, lerp, clamp, prog, smooth, easeOut, easeInOut } = L;
const NAME = require('./h2_name');

const S = { start: -1, end: -1, insert: true };
const TOP = [960, 168];          // 标题在上方中央的基线
const TOP_PX = 66;
const TN = [960, 232];           // 标题下方的节点
const PATH = [
  { zh: '入睡', y: 330, t: 5.15 },
  { zh: '身体放松', y: 445, t: 5.4 },
  { zh: '神经—肌肉状态变化', y: 560, t: 5.65 },
  { zh: '突然抽动', y: 675, t: 5.9 },
];
const AX_Y = 290;               // 原片 13.65 s 时状态轴（淡）所在高度
const RUL = { x: 1640, y160: 520, step: 70 };   // 刻度：160 在下，每 10 cm 70 px
const BODY = { x: 1760, feet: 760, s: 0.6 };

function title(ctx, u) {
  // 0–0.5 从中央大标题缩到上方中央；6.2–7.0 再去左上角（与 h2 的小标签对齐）
  ctx.save();
  ctx.font = FONT.sansMed(NAME.PX); ctx.letterSpacing = '14px';
  const tw = ctx.measureText('入睡抽动').width;
  ctx.restore();
  const k1 = easeInOut(prog(u, 0, 0.5)), k2 = easeInOut(prog(u, 6.2, 7.0));
  const sTop = TOP_PX / NAME.PX, sTag = NAME.TAG_PX / NAME.PX;
  let s = lerp(1, sTop, k1), cx = 960, cy = lerp(NAME.CY, TOP[1], k1);
  s = lerp(s, sTag, k2); cx = lerp(cx, 120 + (tw * sTag) / 2, k2); cy = lerp(cy, 96, k2);
  // 4.3–4.9 跟着误区一起暗一点，4.9 重新亮起
  const relit = smooth(prog(u, 4.9, 5.1));
  const a = lerp(1, 0.62, k2) * lerp(1, lerp(0.55, 1, relit), smooth(prog(u, 4.3, 4.8)));
  ctx.save();
  ctx.translate(cx, cy); ctx.scale(s, s);
  L.text(ctx, '入睡抽动', 0, 0, { font: FONT.sansMed(NAME.PX), color: G.head, a, ls: 14, glow: 14 * relit * (1 - smooth(prog(u, 5.3, 6.0))) / s });
  const big = 1 - smooth(prog(u, 0, 0.3));
  L.text(ctx, 'HYPNIC JERK', 0, 118, { font: FONT.interSemi(30), color: G.gold, a: a * big, ls: 10 });
  L.text(ctx, 'SLEEP START', 0, 158, { font: FONT.inter(20), color: G.grey, a: a * big, ls: 8 });
  ctx.restore();
  const ea = smooth(prog(u, 0.4, 0.7)) * (1 - smooth(prog(u, 6.2, 6.5))) * lerp(1, lerp(0.55, 1, relit), smooth(prog(u, 4.3, 4.8)));
  L.text(ctx, 'HYPNIC JERK', TOP[0], TOP[1] + 30, { font: FONT.inter(16), color: G.gold, a: ea * 0.9, ls: 6 });
}

// 「睡觉突然抖一下，是在长个？」：返回「长个」两字的位置，以及问号的位置
function hookLine(ctx, u, a) {
  const px = 72, y = 590;
  ctx.save();
  ctx.font = FONT.sansMed(px); ctx.letterSpacing = '4px';
  const parts = ['睡觉突然抖一下，是在', '长个', '？'];
  const ws = parts.map((p) => ctx.measureText(p).width);
  ctx.restore();
  const x0 = 960 - (ws[0] + ws[1] + ws[2]) / 2;
  const rise = (1 - easeOut(prog(u, 1.6, 1.9))) * 6;
  L.text(ctx, parts[0], x0, y + rise, { font: FONT.sansMed(px), color: G.head, a, align: 'left', ls: 4 });
  const growDim = 1 - 0.75 * smooth(prog(u, 4.3, 4.9));
  L.text(ctx, parts[1], x0 + ws[0], y + rise, { font: FONT.sansMed(px), color: G.bright, a: a * growDim / Math.max(0.001, 1 - 0.75 * smooth(prog(u, 4.3, 4.9))) * growDim, align: 'left', ls: 4, glow: 10 });
  // 问号：2.35 变金放大；2.9 轻轻一转
  const qk = smooth(prog(u, 2.35, 2.55));
  const qs = 1 + 0.35 * qk, rot = 0.22 * Math.sin(Math.PI * prog(u, 2.9, 3.25));
  const qx = x0 + ws[0] + ws[1] + ws[2] / 2, qy = y + rise - px * 0.36;
  ctx.save();
  ctx.translate(qx, qy); ctx.rotate(rot); ctx.scale(qs, qs);
  L.text(ctx, '？', 0, px * 0.36, { font: FONT.sansMed(px), color: qk > 0.5 ? G.bright : G.head, a: a * growDim, glow: 12 * qk });
  ctx.restore();
  return { word: [x0 + ws[0] + ws[1] / 2, y - px * 0.9], q: [qx, qy] };
}

function ruler(ctx, u, a) {
  if (a <= 0.003) return;
  const k = easeOut(prog(u, 1.75, 2.15));
  const yTop = RUL.y160 - 2 * RUL.step - 30;
  L.grow(ctx, [[RUL.x, RUL.y160 + 30], [RUL.x, yTop]], k, { a: 0.7 * a, w: 1.4, glow: 0, color: G.dimLine, tip: false });
  [160, 170, 180].forEach((cm, i) => {
    const y = RUL.y160 - i * RUL.step;
    const ta = a * smooth(prog(u, 1.85 + i * 0.1, 2.05 + i * 0.1));
    L.goldStroke(ctx, () => { ctx.beginPath(); ctx.moveTo(RUL.x - 14, y); ctx.lineTo(RUL.x, y); ctx.stroke(); }, { a: ta * 0.8, w: 1.4, glow: 0, color: G.dimLine });
    L.text(ctx, String(cm), RUL.x - 26, y + 9, { font: FONT.mono(32), color: G.text, a: ta, align: 'right' });
    if (i < 2) L.text(ctx, '↑', RUL.x - 56, y - RUL.step / 2 + 9, { font: FONT.inter(20), color: G.gold, a: ta * 0.8 });
  });
  // 站立的人体（把平躺线稿竖起来）：头顶大约在 165 cm
  ctx.save();
  const H0 = 520 * BODY.s;            // 线稿全长 ≈ 520
  ctx.translate(BODY.x, BODY.feet - H0 - 6);
  ctx.rotate(Math.PI / 2);
  L.body(ctx, 0, 0, { a: 0.6 * a * smooth(prog(u, 1.8, 2.2)), scale: BODY.s });
  ctx.restore();
  // 「长高」的示意：头顶一条虚线轮廓沿刻度往上一点
  const gk = easeInOut(prog(u, 2.1, 2.8));
  const headY = BODY.feet - H0 - 6 - 30 * BODY.s;
  const up = 46 * gk;
  if (gk > 0) {
    ctx.save();
    ctx.strokeStyle = rgba(G.brightRGB, 0.7 * a); ctx.lineWidth = 1.3; ctx.setLineDash([4, 5]);
    ctx.beginPath(); ctx.ellipse(BODY.x - 18 * BODY.s, headY - up, 30 * BODY.s, 28 * BODY.s, 0, 0, Math.PI * 2); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(RUL.x + 4, headY - up - 18); ctx.lineTo(BODY.x + 20, headY - up - 18); ctx.stroke();
    ctx.restore();
    L.text(ctx, '↑', BODY.x + 44, headY - up - 6, { font: FONT.interSemi(26), color: G.bright, a: a * gk });
  }
}

function draw(ctx, u, env) {
  // 原片画面：插段开头淡出；结尾从中心向两侧展开回来
  const layerA = 1 - smooth(prog(u, 0, 0.35));
  const back = easeInOut(prog(u, 6.25, 7.0));
  if (env.layer && (layerA > 0.003 || back > 0)) {
    ctx.save();
    if (back > 0) {
      const half = 960 * back;
      ctx.beginPath(); ctx.rect(960 - half, 0, half * 2, 1080); ctx.clip();
      ctx.globalAlpha = Math.max(layerA, smooth(back));
    } else ctx.globalAlpha = layerA;
    ctx.drawImage(env.layer, 0, 0);
    ctx.restore();
  }
  title(ctx, u);
  // 等等。
  const wa = smooth(prog(u, 0.3, 0.45)) * (1 - smooth(prog(u, 0.8, 0.95)));
  L.text(ctx, '等等。', 960, 580, { font: FONT.sansMed(96), color: G.head, a: wa, ls: 10 });
  // 你是不是一直以为——
  const out = 1 - smooth(prog(u, 4.6, 5.05));
  const qa = smooth(prog(u, 0.95, 1.1)) * lerp(1, 0.55, smooth(prog(u, 1.6, 1.9))) * out * (1 - 0.5 * smooth(prog(u, 4.3, 4.6)));
  L.text(ctx, '你是不是一直以为——', 960, 470 + (1 - easeOut(prog(u, 0.95, 1.2))) * 6, { font: FONT.sans(54), color: G.text, a: qa, ls: 4 });
  const ha = smooth(prog(u, 1.6, 1.75)) * out;
  let pos = null;
  if (ha > 0.003) pos = hookLine(ctx, u, ha);
  ruler(ctx, u, ha * (1 - 0.75 * smooth(prog(u, 4.3, 4.9))));
  // 假设的连接：标题 → 长个（虚线，向右绕开上一行字），2.9 被一道金线划断
  if (pos) {
    const p0 = [TN[0] + 8, TN[1] + 4], p1 = [pos.word[0], pos.word[1] - 14];
    const pts = L.bez(p0, [p0[0] + 420, p0[1] + 10], [p1[0] + 60, p1[1] - 150], p1, 48);
    const lk = easeOut(prog(u, 1.9, 2.3));
    const cut = smooth(prog(u, 2.95, 3.1));
    const la = ha * (1 - 0.7 * cut) * (1 - smooth(prog(u, 4.3, 4.8)));
    const g = 0.05 * cut;
    ctx.save();
    ctx.strokeStyle = rgba(G.goldRGB, 0.75 * la); ctx.lineWidth = 1.5; ctx.setLineDash([5, 6]);
    const seg = (a, b) => { if (b <= a) return; const q = []; for (let k = 0; k <= 30; k++) q.push(L.along(pts, lerp(a, b, k / 30))); ctx.beginPath(); ctx.moveTo(q[0][0], q[0][1]); for (const r of q) ctx.lineTo(r[0], r[1]); ctx.stroke(); };
    seg(0, Math.min(lk, 0.5 - g));
    seg(0.5 + g, lk);
    ctx.restore();
    L.node(ctx, p0[0] - 8, p0[1] - 4, { r: 5, a: ha * smooth(prog(u, 1.9, 2.1)) * (1 - smooth(prog(u, 4.4, 4.8))) });
    // 划断：一道短促的金线横穿连接中点
    const sk = easeOut(prog(u, 2.9, 3.05));
    if (sk > 0) {
      const m = L.along(pts, 0.5), m2 = L.along(pts, 0.52);
      const t = [m2[0] - m[0], m2[1] - m[1]], tl = Math.hypot(t[0], t[1]) || 1;
      const pr = [-t[1] / tl, t[0] / tl], tn = [t[0] / tl, t[1] / tl];
      const a0 = [m[0] - pr[0] * 60 - tn[0] * 18, m[1] - pr[1] * 60 - tn[1] * 18], a1 = [m[0] + pr[0] * 60 + tn[0] * 18, m[1] + pr[1] * 60 + tn[1] * 18];
      L.grow(ctx, [a0, a1], sk, { a: ha * (1 - smooth(prog(u, 4.3, 4.9))) * 0.95, w: 2.4, glow: 12, color: G.brightRGB, tip: false });
    }
  }
  // 正确的路径：从标题节点向下生长
  const pa = 1 - smooth(prog(u, 6.2, 6.7));
  if (u > 4.9) {
    L.node(ctx, TN[0], TN[1], { r: 8, a: pa, pop: prog(u, 4.95, 5.2), color: G.brightRGB });
    L.ripple(ctx, TN[0], TN[1], u, 4.95, { dur: 0.6, r0: 10, r1: 60 });
  }
  let prev = TN;
  PATH.forEach((p, i) => {
    const pt = [960, p.y];
    const gk = easeOut(prog(u, p.t - 0.22, p.t));
    const isFirst = i === 0;
    // 「入睡」留下来，向两侧展开成状态轴
    const a = isFirst ? 1 - smooth(prog(u, 6.7, 7.0)) : pa;
    L.grow(ctx, [[prev[0], prev[1] + 12], [pt[0], pt[1] - 12]], gk, { a: 0.85 * pa, w: 1.8, glow: 8 });
    let np = pt;
    if (isFirst) np = [960, lerp(p.y, AX_Y, easeInOut(prog(u, 6.25, 6.9)))];
    L.node(ctx, np[0], np[1], { r: isFirst ? 9 : 8, a, pop: prog(u, p.t, p.t + 0.25), color: i === PATH.length - 1 ? G.brightRGB : G.goldRGB });
    L.text(ctx, p.zh, np[0] + 30, np[1] + 14, { font: FONT.sans(40), color: i === PATH.length - 1 ? G.bright : G.text, a: a * smooth(prog(u, p.t + 0.05, p.t + 0.3)) * (isFirst ? 1 - smooth(prog(u, 6.2, 6.5)) : 1), align: 'left', ls: 2 });
    prev = pt;
  });
  // 「入睡」向两侧展开
  if (back > 0) L.grow(ctx, [[960, AX_Y], [960 - 420 * back, AX_Y]], 1, { a: 0.5 * (1 - smooth(prog(u, 6.8, 7.0))), w: 1.8, glow: 8, tip: false });
  if (back > 0) L.grow(ctx, [[960, AX_Y], [960 + 420 * back, AX_Y]], 1, { a: 0.5 * (1 - smooth(prog(u, 6.8, 7.0))), w: 1.8, glow: 8, tip: false });
}

module.exports = { ...S, draw };
