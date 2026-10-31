// 神像：人头（傲慢、嫉妒同一套 MediaPipe 人脸点云，密度翻倍）+ 长脖子 + 宽肩上胸 + 半垂的眼睛 + 体内的粒子大脑
// 材质：大理石背光——轮廓边缘最亮（逆光勾出的亮边），正面保留细腻的明暗；背面几乎不可见
import * as THREE from 'three';
import { K, points } from './core.js';
import { cloudMaterial } from './mat.js';
import { PB, V3, FACE } from './geo.js';
import { sampleSDF } from './assets.js';
import { rng, TAU, clamp, lerp } from './util.js';

const { addv, sub, mul, norm, len } = V3;
export const BG = '#050508';
// 七宗罪的顺序、颜色与卡片内容（只用规格里给出的说法）
export const SINS = [
  { id: 'pride', name: '傲慢', col: '#A24BFF', quote: '“这点事，还用问别人？”', fact: '多数人觉得，\n自己比平均强' },
  { id: 'envy', name: '嫉妒', col: '#2BE36B', quote: '“凭什么是他，不是我？”', fact: '别人比你好，\n大脑的疼痛区会亮' },
  { id: 'wrath', name: '愤怒', col: '#FF2A2A', quote: '“你再说一遍？”', fact: '怒气走近路，\n比理智快一步' },
  { id: 'sloth', name: '懒惰', col: '#2BC8E0', quote: '“再躺五分钟，就五分钟。”', fact: '大脑天生爱省电', sub: '它占体重2%，却耗掉约两成能量' },
  { id: 'greed', name: '贪婪', col: '#FFC23D', quote: '“再多一点，我就收手。”', fact: '多巴胺爱的，\n是‘快得到’' },
  { id: 'gluttony', name: '暴食', col: '#FF7A1F', quote: '“不饿，就是想吃点什么。”', fact: '吃饱的信号，\n晚到约20分钟' },
  { id: 'lust', name: '色欲', col: '#FF3D8B', quote: '“明知不该，还是想靠近。”', fact: '心动时，\n奖励回路全亮' },
];
export const GROUND_Y = -1.85;            // 小人影所在的地面（右肩外侧）
export const BODY_CUT = -2.05;           // 神像胸口在这里没入地面的雾里            // 前景平台的地面高度（小人影站在上面；神像的胸口一直延伸到画面下缘以外）
export const HALO_C = [0, 0.12, -0.75];  // 光环中心（头后）

// ------------------------------------------------------------ 身体：长脖子 + 斜方肌 + 宽肩 + 上胸（SDF 组合后表面采样）
function sdCap(p, a, b, r) {
  const pa = sub(p, a), ba = sub(b, a), h = clamp(V3.dot(pa, ba) / V3.dot(ba, ba));
  return len(sub(pa, mul(ba, h))) - r;
}
const smin = (a, b, k) => { const h = clamp(0.5 + 0.5 * (b - a) / k); return lerp(b, a, h) - k * h * (1 - h); };
const ell = (p, c, r) => (Math.hypot((p[0] - c[0]) / r[0], (p[1] - c[1]) / r[1], (p[2] - c[2]) / r[2]) - 1) * Math.min(...r);
function bodySDF(p) {
  let d = sdCap(p, [0, -0.45, -0.1], [0, -1.35, -0.04], 0.215);                      // 长脖子
  d = smin(d, ell(p, [0, -1.6, -0.12], [0.5, 0.28, 0.34]), 0.3);                    // 斜方肌（从脖子到肩的斜坡）
  d = smin(d, sdCap(p, [-0.98, -1.72, -0.12], [0.98, -1.72, -0.12], 0.28), 0.3);      // 肩线
  for (const s of [-1, 1]) d = smin(d, ell(p, [1.16 * s, -1.92, -0.1], [0.32, 0.4, 0.34]), 0.14); // 三角肌
  d = smin(d, ell(p, [0, -2.55, -0.1], [1.12, 1.0, 0.48]), 0.28);                      // 上胸
  for (const s of [-1, 1]) d = smin(d, ell(p, [0.4 * s, -2.28, 0.16], [0.42, 0.3, 0.2]), 0.12); // 胸肌
  return d;
}
export function buildBody(seed = 811, k = 1) {
  const pb = sampleSDF(bodySDF, Math.round(420000 * k), [[-1.6, -3.4, -0.7], [1.6, -0.45, 0.6]], seed, [0.85, 4]);
  // 头部前方的脖子点去掉（被下巴挡住），再按光照决定疏密
  const cand = [];
  for (let i = 0; i < pb.count; i++) { const [x, y, z] = pb.pos(i); if (y > -0.66 && z > -0.02) continue; cand.push(i); }
  const R0 = rng(seed + 9);
  const kept = lightKeep(cand.map(i => pb.pos(i)), cand.map(i => pb.nor(i)), 110000 * k, R0);
  const keep = new PB();
  for (const j of kept) { const i = cand[j]; keep.add(pb.pos(i), pb.nor(i), pb.s[i], [0, 0, 0], [0, 0, 0, 1], [0.85, 4]); }
  // 锁骨与胸骨上窝：两条亮的雕刻线
  const R = rng(seed + 3);
  const surfLine = (a, b, n, br) => {
    for (let i = 0; i < n; i++) {
      let p = addv(a, mul(sub(b, a), R()));
      p = [p[0] + (R() - 0.5) * 0.01, p[1] + (R() - 0.5) * 0.01, 0.8];
      for (let it = 0; it < 30; it++) { const d = bodySDF(p); if (Math.abs(d) < 0.002) break; p[2] -= d; }
      keep.add(p, [0, 0.3, 1], R(), [0, 0, 0], [0, 0, 0, 1], [br, 3]);
    }
  };
  for (const s of [-1, 1]) {
    surfLine([0.08 * s, -1.5, 0], [0.55 * s, -1.56, 0], 900, 1.1);
    surfLine([0.55 * s, -1.56, 0], [0.92 * s, -1.5, 0], 600, 0.9);
    surfLine([0.2 * s, -0.75, 0], [0.06 * s, -1.45, 0], 600, 0.7);       // 胸锁乳突肌
  }
  return keep;
}

// ------------------------------------------------------------ 半垂的眼睛：下眼睑 + 眼睑线下面露出的半个虹膜（往下看）
// gaze：[x, y] 虹膜偏移（眼宽的比例）；open：0 闭眼（只有一条线），1 半垂
export function buildEyes(obj, o = {}) {
  const R = rng(o.seed ?? 61), pb = new PB();
  const V = obj.V, VN = obj.VN;
  const LOW = { R: [33, 7, 163, 144, 145, 153, 154, 155, 133], L: [263, 249, 390, 373, 374, 380, 381, 382, 362] };
  const UP = { R: [33, 246, 161, 160, 159, 158, 157, 173, 133], L: [263, 466, 388, 387, 386, 385, 384, 398, 362] };
  for (const side of ['R', 'L']) {
    const lo = LOW[side].map(i => V[i]), up = UP[side].map(i => V[i]);
    const lid = lo.map((p, j) => addv(addv(mul(up[j], 0.62), mul(p, 0.38)), [0, 0, 0.003]));   // 眼睑落到一半多一点
    const crease = up.map((p, j) => addv(p, [0, 0.012 * Math.sin(Math.PI * j / 8), 0.002]));
    const cen = mul(addv(lid[4], lo[4]), 0.5);
    const w = len(sub(lo[8], lo[0])), h = len(sub(lid[4], lo[4]));
    // 眼睑的厚边（常亮）
    for (let j = 0; j < 8; j++) for (let k = 0; k < 70; k++) {
      const f = k / 70, p = addv(lid[j], mul(sub(lid[j + 1], lid[j]), f));
      pb.add(addv(p, [(R() - 0.5) * 0.0012, (R() - 0.5) * 0.0012 + 0.001, 0.002]), [0, 0, 1], R(), [0, 0, 0], [0, 0, 0, 1], [1.5, 20]);
    }
    // 下眼睑（暗）与上眼睑的褶线（沉重的眼皮）
    for (let j = 0; j < 8; j++) for (let k = 0; k < 40; k++) {
      const f = k / 40, p = addv(lo[j], mul(sub(lo[j + 1], lo[j]), f));
      pb.add(addv(p, [(R() - 0.5) * 0.001, (R() - 0.5) * 0.001, 0.002]), [0, 0, 1], R(), [0, 0, 0], [0, 0, 0, 1], [0.45, 21]);
      const c = addv(crease[j], mul(sub(crease[j + 1], crease[j]), f));
      if (j > 0 && j < 7) pb.add(addv(c, [(R() - 0.5) * 0.0015, (R() - 0.5) * 0.0015, 0]), [0, 0, 1], R(), [0, 0, 0], [0, 0, 0, 1], [0.55, 21]);
    }
    // 虹膜：圆心在眼睑线略下，只画眼睑以下的部分（按目光方向平移）
    const g = o.gaze ?? [0, -0.15];
    const ic = addv(cen, [g[0] * w, g[1] * h - h * 0.2, 0.004]), ir = w * 0.24;
    const lidY = x => { let best = lid[0][1], bd = 9; for (const p of lid) { const d = Math.abs(p[0] - x); if (d < bd) { bd = d; best = p[1]; } } return best; };
    const loY = x => { let best = lo[0][1], bd = 9; for (const p of lo) { const d = Math.abs(p[0] - x); if (d < bd) { bd = d; best = p[1]; } } return best; };
    for (let k = 0; k < (o.irisN ?? 2600); k++) {
      const a = R() * TAU, rr = ir * Math.sqrt(R());
      const p = [ic[0] + Math.cos(a) * rr, ic[1] + Math.sin(a) * rr, ic[2]];
      if (p[1] > lidY(p[0]) - 0.0015 || p[1] < loY(p[0]) + 0.001) continue;
      const ring = rr > ir * 0.8 ? 1.0 : rr < ir * 0.38 ? 0.12 : 0.55;    // 虹膜外圈亮、瞳孔暗
      pb.add(p, [0, 0, 1], R(), [0, 0, 0], [0, 0, 0, 1], [ring, 22]);
    }
  }
  return pb;
}

// ------------------------------------------------------------ 材质
const C3 = h => new THREE.Color(h);
const hexOf = c => '#' + c.getHexString();
export function idolMaterial(sinHex, o = {}) {
  const c = C3(sinHex);
  // 暗部深色（约 #2A0F4A）、亮部主色、最亮的轮廓接近白色（#F3E8FF）
  const light = c.clone().lerp(C3('#FFFFFF'), 0.12), dark = c.clone().multiplyScalar(0.28), rim = c.clone().lerp(C3('#FFFFFF'), 0.85);
  return cloudMaterial({
    size: o.size ?? 0.0085, bright: o.bright ?? 0.5, depthRef: 6, maxPx: o.maxPx ?? 7, facing: 0, light: o.light ?? 0.85, drift: 0.0015,
    colA: hexOf(light), colB: hexOf(dark),
    uniforms: { uRim: { value: o.rim ?? 1.3 }, uRimCol: { value: rim }, uBack: { value: 0.1 }, uCut: { value: BODY_CUT }, uSeeThru: { value: 0 }, uSeeX: { value: -99 },
      uGray: { value: 0 }, uSin: { value: c.clone() }, uDim: { value: 1 }, uCran: { value: o.cran ?? 1 } },
    uniformDecl: 'uniform float uRim, uBack, uCut, uSeeThru, uSeeX, uGray, uDim, uCran; uniform vec3 uRimCol, uSin;',
    posHook: '{ vec4 wq = modelMatrix*vec4(p, 1.0); if (wq.y < uCut) vis = 0.0; else vis *= smoothstep(uCut, uCut + 0.35, wq.y); }',
    colHook: /* glsl */`
      b *= mix(1.0, tw, 0.25)/tw;                // 雕像表面不闪烁
      if (hasN > 0.5) {
        // 顶侧主光：眉骨、鼻梁、颧骨、下颌有清楚的明暗
        vec3 n2 = normalize(normalMatrix*aNormal);
        float lam = max(dot(n2, normalize(vec3(-0.4, 0.78, 0.5))), 0.0);
        float fill = max(dot(n2, normalize(vec3(0.6, -0.1, 0.8))), 0.0);
        b *= (0.1 + 1.25*pow(lam, 1.3) + 0.22*fill)/max(lit, 0.05);
        // 逆光亮边：只给真正的轮廓（后脑、脖子、肩胸），人脸网格的边界不加
        float rw = aMisc.y == 4.0 ? 1.0 : 0.12;
        float rimk = exp(-facing*facing/0.02)*rw;
        float back = smoothstep(-0.03, -0.3, facing);
        b *= mix(1.0, uBack, back);
        if (aMisc.y == 4.0) b *= uCran;
        b += aMisc.x*uBright*uRim*rimk*(1.0 - 0.6*back);
        col = mix(col, uRimCol, clamp(rimk*1.1, 0.0, 1.0));
      }
      if (aMisc.y == 1.0) b = 0.0;   // 原模型的闭眼线不用（换成半垂的眼睑）
      b *= mix(1.0, 1.0 - uSeeThru, step(wp.x, uSeeX));
      { float gl = dot(col, vec3(0.3, 0.59, 0.11)); col = mix(col, vec3(gl)*1.05, uGray); }
      b *= uDim;`,
  });
}
export function eyeMaterial(sinHex) {
  const c = C3(sinHex);
  return cloudMaterial({
    size: 0.006, bright: 0.9, depthRef: 6, maxPx: 6, drift: 0, colA: hexOf(c.clone().lerp(C3('#FFFFFF'), 0.75)), colB: hexOf(c.clone().lerp(C3('#FFFFFF'), 0.3)),
    uniforms: { uIris: { value: c.clone().lerp(C3('#FFFFFF'), 0.35) }, uIrisAmt: { value: 1 }, uGray: { value: 0 }, uDim: { value: 1 }, uSeeThru: { value: 0 }, uSeeX: { value: -99 } },
    uniformDecl: 'uniform vec3 uIris; uniform float uIrisAmt, uGray, uDim, uSeeThru, uSeeX;',
    colHook: /* glsl */`
      if (aMisc.y == 22.0) { col = uIris; b *= uIrisAmt; }
      b *= mix(1.0, 1.0 - uSeeThru, step(wp.x, uSeeX));
      { float gl = dot(col, vec3(0.3, 0.59, 0.11)); col = mix(col, vec3(gl), uGray); }
      b *= uDim;`,
  });
}
// 体内的大脑：只在扫描线扫过的一侧可见；uReg* 是爆亮区域（大脑局部坐标）
export function brainMaterial(sinHex) {
  const c = C3(sinHex);
  return cloudMaterial({
    size: 0.012, bright: 0.55, depthRef: 6, maxPx: 7, facing: 0.35, light: 0.2, drift: 0.002,
    colA: hexOf(c.clone().lerp(C3('#FFFFFF'), 0.55)), colB: hexOf(c),
    uniforms: { uSeeX: { value: -99 }, uRegC: { value: [0, 1, 2, 3, 4].map(() => new THREE.Vector4(0, 0, 0, 0)) }, uRegR: { value: 0.03 },
      uHot: { value: c.clone().lerp(C3('#FFFFFF'), 0.5) }, uAll: { value: 0 } },
    uniformDecl: 'uniform float uSeeX, uRegR, uAll; uniform vec4 uRegC[5]; uniform vec3 uHot;',
    posHook: '{ vec4 wq = modelMatrix*vec4(p, 1.0); vis *= smoothstep(0.02, -0.04, wq.x - uSeeX); }',
    colHook: /* glsl */`
      {
        float reg = 0.0;
        for (int i = 0; i < 5; i++) { vec3 d = position - uRegC[i].xyz; reg += uRegC[i].w*exp(-dot(d, d)/uRegR); }
        reg += uAll;
        col = mix(col, uHot, clamp(reg, 0.0, 1.0)); b *= 1.0 + reg*2.2;
      }`,
  });
}

// ------------------------------------------------------------ 共享几何（只生成一次）
export const GEO = {};
// 罗马大理石头像（Igea）与 SDF 身体的粒子，按光照决定疏密，由 tools/idol_points.py 预先算好
export const IGEA = { eyes: [], top: 0.72 };
function toPB(arr, flag) {
  const pb = new PB(), n = arr.length / 6;
  for (let i = 0; i < n; i++) pb.add([arr[i * 6], arr[i * 6 + 1], arr[i * 6 + 2]], [arr[i * 6 + 3], arr[i * 6 + 4], arr[i * 6 + 5]], (i * 0.6180339) % 1, [0, 0, 0], [0, 0, 0, 1], [flag ? 0.85 : 1, 4]);
  return pb;
}
export function buildShared(obj, k = 1, pts = null) {
  const f = new Float32Array(pts.bin), nh = f[0], nb = f[1], step = k < 1 ? 2 : 1;
  const head = f.subarray(2, 2 + nh * 6), body = f.subarray(2 + nh * 6, 2 + (nh + nb) * 6);
  const thin = (a) => { if (step === 1) return a; const n = a.length / 6, o = new Float32Array(Math.floor(n / step) * 6); for (let i = 0; i < o.length / 6; i++) o.set(a.subarray(i * step * 6, i * step * 6 + 6), i * 6); return o; };
  GEO.head = toPB(thin(head), 0).geometry(THREE);
  GEO.body = toPB(thin(body), 1).geometry(THREE);
  GEO.eyesDown = buildEyes(obj, { gaze: [0, -0.2] }).geometry(THREE);
  IGEA.eyes = pts.meta.eyes; IGEA.top = pts.meta.headTop;
}

// 一尊神像：head 组（人头、眼睛、大脑、各宗的头部特征）挂在 root 上；body（脖子、肩、胸）不随头部俯仰
export function createIdol(sin, o = {}) {  // o.brain 已不用
  const root = new THREE.Group(); K.scene.add(root);
  const head = new THREE.Group(); root.add(head);
  const mk = (geo, mat, parent) => { const p = new THREE.Points(geo, mat); p.frustumCulled = false; parent.add(p); K.mats.push(mat); return p; };
  const headMat = idolMaterial(sin.col, { ...o, bright: 1.75, cran: 1.0, rim: 0.35 }), bodyMat = idolMaterial(sin.col, { ...o, bright: (o.bright ?? 0.5) * 1.5, rim: 2.2, size: 0.011 });
  const headP = mk(GEO.head, headMat, head);
  const bodyP = mk(GEO.body, bodyMat, root);
  const eyesP = mk(o.eyes ?? GEO.eyesDown, eyeMaterial(sin.col), head);
  const brain = null;
  eyesP.visible = false;                     // 原来的 MediaPipe 眼睑不用；睁眼用发光眼缝（cards.js）
  headMat.uniforms.uEyeOpen.value = 0;       // 原睁眼轮廓压暗到 0.3，只作眼窝的结构
  return { root, head, headP, bodyP, eyesP, brain, mats: [headMat, bodyMat, eyesP.material], sin };
}
