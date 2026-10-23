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
  // 0–2 s：餐桌，笑，服务员走近，账单落下——人声在那一刻停住
  { t: 0.0, fx: () => murmur(11, 2.1, (t) => (t < 1.6 ? 1 : Math.max(0.15, 1 - (t - 1.6) * 3))), gain: 0.16 },
  { t: 0.0, fx: () => laugh(12, 1.6, 5.2), gain: 0.12, pan: -0.5 },
  { t: 0.15, fx: () => laugh(13, 1.4, 6.3), gain: 0.08, pan: 0.4 },
  { t: 0.5, fx: () => clink(14), gain: 0.07, pan: -0.2 },
  ...[0.25, 0.6, 0.95].map((t, i) => ({ t, fx: () => step(15 + i), gain: 0.07, pan: 0.6 })),
  { t: 1.55, fx: () => photoDrop(18), gain: 0.22 },
  { t: 1.62, fx: () => whoosh(19, 0.4), gain: 0.07 },
  // 2.0 特写：账单夹翻开、金额、手指收回（一次很低的非旋律冲击）
  { t: 2.05, fx: () => paper(20, 0.45), gain: 0.08 },
  { t: 2.4, fx: () => impact(21), gain: 0.14 },
  { t: 2.85, fx: () => paper(22, 0.5), gain: 0.05 },
  { t: 2.0, fx: () => room(23, 1.5, 220), gain: 0.06 },
  // 3.45–11.1：餐厅声音回来了，但更低；椅子、杯子
  { t: 3.4, fx: () => murmur(24, 7.9), gain: 0.07 },
  { t: 4.3, fx: () => chair(25, 0.5), gain: 0.06, pan: -0.5 },
  { t: 6.15, fx: () => clink(26), gain: 0.04, pan: -0.1 },
  { t: 7.05, fx: () => chair(27, 0.35), gain: 0.04, pan: 0.2 },
  { t: 7.8, fx: () => clink(28), gain: 0.035, pan: 0.5 },
  // 9.2 词一个个落到脸上：极轻的纸声
  ...[9.25, 9.5, 9.75, 10.0, 10.25].map((t, i) => ({ t, fx: () => tick(30 + i), gain: 0.05 })),
  // 11.1 词退进黑暗，人声被抽走
  { t: 11.05, fx: () => whoosh(36, 0.75, true), gain: 0.09 },
  // 11.8 手：安静，只有房间底噪、敲桌、呼吸、账单夹被推开
  { t: 11.8, fx: () => room(37, 4.2, 240), gain: 0.07 },
  { t: 12.3, fx: () => knock(38), gain: 0.12 },
  { t: 12.6, fx: () => knock(39), gain: 0.1 },
  { t: 13.4, fx: () => breath(40, 0.7), gain: 0.03 },
  { t: 14.05, fx: () => paper(41, 0.65), gain: 0.08 },
  { t: 14.8, fx: () => paper(42, 0.35), gain: 0.04 },
  // 15.2 桌面旋转、金额浮起
  { t: 15.2, fx: () => whoosh(43, 0.8), gain: 0.07 },
  { t: 16.1, fx: () => impact(44), gain: 0.12 },
  // 16.75 三扇门依次打开（很低的吱声）
  { t: 16.0, fx: () => room(45, 5.5, 160), gain: 0.06 },
  ...[16.75, 16.95, 17.15].map((t, i) => ({ t, fx: () => door(46 + i, 0.9), gain: 0.05, pan: (i - 1) * 0.6 })),
  // 门里漏出来的声音：手机提示、办公室
  { t: 19.2, fx: () => tick(50), gain: 0.04, pan: 0 },
  { t: 20.3, fx: () => whoosh(51, 1.1), gain: 0.09 },
  // 21.45 会议室：底噪、键盘、文件滑过桌面、便利贴
  { t: 20.9, fx: () => room(52, 9, 300, 0.05), gain: 0.07 },
  { t: 21.4, fx: () => keys(53, 8.5), gain: 0.05, pan: -0.3 },
  { t: 22.0, fx: () => keys(54, 6), gain: 0.04, pan: 0.4 },
  { t: 21.75, fx: () => paper(55, 0.7), gain: 0.06 },
  { t: 22.35, fx: () => tick(56), gain: 0.05, pan: -0.7 },
  { t: 23.55, fx: () => tick(57), gain: 0.05, pan: -0.7 },
  { t: 23.3, fx: () => chair(58, 0.3), gain: 0.04, pan: 0.5 },
  { t: 24.6, fx: () => tick(59), gain: 0.05, pan: -0.7 },
];

module.exports = CUES;
