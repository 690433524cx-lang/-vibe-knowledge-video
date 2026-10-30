// 《七宗罪·嫉妒》横屏长版的全部场景与时间表（84 秒）
// 所有场景都放在世界原点附近（各段分时出现）：钩子的主角、巨眼、第四个坐着的人的头、大脑、手机屏幕、结尾的主角都在原点，转场因此是连续的
import * as THREE from 'three';
import { K, U, points, glow, project } from './core.js';
import { cloudMaterial, lineMaterial } from './mat.js';
import { clamp, lerp, lerp3, prog, outExpo, sine, out3, inOut, D2R, hash, TAU, LOOP, qk, vis, rng } from './util.js';
import { glowText, staggerLine, tag, plain, fs, C, getCtx } from './text.js';
import { HERO_RY, CLOSE_CAM } from './intro.js';
import { buildHero, applyHero, CRACK_T0 } from './hero.js';
import { ENVY, buildOther } from './assets.js';
import { EYE, buildGiantEye, giantEyeMaterial, buildCliff, buildSitter, SITTER_EYES, buildStitchLines, BRAIN2, buildBrainSide, buildStitches, PHONE, buildPhone, cardMaterial, buildViewer } from './long_assets.js';
import { PB, FACE } from './geo.js';

export const N = 2;
export function timeline() {
  return {
    PUNCH: [[1.3, 1], [3.5, 1.7], [8.4, 1], [17.8, 1], [45.3, 1], [75.0, 0.8], [77.8, 1]],
    FLASH: [[1.3, 0.30], [3.5, 0.35], [17.8, 0.25], [77.8, 0.25]],
    BOLTS: [[1.3, 0.8, 0.28, 0.65], [3.5, -0.5, 0.3, 1.2], [6.8, 0.62, 0.2, 0.7], [17.8, 0.5, 0.26, 0.9], [45.3, -0.6, 0.25, 0.8], [51.2, 0.66, 0.16, 0.45], [64.6, -0.68, 0.16, 0.45]],
    SOURCES: [
      [10.3, 14.4, '莎士比亚《奥赛罗》'],
      [24.3, 28.6, '但丁《神曲·炼狱篇》第十三歌'],
      [40.3, 45.0, '日本放射线医学综合研究所 · 2009'],
      [58.3, 62.8, '心理学家费斯廷格 · 1954'],
    ],
    SUBS: [
      [2.0, 3.5, '我真心为你高兴。', { exempt: true }],
      [3.6, 6.0, '只要你，别比我〔毒〕好太多〔/毒〕。', { exempt: true }],
      [10.3, 14.4, '四百多年前，莎士比亚写过一出悲剧。'],
      [14.55, 19.6, '剧中有人警告主角：小心嫉妒，它是一只〔毒〕绿眼睛的怪物〔/毒〕。'],
      [19.75, 23.9, '从那以后，绿色就成了嫉妒的颜色。'],
      [24.3, 28.6, '但丁写到，嫉妒的人坐在山崖下，'],
      [28.75, 32.8, '眼皮被细细的铁丝缝上，'],
      [32.95, 36.6, '彼此靠着肩膀，谁也看不见谁。'],
      [40.3, 45.0, '2009年，日本的科学家扫描了人在嫉妒时的大脑。'],
      [45.15, 48.4, '和〔毒〕疼痛〔/毒〕有关的区域，亮了。'],
      [48.55, 52.6, '更有意思的是：当被嫉妒的人倒霉时——'],
      [52.75, 55.8, '大脑里的〔亮〕奖励〔/亮〕区域，也亮了。'],
      [58.3, 62.8, '心理学家费斯廷格说：人天生会拿自己和别人比。'],
      [62.95, 67.2, '可在朋友圈里，你看到的，全是别人最好的一面。'],
    ],
  };
}

// ------------------------------------------------------------ 布局常量
const OTHER_HOOK = { pos: [2.68, 0.4, -6], scale: 0.745 };              // 钩子：画面右上方远处，约占画面高度 25%
const ROW = { n: 8, dx: 0.78, mid: 4 };                                  // 第四个（序号 4）坐着的人的头在原点
const sitterBase = i => [(i - ROW.mid) * ROW.dx, -0.62, -0.05];
const GROUND = -0.62 - 1.05, WALL_Z = -0.85;
const SEWN = [40, 0, 0];                                                 // 缝眼特写的那张脸（单独放在远处，硬切过去）
const PLAT = { pos: [2.55, -0.62, -0.5], scale: 0.66 };                  // 第三章：高台上的「别人」
const VIEWER = { pos: [4.2, -2.32, 0.2], s: 2.45 };                      // 第四章：看手机的人
const HERO5 = [0, 0, 0.6];                                               // 结尾：主角在手机前方

// ------------------------------------------------------------ 资产
let A = null;
export function build(preview) {
  const k = preview ? 0.5 : 1;
  buildHero(preview);
  // 巨眼
  const eyeG = new THREE.Group(); K.scene.add(eyeG);
  const eye = points(buildGiantEye(201, k), giantEyeMaterial(), eyeG); eye.material.uniforms.uSwirl.value = 2.2;
  eye.material.uniforms.uSize.value = 0.04;
  const hl = glow(0, ENVY.high, [0.3, 0.3], eyeG, { core: '#FFFFFF', order: 44 });
  // 山崖与坐着的人
  const cliffG = new THREE.Group(); K.scene.add(cliffG);
  const cliff = points(buildCliffWall(301, k), cloudMaterial({ size: 0.03, bright: 3.6, depthRef: 7, maxPx: 8, colA: ENVY.main, colB: ENVY.dark,
    uniforms: { uEdge: { value: new THREE.Color(ENVY.bright) }, uDk: { value: new THREE.Color(ENVY.dark) } }, uniformDecl: 'uniform vec3 uEdge, uDk;',
    colHook: 'col = aMisc.y == 1.0 ? uEdge : mix(uDk*2.4, uColA, aExtra.y);' }), cliffG);
  const stitchLinePB = buildStitchLines(401);
  const sitters = [];
  for (let i = 0; i < ROW.n; i++) {
    const g = new THREE.Group(); cliffG.add(g);
    g.position.set(...sitterBase(i)); g.rotation.set(0, (hash(i * 3.1) - 0.5) * 0.25, (i % 2 ? 1 : -1) * 8 * D2R);
    // 斗篷：边缘亮色勾边，内部较暗
    const body = points(buildSitter(311 + i, k), cloudMaterial({ size: 0.02, bright: 1.0, depthRef: 6, maxPx: 10, facing: 0, colA: ENVY.bright, colB: ENVY.dark,
      colHook: 'float rr = 1.0 - clamp(abs(facing), 0.0, 1.0); b *= 0.18 + 2.6*pow(rr, 2.2); col = mix(uColB*2.6, uColA, smoothstep(0.35, 0.85, rr));' }), g);
    const lines = points(stitchLinePB, cloudMaterial({ size: 0.012, bright: 1.3, depthRef: 4, maxPx: 6, colA: ENVY.bright, colB: ENVY.bright }), g);
    sitters.push({ g, body, lines });
  }
  // 缝眼特写：复用粒子人脸，闭着眼；每只眼的眼缝上横跨 4 道针脚
  const sewnG = new THREE.Group(); sewnG.position.set(...SEWN); K.scene.add(sewnG);
  const sewnFace = points(K.headPB, cloudMaterial({ size: 0.0135, bright: 0.55, depthRef: 2.2, maxPx: 16, colA: ENVY.bright, colB: ENVY.main, colHook: 'if (aMisc.y == 2.0) b *= 0.3; if (aMisc.y == 1.0) b *= 0.55;' }), sewnG);
  const stitchPB = buildStitches([FACE.eyeL, FACE.eyeR]);
  const stitches = points(stitchPB, cloudMaterial({ size: 0.007, bright: 2.2, depthRef: 1.6, maxPx: 8, colA: ENVY.high, colB: ENVY.high,
    uniforms: { uSeq: { value: 0 } }, uniformDecl: 'uniform float uSeq;',
    colHook: 'b *= 0.9 + 2.2*exp(-pow(mod(uSeq - aExtra.x, 8.0)*1.0, 2.0)*2.0);' }), sewnG);
  stitches.material.uniforms.uReveal.value = 99; // aExtra.x 存的是针脚序号，不能被「逐步显现」裁掉
  const stitchGlows = [];
  [FACE.eyeL, FACE.eyeR].forEach((e, ei) => { for (let kk = 0; kk < 4; kk++) { const m = glow(0, ENVY.high, [0.035, 0.035], sewnG, { core: '#FFFFFF', order: 46 }); m.position.set(e[0] + (kk - 1.5) * 0.03 * (ei ? -1 : 1), e[1] - 0.004, e[2] + 0.02); m.userData.idx = ei * 4 + kk; stitchGlows.push(m); } });
  // 大脑（侧面视角）
  const brainG = new THREE.Group(); K.scene.add(brainG);
  const brainPB = buildBrainSide(511, k);
  for (let i = 0; i < brainPB.count; i++) { const a = hash(i * 1.7) * TAU, r = 0.25 * Math.cbrt(hash(i * 2.3)); brainPB.f[i * 3] = Math.cos(a) * r; brainPB.f[i * 3 + 1] = (hash(i * 5.1) - 0.5) * 0.5; brainPB.f[i * 3 + 2] = Math.sin(a) * r; }
  const brain = points(brainPB, cloudMaterial({ size: 0.016, bright: 1.7, depthRef: 4.2, maxPx: 10, facing: 0.3, light: 0.25, colA: ENVY.bright, colB: ENVY.main,
    uniforms: { uPain: { value: 0 }, uRew: { value: 0 }, uRewR: { value: 0 }, uTox: { value: new THREE.Color(ENVY.toxic) }, uBr: { value: new THREE.Color(ENVY.bright) }, uDk: { value: new THREE.Color(ENVY.dark) } },
    uniformDecl: 'uniform float uPain, uRew, uRewR; uniform vec3 uTox, uBr, uDk;',
    colHook: `
      if (aMisc.y == 0.0) col = mix(uDk*2.2, uColB, 0.5);
      else if (aMisc.y == 1.0) col = mix(uColB, uBr, 0.45);
      else col = uDk*2.6;
      { vec3 q = position;
        float dp = length(q - vec3(${BRAIN2.pain.join(', ')}));
        float pain = exp(-dp*dp/0.03)*uPain;
        float dr = length(q - vec3(${BRAIN2.reward.join(', ')}));
        float rew = exp(-dr*dr/0.03)*uRew + exp(-pow((dr - uRewR)*10.0, 2.0))*uRew*0.9*step(0.01, uRewR);
        col = mix(col, uTox, clamp(pain*1.4, 0.0, 1.0)); b *= 1.0 + pain*3.0;
        col = mix(col, uBr, clamp(rew, 0.0, 1.0)); b *= 1.0 + rew*2.2; }` }), brainG);
  brain.material.uniforms.uAsmSpread.value = 0.5;
  const painGlow = glow(1, ENVY.toxic, [0.5, 0.5], brainG, { core: '#FFFFFF', order: 45 }); painGlow.position.set(...BRAIN2.pain);
  const painRing = glow(4, ENVY.toxic, [1, 1], brainG, { order: 45 }); painRing.position.set(...BRAIN2.pain); painRing.material.uniforms.uRing.value = 0.6;
  const rewGlow = glow(0, ENVY.bright, [0.55, 0.55], brainG, { core: ENVY.high, order: 45 }); rewGlow.position.set(...BRAIN2.reward);
  // 高台
  const platG = new THREE.Group(); K.scene.add(platG);
  const plat = points(buildPillar(551), cloudMaterial({ size: 0.016, bright: 1.1, depthRef: 4, maxPx: 8, colA: ENVY.bright, colB: ENVY.main }), platG);
  // 「别人」跌落时的拖影：几份滞后的副本
  const ghosts = [0, 1, 2].map(() => points(K.envyHero.other.geometry, cloudMaterial({ size: 0.022, bright: 1.0, depthRef: 8, maxPx: 10, colA: ENVY.high, colB: ENVY.bright }), K.scene));
  // 手机与看手机的人
  const phoneG = new THREE.Group(); K.scene.add(phoneG);
  const ph = buildPhone(601, k);
  const frame = points(ph.frame, cloudMaterial({ size: 0.022, bright: 1.0, depthRef: 8, maxPx: 10, colA: ENVY.main, colB: ENVY.main,
    uniforms: { uScr: { value: new THREE.Color(ENVY.dark) } }, uniformDecl: 'uniform vec3 uScr;', colHook: 'if (aMisc.y == 1.0) col = uScr*2.4;' }), phoneG);
  const cards = points(ph.cards, cardMaterial(), phoneG);
  cards.material.uniforms.uSize.value = 0.022; cards.material.uniforms.uColA.value.set(ENVY.high); cards.material.uniforms.uColB.value.set(ENVY.high);
  cards.material.uniforms.uWarmHi.value.set('#FFFFFF');
  const screenGlow = glow(0, ENVY.bright, [3.6, 6.2], phoneG, { core: ENVY.dark, order: -6, billboard: false }); screenGlow.position.z = -0.2;
  const viewerG = new THREE.Group(); K.scene.add(viewerG);
  const viewer = points(buildViewer(701, k), cloudMaterial({ size: 0.026, bright: 1.0, depthRef: 8, maxPx: 12, facing: 0.3, light: 0.4, colA: ENVY.bright, colB: ENVY.main,
    uniforms: { uLit: { value: 1 }, uDk: { value: new THREE.Color(ENVY.dark) } }, uniformDecl: 'uniform float uLit; uniform vec3 uDk;',
    // 脸朝向手机（局部 +z）的一面被屏幕照亮
    colHook: 'float lz = max(aNormal.z, 0.0); float rr = 1.0 - clamp(abs(facing), 0.0, 1.0); b *= (0.6 + 1.4*pow(rr, 1.5)) * (0.6 + 1.8*lz*uLit); col = mix(uDk*2.4, uColA, clamp(lz*uLit + rr*0.6, 0.0, 1.0));' }), viewerG);
  for (const p of [frame, cards, brain, viewer, plat]) p.material.uniforms.uSwirl.value = 1.0;
  A = { eyeG, eye, hl, cliffG, cliff, sitters, sewnG, sewnFace, stitches, stitchGlows, brainG, brain, painGlow, painRing, rewGlow, platG, plat, ghosts, phoneG, frame, cards, screenGlow, viewerG, viewer };
  hideAll();
}

// 山崖：竖直的岩壁（暗色到主色，噪声凹凸），顶部边缘一条亮色勾边
function buildCliffWall(seed, k) {
  const R = rng(seed), pb = new PB();
  const fbm = (x, y) => { let v = 0, a = 0.5, f = 1; for (let i = 0; i < 4; i++) { v += a * Math.sin(x * f * 1.7 + Math.sin(y * f * 1.3 + i) * 1.4 + i * 2.1) * Math.cos(y * f * 1.9 - x * f * 0.7 + i); f *= 2.03; a *= 0.5; } return v; };
  const top = x => 1.9 + 0.55 * Math.sin(x * 0.7 + 1.0) + 0.25 * Math.sin(x * 2.3) + 0.1 * Math.sin(x * 6.1);
  for (let i = 0; i < 60000 * k; i++) {
    const x = lerp(-7.5, 7.5, R()), yt = top(x), y = lerp(GROUND - 0.05, yt, Math.pow(R(), 0.9));
    const h = fbm(x * 0.9, y * 0.9), z = WALL_Z + h * 0.35;
    const ridge = Math.abs(fbm(x * 2.1 + 3, y * 2.1)) < 0.06;
    const shade = clamp(0.35 + h * 0.8 + (ridge ? 0.35 : 0), 0, 1);
    pb.add([x, y, z], [0, 0, 0], R(), [0, 0, 0], [R(), shade, 0, 1], [(ridge ? 1.3 : 0.7) * (0.6 + 0.4 * shade), 0]);
  }
  for (let i = 0; i < 9000 * k; i++) { // 顶部边缘的亮色勾边
    const x = lerp(-7.5, 7.5, R()), y = top(x) + (R() - 0.5) * 0.02;
    pb.add([x, y, WALL_Z + fbm(x * 0.9, y * 0.9) * 0.35 + 0.02], [0, 0, 0], R(), [0, 0, 0], [R(), 1, 0, 1], [1.5, 1]);
  }
  for (let i = 0; i < 9000 * k; i++) { // 地面
    const x = lerp(-7.5, 7.5, R()), z = lerp(WALL_Z, 2.5, R());
    pb.add([x, GROUND + (R() - 0.5) * 0.02, z], [0, 0, 0], R(), [0, 0, 0], [R(), 0.2, 0, 1], [0.4 * (1 - (z - WALL_Z) / 4), 0]);
  }
  return pb;
}
// 发光的高台：主色的粒子圆柱（顶面在 y=0）
function buildPillar(seed) {
  const R = rng(seed), pb = new PB();
  for (let i = 0; i < 7000; i++) {
    const a = R() * TAU, onTop = R() < 0.3, r = onTop ? 0.42 * Math.sqrt(R()) : 0.42, y = onTop ? 0 : -R() * 2.6;
    pb.add([Math.cos(a) * r, y, Math.sin(a) * r], [Math.cos(a), 0, Math.sin(a)], R(), [0, 0, 0], [R(), 0, 0, 1], [onTop && r > 0.4 ? 1.8 : (Math.abs(y) < 0.02 ? 1.8 : 0.8) * (1 - Math.min(0.7, -y / 4)), 0]);
  }
  return pb;
}
function hideAll() { for (const g of [A.eyeG, A.cliffG, A.sewnG, A.brainG, A.platG, A.phoneG, A.viewerG]) g.visible = false; A.ghosts.forEach(g => { g.visible = false; }); }

// ------------------------------------------------------------ 镜头
const camL = (a, b, k) => ({ pos: lerp3(a.pos, b.pos, k), target: lerp3(a.target, b.target, k), shift: lerp(a.shift ?? 0, b.shift ?? 0, k), fov: 35 });
const orbit = (ang, d, y, ty, tx = 0) => ({ pos: [tx + Math.sin(ang * D2R) * d, y, Math.cos(ang * D2R) * d], target: [tx, ty, 0] });
const IDOL = { pos: [-0.85, -0.3, 5.3], target: [-0.85, -0.42, 0] };     // 傲慢神像的构图：胸像在画面右侧
const EYE_CAM = d => ({ pos: [0, 0, d], target: [0, 0, 0] });
const BRAIN_CAM = { pos: [0.39, 0.05, 4.2], target: [0.39, 0, 0] };
const FULL_CAM = { pos: [1.98, 0, 10], target: [1.98, 0, 0] };
const HERO5_CAM = { pos: [HERO5[0], 0.05, HERO5[2] + 3.0], target: [HERO5[0], 0.03, HERO5[2]], shift: 170 };

function camAt(t) {
  // 钩子
  if (t < 3.5) { const k = sine(prog(t, 2.0, 3.5)); return orbit(3 * k, lerp(2.5, 2.35, k), 0.05, 0.03); }
  if (t < 6.0) { const k = sine(prog(t, 3.62, 6.0)); return { pos: [Math.sin(3 * D2R) * lerp(2.35, 2.9, k), lerp(0.05, -0.16, k), Math.cos(3 * D2R) * lerp(2.35, 2.9, k)], target: [0, lerp(0.03, 0.1, k), 0] }; }
  const back = { pos: [Math.sin(3 * D2R) * 2.9, -0.16, Math.cos(3 * D2R) * 2.9], target: [0, 0.1, 0] };
  if (t < 8.4) return camL(back, IDOL, inOut(prog(t, 6.0, 8.4)));
  const idol = { pos: [-0.85 + 0.04 * Math.sin((t - 8.4) * 0.6), -0.3, 5.3 - 0.06 * (t - 8.4)], target: IDOL.target };
  if (t < 10.0) return idol;
  // 01 巨眼
  if (t < 24.0) {
    const push = 0.8 * outExpo(prog(t, 17.8, 18.1));
    const c = EYE_CAM(lerp(9, 8.0, sine(prog(t, 10.6, 24.0))) - push);
    return t < 11.2 ? camL(idol10(), c, inOut(prog(t, 10.0, 11.2))) : c;
  }
  // 02 缝上的眼睛
  if (t < 28.9) { const k = sine(prog(t, 24.0, 28.9)); const x = lerp(-2.6, -0.4, k); return { pos: [x, 0.4, lerp(7.8, 7.0, k)], target: [x, -0.4, 0] }; }
  if (t < 33.0) { const k = sine(prog(t, 28.9, 33.0)); return { pos: [SEWN[0], 0.08, lerp(2.3, 1.45, k)], target: [SEWN[0], 0.12, 0] }; }
  if (t < 36.8) { const k = sine(prog(t, 33.0, 36.8)); const x = lerp(2.4, -0.2, k); return { pos: [x, 0.4, 7.2], target: [x, -0.4, 0] }; }
  if (t < 40.0) { const k = sine(prog(t, 36.8, 40.0)); return { pos: [-0.2, lerp(0.4, 1.0, k), lerp(7.2, 6.8, k)], target: [-0.2, lerp(-0.4, 1.4, k), 0] }; }
  // 03 大脑：先推进第四个人的头，再拉开看到大脑
  if (t < 58.2) {
    const rise = { pos: [-0.2, 1.0, 6.8], target: [-0.2, 1.4, 0] };
    const into = { pos: [0, 0.05, 1.3], target: [0, 0, 0] };
    let c;
    if (t < 40.5) c = camL(rise, into, inOut(prog(t, 40.0, 40.5)));
    else c = camL(into, BRAIN_CAM, inOut(prog(t, 40.5, 41.3)));
    // 48.8：向右横移跟随高台上的「别人」；53.0 前移回大脑
    const pan = sine(prog(t, 48.8, 49.8)) * (1 - sine(prog(t, 52.2, 53.1)));
    if (pan > 0) c = camL(c, { pos: [2.35, -0.2, 4.4], target: [2.35, -0.55, 0] }, pan);
    if (t > 57.6) c = camL(c, OVER(58.2), inOut(prog(t, 57.6, 59.0)));
    return c;
  }
  // 04 手机
  if (t < 74.0) {
    let c = OVER(t);
    if (t > 62.95) c = camL(c, { pos: [2.6, 0.6, 6.2], target: [0.6, 0.0, 0] }, sine(prog(t, 62.95, 67.2)));
    if (t > 67.2) c = camL(c, FULL_CAM, sine(prog(t, 67.2, 71.6)));
    if (t > 72.2) c = camL(c, HERO5_CAM, inOut(prog(t, 72.2, 74.2)));
    return c;
  }
  const d = t - 74;
  return { ...HERO5_CAM, pos: [HERO5_CAM.pos[0], HERO5_CAM.pos[1], HERO5_CAM.pos[2] - 0.03 * d] };
}
const idol10 = () => ({ pos: [-0.85 + 0.04 * Math.sin(1.6 * 0.6), -0.3, 5.3 - 0.096], target: IDOL.target });
// 过肩镜头：从看手机的人的肩膀后方看向手机，缓慢推近
const OVER = t => { const k = sine(prog(t, 58.2, 62.8)); return { pos: lerp3([6.6, 1.7, 2.6], [5.6, 1.3, 2.4], k), target: [0.2, 0.1, 0] }; };

// ------------------------------------------------------------ 每帧
export function update(t, F) {
  hideAll();
  const s = heroState(t, F);
  applyHero(s, t, F.bursts);
  if (t >= 10.4 && t < 24.6) updateEye(t, F);
  if (t >= 23.6 && t < 41.0) updateCliff(t, F);
  if (t >= 28.9 && t < 33.0) updateSewn(t);
  if (t >= 39.9 && t < 59.4) updateBrain(t, F);
  if (t >= 48.6 && t < 52.4) updatePlatform(t, F);
  if (t >= 57.9 && t < 74.4) updatePhone(t, F);
  F.cam = camAt(t);
  F.bloom = bloomAt(t);
  F.nebula = t >= 24.5 && t < 40 ? lerp(1, 0.85, sine(prog(t, 24.5, 26))) : (t >= 40 && t < 41 ? lerp(0.85, 1, prog(t, 40, 41)) : 1);
}
function bloomAt(t) {
  if (t < 3.5) return 1.4;
  if (t < 4.1) { const d = t - 3.5; return d < 0.05 ? lerp(1.4, 2.4, d / 0.05) : 1.6 + 0.8 * Math.exp(-(d - 0.05) * 9); }
  const keys = [[4.1, 1.6], [23.8, 1.6], [24.6, 1.1], [39.8, 1.1], [40.8, 1.4], [57.9, 1.4], [58.6, 1.3], [73.8, 1.3], [74.5, 1.5]];
  let v = 1.6;
  for (let i = 0; i < keys.length - 1; i++) if (t >= keys[i][0] && t <= keys[i + 1][0]) v = lerp(keys[i][1], keys[i + 1][1], sine(prog(t, keys[i][0], keys[i + 1][0])));
  if (t > 74.5) v = 1.5;
  return v;
}

function heroState(t, F) {
  const s = { pos: [0, 0, 0], ry: HERO_RY, other: 0, otherPos: OTHER_HOOK.pos, otherScale: OTHER_HOOK.scale };
  const full = { eyeOpen: 0.45, gaze: 1, irisB: 1, beam: 1, beamReach: 1, crackT: 9, snakes: [1, 1], thorn: 1, thornRot: (t - 6.4) * 6 * D2R, bust: 1, bustAsm: 1, heart: 1 };
  if (t < 10.0 || (t >= 10.0 && t < 11.0)) {
    if (t < 2.0) { s.alpha = F.intro ? F.intro.hand : 1; s.ry = F.intro ? F.intro.faceRY : HERO_RY; }
    if (t >= 3.5) {
      const o = outExpo(prog(t, 3.5, 3.75));
      Object.assign(s, { eyeOpen: 0.45 * o, gaze: 1, irisB: 0.2 + 0.8 * o + 1.4 * Math.exp(-(t - 3.5) * 9) * o, sparkT0: 3.5, beam: 1, beamReach: outExpo(prog(t, 3.7, 4.1)), crackT: t - CRACK_T0 });
      s.other = sine(prog(t, 3.5, 4.0));
    }
    s.snakes = [sine(prog(t, 6.0, 7.1)), sine(prog(t, 6.12, 7.2))];
    s.thorn = outExpo(prog(t, 6.45, 7.4)); s.thornSeed = Math.exp(-Math.pow((t - 6.42) / 0.12, 2)) * 1.4; s.thornRot = (t - 6.4) * 6 * D2R;
    s.bust = t > 6.8 ? 1 : 0; s.bustAsm = prog(t, 6.8, 8.0);
    s.heart = outExpo(prog(t, 7.5, 8.0));
    if (t >= 10.0) { Object.assign(s, full, { other: 1 - prog(t, 10.0, 10.5) }); s.scatter = 2 * out3(prog(t, 10.0, 10.9)); }
    return s;
  }
  // 结尾：粒子汇聚成胸像（72.8–75.0），75.0 睁眼、直视观众
  if (t >= 72.0) {
    Object.assign(s, full, { pos: HERO5, ry: 0, beam: 0, other: 0 });
    s.alpha = sine(prog(t, 71.8, 72.5)); s.scatter = 1.8 * (1 - out3(prog(t, 72.3, 75.0))); s.scatFade = t < 75.5 ? 0.25 : 1; // 汇聚时粒子不隐去
    if (t >= 75.0) {
      const o = outExpo(prog(t, 75.0, 75.25));
      Object.assign(s, { eyeOpen: 0.6 * o, gaze: 1 - outExpo(prog(t, 75.15, 75.5)), irisB: 0.2 + 1.2 * o + 1.2 * Math.exp(-(t - 75.0) * 9) * o, sparkT0: 75.0 });
    } else Object.assign(s, { eyeOpen: 0, gaze: 1 });
    if (F.outro) s.scatter = F.outro.heroScatter;
    s.swirlBoost = 1;
    return s;
  }
  s.visible = false;
  // 第三章：高台上的「别人」
  if (t >= 48.6 && t < 52.4) Object.assign(s, platformOther(t));
  return s;
}

// ---------- 01 巨眼
function updateEye(t, F) {
  A.eyeG.visible = true;
  const u = A.eye.material.uniforms;
  const wide = outExpo(prog(t, 17.8, 18.05));
  u.uScatter.value = 2 * (1 - out3(prog(t, 10.5, 11.4))); u.uScatterDist.value = 1.2; u.uScatSpread.value = 0.4; u.uScatFade.value = 0.25;
  u.uOpenE.value = lerp(0.6, 1.0, wide) + 0.015 * Math.sin(t * 1.3);
  u.uPupil.value = lerp(EYE.pupil, EYE.pupilS, wide);
  u.uFlareE.value = 0.6 * Math.exp(-Math.max(0, t - 17.8) * 2.5) * (t >= 17.8 ? 1 : 0);
  u.uAlpha.value = 1 - sine(prog(t, 23.8, 24.4));
  A.hl.position.set(-u.uPupil.value * 0.3, u.uPupil.value * 0.55, 0.15);
  A.hl.material.uniforms.uInt.value = 0.3 * (1 - u.uScatter.value / 2) * u.uAlpha.value;
  if (t >= 20.5) { F.ink = lerp(0, 1.3, sine(prog(t, 20.5, 23.9))); F.inkC = [0.5, 0.5]; }
  if (t >= 17.8 && t < 18.6) F.bursts.push({ t0: 17.8, pos: [0, 0, 0.4], n: 260, speed: 2.4, life: 0.8, grav: 0, seed: 17, bright: 2 });
}
// ---------- 02 山崖与坐着的人
function updateCliff(t, F) {
  A.cliffG.visible = t < 28.9 || t >= 33.0;
  const a = Math.min(sine(prog(t, 24.0, 25.0)), 1 - sine(prog(t, 40.2, 40.9)));
  A.cliff.material.uniforms.uAlpha.value = a;
  if (t < 25.0) { F.ink = lerp(1.3, 0, sine(prog(t, 24.0, 25.0))); F.inkC = [0.5, 0.5]; }
  A.sitters.forEach((S, i) => {
    let al = a;
    if (i === ROW.mid && t > 40.0) al = 1 - sine(prog(t, 40.25, 40.7)); // 这个人的头化成大脑
    // 呼吸起伏
    const br = 1 + 0.012 * Math.sin(TAU * qk(128 / (3.4 + 0.3 * (i % 3))) * t / LOOP + i * 1.3);
    S.g.scale.set(1, br, 1);
    S.body.material.uniforms.uAlpha.value = al; S.lines.material.uniforms.uAlpha.value = al;
  });
}
// ---------- 02 缝眼特写：针脚依次闪光
function updateSewn(t) {
  A.sewnG.visible = true;
  const seq = (t - 28.9) * 5;
  A.stitches.material.uniforms.uSeq.value = seq % 8;
  A.stitchGlows.forEach(m => {
    const d = ((seq - m.userData.idx) % 8 + 8) % 8;
    const g = Math.exp(-d * d * 2.0);
    m.material.uniforms.uInt.value = 0.05 + 0.3 * g; m.visible = true;
  });
}
// ---------- 03 大脑
function updateBrain(t, F) {
  A.brainG.visible = true;
  const k = inOut(prog(t, 40.3, 41.1));
  const shrink = sine(prog(t, 57.9, 58.9));
  A.brainG.position.set(0, lerp(0, 0.05, k), 0);
  A.brainG.scale.setScalar(lerp(0.3, 1, k) * (1 - 0.97 * shrink) + 0.0001);
  A.brainG.rotation.set(0, 15 * D2R * Math.sin(TAU * qk(128 / 9) * t / LOOP), 0);
  const u = A.brain.material.uniforms;
  u.uAssemble.value = prog(t, 40.25, 41.2); u.uAlpha.value = 1;
  u.uBright.value = 1.7 * (1 + 2.5 * shrink);
  const pain = t >= 45.3 ? (Math.exp(-Math.pow((t - 45.32) / 0.07, 2)) + 0.8 * Math.exp(-Math.pow((t - 45.58) / 0.07, 2)) + 0.5 * Math.exp(-(t - 45.3) * 0.7)) : 0;
  u.uPain.value = pain * (1 - shrink);
  A.painGlow.material.uniforms.uInt.value = 0.22 * pain * (1 - shrink); A.painGlow.visible = pain > 0.01;
  const ring = t >= 45.3 ? prog(t, 45.3, 46.1) : 0;
  A.painRing.visible = ring > 0 && ring < 1; A.painRing.scale.setScalar(0.3 + ring * 1.6); A.painRing.material.uniforms.uInt.value = 0.8 * (1 - ring);
  const rew = t >= 53.0 ? sine(prog(t, 53.0, 53.6)) : 0;
  u.uRew.value = rew * (1 - shrink); u.uRewR.value = t >= 53.0 ? ((t - 53.0) % 1.3) / 1.3 * 0.7 : 0;
  A.rewGlow.material.uniforms.uInt.value = 0.16 * rew * (1 - shrink); A.rewGlow.visible = rew > 0.01;
  if (t >= 45.3 && t < 46.0) { A.brainG.updateMatrixWorld(); F.bursts.push({ t0: 45.3, pos: new THREE.Vector3(...BRAIN2.pain).applyMatrix4(A.brainG.matrixWorld).toArray(), n: 70, speed: 0.7, life: 0.6, grav: 0, seed: 45, bright: 2 }); }
  A.brainG.updateMatrixWorld();
}
// ---------- 03 高台上的「别人」：50.5 高台从中间碎裂，他坠落、碎成光点
function platformOther(t) {
  const fall = Math.max(0, t - 50.5), y = PLAT.pos[1] - 2.8 * fall * fall;
  return { other: sine(prog(t, 48.6, 49.2)), otherPos: [PLAT.pos[0], Math.max(y, -2.9), PLAT.pos[2]], otherScale: PLAT.scale,
    otherScatter: 1.8 * out3(prog(t, 51.35, 52.1)), otherBright: 1.3, otherGrav: 0.2, otherBias: [0, 0.6, 0.6] };
}
function updatePlatform(t, F) {
  A.platG.visible = true; A.platG.position.set(PLAT.pos[0], PLAT.pos[1] - 0.01, PLAT.pos[2]);
  const u = A.plat.material.uniforms;
  u.uAlpha.value = sine(prog(t, 48.6, 49.2)) * (1 - prog(t, 51.5, 52.3));
  u.uScatter.value = 1.6 * out3(prog(t, 50.5, 51.6)); u.uScatterDist.value = 0.5; u.uScatterGrav.value = 1.6; u.uScatSpread.value = 0.2;
  // 坠落拖影
  const o = platformOther(t), fall = Math.max(0, t - 50.5);
  A.ghosts.forEach((g, i) => {
    const lag = (i + 1) * 0.045, fl = Math.max(0, fall - lag);
    g.visible = fall > 0.05 && t < 51.4;
    if (!g.visible) return;
    g.position.set(o.otherPos[0], Math.max(PLAT.pos[1] - 2.8 * fl * fl, -2.9), o.otherPos[2]); g.scale.setScalar(PLAT.scale);
    g.material.uniforms.uAlpha.value = 0.35 / (i + 1);
  });
  if (t >= 51.35 && t < 52.2) F.bursts.push({ t0: 51.35, pos: [PLAT.pos[0], -2.6, PLAT.pos[2]], n: 220, speed: 1.4, life: 0.85, grav: 0.4, seed: 51, bright: 2.2 });
}
// ---------- 04 手机
function scrollAt(t) {
  const a = 58.2, b = 71.6, T = clamp(t - a, 0, b - a), D = b - a;
  return 0.6 * T + (2.5 - 0.6) * (T * T * T / (3 * D * D)) + (t > b ? 2.5 * (t - b) : 0);
}
function updatePhone(t, F) {
  A.phoneG.visible = A.viewerG.visible = true;
  const appear = sine(prog(t, 57.9, 58.9)), shatter = prog(t, 71.6, 74.2), heat = sine(prog(t, 59.0, 71.6));
  for (const p of [A.frame, A.cards]) {
    const u = p.material.uniforms;
    u.uAlpha.value = appear; u.uScatter.value = 2.4 * out3(shatter); u.uScatterDist.value = 0.6;
    u.uScatterBias.value.set(HERO5[0] * 0.5, 0, HERO5[2] + 1.0); u.uScatSpread.value = 0.6; u.uSwirl.value = 2.0; u.uScatFade.value = 0.35;
    u.uTintAll.value = sine(prog(t, 71.6, 72.2)); u.uColTint.value.set(ENVY.main);
  }
  A.cards.material.uniforms.uScroll.value = scrollAt(t);
  A.cards.material.uniforms.uBright.value = lerp(1.1, 2.2, heat);
  A.screenGlow.material.uniforms.uInt.value = lerp(0.05, 0.11, heat) * appear * (1 - shatter);
  A.viewerG.position.set(...VIEWER.pos); A.viewerG.scale.setScalar(VIEWER.s); A.viewerG.rotation.set(0, -Math.PI / 2, 0);
  const vu = A.viewer.material.uniforms;
  vu.uAlpha.value = appear * (1 - sine(prog(t, 71.8, 73.0))); vu.uBright.value = lerp(2.8, 1.0, heat); vu.uLit.value = lerp(0.9, 1.2, heat);
}

// ------------------------------------------------------------ 文字
export function text(t, F) {
  // 钩子：标题砸入画面左侧（与傲慢标题的位置、字号一致）
  if (t >= 8.4 && t <= 10.1) {
    const a = 1 - sine(prog(t, 9.75, 10.05)), p = prog(t, 8.4, 8.85);
    const x = lerp(-300, 560, outExpo(p)), s = lerp(1.25, 1, outExpo(p));
    glowText('嫉妒', x, 470, fs(700, 230 * s), 'metal', { alpha: a * clamp(p * 3), size: 230 * s, glow: 50, glow2: 90, glowColor: ENVY.main, sweepOffset: 0.2 });
    glowText('七  宗  罪  ·  第  二  集', x, 640, fs(500, 34), C.key, { alpha: a * clamp((t - 8.7) * 3), glow: 14 });
    TAGS.forEach(([w, x0, y0, al], i) => tag(t, w, x0, y0, 8.7 + i * 0.25, 10.0, { fo: 0.3, size: 40, align: al, color: C.text }));
  }
  // 画面大字
  const big = (lines, t0, t1, ys) => lines.forEach((s, i) => staggerLine(t, s, 960, ys[i], 64, t0 + i * 0.35, t1, { step: 0.05, dur: 0.4, weight: 700, rise: 16, keyGlow: 30, fadeOut: 0.35 }));
  big(['一双总在看别人的眼睛，', '在这里，终于安静了。'], 36.8, 39.8, [360, 460]);
  big(['嫉妒是一种疼，', '幸灾乐祸，是一种甜。'], 55.95, 58.0, [360, 460]);
  big(['你在拿自己的日常，', '去比别人的〔亮〕精选〔/亮〕。'], 67.4, 71.6, [360, 460]);
  // 大脑的两个标签
  if (t >= 45.4 && t < 58.0) brainLabel(t, '疼痛相关区域', BRAIN2.pain, 45.4, 57.7, [-330, -130]);
  if (t >= 53.1 && t < 58.0) brainLabel(t, '奖励相关区域', BRAIN2.reward, 53.1, 57.7, [-360, 150]);
  // 结尾
  staggerLine(t, '看到这里——', 960, 820, 64, 75.2, 77.4, { step: 0.09, dur: 0.4, weight: 700, rise: 16, fadeOut: 0.3 });
  if (t >= 77.8 && t <= 81.6) {
    const p = prog(t, 77.8, 78.0), s = lerp(1.4, 1, outExpo(p)), a = clamp(p * 4) * (1 - sine(prog(t, 81.2, 81.6)));
    glowText('你是不是已经，想起了某个人？', 960, 900, fs(700, 72 * s), C.key, { alpha: a, glow: 34, glow2: 70, glowColor: ENVY.main });
  }
  const ea = vis(t, 81.6, 83.0, 0.4, 0.4);
  if (ea > 0) {
    glowText('七宗罪 · 下一集：愤怒', 960, 978, fs(500, 34), C.key, { alpha: ea, glow: 10 });
    glowText('参考：莎士比亚《奥赛罗》｜但丁《神曲·炼狱篇》｜高桥英彦等，《科学》2009｜费斯廷格，1954', 960, 1016, fs(400, 22), C.key, { alpha: ea * 0.85, glow: 6 });
  }
}
// 特征词：分布在胸像四周（屏幕坐标，完整显示在画面内），不压住脸、眼睛和标题
const TAGS = [['暗自比较', 1000, 200, 'center'], ['口是心非', 1840, 470, 'right'], ['见不得好', 960, 850, 'center'], ['不甘心', 1820, 880, 'right']];
function brainLabel(t, s, wp, t0, t1, off) {
  const a = vis(t, t0, t1, 0.35, 0.35); if (a <= 0) return;
  const p = new THREE.Vector3(...wp).applyMatrix4(A.brainG.matrixWorld).toArray(), sp = project(p);
  const lx = clamp(sp[0] + off[0], 200, 1700), ly = clamp(sp[1] + off[1], 120, 900);
  const ctx = getCtx();
  ctx.save(); ctx.globalAlpha *= a * 0.85; ctx.strokeStyle = ENVY.bright; ctx.lineWidth = 1.6; ctx.shadowColor = ENVY.main; ctx.shadowBlur = 8;
  ctx.beginPath(); ctx.moveTo(sp[0], sp[1]); ctx.lineTo(lx + (off[0] < 0 ? 120 : -120), ly + (off[1] < 0 ? 22 : -22)); ctx.stroke();
  ctx.fillStyle = ENVY.high; ctx.beginPath(); ctx.arc(sp[0], sp[1], 4, 0, TAU); ctx.fill();
  ctx.restore();
  glowText(s, lx, ly, fs(600, 34), C.text, { alpha: a, glow: 16 });
}
