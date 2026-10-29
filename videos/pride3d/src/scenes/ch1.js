// 01 众罪之根 20–37：神像倾泻成球根 → 螺旋粒子流长成罪恶之树 → 七颗果子 → 能量奔流 → 向左散开
import * as THREE from 'three';
import { K, points, glow, reg } from '../core.js';
import { cloudMaterial, lineMaterial, COL } from '../mat.js';
import { PB, ellipsoid, linesToPB } from '../geo.js';
import { rng, clamp, lerp, prog, outExpo, outBack, sine, hash, TAU } from '../util.js';
import { tag } from '../text.js';
import { project } from '../main.js';

const RY = -2.6; // 树根所在高度
const FR = [[-1.5, 2.3], [1.55, 2.6], [-1.35, 3.0], [1.3, 3.35], [-1.0, 3.75], [0.95, 4.1], [0, 4.62]];
const NAMES = ['虚荣', '嫉妒', '愤怒', '悲伤', '贪婪', '暴食', '色欲'];
const TRUNK_T0 = 25.4, TRUNK_DUR = 1.9, TRUNK_TOP = 4.4;
const E_T0 = 33.6, E_DUR = 1.6; // 能量沿树干上冲
const trunkTime = y => TRUNK_T0 + TRUNK_DUR * clamp((y - 0.35) / (TRUNK_TOP - 0.35));
const energyTime = y => E_T0 + E_DUR * clamp((y - 0.35) / (TRUNK_TOP - 0.35));
let G, bulb, bulbLines, bulbCore, tree, tip, fruits = [], energy;
export const BR = FR.map(([x, y], i) => {
  const yb = i === 6 ? TRUNK_TOP : y - 0.6;
  const tb = trunkTime(yb), te = tb + 0.45;
  const eb = energyTime(yb), ee = eb + 0.35;
  return { x, y, yb, tb, te, eb, ee };
});

export function build() {
  G = new THREE.Group(); G.position.set(0, RY, 0); K.scene.add(G);
  const R = rng(101);
  // 球根：从神像的位置倾泻下来汇聚
  const pb = new PB();
  for (let i = 0; i < 9000; i++) {
    let x = R() * 2 - 1, y = R() * 2 - 1, z = R() * 2 - 1; const l = Math.hypot(x, y, z); if (l > 1 || l < 0.05) { i--; continue; }
    const shell = R() < 0.7; const k = shell ? 1 : Math.cbrt(R());
    x /= l; y /= l; z /= l;
    const wob = 1 + 0.08 * Math.sin(x * 6 + z * 4) * Math.cos(y * 5);
    const p = [x * 0.62 * k * wob, y * 0.45 * k * wob, z * 0.58 * k * wob];
    const from = [-0.85 + (R() - 0.5) * 2.0, -RY + lerp(-2.0, 0.9, R()), (R() - 0.5) * 0.8];
    pb.add(p, shell ? [x, y, z] : [0, 0, 0], R(), from, [R(), 0, 0, 1], [shell ? 0.9 : 0.45, 0]);
  }
  bulb = points(pb, cloudMaterial({ size: 0.028, bright: 0.85, depthRef: 4, maxPx: 14, colB: new THREE.Color('#9D4EDD') }), G);
  bulb.material.uniforms.uAsmSpread.value = 1.2;
  bulbCore = glow(0, new THREE.Color('#B23BE0'), [1.6, 1.6], G, { core: COL.eyeCore, order: 18 });
  // 球根表面的发光裂纹
  const lines = [];
  for (let k = 0; k < 9; k++) {
    let th = R() * TAU, ph = (R() - 0.5) * 1.2; const pts = [];
    const dth = (R() - 0.5) * 0.5, dph = (R() < 0.5 ? -1 : 1) * 0.12;
    for (let s = 0; s < 14; s++) {
      th += dth + (R() - 0.5) * 0.5; ph = clamp(ph + dph + (R() - 0.5) * 0.25, -1.3, 1.3);
      pts.push([Math.cos(ph) * Math.cos(th) * 0.63, Math.sin(ph) * 0.46, Math.cos(ph) * Math.sin(th) * 0.59]);
    }
    lines.push({ pts, width: 1.2 });
  }
  const lp = linesToPB(lines, 0.006, 103, 0.006);
  for (let i = 0; i < lp.count; i++) lp.e[i * 4 + 1] = 0;
  bulbLines = points(lp, lineMaterial({ size: 0.022, bright: 1.6 }), G);
  // 树：螺旋树干 + 七根枝条（aExtra.x = 出现时刻，aExtra.z = 能量到达时刻）
  const tp = new PB();
  for (let i = 0; i < 18000; i++) {
    const s = R(), y = 0.35 + (TRUNK_TOP - 0.35) * s, strand = Math.floor(R() * 5);
    const r = (0.24 * (1 - 0.5 * s) + 0.03) * (0.88 + 0.2 * R());
    const a = strand * TAU / 5 + s * TAU * 2.2 + (R() - 0.5) * 0.22;
    tp.add([Math.cos(a) * r, y, Math.sin(a) * r], [Math.cos(a), 0, Math.sin(a)], R(), [0, 0, 0], [trunkTime(y), 0, energyTime(y), 1], [1, 20]);
  }
  BR.forEach((b, bi) => {
    if (bi === 6) {
      for (let i = 0; i < 700; i++) { const s = R(), y = lerp(TRUNK_TOP, b.y - 0.15, s), a = R() * TAU, r = 0.05 * (1 - s) + 0.015; tp.add([Math.cos(a) * r, y, Math.sin(a) * r], [Math.cos(a), 0, Math.sin(a)], R(), [0, 0, 0], [b.tb + 0.45 * s, 0, b.eb + 0.35 * s, 1], [1.1, 21]); }
      return;
    }
    const P0 = [0, b.yb, 0], P2 = [b.x * 0.9, b.y - 0.05, 0], P1 = [b.x * 0.4, b.yb + 0.55, 0];
    for (let i = 0; i < 2600; i++) {
      const s = R(), u = 1 - s;
      const c = [u * u * P0[0] + 2 * u * s * P1[0] + s * s * P2[0], u * u * P0[1] + 2 * u * s * P1[1] + s * s * P2[1], 0];
      const a = R() * TAU, r = (0.07 * (1 - s) + 0.02) * (0.75 + 0.3 * R());
      tp.add([c[0], c[1] + Math.cos(a) * r, Math.sin(a) * r], [0, Math.cos(a), Math.sin(a)], R(), [0, 0, 0], [b.tb + 0.45 * s, 0, b.eb + 0.35 * s, 1], [1.1, 21]);
    }
  });
  tree = points(tp, cloudMaterial({
    size: 0.034, bright: 1.25, depthRef: 5, maxPx: 14, light: 0.35,
    uniforms: { uEnergyT: { value: 0 } }, uniformDecl: 'uniform float uEnergyT;',
    posHook: `if (aMisc.y == 20.0) { float ra = uTime*LW*7.0; p.xz = mat2(cos(ra), -sin(ra), sin(ra), cos(ra))*p.xz; }`,
    colHook: `
      float ee = uEnergyT - aExtra.z;
      float front = exp(-ee*ee*40.0);
      if (ee > 0.0) { col = mix(col, uColCrack, 0.75); b *= 1.6; }
      b *= 1.0 + front*3.0;
      float grow = uReveal - aExtra.x; b *= 1.0 + 3.0*exp(-grow*grow*60.0);`,
  }), G);
  tip = glow(0, COL.lilac, [0.7, 0.7], G, { core: COL.white, order: 30 });
  energy = glow(0, COL.crack, [0.9, 0.9], G, { core: COL.white, order: 31 });
  // 七颗果子：白色外壳 + 紫红内核
  fruits = BR.map((b, i) => {
    const g = new THREE.Group(); g.position.set(b.x, b.y, 0); G.add(g);
    const fp = new PB();
    for (let k = 0; k < 1300; k++) {
      let x = R() * 2 - 1, y = R() * 2 - 1, z = R() * 2 - 1; const l = Math.hypot(x, y, z); if (l > 1 || l < 0.05) { k--; continue; }
      x /= l; y /= l; z /= l; const rr = 0.21 * (0.92 + 0.08 * R());
      fp.add([x * rr, y * rr, z * rr], [x, y, z], R(), [0, 0, 0], [0, 0, 0, 1], [1, 0]);
    }
    const shell = points(fp, cloudMaterial({ size: 0.03, bright: 1.3, depthRef: 5, maxPx: 12, light: 0.5 }), g);
    const core = glow(0, new THREE.Color('#C026D3'), [0.42, 0.42], g, { core: COL.eyeCore, order: 25 });
    return { g, shell, core };
  });
}

function setVis(v) { G.visible = v; }

export function update(t, F) {
  if (t < 19.9 || t > 37.2) { setVis(false); return; }
  setVis(true);
  // ---------- 神像倾泻（20.0–21.4）
  if (t < 21.5) {
    F.hero = {
      visible: true, eyeOpen: 1, eyeInt: 3.2 * (1 - prog(t, 20.0, 20.8)), eyeRays: 0.5, crackClock: 9, spikes: [1, 1, 1, 1, 1, 1, 1], ring: 1, gems: 1,
      halo: 1 - sine(prog(t, 20.0, 20.6)), haloScale: 1, haloRot: (t - 13.4) * 0.12, bust: 1, bustAsm: 1,
      scatter: outExpo(prog(t, 20.0, 21.2)) * 0.999, scatterBias: [0.85, RY - 0.2, 0], scatterGrav: 1.4, scatterDist: 0.35,
      alpha: 1 - sine(prog(t, 20.9, 21.4)),
    };
  }
  const asm = prog(t, 20.3, 21.6);
  const bu = bulb.material.uniforms;
  bu.uAssemble.value = asm; bu.uAlpha.value = 1;
  const beat = Math.pow(0.5 + 0.5 * Math.sin((t - 21.5) * TAU / 1.1), 4);
  bulbCore.material.uniforms.uInt.value = asm * (0.35 + 0.45 * beat);
  bulbLines.material.uniforms.uProg.value[0] = asm > 0.95 ? 1 : 0;
  bulbLines.material.uniforms.uInten.value[0] = 0.6 + 0.6 * beat;
  // ---------- 树
  const tu = tree.material.uniforms;
  tu.uReveal.value = t; tu.uEnergyT.value = t;
  const ty = clamp((t - TRUNK_T0) / TRUNK_DUR) * (TRUNK_TOP - 0.35) + 0.35;
  tip.visible = t > TRUNK_T0 && t < TRUNK_T0 + TRUNK_DUR + 0.2;
  tip.position.set(0, ty + 0.05, 0); tip.material.uniforms.uInt.value = 1.2 * (1 - prog(t, TRUNK_T0 + TRUNK_DUR, TRUNK_T0 + TRUNK_DUR + 0.2));
  // 能量：沿树干上冲，再分到各枝
  const ey = clamp((t - E_T0) / E_DUR) * (TRUNK_TOP - 0.35) + 0.35;
  energy.visible = t > E_T0 && t < E_T0 + E_DUR + 0.1;
  energy.position.set(0, ey, 0); energy.material.uniforms.uInt.value = 1.6;
  // 果子
  BR.forEach((b, i) => {
    const f = fruits[i];
    const pop = prog(t, b.te, b.te + 0.4);
    const hitE = prog(t, b.ee, b.ee + 0.45), all = prog(t, 36.4, 36.9);
    const flash = Math.max(Math.sin(Math.PI * hitE) * (hitE > 0 ? 1 : 0), Math.sin(Math.PI * all) * 1.3);
    f.g.visible = pop > 0;
    f.g.scale.setScalar(Math.max(0.001, 1.25 * outBack(pop) * (1 + 0.25 * flash)));
    f.shell.material.uniforms.uBright.value = 1.1 * (1 + 1.2 * flash);
    f.core.material.uniforms.uInt.value = (0.4 + 0.12 * Math.sin(t * 3 + i)) * (1 + 2.2 * flash);
    if (t >= b.ee && t < b.ee + 0.6) F.bursts.push({ t0: b.ee, pos: [b.x, RY + b.y, 0], n: 50, speed: 1.2, life: 0.6, grav: 0.8, seed: 200 + i });
    if (t >= 36.4 && t < 37.1) F.bursts.push({ t0: 36.4, pos: [b.x, RY + b.y, 0], n: 60, speed: 1.8, life: 0.7, grav: 0.8, seed: 300 + i });
  });
  if (t > E_T0 && t < E_T0 + E_DUR) F.bursts.push({ t0: Math.floor(t * 10) / 10, pos: [0, RY + ey, 0], n: 18, speed: 0.8, life: 0.5, grav: 0.5, seed: Math.floor(t * 10) });
  // 36.6–37.0：整棵树化作粒子流向左侧散开
  const sc = prog(t, 36.6, 37.1);
  for (const m of [tree.material, bulb.material, ...fruits.map(f => f.shell.material)]) {
    m.uniforms.uScatter.value = sine(sc); m.uniforms.uScatterBias.value.set(-7, 0.5, 0); m.uniforms.uScatterDist.value = 0.6;
    m.uniforms.uAlpha.value = 1 - sine(prog(t, 36.85, 37.15));
  }
  fruits.forEach(f => { f.core.material.uniforms.uInt.value *= 1 - sc; });
  bulbCore.material.uniforms.uInt.value *= 1 - sc; bulbLines.material.uniforms.uInten.value[0] *= 1 - sc;
  // ---------- 镜头
  if (t >= 20.0) F.cam = camAt(t);
}

function camAt(t) {
  const L = (a, b, k) => ({ pos: a.pos.map((v, i) => lerp(v, b.pos[i], k)), target: a.target.map((v, i) => lerp(v, b.target[i], k)) });
  const idol = { pos: [-0.85, -0.3, 5.0], target: [-0.85, -0.42, 0] };
  const root = { pos: [0.25, RY + 0.55, 3.4], target: [0, RY + 0.15, 0] };
  if (t < 21.8) return L(idol, root, sine(prog(t, 20.0, 21.8)));
  if (t < TRUNK_T0) { const k = sine(prog(t, 21.8, TRUNK_T0)); return L(root, { pos: [-0.2, RY + 0.4, 3.1], target: [0, RY + 0.25, 0] }, k); }
  const canopy = { pos: [0, RY + 3.45, 6.2], target: [0, RY + 3.45, 0] };
  if (t < 29.0) {
    const k = sine(prog(t, TRUNK_T0, 29.0));
    const ty = lerp(0.3, 3.45, k);
    return { pos: [lerp(-0.2, 0, k), RY + ty, lerp(3.1, 6.2, k)], target: [0, RY + ty + lerp(0.15, 0, k), 0] };
  }
  if (t < 33.4) { const a = sine(prog(t, 29.0, 33.4)) * 0.2; return { pos: [Math.sin(a) * 6.2, RY + 3.45, Math.cos(a) * 6.2], target: canopy.target }; }
  const a0 = 0.2, k = sine(prog(t, 33.4, 35.6));
  const c0 = { pos: [Math.sin(a0) * 6.2, RY + 3.45, Math.cos(a0) * 6.2], target: canopy.target };
  return L(c0, { pos: [0.6, RY + 2.3, 12.1], target: [0, RY + 2.08, 0] }, k);
}

export function text(t, F) {
  if (t < 25 || t > 37.2) return;
  BR.forEach((b, i) => {
    const sp = project([b.x, RY + b.y, 0]);
    const off = i === 6 ? 120 : b.x < 0 ? -125 : 125;
    const x = sp[0] + off, y = sp[1] + (i === 6 ? 0 : 6);
    // 标签只在安全区内显示：避开章节栏、出处与底部字幕
    const inside = Math.min(clamp((y - 130) / 40), clamp((880 - y) / 40), clamp((x - 120) / 40), clamp((1800 - x) / 40));
    if (inside > 0) tag(t, NAMES[i], x, y, b.te + 0.1, 36.8, { fo: 0.3, alpha: inside });
  });
}
