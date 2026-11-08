// GL 引擎：渲染器、辉光、动物粒子（含拖尾的三层影子）、眼睛、能量光环、地面冲击波、镜头
// 时间一律用“觉醒时间” a：a = 2.0 是觉醒的一刻（对准小节第一拍），由 main.js 从真实时间换算过来。
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { beastMaterial, fxPointsMaterial, glowMaterial, FinalShader, SHARED } from './shaders.js';
import { loadMesh, samplePoints } from './sample.js';
import { buildFX } from './fx.js';
import { makeAction } from './action.js';
import { clamp, lerp, smooth, outCubic, hash, rng, D2R, mixHex } from './util.js';

export const HIT = 2.0;            // 觉醒时刻（觉醒时间）
export const E = {};               // 引擎状态

function geo(attrs) {
  const g = new THREE.BufferGeometry();
  for (const [k, [arr, n]] of Object.entries(attrs)) g.setAttribute(k, new THREE.BufferAttribute(arr, n));
  return g;
}
export function addPoints(g, mat, order = 0, parent = E.scene) { const p = new THREE.Points(g, mat); p.frustumCulled = false; p.renderOrder = order; parent.add(p); E.mats.push(mat); return p; }
export function addGlow(mode, color, size, order = 10, o = {}) {
  const m = new THREE.Mesh(new THREE.PlaneGeometry(size, size), glowMaterial(mode, color, o)); m.frustumCulled = false; m.renderOrder = order; m.userData.billboard = true; E.scene.add(m); E.glows.push(m); return m;
}

export async function initEngine(canvas, ep, { W, H, mode, beat }) {
  E.ep = ep; E.mode = mode; E.W = W; E.H = H; E.beat = beat; E.asm0 = arguments[2].asm0 ?? 0.5; E.mats = []; E.glows = [];
  const renderer = new THREE.WebGLRenderer({ canvas, preserveDrawingBuffer: true, antialias: false, alpha: false });
  renderer.setPixelRatio(1); renderer.setSize(W, H, false); renderer.setClearColor(0x000000, 1);
  const scene = new THREE.Scene(), camera = new THREE.PerspectiveCamera(32, W / H, 0.05, 200);
  scene.add(camera);
  const composer = new EffectComposer(renderer); composer.setPixelRatio(1); composer.setSize(W, H);
  composer.addPass(new RenderPass(scene, camera));
  const bloom = new UnrealBloomPass(new THREE.Vector2(W, H), 0.55, 0.45, 0.62); composer.addPass(bloom);
  const final = new ShaderPass(FinalShader); final.uniforms.uRes.value.set(W, H); composer.addPass(final);
  composer.addPass(new OutputPass());
  Object.assign(E, { renderer, scene, camera, composer, bloom, final });
  SHARED.uPx.value = 300 * (H / 1080);

  // ---- 网格 → 粒子
  const meta = await (await fetch(`assets/models/${ep.animal.model}.json`)).json();
  const buf = await (await fetch(`assets/models/${ep.animal.model}.bin`)).arrayBuffer();
  const mesh = loadMesh(meta, buf);
  const eyes = meta.eyes.map(e => new THREE.Vector3(...e.c));
  const C = eyes[0].clone().add(eyes[1]).multiplyScalar(0.5);
  E.C = C; E.eyes = eyes; E.meta = meta;
  const camHero = heroCam(3.0, true);
  const S = ep.sample ?? {};
  const pts = samplePoints(mesh, {
    n: S.n ?? 230000, seed: 11, cam: camHero.pos.toArray(), eyeMid: C.toArray(), key: [0.25, 1, 0.45],
    furFrac: S.furFrac ?? 0.08, furLen: S.furLen ?? 0.06, furScale: S.furScale, comb: S.comb ?? [0, -0.3, -1], bulge: S.bulge ?? 1,
    matGain: S.matGain ?? { Main: 0.95, Main_Light: 1.2, Nose: 0.3, Eyes_Black: 0.15 }, skipMat: S.skipMat ?? ['Eyes_Black'],
  });
  E.count = pts.count; E.surface = pts.surface;
  const g = geo({ position: [pts.pos, 3], aNrm: [pts.nrm, 3], aComb: [pts.comb, 3], aMisc: [pts.misc, 4], aChain: [pts.chain, 4] });
  const hex = ep.color;
  const matOpts = { col: hex, hi: mixHex(hex, '#FFFFFF', 0.72), rim: mixHex(hex, '#FFFFFF', 0.35), bright: ep.bright ?? 1.7, size: 0.0068 };
  E.beast = addPoints(g, beastMaterial(matOpts), 5);
  // 拖尾：同一批粒子，时间往回错开几帧、只画一部分、越来越暗；只在汇聚途中可见
  E.ghosts = Array.from({ length: 10 }, (_, i) => 0.022 * (i + 1)).map((lag, i) => {
    const gm = beastMaterial(matOpts); gm.uniforms.uLag.value = lag; gm.uniforms.uGhost.value = 0.5 + 0.55 * Math.pow(1 - i / 10, 1.6);
    const p = addPoints(g, gm, 4); p.geometry = g.clone(); p.geometry.setDrawRange(0, Math.floor(pts.count * 0.45)); return p;
  });

  // ---- 眼睛：两个最亮的发光点（加在模型眼球表面略前方）
  E.eyeGlows = eyes.map(e => addGlow(1, mixHex(hex, '#FFFFFF', 0.25), 0.55, 30, { core: '#FFFFFF' }));
  // ---- 能量光环（觉醒时炸开）+ 常驻的细光环
  E.ringBurst = addGlow(2, mixHex(hex, '#FFFFFF', 0.15), 1, -5, { core: '#FFFFFF' });
  E.ringBurst2 = addGlow(2, hex, 1, -5, { core: mixHex(hex, '#FFFFFF', 0.5) });
  E.ringStay = addGlow(2, hex, 1, -6, { core: mixHex(hex, '#FFFFFF', 0.4) });
  E.backGlow = addGlow(0, hex, 1, -8);
  // 光环上飞出的火花
  {
    const n = 2600, P = new Float32Array(n * 3), M = new Float32Array(n * 4);
    for (let i = 0; i < n; i++) { const a = hash(i * 1.37) * Math.PI * 2; P[i * 3] = Math.cos(a); P[i * 3 + 1] = Math.sin(a); P[i * 3 + 2] = (hash(i * 2.1) - 0.5) * 0.2; M.set([0.6 + 0.8 * hash(i * 3.3), hash(i * 4.7), 0.5 + hash(i * 5.9), hash(i * 6.1)], i * 4); }
    E.sparks = addPoints(geo({ position: [P, 3], aMisc: [M, 4] }), fxPointsMaterial({
      col: hex, hi: '#FFFFFF', size: 0.012, maxPx: 5, bright: 1,
      uniforms: { uT: { value: -1 }, uR0: { value: 0.5 }, uRight: { value: new THREE.Vector3(1, 0, 0) }, uUp: { value: new THREE.Vector3(0, 1, 0) }, uO: { value: new THREE.Vector3() } },
      uniformDecl: 'uniform float uT, uR0; uniform vec3 uRight, uUp, uO;',
      posHook: `
        float life = 0.5 + 0.6*aMisc.w;
        float k = clamp(uT/life, 0.0, 1.0); vis = step(0.0, uT)*step(uT, life);
        float r = uR0 + (1.0 - exp(-uT*4.0))*(0.9 + 1.6*aMisc.z);
        p = uO + (uRight*position.x + uUp*position.y)*r + uUp*(-0.25*uT*uT);
        b *= (1.0 - k)*(1.0 - k)*1.4; hot = 1.0 - k*2.0; sz = 1.0 + (1.0 - k);`,
    }), 40);
  }
  // ---- 地面冲击波：地面上的一片细点，只在波前经过时亮起
  {
    const n = 26000, P = new Float32Array(n * 3), M = new Float32Array(n * 4), R = rng(5);
    for (let i = 0; i < n; i++) { const r = Math.sqrt(R()) * 9, a = R() * Math.PI * 2; P[i * 3] = Math.cos(a) * r; P[i * 3 + 1] = 0; P[i * 3 + 2] = Math.sin(a) * r; M.set([0.5 + R(), R(), r, 0], i * 4); }
    E.groundY = C.y + (ep.groundOffset ?? -1.25);
    E.ground = addPoints(geo({ position: [P, 3], aMisc: [M, 4] }), fxPointsMaterial({
      col: hex, hi: '#FFFFFF', size: 0.016, maxPx: 4, bright: 1.2,
      uniforms: { uWave: { value: -1 }, uO: { value: new THREE.Vector3() }, uBase: { value: 0 } },
      uniformDecl: 'uniform float uWave, uBase; uniform vec3 uO;',
      posHook: `
        float r = aMisc.z; float d = r - uWave;
        float front = exp(-d*d*10.0)*step(0.0, uWave) + exp(-max(-d, 0.0)*1.6)*step(d, 0.0)*0.12*step(0.0, uWave);
        float fade = smoothstep(9.0, 3.0, r)*smoothstep(0.0, 0.8, uWave)*(1.0 - smoothstep(6.0, 9.0, uWave));
        p = uO + position + vec3(0.0, front*0.05, 0.0);
        b *= front*fade + uBase*0.12*smoothstep(9.0, 2.0, r); hot = front*0.6;`,
    }), 2);
    E.ground.position.set(0, 0, 0);
  }
  // ---- 专属动作 + 叫声的涟漪
  E.act = makeAction(meta, ep, HIT, beat);
  if (E.act) {
    const V = ep.action.voice ?? { rings: 4, gap: 0.5 }, nr = V.rings, per = 5000, P = new Float32Array(nr * per * 3), M = new Float32Array(nr * per * 4);
    for (let k = 0; k < nr; k++) for (let i = 0; i < per; i++) { const j = k * per + i; M.set([0.7 + 0.6 * hash(j * 1.7), hash(j * 2.3), k, i / per * Math.PI * 2], j * 4); }
    E.ripples = addPoints(geo({ position: [P, 3], aMisc: [M, 4] }), fxPointsMaterial({
      col: mixHex(hex, '#FFFFFF', 0.35), hi: '#FFFFFF', size: 0.013, maxPx: 4, bright: 1.3,
      uniforms: { uA: { value: 0 }, uH: { value: HIT }, uGap: { value: V.gap * beat }, uO: { value: new THREE.Vector3() }, uD: { value: new THREE.Vector3(0, 1, 0) }, uE1: { value: new THREE.Vector3(1, 0, 0) }, uE2: { value: new THREE.Vector3(0, 0, 1) } },
      uniformDecl: 'uniform float uA, uH, uGap; uniform vec3 uO, uD, uE1, uE2;',
      posHook: `
        float k = aMisc.z, tau = uA - (uH + k*uGap), life = 1.5;
        vis = step(0.0, tau)*step(tau, life);
        // 朝向镜头的弧（像“(((”），只画朝月亮那一侧的大半圈；圆心沿屏幕方向往月亮走，同时变大
        float r = 0.12 + 0.95*tau + (h1(aMisc.y*5.3) - 0.5)*0.05*(1.0 + tau);
        vec2 cs = vec2(cos(aMisc.w), sin(aMisc.w));
        p = uO + uD*(0.55*tau) + (uE1*cs.x + uE2*cs.y)*r;
        float side = smoothstep(0.15, 0.75, cs.x);
        float f = clamp(tau/life, 0.0, 1.0); b *= side*pow(1.0 - f, 1.3)*(0.75 + 0.25*h1(aMisc.y*9.0)); hot = 1.0 - f*1.6; sz = 1.0 + 0.6*(1.0 - f);`,
    }), 46);
    // 月亮放在嚎叫的方向上：从嘴沿嚎叫方向在屏幕上走 moonPx 像素，深度在头后面 moonDepth
    const m = E.act.mouth(1), hc = heroCam(HIT + 1.5);
    const cam = new THREE.PerspectiveCamera(hc.fov, W / H, 0.05, 200); cam.position.copy(hc.pos); cam.lookAt(hc.target); cam.updateMatrixWorld(); cam.updateProjectionMatrix();
    const s0 = m.pos.clone().project(cam), s1 = m.pos.clone().addScaledVector(m.dir, 0.3).project(cam);
    const d = new THREE.Vector2((s1.x - s0.x) * W, (s1.y - s0.y) * H).normalize();
    const px = (mode === 'card' ? ep.cardMoonPx : ep.moonPx) ?? 560;
    const sx = s0.x + d.x * px * 2 / W, sy = s0.y + d.y * px * 2 / H;
    const ray = new THREE.Vector3(sx, sy, 0.5).unproject(cam).sub(cam.position).normalize();
    const depth = C.distanceTo(cam.position) + (ep.moonDepth ?? 7);
    const fwd0 = new THREE.Vector3(); cam.getWorldDirection(fwd0);
    E.moonPos = cam.position.clone().addScaledVector(ray, depth / ray.dot(fwd0));
  }
  // ---- 专属特效
  E.fx = buildFX(ep.fx, { E, THREE, addPoints, addGlow, geo, C, hex });
  return E;
}

// ------------------------------------------------------------ 英雄镜头
export function heroCam(a, still = false) {
  const c = { ...E.ep.camera, ...(window.CAM_OVERRIDE || {}) }, card = E.mode === 'card';
  const C = E.C;
  const aim = new THREE.Vector3(...(card ? (c.cardAim ?? [0, -0.55, 0]) : c.aim));
  const target = C.clone().add(aim);
  let k;
  if (a < HIT) k = lerp(1.08, 1.0, smooth(0.3, HIT, a));
  else k = 1.0 - c.push * outCubic((a - HIT) / 1.2) - 0.012 * Math.max(0, a - HIT - 1.2);
  const yaw = (c.yaw + (a - HIT) * 1.6) * D2R, pitch = c.pitch * D2R;
  const dist = (card ? (c.cardDist ?? c.dist * 1.25) : c.dist) * k;
  const pos = target.clone().add(new THREE.Vector3(Math.sin(yaw) * Math.cos(pitch), Math.sin(pitch), Math.cos(yaw) * Math.cos(pitch)).multiplyScalar(dist));
  return { pos, target, fov: card ? (c.cardFov ?? 34) : c.fov };
}

// 拍点：觉醒之后每一拍的脉冲（0–1，拍上为 1，指数衰减）
export function beatPulse(a, sharp = 7) {
  if (a < HIT) return 0;
  const ph = ((a - HIT) / E.beat) % 1;
  return Math.exp(-ph * sharp);
}

export function frame(a, t) {
  const ep = E.ep, hex = ep.color;
  SHARED.uTime.value = t;
  const cam = heroCam(a);
  // 觉醒时的镜头震动（≤ 6px），0.35 秒内衰减
  const sh = a >= HIT ? Math.exp(-(a - HIT) * 11) * (a - HIT < 0.4 ? 1 : 0) : 0;
  E.camera.position.copy(cam.pos); E.camera.up.set(0, 1, 0); E.camera.lookAt(cam.target); E.camera.fov = cam.fov; E.camera.updateProjectionMatrix(); E.camera.updateMatrixWorld();
  const right = new THREE.Vector3().setFromMatrixColumn(E.camera.matrixWorld, 0), up = new THREE.Vector3().setFromMatrixColumn(E.camera.matrixWorld, 1);
  const fwd = new THREE.Vector3(); E.camera.getWorldDirection(fwd);
  if (sh > 0.001) {
    const amp = 0.016 * cam.pos.distanceTo(cam.target) / 3.4;
    const off = right.clone().multiplyScalar(Math.sin(a * 113) * amp * sh).add(up.clone().multiplyScalar(Math.cos(a * 89) * amp * sh));
    E.camera.position.add(off); E.camera.updateMatrixWorld();
  }
  const pulse = beatPulse(a);
  const after = a >= HIT ? 1 : 0, da = a - HIT;
  // ---- 动物
  const kick = after ? 0.075 * (da / 0.07) * Math.exp(1 - da / 0.07) : 0;
  const wind = after ? smooth(0, 0.35, da) * (0.85 + 0.25 * pulse) : 0;
  // 专属动作的骨骼矩阵
  const aw = E.act ? E.act.weight(a) : 0;
  const mats = E.act ? E.act.pose(aw) : null;
  for (const p of [E.beast, ...E.ghosts]) {
    const u = p.material.uniforms;
    if (mats) u.uAct.value.forEach((m, i) => m.copy(mats[i]));
    u.uA.value = a; u.uAsm0.value = E.asm0; u.uC.value.copy(E.C); u.uAxis.value.copy(fwd).negate(); u.uCam.value.copy(E.camera.position);
    u.uKick.value = kick; u.uWind.value = wind; u.uPulse.value = pulse * after; u.uFlow.value = after ? smooth(0, 0.6, da) : 0.25;
    u.uWindDir.value.set(...(ep.windDir ?? [0.15, 0.2, -1])).normalize();
  }
  for (const p of E.ghosts) p.visible = a > E.asm0 - 0.05 && a < HIT + 0.05;
  // ---- 眼睛：第 0 帧就亮着；觉醒时冲到最亮再回落
  let eyeI = lerp(0.3, 0.85, smooth(0, E.asm0, a)) + 0.05 * Math.sin(a * 9);
  const eyeOpen = lerp(0.1, 1, smooth(0.02, E.asm0 * 0.85, a));   // 片头：眼睛从一条缝慢慢睁开
  let flare = 0.15;
  if (after) { const sp = Math.exp(-da / 0.09); eyeI = 1.0 + 1.5 * sp + 0.08 * pulse; flare = 0.35 + 1.6 * sp + 0.15 * pulse; }
  else if (a > 1.5) eyeI += 0.25 * smooth(1.5, HIT, a);
  const qn = E.camera.quaternion;
  E.eyeGlows.forEach((g, i) => {
    const e = mats ? E.eyes[i].clone().applyMatrix4(mats[E.act.headSlot]) : E.eyes[i];
    g.position.copy(e).add(new THREE.Vector3(0, 0.0, 0.03)).addScaledVector(fwd, -0.05);
    // 远侧的眼睛被吻部挡住一部分：按眼睛朝向镜头的程度变暗变小
    const z0 = new THREE.Vector3(...E.meta.eyes[i].z); if (mats) z0.transformDirection(mats[E.act.headSlot]);
    const z = [z0.x, z0.y, z0.z], toCam = E.camera.position.clone().sub(e).normalize();
    const vis = clamp(0.35 + 0.9 * (z[0] * toCam.x + z[1] * toCam.y + z[2] * toCam.z), 0.3, 1);
    g.userData.vis = vis;
    g.material.uniforms.uInt.value = eyeI * vis; g.material.uniforms.uFlare.value = flare * vis;
    const s = (0.5 + 0.18 * (after ? Math.exp(-da / 0.12) : 0)) * (E.mode === 'card' ? 1.2 : 1);
    g.scale.setScalar(s * (0.6 + 0.4 * g.userData.vis)); g.scale.y *= eyeOpen; g.scale.x *= lerp(1.6, 1, eyeOpen);
  });
  // ---- 光环：觉醒一刻在头后面炸开，之后留一圈细光环随拍呼吸
  const behind = E.C.clone().addScaledVector(fwd, 1.6).addScaledVector(up, 0.12);
  const rb = E.ringBurst.material.uniforms, rb2 = E.ringBurst2.material.uniforms;
  if (after && da < 0.9) {
    const k = outCubic(da / 0.6);
    E.ringBurst.visible = E.ringBurst2.visible = true;
    E.ringBurst.position.copy(behind); E.ringBurst2.position.copy(behind);
    E.ringBurst.scale.setScalar(lerp(2.2, 6.5, k)); E.ringBurst2.scale.setScalar(lerp(2.0, 4.6, outCubic(da / 0.75)));
    rb.uRing.value = 0.62; rb.uWidth.value = lerp(0.018, 0.008, k); rb.uInt.value = 0.7 * Math.pow(1 - clamp(da / 0.7), 1.6);
    rb2.uRing.value = 0.62; rb2.uWidth.value = 0.035; rb2.uInt.value = 0.18 * Math.pow(1 - clamp(da / 0.9), 2);
  } else E.ringBurst.visible = E.ringBurst2.visible = false;
  const rs = E.ringStay.material.uniforms;
  E.ringStay.visible = after === 1;
  E.ringStay.position.copy(behind); E.ringStay.scale.setScalar(2.4 + 0.04 * pulse);
  rs.uRing.value = 0.62; rs.uWidth.value = 0.006; rs.uInt.value = (0.2 + 0.16 * pulse) * smooth(0.05, 0.4, da);
  E.backGlow.position.copy(behind); E.backGlow.scale.setScalar(4.4);
  E.backGlow.material.uniforms.uInt.value = after ? (0.012 + 0.025 * Math.exp(-da / 0.25) + 0.006 * pulse) : 0.008 * smooth(0.5, HIT, a);
  // 火花
  const su = E.sparks.material.uniforms; su.uT.value = after ? da : -1; su.uO.value.copy(behind); su.uR0.value = 0.9; su.uRight.value.copy(right); su.uUp.value.copy(up);
  // 地面冲击波
  const gu = E.ground.material.uniforms; gu.uWave.value = after ? da * 7.5 : -1; gu.uO.value.set(E.C.x, E.groundY, E.C.z - 0.4); gu.uBase.value = after ? smooth(0, 0.6, da) * (0.6 + 0.4 * pulse) : 0;
  // 叫声的涟漪：从嘴部向月亮扩散
  if (E.ripples) {
    const m = E.act.mouth(aw), ru = E.ripples.material.uniforms;
    // 屏幕平面里指向月亮的方向（去掉深度分量）
    const D = (E.moonPos ? E.moonPos.clone().sub(m.pos) : m.dir.clone()); D.addScaledVector(fwd, -D.dot(fwd)).normalize();
    const e1 = D.clone(), e2 = new THREE.Vector3().crossVectors(fwd, D).normalize();
    ru.uA.value = a; ru.uO.value.copy(m.pos); ru.uD.value.copy(D); ru.uE1.value.copy(e1); ru.uE2.value.copy(e2);
    E.act.pose(aw);
  }
  // 公告板朝向镜头
  for (const g of E.glows) if (g.userData.billboard) g.quaternion.copy(qn);
  // ---- 特效
  E.fx.update(a, { pulse, after, da, right, up, fwd, behind, t });
  // ---- 背景
  const fu = E.final.uniforms;
  fu.uTime.value = t; fu.uGlowCol.value.set(hex);
  const sc = E.C.clone().project(E.camera);
  fu.uGlowC.value.set(sc.x * 0.5 + 0.5, sc.y * 0.5 + 0.5);
  fu.uGlowR.value = E.mode === 'card' ? 0.42 : 0.36;
  fu.uGlowI.value = (0.012 + 0.01 * smooth(0.5, HIT, a)) + after * (0.012 + 0.03 * Math.exp(-da / 0.3) + 0.006 * pulse);
  fu.uShift.value.set(0, 0);
  E.bloom.strength = 0.55 + (after ? 0.15 * Math.exp(-da / 0.15) : 0);
  for (const m of E.mats) if (m.uniforms.uTime && m.uniforms.uTime !== SHARED.uTime) m.uniforms.uTime.value = t;
  E.composer.render();
}

// 世界坐标 → 画布像素
export function toScreen(v) { const p = v.clone().project(E.camera); return [(p.x * 0.5 + 0.5) * E.W, (-p.y * 0.5 + 0.5) * E.H, p.z]; }
// 脸的屏幕包围框（眼睛 + 口鼻 + 耳朵的大致范围），给文字避让检查用
export function faceBox() {
  const J = E.meta.joints || {};
  const names = ['nose', 'occiput', 'earTipL', 'earTipR', 'jawTip', 'jawHinge'].filter(n => J[n]);
  const hm = E.act ? E.act.mats[E.act.headSlot] : null, tr = v => hm ? v.applyMatrix4(hm) : v;
  const pts = [...names.map(n => toScreen(tr(new THREE.Vector3(...J[n])))), ...E.eyes.map(e => toScreen(tr(e.clone())))];
  const xs = pts.map(p => p[0]), ys = pts.map(p => p[1]);
  const pad = 0.06 * (Math.max(...ys) - Math.min(...ys));
  return { x0: Math.min(...xs) - pad, x1: Math.max(...xs) + pad, y0: Math.min(...ys) - pad, y1: Math.max(...ys) + pad, eyes: E.eyes.map(e => toScreen(tr(e.clone()))) };
}
