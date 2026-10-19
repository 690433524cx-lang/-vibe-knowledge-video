// 第二幕 · 7.2–16.9 秒：年夜饭——最热闹的时候，他已经看见了散场。
//   转场：上一幕杯口的椭圆高光放大、变圆、变红，长出剪纸花纹——窗上的圆形窗花。摄影机从窗花拉开。
//   8.5–12.5  一家人围着圆桌：爷爷举杯，奶奶低头夹菜，姑姑在笑，叔叔和爷爷碰杯，妈妈给他夹菜，
//             前排两个人背对镜头在聊天、伸筷子，一个小孩从后面跑过去；菜还冒着热气。
//   11.0 起   他慢下来，不再动筷子，注意力从人群里抽离。
//   12.6–14.9 同一个机位：人一个一个淡出，热气也散了。最后只剩空椅子、半盘菜、酒杯、碗筷，一把拉开的椅子还在轻轻晃。
//   15.6 起   摄影机推近窗户，窗外的灯开始横向流动，交给下一幕的列车车窗。
const { W, H } = require('../../../src/config');
const { FONT } = require('../../../src/lib/style');
const { prog, smooth, lerp, rng, noise1, easeInOut, easeOut } = require('../../../src/lib/util');
const { spring, pendulum } = require('../../../src/lib/motion');
const { withCam, toScreen, glassShape, bottle, plate, bowl, foreground } = require('../lib');
const { person, layer } = require('../people');
const { filtered } = require('../../../src/lib/material');
const party = require('./p1_party');

const S = { start: 7.2, end: 17.0 };

const FLOOR = 720;
const WIN = { x0: 540, x1: 1000, y0: 170, y1: 560 };
const CUT = { x: 770, y: 365, r: 118 };       // 窗花
const FU = { x: 1290, y: 330, s: 128 };       // 福
const LANTERN = { x: 1530, y: 120 };
const TBL = { cx: 960, cy: 830, rx: 520, ry: 120 };
const CHAIR = { x: 1575, y: 935 };            // 他的椅子（后腿着地点）：他「走」了以后被拉开、轻轻晃
const LAMP = { x: 1090, y: 300 };

// 摄影机：先对准窗花（与杯口高光重合），拉开摇到饭桌；15.6 起推近窗户
function cam(t) {
  const pull = easeInOut(prog(t, 8.45, 10.3));
  let c = { cx: lerp(CUT.x, 975, pull), cy: lerp(CUT.y, 615, pull), s: lerp(2.0, 1.13, pull) };
  // 之后机位几乎不动：热闹和散场必须是同一个画面
  c.cx += Math.sin(t * 0.35) * 4;
  const p = easeInOut(prog(t, 15.5, 16.9));
  if (p > 0) c = { cx: lerp(c.cx, (WIN.x0 + WIN.x1) / 2, p), cy: lerp(c.cy, (WIN.y0 + WIN.y1) / 2, p), s: lerp(c.s, 2.25, p) };
  return c;
}
// 窗外的灯开始流动（交给列车）
const flow = (t) => easeOut(prog(t, 15.7, 16.9));

const R = rng(2202);
// 对面的居民楼：几栋楼，每栋一格一格的窗，只有一部分亮着
const BLDG = [[0, 150, 120], [130, 120, 190], [262, 90, 140], [360, 150, 230]];
const LIT = [];
for (const [bx, bw, top] of BLDG) {
  for (let yy = top + 14; yy < 400; yy += 22) for (let xx = bx + 10; xx < bx + bw - 10; xx += 18) {
    if (R() < 0.3) LIT.push({ x: xx, y: yy, warm: R() < 0.75, a: 0.45 + R() * 0.5 });
  }
}

function wall(ctx) {
  // 上半截：旧米白墙（暗处偏灰）；下半截：墨绿色墙裙
  const g = ctx.createLinearGradient(0, -200, 0, FLOOR);
  g.addColorStop(0, '#3f3a33'); g.addColorStop(1, '#4a443b');
  ctx.fillStyle = g;
  ctx.fillRect(-500, -400, W + 1000, FLOOR + 400);
  ctx.fillStyle = '#2f3a33';
  ctx.fillRect(-500, 600, W + 1000, FLOOR - 600);
  ctx.fillStyle = 'rgba(230,220,190,0.14)';
  ctx.fillRect(-500, 600, W + 1000, 2);
  // 墙上的旧痕迹
  const r = rng(9);
  for (let i = 0; i < 30; i++) {
    ctx.fillStyle = `rgba(0,0,0,${0.03 + r() * 0.04})`;
    ctx.beginPath(); ctx.ellipse(r() * W, r() * 560, 40 + r() * 120, 20 + r() * 60, 0, 0, Math.PI * 2); ctx.fill();
  }
}

function floor(ctx) {
  // 水磨石：灰色底 + 碎石点
  ctx.fillStyle = '#4a463f';
  ctx.fillRect(-500, FLOOR, W + 1000, H + 600);
  const r = rng(31);
  for (let i = 0; i < 1600; i++) {
    const y = FLOOR + Math.pow(r(), 1.4) * 520;
    const s = (0.6 + r() * 2.2) * (1 + (y - FLOOR) / 300);
    ctx.fillStyle = r() < 0.5 ? 'rgba(220,210,190,0.22)' : r() < 0.5 ? 'rgba(20,18,16,0.3)' : 'rgba(120,90,70,0.25)';
    ctx.fillRect(-500 + r() * (W + 1000), y, s, s * 0.6);
  }
  ctx.fillStyle = '#2b2722';
  ctx.fillRect(-500, FLOOR - 10, W + 1000, 10);
}

// 窗外的夜：对面的居民楼，零星亮着的窗
function outside(ctx, t, a = 1) {
  const { x0, x1, y0, y1 } = WIN;
  const f = flow(t);
  ctx.save();
  ctx.beginPath(); ctx.rect(x0, y0, x1 - x0, y1 - y0); ctx.clip();
  const g = ctx.createLinearGradient(0, y0, 0, y1);
  g.addColorStop(0, '#171c26'); g.addColorStop(1, '#262a31');
  ctx.fillStyle = g;
  ctx.fillRect(x0, y0, x1 - x0, y1 - y0);
  ctx.fillStyle = '#101318';
  for (const [bx, bw, top] of BLDG) ctx.fillRect(x0 + bx, y0 + top, bw, y1 - y0);
  ctx.restore();
}
function outsideLights(ctx, t) {
  const { x0, x1, y0, y1 } = WIN;
  const f = flow(t);
  ctx.save();
  ctx.beginPath(); ctx.rect(x0 + 10, y0 + 10, x1 - x0 - 20, y1 - y0 - 20); ctx.clip();
  // 远处的烟花：很小、很淡，一次
  const fw = prog(t, 12.9, 14.6);
  if (fw > 0 && fw < 1 && f < 0.1) {
    const r0 = easeOut(fw) * 46;
    for (let i = 0; i < 22; i++) {
      const a = (i / 22) * Math.PI * 2;
      ctx.fillStyle = `rgba(255,214,150,${0.55 * (1 - fw)})`;
      ctx.beginPath(); ctx.arc(x0 + 330 + Math.cos(a) * r0, y0 + 70 + Math.sin(a) * r0 + fw * fw * 14, 1.8, 0, Math.PI * 2); ctx.fill();
    }
  }
  // 对面楼的窗：流动时拉成横向光带（带一点模糊，像镜头跟不上）
  const draw = (c) => {
    for (const l of LIT) {
      const speed = f * f * 2400;
      const x = x0 + ((l.x - speed * (0.7 + (l.y / 400) * 0.6)) % (x1 - x0) + (x1 - x0)) % (x1 - x0);
      if (f > 0.3 && (l.x + l.y) % 3 < 1) continue; // 流动起来以后少一些，不要糊成一片横线
      c.fillStyle = l.warm ? `rgba(255,200,130,${l.a * (1 - 0.35 * f)})` : `rgba(190,206,230,${l.a * 0.8 * (1 - 0.35 * f)})`;
      c.fillRect(x, y0 + l.y, 8 + f * 120, 10 * (1 - f * 0.5));
    }
  };
  if (f > 0.02) filtered(ctx, `blur(${(1 + f * 4).toFixed(1)}px)`, draw); else draw(ctx);
  ctx.restore();
}

// 圆形窗花：外圈 + 八瓣花 + 镂空的回纹；k 为「长出来」的程度
function papercut(ctx, r, k = 1, o = {}) {
  const { col = '#8e231b' } = o;
  ctx.save();
  ctx.fillStyle = col;
  // 外圈
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, Math.PI * 2);
  ctx.arc(0, 0, r * 0.9, 0, Math.PI * 2, true);
  ctx.fill();
  if (k > 0) {
    ctx.globalAlpha *= k;
    // 内圈锯齿
    ctx.beginPath();
    for (let i = 0; i <= 48; i++) {
      const a = (i / 48) * Math.PI * 2, rr = i % 2 ? r * 0.9 : r * 0.84;
      i ? ctx.lineTo(Math.cos(a) * rr, Math.sin(a) * rr) : ctx.moveTo(Math.cos(a) * rr, Math.sin(a) * rr);
    }
    ctx.arc(0, 0, r * 0.8, 0, Math.PI * 2, true);
    ctx.fill();
    // 八瓣花
    for (let i = 0; i < 8; i++) {
      ctx.save();
      ctx.rotate((i / 8) * Math.PI * 2);
      ctx.beginPath();
      ctx.moveTo(0, -r * 0.16);
      ctx.bezierCurveTo(r * 0.22, -r * 0.3, r * 0.16, -r * 0.66, 0, -r * 0.76);
      ctx.bezierCurveTo(-r * 0.16, -r * 0.66, -r * 0.22, -r * 0.3, 0, -r * 0.16);
      ctx.fill();
      // 花瓣里的镂空
      ctx.globalCompositeOperation = 'destination-out';
      ctx.beginPath(); ctx.ellipse(0, -r * 0.48, r * 0.045, r * 0.13, 0, 0, Math.PI * 2); ctx.fill();
      ctx.globalCompositeOperation = 'source-over';
      ctx.restore();
    }
    // 花心
    ctx.beginPath(); ctx.arc(0, 0, r * 0.15, 0, Math.PI * 2); ctx.fill();
    ctx.globalCompositeOperation = 'destination-out';
    ctx.beginPath(); ctx.arc(0, 0, r * 0.07, 0, Math.PI * 2); ctx.fill();
    ctx.globalCompositeOperation = 'source-over';
  }
  ctx.restore();
}

function windowFrame(ctx) {
  const { x0, x1, y0, y1 } = WIN;
  ctx.strokeStyle = '#5a5246';
  ctx.lineWidth = 16;
  ctx.strokeRect(x0, y0, x1 - x0, y1 - y0);
  ctx.lineWidth = 9;
  ctx.beginPath(); ctx.moveTo((x0 + x1) / 2, y0); ctx.lineTo((x0 + x1) / 2, y1); ctx.stroke();
  ctx.fillStyle = '#5a5246';
  ctx.fillRect(x0 - 26, y1, x1 - x0 + 52, 16);
  // 玻璃上的反光
  ctx.fillStyle = 'rgba(255,255,255,0.03)';
  ctx.beginPath(); ctx.moveTo(x0 + 40, y0); ctx.lineTo(x0 + 120, y0); ctx.lineTo(x0 + 20, y1); ctx.lineTo(x0, y1); ctx.closePath(); ctx.fill();
}

function fu(ctx, t) {
  ctx.save();
  ctx.translate(FU.x, FU.y);
  ctx.rotate(Math.PI / 4);
  const s = FU.s;
  ctx.shadowColor = 'rgba(0,0,0,0.5)'; ctx.shadowBlur = 10; ctx.shadowOffsetX = 4; ctx.shadowOffsetY = 6;
  ctx.fillStyle = '#93261d';
  ctx.fillRect(-s / 2, -s / 2, s, s);
  ctx.shadowColor = 'transparent';
  ctx.strokeStyle = 'rgba(200,150,80,0.55)';
  ctx.lineWidth = 2;
  ctx.strokeRect(-s / 2 + 7, -s / 2 + 7, s - 14, s - 14);
  ctx.rotate(-Math.PI / 4 + Math.PI); // 倒贴
  ctx.font = FONT.brush(96);
  ctx.fillStyle = '#1e1410';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('福', 0, 6);
  ctx.restore();
}

function lantern(ctx, t) {
  const sw = Math.sin(t * 0.8) * 0.02;
  ctx.save();
  ctx.translate(LANTERN.x, -120);
  ctx.rotate(sw);
  ctx.strokeStyle = 'rgba(40,30,24,0.9)'; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, LANTERN.y + 120 - 70); ctx.stroke();
  ctx.translate(0, LANTERN.y + 120);
  ctx.fillStyle = '#6a4a20';
  ctx.fillRect(-34, -84, 68, 16);
  ctx.fillRect(-34, 68, 68, 16);
  const g = ctx.createRadialGradient(-14, -12, 6, 0, 0, 90);
  g.addColorStop(0, '#e2553a'); g.addColorStop(0.6, '#a8281c'); g.addColorStop(1, '#5c140f');
  ctx.fillStyle = g;
  ctx.beginPath(); ctx.ellipse(0, 0, 86, 72, 0, 0, Math.PI * 2); ctx.fill();
  // 竹骨
  ctx.strokeStyle = 'rgba(60,14,10,0.5)'; ctx.lineWidth = 1.5;
  for (const k of [-0.66, -0.33, 0, 0.33, 0.66]) { ctx.beginPath(); ctx.ellipse(0, 0, 86 * Math.abs(Math.cos(Math.asin(k))) + 0.1, 72, 0, -Math.PI / 2, Math.PI / 2, k < 0); ctx.stroke(); }
  // 流苏
  ctx.strokeStyle = '#b8862e'; ctx.lineWidth = 1.4;
  for (let i = -5; i <= 5; i++) { ctx.beginPath(); ctx.moveTo(i * 3, 84); ctx.lineTo(i * 3.6 + Math.sin(t * 1.3 + i) * 2, 150); ctx.stroke(); }
  ctx.restore();
}
function lanternGlow(ctx, t) {
  const sw = Math.sin(t * 0.8) * 0.02;
  ctx.save();
  ctx.translate(LANTERN.x + Math.sin(sw) * (LANTERN.y + 120), LANTERN.y);
  ctx.globalCompositeOperation = 'screen';
  const g = ctx.createRadialGradient(-10, -8, 4, 0, 0, 82);
  g.addColorStop(0, 'rgba(255,170,110,0.65)'); g.addColorStop(0.7, 'rgba(220,70,40,0.22)'); g.addColorStop(1, 'rgba(200,40,20,0)');
  ctx.fillStyle = g;
  ctx.beginPath(); ctx.ellipse(0, 0, 86, 72, 0, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
}

// 椅子：侧面，靠背 + 坐面 + 四条腿。以后腿着地点为原点，tilt 为绕后腿的倾角
function chair(ctx, s, tilt = 0, o = {}) {
  const { col = '#3a2a1f', face = 1 } = o;
  ctx.save();
  ctx.scale(face, 1);
  ctx.rotate(-tilt);
  ctx.fillStyle = col;
  // 腿：方木，略有收分
  const leg = (x, top) => { ctx.beginPath(); ctx.moveTo(x - 9 * s, 0); ctx.lineTo(x - 7 * s, top); ctx.lineTo(x + 7 * s, top); ctx.lineTo(x + 9 * s, 0); ctx.closePath(); ctx.fill(); };
  leg(0, -120 * s); leg(-140 * s, -120 * s); leg(-36 * s, -120 * s);
  // 横档
  ctx.fillRect(-140 * s, -46 * s, 140 * s, 7 * s);
  // 坐面（有厚度）
  ctx.fillRect(-158 * s, -132 * s, 174 * s, 20 * s);
  // 靠背：两根立柱 + 一块弯的靠板
  ctx.beginPath(); ctx.moveTo(-4 * s, -120 * s); ctx.lineTo(6 * s, -250 * s); ctx.lineTo(20 * s, -250 * s); ctx.lineTo(12 * s, -120 * s); ctx.closePath(); ctx.fill();
  ctx.beginPath(); ctx.moveTo(-4 * s, -236 * s); ctx.quadraticCurveTo(8 * s, -230 * s, 22 * s, -238 * s); ctx.lineTo(18 * s, -186 * s); ctx.quadraticCurveTo(6 * s, -180 * s, -6 * s, -186 * s); ctx.closePath(); ctx.fill();
  // 受光的边
  ctx.fillStyle = 'rgba(255,214,170,0.16)';
  ctx.fillRect(-158 * s, -132 * s, 174 * s, 3 * s);
  ctx.fillRect(6 * s, -250 * s, 3 * s, 130 * s);
  ctx.restore();
}

// ---------------- 人 ----------------
const n = (t, sd, f = 1) => noise1(t * f, sd);
const pulse = (t, t0, dur) => { const k = prog(t, t0, t0 + dur); return k > 0 && k < 1 ? Math.sin(Math.PI * k) : 0; };
const laugh = (t, t0, dur) => pulse(t, t0, dur) * (0.6 + 0.4 * Math.sin(t * 24));
// 每个人淡出的时刻（12.6 起一个一个走）；孩子跑过去就不见了
const GONE = { nearB: 12.6, aunt: 12.95, uncle: 13.3, nearA: 13.6, grandpa: 13.9, mom: 14.2, grandma: 14.5, hero: 14.85 };
// 覆盖（「提前痛一次」那一镜用）：只让某一个人淡出 / 回来，孩子不跑
let OV = null;
function setOverride(o) { OV = o; }
const away = (id, t) => (OV ? OV.away(id) : (GONE[id] ? smooth(prog(t, GONE[id], GONE[id] + 0.55)) : 0));

const FAMILY = [
  // 后排（桌子后面）
  { id: 'aunt', x: 640, y: 772, u: 272, look: { face: -1, sit: true, top: '#7a3a2e', bottom: '#2a2420', hair: '#1a120e', hairStyle: 'long', skin: '#93705a', h: 0.95, build: 0.95 },
    pose: (t) => { const L = laugh(t, 9.2, 1.1) + laugh(t, 11.4, 0.9); return { lean: 0.15 - L * 0.1, hd: -0.05 - L * 0.35, arms: { near: [0.7, 1.3], far: [0.4, 1.2] }, holding: 'cup' }; } },
  { id: 'grandpa', x: 880, y: 765, u: 270, look: { view: 'front', sit: true, top: '#4a3b30', bottom: '#2a2420', hair: '#6a645c', hairStyle: 'grey', skin: '#8a674f', h: 0.98, build: 1.05 },
    pose: (t) => { const up = pulse(t, 8.8, 1.8); return { hd: 0.1 - up * 0.15, roll: n(t, 7, 0.6) * 0.05, arms: { left: [0.15, -0.6], right: [lerp(0.25, 0.35, up), lerp(-0.7, -2.5, up)] }, holding: 'cup', holdHand: 'right' }; } },
  { id: 'grandma', x: 1080, y: 768, u: 266, look: { view: 'front', sit: true, top: '#5a2a26', bottom: '#2a2420', hair: '#6a645c', hairStyle: 'grey', skin: '#8f6b55', h: 0.93, build: 1.0 },
    pose: (t) => { const reach = pulse(t, 9.4, 1.4) + pulse(t, 11.6, 1.2); return { hd: 0.45 + reach * 0.15, roll: -0.04, arms: { left: [0.2, -0.5], right: [0.2 + reach * 0.3, -0.9 - reach * 0.8] } }; } },
  { id: 'mom', x: 1310, y: 772, u: 270, look: { face: -1, sit: true, top: '#4a4a3a', bottom: '#2a2420', hair: '#140e0b', hairStyle: 'bun', skin: '#91705a', h: 0.95, build: 0.95 },
    pose: (t) => { const give = pulse(t, 9.7, 1.4); return { lean: 0.15 + give * 0.3, hd: 0.1 + give * 0.15, arms: { near: [0.6 + give * 0.7, 1.0 - give * 0.6], far: [0.4, 1.3] }, holding: 'chopsticks' }; } },
  // 两侧
  { id: 'uncle', x: 405, y: 875, u: 300, look: { face: -1, sit: true, top: '#2f3a34', bottom: '#24211e', hair: '#16110e', hairStyle: 'short', skin: '#86624a', h: 1.02, build: 1.12 },
    pose: (t) => { const toast = pulse(t, 8.8, 1.8); const L = laugh(t, 10.3, 1.1); return { lean: 0.2 - L * 0.1, hd: -0.05 - L * 0.3, arms: { near: [lerp(0.5, 1.3, toast), lerp(1.4, 0.4, toast)], far: [0.4, 1.2] }, holding: 'cup' }; } },
];
// 前排：背对镜头（离镜头近，是前景）
const NEAR = [
  { id: 'nearA', x: 770, y: 1060, u: 356, look: { view: 'back', sit: true, top: '#5a4a3a', bottom: '#1e1b18', hair: '#120d0a', hairStyle: 'short', h: 1.0, build: 1.05, rim: 0.25 },
    pose: (t) => { const r = pulse(t, 8.9, 1.2) + pulse(t, 10.6, 1.1); return { sway: n(t, 11, 0.7) * 0.6, roll: n(t, 12, 0.5) * 0.08, arms: { left: [0.15, 0.1], right: [0.3 + r * 0.9, -0.2 - r * 1.5] } }; } },
  { id: 'nearB', x: 1170, y: 1066, u: 348, look: { view: 'back', sit: true, top: '#3a4448', bottom: '#1e1b18', hair: '#1a120d', hairStyle: 'long', h: 0.95, build: 0.95, rim: 0.25 },
    pose: (t) => ({ sway: n(t, 13, 0.8) * 0.8, roll: -0.1 + n(t, 14, 0.6) * 0.12, arms: { left: [0.2, -0.3], right: [0.15, 0.1] } }) },
];
// 他：右侧，面朝左。先在吃、在笑；11.0 起停下来，注意力从人群里抽离
function heroPose(t) {
  const eat = pulse(t, 8.5, 0.9);
  const L = laugh(t, 9.5, 0.9);
  const still = easeInOut(prog(t, 11.0, 12.4));
  return { sit: true, face: 1, lean: lerp(0.22 - L * 0.08, 0.32, still), hd: lerp(0.05 - L * 0.28 + eat * 0.1, 0.32, still),
    arms: { near: [lerp(0.6 + eat * 0.5, 0.75, still), lerp(1.2 + eat * 1.2, 0.95, still)], far: [0.45, 1.2] },
    holding: still < 0.5 ? 'chopsticks' : null, top: '#4a5246', bottom: '#24221f', hair: '#120e0b', hairStyle: 'short', skin: '#86624a', rim: 0.38, light: -0.6 };
}
// 小孩从后面跑过去（右 → 左）
function child(ctx, t) {
  if (OV && OV.noChild) return;
  const k = prog(t, 9.0, 11.6);
  if (k <= 0 || k >= 1) return;
  const ph = t * 11;
  person(ctx, lerp(1720, 280, k), 846, 255, { face: 1, h: 0.62, build: 0.9, top: '#9a4a32', bottom: '#2a2420', hair: '#120d0a', hairStyle: 'short', skin: '#9a765e', lean: 0.2,
    legs: { near: [Math.sin(ph) * 0.6, 0.5 + Math.max(0, Math.cos(ph)) * 0.5], far: [-Math.sin(ph) * 0.6, 0.5 + Math.max(0, -Math.cos(ph)) * 0.5] },
    arms: { near: [-Math.sin(ph) * 0.6, 0.8], far: [Math.sin(ph) * 0.6, 0.8] }, alpha: smooth(prog(k, 0, 0.08)) * (1 - smooth(prog(k, 0.92, 1))) });
}

function drawPeople(ctx, t, list, light) {
  for (const c of list) {
    const g = away(c.id, t);
    if (g >= 0.999) continue;
    const fn = (cx) => person(cx, c.x, c.y - g * 14, c.u, { ...c.look, ...c.pose(t), light });
    if (g > 0.001) layer(ctx, 1 - g, g * 5, fn); else fn(ctx);
  }
}

// 椅子正面的靠背（前排，背对镜头的人坐着的椅子）
function chairBack(ctx, x, y, s, col = '#2a1e16') {
  ctx.save();
  ctx.translate(x, y);
  ctx.fillStyle = col;
  ctx.fillRect(-120 * s, -250 * s, 18 * s, 250 * s);
  ctx.fillRect(102 * s, -250 * s, 18 * s, 250 * s);
  ctx.fillRect(-128 * s, -262 * s, 256 * s, 26 * s);
  ctx.fillRect(-106 * s, -140 * s, 212 * s, 14 * s);
  for (const k of [-40, 0, 40]) ctx.fillRect((k - 6) * s, -236 * s, 12 * s, 96 * s);
  ctx.fillStyle = 'rgba(255,214,170,0.12)';
  ctx.fillRect(-128 * s, -262 * s, 256 * s, 3 * s);
  ctx.restore();
}

function lamp(ctx, t) {
  ctx.save();
  ctx.translate(LAMP.x, -300);
  ctx.strokeStyle = 'rgba(30,26,22,0.9)'; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, LAMP.y + 300); ctx.stroke();
  ctx.translate(0, LAMP.y + 300);
  ctx.beginPath(); ctx.moveTo(-20, 0); ctx.lineTo(20, 0); ctx.quadraticCurveTo(80, 10, 96, 56); ctx.lineTo(-96, 56); ctx.quadraticCurveTo(-80, 10, -20, 0); ctx.closePath();
  const g = ctx.createLinearGradient(-96, 0, 96, 0);
  g.addColorStop(0, '#3a2a20'); g.addColorStop(0.45, '#7a5a3a'); g.addColorStop(1, '#2a1e16');
  ctx.fillStyle = g; ctx.fill();
  ctx.restore();
}
function lampGlow(ctx) {
  ctx.save();
  ctx.translate(LAMP.x, LAMP.y + 56);
  ctx.beginPath(); ctx.ellipse(0, 0, 96, 12, 0, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(255,226,170,0.95)';
  ctx.shadowColor = 'rgba(255,190,110,0.9)'; ctx.shadowBlur = 40;
  ctx.fill();
  ctx.restore();
}

function tableTop(ctx, t) {
  const { cx, cy, rx, ry } = TBL;
  ctx.fillStyle = '#1e1712';
  ctx.fillRect(cx - 18, cy + 20, 36, 150);
  ctx.beginPath(); ctx.ellipse(cx, cy + 16, rx, ry, 0, 0, Math.PI); ctx.fillStyle = '#4a1e18'; ctx.fill();
  // 红色桌布
  ctx.beginPath(); ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
  const g = ctx.createLinearGradient(0, cy - ry, 0, cy + ry);
  g.addColorStop(0, '#6a2a22'); g.addColorStop(1, '#7e3428');
  ctx.fillStyle = g;
  ctx.fill();
  // 桌布垂下来的边
  ctx.beginPath(); ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI); ctx.lineTo(cx - rx, cy + 46); ctx.ellipse(cx, cy + 46, rx, ry, 0, Math.PI, 0, true); ctx.closePath();
  ctx.fillStyle = '#5a221c'; ctx.fill();
  ctx.beginPath(); ctx.ellipse(cx + 10, cy - 6, rx * 0.56, ry * 0.56, 0, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(200,210,215,0.07)'; ctx.fill();
  ctx.strokeStyle = 'rgba(230,236,240,0.22)'; ctx.lineWidth = 2; ctx.stroke();
  const at = (x, y, fn) => { ctx.save(); ctx.translate(x, y); fn(); ctx.restore(); };
  // 吃饭的时候：一整条鱼；散场以后：只剩鱼骨（随着人走慢慢「变」过去）
  const eaten = smooth(prog(t, 13.0, 14.8));
  at(cx - 40, cy - 30, () => plate(ctx, 120, 26, { seed: 21, crumbs: Math.round(eaten * 8), food: (c, prx, pry) => {
    c.save(); c.globalAlpha *= 1 - eaten;
    c.fillStyle = '#9a6a3c'; c.beginPath(); c.ellipse(0, 0, prx * 0.62, pry * 0.42, 0, 0, Math.PI * 2); c.fill();
    c.fillStyle = '#b0884a'; c.beginPath(); c.moveTo(prx * 0.58, 0); c.lineTo(prx * 0.78, -pry * 0.35); c.lineTo(prx * 0.78, pry * 0.35); c.closePath(); c.fill();
    c.fillStyle = 'rgba(80,120,60,0.8)'; for (let i = -3; i <= 3; i++) c.fillRect(i * 12, -3, 8, 2);
    c.restore();
    c.save(); c.globalAlpha *= eaten;
    c.strokeStyle = 'rgba(230,220,200,0.85)'; c.lineWidth = 2.2;
    c.beginPath(); c.moveTo(-prx * 0.55, 0); c.lineTo(prx * 0.5, -2); c.stroke();
    for (let i = -5; i <= 4; i++) { c.beginPath(); c.moveTo(i * 10, -1); c.lineTo(i * 10 + 6, -pry * 0.45); c.moveTo(i * 10, 0); c.lineTo(i * 10 + 6, pry * 0.45); c.stroke(); }
    c.restore();
  } }));
  // 饺子：先是满满一盘，后来剩一半
  at(cx + 190, cy - 14, () => plate(ctx, 88, 20, { seed: 22, crumbs: 3, food: (c) => {
    const pts = [[-30, -4], [-6, -6], [16, 2], [-20, 6], [8, -10], [30, -2], [-40, 4], [22, 9], [-10, 10]];
    const keep = Math.round(lerp(pts.length, 4, eaten));
    for (const [dx, dy] of pts.slice(0, keep)) { c.fillStyle = '#e6dcc6'; c.beginPath(); c.ellipse(dx, dy, 16, 8, 0.1, Math.PI, 0); c.fill(); c.strokeStyle = 'rgba(150,130,100,0.6)'; c.lineWidth = 1; c.stroke(); }
  } }));
  // 一盘青菜、一盘红烧肉
  at(cx - 250, cy + 30, () => plate(ctx, 64, 15, { seed: 24, crumbs: 0, food: (c) => { c.save(); c.globalAlpha *= lerp(1, 0.35, eaten); c.fillStyle = '#3e5a30'; c.beginPath(); c.ellipse(0, 0, 40, 9, 0, 0, Math.PI * 2); c.fill(); c.restore(); } }));
  at(cx + 300, cy + 34, () => plate(ctx, 60, 14, { seed: 25, crumbs: 0, food: (c) => { c.save(); c.globalAlpha *= lerp(1, 0.3, eaten); c.fillStyle = '#7a3018'; for (const [dx, dy] of [[-14, 0], [6, -3], [18, 3], [-4, 4]]) { c.beginPath(); c.ellipse(dx, dy, 9, 6, 0, 0, Math.PI * 2); c.fill(); } c.restore(); } }));
  at(cx - 330, cy - 6, () => bowl(ctx, 36, 9, 22, { inner: '#e0d6c4' }));
  at(cx + 400, cy + 6, () => bowl(ctx, 36, 9, 22, { inner: '#e0d6c4' }));
  at(cx + 40, cy + 72, () => bowl(ctx, 40, 10, 26, { inner: '#e0d6c4' }));
  at(cx - 120, cy + 70, () => bowl(ctx, 38, 9, 24, { inner: '#e0d6c4' }));
  ctx.strokeStyle = '#c9a26a'; ctx.lineWidth = 3.4; ctx.lineCap = 'round';
  for (const [x0, y0, x1, y1] of [[cx - 370, cy - 30, cx - 280, cy - 18], [cx + 70, cy + 48, cx + 170, cy + 58], [cx + 350, cy + 50, cx + 450, cy + 38], [cx - 160, cy + 50, cx - 70, cy + 60]]) {
    ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.stroke();
  }
  at(cx - 190, cy + 40, () => glassShape(ctx, 26, 30, { fill: lerp(0.6, 0.1, eaten), liquid: [200, 170, 120] }));
  at(cx + 250, cy + 64, () => glassShape(ctx, 26, 30, { fill: lerp(0.6, 0.35, eaten), liquid: [200, 170, 120] }));
  at(cx - 110, cy - 54, () => glassShape(ctx, 24, 28, { fill: lerp(0.5, 0, eaten), liquid: [200, 170, 120] }));
  at(cx + 110, cy - 40, () => bottle(ctx, 30, 118, { col: [90, 30, 22] }));
}

// 热气：几道很淡的、往上飘的气（人走了以后也散了）
function steam(ctx, t) {
  const a = 1 - smooth(prog(t, 12.8, 14.6));
  if (a <= 0.01) return;
  ctx.save();
  ctx.lineCap = 'round';
  for (const [x, y, sd] of [[TBL.cx - 40, TBL.cy - 40, 1], [TBL.cx + 190, TBL.cy - 22, 2], [TBL.cx - 250, TBL.cy + 22, 3], [TBL.cx + 300, TBL.cy + 26, 4]]) {
    for (let k = 0; k < 3; k++) {
      const ph = (t * 0.45 + k / 3 + sd * 0.17) % 1;
      ctx.strokeStyle = `rgba(240,230,215,${0.16 * a * Math.sin(Math.PI * ph)})`;
      ctx.lineWidth = 6;
      ctx.beginPath();
      for (let i = 0; i <= 10; i++) {
        const yy = y - ph * 120 - i * 9;
        const xx = x + (k - 1) * 16 + Math.sin(i * 0.6 + t * 1.6 + sd) * 7;
        i ? ctx.lineTo(xx, yy) : ctx.moveTo(xx, yy);
      }
      ctx.stroke();
    }
  }
  ctx.restore();
}

// 他的椅子：他「走」了以后，椅子是拉开的，还在轻轻晃
function heroChair(ctx, t) {
  const tilt = Math.max(0, pendulum(t, GONE.hero + 0.2, 0.09, 0.95, 0.9));
  ctx.save();
  ctx.translate(CHAIR.x, CHAIR.y);
  chair(ctx, 1.22, tilt, { col: '#3e2d21', face: -1 });
  ctx.restore();
}

function draw(ctx, t) {
  const c = cam(t);
  const a = smooth(prog(t, 8.2, 8.7)) * (1 - smooth(prog(t, 16.5, 16.95)));
  if (a <= 0) return;
  ctx.save();
  ctx.globalAlpha *= a;
  withCam(ctx, c, 1, () => {
    wall(ctx);
    outside(ctx, t);
    windowFrame(ctx);
    ctx.save(); ctx.translate(CUT.x, CUT.y); papercut(ctx, CUT.r, 1); ctx.restore();
    fu(ctx, t);
    floor(ctx);
    lantern(ctx, t);
    lamp(ctx, t);
    // 后排的椅背（人走了以后露出来）
    for (const x of [640, 880, 1080, 1310]) { ctx.save(); ctx.translate(x + 40, 775); chair(ctx, 0.85, 0, { col: '#2e221a', face: x < 960 ? -1 : 1 }); ctx.restore(); }
    child(ctx, t);
    drawPeople(ctx, t, FAMILY.filter((f) => f.id !== 'uncle'), -1.7);
    // 叔叔的椅子（左侧）
    ctx.save(); ctx.translate(345, 935); chair(ctx, 1.2, 0, { col: '#3a2a1f', face: 1 }); ctx.restore();
    tableTop(ctx, t);
    drawPeople(ctx, t, FAMILY.filter((f) => f.id === 'uncle'), -1.0);
    heroChair(ctx, t);
    const g = away('hero', t);
    if (g < 0.999) {
      const fn = (cx) => person(cx, 1530, 870 - g * 14, 305, heroPose(t));
      if (g > 0.001) layer(ctx, 1 - g, g * 5, fn); else fn(ctx);
    }
    drawPeople(ctx, t, NEAR, -1.6);
    chairBack(ctx, 770, 1160, 1.02);
    chairBack(ctx, 1170, 1165, 1.0);
  });
  // 前景：左下一只离镜头很近的酒杯，失焦
  withCam(ctx, c, 1.4, () => foreground(ctx, 14, (fc) => {
    fc.save(); fc.translate(150, 1180); glassShape(fc, 120, 150, { fill: 0.5, liquid: [210, 170, 110] }); fc.restore();
  }));
  ctx.restore();
}

function drawOver(ctx, t) {
  const c = cam(t);
  const a = smooth(prog(t, 8.2, 8.7)) * (1 - smooth(prog(t, 16.5, 16.95)));
  if (a > 0) {
    ctx.save();
    ctx.globalAlpha *= a;
    withCam(ctx, c, 1, () => {
      outsideLights(ctx, t);
      ctx.save(); ctx.globalAlpha *= 1 - smooth(prog(t, 15.5, 16.1)); lanternGlow(ctx, t); lampGlow(ctx); ctx.restore();
      steam(ctx, t);
    });
    ctx.restore();
  }
  // 转场：杯口高光 → 窗花
  if (t < 8.9) {
    const rim = party.rimOnScreen(Math.min(t, 8.5));
    const k = smooth(prog(t, 7.35, 8.45));
    const [tx, ty] = toScreen(cam(8.45), CUT.x, CUT.y);
    const tr = CUT.r * cam(8.45).s;
    const x = lerp(rim.x, tx, k), y = lerp(rim.y, ty, k);
    const rx = lerp(rim.rx, tr, k), ry = lerp(rim.ry, tr, k);
    const col = [Math.round(lerp(255, 142, k)), Math.round(lerp(240, 35, k)), Math.round(lerp(215, 27, k))];
    const fade = 1 - smooth(prog(t, 8.45, 8.9));
    ctx.save();
    ctx.globalAlpha *= fade * smooth(prog(t, 7.2, 7.5));
    ctx.translate(x, y);
    ctx.scale(1, ry / rx);
    ctx.shadowColor = `rgba(${col.join(',')},0.6)`;
    ctx.shadowBlur = lerp(20, 4, k);
    papercut(ctx, rx, smooth(prog(t, 7.9, 8.45)), { col: `rgb(${col.join(',')})` });
    ctx.restore();
  }
}

// 光：桌上方的吊灯（暖黄，主光）、红灯笼（红）、窗外（冷，很弱）。人走了以后吊灯暗一档、整体略冷
function light(t) {
  const c = cam(t);
  const w = smooth(prog(t, 8.15, 8.7)) * (1 - smooth(prog(t, 16.4, 16.95)));
  const empty = smooth(prog(t, 12.8, 15.0));
  const sc = (x, y) => toScreen(c, x, y);
  const [tx, ty] = sc(TBL.cx + 40, TBL.cy - 60);
  const [lx, ly] = sc(LANTERN.x, LANTERN.y + 40);
  const [wx, wy] = sc(CUT.x, CUT.y + 40);
  const [hx, hy] = sc(1520, 640);
  const [fx, fy] = sc(FU.x, FU.y);
  const [gx, gy] = sc(LAMP.x, LAMP.y + 40);
  const [nx, ny] = sc(970, 900);
  return [
    { x: tx, y: ty, rx: 820 * c.s, ry: 380 * c.s, i: lerp(1, 0.85, empty), w, color: [255, 206, 140], core: 0.25 },
    { x: gx, y: gy, rx: 300 * c.s, ry: 220 * c.s, i: 0.8, w },
    { x: lx, y: ly, rx: 540 * c.s, ry: 500 * c.s, i: 0.85, w, color: [255, 90, 60] },
    { x: fx, y: fy, rx: 260 * c.s, ry: 220 * c.s, i: 0.55, w, color: [255, 120, 80] },
    { x: wx, y: wy, rx: 380 * c.s, ry: 330 * c.s, i: 0.55, w, color: [180, 196, 225] },
    { x: hx, y: hy, rx: 300 * c.s, ry: 380 * c.s, i: 0.7, w, color: [255, 190, 130] },
    { x: nx, y: ny, rx: 700 * c.s, ry: 260 * c.s, i: 0.45, w, color: [255, 170, 110] },
  ];
}
function grade(t) { return { warm: lerp(0.5, 0.18, smooth(prog(t, 12.8, 15.0))), ambient: 0.11, w: smooth(prog(t, 8.15, 8.7)) }; }

function windowOnScreen(t) {
  const c = cam(t);
  const [x0, y0] = toScreen(c, WIN.x0, WIN.y0), [x1, y1] = toScreen(c, WIN.x1, WIN.y1);
  return { x0, y0, x1, y1 };
}

module.exports = { ...S, draw, drawOver, light, grade, cam, windowOnScreen, papercut, setOverride };
