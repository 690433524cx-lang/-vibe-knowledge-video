// 程序化动物的原始网格（assets/models/raw/<名字>）→ 摆好英雄姿势的网格（assets/models/<名字>）
// node tools/pose_animal.js <名字> episodes/<id>.json
// episode.pose = { scale: 2.6, bones: { 骨骼名: [绕 x, 绕 y, 绕 z]（度，绕骨骼起点，世界轴） } }，父骨骼的旋转会带动子骨骼
// 输出 .bin：pos f32×3、nrm f32×3、comb f32×3、gain f32（毛色亮度）、fur f32（毛长）、index u32×3
const fs = require('fs'), path = require('path');
const [name, epFile] = process.argv.slice(2);
const ep = JSON.parse(fs.readFileSync(epFile, 'utf8')), pose = ep.pose || {};
const dir = path.resolve(__dirname, '../assets/models');
const meta = JSON.parse(fs.readFileSync(path.join(dir, 'raw', name + '.json'), 'utf8'));
const raw = fs.readFileSync(path.join(dir, 'raw', name + '.bin'));
const A = k => { const L = meta.layout[k]; if (!L) return null; const T = { Float32Array, Uint32Array, Uint16Array }[L.type]; return new T(raw.buffer.slice(raw.byteOffset + L.offset, raw.byteOffset + L.offset + L.n * T.BYTES_PER_ELEMENT)); };
const pos = A('pos'), nrm = A('nrm'), index = A('index'), sI = A('skinIndex'), sW = A('skinWeight'), comb = A('comb'), tint = A('tint'), coat = A('coat');
const nV = meta.nV, S = pose.scale ?? 2.6;

// 3×3 旋转（世界轴，度）
const rot = ([x, y, z]) => {
  const r = d => d * Math.PI / 180, [cx, sx, cy, sy, cz, sz] = [Math.cos(r(x)), Math.sin(r(x)), Math.cos(r(y)), Math.sin(r(y)), Math.cos(r(z)), Math.sin(r(z))];
  const Rx = [1, 0, 0, 0, cx, -sx, 0, sx, cx], Ry = [cy, 0, sy, 0, 1, 0, -sy, 0, cy], Rz = [cz, -sz, 0, sz, cz, 0, 0, 0, 1];
  return mm(Rz, mm(Ry, Rx));
};
function mm(a, b) { const o = new Array(9); for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) o[i * 3 + j] = a[i * 3] * b[j] + a[i * 3 + 1] * b[3 + j] + a[i * 3 + 2] * b[6 + j]; return o; }
const mv = (m, v) => [m[0] * v[0] + m[1] * v[1] + m[2] * v[2], m[3] * v[0] + m[4] * v[1] + m[5] * v[2], m[6] * v[0] + m[7] * v[1] + m[8] * v[2]];
// 每根骨骼的世界变换：p' = R p + t；子骨骼 = 父变换 ∘ 自己绕起点的旋转
const bones = meta.bones, J = meta.joints, idx = Object.fromEntries(bones.map((b, i) => [b.name, i]));
const X = new Array(bones.length);
const xf = i => {
  if (X[i]) return X[i];
  const b = bones[i], par = b.parent != null ? xf(idx[b.parent]) : { R: [1, 0, 0, 0, 1, 0, 0, 0, 1], t: [0, 0, 0] };
  const e = pose.bones?.[b.name];
  let me = { R: [1, 0, 0, 0, 1, 0, 0, 0, 1], t: [0, 0, 0] };
  const sc = pose.boneScale?.[b.name];
  if (e || sc) { let R = rot(e || [0, 0, 0]); if (sc) R = R.map(v => v * sc); const h = J[b.headJ], Rh = mv(R, h); me = { R, t: [h[0] - Rh[0], h[1] - Rh[1], h[2] - Rh[2]] }; }
  // 组合：par ∘ me
  const R = mm(par.R, me.R), t = mv(par.R, me.t).map((v, k) => v + par.t[k]);
  return X[i] = { R, t };
};
bones.forEach((_, i) => xf(i));
const P = new Float32Array(nV * 3), N = new Float32Array(nV * 3), CB = new Float32Array(nV * 3), G = new Float32Array(nV), F = new Float32Array(nV), EM = new Float32Array(nV), SD = new Float32Array(nV);
// 专属动作的骨骼链（最多 4 根）：每个顶点按“最近的链上祖先骨骼”把蒙皮权重归到 4 个槽里，渲染时逐帧在着色器里转动
const chainBones = (ep.action?.bones || []).map(b => b.name);
const slotOf = bones.map((b, i) => { for (let j = i; j != null; j = bones[j].parent != null ? idx[bones[j].parent] : null) { const k = chainBones.indexOf(bones[j].name); if (k >= 0) return k; } return -1; });
const CH = new Float32Array(nV * 4);
const emphB = Object.fromEntries(Object.entries(pose.emphasis || {}).map(([k, v]) => [idx[k], v]));
for (let v = 0; v < nV; v++) {
  const p = [pos[v * 3], pos[v * 3 + 1], pos[v * 3 + 2]], n = [nrm[v * 3], nrm[v * 3 + 1], nrm[v * 3 + 2]], c = comb ? [comb[v * 3], comb[v * 3 + 1], comb[v * 3 + 2]] : [0, 0, -1];
  // 四肢加粗：主骨骼是四肢的顶点，在静止姿势里沿垂直骨骼轴的方向向外推
  if (pose.limbThick) {
    let bi = -1, bw = 0; for (let k = 0; k < 4; k++) if (sW[v * 4 + k] > bw) { bw = sW[v * 4 + k]; bi = sI[v * 4 + k]; }
    const bb = bones[bi];
    if (bb && (bb.region === 'limb' || bb.region === 'foot') && !/scapula|femur/.test(bb.name) || (bb && /femur|scapula/.test(bb.name) && pose.limbThickUpper)) {
      const k = /femur|scapula/.test(bb.name) ? (pose.limbThickUpper ?? 1) : pose.limbThick;
      const a = J[bb.headJ], b2 = J[bb.tailJ], ab = [b2[0] - a[0], b2[1] - a[1], b2[2] - a[2]], L2 = ab[0] ** 2 + ab[1] ** 2 + ab[2] ** 2 || 1;
      const u = Math.max(0, Math.min(1, ((p[0] - a[0]) * ab[0] + (p[1] - a[1]) * ab[1] + (p[2] - a[2]) * ab[2]) / L2));
      const q = [a[0] + ab[0] * u, a[1] + ab[1] * u, a[2] + ab[2] * u];
      for (let j = 0; j < 3; j++) p[j] = q[j] + (p[j] - q[j]) * k;
    }
  }
  const op = [0, 0, 0], on = [0, 0, 0], oc = [0, 0, 0]; let ws = 0;
  for (let k = 0; k < 4; k++) {
    const w = sW[v * 4 + k]; if (!w) continue; ws += w; EM[v] += (emphB[sI[v * 4 + k]] ?? 0) * w; { const sl = slotOf[sI[v * 4 + k]]; if (sl >= 0) CH[v * 4 + sl] += w; }
    const T = X[sI[v * 4 + k]], a = mv(T.R, p), b = mv(T.R, n), d = mv(T.R, c);
    for (let j = 0; j < 3; j++) { op[j] += (a[j] + T.t[j]) * w; on[j] += b[j] * w; oc[j] += d[j] * w; }
  }
  const ln = Math.hypot(...on) || 1, lc = Math.hypot(...oc) || 1;
  for (let j = 0; j < 3; j++) { P[v * 3 + j] = op[j] / (ws || 1) * S; N[v * 3 + j] = on[j] / ln; CB[v * 3 + j] = oc[j] / lc; }
  const L = tint ? 0.3 * tint[v * 4] + 0.59 * tint[v * 4 + 1] + 0.11 * tint[v * 4 + 2] : 0.5;
  G[v] = L; F[v] = coat ? coat[v * 4 + 2] * S : 0.02;
  // 颈毛：指定骨骼上的毛更长、更向外蓬（梳毛方向偏向法线）
  if (pose.furBoost) { let fb = 0, wsum = 0; for (let k = 0; k < 4; k++) { const bn = bones[sI[v * 4 + k]]?.name, f = pose.furBoost[bn]; if (f) { fb += (f - 1) * sW[v * 4 + k]; wsum += sW[v * 4 + k]; } }
    if (fb > 0) { F[v] *= 1 + fb; const o = Math.min(1, wsum) * (pose.furOut ?? 0); for (let j = 0; j < 3; j++) CB[v * 3 + j] = CB[v * 3 + j] * (1 - o) + N[v * 3 + j] * o; const l = Math.hypot(CB[v * 3], CB[v * 3 + 1], CB[v * 3 + 2]) || 1; for (let j = 0; j < 3; j++) CB[v * 3 + j] /= l; } }
  // 接缝（比如嘴唇：一半跟下颌、一半跟头）压暗，嘴看起来是闭着的
  for (const [bn, amt] of Object.entries(pose.seamDim || {})) { let w = 0; for (let k = 0; k < 4; k++) if (sI[v * 4 + k] === idx[bn]) w += sW[v * 4 + k]; SD[v] = Math.max(SD[v], amt * Math.min(1, 4 * w * (1 - w) * 1.3)); }
}
// 毛色亮度归一化到 0.55–1.35：浅色的口鼻、眉、颊、胸更亮，深色的背更暗
const sorted = Float32Array.from(G).sort(), lo = sorted[Math.floor(nV * 0.01)], hi = sorted[Math.floor(nV * 0.97)], gl = pose.gainLo ?? 0.55;
console.log('毛色亮度分位', [0.01, 0.05, 0.2, 0.5, 0.8, 0.97].map(q => sorted[Math.floor(nV * q)].toFixed(3)).join(' '));
for (let v = 0; v < nV; v++) G[v] = (gl + (1.35 - gl) * Math.pow(Math.min(1, Math.max(0, (G[v] - lo) / (hi - lo || 1))), pose.gainGamma ?? 1)) * (1 - SD[v]);
const tp = j => { const T = X[idx[j.bone] ?? idx.head]; const r = mv(T.R, j.p); return r.map((x, k) => (x + T.t[k]) * S); };
const eyes = meta.eyes.map(e => {
  const T = X[idx[e.bone] ?? idx.head], c = mv(T.R, e.c).map((x, k) => (x + T.t[k]) * S), z = mv(T.R, e.z);
  const r = (e.spec?.r ?? 0.012) * (e.scale ?? 1) * S;
  return { side: e.side > 0 ? 'L' : 'R', c: c.map((x, k) => x + z[k] * r * 0.9), ball: c, z, r };
});
const joints = {}; for (const b of bones) { joints[b.headJ] = tp({ bone: b.name, p: J[b.headJ] }); joints[b.tailJ] = tp({ bone: b.name, p: J[b.tailJ] }); }
const min = [1e9, 1e9, 1e9], max = [-1e9, -1e9, -1e9];
for (let v = 0; v < nV; v++) for (let j = 0; j < 3; j++) { min[j] = Math.min(min[j], P[v * 3 + j]); max[j] = Math.max(max[j], P[v * 3 + j]); }
for (let v = 0; v < nV; v++) { let t = 0; for (let k = 0; k < 4; k++) t += CH[v * 4 + k]; if (t > 1) for (let k = 0; k < 4; k++) CH[v * 4 + k] /= t; }
const parts = [P, N, CB, G, F, EM, CH, index], layout = {}; let off = 0;
['pos', 'nrm', 'comb', 'gain', 'fur', 'emph', 'chain', 'index'].forEach((k, i) => { layout[k] = [off, parts[i].length]; off += parts[i].byteLength; });
fs.writeFileSync(path.join(dir, name + '.bin'), Buffer.concat(parts.map(a => Buffer.from(a.buffer, a.byteOffset, a.byteLength))));
fs.writeFileSync(path.join(dir, name + '.json'), JSON.stringify({ source: meta.source, pose, bones: bones.map(b => ({ name: b.name, headJ: b.headJ, tailJ: b.tailJ, region: b.region })), chain: (ep.action?.bones || []).map(b => ({ ...b, pivot: joints[bones[idx[b.name]].headJ] })), nV, nT: index.length / 3, layout, mats: [], eyes, joints, bbox: { min, max } }));
console.log(`${name}: ${nV} 顶点，包围盒 ${min.map(v => v.toFixed(2))} → ${max.map(v => v.toFixed(2))}；眼睛 ${eyes.map(e => e.c.map(v => v.toFixed(3))).join(' / ')}；鼻尖 ${joints.nose?.map(v => v.toFixed(2)) ?? "—"}`);
