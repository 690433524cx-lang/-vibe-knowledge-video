// 2D 文字层：字幕、画面大字、金属标题、特征词、章节栏、出处。全部画在 outCanvas 上。
import { clamp, lerp, prog, outExpo, sine, out3, mod } from './util.js';

export const SERIF = '"Noto Serif CJK SC", serif';
export const SANS = '"Noto Sans CJK SC", sans-serif';
export const fs = (w, s) => `${w} ${s}px ${SERIF}`;
export const C = { white: '#F5F0FF', key: '#C9A8FF', neg: '#F0457A', glow: '#7C3AED', lilac: '#C9A8FF', sub2: '#B9A8D8', src: '#D8C8F5' };

let ctx = null, T = 0;
export function setCtx(c, t) { ctx = c; T = t; }

const scratch = document.createElement('canvas'); scratch.width = 2600; scratch.height = 700;
const sctx = scratch.getContext('2d');

// 金属字：白→淡紫→紫→深紫，每 3 秒扫过一道白色高光
function metalGrad(c, y0, y1) {
  const g = c.createLinearGradient(0, y0, 0, y1);
  g.addColorStop(0, '#FFFFFF'); g.addColorStop(0.38, '#E9D5FF'); g.addColorStop(0.7, '#A78BFA'); g.addColorStop(1, '#6D28D9');
  return g;
}
function sweepPhase(period = 3, dur = 0.7, offset = 0) { const u = mod(T - offset, period) / dur; return u < 1 ? sine(u) : null; }

function metalImage(text, font, size, bandX) {
  sctx.setTransform(1, 0, 0, 1, 0, 0); sctx.globalAlpha = 1; sctx.globalCompositeOperation = 'source-over';
  sctx.shadowColor = 'transparent'; sctx.shadowBlur = 0;
  sctx.font = font;
  const w = Math.ceil(sctx.measureText(text).width), pad = Math.ceil(size * 0.3);
  const cw = Math.min(scratch.width, w + pad * 2), ch = Math.min(scratch.height, Math.ceil(size * 1.5));
  sctx.clearRect(0, 0, cw + 2, ch + 2);
  sctx.textAlign = 'left'; sctx.textBaseline = 'middle';
  sctx.fillStyle = metalGrad(sctx, ch / 2 - size * 0.5, ch / 2 + size * 0.45);
  sctx.fillText(text, pad, ch / 2);
  if (bandX != null) {
    sctx.globalCompositeOperation = 'source-atop';
    sctx.save(); sctx.translate(pad + bandX, ch / 2); sctx.rotate(Math.PI / 5);
    const bw = size * 0.45, g = sctx.createLinearGradient(-bw / 2, 0, bw / 2, 0);
    g.addColorStop(0, 'rgba(255,255,255,0)'); g.addColorStop(0.5, 'rgba(255,255,255,0.85)'); g.addColorStop(1, 'rgba(255,255,255,0)');
    sctx.fillStyle = g; sctx.fillRect(-bw / 2, -ch * 2, bw, ch * 4);
    sctx.restore(); sctx.globalCompositeOperation = 'source-over';
  }
  return { w, cw, ch, pad };
}

// 通用发光文字。color 为 'metal' 时用金属渐变
export function glowText(text, x, y, font, color, o = {}) {
  const alpha = o.alpha ?? 1;
  if (alpha <= 0.003 || !text) return;
  ctx.save();
  ctx.globalAlpha *= alpha;
  ctx.font = font; ctx.textBaseline = 'middle';
  const align = o.align || 'center';
  if (o.spacing) ctx.letterSpacing = `${o.spacing}px`;
  const glow = o.glow ?? 16, glowColor = o.glowColor ?? C.glow;
  if (color === 'metal') {
    const size = o.size || parseFloat(font.match(/([\d.]+)px/)[1]);
    const w = ctx.measureText(text).width;
    const ph = o.sweep === false ? null : sweepPhase(3, 0.7, o.sweepOffset ?? 0);
    const bandX = ph == null ? null : lerp((o.sweepL ?? 0) - size, (o.sweepR ?? w) + size, ph);
    const m = metalImage(text, font, size, bandX);
    const x0 = align === 'center' ? x - m.w / 2 : align === 'right' ? x - m.w : x;
    const dx = x0 - m.pad, dy = y - m.ch / 2;
    ctx.shadowColor = 'rgba(8,2,20,0.85)'; ctx.shadowBlur = o.shadowBlur ?? 14; ctx.shadowOffsetY = 4;
    ctx.drawImage(scratch, 0, 0, m.cw, m.ch, dx, dy, m.cw, m.ch);
    ctx.shadowOffsetY = 0; ctx.shadowColor = glowColor; ctx.shadowBlur = glow;
    ctx.drawImage(scratch, 0, 0, m.cw, m.ch, dx, dy, m.cw, m.ch);
    if (o.glow2) { ctx.shadowBlur = o.glow2; ctx.drawImage(scratch, 0, 0, m.cw, m.ch, dx, dy, m.cw, m.ch); }
  } else {
    ctx.textAlign = align; ctx.fillStyle = color;
    ctx.shadowColor = 'rgba(8,2,20,0.85)'; ctx.shadowBlur = o.shadowBlur ?? 10; ctx.shadowOffsetY = 3;
    ctx.fillText(text, x, y);
    if (glow > 0) { ctx.shadowOffsetY = 0; ctx.shadowColor = glowColor; ctx.shadowBlur = glow; ctx.fillText(text, x, y); }
    if (o.glow2) { ctx.shadowBlur = o.glow2; ctx.fillText(text, x, y); }
  }
  ctx.restore();
}

// 〔紫〕…〔/紫〕 亮紫关键词、〔红〕…〔/红〕 洋红负面词
function parseMarked(s) {
  const out = []; let cur = null, i = 0;
  while (i < s.length) {
    if (s.startsWith('〔紫〕', i)) { cur = 'key'; i += 3; continue; }
    if (s.startsWith('〔红〕', i)) { cur = 'neg'; i += 3; continue; }
    if (s.startsWith('〔/紫〕', i) || s.startsWith('〔/红〕', i)) { cur = null; i += 4; continue; }
    out.push({ ch: s[i], c: cur }); i++;
  }
  return out;
}
const cache = new Map();
const parsed = s => { let v = cache.get(s); if (!v) { v = parseMarked(s); cache.set(s, v); } return v; };

// 逐字出现：每字从下方冲到位（outExpo）+ 放大淡出的发光残影；整句出齐后关键词回弹；最后淡出上移
export function staggerLine(t, text, cx, y, size, t0, t1, o = {}) {
  if (t < t0 || t > t1) return;
  const step = o.step ?? 0.03, dur = o.dur ?? 0.35, rise = o.rise ?? 12, fo = o.fadeOut ?? 0.3;
  const weight = o.weight ?? 600, maxW = o.maxW ?? 1700;
  const g = parsed(text), n = g.length;
  let sz = size, font = fs(weight, sz);
  ctx.save(); ctx.font = font;
  let ws = g.map(c => ctx.measureText(c.ch).width), tot = ws.reduce((a, b) => a + b, 0);
  if (tot > maxW) { sz = size * maxW / tot; font = fs(weight, sz); ctx.font = font; ws = g.map(c => ctx.measureText(c.ch).width); tot = ws.reduce((a, b) => a + b, 0); }
  ctx.restore();
  const tAll = t0 + (n - 1) * step + dur;
  const fp = fo > 0 ? sine(prog(t, t1 - fo, t1)) : 0;
  const left = cx - tot / 2; let x = left;
  for (let i = 0; i < n; i++) {
    const c = g[i], w = ws[i];
    const lp = o.instant ? 1 : prog(t, t0 + i * step, t0 + i * step + dur);
    const p = outExpo(lp);
    if (lp <= 0) { x += w; continue; }
    const a = clamp(lp * 2.2) * (1 - fp) * (o.alpha ?? 1);
    const yy = y + (1 - p) * rise - 8 * fp;
    let s = 1;
    if (c.c && (o.pop ?? true)) { const pp = prog(t, tAll, tAll + 0.3); if (pp > 0 && pp < 1) s = 1 + 0.12 * Math.sin(Math.PI * pp); }
    const color = c.c === 'key' ? C.key : c.c === 'neg' ? C.neg : (o.color || C.white);
    const gc = c.c === 'neg' ? '#E11D63' : C.glow;
    ctx.save(); ctx.translate(x + w / 2, yy); if (s !== 1) ctx.scale(s, s);
    if (!o.instant && lp < 1) { // 模糊残影
      ctx.save(); const k = 1 + 0.5 * (1 - p); ctx.scale(k, k);
      glowText(c.ch, 0, 0, font, color, { alpha: a * 0.45 * (1 - p), glow: 26, glowColor: gc, shadowBlur: 0 });
      ctx.restore();
    }
    if (o.metal && c.c !== 'neg') {
      glowText(c.ch, 0, 0, font, 'metal', { alpha: a, size: sz, glow: o.glow ?? 30, glowColor: gc, sweepL: -(x - left), sweepR: tot - (x - left) });
    } else {
      glowText(c.ch, 0, 0, font, color, { alpha: a, glow: c.c ? (o.keyGlow ?? 26) : (o.glow ?? 16), glowColor: gc, glow2: c.c ? 40 : 0 });
    }
    ctx.restore();
    x += w;
  }
}

// 特征词：0.6→1 回弹 + 一闪
export function tag(t, text, x, y, t0, t1, o = {}) {
  const a = ((t < t0 || t > t1) ? 0 : clamp(prog(t, t0, t0 + 0.12)) * (1 - sine(prog(t, t1 - (o.fo ?? 0.35), t1)))) * (o.alpha ?? 1);
  if (a <= 0) return;
  const p = prog(t, t0, t0 + 0.42);
  const c1 = 2.2, c3 = c1 + 1, ob = 1 + c3 * Math.pow(p - 1, 3) + c1 * Math.pow(p - 1, 2);
  const s = lerp(0.6, 1, ob);
  const flash = Math.max(0, 1 - prog(t, t0, t0 + 0.35));
  ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
  glowText(text, 0, 0, fs(600, o.size ?? 40), C.white, { alpha: a, glow: 18 + 30 * flash, glow2: 34 * (0.4 + flash) });
  ctx.restore();
}

export function source(t, text, t0, t1) {
  const a = (t < t0 || t > t1) ? 0 : Math.min(sine(prog(t, t0, t0 + 0.5)), 1 - sine(prog(t, t1 - 0.45, t1)));
  if (a <= 0) return;
  ctx.save(); ctx.font = fs(500, 32); const w = ctx.measureText(text).width; ctx.restore();
  glowText(text, 960, 128, fs(500, 32), C.src, { alpha: a, glow: 12 });
  ctx.save(); ctx.globalAlpha *= a * 0.8; ctx.strokeStyle = '#8B5CF6'; ctx.lineWidth = 1.5;
  ctx.shadowColor = C.glow; ctx.shadowBlur = 8;
  ctx.beginPath(); ctx.moveTo(960 - w / 2 - 22, 128); ctx.lineTo(960 - w / 2 - 80, 128); ctx.moveTo(960 + w / 2 + 22, 128); ctx.lineTo(960 + w / 2 + 80, 128); ctx.stroke();
  ctx.restore();
}

export function plain(text, x, y, size, color, alpha, o = {}) {
  glowText(text, x, y, fs(o.weight ?? 500, size), color, { alpha, glow: o.glow ?? 10, align: o.align, spacing: o.spacing });
}
