// 第一幕 · 0–8.4 秒：聚会正热闹的时候，他已经看见了散场。
//   0.0–1.5  片名「悲观主义」在热闹的聚会上出现，一秒多就退开。
//   0.0–2.5  真的很热闹：门口有人在穿外套，两个人站着聊天、举杯大笑，沙发上他和朋友碰杯，
//            有人弯腰从桌上拿零食，有人坐在扶手上喝东西，前景有人走过镜头。
//   2.5–5.2  别人还在聊天；他安静下来，低头。镜头慢慢靠近他。「快乐刚开始。」「你已经在想它什么时候结束。」
//   5.2–6.9  脑内的未来（只有一秒多）：所有人一下子不见了，门关上、楼道灯灭、灯串熄灭、光变冷，桌上只剩残杯。
//   6.9      回到现实：人都还在，还在笑。
//   7.2–8.4  摄影机推向桌上一只玻璃杯，杯口的椭圆高光交给下一幕变成窗花。
// 同一个房间也用于封面与结尾（drawRoom）。
const { W, H } = require('../../../src/config');
const { prog, smooth, lerp, rng, noise1, easeInOut } = require('../../../src/lib/util');
const { FONT } = require('../../../src/lib/style');
const { spring } = require('../../../src/lib/motion');
const { withCam, toScreen, glassShape, bottle, plate, napkin, bowl, foreground, smoothPath, shade } = require('../lib');
const { person, layer } = require('../people');

const S = { start: 0, end: 8.6 };

// ---------------- 房间的几何（世界坐标） ----------------
const FLOOR = 700;           // 墙脚线
const VP = [960, 470];       // 灭点
const DOOR = { x0: 250, x1: 470, top: 238 };
const WIN = { x0: 1440, x1: 1790, y0: 118, y1: 446 };
const SOFA = { x0: 1010, x1: 1770, back: 470, seat: 628, front: 770 };
const TABLE = { bx0: 640, bx1: 1400, by: 772, fx0: 590, fx1: 1460, fy: 858, th: 18 };
const LAMP = { x: 1000, y: 318 };
const HERO = { x: 1400, y: 640, u: 300 };   // 主人公：沙发中间，面朝左
const GLASS = { x: 905, y: 812, w: 54, h: 92 };  // 转场用的那只杯子（杯口在 y - h）

// 透视：把墙面上的点朝摄影机拉近 z（像素）
const near = (p, z) => [VP[0] + (p[0] - VP[0]) * (1 + z / 1500), VP[1] + (p[1] - VP[1]) * (1 + z / 1500)];

// ---------------- 状态 ----------------
// 脑内的未来：5.2 进入，6.9 回到现实（进得快，退得更快）
const FUT = [5.2, 6.9];
function future(t) { return smooth(prog(t, FUT[0], FUT[0] + 0.28)) * (1 - smooth(prog(t, FUT[1], FUT[1] + 0.22))); }
// 门：现实里半开着（门口有人在穿外套）；未来里关上
let ST = null; // 封面等静态画面可以覆盖
function doorClose(t) { return ST ? ST.close : lerp(0.42, 1, future(t)); }
function hallLight(t) { return ST ? ST.hall : 1 - future(t); }
function strings(t) { return ST ? ST.strings : 1 - future(t); }

// 摄影机：先是全景（极轻的漂移）；2.5 起慢慢靠近他；7.2 起推向那只杯子
function cam(t) {
  const push = easeInOut(prog(t, 2.4, 5.6));
  let c = { cx: lerp(960, 1250, push) + Math.sin(t * 0.4) * 6, cy: lerp(540, 515, push), s: lerp(1.0, 1.32, push) };
  const g = smooth(prog(t, 7.15, 8.5));
  if (g > 0) c = { cx: lerp(c.cx, GLASS.x, g), cy: lerp(c.cy, GLASS.y - GLASS.h, g), s: lerp(c.s, 3.2, g * g) };
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
  // 散场以后才会有的样子：倒下的杯子、更多纸巾、空瓶（只在脑内的未来里出现）
  const m = o.mess ?? 0;
  if (m > 0.01) {
    ctx.save();
    ctx.globalAlpha *= m;
    at(1290, 820, () => glassShape(ctx, 46, 80, { fill: 0, tilt: -1.45 }));
    at(1010, 850, () => napkin(ctx, 24, 11));
    at(700, 812, () => napkin(ctx, 22, 12));
    at(1120, 806, () => bottle(ctx, 28, 110, { col: [40, 46, 36], lying: true, label: false }));
    at(860, 852, () => glassShape(ctx, 40, 70, { fill: 0.05 }));
    ctx.restore();
  }
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


// ---------------- 人 ----------------
const n = (t, s, f = 1) => noise1(t * f, s);
const laughPulse = (t, t0, dur) => { const k = prog(t, t0, t0 + dur); return k > 0 && k < 1 ? Math.sin(Math.PI * k) * (0.6 + 0.4 * Math.sin(t * 26)) : 0; };

// 每个人：位置、尺度、外观、随时间变化的姿势
const CAST = [
  // 门口：背对镜头，正在穿外套（右手往后找袖子），准备走
  { id: 'coat', x: 420, y: 703, u: 284, look: { face: 1, coat: true, top: '#5a4636', bottom: '#2a2622', hair: '#1c1612', hairStyle: 'short', skin: '#7f5d47', h: 1.02 },
    pose: (t) => { const k = smooth(prog(t, 0.0, 1.6)); const tug = Math.sin(t * 3.2) * 0.08;
      return { lean: 0.04, hd: 0.15, arms: { far: [lerp(-0.6, -0.15, k), lerp(0.1, 0.3, k)], near: [lerp(0.2, 0.55, k) + tug, lerp(0.6, 2.3, k)] } }; } },
  // 站着聊天的两个人：左边的人举着杯子大笑，右边的人边说边比划
  { id: 'talkA', x: 640, y: 740, u: 298, look: { face: -1, top: '#7a5a3e', bottom: '#2c2a28', hair: '#2a1d14', hairStyle: 'short', skin: '#8a644c', h: 1.0, build: 1.08 },
    pose: (t) => { const L = laughPulse(t, 0.25, 1.1) + laughPulse(t, 3.4, 1.0); return { lean: 0.04 - L * 0.1, hd: -0.1 - L * 0.35, arms: { near: [0.55, 1.5 + L * 0.3], far: [0.1, 0.3] }, holding: 'glass' }; } },
  { id: 'talkB', x: 800, y: 744, u: 292, look: { face: 1, top: '#3d4a52', bottom: '#2a2724', hair: '#1a120e', hairStyle: 'long', skin: '#90684f', h: 0.95, build: 0.92 },
    pose: (t) => ({ lean: 0.06, hd: 0.02 + n(t, 2, 1.3) * 0.08, arms: { near: [0.3 + n(t, 3, 1.6) * 0.3, 1.2 + n(t, 4, 2.1) * 0.5], far: [0.25, 1.4] }, holding: 'glass', glassTilt: 0.1 }) },
  // 沙发左端：朝右，和他碰杯，后来喝一口
  { id: 'friend', x: 1040, y: 640, u: 298, look: { face: -1, sit: true, top: '#6b3f34', bottom: '#2b2622', hair: '#140f0c', hairStyle: 'bun', skin: '#8f6a52', h: 0.96, build: 0.95 },
    pose: (t) => { const toast = smooth(prog(t, 0.2, 0.7)) * (1 - smooth(prog(t, 1.5, 2.0))); const drink = Math.sin(Math.PI * prog(t, 3.0, 4.2)); const L = laughPulse(t, 0.7, 1.0);
      return { sit: true, lean: 0.12 - L * 0.08, hd: -0.05 - L * 0.3 - drink * 0.25, arms: { near: [lerp(0.6, 1.25, toast) + drink * 0.2, lerp(1.5, 0.5, toast) + drink * 1.2], far: [0.2, 1.0] }, holding: 'glass' }; } },
  // 坐在沙发扶手上：拿着杯子，笑
  { id: 'arm', x: 1700, y: 588, u: 290, look: { face: 1, sit: true, top: '#8a7a5a', bottom: '#2f2c28', hair: '#2e2016', hairStyle: 'short', skin: '#86624a', h: 0.98 },
    pose: (t) => { const L = laughPulse(t, 1.0, 1.2) + laughPulse(t, 4.4, 0.9); return { sit: true, lean: 0.05 - L * 0.12, hd: -L * 0.3, legs: { near: [1.2, 1.0 + Math.sin(t * 1.5) * 0.1], far: [1.3, 1.3] }, arms: { near: [0.4, 1.5], far: [0.3, 0.4] }, holding: 'cup' }; } },
  // 茶几右前方：弯腰从盘子里拿零食，直起身放进嘴里
  { id: 'snack', x: 1585, y: 968, u: 352, look: { face: 1, top: '#2f4038', bottom: '#26231f', hair: '#1a130f', hairStyle: 'short', skin: '#7d5b45', h: 1.0, build: 1.0 },
    pose: (t) => { const down = Math.sin(Math.PI * prog(t, 0.3, 1.9)); const eat = Math.sin(Math.PI * prog(t, 1.9, 2.8));
      return { lean: 0.05 + down * 0.62, hd: down * 0.25 - eat * 0.1, legs: { near: [-down * 0.15, down * 0.3], far: [0.12, 0.05] }, arms: { near: [0.25 + down * 1.0 + eat * 0.4, 0.2 + eat * 2.1], far: [0.1, 0.2] } }; } },
];
// 前景：一个人从镜头前走过（很近、失焦）
const PASSER = { t0: 1.5, t1: 3.1, y: 1330, u: 780, look: { face: -1, top: '#2a2420', bottom: '#1a1714', hair: '#0e0b09', rim: 0.2, h: 1.0 } };

function heroPose(t) {
  // 0–2.4 和朋友碰杯、跟着笑；2.5 起慢慢安静下来：笑容收住、低头、手里的杯子垂下来
  const toast = smooth(prog(t, 0.2, 0.7)) * (1 - smooth(prog(t, 1.5, 2.0)));
  const L = laughPulse(t, 0.7, 1.2);
  const quiet = easeInOut(prog(t, 2.5, 4.6));
  return {
    sit: true, face: 1, lean: lerp(0.18 - L * 0.08, 0.5, quiet), hd: lerp(-0.08 - L * 0.32, 0.38, quiet),
    arms: { near: [lerp(lerp(0.6, 1.2, toast), 0.85, quiet), lerp(lerp(1.5, 0.55, toast), 0.6, quiet)], far: [lerp(0.2, 0.7, quiet), lerp(1.0, 0.7, quiet)] },
    legs: { near: [1.45, 1.45], far: [1.4, 1.4] },
    holding: 'glass', top: '#4a5246', bottom: '#24221f', hair: '#120e0b', hairStyle: 'short', skin: '#86624a', rim: lerp(0.35, 0.5, quiet),
  };
}

// 其他人（在脑内的未来里一下子不见了）
function drawCast(ctx, t, which) {
  const gone = future(t);
  for (const c of CAST) {
    if (which && !which.includes(c.id)) continue;
    const a = 1 - gone;
    if (a <= 0.01) continue;
    const draw = (cx) => person(cx, c.x, c.y, c.u, { ...c.look, ...c.pose(t), light: -2.3 });
    if (a < 0.99) layer(ctx, a, gone * 6, draw); else draw(ctx);
  }
}
function drawHero(ctx, t) { person(ctx, HERO.x, HERO.y, HERO.u, { ...heroPose(t), light: -2.4 }); }

function drawRoom(ctx, t, o = {}) {
  wall(ctx);
  windowFrame(ctx, t);
  stringLights(ctx, t);
  doorway(ctx, t);
  floor(ctx);
  spill(ctx, t);
  if (o.people !== false) drawCast(ctx, t, ['coat', 'talkA', 'talkB']);
  sofa(ctx);
  if (o.people !== false) drawCast(ctx, t, ['friend', 'arm']);
  if (o.hero !== false) drawHero(ctx, t);
  if (o.lamp !== false) lamp(ctx, t);
  table(ctx, t, { mess: o.mess ?? future(t) });
  if (o.people !== false) drawCast(ctx, t, ['snack']);
}

// 灯串：沿着墙顶挂的一串小灯泡（聚会的灯，脑内的未来里熄灭）
const BULBS = Array.from({ length: 22 }, (_, i) => { const x = -60 + i * 96; return [x, 66 + Math.sin(i * 0.9) * 6 + 26 * Math.sin(((i % 7) / 7) * Math.PI)]; });
function stringLights(ctx, t) {
  ctx.strokeStyle = 'rgba(30,24,20,0.8)';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  BULBS.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
  ctx.stroke();
  for (const [x, y] of BULBS) { ctx.fillStyle = '#3a3026'; ctx.beginPath(); ctx.ellipse(x, y + 8, 5, 8, 0, 0, Math.PI * 2); ctx.fill(); }
}
function stringGlow(ctx, t) {
  const on = strings(t);
  if (on <= 0.01) return;
  ctx.save();
  ctx.globalCompositeOperation = 'screen';
  BULBS.forEach(([x, y], i) => {
    const fl = 0.85 + 0.15 * noise1(t * 2 + i, 50 + i);
    const g = ctx.createRadialGradient(x, y + 8, 0, x, y + 8, 30);
    g.addColorStop(0, `rgba(255,214,150,${0.95 * on * fl})`);
    g.addColorStop(0.25, `rgba(255,190,120,${0.4 * on * fl})`);
    g.addColorStop(1, 'rgba(255,170,100,0)');
    ctx.fillStyle = g;
    ctx.fillRect(x - 30, y - 22, 60, 60);
  });
  ctx.restore();
}

// ---------------- 片名 ----------------
function title(ctx, t) {
  const a = smooth(prog(t, 0.0, 0.3)) * (1 - smooth(prog(t, 1.15, 1.55)));
  if (a <= 0.003) return;
  ctx.save();
  // 片名下面压一层暗，人群仍然在后面动
  const g = ctx.createRadialGradient(W / 2, H * 0.47, 80, W / 2, H * 0.47, 900);
  g.addColorStop(0, `rgba(10,8,6,${0.55 * a})`);
  g.addColorStop(1, `rgba(10,8,6,${0.25 * a})`);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
  const k = prog(t, 0.0, 1.55);
  ctx.globalAlpha = a;
  ctx.font = FONT.serifBlack(176);
  ctx.letterSpacing = `${lerp(52, 60, k)}px`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.shadowColor = 'rgba(0,0,0,0.6)';
  ctx.shadowBlur = 30;
  const blur = (1 - smooth(prog(t, 0.0, 0.35))) * 6;
  if (blur > 0.3) ctx.filter = `blur(${blur.toFixed(1)}px)`;
  ctx.fillStyle = '#efe5d0';
  ctx.fillText('悲观主义', W / 2 + 30, H * 0.47);
  ctx.filter = 'none';
  ctx.shadowBlur = 0;
  ctx.font = FONT.en(26);
  ctx.letterSpacing = '18px';
  ctx.fillStyle = 'rgba(232,222,204,0.7)';
  ctx.fillText('PESSIMISM', W / 2 + 9, H * 0.47 + 132);
  ctx.restore();
}

function draw(ctx, t) {
  const c = cam(t);
  const out = 1 - smooth(prog(t, 7.65, 8.25));
  ctx.save();
  ctx.globalAlpha *= out;
  withCam(ctx, c, 1, () => drawRoom(ctx, t));
  // 前景：右下角一只离镜头很近、失焦的酒杯；一个人从镜头前走过
  withCam(ctx, c, 1.35, () => foreground(ctx, 14, (fc) => {
    fc.save(); fc.translate(1780, 1150); glassShape(fc, 180, 300, { fill: 0.25, liquid: [110, 50, 30] }); fc.restore();
  }));
  const pk = prog(t, PASSER.t0, PASSER.t1);
  if (pk > 0 && pk < 1 && future(t) < 0.5) {
    withCam(ctx, c, 1.5, () => foreground(ctx, 22, (fc) => {
      person(fc, lerp(-500, 2400, pk), PASSER.y, PASSER.u, { ...PASSER.look, legs: { near: [Math.sin(t * 7) * 0.35, 0.3], far: [-Math.sin(t * 7) * 0.35, 0.3] }, arms: { near: [-Math.sin(t * 7) * 0.3, 0.3], far: [Math.sin(t * 7) * 0.3, 0.3] } });
    }));
  }
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
    stringGlow(ctx, t);
  });
  ctx.restore();
  title(ctx, t);
}

// 光：吊灯（主光）、灯串（聚会的暖光）、楼道、窗外；脑内的未来里只剩一盏变冷的吊灯
function light(t) {
  const c = cam(t);
  const w = 1 - smooth(prog(t, 7.7, 8.3));
  const F = future(t);
  const sc = (x, y) => toScreen(c, x, y);
  const out = [];
  const lampCol = [Math.round(lerp(255, 215, F)), Math.round(lerp(200, 210, F)), Math.round(lerp(140, 205, F))];
  const [lx, ly] = sc(LAMP.x + 40, 760);
  out.push({ x: lx, y: ly, rx: 760 * c.s, ry: 420 * c.s, i: lerp(1, 0.8, F), w, core: 0.22, color: lampCol });
  const [px, py] = sc(HERO.x - 30, 470);
  out.push({ x: px, y: py, rx: 330 * c.s, ry: 380 * c.s, i: 0.75, w, color: lampCol });
  const [gx, gy] = sc(LAMP.x, LAMP.y + 40);
  out.push({ x: gx, y: gy, rx: 300 * c.s, ry: 240 * c.s, i: 0.8, w });
  // 灯串照亮的墙和人
  const on = strings(t);
  const [sx, sy] = sc(960, 260);
  out.push({ x: sx, y: sy, rx: 1300 * c.s, ry: 380 * c.s, i: 0.62, w: w * on, color: [255, 196, 130] });
  const [ax, ay] = sc(720, 470);
  out.push({ x: ax, y: ay, rx: 360 * c.s, ry: 420 * c.s, i: 0.7, w: w * on, color: [255, 200, 140] });
  const [bx, by] = sc(1600, 560);
  out.push({ x: bx, y: by, rx: 380 * c.s, ry: 470 * c.s, i: 0.62, w: w * on, color: [255, 200, 140] });
  const open = 1 - doorClose(t), hall = hallLight(t);
  const [dx, dy] = sc(360, 470);
  out.push({ x: dx, y: dy, rx: 300 * c.s, ry: 520 * c.s, i: 0.95, w: w * hall * (0.2 + 0.8 * open), core: 0.35, color: [255, 200, 130] });
  const [fx, fy] = sc(470, 860);
  out.push({ x: fx, y: fy, rx: 520 * c.s, ry: 230 * c.s, i: 0.85, w: w * hall * open, rot: 0.25, color: [255, 200, 130] });
  const [wx, wy] = sc(1610, 300);
  out.push({ x: wx, y: wy, rx: 300 * c.s, ry: 330 * c.s, i: lerp(0.45, 0.65, F), w, color: [170, 190, 225] });
  return out;
}

function grade(t) { const F = future(t); return { warm: lerp(0.55, -0.25, F), ambient: lerp(0.15, 0.09, F) }; }

// 转场用：杯口在屏幕上的位置与大小
function rimOnScreen(t) {
  const c = cam(t);
  const [x, y] = toScreen(c, GLASS.x, GLASS.y - GLASS.h);
  return { x, y, rx: (GLASS.w / 2) * c.s, ry: GLASS.w * 0.16 * c.s };
}

// 静态画面（封面）用：指定门、楼道灯、灯串的状态
function setStatic(st) { ST = st; }

module.exports = { ...S, draw, drawOver, light, grade, cam, rimOnScreen, drawRoom, drawHero, cityLights, lampGlow, stringGlow, setStatic, future, GLASS, HERO, LAMP, roundRect };
