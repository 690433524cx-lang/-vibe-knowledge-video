// 特效：元素粒子（火/土/风/水）、冲击波、火焰旋涡、火花爆发、文字溶散成粒子
// 运动全部是 t 的纯函数：循环粒子的周期取 25/n 秒（n 为整数），首尾帧一致；拖尾 = 同一粒子在稍早时刻的位置。
import * as THREE from 'three';
import { particleMaterial, PB, makePoints, PAL } from './particles.js';
import { rng, clamp } from './util.js';

// ------------------------------------------------------------ 火：火星和火舌（叠加层像素空间，从画面底部往上窜）
const FIRE_SCREEN = /* glsl */`
  {
    float n = aTone.z, L = 25.0/n, j = aTone.y, tongue = aTone.w;
    float dtT = mix(0.008, 0.02, tongue);
    float tt = uTime - j*dtT;
    float c = tt/L + seed, cyc = floor(c), a = fract(c);
    vis *= step(abs(cyc - floor(uTime/L + seed)), 0.5);   // 拖尾不跨越到上一轮
    float age = a*L, cid = mod(cyc, n);
    vec3 r = h3(seed*31.7 + cid*7.13);
    vec3 emit = vec3((r.x - 0.5)*1200.0, -1010.0 + r.y*mix(260.0, 90.0, tongue), (r.z - 0.5)*300.0);
    float vy = mix(mix(240.0, 640.0, h1(seed*3.1 + cid)), mix(120.0, 260.0, h1(seed*5.7 + cid)), tongue);
    p = emit + vec3(0.0, vy*age + mix(160.0, 60.0, tongue)*age*age, 0.0);
    p += curlN(emit*0.0035 + vec3(0.0, 0.0, seed*5.0), tt)*age*mix(420.0, 160.0, tongue);
    float life = a;
    col = life < 0.2 ? mix(uColHi, uColAlt, life/0.2) : life < 0.55 ? mix(uColAlt, uColMain, (life - 0.2)/0.35) : mix(uColMain, uColDark*1.6, (life - 0.55)/0.45);
    b *= (1.0 - smoothstep(0.65, 1.0, life))*smoothstep(0.0, 0.04, life)*(1.0 - j*0.18)*uAmt*(1.0 + tongue*0.6);
    sizeK = mix(1.6, 0.5, life)*(1.0 - j*0.1)*(1.0 + tongue*1.4);
  }`;
// 火：从神兽身上（鬃毛末端、头顶、肩背）脱离、向上飘走的火星（神兽局部坐标）
const FIRE_BODY = /* glsl */`
  {
    float n = aTone.z, L = 25.0/n, j = aTone.y;
    float tt = uTime - j*0.03;
    float c = tt/L + seed, cyc = floor(c), a = fract(c);
    vis *= step(abs(cyc - floor(uTime/L + seed)), 0.5);
    float age = a*L, cid = mod(cyc, n);
    vec3 r = h3(seed*17.9 + cid*3.71) - 0.5;
    vec3 emit = uHeadC + (position - uHeadC)*uExpand + r*0.25;
    p = emit + nrm*age*0.5 + vec3(0.0, age*(0.9 + 1.2*h1(seed*2.3 + cid)) + age*age*0.9, 0.0);
    p += curlN(emit*0.9 + vec3(seed*3.0), tt)*age*2.2;
    float life = a;
    col = life < 0.25 ? mix(uColHi, uColAlt, life/0.25) : mix(uColAlt, uColMain, clamp((life - 0.25)/0.5, 0.0, 1.0));
    b *= (1.0 - smoothstep(0.55, 1.0, life))*smoothstep(0.0, 0.05, life)*(1.0 - j*0.25)*uAmt;
    sizeK = mix(1.6, 0.4, life)*(1.0 - j*0.15);
  }`;

// ------------------------------------------------------------ 土：缓慢飘浮、旋转的宝石碎屑，周期性反光一闪
const EARTH_POS = /* glsl */`
  {
    float R = 3.0 + aTone.z*6.0, k = 1.0 + floor(seed*2.0);
    float ang = aTone.w*6.2831853 + uTime*LW*k*(seed > 0.5 ? 1.0 : -1.0);
    float y = (h1(seed*4.1) - 0.45)*11.0 + sin(uTime*LW*3.0 + seed*20.0)*0.4;
    p = vec3(cos(ang)*R, y, sin(ang)*R - 1.0);
    float glint = pow(max(0.0, sin(uTime*LW*floor(4.0 + seed*8.0) + seed*30.0)), 24.0);
    col = mix(uColMain, uColAlt, step(0.6, h1(seed*8.8)));
    col = mix(col, uColHi, glint);
    b *= (0.5 + glint*4.0)*uAmt;
    sizeK = 1.0 + glint*0.8;
    shape = uTime*LW*floor(2.0 + seed*6.0) + seed*9.0;
  }`;
const EARTH_FRAG = /* glsl */`
  { float cs = cos(vShape), sn = sin(vShape); vec2 q = mat2(cs, sn, -sn, cs)*c;
    float dm = abs(q.x)*1.7 + abs(q.y);
    a = smoothstep(0.5, 0.3, dm) + exp(-abs(q.x)*60.0)*exp(-abs(q.y)*5.0)*0.6; a = clamp(a, 0.0, 1.5); }`;

// ------------------------------------------------------------ 风：沿螺旋路径流动的光带（拖尾粒子）
const AIR_POS = /* glsl */`
  {
    float band = aTone.w, j = aTone.y;
    float R = 4.0 + h1(band*3.1)*3.5, pitch = 0.25 + h1(band*5.7)*0.35, y0 = (h1(band*7.3) - 0.5)*6.0;
    float speed = 0.35 + h1(band*9.1)*0.3;
    float s = aTone.z*6.2831853 + uTime*LW*floor(2.0 + h1(band*2.2)*3.0) - j*0.025*(1.0 + speed);
    float tilt = (h1(band*4.4) - 0.5)*0.8;
    vec3 q = vec3(cos(s)*R, y0 + sin(s*2.0 + band)*pitch*2.0, sin(s)*R);
    q.yz = mat2(cos(tilt), sin(tilt), -sin(tilt), cos(tilt))*q.yz;
    p = q + vec3(0.0, 0.0, -1.0);
    col = mix(uColMain, uColHi, clamp(1.0 - j*0.15, 0.0, 1.0)*0.6);
    col = mix(col, uColAlt, step(0.7, h1(band*1.9))*0.6);
    b *= (1.0 - j/7.0)*uAmt*(0.6 + 0.4*sin(s*3.0 + band));
    sizeK = 1.0 - j*0.08;
  }`;

// ------------------------------------------------------------ 水：缓缓上浮的磷光气泡、波纹光圈
const WATER_POS = /* glsl */`
  {
    float kind = aTone.y;
    if (kind < 0.5) {
      float n = 2.0 + floor(seed*4.0), L = 25.0/n;
      float a = fract(uTime/L + aTone.z);
      float cyc = mod(floor(uTime/L + aTone.z), n);
      vec3 r = h3(seed*11.0 + cyc*3.3);
      p = vec3((r.x - 0.5)*14.0 + sin(uTime*LW*4.0 + seed*20.0)*0.25, -6.5 + a*13.0, (r.z - 0.5)*10.0 - 1.0);
      col = mix(uColMain, uColHi, 0.35 + 0.3*r.y);
      b *= smoothstep(0.0, 0.1, a)*smoothstep(1.0, 0.85, a)*uAmt;
      sizeK = 1.0 + r.y*1.5; shape = 1.0;
    } else {
      float n = 6.0, L = 25.0/n, ring = aTone.w;
      float a = fract(uTime/L + ring/8.0);
      float R = a*7.0;
      vec2 c0 = (h3(ring*3.7).xy - 0.5)*6.0;
      p = vec3(c0.x + cos(aTone.z*6.2831853)*R, -3.4, c0.y + sin(aTone.z*6.2831853)*R*0.6 - 1.0);
      col = mix(uColAlt, uColMain, a);
      b *= (1.0 - a)*smoothstep(0.0, 0.08, a)*uAmt*0.8;
      shape = 0.0;
    }
  }`;
const WATER_FRAG = `{ if (vShape > 0.5) { a = exp(-pow((d - 0.36)*16.0, 2.0)) + exp(-d*d*60.0)*0.3; } }`;

export function buildElementFX(element, scene, overlay, Q) {
  const rand = rng(31337);
  const out = { list: [] };
  if (element === 'fire') {
    const pb = new PB(); const N = Math.round(1100 * Q);
    for (let i = 0; i < N; i++) {
      const seed = rand(), tongue = rand() < 0.1 ? 1 : 0, n = tongue ? 30 + Math.floor(rand() * 12) : 18 + Math.floor(rand() * 24);
      for (let j = 0; j < 4; j++) pb.add([0, 0, 0], [0, 0, 0], seed, 0, [0.85 + rand() * 0.4, j, n, tongue]);
    }
    const mat = particleMaterial({ size: 3.2 * 10 / 300, maxPx: 40, drift: 0, flicker: 0.4, uniformDecl: 'uniform float uAmt;', uniforms: { uAmt: { value: 1 } }, posHook: FIRE_SCREEN });
    out.screen = makePoints(pb, mat, overlay, 5); out.list.push(out.screen);
  } else if (element === 'earth') {
    const pb = new PB(); const N = Math.round(700 * Q);
    for (let i = 0; i < N; i++) pb.add([0, 0, 0], [0, 0, 0], rand(), 0, [0.8 + rand() * 0.5, 0, rand(), rand()]);
    const mat = particleMaterial({ size: 0.16, maxPx: 22, drift: 0, uniformDecl: 'uniform float uAmt;', uniforms: { uAmt: { value: 1 } }, posHook: EARTH_POS, fragHook: EARTH_FRAG });
    out.world = makePoints(pb, mat, scene, 6); out.list.push(out.world);
  } else if (element === 'air') {
    const pb = new PB(); const B = 14, M = Math.round(110 * Q);
    for (let b = 0; b < B; b++) for (let i = 0; i < M; i++) { const s = rand(), u = i / M * 0.35 + b * 0.07; for (let j = 0; j < 7; j++) pb.add([0, 0, 0], [0, 0, 0], s, 0, [0.9, j, u, b]); }
    const mat = particleMaterial({ size: 0.09, maxPx: 16, drift: 0, flicker: 0.3, uniformDecl: 'uniform float uAmt;', uniforms: { uAmt: { value: 1 } }, posHook: AIR_POS });
    out.world = makePoints(pb, mat, scene, 6); out.list.push(out.world);
  } else if (element === 'water') {
    const pb = new PB(); const N = Math.round(800 * Q);
    for (let i = 0; i < N; i++) pb.add([0, 0, 0], [0, 0, 0], rand(), 0, [0.9, 0, rand(), 0]);
    for (let r = 0; r < 8; r++) for (let i = 0; i < Math.round(240 * Q); i++) pb.add([0, 0, 0], [0, 0, 0], rand(), 0, [0.7, 1, i / Math.round(240 * Q), r]);
    const mat = particleMaterial({ size: 0.22, maxPx: 30, drift: 0, flicker: 0.4, uniformDecl: 'uniform float uAmt;', uniforms: { uAmt: { value: 1 } }, posHook: WATER_POS, fragHook: WATER_FRAG });
    out.world = makePoints(pb, mat, scene, 6); out.list.push(out.world);
  }
  return out;
}

// 神兽身上的火星：从毛束末端和头顶附近发出
export function buildBodyFire(creature, Q) {
  if (!creature.tips.length) return null;
  const rand = rng(515);
  const pb = new PB(); const N = Math.round(1400 * Q);
  for (let i = 0; i < N; i++) {
    const tp = creature.tips[Math.floor(rand() * creature.tips.length)];
    const seed = rand(), n = 18 + Math.floor(rand() * 24);
    for (let j = 0; j < 3; j++) pb.add(tp.p, tp.dir, seed, 0, [0.9 + rand() * 0.4, j, n, 0]);
  }
  const mat = particleMaterial({
    size: 0.15, maxPx: 30, drift: 0, flicker: 0.3,
    uniformDecl: 'uniform float uAmt, uExpand; uniform vec3 uHeadC;',
    uniforms: { uAmt: { value: 1 }, uExpand: { value: 1 }, uHeadC: { value: new THREE.Vector3(...creature.headCenter) } },
    posHook: FIRE_BODY,
  });
  return makePoints(pb, mat, creature.pose, 13);
}

// ------------------------------------------------------------ 冲击波：从指定点向外扩散的一圈粒子光环（带拖尾），0.6 秒扩散到画面外
const WAVE_POS = /* glsl */`
  {
    float j = aTone.y, ang = aTone.z;
    float age = uWaveAge - j*0.016;
    vis *= step(0.0, age)*step(uWaveAge, 0.8);
    float k = clamp(age/0.6, 0.0, 1.0);
    float r = uWaveR*(1.0 - pow(1.0 - k, 3.0))*(0.93 + 0.14*h1(seed*5.1)) + 10.0;
    p = vec3(uWaveC + vec2(cos(ang), sin(ang))*r, (h1(seed*2.2) - 0.5)*60.0);
    col = mix(uColHi, uColMain, clamp(k*1.2 + j*0.15 + aTone.w*0.4, 0.0, 1.0));
    b *= (1.0 - k)*smoothstep(0.0, 0.15, k)*(1.0 - j*0.2)*uWaveStr*(1.0 + aTone.w);
    sizeK = mix(2.4, 1.0, k)*(1.0 - j*0.12)*(1.0 + aTone.w*1.5);
  }`;
export function buildShockwave(overlay, Q) {
  const rand = rng(808);
  const pb = new PB(); const N = Math.round(1800 * Q);
  for (let i = 0; i < N; i++) { const ang = rand() * Math.PI * 2, s = rand(), thick = rand() < 0.25 ? 1 : 0; for (let j = 0; j < 4; j++) pb.add([0, 0, 0], [0, 0, 0], s, 0, [1, j, ang, thick]); }
  const mat = particleMaterial({
    size: 3.2 * 10 / 300, maxPx: 40, drift: 0, flicker: 0.3,
    uniformDecl: 'uniform vec2 uWaveC; uniform float uWaveAge, uWaveStr, uWaveR;',
    uniforms: { uWaveC: { value: new THREE.Vector2() }, uWaveAge: { value: 9 }, uWaveStr: { value: 1 }, uWaveR: { value: 1400 } },
    posHook: WAVE_POS,
  });
  return makePoints(pb, mat, overlay, 60);
}

// ------------------------------------------------------------ 火焰旋涡：星图炸开成约 3 万颗火焰粒子，绕画面中心旋转，带运动拖尾
const VORTEX_POS = /* glsl */`
  {
    float j = aTone.y, tau = uVT - j*0.022;
    vis *= step(0.0, tau);
    vec2 s = p.xy - uVC; float r0 = length(s); float th0 = atan(s.y, s.x);
    float R = aTone.z;
    float ex = 1.0 - pow(2.0, -10.0*clamp(tau/0.6, 0.0, 1.0));
    float con = smoothstep(1.5, 3.4, tau + h1(seed*4.4)*0.7);
    float r = mix(mix(r0, R, ex), 180.0 + 160.0*h1(seed*6.2), con);
    th0 += (h1(seed*2.7) - 0.5)*2.4*ex + log(1.0 + R/120.0)*1.1*ex;
    float spin = (1.0 + 2.2*(1.0 - clamp(R/950.0, 0.0, 1.0)))*(1.0 + con*1.2);
    float th = th0 + spin*(tau*0.55 + 0.32*tau*tau);
    vec2 pos = uVC + vec2(cos(th), sin(th)*uVFlat)*r;
    p = vec3(pos, aTone.w*(1.0 - con) + sin(th*2.0 + seed*6.0)*90.0*ex);
    float heat = clamp(1.0 - r/800.0, 0.0, 1.0);
    col = mix(mix(uColDark*2.2, uColMain, smoothstep(0.0, 0.45, heat + seed*0.35)), uColHi, smoothstep(0.6, 1.0, heat)*0.8);
    col = mix(col, uColAlt, step(0.82, seed)*0.6);
    b *= (1.0 - j*0.15)*uVA*(1.5 + (1.0 - ex)*0.2)*(1.0 - smoothstep(0.55, 1.0, con));
    sizeK = (1.25 + (1.0 - ex)*0.8)*(1.0 - j*0.1);
  }`;
export function buildVortex(overlay, starPts, Q) {
  const rand = rng(2024);
  const pb = new PB(); const N = Math.round(30000 * Q);
  for (let i = 0; i < N; i++) {
    const sp = starPts[Math.floor(rand() * starPts.length)];
    const seed = rand(), R = 90 + Math.sqrt(rand()) * 860, z = (rand() - 0.5) * 500;
    const x = sp[0] + (rand() - 0.5) * 8, y = sp[1] + (rand() - 0.5) * 8;
    for (let j = 0; j < 5; j++) pb.add([x, y, 0], [0, 0, 0], seed, 0, [0.6 + rand() * 0.6, j, R, z]);
  }
  const mat = particleMaterial({
    size: 2.6 * 10 / 300, maxPx: 30, drift: 0, flicker: 0.5,
    uniformDecl: 'uniform float uVT, uVA, uVFlat; uniform vec2 uVC;',
    uniforms: { uVT: { value: -1 }, uVA: { value: 1 }, uVFlat: { value: 0.85 }, uVC: { value: new THREE.Vector2(0, 0) } },
    posHook: VORTEX_POS,
  });
  return makePoints(pb, mat, overlay, 50);
}

// ------------------------------------------------------------ 火花爆发（CPU 每帧按事件表算出，叠加层像素空间）
export function buildBursts(overlay, Q) {
  const N = Math.round(3000 * Q);
  const pb = new PB();
  for (let i = 0; i < N; i++) pb.add([0, -5000, 0], [0, 0, 0], (i * 0.618) % 1, 0, [0, 0, 0, 0]);
  const mat = particleMaterial({
    size: 2.8 * 10 / 300, maxPx: 30, drift: 0, flicker: 0.3,
    colHook: `col = aTone.z < 0.5 ? uColHi : (aTone.z < 1.5 ? uColMain : uColAlt); sizeK = aTone.w;`,
  });
  const pts = makePoints(pb, mat, overlay, 70);
  const pos = pts.geometry.attributes.position.array, tone = pts.geometry.attributes.aTone.array;
  // bursts: [{t0, x, y(叠加层坐标), n, speed, life, grav, seed, col, size, dir:[dx,dy], spread, bright}]
  function update(t, bursts) {
    let k = 0;
    for (const b of bursts) {
      const d = t - b.t0; if (d < 0 || d > b.life) continue;
      for (let j = 0; j < b.n && k < N; j++) {
        const s = (b.seed ?? 0) * 97.1 + j * 1.913;
        const h = v => { const x = Math.sin((s + v) * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };
        const life = b.life * (0.45 + 0.55 * h(1)); if (d > life) continue;
        let a = h(2) * Math.PI * 2, dx = Math.cos(a), dy = Math.sin(a);
        if (b.dir) { const sp = b.spread ?? 0.6; dx = b.dir[0] + dx * sp; dy = b.dir[1] + dy * sp; }
        const v = b.speed * (0.35 + 0.9 * h(3)), e = (1 - Math.exp(-4 * d)) / 4;
        pos[k * 3] = b.x + dx * v * e; pos[k * 3 + 1] = b.y + dy * v * e - (b.grav ?? 0) * d * d; pos[k * 3 + 2] = (h(4) - 0.5) * 80;
        const life01 = d / life;
        tone[k * 4] = (1 - life01) * (b.bright ?? 1.6); tone[k * 4 + 2] = b.col ?? 0; tone[k * 4 + 3] = (b.size ?? 1) * (1.3 - life01 * 0.7);
        k++;
      }
    }
    for (; k < N; k++) { pos[k * 3 + 1] = -5000; tone[k * 4] = 0; }
    pts.geometry.attributes.position.needsUpdate = true; pts.geometry.attributes.aTone.needsUpdate = true;
  }
  return { pts, update };
}

// ------------------------------------------------------------ 文字溶散成粒子（星座名大字向上飘散）
const TEXT_POS = /* glsl */`
  {
    float rise = uRise;
    float k = clamp(rise*1.3 - h1(seed*2.7)*0.3, 0.0, 1.0);
    p += vec3((h1(seed*9.1) - 0.5)*220.0*k, k*(140.0 + 420.0*h1(seed*2.9)), (h1(seed*4.2) - 0.5)*200.0*k);
    p += curlN(position*0.006, uTime)*160.0*k;
    vis *= (1.0 - smoothstep(0.35, 1.0, k))*step(0.0001, uTA);
    col = mix(uColHi, mix(uColAlt, uColMain, h1(seed*6.1)), smoothstep(0.0, 0.5, k));
    b *= uTA*(1.0 + (1.0 - k)*0.6);
  }`;
export function buildTextParticles(overlay, text, font, cx, cy, Q) {
  const c = document.createElement('canvas'); c.width = 900; c.height = 360;
  const x = c.getContext('2d'); x.font = font; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillStyle = '#fff';
  x.fillText(text, 450, 180);
  const im = x.getImageData(0, 0, 900, 360).data;
  const rand = rng(99173), pb = new PB();
  const step = Q < 1 ? 3 : 2;
  for (let yy = 0; yy < 360; yy += step) for (let xx = 0; xx < 900; xx += step) {
    if (im[(yy * 900 + xx) * 4 + 3] < 128) continue;
    pb.add([cx - 540 + (xx - 450) + (rand() - 0.5) * step, 960 - cy - (yy - 180) + (rand() - 0.5) * step, 0], [0, 0, 0], rand(), 0, [0.55, 0, 0, 0]);
  }
  const mat = particleMaterial({
    size: 2.6 * 10 / 300, maxPx: 24, drift: 0, flicker: 0.3,
    uniformDecl: 'uniform float uRise, uTA;', uniforms: { uRise: { value: 0 }, uTA: { value: 0 } },
    posHook: TEXT_POS,
  });
  return makePoints(pb, mat, overlay, 65);
}
