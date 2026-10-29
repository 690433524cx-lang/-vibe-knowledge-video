// 统一的粒子材质：所有粒子物体复用它，只改 uniform（个别系统再插入一小段运动钩子）。
// 属性：seed（0–1 随机）、nrm（法线或朝外方向）、aDelay（汇聚先后 0–1）、aTone（x 亮度系数，y 种类，z/w 由钩子自定）
import * as THREE from 'three';
import { COMMON } from './glsl.js';

export const PAL = {}; // 当前星座的五色（线性空间 THREE.Color），由 main 初始化

export function particleMaterial(o = {}) {
  const u = {
    uTime: { value: 0 }, uSize: { value: o.size ?? 0.03 }, uBright: { value: o.bright ?? 1 }, uOpacity: { value: 1 },
    uScatter: { value: 0 }, uStagger: { value: 0 }, uSwirl: { value: 0 }, uScatDist: { value: o.scatDist ?? 1 },
    uSwirlAxis: { value: new THREE.Vector3(0, 1, 0) }, uSwirlC: { value: new THREE.Vector3() },
    uColMain: { value: (o.main ?? PAL.primary).clone() }, uColHi: { value: (o.hi ?? PAL.highlight).clone() },
    uColAlt: { value: PAL.secondary.clone() }, uColDark: { value: PAL.dark.clone() },
    uFacing: { value: o.facing ?? 0 }, uLight: { value: o.light ?? 0 }, uFlicker: { value: o.flicker ?? 1 },
    uPx: { value: 1 }, uMaxPx: { value: o.maxPx ?? 40 }, uMinPx: { value: o.minPx ?? 1.3 }, uDrift: { value: o.drift ?? 0.004 },
    uHot: { value: 0 },
    ...(o.uniforms || {}),
  };
  const mat = new THREE.ShaderMaterial({
    uniforms: u, transparent: true, depthWrite: false, depthTest: false, blending: THREE.AdditiveBlending,
    vertexShader: /* glsl */`
      attribute vec3 nrm; attribute float seed; attribute float aDelay; attribute vec4 aTone;
      ${o.attrDecl || ''}
      uniform float uTime, uSize, uBright, uOpacity, uScatter, uStagger, uSwirl, uScatDist;
      uniform vec3 uSwirlAxis, uSwirlC, uColMain, uColHi, uColAlt, uColDark;
      uniform float uFacing, uLight, uFlicker, uPx, uMaxPx, uMinPx, uDrift, uHot;
      ${o.uniformDecl || ''}
      varying vec3 vCol; varying float vA; varying float vShape;
      ${COMMON}
      ${o.funcs || ''}
      void main(){
        vec3 p = position;
        // 呼吸漂移：0.004 × 三维 sin/cos，频率由 seed 决定
        float kf = 8.0 + floor(seed*14.0);
        p += uDrift*vec3(sin(uTime*LW*kf + seed*20.0), cos(uTime*LW*(kf+2.0) + seed*31.0), sin(uTime*LW*(kf+5.0) + seed*47.0));
        vec3 N = nrm; float b = aTone.x; float vis = 1.0; vec3 col = vec3(-1.0); float sizeK = 1.0; float shape = 0.0;
        ${o.posHook || ''}
        // 溶散 / 汇聚：q 为 0 成形，1 完全散开；aDelay 决定先后（uStagger 为错开比例）
        float q = 0.0;
        if (uScatter > 0.0001) {
          q = clamp((uScatter*0.5 - (1.0 - aDelay)*uStagger)/(1.0 - uStagger), 0.0, 1.0);
          vec3 dir = normalize(N + (h3(seed*13.7) - 0.5)*1.2 + vec3(0.0, 0.0, 1e-4));
          p += 2.0*q*dir*(1.5 + seed*2.0)*uScatDist;   // uStagger = 0 时 2q 就是 uScatter
          // 漩涡：散开时绕轴旋转 uSwirl × (1 − seed × 0.5) 弧度
          float ang = uSwirl*(1.0 - seed*0.5)*smoothstep(0.0, 0.5, q);
          p = uSwirlC + rotAxis(p - uSwirlC, uSwirlAxis, ang);
        }
        ${o.worldHook || ''}
        vec4 mv = modelViewMatrix*vec4(p, 1.0);
        gl_Position = projectionMatrix*mv;
        float dist = max(0.1, -mv.z);
        float facing = 1.0; vec3 nv = vec3(0.0, 0.0, 1.0);
        if (dot(N, N) > 0.01) { nv = normalize(normalMatrix*N); facing = dot(nv, normalize(-mv.xyz)); }
        // 颜色：朝向镜头偏高光色，侧面和背面偏主色
        if (col.x < 0.0) col = mix(uColMain, uColHi, smoothstep(0.2, 0.95, facing));
        // 闪烁：亮度 × (0.6 + 0.4 × sin(t × (2 + seed × 3) + seed × 40))，频率取全片周期的整数倍
        b *= mix(1.0, 0.6 + 0.4*sin(uTime*LW*floor(8.0 + seed*12.0) + seed*40.0), uFlicker);
        float form = 1.0 - smoothstep(0.0, 0.6, q);
        if (uFacing > 0.0) b *= mix(1.0, mix(0.05, 1.0, smoothstep(-0.25, 0.45, facing)), uFacing*form);
        ${o.colHook || ''}
        col = mix(col, uColHi, uHot);
        b *= uBright*(1.0 + q*0.6);
        float px = uSize*(0.6 + seed*0.8)*300.0/dist*uPx*sizeK;
        if (px < uMinPx) { b *= px/uMinPx; px = uMinPx; }
        px = min(px, uMaxPx*uPx);
        gl_PointSize = px;
        vCol = col*b; vA = uOpacity*vis; vShape = shape;
        if (vis <= 0.0 || b <= 0.0) gl_Position = vec4(0.0, 0.0, -2.0, 1.0);
      }`,
    fragmentShader: /* glsl */`
      varying vec3 vCol; varying float vA; varying float vShape;
      ${o.fragFuncs || ''}
      void main(){
        vec2 c = gl_PointCoord - 0.5;
        float d = length(c);
        // 柔和圆点：a = smoothstep(0.5, 0, d)，再平方
        float a = smoothstep(0.5, 0.0, d); a *= a;
        ${o.fragHook || ''}
        if (a < 0.002) discard;
        gl_FragColor = vec4(vCol*a*vA, 1.0);
      }`,
  });
  mat.userData.particle = true;
  return mat;
}

// 点云缓冲：按统一属性收集点，然后生成 BufferGeometry
export class PB {
  constructor() { this.p = []; this.n = []; this.s = []; this.d = []; this.t = []; this.extra = {}; }
  get count() { return this.s.length; }
  add(p, n, seed, delay = 0, tone = [1, 0, 0, 0]) {
    this.p.push(p[0], p[1], p[2]); this.n.push(n[0], n[1], n[2]); this.s.push(seed); this.d.push(delay); this.t.push(tone[0], tone[1], tone[2], tone[3]);
    return this.s.length - 1;
  }
  attr(name, size, values) { (this.extra[name] ||= { size, v: [] }).v.push(...values); }
  geometry() {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(this.p, 3));
    g.setAttribute('nrm', new THREE.Float32BufferAttribute(this.n, 3));
    g.setAttribute('seed', new THREE.Float32BufferAttribute(this.s, 1));
    g.setAttribute('aDelay', new THREE.Float32BufferAttribute(this.d, 1));
    g.setAttribute('aTone', new THREE.Float32BufferAttribute(this.t, 4));
    for (const [k, e] of Object.entries(this.extra)) g.setAttribute(k, new THREE.Float32BufferAttribute(e.v, e.size));
    return g;
  }
}

export function makePoints(pb, mat, parent, order = 0) {
  const pts = new THREE.Points(pb.geometry(), mat);
  pts.frustumCulled = false; pts.renderOrder = order;
  parent.add(pts);
  return pts;
}
