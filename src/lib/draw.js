// 铅笔线、素描椭圆、排线、打字机文字等基础笔触。
const { noise1, rng, clamp, hash } = require('./util');
const { C } = require('./style');

// 线条「呼吸」：每 0.25 秒换一次细微抖动，模拟手绘逐帧的生命感
const boilOf = (t) => Math.floor(t * 4);

function polyLength(pts) {
  let L = 0;
  for (let i = 1; i < pts.length; i++) L += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
  return L;
}

// 把折线细分并加入垂直方向的轻微抖动
function wobble(pts, seed, amp = 1.2, step = 10) {
  const out = [];
  let acc = 0;
  for (let i = 1; i < pts.length; i++) {
    const [x0, y0] = pts[i - 1], [x1, y1] = pts[i];
    const L = Math.hypot(x1 - x0, y1 - y0) || 1;
    const nx = -(y1 - y0) / L, ny = (x1 - x0) / L;
    const n = Math.max(1, Math.ceil(L / step));
    for (let k = i === 1 ? 0 : 1; k <= n; k++) {
      const f = k / n;
      const d = noise1((acc + f * L) / 37, seed) * amp;
      out.push([x0 + (x1 - x0) * f + nx * d, y0 + (y1 - y0) * f + ny * d]);
    }
    acc += L;
  }
  return out;
}

function strokePartial(ctx, pts, progress) {
  if (progress <= 0 || pts.length < 2) return;
  const total = polyLength(pts);
  let left = total * clamp(progress);
  ctx.beginPath();
  ctx.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i < pts.length; i++) {
    const [x0, y0] = pts[i - 1], [x1, y1] = pts[i];
    const L = Math.hypot(x1 - x0, y1 - y0);
    if (L >= left) {
      const f = L ? left / L : 0;
      ctx.lineTo(x0 + (x1 - x0) * f, y0 + (y1 - y0) * f);
      break;
    }
    ctx.lineTo(x1, y1);
    left -= L;
  }
  ctx.stroke();
}

// 铅笔线：两遍不同抖动叠加，透明度略有差异
function pencil(ctx, pts, o = {}) {
  const {
    seed = 1, t = 0, width = 2, color = C.graphite, alpha = 1, progress = 1,
    amp = 1.1, passes = 2, boil = true,
  } = o;
  if (alpha <= 0.002 || progress <= 0) return;
  const b = boil ? boilOf(t) : 0;
  ctx.save();
  const base = ctx.globalAlpha;
  ctx.strokeStyle = color;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  for (let p = 0; p < passes; p++) {
    ctx.lineWidth = width * (p ? 0.6 : 1);
    ctx.globalAlpha = base * alpha * (p ? 0.55 : 0.9);
    strokePartial(ctx, wobble(pts, seed * 7 + p * 131 + b * 17, amp * (p ? 1.6 : 1)), progress);
  }
  ctx.restore();
}

function line(ctx, x0, y0, x1, y1, o) { pencil(ctx, [[x0, y0], [x1, y1]], o); }

function ellipsePts(cx, cy, rx, ry, a0 = 0, a1 = Math.PI * 2, n = 72, rot = 0) {
  const pts = [];
  const cr = Math.cos(rot), sr = Math.sin(rot);
  for (let i = 0; i <= n; i++) {
    const a = a0 + (a1 - a0) * (i / n);
    const ex = Math.cos(a) * rx, ey = Math.sin(a) * ry;
    pts.push([cx + ex * cr - ey * sr, cy + ex * sr + ey * cr]);
  }
  return pts;
}

// 素描椭圆：首尾略微超出，像手画的一圈
function sketchEllipse(ctx, cx, cy, rx, ry, o = {}) {
  const r = rng(o.seed || 3);
  const start = -Math.PI / 2 + (r() - 0.5) * 0.6;
  pencil(ctx, ellipsePts(cx, cy, rx, ry, start, start + Math.PI * 2 + 0.18, 90, o.rot || 0), o);
}

function rectPts(x, y, w, h) {
  return [[x, y], [x + w, y], [x + w, y + h], [x, y + h], [x, y + 0.5]];
}

// 排线阴影：在 clip 区域内画平行斜线
function hatch(ctx, clipFn, bbox, o = {}) {
  const { angle = -0.9, gap = 9, color = C.graphiteSoft, width = 1.1, seed = 5, t = 0, alpha = 1, progress = 1 } = o;
  if (alpha <= 0.002 || progress <= 0) return;
  ctx.save();
  ctx.beginPath();
  clipFn(ctx);
  ctx.clip();
  const [bx, by, bw, bh] = bbox;
  const cx = bx + bw / 2, cy = by + bh / 2, R = Math.hypot(bw, bh) / 2 + 10;
  const dx = Math.cos(angle), dy = Math.sin(angle);
  const nx = -dy, ny = dx;
  const count = Math.floor((2 * R) / gap);
  const shown = Math.floor(count * clamp(progress));
  for (let i = 0; i < shown; i++) {
    const off = -R + i * gap;
    const px = cx + nx * off, py = cy + ny * off;
    line(ctx, px - dx * R, py - dy * R, px + dx * R, py + dy * R,
      { seed: seed + i, t, width, color, alpha, passes: 1, amp: 0.8 });
  }
  ctx.restore();
}

// 打字机文字：逐字出现，每个字墨色轻微不均、基线轻微跳动
function typeText(ctx, text, x, y, o = {}) {
  const { font, color = C.ink, progress = 1, align = 'left', seed = 11, alpha = 1, spacing = 0 } = o;
  if (alpha <= 0.002) return;
  ctx.save();
  ctx.font = font;
  ctx.textBaseline = 'alphabetic';
  const chars = [...text];
  const widths = chars.map((ch) => ctx.measureText(ch).width + spacing);
  const total = widths.reduce((a, b) => a + b, 0) - spacing;
  let px = align === 'center' ? x - total / 2 : align === 'right' ? x - total : x;
  const shown = progress >= 1 ? chars.length : Math.floor(chars.length * progress + 1e-6);
  const r = rng(seed);
  const base = ctx.globalAlpha;
  ctx.fillStyle = color;
  for (let i = 0; i < chars.length; i++) {
    const jy = (r() - 0.5) * 1.6, ja = 0.78 + r() * 0.22;
    if (i < shown) {
      ctx.globalAlpha = base * alpha * ja;
      ctx.fillText(chars[i], px, y + jy);
    }
    px += widths[i];
  }
  ctx.restore();
  return total;
}

// 手写文字：从左到右被「写」出来
function handText(ctx, text, x, y, o = {}) {
  const { font, color = C.red, progress = 1, align = 'left', alpha = 1, rot = 0 } = o;
  if (alpha <= 0.002 || progress <= 0) return;
  ctx.save();
  ctx.font = font;
  const w = ctx.measureText(text).width;
  const left = align === 'center' ? x - w / 2 : align === 'right' ? x - w : x;
  ctx.translate(left, y);
  ctx.rotate(rot);
  ctx.beginPath();
  ctx.rect(-10, -200, (w + 20) * clamp(progress), 400);
  ctx.clip();
  ctx.globalAlpha *= alpha;
  ctx.fillStyle = color;
  ctx.fillText(text, 0, 0);
  ctx.restore();
  return w;
}

// 以 (cx, cy) 为中心缩放/平移的镜头
function camera(ctx, cx, cy, scale, ox = 0, oy = 0) {
  const { W, H } = require('../config');
  ctx.translate(W / 2 + ox, H / 2 + oy);
  ctx.scale(scale, scale);
  ctx.translate(-cx, -cy);
}

module.exports = {
  pencil, line, sketchEllipse, ellipsePts, rectPts, hatch, typeText, handText, camera, wobble, polyLength, boilOf, hash,
};
