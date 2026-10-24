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
  // 插段 · 「长个」误区（raw: true，总时间轴 13.65–20.65）
  { raw: true, t: 13.7, fx: () => unfold(300, 0.5, false), gain: 0.035 },
  { raw: true, t: 13.95, fx: () => snap(301), gain: 0.05 },
  { raw: true, t: 15.25, fx: () => low(302), gain: 0.2 },
  { raw: true, t: 15.25, fx: () => tick(303), gain: 0.04 },
  ...[15.5, 15.6, 15.7].map((t, i) => ({ raw: true, t, fx: () => tick(304 + i), gain: 0.022, pan: 0.4 })),
  { raw: true, t: 15.8, fx: () => line(307, 0.7, 2400, 3200), gain: 0.02, pan: 0.4 },
  { raw: true, t: 16.0, fx: pip, gain: 0.04 },
  { raw: true, t: 16.55, fx: () => line(308, 0.18, 5200, 3800), gain: 0.05 },
  { raw: true, t: 16.6, fx: () => snap(309), gain: 0.07 },
  { raw: true, t: 17.95, fx: () => unfold(310, 0.6, false), gain: 0.03 },
  { raw: true, t: 18.6, fx: () => low(311), gain: 0.18 },
  ...[18.8, 19.05, 19.3, 19.55].map((t, i) => ({ raw: true, t, fx: () => tick(312 + i), gain: 0.03 })),
  { raw: true, t: 19.9, fx: () => unfold(316, 0.75, true), gain: 0.035 },
  // D · 20–34.6：四条曲线依次亮起；呼吸声放慢、心跳放慢
  { t: 23.9, fx: () => line(130, 1.3, 2000, 2300), gain: 0.022 },
  { t: 24.0, fx: () => breath(131, 3.6), gain: 0.05 },
  { t: 25.8, fx: () => line(132, 1.3, 2100, 2400), gain: 0.022 },
  { t: 26.0, fx: heartbeat, gain: 0.12 },
  { t: 27.3, fx: heartbeat, gain: 0.09 },
  { t: 27.7, fx: () => line(133, 1.3, 2300, 1900), gain: 0.025 },
  { t: 30.0, fx: () => line(134, 1.3, 2200, 1800), gain: 0.022 },
  { t: 32.6, fx: () => unfold(135, 1.6, true), gain: 0.035 },
  // E · 34.6–54.2：异常波动、网络生长、信号错位
  { t: 35.4, fx: () => line(140, 2.8, 2100, 1700), gain: 0.02 },
  { t: 37.8, fx: () => pulse(141), gain: 0.12 },
  { t: 37.8, fx: () => snap(142), gain: 0.04 },
  { t: 39.3, fx: () => unfold(143, 0.9, false), gain: 0.035 },
  ...[40.6, 40.95, 41.3].map((t, i) => ({ t, fx: () => tick(144 + i), gain: 0.032 })),
  { t: 42.4, fx: () => line(147, 0.8, 2600, 3000), gain: 0.02 },
  ...[0, 1, 2, 3].map((i) => ({ t: 43.4 + i * 0.91, fx: () => tick(150 + i), gain: 0.02, pan: -0.2 })),
  { t: 46.45, fx: () => tick(155), gain: 0.026, pan: 0.3 },
  { t: 46.8, fx: () => tick(156), gain: 0.035 },
  { t: 50.3, fx: () => unfold(157, 0.4, true), gain: 0.03 },
  { t: 51.8, fx: () => tick(158), gain: 0.035 },
  { t: 52.6, fx: () => unfold(159, 1.4, false), gain: 0.03 },
  // F · 54.2–68.2：真实 vs 感知；下弯；「踩空」
  { t: 54.6, fx: () => line(160, 6.6, 1800, 2100), gain: 0.014 },
  { t: 59.6, fx: () => fall(161), gain: 0.3 },
  ...[62.0, 62.35, 62.7].map((t, i) => ({ t, fx: () => tick(162 + i), gain: 0.03 })),
  { t: 63.6, fx: () => tick(165), gain: 0.035 },
  { t: 65.2, fx: () => low(166), gain: 0.26 },
  { t: 66.3, fx: () => unfold(167, 0.7, false), gain: 0.03 },
  // G · 68.2–79.6：运动反应、神经传导、抽动、回弹
  { t: 68.7, fx: () => tick(170), gain: 0.03 },
  { t: 69.35, fx: () => unfold(171, 0.9, true), gain: 0.03 },
  { t: 70.6, fx: () => line(172, 0.5, 3000, 4200), gain: 0.04 },
  { t: 71.12, fx: () => pulse(173), gain: 0.34 },
  { t: 71.3, fx: () => tick(174), gain: 0.03 },
  { t: 75.5, fx: () => unfold(175, 0.5, true), gain: 0.03 },
  { t: 77.0, fx: () => pulse(176), gain: 0.16 },
  // H · 79–89：图谱逐节点生长 + 一次金色脉冲
  ...Array.from({ length: 8 }, (_, k) => ({ t: 79.6 + 0.85 * k, fx: () => tick(180 + k), gain: 0.03 + k * 0.002 })),
  { t: 86.4, fx: () => line(190, 2.2, 1600, 3200), gain: 0.03 },
  { t: 88.6, fx: () => low(191), gain: 0.22 },
  // I · 89.2–97.8
  { t: 89.2, fx: () => unfold(192, 1.0, false), gain: 0.03 },
  { t: 89.7, fx: () => tick(193), gain: 0.035 },
  ...Array.from({ length: 6 }, (_, i) => ({ t: 90.95 + i * 0.45, fx: () => tick(194 + i), gain: 0.028, pan: i % 2 ? 0.25 : -0.1 })),
  { t: 95.0, fx: () => unfold(200, 0.5, true), gain: 0.03 },
  { t: 97.0, fx: () => unfold(201, 0.8, false), gain: 0.04 },
  // J · 「危险吗？」：前后各留一段静音
  { t: 98.4, fx: () => tick(202), gain: 0.03 },
  ...[99.0, 99.45, 99.9].map((t, i) => ({ t, fx: () => tick(203 + i), gain: 0.025 })),
  ...[100.6, 100.9, 101.2, 101.5, 102.3].map((t, i) => ({ t, fx: () => tick(206 + i), gain: 0.025 })),
  // K · 结尾：一次缓慢的呼吸，底噪逐渐消失
  { t: 106.0, fx: () => unfold(212, 0.9, true), gain: 0.03 },
  { t: 107.2, fx: () => breath(213, 4.0), gain: 0.04 },
  { t: 111.6, fx: () => line(214, 1.4, 1500, 1300), gain: 0.015 },
  { t: 112.3, fx: () => low(215), gain: 0.2 },
];

module.exports = CUES;
