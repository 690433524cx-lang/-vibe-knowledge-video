// 核心高潮（MAIN_BEAT_T）：画面清空之后，只有一张被照亮的纸，和两个压上去的暗红大字——选对。
// 没有人物、没有小字、没有图标。只有纸纹、暗红印泥、灰白的边、一点点洇开的墨和压痕的阴影。
const { createCanvas } = require('@napi-rs/canvas');
const { W, H, DESIGN_T: D } = require('../../../src/config');
const { FONT } = require('../../../src/lib/style');
const { prog, smooth, easeOut, lerp, rng } = require('../../../src/lib/util');
const { spring } = require('../../../src/lib/motion');
const { sheetTexture } = require('../../../src/lib/material');

const S = { start: D, end: 58.6 };

// 印章字：离屏生成一次。印泥不均、边缘发灰白、纸纤维从笔画里透出来。
const STAMP = (() => {
  const px = 380;
  const c = createCanvas(1100, 560);
  const x = c.getContext('2d');
  x.font = FONT.serifBlack(px);
  x.letterSpacing = '40px';
  x.textAlign = 'center';
  x.textBaseline = 'middle';
  // 先画一层略大、偏灰白的边（印泥压出去的晕）
  x.filter = 'blur(2.2px)';
  x.fillStyle = 'rgba(150,104,92,0.5)';
  x.fillText('选对', 550, 290);
  x.filter = 'none';
  x.fillStyle = '#76201a';
  x.fillText('选对', 550, 290);
  // 印泥不均：块状的浅区 + 细小的漏白
  const r = rng(2026);
  x.globalCompositeOperation = 'destination-out';
  for (let i = 0; i < 70; i++) {
    x.fillStyle = `rgba(0,0,0,${0.08 + r() * 0.16})`;
    x.beginPath(); x.ellipse(r() * 1100, r() * 560, 20 + r() * 70, 8 + r() * 30, r() * 3, 0, Math.PI * 2); x.fill();
  }
  for (let i = 0; i < 5200; i++) {
    x.fillStyle = `rgba(0,0,0,${0.25 + r() * 0.6})`;
    x.beginPath(); x.arc(r() * 1100, r() * 560, 0.4 + r() * 1.8, 0, Math.PI * 2); x.fill();
  }
  // 干擦的横向丝
  for (let i = 0; i < 140; i++) {
    x.strokeStyle = `rgba(0,0,0,${0.2 + r() * 0.35})`;
    x.lineWidth = 0.6 + r() * 1.4;
    const yy = r() * 560, xx = r() * 1100;
    x.beginPath(); x.moveTo(xx, yy); x.lineTo(xx + 30 + r() * 90, yy + (r() - 0.5) * 3); x.stroke();
  }
  return c;
})();

// 洇开的几点暗红（很少，不做爆炸）
const BLEED = (() => {
  const r = rng(2027);
  return Array.from({ length: 9 }, () => ({ x: 960 + (r() - 0.5) * 900, y: 520 + (r() - 0.5) * 360, r: 2 + r() * 7, d: r() * 0.3 }));
})();

const paper = sheetTexture(2300, 1500, 2030, 'bone', { rough: 0 });

function draw(ctx, t) {
  const dt = t - D;
  // 整张纸铺满画面（看不到纸边），只在中间被照亮
  const push = 1 + 0.035 * smooth(prog(t, D + 1, D + 7));
  ctx.save();
  ctx.translate(W / 2, H / 2 - 20);
  ctx.scale(push, push);
  ctx.translate(-W / 2, -H / 2);
  // 第六幕接手时，这张铺满画面的纸淡出，换成一页能看到纸边的研究笔记
  ctx.save();
  ctx.globalAlpha *= 1 - smooth(prog(t, 57.2, 57.9));
  ctx.drawImage(paper.canvas, W / 2 - paper.canvas.width / 2, H / 2 - paper.canvas.height / 2);
  ctx.restore();
  // 往第六幕交接：字缩成一枚小印
  const shrink = spring(t, 56.9, 0.9, 1.0);
  const sc = lerp(1, 0.13, Math.min(1, shrink));
  const cx = lerp(960, 1668, Math.min(1, shrink)), cy = lerp(500, 330, Math.min(1, shrink));
  if (t > 57.75) { ctx.restore(); return; } // 之后由第六幕页面上的小印接手
  // 有重量地压下去：极小的回弹，不缩放进场
  const press = spring(dt, 0, 5.2, 0.9);
  const s = lerp(1.012, 1, Math.min(1, press)) * sc;
  ctx.save();
  ctx.translate(cx, cy);
  ctx.scale(s, s);
  // 压痕：纸面被压下去的阴影和高光
  ctx.globalAlpha = 0.22;
  ctx.globalCompositeOperation = 'multiply';
  ctx.drawImage(STAMP, -550 + 2.2, -290 + 2.6);
  ctx.globalCompositeOperation = 'source-over';
  ctx.globalAlpha = 1;
  ctx.drawImage(STAMP, -550, -290);
  ctx.restore();
  // 洇开的墨点
  if (shrink < 0.2) {
    for (const b of BLEED) {
      const k = easeOut(Math.min(1, Math.max(0, (dt - b.d) / 0.8)));
      if (k <= 0) continue;
      ctx.fillStyle = `rgba(128,38,28,${0.45 * (1 - shrink * 5)})`;
      ctx.beginPath(); ctx.ellipse(b.x, b.y, b.r * k, b.r * k * 0.8, 0, 0, Math.PI * 2); ctx.fill();
    }
  }
  ctx.restore();
}

function light(t) {
  const dt = t - D;
  const flick = Math.exp(-Math.max(0, dt) / 0.22) * 0.12;
  // 光只照亮中间；画面下缘保持暗，让字幕坐在暗处
  return [{ x: 960, y: 470, rx: 980, ry: 470, i: 1 + flick, w: 1 - smooth(prog(t, 57.8, 58.6)), core: 0.3 }];
}
function grade(t) { return { warm: 0.15, ambient: 0.08 }; }

module.exports = { ...S, draw, light, grade, STAMP };
