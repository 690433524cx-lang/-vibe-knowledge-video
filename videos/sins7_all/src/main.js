// 《七宗罪，其实是大脑的七种出厂设置》合集：1920×1080、30fps、约 65 秒。每帧 render(t) 只由 t 决定；所有时间来自 beats_extended.json
import * as THREE from 'three';
import { K, FW, FH, initCore, updateSparks, tickMaterials, setCamera } from './core.js';
import { parseOBJ, PB } from './geo.js';
import { setLoop, clamp, lerp, hash } from './util.js';
import { SHARED } from './mat.js';
import { setCtx, BOXES } from './text.js';
import * as H from './halo.js';
import { buildExpressionHead } from './faces.js';
import * as SHOW from './show.js';

const q = new URLSearchParams(location.search);
export const PREVIEW = q.get('preview') === '1';
const UPTO = q.has('upto') ? Number(q.get('upto')) : 6;
let BEATS, TL, outCtx, glCanvas, outCanvas, grain = [];
const S = {};
const C3 = h => new THREE.Color(h);

export async function init() {
  BEATS = await (await fetch('beats_extended.json')).json();
  TL = 65.0; BEATS.duration = TL;
  setLoop(TL); SHARED.uLoop.value = TL;
  glCanvas = document.getElementById('gl'); outCanvas = document.getElementById('out');
  const W = PREVIEW ? FW / 2 : FW, Hh = PREVIEW ? FH / 2 : FH;
  glCanvas.width = outCanvas.width = W; glCanvas.height = outCanvas.height = Hh;
  outCtx = outCanvas.getContext('2d');
  initCore(glCanvas, { W, H: Hh, bolts: [] });
  window.K = K;
  K.bloom.radius = 0.5; K.bloom.threshold = 0.5;   // 只让眼睛、光环、道具的亮点发光，辉光不盖在脸上
  const k = PREVIEW ? 0.5 : 1;
  // ---- 脸：中性闭眼（抽签的灰色脸）+ 每一宗的表情；全尺寸用于特写，轻量版用于那一排
  const obj = parseOBJ(await (await fetch('assets/canonical_face_model.obj')).text());
  const heads = {};
  const lite = (pb, fc) => pb.subset(i => i >= fc ? hash(i * 0.37) < 0.2 : (pb.m[i * 2 + 1] > 0 ? hash(i * 0.71) < 0.75 : hash(i * 0.53) < 0.42));   // 那一排的脸：五官点保留得多，才清楚
  const ids = ['neutral', ...SHOW.SINS.slice(0, UPTO + 1).map(s => s.id)]; if (UPTO >= 0) ids.push('prideGag');
  for (const id of ids) {
    const { pb, faceCount } = buildExpressionHead(obj, id, k);
    heads[id] = pb.geometry(THREE); heads[id + 'Lite'] = lite(pb, faceCount).geometry(THREE);
  }
  for (const s of SHOW.SINS.slice(UPTO + 1)) { heads[s.id] = heads.neutral; heads[s.id + 'Lite'] = heads.neutralLite; }
  // 身体（脖子、肩、上胸）：沿用第一版之后做的实心粒子身体
  const f = new Float32Array(await (await fetch('assets/body_points.bin')).arrayBuffer()), body = new PB(), step = PREVIEW ? 6 : 3;
  for (let i = 0; i < f.length / 6; i += step) body.add([f[i * 6], f[i * 6 + 1], f[i * 6 + 2]], [f[i * 6 + 3], f[i * 6 + 4], f[i * 6 + 5]], (i * 0.618) % 1, [0, 0, 0], [0, 0, 0, 1], [0.85, 4]);
  heads.body = body.geometry(THREE);
  heads.bodyLite = body.subset(i => hash(i * 0.917) < 0.3).geometry(THREE);
  // ---- 远景：暗色光晕、三层雾、上方的光
  S.bgGlow = new THREE.Mesh(new THREE.PlaneGeometry(60, 34), H.glowPlane()); S.bgGlow.position.set(0, 0.5, -16); S.bgGlow.renderOrder = -40; K.scene.add(S.bgGlow);
  S.fog = [[-3.6, 30, 14, 1.3], [-7, 40, 20, 4.1], [-11, 56, 28, 7.7]].map(([z, w, h, seed]) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), H.fogPlane(seed)); m.position.set(0, 0, z); m.renderOrder = -30; K.scene.add(m); return m; });
  S.dust = K.dust;
  const audioEnv = await (await fetch('audio_env.json')).json();
  SHOW.build(S, BEATS, heads, audioEnv);
  for (let j = 0; j < 4; j++) {
    const c = document.createElement('canvas'); c.width = 480; c.height = 270;
    const x = c.getContext('2d'), im = x.createImageData(480, 270);
    for (let i = 0; i < 480 * 270; i++) { const v = (hash(i * 0.731 + j * 977.31 + 0.5) * 255) | 0; im.data[i * 4] = im.data[i * 4 + 1] = im.data[i * 4 + 2] = v; im.data[i * 4 + 3] = 255; }
    x.putImageData(im, 0, 0); grain.push(c);
  }
  for (const w of [700, 900]) { outCtx.font = `${w} 20px "Noto Serif CJK SC"`; outCtx.fillText('七宗罪', -100, -100); }
  window.META = { duration: TL, fps: PREVIEW ? 15 : 30, beats: BEATS, events: SHOW.events() };
}

export function render(t) {
  tickMaterials(t);
  const F = SHOW.frame(t);
  // 镜头 + 震动（最大 6px）
  const c = window.CAM_OVERRIDE ?? F.cam, sh = window.CAM_OVERRIDE ? 0 : (F.shake ?? 0);
  const px = 2 * Math.tan(17.5 * Math.PI / 180) * Math.hypot(c.pos[2] - c.target[2], c.pos[1] - c.target[1]) / FH * 6 * sh;
  setCamera({ pos: [c.pos[0] + px * Math.sin(t * 91), c.pos[1] + px * Math.cos(t * 73), c.pos[2]], target: [c.target[0] + px * Math.sin(t * 91), c.target[1] + px * Math.cos(t * 73), c.target[2]], fov: c.fov });
  // 雾和光尘染上这一宗的颜色（抽签时是灰色）
  // 背景：近黑色的深空；只有人物身后有一团颜色光晕（在 show.js 里），雾只留很淡的一层
  const fc = C3(F.auraCol), kk = F.auraK * 0.35;
  const fu = K.final.uniforms;
  const nb = { b: C3('#050508'), d: fc.clone().multiplyScalar(0.05 * kk), m: fc.clone().multiplyScalar(0.09 * kk), h: fc.clone().lerp(C3('#FFFFFF'), 0.3).multiplyScalar(0.14 * kk) };
  ['b', 'd', 'm', 'h'].forEach(x => { fu['uN0' + x].value.copy(nb[x]); fu['uN1' + x].value.copy(nb[x]); });
  fu.uTide.value = 0; fu.uTideMix.value = 0; fu.uBright.value = 1;
  S.bgGlow.material.uniforms.uCol.value.copy(fc); S.bgGlow.material.uniforms.uInt.value = 0.03 * kk;
  S.fog.forEach((m, j) => { m.material.uniforms.uCol.value.copy(fc).lerp(C3('#9A90B0'), 0.25); m.material.uniforms.uInt.value = [0.004, 0.007, 0.012][j] * kk; });   // 雾只留在远处和画面边缘
  K.dust.material.uniforms.uColA.value.copy(fc).lerp(C3('#FFFFFF'), 0.4); K.dust.material.uniforms.uColB.value.set('#FFFFFF');
  K.dust.material.uniforms.uCam.value.copy(K.camera.position); K.dust.material.uniforms.uAlpha.value = 0.4 + 0.6 * kk;
  const dir = new THREE.Vector3(); K.camera.getWorldDirection(dir);
  fu.uOff.value.set(Math.atan2(dir.x, -dir.z) * 0.55, Math.asin(clamp(dir.y, -1, 1)) * 0.55); fu.uFlash.value.set(0.5, 0.6, 0);
  K.camera.updateMatrixWorld();
  const qn = new THREE.Quaternion(); K.camera.getWorldQuaternion(qn);
  for (const g of K.glows) if (g.userData.billboard && g.visible) { const pq = new THREE.Quaternion(); g.parent.getWorldQuaternion(pq); g.quaternion.copy(pq.invert().multiply(qn)); }
  S.spot.quaternion.copy(qn);
  S.chars?.forEach?.(() => {});
  for (const C of (SHOW.charsList?.() ?? [])) { C.aura.quaternion.copy(qn); C.rays.quaternion.copy(qn); }
  K.bloom.strength = F.bloom;
  if (F.sparkCol) { K.sparks.material.uniforms.uColA.value.set(F.sparkCol); K.sparks.material.uniforms.uColB.value.set('#FFFFFF'); }
  updateSparks(t, F.bursts ?? []);
  fu.uCA.value = F.ca ? 0.002 : 0.0006; fu.uVig.value = 1.35; fu.uGlitch.value = 0; fu.uTime.value = t;
  K.composer.render();
  BOXES.length = 0;
  outCtx.setTransform(1, 0, 0, 1, 0, 0); outCtx.globalAlpha = 1; outCtx.drawImage(glCanvas, 0, 0);
  // 甩镜头的运动模糊：沿运动方向叠几层位移的画面
  if (Math.abs(F.blur ?? 0) > 0.02) { const L = 90 * F.blur * K.scale; outCtx.save(); outCtx.globalCompositeOperation = 'lighter'; for (let j = 1; j <= 5; j++) { outCtx.globalAlpha = 0.16 * Math.abs(F.blur) * (1 - j / 6); outCtx.drawImage(glCanvas, -L * j / 5, 0); } outCtx.restore(); }
  outCtx.setTransform(K.scale, 0, 0, K.scale, 0, 0);
  setCtx(outCtx, t);
  SHOW.draw2D(t, outCtx, F);
  outCtx.setTransform(1, 0, 0, 1, 0, 0);
  if (!window.NO_GRAIN) { outCtx.save(); outCtx.globalAlpha = 0.035; outCtx.drawImage(grain[Math.floor(t * 30 + 0.5) % 4], 0, 0, K.W, K.H); outCtx.restore(); }
  window.LAST_BOXES = BOXES.slice();
}
