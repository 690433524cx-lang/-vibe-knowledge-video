// 长版的场景资产：巨眼（第一章）、山崖与缝眼的人（第二章）、粒子大脑（第三章）、手机信息流（第四章）
import * as THREE from 'three';
import { PB, ellipsoid } from './geo.js';
import { cloudMaterial } from './mat.js';
import { rng, TAU, clamp, lerp } from './util.js';
import { ENVY, sampleSDF, humanSDF } from './assets.js';

// ============================================================ 巨眼
// 原设定宽约 6 个单位；竖屏 9 个单位外的可见宽度只有约 4.7，所以整体按 4.4/6 缩小（虹膜、瞳孔同比例）
// 宽约占画面宽度的 60%（相机 9 个单位外，横屏可见宽度约 10.1）
export const EYE = { W: 6, f: 1, R: 1.1, pupil: 0.35, pupilS: 0.2, H: 1.3 };
// kind（aMisc.y）：10 虹膜纤维 11 眼白 12 上眼睑 13 下眼睑 14 暗影触须
export function buildGiantEye(seed = 201, k = 1) {
  const R = rng(seed), pb = new PB();
  const aA = [], aT = [];
  const push = (kind, a, tt, bright, pos = [0, 0, 0]) => {
    // aFrom：组装前的位置（绿色旋涡）
    const ang = R() * TAU, rr = 0.6 + R() * 2.6;
    pb.add(pos, [0, 0, 0], R(), [Math.cos(ang) * rr, Math.sin(ang) * rr * 1.2, (R() - 0.5) * 1.5], [R(), 0, 0, 1], [bright, kind]);
    aA.push(a); aT.push(tt);
  };
  for (let f = 0; f < 180; f++) {
    const a0 = f / 180 * TAU + (R() - 0.5) * 0.02;
    const n = Math.round(46 * k);
    for (let i = 0; i < n; i++) push(10, a0 + (R() - 0.5) * 0.008, Math.pow(i / n, 0.9), 1.3 + 0.6 * R());
  }
  // 眼白：杏仁形范围内稀疏的点
  for (let i = 0; i < 7000 * k; i++) {
    const x = (R() * 2 - 1) * EYE.W / 2, y = (R() * 2 - 1) * EYE.H;
    push(11, 0, 0, 0.5 + 0.4 * R(), [x, y, -0.02]);
  }
  for (let i = 0; i < 3600 * k; i++) push(12, R() * 2 - 1, (R() - 0.5), 1.1 + 0.4 * R());
  for (let i = 0; i < 3000 * k; i++) push(13, R() * 2 - 1, (R() - 0.5), 1.0 + 0.3 * R());
  // 暗影触须：从眼眶边缘向外卷曲
  for (let tdl = 0; tdl < 46; tdl++) {
    const base = R() * 2 - 1, up = R() < 0.5 ? 1 : -1, len = 0.5 + R() * 0.9, sd = R() * 100;
    for (let i = 0; i < 90 * k; i++) {
      const tt = i / (90 * k);
      push(14, base, tt, 0.9 * (1 - tt * 0.7), [up, len, sd]);
    }
  }
  pb.x.aA = [1, aA]; pb.x.aT = [1, aT];
  return pb;
}
export function giantEyeMaterial() {
  return cloudMaterial({
    size: 0.045, bright: 1.1, depthRef: 8, maxPx: 10, drift: 0.006, colA: ENVY.bright, colB: ENVY.main,
    attrDecl: 'attribute float aA; attribute float aT;',
    uniforms: { uOpenE: { value: 0.6 }, uPupil: { value: EYE.pupil }, uFlareE: { value: 0 }, uRot: { value: 0 }, uSpring: { value: 0 }, uIn: { value: new THREE.Color(ENVY.high) },
      uWh: { value: new THREE.Color('#5E7A68') }, uTd: { value: new THREE.Color(ENVY.dark) } },
    uniformDecl: `uniform float uOpenE, uPupil, uFlareE, uRot, uSpring; uniform vec3 uIn, uWh, uTd; varying float vK; varying float vT;
      float lidY(float x){ float k = clamp(1.0 - pow(x/${(EYE.W / 2).toFixed(3)}, 2.0), 0.0, 1.0); return ${EYE.H.toFixed(3)}*uOpenE*pow(k, 0.85); }`,
    posHook: /* glsl */`
      vK = aMisc.y; vT = aT;
      float HW = ${(EYE.W / 2).toFixed(3)};
      if (aMisc.y == 10.0) {
        float rr = mix(uPupil + 0.02, ${EYE.R.toFixed(3)}, aT);
        float a = aA + uRot + sin(aT*9.0 + aSeed*20.0)*0.012;
        p = vec3(cos(a)*rr, sin(a)*rr, 0.05 - aT*0.04);
        vis *= step(abs(p.y), lidY(p.x) - 0.02);
      } else if (aMisc.y == 11.0) {
        vis *= step(abs(p.y), lidY(p.x) - 0.03)*step(${EYE.R.toFixed(3)} + 0.02, length(p.xy));
      } else if (aMisc.y == 12.0 || aMisc.y == 13.0) {
        float x = aA*HW*1.04;
        float y = lidY(x)*(aMisc.y == 12.0 ? 1.0 : -1.0) + aT*0.035;
        p = vec3(x, y, 0.08);
      } else if (aMisc.y == 14.0) {
        float x = aA*HW*1.02; float up = position.x; float len = position.y; float sd = position.z;
        vec3 q = vec3(x, lidY(x)*up, 0.0);
        float ang = 1.5708*up + sin(sd)*0.9 + (aA*0.9);
        float s = aT*len*(1.0 + uSpring);
        float curl = sin(s*4.0 + uTime*qf(30.0 + mod(sd, 9.0)) + sd)*0.9 + s*1.6*sign(sin(sd*3.1));
        q += vec3(cos(ang + curl*0.6), sin(ang + curl*0.6), 0.0)*s + vec3(0.0, 0.0, -0.1 - s*0.3);
        p = q + vec3(sin(uTime*qf(20.0) + sd + aT*5.0), cos(uTime*qf(26.0) + sd*1.3 + aT*4.0), 0.0)*0.04*aT;
      }`,
    colHook: /* glsl */`
      if (vK == 10.0) { col = mix(uIn, uColB, smoothstep(0.0, 0.85, vT)); b *= 1.0 + uFlareE*(1.4 - vT); }
      else if (vK == 11.0) col = uWh*0.8;
      else if (vK == 12.0 || vK == 13.0) col = mix(uColB, uColA, 0.4);
      else if (vK == 14.0) { col = uTd*2.0; b *= 0.85; }`,
  });
}

// ============================================================ 山崖与坐成一排的人（披兜帽斗篷，眼皮被铁丝缝上）
export const ROW = { n: 8, x0: -4.6, dx: 1.18, ground: -1.25, wallZ: -1.0 };
export function buildCliff(seed = 301, k = 1) {
  const R = rng(seed), pb = new PB();
  const fbm = (x, y) => { let v = 0, a = 0.5, f = 1; for (let i = 0; i < 4; i++) { v += a * Math.sin(x * f * 1.7 + Math.sin(y * f * 1.3 + i) * 1.4 + i * 2.1) * Math.cos(y * f * 1.9 - x * f * 0.7 + i); f *= 2.03; a *= 0.5; } return v; };
  for (let i = 0; i < 52000 * k; i++) {
    const x = lerp(-8, 7, R()), y = lerp(ROW.ground - 0.1, 5.5, Math.pow(R(), 1.3));
    const h = fbm(x * 0.9, y * 0.9);
    const z = ROW.wallZ + h * 0.45 + (R() - 0.5) * 0.04;
    const ridge = Math.abs(fbm(x * 2.1 + 3, y * 2.1)) < 0.05;
    const nx = fbm(x * 0.9 + 0.05, y * 0.9) - h, ny = fbm(x * 0.9, y * 0.9 + 0.05) - h;
    const lit = clamp(0.75 - nx * 2.5 + ny * 1.8, 0.35, 1.3);
    pb.add([x, y, z], [0, 0, 0], R(), [0, 0, 0], [R(), 0, 0, 1], [(ridge ? 1.5 : 0.75) * lit, 0]);
  }
  // 地面
  for (let i = 0; i < 9000 * k; i++) {
    const x = lerp(-8, 7, R()), z = lerp(ROW.wallZ, 2.5, R());
    pb.add([x, ROW.ground + (R() - 0.5) * 0.03, z], [0, 0, 0], R(), [0, 0, 0], [R(), 0, 0, 1], [0.45 * (1 - (z - ROW.wallZ) / 4), 0]);
  }
  return pb;
}
// 坐着的人：兜帽、低垂的头（P.hf 前倾、P.hx 侧偏，头靠向旁边人的肩）、宽肩、弓起的背、盘起的腿；有体积的剪影
function sitterSDF(P = { hx: 0, hf: 0.14 }) {
  const sph = (p, c, r) => Math.hypot(p[0] - c[0], p[1] - c[1], p[2] - c[2]) - r;
  const ell = (p, c, r) => (Math.hypot((p[0] - c[0]) / r[0], (p[1] - c[1]) / r[1], (p[2] - c[2]) / r[2]) - 1) * Math.min(...r);
  const smin = (a, b, kk) => { const h = clamp(0.5 + 0.5 * (b - a) / kk); return lerp(b, a, h) - kk * h * (1 - h); };
  const hc = [P.hx, 0.55 - Math.abs(P.hx) * 0.4, P.hf];
  return p => {
    const head = sph(p, hc, 0.19);
    let hood = Math.abs(sph(p, [hc[0] * 0.9, hc[1] + 0.03, hc[2] - 0.06], 0.28)) - 0.03;
    hood = Math.max(hood, -(sph(p, [hc[0], hc[1] - 0.03, hc[2] + 0.26], 0.22)));
    const shoulders = ell(p, [0, 0.3, 0.0], [0.4, 0.15, 0.25]);
    const back = ell(p, [0, 0.1, -0.14], [0.36, 0.42, 0.3]);
    const y = p[1], t = clamp((0.3 - y) / 1.2), r = lerp(0.38, 0.55, Math.sqrt(t));
    const cloak = Math.max(Math.hypot(p[0], (p[2] + 0.02) * 1.3) - r, Math.max(y - 0.3, -0.92 - y));
    const legs = ell(p, [0, -0.93, 0.28], [0.6, 0.14, 0.3]);                     // 盘起的腿
    return Math.min(head, smin(hood, smin(smin(shoulders, back, 0.1), smin(cloak, legs, 0.1), 0.12), 0.08));
  };
}
export function buildSitter(seed, k = 1, P) {
  const sdf = sitterSDF(P), pb = sampleSDF(sdf, Math.round(11000 * k), [[-0.8, -1.1, -0.7], [0.8, 1.0, 0.7]], seed, [1, 0]);
  // 内部也填上较暗的粒子，让剪影有体积，而不是空心线框
  const R = rng(seed + 77); let n = 0, guard = 0;
  while (n < 7000 * k && guard++ < 200000) {
    const p = [lerp(-0.8, 0.8, R()), lerp(-1.1, 1.0, R()), lerp(-0.7, 0.7, R())];
    if (sdf(p) > -0.01) continue;
    pb.add(p, [0, 0, 0], R(), [0, 0, 0], [R(), 0, 0, 1], [0.5, 0]); n++;
  }
  return pb;
}
// 缝上的眼睛：闭合的细线 + 每只眼 3 个针脚亮点（局部坐标，脸朝 +z）
export const SITTER_EYES = [[-0.07, 0.57, 0.322], [0.07, 0.57, 0.322]];
// 坐着的人闭着的眼睛：一道细细的亮线（跟着头的位置）
export function buildStitchLines(seed = 401, P = { hx: 0, hf: 0.14 }) {
  const R = rng(seed), pb = new PB();
  const hc = [P.hx, 0.55 - Math.abs(P.hx) * 0.4, P.hf];
  const eyes = [[hc[0] - 0.07, hc[1] + 0.02, hc[2] + 0.18], [hc[0] + 0.07, hc[1] + 0.02, hc[2] + 0.18]];
  for (const e of eyes) for (let i = 0; i < 160; i++) {
    const u = R() * 2 - 1;
    pb.add([e[0] + u * 0.05, e[1] - 0.006 * (1 - u * u) + (R() - 0.5) * 0.003, e[2] - 0.012 * u * u], [0, 0, 0], R(), [0, 0, 0], [R(), 0, 0, 1], [1.2, 0]);
  }
  return pb;
}

// ============================================================ 粒子大脑：两个椭球半球（中间留缝），表面用三维噪声的脊线做出沟回
export const BRAIN = { pain: [0, 0.35, 0.25], reward: [[0.2, -0.1, 0.15], [-0.2, -0.1, 0.15]] };
export function buildBrain(seed = 501, k = 1) {
  const R = rng(seed), pb = new PB();
  const n3 = (x, y, z) => Math.sin(x * 5.1 + Math.sin(y * 4.3) * 1.2) * Math.cos(y * 4.7 + Math.sin(z * 5.3)) * Math.sin(z * 4.9 + Math.cos(x * 3.7) * 1.3);
  const ridge = (x, y, z) => 1 - Math.abs(n3(x * 1.6, y * 1.6, z * 1.6) * 0.6 + n3(x * 3.3 + 2, y * 3.3, z * 3.3) * 0.4);
  const N = Math.round(50000 * k);
  for (let i = 0; i < N; i++) {
    const side = i % 2 ? 1 : -1;
    let x = R() * 2 - 1, y = R() * 2 - 1, z = R() * 2 - 1; const l = Math.hypot(x, y, z); if (l > 1 || l < 0.05) { i--; continue; }
    x /= l; y /= l; z /= l;
    if (x * side < -0.75) { i--; continue; } // 中缝那一面压平
    const rg = ridge(x, y, z);
    const surf = R() < 0.8;                  // 80% 在表层，20% 在内部（半透明的体积感）
    const rad = surf ? 1 + (rg - 0.6) * 0.09 : Math.pow(R(), 0.5) * 0.92;
    const p = [side * 0.4 + x * 0.42 * rad, y * 0.5 * rad - (y < -0.5 ? 0.05 : 0), z * 0.68 * rad];
    const gyr = surf && rg > 0.9;
    pb.add(p, surf ? [x, y, z] : [0, 0, 0], R(), [0, 0, 0], [R(), 0, 0, 1], [surf ? (gyr ? 1.6 : 0.6) : 0.22, surf ? 0 : 1]);
  }
  // 脑干
  for (let i = 0; i < 2500 * k; i++) {
    const a = R() * TAU, y = -R() * 0.55, r = 0.13 * (1 - y * 0.3);
    pb.add([Math.cos(a) * r, y - 0.35, -0.22 + Math.sin(a) * r], [0, 0, 0], R(), [0, 0, 0], [R(), 0, 0, 1], [0.55, 1]);
  }
  return pb;
}
export function brainMaterial() {
  return cloudMaterial({
    size: 0.026, bright: 0.8, depthRef: 3.4, maxPx: 10, facing: 0.6, colA: ENVY.bright, colB: ENVY.main, light: 0.3,
    uniforms: { uPain: { value: 0 }, uRew: { value: 0 }, uRewR: { value: 0 }, uTox: { value: new THREE.Color(ENVY.toxic) }, uWarm: { value: new THREE.Color(ENVY.bright) } },
    uniformDecl: 'uniform float uPain, uRew, uRewR; uniform vec3 uTox, uWarm;',
    colHook: /* glsl */`
      {
        vec3 q = position;
        float dp = length(q - vec3(${BRAIN.pain.join(', ')}));
        float pain = exp(-dp*dp/0.035)*uPain;
        float d1 = length(q - vec3(${BRAIN.reward[0].join(', ')})), d2 = length(q - vec3(${BRAIN.reward[1].join(', ')}));
        float dr = min(d1, d2);
        float rew = exp(-dr*dr/0.012)*uRew + exp(-pow((dr - uRewR)*9.0, 2.0))*uRew*0.8*step(0.01, uRewR);
        col = mix(col, uTox, clamp(pain*1.5, 0.0, 1.0)); b *= 1.0 + pain*2.5;
        col = mix(col, uWarm, clamp(rew, 0.0, 1.0)); b *= 1.0 + rew*1.6;
      }`,
  });
}

// ============================================================ 手机信息流
// 正常手机的比例（约 1:2）
export const PHONE = { w: 2.0, h: 4.0, r: 0.28, cardH: 0.76, cardW: 1.6, gap: 0.92, n: 7 };
function roundRect(R, pb, w, h, r, n, misc, z = 0, extra = [0, 0, 0, 1]) {
  const per = 2 * (w + h - 4 * r) + TAU * r;
  for (let i = 0; i < n; i++) {
    let s = R() * per, x, y;
    const ws = w - 2 * r, hs = h - 2 * r;
    if (s < ws) { x = -ws / 2 + s; y = h / 2; }
    else if ((s -= ws) < hs) { x = w / 2; y = hs / 2 - s; }
    else if ((s -= hs) < ws) { x = ws / 2 - s; y = -h / 2; }
    else if ((s -= ws) < hs) { x = -w / 2; y = -hs / 2 + s; }
    else { s -= hs; const q = Math.floor(s / (TAU * r / 4)), a = (s % (TAU * r / 4)) / r; const c = [[ws / 2, hs / 2, 0], [ws / 2, -hs / 2, -Math.PI / 2], [-ws / 2, -hs / 2, Math.PI], [-ws / 2, hs / 2, Math.PI / 2]][q % 4]; x = c[0] + r * Math.cos(c[2] + Math.PI / 2 - a); y = c[1] + r * Math.sin(c[2] + Math.PI / 2 - a); }
    pb.add([x + (R() - 0.5) * 0.015, y + (R() - 0.5) * 0.015, z], [0, 0, 0], R(), [0, 0, 0], extra, misc);
  }
}
// 图标：飞机、戒指、奖杯、钥匙、汽车、上升箭头（笔画折线，坐标约在 ±0.45 内）
const circle = (cx, cy, r, n = 24, a0 = 0, a1 = TAU) => Array.from({ length: n + 1 }, (_, i) => { const a = lerp(a0, a1, i / n); return [cx + Math.cos(a) * r, cy + Math.sin(a) * r]; });
const ICONS = [
  [[[-0.42, 0], [0.42, 0]], [[-0.05, 0], [-0.22, 0.32], [-0.1, 0.32], [0.18, 0]], [[-0.05, 0], [-0.22, -0.32], [-0.1, -0.32], [0.18, 0]], [[-0.38, 0], [-0.44, 0.13], [-0.34, 0.13], [-0.28, 0]], [[0.42, 0], [0.36, 0.04]]],
  [circle(0, -0.08, 0.26), circle(0, -0.08, 0.2), [[-0.1, 0.18], [0, 0.34], [0.1, 0.18], [-0.1, 0.18]], [[-0.05, 0.24], [0, 0.3], [0.05, 0.24]]],
  [[[-0.24, 0.34], [0.24, 0.34], [0.2, 0.06], [0.1, -0.04], [-0.1, -0.04], [-0.2, 0.06], [-0.24, 0.34]], circle(-0.27, 0.2, 0.09, 12, Math.PI / 2, Math.PI * 1.5), circle(0.27, 0.2, 0.09, 12, -Math.PI / 2, Math.PI / 2), [[0, -0.04], [0, -0.22]], [[-0.18, -0.36], [0.18, -0.36], [0.12, -0.22], [-0.12, -0.22], [-0.18, -0.36]]],
  [circle(-0.22, 0.12, 0.17), circle(-0.22, 0.12, 0.06), [[-0.08, 0.02], [0.4, -0.3]], [[0.22, -0.18], [0.3, -0.06]], [[0.32, -0.25], [0.4, -0.14]]],
  [[[-0.44, -0.12], [-0.44, 0.06], [-0.26, 0.08], [-0.14, 0.26], [0.16, 0.26], [0.3, 0.08], [0.44, 0.04], [0.44, -0.12], [-0.44, -0.12]], circle(-0.24, -0.14, 0.09), circle(0.24, -0.14, 0.09), [[-0.08, 0.08], [-0.08, 0.24]]],
  [[[-0.38, -0.32], [-0.14, -0.06], [0.04, -0.2], [0.34, 0.14]], [[0.16, 0.16], [0.36, 0.16], [0.36, -0.04]], [[-0.38, -0.36], [0.38, -0.36]]],
];
export function buildPhone(seed = 601, k = 1) {
  const R = rng(seed), frame = new PB(), cards = new PB();
  roundRect(R, frame, PHONE.w, PHONE.h, PHONE.r, Math.round(5200 * k), [1.3, 0]);
  roundRect(R, frame, PHONE.w - 0.12, PHONE.h - 0.12, PHONE.r - 0.06, Math.round(2600 * k), [0.6, 0]);
  for (let i = 0; i < 1400 * k; i++) frame.add([(R() - 0.5) * (PHONE.w - 0.2), (R() - 0.5) * (PHONE.h - 0.2), -0.05], [0, 0, 0], R(), [0, 0, 0], [R(), 0, 0, 1], [0.18, 1]);
  // 动态卡片：aExtra.y = 卡片序号；每张卡是圆角光框 + 图标
  const aCard = [];
  for (let c = 0; c < PHONE.n; c++) {
    const before = cards.count;
    roundRect(R, cards, PHONE.cardW, PHONE.cardH, 0.16, Math.round(1300 * k), [1.0, 0], 0.02);
    const icon = ICONS[c % ICONS.length];
    for (const stroke of icon) {
      for (let s = 0; s < stroke.length - 1; s++) {
        const a = stroke[s], b = stroke[s + 1], L = Math.hypot(b[0] - a[0], b[1] - a[1]), n = Math.round(L * 420 * k);
        for (let i = 0; i < n; i++) { const f = R(); cards.add([lerp(a[0], b[0], f) * 0.76 - 0.34, lerp(a[1], b[1], f) * 0.76, 0.03], [0, 0, 0], R(), [0, 0, 0], [0, 0, 0, 1], [1.5, 1]); }
      }
    }
    // 卡片右侧两三条「内容」光点线（不写文字）
    for (let ln = 0; ln < 3; ln++) {
      const L = [0.9, 0.7, 0.5][ln];
      for (let i = 0; i < 160 * k; i++) cards.add([0.1 + R() * L * 0.6, 0.18 - ln * 0.18 + (R() - 0.5) * 0.02, 0.03], [0, 0, 0], R(), [0, 0, 0], [0, 0, 0, 1], [0.6, 2]);
    }
    for (let i = before; i < cards.count; i++) aCard.push(c);
  }
  cards.x.aCard = [1, aCard];
  return { frame, cards };
}
export function cardMaterial() {
  return cloudMaterial({
    size: 0.024, bright: 1.0, depthRef: 8, maxPx: 10, colA: ENVY.other, colB: ENVY.other,
    attrDecl: 'attribute float aCard;',
    uniforms: { uScroll: { value: 0 }, uWarmHi: { value: new THREE.Color('#FFF1D0') } },
    uniformDecl: `uniform float uScroll; uniform vec3 uWarmHi;`,
    posHook: /* glsl */`
      {
        float total = ${(PHONE.n * PHONE.gap).toFixed(3)};
        float y0 = mod(aCard*${PHONE.gap.toFixed(3)} + uScroll*${PHONE.gap.toFixed(3)}, total) - total*0.5;
        p.y += y0;
        float lim = ${(PHONE.h / 2 - 0.25).toFixed(3)};
        vis *= smoothstep(lim, lim - 0.35, abs(p.y));
      }`,
    colHook: 'if (aMisc.y == 1.0) col = mix(uColA, uWarmHi, 0.35);',
  });
}
// 低头看手机的人（背影）：humanSDF，头向前低下
export function buildViewer(seed = 701, k = 1) {
  const base = humanSDF({ arm: 0.05 });
  const sdf = p => {
    // 头部向前低下：把头附近的点绕脖子旋转
    const y = p[1];
    if (y > 1.38) {
      const a = 0.55, cy = 1.42, cz = 0;
      const dy = y - cy, dz = p[2] - cz;
      const q = [p[0], cy + dy * Math.cos(a) + dz * Math.sin(a), cz - dy * Math.sin(a) + dz * Math.cos(a)];
      return base(q);
    }
    return base(p);
  };
  return sampleSDF(sdf, Math.round(9000 * k), [[-0.6, 0.6, -0.4], [0.6, 1.85, 0.5]], seed, [1, 0]);
}


// ============================================================ 侧面视角的大脑（从左侧看：前方是额叶朝画面左边，后方是枕叶，下方有小脑和脑干）
// 表面的沟回用发光的粒子线勾出（噪声等值线），内部是较暗的半透明粒子
export const BRAIN2 = { pain: [-0.2, 0.5, 0.0], reward: [-0.32, -0.12, 0.0] };
function brainSDF(p) {
  const ell = (c, r) => (Math.hypot((p[0] - c[0]) / r[0], (p[1] - c[1]) / r[1], (p[2] - c[2]) / r[2]) - 1) * Math.min(...r);
  const smin = (a, b, k) => { const h = clamp(0.5 + 0.5 * (b - a) / k); return lerp(b, a, h) - k * h * (1 - h); };
  let d = ell([0, 0.12, 0], [1.0, 0.62, 0.72]);
  d = smin(d, ell([-0.55, 0.02, 0], [0.55, 0.52, 0.66]), 0.15);   // 额叶
  d = smin(d, ell([0.62, 0.02, 0], [0.5, 0.5, 0.6]), 0.15);       // 枕叶
  d = smin(d, ell([-0.12, -0.3, 0], [0.62, 0.32, 0.62]), 0.12);   // 颞叶
  const cere = ell([0.62, -0.48, 0], [0.4, 0.24, 0.5]);            // 小脑
  const stem = (() => { const a = [0.22, -0.38, 0], b = [0.1, -1.0, 0.0]; const pa = [p[0] - a[0], p[1] - a[1], p[2] - a[2]], ba = [b[0] - a[0], b[1] - a[1], 0]; const h = clamp((pa[0] * ba[0] + pa[1] * ba[1]) / (ba[0] * ba[0] + ba[1] * ba[1])); return Math.hypot(pa[0] - ba[0] * h, pa[1] - ba[1] * h, pa[2]) - 0.13; })();
  return Math.min(d, cere, stem);
}
export function buildBrainSide(seed = 511, k = 1) {
  const surf = sampleSDF(brainSDF, Math.round(52000 * k), [[-1.25, -1.1, -0.8], [1.25, 0.8, 0.8]], seed, [1, 0]);
  const n3 = (x, y, z) => Math.sin(x * 6.1 + Math.sin(y * 4.3 + z * 2.1) * 1.4) + Math.sin(y * 6.7 + Math.cos(z * 5.1 + x * 1.7) * 1.3) + Math.sin(z * 5.9 + Math.sin(x * 3.9) * 1.2);
  for (let i = 0; i < surf.count; i++) {
    const [x, y, z] = surf.pos(i);
    const inCere = Math.hypot((x - 0.62) / 0.4, (y + 0.48) / 0.24, z / 0.5) < 1.05, inStem = y < -0.62;
    let line;
    if (inCere) line = Math.abs(Math.sin(y * 70 + x * 8)) < 0.22;                 // 小脑的细密横纹
    else if (inStem) line = false;
    else line = Math.abs(n3(x * 1.35, y * 1.35, z * 1.35)) < 0.24;               // 沟回
    // 外侧裂与中央沟两条主沟更亮
    const sylvian = !inCere && !inStem && Math.abs(y - (-0.08 - 0.25 * x)) < 0.025 && x > -0.75 && x < 0.45;
    const central = !inCere && !inStem && Math.abs(x - (0.05 - 0.25 * y)) < 0.02 && y > -0.05;
    surf.m[i * 2] = sylvian || central ? 2.4 : line ? 1.8 : 0.32;
    surf.m[i * 2 + 1] = sylvian || central || line ? 1 : 0;
  }
  // 内部：较暗的半透明粒子
  const R = rng(seed + 1);
  let n = 0;
  while (n < 9000 * k) {
    const p = [lerp(-1.2, 1.2, R()), lerp(-0.8, 0.75, R()), lerp(-0.7, 0.7, R())];
    if (brainSDF(p) > -0.04) continue;
    surf.add(p, [0, 0, 0], R(), [0, 0, 0], [R(), 0, 0, 1], [0.22, 2]); n++;
  }
  return surf;
}

// ============================================================ 缝眼：每只眼睛的眼缝上横跨 4 道针脚（局部坐标 = 傲慢项目的人脸单位）
export function buildStitches(eyes, seed = 421) {
  const R = rng(seed), pb = new PB();
  eyes.forEach((e, ei) => {
    for (let k = 0; k < 4; k++) {
      const x = e[0] + (k - 1.5) * 0.028 * (ei ? -1 : 1), tilt = 0;
      for (let i = 0; i < 220; i++) {
        const f = R() * 2 - 1, len = 0.02;
        pb.add([x + Math.sin(tilt) * f * len, e[1] - 0.004 + Math.cos(tilt) * f * len, e[2] + 0.012 - 0.01 * f * f], [0, 0, 0], R(), [0, 0, 0], [ei * 4 + k, 0, 0, 1], [1.6, 1]);
      }
    }
  });
  return pb;
}
