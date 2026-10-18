// 《悲观主义》音效编排（设计时间，随 MAIN_BEAT_T 移动）。全部代码合成，克制。
// 当前没有《千年之后》，样片不放 BGM，只有环境音与少量音效。
// 声音跟着「现实 / 想象」走：聚会和年夜饭的人声都在；想象散场的时候，人声被抽空。
const { SR, biquad, buf, synth } = require('../../src/audio');
const { pencilScratch, paper, impact, stamp, photoDrop, tick, threadTight } = synth;
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

// 脑内的未来：人声被抽走以后，只剩一点很高、很轻的耳鸣和房间底噪
function hollow(seed = 10, dur = 1.9) {
  const b = buf(dur), r = rng(seed), lp = biquad('lp', 220);
  for (let i = 0; i < b.length; i++) {
    const t = i / SR;
    const e = Math.min(1, t / 0.25) * Math.min(1, (dur - t) / 0.2);
    b[i] = (Math.sin(2 * Math.PI * 3150 * t) * 0.08 + lp(r() * 2 - 1) * 1.2) * e;
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

// 消息发出去：一声很短、很轻的「嗖」
function whoosh(seed = 20) {
  const b = buf(0.45), r = rng(seed), bp = biquad('bp', 1800, 1.2);
  for (let i = 0; i < b.length; i++) {
    const t = i / SR, k = t / 0.45;
    b[i] = bp(r() * 2 - 1) * Math.sin(Math.PI * k) ** 2 * 1.2 + Math.sin(2 * Math.PI * (900 + 900 * k) * t) * Math.exp(-t * 14) * 0.08;
  }
  return b;
}
// 走廊：空调的低频嗡鸣 + 门缝里传出来的一点空气声
function hum(seed = 21, dur = 8.4) {
  const b = buf(dur), r = rng(seed), lp = biquad('lp', 160), bp = biquad('bp', 600, 0.8);
  for (let i = 0; i < b.length; i++) {
    const t = i / SR;
    const e = Math.min(1, t / 0.6) * Math.min(1, (dur - t) / 0.5);
    b[i] = (Math.sin(2 * Math.PI * 60 * t) * 0.12 + Math.sin(2 * Math.PI * 120 * t) * 0.05 + lp(r() * 2 - 1) * 1.2 + bp(r() * 2 - 1) * 0.12) * e;
  }
  return b;
}
// 放映机：一声咔嗒；whir = 持续的转动声
function projector(seed = 22, dur = 0.12) {
  const b = buf(dur), r = rng(seed), bp = biquad('bp', 2200, 3), lp = biquad('lp', 700);
  for (let i = 0; i < b.length; i++) {
    const t = i / SR;
    if (dur < 0.2) { b[i] = bp(r() * 2 - 1) * Math.exp(-t * 70) * 1.4 + lp(r() * 2 - 1) * Math.exp(-t * 50) * 0.6; continue; }
    const e = Math.min(1, t / 0.4) * Math.min(1, (dur - t) / 0.4);
    const clat = (t * 24) % 1 < 0.18 ? 1 : 0.2;
    b[i] = (bp(r() * 2 - 1) * clat * 0.5 + Math.sin(2 * Math.PI * 92 * t) * 0.12) * e;
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
const CUES = [
  // 第一幕：聚会人声一直在；5.2–6.9 脑内的未来里一下子被抽空，6.9 回到现实时又回来
  { t: 0.0, gain: 0.15, fx: () => walla(101, 8.0, { voices: 6, laughs: [[0.3, 6, 210], [1.0, 5, 260, 0.8], [3.5, 4, 190, 0.7], [4.4, 5, 240, 0.7], [7.0, 4, 220, 0.8]],
    env: (t) => (1 - smoothstep(5.15, 5.4, t) * 0.97 + smoothstep(6.85, 7.0, t) * 0.97) * (1 - smoothstep(7.3, 8.0, t)) }) },
  { t: 0.58, fx: () => clink(105), gain: 0.07, pan: 0.2 },    // 他和朋友碰杯
  { t: 1.75, fx: () => clink(106), gain: 0.04, pan: -0.4 },   // 远处两个人碰杯
  { t: 5.2, fx: () => hollow(107), gain: 0.05 },
  // 第二幕：一家人的声音；12.6 起一个一个少下去，14.9 完全安静
  { t: 8.3, gain: 0.14, fx: () => walla(201, 7.0, { voices: 7, f0: 330, laughs: [[1.0, 5, 330, 0.9], [1.2, 6, 200], [3.1, 4, 230, 0.8]],
    env: (t) => smoothstep(0, 0.6, t) * (1 - smoothstep(4.3, 6.6, t)) }) },
  { t: 9.65, fx: () => clink(202), gain: 0.06, pan: -0.2 },   // 爷爷和叔叔碰杯
  { t: 8.6, fx: () => farCrackers(203, 2.6), gain: 0.07, pan: -0.3 }, // 窗外的鞭炮（还在过年）
  { t: 15.05, fx: () => chairKnock(204), gain: 0.12, pan: 0.45 },     // 空椅子轻轻晃
  // 第三幕：列车
  { t: 16.0, fx: () => trainAmb(301, 10.6), gain: 0.12 },
  // 第四幕：消息
  { t: 25.62, fx: () => whoosh(401), gain: 0.07, pan: 0.2 },
  { t: 27.85, fx: () => photoDrop(402), gain: 0.06, pan: 0.3 },     // 手机放在床头柜上
  { t: 31.0, fx: () => tick(403), gain: 0.05, pan: 0.3 },           // 又点亮
  { t: 32.95, fx: () => threadTight(404, 0.7), gain: 0.05 },        // 光标被拉长
  // 第五幕：走廊
  { t: 33.4, fx: () => hum(501, 8.4), gain: 0.1 },
  ...[39.0, 39.55, 40.1].map((t, i) => ({ t, fx: () => projector(510 + i), gain: 0.08 })), // 每次幻象
  // 第六幕：回闪 + 投影
  ...[41.7, 42.12, 42.48, 42.8, 43.08].map((t, i) => ({ t, fx: () => projector(520 + i), gain: 0.09 })),
  { t: 48.4, fx: () => projector(530, 3.3), gain: 0.06, pan: -0.3 },
  // 第七 / 八幕：地图上的铅笔
  { t: 53.6, fx: () => pencilScratch(701, 0.5), gain: 0.08 },
  { t: 54.5, fx: () => pencilScratch(702, 0.5), gain: 0.08 },
  { t: 55.4, fx: () => pencilScratch(703, 0.5), gain: 0.08 },
  { t: 57.0, fx: () => pencilScratch(704, 1.4), gain: 0.07 },
  { t: 58.2, fx: () => paper(705, 0.4), gain: 0.07 },                 // 桥断了：纸面一声闷响
  ...Array.from({ length: 14 }, (_, i) => ({ t: 60.0 + 5 * (1 - Math.pow(1 - i / 14, 1.6)), fx: () => pencilScratch(710 + i, 0.35), gain: 0.06 + i * 0.004 })),
  // T：与音乐重拍同时
  { t: T, fx: () => impact(801), gain: 0.45 },
  { t: T, fx: () => stamp(802), gain: 0.3 },
  // 研究档案 + 人物页
  { t: T + 6.0, fx: () => paper(901, 0.6), gain: 0.08 },
  { t: 73.6, fx: () => paper(902, 0.7), gain: 0.08 },
  // 解释风格：三条铅笔线
  ...[80.9, 81.7, 82.3].map((t, i) => ({ t, fx: () => pencilScratch(1001 + i, 0.4), gain: 0.07 })),
  // 红铅笔划掉三句话
  ...[92.0, 92.65, 93.3].map((t, i) => ({ t, fx: () => pencilScratch(1401 + i, 0.4), gain: 0.11 })),
  { t: 96.6, fx: () => paper(1410, 0.6), gain: 0.08 },                 // 换一张纸
  ...[96.9, 98.0, 99.6, 101.2].map((t, i) => ({ t, fx: () => pencilScratch(1420 + i, 0.75), gain: 0.05 })),
  // 有用的悲观：画路线
  { t: 103.0, fx: () => pencilScratch(1601, 0.35), gain: 0.07 },
  ...[103.9, 104.8, 106.0].map((t, i) => ({ t, fx: () => pencilScratch(1610 + i, 0.9), gain: 0.05 })),
  // 结尾：起身、收杯子、关灯
  { t: 108.55, fx: () => chairKnock(1701), gain: 0.05, pan: 0.2 },
  ...[109.95, 110.13, 110.31].map((t, i) => ({ t, fx: () => clink(1710 + i), gain: 0.035, pan: 0.15 })),
  { t: 110.95, fx: () => switchClick(1720), gain: 0.08, pan: 0.3 },
];

module.exports = CUES;
