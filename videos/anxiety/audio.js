// 《提前焦虑》声音（设计时间）。没有音乐、没有口播：只有一层很低的空间底噪，
// 和跟着信号走的轻声——分支「嗒」、脉冲、心跳、呼吸、汇聚。全部代码合成，克制，不做爆炸。
const { biquad, rng, SR, synth } = require('../../src/audio');
const { tick, impact } = synth;

const buf = (sec) => new Float32Array(Math.ceil(sec * SR));
const env = (t, dur, a = 0.05, r = 0.3) => Math.min(1, t / a) * Math.min(1, Math.max(0, (dur - t) / r));

// 空间底噪：很低的正弦 + 过滤空气
function drone(seed, dur, f = 49) {
  const b = buf(dur), r = rng(seed), lp = biquad('lp', 260);
  for (let i = 0; i < b.length; i++) {
    const t = i / SR;
    b[i] = (Math.sin(2 * Math.PI * f * t) * 0.5 + Math.sin(2 * Math.PI * f * 1.502 * t) * 0.18 + lp(r() * 2 - 1) * 0.8) * env(t, dur, 0.3, 1.2);
  }
  return b;
}
// 数据信号：一声极短、干净的高音（可升调，用于分叉）
function blip(f = 1400, dur = 0.09) {
  const b = buf(dur + 0.05);
  for (let i = 0; i < b.length; i++) { const t = i / SR; b[i] = Math.sin(2 * Math.PI * f * t) * Math.exp(-t * 55) * 0.6 + Math.sin(2 * Math.PI * f * 2.01 * t) * Math.exp(-t * 90) * 0.15; }
  return b;
}
// 分支突然变多：一串越来越密的细小信号
function cascade(seed, dur, n = 26) {
  const b = buf(dur + 0.1), r = rng(seed);
  for (let k = 0; k < n; k++) {
    const st = Math.floor(dur * Math.pow(k / n, 0.7) * SR), f = 1500 + r() * 1800;
    for (let i = 0; i < 0.05 * SR && st + i < b.length; i++) { const t = i / SR; b[st + i] += Math.sin(2 * Math.PI * f * t) * Math.exp(-t * 80) * 0.25; }
  }
  return b;
}
// 注意力偏移：一声缓慢下沉的低音
function sink(seed, dur) {
  const b = buf(dur), r = rng(seed), lp = biquad('lp', 500);
  let ph = 0;
  for (let i = 0; i < b.length; i++) {
    const t = i / SR, k = t / dur;
    ph += (2 * Math.PI * (120 - 55 * k)) / SR;
    b[i] = (Math.sin(ph) * 0.6 + lp(r() * 2 - 1) * 0.4) * Math.sin(Math.PI * k);
  }
  return b;
}
// 暗红 / 暖金脉冲：闷、短
function pulse(seed) {
  const b = buf(0.8), r = rng(seed), lp = biquad('lp', 300);
  for (let i = 0; i < b.length; i++) { const t = i / SR; b[i] = Math.sin(2 * Math.PI * (62 + 40 * Math.exp(-t * 20)) * t) * Math.exp(-t * 6) * 0.9 + lp(r() * 2 - 1) * Math.exp(-t * 25) * 0.5; }
  return b;
}
function heartbeat() {
  const b = buf(0.8);
  for (const [st, g] of [[0, 1], [0.22, 0.6]]) {
    const s0 = Math.floor(st * SR);
    for (let i = 0; i < b.length - s0; i++) { const t = i / SR; b[s0 + i] += Math.sin(2 * Math.PI * (46 + 30 * Math.exp(-t * 30)) * t) * Math.exp(-t * 15) * g; }
  }
  return b;
}
// 浅而快的一次呼吸
function breath(seed, dur = 0.7) {
  const b = buf(dur), r = rng(seed), bp = biquad('bp', 900, 0.7);
  for (let i = 0; i < b.length; i++) { const t = i / SR, k = t / dur; b[i] = bp(r() * 2 - 1) * Math.sin(Math.PI * k) * (k < 0.45 ? 1 : 0.6); }
  return b;
}
// 张力：很低的持续音慢慢收紧
function tension(seed, dur) {
  const b = buf(dur), r = rng(seed), bp = biquad('bp', 180, 3);
  for (let i = 0; i < b.length; i++) { const t = i / SR, k = t / dur; b[i] = (bp(r() * 2 - 1) * 1.5 + Math.sin(2 * Math.PI * (90 + 30 * k) * t) * 0.2) * env(t, dur, 0.2, 0.4); }
  return b;
}
// 相机移动的空气声（快速回溯 / 飞行）
function whoosh(seed, dur, reverse = false) {
  const b = buf(dur), r = rng(seed), lp = biquad('lp', 1600), hp = biquad('hp', 200);
  for (let i = 0; i < b.length; i++) { const t = i / SR, k = reverse ? 1 - t / dur : t / dur; b[i] = hp(lp(r() * 2 - 1)) * Math.pow(Math.sin(Math.PI * Math.min(1, k * 1.1)), 2); }
  return b;
}
// 汇聚：上行的过滤噪声 → 收束
function riser(seed, dur) {
  const b = buf(dur), r = rng(seed);
  let y = 0;
  for (let i = 0; i < b.length; i++) { const t = i / SR, k = t / dur, a = 0.02 + 0.25 * k * k; y += a * ((r() * 2 - 1) - y); b[i] = y * k * k * 1.8 * Math.min(1, (dur - t) / 0.03); }
  return b;
}
// 命名：一声温暖的长音（两个泛音）
function bloom(dur = 3.2) {
  const b = buf(dur);
  for (let i = 0; i < b.length; i++) { const t = i / SR, e = Math.min(1, t / 0.04) * Math.exp(-t * 1.3); b[i] = (Math.sin(2 * Math.PI * 220 * t) * 0.4 + Math.sin(2 * Math.PI * 330.4 * t) * 0.22 + Math.sin(2 * Math.PI * 110 * t) * 0.5) * e; }
  return b;
}

const CUES = [
  // 0–1 s：第 0 帧就有声音——现在发出信号，一路分叉
  { t: 0.0, fx: () => drone(1, 21, 49), gain: 0.05 },
  { t: 0.0, fx: () => blip(880, 0.12), gain: 0.16 },
  { t: 0.2, fx: () => blip(1180), gain: 0.1, pan: -0.3 },
  { t: 0.42, fx: () => blip(1320), gain: 0.1, pan: 0 },
  { t: 0.68, fx: () => blip(1560), gain: 0.1, pan: 0.3 },
  { t: 0.9, fx: () => blip(1760), gain: 0.09, pan: 0.4 },
  { t: 1.0, fx: () => cascade(2, 0.9), gain: 0.12, pan: 0.3 },
  { t: 2.0, fx: () => cascade(3, 0.4, 12), gain: 0.08, pan: 0.5 },
  { t: 2.4, fx: () => sink(4, 1.0), gain: 0.14 },
  { t: 3.1, fx: () => whoosh(5, 0.8), gain: 0.06 },
  { t: 3.55, fx: () => pulse(6), gain: 0.32 },
  { t: 3.78, fx: () => pulse(7), gain: 0.16 },
  // 身体：心率、呼吸、肌肉、警觉
  { t: 4.3, fx: heartbeat, gain: 0.34 },
  { t: 4.5, fx: () => breath(8, 0.55), gain: 0.05 },
  { t: 4.7, fx: () => tension(9, 2.2), gain: 0.05 },
  { t: 4.9, fx: () => blip(2100, 0.2), gain: 0.06 },
  ...[5.15, 5.85, 6.45].map((t) => ({ t, fx: heartbeat, gain: 0.24 })),
  { t: 5.3, fx: () => breath(10, 0.45), gain: 0.04 },
  { t: 5.95, fx: () => breath(11, 0.45), gain: 0.035 },
  // 回溯
  { t: 6.55, fx: () => whoosh(12, 0.8, true), gain: 0.09 },
];
// 四个未知：经过时一声轻响 + 三步推演
[7.85, 9.15, 10.45, 11.75].forEach((t, i) => {
  CUES.push({ t: t - 1.3, fx: () => blip(660, 0.14), gain: 0.08, pan: -0.5 });
  for (let j = 0; j < 3; j++) CUES.push({ t: t - 0.55 + j * 0.3 + 0.3, fx: () => tick(40 + i * 3 + j), gain: 0.05, pan: 0.2 * j });
});
CUES.push(
  { t: 13.4, fx: () => riser(20, 0.85), gain: 0.12 },
  { t: 14.15, fx: () => bloom(3.4), gain: 0.12 },
  { t: 14.15, fx: () => impact(21), gain: 0.12 },
  { t: 16.85, fx: () => whoosh(22, 1.5), gain: 0.08 },
  { t: 18.1, fx: () => pulse(23), gain: 0.14 },
  ...[18.2, 18.7, 19.2, 19.7].map((t, i) => ({ t, fx: () => blip(990 + i * 120, 0.1), gain: 0.08, pan: i % 2 ? 0.4 : -0.4 })),
  ...[20.6, 20.95, 21.3, 21.65].map((t, i) => ({ t, fx: () => tick(60 + i), gain: 0.05, pan: 0.3 })),
);

module.exports = CUES;
