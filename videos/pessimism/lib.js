// 《悲观主义》共用：摄影机、人物、桌面上的小物件。
//
// 人物：同一个成年人，简化但比例真实（坐高约 0.88 m，按「像素 / 米」缩放）。
//   轮廓由一圈关键点经 Catmull-Rom 平滑得到，躯干绕髋、头绕颈转动；
//   不画五官，只有侧脸的额、鼻、下巴起伏。受光一侧有一道很细的边缘光，暗侧沉进环境。
const { W, H } = require('../../src/config');
const { C, FONT } = require('../../src/lib/style');
const { rng, hash, noise1, lerp, clamp, prog, smooth } = require('../../src/lib/util');
const { withCam, toScreen } = require('../choice/lib');

// ---------------- 平滑轮廓 ----------------

// 闭合 Catmull-Rom → 贝塞尔
function smoothPath(ctx, pts, closed = true, fresh = true) {
  const n = pts.length;
  if (fresh) ctx.beginPath();
  ctx.moveTo(pts[0][0], pts[0][1]);
  const last = closed ? n : n - 1;
  for (let i = 0; i < last; i++) {
    const p0 = pts[(i - 1 + n) % n], p1 = pts[i], p2 = pts[(i + 1) % n], p3 = pts[(i + 2) % n];
    const a = closed || i > 0 ? p0 : p1, d = closed || i < n - 2 ? p3 : p2;
    ctx.bezierCurveTo(p1[0] + (p2[0] - a[0]) / 6, p1[1] + (p2[1] - a[1]) / 6, p2[0] - (d[0] - p1[0]) / 6, p2[1] - (d[1] - p1[1]) / 6, p2[0], p2[1]);
  }
  if (closed) ctx.closePath();
}

function rot(p, c, a) {
  const s = Math.sin(a), co = Math.cos(a);
  const x = p[0] - c[0], y = p[1] - c[1];
  return [c[0] + x * co - y * s, c[1] + x * s + y * co];
}

// 有体积的剪影：底色 → 受光方向的明暗 → 边缘光（用「错位再盖一层」得到一条只在受光侧的亮边）
//   light: 光从哪个方向来（弧度，屏幕坐标），rim: 边缘光强度，rimCol: 颜色
function shade(ctx, pathFn, o) {
  const { base = '#1c1714', lit = 'rgba(255,214,170,0.16)', light = -2.4, rim = 0.5, rimCol = [255, 214, 160], rimW = 3, bbox } = o;
  const lx = Math.cos(light), ly = Math.sin(light);
  ctx.save();
  // 边缘光：先整块铺亮色，再把错位的本体盖上去
  if (rim > 0) {
    pathFn(ctx);
    ctx.fillStyle = `rgba(${rimCol.join(',')},${rim})`;
    ctx.fill();
  }
  ctx.save();
  ctx.translate(-lx * rimW * (rim > 0 ? 1 : 0), -ly * rimW * (rim > 0 ? 1 : 0));
  pathFn(ctx);
  ctx.restore();
  ctx.save();
  pathFn(ctx);
  ctx.clip();
  ctx.translate(-lx * rimW * (rim > 0 ? 1 : 0), -ly * rimW * (rim > 0 ? 1 : 0));
  pathFn(ctx);
  ctx.fillStyle = base;
  ctx.fill();
  // 体积：朝光的一侧略亮
  if (bbox) {
    const [x0, y0, x1, y1] = bbox;
    const cx = (x0 + x1) / 2, cy = (y0 + y1) / 2, R = Math.hypot(x1 - x0, y1 - y0) / 2;
    const g = ctx.createLinearGradient(cx + lx * R, cy + ly * R, cx - lx * R * 0.4, cy - ly * R * 0.4);
    g.addColorStop(0, lit);
    g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g;
    ctx.fill();
  }
  ctx.restore();
  ctx.restore();
}

// ---------------- 坐着的人（侧面，面朝左） ----------------
// 原点：髋关节（坐面上）。单位：米，u = 像素 / 米。
//   lean：上身前倾（弧度）；head：低头（弧度）；arm：'knees' 手肘撑膝 / 'lap' 手放腿上 / 'phone' 低头看手机
//   holding：手里的东西 'glass' / 'phone' / null；face：1 面朝左，-1 面朝右（镜像）
const LOWER = [
  [0.15, 0.04], [0.11, 0.1], [-0.05, 0.11], [-0.26, 0.1], [-0.44, 0.09],
  [-0.5, 0.17], [-0.49, 0.31], [-0.47, 0.43], [-0.49, 0.5], [-0.62, 0.515], [-0.74, 0.505], [-0.7, 0.46], [-0.57, 0.42],
  [-0.585, 0.26], [-0.6, 0.06], [-0.55, -0.045], [-0.4, -0.07], [-0.22, -0.085], [-0.08, -0.11],
];
const TORSO = [
  [-0.07, -0.2], [-0.095, -0.36], [-0.09, -0.47], [-0.05, -0.55],
];
const HEAD = [
  [-0.055, -0.6], [-0.095, -0.625], [-0.112, -0.652], [-0.112, -0.676], [-0.128, -0.705], [-0.136, -0.718], [-0.118, -0.735],
  [-0.124, -0.765], [-0.112, -0.81], [-0.06, -0.85], [0.02, -0.858], [0.075, -0.83], [0.1, -0.77], [0.09, -0.7], [0.055, -0.655], [0.05, -0.61],
];
const BACK = [
  [0.1, -0.54], [0.135, -0.44], [0.13, -0.3], [0.11, -0.17], [0.15, -0.03],
];
const NECK = [0.0, -0.585], HIP = [0, 0];

function seatedPose(o) {
  const lean = o.lean ?? 0.35, drop = o.head ?? 0.1;
  const up = (p) => rot(p, HIP, -lean);
  const head = (p) => up(rot(p, NECK, -drop));
  const pts = [
    ...LOWER,
    ...TORSO.map((p, i) => (i === 0 ? rot(p, HIP, -lean * 0.6) : up(p))),
    ...HEAD.map(head),
    ...BACK.map((p, i) => (i === BACK.length - 1 ? p : i === BACK.length - 2 ? rot(p, HIP, -lean * 0.65) : up(p))),
  ];
  const shoulder = up([0.01, -0.5]);
  const neck = up(NECK);
  const headC = head([-0.01, -0.73]);
  return { pts, shoulder, neck, headC, lean };
}

// 手臂：上臂 + 前臂 + 手，按关节点生成一条有粗细的轮廓
function limb(a, b, c, w0, w1, w2) {
  const side = (p, q, w, s) => {
    const dx = q[0] - p[0], dy = q[1] - p[1], L = Math.hypot(dx, dy) || 1;
    return [p[0] - (dy / L) * w * s, p[1] + (dx / L) * w * s];
  };
  return [
    side(a, b, w0, 1), side(b, c, w1, 1), side(c, b, w2, -1), [c[0] + (c[0] - b[0]) * 0.18, c[1] + (c[1] - b[1]) * 0.18],
    side(c, b, w2, 1), side(b, c, w1, -1), side(a, b, w0, -1), [a[0] - (b[0] - a[0]) * 0.12, a[1] - (b[1] - a[1]) * 0.12],
  ];
}

function seated(ctx, u, o = {}) {
  const { face = 1, light = -2.5, rim = 0.38, rimCol, base = '#1d1915', cloth = '#232a24', skin = '#4a372c', hair = '#120e0c', alpha = 1, t = 0, breathe = 1 } = o;
  if (alpha <= 0.002) return;
  const P = seatedPose(o);
  // 呼吸：上身极轻微起伏
  const br = Math.sin(t * 1.6) * 0.004 * breathe;
  ctx.save();
  ctx.globalAlpha *= alpha;
  ctx.scale(u * face, u);
  const L = face > 0 ? light : Math.PI - light;
  const rimW = 1.7 / u;
  const body = P.pts.map((p) => (p[1] < -0.15 ? [p[0], p[1] + br * (p[1] / -0.8)] : p));
  shade(ctx, (c) => smoothPath(c, body), { base: cloth, light: L, rim, rimCol, rimW, lit: 'rgba(255,220,180,0.13)', bbox: [-0.75, -0.9, 0.2, 0.55] });
  // 头发：后脑和头顶更暗一层
  ctx.save();
  smoothPath(ctx, body);
  ctx.clip();
  const hc = P.headC;
  ctx.beginPath();
  ctx.ellipse(hc[0] + 0.045, hc[1] - 0.035, 0.1, 0.098, -P.lean, 0, Math.PI * 2);
  ctx.fillStyle = hair;
  ctx.globalAlpha *= 0.85;
  ctx.fill();
  // 脸：额 / 鼻 / 下巴这一侧是皮肤，比衣服暖一点
  ctx.globalAlpha = alpha * 0.55;
  ctx.beginPath();
  ctx.ellipse(hc[0] - 0.075, hc[1] + 0.035, 0.07, 0.1, -P.lean, 0, Math.PI * 2);
  ctx.fillStyle = skin;
  ctx.fill();
  // 领口
  ctx.globalAlpha = alpha * 0.5;
  ctx.strokeStyle = 'rgba(0,0,0,0.6)';
  ctx.lineWidth = 0.012;
  const nk = P.neck;
  ctx.beginPath();
  ctx.moveTo(nk[0] - 0.06, nk[1] + 0.03);
  ctx.quadraticCurveTo(nk[0], nk[1] + 0.06, nk[0] + 0.07, nk[1] + 0.02);
  ctx.stroke();
  // 裤子：腿部略换一个更深的颜色
  ctx.globalAlpha = alpha * 0.6;
  ctx.fillStyle = base;
  ctx.fillRect(-0.8, -0.1, 0.9, 0.7);
  ctx.restore();

  // 手臂
  const arm = o.arm || 'knees';
  // 关节按真实长度求：上臂 0.30 m、前臂 0.27 m
  const toward = (a, b, len) => { const dx = b[0] - a[0], dy = b[1] - a[1], L = Math.hypot(dx, dy) || 1; return [a[0] + (dx / L) * len, a[1] + (dy / L) * len]; };
  const pose = (name) => {
    if (name === 'knees') { const e = toward(P.shoulder, [-0.5, -0.06], 0.3); return [e, toward(e, [e[0] - 0.3, e[1] - 0.1], 0.25)]; }
    if (name === 'lap') { const e = toward(P.shoulder, [P.shoulder[0] + 0.02, 0.2], 0.3); return [e, toward(e, [-0.5, -0.08], 0.26)]; }
    if (name === 'reach') { const e = toward(P.shoulder, [-0.6, -0.1], 0.3); return [e, toward(e, [-0.9, 0.0], 0.27)]; }
    const e = toward(P.shoulder, [P.shoulder[0] - 0.05, 0.2], 0.28); return [e, toward(e, [e[0] - 0.3, e[1] - 0.12], 0.24)]; // phone
  };
  let [el, hand] = pose(arm);
  if (o.arm2 && o.armK != null) {
    const [e2, h2] = pose(o.arm2);
    el = [lerp(el[0], e2[0], o.armK), lerp(el[1], e2[1], o.armK)];
    hand = [lerp(hand[0], h2[0], o.armK), lerp(hand[1], h2[1], o.armK)];
  }
  const armPts = limb(P.shoulder, el, hand, 0.062, 0.05, 0.038);
  shade(ctx, (c) => smoothPath(c, armPts), { base: '#262d27', light: L, rim: rim * 0.9, rimCol, rimW, lit: 'rgba(255,220,180,0.16)', bbox: [hand[0], P.shoulder[1], P.shoulder[0], el[1]] });
  // 手
  ctx.save();
  ctx.translate(hand[0], hand[1]);
  ctx.rotate(Math.atan2(hand[1] - el[1], hand[0] - el[0]));
  ctx.beginPath();
  ctx.ellipse(0.025, 0, 0.052, 0.034, 0, 0, Math.PI * 2);
  ctx.fillStyle = skin;
  ctx.fill();
  ctx.restore();
  if (o.holding === 'glass') {
    ctx.save();
    ctx.translate(hand[0] - 0.035, hand[1] - 0.02);
    glassShape(ctx, 0.07, 0.12, { fill: 0.35, liquid: [120, 60, 40], scale: 1 });
    ctx.restore();
  }
  ctx.restore();
  return { hand: [hand[0] * u * face, hand[1] * u], head: [P.headC[0] * u * face, P.headC[1] * u], shoulder: [P.shoulder[0] * u * face, P.shoulder[1] * u] };
}

// ---------------- 桌上的物件（都以底部中心为原点） ----------------

// 玻璃杯：透明的杯壁、杯口椭圆高光、剩下的一点酒
function glassShape(ctx, w, h, o = {}) {
  const { fill = 0.2, liquid = [150, 70, 40], rimA = 1, tilt = 0 } = o;
  const ry = w * 0.16;
  ctx.save();
  ctx.rotate(tilt);
  // 杯身（几乎透明，只有边缘和反光）
  ctx.beginPath();
  ctx.moveTo(-w / 2, -h);
  ctx.lineTo(-w * 0.4, 0);
  ctx.ellipse(0, 0, w * 0.4, ry * 0.8, 0, Math.PI, 0, true);
  ctx.lineTo(w / 2, -h);
  ctx.closePath();
  ctx.fillStyle = 'rgba(200,190,170,0.08)';
  ctx.fill();
  // 剩下的酒
  if (fill > 0) {
    const ly = -h * fill;
    const lw = lerp(w * 0.4, w / 2, fill);
    ctx.beginPath();
    ctx.moveTo(-lw, ly);
    ctx.lineTo(-w * 0.4, 0);
    ctx.ellipse(0, 0, w * 0.4, ry * 0.8, 0, Math.PI, 0, true);
    ctx.lineTo(lw, ly);
    ctx.ellipse(0, ly, lw, ry, 0, 0, Math.PI, true);
    ctx.fillStyle = `rgba(${liquid.join(',')},0.75)`;
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(0, ly, lw, ry, 0, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(${liquid.map((v) => Math.min(255, v + 50)).join(',')},0.8)`;
    ctx.fill();
  }
  // 杯壁的竖向反光
  ctx.strokeStyle = 'rgba(255,244,224,0.35)';
  ctx.lineWidth = w * 0.05;
  ctx.beginPath();
  ctx.moveTo(-w * 0.32, -h * 0.9); ctx.lineTo(-w * 0.27, -h * 0.15);
  ctx.stroke();
  ctx.strokeStyle = 'rgba(220,210,190,0.4)';
  ctx.lineWidth = w * 0.025;
  ctx.beginPath();
  ctx.moveTo(-w / 2, -h); ctx.lineTo(-w * 0.4, 0);
  ctx.moveTo(w / 2, -h); ctx.lineTo(w * 0.4, 0);
  ctx.stroke();
  // 杯口：一圈亮的椭圆高光
  ctx.strokeStyle = `rgba(255,240,215,${0.75 * rimA})`;
  ctx.lineWidth = w * 0.035;
  ctx.beginPath();
  ctx.ellipse(0, -h, w / 2, ry, 0, 0, Math.PI * 2);
  ctx.stroke();
  ctx.strokeStyle = `rgba(255,250,235,${0.9 * rimA})`;
  ctx.lineWidth = w * 0.05;
  ctx.beginPath();
  ctx.ellipse(0, -h, w / 2, ry, 0, Math.PI * 1.05, Math.PI * 1.5);
  ctx.stroke();
  ctx.restore();
}

// 酒瓶：深绿 / 深褐玻璃，一条长反光；lying = 倒在桌上
function bottle(ctx, w, h, o = {}) {
  const { col = [34, 52, 40], lying = false, label = true } = o;
  ctx.save();
  if (lying) ctx.rotate(-Math.PI / 2 + 0.08);
  const [r, g, b] = col;
  ctx.beginPath();
  ctx.moveTo(-w / 2, 0);
  ctx.lineTo(-w / 2, -h * 0.62);
  ctx.quadraticCurveTo(-w / 2, -h * 0.75, -w * 0.17, -h * 0.82);
  ctx.lineTo(-w * 0.15, -h);
  ctx.lineTo(w * 0.15, -h);
  ctx.lineTo(w * 0.17, -h * 0.82);
  ctx.quadraticCurveTo(w / 2, -h * 0.75, w / 2, -h * 0.62);
  ctx.lineTo(w / 2, 0);
  ctx.closePath();
  const gr = ctx.createLinearGradient(-w / 2, 0, w / 2, 0);
  gr.addColorStop(0, `rgb(${r + 30},${g + 30},${b + 24})`);
  gr.addColorStop(0.35, `rgb(${r},${g},${b})`);
  gr.addColorStop(1, `rgb(${r * 0.4},${g * 0.4},${b * 0.4})`);
  ctx.fillStyle = gr;
  ctx.fill();
  if (label) {
    ctx.fillStyle = 'rgba(196,180,150,0.75)';
    ctx.fillRect(-w / 2, -h * 0.5, w, h * 0.22);
    ctx.fillStyle = 'rgba(60,40,30,0.5)';
    ctx.fillRect(-w * 0.3, -h * 0.42, w * 0.6, h * 0.025);
  }
  ctx.strokeStyle = 'rgba(255,240,215,0.45)';
  ctx.lineWidth = w * 0.08;
  ctx.beginPath();
  ctx.moveTo(-w * 0.28, -h * 0.08); ctx.lineTo(-w * 0.28, -h * 0.6);
  ctx.stroke();
  ctx.restore();
}

// 盘子：透视椭圆 + 盘沿 + 剩菜 / 碎屑
function plate(ctx, rx, ry, o = {}) {
  const { seed = 1, crumbs = 14, food = null } = o;
  ctx.save();
  ctx.fillStyle = 'rgba(0,0,0,0.35)';
  ctx.beginPath(); ctx.ellipse(rx * 0.06, ry * 0.25, rx * 1.02, ry * 1.02, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#cfc6b4';
  ctx.beginPath(); ctx.ellipse(0, 0, rx, ry, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#b9b09e';
  ctx.beginPath(); ctx.ellipse(0, ry * 0.06, rx * 0.68, ry * 0.62, 0, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = 'rgba(255,250,235,0.5)';
  ctx.lineWidth = Math.max(1, rx * 0.025);
  ctx.beginPath(); ctx.ellipse(0, 0, rx, ry, 0, Math.PI * 1.1, Math.PI * 1.7); ctx.stroke();
  const r = rng(seed);
  if (food) food(ctx, rx, ry, r);
  for (let i = 0; i < crumbs; i++) {
    const a = r() * Math.PI * 2, d = Math.sqrt(r()) * 0.6;
    ctx.fillStyle = r() < 0.5 ? 'rgba(120,80,50,0.8)' : 'rgba(170,120,70,0.7)';
    const s = 1 + r() * rx * 0.03;
    ctx.fillRect(Math.cos(a) * rx * d, Math.sin(a) * ry * d, s, s * 0.7);
  }
  ctx.restore();
}

// 揉皱的纸巾：几块不规则的亮面 + 折痕
function napkin(ctx, s, seed = 1) {
  const r = rng(seed);
  const pts = [];
  for (let i = 0; i < 9; i++) {
    const a = (i / 9) * Math.PI * 2, d = s * (0.6 + r() * 0.5);
    pts.push([Math.cos(a) * d, Math.sin(a) * d * 0.55 - s * 0.2]);
  }
  ctx.save();
  ctx.fillStyle = 'rgba(0,0,0,0.3)';
  ctx.beginPath(); ctx.ellipse(s * 0.1, s * 0.15, s * 1.0, s * 0.35, 0, 0, Math.PI * 2); ctx.fill();
  smoothPath(ctx, pts);
  ctx.fillStyle = '#d8d1c3';
  ctx.fill();
  ctx.strokeStyle = 'rgba(110,100,88,0.55)';
  ctx.lineWidth = Math.max(0.8, s * 0.04);
  for (let i = 0; i < 4; i++) {
    const a = r() * Math.PI * 2;
    ctx.beginPath();
    ctx.moveTo(Math.cos(a) * s * 0.1, -s * 0.2);
    ctx.lineTo(Math.cos(a) * s * 0.7, Math.sin(a) * s * 0.35 - s * 0.2);
    ctx.stroke();
  }
  ctx.fillStyle = 'rgba(0,0,0,0.12)';
  ctx.beginPath(); ctx.ellipse(s * 0.2, -s * 0.05, s * 0.5, s * 0.2, 0.3, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
}

// 碗：透视椭圆口 + 弧形碗身
function bowl(ctx, rx, ry, h, o = {}) {
  const { inner = '#8a6a4a', col = '#c9c0ae' } = o;
  ctx.save();
  ctx.fillStyle = 'rgba(0,0,0,0.35)';
  ctx.beginPath(); ctx.ellipse(rx * 0.08, h * 0.1, rx * 0.8, ry * 0.7, 0, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath();
  ctx.moveTo(-rx, -h);
  ctx.bezierCurveTo(-rx, -h * 0.2, -rx * 0.45, 0, 0, 0);
  ctx.bezierCurveTo(rx * 0.45, 0, rx, -h * 0.2, rx, -h);
  ctx.closePath();
  const g = ctx.createLinearGradient(-rx, 0, rx, 0);
  g.addColorStop(0, col);
  g.addColorStop(1, '#6e665a');
  ctx.fillStyle = g;
  ctx.fill();
  ctx.beginPath(); ctx.ellipse(0, -h, rx, ry, 0, 0, Math.PI * 2);
  ctx.fillStyle = '#dcd4c4'; ctx.fill();
  ctx.beginPath(); ctx.ellipse(0, -h + ry * 0.12, rx * 0.88, ry * 0.78, 0, 0, Math.PI * 2);
  ctx.fillStyle = inner; ctx.fill();
  ctx.restore();
}

// 失焦的前景（模糊一层再画上去）
const { filtered } = require('../../src/lib/material');
function foreground(ctx, blur, fn) { filtered(ctx, `blur(${blur}px)`, fn); }

module.exports = {
  withCam, toScreen, smoothPath, shade, seated, seatedPose, glassShape, bottle, plate, napkin, bowl, foreground, rot,
  W, H, C, FONT, rng, hash, noise1, lerp, clamp, prog, smooth,
};
