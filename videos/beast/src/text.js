// 2D 层：左上角 logo、称号大字（金属渐变 + 发光）、天赋词弹出、收藏卡
// 文字最亮不超过 #EBEBEB（亮度 235），保证“亮度 > 240 的像素 ≤ 0.5%”只由眼睛和光环决定。
import { clamp, lerp, smooth, outBack, outCubic, mixHex, rgba, hash, rng } from './util.js';

export const CJK = '"Noto Serif CJK SC", serif';
export const LATIN = '"Cinzel", "Noto Serif CJK SC", serif';
export const GROUP_NAME = { NT: '分析家', NF: '外交家', SJ: '守护者', SP: '探险家' };
export const BOXES = [];            // 本帧文字框（qa.js 检查文字是否压到脸）
const box = (x0, y0, x1, y1, label) => BOXES.push({ x0, y0, x1, y1, label });
const MAXW = '#EBEBEB';

const scratch = document.createElement('canvas'); scratch.width = 2000; scratch.height = 420;
const sx = scratch.getContext('2d');

// 金属字：先画在草稿画布上（深色厚度 + 竖向金属渐变 + 斜向高光扫过），再贴到主画布，外面一圈主色发光
function metalRun(runs, size, hex, sweep) {
  sx.setTransform(1, 0, 0, 1, 0, 0); sx.clearRect(0, 0, scratch.width, scratch.height);
  sx.textBaseline = 'alphabetic'; sx.textAlign = 'left';
  let w = 0; for (const r of runs) { sx.font = r.font; r.w = sx.measureText(r.text).width; w += r.w + (r.gap ?? 0); }
  const pad = 40, base = Math.round(size * 1.08) + pad / 2, ch = Math.round(size * 1.5) + pad;
  const draw = (fill, dy) => { let x = pad; for (const r of runs) { sx.font = r.font; sx.fillStyle = r.fill ?? fill; sx.fillText(r.text, x, base + dy); x += r.w + (r.gap ?? 0); } };
  draw(mixHex(hex, '#000000', 0.7), 5);
  const top = base - size * 0.82, bot = base + size * 0.08;
  const g = sx.createLinearGradient(0, top, 0, bot);
  g.addColorStop(0, MAXW); g.addColorStop(0.38, mixHex(hex, '#FFFFFF', 0.72)); g.addColorStop(0.55, mixHex(hex, '#FFFFFF', 0.35)); g.addColorStop(0.62, mixHex(hex, '#000000', 0.15)); g.addColorStop(1, mixHex(hex, '#FFFFFF', 0.45));
  draw(g, 0);
  if (sweep != null && sweep > -0.2 && sweep < 1.2) {
    sx.globalCompositeOperation = 'source-atop';
    const cx = pad + sweep * w, bw = size * 0.55;
    sx.save(); sx.translate(cx, base - size * 0.4); sx.transform(1, 0, -0.5, 1, 0, 0);
    const gg = sx.createLinearGradient(-bw / 2, 0, bw / 2, 0);
    gg.addColorStop(0, 'rgba(235,235,235,0)'); gg.addColorStop(0.5, 'rgba(235,235,235,0.85)'); gg.addColorStop(1, 'rgba(235,235,235,0)');
    sx.fillStyle = gg; sx.fillRect(-bw, -size, bw * 2, size * 2.4); sx.restore();
    sx.globalCompositeOperation = 'source-over';
  }
  return { w: w + pad * 2, h: ch, pad, base, tw: w };
}
function blitMetal(ctx, m, cx, baseline, scale, alpha, hex, glow) {
  ctx.save(); ctx.globalAlpha = alpha;
  ctx.translate(cx, baseline); ctx.scale(scale, scale);
  ctx.shadowColor = rgba(hex, 0.75); ctx.shadowBlur = glow;
  ctx.drawImage(scratch, 0, 0, m.w, m.h, -m.w / 2, -m.base, m.w, m.h);
  ctx.shadowBlur = glow * 0.4; ctx.globalAlpha = alpha * 0.5;
  ctx.drawImage(scratch, 0, 0, m.w, m.h, -m.w / 2, -m.base, m.w, m.h);
  ctx.restore();
}

export function logo(ctx, hex, x = 60, y = 60, size = 34) {
  ctx.save();
  ctx.font = `900 ${size}px ${CJK}`; ctx.textBaseline = 'middle'; ctx.textAlign = 'left';
  ctx.fillStyle = hex; ctx.shadowColor = rgba(hex, 0.8); ctx.shadowBlur = 12;
  ctx.translate(x + 10, y + size / 2); ctx.rotate(Math.PI / 4); ctx.fillRect(-7, -7, 14, 14); ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.shadowBlur = 8; ctx.shadowColor = 'rgba(0,0,0,0.6)';
  ctx.fillStyle = 'rgba(232,230,240,0.92)'; ctx.fillText('兽格觉醒', x + 32, y + size / 2 + 1);
  const w = ctx.measureText('兽格觉醒').width;
  ctx.restore();
  box(x, y, x + 32 + w, y + size, 'logo');
}

// 天赋词：44px，依次弹出；分隔用主色小菱形
function talents(ctx, list, cx, y, hex, times, a) {
  ctx.save();
  ctx.font = `700 44px ${CJK}`; ctx.textBaseline = 'middle'; ctx.textAlign = 'center';
  const ws = list.map(s => ctx.measureText(s).width), gap = 74;
  const total = ws.reduce((s, w) => s + w, 0) + gap * (list.length - 1);
  let x = cx - total / 2;
  list.forEach((s, i) => {
    const k = clamp((a - times[i]) / 0.16);
    const xc = x + ws[i] / 2;
    if (k > 0) {
      const sc = lerp(1.6, 1, outBack(k, 2.2)), al = clamp(k * 2.5);
      ctx.save(); ctx.translate(xc, y); ctx.scale(sc, sc); ctx.globalAlpha = al;
      ctx.shadowColor = rgba(hex, 0.9); ctx.shadowBlur = 18 + 30 * (1 - k);
      ctx.fillStyle = mixHex(hex, '#EBEBEB', 0.78); ctx.fillText(s, 0, 0);
      ctx.restore();
      box(x, y - 26, x + ws[i], y + 26, 'talent');
    }
    if (i < list.length - 1) {
      const kd = clamp((a - times[i + 1]) / 0.16);
      if (kd > 0) { ctx.save(); ctx.globalAlpha = kd; ctx.translate(x + ws[i] + gap / 2, y); ctx.rotate(Math.PI / 4); ctx.fillStyle = hex; ctx.shadowColor = rgba(hex, 1); ctx.shadowBlur = 10; ctx.fillRect(-6, -6, 12, 12); ctx.restore(); }
    }
    x += ws[i] + gap;
  });
  ctx.restore();
}

// 带关键词颜色的一行字：〔关键词〕用这一类的颜色。align: left / center
function richLine(ctx, text, x, y, size, hex, o = {}) {
  const parts = []; text.split(/(〔[^〕]*〕)/).forEach(p => { if (!p) return; const k = p.startsWith('〔'); parts.push({ t: k ? p.slice(1, -1) : p, k }); });
  ctx.save(); ctx.font = `${o.weight ?? 900} ${size}px ${CJK}`; ctx.textBaseline = 'middle'; ctx.textAlign = 'left';
  const ws = parts.map(p => ctx.measureText(p.t).width), w = ws.reduce((s, v) => s + v, 0);
  let cx = o.align === 'left' ? x : x - w / 2;
  if (o.back) {   // 暗色底
    const px = size * 0.55, py = size * 0.42;
    ctx.fillStyle = 'rgba(4,6,8,0.62)'; ctx.beginPath(); ctx.roundRect(cx - px, y - size / 2 - py, w + px * 2, size + py * 2, size * 0.35); ctx.fill();
  }
  ctx.shadowColor = 'rgba(0,0,0,0.85)'; ctx.shadowBlur = size * 0.25;
  parts.forEach((p, i) => {
    ctx.fillStyle = p.k ? mixHex(hex, '#EBEBEB', 0.12) : (o.color ?? MAXW);
    if (p.k) { ctx.save(); ctx.shadowColor = rgba(hex, 0.8); ctx.shadowBlur = size * 0.35; ctx.fillText(p.t, cx, y); ctx.restore(); }
    else ctx.fillText(p.t, cx, y);
    cx += ws[i];
  });
  ctx.restore();
  const x0 = o.align === 'left' ? x : x - w / 2;
  box(x0, y - size * 0.62, x0 + w, y + size * 0.62, o.label ?? 'text');
  return w;
}

// 暗处的一排发光眼睛（第 0 帧和片尾）
function eyeRow(ctx, alpha, W, y) {
  if (alpha <= 0.003) return;
  const cols = ['#A24BFF', '#2BE36B', '#3AA8FF', '#FFC23D'];
  ctx.save(); ctx.globalCompositeOperation = 'lighter';
  const n = 9;
  for (let i = 0; i < n; i++) {
    const x = W * (i + 0.5) / n + (i % 2 ? 18 : -14), yy = y + ((i * 37) % 5 - 2) * 16, c = cols[i % 4], gap = 15 + (i % 3) * 4;
    for (const dx of [-gap, gap]) {
      const g = ctx.createRadialGradient(x + dx, yy, 0, x + dx, yy, 13);
      g.addColorStop(0, rgba(mixHex(c, '#FFFFFF', 0.45), 0.85 * alpha)); g.addColorStop(0.25, rgba(c, 0.5 * alpha)); g.addColorStop(1, rgba(c, 0));
      ctx.fillStyle = g; ctx.beginPath(); ctx.ellipse(x + dx, yy, 13, 7, 0, 0, Math.PI * 2); ctx.fill();
    }
  }
  ctx.restore();
}

// ------------------------------------------------------------ 横屏视频的文字层（时间表见 main.js 的 timeline）
export function videoOverlay(ctx, t, ep, T) {
  BOXES.length = 0;
  const hex = ep.color, W = 1920;
  logo(ctx, hex);
  // 片尾回到第 0 帧：标题淡出，概念大字淡入
  const back = smooth(T.cards.gather, T.cards.end + 0.1, t);
  const outT = 1 - smooth(T.outro, T.outro + 0.35, t);
  // 概念大字：第 0 帧到主角卡升起那一拍保持不动；然后换成“INFJ 是——”（觉醒那一拍消失）
  const cA = t < T.cards.pop ? 1 : back;
  if (cA > 0.003) { ctx.save(); ctx.globalAlpha = cA; richLine(ctx, ep.concept, W / 2, ep.conceptY ?? 112, 64, hex, { label: '概念大字' }); ctx.restore(); }
  if (t >= T.cards.pop && t < T.reveal) { const k = smooth(T.cards.pop, T.cards.pop + 0.08, t); ctx.save(); ctx.globalAlpha = k; richLine(ctx, ep.revealText, W / 2, ep.conceptY ?? 112, 72, hex, { label: '揭晓' }); ctx.restore(); }
  // 嚎叫结束的那一拍：左下方大字“类型 · 动物名”；下一拍：一句话
  const L = ep.textLeft ?? [100, 830];
  if (t >= T.title && outT > 0.003) {
    const da = t - T.title, sizeL = 168, sizeC = 150;
    const m = metalRun([{ text: ep.type, font: `900 ${sizeL}px ${LATIN}`, gap: 30 }, { text: '·', font: `900 ${sizeC}px ${CJK}`, gap: 30, fill: hex }, { text: ep.animal.zh, font: `900 ${sizeC}px ${CJK}` }], sizeC, hex, (da - 0.12) / 0.5);
    const k = clamp(da / 0.16), sc = lerp(1.18, 1, outBack(k, 1.4));
    blitMetal(ctx, m, L[0] + m.tw / 2, L[1], sc, clamp(da / 0.06) * outT, hex, 24 + 36 * Math.exp(-da / 0.2));
    box(L[0], L[1] - sizeC * 0.85, L[0] + m.tw, L[1] + sizeC * 0.12, '大字');
  }
  if (t >= T.sentence && outT > 0.003) {
    const da = t - T.sentence, k = clamp(da / 0.14);
    ctx.save(); ctx.globalAlpha = clamp(da / 0.08) * outT; ctx.translate(0, (1 - outCubic(k)) * 24);
    richLine(ctx, ep.line, L[0] + 8, L[1] + 112, 52, hex, { align: 'left', weight: 700, back: true, label: '一句话' });
    ctx.restore();
  }
}

// ------------------------------------------------------------ 收藏卡（1080×1350）
export function cardOverlay(ctx, gl, ep, a, T) {
  BOXES.length = 0;
  const W = 1080, H = 1350, hex = ep.color;
  const X0 = 64, Y0 = 64, CW = 952, CH = 1222, RR = 40;
  // 背景：主色的深色渐变 + 星点
  const bg = ctx.createLinearGradient(0, 0, W * 0.4, H);
  bg.addColorStop(0, mixHex(hex, '#000000', 0.78)); bg.addColorStop(0.55, mixHex(hex, '#04040A', 0.9)); bg.addColorStop(1, '#030306');
  ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);
  const R = rng(9);
  for (let i = 0; i < 420; i++) { const x = R() * W, y = R() * H, s = R(); ctx.fillStyle = `rgba(220,222,235,${0.15 + 0.5 * s * s})`; ctx.fillRect(x, y, s > 0.9 ? 2 : 1, s > 0.9 ? 2 : 1); }
  const rr = (x, y, w, h, r) => { ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath(); };
  // 卡片外发光
  ctx.save(); rr(X0, Y0, CW, CH, RR); ctx.shadowColor = rgba(hex, 0.55); ctx.shadowBlur = 70; ctx.fillStyle = '#000'; ctx.fill(); ctx.restore();
  // 卡面：GL 画面
  ctx.save(); rr(X0, Y0, CW, CH, RR); ctx.clip();
  ctx.drawImage(gl, 0, 0, W, H);
  // 下半部压暗，给文字
  const dk = ctx.createLinearGradient(0, 700, 0, Y0 + CH);
  dk.addColorStop(0, 'rgba(3,3,8,0)'); dk.addColorStop(0.45, 'rgba(3,3,8,0.55)'); dk.addColorStop(1, 'rgba(3,3,8,0.8)');
  ctx.fillStyle = dk; ctx.fillRect(X0, 700, CW, CH);
  // 全息彩虹光泽：两条斜向的宽带 + 细斜纹
  ctx.globalCompositeOperation = 'screen';
  const holo = (cx, wBand, alpha) => {
    ctx.save(); ctx.translate(cx, H / 2); ctx.rotate(-0.62);
    const g = ctx.createLinearGradient(-wBand / 2, 0, wBand / 2, 0);
    ['#FF3D8B', '#FFC23D', '#2BE36B', '#3AA8FF', '#A24BFF', '#FF3D8B'].forEach((c, i, arr) => g.addColorStop(i / (arr.length - 1), rgba(c, alpha)));
    ctx.fillStyle = g; ctx.fillRect(-wBand / 2, -H, wBand, H * 2);
    const w2 = wBand * 0.18, g2 = ctx.createLinearGradient(-w2, 0, w2, 0);
    g2.addColorStop(0, 'rgba(230,230,240,0)'); g2.addColorStop(0.5, `rgba(230,230,240,${alpha * 0.9})`); g2.addColorStop(1, 'rgba(230,230,240,0)');
    ctx.fillStyle = g2; ctx.fillRect(-w2, -H, w2 * 2, H * 2);
    ctx.restore();
  };
  const sweep = T.holo ?? 0.18;
  holo(lerp(-200, W + 200, sweep), 520, 0.13);
  holo(lerp(-200, W + 200, sweep) + 760, 300, 0.08);
  ctx.globalAlpha = 0.035; ctx.strokeStyle = '#FFFFFF'; ctx.lineWidth = 1;
  for (let i = -H; i < W + H; i += 7) { ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i - H * 0.7, H); ctx.stroke(); }
  ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
  ctx.restore();
  // 细金边：外圈 + 内圈细线 + 四角小菱形
  const gold = ctx.createLinearGradient(X0, Y0, X0 + CW, Y0 + CH);
  gold.addColorStop(0, '#E9D79B'); gold.addColorStop(0.3, '#B08A3E'); gold.addColorStop(0.5, '#E8D9A8'); gold.addColorStop(0.75, '#9A7630'); gold.addColorStop(1, '#E2CC8A');
  ctx.save(); ctx.strokeStyle = gold; ctx.lineWidth = 3; rr(X0 + 1.5, Y0 + 1.5, CW - 3, CH - 3, RR); ctx.stroke();
  ctx.globalAlpha = 0.55; ctx.lineWidth = 1; rr(X0 + 16, Y0 + 16, CW - 32, CH - 32, RR - 14); ctx.stroke();
  ctx.globalAlpha = 1; ctx.fillStyle = gold;
  for (const [x, y] of [[X0 + 16, Y0 + 16 + 60], [X0 + CW - 16, Y0 + 16 + 60], [X0 + 16, Y0 + CH - 76], [X0 + CW - 16, Y0 + CH - 76], [W / 2, Y0 + 16], [W / 2, Y0 + CH - 16]]) { ctx.save(); ctx.translate(x, y); ctx.rotate(Math.PI / 4); ctx.fillRect(-5, -5, 10, 10); ctx.restore(); }
  ctx.restore();
  // 角标：类别、动物
  ctx.save(); ctx.font = `700 44px ${CJK}`; ctx.textBaseline = 'middle';
  ctx.shadowColor = 'rgba(0,0,0,0.8)'; ctx.shadowBlur = 10;
  ctx.textAlign = 'left'; ctx.fillStyle = mixHex(hex, '#EBEBEB', 0.55); ctx.fillText(`${ep.group} · ${GROUP_NAME[ep.group]}`, X0 + 50, Y0 + 70);
  const gw = ctx.measureText(`${ep.group} · ${GROUP_NAME[ep.group]}`).width; box(X0 + 50, Y0 + 48, X0 + 50 + gw, Y0 + 92, 'label');
  ctx.restore();
  // 类型 · 动物名 + 一句话（卡片下方的暗处）
  const mT = metalRun([{ text: ep.type, font: `900 150px ${LATIN}`, gap: 24 }, { text: '·', font: `900 130px ${CJK}`, gap: 24, fill: hex }, { text: ep.animal.zh, font: `900 150px ${CJK}` }], 150, hex, null);
  const ts = Math.min(0.82, 560 / mT.tw), tx = X0 + 50;
  blitMetal(ctx, mT, tx + mT.tw * ts / 2, 1070, ts, 1, hex, 24); box(tx, 1070 - 128 * ts, tx + mT.tw * ts, 1070 + 18 * ts, '大字');
  ctx.save(); richLine(ctx, ep.line, tx + 6, 1160, 48, hex, { align: 'left', weight: 700, back: true, label: '一句话' }); ctx.restore();
  logo(ctx, hex, X0 + 34, Y0 + CH - 62, 24);
}
