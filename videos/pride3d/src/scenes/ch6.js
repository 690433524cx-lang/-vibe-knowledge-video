// 06 两种骄傲 108–122 + 结尾 122–128：
// 两名运动员，一人赢下比赛摆出胜利姿势 → 推近他的脸（天生失明）→ 一分为二：“我做到了”与“我比你们强”
// → 粒子脸重新出现、睁眼直视镜头 → “说的都是别人？” → 回到七张脸，首尾相接
import * as THREE from 'three';
import { K, points, glow } from '../core.js';
import { cloudMaterial, lineMaterial, COL } from '../mat.js';
import { PB, capsule, ellipsoid, linesToPB } from '../geo.js';
import { rng, clamp, lerp, prog, sine, outExpo, hash, TAU } from '../util.js';
import { glowText, staggerLine, fs, C } from '../text.js';
import { setLineup, LINEUP_CAM } from './hook.js';
import { project } from '../main.js';

const GX = -120;
const HEAD_S = 0.2;                    // 粒子脸缩放到运动员头部的大小
let G, figs = {}, ring, auraA, auraB, cracksB;

// ------------------------------------------------------------ 姿势（关节角，弧度）
const POSE = {
  stand:   { torso: 0, head: 0.04, sh: 0.14, el: 0.08, shX: 0, hip: 0.05, knee: 0 },
  victory: { torso: -0.13, head: -0.5, sh: 2.55, el: -0.15, shX: 0.1, hip: 0.1, knee: 0 },
  open:    { torso: -0.1, head: -0.6, sh: 2.1, el: -0.1, shX: 0.05, hip: 0.12, knee: 0 },     // 张开双臂、仰望天空
  haughty: { torso: -0.06, head: -0.28, sh: 0.7, el: -1.75, shX: -0.25, hip: 0.1, knee: 0 }, // 抬着下巴、双手叉腰
  slump:   { torso: 0.16, head: 0.5, sh: 0.05, el: 0.1, shX: 0.1, hip: 0.04, knee: 0.08 },   // 输掉的人：低头、垂肩
};
const mixPose = (a, b, k) => Object.fromEntries(Object.keys(a).map(n => [n, lerp(a[n], b[n], k)]));

// ------------------------------------------------------------ 由刚性部件组成的粒子人形
function buildFigure(seed, mat, headMat, dense = false) {
  const R = rng(seed);
  const part = (fn) => { const pb = new PB(); fn(pb); const o = new THREE.Points(pb.geometry(THREE), mat); o.frustumCulled = false; return o; };
  const root = new THREE.Group(), hips = new THREE.Group(), torso = new THREE.Group(), head = new THREE.Group();
  root.add(hips); hips.position.y = 0.95; hips.add(torso);
  torso.add(part(pb => {
    ellipsoid(pb, R, [0, 0.03, 0], 0.15, 0.1, 0.1, 900);
    capsule(pb, R, [0, 0.06, 0], [0, 0.38, 0], 0.135, 1900);
    ellipsoid(pb, R, [0, 0.36, 0.02], 0.2, 0.12, 0.12, 1400);
    capsule(pb, R, [0, 0.46, 0], [0, 0.53, 0], 0.045, 160);
  }));
  head.position.set(0, 0.53, 0); torso.add(head);
  const face = new THREE.Points((dense ? K.headPB : K.litePB).geometry(THREE), headMat); face.frustumCulled = false;
  face.scale.setScalar(HEAD_S); face.position.set(0, 0.12, 0.0); head.add(face);
  const arm = (side) => {
    const sh = new THREE.Group(); sh.position.set(0.2 * side, 0.44, 0); torso.add(sh);
    sh.add(part(pb => capsule(pb, R, [0, 0, 0], [0, -0.3, 0], 0.048, 520)));
    const el = new THREE.Group(); el.position.set(0, -0.3, 0); sh.add(el);
    el.add(part(pb => { capsule(pb, R, [0, 0, 0], [0, -0.26, 0], 0.04, 420); ellipsoid(pb, R, [0, -0.31, 0], 0.045, 0.06, 0.03, 160); }));
    return { sh, el };
  };
  const leg = (side) => {
    const hp = new THREE.Group(); hp.position.set(0.09 * side, 0, 0); hips.add(hp);
    hp.add(part(pb => capsule(pb, R, [0, 0, 0], [0, -0.46, 0], 0.07, 700)));
    const kn = new THREE.Group(); kn.position.set(0, -0.46, 0); hp.add(kn);
    kn.add(part(pb => { capsule(pb, R, [0, 0, 0], [0, -0.44, 0], 0.055, 560); ellipsoid(pb, R, [0, -0.47, 0.05], 0.05, 0.03, 0.1, 160); }));
    return { hp, kn };
  };
  const chest = glow(0, COL.lilac, [0.2, 0.2], torso, { core: COL.white, order: 26 }); chest.position.set(0, 0.34, 0.16);
  return { root, hips, torso, head, face, armL: arm(1), armR: arm(-1), legL: leg(1), legR: leg(-1), chest, mat, headMat };
}
function applyPose(f, p) {
  f.torso.rotation.x = p.torso; f.head.rotation.x = p.head;
  for (const [a, s] of [[f.armL, 1], [f.armR, -1]]) { a.sh.rotation.set(p.shX, 0, s * p.sh); a.el.rotation.set(0, 0, s * p.el); }
  for (const [l, s] of [[f.legL, 1], [f.legR, -1]]) { l.hp.rotation.set(0, 0, s * p.hip); l.kn.rotation.set(p.knee, 0, 0); }
}
function figMats(colA, colB, bright, dense) {
  const body = cloudMaterial({ size: 0.032, bright, depthRef: 5, maxPx: 12, light: 0.5, colA, colB });
  // 头部用同一张粒子脸；闭合的眼睑线压暗，表示双眼闭合（失明）
  const head = cloudMaterial({ size: 0.0045, bright: bright * (dense ? 0.2 : 1.1), depthRef: 1.5, maxPx: 10, light: 0.5, colA, colB, colHook: 'if (aMisc.y == 1.0) b *= 0.3;' });
  K.mats.push(body, head);
  return [body, head];
}

export function build() {
  G = new THREE.Group(); G.position.set(GX, 0, 0); K.scene.add(G);
  const mk = (seed, colA, colB, bright, dense) => { const [m, h] = figMats(new THREE.Color(colA), new THREE.Color(colB), bright, dense); const f = buildFigure(seed, m, h, dense); G.add(f.root); return f; };
  figs.win = mk(611, '#FFFFFF', '#C4B5FD', 1.25, true);     // 赢家，之后成为左边“真实的骄傲”
  figs.lose = mk(621, '#C9BCF0', '#8B6FD6', 1.0);
  figs.b = mk(631, '#E9D5FF', '#9333EA', 1.35);       // 一分为二后右边“自大的骄傲”
  ring = glow(4, COL.eyeCore, [1, 1], G, { order: 34 });
  auraA = glow(0, new THREE.Color('#F5F0FF'), [2.6, 2.6], G, { core: COL.white, order: 6 });
  auraB = glow(0, new THREE.Color('#A855F7'), [2.6, 2.6], G, { core: COL.eyeCore, order: 6 });
  // 右边那个人身上的闪电裂纹：头部直接复用开头粒子脸上的裂纹，躯干上另生成几条
  const lines = K.crackLines.map(L => ({ pts: L.pts, width: L.width, part: 'head' }));
  const R = rng(641);
  for (let k = 0; k < 7; k++) {
    let x = (R() - 0.5) * 0.06, y = 0.34 + (R() - 0.5) * 0.05; const a0 = (k / 7) * TAU + R() * 0.4; let a = a0; const pts = [];
    for (let s = 0; s < 12; s++) {
      const z = Math.sqrt(Math.max(0, 0.19 * 0.19 - x * x)) * (y > 0.3 ? 1.0 : 0.85) + 0.012;
      pts.push([x, y, z]);
      a = a0 + (R() - 0.5) * 1.1; x += Math.cos(a) * 0.022; y += Math.sin(a) * 0.022;
    }
    lines.push({ pts, width: 1.2, part: 'torso' });
  }
  const headLines = lines.filter(l => l.part === 'head'), torsoLines = lines.filter(l => l.part === 'torso');
  const hp = linesToPB(headLines, 0.0022, 643, 0.0022), tp = linesToPB(torsoLines, 0.004, 645, 0.002);
  for (let i = 0; i < tp.count; i++) tp.e[i * 4 + 1] += headLines.length;
  const lm = lineMaterial({ size: 0.012, bright: 2.4 }); K.mats.push(lm);
  const hc = new THREE.Points(hp.geometry(THREE), lm); hc.frustumCulled = false; hc.scale.setScalar(HEAD_S); hc.position.set(0, 0.12, 0); figs.b.head.add(hc);
  const tc = new THREE.Points(tp.geometry(THREE), lm); tc.frustumCulled = false; figs.b.torso.add(tc);
  cracksB = { mat: lm, n: lines.length, heads: headLines.length };
}

// ------------------------------------------------------------ 每帧
const XW = -0.55, XL = 0.85, XA = -1.05, XB = 1.05;
export function update(t, F) {
  const on = t > 107.9 && t < 123.1;
  G.visible = on;
  if (on) {
    const all = sine(prog(t, 108.0, 108.5));
    const gone = sine(prog(t, 122.0, 122.9));            // 122–123：两个人形化作粒子飘散
    const W = figs.win, L = figs.lose, B = figs.b;
    // ---- 赢家：108.6 猛地张开双臂
    const vic = outExpo(prog(t, 108.6, 108.95));
    let pw = mixPose(POSE.stand, POSE.victory, vic);
    const split = sine(prog(t, 116.75, 117.7));
    pw = mixPose(pw, POSE.open, split);
    applyPose(W, pw);
    W.root.position.set(lerp(XW, XA, split), 0, 0);
    W.root.rotation.y = lerp(0.12, 0.08, split);
    const flash = t >= 108.6 ? Math.exp(-(t - 108.6) * 3.2) : 0;
    W.mat.uniforms.uGlow.value = 2.2 * flash; W.headMat.uniforms.uGlow.value = 2.2 * flash;
    W.mat.uniforms.uWhite.value = 0.5 * flash + 0.25 * split;
    // ---- 输掉的人：慢慢低头，推近时淡出
    applyPose(L, mixPose(POSE.stand, POSE.slump, sine(prog(t, 109.0, 111.0))));
    L.root.position.set(XL, 0, -0.2); L.root.rotation.y = -0.15;
    const la = all * (1 - sine(prog(t, 112.8, 113.6)));
    L.root.visible = la > 0.01;
    // ---- 一分为二：右边的人从赢家身上分出来，抬着下巴，周身紫色闪电裂纹
    const bk = sine(prog(t, 116.75, 117.7)), bp = sine(prog(t, 116.9, 118.0));
    B.root.visible = t > 116.75;
    B.root.position.set(lerp(XW, XB, bk), 0, 0); B.root.rotation.y = lerp(0.12, -0.18, bk);
    applyPose(B, mixPose(pw, POSE.haughty, bp));
    const cg = prog(t, 117.4, 118.9);
    for (let i = 0; i < cracksB.n; i++) cracksB.mat.uniforms.uProg.value[i] = clamp(cg * 1.4 - (i % 7) * 0.06);
    cracksB.mat.uniforms.uInten.value.fill(1 + 0.6 * Math.sin(t * 9));
    // ---- 透明度、散开
    for (const [f, a] of [[W, all], [L, la], [B, bk]]) {
      for (const m of [f.mat, f.headMat]) {
        m.uniforms.uAlpha.value = a * (1 - gone);
        m.uniforms.uScatter.value = gone; m.uniforms.uScatterDist.value = 1.4;
        m.uniforms.uScatterBias.value.set(0, 0.6, 0);
      }
      f.chest.material.uniforms.uInt.value = a * (1 - gone) * (0.16 + 0.06 * Math.sin(t * 3 + f.root.position.x));
    }
    cracksB.mat.uniforms.uAlpha.value = bk * (1 - gone);
    cracksB.mat.uniforms.uBright.value = 2.4 * bk * (1 - gone);
    // 胜利瞬间的冲击波与火花
    const rk = prog(t, 108.6, 109.5);
    ring.visible = rk > 0 && rk < 1;
    ring.position.set(XW, 1.3, 0.25); ring.scale.setScalar(0.3 + 2.2 * outExpo(rk)); ring.material.uniforms.uInt.value = 0.55 * (1 - rk);
    if (t >= 108.6 && t < 109.5) F.bursts.push({ t0: 108.6, pos: [GX + XW, 1.35, 0.2], n: 260, speed: 2.0, life: 0.9, grav: 0.7, seed: 1086, bright: 2.2 });
    // 两种光
    auraA.visible = auraB.visible = split > 0.01;
    auraA.position.set(XA, 1.15, -0.3); auraA.material.uniforms.uInt.value = 0.1 * split * (1 - gone);
    auraB.position.set(XB, 1.15, -0.3); auraB.material.uniforms.uInt.value = 0.14 * bk * (1 - gone) * (0.85 + 0.15 * Math.sin(t * 11));
    if (t >= 117.4 && t < 119.0) for (let k = 0; k < 4; k++) { const tb = 117.4 + k * 0.35; if (t >= tb && t < tb + 0.5) F.bursts.push({ t0: tb, pos: [GX + XB, 1.45, 0.2], n: 26, speed: 0.8, life: 0.5, grav: 0.4, seed: 1174 + k, bright: 2.2 }); }
    if (t < 122.0) F.cam = figCam(t);
  }
  // ---------- 结尾：戴王冠、带裂纹的粒子脸重新出现，睁眼直视镜头
  if (t >= 122.0) {
    const appear = sine(prog(t, 122.0, 122.9));
    const back = sine(prog(t, 127.2, 127.85));
    const open = outExpo(prog(t, 123.0, 123.2)) * (1 - sine(prog(t, 127.2, 127.6)));
    F.hero = {
      visible: true, pos: [0, 0, 0], rot: [0, 0, 0],
      scatter: 1 - appear, scatterDist: 1.2, alpha: appear,
      eyeOpen: open, eyeInt: 3.0 * open * (1 + 0.6 * Math.exp(-Math.max(0, t - 123.0) * 3)), eyeRays: 0.6 * open,
      crackClock: lerp(9, 0, back), crackTint: 1,
      spikes: [1, 1, 1, 1, 1, 1, 1], spikesD: [0, 1, 2, 3, 4, 5, 6].map(k => back), ring: 1 - back, gems: 1 - back,
      halo: 0, bust: 0,
    };
    if (t >= 127.2) setLineup(t, { visible: true, fly: 1 - outExpo(prog(t, 127.2, 127.85)), alpha: sine(prog(t, 127.2, 127.5)) });
    F.cam = faceCam(t);
  }
}

function figCam(t) {
  const W = (p, g) => ({ pos: [GX + p[0], p[1], p[2]], target: [GX + g[0], g[1], g[2]] });
  const wide = [[0.15, 1.15, 5.6], [0.15, 1.05, 0]];
  if (t < 112.75) { const k = sine(prog(t, 108.0, 112.6)); return W([lerp(-0.3, 0.15, k), lerp(1.05, 1.15, k), lerp(6.4, 5.6, k)], [lerp(-0.2, 0.15, k), 1.05, 0]); }
  // 推近赢家的脸：从略低处仰视，仍能看到张开的双臂
  const face = [XW - 0.02, 1.7, 0.02], eye = [XW + 0.02, 2.02, 0.82];
  if (t < 116.75) {
    const k = sine(prog(t, 112.75, 114.6)), d = 0.04 * Math.sin((t - 112.75) * 0.9);
    return W([lerp(0.15, eye[0] + d, k), lerp(1.15, eye[1], k), lerp(5.6, eye[2], k)], [lerp(0.15, face[0], k), lerp(1.05, face[1], k), lerp(0, face[2], k)]);
  }
  const k = sine(prog(t, 116.75, 118.2));
  return W([lerp(eye[0], 0, k), lerp(eye[1], 1.15, k), lerp(eye[2], 4.7, k)], [lerp(face[0], 0, k), lerp(face[1], 1.0, k), lerp(face[2], 0, k)]);
}
function faceCam(t) {
  // 正对镜头的特写，脸在画面中上部，下方留出两行大字
  const close = { pos: [0, -0.02, 3.15], target: [0, -0.02, 0] };
  const from = { pos: [0, 0.05, 3.7], target: [0, 0.0, 0] };
  if (t < 127.2) { const k = sine(prog(t, 122.0, 123.0)); return { pos: from.pos.map((v, i) => lerp(v, close.pos[i], k)), target: from.target.map((v, i) => lerp(v, close.target[i], k)) }; }
  const k = sine(prog(t, 127.2, 127.85));
  return { pos: close.pos.map((v, i) => lerp(v, LINEUP_CAM.pos[i], k)), target: close.target.map((v, i) => lerp(v, LINEUP_CAM.target[i], k)) };
}

export function text(t, F) {
  if (t < 117.3 || t > 128) return;
  // 两个人形旁的标签
  if (t < 122.3) {
    const fo = 1 - sine(prog(t, 121.8, 122.3));
    const head = (x) => project([GX + x, 1.75, 0]), foot = (x) => project([GX + x, 0.0, 0]);
    const ha = head(XA), hb = head(XB), fa = foot(XA), fb = foot(XB);
    const a1 = sine(prog(t, 117.6, 118.0)) * fo, a2 = sine(prog(t, 118.0, 118.4)) * fo;
    glowText('我做到了', ha[0] - 250, ha[1] - 10, fs(700, 44), C.white, { alpha: a1, glow: 22, glow2: 36, glowColor: '#C4B5FD' });
    glowText('我比你们强', hb[0] + 270, hb[1] - 10, fs(700, 44), C.key, { alpha: a2, glow: 24, glow2: 40 });
    const s1 = sine(prog(t, 119.75, 120.2)) * fo, s2 = sine(prog(t, 120.0, 120.45)) * fo;
    glowText('真实的骄傲', fa[0], Math.min(fa[1] + 40, 880), fs(600, 36), '#E9E2FF', { alpha: s1, glow: 14 });
    glowText('自大的骄傲', fb[0], Math.min(fb[1] + 40, 880), fs(600, 36), C.key, { alpha: s2, glow: 16 });
  }
  // 结尾的两行画面大字
  if (t >= 123.2 && t <= 125.0) staggerLine(t, '看完这条视频，你是不是觉得——', 960, 820, 64, 123.2, 125.0, { step: 0.05, dur: 0.4, weight: 700, rise: 16, fadeOut: 0.3 });
  if (t >= 125.4 && t <= 127.5) {
    const p = prog(t, 125.4, 125.62);
    const ctx = document.getElementById('out').getContext('2d');
    const a = clamp(p * 3) * (1 - sine(prog(t, 127.2, 127.5)));
    ctx.save(); ctx.translate(960, 900); const s = lerp(1.6, 1, p * p) * (1 + 0.06 * Math.exp(-Math.max(0, t - 125.62) * 10)); ctx.scale(s, s);
    glowText('说的都是别人？', 0, 0, fs(700, 76), C.key, { alpha: a, glow: 34, glow2: 70, glowColor: '#9D4EDD' });
    ctx.restore();
  }
  // 底部小字：下一集预告与参考文献
  const ba = sine(prog(t, 125.6, 126.1)) * (1 - sine(prog(t, 127.2, 127.6)));
  if (ba > 0) {
    glowText('七宗罪 · 下一集：懒惰', 960, 978, fs(500, 30), C.lilac, { alpha: ba, glow: 10, spacing: 3 });
    const ref = '参考：格里高利一世《约伯记释义》｜但丁《神曲·炼狱篇》｜美国大学理事会1976至1977学年学生调查｜普罗宁、林与罗斯，2002｜路易斯《返璞归真》｜特蕾西与松本，2008';
    const ctx = document.getElementById('out').getContext('2d');
    ctx.save(); ctx.font = fs(400, 22); const w = ctx.measureText(ref).width; ctx.restore();
    glowText(ref, 960, 1016, fs(400, w > 1760 ? 22 * 1760 / w : 22), '#9E8FC0', { alpha: ba, glow: 6 });
  }
}
