// 核心高潮（时间 T）：绷紧的线断开，一张档案页被骤然照亮，
// 「舍不得」像墨迹一样压在纸上，暗红墨点向外洇开。
// T+0.5 打出 SUNK COST，T+1.0 盖上「沉没成本」。
const { createCanvas } = require('@napi-rs/canvas');
const { W, H, DESIGN_T: D } = require('../config');
const { C, FONT } = require('../lib/style');
const { pencil, typeText } = require('../lib/draw');
const { prog, smooth, easeOut, easeIn, lerp, rng } = require('../lib/util');
const props = require('../lib/props');
const { PAGE } = require('./s4_table');
const { LINE_A, LINE_B } = require('./s5_evidence');

const S = { start: D, end: 53.6 };

// 「舍不得」墨迹字：离屏生成一次，带干笔飞白的纹理
const GLYPH = (() => {
  const size = 300;
  const c = createCanvas(1000, 380);
  const x = c.getContext('2d');
  x.font = FONT.brush(size);
  const ws = ['舍', '不', '得'].map((ch) => x.measureText(ch).width);
  const total = ws.reduce((a, b) => a + b, 0);
  const left = (1000 - total) / 2;
  x.fillStyle = '#17110e';
  x.textBaseline = 'middle';
  x.fillText('舍不得', left, 190);
  // 飞白：在笔画上挖掉细小的点和横向干笔丝
  const r = rng(808);
  x.globalCompositeOperation = 'destination-out';
  for (let i = 0; i < 2600; i++) {
    x.fillStyle = `rgba(0,0,0,${0.2 + r() * 0.5})`;
    x.beginPath();
    x.arc(r() * 1000, r() * 380, 0.4 + r() * 1.6, 0, Math.PI * 2);
    x.fill();
  }
  for (let i = 0; i < 90; i++) {
    x.strokeStyle = `rgba(0,0,0,${0.15 + r() * 0.3})`;
    x.lineWidth = 0.6 + r() * 1.2;
    const yy = r() * 380, xx = r() * 1000;
    x.beginPath(); x.moveTo(xx, yy); x.lineTo(xx + 20 + r() * 60, yy + (r() - 0.5) * 3); x.stroke();
  }
  x.globalCompositeOperation = 'source-over';

  // 找出「不」字最上面那一横（第六幕把它拉成时间轴）
  const img = x.getImageData(0, 0, 1000, 380).data;
  const gx0 = Math.floor(left + ws[0]), gx1 = Math.ceil(left + ws[0] + ws[1]);
  const rowCount = (y) => {
    let n = 0;
    for (let xx = gx0; xx < gx1; xx++) if (img[(y * 1000 + xx) * 4 + 3] > 110) n++;
    return n;
  };
  let best = 0, by = 0;
  for (let y = 20; y < 200; y++) {
    const n = rowCount(y);
    if (n > best) { best = n; by = y; }
  }
  let y0 = by, y1 = by;
  while (y0 > 0 && rowCount(y0 - 1) > best * 0.45) y0--;
  while (y1 < 379 && rowCount(y1 + 1) > best * 0.45) y1++;
  let sx0 = gx1, sx1 = gx0;
  for (let y = y0; y <= y1; y++) {
    for (let xx = gx0; xx < gx1; xx++) {
      if (img[(y * 1000 + xx) * 4 + 3] > 110) { sx0 = Math.min(sx0, xx); sx1 = Math.max(sx1, xx); }
    }
  }
  const stroke = { sx: sx0 - 4, sy: y0 - 6, sw: sx1 - sx0 + 8, sh: y1 - y0 + 12 };
  return { canvas: c, w: 1000, h: 380, stroke, total };
})();
const GLYPH_POS = { x: W / 2 - 500, y: 505 - 190 }; // 画布左上角（屏幕坐标）

// 暗红墨点：固定位置，T 后 0.7 秒内洇开
const BLOTS = (() => {
  const r = rng(77);
  const out = [];
  for (let i = 0; i < 26; i++) {
    const a = r() * Math.PI * 2;
    const rad = 330 + r() * 160;
    out.push({
      x: 960 + Math.cos(a) * rad * 1.05, y: 505 + Math.sin(a) * rad * 0.36,
      r: 2 + r() * (i < 5 ? 16 : 7), d: r() * 0.25,
    });
  }
  return out;
})();

function drawPage(ctx, a) {
  ctx.save();
  ctx.globalAlpha = a;
  ctx.translate(PAGE.x, PAGE.y);
  props.paper(ctx, PAGE.w, PAGE.h, { color: '#d9cdb1' });
  ctx.restore();
}

function drawGlyph(ctx, t, a) {
  const dt = t - D;
  const s = lerp(1.035, 1, easeOut(Math.min(1, dt / 0.14)));
  ctx.save();
  ctx.globalAlpha = a;
  ctx.translate(W / 2, 505);
  ctx.scale(s, s);
  ctx.translate(-W / 2, -505);
  ctx.drawImage(GLYPH.canvas, GLYPH_POS.x, GLYPH_POS.y);
  ctx.restore();
}

function drawBlots(ctx, t, a) {
  const dt = t - D;
  ctx.save();
  ctx.globalAlpha = a;
  ctx.filter = 'blur(1.4px)';
  for (const b of BLOTS) {
    const k = easeOut(Math.min(1, Math.max(0, (dt - b.d * 0.3) / 0.7)));
    if (k <= 0) continue;
    ctx.fillStyle = 'rgba(118,32,25,0.62)';
    ctx.beginPath();
    ctx.ellipse(b.x, b.y, b.r * k, b.r * k * 0.86, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

// 线断开：左右两半弹回、垂落、消失
function drawSnap(ctx, t) {
  const k = prog(t, D, D + 0.55);
  if (k >= 1) return;
  const mid = (LINE_A[0] + LINE_B[0]) / 2;
  const rec = easeOut(k);
  const fall = easeIn(k) * 40;
  ctx.save();
  ctx.globalAlpha = 1 - k;
  pencil(ctx, [LINE_A, [lerp(mid - 6, LINE_A[0] + 60, rec), LINE_A[1] + fall]], { seed: 701, t, width: 2.4, color: C.subRed, passes: 1, boil: false });
  pencil(ctx, [[lerp(mid + 6, LINE_B[0] - 60, rec), LINE_B[1] + fall], LINE_B], { seed: 702, t, width: 2.4, color: C.subRed, passes: 1, boil: false });
  ctx.restore();
}

// 「沉没成本」印章
function drawSeal(ctx, t, a) {
  const k = prog(t, D + 0.94, D + 1.04);
  if (k <= 0) return;
  const s = lerp(1.1, 1, easeOut(k));
  ctx.save();
  ctx.globalAlpha = a * (0.4 + 0.5 * k);
  ctx.translate(W / 2, 772);
  ctx.rotate(-0.025);
  ctx.scale(s, s);
  ctx.font = FONT.serifBlack(66);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const w = ctx.measureText('沉没成本').width + 56;
  ctx.strokeStyle = C.red;
  ctx.lineWidth = 4;
  ctx.strokeRect(-w / 2, -54, w, 108);
  ctx.lineWidth = 1.5;
  ctx.strokeRect(-w / 2 + 8, -46, w - 16, 92);
  ctx.fillStyle = C.red;
  ctx.fillText('沉没成本', 0, 4);
  // 印泥不均
  const r = rng(909);
  ctx.globalCompositeOperation = 'destination-out';
  for (let i = 0; i < 260; i++) {
    ctx.fillStyle = `rgba(0,0,0,${0.3 + r() * 0.5})`;
    ctx.beginPath();
    ctx.arc((r() - 0.5) * w, (r() - 0.5) * 108, 0.5 + r() * 1.8, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

function draw(ctx, t) {
  // 第六幕接手时：页面保留，字慢慢淡去
  const glyphA = 1 - smooth(prog(t, D + 2.2, D + 3.0));
  const textA = 1 - smooth(prog(t, D + 2.0, D + 2.6));
  if (t < D + 2.0) drawPage(ctx, 1); // 之后由第六幕接管同一张纸
  drawBlots(ctx, t, glyphA);
  drawGlyph(ctx, t, glyphA);
  drawSnap(ctx, t);
  typeText(ctx, 'S U N K   C O S T', W / 2, 680, { font: FONT.type(30), color: C.brown, progress: prog(t, D + 0.5, D + 0.85), align: 'center', seed: 711, alpha: textA });
  drawSeal(ctx, t, textA);
}

function light(t) {
  // T 瞬间灯光骤亮，随后回落到正常
  const flick = Math.exp(-Math.max(0, t - D) / 0.25) * 0.15;
  return { x: 960, y: 520, rx: 940, ry: 540, i: 1 + flick, w: 1 };
}

module.exports = { ...S, draw, light, GLYPH, GLYPH_POS, drawPage };
