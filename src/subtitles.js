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
    // 固定字幕系统里所有字幕同一位置：前一句淡出（0.22 s）以后下一句才出现
    const gap = require('./config').TL.SUB_FIXED ? 0.22 : 0.32;
    if ((require('./config').TL.SUB_FIXED || Math.abs((a.y ?? 968) - (b.y ?? 968)) < 60) && b.t < a.t + a.d + gap) a.d = Math.max(0.6, b.t - a.t - gap);
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

// ---------- 第二版：电影字幕 / 杂志排版 ----------
// 常规字重、放松字距；位置可按构图给 x / y / align；淡入时有一点「对焦」。
const V2 = {
  sub: { font: (px) => FONT.body(px), px: 48, ls: 3, color: '#e8dfcc' },
  small: { font: (px) => FONT.body(px), px: 36, ls: 3, color: '#d8ccb6' },
  hook: { font: (px) => FONT.body(px), px: 74, ls: 6, color: '#efe6d3' },
  quote: { font: (px) => FONT.body(px), px: 60, ls: 5, color: '#efe6d3' },
  emph: { font: (px) => FONT.serif(px), px: 56, ls: 4, color: '#efe6d3' },
  hand: { font: (px) => FONT.hand(px), px: 66, ls: 2, color: C.subRed },
};

function drawLineV2(ctx, s, a, k) {
  const st = V2[s.style || 'sub'] || V2.sub;
  // SUB_SCALE：普通字幕整体放大（钩子大字不受影响）
  const px = Math.round((s.size || st.px) * (s.style === 'hook' ? 1 : (require('./config').TL.SUB_SCALE ?? 1)));
  ctx.save();
  ctx.font = st.font(px);
  ctx.letterSpacing = `${st.ls}px`;
  ctx.textBaseline = 'alphabetic';
  const segs = segments(s.text);
  const widths = segs.map(([t]) => ctx.measureText(t).width);
  const total = widths.reduce((p, q) => p + q, 0);
  const align = s.align || 'center';
  let x = s.x ?? W / 2;
  if (align === 'center') x -= total / 2;
  if (align === 'right') x -= total;
  const y = (s.y ?? 962) + (1 - easeOut(k)) * 6;
  const blur = (1 - smooth(k)) * 3;
  ctx.globalAlpha = a;
  ctx.shadowColor = 'rgba(0,0,0,0.55)';
  ctx.shadowBlur = 14;
  ctx.shadowOffsetY = 2;
  if (blur > 0.2) ctx.filter = `blur(${blur.toFixed(1)}px)`;
  if (s.style === 'hand') {
    ctx.beginPath();
    ctx.rect(x - 10, y - px * 1.4, (total + 20) * Math.min(1, k * 1.5), px * 2);
    ctx.clip();
  }
  segs.forEach(([t, red], i) => {
    ctx.fillStyle = red ? C.subRed : (s.color || st.color);
    ctx.fillText(t, x, y);
    x += widths[i];
  });
  ctx.restore();
}

// ---------------- 固定字幕系统（TL.SUB_FIXED，《悲观主义》起）----------------
// 只有两级：叙述（A）与金句（B），位置固定在下方安全区、水平居中；锚词（C）在场景里画，不走字幕。
// 淡入 0.25 s、上移 6 px、停留、淡出 0.22 s；不模糊、不缩放、不逐字。
// 一句最多两行（文本里用 \n 断行），第二行压在固定基线上，第一行往上叠；底下一层很淡的暗色柔底。
const FIXED = {
  baseline: 958,                // 字幕中心约在画面底部往上 12%
  a: { px: 66, ls: 4, color: '#efe7d6' },
  b: { px: 74, ls: 5, color: '#f3ead8' },
};
function drawLineFixed(ctx, s, a, k) {
  const st = s.style === 'quote' || s.style === 'hook' ? FIXED.b : FIXED.a;
  const lines = s.text.split('\n');
  const px = st.px, lh = Math.round(px * 1.42);
  const rise = (1 - easeOut(k)) * 6;
  ctx.save();
  ctx.font = FONT.body(px);
  ctx.letterSpacing = `${st.ls}px`;
  ctx.textBaseline = 'alphabetic';
  const widths = lines.map((l) => segments(l).reduce((w, [t]) => w + ctx.measureText(t).width, 0));
  const maxW = Math.max(...widths);
  // 很淡的暗色柔底：只为在亮背景上也读得清
  const top = FIXED.baseline - px * 0.95 - (lines.length - 1) * lh;
  ctx.globalAlpha = a * 0.42;
  ctx.filter = 'blur(18px)';
  ctx.fillStyle = 'rgba(8,7,6,1)';
  ctx.fillRect(W / 2 - maxW / 2 - 40, top - 18 + rise, maxW + 80, (lines.length - 1) * lh + px * 1.3 + 36);
  ctx.filter = 'none';
  ctx.globalAlpha = a;
  ctx.shadowColor = 'rgba(0,0,0,0.75)';
  ctx.shadowBlur = 10;
  ctx.shadowOffsetY = 2;
  lines.forEach((l, i) => {
    const y = FIXED.baseline - (lines.length - 1 - i) * lh + rise;
    let x = W / 2 - widths[i] / 2;
    for (const [t, red] of segments(l)) {
      ctx.fillStyle = red ? C.subRed : st.color;
      ctx.fillText(t, x, y);
      x += ctx.measureText(t).width;
    }
  });
  ctx.restore();
}

// t 为设计时间
function drawSubtitles(ctx, t) {
  if (require('./config').TL.SUB_FIXED) {
    for (const s of SUBS) {
      const fi = 0.25, fo = 0.22;
      if (t < s.t || t > s.t + s.d + fo) continue;
      const a = smooth(prog(t, s.t, s.t + fi)) * (1 - smooth(prog(t, s.t + s.d, s.t + s.d + fo)));
      drawLineFixed(ctx, s, a, prog(t, s.t, s.t + 0.3));
    }
    return;
  }
  if (require('./config').TL.LOOK === 'v2') {
    for (const s of SUBS) {
      const fi = s.fi ?? 0.35, fo = s.fo ?? 0.35;
      if (t < s.t || t > s.t + s.d + fo) continue;
      const a = smooth(prog(t, s.t, s.t + fi)) * (1 - smooth(prog(t, s.t + s.d, s.t + s.d + fo)));
      drawLineV2(ctx, s, a, prog(t, s.t, s.t + Math.max(0.45, fi)));
    }
    return;
  }
  for (const s of SUBS) {
    const fi = s.fi ?? 0.28, fo = 0.3;
    if (t < s.t || t > s.t + s.d + fo) continue;
    const a = smooth(prog(t, s.t, s.t + fi)) * (1 - smooth(prog(t, s.t + s.d, s.t + s.d + fo)));
    drawLine(ctx, s, a, prog(t, s.t, s.t + Math.max(0.6, fi)));
  }
}

module.exports = { SUBS, drawSubtitles };
