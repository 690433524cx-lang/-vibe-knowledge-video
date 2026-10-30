// 嫉妒的专属资产：眼睛（眼眶开口 + 虹膜 + 瞳孔）、粒子蛇、荆棘光环、缠着藤蔓的心、暖金色的「别人」
import * as THREE from 'three';
import { PB, capsule, ellipsoid } from '../geo.js';
import { SHARED, cloudMaterial } from '../mat.js';
import { rng, TAU, clamp, lerp } from '../util.js';

export const ENVY = { main: '#3DDC84', dark: '#0B3A22', bright: '#A7F3C9', high: '#F0FFF5', toxic: '#C6F432', other: '#FFD27A', bg: '#020A06' };
const col = h => new THREE.Color(h);
const COMMON = /* glsl */`
uniform float uLoop, uPx;
float h1(float n){ return fract(sin(n*127.1+311.7)*43758.5453); }
float qf(float k){ return max(1.0, floor(k*uLoop/128.0 + 0.5))*6.28318530718/uLoop; }
`;

// ============================================================ 眼睛
// 一只眼睛 = 两块面片：内层（普通混合，遮住开口后的脸部粒子：暗底、虹膜、瞳孔）+ 外层（叠加：眼睑线、柔光、射线）
// 尺寸按世界单位：开口宽 0.32、高 0–0.06；虹膜半径 0.045；瞳孔半径 0.015。gaze 让虹膜水平移动，最多为开口宽度的 35%。
const EYE_GLSL = /* glsl */`
  uniform float uOpen, uGaze, uFlare, uAlpha, uLine, uSquint, uIrisB; uniform vec2 uHalf; uniform vec3 uMain, uBright, uDark, uHigh;
  varying vec2 vUv;
  const float EW = 0.16;
  const float EK = 1.25;   // 整只眼睛放大 1.25 倍：竖屏特写里斜视的眼神要一眼看清
  // 杏仁形开口：上下眼睑各自是一条抛物线；斜视时整体收窄到 70%，上眼睑压得更低
  void lids(vec2 w, out float top, out float bot){
    float xn = clamp(w.x/EW, -1.0, 1.0);
    float sq = mix(1.0, 0.7, uSquint);
    float h = 0.036*uOpen*sq;
    float shape = pow(max(1.0 - xn*xn, 0.0), 0.6)*(1.0 + 0.12*xn);
    top = h*shape*mix(1.0, 0.9, uSquint);
    bot = -h*shape*(1.0 - 0.1*xn);
  }
`;
export function eyeMaterials() {
  const u = {
    ...SHARED, uTime: { value: 0 },
    uOpen: { value: 0 }, uGaze: { value: 0 }, uSquint: { value: 0 }, uFlare: { value: 0 }, uAlpha: { value: 1 }, uLine: { value: 1 }, uIrisB: { value: 1 },
    uHalf: { value: new THREE.Vector2(0.3, 0.16) },
    uMain: { value: col(ENVY.main) }, uBright: { value: col(ENVY.bright) }, uDark: { value: col(ENVY.dark) }, uHigh: { value: col(ENVY.high) },
  };
  const vs = `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.0); }`;
  const inner = new THREE.ShaderMaterial({
    uniforms: u, transparent: true, depthWrite: false, depthTest: false, blending: THREE.NormalBlending,
    vertexShader: vs,
    fragmentShader: /* glsl */`
      ${COMMON}
      uniform float uTime;
      ${EYE_GLSL}
      void main(){
        vec2 w = (vUv*2.0 - 1.0)*uHalf/EK;
        float top, bot; lids(w, top, bot);
        float inside = step(abs(w.x), EW)*smoothstep(top + 0.0015, top - 0.0015, w.y)*smoothstep(bot - 0.0015, bot + 0.0015, w.y);
        if (uOpen < 0.01 || inside < 0.01) discard;
        // 暗底：深绿，边缘更暗
        vec3 c = (uDark*0.9 + vec3(0.02, 0.05, 0.035))*(0.55 + 0.45*(1.0 - abs(w.x/EW)));
        // 虹膜：主色 + 亮色的放射状纹理，靠近瞳孔更亮
        vec2 ic = vec2(uGaze*0.112, 0.002);   // 最多移动开口宽度（0.32）的 35%
        vec2 d = w - ic; float r = length(d), ang = atan(d.y, d.x);
        float fib = 0.55 + 0.45*sin(ang*37.0 + 3.0*sin(ang*7.0)) * (0.6 + 0.4*sin(ang*91.0 + r*300.0));
        float ir = smoothstep(0.045, 0.043, r);
        vec3 iris = mix(uMain, uBright, clamp(fib*smoothstep(0.045, 0.012, r)*1.2, 0.0, 1.0));
        iris *= 1.25 + 0.8*smoothstep(0.045, 0.02, r);
        iris += uHigh*uFlare*0.8*smoothstep(0.045, 0.0, r);
        iris *= uIrisB;
        iris = mix(iris, uDark*0.6, smoothstep(0.04, 0.046, r)*0.6); // 虹膜外缘一圈深色
        c = mix(c, iris, ir);
        // 瞳孔与高光
        float pu = smoothstep(0.0155, 0.0135, r);
        c = mix(c, vec3(0.0, 0.015, 0.008), pu);
        float hl = smoothstep(0.0045, 0.0025, length(d - vec2(-0.006, 0.006)));
        c = mix(c, uHigh*1.4, hl);
        gl_FragColor = vec4(c, inside*uAlpha);
      }`,
  });
  const outer = new THREE.ShaderMaterial({
    uniforms: u, transparent: true, depthWrite: false, depthTest: false, blending: THREE.AdditiveBlending,
    vertexShader: vs,
    fragmentShader: /* glsl */`
      ${COMMON}
      uniform float uTime;
      ${EYE_GLSL}
      void main(){
        vec2 w = (vUv*2.0 - 1.0)*uHalf/EK;
        float top, bot; lids(w, top, bot);
        float xn = w.x/EW, inX = smoothstep(1.08, 0.92, abs(xn));
        // 眼睑线（闭眼时是一道细缝）
        float lt = exp(-abs(w.y - top)/0.0022), lb = exp(-abs(w.y - bot)/0.0022);
        float line = (lt*1.0 + lb*0.6)*inX*uLine;
        // 主色柔光
        vec2 e = w/vec2(0.2, 0.07); float soft = exp(-dot(e, e)*1.5);
        // 虹膜爆亮：射线
        vec2 ic = vec2(uGaze*0.112, 0.002); vec2 d = w - ic; float r = length(d), ang = atan(d.y, d.x);
        float rays = (pow(abs(cos(ang*3.0 + 0.5)), 60.0) + pow(abs(cos(ang*5.0 + 1.3)), 90.0)*0.7)*exp(-r*14.0)*smoothstep(0.03, 0.06, r);
        vec3 c = uMain*line*0.55 + uBright*line*0.25 + uMain*soft*(0.12 + 0.06*uOpen) + (uBright*0.6 + uHigh*0.4)*rays*uFlare*0.9
               + uHigh*exp(-r*r/0.0012)*uFlare*0.35*step(0.01, uOpen);
        float edge = smoothstep(1.0, 0.85, abs(vUv.x*2.0 - 1.0))*smoothstep(1.0, 0.85, abs(vUv.y*2.0 - 1.0));
        gl_FragColor = vec4(c*uAlpha*edge, 1.0);
      }`,
  });
  return { inner, outer, u };
}

// ============================================================ 粒子蛇
// 路径（相对头部中心）：θ = θ0 + 方向·u·2.2π（叠加摆动），y 从 −1.6 升到 +0.9，半径 0.75→0.95
// 蛇身：每 0.02 个单位一圈 12 个点（再错开两圈加密），圈半径从蛇头附近 0.05 收细到尾巴 0.015
export const SNAKES = [
  { th0: 0, dir: 1, u0: 0.62 }, { th0: 0, dir: -1, u0: 0.55 }, { th0: 0, dir: 1, u0: 0.45 }, { th0: 0, dir: -1, u0: 0.7 },
];
// 让每条蛇在 u≈0.30（下巴以下）从正前方经过，眼睛高度时在头的侧后方，不挡住脸
SNAKES.forEach((s, i) => { const uf = [0.3, 0.26, 0.36, 0.22][i]; s.th0 = -s.dir * uf * 2.2 * Math.PI + [0, 0.25, -0.3, 0.15][i]; s.rk = [1, 0.96, 1.04, 0.92][i]; });
const SN_GLSL = /* glsl */`
  uniform float uTh0, uDir, uRk, uWave, uLo, uHi;
  vec3 spath(float u, float t){
    float th = uTh0 + uDir*u*2.2*3.14159265 + sin(u*14.0 - t*uWave)*0.05;
    float r = mix(0.75, 0.95, u)*uRk;
    return vec3(sin(th)*r, mix(-1.6, 0.9, u), cos(th)*r - 0.05);
  }
`;
export function snakePathJS(s, u, t, wave) {
  const th = s.th0 + s.dir * u * 2.2 * Math.PI + Math.sin(u * 14 - t * wave) * 0.05;
  const r = lerp(0.75, 0.95, u) * s.rk;
  return [Math.sin(th) * r, lerp(-1.6, 0.9, u), Math.cos(th) * r - 0.05];
}
export function buildSnakePB(seed) {
  const R = rng(seed), pb = new PB();
  const len = 6.6, rings = Math.round(len / 0.02);
  const aU = [], aA = [], aK = [];
  for (let k = 0; k < rings; k++) for (let sub = 0; sub < 2; sub++) for (let j = 0; j < 12; j++) {
    const u = (k + sub * 0.5 + (R() - 0.5) * 0.2) / rings;
    pb.add([0, 0, 0], [0, 0, 0], R(), [0, 0, 0], [0, 0, 0, 1], [0.8 + 0.4 * R(), 0]);
    aU.push(u); aA.push((j + sub * 0.5) / 12 * TAU + (R() - 0.5) * 0.15); aK.push(0);
  }
  // 蛇头：半径 0.09 的小椭球（沿前进方向拉长）
  for (let i = 0; i < 1400; i++) {
    let x = R() * 2 - 1, y = R() * 2 - 1, z = R() * 2 - 1; const l = Math.hypot(x, y, z); if (l > 1 || l < 0.1) { i--; continue; }
    pb.add([x / l, y / l, z / l], [0, 0, 0], R(), [0, 0, 0], [0, 0, 0, 1], [1.2, 1]);
    aU.push(0); aA.push(0); aK.push(1);
  }
  pb.x.aU = [1, aU]; pb.x.aA = [1, aA]; pb.x.aK = [1, aK];
  return pb;
}
export function snakeMaterial(s) {
  return cloudMaterial({
    size: 0.03, bright: 1.25, depthRef: 4, maxPx: 12, drift: 0, colA: ENVY.main, colB: ENVY.dark,
    attrDecl: 'attribute float aU; attribute float aA; attribute float aK;',
    uniforms: { uTh0: { value: s.th0 }, uDir: { value: s.dir }, uRk: { value: s.rk }, uWave: { value: 4 }, uLo: { value: 0 }, uHi: { value: 0 },
      uScale: { value: col(ENVY.bright) }, uDk: { value: col(ENVY.dark) } },
    uniformDecl: 'uniform float uTh0, uDir, uRk, uWave, uLo, uHi; uniform vec3 uScale, uDk; varying float vU;',
    posHook: /* glsl */`
      {
        float u = aK > 0.5 ? uHi : aU;
        vec3 c = vec3(sin(uTh0 + uDir*u*6.9115 + sin(u*14.0 - uTime*uWave)*0.05)*mix(0.75,0.95,u)*uRk, mix(-1.6,0.9,u), cos(uTh0 + uDir*u*6.9115 + sin(u*14.0 - uTime*uWave)*0.05)*mix(0.75,0.95,u)*uRk - 0.05);
        float u2 = u + 0.004;
        vec3 c2 = vec3(sin(uTh0 + uDir*u2*6.9115 + sin(u2*14.0 - uTime*uWave)*0.05)*mix(0.75,0.95,u2)*uRk, mix(-1.6,0.9,u2), cos(uTh0 + uDir*u2*6.9115 + sin(u2*14.0 - uTime*uWave)*0.05)*mix(0.75,0.95,u2)*uRk - 0.05);
        vec3 T = normalize(c2 - c);
        vec3 N1 = normalize(cross(T, vec3(0.0, 1.0, 0.0)));
        vec3 N2 = cross(N1, T);
        if (aK > 0.5) {
          // 蛇头：沿 T 拉长 1.7 倍、略扁，向前探出半个头
          p = c + T*(position.x*0.09*1.7 + 0.06) + N1*position.y*0.09 + N2*position.z*0.09*0.75;
          vis *= step(0.02, uHi - uLo);
        } else {
          float s = clamp((uHi - aU)/0.85, 0.0, 1.0);
          float rad = mix(0.05, 0.015, s)*(0.92 + 0.16*h1(aSeed*3.1));
          p = c + (N1*cos(aA) + N2*sin(aA))*rad;
          vis *= step(uLo, aU)*step(aU, uHi)*smoothstep(0.0, 0.02, uHi - aU + 0.004);
        }
        vU = aK > 0.5 ? 1.0 : clamp(1.0 - (uHi - aU)/0.9, 0.0, 1.0);
      }`,
    colHook: /* glsl */`
      {
        col = mix(uDk*1.6, uColA, smoothstep(0.0, 0.7, vU));
        if (aK > 0.5) { col = mix(uColA, uDk*2.0, 0.35); b *= 0.55; }
        float sp = pow(max(0.0, sin(uTime*qf(300.0 + floor(aSeed*200.0)) + aSeed*90.0)), 24.0);
        col += uScale*sp*1.6;
        b *= 1.0 + sp*1.5;
      }`,
  });
}

// ============================================================ 荆棘光环：半径 1.35、只画约 70% 圆周（3 处不规则缺口），每 12° 一根向外的刺
export function buildThorns(seed = 71) {
  const R = rng(seed), pb = new PB();
  const gaps = [[0.08, 0.2], [0.41, 0.49], [0.7, 0.8]]; // 圆周比例（共约 30%）
  const inGap = f => gaps.some(([a, b]) => f > a && f < b);
  const R0 = 1.35;
  let n = 0;
  while (n < 4200) {
    const f = R(); if (inGap(f)) continue;
    const a = f * TAU;
    // 两股缠绕的细枝
    const strand = R() < 0.5 ? 0 : Math.PI, tw = a * 9 + strand;
    const rr = R0 + Math.cos(tw) * 0.022 + (R() - 0.5) * 0.012, zz = Math.sin(tw) * 0.022 + (R() - 0.5) * 0.012;
    // 缺口两端变细
    const dEdge = Math.min(...gaps.map(([g0, g1]) => Math.min(Math.abs(f - g0), Math.abs(f - g1))));
    if (dEdge < 0.02 && R() > dEdge / 0.02) continue;
    pb.add([Math.cos(a) * rr, Math.sin(a) * rr, zz], [0, 0, 0], R(), [0, 0, 0], [f, 0, 0, 1], [R() < 0.3 ? 0.6 : 1.0, R() < 0.3 ? 2 : 0]); n++;
  }
  for (let k = 0; k < 30; k++) {
    const f = k / 30 + (R() - 0.5) * 0.008; if (inGap(f)) continue;
    const a = f * TAU, L = 0.08 + 0.08 * R(), tilt = (R() - 0.5) * 0.5;
    for (let i = 0; i < 110; i++) {
      const h = Math.pow(R(), 0.7), r0 = 0.028 * (1 - h);
      const th = R() * TAU;
      const out = [Math.cos(a + tilt * h * 0.3), Math.sin(a + tilt * h * 0.3)];
      const rr = R0 + 0.01 + h * L;
      const side = [-Math.sin(a), Math.cos(a)];
      pb.add([out[0] * rr + side[0] * Math.cos(th) * r0, out[1] * rr + side[1] * Math.cos(th) * r0, Math.sin(th) * r0], [0, 0, 0], R(), [0, 0, 0], [f, 0, 0, 1], [h > 0.7 ? 2.4 : 1.3, h > 0.7 ? 1 : 0]);
    }
  }
  return pb;
}
export function thornMaterial() {
  return cloudMaterial({
    size: 0.028, bright: 1.2, depthRef: 4, maxPx: 12, colA: ENVY.main, colB: ENVY.main,
    uniforms: { uTip: { value: col(ENVY.bright) }, uDk: { value: col(ENVY.dark) } },
    uniformDecl: 'uniform vec3 uTip, uDk;',
    colHook: 'if (aMisc.y == 1.0) col = uTip; else if (aMisc.y == 2.0) col = uDk*2.2;',
  });
}

// ============================================================ 缠着藤蔓的心
// 心形：x = 16 sin³s，y = 13 cos s − 5 cos 2s − 2 cos 3s − cos 4s，缩放 0.012，带厚度；三条藤蔓螺旋缠绕（带小叶子）
export function buildHeart(seed = 81) {
  const R = rng(seed), heart = new PB(), vines = new PB();
  const hx = s => 16 * Math.pow(Math.sin(s), 3), hy = s => 13 * Math.cos(s) - 5 * Math.cos(2 * s) - 2 * Math.cos(3 * s) - Math.cos(4 * s);
  const S = 0.012;
  for (let i = 0; i < 4000; i++) {
    const s = R() * TAU, k = Math.sqrt(R());
    const edge = k > 0.93;
    const x = hx(s) * S * k, y = (hy(s) + 2) * S * k;
    const z = (R() - 0.5) * 2 * 0.06 * Math.sqrt(Math.max(0, 1 - k * k)) + (R() - 0.5) * 0.01;
    heart.add([x, y, z], [0, 0, 1], R(), [0, 0, 0], [0, 0, 0, 1], [edge ? 1.5 : 0.9, 0]);
  }
  // 藤蔓：绕心的竖直轴螺旋，半径跟着心形在这一高度的宽度
  const widthAt = y => { let w = 0; for (let s = 0; s < Math.PI; s += 0.02) { const yy = (hy(s) + 2) * S; if (Math.abs(yy - y) < 0.012) w = Math.max(w, Math.abs(hx(s) * S)); } return Math.max(0.04, w); };
  const yTop = (hy(0) + 2) * S, yBot = (hy(Math.PI) + 2) * S;
  for (let v = 0; v < 3; v++) {
    for (let i = 0; i < 1100; i++) {
      const f = i / 1100, y = lerp(yBot + 0.02, yTop + 0.01, f);
      const ph = f * 3.2 * TAU + v * TAU / 3;
      const w = widthAt(y) * 1.05 + 0.012;
      const p = [Math.cos(ph) * w, y, Math.sin(ph) * 0.085];
      vines.add([p[0] + (R() - 0.5) * 0.008, p[1] + (R() - 0.5) * 0.008, p[2] + (R() - 0.5) * 0.008], [0, 0, 0], R(), [0, 0, 0], [0, 0, 0, 1], [1, 0]);
      if (i % 90 === 45) { // 小叶子
        const la = ph + 1.2, L = 0.045;
        for (let j = 0; j < 60; j++) {
          const q = R(), wid = Math.sin(q * Math.PI) * 0.012 * (R() * 2 - 1);
          vines.add([p[0] + Math.cos(la) * q * L * 0.6 - Math.sin(la) * wid, p[1] + q * L * 0.5 + wid, p[2] + Math.sin(la) * q * L * 0.3], [0, 0, 0], R(), [0, 0, 0], [0, 0, 0, 1], [1.25, 1]);
        }
      }
    }
  }
  return { heart, vines };
}

// ============================================================ 「别人」：暖金色的站立人形（SDF 组合 → 表面采样），约 12000 个点，脚在原点、高约 1.8
function sdCapsule(p, a, b, r) {
  const pa = [p[0] - a[0], p[1] - a[1], p[2] - a[2]], ba = [b[0] - a[0], b[1] - a[1], b[2] - a[2]];
  const h = clamp((pa[0] * ba[0] + pa[1] * ba[1] + pa[2] * ba[2]) / (ba[0] * ba[0] + ba[1] * ba[1] + ba[2] * ba[2]));
  return Math.hypot(pa[0] - ba[0] * h, pa[1] - ba[1] * h, pa[2] - ba[2] * h) - r;
}
const smin = (a, b, k) => { const h = clamp(0.5 + 0.5 * (b - a) / k); return lerp(b, a, h) - k * h * (1 - h); };
export function humanSDF(pose = {}) {
  const arm = pose.arm ?? 0.18; // 手臂外张
  return p => {
    let d = Math.hypot(p[0], (p[1] - 1.62) / 1.12, p[2]) - 0.11;                                    // 头
    d = smin(d, sdCapsule(p, [0, 1.42, 0], [0, 1.5, 0], 0.05), 0.04);                               // 脖子
    d = smin(d, sdCapsule(p, [0, 1.0, 0], [0, 1.33, 0], 0.16) , 0.08);                               // 躯干
    d = smin(d, sdCapsule(p, [-0.14, 1.33, 0], [0.14, 1.33, 0], 0.07), 0.08);                       // 肩
    for (const s of [-1, 1]) {
      d = smin(d, sdCapsule(p, [0.19 * s, 1.33, 0], [(0.24 + arm * 0.5) * s, 1.05, 0.02], 0.045), 0.03);
      d = smin(d, sdCapsule(p, [(0.24 + arm * 0.5) * s, 1.05, 0.02], [(0.26 + arm) * s, 0.8, 0.06], 0.038), 0.02);
      d = smin(d, sdCapsule(p, [0.09 * s, 0.92, 0], [0.1 * s, 0.48, 0.01], 0.07), 0.04);
      d = smin(d, sdCapsule(p, [0.1 * s, 0.48, 0.01], [0.1 * s, 0.06, 0], 0.052), 0.02);
      d = smin(d, sdCapsule(p, [0.1 * s, 0.04, 0], [0.1 * s, 0.03, 0.1], 0.04), 0.02);
    }
    return d;
  };
}
export function sampleSDF(sdf, n, box, seed, misc = [1, 0]) {
  const R = rng(seed), pb = new PB();
  const grad = p => { const e = 0.002; const d0 = sdf(p); return [(sdf([p[0] + e, p[1], p[2]]) - d0) / e, (sdf([p[0], p[1] + e, p[2]]) - d0) / e, (sdf([p[0], p[1], p[2] + e]) - d0) / e]; };
  let guard = 0;
  while (pb.count < n && guard++ < n * 60) {
    let p = [lerp(box[0][0], box[1][0], R()), lerp(box[0][1], box[1][1], R()), lerp(box[0][2], box[1][2], R())];
    if (Math.abs(sdf(p)) > 0.12) continue;
    for (let it = 0; it < 6; it++) { const d = sdf(p), g = grad(p), gl = Math.hypot(...g) || 1; p = [p[0] - g[0] / gl * d, p[1] - g[1] / gl * d, p[2] - g[2] / gl * d]; }
    if (Math.abs(sdf(p)) > 0.004) continue;
    const g = grad(p), gl = Math.hypot(...g) || 1;
    pb.add(p, [g[0] / gl, g[1] / gl, g[2] / gl], R(), [0, 0, 0], [R(), 0, 0, 1], misc);
  }
  return pb;
}
export function buildOther(seed = 91, n = 12000, pose) {
  return sampleSDF(humanSDF(pose), n, [[-0.55, 0, -0.25], [0.55, 1.8, 0.25]], seed);
}
