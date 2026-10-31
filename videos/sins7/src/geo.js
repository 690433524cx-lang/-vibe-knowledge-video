// 点云资产生成：人脸（MediaPipe 标准人脸模型 + 补全的后脑与脖子）、裂纹、王冠、光环、胸像、人形、山、钟形曲线……
// 全部在启动时用固定种子生成一次。
import { rng, TAU, clamp, lerp, hash } from './util.js';

// ------------------------------------------------------------ 点云缓冲
// 每个点：position、aNormal、aSeed、aFrom(vec3)、aExtra(vec4)、aMisc(vec2)
// aExtra 默认 (order, crackId, crackS, crackDist=1)；aMisc = (亮度倍数, 标记)
export class PB {
  constructor() { this.p = []; this.n = []; this.s = []; this.f = []; this.e = []; this.m = []; this.x = {}; }
  get count() { return this.s.length; }
  add(p, n = [0, 0, 0], seed = 0, from = [0, 0, 0], extra = [0, 0, 0, 1], misc = [1, 0]) {
    this.p.push(p[0], p[1], p[2]); this.n.push(n[0], n[1], n[2]); this.s.push(seed);
    this.f.push(from[0], from[1], from[2]); this.e.push(extra[0], extra[1], extra[2], extra[3]); this.m.push(misc[0], misc[1]);
  }
  append(o) { this.p.push(...o.p); this.n.push(...o.n); this.s.push(...o.s); this.f.push(...o.f); this.e.push(...o.e); this.m.push(...o.m); }
  pos(i) { return [this.p[i * 3], this.p[i * 3 + 1], this.p[i * 3 + 2]]; }
  nor(i) { return [this.n[i * 3], this.n[i * 3 + 1], this.n[i * 3 + 2]]; }
  geometry(THREE) {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(this.p, 3));
    g.setAttribute('aNormal', new THREE.Float32BufferAttribute(this.n, 3));
    g.setAttribute('aSeed', new THREE.Float32BufferAttribute(this.s, 1));
    g.setAttribute('aFrom', new THREE.Float32BufferAttribute(this.f, 3));
    g.setAttribute('aExtra', new THREE.Float32BufferAttribute(this.e, 4));
    g.setAttribute('aMisc', new THREE.Float32BufferAttribute(this.m, 2));
    for (const [name, [size, arr]] of Object.entries(this.x)) g.setAttribute(name, new THREE.Float32BufferAttribute(arr, size));
    g.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 1e4);
    return g;
  }
  // 抽取子集（用于七张脸的轻量版本）
  subset(keep) {
    const o = new PB();
    for (let i = 0; i < this.count; i++) {
      if (!keep(i)) continue;
      o.p.push(this.p[i * 3], this.p[i * 3 + 1], this.p[i * 3 + 2]); o.n.push(this.n[i * 3], this.n[i * 3 + 1], this.n[i * 3 + 2]);
      o.s.push(this.s[i]); o.f.push(this.f[i * 3], this.f[i * 3 + 1], this.f[i * 3 + 2]);
      o.e.push(this.e[i * 4], this.e[i * 4 + 1], this.e[i * 4 + 2], this.e[i * 4 + 3]); o.m.push(this.m[i * 2], this.m[i * 2 + 1]);
    }
    return o;
  }
}

const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const addv = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
const mul = (a, k) => [a[0] * k, a[1] * k, a[2] * k];
const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const len = a => Math.hypot(a[0], a[1], a[2]);
const norm = a => { const l = len(a) || 1; return [a[0] / l, a[1] / l, a[2] / l]; };
export const V3 = { sub, addv, mul, dot, cross, len, norm };

// 空间网格：最近点查询
class Grid {
  constructor(pts, cell) {
    this.cell = cell; this.map = new Map(); this.pts = pts;
    pts.forEach((p, i) => { const k = this.key(p); let a = this.map.get(k); if (!a) this.map.set(k, a = []); a.push(i); });
  }
  key(p) { return `${Math.floor(p[0] / this.cell)},${Math.floor(p[1] / this.cell)},${Math.floor(p[2] / this.cell)}`; }
  nearest(p, r = 2) {
    const cx = Math.floor(p[0] / this.cell), cy = Math.floor(p[1] / this.cell), cz = Math.floor(p[2] / this.cell);
    let best = -1, bd = Infinity;
    for (let x = cx - r; x <= cx + r; x++) for (let y = cy - r; y <= cy + r; y++) for (let z = cz - r; z <= cz + r; z++) {
      const a = this.map.get(`${x},${y},${z}`); if (!a) continue;
      for (const i of a) { const q = this.pts[i]; const d = (q[0] - p[0]) ** 2 + (q[1] - p[1]) ** 2 + (q[2] - p[2]) ** 2; if (d < bd) { bd = d; best = i; } }
    }
    return { i: best, d: Math.sqrt(bd) };
  }
}

// ============================================================ 人脸
const S = 1 / 16; // 模型单位（厘米）→ 世界单位：脸宽约 0.97
export const FACE = {
  eyeL: [3.177 * S, 2.63 * S, 3.86 * S],   // 画面右侧的眼睛
  eyeR: [-3.177 * S, 2.63 * S, 3.86 * S],
  mouth: [0, -4.27 * S, 5.3 * S],
  top: 0.72, chin: -9.4 * S,
};
// MediaPipe 关键点索引：眼眶、嘴唇、眉毛、鼻梁
const LM = {
  eyeR: [33, 7, 163, 144, 145, 153, 154, 155, 133, 173, 157, 158, 159, 160, 161, 246, 33],
  eyeL: [263, 249, 390, 373, 374, 380, 381, 382, 362, 398, 384, 385, 386, 387, 388, 466, 263],
  lipsOut: [61, 146, 91, 181, 84, 17, 314, 405, 321, 375, 291, 409, 270, 269, 267, 0, 37, 39, 40, 185, 61],
  lipsIn: [78, 95, 88, 178, 87, 14, 317, 402, 318, 324, 308, 415, 310, 311, 312, 13, 82, 81, 80, 191, 78],
  browR: [46, 53, 52, 65, 55, 107, 66, 105, 63, 70, 46],
  browL: [276, 283, 282, 295, 285, 336, 296, 334, 293, 300, 276],
  nose: [168, 6, 197, 195, 5, 4, 1, 19, 94, 2],
  nostril: [98, 97, 2, 326, 327],
  jaw: [127, 234, 93, 132, 58, 172, 136, 150, 149, 176, 148, 152, 377, 400, 378, 379, 365, 397, 288, 361, 323, 454, 356],
};
// 闭眼时上下眼睑合成的一条弧线
const LID = { R: [[33, 33], [246, 7], [161, 163], [160, 144], [159, 145], [158, 153], [157, 154], [173, 155], [133, 133]],
  L: [[263, 263], [466, 249], [388, 390], [387, 373], [386, 374], [385, 380], [384, 381], [398, 382], [362, 362]] };

export function parseOBJ(text) {
  const V = [], F = [];
  for (const line of text.split('\n')) {
    const p = line.trim().split(/\s+/);
    if (p[0] === 'v') V.push([+p[1] * S, +p[2] * S, +p[3] * S]);
    else if (p[0] === 'f') F.push(p.slice(1, 4).map(x => parseInt(x.split('/')[0], 10) - 1));
  }
  // 统一朝外的面法线（鼻尖处法线应朝 +z）
  const fn = F.map(f => cross(sub(V[f[1]], V[f[0]]), sub(V[f[2]], V[f[0]])));
  let zs = 0; F.forEach((f, i) => { if (f.includes(4) || f.includes(1)) zs += fn[i][2]; });
  if (zs < 0) { F.forEach(f => { const t = f[1]; f[1] = f[2]; f[2] = t; }); fn.forEach((n, i) => fn[i] = mul(n, -1)); }
  const vn = V.map(() => [0, 0, 0]);
  F.forEach((f, i) => f.forEach(v => { vn[v] = addv(vn[v], fn[i]); }));
  return { V, F, VN: vn.map(norm), FN: fn };
}

function polyline(pts, spacing) {
  const out = [];
  for (let i = 0; i < pts.length - 1; i++) {
    const a = pts[i], b = pts[i + 1], l = len(sub(b, a)), n = Math.max(1, Math.round(l / spacing));
    for (let k = 0; k < n; k++) out.push([lerp(a[0], b[0], k / n), lerp(a[1], b[1], k / n), lerp(a[2], b[2], k / n), i + k / n]);
  }
  return out;
}

// 完整人头点云：正脸采样 + 五官加密 + 五官轮廓线 + 后脑椭球 + 脖子
export function buildHead(obj, opts = {}) {
  const R = rng(opts.seed ?? 7);
  const { V, F, VN } = obj;
  const pb = new PB();
  const area = F.map(f => len(cross(sub(V[f[1]], V[f[0]]), sub(V[f[2]], V[f[0]]))) / 2);
  const sampleTri = (fi) => {
    const f = F[fi]; let u = R(), v = R(); if (u + v > 1) { u = 1 - u; v = 1 - v; } const w = 1 - u - v;
    const p = addv(addv(mul(V[f[0]], w), mul(V[f[1]], u)), mul(V[f[2]], v));
    const n = norm(addv(addv(mul(VN[f[0]], w), mul(VN[f[1]], u)), mul(VN[f[2]], v)));
    return [p, n];
  };
  const pickBy = (weights) => {
    const cum = []; let s = 0; for (const w of weights) { s += w; cum.push(s); }
    return () => { const r = R() * s; let lo = 0, hi = cum.length - 1; while (lo < hi) { const m = (lo + hi) >> 1; if (cum[m] < r) lo = m + 1; else hi = m; } return lo; };
  };
  const nFace = opts.face ?? 85000;
  const pickArea = pickBy(area);
  for (let i = 0; i < nFace; i++) { const [p, n] = sampleTri(pickArea()); pb.add(p, n, R(), [0, 0, 0], [R(), 0, 0, 1], [1, 0]); }
  // 五官加密：眼眶、鼻梁、嘴唇、眉骨
  const centers = [
    [FACE.eyeL, 1.9 * S, 1500], [FACE.eyeR, 1.9 * S, 1500],
    [[0, 2.0 * S, 6.0 * S], 1.6 * S, 700], [[0, -0.6 * S, 7.3 * S], 1.7 * S, 900],
    [FACE.mouth, 2.6 * S, 1800],
    [[3.9 * S, 4.9 * S, 4.4 * S], 1.8 * S, 1000], [[-3.9 * S, 4.9 * S, 4.4 * S], 1.8 * S, 1000],
  ];
  for (const [c, r, n] of centers) {
    const w = F.map((f, i) => { const cen = mul(addv(addv(V[f[0]], V[f[1]]), V[f[2]]), 1 / 3); return len(sub(cen, c)) < r ? area[i] : 0; });
    const pick = pickBy(w);
    for (let i = 0; i < n; i++) { const [p, nn] = sampleTri(pick()); pb.add(p, nn, R(), [0, 0, 0], [R(), 0, 0, 1], [1.05, 0]); }
  }
  // 五官轮廓线：沿关键点折线密集取点，让轮廓清楚（标记 3=常亮轮廓，1=闭眼线，2=睁眼轮廓）
  const line = (idx, bright, flag, spacing = 0.0022, jit = 0.0012) => {
    const pts = idx.map(i => addv(V[i], mul(VN[i], 0.002)));
    for (const q of polyline(pts, spacing)) {
      const i0 = idx[Math.floor(q[3])], i1 = idx[Math.min(idx.length - 1, Math.floor(q[3]) + 1)];
      const n = norm(addv(VN[i0], VN[i1]));
      for (let k = 0; k < 2; k++) pb.add([q[0] + (R() - 0.5) * jit, q[1] + (R() - 0.5) * jit, q[2] + (R() - 0.5) * jit], n, R(), [0, 0, 0], [R(), 0, 0, 1], [bright, flag]);
    }
  };
  line(LM.eyeR, 1.6, 2); line(LM.eyeL, 1.6, 2);
  line(LM.lipsOut, 1.45, 3); line(LM.lipsIn, 1.6, 3, 0.002);
  line(LM.browR, 1.25, 3, 0.003); line(LM.browL, 1.25, 3, 0.003);
  line(LM.nose, 1.2, 3, 0.003); line(LM.nostril, 1.3, 3, 0.0025);
  line(LM.jaw, 0.9, 3, 0.004, 0.003);
  for (const side of ['R', 'L']) {
    const pts = LID[side].map(([a, b]) => { const m = mul(addv(V[a], V[b]), 0.5); const d = mul(sub(V[b], V[a]), 0.15); return addv(addv(m, d), mul(norm(addv(VN[a], VN[b])), 0.004)); });
    const q = polyline(pts, 0.0018);
    for (const p of q) for (let k = 0; k < 3; k++) pb.add([p[0] + (R() - 0.5) * 0.0015, p[1] + (R() - 0.5) * 0.0015, p[2]], [0, 0, 1], R(), [0, 0, 0], [R(), 0, 0, 1], [1.8, 1]);
  }
  const faceCount = pb.count;
  // 正脸高度图：用来判断后脑椭球上的点是否被脸挡住
  const G = 0.02, hm = new Map();
  F.forEach(f => {
    const a = V[f[0]], b = V[f[1]], c = V[f[2]];
    for (let k = 0; k < 30; k++) {
      let u = k / 30 * 0.999, v = hash(k * 7.1 + f[0]) * (1 - u); const w = 1 - u - v;
      const p = addv(addv(mul(a, w), mul(b, u)), mul(c, v));
      const key = `${Math.floor(p[0] / G)},${Math.floor(p[1] / G)}`;
      hm.set(key, Math.max(hm.get(key) ?? -9, p[2]));
    }
    for (const p of [a, b, c]) { const key = `${Math.floor(p[0] / G)},${Math.floor(p[1] / G)}`; hm.set(key, Math.max(hm.get(key) ?? -9, p[2])); }
  });
  const faceZ = (x, y) => {
    let z = null;
    for (let dx = -1; dx <= 1; dx++) for (let dy = -1; dy <= 1; dy++) { const v = hm.get(`${Math.floor(x / G) + dx},${Math.floor(y / G) + dy}`); if (v != null) z = z == null ? v : Math.max(z, v); }
    return z;
  };
  // 后脑：变形椭球
  const C = [0, 1.0 * S, -1.6 * S], RX = 8.0 * S, RY = 10.4 * S, RZ = 9.8 * S;
  let nBack = 0, guard = 0;
  while (nBack < (opts.back ?? 15000) && guard++ < 400000) {
    let x = R() * 2 - 1, y = R() * 2 - 1, z = R() * 2 - 1; const l = Math.hypot(x, y, z); if (l > 1 || l < 0.1) continue;
    x /= l; y /= l; z /= l;
    const p = [C[0] + x * RX * (1 - 0.08 * Math.max(0, -y)), C[1] + y * RY, C[2] + z * RZ];
    if (p[1] < -5.6 * S) continue;
    const fz = faceZ(p[0], p[1]);
    if (fz != null && p[2] > fz - 2.0 * S) continue;
    if (fz == null && p[2] > 3.4 * S && p[1] < 6 * S) continue;
    const n = norm([x / RX, y / RY, z / RZ]);
    pb.add(p, n, R(), [0, 0, 0], [R(), 0, 0, 1], [0.95, 4]); nBack++;
  }
  // 脖子
  for (let i = 0; i < (opts.neck ?? 4000); i++) {
    const a = R() * TAU, y = lerp(-5.0, -16.5, Math.pow(R(), 0.8)) * S;
    const rx = 3.7 * S, rz = 3.5 * S, cz = -0.9 * S;
    const p = [Math.cos(a) * rx, y, cz + Math.sin(a) * rz];
    const fz = faceZ(p[0], p[1]); if (fz != null && p[2] > fz - 1.2 * S) continue;
    const fade = clamp((y + 16.5 * S) / (5 * S));
    pb.add(p, norm([Math.cos(a), 0, Math.sin(a)]), R(), [0, 0, 0], [R(), 0, 0, 1], [0.85 * fade, 4]);
  }
  return { pb, faceCount };
}

// ------------------------------------------------------------ 裂纹（贴着脸表面的带分叉随机游走）
export function buildCracks(headPB, faceCount, seed = 11) {
  const R = rng(seed);
  const surf = [], snor = [];
  for (let i = 0; i < faceCount; i += 2) { surf.push(headPB.pos(i)); snor.push(headPB.nor(i)); }
  const grid = new Grid(surf, 0.02);
  const snap = (p) => { const r = grid.nearest(p, 2); if (r.i < 0) return null; return { p: addv(surf[r.i], mul(snor[r.i], 0.005)), n: snor[r.i] }; };
  const lines = []; // { pts:[[x,y,z]], parent, s0, t0, dur, width }
  const walk = (start, dir0, length, jitter) => {
    const pts = [start]; let p = start, d = norm(dir0); const step = 0.011;
    const n = Math.round(length / step);
    for (let i = 0; i < n; i++) {
      const sp = snap(p); if (!sp) break;
      // 在切平面内旋转方向：锯齿状的闪电折线
      const t1 = norm(sub(d, mul(sp.n, dot(d, sp.n)))), t2 = cross(sp.n, t1);
      const ang = (R() - 0.5) * jitter + (i % 2 ? 0.25 : -0.25) * jitter;
      d = norm(addv(mul(t1, Math.cos(ang)), mul(t2, Math.sin(ang))));
      d = norm(addv(mul(d, 0.7), mul(norm(dir0), 0.3)));
      const q = snap(addv(p, mul(d, step * (0.7 + R() * 0.6)))); if (!q) break;
      p = q.p; pts.push(p);
    }
    return pts;
  };
  // 每只眼 4 条主裂纹
  const mains = [];
  for (const [eye, sx] of [[FACE.eyeL, 1], [FACE.eyeR, -1]]) {
    const angs = [72, 18, -38, -105];
    angs.forEach((a, k) => {
      const ar = a * Math.PI / 180;
      const dir = [sx * Math.cos(ar), Math.sin(ar), 0];
      const start = addv(eye, [sx * Math.cos(ar) * 0.06, Math.sin(ar) * 0.032, 0.004]);
      const L = (0.3 + 0.3 * R()) * 0.97;
      mains.push({ pts: walk(start, dir, L, 1.6), width: 1.6, order: k * 2 + (sx > 0 ? 0 : 1) });
    });
  }
  mains.sort((a, b) => a.order - b.order);
  mains.forEach((m, k) => {
    m.t0 = 9.0 + k * 0.24; m.dur = 0.4 + 0.5 * R(); m.parent = -1; lines.push(m);
    const nb = 1 + Math.floor(R() * 3);
    for (let b = 0; b < nb; b++) {
      const s0 = 0.3 + 0.45 * R(), idx = Math.floor(s0 * (m.pts.length - 1));
      const a = m.pts[Math.max(0, idx - 1)], c = m.pts[Math.min(m.pts.length - 1, idx + 1)];
      const d = norm(sub(c, a)), sp = snap(m.pts[idx]); if (!sp) continue;
      const side = cross(sp.n, d), ang = (R() < 0.5 ? -1 : 1) * (0.5 + 0.4 * R());
      const bd = addv(mul(d, Math.cos(ang)), mul(side, Math.sin(ang)));
      const pts = walk(m.pts[idx], bd, len(sub(m.pts[m.pts.length - 1], m.pts[0])) * (0.3 + 0.25 * R()), 1.8);
      if (pts.length < 4) continue;
      lines.push({ pts, width: 0.9, parent: k, s0, t0: m.t0 + s0 * m.dur, dur: 0.25 + 0.3 * R() });
    }
  });
  return { lines, grid };
}

// 折线集合 → 发光线条点云（aExtra = (s, lineId, width, 0)）
export function linesToPB(lines, spacing = 0.0022, seed = 3, thick = 0.0015) {
  const R = rng(seed), pb = new PB();
  lines.forEach((L, id) => {
    let total = 0; const seg = [];
    for (let i = 0; i < L.pts.length - 1; i++) { const l = len(sub(L.pts[i + 1], L.pts[i])); seg.push(l); total += l; }
    let acc = 0;
    for (let i = 0; i < L.pts.length - 1; i++) {
      const a = L.pts[i], b = L.pts[i + 1], n = Math.max(1, Math.round(seg[i] / spacing));
      for (let k = 0; k < n; k++) {
        const f = k / n, s = (acc + seg[i] * f) / total;
        const w = (L.width ?? 1) * (0.55 + 0.45 * Math.sin(Math.PI * Math.min(1, s * 1.6 + 0.15)));
        const p = [lerp(a[0], b[0], f) + (R() - 0.5) * thick * w, lerp(a[1], b[1], f) + (R() - 0.5) * thick * w, lerp(a[2], b[2], f) + (R() - 0.5) * thick * w];
        pb.add(p, [0, 0, 0], R(), [0, 0, 0], [s, id, w, 0], [1, 0]);
      }
      acc += seg[i];
    }
  });
  return pb;
}

// 给人头的每个点标上最近的裂纹点（染色用）
export function tagCrackProximity(headPB, crackPB, radius = 0.045) {
  const pts = []; for (let i = 0; i < crackPB.count; i++) pts.push(crackPB.pos(i));
  const g = new Grid(pts, radius);
  for (let i = 0; i < headPB.count; i++) {
    const r = g.nearest(headPB.pos(i), 1);
    if (r.i >= 0 && r.d < radius && crackPB.e[r.i * 4] > 0.12) {
      headPB.e[i * 4 + 1] = crackPB.e[r.i * 4 + 1];
      headPB.e[i * 4 + 2] = crackPB.e[r.i * 4];
      headPB.e[i * 4 + 3] = r.d / radius;
    }
  }
}

// ------------------------------------------------------------ 王冠：7 根尖刺 + 冠环 + 宝石
export const CROWN = { y: 0.56, cz: -0.08, rx: 0.40, rz: 0.47 };
export function buildCrown(seed = 21, scale = 1) {
  const R = rng(seed), pb = new PB(), gems = [];
  const H = [0.2, 0.28, 0.37, 0.5, 0.37, 0.28, 0.2];
  const ring = (a) => [Math.sin(a) * CROWN.rx * scale, CROWN.y * scale, CROWN.cz * scale + Math.cos(a) * CROWN.rz * scale];
  // 冠环（两条细带 + 中间填充）
  for (let i = 0; i < 3200; i++) {
    const a = (R() * 2 - 1) * Math.PI, h = (R() < 0.35 ? (R() < 0.5 ? 0 : 1) : R()) * 0.06 * scale;
    const p = addv(ring(a), [0, h - 0.03 * scale, 0]);
    const n = norm([Math.sin(a), 0, Math.cos(a)]);
    pb.add(p, n, R(), [0, 0, 0], [0, 7, 0, 1], [h < 0.004 || h > 0.056 * scale ? 1.5 : 1.0, 5]);
  }
  // 7 根尖刺（锥体），aExtra.x = 高度比例（生长用），aExtra.y = 第几根
  for (let k = 0; k < 7; k++) {
    const a = (k - 3) * 26 * Math.PI / 180, base = ring(a), out = norm([Math.sin(a), 0, Math.cos(a)]);
    const hgt = H[k] * scale, r0 = 0.048 * scale;
    gems.push(addv(base, mul(out, 0.012 * scale)));
    for (let i = 0; i < 1500; i++) {
      const h = Math.pow(R(), 0.8), th = R() * TAU, r = r0 * (1 - h) * (0.85 + 0.15 * R());
      const tilt = mul(out, 0.08 * h * hgt);
      const side = norm(cross([0, 1, 0], out));
      const p = addv(addv(base, [0, h * hgt, 0]), addv(tilt, addv(mul(side, Math.cos(th) * r), mul(out, Math.sin(th) * r))));
      const n = norm(addv(mul(side, Math.cos(th)), mul(out, Math.sin(th))));
      pb.add(p, n, R(), [0, 0, 0], [h, k, 0, 1], [h > 0.9 ? 1.6 : 1.0, 6]);
    }
    // 尖端亮点
    gems.push(null);
  }
  return { pb, gems: gems.filter(Boolean), H };
}

// ------------------------------------------------------------ 光环
export function buildHalo(seed = 31, R0 = 1.1) {
  const R = rng(seed), pb = new PB();
  for (let i = 0; i < 8000; i++) {
    const a = R() * TAU, r = R0 + (R() + R() + R() - 1.5) * 0.025;
    pb.add([Math.cos(a) * r, Math.sin(a) * r, (R() - 0.5) * 0.02], [0, 0, 0], R(), [0, 0, 0], [a / TAU, 0, 0, 1], [1, 0]);
  }
  for (let i = 0; i < 2500; i++) {
    const a = R() * TAU, r = R0 * 1.18 + (R() - 0.5) * 0.08;
    pb.add([Math.cos(a) * r, Math.sin(a) * r, -0.02], [0, 0, 0], R(), [0, 0, 0], [a / TAU, 0, 0, 1], [0.35, 1]);
  }
  return pb;
}

// ------------------------------------------------------------ 胸像：肩膀、上身、领饰、吊坠
export function buildBust(seed = 41) {
  const R = rng(seed), pb = new PB();
  const W = y => { const k = clamp((-0.86 - y) / 0.42); return lerp(0.27, 1.36, Math.sqrt(k)) * (1 - 0.06 * clamp((-1.6 - y) / 0.8)); };
  const D = y => { const k = clamp((-0.86 - y) / 0.5); return lerp(0.25, 0.52, Math.sqrt(k)); };
  let n = 0;
  while (n < 25000) {
    const y = lerp(-0.86, -2.45, R());
    const a = (R() * 2 - 1) * Math.PI * 0.62; // 前半身为主
    const w = W(y), d = D(y);
    const sh = Math.max(0, Math.abs(Math.sin(a)) - 0.55) * 0.35 * clamp((-0.9 - y) / 0.3);
    const p = [Math.sin(a) * w, y + sh * 0.2, -0.08 + Math.cos(a) * d];
    const nn = norm([Math.sin(a) / w, 0.25, Math.cos(a) / d]);
    const fade = clamp((y + 2.45) / 0.55);
    // 组装：从画面四周飞来；越靠下越早
    const fa = R() * TAU, fr = 3 + R() * 2.5;
    const from = [Math.cos(fa) * fr, (R() - 0.3) * 4, Math.sin(fa) * fr * 0.6 + 1.0];
    pb.add(p, nn, R(), from, [clamp((-y - 0.86) / 1.6) * -1 + 1, 0, 0, 1], [0.85 * fade, 8]); n++;
  }
  // 领饰：一圈尖角纹样
  for (let i = 0; i < 5000; i++) {
    const u = R(), a = lerp(-1.25, 1.25, u);
    const teeth = 13, ph = fract2(u * teeth), tooth = 1 - Math.abs(ph * 2 - 1);
    const drop = R() * tooth * 0.16;
    const y = -1.02 - Math.cos(a) * 0.18 - drop;
    const w = W(y) * 0.98, d = D(y) + 0.03;
    const p = [Math.sin(a) * w * 0.62, y, -0.08 + Math.cos(a) * d];
    const fa = R() * TAU, fr = 3.5 + R() * 2;
    pb.add(p, norm([Math.sin(a), 0.2, Math.cos(a)]), R(), [Math.cos(fa) * fr, (R() - 0.2) * 4, Math.sin(fa) * fr * 0.6 + 1], [0.45 + 0.1 * R(), 0, 0, 1], [drop < 0.004 || drop > tooth * 0.15 ? 1.9 : 1.3, 9]);
  }
  // 吊坠
  for (let i = 0; i < 700; i++) {
    const a = R() * TAU, r = 0.045 * Math.sqrt(R());
    const p = [Math.cos(a) * r, -1.42 + Math.sin(a) * r * 1.3, 0.47];
    pb.add(p, [0, 0, 1], R(), [(R() - 0.5) * 6, -3, 2], [0.4, 0, 0, 1], [2.2, 9]);
  }
  return pb;
}
function fract2(x) { return x - Math.floor(x); }

// ------------------------------------------------------------ 基本形体采样
export function capsule(pb, R, a, b, r, n, misc = [1, 0], extraFn = null) {
  const ab = sub(b, a), L = len(ab), d = norm(ab);
  const t1 = norm(Math.abs(d[1]) < 0.9 ? cross(d, [0, 1, 0]) : cross(d, [1, 0, 0])), t2 = cross(d, t1);
  for (let i = 0; i < n; i++) {
    const s = R(), th = R() * TAU;
    const cap = s < 0.12 ? -1 : s > 0.88 ? 1 : 0;
    let p, nn;
    if (cap === 0) {
      const u = (s - 0.12) / 0.76;
      nn = addv(mul(t1, Math.cos(th)), mul(t2, Math.sin(th)));
      p = addv(addv(a, mul(ab, u)), mul(nn, r));
    } else {
      let x = R() * 2 - 1, y = R() * 2 - 1, z = R() * 2 - 1; const l = Math.hypot(x, y, z) || 1; nn = [x / l, y / l, z / l];
      if (dot(nn, d) * cap < 0) nn = sub(nn, mul(d, 2 * dot(nn, d)));
      p = addv(cap < 0 ? a : b, mul(nn, r));
    }
    pb.add(p, nn, R(), [0, 0, 0], extraFn ? extraFn(p) : [0, 0, 0, 1], misc);
  }
}
export function ellipsoid(pb, R, c, rx, ry, rz, n, misc = [1, 0], noise = 0) {
  for (let i = 0; i < n; i++) {
    let x = R() * 2 - 1, y = R() * 2 - 1, z = R() * 2 - 1; const l = Math.hypot(x, y, z); if (l > 1 || l < 0.05) { i--; continue; }
    x /= l; y /= l; z /= l;
    const k = 1 + noise * (Math.sin(x * 7 + y * 3) * 0.5 + Math.sin(z * 9 - x * 4) * 0.3 + (R() - 0.5) * 0.4);
    pb.add([c[0] + x * rx * k, c[1] + y * ry * k, c[2] + z * rz * k], norm([x / rx, y / ry, z / rz]), R(), [0, 0, 0], [0, 0, 0, 1], misc);
  }
}

// 站立的人形（约 1.75 高，脚在原点）
export function buildStander(seed, n = 3200) {
  const R = rng(seed), pb = new PB(), k = n / 3200;
  ellipsoid(pb, R, [0, 1.6, 0], 0.11, 0.135, 0.12, Math.round(520 * k), [1.25, 0]);
  capsule(pb, R, [0, 1.47, 0], [0, 1.4, 0], 0.05, Math.round(60 * k));
  ellipsoid(pb, R, [0, 1.18, 0], 0.2, 0.27, 0.11, Math.round(900 * k));
  for (const sx of [-1, 1]) {
    capsule(pb, R, [0.2 * sx, 1.38, 0], [0.25 * sx, 1.05, 0.02], 0.048, Math.round(220 * k));
    capsule(pb, R, [0.25 * sx, 1.05, 0.02], [0.27 * sx, 0.78, 0.06], 0.042, Math.round(180 * k));
    capsule(pb, R, [0.1 * sx, 0.92, 0], [0.11 * sx, 0.48, 0.01], 0.07, Math.round(320 * k));
    capsule(pb, R, [0.11 * sx, 0.48, 0.01], [0.11 * sx, 0.06, 0], 0.055, Math.round(260 * k));
  }
  return pb;
}
// 弯腰的人：身体（不含腿）、左右腿（以髋为原点）、巨石
export function buildBentParts(seed, k = 1) {
  const R = rng(seed), N = n => Math.round(n * k);
  const body = new PB();
  capsule(body, R, [-0.28, 0.86, 0], [0.3, 0.9, 0], 0.17, N(1100), [1, 0]);            // 弯成水平的躯干
  capsule(body, R, [0.34, 0.84, 0], [0.48, 0.5, 0], 0.06, N(160));                     // 低垂的脖子
  ellipsoid(body, R, [0.53, 0.38, 0], 0.1, 0.115, 0.1, N(420), [1.3, 0]);              // 头几乎贴着地面
  capsule(body, R, [0.3, 0.86, 0.13], [0.16, 0.5, 0.14], 0.045, N(220));               // 撑着膝盖的手
  capsule(body, R, [0.3, 0.92, -0.13], [0.06, 1.18, -0.13], 0.042, N(160));            // 扶着石头的手
  const leg = new PB();
  capsule(leg, R, [0, 0, 0], [0.12, -0.42, 0], 0.07, N(260));
  capsule(leg, R, [0.12, -0.42, 0], [0.06, -0.84, 0], 0.055, N(220));
  capsule(leg, R, [0.06, -0.84, 0], [0.18, -0.86, 0], 0.04, N(60));
  const rock = new PB();
  for (let i = 0; i < N(2600); i++) {
    let x = R() * 2 - 1, y = R() * 2 - 1, z = R() * 2 - 1; const l = Math.hypot(x, y, z); if (l > 1 || l < 0.05) { i--; continue; }
    x /= l; y /= l; z /= l;
    const kk = 1 + 0.16 * (Math.sin(x * 5 + 1) * Math.cos(y * 4) + Math.sin(z * 6 + x * 2) * 0.6) + (R() - 0.5) * 0.04;
    const crack = Math.abs(Math.sin(x * 9 + y * 4) * Math.cos(z * 7 - y * 3)) < 0.025 ? 1 : 0;
    rock.add([x * 0.52 * kk, y * 0.42 * kk, z * 0.45 * kk], [x, y, z], R(), [0, 0, 0], [0, 0, 0, 1], [crack ? 1.8 : 0.8, crack ? 11 : 10]);
  }
  return { body, leg, rock };
}
// 很小的粒子人形
export function buildTiny(R, pb, base, h, n, misc = [1, 0]) {
  ellipsoid(pb, R, [base[0], base[1] + h * 0.88, base[2]], h * 0.09, h * 0.1, h * 0.09, Math.round(n * 0.3), misc);
  capsule(pb, R, [base[0], base[1] + h * 0.72, base[2]], [base[0], base[1] + h * 0.12, base[2]], h * 0.11, Math.round(n * 0.7), misc);
}
