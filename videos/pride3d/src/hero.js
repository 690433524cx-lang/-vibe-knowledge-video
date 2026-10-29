// 主角人头的状态：每帧由当前场景给出，未给出的字段取默认值
import * as THREE from 'three';
import { K, crackProgress } from './core.js';
import { COL } from './mat.js';
import { clamp, lerp } from './util.js';

export const HERO_DEFAULT = {
  visible: false, pos: [0, 0, 0], rot: [0, 0, 0], scale: 1, alpha: 1, bright: 1,
  eyeOpen: 0, eyeInt: 0, eyeRays: 0, eyeWhite: 0,
  crackClock: 0, crackTint: 1, scanX: 0, scanAmt: 0,
  spikes: [0, 0, 0, 0, 0, 0, 0], spikesD: [0, 0, 0, 0, 0, 0, 0], ring: 0, gems: 0,
  halo: 0, haloScale: 1, haloRot: 0,
  bust: 0, bustAsm: 1, scatter: 0, scatterBias: [0, 0, 0], scatterGrav: 0, scatterDist: 0.6, glow: 0, white: 0,
};

export function applyHero(s0, t) {
  const s = { ...HERO_DEFAULT, ...s0 };
  const h = K.hero;
  h.group.visible = s.visible;
  if (!s.visible) return;
  h.group.position.set(...s.pos); h.group.rotation.set(...s.rot); h.group.scale.setScalar(s.scale);
  const pr = crackProgress(s.crackClock);
  const all = [h.head.material, h.crown.material, h.bust.material, h.halo.material];
  for (const m of all) {
    const u = m.uniforms;
    u.uAlpha.value = s.alpha; u.uScatter.value = s.scatter; u.uScatterBias.value.set(...s.scatterBias);
    u.uScatterGrav.value = s.scatterGrav; u.uScatterDist.value = s.scatterDist; u.uGlow.value = s.glow; u.uWhite.value = s.white;
    u.uScanX.value = s.scanX; u.uScanAmt.value = s.scanAmt;
  }
  const hu = h.head.material.uniforms;
  hu.uBright.value = 0.62 * s.bright; hu.uEyeOpen.value = s.eyeOpen; hu.uCrackTint.value = s.crackTint;
  for (let i = 0; i < pr.length; i++) { hu.uCrack.value[i] = pr[i] * s.crackTint; h.cracks.material.uniforms.uProg.value[i] = pr[i]; }
  h.cracks.material.uniforms.uAlpha.value = s.alpha;
  h.cracks.material.uniforms.uBright.value = 2.6 * s.alpha * (1 - s.scatter);
  h.cracks.visible = s.crackClock > 0 && s.scatter < 0.95;
  // 眼光
  for (const e of h.eyes) {
    const col = COL.eyeOuter.clone().lerp(new THREE.Color('#F2EEFF'), s.eyeWhite);
    e.core.material.uniforms.uCol.value.copy(col); e.halo.material.uniforms.uCol.value.copy(col);
    e.core.material.uniforms.uOpen.value = Math.max(0.02, s.eyeOpen);
    e.core.material.uniforms.uInt.value = s.eyeInt * 0.085 * s.alpha;
    e.core.material.uniforms.uRays.value = s.eyeRays;
    e.halo.material.uniforms.uInt.value = s.eyeInt * 0.035 * s.alpha * (0.3 + 0.7 * s.eyeOpen);
    e.core.visible = e.halo.visible = s.eyeInt > 0.01;
  }
  // 王冠
  const cu = h.crown.material.uniforms;
  for (let i = 0; i < 7; i++) { cu.uSpike.value[i] = s.spikes[i]; cu.uSpikeD.value[i] = s.spikesD[i]; }
  cu.uRing.value = s.ring; cu.uBright.value = 1.5 * s.bright;
  h.crown.visible = s.ring > 0.01 || s.spikes.some(v => v > 0);
  h.gems.forEach((g, i) => { const on = clamp(s.gems * 7 - i); g.material.uniforms.uInt.value = on * 0.9 * s.alpha * (1 - s.spikesD[i]); g.visible = on > 0.01; });
  // 光环
  h.halo.visible = s.halo > 0.01;
  h.halo.scale.setScalar(Math.max(0.001, s.haloScale)); h.halo.rotation.z = s.haloRot;
  h.halo.material.uniforms.uBright.value = 1.1 * s.halo;
  h.haloGlow.visible = s.halo > 0.01; h.haloGlow.scale.setScalar(Math.max(0.001, s.haloScale));
  h.haloGlow.material.uniforms.uInt.value = 0.5 * s.halo * s.alpha;
  // 胸像
  h.bust.visible = s.bust > 0.01;
  h.bust.material.uniforms.uAssemble.value = s.bustAsm; h.bust.material.uniforms.uBright.value = 1.5 * s.bust;
  h.pendant.visible = s.bust > 0.01 && s.bustAsm > 0.6;
  h.pendant.material.uniforms.uInt.value = clamp((s.bustAsm - 0.6) / 0.4) * 1.4 * s.bust * s.alpha * (1 - s.scatter);
}
