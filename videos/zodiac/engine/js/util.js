// 数学、缓动与确定性随机数。画面只由 t 决定：不用 Math.random / Date / requestAnimationFrame。
export const TAU = Math.PI * 2;
export const D2R = Math.PI / 180;
export const LOOP = 25; // 全片时长；周期性运动都取它的整数分之一，首尾帧才能无缝相接

export const clamp = (x, a = 0, b = 1) => (x < a ? a : x > b ? b : x);
export const lerp = (a, b, k) => a + (b - a) * k;
export const fract = x => x - Math.floor(x);
export const mod = (x, m) => ((x % m) + m) % m;
// 规定的确定性哈希：hash(i) = fract(sin(i*127.1+311.7)*43758.5453)
export const hash = i => fract(Math.sin(i * 127.1 + 311.7) * 43758.5453);
export const prog = (t, a, b) => (b <= a ? (t >= b ? 1 : 0) : clamp((t - a) / (b - a)));
export const outExpo = x => (x >= 1 ? 1 : x <= 0 ? 0 : 1 - Math.pow(2, -10 * x));
export const inExpo = x => (x <= 0 ? 0 : x >= 1 ? 1 : Math.pow(2, 10 * x - 10));
export const out3 = x => 1 - Math.pow(1 - clamp(x), 3);
export const in2 = x => x * x;
export const inOut = x => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);
export const sine = x => -(Math.cos(Math.PI * clamp(x)) - 1) / 2;
export const outBack = x => { const c1 = 1.70158, c3 = c1 + 1; return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2); };
export const smooth = (a, b, x) => { const k = clamp((x - a) / (b - a)); return k * k * (3 - 2 * k); };
// 以 LOOP 为周期的正弦：k 为整数
export const loopSin = (t, k, ph = 0) => Math.sin(TAU * k * t / LOOP + ph);
// 冲击包络：0.05 秒冲到顶，再以 rate 指数衰减，dur 秒后归零
export function pulse(t, t0, dur = 0.5, rate = 9) {
  const d = t - t0; if (d < 0 || d > dur) return 0;
  const f = d < 0.05 ? d / 0.05 : Math.exp(-(d - 0.05) * rate);
  return f * (1 - smooth(dur * 0.7, dur, d));
}
// 淡入淡出窗口
export function win(t, a, b, fi = 0.3, fo = 0.3) {
  if (t < a || t > b) return 0;
  return Math.min(fi > 0 ? sine(prog(t, a, a + fi)) : 1, fo > 0 ? 1 - sine(prog(t, b - fo, b)) : 1);
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

// 分段关键帧：[[t, v], ...]，段间正弦缓动；v 可以是数组
export function track(keys, t, ease = sine) {
  if (t <= keys[0][0]) return keys[0][1];
  for (let i = 0; i < keys.length - 1; i++) {
    const [a, va] = keys[i], [b, vb] = keys[i + 1];
    if (t <= b) {
      const k = ease(prog(t, a, b));
      if (Array.isArray(va)) return va.map((v, j) => lerp(v, vb[j], k));
      return lerp(va, vb, k);
    }
  }
  return keys[keys.length - 1][1];
}

// 中文数字（1–99）
export function cnNum(n) {
  const d = '零一二三四五六七八九';
  if (n < 10) return d[n];
  if (n < 20) return '十' + (n % 10 ? d[n % 10] : '');
  return d[Math.floor(n / 10)] + '十' + (n % 10 ? d[n % 10] : '');
}
