// 第五幕 · 33.3–41.8 秒：面试还没开始。
//   上一幕的光标变成一道竖直的门缝：面试室的门关着，只有门缝里透出冷白光，在地上拉出一道光。
//   他坐在门外的长椅上，手里攥着简历。墙上的钟。
//   39.0–40.6 三次极短的「脑内预演」：面试官摇头 / 邮件 REJECTED / 他一个人走出走廊。
//   都是灰白、颗粒更重、边缘晕开的幻象；每次之后都回到同一个静止的走廊——他还坐在那里。
const { createCanvas } = require('@napi-rs/canvas');
const { W, H } = require('../../../src/config');
const { FONT } = require('../../../src/lib/style');
const { prog, smooth, lerp, rng, noise1 } = require('../../../src/lib/util');
const { withCam, toScreen } = require('../lib');
const { person } = require('../people');
const { roundRect } = require('../phone');
const { CRACK_X } = require('./p4_message');

const S = { start: 33.3, end: 42.0 };
const FLOOR = 880;
const DOOR = { x0: CRACK_X + 4, x1: 1450, top: 250 };
const HERO = { x: 660, y: 724, u: 330 };
const FLASHES = [[39.0, 39.45], [39.55, 40.0], [40.1, 40.6]];

const cam = (t) => { const k = smooth(prog(t, 34.0, 41.8)); return { cx: lerp(960, 900, k), cy: lerp(540, 548, k), s: lerp(1.0, 1.07, k) }; };

function corridor(ctx, t) {
  const g = ctx.createLinearGradient(0, 0, 0, FLOOR);
  g.addColorStop(0, '#323a38'); g.addColorStop(1, '#3e4744');
  ctx.fillStyle = g;
  ctx.fillRect(-300, -300, W + 600, FLOOR + 300);
  // 墙裙
  ctx.fillStyle = '#2c3330';
  ctx.fillRect(-300, 640, W + 600, FLOOR - 640);
  ctx.fillStyle = 'rgba(220,230,226,0.08)';
  ctx.fillRect(-300, 640, W + 600, 2);
  // 光亮的地面（会反光）
  const fg = ctx.createLinearGradient(0, FLOOR, 0, H + 200);
  fg.addColorStop(0, '#2a302e'); fg.addColorStop(1, '#1c2120');
  ctx.fillStyle = fg;
  ctx.fillRect(-300, FLOOR, W + 600, H + 400);
  ctx.strokeStyle = 'rgba(0,0,0,0.25)'; ctx.lineWidth = 1.5;
  for (let i = -12; i < 26; i++) { const x = i * 120; ctx.beginPath(); ctx.moveTo(x, FLOOR); ctx.lineTo(960 + (x - 960) * 2.6, H + 300); ctx.stroke(); }
  // 墙上的钟
  ctx.save();
  ctx.translate(560, 300);
  ctx.fillStyle = '#d6d8d2'; ctx.beginPath(); ctx.arc(0, 0, 44, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = '#2a2e2c'; ctx.lineWidth = 5; ctx.stroke();
  ctx.strokeStyle = '#22262a'; ctx.lineCap = 'round';
  const mn = (t - 33) * 0.06 + 0.55, hr = 2.6;
  ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(Math.sin(hr) * 22, -Math.cos(hr) * 22); ctx.stroke();
  ctx.lineWidth = 2.5; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(Math.sin(mn * Math.PI * 2) * 34, -Math.cos(mn * Math.PI * 2) * 34); ctx.stroke();
  ctx.restore();
  // 门牌
  ctx.fillStyle = '#c9ccc6';
  ctx.fillRect(1500, 470, 120, 56);
  ctx.fillStyle = '#2a2e2c';
  ctx.font = FONT.body(26);
  ctx.textAlign = 'center';
  ctx.fillText('面试 · 3', 1560, 508);
  ctx.textAlign = 'left';
  // 长椅
  ctx.fillStyle = '#4a4f4c';
  ctx.fillRect(250, 720, 640, 22);
  ctx.fillStyle = '#2a2e2c';
  ctx.fillRect(270, 742, 14, 138); ctx.fillRect(856, 742, 14, 138);
  ctx.fillRect(250, 742, 640, 8);
  // 一盆植物（剪影）
  ctx.fillStyle = '#1e2422';
  ctx.fillRect(1700, 780, 90, 100);
  for (let i = 0; i < 9; i++) { ctx.save(); ctx.translate(1745, 785); ctx.rotate(-1.3 + i * 0.32); ctx.beginPath(); ctx.ellipse(0, -90, 18, 90, 0, 0, Math.PI * 2); ctx.fill(); ctx.restore(); }
}

function door(ctx) {
  const { x0, x1, top } = DOOR;
  ctx.fillStyle = '#2a302e';
  ctx.fillRect(x0 - 26, top - 22, x1 - x0 + 48, FLOOR - top + 22);
  ctx.fillStyle = '#4a524f';
  ctx.fillRect(x0 + 6, top, x1 - x0 - 6, FLOOR - top);
  ctx.strokeStyle = 'rgba(0,0,0,0.25)'; ctx.lineWidth = 3;
  ctx.strokeRect(x0 + 50, top + 60, x1 - x0 - 100, 240);
  ctx.strokeRect(x0 + 50, top + 360, x1 - x0 - 100, 240);
  ctx.fillStyle = '#9aa09c';
  ctx.fillRect(x0 + 26, 560, 12, 46);
}
// 门缝里的冷白光 + 地上拉长的一道光（画在光照之上，保持发光）
function crack(ctx, t) {
  const fl = 1 + noise1(t * 6, 5) * 0.03;
  ctx.save();
  ctx.shadowColor = 'rgba(220,234,255,0.9)'; ctx.shadowBlur = 30;
  ctx.fillStyle = `rgba(240,246,255,${0.95 * fl})`;
  ctx.fillRect(CRACK_X - 3, DOOR.top, 7, FLOOR - DOOR.top);
  ctx.restore();
  ctx.save();
  const g = ctx.createLinearGradient(0, FLOOR, 0, H + 120);
  g.addColorStop(0, 'rgba(220,232,255,0.42)'); g.addColorStop(1, 'rgba(220,232,255,0)');
  ctx.fillStyle = g;
  ctx.beginPath(); ctx.moveTo(CRACK_X - 4, FLOOR); ctx.lineTo(CRACK_X + 5, FLOOR); ctx.lineTo(CRACK_X + 160, H + 120); ctx.lineTo(CRACK_X - 70, H + 120); ctx.closePath();
  ctx.fill();
  ctx.restore();
}

function heroPose(t) {
  const grip = 0.5 + 0.5 * Math.sin(t * 0.9);
  return {
    sit: true, face: -1, lean: 0.3, hd: 0.28 + Math.sin(t * 0.5) * 0.03,
    arms: { near: [0.42 + grip * 0.04, 1.25], far: [0.45, 1.2] },
    top: '#30383a', sleeve: '#30383a', bottom: '#202325', hair: '#120e0b', hairStyle: 'short', skin: '#7c5d4a', light: -0.25, rim: 0.48, rimCol: [214, 226, 246],
  };
}
// 简历：两只手捏着的一张纸
function resume(ctx, t) {
  ctx.save();
  ctx.translate(HERO.x + 150, HERO.y - 28);
  ctx.rotate(-0.5);
  ctx.fillStyle = '#c8cbc4';
  ctx.beginPath(); ctx.moveTo(-34, -46); ctx.lineTo(30, -50); ctx.lineTo(36, 44); ctx.quadraticCurveTo(0, 50, -30, 46); ctx.closePath(); ctx.fill();
  ctx.fillStyle = 'rgba(60,64,62,0.5)';
  for (let i = 0; i < 6; i++) ctx.fillRect(-22, -32 + i * 12, i % 3 ? 40 : 26, 2);
  ctx.restore();
}

// ---------------- 脑内的预演（灰白幻象） ----------------
const FL = createCanvas(W, H);
const FX = FL.getContext('2d');
const GRAIN = (() => {
  const c = createCanvas(W / 2, H / 2);
  const x = c.getContext('2d');
  const img = x.createImageData(W / 2, H / 2);
  const r = rng(505);
  for (let i = 0; i < img.data.length; i += 4) { const v = 128 + (r() + r() - 1) * 120; img.data[i] = img.data[i + 1] = img.data[i + 2] = v; img.data[i + 3] = 255; }
  x.putImageData(img, 0, 0);
  return c;
})();

function fantasy(ctx, k, t) {
  const x = FX;
  x.setTransform(1, 0, 0, 1, 0, 0);
  x.globalAlpha = 1;
  x.filter = 'none';
  x.fillStyle = '#1a1b1c';
  x.fillRect(0, 0, W, H);
  if (k === 0) {
    // 面试官在桌子后面摇头：背后是一扇亮窗，他们只是两个剪影
    const g = x.createRadialGradient(960, 380, 50, 960, 420, 900);
    g.addColorStop(0, '#b4b6b2'); g.addColorStop(0.6, '#5a5c5a'); g.addColorStop(1, '#1a1b1c');
    x.fillStyle = g; x.fillRect(0, 0, W, H);
    const sil = { top: '#1c1d1e', bottom: '#151515', hair: '#121212', skin: '#222324', rim: 0.25, rimCol: [230, 230, 230] };
    person(x, 960, 800, 540, { view: 'front', sit: true, ...sil, hairStyle: 'short', roll: Math.sin(t * 22) * 0.14, hd: 0.05, arms: { left: [0.1, -0.9], right: [0.1, -0.9] } });
    person(x, 500, 820, 470, { view: 'front', sit: true, ...sil, hairStyle: 'long', hd: 0.3 });
    x.fillStyle = '#1e1f20'; x.fillRect(150, 790, 1620, 360);
    x.fillStyle = '#d8d9d6'; x.fillRect(820, 772, 160, 18);
  } else if (k === 1) {
    // 邮件：面试结果通知 —— REJECTED
    x.fillStyle = '#2a2b2c'; x.fillRect(0, 0, W, H);
    x.save();
    x.translate(960, 540); x.rotate(0.03);
    x.fillStyle = '#d0d1cc'; roundRect(x, -520, -330, 1040, 660, 16); x.fill();
    x.fillStyle = '#3a3b3a'; x.font = FONT.body(40); x.fillText('面试结果通知', -460, -230);
    x.fillStyle = 'rgba(60,60,60,0.35)';
    for (let i = 0; i < 5; i++) x.fillRect(-460, -150 + i * 46, i === 4 ? 420 : 900, 12);
    x.font = FONT.type(120); x.fillStyle = 'rgba(70,40,36,0.85)'; x.textAlign = 'center';
    x.save(); x.rotate(-0.08); x.fillText('REJECTED', 60, 210); x.restore();
    x.restore();
  } else {
    // 他一个人走出走廊
    const g = x.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, '#2a2b2c'); g.addColorStop(1, '#141515');
    x.fillStyle = g; x.fillRect(0, 0, W, H);
    x.strokeStyle = 'rgba(160,160,160,0.25)'; x.lineWidth = 2;
    for (const [a, b] of [[0, 0], [W, 0], [0, H], [W, H]]) { x.beginPath(); x.moveTo(a, b); x.lineTo(960, 470); x.stroke(); }
    x.fillStyle = 'rgba(200,200,200,0.5)'; x.fillRect(930, 410, 60, 110);
    const step = prog(t, 40.1, 40.6);
    person(x, 1000, lerp(940, 860, step), lerp(430, 380, step), { view: 'back', top: '#2a2a2a', bottom: '#1c1c1c', hair: '#101010', hairStyle: 'short', step: Math.sin(t * 9), rim: 0, arms: { left: [0.1, 0.1], right: [0.12, 0.15] } });
  }
  // 灰白、颗粒更重、边缘晕开
  ctx.save();
  ctx.filter = 'grayscale(1) contrast(1.2) blur(1.2px)';
  ctx.drawImage(FL, (Math.random() - 0.5) * 0, 0);
  ctx.filter = 'none';
  ctx.globalCompositeOperation = 'overlay';
  ctx.globalAlpha = 0.5;
  ctx.drawImage(GRAIN, (k * 173) % 200 - 100, (k * 97) % 120 - 60, W + 200, H + 120);
  ctx.globalCompositeOperation = 'source-over';
  ctx.globalAlpha = 1;
  const vg = ctx.createRadialGradient(W / 2, H / 2, H * 0.25, W / 2, H / 2, H * 0.85);
  vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(0,0,0,0.85)');
  ctx.fillStyle = vg; ctx.fillRect(0, 0, W, H);
  ctx.restore();
}

function draw(ctx, t) {
  const c = cam(t);
  ctx.save();
  ctx.globalAlpha *= smooth(prog(t, 33.35, 33.75)) * (1 - smooth(prog(t, 41.5, 41.95)));
  withCam(ctx, c, 1, () => {
    corridor(ctx, t);
    door(ctx);
    person(ctx, HERO.x, HERO.y, HERO.u, heroPose(t));
    resume(ctx, t);
  });
  ctx.restore();
}

function drawOver(ctx, t) {
  const c = cam(t);
  const a = smooth(prog(t, 33.35, 33.75)) * (1 - smooth(prog(t, 41.5, 41.95)));
  ctx.save();
  ctx.globalAlpha *= a;
  withCam(ctx, c, 1, () => crack(ctx, t));
  ctx.restore();
  FLASHES.forEach(([t0, t1], k) => {
    if (t < t0 || t > t1) return;
    const fa = smooth(prog(t, t0, t0 + 0.06)) * (1 - smooth(prog(t, t1 - 0.08, t1)));
    ctx.save();
    ctx.globalAlpha = fa * (0.9 + 0.1 * Math.sin(t * 90));
    fantasy(ctx, k, t);
    ctx.restore();
  });
  // 门缝那道光在 41.2 起扩成一条竖向光带扫过画面（交给回闪）
  const sw = smooth(prog(t, 41.2, 41.9));
  if (sw > 0 && sw < 1) {
    const [cx] = toScreen(c, CRACK_X, 0);
    const wid = lerp(10, W * 1.6, sw * sw);
    const g = ctx.createLinearGradient(cx - wid / 2, 0, cx + wid / 2, 0);
    g.addColorStop(0, 'rgba(235,242,255,0)'); g.addColorStop(0.5, `rgba(235,242,255,${0.85 * Math.sin(Math.PI * sw)})`); g.addColorStop(1, 'rgba(235,242,255,0)');
    ctx.fillStyle = g;
    ctx.fillRect(cx - wid / 2, 0, wid, H);
  }
}

function light(t) {
  const c = cam(t);
  const w = smooth(prog(t, 33.35, 33.75)) * (1 - smooth(prog(t, 41.5, 41.95)));
  const sc = (x, y) => toScreen(c, x, y);
  const [dx, dy] = sc(CRACK_X - 40, 560);
  const [fx, fy] = sc(CRACK_X + 20, 1000);
  const [hx, hy] = sc(HERO.x + 60, 560);
  return [
    { x: dx, y: dy, rx: 420 * c.s, ry: 560 * c.s, i: 0.95, w, color: [214, 228, 255], core: 0.15 },
    { x: fx, y: fy, rx: 360 * c.s, ry: 200 * c.s, i: 0.7, w, color: [214, 228, 255] },
    { x: hx, y: hy, rx: 360 * c.s, ry: 420 * c.s, i: 0.45, w, color: [200, 214, 240] },
    { x: 700, y: 300, rx: 900, ry: 420, i: 0.18, w, color: [190, 205, 200] },
  ];
}
function grade(t) { return { warm: -0.4, ambient: 0.09, w: smooth(prog(t, 33.35, 33.75)) }; }

module.exports = { ...S, draw, drawOver, light, grade };
