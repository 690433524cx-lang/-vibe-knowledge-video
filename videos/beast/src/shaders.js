// 着色器：动物粒子、通用发光点、发光面片、最终合成（背景星点 + 主色光晕 + 暗角）
import * as THREE from 'three';

export const SHARED = { uPx: { value: 300 }, uTime: { value: 0 } };
const COMMON = /* glsl */`
float h1(float n){ return fract(sin(n*127.1+311.7)*43758.5453); }
vec3 h3(float n){ return vec3(h1(n), h1(n+17.31), h1(n+41.97)); }
vec3 rotAxis(vec3 v, vec3 k, float a){ float c = cos(a), s = sin(a); return v*c + cross(k, v)*s + k*dot(k, v)*(1.0 - c); }
`;
const DOT_FRAG = /* glsl */`
varying vec3 vCol; varying float vA;
void main(){ vec2 c = gl_PointCoord - 0.5; float d = length(c)*2.0; if (d > 1.0) discard;
  float a = exp(-d*d*3.5)*0.85 + smoothstep(0.45, 0.0, d)*0.4; gl_FragColor = vec4(vCol*a*vA, 1.0); }`;
const col = h => new THREE.Color(h);

// ------------------------------------------------------------ 动物粒子
// 属性：position（最终位置）、aNrm、aComb（梳毛方向）、aMisc = (亮度, 种子, 种类 0 表面 1 毛尖 2 毛中段, 离眼睛的距离 0–1)
export function beastMaterial(o) {
  const u = {
    ...SHARED,
    uA: { value: 0 }, uLag: { value: 0 }, uGhost: { value: 0 }, uHit: { value: 2 }, uAsm0: { value: 0.5 },
    uC: { value: new THREE.Vector3() }, uAxis: { value: new THREE.Vector3(0, 0, 1) }, uCam: { value: new THREE.Vector3() },
    uKick: { value: 0 }, uWind: { value: 0 }, uWindDir: { value: new THREE.Vector3(0, 0.15, -1) },
    uKey: { value: new THREE.Vector3(0.25, 1, 0.45).normalize() },
    uCol: { value: col(o.col) }, uHi: { value: col(o.hi) }, uRim: { value: col(o.rim) },
    uBright: { value: o.bright ?? 1 }, uSize: { value: o.size ?? 0.0075 }, uMaxPx: { value: 6 }, uPulse: { value: 0 }, uFlow: { value: 0 },
    uFade: { value: 1 },
    uAct: { value: [0, 1, 2, 3].map(() => new THREE.Matrix4()) },
  };
  return new THREE.ShaderMaterial({
    uniforms: u, transparent: true, depthWrite: false, depthTest: false, blending: THREE.AdditiveBlending,
    vertexShader: /* glsl */`
      attribute vec3 aNrm; attribute vec3 aComb; attribute vec4 aMisc; attribute vec4 aChain;
      uniform mat4 uAct[4];
      uniform float uPx, uTime, uA, uLag, uGhost, uHit, uAsm0, uKick, uWind, uBright, uSize, uMaxPx, uPulse, uFlow, uFade;
      uniform vec3 uC, uAxis, uCam, uWindDir, uKey, uCol, uHi, uRim;
      varying vec3 vCol; varying float vA;
      ${COMMON}
      void main(){
        float seed = aMisc.y, kind = aMisc.z, d = aMisc.w;
        // 专属动作：骨骼链的线性蒙皮（4 根骨骼 + 不动的其余部分）
        float wr = 1.0 - (aChain.x + aChain.y + aChain.z + aChain.w);
        vec4 hp = vec4(position, 1.0);
        vec3 p = position*wr + (uAct[0]*hp).xyz*aChain.x + (uAct[1]*hp).xyz*aChain.y + (uAct[2]*hp).xyz*aChain.z + (uAct[3]*hp).xyz*aChain.w;
        vec3 n = normalize(aNrm*wr + mat3(uAct[0])*aNrm*aChain.x + mat3(uAct[1])*aNrm*aChain.y + mat3(uAct[2])*aNrm*aChain.z + mat3(uAct[3])*aNrm*aChain.w);
        // 风：毛尖吹得最远，表面只有一点点
        float furT = kind > 0.5 ? (kind > 1.5 ? 0.55 : 1.0) : 0.0;
        float ph = uTime*(5.0 + 3.0*h1(seed*4.3)) + seed*6.2832 + dot(position, vec3(4.1, 3.3, 2.7));
        p += uWindDir*uWind*(furT*0.075 + 0.004)*(0.6 + 0.4*sin(ph));
        vec3 pAnim = p;
        p += aComb*uWind*furT*0.02*sin(ph*1.7);
        // 觉醒一刻向外弹一下
        p = uC + (p - uC)*(1.0 + uKick*(0.55 + 0.9*h1(seed*7.3)));
        // 汇聚：从眼睛开始向外，四面八方的粒子沿旋涡被吸过来，越来越快
        float a = uA - uLag;
        float span = uHit - uAsm0;
        float ts = uAsm0 + (d*0.55 + h1(seed*3.1)*0.2)*span;
        float te = ts + (uHit - 0.035 - ts)*(0.72 + 0.28*h1(seed*5.7));
        float k = clamp((a - ts)/max(te - ts, 0.01), 0.0, 1.0);
        float vis = step(ts, a)*uFade;
        float moving = 0.0;
        if (k < 1.0) {
          float e = pow(k, 2.3);
          // 起点在镜头前的一个圆盘上（垂直于视线），再绕视线旋转：屏幕上是清楚的旋涡
          vec3 ax = normalize(uAxis), t1 = normalize(cross(ax, vec3(0.0, 1.0, 0.0))), t2 = cross(ax, t1);
          float ang = h1(seed*13.7)*6.2832, rad = 0.75 + 2.5*pow(h1(seed*9.1), 0.8);
          vec3 rel0 = (t1*cos(ang) + t2*sin(ang))*rad + ax*(h1(seed*6.3) - 0.5)*1.5;
          rel0 = rotAxis(rel0, ax, (1.0 - e)*(3.5 + 2.5*h1(seed*2.9)));
          p = uC + mix(rel0, p - uC, e);
          // 只有一成的粒子在途中就亮（像彗星，带拖尾），其余的快到时才显出来，画面不会糊成一片雾
          float comet = step(h1(seed*21.1), 0.1);
          vis *= smoothstep(0.0, 0.1, k)*mix(smoothstep(0.72, 0.97, k), 1.0, comet);
          moving = (1.0 - e)*(0.35 + 0.65*comet);
        } else if (uGhost > 0.5) vis = 0.0;
        vec4 mv = modelViewMatrix*vec4(p, 1.0);
        gl_Position = projectionMatrix*mv;
        float dist = max(0.05, -mv.z);
        // 光照：顶光 + 轮廓光；背面暗
        vec3 v = normalize(uCam - p);
        float nv = dot(n, v), lam = max(dot(n, uKey), 0.0);
        float rim = pow(1.0 - abs(nv), 2.2)*(nv > -0.15 ? 1.0 : 0.35)*smoothstep(-0.75, -0.1, n.y);
        float fill = max(nv, 0.0);
        float lit = mix(0.26 + 0.55*lam + 0.65*fill + 0.65*rim*smoothstep(-0.1, 0.25, nv + 0.3), 1.0, moving);
        float tw = 0.74 + 0.26*sin(uTime*(6.0 + 9.0*h1(seed*8.1)) + seed*40.0);
        float flow = 1.0 + uFlow*0.45*pow(0.5 + 0.5*sin(dot(pAnim - uC, vec3(0.0, 1.2, 2.6))*2.2 + uTime*3.2), 8.0);
        float b = aMisc.x*lit*uBright*tw*flow*(1.0 + uPulse*0.18)*(1.0 + moving*3.5);
        if (kind > 0.5) b *= 0.85;
        vec3 c = mix(uCol, uHi, clamp(lam*1.05 - 0.05, 0.0, 1.0)*0.8);
        c = mix(c, uRim, clamp(rim*1.3, 0.0, 1.0)*0.7);
        c = mix(c, uRim, moving*0.6);
        float px = uSize*uPx/dist*(kind > 0.5 ? 0.85 : 1.0)*(1.0 + moving*1.2);
        if (px < 1.5) { b *= px/1.5; px = 1.5; }
        if (px > uMaxPx) { b *= uMaxPx/px; px = uMaxPx; }
        gl_PointSize = px;
        vCol = c*b; vA = vis*(uGhost > 0.5 ? uGhost - 0.5 : 1.0);
      }`,
    fragmentShader: DOT_FRAG,
  });
}

// ------------------------------------------------------------ 通用发光点（特效用）。属性 aMisc = (亮度, 种子, 参数1, 参数2)，位置由 posHook 改写
export function fxPointsMaterial(o = {}) {
  const u = { ...SHARED, uCol: { value: col(o.col ?? '#FFFFFF') }, uHi: { value: col(o.hi ?? '#FFFFFF') }, uSize: { value: o.size ?? 0.01 }, uMaxPx: { value: o.maxPx ?? 8 },
    uAlpha: { value: 1 }, uBright: { value: o.bright ?? 1 }, ...(o.uniforms || {}) };
  return new THREE.ShaderMaterial({
    uniforms: u, transparent: true, depthWrite: false, depthTest: false, blending: THREE.AdditiveBlending,
    vertexShader: /* glsl */`
      attribute vec4 aMisc;
      uniform float uPx, uTime, uSize, uMaxPx, uAlpha, uBright; uniform vec3 uCol, uHi;
      ${o.uniformDecl || ''}
      varying vec3 vCol; varying float vA;
      ${COMMON}
      void main(){
        vec3 p = position; float b = aMisc.x*uBright, vis = 1.0, sz = 1.0, hot = 0.0;
        ${o.posHook || ''}
        vec4 mv = modelViewMatrix*vec4(p, 1.0);
        gl_Position = projectionMatrix*mv;
        float dist = max(0.05, -mv.z);
        float px = uSize*sz*uPx/dist;
        if (px < 1.4) { b *= px/1.4; px = 1.4; }
        if (px > uMaxPx) { b *= uMaxPx/px; px = uMaxPx; }
        gl_PointSize = px;
        vCol = mix(uCol, uHi, clamp(hot, 0.0, 1.0))*b; vA = vis*uAlpha;
      }`,
    fragmentShader: DOT_FRAG,
  });
}

// ------------------------------------------------------------ 发光面片：0 径向光斑 1 眼光 2 光环圈 3 柔和圆盘
export function glowMaterial(mode, color, o = {}) {
  return new THREE.ShaderMaterial({
    uniforms: { uMode: { value: mode }, uCol: { value: col(color) }, uCore: { value: col(o.core ?? '#FFFFFF') }, uInt: { value: o.intensity ?? 1 },
      uRing: { value: 0.6 }, uWidth: { value: 0.02 }, uFlare: { value: 0 } },
    transparent: true, depthWrite: false, depthTest: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
    vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.0); }`,
    fragmentShader: /* glsl */`
      uniform float uMode, uInt, uRing, uWidth, uFlare; uniform vec3 uCol, uCore; varying vec2 vUv;
      void main(){
        vec2 p = vUv*2.0 - 1.0; float r = length(p); vec3 c = vec3(0.0);
        if (uMode < 0.5) c = uCol*exp(-r*r*4.5)*smoothstep(1.0, 0.7, r);
        else if (uMode < 1.5) {
          float core = exp(-r*r*900.0), inner = exp(-r*r*120.0), halo = exp(-r*r*14.0)*0.35;
          float flare = exp(-abs(p.y)*160.0)*exp(-abs(p.x)*3.2)*uFlare;
          c = uCore*(core*1.6 + inner*0.55) + uCol*(inner*0.6 + halo + flare*0.8);
          c *= smoothstep(1.0, 0.8, r);
        }
        else if (uMode < 2.5) { float d = (r - uRing)/uWidth; c = (uCol*exp(-d*d)*1.0 + uCol*exp(-d*d*0.04)*0.12 + uCore*exp(-d*d*6.0)*0.35)*smoothstep(1.0, 0.92, r); }
        else c = uCol*smoothstep(1.0, 0.0, r);
        gl_FragColor = vec4(c*uInt, 1.0);
      }`,
  });
}

// ------------------------------------------------------------ 最终合成：场景 + 近黑背景（细小星点、主色光晕）+ 暗角
export const FinalShader = {
  uniforms: { tDiffuse: { value: null }, uRes: { value: new THREE.Vector2(1920, 1080) }, uTime: { value: 0 },
    uBase: { value: col('#05050A') }, uGlowCol: { value: col('#2BE36B') }, uGlowC: { value: new THREE.Vector2(0.5, 0.6) }, uGlowR: { value: 0.5 }, uGlowI: { value: 0 },
    uStars: { value: 1 }, uVig: { value: 0.85 }, uShift: { value: new THREE.Vector2(0, 0) } },
  vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.0); }`,
  fragmentShader: /* glsl */`
    uniform sampler2D tDiffuse; uniform vec2 uRes, uGlowC, uShift; uniform float uTime, uGlowR, uGlowI, uStars, uVig; uniform vec3 uBase, uGlowCol; varying vec2 vUv;
    float hh(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7)))*43758.5453); }
    float noise(vec2 p){ vec2 i = floor(p), f = fract(p); f = f*f*(3.0-2.0*f);
      return mix(mix(hh(i), hh(i+vec2(1,0)), f.x), mix(hh(i+vec2(0,1)), hh(i+vec2(1,1)), f.x), f.y); }
    float stars(vec2 px, float cell, float th, float seed){
      vec2 g = px/cell; vec2 id = floor(g); float s = hh(id + seed);
      if (s < th) return 0.0;
      vec2 o = vec2(hh(id + seed + 3.1), hh(id + seed + 7.7)) - 0.5;
      vec2 f = fract(g) - 0.5 - o*0.6; float d = length(f)*cell;
      float tw = 0.55 + 0.45*sin(uTime*(1.5 + 3.0*hh(id + 9.0)) + s*50.0);
      return exp(-d*d*0.9)*(s - th)/(1.0 - th)*tw;
    }
    void main(){
      vec3 c = texture2D(tDiffuse, vUv).rgb;
      vec2 px = vUv*uRes + uShift;
      float asp = uRes.x/uRes.y;
      vec3 bg = uBase;
      // 星点：两层，很小
      float st = stars(px, 9.0, 0.975, 1.0)*0.55 + stars(px, 23.0, 0.95, 5.0)*0.8;
      bg += vec3(0.78, 0.8, 0.9)*st*uStars;
      // 主色光晕：只在动物身后
      vec2 q = (vUv - uGlowC)*vec2(asp, 1.0);
      float g = exp(-dot(q, q)/(uGlowR*uGlowR));
      float n = 0.75 + 0.5*noise(q*3.0 + uTime*0.05);
      bg += uGlowCol*g*uGlowI*n;
      c += bg;
      vec2 d = vUv - 0.5;
      float v = smoothstep(1.0, 0.25, length(d*vec2(1.15, 1.0)));
      c *= mix(1.0, v, uVig);
      gl_FragColor = vec4(c, 1.0);
    }`,
};
