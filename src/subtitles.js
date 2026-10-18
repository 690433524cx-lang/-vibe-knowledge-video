// 字幕渲染（引擎通用）。字幕表在 videos/<名字>/subtitles.js。
// 文本中用 {…} 包住的部分以暗红强调；y / fi 可单独覆盖位置与淡入时长。
const path = require('path');
const { VIDEO_DIR } = require('./config');
const { W } = require('./config');
const { FONT, C } = require('./lib/style');
const { prog, smooth, easeOut } = require('./lib/util');

const SUBS = require(path.join(VIDEO_DIR, 'subtitles.js')).map((s) => ({ ...s }));


// 同一位置的相邻两句不交叠：前一句必须在后一句出现前完全淡出
for (let i = 0; i < SUBS.length; i++) {
  const a = SUBS[i];
  for (let j = i + 1; j < SUBS.length; j++) {
    const b = SUBS[j];
    if (Math.abs((a.y ?? 968) - (b.y ?? 968)) < 60 && b.t < a.t + a.d + 0.32) a.d = Math.max(0.6, b.t - a.t - 0.32);
  }
}

const BASE_Y = 968;

// 解析 {…} 强调片段
function segments(text) {
  const out = [];
  const re = /\{([^}]*)\}/g;
  let last = 0, m;
  while ((m = re.exec(text))) {
    if (m.index > last) out.push([text.slice(last, m.index), false]);
    out.push([m[1], true]);
    last = m.index + m[0].length;
  }
  if (last < text.length) out.push([text.slice(last), false]);
  return out;
}

function fillSegments(ctx, segs, cx, y, base, accent) {
  const widths = segs.map(([s]) => ctx.measureText(s).width);
  let x = cx - widths.reduce((a, b) => a + b, 0) / 2;
  ctx.textAlign = 'left';
  segs.forEach(([s, red], i) => {
    ctx.fillStyle = red ? accent : base;
    ctx.fillText(s, x, y);
    x += widths[i];
  });
}

function drawLine(ctx, s, a, k) {
  const style = s.style || 'sub';
  ctx.save();
  ctx.textBaseline = 'alphabetic';
  const rise = (1 - easeOut(k)) * 8;
  const segs = segments(s.text);
  if (style === 'center') {
    ctx.font = FONT.serifBlack(96);
    ctx.globalAlpha = a;
    ctx.shadowColor = 'rgba(0,0,0,0.9)';
    ctx.shadowBlur = 24;
    fillSegments(ctx, segs, W / 2, (s.y ?? 575) + rise, C.sub, C.subRed);
  } else {
    let font = FONT.serif(52), color = C.sub, y = s.y ?? BASE_Y;
    if (style === 'emph') font = FONT.serif(66);
    if (style === 'hand') { font = FONT.hand(72); color = C.subRed; }
    if (style === 'anchor') { font = FONT.brush(84); y += 6; }
    ctx.font = font;
    // 深色柔影，保证压在亮处时仍然清楚
    ctx.shadowColor = 'rgba(0,0,0,0.85)';
    ctx.shadowBlur = 18;
    ctx.globalAlpha = a;
    if (style === 'hand') {
      const w = ctx.measureText(s.text).width;
      ctx.beginPath();
      ctx.rect(W / 2 - w / 2 - 10, y - 120, (w + 20) * Math.min(1, k * 1.6), 180);
      ctx.clip();
    }
    fillSegments(ctx, segs, W / 2, y + rise, color, C.subRed);
    ctx.shadowBlur = 0;
    fillSegments(ctx, segs, W / 2, y + rise, color, C.subRed);
  }
  ctx.restore();
}

// t 为设计时间
function drawSubtitles(ctx, t) {
  for (const s of SUBS) {
    const fi = s.fi ?? 0.28, fo = 0.3;
    if (t < s.t || t > s.t + s.d + fo) continue;
    const a = smooth(prog(t, s.t, s.t + fi)) * (1 - smooth(prog(t, s.t + s.d, s.t + s.d + fo)));
    drawLine(ctx, s, a, prog(t, s.t, s.t + Math.max(0.6, fi)));
  }
}

module.exports = { SUBS, drawSubtitles };
