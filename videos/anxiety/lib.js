// 《提前焦虑》共用绘制：一个连续的 3D 信息空间。
//
//   世界坐标：x 向右，y 向下，z 向画面深处。相机只平移（外加极小的 yaw 环绕），
//   所以「推进 / 拉远 / 跟随信号」都是相机位置的变化，所有对象都留在同一个空间里。
//   颜色：深黑底、暖白文字、暗金节点与轨迹；暗红只给「最坏结果 / 警报」，绿色只给「现实」。
const { W, H } = require('../../src/config');
const { FONT } = require('../../src/lib/style');
const U = require('../../src/lib/util');
const { clamp, lerp, prog, smooth, rng } = U;

const F = 1000; // 焦距：z = 1000 处 1 个世界单位 = 1 像素

const COL = {
  ivory: [238, 231, 218],
  gold: [205, 164, 92],
  goldHi: [250, 218, 156],
  goldDim: [128, 104, 66],
  ash: [118, 112, 102],
  red: [150, 46, 36],
  redHi: [214, 92, 64],
  green: [112, 184, 132],
};
const rgba = (c, a) => `rgba(${c[0]},${c[1]},${c[2]},${clamp(a, 0, 1).toFixed(3)})`;
const mix = (a, b, k) => a.map((v, i) => Math.round(v + (b[i] - v) * k));

// ---------- 相机 ----------
// keys: [{ t, p: [x, y, z], ease?: 'lin' | 'io' | 'in' | 'out', yaw? }]
// 位置走 Catmull-Rom 样条（经过关键点时不急停），每段可单独加缓动。
const EASE = { lin: (k) => k, io: U.easeInOut, in: U.easeIn, out: U.easeOut, s: smooth };
function catmull(p0, p1, p2, p3, k) {
  const k2 = k * k, k3 = k2 * k;
  return p1.map((_, i) => 0.5 * (2 * p1[i] + (-p0[i] + p2[i]) * k + (2 * p0[i] - 5 * p1[i] + 4 * p2[i] - p3[i]) * k2 + (-p0[i] + 3 * p1[i] - 3 * p2[i] + p3[i]) * k3));
}
function makeCamera(keys) {
  return (d) => {
    if (d <= keys[0].t) return { p: keys[0].p.slice(), yaw: keys[0].yaw || 0 };
    const n = keys.length;
    if (d >= keys[n - 1].t) return { p: keys[n - 1].p.slice(), yaw: keys[n - 1].yaw || 0 };
    let i = 0;
    while (d > keys[i + 1].t) i++;
    const a = keys[i], b = keys[i + 1];
    const k = (EASE[b.ease || 'io'])(prog(d, a.t, b.t));
    const p0 = (keys[i - 1] || a).p, p3 = (keys[i + 2] || b).p;
    const p = b.straight ? a.p.map((v, j) => lerp(v, b.p[j], k)) : catmull(p0, a.p, b.p, p3, k);
    return { p, yaw: lerp(a.yaw || 0, b.yaw || 0, k) };
  };
}

// 投影：返回屏幕坐标、缩放和相对深度
function proj(cam, q) {
  let dx = q[0] - cam.p[0], dy = q[1] - cam.p[1], dz = q[2] - cam.p[2];
  if (cam.yaw) {
    const c = Math.cos(cam.yaw), s = Math.sin(cam.yaw);
    [dx, dz] = [c * dx - s * dz, s * dx + c * dz];
  }
  const s = F / Math.max(dz, 1);
  return { x: W / 2 + dx * s, y: H / 2 + dy * s, s, z: dz };
}
// 近处淡出（相机穿过节点时）× 远处雾
function depthAlpha(z, near = 140, far = 5200) {
  return smooth(prog(z, near * 0.45, near)) * (1 - 0.75 * smooth(prog(z, far * 0.5, far)));
}

// ---------- 曲线 ----------
// 两点之间一条柔和的「信息流」曲线（世界坐标三次贝塞尔）
function curvePts(a, b, bend = 0.45, n = 18) {
  const dx = b[0] - a[0];
  const c1 = [a[0] + dx * bend, a[1], a[2] + (b[2] - a[2]) * 0.3];
  const c2 = [b[0] - dx * bend, b[1], b[2] - (b[2] - a[2]) * 0.3];
  const out = [];
  for (let i = 0; i <= n; i++) {
    const k = i / n, m = 1 - k;
    out.push([0, 1, 2].map((j) => m * m * m * a[j] + 3 * m * m * k * c1[j] + 3 * m * k * k * c2[j] + k * k * k * b[j]));
  }
  return out;
}
// 竖直方向的曲线（信号向下穿过空间）
function curvePtsV(a, b, bend = 0.45, n = 18) {
  const dy = b[1] - a[1];
  const c1 = [a[0], a[1] + dy * bend, a[2]];
  const c2 = [b[0], b[1] - dy * bend, b[2]];
  const out = [];
  for (let i = 0; i <= n; i++) {
    const k = i / n, m = 1 - k;
    out.push([0, 1, 2].map((j) => m * m * m * a[j] + 3 * m * m * k * c1[j] + 3 * m * k * k * c2[j] + k * k * k * b[j]));
  }
  return out;
}
function pointAt(pts, k) {
  const f = clamp(k) * (pts.length - 1), i = Math.min(pts.length - 2, Math.floor(f)), r = f - i;
  return pts[i].map((v, j) => lerp(v, pts[i + 1][j], r));
}

// 画一条（可部分生长的）路径。返回生长头的屏幕位置。
//   o: { k0, k1 生长区间, color, alpha, width, dash, head 是否画信号头, headColor }
function path(ctx, cam, pts, o = {}) {
  const k0 = o.k0 ?? 0, k1 = o.k1 ?? 1;
  if (k1 <= k0 + 1e-4 || (o.alpha ?? 1) <= 0.004) return null;
  const n = pts.length - 1;
  const seg = [];
  const steps = Math.max(2, Math.ceil((k1 - k0) * n * 2));
  for (let i = 0; i <= steps; i++) seg.push(pointAt(pts, lerp(k0, k1, i / steps)));
  const P = seg.map((q) => proj(cam, q));
  ctx.save();
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  if (o.dash) ctx.setLineDash(o.dash);
  const col = o.color || COL.gold;
  // 分段画，近处粗、远处细、穿过相机时淡出
  for (let i = 1; i < P.length; i++) {
    const p = P[i - 1], q = P[i];
    if (p.z < 40 || q.z < 40) continue;
    const da = Math.min(depthAlpha(p.z), depthAlpha(q.z));
    const a = (o.alpha ?? 1) * da;
    if (a <= 0.004) continue;
    ctx.strokeStyle = rgba(col, a);
    ctx.lineWidth = clamp((o.width ?? 1.6) * (p.s + q.s) / 2, 0.5, 9);
    ctx.beginPath();
    ctx.moveTo(p.x, p.y);
    ctx.lineTo(q.x, q.y);
    ctx.stroke();
  }
  ctx.restore();
  const head = P[P.length - 1];
  if (o.head && k1 < 0.999 && head.z > 40) glowDot(ctx, head.x, head.y, (o.headR ?? 3.2) * clamp(head.s, 0.5, 2.5), o.headColor || COL.goldHi, (o.alpha ?? 1) * depthAlpha(head.z));
  return head;
}

// 沿路径流动的数据点
function flow(ctx, cam, pts, d, o = {}) {
  const n = o.n ?? 3, speed = o.speed ?? 0.6, a = o.alpha ?? 0.8;
  if (a <= 0.004) return;
  for (let i = 0; i < n; i++) {
    let k = ((d * speed + i / n + (o.phase ?? 0)) % 1 + 1) % 1;
    if (o.reverse) k = 1 - k;
    if (o.k1 != null && k > o.k1) continue;
    const P = proj(cam, pointAt(pts, k));
    if (P.z < 40) continue;
    const fade = Math.sin(Math.PI * k);
    glowDot(ctx, P.x, P.y, (o.r ?? 2.2) * clamp(P.s, 0.5, 2.2), o.color || COL.goldHi, a * fade * depthAlpha(P.z));
  }
}

function glowDot(ctx, x, y, r, col, a) {
  if (a <= 0.004 || r <= 0) return;
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  const g = ctx.createRadialGradient(x, y, 0, x, y, r * 5);
  g.addColorStop(0, rgba(col, 0.55 * a));
  g.addColorStop(0.25, rgba(col, 0.18 * a));
  g.addColorStop(1, rgba(col, 0));
  ctx.fillStyle = g;
  ctx.fillRect(x - r * 5, y - r * 5, r * 10, r * 10);
  ctx.restore();
  ctx.fillStyle = rgba(mix(col, [255, 255, 255], 0.35), a);
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();
}

// 节点：内核 + 光晕 + 环。o.dashed = 还没发生的未来（虚线环、半透明）
function node(ctx, cam, q, o = {}) {
  const P = proj(cam, q);
  if (P.z < 40) return P;
  const a = (o.alpha ?? 1) * depthAlpha(P.z);
  if (a <= 0.004) return P;
  const r = (o.r ?? 10) * P.s;
  const col = o.color || COL.gold;
  ctx.save();
  if ((o.glow ?? 1) > 0) {
    ctx.globalCompositeOperation = 'lighter';
    const R = r * (o.glowR ?? 4.5);
    const g = ctx.createRadialGradient(P.x, P.y, 0, P.x, P.y, R);
    g.addColorStop(0, rgba(col, 0.32 * a * (o.glow ?? 1)));
    g.addColorStop(0.3, rgba(col, 0.1 * a * (o.glow ?? 1)));
    g.addColorStop(1, rgba(col, 0));
    ctx.fillStyle = g;
    ctx.fillRect(P.x - R, P.y - R, R * 2, R * 2);
    ctx.globalCompositeOperation = 'source-over';
  }
  if (o.fill !== false) {
    ctx.fillStyle = o.dashed ? rgba(col, a * 0.18) : rgba(mix(col, [255, 255, 255], 0.2), a * (o.core ?? 1));
    ctx.beginPath();
    ctx.arc(P.x, P.y, o.dashed ? r : r * (o.coreR ?? 0.42), 0, Math.PI * 2);
    ctx.fill();
  }
  if (o.ring !== false) {
    ctx.strokeStyle = rgba(col, a * (o.dashed ? 0.75 : 0.6));
    ctx.lineWidth = clamp(1.4 * P.s, 0.8, 3);
    if (o.dashed) ctx.setLineDash([Math.max(2, 3 * P.s), Math.max(2, 4 * P.s)]);
    ctx.beginPath();
    ctx.arc(P.x, P.y, r, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.restore();
  return P;
}

// 节点外扩的一圈脉冲
function pulseRing(ctx, cam, q, k, o = {}) {
  if (k <= 0 || k >= 1) return;
  const P = proj(cam, q);
  if (P.z < 40) return;
  const r = lerp(o.r0 ?? 10, o.r1 ?? 120, U.easeOut(k)) * P.s;
  ctx.save();
  ctx.strokeStyle = rgba(o.color || COL.goldHi, (o.alpha ?? 0.8) * (1 - k) * depthAlpha(P.z));
  ctx.lineWidth = clamp((o.width ?? 2) * P.s * (1 - k * 0.6), 0.6, 6);
  ctx.beginPath();
  ctx.arc(P.x, P.y, r, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
}

// 世界里的文字标签：中文 + 一行等宽英文（字号随距离缩放，有上下限保证可读）
function label(ctx, cam, q, text, o = {}) {
  const P = proj(cam, q);
  if (P.z < 60) return;
  const a = (o.alpha ?? 1) * depthAlpha(P.z, o.near ?? 220);
  if (a <= 0.01) return;
  const s = P.s;
  const px = clamp((o.size ?? 26) * s, o.min ?? 15, o.max ?? 120);
  const x = P.x + (o.dx ?? 0) * s, y = P.y + (o.dy ?? 0) * s;
  ctx.save();
  ctx.textAlign = o.align || 'center';
  ctx.textBaseline = o.baseline || 'middle';
  ctx.shadowColor = 'rgba(0,0,0,0.9)';
  ctx.shadowBlur = 10;
  if (text) {
    ctx.font = (o.weight === 'light' ? FONT.sansLight : o.weight === 'bold' ? FONT.sansBold : o.weight === 'reg' ? FONT.sans : FONT.sansMed)(Math.round(px));
    ctx.letterSpacing = `${Math.round(px * (o.ls ?? 0.06))}px`;
    ctx.fillStyle = rgba(o.color || COL.ivory, a);
    ctx.fillText(text, x, y);
  }
  if (o.en) {
    const ep = clamp(px * (o.enScale ?? 0.42), 11, 40);
    ctx.font = FONT.mono(Math.round(ep));
    ctx.letterSpacing = `${Math.round(ep * 0.22)}px`;
    ctx.fillStyle = rgba(o.enColor || COL.gold, a * (o.enAlpha ?? 0.75));
    const ey = text ? y + (o.enBelow === false ? -px * 0.95 : px * 0.95) : y;
    ctx.fillText(o.en, x, ey);
  }
  ctx.restore();
}

// ---------- 空间：微弱网格 + 坐标 + 数据点 ----------
const DUST = (() => {
  const r = rng(4242), out = [];
  for (let i = 0; i < 1400; i++) out.push([lerp(-4000, 6000, r()), lerp(-2600, 2800, r()), lerp(200, 9000, r()), r()]);
  return out;
})();
function segClip(cam, a, b) {
  const A = proj(cam, a), B = proj(cam, b);
  if (A.z < 60 && B.z < 60) return null;
  if (A.z >= 60 && B.z >= 60) return [A, B];
  const k = (60 - A.z) / (B.z - A.z);
  const m = a.map((v, i) => lerp(v, b[i], k + (A.z < 60 ? 0.001 : -0.001)));
  return A.z < 60 ? [proj(cam, m), B] : [A, proj(cam, m)];
}
function space(ctx, cam, d, o = {}) {
  const amt = o.alpha ?? 1;
  // 地面网格：在相机下方很远的一张平面，只在相机附近铺开
  const gy = cam.p[1] + 1300, step = 420;
  const cx = Math.round(cam.p[0] / step) * step, cz = Math.round(cam.p[2] / step) * step;
  ctx.save();
  ctx.lineWidth = 1;
  for (let i = -10; i <= 10; i++) {
    const x = cx + i * step;
    const s = segClip(cam, [x, gy, cz - 200], [x, gy, cz + 7000]);
    if (!s) continue;
    const g = ctx.createLinearGradient(s[0].x, s[0].y, s[1].x, s[1].y);
    g.addColorStop(0, `rgba(150,136,112,${0.075 * amt})`);
    g.addColorStop(1, 'rgba(150,136,112,0)');
    ctx.strokeStyle = g;
    ctx.beginPath(); ctx.moveTo(s[0].x, s[0].y); ctx.lineTo(s[1].x, s[1].y); ctx.stroke();
  }
  for (let j = 0; j < 16; j++) {
    const z = cz + j * step;
    const s = segClip(cam, [cx - 4500, gy, z], [cx + 4500, gy, z]);
    if (!s) continue;
    const a = 0.06 * amt * (1 - j / 16);
    ctx.strokeStyle = `rgba(150,136,112,${a})`;
    ctx.beginPath(); ctx.moveTo(s[0].x, s[0].y); ctx.lineTo(s[1].x, s[1].y); ctx.stroke();
  }
  // 稀疏坐标十字
  ctx.strokeStyle = `rgba(170,156,130,${0.11 * amt})`;
  const cs = 840;
  const bx = Math.round(cam.p[0] / cs) * cs, by = Math.round(cam.p[1] / cs) * cs, bz = Math.round(cam.p[2] / cs) * cs;
  for (let i = -4; i <= 4; i++) for (let j = -2; j <= 2; j++) for (let k = 1; k <= 6; k++) {
    const P = proj(cam, [bx + i * cs, by + j * cs, bz + k * cs]);
    if (P.z < 200 || P.x < -20 || P.x > W + 20 || P.y < -20 || P.y > H + 20) continue;
    const L = clamp(6 * P.s, 2, 7);
    ctx.globalAlpha = depthAlpha(P.z, 300, 6000);
    ctx.beginPath();
    ctx.moveTo(P.x - L, P.y); ctx.lineTo(P.x + L, P.y);
    ctx.moveTo(P.x, P.y - L); ctx.lineTo(P.x, P.y + L);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
  // 数据点：不乱飘，只因为相机在动而产生视差
  for (const q of DUST) {
    const P = proj(cam, q);
    if (P.z < 80 || P.x < 0 || P.x > W || P.y < 0 || P.y > H) continue;
    const a = (0.08 + 0.22 * q[3]) * depthAlpha(P.z, 300, 8000) * amt * (0.75 + 0.25 * Math.sin(d * 1.3 + q[3] * 40));
    ctx.fillStyle = `rgba(196,178,142,${a})`;
    const r = clamp(1.3 * P.s, 0.6, 2.4);
    ctx.fillRect(P.x - r / 2, P.y - r / 2, r, r);
  }
  ctx.restore();
}

// 屏幕空间的小号等宽注记（坐标 / 读数）
function mono(ctx, text, x, y, o = {}) {
  ctx.save();
  ctx.font = (o.med ? FONT.monoMed : FONT.mono)(o.size ?? 14);
  ctx.letterSpacing = `${o.ls ?? 3}px`;
  ctx.textAlign = o.align || 'left';
  ctx.textBaseline = o.baseline || 'alphabetic';
  ctx.fillStyle = rgba(o.color || COL.gold, o.alpha ?? 0.6);
  ctx.fillText(text, x, y);
  ctx.restore();
}

module.exports = {
  W, H, F, COL, rgba, mix, makeCamera, proj, depthAlpha, curvePts, curvePtsV, pointAt,
  path, flow, glowDot, node, pulseRing, label, space, mono, ...U,
};
