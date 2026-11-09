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
  // 徽记：外圆、内圆、旋转的方块、八条光芒、中心菱形；下面“兽格觉醒”
  const g = goldGrad(c, w * 0.25, h * 0.1, w * 0.75, h * 0.55), cx = w / 2, cy = h * 0.31, r = 56 * s;
  c.save(); c.strokeStyle = g; c.fillStyle = g; c.lineWidth = 2.4 * s; c.shadowColor = 'rgba(232,217,168,0.45)'; c.shadowBlur = 8 * s;
  c.beginPath(); c.arc(cx, cy, r, 0, Math.PI * 2); c.stroke();
  c.lineWidth = 1.3 * s; c.beginPath(); c.arc(cx, cy, r * 0.78, 0, Math.PI * 2); c.stroke();
  for (const rot of [0, Math.PI / 4]) { c.save(); c.translate(cx, cy); c.rotate(rot); c.lineWidth = 1.7 * s; c.strokeRect(-r * 0.52, -r * 0.52, r * 1.04, r * 1.04); c.restore(); }
  for (let i = 0; i < 8; i++) { const a = i * Math.PI / 4; c.beginPath(); c.moveTo(cx + Math.cos(a) * r * 1.06, cy + Math.sin(a) * r * 1.06); c.lineTo(cx + Math.cos(a) * r * (i % 2 ? 1.18 : 1.3), cy + Math.sin(a) * r * (i % 2 ? 1.18 : 1.3)); c.stroke(); }
  c.save(); c.translate(cx, cy); c.rotate(Math.PI / 4); c.fillRect(-8 * s, -8 * s, 16 * s, 16 * s); c.restore();
  c.font = `900 ${26 * s}px ${CJK}`; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('兽格觉醒', cx, cy + r + 30 * s);
  c.restore();
  // 类型字母：大（卡高的约 22%，网格里约 36px），用这一类的颜色
  c.font = `900 ${80 * s}px ${LATIN}`; c.textAlign = 'center'; c.textBaseline = 'middle'; c.shadowColor = rgba(hex, 0.95); c.shadowBlur = 14 * s;
  c.fillStyle = mixHex(hex, '#EBEBEB', 0.3); const tw = c.measureText(type).width; const fsz = 80 * s * w * 0.6 / tw; c.font = `900 ${fsz}px ${LATIN}`;
  c.fillText(type, cx, h - 30 * s - fsz * 0.42);
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
  const cards = DECK.map(card => ({ card, type: card[0], grp: card[2], hex: GROUP[card[2]][1], back: back(card[0], card[2]) }));
  const hero = cards.find(c => c.type === ep.type);
  hero.front = await load(`assets/cards/front_${ep.type}.png`);   // 主角卡的正面 = 收藏卡（1080×1350）
  hero.frontMeta = await (await fetch(`assets/cards/front_${ep.type}.json`)).json();   // 收藏卡里眼睛的位置
  hero.backHi = back(hero.type, hero.grp, 600, 750);
  const R = rng(77), border = [];
  for (let i = 0; i < 900; i++) { const u = R(); let d = u * 3.6, x, y; if (d < 0.8) { x = d - 0.4; y = -0.5; } else if ((d -= 0.8) < 1) { x = 0.4; y = d - 0.5; } else if ((d -= 1) < 0.8) { x = 0.4 - d; y = 0.5; } else { d -= 0.8; x = -0.4; y = 0.5 - d; } border.push({ x, y, a: R() * Math.PI * 2, v: 0.4 + R() * 1.4, s: 1 + R() * 2.2, ph: R() }); }
  const motes = Array.from({ length: 16 * 14 }, () => ({ a: R() * Math.PI * 2, v: 0.6 + R(), s: 1 + R() * 1.5 }));   // 落地粒子、牌堆粒子环共用
  const ringP = Array.from({ length: 520 }, () => ({ a: R() * Math.PI * 2, v: 0.7 + R() * 0.6, s: 1.2 + R() * 2.4, h: (R() - 0.5) }));
  return { cards, hero, heroIdx: cards.indexOf(hero), border, motes, ringP };
}

// 4×4 网格（略微俯视的透视）：第 r 行、第 c 列 → 屏幕位置、卡高
const GH = 206, GAPX = 16, GAPY = 12;
function gridPos(i, push, orbit) {
  const r = Math.floor(i / 4), c = i % 4;
  const depth = (1.5 - r) * 0.035;                 // 上面的行远一点（俯视）
  const sc = (1 - depth) * push;
  const cx = 960, cy = 552, w = GH * 0.8;
  const x = cx + ((c - 1.5) * (w + GAPX)) * sc + orbit * (r - 1.5) * 26 * push;
  const y = cy + ((r - 1.5) * (GH + GAPY)) * (1 - 0.025 * (1.5 - r)) * push;
  return { x, y, h: GH * sc, rot: 0 };
}
const STACK = { x: 960, y: 572, h: 1080 * 0.35 };
function drawCard(ctx, img, x, y, h, rot, sx, alpha, o = {}) {
  if (alpha <= 0.003 || Math.abs(sx) < 0.002) return;
  const w = h * 0.8;
  ctx.save(); ctx.globalAlpha = alpha; ctx.translate(x, y); ctx.rotate(rot); ctx.scale(sx, o.sy ?? 1);
  if (o.tilt) ctx.transform(1, 0, -o.tilt * 0.12, 1, 0, 0);
  if (o.glow) { ctx.shadowColor = rgba(o.glowCol, Math.min(1, o.glow)); ctx.shadowBlur = h * 0.16 * o.glow; } else { ctx.shadowColor = 'rgba(0,0,0,0.65)'; ctx.shadowBlur = h * 0.07; }
  if (o.blur) ctx.filter = `blur(${o.blur}px)`;
  ctx.drawImage(img, -w / 2, -h / 2, w, h);
  ctx.filter = 'none'; ctx.shadowBlur = 0;
  if (o.dark) { ctx.globalCompositeOperation = 'source-atop'; ctx.globalAlpha = o.dark; ctx.fillStyle = '#000'; rr(-w / 2, -h / 2, w, h, h * 0.075, ctx); ctx.fill(); ctx.globalCompositeOperation = 'source-over'; }
  if (o.tint) { ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = alpha * o.tint; rr(-w / 2, -h / 2, w, h, h * 0.075, ctx); ctx.fillStyle = rgba(o.glowCol, 0.35); ctx.fill(); }
  ctx.restore();
}
export const GRID = { pos: (i, push = 1, orbit = 0) => gridPos(i, push, orbit) };
const lerpS = (a, b, e) => ({ x: lerp(a.x, b.x, e), y: lerp(a.y, b.y, e), h: lerp(a.h, b.h, e), rot: lerp(a.rot, b.rot, e) });

// ------------------------------------------------------------ 每一帧
export function drawCards(ctx, D, t, T) {
  const { cards, hero, heroIdx, border, motes, ringP } = D, n = cards.length, C = T.cards;
  // 镜头：转盘时缓慢推近网格、轻微环绕（±3 度）；片尾回到原样
  // 镜头：转盘全程缓慢推近（含变慢的那一段）、网格轻微环绕（±3°，左右视差）；片尾回到原样
  const prog = clamp((t - C.deal[C.deal.length - 1]) / (C.pop - C.deal[C.deal.length - 1]));
  const push = 1 + 0.07 * prog * (1 - smooth(C.gather, C.end, t));
  const orbit = Math.sin((prog - 0.5) * Math.PI) * (1 - smooth(C.gather, C.end, t)) * (t < C.pop ? 1 : 0);
  const gridLive = smooth(C.deal[C.deal.length - 1] + 0.3, C.spin0 + 0.2, t) * (1 - smooth(C.pop, C.pop + 0.2, t));
  const dimP = smooth(C.pop, C.pop + 0.25, t) * (1 - smooth(C.backIn, C.backIn + 0.3, t));
  const exitK = smooth(T.reveal, T.reveal + 0.2, t) * (1 - smooth(C.backIn, C.backIn + 0.33, t));
  const inStack = t < C.deal[0] || t >= C.end - 0.001;
  // 转盘：当前照到哪张卡
  let lit = -1, litAge = 9;
  for (let j = C.jumps.length - 1; j >= 0; j--) if (t >= C.jumps[j][0]) { lit = C.jumps[j][1]; litAge = t - C.jumps[j][0]; break; }
  if (t >= C.pop) lit = -1;
  const roulette = t >= C.spin0 && t < C.pop;
  // 每张卡被照亮的程度：亮起 0.08 秒，离开后 0.15 秒回落
  const on = new Array(n).fill(0);
  C.jumps.forEach(([tj, idx], j) => { const tn = C.jumps[j + 1]?.[0] ?? C.pop; on[idx] = Math.max(on[idx], smooth(tj, tj + 0.08, t) * (1 - smooth(tn, tn + 0.15, t))); });
  // 牌堆周围缓慢旋转的金色粒子环（第 0 帧和片尾一样）
  const ringA = (1 - smooth(C.deal[0], C.deal[0] + 0.3, t)) + smooth(C.gather + 0.1, C.end, t);
  const ring = (front) => {
    if (ringA <= 0.003) return;
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    for (let m = 0; m < ringP.length; m++) {
      const mo = ringP[m], a = mo.a + 2 * Math.PI * t / T.clip, sn = Math.sin(a);
      if ((sn > 0) !== front) continue;
      const rx = STACK.h * (0.58 + 0.12 * mo.v), ry = STACK.h * (0.16 + 0.04 * mo.v);
      const x = STACK.x + Math.cos(a) * rx, y = STACK.y + STACK.h * 0.12 + sn * ry + mo.h * 50;
      const al = ringA * (front ? 0.95 : 0.45) * (0.55 + 0.45 * Math.sin(2 * Math.PI * 4 * t / T.clip + m * 1.7));
      const g = ctx.createRadialGradient(x, y, 0, x, y, mo.s * 2.6); g.addColorStop(0, `rgba(250,232,170,${al})`); g.addColorStop(0.35, `rgba(226,190,100,${al * 0.6})`); g.addColorStop(1, 'rgba(226,190,100,0)');
      ctx.fillStyle = g; ctx.fillRect(x - mo.s * 2.6, y - mo.s * 2.6, mo.s * 5.2, mo.s * 5.2);
    }
    ctx.restore();
  };
  ring(false);
  const list = [];
  cards.forEach((c, i) => {
    if (i === heroIdx && t >= C.pop && t < C.gather) return;   // 主角卡单独画（片尾在网格里正面朝上）
    const g = gridPos(i, push, orbit);
    // 发牌：从牌堆旋转着飞到格子，落下时一震
    const d0 = C.deal[i], df = 0.3;
    let p, z = 0, rot = 0, bump = 0;
    const stackP = { x: STACK.x + ((i * 37) % 5 - 2) * 0.8, y: STACK.y + (i - (n - 1) / 2) * 3.2, h: STACK.h, rot: ((i * 37) % 7 - 3) * 0.006 };
    if (i === 0) stackP.y -= 10 + 8 * Math.sin(2 * Math.PI * 3 * t / T.clip);   // 牌堆顶部的卡轻轻浮动（周期整除成片时长，首尾一致）
    if (t < d0) { p = stackP; z = -i; }
    else if (t < d0 + df) { const e = outCubic((t - d0) / df); p = lerpS(stackP, g, e); p.rot = ((i % 2 ? 1 : -1) * Math.PI * (1 - e)) * 1.1; p.y -= Math.sin(e * Math.PI) * 60; z = 100; }
    else { p = { ...g }; bump = Math.exp(-((t - d0 - df) / 0.07)) * (t - d0 - df < 0.35 ? 1 : 0); z = 10; }
    // 片尾：其他卡回到网格，然后 16 张收回成一叠
    if (t >= C.gather) { const e = inOut(clamp((t - C.gather) / (C.end - 0.04 - C.gather))); p = lerpS(g, stackP, e); p.rot = stackP.rot * e; z = -i; bump = 0; if (i === heroIdx) p.flip = clamp((t - C.gather) / 0.2); }
    let alpha = 1, glow = 0, sy = 1, h = p.h * (1 + 0.05 * bump), y = p.y + 4 * bump + gridLive * 4 * Math.sin(2 * Math.PI * 0.9 * t + i * 1.37), dark = 0.4, blur = 0, pool = 0;
    if (inStack || t < C.spin0) dark = 0;
    if (roulette || on[i] > 0.001) {
      // 被照到：向前弹起、放大 15%、向镜头倾斜约 12°、强光、底下一圈光；离开时回落。其他卡 60% 亮度
      const k = on[i];
      dark = 0.4 * (1 - k); glow = 1.6 * k; h *= 1 + 0.15 * k; y -= 34 * k; sy = 1 - 0.022 * k; z = k > 0.01 ? 200 + k : z; pool = k;
    }
    if (t >= C.pop) { dark = 0.75 * dimP; blur = 2.5 * dimP; h *= 1 - 0.1 * dimP; alpha = 1 - exitK; y += 30 * dimP + exitK * 260; }
    if (t >= C.backIn && t < C.gather) { const k = smooth(C.backIn, C.backIn + 0.33, t); dark = 0.75 * (1 - k) + 0.3 * k; blur = 2.5 * (1 - k);
      // 下一集的卡：一圈它那一类颜色的光
      if (c.type === T.nextType) { const kk = smooth(C.backIn + 0.15, C.backIn + 0.4, t) * (1 - smooth(C.gather, C.gather + 0.2, t)); dark *= 1 - kk; glow = 1.4 * kk * (0.85 + 0.15 * Math.sin(t * 9)); pool = 0.8 * kk; z = 150; }
    }
    list.push({ c, x: p.x, y, h, rot: p.rot, alpha, glow, sy, dark, blur, z, i, pool, gy: p.y, flip: p.flip });
  });
  list.sort((a, b) => a.z - b.z);
  for (const L of list) {
    if (L.pool > 0.01) {   // 卡底下投出的一圈光
      const w = L.h * 0.8, py = L.gy + L.h * 0.47;
      ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.translate(L.x, py); ctx.scale(1, 0.22);
      const gp = ctx.createRadialGradient(0, 0, 0, 0, 0, w * 0.95); gp.addColorStop(0, rgba(L.c.hex, 0.6 * L.pool)); gp.addColorStop(1, rgba(L.c.hex, 0));
      ctx.fillStyle = gp; ctx.beginPath(); ctx.arc(0, 0, w * 0.95, 0, Math.PI * 2); ctx.fill(); ctx.restore();
    }
    if (L.flip != null && L.flip < 1) { const sx = Math.cos(Math.PI * L.flip); drawCard(ctx, L.flip < 0.5 ? hero.front : L.c.back, L.x, L.y, L.h, L.rot, Math.max(0.03, Math.abs(sx)), L.alpha, { dark: 0 }); continue; }
    drawCard(ctx, L.c.back, L.x, L.y, L.h, L.rot, 1, L.alpha, { glow: L.glow, glowCol: L.c.hex, sy: L.sy, dark: L.dark, blur: L.blur, tilt: L.pool * 0.21 * (L.c.type === T.nextType && t >= C.backIn ? 0 : 1) });
  }
  ring(true);
  // 网格上的粒子闪烁（发牌后到弹出之前）
  if (gridLive > 0.01) {
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    for (let m = 0; m < 90; m++) {
      const mo = motes[m], i = m % 16, g = gridPos(i, push, orbit), tw = Math.max(0, Math.sin(2 * Math.PI * (0.6 + mo.v * 0.7) * t + m * 2.1));
      const x = g.x + Math.cos(mo.a) * g.h * 0.42, y = g.y + Math.sin(mo.a * 1.7) * g.h * 0.52, al = gridLive * Math.pow(tw, 4) * 0.8;
      if (al < 0.02) continue;
      const gr = ctx.createRadialGradient(x, y, 0, x, y, mo.s * 3); gr.addColorStop(0, `rgba(250,236,180,${al})`); gr.addColorStop(1, 'rgba(250,236,180,0)');
      ctx.fillStyle = gr; ctx.fillRect(x - mo.s * 3, y - mo.s * 3, mo.s * 6, mo.s * 6);
    }
    ctx.restore();
  }
  // 落下时的一圈小粒子
  ctx.save(); ctx.globalCompositeOperation = 'lighter';
  cards.forEach((c, i) => {
    const age = t - C.deal[i] - 0.3; if (age < 0 || age > 0.4 || t >= C.gather) return;
    const g = gridPos(i, push, orbit), k = age / 0.4;
    for (let m = 0; m < 14; m++) { const mo = motes[i * 14 + m], r = g.h * (0.45 + 0.5 * k * mo.v); ctx.fillStyle = rgba(mixHex(c.hex, '#E8D9A8', 0.5), 0.7 * (1 - k)); ctx.beginPath(); ctx.arc(g.x + Math.cos(mo.a) * r * 0.8, g.y + Math.sin(mo.a) * r, mo.s, 0, Math.PI * 2); ctx.fill(); }
  });
  ctx.restore();

  // ---- 主角卡
  const hs = gridPos(heroIdx, push, orbit), CEN = { x: 960, y: 594, h: 1080 * 0.8, rot: 0 };
  let gold = null;
  if (t >= C.pop && t < T.reveal) {
    // 弹出：旋转着飞到中央、放大到画面高度 75%，背面朝镜头，绿光一拍比一拍亮
    const e = inOut(clamp((t - C.pop) / (T.reveal - C.pop - 0.06)));
    const p = lerpS(hs, CEN, e); p.y -= Math.sin(e * Math.PI) * 90; p.rot = (1 - e) * Math.PI * 2 * 0.0;
    const spin = Math.cos(e * Math.PI * 2);
    const beats = Math.floor((t - C.pop) / T.e8 * 2 + 1e-6), pulse = Math.exp(-(((t - C.pop) / (T.e8 / 2)) % 1) * 4);
    const glow = 0.35 + 0.22 * Math.min(beats, 3) + 0.2 * pulse;
    drawCard(ctx, hero.backHi, p.x, p.y, p.h, p.rot, Math.max(0.03, Math.abs(spin)), 1, { glow, glowCol: hero.hex });
  } else if (t >= T.reveal && t < T.hit) {
    // 翻面亮相：0.12 秒猛地翻到正面；正对镜头、正中央、不模糊；绿光和冲击波在卡的外面
    const k = clamp((t - T.reveal) / 0.12), sx = Math.cos(Math.PI * k), front = k >= 0.5;
    const hold = t - T.reveal;
    const rush = clamp((t - C.rush) / (T.hit - C.rush));
    const zoom = (1 + 0.03 * smooth(0.12, T.hit - T.reveal, hold)) * (1 + 3.2 * Math.pow(rush, 2.0));
    const a = 1 - smooth(0.3, 1, rush);
    // 外圈绿光 + 冲击波（画在卡后面，不盖卡面）
    if (front) {
      const age = hold - 0.06, w = CEN.h * 0.8;
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      for (let r = 0; r < 2; r++) { const ag = age - r * 0.08; if (ag < 0 || ag > 0.7) continue; const rk = ag / 0.7; ctx.strokeStyle = rgba(hero.hex, 0.55 * (1 - rk)); ctx.lineWidth = 10 * (1 - rk) + 1; rr(CEN.x - w / 2 - 20 - rk * 420, CEN.y - CEN.h / 2 - 20 - rk * 420, w + 40 + rk * 840, CEN.h + 40 + rk * 840, 60 + rk * 200, ctx); ctx.stroke(); }
      const gk = Math.exp(-Math.max(0, age) / 0.25);
      const gg = ctx.createRadialGradient(CEN.x, CEN.y, CEN.h * 0.3, CEN.x, CEN.y, CEN.h * 0.95); gg.addColorStop(0, rgba(hero.hex, 0.35 * gk + 0.08)); gg.addColorStop(1, rgba(hero.hex, 0));
      ctx.fillStyle = gg; ctx.fillRect(0, 0, 1920, 1080);
      ctx.restore();
    }
    const cx = CEN.x, cy = CEN.y, h = CEN.h * zoom;
    drawCard(ctx, front ? hero.front : hero.backHi, cx, cy, h, 0, Math.max(0.03, Math.abs(sx)), a, { glow: front ? 0.6 * a : 1, glowCol: hero.hex });
    if (front && a > 0.01) {
      // 卡面上：全息光泽扫过一次、狼的眼睛一闪一闪（翻面那一拍亮起）
      const w = h * 0.8, sxS = w / 1080, x0 = cx - w / 2, y0 = cy - h / 2;
      ctx.save(); rr(x0, y0, w, h, h * 0.03, ctx); ctx.clip(); ctx.globalAlpha = a;
      const sw = smooth(0.25, T.hit - T.reveal - 0.2, hold);
      if (sw > 0 && sw < 1) { ctx.globalCompositeOperation = 'screen'; ctx.translate(x0 + lerp(-0.3, 1.3, sw) * w, cy); ctx.rotate(-0.62);
        const bw = w * 0.5, g2 = ctx.createLinearGradient(-bw / 2, 0, bw / 2, 0); ['#FF3D8B', '#FFC23D', '#2BE36B', '#3AA8FF', '#A24BFF', '#FF3D8B'].forEach((col, i, arr) => g2.addColorStop(i / 5, rgba(col, 0.16)));
        ctx.fillStyle = g2; ctx.fillRect(-bw / 2, -h, bw, h * 2); ctx.setTransform(1, 0, 0, 1, 0, 0); }
      ctx.globalCompositeOperation = 'lighter';
      const flare = Math.exp(-Math.max(0, hold - 0.06) / 0.18), tw = 0.75 + 0.25 * Math.sin(hold * 12) * Math.sin(hold * 5.3);
      for (const [ex, ey] of hero.frontMeta.eyes ?? []) {
        const X = x0 + ex * sxS, Y = y0 + ey * sxS, R0 = (10 + 26 * flare) * sxS * (front ? 1 : 0);
        const g3 = ctx.createRadialGradient(X, Y, 0, X, Y, R0 * 3); g3.addColorStop(0, `rgba(225,255,235,${(0.5 * tw + 0.5 * flare) * a})`); g3.addColorStop(0.3, rgba(hero.hex, 0.45 * (tw * 0.6 + flare) * a)); g3.addColorStop(1, rgba(hero.hex, 0));
        ctx.fillStyle = g3; ctx.fillRect(X - R0 * 3, Y - R0 * 3, R0 * 6, R0 * 6);
      }
      ctx.restore();
    }
    if (rush > 0) gold = { cx, cy, h, k: -rush, a: 1 - rush * 0.7 };
  } else if (t >= T.outro && t < C.gather) {
    // 结尾：狼和月亮缩小，金色粒子聚成卡框，定格成收藏卡（卡下方是问句）；下一个小节第一拍飞回网格，保持正面朝上
    const CEN2 = { x: 960, y: 462, h: 1080 * 0.68, rot: 0 };
    const form = clamp((t - T.outro) / (C.cardHold - T.outro)), e = outCubic(form);
    if (t < C.backIn) {
      // 定格的收藏卡也不能静止：极轻的推近、全息光泽扫过、眼睛一闪一闪、四周金色粒子缓缓飘动
      const hold = clamp((t - C.cardHold) / (C.backIn - C.cardHold));
      const h = lerp(1080 * 2.4, CEN2.h, e) * (1 + 0.035 * hold), a = smooth(0, 0.45, form);
      drawCard(ctx, hero.front, CEN2.x, CEN2.y, h, 0, 1, a, { glow: (0.45 + 0.12 * Math.sin(t * 5)) * a, glowCol: hero.hex });
      if (form < 1) gold = { cx: CEN2.x, cy: CEN2.y, h, k: 1 - form, a: smooth(0, 0.3, form) };
      if (form >= 1) {
        const w = h * 0.8, x0 = CEN2.x - w / 2, y0 = CEN2.y - h / 2, sxS = w / 1080;
        ctx.save(); rr(x0, y0, w, h, h * 0.03, ctx); ctx.clip();
        const sw = clamp((t - C.cardHold) / 1.4);
        if (sw > 0 && sw < 1) { ctx.globalCompositeOperation = 'screen'; ctx.translate(x0 + lerp(-0.3, 1.3, sw) * w, CEN2.y); ctx.rotate(-0.62);
          const bw = w * 0.5, g2 = ctx.createLinearGradient(-bw / 2, 0, bw / 2, 0); ['#FF3D8B', '#FFC23D', '#2BE36B', '#3AA8FF', '#A24BFF', '#FF3D8B'].forEach((col, i) => g2.addColorStop(i / 5, rgba(col, 0.18)));
          ctx.fillStyle = g2; ctx.fillRect(-bw / 2, -h, bw, h * 2); ctx.setTransform(1, 0, 0, 1, 0, 0); }
        ctx.globalCompositeOperation = 'lighter';
        const tw = 0.6 + 0.4 * Math.sin(t * 9) * Math.sin(t * 4.1);
        for (const [ex, ey] of hero.frontMeta.eyes ?? []) { const X = x0 + ex * sxS, Y = y0 + ey * sxS, R0 = 14 * sxS;
          const g3 = ctx.createRadialGradient(X, Y, 0, X, Y, R0 * 3); g3.addColorStop(0, `rgba(225,255,235,${0.55 * tw})`); g3.addColorStop(0.3, rgba(hero.hex, 0.4 * tw)); g3.addColorStop(1, rgba(hero.hex, 0));
          ctx.fillStyle = g3; ctx.fillRect(X - R0 * 3, Y - R0 * 3, R0 * 6, R0 * 6); }
        ctx.restore();
        ctx.save(); ctx.globalCompositeOperation = 'lighter';
        for (let m = 0; m < 160; m++) { const b = border[m * 5], ang = b.a + t * (0.25 + 0.3 * b.v), rx = w * (0.62 + 0.12 * b.v), ry = h * (0.56 + 0.08 * b.v);
          const x = CEN2.x + Math.cos(ang) * rx, y = CEN2.y + Math.sin(ang) * ry, al = 0.35 + 0.35 * Math.sin(t * 6 + b.ph * 20);
          ctx.fillStyle = `rgba(236,214,150,${al})`; ctx.beginPath(); ctx.arc(x, y, b.s, 0, Math.PI * 2); ctx.fill(); }
        ctx.restore();
      }
    } else {
      const fly = inOut(clamp((t - C.backIn) / 0.33));
      const p = lerpS(CEN2, hs, fly);
      drawCard(ctx, hero.front, p.x, p.y, p.h, 0, 1, 1, { glow: lerp(0.5, 0.35, fly), glowCol: hero.hex });
    }
  }
  if (gold) {
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    for (const b of border) {
      const off = Math.abs(gold.k), d = off * (300 + 500 * b.v);
      const x = gold.cx + b.x * gold.h + Math.cos(b.a) * d, y = gold.cy + b.y * gold.h + Math.sin(b.a) * d;
      const al = gold.a * (0.5 + 0.5 * Math.sin(t * 20 + b.ph * 30)) * (gold.k < 0 ? 1 - off * 0.8 : 1 - off * 0.6);
      if (al <= 0.01) continue;
      ctx.fillStyle = `rgba(232,210,140,${al})`; ctx.beginPath(); ctx.arc(x, y, b.s, 0, Math.PI * 2); ctx.fill();
    }
    ctx.restore();
  }
}
