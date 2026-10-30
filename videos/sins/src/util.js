// 数学、缓动与确定性随机数。全片唯一的随机来源：hash(i) 与固定种子的 PRNG。
export const TAU = Math.PI * 2;
export const D2R = Math.PI / 180;

// 循环周期 = 成片时长（短版 11 秒、长版 84 秒）。所有周期性运动的频率都量化成它的整数倍，首尾帧才能无缝相接。
// 频率沿用傲慢项目的写法「每 128 秒 k 圈」，再换算到当前周期上最接近的整数圈数，所以长短版的运动速度一致。
export let LOOP = 11;
export function setLoop(L) { LOOP = L; }
export const qk = k => Math.max(1, Math.round(k * LOOP / 128));
export const loopSin = (t, k, ph = 0) => Math.sin(TAU * qk(k) * t / LOOP + ph);

export const clamp = (x, a = 0, b = 1) => (x < a ? a : x > b ? b : x);
export const lerp = (a, b, k) => a + (b - a) * k;
export const lerp3 = (a, b, k) => [lerp(a[0], b[0], k), lerp(a[1], b[1], k), lerp(a[2], b[2], k)];
export const fract = x => x - Math.floor(x);
export const mod = (x, m) => ((x % m) + m) % m;
export const hash = i => fract(Math.sin(i * 127.1 + 311.7) * 43758.5453);
export const prog = (t, a, b) => (b <= a ? (t >= b ? 1 : 0) : clamp((t - a) / (b - a)));
export const out3 = x => 1 - Math.pow(1 - x, 3);
export const in2 = x => x * x;
export const inOut = x => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);
export const outExpo = x => (x >= 1 ? 1 : 1 - Math.pow(2, -10 * x));
export const inExpo = x => (x <= 0 ? 0 : Math.pow(2, 10 * x - 10));
export const sine = x => -(Math.cos(Math.PI * x) - 1) / 2;
export const outBack = x => { const c1 = 1.6, c3 = c1 + 1; return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2); };
export const smooth = (a, b, x) => { const k = clamp((x - a) / (b - a)); return k * k * (3 - 2 * k); };
export function vis(t, a, b, fi = 0.4, fo = 0.4) {
  if (t < a || t > b) return 0;
  const i = fi > 0 ? sine(prog(t, a, a + fi)) : 1;
  const o = fo > 0 ? 1 - sine(prog(t, b - fo, b)) : 1;
  return Math.min(i, o);
}

// 固定种子的伪随机（mulberry32），只在启动时生成资产用
export function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6D2B79F5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// 分段关键帧：[[t, v], ...]，段间正弦缓动
export function track(keys, t) {
  if (t <= keys[0][0]) return keys[0][1];
  for (let i = 0; i < keys.length - 1; i++) {
    const [a, va] = keys[i], [b, vb] = keys[i + 1];
    if (t <= b) {
      const k = sine(prog(t, a, b));
      if (Array.isArray(va)) return va.map((v, j) => lerp(v, vb[j], k));
      return lerp(va, vb, k);
    }
  }
  return keys[keys.length - 1][1];
}

// 颜色：'#RRGGBB' ↔ [r,g,b]（0–1），以及线性混合
export const hex = h => [parseInt(h.slice(1, 3), 16) / 255, parseInt(h.slice(3, 5), 16) / 255, parseInt(h.slice(5, 7), 16) / 255];
export const mixc = (a, b, k) => [lerp(a[0], b[0], k), lerp(a[1], b[1], k), lerp(a[2], b[2], k)];
export const css = (c, a = 1) => `rgba(${Math.round(c[0] * 255)},${Math.round(c[1] * 255)},${Math.round(c[2] * 255)},${a})`;
