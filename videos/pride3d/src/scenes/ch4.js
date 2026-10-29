// 04 偏见盲点 76.2–96：“我”与一圈“别人” → 偏见碎片弹开、命中 → 闪回闭眼的脸 → 屏障后的倒影 → 偏见盲点砸裂屏障
import * as THREE from 'three';
import { K, points } from '../core.js';
import { cloudMaterial, lineMaterial, COL } from '../mat.js';
import { PB, buildStander, linesToPB } from '../geo.js';
import { rng, clamp, lerp, prog, sine, outExpo, in2, hash, TAU } from '../util.js';
import { glowText, staggerLine, fs, C } from '../text.js';
import { project } from '../main.js';

const GX = -40, FBX = 200;
const RING = 2.7, BAR = 1.05;
const OTHERS = [0, 1, 2, 3, 4, 5, 6, 7].map(i => { const a = (i / 8) * TAU + 0.2; return [Math.sin(a) * RING, Math.cos(a) * RING, a]; });
// 碎片：先飞向“我”被屏障弹开，再命中一个“别人”
const FRAG = [
  { s: '只相信支持自己的证据', t0: 81.8, from: [-5.2, 2.6, 2.2], hit: 2 },
  { s: '把成功归功于自己', t0: 82.85, from: [5.2, 2.8, 1.6], hit: 6 },
  { s: '喜欢一个人就处处看他顺眼', t0: 83.9, from: [-5.0, 2.2, -2.6], hit: 4 },
  { s: '别人犯错就怪他人品', t0: 84.95, from: [5.0, 2.4, -2.2], hit: 0 },
];
FRAG.forEach(f => {
  const d = Math.hypot(f.from[0], f.from[2]);
  f.bounce = [f.from[0] / d * BAR, 1.3, f.from[2] / d * BAR];
  const o = OTHERS[f.hit]; f.target = [o[0], 1.35, o[1]];
});
let G, me, others = [], barrier, refl, cracks, mats = {};

export function build() {
  G = new THREE.Group(); G.position.set(GX, 0, 0); K.scene.add(G);
  const R = rng(401);
  mats.me = cloudMaterial({ size: 0.045, bright: 1.7, depthRef: 4, maxPx: 6, colA: new THREE.Color('#FFFFFF'), colB: new THREE.Color('#C4B5FD'), light: 0.5 });
  me = points(buildStander(411, 5200), mats.me, G);
  others = OTHERS.map(([x, z, a], i) => {
    const m = cloudMaterial({ size: 0.05, bright: 1.35, depthRef: 4, maxPx: 12, colA: new THREE.Color('#A48AE8'), colB: new THREE.Color('#5B3BA8'), light: 0.5 });
    const o = points(buildStander(421 + i, 3600), m, G); o.position.set(x, 0, z); o.rotation.y = a + Math.PI;
    return o;
  });
  // 看不见的弧形屏障（只在被撞或被砸时显形）
  const bp = new PB();
  for (let i = 0; i < 14000; i++) {
    const a = R() * TAU, y = R() * 2.4;
    bp.add([Math.sin(a) * BAR, y, Math.cos(a) * BAR], [Math.sin(a), 0, Math.cos(a)], R(), [0, 0, 0], [0, 0, 0, 1], [0.06, 0]);
  }
  mats.bar = cloudMaterial({ size: 0.03, bright: 1, depthRef: 4, maxPx: 4, facing: 0, colA: COL.white, colB: COL.white });
  barrier = points(bp, mats.bar, G);
  // 屏障上的倒影
  mats.refl = cloudMaterial({ size: 0.05, bright: 0.5, depthRef: 4, maxPx: 12, colA: new THREE.Color('#E9D5FF'), colB: new THREE.Color('#A78BFA'), light: 0.3 });
  refl = new THREE.Points(me.geometry, mats.refl); refl.frustumCulled = false; K.mats.push(mats.refl); G.add(refl);
  refl.position.set(0, 0, BAR * 2); refl.rotation.y = Math.PI; refl.scale.set(1, 1, -1);
  // 屏障上的闪电裂纹（93.0）
  const lines = [], RL = rng(431);
  for (let k = 0; k < 10; k++) {
    let a = k / 10 * TAU + (RL() - 0.5) * 0.4, u = 0, v = 0; const pts = [];
    for (let s = 0; s < 14; s++) {
      const ang = u / BAR; pts.push([Math.sin(ang) * BAR * 1.01, 1.3 + v, Math.cos(ang) * BAR * 1.01]);
      a += (RL() - 0.5) * 0.8; u += Math.cos(a) * 0.08; v += Math.sin(a) * 0.08;
    }
    lines.push({ pts, width: 1.3 });
  }
  const cp = linesToPB(lines, 0.008, 433, 0.006); for (let i = 0; i < cp.count; i++) cp.e[i * 4 + 1] = 0;
  cracks = points(cp, lineMaterial({ size: 0.022, bright: 2.2 }), G);
}

function fragPos(f, t) {
  const d = t - f.t0;
  if (d < 0) return null;
  if (d < 0.42) { const k = in2(d / 0.42) * 0.6 + (d / 0.42) * 0.4; return { p: f.from.map((v, i) => lerp(v, f.bounce[i], k)), phase: 0 }; }
  if (d < 0.85) { const k = outExpo((d - 0.42) / 0.43); return { p: f.bounce.map((v, i) => lerp(v, f.target[i], k) + (i === 1 ? Math.sin(k * Math.PI) * 0.5 : 0)), phase: 1 }; }
  return { p: f.target, phase: 2, after: d - 0.85 };
}

export function update(t, F) {
  const on = t > 76.0 && t < 96.4, fb = t >= 86.2 && t < 88.6;
  G.visible = on && !fb;
  if (!on) return;
  const all = sine(prog(t, 76.1, 76.6)) * (1 - sine(prog(t, 95.8, 96.3)));
  for (const m of [mats.me, mats.bar, mats.refl, ...others.map(o => o.material)]) m.uniforms.uAlpha.value = all;
  // 被命中的人染成洋红
  others.forEach((o, i) => {
    const f = FRAG.find(f => f.hit === i), u = o.material.uniforms;
    const h = f ? prog(t, f.t0 + 0.85, f.t0 + 1.1) : 0;
    u.uTintAll.value = h; u.uBright.value = 1.35 * (1 + 0.9 * h + 1.5 * (f ? Math.exp(-Math.pow((t - f.t0 - 0.9) / 0.12, 2)) : 0));
  });
  // 屏障：碎片撞上的位置闪出白色弧光
  const bu = mats.bar.uniforms;
  FRAG.forEach((f, i) => {
    const d = t - (f.t0 + 0.42), w = d >= 0 ? Math.exp(-d * 6) : 0;
    bu.uHit.value[i].set(f.bounce[0], f.bounce[1], f.bounce[2], w * 6);
    if (d >= 0 && d < 0.6) F.bursts.push({ t0: f.t0 + 0.42, pos: [GX + f.bounce[0], f.bounce[1], f.bounce[2]], n: 70, speed: 1.4, life: 0.6, grav: 0.6, seed: 800 + i, bright: 2.4 });
    const d2 = t - (f.t0 + 0.85);
    if (d2 >= 0 && d2 < 0.6) F.bursts.push({ t0: f.t0 + 0.85, pos: [GX + f.target[0], f.target[1], f.target[2]], n: 50, speed: 1.0, life: 0.6, grav: 0.6, seed: 900 + i, bright: 2 });
  });
  const smash = t >= 93.0 ? Math.exp(-(t - 93.0) * 1.2) : 0;
  const behind = sine(prog(t, 88.8, 89.6)) * (1 - sine(prog(t, 95.6, 96.0)));
  bu.uBright.value = 1 + 1.6 * behind + 6 * smash;
  mats.me.uniforms.uBright.value = 1.7 * (1 - 0.45 * behind);
  refl.visible = behind > 0.01; mats.refl.uniforms.uAlpha.value = 0.55 * behind * all;
  cracks.visible = t >= 93.0;
  cracks.material.uniforms.uProg.value[0] = outExpo(prog(t, 93.0, 93.45));
  cracks.material.uniforms.uInten.value[0] = (1 + 2 * smash) * (1 - sine(prog(t, 95.7, 96.1)));
  if (t >= 93.0 && t < 93.9) F.bursts.push({ t0: 93.0, pos: [GX, 1.3, BAR], n: 240, speed: 2.4, life: 0.9, grav: 0.7, seed: 930, bright: 2.4, dir: [0, 0, 1], spread: 1.2 });
  // 闪回：开头那张闭眼的脸 + 故障效果
  if (fb) {
    F.hero = { visible: true, pos: [FBX, 0, 0], rot: [0, 0.12 * Math.sin((t - 86.2) * 1.3), 0], eyeOpen: 0, eyeInt: 0, crackClock: 0 };
    const g = Math.max(Math.exp(-(t - 86.2) * 5), 0.25 + 0.25 * Math.sin(t * 23) * Math.sin(t * 7.1), Math.exp(-Math.pow((t - 88.45) / 0.08, 2)));
    F.glitch = clamp(g);
    F.cam = { pos: [FBX + 0.1, 0.12, 3.1], target: [FBX, 0.0, 0] };
    return;
  }
  F.cam = camAt(t);
  F.bloom = 1.05;
}

function camAt(t) {
  const W = (p, g) => ({ pos: [GX + p[0], p[1], p[2]], target: [GX + g[0], g[1], g[2]] });
  if (t < 81.6) { const k = sine(prog(t, 76.0, 81.6)); return W([lerp(0.5, 0.2, k), lerp(12, 4.4, k), lerp(4, 8.6, k)], [0, lerp(0.2, 0.5, k), 0]); }
  if (t < 86.2) {
    // 每块碎片一次横摇跟随
    let yaw = 0;
    FRAG.forEach((f, i) => { const k = sine(prog(t, f.t0 - 0.1, f.t0 + 0.75)); yaw = lerp(yaw, (f.from[0] > 0 ? 1 : -1) * 0.35 + (f.target[0] * 0.08), k); });
    return W([Math.sin(yaw) * 3.4 + 0.2, 4.4, 8.6], [Math.sin(yaw) * 1.2, 0.5, 0]);
  }
  // 屏障后方：从“我”的背后往外看
  const k = sine(prog(t, 88.6, 90.0)), k2 = sine(prog(t, 90.0, 95.8));
  return W([lerp(1.6, 0.95, k) - 0.2 * k2, lerp(2.4, 1.8, k), lerp(-3.6, -3.0, k) + 0.35 * k2], [lerp(0.2, -0.3, k), lerp(1.1, 1.25, k), 3]);
}

export function text(t, F) {
  if (t < 81.5 || t > 96.3) return;
  // 偏见碎片：带拖尾的发光文字
  for (const f of FRAG) {
    const s = fragPos(f, t); if (!s || (s.after ?? 0) > 0.3) continue;
    const a = s.after ? 1 - s.after / 0.3 : clamp((t - f.t0) * 6);
    for (let k = 3; k >= 0; k--) {
      const q = fragPos(f, t - k * 0.045); if (!q) continue;
      const sp = project([GX + q.p[0], q.p[1], q.p[2]]), x = sp[0], y = sp[1] - 60;
      const inside = Math.min(clamp((y - 140) / 60), clamp((880 - y) / 60), clamp((x - 260) / 120), clamp((1660 - x) / 120));
      glowText(f.s, x, y, fs(600, 40), k === 0 ? C.white : '#C9A8FF', { alpha: a * inside * (k === 0 ? 1 : 0.16 * (1 - k / 4)), glow: k === 0 ? 22 : 10, glow2: k === 0 ? 34 : 0 });
    }
  }
  if (t >= 86.2 && t <= 88.6) staggerLine(t, '「我从不觉得，自己比别人强。」', 960, 880, 56, 86.3, 88.6, { step: 0.04, dur: 0.35, weight: 600, pop: false, fadeOut: 0.25 });
  if (t >= 88.8 && t <= 92.6) {
    staggerLine(t, '傲慢最狡猾的地方是：', 960, 430, 64, 89.0, 92.6, { step: 0.05, dur: 0.4, weight: 700, rise: 16 });
    staggerLine(t, '犯它的人，总觉得自己〔红〕没有〔/红〕。', 960, 530, 64, 89.8, 92.6, { step: 0.05, dur: 0.4, weight: 700, rise: 16, keyGlow: 30 });
  }
  const pe = prog(t, 92.8, 93.0), ae = clamp(pe * 4) * (1 - sine(prog(t, 95.5, 95.9)));
  if (ae > 0) {
    const sp = project([GX, 1.3, BAR]);
    const ctx = document.getElementById('out').getContext('2d');
    ctx.save(); ctx.translate(sp[0], Math.min(sp[1], 520)); ctx.scale(lerp(1.8, 1, in2(pe)), lerp(1.8, 1, in2(pe)));
    glowText('偏见盲点', 0, 0, fs(700, 120), 'metal', { alpha: ae, size: 120, glow: 40, glow2: 80, glowColor: '#8B3DFF' });
    ctx.restore();
  }
}
