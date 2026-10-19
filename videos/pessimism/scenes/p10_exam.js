// 生活例子一 · 考试（81.2–86.2 秒）：傍晚的教学楼走廊，他站在一扇大窗前，手里的试卷上一个小小的红色「58」。
//   现实只是：一次没考好。可窗玻璃上，像倒影一样慢慢浮出一句话——我就是不行——
//   一开始很小、很淡，越来越大，最后占满整扇窗。现实很小，解释越来越大。
const { W, H } = require('../../../src/config');
const { FONT } = require('../../../src/lib/style');
const { prog, smooth, lerp, rng, easeInOut } = require('../../../src/lib/util');
const { withCam, toScreen } = require('../lib');
const { person } = require('../people');

const S = { start: 81.1, end: 86.25 };
const WIN = { x0: 980, x1: 1820, y0: 150, y1: 770 };
const HERO = { x: 760, y: 900, u: 380 };
const cam = (t) => { const k = easeInOut(prog(t, 81.2, 86.2)); return { cx: lerp(1000, 1080, k), cy: lerp(520, 500, k), s: lerp(1.0, 1.06, k) }; };
const grow = (t) => smooth(prog(t, 83.0, 85.9));

function corridor(ctx, t) {
  ctx.fillStyle = '#3a3f3a';
  ctx.fillRect(-300, -300, W + 600, H + 600);
  ctx.fillStyle = '#2c3a32';
  ctx.fillRect(-300, 620, W + 600, 300);
  ctx.fillStyle = 'rgba(230,236,226,0.1)';
  ctx.fillRect(-300, 620, W + 600, 3);
  ctx.fillStyle = '#26282a';
  ctx.fillRect(-300, 920, W + 600, H);
  ctx.strokeStyle = 'rgba(0,0,0,0.25)'; ctx.lineWidth = 2;
  for (let i = -10; i < 30; i++) { ctx.beginPath(); ctx.moveTo(i * 110, 920); ctx.lineTo(960 + (i * 110 - 960) * 2.4, H + 300); ctx.stroke(); }
  // 公告栏
  ctx.fillStyle = '#4a3c2e'; ctx.fillRect(120, 260, 420, 280);
  const r = rng(1010);
  for (let i = 0; i < 6; i++) { ctx.fillStyle = `rgba(${200 + r() * 30},${196 + r() * 30},${180 + r() * 20},0.75)`; ctx.fillRect(140 + (i % 3) * 132, 280 + Math.floor(i / 3) * 128, 110, 110); }
  // 窗：傍晚刚过，天是深蓝灰的，对面楼亮了几盏灯
  const g = ctx.createLinearGradient(0, WIN.y0, 0, WIN.y1);
  g.addColorStop(0, '#22303f'); g.addColorStop(1, '#3a4450');
  ctx.fillStyle = g;
  ctx.fillRect(WIN.x0, WIN.y0, WIN.x1 - WIN.x0, WIN.y1 - WIN.y0);
  ctx.fillStyle = '#171d24';
  for (let i = 0; i < 6; i++) ctx.fillRect(WIN.x0 + i * 150, WIN.y0 + 300 - (i % 3) * 60, 120, 400);
  ctx.strokeStyle = '#555a55'; ctx.lineWidth = 16;
  ctx.strokeRect(WIN.x0, WIN.y0, WIN.x1 - WIN.x0, WIN.y1 - WIN.y0);
  ctx.lineWidth = 10;
  ctx.beginPath(); ctx.moveTo((WIN.x0 + WIN.x1) / 2, WIN.y0); ctx.lineTo((WIN.x0 + WIN.x1) / 2, WIN.y1); ctx.moveTo(WIN.x0, 460); ctx.lineTo(WIN.x1, 460); ctx.stroke();
  ctx.fillStyle = '#4a4f4a'; ctx.fillRect(WIN.x0 - 20, WIN.y1, WIN.x1 - WIN.x0 + 40, 18);
}

// 他：面朝窗站着，手里拿着试卷
function hero(ctx, t) {
  const low = smooth(prog(t, 83.4, 85.6));
  person(ctx, HERO.x, HERO.y, HERO.u, { face: -1, lean: 0.06, hd: lerp(0.25, 0.42, low), arms: { near: [0.55, 1.5], far: [0.5, 1.45] },
    top: '#3c4a52', bottom: '#23262a', hair: '#120e0b', hairStyle: 'short', skin: '#7c5d4a', light: -0.2, rim: 0.5, rimCol: [200, 214, 236] });
  // 试卷：上面一个小小的红色 58
  ctx.save();
  ctx.translate(HERO.x + 175, HERO.y - 470);
  ctx.rotate(-0.18);
  ctx.fillStyle = '#d8d4c8';
  ctx.fillRect(-58, -78, 116, 156);
  ctx.fillStyle = 'rgba(60,60,60,0.45)';
  for (let i = 0; i < 8; i++) ctx.fillRect(-46, -40 + i * 13, i % 3 ? 80 : 60, 3);
  ctx.font = FONT.hand(46);
  ctx.fillStyle = '#b02a20';
  ctx.fillText('58', 6, -36);
  ctx.strokeStyle = 'rgba(176,42,32,0.8)'; ctx.lineWidth = 2.5;
  ctx.beginPath(); ctx.ellipse(28, -52, 34, 26, 0, 0, Math.PI * 2); ctx.stroke();
  ctx.restore();
}

// 窗玻璃上的那句话：越来越大，像倒影 / 起雾的字
function thought(ctx, t) {
  const k = grow(t);
  if (k <= 0) return;
  const a = smooth(prog(t, 83.0, 83.6)) * (1 - smooth(prog(t, 85.95, 86.25)));
  ctx.save();
  ctx.beginPath(); ctx.rect(WIN.x0 + 8, WIN.y0 + 8, WIN.x1 - WIN.x0 - 16, WIN.y1 - WIN.y0 - 16); ctx.clip();
  const size = lerp(40, 158, k);
  ctx.globalAlpha = a * lerp(0.35, 0.88, k);
  ctx.font = FONT.hand(size);
  ctx.textAlign = 'center';
  ctx.filter = `blur(${lerp(2.5, 0.6, k).toFixed(1)}px)`;
  ctx.fillStyle = '#dfe6ee';
  ctx.fillText('我就是不行', (WIN.x0 + WIN.x1) / 2, lerp(330, 540, k));
  ctx.filter = 'none';
  ctx.restore();
}

function draw(ctx, t) {
  const c = cam(t);
  ctx.save();
  ctx.globalAlpha *= smooth(prog(t, 81.15, 81.45)) * (1 - smooth(prog(t, 85.95, 86.25)));
  withCam(ctx, c, 1, () => { corridor(ctx, t); hero(ctx, t); });
  ctx.restore();
}
function drawOver(ctx, t) {
  const c = cam(t);
  ctx.save();
  ctx.globalAlpha *= smooth(prog(t, 81.15, 81.45));
  withCam(ctx, c, 1, () => thought(ctx, t));
  ctx.restore();
}
function light(t) {
  const c = cam(t);
  const w = smooth(prog(t, 81.15, 81.45)) * (1 - smooth(prog(t, 85.95, 86.25)));
  const sc = (x, y) => toScreen(c, x, y);
  const [wx, wy] = sc((WIN.x0 + WIN.x1) / 2, 460);
  const [hx, hy] = sc(HERO.x + 60, 560);
  return [
    { x: wx, y: wy, rx: 700 * c.s, ry: 520 * c.s, i: 0.75, w, color: [176, 196, 226], core: 0.3 },
    { x: hx, y: hy, rx: 380 * c.s, ry: 480 * c.s, i: 0.65, w, color: [196, 210, 234] },
    { x: 400, y: 300, rx: 700, ry: 400, i: 0.3, w, color: [230, 220, 196] },
  ];
}
function grade() { return { warm: -0.3, ambient: 0.11 }; }

module.exports = { ...S, draw, drawOver, light, grade };
