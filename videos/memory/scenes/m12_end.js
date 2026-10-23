// 第十二幕 · 94.6–119.0 秒：回到开头那张桌子。
//   94.6   同一张照片、同一个构图；双重影像还在呼吸，但越来越静。99.6「确定」再一次盖上去。
//   100.8  照片下面散开一叠：同一张照片冲洗了很多次，每张都有一点不一样。
//   108.0  它们收回来；110.6 最上面那张被翻过去——背面只有一行铅笔字。
//   110–115 台灯慢慢暗下去；最后只剩一张背面朝上的照片和那句提问。
const L = require('../lib');
const { W, H, FONT, lerp, clamp, prog, smooth } = L;

const S = { start: 94.5, end: 119.0 };
const IN = 94.6, STAMP = 99.6, FAN = 100.8, GATHER = 108.0, FLIP = 110.6, DIM0 = 110.0, DIM1 = 115.0;
const MAIN = { x: 960, y: 418, w: 780, rot: -0.032 };
const OTHERS = [
  { k: 0.8, x: 350, y: 300, rot: -0.12 },
  { k: 0.55, x: 420, y: 640, rot: 0.08 },
  { k: 0.3, x: 1500, y: 640, rot: -0.07 },
  { k: 0, x: 1570, y: 300, rot: 0.11 },
];
const OW = 440;
const ease = (k) => (k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2);

function back(ctx, w, bottom) {
  const h = w * 9 / 16, bw = w + 44, bh = h + 44 + bottom;
  ctx.save();
  ctx.shadowColor = 'rgba(0,0,0,0.6)'; ctx.shadowBlur = 34; ctx.shadowOffsetY = 14;
  ctx.fillStyle = '#6e665a';
  ctx.fillRect(-bw / 2, -h / 2 - 22, bw, bh);
  ctx.restore();
  ctx.fillStyle = 'rgba(30,24,18,0.18)';
  for (let i = 0; i < 6; i++) ctx.fillRect(-bw / 2 + 20, -h / 2 + i * 70, bw - 40, 1);
  ctx.font = FONT.hand(40);
  ctx.fillStyle = 'rgba(214,202,180,0.55)';
  ctx.fillText('1998 夏', -bw / 2 + 40, h / 2 + bottom - 20);
}

function draw(ctx, d) {
  const a = smooth(prog(d, IN, IN + 0.8));
  if (a <= 0) return;
  const mem = L.snapshot(1, 'memory');
  const truth = L.snapshot(0, 'photo');
  const fan = ease(prog(d, FAN, FAN + 1.6)) * (1 - ease(prog(d, GATHER, GATHER + 1.2)));
  // 散开的其他版本（在主照片下面）
  OTHERS.forEach((o, i) => {
    const k = clamp(fan * 1.15 - i * 0.05);
    if (k <= 0.01) return;
    ctx.save();
    ctx.globalAlpha = a * clamp(k * 3);
    ctx.translate(lerp(MAIN.x, o.x, k), lerp(MAIN.y, o.y, k));
    ctx.rotate(lerp(MAIN.rot, o.rot, k));
    L.print(ctx, L.snapshot(o.k, o.k >= 0.5 ? 'memory' : 'photo'), lerp(MAIN.w * 0.9, OW, k), { border: 16, seed: 80 + i });
    ctx.restore();
  });
  // 主照片：散开时稍微缩小
  const ms = 1 - 0.22 * fan;
  const flip = ease(prog(d, FLIP, FLIP + 1.0));
  const sx = Math.cos(Math.PI * flip);
  ctx.save();
  ctx.globalAlpha = a;
  ctx.translate(MAIN.x, MAIN.y + 30 * fan);
  ctx.rotate(MAIN.rot);
  ctx.scale(ms * Math.max(0.02, Math.abs(sx)), ms);
  if (sx >= 0) {
    L.print(ctx, mem, MAIN.w, { border: 22, bottom: 74, seed: 3 });
    ctx.font = FONT.hand(40);
    ctx.fillStyle = 'rgba(52,44,38,0.85)';
    ctx.fillText('1998 夏 · 下雨那天', -MAIN.w / 2 + 10, MAIN.w * 9 / 32 + 62);
    // 双重影像：还在，但越来越静
    const h = MAIN.w * 9 / 16;
    const still = 1 - smooth(prog(d, IN + 1, FAN));
    const ga = (0.14 + 0.12 * (0.5 + 0.5 * Math.sin(d * 2.6))) * still;
    if (ga > 0.005) {
      ctx.save();
      ctx.beginPath(); ctx.rect(-MAIN.w / 2, -h / 2, MAIN.w, h); ctx.clip();
      ctx.globalAlpha *= ga;
      ctx.drawImage(truth, -MAIN.w / 2 + 10 * still, -h / 2 - 6 * still, MAIN.w, h);
      ctx.restore();
    }
    L.stamp(ctx, '确定', MAIN.w / 2 - 170, 110, d, STAMP, { size: 80, rot: -0.1 });
  } else {
    back(ctx, MAIN.w, 74);
  }
  ctx.restore();
}

function light(d) {
  const dim = smooth(prog(d, DIM0, DIM1));
  return [{ x: 920, y: 430, rx: lerp(1100, 760, dim), ry: lerp(760, 520, dim), i: lerp(1.0, 0.62, dim), color: [255, 200, 140] }];
}
function grade() { return { warm: 0.2, ambient: 0.28 }; }

module.exports = { ...S, draw, light, grade };
