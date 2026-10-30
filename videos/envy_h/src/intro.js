// 系列片头 seriesIntro(t, N)：0–2.0 秒；片尾循环 seriesOutro：最后 1 秒回到第 0 帧。
// 构图沿用傲慢长版钩子的开头（七张脸横排、中间那张略大略靠前、同一个相机）；每一期只换成自己的颜色。
import * as THREE from 'three';
import { K, points, glow } from './core.js';
import { cloudMaterial } from './mat.js';
import { FACE } from './geo.js';
import { clamp, lerp, lerp3, prog, outExpo, sine, out3, hash, D2R, TAU, LOOP, qk } from './util.js';
import { staggerLine, glowText, fs, C } from './text.js';

// 傲慢长版的七张脸（位置、大小、间距、角度原样照搬 hook.js）；中间那张与傲慢一样用高密度的人脸，所以更大更亮
export const SLOTS = [0, 1, 2, 3, 4, 5, 6].map(i => {
  const k = i - 3;
  return { x: k * 1.06, y: 0.02 * Math.sin(i * 1.7), z: -Math.abs(k) * 0.45, ry: -k * 0.13, s: i === 3 ? 1 : 0.95 + 0.1 * hash(i + 3), br: i === 3 ? 1 : 0.82 + 0.18 * hash(i + 9) };
});
export const LINEUP_CAM = { pos: [0, 0.1, 7.2], target: [0, 0.02, -0.5], fov: 35 };
export const CLOSE_CAM = { pos: [0, 0.05, 2.5], target: [0, 0.03, 0], fov: 35 };   // 与傲慢的脸部特写相同（约占画面高度 70%）
export const HERO_RY = 10 * D2R;
// s 为剧情时间：1.3 选中（成片时间 1.6），之后 0.7 秒内推近特写
export function camIntro(s) {
  if (s < 1.3) return LINEUP_CAM;
  const k = outExpo(prog(s, 1.3, 2.0));
  return { pos: lerp3(LINEUP_CAM.pos, CLOSE_CAM.pos, k), target: lerp3(LINEUP_CAM.target, CLOSE_CAM.target, k), fov: 35 };
}

// 扫描光（转盘式，每一期相同，只是最后停的位置不同；时间为成片时间）：
// 0.2–0.8 从最左扫到最右；0.8–1.6 往回扫、outCubic 减速，停在第 N 张脸上
const X0 = -4.4, X1 = 4.4;
export function scanX(t, N) {
  if (t < 0.8) return lerp(X0, X1, sine(prog(t, 0.2, 0.8)));
  return lerp(X1, SLOTS[N - 1].x, out3(prog(t, 0.8, 1.6)));
}
// 光带经过某张脸时，那张脸的眼缝闪亮一下（0.3 秒内回落）
function slitFlash(t, N, xi) {
  let v = 0;
  for (let k = 0; k <= 18; k++) {
    const tau = k / 60, tt = t - tau; if (tt < 0.2) break;
    if (Math.abs(scanX(tt, N) - xi) < 0.32) v = Math.max(v, 1 - tau / 0.3);
  }
  return v;
}
let faces = [], band;
const SLIT = 0.06;
export function build(col) {
  faces = SLOTS.map((s, i) => {
    const g = new THREE.Group(); K.scene.add(g);
    const mat = cloudMaterial({ size: 0.012, bright: 0.68, depthRef: 7, maxPx: 10, colA: col.high, colB: col.main,
      uniforms: { uSl: { value: new THREE.Color(col.bright) } }, uniformDecl: 'uniform vec3 uSl;', colHook: 'if (aMisc.y == 1.0) col = uSl;' });
    mat.uniforms.uSwirl.value = 0.6;
    const pts = points(i === 3 ? K.headPB : K.litePB, mat, g);
    // 眼缝：亮色的细光线
    const slits = [FACE.eyeL, FACE.eyeR].map(p => {
      const m = glow(5, col.bright, [0.4, 0.1], g, { billboard: false, order: 41, half: [0.2, 0.05], ell: [0.065, 0.004], core: col.high });
      m.position.set(p[0], p[1] - 0.003, p[2] + 0.01); return m;
    });
    return { g, pts, slits };
  });
  band = glow(3, col.bright, [0.32, 2.6], K.scene, { core: col.high, order: 45 });
}
const breath = (t, i) => 0.5 + 0.5 * Math.sin(TAU * qk(128 / 2.4) * t / LOOP - i * 0.9);

function setFaces(t, st) {
  faces.forEach((F, i) => {
    const s = SLOTS[i], o = st[i];
    F.g.visible = (o.alpha ?? 1) > 0.003;
    if (!F.g.visible) return;
    const side = i === 3 ? 0 : Math.sign(s.x), fly = o.fly ?? 0;
    F.g.position.set(...(o.pos ?? [s.x + side * 5 * fly, s.y, s.z - 2 * fly]));
    F.g.rotation.set(0, o.ry ?? s.ry + side * 0.6 * fly, 0);
    F.g.scale.setScalar(o.scale ?? s.s);
    const u = F.pts.material.uniforms;
    u.uAlpha.value = o.alpha ?? 1; u.uBright.value = (i === 3 ? 0.3 : 0.68) * s.br * (o.bright ?? 1); // 中间那张是高密度人脸，点多，单点亮度要低
    u.uScatter.value = o.scatter ?? 0; u.uScatFade.value = o.scatFade ?? 1; u.uScatterDist.value = 0.45; const bk = o.bias ?? 1; u.uScatterBias.value.set(side * 1.7 * bk, 0.25 * bk, 0.5 * bk); u.uScatSpread.value = 0.5;
    u.uScanX.value = o.scanX ?? 0; u.uScanAmt.value = (i === 3 ? 0.25 : 0.5) * (o.scanAmt ?? 0);
    const lvl = o.slit ?? 0.4;
    F.slits.forEach(m => {
      const mu = m.material.uniforms;
      mu.uInt.value = SLIT * lvl * (0.8 + 0.2 * breath(t, i)) * (o.alpha ?? 1) * (1 - clamp((o.scatter ?? 0) * 1.5));
      mu.uRays.value = o.rays ?? 0; m.visible = mu.uInt.value > 0.0005;
    });
  });
}

// 扫描阶段（成片时间 0–1.6）：七张脸静止排成一排，转盘式扫描光来回扫过
export function scanIntro(t, N, F) {
  const sx = scanX(t, N), amt = sine(prog(t, 0.2, 0.32));
  setFaces(t, SLOTS.map((s, i) => ({ slit: 0.4 + 0.6 * slitFlash(t, N, s.x), scanX: sx, scanAmt: amt })));
  band.visible = t > 0.2;
  if (band.visible) { band.position.set(sx, 0.05, 0.6); band.material.uniforms.uInt.value = 0.16 * amt; }
  return { hand: 0, faceRY: SLOTS[N - 1].ry };
}
// 选中之后（剧情时间 1.3–2.0，即成片时间 1.6–2.3）：被选中的脸飞到中央，其余六张溶散飞出，相机推近特写
export function seriesIntro(t, N, F) {
  const sel = N - 1, sx = SLOTS[sel].x;
  const scanAmt = 1 - sine(prog(t, 1.3, 1.5));
  const fly = outExpo(prog(t, 1.3, 2.0)), hand = sine(prog(t, 1.62, 1.96));
  const st = SLOTS.map((s, i) => {
    if (i === sel) {
      return { pos: lerp3([s.x, s.y, s.z], [0, 0, 0], fly), ry: lerp(s.ry, HERO_RY, fly), scale: lerp(s.s, 1, fly), slit: lerp(2.0, 0.9, prog(t, 1.45, 2.0)),
        rays: 1.6 * Math.exp(-(t - 1.3) * 3), scanX: sx, scanAmt: scanAmt * (1 - fly), alpha: 1 - hand, bright: 1 + 0.3 * fly };
    }
    return { slit: 0.4, scatter: 2.5 * out3(prog(t, 1.3, 1.9)), fly: sine(prog(t, 1.3, 1.9)) * 0.8, scanX: sx, scanAmt, alpha: 1 - sine(prog(t, 1.55, 1.95)) };
  });
  setFaces(t, st);
  band.visible = scanAmt > 0.01;
  if (band.visible) { band.position.set(sx, 0.05, 0.6); band.material.uniforms.uInt.value = 0.16 * scanAmt; }
  if (t < 2.0) { const s = SLOTS[sel]; F.bursts.push({ t0: 1.3, pos: [s.x, s.y, s.z + 0.3], n: 160, speed: 1.6, life: 0.8, grav: 0.3, seed: 3, bright: 2 }); }
  return { hand, faceRY: lerp(SLOTS[sel].ry, HERO_RY, fly) };
}

export function introText(t, name) {
  if (t < 1.3) staggerLine(t, '七宗罪里，有一宗是为你准备的——', 960, 975, 52, 0, 1.3, { instant: true, fadeOut: 0 });
  else if (t < 2.0) {
    const p = prog(t, 1.3, 1.5), s = lerp(1.4, 1, outExpo(p));
    const a = clamp(p * 4) * (1 - sine(prog(t, 1.85, 2.0)));
    glowText(`「${name}」。`, 960, 975, fs(700, 72 * s), C.key, { alpha: a, glow: 30, glow2: 60 });
  }
}

// 片尾循环：tl = 成片时长；所有动作在最后一帧之前完成，最后一帧就是第 0 帧（没有字幕）
export function seriesOutro(t, tl, F) {
  const a = tl - 1, e = tl - 0.12, k = prog(t, a, e);
  const back = out3(prog(t, a, a + 0.45));
  setFaces(t, SLOTS.map(() => ({ scatter: 1.6 * (1 - out3(prog(t, a, a + 0.45))), bias: 0.25, fly: 0.4 * (1 - back), alpha: sine(prog(t, a, a + 0.3)), slit: 0.4, scatFade: 0.2 })));  // 飞回时粒子不隐去，画面不留空
  band.visible = false;
  return { heroScatter: 2.5 * out3(prog(t, a, a + 0.6)), k };
}
export function hideFaces() { faces.forEach(f => { f.g.visible = false; }); band.visible = false; }
