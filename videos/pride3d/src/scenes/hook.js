// 钩子 0–20：七张脸 → 扫描选中 → 闭眼 → 睁眼与裂纹 → 加冕成神像 → 标题
import * as THREE from 'three';
import { K, points, glow, reg, crackProgress, crackTipWorld } from '../core.js';
import { cloudMaterial, COL } from '../mat.js';
import { FACE } from '../geo.js';
import { clamp, lerp, prog, outExpo, sine, inOut, out3, hash, track, D2R } from '../util.js';
import { glowText, tag, staggerLine, fs, C } from '../text.js';
import { project } from '../main.js';

export const t0 = 0, t1 = 20.8;
export const LINEUP_CAM = { pos: [0, 0.1, 7.2], target: [0, 0.02, -0.5] };
export const SLOTS = [0, 1, 2, 3, 4, 5, 6].map(i => {
  const k = i - 3;
  return { x: k * 1.06, z: -Math.abs(k) * 0.45, ry: -k * 0.13, sc: 0.95 + 0.1 * hash(i + 3), br: 0.82 + 0.18 * hash(i + 9) };
});
let lite = [], scanBand;

export function build() {
  lite = SLOTS.map((s, i) => {
    if (i === 3) return null;
    const g = new THREE.Group(); K.scene.add(g);
    const pts = points(K.litePB, cloudMaterial({ size: 0.012, bright: 0.68, depthRef: 7, maxPx: 10 }), g);
    const eyes = [FACE.eyeL, FACE.eyeR].map(p => { const m = glow(0, COL.eyeOuter, [0.35, 0.35], g, { core: COL.eyeCore }); m.position.set(p[0], p[1], p[2] + 0.03); return m; });
    return { g, pts, eyes };
  });
  K.lite = lite;
  scanBand = glow(3, COL.lilac, [0.32, 2.6], K.scene, { core: COL.white, order: 45 });
}

// 扫描光：左→右→左，越扫越慢，3.4 秒停在正中
const SCAN = [[0.3, -4.4], [1.35, 4.4], [2.35, -2.1], [2.95, 1.05], [3.25, -0.42], [3.4, 0]];
export function scanX(t) { return track(SCAN, t); }

// 七张脸的排列（结尾 126–128 复用）
export function setLineup(t, o) {
  lite.forEach((L, i) => {
    if (!L) return;
    const s = SLOTS[i];
    L.g.visible = o.visible;
    if (!o.visible) return;
    const fly = o.fly ?? 0; // 结尾：从两侧飞回
    const side = Math.sign(s.x);
    L.g.position.set(s.x + side * 5 * fly, 0.02 * Math.sin(i * 1.7), s.z - 2 * fly);
    L.g.rotation.set(0, s.ry + side * 0.6 * fly, 0); L.g.scale.setScalar(s.sc);
    const u = L.pts.material.uniforms;
    u.uBright.value = 0.68 * s.br * (o.bright ?? 1); u.uAlpha.value = o.alpha ?? 1;
    u.uScatter.value = o.scatter ?? 0; u.uScatterDist.value = 0.45; u.uScatterBias.value.set(side * 1.7, 0.25, 0.5); u.uScatSpread.value = 0.5;
    u.uScanX.value = o.scanX ?? 0; u.uScanAmt.value = o.scanAmt ?? 0;
    const glim = (o.scanAmt ?? 0) * Math.exp(-Math.pow((s.x - (o.scanX ?? 0)) / 0.35, 2));
    L.eyes.forEach(e => { e.material.uniforms.uInt.value = glim * 0.9 * (1 - (o.scatter ?? 0)); e.visible = glim > 0.01; });
  });
}

export function update(t, F) {
  scanBand.visible = false;
  if (t > t1) { setLineup(t, { visible: false }); return; }
  // ---------- 七张脸 + 扫描（0–4.6）
  const sx = scanX(t), sAmt = t < 0.3 ? sine(prog(t, 0, 0.3)) : t < 3.4 ? 1 : 1 - sine(prog(t, 3.4, 3.8));
  const shatter = prog(t, 3.4, 4.6);
  setLineup(t, { visible: t < 4.7, scanX: sx, scanAmt: sAmt, scatter: out3(shatter) * 0.999, alpha: 1 - sine(prog(t, 4.0, 4.6)) });
  if (t < 3.8) {
    scanBand.visible = true; scanBand.position.set(sx, 0.05, 0.6);
    scanBand.material.uniforms.uInt.value = 0.22 * sAmt * (t < 3.4 ? 1 : 1 - prog(t, 3.4, 3.6));
  }
  // ---------- 主角人头
  const hero = { visible: true, pos: [0, 0, 0], rot: [0, 0, 0], scanX: sx, scanAmt: t < 3.4 ? sAmt : 0 };
  hero.glow = 0.7 * Math.exp(-Math.max(0, t - 3.4) * 3) * (t >= 3.4 ? 1 : 0);
  // 被扫到时眼睛微光
  const glim = t < 3.4 ? sAmt * Math.exp(-Math.pow(sx / 0.35, 2)) : 0;
  hero.eyeInt = glim * 0.5;
  // 闭眼段：脸极缓慢地左右转动
  if (t >= 4.2) hero.rot = [0, 8 * D2R * Math.sin((t - 4.2) / 4.4 * Math.PI * 1.1), 0];
  // 睁眼（9.0）
  if (t >= 9.0) {
    const o = outExpo(prog(t, 9.0, 9.2));
    hero.eyeOpen = o;
    hero.eyeInt = lerp(0, 3.2, o) * (1 + 0.8 * Math.exp(-(t - 9.0) * 3)) * (1 + 0.6 * Math.exp(-Math.pow((t - 16.0) / 0.12, 2)));
    hero.eyeRays = 1.6 * Math.exp(-(t - 9.0) * 1.2) + 0.55;
    hero.crackClock = t - 9.0;
    hero.rot = [0, 8 * D2R * Math.sin((9.0 - 4.2) / 4.4 * Math.PI * 1.1) * (1 - sine(prog(t, 9.0, 11))), 0];
  }
  // 加冕（13.4–17.6）
  if (t >= 13.4) {
    const order = [3, 2, 4, 1, 5, 0, 6];
    hero.spikes = [0, 0, 0, 0, 0, 0, 0].map((_, k) => { const j = order.indexOf(k); return outExpo(prog(t, 13.55 + j * 0.2, 14.25 + j * 0.2)); });
    hero.ring = sine(prog(t, 13.4, 13.8));
    hero.gems = prog(t, 13.8, 15.2);
    hero.halo = sine(prog(t, 13.4, 13.7)); hero.haloScale = outExpo(prog(t, 13.4, 14.4)); hero.haloRot = (t - 13.4) * 0.12;
    hero.bust = 1; hero.bustAsm = prog(t, 14.2, 16.6);
  }
  // 19.4–20.8：神像松散，交给第一章
  if (t >= 19.4) { hero.scatter = 0.05 * sine(prog(t, 19.4, 20.0)); hero.scatterDist = 0.4; }
  if (t < 20.0) F.hero = hero;
  // 火花：裂纹生长端
  if (t >= 9.0 && t < 12.2) {
    const pr = crackProgress(t - 9.0);
    pr.forEach((p, i) => {
      if (p <= 0) return;
      const L = K.crackLines[i];
      for (let k = 0; k < 14; k++) {
        const tb = L.t0 + k * L.dur / 14; if (tb > t || t - tb > 0.5) continue;
        const loc = crackTipWorld(i, clamp((tb - L.t0) / L.dur));
        F.bursts.push({ t0: tb, pos: loc, n: 5, speed: 0.35, life: 0.45, grav: 0.4, seed: i * 31 + k, bright: 2.4 });
      }
    });
  }
  if (t >= 3.4 && t < 4.2) F.bursts.push({ t0: 3.4, pos: [0, 0.05, 0.3], n: 160, speed: 1.6, life: 0.8, grav: 0.3, seed: 3, bright: 2 });
  // ---------- 镜头
  F.cam = camAt(t);
  F.bloom = t >= 9.0 && t < 9.4 ? 1.2 : (t >= 4.2 && t < 13.4 ? 0.82 : 1);
}

function camAt(t) {
  const orbit = (ang, d, y, ty) => ({ pos: [Math.sin(ang * D2R) * d, y, Math.cos(ang * D2R) * d], target: [0, ty, 0] });
  if (t < 3.6) return LINEUP_CAM;
  if (t < 4.6) {
    const k = outExpo(prog(t, 3.6, 4.6));
    return { pos: [0, lerp(0.1, 0.05, k), lerp(7.2, 2.5, k)], target: [0, lerp(0.02, 0.03, k), lerp(-0.5, 0, k)] };
  }
  if (t < 8.6) { const k = sine(prog(t, 4.6, 8.6)); return orbit(lerp(0, 15, k), lerp(2.5, 2.25, k), 0.05, 0.03); }
  if (t < 9.0) return orbit(15, 2.25, 0.05, 0.03);
  if (t < 13.4) { const k = sine(prog(t, 9.0, 13.0)); return orbit(lerp(15, 6, k), lerp(2.25, 2.6, k), lerp(0.05, -0.32, k), lerp(0.03, 0.1, k)); }
  // 拉远成整尊神像，位于画面右侧
  const k = sine(prog(t, 13.4, 17.4));
  const end = { pos: [-0.85, -0.3, 5.3], target: [-0.85, -0.42, 0] };
  const a = orbit(6, 2.6, -0.32, 0.1);
  const c = { pos: a.pos.map((v, i) => lerp(v, end.pos[i], k)), target: a.target.map((v, i) => lerp(v, end.target[i], k)) };
  if (t > 17.4) { const d = t - 17.4; c.pos[0] += 0.04 * Math.sin(d * 0.6); c.pos[2] -= 0.08 * sine(prog(t, 17.4, 20.8)); }
  return c;
}

export function text(t, F) {
  if (t < 17.4 || t > 20.2) return;
  // 标题从左侧砸入
  const a = (1 - sine(prog(t, 19.4, 20.0)));
  const p = prog(t, 17.6, 18.05);
  if (t >= 17.6) {
    const x = lerp(-300, 560, outExpo(p)), s = lerp(1.25, 1, outExpo(p));
    glowText('傲慢', x, 470, fs(700, 230 * s), 'metal', { alpha: a * clamp(p * 3), size: 230 * s, glow: 50, glow2: 90, glowColor: '#8B3DFF', sweepOffset: 0.2 });
    glowText('七  宗  罪  ·  第  一  集', x, 640, fs(500, 34), C.key, { alpha: a * clamp((t - 17.9) * 3), glow: 14 });
  }
  // 特征词：分布在神像四周，避开脸
  const words = ['自命不凡', '目中无人', '居高临下', '自以为是'];
  const where = [[1.0, 0.72, 0.2], [1.45, -0.3, 0.2], [-1.2, 0.55, 0.2], [-1.2, -1.2, 0.6]];
  words.forEach((w, i) => {
    const sp = project(where[i]);
    tag(t, w, sp[0], sp[1], 18.0 + i * 0.4, 20.0, { fo: 0.6 });
  });
}
