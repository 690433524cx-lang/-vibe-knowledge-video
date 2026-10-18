// 音效：全部由代码合成，按设计时间编排，渲染时映射到真实时间（随 T 移动）。
// 全片核心音效控制在 8～12 种以内，且都很轻，不与《千年之后》抢。
const fs = require('fs');
const path = require('path');
const { toReal, VIDEO_DIR } = require('./config');
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

// 5 照片落在桌上：一声很轻的闷响 + 纸边
function photoDrop(seed = 5) {
  const b = buf(0.4), r = rng(seed), lp = biquad('lp', 900), bp = biquad('bp', 2500, 1);
  for (let i = 0; i < b.length; i++) {
    const t = i / SR;
    b[i] = Math.sin(2 * Math.PI * 140 * t) * Math.exp(-t * 30) * 0.6 + lp(r() * 2 - 1) * Math.exp(-t * 40) * 0.8 + bp(r() * 2 - 1) * Math.exp(-t * 25) * 0.3;
  }
  return b;
}

// 6 细线拉紧：上滑的共振，带一点摩擦
function threadTight(seed = 6, dur = 0.7) {
  const b = buf(dur), r = rng(seed);
  let ph = 0;
  for (let i = 0; i < b.length; i++) {
    const t = i / SR, k = t / dur;
    const f = 520 + 380 * k * k;
    ph += (2 * Math.PI * f) / SR;
    const e = Math.sin(Math.PI * k) * (0.8 + 0.2 * Math.sin(t * 90));
    b[i] = (Math.sin(ph) * 0.35 + Math.sin(ph * 2.01) * 0.12 + (r() * 2 - 1) * 0.05) * e;
  }
  return b;
}

// 7 高潮低频冲击：只作增强，短、低、克制
function impact(seed = 7) {
  const b = buf(1.6), r = rng(seed), lp = biquad('lp', 180), lp2 = biquad('lp', 1200);
  let ph = 0;
  for (let i = 0; i < b.length; i++) {
    const t = i / SR;
    const f = 34 + 40 * Math.exp(-t * 9);
    ph += (2 * Math.PI * f) / SR;
    b[i] = Math.sin(ph) * Math.exp(-t * 2.6) * 0.9 + lp(r() * 2 - 1) * Math.exp(-t * 14) * 1.6 + lp2(r() * 2 - 1) * Math.exp(-t * 60) * 0.25;
  }
  return b;
}

// 8 旧印章：木头闷敲 + 纸面
function stamp(seed = 8) {
  const b = buf(0.45), r = rng(seed), bp = biquad('bp', 420, 2), hp = biquad('hp', 1800);
  for (let i = 0; i < b.length; i++) {
    const t = i / SR;
    b[i] = bp(r() * 2 - 1) * Math.exp(-t * 28) * 2.2 + Math.sin(2 * Math.PI * 190 * t) * Math.exp(-t * 35) * 0.5 + hp(r() * 2 - 1) * Math.exp(-t * 70) * 0.2;
  }
  return b;
}

// 9 铅笔划线
function pencilScratch(seed = 9, dur = 0.5) {
  const b = buf(dur), r = rng(seed), bp = biquad('bp', 5200, 1.5), hp = biquad('hp', 2500);
  for (let i = 0; i < b.length; i++) {
    const t = i / SR, k = t / dur;
    const e = Math.sin(Math.PI * k) * (0.6 + 0.4 * Math.abs(Math.sin(t * 60)));
    b[i] = hp(bp(r() * 2 - 1)) * e * 1.1;
  }
  return b;
}

// 10 门轻轻打开：很慢的低吱声
function door(seed = 10, dur = 1.6) {
  const b = buf(dur), r = rng(seed), bp = biquad('bp', 700, 4), lp = biquad('lp', 300);
  let ph = 0;
  for (let i = 0; i < b.length; i++) {
    const t = i / SR, k = t / dur;
    const f = 180 + 60 * Math.sin(k * 3);
    ph += (2 * Math.PI * f) / SR;
    const grain = 0.5 + 0.5 * Math.sign(Math.sin(2 * Math.PI * (22 + 10 * k) * t));
    const e = Math.sin(Math.PI * k);
    b[i] = (bp(Math.sin(ph) * grain + (r() * 2 - 1) * 0.3) * 0.9 + lp(r() * 2 - 1) * 0.3) * e;
  }
  return b;
}



function mixSfx(fromReal, toRealT) {
  const CUES = require(path.join(VIDEO_DIR, 'audio.js'));
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

// 11 菜单滚动：一串越来越密、又慢下来的轻微划动声
function scrollTicks(seed = 11, dur = 1.5) {
  const b = buf(dur + 0.1), r = rng(seed), bp = biquad('bp', 2800, 2.5);
  let ph = 0;
  for (let i = 0; i < b.length; i++) {
    const t = i / SR, k = Math.min(1, t / dur);
    const rate = 6 + 34 * Math.sin(Math.PI * k);
    const prev = ph;
    ph += rate / SR;
    const click = Math.floor(ph) !== Math.floor(prev) ? 1 : 0;
    b[i] = bp((r() * 2 - 1) * 0.15 + click * 3) * Math.sin(Math.PI * k);
  }
  return b;
}

// 12 路线熄灭：一声很闷的低音 + 继电器似的轻响（明显弱于 T 的冲击）
function lightsOut(seed = 12) {
  const b = buf(0.9), r = rng(seed), lp = biquad('lp', 240), bp = biquad('bp', 1800, 4);
  for (let i = 0; i < b.length; i++) {
    const t = i / SR;
    b[i] = Math.sin(2 * Math.PI * (58 - 12 * t) * t) * Math.exp(-t * 6) * 0.6 + lp(r() * 2 - 1) * Math.exp(-t * 18) * 0.7 + bp(r() * 2 - 1) * Math.exp(-t * 80) * 0.6;
  }
  return b;
}

module.exports = {
  mixSfx, writeWav, SR,
  synth: { drop, paper, tick, printer, photoDrop, threadTight, impact, stamp, pencilScratch, door, scrollTicks, lightsOut },
};
