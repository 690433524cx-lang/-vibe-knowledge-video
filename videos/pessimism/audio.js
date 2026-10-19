// 《悲观主义》音效编排（设计时间，随 MAIN_BEAT_T 移动）。全部代码合成，克制。
// 不放任何背景音乐：《千年之后》由后期在剪映里单独加入。这里只有环境音与少量音效，没有持续的音高或旋律。
// 声音跟着「现实 / 想象」走：聚会和年夜饭的人声都在；想象散场的时候，人声被抽空。
const { SR, biquad, buf, synth } = require('../../src/audio');
const { pencilScratch, paper, impact, stamp, photoDrop, tick } = synth;
const { DESIGN_T: T } = require('../../src/config');
const { rng } = require('../../src/lib/util');

// 人声：几个人同时在说话（共振峰调制的噪声）+ 几声笑；env(t) 控制整体音量（脑内的未来里几乎静音）
function walla(seed, dur, o = {}) {
  const { voices = 5, f0 = 380, laughs = [], env = () => 1, lpHz = 0 } = o;
  const b = buf(dur), r = rng(seed);
  const V = Array.from({ length: voices }, (_, i) => ({
    rate: 3 + r() * 3, ph: r() * 10, gain: 0.5 + r() * 0.5,
    bp1: biquad('bp', f0 + 120 + i * 90, 4), bp2: biquad('bp', f0 + 900 + i * 140, 5),
  }));
  const lp = lpHz ? biquad('lp', lpHz) : null;
  for (let i = 0; i < b.length; i++) {
    const t = i / SR;
    let s = 0;
    for (const v of V) {
      const syl = Math.max(0, Math.sin(2 * Math.PI * v.rate * t + v.ph)) ** 2;
      const n = r() * 2 - 1;
      s += (v.bp1(n) * 0.9 + v.bp2(n) * 0.5) * syl * v.gain;
    }
    for (const [t0, n, fq, g = 1] of laughs) {
      const k = t - t0;
      if (k < 0 || k > n * 0.16) continue;
      const pulse = (k % 0.16) < 0.11 ? Math.sin(Math.PI * ((k % 0.16) / 0.11)) : 0;
      s += (Math.sin(2 * Math.PI * fq * t) * 0.5 + Math.sin(2 * Math.PI * fq * 3.8 * t) * 0.25 + (r() - 0.5) * 0.4) * pulse * Math.exp(-k * 1.6) * 1.3 * g;
    }
    b[i] = (lp ? lp(s) : s) * env(t);
  }
  return b;
}

// 碰杯：两只玻璃杯轻轻一碰
function clink(seed = 9) {
  const b = buf(0.9), r = rng(seed);
  const f = [2900 + r() * 300, 4300 + r() * 300, 6100];
  for (let i = 0; i < b.length; i++) {
    const t = i / SR;
    b[i] = (Math.sin(2 * Math.PI * f[0] * t) * 0.45 + Math.sin(2 * Math.PI * f[1] * t) * 0.25 + Math.sin(2 * Math.PI * f[2] * t) * 0.1) * Math.exp(-t * 7) + (r() - 0.5) * Math.exp(-t * 300) * 0.8;
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

// 消息发出去：一声很短、很轻的「嗖」（只有噪声，没有音高）
function whoosh(seed = 20) {
  const b = buf(0.45), r = rng(seed), bp = biquad('bp', 1800, 1.2);
  for (let i = 0; i < b.length; i++) {
    const t = i / SR, k = t / 0.45;
    b[i] = bp(r() * 2 - 1) * Math.sin(Math.PI * k) ** 2 * 1.2;
  }
  return b;
}
// 走廊 / 房间的空气声：只有低通噪声，没有任何持续的音高（不做成氛围音乐）
function air(seed = 21, dur = 4.5) {
  const b = buf(dur), r = rng(seed), lp = biquad('lp', 220), bp = biquad('bp', 500, 0.7);
  for (let i = 0; i < b.length; i++) {
    const t = i / SR;
    const e = Math.min(1, t / 0.5) * Math.min(1, (dur - t) / 0.4);
    b[i] = (lp(r() * 2 - 1) * 1.1 + bp(r() * 2 - 1) * 0.1) * e;
  }
  return b;
}
// 台灯开关
function switchClick(seed = 23) {
  const b = buf(0.12), r = rng(seed), bp = biquad('bp', 3000, 4);
  for (let i = 0; i < b.length; i++) { const t = i / SR; b[i] = bp(r() * 2 - 1) * (Math.exp(-t * 120) + (t > 0.03 ? Math.exp(-(t - 0.03) * 160) * 0.6 : 0)) * 1.6; }
  return b;
}

const smoothstep = (a, b, x) => { const k = Math.max(0, Math.min(1, (x - a) / (b - a))); return k * k * (3 - 2 * k); };
const party = (seed, dur, env, extra = {}) => walla(seed, dur, { voices: 6, laughs: [[0.3, 6, 210], [1.0, 5, 260, 0.8], [2.6, 4, 190, 0.7], [5.0, 4, 220, 0.8]], env, ...extra });

// 时间都是新时间轴（留存优化版）。没有任何背景音乐、持续的旋律或 pad：只有环境声和少量音效。
const CUES = [
  // 聚会：人声一直在；3.6–4.9 他脑内的散场里人声被抽空，4.9 回到现实
  { t: 0.0, gain: 0.15, fx: () => party(101, 6.8, (t) => (1 - smoothstep(3.55, 3.8, t) * 0.97 + smoothstep(4.85, 5.0, t) * 0.97) * (1 - smoothstep(5.6, 6.6, t))) },
  { t: 0.4, fx: () => clink(105), gain: 0.06, pan: -0.3 },
  { t: 1.15, fx: () => clink(106), gain: 0.05, pan: 0.2 },
  // 春节：一家人的声音；11.9 起一个一个少下去，13.3 安静；窗外的鞭炮
  { t: 6.0, gain: 0.14, fx: () => walla(201, 7.6, { voices: 7, f0: 330, laughs: [[1.6, 5, 330, 0.9], [2.4, 6, 200], [4.2, 4, 230, 0.8]], env: (t) => smoothstep(0, 0.8, t) * (1 - smoothstep(5.9, 7.3, t)) }) },
  { t: 7.0, fx: () => clink(202), gain: 0.06, pan: -0.2 },
  { t: 6.8, fx: () => farCrackers(203, 2.6), gain: 0.07, pan: -0.3 },
  { t: 13.2, fx: () => chairKnock(204), gain: 0.11, pan: 0.45 },
  // 列车
  { t: 13.9, fx: () => trainAmb(301, 6.0), gain: 0.12 },
  // 等消息：发送、手机放下、又点亮
  { t: 19.12, fx: () => whoosh(401), gain: 0.07, pan: 0.2 },
  { t: 20.6, fx: () => photoDrop(402), gain: 0.06, pan: 0.3 },
  { t: 22.6, fx: () => tick(403), gain: 0.05, pan: 0.3 },
  // 面试：走廊的空气声；第二个幻象是一封邮件——一声手机提示
  { t: 24.1, fx: () => air(501, 4.5), gain: 0.08 },
  { t: 27.35, fx: () => tick(510), gain: 0.06 },
  // 蜡烛：远处闷住的聚会声（快乐在别处继续）
  { t: 28.6, gain: 0.05, fx: () => party(520, 7.2, (t) => smoothstep(0, 0.8, t) * (1 - smoothstep(6.4, 7.2, t)), { lpHz: 420 }) },
  // 人群里的提前难过：笑声还在，37.0 起周围的声音降下去
  { t: 35.6, gain: 0.15, fx: () => party(530, 5.0, (t) => smoothstep(0, 0.2, t) * (1 - smoothstep(1.4, 2.4, t) * 0.88) * (1 - smoothstep(4.4, 4.9, t))) },
  // 地图上的铅笔
  { t: 52.2, fx: () => pencilScratch(701, 0.5), gain: 0.08 },
  { t: 53.0, fx: () => pencilScratch(702, 0.5), gain: 0.08 },
  { t: 53.8, fx: () => pencilScratch(703, 0.5), gain: 0.08 },
  { t: 54.2, fx: () => pencilScratch(704, 1.2), gain: 0.07 },
  { t: 55.2, fx: () => paper(705, 0.4), gain: 0.07 },
  ...[57.9, 58.5, 59.1].map((t, i) => ({ t, fx: () => pencilScratch(706 + i, 0.4), gain: 0.07 })),
  ...Array.from({ length: 14 }, (_, i) => ({ t: 59.4 + 3.4 * (1 - Math.pow(1 - i / 14, 1.6)), fx: () => pencilScratch(710 + i, 0.32), gain: 0.06 + i * 0.004 })),
  // T：低频冲击 + 铅字压在纸上（与《千年之后》的重拍同时；T-0.55 起完全安静）
  { t: T, fx: () => impact(801), gain: 0.45 },
  { t: T, fx: () => stamp(802), gain: 0.3 },
  // 人物页
  { t: 75.95, fx: () => paper(901, 0.6), gain: 0.06 },
  // 方法：纸上写字、手机打字、地图上写字
  { t: 97.5, fx: () => pencilScratch(1501, 0.9), gain: 0.06 },
  ...[100.85, 101.0, 101.15, 101.3, 101.45, 101.6].map((t, i) => ({ t, fx: () => tick(1510 + i), gain: 0.03 })),
  { t: 102.4, fx: () => pencilScratch(1520, 0.8), gain: 0.06 },
  // 有用的悲观：画路线
  { t: 102.75, fx: () => pencilScratch(1601, 0.35), gain: 0.07 },
  ...[104.2, 105.1, 106.1].map((t, i) => ({ t, fx: () => pencilScratch(1610 + i, 0.9), gain: 0.05 })),
  // 结尾：起身、收杯子、关灯
  { t: 108.3, fx: () => chairKnock(1701), gain: 0.05, pan: 0.2 },
  ...[109.72, 109.9, 110.08].map((t, i) => ({ t, fx: () => clink(1710 + i), gain: 0.035, pan: 0.15 })),
  { t: 110.8, fx: () => switchClick(1720), gain: 0.08, pan: 0.3 },
];

module.exports = CUES;
