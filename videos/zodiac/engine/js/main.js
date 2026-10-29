// 导演：纯函数 render(t)。先渲 WebGL（星云 → 粒子 → 辉光 → 色差暗角），画到 outCanvas，再叠 2D 文字和最上层后期。
// 画面只由 t 决定：不读 Date / Math.random / requestAnimationFrame。
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { PAL } from './particles.js';
import { buildCreature } from './creature.js';
import { buildRing, SIGN_IDS } from './ring.js';
import { buildStarmap, scr } from './starmap.js';
import { buildBackground } from './background.js';
import { buildElementFX, buildBodyFire, buildShockwave, buildVortex, buildBursts, buildTextParticles } from './fx.js';
import { setTextCtx, resetBoxes, getBoxes, glowLine, metalTitle, label, traitBadge, factBlock, fnt } from './text.js';
import { TAU, D2R, clamp, lerp, prog, outExpo, outBack, sine, in2, pulse, win, track, mod, cnNum, hash, rng } from './util.js';

const params = new URLSearchParams(location.search);
const SIGN = params.get('sign') || 'leo';
export const W = +(params.get('w') || 1080), H = +(params.get('h') || 1920), Q = +(params.get('q') || 1);
const S = W / 1080;               // 逻辑坐标（1080×1920）→ 画布像素
const OV_D = 10;                  // 叠加层离相机的距离
const UPP = 2 * OV_D * Math.tan(20 * D2R) / 1920; // 叠加层：1 逻辑像素对应的世界单位
export const K = {};

// ------------------------------------------------------------ 事件表
const IMPACTS = [[3.1, 1.0], [8.0, 1.7], [13.4, 1.0], [17.9, 1.7], [20.0, 0.8]];
const FLASHES = [[3.1, 0.35], [8.0, 0.40], [13.4, 0.30], [17.9, 0.35]];
const WAVES = [[3.1, 0.8], [8.0, 1.2], [13.4, 0.65]];

const FinalShader = {
  uniforms: { tDiffuse: { value: null }, tNeb: { value: null }, uCA: { value: 0.0015 }, uVig: { value: 0.5 }, uNebAmt: { value: 1 }, uBlack: { value: 0.06 }, uSat: { value: 1.15 } },
  vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.0); }`,
  fragmentShader: /* glsl */`
    uniform sampler2D tDiffuse, tNeb; uniform float uCA, uVig, uNebAmt, uBlack, uSat; varying vec2 vUv;
    void main(){
      vec2 d = vUv - 0.5;
      vec3 c;
      // 色差：红蓝通道沿径向错开
      c.r = texture2D(tDiffuse, vUv + d*uCA*2.0).r;
      c.g = texture2D(tDiffuse, vUv).g;
      c.b = texture2D(tDiffuse, vUv - d*uCA*2.0).b;
      // 黑场：压掉大面积辉光的灰雾，让深空保持深黑
      c = max(c - uBlack, 0.0)/(1.0 - uBlack);
      c += texture2D(tNeb, vUv).rgb*uNebAmt;
      c = 1.0 - exp(-c*1.2);
      float l = dot(c, vec3(0.2126, 0.7152, 0.0722));
      c = max(mix(vec3(l), c, uSat), 0.0);
      float v = smoothstep(0.78, 0.22, length(d*vec2(0.5625, 1.0)));
      c *= mix(1.0, v, uVig);
      gl_FragColor = vec4(c, 1.0);
    }`,
};

let cfg, sm, glCanvas, outCanvas, ctx, grain = [], signIdx, DELTA, starOrder, starTimes, segTimes, starCaption, starPtsOverlay;
let renderer, scene, camera, composer, bloom, finalPass, overlay, bg, creature, ring, starmap, efx, bodyFire, wave, vortex, bursts, nameParticles;

export async function init() {
  cfg = await (await fetch(`signs/${SIGN}.json`)).json();
  sm = await (await fetch(`assets/starmap/${SIGN}.json`)).json();
  for (const k of ['bg', 'dark', 'primary', 'secondary', 'highlight']) PAL[k] = new THREE.Color(cfg.palette[k]);
  glCanvas = document.getElementById('glCanvas'); outCanvas = document.getElementById('outCanvas');
  glCanvas.width = outCanvas.width = W; glCanvas.height = outCanvas.height = H;
  ctx = outCanvas.getContext('2d');
  setTextCtx(ctx, cfg.palette);

  renderer = new THREE.WebGLRenderer({ canvas: glCanvas, preserveDrawingBuffer: true, antialias: false, alpha: false, powerPreference: 'high-performance' });
  renderer.setPixelRatio(1); renderer.setSize(W, H, false); renderer.setClearColor(0x000000, 1);
  scene = new THREE.Scene();
  camera = new THREE.PerspectiveCamera(40, W / H, 0.05, 400); scene.add(camera);
  composer = new EffectComposer(renderer);
  composer.setPixelRatio(1); composer.setSize(W, H);
  composer.addPass(new RenderPass(scene, camera));
  bloom = new UnrealBloomPass(new THREE.Vector2(W, H), 1.5, 0.65, 0.12);
  composer.addPass(bloom);
  finalPass = new ShaderPass(FinalShader); composer.addPass(finalPass);
  composer.addPass(new OutputPass());

  // 叠加层：挂在相机前方 10 个单位处，坐标单位是逻辑像素（原点在画面中心，y 向上）
  overlay = new THREE.Group(); overlay.position.set(0, 0, -OV_D); overlay.scale.setScalar(UPP); camera.add(overlay);

  bg = buildBackground(scene, camera, W, H, Q);
  finalPass.uniforms.tNeb.value = bg.rt.texture;
  signIdx = SIGN_IDS.indexOf(cfg.id);
  DELTA = mod(-signIdx * 30 - 4.8, 360) + 720; // 转盘总转角：停下时本星座正好在指针下方
  ring = buildRing(overlay, Q, cfg.id);
  starmap = buildStarmap(overlay, sm, Q);
  creature = buildCreature(cfg, sm, Q, scene);
  efx = buildElementFX(cfg.element, scene, overlay, Q);
  bodyFire = cfg.element === 'fire' ? buildBodyFire(creature, Q) : null;
  wave = buildShockwave(overlay, Q);
  bursts = buildBursts(overlay, Q);
  nameParticles = buildTextParticles(overlay, cfg.name, fnt(900, 190), 540, 560, Q);

  // 星图时间表：按亮度依次点亮；连线按配置顺序，每条 0.18–0.25 秒
  starOrder = sm.stars.map((s, i) => i).sort((a, b) => sm.stars[a].mag - sm.stars[b].mag);
  starTimes = new Array(sm.stars.length);
  starOrder.forEach((si, k) => { starTimes[si] = 4.4 + k * 0.95 / Math.max(1, sm.stars.length - 1); });
  const m = sm.lines.length, dur = clamp(2.0 / m, 0.18, 0.25);
  segTimes = sm.lines.map((_, k) => [5.6 + k * (2.0 - dur) / Math.max(1, m - 1), dur]);
  starCaption = cfg.starCaption || `${cnNum(sm.stars.length)}颗星，连成${cfg.creature.noun || '一位神兽'}。`;
  // 旋涡粒子的起点：星图的星和连线
  const rand = rng(55); starPtsOverlay = [];
  for (const [a, b] of sm.lines) { const A = scr(sm.stars[a].x, sm.stars[a].y), B = scr(sm.stars[b].x, sm.stars[b].y); for (let k = 0; k < 60; k++) { const u = rand(); starPtsOverlay.push([lerp(A[0], B[0], u), lerp(A[1], B[1], u)]); } }
  for (const s of sm.stars) { const p = scr(s.x, s.y); for (let k = 0; k < 40; k++) starPtsOverlay.push(p); }
  vortex = buildVortex(overlay, starPtsOverlay, Q);

  // 噪点贴图（固定种子）。5 张循环：750 帧是 5 的倍数，循环播放时噪点也接得上
  for (let k = 0; k < 5; k++) {
    const c = document.createElement('canvas'); c.width = 270; c.height = 480;
    const x = c.getContext('2d'), im = x.createImageData(270, 480);
    for (let i = 0; i < 270 * 480; i++) { const v = (hash(i * 0.731 + k * 977.31 + 0.5) * 255) | 0; im.data[i * 4] = im.data[i * 4 + 1] = im.data[i * 4 + 2] = v; im.data[i * 4 + 3] = 255; }
    x.putImageData(im, 0, 0); grain.push(c);
  }
  await Promise.all([500, 700, 900].map(w => document.fonts.load(fnt(w, 40), '十二星座召唤狮子座冷知识')));
  Object.assign(K, { cfg, sm, renderer, scene, camera, composer, bloom, finalPass, overlay, bg, creature, ring, starmap, efx, bodyFire, wave, vortex, bursts, nameParticles });
  // 预热：第一次编译着色器
  render(0); render(12); render(0);
}

// ------------------------------------------------------------ 转盘：0–0.4 秒每秒 12°，0.4–3.1 秒先加速后减速，停在本星座
function ringAngle(t) {
  if (t >= 24.0) return 12 * (t - 25);   // 结尾接回第 0 帧的角度
  if (t < 0.4) return 12 * t;
  if (t >= 3.1) return 4.8 + DELTA;
  const u = (t - 0.4) / 2.7, s0 = 12 * 2.7 / DELTA, c = (1 - s0 / 3) * 20;
  const G = s0 * (1 - Math.pow(1 - u, 3)) / 3 + c * (-Math.pow(1 - u, 4) / 4 + Math.pow(1 - u, 5) / 5 + 1 / 20);
  return 4.8 + DELTA * G;
}
const symPos = (phiDeg, r = 360) => [Math.sin(phiDeg * D2R) * r, 80 + Math.cos(phiDeg * D2R) * r];
const wrap180 = a => mod(a + 180, 360) - 180;

// ------------------------------------------------------------ 相机
const P_SUM = { pos: [0, 0.4, 16.5], tgt: [0, 0.4, 0] };
const P_HERO = { pos: [0, -1.5, 15.0], tgt: [0, -0.5, 0] };
function lerpPose(a, b, k) { return { pos: a.pos.map((v, i) => lerp(v, b.pos[i], k)), tgt: a.tgt.map((v, i) => lerp(v, b.tgt[i], k)), roll: lerp(a.roll || 0, b.roll || 0, k) }; }
function orbit(pose, deg, about = [0, 0, 0]) {
  const a = deg * D2R, x = pose.pos[0] - about[0], z = pose.pos[2] - about[2];
  return { ...pose, pos: [about[0] + x * Math.cos(a) + z * Math.sin(a), pose.pos[1], about[2] - x * Math.sin(a) + z * Math.cos(a)] };
}
function dolly(pose, f) { return { ...pose, pos: pose.pos.map((v, i) => pose.tgt[i] + (v - pose.tgt[i]) * f) }; }
function camPose(t) {
  if (DEBUG.cam) return DEBUG.cam;
  if (t < 4.0) return P_SUM;
  if (t < 8.0) { const k = sine(prog(t, 4.0, 8.0)); return { pos: [0, lerp(0.4, 1.1, k), lerp(16.5, 12.5, k)], tgt: [0, lerp(0.4, 1.8, k), 0] }; }
  const V0 = { pos: [0, 0.2, 19.5], tgt: [0, 0.15, 0] }, V1 = { pos: [1.4, -0.6, 17.5], tgt: [0, 0.25, 0] };
  if (t < 12.6) {
    const p = lerpPose(V0, V1, sine(prog(t, 8.0, 12.6)));
    p.roll = t < 9.6 ? lerp(-8, 4, sine(prog(t, 8.0, 9.6))) : lerp(4, 0, sine(prog(t, 9.6, 11.2)));
    return p;
  }
  const H0 = orbit(P_HERO, -6);
  // 扑向观众：先猛推近 30%，再退到英雄机位
  const L = dolly({ pos: [0.9, -1.1, 17.0], tgt: [0, 0.4, 0] }, 0.74);
  if (t < 13.4) return lerpPose(V1, L, inOutQ(prog(t, 12.6, 13.4)));
  if (t < 15.0) return lerpPose(L, H0, sine(prog(t, 13.4, 14.6)));
  if (t < 20.0) return orbit(P_HERO, lerp(-6, 6, sine(prog(t, 15.0, 20.0))));
  const C = dolly(orbit(P_HERO, 6), lerp(1, 0.94, sine(prog(t, 20.0, 24.0))));
  if (t < 24.0) return C;
  return lerpPose(C, P_SUM, sine(prog(t, 24.0, 24.85)));
}
const inOutQ = x => (x < 0.5 ? 2 * x * x : 1 - Math.pow(-2 * x + 2, 2) / 2);
export const DEBUG = { cam: null };

// ------------------------------------------------------------ 每帧
const _f = new THREE.Vector3(), _v = new THREE.Vector3(), _q = new THREE.Quaternion(), _q2 = new THREE.Quaternion();
function project(p, obj) {
  _v.set(p[0], p[1], p[2]); if (obj) _v.applyMatrix4(obj.matrixWorld);
  _v.project(camera);
  return [(_v.x * 0.5 + 0.5) * 1080, (-_v.y * 0.5 + 0.5) * 1920, _v.z];
}

export function render(t) {
  t = clamp(t, 0, 25);
  const bl = []; // 本帧的火花爆发
  // ---------------- 冲击
  let push = 0, shake = 0, env = 0, flashPos = [540, 960], flashStr = 0;
  const smallImpacts = [];
  sm.stars.forEach((s, i) => smallImpacts.push([starTimes[i], 0.32, [s.x, s.y]]));
  segTimes.forEach(([s0, d], k) => { const b = sm.stars[sm.lines[k][1]]; smallImpacts.push([s0 + d, 0.25, [b.x, b.y]]); });
  const impactPos = { 3.1: [540, 520], 8.0: [540, 820], 20.0: [540, 368] };
  for (const [t0, s, pos] of [...IMPACTS.map(([a, b]) => [a, b, null]), ...smallImpacts]) {
    const e = s * pulse(t, t0, 0.5, 9);
    if (e <= 0) continue;
    push += e; env = Math.max(env, e);
    const d = t - t0; if (d < 0.4) shake += s * Math.exp(-9 * d);
    const fp = pos || impactPos[t0] || K.headScreen || [540, 800];
    if (e > flashStr) { flashStr = e; flashPos = fp; }
  }

  // ---------------- 相机
  const pose = camPose(t);
  const pos = new THREE.Vector3(...pose.pos), tgt = new THREE.Vector3(...pose.tgt);
  // 手持漂移：±0.03，周期 5、6.25、8.33 秒（都整除 25 秒）
  pos.x += 0.03 * Math.sin(TAU * t / 5 + 0.3); pos.y += 0.03 * Math.sin(TAU * t / 6.25 + 1.7); pos.z += 0.02 * Math.sin(TAU * t / (25 / 3) + 2.9);
  tgt.x += 0.025 * Math.sin(TAU * t / 6.25 + 4.1); tgt.y += 0.025 * Math.sin(TAU * t / 5 + 5.3);
  _f.copy(tgt).sub(pos); const dist = _f.length(); _f.normalize();
  pos.addScaledVector(_f, dist * 0.07 * Math.min(push, 2));
  const sx = shake * dist * 0.006 * Math.sin(t * 83), sy = shake * dist * 0.006 * Math.cos(t * 67);
  pos.x += sx; pos.y += sy;
  camera.position.copy(pos);
  const roll = (pose.roll || 0) * D2R;
  camera.up.set(Math.sin(roll), Math.cos(roll), 0);
  camera.lookAt(tgt);
  camera.updateMatrixWorld(true);
  overlay.position.set(shake * 10 * UPP * Math.sin(t * 91), shake * 10 * UPP * Math.cos(t * 73), -OV_D);
  overlay.scale.setScalar(UPP * (1 + 0.05 * Math.min(push, 1.5)));

  // ---------------- 公共 uniform
  if (!K.allMats) { K.allMats = []; scene.traverse(o => { if (o.material && o.material.uniforms && o.material.uniforms.uTime) K.allMats.push(o.material); }); }
  for (const m of K.allMats) { m.uniforms.uTime.value = t; if (m.uniforms.uPx) m.uniforms.uPx.value = S; }

  // ---------------- 十二星座符号环
  const A = ringAngle(t);
  const ru = ring.mat.uniforms;
  const ringOn = t < 4.95 || t >= 24.2;
  ring.pts.visible = ringOn;
  if (ringOn) {
    ru.uRingRot.value = A * D2R * 0.5;
    const spinning = t >= 0.4 && t < 3.1;
    for (let i = 0; i < 12; i++) {
      const phi = A + i * 30;
      let [x, y] = symPos(phi);
      let s = 1, b = 1, xs = 0, rs = 0;
      if (spinning) b += 2.6 * Math.exp(-Math.pow(wrap180(phi) / 9, 2));
      if (t >= 3.1 && t < 24.2) {
        if (i === signIdx) {
          const k = outExpo(prog(t, 3.1, 3.5));
          x = lerp(x, 0, k); y = lerp(y, 80, k);
          s = 1 + outExpo(prog(t, 3.1, 3.45));
          b = 1.2 + 2.0 * pulse(t, 3.1, 0.8, 5);
          rs = prog(t, 4.0, 4.9);
        } else xs = prog(t, 3.1, 3.9);
      }
      ru.uSymC.value[i].set(x, y, 0); ru.uSymS.value[i] = s; ru.uSymB.value[i] = b; ru.uSymX.value[i] = xs; ru.uSymR.value[i] = rs;
    }
    ru.uDecoA.value = 1; ru.uDecoX.value = t >= 3.1 && t < 24.2 ? prog(t, 3.1, 3.9) : 0; ru.uDecoR.value = 0;
    ru.uPtrA.value = t < 3.1 ? sine(prog(t, 0.4, 0.6)) * (1 + 0.3 * Math.sin(t * 20)) : (t < 24.2 ? 1 : 0);
    ru.uForm.value = t < 24.2 ? 1 : sine(prog(t, 24.25, 24.85));
  }
  if (t >= 3.1 && t < 4.1) bl.push({ t0: 3.1, x: 0, y: 440, n: 140, speed: 1000, life: 0.9, col: 0, size: 1.2, seed: 3.1, bright: 1.4 });

  // ---------------- 名字溶散成粒子
  nameParticles.visible = t >= 4.0 && t < 4.95;
  nameParticles.material.uniforms.uTA.value = t >= 4.0 ? 1 : 0;
  nameParticles.material.uniforms.uRise.value = prog(t, 4.0, 4.9);

  // ---------------- 星图
  const smOn = t >= 4.3 && t < 8.0;
  starmap.group.visible = smOn;
  const build = prog(t, 7.6, 8.0);
  if (smOn) {
    const lu = starmap.lineMat.uniforms;
    segTimes.forEach(([s0, d], k) => {
      const x = prog(t, s0, s0 + d); lu.uSegP.value[k] = 1 - (1 - x) * (1 - x);
      lu.uFlashSeg.value[k] = pulse(t, s0 + d, 0.45, 7);
      // 生长端的火花
      if (t >= s0 && t < s0 + d + 0.5) {
        const [a, b] = sm.lines[k], P0 = scr(sm.stars[a].x, sm.stars[a].y), P1 = scr(sm.stars[b].x, sm.stars[b].y);
        for (let e = 0; e < 6; e++) {
          const te = s0 + d * e / 6; if (t < te) continue;
          const pe = 1 - Math.pow(1 - e / 6, 2);
          const dx = P1[0] - P0[0], dy = P1[1] - P0[1], L = Math.hypot(dx, dy);
          bl.push({ t0: te, x: lerp(P0[0], P1[0], pe), y: lerp(P0[1], P1[1], pe), n: 9, speed: 260, life: 0.5, col: e % 2, size: 0.9, seed: k * 7 + e, dir: [-dx / L * 0.6, -dy / L * 0.6], spread: 1.0, bright: 1.8 });
        }
      }
    });
    lu.uLineB.value = 1 + 1.4 * build; lu.uFire.value = build; lu.uShake.value = 7 * build;
    starmap.stars.forEach((m, i) => {
      const u = m.material.uniforms, t0 = starTimes[i];
      u.uGrow.value = outExpo(prog(t, t0, t0 + 0.25));
      let it = m.userData.base * (1 + 1.6 * pulse(t, t0, 0.6, 5));
      segTimes.forEach(([s0, d], k) => { if (sm.lines[k].includes(i)) it += 1.2 * pulse(t, s0 + d, 0.45, 7); });
      u.uInt.value = t < t0 ? 0 : it * (1 + 1.6 * build);
      u.uFire.value = build; u.uRot.value = build * 0.4 * Math.sin(t * 40 + i);
      m.position.x = m.userData.x + (hash(i + Math.floor(t * 30)) - 0.5) * 8 * build;
      m.position.y = m.userData.y + (hash(i * 3.1 + Math.floor(t * 30)) - 0.5) * 8 * build;
      if (t >= t0 && t < t0 + 0.7) bl.push({ t0, x: m.userData.x, y: m.userData.y, n: 26, speed: 420, life: 0.7, col: 0, size: 1.0, seed: 40 + i, bright: 1.8 });
    });
  }

  // ---------------- 火焰旋涡
  vortex.visible = t >= 8.0 && t < 11.9;
  vortex.material.uniforms.uVT.value = t - 8.0;

  // ---------------- 冲击波
  let wv = null;
  for (const [t0, s] of WAVES) if (t >= t0 && t < t0 + 0.8) wv = [t0, s];
  wave.visible = !!wv;
  if (wv) {
    const wu = wave.material.uniforms;
    let c = wv[0] === 3.1 ? [540, 520] : wv[0] === 8.0 ? [540, 820] : (K.headScreen || [540, 700]);
    wu.uWaveC.value.set(c[0] - 540, 960 - c[1]); wu.uWaveAge.value = t - wv[0]; wu.uWaveStr.value = wv[1];
  }

  // ---------------- 神兽
  const cr = creature, crOn = t >= 9.4 && t < 24.95;
  cr.group.visible = crOn;
  if (crOn) {
    let scat, swirl;
    if (t < 9.6) { scat = 2; swirl = 3; }
    else if (t < 12.3) { const k = sine(prog(t, 9.6, 12.3)); scat = 2 * (1 - k); swirl = 3 * (1 - k); }
    else if (t < 24.2) { scat = 0; swirl = 0; }
    else { const k = in2(prog(t, 24.2, 24.85)); scat = 2 * k; swirl = -3.2 * k; }
    const opacity = Math.min(sine(prog(t, 9.4, 9.9)), 1 - sine(prog(t, 24.45, 24.88)));
    // 漩涡轴：大致朝向镜头（神兽局部坐标），让粒子绕画面中心旋转
    const axis = new THREE.Vector3(Math.sin(-(cfg.creature.yaw ?? 0) * D2R) * 0.9, 0.3, 0.95).normalize();
    for (const m of cr.mats) {
      const u = m.uniforms;
      u.uScatter.value = scat; u.uSwirl.value = swirl; u.uStagger.value = t < 24 ? 0.55 : 0.3; u.uOpacity.value = opacity;
      u.uSwirlAxis.value.copy(axis); u.uSwirlC.value.set(0, 0.2, 0);
    }
    cr.body.material.uniforms.uGlow.value = 2.2 * Math.min(sine(prog(t, 9.6, 10.4)), 1 - sine(prog(t, 11.8, 13.0)));
    const grow = t < 12.1 ? 0 : outExpo(prog(t, 12.1, 12.5));
    const expand = lerp(0.35, 1.0, outBack(prog(t, 12.1, 12.75))) + 0.3 * pulse(t, 13.4, 1.0, 4) + 0.42 * pulse(t, 17.9, 1.1, 3.2);
    for (const s of cr.strands) {
      const u = s.material.uniforms;
      u.uGrow.value = grow; u.uExpand.value = expand;
      u.uCurl.value = s.material.userData.baseCurl * (1 + 0.7 * pulse(t, 13.4, 1, 3) + 0.9 * pulse(t, 17.9, 1.2, 2.5) + 0.6 * pulse(t, 12.4, 0.8, 4));
      u.uBright.value = s.material.userData.baseBright * (1 + 1.0 * pulse(t, 12.4, 0.8, 4) + 0.25 * pulse(t, 13.4, 0.8, 4) + 0.5 * pulse(t, 17.9, 1.0, 3));
    }
    if (cr.emblem) {
      const eu = cr.emblem.material.uniforms;
      eu.uEmblem.value = t < 9.6 ? 0 : t < 10.0 ? 2.4 * sine(prog(t, 9.6, 10.0)) : lerp(2.4, 1.0, sine(prog(t, 10.0, 12.6)));
      eu.uMainFlash.value = pulse(t, 22.0, 1.4, 2.5);
    }
    // 眼睛：平时半眯暗光；15.0–15.4 缓缓亮起；17.9 瞬间睁大爆亮并射出光芒
    let open = 0.25, inten = 0.55, rays = 0;
    if (t >= 15.0) { const k = sine(prog(t, 15.0, 15.4)); open = lerp(0.25, 0.42, k); inten = lerp(0.55, 1.3, k); }
    if (t >= 17.9) { const k = prog(t, 17.9, 17.98); open = lerp(0.42, 1, k); inten = 1.7 + 1.6 * pulse(t, 17.9, 1.5, 3); rays = 0.35 + 0.8 * pulse(t, 17.9, 1.5, 3); }
    inten *= Math.min(opacity, 1 - prog(t, 24.2, 24.5)) * (t < 12.0 ? 0 : sine(prog(t, 12.0, 12.6)));
    cr.eyes.forEach(e => { const u = e.material.uniforms; u.uOpen.value = open; u.uInt.value = inten; u.uRays.value = rays; });
    // 前倾：扑向观众
    cr.pose.rotation.x = t < 12.6 ? 0 : t < 13.4 ? 0.13 * sine(prog(t, 12.6, 13.4)) : lerp(0.13, 0.03, sine(prog(t, 13.4, 14.4)));
    cr.pose.position.z = cr.pose.rotation.x * 3;
    if (bodyFire) {
      const fu = bodyFire.material.uniforms;
      fu.uAmt.value = (t < 12.2 ? 0 : sine(prog(t, 12.2, 12.7))) * (1 + 0.8 * pulse(t, 13.4, 1, 3) + 1.0 * pulse(t, 17.9, 1.2, 3)) * (1 - prog(t, 24.2, 24.6));
      fu.uExpand.value = expand;
      bodyFire.visible = fu.uAmt.value > 0.001;
    }
    // 可选的整体缓慢旋转（例如天秤座）
    if (cfg.creature.spin) cr.group.rotation.y = ((cfg.creature.yaw ?? 0) + cfg.creature.spin * (t - 15)) * D2R;
    cr.group.updateMatrixWorld(true);
    K.headScreen = project(cr.headCenter, cr.pose).slice(0, 2);
    // 公告板：眼光始终朝向镜头
    camera.getWorldQuaternion(_q);
    for (const e of cr.eyes) { e.parent.getWorldQuaternion(_q2); e.quaternion.copy(_q2.invert().multiply(_q)); }
  }

  // ---------------- 元素粒子
  const ea = track([[0, 0.45], [3.1, 0.45], [3.4, 0.8], [4.0, 0.4], [7.6, 0.4], [8.0, 0.8], [12.6, 0.6], [13.0, 0.65], [24.0, 0.65], [24.85, 0.45], [25, 0.45]], t)
    * (1 + 0.6 * pulse(t, 8.0, 1, 3) + 0.5 * pulse(t, 17.9, 1, 3));
  for (const p of efx.list) p.material.uniforms.uAmt.value = ea;

  // ---------------- 背景
  const nu = bg.nebMat.uniforms;
  nu.uTime.value = t;
  nu.uBright.value = track([[0, 1], [4.0, 1], [4.7, 1.35], [7.6, 1.4], [8.0, 1.5], [9.6, 1.2], [12.6, 1.1], [24.0, 1.1], [24.85, 1], [25, 1]], t);
  nu.uFlashAll.value = 0.7 * pulse(t, 8.0, 1.3, 2.5) + 0.2 * pulse(t, 13.4, 1, 3) + 0.35 * pulse(t, 17.9, 1.1, 3);
  nu.uFlash.value.set(flashPos[0] / 1080, flashPos[1] / 1920, Math.min(flashStr, 1.6) * 1.2);
  camera.getWorldDirection(_v);
  nu.uOff.value.set(Math.atan2(_v.x, -_v.z) * 0.9 + camera.position.x * 0.02, Math.asin(clamp(_v.y, -1, 1)) * 0.9 + camera.position.y * 0.02);
  bg.dustMat.uniforms.uCam.value.copy(camera.position);
  bg.render(renderer);

  // ---------------- 火花
  if (t >= 20.0) cfg.traits.forEach((w, i) => { const [x, y] = TRAIT_POS[i] || [540, 1000]; const t0 = 20.4 + i * 0.3; if (t >= t0 && t < t0 + 0.8) { const P = scr(x, y); bl.push({ t0, x: P[0], y: P[1], n: 60, speed: 380, life: 0.8, col: i % 3, size: 1.1, seed: 300 + i, bright: 1.8 }); } });
  bursts.update(t, bl);

  // ---------------- 后期
  bloom.strength = 1.5 * (1 + 0.8 * Math.min(env, 1));
  finalPass.uniforms.uCA.value = 0.0012 + 0.006 * Math.min(env, 1.4);
  composer.render();

  // ---------------- 2D 合成：WebGL 画面 → 文字 → 暗角、噪点、闪白
  ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
  ctx.drawImage(glCanvas, 0, 0);
  ctx.setTransform(S, 0, 0, S, 0, 0);
  resetBoxes();
  drawText(t);
  // 暗角
  const vg = ctx.createRadialGradient(540, 900, 520, 540, 900, 1250);
  vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(0,0,0,0.42)');
  ctx.fillStyle = vg; ctx.fillRect(0, 0, 1080, 1920);
  // 噪点
  ctx.save(); ctx.globalAlpha *= 0.035; ctx.drawImage(grain[Math.floor(t * 30 + 0.5) % 5], 0, 0, 1080, 1920); ctx.restore();
  // 闪白（高光色，0.25 秒淡出）
  for (const [t0, k] of FLASHES) {
    const d = t - t0; if (d < 0 || d >= 0.25) continue;
    ctx.save(); ctx.globalAlpha *= k * (1 - d / 0.25); ctx.fillStyle = cfg.palette.highlight; ctx.fillRect(0, 0, 1080, 1920); ctx.restore();
  }
  // 给 qa.js：文字包围盒、脸部范围
  const face = crOn && t < 24.2 ? faceBox() : null; // 24.2 秒起狮子开始溶散，不再有“脸”
  window.__frame = { t, boxes: getBoxes(), face };
}

function faceBox() {
  const c = creature.faceCenter, r = creature.faceR * 0.8;
  const pts = [[0, 0, 0], [r, 0, 0], [-r, 0, 0], [0, r, 0], [0, -r, 0]].map(d => project([c[0] + d[0], c[1] + d[1], c[2] + d[2]], creature.pose));
  const xs = pts.map(p => p[0]), ys = pts.map(p => p[1]);
  return { x0: Math.round(Math.min(...xs)), y0: Math.round(Math.min(...ys)), x1: Math.round(Math.max(...xs)), y1: Math.round(Math.max(...ys)) };
}

// ------------------------------------------------------------ 文字
// 特征词位置：左侧两个放在脸的下方（狮子脸朝左，左侧没有空间），右侧两个错落排开
const TRAIT_POS = [[190, 945], [830, 650], [190, 1105], [790, 1030]];
function drawText(t) {
  const name = cfg.name;
  // 召唤字幕：第 0 帧就完整显示
  if (t < 3.32) glowLine('caption0', '十二星座里，今天召唤的是——', 540, 420, 56, 700, t, 0, { instant: true, alpha: 1 - prog(t, 3.18, 3.32) });
  // 星座名砸入画面中央偏上（从 1.5 倍缩到 1 倍）
  if (t >= 3.3 && t < 4.25) metalTitle('name1', name, 540, 560, 190, t, { scale: lerp(1.25, 1, outExpo(prog(t, 3.3, 3.65))), alpha: clamp((t - 3.3) / 0.08) * (1 - prog(t, 4.0, 4.25)), t0: 3.4 });
  // 主星的名字
  if (t >= 4.6 && t < 5.4) {
    const s = sm.stars[sm.main], below = s.y + 72 < 1500;
    label('mainStar', cfg.mainStar, s.x, below ? s.y + 72 : s.y - 72, 36, cfg.palette.highlight, win(t, 4.6, 5.4, 0.15, 0.3));
  }
  if (t >= 5.0 && t < 7.8) glowLine('caption1', starCaption, 540, 330, 56, 700, t, 5.0, { alpha: 1 - prog(t, 7.5, 7.8) });
  // 台词
  if (t >= 15.4 && t < 20.3) glowLine('line1', cfg.line.part1, 540, 1340, 68, 700, t, 15.4, { alpha: (t < 17.9 ? 1 : lerp(1, 0.6, prog(t, 17.9, 18.15))) * (1 - prog(t, 20.0, 20.3)) });
  if (t >= 17.9 && t < 20.3) glowLine('line2', cfg.line.part2, 540, 1430, 68, 700, t, 17.9, { alpha: 1 - prog(t, 20.0, 20.3), blur: 32, glowPasses: 3 });
  // 加冕
  const out = 1 - prog(t, 24.0, 24.4);
  // 从顶部砸入：以字的上沿为锚点从 1.25 倍缩回，保证全程不出安全区
  if (t >= 20.0 && t < 24.4) metalTitle('name2', name, 540, 368, 190, t, { scale: lerp(1.25, 1, outExpo(prog(t, 20.0, 20.35))), anchorTop: true, alpha: clamp((t - 20.0) / 0.06) * out, t0: 20.35 });
  if (t >= 20.4 && t < 24.4) cfg.traits.forEach((w, i) => { const [x, y] = TRAIT_POS[i] || [540, 1000]; traitBadge('trait' + i, w, x, y, t, 20.4 + i * 0.3, out); });
  if (t >= 22.0 && t < 24.4) factBlock('fact', cfg.fact, 1420, t, 22.0, out);
}
