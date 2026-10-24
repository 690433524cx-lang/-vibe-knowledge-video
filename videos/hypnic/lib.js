// 《入睡抽动》共用：调色、节点、标签、可生长的线、仰卧人体线稿、贯穿开场的那条「清醒 → 睡眠」线。
const { W, H } = require('../../src/config');
const { FONT } = require('../../src/lib/style');
const U = require('../../src/lib/util');
const { spring } = require('../../src/lib/motion');
const { clamp, lerp, prog, smooth, easeOut, easeInOut } = U;

// ---------- 颜色 ----------
const G = {
  gold: '#d8a85a',
  bright: '#f1c97c',
  goldRGB: [216, 168, 90],
  brightRGB: [241, 201, 124],
  text: '#e4dac6',       // 节点中文标签
  head: '#efe6d3',       // 核心词
  grey: '#9a9182',       // 英文小标签
  dimLine: [222, 208, 182],   // 人体线稿：灰金
  red: '#a8473b',
};
const rgba = (c, a) => `rgba(${c[0]},${c[1]},${c[2]},${clamp(a).toFixed(3)})`;

// ---------- 基础 ----------
// 一段时间内的包络：a 开始淡入 fi，b 开始淡出 fo
const env = (d, a, b, fi = 0.3, fo = 0.3) => smooth(prog(d, a, a + fi)) * (1 - smooth(prog(d, b, b + fo)));
// 一次冲击：0 → 峰值（tau 秒处）→ 回落
const impulse = (d, t0, tau = 0.07) => {
  const x = d - t0;
  if (x <= 0) return 0;
  return (x / tau) * Math.exp(1 - x / tau);
};

function text(ctx, s, x, y, { font, color = G.text, a = 1, align = 'center', ls = 0, base = 'alphabetic', glow = 0 } = {}) {
  if (a <= 0.003) return 0;
  ctx.save();
  ctx.font = font;
  ctx.letterSpacing = `${ls}px`;
  ctx.textAlign = align;
  ctx.textBaseline = base;
  ctx.globalAlpha = clamp(a);
  ctx.fillStyle = color;
  if (glow) { ctx.shadowColor = rgba(G.goldRGB, 0.6); ctx.shadowBlur = glow; }
  ctx.fillText(s, x, y);
  const w = ctx.measureText(s).width;
  ctx.restore();
  return w;
}

// 中文标签 + 下方英文小标签
function label(ctx, zh, en, x, y, { a = 1, zhPx = 32, enPx = 16, gap = 30, color = G.text, enColor = G.grey, align = 'center' } = {}) {
  text(ctx, zh, x, y, { font: FONT.sans(zhPx), color, a, align, ls: 2 });
  if (en) text(ctx, en, x, y + gap, { font: FONT.inter(enPx), color: enColor, a: a * 0.95, align, ls: 4 });
}

// 金色节点：实心点 + 柔光；pop 0..1 为生成进度（略过冲）
function node(ctx, x, y, { r = 7, a = 1, pop = 1, color = G.goldRGB, ring = 0, hollow = false } = {}) {
  if (a <= 0.003 || pop <= 0) return;
  const s = pop < 1 ? spring(pop, 0, 1.6, 0.55) : 1;
  ctx.save();
  ctx.globalAlpha = clamp(a);
  const g = ctx.createRadialGradient(x, y, 0, x, y, r * 4.5 * s);
  g.addColorStop(0, rgba(color, 0.35));
  g.addColorStop(1, rgba(color, 0));
  ctx.fillStyle = g;
  ctx.beginPath(); ctx.arc(x, y, r * 4.5 * s, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(x, y, Math.max(0.1, r * s), 0, Math.PI * 2);
  if (hollow) { ctx.lineWidth = 1.8; ctx.strokeStyle = rgba(color, 1); ctx.fillStyle = '#0b0a09'; ctx.fill(); ctx.stroke(); }
  else { ctx.fillStyle = rgba(color, 1); ctx.fill(); }
  if (ring > 0) {
    ctx.lineWidth = 1.4;
    ctx.strokeStyle = rgba(color, 0.6 * ring);
    ctx.beginPath(); ctx.arc(x, y, r * 2.2, 0, Math.PI * 2); ctx.stroke();
  }
  ctx.restore();
}

// 扩散环（一次性）：t0 开始，dur 秒内从 r0 扩到 r1 并消失
function ripple(ctx, x, y, d, t0, { dur = 0.6, r0 = 8, r1 = 46, color = G.brightRGB, w = 1.6 } = {}) {
  const k = prog(d, t0, t0 + dur);
  if (k <= 0 || k >= 1) return;
  ctx.save();
  ctx.strokeStyle = rgba(color, (1 - k) * 0.85);
  ctx.lineWidth = w;
  ctx.beginPath(); ctx.arc(x, y, lerp(r0, r1, easeOut(k)), 0, Math.PI * 2); ctx.stroke();
  ctx.restore();
}

// 折线按长度比例 k 画出（「生长」）。返回线头位置。
function polyPartial(ctx, pts, k) {
  if (k <= 0 || pts.length < 2) return pts[0];
  const seg = [];
  let total = 0;
  for (let i = 1; i < pts.length; i++) { const l = Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]); seg.push(l); total += l; }
  let left = total * clamp(k);
  ctx.beginPath();
  ctx.moveTo(pts[0][0], pts[0][1]);
  let tip = pts[0];
  for (let i = 1; i < pts.length; i++) {
    if (left >= seg[i - 1]) { ctx.lineTo(pts[i][0], pts[i][1]); left -= seg[i - 1]; tip = pts[i]; continue; }
    const f = left / seg[i - 1];
    tip = [lerp(pts[i - 1][0], pts[i][0], f), lerp(pts[i - 1][1], pts[i][1], f)];
    ctx.lineTo(tip[0], tip[1]);
    break;
  }
  ctx.stroke();
  return tip;
}

// 三次贝塞尔采样成折线
function bez(p0, p1, p2, p3, n = 40) {
  const out = [];
  for (let i = 0; i <= n; i++) {
    const t = i / n, u = 1 - t;
    out.push([
      u * u * u * p0[0] + 3 * u * u * t * p1[0] + 3 * u * t * t * p2[0] + t * t * t * p3[0],
      u * u * u * p0[1] + 3 * u * u * t * p1[1] + 3 * u * t * t * p2[1] + t * t * t * p3[1],
    ]);
  }
  return out;
}

// 发光金线：一层柔光 + 一层细芯
function goldStroke(ctx, drawFn, { a = 1, w = 1.8, glow = 10, color = G.goldRGB } = {}) {
  if (a <= 0.003) return;
  ctx.save();
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.strokeStyle = rgba(color, a);
  ctx.lineWidth = w;
  if (glow) { ctx.shadowColor = rgba(color, 0.7 * a); ctx.shadowBlur = glow; }
  drawFn();
  ctx.restore();
}

// ---------- 仰卧人体（侧视）线稿 ----------
// 局部坐标：背贴 y = 0，头在左，脚在右，向上为负。全长约 520 px。
const BODY = [
  [28, -36], [48, -40], [70, -50], [110, -60], [160, -58], [205, -48], [245, -46], [290, -44],
  [350, -36], [385, -34], [440, -26], [488, -22], [498, -40], [505, -58], [516, -57], [515, -30],
  [509, -7], [495, 0], [440, -2], [385, -4], [320, -2], [265, 0], [200, -4], [140, -2], [80, -2], [40, -8],
];
const ARM = [[80, -44], [122, -40], [165, -36], [205, -37], [240, -39], [266, -41]];
const HEAD = { x: 0, y: -31, rx: 30, ry: 28 };

function rot(p, c, a) {
  const dx = p[0] - c[0], dy = p[1] - c[1], cs = Math.cos(a), sn = Math.sin(a);
  return [c[0] + dx * cs - dy * sn, c[1] + dx * sn + dy * cs];
}
// 抽动形变：头肩、双腿同时向上收（像受惊时的一次屈曲），j 为 0..1
function deform(p, j) {
  if (j <= 0) return p;
  let q = p;
  if (q[0] > 255) q = rot(q, [255, -20], -0.16 * j);
  if (p[0] > 385) q = rot(q, rot([385, -20], [255, -20], -0.16 * j), 0.09 * j);
  if (p[0] < 200) q = rot(q, [200, -20], 0.11 * j);
  return [q[0], q[1] - 10 * j];
}
function smoothClosed(ctx, pts) {
  const n = pts.length;
  ctx.beginPath();
  for (let i = 0; i < n; i++) {
    const p0 = pts[(i - 1 + n) % n], p1 = pts[i], p2 = pts[(i + 1) % n], p3 = pts[(i + 2) % n];
    if (i === 0) ctx.moveTo(p1[0], p1[1]);
    ctx.bezierCurveTo(p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6, p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6, p2[0], p2[1]);
  }
  ctx.closePath();
}
function smoothOpen(ctx, pts) {
  ctx.beginPath();
  ctx.moveTo(pts[0][0], pts[0][1]);
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[Math.max(0, i - 1)], p1 = pts[i], p2 = pts[i + 1], p3 = pts[Math.min(pts.length - 1, i + 2)];
    ctx.bezierCurveTo(p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6, p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6, p2[0], p2[1]);
  }
}

// x, y：背部基线左端（头的正下方）。a：线稿透明度；jerk：0..1 抽动；flash：0..1 金色闪亮
// pulse：0..1 一次金色脉冲从身体中心向头、手、脚扩散（后面「神经信号」的第一次预告）
function body(ctx, x, y, { a = 0.5, jerk = 0, flash = 0, scale = 1, soft = 0, pulse = 0 } = {}) {
  if (a <= 0.003 && flash <= 0.003) return;
  const pts = BODY.map((p) => deform(p, jerk));
  const arm = ARM.map((p) => {
    let q = deform(p, jerk);
    // 手臂额外离开身体一点
    if (jerk > 0) q = rot(q, deform([80, -44], jerk), -0.12 * jerk);
    return q;
  });
  const hc = deform([HEAD.x, HEAD.y], jerk);
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(scale, scale);
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  const paint = (stroke, lw, blur, glowCol) => {
    ctx.strokeStyle = stroke;
    ctx.lineWidth = lw / scale;
    ctx.shadowColor = glowCol || 'rgba(0,0,0,0)';
    ctx.shadowBlur = blur;
    smoothClosed(ctx, pts);
    ctx.stroke();
    ctx.beginPath();
    ctx.ellipse(hc[0], hc[1], HEAD.rx, HEAD.ry, 0.08 * jerk, 0, Math.PI * 2);
    ctx.stroke();
    smoothOpen(ctx, arm);
    ctx.stroke();
  };
  // 先用底色把身后的点阵遮住一点，线稿更干净
  ctx.fillStyle = `rgba(11,10,9,${clamp(a * 1.4) * 0.8})`;
  smoothClosed(ctx, pts);
  ctx.fill();
  ctx.beginPath(); ctx.ellipse(hc[0], hc[1], HEAD.rx, HEAD.ry, 0, 0, Math.PI * 2); ctx.fill();
  paint(rgba(G.dimLine, a * (1 - soft * 0.4)), 2, 0);
  if (flash > 0.003) paint(rgba(G.brightRGB, flash), 2.2, 14, rgba(G.goldRGB, flash));
  if (pulse > 0 && pulse < 1) {
    const R = 330, c = deform([250, -30], jerk), fade = Math.pow(1 - pulse, 0.6);
    const gr = ctx.createRadialGradient(c[0], c[1], 0, c[0], c[1], R);
    const p0 = clamp(pulse - 0.28), p1 = clamp(pulse), p2 = clamp(pulse + 0.04);
    gr.addColorStop(0, rgba(G.brightRGB, 0));
    if (p0 > 0) gr.addColorStop(p0, rgba(G.brightRGB, 0));
    gr.addColorStop(Math.max(p0 + 0.001, p1), rgba(G.brightRGB, fade));
    gr.addColorStop(Math.min(1, Math.max(p1 + 0.002, p2)), rgba(G.brightRGB, 0));
    gr.addColorStop(1, rgba(G.brightRGB, 0));
    ctx.lineWidth = 4 / scale;
    ctx.strokeStyle = gr;
    ctx.shadowColor = rgba(G.goldRGB, fade);
    ctx.shadowBlur = 20;
    smoothClosed(ctx, pts); ctx.stroke();
    smoothOpen(ctx, arm); ctx.stroke();
    ctx.beginPath(); ctx.ellipse(hc[0], hc[1], HEAD.rx, HEAD.ry, 0, 0, Math.PI * 2); ctx.stroke();
    // 脉冲到达末端：头、手、脚各亮一下
    const tipA = smooth(prog(pulse, 0.7, 0.85)) * (1 - smooth(prog(pulse, 0.85, 1)));
    if (tipA > 0.01) for (const q of [hc, arm[arm.length - 1], deform([510, -50], jerk)]) {
      const g2 = ctx.createRadialGradient(q[0], q[1], 0, q[0], q[1], 22);
      g2.addColorStop(0, rgba(G.brightRGB, 0.9 * tipA));
      g2.addColorStop(1, rgba(G.brightRGB, 0));
      ctx.shadowBlur = 0;
      ctx.fillStyle = g2;
      ctx.beginPath(); ctx.arc(q[0], q[1], 22, 0, Math.PI * 2); ctx.fill();
    }
  }
  ctx.restore();
}

module.exports = {
  W, H, FONT, G, rgba, ...U, spring, env, impulse,
  text, label, node, ripple, polyPartial, bez, goldStroke, body,
};
