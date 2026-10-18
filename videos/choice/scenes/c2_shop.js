// 第二幕 · 4.2–11.3 秒：
//   门 → 平放在桌上的手机：外卖列表被一次次甩动，越滑越快，一家都没点；
//   一行店名飞出屏幕，变成衣服吊牌：黑 / 白 / 灰 / 深蓝，更多款式从四周挤进来；
//   吊牌缩进一张手写便签：购物车 3 → 7 → 12 → 17，已下单 0。
const { W, H } = require('../../../src/config');
const { C, FONT } = require('../../../src/lib/style');
const { pencil, typeText, sketchEllipse } = require('../../../src/lib/draw');
const { prog, smooth, easeInOut, easeIn, lerp, rng } = require('../../../src/lib/util');
const { spring, glide, pendulum } = require('../../../src/lib/motion');
const { sheet, inkText, filtered } = require('../../../src/lib/material');
const { jit } = require('../lib');
const doors = require('./c1_doors');

const S = { start: 4.2, end: 11.5 };

// ---------------- 手机 ----------------
const PHONE = { x: 1205, y: 545, w: 470, h: 900, rot: -0.045 };
const SCR = { w: 430, h: 860, top: 130 };    // 屏幕（相对手机中心），列表从 top 开始
const ROW = 128;
const SHOPS = ['老王面馆', '川味小厨', '轻食沙拉', '麻辣烫', '牛肉饭', '寿司小屋', '东北饺子', '汉堡', '砂锅粥', '烧烤', '过桥米线', '炸鸡',
  '日式便当', '披萨', '黄焖鸡', '酸菜鱼', '煲仔饭', '螺蛳粉', '凉皮', '馄饨', '盖浇饭', '咖喱', '韩式拌饭', '烤鸭'];
const R = rng(303);
const META = SHOPS.map(() => ({ star: (4.3 + R() * 0.6).toFixed(1), min: 20 + Math.floor(R() * 25), price: 15 + Math.floor(R() * 30) }));

// 一次次「甩」：每次有初速度，被摩擦拖住
function scroll(t) {
  return glide(t, 4.95, 5, 2.6) + glide(t, 5.4, 22, 2.4) + glide(t, 5.85, 120, 3.8);
}
// 被选中飞出去的那一行：甩停时屏幕中间那一家
const PICK = Math.floor(scroll(6.45)) + 2;
function speed(t) { return (scroll(t + 1 / 60) - scroll(t - 1 / 60)) * 30; }

// 手机本地坐标 → 屏幕坐标
function phoneToScreen(x, y) {
  const c = Math.cos(PHONE.rot), s = Math.sin(PHONE.rot);
  return [PHONE.x + x * c - y * s, PHONE.y + x * s + y * c];
}

function foodSketch(ctx, k, t) {
  const o = { t, width: 1.5, color: 'rgba(60,48,40,0.8)', passes: 1, pressure: 0.5 };
  const v = k % 3;
  if (v === 0) {
    pencil(ctx, [[-30, -4], [30, -4], [22, 16], [-22, 16], [-30, -4]], { ...o, seed: 330 + k });
    pencil(ctx, [[-6, -12], [-2, -26]], { ...o, seed: 340 + k, width: 1 });
    pencil(ctx, [[8, -12], [12, -26]], { ...o, seed: 350 + k, width: 1 });
  } else if (v === 1) {
    sketchEllipse(ctx, 0, 4, 30, 16, { ...o, seed: 360 + k });
    sketchEllipse(ctx, -6, 0, 9, 6, { ...o, seed: 370 + k, width: 1 });
  } else {
    pencil(ctx, [[-28, 12], [0, -20], [28, 12], [-28, 12]], { ...o, seed: 380 + k });
    pencil(ctx, [[-10, 2], [10, 2]], { ...o, seed: 390 + k, width: 1 });
  }
}

function row(ctx, i, y, t) {
  const k = i % SHOPS.length, m = META[k];
  const x0 = -SCR.w / 2;
  ctx.fillStyle = 'rgba(80,66,52,0.07)';
  ctx.fillRect(x0 + 22, y + 16, 96, 96);
  ctx.save();
  ctx.translate(x0 + 70, y + 66);
  foodSketch(ctx, k, t);
  ctx.restore();
  ctx.font = FONT.serif(34);
  ctx.fillStyle = '#2a221c';
  ctx.fillText(SHOPS[k], x0 + 140, y + 58);
  ctx.font = FONT.body(22);
  ctx.fillStyle = '#7a6d60';
  ctx.fillText(`${m.star} 分 · ${m.min} 分钟 · ¥${m.price} 起`, x0 + 140, y + 96);
  ctx.fillStyle = 'rgba(80,66,52,0.14)';
  ctx.fillRect(x0 + 22, y + ROW - 1, SCR.w - 44, 1);
}

function drawPhone(ctx, t) {
  const appear = spring(t, 4.35, 1.6, 0.95);
  const out = 1 - smooth(prog(t, 6.6, 7.05));
  if (out <= 0) return;
  ctx.save();
  ctx.globalAlpha *= out;
  ctx.translate(PHONE.x, PHONE.y);
  ctx.rotate(PHONE.rot);
  // 机身：贴着桌面的投影 + 深色机身 + 一圈很细的金属反光
  ctx.save();
  ctx.globalAlpha *= Math.min(1, appear * 1.3);
  ctx.shadowColor = 'rgba(0,0,0,0.7)';
  ctx.shadowBlur = 40; ctx.shadowOffsetX = 18; ctx.shadowOffsetY = 26;
  roundRect(ctx, -PHONE.w / 2, -PHONE.h / 2, PHONE.w, PHONE.h, 54);
  ctx.fillStyle = '#121010';
  ctx.fill();
  ctx.restore();
  ctx.save();
  ctx.globalAlpha *= Math.min(1, appear * 1.3);
  roundRect(ctx, -PHONE.w / 2, -PHONE.h / 2, PHONE.w, PHONE.h, 54);
  ctx.strokeStyle = 'rgba(200,186,160,0.35)';
  ctx.lineWidth = 1.6;
  ctx.stroke();
  // 屏幕
  roundRect(ctx, -SCR.w / 2, -SCR.h / 2, SCR.w, SCR.h, 36);
  ctx.clip();
  const sg = ctx.createLinearGradient(0, -SCR.h / 2, 0, SCR.h / 2);
  sg.addColorStop(0, '#e6dfd0');
  sg.addColorStop(1, '#d9d0bf');
  ctx.fillStyle = sg;
  ctx.globalAlpha *= smooth(prog(t, 4.45, 4.95));
  ctx.fillRect(-SCR.w / 2, -SCR.h / 2, SCR.w, SCR.h);
  // 列表
  const off = scroll(t);
  const v = Math.abs(speed(t));
  const first = Math.max(0, Math.floor(off) - 1);
  const rows = (c) => {
    for (let i = first; i < first + 9; i++) {
      if (t > 6.45 && i === PICK) continue;
      const y = -SCR.h / 2 + SCR.top + (i - off) * ROW;
      if (y > SCR.h / 2 || y < -SCR.h / 2 - ROW) continue;
      row(c, i, y, t);
    }
  };
  // 甩得快时整列一起运动模糊（离屏画好后只模糊一次）
  if (v > 6) filtered(ctx, `blur(${Math.min(4, v / 9).toFixed(1)}px)`, rows);
  else rows(ctx);
  // 顶栏
  ctx.fillStyle = '#e3dccc';
  ctx.fillRect(-SCR.w / 2, -SCR.h / 2, SCR.w, SCR.top - 12);
  ctx.font = FONT.serif(30);
  ctx.fillStyle = '#2a221c';
  ctx.fillText('附近外卖', -SCR.w / 2 + 26, -SCR.h / 2 + 84);
  ctx.font = FONT.body(22);
  ctx.textAlign = 'right';
  ctx.fillStyle = '#7a6d60';
  ctx.fillText(`已看 ${Math.floor(off) + 5} 家`, SCR.w / 2 - 26, -SCR.h / 2 + 84);
  ctx.textAlign = 'left';
  // 玻璃上的一道斜反光
  const gl = ctx.createLinearGradient(-SCR.w / 2, -SCR.h / 2, SCR.w / 2, SCR.h / 2);
  gl.addColorStop(0.18, 'rgba(255,255,255,0)');
  gl.addColorStop(0.26, 'rgba(255,255,255,0.09)');
  gl.addColorStop(0.36, 'rgba(255,255,255,0)');
  ctx.fillStyle = gl;
  ctx.fillRect(-SCR.w / 2, -SCR.h / 2, SCR.w, SCR.h);
  ctx.restore();
  ctx.restore();
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

// 门 → 屏幕上的列表行：先收拢成一列，再落进手机
function drawMorph(ctx, t) {
  if (t > 4.95) return;
  const kx = spring(t, 4.22, 1.9, 0.95), ky = spring(t, 4.4, 1.7, 1.0);
  doors.MENU_DOORS.forEach((di, j) => {
    const d = doors.doorRect(di);
    const ly = -SCR.h / 2 + SCR.top + j * ROW + ROW / 2;
    const [tx, ty] = phoneToScreen(0, ly);
    const x = lerp(d.x, tx, Math.min(1, kx)), y = lerp(d.y, ty, Math.min(1, ky));
    const w = lerp(d.w, SCR.w - 44, Math.min(1, ky)), h = lerp(d.h, ROW - 10, Math.min(1, ky));
    const col = [44, 34, 26].map((v, i) => Math.round(lerp(v, [226, 218, 204][i], smooth(prog(t, 4.3, 4.75)))));
    ctx.save();
    ctx.globalAlpha *= 1 - smooth(prog(t, 4.75, 4.95));
    ctx.translate(x, y);
    ctx.rotate(PHONE.rot * Math.min(1, ky));
    ctx.fillStyle = `rgb(${col.join(',')})`;
    ctx.fillRect(-w / 2, -h / 2, w, h);
    ctx.restore();
  });
}

// ---------------- 吊牌 ----------------
const ROD = [[300, 236], [1580, 214]];
const rodY = (x) => lerp(ROD[0][1], ROD[1][1], (x - ROD[0][0]) / (ROD[1][0] - ROD[0][0]));
const TAGS = [
  { x: 640, len: 44, name: '黑色', col: [30, 27, 25], at: 6.6 },
  { x: 872, len: 70, name: '白色', col: [228, 222, 210], at: 6.92 },
  { x: 1098, len: 52, name: '灰色', col: [118, 114, 106], at: 7.08 },
  { x: 1336, len: 78, name: '深蓝', col: [40, 50, 70], at: 7.24 },
];
const MORE = [
  { x: 420, len: 30, col: [138, 122, 92], at: 7.6 }, { x: 1520, len: 40, col: [92, 74, 60], at: 7.68 },
  { x: 300, len: 90, col: [70, 80, 90], at: 7.78 }, { x: 1650, len: 96, col: [106, 106, 90], at: 7.86 },
  { x: 500, len: 120, col: [163, 158, 146], at: 7.94 }, { x: 1460, len: 126, col: [59, 53, 49], at: 8.02 },
  { x: 760, len: 140, col: [88, 97, 106], at: 8.1 }, { x: 1220, len: 150, col: [125, 106, 85], at: 8.16 },
];
const TAG_W = 178, TAG_H = 262;

function shirt(ctx, col, s) {
  ctx.save();
  ctx.scale(s, s);
  const [r, g, b] = col;
  const grad = ctx.createLinearGradient(-50, -40, 50, 40);
  grad.addColorStop(0, `rgb(${Math.min(255, r + 18)},${Math.min(255, g + 18)},${Math.min(255, b + 18)})`);
  grad.addColorStop(1, `rgb(${Math.max(0, r - 14)},${Math.max(0, g - 14)},${Math.max(0, b - 14)})`);
  ctx.fillStyle = grad;
  ctx.strokeStyle = 'rgba(40,30,22,0.55)';
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.moveTo(-20, -38); ctx.quadraticCurveTo(0, -27, 20, -38);
  ctx.lineTo(50, -24); ctx.lineTo(40, -3); ctx.lineTo(29, -9);
  ctx.lineTo(30, 40); ctx.quadraticCurveTo(0, 44, -30, 40); ctx.lineTo(-29, -9);
  ctx.lineTo(-40, -3); ctx.lineTo(-50, -24); ctx.closePath();
  ctx.fill(); ctx.stroke();
  // 一道布料的褶
  ctx.strokeStyle = 'rgba(0,0,0,0.18)';
  ctx.beginPath(); ctx.moveTo(-8, -10); ctx.quadraticCurveTo(-2, 14, -12, 36); ctx.stroke();
  ctx.restore();
}

function tag(ctx, col, name, t, seed) {
  sheet(ctx, TAG_W, TAG_H, { seed, tone: 'bone', light: -1.0, lift: 0.4, shade: 0.6, rough: 2 });
  // 打孔 + 加固圈
  ctx.fillStyle = '#16110e';
  ctx.beginPath(); ctx.arc(0, -TAG_H / 2 + 22, 7, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = 'rgba(120,100,70,0.5)';
  ctx.lineWidth = 3;
  ctx.beginPath(); ctx.arc(0, -TAG_H / 2 + 22, 11, 0, Math.PI * 2); ctx.stroke();
  ctx.save();
  ctx.translate(0, -24);
  shirt(ctx, col, 1);
  ctx.restore();
  if (name) {
    inkText(ctx, name, 0, TAG_H * 0.3, { font: FONT.serif(32), color: '#2a221c', align: 'center', seed, wear: 0.4, spacing: 2 });
    inkText(ctx, '¥199', 0, TAG_H * 0.42, { font: FONT.type(20), color: '#6f6458', align: 'center', seed: seed + 1, wear: 0.8 });
  }
}

// 吊牌飞进便签
const NOTE = { x: 960, y: 590, w: 520, h: 380, rot: 0.025 };
function intoNote(t, i) { return easeIn(prog(t, 8.55 + i * 0.06, 9.0 + i * 0.06)); }

function hangTag(ctx, t, g, i, depth) {
  const f = intoNote(t, i);
  if (f >= 1) return;
  const a = smooth(prog(t, g.at, g.at + 0.25));
  if (a <= 0) return;
  // 落下来挂住：纸很轻，有一点回弹；之后像摆一样慢慢停下
  const drop = spring(t, g.at, 2.6, 0.55);
  const ax = g.x, ay = rodY(g.x);
  const ang = pendulum(t, g.at + 0.2, 0.09 * (i % 2 ? -1 : 1), 0.62 + (i % 3) * 0.07, 0.55) + 0.01 * Math.sin(t * 0.9 + i);
  ctx.save();
  ctx.globalAlpha *= a * (1 - f * 0.6);
  const hx = lerp(ax, NOTE.x, f), hy = lerp(ay + (1 - drop) * -120, NOTE.y, f);
  ctx.translate(hx, hy);
  ctx.rotate(ang * (1 - f));
  // 吊绳
  if (f < 0.2) {
    pencil(ctx, [[0, 0], [0, g.len]], { seed: 510 + i, t, width: 1.1, color: 'rgba(214,198,172,0.6)', passes: 1, alpha: 1 - f * 5 });
  }
  ctx.translate(0, g.len + TAG_H / 2);
  const sc = lerp(depth, 0.1, f);
  ctx.scale(sc, sc);
  tag(ctx, g.col, g.name, t, 600 + i);
  ctx.restore();
}

function drawTags(ctx, t) {
  if (t < 6.45 || t > 9.3) return;
  const rodA = smooth(prog(t, 6.55, 6.9)) * (1 - smooth(prog(t, 8.5, 8.8)));
  pencil(ctx, ROD, { seed: 501, t, width: 3, color: 'rgba(200,184,156,0.7)', alpha: rodA, pressure: 0.4 });
  // 后面更多的款式：更暗、略虚
  if (t > 7.5) filtered(ctx, 'blur(1.6px) brightness(0.7)', (c) => MORE.forEach((g, i) => hangTag(c, t, g, i + 4, 0.78)));
  TAGS.forEach((g, i) => {
    if (i === 0 && t < 6.95) return drawPicked(ctx, t);
    hangTag(ctx, t, g, i, 1);
  });
}

// 被选中的那一行从屏幕里飞出来，变成第一张吊牌
function drawPicked(ctx, t) {
  const k = spring(t, 6.45, 1.8, 0.8);
  const ly = -SCR.h / 2 + SCR.top + (PICK - scroll(6.45)) * ROW + ROW / 2;
  const [sx, sy] = phoneToScreen(0, ly);
  const g = TAGS[0];
  const tx = g.x, ty = rodY(g.x) + g.len + TAG_H / 2;
  const w = lerp(SCR.w - 44, TAG_W, k), h = lerp(ROW - 10, TAG_H, k);
  ctx.save();
  ctx.translate(lerp(sx, tx, k), lerp(sy, ty, k));
  ctx.rotate(lerp(PHONE.rot, 0, k));
  if (k < 0.7) {
    ctx.fillStyle = '#e2dacb';
    ctx.shadowColor = 'rgba(0,0,0,0.5)'; ctx.shadowBlur = 20; ctx.shadowOffsetY = 12;
    ctx.fillRect(-w / 2, -h / 2, w, h);
  } else {
    ctx.scale(w / TAG_W, h / TAG_H);
    tag(ctx, g.col, g.name, t, 600);
  }
  ctx.restore();
}

// ---------------- 便签上的购物车 ----------------
const COUNTS = [[8.85, '3'], [9.05, '7'], [9.25, '12'], [9.45, '17']];
function cartNote(ctx, t, o = {}) {
  const { pin = false } = o;
  sheet(ctx, NOTE.w, NOTE.h, { seed: 707, tone: 'cream', light: -2.3, lift: 0.08, shade: 0.55, crease: true });
  const p = prog(t, 8.5, 9.0);
  const pen = { t, width: 2.4, color: 'rgba(48,40,34,0.85)', progress: p, pressure: 0.7, passes: 2 };
  ctx.save();
  ctx.translate(-60, -20);
  pencil(ctx, [[-170, -86], [-136, -86], [-110, 54], [86, 54]], { ...pen, seed: 721 });
  pencil(ctx, [[-128, -50], [124, -50], [100, 34], [-114, 34], [-128, -50]], { ...pen, seed: 722 });
  for (let i = 1; i < 5; i++) pencil(ctx, [[-128 + i * 50, -50], [-114 + i * 43, 34]], { ...pen, seed: 723 + i, width: 1.2 });
  sketchEllipse(ctx, -84, 82, 13, 13, { ...pen, seed: 730 });
  sketchEllipse(ctx, 66, 82, 13, 13, { ...pen, seed: 731 });
  ctx.restore();
  // 手写数字：每次加东西，就把上一个数字划掉
  COUNTS.forEach(([at, n], i) => {
    if (t < at) return;
    const x = 70 + i * 52 + (i === 3 ? 10 : 0), y = -112 + (i % 2) * 10;
    inkText(ctx, n, x, y, { font: FONT.hand(46), color: i === 3 ? C.red : 'rgba(48,40,34,0.9)', align: 'center', seed: 740 + i, wear: 0.2 });
    const next = COUNTS[i + 1];
    if (next && t > next[0]) pencil(ctx, [[x - 18, y - 14], [x + 18, y - 22]], { seed: 750 + i, t, width: 2, color: 'rgba(48,40,34,0.8)', progress: prog(t, next[0], next[0] + 0.12), passes: 1 });
  });
  if (t > 9.45) sketchEllipse(ctx, 236, -124, 36, 30, { seed: 760, t, width: 2, color: C.redSoft, progress: prog(t, 9.5, 9.8), passes: 1 });
  typeText(ctx, '购物车  17 件', -200, 140, { font: FONT.body(30), color: '#3a3029', progress: prog(t, 9.7, 10.0), seed: 770 });
  typeText(ctx, '已下单    0 件', -200, 182, { font: FONT.body(30), color: '#3a3029', progress: prog(t, 10.1, 10.45), seed: 771 });
  if (t > 10.5) pencil(ctx, [[-40, 192], [-14, 190]], { seed: 772, t, width: 2.6, color: C.red, progress: prog(t, 10.5, 10.7), passes: 1, pressure: 0.6 });
  if (pin) {
    ctx.fillStyle = '#6e1f19';
    ctx.beginPath(); ctx.arc(0, -NOTE.h / 2 + 18, 7, 0, Math.PI * 2); ctx.fill();
  }
}

function drawNote(ctx, t) {
  if (t < 8.4 || t > 11.0) return;
  const k = spring(t, 8.4, 2.2, 0.75);
  ctx.save();
  ctx.globalAlpha *= Math.min(1, k * 1.5);
  ctx.translate(NOTE.x, NOTE.y + (1 - k) * 40);
  ctx.rotate(NOTE.rot);
  cartNote(ctx, t);
  ctx.restore();
}

function draw(ctx, t) {
  drawMorph(ctx, t);
  drawPhone(ctx, t);
  drawNote(ctx, t);
  drawTags(ctx, t);
}

// 光：手机屏幕本身是光源（略冷）；吊牌是右上方一盏灯；便签是台灯
function light(t) {
  const ph = smooth(prog(t, 4.4, 4.9)) * (1 - smooth(prog(t, 6.6, 7.05)));
  const tg = smooth(prog(t, 6.55, 7.0)) * (1 - smooth(prog(t, 8.5, 8.9)));
  const nt = smooth(prog(t, 8.45, 8.9)) * (1 - smooth(prog(t, 10.9, 11.4)));
  return [
    { x: PHONE.x, y: PHONE.y, rx: 560, ry: 640, i: 1, w: ph, color: [235, 226, 210], core: 0.3 },
    { x: 1080, y: 420, rx: 980, ry: 470, i: 0.95, w: tg, rot: -0.12 },
    { x: 900, y: 560, rx: 640, ry: 430, i: 0.95, w: nt },
  ];
}
function grade(t) { return { warm: lerp(0.05, 0.3, smooth(prog(t, 6.5, 7.2))), ambient: 0.1 }; }

module.exports = { ...S, draw, light, grade, cartNote, NOTE };
