// 《悲观主义》音效编排（设计时间，随 MAIN_BEAT_T 移动）。全部代码合成，克制。
// 当前没有《千年之后》，样片不放 BGM，只有环境音与少量音效。
// 第一幕的声音落差最重要：聚会人声 + 笑声（门开着时清楚）→ 门关上（人声一下被闷住）→ 很快消失 → 只剩房间底噪。
const { SR, biquad, buf } = require('../../src/audio');
const { rng } = require('../../src/lib/util');

// 门外的聚会人声：几个人在说话（共振峰调制的噪声）+ 几声笑；muffleAt 之后被门闷住、渐渐远去
function partyWalla(seed = 1, dur = 3.2, muffleAt = 1.96) {
  const b = buf(dur), r = rng(seed);
  const voices = Array.from({ length: 5 }, (_, i) => ({
    f1: 380 + r() * 500, f2: 1100 + r() * 900, rate: 3 + r() * 3, ph: r() * 10, gain: 0.5 + r() * 0.5,
    bp1: biquad('bp', 500 + i * 90, 4), bp2: biquad('bp', 1300 + i * 140, 5),
  }));
  const lp = biquad('lp', 600), lp2 = biquad('lp', 600);
  // 笑声：短促的元音脉冲串「哈哈哈」
  const laughs = [[0.05, 6, 210], [0.55, 4, 260], [1.2, 5, 190]];
  for (let i = 0; i < b.length; i++) {
    const t = i / SR;
    let s = 0;
    for (const v of voices) {
      const syl = Math.max(0, Math.sin(2 * Math.PI * v.rate * t + v.ph)) ** 2;
      const n = r() * 2 - 1;
      s += (v.bp1(n) * 0.9 + v.bp2(n) * 0.5) * syl * v.gain;
    }
    for (const [t0, n, f0] of laughs) {
      const k = t - t0;
      if (k < 0 || k > n * 0.16) continue;
      const pulse = Math.max(0, Math.sin(Math.PI * ((k % 0.16) / 0.11))) * ((k % 0.16) < 0.11 ? 1 : 0);
      const env = Math.exp(-k * 1.6);
      s += (Math.sin(2 * Math.PI * f0 * t) * 0.5 + Math.sin(2 * Math.PI * f0 * 3.8 * t) * 0.25 + (r() - 0.5) * 0.4) * pulse * env * 1.3;
    }
    // 人在往外走：整体渐弱；门关上后高频被切掉、迅速衰减
    const away = 1 - Math.min(1, t / 2.6) * 0.45;
    if (t < muffleAt) b[i] = s * away;
    else {
      const k = t - muffleAt;
      b[i] = lp2(lp(s)) * 2.2 * away * Math.exp(-k * 2.4);
    }
  }
  return b;
}

// 门关上：门板的低沉闷响 + 锁舌「咔」一声
function doorShut(seed = 2) {
  const b = buf(1.2), r = rng(seed), lp = biquad('lp', 160), bp = biquad('bp', 2600, 6), lp3 = biquad('lp', 700);
  for (let i = 0; i < b.length; i++) {
    const t = i / SR;
    const thud = Math.sin(2 * Math.PI * (62 - 10 * t) * t) * Math.exp(-t * 9) * 0.9 + lp(r() * 2 - 1) * Math.exp(-t * 16) * 2.4;
    const rattle = lp3(r() * 2 - 1) * Math.exp(-t * 30) * 0.6;
    const k = t - 0.05;
    const latch = k > 0 ? bp(r() * 2 - 1) * Math.exp(-k * 70) * 2.4 : 0;
    b[i] = thud + rattle + latch;
  }
  return b;
}

// 楼道感应灯熄灭：很轻的继电器「嗒」
function relay(seed = 3) {
  const b = buf(0.15), r = rng(seed), bp = biquad('bp', 3200, 5);
  for (let i = 0; i < b.length; i++) { const t = i / SR; b[i] = bp(r() * 2 - 1) * Math.exp(-t * 90); }
  return b;
}

// 杯子放回玻璃桌面：一声很轻的「叮」
function glassSet(seed = 4) {
  const b = buf(0.8), r = rng(seed), bp = biquad('bp', 1800, 2);
  for (let i = 0; i < b.length; i++) {
    const t = i / SR;
    b[i] = (Math.sin(2 * Math.PI * 2650 * t) * 0.4 + Math.sin(2 * Math.PI * 4170 * t) * 0.18) * Math.exp(-t * 9) + bp(r() * 2 - 1) * Math.exp(-t * 80) * 0.6;
  }
  return b;
}

// 椅子木腿在地上轻轻磕两下（随阻尼摆）
function chairKnock(seed = 5) {
  const b = buf(1.6), r = rng(seed), bp = biquad('bp', 520, 3);
  const hits = [[0, 1], [0.52, 0.55], [1.05, 0.25]];
  for (let i = 0; i < b.length; i++) {
    const t = i / SR;
    let s = 0;
    for (const [t0, g] of hits) { const k = t - t0; if (k >= 0) s += (Math.sin(2 * Math.PI * 210 * k) * 0.6 + (r() * 2 - 1) * 0.5) * Math.exp(-k * 38) * g; }
    b[i] = bp(s) * 1.6;
  }
  return b;
}

// 很远的鞭炮：一串被距离磨平的噼啪
function farCrackers(seed = 6, dur = 2.4) {
  const b = buf(dur), r = rng(seed), lp = biquad('lp', 900), lp2 = biquad('lp', 900);
  let next = 0.02, amp = 0;
  for (let i = 0; i < b.length; i++) {
    const t = i / SR;
    if (t >= next) { amp = 0.6 + r() * 0.4; next = t + 0.04 + r() * 0.09; }
    amp *= 0.9965;
    b[i] = lp2(lp((r() * 2 - 1) * amp)) * Math.sin(Math.PI * t / dur);
  }
  return b;
}

// 列车车厢：低频滚动 + 轨缝的「哐当」节奏 + 风噪
function trainAmb(seed = 7, dur = 9.6) {
  const b = buf(dur), r = rng(seed), lp = biquad('lp', 120), bp = biquad('bp', 900, 0.7), lpk = biquad('lp', 300);
  for (let i = 0; i < b.length; i++) {
    const t = i / SR;
    const fade = Math.min(1, t / 0.9) * Math.min(1, (dur - t) / 0.6);
    const rumble = lp(r() * 2 - 1) * 2.6;
    const wind = bp(r() * 2 - 1) * 0.22 * (0.8 + 0.2 * Math.sin(t * 0.7));
    const cyc = t % 1.05;
    const clack = (cyc < 0.04 ? Math.exp(-cyc * 60) : 0) + (cyc > 0.18 && cyc < 0.22 ? Math.exp(-(cyc - 0.18) * 60) * 0.8 : 0);
    b[i] = (rumble + wind + lpk((r() * 2 - 1)) * clack * 3) * fade;
  }
  return b;
}

const CUES = [
  { t: 0.0, fx: () => partyWalla(101), gain: 0.16, pan: -0.5 },  // 门外的人声与笑声（门在左边）
  { t: 1.94, fx: () => doorShut(102), gain: 0.5, pan: -0.45 },   // 门关上
  { t: 3.1, fx: () => relay(103), gain: 0.05, pan: -0.5 },       // 楼道灯熄灭
  { t: 5.35, fx: () => glassSet(104), gain: 0.07, pan: 0.15 },   // 杯子放回桌上
  { t: 8.55, fx: () => chairKnock(201), gain: 0.16, pan: 0.45 }, // 被推开的椅子
  { t: 12.8, fx: () => farCrackers(202), gain: 0.05, pan: -0.3 },// 很远的鞭炮
  { t: 16.0, fx: () => trainAmb(301), gain: 0.12 },              // 列车
];

module.exports = CUES;
