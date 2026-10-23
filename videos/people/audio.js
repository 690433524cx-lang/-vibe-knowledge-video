// 《想看清一个人》声音（设计时间）。没有音乐、没有旋律：只有环境声和拟音，给后期配乐留空间。
// 餐厅人声、杯子轻碰、账单夹落桌、手指敲桌、纸面摩擦、门的低吱、办公室底噪和键盘。全部代码合成。
const { biquad, rng, SR, synth } = require('../../src/audio');
const { paper, tick, photoDrop, door, impact } = synth;

const buf = (sec) => new Float32Array(Math.ceil(sec * SR));
const env = (t, dur, a = 0.05, r = 0.3) => Math.min(1, t / a) * Math.min(1, Math.max(0, (dur - t) / r));

// 餐厅人声：几层带通噪声，起伏不规则，听不清内容。gate(t) 可以让人声在某一刻「停住」
function murmur(seed, dur, gate = () => 1) {
  const b = buf(dur), r = rng(seed);
  const bands = [[380, 1.1, 1], [720, 1.4, 0.7], [1300, 1.8, 0.35]].map(([f, q, g], i) => ({ bp: biquad('bp', f, q), g, e: 0, ph: i * 1.7 }));
  for (let i = 0; i < b.length; i++) {
    const t = i / SR;
    let v = 0;
    for (const B of bands) {
      const target = Math.sin(t * (4.3 + B.ph) + B.ph) * Math.sin(t * (1.7 + B.ph * 0.3)) > 0.1 ? 1 : 0.25;
      B.e += (target - B.e) * 0.0009;
      v += B.bp(r() * 2 - 1) * B.e * B.g;
    }
    b[i] = v * gate(t) * env(t, dur, 0.3, 0.4);
  }
  return b;
}
// 一阵笑声：快速起伏的「哈」（带通噪声的音节包络），不是旋律
function laugh(seed, dur = 1.2, rate = 5.5) {
  const b = buf(dur), r = rng(seed), bp = biquad('bp', 900, 1.6), bp2 = biquad('bp', 1700, 2.2);
  for (let i = 0; i < b.length; i++) {
    const t = i / SR;
    const syl = Math.pow(Math.max(0, Math.sin(Math.PI * rate * t)), 3);
    b[i] = (bp(r() * 2 - 1) * 0.9 + bp2(r() * 2 - 1) * 0.4) * syl * env(t, dur, 0.05, 0.45);
  }
  return b;
}
// 杯子轻碰：几个高频泛音
function clink(seed) {
  const b = buf(0.9), r = rng(seed);
  const parts = Array.from({ length: 4 }, () => [2600 + r() * 2600, 0.4 + r() * 0.6]);
  for (const [f, a] of parts) for (let i = 0; i < b.length; i++) { const t = i / SR; b[i] += Math.sin(2 * Math.PI * f * t) * a * Math.exp(-t * 11) * 0.22; }
  return b;
}
// 脚步：低沉的闷响
function step(seed) {
  const b = buf(0.18), r = rng(seed), lp = biquad('lp', 380);
  for (let i = 0; i < b.length; i++) { const t = i / SR; b[i] = lp(r() * 2 - 1) * Math.exp(-t * 40) * 1.6 + Math.sin(2 * Math.PI * 90 * t) * Math.exp(-t * 50) * 0.3; }
  return b;
}
// 手指敲桌布：很闷
function knock(seed) {
  const b = buf(0.15), r = rng(seed), lp = biquad('lp', 700);
  for (let i = 0; i < b.length; i++) { const t = i / SR; b[i] = lp(r() * 2 - 1) * Math.exp(-t * 70) * 1.4 + Math.sin(2 * Math.PI * 160 * t) * Math.exp(-t * 60) * 0.4; }
  return b;
}
// 椅子挪动：粗糙的低频摩擦
function chair(seed, dur = 0.5) {
  const b = buf(dur), r = rng(seed), bp = biquad('bp', 420, 3);
  for (let i = 0; i < b.length; i++) {
    const t = i / SR, k = t / dur;
    const grain = 0.5 + 0.5 * Math.sign(Math.sin(2 * Math.PI * (38 + 20 * k) * t));
    b[i] = bp(r() * 2 - 1) * grain * Math.sin(Math.PI * k) * 1.2;
  }
  return b;
}
// 镜头推 / 退：一阵空气
function whoosh(seed, dur, rev = false) {
  const b = buf(dur), r = rng(seed), lp = biquad('lp', 1400);
  for (let i = 0; i < b.length; i++) { const t = i / SR, k = rev ? 1 - t / dur : t / dur; b[i] = lp(r() * 2 - 1) * Math.pow(Math.sin(Math.PI * k * 0.5 + 0.0001), 2) * Math.min(1, (dur - t) * 12); }
  return b;
}
// 呼吸：很轻的一次吸气
function breath(seed, dur = 0.7) {
  const b = buf(dur), r = rng(seed), bp = biquad('bp', 1500, 0.7);
  for (let i = 0; i < b.length; i++) { const t = i / SR, k = t / dur; b[i] = bp(r() * 2 - 1) * Math.sin(Math.PI * k) * (0.6 + 0.4 * k); }
  return b;
}
// 房间底噪（餐厅 / 黑暗 / 办公室）
function room(seed, dur, f = 260, hum = 0) {
  const b = buf(dur), r = rng(seed), lp = biquad('lp', f);
  for (let i = 0; i < b.length; i++) { const t = i / SR; b[i] = (lp(r() * 2 - 1) * 0.9 + Math.sin(2 * Math.PI * 100 * t) * hum) * env(t, dur, 0.3, 0.5); }
  return b;
}
// 键盘：一串不规则的轻点
function keys(seed, dur) {
  const b = buf(dur), r = rng(seed);
  let next = 0;
  while (next < dur - 0.05) {
    const s0 = Math.floor(next * SR), bp = biquad('bp', 2600 + r() * 1800, 3), g = 0.5 + r() * 0.5;
    for (let i = 0; i < 0.03 * SR && s0 + i < b.length; i++) b[s0 + i] += bp(r() * 2 - 1) * Math.exp(-(i / SR) * 260) * g;
    next += r() < 0.15 ? 0.25 + r() * 0.3 : 0.07 + r() * 0.08;
  }
  return b;
}

// 衣服摩擦：很轻的布料声
function cloth(seed, dur = 0.4) {
  const b = buf(dur), r = rng(seed), bp = biquad('bp', 2200, 0.8);
  for (let i = 0; i < b.length; i++) { const t = i / SR, k = t / dur; b[i] = bp(r() * 2 - 1) * Math.sin(Math.PI * k) * (0.5 + 0.5 * Math.sin(t * 40)); }
  return b;
}
// 近处一句听不清的低声说话（「不好意思」）：几个音节的带通噪声
function voice(seed, dur = 0.6) {
  const b = buf(dur), r = rng(seed), bp = biquad('bp', 650, 2.5), bp2 = biquad('bp', 1500, 3);
  for (let i = 0; i < b.length; i++) { const t = i / SR; const syl = Math.pow(Math.max(0, Math.sin(Math.PI * 6.5 * t)), 2); b[i] = (bp(r() * 2 - 1) + bp2(r() * 2 - 1) * 0.5) * syl * env(t, dur, 0.04, 0.15); }
  return b;
}

const CUES = [
  // 全程：酒会的低声交谈（两层，起伏不同）+ 很远的杯子轻碰
  { t: 0.0, fx: () => murmur(11, 25.5), gain: 0.11, pan: -0.2 },
  { t: 0.0, fx: () => murmur(12, 25.5), gain: 0.08, pan: 0.3 },
  ...[0.7, 2.9, 4.6, 6.4, 9.8, 13.1, 15.6, 18.2, 20.9, 24.0].map((t, i) => ({ t, fx: () => clink(20 + i), gain: 0.025, pan: ((i * 0.37) % 1) * 1.4 - 0.7 })),
  // 镜头 1：握手（布料、两下握紧）、对方的笑、他跟上半步、托盘
  { t: 0.0, fx: () => cloth(30, 0.5), gain: 0.06 },
  { t: 0.45, fx: () => cloth(31, 0.35), gain: 0.05 },
  { t: 1.2, fx: () => laugh(32, 0.9, 5.2), gain: 0.05, pan: 0.2 },
  { t: 3.0, fx: () => cloth(33, 0.4), gain: 0.05 },
  ...[3.35, 3.75].map((t, i) => ({ t, fx: () => step(34 + i), gain: 0.05 })),
  ...[4.2, 4.55, 4.9].map((t, i) => ({ t, fx: () => step(36 + i), gain: 0.04, pan: 0.5 })),
  { t: 5.1, fx: () => clink(39), gain: 0.05, pan: 0.3 },
  { t: 5.6, fx: () => clink(40), gain: 0.04, pan: 0.3 },
  { t: 6.0, fx: () => clink(41), gain: 0.04, pan: 0.3 },
  // 镜头 2：杯子被拿走、「不好意思」、他没回答；服务员走开
  { t: 7.35, fx: () => clink(42), gain: 0.07, pan: -0.3 },
  { t: 7.6, fx: () => voice(43, 0.55), gain: 0.05, pan: -0.5 },
  ...[9.5, 9.95, 10.4].map((t, i) => ({ t, fx: () => step(44 + i), gain: 0.035, pan: -0.6 })),
  { t: 9.75, fx: () => breath(47, 0.4), gain: 0.02 },
  // 第二次握手
  { t: 11.1, fx: () => cloth(48, 0.4), gain: 0.05 },
  ...[11.45, 11.8].map((t, i) => ({ t, fx: () => step(49 + i), gain: 0.05 })),
  { t: 12.05, fx: () => cloth(51, 0.5), gain: 0.06 },
  { t: 12.6, fx: () => laugh(52, 0.8, 5.6), gain: 0.05, pan: 0.3 },
  // 穿过酒会：脚步、拍肩、近处的说话声
  ...[15.0, 15.4, 15.8, 17.0, 17.3, 17.6].map((t, i) => ({ t, fx: () => step(53 + i), gain: 0.045 })),
  { t: 16.15, fx: () => cloth(60, 0.3), gain: 0.06 },
  { t: 16.95, fx: () => voice(61, 0.4), gain: 0.035, pan: 0.4 },
  { t: 17.85, fx: () => laugh(62, 0.8, 5), gain: 0.05, pan: 0.4 },
  ...[18.7, 19.05].map((t, i) => ({ t, fx: () => step(63 + i), gain: 0.06 })),
  // 镜头 3：信封（纸声），周围的说话声低下去一点
  { t: 22.2, fx: () => paper(65, 0.5), gain: 0.06 },
  { t: 22.5, fx: () => room(66, 2.8, 200), gain: 0.04 },
];

module.exports = CUES;
