// 七宗罪的道具：全部是粒子点云（头部局部坐标：头顶 0.72、下巴约 −0.59、脸宽约 ±0.5、脸朝 +z）
// 每个点 aExtra = (参数 s, 编号, 0, 1)，aMisc = (亮度, 标记)；动画在 show.js 里由各自的材质 uniform 驱动
import { PB, V3 } from './geo.js';
import { rng, TAU, clamp, lerp } from './util.js';

const { addv, sub, mul, norm, cross, len } = V3;
function P(pb, R, p, br, s = 0, id = 0, flag = 30) { pb.add(p, [0, 0, 0], R(), [0, 0, 0], [s, id, 0, 1], [br, flag]); }
function line(pb, R, a, b, n, br, w = 0.006, s0 = 0, s1 = 1, id = 0) {
  for (let i = 0; i < n; i++) { const f = R(); P(pb, R, [lerp(a[0], b[0], f) + (R() - 0.5) * w, lerp(a[1], b[1], f) + (R() - 0.5) * w, lerp(a[2], b[2], f) + (R() - 0.5) * w], br, lerp(s0, s1, f), id); }
}
function poly(pb, R, pts, n, br, w = 0.006, id = 0) {
  let L = 0; const seg = []; for (let i = 0; i < pts.length - 1; i++) { const l = len(sub(pts[i + 1], pts[i])); seg.push(l); L += l; }
  let acc = 0; pts.slice(0, -1).forEach((a, i) => { line(pb, R, a, pts[i + 1], Math.max(2, Math.round(n * seg[i] / L)), br, w, acc / L, (acc + seg[i]) / L, id); acc += seg[i]; });
}

// ------------------------------------------------------------ 01 傲慢：光刺王冠 + 脖子后面立起的高硬领
export function crown(k = 1) {
  const R = rng(77), pb = new PB(), N = n => Math.round(n * k);
  const y0 = 0.86, rx = 0.42, rz = 0.38, cz = -0.1;
  for (let i = 0; i < N(4500); i++) { const a = R() * TAU; P(pb, R, [Math.sin(a) * rx, y0 + (R() - 0.5) * 0.008, cz + Math.cos(a) * rz], 1.0); }
  for (let s = 0; s < 15; s++) {
    const a = (s / 15) * TAU, front = 0.5 + 0.5 * Math.cos(a), h = 0.1 + 0.2 * Math.pow(front, 2) + (s % 2 ? 0 : 0.04);
    const b = [Math.sin(a) * rx, y0, cz + Math.cos(a) * rz];
    for (let j = 0; j < N(520); j++) { const u = Math.pow(R(), 0.7), w = 0.018 * (1 - u); P(pb, R, [b[0] * (1 + 0.1 * u) + (R() - 0.5) * w, y0 + u * h, b[2] * (1 + 0.1 * u) + (R() - 0.5) * w], u > 0.88 ? 2.2 : 1.2, u); }
  }
  return pb;
}
export function collar(k = 1) {
  // 绕到脖子后面的一圈高硬领：下沿贴肩，上沿外翻到耳朵高度
  const R = rng(78), pb = new PB();
  for (let i = 0; i < Math.round(26000 * k); i++) {
    const a = lerp(0.75, TAU - 0.75, R()) + Math.PI / 2, v = R();                // a：绕脖子的角度（正前方留开口）
    const y = lerp(-1.05, -0.05, v), r = lerp(0.36, 0.7, Math.pow(v, 1.4));
    const edge = v > 0.97 || Math.abs(Math.cos(a - Math.PI / 2)) > 0.68 && R() < 0.3;
    P(pb, R, [Math.cos(a) * r, y, -0.18 + Math.sin(a) * r * 0.9], edge ? 1.8 : 0.55 + 0.35 * v, v);
  }
  return pb;
}

// ------------------------------------------------------------ 02 嫉妒：缠在脖子上的蛇（越往尾巴越细，鳞纹）+ 楔形蛇头
export function snake(k = 1) {
  const R = rng(91), pb = new PB();
  // 脊线：从右肩绕脖子一圈半，蛇头搭在左肩（画面右侧）
  const path = s => {
    const a = lerp(-0.6, TAU * 1.25, s), r = 0.36 + 0.05 * Math.sin(s * 9), y = -0.62 - 0.32 * s + 0.04 * Math.sin(a * 2);
    return [Math.cos(a) * r * 1.05, y, -0.1 + Math.sin(a) * r];
  };
  const N = Math.round(42000 * k);
  for (let i = 0; i < N; i++) {
    const s = R(), c = path(s), c2 = path(Math.min(1, s + 0.002)), t = norm(sub(c2, c));
    const up = Math.abs(t[1]) > 0.9 ? [1, 0, 0] : [0, 1, 0], n1 = norm(cross(t, up)), n2 = cross(t, n1);
    const rad = lerp(0.075, 0.012, Math.pow(s, 0.7)), th = R() * TAU;
    const scale = 0.5 + 0.5 * Math.cos(th * 6 + s * 160);                       // 鳞片的光纹
    P(pb, R, addv(c, addv(mul(n1, Math.cos(th) * rad), mul(n2, Math.sin(th) * rad))), 0.55 + 0.7 * scale, 1 - s, 0);
  }
  // 蛇头：立体的楔形，搭在画面右侧的肩上（id 1，单独转向）
  const H = [0.55, -0.92, 0.18];
  for (let i = 0; i < Math.round(9000 * k); i++) {
    const u = R(), v = (R() - 0.5) * 2, w = (R() - 0.5) * 2;
    const len_ = 0.26, wid = 0.1 * (1 - 0.75 * u), hgt = 0.05 * (1 - 0.6 * u);
    const onEdge = Math.abs(v) > 0.85 || Math.abs(w) > 0.85;
    P(pb, R, [H[0] + v * wid, H[1] + w * hgt + 0.02, H[2] + u * len_], onEdge ? 1.5 : 0.7, u, 1);
  }
  for (const sx of [-1, 1]) for (let i = 0; i < 300; i++) { const a = R() * TAU, r = 0.012 * Math.sqrt(R()); P(pb, R, [H[0] + sx * 0.06 + Math.cos(a) * r, H[1] + 0.07 + Math.sin(a) * r, H[2] + 0.12], 3.0, 0, 2); }
  // 蛇信（id 3，闪烁伸缩）
  for (let i = 0; i < 700; i++) { const u = R(), fork = u > 0.7 ? (i % 2 ? 1 : -1) * (u - 0.7) * 0.12 : 0; P(pb, R, [H[0] + fork, H[1] + 0.01, H[2] + 0.26 + u * 0.14], 1.6, u, 3); }
  return { pb, head: H };
}

// ------------------------------------------------------------ 03 愤怒：两根闪电角（折线，噼啪闪烁）
export function lightningHorns(k = 1) {
  const R = rng(31), pb = new PB();
  for (const sx of [-1, 1]) for (let b = 0; b < 3; b++) {
    let p = [sx * 0.3, 0.62, 0.0]; const pts = [p];
    for (let j = 0; j < 9; j++) { p = addv(p, [sx * (0.04 + 0.03 * R()) + (R() - 0.5) * 0.06, 0.07 + 0.03 * R(), (R() - 0.5) * 0.04]); pts.push(p); }
    poly(pb, R, pts, Math.round((b ? 1500 : 3000) * k), b ? 1.0 : 1.8, 0.008, (sx > 0 ? 3 : 0) + b);
  }
  return pb;
}

// ------------------------------------------------------------ 04 懒惰：毛线帽（半球 + 翻边，毛线纹理）+ 厚围巾 + 三个 Z
export function beanie(k = 1) {
  const R = rng(41), pb = new PB();
  for (let i = 0; i < Math.round(36000 * k); i++) {
    const u = R(), a = R() * TAU, el = Math.acos(1 - u * 0.9);                  // 头顶的半球
    const r = 0.58, y = 0.12 + Math.cos(el) * 0.66, rr = Math.sin(el) * r;
    const knit = 0.5 + 0.5 * Math.sin(a * 40 + Math.sin(el * 30) * 2) * Math.sin(el * 60);
    P(pb, R, [Math.cos(a) * rr * 0.95, y, -0.12 + Math.sin(a) * rr], 0.45 + 0.6 * knit, el, 0);
  }
  for (let i = 0; i < Math.round(14000 * k); i++) {                            // 翻边：一圈粗罗纹
    const a = R() * TAU, v = R(), rib = 0.5 + 0.5 * Math.cos(a * 70);
    P(pb, R, [Math.cos(a) * 0.62, 0.16 + v * 0.14, -0.12 + Math.sin(a) * 0.6], 0.5 + 0.7 * rib, v, 1);
  }
  for (let i = 0; i < 1500; i++) { const a = R() * TAU, r = 0.09 * Math.cbrt(R()); P(pb, R, [Math.cos(a) * r, 0.86 + (R() - 0.5) * 0.15, -0.12 + Math.sin(a) * r], 1.2, 0, 2); }   // 毛线球
  return pb;
}
export function scarf(k = 1) {
  const R = rng(42), pb = new PB();
  for (let i = 0; i < Math.round(30000 * k); i++) {
    const a = R() * TAU, b = R() * TAU, wind = 0.5 + 0.5 * Math.sin(a * 3);
    const rr = 0.42 + 0.1 * Math.cos(b), y = -0.78 + 0.1 * Math.sin(b) + 0.06 * Math.sin(a * 2);
    const knit = 0.5 + 0.5 * Math.sin(a * 60) * Math.sin(b * 6);
    P(pb, R, [Math.cos(a) * rr, y, -0.1 + Math.sin(a) * rr * 0.95], 0.45 + 0.55 * knit * wind, a / TAU);
  }
  for (let i = 0; i < Math.round(6000 * k); i++) { const v = R(), w = (R() - 0.5) * 0.16; P(pb, R, [0.18 + w, -0.82 - v * 0.6, 0.33 - v * 0.05], 0.4 + 0.5 * (0.5 + 0.5 * Math.sin(v * 80)), v, 1); }   // 垂下的一端
  return pb;
}
export function zees(k = 1) {
  const R = rng(43), pb = new PB();
  for (let z = 0; z < 3; z++) { const s = 0.08 + z * 0.03, c = [0.45 + z * 0.18, 0.95 + z * 0.22, 0.1]; poly(pb, R, [[c[0] - s, c[1] + s, c[2]], [c[0] + s, c[1] + s, c[2]], [c[0] - s, c[1] - s, c[2]], [c[0] + s, c[1] - s, c[2]]], Math.round(1400 * k), 1.6, 0.01, z); }
  return pb;
}

// ------------------------------------------------------------ 05 贪婪：绕着头转的金币星环（每枚是一个扁圆柱，id = 第几枚）
export function coins(n = 90, k = 1) {
  const R = rng(51), pb = new PB();
  for (let c = 0; c < n; c++) {
    const per = Math.round(220 * k);
    for (let i = 0; i < per; i++) {
      const a = R() * TAU, r = 0.06 * Math.sqrt(R()), rim = r > 0.05, face = R() < 0.5 ? 1 : -1;
      P(pb, R, [Math.cos(a) * r, Math.sin(a) * r, face * 0.008], rim ? 1.6 : 0.8 + 0.6 * (Math.abs(Math.cos(a * 5)) > 0.9 ? 1 : 0), c / n, c);
    }
  }
  return pb;
}

// ------------------------------------------------------------ 06 暴食：大胡子（发丝）+ 碗、鸡腿、包子的轮廓
export function beard(k = 1) {
  const R = rng(61), pb = new PB();
  for (let s = 0; s < Math.round(420 * k); s++) {
    const a = lerp(-1.25, 1.25, R()), root = [Math.sin(a) * 0.4, -0.38 - 0.18 * Math.cos(a), 0.18 + 0.2 * Math.cos(a)];
    const L = 0.35 + 0.35 * Math.cos(a) * R(), curl = (R() - 0.5) * 0.3;
    const pts = []; for (let j = 0; j <= 8; j++) { const f = j / 8; pts.push([root[0] + Math.sin(f * 3 + curl * 10) * 0.03 + root[0] * 0.15 * f, root[1] - f * L, root[2] + 0.06 * f - 0.08 * f * f]); }
    poly(pb, R, pts, 60, 0.7 + 0.5 * R(), 0.004, 0);
  }
  return pb;
}
export function food(k = 1) {
  // 三种食物轮廓（id 0 碗、1 鸡腿、2 包子），各两份，绕着头漂浮；每份的 aExtra.x = 份号
  const R = rng(62), pb = new PB();
  const shapes = [
    t => [Math.cos(t) * 0.16, Math.min(0, Math.sin(t)) * 0.12 + (Math.sin(t) > 0 ? 0 : 0), 0],                    // 碗（半圆 + 口沿）
    t => { const u = t / TAU; return u < 0.6 ? [Math.cos(u / 0.6 * TAU) * 0.1 + 0.05, Math.sin(u / 0.6 * TAU) * 0.08 + 0.04, 0] : [-0.05 - (u - 0.6) * 0.4, -0.04 - (u - 0.6) * 0.3, 0]; },   // 鸡腿
    t => [Math.cos(t) * 0.12, Math.max(-0.05, Math.sin(t) * 0.1), 0],                                                // 包子
  ];
  for (let copy = 0; copy < 6; copy++) {
    const sh = shapes[copy % 3];
    for (let i = 0; i < Math.round(2200 * k); i++) { const t = R() * TAU, p = sh(t); P(pb, R, [p[0] + (R() - 0.5) * 0.006, p[1] + (R() - 0.5) * 0.006, 0], 1.3, copy / 6, copy); }
    if (copy % 3 === 0) for (let i = 0; i < Math.round(700 * k); i++) { const f = R(); P(pb, R, [lerp(-0.16, 0.16, f), 0, 0], 1.4, copy / 6, copy); }
    if (copy % 3 === 2) for (let i = 0; i < Math.round(500 * k); i++) { const a = R() * TAU, r = 0.025 * R(); P(pb, R, [Math.cos(a) * r, 0.08 + Math.sin(a) * r, 0], 1.5, copy / 6, copy); }
  }
  return pb;
}

// ------------------------------------------------------------ 07 色欲：一圈心形粒子（每颗心 id = 第几颗）
export function hearts(n = 14, k = 1) {
  const R = rng(71), pb = new PB();
  for (let h = 0; h < n; h++) for (let i = 0; i < Math.round(900 * k); i++) {
    const t = R() * TAU, x = 16 * Math.pow(Math.sin(t), 3), y = 13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t);
    const fill = R() < 0.25 ? Math.sqrt(R()) : 1;
    P(pb, R, [x * 0.0045 * fill, y * 0.0045 * fill, 0], fill === 1 ? 1.4 : 0.5, h / n, h);
  }
  return pb;
}
