// 第十 / 十一幕 · 78.4–86.1 秒：悲观的解释风格 → 生活例子一：考试。
//   俯拍：桌上一张试卷，红笔写着「58」。小小的分数向外伸出三条铅笔线：
//     时间 → 会一直这样。 / 范围 → 什么都这样。 / 自己 → 都是我的问题。
//   83.0 起镜头拉开：试卷前是一个低着头的人（俯拍，只看到头顶、肩膀和手臂）；84.9 试卷旁浮出一句：我就是不行。
//   85.5 起红色的分数圈缩成一个小红点，飞向下一幕手机上的消息红点。
const { W, H } = require('../../../src/config');
const { FONT, C } = require('../../../src/lib/style');
const { prog, smooth, lerp, rng, easeInOut } = require('../../../src/lib/util');
const { pencil, sketchEllipse } = require('../../../src/lib/draw');
const { sheet, inkText } = require('../../../src/lib/material');
const { withCam, toScreen, smoothPath } = require('../lib');

const S = { start: 78.3, end: 86.2 };
const PAPER = { x: 720, y: 600, w: 780, h: 1020, rot: -0.04 };
const SCORE = [PAPER.x + 230, PAPER.y - 380];          // 「58」在世界坐标里的位置
const BADGE = [1306, 352];                              // 下一幕手机上红点的位置（画面坐标）
const DIRS = [
  { t0: 80.9, to: [SCORE[0] + 520, SCORE[1] - 70], key: '时间', en: 'PERMANENT', say: '会一直这样。' },
  { t0: 81.7, to: [SCORE[0] + 610, SCORE[1] + 230], key: '范围', en: 'PERVASIVE', say: '什么都这样。' },
  { t0: 82.3, to: [SCORE[0] + 480, SCORE[1] + 520], key: '自己', en: 'PERSONAL', say: '都是我的问题。' },
];

function cam(t) {
  const a = { cx: 1290, cy: 470, s: 0.86 };
  const b = { cx: 900, cy: 430, s: 0.78 };
  const k = easeInOut(prog(t, 82.9, 84.6));
  return { cx: lerp(a.cx, b.cx, k) + (t - 78.3) * 3, cy: lerp(a.cy, b.cy, k), s: lerp(a.s, b.s, k) };
}

function desk(ctx) {
  const g = ctx.createLinearGradient(-400, -400, W + 400, H + 400);
  g.addColorStop(0, '#3a2c22'); g.addColorStop(1, '#2a2019');
  ctx.fillStyle = g;
  ctx.fillRect(-1200, -1200, W + 2400, H + 2400);
  ctx.strokeStyle = 'rgba(0,0,0,0.12)'; ctx.lineWidth = 2;
  for (let i = -30; i < 60; i++) { const y = i * 40; ctx.beginPath(); ctx.moveTo(-1200, y); ctx.bezierCurveTo(200, y + 12, 1200, y - 10, W + 1200, y + 6); ctx.stroke(); }
}

function paper(ctx, t) {
  ctx.save();
  ctx.translate(PAPER.x, PAPER.y);
  ctx.rotate(PAPER.rot);
  sheet(ctx, PAPER.w, PAPER.h, { seed: 1010, tone: 'bone', light: -2.3, lift: 0.08, shade: 0.4 });
  inkText(ctx, '期中考试  ·  数学', -PAPER.w / 2 + 60, -PAPER.h / 2 + 90, { font: FONT.serif(38), color: '#2a2420', seed: 1011, wear: 0.3 });
  inkText(ctx, '姓名 ______   班级 ______', -PAPER.w / 2 + 60, -PAPER.h / 2 + 150, { font: FONT.body(24), color: '#4a4038', seed: 1012, wear: 0.3 });
  ctx.fillStyle = 'rgba(60,50,42,0.4)';
  const r = rng(1013);
  for (let i = 0; i < 15; i++) {
    const y = -PAPER.h / 2 + 230 + i * 50;
    ctx.fillRect(-PAPER.w / 2 + 60, y, 30, 8);
    ctx.fillRect(-PAPER.w / 2 + 110, y, 420 + r() * 160, 8);
    // 红笔的叉
    if (r() < 0.45) { ctx.strokeStyle = 'rgba(160,40,30,0.75)'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(PAPER.w / 2 - 110, y - 10); ctx.lineTo(PAPER.w / 2 - 90, y + 14); ctx.moveTo(PAPER.w / 2 - 90, y - 10); ctx.lineTo(PAPER.w / 2 - 110, y + 14); ctx.stroke(); }
  }
  ctx.restore();
}

// 红笔的「58」和圈
function score(ctx, t) {
  const fly = smooth(prog(t, 85.5, 86.1));
  if (fly > 0) return;
  inkText(ctx, '58', SCORE[0], SCORE[1] + 46, { font: FONT.hand(150), color: '#a0281e', seed: 1020, wear: 0.15, align: 'center' });
  sketchEllipse(ctx, SCORE[0] - 4, SCORE[1] - 4, 120, 92, { t: 0, boil: false, seed: 1021, width: 4, color: 'rgba(160,40,30,0.9)', passes: 2, pressure: 0.5 });
}

// 三个方向
function directions(ctx, t) {
  const fade = 1 - smooth(prog(t, 83.0, 83.6));
  if (fade <= 0) return;
  ctx.save();
  ctx.globalAlpha *= fade;
  for (const d of DIRS) {
    const k = prog(t, d.t0, d.t0 + 0.45);
    if (k <= 0) continue;
    const from = [SCORE[0] + (d.to[0] - SCORE[0]) * 0.22, SCORE[1] + (d.to[1] - SCORE[1]) * 0.22];
    pencil(ctx, [from, d.to], { t, seed: 1030 + d.t0, width: 3, color: 'rgba(226,212,190,0.75)', progress: k, pressure: 0.5 });
    const a = smooth(prog(t, d.t0 + 0.3, d.t0 + 0.6));
    if (a <= 0) continue;
    ctx.save();
    ctx.globalAlpha *= a;
    ctx.font = FONT.serif(46);
    ctx.fillStyle = '#e6dac4';
    ctx.fillText(d.key, d.to[0] + 26, d.to[1] - 6);
    ctx.font = FONT.type(22);
    ctx.fillStyle = 'rgba(214,200,180,0.7)';
    ctx.fillText(d.en, d.to[0] + 26, d.to[1] + 30);
    ctx.font = FONT.hand(72);
    ctx.fillStyle = '#ecdfc8';
    ctx.fillText(d.say, d.to[0] + 150, d.to[1] + 6);
    ctx.restore();
  }
  ctx.restore();
}

// 俯拍的人：头顶、肩膀、两只手臂压在桌上；慢慢把头埋低
function student(ctx, t) {
  const a = smooth(prog(t, 82.9, 83.6));
  if (a <= 0) return;
  const low = smooth(prog(t, 83.4, 85.6));
  ctx.save();
  ctx.globalAlpha *= a;
  const cx = PAPER.x + 20, top = PAPER.y - PAPER.h / 2 - 40;
  // 肩膀和背（深色毛衣），一部分在画面外
  const sg = ctx.createLinearGradient(cx - 380, top - 120, cx + 380, top + 60);
  sg.addColorStop(0, '#46524a'); sg.addColorStop(1, '#262e28');
  ctx.fillStyle = sg;
  smoothPath(ctx, [[cx - 380, top - 120], [cx + 380, top - 120], [cx + 340, top + 60], [cx - 340, top + 60]]);
  ctx.fill();
  // 手臂：从肩膀伸到试卷两侧
  for (const s of [-1, 1]) {
    ctx.fillStyle = '#36403a';
    smoothPath(ctx, [[cx + s * 300, top + 20], [cx + s * 420, top + 260], [cx + s * 430, top + 560], [cx + s * 340, top + 600], [cx + s * 320, top + 300], [cx + s * 220, top + 60]]);
    ctx.fill();
    ctx.fillStyle = '#7a5a46';
    ctx.beginPath(); ctx.ellipse(cx + s * 370, top + 620, 54, 40, s * 0.4, 0, Math.PI * 2); ctx.fill();
  }
  // 头顶（头发），低头时往前、往下一点：发旋、发缝、受光的一侧发亮，两侧露出一点耳朵
  const hy = top + lerp(30, 90, low);
  const ry = lerp(118, 132, low);
  for (const s2 of [-1, 1]) { ctx.fillStyle = '#6e503e'; ctx.beginPath(); ctx.ellipse(cx + s2 * 104, hy + 20, 16, 28, 0, 0, Math.PI * 2); ctx.fill(); }
  const hg = ctx.createRadialGradient(cx - 40, hy - 50, 10, cx, hy, 150);
  hg.addColorStop(0, '#4a3a2e'); hg.addColorStop(0.5, '#241a14'); hg.addColorStop(1, '#120d0a');
  ctx.fillStyle = hg;
  ctx.beginPath(); ctx.ellipse(cx, hy, 108, ry, 0, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = 'rgba(255,224,186,0.16)'; ctx.lineWidth = 2;
  for (let i = 0; i < 14; i++) { const a2 = -1.2 + i * 0.17; ctx.beginPath(); ctx.moveTo(cx - 6, hy - 20); ctx.quadraticCurveTo(cx + Math.cos(a2) * 60, hy + Math.sin(a2) * 60 - 20, cx + Math.cos(a2) * 104, hy + Math.sin(a2) * ry * 0.95); ctx.stroke(); }
  ctx.strokeStyle = 'rgba(20,14,10,0.7)'; ctx.lineWidth = 3;
  ctx.beginPath(); ctx.moveTo(cx - 6, hy - 20); ctx.lineTo(cx - 14, hy + ry * 0.9); ctx.stroke();
  ctx.restore();
}

// 「我就是不行」：在试卷旁浮出来（手写、很轻）
function thought(ctx, t) {
  const a = smooth(prog(t, 84.9, 85.4)) * (1 - smooth(prog(t, 85.8, 86.1)));
  if (a <= 0) return;
  ctx.save();
  ctx.globalAlpha = a * 0.9;
  ctx.font = FONT.hand(84);
  ctx.fillStyle = '#e4d6c0';
  ctx.shadowColor = 'rgba(0,0,0,0.6)'; ctx.shadowBlur = 14;
  const w = ctx.measureText('我就是不行').width;
  ctx.beginPath(); ctx.rect(PAPER.x + 470, 380, (w + 20) * prog(t, 84.9, 85.5), 140); ctx.clip();
  ctx.fillText('我就是不行', PAPER.x + 480, 480);
  ctx.restore();
}

function draw(ctx, t) {
  const c = cam(t);
  ctx.save();
  ctx.globalAlpha *= smooth(prog(t, 78.35, 78.9)) * (1 - smooth(prog(t, 85.75, 86.15)));
  withCam(ctx, c, 1, () => { desk(ctx); paper(ctx, t); score(ctx, t); student(ctx, t); });
  ctx.restore();
}
function drawOver(ctx, t) {
  const c = cam(t);
  ctx.save();
  ctx.globalAlpha *= smooth(prog(t, 78.35, 78.9)) * (1 - smooth(prog(t, 85.75, 86.15)));
  withCam(ctx, c, 1, () => { directions(ctx, t); thought(ctx, t); });
  ctx.restore();
  // 分数的红圈缩成一个红点，飞到下一幕手机上
  const fly = smooth(prog(t, 85.5, 86.1));
  if (fly > 0) {
    const [sx, sy] = toScreen(cam(85.5), SCORE[0], SCORE[1]);
    const x = lerp(sx, BADGE[0], fly), y = lerp(sy, BADGE[1], fly);
    const r = lerp(100 * cam(85.5).s, 9, Math.min(1, fly * 1.4));
    ctx.save();
    ctx.globalAlpha = 1 - smooth(prog(t, 86.0, 86.2));
    ctx.strokeStyle = '#b8352a'; ctx.fillStyle = '#b8352a';
    ctx.lineWidth = lerp(5, 0, fly);
    ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2);
    if (fly > 0.7) ctx.fill(); else ctx.stroke();
    ctx.restore();
  }
}

function light(t) {
  const c = cam(t);
  const w = smooth(prog(t, 78.35, 78.9)) * (1 - smooth(prog(t, 85.75, 86.15)));
  const [x, y] = toScreen(c, PAPER.x + 200, PAPER.y - 200);
  return [
    { x, y, rx: 1000 * c.s, ry: 760 * c.s, i: 0.95, w, color: [255, 216, 170], core: 0.3, rot: -0.3 },
    { x: W * 0.72, y: H * 0.42, rx: 700, ry: 500, i: 0.4, w, color: [255, 210, 170] },
  ];
}
function grade() { return { warm: 0.2, ambient: 0.1 }; }

module.exports = { ...S, draw, drawOver, light, grade, BADGE };
