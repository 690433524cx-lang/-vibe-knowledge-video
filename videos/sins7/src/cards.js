// 时间轴与七张卡（第一版的构图：神像在右、背后光环与太阳般的放射光、左侧竖排罪名、右下角的小人影）
// 每宗两小节：D 降临（闭眼）｜D + 3.5b 吸气｜D + 4b 扫描线扫过、睁眼｜D + 7.5b 被吸进光点｜下一宗 D 光点爆开
import * as THREE from 'three';
import { K, project, glow } from './core.js';
import { PB } from './geo.js';
import { clamp, lerp, prog, sine, outExpo, rng, TAU } from './util.js';
import { glowText, fs, BOXES } from './text.js';
import { SINS, BG, GROUND_Y, HALO_C, IGEA } from './idol.js';
import * as H from './halo.js';

let S, B, R, b;
export function setScene(scene, beats) { S = scene; B = beats.beats; R = beats.R; b = beats.beat ?? beats.period ?? 0.5; }
const C3 = h => new THREE.Color(h);
const HIGH = '#F3E8FF';

// ------------------------------------------------------------ 光环：主环（3–4px，高光色）+ 两层细环（刻度、点阵，主环的 40%，反向转）+ 长短交替的放射光芒
export function buildHalo(sin, i, k) {
  const group = new THREE.Group(); group.position.set(...HALO_C); K.scene.add(group);
  const spec = [['main', 1.32, 1.0, 0], ['ticks', 1.52, 0.4, 0.04], ['dots', 1.72, 0.4, -0.03], ['rays', 1.32, 0.55, 0.012]];
  const layers = spec.map(([type, r, br, w], j) => {
    const g = new THREE.Group(); group.add(g);
    const mat = H.ringMaterial(sin.col, br);
    if (type === 'main') { mat.uniforms.uColA.value.set(HIGH); mat.uniforms.uColB.value.set(sin.col).lerp(C3(HIGH), 0.6); }
    const p = new THREE.Points(H.ringPB(type, r, 300 + i * 10 + j, k).geometry(THREE), mat); p.frustumCulled = false; g.add(p); K.mats.push(mat);
    return { g, mat, base: br, w, type };
  });
  group.visible = false;
  return { group, layers };
}

// ------------------------------------------------------------ 各宗的头部特征
function crownPB(k) {
  // 头顶上方悬浮的一圈光刺王冠：正前方（中间）最长，向两边依次变短
  const Rr = rng(77), pb = new PB(), N = n => Math.round(n * k);
  const y0 = 0.6, rx = 0.62, rz = 0.55, cz = -0.12;
  for (let i = 0; i < N(4000); i++) { const a = Rr() * TAU; pb.add([Math.sin(a) * rx, y0 + (Rr() - 0.5) * 0.006, cz + Math.cos(a) * rz], [0, 0, 0], Rr(), [0, 0, 0], [0, 0, 0, 1], [1.0, 30]); }
  for (let s = 0; s < 17; s++) {
    const a = (s / 17) * TAU, front = 0.5 + 0.5 * Math.cos(a), h = 0.04 + 0.13 * Math.pow(front, 2.2);
    const bb = [Math.sin(a) * rx, y0, cz + Math.cos(a) * rz];
    for (let j = 0; j < N(500); j++) {
      const u = Math.pow(Rr(), 0.7), w = 0.016 * (1 - u);
      pb.add([bb[0] + (Rr() - 0.5) * w, y0 + u * h, bb[2] + (Rr() - 0.5) * w], [0, 0, 0], Rr(), [0, 0, 0], [0, 0, 0, 1], [u > 0.88 ? 2.4 : 1.3, 30]);
    }
  }
  return pb;
}
export function buildFeatures(I, i, k) {
  I.feat = {};
  const sin = SINS[i];
  // 睁眼：两道细长的发光眼缝 + 向前、向下射出的光束
  I.eyeGlow = IGEA.eyes.map(p => { const m = glow(5, sin.col, [0.2, 0.06], I.head, { billboard: false, order: 45, half: [0.1, 0.03], ell: [0.06, 0.006], core: HIGH }); m.position.set(p[0], p[1] - 0.01, p[2] + 0.04); return m; });
  I.beams = IGEA.eyes.map((p, e) => {
    const m = glow(3, sin.col, [0.55, 1.1], I.head, { billboard: false, order: 44, core: sin.col });
    m.position.set(p[0] + (e ? 0.05 : -0.05), p[1] - 0.55, p[2] + 0.45); m.rotation.set(-0.9, 0, Math.PI + (e ? 0.12 : -0.12));
    return m;
  });
  if (sin.id === 'pride') {
    const mat = H.ringMaterial(sin.col, 1.2); mat.uniforms.uSize.value = 0.008; mat.uniforms.uColA.value.set(HIGH);
    const p = new THREE.Points(crownPB(k).geometry(THREE), mat); p.frustumCulled = false; I.head.add(p); K.mats.push(mat);
    I.feat.crown = p; I.mats.push(mat);
  }
}
// 头部姿态：微微低头约 10 度
const TILT = 10 * Math.PI / 180;

// ------------------------------------------------------------ 节拍工具
const lastBeat = t => { let lo = 0, hi = B.length - 1, r = -1; while (lo <= hi) { const m = (lo + hi) >> 1; if (B[m] <= t + 1e-9) { r = m; lo = m + 1; } else hi = m - 1; } return r; };
export function beatPulse(t) { const i = lastBeat(t); if (i < 0) return 0; const d = t - B[i]; return d < 0.15 ? 1 - d / 0.15 : 0; }
export const SCAN_DUR = 0.25;
export function cardTimes(i) { const D = R[2 * i]; return { A: D, Bt: D + 4 * b, E: R[2 * i + 2] ?? D + 8 * b }; }
export function events() {
  const ev = [];
  SINS.forEach((s, i) => { const { A, Bt } = cardTimes(i); ev.push({ name: `${s.name} 降临`, t: A }, { name: `${s.name} 睁眼`, t: Bt }); });
  ev.push({ name: '结尾 七尊归位', t: R[14] }, { name: '结尾 问话', t: R[15] });
  return ev;
}

// ------------------------------------------------------------ 场景状态
function hideAll() {
  S.idols.forEach(I => { I.root.visible = false; });
  S.halos.forEach(h => { h.group.visible = false; });
  S.scanLine.visible = S.scanSoft.visible = S.pillar.visible = false;
}
function neb(hex, k = 1) {
  const c = C3(hex);
  return { b: C3(BG), d: c.clone().multiplyScalar(0.05 * k), m: c.clone().multiplyScalar(0.09 * k), h: c.clone().lerp(C3('#FFFFFF'), 0.3).multiplyScalar(0.14 * k) };
}
export function frame(t) {
  hideAll();
  const F = { bursts: [], bloom: 1.0, nebula: 1, shake: 0, faces: [], text: null };
  if (t < R[0]) cardFrame(0, R[0] + 1.0, F);            // 开头、结尾：傲慢确认后再做
  else if (t < R[14]) { let i = 0; while (i < 6 && t >= R[2 * i + 2]) i++; cardFrame(i, t, F); }
  else cardFrame(6, R[14] - 0.31, F);
  return F;
}

// 镜头：神像放大到第一版的约 1.5 倍；头顶在上缘往下约 6%，中心在横向约 60%，略微仰视；整张卡极缓慢地推近
const TAN = Math.tan(17.5 * Math.PI / 180), ASP = 16 / 9, HEAD_TOP = 0.74;
function cardCam(t, A, E, shake, zoomIn) {
  const u = clamp((t - A) / (E - A));
  const d = lerp(4.2, 3.95, u) * (1 - zoomIn), drop = 0.8;          // 相机比注视点低 drop（仰视）
  // 解出注视点高度 ty，使头顶在画面上缘往下 6% 处
  let ty = 0;
  for (let it = 0; it < 20; it++) {
    const cy = ty - drop, a = Math.atan2(ty - cy, d), half = 17.5 * Math.PI / 180;
    const yTop = cy + d * Math.tan(a + half * 0.88);
    ty += (HEAD_TOP + 0.06 - yTop) * 0.8;
  }
  const xo = -(0.6 - 0.5) * 2 * d * TAN * ASP;
  const pos = [xo, ty - drop, d], target = [xo, ty, 0];
  if (shake > 0) { const a = 6 / 1080 * 2 * d * TAN * shake; pos[0] += a * Math.sin(t * 91); pos[1] += a * Math.cos(t * 73); target[0] += a * Math.sin(t * 91); target[1] += a * Math.cos(t * 73); }
  return { pos, target, fov: 35 };
}

function cardFrame(i, t, F) {
  const sin = SINS[i], I = S.idols[i], Hl = S.halos[i];
  const { A, Bt, E } = cardTimes(i);
  const open = t - A, pulse = beatPulse(t);
  const flash = open >= 0 ? Math.exp(-open * 5) : 0;
  const ign = outExpo(clamp(open / 0.35));
  // 吸气：重拍前 0.3 秒收缩 15%、暗 15%、推近 3%；重拍上爆发
  const inhale = Math.pow(clamp((t - (Bt - 0.3)) / 0.3), 3) * (t < Bt ? 1 : 0);
  const leave = clamp((t - (A + 7.5 * b)) / Math.max(0.1, E - (A + 7.5 * b)));
  const dark = Math.max(inhale * 0.15, sine(leave) * 0.85);
  const so = t - Bt;                                                    // 睁眼（扫描线经过眼睛的那一刻 = 重拍）
  const eyeOpen = so >= 0 ? outExpo(clamp(so / 0.12)) * (1 - clamp((t - (A + 7.5 * b)) / 0.15)) : 0;
  const wake = so >= 0 ? Math.exp(-so * 2.5) : 0;                        // 睁眼时的亮波
  const big = Math.max(flash, so >= 0 ? Math.exp(-so * 5) : 0);
  const shakeT = Math.min(open >= 0 ? open : 9, so >= 0 ? so : 9), shake = shakeT < 0.15 ? 1 - shakeT / 0.15 : 0;
  // 神像
  I.root.visible = true; I.root.scale.setScalar((1 - 0.15 * inhale) * (1 - 0.6 * sine(leave)));
  I.head.rotation.set(TILT, 0, 0);
  const dim = lerp(0.3, 1, ign) * (1 - dark) * (1 + 0.4 * wake);
  for (const m of I.mats) { if (m.uniforms.uDim) m.uniforms.uDim.value = dim; if (m.uniforms.uGray) m.uniforms.uGray.value = 0; }
  for (const m of [I.headP.material]) { m.uniforms.uHit.value[0].set(...IGEA.eyes[0], 2.5 * wake); m.uniforms.uHit.value[1].set(...IGEA.eyes[1], 2.5 * wake); }
  I.eyeGlow.forEach(m => { m.material.uniforms.uInt.value = 1.4 * eyeOpen * (1 + 0.5 * Math.exp(-so * 8)); m.visible = eyeOpen > 0.01; });
  I.beams.forEach(m => { m.material.uniforms.uInt.value = 0.22 * eyeOpen * (so < 0.3 ? sine(so / 0.3) : lerp(1, 0.6, clamp((so - 0.3) / 0.3))); m.visible = eyeOpen > 0.01; });
  // 光环：降临时从中心展开；每一拍主环 +40%（0.12 秒衰减），放射光同步脉动；睁眼时全部亮到最高、光芒变长 30%
  Hl.group.visible = true;
  const lb = lastBeat(t), bd = lb >= 0 ? t - B[lb] : 9, beatK = Math.exp(-bd / 0.12);
  const rayLen = 1 + 0.3 * (so >= 0 ? outExpo(clamp(so / 0.2)) * Math.exp(-Math.max(0, so - 0.6) * 1.5) : 0);
  Hl.layers.forEach((L, j) => {
    const e = outExpo(clamp((open - 0.04 * j) / 0.3));
    const sc = lerp(0.12, 1, e) * (1 - 0.35 * sine(leave)) * (1 - 0.1 * inhale);
    L.g.scale.setScalar(L.type === 'rays' ? sc * rayLen : sc);
    L.g.rotation.z = L.w * t + j * 0.3;
    const boost = L.type === 'main' ? 0.4 * beatK : L.type === 'rays' ? 0.3 * beatK : 0.15 * beatK;
    L.mat.uniforms.uBright.value = L.base * clamp(e * 1.4) * (1 + boost + 0.6 * big + 0.5 * wake) * (1 - 0.9 * sine(leave)) * (1 - 0.15 * inhale);
  });
  if (I.feat.crown) { I.feat.crown.material.uniforms.uBright.value = 1.25 * dim; I.feat.crown.rotation.y = 0.25 * t; }
  // 雾、天光、远景：整个画面浸在这一宗的颜色里
  const ru = S.rays.material.uniforms;
  ru.uCol.value.set(sin.col).lerp(C3('#FFFFFF'), 0.25); ru.uBurst.value = 0.4 + 0.6 * ign; ru.uRot.value = 0.025 * t;
  ru.uInt.value = (0.1 + 0.2 * big + 0.05 * beatK) * (1 - dark);
  const su = S.shafts.material.uniforms; su.uCol.value.set(sin.col).lerp(C3('#FFFFFF'), 0.25); su.uInt.value = 0.15 * (0.5 + 0.5 * ign) * (1 - 0.7 * dark);
  S.bgGlow.material.uniforms.uCol.value.set(sin.col); S.bgGlow.material.uniforms.uInt.value = 0.085 * (1 - 0.5 * dark) * (1 + 0.3 * big);
  S.fog.forEach((f, j) => { f.material.uniforms.uCol.value.set(sin.col).lerp(C3('#9A90B0'), 0.25); f.material.uniforms.uInt.value = [0.03, 0.034, 0.04][j] * (1 - 0.5 * dark); });
  const gu = S.ground.material.uniforms;
  gu.uCol.value.set(sin.col).lerp(C3('#FFFFFF'), 0.3); gu.uWaveR.value = open * 6.5; gu.uWaveAmt.value = open >= 0 && open < 2 ? Math.exp(-open * 1.4) : 0; gu.uGlowAmt.value = 1 - 0.6 * dark;
  // 睁眼的扫描线：竖直亮线 0.25 秒从左到右扫过神像，经过眼睛的那一刻 = 重拍
  const ss = t - (Bt - SCAN_DUR / 2);
  if (ss >= 0 && ss < SCAN_DUR + 0.12) {
    const sx = lerp(-1.4, 1.4, clamp(ss / SCAN_DUR)), a = 1 - clamp((ss - SCAN_DUR) / 0.12);
    S.scanLine.visible = S.scanSoft.visible = true;
    S.scanLine.position.set(sx, 0, 0.75); S.scanSoft.position.set(sx, 0, 0.7);
    S.scanLine.material.uniforms.uCol.value.set(sin.col).lerp(C3('#FFFFFF'), 0.5); S.scanLine.material.uniforms.uInt.value = 0.9 * a;
    S.scanSoft.material.uniforms.uCol.value.set(sin.col); S.scanSoft.material.uniforms.uInt.value = 0.14 * a;
    for (const m of [I.headP.material, I.bodyP.material]) { m.uniforms.uScanX.value = sx; m.uniforms.uScanAmt.value = 0.25 * a; }
  } else for (const m of [I.headP.material, I.bodyP.material]) m.uniforms.uScanAmt.value = 0;
  const cam = cardCam(t, A, E, shake, 0.03 * inhale + 0.01 * u01(t, A, E));
  F.cam = cam;
  // 小人影：画面右下角的地面上
  S.people.visible = true;
  { // 放在画面右下角（屏幕约 82% 横向、93% 纵向）的地面上：从相机反投影到 z = 0.9 的平面
    const c = new THREE.PerspectiveCamera(35, 16 / 9, 0.1, 100); c.position.set(...cam.pos); c.lookAt(...cam.target); c.updateMatrixWorld(); c.updateProjectionMatrix();
    const v = new THREE.Vector3(0.64, -0.86, 0.5).unproject(c), dir = v.sub(c.position).normalize(), kk = (0.9 - c.position.z) / dir.z;
    const p = c.position.clone().addScaledVector(dir, kk); S.people.position.set(p.x, p.y, 0.9);
  }
  S.people.userData.glow.material.uniforms.uInt.value = 0.35 * (1 - 0.5 * dark);
  S.people.userData.glow.material.uniforms.uCol.value.set(sin.col).lerp(C3('#FFFFFF'), 0.4);
  F.shake = shake; F.bloom = 0.95 + 0.25 * big;
  F.ca = (open >= 0 && open < 1 / 30) || (so >= 0 && so < 1 / 30) ? 4 : 0;
  F.neb = neb(sin.col, 1 - 0.5 * dark); F.nebula = 1; F.dustCol = C3(sin.col).lerp(C3('#FFFFFF'), 0.4);
  F.vig = 1.15;
  F.text = { i, A, Bt, E, dark: sine(leave) };
  F.faces = faceBoxes([I]);
}
const u01 = (t, A, E) => clamp((t - A) / (E - A));

// 神像在屏幕上的包围盒（qa：文字离神像至少 80px）
function faceBoxes(idols) {
  const out = [];
  for (const I of idols) {
    if (!I.root.visible) continue;
    I.root.updateMatrixWorld(true);
    const pts = [[-0.7, 0.8, 0.2], [0.7, 0.8, 0.2], [-0.7, -0.62, 0.3], [0.7, -0.62, 0.3]].map(p => project(new THREE.Vector3(...p).applyMatrix4(I.head.matrixWorld).toArray()));
    out.push({ x0: Math.min(...pts.map(p => p[0])), x1: Math.max(...pts.map(p => p[0])), y0: Math.min(...pts.map(p => p[1])), y1: Math.max(...pts.map(p => p[1])), label: I.sin.name });
  }
  return out;
}

// ------------------------------------------------------------ 文字：左侧竖排罪名（约 170px）+ 小字「七宗罪 · 0N」+ 心里话 / 知识（46px）
const TX = 255, NX = 150;
export function text(t, ctx, F) {
  const T = F.text; if (!T) return;
  const sin = SINS[T.i], fade = 1 - T.dark;
  ctx.save();
  const g = ctx.createLinearGradient(0, 0, 860, 0);
  g.addColorStop(0, 'rgba(5,5,8,0.55)'); g.addColorStop(0.6, 'rgba(5,5,8,0.3)'); g.addColorStop(1, 'rgba(5,5,8,0)');
  ctx.globalAlpha = fade; ctx.fillStyle = g; ctx.fillRect(0, 0, 860, 1080); ctx.restore();
  const open = t - T.A, inA = clamp(open / 0.12);
  const pop = 1 + 0.15 * Math.exp(-open * 9);
  [...sin.name].forEach((ch, j) => {
    ctx.save(); ctx.translate(NX, 430 + j * 186); ctx.scale(pop, pop);
    glowText(ch, 0, 0, fs(900, 170), sin.col, { alpha: inA * fade, glow: 40, glow2: 80, glowColor: sin.col, shadowBlur: 18 });
    ctx.restore();
  });
  BOXES.push({ x0: NX - 90, y0: 430 - 95, x1: NX + 90, y1: 430 + 186 + 95, label: sin.name, alpha: inA * fade });
  const so = t - T.Bt, light = '#' + C3(sin.col).lerp(C3('#FFFFFF'), 0.55).getHexString(), high = '#' + C3(sin.col).lerp(C3('#FFFFFF'), 0.7).getHexString();
  const la = clamp((open - 0.1) / 0.15) * fade;
  glowText(`七宗罪 · 0${T.i + 1}`, TX, 395, fs(700, 30), light, { alpha: la, align: 'left', glow: 12, glowColor: sin.col });
  const qa = clamp((open - 0.1) / 0.15) * fade * (1 - clamp(so / 0.12));
  sin.quote.split(/(?<=，)/).forEach((line, j) => glowText(line, TX - (j ? 0 : 12), 470 + j * 66, fs(700, 46), '#FFFFFF', { alpha: qa, align: 'left', glow: 18, glowColor: sin.col }));
  if (so >= 0) {
    const fa = clamp((so - 0.04) / 0.15) * fade;
    sin.fact.split('\n').forEach((line, j) => glowText(line, TX, 470 + j * 66, fs(800, 46), high, { alpha: fa, align: 'left', glow: 20, glowColor: sin.col }));
    if (sin.sub) glowText(sin.sub, TX, 470 + sin.fact.split('\n').length * 66 + 6, fs(700, 28), '#E8E4F0', { alpha: fa * 0.9, align: 'left', glow: 8, glowColor: '#000000' });
  }
}
