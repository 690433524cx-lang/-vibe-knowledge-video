// 音效：全部由代码合成，按设计时间编排，渲染时映射到真实时间（随 T 移动）。
// 全片核心音效控制在 8～12 种以内，且都很轻，不与《千年之后》抢。
const fs = require('fs');
const { toReal, DESIGN_T } = require('./config');
const { rng } = require('./lib/util');

const SR = 48000;

function biquad(type, f, q = 0.7) {
  const w = (2 * Math.PI * f) / SR, cs = Math.cos(w), al = Math.sin(w) / (2 * q);
  let b0, b1, b2, a0, a1, a2;
  if (type === 'lp') { b0 = (1 - cs) / 2; b1 = 1 - cs; b2 = b0; }
  else if (type === 'hp') { b0 = (1 + cs) / 2; b1 = -(1 + cs); b2 = b0; }
  else { b0 = al; b1 = 0; b2 = -al; } // bandpass
  a0 = 1 + al; a1 = -2 * cs; a2 = 1 - al;
  let x1 = 0, x2 = 0, y1 = 0, y2 = 0;
  return (x) => {
    const y = (b0 * x + b1 * x1 + b2 * x2 - a1 * y1 - a2 * y2) / a0;
    x2 = x1; x1 = x; y2 = y1; y1 = y;
    return y;
  };
}

const buf = (sec) => new Float32Array(Math.ceil(sec * SR));

// 1 水滴：短促下滑的正弦 + 一点点水声
function drop(seed = 1) {
  const b = buf(0.5), r = rng(seed), bp = biquad('bp', 2400, 3);
  for (let i = 0; i < b.length; i++) {
    const t = i / SR;
    const f = 1500 * Math.exp(-t * 28) + 520;
    const ph = 2 * Math.PI * (520 * t + (1500 / 28) * (1 - Math.exp(-t * 28)));
    b[i] = Math.sin(ph) * Math.exp(-t * 22) * 0.55 + bp(r() * 2 - 1) * Math.exp(-t * 60) * 0.25;
    void f;
  }
  return b;
}

// 2 纸张摩擦：带通噪声，包络起伏
function paper(seed = 2, dur = 0.7) {
  const b = buf(dur), r = rng(seed), bp = biquad('bp', 3200, 0.8), hp = biquad('hp', 900);
  for (let i = 0; i < b.length; i++) {
    const t = i / SR, k = t / dur;
    const e = Math.sin(Math.PI * k) * (0.6 + 0.4 * Math.sin(t * 37 + Math.sin(t * 11) * 2));
    b[i] = hp(bp(r() * 2 - 1)) * e * 0.9;
  }
  return b;
}

// 3 极轻的钟声「嗒」
function tick(seed = 3) {
  const b = buf(0.12), r = rng(seed), bp = biquad('bp', 3800, 6);
  for (let i = 0; i < b.length; i++) {
    const t = i / SR;
    b[i] = bp(r() * 2 - 1) * Math.exp(-t * 90) * 1.6 + Math.sin(2 * Math.PI * 1900 * t) * Math.exp(-t * 120) * 0.15;
  }
  return b;
}

// 4 取号机出纸：低沉的嗒嗒走纸声
function printer(seed = 4, dur = 0.45) {
  const b = buf(dur), r = rng(seed), bp = biquad('bp', 1600, 1.2);
  for (let i = 0; i < b.length; i++) {
    const t = i / SR;
    const am = 0.5 + 0.5 * Math.sign(Math.sin(2 * Math.PI * 34 * t));
    const e = Math.min(1, t * 40) * Math.min(1, (dur - t) * 20);
    b[i] = bp(r() * 2 - 1) * am * e * 0.7;
  }
  return b;
}

// 编排（设计时间）。gain 为线性增益。
const CUES = [
  { t: 2.2, fx: () => drop(11), gain: 0.32 },
  { t: 4.4, fx: () => drop(12), gain: 0.22 },
  { t: 6.6, fx: () => drop(13), gain: 0.16 },
  { t: 7.75, fx: () => paper(21, 0.8), gain: 0.18 },
  { t: 9.6, fx: () => tick(31), gain: 0.16 },
  { t: 11.6, fx: () => tick(32), gain: 0.14 },
  { t: 13.9, fx: () => tick(33), gain: 0.13 },
  { t: 17.45, fx: () => printer(41), gain: 0.16 },
];
void DESIGN_T;

function mixSfx(fromReal, toRealT) {
  const len = Math.ceil((toRealT - fromReal) * SR);
  const L = new Float32Array(len), R = new Float32Array(len);
  for (const c of CUES) {
    const start = Math.round((toReal(c.t) - fromReal) * SR);
    const s = c.fx();
    const pan = c.pan || 0;
    for (let i = 0; i < s.length; i++) {
      const j = start + i;
      if (j < 0 || j >= len) continue;
      L[j] += s[i] * c.gain * (1 - pan * 0.5);
      R[j] += s[i] * c.gain * (1 + pan * 0.5);
    }
  }
  // 极淡的房间底噪，让静音段不至于「死」
  const r = rng(5), lp = biquad('lp', 500), lp2 = biquad('lp', 500);
  for (let i = 0; i < len; i++) {
    L[i] += lp(r() * 2 - 1) * 0.004;
    R[i] += lp2(r() * 2 - 1) * 0.004;
  }
  return [L, R];
}

function writeWav(file, [L, R]) {
  const n = L.length, data = Buffer.alloc(n * 4);
  for (let i = 0; i < n; i++) {
    data.writeInt16LE(Math.max(-32768, Math.min(32767, Math.round(L[i] * 32767))), i * 4);
    data.writeInt16LE(Math.max(-32768, Math.min(32767, Math.round(R[i] * 32767))), i * 4 + 2);
  }
  const h = Buffer.alloc(44);
  h.write('RIFF', 0); h.writeUInt32LE(36 + data.length, 4); h.write('WAVE', 8);
  h.write('fmt ', 12); h.writeUInt32LE(16, 16); h.writeUInt16LE(1, 20); h.writeUInt16LE(2, 22);
  h.writeUInt32LE(SR, 24); h.writeUInt32LE(SR * 4, 28); h.writeUInt16LE(4, 32); h.writeUInt16LE(16, 34);
  h.write('data', 36); h.writeUInt32LE(data.length, 40);
  fs.writeFileSync(file, Buffer.concat([h, data]));
}

module.exports = { mixSfx, writeWav, CUES, SR };
