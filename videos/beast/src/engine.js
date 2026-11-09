// GL 引擎：渲染器、辉光、动物粒子（汇聚拖尾、骨骼动作）、眼睛、月亮（钉在镜头上）、地面冲击波、镜头
// 时间一律用成片时间 t（秒，= 音乐时间，音乐从第一个音开始）。时间表 T 由 main.js 按实测节拍算好传进来。
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
import { buildSilhouettes } from './silhouettes.js';
import { buildStory } from './story.js';
import { clamp, lerp, smooth, outCubic, hash, rng, D2R, mixHex } from './util.js';

export const E = {};               // 引擎状态

export function geo(attrs) {
  const g = new THREE.BufferGeometry();
  for (const [k, [arr, n]] of Object.entries(attrs)) g.setAttribute(k, new THREE.BufferAttribute(arr, n));
  return g;
}
export function addPoints(g, mat, order = 0, parent = E.scene) { const p = new THREE.Points(g, mat); p.frustumCulled = false; p.renderOrder = order; parent.add(p); E.mats.push(mat); return p; }
export function addGlow(mode, color, size, order = 10, o = {}) {
  const m = new THREE.Mesh(new THREE.PlaneGeometry(size, size), glowMaterial(mode, color, o)); m.frustumCulled = false; m.renderOrder = order; m.userData.billboard = o.billboard ?? true; (o.parent || E.scene).add(m); E.glows.push(m); return m;
}

export async function initEngine(canvas, ep, { W, H, mode, T }) {
  Object.assign(E, { ep, mode, W, H, T, mats: [], glows: [], card: mode === 'card' });
  const renderer = new THREE.WebGLRenderer({ canvas, preserveDrawingBuffer: true, antialias: false, alpha: false });
  renderer.setPixelRatio(1); renderer.setSize(W, H, false); renderer.setClearColor(0x000000, 1);
  const scene = new THREE.Scene(), camera = new THREE.PerspectiveCamera(32, W / H, 0.05, 200);
  scene.add(camera);
  const composer = new EffectComposer(renderer); composer.setPixelRatio(1); composer.setSize(W, H);
  composer.addPass(new RenderPass(scene, camera));
  const bloom = new UnrealBloomPass(new THREE.Vector2(W, H), 0.5, 0.45, 0.7); composer.addPass(bloom);
  const final = new ShaderPass(FinalShader); final.uniforms.uRes.value.set(W, H); composer.addPass(final);
  composer.addPass(new OutputPass());
  Object.assign(E, { renderer, scene, camera, composer, bloom, final });
  SHARED.uPx.value = 300 * (H / 1080);
  const hex = ep.color;

  // ---- 动物网格 → 粒子
  const meta = await (await fetch(`assets/models/${ep.animal.model}.json`)).json();
  const buf = await (await fetch(`assets/models/${ep.animal.model}.bin`)).arrayBuffer();
  const mesh = loadMesh(meta, buf);
  const eyes = meta.eyes.map(e => new THREE.Vector3(...e.c));
  const C = eyes[0].clone().add(eyes[1]).multiplyScalar(0.5);
  Object.assign(E, { C, eyes, meta });
  E.act = makeAction(meta, ep, T.hit, T.e8);
  E.L = layout();
  // 主光来自月亮（在狼的身后上方）：受光面是背光的亮边；正面另有补光（在着色器里）
  const cam0 = heroCam(T.hit + 1);
  E.keyDir = C.clone().sub(cam0.pos).normalize().add(new THREE.Vector3(0, 0.9, 0)).normalize();
  const S = ep.sample ?? {};
  const pts = samplePoints(mesh, {
    n: S.n ?? 240000, seed: 11, cam: cam0.pos.toArray(), eyeMid: C.toArray(), key: E.keyDir.toArray(),
    furFrac: S.furFrac ?? 0.12, furLen: S.furLen ?? 0.06, furScale: S.furScale, comb: S.comb ?? [0, -0.3, -1], bulge: S.bulge ?? 1,
  });
  E.count = pts.count; E.surface = pts.surface;
  const split8 = (w, n) => { const a = new Float32Array(n * 4), b = new Float32Array(n * 4); for (let i = 0; i < n; i++) for (let j = 0; j < 4; j++) { a[i * 4 + j] = w ? w[i * 8 + j] : 0; b[i * 4 + j] = w ? w[i * 8 + 4 + j] : 0; } return [a, b]; };
  const [ch1, ch2] = split8(pts.chain, pts.count);
  const g = geo({ position: [pts.pos, 3], aNrm: [pts.nrm, 3], aComb: [pts.comb, 3], aMisc: [pts.misc, 4], aChain: [ch1, 4], aChain2: [ch2, 4] });
  const matOpts = { col: hex, hi: mixHex(hex, '#FFFFFF', 0.7), rim: mixHex(hex, '#FFFFFF', 0.55), bright: (ep.bright ?? 2.0) * (mode === 'card' ? (ep.cardBright ?? 1.3) : 1), size: 0.0068 };
  E.beast = addPoints(g, beastMaterial(matOpts), 5);
  // 拖尾：同一批粒子，时间往回错开、只画一部分、越来越暗；只在汇聚途中可见
  E.ghosts = Array.from({ length: 10 }, (_, i) => 0.012 * (i + 1)).map((lag, i) => {
    const gm = beastMaterial(matOpts); gm.uniforms.uLag.value = lag; gm.uniforms.uGhost.value = 0.5 + 0.55 * Math.pow(1 - i / 10, 1.6);
    const p = addPoints(g, gm, 4); p.geometry = g.clone(); p.geometry.setDrawRange(0, Math.floor(pts.count * 0.45)); return p;
  });
  // ---- 剪影遮罩：狼自己的网格涂成近黑，画在月亮之后、粒子之前（同样的骨骼动作），月亮前面才有清楚的狼的剪影
  {
    const og = new THREE.BufferGeometry();
    og.setAttribute('position', new THREE.BufferAttribute(mesh.pos, 3));
    { const [o1, o2] = split8(mesh.chain, mesh.pos.length / 3); og.setAttribute('aChain', new THREE.BufferAttribute(o1, 4)); og.setAttribute('aChain2', new THREE.BufferAttribute(o2, 4)); }
    og.setIndex(new THREE.BufferAttribute(mesh.index, 1));
    const om = new THREE.ShaderMaterial({
      uniforms: { uAct: { value: [0, 1, 2, 3, 4, 5, 6, 7].map(() => new THREE.Matrix4()) }, uOp: { value: 0 }, uCol: { value: new THREE.Color(mixHex(hex, '#000000', 0.94)) } },
      transparent: true, depthWrite: false, depthTest: false, side: THREE.DoubleSide,
      vertexShader: `attribute vec4 aChain; attribute vec4 aChain2; uniform mat4 uAct[8];
        void main(){ float wr = 1.0 - (aChain.x + aChain.y + aChain.z + aChain.w + aChain2.x + aChain2.y + aChain2.z + aChain2.w); vec4 hp = vec4(position, 1.0);
          vec3 p = position*wr + (uAct[0]*hp).xyz*aChain.x + (uAct[1]*hp).xyz*aChain.y + (uAct[2]*hp).xyz*aChain.z + (uAct[3]*hp).xyz*aChain.w
                 + (uAct[4]*hp).xyz*aChain2.x + (uAct[5]*hp).xyz*aChain2.y + (uAct[6]*hp).xyz*aChain2.z + (uAct[7]*hp).xyz*aChain2.w;
          gl_Position = projectionMatrix*modelViewMatrix*vec4(p, 1.0); }`,
      fragmentShader: `uniform float uOp; uniform vec3 uCol; void main(){ gl_FragColor = vec4(uCol, uOp); }`,
    });
    E.occluder = new THREE.Mesh(og, om); E.occluder.frustumCulled = false; E.occluder.renderOrder = -10; scene.add(E.occluder);
  }
  // ---- 眼睛：两个最亮的发光点
  E.eyeGlows = eyes.map(() => addGlow(1, mixHex(hex, '#FFFFFF', 0.25), 0.55, 30, { core: '#FFFFFF' }));
  // ---- 地面冲击波：地面上的一片细点，只在波前经过时亮起
  {
    const n = 26000, P = new Float32Array(n * 3), M = new Float32Array(n * 4), R = rng(5);
    for (let i = 0; i < n; i++) { const r = Math.sqrt(R()) * 9, a = R() * Math.PI * 2; P[i * 3] = Math.cos(a) * r; P[i * 3 + 1] = 0; P[i * 3 + 2] = Math.sin(a) * r; M.set([0.5 + R(), R(), r, 0], i * 4); }
    E.groundY = ep.groundY ?? 0.02;
    E.ground = addPoints(geo({ position: [P, 3], aMisc: [M, 4] }), fxPointsMaterial({
      col: hex, hi: '#FFFFFF', size: 0.016, maxPx: 4, bright: 1.3,
      uniforms: { uWave: { value: -1 }, uO: { value: new THREE.Vector3() }, uBase: { value: 0 } },
      uniformDecl: 'uniform float uWave, uBase; uniform vec3 uO;',
      posHook: `
        float r = aMisc.z; float d = r - uWave;
        float front = exp(-d*d*10.0)*step(0.0, uWave) + exp(-max(-d, 0.0)*1.6)*step(d, 0.0)*0.12*step(0.0, uWave);
        float fade = smoothstep(9.0, 3.0, r)*smoothstep(0.0, 0.8, uWave)*(1.0 - smoothstep(6.0, 9.0, uWave));
        p = uO + position + vec3(0.0, front*0.05, 0.0);
        b *= front*fade + uBase*0.1*smoothstep(9.0, 2.0, r); hot = front*0.6;`,
    }), 2);
  }
  // ---- 叫声的涟漪：从嘴部扩散的弧（朝向镜头，像“(((”）
  if (E.act) {
    const V = ep.action.voice ?? { rings: 4, gap: 1 }, nr = V.rings, per = 5000, P = new Float32Array(nr * per * 3), M = new Float32Array(nr * per * 4);
    for (let k = 0; k < nr; k++) for (let i = 0; i < per; i++) { const j = k * per + i; M.set([0.7 + 0.6 * hash(j * 1.7), hash(j * 2.3), k, i / per * Math.PI * 2], j * 4); }
    E.ripples = addPoints(geo({ position: [P, 3], aMisc: [M, 4] }), fxPointsMaterial({
      col: mixHex(hex, '#FFFFFF', 0.25), hi: '#FFFFFF', size: 0.016, maxPx: 5, bright: 2.2,
      uniforms: { uA: { value: 0 }, uH: { value: T.hit }, uGap: { value: V.gap * T.e8 }, uO: { value: new THREE.Vector3() }, uD: { value: new THREE.Vector3(0, 1, 0) }, uE2: { value: new THREE.Vector3(0, 0, 1) } },
      uniformDecl: 'uniform float uA, uH, uGap; uniform vec3 uO, uD, uE2;',
      posHook: `
        float k = aMisc.z, tau = uA - (uH + k*uGap), life = 1.5;
        vis = step(0.0, tau)*step(tau, life);
        float r = 0.1 + 0.95*tau + (h1(aMisc.y*5.3) - 0.5)*0.05*(1.0 + tau);
        vec2 cs = vec2(cos(aMisc.w), sin(aMisc.w));
        p = uO + uD*(0.5*tau) + (uD*cs.x + uE2*cs.y)*r;
        float side = smoothstep(0.1, 0.7, cs.x);
        float f = clamp(tau/life, 0.0, 1.0); b *= side*pow(1.0 - f, 1.3)*(0.75 + 0.25*h1(aMisc.y*9.0)); hot = 1.0 - f*1.6;`,
    }), 46);
  }
  // ---- 背景里飘浮的细小粒子（钉在镜头上，周期 = 成片时长，首尾一致）
  {
    const n = 900, P = new Float32Array(n * 3), M = new Float32Array(n * 4), R = rng(31);
    for (let i = 0; i < n; i++) { P.set([(R() - 0.5) * 2, (R() - 0.5) * 2, 0], i * 3); M.set([0.4 + 0.8 * R(), R(), 1 + Math.floor(R() * 2), 8 + R() * 22], i * 4); }
    E.dust = addPoints(geo({ position: [P, 3], aMisc: [M, 4] }), fxPointsMaterial({ col: mixHex(hex, '#C8D0D8', 0.6), hi: '#FFFFFF', size: 0.05, maxPx: 3, bright: 0.55,
      uniforms: { uLoop: { value: T.clip }, uAsp: { value: W / H } }, uniformDecl: 'uniform float uLoop, uAsp;',
      posHook: `
        float d = aMisc.w, ph = uTime/uLoop*6.2831853;
        float th = tan(0.2793); vec2 q = position.xy + vec2(0.04*sin(ph*aMisc.z + aMisc.y*40.0), fract(position.y*0.5 + 0.5 + aMisc.z*uTime/uLoop*0.25)*2.0 - 1.0 - position.y);
        p = vec3(q.x*d*th*uAsp, q.y*d*th, -d);
        b *= (0.5 + 0.5*sin(ph*(3.0 + aMisc.z) + aMisc.y*30.0))*smoothstep(1.0, 0.8, abs(q.y));` }), -40, camera);
  }
  // ---- 片头闪过的动物剪影（旧版片头，已由卡牌代替；episode.intro.animals 为空时不建）
  E.sil = await buildSilhouettes(ep, { E, addPoints, geo });
  // ---- 月亮（钉在镜头上）和专属特效
  E.fx = buildFX(ep.fx, { E, THREE, addPoints, addGlow, geo, C, hex });
  // ---- 正文三段的场景
  E.story = buildStory({ E, addPoints, addGlow, geo });
  return E;
}

// ------------------------------------------------------------ 构图：月亮（圆心 x, y, 半径，像素）和狼眼睛中点在屏幕上的位置
function layout() {
  const ep = E.ep, c = E.card ? (ep.card ?? {}) : (ep.frame ?? {});
  return { moon: c.moon ?? [1230, 590, 378], eyes: c.eyes ?? [1310, 700], dist: c.dist ?? ep.camera.dist, fov: c.fov ?? ep.camera.fov };
}

// ------------------------------------------------------------ 英雄镜头：低机位略仰视、3/4 侧面；觉醒后缓慢推近
export function heroCam(t) {
  const c = { ...E.ep.camera, ...(window.CAM_OVERRIDE || {}) }, T = E.T, L = E.L ?? layout();
  const k = t < T.hit ? 1.0 : 1.0 - c.push * outCubic(Math.min(1, (t - T.hit) / 2.6));
  const yaw = (c.yaw + Math.max(0, t - T.hit) * 0.8) * D2R, pitch = c.pitch * D2R, dist = L.dist * k;
  const dir = new THREE.Vector3(Math.sin(yaw) * Math.cos(pitch), Math.sin(pitch), Math.cos(yaw) * Math.cos(pitch));
  const pos = E.C.clone().addScaledVector(dir, dist);
  // 让眼睛中点落在屏幕的 L.eyes：把注视点沿镜头的右、上方向挪开
  const fwd = dir.clone().negate(), right = new THREE.Vector3().crossVectors(fwd, new THREE.Vector3(0, 1, 0)).normalize(), up = new THREE.Vector3().crossVectors(right, fwd);
  const ppu = E.H / (2 * dist * Math.tan(L.fov * D2R / 2));
  const target = E.C.clone().addScaledVector(right, -(L.eyes[0] - E.W / 2) / ppu).addScaledVector(up, (L.eyes[1] - E.H / 2) / ppu);
  return { pos, target, fov: L.fov };
}

export function beatPulse(t, sharp = 7) {
  const T = E.T; if (t < T.hit) return 0;
  return Math.exp(-(((t - T.hit) / T.beat) % 1) * sharp);
}

export function frame(t) {
  const ep = E.ep, hex = ep.color, T = E.T;
  SHARED.uTime.value = t % T.clip;
  const cam = (E.story && !E.card ? E.story.cam(t, heroCam) : null) ?? heroCam(t);
  const da = t - T.hit, after = da >= 0 ? 1 : 0;
  const sh = after && da < 0.4 ? Math.exp(-da * 11) : 0;
  E.camera.position.copy(cam.pos); E.camera.up.set(0, 1, 0); E.camera.lookAt(cam.target); E.camera.fov = cam.fov; E.camera.updateProjectionMatrix(); E.camera.updateMatrixWorld();
  const right = new THREE.Vector3().setFromMatrixColumn(E.camera.matrixWorld, 0), up = new THREE.Vector3().setFromMatrixColumn(E.camera.matrixWorld, 1);
  const fwd = new THREE.Vector3(); E.camera.getWorldDirection(fwd);
  if (sh > 0.001) {
    const amp = 0.016 * cam.pos.distanceTo(E.C) / 3.4;
    E.camera.position.addScaledVector(right, Math.sin(t * 113) * amp * sh).addScaledVector(up, Math.cos(t * 89) * amp * sh); E.camera.updateMatrixWorld();
  }
  const pulse = beatPulse(t);
  // 片尾：狼慢慢散去，回到第 0 帧的样子（循环）
  const outro = smooth(T.outro, T.outro + 0.5, t);
  const wolfOn = t >= T.asm0 ? 1 - outro : 0;
  // ---- 骨骼动作
  const aw = E.act ? E.act.weight(t) : 0, mats = E.act ? E.act.pose(aw, t) : null;
  const kick = after ? 0.075 * (da / 0.07) * Math.exp(1 - da / 0.07) : 0;
  const wind = after ? smooth(0, 0.35, da) * (0.85 + 0.25 * pulse) : 0;
  for (const p of [E.beast, ...E.ghosts]) {
    const u = p.material.uniforms;
    if (mats) u.uAct.value.forEach((m, i) => m.copy(mats[i]));
    u.uA.value = t; u.uAsm0.value = T.asm0; u.uHit.value = T.hit + 0.04; u.uC.value.copy(E.C); u.uAxis.value.copy(fwd).negate(); u.uCam.value.copy(E.camera.position);
    u.uKick.value = kick; u.uWind.value = wind; u.uPulse.value = pulse * after; u.uFlow.value = after ? smooth(0, 0.6, da) : 0.25;
    u.uWindDir.value.set(...(ep.windDir ?? [0.15, 0.2, -1])).normalize(); u.uFade.value = wolfOn;
    u.uKey.value.copy(E.keyDir);
    u.uBreath.value = after * 0.012 * Math.sin(2 * Math.PI * t / (4 * T.e8));
  }
  for (const p of E.ghosts) p.visible = t > T.asm0 - 0.02 && t < T.hit + 0.08;
  { const ou = E.occluder.material.uniforms; if (mats) ou.uAct.value.forEach((m, i) => m.copy(mats[i])); ou.uOp.value = (ep.occlude ?? 0.9) * smooth(T.hit - 0.1, T.hit + 0.04, t) * (1 - outro); E.occluder.visible = ou.uOp.value > 0.002; }
  // ---- 眼睛：揭晓那一拍睁开；觉醒时冲到最亮再回落；片尾随狼散去
  const eyeOpen = smooth(T.asm0, T.asm0 + 0.1, t);
  let eyeI = 0.85, flare = 0.2;
  if (after) { const sp = Math.exp(-da / 0.09); eyeI = 1.0 + 1.5 * sp + 0.08 * pulse; flare = 0.35 + 1.6 * sp + 0.15 * pulse; }
  if (T.story && t >= T.story.start) {   // 正文：眼睛一闪一闪；第 3 段特写那一拍亮起；两双眼睛一起闪
    const S3 = t >= T.story.seg3 ? Math.exp(-(t - T.story.seg3) / 0.25) : 0, F = E.storyFlash ?? 0;
    eyeI *= 0.82 + 0.22 * Math.pow(0.5 + 0.5 * Math.sin(t * 7.3) * Math.sin(t * 3.1), 2) + 0.35 * pulse; eyeI += 1.1 * S3 + 1.0 * F; flare += 1.0 * S3 + 0.9 * F + 0.4 * pulse;
  }
  E.heroEyeI = eyeI;
  E.eyeGlows.forEach((g, i) => {
    const e = mats ? E.eyes[i].clone().applyMatrix4(mats[E.act.headSlot]) : E.eyes[i];
    g.position.copy(e).addScaledVector(fwd, -0.05);
    const z0 = new THREE.Vector3(...E.meta.eyes[i].z); if (mats) z0.transformDirection(mats[E.act.headSlot]);
    const vis = clamp(0.35 + 0.9 * z0.dot(E.camera.position.clone().sub(e).normalize()), 0.3, 1);
    const on = eyeOpen * (1 - outro);
    g.visible = on > 0.002;
    g.material.uniforms.uInt.value = eyeI * vis * on; g.material.uniforms.uFlare.value = flare * vis;
    const s = (0.5 + 0.18 * (after ? Math.exp(-da / 0.12) : 0)) * (E.card ? 1.2 : 1);
    g.scale.setScalar(s * (0.6 + 0.4 * vis)); g.scale.y *= Math.max(0.08, eyeOpen);
  });
  // ---- 地面冲击波
  const gu = E.ground.material.uniforms; gu.uWave.value = after ? da * 7.5 : -1; gu.uO.value.set(E.C.x, E.groundY, E.C.z - 0.4); gu.uBase.value = after ? smooth(0, 0.6, da) * (0.6 + 0.4 * pulse) * (1 - outro) * (1 - smooth(T.story?.start ?? 99, (T.story?.start ?? 99) + 0.5, t)) : 0;
  // ---- 叫声涟漪：从嘴向嚎叫方向（屏幕平面内）扩散
  if (E.ripples) {
    const m = E.act.mouth(aw, t), ru = E.ripples.material.uniforms;
    const D = m.dir.clone(); D.addScaledVector(fwd, -D.dot(fwd)).normalize();
    ru.uA.value = t; ru.uO.value.copy(m.pos); ru.uD.value.copy(D); ru.uE2.value.copy(new THREE.Vector3().crossVectors(fwd, D).normalize());
    E.act.pose(aw, t);
  }
  for (const g of E.glows) if (g.userData.billboard) g.quaternion.copy(E.camera.quaternion);
  // ---- 剪影、月亮和特效
  E.sil.update(t, { right, up, fwd });
  E.fx.update(t, { pulse, after, da, right, up, fwd, t, outro });
  if (E.story) E.story.update(t, { pulse, up, right, fwd });
  // ---- 背景：近黑 + 星点 + 动物身后很淡的主色光晕
  const fu = E.final.uniforms;
  fu.uTime.value = t % T.clip; fu.uGlowCol.value.set(hex);
  const sc = E.C.clone().project(E.camera);
  fu.uGlowC.value.set(sc.x * 0.5 + 0.5, sc.y * 0.5 + 0.5);
  fu.uGlowR.value = E.card ? 0.42 : 0.4;
  fu.uGlowI.value = after * (0.018 + 0.025 * Math.exp(-da / 0.3) + 0.004 * pulse) * (1 - outro);
  E.bloom.strength = 0.5 + (after ? 0.15 * Math.exp(-da / 0.15) : 0);
  E.composer.render();
}

// 世界坐标 → 画布像素
export function toScreen(v) { const p = v.clone().project(E.camera); return [(p.x * 0.5 + 0.5) * E.W, (-p.y * 0.5 + 0.5) * E.H, p.z]; }
// 要避让的区域：狼的脸、狼的身体（全部关节，含动作）、月亮（圆）
export function avoidRegions(t) {
  const J = E.meta.joints || {}, out = [];
  const act = E.act, aw = act ? act.weight(t) : 0; if (act) act.pose(aw, t);
  const jawSlot = act ? E.meta.chain.findIndex(b => b.name === 'jaw') : -1;
  const P = n => { const v = new THREE.Vector3(...J[n]); if (act && /nose|occiput|jaw|ear/i.test(n)) v.applyMatrix4(/jaw/i.test(n) && jawSlot >= 0 ? act.mats[jawSlot] : act.mats[act.headSlot]); return toScreen(v); };
  if (t >= E.T.asm0 && t < E.T.outro + 0.3) {
    const bb = (pts, pad) => { const xs = pts.map(p => p[0]), ys = pts.map(p => p[1]); return { x0: Math.min(...xs) - pad, x1: Math.max(...xs) + pad, y0: Math.min(...ys) - pad, y1: Math.max(...ys) + pad }; };
    out.push({ label: '脸', ...bb(['nose', 'occiput', 'earTipL', 'earTipR', 'jawTip', 'jawHinge'].filter(n => J[n]).map(P), 40) });
    // 身体：沿每根骨骼取 6 个点，每点一个圆（半径 = 躯干 0.3、四肢 0.14、尾巴 0.12 个单位，投影成像素）
    const ppu = E.H / (2 * E.camera.position.distanceTo(E.C) * Math.tan(E.camera.fov * Math.PI / 360));
    for (const b of E.meta.bones ?? []) {
      if (!J[b.headJ] || !J[b.tailJ]) continue;
      const rw = /torso|neck/.test(b.region) ? 0.3 : b.region === 'tail' ? 0.12 : b.region === 'head' || b.region === 'jaw' || b.region === 'ear' ? 0.2 : 0.14;
      for (let i = 0; i <= 5; i++) { const a = new THREE.Vector3(...J[b.headJ]).lerp(new THREE.Vector3(...J[b.tailJ]), i / 5);
        const head = /head|jaw|ear/.test(b.region); if (act && head) a.applyMatrix4(b.region === 'jaw' && jawSlot >= 0 ? act.mats[jawSlot] : act.mats[act.headSlot]);
        const [x, y] = toScreen(a); out.push({ label: '身体', circle: [x, y, rw * ppu] }); }
    }
  }
  const [mx, my, mr] = E.L.moon; if (t >= E.T.asm0 && t < E.T.outro + 0.3) out.push({ label: '月亮', circle: [mx, my, mr + 10] });
  return out;
}
