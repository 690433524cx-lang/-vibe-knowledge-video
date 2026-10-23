// 第一幕 · 0.0–4.75 秒：深夜桌面上的一张旧照片。
//   第 0 帧：台灯下的照片 + 下方两行大字钩子，完整可读。
//   照片上叠着错位的「第二版本」：同一张照片轻微偏移，外套在红和藏青之间呼吸——记忆正在出现偏差。
//   2.6 s 一次明显的「对不齐」；3.7 s 起镜头推进照片，直到照片充满画面（接第二幕）。
const L = require('../lib');
const { W, H, FONT, rng, noise1, lerp, clamp, prog, smooth } = L;

const S = { start: 0, end: 4.75 };
const PUSH0 = 3.7, PUSH1 = 4.7;
const PW = 780;                 // 照片影像宽度（桌面上）
const P0 = { x: 960, y: 418, rot: -0.032 };

const ease = (k) => (k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2);
function photoRect(d) {
  const k = ease(prog(d, PUSH0, PUSH1));
  const drift = (1 - k) * (d * 4);
  return {
    x: lerp(P0.x, W / 2, k), y: lerp(P0.y - drift * 0.4, H / 2, k),
    w: lerp(PW + d * 9, W, k), rot: lerp(P0.rot, 0, k), k,
  };
}

function draw(ctx, d) {
  const mem = L.snapshot(1, 'memory');
  const truth = L.snapshot(0, 'photo');
  const R = photoRect(d);
  // 桌面上压在下面的另一张旧照片和一支铅笔
  const under = 1 - R.k;
  if (under > 0.01) {
    ctx.save();
    ctx.globalAlpha = under;
    ctx.translate(1480, 700);
    ctx.rotate(0.16);
    L.print(ctx, truth, 420, { border: 16, seed: 9, shadow: 0.8 });
    ctx.fillStyle = 'rgba(12,9,7,0.55)';
    ctx.fillRect(-240, -140, 480, 290);
    ctx.restore();
    ctx.save();
    ctx.globalAlpha = under;
    ctx.translate(330, 250);
    ctx.rotate(0.5);
    ctx.fillStyle = '#6e5233'; ctx.fillRect(-170, -7, 300, 14);
    ctx.fillStyle = '#d8c6a2'; ctx.beginPath(); ctx.moveTo(130, -7); ctx.lineTo(166, 0); ctx.lineTo(130, 7); ctx.fill();
    ctx.fillStyle = '#2a2420'; ctx.beginPath(); ctx.moveTo(156, -2); ctx.lineTo(166, 0); ctx.lineTo(156, 2); ctx.fill();
    ctx.restore();
  }

  ctx.save();
  ctx.translate(R.x, R.y);
  ctx.rotate(R.rot);
  const border = 22 * (1 - R.k), bottom = 74 * (1 - R.k);
  L.print(ctx, mem, R.w, { border, bottom, seed: 3, shadow: 1 - R.k });
  // 白边上的手写
  if (R.k < 0.6) {
    ctx.save();
    ctx.globalAlpha = 1 - R.k / 0.6;
    ctx.font = FONT.hand(40);
    ctx.fillStyle = 'rgba(52,44,38,0.85)';
    ctx.fillText('1998 夏 · 下雨那天', -R.w / 2 + 10, R.w * 9 / 32 + 62);
    ctx.restore();
  }
  // 第二个版本：同一张照片，错位、半透明，在「记忆」上呼吸
  const h = R.w * 9 / 16;
  const slip = smooth(prog(d, 2.55, 2.75)) * (1 - smooth(prog(d, 2.95, 3.45)));
  const breathe = 0.5 + 0.5 * Math.sin(d * 2.6 - 1.2);
  const ga = (0.2 + 0.2 * breathe + 0.25 * slip) * (1 - smooth(prog(d, PUSH0 + 0.4, PUSH1)));
  const ox = (10 + 26 * slip) * (R.w / PW), oy = (-6 - 10 * slip) * (R.w / PW);
  ctx.save();
  ctx.beginPath(); ctx.rect(-R.w / 2, -h / 2, R.w, h); ctx.clip();
  ctx.globalAlpha = ga;
  ctx.drawImage(truth, -R.w / 2 + ox, -h / 2 + oy, R.w, h);
  // 对不齐的那一下：一条横向的错层
  if (slip > 0.02) {
    const y0 = -h / 2 + h * 0.48, bh = h * 0.12;
    ctx.globalAlpha = 0.8 * slip;
    ctx.drawImage(truth, 0, (y0 + h / 2) / h * H, W, bh / h * H, -R.w / 2 + ox * 2.4, y0, R.w, bh);
  }
  ctx.restore();
  ctx.restore();
}

function light(d) {
  const k = ease(prog(d, PUSH0, PUSH1));
  return [
    { x: lerp(900, 960, k), y: lerp(420, 540, k), rx: lerp(980, 1500, k), ry: lerp(700, 1000, k), i: 1.0, color: [255, 200, 140] },
  ];
}
function grade() { return { warm: 0.22, ambient: 0.3 }; }

module.exports = { ...S, draw, light, grade };
