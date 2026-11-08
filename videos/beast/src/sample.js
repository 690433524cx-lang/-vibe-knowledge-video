// 网格 → 粒子。只在初始化时跑一次，结果只由网格和参数决定（固定种子）。
// 1. 折痕感知的平滑法线（夹角 < 60° 的相邻面才平均），再用 PN 三角形把低多边形的面“鼓”成曲面，粒子落在曲面上
// 2. 光照决定疏密：顶光 + 英雄镜头方向的轮廓光；受光处密，背光处稀
// 3. 毛发：在表面长出 3 个点的短毛，朝“梳毛方向”（向后、略向下）倒伏；觉醒后被风吹动
// 4. 眼睛材质的三角形不采样（眼睛单独用发光点）
import { rng, clamp } from './util.js';

const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const add = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
const mul = (a, s) => [a[0] * s, a[1] * s, a[2] * s];
const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const norm = a => { const l = Math.hypot(a[0], a[1], a[2]) || 1; return [a[0] / l, a[1] / l, a[2] / l]; };

export function loadMesh(meta, buf) {
  const L = meta.layout;
  return {
    meta,
    pos: new Float32Array(buf, L.pos[0] * 1, L.pos[1]),
    nrm: new Float32Array(buf, L.nrm[0], L.nrm[1]),
    mat: L.mat ? new Uint8Array(buf, L.mat[0], L.mat[1]) : new Uint8Array(L.pos[1] / 3),
    index: new Uint32Array(buf, L.index[0], L.index[1]),
    comb: L.comb ? new Float32Array(buf, L.comb[0], L.comb[1]) : null,
    gain: L.gain ? new Float32Array(buf, L.gain[0], L.gain[1]) : null,
    fur: L.fur ? new Float32Array(buf, L.fur[0], L.fur[1]) : null,
    chain: L.chain ? new Float32Array(buf, L.chain[0], L.chain[1]) : null,
    emph: L.emph ? new Float32Array(buf, L.emph[0], L.emph[1]) : null,
  };
}

// 每个三角形三个角的平滑法线
function cornerNormals(m) {
  const { pos, index } = m, nT = index.length / 3;
  const P = i => [pos[i * 3], pos[i * 3 + 1], pos[i * 3 + 2]];
  const fn = new Float32Array(nT * 3), fa = new Float32Array(nT);
  const groups = new Map(), key = p => `${Math.round(p[0] * 2e3)},${Math.round(p[1] * 2e3)},${Math.round(p[2] * 2e3)}`;
  for (let f = 0; f < nT; f++) {
    const a = P(index[f * 3]), b = P(index[f * 3 + 1]), c = P(index[f * 3 + 2]);
    const n = cross(sub(b, a), sub(c, a)), l = Math.hypot(...n) || 1e-12;
    fn[f * 3] = n[0] / l; fn[f * 3 + 1] = n[1] / l; fn[f * 3 + 2] = n[2] / l; fa[f] = l / 2;
    for (let k = 0; k < 3; k++) { const kk = key(P(index[f * 3 + k])); let g = groups.get(kk); if (!g) groups.set(kk, g = []); g.push(f); }
  }
  const cn = new Float32Array(nT * 9), COS = Math.cos(60 * Math.PI / 180);
  for (let f = 0; f < nT; f++) for (let k = 0; k < 3; k++) {
    const g = groups.get(key(P(index[f * 3 + k]))); let s = [0, 0, 0];
    const nf = [fn[f * 3], fn[f * 3 + 1], fn[f * 3 + 2]];
    for (const h of g) { const nh = [fn[h * 3], fn[h * 3 + 1], fn[h * 3 + 2]]; if (dot(nf, nh) >= COS) s = add(s, mul(nh, fa[h])); }
    const n = norm(s); cn.set(n, f * 9 + k * 3);
  }
  return { cn, fa, fn };
}

// PN 三角形的控制点
function pnPatch(P1, P2, P3, N1, N2, N3, bulge) {
  const w = (Pi, Pj, Ni) => dot(sub(Pj, Pi), Ni) * bulge;
  const b = (Pi, Pj, Ni) => mul(sub(add(mul(Pi, 2), Pj), mul(Ni, w(Pi, Pj, Ni))), 1 / 3);
  const b210 = b(P1, P2, N1), b120 = b(P2, P1, N2), b021 = b(P2, P3, N2), b012 = b(P3, P2, N3), b102 = b(P3, P1, N3), b201 = b(P1, P3, N1);
  const E = mul(add(add(add(b210, b120), add(b021, b012)), add(b102, b201)), 1 / 6), V = mul(add(add(P1, P2), P3), 1 / 3);
  const b111 = add(E, mul(sub(E, V), 0.5));
  return (a, bb, c) => {
    const r = [0, 0, 0];
    const acc = (p, s) => { r[0] += p[0] * s; r[1] += p[1] * s; r[2] += p[2] * s; };
    acc(P1, a * a * a); acc(P2, bb * bb * bb); acc(P3, c * c * c);
    acc(b210, 3 * a * a * bb); acc(b120, 3 * a * bb * bb); acc(b201, 3 * a * a * c); acc(b021, 3 * bb * bb * c); acc(b102, 3 * a * c * c); acc(b012, 3 * bb * c * c); acc(b111, 6 * a * bb * c);
    return r;
  };
}

/**
 * opts: { n 表面点数, cam 英雄镜头位置（模型坐标）, eyeMid, key 顶光方向, furFrac, furLen, comb 梳毛方向, matGain {材质名: 亮度}, skipMat [材质名] }
 * 返回 { count, pos, nrm, comb, misc(亮度, 种子, 种类, 离眼睛的距离 0–1) }；种类 0 表面 1 毛尖 2 毛中段
 */
export function samplePoints(m, o) {
  const R = rng(o.seed ?? 7), { pos, index, mat, meta } = m, nT = index.length / 3;
  const { cn, fa } = cornerNormals(m);
  const P = i => [pos[i * 3], pos[i * 3 + 1], pos[i * 3 + 2]];
  const skip = new Set((o.skipMat || []).map(n => meta.mats.indexOf(n)));
  const gainOf = meta.mats.length ? meta.mats.map(n => (o.matGain || {})[n] ?? 1) : [1];
  const VG = m.gain, VC = m.comb, VF = m.fur;
  // 按面积的累积分布
  const cdf = new Float64Array(nT); let tot = 0;
  for (let f = 0; f < nT; f++) { const mm = mat[index[f * 3]]; tot += skip.has(mm) ? 0 : fa[f]; cdf[f] = tot; }
  const pick = u => { let lo = 0, hi = nT - 1; const x = u * tot; while (lo < hi) { const mid = (lo + hi) >> 1; if (cdf[mid] < x) lo = mid + 1; else hi = mid; } return lo; };
  const patches = new Array(nT);
  const key = norm(o.key ?? [0.25, 1, 0.45]), cam = o.cam, eye = o.eyeMid;
  const N = o.n, furFrac = o.furFrac ?? 0.12, furLen = o.furLen ?? 0.05, comb0 = norm(o.comb ?? [0, -0.25, -1]);
  const cap = Math.ceil(N * (1 + furFrac * 6) + 10);
  const OW = new Float32Array(cap * 4), OP = new Float32Array(cap * 3), ON = new Float32Array(cap * 3), OC = new Float32Array(cap * 3), OM = new Float32Array(cap * 4);
  let k = 0, tries = 0, maxD = 0;
  let curW = [0, 0, 0, 0];
  const push = (p, n, c, b, kind) => { OW.set(curW, k * 4); OP.set(p, k * 3); ON.set(n, k * 3); OC.set(c, k * 3); const d = Math.hypot(...sub(p, eye)); maxD = Math.max(maxD, d); OM[k * 4] = b; OM[k * 4 + 1] = R(); OM[k * 4 + 2] = kind; OM[k * 4 + 3] = d; k++; };
  let surf = 0;
  while (surf < N && tries < N * 40) {
    tries++;
    const f = pick(R());
    let a = R(), b = R(); if (a + b > 1) { a = 1 - a; b = 1 - b; } const c = 1 - a - b;
    const i0 = index[f * 3], i1 = index[f * 3 + 1], i2 = index[f * 3 + 2];
    const N1 = cn.subarray(f * 9, f * 9 + 3), N2 = cn.subarray(f * 9 + 3, f * 9 + 6), N3 = cn.subarray(f * 9 + 6, f * 9 + 9);
    const patch = patches[f] ?? (patches[f] = pnPatch(P(i0), P(i1), P(i2), Array.from(N1), Array.from(N2), Array.from(N3), o.bulge ?? 1));
    const p = patch(a, b, c);
    const n = norm([N1[0] * a + N2[0] * b + N3[0] * c, N1[1] * a + N2[1] * b + N3[1] * c, N1[2] * a + N2[2] * b + N3[2] * c]);
    const v = norm(sub(cam, p)), nv = dot(n, v);
    const lam = Math.max(0, dot(n, key));
    const rim = Math.pow(1 - Math.abs(nv), 2.0) * (nv > -0.15 ? 1 : 0.35);
    const lit = clamp(0.8 * lam + 1.1 * rim + 0.08);
    const em = m.emph ? m.emph[i0] * a + m.emph[i1] * b + m.emph[i2] * c : 0;
    const dens = (nv < -0.25 ? 0.07 : 0.1 + 0.9 * lit) * (1 + em);   // 背光、背面：稀；需要强调的部位（耳朵）更密
    if (R() > dens) continue;
    if (m.chain) { const W = m.chain; curW = [0, 1, 2, 3].map(j => W[i0 * 4 + j] * a + W[i1 * 4 + j] * b + W[i2 * 4 + j] * c); }
    let g = gainOf[mat[i0]];
    if (VG) g *= VG[i0] * a + VG[i1] * b + VG[i2] * c;
    g *= 1 + em * 0.35;
    surf++;
    // 梳毛方向：模型自带的梳毛方向；没有就用“向后略向下”投到切平面
    const cv = VC ? [VC[i0 * 3] * a + VC[i1 * 3] * b + VC[i2 * 3] * c, VC[i0 * 3 + 1] * a + VC[i1 * 3 + 1] * b + VC[i2 * 3 + 1] * c, VC[i0 * 3 + 2] * a + VC[i1 * 3 + 2] * b + VC[i2 * 3 + 2] * c] : comb0;
    const cb = norm(sub(cv, mul(n, dot(cv, n))));
    const furHere = VF ? Math.max(0.004, (VF[i0] * a + VF[i1] * b + VF[i2] * c)) * (o.furScale ?? 1) : furLen;
    push(p, n, cb, g * (0.85 + 0.3 * R()), 0);
    if (g > 0.4 && R() < furFrac * (0.6 + 1.4 * rim) * (1 + Math.max(0, em))) {
      const L = furHere * (0.5 + R());
      const bend = 0.6 + 0.6 * R();
      for (let s = 1; s <= 3; s++) {
        const u = s / 3;
        push(add(add(p, mul(n, L * u * 0.55)), mul(cb, L * u * u * bend)), n, cb, g * (1 - u * 0.35), s === 3 ? 1 : 2);
      }
    }
  }
  for (let i = 0; i < k; i++) OM[i * 4 + 3] /= maxD;
  return { count: k, surface: surf, pos: OP.subarray(0, k * 3), nrm: ON.subarray(0, k * 3), comb: OC.subarray(0, k * 3), misc: OM.subarray(0, k * 4), chain: OW.subarray(0, k * 4) };
}
