// 着色器：通用粒子材质、发光线条材质、发光面片、星云背景、浮尘、最终合成
// 与傲慢项目相同的结构；改动：①频率按成片时长量化（qf）②点大小换算到竖屏（uPx）③溶散可超过 1（螺旋飞散并渐隐）
// ④轮廓边缘混色 ⑤星云配色由 uniform 给出，并能从一点像潮水一样换色 ⑥最终合成里加入「绿色墨水」转场
import * as THREE from 'three';

// 所有材质共用的 uniform（同一个对象引用）
export const SHARED = { uLoop: { value: 11 }, uPx: { value: 360 } };

const COMMON = /* glsl */`
uniform float uLoop, uPx;
float h1(float n){ return fract(sin(n*127.1+311.7)*43758.5453); }
vec3 h3(float n){ return vec3(h1(n), h1(n+17.31), h1(n+41.97)); }
// 「每 128 秒 k 圈」→ 当前周期上最接近的整数圈数（角频率）
float qf(float k){ return max(1.0, floor(k*uLoop/128.0 + 0.5))*6.28318530718/uLoop; }
`;
const col = h => new THREE.Color(h);

// ------------------------------------------------------------ 通用粒子材质
export function cloudMaterial(opts = {}) {
  const u = {
    ...SHARED,
    uTime: { value: 0 }, uSize: { value: opts.size ?? 0.02 }, uAlpha: { value: 1 }, uBright: { value: opts.bright ?? 1 },
    uMaxPx: { value: opts.maxPx ?? 40 }, uDepthRef: { value: opts.depthRef ?? 3 }, uDrift: { value: opts.drift ?? 0.004 },
    uColA: { value: col(opts.colA ?? '#F5F0FF') }, uColB: { value: col(opts.colB ?? '#8B5CF6') },
    uColTint: { value: col(opts.colTint ?? '#C6F432') }, uTintAll: { value: 0 },
    uColCrack: { value: col(opts.colCrack ?? '#C084FC') }, uCrack: { value: new Array(32).fill(0) }, uCrackTint: { value: 0 },
    uAssemble: { value: 1 }, uAsmSpread: { value: 0.6 }, uAsmArc: { value: 0 },
    uScatter: { value: 0 }, uScatSpread: { value: 0.5 }, uScatterDist: { value: 1 }, uScatterBias: { value: new THREE.Vector3() }, uScatterGrav: { value: 0 },
    uSwirl: { value: 0 }, uScatFade: { value: 1 },
    uFlatten: { value: 0 }, uLineY: { value: 0 }, uLineW: { value: 8 },
    uReveal: { value: 2 }, uEyeOpen: { value: 0 }, uScanX: { value: 0 }, uScanAmt: { value: 0 },
    uFlow: { value: 0 }, uFlowK: { value: 160 },
    uHit: { value: [0, 1, 2, 3].map(() => new THREE.Vector4(0, 0, 0, 0)) },
    uFacing: { value: opts.facing ?? 1 }, uWhite: { value: 0 }, uGlow: { value: 0 }, uLight: { value: opts.light ?? 0.65 },
    uEdgeCol: { value: col('#FFFFFF') }, uEdgeAmt: { value: 0 },
    ...(opts.uniforms || {}),
  };
  return new THREE.ShaderMaterial({
    uniforms: u, transparent: true, depthWrite: false, depthTest: opts.depthTest ?? false, blending: THREE.AdditiveBlending,
    vertexShader: /* glsl */`
      attribute vec3 aNormal; attribute float aSeed; attribute vec3 aFrom; attribute vec4 aExtra; attribute vec2 aMisc;
      ${opts.attrDecl || ''}
      uniform float uTime, uSize, uAlpha, uBright, uMaxPx, uDepthRef, uDrift;
      uniform vec3 uColA, uColB, uColTint, uColCrack, uEdgeCol; uniform float uTintAll, uCrackTint, uEdgeAmt; uniform float uCrack[32];
      uniform float uAssemble, uAsmSpread, uAsmArc, uScatter, uScatSpread, uScatterDist, uScatterGrav, uSwirl, uScatFade; uniform vec3 uScatterBias;
      uniform float uFlatten, uLineY, uLineW, uReveal, uEyeOpen, uScanX, uScanAmt, uFlow, uFlowK, uFacing, uWhite, uGlow, uLight;
      uniform vec4 uHit[4];
      ${opts.uniformDecl || ''}
      varying vec3 vCol; varying float vA; varying float vSoft;
      ${COMMON}
      void main(){
        float tw = 0.6 + 0.4*sin(uTime*qf(40.0+floor(aSeed*60.0)) + aSeed*40.0);
        vec3 p = position;
        float k2 = 20.0 + floor(aSeed*30.0);
        p += uDrift*vec3(sin(uTime*qf(k2) + aSeed*20.0), sin(uTime*qf(k2+3.0) + aSeed*31.0), sin(uTime*qf(k2+7.0) + aSeed*47.0));
        float vis = 1.0;
        ${opts.posHook || ''}
        if (uAssemble < 0.999) {
          float k = clamp(uAssemble*(1.0+uAsmSpread) - aExtra.x*uAsmSpread, 0.0, 1.0);
          float e = k >= 1.0 ? 1.0 : 1.0 - pow(2.0, -10.0*k);
          p = mix(aFrom, p, e) + vec3(0.0, sin(e*3.14159)*uAsmArc, 0.0);
          vis *= smoothstep(0.0, 0.12, k);
        }
        if (uScatter > 0.001) {
          // 0–1 与傲慢项目一致；超过 1 继续飞远、绕 y 轴旋出螺旋，并逐渐消失
          float k = max(uScatter*(1.0+uScatSpread) - h1(aSeed*91.7)*uScatSpread, 0.0);
          vec3 dir = normalize(h3(aSeed*13.3) - 0.5);
          p += dir*uScatterDist*k + uScatterBias*k*(0.6+0.8*h1(aSeed*5.1)) - vec3(0.0, uScatterGrav*k*k*(0.5+h1(aSeed*3.3)), 0.0);
          float a = uSwirl*k*(0.7 + 0.6*h1(aSeed*2.3)); float ca = cos(a), sa = sin(a);
          p.xz = mat2(ca, -sa, sa, ca)*p.xz;
          vis *= mix(1.0, 1.0 - smoothstep(1.2, 2.3, k), uScatFade);
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
        b *= 1.0 + uScanAmt*2.6*exp(-pow((wp.x-uScanX)/0.36, 2.0));
        float hw = 0.0;
        for (int i = 0; i < 4; i++) { vec3 d = p - uHit[i].xyz; hw += uHit[i].w*exp(-dot(d, d)/0.035); }
        b *= 1.0 + hw*4.0;
        b *= mix(1.0, 0.25 + 1.1*pow(0.5 + 0.5*sin(aExtra.x*6.28318*3.0 - uTime*qf(uFlowK)), 2.0), uFlow);
        vec3 col = mix(uColB, uColA, smoothstep(0.25, 0.95, facing));
        col = mix(col, uColTint, uTintAll);
        // 轮廓边缘（法线与视线夹角大于 60°）混入少量罪的颜色
        if (hasN > 0.5) col = mix(col, uEdgeCol, uEdgeAmt*(1.0 - smoothstep(0.42, 0.55, facing)));
        int ci = int(aExtra.y + 0.5);
        float ct = 0.0;
        if (aExtra.w < 0.999) ct = step(aExtra.z, uCrack[ci])*(1.0 - aExtra.w)*uCrackTint;
        col = mix(col, uColCrack, clamp(ct*1.2, 0.0, 1.0));
        b *= 1.0 + ct*0.7 + uGlow;
        col = mix(col, vec3(1.0), uWhite);
        ${opts.colHook || ''}
        float px = uSize*uPx/dist;
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

// ------------------------------------------------------------ 发光线条（裂纹、闪电）
export function lineMaterial(opts = {}) {
  return new THREE.ShaderMaterial({
    uniforms: {
      ...SHARED,
      uTime: { value: 0 }, uSize: { value: opts.size ?? 0.012 }, uBright: { value: opts.bright ?? 1 }, uAlpha: { value: 1 },
      uCol: { value: col(opts.col ?? '#C084FC') }, uHot: { value: col(opts.hot ?? '#F5F0FF') },
      uProg: { value: new Array(32).fill(0) }, uInten: { value: new Array(32).fill(1) }, uMaxPx: { value: opts.maxPx ?? 30 },
    },
    transparent: true, depthWrite: false, depthTest: false, blending: THREE.AdditiveBlending,
    vertexShader: /* glsl */`
      attribute float aSeed; attribute vec4 aExtra;
      uniform float uTime, uSize, uBright, uMaxPx, uAlpha; uniform float uProg[32]; uniform float uInten[32];
      uniform vec3 uCol, uHot; varying vec3 vCol;
      ${COMMON}
      void main(){
        int id = int(aExtra.y + 0.5);
        float pr = uProg[id];
        float on = step(aExtra.x, pr) * step(0.0001, pr);
        float tip = exp(-pow((pr - aExtra.x)*70.0, 2.0)) * on * step(pr, 0.999);
        float flick = 0.75 + 0.25*sin(uTime*qf(200.0 + floor(aSeed*90.0)) + aSeed*30.0);
        vec4 mv = modelViewMatrix*vec4(position, 1.0);
        gl_Position = projectionMatrix*mv;
        float dist = max(0.05, -mv.z);
        float b = on*uBright*uAlpha*uInten[id]*flick*(0.55 + 0.35*aExtra.z)*(1.0 + tip*1.2);
        float px = uSize*uPx/dist*(0.6 + 0.6*aExtra.z)*(1.0 + tip*0.5);
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

// ------------------------------------------------------------ 发光面片
// 0 径向光斑 1 十字星芒 2 眼光（扁椭圆+光芒） 3 光柱 4 光环圈 5 眼缝（细长椭圆 + 左右射线，尺寸按世界单位）
export function glowMaterial(mode, color, opts = {}) {
  return new THREE.ShaderMaterial({
    uniforms: {
      uMode: { value: mode }, uCol: { value: col(color) }, uCore: { value: col(opts.core ?? '#FFFFFF') },
      uInt: { value: opts.intensity ?? 1 }, uOpen: { value: 1 }, uRays: { value: 0 }, uTime: { value: 0 }, uAlpha: { value: 1 },
      uRing: { value: 0.5 }, uHalf: { value: new THREE.Vector2(...(opts.half ?? [1, 1])) }, uEll: { value: new THREE.Vector2(...(opts.ell ?? [0.08, 0.006])) },
    },
    transparent: true, depthWrite: false, depthTest: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
    vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.0); }`,
    fragmentShader: /* glsl */`
      uniform float uMode, uInt, uOpen, uRays, uTime, uAlpha, uRing; uniform vec3 uCol, uCore; uniform vec2 uHalf, uEll; varying vec2 vUv;
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
        else if (uMode < 4.5) {
          float d = abs(r - uRing); c = uCol*(exp(-d*d*2500.0)*0.9 + exp(-d*d*200.0)*0.12)*smoothstep(1.0, 0.85, r);
        }
        else {
          vec2 w = p*uHalf;                                       // 世界单位
          vec2 e = w/uEll; float er = dot(e, e);
          float core = exp(-er*1.6);
          float soft = exp(-dot(w/(uEll*vec2(1.6, 9.0)), w/(uEll*vec2(1.6, 9.0))));
          float ray = exp(-abs(w.y)/(uEll.y*0.7))*exp(-abs(w.x)/(uHalf.x*0.45))*uRays;
          float edge = smoothstep(1.0, 0.8, abs(p.x))*smoothstep(1.0, 0.8, abs(p.y));
          c = (uCol*(core*0.9 + soft*0.35 + ray) + uCore*core*0.5)*edge;
        }
        gl_FragColor = vec4(c*uInt*uAlpha, 1.0);
      }`,
  });
}

// ------------------------------------------------------------ 星云（在辉光之后叠加）
// 两套配色：0 为片头的中性色，1 为本期配色；uTide 是换色潮水的半径（屏幕高度为 1），从 uTideC 向外推进
export const NEBULA_GLSL = /* glsl */`
      uniform float uBright, uStars, uTide, uTideMix, uDrift, uLift; uniform vec2 uRes, uOff, uTideC; uniform vec3 uFlash;
      uniform vec3 uN0b, uN0d, uN0m, uN0h, uN1b, uN1d, uN1m, uN1h;
      float hh(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7)))*43758.5453); }
      float noise(vec2 p){ vec2 i = floor(p), f = fract(p); f = f*f*(3.0-2.0*f);
        return mix(mix(hh(i), hh(i+vec2(1,0)), f.x), mix(hh(i+vec2(0,1)), hh(i+vec2(1,1)), f.x), f.y); }
      float fbm(vec2 p){ float v = 0.0, a = 0.5; mat2 m = mat2(1.6, 1.2, -1.2, 1.6); for (int i = 0; i < 5; i++){ v += a*noise(p); p = m*p; a *= 0.5; } return v; }
      vec3 nebula(vec2 uv){ vec2 p = (uv - 0.5)*vec2(uRes.x/uRes.y, 1.0);
        float ang = uTime*6.28318/uLoop;
        vec2 drift = vec2(cos(ang), sin(ang))*0.35*uDrift;   // 与傲慢星云相同：一个循环绕一圈     // 一个循环绕一圈；幅度按时长缩放，漂移速度与傲慢一致
        float rot = 0.06*uDrift*sin(ang);
        p = mat2(cos(rot), -sin(rot), sin(rot), cos(rot))*p + uOff;
        vec2 q = p*1.6 + drift;
        float n1 = fbm(q + vec2(fbm(q*0.9 + drift), fbm(q*0.9 - drift + 3.1))*1.3);
        float n2 = fbm(q*2.3 - drift*1.5 + 7.0);
        float dust = smoothstep(0.45, 0.75, fbm(q*1.4 + vec2(5.2, 1.3) + drift*0.6));
        float neb = smoothstep(0.35, 0.85, n1);
        // 潮水：边缘带一点噪声，像水线
        vec2 tp = (uv - uTideC)*vec2(uRes.x/uRes.y, 1.0);
        float tr = length(tp) + (fbm(tp*5.0 + 3.0) - 0.5)*0.18;
        float tide = smoothstep(uTide, uTide - 0.12, tr)*uTideMix;
        vec3 B = mix(uN0b, uN1b, tide), D = mix(uN0d, uN1d, tide), M = mix(uN0m, uN1m, tide), Hc = mix(uN0h, uN1h, tide);
        vec3 col = B + D*neb*1.05 + M*pow(neb, 2.0)*0.42*n2 + Hc*smoothstep(0.3, 0.8, neb*n2)*0.12;
        col *= 1.0 - dust*0.65;
        // 潮头的一道亮边
        col += M*0.22*exp(-pow((tr - uTide + 0.05)*14.0, 2.0))*step(0.001, uTide)*step(uTide, 1.6);
        vec2 fp = (uFlash.xy - 0.5)*vec2(uRes.x/uRes.y, 1.0);
        float fl = uFlash.z*exp(-dot(p - uOff - fp, p - uOff - fp)*4.0);
        col += (M*0.5 + Hc*0.25)*fl*(0.15 + neb*0.6);
        vec2 sg = (p + drift*0.3)*vec2(220.0);
        vec2 id = floor(sg); float st = hh(id);
        if (st > 0.985) { vec2 f = fract(sg) - 0.5; float tw = 0.5 + 0.5*sin(uTime*qf(30.0 + floor(st*1000.0)*0.1) + st*80.0);
          col += mix(vec3(0.9), Hc*1.2 + 0.2, 0.5)*exp(-dot(f, f)*30.0)*tw*uStars*(st - 0.985)*50.0; }
        // 底色抬亮：在最暗的地方也留一层与配色相同的环境光，保证整体亮度
        col = col*uBright + (D*0.28 + M*0.06)*uLift;
        return clamp(col, 0.0, 1.2);
      }`;

// ------------------------------------------------------------ 浮尘：以相机为中心循环包裹，形成视差
export function dustMaterial() {
  return new THREE.ShaderMaterial({
    uniforms: { ...SHARED, uTime: { value: 0 }, uCam: { value: new THREE.Vector3() }, uBox: { value: new THREE.Vector3(9, 12, 10) }, uAlpha: { value: 1 },
      uColA: { value: col('#C8C4D8') }, uColB: { value: col('#F2F0FA') } },
    transparent: true, depthWrite: false, depthTest: false, blending: THREE.AdditiveBlending,
    vertexShader: /* glsl */`
      attribute float aSeed; uniform float uTime, uAlpha; uniform vec3 uCam, uBox, uColA, uColB; varying vec3 vCol; varying float vSoft;
      ${COMMON}
      void main(){
        vec3 base = (h3(aSeed*7.13) - 0.5)*uBox;
        vec3 drift = vec3(sin(uTime*qf(3.0) + aSeed*20.0), sin(uTime*qf(2.0) + aSeed*9.0), cos(uTime*qf(4.0) + aSeed*13.0))*0.25;
        vec3 rel = mod(base + drift - uCam + uBox*0.5, uBox) - uBox*0.5;
        vec3 p = uCam + rel;
        vec4 mv = viewMatrix*vec4(p, 1.0);
        gl_Position = projectionMatrix*mv;
        float dist = -mv.z;
        float big = step(0.985, h1(aSeed*3.7));
        float px = (0.006 + big*0.05)*uPx/max(dist, 0.1);
        float b = (0.35 + 0.65*h1(aSeed*5.9))*(0.6 + 0.4*sin(uTime*qf(50.0 + floor(aSeed*40.0)) + aSeed*17.0));
        b *= mix(0.55, 0.07, big)*uAlpha;
        if (dist < 0.15) b = 0.0;
        if (px < 1.5) { b *= px/1.5; px = 1.5; }
        if (px > 110.0) { b *= 110.0/px; px = 110.0; }
        b *= smoothstep(uBox.z*0.5, uBox.z*0.3, dist);
        vSoft = big;
        gl_PointSize = px;
        vCol = mix(uColA, uColB, h1(aSeed*2.2))*b;
      }`,
    fragmentShader: /* glsl */`
      varying vec3 vCol; varying float vSoft;
      void main(){ vec2 c = gl_PointCoord - 0.5; float d = length(c)*2.0; if (d > 1.0) discard;
        float a = mix(exp(-d*d*3.0) + smoothstep(0.4, 0.0, d)*0.4, exp(-d*d*1.6)*smoothstep(1.0, 0.7, d), vSoft);
        gl_FragColor = vec4(vCol*a, 1.0); }`,
  });
}

// ------------------------------------------------------------ 最终合成：色差 + 暗角 + 故障错位 + 星云 + 绿色墨水
const V2 = (x, y) => new THREE.Vector2(x, y), V3c = h => new THREE.Color(h);
export const FinalShader = {
  uniforms: { ...SHARED, tDiffuse: { value: null }, uCA: { value: 0.0015 }, uVig: { value: 0.9 }, uGlitch: { value: 0 }, uTime: { value: 0 },
    uRes: { value: V2(1920, 1080) }, uOff: { value: V2(0, 0) }, uFlash: { value: new THREE.Vector3(0.5, 0.6, 0) },
    uBright: { value: 1 }, uStars: { value: 1 }, uNeb: { value: 1 }, uDrift: { value: 1 }, uTide: { value: 0 }, uTideMix: { value: 1 }, uLift: { value: 0 }, uTideC: { value: V2(0.5, 0.6) },
    uN0b: { value: V3c('#07060C') }, uN0d: { value: V3c('#1C1A2A') }, uN0m: { value: V3c('#3A3550') }, uN0h: { value: V3c('#8E88A8') },
    uN1b: { value: V3c('#07060C') }, uN1d: { value: V3c('#1C1A2A') }, uN1m: { value: V3c('#3A3550') }, uN1h: { value: V3c('#8E88A8') },
    uInk: { value: 0 }, uInkC: { value: V2(0.5, 0.5) }, uInkCol: { value: V3c('#0B3A22') }, uInkEdge: { value: V3c('#3DDC84') } },
  vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.0); }`,
  fragmentShader: /* glsl */`
    uniform sampler2D tDiffuse; uniform float uCA, uVig, uGlitch, uTime, uNeb, uInk; uniform vec2 uInkC; uniform vec3 uInkCol, uInkEdge; varying vec2 vUv;
    ${COMMON}
    ${NEBULA_GLSL}
    void main(){
      vec2 uv = vUv;
      if (uGlitch > 0.0) {
        float band = floor(uv.y*24.0 + floor(uTime*20.0)*3.0);
        float on = step(0.72, h1(band));
        uv.x += (h1(band*1.7) - 0.5)*0.08*uGlitch*on;
      }
      vec2 d = uv - 0.5;
      float ca = uCA*(1.0 + uGlitch*6.0);
      vec3 c;
      c.r = texture2D(tDiffuse, uv + d*ca*2.0).r;
      c.g = texture2D(tDiffuse, uv).g;
      c.b = texture2D(tDiffuse, uv - d*ca*2.0).b;
      c += nebula(uv)*uNeb;
      // 绿色墨水：从 uInkC 向外晕开的液态边界（噪声扰动的半径），里面是暗绿，边缘是一圈主色
      if (uInk > 0.0) {
        vec2 ip = (uv - uInkC)*vec2(uRes.x/uRes.y, 1.0);
        float ang = atan(ip.y, ip.x);
        float wob = (fbm(vec2(ang*2.2, uInk*1.5) + ip*3.0) - 0.5)*0.35 + (fbm(ip*9.0 + uInk) - 0.5)*0.08;
        float r = length(ip) + wob;
        float inside = smoothstep(uInk, uInk - 0.06, r);
        float edge = exp(-pow((r - uInk + 0.03)*30.0, 2.0));
        float tex = 0.75 + 0.5*fbm(ip*4.0 - uInk*0.8);
        c = mix(c, uInkCol*tex + c*0.35, inside*0.72) + uInkEdge*edge*0.55*step(0.001, uInk);
      }
      float v = smoothstep(1.05, 0.25, length(d*vec2(1.25, 1.0)));
      c *= mix(1.0, v, uVig);
      gl_FragColor = vec4(c, 1.0);
    }`,
};
