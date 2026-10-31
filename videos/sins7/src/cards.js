// 时间轴与七张卡：每宗两小节（A 卡「罪」在 R2i 开光，B 卡「大脑」在 R2i+1 扫描），下一宗重拍前 0.3 秒收拢暗下
// 神像是俯视众生的侧脸剪影（脸朝左，朝镜头转约 15 度），光环中心在头部中心（耳朵附近）；镜头在下方很低处仰视约 15 度
import * as THREE from 'three';
import { K, project } from './core.js';
import { PB } from './geo.js';
import { clamp, lerp, prog, sine, outExpo, rng, TAU, hash } from './util.js';
import { glowText, fs, BOXES } from './text.js';
import { SINS, BG } from './idol.js';
import { CORE, createSilhouette } from './silhouette.js';
import * as H from './halo.js';

let S, B, R;
const C3 = h => new THREE.Color(h);
const D2R = Math.PI / 180;
export const SCAN_DUR = 0.3, DARK = 0.3;
// 姿态：傲慢头保持水平（只垂眼），懒惰更低，其余低头约 10 度
const POSE = { pride: '_level' };

// ------------------------------------------------------------ 构建
export function build(scene, beats, k) {
  S = scene; B = beats.beats; R = beats.R;
  S.idols = SINS.map((sin, i) => {
    const I = createSilhouette(sin, { pose: POSE[sin.id] ?? '_down' });
    I.halo = buildHalo(I, sin, i, k);
    I.regGlow = H.glowPlaneMesh(sin.col, 0.9, I.brain);   // 爆亮区域的光斑（大脑局部坐标）
    buildFeatures(I, i, k);
    I.root.visible = false;
    return I;
  });
  // 前景：少量大颗、失焦、飘得较快的光尘（挂在相机上）
  S.fgDust = new THREE.Points(fgDustGeo(70), fgDustMat()); S.fgDust.frustumCulled = false; S.fgDust.renderOrder = 90; K.camera.add(S.fgDust); K.mats.push(S.fgDust.material);
}

function buildHalo(I, sin, i, k) {
  const M = I.M, c = M.center, Rm = M.headH * 0.8;
  const group = new THREE.Group(); group.position.set(c[0], c[1], -0.3); I.g.add(group);
  const ringMesh = (mat, half, order) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(half * 2, half * 2), mat); m.renderOrder = order; m.frustumCulled = false; group.add(m); return m; };
  const main = ringMesh(H.mainRingPlane(Rm), Rm + 0.6, -5);
  main.material.uniforms.uCol.value.set(sin.col);
  // 冲击波：开光时从主环向外扩散的一圈光
  const shock = ringMesh(H.mainRingPlane(Rm, 3.2), Rm + 3.2, -4);
  shock.material.uniforms.uCol.value.set(sin.col); shock.material.uniforms.uW.value = 0.05;
  const rays = ringMesh(H.raysPlane(), 6.5, -12);
  rays.material.uniforms.uR0.value = Rm / 6.5;
  // 细环：刻度 · 点阵 · 几何折线（傲慢的第一层是羽毛状放射线），亮度约为主环的 1/3，相邻两层反向转
  const types = sin.id === 'pride' ? [['feather', Rm * 1.13], ['ticks', Rm * 1.3], ['dots', Rm * 1.45]] : [['ticks', Rm * 1.1], ['dots', Rm * 1.22], ['zigzag', Rm * 1.36]];
  const fine = types.map(([type, r], j) => {
    const g = new THREE.Group(); group.add(g);
    const mat = H.ringMaterial(sin.col, 1.8);
    const p = new THREE.Points(H.ringPB(type, r, 300 + i * 10 + j, k).geometry(THREE), mat); p.frustumCulled = false; p.renderOrder = -6; g.add(p); K.mats.push(mat);
    return { g, mat, base: type === 'feather' ? 1.3 : 1.8, dir: j % 2 ? 1 : -1, w: [0.05, 0.035, 0.022][j] };
  });
  // 体积光：从神像背后斜上方射下来（根部被不透明的剪影挡住）
  const shafts = new THREE.Mesh(new THREE.PlaneGeometry(16, 10), H.shaftsPlane()); shafts.renderOrder = -15; shafts.frustumCulled = false;
  shafts.position.set(c[0] + 0.5, c[1] + 0.6, -0.6); I.g.add(shafts);
  shafts.material.uniforms.uAsp.value = 1.6; shafts.material.uniforms.uO.value.set(0.5 - 0.5 / 16, 0.5 - 0.6 / 10);
  // 神像背后那一宗颜色的大片暗色光晕
  const bg = new THREE.Mesh(new THREE.PlaneGeometry(10, 10), H.glowPlane()); bg.renderOrder = -20; bg.frustumCulled = false; bg.position.set(c[0], c[1], -1); I.g.add(bg);
  // 神像和镜头之间的薄雾：暗部比前景稍微发灰、发淡
  const fog = new THREE.Mesh(new THREE.PlaneGeometry(9, 8), H.glowPlane()); fog.renderOrder = 20; fog.frustumCulled = false; fog.position.set(c[0] + 0.6, c[1] - 0.6, 0.4); I.g.add(fog);
  return { group, main, shock, rays, fine, shafts, bg, fog, Rm };
}

function crownPB(k) {
  // 头顶上方悬浮的一圈光刺王冠：细环 + 17 根长短交错的向上光刺
  const Rr = rng(77), pb = new PB(), N = n => Math.round(n * k);
  const rx = 0.6, rz = 0.55;
  for (let i = 0; i < N(3000); i++) { const a = Rr() * TAU; pb.add([Math.sin(a) * rx, (Rr() - 0.5) * 0.004, Math.cos(a) * rz], [0, 0, 0], Rr(), [0, 0, 0], [0, 0, 0, 1], [0.9, 30]); }
  for (let s = 0; s < 17; s++) {
    const a = (s / 17) * TAU, h = (s % 2 ? 0.035 : 0.1) * (0.8 + 0.4 * Math.abs(Math.cos(a)));
    const b = [Math.sin(a) * rx, 0, Math.cos(a) * rz];
    for (let j = 0; j < N(420); j++) {
      const u = Math.pow(Rr(), 0.6), w = 0.018 * Math.pow(1 - u, 1.5);
      pb.add([b[0] + (Rr() - 0.5) * w, u * h, b[2] + (Rr() - 0.5) * w], [0, 0, 0], Rr(), [0, 0, 0], [0, 0, 0, 1], [u > 0.92 ? 3.0 : 1.2, 30]);
    }
  }
  return pb;
}
function buildFeatures(I, i, k) {
  if (SINS[i].id === 'pride') {
    const mat = H.ringMaterial(CORE, 1.0); mat.uniforms.uSize.value = 0.009; mat.uniforms.uColB.value.set(SINS[i].col).lerp(C3(CORE), 0.4);
    const p = new THREE.Points(crownPB(k).geometry(THREE), mat); p.frustumCulled = false; p.renderOrder = 10;
    p.position.set(I.M.center[0] - 0.12, I.M.headTop - 0.06, 0); p.rotation.set(0.42, 0.26, I.M.brain.rot);   // 跟着头的角度倾斜，向镜头倾斜看得出是一圈
    I.g.add(p); K.mats.push(mat); I.feat.crown = p;
  }
}

// ------------------------------------------------------------ 前景光尘
function fgDustGeo(n) {
  const g = new THREE.BufferGeometry(), P = new Float32Array(n * 3), Sd = new Float32Array(n);
  for (let i = 0; i < n; i++) { P[i * 3] = hash(i * 1.7) * 2 - 1; P[i * 3 + 1] = hash(i * 2.9 + 3) * 2 - 1; P[i * 3 + 2] = -lerp(1.2, 3.0, hash(i * 4.1 + 7)); Sd[i] = hash(i * 5.3 + 1); }
  g.setAttribute('position', new THREE.BufferAttribute(P, 3)); g.setAttribute('aSeed', new THREE.BufferAttribute(Sd, 1));
  return g;
}
function fgDustMat() {
  return new THREE.ShaderMaterial({
    uniforms: { uTime: { value: 0 }, uCol: { value: C3(CORE) }, uAlpha: { value: 0.5 }, uBlow: { value: 0 }, uScale: { value: 1 } },
    transparent: true, depthWrite: false, depthTest: false, blending: THREE.AdditiveBlending,
    vertexShader: /* glsl */`
      attribute float aSeed; uniform float uTime, uBlow, uScale, uAlpha; varying float vB;
      void main(){
        float z = position.z, hw = -z*0.315*1.778, hh = -z*0.315;
        vec2 v = vec2(0.05 + 0.08*aSeed, 0.02*sin(aSeed*20.0))*(1.0 + aSeed);
        vec2 p = position.xy + v*uTime/(-z);
        p = mod(p + 1.0, 2.0) - 1.0;
        p += normalize(p + 0.001)*uBlow*(0.4 + 0.6*aSeed);           // 冲击波把光尘吹散
        vec4 mv = vec4(p.x*hw, p.y*hh, z, 1.0);
        gl_Position = projectionMatrix*mv;
        gl_PointSize = (18.0 + 40.0*aSeed)*uScale*2.0/(-z);
        vB = uAlpha*(0.25 + 0.75*fract(aSeed*7.7))*(0.6 + 0.4*sin(uTime*1.3 + aSeed*30.0));
      }`,
    fragmentShader: /* glsl */`uniform vec3 uCol; varying float vB;
      void main(){ vec2 c = gl_PointCoord - 0.5; float d = length(c)*2.0; if (d > 1.0) discard;
        float a = smoothstep(1.0, 0.55, d)*0.55 + smoothstep(0.9, 0.8, d)*0.25;       // 失焦的光斑：边缘略亮的圆盘
        gl_FragColor = vec4(uCol*a*vB*0.25, 1.0); }`,
  });
}

// ------------------------------------------------------------ 节拍工具
const lastBeat = t => { let lo = 0, hi = B.length - 1, r = -1; while (lo <= hi) { const m = (lo + hi) >> 1; if (B[m] <= t + 1e-9) { r = m; lo = m + 1; } else hi = m - 1; } return r; };
export function beatPulse(t) { const i = lastBeat(t); if (i < 0) return 0; const d = t - B[i]; return d < 0.15 ? 1 - d / 0.15 : 0; }
export function cardTimes(i) { return { A: R[2 * i], Bt: R[2 * i + 1], E: R[2 * i + 2] }; }
export function events() {
  const ev = [];
  SINS.forEach((s, i) => {
    const { A, Bt, E } = cardTimes(i);
    ev.push({ name: `${s.name} 开光`, t: A }, { name: `${s.name} 扫描线扫过（开始）`, t: Bt }, { name: `${s.name} 收拢暗下（完成）`, t: E });
  });
  ev.push({ name: '结尾 七尊归位', t: R[14] }, { name: '结尾 同时亮起 + 问话', t: R[15] });
  return ev;
}

// ------------------------------------------------------------ 镜头：低机位仰视
// 解出相机位置：俯仰角 pitch（向上为正），头顶在画面上缘下方 top，头顶到下巴占画面高度 frac，头部中心在横向 xFrac
const TAN = Math.tan(17.5 * D2R), ASP = 16 / 9;
function solveCam(M, pitchDeg, frac, top = 0.04, xFrac = 0.64) {
  const p = pitchDeg * D2R, f = [0, Math.sin(p), -Math.cos(p)], u = [0, Math.cos(p), Math.sin(p)];
  const ndcY = (C, P) => { const r = [P[0] - C[0], P[1] - C[1], P[2] - C[2]]; const zc = r[1] * f[1] + r[2] * f[2]; return (r[1] * u[1] + r[2] * u[2]) / (zc * TAN); };
  const topP = [0, M.headTop, 0], chinP = [0, M.chin, 0];
  const want = [1 - 2 * top, 1 - 2 * top - 2 * frac];
  let C = [0, M.chin - 1.0, 6.5];
  for (let it = 0; it < 30; it++) {
    const F = Ci => [ndcY(Ci, topP) - want[0], ndcY(Ci, chinP) - want[1]];
    const r0 = F(C), e = 1e-4;
    const ry = F([C[0], C[1] + e, C[2]]), rz = F([C[0], C[1], C[2] + e]);
    const J = [[(ry[0] - r0[0]) / e, (rz[0] - r0[0]) / e], [(ry[1] - r0[1]) / e, (rz[1] - r0[1]) / e]];
    const det = J[0][0] * J[1][1] - J[0][1] * J[1][0];
    C[1] -= (J[1][1] * r0[0] - J[0][1] * r0[1]) / det; C[2] -= (-J[1][0] * r0[0] + J[0][0] * r0[1]) / det;
  }
  const cen = M.center, zc = (cen[1] - C[1]) * f[1] + (0 - C[2]) * f[2];
  C[0] = cen[0] - (2 * xFrac - 1) * zc * TAN * ASP;
  return { pos: C, target: [C[0] + f[0], C[1] + f[1], C[2] + f[2]], fov: 35 };
}

// ------------------------------------------------------------ 每帧状态
export function frame(t) {
  S.idols.forEach(I => { I.root.visible = false; });
  S.scanLine.visible = S.scanSoft.visible = S.pillar.visible = false;
  const F = { bursts: [], bloom: 0.42, nebula: 1, shake: 0, faces: [], text: null };
  if (t < R[0]) cardFrame(0, R[0] + 1.0, F);            // 开头、结尾：傲慢确认后再做
  else if (t < R[14]) { let i = 0; while (i < 6 && t >= R[2 * i + 2]) i++; cardFrame(i, t, F); }
  else cardFrame(6, R[14] - 0.31, F);
  return F;
}

function cardFrame(i, t, F) {
  const sin = SINS[i], I = S.idols[i], Hl = I.halo, M = I.M;
  const { A, Bt, E } = cardTimes(i);
  const open = t - A, dark = sine(prog(t, E - DARK, E)), pulse = beatPulse(t);
  const flash = open >= 0 ? Math.exp(-open * 5) : 0;
  const ign = outExpo(clamp(open / 0.25));
  const live = 1 - 0.85 * dark;
  I.root.visible = true;
  // 神像几乎不动：只有极慢的呼吸（±0.6%，周期 4 秒）
  I.root.scale.setScalar(1 + 0.006 * Math.sin(TAU * t / 4));
  // 剪影与轮廓光
  const ru = I.rim.material.uniforms;
  ru.uBright.value = 0.95 * lerp(0.35, 1, ign) * live * (1 + 0.25 * flash); ru.uScale.value = K.scale;
  I.fill.material.uniforms.uBright.value = 0.12 * live; I.fill.material.uniforms.uScale.value = K.scale;
  I.eye.material.uniforms.uInt.value = 1.25 * lerp(0.3, 1, ign) * live; I.eyeHalo.material.uniforms.uInt.value = 0.25 * live;
  // 光环：开光时从中心一层层展开（0.4 秒内到位）；每一拍主环亮一下
  const e0 = outExpo(clamp(open / 0.26));
  Hl.main.scale.setScalar(lerp(0.12, 1, e0) * (1 - 0.3 * dark));
  Hl.main.material.uniforms.uInt.value = clamp(e0 * 1.5) * (1.0 + 0.6 * flash + 0.45 * pulse) * live;
  Hl.fine.forEach((L, j) => {
    const e = outExpo(clamp((open - 0.05 * (j + 1)) / 0.26));
    L.g.scale.setScalar(lerp(0.1, 1, e) * (1 - 0.35 * dark));
    L.g.rotation.z = L.dir * L.w * t + j * 0.4;
    L.mat.uniforms.uBright.value = L.base * clamp(e * 1.4) * (1 + 0.6 * flash) * live;
  });
  // 冲击波
  const sk = clamp(open / 0.7);
  Hl.shock.visible = open >= 0 && open < 0.7;
  Hl.shock.material.uniforms.uR.value = Hl.Rm * lerp(0.9, 2.6, outExpo(sk)); Hl.shock.material.uniforms.uInt.value = 0.7 * (1 - sk) * (1 - sk);
  const rr = Hl.rays.material.uniforms;
  rr.uCol.value.set(sin.col).lerp(C3(CORE), 0.25); rr.uBurst.value = 0.4 + 0.6 * outExpo(clamp(open / 0.4)); rr.uRot.value = 0.02 * t;
  rr.uInt.value = (0.22 + 0.5 * flash) * live;
  const su = Hl.shafts.material.uniforms; su.uCol.value.set(sin.col).lerp(C3(CORE), 0.2); su.uInt.value = 0.3 * (0.5 + 0.5 * ign) * live * (1 + 0.8 * flash);
  Hl.bg.material.uniforms.uCol.value.set(sin.col); Hl.bg.material.uniforms.uInt.value = 0.06 * live * (1 + 0.4 * flash);
  Hl.fog.material.uniforms.uCol.value.set('#8C86A0').lerp(C3(sin.col), 0.3); Hl.fog.material.uniforms.uInt.value = 0.035 * (1 - 0.5 * dark);
  if (I.feat.crown) I.feat.crown.material.uniforms.uBright.value = 2.0 * lerp(0.3, 1, ign) * live;
  // B 卡：扫描线扫过 → 剪影内部半透明，露出侧面大脑，对应区域爆亮，光柱冲出头顶
  const sb = t - Bt;
  const c = M.center;
  const x0 = c[0] - 1.7, x1 = c[0] + 1.3;
  const sx = sb >= 0 ? lerp(x0, x1, clamp(sb / SCAN_DUR)) : -99;
  I.body.material.uniforms.uSeeX.value = sx; I.body.material.uniforms.uSee.value = sb >= 0 ? 0.55 : 0;
  const scanAmt = sb >= 0 ? Math.max(0, 1 - Math.max(0, sb - SCAN_DUR) / 0.12) : 0;
  I.brain.visible = sb >= 0; I.regGlow.visible = sb >= 0;
  const bu = I.brain.material.uniforms;
  bu.uSeeX.value = sx; bu.uBright.value = 1.6 * live;
  REGION[sin.id](sb, bu, F, I);
  if (sb >= 0) {
    S.scanLine.visible = S.scanSoft.visible = scanAmt > 0.01;
    S.scanLine.position.set(sx, c[1], 0.5); S.scanSoft.position.set(sx, c[1], 0.45);
    S.scanLine.material.uniforms.uCol.value.set(sin.col).lerp(C3(CORE), 0.5); S.scanLine.material.uniforms.uInt.value = 1.0 * scanAmt;
    S.scanSoft.material.uniforms.uCol.value.set(sin.col); S.scanSoft.material.uniforms.uInt.value = 0.16 * scanAmt;
    const pk = sb - 0.15;
    if (pk > 0) {
      S.pillar.visible = true; S.pillar.position.set(M.brain.pos[0] - 0.75 * M.brain.scale, M.headTop - 0.2 + 3.0, 0.1);
      S.pillar.material.uniforms.uCol.value.set(sin.col); S.pillar.material.uniforms.uTime.value = t;
      S.pillar.material.uniforms.uInt.value = (1.2 + 1.8 * Math.exp(-pk * 3.5)) * outExpo(clamp(pk / 0.12)) * (1 - dark);
    }
  }
  // 镜头：低机位仰视约 15 度；整张卡极缓慢地上摇、推近
  const u = clamp((t - A) / (E - A));
  const ov = window.CAM_OVERRIDE;   // 特写截图用：{ pitch, frac, top, xFrac }
  F.cam = ov ? solveCam(M, ov.pitch, ov.frac, ov.top, ov.xFrac) : solveCam(M, lerp(15, 16.5, u), lerp(0.65, 0.69, u));
  // 前景光尘：开光时被冲击波吹散
  const fu = S.fgDust.material.uniforms; fu.uTime.value = t; fu.uScale.value = K.scale; fu.uCol.value.set(sin.col).lerp(C3(CORE), 0.6);
  fu.uBlow.value = open >= 0 ? 0.9 * outExpo(clamp(open / 0.5)) * Math.exp(-Math.max(0, open - 0.5) * 1.2) : 0; fu.uAlpha.value = 0.5 * live;
  F.bloom = 0.42 + 0.2 * flash;
  F.neb = { b: C3(BG), d: C3('#000000'), m: C3('#000000'), h: C3(sin.col).multiplyScalar(0.05) };
  F.nebula = 1; F.dustCol = C3(sin.col).lerp(C3(CORE), 0.5); F.dust = 0.35 * live;
  F.text = { i, A, Bt, E, dark };
  F.faces = faceBox(I);
}

// 大脑里爆亮的区域（侧面大脑模型的局部坐标：前额在 -x，上为 +y）
const REGION = {
  pride(sb, u, F, I) {
    const k = sb < 0.15 ? 0 : 2.2 + 2.0 * Math.exp(-(sb - 0.15) * 4);
    u.uRegC.value[0].set(-0.95, 0.15, 0, k); u.uRegC.value[1].set(-0.8, 0.45, 0, k); u.uRegC.value[2].set(-1.02, -0.12, 0, k * 0.8); u.uRegR.value = 0.09;
    I.regGlow.position.set(-0.92, 0.18, 0.05); I.regGlow.material.uniforms.uInt.value = 1.4 * k / 2.2;
  },
};
for (const s of SINS) if (!REGION[s.id]) REGION[s.id] = REGION.pride;

// 剪影轮廓在屏幕上的位置（qa：文字和轮廓光之间至少 100px）
function faceBox(I) {
  I.root.updateMatrixWorld(true);
  const pts = I.M.contour.filter(([x, y]) => y > -1.2).map(([x, y]) => project(new THREE.Vector3(x, y, 0).applyMatrix4(I.g.matrixWorld).toArray()));
  return [{ x0: Math.min(...pts.map(p => p[0])), x1: Math.max(...pts.map(p => p[0])), y0: Math.min(...pts.map(p => p[1])), y1: Math.max(...pts.map(p => p[1])), label: I.sin.name, pts }];
}

// ------------------------------------------------------------ 文字
const TX = 212, NX = 112;
export function text(t, ctx, F) {
  const T = F.text; if (!T) return;
  const sin = SINS[T.i], fade = 1 - T.dark;
  ctx.save();
  const g = ctx.createLinearGradient(0, 0, 820, 0);
  g.addColorStop(0, 'rgba(0,0,0,0.55)'); g.addColorStop(0.7, 'rgba(0,0,0,0.3)'); g.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.globalAlpha = fade; ctx.fillStyle = g; ctx.fillRect(0, 0, 820, 1080); ctx.restore();
  const open = t - T.A, inA = clamp(open / 0.18);
  const pop = 1 + 0.12 * Math.exp(-open * 8);
  [...sin.name].forEach((ch, j) => {
    ctx.save(); ctx.translate(NX, 420 + j * 196); ctx.scale(pop, pop);
    glowText(ch, 0, 0, fs(900, 180), sin.col, { alpha: inA * fade, glow: 40, glow2: 80, glowColor: sin.col, shadowBlur: 18 });
    ctx.restore();
  });
  BOXES.push({ x0: NX - 95, y0: 420 - 100, x1: NX + 95, y1: 420 + 196 + 100, label: sin.name, alpha: inA * fade });
  const sb = t - T.Bt;
  const light = '#' + C3(sin.col).lerp(C3('#FFFFFF'), 0.55).getHexString();
  if (sb < 0) {
    const out = 1 - clamp((sb + 0.08) / 0.08);
    glowText(`七宗罪 · 0${T.i + 1}`, TX, 395, fs(600, 30), light, { alpha: clamp(open / 0.15) * fade * out, align: 'left', glow: 12, glowColor: sin.col });
    quoteLines(sin.quote).forEach((line, j) => glowText(line, TX - (j === 0 ? 14 : 0), 475 + j * 72, fs(700, 52), '#FFFFFF', { alpha: clamp((open - 0.06 - j * 0.06) / 0.2) * fade * out, align: 'left', glow: 18, glowColor: sin.col }));
  } else {
    const a = clamp(sb / 0.15) * fade;
    glowText(`出厂设置 0${T.i + 1}`, TX, 395, fs(600, 30), light, { alpha: a, align: 'left', glow: 12, glowColor: sin.col });
    sin.fact.split('\n').forEach((line, j) => glowText(line, TX, 480 + j * 80, fs(800, 60), '#FFFFFF', { alpha: clamp((sb - 0.05 - j * 0.08) / 0.2) * fade, align: 'left', glow: 22, glowColor: sin.col }));
    const nl = sin.fact.split('\n').length;
    srcLines(sin.src).forEach((line, j) => glowText(line, TX, 480 + nl * 80 + 8 + j * 40, fs(500, 28), '#C8C8D2', { alpha: clamp((sb - 0.2) / 0.25) * fade * 0.95, align: 'left', glow: 6, glowColor: '#000000' }));
  }
}
// 心里话在逗号后断成两行（52px，保证离剪影轮廓 100px 以上）
// 出处超过约 14 个字时在「·」后换行
function srcLines(s) { const k = s.indexOf(' · '); return s.length > 14 && k > 0 ? [s.slice(0, k + 2), s.slice(k + 3)] : [s]; }
function quoteLines(q) { const k = q.indexOf('，'); return k > 0 ? [q.slice(0, k + 1), q.slice(k + 1)] : [q]; }
