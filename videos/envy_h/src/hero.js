// 嫉妒的主角（横屏长版）：粒子人脸（与傲慢的脸完全相同的数量、大小、亮度）+ 粒子眼睛 + 毒绿裂纹 + 两条蛇 + 荆棘光环 + 胸像 + 缠着藤蔓的心；以及远处的「别人」
// 人脸用傲慢项目的原尺寸；嫉妒专属造型的尺寸按「人头高 2 个单位」给出，挂在缩放为 U 的组里
import * as THREE from 'three';
import { K, U, points, glow } from './core.js';
import { cloudMaterial, lineMaterial } from './mat.js';
import { FACE, buildCracks, linesToPB, tagCrackProximity, buildBust } from './geo.js';
import { clamp, lerp, prog, hash, D2R, LOOP, qk, TAU } from './util.js';
import { ENVY, buildEyePB, eyePointMaterial, buildBeamPB, beamMaterial, buildThorns, thornMaterial, buildHeart, buildOther, snakePath, buildSnakeBody, snakeBodyMaterial, SNAKE } from './assets.js';

export const CRACK_T0 = 3.5, CRACK_K = 0.7;

let H = null;
export function buildHero(preview) {
  const root = new THREE.Group(); K.scene.add(root);
  const hs = new THREE.Group(); root.add(hs);
  const { lines } = buildCracks(K.headPB, K.faceCount, 11);
  const crackPB = linesToPB(lines, 0.0022, 13, 0.0022);
  tagCrackProximity(K.headPB, crackPB, 0.026);
  const head = points(K.headPB, cloudMaterial({ size: 0.0135, bright: 0.62, depthRef: 2.6, maxPx: 16, colA: ENVY.high, colB: ENVY.main, colCrack: ENVY.toxic,
    uniforms: { uEyeDim: { value: 0 } }, uniformDecl: 'uniform float uEyeDim;',
    colHook: `
      if (aMisc.y == 1.0 || aMisc.y == 2.0) b *= 0.25;
      { vec2 d1 = (position.xy - vec2(${FACE.eyeL[0].toFixed(4)}, ${FACE.eyeL[1].toFixed(4)}))/vec2(0.1, 0.05);
        vec2 d2 = (position.xy - vec2(${FACE.eyeR[0].toFixed(4)}, ${FACE.eyeR[1].toFixed(4)}))/vec2(0.1, 0.05);
        b *= 1.0 - uEyeDim*0.9*(exp(-dot(d1, d1)) + exp(-dot(d2, d2))); }
      b *= 1.0 - ct*0.45;` }), hs);
  head.material.uniforms.uSwirl.value = 1.4;
  // 裂纹：毒绿色，亮度为傲慢裂纹（2.6）的 60%
  const cracks = points(crackPB, lineMaterial({ size: 0.016, bright: 2.6 * 0.6 * 0.7, col: ENVY.toxic, hot: ENVY.bright }), hs); cracks.renderOrder = 30;
  // 眼睛
  const eyes = [[FACE.eyeL, 1], [FACE.eyeR, -1]].map(([p, outer], i) => {
    const g = new THREE.Group(); g.position.set(p[0], p[1] - 0.003, p[2] + 0.014); g.scale.setScalar(U); hs.add(g);
    const pts = points(buildEyePB(150 + i), eyePointMaterial(outer), g); pts.renderOrder = 36;
    pts.material.uniforms.uSize.value = 0.0105; pts.material.uniforms.uDepthRef.value = 2.6; pts.material.uniforms.uBright.value = 0.42;
    const hl = glow(0, ENVY.high, [0.035, 0.035], g, { core: '#FFFFFF', order: 44 });
    const slit = glow(5, ENVY.main, [0.6, 0.16], g, { billboard: false, order: 35, half: [0.3, 0.08], ell: [0.15, 0.008] });
    const beam = points(buildBeamPB(170 + i), beamMaterial(), K.scene); beam.renderOrder = 27;
    beam.material.uniforms.uSize.value = 0.016;
    return { g, pts, hl, slit, beam, outer };
  });
  // 胸像（傲慢的胸像造型）与吊坠位置
  const bust = points(buildBust(41), cloudMaterial({ size: 0.017, bright: 1.0, depthRef: 3, maxPx: 16, light: 0.4, colA: ENVY.bright, colB: ENVY.main }), hs);
  bust.material.uniforms.uAsmArc.value = 0.4; bust.material.uniforms.uSwirl.value = 1.2;
  const hv = buildHeart(81);
  const heartG = new THREE.Group(); heartG.position.set(0, -1.42 + 0.04, 0.5 + 0.06); root.add(heartG);
  const heartIn = new THREE.Group(); heartIn.scale.setScalar(U); heartG.add(heartIn);
  const heart = points(hv.heart, cloudMaterial({ size: 0.013, bright: 1.15, depthRef: 3, maxPx: 12, colA: ENVY.bright, colB: ENVY.bright }), heartIn);
  const vines = points(hv.vines, cloudMaterial({ size: 0.012, bright: 1.1, depthRef: 3, maxPx: 12, colA: ENVY.main, colB: ENVY.main,
    uniforms: { uLeaf: { value: new THREE.Color(ENVY.bright) } }, uniformDecl: 'uniform vec3 uLeaf;', colHook: 'if (aMisc.y == 1.0) col = mix(uColA, uLeaf, 0.4);' }), heartIn);
  const heartGlow = glow(0, ENVY.main, [0.6, 0.6], heartG, { core: ENVY.bright, order: 25 });
  // 两条蛇
  const snakeG = new THREE.Group(); snakeG.scale.setScalar(U); root.add(snakeG);
  const snakes = [1, -1].map((side, i) => {
    const path = snakePath(side);
    const body = buildSnakeBody(300 + i, path.L);
    const pts = points(body.pb, snakeBodyMaterial(), snakeG); pts.renderOrder = 28;
    const eyesS = [0, 1].map(() => glow(0, ENVY.toxic, [0.05, 0.05], snakeG, { core: ENVY.toxic, order: 43 }));
    return { side, path, meta: body.meta, pts, eyes: eyesS };
  });
  // 荆棘光环（头部后方）
  const thornG = new THREE.Group(); thornG.position.set(0, 0.4 * U, -0.4 * U); root.add(thornG);
  const thornIn = new THREE.Group(); thornIn.scale.setScalar(U); thornG.add(thornIn);
  const thorns = points(buildThorns(71), thornMaterial(), thornIn); thorns.renderOrder = -5;
  thorns.material.uniforms.uSize.value = 0.016; thorns.material.uniforms.uSwirl.value = 0.8;
  const thornSeed = glow(1, ENVY.bright, [0.6, 0.6], thornG, { core: '#FFFFFF', order: 26 });
  const thornGlow = glow(4, ENVY.main, [2.4, 2.4], thornG, { billboard: false, order: -6 }); thornGlow.material.uniforms.uRing.value = 1.35 * U / 1.2;
  // 「别人」：高光色人形，辉光比其他元素更强
  const otherG = new THREE.Group(); K.scene.add(otherG);
  const other = points(buildOther(91, preview ? 8000 : 15000), cloudMaterial({ size: 0.022, bright: 1.6, depthRef: 8, maxPx: 10, colA: ENVY.high, colB: ENVY.bright, light: 0.5 }), otherG);
  other.material.uniforms.uSwirl.value = 0.5;
  const otherLight = glow(0, ENVY.high, [1.6, 2.4], otherG, { core: ENVY.high, order: -8 }); otherLight.position.set(0, 0.95, -0.3);
  H = { root, hs, head, cracks, lines, eyes, bust, heartG, heart, vines, heartGlow, snakeG, snakes, thornG, thorns, thornSeed, thornGlow, otherG, other, otherLight };
  K.envyHero = H;
  return H;
}

export const HERO_DEFAULT = {
  visible: true, pos: [0, 0, 0], ry: 0, alpha: 1, bright: 1, scatter: 0,
  eyeOpen: 0, gaze: 0, irisB: 1, slit: 0.9, crackT: -1, snakes: [0, 0], thorn: 0, thornRot: 0, bust: 0, bustAsm: 1, heart: 0,
  other: 0, otherPos: [3.0, 1.0, -6], otherScale: 0.75, otherScatter: 0, otherBright: 1, beam: 0, beamReach: 0, white: 0,
};
const lerp3 = (a, b, k) => [lerp(a[0], b[0], k), lerp(a[1], b[1], k), lerp(a[2], b[2], k)];
const norm3 = a => { const l = Math.hypot(a[0], a[1], a[2]) || 1; return [a[0] / l, a[1] / l, a[2] / l]; };
const cross3 = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];

export function applyHero(s0, t, bursts) {
  const s = { ...HERO_DEFAULT, ...s0 }, h = H, sc = s.scatter;
  // 「别人」
  h.otherG.visible = s.other > 0.003;
  if (h.otherG.visible) {
    const br = 1 + 0.012 * Math.sin(TAU * qk(128 / 3.2) * t / LOOP), os = s.otherScale;
    h.otherG.position.set(...s.otherPos); h.otherG.scale.set(os, os * br, os);
    const u = h.other.material.uniforms; u.uAlpha.value = s.other; u.uBright.value = 1.6 * s.otherBright;
    u.uScatter.value = s.otherScatter; u.uScatterDist.value = 0.6; u.uScatterGrav.value = s.otherGrav ?? 1.2;
    u.uScatterBias.value.set(...(s.otherBias ?? [0, 0, 0]));
    h.otherLight.material.uniforms.uInt.value = 0.12 * s.other * s.otherBright * (1 - clamp(s.otherScatter));
  }
  h.root.visible = s.visible && s.alpha > 0.003;
  if (!h.root.visible) { h.eyes.forEach(e => { e.beam.visible = false; }); return; }
  h.root.position.set(...s.pos); h.root.rotation.set(s.rx ?? 0, s.ry, 0); h.root.updateMatrixWorld(true);
  const setCommon = m => { const u = m.uniforms; u.uAlpha.value = s.alpha; u.uScatter.value = sc; u.uScatterDist.value = 0.5; u.uScatSpread.value = 0.5; u.uWhite.value = s.white; u.uScatFade.value = s.scatFade ?? 1; };
  const hu = h.head.material.uniforms; setCommon(h.head.material);
  hu.uBright.value = 0.62 * s.bright; hu.uEyeDim.value = clamp(s.eyeOpen * 2.5); hu.uEyeOpen.value = clamp(s.eyeOpen); hu.uCrackTint.value = 1;
  // 裂纹
  const cu = h.cracks.material.uniforms;
  h.lines.forEach((L, i) => {
    const pr = s.crackT < 0 ? 0 : clamp((s.crackT - (L.t0 - 9.0) * CRACK_K) / (L.dur * CRACK_K));
    cu.uProg.value[i] = pr; hu.uCrack.value[i] = pr;
  });
  cu.uAlpha.value = s.alpha * (1 - clamp(sc * 1.5)); h.cracks.visible = s.crackT > 0 && sc < 0.7;
  if (s.crackT > 0 && s.crackT < 2.2 && sc < 0.1) {
    h.lines.forEach((L, i) => {
      if (L.parent !== -1) return;
      for (let k = 0; k < 10; k++) {
        const tb = CRACK_T0 + (L.t0 - 9.0) * CRACK_K + k * L.dur * CRACK_K / 10; if (tb > t || t - tb > 0.45) continue;
        const pr = clamp((tb - CRACK_T0 - (L.t0 - 9.0) * CRACK_K) / (L.dur * CRACK_K));
        const n = L.pts.length - 1, f = pr * n, j = Math.min(n - 1, Math.floor(f)), r = f - j;
        const wp = new THREE.Vector3(...lerp3(L.pts[j], L.pts[j + 1], r)).applyMatrix4(h.hs.matrixWorld);
        bursts.push({ t0: tb, pos: wp.toArray(), n: 5, speed: 0.35, life: 0.45, grav: 0.4, seed: i * 31 + k, bright: 2.0 });
      }
    });
  }
  // 眼睛与视线光束
  const otherW = new THREE.Vector3(...s.otherPos).add(new THREE.Vector3(0, 1.45 * s.otherScale, 0));
  h.eyes.forEach(e => {
    e.g.scale.setScalar(U * (s.eyeScale ?? 1)); e.pts.material.uniforms.uSize.value = 0.0105 * (s.eyeScale ?? 1);
    const u = e.pts.material.uniforms, fade = s.alpha * (1 - clamp(sc * 2));
    u.uOpenL.value = s.eyeOpen; u.uGazeX.value = 0.11 * s.gaze; u.uIrisB.value = s.irisB;
    u.uAlpha.value = fade; u.uBright.value = 0.42; e.pts.visible = fade > 0.003;
    e.hl.position.set(0.11 * s.gaze + 0.009, 0.011, 0.003);
    e.hl.material.uniforms.uInt.value = 0.45 * clamp((s.eyeOpen - 0.2) / 0.2) * fade * s.irisB; e.hl.visible = s.eyeOpen > 0.2;
    const su = e.slit.material.uniforms; su.uInt.value = 0.025 * s.slit * (1 - clamp(s.eyeOpen * 3)) * fade; e.slit.visible = su.uInt.value > 0.0005;
    if (s.sparkT0 != null && t >= s.sparkT0 && t < s.sparkT0 + 0.6) {
      const c = new THREE.Vector3(0.11 * s.gaze, 0, 0.01); e.g.localToWorld(c);
      bursts.push({ t0: s.sparkT0, pos: c.toArray(), n: 36, speed: 0.22, life: 0.55, grav: 0.05, seed: 900 + e.outer, bright: 2.0, dir: [0, 0, 0.3], spread: 1.0 });
    }
    const beamOn = s.beam * fade;
    e.beam.visible = beamOn > 0.003 && s.beamReach > 0.001 && h.otherG.visible;
    if (e.beam.visible) {
      const a = new THREE.Vector3(0.11 * s.gaze, 0, 0.004); e.g.localToWorld(a);
      const bu = e.beam.material.uniforms; bu.uA.value.copy(a); bu.uB.value.copy(otherW); bu.uReach.value = s.beamReach; bu.uBeam.value = beamOn;
    }
  });
  // 胸像
  h.bust.visible = s.bust > 0.003;
  const bu = h.bust.material.uniforms; setCommon(h.bust.material); bu.uAssemble.value = s.bustAsm; bu.uBright.value = 1.0 * s.bust * s.bright;
  // 心：1.1 秒一次搏动
  h.heartG.visible = s.heart > 0.003;
  if (h.heartG.visible) {
    const ph = (t * qk(128 / 1.1) / LOOP) % 1, beat = Math.exp(-Math.pow((ph - 0.1) / 0.06, 2)) + 0.6 * Math.exp(-Math.pow((ph - 0.3) / 0.06, 2));
    h.heartG.scale.setScalar(Math.max(0.001, s.heart) * (1 + 0.08 * Math.min(1, beat)));
    for (const p of [h.heart, h.vines]) { setCommon(p.material); p.material.uniforms.uBright.value = 1.1 * (1 + 0.35 * beat); }
    h.heartGlow.material.uniforms.uInt.value = 0.1 * s.heart * (1 + 0.8 * beat) * s.alpha * (1 - clamp(sc));
  }
  // 蛇：蛇头沿路径先钻出，身体随后显现；身体做行波式摆动；信子每 1.5 秒吐一次
  h.snakes.forEach((S, i) => updateSnake(S, clamp(s.snakes[i] ?? 0), t, s, sc));
  // 荆棘光环
  const th = clamp(s.thorn);
  h.thornG.visible = th > 0.003;
  if (h.thornG.visible) {
    h.thornG.scale.setScalar(Math.max(0.001, th)); h.thornG.rotation.z = s.thornRot;
    setCommon(h.thorns.material); h.thorns.material.uniforms.uBright.value = 1.1 * s.bright;
    h.thornSeed.material.uniforms.uInt.value = (s.thornSeed ?? 0) * s.alpha; h.thornSeed.scale.setScalar(1 / Math.max(0.05, th));
    h.thornSeed.visible = (s.thornSeed ?? 0) > 0.01;
    h.thornGlow.material.uniforms.uInt.value = 0.22 * th * s.alpha * (1 - clamp(sc));
  }
}

const TONGUE_PER = 1.5;
function updateSnake(S, g, t, s, sc) {
  const pos = S.pts.geometry.attributes.position.array;
  S.pts.visible = g > 0.003;
  const mu = S.pts.material.uniforms; mu.uAlpha.value = s.alpha; mu.uScatter.value = sc; mu.uScatterDist.value = 0.5 / U; mu.uScatFade.value = s.scatFade ?? 1;
  if (!S.pts.visible) { S.eyes.forEach(e => { e.visible = false; }); return; }
  const L = S.path.L, headD = g * L;
  const wv = TAU * qk(128 * 0.55) / LOOP; // 行波
  const frame = d => {
    const c = S.path.at(d), c2 = S.path.at(d + 0.01), c0 = S.path.at(d - 0.01);
    const T = norm3([c2[0] - c0[0], c2[1] - c0[1], c2[2] - c0[2]]);
    const N1 = norm3(cross3(T, [0, 0, 1])), N2 = cross3(N1, T); // N2 大致朝向镜头（背）
    return { c, T, N1, N2 };
  };
  // 从蛇头后的颈部到尾巴逐渐变细
  const radius = sd => sd < 0.15 ? lerp(0.07, SNAKE.rMax, sd / 0.15) : lerp(SNAKE.rMax, SNAKE.rTail, Math.pow(clamp((sd - 0.15) / Math.max(0.3, L - 0.15)), 0.8));
  // 蛇头朝向：沿路径方向，略微转向镜头
  // 蛇头：三角形平面基本朝向镜头（轮廓清楚），尖端沿游动方向朝前，略微探向镜头
  const hf = frame(headD), fwd = norm3([hf.T[0], hf.T[1], 0.35]);
  const side = norm3(cross3([0, 0.3, 1], fwd)), up = norm3(cross3(fwd, side));   // 头顶大致朝向镜头，侧面轮廓呈流线型
  const tongue = ((t % TONGUE_PER) / TONGUE_PER);
  const tOut = tongue < 0.3 ? Math.sin(tongue / 0.3 * Math.PI) : 0;
  S.meta.forEach((m, k) => {
    let p;
    if (m.k === 0) {
      const d = headD - 0.12 - m.d; // 身体从蛇头后面开始
      if (d < 0) { p = [0, -999, 0]; }
      else {
        const f = frame(d), r = radius(m.d + 0.12);
        const wave = Math.sin(m.d * 9 - t * wv) * r * 0.6 * clamp(m.d / 0.3);
        p = [f.c[0] + f.N1[0] * (Math.sin(m.ang) * r + wave) + f.N2[0] * Math.cos(m.ang) * r,
             f.c[1] + f.N1[1] * (Math.sin(m.ang) * r + wave) + f.N2[1] * Math.cos(m.ang) * r,
             f.c[2] + f.N1[2] * (Math.sin(m.ang) * r + wave) + f.N2[2] * Math.cos(m.ang) * r];
      }
    } else if (m.k === 1) {
      const b = [hf.c[0] - fwd[0] * 0.08, hf.c[1] - fwd[1] * 0.08, hf.c[2] - fwd[2] * 0.08];
      p = [b[0] + fwd[0] * m.a + side[0] * m.w + up[0] * m.h, b[1] + fwd[1] * m.a + side[1] * m.w + up[1] * m.h, b[2] + fwd[2] * m.a + side[2] * m.w + up[2] * m.h];
    } else {
      if (tOut <= 0.01) { p = [0, -999, 0]; }
      else {
        const L1 = 0.13 * tOut, f = m.f;
        const tip = [hf.c[0] + fwd[0] * 0.23, hf.c[1] + fwd[1] * 0.23, hf.c[2] + fwd[2] * 0.23];
        const along = f * L1, spread = m.fork * Math.max(0, f - 0.7) * 0.15 * tOut;
        p = [tip[0] + fwd[0] * along + side[0] * spread, tip[1] + fwd[1] * along + side[1] * spread, tip[2] + fwd[2] * along + side[2] * spread];
      }
    }
    pos[k * 3] = p[0]; pos[k * 3 + 1] = p[1]; pos[k * 3 + 2] = p[2];
  });
  S.pts.geometry.attributes.position.needsUpdate = true;
  S.eyes.forEach((E, k) => {
    const sd = k ? 1 : -1;
    E.position.set(hf.c[0] + fwd[0] * 0.03 + side[0] * 0.055 * sd + up[0] * 0.035, hf.c[1] + fwd[1] * 0.03 + side[1] * 0.055 * sd + up[1] * 0.035, hf.c[2] + fwd[2] * 0.03 + side[2] * 0.055 * sd + up[2] * 0.035);
    E.material.uniforms.uInt.value = 0.9 * s.alpha * (1 - clamp(sc * 2.5)) * clamp(g * 8);
    E.visible = sc < 0.4;
  });
}
