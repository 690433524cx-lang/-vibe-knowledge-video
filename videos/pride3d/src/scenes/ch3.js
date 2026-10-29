// 03 平均线以上 54–76.2：地平线 → 落雪堆成钟形曲线 → 70% 涌向右边 → 左边蒸发、0% 砸下 → 前1% 光柱 → 拉远成光点
import * as THREE from 'three';
import { K, points, glow } from '../core.js';
import { cloudMaterial, lineMaterial, COL } from '../mat.js';
import { PB, buildTiny, linesToPB } from '../geo.js';
import { rng, clamp, lerp, prog, sine, outExpo, in2, hash, TAU } from '../util.js';
import { glowText, staggerLine, fs, C } from '../text.js';
import { project } from '../main.js';
import { MX } from './ch2.js';

const HGT = 2.2, SIG = 1.3, COLX = 3.4, COLH = 7.0;
const bell = x => HGT * Math.exp(-Math.pow(x / SIG, 2));
let G, hill, horizon, avgCol, colGlow, platform, topStar, climbers = [], cracks, ring, farDot, flash;
const WIN = 0;

export function build() {
  G = new THREE.Group(); G.position.set(MX, 0, 0); K.scene.add(G);
  const R = rng(301);
  // 钟形曲线山：约 60000 个粒子，偏向表面
  const hp = new PB(), ch = [];
  for (let i = 0; i < 60000; i++) {
    const x = (R() * 2 - 1) * 4.2, top = bell(x) + 0.04;
    const surf = R() < 0.55;
    const y = surf ? top * (0.96 + 0.04 * R()) : top * Math.pow(R(), 0.7);
    const z = (R() - 0.5) * 1.3 * (0.4 + 0.6 * Math.exp(-x * x / 6));
    const n = surf ? [-(-2 * x / (SIG * SIG)) * bell(x) * 0.6, 1, z * 0.6] : [0, 0, 0];
    hp.add([x, y, z], n, R(), [0, 0, 0], [(x + 4.2) / 8.4, 0, 0, 1], [surf ? 1.0 : 0.45, 0]);
    // aCh3：落下延迟、左半边移动延迟、是否为左侧留下的“2%”、蒸发延迟
    ch.push(R() * 2.6 + (y / HGT) * 0.6, R() * 1.4, x < 0 && R() < 0.035 ? 1 : 0, R());
  }
  hp.x.aCh3 = [4, ch];
  hill = points(hp, cloudMaterial({
    size: 0.058, bright: 1.1, depthRef: 9, maxPx: 10, light: 0.5,
    uniforms: { uFall: { value: 99 }, uShift: { value: 0 }, uEvap: { value: 0 } },
    uniformDecl: 'uniform float uFall, uShift, uEvap;', attrDecl: 'attribute vec4 aCh3;',
    posHook: `
      vec3 rest = p; float left = step(p.x, 0.0); float keep = aCh3.z;
      float ks = clamp((uShift - aCh3.y)/1.3, 0.0, 1.0); ks = ks*ks*(3.0-2.0*ks);
      float kr = clamp(uShift/3.0, 0.0, 1.0); kr = kr*kr*(3.0-2.0*kr);
      if (left > 0.5 && keep < 0.5) {
        vec3 tgt = vec3(0.12 + (-p.x)*0.72, p.y*2.1 + 0.05, p.z*0.9);
        rest = mix(p, tgt, ks) + vec3(0.0, sin(ks*3.14159)*1.4, 0.0);
      } else if (left < 0.5) { rest.y = p.y*(1.0 + 0.75*kr); }
      if (keep > 0.5) { float ke = clamp((uEvap - aCh3.w*0.25)/0.55, 0.0, 1.0); rest.y += ke*ke*2.2; vis *= 1.0 - ke; }
      float fk = clamp((uFall - aCh3.x)/0.9, 0.0, 1.0);
      p = rest + vec3(0.18*sin(aSeed*40.0 + uFall*2.0)*(1.0-fk), 5.5*(1.0 - fk*fk), 0.0);
      vis *= smoothstep(0.0, 0.15, uFall - aCh3.x);`,
    colHook: `
      if (position.x > 0.0 || aCh3.z < 0.5) { if (position.x <= 0.0) b *= 1.0 + 0.4*ks; }
      if (position.x > 0.0) { b *= 1.0 + 0.25*kr; col = mix(col, vec3(0.97, 0.94, 1.0), 0.35*kr); }
      if (aCh3.z > 0.5) b *= mix(1.0, 0.45, kr);`,
  }), G);
  hill.material.uniforms.uFlow.value = 0.45; hill.material.uniforms.uFlowK.value = 120;
  // 地平线（左半边会熄灭成虚线）
  const lp = new PB();
  for (let i = 0; i < 9000; i++) { const x = (R() * 2 - 1) * 9; lp.add([x, (R() - 0.5) * 0.012, (R() - 0.5) * 0.04], [0, 0, 0], R(), [0, 0, 0], [Math.abs(x) / 9, 0, 0, 1], [1, 0]); }
  horizon = points(lp, cloudMaterial({
    size: 0.03, bright: 1.6, depthRef: 9, maxPx: 10, facing: 0,
    uniforms: { uDead: { value: 0 } }, uniformDecl: 'uniform float uDead;',
    colHook: 'if (position.x < 0.0) b *= mix(1.0, step(0.5, fract(position.x*2.5))*0.22, uDead);',
  }), G);
  // 正中的平均光柱
  avgCol = glow(3, COL.lilac, [0.32, HGT * 1.35], G, { core: COL.white, order: 22 }); avgCol.position.set(0, HGT * 1.3 * 0.5, 0.2);
  // 前1% 的光柱、小平台与顶端的一个光点
  colGlow = glow(3, COL.lilac, [0.1, COLH * 1.04], G, { core: COL.white, order: 22 }); colGlow.position.set(COLX, COLH * 0.5, 0);
  const pp = new PB();
  for (let i = 0; i < 1600; i++) { const a = R() * TAU, r = 0.2 * Math.sqrt(R()); pp.add([COLX + Math.cos(a) * r, COLH + (R() - 0.5) * 0.02, Math.sin(a) * r], [0, 1, 0], R(), [0, 0, 0], [0, 0, 0, 1], [r > 0.18 ? 1.8 : 0.9, 0]); }
  platform = points(pp, cloudMaterial({ size: 0.02, bright: 1.4, depthRef: 5, maxPx: 10, facing: 0 }), G);
  topStar = glow(0, COL.lilac, [0.3, 0.3], G, { core: COL.white, order: 32 }); topStar.position.set(COLX, COLH + 0.06, 0);
  // 约 100 个往上爬的粒子小人
  const cp = new PB(); buildTiny(rng(311), cp, [0, 0, 0], 0.3, 160, [1.5, 0]);
  const cg = cp.geometry(THREE), cm = cloudMaterial({ size: 0.03, bright: 2.4, depthRef: 4, maxPx: 10, facing: 0 }); K.mats.push(cm);
  for (let k = 0; k < 100; k++) { const o = new THREE.Points(cg, cm); o.frustumCulled = false; G.add(o); climbers.push(o); }
  // 0% 砸下时的洋红冲击波与放射状闪电裂纹
  const lines = [], RL = rng(321);
  for (let k = 0; k < 9; k++) {
    let a = k / 9 * TAU + (RL() - 0.5) * 0.4, x = -2.3, z = 0; const pts = [[x, 0.02, z]];
    for (let s = 0; s < 12; s++) { a += (RL() - 0.5) * 0.7; x += Math.cos(a) * 0.17; z += Math.sin(a) * 0.17 * 0.6; pts.push([x, 0.02, z]); }
    lines.push({ pts, width: 1.4 });
  }
  const cpb = linesToPB(lines, 0.012, 323, 0.01); for (let i = 0; i < cpb.count; i++) cpb.e[i * 4 + 1] = 0;
  cracks = points(cpb, lineMaterial({ size: 0.03, bright: 2.2, col: COL.magenta, hot: new THREE.Color('#FFD1E1') }), G);
  ring = glow(4, COL.magenta, [1, 1], G, { billboard: false, order: 33 }); ring.rotation.x = -Math.PI / 2; ring.position.set(-2.3, 0.03, 0);
  farDot = glow(0, COL.lilac, [1, 1], G, { core: COL.white, order: 34 }); farDot.position.set(0.5, 1.6, 0);
  flash = glow(0, COL.eyeCore, [1, 1], K.camera, { core: COL.white, order: 90, billboard: false }); flash.position.set(0, 0, -2);
}

// 第 k 个小人：开始时刻、速度、绕柱角度
function climber(k, t) {
  const s = 68.4 + (k === WIN ? 0 : 0.15 + hash(k * 3.1 + 1) * 1.9), v = k === WIN ? 3.4 : 2.1 + 1.5 * hash(k * 5.7 + 2);
  const a = hash(k * 7.3 + 3) * TAU, r = 0.13 + 0.05 * hash(k * 9.1 + 4);
  const ta = s + COLH / v;
  if (t < s) return null;
  if (t < ta) { const y = v * (t - s); return { x: COLX + Math.cos(a) * r, y, z: Math.sin(a) * r, ry: -a }; }
  if (k === WIN) return { x: COLX, y: COLH, z: 0, ry: 0 };
  const tf = ta + 0.15 + 0.35 * hash(k * 2.3 + 5), d = t - tf;
  const cr = 0.2 + 0.08 * hash(k + 9);
  if (d < 0) return { x: COLX + Math.cos(a) * cr, y: COLH + 0.02, z: Math.sin(a) * cr, ry: -a };
  if (d > 0.6) return { gone: true, tf };
  return { x: COLX + Math.cos(a) * (cr + 0.9 * d), y: COLH - 4.9 * d * d, z: Math.sin(a) * (cr + 0.9 * d), ry: -a + d * 6, rz: d * 5, tf };
}

export function update(t, F) {
  const on = t > 53.9 && t < 76.4;
  G.visible = on; flash.visible = false;
  if (!on) return;
  const all = 1 - sine(prog(t, 75.9, 76.3));
  // 地平线
  const hu = horizon.material.uniforms;
  hu.uAlpha.value = sine(prog(t, 54.0, 54.5)) * all; hu.uDead.value = sine(prog(t, 64.0, 64.4));
  // 钟形曲线山
  const u = hill.material.uniforms;
  u.uFall.value = t - 54.5; u.uShift.value = t - 59.0; u.uEvap.value = t - 64.0; u.uAlpha.value = all;
  // 平均光柱
  const ap = sine(prog(t, 56.6, 57.4)) * (1 - sine(prog(t, 68.2, 68.8)));
  avgCol.visible = ap > 0.01; avgCol.scale.set(1, Math.max(0.01, ap), 1); avgCol.position.y = HGT * 1.35 * 0.5 * ap;
  avgCol.material.uniforms.uInt.value = 0.55 * ap;
  // 0% 冲击
  const ck = prog(t, 64.4, 64.75);
  cracks.visible = t > 64.4 && t < 68.8;
  cracks.material.uniforms.uProg.value[0] = outExpo(ck); cracks.material.uniforms.uInten.value[0] = (1 + 1.5 * Math.exp(-(t - 64.4) * 4)) * (1 - sine(prog(t, 68.0, 68.6)));
  const rk = prog(t, 64.4, 65.3);
  ring.visible = rk > 0 && rk < 1; ring.scale.setScalar(0.2 + 4.5 * outExpo(rk)); ring.material.uniforms.uInt.value = 2.2 * (1 - rk);
  if (t >= 64.4 && t < 65.2) F.bursts.push({ t0: 64.4, pos: [MX - 2.3, 0.1, 0], n: 220, speed: 2.4, life: 0.8, grav: 0.8, seed: 640, bright: 2.4 });
  // 前1% 光柱与爬柱的小人
  const cvis = t > 68.2;
  const cp = sine(prog(t, 68.4, 69.0));
  colGlow.visible = platform.visible = topStar.visible = cvis;
  colGlow.scale.set(1, Math.max(0.01, cp), 1); colGlow.position.y = COLH * 0.5 * cp; colGlow.material.uniforms.uInt.value = 0.5 * all;
  platform.material.uniforms.uAlpha.value = cp * all;
  topStar.material.uniforms.uInt.value = (0.8 + 0.25 * Math.sin(t * 6)) * cp * all;
  climbers.forEach((o, k) => {
    const s = cvis ? climber(k, t) : null;
    if (!s || s.gone) { o.visible = false; if (s && s.gone && t - s.tf < 1.3) F.bursts.push({ t0: s.tf + 0.6, pos: [MX + COLX, COLH - 1.6, 0], n: 10, speed: 0.9, life: 0.5, grav: 0.9, seed: 700 + k, bright: 2 }); return; }
    o.visible = true; o.position.set(s.x, s.y, s.z); o.rotation.set(0, s.ry || 0, s.rz || 0);
  });
  // 拉远成一个光点 + 光闪转场
  const fk = sine(prog(t, 72.8, 73.6));
  farDot.visible = fk > 0.01; farDot.scale.setScalar(lerp(1, 4, fk)); farDot.material.uniforms.uInt.value = 1.2 * fk * all;
  const fl = prog(t, 75.8, 76.3);
  if (fl > 0 && fl < 1) { flash.visible = true; flash.scale.setScalar(lerp(0.4, 6, outExpo(fl))); flash.material.uniforms.uInt.value = 0.42 * Math.sin(Math.PI * fl); }
  if (t >= 54.6) { F.cam = camAt(t); F.bloom = 1.05; }
}

function camAt(t) {
  const W = (pos, tg) => ({ pos: [MX + pos[0], pos[1], pos[2]], target: [MX + tg[0], tg[1], tg[2]] });
  if (t < 55.8) { const k = sine(prog(t, 54.6, 55.8)); return W([lerp(0.4, -2.6, k), lerp(0.5, 1.8, k), lerp(12, 11, k)], [lerp(0, -2.2, k), lerp(0.25, 0.8, k), 0]); }
  if (t < 58.6) { const k = sine(prog(t, 55.8, 58.6)); return W([lerp(-2.6, 1.4, k), lerp(1.8, 2.3, k), lerp(11, 9.5, k)], [lerp(-2.2, 0.8, k), lerp(0.8, 1.3, k), 0]); }
  if (t < 64.0) { const k = sine(prog(t, 58.6, 63.6)); return W([lerp(1.4, 2.2, k), lerp(2.3, 3.2, k), lerp(9.5, 10.5, k)], [lerp(0.8, 0.6, k), lerp(1.3, 2.0, k), 0]); }
  if (t < 68.4) { const k = outExpo(prog(t, 64.0, 64.5)), k2 = sine(prog(t, 64.5, 68.4)); return W([lerp(2.2, -2.6, k) - 0.4 * k2, lerp(3.2, 1.6, k), lerp(10.5, 7.5, k) - 0.6 * k2], [lerp(0.6, -2.0, k), lerp(2.0, 1.0, k), 0]); }
  if (t < 72.8) {
    const k = sine(prog(t, 68.4, 72.4)), a = 0.5 + 0.35 * k;
    return W([COLX + Math.sin(a) * 5, lerp(0.7, COLH + 1.2, k), Math.cos(a) * 5], [COLX, lerp(1.2, COLH - 0.6, k), 0]);
  }
  const k = outExpo(prog(t, 72.8, 73.7)), a = 0.85;
  const p0 = [COLX + Math.sin(a) * 5, COLH + 1.2, Math.cos(a) * 5], t0 = [COLX, COLH - 0.6, 0];
  return W([lerp(p0[0], 0.5, k), lerp(p0[1], 2.4, k), lerp(p0[2], 75, k)], [lerp(t0[0], 0.5, k), lerp(t0[1], 1.6, k), 0]);
}

export function text(t, F) {
  if (t < 56 || t > 76.3) return;
  const lab = (s, p3, dx, dy, a, size, color) => {
    const sp = project([MX + p3[0], p3[1], p3[2]]), x = sp[0] + dx, y = sp[1] + dy;
    const inside = Math.min(clamp((y - 150) / 50), clamp((880 - y) / 50), clamp((x - 140) / 50), clamp((1780 - x) / 50));
    glowText(s, x, y, fs(600, size), color, { alpha: a * inside, glow: 18, glow2: 30 });
  };
  // 平均
  const aa = sine(prog(t, 57.0, 57.5)) * (1 - sine(prog(t, 63.8, 64.2)));
  if (aa > 0) lab('平均', [0, HGT * 1.35, 0], 0, -42, aa, 36, C.white);
  // 70%：62.0 砸下
  const s70 = prog(t, 62.0, 62.3), a70 = clamp(s70 * 3) * (1 - sine(prog(t, 63.8, 64.15)));
  if (a70 > 0) {
    const sc = lerp(1.7, 1, outExpo(s70));
    glowTextScaled('70%', 1350, 340, 300, sc, a70, 'metal', '#8B3DFF');
  }
  // 2%：左边远处，很小很暗
  const a2 = sine(prog(t, 62.3, 62.8)) * (1 - sine(prog(t, 63.95, 64.25)));
  if (a2 > 0) lab('2%', [-3.0, 0.35, 0], 0, -30, a2 * 0.55, 44, '#9C8CC0');
  // 0%：64.4 从上方砸下
  const p0 = prog(t, 64.15, 64.4), a0 = clamp(p0 * 4) * (1 - sine(prog(t, 68.0, 68.5)));
  if (a0 > 0) {
    const sp = project([MX - 2.3, 0, 0]);
    const y = lerp(-250, sp[1] - 210, in2(p0));
    glowTextScaled('0%', sp[0], y, 300, 1 + 0.12 * Math.exp(-(t - 64.4) * 8) * (t > 64.4 ? 1 : 0), a0, C.neg, '#E11D63');
  }
  // 前1%
  const a1 = sine(prog(t, 69.4, 69.9)) * (1 - sine(prog(t, 72.6, 73.0)));
  if (a1 > 0) lab('前1%', [COLX, COLH, 0], 140, -6, a1, 40, C.key);
  // 画面大字
  if (t >= 68.6 && t <= 72.4) {
    staggerLine(t, '〔红〕25%〔/红〕的人，觉得自己是〔紫〕前1%〔/紫〕。', 960, 470, 72, 68.6, 72.4, { step: 0.05, dur: 0.4, weight: 700, rise: 16, keyGlow: 30 });
    staggerLine(t, '—— 美国大学理事会，1976至1977学年学生调查', 960, 560, 30, 70.6, 72.4, { step: 0.02, dur: 0.4, weight: 500, color: C.sub2, pop: false, glow: 8 });
  }
  // 优于平均效应：从远处的光点冲出
  const pe = prog(t, 72.8, 73.25), ae = clamp(pe * 3) * (1 - sine(prog(t, 75.8, 76.15)));
  if (ae > 0) {
    const sp = project([MX + 0.5, 1.6, 0]);
    const e = outExpo(pe);
    glowTextScaled('优于平均效应', lerp(sp[0], 960, e), lerp(sp[1], 450, e), 120, lerp(0.08, 1, e), ae, 'metal', '#8B3DFF');
  }
}
function glowTextScaled(s, x, y, size, sc, a, color, gc) {
  const ctx = document.getElementById('out').getContext('2d');
  ctx.save(); ctx.translate(x, y); ctx.scale(sc, sc);
  glowText(s, 0, 0, fs(700, size), color, { alpha: a, size, glow: 40, glow2: 80, glowColor: gc });
  ctx.restore();
}
