// 第一幕 · 0–8.4 秒：聚会刚散。
//   第 0 帧：大门还开着，楼道的暖光斜洒进屋，最后一个朋友的影子在楼道墙上走远。
//   0.8 门开始关——很重，最后「咔」一下顶住；门缝的光收成门底一条细线；3.1 楼道感应灯熄灭。
//   屋里只剩茶几上方一盏吊灯。沙发上的人慢慢低头，把手里的杯子放回桌上。
//   7.2 起摄影机推向桌上一只玻璃杯，杯口的椭圆高光交给下一幕变成窗花。
// 同一个房间也用于结尾（ending.js 复用 drawRoom）。
const { W, H } = require('../../../src/config');
const { prog, smooth, lerp, rng, noise1, easeInOut } = require('../../../src/lib/util');
const { spring } = require('../../../src/lib/motion');
const { withCam, toScreen, seated, glassShape, bottle, plate, napkin, bowl, foreground, smoothPath, shade } = require('../lib');

const S = { start: 0, end: 8.6 };

// ---------------- 房间的几何（世界坐标） ----------------
const FLOOR = 700;           // 墙脚线
const VP = [960, 470];       // 灭点
const DOOR = { x0: 250, x1: 470, top: 238 };
const WIN = { x0: 1440, x1: 1790, y0: 118, y1: 446 };
const SOFA = { x0: 1010, x1: 1770, back: 470, seat: 628, front: 770 };
const TABLE = { bx0: 640, bx1: 1400, by: 772, fx0: 590, fx1: 1460, fy: 858, th: 18 };
const LAMP = { x: 1000, y: 318 };
const PERSON = { x: 1190, y: 640, u: 300 };
const GLASS = { x: 905, y: 812, w: 54, h: 92 };  // 转场用的那只杯子（杯口在 y - h）

// 透视：把墙面上的点朝摄影机拉近 z（像素）
const near = (p, z) => [VP[0] + (p[0] - VP[0]) * (1 + z / 1500), VP[1] + (p[1] - VP[1]) * (1 + z / 1500)];

// ---------------- 动作 ----------------
// 门：0 = 全开（约 62°），1 = 关上。临界阻尼，最后有一下「顶住」的小回弹
function doorClose(t) {
  const k = spring(t, 0.8, 0.62, 1.0);
  const latch = t > 1.95 ? Math.exp(-(t - 1.95) * 18) * Math.sin((t - 1.95) * 60) * 0.012 : 0;
  // 最后几度被门吸一下拉上：1.95 那一帧「咔」地顶住
  return t >= 1.95 ? 1 - Math.max(0, latch) : Math.min(0.985, k * 1.035);
}
const hallLight = (t) => 1 - smooth(prog(t, 3.05, 3.35));         // 楼道感应灯
const lampOn = () => 1;

// 摄影机：门关上前不动；之后极慢推向沙发上的人；7.2 起推向那只杯子
function cam(t) {
  const push = easeInOut(prog(t, 2.2, 7.4));
  let c = { cx: lerp(960, 1090, push), cy: lerp(545, 575, push), s: lerp(1.0, 1.14, push) };
  const g = smooth(prog(t, 7.0, 8.5));
  if (g > 0) {
    const gk = g * g;
    c = { cx: lerp(c.cx, GLASS.x, g), cy: lerp(c.cy, GLASS.y - GLASS.h, g), s: lerp(c.s, 3.2, gk) };
  }
  return c;
}

// ---------------- 绘制 ----------------
const R = rng(1101);
const PLANKS = Array.from({ length: 34 }, (_, i) => -900 + i * 112 + (R() - 0.5) * 30);
const CITY = Array.from({ length: 70 }, () => ({ x: R(), y: R(), r: 0.6 + R() * 2.2, warm: R() < 0.6, a: 0.25 + R() * 0.6, f: R() * 10 }));

function wall(ctx) {
  const g = ctx.createLinearGradient(0, -100, 0, FLOOR);
  g.addColorStop(0, '#3a332c');
  g.addColorStop(1, '#4a4038');
  ctx.fillStyle = g;
  ctx.fillRect(-400, -300, W + 800, FLOOR + 300);
  // 极淡的竖向墙纸纹
  ctx.fillStyle = 'rgba(0,0,0,0.05)';
  for (let x = -400; x < W + 400; x += 36) ctx.fillRect(x, -300, 14, FLOOR + 300);
  // 踢脚线
  ctx.fillStyle = '#2a231e';
  ctx.fillRect(-400, FLOOR - 16, W + 800, 16);
  ctx.fillStyle = 'rgba(220,200,170,0.18)';
  ctx.fillRect(-400, FLOOR - 16, W + 800, 1.5);
}

function floor(ctx) {
  const g = ctx.createLinearGradient(0, FLOOR, 0, H + 300);
  g.addColorStop(0, '#2e241d');
  g.addColorStop(1, '#3a2d23');
  ctx.fillStyle = g;
  ctx.fillRect(-400, FLOOR, W + 800, H + 600);
  // 地板缝：朝灭点汇聚
  ctx.strokeStyle = 'rgba(0,0,0,0.32)';
  ctx.lineWidth = 1.4;
  for (const x of PLANKS) {
    const k = (FLOOR - VP[1]);
    const x2 = VP[0] + (x - VP[0]) * ((H + 400 - VP[1]) / k);
    ctx.beginPath(); ctx.moveTo(x, FLOOR); ctx.lineTo(x2, H + 400); ctx.stroke();
  }
  // 横向接缝（越近越疏）
  ctx.strokeStyle = 'rgba(0,0,0,0.18)';
  for (let i = 1; i < 9; i++) {
    const y = FLOOR + Math.pow(i / 8, 1.8) * 520;
    ctx.beginPath(); ctx.moveTo(-400, y); ctx.lineTo(W + 400, y); ctx.stroke();
  }
  // 地毯
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(470, 735); ctx.lineTo(1560, 735); ctx.lineTo(1720, 985); ctx.lineTo(320, 985); ctx.closePath();
  ctx.fillStyle = '#3b3530';
  ctx.fill();
  ctx.clip();
  ctx.strokeStyle = 'rgba(0,0,0,0.12)';
  ctx.lineWidth = 6;
  for (let y = 745; y < 990; y += 22) { ctx.beginPath(); ctx.moveTo(300, y); ctx.lineTo(1760, y); ctx.stroke(); }
  ctx.strokeStyle = 'rgba(160,120,90,0.14)';
  ctx.lineWidth = 3;
  ctx.beginPath(); ctx.moveTo(500, 752); ctx.lineTo(1540, 752); ctx.lineTo(1680, 966); ctx.lineTo(360, 966); ctx.closePath(); ctx.stroke();
  ctx.restore();
}

// 窗：夜里的城市（远处的灯在 drawOver 里画，保持发光）
function windowFrame(ctx, t) {
  const { x0, x1, y0, y1 } = WIN;
  const g = ctx.createLinearGradient(0, y0, 0, y1);
  g.addColorStop(0, '#1d2430');
  g.addColorStop(1, '#2c3038');
  ctx.fillStyle = g;
  ctx.fillRect(x0, y0, x1 - x0, y1 - y0);
  // 远处的楼：几块更暗的矩形
  const B = rng(77);
  for (let i = 0; i < 9; i++) {
    const bx = x0 + B() * (x1 - x0), bw = 30 + B() * 70, bh = 60 + B() * 220;
    ctx.fillStyle = 'rgba(14,16,22,0.8)';
    ctx.fillRect(bx, y1 - bh, bw, bh);
  }
  // 窗框
  ctx.strokeStyle = '#4a4239';
  ctx.lineWidth = 14;
  ctx.strokeRect(x0, y0, x1 - x0, y1 - y0);
  ctx.lineWidth = 8;
  ctx.beginPath(); ctx.moveTo((x0 + x1) / 2, y0); ctx.lineTo((x0 + x1) / 2, y1); ctx.stroke();
  ctx.fillStyle = '#4a4239';
  ctx.fillRect(x0 - 24, y1, x1 - x0 + 48, 14);
  // 窗帘：右侧一片垂下来的布，竖向褶
  ctx.save();
  ctx.translate(x1 - 30, y0 - 30);
  const cg = ctx.createLinearGradient(0, 0, 120, 0);
  for (let i = 0; i <= 6; i++) cg.addColorStop(i / 6, i % 2 ? '#3d3a33' : '#2e2b26');
  ctx.fillStyle = cg;
  ctx.beginPath();
  ctx.moveTo(0, 0); ctx.lineTo(120, 0); ctx.lineTo(126, 640); ctx.quadraticCurveTo(60, 650, -6, 640);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

function cityLights(ctx, t, a = 1) {
  const { x0, x1, y0, y1 } = WIN;
  ctx.save();
  ctx.beginPath(); ctx.rect(x0 + 7, y0 + 7, x1 - x0 - 50, y1 - y0 - 14); ctx.clip();
  for (const c of CITY) {
    const fl = 0.85 + 0.15 * noise1(t * 0.7 + c.f, 9);
    ctx.fillStyle = c.warm ? `rgba(255,206,140,${c.a * fl * a})` : `rgba(190,206,230,${c.a * fl * a * 0.8})`;
    ctx.beginPath();
    ctx.arc(x0 + c.x * (x1 - x0), y0 + 100 + c.y * (y1 - y0 - 110), c.r, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

// 门：楼道（亮）+ 门板（绕左侧合页转，越开越朝向摄影机）
function doorway(ctx, t) {
  const { x0, x1, top } = DOOR;
  const close = doorClose(t), hall = hallLight(t);
  // 门框
  ctx.fillStyle = '#2b241f';
  ctx.fillRect(x0 - 16, top - 16, x1 - x0 + 32, FLOOR - top + 16);
  // 门洞里的楼道：一面被灯照亮的墙
  const hg = ctx.createLinearGradient(x0, 0, x1, 0);
  hg.addColorStop(0, `rgb(${lerp(30, 196, hall)},${lerp(26, 168, hall)},${lerp(22, 124, hall)})`);
  hg.addColorStop(1, `rgb(${lerp(24, 150, hall)},${lerp(20, 124, hall)},${lerp(18, 92, hall)})`);
  ctx.fillStyle = hg;
  ctx.fillRect(x0, top, x1 - x0, FLOOR - top);
  // 楼道地面
  ctx.fillStyle = `rgba(${lerp(20, 120, hall)},${lerp(18, 100, hall)},${lerp(16, 76, hall)},1)`;
  ctx.fillRect(x0, FLOOR - 60, x1 - x0, 60);
  // 最后一个朋友的影子：投在楼道墙上，往右走远，越来越淡
  const sh = 1 - smooth(prog(t, 0.0, 1.5));
  if (sh > 0 && hall > 0) {
    ctx.save();
    ctx.beginPath(); ctx.rect(x0, top, x1 - x0, FLOOR - top); ctx.clip();
    ctx.filter = 'blur(9px)';
    ctx.globalAlpha = 0.6 * sh;
    const sx = lerp(330, 560, smooth(prog(t, -0.4, 1.6)));
    const step = Math.sin(t * 7.5) * 0.12;
    ctx.translate(sx, FLOOR - 18);
    ctx.fillStyle = '#3a2a1c';
    ctx.beginPath();
    ctx.ellipse(0, -390, 30, 36, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(-52, -345); ctx.quadraticCurveTo(0, -365, 52, -345);
    ctx.lineTo(44, -170); ctx.lineTo(-44, -170); ctx.closePath();
    ctx.fill();
    // 抬起的一只手（在挥手道别）
    ctx.save();
    ctx.translate(46, -330);
    ctx.rotate(-0.9 + Math.sin(t * 6) * 0.25);
    ctx.fillRect(-9, -120, 18, 120);
    ctx.restore();
    for (const s of [-1, 1]) {
      ctx.save(); ctx.translate(s * 18, -175); ctx.rotate(s * step);
      ctx.fillRect(-15, 0, 30, 175); ctx.restore();
    }
    ctx.restore();
  }
  // 门板
  const ang = (1 - close) * 1.08;  // 弧度
  const wd = x1 - x0;
  const z = Math.sin(ang) * wd;
  const fx = x0 + Math.cos(ang) * wd;
  const pTop = near([fx, top], z), pBot = near([fx, FLOOR], z);
  ctx.beginPath();
  ctx.moveTo(x0, top); ctx.lineTo(pTop[0], pTop[1]); ctx.lineTo(pBot[0], pBot[1]); ctx.lineTo(x0, FLOOR);
  ctx.closePath();
  const dg = ctx.createLinearGradient(x0, 0, Math.max(pTop[0], x0 + 1), 0);
  dg.addColorStop(0, '#3b2f26');
  dg.addColorStop(1, close > 0.97 ? '#3b2f26' : '#4a3a2e');
  ctx.fillStyle = dg;
  ctx.fill();
  // 门板凹槽
  ctx.strokeStyle = 'rgba(0,0,0,0.3)';
  ctx.lineWidth = 2;
  const lerpP = (a, b, k) => [lerp(a[0], b[0], k), lerp(a[1], b[1], k)];
  for (const [a0, a1] of [[0.08, 0.42], [0.52, 0.92]]) {
    const q = (u, v) => lerpP(lerpP([x0, top], pTop, u), lerpP([x0, FLOOR], pBot, u), v);
    ctx.beginPath();
    const p1 = q(0.16, a0), p2 = q(0.84, a0), p3 = q(0.84, a1), p4 = q(0.16, a1);
    ctx.moveTo(p1[0], p1[1]); ctx.lineTo(p2[0], p2[1]); ctx.lineTo(p3[0], p3[1]); ctx.lineTo(p4[0], p4[1]); ctx.closePath();
    ctx.stroke();
  }
  // 门的边缘：被楼道的光照亮
  if (close < 0.995) {
    ctx.strokeStyle = `rgba(255,214,160,${0.55 * hall})`;
    ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(pTop[0], pTop[1]); ctx.lineTo(pBot[0], pBot[1]); ctx.stroke();
  }
  // 门把手
  const hk = lerpP(lerpP([x0, top], pTop, 0.88), lerpP([x0, FLOOR], pBot, 0.88), 0.53);
  ctx.fillStyle = 'rgba(210,190,150,0.7)';
  ctx.beginPath(); ctx.arc(hk[0], hk[1], 5, 0, Math.PI * 2); ctx.fill();
  // 门关上以后：门底一条细光，直到楼道灯熄灭
  if (close > 0.9 && hall > 0) {
    ctx.fillStyle = `rgba(255,210,150,${0.85 * hall * smooth(prog(close, 0.9, 1))})`;
    ctx.fillRect(x0 + 4, FLOOR - 4, wd - 8, 4);
  }
}

// 洒在地上的楼道光：从门洞朝摄影机散开的梯形
function spill(ctx, t) {
  const open = 1 - doorClose(t), hall = hallLight(t);
  const a = open * hall;
  if (a <= 0.01) return;
  const { x0, x1 } = DOOR;
  const gx1 = lerp(x0, x1, Math.min(1, open * 1.15));
  ctx.save();
  const g = ctx.createLinearGradient(0, FLOOR, 0, FLOOR + 380);
  g.addColorStop(0, `rgba(255,206,140,${0.42 * a})`);
  g.addColorStop(1, 'rgba(255,206,140,0)');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.moveTo(x0, FLOOR); ctx.lineTo(gx1, FLOOR);
  ctx.lineTo(gx1 + (gx1 - VP[0]) * 0.9 + 260, FLOOR + 380); ctx.lineTo(x0 + (x0 - VP[0]) * 0.9, FLOOR + 380);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

function lamp(ctx, t) {
  const sway = Math.sin(t * 0.9) * 0.006;
  ctx.save();
  ctx.translate(LAMP.x, -200);
  ctx.rotate(sway);
  ctx.strokeStyle = 'rgba(30,26,22,0.9)';
  ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, LAMP.y + 200); ctx.stroke();
  ctx.translate(0, LAMP.y + 200);
  // 灯罩：金属锥形，外侧暗，下沿亮
  ctx.beginPath();
  ctx.moveTo(-26, 0); ctx.lineTo(26, 0); ctx.lineTo(92, 74); ctx.lineTo(-92, 74); ctx.closePath();
  const g = ctx.createLinearGradient(-92, 0, 92, 0);
  g.addColorStop(0, '#2a2622'); g.addColorStop(0.4, '#5b5247'); g.addColorStop(1, '#1e1b18');
  ctx.fillStyle = g;
  ctx.fill();
  ctx.restore();
}
function lampGlow(ctx, t) {
  ctx.save();
  ctx.translate(LAMP.x, LAMP.y + 74);
  ctx.beginPath(); ctx.ellipse(0, 0, 92, 13, 0, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(255,236,196,0.95)';
  ctx.shadowColor = 'rgba(255,200,130,0.9)'; ctx.shadowBlur = 40;
  ctx.fill();
  ctx.restore();
}

function sofa(ctx) {
  const { x0, x1, back, seat, front } = SOFA;
  // 靠背
  ctx.fillStyle = '#34413a';
  roundRect(ctx, x0 + 30, back, x1 - x0 - 60, seat - back + 20, 26); ctx.fill();
  // 靠背上两块垫子的缝
  ctx.strokeStyle = 'rgba(0,0,0,0.35)'; ctx.lineWidth = 3;
  ctx.beginPath(); ctx.moveTo((x0 + x1) / 2, back + 18); ctx.lineTo((x0 + x1) / 2, seat); ctx.stroke();
  // 坐垫
  ctx.fillStyle = '#3c4a41';
  roundRect(ctx, x0 + 20, seat - 6, x1 - x0 - 40, 56, 14); ctx.fill();
  ctx.fillStyle = 'rgba(255,230,190,0.08)';
  ctx.fillRect(x0 + 30, seat - 4, x1 - x0 - 60, 6);
  // 前脸
  ctx.fillStyle = '#29332d';
  ctx.fillRect(x0 + 10, seat + 46, x1 - x0 - 20, front - seat - 46);
  // 扶手
  for (const ax of [x0, x1 - 70]) {
    ctx.fillStyle = '#303c35';
    roundRect(ctx, ax, seat - 70, 70, front - seat + 70, 20); ctx.fill();
    ctx.fillStyle = 'rgba(255,230,190,0.06)';
    ctx.fillRect(ax + 8, seat - 66, 54, 6);
  }
  // 腿
  ctx.fillStyle = '#16120f';
  for (const lx of [x0 + 24, x1 - 40]) ctx.fillRect(lx, front, 14, 14);
  // 一个靠垫
  ctx.save();
  ctx.translate(x1 - 150, seat - 52);
  ctx.rotate(0.12);
  ctx.fillStyle = '#6a5440';
  roundRect(ctx, -60, -50, 120, 100, 30); ctx.fill();
  ctx.restore();
}

function table(ctx, t, o = {}) {
  const T = TABLE;
  // 腿
  ctx.fillStyle = '#1b1511';
  for (const [x, y0, y1] of [[T.fx0 + 30, T.fy, T.fy + 74], [T.fx1 - 44, T.fy, T.fy + 74], [T.bx0 + 30, T.by, T.by + 50], [T.bx1 - 44, T.by, T.by + 50]]) ctx.fillRect(x, y0, 14, y1 - y0);
  // 桌面（梯形）+ 厚度
  ctx.beginPath();
  ctx.moveTo(T.bx0, T.by); ctx.lineTo(T.bx1, T.by); ctx.lineTo(T.fx1, T.fy); ctx.lineTo(T.fx0, T.fy); ctx.closePath();
  const g = ctx.createLinearGradient(0, T.by, 0, T.fy);
  g.addColorStop(0, '#4a3a2c'); g.addColorStop(1, '#5a4634');
  ctx.fillStyle = g;
  ctx.fill();
  // 木纹
  ctx.save(); ctx.clip();
  ctx.strokeStyle = 'rgba(0,0,0,0.12)'; ctx.lineWidth = 1.2;
  for (let i = 0; i < 9; i++) {
    const y = lerp(T.by, T.fy, i / 9);
    ctx.beginPath(); ctx.moveTo(T.fx0, y + 2); ctx.bezierCurveTo(800, y - 3, 1100, y + 4, T.fx1, y); ctx.stroke();
  }
  // 桌面上的灯的倒影
  ctx.beginPath(); ctx.ellipse(LAMP.x + 10, (T.by + T.fy) / 2, 150, 18, 0, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(255,226,180,0.12)'; ctx.fill();
  ctx.restore();
  ctx.fillStyle = '#2a2018';
  ctx.fillRect(T.fx0, T.fy, T.fx1 - T.fx0, T.th);
  ctx.fillStyle = 'rgba(255,220,170,0.18)';
  ctx.fillRect(T.fx0, T.fy, T.fx1 - T.fx0, 1.5);
  // 桌上的东西（从后往前画）
  const items = o.tidy ?? 0; // 结尾：收拾到一起的程度
  const at = (x, y, fn) => { ctx.save(); ctx.translate(x, y); fn(); ctx.restore(); };
  at(1240, 790, () => plate(ctx, 70, 15, { seed: 3, crumbs: 18 }));
  at(760, 788, () => plate(ctx, 62, 13, { seed: 4, crumbs: 10, food: (c, rx, ry) => { c.fillStyle = '#8a5a34'; c.beginPath(); c.ellipse(-rx * 0.2, 0, rx * 0.25, ry * 0.4, 0.2, 0, Math.PI * 2); c.fill(); } }));
  at(1060, 800, () => bowl(ctx, 52, 13, 30, { inner: '#a07a48' }));
  // 碗里剩的零食
  const r = rng(55);
  for (let i = 0; i < 12; i++) { ctx.fillStyle = r() < 0.5 ? '#c09a5a' : '#8f6a3a'; ctx.beginPath(); ctx.ellipse(1060 + (r() - 0.5) * 70, 770 + (r() - 0.5) * 12, 5, 3, r(), 0, Math.PI * 2); ctx.fill(); }
  at(1340, 806, () => bottle(ctx, 30, 120, { col: [30, 54, 40] }));
  at(690, 840, () => bottle(ctx, 26, 104, { col: [62, 40, 26], lying: true, label: false }));
  at(1150, 838, () => napkin(ctx, 26, 7));
  at(820, 846, () => napkin(ctx, 20, 8));
  at(1290, 846, () => napkin(ctx, 18, 9));
  at(990, 846, () => glassShape(ctx, 46, 78, { fill: 0.08, liquid: [140, 80, 40] }));
  at(1195, 822, () => glassShape(ctx, 50, 86, { fill: 0.22, liquid: [150, 60, 36] }));
  at(GLASS.x, GLASS.y, () => glassShape(ctx, GLASS.w, GLASS.h, { fill: 0.3, liquid: [160, 64, 40] }));
  // 人刚放回桌上的那只杯子
  if (t > 5.6) at(1290, 812, () => glassShape(ctx, 46, 80, { fill: 0.15, liquid: [150, 60, 36] }));
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

// 人物：手肘撑在膝上，手里一只杯子；门关上后慢慢低头，5.0 把杯子放回桌上
function person(ctx, t, o = {}) {
  const drop = lerp(0.05, 0.32, easeInOut(prog(t, 2.6, 6.2)));
  const putDown = smooth(prog(t, 4.8, 5.7));
  ctx.save();
  ctx.translate(PERSON.x, PERSON.y);
  seated(ctx, PERSON.u, {
    t, lean: lerp(0.55, 0.62, putDown), head: drop, arm: 'knees', holding: putDown < 0.5 ? 'glass' : null,
    light: -2.35, rim: 0.6, ...o,
  });
  ctx.restore();
}

function drawRoom(ctx, t, o = {}) {
  wall(ctx);
  windowFrame(ctx, t);
  doorway(ctx, o.doorT ?? t);
  floor(ctx);
  spill(ctx, o.doorT ?? t);
  sofa(ctx);
  if (o.person !== false) person(ctx, o.personT ?? t, o.personO);
  lamp(ctx, t);
  table(ctx, t, o);
}

function draw(ctx, t) {
  const c = cam(t);
  const out = 1 - smooth(prog(t, 7.65, 8.25));
  ctx.save();
  ctx.globalAlpha *= out;
  withCam(ctx, c, 1, () => drawRoom(ctx, t));
  // 前景：右下角一只离镜头很近、失焦的酒杯
  withCam(ctx, c, 1.35, () => foreground(ctx, 14, (fc) => {
    fc.save(); fc.translate(1760, 1150); glassShape(fc, 180, 300, { fill: 0.25, liquid: [110, 50, 30] }); fc.restore();
  }));
  ctx.restore();
}

function drawOver(ctx, t) {
  const c = cam(t);
  const out = 1 - smooth(prog(t, 7.65, 8.25));
  ctx.save();
  ctx.globalAlpha *= out;
  withCam(ctx, c, 1, () => {
    cityLights(ctx, t);
    lampGlow(ctx, t);
  });
  ctx.restore();
}

// 光：吊灯（主光，落在茶几和人身上）、楼道（随门关上收窄后熄灭）、窗外（很弱的冷光）
function light(t) {
  const c = cam(t);
  const w = 1 - smooth(prog(t, 7.7, 8.3));
  const sc = (x, y) => toScreen(c, x, y);
  const open = 1 - doorClose(t), hall = hallLight(t);
  const out = [];
  const [lx, ly] = sc(LAMP.x + 20, 760);
  out.push({ x: lx, y: ly, rx: 720 * c.s, ry: 400 * c.s, i: 1, w, core: 0.22, color: [255, 200, 140] });
  const [px, py] = sc(PERSON.x - 30, 470);
  out.push({ x: px, y: py, rx: 330 * c.s, ry: 380 * c.s, i: 0.72, w, color: [255, 206, 150] });
  const [gx, gy] = sc(LAMP.x, LAMP.y + 40);
  out.push({ x: gx, y: gy, rx: 300 * c.s, ry: 240 * c.s, i: 0.8, w });
  const [dx, dy] = sc(360, 470);
  out.push({ x: dx, y: dy, rx: 300 * c.s, ry: 520 * c.s, i: 0.95, w: w * hall * (0.15 + 0.85 * open), core: 0.35, color: [255, 200, 130] });
  const [fx, fy] = sc(470, 860);
  out.push({ x: fx, y: fy, rx: 520 * c.s, ry: 230 * c.s, i: 0.85, w: w * hall * open, rot: 0.25, color: [255, 200, 130] });
  const [ux, uy] = sc(360, 702);
  out.push({ x: ux, y: uy, rx: 170 * c.s, ry: 40 * c.s, i: 0.7, w: w * hall * (1 - open) });
  const [wx, wy] = sc(1610, 300);
  out.push({ x: wx, y: wy, rx: 300 * c.s, ry: 330 * c.s, i: 0.45, w, color: [170, 190, 225] });
  return out;
}

function grade(t) { return { warm: lerp(0.45, 0.28, smooth(prog(t, 1.0, 3.4))), ambient: lerp(0.16, 0.1, smooth(prog(t, 1.2, 3.4))) }; }

// 转场用：杯口在屏幕上的位置与大小
function rimOnScreen(t) {
  const c = cam(t);
  const [x, y] = toScreen(c, GLASS.x, GLASS.y - GLASS.h);
  return { x, y, rx: (GLASS.w / 2) * c.s, ry: GLASS.w * 0.16 * c.s };
}

module.exports = { ...S, draw, drawOver, light, grade, cam, rimOnScreen, drawRoom, cityLights, lampGlow, GLASS, PERSON, LAMP, roundRect };
