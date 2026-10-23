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

const CUES = [
  // 0–3 握手、寒暄、拍肩（人声和笑声在前景，不是音乐）
  { t: 0.0, fx: () => murmur(11, 3.2), gain: 0.12 },
  { t: 0.0, fx: () => laugh(12, 1.5, 5.4), gain: 0.11, pan: -0.3 },
  { t: 0.2, fx: () => laugh(13, 1.6, 6.2), gain: 0.09, pan: 0.35 },
  ...[0.13, 0.4, 0.67, 0.95].map((t, i) => ({ t, fx: () => knock(60 + i), gain: 0.03 })),   // 握手的轻微摩擦
  { t: 1.62, fx: () => knock(64), gain: 0.09, pan: 0.4 },
  { t: 1.92, fx: () => knock(65), gain: 0.08, pan: 0.4 },
  { t: 2.3, fx: () => whoosh(66, 0.7), gain: 0.07 },
  { t: 3.0, fx: () => photoDrop(67), gain: 0.07 },                                           // 手落到桌上
  // 3.3 三枚筹码滑进来（纸 + 很轻的碰撞）
  { t: 3.25, fx: () => room(68, 3.8, 260), gain: 0.06 },
  ...[3.3, 3.42, 3.54].map((t, i) => ({ t, fx: () => paper(69 + i, 0.5), gain: 0.06, pan: 0.5 })),
  ...[3.75, 3.86, 3.98].map((t, i) => ({ t, fx: () => clink(72 + i), gain: 0.03, pan: 0.3 })),
  { t: 4.95, fx: () => paper(75, 0.9), gain: 0.06 },                                          // 拖走「利益」
  { t: 5.3, fx: () => paper(76, 0.7), gain: 0.04, pan: 0.5 },
  { t: 6.0, fx: () => whoosh(77, 0.9), gain: 0.1 },                                           // 推进筹码
  // 6.9 盘子穿过餐厅：餐厅人声、脚步、盘子放下、敲桌两下、推开
  { t: 6.9, fx: () => murmur(78, 2.8), gain: 0.11 },
  { t: 7.0, fx: () => laugh(79, 1.0, 5.8), gain: 0.06, pan: -0.4 },
  ...[7.0, 7.3, 7.6, 7.9].map((t, i) => ({ t, fx: () => step(80 + i), gain: 0.05, pan: 0.3 })),
  { t: 8.15, fx: () => clink(84), gain: 0.05 },
  { t: 8.3, fx: () => knock(85), gain: 0.13 },
  { t: 8.5, fx: () => knock(86), gain: 0.12 },
  { t: 8.68, fx: () => paper(87, 0.35), gain: 0.06 },
  { t: 9.15, fx: () => whoosh(88, 0.5), gain: 0.12 },                                         // 盘子冲向镜头
  // 9.6 钟：滴答越来越快；办公室长出来
  { t: 9.6, fx: () => impact(89), gain: 0.1 },
  ...Array.from({ length: 22 }, (_, i) => 9.7 + 5.2 * (1 - Math.pow(1 - i / 22, 1.7))).map((t, i) => ({ t, fx: () => tick(90 + i), gain: 0.035 + i * 0.002 })),
  { t: 9.9, fx: () => room(115, 5.1, 300, 0.05), gain: 0.07 },
  // 11.6 压力：电话、键盘、打印机、消息、咖啡
  ...[11.6, 11.85, 12.1, 12.35, 12.6, 12.85, 13.1].map((t, i) => ({ t, fx: () => tick(120 + i), gain: 0.07, pan: 0.2 })),
  { t: 11.7, fx: () => keys(128, 2.0), gain: 0.06, pan: -0.2 },
  { t: 12.3, fx: () => keys(129, 1.5), gain: 0.05, pan: 0.5 },
  ...Array.from({ length: 7 }, (_, i) => ({ t: 12.3 + i * 0.22, fx: () => paper(130 + i, 0.2), gain: 0.04, pan: 0.6 })),
  { t: 13.4, fx: () => clink(138), gain: 0.07 },
  { t: 13.48, fx: () => photoDrop(139), gain: 0.06 },
  { t: 13.6, fx: () => whoosh(140, 0.6), gain: 0.1 },                                          // 绕到另一边
  { t: 14.35, fx: () => chair(141, 0.45), gain: 0.08 },                                         // 站起来
  { t: 14.6, fx: () => breath(142, 0.5), gain: 0.04 },
  // 15.0 甩向钟；15.6 起三圈（每圈一阵风 + 落点的动作声）
  { t: 15.0, fx: () => whoosh(143, 0.55), gain: 0.11 },
  { t: 15.5, fx: () => impact(144), gain: 0.08 },
  { t: 15.6, fx: () => whoosh(145, 0.55), gain: 0.09 },
  { t: 16.15, fx: () => clink(146), gain: 0.05 },
  { t: 16.5, fx: () => whoosh(147, 0.5), gain: 0.09 },
  { t: 17.02, fx: () => knock(148), gain: 0.12 },
  { t: 17.17, fx: () => knock(149), gain: 0.11 },
  { t: 17.32, fx: () => whoosh(150, 0.48), gain: 0.09 },
  { t: 17.82, fx: () => breath(151, 0.35), gain: 0.04 },
  // 18.0 拉远进黑暗；18.65 字出现；19.2 起被撞碎（低频冲击，不是旋律）
  { t: 18.0, fx: () => whoosh(152, 0.6, true), gain: 0.08 },
  { t: 18.0, fx: () => room(153, 3.4, 160), gain: 0.06 },
  ...[18.65, 18.75, 18.85, 18.95].map((t, i) => ({ t, fx: () => tick(154 + i), gain: 0.04 })),
  ...[19.2, 19.36, 19.5, 19.64].map((t, i) => ({ t, fx: () => glassBreak(158 + i), gain: 0.07, pan: [-0.4, -0.3, 0.4, 0.4][i] })),
  { t: 19.2, fx: () => impact(162), gain: 0.12 },
  // 20.7 进第一章：会议室
  { t: 20.7, fx: () => whoosh(163, 0.6), gain: 0.08 },
  { t: 21.2, fx: () => room(164, 4, 300, 0.05), gain: 0.07 },
  { t: 21.4, fx: () => keys(165, 3.6), gain: 0.04, pan: -0.3 },
  { t: 22.0, fx: () => paper(166, 0.6), gain: 0.05, pan: 0.4 },
];

// 字被撞碎：一阵短促、干的碎片声（带通噪声颗粒）
function glassBreak(seed) {
  const b = buf(0.6), r = rng(seed), bp = biquad('bp', 3400, 1.2);
  for (let i = 0; i < b.length; i++) { const t = i / SR; const g = r() < 0.02 * Math.exp(-t * 8) ? 1 : 0; b[i] = bp((r() * 2 - 1) * 0.4 + g * 4) * Math.exp(-t * 7); }
  return b;
}

module.exports = CUES;
