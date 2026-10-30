// 系列片头 seriesIntro(t, N)：0–2.0 秒；片尾循环 seriesOutro(t, ...)：最后 1 秒回到第 0 帧。
// 每一期只传入期数 N（傲慢 1、嫉妒 2……），其余完全相同。
import * as THREE from 'three';
import { K, HS, points, glow } from './core.js';
import { cloudMaterial } from './mat.js';
import { FACE } from './geo.js';
import { clamp, lerp, lerp3, prog, outExpo, sine, out3, hash, D2R, TAU, LOOP, qk, hex } from './util.js';
import { SIN } from './palette.js';
import { staggerLine, glowText, fs, C } from './text.js';

// 七张脸（头部中心）、缩放、绕 y 轴转向画面中心（最边上 18°）
export const SLOTS = [
  [-4.8, 0, 0, 0.8], [-3.2, 0, 0.2, 0.86], [-1.6, 0, 0.4, 0.92], [0, 0, 0.7, 1.0], [1.6, 0, 0.4, 0.92], [3.2, 0, 0.2, 0.86], [4.8, 0, 0, 0.8],
].map(([x, y, z, s], i) => ({ x, y, z, s, ry: -(i - 3) / 3 * 18 * D2R }));

// 片头镜头：纵向视野取「横向 50°」，让整排脸约占画面宽度的 92%；镜头平移把这一排放在 y≈820
const FOV_ROW = 2 * Math.atan(Math.tan(25 * D2R) * 0.935 * 1920 / 1080) / D2R;
export const CAM0 = { pos: [0, 0.15, 13.5], target: [0, 0, 0], fov: FOV_ROW, shift: 153 };
export const CAM_CLOSE = { pos: [0, 0.25, 4.2], target: [0, 0.25, 0], fov: 50, shift: 170 };
export const HERO_POS = [0, 0.25, 0];
export const HERO_RY = 10 * D2R;  // 2.0 秒时主角的脸微微侧向画面右边
export function camIntro(t) {
  if (t < 1.3) {
    const k = sine(prog(t, 0, 1.3));
    return { ...CAM0, pos: [0, 0.15, lerp(13.5, 12.8, k)] };
  }
  const k = outExpo(prog(t, 1.3, 2.0));
  return { pos: lerp3([0, 0.15, 12.8], CAM_CLOSE.pos, k), target: lerp3(CAM0.target, CAM_CLOSE.target, k), fov: lerp(FOV_ROW, 50, k), shift: lerp(153, 170, k) };
}

// 扫描光：p = (t − 0.2)/1.1，x = −6 + (目标脸的 x + 6)(1 − (1 − p)³)
const scanX = (t, N) => { const p = clamp((t - 0.2) / 1.1); return -6 + (SLOTS[N - 1].x + 6) * (1 - Math.pow(1 - p, 3)); };
// 光带离开第 i 张脸（距离 ≥ 0.4）的时刻；没经过返回 null
function passTimes(i, N) {
  const xt = SLOTS[N - 1].x + 6, xi = SLOTS[i].x;
  const tAt = x => { const q = clamp((x + 6) / xt); return 0.2 + 1.1 * (1 - Math.cbrt(1 - q)); };
  if (xi - 0.4 > SLOTS[N - 1].x) return null;
  return { enter: tAt(xi - 0.4), leave: xi + 0.4 >= SLOTS[N - 1].x ? Infinity : tAt(xi + 0.4) };
}

let faces = [], band;
const SLIT = 0.16; // 眼缝亮度 100% 对应的发光强度
export function build() {
  faces = SLOTS.map((s, i) => {
    const g = new THREE.Group(); K.scene.add(g);
    const mat = cloudMaterial({ size: 0.016, bright: 0.9, depthRef: 9, maxPx: 10, colA: '#E8E8F0', colB: '#A9A6BE', colHook: 'if (aMisc.y == 1.0) b *= 0.18;' });
    mat.uniforms.uEdgeCol.value.set(SIN[i].col); mat.uniforms.uEdgeAmt.value = 0.1;
    mat.uniforms.uSwirl.value = 0.6;
    const pts = points(K.litePB, mat, g);
    // 眼缝：长 0.16、高 0.012（世界单位），挂在头上，随头一起缩放
    const slits = [FACE.eyeL, FACE.eyeR].map(p => {
      const m = glow(5, SIN[i].col, [0.6 / HS, 0.16 / HS], g, { billboard: false, order: 41, half: [0.3 / HS, 0.08 / HS], ell: [0.08 / HS, 0.006 / HS], core: SIN[i].col });
      m.position.set(p[0], p[1] - 0.004, p[2] + 0.012); return m;
    });
    return { g, pts, slits };
  });
  band = glow(3, '#E8E8F0', [0.5, 4], K.scene, { core: '#FFFFFF', order: 45 });
  K.introFaces = faces;
}

// 眼缝呼吸：周期 2.4 秒（量化到成片时长），七张脸相位依次错开
const breath = (t, i) => 0.5 + 0.5 * Math.sin(TAU * qk(128 / 2.4) * t / LOOP - i * 0.9);

// 七张脸的状态。o: { scatter[i], fly[i], alpha[i], slit[i], pos/rot/scale 覆盖 }
function setFaces(t, st) {
  faces.forEach((F, i) => {
    const s = SLOTS[i], o = st[i];
    F.g.visible = o.visible !== false && (o.alpha ?? 1) > 0.003;
    if (!F.g.visible) return;
    const side = i === 3 ? 0 : Math.sign(s.x);
    const fly = o.fly ?? 0;
    F.g.position.set(...(o.pos ?? [s.x + side * 4.5 * fly, s.y + 0.6 * fly * (hash(i) - 0.5), s.z - 3 * fly]));
    F.g.rotation.set(0, o.ry ?? s.ry + side * 0.5 * fly, 0);
    F.g.scale.setScalar(HS * (o.scale ?? s.s));
    const u = F.pts.material.uniforms;
    u.uAlpha.value = o.alpha ?? 1; u.uBright.value = 0.9 * (o.bright ?? 1);
    u.uScatter.value = o.scatter ?? 0; u.uScatterDist.value = 0.35; u.uScatterBias.value.set(side * 0.9, 0.1, 0.25); u.uScatSpread.value = 0.5;
    u.uScanX.value = o.scanX ?? 0; u.uScanAmt.value = 0.35 * (o.scanAmt ?? 0);
    if (o.colA) { u.uColA.value.setRGB(...o.colA); u.uColB.value.setRGB(...o.colB); } else { u.uColA.value.set('#E8E8F0'); u.uColB.value.set('#A9A6BE'); }
    const lvl = o.slit ?? 0.4;
    F.slits.forEach(m => {
      const mu = m.material.uniforms;
      mu.uInt.value = SLIT * lvl * (0.75 + 0.25 * breath(t, i)) * (o.alpha ?? 1) * (1 - clamp((o.scatter ?? 0) * 1.5));
      mu.uRays.value = o.rays ?? 0;
      m.visible = mu.uInt.value > 0.0005;
    });
  });
}

// ------------------------------------------------------------ 0–2.0 秒
// 返回主角接手所需的信息：hand（0→1 主角显现）、face（被选中的脸当前的位置、旋转、缩放）
export function seriesIntro(t, N, F) {
  const sel = N - 1, sx = scanX(t, N);
  const scanAmt = t < 0.2 ? 0 : t < 1.3 ? sine(prog(t, 0.2, 0.35)) : 1 - sine(prog(t, 1.3, 1.5));
  const fly = outExpo(prog(t, 1.3, 2.0));
  const tide = sine(prog(t, 1.3, 2.0));
  const hand = sine(prog(t, 1.62, 1.96));
  const selCol = hex(SIN[sel].col);
  const st = SLOTS.map((s, i) => {
    const pt = passTimes(i, N);
    let slit = 0.4;
    if (pt && t >= pt.enter) slit = t < pt.leave ? 1 : lerp(1, 0.4, clamp((t - pt.leave) / 0.3));
    if (i === sel) {
      if (t >= 1.3) slit = lerp(2.0, 0.9, prog(t, 1.45, 2.0));
      return {
        pos: lerp3([s.x, s.y, s.z], HERO_POS, fly), ry: lerp(s.ry, HERO_RY, fly), scale: lerp(s.s, 1, fly),
        slit, rays: t >= 1.3 ? 1.6 * Math.exp(-(t - 1.3) * 3) : 0, scanX: sx, scanAmt: scanAmt * (1 - fly),
        alpha: 1 - hand, colA: mixRGB('#E8E8F0', F.palA, tide), colB: mixRGB('#A9A6BE', F.palB, tide), bright: 1 + 0.4 * fly,
      };
    }
    const sc = t >= 1.3 ? 2.5 * out3(prog(t, 1.3, 1.9)) : 0;
    return { slit, scatter: sc, fly: sine(prog(t, 1.3, 1.9)) * 0.8, scanX: sx, scanAmt, alpha: 1 - sine(prog(t, 1.55, 1.95)) };
  });
  setFaces(t, st);
  // 扫描光带
  band.visible = t > 0.2 && t < 1.5;
  if (band.visible) {
    band.position.set(sx, 0, 1.2);
    band.material.uniforms.uInt.value = 0.16 * scanAmt;
  }
  // 选中瞬间：火花
  if (t >= 1.3 && t < 2.0) {
    const p = faceWorld(sel);
    F.bursts.push({ t0: 1.3, pos: p, n: 140, speed: 1.8, life: 0.7, grav: 0.2, seed: 13, bright: 1.8 });
  }
  F.tide = tide; F.tideC = tideOrigin(N); F.selCol = selCol;
  return { hand, faceRY: lerp(SLOTS[sel].ry, HERO_RY, fly) };
}
const mixRGB = (h, rgb, k) => { const a = hex(h); return [lerp(a[0], rgb[0], k), lerp(a[1], rgb[1], k), lerp(a[2], rgb[2], k)]; };
function faceWorld(i) { const s = SLOTS[i]; return [s.x, s.y, s.z + 0.3]; }
// 潮水起点：选中的脸在画面上的位置（uv，y 向上）
function tideOrigin(N) {
  const s = SLOTS[N - 1];
  // 1.3 秒时的镜头：faces 在 y≈820；x 按横向视野 50° 换算
  const x = 0.5 + s.x / ((12.8 - s.z) * Math.tan(25 * D2R)) * 0.5;
  return [x, 1 - 820 / 1920];
}

// 片头字幕
export function introText(t, N) {
  if (t < 1.3) {
    // 两行（58px 单行宽 928px，超出安全区 820px）
    staggerLine(t, '七宗罪里，\n有一宗是为你准备的——', 540, 482, 58, 0, 1.3, { instant: true, fadeOut: 0, glowColor: '#C9C6DA', color: '#FFFFFF', maxW: 700 });
  } else if (t < 2.1) {
    const p = prog(t, 1.3, 1.5), s = lerp(1.4, 1, outExpo(p));
    const a = clamp(p * 4) * (1 - sine(prog(t, 1.9, 2.1)));
    // 放在脸的下方：2.0 秒后脸占画面上部 55%，y=520 会压在额头上
    glowText(`「${SIN[N - 1].name}」。`, 540, 1462, fs(700, 80 * s), SIN[N - 1].col, { alpha: a, glow: 30, glow2: 60, glowColor: SIN[N - 1].col });
  }
}

// ------------------------------------------------------------ 片尾循环：tl = 成片时长，最后 1 秒
// 返回 { heroScatter, cam(k) }：主角溶散进度；镜头由导演按 k 从当前镜头插值回 CAM0
export function seriesOutro(t, tl, N, F) {
  const a = tl - 1, k = prog(t, a, tl);
  const back = sine(prog(t, a + 0.15, tl));          // 七张脸飞回
  const st = SLOTS.map((s, i) => ({
    scatter: 2.5 * (1 - out3(prog(t, a + 0.15, tl - 0.04))), fly: 1 - back, alpha: sine(prog(t, a + 0.1, a + 0.6)),
    slit: 0.4, scanAmt: 0,
  }));
  setFaces(t, st);
  band.visible = false;
  F.tide = 1 - sine(prog(t, a + 0.1, tl - 0.05)); F.tideC = [0.5, 1 - 820 / 1920];
  return { heroScatter: 2.5 * out3(prog(t, a, a + 0.75)), k };
}
export function hideFaces() { faces.forEach(f => { f.g.visible = false; }); band.visible = false; }
