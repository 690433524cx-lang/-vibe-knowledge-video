// 第一期《傲慢》竖屏短版（系列版）：用新的系列片头，节奏与嫉妒短版一致
import { clamp, lerp, lerp3, prog, outExpo, sine, inOut, D2R } from '../util.js';
import { glowText, tag, plain, fs, C } from '../text.js';
import { introEvents, INTRO_BLOOM } from '../intro_events.js';
import { HERO_POS, HERO_RY } from '../intro.js';
import { buildHero, applyHero } from './hero.js';

export const N = 1, PAL = 'pride';
export const DURATION = { short: 11 };

export function timeline() {
  const I = introEvents(N);
  return {
    PUNCH: [...I.PUNCH, [3.5, 1.6], [6.6, 0.6], [8.4, 1]],
    FLASH: [...I.FLASH, [3.5, 0.35]],
    BOLTS: [...I.BOLTS, [3.5, -0.9, 0.32, 0.9], [6.8, 0.85, 0.2, 0.6]],
    SOURCES: [],
    SUBS: [
      [2.0, 3.5, '我从不觉得，\n自己比别人强。', { size: 60, exempt: true }],
      [3.6, 6.0, '我只是，〔紫〕确实〔/紫〕比他们强。', { size: 60, exempt: true }],
    ],
  };
}
export function build() { buildHero(); }

const camL = (a, b, k) => ({ pos: lerp3(a.pos, b.pos, k), target: lerp3(a.target, b.target, k), shift: lerp(a.shift ?? 0, b.shift ?? 0, k), fov: 50 });
function cam(t) {
  const shift = 170;
  if (t < 3.5) {
    const k = sine(prog(t, 2.0, 3.5)), a = 3 * D2R * k, d = lerp(4.2, 3.9, k);
    return { pos: [Math.sin(a) * d, 0.25, Math.cos(a) * d], target: [0, 0.25, 0], shift };
  }
  const a0 = 3 * D2R;
  const close = { pos: [Math.sin(a0) * 3.9, 0.25, Math.cos(a0) * 3.9], target: [0, 0.25, 0], shift };
  const back = { pos: [0, 0.1, 4.6], target: [0, 0.32, 0], shift: 190 };
  if (t < 6.0) return camL(close, back, sine(prog(t, 3.62, 6.0)));
  const wide = { pos: [-0.6, -0.2, 8.0], target: [-0.3, -0.1, 0], shift: 0 };
  if (t < 8.4) return camL(back, wide, inOut(prog(t, 6.0, 8.4)));
  const d = t - 8.4;
  return { ...wide, pos: [-0.6 + 0.05 * Math.sin(d * 0.8), -0.2, 8.0 - 0.12 * d] };
}

export function update(t, F) {
  const s = { pos: HERO_POS, ry: HERO_RY };
  if (t < 2.0) { s.alpha = F.intro ? F.intro.hand : 1; s.ry = F.intro ? F.intro.faceRY : HERO_RY; s.colA = F.palA; s.colB = F.palB; s.slit = 1.4; }
  if (t >= 3.5) {
    const o = outExpo(prog(t, 3.5, 3.7));
    s.eyeOpen = o; s.eyeInt = lerp(0, 3.0, o) * (1 + 0.8 * Math.exp(-(t - 3.5) * 3)); s.eyeRays = 1.6 * Math.exp(-(t - 3.5) * 1.2) + 0.5;
    s.crackT = t - 3.5;
  }
  // 加冕：6.0 起尖刺依次升起、光环展开、胸像从下往上组装
  if (t >= 6.0) {
    const order = [3, 2, 4, 1, 5, 0, 6];
    s.spikes = [0, 0, 0, 0, 0, 0, 0].map((_, k) => outExpo(prog(t, 6.15 + order.indexOf(k) * 0.14, 6.75 + order.indexOf(k) * 0.14)));
    s.ring = sine(prog(t, 6.0, 6.35)); s.gems = prog(t, 6.4, 7.4);
    s.halo = sine(prog(t, 6.5, 6.8)); s.haloScale = outExpo(prog(t, 6.5, 7.4)); s.haloRot = (t - 6.5) * 0.12;
    s.bust = 1; s.bustAsm = prog(t, 6.8, 8.0);
  }
  if (F.outro) s.scatter = F.outro.heroScatter;
  applyHero(s, t);
  F.cam = cam(t);
  F.bloom = t < 3.5 ? INTRO_BLOOM : t < 4.1 ? (t - 3.5 < 0.05 ? lerp(1.4, 2.4, (t - 3.5) / 0.05) : 1.6 + 0.8 * Math.exp(-(t - 3.55) * 9)) : 1.6;
}

export function text(t) {
  if (t < 8.4 || t > 10.05) return;
  const fo = 1 - sine(prog(t, 9.7, 10.0));
  const p = prog(t, 8.4, 8.62), s = lerp(1.35, 1, outExpo(p));
  glowText('傲慢', 540, 330, fs(900, 190 * s), 'metal', { alpha: clamp(p * 4) * fo, size: 190 * s, glow: 46, glow2: 90, glowColor: '#8B3DFF' });
  const words = [['自命不凡', 230, 620, 'center'], ['目中无人', 900, 700, 'right'], ['居高临下', 220, 1080, 'center'], ['自以为是', 900, 1150, 'right']];
  words.forEach(([w, x, y, al], i) => tag(t, w, x, y, 8.7 + i * 0.25, 10.0, { align: al, fo: 0.3 }));
  plain('完整版在主页', 540, 1450, 34, C.key, sine(prog(t, 9.2, 9.5)) * fo, { glow: 14 });
}
