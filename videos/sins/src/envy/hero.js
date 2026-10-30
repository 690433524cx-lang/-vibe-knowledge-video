// 嫉妒的主角：粒子人脸 + 会斜视的眼睛 + 毒绿裂纹 + 粒子蛇 + 荆棘光环 + 胸像 + 缠着藤蔓的心；以及远处暖金色的「别人」
import * as THREE from 'three';
import { K, HS, points, glow, reg } from '../core.js';
import { cloudMaterial, lineMaterial } from '../mat.js';
import { FACE, buildCracks, linesToPB, tagCrackProximity, buildBust } from '../geo.js';
import { clamp, lerp, prog, hash, D2R, LOOP, qk, TAU } from '../util.js';
import { ENVY, eyeMaterials, SNAKES, buildSnakePB, snakeMaterial, snakePathJS, buildThorns, thornMaterial, buildHeart, buildOther } from './assets.js';

export const OTHER_POS = [2.25, 2.3, -6.5];
// 裂纹在 3.5 秒开始，1.7 秒内长满半张脸：把傲慢项目的裂纹时刻表（从 9.0 起）压缩 0.7 倍
export const CRACK_T0 = 3.5, CRACK_K = 0.7;

let H = null;
export function buildHero(preview) {
  const root = new THREE.Group(); K.scene.add(root);
  const hs = new THREE.Group(); hs.scale.setScalar(HS); root.add(hs);
  const head = points(K.headPB, cloudMaterial({ size: 0.024, bright: 0.66, depthRef: 4.6, maxPx: 16, colA: ENVY.bright, colB: ENVY.main, colCrack: ENVY.toxic, colHook: 'if (aMisc.y == 2.0) b *= 0.45;' }), hs);
  head.material.uniforms.uSwirl.value = 1.4;
  // 裂纹：从两只眼角炸开
  const { lines } = buildCracks(K.headPB, K.faceCount, 11);
  const crackPB = linesToPB(lines, 0.0022, 13, 0.0022);
  tagCrackProximity(K.headPB, crackPB, 0.026);
  head.geometry.attributes.aExtra.array.set(K.headPB.e); head.geometry.attributes.aExtra.needsUpdate = true;
  const cracks = points(crackPB, lineMaterial({ size: 0.028, bright: 1.5, col: ENVY.toxic, hot: ENVY.high }), hs); cracks.renderOrder = 30;
  // 眼睛：内层放在辉光之后的场景里，跟随头部的世界矩阵
  const eyeRoot = new THREE.Group(); eyeRoot.matrixAutoUpdate = false; K.postScene.add(eyeRoot);
  const eyes = [FACE.eyeL, FACE.eyeR].map(p => {
    const m = eyeMaterials();
    const inner = new THREE.Mesh(new THREE.PlaneGeometry(0.6 / HS, 0.32 / HS), reg(m.inner)); inner.renderOrder = 34; inner.frustumCulled = false;
    const outer = new THREE.Mesh(new THREE.PlaneGeometry(0.6 / HS, 0.32 / HS), reg(m.outer)); outer.renderOrder = 42; outer.frustumCulled = false;
    m.u.uHalf.value.set(0.3, 0.16);
    for (const o of [inner, outer]) o.position.set(p[0], p[1] - 0.003, p[2] + 0.016);
    eyeRoot.add(inner); hs.add(outer);
    // 闭眼时的一道眼缝光（与片头相同）
    const slit = glow(5, ENVY.main, [0.6 / HS, 0.16 / HS], hs, { billboard: false, order: 41, half: [0.3 / HS, 0.08 / HS], ell: [0.08 / HS, 0.006 / HS] });
    slit.position.set(p[0], p[1] - 0.004, p[2] + 0.014);
    return { inner, outer, u: m.u, slit };
  });
  // 胸像（傲慢项目的胸像造型，改成绿色）
  const bust = points(buildBust(41), cloudMaterial({ size: 0.03, bright: 1.1, depthRef: 6, maxPx: 16, light: 0.4, colA: ENVY.bright, colB: ENVY.main }), hs);
  bust.material.uniforms.uAsmArc.value = 0.4; bust.material.uniforms.uSwirl.value = 1.2;
  // 心与藤蔓（世界单位）
  const hv = buildHeart(81);
  const heartG = new THREE.Group(); heartG.position.set(0, -1.42 * HS + 0.05, 0.5 * HS + 0.12); root.add(heartG);
  const heart = points(hv.heart, cloudMaterial({ size: 0.02, bright: 1.15, depthRef: 6, maxPx: 12, colA: ENVY.bright, colB: ENVY.bright }), heartG);
  const vines = points(hv.vines, cloudMaterial({ size: 0.018, bright: 1.1, depthRef: 6, maxPx: 12, colA: ENVY.main, colB: ENVY.main,
    uniforms: { uLeaf: { value: new THREE.Color(ENVY.bright) } }, uniformDecl: 'uniform vec3 uLeaf;', colHook: 'if (aMisc.y == 1.0) col = mix(uColA, uLeaf, 0.4);' }), heartG);
  const heartGlow = glow(0, ENVY.main, [0.9, 0.9], heartG, { core: ENVY.bright, order: 25 });
  // 粒子蛇
  const snakes = SNAKES.map((s, i) => {
    const m = snakeMaterial(s); m.uniforms.uWave.value = TAU * qk(128 * 4 / TAU) / LOOP; // t×4 量化到成片时长
    const pts = points(buildSnakePB(100 + i), m, root); pts.renderOrder = 28;
    const eyesS = [0, 1].map(() => glow(0, ENVY.toxic, [0.07, 0.07], root, { core: '#FFFFFF', order: 43 }));
    return { s, pts, eyes: eyesS };
  });
  // 荆棘光环
  const thornG = new THREE.Group(); thornG.position.set(0, 0.4, -0.4); root.add(thornG);
  const thorns = points(buildThorns(71), thornMaterial(), thornG); thorns.renderOrder = -5;
  thorns.material.uniforms.uSwirl.value = 0.8;
  const thornSeed = glow(1, ENVY.bright, [0.9, 0.9], thornG, { core: '#FFFFFF', order: 26 });
  const thornGlow = glow(4, ENVY.main, [3.6, 3.6], thornG, { billboard: false, order: -6 }); thornGlow.material.uniforms.uRing.value = 1.35 / 1.8;
  // 远处的「别人」：暖金色人形 + 一圈柔和的金光
  const otherG = new THREE.Group(); K.scene.add(otherG); otherG.position.set(...OTHER_POS);
  const other = points(buildOther(91, preview ? 7000 : 12000), cloudMaterial({ size: 0.03, bright: 1.0, depthRef: 10, maxPx: 10, colA: '#FFE7B0', colB: ENVY.other, light: 0.5 }), otherG);
  other.material.uniforms.uSwirl.value = 0.5;
  const otherLight = glow(0, ENVY.other, [2.2, 3.0], otherG, { core: '#FFE7B0', order: -8 }); otherLight.position.set(0, 0.95, -0.3);
  H = { root, hs, eyeRoot, head, cracks, lines, eyes, bust, heartG, heart, vines, heartGlow, snakes, thornG, thorns, thornSeed, thornGlow, otherG, other, otherLight };
  K.envyHero = H;
  return H;
}

export const HERO_DEFAULT = {
  visible: true, pos: [0, 0.25, 0], ry: 10 * D2R, rx: 0, alpha: 1, bright: 1, scatter: 0, colA: null, colB: null,
  eyeOpen: 0, gaze: 0, flare: 0, slit: 0.9, crackT: -1, snakes: [0, 0, 0, 0], thorn: 0, thornRot: 0, bust: 0, bustAsm: 1, heart: 0,
  other: 0, otherFall: 0, white: 0,
};
const lerp3 = (a, b, k) => [lerp(a[0], b[0], k), lerp(a[1], b[1], k), lerp(a[2], b[2], k)];

export function applyHero(s0, t, bursts) {
  const s = { ...HERO_DEFAULT, ...s0 };
  const h = H;
  h.root.visible = s.visible && s.alpha > 0.003; h.eyeRoot.visible = h.root.visible;
  h.otherG.visible = s.other > 0.003;
  if (h.otherG.visible) {
    const br = 1 + 0.012 * Math.sin(TAU * qk(128 / 3.2) * t / LOOP);
    const os = s.otherScale ?? 1; h.otherG.scale.set(os, os * br, os);
    const u = h.other.material.uniforms; u.uAlpha.value = s.other; u.uBright.value = 1.0 * (s.otherBright ?? 1);
    u.uScatter.value = s.otherScatter ?? 0; u.uScatterDist.value = 0.6; u.uScatterGrav.value = 1.2; u.uScatFade.value = 1;
    h.otherG.position.set(...(s.otherPos ?? OTHER_POS));
    h.otherLight.material.uniforms.uInt.value = 0.13 * s.other * (s.otherBright ?? 1) * (1 - clamp(s.otherScatter ?? 0));
  }
  if (!h.root.visible) return;
  h.root.position.set(...s.pos); h.root.rotation.set(s.rx, s.ry, 0);
  h.root.updateMatrixWorld(true); h.eyeRoot.matrix.copy(h.hs.matrixWorld); h.eyeRoot.matrixWorldNeedsUpdate = true;
  const sc = s.scatter;
  const setCommon = (m, extraBright = 1) => {
    const u = m.uniforms; u.uAlpha.value = s.alpha; u.uScatter.value = sc; u.uScatterDist.value = 0.5; u.uScatSpread.value = 0.5; u.uWhite.value = s.white;
  };
  // 脸
  const hu = h.head.material.uniforms; setCommon(h.head.material);
  hu.uBright.value = 0.66 * s.bright; hu.uEyeOpen.value = clamp(s.eyeOpen); hu.uCrackTint.value = 1;
  if (s.colA) { hu.uColA.value.setRGB(...s.colA); hu.uColB.value.setRGB(...s.colB); }
  // 裂纹
  const cu = h.cracks.material.uniforms;
  h.lines.forEach((L, i) => {
    const pr = s.crackT < 0 ? 0 : clamp((s.crackT - (L.t0 - 9.0) * CRACK_K) / (L.dur * CRACK_K));
    cu.uProg.value[i] = pr; hu.uCrack.value[i] = pr;
  });
  cu.uAlpha.value = s.alpha * (1 - clamp(sc * 1.5)); h.cracks.visible = s.crackT > 0 && sc < 0.7;
  // 裂纹生长端的火花
  if (s.crackT > 0 && s.crackT < 2.2 && sc < 0.1) {
    h.lines.forEach((L, i) => {
      if (L.parent !== -1) return;
      for (let k = 0; k < 10; k++) {
        const tb = CRACK_T0 + (L.t0 - 9.0) * CRACK_K + k * L.dur * CRACK_K / 10; if (tb > t || t - tb > 0.45) continue;
        const pr = clamp((tb - CRACK_T0 - (L.t0 - 9.0) * CRACK_K) / (L.dur * CRACK_K));
        const n = L.pts.length - 1, f = pr * n, j = Math.min(n - 1, Math.floor(f)), r = f - j;
        const lp = lerp3(L.pts[j], L.pts[j + 1], r);
        const wp = new THREE.Vector3(...lp).multiplyScalar(HS).applyEuler(h.root.rotation).add(h.root.position);
        bursts.push({ t0: tb, pos: wp.toArray(), n: 6, speed: 0.5, life: 0.45, grav: 0.4, seed: i * 31 + k, bright: 2.2 });
      }
    });
  }
  // 眼睛
  h.eyes.forEach(e => {
    const u = e.u;
    u.uOpen.value = clamp(s.eyeOpen); u.uGaze.value = s.gaze; u.uSquint.value = clamp(Math.abs(s.gaze) / 0.85) * clamp(s.eyeOpen);
    u.uFlare.value = s.flare; u.uAlpha.value = s.alpha * (1 - clamp(sc * 2)); u.uIrisB.value = s.bright;
    e.inner.visible = s.eyeOpen > 0.01 && sc < 0.5;
    e.outer.visible = sc < 0.5;
    const su = e.slit.material.uniforms;
    su.uInt.value = 0.085 * s.slit * (1 - clamp(s.eyeOpen * 3)) * s.alpha * (1 - clamp(sc * 2));
    e.slit.visible = su.uInt.value > 0.0005;
  });
  // 胸像
  h.bust.visible = s.bust > 0.003;
  const bu = h.bust.material.uniforms; setCommon(h.bust.material); bu.uAssemble.value = s.bustAsm; bu.uBright.value = 1.1 * s.bust * s.bright;
  // 心：1.1 秒一次搏动（量化到成片时长）
  h.heartG.visible = s.heart > 0.003;
  if (h.heartG.visible) {
    const ph = (t * qk(128 / 1.1) / LOOP) % 1, beat = Math.exp(-Math.pow((ph - 0.1) / 0.06, 2)) + 0.6 * Math.exp(-Math.pow((ph - 0.3) / 0.06, 2));
    h.heartG.scale.setScalar(Math.max(0.001, s.heart) * (1 + 0.08 * Math.min(1, beat)));
    for (const p of [h.heart, h.vines]) { setCommon(p.material); p.material.uniforms.uBright.value = (p === h.heart ? 1.15 : 1.1) * (1 + 0.35 * beat); }
    h.heartGlow.material.uniforms.uInt.value = 0.1 * s.heart * (1 + 0.8 * beat) * s.alpha * (1 - clamp(sc));
  }
  // 蛇：生长参数 g（0→1）：从 u0（裂纹末端附近）向两头显现，蛇头最后到达 u=1
  h.snakes.forEach((S, i) => {
    const g = clamp(s.snakes[i] ?? 0), u = S.pts.material.uniforms;
    S.pts.visible = g > 0.003;
    const lo = lerp(S.s.u0, 0, g), hi = lerp(S.s.u0, 1, g);
    u.uLo.value = lo; u.uHi.value = hi; setCommon(S.pts.material); u.uBright.value = 1.25 * s.bright;
    S.eyes.forEach((E, k) => {
      E.visible = S.pts.visible && g > 0.03 && sc < 0.4;
      if (!E.visible) return;
      const c = snakePathJS(S.s, hi, t, u.uWave.value), c2 = snakePathJS(S.s, hi + 0.004, t, u.uWave.value);
      const T = norm3([c2[0] - c[0], c2[1] - c[1], c2[2] - c[2]]);
      const N1 = norm3([T[2], 0, -T[0]]), N2 = cross3(N1, T);
      const side = k ? 1 : -1;
      E.position.set(c[0] + T[0] * 0.17 + N1[0] * 0.05 * side + N2[0] * 0.04, c[1] + T[1] * 0.17 + N2[1] * 0.04, c[2] + T[2] * 0.17 + N1[2] * 0.05 * side + N2[2] * 0.04);
      E.material.uniforms.uInt.value = 0.55 * s.alpha * (1 - clamp(sc * 2.5));
    });
  });
  // 荆棘光环：从一个亮点展开，每秒 6° 逆时针转
  const th = clamp(s.thorn);
  h.thornG.visible = th > 0.003;
  if (h.thornG.visible) {
    h.thornG.scale.setScalar(Math.max(0.001, th)); h.thornG.rotation.z = s.thornRot;
    setCommon(h.thorns.material); h.thorns.material.uniforms.uBright.value = 1.1 * s.bright;
    h.thornSeed.material.uniforms.uInt.value = (s.thornSeed ?? 0) * s.alpha;
    h.thornSeed.scale.setScalar(1 / Math.max(0.05, th));
    h.thornSeed.visible = (s.thornSeed ?? 0) > 0.01;
    h.thornGlow.material.uniforms.uInt.value = 0.25 * th * s.alpha * (1 - clamp(sc));
  }
}
const norm3 = a => { const l = Math.hypot(a[0], a[1], a[2]) || 1; return [a[0] / l, a[1] / l, a[2] / l]; };
const cross3 = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
