// 着色器：通用粒子材质、发光线条材质、发光面片、星云背景、浮尘
import * as THREE from 'three';

export const COL = {
  white: new THREE.Color('#F5F0FF'), purple: new THREE.Color('#8B5CF6'), crack: new THREE.Color('#C084FC'),
  eyeCore: new THREE.Color('#E9D5FF'), eyeOuter: new THREE.Color('#A855F7'), magenta: new THREE.Color('#F0457A'),
  deep: new THREE.Color('#6D28D9'), lilac: new THREE.Color('#A78BFA'), fuchsia: new THREE.Color('#C026D3'),
  dim: new THREE.Color('#5B4B7A'),
};

const COMMON = /* glsl */`
float h1(float n){ return fract(sin(n*127.1+311.7)*43758.5453); }
vec3 h3(float n){ return vec3(h1(n), h1(n+17.31), h1(n+41.97)); }
const float LW = 6.28318530718/128.0; // 以全片时长为周期，首尾帧一致
`;

// ------------------------------------------------------------ 通用粒子材质
export function cloudMaterial(opts = {}) {
  const u = {
    uTime: { value: 0 }, uSize: { value: opts.size ?? 0.02 }, uAlpha: { value: 1 }, uBright: { value: opts.bright ?? 1 },
    uMaxPx: { value: opts.maxPx ?? 40 }, uDepthRef: { value: opts.depthRef ?? 3 }, uDrift: { value: opts.drift ?? 0.004 },
    uColA: { value: (opts.colA ?? COL.white).clone() }, uColB: { value: (opts.colB ?? COL.purple).clone() },
    uColTint: { value: (opts.colTint ?? COL.magenta).clone() }, uTintAll: { value: 0 },
    uColCrack: { value: COL.crack.clone() }, uCrack: { value: new Array(32).fill(0) }, uCrackTint: { value: 0 },
    uAssemble: { value: 1 }, uAsmSpread: { value: 0.6 }, uAsmArc: { value: 0 },
    uScatter: { value: 0 }, uScatSpread: { value: 0.5 }, uScatterDist: { value: 1 }, uScatterBias: { value: new THREE.Vector3() }, uScatterGrav: { value: 0 },
    uFlatten: { value: 0 }, uLineY: { value: 0 }, uLineW: { value: 8 },
    uReveal: { value: 2 }, uEyeOpen: { value: 0 }, uScanX: { value: 0 }, uScanAmt: { value: 0 },
    uFlow: { value: 0 }, uFlowK: { value: 160 },
    uHit: { value: [0, 1, 2, 3].map(() => new THREE.Vector4(0, 0, 0, 0)) },
    uFacing: { value: opts.facing ?? 1 }, uWhite: { value: 0 }, uGlow: { value: 0 }, uLight: { value: opts.light ?? 0.65 },
    ...(opts.uniforms || {}),
  };
  return new THREE.ShaderMaterial({
    uniforms: u, transparent: true, depthWrite: false, depthTest: opts.depthTest ?? false, blending: THREE.AdditiveBlending,
    vertexShader: /* glsl */`
      attribute vec3 aNormal; attribute float aSeed; attribute vec3 aFrom; attribute vec4 aExtra; attribute vec2 aMisc;
      ${opts.attrDecl || ''}
      uniform float uTime, uSize, uAlpha, uBright, uMaxPx, uDepthRef, uDrift;
      uniform vec3 uColA, uColB, uColTint, uColCrack; uniform float uTintAll, uCrackTint; uniform float uCrack[32];
      uniform float uAssemble, uAsmSpread, uAsmArc, uScatter, uScatSpread, uScatterDist, uScatterGrav; uniform vec3 uScatterBias;
      uniform float uFlatten, uLineY, uLineW, uReveal, uEyeOpen, uScanX, uScanAmt, uFlow, uFlowK, uFacing, uWhite, uGlow, uLight;
      uniform vec4 uHit[4];
      ${opts.uniformDecl || ''}
      varying vec3 vCol; varying float vA; varying float vSoft;
      ${COMMON}
      void main(){
        float tw = 0.6 + 0.4*sin(uTime*LW*(40.0+floor(aSeed*60.0)) + aSeed*40.0);
        vec3 p = position;
        float k2 = 20.0 + floor(aSeed*30.0);
        p += uDrift*vec3(sin(uTime*LW*k2 + aSeed*20.0), sin(uTime*LW*(k2+3.0) + aSeed*31.0), sin(uTime*LW*(k2+7.0) + aSeed*47.0));
        float vis = 1.0;
        ${opts.posHook || ''}
        if (uAssemble < 0.999) {
          float k = clamp(uAssemble*(1.0+uAsmSpread) - aExtra.x*uAsmSpread, 0.0, 1.0);
          float e = k >= 1.0 ? 1.0 : 1.0 - pow(2.0, -10.0*k);
          p = mix(aFrom, p, e) + vec3(0.0, sin(e*3.14159)*uAsmArc, 0.0);
          vis *= smoothstep(0.0, 0.12, k);
        }
        if (uScatter > 0.001) {
          float k = clamp(uScatter*(1.0+uScatSpread) - h1(aSeed*91.7)*uScatSpread, 0.0, 1.0);
          vec3 dir = normalize(h3(aSeed*13.3) - 0.5);
          p += dir*uScatterDist*k + uScatterBias*k*(0.6+0.8*h1(aSeed*5.1)) - vec3(0.0, uScatterGrav*k*k*(0.5+h1(aSeed*3.3)), 0.0);
        }
        if (uFlatten > 0.001) {
          float k = clamp(uFlatten*1.6 - h1(aSeed*7.7)*0.6, 0.0, 1.0); k = k*k*(3.0-2.0*k);
          vec3 tgt = vec3((h1(aSeed*2.9)-0.5)*uLineW, uLineY + (h1(aSeed*8.1)-0.5)*0.01, (h1(aSeed*4.4)-0.5)*0.05);
          p = mix(p, tgt, k);
        }
        vec4 mv = modelViewMatrix*vec4(p, 1.0);
        gl_Position = projectionMatrix*mv;
        float dist = max(0.05, -mv.z);
        float facing = 0.8;
        float hasN = step(0.1, length(aNormal));
        float lit = 1.0;
        if (hasN > 0.5) {
          vec3 nv = normalize(normalMatrix*aNormal); facing = dot(nv, normalize(-mv.xyz));
          // 主光从左上前方打来，叠加边缘光，让脸有体积
          vec3 L = normalize(vec3(-0.45, 0.55, 0.7));
          float lam = max(dot(nv, L), 0.0);
          float rim = pow(1.0 - clamp(facing, 0.0, 1.0), 2.5);
          lit = mix(1.0, 0.28 + 1.05*lam + 0.9*rim, uLight);
        }
        float b = hasN > 0.5 ? mix(1.0, mix(0.035, 1.0, smoothstep(-0.12, 0.55, facing)), uFacing)*lit : 1.0;
        b *= aMisc.x*uBright*tw;
        if (aMisc.y == 1.0) b *= 1.0 - uEyeOpen;
        if (aMisc.y == 2.0) b *= mix(0.3, 1.0, uEyeOpen);
        if (aExtra.x > uReveal) vis = 0.0;
        b *= clamp(pow(uDepthRef/dist, 0.55), 0.4, 1.3);
        vec4 wp = modelMatrix*vec4(p, 1.0);
        b *= 1.0 + uScanAmt*2.6*exp(-pow((wp.x-uScanX)/0.24, 2.0));
        float hw = 0.0;
        for (int i = 0; i < 4; i++) { vec3 d = p - uHit[i].xyz; hw += uHit[i].w*exp(-dot(d, d)/0.035); }
        b *= 1.0 + hw*4.0;
        b *= mix(1.0, 0.25 + 1.1*pow(0.5 + 0.5*sin(aExtra.x*6.28318*3.0 - uTime*LW*uFlowK), 2.0), uFlow);
        vec3 col = mix(uColB, uColA, smoothstep(0.25, 0.95, facing));
        col = mix(col, uColTint, uTintAll);
        int ci = int(aExtra.y + 0.5);
        float ct = 0.0;
        if (aExtra.w < 0.999) ct = step(aExtra.z, uCrack[ci])*(1.0 - aExtra.w)*uCrackTint;
        col = mix(col, uColCrack, clamp(ct*1.2, 0.0, 1.0));
        b *= 1.0 + ct*0.7 + uGlow;
        col = mix(col, vec3(1.0), uWhite);
        ${opts.colHook || ''}
        float px = uSize*300.0/dist;
        if (px < 1.6) { b *= px/1.6; px = 1.6; }
        if (px > uMaxPx) { b *= uMaxPx/px; px = uMaxPx; }
        vSoft = smoothstep(4.0, 30.0, px);
        gl_PointSize = px;
        vCol = col*b; vA = uAlpha*vis;
      }`,
    fragmentShader: /* glsl */`
      varying vec3 vCol; varying float vA; varying float vSoft;
      void main(){
        vec2 c = gl_PointCoord - 0.5; float d = length(c)*2.0; if (d > 1.0) discard;
        float a = mix(exp(-d*d*3.2)*0.8 + smoothstep(0.4, 0.0, d)*0.45, exp(-d*d*2.2)*0.55, vSoft);
        gl_FragColor = vec4(vCol*a*vA, 1.0);
      }`,
  });
}

// ------------------------------------------------------------ 发光线条（裂纹、闪电、根须）
export function lineMaterial(opts = {}) {
  return new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0 }, uSize: { value: opts.size ?? 0.012 }, uBright: { value: opts.bright ?? 1 }, uAlpha: { value: 1 },
      uCol: { value: (opts.col ?? COL.crack).clone() }, uHot: { value: (opts.hot ?? COL.white).clone() },
      uProg: { value: new Array(32).fill(0) }, uInten: { value: new Array(32).fill(1) }, uMaxPx: { value: opts.maxPx ?? 30 },
    },
    transparent: true, depthWrite: false, depthTest: false, blending: THREE.AdditiveBlending,
    vertexShader: /* glsl */`
      attribute float aSeed; attribute vec4 aExtra;
      uniform float uTime, uSize, uBright, uMaxPx; uniform float uProg[32]; uniform float uInten[32];
      uniform vec3 uCol, uHot; varying vec3 vCol;
      ${COMMON}
      void main(){
        int id = int(aExtra.y + 0.5);
        float pr = uProg[id];
        float on = step(aExtra.x, pr) * step(0.0001, pr);
        float tip = exp(-pow((pr - aExtra.x)*70.0, 2.0)) * on * step(pr, 0.999);
        float flick = 0.75 + 0.25*sin(uTime*LW*(200.0 + floor(aSeed*90.0)) + aSeed*30.0);
        vec4 mv = modelViewMatrix*vec4(position, 1.0);
        gl_Position = projectionMatrix*mv;
        float dist = max(0.05, -mv.z);
        float b = on*uBright*uInten[id]*flick*(0.55 + 0.35*aExtra.z)*(1.0 + tip*1.2);
        float px = uSize*300.0/dist*(0.6 + 0.6*aExtra.z)*(1.0 + tip*0.5);
        if (px < 1.5) { b *= px/1.5; px = 1.5; }
        px = min(px, uMaxPx);
        gl_PointSize = px;
        vCol = mix(uCol, uHot, clamp(tip + (1.0-aExtra.x)*0.15, 0.0, 1.0))*b;
      }`,
    fragmentShader: /* glsl */`
      varying vec3 vCol;
      void main(){ vec2 c = gl_PointCoord - 0.5; float d = length(c)*2.0; if (d > 1.0) discard;
        float a = exp(-d*d*3.0)*0.7 + smoothstep(0.45, 0.0, d)*0.6; gl_FragColor = vec4(vCol*a, 1.0); }`,
  });
}

// ------------------------------------------------------------ 发光面片：0 径向光斑 1 十字星芒 2 眼光（扁椭圆+光芒） 3 光柱 4 光环圈
export function glowMaterial(mode, color, opts = {}) {
  return new THREE.ShaderMaterial({
    uniforms: {
      uMode: { value: mode }, uCol: { value: color.clone() }, uCore: { value: (opts.core ?? COL.white).clone() },
      uInt: { value: opts.intensity ?? 1 }, uOpen: { value: 1 }, uRays: { value: 0 }, uTime: { value: 0 }, uAlpha: { value: 1 },
      uRing: { value: 0.5 },
    },
    transparent: true, depthWrite: false, depthTest: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
    vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.0); }`,
    fragmentShader: /* glsl */`
      uniform float uMode, uInt, uOpen, uRays, uTime, uAlpha, uRing; uniform vec3 uCol, uCore; varying vec2 vUv;
      void main(){
        vec2 p = vUv*2.0 - 1.0; float r = length(p); vec3 c = vec3(0.0);
        if (uMode < 0.5) { c = uCol*exp(-r*r*5.0) + uCore*exp(-r*r*40.0)*0.8; }
        else if (uMode < 1.5) {
          float a = exp(-r*r*6.0)*0.8 + exp(-r*r*60.0)*1.5;
          float cross = exp(-abs(p.y)*90.0)*exp(-abs(p.x)*2.2) + exp(-abs(p.x)*90.0)*exp(-abs(p.y)*2.2);
          vec2 q = mat2(0.7071, -0.7071, 0.7071, 0.7071)*p;
          float diag = (exp(-abs(q.y)*140.0)*exp(-abs(q.x)*4.5) + exp(-abs(q.x)*140.0)*exp(-abs(q.y)*4.5))*0.5;
          c = uCol*(a + cross*1.2 + diag) + uCore*exp(-r*r*120.0)*2.0;
        }
        else if (uMode < 2.5) {
          float o = max(uOpen, 0.04);
          vec2 e = vec2(p.x/0.27, p.y/(0.085*o));
          float er = length(e);
          float core = exp(-er*er*4.0) + exp(-er*er*30.0);
          float halo = exp(-r*r*14.0)*0.35*(0.3 + 0.7*o);
          float ang = atan(p.y, p.x);
          float rays = (pow(abs(cos(ang*4.0 + 0.4)), 80.0)*exp(-r*4.0) + pow(abs(cos(ang*3.0 + 1.1)), 120.0)*exp(-r*5.0)*0.7)*uRays*smoothstep(0.02, 0.12, r);
          c = uCol*(halo + rays) + uCore*core*o;
        }
        else if (uMode < 3.5) {
          float across = exp(-p.x*p.x*18.0) + exp(-p.x*p.x*400.0)*1.5;
          float along = smoothstep(1.0, 0.6, vUv.y)*smoothstep(0.0, 0.08, vUv.y);
          c = mix(uCol, uCore, exp(-p.x*p.x*400.0))*across*along;
        }
        else {
          float d = abs(r - uRing); c = uCol*(exp(-d*d*2500.0)*0.9 + exp(-d*d*200.0)*0.12)*smoothstep(1.0, 0.85, r);
        }
        gl_FragColor = vec4(c*uInt*uAlpha, 1.0);
      }`,
  });
}

// ------------------------------------------------------------ 星云背景（全屏，挂在相机上）
// 星云背景：在辉光之后叠加（只有粒子发光，星云不被辉光放大）
export const NEBULA_GLSL = /* glsl */`
      uniform float uBright, uDawn, uStars; uniform vec2 uRes, uOff; uniform vec3 uFlash;
      float hh(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7)))*43758.5453); }
      float noise(vec2 p){ vec2 i = floor(p), f = fract(p); f = f*f*(3.0-2.0*f);
        return mix(mix(hh(i), hh(i+vec2(1,0)), f.x), mix(hh(i+vec2(0,1)), hh(i+vec2(1,1)), f.x), f.y); }
      float fbm(vec2 p){ float v = 0.0, a = 0.5; mat2 m = mat2(1.6, 1.2, -1.2, 1.6); for (int i = 0; i < 5; i++){ v += a*noise(p); p = m*p; a *= 0.5; } return v; }
      vec3 nebula(vec2 uv){ vec2 p = (uv - 0.5)*vec2(uRes.x/uRes.y, 1.0);
        float ang = uTime*6.28318/128.0;
        vec2 drift = vec2(cos(ang), sin(ang))*0.35;           // 以全片时长为周期的缓慢漂移
        float rot = 0.06*sin(ang);
        p = mat2(cos(rot), -sin(rot), sin(rot), cos(rot))*p + uOff;
        vec2 q = p*1.6 + drift;
        float n1 = fbm(q + vec2(fbm(q*0.9 + drift), fbm(q*0.9 - drift + 3.1))*1.3);
        float n2 = fbm(q*2.3 - drift*1.5 + 7.0);
        float dust = smoothstep(0.45, 0.75, fbm(q*1.4 + vec2(5.2, 1.3) + drift*0.6));
        vec3 base = vec3(0.027, 0.012, 0.059);
        vec3 c1 = vec3(0.165, 0.055, 0.29), c2 = vec3(0.427, 0.157, 0.851), c3 = vec3(0.655, 0.545, 0.98);
        float neb = smoothstep(0.35, 0.85, n1);
        vec3 col = base + c1*neb*1.05 + c2*pow(neb, 2.0)*0.42*n2 + c3*smoothstep(0.3, 0.8, neb*n2)*0.12;
        col *= 1.0 - dust*0.65;
        // 闪电照亮的局部
        vec2 fp = (uFlash.xy - 0.5)*vec2(uRes.x/uRes.y, 1.0);
        float fl = uFlash.z*exp(-dot(p - uOff - fp, p - uOff - fp)*4.0);
        col += (c2*0.5 + c3*0.25)*fl*(0.15 + neb*0.6);
        // 星点
        vec2 sg = (p + drift*0.3)*vec2(220.0);
        vec2 id = floor(sg); float st = hh(id);
        if (st > 0.985) { vec2 f = fract(sg) - 0.5; float tw = 0.5 + 0.5*sin(uTime*6.28318/128.0*(30.0 + floor(st*1000.0)*0.1) + st*80.0);
          col += vec3(0.85, 0.8, 1.0)*exp(-dot(f, f)*30.0)*tw*uStars*(st - 0.985)*50.0; }
        // 结尾：星云变亮、后方升起白光
        col += vec3(0.62, 0.5, 0.95)*uDawn*0.14*exp(-dot(p - vec2(0.0, -0.05), p - vec2(0.0, -0.05))*2.6);
        col *= uBright*(1.0 + uDawn*0.3);
        return clamp(col, 0.0, 1.2);
      }`;

// ------------------------------------------------------------ 浮尘：以相机为中心循环包裹，形成视差
export function dustMaterial() {
  return new THREE.ShaderMaterial({
    uniforms: { uTime: { value: 0 }, uCam: { value: new THREE.Vector3() }, uBox: { value: new THREE.Vector3(9, 6, 10) }, uAlpha: { value: 1 }, uWarm: { value: 0 } },
    transparent: true, depthWrite: false, depthTest: false, blending: THREE.AdditiveBlending,
    vertexShader: /* glsl */`
      attribute float aSeed; uniform float uTime, uWarm; uniform vec3 uCam, uBox; varying vec3 vCol; varying float vSoft;
      ${COMMON}
      void main(){
        vec3 base = (h3(aSeed*7.13) - 0.5)*uBox;
        vec3 drift = vec3(sin(uTime*LW*3.0 + aSeed*20.0), sin(uTime*LW*2.0 + aSeed*9.0) + uWarm*0.0, cos(uTime*LW*4.0 + aSeed*13.0))*0.25;
        vec3 rel = mod(base + drift - uCam + uBox*0.5, uBox) - uBox*0.5;
        vec3 p = uCam + rel;
        vec4 mv = viewMatrix*vec4(p, 1.0);
        gl_Position = projectionMatrix*mv;
        float dist = -mv.z;
        float big = step(0.985, h1(aSeed*3.7));
        float px = (0.006 + big*0.05)*300.0/max(dist, 0.1);
        float b = (0.35 + 0.65*h1(aSeed*5.9))*(0.6 + 0.4*sin(uTime*LW*(50.0 + floor(aSeed*40.0)) + aSeed*17.0));
        b *= mix(0.55, 0.07, big);
        if (dist < 0.15) b = 0.0;
        if (px < 1.5) { b *= px/1.5; px = 1.5; }
        if (px > 110.0) { b *= 110.0/px; px = 110.0; }
        b *= smoothstep(uBox.z*0.5, uBox.z*0.3, dist);
        vSoft = big;
        gl_PointSize = px;
        vCol = mix(vec3(0.75, 0.62, 1.0), vec3(0.96, 0.94, 1.0), h1(aSeed*2.2))*b;
      }`,
    fragmentShader: /* glsl */`
      varying vec3 vCol; varying float vSoft;
      void main(){ vec2 c = gl_PointCoord - 0.5; float d = length(c)*2.0; if (d > 1.0) discard;
        float a = mix(exp(-d*d*3.0) + smoothstep(0.4, 0.0, d)*0.4, exp(-d*d*1.6)*smoothstep(1.0, 0.7, d), vSoft);
        gl_FragColor = vec4(vCol*a, 1.0); }`,
  });
}

// ------------------------------------------------------------ 后期：色差 + 暗角 + 故障错位
export const FinalShader = {
  uniforms: { tDiffuse: { value: null }, uCA: { value: 0.0015 }, uVig: { value: 0.9 }, uGlitch: { value: 0 }, uTime: { value: 0 },
    uRes: { value: new THREE.Vector2(1920, 1080) }, uOff: { value: new THREE.Vector2() }, uFlash: { value: new THREE.Vector3(0.5, 0.6, 0) },
    uBright: { value: 1 }, uDawn: { value: 0 }, uStars: { value: 1 }, uNeb: { value: 1 } },
  vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.0); }`,
  fragmentShader: /* glsl */`
    uniform sampler2D tDiffuse; uniform float uCA, uVig, uGlitch, uTime, uNeb; varying vec2 vUv;
    float hh1(float n){ return fract(sin(n*127.1+311.7)*43758.5453); }
    ${NEBULA_GLSL}
    void main(){
      vec2 uv = vUv;
      if (uGlitch > 0.0) {
        float band = floor(uv.y*24.0 + floor(uTime*20.0)*3.0);
        float on = step(0.72, hh1(band));
        uv.x += (hh1(band*1.7) - 0.5)*0.08*uGlitch*on;
      }
      vec2 d = uv - 0.5;
      float ca = uCA*(1.0 + uGlitch*6.0);
      vec3 c;
      c.r = texture2D(tDiffuse, uv + d*ca*2.0).r;
      c.g = texture2D(tDiffuse, uv).g;
      c.b = texture2D(tDiffuse, uv - d*ca*2.0).b;
      c += nebula(uv)*uNeb;
      float v = smoothstep(1.05, 0.25, length(d*vec2(1.25, 1.0)));
      c *= mix(1.0, v, uVig);
      gl_FragColor = vec4(c, 1.0);
    }`,
};
