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

// 给一段声音乘上包络（降低、淡入淡出）
function shaped(b, env) { for (let i = 0; i < b.length; i++) b[i] *= env(i / SR); return b; }

// 时间都是新时间轴（最终精修版）。没有任何背景音乐、持续的旋律或 pad：只有环境声和少量音效。
const CUES = [
  // 片名（真实 0–1.3 s）：门后面闷住的聚会声，片名淡出时接上真正的聚会
  { t: -1.3, gain: 0.07, fx: () => party(99, 1.45, (t) => smoothstep(0, 0.3, t) * (1 - smoothstep(1.2, 1.45, t)), { lpHz: 520 }) },
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
  // 面试：走廊的空气声；第二个幻象是一封邮件——一声手机提示；第三个幻象之后一下子安静
  { t: 24.1, fx: () => air(501, 3.85), gain: 0.08 },
  { t: 26.25, fx: () => tick(510), gain: 0.06 },
  // 不敢快乐太久：笑声、碰杯都还在；30.6 起周围的声音降下去（人还在笑，只是听不清了）
  { t: 27.85, gain: 0.15, fx: () => party(530, 6.2, (t) => smoothstep(0, 0.15, t) * (1 - smoothstep(2.75, 3.95, t) * 0.65) * (1 - smoothstep(5.8, 6.2, t))) },
  { t: 28.35, fx: () => clink(531), gain: 0.05, pan: 0.15 },
  // 列车上的提前难过：快乐还在（列车、窗外）；35.2 起声音变弱
  { t: 33.8, gain: 0.12, fx: () => shaped(trainAmb(540, 4.1), (t) => 1 - smoothstep(1.4, 2.4, t) * 0.75) },
  // 地图上的铅笔：圈出风险、画绕行路线、真的断桥；之后他自己画上去的灾难越画越快
  { t: 44.18, fx: () => pencilScratch(701, 0.45), gain: 0.08 },
  { t: 44.97, fx: () => pencilScratch(702, 0.45), gain: 0.08 },
  { t: 45.76, fx: () => pencilScratch(703, 0.45), gain: 0.08 },
  { t: 46.9, fx: () => pencilScratch(704, 1.0), gain: 0.07 },
  { t: 47.76, fx: () => paper(705, 0.4), gain: 0.07 },
  ...[48.9, 49.2, 49.9, 50.3].map((t, i) => ({ t, fx: () => pencilScratch(706 + i, 0.35), gain: 0.07 })),
  ...Array.from({ length: 12 }, (_, i) => ({ t: 51.0 + 4.0 * (1 - Math.pow(1 - i / 12, 1.6)), fx: () => pencilScratch(720 + i, 0.3), gain: 0.06 + i * 0.004 })),
  // T：低频冲击 + 铅字压在纸上（T-0.3 起完全安静）
  { t: T, fx: () => impact(801), gain: 0.45 },
  { t: T, fx: () => stamp(802), gain: 0.3 },
  // 解释风格：夜里房间的空气、纸团轻轻一响
  { t: 66.9, fx: () => air(901, 5.6), gain: 0.05 },
  { t: 67.3, fx: () => paper(902, 0.3), gain: 0.04 },
  // 工作：一声很轻的提示
  { t: 79.6, fx: () => tick(951), gain: 0.04 },
  // 先离开的人：屋里的聚会还在继续
  { t: 82.75, gain: 0.12, fx: () => party(1301, 5.9, (t) => smoothstep(0, 0.15, t) * (1 - smoothstep(5.5, 5.9, t))) },
  { t: 83.4, fx: () => clink(1302), gain: 0.045, pan: 0.3 },
  // 年夜饭：一家人还在说话；奶奶淡下去的时候，声音也低下去，她回来，声音也回来
  { t: 88.5, gain: 0.12, fx: () => walla(1401, 8.15, { voices: 7, f0: 330, lpHz: 1400, laughs: [[1.0, 4, 300, 0.7], [5.5, 4, 230, 0.6]], env: (t) => smoothstep(0, 0.2, t) * (1 - smoothstep(3.1, 4.0, t) * 0.7 + smoothstep(6.1, 7.0, t) * 0.7) * (1 - smoothstep(7.8, 8.15, t)) }) },
  { t: 89.2, fx: () => farCrackers(1402, 2.2), gain: 0.05, pan: -0.3 },
  // 方法：地图边写字、便利贴上写字、玻璃上手指擦过
  { t: 96.7, fx: () => pencilScratch(1501, 0.9), gain: 0.06 },
  { t: 98.9, fx: () => pencilScratch(1502, 1.0), gain: 0.06 },
  { t: 100.85, fx: () => air(1503, 6.6), gain: 0.05 },
  { t: 101.0, fx: () => whoosh(1504), gain: 0.03 },
  // 结尾：散场以后的房间；起身、拿起一只杯子、打开小台灯
  { t: 107.4, fx: () => air(1701, 12.1), gain: 0.06 },
  { t: 108.0, fx: () => chairKnock(1702), gain: 0.045, pan: 0.2 },
  { t: 109.95, fx: () => clink(1710), gain: 0.03, pan: 0.15 },
  { t: 116.3, fx: () => switchClick(1720), gain: 0.08, pan: -0.15 },
];

module.exports = CUES;
