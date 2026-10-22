// 第十三幕 · 109.2–120 秒：结尾，回到开头的窗。
//   与第 0 秒完全相同的构图：墙、窗、窗下的书桌、左墙上那本「7 月」的旧日历。
//   但现在站在窗边的是成年人，窗外是夜晚的城市。他把窗打开，纱帘被风吹进来，城市的声音进来了。
//   最后一句停留约 2 秒，自然淡黑。没有 CTA。
const L = require('../lib');
const { W, H, FONT, rng, noise1, lerp, clamp, prog, smooth } = L;
const summer = require('./t1_summer');
const { DESIGN_END } = require('../../../src/config');

const S = { start: 109.1, end: DESIGN_END };
const E0 = 109.2, OPEN = 111.2;
const WIN = { x0: 1080, y0: 110, x1: 1640, y1: 600 };
const DESK = 640;

function nightCity(ctx, d) {
  L.blurred(ctx, 3, (c) => {
    c.beginPath(); c.rect(WIN.x0, WIN.y0, WIN.x1 - WIN.x0, WIN.y1 - WIN.y0); c.clip();
    const g = c.createLinearGradient(0, WIN.y0, 0, WIN.y1);
    g.addColorStop(0, '#1a2234'); g.addColorStop(1, '#3a3a4a');
    c.fillStyle = g; c.fillRect(WIN.x0, WIN.y0, WIN.x1 - WIN.x0, WIN.y1 - WIN.y0);
    const r = rng(1301);
    for (let i = 0; i < 9; i++) {
      const x = WIN.x0 + i * 70 - 20, h = 140 + r() * 260;
      c.fillStyle = '#141824'; c.fillRect(x, WIN.y1 - h, 64, h);
      for (let k = 0; k < 10; k++) if (r() < 0.45) { c.fillStyle = `rgba(255,${200 + r() * 40},140,${0.5 + r() * 0.4})`; c.fillRect(x + 8 + (k % 3) * 18, WIN.y1 - h + 14 + Math.floor(k / 3) * 30, 8, 10); }
    }
  });
  // 远处的灯（虚光）
  const r = rng(1302);
  for (let i = 0; i < 10; i++) {
    const x = WIN.x0 + r() * (WIN.x1 - WIN.x0), y = WIN.y0 + 200 + r() * 260, s = 8 + r() * 18;
    const gl = ctx.createRadialGradient(x, y, 0, x, y, s);
    gl.addColorStop(0, `rgba(255,214,160,${0.35 + 0.15 * Math.sin(d * 2 + i)})`); gl.addColorStop(1, 'rgba(255,214,160,0)');
    ctx.fillStyle = gl; ctx.fillRect(x - s, y - s, s * 2, s * 2);
  }
}

function wall(ctx) {
  const g = ctx.createLinearGradient(0, 0, W, 0);
  g.addColorStop(0, '#1c1f26'); g.addColorStop(0.45, '#2a2e36'); g.addColorStop(1, '#343844');
  ctx.fillStyle = g; ctx.fillRect(-100, -100, W + 200, H + 200);
  ctx.save(); ctx.globalCompositeOperation = 'multiply'; ctx.globalAlpha = 0.5;
  ctx.drawImage(L.wallTex(W, H, [200, 196, 190], 502, { cells: 9 }), 0, 0); ctx.restore();
  ctx.fillStyle = '#262c2a'; ctx.fillRect(-100, 820, W + 200, 160);
  ctx.fillStyle = '#16120f'; ctx.fillRect(-100, 980, W + 200, 14);
  ctx.fillStyle = '#1e1814'; ctx.fillRect(-100, 994, W + 200, 200);
  // 城市的光投在墙上
  L.blurred(ctx, 18, (c) => {
    c.fillStyle = 'rgba(150,170,210,0.18)';
    c.beginPath(); c.moveTo(170, 300); c.lineTo(650, 270); c.lineTo(700, 720); c.lineTo(210, 760); c.fill();
  });
}

function frame(ctx, open) {
  ctx.fillStyle = '#3a3630';
  ctx.beginPath(); ctx.moveTo(WIN.x0 - 26, WIN.y0 - 20); ctx.lineTo(WIN.x0, WIN.y0); ctx.lineTo(WIN.x0, WIN.y1); ctx.lineTo(WIN.x0 - 26, WIN.y1 + 14); ctx.fill();
  const col = '#4e5648';
  ctx.fillStyle = col;
  const fw = 14;
  ctx.fillRect(WIN.x0, WIN.y0, WIN.x1 - WIN.x0, fw); ctx.fillRect(WIN.x0, WIN.y1 - fw, WIN.x1 - WIN.x0, fw);
  ctx.fillRect(WIN.x0, WIN.y0, fw, WIN.y1 - WIN.y0); ctx.fillRect(WIN.x1 - fw, WIN.y0, fw, WIN.y1 - WIN.y0);
  const mx = (WIN.x0 + WIN.x1) / 2;
  ctx.fillRect(mx - 8, WIN.y0, 16, WIN.y1 - WIN.y0);
  // 右扇窗：打开时向外推出去，只剩一条窄边
  const pw = (WIN.x1 - mx - 8) * (1 - open * 0.85);
  ctx.fillStyle = 'rgba(120,140,160,0.16)';
  ctx.fillRect(mx + 8, WIN.y0 + fw, pw, WIN.y1 - WIN.y0 - fw * 2);
  ctx.strokeStyle = col; ctx.lineWidth = 12;
  ctx.strokeRect(mx + 14, WIN.y0 + fw + 6 - open * 10, pw - 10, WIN.y1 - WIN.y0 - fw * 2 - 12 + open * 20);
  // 左扇：玻璃反光
  ctx.fillStyle = 'rgba(160,180,210,0.08)';
  ctx.fillRect(WIN.x0 + fw, WIN.y0 + fw, mx - WIN.x0 - fw - 8, WIN.y1 - WIN.y0 - fw * 2);
  ctx.fillStyle = '#5a5246';
  ctx.fillRect(WIN.x0 - 30, WIN.y1, WIN.x1 - WIN.x0 + 50, 14);
}

function desk(ctx) {
  ctx.fillStyle = '#241a14'; ctx.fillRect(1170, DESK + 20, 22, 380); ctx.fillRect(1610, DESK + 20, 22, 380);
  ctx.fillStyle = '#3a2a20'; ctx.fillRect(1120, DESK, 560, 24);
  ctx.fillStyle = '#2e2018'; ctx.fillRect(1192, DESK + 24, 418, 90);
}

// 风吹进来的纱帘（打开窗之后）
function curtain(ctx, d, open) {
  const gust = open * (0.5 + 0.5 * Math.sin(d * 1.6 + 0.4) * (0.6 + 0.4 * noise1(d * 0.9, 1303)));
  const top = WIN.y0 - 40;
  ctx.save();
  ctx.translate(WIN.x1 + 40, 0); ctx.scale(-1, 1); ctx.translate(-(WIN.x0 - 40), 0);
  for (let k = 0; k < 4; k++) {
    const x0 = WIN.x0 - 90 + k * 46;
    const blow = (20 + (40 + k * 30) * gust) + noise1(d * 1.2 + k, 1310 + k) * 10 * open;
    ctx.fillStyle = `rgba(200,206,220,${0.16 + 0.03 * k})`;
    ctx.beginPath();
    ctx.moveTo(x0, top); ctx.lineTo(x0 + 70, top);
    ctx.bezierCurveTo(x0 + 80 + blow * 0.3, top + 200, x0 + 80 + blow, top + 400, x0 + 70 + blow * 1.25, WIN.y1 + 150);
    ctx.lineTo(x0 + blow * 1.1, WIN.y1 + 170);
    ctx.bezierCurveTo(x0 + blow * 0.8, top + 400, x0 - 6 + blow * 0.2, top + 200, x0, top);
    ctx.fill();
  }
  ctx.restore();
  ctx.fillStyle = '#16120f';
  ctx.fillRect(WIN.x0 - 140, top - 10, WIN.x1 - WIN.x0 + 260, 8);
}

function man(ctx, d, open) {
  const reach = smooth(prog(d, OPEN - 0.7, OPEN)) * (1 - smooth(prog(d, OPEN + 0.5, OPEN + 1.3)));
  L.lit(ctx, (c) => {
    c.translate(1080, 610);
    L.side(c, { h: 780, kind: 'adult', f: 1, yaw: 1, pose: {
      torso: 0.06 + reach * 0.12, neck: 0.0, head: -0.12 + Math.sin(d * 0.6) * 0.01,
      reachN: [lerp(40, 340, reach), lerp(40, -250, reach)], handN: lerp(0.2, 2.6, reach),
      uArmF: -0.05, fArmF: 0.15,
    } });
  }, { light: -0.1, rim: [200, 210, 235], rimA: 0.9, rimW: 4, shadow: 0.6, ambient: 0.9, bbox: [900, 120, 520, 900] });
}

function draw(ctx, d) {
  const t = d - E0;
  const open = smooth(prog(d, OPEN, OPEN + 1.2));
  const cam = { cx: 940 + t * 6, cy: 540 + t * 2, s: 1.03 + t * 0.008 };
  ctx.save();
  ctx.globalAlpha = smooth(prog(d, E0 - 0.1, E0 + 0.7));
  L.withCam(ctx, cam, 1, () => {
    wall(ctx);
    // 同一本旧日历，还挂在原来的地方（在暗处）
    ctx.save(); ctx.globalAlpha *= 0.55; summer.calendar(ctx, d); ctx.restore();
    nightCity(ctx, d);
    frame(ctx, open);
    desk(ctx);
    man(ctx, d, open);
    curtain(ctx, d, open);
  });
  ctx.restore();
}

function light(d) {
  const open = smooth(prog(d, OPEN, OPEN + 1.2));
  return [
    { x: 1300, y: 380, rx: 760, ry: 600, i: 0.85 + 0.1 * open, color: [190, 200, 230] },
    { x: 430, y: 500, rx: 480, ry: 400, i: 0.45 },
  ];
}
function grade(d) { return { warm: -0.15, ambient: 0.28 }; }

module.exports = { ...S, draw, light, grade };
