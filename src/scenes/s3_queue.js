// 第三幕 · 时间：座位号变成排队号码 A147。前面还有一长串号码，叫号几乎不动。
const { W, H } = require('../config');
const { C, FONT } = require('../lib/style');
const { pencil, typeText, camera } = require('../lib/draw');
const { prog, smooth, easeInOut, easeOut, lerp, clamp, rng } = require('../lib/util');
const { SEAT_TARGET } = require('./s2_ticket');

const S = { start: 17.0, end: 28.5 };

const SLIP = { cx: 960, top: 250, bottom: 770, w: 390 };

// 镜头：先停在号码上，然后缓慢拉远，露出前面长长的队
function cam(t) {
  const k = easeInOut(prog(t, 18.2, 26));
  return { cx: lerp(960, 1010, k), cy: lerp(540, 520, k), s: lerp(1.0, 0.9, k) };
}

function tornEdge(x0, x1, y, seed, dir) {
  const r = rng(seed);
  const pts = [];
  const n = 26;
  for (let i = 0; i <= n; i++) pts.push([lerp(x0, x1, i / n), y + dir * (i % 2 ? 4 + r() * 4 : r() * 2)]);
  return pts;
}

function slipPath(ctx) {
  const x0 = SLIP.cx - SLIP.w / 2, x1 = SLIP.cx + SLIP.w / 2;
  const top = tornEdge(x0, x1, SLIP.top, 5, -1);
  const bot = tornEdge(x1, x0, SLIP.bottom, 6, 1);
  ctx.moveTo(top[0][0], top[0][1]);
  for (const p of top) ctx.lineTo(p[0], p[1]);
  for (const p of bot) ctx.lineTo(p[0], p[1]);
  ctx.closePath();
  return [top, bot];
}

// 前面的号码：A146 → A124，向右后方延伸（透视），越来越淡、越来越模糊
function drawQueue(ctx, t, a) {
  const k = prog(t, 18.0, 20.5);
  const crawl = smooth(prog(t, 23.6, 24.4)); // 队伍极慢地挪一格
  const near = [1300, 590], vanish = [1880, 300];
  for (let i = 15; i >= 0; i--) {
    const appear = smooth(clamp(k * 1.8 - (i / 15) * 0.8));
    if (appear <= 0) continue;
    const z = 1 + (i + crawl) * 0.45;
    const x = vanish[0] + (near[0] - vanish[0]) / z;
    const y = vanish[1] + (near[1] - vanish[1]) / z;
    const s = 0.4 / z;
    const ff = 1 - 1 / z;
    ctx.save();
    ctx.globalAlpha = a * appear * lerp(0.78, 0.06, ff);
    ctx.filter = `blur(${lerp(0.4, 4, ff).toFixed(1)}px)`;
    ctx.font = FONT.type(128 * s);
    ctx.fillStyle = C.lightText;
    ctx.textAlign = 'center';
    ctx.fillText('A' + (146 - i), x, y);
    ctx.restore();
  }
}

// 远处一排空椅子
function drawChairs(ctx, t, a) {
  const p = prog(t, 18.6, 20.0);
  for (let i = 0; i < 4; i++) {
    const x = 170 + i * 128, y = 640;
    const o = { seed: 200 + i, t, width: 1.8, color: C.lightSoft, alpha: a, progress: clamp(p * 1.6 - i * 0.15) };
    pencil(ctx, [[x, y], [x, y + 120]], o);
    pencil(ctx, [[x + 76, y + 60], [x + 76, y + 120]], { ...o, width: 1.2 });
    pencil(ctx, [[x, y + 60], [x + 80, y + 60], [x + 80, y + 120]], o);
    pencil(ctx, [[x + 4, y + 2], [x + 4, y + 58]], { ...o, width: 1 });
  }
  pencil(ctx, [[130, 762], [700, 762]], { seed: 210, t, width: 1.2, color: C.lightSoft, alpha: a * 0.7, progress: p });
}

function fmtWait(sec) {
  const m = Math.floor(sec / 60), s = Math.floor(sec % 60);
  return `00:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

function drawSlip(ctx, t, a) {
  const inK = smooth(prog(t, 16.9, 17.6));
  const x0 = SLIP.cx - SLIP.w / 2;
  ctx.save();
  ctx.globalAlpha = a * inK;
  ctx.shadowColor = 'rgba(60,40,20,0.2)';
  ctx.shadowBlur = 16; ctx.shadowOffsetX = 5; ctx.shadowOffsetY = 8;
  ctx.fillStyle = '#f0e8d4';
  ctx.beginPath();
  slipPath(ctx);
  ctx.fill();
  ctx.restore();

  ctx.save();
  ctx.globalAlpha = a;
  const bp = prog(t, 16.9, 17.8);
  const [top, bot] = (() => { const c = { moveTo() {}, lineTo() {}, closePath() {} }; return slipPath(c); })();
  pencil(ctx, [...top, ...bot, top[0]], { seed: 90, t, width: 1.5, progress: bp, amp: 0.5 });

  const tp = (a0, a1) => prog(t, a0, a1);
  ctx.globalAlpha = a * smooth(tp(17.9, 18.4));
  ctx.font = FONT.serif(34);
  ctx.fillStyle = C.ink;
  ctx.textAlign = 'center';
  ctx.fillText('取 号 单', SLIP.cx, SLIP.top + 70);
  ctx.globalAlpha = a;
  typeText(ctx, 'QUEUE TICKET', SLIP.cx, SLIP.top + 104, { font: FONT.type(20), color: C.brown, progress: tp(18.0, 18.4), align: 'center', seed: 91 });
  ctx.save();
  ctx.setLineDash([6, 6]);
  pencil(ctx, [[x0 + 30, SLIP.top + 130], [x0 + SLIP.w - 30, SLIP.top + 130]], { seed: 92, t, width: 1.2, color: C.graphiteSoft, progress: tp(18.0, 18.5), passes: 1, boil: false });
  pencil(ctx, [[x0 + 30, SLIP.top + 390], [x0 + SLIP.w - 30, SLIP.top + 390]], { seed: 93, t, width: 1.2, color: C.graphiteSoft, progress: tp(18.2, 18.7), passes: 1, boil: false });
  ctx.restore();

  // 号码：从座位号「12」淡入为「A147」
  typeText(ctx, 'A147', SEAT_TARGET.x, SEAT_TARGET.y, { font: FONT.type(SEAT_TARGET.size), color: C.ink, progress: tp(17.45, 17.85), align: 'center', seed: 147 });

  // 前面还有 N 位（23 → 22，很慢）
  const ahead = t < 23.6 ? 23 : 22;
  ctx.globalAlpha = a * smooth(tp(18.3, 18.8));
  ctx.font = FONT.serif(28);
  ctx.fillStyle = C.brown;
  ctx.textAlign = 'right';
  ctx.fillText('您前面还有', SLIP.cx + 30, SLIP.top + 350);
  ctx.textAlign = 'left';
  ctx.fillText('位', SLIP.cx + 108, SLIP.top + 350);
  const ak = t < 23.6 ? 1 : smooth(tp(23.6, 23.9));
  ctx.globalAlpha = a * smooth(tp(18.3, 18.8)) * ak;
  ctx.font = FONT.type(44);
  ctx.fillStyle = C.ink;
  ctx.textAlign = 'center';
  ctx.fillText(String(ahead), SLIP.cx + 70, SLIP.top + 352);

  ctx.globalAlpha = a;
  typeText(ctx, '14:05  取号', SLIP.cx, SLIP.top + 440, { font: FONT.type(24), color: C.gray, progress: tp(18.4, 18.8), align: 'center', seed: 94 });
  // 条码
  const r = rng(95);
  ctx.globalAlpha = a * smooth(tp(18.5, 19.0)) * 0.75;
  ctx.fillStyle = C.ink;
  let bx = SLIP.cx - 110;
  while (bx < SLIP.cx + 110) {
    const bw = 1 + Math.floor(r() * 4);
    if (r() > 0.4) ctx.fillRect(bx, SLIP.top + 462, bw, 30);
    bx += bw + 1 + Math.floor(r() * 3);
  }
  ctx.restore();
}

function draw(ctx, t) {
  const c = cam(t);
  ctx.save();
  camera(ctx, c.cx, c.cy, c.s);
  drawSlip(ctx, t, 1);
  ctx.restore();
}

// 光斑之外、但仍需隐约可见的东西：叫号屏（自身发光）、远处的号码和空椅子
function drawOver(ctx, t) {
  const c = cam(t);
  ctx.save();
  camera(ctx, c.cx, c.cy, c.s);
  const hk = smooth(prog(t, 18.4, 19.2));
  if (hk > 0) {
    ctx.save();
    ctx.globalAlpha = hk * 0.85;
    ctx.font = FONT.serif(26);
    ctx.fillStyle = C.dimText;
    ctx.fillText('正在叫号', 200, 250);
    ctx.font = FONT.type(64);
    ctx.fillStyle = C.lightText;
    ctx.shadowColor = 'rgba(255,200,140,0.35)';
    ctx.shadowBlur = 14;
    ctx.fillText(t < 23.6 ? 'A124' : 'A125', 200, 320);
    ctx.shadowBlur = 0;
    if (t >= 23.6) {
      // 叫号跳了一下：一条暗红小划线
      pencil(ctx, [[196, 334], [356, 334]], { seed: 220, t, width: 2, color: C.subRed, progress: prog(t, 23.6, 23.9) });
    }
    ctx.font = FONT.serif(24);
    ctx.fillStyle = C.dimText;
    ctx.fillText('已等待', 200, 390);
    // 等待计时：从 40 分钟开始走
    const wait = 40 * 60 + 12 + (t - 18.4) * 9;
    ctx.font = FONT.type(32);
    ctx.fillStyle = C.lightText;
    ctx.fillText(fmtWait(wait), 290, 392);
    ctx.restore();
  }
  ctx.globalAlpha = 0.55;
  drawChairs(ctx, t, 1);
  ctx.globalAlpha = 1;
  drawQueue(ctx, t, 0.75);
  ctx.restore();
}

function light(t) {
  const c = cam(t);
  const x = W / 2 + (SLIP.cx - c.cx) * c.s, y = H / 2 + (510 - c.cy) * c.s;
  return { x, y, rx: 600, ry: 470, i: 1, w: smooth(prog(t, 16.9, 17.6)) };
}

module.exports = { ...S, draw, drawOver, light, cam, SLIP };
