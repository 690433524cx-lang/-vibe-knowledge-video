// 导演：每帧 render(t) 只由 t 决定。先渲 WebGL，再把结果画到 outCanvas，叠加 2D 文字与最上层后期。
import * as THREE from 'three';
import { K, W, H, initCore, buildHero, boltState, updateSparks, tickMaterials } from './core.js';
import { applyHero } from './hero.js';
import { setCtx, staggerLine, source, glowText, fs, C } from './text.js';
import { clamp, lerp, prog, sine, hash, loopSin, TAU, LOOP } from './util.js';
import * as hook from './scenes/hook.js';
import * as ch1 from './scenes/ch1.js';
import * as ch2 from './scenes/ch2.js';
import * as ch3 from './scenes/ch3.js';
import * as ch4 from './scenes/ch4.js';
import * as ch5 from './scenes/ch5.js';
import * as ch6 from './scenes/ch6.js';

const SCENES = [hook, ch1, ch2, ch3, ch4, ch5, ch6];

// ------------------------------------------------------------ 事件表
export const PUNCH = [[3.4, 1], [9.0, 1.7], [17.6, 1], [36.4, 1], [62.0, 1], [64.4, 1.4], [72.8, 1], [93.0, 1], [105.8, 1], [123.0, 0.5], [125.4, 1]];
export const FLASH = [[3.4, 0.30], [9.0, 0.35], [17.6, 0.25], [105.8, 0.30], [125.4, 0.25]];

// 字幕：〔紫〕亮紫关键词、〔红〕洋红负面词
export const SUBS = [
  [0.0, 3.6, '七宗罪里，有一宗是为你准备的——', { instant: true }],
  [3.6, 4.2, '〔紫〕傲慢〔/紫〕。', { size: 72, step: 0.05, dur: 0.22, fadeOut: 0.2 }],
  [4.4, 8.6, '我从不觉得，自己比别人强。'],
  [9.2, 13.4, '我只是，〔紫〕确实〔/紫〕比他们强。'],
  [20.3, 25.2, '可在教皇格里高利一世眼里，傲慢甚至不在七宗罪里——'],
  [25.35, 29.0, '它高高在上，是一切罪的〔紫〕根〔/紫〕。'],
  [29.15, 33.2, '嫉妒、愤怒、贪婪……都是从它身上长出来的〔紫〕果子〔/紫〕。'],
  [33.35, 37.0, '中世纪的手抄本里，就常把它画成罪恶之树的树根。'],
  [37.3, 41.8, '但丁写到，傲慢的人死后，要背着巨石爬山。'],
  [41.95, 46.0, '石头压得他们弯下腰，脸几乎贴着地面。'],
  [50.2, 54.0, '但丁给傲慢的惩罚很特别：不是火，不是刀，只是让人〔紫〕低下头〔/紫〕。'], // 剧情时间；经 sceneTime 放慢后实际显示 50.2–55.0
  [54.3, 58.8, '1976年，美国对近百万名高中生做过一次调查。'],
  [58.95, 63.6, '在〔紫〕领导力〔/紫〕上，70%的人觉得自己高于平均。'],
  [63.75, 68.4, '在〔紫〕与人相处〔/紫〕上，没有一个人觉得自己低于平均。'],
  [72.6, 76.0, '这叫〔紫〕优于平均效应〔/紫〕。'],
  [76.5, 81.5, '2002年，斯坦福的心理学家问人们：你有多容易被偏见影响？'],
  [81.65, 86.0, '几乎每个人都觉得：〔红〕别人〔/红〕比我更容易。'],
  [92.8, 95.8, '这叫〔紫〕偏见盲点〔/紫〕。'],
  [96.3, 100.5, '写《纳尼亚传奇》的作家路易斯，说过一句话：'],
  [105.6, 108.0, '直到他抬起头。'],
  [108.3, 112.6, '赢了比赛时张开双臂、挺起胸膛——这个动作，'],
  [112.75, 116.6, '连〔紫〕天生失明〔/紫〕、从没见过别人这么做的运动员，也会做。'],
  [116.75, 119.6, '她发现，骄傲有两种。'],
  [119.75, 122.0, '后一种，才是七宗罪里的那个〔紫〕傲慢〔/紫〕。'],
];
const SOURCES = [
  [20.3, 24.6, '公元6世纪末 · 教皇格里高利一世'],
  [37.3, 41.6, '但丁《神曲·炼狱篇》'],
  [54.3, 58.6, '美国大学理事会 · 1976'],
  [76.5, 80.8, '斯坦福大学 · 2002'],
  [108.3, 112.4, '心理学家特蕾西与松本 · 2008'],
];
const CHAPTERS = [
  ['01', '众罪之根', 20, 37], ['02', '弯腰的人', 37, 54], ['03', '平均线以上', 54, 76.2],
  ['04', '偏见盲点', 76.2, 96], ['05', '往下看的人', 96, 108], ['06', '两种骄傲', 108, 122],
];

// ------------------------------------------------------------ 成片时间 → 剧情时间
// 第二章结尾那句字幕较长：成片 50.0–54.4 平滑放慢，对应剧情 50.0–53.4，之后整体顺延 1 秒。
// 成片 129 秒的最后一帧对应剧情 128 秒（LOOP），仍与第 0 帧无缝相接。
export const DURATION = LOOP + 1;
export function sceneTime(t) { const u = clamp((t - 50.0) / 4.4); return t - u * u * (3 - 2 * u); }

// ------------------------------------------------------------ 初始化
let outCtx, glCanvas, outCanvas, grain = [];
export async function init() {
  glCanvas = document.getElementById('gl'); outCanvas = document.getElementById('out');
  outCtx = outCanvas.getContext('2d');
  initCore(glCanvas); window.K = K;
  const objText = await (await fetch('assets/canonical_face_model.obj')).text();
  buildHero(objText);
  for (const s of SCENES) s.build();
  for (let k = 0; k < 4; k++) {
    const c = document.createElement('canvas'); c.width = 480; c.height = 270;
    const x = c.getContext('2d'), im = x.createImageData(480, 270);
    for (let i = 0; i < 480 * 270; i++) { const v = (hash(i * 0.731 + k * 977.31 + 0.5) * 255) | 0; im.data[i * 4] = im.data[i * 4 + 1] = im.data[i * 4 + 2] = v; im.data[i * 4 + 3] = 255; }
    x.putImageData(im, 0, 0); grain.push(c);
  }
  for (const f of [fs(500, 20), fs(600, 20), fs(700, 20)]) { outCtx.font = f; outCtx.fillText('傲慢', -100, -100); }
}

// ------------------------------------------------------------ 相机：场景镜头 + 手持漂移 + 18 秒推拉 + 冲击
const _v = new THREE.Vector3(), _t = new THREE.Vector3();
function finishCamera(t, cam) {
  const camera = K.camera;
  const pos = new THREE.Vector3(...cam.pos), tgt = new THREE.Vector3(...cam.target);
  const fwd = tgt.clone().sub(pos); const dist = fwd.length(); fwd.normalize();
  // 手持漂移：周期取全片时长的整数分之一（8、6.4、5.33 秒）
  const hk = cam.hand ?? 1;
  pos.x += 0.02 * hk * loopSin(t, 16, 0.3) * (dist / 2.5); pos.y += 0.02 * hk * loopSin(t, 20, 1.7) * (dist / 2.5); pos.z += 0.015 * hk * loopSin(t, 24, 2.9);
  tgt.x += 0.012 * hk * loopSin(t, 20, 4.1) * (dist / 2.5); tgt.y += 0.012 * hk * loopSin(t, 16, 5.3) * (dist / 2.5);
  // 缓慢推拉：周期 128/7≈18.3 秒，幅度 3%
  pos.addScaledVector(fwd, dist * 0.03 * loopSin(t, 7) * (cam.breath ?? 1));
  // 冲击：沿视线猛推再弹回 + 震动
  let pk = 0;
  for (const [t0, s] of PUNCH) {
    const d = t - t0; if (d < 0 || d > 0.6) continue;
    const f = d < 0.06 ? d / 0.06 : Math.exp(-(d - 0.06) * 9);
    pos.addScaledVector(fwd, dist * 0.09 * s * f);
    if (d < 0.4) { const a = dist * 0.012 * s * Math.exp(-10 * d); pos.x += a * Math.sin(83 * d); pos.y += a * Math.cos(67 * d); }
    pk = Math.max(pk, s * Math.exp(-6 * d));
  }
  camera.position.copy(pos); camera.up.set(Math.sin(cam.roll ?? 0), Math.cos(cam.roll ?? 0), 0); camera.lookAt(tgt);
  camera.fov = cam.fov ?? 35; camera.updateProjectionMatrix();
  return pk;
}

// ------------------------------------------------------------ 每帧
export function render(t) {
  tickMaterials(t);
  const F = { t, hero: null, bursts: [], cam: null, bloom: 1, nebula: 1, dawn: 0, glitch: 0 };
  for (const s of SCENES) s.update(t, F);
  applyHero(F.hero || { visible: false }, t);
  updateSparks(t, F.bursts);
  const pk = finishCamera(t, F.cam || { pos: [0, 0, 7], target: [0, 0, 0] });
  // 背景闪电
  const bs = boltState(t);
  const bu = K.bolts.material.uniforms; for (let i = 0; i < 32; i++) { bu.uProg.value[i] = bs.prog[i]; bu.uInten.value[i] = bs.inten[i]; }
  K.bolts.visible = bs.prog.some(v => v > 0);
  // 星云跟着相机朝向偏移，产生视差
  const nu = K.neb.material.uniforms;
  const dir = new THREE.Vector3(); K.camera.getWorldDirection(dir);
  nu.uOff.value.set(Math.atan2(dir.x, -dir.z) * 0.55, Math.asin(clamp(dir.y, -1, 1)) * 0.55);
  nu.uFlash.value.set(...bs.flash); nu.uBright.value = F.nebula; nu.uDawn.value = F.dawn;
  K.dust.material.uniforms.uCam.value.copy(K.camera.position);
  // 公告板朝向相机
  K.camera.updateMatrixWorld();
  const q = new THREE.Quaternion(); K.camera.getWorldQuaternion(q);
  for (const g of K.glows) if (g.userData.billboard && g.visible) { const pq = new THREE.Quaternion(); g.parent.getWorldQuaternion(pq); g.quaternion.copy(pq.invert().multiply(q)); }
  if (window.DBG) window.DBG(K, t);
  // 后期
  K.bloom.strength = 1.4 * F.bloom * (1 + pk);
  K.final.uniforms.uCA.value = 0.0012 + 0.006 * pk;
  K.final.uniforms.uGlitch.value = F.glitch; K.final.uniforms.uTime.value = t;
  K.composer.render();

  // 2D 合成
  outCtx.setTransform(1, 0, 0, 1, 0, 0); outCtx.globalAlpha = 1; outCtx.globalCompositeOperation = 'source-over';
  outCtx.drawImage(glCanvas, 0, 0);
  setCtx(outCtx, t);
  drawChapterBar(t);
  for (const [t0, t1, s] of SOURCES) source(t, s, t0, t1);
  for (const s of SCENES) s.text && s.text(t, F);
  for (const [t0, t1, s, o] of SUBS) if (t >= t0 && t <= t1) staggerLine(t, s, 960, 975, o?.size ?? 52, t0, t1, o || {});
  // 闪白 + 噪点
  for (const [t0, k] of FLASH) { const d = t - t0; if (d >= 0 && d < 0.25) { outCtx.fillStyle = `rgba(240,230,255,${k * (1 - d / 0.25)})`; outCtx.fillRect(0, 0, W, H); } }
  outCtx.save(); outCtx.globalAlpha = 0.04; outCtx.drawImage(grain[Math.floor(t * 30 + 0.5) % 4], 0, 0, W, H); outCtx.restore();
}

function drawChapterBar(t) {
  const a = (t < 20 || t > 122) ? 0 : Math.min(sine(prog(t, 20, 20.5)), 1 - sine(prog(t, 121.5, 122)));
  if (a <= 0) return;
  glowText('七宗罪 · 第一集 · 傲慢', 60, 62, fs(500, 28), C.lilac, { alpha: 0.8 * a, align: 'left', glow: 10 });
  for (const [no, name, t0, t1] of CHAPTERS) {
    const av = (t < t0 || t > t1) ? 0 : Math.min(sine(prog(t, t0, t0 + 0.45)), 1 - sine(prog(t, t1 - 0.45, t1)));
    if (av > 0) glowText(`${no}  ${name}`, 1860, 62, fs(500, 28), C.lilac, { alpha: av * a, align: 'right', glow: 10 });
  }
}

// 把 3D 点投影成屏幕坐标（给标签用）
export function project(p) {
  const v = new THREE.Vector3(...p).project(K.camera);
  return [(v.x * 0.5 + 0.5) * W, (-v.y * 0.5 + 0.5) * H, v.z];
}
