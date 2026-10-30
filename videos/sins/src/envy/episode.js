// 第二期《嫉妒》：竖屏短版（11 秒）与长版（84 秒）
import { K } from '../core.js';
import { clamp, lerp, lerp3, prog, outExpo, sine, out3, inOut, D2R, hash } from '../util.js';
import { glowText, staggerLine, tag, plain, fs, C } from '../text.js';
import { introEvents, INTRO_BLOOM } from '../intro_events.js';
import { HERO_POS, HERO_RY, CAM_CLOSE } from '../intro.js';
import { buildHero, applyHero, OTHER_POS, CRACK_T0 } from './hero.js';
import { ENVY } from './assets.js';
import * as L from './long.js';

export const N = 2, PAL = 'envy';
export const DURATION = { short: 11, long: 84 };

export function timeline(ver) {
  const I = introEvents(N);
  const short = {
    PUNCH: [...I.PUNCH, [3.5, 1.6], [8.4, 1]],
    FLASH: [...I.FLASH, [3.5, 0.35]],
    BOLTS: [...I.BOLTS, [3.5, -0.9, 0.32, 0.9], [6.8, 0.85, 0.2, 0.6]],
    SOURCES: [],
    SUBS: [
      [2.0, 3.5, '我真心为你高兴。', { size: 60, exempt: true }],
      [3.6, 6.0, '只要你，别比我〔毒〕好太多〔/毒〕。', { size: 60, exempt: true }],
    ],
  };
  if (ver === 'short') return short;
  return L.timeline(short);
}

let ver = 'short';
export function build(v, preview) {
  ver = v;
  buildHero(preview);
  if (ver === 'long') L.build(preview);
}

// ------------------------------------------------------------ 0–10 秒：钩子（短版与长版相同）
// 镜头
function hookCam(t) {
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
const camL = (a, b, k) => ({ pos: lerp3(a.pos, b.pos, k), target: lerp3(a.target, b.target, k), shift: lerp(a.shift ?? 0, b.shift ?? 0, k), fov: 50 });

function hookHero(t, F) {
  const s = { pos: HERO_POS, ry: HERO_RY };
  if (t < 2.0) { s.alpha = F.intro ? F.intro.hand : 1; s.ry = F.intro ? F.intro.faceRY : HERO_RY; s.colA = F.palA; s.colB = F.palB; s.slit = 1.4; }
  // 睁眼：3.5 秒，0.2 秒张开，眼珠斜向画面右侧
  if (t >= 3.5) {
    // 0.25 秒内上眼睑抬到 45%，虹膜从暗到亮爆开；视线光束在睁眼后 0.2 秒射出，0.4 秒射到「别人」
    const o = outExpo(prog(t, 3.5, 3.75));
    s.eyeOpen = 0.45 * o; s.gaze = 1; s.irisB = 0.2 + 0.8 * o + 1.4 * Math.exp(-(t - 3.5) * 9) * o; s.sparkT0 = 3.5;
    s.beam = 1; s.beamReach = outExpo(prog(t, 3.7, 4.1));
    s.crackT = t - CRACK_T0;
  }
  // 远处的「别人」：3.5–4.0 从暗处浮现
  s.other = sine(prog(t, 3.5, 4.0));
  // 化形
  s.snakes = [0, 1, 2, 3].map(i => sine(prog(t, 6.0 + i * 0.12, 7.0 + i * 0.05)));
  s.thorn = outExpo(prog(t, 6.55, 7.4)); s.thornSeed = Math.exp(-Math.pow((t - 6.5) / 0.12, 2)) * 1.4;
  s.thornRot = (t - 6.4) * 6 * D2R;
  s.bust = t > 6.8 ? 1 : 0; s.bustAsm = prog(t, 6.8, 8.0);
  s.heart = outExpo(prog(t, 7.5, 8.0));
  return s;
}

export function update(t, F) {
  if (ver === 'long' && t >= 10.0) { L.update(t, F); return; }
  const s = hookHero(t, F);
  // 片尾循环：主角沿螺旋飞散
  if (F.outro) { s.scatter = F.outro.heroScatter; s.other = s.other * (1 - prog(t, F.tl - 1, F.tl - 0.6)); }
  applyHero(s, t, F.bursts);
  if (ver === 'long') L.hide();
  // 蛇钻出时，在裂纹末端迸出一小团火花
  for (let i = 0; i < 4; i++) {
    const tb = 6.0 + i * 0.12;
    if (t >= tb && t < tb + 0.6) F.bursts.push({ t0: tb, pos: [(-0.5 + i * 0.33) * 0.9, 0.25 + 0.1 * (i % 2), 0.55], n: 30, speed: 0.6, life: 0.6, grav: 0.2, seed: 700 + i, bright: 2 });
  }
  F.cam = hookCam(t);
  F.bloom = hookBloom(t);
}
function hookBloom(t) {
  if (t < 3.5) return INTRO_BLOOM;
  // 睁眼瞬间升到 2.4，0.6 秒内指数回落到 1.6
  if (t < 4.1) { const d = t - 3.5; return d < 0.05 ? lerp(1.4, 2.4, d / 0.05) : 1.6 + 0.8 * Math.exp(-(d - 0.05) * 9); }
  return 1.6;
}

export function text(t, F) {
  if (ver === 'long' && t >= 10.0) { L.text(t, F); return; }
  if (t < 8.4 || t > 10.05) return;
  const fo = 1 - sine(prog(t, 9.7, 10.0));
  // 标题：8.4 秒砸入
  const p = prog(t, 8.4, 8.62), s = lerp(1.35, 1, outExpo(p));
  glowText('嫉妒', 540, 330, fs(900, 190 * s), 'metal', { alpha: clamp(p * 4) * fo, size: 190 * s, glow: 46, glow2: 90, glowColor: '#3DDC84' });
  // 特征词
  const words = [['暗自比较', 230, 620, 'center'], ['口是心非', 900, 700, 'right'], ['见不得好', 220, 1080, 'center'], ['不甘心', 900, 1150, 'right']];
  words.forEach(([w, x, y, al], i) => tag(t, w, x, y, 8.7 + i * 0.25, 10.0, { align: al, fo: 0.3 }));
  if (ver === 'short') plain('完整版在主页', 540, 1450, 34, C.key, sine(prog(t, 9.2, 9.5)) * fo, { glow: 14 });
}

export function hideHook() { applyHero({ visible: false, other: 0 }, 0, []); }
