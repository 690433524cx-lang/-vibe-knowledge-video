// 系列片头 seriesIntro(t, N)：0–2.0 秒；片尾循环 seriesOutro：最后 1 秒回到第 0 帧。
// 构图沿用傲慢长版钩子的开头（七张脸横排、中间那张略大略靠前、同一个相机）；每一期只换成自己的颜色。
import * as THREE from 'three';
import { K, points, glow } from './core.js';
import { cloudMaterial } from './mat.js';
import { FACE } from './geo.js';
import { clamp, lerp, lerp3, prog, outExpo, sine, out3, hash, D2R, TAU, LOOP, qk } from './util.js';
import { staggerLine, glowText, fs, C } from './text.js';

// 傲慢长版的七张脸
export const SLOTS = [0, 1, 2, 3, 4, 5, 6].map(i => {
  const k = i - 3;
  return { x: k * 1.06, y: 0.02 * Math.sin(i * 1.7), z: -Math.abs(k) * 0.45, ry: -k * 0.13, s: 0.95 + 0.1 * hash(i + 3), br: 0.82 + 0.18 * hash(i + 9) };
});
SLOTS[3].s = 1.12; // 中间那张略大、略靠前
SLOTS[3].z = 0.25;
export const LINEUP_CAM = { pos: [0, 0.1, 7.2], target: [0, 0.02, -0.5], fov: 35 };
export const CLOSE_CAM = { pos: [0, 0.05, 2.5], target: [0, 0.03, 0], fov: 35 };
export const HERO_RY = 10 * D2R;
export function camIntro(t) {
  if (t < 1.3) { const k = sine(prog(t, 0, 1.3)); return { ...LINEUP_CAM, pos: [0, 0.1, lerp(7.2, 7.0, k)] }; }
  const k = outExpo(prog(t, 1.3, 2.0));
  return { pos: lerp3([0, 0.1, 7.0], CLOSE_CAM.pos, k), target: lerp3(LINEUP_CAM.target, CLOSE_CAM.target, k), fov: 35 };
}

// 扫描光：p = (t − 0.2)/1.1，x = 最左边 + (目标脸的 x − 最左边)(1 − (1 − p)³)
const X0 = -4.4;
const scanX = (t, N) => { const p = clamp((t - 0.2) / 1.1); return X0 + (SLOTS[N - 1].x - X0) * (1 - Math.pow(1 - p, 3)); };
function passTimes(i, N) {
  const xt = SLOTS[N - 1].x - X0, xi = SLOTS[i].x;
  const tAt = x => { const q = clamp((x - X0) / xt); return 0.2 + 1.1 * (1 - Math.cbrt(1 - q)); };
  if (xi - 0.35 > SLOTS[N - 1].x) return null;
  return { enter: tAt(xi - 0.35), leave: xi + 0.35 >= SLOTS[N - 1].x ? Infinity : tAt(xi + 0.35) };
}

let faces = [], band;
const SLIT = 0.12;
export function build(col) {
  faces = SLOTS.map((s, i) => {
    const g = new THREE.Group(); K.scene.add(g);
    const mat = cloudMaterial({ size: 0.012, bright: 0.68, depthRef: 7, maxPx: 10, colA: col.high, colB: col.bright, colHook: 'if (aMisc.y == 1.0) b *= 0.3;' });
    mat.uniforms.uSwirl.value = 0.6;
    const pts = points(K.litePB, mat, g);
    // 眼缝：亮色的细光线
    const slits = [FACE.eyeL, FACE.eyeR].map(p => {
      const m = glow(5, col.bright, [0.4, 0.1], g, { billboard: false, order: 41, half: [0.2, 0.05], ell: [0.065, 0.004], core: col.high });
      m.position.set(p[0], p[1] - 0.003, p[2] + 0.01); return m;
    });
    return { g, pts, slits };
  });
  band = glow(3, col.high, [0.32, 2.6], K.scene, { core: '#FFFFFF', order: 45 });
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
    u.uAlpha.value = o.alpha ?? 1; u.uBright.value = 0.68 * s.br * (o.bright ?? 1);
    u.uScatter.value = o.scatter ?? 0; u.uScatterDist.value = 0.45; u.uScatterBias.value.set(side * 1.7, 0.25, 0.5); u.uScatSpread.value = 0.5;
    u.uScanX.value = o.scanX ?? 0; u.uScanAmt.value = 0.5 * (o.scanAmt ?? 0);
    const lvl = o.slit ?? 0.4;
    F.slits.forEach(m => {
      const mu = m.material.uniforms;
      mu.uInt.value = SLIT * lvl * (0.8 + 0.2 * breath(t, i)) * (o.alpha ?? 1) * (1 - clamp((o.scatter ?? 0) * 1.5));
      mu.uRays.value = o.rays ?? 0; m.visible = mu.uInt.value > 0.0005;
    });
  });
}

export function seriesIntro(t, N, F) {
  const sel = N - 1, sx = scanX(t, N);
  const scanAmt = t < 0.2 ? 0 : t < 1.3 ? sine(prog(t, 0.2, 0.35)) : 1 - sine(prog(t, 1.3, 1.5));
  const fly = outExpo(prog(t, 1.3, 2.0)), hand = sine(prog(t, 1.62, 1.96));
  const st = SLOTS.map((s, i) => {
    const pt = passTimes(i, N);
    let slit = 0.4;
    if (pt && t >= pt.enter) slit = t < pt.leave ? 1 : lerp(1, 0.4, clamp((t - pt.leave) / 0.3));
    if (i === sel) {
      if (t >= 1.3) slit = lerp(2.0, 0.9, prog(t, 1.45, 2.0));
      return { pos: lerp3([s.x, s.y, s.z], [0, 0, 0], fly), ry: lerp(s.ry, HERO_RY, fly), scale: lerp(s.s, 1, fly), slit,
        rays: t >= 1.3 ? 1.6 * Math.exp(-(t - 1.3) * 3) : 0, scanX: sx, scanAmt: scanAmt * (1 - fly), alpha: 1 - hand, bright: 1 + 0.3 * fly };
    }
    const sc = t >= 1.3 ? 2.5 * out3(prog(t, 1.3, 1.9)) : 0;
    return { slit, scatter: sc, fly: sine(prog(t, 1.3, 1.9)) * 0.8, scanX: sx, scanAmt, alpha: 1 - sine(prog(t, 1.55, 1.95)) };
  });
  setFaces(t, st);
  band.visible = t > 0.2 && t < 1.5;
  if (band.visible) { band.position.set(sx, 0.05, 0.6); band.material.uniforms.uInt.value = 0.22 * scanAmt; }
  if (t >= 1.3 && t < 2.0) { const s = SLOTS[sel]; F.bursts.push({ t0: 1.3, pos: [s.x, s.y, s.z + 0.3], n: 160, speed: 1.6, life: 0.8, grav: 0.3, seed: 3, bright: 2 }); }
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
  const back = sine(prog(t, a + 0.15, e));
  setFaces(t, SLOTS.map(() => ({ scatter: 2.5 * (1 - out3(prog(t, a + 0.15, e))), fly: 1 - back, alpha: sine(prog(t, a + 0.1, a + 0.6)), slit: 0.4 })));
  band.visible = false;
  return { heroScatter: 2.5 * out3(prog(t, a, a + 0.75)), k };
}
export function hideFaces() { faces.forEach(f => { f.g.visible = false; }); band.visible = false; }
