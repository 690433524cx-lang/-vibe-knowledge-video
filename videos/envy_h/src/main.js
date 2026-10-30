// 导演：每帧 render(t) 只由 t 决定。先渲 WebGL，再把结果画到 outCanvas，叠加 2D 文字与最上层后期。
// 《七宗罪·嫉妒》横屏长版：1920×1080、84 秒；版式与傲慢长版一致，全片只用嫉妒的绿色。地址参数 ?preview=1 为 960×540。
import * as THREE from 'three';
import { K, FW, FH, initCore, buildFaces, boltState, updateSparks, tickMaterials, setCamera } from './core.js';
import { setLoop, clamp, lerp, lerp3, prog, sine, inOut, hash, loopSin } from './util.js';
import { SHARED } from './mat.js';
import { setCtx, staggerLine, source, glowText, fs, C, BOXES } from './text.js';
import * as intro from './intro.js';
import * as EP from './episode.js';
import { ENVY } from './assets.js';

const q = new URLSearchParams(location.search);
export const PREVIEW = q.get('preview') === '1';
// 剧情时间 84 秒；成片 84.3 秒：片头扫描光多了 0.3 秒（成片 0–1.6 秒），之后所有事件整体顺延 0.3 秒
// 剧情时间 84 秒；成片 86.5 秒。成片时间轴（照抄傲慢的扫描节奏）：
//   0–3.4 扫描光（傲慢 hook.js 的关键帧）；3.4 选中（剧情 1.3）；3.4–4.4 推近特写（剧情 1.3–2.0）
//   4.4–6.0 闭眼台词（剧情 2.0–3.5）；6.0 睁眼（剧情 3.5）；之后成片 = 剧情 + 2.5
export const TL = 84, TOUT = 86.5, SCAN_END = 3.4, DELAY = 2.5;
setLoop(TL); SHARED.uLoop.value = TL;
const MAP = [[0, 0], [3.4, 1.3], [4.4, 2.0], [6.0, 3.5]];
export const storyTime = t => {
  if (t >= 6.0) return t - DELAY;
  for (let i = 0; i < MAP.length - 1; i++) if (t <= MAP[i + 1][0]) return lerp(MAP[i][1], MAP[i + 1][1], (t - MAP[i][0]) / (MAP[i + 1][0] - MAP[i][0]));
  return t - DELAY;
};
export const outTime = s => {
  if (s >= 3.5) return s + DELAY;
  for (let i = 0; i < MAP.length - 1; i++) if (s <= MAP[i + 1][1]) return lerp(MAP[i][0], MAP[i + 1][0], (s - MAP[i][1]) / (MAP[i + 1][1] - MAP[i][1]));
  return s + DELAY;
};
const loopTime = t => t * TL / TOUT;
const TABLE = EP.timeline();
window.META = { duration: TOUT, fps: PREVIEW ? 15 : 30, subs: TABLE.SUBS.map(s => ({ t0: outTime(s[0]), t1: outTime(s[1]), text: s[2], exempt: !!(s[3] && s[3].exempt) })) };
// 文字颜色：正文偏绿的白、中性关键词亮色、负面关键词毒绿色、外发光主色
Object.assign(C, { text: ENVY.high, key: ENVY.bright, neg: ENVY.toxic, glow: ENVY.main, metal: 'envy' });

let outCtx, glCanvas, outCanvas, grain = [];
export async function init() {
  glCanvas = document.getElementById('gl'); outCanvas = document.getElementById('out');
  const W = PREVIEW ? FW / 2 : FW, H = PREVIEW ? FH / 2 : FH;
  glCanvas.width = outCanvas.width = W; glCanvas.height = outCanvas.height = H;
  outCtx = outCanvas.getContext('2d');
  initCore(glCanvas, { W, H, bolts: TABLE.BOLTS });
  window.K = K;
  // 星云：傲慢星云的结构与参数，颜色换成嫉妒的绿色
  const fu = K.final.uniforms;
  [['b', ENVY.bg], ['d', ENVY.dark], ['m', ENVY.main], ['h', ENVY.bright]].forEach(([k, c]) => { fu['uN0' + k].value.set(c); fu['uN1' + k].value.set(c); });
  fu.uTide.value = 2; fu.uTideMix.value = 1; fu.uLift.value = 0; fu.uDrift.value = 1;
  K.dust.material.uniforms.uColA.value.set(ENVY.main); K.dust.material.uniforms.uColB.value.set(ENVY.bright);
  K.bolts.material.uniforms.uCol.value.set(ENVY.bright);
  K.sparks.material.uniforms.uColA.value.set(ENVY.bright); K.sparks.material.uniforms.uColB.value.set(ENVY.main);
  const objText = await (await fetch('assets/canonical_face_model.obj')).text();
  buildFaces(objText, { face: PREVIEW ? 50000 : 85000 });
  intro.build(ENVY);
  EP.build(PREVIEW);
  for (let k = 0; k < 4; k++) {
    const c = document.createElement('canvas'); c.width = 480; c.height = 270;
    const x = c.getContext('2d'), im = x.createImageData(480, 270);
    for (let i = 0; i < 480 * 270; i++) { const v = (hash(i * 0.731 + k * 977.31 + 0.5) * 255) | 0; im.data[i * 4] = im.data[i * 4 + 1] = im.data[i * 4 + 2] = v; im.data[i * 4 + 3] = 255; }
    x.putImageData(im, 0, 0); grain.push(c);
  }
  for (const w of [500, 600, 700]) { outCtx.font = `${w} 20px "Noto Serif CJK SC"`; outCtx.fillText('嫉妒', -100, -100); }
}

// ------------------------------------------------------------ 相机：场景镜头 + 手持漂移 + 冲击
const camLerp = (a, b, k) => ({ pos: lerp3(a.pos, b.pos, k), target: lerp3(a.target, b.target, k), fov: lerp(a.fov ?? 35, b.fov ?? 35, k), shift: lerp(a.shift ?? 0, b.shift ?? 0, k) });
function applyCam(c, t, hand, u) {
  const pos = new THREE.Vector3(...c.pos), tgt = new THREE.Vector3(...c.target);
  const fwd = tgt.clone().sub(pos), dist = fwd.length(); fwd.normalize();
  pos.x += 0.02 * hand * loopSin(u, 16, 0.3) * (dist / 2.5); pos.y += 0.02 * hand * loopSin(u, 20, 1.7) * (dist / 2.5); pos.z += 0.015 * hand * loopSin(u, 24, 2.9);
  tgt.x += 0.012 * hand * loopSin(u, 20, 4.1) * (dist / 2.5); tgt.y += 0.012 * hand * loopSin(u, 16, 5.3) * (dist / 2.5);
  let pk = 0;
  for (const [t0, s] of TABLE.PUNCH) {
    const d = t - t0; if (d < 0 || d > 0.6) continue;
    const f = d < 0.06 ? d / 0.06 : Math.exp(-(d - 0.06) * 9);
    pos.addScaledVector(fwd, dist * 0.09 * s * f);
    if (d < 0.4) { const a = dist * 0.012 * s * Math.exp(-10 * d); pos.x += a * Math.sin(83 * d); pos.y += a * Math.cos(67 * d); }
    pk = Math.max(pk, s * Math.max(0, 1 - d / 0.4));
  }
  setCamera({ ...c, pos: pos.toArray(), target: tgt.toArray() });
  return pk;
}

// ------------------------------------------------------------ 每帧
export function render(tOut) {
  const t = storyTime(tOut), u = loopTime(tOut);
  tickMaterials(u);
  const F = { t, tl: TL, bursts: [], cam: null, bloom: 1.4, nebula: 2.1, ink: 0, inkC: [0.5, 0.5], glitch: 0, outro: null, intro: null };
  if (tOut < SCAN_END) F.intro = intro.scanIntro(tOut, EP.N, F);
  else if (t < 2.0) F.intro = intro.seriesIntro(t, EP.N, F);
  else if (t >= TL - 1) F.outro = intro.seriesOutro(t, TL, F);
  else intro.hideFaces();
  EP.update(t, F);
  updateSparks(t, F.bursts);
  let cam = F.cam || intro.LINEUP_CAM, hand = 1;
  if (t < 2.0) { cam = intro.camIntro(t); hand = 0; }
  else if (F.outro) { const k = inOut(F.outro.k); cam = camLerp(cam, intro.LINEUP_CAM, k); hand = 1 - k; F.bloom = lerp(F.bloom, 1.4, k); F.nebula = lerp(F.nebula, 2.1, k) * (1 + 1.1 * Math.sin(Math.PI * Math.pow(k, 0.7))); } // 片尾过渡时主角已溶散、七张脸还没飞回，背景略提亮；最后一帧不变
  hand *= clamp((t - 2.0) / 1.0);
  const pk = applyCam(cam, t, hand, u);
  const bs = boltState(t);
  const bu = K.bolts.material.uniforms; for (let i = 0; i < 32; i++) { bu.uProg.value[i] = bs.prog[i]; bu.uInten.value[i] = bs.inten[i]; }
  K.bolts.visible = bs.prog.some(v => v > 0);
  const fu = K.final.uniforms;
  const dir = new THREE.Vector3(); K.camera.getWorldDirection(dir);
  fu.uOff.value.set(Math.atan2(dir.x, -dir.z) * 0.55, Math.asin(clamp(dir.y, -1, 1)) * 0.55);
  fu.uFlash.value.set(...bs.flash); fu.uBright.value = F.nebula;
  fu.uInk.value = F.ink; fu.uInkC.value.set(...F.inkC);
  K.dust.material.uniforms.uCam.value.copy(K.camera.position);
  K.camera.updateMatrixWorld();
  const qn = new THREE.Quaternion(); K.camera.getWorldQuaternion(qn);
  for (const g of K.glows) if (g.userData.billboard && g.visible) { const pq = new THREE.Quaternion(); g.parent.getWorldQuaternion(pq); g.quaternion.copy(pq.invert().multiply(qn)); }
  // 辉光：冲击时 ×1.7，0.4 秒内回落
  K.bloom.strength = F.bloom * (1 + 0.7 * clamp(pk));
  if (window.DBG) window.DBG(K, t);
  fu.uCA.value = 0.0012 + 0.006 * pk;
  fu.uGlitch.value = F.glitch; fu.uTime.value = u;
  K.composer.render();

  // 2D 合成（文字坐标按 1920×1080 书写）
  BOXES.length = 0;
  outCtx.setTransform(1, 0, 0, 1, 0, 0); outCtx.globalAlpha = 1; outCtx.globalCompositeOperation = 'source-over';
  outCtx.drawImage(glCanvas, 0, 0);
  outCtx.setTransform(K.scale, 0, 0, K.scale, 0, 0);
  setCtx(outCtx, u);
  drawChapterBar(t);
  if (t < 2.0) intro.introText(t, '嫉妒');
  for (const [t0, t1, s] of TABLE.SOURCES) source(t, s, t0, t1);
  EP.text(t, F);
  TABLE.SUBS.forEach(([t0, t1, s, o]) => {
    const next = TABLE.SUBS.filter(x => x[0] > t0).reduce((m, x) => Math.min(m, x[0]), Infinity);
    const fo = Math.max(0.05, Math.min(0.15, next - t1 - 0.01));
    if (t >= t0 && t <= t1 + fo) staggerLine(t, s, 960, 975, o?.size ?? 52, t0, t1 + fo, { step: 0.025, dur: 0.3, ...(o || {}), fadeOut: fo });
  });
  // 闪白：淡绿白色
  for (const [t0, k] of TABLE.FLASH) {
    const d = t - t0; if (d >= 0 && d < 0.25) { outCtx.fillStyle = `rgba(235,255,242,${k * (1 - d / 0.25)})`; outCtx.fillRect(0, 0, FW, FH); }
  }
  outCtx.setTransform(1, 0, 0, 1, 0, 0);
  outCtx.save(); outCtx.globalAlpha = 0.04; outCtx.drawImage(grain[Math.floor(tOut * 30 + 0.5) % 4], 0, 0, K.W, K.H); outCtx.restore();
  window.LAST_BOXES = BOXES.slice();
}

// 章节栏（与傲慢一致）：左上系列名，右上当前章节
const CHAPTERS = [['01', '绿眼睛的怪物', 10, 24], ['02', '缝上的眼睛', 24, 40], ['03', '会痛的大脑', 40, 58.2], ['04', '别人的高光', 58.2, 74]];
function drawChapterBar(t) {
  const a = (t < 10 || t > 74) ? 0 : Math.min(sine(prog(t, 10, 10.5)), 1 - sine(prog(t, 73.5, 74)));
  if (a <= 0) return;
  glowText('七宗罪 · 第二集 · 嫉妒', 60, 78, fs(500, 28), C.key, { alpha: 0.8 * a, align: 'left', glow: 10 });
  for (const [no, name, t0, t1] of CHAPTERS) {
    const av = (t < t0 || t > t1) ? 0 : Math.min(sine(prog(t, t0, t0 + 0.45)), 1 - sine(prog(t, t1 - 0.45, t1)));
    if (av > 0) glowText(`${no}  ${name}`, 1860, 78, fs(500, 28), C.key, { alpha: av * a, align: 'right', glow: 10 });
  }
}
