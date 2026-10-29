// 06 泥土 108–122 + 结尾 122–128：种子入土、生根、发芽、开花 → 神像卸下王冠、裂纹愈合、眼光变柔 → 标题 → 回到七张脸，首尾相接
import * as THREE from 'three';
import { K, points, glow } from '../core.js';
import { cloudMaterial, lineMaterial, COL } from '../mat.js';
import { PB, linesToPB } from '../geo.js';
import { rng, clamp, lerp, prog, sine, outExpo, outBack, in2, hash, TAU, D2R } from '../util.js';
import { glowText, staggerLine, fs, C } from '../text.js';
import { setLineup, LINEUP_CAM } from './hook.js';
import { K as KK, crackProgress } from '../core.js';

const GX = -120;
let G, soil, seed, trail, roots, stem, leaves, flower, wave, backLight;

export function build() {
  G = new THREE.Group(); G.position.set(GX, 0, 0); K.scene.add(G);
  const R = rng(601);
  // 泥土剖面
  const sp = new PB();
  for (let i = 0; i < 52000; i++) {
    const kind = R(), x = (R() * 2 - 1) * 7;
    const top = 0.04 * Math.sin(x * 3) + 0.03 * Math.sin(x * 7 + 1);
    let p, n;
    if (kind < 0.5) { const y = -Math.pow(R(), 1.6) * 4.5; p = [x, Math.min(y, top), 1.2 + (R() - 0.5) * 0.06]; n = [0, 0, 1]; }      // 正面剖面
    else if (kind < 0.88) { p = [x, top + (R() - 0.5) * 0.03, lerp(-2.5, 1.2, R())]; n = [0, 1, 0]; }                                 // 土面
    else { p = [x, -Math.pow(R(), 0.8) * 4.5, lerp(-2.5, 1.2, R())]; n = [0, 1, 0]; }
    const glowP = R() < 0.012, layer = kind < 0.5 ? 0.75 + 0.25 * Math.sin(p[1] * 9 + Math.sin(x * 2)) : 1;
    sp.add(p, n, R(), [0, 0, 0], [0, 0, 0, 1], [glowP ? 2.4 : (0.4 + 0.3 * R()) * layer, glowP ? 1 : 0]);
  }
  soil = points(sp, cloudMaterial({ size: 0.04, bright: 1.7, depthRef: 4, maxPx: 10, facing: 0, colA: new THREE.Color('#8E7CB8'), colB: new THREE.Color('#8E7CB8'),
    colHook: 'if (aMisc.y == 1.0) { col = vec3(0.75, 0.5, 1.0); }' }), G);
  // 种子与运动拖影
  seed = glow(0, COL.white, [0.5, 0.5], G, { core: COL.white, order: 40 });
  trail = glow(3, COL.eyeCore, [0.12, 1.6], G, { core: COL.white, order: 39 });
  // 发光根须：不断分叉向下
  const lines = [], RL = rng(611);
  const grow = (p0, dir, n, w, depth, t0) => {
    const pts = [p0]; let p = p0, a = dir;
    for (let s = 0; s < n; s++) {
      a += (RL() - 0.5) * 0.6; p = [p[0] + Math.sin(a) * 0.09, p[1] - Math.cos(a) * 0.09 * (0.8 + 0.4 * RL()), p[2] + (RL() - 0.5) * 0.03]; pts.push(p);
      if (depth < 3 && RL() < 0.14) grow(p, a + (RL() < 0.5 ? -0.7 : 0.7), Math.floor(n * 0.55), w * 0.6, depth + 1, t0 + s / n * 1.2);
    }
    lines.push({ pts, width: w, t0 });
  };
  for (const a of [-0.5, 0, 0.45]) grow([0, -0.05, 0], a, 22, 1.4, 0, 0);
  const rp = linesToPB(lines, 0.012, 613, 0.008);
  for (let i = 0; i < rp.count; i++) { const L = lines[rp.e[i * 4 + 1]]; rp.e[i * 4] = clamp(L.t0 / 2.2 + rp.e[i * 4] * 0.55); rp.e[i * 4 + 1] = 0; }
  roots = points(rp, lineMaterial({ size: 0.022, bright: 1.6, col: new THREE.Color('#B794F6') }), G);
  // 嫩芽：茎（发光线）+ 两片叶子 + 一朵粒子花
  const stemPts = []; for (let k = 0; k <= 30; k++) { const s = k / 30; stemPts.push([0.12 * Math.sin(s * 3.2), s * 1.6, 0.03 * Math.sin(s * 5)]); }
  const st = linesToPB([{ pts: stemPts, width: 1.6 }], 0.006, 615, 0.01);
  stem = points(st, lineMaterial({ size: 0.03, bright: 1.6, col: COL.lilac, hot: COL.white }), G);
  const lp = new PB();
  for (const [side, y] of [[-1, 0.75], [1, 1.05]]) {
    for (let i = 0; i < 2600; i++) {
      const u = R(), v = (R() * 2 - 1) * Math.sin(Math.PI * u) * 0.13;
      const x = side * u * 0.55, yy = y + u * 0.22 - u * u * 0.14 + v;
      lp.add([0.12 * Math.sin(y / 1.6 * 3.2) + x, yy, v * 0.4], [0, 0, 1], R(), [0, 0, 0], [side > 0 ? 1 : 0, 0, 0, 1], [Math.abs(v) < 0.005 ? 1.7 : 1.0, side > 0 ? 31 : 30]);
    }
  }
  leaves = points(lp, cloudMaterial({ size: 0.016, bright: 1.3, depthRef: 4, maxPx: 10, facing: 0, colA: new THREE.Color('#E9D5FF'), colB: new THREE.Color('#A78BFA'),
    uniforms: { uLeaf: { value: new THREE.Vector2() } }, uniformDecl: 'uniform vec2 uLeaf;',
    posHook: `float lk = aMisc.y == 31.0 ? uLeaf.y : uLeaf.x; vec3 base = vec3(0.12*sin((aMisc.y == 31.0 ? 1.05 : 0.75)/1.6*3.2), aMisc.y == 31.0 ? 1.05 : 0.75, 0.0);
      p = base + (p - base)*lk; vis *= step(0.01, lk);` }), G);
  const fp = new PB();
  for (let i = 0; i < 4200; i++) {
    const pet = Math.floor(R() * 6), u = Math.sqrt(R()), v = (R() * 2 - 1) * Math.sin(Math.PI * u) * 0.45;
    const a = pet / 6 * TAU + v * 0.5, r = u * 0.34;
    fp.add([Math.cos(a) * r, (1 - u) * 0.04 + u * u * 0.1, Math.sin(a) * r], [0, 1, 0], R(), [0, 0, 0], [pet / 6, 0, 0, 1], [u > 0.9 ? 1.7 : 1.1, 0]);
  }
  for (let i = 0; i < 500; i++) { const a = R() * TAU, r = 0.05 * Math.sqrt(R()); fp.add([Math.cos(a) * r, 0.06, Math.sin(a) * r], [0, 1, 0], R(), [0, 0, 0], [0, 0, 0, 1], [2.2, 0]); }
  flower = points(fp, cloudMaterial({ size: 0.016, bright: 1.4, depthRef: 4, maxPx: 10, facing: 0, colA: new THREE.Color('#FFFFFF'), colB: new THREE.Color('#C4B5FD'),
    uniforms: { uOpen: { value: 0 } }, uniformDecl: 'uniform float uOpen;',
    posHook: 'float ok = clamp(uOpen*1.4 - aExtra.x*0.4, 0.0, 1.0); p.xz *= ok; p.y += (1.0 - ok)*0.12*length(position.xz)/0.34; vis *= step(0.01, uOpen);' }), G);
  flower.position.set(0.12 * Math.sin(3.2), 1.6, 0.03 * Math.sin(5)); flower.rotation.x = 1.0;
  wave = glow(4, COL.lilac, [1, 1], G, { billboard: false, order: 38 }); wave.rotation.x = -Math.PI / 2 + 1.0;
  backLight = glow(0, new THREE.Color('#D8CCFF'), [9, 9], KK.camera, { core: COL.white, billboard: false, order: 4 }); backLight.position.set(0, -0.2, -8);
}

const SEED_Y = t => lerp(5.5, 0.0, in2(prog(t, 108.5, 109.3)));

export function update(t, F) {
  const on = t > 108.0 && t < 116.3;
  G.visible = on; backLight.visible = false;
  if (on) {
    const all = sine(prog(t, 108.0, 108.4)) * (1 - sine(prog(t, 115.8, 116.25)));
    for (const o of [soil, leaves, flower]) o.material.uniforms.uAlpha.value = all;
    // 种子坠落、入土、发光
    const sy = SEED_Y(t);
    seed.position.set(0, sy, 0.05);
    seed.material.uniforms.uInt.value = (t < 109.3 ? 1.6 : 1.0 + 0.4 * Math.sin((t - 109.3) * 5)) * all * (1 - prog(t, 112.6, 113.6) * 0.6);
    trail.visible = t > 108.5 && t < 109.45;
    trail.position.set(0, sy + 0.8, 0.05); trail.material.uniforms.uInt.value = 0.8 * (1 - prog(t, 109.3, 109.45));
    if (t >= 109.3 && t < 110.3) F.bursts.push({ t0: 109.3, pos: [GX, 0.05, 0.05], n: 160, speed: 1.4, life: 0.9, grav: 1.6, seed: 1093, bright: 1.8, dir: [0, 1, 0], spread: 1.1 });
    // 根须向下、嫩芽向上、开花
    roots.material.uniforms.uProg.value[0] = clamp((t - 110.2) / 2.4); roots.material.uniforms.uInten.value[0] = all;
    const sg = sine(prog(t, 112.6, 114.0));
    stem.material.uniforms.uProg.value[0] = sg; stem.material.uniforms.uInten.value[0] = all;
    if (t >= 112.75 && t < 113.6) F.bursts.push({ t0: 112.75, pos: [GX, 0.08, 0.05], n: 120, speed: 1.2, life: 0.8, grav: 1.0, seed: 1127, bright: 1.8, dir: [0, 1, 0], spread: 1.0 });
    leaves.material.uniforms.uLeaf.value.set(outBack(prog(t, 113.6, 114.2)), outBack(prog(t, 113.9, 114.5)));
    flower.material.uniforms.uOpen.value = outExpo(prog(t, 114.3, 115.1));
    const wk = prog(t, 114.6, 115.7);
    wave.visible = wk > 0 && wk < 1; wave.position.copy(flower.position); wave.scale.setScalar(0.3 + 2.6 * outExpo(wk)); wave.material.uniforms.uInt.value = 0.9 * (1 - wk);
    F.cam = soilCam(t);
  }
  // ---------- 神像卸冠（116–122）与结尾（122–128）
  if (t >= 116.0) {
    const H = { visible: true, pos: [0, 0, 0], rot: [0, 0, 0], eyeOpen: 1, eyeInt: 3.2, eyeRays: 0.55, crackClock: 9 };
    const order = [3, 2, 4, 1, 5, 0, 6];
    H.spikes = [1, 1, 1, 1, 1, 1, 1];
    H.spikesD = [0, 1, 2, 3, 4, 5, 6].map(k => sine(prog(t, 116.2 + order.indexOf(k) * 0.24, 116.75 + order.indexOf(k) * 0.24)));
    H.ring = 1 - sine(prog(t, 117.6, 118.1)); H.gems = 1;
    H.halo = 1 - sine(prog(t, 116.2, 118.0)); H.haloScale = 1; H.haloRot = (t - 13.4) * 0.12;
    // 裂纹愈合：从末端收回到眼睛
    H.crackClock = lerp(9, 0, sine(prog(t, 118.0, 119.6)));
    H.crackTint = 1;
    // 闭眼、再睁开：这一次是柔和的白光
    const close = sine(prog(t, 119.6, 120.3)), reopen = sine(prog(t, 120.5, 121.2));
    H.eyeOpen = Math.max(0, 1 - close) * (t < 120.4 ? 1 : 0) + (t >= 120.4 ? reopen * 0.7 : 0);
    H.eyeWhite = t >= 120.4 ? 1 : 0;
    H.eyeInt = t < 120.4 ? lerp(3.2, 1.6, close) : 1.5;
    H.eyeRays = t < 120.4 ? 0.55 * (1 - close) : 0;
    H.bright = 1;
    // 结尾：面部后退、两侧的六张脸重新飞回，回到第 0 帧
    if (t >= 122) {
      H.eyeOpen = 0.7 * (1 - sine(prog(t, 125.6, 126.6))); H.eyeInt = 1.5 * (1 - sine(prog(t, 125.6, 126.6))); H.eyeWhite = 1;
      H.spikes = [0, 0, 0, 0, 0, 0, 0]; H.ring = 0; H.halo = 0; H.gems = 0; H.crackClock = 0;
    }
    if (t >= 118.1 && t < 122) H.spikes = [0, 0, 0, 0, 0, 0, 0];
    F.hero = H;
    F.cam = idolCam(t);
    // 星云变亮、后方升起柔光
    F.dawn = sine(prog(t, 122.0, 123.4)) * (1 - sine(prog(t, 126.0, 127.6)));
    backLight.visible = F.dawn > 0.01; backLight.material.uniforms.uInt.value = 0.07 * F.dawn;
    if (t >= 126.0) {
      setLineup(t, { visible: true, fly: 1 - outExpo(prog(t, 126.0, 127.5)), alpha: sine(prog(t, 126.0, 126.5)) });
    }
    // 王冠尖刺消散时落下的粒子
    if (t >= 116.2 && t < 118.4) for (let k = 0; k < 7; k++) { const tb = 116.2 + k * 0.24; if (t >= tb && t < tb + 0.8) F.bursts.push({ t0: tb, pos: [(order[k] - 3) * 0.17, 0.9, -0.05], n: 30, speed: 0.4, life: 0.8, grav: 0.9, seed: 1160 + k, bright: 1.6 }); }
  }
}

function soilCam(t) {
  const W = (p, g) => ({ pos: [GX + p[0], p[1], p[2]], target: [GX + g[0], g[1], g[2]] });
  if (t < 112.6) { const k = sine(prog(t, 108.0, 112.4)); return W([lerp(0.6, 0.3, k), lerp(1.0, 0.25, k), lerp(5.6, 4.4, k)], [0, lerp(0.6, -0.5, k), 0]); }
  const k = sine(prog(t, 112.6, 115.4));
  return W([lerp(0.3, 0.5, k), lerp(0.25, 1.75, k), lerp(4.4, 3.4, k)], [0, lerp(-0.5, 1.35, k), 0]);
}
function idolCam(t) {
  // 正面特写：头部与王冠
  const close = { pos: [0, 0.32, 2.75], target: [0, 0.22, 0] };
  if (t < 122) { const k = sine(prog(t, 116.0, 122.0)); return { pos: [lerp(0.25, 0, k), 0.32, lerp(2.95, 2.55, k)], target: [0, lerp(0.26, 0.12, k), 0] }; }
  // 122–126：后退，让脸位于标题与结语之间；126–128：回到第 0 帧的七张脸
  const mid = { pos: [0, 0.1, 5.3], target: [0, -0.32, 0] };
  const c0 = { pos: [0, 0.32, 2.55], target: [0, 0.12, 0] };
  if (t < 126) { const k = sine(prog(t, 122.0, 123.4)); return { pos: c0.pos.map((v, i) => lerp(v, mid.pos[i], k)), target: c0.target.map((v, i) => lerp(v, mid.target[i], k)) }; }
  const k = sine(prog(t, 126.0, 127.7));
  return { pos: mid.pos.map((v, i) => lerp(v, LINEUP_CAM.pos[i], k)), target: mid.target.map((v, i) => lerp(v, LINEUP_CAM.target[i], k)) };
}

export function text(t, F) {
  if (t < 122 || t > 126.6) return;
  const fo = 1 - sine(prog(t, 126.0, 126.6));
  const ta = sine(prog(t, 122.0, 122.8)) * fo;
  if (ta > 0) {
    glowText('傲慢', 960, 285, fs(700, 160), 'metal', { alpha: ta, size: 160, glow: 44, glow2: 80, glowColor: '#8B3DFF', sweepOffset: 0.0 });
  }
  if (t >= 123.4) staggerLine(t, '真正的高处，是〔紫〕看得见别人〔/紫〕的地方。', 960, 640, 48, 123.4, 126.6, { step: 0.05, dur: 0.4, weight: 600, fadeOut: 0.6 });
  glowText('七宗罪 · 下一集：懒惰', 960, 760, fs(500, 34), C.lilac, { alpha: sine(prog(t, 124.6, 125.1)) * fo, glow: 14, spacing: 4 });
  const ra = sine(prog(t, 125.0, 125.5)) * fo;
  if (ra > 0) {
    const ref = '参考：格里高利一世《约伯记释义》｜但丁《神曲·炼狱篇》｜美国大学理事会1976至1977学年学生调查｜普罗宁、林与罗斯，2002｜路易斯《返璞归真》';
    const ctx = document.getElementById('out').getContext('2d');
    ctx.save(); ctx.font = fs(400, 22); const w = ctx.measureText(ref).width; ctx.restore();
    glowText(ref, 960, 1010, fs(400, w > 1760 ? 22 * 1760 / w : 22), '#9E8FC0', { alpha: ra, glow: 6 });
  }
}
