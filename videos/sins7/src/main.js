// 《七宗罪，其实是大脑的七种出厂设置》总集：1920×1080、30fps。每帧 render(t) 只由 t 决定；所有时间来自 beats.json。
// 结构：开头 0–R0（七尊灰白神像 → 扫描点亮 → 两句字幕）｜七张卡 R0–R14（每宗两小节：A 卡「罪」、B 卡「大脑」）｜结尾 R14–结束
import * as THREE from 'three';
import { K, FW, FH, initCore, updateSparks, tickMaterials, setCamera } from './core.js';
import { setLoop, clamp, lerp, lerp3, prog, sine, outExpo, out3, inOut, hash, loopSin } from './util.js';
import { SHARED } from './mat.js';
import { setCtx, glowText, fs, C, BOXES } from './text.js';
import { loadProfile } from './silhouette.js';
import * as H from './halo.js';
import * as CARD from './cards.js';

const q = new URLSearchParams(location.search);
export const PREVIEW = q.get('preview') === '1';
let BEATS, TL;

let outCtx, glCanvas, outCanvas, grain = [];
const S = {};          // 场景对象
export async function init() {
  BEATS = await (await fetch('beats.json')).json();
  TL = BEATS.end;
  setLoop(TL); SHARED.uLoop.value = TL;
  glCanvas = document.getElementById('gl'); outCanvas = document.getElementById('out');
  const W = PREVIEW ? FW / 2 : FW, Hh = PREVIEW ? FH / 2 : FH;
  glCanvas.width = outCanvas.width = W; glCanvas.height = outCanvas.height = Hh;
  outCtx = outCanvas.getContext('2d');
  initCore(glCanvas, { W, H: Hh, bolts: [] });
  window.K = K;
  K.bloom.radius = 0.15; K.bloom.threshold = 0.3;
  const k = PREVIEW ? 0.5 : 1;
  await loadProfile(k);
  // ---- 扫描线与光柱
  S.scanLine = new THREE.Mesh(new THREE.PlaneGeometry(0.03, 7), H.glowPlane()); S.scanLine.renderOrder = 70; K.scene.add(S.scanLine);
  S.scanSoft = new THREE.Mesh(new THREE.PlaneGeometry(0.28, 7), H.glowPlane()); S.scanSoft.renderOrder = 69; K.scene.add(S.scanSoft);
  S.pillar = new THREE.Mesh(new THREE.PlaneGeometry(0.4, 6), pillarMat()); S.pillar.renderOrder = 65; K.scene.add(S.pillar);
  CARD.build(S, BEATS, k);
  // 噪点
  for (let j = 0; j < 4; j++) {
    const c = document.createElement('canvas'); c.width = 480; c.height = 270;
    const x = c.getContext('2d'), im = x.createImageData(480, 270);
    for (let i = 0; i < 480 * 270; i++) { const v = (hash(i * 0.731 + j * 977.31 + 0.5) * 255) | 0; im.data[i * 4] = im.data[i * 4 + 1] = im.data[i * 4 + 2] = v; im.data[i * 4 + 3] = 255; }
    x.putImageData(im, 0, 0); grain.push(c);
  }
  for (const w of [500, 600, 700, 900]) { outCtx.font = `${w} 20px "Noto Serif CJK SC"`; outCtx.fillText('傲慢嫉妒', -100, -100); }
  window.META = { duration: TL, fps: PREVIEW ? 15 : 30, beats: BEATS, events: CARD.events() };
}
function pillarMat() {
  return new THREE.ShaderMaterial({
    uniforms: { uCol: { value: new THREE.Color('#FFFFFF') }, uInt: { value: 0 }, uTime: { value: 0 } },
    transparent: true, depthWrite: false, depthTest: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
    vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.0); }',
    fragmentShader: /* glsl */`uniform vec3 uCol; uniform float uInt, uTime; varying vec2 vUv;
      void main(){ float x = vUv.x*2.0 - 1.0; float core = exp(-x*x*120.0)*1.2 + exp(-x*x*10.0)*0.35;
        float along = smoothstep(0.0, 0.06, vUv.y)*pow(1.0 - vUv.y, 1.4);
        float flick = 0.85 + 0.15*sin(vUv.y*40.0 - uTime*30.0);
        gl_FragColor = vec4(mix(uCol, vec3(1.0), exp(-x*x*200.0)*0.6)*core*along*flick*uInt, 1.0); }`,
  });
}

// ------------------------------------------------------------ 每帧
export function render(t) {
  tickMaterials(t);
  const F = CARD.frame(t);           // 场景状态：相机、星云颜色、亮度、文字
  // 相机
  const cam = F.cam;
  setCamera(cam);
  const fu = K.final.uniforms;
  const dir = new THREE.Vector3(); K.camera.getWorldDirection(dir);
  fu.uOff.value.set(Math.atan2(dir.x, -dir.z) * 0.55, Math.asin(clamp(dir.y, -1, 1)) * 0.55);
  fu.uBright.value = F.nebula; fu.uFlash.value.set(0.5, 0.6, 0);
  ['b', 'd', 'm', 'h'].forEach(kk => { fu['uN0' + kk].value.copy(F.neb[kk]); fu['uN1' + kk].value.copy(F.neb[kk]); });
  fu.uTide.value = 0; fu.uTideMix.value = 0;
  K.dust.material.uniforms.uCam.value.copy(K.camera.position);
  K.dust.material.uniforms.uColA.value.copy(F.dustCol); K.dust.material.uniforms.uColB.value.set('#FFFFFF');
  K.dust.material.uniforms.uAlpha.value = F.dust ?? 1;
  K.camera.updateMatrixWorld();
  const qn = new THREE.Quaternion(); K.camera.getWorldQuaternion(qn);
  for (const g of K.glows) if (g.userData.billboard && g.visible) { const pq = new THREE.Quaternion(); g.parent.getWorldQuaternion(pq); g.quaternion.copy(pq.invert().multiply(qn)); }
  // 扫描线与光柱始终面向相机（只绕竖轴）
  for (const m of [S.scanLine, S.scanSoft, S.pillar]) m.quaternion.copy(qn);
  K.bloom.strength = F.bloom;
  updateSparks(t, F.bursts || []);
  if (window.DBG) window.DBG(K, t);
  fu.uCA.value = 0.0012 + 0.004 * (F.shake ?? 0);
  fu.uGlitch.value = 0; fu.uTime.value = t;
  K.composer.render();
  // 2D
  BOXES.length = 0;
  outCtx.setTransform(1, 0, 0, 1, 0, 0); outCtx.globalAlpha = 1; outCtx.globalCompositeOperation = 'source-over';
  outCtx.drawImage(glCanvas, 0, 0);
  outCtx.setTransform(K.scale, 0, 0, K.scale, 0, 0);
  setCtx(outCtx, t);
  CARD.text(t, outCtx, F);
  outCtx.setTransform(1, 0, 0, 1, 0, 0);
  outCtx.save(); outCtx.globalAlpha = 0.035; outCtx.drawImage(grain[Math.floor(t * 30 + 0.5) % 4], 0, 0, K.W, K.H); outCtx.restore();
  window.LAST_BOXES = BOXES.slice();
  window.LAST_FACES = F.faces || [];
}
