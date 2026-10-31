// 渲染：一套 GPU 粒子系统在各个形状之间变形；render(t) 是纯函数（所有随机都来自粒子编号的 hash）
// 管线：粒子（主体 + 两层拖尾）+ 眼睛的锥形光 → UnrealBloom → 最终合成（暗色光晕、冲击波、扫描线、色差、曝光、暗角）→ 2D 文字
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { TEX, PART, Shape, pack, starfield, pointShape, charShape, initFace, faceShape, haloShape, smallCrown } from './shapes.js';
import * as TLN from './timeline.js';
import { clamp, lerp, hash } from './lib/util.js';

const q = new URLSearchParams(location.search);
const PREVIEW = q.get('preview') === '1';
const UPTO = q.has('upto') ? Number(q.get('upto')) : 6;     // 只生成到第几宗（预览用）
const FW = 1920, FH = 1080, W = PREVIEW ? 960 : 1920, H = PREVIEW ? 540 : 1080;
const N = TEX * TEX, NC = 200000;
const FOV = 35, TILT = 10 * Math.PI / 180, DIST = 5 / Math.tan(17.5 * Math.PI / 180);
// 颜色按显示值直接使用（不做线性化，输出也不再做 sRGB 编码），#050508 渲染出来就是 (5, 5, 8)
THREE.ColorManagement.enabled = false;
const C3 = h => new THREE.Color(h);

let renderer, scene, camera, composer, bloom, final, glCanvas, outCanvas, ctx, layers = [], beams = [];
const TEXS = {}, L = {};
export let META = {};

// ------------------------------------------------------------ 颜色：深色 = 主色 × 0.25；高光 = 主色 : 白 = 3 : 7
function tones(hex) { const m = C3(hex); return { dark: m.clone().multiplyScalar(0.25), main: m.clone(), high: m.clone().multiplyScalar(0.3).add(new THREE.Color(0.7, 0.7, 0.7)) }; }
const highCss = hex => { const c = tones(hex).high; return `rgb(${(c.r * 255) | 0},${(c.g * 255) | 0},${(c.b * 255) | 0})`; };

// ------------------------------------------------------------ 画面坐标（比例）→ 世界坐标（z = zPlane 平面）
function screenToWorld(fx, fy, zPlane = 0) {
  const v = new THREE.Vector3(fx * 2 - 1, 1 - fy * 2, 0.5).unproject(camera);
  const dir = v.sub(camera.position).normalize(), k = (zPlane - camera.position.z) / dir.z;
  return camera.position.clone().addScaledVector(dir, k);
}

export async function init() {
  const beats = await (await fetch('beats.json')).json();
  glCanvas = document.getElementById('gl'); outCanvas = document.getElementById('out');
  glCanvas.width = outCanvas.width = W; glCanvas.height = outCanvas.height = H;
  ctx = outCanvas.getContext('2d');
  renderer = new THREE.WebGLRenderer({ canvas: glCanvas, antialias: false, preserveDrawingBuffer: true });
  renderer.setPixelRatio(1); renderer.setSize(W, H, false); renderer.setClearColor(0x050508, 1); renderer.outputColorSpace = THREE.LinearSRGBColorSpace;
  scene = new THREE.Scene();
  camera = new THREE.PerspectiveCamera(FOV, FW / FH, 0.1, 200);
  camera.position.set(0, -DIST * Math.sin(TILT), DIST * Math.cos(TILT)); camera.lookAt(0, 0, 0); camera.updateMatrixWorld(); camera.updateProjectionMatrix();
  scene.add(camera);
  composer = new EffectComposer(renderer); composer.setPixelRatio(1); composer.setSize(W, H);
  composer.addPass(new RenderPass(scene, camera));
  bloom = new UnrealBloomPass(new THREE.Vector2(W, H), 0.9, 0.6, 0.15); composer.addPass(bloom);
  final = new ShaderPass(FinalShader); final.uniforms.uRes.value.set(W, H); composer.addPass(final);
  composer.addPass(new OutputPass());
  // ---- 构图
  const y0 = screenToWorld(0.5, 0), y1 = screenToWorld(0.5, 1);
  L.frameH = y0.y - y1.y; L.px = L.frameH / FH;
  L.center = screenToWorld(0.5, 0.5);
  // 开头的七张脸：中间（愤怒）脸高 26%，往两边每张缩小 8%，整排在 42% 高度
  const fh = [0, 1, 2, 3, 4, 5, 6].map(i => 0.26 * Math.pow(0.92, Math.abs(i - 3)));
  const wfrac = h => 0.86 * h * FH / FW;
  const xs = new Array(7); xs[3] = 0.5;
  for (let k = 1; k <= 3; k++) { xs[3 + k] = xs[3 + k - 1] + (wfrac(fh[3 + k - 1]) + wfrac(fh[3 + k])) / 2 * 1.06; xs[3 - k] = xs[3 - k + 1] - (wfrac(fh[3 - k + 1]) + wfrac(fh[3 - k])) / 2 * 1.06; }
  L.intro = xs.map((x, i) => { const hw = fh[i] * L.frameH, c = screenToWorld(x, 0.42); return { x, faceH: hw, chin: [c.x, c.y - hw * 0.5, 0] }; });
  // 神像：脸高 52%，下巴在 70% 高度；罪名大字：高 60%，居中
  const ch = screenToWorld(0.5, 0.70);
  L.idol = { faceH: 0.52 * L.frameH, chin: [0, ch.y, 0] };
  L.char = { c: [L.center.x, L.center.y, 0], height: 0.6 * L.frameH };
  // ---- 形状
  const objText = await (await fetch('assets/canonical_face_model.obj')).text();
  initFace(objText);
  const G = { NC, star: starfield(N) };
  const k = 1;
  const S = {};
  // 开头：七张灰白闭眼脸 + 各自的小光环（只有主环和放射光）
  {
    const s = new Shape(); L.introHalo = [];
    L.intro.forEach((f, i) => {
      const F = faceShape(Math.round(15500 * k), { faceH: f.faceH, chin: f.chin, sin: 7 + i, seed: 100 + i, tilt: 8, shoulders: false, gain: 1.3, eyeGain: 0.2 });
      s.p.push(...F.shape.p);
      const hc = [(F.eyes[0][0] + F.eyes[1][0]) / 2, (F.eyes[0][1] + F.eyes[1][1]) / 2 + 0.08 * f.faceH, -0.35 * f.faceH];
      L.introHalo.push({ c: hc, r: 0.9 * 0.6 * f.faceH });
      s.gain = 0.8; haloShape(s, { c: hc, faceH: 0.6 * f.faceH, px: L.px, sin: 7 + i, seed: 200 + i, k: 0.13, outer: false }); s.gain = 1;
    });
    S.intro = s;
  }
  S.pointC = pointShape(NC, [L.center.x, L.center.y, 0]);
  L.idols = [];
  SINS_LOOP: for (let i = 0; i <= 6; i++) {
    const sin = TLN.SINS[i];
    // 罪名大字 + 字背后的主环和放射光（按最终大小的 60% 存放）
    const cs = charShape(sin.ch, Math.round(95000 * k), { ...L.char, sin: i, seed: 300 + i, gain: 0.4 });
    const F0 = faceShape(10, { faceH: L.idol.faceH, chin: L.idol.chin, sin: i, seed: 1, tilt: 8 });
    const hc = [(F0.eyes[0][0] + F0.eyes[1][0]) / 2, (F0.eyes[0][1] + F0.eyes[1][1]) / 2 + 0.1 * L.idol.faceH, -0.45 * L.idol.faceH];
    cs.gain = 0.65; haloShape(cs, { c: hc, faceH: 0.6 * L.idol.faceH, px: L.px, sin: i, seed: 400 + i, k: 0.6, outer: false });
    S[`char${i}`] = cs;
    if (i > UPTO) continue SINS_LOOP;
    // 神像：完整的头 + 光环全部四层 + 这一宗的特征
    const F = faceShape(Math.round(98000 * k), { faceH: L.idol.faceH, chin: L.idol.chin, sin: i, seed: 500 + i, tilt: 8, gain: 0.75, eyeGain: 0.08 });
    const s = F.shape; s.gain = 0.5;
    haloShape(s, { c: hc, faceH: L.idol.faceH, px: L.px, sin: i, seed: 600 + i, k: 1, outer: true, inner: sin.inner });
    let crownC = null;
    if (sin.id === 'pride') { crownC = [hc[0], F.top[1] + 0.06 * L.idol.faceH, F.top[2]]; s.gain = 0.28; smallCrown(s, { c: crownC, r: 0.2 * L.idol.faceH, sin: i, k: 1 }); s.gain = 0.5; }
    S[`idol${i}`] = s;
    const mid = [(F.eyes[0][0] + F.eyes[1][0]) / 2, (F.eyes[0][1] + F.eyes[1][1]) / 2, F.eyes[0][2] + 0.05];
    S[`point${i}`] = pointShape(NC, mid, 9 + i);
    L.idols[i] = { hc, eyes: F.eyes, mid, crownC, r: 0.9 * L.idol.faceH };
  }
  let seed = 1;
  for (const [name, s] of Object.entries(S)) {
    const { T0, T1, n } = pack(s, G, 1000 + seed++);
    const mk = a => { const t = new THREE.DataTexture(a, TEX, TEX, THREE.RGBAFormat, THREE.FloatType); t.minFilter = t.magFilter = THREE.NearestFilter; t.needsUpdate = true; return t; };
    TEXS[name] = { t0: mk(T0), t1: mk(T1), n };
  }
  // ---- 粒子：主体 + 两层拖尾（用前 1、2 帧的状态重画，透明度 0.55、0.3），全部可由 t 算出
  const geo = new THREE.BufferGeometry(), uv = new Float32Array(N * 2), sd = new Float32Array(N);
  for (let i = 0; i < N; i++) { uv[i * 2] = ((i % TEX) + 0.5) / TEX; uv[i * 2 + 1] = (Math.floor(i / TEX) + 0.5) / TEX; sd[i] = hash(i * 0.618 + 0.13); }
  geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(N * 3), 3)); geo.setAttribute('aUV', new THREE.BufferAttribute(uv, 2)); geo.setAttribute('aSeed', new THREE.BufferAttribute(sd, 1));
  geo.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 1e4);
  for (let j = 0; j < 3; j++) { const p = new THREE.Points(geo, particleMaterial()); p.frustumCulled = false; p.renderOrder = 10 - j; scene.add(p); layers.push(p); }
  // ---- 眼睛射出的锥形光（向前、向下打向镜头）
  for (let e = 0; e < 2; e++) { const m = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), beamMaterial()); m.renderOrder = 20; m.frustumCulled = false; scene.add(m); beams.push(m); }
  const { TL, EV } = TLN.setup(beats, L.intro.map(f => f.x));
  META = { duration: TL, fps: PREVIEW ? 15 : 30, beats, events: EV, layout: L };
  window.META = META;
  window.__DBG = { final, bloom, layers, beams, renderer, scene, camera, counts: Object.fromEntries(Object.entries(TEXS).map(([k, v]) => [k, v.n])), raw: Object.fromEntries(Object.entries(S).map(([k, v]) => [k, v.n])) };
  for (const w of [700, 900]) { ctx.font = `${w} 20px "Noto Serif CJK SC"`; ctx.fillText('七宗罪', -100, -100); }
}

// ------------------------------------------------------------ 粒子材质
function particleMaterial() {
  const arr = (n, f) => Array.from({ length: n }, f);
  const u = {
    uA0: { value: null }, uA1: { value: null }, uB0: { value: null }, uB1: { value: null },
    uT: { value: 0 }, uT0: { value: 0 }, uDur: { value: 1 }, uEaseIn: { value: 0 }, uSpin: { value: 0 }, uCurl: { value: 0 }, uAlpha: { value: 1 },
    uOpen: { value: arr(14, () => 0) }, uLit: { value: arr(14, () => 1) }, uHaloS: { value: arr(14, () => 1) }, uHaloR: { value: arr(14, () => 1) },
    uHaloC: { value: arr(14, () => new THREE.Vector3()) }, uDark: { value: arr(14, () => new THREE.Color()) }, uMain: { value: arr(14, () => new THREE.Color()) }, uHigh: { value: arr(14, () => new THREE.Color()) },
    uContract: { value: 0 }, uPop: { value: 0 }, uSwirl: { value: 0 }, uMainBoost: { value: 0 }, uHaloBright: { value: 1 }, uRayLen: { value: 1 },
    uRotIn: { value: 0 }, uRotOut: { value: 0 }, uRotRay: { value: 0 }, uCrownRot: { value: 0 }, uCrownC: { value: new THREE.Vector3() },
    uCen: { value: new THREE.Vector3() }, uFrameH: { value: 10 }, uPx: { value: 0.01 }, uScale: { value: 1 }, uOnly: { value: -1 },
  };
  return new THREE.ShaderMaterial({
    uniforms: u, transparent: true, depthWrite: false, depthTest: false, blending: THREE.AdditiveBlending,
    vertexShader: /* glsl */`
      attribute vec2 aUV; attribute float aSeed;
      uniform sampler2D uA0, uA1, uB0, uB1;
      uniform float uT, uT0, uDur, uEaseIn, uSpin, uCurl, uAlpha;
      uniform float uOpen[14], uLit[14], uHaloS[14], uHaloR[14]; uniform vec3 uHaloC[14], uDark[14], uMain[14], uHigh[14];
      uniform float uContract, uPop, uSwirl, uMainBoost, uHaloBright, uRayLen, uRotIn, uRotOut, uRotRay, uCrownRot;
      uniform vec3 uCrownC, uCen; uniform float uFrameH, uPx, uScale, uOnly;
      varying vec3 vCol;
      float h1(float n){ return fract(sin(n*127.1 + 311.7)*43758.5453); }
      mat2 rot(float a){ float c = cos(a), s = sin(a); return mat2(c, s, -s, c); }
      // 各部件的动态：眼皮、光环旋转与缩放、放射光变长、小王冠绕竖轴转、火焰上飘、星尘漂浮
      vec3 dyn(vec4 t0, vec4 t1, out float br, out vec3 col){
        vec3 p = t0.xyz; br = t0.w;
        int part = int(t1.y + 0.5), s = int(t1.z + 0.5);
        float tone = t1.x;
        col = tone < 0.5 ? mix(uDark[s], uMain[s], tone*2.0) : mix(uMain[s], uHigh[s], tone*2.0 - 1.0);
        if (part == 0) { col = mix(vec3(0.75, 0.75, 0.82), uHigh[s], 0.3); p.xy += 0.25*vec2(sin(uT*0.11 + aSeed*40.0), cos(uT*0.09 + aSeed*23.0)); return p; }
        float lit = uLit[s];
        col = mix(vec3(0.62, 0.62, 0.68), col, lit); br *= mix(0.3, 1.0, lit);
        if (part == 1 || part == 2) p.y += t1.w*uOpen[s];
        if (part == 2) { br *= clamp(uOpen[s], 0.0, 1.2); col = uHigh[s]; }
        if (part >= 3 && part <= 6) {
          vec2 d = p.xy - uHaloC[s].xy;
          if (part == 6) { float r = length(d), r0 = uHaloR[s]; d *= (r0 + (r - r0)*uRayLen)/max(r, 1e-4); }
          float a = part == 3 ? uRotIn : part == 5 ? uRotOut : part == 6 ? uRotRay : 0.0;
          d = rot(a)*d*uHaloS[s]; p.xy = uHaloC[s].xy + d;
          if (part == 4) br *= 1.0 + uMainBoost;
          br *= uHaloBright*step(0.01, uHaloS[s]);
        }
        if (part == 7) { vec3 d = p - uCrownC; d.xz = rot(uCrownRot)*d.xz; p = uCrownC + d; }
        if (part == 8) { float f = fract(uT*0.9 + aSeed*7.0); p.y += f*80.0*uPx; br *= 1.0 - f; }
        return p;
      }
      void main(){
        float bA, bB; vec3 cA, cB;
        vec3 pA = dyn(texture2D(uA0, aUV), texture2D(uA1, aUV), bA, cA);
        vec3 pB = dyn(texture2D(uB0, aUV), texture2D(uB1, aUV), bB, cB);
        float st = (h1(aSeed*3.7) - 0.5)*0.1;
        float pr = clamp((uT - uT0 - st)/uDur, 0.0, 1.0);
        // 变形缓动：easeOutExpo 式的快速到位 + 约 8% 的过冲回弹；吸进光点用 easeInCubic
        float e = uEaseIn > 0.5 ? pr*pr*pr : 1.0 - exp(-7.0*pr)*cos(9.0*pr);
        if (pr >= 1.0) e = 1.0;
        float ec = clamp(e, 0.0, 1.0);
        vec3 p = mix(pA, pB, e);
        float br = mix(bA, bB, ec); vec3 col = mix(cA, cB, ec);
        bool star = texture2D(uB1, aUV).y < 0.5 && texture2D(uA1, aUV).y < 0.5;
        if (!star) {
          // 路径：绕画面中心转约 90 度 + curl 噪声扰动（幅度约画面高度的 12%）
          vec2 d = p.xy - uCen.xy;
          d = rot(uSpin*1.5708*4.0*ec*(1.0 - ec))*d;          // 中途转到约 90 度，起止都不跳
          float mid = sin(3.14159*ec);
          d += uCurl*uFrameH*mid*vec2(sin(p.y*0.7 + aSeed*31.0 + uT*0.5), cos(p.x*0.7 + aSeed*17.0 - uT*0.5))*(0.5 + h1(aSeed*9.1));
          // 吸气：向中心收缩并旋转；普通拍：向外弹 2%
          d = rot(uSwirl)*d*(1.0 - uContract)*(1.0 + uPop);
          p.xy = uCen.xy + d;
        }
        br *= 0.85 + 0.15*sin(uT*6.0 + aSeed*40.0);
        vec4 mv = modelViewMatrix*vec4(p, 1.0);
        gl_Position = projectionMatrix*mv;
        gl_PointSize = (1.2 + 1.2*h1(aSeed*5.3))*uScale;
        vCol = col*br*uAlpha;
        if (uOnly >= 0.0 && abs(texture2D(uB1, aUV).y - uOnly) > 0.5) vCol = vec3(0.0);   // 调试：只显示某个部件
      }`,
    fragmentShader: /* glsl */`varying vec3 vCol;
      void main(){ vec2 c = gl_PointCoord - 0.5; float d = length(c)*2.0; if (d > 1.0) discard; gl_FragColor = vec4(vCol*(1.0 - d*d*0.6), 1.0); }`,
  });
}
// 锥形体积光：沿平面的 +y 方向从眼睛射出，越远越宽越淡
function beamMaterial() {
  return new THREE.ShaderMaterial({
    uniforms: { uCol: { value: new THREE.Color() }, uCore: { value: new THREE.Color() }, uInt: { value: 0 }, uT: { value: 0 } },
    transparent: true, depthWrite: false, depthTest: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
    vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix*modelViewMatrix*vec4(position, 1.0); }',
    fragmentShader: /* glsl */`uniform vec3 uCol, uCore; uniform float uInt, uT; varying vec2 vUv;
      void main(){
        float a = 1.0 - vUv.y;                      // 0 在眼睛，1 在远端
        float w = mix(0.03, 0.55, sqrt(a));
        float x = (vUv.x - 0.5)/w;
        float cone = exp(-x*x*4.0)*smoothstep(1.0, 0.0, a)*smoothstep(0.0, 0.03, a);
        float dust = 0.8 + 0.2*sin(a*60.0 - uT*4.0 + vUv.x*20.0);
        vec3 c = mix(uCol, uCore, exp(-x*x*30.0)*(1.0 - a));
        float glare = exp(-a*a*400.0)*exp(-pow(vUv.x - 0.5, 2.0)*300.0)*2.0;
        gl_FragColor = vec4(c*(cone*dust*(1.0 - a*0.7)*0.6 + glare)*uInt, 1.0);
      }`,
  });
}

// ------------------------------------------------------------ 最终合成
const FinalShader = {
  uniforms: { tDiffuse: { value: null }, uRes: { value: new THREE.Vector2(1920, 1080) }, uCA: { value: 0 }, uExp: { value: 1 },
    uShock: { value: new THREE.Vector4(0, 0, 0, 0) }, uShockCol: { value: new THREE.Color(1, 1, 1) },
    uTint: { value: new THREE.Color() }, uTintAmt: { value: 0 }, uScan: { value: new THREE.Vector3(0, 0, 0) }, uScanCol: { value: new THREE.Color(1, 1, 1) }, uFrame: { value: 0 } },
  vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix*modelViewMatrix*vec4(position, 1.0); }',
  fragmentShader: /* glsl */`
    uniform sampler2D tDiffuse; uniform vec2 uRes; uniform float uCA, uExp, uTintAmt, uFrame; uniform vec4 uShock; uniform vec3 uShockCol, uTint, uScan, uScanCol;
    varying vec2 vUv;
    float hh(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7)))*43758.5453); }
    void main(){
      vec2 px = vUv*uRes, d = vUv - 0.5;
      vec2 off = normalize(d + 1e-5)*uCA/uRes;
      vec3 c = vec3(texture2D(tDiffuse, vUv + off).r, texture2D(tDiffuse, vUv).g, texture2D(tDiffuse, vUv - off).b);
      // 这一宗的大片暗色光晕：中心约 12%，到画面边缘降到 0
      float r = length(d*vec2(uRes.x/uRes.y, 1.0));
      c += uTint*0.12*uTintAmt*pow(clamp(1.0 - r/0.95, 0.0, 1.0), 1.6);
      // 冲击波：亮圆环（半径 0→0.7 倍画面宽，线宽 6→1px，透明度 0.8→0）
      if (uShock.w > 0.0) { float dr = length(px - uRes*0.5) - uShock.x; c += uShockCol*uShock.w*exp(-dr*dr/(uShock.y*uShock.y*0.5)); }
      // 系列的扫描线：竖直亮线
      if (uScan.y > 0.0) { float dx = abs(px.x - uScan.x*uRes.x); c += uScanCol*uScan.y*(exp(-dx*dx/(2.0*uRes.x/1920.0*2.0))*0.9 + exp(-dx/(40.0*uRes.x/1920.0))*0.12*(1.0 + uScan.z)); }
      c *= uExp;
      c *= mix(1.0, smoothstep(1.15, 0.35, r), 0.55);
      c += (hh(px + uFrame*13.1) - 0.5)*0.01;
      gl_FragColor = vec4(c, 1.0);
    }`,
};

// ------------------------------------------------------------ 每帧
function setLayer(m, P, t) {
  const u = m.material.uniforms, M = P.morph, A = TEXS[M.A] ?? TEXS.intro, B = TEXS[M.B] ?? TEXS.intro;
  u.uA0.value = A.t0; u.uA1.value = A.t1; u.uB0.value = B.t0; u.uB1.value = B.t1;
  u.uT.value = t; u.uT0.value = M.t0; u.uDur.value = M.dur; u.uEaseIn.value = M.ease === 'in' ? 1 : 0; u.uSpin.value = M.spin; u.uCurl.value = M.curl;
  for (let s = 0; s < 14; s++) {
    const i = s % 7, sin = TLN.SINS[i], T = tones(sin.col);
    u.uDark.value[s].copy(T.dark); u.uMain.value[s].copy(T.main); u.uHigh.value[s].copy(T.high);
    if (s >= 7) { u.uOpen.value[s] = P.mode === 'intro' ? P.open[i] : 0; u.uLit.value[s] = P.mode === 'intro' ? P.lit[i] : 0; u.uHaloS.value[s] = P.haloS[i]; u.uHaloC.value[s].set(...L.introHalo[i].c); u.uHaloR.value[s] = L.introHalo[i].r; }
    else { u.uOpen.value[s] = P.sin === i ? P.open[i] : 0; u.uLit.value[s] = 1; u.uHaloS.value[s] = P.sin === i ? P.haloS[i] : 0; const I = L.idols[i] ?? L.idols[0]; u.uHaloC.value[s].set(...I.hc); u.uHaloR.value[s] = P.mode === 'char' ? 0.6 * I.r : I.r; }
  }
  u.uContract.value = P.contract; u.uPop.value = P.pop; u.uSwirl.value = P.swirl; u.uMainBoost.value = P.mainBoost; u.uHaloBright.value = P.haloBright; u.uRayLen.value = P.rayLen;
  // 旋转：内层 +6°/秒，外环 −4°/秒，放射光 +2°/秒（懒惰减半）
  const slow = P.sin === 3 ? 0.5 : 1, D2R = Math.PI / 180;
  u.uRotIn.value = 6 * D2R * t * slow; u.uRotOut.value = -4 * D2R * t * slow; u.uRotRay.value = 2 * D2R * t * slow;
  const I0 = L.idols[0]; if (I0 && I0.crownC) { u.uCrownC.value.set(...I0.crownC); u.uCrownRot.value = 0.5 * t; }
  u.uCen.value.copy(L.center); u.uFrameH.value = L.frameH; u.uPx.value = L.px; u.uScale.value = W / FW;
}

export function render(t) {
  const P = TLN.phase(t);
  // 主体 + 拖尾（拖尾只在变形中和变形结束后 0.2 秒内开启）
  setLayer(layers[0], P, t); layers[0].material.uniforms.uAlpha.value = 1; layers[0].material.uniforms.uOnly.value = window.ONLY ?? -1;
  for (let j = 1; j <= 2; j++) {
    const tj = t - j / 30, Pj = TLN.phase(tj);
    const on = P.morph.trail;
    layers[j].visible = on > 0.001;
    if (layers[j].visible) { setLayer(layers[j], Pj, tj); layers[j].material.uniforms.uAlpha.value = (j === 1 ? 0.55 : 0.3) * on; }
  }
  // 眼睛的锥形光
  const I = P.sin >= 0 ? L.idols[P.sin] : null;
  beams.forEach((m, e) => {
    m.visible = !!(I && P.beam > 0.001 && P.mode === 'idol');
    if (!m.visible) return;
    // 光锥长约画面高度的 30%，大幅朝镜头方向倾斜：画面上是从眼睛向下、向外张开的一片光
    const len = 0.3 * L.frameH, eye = I.eyes[e], tilt = 1.15;
    m.scale.set(len * 0.9, len, 1);
    m.rotation.set(-tilt, 0, (e ? 1 : -1) * 0.18);
    const dir = new THREE.Vector3(0, -1, 0).applyEuler(m.rotation);
    m.position.set(eye[0] + dir.x * len * 0.5, eye[1] + dir.y * len * 0.5, eye[2] + 0.05 + dir.z * len * 0.5);
    const T = tones(TLN.SINS[P.sin].col);
    m.material.uniforms.uCol.value.copy(T.main); m.material.uniforms.uCore.value.copy(T.high); m.material.uniforms.uInt.value = 0.9 * P.beam; m.material.uniforms.uT.value = t;
  });
  // 镜头：推近（缩放视野）+ 震动（像素平移）
  camera.zoom = P.zoom;
  const sx = P.shake[0] * W / FW, sy = P.shake[1] * W / FW;
  camera.setViewOffset(W, H, -sx, -sy, W, H);
  camera.updateProjectionMatrix();
  bloom.strength = P.bloom; bloom.radius = 0.6; bloom.threshold = 0.15;
  const fu = final.uniforms, sc = W / FW;
  fu.uCA.value = P.ca * sc; fu.uExp.value = P.exposure; fu.uFrame.value = Math.round(t * 30);
  const hc = P.sin >= 0 ? tones(TLN.SINS[P.sin].col).high : new THREE.Color(0.9, 0.9, 0.95);
  fu.uShockCol.value.copy(hc);
  if (P.shock) fu.uShock.value.set(P.shock.r * W, P.shock.w * sc, 0, P.shock.a); else fu.uShock.value.set(0, 1, 0, 0);
  if (P.tint) fu.uTint.value.set(P.tint); fu.uTintAmt.value = P.tintAmt;
  if (P.scan) fu.uScan.value.set(P.scan.x, P.scan.a, P.scan.hot); else fu.uScan.value.set(0, 0, 0);
  composer.render();
  // 2D 文字
  ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = 1; ctx.drawImage(glCanvas, 0, 0);
  ctx.setTransform(sc, 0, 0, sc, 0, 0);
  drawCaptions(P);
  window.LAST = { mode: P.mode, sin: P.sin, caps: P.caps.map(c => c.text) };
}

// ------------------------------------------------------------ 文字：画面下方中央；黑色渐变底（75% 处开始，到底部 70% 不透明）
function drawCaptions(P) {
  const a = P.caps.reduce((m, c) => Math.max(m, c.alpha), 0);
  if (a <= 0) return;
  const g = ctx.createLinearGradient(0, FH * 0.75, 0, FH);
  g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, `rgba(0,0,0,${0.7 * a})`);
  ctx.fillStyle = g; ctx.fillRect(0, FH * 0.75, FW, FH * 0.25);
  for (const c of P.caps) {
    if (c.alpha <= 0) continue;
    const color = c.color === 'high' ? highCss(TLN.SINS[c.sin].col) : c.color || '#FFFFFF';
    const y = FH * c.y + c.rise;
    ctx.save(); ctx.globalAlpha = c.alpha; ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic';
    ctx.font = `700 ${c.size}px "Noto Serif CJK SC"`;
    // 解析〔亮〕高亮
    const segs = []; let cur = '', hi = false; const s = c.text;
    for (let i = 0; i < s.length;) { if (s.startsWith('〔亮〕', i)) { segs.push([cur, hi]); cur = ''; hi = true; i += 3; continue; } if (s.startsWith('〔/亮〕', i)) { segs.push([cur, hi]); cur = ''; hi = false; i += 4; continue; } cur += s[i++]; }
    segs.push([cur, hi]);
    const total = segs.reduce((w, [t]) => w + ctx.measureText(t).width, 0);
    let x = FW / 2 - total / 2; ctx.textAlign = 'left';
    for (const [tx, h] of segs) {
      if (!tx) continue;
      ctx.lineWidth = 2; ctx.strokeStyle = 'rgba(0,0,0,0.85)'; ctx.strokeText(tx, x, y);
      ctx.shadowColor = h ? 'rgba(255,255,255,0.9)' : color; ctx.shadowBlur = h ? 22 : c.size < 32 ? 12 : 8;
      ctx.globalAlpha = c.alpha * (h ? 1 : 0.4); ctx.fillStyle = h ? '#FFFFFF' : color; ctx.fillText(tx, x, y);
      ctx.globalAlpha = c.alpha; ctx.shadowBlur = 0; ctx.fillStyle = h ? '#FFFFFF' : color; ctx.fillText(tx, x, y);
      x += ctx.measureText(tx).width;
    }
    if (c.sub) { ctx.font = `700 28px "Noto Serif CJK SC"`; ctx.textAlign = 'center'; ctx.globalAlpha = c.alpha * 0.7; ctx.fillStyle = '#FFFFFF'; ctx.fillText(c.sub, FW / 2, y + 44); }
    ctx.restore();
  }
}
