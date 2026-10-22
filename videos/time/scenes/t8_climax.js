// 第八幕 · 65.0–71.6 秒：核心高潮（MAIN_BEAT_T）。
//   T：极暗的画面中央，「时间没有加速。」——大、暖白、带一点旧印刷的墨色不均。
//   停顿。T+1.9：第二行「是重复，让它消失了。」
//   不用粒子、不用爆炸，只靠停顿、文字、留白和重量。
const L = require('../lib');
const { W, H, FONT, rng, noise1, lerp, clamp, prog, smooth } = L;
const { DESIGN_T } = require('../../../src/config');
const { sheetTexture } = require('../../../src/lib/material');

const T = DESIGN_T;
const S = { start: T - 0.05, end: T + 6.7 };

function draw(ctx, d) {
  // 炭黑的纸：暗处也有纤维
  const tex = sheetTexture(W + 40, H + 40, 881, 'charcoal', { rough: 0 });
  ctx.drawImage(tex.canvas, -20 - tex.pad, -20 - tex.pad);
  ctx.fillStyle = 'rgba(10,8,7,0.35)';
  ctx.fillRect(0, 0, W, H);
  L.dust(ctx, d, { n: 40, seed: 88, alpha: 0.35, size: 0.9, inBeam: (x, y) => clamp(1 - Math.hypot(x - 960, y - 520) / 700) });
}

function drawOver(ctx, d) {
  const t = d - T;
  const out = 1 - smooth(prog(t, 6.0, 6.6));
  // 第一行：T 那一帧就在，带一点压下去的重量
  const s1 = 1 + 0.04 * Math.exp(-Math.max(0, t) * 6);
  ctx.save();
  ctx.translate(W / 2, 470);
  ctx.scale(s1, s1);
  ctx.translate(-W / 2, -470);
  L.anchorWord(ctx, '时间没有加速。', { alpha: (t >= 0 ? 1 : 0) * out, size: 124, y: 470, seed: 801, spacing: 14 });
  ctx.restore();
  const a2 = smooth(prog(t, 1.9, 2.5)) * out;
  L.anchorWord(ctx, '是重复，让它消失了。', { alpha: a2, size: 86, y: 640, seed: 802, spacing: 10, color: '#e2d6bf' });
}

function light(d) { return [{ x: 960, y: 540, rx: 1100, ry: 640, i: 0.75, core: 0.3 }]; }
function grade(d) { return { warm: 0.15, ambient: 0.25 }; }

module.exports = { ...S, draw, drawOver, light, grade };
