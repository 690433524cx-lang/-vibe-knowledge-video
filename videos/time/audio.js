// 《时间错觉》声音（设计时间）。没有指定 BGM：不加任何旋律型音乐，只有环境声和少量关键音效。
// 童年：蝉鸣、自行车铃、雨、电扇；成年：闹钟、电梯、地铁、键盘、开关。全部由代码合成，克制。
const { biquad, rng, SR, synth } = require('../../src/audio');
const { paper, tick } = synth;

const buf = (sec) => new Float32Array(Math.ceil(sec * SR));
const env = (t, dur, a = 0.05, r = 0.3) => Math.min(1, t / a) * Math.min(1, Math.max(0, (dur - t) / r));

// 蝉鸣：两层带通噪声，按「嘶—嘶—」的脉冲调制，整体缓慢起伏
function cicadas(seed, dur) {
  const b = buf(dur), r = rng(seed);
  const bp1 = biquad('bp', 4600, 5), bp2 = biquad('bp', 6200, 6), hp = biquad('hp', 2500);
  for (let i = 0; i < b.length; i++) {
    const t = i / SR;
    const p1 = 0.55 + 0.45 * Math.sin(2 * Math.PI * 38 * t) ** 2;
    const sw1 = 0.6 + 0.4 * Math.sin(2 * Math.PI * 0.35 * t + 1);
    const p2 = 0.5 + 0.5 * Math.sin(2 * Math.PI * 52 * t + 0.5) ** 4;
    const sw2 = 0.5 + 0.5 * Math.sin(2 * Math.PI * 0.22 * t);
    b[i] = hp(bp1(r() * 2 - 1) * p1 * sw1 * 1.2 + bp2(r() * 2 - 1) * p2 * sw2 * 0.8) * env(t, dur, 0.02, 0.6);
  }
  return b;
}

// 夏天户外的空气声：很低的风
function air(seed, dur) {
  const b = buf(dur), r = rng(seed), lp = biquad('lp', 380);
  for (let i = 0; i < b.length; i++) b[i] = lp(r() * 2 - 1) * (0.7 + 0.3 * Math.sin(i / SR * 0.8)) * env(i / SR, dur, 0.02, 0.5);
  return b;
}

// 自行车铃：两声「叮铃」，非谐泛音
function bell(seed) {
  const b = buf(1.2);
  const parts = [[2350, 1], [3310, 0.6], [5120, 0.3], [1180, 0.25]];
  for (const st of [0, 0.16]) {
    const s0 = Math.floor(st * SR);
    for (let i = 0; i < b.length - s0; i++) {
      const t = i / SR;
      let v = 0;
      for (const [f, a] of parts) v += Math.sin(2 * Math.PI * f * t) * a * Math.exp(-t * (4 + f / 900));
      b[s0 + i] += v * 0.3 * (1 + 0.15 * Math.sin(2 * Math.PI * 9 * t));
    }
  }
  return b;
}

// 雨：高频噪声 + 随机的水滴
function rain(seed, dur) {
  const b = buf(dur), r = rng(seed), hp = biquad('hp', 1800), lp = biquad('lp', 6500), bp = biquad('bp', 2600, 3);
  for (let i = 0; i < b.length; i++) {
    const t = i / SR;
    const drop = r() < 0.0016 ? 1 : 0;
    b[i] = (lp(hp(r() * 2 - 1)) * 0.55 + bp(drop * 6) * 0.5) * env(t, dur, 0.08, 0.15);
  }
  return b;
}

// 电扇：低频嗡声 + 扇叶的气流起伏
function fan(seed, dur) {
  const b = buf(dur), r = rng(seed), bp = biquad('bp', 700, 0.8);
  for (let i = 0; i < b.length; i++) {
    const t = i / SR;
    b[i] = (Math.sin(2 * Math.PI * 100 * t) * 0.12 + bp(r() * 2 - 1) * (0.6 + 0.4 * Math.sin(2 * Math.PI * 14 * t))) * env(t, dur, 0.06, 0.12);
  }
  return b;
}

// 手机闹钟：短促的电子「嘀嘀」（不是旋律，只是提示音）
function alarm(dur) {
  const b = buf(dur);
  for (let i = 0; i < b.length; i++) {
    const t = i / SR;
    const on = (t % 0.14) < 0.07 ? 1 : 0;
    b[i] = Math.sin(2 * Math.PI * 1760 * t) * on * 0.35 * env(t, dur, 0.005, 0.03);
  }
  return b;
}

// 电梯到层：一声「叮」
function ding() {
  const b = buf(1.0);
  for (let i = 0; i < b.length; i++) {
    const t = i / SR;
    b[i] = (Math.sin(2 * Math.PI * 1318 * t) + Math.sin(2 * Math.PI * 2636 * t) * 0.2) * Math.exp(-t * 4.5) * 0.35;
  }
  return b;
}

// 地铁：低频轰鸣 + 车轮过轨缝的「哐当」
function rumble(seed, dur, clacks = true) {
  const b = buf(dur), r = rng(seed), lp = biquad('lp', 160), lp2 = biquad('lp', 600), bp = biquad('bp', 900, 2);
  for (let i = 0; i < b.length; i++) {
    const t = i / SR;
    const ph = (t + 0.13) % 0.9;
    const clack = clacks ? (Math.exp(-ph * 40) + Math.exp(-Math.abs(ph - 0.12) * 60) * (ph > 0.12 ? 1 : 0)) : 0;
    b[i] = (lp(r() * 2 - 1) * 2.2 + lp2(r() * 2 - 1) * 0.25 + bp((r() * 2 - 1) * clack * 3) * 0.6) * env(t, dur, 0.04, 0.3);
  }
  return b;
}

// 键盘：一串轻敲
function keys(seed, dur) {
  const b = buf(dur), r = rng(seed), bp = biquad('bp', 3000, 1.5);
  let next = 0;
  for (let i = 0; i < b.length; i++) {
    let x = 0;
    if (i >= next) { x = 1; next = i + Math.floor(SR * (0.05 + r() * 0.09)); }
    b[i] = bp(x * 4 + (r() * 2 - 1) * 0.01) * 0.6;
  }
  return b;
}

// 开关「咔哒」
function click(seed) {
  const b = buf(0.15), r = rng(seed), bp = biquad('bp', 2200, 2);
  for (let i = 0; i < b.length; i++) {
    const t = i / SR;
    b[i] = bp(r() * 2 - 1) * (Math.exp(-t * 300) * 2.5 + Math.exp(-Math.abs(t - 0.035) * 500) * 1.2);
  }
  return b;
}

const CUES = [
  // 童年
  { t: 0, fx: () => cicadas(11, 6.4), gain: 0.14 },
  { t: 0, fx: () => air(12, 6.4), gain: 0.05 },
  { t: 3.62, fx: () => bell(13), gain: 0.12, pan: 0.3 },
  { t: 5.0, fx: () => rain(14, 0.62), gain: 0.16 },
  { t: 5.55, fx: () => fan(15, 0.62), gain: 0.07 },
  { t: 6.0, fx: () => paper(16, 0.5), gain: 0.08 },
  // 一年：每翻一个月一声很轻的「嗒」
  ...[7.55, 8.1, 8.5, 8.8].map((t, i) => ({ t, fx: () => tick(17 + i), gain: 0.07 })),
];

// 通勤：与 scenes/t3_commute.js 的镜头时间一致
const T0 = 10.25;
const DURS = [0.42, 0.22, 0.16];
let t = T0;
DURS.forEach((d, di) => {
  const at = (k) => t + k * d;
  const g = 1 - di * 0.15;
  CUES.push(
    { t: at(0), fx: () => alarm(Math.max(0.12, d * 0.9)), gain: 0.09 * g },
    { t: at(2) + d * 0.5, fx: () => ding(), gain: 0.07 * g },
    { t: at(3), fx: () => rumble(30 + di, d * 1.05, false), gain: 0.18 * g },
    { t: at(4), fx: () => keys(40 + di, d * 0.95), gain: 0.06 * g },
    { t: at(6), fx: () => keys(43 + di, d * 0.95), gain: 0.06 * g },
    { t: at(7), fx: () => rumble(33 + di, d * 1.05, false), gain: 0.16 * g },
    { t: at(9) + d * 0.5, fx: () => click(50 + di), gain: 0.12 * g },
  );
  t += d * 10;
});
// 地铁车窗：持续的车厢声
CUES.push({ t, fx: () => rumble(60, 4.4), gain: 0.2 });

module.exports = CUES;
