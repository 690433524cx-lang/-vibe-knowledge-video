// 《记忆》声音（设计时间）。没有背景音乐：只有极轻的环境声和拟音，给后期《千年之后》留空间。
// 台灯电流、雨、照片落下、蜡笔、印章、放映机走带、极轻的「嗒」。全部由代码合成。
const { biquad, rng, SR, synth } = require('../../src/audio');
const { paper, tick, photoDrop, stamp, pencilScratch, threadTight, impact } = synth;

const buf = (sec) => new Float32Array(Math.ceil(sec * SR));
const env = (t, dur, a = 0.05, r = 0.3) => Math.min(1, t / a) * Math.min(1, Math.max(0, (dur - t) / r));

// 很轻的「心跳」：两下低频闷响
function heartbeat() {
  const b = buf(1.0);
  for (const [st, g] of [[0, 1], [0.24, 0.6]]) {
    const s0 = Math.floor(st * SR);
    for (let i = 0; i < b.length - s0; i++) {
      const t = i / SR;
      b[s0 + i] += Math.sin(2 * Math.PI * (48 + 30 * Math.exp(-t * 30)) * t) * Math.exp(-t * 14) * g;
    }
  }
  return b;
}
// 台灯 / 房间：很低的电流嗡声 + 空气
function hum(seed, dur) {
  const b = buf(dur), r = rng(seed), lp = biquad('lp', 300);
  for (let i = 0; i < b.length; i++) {
    const t = i / SR;
    b[i] = (Math.sin(2 * Math.PI * 100 * t) * 0.08 + lp(r() * 2 - 1) * 0.9) * env(t, dur, 0.02, 0.6);
  }
  return b;
}
// 雨：可以「闷住」（照片压上来以后，雨像隔了一层）
function rain(seed, dur, muffleAt = 1e9) {
  const b = buf(dur), r = rng(seed), hp = biquad('hp', 1600), lp = biquad('lp', 6500), lp2 = biquad('lp', 700), bp = biquad('bp', 2600, 3);
  for (let i = 0; i < b.length; i++) {
    const t = i / SR;
    const drop = r() < 0.0018 ? 1 : 0;
    const bright = lp(hp(r() * 2 - 1)) * 0.6 + bp(drop * 6) * 0.45;
    const m = Math.min(1, Math.max(0, (t - muffleAt) / 0.5));
    b[i] = (bright * (1 - m) + lp2(r() * 2 - 1) * 0.5 * m) * env(t, dur, 0.25, 0.8);
  }
  return b;
}
// 放映机走带：有节奏的咔嗒 + 马达，减速后停下
function projector(seed, dur, stopAt) {
  const b = buf(dur), r = rng(seed), bp = biquad('bp', 1900, 2), lp = biquad('lp', 220);
  let ph = 0;
  for (let i = 0; i < b.length; i++) {
    const t = i / SR;
    const k = Math.min(1, t / stopAt);
    const rate = 22 * (1 - k * k * k) + 0.01;
    const prev = ph;
    ph += rate / SR;
    const click = Math.floor(ph) !== Math.floor(prev) ? 1 : 0;
    b[i] = (bp((r() * 2 - 1) * 0.05 + click * 3) * 0.6 + lp(r() * 2 - 1) * 0.5 * (1 - k)) * env(t, dur, 0.15, 0.3);
  }
  return b;
}
// 推进照片：一阵很轻的气流
function swell(seed, dur) {
  const b = buf(dur), r = rng(seed), lp = biquad('lp', 1200);
  for (let i = 0; i < b.length; i++) { const t = i / SR, k = t / dur; b[i] = lp(r() * 2 - 1) * Math.sin(Math.PI * k) * k; }
  return b;
}

// 聚会：很远的人声（带通噪声 + 不规则起伏，听不清内容）
function murmur(seed, dur) {
  const b = buf(dur), r = rng(seed), bp1 = biquad('bp', 420, 1.2), bp2 = biquad('bp', 900, 1.5);
  let e1 = 0, e2 = 0;
  for (let i = 0; i < b.length; i++) {
    const t = i / SR;
    e1 += ((Math.sin(t * 5.3) * Math.sin(t * 2.1) > 0 ? 1 : 0.2) - e1) * 0.0008;
    e2 += ((Math.sin(t * 4.1 + 1) * Math.sin(t * 1.3) > 0 ? 1 : 0.2) - e2) * 0.0008;
    b[i] = (bp1(r() * 2 - 1) * e1 + bp2(r() * 2 - 1) * e2 * 0.6) * env(t, dur, 0.4, 0.5);
  }
  return b;
}
// 手机提示：一声极短、很轻的电子音
function notify() {
  const b = buf(0.35);
  for (let i = 0; i < b.length; i++) { const t = i / SR; b[i] = (Math.sin(2 * Math.PI * 1320 * t) + 0.4 * Math.sin(2 * Math.PI * 1980 * t)) * Math.exp(-t * 14) * 0.4; }
  return b;
}
// 玻璃轻响：几个不和谐的高频泛音
function glass(seed) {
  const b = buf(1.2), r = rng(seed);
  const parts = Array.from({ length: 6 }, () => [2800 + r() * 4200, 0.3 + r() * 0.7, r() * 0.25]);
  for (const [f, a, st] of parts) {
    const s0 = Math.floor(st * SR);
    for (let i = 0; i < b.length - s0; i++) { const t = i / SR; b[s0 + i] += Math.sin(2 * Math.PI * f * t) * a * Math.exp(-t * 9) * 0.25; }
  }
  return b;
}
// 台灯开关
function click(seed) {
  const b = buf(0.15), r = rng(seed), bp = biquad('bp', 2200, 2);
  for (let i = 0; i < b.length; i++) { const t = i / SR; b[i] = bp(r() * 2 - 1) * (Math.exp(-t * 300) * 2.5 + Math.exp(-Math.abs(t - 0.035) * 500) * 1.2); }
  return b;
}

const CUES = [
  // P1 · 第 0 秒
  { t: 0.0, fx: heartbeat, gain: 0.32 },
  { t: 0.0, fx: () => hum(11, 4.9), gain: 0.05 },
  { t: 3.6, fx: () => swell(12, 1.2), gain: 0.1 },
  // 回忆里：雨；照片压上来后雨被闷住
  { t: 4.3, fx: () => rain(13, 6.6, 4.6), gain: 0.13 },
  // 6.9 记忆错位：两下极短的「嗒」
  { t: 6.9, fx: () => tick(22), gain: 0.07 },
  { t: 7.5, fx: () => tick(23), gain: 0.05 },
  { t: 8.8, fx: () => paper(14, 0.6), gain: 0.08 },
  { t: 9.3, fx: () => photoDrop(15), gain: 0.14 },
  { t: 10.2, fx: () => hum(16, 6.2), gain: 0.04 },
  // 三个圈
  { t: 11.0, fx: () => pencilScratch(17, 0.45), gain: 0.07 },
  { t: 11.55, fx: () => pencilScratch(18, 0.45), gain: 0.07 },
  { t: 12.1, fx: () => pencilScratch(19, 0.45), gain: 0.07 },
  // 「确定」
  { t: 13.9, fx: () => stamp(20), gain: 0.34 },
  { t: 13.9, fx: heartbeat, gain: 0.14 },
  // 胶片
  { t: 16.0, fx: () => projector(21, 2.6, 2.4), gain: 0.09 },
  ...[0, 1, 2, 3, 4].map((i) => ({ t: 18.5 + i * 0.16, fx: () => tick(30 + i), gain: 0.03 })),
  ...[0, 1, 2, 3, 4].map((i) => ({ t: 19.9 + i * 0.55, fx: () => tick(40 + i), gain: 0.05 + i * 0.006 })),
];

// P2 生活
CUES.push(
  { t: 23.7, fx: () => photoDrop(50), gain: 0.1 },
  { t: 24.5, fx: () => pencilScratch(51, 0.5), gain: 0.07 },
  { t: 25.9, fx: () => pencilScratch(52, 0.3), gain: 0.08 },
  { t: 26.1, fx: () => pencilScratch(53, 0.5), gain: 0.07 },
  { t: 27.2, fx: notify, gain: 0.05 },
  { t: 28.72, fx: () => tick(54), gain: 0.07 },
  { t: 30.1, fx: () => murmur(55, 3.4), gain: 0.09 },
);
// 卡片
[33.1, 33.22, 33.34].forEach((t, i) => CUES.push({ t, fx: () => paper(60 + i, 0.35), gain: 0.05 }));
[34.3, 34.85, 35.4].forEach((t, i) => CUES.push({ t, fx: () => pencilScratch(63 + i, 0.35), gain: 0.08 }));
CUES.push({ t: 36.2, fx: () => paper(66, 0.8), gain: 0.06 });
// P3 文件：打开、一次次保存
CUES.push({ t: 37.1, fx: () => paper(70, 0.6), gain: 0.07 }, { t: 37.0, fx: () => hum(71, 13.4), gain: 0.035 });
[40.6, 41.6, 42.6, 43.6].forEach((t, i) => CUES.push({ t, fx: () => click(72 + i), gain: 0.06 }, { t: t + 0.3, fx: () => tick(76 + i), gain: 0.04 }));
CUES.push({ t: 47.4, fx: heartbeat, gain: 0.16 });
// P4 线索 / 实验 / 拼合
for (let i = 0; i < 5; i++) CUES.push({ t: 51.6 + i, fx: () => threadTight(80 + i, 0.4), gain: 0.04 });
CUES.push(
  { t: 58.3, fx: () => paper(86, 0.5), gain: 0.06 },
  { t: 59.3, fx: () => pencilScratch(87, 0.35), gain: 0.09 },
  { t: 59.6, fx: () => pencilScratch(88, 0.5), gain: 0.06 },
  { t: 62.3, fx: () => paper(89, 0.6), gain: 0.07 },
  { t: 63.2, fx: () => pencilScratch(90, 0.3), gain: 0.09 },
  { t: 63.5, fx: () => glass(91), gain: 0.05 },
);
for (let i = 0; i < 12; i++) CUES.push({ t: 66.4 + i * 0.2 + (i % 3) * 0.05, fx: () => paper(100 + i, 0.18), gain: 0.035 });
CUES.push({ t: 68.8, fx: () => swell(115, 1.4), gain: 0.06 });
// P5 伤口：冷掉的雨 → 考卷 → 普通的房间 → 一遍又一遍
CUES.push(
  { t: 72.6, fx: () => rain(120, 3.2, 0), gain: 0.07 },
  { t: 75.6, fx: () => paper(121, 0.5), gain: 0.06 },
  { t: 76.0, fx: () => pencilScratch(122, 0.6), gain: 0.06 },
  { t: 76.7, fx: () => pencilScratch(123, 0.35), gain: 0.07 },
  { t: 78.5, fx: () => hum(124, 3.2), gain: 0.04 },
);
for (let i = 0; i < 4; i++) {
  CUES.push({ t: 81.7 + i * 0.95, fx: () => projector(130 + i, 0.95, 0.9), gain: 0.05 + i * 0.02 });
  CUES.push({ t: 81.7 + i * 0.95, fx: () => tick(135 + i), gain: 0.06 + i * 0.02 });
}
CUES.push({ t: 85.5, fx: () => rain(140, 3.6, 0), gain: 0.04 });
// T：唯一的一次低频冲击
CUES.push({ t: 89.6, fx: () => impact(150), gain: 0.4 });
// P6 结尾
CUES.push(
  { t: 94.6, fx: () => hum(160, 23.5), gain: 0.04 },
  { t: 99.6, fx: () => stamp(161), gain: 0.22 },
  ...[100.8, 101.0, 101.2, 101.4].map((t, i) => ({ t, fx: () => paper(162 + i, 0.4), gain: 0.05 })),
  { t: 108.0, fx: () => paper(170, 0.9), gain: 0.06 },
  { t: 110.6, fx: () => paper(171, 0.7), gain: 0.07 },
  { t: 118.0, fx: () => click(172), gain: 0.06 },
);

module.exports = CUES;
