// 16 张卡牌（2D 层）：正面 / 背面的统一设计、扇形摊开、翻牌、主角卡飞到中央、冲进卡面、结尾重新聚成卡并飞回扇形。
// 时间表来自 main.js 的 timeline()：T.flips（每张卡翻开的时刻）、T.lift、T.flipFront、T.hit、T.outro、T.cardHold、T.cardBack、T.clip
import { clamp, lerp, smooth, outCubic, inOut, outBack, mixHex, rgba, rng } from './util.js';

const CJK = '"Noto Serif CJK SC", serif', LATIN = '"Cinzel", "Noto Serif CJK SC", serif';
export const GROUP = { NT: ['分析家', '#A24BFF'], NF: ['外交家', '#2BE36B'], SJ: ['守护者', '#3AA8FF'], SP: ['探险家', '#FFC23D'] };
export const DECK = [
  ['INTJ', '乌鸦', 'NT'], ['INTP', '猫头鹰', 'NT'], ['ENTJ', '熊', 'NT'], ['ENTP', '狐狸', 'NT'],
  ['INFJ', '狼', 'NF'], ['INFP', '天鹅', 'NF'], ['ENFJ', '狗', 'NF'], ['ENFP', '海豚', 'NF'],
  ['ISTJ', '工蜂', 'SJ'], ['ISFJ', '鹿', 'SJ'], ['ESTJ', '狮子', 'SJ'], ['ESFJ', '马', 'SJ'],
  ['ISTP', '猫', 'SP'], ['ISFP', '熊猫', 'SP'], ['ESTP', '猎豹', 'SP'], ['ESFP', '海豹', 'SP'],
];
const ICONS = { INTP: owl, INFP: swan, ENFP: dolphin, ISTJ: bee, ISFP: panda, ESFP: seal };
const FW = 300, FH = 375;                       // 小卡的贴图尺寸（4:5）

const mk = (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; };
function rr(x, y, w, h, r, c) { c.beginPath(); c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r); c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath(); }
function goldGrad(c, x0, y0, x1, y1) { const g = c.createLinearGradient(x0, y0, x1, y1); g.addColorStop(0, '#E9D79B'); g.addColorStop(0.3, '#B08A3E'); g.addColorStop(0.5, '#E8D9A8'); g.addColorStop(0.75, '#9A7630'); g.addColorStop(1, '#E2CC8A'); return g; }
function frame(c, w, h, s) {
  const g = goldGrad(c, 0, 0, w, h);
  c.save(); c.strokeStyle = g; c.lineWidth = 3 * s; rr(1.5 * s, 1.5 * s, w - 3 * s, h - 3 * s, 28 * s, c); c.stroke();
  c.globalAlpha = 0.55; c.lineWidth = 1 * s; rr(11 * s, 11 * s, w - 22 * s, h - 22 * s, 20 * s, c); c.stroke();
  c.globalAlpha = 1; c.fillStyle = g;
  for (const [x, y] of [[11 * s, 50 * s], [w - 11 * s, 50 * s], [11 * s, h - 50 * s], [w - 11 * s, h - 50 * s], [w / 2, 11 * s], [w / 2, h - 11 * s]]) { c.save(); c.translate(x, y); c.rotate(Math.PI / 4); c.fillRect(-4 * s, -4 * s, 8 * s, 8 * s); c.restore(); }
  c.restore();
}
function holo(c, w, h, at, a) {
  c.save(); c.globalCompositeOperation = 'screen'; c.translate(at * w, h / 2); c.rotate(-0.62);
  const bw = w * 0.55, g = c.createLinearGradient(-bw / 2, 0, bw / 2, 0);
  ['#FF3D8B', '#FFC23D', '#2BE36B', '#3AA8FF', '#A24BFF', '#FF3D8B'].forEach((col, i, arr) => g.addColorStop(i / (arr.length - 1), rgba(col, a)));
  c.fillStyle = g; c.fillRect(-bw / 2, -h * 2, bw, h * 4); c.restore();
}

// ------------------------------------------------------------ 正面（小卡）：分组名、动物、类型 · 动物名
function face(card, art) {
  const [type, zh, grp] = card, [gname, hex] = GROUP[grp], c = mk(FW, FH).getContext('2d'), s = FW / 300;
  c.save(); rr(0, 0, FW, FH, 28 * s, c); c.clip();
  const bg = c.createLinearGradient(0, 0, FW * 0.4, FH); bg.addColorStop(0, mixHex(hex, '#000000', 0.72)); bg.addColorStop(0.6, mixHex(hex, '#05050A', 0.88)); bg.addColorStop(1, '#030306');
  c.fillStyle = bg; c.fillRect(0, 0, FW, FH);
  const R = rng(type.charCodeAt(1) * 7 + type.charCodeAt(3)); for (let i = 0; i < 60; i++) { c.fillStyle = `rgba(220,222,235,${0.15 + 0.4 * R()})`; c.fillRect(R() * FW, R() * FH, 1, 1); }
  const glow = c.createRadialGradient(FW / 2, FH * 0.44, 0, FW / 2, FH * 0.44, FW * 0.5); glow.addColorStop(0, rgba(hex, 0.22)); glow.addColorStop(1, rgba(hex, 0)); c.fillStyle = glow; c.fillRect(0, 0, FW, FH);
  c.globalCompositeOperation = 'lighter'; c.drawImage(art, (FW - 260 * s) / 2, 62 * s, 260 * s, 230 * s); c.globalCompositeOperation = 'source-over';
  holo(c, FW, FH, 0.25, 0.1);
  c.restore();
  frame(c, FW, FH, s);
  c.textBaseline = 'middle';
  c.font = `700 ${19 * s}px ${CJK}`; c.textAlign = 'left'; c.fillStyle = mixHex(hex, '#EBEBEB', 0.5); c.fillText(`${grp} · ${gname}`, 26 * s, 38 * s);
  c.textAlign = 'center'; c.shadowColor = rgba(hex, 0.9); c.shadowBlur = 10 * s;
  const g = c.createLinearGradient(0, FH - 75 * s, 0, FH - 40 * s); g.addColorStop(0, '#EBEBEB'); g.addColorStop(0.55, mixHex(hex, '#FFFFFF', 0.55)); g.addColorStop(1, mixHex(hex, '#FFFFFF', 0.2));
  c.fillStyle = g; c.font = `900 ${34 * s}px ${LATIN}`; const tw = c.measureText(type).width; c.font = `900 ${32 * s}px ${CJK}`; const zw = c.measureText(' · ' + zh).width;
  let x = FW / 2 - (tw + zw) / 2; c.textAlign = 'left'; c.font = `900 ${34 * s}px ${LATIN}`; c.fillText(type, x, FH - 58 * s); c.font = `900 ${32 * s}px ${CJK}`; c.fillText(' · ' + zh, x + tw, FH - 56 * s);
  return c.canvas;
}
// ------------------------------------------------------------ 背面（统一）：深色底、金色细边、中央金色徽记 + “兽格觉醒”，底部是类型字母（分组颜色）
export function back(type, grp, w = FW, h = FH) {
  const c = mk(w, h).getContext('2d'), s = w / 300, hex = GROUP[grp][1];
  c.save(); rr(0, 0, w, h, 28 * s, c); c.clip();
  const bg = c.createRadialGradient(w / 2, h * 0.42, 0, w / 2, h * 0.42, h * 0.7); bg.addColorStop(0, '#16141C'); bg.addColorStop(1, '#07070B'); c.fillStyle = bg; c.fillRect(0, 0, w, h);
  c.globalAlpha = 0.06; c.strokeStyle = '#E8D9A8'; c.lineWidth = 1 * s; for (let i = -h; i < w + h; i += 14 * s) { c.beginPath(); c.moveTo(i, 0); c.lineTo(i - h, h); c.stroke(); c.beginPath(); c.moveTo(i - h, 0); c.lineTo(i, h); c.stroke(); }
  c.restore(); c.globalAlpha = 1;
  frame(c, w, h, s);
  // 徽记：外圆、内圆、旋转的方块、八条光芒、中心菱形
  const g = goldGrad(c, w * 0.25, h * 0.2, w * 0.75, h * 0.6), cx = w / 2, cy = h * 0.42, r = 78 * s;
  c.save(); c.strokeStyle = g; c.fillStyle = g; c.lineWidth = 2.2 * s; c.shadowColor = 'rgba(232,217,168,0.45)'; c.shadowBlur = 8 * s;
  c.beginPath(); c.arc(cx, cy, r, 0, Math.PI * 2); c.stroke();
  c.lineWidth = 1.2 * s; c.beginPath(); c.arc(cx, cy, r * 0.78, 0, Math.PI * 2); c.stroke();
  for (const rot of [0, Math.PI / 4]) { c.save(); c.translate(cx, cy); c.rotate(rot); c.lineWidth = 1.6 * s; c.strokeRect(-r * 0.52, -r * 0.52, r * 1.04, r * 1.04); c.restore(); }
  for (let i = 0; i < 8; i++) { const a = i * Math.PI / 4; c.beginPath(); c.moveTo(cx + Math.cos(a) * r * 1.06, cy + Math.sin(a) * r * 1.06); c.lineTo(cx + Math.cos(a) * r * (i % 2 ? 1.18 : 1.3), cy + Math.sin(a) * r * (i % 2 ? 1.18 : 1.3)); c.stroke(); }
  c.save(); c.translate(cx, cy); c.rotate(Math.PI / 4); c.fillRect(-9 * s, -9 * s, 18 * s, 18 * s); c.restore();
  c.font = `900 ${30 * s}px ${CJK}`; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('兽格觉醒', cx, cy + r + 40 * s);
  c.restore();
  c.font = `900 ${34 * s}px ${LATIN}`; c.textAlign = 'center'; c.textBaseline = 'middle'; c.shadowColor = rgba(hex, 0.9); c.shadowBlur = 12 * s;
  c.fillStyle = mixHex(hex, '#EBEBEB', 0.25); c.fillText(type.split('').join(' '), cx, h - 50 * s);
  return c.canvas;
}

// ------------------------------------------------------------ 还没有正式模型的动物：发光的线条图标
function iconCanvas(type, hex) {
  const c = mk(480, 480).getContext('2d');
  c.strokeStyle = mixHex(hex, '#FFFFFF', 0.35); c.fillStyle = rgba(hex, 0.18); c.lineWidth = 6; c.lineJoin = c.lineCap = 'round';
  c.shadowColor = hex; c.shadowBlur = 22;
  c.translate(240, 250); ICONS[type](c);
  return c.canvas;
}
const P = (c, f) => { c.beginPath(); f(); c.fill(); c.stroke(); };
function owl(c) {
  P(c, () => c.ellipse(0, 50, 105, 125, 0, 0, Math.PI * 2));
  P(c, () => { c.moveTo(-95, -40); c.lineTo(-110, -150); c.lineTo(-45, -95); c.quadraticCurveTo(0, -110, 45, -95); c.lineTo(110, -150); c.lineTo(95, -40); c.closePath(); });
  for (const s of [-1, 1]) { P(c, () => c.arc(s * 45, -45, 36, 0, Math.PI * 2)); c.save(); c.fillStyle = c.strokeStyle; c.beginPath(); c.arc(s * 45, -45, 12, 0, Math.PI * 2); c.fill(); c.restore(); }
  P(c, () => { c.moveTo(-12, -15); c.lineTo(12, -15); c.lineTo(0, 15); c.closePath(); });
  for (const s of [-1, 1]) { c.beginPath(); c.moveTo(s * 100, 20); c.quadraticCurveTo(s * 70, 110, s * 30, 160); c.stroke(); }
  for (let i = 0; i < 3; i++) { c.beginPath(); c.arc(-25 + i * 25, 70 + (i % 2) * 18, 10, 0.2, Math.PI - 0.2); c.stroke(); }
}
function swan(c) {
  P(c, () => { c.moveTo(-170, 60); c.quadraticCurveTo(-60, 150, 120, 90); c.quadraticCurveTo(170, 60, 150, 20); c.quadraticCurveTo(60, 40, -10, 20); c.quadraticCurveTo(-90, 0, -170, 60); c.closePath(); });
  c.beginPath(); c.moveTo(-20, 25); c.bezierCurveTo(-110, -40, 20, -120, -40, -170); c.stroke();
  P(c, () => c.ellipse(-55, -175, 26, 18, -0.4, 0, Math.PI * 2));
  P(c, () => { c.moveTo(-78, -180); c.lineTo(-118, -170); c.lineTo(-78, -164); c.closePath(); });
  for (let i = 0; i < 4; i++) { c.beginPath(); c.moveTo(0 + i * 30, 40 - i * 6); c.quadraticCurveTo(40 + i * 30, 10, 90 + i * 15, 40); c.stroke(); }
}
function dolphin(c) {
  P(c, () => { c.moveTo(-190, 40); c.quadraticCurveTo(-170, 20, -135, 15); c.quadraticCurveTo(-60, -90, 80, -40); c.quadraticCurveTo(150, -10, 175, -70); c.lineTo(205, -95); c.lineTo(195, -45); c.lineTo(225, -20); c.lineTo(180, -30); c.quadraticCurveTo(140, 50, 40, 55); c.quadraticCurveTo(-80, 75, -135, 45); c.quadraticCurveTo(-165, 50, -190, 40); c.closePath(); });
  P(c, () => { c.moveTo(-20, -55); c.quadraticCurveTo(0, -120, 40, -130); c.quadraticCurveTo(25, -90, 30, -48); c.closePath(); });
  P(c, () => { c.moveTo(-40, 55); c.quadraticCurveTo(-30, 100, 0, 115); c.quadraticCurveTo(0, 80, 10, 56); c.closePath(); });
  c.save(); c.fillStyle = c.strokeStyle; c.beginPath(); c.arc(-118, 10, 7, 0, Math.PI * 2); c.fill(); c.restore();
  for (const [x, y, r] of [[-200, -60, 10], [-215, -100, 7], [-195, -135, 5]]) { c.beginPath(); c.arc(x, y, r, 0, Math.PI * 2); c.stroke(); }
}
function bee(c) {
  for (const s of [-1, 1]) P(c, () => c.ellipse(s * 45, -95, 55, 85, s * 0.5, 0, Math.PI * 2));
  P(c, () => c.ellipse(20, 30, 140, 90, 0, 0, Math.PI * 2));
  c.save(); c.fillStyle = c.strokeStyle; for (const x of [-30, 25, 80]) { c.beginPath(); c.ellipse(x, 30, 14, 80 - Math.abs(x - 20) * 0.25, 0, 0, Math.PI * 2); c.fill(); } c.restore();
  P(c, () => c.arc(-150, 10, 48, 0, Math.PI * 2));
  c.beginPath(); c.moveTo(-165, -32); c.quadraticCurveTo(-190, -90, -215, -95); c.moveTo(-140, -35); c.quadraticCurveTo(-140, -95, -120, -110); c.stroke();
  c.beginPath(); c.moveTo(160, 30); c.lineTo(205, 35); c.stroke();
}
function panda(c) {
  c.save(); c.fillStyle = c.strokeStyle; for (const s of [-1, 1]) { c.beginPath(); c.arc(s * 110, -125, 46, 0, Math.PI * 2); c.fill(); } c.restore();
  P(c, () => c.ellipse(0, 0, 160, 145, 0, 0, Math.PI * 2));
  c.save(); c.fillStyle = c.strokeStyle; for (const s of [-1, 1]) { c.beginPath(); c.ellipse(s * 62, -15, 36, 52, s * -0.5, 0, Math.PI * 2); c.fill(); } c.restore();
  c.save(); c.fillStyle = '#0A0A10'; c.shadowBlur = 0; for (const s of [-1, 1]) { c.beginPath(); c.arc(s * 60, -20, 13, 0, Math.PI * 2); c.fill(); } c.restore();
  c.save(); c.fillStyle = c.strokeStyle; c.beginPath(); c.ellipse(0, 55, 26, 17, 0, 0, Math.PI * 2); c.fill(); c.restore();
  c.beginPath(); c.moveTo(0, 72); c.lineTo(0, 92); c.moveTo(-28, 98); c.quadraticCurveTo(0, 118, 28, 98); c.stroke();
}
function seal(c) {
  P(c, () => { c.moveTo(-200, 110); c.quadraticCurveTo(-90, 140, 60, 105); c.quadraticCurveTo(130, 85, 120, -10); c.quadraticCurveTo(110, -120, 40, -130); c.quadraticCurveTo(-30, -130, -10, -40); c.quadraticCurveTo(-30, 50, -200, 110); c.closePath(); });
  P(c, () => { c.moveTo(-200, 110); c.lineTo(-240, 70); c.lineTo(-230, 115); c.lineTo(-250, 140); c.closePath(); });
  P(c, () => { c.moveTo(40, 90); c.quadraticCurveTo(70, 150, 110, 150); c.quadraticCurveTo(90, 110, 85, 85); c.closePath(); });
  c.save(); c.fillStyle = c.strokeStyle; for (const x of [25, 80]) { c.beginPath(); c.arc(x, -80, 11, 0, Math.PI * 2); c.fill(); } c.beginPath(); c.ellipse(52, -45, 13, 9, 0, 0, Math.PI * 2); c.fill(); c.restore();
  for (const s of [-1, 1]) { c.beginPath(); c.moveTo(52 + s * 14, -40); c.lineTo(52 + s * 75, -50 + 12); c.moveTo(52 + s * 14, -36); c.lineTo(52 + s * 75, -22); c.stroke(); }
}

// ------------------------------------------------------------ 卡组
export async function buildCards(ep) {
  const load = src => new Promise((res, rej) => { const im = new Image(); im.onload = () => res(im); im.onerror = () => rej(new Error('缺少 ' + src)); im.src = src; });
  const cards = [];
  for (const card of DECK) {
    const [type, , grp] = card, hex = GROUP[grp][1];
    let art = null;
    if (type === ep.type) art = null;
    else if (ICONS[type]) art = iconCanvas(type, hex);
    else art = await load(`assets/cards/art_${type}.png`);
    cards.push({ card, type, grp, hex, art, face: art ? face(card, art) : null, back: back(type, grp) });
  }
  const hero = cards.find(c => c.type === ep.type);
  hero.front = await load(`assets/cards/front_${ep.type}.png`);   // 主角卡的正面 = 收藏卡（1080×1350）
  hero.backHi = back(hero.type, hero.grp, 600, 750);
  // 金色粒子：沿卡框分布
  const R = rng(77), border = [];
  for (let i = 0; i < 900; i++) { const u = R(); const per = 2 * (0.8 + 1); let d = u * per, x, y; if (d < 0.8) { x = d - 0.4; y = -0.5; } else if ((d -= 0.8) < 1) { x = 0.4; y = d - 0.5; } else if ((d -= 1) < 0.8) { x = 0.4 - d; y = 0.5; } else { d -= 0.8; x = -0.4; y = 0.5 - d; } border.push({ x, y, a: R() * Math.PI * 2, v: 0.4 + R() * 1.4, s: 1 + R() * 2.2, ph: R() }); }
  return { cards, hero, heroIdx: cards.indexOf(hero), border };
}

// 扇形里第 i 张卡的位置：圆弧摊开（像塔罗牌）
function slot(i, n, push) {
  const th = (i / (n - 1) - 0.5) * 2 * 34 * Math.PI / 180, PX = 960, PY = 1850, R = 1180, H = 205;
  let x = PX + R * Math.sin(th), y = PY - R * Math.cos(th);
  // 镜头推近：整体绕扇形中心放大
  x = 960 + (x - 960) * push; y = 760 + (y - 760) * push;
  return { x, y, rot: th, h: H * push };
}
function drawCard(ctx, img, x, y, h, rot, sx, alpha, extra = 0, flash = 0) {
  if (alpha <= 0.003 || Math.abs(sx) < 0.002) return;
  const w = h * 0.8;
  ctx.save(); ctx.globalAlpha = alpha; ctx.translate(x, y); ctx.rotate(rot); ctx.scale(sx, 1);
  ctx.shadowColor = 'rgba(0,0,0,0.6)'; ctx.shadowBlur = h * 0.08;
  ctx.drawImage(img, -w / 2, -h / 2, w, h);
  ctx.shadowBlur = 0;
  if (extra > 0.003) { ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = alpha * extra; ctx.drawImage(img, -w / 2, -h / 2, w, h); }
  if (flash > 0.003) { ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = alpha * flash * 0.28; rr(-w / 2, -h / 2, w, h, h * 0.075, ctx); ctx.fillStyle = 'rgba(235,228,200,1)'; ctx.fill(); }
  ctx.restore();
}

// ------------------------------------------------------------ 每一帧
export function drawCards(ctx, D, t, T, pulse) {
  const { cards, hero, heroIdx, border } = D, n = cards.length;
  const push = 1 + 0.09 * smooth(0, T.lift, t) * (1 - smooth(T.cardBack, T.clip - 0.05, t));
  // 其他卡变暗到 30% 并向后退；片尾回来
  const dimIn = smooth(T.lift, T.lift + 0.33, t), dimOut = smooth(T.cardBack, T.clip - 0.06, t);
  const dim = dimIn * (1 - dimOut);
  const goneIn = smooth(T.flipFront + 0.1, T.hit, t), goneOut = smooth(T.outro + 0.3, T.cardHold, t);
  const fanAlpha = (1 - 0.7 * dim) * (1 - goneIn * (1 - goneOut));
  const recede = 1 - 0.12 * dim;
  const hidden = t >= T.hit && t < T.outro + 0.3;
  if (!hidden) {
    const list = [];
    cards.forEach((c, i) => {
      if (i === heroIdx) return;
      const s = slot(i, n, push * recede);
      // 翻开：0.2 秒；片尾翻回背面（依次）
      const f0 = T.flips[c.type];
      let k = clamp((t - f0) / 0.2);
      const r0 = T.cardBack + 0.16 * ((i * 7) % 15) / 15;
      if (t >= r0) k = 1 - clamp((t - r0) / 0.2);
      // 翻开的卡稍微升起、放大，盖在没翻的卡上面，正面看得清
      const up = smooth(0, 1, k);
      list.push({ c, s, k, up, x: s.x + Math.sin(s.rot) * 34 * up, y: s.y + 40 * dim - Math.cos(s.rot) * 34 * up });
    });
    list.sort((a, b) => a.up - b.up);
    for (const L of list) {
      const showFace = L.k > 0.5, sx = Math.cos(Math.PI * L.k);
      const flash = Math.exp(-Math.pow((L.k - 0.5) / 0.18, 2)) * (t < T.cardBack ? 1 : 0.5);
      const beat = showFace && t < T.lift ? pulse * 0.3 : 0;
      drawCard(ctx, showFace ? L.c.face : L.c.back, L.x, L.y, L.s.h * (1 + 0.12 * L.up), L.s.rot, Math.max(1e-3, Math.abs(sx)), fanAlpha, beat, flash);
    }
  }
  // ---- 主角卡
  const hs = slot(heroIdx, n, push), C = { x: 960, y: 590, h: 1080 * 0.6, rot: 0 };
  const lerpS = (a, b, e) => ({ x: lerp(a.x, b.x, e), y: lerp(a.y, b.y, e), h: lerp(a.h, b.h, e), rot: lerp(a.rot, b.rot, e) });
  let gold = null;
  if (t < T.lift) drawCard(ctx, hero.back, hs.x, hs.y, hs.h, hs.rot, 1, 1);
  else if (t < T.flipFront) {
    // 升起，旋转着飞到中央并放大
    const e = inOut(clamp((t - T.lift) / (T.flipFront - T.lift - 0.08)));
    const p = lerpS(hs, C, e); p.y -= Math.sin(e * Math.PI) * 120;
    const spin = Math.cos(e * Math.PI * 2);
    drawCard(ctx, hero.backHi, p.x, p.y, p.h, p.rot, Math.max(0.02, Math.abs(spin)), 1, 0, Math.exp(-Math.pow((Math.abs(spin) - 0) / 0.15, 2)) * 0.4);
  } else if (t < T.hit) {
    // 翻到正面（0.2 秒，带一闪），然后镜头冲进卡面：卡越放越大、淡出，卡框散成金色粒子
    const k = clamp((t - T.flipFront) / 0.2), sx = Math.cos(Math.PI * k);
    const rush = clamp((t - T.flipFront - 0.2) / (T.hit - T.flipFront - 0.2));
    const zoom = 1 + 2.6 * Math.pow(rush, 2.2);
    const a = 1 - smooth(0.25, 1, rush);
    drawCard(ctx, k > 0.5 ? hero.front : hero.backHi, C.x, C.y, C.h * zoom, 0, Math.max(0.02, Math.abs(sx)), a, 0, Math.exp(-Math.pow((k - 0.5) / 0.2, 2)));
    if (rush > 0) gold = { cx: C.x, cy: C.y, h: C.h * zoom, k: -rush, a: 1 - rush * 0.7 };
  } else if (t >= T.outro) {
    // 狼和月亮缩小，金色粒子重新聚成卡框，定格成收藏卡；然后翻回背面、飞回扇形
    const form = clamp((t - T.outro) / (T.cardHold - T.outro));
    const e = outCubic(form);
    if (t < T.cardBack) {
      const h = lerp(1080 * 2.4, C.h, e), a = smooth(0, 0.45, form);
      drawCard(ctx, hero.front, C.x, C.y, h, 0, 1, a, 0, 0);
      if (form < 1) gold = { cx: C.x, cy: C.y, h, k: 1 - form, a: smooth(0, 0.3, form) };
    } else {
      const k = clamp((t - T.cardBack) / 0.2), sx = Math.cos(Math.PI * k);
      const fly = inOut(clamp((t - T.cardBack - 0.2) / (T.clip - 0.06 - T.cardBack - 0.2)));
      const p = lerpS(C, hs, fly);
      drawCard(ctx, k < 0.5 ? hero.front : (fly > 0.6 ? hero.back : hero.backHi), p.x, p.y, p.h, p.rot, Math.max(0.02, Math.abs(sx)), 1, 0, Math.exp(-Math.pow((k - 0.5) / 0.2, 2)) * 0.8);
    }
  }
  // 金色粒子（卡框散开 / 聚拢）。k < 0：向外散；k > 0：还差多少聚拢
  if (gold) {
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    for (const b of border) {
      const off = gold.k < 0 ? -gold.k : gold.k;
      const d = off * (300 + 500 * b.v);
      const x = gold.cx + b.x * gold.h + Math.cos(b.a) * d, y = gold.cy + b.y * gold.h + Math.sin(b.a) * d;
      const al = gold.a * (0.5 + 0.5 * Math.sin(t * 20 + b.ph * 30)) * (gold.k < 0 ? 1 - off * 0.8 : 1 - off * 0.6);
      if (al <= 0.01) continue;
      ctx.fillStyle = `rgba(232,210,140,${al})`; ctx.beginPath(); ctx.arc(x, y, b.s, 0, Math.PI * 2); ctx.fill();
    }
    ctx.restore();
  }
}
