// 小工具：确定性随机、插值、缓动
export const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
export const lerp = (a, b, t) => a + (b - a) * t;
export const smooth = (a, b, x) => { const t = clamp((x - a) / (b - a)); return t * t * (3 - 2 * t); };
export const hash = n => { const s = Math.sin(n * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s); };
export function rng(seed) { let a = seed >>> 0; return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
export const outExpo = t => t >= 1 ? 1 : 1 - Math.pow(2, -10 * t);
export const outBack = (t, s = 1.70158) => { t = clamp(t) - 1; return t * t * ((s + 1) * t + s) + 1; };
export const outCubic = t => 1 - Math.pow(1 - clamp(t), 3);
export const inOut = t => { t = clamp(t); return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; };
export const prog = (t, a, b) => clamp((t - a) / (b - a));
export const D2R = Math.PI / 180;
export const hexRGB = h => { const n = parseInt(h.slice(1), 16); return [(n >> 16 & 255) / 255, (n >> 8 & 255) / 255, (n & 255) / 255]; };
export const rgba = (h, a) => { const [r, g, b] = hexRGB(h); return `rgba(${(r * 255) | 0},${(g * 255) | 0},${(b * 255) | 0},${a})`; };
export const mixHex = (h1, h2, t) => { const a = hexRGB(h1), b = hexRGB(h2); return '#' + a.map((v, i) => Math.round((v + (b[i] - v) * t) * 255).toString(16).padStart(2, '0')).join(''); };
