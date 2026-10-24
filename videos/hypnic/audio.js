// 《入睡抽动》声音（设计时间）。没有背景音乐、没有旋律：只有极低频下坠、短 pulse、极轻心跳、呼吸、
// 神经传导的细高频线性音、界面展开声和文字 tick。全部由代码合成，给后期《千年之后》留出大量空间。
const { biquad, rng, SR, synth } = require('../../src/audio');
const { tick } = synth;

const buf = (sec) => new Float32Array(Math.ceil(sec * SR));

// 极短的低频下坠：120 → 38 Hz，一点点空气
function fall(seed = 1) {
  const b = buf(0.6), r = rng(seed), lp = biquad('lp', 260);
  let ph = 0;
  for (let i = 0; i < b.length; i++) {
    const t = i / SR;
    const f = 38 + 82 * Math.exp(-t * 7);
    ph += (2 * Math.PI * f) / SR;
    const e = Math.min(1, t / 0.015) * Math.exp(-t * 5.5);
    b[i] = Math.sin(ph) * e * 0.9 + lp(r() * 2 - 1) * e * 0.5;
  }
  return b;
}
// 抽动：很轻的「咚」——低频短促 + 一点点肉感的闷击
function pulse(seed = 2) {
  const b = buf(0.45), r = rng(seed), lp = biquad('lp', 400);
  for (let i = 0; i < b.length; i++) {
    const t = i / SR;
    const f = 52 + 60 * Math.exp(-t * 40);
    b[i] = Math.sin(2 * Math.PI * f * t) * Math.exp(-t * 11) * 0.9 + lp(r() * 2 - 1) * Math.exp(-t * 45) * 0.6;
  }
  return b;
}
// 极轻的心跳（两下）
function heartbeat() {
  const b = buf(0.9);
  for (const [st, g] of [[0, 1], [0.26, 0.55]]) {
    const s0 = Math.floor(st * SR);
    for (let i = 0; i < b.length - s0; i++) {
      const t = i / SR;
      b[s0 + i] += Math.sin(2 * Math.PI * (46 + 26 * Math.exp(-t * 30)) * t) * Math.exp(-t * 15) * g;
    }
  }
  return b;
}
// 一次缓慢的呼吸（吸 + 呼）
function breath(seed = 3, dur = 3.2) {
  const b = buf(dur), r = rng(seed), bp = biquad('bp', 900, 0.6), lp = biquad('lp', 2200);
  for (let i = 0; i < b.length; i++) {
    const t = i / SR, k = t / dur;
    const e = k < 0.42 ? Math.sin((k / 0.42) * Math.PI) * 0.7 : Math.sin(((k - 0.42) / 0.58) * Math.PI);
    b[i] = lp(bp(r() * 2 - 1)) * e * 1.2;
  }
  return b;
}
// 界面展开：一阵很轻、很短的上扫噪声
function unfold(seed = 4, dur = 0.5, up = true) {
  const b = buf(dur), r = rng(seed);
  let y1 = 0, y2 = 0;
  for (let i = 0; i < b.length; i++) {
    const t = i / SR, k = t / dur;
    const f = up ? 600 + 3400 * k : 4000 - 3400 * k;
    const a = Math.min(0.99, (2 * Math.PI * f) / SR);
    const x = r() * 2 - 1;
    y1 += a * (x - y1); y2 += a * (y1 - y2);
    b[i] = (y1 - y2) * Math.sin(Math.PI * k) * 1.8;
  }
  return b;
}
// 细高频线性音：曲线绘制 / 神经传导（很轻的上滑正弦）
function line(seed = 5, dur = 0.8, f0 = 2600, f1 = 3400) {
  const b = buf(dur), r = rng(seed);
  let ph = 0;
  for (let i = 0; i < b.length; i++) {
    const t = i / SR, k = t / dur;
    ph += (2 * Math.PI * (f0 + (f1 - f0) * k)) / SR;
    b[i] = (Math.sin(ph) * 0.4 + (r() * 2 - 1) * 0.03) * Math.sin(Math.PI * k) ** 2;
  }
  return b;
}
// 短促电子「嘀」：清醒
function pip() {
  const b = buf(0.3);
  for (let i = 0; i < b.length; i++) { const t = i / SR; b[i] = (Math.sin(2 * Math.PI * 1480 * t) + 0.3 * Math.sin(2 * Math.PI * 2960 * t)) * Math.min(1, t / 0.004) * Math.exp(-t * 18) * 0.5; }
  return b;
}
// 断开：极短的「咔」
function snap(seed = 6) {
  const b = buf(0.08), r = rng(seed), hp = biquad('hp', 2500);
  for (let i = 0; i < b.length; i++) { const t = i / SR; b[i] = hp(r() * 2 - 1) * Math.exp(-t * 160) * 1.5; }
  return b;
}
// 名字出现：低频轻冲击（比抽动更沉、更短）
function low(seed = 7) {
  const b = buf(1.0), r = rng(seed), lp = biquad('lp', 160);
  let ph = 0;
  for (let i = 0; i < b.length; i++) {
    const t = i / SR;
    ph += (2 * Math.PI * (36 + 22 * Math.exp(-t * 10))) / SR;
    b[i] = Math.sin(ph) * Math.exp(-t * 3.5) * 0.8 + lp(r() * 2 - 1) * Math.exp(-t * 16) * 0.9;
  }
  return b;
}

const CUES = [
  // A · 0–5.7：安静但有预兆 → 第一次「踩空」
  { t: 0.05, fx: heartbeat, gain: 0.22 },
  { t: 1.5, fx: heartbeat, gain: 0.16 },
  { t: 1.6, fx: () => line(100, 1.3, 5200, 5600), gain: 0.012 },   // 不稳的极细电流感
  { t: 3.0, fx: () => snap(102), gain: 0.08 },
  { t: 3.08, fx: () => fall(103), gain: 0.45 },
  { t: 3.1, fx: () => pulse(104), gain: 0.34 },
  // B · 5.7–14：拉回 → 抖 + 脉冲 → 清醒 → 收成时间轴 → 名字
  { t: 5.7, fx: () => unfold(105, 0.3, true), gain: 0.06 },
  { t: 7.55, fx: () => pulse(109), gain: 0.36 },
  { t: 7.57, fx: () => line(118, 0.45, 2400, 3600), gain: 0.03 },  // 脉冲扩散到四肢
  { t: 7.95, fx: pip, gain: 0.05 },
  { t: 9.0, fx: () => unfold(106, 1.2, false), gain: 0.04 },
  { t: 9.95, fx: () => tick(107), gain: 0.03 },
  { t: 10.05, fx: () => tick(108), gain: 0.025 },
  { t: 12.4, fx: () => low(110), gain: 0.3 },
  { t: 12.42, fx: () => tick(111), gain: 0.04 },
  { t: 13.65, fx: () => unfold(112, 0.6, false), gain: 0.035 },
  // C · 14–20：知识结构快速展开
  { t: 14.3, fx: () => tick(113), gain: 0.035 },
  { t: 14.5, fx: () => breath(114, 3.2), gain: 0.05 },
  { t: 16.3, fx: () => tick(119), gain: 0.03 },
  { t: 15.9, fx: () => line(116, 1.0, 2200, 2800), gain: 0.025 },  // 主干向下生长
  { t: 17.55, fx: () => unfold(117, 0.4, true), gain: 0.035 },
  ...[0, 1, 2, 3].map((i) => ({ t: 17.9 + i * 0.3, fx: () => tick(120 + i), gain: 0.032 })),
];

module.exports = CUES;
