// 解释风格 · 66.9–72.55 秒（原来人物页的位置）：不再放照片和人物介绍，而是一个自然的引子。
//   深夜，他坐在书桌另一头。桌上只有一个揉皱的纸团——一次失败。台灯从高处照着它，墙上的影子很小。
//   「有些人更容易把一次失败——」的时候，台灯低下来、靠近纸团：同一个小纸团，在墙上的影子越来越大，
//   最后压在他身后的整面墙上。现实很小，解释越来越大（接下来三件小事分别说「长期的 / 普遍的 / 和自己有关的」）。
//   学术来源只是左上角一行很小的注：Martin Seligman · Explanatory Style。
const { W, H } = require('../../../src/config');
const { FONT } = require('../../../src/lib/style');
const { prog, smooth, lerp, rng, easeInOut } = require('../../../src/lib/util');
const { smoothPath } = require('../lib');
const { person } = require('../people');

const S = { start: 66.9, end: 72.6 };
const DESK_Y = 690;                        // 桌面后沿（墙脚在它后面）
const BALL = { x: 930, y: 706, r: 36 };
const LAMP_BASE = [420, 742];
const fade = (t) => smooth(prog(t, 66.9, 67.2)) * (1 - smooth(prog(t, 72.3, 72.6)));
const low = (t) => easeInOut(prog(t, 69.5, 72.2));           // 台灯低下来
const push = (t) => 1 + 0.04 * prog(t, 66.9, 72.6);

// 揉皱的纸团：不规则的多边形
const CRUMPLE = (() => { const r = rng(909); return Array.from({ length: 13 }, (_, i) => { const a = (i / 13) * Math.PI * 2; const k = 0.78 + r() * 0.34; return [Math.cos(a) * k, Math.sin(a) * k * 0.92]; }); })();
const lampHead = (t) => { const k = low(t); const x = lerp(640, 790, k), y = lerp(430, 694, k); return { x, y, rot: Math.atan2(BALL.y - 6 - y, BALL.x - x) }; };
// 墙上的影子：中心、大小、边缘的虚
function shadowOf(t) {
  const k = low(t);
  const e = k * k;
  return { x: lerp(972, 1200, e), y: lerp(668, 380, e), rx: lerp(48, 420, e), ry: lerp(42, 340, e), blur: lerp(4, 16, e), a: lerp(0.6, 0.82, k) };
}

function scene(ctx, t) {
  // 墙
  const g = ctx.createLinearGradient(0, 0, 0, DESK_Y);
  g.addColorStop(0, '#463d35'); g.addColorStop(1, '#5a4c40');
  ctx.fillStyle = g;
  ctx.fillRect(-200, -200, W + 400, DESK_Y + 200);
  // 墙上的影子（只落在墙上）
  const sh = shadowOf(t);
  ctx.save();
  ctx.beginPath(); ctx.rect(-200, -200, W + 400, DESK_Y + 200); ctx.clip();
  ctx.filter = `blur(${sh.blur.toFixed(1)}px)`;
  ctx.fillStyle = `rgba(14,11,9,${sh.a})`;
  smoothPath(ctx, CRUMPLE.map(([x, y]) => [sh.x + x * sh.rx, sh.y + y * sh.ry]));
  ctx.fill();
  ctx.filter = 'none';
  ctx.restore();
  // 他：坐在桌子另一头，侧身对着纸团，低着头
  person(ctx, 1580, 770, 400, { sit: true, face: -1, lean: 0.3, hd: 0.34, arms: { near: [0.95, 0.9], far: [0.9, 0.9] },
    top: '#3e4640', bottom: '#22201d', hair: '#120e0b', hairStyle: 'short', skin: '#80604a', light: Math.PI, rim: 0.45, rimCol: [255, 214, 160] });
  // 桌面
  ctx.fillStyle = '#4a3828';
  ctx.beginPath(); ctx.moveTo(-200, DESK_Y); ctx.lineTo(W + 200, DESK_Y); ctx.lineTo(W + 200, 790); ctx.lineTo(-200, 790); ctx.closePath(); ctx.fill();
  ctx.strokeStyle = 'rgba(0,0,0,0.14)'; ctx.lineWidth = 2;
  for (let i = 0; i < 6; i++) { const y = DESK_Y + 12 + i * 16; ctx.beginPath(); ctx.moveTo(-200, y); ctx.bezierCurveTo(600, y + 4, 1300, y - 3, W + 200, y + 2); ctx.stroke(); }
  ctx.fillStyle = '#2a1f16';
  ctx.fillRect(-200, 790, W + 400, 30);
  ctx.fillStyle = '#16110d';
  ctx.fillRect(-200, 820, W + 400, H);
  // 纸团（和它在桌上的小影子）
  ctx.fillStyle = 'rgba(20,14,10,0.45)';
  ctx.beginPath(); ctx.ellipse(BALL.x + 30, BALL.y + 30, 46, 10, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#d9cfbb';
  smoothPath(ctx, CRUMPLE.map(([x, y]) => [BALL.x + x * BALL.r, BALL.y + y * BALL.r]));
  ctx.fill();
  ctx.strokeStyle = 'rgba(90,76,60,0.55)'; ctx.lineWidth = 1.6;
  for (const [a, b, c, d] of [[-20, -14, 6, 4], [4, -24, 14, 10], [-14, 12, 18, 18], [-26, 2, -6, 20]]) { ctx.beginPath(); ctx.moveTo(BALL.x + a, BALL.y + b); ctx.lineTo(BALL.x + c, BALL.y + d); ctx.stroke(); }
  // 台灯：底座、两节灯臂、灯罩（朝向纸团）
  const hd = lampHead(t);
  ctx.strokeStyle = '#1c1814'; ctx.lineWidth = 14; ctx.lineCap = 'round';
  const joint = [lerp(470, 560, low(t)), lerp(520, 600, low(t))];
  const back = [hd.x - Math.cos(hd.rot) * 40, hd.y - Math.sin(hd.rot) * 40];
  ctx.beginPath(); ctx.moveTo(...LAMP_BASE); ctx.lineTo(...joint); ctx.lineTo(...back); ctx.stroke();
  ctx.fillStyle = '#17130f';
  ctx.beginPath(); ctx.ellipse(LAMP_BASE[0], LAMP_BASE[1], 74, 20, 0, 0, Math.PI * 2); ctx.fill();
  ctx.save();
  ctx.translate(hd.x, hd.y); ctx.rotate(hd.rot);
  ctx.fillStyle = '#3b332a';
  ctx.beginPath(); ctx.moveTo(-40, -20); ctx.lineTo(-40, 20); ctx.lineTo(36, 46); ctx.lineTo(36, -46); ctx.closePath(); ctx.fill();
  ctx.restore();
}

function draw(ctx, t) {
  const p = push(t);
  ctx.save();
  ctx.globalAlpha *= fade(t);
  ctx.translate(980, 560); ctx.scale(p, p); ctx.translate(-980, -560);
  scene(ctx, t);
  ctx.restore();
}
function drawOver(ctx, t) {
  const p = push(t);
  const hd = lampHead(t);
  ctx.save();
  ctx.globalAlpha *= fade(t);
  ctx.save();
  ctx.translate(980, 560); ctx.scale(p, p); ctx.translate(-980, -560);
  // 灯罩口的亮
  ctx.translate(hd.x, hd.y); ctx.rotate(hd.rot);
  ctx.globalCompositeOperation = 'screen';
  ctx.fillStyle = 'rgba(255,228,180,0.85)';
  ctx.beginPath(); ctx.ellipse(36, 0, 9, 44, 0, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
  // 角落里很小的一行注
  const na = smooth(prog(t, 67.4, 67.9)) * (1 - smooth(prog(t, 72.0, 72.4)));
  if (na > 0) {
    ctx.globalAlpha = fade(t) * na * 0.62;
    ctx.font = FONT.enItalic(26);
    ctx.letterSpacing = '2px';
    ctx.fillStyle = '#ddd0b8';
    ctx.fillText('Martin Seligman · Explanatory Style', 96, 104);
  }
  ctx.restore();
}
// 光：台灯。高的时候光圈落在桌上的纸团周围；低下来以后光打到墙上，影子才显出来
function light(t) {
  const k = low(t), w = fade(t), p = push(t);
  const P = (x, y) => [980 + (x - 980) * p, 560 + (y - 560) * p];
  const [lx, ly] = P(lerp(860, 1120, k), lerp(690, 450, k));
  const [hx, hy] = P(1560, 560);
  const [gx, gy] = P(lampHead(t).x, lampHead(t).y);
  return [
    { x: lx, y: ly, rx: lerp(560, 900, k) * p, ry: lerp(300, 560, k) * p, i: 1.0, w, color: [255, 210, 150], core: 0.3 },
    { x: hx, y: hy, rx: 300 * p, ry: 380 * p, i: 0.55, w, color: [255, 206, 150] },
    { x: gx, y: gy, rx: 200 * p, ry: 180 * p, i: 0.7, w, color: [255, 214, 160] },
  ];
}
function grade() { return { warm: 0.3, ambient: 0.1 }; }

module.exports = { ...S, draw, drawOver, light, grade };
