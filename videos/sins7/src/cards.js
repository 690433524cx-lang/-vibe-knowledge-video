// 时间轴与七张卡：每宗两小节（A 卡「罪」在 R2i 开光，B 卡「大脑」在 R2i+1 扫描），下一宗重拍前 0.3 秒收拢暗下
import * as THREE from 'three';
import { K, project } from './core.js';
import { PB } from './geo.js';
import { clamp, lerp, prog, sine, outExpo, out3, rng, TAU } from './util.js';
import { glowText, fs, BOXES } from './text.js';
import { SINS, BG, GROUND_Y, HALO_C } from './idol.js';
import * as H from './halo.js';

let S, B, R, BEATS;
export function setScene(scene, beats) { S = scene; BEATS = beats; B = beats.beats; R = beats.R; }
const C3 = h => new THREE.Color(h);

// ------------------------------------------------------------ 光环（每宗一套，至少五层；第一层是各宗自己的纹样）
const INNER = { pride: 'feather', envy: 'rings', wrath: 'rings', sloth: 'rings', greed: 'rings', gluttony: 'rings', lust: 'rings' };
export function buildHalo(sin, i, k) {
  const group = new THREE.Group(); group.position.set(...HALO_C); K.scene.add(group);
  const spec = [[INNER[sin.id], 1.05, 1.1], ['ticks', 1.5, 1.0], ['dots', 1.9, 1.3], ['zigzag', 2.4, 1.15], ['bigticks', 3.6, 1.1]];
  const layers = spec.map(([type, r, br], j) => {
    const g = new THREE.Group(); group.add(g);
    const mat = H.ringMaterial(sin.col, br);
    const p = new THREE.Points(H.ringPB(type, r, 300 + i * 10 + j, k).geometry(THREE), mat); p.frustumCulled = false; g.add(p); K.mats.push(mat);
    return { g, mat, base: br, dir: j % 2 ? -1 : 1, w: [0.06, 0.035, 0.05, 0.025, 0.012][j] };
  });
  group.visible = false;
  return { group, layers };
}

// ------------------------------------------------------------ 各宗的头部特征
function crownPB(k) {
  // 悬浮在头顶的一圈光刺王冠：一圈细环 + 15 根向上的光刺（正前方最高）
  const Rr = rng(77), pb = new PB(), N = n => Math.round(n * k);
  const y0 = 0.86, rx = 0.42, rz = 0.38, cz = -0.12;
  for (let i = 0; i < N(5000); i++) { const a = Rr() * TAU; pb.add([Math.sin(a) * rx, y0 + (Rr() - 0.5) * 0.008, cz + Math.cos(a) * rz], [0, 0, 0], Rr(), [0, 0, 0], [0, 0, 0, 1], [1.0, 30]); }
  for (let s = 0; s < 15; s++) {
    const a = (s / 15) * TAU, front = 0.5 + 0.5 * Math.cos(a), h = 0.08 + 0.14 * Math.pow(front, 2) + (s % 2 ? 0 : 0.035);
    const b = [Math.sin(a) * rx, y0, cz + Math.cos(a) * rz];
    for (let j = 0; j < N(500); j++) {
      const u = Math.pow(Rr(), 0.7), w = 0.016 * (1 - u);
      pb.add([b[0] * (1 + 0.12 * u) + (Rr() - 0.5) * w, y0 + u * h, b[2] * (1 + 0.12 * u) + (Rr() - 0.5) * w + cz * 0.12 * u], [0, 0, 0], Rr(), [0, 0, 0], [0, 0, 0, 1], [u > 0.88 ? 2.2 : 1.2, 30]);
    }
  }
  return pb;
}
export function buildFeatures(I, i, k) {
  I.feat = {};
  if (SINS[i].id === 'pride') {
    const mat = H.ringMaterial(SINS[i].col, 0.75); mat.uniforms.uSize.value = 0.008;
    const p = new THREE.Points(crownPB(k).geometry(THREE), mat); p.frustumCulled = false; I.head.add(p); K.mats.push(mat);
    I.feat.crown = p; I.mats.push(mat);
  }
}
// 头部姿态（rotation.x 负值抬下巴）
const POSE = { pride: [-0.11, 0, 0], envy: [0.04, -0.12, 0.03], wrath: [0.05, 0, 0], sloth: [0.1, 0, 0.02], greed: [0.04, 0, 0], gluttony: [0.02, 0, 0], lust: [0.06, 0.06, -0.04] };

// ------------------------------------------------------------ 节拍工具
const lastBeat = t => { let lo = 0, hi = B.length - 1, r = -1; while (lo <= hi) { const m = (lo + hi) >> 1; if (B[m] <= t + 1e-9) { r = m; lo = m + 1; } else hi = m - 1; } return r; };
// 每一拍：瞬间亮起，0.15 秒回落
export function beatPulse(t) { const i = lastBeat(t); if (i < 0) return 0; const d = t - B[i]; return d < 0.15 ? 1 - d / 0.15 : 0; }
export const SCAN_DUR = 0.3, DARK = 0.3;
export function cardTimes(i) { return { A: R[2 * i], Bt: R[2 * i + 1], E: R[2 * i + 2] }; }
export function events() {
  const ev = [];
  SINS.forEach((s, i) => {
    const { A, Bt, E } = cardTimes(i);
    ev.push({ name: `${s.name} 开光`, t: A, beat: true });
    ev.push({ name: `${s.name} 扫描线扫过（开始）`, t: Bt, beat: true });
    ev.push({ name: `${s.name} 收拢暗下（完成）`, t: E, beat: true });
  });
  ev.push({ name: '结尾 七尊归位', t: R[14], beat: true });
  ev.push({ name: '结尾 同时亮起 + 问话', t: R[15], beat: true });
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
  return { b: C3(BG), d: c.clone().multiplyScalar(0.02 * k), m: c.clone().multiplyScalar(0.04 * k), h: c.clone().lerp(C3('#FFFFFF'), 0.3).multiplyScalar(0.1 * k) };
}
export function frame(t) {
  hideAll();
  const F = { bursts: [], bloom: 1.05, nebula: 1, shake: 0, faces: [], text: null };
  if (t < R[0]) cardFrame(0, R[0] + 0.0001, F, true);       // 开头：之后替换成七尊神像（确认神像感之后再做）
  else if (t < R[14]) { let i = 0; while (i < 6 && t >= R[2 * i + 2]) i++; cardFrame(i, t, F); }
  else cardFrame(6, R[14] - 0.31, F);
  return F;
}

function cardCam(t, A, E, shake) {
  const u = clamp((t - A) / (E - A));
  const d = lerp(5.15, 4.65, u), ty = lerp(-0.6, -0.44, u);
  const xo = -0.135 * d;
  const pos = [xo, -1.62, d], target = [xo, ty, 0];
  if (shake > 0) { pos[0] += 0.03 * shake * Math.sin(t * 91); pos[1] += 0.03 * shake * Math.cos(t * 73); target[1] += 0.02 * shake * Math.sin(t * 57); }
  return { pos, target, fov: 35 };
}

function cardFrame(i, t, F, still = false) {
  const sin = SINS[i], I = S.idols[i], Hl = S.halos[i];
  const { A, Bt, E } = cardTimes(i);
  const open = t - A, dark = sine(prog(t, E - DARK, E)), pulse = beatPulse(t);
  const flash = open >= 0 ? Math.exp(-open * 5) : 0;
  const shake = open < 0.4 ? Math.exp(-open * 9) : 0;
  const ign = outExpo(clamp(open / 0.25));
  // 神像
  I.root.visible = true; I.root.scale.setScalar(1 + 0.02 * pulse);
  const P = POSE[sin.id]; I.head.rotation.set(P[0], P[1], P[2]);
  const dim = lerp(0.35, 1, ign) * (1 - 0.82 * dark) * (1 + 0.25 * flash);
  for (const m of I.mats) { if (m.uniforms.uDim) m.uniforms.uDim.value = dim; if (m.uniforms.uGray) m.uniforms.uGray.value = 0; }
  // 光环：从中心一层层展开（0.4 秒内到位），相邻两层反向旋转
  Hl.group.visible = true;
  Hl.layers.forEach((L, j) => {
    const e = outExpo(clamp((open - 0.04 * j) / 0.28));
    L.g.scale.setScalar(lerp(0.1, 1, e) * (1 - 0.4 * dark));
    L.g.rotation.z = L.dir * L.w * t + j * 0.3;
    L.mat.uniforms.uBright.value = L.base * clamp(e * 1.4) * (1 + 0.55 * pulse + 0.8 * flash) * (1 - 0.9 * dark);
  });
  // 放射光芒、体积光、远景
  const ru = S.rays.material.uniforms;
  ru.uCol.value.set(sin.col).lerp(C3('#FFFFFF'), 0.25); ru.uBurst.value = 0.15 + 0.85 * outExpo(clamp(open / 0.4)); ru.uRot.value = 0.025 * t;
  ru.uInt.value = (0.16 + 0.35 * flash + 0.06 * pulse) * (1 - 0.85 * dark);
  const su = S.shafts.material.uniforms; su.uCol.value.set(sin.col).lerp(C3('#FFFFFF'), 0.2); su.uInt.value = 0.085 * (0.5 + 0.5 * ign) * (1 - 0.7 * dark);
  S.bgGlow.material.uniforms.uCol.value.set(sin.col); S.bgGlow.material.uniforms.uInt.value = 0.06 * (1 - 0.5 * dark) * (1 + 0.3 * flash);
  S.fog.forEach((f, j) => { f.material.uniforms.uCol.value.set(sin.col).lerp(C3('#9090A0'), 0.4); f.material.uniforms.uInt.value = [0.016, 0.018, 0.02][j] * (1 - 0.5 * dark); });
  // 地面冲击波与小人影
  const gu = S.ground.material.uniforms;
  gu.uCol.value.set(sin.col).lerp(C3('#FFFFFF'), 0.3); gu.uWaveR.value = open * 6.5; gu.uWaveAmt.value = open >= 0 && open < 2 ? Math.exp(-open * 1.4) : 0; gu.uGlowAmt.value = 1 - 0.6 * dark;
  S.people.material.uniforms.uColA.value.set(sin.col).lerp(C3('#FFFFFF'), 0.7); S.people.material.uniforms.uColB.value.set(sin.col).lerp(C3('#FFFFFF'), 0.4);
  S.people.material.uniforms.uBright.value = 1.6 * (1 - 0.5 * dark);
  // B 卡：扫描线扫过 → 头部半透明，露出大脑，对应区域爆亮，光柱冲出头顶
  const sb = t - Bt;
  const sx = sb >= 0 ? lerp(-0.95, 0.95, clamp(sb / SCAN_DUR)) : -99;
  const see = sb >= 0 ? 0.62 * clamp(sb / 0.08) : 0;
  for (const m of [I.headP.material, I.eyesP.material]) { m.uniforms.uSeeX.value = sx; m.uniforms.uSeeThru.value = see; }
  if (I.feat.crown) I.feat.crown.material.uniforms.uBright.value = 0.75 * dim * (1 - 0.6 * see);
  const scanAmt = sb >= 0 ? Math.max(0, 1 - Math.max(0, sb - SCAN_DUR) / 0.15) : 0;
  for (const m of [I.headP.material, I.bodyP.material]) { m.uniforms.uScanX.value = sx; m.uniforms.uScanAmt.value = 0.22 * scanAmt; }
  if (I.brain) {
    I.brain.visible = sb >= 0;
    const bu = I.brain.material.uniforms;
    bu.uSeeX.value = sx; bu.uBright.value = 0.8 * (1 - 0.8 * dark);
    REGION[sin.id](sb, bu, F, I);
  }
  if (sb >= 0) {
    S.scanLine.visible = S.scanSoft.visible = scanAmt > 0.01;
    S.scanLine.position.set(sx, 0.0, 0.75); S.scanSoft.position.set(sx, 0.0, 0.7);
    S.scanLine.material.uniforms.uCol.value.set(sin.col).lerp(C3('#FFFFFF'), 0.5); S.scanLine.material.uniforms.uInt.value = 0.9 * scanAmt;
    S.scanSoft.material.uniforms.uCol.value.set(sin.col); S.scanSoft.material.uniforms.uInt.value = 0.14 * scanAmt;
    const pk = sb - 0.15;
    if (pk > 0) {
      S.pillar.visible = true; S.pillar.position.set(0, 0.85 + 3, -0.1);
      S.pillar.material.uniforms.uCol.value.set(sin.col); S.pillar.material.uniforms.uTime.value = t;
      S.pillar.material.uniforms.uInt.value = (0.55 + 1.1 * Math.exp(-pk * 3.5)) * outExpo(clamp(pk / 0.12)) * (1 - dark);
    }
  }
  F.cam = cardCam(t, A, E, shake);
  F.shake = shake; F.bloom = 0.9 + 0.35 * flash;
  F.neb = neb(sin.col, 1 - 0.5 * dark); F.nebula = 1; F.dustCol = C3(sin.col).lerp(C3('#FFFFFF'), 0.4);
  F.text = { i, A, Bt, E, dark, still };
  F.faces = faceBoxes([I]);
}

// 大脑里爆亮的区域（大脑局部坐标：x 左右，y 上下，z 前后；前额在 +z）
const REGION = {
  pride(sb, u) { const k = sb < 0.15 ? 0 : 1.0 + 1.2 * Math.exp(-(sb - 0.15) * 4); u.uRegC.value[0].set(-0.95, 0.25, 0.25, k); u.uRegC.value[1].set(-0.95, 0.25, -0.25, k); u.uRegC.value[2].set(-0.75, 0.5, 0, k * 0.8); u.uRegR.value = 0.09; },
};
for (const s of SINS) if (!REGION[s.id]) REGION[s.id] = REGION.pride;

// 神像脸部在屏幕上的包围盒（qa：文字不能压到脸）
function faceBoxes(idols) {
  const out = [];
  for (const I of idols) {
    if (!I.root.visible) continue;
    I.root.updateMatrixWorld(true);
    const pts = [[-0.5, 0.75, 0.2], [0.5, 0.75, 0.2], [-0.5, -0.62, 0.3], [0.5, -0.62, 0.3]].map(p => {
      const v = new THREE.Vector3(...p).applyMatrix4(I.head.matrixWorld); return project(v.toArray());
    });
    out.push({ x0: Math.min(...pts.map(p => p[0])), x1: Math.max(...pts.map(p => p[0])), y0: Math.min(...pts.map(p => p[1])), y1: Math.max(...pts.map(p => p[1])), label: I.sin.name });
  }
  return out;
}

// ------------------------------------------------------------ 文字
const TX = 262, NX = 150;
export function text(t, ctx, F) {
  const T = F.text; if (!T) return;
  const sin = SINS[T.i];
  const fade = 1 - T.dark;
  // 文字区后面的暗色渐变
  ctx.save();
  const g = ctx.createLinearGradient(0, 0, 900, 0);
  g.addColorStop(0, 'rgba(5,5,8,0.62)'); g.addColorStop(0.6, 'rgba(5,5,8,0.35)'); g.addColorStop(1, 'rgba(5,5,8,0)');
  ctx.globalAlpha = 0.9 * fade; ctx.fillStyle = g; ctx.fillRect(0, 0, 900, 1080); ctx.restore();
  const open = t - T.A, inA = clamp(open / 0.18);
  // 竖排罪名（约 180px）
  const pop = 1 + 0.12 * Math.exp(-open * 8);
  [...sin.name].forEach((ch, j) => {
    ctx.save(); ctx.translate(NX, 420 + j * 196); ctx.scale(pop, pop);
    glowText(ch, 0, 0, fs(900, 180), sin.col, { alpha: inA * fade, glow: 40, glow2: 80, glowColor: sin.col, shadowBlur: 18 });
    ctx.restore();
  });
  BOXES.push({ x0: NX - 95, y0: 420 - 100, x1: NX + 95, y1: 420 + 196 + 100, label: sin.name, alpha: inA * fade });
  const sb = t - T.Bt;
  const light = '#' + C3(sin.col).lerp(C3('#FFFFFF'), 0.55).getHexString();
  if (sb < 0) {
    // A 卡：小字标签 + 心里话
    const a = clamp(open / 0.15) * fade * (1 - clamp((sb + 0.08) / 0.08));
    glowText(`七宗罪 · 0${T.i + 1}`, TX, 398, fs(600, 32), light, { alpha: a, align: 'left', glow: 12, glowColor: sin.col });
    glowText(sin.quote, TX - 10, 478, fs(700, 48), '#FFFFFF', { alpha: clamp((open - 0.06) / 0.2) * fade, align: 'left', glow: 18, glowColor: sin.col });
  } else {
    // B 卡：出厂设置 + 知识（≤15 字，约 60px）+ 出处（28px）；保留到下一宗暗下去
    const a = clamp(sb / 0.15) * fade;
    glowText(`出厂设置 0${T.i + 1}`, TX, 398, fs(600, 32), light, { alpha: a, align: 'left', glow: 12, glowColor: sin.col });
    sin.fact.split('\n').forEach((line, j) => glowText(line, TX, 484 + j * 80, fs(800, 60), '#FFFFFF', { alpha: clamp((sb - 0.05 - j * 0.08) / 0.2) * fade, align: 'left', glow: 22, glowColor: sin.col }));
    const nl = sin.fact.split('\n').length;
    glowText(sin.src, TX, 484 + nl * 80 + 10, fs(500, 28), '#C8C8D2', { alpha: clamp((sb - 0.2) / 0.25) * fade * 0.95, align: 'left', glow: 6, glowColor: '#000000' });
  }
}
