// 共享系统：渲染器与后期、相机、星云、浮尘、背景闪电、火花、主角人头（眼光、裂纹、王冠、光环、胸像）
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { cloudMaterial, lineMaterial, glowMaterial, dustMaterial, FinalShader, COL } from './mat.js';
import { PB, parseOBJ, buildHead, buildCracks, linesToPB, tagCrackProximity, buildCrown, buildHalo, buildBust, FACE, CROWN, V3 } from './geo.js';
import { rng, hash, clamp, lerp, prog, outExpo, sine, TAU, LOOP, fract } from './util.js';

export const W = 1920, H = 1080;
export const K = { THREE, mats: [], glows: [] };

export function initCore(glCanvas) {
  const renderer = new THREE.WebGLRenderer({ canvas: glCanvas, preserveDrawingBuffer: true, antialias: false, alpha: false });
  renderer.setPixelRatio(1); renderer.setSize(W, H, false); renderer.setClearColor(0x000000, 1);
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(35, W / H, 0.01, 400);
  scene.add(camera);
  const composer = new EffectComposer(renderer);
  composer.setPixelRatio(1); composer.setSize(W, H);
  composer.addPass(new RenderPass(scene, camera));
  const bloom = new UnrealBloomPass(new THREE.Vector2(W, H), 1.4, 0.6, 0.15);
  composer.addPass(bloom);
  const final = new ShaderPass(FinalShader);
  composer.addPass(final);
  composer.addPass(new OutputPass());
  Object.assign(K, { renderer, scene, camera, composer, bloom, final });
  // 星云在最终合成通道里叠加；K.neb 只是指向那组 uniform 的句柄
  K.neb = { material: { uniforms: final.uniforms }, set visible(v) { final.uniforms.uNeb.value = v ? 1 : 0; } };

  // 浮尘
  const dg = new THREE.BufferGeometry(); const ds = new Float32Array(3000);
  for (let i = 0; i < 3000; i++) ds[i] = hash(i * 1.37 + 0.5);
  dg.setAttribute('position', new THREE.Float32BufferAttribute(new Float32Array(9000), 3));
  dg.setAttribute('aSeed', new THREE.Float32BufferAttribute(ds, 1));
  const dust = new THREE.Points(dg, dustMaterial()); dust.frustumCulled = false; dust.renderOrder = 50; scene.add(dust); K.dust = dust;
  buildBolts();
  buildSparks();
}

export function reg(mat) { K.mats.push(mat); return mat; }
export function points(pb, mat, parent) {
  const p = new THREE.Points(pb.geometry ? pb.geometry(THREE) : pb, reg(mat));
  p.frustumCulled = false; (parent || K.scene).add(p); return p;
}
// 发光面片（billboard=true 时每帧朝向相机）
export function glow(mode, color, size, parent, opts = {}) {
  const m = new THREE.Mesh(new THREE.PlaneGeometry(size[0], size[1] ?? size[0]), reg(glowMaterial(mode, color, opts)));
  m.frustumCulled = false; m.renderOrder = opts.order ?? 20; m.userData.billboard = opts.billboard ?? true;
  (parent || K.scene).add(m); K.glows.push(m); return m;
}

// ------------------------------------------------------------ 背景闪电（挂在相机上，位于星云深处）
export const BOLTS = [ // [时刻, 屏幕 x(-1..1), 时长, 规模]
  [3.4, 0.55, 0.3, 1.2], [6.5, -0.65, 0.18, 0.55], [9.0, -0.45, 0.3, 1.25], [16.0, -0.55, 0.25, 1.0], [27.8, 0.6, 0.18, 0.6],
  [36.4, 0.4, 0.3, 1.1], [40.6, -0.7, 0.16, 0.55], [44.0, 0.55, 0.25, 0.95], [49.0, -0.4, 0.18, 0.6], [57.2, 0.65, 0.16, 0.6],
  [64.4, -0.35, 0.3, 1.2], [69.4, 0.7, 0.16, 0.55], [80.0, -0.65, 0.18, 0.6], [93.0, 0.5, 0.3, 1.15], [98.6, -0.6, 0.18, 0.6],
  [104.2, 0.62, 0.16, 0.55], [111.0, -0.6, 0.18, 0.6], [119.0, 0.6, 0.18, 0.5], [122.6, -0.55, 0.2, 0.7],
];
function buildBolts() {
  const R = rng(91), lines = [];
  BOLTS.forEach(([t, sx, dur, sc], bi) => {
    const D = 60, hh = D * Math.tan(17.5 * Math.PI / 180), hw = hh * W / H;
    const start = [sx * hw * 0.8 + (R() - 0.5) * 6, hh * 1.05, -D];
    const walk = (p0, dir, n, w, depth) => {
      const pts = [p0]; let p = p0;
      for (let i = 0; i < n; i++) {
        const ang = Math.atan2(dir[1], dir[0]) + (R() - 0.5) * 1.3;
        p = [p[0] + Math.cos(ang) * 1.6 * sc, p[1] + Math.sin(ang) * 1.6 * sc, -D]; pts.push(p);
        if (depth < 2 && R() < 0.16) walk(p, [dir[0] + (R() - 0.5) * 1.6, dir[1], 0], Math.floor(n * 0.4), w * 0.55, depth + 1);
      }
      lines.push({ pts, width: w, bolt: bi });
    };
    walk(start, [(R() - 0.5) * 0.6, -1, 0], Math.round(16 * sc + 6), 2.2, 0);
  });
  // 每条闪电的所有分支共用一个序号
  const pb = linesToPB(lines, 0.12, 5, 0.12);
  for (let i = 0; i < pb.count; i++) { const li = pb.e[i * 4 + 1]; pb.e[i * 4 + 1] = lines[li].bolt; pb.e[i * 4] = 0; }
  const mat = lineMaterial({ size: 0.8, bright: 1.05, col: new THREE.Color('#B794F6'), hot: COL.white, maxPx: 9 });
  const p = points(pb, mat, K.camera); p.renderOrder = -50; K.bolts = p;
}
export function boltState(t) {
  const prog = new Array(32).fill(0), inten = new Array(32).fill(0); let flash = [0.5, 0.6, 0];
  BOLTS.forEach(([t0, sx, dur, sc], i) => {
    const d = t - t0; if (d < 0 || d > dur) return;
    const f = (d < dur * 0.35 ? 1 : d < dur * 0.5 ? 0.25 : d < dur * 0.65 ? 0.9 : 1 - (d - dur * 0.65) / (dur * 0.35));
    prog[i] = 1; inten[i] = f * sc;
    if (f * sc > flash[2]) flash = [0.5 + sx * 0.4, 0.7, f * Math.min(1.2, sc)];
  });
  return { prog, inten, flash };
}

// ------------------------------------------------------------ 火花（逐帧由事件表纯函数算出）
const SPARK_N = 4000;
function buildSparks() {
  const pb = new PB();
  for (let i = 0; i < SPARK_N; i++) pb.add([0, -999, 0], [0, 0, 0], hash(i * 3.3), [0, 0, 0], [0, 0, 0, 1], [0, 0]);
  const p = points(pb, cloudMaterial({ size: 0.01, bright: 1, drift: 0, depthRef: 3, maxPx: 14 }));
  p.renderOrder = 60; K.sparks = p;
  p.material.uniforms.uColB.value = COL.crack.clone();
}
// bursts: [{t0, pos:[x,y,z], n, speed, life, grav, dir:[...]?, spread, seed, color:0 紫 1 洋红, size}]
export function updateSparks(t, bursts) {
  const pos = K.sparks.geometry.attributes.position.array, misc = K.sparks.geometry.attributes.aMisc.array;
  let k = 0;
  for (const b of bursts) {
    const d = t - b.t0; if (d < 0 || d > b.life) continue;
    for (let j = 0; j < b.n && k < SPARK_N; j++) {
      const s = (b.seed ?? 0) * 97.1 + j * 1.913;
      const life = b.life * (0.5 + 0.5 * hash(s + 1));
      if (d > life) continue;
      let dx = hash(s + 2) - 0.5, dy = hash(s + 3) - 0.5, dz = hash(s + 4) - 0.5;
      const l = Math.hypot(dx, dy, dz) || 1; dx /= l; dy /= l; dz /= l;
      if (b.dir) { const sp = b.spread ?? 0.6; dx = b.dir[0] + dx * sp; dy = b.dir[1] + dy * sp; dz = b.dir[2] + dz * sp; }
      const v = b.speed * (0.4 + 0.8 * hash(s + 5)), e = (1 - Math.exp(-3 * d)) / 3;
      pos[k * 3] = b.pos[0] + dx * v * e; pos[k * 3 + 1] = b.pos[1] + dy * v * e - (b.grav ?? 0.6) * d * d; pos[k * 3 + 2] = b.pos[2] + dz * v * e;
      misc[k * 2] = (1 - d / life) * (b.bright ?? 2.2); misc[k * 2 + 1] = 0;
      k++;
    }
  }
  for (; k < SPARK_N; k++) { pos[k * 3 + 1] = -999; misc[k * 2] = 0; }
  K.sparks.geometry.attributes.position.needsUpdate = true; K.sparks.geometry.attributes.aMisc.needsUpdate = true;
}

// ------------------------------------------------------------ 主角人头
export function buildHero(objText) {
  const obj = parseOBJ(objText);
  const { pb: headPB, faceCount } = buildHead(obj, { seed: 7 });
  const { lines } = buildCracks(headPB, faceCount, 11);
  const crackPB = linesToPB(lines, 0.0022, 13, 0.0022);
  tagCrackProximity(headPB, crackPB, 0.026);
  K.crackLines = lines; K.headPB = headPB; K.obj = obj;

  const group = new THREE.Group(); K.scene.add(group);
  const head = points(headPB, cloudMaterial({ size: 0.0135, bright: 0.62, depthRef: 2.6, maxPx: 16 }), group);
  const cracks = points(crackPB, lineMaterial({ size: 0.02, bright: 2.6 }), group); cracks.renderOrder = 30;
  // 眼光：扁椭圆核心 + 更大的柔光
  const eyes = [FACE.eyeL, FACE.eyeR].map(p => {
    const core = glow(2, COL.eyeOuter, [0.5, 0.5], group, { core: COL.eyeCore, billboard: false, order: 40 });
    core.position.set(p[0], p[1], p[2] + 0.02);
    const halo = glow(0, COL.eyeOuter, [0.55, 0.55], group, { core: COL.eyeCore, order: 39 });
    halo.position.set(p[0], p[1], p[2] + 0.03);
    return { core, halo };
  });
  // 王冠
  const crownData = buildCrown(21);
  const crownMat = cloudMaterial({
    size: 0.016, bright: 1.5, depthRef: 2.6, maxPx: 16, facing: 0.35,
    uniforms: { uSpike: { value: new Array(8).fill(1) }, uSpikeD: { value: new Array(8).fill(0) }, uRing: { value: 1 } },
    uniformDecl: 'uniform float uSpike[8]; uniform float uSpikeD[8]; uniform float uRing;',
    posHook: `
      if (aMisc.y == 6.0) {
        int si = int(aExtra.y + 0.5); float g = uSpike[si]; float dd = uSpikeD[si];
        vis *= step(aExtra.x, g*1.02) * step(0.001, g);
        float kd = clamp(dd*1.6 - (1.0-aExtra.x)*0.6, 0.0, 1.0);
        p += (normalize(h3(aSeed*5.0)-0.5)*0.12 + vec3(0.0, -0.9*kd, 0.0))*kd; vis *= 1.0 - kd*kd;
      } else { vis *= uRing; }`,
  });
  const crown = points(crownData.pb, crownMat, group);
  const gems = crownData.gems.map(g => { const m = glow(0, COL.lilac, [0.09, 0.09], group, { core: COL.white, order: 41 }); m.position.set(g[0], g[1], g[2]); return m; });
  // 光环
  const halo = points(buildHalo(31, 1.1), cloudMaterial({ size: 0.016, bright: 1.1, depthRef: 3, facing: 0, maxPx: 14 }), group);
  halo.position.set(0, 0.12, -0.55);
  halo.material.uniforms.uFlow.value = 1;
  const haloGlow = glow(4, COL.purple, [3.2, 3.2], group, { billboard: false, order: 5 });
  haloGlow.position.set(0, 0.12, -0.55); haloGlow.material.uniforms.uRing.value = 1.1 / 1.6;
  // 胸像
  const bust = points(buildBust(41), cloudMaterial({ size: 0.017, bright: 1.0, depthRef: 3, maxPx: 16, light: 0.4 }), group);
  bust.material.uniforms.uAsmArc.value = 0.4;
  const pendant = glow(0, COL.lilac, [0.22, 0.22], group, { core: COL.white, order: 42 }); pendant.position.set(0, -1.42, 0.5);

  K.hero = { group, head, cracks, eyes, crown, gems, halo, haloGlow, bust, pendant, crownData };
  // 七张脸用的轻量人头
  K.litePB = headPB.subset(i => i >= faceCount ? hash(i * 0.37) < 0.25 : (headPB.m[i * 2 + 1] > 0 ? hash(i * 0.71) < 0.55 : hash(i * 0.53) < 0.16));
  return K.hero;
}

// 裂纹时钟：c 秒（从 9.0 起算）→ 每条裂纹的生长进度
export function crackProgress(clock) {
  return K.crackLines.map(L => clamp((9.0 + clock - L.t0) / L.dur));
}
export function crackTipWorld(i, pr) {
  const L = K.crackLines[i], n = L.pts.length - 1, f = pr * n, k = Math.min(n - 1, Math.floor(f)), r = f - k;
  const a = L.pts[k], b = L.pts[k + 1];
  return [lerp(a[0], b[0], r), lerp(a[1], b[1], r), lerp(a[2], b[2], r)];
}

// 每帧：把公共 uniform 推给所有材质
export function tickMaterials(t) {
  for (const m of K.mats) if (m.uniforms.uTime) m.uniforms.uTime.value = t;
}
