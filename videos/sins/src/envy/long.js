// 长版 10–84 秒：01 绿眼睛的怪物 → 02 缝上的眼睛 → 03 会痛的大脑 → 04 别人的高光 → 05 结尾
import * as THREE from 'three';
import { K, points, glow, project } from '../core.js';
import { cloudMaterial } from '../mat.js';
import { clamp, lerp, lerp3, prog, outExpo, sine, out3, inOut, D2R, hash, TAU, LOOP, qk, vis } from '../util.js';
import { glowText, staggerLine, plain, fs, C } from '../text.js';
import { applyHero, OTHER_POS } from './hero.js';
import { ENVY } from './assets.js';
import { EYE, buildGiantEye, giantEyeMaterial, ROW, buildCliff, buildSitter, SITTER_EYES, buildStitchLines, BRAIN, buildBrain, brainMaterial, PHONE, buildPhone, cardMaterial, buildViewer } from './long_assets.js';

// ------------------------------------------------------------ 时间表
export function timeline(short) {
  return {
    PUNCH: [...short.PUNCH, [17.8, 1], [45.3, 1], [75.0, 0.8], [77.8, 1]],
    FLASH: [...short.FLASH, [17.8, 0.25], [77.8, 0.25]],
    BOLTS: [...short.BOLTS, [12.8, -0.8, 0.16, 0.45], [17.8, 0.7, 0.26, 0.9], [45.3, -0.75, 0.25, 0.8], [51.8, 0.82, 0.16, 0.45], [65.4, -0.82, 0.16, 0.45], [80.6, 0.8, 0.16, 0.45]],
    SOURCES: [
      [10.3, 14.4, '莎士比亚《奥赛罗》'],
      [24.3, 28.6, '但丁《神曲·炼狱篇》第十三歌'],
      [40.3, 45.0, '日本放射线医学综合研究所 · 2009'],
      [58.3, 62.8, '心理学家费斯廷格 · 1954'],
    ],
    SUBS: [
      ...short.SUBS,
      [10.3, 14.4, '四百多年前，\n莎士比亚写过一出悲剧。'],
      [14.55, 19.6, '剧中有人警告主角：小心嫉妒，\n它是一只〔毒〕绿眼睛的怪物〔/毒〕。'],
      [19.75, 23.9, '从那以后，\n绿色就成了嫉妒的颜色。'],
      [24.3, 28.6, '但丁写到，\n嫉妒的人坐在山崖下，'],
      [28.75, 32.8, '眼皮被细细的铁丝缝上，'],
      [32.95, 36.6, '彼此靠着肩膀，\n谁也看不见谁。'],
      [40.3, 45.0, '2009年，日本的科学家\n扫描了人在嫉妒时的大脑。'],
      [45.15, 48.4, '和〔毒〕疼痛〔/毒〕有关的区域，亮了。'],
      [48.55, 52.6, '更有意思的是：\n当被嫉妒的人倒霉时——'],
      [52.75, 55.8, '大脑里的〔亮〕奖励〔/亮〕区域，也亮了。'],
      [58.3, 62.8, '心理学家费斯廷格说：\n人天生会拿自己和别人比。'],
      [62.95, 67.2, '可在朋友圈里，你看到的，\n全是别人最好的一面。'],
    ],
  };
}
const QTITLES = [[10.0, 24.0, '为什么嫉妒是绿色的？'], [24.0, 40.0, '但丁笔下的嫉妒者'], [40.0, 58.2, '嫉妒，真的会痛'], [58.2, 74.0, '为什么越刷越难受？']];

// ------------------------------------------------------------ 资产
let A = null;
export function build(preview) {
  const k = preview ? 0.5 : 1;
  // 巨眼
  const eyeG = new THREE.Group(); K.scene.add(eyeG);
  const eye = points(buildGiantEye(201, k), giantEyeMaterial(), eyeG);
  eye.material.uniforms.uSwirl.value = 2.2;
  const hl = glow(0, ENVY.high, [0.22, 0.22], eyeG, { core: '#FFFFFF', order: 44 });
  const eyeGlow = glow(0, ENVY.main, [7, 4.5], eyeG, { core: ENVY.bright, order: -8 });
  // 山崖与坐着的人
  const cliffG = new THREE.Group(); K.scene.add(cliffG);
  const cliff = points(buildCliff(301, k), cloudMaterial({ size: 0.04, bright: 2.2, depthRef: 7, maxPx: 8, colA: '#7FA08C', colB: '#4B6B58' }), cliffG);
  const stitchPB = buildStitchLines(401);
  const sitters = [];
  for (let i = 0; i < ROW.n; i++) {
    const g = new THREE.Group(); cliffG.add(g);
    g.position.set(ROW.x0 + i * ROW.dx, ROW.ground + 1.05, ROW.wallZ + 0.55);
    g.rotation.set(0, (hash(i * 3.1) - 0.5) * 0.3, (i % 2 ? 1 : -1) * 8 * D2R);
    const body = points(buildSitter(311 + i, k), cloudMaterial({ size: 0.04, bright: 3.2, depthRef: 6, maxPx: 10, colA: '#9CC2A8', colB: '#4F7A60', light: 0.7 }), g);
    const lines = points(stitchPB, cloudMaterial({ size: 0.012, bright: 1.1, depthRef: 4, maxPx: 6, colA: '#D6E2DA', colB: '#D6E2DA' }), g);
    const glints = [];
    SITTER_EYES.forEach(e => [-0.03, 0, 0.03].forEach(dx => {
      const m = glow(1, ENVY.high, [0.09, 0.09], g, { core: '#FFFFFF', order: 46 }); m.position.set(e[0] + dx, e[1] - 0.004, e[2] + 0.01); glints.push(m);
    }));
    sitters.push({ g, body, lines, glints });
  }
  // 大脑
  const brainG = new THREE.Group(); K.scene.add(brainG);
  const brainPB = buildBrain(501, k);
  for (let i = 0; i < brainPB.count; i++) { const a = hash(i * 1.7) * TAU, r = 0.6 * Math.cbrt(hash(i * 2.3)); brainPB.f[i * 3] = Math.cos(a) * r; brainPB.f[i * 3 + 1] = (hash(i * 5.1) - 0.5) * 1.2 * 0.6; brainPB.f[i * 3 + 2] = Math.sin(a) * r; }
  const brain = points(brainPB, brainMaterial(), brainG);
  brain.material.uniforms.uAsmSpread.value = 0.5;
  const painGlow = glow(1, ENVY.toxic, [0.55, 0.55], brainG, { core: '#FFFFFF', order: 45 }); painGlow.position.set(...BRAIN.pain);
  const rewGlows = BRAIN.reward.map(p => { const m = glow(0, ENVY.bright, [0.9, 0.9], brainG, { core: ENVY.high, order: 45 }); m.position.set(...p); return m; });
  const brainHalo = glow(0, ENVY.main, [3.2, 3.2], brainG, { core: ENVY.bright, order: -8 });
  const platform = new THREE.Group(); K.scene.add(platform);
  const platPB = buildPlatform(551);
  const plat = points(platPB, cloudMaterial({ size: 0.03, bright: 0.9, depthRef: 6, maxPx: 8, colA: ENVY.main, colB: ENVY.dark }), platform);
  // 手机
  const phoneG = new THREE.Group(); K.scene.add(phoneG);
  const ph = buildPhone(601, k);
  const frame = points(ph.frame, cloudMaterial({ size: 0.03, bright: 0.9, depthRef: 8, maxPx: 10, colA: ENVY.bright, colB: ENVY.main,
    uniforms: { uScr: { value: new THREE.Color(ENVY.dark) } }, uniformDecl: 'uniform vec3 uScr;', colHook: 'if (aMisc.y == 1.0) col = uScr*2.0;' }), phoneG);
  const cards = points(ph.cards, cardMaterial(), phoneG);
  const screenGlow = glow(0, ENVY.other, [7, 11], phoneG, { core: '#000000', order: -6, billboard: false }); screenGlow.position.z = -0.3;
  const viewerG = new THREE.Group(); K.scene.add(viewerG);
  const viewer = points(buildViewer(701, k), cloudMaterial({ size: 0.03, bright: 2.0, depthRef: 3, maxPx: 12, colA: '#9CC2A8', colB: '#4F7A60', light: 0.8 }), viewerG);
  for (const p of [frame, cards, brain, viewer]) p.material.uniforms.uSwirl.value = 1.0;
  A = { eyeG, eye, hl, eyeGlow, cliffG, cliff, sitters, brainG, brain, painGlow, rewGlows, brainHalo, platform, plat, phoneG, frame, cards, screenGlow, viewerG, viewer };
  hide();
}
function buildPlatform(seed) {
  const pb = new (K.headPB.constructor)();
  let s = seed;
  const R = () => { s = (s * 16807) % 2147483647; return s / 2147483647; };
  for (let i = 0; i < 1600; i++) { const x = (R() - 0.5) * 1.1, z = (R() - 0.5) * 0.5, y = -R() * 0.12; pb.add([x, y, z], [0, 0, 0], R(), [0, 0, 0], [R(), 0, 0, 1], [y > -0.01 ? 1.4 : 0.6, 0]); }
  return pb;
}
export function hide() {
  if (!A) return;
  for (const g of [A.eyeG, A.cliffG, A.brainG, A.platform, A.phoneG, A.viewerG]) g.visible = false;
}

// ------------------------------------------------------------ 镜头
const camL = (a, b, k) => ({ pos: lerp3(a.pos, b.pos, k), target: lerp3(a.target, b.target, k), shift: lerp(a.shift ?? 0, b.shift ?? 0, k), fov: 50 });
const HOOK_END = { pos: [-0.6 + 0.05 * Math.sin(1.6 * 0.8), -0.2, 8.0 - 0.192], target: [-0.3, -0.1, 0], shift: 0 };
const PAN_X = t => lerp(-4, 3, sine(prog(t, 25.0, 36.6)));
const PUSH_I = 3, BRAIN_I = 6;
const sitterHead = i => [ROW.x0 + i * ROW.dx + (i % 2 ? -1 : 1) * 0.62 * Math.sin(8 * D2R), ROW.ground + 1.05 + 0.62 * Math.cos(8 * D2R), ROW.wallZ + 0.55 + 0.05];
const BRAIN_C = () => { const h = sitterHead(BRAIN_I); return [h[0], h[1] + 0.25, h[2] + 0.2]; };
const PHONE_C = [0.15, 0.55, -5.0];
const VIEWER = { pos: [0.05, -2.15, 1.0], s: 1.4 };

function camAt(t) {
  // 01：巨眼
  if (t < 24.0) {
    const c1 = { pos: [0, 0, lerp(9, 7.5, sine(prog(t, 11.0, 24.0)))], target: [0, 0, 0], shift: 0 };
    return t < 11.0 ? camL(HOOK_END, c1, inOut(prog(t, 10.0, 11.0))) : c1;
  }
  // 02：沿着这排人横移
  if (t < 40.0) {
    const x = PAN_X(t), z = lerp(7, 6.5, sine(prog(t, 25.0, 36.6)));
    let c = { pos: [x, 0.5, z], target: [x, 0.15, 0], shift: -170 };
    // 29.0：短暂推近其中一个人的脸
    const pu = sine(prog(t, 28.9, 29.45)) * (1 - sine(prog(t, 30.6, 31.4)));
    if (pu > 0) { const h = sitterHead(PUSH_I); c = camL(c, { pos: [h[0] + 0.12, h[1] + 0.05, h[2] + 1.6], target: [h[0], h[1], h[2]], shift: -60 }, pu); }
    // 40.0 前：对准要变成大脑的那个人
    if (t > 36.6) { const h = sitterHead(BRAIN_I); c = camL(c, { pos: [h[0] + 0.3, 0.5, 6.0], target: [h[0], 0.15, 0], shift: -170 }, sine(prog(t, 36.6, 39.9))); }
    return c;
  }
  // 03：推进头部 → 大脑
  if (t < 58.2) {
    const B = BRAIN_C(), h = sitterHead(BRAIN_I);
    const a = { pos: [h[0] + 0.3, 0.5, 6.0], target: [h[0], 0.15, 0], shift: -170 };
    const b = { pos: [B[0], B[1] + 0.15, B[2] + 4.7], target: [B[0], B[1] - 0.05, B[2]], shift: -60 };
    const c = camL(a, b, inOut(prog(t, 40.0, 41.2)));
    const d = t - 41.2;
    if (d > 0) c.pos[2] -= 0.012 * d;
    if (t > 57.6) return camL(c, PHONE_CAM(58.2), inOut(prog(t, 57.6, 59.0)));
    return c;
  }
  // 04：过肩镜头看手机
  if (t < 74.0) {
    const c = PHONE_CAM(t);
    if (t > 72.6) return camL(c, HERO_CAM, inOut(prog(t, 72.6, 74.2)));
    return c;
  }
  return HERO_CAM;
}
const PHONE_CAM = t => { const k = sine(prog(t, 58.2, 71.6)); return { pos: lerp3([0.6, 0.4, 3.0], [0.4, 0.3, 2.4], k), target: [PHONE_C[0], PHONE_C[1] - 0.2, PHONE_C[2]], shift: -40 }; };
const HERO_CAM = { pos: [0, 0.25, 4.4], target: [0, 0.25, 0], shift: 230 };

// ------------------------------------------------------------ 每帧
export function update(t, F) {
  hide();
  const hs = { visible: false, other: 0 };
  // ---------- 10.0–11.4：胸像溶散成绿色旋涡，再汇聚成巨眼
  if (t < 11.0) {
    Object.assign(hs, hookFinal(t), { visible: true, scatter: 1.6 * out3(prog(t, 10.0, 10.9)) });
    hs.other = 1 - prog(t, 10.0, 10.5);
  }
  if (t >= 10.3 && t < 24.6) updateEye(t, F);
  if (t >= 23.6 && t < 41.6) updateCliff(t, F);
  if (t >= 39.8 && t < 59.2) updateBrain(t, F);
  if (t >= 57.8 && t < 74.3) updatePhone(t, F);
  // 「别人」在高处的平台上，然后跌落、碎成金色粒子（49.0–51.5）
  if (t >= 48.9 && t < 51.8) {
    const B = BRAIN_C(), base = [B[0] + 0.95, B[1] + 1.15, B[2] - 1.2];
    A.platform.visible = true; A.platform.position.set(...base);
    A.plat.material.uniforms.uAlpha.value = vis(t, 48.9, 51.8, 0.4, 0.5);
    const fall = Math.max(0, t - 50.2), y = base[1] - 2.2 * fall * fall;
    hs.other = sine(prog(t, 48.9, 49.4)); hs.otherPos = [base[0], y, base[2]]; hs.otherScale = 0.42;
    hs.otherScatter = 1.6 * out3(prog(t, 50.75, 51.5)); hs.otherBright = 1.4;
  }
  // ---------- 74–84：嫉妒的胸像，直视观众
  if (t >= 73.6) {
    const asm = 1 - out3(prog(t, 74.0, 75.0));
    Object.assign(hs, hookFinal(t), { visible: true, scatter: Math.max(asm * 2.5, 0), alpha: sine(prog(t, 73.6, 74.4)), other: 0, bright: 0.85 });
    if (t >= 75.0) {
      // 直视观众：上眼睑抬到 60%，虹膜从右侧移回中央、更亮；视线光束收回
      const o = outExpo(prog(t, 75.0, 75.25));
      hs.eyeOpen = 0.6 * o; hs.gaze = 1 - outExpo(prog(t, 75.15, 75.5)); hs.irisB = 0.2 + 1.15 * o + 1.2 * Math.exp(-(t - 75.0) * 9) * o; hs.sparkT0 = 75.0;
      hs.beam = 0;
    } else { hs.eyeOpen = 0; hs.gaze = 1; hs.beam = 0; }
    hs.crackT = 9; // 裂纹保持长满
    if (F.outro) hs.scatter = F.outro.heroScatter;
  }
  applyHero(hs, t, F.bursts);
  F.cam = camAt(t);
  F.bloom = bloomAt(t);
  // 第二章更暗、更安静（但仍保证平均亮度 ≥ 28）
  F.nebula = t >= 24.5 && t < 40 ? lerp(1.8, 1.6, sine(prog(t, 24.5, 26))) : (t >= 40 && t < 41 ? lerp(1.6, 1.9, prog(t, 40, 41)) : (t >= 41 && t < 58.2 ? 1.9 : 1.8));
}
function hookFinal(t) {
  return { pos: [0, 0.25, 0], ry: 10 * D2R, eyeOpen: 0.45, gaze: 1, beam: 1, beamReach: 1, crackT: 9, snakes: [1, 1, 1, 1], thorn: 1, thornRot: (t - 6.4) * 6 * D2R, bust: 1, bustAsm: 1, heart: 1, other: 1 };
}
function bloomAt(t) {
  const keys = [[10, 1.6], [23.8, 1.6], [24.6, 1.1], [39.8, 1.1], [40.8, 1.4], [57.9, 1.4], [58.6, 1.3], [73.8, 1.3], [74.5, 1.5]];
  let v = 1.6;
  for (let i = 0; i < keys.length - 1; i++) if (t >= keys[i][0] && t <= keys[i + 1][0]) v = lerp(keys[i][1], keys[i + 1][1], sine(prog(t, keys[i][0], keys[i + 1][0])));
  if (t > 74.5) v = 1.5;
  return v;
}

// ---------- 01 巨眼
function updateEye(t, F) {
  A.eyeG.visible = true;
  const u = A.eye.material.uniforms;
  const wide = outExpo(prog(t, 17.8, 18.05));
  u.uScatter.value = 2 * (1 - out3(prog(t, 10.5, 11.4))); u.uScatterDist.value = 0.9; u.uScatSpread.value = 0.4; u.uScatFade.value = 0.25;
  u.uOpenE.value = lerp(0.6, 1.0, wide) + 0.015 * Math.sin(t * 1.3);
  u.uPupil.value = lerp(EYE.pupil, EYE.pupilS, wide);
  u.uFlareE.value = 0.5 * Math.exp(-Math.max(0, t - 17.8) * 2.5) * (t >= 17.8 ? 1 : 0);
  u.uAlpha.value = 1 - sine(prog(t, 23.6, 24.4));
  u.uBright.value = 1.0 * (1 + 0.25 * sine(prog(t, 20.5, 22)));
  A.hl.position.set(-EYE.pupil * 0.5, EYE.pupil * 0.75, 0.15);
  A.hl.material.uniforms.uInt.value = 0.25 * (1 - u.uScatter.value / 2) * u.uAlpha.value;
  A.eyeGlow.material.uniforms.uInt.value = 0.06 * (1 - u.uScatter.value / 2) * u.uAlpha.value;
  // 20.5–23.9：绿光像墨水一样从瞳孔向外晕开
  if (t >= 20.5) { F.ink = lerp(0.0, 1.35, sine(prog(t, 20.5, 23.9))); F.inkC = [0.5, 0.5]; }
  if (t >= 17.8 && t < 18.6) F.bursts.push({ t0: 17.8, pos: [0, 0, 0.4], n: 220, speed: 2.2, life: 0.8, grav: 0, seed: 17, bright: 2 });
}
// ---------- 02 山崖
function updateCliff(t, F) {
  A.cliffG.visible = true;
  const a = Math.min(sine(prog(t, 24.0, 25.0)), 1 - sine(prog(t, 40.1, 41.0)));
  A.cliff.material.uniforms.uAlpha.value = a;
  if (t < 25.0) { F.ink = lerp(1.35, 0, sine(prog(t, 24.0, 25.0))); F.inkC = [0.5, 0.5]; }
  A.sitters.forEach((S, i) => {
    let al = a;
    if (i === BRAIN_I && t > 39.8) al = 1 - sine(prog(t, 40.0, 40.6)); // 这个人的头化成大脑
    S.body.material.uniforms.uAlpha.value = al; S.lines.material.uniforms.uAlpha.value = al;
    S.body.material.uniforms.uBright.value = 3.2;
    S.glints.forEach((m, k) => {
      // 针脚周期性反光；29.0 推近时那个人的针脚一起闪一下
      const per = 3.2 + hash(i * 7 + k) * 2.4, ph = ((t + hash(i * 13 + k) * per) % per) / per;
      let g = Math.exp(-Math.pow((ph - 0.5) / 0.03, 2));
      if (i === PUSH_I) g = Math.max(g, Math.exp(-Math.pow((t - 29.75 - k * 0.03) / 0.09, 2)) * 1.8);
      m.material.uniforms.uInt.value = 0.45 * g * al; m.visible = g * al > 0.01;
    });
  });
}
// ---------- 03 大脑
function updateBrain(t, F) {
  A.brainG.visible = true;
  const B = BRAIN_C();
  const h = sitterHead(BRAIN_I);
  const k = inOut(prog(t, 40.0, 41.0));
  A.brainG.position.set(lerp(h[0], B[0], k), lerp(h[1], B[1], k), lerp(h[2], B[2], k));
  const shrink = sine(prog(t, 57.9, 58.9));
  A.brainG.scale.setScalar(lerp(0.32, 1, k) * (1 - 0.95 * shrink) + 0.0001);
  A.brainG.rotation.set(0.38, (t - 40.0) * 8 * D2R + 0.95, 0);
  const u = A.brain.material.uniforms;
  u.uAssemble.value = prog(t, 40.0, 41.1); u.uAlpha.value = 1 - shrink * 0.3;
  u.uBright.value = 1.05 * (1 + 2 * shrink);
  // 45.3：疼痛区像被针扎了一下，短促闪两次
  const pain = t >= 45.3 ? (Math.exp(-Math.pow((t - 45.32) / 0.07, 2)) + 0.8 * Math.exp(-Math.pow((t - 45.58) / 0.07, 2)) + 0.45 * Math.exp(-(t - 45.3) * 0.9)) : 0;
  u.uPain.value = pain * (1 - shrink);
  A.painGlow.material.uniforms.uInt.value = 0.16 * pain * (1 - shrink); A.painGlow.visible = pain > 0.01;
  // 53.0：奖励区亮起温暖的亮绿色，光波向外扩散
  const rew = t >= 53.0 ? sine(prog(t, 53.0, 53.6)) : 0;
  u.uRew.value = rew * (1 - shrink); u.uRewR.value = t >= 53.0 ? ((t - 53.0) % 1.3) / 1.3 * 0.75 : 0;
  A.rewGlows.forEach(m => { m.material.uniforms.uInt.value = 0.07 * rew * (1 - shrink); m.visible = rew > 0.01; });
  A.brainHalo.material.uniforms.uInt.value = (0.04 + 0.03 * rew + 0.2 * shrink) * u.uAssemble.value;
  if (t >= 45.3 && t < 46.0) F.bursts.push({ t0: 45.3, pos: new THREE.Vector3(...BRAIN.pain).applyMatrix4(A.brainG.matrixWorld).toArray(), n: 60, speed: 0.8, life: 0.6, grav: 0, seed: 45, bright: 2 });
  A.brainG.updateMatrixWorld();
}
// ---------- 04 手机
function scrollAt(t) {
  // 每秒滑过的卡片数从 0.6 逐渐加快到 2.5（58.2–71.6），对时间积分
  const a = 58.2, b = 71.6, T = clamp(t - a, 0, b - a), D = b - a;
  const s = 0.6 * T + (2.5 - 0.6) * (T * T * T / (3 * D * D));
  return s + (t > b ? 2.5 * (t - b) : 0);
}
function updatePhone(t, F) {
  A.phoneG.visible = A.viewerG.visible = true;
  A.phoneG.position.set(...PHONE_C);
  const appear = sine(prog(t, 58.0, 59.0));
  const shatter = prog(t, 71.6, 73.8);
  const heat = sine(prog(t, 59.0, 71.6));
  for (const p of [A.frame, A.cards]) {
    const u = p.material.uniforms;
    u.uAlpha.value = appear; u.uScatter.value = 2.4 * out3(shatter); u.uScatterDist.value = 1.4;
    u.uScatterBias.value.set(-PHONE_C[0] * 0.4, -PHONE_C[1] * 0.5, 3.2); u.uScatSpread.value = 0.6;
    u.uTintAll.value = sine(prog(t, 71.6, 72.3)); u.uColTint.value.set(ENVY.main);
  }
  A.frame.material.uniforms.uBright.value = 0.9;
  A.cards.material.uniforms.uScroll.value = scrollAt(t);
  A.cards.material.uniforms.uBright.value = lerp(0.8, 1.9, heat);
  A.screenGlow.material.uniforms.uInt.value = lerp(0.04, 0.12, heat) * appear * (1 - shatter);
  A.viewerG.position.set(...VIEWER.pos); A.viewerG.scale.setScalar(VIEWER.s); A.viewerG.rotation.set(0, Math.PI + 0.12, 0);
  const vu = A.viewer.material.uniforms;
  vu.uAlpha.value = appear * (1 - sine(prog(t, 71.6, 72.6))); vu.uBright.value = lerp(2.0, 0.5, heat);
}

// ------------------------------------------------------------ 文字
function questionTitle(t) {
  for (const [a, b, s] of QTITLES) {
    if (t < a - 0.01 || t > b + 0.6) continue;
    const inP = outExpo(prog(t, a + 0.02, a + 0.57)), outP = sine(prog(t, b - 0.4, b));
    const y = 280 + (1 - inP) * 70 - outP * 60;
    const al = clamp(inP * 1.6) * (1 - outP);
    glowText(s, 540, y, fs(700, 52), C.key, { alpha: al, glow: 26, glow2: 40, glowColor: '#3DDC84' });
  }
}
export function text(t, F) {
  if (t < 74.0) questionTitle(t);
  // 画面大字
  const big = (lines, t0, t1, y0, size = 64, o = {}) => lines.forEach((s, i) => staggerLine(t, s, 540, y0 + i * (size + 36), size, t0 + i * 0.35, t1, { step: 0.05, dur: 0.4, rise: 16, keyGlow: 30, fadeOut: 0.35, ...o }));
  big(['一双总在看别人的眼睛，', '在这里，终于安静了。'], 36.8, 39.8, 760);
  big(['嫉妒是一种疼，', '幸灾乐祸，是一种甜。'], 55.95, 58.0, 760);
  big(['你在拿自己的日常，', '去比别人的〔亮〕精选〔/亮〕。'], 67.4, 71.6, 1240);
  staggerLine(t, '看到这里——', 540, 1300, 64, 75.2, 77.4, { step: 0.09, dur: 0.4, rise: 14, fadeOut: 0.3 });
  // 77.8：砸入
  if (t >= 77.8 && t <= 81.6) {
    const p = prog(t, 77.8, 78.0), s = lerp(1.4, 1, outExpo(p));
    const a = clamp(p * 4) * (1 - sine(prog(t, 81.2, 81.6)));
    ['你是不是已经，', '想起了某个人？'].forEach((line, i) => glowText(line, 540, 1355 + i * 95, fs(700, 72 * s), C.key, { alpha: a, glow: 34, glow2: 70, glowColor: '#3DDC84' }));
  }
  // 81.6–83.0：下一集预告与参考文献
  const ea = vis(t, 81.6, 83.0, 0.4, 0.4);
  if (ea > 0) {
    plain('七宗罪 · 下一集：愤怒', 540, 1440, 34, C.text, ea, { glow: 12, weight: 600 });
    plain('参考：莎士比亚《奥赛罗》｜但丁《神曲·炼狱篇》', 540, 1480, 22, C.key, ea * 0.9, { glow: 6 });
    plain('高桥英彦等，《科学》2009｜费斯廷格，1954', 540, 1508, 22, C.key, ea * 0.9, { glow: 6 });
  }
}
