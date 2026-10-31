// 所有目标形状的点集：星尘、光点、罪名大字、神像的脸（闭眼 + 半睁的位移）、光环各层、开头的七张脸
// 每个形状打包成两张 512×512 的浮点纹理：T0 = (x, y, z, 亮度)，T1 = (色阶 0…1, 部件, 第几宗, 眼皮位移)
// 粒子编号分两段：内容段 [0, NC) 在每个形状里随机打乱分配；星尘段 [NC, N) 永远是星尘。内容不够的形状，多出的内容粒子也变成星尘。
import { parseOBJ, buildHead, V3 } from './lib/geo.js';
import { rng, TAU, clamp, lerp, hash } from './lib/util.js';

export const TEX = 512;
export const PART = { STAR: 0, BODY: 1, EYE: 2, INNER: 3, MAIN: 4, OUTER: 5, RAYS: 6, CROWN: 7, FLAME: 8, POINT: 9 };
const { addv, sub, mul, norm, cross, dot, len } = V3;

// ------------------------------------------------------------ 打包
export class Shape {
  constructor() { this.p = []; this.gain = 1; }          // 每个点：[x, y, z, b, tone, part, sin, lidDy]
  add(x, y, z, b, tone, part, sin = 0, lid = 0) { this.p.push([x, y, z, b * this.gain, tone, part, sin, lid]); }
  get n() { return this.p.length; }
}
export function pack(shape, G, seed) {
  const N = TEX * TEX, T0 = new Float32Array(N * 4), T1 = new Float32Array(N * 4);
  const R = rng(seed), perm = Array.from({ length: G.NC }, (_, i) => i);
  for (let i = G.NC - 1; i > 0; i--) { const j = Math.floor(R() * (i + 1)); const t = perm[i]; perm[i] = perm[j]; perm[j] = t; }
  const pts = shape.p.length > G.NC ? shape.p.slice(0, G.NC) : shape.p;
  for (let i = 0; i < N; i++) { const s = G.star[i]; T0.set([s[0], s[1], s[2], s[3]], i * 4); T1.set([s[4], PART.STAR, 0, 0], i * 4); }
  pts.forEach((q, k) => { const i = perm[k]; T0.set([q[0], q[1], q[2], q[3]], i * 4); T1.set([q[4], q[5], q[6], q[7]], i * 4); });
  return { T0, T1, n: pts.length };
}
// 星尘：在主体后方的深空里（每个粒子编号一个固定位置）
export function starfield(N) {
  const out = new Array(N);
  for (let i = 0; i < N; i++) {
    const z = -lerp(2, 30, Math.pow(hash(i * 1.31 + 0.2), 0.7)), k = (15.86 - z) / 15.86;
    out[i] = [(hash(i * 2.17 + 1) - 0.5) * 18.5 * k, (hash(i * 3.71 + 2) - 0.5) * 10.6 * k + 0.9 * k, z, hash(i * 9.1) < 0.35 ? 0.06 * (0.3 + 0.7 * hash(i * 5.3)) : 0, hash(i * 7.7) * 0.8];
  }
  return out;
}

// ------------------------------------------------------------ 光点
export function pointShape(n, c, seed = 5) {
  const R = rng(seed), s = new Shape();
  for (let i = 0; i < n; i++) { const r = 0.04 * Math.pow(R(), 2), a = R() * TAU; s.add(c[0] + Math.cos(a) * r, c[1] + Math.sin(a) * r, c[2] + 0.5, 0.05, 1, PART.POINT); }
  return s;
}

// ------------------------------------------------------------ 罪名大字：canvas 画字 → 距离场 → 边缘越近越密越亮；上边缘的点做「火焰」
export function charShape(ch, n, o) {
  const W = 1024, H = 1024, cv = document.createElement('canvas'); cv.width = W; cv.height = H;
  const x = cv.getContext('2d'); x.fillStyle = '#fff'; x.textAlign = 'center'; x.textBaseline = 'middle';
  x.font = `900 800px "Noto Serif CJK SC"`; x.fillText(ch, W / 2, H / 2 + 20);
  const im = x.getImageData(0, 0, W, H).data, inside = new Uint8Array(W * H);
  let x0 = W, x1 = 0, y0 = H, y1 = 0;
  for (let i = 0; i < W * H; i++) if (im[i * 4 + 3] > 127) { inside[i] = 1; const px = i % W, py = (i / W) | 0; x0 = Math.min(x0, px); x1 = Math.max(x1, px); y0 = Math.min(y0, py); y1 = Math.max(y1, py); }
  // 到边缘的距离（两遍倒角距离变换，单位像素）
  const D = new Float32Array(W * H).fill(1e6);
  for (let i = 0; i < W * H; i++) if (!inside[i]) D[i] = 0;
  const pass = (fwd) => {
    for (let k = 0; k < W * H; k++) {
      const i = fwd ? k : W * H - 1 - k, px = i % W, py = (i / W) | 0; if (!inside[i]) continue;
      const nb = fwd ? [[-1, 0, 1], [0, -1, 1], [-1, -1, 1.414], [1, -1, 1.414]] : [[1, 0, 1], [0, 1, 1], [1, 1, 1.414], [-1, 1, 1.414]];
      for (const [dx, dy, c] of nb) { const qx = px + dx, qy = py + dy; if (qx < 0 || qy < 0 || qx >= W || qy >= H) continue; D[i] = Math.min(D[i], D[qy * W + qx] + c); }
    }
  };
  pass(true); pass(false);
  const sc = o.height / (y1 - y0), cx = (x0 + x1) / 2, cy = (y0 + y1) / 2;
  const toW = (px, py) => [o.c[0] + (px - cx) * sc, o.c[1] - (py - cy) * sc, o.c[2]];
  const R = rng(o.seed ?? 11), s = new Shape(); s.gain = o.gain ?? 1;
  const edgeW = 9;
  let guard = 0, nf = 0;
  const nFlame = Math.round(n * 0.05);
  while (s.n < n - nFlame && guard++ < n * 40) {
    const px = x0 + R() * (x1 - x0), py = y0 + R() * (y1 - y0), i = (py | 0) * W + (px | 0);
    if (!inside[i]) continue;
    const e = Math.exp(-D[i] / edgeW);
    if (R() > 0.3 + 0.7 * e) continue;
    const p = toW(px, py);
    s.add(p[0], p[1], p[2] + (R() - 0.5) * 0.04, 0.32 + 0.9 * e, clamp(0.45 + 0.55 * e), PART.BODY, o.sin);
  }
  // 火焰：朝上的边缘点（上方一像素在字外）
  const tops = [];
  for (let py = y0; py <= y1; py++) for (let px = x0; px <= x1; px++) { const i = py * W + px; if (inside[i] && !inside[i - W * 2]) tops.push([px, py]); }
  while (nf < nFlame && tops.length) { const [px, py] = tops[Math.floor(R() * tops.length)]; const p = toW(px, py); s.add(p[0], p[1], p[2] + 0.02, 0.9, 1, PART.FLAME, o.sin); nf++; }
  return s;
}

// ------------------------------------------------------------ 神像的脸
// MediaPipe 标准人脸（重新按三角形 + 重心坐标采样，所以闭眼和半睁两种网格上的同一个粒子能一一对应）
// + 程序生成的后脑和脖子（buildHead 里的那部分）+ 耳朵 + 肩膀上缘
const EYE = {
  R: { up: [246, 161, 160, 159, 158, 157, 173], lo: [7, 163, 144, 145, 153, 154, 155], ring1: [247, 30, 29, 27, 28, 56, 190], ring2: [113, 225, 224, 223, 222, 221, 189], c: [33, 133] },
  L: { up: [466, 388, 387, 386, 385, 384, 398], lo: [249, 390, 373, 374, 380, 381, 382], ring1: [467, 260, 259, 257, 258, 286, 414], ring2: [342, 445, 444, 443, 442, 441, 413], c: [263, 362] },
};
let OBJ = null, BACK = null;
export function initFace(objText) {
  OBJ = parseOBJ(objText);
  const { pb, faceCount } = buildHead(OBJ, { seed: 7, face: 10, back: 60000, neck: 9000 });
  BACK = []; for (let i = faceCount; i < pb.count; i++) BACK.push([pb.pos(i), pb.nor(i), pb.m[i * 2]]);
}
// open：0 闭眼；1 半睁（眼皮落到 45%）
function deform(open, smile) {
  const V = OBJ.V.map(v => v.slice());
  const faceH = OBJ.V.reduce((m, v) => Math.max(m, v[1]), -9) - OBJ.V[152][1];
  for (const e of [EYE.R, EYE.L]) {
    e.up.forEach((u, k) => {
      const lo = OBJ.V[e.lo[k]], up = OBJ.V[u];
      const tgt = addv(lo, mul(sub(up, lo), 0.45 * open));            // 眼皮的位置
      const d = sub(tgt, up);
      V[u] = addv(up, d);
      V[e.ring1[k]] = addv(OBJ.V[e.ring1[k]], mul(d, 0.6));
      V[e.ring2[k]] = addv(OBJ.V[e.ring2[k]], mul(d, 0.25));
    });
  }
  // 嘴角上抬约脸高的 1.5%：平静的微笑
  const up = [0, faceH * smile, 0];
  for (const [i, k] of [[61, 1], [291, 1], [76, 0.7], [306, 0.7], [146, 0.5], [91, 0.35], [185, 0.5], [40, 0.35], [375, 0.5], [321, 0.35], [409, 0.5], [270, 0.35]]) V[i] = addv(V[i], mul(up, k));
  return { V, faceH };
}
export function faceShape(n, o) {
  const R = rng(o.seed ?? 21), s = new Shape(); s.gain = o.gain ?? 1;
  const C = deform(0, 0.015), Hh = deform(1, 0.015), VN = OBJ.VN, F = OBJ.F;
  const faceTop = OBJ.V.reduce((m, v) => Math.max(m, v[1]), -9), chin = OBJ.V[152][1], faceH = faceTop - chin;
  const k = o.faceH / faceH;                                          // 模型单位 → 世界单位
  const tilt = (o.tilt ?? 8) * Math.PI / 180, piv = [0, chin - 0.1, -0.15];
  const L = norm([0, 0.75, 0.66]), Vv = norm([0, -0.17, 0.98]);
  // 模型坐标 → 世界：绕脖子低头 tilt 度，再缩放平移（下巴放到 o.chin）
  const xf = (p, rot = true) => {
    let q = sub(p, piv);
    if (rot) { const c = Math.cos(tilt), si = Math.sin(tilt); q = [q[0], q[1] * c - q[2] * si, q[1] * si + q[2] * c]; }
    q = addv(q, piv);
    return [o.chin[0] + q[0] * k, o.chin[1] + (q[1] - chin) * k, o.chin[2] + q[2] * k];
  };
  const xn = (nv, rot = true) => { if (!rot) return nv; const c = Math.cos(tilt), si = Math.sin(tilt); return [nv[0], nv[1] * c - nv[2] * si, nv[1] * si + nv[2] * c]; };
  const light = (nv, boost = 1) => {
    const fr = dot(nv, Vv);
    if (fr < 0) return [0.03, 0.05];
    const lam = Math.max(0, dot(nv, L)), rim = Math.pow(1 - fr, 2) * clamp((0.45 - fr) / 0.3);   // 轮廓光只在真正的轮廓附近
    return [((0.08 + 0.8 * Math.pow(lam, 1.3)) * Math.pow(fr, 0.3) + 1.0 * rim) * boost, clamp(0.12 + 0.55 * lam + 0.9 * rim)];
  };
  // 脸：按面积采样
  const area = F.map(f => len(cross(sub(OBJ.V[f[1]], OBJ.V[f[0]]), sub(OBJ.V[f[2]], OBJ.V[f[0]]))) / 2);
  const cum = []; let tot = 0; for (const a of area) { tot += a; cum.push(tot); }
  const pick = () => { const r = R() * tot; let lo = 0, hi = cum.length - 1; while (lo < hi) { const m = (lo + hi) >> 1; if (cum[m] < r) lo = m + 1; else hi = m; } return lo; };
  const shF = o.shoulders === false ? 0 : 0.12;
  const nFace = Math.round(n * (0.62 + 0.12 - shF)), nEye = Math.round(n * 0.02), nBack = Math.round(n * 0.21), nEar = Math.round(n * 0.03), nSh = Math.max(0, n - nFace - nEye - nBack - nEar);
  const bary = (Vs, f, u, v) => { const w = 1 - u - v; return addv(addv(mul(Vs[f[0]], w), mul(Vs[f[1]], u)), mul(Vs[f[2]], v)); };
  for (let i = 0; i < nFace; i++) {
    const fi = pick(), f = F[fi]; let u = R(), v = R(); if (u + v > 1) { u = 1 - u; v = 1 - v; }
    const pc = xf(bary(C.V, f, u, v)), ph = xf(bary(Hh.V, f, u, v));
    const nv = xn(norm(bary(VN, f, u, v)));
    const [b, tone] = light(nv);
    s.add(pc[0], pc[1], pc[2], b, tone, PART.BODY, o.sin, ph[1] - pc[1]);
  }
  // 眼缝里的光：闭眼时全部落在眼睑线上，半睁时铺满眼缝（亮度随睁眼程度）
  for (const e of [EYE.R, EYE.L]) {
    const loC = e.lo.map(i => C.V[i]), loH = e.lo.map(i => Hh.V[i]), upH = e.up.map(i => Hh.V[i]);
    for (let i = 0; i < nEye / 2; i++) {
      const j = R() * (loC.length - 1), j0 = Math.floor(j), fj = j - j0, j1 = Math.min(loC.length - 1, j0 + 1);
      const lc = addv(mul(loC[j0], 1 - fj), mul(loC[j1], fj)), lh = addv(mul(loH[j0], 1 - fj), mul(loH[j1], fj)), uh = addv(mul(upH[j0], 1 - fj), mul(upH[j1], fj));
      const b = 0.3 + 0.4 * R();
      const pc = xf(addv(lc, [0, 0, 0.004])), ph = xf(addv(addv(lh, mul(sub(uh, lh), b)), [0, 0, 0.004]));
      const taper = Math.sin(Math.PI * j / (loC.length - 1));
      s.add(pc[0], pc[1], pc[2], 1.1 * (0.3 + 0.7 * taper) * (o.eyeGain ?? 1) / s.gain, 1, PART.EYE, o.sin, (ph[1] - pc[1]) * (0.4 + 0.6 * taper));
    }
  }
  // 后脑、头顶、脖子
  for (let i = 0; i < nBack; i++) {
    const [p, nv, br] = BACK[Math.floor(R() * BACK.length)];
    const neck = p[1] < chin + 0.02;
    const q = xf(p, !neck), nn = xn(nv, !neck);
    const [b, tone] = light(nn, br);
    s.add(q[0], q[1], q[2], b, tone, PART.BODY, o.sin);
  }
  // 耳朵：贴在头两侧的扁椭球壳
  for (let i = 0; i < nEar; i++) {
    const sd = i % 2 ? 1 : -1;
    let a = R() * 2 - 1, bb = R() * 2 - 1, c = R() * 2 - 1; const l = Math.hypot(a, bb, c) || 1; a /= l; bb /= l; c /= l;
    const p = [sd * (0.5 + 0.035 * Math.abs(a)), 0.1 + 0.16 * bb, -0.12 + 0.07 * c];
    const nv = norm([sd * 0.8 + a * 0.3, bb * 0.4, c * 0.4]);
    const q = xf(p), [b, tone] = light(xn(nv));
    s.add(q[0], q[1], q[2], b, tone, PART.BODY, o.sin);
  }
  // 肩膀上缘：从脖子根部向两侧斜下，往下逐渐消散
  for (let i = 0; i < nSh; i++) {
    const x = (R() * 2 - 1) * 1.9, ax = Math.abs(x);
    const top = chin - 0.62 - 0.32 * Math.pow(Math.max(0, ax - 0.25), 1.3) + 0.08 * Math.exp(-ax * ax * 6);
    const drop = Math.pow(R(), 1.8) * 0.9, y = top - drop;
    const p = [x, y, -0.15 + 0.35 * Math.cos(Math.min(1.4, ax * 0.9))];
    const fade = Math.exp(-drop * 3.2);
    const nv = norm([x * 0.35, 0.75 - drop, 0.55]);
    const q = xf(p, false), [b, tone] = light(nv);
    s.add(q[0], q[1], q[2], b * fade * (drop < 0.03 ? 1.6 : 1), tone, PART.BODY, o.sin);
  }
  const eyes = [EYE.R, EYE.L].map(e => xf(mul(addv(C.V[e.c[0]], C.V[e.c[1]]), 0.5)));
  return { shape: s, eyes, top: xf([0, faceTop + 0.12, -0.1]), k };
}

// ------------------------------------------------------------ 光环（全部由粒子组成）
// 内层：这一宗的图案（0.75×脸高）｜主环：干净正圆 6px（0.9×）｜外环：120 刻度 + 72 点阵（1.05×）｜放射光 48 道
export function haloShape(s, o) {
  const R = rng(o.seed ?? 31), C = o.c, FH = o.faceH, px = o.px;     // px：一个像素对应的世界长度
  const ring = (r, n, w, b, tone, part) => { for (let i = 0; i < n; i++) { const a = R() * TAU, rr = r + (R() + R() + R() - 1.5) * w; s.add(C[0] + Math.cos(a) * rr, C[1] + Math.sin(a) * rr, C[2], b, tone, part, o.sin); } };
  const line = (a, b, n, br, tone, part, w, fadeOut = false) => { for (let i = 0; i < n; i++) { const f = R(); s.add(lerp(a[0], b[0], f) + (R() - 0.5) * w, lerp(a[1], b[1], f) + (R() - 0.5) * w, C[2], br * (fadeOut ? Math.pow(1 - f, 1.4) : 1), tone, part, o.sin); } };
  const P = (r, a) => [C[0] + Math.cos(a) * r, C[1] + Math.sin(a) * r];
  const k = o.k ?? 1, N = v => Math.round(v * k);
  const rMain = 0.9 * FH, rIn = 0.75 * FH, rOut = 1.05 * FH;
  if (o.main !== false) ring(rMain, N(26000), 2.2 * px, 0.55, 1, PART.MAIN);
  if (o.rays !== false) for (let i = 0; i < 48; i++) {
    const a = (i / 48) * TAU + (hash(i * 3.1) - 0.5) * 0.04, L = rMain * (0.3 + 0.5 * hash(i * 7.3 + o.sin));
    line(P(rMain * 1.02, a), P(rMain * 1.02 + L, a), N(420), 0.75, 0.85, PART.RAYS, 1.6 * px, true);
  }
  if (o.outer) {
    ring(rOut, N(5000), 0.8 * px, 0.32, 0.8, PART.OUTER);
    for (let i = 0; i < 120; i++) { const a = (i / 120) * TAU, Lt = (i % 10 === 0 ? 0.06 : 0.03) * FH; line(P(rOut, a), P(rOut + Lt, a), N(i % 10 === 0 ? 70 : 35), 0.4, 0.85, PART.OUTER, 1.2 * px); }
    for (let i = 0; i < 72; i++) { const c = P(rOut * 1.1, (i + 0.5) / 72 * TAU); for (let j = 0; j < N(40); j++) { const a = R() * TAU, r = 3 * px * Math.sqrt(R()); s.add(c[0] + Math.cos(a) * r, c[1] + Math.sin(a) * r, C[2], 0.45, 0.9, PART.OUTER, o.sin); } }
  }
  if (o.inner === 'crown') {
    // 王冠：24 根向外的尖刺，越靠上越长（最上面是两侧的 3 倍）
    ring(rIn, N(5000), 1.2 * px, 0.4, 0.8, PART.INNER);
    for (let i = 0; i < 24; i++) {
      const a = (i / 24) * TAU + Math.PI / 2, up = Math.max(0, Math.sin(a));
      const Ls = 0.07 * FH * (1 + 2 * Math.pow(up, 1.5)), wb = 0.022 * FH;
      const dir = [Math.cos(a), Math.sin(a)], side = [-dir[1], dir[0]], base = P(rIn, a);
      for (let j = 0; j < N(700); j++) {
        const h = Math.pow(R(), 0.8), w = (R() - 0.5) * 2 * wb * (1 - h);
        const edge = Math.abs(Math.abs(w) - wb * (1 - h)) < 0.004 * FH;
        s.add(base[0] + dir[0] * h * Ls + side[0] * w, base[1] + dir[1] * h * Ls + side[1] * w, C[2], (edge ? 0.8 : 0.35) * (h > 0.9 ? 1.5 : 1), clamp(0.6 + 0.4 * h), PART.INNER, o.sin);
      }
    }
  }
  return s;
}
// 头顶上方悬浮的小王冠（12 根光刺，3D 圆环，绕竖轴缓慢旋转）
export function smallCrown(s, o) {
  const R = rng(o.seed ?? 41), k = o.k ?? 1, r = o.r, C = o.c;
  for (let i = 0; i < Math.round(2500 * k); i++) { const a = R() * TAU; s.add(C[0] + Math.cos(a) * r, C[1], C[2] + Math.sin(a) * r * 0.9, 0.7, 1, PART.CROWN, o.sin); }
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * TAU, h = r * (i % 2 ? 0.28 : 0.5), b = [C[0] + Math.cos(a) * r, C[1], C[2] + Math.sin(a) * r * 0.9];
    for (let j = 0; j < Math.round(300 * k); j++) { const u = Math.pow(R(), 0.6), w = 0.03 * r * (1 - u); s.add(b[0] + (R() - 0.5) * w, b[1] + u * h, b[2] + (R() - 0.5) * w, u > 0.9 ? 2.0 : 1.0, 1, PART.CROWN, o.sin); }
  }
  return s;
}
