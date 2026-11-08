// glTF（带蒙皮的动物模型）→ 摆好姿势的静态网格：assets/models/<名字>.json + .bin
// node tools/gltf_to_mesh.js <输入.gltf> <名字> [姿势.json]
// 姿势文件：{ "anim": "Idle", "time": 0.5, "bones": { "Neck1": [pitch, yaw, roll] (度，本地坐标里额外旋转) } }
// 输出的 .bin 依次是：pos f32×3、nrm f32×3、mat u8（材质号）、index u32×3；.json 里记录各段偏移、材质名、眼睛中心、骨骼世界坐标
const fs = require('fs'), path = require('path');

const [inp, name, poseFile] = process.argv.slice(2);
if (!inp || !name) { console.error('用法：node tools/gltf_to_mesh.js 输入.gltf 名字 [姿势.json]'); process.exit(2); }
const cfg = poseFile ? JSON.parse(fs.readFileSync(poseFile, 'utf8')) : {}, pose = cfg.pose ?? cfg;
const G = JSON.parse(fs.readFileSync(inp, 'utf8'));
const bufs = G.buffers.map(b => b.uri.startsWith('data:') ? Buffer.from(b.uri.split(',')[1], 'base64') : fs.readFileSync(path.join(path.dirname(inp), b.uri)));
const CT = { 5120: Int8Array, 5121: Uint8Array, 5122: Int16Array, 5123: Uint16Array, 5125: Uint32Array, 5126: Float32Array };
const NC = { SCALAR: 1, VEC2: 2, VEC3: 3, VEC4: 4, MAT4: 16 };
function acc(i) {
  const a = G.accessors[i], bv = G.bufferViews[a.bufferView], T = CT[a.componentType], n = NC[a.type];
  const buf = bufs[bv.buffer], off = (bv.byteOffset || 0) + (a.byteOffset || 0), stride = bv.byteStride || n * T.BYTES_PER_ELEMENT;
  const out = new Float64Array(a.count * n);
  const dv = new DataView(buf.buffer, buf.byteOffset);
  const rd = { 5120: 'getInt8', 5121: 'getUint8', 5122: 'getInt16', 5123: 'getUint16', 5125: 'getUint32', 5126: 'getFloat32' }[a.componentType];
  for (let k = 0; k < a.count; k++) for (let j = 0; j < n; j++) out[k * n + j] = dv[rd](off + k * stride + j * T.BYTES_PER_ELEMENT, true);
  if (a.normalized) { const s = { 5121: 255, 5123: 65535, 5120: 127, 5122: 32767 }[a.componentType]; for (let k = 0; k < out.length; k++) out[k] /= s; }
  return out;
}

// ---- 小型数学：四元数 [x,y,z,w]、4×4 列主序矩阵
const qmul = (a, b) => [a[3] * b[0] + a[0] * b[3] + a[1] * b[2] - a[2] * b[1], a[3] * b[1] - a[0] * b[2] + a[1] * b[3] + a[2] * b[0], a[3] * b[2] + a[0] * b[1] - a[1] * b[0] + a[2] * b[3], a[3] * b[3] - a[0] * b[0] - a[1] * b[1] - a[2] * b[2]];
const qeuler = (px, py, pz) => { // 度；先 x 再 y 再 z
  const r = d => d * Math.PI / 360;
  const qx = [Math.sin(r(px)), 0, 0, Math.cos(r(px))], qy = [0, Math.sin(r(py)), 0, Math.cos(r(py))], qz = [0, 0, Math.sin(r(pz)), Math.cos(r(pz))];
  return qmul(qz, qmul(qy, qx));
};
const slerp = (a, b, t) => { let d = a[0] * b[0] + a[1] * b[1] + a[2] * b[2] + a[3] * b[3]; if (d < 0) { b = b.map(v => -v); d = -d; } if (d > 0.9995) { const r = a.map((v, i) => v + (b[i] - v) * t); const l = Math.hypot(...r); return r.map(v => v / l); } const th = Math.acos(d), s = Math.sin(th); return a.map((v, i) => (v * Math.sin((1 - t) * th) + b[i] * Math.sin(t * th)) / s); };
function compose(t, q, s) {
  const [x, y, z, w] = q, x2 = x + x, y2 = y + y, z2 = z + z, xx = x * x2, xy = x * y2, xz = x * z2, yy = y * y2, yz = y * z2, zz = z * z2, wx = w * x2, wy = w * y2, wz = w * z2;
  return [(1 - (yy + zz)) * s[0], (xy + wz) * s[0], (xz - wy) * s[0], 0, (xy - wz) * s[1], (1 - (xx + zz)) * s[1], (yz + wx) * s[1], 0, (xz + wy) * s[2], (yz - wx) * s[2], (1 - (xx + yy)) * s[2], 0, t[0], t[1], t[2], 1];
}
function mmul(a, b) { const o = new Array(16).fill(0); for (let c = 0; c < 4; c++) for (let r = 0; r < 4; r++) { let s = 0; for (let k = 0; k < 4; k++) s += a[k * 4 + r] * b[c * 4 + k]; o[c * 4 + r] = s; } return o; }
const xf = (m, p) => [m[0] * p[0] + m[4] * p[1] + m[8] * p[2] + m[12], m[1] * p[0] + m[5] * p[1] + m[9] * p[2] + m[13], m[2] * p[0] + m[6] * p[1] + m[10] * p[2] + m[14]];
const xn = (m, p) => [m[0] * p[0] + m[4] * p[1] + m[8] * p[2], m[1] * p[0] + m[5] * p[1] + m[9] * p[2], m[2] * p[0] + m[6] * p[1] + m[10] * p[2]];

// ---- 节点的 TRS：静止姿势 → 动画某一帧 → 额外的骨骼旋转
const trs = G.nodes.map(n => ({ t: n.translation || [0, 0, 0], r: n.rotation || [0, 0, 0, 1], s: n.scale || [1, 1, 1] }));
if (pose.anim) {
  const A = G.animations.find(a => a.name === pose.anim); if (!A) throw new Error('没有动画 ' + pose.anim);
  for (const ch of A.channels) {
    const sm = A.samplers[ch.sampler], T = acc(sm.input), V = acc(sm.output), n = ch.target.path === 'rotation' ? 4 : 3;
    const tt = Math.min(Math.max(pose.time || 0, T[0]), T[T.length - 1]);
    let k = 0; while (k < T.length - 2 && T[k + 1] < tt) k++;
    const f = T.length > 1 ? Math.min(1, Math.max(0, (tt - T[k]) / (T[k + 1] - T[k] || 1))) : 0;
    const a = Array.from(V.slice(k * n, k * n + n)), b = Array.from(V.slice(Math.min(k + 1, T.length - 1) * n, Math.min(k + 1, T.length - 1) * n + n));
    const v = n === 4 ? slerp(a, b, f) : a.map((x, i) => x + (b[i] - x) * f);
    const key = { translation: 't', rotation: 'r', scale: 's' }[ch.target.path]; if (key) trs[ch.target.node][key] = v;
  }
}
for (const [bn, e] of Object.entries(pose.bones || {})) {
  const i = G.nodes.findIndex(n => n.name === bn); if (i < 0) throw new Error('没有骨骼 ' + bn);
  trs[i].r = qmul(trs[i].r, qeuler(...e));
}
const parent = new Array(G.nodes.length).fill(-1);
G.nodes.forEach((n, i) => (n.children || []).forEach(c => parent[c] = i));
const world = [];
const W = i => world[i] ?? (world[i] = parent[i] < 0 ? compose(trs[i].t, trs[i].r, trs[i].s) : mmul(W(parent[i]), compose(trs[i].t, trs[i].r, trs[i].s)));
G.nodes.forEach((_, i) => W(i));

// ---- 蒙皮
const P = [], N = [], M = [], I = [];
const meshNode = G.nodes.findIndex(n => n.mesh != null);
const node = G.nodes[meshNode], skin = node.skin != null ? G.skins[node.skin] : null;
let jm = null;
if (skin) { const ib = acc(skin.inverseBindMatrices); jm = skin.joints.map((j, k) => mmul(world[j], Array.from(ib.slice(k * 16, k * 16 + 16)))); }
for (const prim of G.meshes[node.mesh].primitives) {
  const base = P.length / 3, pos = acc(prim.attributes.POSITION), nrm = acc(prim.attributes.NORMAL);
  const J = skin ? acc(prim.attributes.JOINTS_0) : null, Wt = skin ? acc(prim.attributes.WEIGHTS_0) : null;
  const n = pos.length / 3;
  for (let v = 0; v < n; v++) {
    const p = [pos[v * 3], pos[v * 3 + 1], pos[v * 3 + 2]], q = [nrm[v * 3], nrm[v * 3 + 1], nrm[v * 3 + 2]];
    let op = [0, 0, 0], on = [0, 0, 0];
    if (skin) {
      for (let k = 0; k < 4; k++) { const w = Wt[v * 4 + k]; if (!w) continue; const m = jm[J[v * 4 + k]], a = xf(m, p), b = xn(m, q); for (let c = 0; c < 3; c++) { op[c] += a[c] * w; on[c] += b[c] * w; } }
    } else { op = xf(world[meshNode], p); on = xn(world[meshNode], q); }
    const l = Math.hypot(...on) || 1;
    P.push(...op); N.push(on[0] / l, on[1] / l, on[2] / l); M.push(prim.material ?? 0);
  }
  const idx = prim.indices != null ? acc(prim.indices) : Array.from({ length: n }, (_, i) => i);
  for (const i of idx) I.push(base + i);
}
const mats = (G.materials || []).map(m => m.name);
// 眼睛：名字里带 Eye 的材质，按左右分两团取中心
const eyeMat = mats.findIndex(m => /eye/i.test(m));
const eyes = [];
if (eyeMat >= 0) for (const side of [1, -1]) {
  let s = [0, 0, 0], c = 0, front = -Infinity;
  for (let v = 0; v < M.length; v++) if (M[v] === eyeMat && Math.sign(P[v * 3]) === side) { s[0] += P[v * 3]; s[1] += P[v * 3 + 1]; s[2] += P[v * 3 + 2]; c++; }
  if (c) eyes.push({ side: side > 0 ? 'L' : 'R', c: s.map(x => x / c), n: c });
}
const bones = {}; G.nodes.forEach((n, i) => { if (!n.mesh && parent[i] >= 0) bones[n.name] = xf(world[i], [0, 0, 0]); });
const min = [1e9, 1e9, 1e9], max = [-1e9, -1e9, -1e9];
for (let v = 0; v < P.length / 3; v++) for (let c = 0; c < 3; c++) { min[c] = Math.min(min[c], P[v * 3 + c]); max[c] = Math.max(max[c], P[v * 3 + c]); }

const nV = P.length / 3, nT = I.length / 3;
const bP = Buffer.from(new Float32Array(P).buffer), bN = Buffer.from(new Float32Array(N).buffer), bM = Buffer.alloc(nV), bI = Buffer.from(new Uint32Array(I).buffer);
M.forEach((m, i) => bM[i] = m);
const pad = Buffer.alloc((4 - (bM.length % 4)) % 4);
const out = path.resolve(__dirname, '../assets/models');
fs.mkdirSync(out, { recursive: true });
fs.writeFileSync(path.join(out, name + '.bin'), Buffer.concat([bP, bN, bM, pad, bI]));
const layout = { pos: [0, nV * 3], nrm: [bP.length, nV * 3], mat: [bP.length + bN.length, nV], index: [bP.length + bN.length + bM.length + pad.length, nT * 3] };
fs.writeFileSync(path.join(out, name + '.json'), JSON.stringify({ source: path.basename(inp), pose, nV, nT, layout, mats, eyes, bbox: { min, max }, bones }, null, 1));
console.log(`${name}: ${nV} 顶点，${nT} 三角形；包围盒 ${min.map(v => v.toFixed(2))} → ${max.map(v => v.toFixed(2))}；眼睛 ${eyes.map(e => e.side + ' ' + e.c.map(v => v.toFixed(3)).join(',')).join(' / ')}`);
console.log('头', bones.Head?.map(v => v.toFixed(3)), '颈', bones.Neck1?.map(v => v.toFixed(3)));
