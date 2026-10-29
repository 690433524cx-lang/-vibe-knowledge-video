// 文字层（画在 outCanvas 的 2D 上下文里，逻辑坐标 1080×1920）。每次绘制都把包围盒记下来，给 qa.js 检查安全区和重叠。
import { clamp, prog, outExpo, outBack, lerp } from './util.js';

export const FONT = '"Noto Serif CJK SC", "Noto Serif SC", serif';
export const fnt = (w, s) => `${w} ${s}px ${FONT}`;
export const SAFE = { x0: 80, x1: 900, y0: 200, y1: 1520 };
let ctx = null, boxes = [], P = null;
export function setTextCtx(c, palette) { ctx = c; P = palette; }
export function resetBoxes() { boxes = []; }
export function getBoxes() { return boxes; }
function record(id, text, x0, y0, x1, y1, alpha) { if (alpha > 0.05) boxes.push({ id, text, x0: Math.round(x0), y0: Math.round(y0), x1: Math.round(x1), y1: Math.round(y1), a: +alpha.toFixed(2) }); }

const hexA = (hex, a) => { const n = parseInt(hex.slice(1), 16); return `rgba(${n >> 16},${(n >> 8) & 255},${n & 255},${a})`; };
function metrics(text, font) {
  ctx.font = font; const m = ctx.measureText(text);
  return { w: m.width, asc: m.actualBoundingBoxAscent, desc: m.actualBoundingBoxDescent };
}
// 居中文字的 x：放不下就往左挪，保证留在安全区里
export function fitCenter(cx, w) { return clamp(cx, SAFE.x0 + w / 2, SAFE.x1 - w / 2); }

// 发光白字（召唤字幕、台词）。chars 动画：每字间隔 step 秒，每字 dur 秒用 outExpo 冲到位
export function glowLine(id, text, cx, cy, size, weight, t, t0, o = {}) {
  // 太长放不进安全区（宽 820）时自动缩小字号
  let m = metrics(text, fnt(weight, size));
  if (m.w > 816) { size = Math.floor(size * 816 / m.w); m = metrics(text, fnt(weight, size)); }
  const font = fnt(weight, size);
  const x = fitCenter(cx, m.w);
  const alpha = o.alpha ?? 1;
  if (alpha <= 0.001) return;
  const step = o.step ?? 0.035, dur = o.dur ?? 0.35;
  ctx.save();
  ctx.font = font; ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
  const chars = [...text];
  let left = x - m.w / 2, maxShown = 0;
  for (let i = 0; i < chars.length; i++) {
    const pre = ctx.measureText(chars.slice(0, i).join('')).width;
    const cw = ctx.measureText(chars[i]).width;
    const k = o.instant ? 1 : prog(t, t0 + i * step, t0 + i * step + dur);
    if (k <= 0) continue;
    const e = outExpo(k);
    const cxp = left + pre + cw / 2;
    ctx.save();
    ctx.globalAlpha *= alpha * clamp(k * 4);
    ctx.translate(cxp, cy + (1 - e) * size * 0.55);
    const s = lerp(1.45, 1, e); ctx.scale(s, s);
    // 深色投影
    ctx.shadowColor = 'rgba(0,0,0,0.85)'; ctx.shadowBlur = 10; ctx.shadowOffsetY = 4;
    ctx.fillStyle = o.color || '#FFFFFF'; ctx.fillText(chars[i], -cw / 2, 0);
    // 元素主色外发光（两遍叠加更浓）
    ctx.shadowOffsetY = 0; ctx.shadowColor = o.glow || P.primary; ctx.shadowBlur = o.blur ?? 20;
    for (let g = 0; g < (o.glowPasses ?? 2); g++) ctx.fillText(chars[i], -cw / 2, 0);
    ctx.restore();
    maxShown = Math.max(maxShown, alpha * clamp(k * 4));
  }
  ctx.restore();
  record(id, text, x - m.w / 2, cy - m.asc, x + m.w / 2, cy + m.desc, maxShown);
}

// 金属质感的星座名大字：上→下 高光色→次色→主色→暗色 渐变，2px 亮描边，6px 深色厚度层，强烈外发光，每 2.5 秒一道白色高光扫过
let sweepCanvas = null;
export function metalTitle(id, text, cx, cy, size, t, o = {}) {
  const alpha = o.alpha ?? 1; if (alpha <= 0.001) return;
  const font = fnt(900, size);
  const m = metrics(text, font);
  const scale = o.scale ?? 1;
  const x = fitCenter(cx, m.w * Math.max(1, scale));
  const top = -m.asc, bot = m.desc;
  // anchorTop：以字的上沿为缩放中心（字往下长），否则以中心缩放
  const oy = o.anchorTop ? -top * (scale - 1) : 0;
  cy += oy;
  ctx.save();
  ctx.globalAlpha *= alpha;
  ctx.translate(x, cy); ctx.scale(scale, scale);
  ctx.font = font; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  // 外发光
  ctx.shadowColor = P.primary; ctx.shadowBlur = 50; ctx.fillStyle = hexA(P.primary, 0.9);
  ctx.fillText(text, 0, 0);
  ctx.shadowBlur = 24; ctx.shadowColor = P.secondary; ctx.fillText(text, 0, 0);
  ctx.shadowBlur = 0; ctx.shadowColor = 'transparent';
  // 厚度层（向下 6px）
  for (let i = 6; i >= 1; i--) { ctx.fillStyle = i > 3 ? '#000000' : P.dark; ctx.fillText(text, 0, i); }
  // 金属渐变
  const g = ctx.createLinearGradient(0, top, 0, bot);
  g.addColorStop(0, P.highlight); g.addColorStop(0.32, P.secondary); g.addColorStop(0.62, P.primary); g.addColorStop(1, P.dark);
  ctx.fillStyle = g; ctx.fillText(text, 0, 0);
  // 2px 亮描边
  ctx.lineWidth = 2; ctx.strokeStyle = P.highlight; ctx.lineJoin = 'round'; ctx.strokeText(text, 0, 0);
  // 高光扫过：每 2.5 秒一次
  const ph = ((t - (o.t0 ?? 0)) % 2.5 + 2.5) % 2.5;
  if (ph < 0.75) {
    const W = Math.ceil(m.w + 40), H = Math.ceil(m.asc + m.desc + 40);
    if (!sweepCanvas || sweepCanvas.width < W || sweepCanvas.height < H) { sweepCanvas = document.createElement('canvas'); sweepCanvas.width = W; sweepCanvas.height = H; }
    const s = sweepCanvas.getContext('2d');
    s.setTransform(1, 0, 0, 1, 0, 0); s.globalCompositeOperation = 'source-over'; s.clearRect(0, 0, sweepCanvas.width, sweepCanvas.height);
    s.font = font; s.textAlign = 'center'; s.textBaseline = 'middle'; s.fillStyle = '#fff';
    s.fillText(text, W / 2, 20 + m.asc);
    s.globalCompositeOperation = 'source-in';
    const k = ph / 0.75, bx = lerp(-0.3 * W, 1.3 * W, k);
    const sg = s.createLinearGradient(bx - 90, 0, bx + 90, H * 0.35);
    sg.addColorStop(0, 'rgba(255,255,255,0)'); sg.addColorStop(0.5, 'rgba(255,255,255,0.95)'); sg.addColorStop(1, 'rgba(255,255,255,0)');
    s.fillStyle = sg; s.fillRect(0, 0, W, H);
    ctx.globalCompositeOperation = 'lighter';
    ctx.drawImage(sweepCanvas, 0, 0, W, H, -W / 2, -20 - m.asc, W, H);
    ctx.globalCompositeOperation = 'source-over';
  }
  ctx.restore();
  record(id, text, x - m.w / 2 * scale, cy + top * scale, x + m.w / 2 * scale, cy + (bot + 6) * scale, alpha);
}

// 小号发光标签（主星的名字）
export function label(id, text, cx, cy, size, color, alpha) {
  if (alpha <= 0.001) return;
  const font = fnt(700, size), m = metrics(text, font);
  const x = fitCenter(cx, m.w);
  ctx.save(); ctx.globalAlpha *= alpha;
  ctx.font = font; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.shadowColor = P.primary; ctx.shadowBlur = 16; ctx.fillStyle = color; ctx.fillText(text, x, cy); ctx.fillText(text, x, cy);
  ctx.restore();
  record(id, text, x - m.w / 2, cy - m.asc, x + m.w / 2, cy + m.desc, alpha);
}

// 特征词：高光色字 + 主色描边的细圆角框（半透明暗色底），从 0.5 倍弹到 1 倍（outBack）
export function traitBadge(id, text, cx, cy, t, t0, alpha = 1) {
  const k = prog(t, t0, t0 + 0.4); if (k <= 0 || alpha <= 0.001) return null;
  const font = fnt(700, 46), m = metrics(text, font);
  const padX = 26, padY = 16, w = m.w + padX * 2, h = m.asc + m.desc + padY * 2;
  const x = fitCenter(cx, w * 1.12); // 留出弹出时的超调
  const s = lerp(0.5, 1, outBack(k));
  ctx.save(); ctx.globalAlpha *= alpha * clamp(k * 3);
  ctx.translate(x, cy); ctx.scale(s, s);
  const r = h / 2;
  ctx.beginPath(); ctx.roundRect(-w / 2, -h / 2, w, h, r);
  ctx.fillStyle = hexA(P.bg, 0.55); ctx.fill();
  ctx.shadowColor = P.primary; ctx.shadowBlur = 14; ctx.lineWidth = 2; ctx.strokeStyle = P.primary; ctx.stroke();
  ctx.font = font; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.shadowColor = P.primary; ctx.shadowBlur = 18; ctx.fillStyle = P.highlight;
  ctx.fillText(text, 0, (m.asc - m.desc) / 2 - (m.asc - m.desc) / 2); ctx.fillText(text, 0, 0);
  ctx.restore();
  record(id, text, x - w / 2 * s, cy - h / 2 * s, x + w / 2 * s, cy + h / 2 * s, alpha * clamp(k * 3));
  return { x, y: cy };
}

// 冷知识：小星芒图标 + “冷知识”（次色）+ 正文（#E8E0D0），最多两行，居中
export function factBlock(id, text, cy, t, t0, alpha = 1) {
  const k = prog(t, t0, t0 + 0.35); if (k <= 0 || alpha <= 0.001) return;
  const e = outExpo(k);
  const head = '冷知识：';
  // 最多两行：两行放不下就逐步缩小字号
  let size = 34, font = fnt(500, size), lines = wrapTwo(head + text, font, 780);
  while (lines.some(l => (ctx.font = font, ctx.measureText(l).width) > 780) && size > 24) { size -= 2; font = fnt(500, size); lines = wrapTwo(head + text, font, 780); }
  const lineH = Math.round(size * 1.47);
  ctx.font = font;
  ctx.save(); ctx.globalAlpha *= alpha * clamp(k * 3);
  ctx.textBaseline = 'middle'; ctx.textAlign = 'left';
  const y0 = cy - (lines.length - 1) * lineH / 2 + (1 - e) * 30;
  let bx0 = 1e9, bx1 = -1e9, by0 = 1e9, by1 = -1e9;
  lines.forEach((ln, i) => {
    const icon = i === 0 ? 34 : 0;
    const w = ctx.measureText(ln).width + icon;
    const x = fitCenter(540, w) - w / 2;
    const y = y0 + i * lineH;
    ctx.shadowColor = 'rgba(0,0,0,0.9)'; ctx.shadowBlur = 8; ctx.shadowOffsetY = 2;
    if (i === 0) {
      drawSpark(x + 13, y, 13);
      const hw = ctx.measureText(head).width;
      ctx.fillStyle = P.secondary; ctx.fillText(head, x + icon, y);
      ctx.fillStyle = '#E8E0D0'; ctx.fillText(ln.slice(head.length), x + icon + hw, y);
    } else { ctx.fillStyle = '#E8E0D0'; ctx.fillText(ln, x, y); }
    const mm = ctx.measureText(ln);
    bx0 = Math.min(bx0, x); bx1 = Math.max(bx1, x + w); by0 = Math.min(by0, y - mm.actualBoundingBoxAscent); by1 = Math.max(by1, y + mm.actualBoundingBoxDescent);
  });
  ctx.restore();
  record(id, text, bx0, by0, bx1, by1, alpha * clamp(k * 3));
}
function drawSpark(x, y, r) {
  ctx.save(); ctx.shadowColor = P.secondary; ctx.shadowBlur = 10; ctx.shadowOffsetY = 0; ctx.fillStyle = P.secondary;
  ctx.beginPath();
  for (let i = 0; i < 8; i++) { const a = i * Math.PI / 4 - Math.PI / 2, rr = i % 2 ? r * 0.28 : r; ctx.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr); }
  ctx.closePath(); ctx.fill(); ctx.restore();
}
// 两行折行：尽量在标点后断开，两行长度接近
function wrapTwo(text, font, maxW) {
  ctx.font = font;
  if (ctx.measureText(text).width <= maxW) return [text];
  const chars = [...text];
  let best = -1, bestScore = 1e9;
  for (let i = 4; i < chars.length - 3; i++) {
    const a = chars.slice(0, i).join(''), b = chars.slice(i).join('');
    const wa = ctx.measureText(a).width, wb = ctx.measureText(b).width;
    if (wa > maxW || wb > maxW) continue;
    const punct = '，。、；：！？”'.includes(chars[i - 1]) ? 0 : 120;
    const score = Math.abs(wa - wb) + punct + ('，。、；：！？”'.includes(chars[i]) ? 500 : 0);
    if (score < bestScore) { bestScore = score; best = i; }
  }
  if (best < 0) best = Math.ceil(chars.length / 2);
  return [chars.slice(0, best).join(''), chars.slice(best).join('')];
}
