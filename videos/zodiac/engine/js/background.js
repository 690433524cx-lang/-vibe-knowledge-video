// 背景：星云着色器（半分辨率渲染到纹理，在最终合成里垫底）+ 世界空间的闪烁星点 + 浮尘
import * as THREE from 'three';
import { COMMON } from './glsl.js';
import { PAL, particleMaterial, PB, makePoints } from './particles.js';
import { rng } from './util.js';

const NEBULA_FS = /* glsl */`
  uniform float uTime, uBright, uFlashAll, uBand; uniform vec2 uRes, uOff; uniform vec3 uFlash;
  uniform vec3 cBg, cDark, cMid, cHi, cAlt;
  varying vec2 vUv;
  float hh(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7)))*43758.5453); }
  float noise(vec2 p){ vec2 i = floor(p), f = fract(p); f = f*f*(3.0 - 2.0*f);
    return mix(mix(hh(i), hh(i + vec2(1.0, 0.0)), f.x), mix(hh(i + vec2(0.0, 1.0)), hh(i + vec2(1.0, 1.0)), f.x), f.y); }
  const mat2 RM = mat2(1.6, 1.2, -1.2, 1.6);
  // 5 层 fbm
  float fbm(vec2 p){ float v = 0.0, a = 0.5; for (int i = 0; i < 5; i++){ v += a*noise(p); p = RM*p; a *= 0.5; } return v; }
  // 脊状 fbm：星云里细长发亮的丝状结构
  float ridge(vec2 p){ float v = 0.0, a = 0.5; for (int i = 0; i < 5; i++){ float n = 1.0 - abs(2.0*noise(p) - 1.0); v += a*n*n; p = RM*p; a *= 0.5; } return v; }
  void main(){
    vec2 asp = vec2(uRes.x/uRes.y, 1.0);
    vec2 p = (vUv - 0.5)*asp*2.0 + uOff;
    float ang = uTime*6.28318530718/25.0;          // 以全片时长为周期的流动
    vec2 drift = vec2(cos(ang), sin(ang))*0.2;
    // 两层星云：大尺度翻卷 + 反向流动的丝状细节（域扭曲）
    vec2 q = p*0.9 + drift;
    vec2 warp = vec2(fbm(q + drift*0.6), fbm(q*1.1 - drift + 3.7));
    float w = fbm(q*0.8 + warp*1.4);
    float r = ridge(p*2.8 - drift*1.6 + warp*1.6 + 7.0);
    float r2 = ridge(p*5.5 + drift*2.0 - warp*1.2 + 2.0);
    float cloud = smoothstep(0.5, 0.86, w);
    float fil = (pow(r, 4.0)*2.0 + pow(r2, 5.0)*1.0)*smoothstep(0.25, 0.7, w);
    // 暗色尘埃带
    float dl = smoothstep(0.5, 0.74, fbm(p*1.3 + vec2(4.2, -2.1) - drift*0.7));
    // 斜穿画面、若隐若现的银河光带
    vec2 bd = normalize(vec2(1.0, 1.35));
    float dband = dot(p - vec2(0.05, 0.1), vec2(-bd.y, bd.x));
    float band = exp(-dband*dband*7.0)*(0.5 + 0.5*fbm(p*2.6 - drift*1.1 + 5.0))*(0.8 + 0.2*sin(ang*2.0 + p.y*2.0));
    vec3 col = cBg*0.8;
    col += cDark*cloud*1.2;
    col += cDark*fil*2.0 + cMid*fil*fil*1.6;
    col += cAlt*pow(fil, 3.0)*1.4;
    col += cHi*pow(fil, 5.0)*1.2;
    col += (cDark*1.1 + cAlt*0.06)*band*uBand;
    col *= 1.0 - dl*0.8*(1.0 - band*0.3);
    // 细碎星尘（银河光带里更密）
    vec2 sg = (p + drift*0.15)*vec2(150.0);
    vec2 id = floor(sg); float st = hh(id);
    float thr = mix(0.97, 0.9, band);
    if (st > thr) { vec2 f = fract(sg) - 0.5; float tw = 0.5 + 0.5*sin(uTime*6.28318530718/25.0*floor(10.0 + st*300.0) + st*80.0);
      col += mix(cHi, cAlt, hh(id + 3.1))*exp(-dot(f, f)*24.0)*tw*(st - thr)/(1.0 - thr)*0.55; }
    // 冲击：冲击点附近被照亮；强冲击时整体照亮
    vec2 fp = (uFlash.xy - 0.5)*asp*2.0*vec2(1.0, -1.0) + uOff;
    float fl = uFlash.z*exp(-dot(p - fp, p - fp)*1.4);
    col += (cMid*0.5 + cAlt*0.25)*fl*(0.15 + cloud*0.8 + fil*1.5);
    col += (cMid*0.2 + cDark*0.6)*uFlashAll*(0.2 + cloud + fil*2.0);
    gl_FragColor = vec4(col*uBright, 1.0);
  }`;

export function buildBackground(scene, camera, W, H, Q) {
  // 星云渲染到半分辨率纹理
  const rt = new THREE.WebGLRenderTarget(Math.round(W / 2), Math.round(H / 2), { type: THREE.HalfFloatType });
  const nebMat = new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0 }, uBright: { value: 1 }, uFlashAll: { value: 0 }, uBand: { value: 1 }, uRes: { value: new THREE.Vector2(W, H) },
      uOff: { value: new THREE.Vector2() }, uFlash: { value: new THREE.Vector3(0.5, 0.5, 0) },
      cBg: { value: PAL.bg.clone() }, cDark: { value: PAL.dark.clone() }, cMid: { value: PAL.primary.clone() }, cHi: { value: PAL.highlight.clone() }, cAlt: { value: PAL.secondary.clone() },
    },
    vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }`,
    fragmentShader: NEBULA_FS, depthTest: false, depthWrite: false,
  });
  const nebScene = new THREE.Scene();
  const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), nebMat); quad.frustumCulled = false; nebScene.add(quad);
  const nebCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

  // 世界空间星点（远处球壳），相机转动时产生视差
  const rand = rng(99);
  const sp = new PB();
  const nStars = Math.round(2600 * Q);
  for (let i = 0; i < nStars; i++) {
    const u = rand() * 2 - 1, a = rand() * Math.PI * 2, r = 70 + rand() * 30, s = Math.sqrt(1 - u * u);
    const big = rand() < 0.04 ? 1 : 0;
    sp.add([Math.cos(a) * s * r, u * r * 0.8, Math.sin(a) * s * r - 20], [0, 0, 0], rand(), 0, [(0.45 + rand() * 0.8) * (big ? 2.2 : 1), big, rand(), 0]);
  }
  const starMat = particleMaterial({
    size: 0.5, maxPx: 7, minPx: 1.2, drift: 0,
    colHook: `col = mix(uColHi, uColAlt, aTone.z*0.7); if (aTone.z > 0.85) col = mix(uColHi, uColMain, 0.5); sizeK = 1.0 + aTone.y*1.4;`,
  });
  starMat.uniforms.uFlicker.value = 1.4;
  const stars = makePoints(sp, starMat, scene, -10);

  // 浮尘：约 3000 颗主色小粒子，分布在镜头前后，以相机为中心循环包裹
  const dp = new PB();
  const nDust = Math.round(3000 * Q);
  for (let i = 0; i < nDust; i++) dp.add([0, 0, 0], [0, 0, 0], (i + 0.5) / nDust, 0, [1, rand() < 0.012 ? 1 : 0, rand(), rand()]);
  const dustMat = particleMaterial({
    size: 0.035, maxPx: 150, minPx: 1.0, drift: 0, flicker: 0.6,
    uniformDecl: 'uniform vec3 uCam, uBox; uniform float uDust;',
    uniforms: { uCam: { value: new THREE.Vector3() }, uBox: { value: new THREE.Vector3(16, 26, 26) }, uDust: { value: 1 } },
    posHook: /* glsl */`
      vec3 base = (h3(seed*7.13) - 0.5)*uBox;
      vec3 dr = vec3(sin(uTime*LW*2.0 + seed*20.0), sin(uTime*LW*1.0 + seed*9.0)*1.5 + uTime*0.0, cos(uTime*LW*3.0 + seed*13.0))*0.6;
      vec3 rel = mod(base + dr - uCam + uBox*0.5, uBox) - uBox*0.5;
      p = uCam + rel;`,
    worldHook: '',
    colHook: /* glsl */`
      float big = aTone.y;
      col = mix(uColMain, uColAlt, aTone.z*0.6);
      sizeK = mix(1.0 + aTone.w*1.5, 26.0, big);
      b *= mix(0.5, 0.022, big)*uDust;
      b *= smoothstep(13.0, 6.0, dist)*smoothstep(0.4, 1.4, dist);`,
  });
  const dust = makePoints(dp, dustMat, scene, 80);

  return {
    rt, nebMat, nebScene, nebCam, stars, starMat, dust, dustMat,
    render(renderer) { renderer.setRenderTarget(rt); renderer.render(nebScene, nebCam); renderer.setRenderTarget(null); },
  };
}
