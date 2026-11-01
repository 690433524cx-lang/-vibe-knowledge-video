// 2D 文字层：字幕、画面大字、金属标题、特征词、出处、问题标题。坐标一律按 1080×1920 书写。
// 颜色随配色变化：C 由导演每帧更新。所有绘制都用 ctx.globalAlpha *= alpha。
import { clamp, lerp, prog, outExpo, sine, mod } from './util.js';

export const SERIF = '"Noto Serif CJK SC", serif';
export const fs = (w, s) => `${w} ${s}px ${SERIF}`;
export const C = { text: '#F4F3F8', key: '#E8E8F0', neg: '#E8E8F0', glow: '#B8B4CC', gold: '#FFD27A', metal: 'pride' };
// 安全区
// 文字距画面边缘至少 60px
export const SAFE = { x0: 60, x1: 1860, y0: 60, y1: 1020 };
export const CX = 960;

let ctx = null, T = 0;
export function setCtx(c, t) { ctx = c; T = t; }
export const getCtx = () => ctx;

// 记录本帧画出的每段文字的包围盒（供 qa.js 检查安全区与重叠）
export const BOXES = [];
function box(x0, y0, x1, y1, label, alpha) { if (alpha > 0.15) BOXES.push({ x0, y0, x1, y1, label, alpha }); }

const scratch = document.createElement('canvas'); scratch.width = 1800; scratch.height = 500;
const sctx = scratch.getContext('2d');

// 金属字渐变（自上而下）
const METAL = {
  pride: { stops: ['#FFFFFF', '#E9D5FF', '#A78BFA', '#6D28D9'], at: [0, 0.38, 0.7, 1], stroke: null, thick: null, period: 3 },
  envy: { stops: ['#F0FFF5', '#A7F3C9', '#3DDC84', '#0B3A22'], at: [0, 0.35, 0.68, 1], stroke: '#A7F3C9', thick: '#03140B', period: 2.5 },
};
function sweepPhase(period, dur = 0.7, offset = 0) { const u = mod(T - offset, period) / dur; return u < 1 ? sine(u) : null; }

function metalImage(text, font, size, bandX, M) {
  sctx.setTransform(1, 0, 0, 1, 0, 0); sctx.globalAlpha = 1; sctx.globalCompositeOperation = 'source-over';
  sctx.shadowColor = 'transparent'; sctx.shadowBlur = 0; sctx.font = font;
  const w = Math.ceil(sctx.measureText(text).width), pad = Math.ceil(size * 0.3);
  const cw = Math.min(scratch.width, w + pad * 2), ch = Math.min(scratch.height, Math.ceil(size * 1.5));
  sctx.clearRect(0, 0, scratch.width, scratch.height);
  sctx.textAlign = 'left'; sctx.textBaseline = 'middle';
  // 厚度层：向下错开 6px 的深色字
  if (M.thick) { sctx.fillStyle = M.thick; for (let k = 1; k <= 6; k++) sctx.fillText(text, pad, ch / 2 + k); }
  const g = sctx.createLinearGradient(0, ch / 2 - size * 0.5, 0, ch / 2 + size * 0.45);
  M.stops.forEach((c, i) => g.addColorStop(M.at[i], c));
  sctx.fillStyle = g; sctx.fillText(text, pad, ch / 2);
  if (M.stroke) { sctx.lineWidth = 2; sctx.strokeStyle = M.stroke; sctx.strokeText(text, pad, ch / 2); }
  if (bandX != null) {
    sctx.globalCompositeOperation = 'source-atop';
    sctx.save(); sctx.translate(pad + bandX, ch / 2); sctx.rotate(Math.PI / 5);
    const bw = size * 0.45, gg = sctx.createLinearGradient(-bw / 2, 0, bw / 2, 0);
    gg.addColorStop(0, 'rgba(255,255,255,0)'); gg.addColorStop(0.5, 'rgba(255,255,255,0.9)'); gg.addColorStop(1, 'rgba(255,255,255,0)');
    sctx.fillStyle = gg; sctx.fillRect(-bw / 2, -ch * 2, bw, ch * 4);
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
  const glow = o.glow ?? 16, glowColor = o.glowColor ?? C.glow;
  if (color === 'metal') {
    const M = METAL[o.metal ?? C.metal];
    const size = o.size || parseFloat(font.match(/([\d.]+)px/)[1]);
    const w = ctx.measureText(text).width;
    const ph = o.sweep === false ? null : sweepPhase(M.period, 0.7, o.sweepOffset ?? 0);
    const bandX = ph == null ? null : lerp((o.sweepL ?? 0) - size, (o.sweepR ?? w) + size, ph);
    const m = metalImage(text, font, size, bandX, M);
    const x0 = align === 'center' ? x - m.w / 2 : align === 'right' ? x - m.w : x;
    const dx = x0 - m.pad, dy = y - m.ch / 2;
    ctx.shadowColor = 'rgba(0,0,0,0.85)'; ctx.shadowBlur = o.shadowBlur ?? 14; ctx.shadowOffsetY = 4;
    ctx.drawImage(scratch, 0, 0, m.cw, m.ch, dx, dy, m.cw, m.ch);
    ctx.shadowOffsetY = 0; ctx.shadowColor = glowColor; ctx.shadowBlur = glow;
    ctx.drawImage(scratch, 0, 0, m.cw, m.ch, dx, dy, m.cw, m.ch);
    if (o.glow2) { ctx.shadowBlur = o.glow2; ctx.drawImage(scratch, 0, 0, m.cw, m.ch, dx, dy, m.cw, m.ch); }
    if (!o.nobox) box(x0, y - size * 0.55, x0 + m.w, y + size * 0.55, text, alpha);
  } else {
    ctx.textAlign = align; ctx.fillStyle = color;
    ctx.shadowColor = 'rgba(0,0,0,0.85)'; ctx.shadowBlur = o.shadowBlur ?? 10; ctx.shadowOffsetY = 3;
    ctx.fillText(text, x, y);
    if (glow > 0) { ctx.shadowOffsetY = 0; ctx.shadowColor = glowColor; ctx.shadowBlur = glow; ctx.fillText(text, x, y); }
    if (o.glow2) { ctx.shadowBlur = o.glow2; ctx.fillText(text, x, y); }
    if (!o.nobox) {
      const w = ctx.measureText(text).width, size = parseFloat(font.match(/([\d.]+)px/)[1]);
      const x0 = align === 'center' ? x - w / 2 : align === 'right' ? x - w : x;
      box(x0, y - size * 0.55, x0 + w, y + size * 0.55, text, alpha);
    }
  }
  ctx.restore();
}

// 标记：〔亮〕中性关键词（亮色）〔毒〕负面关键词（毒绿/洋红）〔金〕「别人」的暖金色；〔紫〕〔红〕为傲慢的旧写法
const MARKS = { '〔亮〕': 'key', '〔紫〕': 'key', '〔毒〕': 'neg', '〔红〕': 'neg', '〔金〕': 'gold' };
function parseMarked(s) {
  const out = []; let cur = null, i = 0;
  while (i < s.length) {
    const m = Object.keys(MARKS).find(k => s.startsWith(k, i));
    if (m) { cur = MARKS[m]; i += 3; continue; }
    if (s[i] === '〔' && s[i + 1] === '/') { cur = null; i += 4; continue; }
    out.push({ ch: s[i], c: cur }); i++;
  }
  return out;
}
export const plainText = s => parseMarked(s).map(g => g.ch).join('').replace('\n', '');
const cache = new Map();
const parsed = s => { let v = cache.get(s); if (!v) { v = parseMarked(s); cache.set(s, v); } return v; };

// 按最大宽度断行：优先在标点之后断开，尽量让各行等长
const BREAK_AFTER = '，。：；、？！——」';
function layoutLines(g, ws, maxW) {
  const nl = g.findIndex(c => c.ch === '\n');
  if (nl >= 0) return [[0, nl], [nl + 1, g.length]];
  const tot = ws.reduce((a, b) => a + b, 0);
  if (tot <= maxW) return [[0, g.length]];
  const nLines = Math.ceil(tot / maxW);
  const lines = []; let start = 0;
  for (let L = 0; L < nLines - 1; L++) {
    const remain = ws.slice(start).reduce((a, b) => a + b, 0), target = remain / (nLines - L);
    let acc = 0, best = -1, bestScore = Infinity;
    for (let i = start; i < g.length - 1; i++) {
      acc += ws[i];
      if (acc > maxW) break;
      const punct = BREAK_AFTER.includes(g[i].ch) && !BREAK_AFTER.includes(g[i + 1].ch);
      const inWord = g[i].c && g[i + 1].c === g[i].c; // 不拆开同一个关键词
      const score = Math.abs(acc - target) - (punct ? maxW * 0.22 : 0) + (inWord ? maxW : 0) + ('，。：；、？！」'.includes(g[i + 1].ch) ? maxW * 2 : 0);
      if (score < bestScore) { bestScore = score; best = i; }
    }
    if (best < 0) best = start;
    lines.push([start, best + 1]); start = best + 1;
  }
  lines.push([start, g.length]);
  return lines;
}

// 逐字出现：每字从下方冲到位（outExpo）+ 发光残影；整句出齐后关键词回弹；最后淡出上移。超宽时自动断成多行。
export function staggerLine(t, text, cx, y, size, t0, t1, o = {}) {
  if (t < t0 || t > t1) return;
  const step = o.step ?? 0.03, dur = o.dur ?? 0.35, rise = o.rise ?? 12, fo = o.fadeOut ?? 0.3;
  const weight = o.weight ?? 600, maxW = o.maxW ?? 1700, lh = o.lineH ?? 1.32;
  const g = parsed(text), n = g.length;
  const font = fs(weight, size);
  ctx.save(); ctx.font = font; const ws = g.map(c => c.ch === '\n' ? 0 : ctx.measureText(c.ch).width); ctx.restore();
  const lines = layoutLines(g, ws, maxW);
  const tAll = t0 + (n - 1) * step + dur;
  const fp = fo > 0 ? sine(prog(t, t1 - fo, t1)) : 0;
  const scale = o.scale ?? 1;
  lines.forEach(([a, b], li) => {
    const lw = ws.slice(a, b).reduce((p, q) => p + q, 0);
    const ly = y + li * size * lh;
    const left = cx - lw / 2; let x = left;
    let seen = 0;
    for (let i = a; i < b; i++) {
      const c = g[i], w = ws[i];
      const lp = o.instant ? 1 : prog(t, t0 + i * step, t0 + i * step + dur);
      const p = outExpo(lp);
      if (lp <= 0) { x += w; continue; }
      seen = Math.max(seen, lp);
      const al = clamp(lp * 2.2) * (1 - fp) * (o.alpha ?? 1);
      const yy = ly + (1 - p) * rise - 8 * fp;
      let s = scale;
      if (c.c && (o.pop ?? true)) { const pp = prog(t, tAll, tAll + 0.3); if (pp > 0 && pp < 1) s *= 1 + 0.12 * Math.sin(Math.PI * pp); }
      const color = c.c === 'key' ? C.key : c.c === 'neg' ? C.neg : c.c === 'gold' ? C.gold : (o.color || C.text);
      const gc = c.c === 'gold' ? '#E8A93A' : (o.glowColor || C.glow);
      ctx.save(); ctx.translate(cx + (x + w / 2 - cx) * scale, yy); if (s !== 1) ctx.scale(s, s);
      if (!o.instant && lp < 1) {
        ctx.save(); const k = 1 + 0.5 * (1 - p); ctx.scale(k, k);
        glowText(c.ch, 0, 0, font, color, { alpha: al * 0.45 * (1 - p), glow: 26, glowColor: gc, shadowBlur: 0, nobox: true });
        ctx.restore();
      }
      if (o.metal && !c.c) {
        glowText(c.ch, 0, 0, font, 'metal', { alpha: al, size, glow: o.glow ?? 30, glowColor: gc, sweepL: -(x - left), sweepR: lw - (x - left), nobox: true });
      } else {
        glowText(c.ch, 0, 0, font, color, { alpha: al, glow: c.c ? (o.keyGlow ?? 26) : (o.glow ?? 16), glowColor: gc, glow2: c.c ? 40 : (o.glow2 ?? 0), nobox: true });
      }
      ctx.restore();
      x += w;
    }
    if (seen > 0) box(cx - lw * scale / 2, ly - size * scale * 0.55, cx + lw * scale / 2, ly + size * scale * 0.55, plainText(text), (o.alpha ?? 1) * (1 - fp));
  });
}

// 特征词：0.6→1 回弹 + 一闪
export function tag(t, text, x, y, t0, t1, o = {}) {
  const a = ((t < t0 || t > t1) ? 0 : clamp(prog(t, t0, t0 + 0.12)) * (1 - sine(prog(t, t1 - (o.fo ?? 0.35), t1)))) * (o.alpha ?? 1);
  if (a <= 0) return;
  const p = prog(t, t0, t0 + 0.42);
  const c1 = 2.2, c3 = c1 + 1, ob = 1 + c3 * Math.pow(p - 1, 3) + c1 * Math.pow(p - 1, 2);
  const s = lerp(0.6, 1, ob);
  const flash = Math.max(0, 1 - prog(t, t0, t0 + 0.35));
  const size = o.size ?? 44, align = o.align ?? 'center';
  ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
  glowText(text, 0, 0, fs(700, size), o.color ?? C.key, { alpha: a, glow: 18 + 30 * flash, glow2: 34 * (0.4 + flash), align, nobox: true });
  ctx.restore();
  ctx.save(); ctx.font = fs(700, size); const w = ctx.measureText(text).width; ctx.restore();
  const x0 = align === 'center' ? x - w / 2 : align === 'right' ? x - w : x;
  box(x0, y - size * 0.55, x0 + w, y + size * 0.55, text, a);
}

// 出处：一行小字，两侧细线
export function source(t, text, t0, t1, y = 128) {
  const a = (t < t0 || t > t1) ? 0 : Math.min(sine(prog(t, t0, t0 + 0.5)), 1 - sine(prog(t, t1 - 0.45, t1)));
  if (a <= 0) return;
  ctx.save(); ctx.font = fs(500, 32); const w = ctx.measureText(text).width; ctx.restore();
  glowText(text, CX, y, fs(500, 32), C.key, { alpha: a * 0.92, glow: 12 });
  const L = 58;
  if (L > 8) {
    ctx.save(); ctx.globalAlpha *= a * 0.8; ctx.strokeStyle = C.key; ctx.lineWidth = 1.5;
    ctx.shadowColor = C.glow; ctx.shadowBlur = 8;
    ctx.beginPath(); ctx.moveTo(CX - w / 2 - 18, y); ctx.lineTo(CX - w / 2 - 18 - L, y); ctx.moveTo(CX + w / 2 + 18, y); ctx.lineTo(CX + w / 2 + 18 + L, y); ctx.stroke();
    ctx.restore();
  }
}

export function plain(text, x, y, size, color, alpha, o = {}) {
  glowText(text, x, y, fs(o.weight ?? 500, size), color, { alpha, glow: o.glow ?? 10, align: o.align, glowColor: o.glowColor });
}
