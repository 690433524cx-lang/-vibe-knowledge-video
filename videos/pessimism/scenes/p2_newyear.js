// 第二幕 · 7.2–16.9 秒：年夜饭已经吃完。
//   转场：上一幕那只杯子的杯口高光（暖白椭圆）放大、变圆、变成暗红，长出剪纸花纹——窗上的圆形窗花。
//   摄影机从窗花拉开，摇到饭桌：鱼、半盘饺子、碗筷、酒杯；红灯笼还亮着，倒贴的「福」还在。
//   一把刚有人坐过的椅子被推开，还在轻轻晃，随后停住。窗外很远的地方一朵很淡的烟花。
//   15.6 起摄影机推近窗户，窗外的灯开始横向流动，交给下一幕的列车车窗。
const { W, H } = require('../../../src/config');
const { FONT } = require('../../../src/lib/style');
const { prog, smooth, lerp, rng, noise1, easeInOut, easeOut } = require('../../../src/lib/util');
const { spring, pendulum } = require('../../../src/lib/motion');
const { withCam, toScreen, glassShape, bottle, plate, bowl, foreground } = require('../lib');
const { filtered } = require('../../../src/lib/material');
const party = require('./p1_party');

const S = { start: 7.2, end: 17.0 };

const FLOOR = 720;
const WIN = { x0: 540, x1: 1000, y0: 170, y1: 560 };
const CUT = { x: 770, y: 365, r: 118 };       // 窗花
const FU = { x: 1290, y: 330, s: 128 };       // 福
const LANTERN = { x: 1530, y: 120 };
const TBL = { cx: 960, cy: 830, rx: 520, ry: 120 };
const CHAIR = { x: 1490, y: 905 };            // 被推开的那把椅子（脚底）

// 摄影机：先对准窗花（与杯口高光重合），拉开摇到饭桌；15.6 起推近窗户
function cam(t) {
  const pull = easeInOut(prog(t, 8.45, 11.6));
  const s0 = 2.0;
  let c = { cx: lerp(CUT.x, 1010, pull), cy: lerp(CUT.y, 580, pull), s: lerp(s0, 1.04, pull) };
  const drift = prog(t, 11.6, 15.6);
  c.cx += drift * 18; c.s += drift * 0.02;
  const p = easeInOut(prog(t, 15.4, 16.9));
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

function table(ctx, t) {
  const { cx, cy, rx, ry } = TBL;
  // 远处的两把椅子（靠背露出桌面以上）
  ctx.save();
  ctx.translate(cx - 230, cy - 26);
  chair(ctx, 0.9, 0, { col: '#2e221a' });
  ctx.restore();
  ctx.save();
  ctx.translate(cx + 300, cy - 30);
  chair(ctx, 0.9, 0, { col: '#2e221a', face: -1 });
  ctx.restore();
  // 桌腿 + 桌面边
  ctx.fillStyle = '#1e1712';
  ctx.fillRect(cx - 18, cy + 20, 36, 150);
  ctx.beginPath(); ctx.ellipse(cx, cy + 16, rx, ry, 0, 0, Math.PI); ctx.fillStyle = '#2b1f17'; ctx.fill();
  // 桌面
  ctx.beginPath(); ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
  const g = ctx.createLinearGradient(0, cy - ry, 0, cy + ry);
  g.addColorStop(0, '#5a3f2c'); g.addColorStop(1, '#6b4a32');
  ctx.fillStyle = g;
  ctx.fill();
  // 玻璃转盘
  ctx.beginPath(); ctx.ellipse(cx + 10, cy - 6, rx * 0.56, ry * 0.56, 0, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(200,210,215,0.08)'; ctx.fill();
  ctx.strokeStyle = 'rgba(230,236,240,0.25)'; ctx.lineWidth = 2; ctx.stroke();
  const at = (x, y, fn) => { ctx.save(); ctx.translate(x, y); fn(); ctx.restore(); };
  // 鱼：只剩鱼骨
  at(cx - 40, cy - 30, () => plate(ctx, 120, 26, { seed: 21, crumbs: 6, food: (c, prx, pry) => {
    c.strokeStyle = 'rgba(230,220,200,0.85)'; c.lineWidth = 2.2;
    c.beginPath(); c.moveTo(-prx * 0.55, 0); c.lineTo(prx * 0.5, -2); c.stroke();
    for (let i = -5; i <= 4; i++) { c.beginPath(); c.moveTo(i * 10, -1); c.lineTo(i * 10 + 6, -pry * 0.45); c.moveTo(i * 10, 0); c.lineTo(i * 10 + 6, pry * 0.45); c.stroke(); }
    c.fillStyle = '#7a5434'; c.beginPath(); c.ellipse(-prx * 0.62, 0, 14, 8, 0, 0, Math.PI * 2); c.fill();
    c.fillStyle = 'rgba(120,70,40,0.6)'; c.beginPath(); c.ellipse(0, 4, prx * 0.6, pry * 0.4, 0, 0, Math.PI * 2); c.fill();
  } }));
  // 半盘饺子
  at(cx + 190, cy - 14, () => plate(ctx, 88, 20, { seed: 22, crumbs: 3, food: (c, prx, pry) => {
    for (const [dx, dy] of [[-30, -4], [-6, -6], [16, 2], [-20, 6]]) {
      c.fillStyle = '#e6dcc6'; c.beginPath(); c.ellipse(dx, dy, 16, 8, 0.1, Math.PI, 0); c.fill();
      c.strokeStyle = 'rgba(150,130,100,0.6)'; c.lineWidth = 1; c.stroke();
    }
  } }));
  at(cx - 300, cy + 4, () => bowl(ctx, 40, 10, 26, { inner: '#5a3b26' }));
  at(cx + 360, cy + 24, () => bowl(ctx, 40, 10, 26, { inner: '#d8cfbd' }));
  at(cx + 30, cy + 70, () => bowl(ctx, 42, 10, 28, { inner: '#d8cfbd' }));
  // 筷子：横搭在碗上、散在桌上
  ctx.strokeStyle = '#c9a26a'; ctx.lineWidth = 3.4; ctx.lineCap = 'round';
  for (const [x0, y0, x1, y1] of [[cx - 350, cy - 26, cx - 250, cy - 12], [cx - 352, cy - 20, cx - 252, cy - 4], [cx + 60, cy + 46, cx + 168, cy + 58], [cx + 300, cy + 54, cx + 410, cy + 40]]) {
    ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.stroke();
  }
  // 小酒杯 + 一瓶酒
  at(cx - 170, cy + 46, () => glassShape(ctx, 26, 30, { fill: 0.1, liquid: [200, 170, 120] }));
  at(cx + 250, cy + 70, () => glassShape(ctx, 26, 30, { fill: 0.4, liquid: [200, 170, 120] }));
  at(cx - 120, cy - 54, () => glassShape(ctx, 24, 28, { fill: 0, liquid: [200, 170, 120] }));
  at(cx + 110, cy - 40, () => bottle(ctx, 30, 118, { col: [90, 30, 22] }));
  // 一碟花生 / 一盘凉菜
  at(cx - 210, cy + 74, () => plate(ctx, 54, 13, { seed: 23, crumbs: 22 }));
}

// 被推开的椅子：t0 起按阻尼摆晃，10.8 后几乎停住
function rockingChair(ctx, t) {
  const tilt = Math.max(0, pendulum(t, 8.4, 0.11, 0.95, 0.75));
  ctx.save();
  ctx.translate(CHAIR.x, CHAIR.y);
  chair(ctx, 1.25, tilt, { col: '#3e2d21', face: -1 });
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
    table(ctx, t);
    rockingChair(ctx, t);
  });
  // 前景：左下一把离镜头很近的椅背，失焦
  withCam(ctx, c, 1.4, () => foreground(ctx, 16, (fc) => {
    fc.save(); fc.translate(260, 1260); chair(fc, 2.4, 0, { col: '#1f1712' }); fc.restore();
  }));
  ctx.restore();
}

function drawOver(ctx, t) {
  const c = cam(t);
  const a = smooth(prog(t, 8.2, 8.7)) * (1 - smooth(prog(t, 16.5, 16.95)));
  if (a > 0) {
    ctx.save();
    ctx.globalAlpha *= a;
    withCam(ctx, c, 1, () => { outsideLights(ctx, t); lanternGlow(ctx, t); });
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

// 光：桌上方的吊灯（暖）、红灯笼（红）、窗外（冷，很弱）
function light(t) {
  const c = cam(t);
  const w = smooth(prog(t, 8.15, 8.7)) * (1 - smooth(prog(t, 16.4, 16.95)));
  const sc = (x, y) => toScreen(c, x, y);
  const [tx, ty] = sc(TBL.cx, TBL.cy - 20);
  const [lx, ly] = sc(LANTERN.x, LANTERN.y + 40);
  const [wx, wy] = sc(CUT.x, CUT.y + 40);
  const [chx, chy] = sc(CHAIR.x - 60, CHAIR.y - 160);
  const [fx, fy] = sc(FU.x, FU.y);
  return [
    { x: tx, y: ty, rx: 760 * c.s, ry: 330 * c.s, i: 1, w, color: [255, 204, 150], core: 0.25 },
    { x: lx, y: ly, rx: 520 * c.s, ry: 480 * c.s, i: 0.85, w, color: [255, 90, 60] },
    { x: fx, y: fy, rx: 260 * c.s, ry: 220 * c.s, i: 0.55, w, color: [255, 120, 80] },
    { x: wx, y: wy, rx: 380 * c.s, ry: 330 * c.s, i: 0.55, w, color: [180, 196, 225] },
    { x: chx, y: chy, rx: 260 * c.s, ry: 300 * c.s, i: 0.6, w, color: [255, 140, 100] },
    { x: (wx + lx) / 2, y: wy, rx: 620 * c.s, ry: 420 * c.s, i: 0.38, w, color: [255, 170, 120] },
  ];
}
function grade(t) { return { warm: 0.4, ambient: 0.1, w: smooth(prog(t, 8.15, 8.7)) }; }

function windowOnScreen(t) {
  const c = cam(t);
  const [x0, y0] = toScreen(c, WIN.x0, WIN.y0), [x1, y1] = toScreen(c, WIN.x1, WIN.y1);
  return { x0, y0, x1, y1 };
}

module.exports = { ...S, draw, drawOver, light, grade, cam, windowOnScreen, papercut };
