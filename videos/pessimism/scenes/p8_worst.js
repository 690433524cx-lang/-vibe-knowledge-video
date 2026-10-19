// 核心高潮 · MAIN_BEAT_T：四个小词一下子消失，画面中央只剩两个巨大的暗红汉字——最坏。
// 旧印刷的压痕、墙面一样粗的纸、极轻微的墨迹扩散、一次短促的震动（引擎负责）。没有爆炸、粒子、3D、故障。
// T+0.9 起字幕：真正危险的。/ 不是你想到最坏。/ 是你开始把最坏—— / 当成唯一。
// 四句字幕都读完以后（T+9.65）「最坏」缩小、淡去，交给「解释风格」那一镜。
const { createCanvas } = require('@napi-rs/canvas');
const { W, H, DESIGN_T: D } = require('../../../src/config');
const { FONT } = require('../../../src/lib/style');
const { prog, smooth, easeOut, lerp, rng } = require('../../../src/lib/util');
const { spring } = require('../../../src/lib/motion');
const { sheetTexture } = require('../../../src/lib/material');

const S = { start: D, end: D + 10.45 };
const SHRINK_T = D + 9.65;       // 「当成唯一。」读完以后

// 铅字：离屏生成一次。墨不均、边缘略发灰、纸纤维从笔画里透出来、干擦的横丝
const TYPE = (() => {
  const px = 470;
  const c = createCanvas(1300, 640);
  const x = c.getContext('2d');
  x.font = FONT.serifBlack(px);
  x.letterSpacing = '60px';
  x.textAlign = 'center';
  x.textBaseline = 'middle';
  x.filter = 'blur(2.6px)';
  x.fillStyle = 'rgba(140,90,78,0.5)';
  x.fillText('最坏', 680, 330);
  x.filter = 'none';
  x.fillStyle = '#741f19';
  x.fillText('最坏', 680, 330);
  const r = rng(6650);
  x.globalCompositeOperation = 'destination-out';
  for (let i = 0; i < 80; i++) {
    x.fillStyle = `rgba(0,0,0,${0.06 + r() * 0.14})`;
    x.beginPath(); x.ellipse(r() * 1300, r() * 640, 20 + r() * 80, 8 + r() * 34, r() * 3, 0, Math.PI * 2); x.fill();
  }
  for (let i = 0; i < 6400; i++) {
    x.fillStyle = `rgba(0,0,0,${0.22 + r() * 0.55})`;
    x.beginPath(); x.arc(r() * 1300, r() * 640, 0.4 + r() * 1.7, 0, Math.PI * 2); x.fill();
  }
  for (let i = 0; i < 170; i++) {
    x.strokeStyle = `rgba(0,0,0,${0.18 + r() * 0.3})`;
    x.lineWidth = 0.6 + r() * 1.4;
    const yy = r() * 640, xx = r() * 1300;
    x.beginPath(); x.moveTo(xx, yy); x.lineTo(xx + 30 + r() * 100, yy + (r() - 0.5) * 3); x.stroke();
  }
  return c;
})();
const BLEED = (() => { const r = rng(6651); return Array.from({ length: 10 }, () => ({ x: 960 + (r() - 0.5) * 1000, y: 500 + (r() - 0.5) * 380, r: 2 + r() * 8, d: r() * 0.4 })); })();
const PAPER = sheetTexture(2300, 1500, 6652, 'bone', { rough: 0 });

function draw(ctx, t) {
  const dt = t - D;
  const push = 1 + 0.04 * smooth(prog(t, D + 1, SHRINK_T));
  const shrink = Math.min(1, spring(t, SHRINK_T, 0.85, 1.0));
  ctx.save();
  ctx.translate(W / 2, H / 2 - 20);
  ctx.scale(push, push);
  ctx.translate(-W / 2, -H / 2);
  ctx.save();
  ctx.globalAlpha *= 1 - smooth(prog(t, SHRINK_T + 0.3, SHRINK_T + 0.9));
  ctx.drawImage(PAPER.canvas, W / 2 - PAPER.canvas.width / 2, H / 2 - PAPER.canvas.height / 2);
  ctx.restore();
  ctx.restore();
  const fade = smooth(prog(t, SHRINK_T + 0.15, SHRINK_T + 0.7));
  if (fade >= 1) return;
  const press = spring(dt, 0, 5.6, 0.92);
  const sc = lerp(1, 0.45, shrink) * lerp(1.01, 1, Math.min(1, press)) * lerp(push, 1, shrink);
  const cx = 960, cy = 490;
  ctx.save();
  ctx.globalAlpha *= 1 - fade;
  ctx.translate(cx, cy);
  ctx.scale(sc, sc);
  // 压痕：纸被压下去的阴影
  ctx.globalAlpha = 0.24;
  ctx.globalCompositeOperation = 'multiply';
  ctx.drawImage(TYPE, -680 + 2.4, -330 + 2.8);
  ctx.globalCompositeOperation = 'source-over';
  ctx.globalAlpha = 1;
  ctx.drawImage(TYPE, -680, -330);
  ctx.restore();
  if (shrink < 0.2) {
    for (const b of BLEED) {
      const k = easeOut(Math.min(1, Math.max(0, (dt - b.d) / 0.9)));
      if (k <= 0) continue;
      ctx.fillStyle = `rgba(124,36,26,${0.42 * (1 - shrink * 5)})`;
      ctx.beginPath(); ctx.ellipse(b.x, b.y, b.r * k, b.r * k * 0.8, 0, 0, Math.PI * 2); ctx.fill();
    }
  }
}

function light(t) {
  const dt = t - D;
  const flick = Math.exp(-Math.max(0, dt) / 0.22) * 0.12;
  return [{ x: 960, y: 470, rx: 1000, ry: 480, i: 1 + flick, w: 1 - smooth(prog(t, SHRINK_T + 0.4, SHRINK_T + 1.0)), core: 0.3 }];
}
function grade() { return { warm: 0.12, ambient: 0.08 }; }

module.exports = { ...S, draw, light, grade, SHRINK_T };
