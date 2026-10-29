// 星图：真实恒星（亮核 + 光晕 + 四芒星芒，大小由星等决定）和发光连线（密集粒子，生长端带亮点）。
// 坐标在叠加层像素空间（原点为画面中心，y 向上）。
import * as THREE from 'three';
import { particleMaterial, PB, makePoints, PAL } from './particles.js';
import { rng, clamp } from './util.js';

export const scr = (x, y) => [x - 540, 960 - y]; // 画面像素 → 叠加层坐标

function starMaterial(half, spike) {
  return new THREE.ShaderMaterial({
    uniforms: { uInt: { value: 0 }, uGrow: { value: 0 }, uCol: { value: PAL.primary.clone() }, uHi: { value: PAL.highlight.clone() },
      uAlt: { value: PAL.secondary.clone() }, uFire: { value: 0 }, uRot: { value: 0 }, uHalf: { value: half }, uSpike: { value: spike } },
    transparent: true, depthWrite: false, depthTest: false, blending: THREE.AdditiveBlending,
    vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.0); }`,
    fragmentShader: /* glsl */`
      uniform float uInt, uGrow, uFire, uRot, uHalf, uSpike; uniform vec3 uCol, uHi, uAlt; varying vec2 vUv;
      void main(){
        // 像素单位：亮核 + 光晕 + 四芒星芒（长度由星等决定），uGrow 从一个点膨胀出来
        vec2 pp = (vUv*2.0 - 1.0)*uHalf/max(uGrow, 0.03);
        float r2 = dot(pp, pp);
        float core = exp(-r2/(2.0*3.5*3.5))*2.4 + exp(-r2/(2.0*9.0*9.0))*0.55;
        float halo = exp(-r2/(2.0*22.0*22.0))*0.17;
        float cs = cos(uRot), sn = sin(uRot); vec2 q = mat2(cs, sn, -sn, cs)*pp;
        float spk = exp(-abs(q.y)/1.1)*exp(-abs(q.x)/uSpike) + exp(-abs(q.x)/1.1)*exp(-abs(q.y)/uSpike);
        vec2 d = mat2(0.7071, -0.7071, 0.7071, 0.7071)*q;
        spk += (exp(-abs(d.y)/0.9)*exp(-abs(d.x)/(uSpike*0.35)) + exp(-abs(d.x)/0.9)*exp(-abs(d.y)/(uSpike*0.35)))*0.5;
        vec3 halCol = mix(uCol, uAlt, 0.4);
        vec3 c = uHi*core + mix(uHi, halCol, 0.5)*spk*0.85 + halCol*halo;
        c = mix(c, uCol*(core*0.5 + spk*1.2 + halo*2.0) + uHi*core*0.7, uFire*0.7);
        vec2 e = abs(vUv*2.0 - 1.0);
        c *= smoothstep(1.0, 0.7, max(e.x, e.y));
        gl_FragColor = vec4(c*uInt, 1.0);
      }`,
  });
}

const LINE_POS = /* glsl */`
  {
    int si = int(aTone.y + 0.5);
    float pr = uSegP[si];
    float u = aTone.z;
    float on = step(u, pr)*step(0.0001, pr);
    // 生长端：一个亮点
    float tip = exp(-pow((pr - u)*aTone.w/9.0, 2.0))*on*step(pr, 0.999);
    float halo = nrm.x;
    vis *= on;
    // 颤动：快爆发时的抖动（像素）
    p.xy += (h3(seed*3.1 + floor(uTime*30.0)*0.37).xy - 0.5)*uShake*(0.5 + halo);
    p.xy += (h3(seed*8.7).xy - 0.5)*halo*uFire*10.0;
    float fl = 0.75 + 0.25*sin(uTime*LW*floor(60.0 + seed*80.0) + seed*30.0);
    col = mix(mix(uColHi, uColAlt, 0.35 + halo*0.4), uColMain, uFire*(0.5 + halo*0.4));
    col = mix(col, uColHi, tip);
    b *= uLineB*fl*(1.0 + tip*3.0)*(1.0 + uFire*(1.2 + halo*1.5)) + uFlashSeg[si]*1.5;
    sizeK = (1.0 + halo*1.4)*(1.0 + tip*1.6)*(1.0 + uFire*0.9);
  }`;

export function buildStarmap(overlay, sm, Q) {
  const rand = rng(777);
  const group = new THREE.Group(); overlay.add(group);
  // 连线
  const pb = new PB();
  sm.lines.forEach(([a, b], si) => {
    const A = scr(sm.stars[a].x, sm.stars[a].y), B = scr(sm.stars[b].x, sm.stars[b].y);
    const L = Math.hypot(B[0] - A[0], B[1] - A[1]);
    const n = Math.round(L / 1.1 * Math.sqrt(Q));
    for (let k = 0; k <= n; k++) {
      const u = k / n, x = A[0] + (B[0] - A[0]) * u, y = A[1] + (B[1] - A[1]) * u;
      pb.add([x + (rand() - 0.5) * 1.2, y + (rand() - 0.5) * 1.2, 0], [0, 0, 0], rand(), 0, [1.0, si, u, L]);
      if (rand() < 0.5 * Q) pb.add([x + (rand() - 0.5) * 6, y + (rand() - 0.5) * 6, 0], [1, 0, 0], rand(), 0, [0.3, si, u, L]);
    }
  });
  const lineMat = particleMaterial({
    size: 2.4 * 10 / 300, maxPx: 24, flicker: 0.2, drift: 0.4,
    uniformDecl: 'uniform float uSegP[32]; uniform float uFlashSeg[32]; uniform float uLineB, uShake, uFire;',
    uniforms: { uSegP: { value: new Array(32).fill(0) }, uFlashSeg: { value: new Array(32).fill(0) }, uLineB: { value: 1 }, uShake: { value: 0 }, uFire: { value: 0 } },
    posHook: LINE_POS,
  });
  const lines = makePoints(pb, lineMat, group, 30);
  // 恒星
  const stars = sm.stars.map((s, i) => {
    const spike = clamp(70 - (s.mag - 1.3) * 14, 26, 75), half = spike * 4.2;
    const m = new THREE.Mesh(new THREE.PlaneGeometry(half * 2, half * 2), starMaterial(half, spike));
    const [x, y] = scr(s.x, s.y);
    m.position.set(x, y, 1); m.frustumCulled = false; m.renderOrder = 35;
    m.userData = { mag: s.mag, base: clamp(1.15 - (s.mag - 1.3) * 0.16, 0.5, 1.2), x, y };
    group.add(m);
    return m;
  });
  return { group, lines, lineMat, stars };
}
