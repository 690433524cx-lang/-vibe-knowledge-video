// 傲慢的主角（移植自傲慢项目）：粒子人脸 + 紫色眼光 + 裂纹 + 王冠 + 光环 + 胸像。整体放大到 2 个单位高。
import * as THREE from 'three';
import { K, HS, points, glow } from '../core.js';
import { cloudMaterial, lineMaterial } from '../mat.js';
import { FACE, buildCracks, linesToPB, tagCrackProximity, buildCrown, buildHalo, buildBust } from '../geo.js';
import { clamp, lerp } from '../util.js';

const P = { white: '#F5F0FF', purple: '#8B5CF6', crack: '#C084FC', eyeCore: '#E9D5FF', eyeOuter: '#A855F7', lilac: '#A78BFA' };
let H = null;
export function buildHero() {
  const root = new THREE.Group(); K.scene.add(root);
  const hs = new THREE.Group(); hs.scale.setScalar(HS); root.add(hs);
  const { lines } = buildCracks(K.headPB, K.faceCount, 11);
  const crackPB = linesToPB(lines, 0.0022, 13, 0.0022);
  tagCrackProximity(K.headPB, crackPB, 0.026);
  const head = points(K.headPB, cloudMaterial({ size: 0.024, bright: 0.66, depthRef: 4.6, maxPx: 16, colA: '#C9A8FF', colB: P.purple, colCrack: P.crack }), hs);
  head.material.uniforms.uSwirl.value = 1.4;
  const cracks = points(crackPB, lineMaterial({ size: 0.028, bright: 1.8, col: P.crack, hot: P.white }), hs); cracks.renderOrder = 30;
  const eyes = [FACE.eyeL, FACE.eyeR].map(p => {
    const core = glow(2, P.eyeOuter, [0.5, 0.5], hs, { core: P.eyeCore, billboard: false, order: 40 });
    core.position.set(p[0], p[1], p[2] + 0.02);
    const halo = glow(0, P.eyeOuter, [0.55, 0.55], hs, { core: P.eyeCore, order: 39 });
    halo.position.set(p[0], p[1], p[2] + 0.03);
    // 闭眼时的眼缝光（与片头相同）
    const slit = glow(5, '#A855F7', [0.6 / HS, 0.16 / HS], hs, { billboard: false, order: 41, half: [0.3 / HS, 0.08 / HS], ell: [0.08 / HS, 0.006 / HS], core: '#A855F7' });
    slit.position.set(p[0], p[1] - 0.004, p[2] + 0.014);
    return { core, halo, slit };
  });
  const crownData = buildCrown(21);
  const crown = points(crownData.pb, cloudMaterial({
    size: 0.024, bright: 1.5, depthRef: 4.6, maxPx: 16, facing: 0.35, colA: P.white, colB: P.purple,
    uniforms: { uSpike: { value: new Array(8).fill(1) }, uRing: { value: 1 } },
    uniformDecl: 'uniform float uSpike[8]; uniform float uRing;',
    posHook: `
      if (aMisc.y == 6.0) { int si = int(aExtra.y + 0.5); float g = uSpike[si]; vis *= step(aExtra.x, g*1.02) * step(0.001, g); }
      else { vis *= uRing; }`,
  }), hs);
  const gems = crownData.gems.map(g => { const m = glow(0, P.lilac, [0.09, 0.09], hs, { core: '#FFFFFF', order: 41 }); m.position.set(g[0], g[1], g[2]); return m; });
  const halo = points(buildHalo(31, 1.1), cloudMaterial({ size: 0.024, bright: 1.1, depthRef: 6, facing: 0, maxPx: 14, colA: P.white, colB: P.purple }), hs);
  halo.position.set(0, 0.12, -0.55); halo.material.uniforms.uFlow.value = 1;
  const haloGlow = glow(4, P.purple, [3.2, 3.2], hs, { billboard: false, order: 5 });
  haloGlow.position.set(0, 0.12, -0.55); haloGlow.material.uniforms.uRing.value = 1.1 / 1.6;
  const bust = points(buildBust(41), cloudMaterial({ size: 0.03, bright: 1.0, depthRef: 6, maxPx: 16, light: 0.4, colA: P.white, colB: P.purple }), hs);
  bust.material.uniforms.uAsmArc.value = 0.4;
  const pendant = glow(0, P.lilac, [0.22, 0.22], hs, { core: '#FFFFFF', order: 42 }); pendant.position.set(0, -1.42, 0.5);
  for (const p of [crown, halo, bust]) p.material.uniforms.uSwirl.value = 1.2;
  H = { root, hs, head, cracks, lines, eyes, crown, gems, halo, haloGlow, bust, pendant };
  return H;
}

export const DEF = { visible: true, pos: [0, 0.25, 0], ry: 0, alpha: 1, bright: 1, scatter: 0, colA: null, colB: null,
  eyeOpen: 0, eyeInt: 0, eyeRays: 0, slit: 0.9, crackT: -1, spikes: [0, 0, 0, 0, 0, 0, 0], ring: 0, gems: 0, halo: 0, haloScale: 1, haloRot: 0, bust: 0, bustAsm: 1 };
export function applyHero(s0, t) {
  const s = { ...DEF, ...s0 }, h = H, sc = s.scatter;
  h.root.visible = s.visible && s.alpha > 0.003;
  if (!h.root.visible) return;
  h.root.position.set(...s.pos); h.root.rotation.set(0, s.ry, 0);
  for (const p of [h.head, h.crown, h.halo, h.bust]) {
    const u = p.material.uniforms; u.uAlpha.value = s.alpha; u.uScatter.value = sc; u.uScatterDist.value = 0.5; u.uScatSpread.value = 0.5;
  }
  const hu = h.head.material.uniforms;
  hu.uBright.value = 0.66 * s.bright; hu.uEyeOpen.value = s.eyeOpen; hu.uCrackTint.value = 1;
  if (s.colA) { hu.uColA.value.setRGB(...s.colA); hu.uColB.value.setRGB(...s.colB); } else { hu.uColA.value.set('#C9A8FF'); hu.uColB.value.set(P.purple); }
  // 裂纹：傲慢项目的时刻表从 9.0 起，这里从 3.5 起并压缩 0.7 倍
  const cu = h.cracks.material.uniforms;
  h.lines.forEach((L, i) => {
    const pr = s.crackT < 0 ? 0 : clamp((s.crackT - (L.t0 - 9.0) * 0.7) / (L.dur * 0.7));
    cu.uProg.value[i] = pr; hu.uCrack.value[i] = pr;
  });
  cu.uAlpha.value = s.alpha * (1 - clamp(sc * 1.5)); h.cracks.visible = s.crackT > 0 && sc < 0.7;
  for (const e of h.eyes) {
    e.core.material.uniforms.uOpen.value = Math.max(0.02, s.eyeOpen);
    e.core.material.uniforms.uInt.value = s.eyeInt * 0.085 * s.alpha * (1 - clamp(sc * 2));
    e.core.material.uniforms.uRays.value = s.eyeRays;
    e.halo.material.uniforms.uInt.value = s.eyeInt * 0.035 * s.alpha * (0.3 + 0.7 * s.eyeOpen) * (1 - clamp(sc * 2));
    e.core.visible = e.halo.visible = s.eyeInt > 0.01;
    const su = e.slit.material.uniforms; su.uInt.value = 0.16 * s.slit * (1 - clamp(s.eyeOpen * 3)) * s.alpha * (1 - clamp(sc * 2));
    e.slit.visible = su.uInt.value > 0.0005;
  }
  const cr = h.crown.material.uniforms;
  for (let i = 0; i < 7; i++) cr.uSpike.value[i] = s.spikes[i];
  cr.uRing.value = s.ring; cr.uBright.value = 1.5 * s.bright;
  h.crown.visible = s.ring > 0.01 || s.spikes.some(v => v > 0);
  h.gems.forEach((g, i) => { const on = clamp(s.gems * 7 - i); g.material.uniforms.uInt.value = on * 0.9 * s.alpha * (1 - clamp(sc * 2)); g.visible = on > 0.01; });
  h.halo.visible = s.halo > 0.01;
  h.halo.scale.setScalar(Math.max(0.001, s.haloScale)); h.halo.rotation.z = s.haloRot;
  h.halo.material.uniforms.uBright.value = 1.1 * s.halo;
  h.haloGlow.visible = s.halo > 0.01; h.haloGlow.scale.setScalar(Math.max(0.001, s.haloScale));
  h.haloGlow.material.uniforms.uInt.value = 0.4 * s.halo * s.alpha * (1 - clamp(sc));
  h.bust.visible = s.bust > 0.01;
  h.bust.material.uniforms.uAssemble.value = s.bustAsm; h.bust.material.uniforms.uBright.value = 1.3 * s.bust;
  h.pendant.visible = s.bust > 0.01 && s.bustAsm > 0.6;
  h.pendant.material.uniforms.uInt.value = clamp((s.bustAsm - 0.6) / 0.4) * 1.0 * s.bust * s.alpha * (1 - clamp(sc * 2));
}
