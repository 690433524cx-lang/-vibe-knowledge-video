// 《时间错觉》声音（设计时间）。没有指定 BGM：不加任何旋律型音乐，只有环境声和少量关键音效。
// 童年：蝉鸣、自行车铃、雨、电扇；成年：闹钟、电梯、地铁、键盘、开关。全部由代码合成，克制。
const { biquad, rng, SR, synth } = require('../../src/audio');
const { DESIGN_T } = require('../../src/config');
const { paper, tick, impact, scrollTicks, door } = synth;

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

// 门开、包放下
function thud(seed) {
  const b = buf(0.3), r = rng(seed), lp = biquad('lp', 400);
  for (let i = 0; i < b.length; i++) { const t = i / SR; b[i] = lp(r() * 2 - 1) * Math.exp(-t * 25) * 2 + Math.sin(2 * Math.PI * 90 * t) * Math.exp(-t * 30) * 0.4; }
  return b;
}
// 卡片消失时很轻的一阵「吸走」：低通噪声由强到无
function fadeAway(seed, dur) {
  const b = buf(dur), r = rng(seed), lp = biquad('lp', 900);
  for (let i = 0; i < b.length; i++) { const t = i / SR, k = t / dur; b[i] = lp(r() * 2 - 1) * Math.sin(Math.PI * Math.min(1, k * 1.3)) * (1 - k) * 0.9; }
  return b;
}

const CUES = [
  // 童年：蝉鸣贯穿窗边和碎片
  { t: 0, fx: () => cicadas(11, 6.0), gain: 0.15 },
  { t: 0, fx: () => air(12, 6.0), gain: 0.05 },
  { t: 2.0, fx: () => rain(14, 0.55), gain: 0.16 },
  { t: 3.0, fx: () => fan(15, 0.75), gain: 0.08 },
  { t: 4.5, fx: () => bell(13), gain: 0.12, pan: 0.3 },
  { t: 5.2, fx: () => rain(19, 0.5), gain: 0.06 },
  { t: 5.9, fx: () => paper(16, 0.5), gain: 0.08 },
  // 一年：月份滚过时很轻的「嗒」
  ...[7.0, 7.62, 8.12, 8.52].map((t, i) => ({ t, fx: () => tick(17 + i), gain: 0.07 })),
];

// 日子：与 scenes/t3_commute.js 的镜头时间一致（6 个镜头 × 5 天）。第三天起声音也开始叠影。
const T0 = 10.0;
const DAYS = [[0.45, 0], [0.28, 0], [0.22, 1], [0.18, 2], [0.15, 3]];
let t = T0;
DAYS.forEach(([d, mode], di) => {
  const at = (k) => t + k * d;
  const g = 1 - di * 0.12;
  const echoes = mode === 0 ? [[0, 1]] : mode === 1 ? [[0, 1], [0.07, 0.4]] : mode === 2 ? [[0, 0.8], [0.06, 0.4], [0.11, 0.3]] : [[0.03, 0.4], [0.08, 0.3], [0.14, 0.25]];
  for (const [e, eg] of echoes) {
    CUES.push(
      { t: at(0) + e, fx: () => alarm(Math.max(0.12, d * 0.9)), gain: 0.09 * g * eg },
      { t: at(2) + e, fx: () => rumble(30 + di, d * 1.05, false), gain: 0.18 * g * eg },
      { t: at(3) + e, fx: () => keys(40 + di, d * 0.95), gain: 0.07 * g * eg },
      { t: at(4) + e, fx: () => thud(45 + di), gain: 0.06 * g * eg },
      { t: at(4) + d * 0.64 + e, fx: () => click(50 + di), gain: 0.12 * g * eg },
    );
  }
  t += d * 6;
});
// 记忆卡片：一张张落下 → 叠起 → 被吸走
[0, 0.2, 0.4, 0.55, 0.7, 0.85].forEach((o, i) => CUES.push({ t: t + o, fx: () => paper(60 + i, 0.3), gain: 0.06 }));
CUES.push({ t: t + 1.9, fx: () => fadeAway(70, 1.6), gain: 0.12 });

// 海浪：低通噪声一涌一退
function waves(seed, dur) {
  const b = buf(dur), r = rng(seed), lp = biquad('lp', 700), lp2 = biquad('lp', 2400);
  for (let i = 0; i < b.length; i++) {
    const t = i / SR, sw = 0.5 + 0.5 * Math.sin(2 * Math.PI * 0.35 * t - 1.2);
    b[i] = (lp(r() * 2 - 1) * 1.4 + lp2(r() * 2 - 1) * 0.4 * sw * sw) * (0.4 + 0.6 * sw) * env(t, dur, 0.3, 0.6);
  }
  return b;
}
// 城市夜声：很远的车流
function cityNight(seed, dur) {
  const b = buf(dur), r = rng(seed), lp = biquad('lp', 260), bp = biquad('bp', 900, 0.6);
  for (let i = 0; i < b.length; i++) {
    const t = i / SR;
    b[i] = (lp(r() * 2 - 1) * 1.6 + bp(r() * 2 - 1) * 0.25 * (0.5 + 0.5 * Math.sin(t * 0.7))) * env(t, dur, 1.2, 1.5);
  }
  return b;
}

// 4 第一次：空气声 + 每一格一点点它自己的声音
CUES.push(
  { t: 22.7, fx: () => air(80, 11), gain: 0.06 },
  { t: 24.6, fx: () => rumble(81, 1.6), gain: 0.12 },        // 火车
  { t: 25.6, fx: () => waves(82, 2.2), gain: 0.16 },         // 海
  { t: 27.4, fx: () => paper(83, 0.4), gain: 0.07 },         // 递钱
  { t: 28.6, fx: () => bell(84), gain: 0.05, pan: -0.3 },    // 倒地的车铃
  { t: 31.6, fx: () => tick(85), gain: 0.05 },
);
// 5 记忆密度：走廊的空间声；光点落在时间轴上
CUES.push({ t: 33.6, fx: () => air(90, 12), gain: 0.05 });
[42.0, 42.2, 42.35, 42.5, 42.6, 42.75].forEach((t, i) => CUES.push({ t, fx: () => tick(91 + i), gain: 0.035 }));
// 6 成年重复：每天同样的键盘声；换日子时一声很轻的「嗒」
for (let i = 0; i < 5; i++) {
  CUES.push({ t: 45.6 + i * 1.6, fx: () => keys(100 + i, 1.5), gain: 0.06 });
  CUES.push({ t: 45.6 + i * 1.6, fx: () => tick(110 + i), gain: 0.05 });
}
CUES.push({ t: 53.6, fx: () => fadeAway(115, 2.6), gain: 0.08 });
// 7 365 页：纸页一阵阵翻过，越来越稀，最后安静
for (let i = 0; i < 14; i++) CUES.push({ t: 56.7 + i * 0.1, fx: () => paper(120 + i, 0.25), gain: 0.05 });
CUES.push({ t: 58.8, fx: () => fadeAway(140, 1.8), gain: 0.07 });
CUES.push({ t: 61.5, fx: () => fadeAway(141, 2.1), gain: 0.08 });
// 8 T：唯一的一次低频冲击
CUES.push({ t: DESIGN_T, fx: () => impact(150), gain: 0.42 });
// 9–10：很安静的房间；相册滑动
CUES.push({ t: 71.6, fx: () => air(160, 9.5), gain: 0.04 });
CUES.push({ t: 82.0, fx: () => scrollTicks(161, 3.4), gain: 0.07 });
// 11 空墙：关掉手机的一声，然后几乎无声
CUES.push({ t: 91.9, fx: () => click(170), gain: 0.06 });
// 12 雨、车厢，到站时慢下来
CUES.push({ t: 100.8, fx: () => rain(180, 8.4), gain: 0.07 });
CUES.push({ t: 100.8, fx: () => rumble(181, 8.4, false), gain: 0.12 });
// 13 开窗，城市夜声进来
CUES.push({ t: 110.9, fx: () => door(190, 1.2), gain: 0.06 });
CUES.push({ t: 111.3, fx: () => cityNight(191, 8.6), gain: 0.1 });

module.exports = CUES;
