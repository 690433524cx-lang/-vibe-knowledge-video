// 02 弯腰的人 37–54：螺旋高山与背石头的人 → 特写 → 看清脚下的大字 → 全景齐步 → 坍缩成一条线
import * as THREE from 'three';
import { K, points } from '../core.js';
import { cloudMaterial, COL } from '../mat.js';
import { PB, buildBentParts } from '../geo.js';
import { rng, clamp, lerp, prog, sine, outExpo, hash, TAU, D2R } from '../util.js';
import { staggerLine } from '../text.js';

export const MX = 40;           // 山所在的位置
const CX = 80;                  // 特写场地
const H = 5.2, BASE = 3.4;
const rAt = y => BASE * (1 - y / (H + 0.2)) + 0.06 * Math.sin(y * 11);
const pathAt = u => { const y = 0.15 + u * 4.6, a = u * TAU * 2.6; const r = rAt(y) + 0.07; return [Math.cos(a) * r, y, Math.sin(a) * r]; };
let G, GC, mountain, path, pilgrims = [], closeP, ground, debris, mats = {};
const NP = 12;

export function build() {
  G = new THREE.Group(); G.position.set(MX, 0, 0); K.scene.add(G);
  const R = rng(201);
  // 山体：带梯田起伏的锥面
  const mp = new PB();
  for (let i = 0; i < 34000; i++) {
    const y = Math.pow(R(), 1.25) * H, a = R() * TAU, shell = R() < 0.82;
    const r = rAt(y) * (shell ? 1 : Math.sqrt(R())) * (1 + (R() - 0.5) * 0.03);
    const n = [Math.cos(a), BASE / H, Math.sin(a)];
    mp.add([Math.cos(a) * r, y, Math.sin(a) * r], shell ? n : [0, 0, 0], R(), [0, 0, 0], [0, 0, 0, 1], [shell ? 0.75 : 0.25, 0]);
  }
  mats.mountain = cloudMaterial({ size: 0.07, bright: 1.15, depthRef: 10, maxPx: 10, colA: new THREE.Color('#C4B5FD'), colB: new THREE.Color('#7C3AED'), light: 0.7 });
  mountain = points(mp, mats.mountain, G);
  // 盘旋向上的发光小路
  const pp = new PB();
  for (let i = 0; i < 9000; i++) {
    const u = R(), c = pathAt(u), w = (R() - 0.5) * 0.12;
    const a = u * TAU * 2.6;
    pp.add([c[0] + Math.cos(a) * w, c[1] + (R() - 0.5) * 0.02, c[2] + Math.sin(a) * w], [0, 0, 0], R(), [0, 0, 0], [u, 0, 0, 1], [1, 0]);
  }
  mats.path = cloudMaterial({ size: 0.045, bright: 1.6, depthRef: 10, maxPx: 10, facing: 0 });
  mats.path.uniforms.uFlow.value = 0.6; mats.path.uniforms.uFlowK.value = 300;
  path = points(pp, mats.path, G);
  // 背石头的人（共用三套几何与材质）
  const parts = buildBentParts(211);
  const geo = { body: parts.body.geometry(THREE), leg: parts.leg.geometry(THREE), rock: parts.rock.geometry(THREE) };
  mats.body = cloudMaterial({ size: 0.05, bright: 1.25, depthRef: 4, maxPx: 12, light: 0.5 });
  mats.rock = cloudMaterial({ size: 0.065, bright: 1.2, depthRef: 4, maxPx: 12, colA: new THREE.Color('#C9BCEB'), colB: new THREE.Color('#6B5796'), light: 0.8,
    colHook: 'if (aMisc.y == 11.0) { col = uColCrack; b *= 1.4; }' });
  const mk = (parent, gg = geo, mb = mats.body, mr = mats.rock) => {
    const g = new THREE.Group(); parent.add(g);
    const body = new THREE.Points(gg.body, mb), rock = new THREE.Points(gg.rock, mr);
    const l1 = new THREE.Points(gg.leg, mb), l2 = new THREE.Points(gg.leg, mr === mats.rock ? mb : mb);
    for (const o of [body, rock, l1, l2]) { o.frustumCulled = false; g.add(o); }
    l1.position.set(-0.2, 0.86, 0.09); l2.position.set(-0.2, 0.86, -0.09); rock.position.set(-0.02, 1.36, 0);
    return { g, body, rock, l1, l2 };
  };
  for (const m of Object.values(mats)) K.mats.push(m);
  for (let i = 0; i < NP; i++) { const p = mk(G); p.g.scale.setScalar(0.3); pilgrims.push(p); }
  // 特写场地
  GC = new THREE.Group(); GC.position.set(CX, 0, 0); K.scene.add(GC);
  const gp = new PB();
  for (let i = 0; i < 70000; i++) {
    const x = lerp(-5, 9, R()), z = lerp(-3.5, 2.6, Math.sqrt(R()));
    const y = 0.04 * Math.sin(x * 2.1 + z * 1.3) + 0.02 * Math.sin(x * 7 + z * 5) - 0.02 + (R() < 0.06 ? R() * 0.05 : 0);
    gp.add([x, y, z], [0, 1, 0], R(), [0, 0, 0], [0, 0, 0, 1], [R() < 0.04 ? 1.6 : 0.5, 0]);
  }
  ground = points(gp, cloudMaterial({ size: 0.032, bright: 1.1, depthRef: 4, maxPx: 10, colA: new THREE.Color('#A78BFA'), colB: new THREE.Color('#A78BFA'), facing: 0 }), GC);
  const cp = buildBentParts(211, 6);
  const cgeo = { body: cp.body.geometry(THREE), leg: cp.leg.geometry(THREE), rock: cp.rock.geometry(THREE) };
  mats.cbody = cloudMaterial({ size: 0.024, bright: 1.5, depthRef: 4, maxPx: 12, light: 0.6 });
  mats.crock = cloudMaterial({ size: 0.036, bright: 1.25, depthRef: 4, maxPx: 12, colA: new THREE.Color('#C9BCEB'), colB: new THREE.Color('#6B5796'), light: 0.8,
    colHook: 'if (aMisc.y == 11.0) { col = uColCrack; b *= 1.3; }' });
  K.mats.push(mats.cbody, mats.crock);
  closeP = mk(GC, cgeo, mats.cbody, mats.crock);
  // 镜头前划过的虚化碎石
  const dp = new PB(); for (let i = 0; i < 26; i++) dp.add([0, 0, 0], [0, 0, 0], hash(i * 3.1 + 7), [0, 0, 0], [0, 0, 0, 1], [0.35, 0]);
  debris = points(dp, cloudMaterial({ size: 0.05, bright: 1, depthRef: 1, maxPx: 120, facing: 0, drift: 0 }), K.scene);
}

// 第 i 个人在山路上的位置与行走相位
function pilgrimState(i, t) {
  const u = 0.1 + i * 0.066 + 0.0018 * (t - 37) + (t > 50.2 ? 0.006 * sine(prog(t, 50.6, 51.4)) + 0.006 * sine(prog(t, 51.8, 52.6)) : 0);
  return { u, phase: (t - 37) / 1.6 + hash(i + 5) };
}
function poseWalker(p, phase, sink) {
  const sw = Math.sin(phase * TAU);
  p.l1.rotation.z = 0.32 * sw; p.l2.rotation.z = -0.32 * sw;
  p.body.position.y = -0.02 * Math.abs(Math.cos(phase * TAU)) - sink;
  p.rock.position.y = 1.36 - 0.03 * Math.abs(Math.cos(phase * TAU)) - sink * 1.6;
}

export function update(t, F) {
  const on = t > 36.9 && t < 54.6, close = t >= 42.0 && t < 50.05;
  G.visible = on && !close; GC.visible = on && close; debris.visible = on && close && t < 46.4;
  if (!on) return;
  // 山体缓慢旋转
  G.rotation.y = -0.05 * (t - 37); G.updateMatrixWorld(true);
  pilgrims.forEach((p, i) => {
    const s = pilgrimState(i, t), c = pathAt(s.u), c2 = pathAt(s.u + 0.004);
    p.g.position.set(...c);
    p.g.rotation.y = -Math.atan2(c2[2] - c[2], c2[0] - c[0]);
    poseWalker(p, s.phase, 0);
    if (t > 50.4 && t < 53.4) for (const tb of [50.95, 52.15]) if (t >= tb && t < tb + 0.7) {
      const w = new THREE.Vector3(...c).applyMatrix4(G.matrixWorld);
      F.bursts.push({ t0: tb, pos: [w.x, w.y + 0.03, w.z], n: 26, speed: 0.5, life: 0.7, grav: 0.15, seed: 400 + i * 7 + tb, bright: 1.5 });
    }
  });
  // 坍缩成一条水平光线
  const fl = prog(t, 53.6, 54.35);
  for (const m of [mats.mountain, mats.path, mats.body, mats.rock]) {
    m.uniforms.uFlatten.value = fl; m.uniforms.uLineY.value = 0; m.uniforms.uLineW.value = 12;
    m.uniforms.uAlpha.value = 1 - 0.3 * fl;
  }
  mats.path.uniforms.uBright.value = 1.6 * (1 + (t > 50.4 ? 0.8 * (Math.exp(-Math.pow((t - 51.2) / 0.3, 2)) + Math.exp(-Math.pow((t - 52.4) / 0.3, 2))) : 0));
  // ---------- 特写：每一步巨石下沉、尘土溅起、画面一震
  let shake = [0, 0];
  if (close) {
    const stepT = 1.15, k = (t - 42.0) / stepT, n = Math.floor(k), f = k - n;
    const x = 0.26 * (n + sine(clamp(f / 0.55)));
    closeP.g.position.set(x, 0, 0);
    const sink = 0.05 * Math.exp(-Math.pow((f - 0.55) / 0.12, 2));
    poseWalker(closeP, f * 0.5 + n * 0.5, sink);
    for (let j = Math.max(0, n - 1); j <= n; j++) {
      const land = 42.0 + j * stepT + 0.55 * stepT, d = t - land;
      if (d >= 0 && d < 0.8) F.bursts.push({ t0: land, pos: [CX + 0.26 * (j + 1) + 0.15, 0.03, 0], n: 70, speed: 0.6, life: 0.8, grav: 0.25, seed: 500 + j, bright: 1.4, dir: [0, 0.7, 0.5], spread: 1.0 });
      if (d >= 0 && d < 0.35) { const a = 0.018 * Math.exp(-10 * d); shake = [a * Math.sin(70 * d), a * Math.cos(55 * d)]; }
    }
    // 前景碎石
    const pos = debris.geometry.attributes.position.array, cam = camClose(t);
    for (let i = 0; i < 26; i++) {
      const sp = 0.25 + 0.3 * hash(i + 2), ph = (hash(i + 11) + t * sp) % 1;
      pos[i * 3] = cam.pos[0] + lerp(1.6, -1.6, ph); pos[i * 3 + 1] = cam.pos[1] + lerp(-0.7, 0.5, hash(i + 31)); pos[i * 3 + 2] = cam.pos[2] - lerp(0.5, 1.6, hash(i + 41));
    }
    debris.geometry.attributes.position.needsUpdate = true;
  }
  // ---------- 镜头
  const c = close ? camClose(t) : camFar(t);
  c.pos[0] += shake[0]; c.pos[1] += shake[1];
  F.cam = c;
  F.bloom = close ? 0.9 : 1.05;
}
function camClose(t) {
  const stepT = 1.15, k = (t - 42.0) / stepT;
  const px = CX + 0.26 * (Math.floor(k) + sine(clamp((k - Math.floor(k)) / 0.55))) * 0.85 + 0.2;
  if (t < 46.2) return { pos: [px - 0.5, 1.25, 4.6], target: [px + 0.25, 0.68, 0] };
  const u = sine(prog(t, 46.2, 49.6));
  return { pos: [px - 0.5, lerp(1.25, 0.7, u), lerp(4.6, 4.2, u)], target: [px + 0.25, lerp(0.68, 9.0, u), lerp(0, -4, u)] };
}
function camFar(t) {
  if (t < 42.0) {
    const k = sine(prog(t, 36.9, 42.0));
    return { pos: [MX + lerp(-1.5, 4.8, k), lerp(3.6, 2.6, k), lerp(16.5, 9.0, k)], target: [MX + lerp(0, 1.2, k), lerp(2.4, 2.0, k), 0] };
  }
  const k = sine(prog(t, 50.0, 53.6)), k2 = sine(prog(t, 53.4, 54.6));
  return { pos: [MX + lerp(-0.6, 0.4, k), lerp(lerp(3.0, 2.6, k), 0.5, k2), lerp(lerp(15.5, 13.5, k), 12, k2)], target: [MX, lerp(lerp(2.4, 2.2, k), 0.25, k2), 0] };
}

export function text(t, F) {
  if (t < 46.2 || t > 50.1) return;
  staggerLine(t, '抬了一辈子头的人，', 960, 360, 64, 46.5, 50.0, { step: 0.05, dur: 0.4, weight: 700, rise: 16, keyGlow: 30 });
  staggerLine(t, '在这里，第一次看清了〔紫〕脚下〔/紫〕的路。', 960, 460, 64, 47.3, 50.0, { step: 0.05, dur: 0.4, weight: 700, rise: 16, keyGlow: 30 });
}
