// 第二幕 · 4.2–11.3 秒：门的矩形变成外卖菜单卡片，一路往下滑；
// 一张卡片变成衣服吊牌：黑 / 白 / 灰 / 深蓝，旁边越来越多；
// 最后全部缩进购物车，数字一直涨——已下单：0。
const { W, H } = require('../../../src/config');
const { C, FONT } = require('../../../src/lib/style');
const { pencil, typeText, rectPts, sketchEllipse } = require('../../../src/lib/draw');
const { prog, smooth, easeInOut, easeOut, easeIn, lerp, rng } = require('../../../src/lib/util');
const props = require('../../../src/lib/props');
const doors = require('./c1_doors');

const S = { start: 4.2, end: 11.4 };

const PHONE = { x: 960, top: 110, bottom: 890, w: 470 };
const LIST_TOP = 248, CARD_W = 400, CARD_H = 112, STEP = 128;
const SHOPS = ['老王面馆', '川味小厨', '轻食沙拉', '麻辣烫', '牛肉饭', '寿司小屋', '东北饺子', '汉堡', '砂锅粥', '烧烤', '过桥米线', '炸鸡',
  '日式便当', '披萨', '黄焖鸡', '酸菜鱼', '煲仔饭', '螺蛳粉', '凉皮', '馄饨', '盖浇饭', '咖喱', '韩式拌饭', '烤鸭'];
const R = rng(303);
const META = SHOPS.map(() => ({ star: (4.3 + R() * 0.6).toFixed(1), min: 20 + Math.floor(R() * 25), price: 15 + Math.floor(R() * 30) }));

const PAPER = [221, 211, 186], WOOD = [44, 33, 25];
const mix = (a, b, k) => `rgb(${a.map((v, i) => Math.round(lerp(v, b[i], k))).join(',')})`;

// 菜单滚动：0 → 46 张卡片，中段很快
const SCROLL_END = 46;
function scroll(t) { return SCROLL_END * easeInOut(prog(t, 4.95, 6.45)); }
function speed(t) { return (scroll(t + 1 / 60) - scroll(t - 1 / 60)) * 30; }

function slotRect(j, off) {
  return { x: PHONE.x, y: LIST_TOP + (j - off) * STEP + CARD_H / 2, w: CARD_W, h: CARD_H };
}

function bowl(ctx, x, y, s, t, seed) {
  pencil(ctx, [[x - 26 * s, y - 4 * s], [x + 26 * s, y - 4 * s]], { seed, t, width: 1.4, color: C.graphite, passes: 1 });
  pencil(ctx, [[x - 26 * s, y - 4 * s], [x - 18 * s, y + 14 * s], [x + 18 * s, y + 14 * s], [x + 26 * s, y - 4 * s]], { seed: seed + 1, t, width: 1.4, color: C.graphite, passes: 1 });
  pencil(ctx, [[x - 6 * s, y - 10 * s], [x - 2 * s, y - 22 * s]], { seed: seed + 2, t, width: 1, color: C.graphiteSoft, passes: 1 });
  pencil(ctx, [[x + 6 * s, y - 10 * s], [x + 10 * s, y - 22 * s]], { seed: seed + 3, t, width: 1, color: C.graphiteSoft, passes: 1 });
}

function menuCard(ctx, r, i, t, contentA) {
  ctx.save();
  ctx.translate(r.x, r.y);
  props.paper(ctx, r.w, r.h, { color: '#ddd2b8', shadow: 0.35 });
  if (contentA > 0) {
    ctx.globalAlpha *= contentA;
    const k = i % SHOPS.length, m = META[k];
    ctx.strokeStyle = 'rgba(60,45,35,0.35)';
    ctx.strokeRect(-r.w / 2 + 14, -r.h / 2 + 14, 84, 84);
    bowl(ctx, -r.w / 2 + 56, 6, 1, t, 330 + k);
    ctx.font = FONT.serif(30);
    ctx.fillStyle = C.ink;
    ctx.fillText(SHOPS[k], -r.w / 2 + 116, -8);
    ctx.font = FONT.serif(20);
    ctx.fillStyle = C.gray;
    ctx.fillText(`${m.star} 分 · ${m.min} 分钟 · ¥${m.price} 起`, -r.w / 2 + 116, 30);
  }
  ctx.restore();
}

function phoneFrame(ctx, t, a) {
  if (a <= 0) return;
  const p = prog(t, 4.45, 5.0);
  const x0 = PHONE.x - PHONE.w / 2, w = PHONE.w, top = PHONE.top, h = PHONE.bottom - PHONE.top;
  ctx.save();
  ctx.globalAlpha *= a;
  ctx.fillStyle = `rgba(20,15,11,${0.55 * smooth(prog(t, 4.5, 5.0))})`;
  ctx.fillRect(x0, top, w, h);
  pencil(ctx, rectPts(x0, top, w, h), { seed: 401, t, width: 2.4, color: C.light, progress: p });
  pencil(ctx, [[PHONE.x - 40, top + 22], [PHONE.x + 40, top + 22]], { seed: 402, t, width: 3, color: C.lightSoft, progress: p });
  ctx.globalAlpha *= smooth(prog(t, 4.8, 5.1));
  ctx.font = FONT.serif(28);
  ctx.fillStyle = C.sub;
  ctx.fillText('附近外卖', x0 + 34, top + 92);
  ctx.font = FONT.serif(24);
  ctx.textAlign = 'right';
  ctx.fillStyle = C.lightText;
  const seen = Math.min(SHOPS.length * 3, 1 + Math.floor(scroll(t) + 3));
  ctx.fillText(`已看 ${seen} 家`, x0 + w - 34, top + 92);
  ctx.restore();
}

function drawMenu(ctx, t) {
  const out = 1 - smooth(prog(t, 6.55, 7.0));
  if (out <= 0) return;
  phoneFrame(ctx, t, out);
  const m = easeInOut(prog(t, 4.25, 4.9));
  const off = scroll(t);
  const v = Math.abs(speed(t));
  ctx.save();
  ctx.beginPath();
  ctx.rect(PHONE.x - PHONE.w / 2, LIST_TOP - 10, PHONE.w, PHONE.bottom - LIST_TOP - 6);
  if (m >= 1) ctx.clip();
  if (v > 8) ctx.filter = `blur(${Math.min(3, v / 14).toFixed(1)}px)`;
  const first = Math.max(0, Math.floor(off) - 1);
  for (let i = first; i < first + 7; i++) {
    const slot = slotRect(i, off);
    if (i === 2 + SCROLL_END && t > 6.45) continue; // 这张卡片会飞出去变成吊牌
    let r = slot, color = null;
    if (m < 1 && i < doors.MENU_DOORS.length) {
      // 先横向收拢成一列，再纵向排开成菜单
      const d = doors.doorRect(doors.MENU_DOORS[i]);
      const kx = easeInOut(prog(t, 4.2, 4.6)), ky = easeInOut(prog(t, 4.42, 4.9));
      r = { x: lerp(d.x, slot.x, kx), y: lerp(d.y, slot.y, ky), w: lerp(d.w, slot.w, ky), h: lerp(d.h, slot.h, ky) };
      color = mix(WOOD, PAPER, m);
    } else if (m < 1) continue;
    ctx.save();
    ctx.globalAlpha *= out;
    if (color) {
      ctx.fillStyle = color;
      ctx.fillRect(r.x - r.w / 2, r.y - r.h / 2, r.w, r.h);
      if (m > 0.8) menuCard(ctx, r, i, t, 0);
    } else {
      menuCard(ctx, r, i, t, smooth(prog(t, 4.8, 5.1)));
    }
    ctx.restore();
  }
  ctx.restore();
}

// 吊牌
const ROD_Y = 300;
const TAGS = [
  { x: 600, name: '黑色', col: '#1e1b19' },
  { x: 840, name: '白色', col: '#e6e0d4' },
  { x: 1080, name: '灰色', col: '#77736c' },
  { x: 1320, name: '深蓝', col: '#2a3446' },
];
const MORE = [
  { x: 380, y: 0, col: '#8a7a5c' }, { x: 1540, y: 0, col: '#5c4a3c' }, { x: 250, y: 60, col: '#46505a' }, { x: 1670, y: 60, col: '#6a6a5a' },
  { x: 470, y: 120, col: '#a39e92' }, { x: 1450, y: 120, col: '#3b3531' }, { x: 160, y: 150, col: '#58616a' }, { x: 1760, y: 150, col: '#7d6a55' },
];
const TAG_W = 190, TAG_H = 270;

function shirt(ctx, col, s) {
  ctx.save();
  ctx.scale(s, s);
  ctx.fillStyle = col;
  ctx.strokeStyle = 'rgba(40,30,22,0.6)';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(-22, -40); ctx.quadraticCurveTo(0, -30, 22, -40);
  ctx.lineTo(52, -26); ctx.lineTo(42, -4); ctx.lineTo(30, -10);
  ctx.lineTo(30, 42); ctx.lineTo(-30, 42); ctx.lineTo(-30, -10);
  ctx.lineTo(-42, -4); ctx.lineTo(-52, -26); ctx.closePath();
  ctx.fill(); ctx.stroke();
  ctx.restore();
}

function tag(ctx, w, h, col, name, t) {
  props.paper(ctx, w, h, { color: '#ddd2b8', shadow: 0.45 });
  ctx.fillStyle = '#1b1512';
  ctx.beginPath(); ctx.arc(0, -h / 2 + 18, 7, 0, Math.PI * 2); ctx.fill();
  shirt(ctx, col, w / 190);
  ctx.save();
  ctx.translate(0, -h * 0.12);
  ctx.restore();
  if (name) {
    ctx.font = FONT.serif(Math.round(32 * w / 190));
    ctx.fillStyle = C.ink;
    ctx.textAlign = 'center';
    ctx.fillText(name, 0, h * 0.3);
    ctx.font = FONT.type(Math.round(20 * w / 190));
    ctx.fillStyle = C.gray;
    ctx.fillText('¥199', 0, h * 0.42);
  }
  void t;
}

// 吊牌飞进购物车
const CART = { x: 960, y: 560 };
function intoCart(t, i) {
  const at = 8.6 + i * 0.07;
  return easeIn(prog(t, at, at + 0.4));
}

function drawTags(ctx, t) {
  if (t < 6.5 || t > 9.6) return;
  const rodA = smooth(prog(t, 6.8, 7.2)) * (1 - smooth(prog(t, 8.5, 8.8)));
  pencil(ctx, [[420, ROD_Y], [1500, ROD_Y]], { seed: 501, t, width: 2.4, color: C.light, alpha: rodA });
  // 更多款式（在后面、更暗、更小）
  MORE.forEach((m, i) => {
    const a = smooth(prog(t, 7.6 + i * 0.08, 8.0 + i * 0.08));
    const f = intoCart(t, i + 4);
    if (a <= 0 || f >= 1) return;
    ctx.save();
    ctx.globalAlpha *= a * 0.75 * (1 - f);
    ctx.translate(lerp(m.x, CART.x, f), lerp(ROD_Y + 150 + m.y, CART.y, f));
    ctx.rotate(Math.sin(t * 1.5 + i) * 0.03);
    ctx.scale(lerp(0.62, 0.12, f), lerp(0.62, 0.12, f));
    tag(ctx, TAG_W, TAG_H, m.col, null, t);
    ctx.restore();
  });
  TAGS.forEach((g, i) => {
    let x = g.x, y = ROD_Y + 40 + TAG_H / 2, s = 1, a = 1;
    if (i === 0) {
      // 从菜单卡片变来
      const m = easeInOut(prog(t, 6.45, 7.05));
      const from = slotRect(2 + SCROLL_END, SCROLL_END);
      x = lerp(from.x, g.x, m); y = lerp(from.y, y, m);
      s = lerp(CARD_W / TAG_W, 1, m);
    } else {
      a = smooth(prog(t, 6.85 + i * 0.13, 7.2 + i * 0.13));
      y -= (1 - a) * 30;
    }
    const f = intoCart(t, i);
    if (a <= 0 || f >= 1) return;
    ctx.save();
    ctx.globalAlpha *= a * (1 - f * 0.8);
    // 吊绳
    if (i > 0 || t > 7.05) pencil(ctx, [[g.x, ROD_Y], [x, y - TAG_H / 2 + 18]], { seed: 510 + i, t, width: 1.2, color: C.lightSoft, alpha: 1 - f, passes: 1 });
    ctx.translate(lerp(x, CART.x, f), lerp(y, CART.y, f));
    ctx.rotate(Math.sin(t * 1.6 + i * 1.3) * 0.035 * (1 - f));
    const sc = lerp(1, 0.12, f);
    if (i === 0 && t < 7.05) {
      const m = easeInOut(prog(t, 6.45, 7.05));
      ctx.scale(lerp(1, 1, m), 1);
      const w = lerp(CARD_W, TAG_W, m), h = lerp(CARD_H, TAG_H, m);
      ctx.save();
      props.paper(ctx, w, h, { color: '#ddd2b8', shadow: 0.4 });
      ctx.restore();
      if (m > 0.6) { ctx.globalAlpha *= (m - 0.6) / 0.4; tag(ctx, w, h, g.col, g.name, t); }
    } else {
      ctx.scale(sc, sc);
      tag(ctx, TAG_W, TAG_H, g.col, g.name, t);
    }
    ctx.restore();
  });
}

// 购物车
const COUNTS = [[8.85, 3], [9.05, 7], [9.25, 12], [9.45, 17]];
function drawCart(ctx, t) {
  const p = prog(t, 8.45, 8.95);
  if (p <= 0) return;
  const out = 1 - smooth(prog(t, 10.9, 11.35));
  const s = lerp(1, 0.45, easeInOut(prog(t, 10.9, 11.35)));
  ctx.save();
  ctx.globalAlpha *= out;
  ctx.translate(CART.x, CART.y);
  ctx.scale(s, s);
  ctx.translate(-CART.x, -CART.y);
  const o = { t, width: 3, color: C.light, progress: p };
  pencil(ctx, [[790, 440], [828, 440], [858, 620], [1078, 620]], { ...o, seed: 601 });
  pencil(ctx, [[836, 480], [1120, 480], [1092, 580], [850, 580]], { ...o, seed: 602 });
  for (let i = 1; i < 6; i++) pencil(ctx, [[836 + i * 47, 480], [850 + i * 41, 580]], { ...o, seed: 603 + i, width: 1.4, color: C.lightSoft });
  sketchEllipse(ctx, 880, 650, 18, 18, { ...o, seed: 610 });
  sketchEllipse(ctx, 1056, 650, 18, 18, { ...o, seed: 611 });
  // 角标
  let n = 0, at = 0;
  for (const [ct, cn] of COUNTS) if (t >= ct) { n = cn; at = ct; }
  if (n > 0) {
    const pulse = 1 + 0.18 * Math.exp(-(t - at) / 0.08);
    ctx.save();
    ctx.translate(1132, 452);
    ctx.scale(pulse, pulse);
    ctx.fillStyle = C.red;
    ctx.beginPath(); ctx.arc(0, 0, 32, 0, Math.PI * 2); ctx.fill();
    ctx.font = FONT.type(34);
    ctx.fillStyle = '#efe4cf';
    ctx.textAlign = 'center';
    ctx.fillText(String(n), 0, 12);
    ctx.restore();
  }
  // 已下单：0
  const tp = (a0, a1) => prog(t, a0, a1);
  typeText(ctx, '购物车   17 件', 960, 730, { font: FONT.serif(32), color: C.lightText, progress: tp(9.7, 10.0), align: 'center', seed: 620 });
  typeText(ctx, '已下单    0 件', 960, 786, { font: FONT.serif(32), color: C.sub, progress: tp(10.1, 10.45), align: 'center', seed: 621 });
  if (t > 10.5) pencil(ctx, [[1010, 798], [1040, 798]], { seed: 622, t, width: 2.4, color: C.subRed, progress: tp(10.5, 10.7), passes: 1 });
  ctx.restore();
}

function draw(ctx, t) {
  drawMenu(ctx, t);
  drawTags(ctx, t);
  drawCart(ctx, t);
}

function light(t) {
  const a = easeInOut(prog(t, 6.5, 7.1));
  const b = easeInOut(prog(t, 8.5, 9.0));
  return {
    x: 960, y: lerp(lerp(500, 470, a), 600, b), rx: lerp(lerp(560, 960, a), 640, b), ry: lerp(lerp(520, 420, a), 430, b),
    i: 1, w: smooth(prog(t, 4.25, 4.9)) * (1 - smooth(prog(t, 10.9, 11.4))),
  };
}

module.exports = { ...S, draw, light, CART };
