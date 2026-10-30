// 导演：每帧 render(t) 只由 t 决定。先渲 WebGL，再把结果画到 outCanvas，叠加 2D 文字与最上层后期。
// 地址参数：?ep=envy|pride &ver=short|long &preview=1（540×960）
import * as THREE from 'three';
import { K, FW, FH, initCore, buildFaces, boltState, updateSparks, tickMaterials, setCamera } from './core.js';
import { setLoop, LOOP, clamp, lerp, lerp3, prog, sine, inOut, hash, loopSin, hex, mixc, css } from './util.js';
import { SHARED } from './mat.js';
import { PAL, PALETTES, palRGB, palHex } from './palette.js';
import { setCtx, staggerLine, source, C, BOXES } from './text.js';
import * as intro from './intro.js';
import * as envy from './envy/episode.js';
import * as pride from './pride/episode.js';

const q = new URLSearchParams(location.search);
export const EP = q.get('ep') || 'envy', VER = q.get('ver') || 'short', PREVIEW = q.get('preview') === '1';
const EPISODES = { envy, pride };
const E = EPISODES[EP];
export const TL = E.DURATION[VER];
setLoop(TL); SHARED.uLoop.value = TL;
const TABLE = E.timeline(VER);
window.META = { ep: EP, ver: VER, duration: TL, fps: PREVIEW ? 15 : 30, subs: TABLE.SUBS.map(s => ({ t0: s[0], t1: s[1], text: s[2], exempt: !!(s[3] && s[3].exempt) })) };

let outCtx, glCanvas, outCanvas, grain = [];
export async function init() {
  glCanvas = document.getElementById('gl'); outCanvas = document.getElementById('out');
  const W = PREVIEW ? FW / 2 : FW, H = PREVIEW ? FH / 2 : FH;
  glCanvas.width = outCanvas.width = W; glCanvas.height = outCanvas.height = H;
  outCtx = outCanvas.getContext('2d');
  initCore(glCanvas, { W, H, bolts: TABLE.BOLTS });
  window.K = K;
  const objText = await (await fetch('assets/canonical_face_model.obj')).text();
  buildFaces(objText, { face: PREVIEW ? 50000 : 85000 });
  intro.build();
  E.build(VER, PREVIEW);
  for (let k = 0; k < 4; k++) {
    const c = document.createElement('canvas'); c.width = 270; c.height = 480;
    const x = c.getContext('2d'), im = x.createImageData(270, 480);
    for (let i = 0; i < 270 * 480; i++) { const v = (hash(i * 0.731 + k * 977.31 + 0.5) * 255) | 0; im.data[i * 4] = im.data[i * 4 + 1] = im.data[i * 4 + 2] = v; im.data[i * 4 + 3] = 255; }
    x.putImageData(im, 0, 0); grain.push(c);
  }
  for (const w of [500, 700]) { outCtx.font = `${w} 20px "Noto Serif CJK SC"`; outCtx.fillText('嫉妒傲慢', -100, -100); }
}

// ------------------------------------------------------------ 相机：场景镜头 + 冲击
function camLerp(a, b, k) {
  return { pos: lerp3(a.pos, b.pos, k), target: lerp3(a.target, b.target, k), fov: lerp(a.fov ?? 50, b.fov ?? 50, k), shift: lerp(a.shift ?? 0, b.shift ?? 0, k), roll: lerp(a.roll ?? 0, b.roll ?? 0, k) };
}
function punchState(t) {
  let pk = 0, push = 0, sx = 0, sy = 0;
  for (const [t0, s] of TABLE.PUNCH) {
    const d = t - t0; if (d < 0 || d > 0.6) continue;
    const f = d < 0.06 ? d / 0.06 : Math.exp(-(d - 0.06) * 9);
    push += 0.09 * s * f;
    if (d < 0.4) { const a = 0.012 * s * Math.exp(-10 * d); sx += a * Math.sin(83 * d); sy += a * Math.cos(67 * d); }
    pk = Math.max(pk, s * Math.max(0, 1 - d / 0.4));
  }
  return { pk, push, sx, sy };
}
function applyCam(c, t, hand) {
  const pos = new THREE.Vector3(...c.pos), tgt = new THREE.Vector3(...c.target);
  const fwd = tgt.clone().sub(pos), dist = fwd.length(); fwd.normalize();
  // 手持漂移（片头与片尾为 0）
  pos.x += 0.02 * hand * loopSin(t, 16, 0.3) * (dist / 2.5); pos.y += 0.02 * hand * loopSin(t, 20, 1.7) * (dist / 2.5);
  tgt.x += 0.012 * hand * loopSin(t, 20, 4.1) * (dist / 2.5); tgt.y += 0.012 * hand * loopSin(t, 16, 5.3) * (dist / 2.5);
  const P = punchState(t);
  pos.addScaledVector(fwd, dist * P.push); pos.x += dist * P.sx; pos.y += dist * P.sy;
  setCamera({ ...c, pos: pos.toArray(), target: tgt.toArray() });
  return P.pk;
}

// ------------------------------------------------------------ 配色
const tmpC = new THREE.Color();
function applyPalette(F) {
  const fu = K.final.uniforms, n = PALETTES.neutral.neb, e = PALETTES[E.PAL].neb;
  ['b', 'd', 'm', 'h'].forEach((k, i) => { fu['uN0' + k].value.set(n[i]); fu['uN1' + k].value.set(e[i]); });
  // 片头：潮水从选中的脸向外推进；片尾：整体退回中性色
  if (F.outro) { fu.uTide.value = 2.0; fu.uTideMix.value = F.tide; } else { fu.uTide.value = F.tide * 1.05; fu.uTideMix.value = 1; }
  fu.uTideC.value.set(...F.tideC);
  PAL.ep = E.PAL; PAL.tide = F.tide;
  const du = K.dust.material.uniforms; du.uColA.value.setRGB(...palRGB('dust', 0)); du.uColB.value.setRGB(...palRGB('dust', 1));
  K.bolts.material.uniforms.uCol.value.setRGB(...palRGB('bolt'));
  const su = K.sparks.material.uniforms; su.uColA.value.setRGB(...palRGB('crack')); su.uColB.value.setRGB(...palRGB('crack'));
  C.text = palHex('text'); C.key = palHex('key'); C.neg = palHex('neg'); C.glow = palHex('glow'); C.metal = E.PAL;
  F.palA = palRGB('faceA'); F.palB = palRGB('faceB');
}

// ------------------------------------------------------------ 每帧
export function render(t) {
  tickMaterials(t);
  const F = { t, ver: VER, tl: TL, bursts: [], cam: null, bloom: 1.4, tide: 1, tideC: [0.5, 0.58], hand: 1, outro: null, nebula: 1.7, ink: 0, inkC: [0.5, 0.5], glitch: 0 };
  // 配色潮水：片头 1.3–2.0 由中性色淹到本期配色；片尾最后 1 秒退回中性色
  const te = TL - 1;
  if (t < 2.0) { F.tide = t < 1.3 ? 0 : sine(prog(t, 1.3, 2.0)); F.tideC = [0.5, 0.58]; }
  applyPalette(F);
  let introInfo = null;
  if (t < 2.0) introInfo = intro.seriesIntro(t, E.N, F);
  else if (t >= te) F.outro = intro.seriesOutro(t, TL, E.N, F);
  else intro.hideFaces();
  applyPalette(F);
  F.intro = introInfo;
  E.update(t, F);
  updateSparks(t, F.bursts);
  // 镜头
  let cam = F.cam || intro.CAM0, hand = 1;
  if (t < 2.0) { cam = intro.camIntro(t); hand = 0; }
  else if (F.outro) { const k = inOut(F.outro.k); cam = camLerp(cam, intro.CAM0, k); hand = 1 - k; F.bloom = lerp(F.bloom, 1.4, k); }
  hand *= clamp((t - 2.0) / 1.0);
  const pk = applyCam(cam, t, hand);
  // 背景闪电
  const bs = boltState(t);
  const bu = K.bolts.material.uniforms; for (let i = 0; i < 32; i++) { bu.uProg.value[i] = bs.prog[i]; bu.uInten.value[i] = bs.inten[i]; }
  K.bolts.visible = bs.prog.some(v => v > 0);
  const fu = K.final.uniforms;
  const dir = new THREE.Vector3(); K.camera.getWorldDirection(dir);
  fu.uOff.value.set(Math.atan2(dir.x, -dir.z) * 0.55, Math.asin(clamp(dir.y, -1, 1)) * 0.55);
  fu.uFlash.value.set(...bs.flash); fu.uBright.value = F.nebula; fu.uDrift.value = TL / 128;
  fu.uInk.value = F.ink; fu.uInkC.value.set(...F.inkC);
  K.dust.material.uniforms.uCam.value.copy(K.camera.position);
  K.camera.updateMatrixWorld();
  const qn = new THREE.Quaternion(); K.camera.getWorldQuaternion(qn);
  for (const g of K.glows) if (g.userData.billboard && g.visible) { const pq = new THREE.Quaternion(); g.parent.getWorldQuaternion(pq); g.quaternion.copy(pq.invert().multiply(qn)); }
  // 后期：冲击时辉光强度 ×1.7，0.4 秒内回落
  K.bloom.strength = F.bloom * (1 + 0.7 * clamp(pk));
  if (window.DBG) window.DBG(K, t);
  fu.uCA.value = 0.0012 + 0.005 * pk;
  fu.uGlitch.value = F.glitch; fu.uTime.value = t;
  K.composer.render();

  // 2D 合成（文字坐标按 1080×1920 书写）
  BOXES.length = 0;
  outCtx.setTransform(1, 0, 0, 1, 0, 0); outCtx.globalAlpha = 1; outCtx.globalCompositeOperation = 'source-over';
  outCtx.drawImage(glCanvas, 0, 0);
  outCtx.setTransform(K.scale, 0, 0, K.scale, 0, 0);
  setCtx(outCtx, t);
  if (t < 2.1) intro.introText(t, E.N);
  for (const [t0, t1, s] of TABLE.SOURCES) source(t, s, t0, t1);
  E.text(t, F);
  // 字幕：t0 开始逐字出现，到 t1 完整显示，然后在下一句开始前淡出（最多 0.15 秒）
  TABLE.SUBS.forEach(([t0, t1, s, o], i) => {
    const next = TABLE.SUBS.filter(x => x[0] > t0).reduce((m, x) => Math.min(m, x[0]), Infinity);
    const fo = Math.max(0.05, Math.min(0.15, next - t1 - 0.01));
    if (t >= t0 && t <= t1 + fo) staggerLine(t, s, 540, o?.y ?? 1380, o?.size ?? 51, t0, t1 + fo, { step: 0.025, dur: 0.3, ...(o || {}), fadeOut: fo });
  });
  // 闪白
  for (const [t0, k, col] of TABLE.FLASH) {
    const d = t - t0; if (d >= 0 && d < 0.25) { outCtx.fillStyle = css(hex(col || palHex('flash')), k * (1 - d / 0.25)); outCtx.fillRect(0, 0, FW, FH); }
  }
  outCtx.setTransform(1, 0, 0, 1, 0, 0);
  outCtx.save(); outCtx.globalAlpha = 0.035; outCtx.drawImage(grain[Math.floor(t * 30 + 0.5) % 4], 0, 0, K.W, K.H); outCtx.restore();
  window.LAST_BOXES = BOXES.slice();
}
