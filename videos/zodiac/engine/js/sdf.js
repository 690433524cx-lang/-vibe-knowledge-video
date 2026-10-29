// 有符号距离场（SDF）：把配置里的基本形状组合成神兽，再在表面附近采样粒子。
// 配置格式（creature.sdf）：
//   { blend, parts: [{ name, delay:[a,b], tf:{p,r}, k, prims:[{ t, op, k, tag, mirror, ... }] }] }
// 形状 t：ell（椭球 c r rot）、sph（球 c r）、cap（圆锥胶囊 a b r 或 r:[r1,r2]）、
//        chain（连续胶囊 pts:[[x,y,z,r]...]）、helix（螺旋管 c rot turns R:[r0,r1] h tube:[a,b] n）、
//        tor（圆环 c rot R r 或 r:[r1,r2]，arc:[a0,a1]）、box（圆角盒 c s rad rot）、cone（尖锥 a b r）
// 运算 op：add（光滑并集，默认）、sub（光滑差集）、int（光滑交集）
import { D2R, rng, clamp, lerp } from './util.js';

// ------------------------------------------------------------ 小型向量工具
const len3 = (x, y, z) => Math.sqrt(x * x + y * y + z * z);
export function eulerMat(r = [0, 0, 0]) { // 先绕 X，再 Y，再 Z（与 three.js 'XYZ' 相同），返回行主序 3×3
  const [a, b, c] = r.map(v => v * D2R);
  const ca = Math.cos(a), sa = Math.sin(a), cb = Math.cos(b), sb = Math.sin(b), cc = Math.cos(c), sc = Math.sin(c);
  return [
    cb * cc, -cb * sc, sb,
    ca * sc + sa * sb * cc, ca * cc - sa * sb * sc, -sa * cb,
    sa * sc - ca * sb * cc, sa * cc + ca * sb * sc, ca * cb,
  ];
}
export const mulM = (m, v) => [m[0] * v[0] + m[1] * v[1] + m[2] * v[2], m[3] * v[0] + m[4] * v[1] + m[5] * v[2], m[6] * v[0] + m[7] * v[1] + m[8] * v[2]];
const mulMT = (m, x, y, z) => [m[0] * x + m[3] * y + m[6] * z, m[1] * x + m[4] * y + m[7] * z, m[2] * x + m[5] * y + m[8] * z];

function smin(a, b, k) { if (k <= 0) return Math.min(a, b); const h = Math.max(k - Math.abs(a - b), 0) / k; return Math.min(a, b) - h * h * k * 0.25; }
function smax(a, b, k) { return -smin(-a, -b, k); }

// ------------------------------------------------------------ 基本形状
function sdRoundCone(px, py, pz, a, b, r1, r2) {
  const bax = b[0] - a[0], bay = b[1] - a[1], baz = b[2] - a[2];
  const l2 = bax * bax + bay * bay + baz * baz, rr = r1 - r2, a2 = l2 - rr * rr, il2 = 1 / l2;
  const pax = px - a[0], pay = py - a[1], paz = pz - a[2];
  const y = pax * bax + pay * bay + paz * baz, z = y - l2;
  const qx = pax * l2 - bax * y, qy = pay * l2 - bay * y, qz = paz * l2 - baz * y;
  const x2 = qx * qx + qy * qy + qz * qz, y2 = y * y * l2, z2 = z * z * l2;
  const k = Math.sign(rr) * rr * rr * x2;
  if (Math.sign(z) * a2 * z2 > k) return Math.sqrt(x2 + z2) * il2 - r2;
  if (Math.sign(y) * a2 * y2 < k) return Math.sqrt(x2 + y2) * il2 - r1;
  return (Math.sqrt(x2 * a2 * il2) + y * rr) * il2 - r1;
}
function mirrorPrim(p) {
  const q = JSON.parse(JSON.stringify(p)); delete q.mirror;
  const fx = v => (v ? [-v[0], v[1], v[2]] : v);
  if (q.c) q.c = fx(q.c); if (q.a) q.a = fx(q.a); if (q.b) q.b = fx(q.b);
  if (q.rot) q.rot = [q.rot[0], -q.rot[1], -q.rot[2]];
  if (q.pts) q.pts = q.pts.map(v => [-v[0], v[1], v[2], v[3]]);
  if (q.t === 'helix') q.flip = !q.flip;
  return q;
}
// 螺旋管 → 连续胶囊
function helixToChain(h) {
  const n = h.n ?? 24, M = eulerMat(h.rot), pts = [];
  const [R0, R1] = Array.isArray(h.R) ? h.R : [h.R, h.R];
  const [t0, t1] = Array.isArray(h.tube) ? h.tube : [h.tube, h.tube];
  const sgn = h.flip ? -1 : 1;
  for (let i = 0; i <= n; i++) {
    const u = i / n, ang = (h.phase ?? 0) * D2R + u * (h.turns ?? 1) * Math.PI * 2;
    const R = lerp(R0, R1, u);
    const loc = [sgn * R * Math.cos(ang), (h.h ?? 0) * u, R * Math.sin(ang)];
    const w = mulM(M, loc);
    pts.push([h.c[0] + sgn * 0 + w[0], h.c[1] + w[1], h.c[2] + w[2], lerp(t0, t1, u)]);
  }
  return { t: 'chain', pts, op: h.op, k: h.k, tag: h.tag, sk: h.sk ?? 0.02 };
}
function compilePrim(p) {
  if (p.t === 'helix') return compilePrim(helixToChain(p));
  const M = p.rot ? eulerMat(p.rot) : null;
  const c = p.c || [0, 0, 0];
  const loc = (x, y, z) => (M ? mulMT(M, x - c[0], y - c[1], z - c[2]) : [x - c[0], y - c[1], z - c[2]]);
  switch (p.t) {
    case 'ell': {
      const [a, b, cc] = p.r;
      return (x, y, z) => {
        const [lx, ly, lz] = loc(x, y, z);
        const k0 = len3(lx / a, ly / b, lz / cc), k1 = len3(lx / (a * a), ly / (b * b), lz / (cc * cc));
        return k1 < 1e-9 ? -Math.min(a, b, cc) : k0 * (k0 - 1) / k1;
      };
    }
    case 'sph': return (x, y, z) => len3(x - c[0], y - c[1], z - c[2]) - p.r;
    case 'cap': case 'cone': {
      const [r1, r2] = p.t === 'cone' ? [p.r, p.tip ?? 0.01] : Array.isArray(p.r) ? p.r : [p.r, p.r];
      return (x, y, z) => sdRoundCone(x, y, z, p.a, p.b, r1, r2);
    }
    case 'chain': {
      const segs = [];
      for (let i = 0; i < p.pts.length - 1; i++) segs.push([p.pts[i], p.pts[i + 1]]);
      const k = p.sk ?? 0.04;
      return (x, y, z) => {
        let d = 1e9;
        for (const [a, b] of segs) d = smin(d, sdRoundCone(x, y, z, a, b, a[3], b[3]), k);
        return d;
      };
    }
    case 'tor': {
      const [r1, r2] = Array.isArray(p.r) ? p.r : [p.r, p.r];
      const a0 = (p.arc ? p.arc[0] : 0) * D2R, a1 = (p.arc ? p.arc[1] : 360) * D2R, full = !p.arc;
      return (x, y, z) => {
        const [lx, ly, lz] = loc(x, y, z);
        let ang = Math.atan2(lz, lx); if (ang < a0) ang += Math.PI * 2;
        if (!full && ang > a1) {
          // 落在弧外：到较近端点的距离
          const e0 = [p.R * Math.cos(a0), 0, p.R * Math.sin(a0)], e1 = [p.R * Math.cos(a1), 0, p.R * Math.sin(a1)];
          return Math.min(len3(lx - e0[0], ly, lz - e0[2]) - r1, len3(lx - e1[0], ly, lz - e1[2]) - r2);
        }
        const u = full ? 0 : clamp((ang - a0) / (a1 - a0));
        const q = Math.hypot(lx, lz) - p.R;
        return Math.hypot(q, ly) - lerp(r1, r2, u);
      };
    }
    case 'box': {
      const [sx, sy, sz] = p.s, rad = p.rad ?? 0.05;
      return (x, y, z) => {
        const [lx, ly, lz] = loc(x, y, z);
        const qx = Math.abs(lx) - sx + rad, qy = Math.abs(ly) - sy + rad, qz = Math.abs(lz) - sz + rad;
        return len3(Math.max(qx, 0), Math.max(qy, 0), Math.max(qz, 0)) + Math.min(Math.max(qx, Math.max(qy, qz)), 0) - rad;
      };
    }
    default: throw new Error('未知形状 ' + p.t);
  }
}

// ------------------------------------------------------------ 编译整个造型
export function compileSDF(cfg) {
  const blend = cfg.blend ?? 0.2;
  const parts = cfg.parts.map((part, pi) => {
    const prims = [];
    for (const p of part.prims) { prims.push(p); if (p.mirror) prims.push(mirrorPrim(p)); }
    const M = part.tf?.r ? eulerMat(part.tf.r) : null, T = part.tf?.p || [0, 0, 0], SC = part.tf?.s ?? 1;
    const items = prims.map(p => ({ f: compilePrim(p), op: p.op || 'add', k: p.k ?? part.k ?? 0.15, tag: p.tag }));
    // 部件局部坐标（含整体缩放 tf.s）
    const local = (x, y, z) => { const l = M ? mulMT(M, x - T[0], y - T[1], z - T[2]) : [x - T[0], y - T[1], z - T[2]]; return SC === 1 ? l : [l[0] / SC, l[1] / SC, l[2] / SC]; };
    const f = (x, y, z) => {
      const [lx, ly, lz] = local(x, y, z);
      let d = 1e9;
      for (const it of items) {
        const di = it.f(lx, ly, lz);
        if (it.op === 'sub') d = smax(d, -di, it.k);
        else if (it.op === 'int') d = smax(d, di, it.k);
        else d = d >= 1e8 ? di : smin(d, di, it.k);
      }
      return d * SC;
    };
    // 带标签的差集（例如口腔）：用于给凹陷处的粒子上暗色
    const tagged = items.filter(it => it.tag).map(it => ({ tag: it.tag, f: (x, y, z) => { const l = local(x, y, z); return it.f(l[0], l[1], l[2]) * SC; } }));
    return { name: part.name, index: pi, f, k: part.k ?? blend, delay: part.delay || [0, 1], tagged, kind: part.kind };
  });
  const sdf = (x, y, z) => {
    let d = 1e9;
    for (const P of parts) { const di = P.f(x, y, z); d = d >= 1e8 ? di : smin(d, di, P.k); }
    return d;
  };
  return { sdf, parts };
}

export function grad(sdf, x, y, z, e = 0.004) {
  const gx = sdf(x + e, y, z) - sdf(x - e, y, z), gy = sdf(x, y + e, z) - sdf(x, y - e, z), gz = sdf(x, y, z + e) - sdf(x, y, z - e);
  const l = len3(gx, gy, gz) || 1;
  return [gx / l, gy / l, gz / l];
}

// 粗网格扫描出包围盒
export function bounds(sdf, ext = 5, step = 0.15) {
  const lo = [1e9, 1e9, 1e9], hi = [-1e9, -1e9, -1e9];
  for (let x = -ext; x <= ext; x += step) for (let y = -ext; y <= ext; y += step) for (let z = -ext; z <= ext; z += step) {
    if (sdf(x, y, z) < step) { lo[0] = Math.min(lo[0], x); lo[1] = Math.min(lo[1], y); lo[2] = Math.min(lo[2], z); hi[0] = Math.max(hi[0], x); hi[1] = Math.max(hi[1], y); hi[2] = Math.max(hi[2], z); }
  }
  return { lo: lo.map(v => v - 0.2), hi: hi.map(v => v + 0.2) };
}

// 在表面附近（距离 −0.02 到 0.01）均匀采样：先在薄带里拒绝采样，再沿梯度投影到表面
export function sampleSurface(sdf, box, n, rand, region = null, band = 0.07) {
  const out = [];
  const { lo, hi } = box;
  let tries = 0; const limit = n * 4000;
  while (out.length < n && tries < limit) {
    tries++;
    let x = lerp(lo[0], hi[0], rand()), y = lerp(lo[1], hi[1], rand()), z = lerp(lo[2], hi[2], rand());
    if (region && !region(x, y, z)) continue;
    let d = sdf(x, y, z);
    if (Math.abs(d) > band) continue;
    for (let it = 0; it < 3; it++) { const g = grad(sdf, x, y, z); x -= g[0] * d; y -= g[1] * d; z -= g[2] * d; d = sdf(x, y, z); }
    if (Math.abs(d) > 0.01) continue;
    const g = grad(sdf, x, y, z);
    const off = -0.02 + rand() * 0.03;
    out.push({ p: [x + g[0] * off, y + g[1] * off, z + g[2] * off], n: g });
  }
  return out;
}

// SDF 环境光遮蔽：凹处（眼窝、嘴角、鬃毛根部）自然变暗
export function ambientOcclusion(sdf, p, n) {
  let occ = 0, sca = 1;
  for (let i = 1; i <= 5; i++) {
    const h = 0.02 + 0.11 * i;
    const d = sdf(p[0] + n[0] * h, p[1] + n[1] * h, p[2] + n[2] * h);
    occ += (h - d) * sca; sca *= 0.75;
  }
  return clamp(1 - 1.6 * occ, 0.15, 1);
}

// 从 +z 方向往回打一条射线，找到表面（给胸口纹章定位）
export function rayToSurface(sdf, x, y, zStart = 5) {
  let z = zStart;
  for (let i = 0; i < 200; i++) { const d = sdf(x, y, z); if (d < 0.002) return z; z -= Math.max(d * 0.8, 0.005); if (z < -5) break; }
  return null;
}

// ------------------------------------------------------------ 毛束（鬃毛、长发、火焰、星河……）
// group: { count, root:{type:'ring'|'line'|'point'|'surface', ...}, len:[a,b], pts:[a,b], dir:{out,back,up,vec}, rise, bend,
//          width, fuzz, seed, layers:[{frac, scale, dz, len}] }
export function buildStrands(group, sdf, rand) {
  const strands = [];
  const n = group.count ?? 100;
  const root = group.root || { type: 'point', c: [0, 0, 0] };
  const M = eulerMat(root.rot || [0, 0, 0]);
  const layers = group.layers || [{ frac: 1, scale: 1, dz: 0 }];
  let li = 0, layerEnd = Math.round(layers[0].frac * n);
  for (let i = 0; i < n; i++) {
    while (i >= layerEnd && li < layers.length - 1) { li++; layerEnd += Math.round(layers[li].frac * n); }
    const L = layers[li];
    let r0, outward;
    if (root.type === 'ring') {
      const [a0, a1] = root.arc || [0, 360];
      // 均匀分布 + 抖动，避免整齐的放射状
      const ang = (a0 + (a1 - a0) * ((i + rand() * 0.8) / n) + (li * 37.0)) * D2R;
      const rx = root.r[0] * (L.scale ?? 1) * (1 + (rand() - 0.5) * (root.jitter ?? 0.1));
      const ry = root.r[1] * (L.scale ?? 1) * (1 + (rand() - 0.5) * (root.jitter ?? 0.1));
      const loc = [rx * Math.cos(ang), ry * Math.sin(ang), (L.dz ?? 0) + (rand() - 0.5) * (root.depth ?? 0.15)];
      const w = mulM(M, loc);
      r0 = [root.c[0] + w[0], root.c[1] + w[1], root.c[2] + w[2]];
      outward = mulM(M, [Math.cos(ang), Math.sin(ang), 0]);
    } else if (root.type === 'line') {
      const u = (i + rand()) / n;
      r0 = [lerp(root.a[0], root.b[0], u), lerp(root.a[1], root.b[1], u), lerp(root.a[2], root.b[2], u)];
      outward = root.out || [0, 1, 0];
    } else if (root.type === 'surface' && sdf) {
      // 在一个球形区域内的表面上随机取根
      let tries = 0;
      do {
        const x = root.c[0] + (rand() - 0.5) * 2 * root.r, y = root.c[1] + (rand() - 0.5) * 2 * root.r, z = root.c[2] + (rand() - 0.5) * 2 * root.r;
        const d = sdf(x, y, z);
        if (Math.abs(d) < 0.05) { const g = grad(sdf, x, y, z); r0 = [x - g[0] * d, y - g[1] * d, z - g[2] * d]; outward = g; }
      } while (!r0 && ++tries < 20000);
      if (!r0) { r0 = root.c.slice(); outward = [0, 1, 0]; }
    } else {
      const s = root.spread ?? 0.1;
      r0 = [root.c[0] + (rand() - 0.5) * s, root.c[1] + (rand() - 0.5) * s, root.c[2] + (rand() - 0.5) * s];
      outward = root.out || [0, 1, 0];
    }
    const D = group.dir || {};
    let dir = [
      outward[0] * (D.out ?? 1) + (D.vec ? D.vec[0] : 0),
      outward[1] * (D.out ?? 1) + (D.up ?? 0) + (D.vec ? D.vec[1] : 0),
      outward[2] * (D.out ?? 1) - (D.back ?? 0) + (D.vec ? D.vec[2] : 0),
    ];
    const dj = D.jitter ?? 0.25;
    dir = dir.map(v => v + (rand() - 0.5) * dj);
    const dl = len3(...dir) || 1; dir = dir.map(v => v / dl);
    const lr = L.len || group.len || [0.8, 2.0];
    const length = lerp(lr[0], lr[1], Math.pow(rand(), 0.8));
    // 静止形状：沿方向伸出，末端向上卷（火焰）并带随机侧弯
    const side = [rand() - 0.5, rand() - 0.5, rand() - 0.5];
    const rise = group.rise ?? 0.3, bend = group.bend ?? 0.3;
    const curve = u => {
      const s = length * u;
      return [
        r0[0] + dir[0] * s + side[0] * bend * s * u,
        r0[1] + dir[1] * s + side[1] * bend * s * u + rise * s * u,
        r0[2] + dir[2] * s + side[2] * bend * s * u,
      ];
    };
    strands.push({ root: r0, dir, length, curve, seed: rand(), layer: li });
  }
  return strands;
}
