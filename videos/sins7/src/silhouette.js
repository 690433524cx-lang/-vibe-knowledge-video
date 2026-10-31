// 侧脸剪影神像：Lee Perry-Smith 头部扫描的正侧面轮廓（tools/profile.py 生成），脸朝左
// 组成：不透明的近黑剪影（挡住身后的光环）+ 内部缓慢流动的淡粒子 + 沿轮廓流动的发光边（白色核心、外面是该宗颜色，往内约 20px 渐变）
//       + 半闭往下看的眼缝 + 体内的侧面粒子大脑（扫描后透出）
import * as THREE from 'three';
import { K, glow } from './core.js';
import { SHARED } from './mat.js';
import { buildBrainSide } from './long_assets.js';
import { brainMaterial } from './idol.js';
import { rng, TAU } from './util.js';

export let META = null;                 // 当前（最近一次 createSilhouette 用的）姿态的关键点
const POSES = {};                       // 姿态名 → { meta, rim, fill }
let BRAIN_GEO = null;
const C3 = h => new THREE.Color(h);
export const CORE = '#F3E8FF';

// 每种姿态一套轮廓（tools/profile.py 生成）：_level 头保持水平（傲慢），_down 低头约 10 度
export async function loadProfile(k = 1, names = ['_level', '_down']) {
  for (const tag of names) {
    const meta = await (await fetch(`assets/profile${tag}.json`)).json();
    const buf = await (await fetch(`assets/profile${tag}.bin`)).arrayBuffer();
    const f = new Float32Array(buf), nr = f[0], nf = f[1];
    const rimA = f.subarray(2, 2 + nr * 5), fillA = f.subarray(2 + nr * 5, 2 + nr * 5 + nf * 2);
    const step = k < 1 ? 2 : 1;
    // 轮廓光带：position(x, y, 0)、aS 弧长、aDep 深度（>0 往内，<0 往外的柔光）、aW 亮度权重（脸最亮）
    const n = Math.floor(nr / step), P = new Float32Array(n * 3), S = new Float32Array(n), D = new Float32Array(n), W = new Float32Array(n), Sd = new Float32Array(n);
    for (let i = 0; i < n; i++) { const j = i * step * 5; P[i * 3] = rimA[j]; P[i * 3 + 1] = rimA[j + 1]; S[i] = rimA[j + 2]; D[i] = rimA[j + 3]; W[i] = rimA[j + 4]; Sd[i] = (i * 0.6180339) % 1; }
    const rim = new THREE.BufferGeometry();
    rim.setAttribute('position', new THREE.BufferAttribute(P, 3)); rim.setAttribute('aS', new THREE.BufferAttribute(S, 1));
    rim.setAttribute('aDep', new THREE.BufferAttribute(D, 1)); rim.setAttribute('aW', new THREE.BufferAttribute(W, 1)); rim.setAttribute('aSeed', new THREE.BufferAttribute(Sd, 1));
    const m = Math.floor(nf / step), Q = new Float32Array(m * 3), Qs = new Float32Array(m);
    for (let i = 0; i < m; i++) { Q[i * 3] = fillA[i * step * 2]; Q[i * 3 + 1] = fillA[i * step * 2 + 1]; Qs[i] = (i * 0.7548776) % 1; }
    const fill = new THREE.BufferGeometry();
    fill.setAttribute('position', new THREE.BufferAttribute(Q, 3)); fill.setAttribute('aSeed', new THREE.BufferAttribute(Qs, 1));
    POSES[tag] = { meta, rim, fill };
  }
  META = POSES[names[0]].meta;
  BRAIN_GEO = buildBrainSide(511, 1.2 * k).geometry(THREE);
}

// ------------------------------------------------------------ 材质
function rimMaterial(hex) {
  return new THREE.ShaderMaterial({
    uniforms: { ...SHARED, uTime: { value: 0 }, uCore: { value: C3(CORE) }, uCol: { value: C3(hex) }, uBright: { value: 1 }, uScale: { value: 1 }, uFlow: { value: 1 } },
    transparent: true, depthWrite: false, depthTest: false, blending: THREE.AdditiveBlending,
    vertexShader: /* glsl */`
      attribute float aS, aDep, aW, aSeed; uniform float uTime, uBright, uScale, uFlow; varying vec3 vCol; varying float vB;
      uniform vec3 uCore, uCol;
      void main(){
        vec4 mv = modelViewMatrix*vec4(position, 1.0); gl_Position = projectionMatrix*mv;
        // 沿轮廓流动的电流：从额头流向下巴、脖子（aS 增大的方向）
        float wave = pow(0.5 + 0.5*sin(aS*7.0 - uTime*5.0), 10.0);
        float wave2 = pow(0.5 + 0.5*sin(aS*2.1 - uTime*2.2 + 1.3), 4.0);
        float flow = 0.72 + uFlow*(1.1*wave + 0.35*wave2);
        float dd = abs(aDep);
        float edge = aDep >= 0.0 ? pow(1.0 - aDep, 1.7) : 0.28*exp(-dd*3.0);
        vB = aW*edge*flow*uBright*(0.75 + 0.25*sin(aSeed*40.0 + uTime*3.0));
        vCol = aDep >= 0.0 ? mix(uCore, uCol, smoothstep(0.02, 0.5, aDep)) : uCol;
        gl_PointSize = (aDep >= 0.0 ? 2.6 - 1.2*aDep : 2.4)*uScale;
      }`,
    fragmentShader: /* glsl */`varying vec3 vCol; varying float vB;
      void main(){ vec2 c = gl_PointCoord - 0.5; float d = length(c)*2.0; if (d > 1.0) discard; gl_FragColor = vec4(vCol*vB*exp(-d*d*2.5), 1.0); }`,
  });
}
function fillMaterial(hex) {
  return new THREE.ShaderMaterial({
    uniforms: { ...SHARED, uTime: { value: 0 }, uCol: { value: C3(hex).lerp(C3(CORE), 0.2) }, uBright: { value: 0.15 }, uScale: { value: 1 } },
    transparent: true, depthWrite: false, depthTest: false, blending: THREE.AdditiveBlending,
    vertexShader: /* glsl */`
      attribute float aSeed; uniform float uTime, uBright, uScale; varying float vB;
      void main(){
        vec3 p = position;
        p.xy += 0.012*vec2(sin(uTime*0.6 + aSeed*31.0), cos(uTime*0.5 + aSeed*17.0));
        vec4 mv = modelViewMatrix*vec4(p, 1.0); gl_Position = projectionMatrix*mv;
        // 缓慢上升的明暗流：剪影里有体积感
        float band = 0.35 + 0.65*pow(0.5 + 0.5*sin(p.y*4.0 + p.x*1.5 - uTime*0.7), 3.0);
        vB = uBright*band*(0.5 + 0.5*fract(aSeed*91.7))*step(0.55, fract(aSeed*13.7));
        gl_PointSize = 1.5*uScale;
      }`,
    fragmentShader: /* glsl */`uniform vec3 uCol; varying float vB;
      void main(){ vec2 c = gl_PointCoord - 0.5; if (length(c) > 0.5) discard; gl_FragColor = vec4(uCol*vB, 1.0); }`,
  });
}
// 不透明的剪影：x < uSeeX 的部分变成半透明（B 卡扫描）
function bodyMaterial() {
  return new THREE.ShaderMaterial({
    uniforms: { uCol: { value: C3('#06030A') }, uSeeX: { value: -99 }, uSee: { value: 0 }, uAlpha: { value: 1 } },
    transparent: true, depthWrite: false, depthTest: false,
    vertexShader: 'varying vec3 vW; void main(){ vec4 w = modelMatrix*vec4(position, 1.0); vW = w.xyz; gl_Position = projectionMatrix*viewMatrix*w; }',
    fragmentShader: /* glsl */`uniform vec3 uCol; uniform float uSeeX, uSee, uAlpha; varying vec3 vW;
      void main(){ float a = uAlpha*(1.0 - uSee*smoothstep(uSeeX + 0.02, uSeeX - 0.04, vW.x)); gl_FragColor = vec4(uCol, a); }`,
  });
}

// ------------------------------------------------------------ 一尊侧脸神像
export function createSilhouette(sin, o = {}) {
  const PO = POSES[o.pose ?? '_down'], M = PO.meta; META = M;
  const root = new THREE.Group(); K.scene.add(root);
  const pivot = new THREE.Group(); root.add(pivot);       // 绕脖子根部转动（抬头）
  const g = new THREE.Group(); pivot.add(g);
  const PIV = [0.1, -0.55];
  pivot.position.set(PIV[0], PIV[1], 0); g.position.set(-PIV[0], -PIV[1], 0);
  const shape = new THREE.Shape(M.contour.map(([x, y]) => new THREE.Vector2(x, y)));
  const body = new THREE.Mesh(new THREE.ShapeGeometry(shape), bodyMaterial()); body.renderOrder = 5; body.frustumCulled = false; g.add(body);
  const fill = new THREE.Points(PO.fill, fillMaterial(sin.col)); fill.renderOrder = 6; fill.frustumCulled = false; g.add(fill); K.mats.push(fill.material);
  const brain = new THREE.Points(BRAIN_GEO, brainMaterial(sin.col)); brain.renderOrder = 7; brain.frustumCulled = false;
  brain.position.set(M.brain.pos[0], M.brain.pos[1], 0.02); brain.scale.setScalar(M.brain.scale); brain.rotation.z = M.brain.rot; brain.visible = false; g.add(brain); K.mats.push(brain.material);
  const rim = new THREE.Points(PO.rim, rimMaterial(sin.col)); rim.renderOrder = 8; rim.frustumCulled = false; g.add(rim); K.mats.push(rim.material);
  // 眼缝：细长、半闭、略向下
  const eye = glow(5, sin.col, [0.16, 0.05], g, { billboard: false, order: 9, half: [0.08, 0.025], ell: [0.052, 0.0045], core: CORE });
  eye.position.set(M.eye[0], M.eye[1], 0.03); eye.rotation.z = 0.16 + M.brain.rot;   // 光微微朝下
  const eyeHalo = glow(0, sin.col, [0.22, 0.12], g, { billboard: false, order: 9, core: CORE });
  eyeHalo.position.copy(eye.position);
  return { root, pivot, g, body, fill, rim, brain, eye, eyeHalo, sin, M, feat: {} };
}
