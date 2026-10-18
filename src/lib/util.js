const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
const lerp = (a, b, k) => a + (b - a) * k;
// t 在 [a, b] 内的归一化进度
const prog = (t, a, b) => clamp((t - a) / (b - a));
const smooth = (k) => k * k * (3 - 2 * k);
const easeOut = (k) => 1 - Math.pow(1 - k, 3);
const easeIn = (k) => k * k * k;
const easeInOut = (k) => (k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2);
const easeOutSoft = (k) => 1 - Math.pow(1 - k, 2);

// 淡入淡出包络：a 开始淡入，持续 fi；b 开始淡出，持续 fo
function env(t, a, b, fi = 0.4, fo = 0.4) {
  if (t < a || t > b + fo) return 0;
  return smooth(prog(t, a, a + fi)) * (1 - smooth(prog(t, b, b + fo)));
}

// 可复现的伪随机
function rng(seed) {
  let s = (seed >>> 0) || 1;
  return () => {
    s ^= s << 13; s >>>= 0;
    s ^= s >> 17;
    s ^= s << 5; s >>>= 0;
    return s / 4294967296;
  };
}
function hash(...xs) {
  let h = 2166136261;
  for (const x of xs) {
    const v = Math.floor(x * 1000) | 0;
    h ^= v; h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}
// 1D 平滑噪声（-1..1）
function noise1(x, seed = 0) {
  const i = Math.floor(x), f = x - i;
  const a = rng(hash(i, seed))() * 2 - 1;
  const b = rng(hash(i + 1, seed))() * 2 - 1;
  return lerp(a, b, smooth(f));
}

module.exports = { clamp, lerp, prog, smooth, easeOut, easeIn, easeInOut, easeOutSoft, env, rng, hash, noise1 };
