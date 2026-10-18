// 第六幕 · 解释：「不」字最上面那一横被拉长成时间轴：过去 / 现在 / 未来。
// 钱、时间、感情、努力都落在「过去」。「回不来。」时，过去整段变灰、往下沉（沉没）。
// 然后几根暗红细线从沉下去的旧物里伸出来，把「现在」的指针往回拽。
const { W, H, DESIGN_T: D } = require('../config');
const { C, FONT } = require('../lib/style');
const { pencil, typeText } = require('../lib/draw');
const { prog, smooth, easeInOut, easeOut, lerp } = require('../lib/util');
const props = require('../lib/props');
const { GLYPH, GLYPH_POS, drawPage } = require('./sx_climax');

const S = { start: D + 2.0, end: 65.6 };

const LY = 440;                 // 时间轴高度
const X0 = 440, X1 = 1480;      // 时间轴两端
const NOW = 1150;               // 「现在」
const SPLIT = (NOW - 10 - X0) / (X1 - X0);
const ITEMS = [
  { kind: 'ticket', x: 540, at: 52.6, label: '钱' },
  { kind: 'clock', x: 700, at: 53.9, label: '时间' },
  { kind: 'photo', x: 855, at: 55.2, label: '感情' },
  { kind: 'pencil', x: 1010, at: 56.0, label: '努力' },
];
const IY = 530;

// 沉没：58.2 起过去整段往下沉、变灰
const sinkK = (t) => easeInOut(prog(t, 58.2, 59.5));
const OUT = (t) => 1 - smooth(prog(t, 64.4, 65.2));

// 笔画 → 时间轴的目标矩形
function strokeRect(t) {
  const st = GLYPH.stroke;
  const k = easeInOut(prog(t, 52.4, 53.5));
  const from = { x: GLYPH_POS.x + st.sx, y: GLYPH_POS.y + st.sy, w: st.sw, h: st.sh };
  const to = { x: X0, y: LY - 6, w: X1 - X0, h: 12 };
  return {
    x: lerp(from.x, to.x, k), y: lerp(from.y, to.y, k), w: lerp(from.w, to.w, k), h: lerp(from.h, to.h, k), k,
  };
}

function drawAxis(ctx, t, part, a) {
  const r = strokeRect(t);
  const st = GLYPH.stroke;
  ctx.save();
  ctx.globalAlpha = a;
  if (part === 'all' || r.k < 1) {
    ctx.drawImage(GLYPH.canvas, st.sx, st.sy, st.sw, st.sh, r.x, r.y, r.w, r.h);
  } else if (part === 'past') {
    ctx.drawImage(GLYPH.canvas, st.sx, st.sy, st.sw * SPLIT, st.sh, r.x, r.y, r.w * SPLIT, r.h);
  } else {
    const f = (NOW + 10 - X0) / (X1 - X0);
    ctx.drawImage(GLYPH.canvas, st.sx + st.sw * f, st.sy, st.sw * (1 - f), st.sh, r.x + r.w * f, r.y, r.w * (1 - f), r.h);
  }
  ctx.restore();
}

function drawItems(ctx, t, a) {
  for (const it of ITEMS) {
    const k = smooth(prog(t, it.at, it.at + 0.5));
    if (k <= 0) continue;
    ctx.save();
    ctx.globalAlpha *= a * k;
    ctx.translate(it.x, IY + (1 - easeOut(k)) * -14);
    if (it.kind === 'ticket') { ctx.rotate(-0.05); props.ticket(ctx, 160, 66, { t }); }
    if (it.kind === 'clock') props.clock(ctx, 42, { t });
    if (it.kind === 'photo') { ctx.rotate(0.05); props.photo(ctx, 116, 90, { t, crease: false }); }
    if (it.kind === 'pencil') props.pencilIcon(ctx, 120, { t });
    ctx.restore();
    ctx.save();
    ctx.globalAlpha *= a * k;
    ctx.font = FONT.serif(30);
    ctx.fillStyle = C.brown;
    ctx.textAlign = 'center';
    ctx.fillText(it.label, it.x, IY + 92);
    ctx.restore();
  }
  // 括起来：「它们有一个共同点。」
  pencil(ctx, [[455, IY + 112], [455, IY + 126], [1080, IY + 126], [1080, IY + 112]],
    { seed: 620, t, width: 1.6, color: C.graphite, alpha: a, progress: prog(t, 56.8, 57.5) });
  pencil(ctx, [[768, IY + 126], [768, IY + 140]], { seed: 621, t, width: 1.6, color: C.graphite, alpha: a, progress: prog(t, 57.4, 57.6) });
}

function drawLabels(ctx, t, a) {
  const k = smooth(prog(t, 53.3, 53.9)) * a;
  if (k <= 0) return;
  ctx.save();
  ctx.globalAlpha = k;
  ctx.textAlign = 'center';
  ctx.font = FONT.serif(32);
  ctx.fillStyle = C.ink;
  ctx.fillText('过去', 770, LY - 40);
  ctx.fillText('未来', 1330, LY - 40);
  ctx.font = FONT.type(16);
  ctx.fillStyle = C.gray;
  ctx.fillText('PAST', 770, LY - 84);
  ctx.fillText('FUTURE', 1330, LY - 84);
  ctx.restore();
}

// 「现在」指针：暗红；被线往回拽时向过去倾斜
function drawNow(ctx, t, a) {
  const k = smooth(prog(t, 53.4, 53.9)) * a;
  if (k <= 0) return;
  const tilt = -0.34 * easeInOut(prog(t, 63.2, 64.3));
  ctx.save();
  ctx.globalAlpha = k;
  ctx.translate(NOW, LY + 4);
  ctx.rotate(tilt);
  pencil(ctx, [[0, 0], [0, -86]], { seed: 630, t, width: 3, color: C.red, passes: 1 });
  ctx.fillStyle = C.red;
  ctx.beginPath(); ctx.moveTo(-9, -86); ctx.lineTo(9, -86); ctx.lineTo(0, -70); ctx.closePath(); ctx.fill();
  ctx.font = FONT.serif(32);
  ctx.textAlign = 'center';
  ctx.fillText('现在', 0, -100);
  ctx.font = FONT.type(16);
  ctx.fillStyle = C.gray;
  ctx.fillText('NOW', 0, -142);
  ctx.restore();
  return tilt;
}

// 暗红细线：从沉下去的旧物伸向「现在」的指针顶端
function drawThreads(ctx, t, a, sink) {
  const p = prog(t, 61.4, 62.7);
  if (p <= 0) return;
  const tilt = -0.34 * easeInOut(prog(t, 63.2, 64.3));
  const top = [NOW + Math.sin(tilt) * 70, LY + 4 - Math.cos(tilt) * 70];
  const tight = easeInOut(prog(t, 63.2, 64.3));
  ITEMS.forEach((it, i) => {
    const from = [it.x, IY - 40 + sink];
    const ctrl = [lerp((from[0] + top[0]) / 2, (from[0] + top[0]) / 2, tight), lerp(from[1] - 160 + i * 18, (from[1] + top[1]) / 2, tight)];
    const pts = [];
    for (let k = 0; k <= 24; k++) {
      const f = k / 24;
      pts.push([
        (1 - f) * (1 - f) * from[0] + 2 * f * (1 - f) * ctrl[0] + f * f * top[0],
        (1 - f) * (1 - f) * from[1] + 2 * f * (1 - f) * ctrl[1] + f * f * top[1],
      ]);
    }
    pencil(ctx, pts, { seed: 640 + i, t, width: 1.5, color: C.redSoft, alpha: a, progress: Math.min(1, p * 1.3 - i * 0.1), passes: 1 });
  });
}

function draw(ctx, t) {
  const out = OUT(t);
  drawPage(ctx, out);
  const sink = sinkK(t) * 38;
  const r = strokeRect(t);
  if (r.k < 1) {
    drawAxis(ctx, t, 'all', 1);
  } else {
    // 过去：沉下去、变灰
    ctx.save();
    ctx.translate(0, sink);
    ctx.globalAlpha = out * (1 - sinkK(t) * 0.45);
    if (sinkK(t) > 0) ctx.filter = `grayscale(${sinkK(t).toFixed(2)})`;
    drawAxis(ctx, t, 'past', 1);
    drawItems(ctx, t, 1);
    ctx.restore();
    // 未来那一段留到最后，交给第七幕长成道路
    drawAxis(ctx, t, 'future', out);
    // 过去与现在之间的「水面」
    const wk = prog(t, 58.9, 59.8);
    if (wk > 0) {
      const pts = [];
      for (let x = X0 - 10; x <= NOW - 20; x += 12) pts.push([x, LY + 14 + Math.sin(x / 26 + t * 1.5) * 2.5]);
      pencil(ctx, pts, { seed: 650, t, width: 1.4, color: 'rgba(70,92,104,0.55)', alpha: out, progress: wk, passes: 1 });
    }
  }
  drawLabels(ctx, t, out);
  drawNow(ctx, t, out);
  drawThreads(ctx, t, out, sink);

  // 「回不来。」——写在沉下去的过去下面
  const hk = smooth(prog(t, 58.2, 58.6)) * (1 - smooth(prog(t, 60.4, 61.2)) * 0.6) * out;
  if (hk > 0) {
    ctx.save();
    ctx.globalAlpha = hk;
    ctx.font = FONT.serifBlack(88);
    ctx.fillStyle = C.ink;
    ctx.textAlign = 'center';
    ctx.fillText('回不来。', 790, 800);
    ctx.restore();
  }
}

function light(t) {
  return { x: 960, y: 520, rx: 940, ry: 540, i: 1, w: 1 - smooth(prog(t, 64.6, 65.4)) };
}

module.exports = { ...S, draw, light, LY, NOW, X1 };
