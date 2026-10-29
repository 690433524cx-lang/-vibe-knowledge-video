// 05 往下看的人 96–108：从人群沿石柱升到柱顶 → 背后视角：脚下人群、头顶亮星，他却低着头 → 猛然抬头，星光照亮他的脸
import * as THREE from 'three';
import { K, points, glow } from '../core.js';
import { cloudMaterial, COL } from '../mat.js';
import { PB, buildCrown, buildTiny, capsule, ellipsoid } from '../geo.js';
import { rng, clamp, lerp, prog, sine, outExpo, hash, TAU, D2R } from '../util.js';
import { staggerLine, C } from '../text.js';

const GX = -80, PH = 9.0;
const STAR = [0, 15.0, 30];
let G, pillar, crowd, ground, king, head, sky, star, beam = [], mats = {};

export function build() {
  G = new THREE.Group(); G.position.set(GX, 0, 0); K.scene.add(G);
  const R = rng(501);
  // 石柱：带竖向凹槽的圆柱 + 柱头 + 柱础
  const pp = new PB();
  for (let i = 0; i < 30000; i++) {
    const y = R() * PH, a = R() * TAU;
    const r = 0.45 * (1 - 0.05 * y / PH) * (1 - 0.08 * Math.pow(Math.abs(Math.sin(a * 6)), 6));
    pp.add([Math.cos(a) * r, y, Math.sin(a) * r], [Math.cos(a), 0, Math.sin(a)], R(), [0, 0, 0], [0, 0, 0, 1], [Math.abs(Math.sin(a * 6)) > 0.97 ? 1.5 : 0.85, 0]);
  }
  for (const [y0, y1, w] of [[PH, PH + 0.28, 0.72], [-0.05, 0.25, 0.75]]) {
    for (let i = 0; i < 5000; i++) {
      const f = Math.floor(R() * 6), u = R() * 2 - 1, v = R() * 2 - 1;
      let p, n;
      if (f < 4) { const a = f * Math.PI / 2; p = [Math.cos(a) * w - Math.sin(a) * u * w, lerp(y0, y1, (v + 1) / 2), Math.sin(a) * w + Math.cos(a) * u * w]; n = [Math.cos(a), 0, Math.sin(a)]; }
      else { p = [u * w, f === 4 ? y1 : y0, v * w]; n = [0, f === 4 ? 1 : -1, 0]; }
      pp.add(p, n, R(), [0, 0, 0], [0, 0, 0, 1], [Math.abs(u) > 0.97 || Math.abs(v) > 0.97 ? 1.6 : 0.9, 0]);
    }
  }
  mats.pillar = cloudMaterial({ size: 0.03, bright: 1.05, depthRef: 5, maxPx: 10, light: 0.7, colA: new THREE.Color('#E9E2FF'), colB: new THREE.Color('#7C3AED') });
  pillar = points(pp, mats.pillar, G);
  // 地面与一大片很小的人影
  const gp = new PB();
  for (let i = 0; i < 30000; i++) { const a = R() * TAU, r = 0.8 + Math.sqrt(R()) * 23; gp.add([Math.cos(a) * r, 0, Math.sin(a) * r], [0, 1, 0], R(), [0, 0, 0], [0, 0, 0, 1], [0.45 * (1 - r / 25), 0]); }
  ground = points(gp, cloudMaterial({ size: 0.03, bright: 0.9, depthRef: 6, maxPx: 8, facing: 0, colA: new THREE.Color('#8B5CF6'), colB: new THREE.Color('#8B5CF6') }), G);
  const cp = new PB(), RC = rng(511);
  for (let k = 0; k < 140; k++) {
    const front = RC() < 0.7, a = front ? lerp(0.35, 2.8, RC()) : RC() * TAU, r = front ? 3 + Math.sqrt(RC()) * 19 : 1.3 + Math.sqrt(RC()) * 8;
    buildTiny(RC, cp, [Math.cos(a) * r, 0, Math.sin(a) * r], 0.34 + 0.08 * RC(), 110, [1.1, 0]);
  }
  crowd = points(cp, cloudMaterial({ size: 0.04, bright: 1.5, depthRef: 4, maxPx: 40, facing: 0, colA: new THREE.Color('#C4B5FD'), colB: new THREE.Color('#C4B5FD') }), G);
  // 柱顶戴王冠的人：身体 + 可转动的头（头上戴着和神像同款的王冠）
  const RK = rng(521);
  const kb = new PB();
  ellipsoid(kb, RK, [0, 0.62, 0], 0.17, 0.27, 0.12, 1300);
  capsule(kb, RK, [0, 0.9, 0], [0, 0.85, 0], 0.05, 80);
  for (const sx of [-1, 1]) {
    capsule(kb, RK, [0.17 * sx, 0.84, 0], [0.22 * sx, 0.56, 0.05], 0.042, 260);
    capsule(kb, RK, [0.22 * sx, 0.56, 0.05], [0.12 * sx, 0.38, 0.12], 0.036, 200);
    capsule(kb, RK, [0.08 * sx, 0.4, 0], [0.09 * sx, 0.02, 0], 0.06, 420);
  }
  // 长袍下摆
  for (let i = 0; i < 1500; i++) { const a = RK() * TAU, y = RK() * 0.42, r = lerp(0.24, 0.17, y / 0.42); kb.add([Math.cos(a) * r, y + 0.02, Math.sin(a) * r], [Math.cos(a), 0, Math.sin(a)], RK(), [0, 0, 0], [0, 0, 0, 1], [0.9, 0]); }
  mats.king = cloudMaterial({ size: 0.014, bright: 0.75, depthRef: 3, maxPx: 5, light: 0.5 });
  king = new THREE.Group(); king.position.set(0, PH + 0.28, 0); G.add(king);
  points(kb, mats.king, king);
  head = new THREE.Group(); head.position.set(0, 0.92, 0); king.add(head);
  const hp = new PB(); ellipsoid(hp, RK, [0, 0.11, 0.0], 0.095, 0.115, 0.1, 900, [1.3, 0]);
  // 鼻尖与眉骨：让朝向看得出来
  ellipsoid(hp, RK, [0, 0.1, 0.1], 0.018, 0.03, 0.02, 80, [1.6, 0]);
  mats.head = cloudMaterial({ size: 0.014, bright: 0.75, depthRef: 3, maxPx: 5, light: 0.5 });
  points(hp, mats.head, head);
  const cr = buildCrown(531, 0.3);
  for (let i = 0; i < cr.pb.count; i++) cr.pb.p[i * 3 + 1] -= 0.0;
  mats.crown = cloudMaterial({ size: 0.012, bright: 0.95, depthRef: 3, maxPx: 5, facing: 0.3 });
  const crown = points(cr.pb, mats.crown, head); crown.position.set(0, 0.03, 0.025);
  // 压下来的星空 + 正中的巨大亮星
  const sp = new PB();
  for (let i = 0; i < 6000; i++) {
    const a = R() * TAU, e = Math.acos(lerp(0.05, 1, R())), r = 60;
    sp.add([Math.cos(a) * Math.sin(e) * r, Math.cos(e) * r + 6, Math.sin(a) * Math.sin(e) * r], [0, 0, 0], R(), [0, 0, 0], [0, 0, 0, 1], [0.6 + 1.4 * Math.pow(R(), 6), 0]);
  }
  sky = points(sp, cloudMaterial({ size: 0.12, bright: 1.2, depthRef: 60, maxPx: 6, facing: 0, drift: 0, colA: new THREE.Color('#F5F0FF'), colB: new THREE.Color('#DDD0FF') }), G);
  star = glow(1, new THREE.Color('#C4A8FF'), [9, 9], G, { core: COL.white, order: 12 }); star.position.set(...STAR);
  for (let k = 0; k < 2; k++) beam.push(glow(3, COL.eyeCore, [0.7, 1], G, { core: COL.white, billboard: false, order: 35 }));
}

function headPitch(t) { return lerp(48, -22, outExpo(prog(t, 105.8, 106.15))) * D2R; }

export function update(t, F) {
  const on = t > 95.8 && t < 108.4;
  G.visible = on;
  if (!on) return;
  const all = sine(prog(t, 95.9, 96.5)) * (1 - sine(prog(t, 107.7, 108.2)));
  for (const o of G.children) if (o.material && o.material.uniforms && o.material.uniforms.uAlpha) o.material.uniforms.uAlpha.value = all;
  for (const m of [mats.king, mats.head, mats.crown]) m.uniforms.uAlpha.value = all;
  head.rotation.x = headPitch(t);
  // 亮星：3 秒周期呼吸
  const br = 1 + 0.18 * Math.sin(TAU * (t - 96) / 3);
  star.scale.setScalar(br); star.material.uniforms.uInt.value = 0.75 * all * (1 + 0.8 * Math.exp(-Math.max(0, t - 105.8) * 3) * (t >= 105.8 ? 1 : 0));
  // 光柱：从亮星射向他的脸
  const bk = sine(prog(t, 105.8, 106.1)) * (1 - sine(prog(t, 107.6, 108.1)));
  const face = new THREE.Vector3(0, PH + 0.28 + 1.04, 0.09);
  const S = new THREE.Vector3(...STAR), dir = S.clone().sub(face), L = dir.length(); dir.normalize();
  beam.forEach((b, k) => {
    b.visible = bk > 0.01;
    b.position.copy(face.clone().addScaledVector(dir, L / 2));
    b.scale.set(1 + 0.6 * k, L, 1);
    b.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir);
    b.rotateY(k * Math.PI / 2);
    b.material.uniforms.uInt.value = 0.38 * bk;
  });
  mats.head.uniforms.uWhite.value = 0.5 * bk; mats.head.uniforms.uGlow.value = 0.8 * bk;
  if (t >= 105.8 && t < 106.8) F.bursts.push({ t0: 105.8, pos: [GX, face.y + 0.05, face.z], n: 260, speed: 1.6, life: 0.9, grav: 0.8, seed: 1058, bright: 2.4 });
  F.cam = camAt(t);
  F.bloom = 1.05;
}

function camAt(t) {
  const W = (p, g, fov) => ({ pos: [GX + p[0], p[1], p[2]], target: [GX + g[0], g[1], g[2]], fov });
  if (t < 100.7) {
    const k = sine(prog(t, 96.0, 100.5));
    const a = lerp(0.5, 0.9, k), d = lerp(5.5, 3.6, k);
    return W([Math.sin(a) * d, lerp(0.45, PH + 1.7, k), Math.cos(a) * d], [0, lerp(1.0, PH + 1.15, k), 0], 35);
  }
  // 背后视角：广角，脚下人群、头顶亮星
  const k = sine(prog(t, 100.7, 101.6)), k2 = sine(prog(t, 101.6, 105.6));
  const behind = W([lerp(0.9, 0.5, k), PH + 2.1 + 0.15 * k2, lerp(-1.6, -2.7, k) - 0.2 * k2], [0, PH - 0.7, 6.0], lerp(35, 70, k));
  if (t < 105.8) return behind;
  // 猛然抬头：仰拍向星空
  const u = outExpo(prog(t, 105.8, 106.4));
  return { pos: behind.pos, target: behind.target.map((v, i) => lerp(v, [GX + STAR[0], STAR[1] * 0.7, STAR[2]][i], u)), fov: 68 };
}

export function text(t, F) {
  if (t < 100.7 || t > 105.45) return;
  staggerLine(t, '一个总是往下看的人，', 960, 330, 60, 100.8, 105.4, { step: 0.05, dur: 0.4, weight: 700, rise: 16 });
  staggerLine(t, '永远看不见比他更〔紫〕高〔/紫〕的东西。', 960, 420, 60, 101.6, 105.4, { step: 0.05, dur: 0.4, weight: 700, rise: 16, keyGlow: 30 });
  staggerLine(t, '—— 路易斯《返璞归真》（大意）', 960, 500, 30, 103.6, 105.4, { step: 0.02, dur: 0.4, weight: 500, color: C.sub2, pop: false, glow: 8 });
}
