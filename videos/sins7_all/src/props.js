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

// ------------------------------------------------------------ 01 傲慢：一顶实心的粒子王冠，戴在头顶（额头上方，不挡眉毛和眼睛）
// 底部是贴合头部的冠环（雕花纹样），上面 7 个尖角、正中最高；只有尖角顶端的宝石是最亮的小点
// aExtra.y：0 紫色的冠身，5 金白色的边与雕花，1 宝石；aExtra.x：在尖角上的高度（0 底 → 1 尖）
export const CROWN_TOP = 0.6;
export function crown(k = 1) {
  const R = rng(77), pb = new PB(), N = n => Math.round(n * k);
  const C = [0, 0.0625, -0.1], RX = 0.5, RY = 0.65, RZ = 0.6125;           // 后脑椭球（和 geo.js 一致）
  const y0 = 0.47, band = CROWN_TOP - 0.47;
  const fy = y => Math.sqrt(Math.max(0.05, 1 - Math.pow((y - C[1]) / RY, 2)));
  const base = fy(y0);
  const ring = (a, y, out = 0) => { const g = 1.05 + 0.05 * clamp((y - y0) / band) + out; return [Math.sin(a) * RX * base * g, y, C[2] + Math.cos(a) * RZ * base * g]; };
  // 冠环：外表面（雕花）+ 内表面（暗）+ 上下两圈金边
  for (let i = 0; i < N(26000); i++) {
    const a = R() * TAU, v = R(), y = y0 + v * band;
    const rim = v < 0.1 || v > 0.9;
    const scroll = Math.abs(Math.sin(a * 14 + Math.sin(v * TAU) * 1.3)) < 0.13 && v > 0.22 && v < 0.78;
    const dot = Math.hypot(((a * 7 / TAU + 0.5) % 1 - 0.5) * 0.9, v - 0.5) < 0.09;
    const outer = R() < 0.78;
    const p = ring(a, y, outer ? 0 : -0.035);
    P(pb, R, p, rim || scroll ? (outer ? 1.0 : 0.3) : outer ? 0.42 : 0.16, 0, (rim || scroll) && outer ? 5 : 0);
    if (dot && outer && R() < 0.5) P(pb, R, ring(a, y, 0.008), 1.1, 0, 5);
  }
  // 7 个尖角：贴着冠环弧度的实心三角板（两层表面），金边 + 中脊；分布在正面 ±105°
  const n = 7;
  for (let sIdx = 0; sIdx < n; sIdx++) {
    const f = sIdx / (n - 1) * 2 - 1, a = f * 1.83, front = 1 - Math.abs(f);
    const h = 0.13 + 0.17 * Math.pow(front, 1.4), w = 0.2 - 0.03 * Math.abs(f);
    for (let j = 0; j < N(4200); j++) {
      const u = Math.pow(R(), 0.9), half = w * (1 - u) * 0.5, off = (R() * 2 - 1) * half;
      const edge = Math.abs(Math.abs(off) - half) < 0.007, ridge = Math.abs(off) < 0.004;
      const flare = 0.035 * u;                                            // 尖角微微向外张
      const p = ring(a + off / (RX * base), CROWN_TOP + u * h, flare + (R() < 0.5 ? 0 : -0.016));
      P(pb, R, p, edge ? 1.0 : ridge ? 0.75 : 0.36, u, edge || ridge ? 5 : 0);
    }
    const tip = ring(a, CROWN_TOP + h + 0.03, 0.035);                    // 顶端的宝石：一个小而亮的点
    for (let j = 0; j < N(260); j++) { const q = R() * TAU, r = 0.02 * Math.cbrt(R()), e = (R() * 2 - 1) * 0.02; P(pb, R, [tip[0] + Math.cos(q) * r, tip[1] + e, tip[2] + Math.sin(q) * r], 1.5, 1, 1); }
  }
  return pb;
}
export function collar(k = 1) {
  // 吸血鬼式的高立领：从肩膀立起，在头的两侧和后面高高张开（正前方开口）
  const R = rng(78), pb = new PB();
  for (let i = 0; i < Math.round(42000 * k); i++) {
    const a = lerp(0.55, TAU - 0.55, R()) + Math.PI / 2, v = Math.pow(R(), 0.9);
    const y = lerp(-1.15, 0.55, v), r = lerp(0.42, 1.05, Math.pow(v, 1.25));
    const side = Math.abs(Math.cos(a - Math.PI / 2));                       // 越靠两侧越高
    const yy = y + 0.25 * v * side, scallop = 0.05 * Math.sin(a * 7) * v;
    const top = v > 0.975, rib = Math.abs(Math.sin(a * 9)) > 0.97;
    P(pb, R, [Math.cos(a) * r, yy + scallop, -0.22 + Math.sin(a) * r * 0.75], top ? 2.0 : rib ? 1.2 : 0.4 + 0.4 * v, v);
  }
  return pb;
}

// ------------------------------------------------------------ 02 嫉妒：一条蛇——尾巴从右肩垂到胸前，往上绕过右肩、脖子后面、左侧，横过喉咙前面一圈，蛇头搭在右肩上
// 蛇身从尾到头逐渐变粗（颈部稍收），身上是菱形鳞片纹；蛇头是立体的三角楔形，两只发光的小眼睛，嘴前分叉的信子
// aExtra.y：0 蛇身，1 蛇头（上颌），4 下颌，2 眼睛，3 信子；aExtra.x：蛇身上从尾（0）到头（1）的位置
export function snake(k = 1) {
  const R = rng(91), pb = new PB();
  const ctrl = [[0.6, -2.0, 0.3], [0.56, -1.6, 0.34], [0.5, -1.22, 0.24], [0.4, -0.98, -0.02], [0.16, -0.84, -0.3], [-0.18, -0.82, -0.3], [-0.34, -0.88, 0.0], [-0.2, -0.98, 0.28], [0.08, -1.02, 0.34], [0.3, -0.98, 0.36], [0.42, -0.9, 0.44]];
  const cat = (P0, P1, P2, P3, u) => P0.map((_, j) => 0.5 * ((2 * P1[j]) + (-P0[j] + P2[j]) * u + (2 * P0[j] - 5 * P1[j] + 4 * P2[j] - P3[j]) * u * u + (-P0[j] + 3 * P1[j] - 3 * P2[j] + P3[j]) * u * u * u));
  const path = s => { const m = ctrl.length - 1, x = s * m, i = Math.min(m - 1, Math.floor(x)), u = x - i; return cat(ctrl[Math.max(0, i - 1)], ctrl[i], ctrl[i + 1], ctrl[Math.min(m, i + 2)], u); };
  const N = Math.round(70000 * k);
  for (let i = 0; i < N; i++) {
    const s = Math.pow(R(), 0.85), c = path(s), c2 = path(Math.min(1, s + 0.003)), tg = norm(sub(c2, c));
    const n1 = norm(cross(tg, [0, 1, 0])), n2 = cross(n1, tg);
    const rad = lerp(0.008, 0.062, Math.pow(s, 0.6)) * (s > 0.94 ? lerp(1, 0.7, (s - 0.94) / 0.06) : 1);   // 尾细头粗，接近头部的颈子略收
    const th = R() * TAU;
    // 菱形鳞片：格线亮、鳞片中间暗；腹部偏暗；绕到脖子后面的一段更暗（被脖子挡住）
    const sc = 70 / Math.max(0.3, rad / 0.062);
    const g1 = Math.abs(Math.sin(s * sc + th * 2.5)), g2 = Math.abs(Math.sin(s * sc - th * 2.5));
    const scale = Math.min(g1, g2) < 0.17 ? 1.25 : 0.3 + 0.22 * Math.min(g1, g2);
    const belly = Math.sin(th) < -0.55 ? 0.55 : 1;
    const behind = c[2] < -0.05 ? 0.25 : 1;
    P(pb, R, addv(c, addv(mul(n1, Math.cos(th) * rad), mul(n2, Math.sin(th) * rad))), scale * belly * behind, s, 0);
  }
  // 蛇头：立体楔形。俯视是圆角三角形（后颌宽、吻部尖），侧面上平下斜；只在表面取点，轮廓线亮
  const H = path(1), L = 0.3;
  const halfW = u => 0.1 * (1 - 0.72 * u) * Math.sqrt(Math.max(0, 1 - Math.pow(u, 6))) + 0.012;
  const top = u => 0.05 * (1 - 0.55 * u), bot = u => 0.034 * (1 - 0.6 * u);
  const head = (id, upper) => {
    for (let i = 0; i < Math.round(9000 * k); i++) {
      const u = R(), w = halfW(u), v = R() * 2 - 1, sg = upper ? 1 : -1, hh = upper ? top(u) : bot(u);
      const side = R() < 0.3;
      let p, br;
      if (side) { const e = R(); p = [Math.sign(v) * w, sg * hh * e * 0.95, u * L]; br = 0.3; }        // 侧面
      else {
        const prof = Math.sqrt(Math.max(0, 1 - Math.pow(Math.abs(v), 4)));
        p = [v * w, sg * hh * prof, u * L];
        const outline = Math.abs(v) > 0.9 || u > 0.975;
        const brow = upper && Math.abs(Math.abs(v) - 0.62) < 0.07 && u > 0.18 && u < 0.6;              // 眉脊
        const plates = upper && (Math.abs(Math.sin(u * 22 + Math.abs(v) * 2)) < 0.14 || Math.abs(v) < 0.05);
        br = outline ? 1.1 : brow ? 0.9 : plates ? 0.6 : upper ? 0.3 : 0.22;
      }
      P(pb, R, [H[0] + p[0], H[1] + p[1], H[2] + p[2]], br, u, id);
    }
    // 下颌和上颌之间的嘴线
    if (!upper) for (let i = 0; i < 900; i++) { const u = R(), sx = R() < 0.5 ? -1 : 1; P(pb, R, [H[0] + sx * halfW(u) * 0.98, H[1], H[2] + u * L], 0.9, u, id); }
  };
  head(1, true); head(4, false);
  // 眼睛：头顶两侧靠后（各一团小而亮的点，略微凸出）
  for (const sx of [-1, 1]) for (let i = 0; i < 260; i++) { const a = R() * TAU, r = 0.016 * Math.sqrt(R()), u = 0.36; P(pb, R, [H[0] + sx * (halfW(u) * 0.78) + Math.cos(a) * r * 0.5, H[1] + top(u) * 0.9 + Math.sin(a) * r * 0.6, H[2] + u * L + Math.cos(a + 1) * r], 2.2, 0, 2); }
  // 分叉的信子
  for (let i = 0; i < 1400; i++) { const u = R(), fork = u > 0.6 ? (i % 2 ? 1 : -1) * (u - 0.6) * 0.2 : 0; P(pb, R, [H[0] + fork, H[1] - 0.006, H[2] + L + u * 0.17], 1.3, u, 3); }
  return { pb, head: H, L };
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
