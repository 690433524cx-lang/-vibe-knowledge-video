// 有重量的运动：用阻尼弹簧代替 ease-in-out 模板。
// 所有函数都是「时间 → 进度」的纯函数，可逐帧随机访问。
const { clamp } = require('./util');

// 阻尼弹簧从 0 走到 1。freq 越小越「重」，damp < 1 会有轻微过冲。
//   纸：spring(t, t0, 3.2, 0.72)   门：spring(t, t0, 1.4, 1.0)
//   照片：spring(t, t0, 2.2, 0.6)  大字：spring(t, t0, 5, 0.9)
function spring(t, t0, freq = 2, damp = 0.85) {
  const x = t - t0;
  if (x <= 0) return 0;
  const w = 2 * Math.PI * freq;
  if (damp >= 1) {
    // 临界阻尼：没有过冲，起步慢、收尾长
    return 1 - (1 + w * x) * Math.exp(-w * x);
  }
  const wd = w * Math.sqrt(1 - damp * damp);
  return 1 - Math.exp(-damp * w * x) * (Math.cos(wd * x) + (damp * w / wd) * Math.sin(wd * x));
}

// 带摩擦的惯性：初速度 v0、摩擦系数 k，返回位移（最终停在 v0/k）
function glide(t, t0, v0, k) {
  const x = Math.max(0, t - t0);
  return (v0 / k) * (1 - Math.exp(-k * x));
}

// 有重量的起步：先慢（克服惯性）后匀，再被摩擦拖住
function heavy(t, t0, dur) {
  const k = clamp((t - t0) / dur);
  return k * k * (3 - 2 * k) * (0.85 + 0.15 * k);
}

// 阻尼摆：初始角 a0，频率 f，衰减 d
function pendulum(t, t0, a0, f = 0.8, d = 0.6) {
  const x = Math.max(0, t - t0);
  return a0 * Math.exp(-d * x) * Math.cos(2 * Math.PI * f * x);
}

module.exports = { spring, glide, heavy, pendulum };
