// 第三幕 · 16.3–25.6 秒：旅行第一天，夜行列车。
//   接上一幕：窗外的灯已经在流动；摄影机从车窗拉开、摇向右侧——他靠窗坐着，看着窗外。
//   小桌板上的手机亮着：DAY 1。窗外的光一阵阵扫过他的侧脸。
//   19.6 他慢慢低下头。20.6 切到手机特写（俯拍、手的局部）：行程页被拇指往下推，惯性停在一张返程票上——RETURN。
const { W, H } = require('../../../src/config');
const { FONT } = require('../../../src/lib/style');
const { prog, smooth, lerp, rng, noise1, easeInOut, easeOut } = require('../../../src/lib/util');
const { spring, glide } = require('../../../src/lib/motion');
const { withCam, toScreen, foreground, smoothPath } = require('../lib');
const { filtered } = require('../../../src/lib/material');
const { person } = require('../people');
const { roundRect } = require('./p1_party');

const S = { start: 16.3, end: 25.8 };
const CUT_T = 20.6;   // 切到手机特写

const WIN = { x0: 120, x1: 1180, y0: 190, y1: 640, r: 46 };
const PERSON = { x: 1450, y: 712, u: 385 };
const SEAT = { x: 1500, top: 300, bottom: 760 };
const TRAY = { x0: 1010, x1: 1250, y: 742 };
const PHONE = { x: 1120, y: 734, w: 78, h: 150 };

// ---------------- 摄影机 ----------------
function cam(t) {
  const k = easeInOut(prog(t, 16.6, 19.4));
  return { cx: lerp(650, 1170, k), cy: lerp(415, 545, k), s: lerp(1.55, 1.32, k) + 0.03 * prog(t, 19.4, CUT_T) };
}

// ---------------- 窗外 ----------------
// 列车往左开（他面朝左），窗外的东西往右流：远处慢、近处快。
const R = rng(3303);
const FAR = Array.from({ length: 90 }, () => ({ x: R(), y: R(), r: 0.7 + R() * 1.8, warm: R() < 0.65, a: 0.3 + R() * 0.6 }));
const MID = Array.from({ length: 9 }, (_, i) => ({ x: i / 9 + R() * 0.05, y: 0.52 + R() * 0.12, r: 4 + R() * 3 }));
const POLES = Array.from({ length: 5 }, (_, i) => ({ x: i / 5 + R() * 0.08 }));

function outside(ctx, t) {
  const { x0, x1, y0, y1, r } = WIN;
  const w = x1 - x0, h = y1 - y0;
  ctx.save();
  roundRect(ctx, x0, y0, w, h, r);
  ctx.clip();
  const g = ctx.createLinearGradient(0, y0, 0, y1);
  g.addColorStop(0, '#141a24'); g.addColorStop(0.62, '#262a34'); g.addColorStop(1, '#0f1116');
  ctx.fillStyle = g;
  ctx.fillRect(x0, y0, w, h);
  // 远处一条低矮的天际线
  ctx.fillStyle = '#0d1015';
  const off = (t * 22) % 400;
  for (let i = -1; i < 7; i++) {
    const bx = x0 + i * 200 + off - 200;
    ctx.fillRect(bx, y0 + h * 0.6 - 30 - ((i * 37) % 50), 120, 200);
    ctx.fillRect(bx + 130, y0 + h * 0.6 - 10 - ((i * 53) % 30), 60, 200);
  }
  ctx.restore();
}

function outsideLights(ctx, t, a = 1) {
  const { x0, x1, y0, y1, r } = WIN;
  const w = x1 - x0, h = y1 - y0;
  ctx.save();
  roundRect(ctx, x0, y0, w, h, r);
  ctx.clip();
  ctx.globalAlpha *= a;
  // 远处的灯：慢，带一点拖影
  for (const l of FAR) {
    const x = x0 + (((l.x * w + t * 60 * (0.5 + l.y)) % w) + w) % w;
    const y = y0 + h * (0.42 + l.y * 0.2);
    ctx.fillStyle = l.warm ? `rgba(255,204,140,${l.a})` : `rgba(190,206,232,${l.a * 0.8})`;
    ctx.fillRect(x, y, l.r + 3, l.r);
  }
  // 路灯：快，拉成柔和的光带
  filtered(ctx, 'blur(5px)', (c) => {
    for (const l of MID) {
      const x = x0 + (((l.x * (w + 600) + t * 700) % (w + 600)) + (w + 600)) % (w + 600) - 300;
      const y = y0 + h * l.y;
      const lg = c.createLinearGradient(x - 220, 0, x, 0);
      lg.addColorStop(0, 'rgba(255,190,110,0)');
      lg.addColorStop(1, 'rgba(255,204,140,0.85)');
      c.fillStyle = lg;
      c.fillRect(x - 220, y - l.r / 2, 220, l.r);
      const rg = c.createRadialGradient(x, y, 0, x, y, l.r * 6);
      rg.addColorStop(0, 'rgba(255,214,160,0.45)');
      rg.addColorStop(1, 'rgba(255,214,160,0)');
      c.fillStyle = rg;
      c.fillRect(x - l.r * 6, y - l.r * 6, l.r * 12, l.r * 12);
    }
  });
  // 近处的电线杆：很快，糊成一道暗影
  ctx.filter = 'blur(10px)';
  for (const p of POLES) {
    const x = x0 + (((p.x * (w + 400) + t * 1500) % (w + 400)) + (w + 400)) % (w + 400) - 200;
    ctx.fillStyle = 'rgba(6,6,8,0.75)';
    ctx.fillRect(x, y0, 46, h);
  }
  ctx.filter = 'none';
  ctx.restore();
}

// 车窗上淡淡的倒影：他的侧影
function reflection(ctx, t) {
  ctx.save();
  roundRect(ctx, WIN.x0, WIN.y0, WIN.x1 - WIN.x0, WIN.y1 - WIN.y0, WIN.r);
  ctx.clip();
  ctx.globalAlpha *= 0.09;
  ctx.translate(900, 700);
  person(ctx, 0, 0, 300, { sit: true, face: -1, lean: 0.2, hd: -0.1, rim: 0 });
  ctx.restore();
}

// ---------------- 车厢 ----------------
function cabin(ctx, t) {
  // 车厢侧壁：上浅下深
  const g = ctx.createLinearGradient(0, 0, 0, 900);
  g.addColorStop(0, '#4a4f55'); g.addColorStop(1, '#3a3d42');
  ctx.fillStyle = g;
  ctx.fillRect(-400, -200, W + 800, 1100);
  ctx.fillStyle = '#2c2f33';
  ctx.fillRect(-400, 700, W + 800, 400);
  // 行李架
  ctx.fillStyle = '#5a5e63';
  ctx.fillRect(-400, 96, W + 800, 10);
  ctx.fillStyle = 'rgba(0,0,0,0.35)';
  ctx.fillRect(-400, 106, W + 800, 22);
  // 窗户的橡胶边 + 窗台
  ctx.save();
  roundRect(ctx, WIN.x0 - 18, WIN.y0 - 18, WIN.x1 - WIN.x0 + 36, WIN.y1 - WIN.y0 + 36, WIN.r + 14);
  ctx.fillStyle = '#26282c';
  ctx.fill();
  ctx.restore();
  ctx.fillStyle = '#55595e';
  ctx.fillRect(WIN.x0 - 40, WIN.y1 + 18, WIN.x1 - WIN.x0 + 80, 14);
  // 窗帘（收在窗户左边）
  ctx.fillStyle = '#33393f';
  ctx.beginPath(); ctx.moveTo(30, 150); ctx.lineTo(110, 150); ctx.quadraticCurveTo(96, 420, 120, 690); ctx.lineTo(24, 690); ctx.closePath(); ctx.fill();
  ctx.strokeStyle = 'rgba(0,0,0,0.3)'; ctx.lineWidth = 3;
  for (const x of [52, 76, 96]) { ctx.beginPath(); ctx.moveTo(x, 152); ctx.quadraticCurveTo(x - 10, 420, x + 8, 688); ctx.stroke(); }
  // 地面
  ctx.fillStyle = '#1e2024';
  ctx.fillRect(-400, 880, W + 800, 400);
}

// 前一排座椅的椅背（在他前面，挡住窗户右下角）
const AHEAD = [[-30, 900], [-40, 520], [-20, 330], [30, 300], [70, 330], [80, 520], [70, 900]].map(([x, y]) => [x + 980, y]);
const OWN = [[1470, 760], [1480, 520], [1490, 330], [1540, 290], [1600, 320], [1610, 520], [1600, 760]];
// 窗外的发光物画在光照之上，要把挡在窗前的椅背和人「抠」出来
function clipOutSeats(ctx) {
  ctx.beginPath();
  ctx.rect(-2000, -2000, 6000, 6000);
  smoothPath(ctx, AHEAD.slice().reverse(), true, false);
  ctx.clip('evenodd');
}
function seatAhead(ctx) {
  ctx.save();
  ctx.translate(980, 0);
  ctx.fillStyle = '#2f3a46';
  smoothPath(ctx, [[-30, 900], [-40, 520], [-20, 330], [30, 300], [70, 330], [80, 520], [70, 900]]);
  ctx.fill();
  ctx.fillStyle = 'rgba(210,220,230,0.06)';
  smoothPath(ctx, [[60, 880], [70, 520], [58, 336], [64, 330], [76, 520], [66, 880]]);
  ctx.fill();
  // 头枕上的白色头巾
  ctx.fillStyle = 'rgba(150,156,160,0.55)';
  smoothPath(ctx, [[-22, 336], [70, 334], [66, 384], [-18, 388]]);
  ctx.fill();
  ctx.restore();
}

// 他自己的座椅
function ownSeat(ctx) {
  ctx.fillStyle = '#34404d';
  smoothPath(ctx, [[1470, 760], [1480, 520], [1490, 330], [1540, 290], [1600, 320], [1610, 520], [1600, 760]]);
  ctx.fill();
  ctx.fillStyle = 'rgba(150,156,160,0.55)';
  smoothPath(ctx, [[1496, 326], [1600, 324], [1598, 380], [1500, 384]]);
  ctx.fill();
  ctx.fillStyle = '#2c3640';
  ctx.fillRect(1290, 712, 300, 46);
  ctx.fillStyle = '#1d2228';
  ctx.fillRect(1300, 758, 280, 140);
}

// 小桌板 + 手机（屏幕上 DAY 1）
function tray(ctx, t) {
  ctx.fillStyle = '#4a4e53';
  ctx.beginPath();
  ctx.moveTo(TRAY.x0 + 20, TRAY.y - 10); ctx.lineTo(TRAY.x1, TRAY.y - 10); ctx.lineTo(TRAY.x1 + 16, TRAY.y + 10); ctx.lineTo(TRAY.x0, TRAY.y + 10); ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#2c2f33';
  ctx.fillRect(TRAY.x0, TRAY.y + 10, TRAY.x1 - TRAY.x0 + 16, 8);
  // 纸杯
  ctx.save();
  ctx.translate(1215, TRAY.y - 8);
  ctx.fillStyle = '#d6cfc0';
  ctx.beginPath(); ctx.moveTo(-14, -44); ctx.lineTo(14, -44); ctx.lineTo(10, 0); ctx.lineTo(-10, 0); ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#8a3a2a'; ctx.fillRect(-12, -30, 24, 8);
  ctx.restore();
}
// 手机斜靠在小桌板上的支架里，屏幕朝着镜头（他看窗外时它亮着）
function phoneOnTray(ctx, t, over = false) {
  ctx.save();
  ctx.translate(PHONE.x, PHONE.y);
  ctx.rotate(-0.06);
  const { w, h } = PHONE;
  if (!over) {
    ctx.fillStyle = '#121214';
    roundRect(ctx, -w / 2, -h, w, h, 12); ctx.fill();
  } else {
    // 18.0 屏幕亮起：DAY 1（先停一下，之后才去看返程票）
    const on = smooth(prog(t, 17.7, 18.1));
    ctx.fillStyle = '#0c0d10';
    roundRect(ctx, -w / 2 + 4, -h + 4, w - 8, h - 8, 9); ctx.fill();
    ctx.globalAlpha *= on;
    roundRect(ctx, -w / 2 + 4, -h + 4, w - 8, h - 8, 9);
    const g = ctx.createLinearGradient(0, -h, 0, 0);
    g.addColorStop(0, `rgba(70,96,120,${on})`); g.addColorStop(1, `rgba(36,46,60,${on})`);
    ctx.fillStyle = g; ctx.fill();
    ctx.fillStyle = 'rgba(240,236,226,0.95)';
    ctx.textAlign = 'center';
    ctx.font = FONT.enMed(25);
    ctx.letterSpacing = '2px';
    ctx.fillText('DAY 1', 0, -h * 0.58);
    ctx.font = FONT.en(11);
    ctx.fillStyle = 'rgba(240,236,226,0.6)';
    ctx.fillText('— 7 —', 0, -h * 0.45);
  }
  ctx.restore();
}

// 他：靠窗坐着，侧身朝左看窗外；19.6 慢慢低头看向桌上的手机
function traveler(ctx, t) {
  const down = easeInOut(prog(t, 19.5, 20.6));
  const look = Math.sin(t * 0.6) * 0.015;
  ctx.save();
  ctx.translate(PERSON.x, PERSON.y);
  person(ctx, 0, 0, PERSON.u, { sit: true, face: 1, lean: lerp(0.22, 0.34, down), hd: lerp(-0.12 + look, 0.45, down), arms: { near: [0.55, 1.1], far: [0.5, 1.2] },
    top: '#4a5246', bottom: '#24221f', hair: '#120e0b', hairStyle: 'short', skin: '#86624a', light: Math.PI + 0.3, rim: 0.42, rimCol: [235, 214, 190] });
  ctx.restore();
}

// ---------------- 手机特写 ----------------
const ITIN = [
  ['DAY 1', '抵达 · 入住', '晴  22°'],
  ['DAY 2', '老城 · 海边', '多云'],
  ['DAY 3', '山里的小镇', '小雨'],
  ['DAY 4', '集市 · 博物馆', '晴'],
  ['DAY 5', '自由活动', '晴'],
  ['DAY 6', '慢慢走', '多云'],
];
const CARD = 150;
// 拇指往下推两次，惯性被摩擦拖住，停在返程票上
function scrollY(t) { return glide(t, 21.3, 900, 3.4) + glide(t, 22.25, 1300, 3.2); }

function closeUp(ctx, t) {
  const k = t - CUT_T;
  ctx.save();
  // 背景：他的腿（深色布料）、膝上的光
  const bg = ctx.createLinearGradient(0, 0, W, H);
  bg.addColorStop(0, '#22252a'); bg.addColorStop(1, '#16181b');
  ctx.fillStyle = bg;
  ctx.fillRect(-100, -100, W + 200, H + 200);
  ctx.strokeStyle = 'rgba(0,0,0,0.35)'; ctx.lineWidth = 18;
  for (const [a, b] of [[200, 900], [1500, 1000], [400, 1080]]) { ctx.beginPath(); ctx.moveTo(a, -50); ctx.quadraticCurveTo(a + 200, 500, b, 1150); ctx.stroke(); }
  // 手机：极慢推近，几乎不晃（手机是稳的）
  const push = 1 + 0.03 * prog(t, CUT_T, 25.8);
  ctx.translate(1080, 560);
  ctx.scale(push, push);
  ctx.rotate(-0.1);
  const pw = 470, ph = 940;
  // 手：从右下握住手机
  ctx.fillStyle = '#3d2c22';
  smoothPath(ctx, [[pw * 0.32, ph * 0.18], [pw * 0.62, ph * 0.26], [pw * 0.9, ph * 0.62], [pw * 0.8, ph * 0.9], [pw * 0.2, ph * 0.72], [pw * 0.32, ph * 0.4]]);
  ctx.fill();
  ctx.save();
  ctx.shadowColor = 'rgba(0,0,0,0.7)'; ctx.shadowBlur = 50; ctx.shadowOffsetX = 20; ctx.shadowOffsetY = 30;
  ctx.fillStyle = '#0f0f11';
  roundRect(ctx, -pw / 2, -ph / 2, pw, ph, 58); ctx.fill();
  ctx.restore();
  ctx.strokeStyle = 'rgba(200,200,205,0.3)'; ctx.lineWidth = 2;
  roundRect(ctx, -pw / 2, -ph / 2, pw, ph, 58); ctx.stroke();
  // 屏幕
  const sw = pw - 34, sh = ph - 34;
  ctx.save();
  roundRect(ctx, -sw / 2, -sh / 2, sw, sh, 44); ctx.clip();
  ctx.fillStyle = '#1b2026';
  ctx.fillRect(-sw / 2, -sh / 2, sw, sh);
  const top = -sh / 2 + 150;
  const y0 = top - Math.min(scrollY(t), ITIN.length * CARD - 120);
  ITIN.forEach(([d, place, wx], i) => {
    const y = y0 + i * CARD;
    if (y < -sh / 2 - CARD || y > sh / 2) return;
    ctx.fillStyle = i === 0 ? 'rgba(232,224,206,0.12)' : 'rgba(232,224,206,0.06)';
    roundRect(ctx, -sw / 2 + 26, y, sw - 52, CARD - 18, 20); ctx.fill();
    ctx.fillStyle = 'rgba(240,234,222,0.95)';
    ctx.font = FONT.enMed(40);
    ctx.fillText(d, -sw / 2 + 56, y + 62);
    ctx.font = FONT.body(28);
    ctx.fillStyle = 'rgba(230,222,206,0.75)';
    ctx.fillText(place, -sw / 2 + 56, y + 106);
    ctx.textAlign = 'right';
    ctx.font = FONT.body(24);
    ctx.fillText(wx, sw / 2 - 56, y + 62);
    ctx.textAlign = 'left';
  });
  // 返程票：列表最后，样子不一样（票据：虚线、缺口）
  const ty = y0 + ITIN.length * CARD + 10;
  ctx.save();
  ctx.translate(0, ty);
  ctx.fillStyle = '#d9d1c0';
  roundRect(ctx, -sw / 2 + 26, 0, sw - 52, 300, 18); ctx.fill();
  ctx.fillStyle = '#1b2026';
  ctx.beginPath(); ctx.arc(-sw / 2 + 26, 190, 18, 0, Math.PI * 2); ctx.arc(sw / 2 - 26, 190, 18, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = 'rgba(60,50,40,0.4)'; ctx.setLineDash([8, 8]); ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(-sw / 2 + 52, 190); ctx.lineTo(sw / 2 - 52, 190); ctx.stroke();
  ctx.setLineDash([]);
  ctx.fillStyle = '#2a221c';
  ctx.font = FONT.enMed(54);
  ctx.letterSpacing = '6px';
  ctx.fillText('RETURN', -sw / 2 + 60, 92);
  ctx.letterSpacing = '0px';
  ctx.font = FONT.body(30);
  ctx.fillStyle = '#5a4c40';
  ctx.fillText('返程', -sw / 2 + 62, 146);
  ctx.textAlign = 'right';
  ctx.font = FONT.enMed(34);
  ctx.fillStyle = '#2a221c';
  ctx.fillText('DAY 7', sw / 2 - 60, 92);
  ctx.font = FONT.en(26);
  ctx.fillStyle = '#5a4c40';
  ctx.fillText('21 : 40', sw / 2 - 60, 146);
  ctx.textAlign = 'left';
  ctx.font = FONT.en(22);
  ctx.fillText('SEAT  08  F', -sw / 2 + 62, 250);
  ctx.restore();
  // 顶栏
  ctx.fillStyle = '#1b2026';
  ctx.fillRect(-sw / 2, -sh / 2, sw, 120);
  ctx.fillStyle = 'rgba(240,234,222,0.9)';
  ctx.font = FONT.body(32);
  ctx.fillText('行程', -sw / 2 + 50, -sh / 2 + 92);
  ctx.font = FONT.en(24);
  ctx.textAlign = 'right';
  ctx.fillStyle = 'rgba(230,222,206,0.6)';
  ctx.fillText('7 DAYS', sw / 2 - 50, -sh / 2 + 92);
  ctx.textAlign = 'left';
  // 玻璃反光
  const gl = ctx.createLinearGradient(-sw / 2, -sh / 2, sw / 2, sh / 2);
  gl.addColorStop(0.2, 'rgba(255,255,255,0)'); gl.addColorStop(0.28, 'rgba(255,255,255,0.06)'); gl.addColorStop(0.36, 'rgba(255,255,255,0)');
  ctx.fillStyle = gl;
  ctx.fillRect(-sw / 2, -sh / 2, sw, sh);
  ctx.restore();
  // 拇指（在屏幕上推）
  const push2 = Math.sin(Math.PI * prog(t, 21.0, 21.5)) + Math.sin(Math.PI * prog(t, 21.95, 22.45));
  ctx.fillStyle = '#4a3528';
  smoothPath(ctx, [[pw * 0.5, ph * 0.08 - push2 * 60], [pw * 0.22, ph * 0.06 - push2 * 60], [pw * 0.1, ph * 0.12 - push2 * 50], [pw * 0.34, ph * 0.36], [pw * 0.6, ph * 0.3]]);
  ctx.fill();
  ctx.restore();
}

function draw(ctx, t) {
  const a = smooth(prog(t, 16.35, 16.9));
  if (t < CUT_T) {
    const c = cam(t);
    ctx.save();
    ctx.globalAlpha *= a;
    withCam(ctx, c, 1, () => {
      cabin(ctx, t);
      outside(ctx, t);
      seatAhead(ctx);
      ownSeat(ctx);
      traveler(ctx, t);
      tray(ctx, t);
      phoneOnTray(ctx, t);
    });
    ctx.restore();
  } else {
    ctx.save();
    ctx.globalAlpha *= 1 - smooth(prog(t, 25.2, 25.8));
    closeUp(ctx, t);
    ctx.restore();
  }
}

function drawOver(ctx, t) {
  if (t >= CUT_T) return;
  const c = cam(t);
  ctx.save();
  ctx.globalAlpha *= smooth(prog(t, 16.35, 16.9));
  withCam(ctx, c, 1, () => {
    ctx.save();
    clipOutSeats(ctx);
    outsideLights(ctx, t);
    reflection(ctx, t);
    ctx.restore();
    phoneOnTray(ctx, t, true);
  });
  ctx.restore();
}

// 光：车厢顶灯（冷、弱）；窗外扫过的路灯（暖，一阵一阵扫过他的侧脸）；手机屏幕
function light(t) {
  const w = smooth(prog(t, 16.35, 16.9)) * (1 - smooth(prog(t, 25.2, 25.8)));
  if (t >= CUT_T) {
    return [
      { x: 1080, y: 540, rx: 700, ry: 760, i: 1, w, color: [200, 214, 232], core: 0.35 },
      { x: 1500, y: 300, rx: 600, ry: 500, i: 0.4 + 0.3 * Math.max(0, Math.sin(t * 5.2)), w, color: [255, 196, 130] },
    ];
  }
  const c = cam(t);
  const sc = (x, y) => toScreen(c, x, y);
  const sweep = Math.max(0, Math.sin(t * 4.4)) ** 3;
  const [px, py] = sc(PERSON.x - 40, PERSON.y - 240);
  const [wx, wy] = sc((WIN.x0 + WIN.x1) / 2, (WIN.y0 + WIN.y1) / 2);
  const [fx, fy] = sc(PHONE.x, PHONE.y - 80);
  return [
    { x: wx, y: wy, rx: 700 * c.s, ry: 380 * c.s, i: 0.7, w, color: [180, 196, 224] },
    { x: px, y: py, rx: 330 * c.s, ry: 420 * c.s, i: 0.55 + 0.4 * sweep, w, color: [255, 200, 140] },
    { x: fx, y: fy, rx: 200 * c.s, ry: 200 * c.s, i: 0.8, w, color: [190, 210, 235] },
    { x: W / 2, y: 0, rx: 1400, ry: 300, i: 0.35, w, color: [210, 220, 235] },
  ];
}
function grade(t) { return { warm: -0.3, ambient: 0.12, w: smooth(prog(t, 16.35, 16.9)) }; }

module.exports = { ...S, draw, drawOver, light, grade, cam, CUT_T };
