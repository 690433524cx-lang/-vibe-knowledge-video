// 背光与场景：曼陀罗式多层光环、放射光芒、体积光束、远景雾、巨大的暗色光晕、地面（冲击波）、仰望的小人影、扫描线、光柱
import * as THREE from 'three';
import { K, glow } from './core.js';
import { cloudMaterial, SHARED } from './mat.js';
import { PB, buildStander } from './geo.js';
import { rng, TAU, clamp, lerp, hash } from './util.js';
import { GROUND_Y, HALO_C } from './idol.js';

const C3 = h => new THREE.Color(h);

// ------------------------------------------------------------ 光环的一层（XY 平面，半径 r）
// 每层一种纹样：feather 羽毛放射线 · ticks 刻度 · dots 点阵 · zigzag 几何折线 · rings 细双线 · bigticks 超出画面的巨环
function addLine(pb, R, a, b, n, br, jit = 0.004) {
  for (let i = 0; i < n; i++) {
    const f = R();
    pb.add([lerp(a[0], b[0], f) + (R() - 0.5) * jit, lerp(a[1], b[1], f) + (R() - 0.5) * jit, (R() - 0.5) * 0.01], [0, 0, 0], R(), [0, 0, 0], [0, 0, 0, 1], [br, 30]);
  }
}
const polar = (r, a) => [Math.cos(a) * r, Math.sin(a) * r];
function addCircle(pb, R, r, n, br, w = 0.006) {
  for (let i = 0; i < n; i++) { const a = R() * TAU, rr = r + (R() - 0.5) * w; pb.add([Math.cos(a) * rr, Math.sin(a) * rr, (R() - 0.5) * 0.01], [0, 0, 0], R(), [0, 0, 0], [0, 0, 0, 1], [br, 30]); }
}
export function ringPB(type, r, seed, k = 1) {
  const R = rng(seed), pb = new PB(), N = n => Math.round(n * k);
  if (type === 'feather') {
    // 羽毛状放射线：每根一条主羽轴 + 两侧斜向外的羽枝
    const n = 40;
    for (let i = 0; i < n; i++) {
      const a = i / n * TAU, r0 = r * 0.72, r1 = r * (i % 2 ? 1.0 : 1.12);
      addLine(pb, R, polar(r0, a), polar(r1, a), N(260), 1.5, 0.003);
      for (let j = 1; j < 9; j++) {
        const s = j / 9, rr = lerp(r0, r1, s), L = 0.075 * r * Math.sin(Math.PI * s) + 0.01;
        for (const sd of [-1, 1]) {
          const p0 = polar(rr, a), d = polar(1, a + sd * 0.6);
          addLine(pb, R, p0, [p0[0] + d[0] * L, p0[1] + d[1] * L], N(26), 0.75, 0.002);
        }
      }
    }
    addCircle(pb, R, r * 0.7, N(2400), 1.2, 0.008);
  } else if (type === 'ticks') {
    addCircle(pb, R, r, N(3000), 1.3, 0.006); addCircle(pb, R, r * 1.06, N(2000), 0.8, 0.004);
    for (let i = 0; i < 120; i++) { const a = i / 120 * TAU, L = i % 10 === 0 ? 0.16 : i % 5 === 0 ? 0.1 : 0.05; addLine(pb, R, polar(r, a), polar(r - L * r, a), N(i % 5 === 0 ? 60 : 25), i % 10 === 0 ? 1.6 : 1.0, 0.002); }
  } else if (type === 'dots') {
    for (let row = 0; row < 3; row++) {
      const rr = r * (0.94 + row * 0.04), m = 72 * (row === 1 ? 2 : 1);
      for (let i = 0; i < m; i++) {
        if (row === 1 && i % 12 > 9) continue;
        const a = (i + (row === 1 ? 0 : 0.5)) / m * TAU, c = polar(rr, a), s = row === 1 ? 0.012 : 0.008;
        for (let k2 = 0; k2 < N(row === 1 ? 26 : 18); k2++) { const q = R() * TAU, d = s * Math.sqrt(R()) * r; pb.add([c[0] + Math.cos(q) * d, c[1] + Math.sin(q) * d, 0], [0, 0, 0], R(), [0, 0, 0], [0, 0, 0, 1], [1.4, 30]); }
      }
    }
  } else if (type === 'zigzag') {
    addCircle(pb, R, r * 0.95, N(3000), 0.9, 0.005); addCircle(pb, R, r * 1.05, N(3000), 0.9, 0.005);
    const m = 48;
    for (let i = 0; i < m; i++) {
      const a0 = i / m * TAU, a1 = (i + 0.5) / m * TAU, a2 = (i + 1) / m * TAU;
      addLine(pb, R, polar(r * 0.95, a0), polar(r * 1.05, a1), N(70), 1.2, 0.003);
      addLine(pb, R, polar(r * 1.05, a1), polar(r * 0.95, a2), N(70), 1.2, 0.003);
      const c = polar(r * 1.0, a1 + 0.5 / m * TAU * 0.0);
      if (i % 2 === 0) for (let k2 = 0; k2 < N(20); k2++) { const q = R() * TAU, d = 0.006 * r * Math.sqrt(R()); pb.add([c[0] * 0.985 + Math.cos(q) * d, c[1] * 0.985 + Math.sin(q) * d, 0], [0, 0, 0], R(), [0, 0, 0], [0, 0, 0, 1], [1.8, 30]); }
    }
  } else if (type === 'rings') {
    addCircle(pb, R, r, N(4500), 1.1, 0.005); addCircle(pb, R, r * 1.03, N(2500), 0.6, 0.003);
    for (let i = 0; i < 24; i++) { const a = i / 24 * TAU; addLine(pb, R, polar(r * 0.97, a), polar(r * 1.06, a), N(30), 1.5, 0.002); }
  } else if (type === 'bigticks') {
    addCircle(pb, R, r, N(9000), 0.9, 0.006); addCircle(pb, R, r * 0.97, N(5000), 0.45, 0.004);
    for (let i = 0; i < 180; i++) { const a = i / 180 * TAU, L = i % 6 === 0 ? 0.07 : 0.03; addLine(pb, R, polar(r, a), polar(r * (1 - L), a), N(i % 6 === 0 ? 70 : 30), i % 6 === 0 ? 1.3 : 0.8, 0.003); }
  }
  return pb;
}
export function ringMaterial(hex, bright = 0.6) {
  const c = C3(hex);
  return cloudMaterial({ size: 0.012, bright, depthRef: 7, maxPx: 6, drift: 0.002, colA: '#' + c.clone().lerp(C3('#FFFFFF'), 0.45).getHexString(), colB: '#' + c.getHexString(),
    uniforms: { uGray: { value: 0 } }, uniformDecl: 'uniform float uGray;',
    colHook: '{ float gl = dot(col, vec3(0.3, 0.59, 0.11)); col = mix(mix(uColB, uColA, h1(aSeed*3.1)), vec3(gl), uGray); }' });
}

// ------------------------------------------------------------ 平面光效（放射光芒 / 体积光束 / 雾 / 光晕）
const NOISE = /* glsl */`
float hh(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7)))*43758.5453); }
float noise(vec2 p){ vec2 i = floor(p), f = fract(p); f = f*f*(3.0-2.0*f);
  return mix(mix(hh(i), hh(i+vec2(1,0)), f.x), mix(hh(i+vec2(0,1)), hh(i+vec2(1,1)), f.x), f.y); }
float fbm(vec2 p){ float v = 0.0, a = 0.5; for (int i = 0; i < 5; i++){ v += a*noise(p); p = p*2.03 + 1.7; a *= 0.5; } return v; }`;
function planeMat(frag, uniforms) {
  const m = new THREE.ShaderMaterial({
    uniforms: { ...SHARED, uTime: { value: 0 }, uInt: { value: 1 }, uCol: { value: C3('#FFFFFF') }, ...uniforms },
    transparent: true, depthWrite: false, depthTest: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
    vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.0); }',
    fragmentShader: `uniform float uTime, uInt, uLoop; uniform vec3 uCol; varying vec2 vUv; ${NOISE}\n${frag}`,
  });
  K.mats.push(m); return m;
}
function plane(w, h, mat, order, parent) {
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat); m.frustumCulled = false; m.renderOrder = order; (parent || K.scene).add(m); return m;
}
// 放射光芒：从头部射向四周的细光线，缓慢旋转；uBurst 为开光时射出的长度
export function raysPlane(size) {
  return planeMat(/* glsl */`
    uniform float uRot, uBurst, uN;
    void main(){
      vec2 p = (vUv*2.0 - 1.0); float r = length(p);
      float a = atan(p.y, p.x) + uRot;
      float u = a/6.28318*uN, f = fract(u) - 0.5, id = floor(u);
      float w = hh(vec2(id, 3.1)), w2 = hh(vec2(id, 7.7));
      float ray = exp(-f*f/(0.0003 + 0.0016*w))*(0.15 + 0.85*w2*w2);
      float u2 = a/6.28318*(uN*0.37), f2 = fract(u2) - 0.5;
      float wide = exp(-f2*f2/0.01)*0.06;
      float len = mix(0.35, 1.0, w)*uBurst;
      float fall = smoothstep(0.12, 0.3, r)*smoothstep(len, len*0.25, r);
      float n = 0.6 + 0.4*fbm(vec2(r*6.0 - uTime*0.2, id));
      gl_FragColor = vec4(uCol*(ray + wide)*fall*n*uInt, 1.0);
    }`, { uRot: { value: 0 }, uBurst: { value: 1 }, uN: { value: 90 } });
}
// 体积光束（丁达尔）：从神像背后斜射出的几道宽光束，光束里有尘埃纹理
export function shaftsPlane() {
  return planeMat(/* glsl */`
    uniform vec2 uO; uniform float uAsp;
    float beam(vec2 p, float ang, float wid){ float a = atan(p.y, p.x); float d = mod(a - ang + 3.14159, 6.28318) - 3.14159; return exp(-d*d/wid); }
    void main(){
      vec2 p = (vUv - uO)*vec2(uAsp, 1.0); float r = length(p);
      float b = beam(p, 2.05, 0.004)*1.0 + beam(p, 2.45, 0.0025)*0.7 + beam(p, 1.0, 0.0035)*0.85 + beam(p, 0.62, 0.002)*0.6 + beam(p, 2.85, 0.003)*0.5 + beam(p, 0.25, 0.003)*0.45;
      float dust = 0.55 + 0.45*fbm(p*vec2(9.0, 9.0) + vec2(uTime*0.05, 0.0));
      float fall = smoothstep(0.03, 0.15, r)*exp(-r*1.3);
      gl_FragColor = vec4(uCol*b*dust*fall*uInt, 1.0);
    }`, { uO: { value: new THREE.Vector2(0.5, 0.5) }, uAsp: { value: 1 } });
}
// 远景雾：缓慢漂移的 fbm
export function fogPlane(seed) {
  return planeMat(/* glsl */`
    uniform float uSeed;
    void main(){
      vec2 p = vUv*vec2(3.0, 1.6) + uSeed;
      float ang = uTime*6.28318/uLoop;
      vec2 dr = vec2(cos(ang), sin(ang))*0.25;
      float n = fbm(p + dr + fbm(p*1.3 - dr)*0.8);
      float m = smoothstep(0.35, 0.85, n)*smoothstep(0.0, 0.25, vUv.y)*smoothstep(1.0, 0.6, vUv.y)*smoothstep(0.0, 0.15, vUv.x)*smoothstep(1.0, 0.85, vUv.x);
      gl_FragColor = vec4(uCol*m*uInt, 1.0);
    }`, { uSeed: { value: seed } });
}
export function glowPlane() {
  return planeMat(/* glsl */`
    void main(){ vec2 p = vUv*2.0 - 1.0; float r = length(p); gl_FragColor = vec4(uCol*(exp(-r*r*3.0)*0.8 + exp(-r*r*12.0)*0.4)*uInt, 1.0); }`, {});
}

// ------------------------------------------------------------ 地面：稀疏的粒子地表 + 冲击波
export function buildGround(k = 1) {
  const R = rng(901), pb = new PB();
  // 右肩外侧的一块平台，左缘参差、更亮
  let n = 0;
  while (n < Math.round(22000 * k)) {
    const x = lerp(0.9, 5.5, R()), z = lerp(-2.5, 1.2, R());
    const edge = 1.1 + 0.08 * Math.sin(z * 3.1) + 0.05 * Math.sin(z * 9.7 + 1.3);   // 平台左缘参差
    if (x < edge) continue;
    const rim = Math.exp(-(x - edge) / 0.06);
    pb.add([x, GROUND_Y + (R() - 0.5) * 0.01, z], [0, 0, 0], R(), [0, 0, 0], [0, 0, 0, 1], [0.3 + 0.5 * R() * R() + 1.2 * rim, 31]); n++;
  }
  return pb;
}
export function groundMaterial() {
  return cloudMaterial({ size: 0.016, bright: 0.5, depthRef: 6, maxPx: 5, drift: 0, colA: '#FFFFFF', colB: '#FFFFFF',
    uniforms: { uWaveR: { value: -1 }, uWaveAmt: { value: 0 }, uCol: { value: C3('#FFFFFF') }, uGlowAmt: { value: 1 } },
    uniformDecl: 'uniform float uWaveR, uWaveAmt, uGlowAmt; uniform vec3 uCol;',
    colHook: /* glsl */`
      { float rr = length(wp.xz - vec2(1.4, -0.4));
        float w = uWaveAmt*exp(-pow((rr - uWaveR)/0.18, 2.0));
        b *= (0.12 + 1.2*exp(-rr*rr/10.0)*uGlowAmt)*(1.0 + w*7.0);
        col = mix(uCol, vec3(1.0), clamp(w*0.5, 0.0, 1.0)); }` });
}
// 仰望的小人影（神像高度的约 1/15）
export function buildPeople(k = 1) {
  const pb = new PB(), spots = [[1.42, -0.45, 0.98], [1.6, -0.25, 1.04], [1.8, -0.55, 0.95], [1.7, -0.05, 1.0], [1.3, -0.15, 0.92]];
  spots.forEach(([x, z, s], i) => {
    const one = buildStander(1000 + i, Math.round(900 * k));
    for (let j = 0; j < one.count; j++) {
      const [px, py, pz] = one.pos(j), h = 0.2 * s;
      // 头微微后仰（抬头看）
      const up = Math.max(0, py - 1.45), lean = up * 0.35;
      pb.add([x + px * h / 1.75 * 1.0, GROUND_Y + py * h / 1.75, z + (pz - lean) * h / 1.75], one.nor(j), one.s[j], [0, 0, 0], [0, 0, 0, 1], [1, 32]);
    }
  });
  return pb;
}
