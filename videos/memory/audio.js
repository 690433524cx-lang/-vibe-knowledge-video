// 《记忆》声音（设计时间）。没有背景音乐：只有极轻的环境声和拟音，给后期《千年之后》留空间。
// 台灯电流、雨、照片落下、蜡笔、印章、放映机走带、极轻的「嗒」。全部由代码合成。
const { biquad, rng, SR, synth } = require('../../src/audio');
const { paper, tick, photoDrop, stamp, pencilScratch } = synth;

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

const CUES = [
  // P1 · 第 0 秒
  { t: 0.0, fx: heartbeat, gain: 0.32 },
  { t: 0.0, fx: () => hum(11, 4.9), gain: 0.05 },
  { t: 3.6, fx: () => swell(12, 1.2), gain: 0.1 },
  // 回忆里：雨；照片压上来后雨被闷住
  { t: 4.3, fx: () => rain(13, 6.6, 4.6), gain: 0.13 },
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
  ...[0, 1, 2, 3, 4].map((i) => ({ t: 19.3 + i * 0.55, fx: () => tick(40 + i), gain: 0.05 + i * 0.006 })),
];

module.exports = CUES;
