// 本片共用：摄影机（含视差）、自然偏差、门、剪影。
const { W, H } = require('../../src/config');
const { C, FONT } = require('../../src/lib/style');
const { pencil, rectPts } = require('../../src/lib/draw');
const { rng, hash, noise1, lerp, clamp } = require('../../src/lib/util');

// 摄影机：看向 (cx, cy)，缩放 s。depth < 1 的层移动得更少（远景），> 1 更多（前景）。
function withCam(ctx, cam, depth, fn) {
  const d = depth ?? 1;
  const s = 1 + (cam.s - 1) * d;
  ctx.save();
  ctx.translate(W / 2, H / 2);
  if (cam.rot) ctx.rotate(cam.rot * d);
  ctx.scale(s, s);
  ctx.translate(-(W / 2 + (cam.cx - W / 2) * d), -(H / 2 + (cam.cy - H / 2) * d));
  fn();
  ctx.restore();
}
// 世界坐标 → 屏幕坐标（depth 同上）
function toScreen(cam, x, y, depth = 1) {
  const s = 1 + (cam.s - 1) * depth;
  return [W / 2 + (x - (W / 2 + (cam.cx - W / 2) * depth)) * s, H / 2 + (y - (H / 2 + (cam.cy - H / 2) * depth)) * s];
}

// 自然偏差：同一个 id 永远得到同一组小误差
function jit(id, amount = 1) {
  const r = rng(hash(id, 97));
  return { x: (r() - 0.5) * 2 * amount, y: (r() - 0.5) * 2 * amount, r: (r() - 0.5) * 2 * amount * 0.004, s: 1 + (r() - 0.5) * amount * 0.02, k: r() };
}

// 一扇真正的门：门框有深度，门板有凹槽，光只从门缝和边缘漏出来。以门底中心为原点。
//   open 0..1：门缝宽度；side 1 = 门缝在右；glow：门缝亮度；variant：门板样式
function door(ctx, w, h, o = {}) {
  const { open = 0, side = 1, glow = 1, t = 0, seed = 1, alpha = 1, boil = true, variant = 0, frame = 1, spill = 1 } = o;
  if (alpha <= 0.002) return;
  ctx.save();
  ctx.globalAlpha *= alpha;
  const L = -w / 2, T = -h;
  const gap = w * 0.32 * open;
  const fw = Math.max(3, w * 0.07); // 门框宽
  // 门洞（门后的空间）
  ctx.fillStyle = '#0b0908';
  ctx.fillRect(L, T, w, h);
  // 门缝里的光：中心亮、边缘柔，带一点光晕（halation）
  if (gap > 0.5 && glow > 0) {
    const gx = side > 0 ? w / 2 - gap : L;
    ctx.save();
    const lg = ctx.createLinearGradient(gx, 0, gx + gap, 0);
    lg.addColorStop(0, `rgba(255,232,190,${0.95 * glow})`);
    lg.addColorStop(side > 0 ? 0.3 : 0.7, `rgba(255,244,220,${1 * glow})`);
    lg.addColorStop(1, `rgba(255,214,150,${0.85 * glow})`);
    ctx.fillStyle = lg;
    ctx.shadowColor = `rgba(255,200,130,${0.75 * glow})`;
    ctx.shadowBlur = Math.max(8, w * 0.22);
    ctx.fillRect(gx, T, gap, h);
    ctx.restore();
    // 洒在地上的光：一道朝外散开的梯形，越远越淡
    if (spill > 0) {
      const sx = side > 0 ? 1 : -1;
      const g = ctx.createLinearGradient(0, 0, 0, h * 0.75);
      g.addColorStop(0, `rgba(255,212,150,${0.30 * glow * spill})`);
      g.addColorStop(1, 'rgba(255,212,150,0)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.moveTo(gx, 0); ctx.lineTo(gx + gap, 0);
      ctx.lineTo(gx + gap + sx * w * 0.55 + (sx > 0 ? gap * 2 : 0), h * 0.75);
      ctx.lineTo(gx + sx * w * 0.25 - (sx > 0 ? 0 : gap * 2), h * 0.75);
      ctx.closePath();
      ctx.fill();
    }
  }
  // 门板
  const px = side > 0 ? L : L + gap;
  const pw = w - gap;
  const g = ctx.createLinearGradient(px, 0, px + pw, 0);
  g.addColorStop(0, side > 0 ? '#2d221a' : '#3a2c21');
  g.addColorStop(1, side > 0 ? '#3a2c21' : '#2a2019');
  ctx.fillStyle = g;
  ctx.fillRect(px, T, pw, h);
  // 门板凹槽：亮的一侧是靠近门缝的那一侧
  const r = rng(seed);
  const panels = variant === 1 ? [[0.08, 0.86]] : [[0.07, 0.38], [0.5, 0.42]];
  for (const [y0, hh] of panels) {
    const ix = px + pw * 0.15, iw = pw * 0.7, iy = T + h * y0, ih = h * hh;
    ctx.fillStyle = 'rgba(0,0,0,0.18)';
    ctx.fillRect(ix, iy, iw, ih);
    ctx.lineWidth = Math.max(0.8, w * 0.006);
    ctx.strokeStyle = `rgba(214,190,150,${0.20 + 0.25 * glow * open})`;
    ctx.beginPath();
    if (side > 0) { ctx.moveTo(ix + iw, iy); ctx.lineTo(ix + iw, iy + ih); ctx.lineTo(ix, iy + ih); }
    else { ctx.moveTo(ix, iy); ctx.lineTo(ix, iy + ih); ctx.lineTo(ix + iw, iy + ih); }
    ctx.stroke();
    ctx.strokeStyle = 'rgba(0,0,0,0.45)';
    ctx.beginPath();
    if (side > 0) { ctx.moveTo(ix, iy + ih); ctx.lineTo(ix, iy); ctx.lineTo(ix + iw, iy); }
    else { ctx.moveTo(ix + iw, iy + ih); ctx.lineTo(ix + iw, iy); ctx.lineTo(ix, iy); }
    ctx.stroke();
  }
  // 门把手：一点被门缝照到的反光
  const hx = side > 0 ? px + pw - pw * 0.11 : px + pw * 0.11;
  ctx.fillStyle = `rgba(232,210,170,${0.35 + 0.5 * glow * Math.min(1, open * 2)})`;
  ctx.beginPath();
  ctx.arc(hx, T + h * 0.52, Math.max(1.4, w * 0.022), 0, Math.PI * 2);
  ctx.fill();
  // 门缝那一侧的门板边缘被照亮
  if (gap > 0.5 && glow > 0) {
    const ex = side > 0 ? px + pw : px;
    ctx.strokeStyle = `rgba(255,226,180,${0.55 * glow})`;
    ctx.lineWidth = Math.max(1, w * 0.01);
    ctx.beginPath(); ctx.moveTo(ex, T); ctx.lineTo(ex, 0); ctx.stroke();
  }
  // 门框（铅笔线，笔压有变化）
  if (frame > 0) {
    pencil(ctx, [[L - fw * 0.5, 0], [L - fw * 0.5, T - fw * 0.5], [w / 2 + fw * 0.5, T - fw * 0.5], [w / 2 + fw * 0.5, 0]],
      { t, seed: seed * 3 + 2, width: Math.max(1, w * 0.012), color: `rgba(222,206,178,${0.55 * frame})`, passes: 1, boil, pressure: 0.6, amp: 0.6 });
  }
  void r;
  ctx.restore();
}

// 极简背影：头、肩、两条腿；轮廓边缘被前方的光勾出一点暖色。以脚底为原点。
function figure(ctx, h, o = {}) {
  const { t = 0, walk = 0, alpha = 1, rim = 0.4, lean = 0 } = o;
  const sw = Math.sin(t * 5.4) * 0.2 * walk;
  ctx.save();
  ctx.globalAlpha *= alpha;
  ctx.rotate(lean);
  ctx.fillStyle = '#0f0b09';
  for (const s of [-1, 1]) {
    ctx.save();
    ctx.translate(s * h * 0.055, -h * 0.45);
    ctx.rotate(s * sw);
    ctx.beginPath();
    ctx.moveTo(-h * 0.05, 0); ctx.lineTo(h * 0.05, 0); ctx.lineTo(h * 0.04, h * 0.45); ctx.lineTo(-h * 0.045, h * 0.45);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }
  ctx.beginPath();
  ctx.moveTo(-h * 0.155, -h * 0.77);
  ctx.bezierCurveTo(-h * 0.06, -h * 0.84, h * 0.06, -h * 0.84, h * 0.155, -h * 0.77);
  ctx.quadraticCurveTo(h * 0.17, -h * 0.6, h * 0.12, -h * 0.43);
  ctx.lineTo(-h * 0.12, -h * 0.43);
  ctx.quadraticCurveTo(-h * 0.17, -h * 0.6, -h * 0.155, -h * 0.77);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(0, -h * 0.895, h * 0.082, h * 0.095, 0, 0, Math.PI * 2);
  ctx.fill();
  if (rim > 0) {
    ctx.strokeStyle = `rgba(255,214,160,${rim})`;
    ctx.lineWidth = Math.max(1, h * 0.01);
    ctx.beginPath();
    ctx.moveTo(-h * 0.14, -h * 0.78); ctx.bezierCurveTo(-h * 0.05, -h * 0.84, h * 0.05, -h * 0.84, h * 0.14, -h * 0.78);
    ctx.stroke();
    ctx.beginPath();
    ctx.ellipse(0, -h * 0.895, h * 0.082, h * 0.095, 0, Math.PI * 1.1, Math.PI * 1.9);
    ctx.stroke();
  }
  ctx.restore();
}

module.exports = { withCam, toScreen, jit, door, figure, W, H, C, FONT, pencil, rectPts, noise1, lerp, clamp };
