// 第二幕 · 钱：杯口变成电影票的检票印章；时钟一圈一圈往前走。
const { W, H } = require('../config');
const { C, FONT } = require('../lib/style');
const { pencil, sketchEllipse, ellipsePts, rectPts, typeText, handText, hatch, camera } = require('../lib/draw');
const { prog, smooth, easeInOut, easeOut, lerp, clamp } = require('../lib/util');
const glass = require('./s1_glass');

const S = { start: 7.0, end: 18.4 };

// 票面（世界坐标）
const TK = { x: 300, y: 330, w: 820, h: 330, stubX: 940, rot: -0.025 };
const STAMP = { x: 1032, y: 448, r: 64 };
const CLOCK = { x: 1480, y: 470, r: 128 };
const SEAT = { x: 0, y: 552 }; // x 在绘制时测量

// 分钟数：20 → 40 → 60，跟随字幕
const MIN_KEYS = [[8.8, 0], [9.6, 20], [11.6, 40], [13.9, 60], [18, 64]];
function minutes(t) {
  for (let i = 1; i < MIN_KEYS.length; i++) {
    const [t0, m0] = MIN_KEYS[i - 1], [t1, m1] = MIN_KEYS[i];
    if (t <= t1) {
      // 每段前 0.7 秒快速走，之后几乎停住（像被盯着看的钟）
      const k = easeInOut(clamp((t - t0) / Math.min(0.9, t1 - t0)));
      return lerp(m0, m1, k);
    }
  }
  return 64;
}

function cam(t) {
  const k = smooth(prog(t, 8.0, 17.5));
  return { cx: lerp(950, 975, k), cy: 505, s: lerp(1.1, 1.15, k) };
}
function toScreen(c, x, y) {
  return [W / 2 + (x - c.cx) * c.s, H / 2 + (y - c.cy) * c.s];
}

function drawTicket(ctx, t, a, fadeOthers) {
  const inK = smooth(prog(t, 7.3, 8.3));
  ctx.save();
  ctx.translate(TK.x + TK.w / 2, TK.y + TK.h / 2);
  ctx.rotate(TK.rot);
  ctx.translate(-(TK.x + TK.w / 2), -(TK.y + TK.h / 2));
  const o = a * fadeOthers;

  // 票纸与投影
  ctx.save();
  ctx.globalAlpha = o * inK;
  ctx.shadowColor = 'rgba(60,40,20,0.22)';
  ctx.shadowBlur = 18; ctx.shadowOffsetX = 6; ctx.shadowOffsetY = 9;
  ctx.fillStyle = '#efe5cc';
  ctx.beginPath();
  ctx.rect(TK.x, TK.y, TK.w, TK.h);
  ctx.fill();
  ctx.shadowColor = 'transparent';
  // 票面轻微泛黄
  const g = ctx.createLinearGradient(TK.x, TK.y, TK.x + TK.w, TK.y + TK.h);
  g.addColorStop(0, 'rgba(190,160,100,0.10)');
  g.addColorStop(0.6, 'rgba(190,160,100,0)');
  g.addColorStop(1, 'rgba(170,140,90,0.16)');
  ctx.fillStyle = g;
  ctx.fillRect(TK.x, TK.y, TK.w, TK.h);
  ctx.restore();

  ctx.save();
  ctx.globalAlpha = o;
  const bp = prog(t, 7.3, 8.5);
  pencil(ctx, rectPts(TK.x, TK.y, TK.w, TK.h), { seed: 40, t, width: 1.8, progress: bp });
  pencil(ctx, rectPts(TK.x + 14, TK.y + 14, TK.stubX - TK.x - 28, TK.h - 28), { seed: 41, t, width: 1.0, color: C.graphiteSoft, progress: bp });
  // 撕线
  ctx.save();
  ctx.setLineDash([7, 7]);
  pencil(ctx, [[TK.stubX, TK.y + 8], [TK.stubX, TK.y + TK.h - 8]], { seed: 42, t, width: 1.4, progress: bp, passes: 1, boil: false });
  ctx.restore();

  const tp = (a0, a1) => prog(t, a0, a1);
  typeText(ctx, 'ADMIT ONE', TK.x + 40, TK.y + 62, { font: FONT.type(24), color: C.brown, progress: tp(8.5, 8.9), seed: 51 });
  typeText(ctx, 'No. 0731542', TK.x + 600, TK.y + 62, { font: FONT.type(20), color: C.gray, progress: tp(8.6, 9.0), seed: 52, align: 'right' });
  ctx.globalAlpha = o * smooth(tp(8.7, 9.2));
  ctx.font = FONT.serif(46);
  ctx.fillStyle = C.ink;
  ctx.fillText('城南电影院', TK.x + 40, TK.y + 140);
  ctx.font = FONT.serif(22);
  ctx.fillStyle = C.brown;
  ctx.fillText('第 3 号厅 · 晚场', TK.x + 300, TK.y + 138);
  ctx.globalAlpha = o;
  pencil(ctx, [[TK.x + 40, TK.y + 166], [TK.x + 600, TK.y + 166]], { seed: 43, t, width: 1.1, color: C.graphiteSoft, progress: tp(8.8, 9.3) });

  // 座位：「12」单独绘制，之后会变成排队号码
  ctx.globalAlpha = o * smooth(tp(8.9, 9.4));
  ctx.font = FONT.serif(40);
  ctx.fillStyle = C.ink;
  const pre = '第 7 排   ';
  ctx.fillText(pre, TK.x + 40, SEAT.y);
  const w0 = ctx.measureText(pre).width;
  ctx.font = FONT.type(52);
  const w12 = ctx.measureText('12').width;
  SEAT.x = TK.x + 40 + w0 + w12 / 2;
  ctx.font = FONT.serif(40);
  ctx.fillText(' 座', TK.x + 40 + w0 + w12, SEAT.y);
  ctx.globalAlpha = o;
  typeText(ctx, '票价  ¥45.00', TK.x + 40, TK.y + 290, { font: FONT.type(28), color: C.ink, progress: tp(9.0, 9.6), seed: 53 });
  typeText(ctx, '19:30', TK.x + 600, TK.y + 290, { font: FONT.type(28), color: C.ink, progress: tp(9.1, 9.4), seed: 54, align: 'right' });

  // 副券
  ctx.globalAlpha = o * smooth(tp(8.8, 9.3));
  ctx.font = FONT.serif(22);
  ctx.fillStyle = C.brown;
  ctx.fillText('副 券', TK.stubX + 66, TK.y + 290);
  ctx.restore();
  ctx.restore();
}

// 检票印章：由杯口变形而来
function drawStamp(ctx, t, c) {
  const k = easeInOut(prog(t, 7.2, 8.7));
  if (t < 7.2) return;
  const fade = 1 - smooth(prog(t, 16.4, 17.2));
  const [sx, sy] = toScreen(c, STAMP.x, STAMP.y);
  const rim = glass.rimScreen(Math.min(t, 8.6));
  const x = lerp(rim.x, sx, k), y = lerp(rim.y, sy, k);
  const rx = lerp(rim.rx, STAMP.r * c.s, k), ry = lerp(rim.ry, STAMP.r * c.s, k);
  ctx.save();
  // 颜色：铅笔灰 → 暗红
  const col = k < 0.5 ? C.graphite : C.redSoft;
  ctx.globalAlpha = fade;
  sketchEllipse(ctx, x, y, rx, ry, { seed: 20, t, width: lerp(2.3, 3.2, k), color: col, alpha: k < 0.5 ? 1 - k * 0.6 : 0.4 + (k - 0.5) * 1.2 });
  // 内圈与印文
  const ik = smooth(prog(t, 8.5, 9.0));
  if (ik > 0) {
    sketchEllipse(ctx, x, y, rx * 0.8, ry * 0.8, { seed: 24, t, width: 1.6, color: C.redSoft, alpha: ik });
    ctx.globalAlpha = fade * ik * 0.85;
    ctx.fillStyle = C.red;
    ctx.font = FONT.serifBlack(30 * c.s);
    ctx.textAlign = 'center';
    ctx.fillText('已检', x, y + 11 * c.s);
    ctx.font = FONT.type(13 * c.s);
    ctx.fillText('19:30', x, y + 34 * c.s);
  }
  ctx.restore();
}

function drawClock(ctx, t, a) {
  const { x, y, r } = CLOCK;
  const dp = prog(t, 8.8, 9.7);
  if (dp <= 0) return;
  ctx.save();
  ctx.globalAlpha = a;
  ctx.save();
  ctx.globalAlpha = a * smooth(dp) * 0.85;
  ctx.fillStyle = '#ece2c9';
  ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
  sketchEllipse(ctx, x, y, r, r, { seed: 60, t, width: 2.2, progress: dp });
  sketchEllipse(ctx, x, y, r - 10, r - 10, { seed: 61, t, width: 1.0, color: C.graphiteSoft, progress: dp });
  for (let i = 0; i < 12; i++) {
    const an = (i / 12) * Math.PI * 2 - Math.PI / 2;
    const r0 = i % 3 === 0 ? r - 34 : r - 24;
    pencil(ctx, [[x + Math.cos(an) * r0, y + Math.sin(an) * r0], [x + Math.cos(an) * (r - 14), y + Math.sin(an) * (r - 14)]],
      { seed: 62 + i, t, width: i % 3 === 0 ? 2.4 : 1.3, progress: prog(t, 9.0 + i * 0.03, 9.3 + i * 0.03), passes: 1 });
  }
  // 已流逝的时间：排线扇形
  const m = minutes(t);
  const a0 = -Math.PI / 2, a1 = a0 + Math.min(m / 60, 0.999) * Math.PI * 2;
  if (m > 0.2) {
    hatch(ctx, (c) => { c.moveTo(x, y); c.arc(x, y, r - 16, a0, a1); c.closePath(); },
      [x - r, y - r, 2 * r, 2 * r], { seed: 70, t, gap: 8, angle: -0.8, color: 'rgba(90,70,50,0.45)', width: 1.2 });
  }
  // 指针
  const hm = a0 + (m / 60) * Math.PI * 2, hh = -Math.PI / 2 + ((19.5 + m / 60) / 12) * Math.PI * 2;
  pencil(ctx, [[x, y], [x + Math.cos(hh) * r * 0.48, y + Math.sin(hh) * r * 0.48]], { seed: 71, t, width: 4, color: C.ink, progress: prog(t, 9.2, 9.5), passes: 1, amp: 0.3 });
  pencil(ctx, [[x, y], [x + Math.cos(hm) * r * 0.78, y + Math.sin(hm) * r * 0.78]], { seed: 72, t, width: 2.4, color: C.ink, progress: prog(t, 9.2, 9.5), passes: 1, amp: 0.3 });
  ctx.fillStyle = C.ink;
  ctx.globalAlpha = a * smooth(prog(t, 9.2, 9.5));
  ctx.beginPath(); ctx.arc(x, y, 5, 0, Math.PI * 2); ctx.fill();

  // 刻度标签：20 / 40 / 60 分钟（每次变化重新打字）
  const shown = m < 30 ? 20 : m < 50 ? 40 : 60;
  const since = shown === 20 ? 9.6 : shown === 40 ? 11.6 : 13.9;
  if (t > 9.6) {
    const kk = prog(t, since, since + 0.25);
    ctx.globalAlpha = a;
    const tw = typeText(ctx, String(shown), x - 20, y + r + 70, { font: FONT.type(54), color: C.ink, progress: kk, seed: shown, align: 'right' });
    ctx.globalAlpha = a * smooth(kk);
    ctx.font = FONT.serif(30);
    ctx.fillStyle = C.brown;
    ctx.fillText('分钟', x - 10, y + r + 68);
  }
  ctx.restore();
}

function draw(ctx, t) {
  const c = cam(t);
  // 16.4s 起：除座位号外的一切淡出
  const fadeOthers = 1 - smooth(prog(t, 16.1, 16.9));
  ctx.save();
  camera(ctx, c.cx, c.cy, c.s);
  drawTicket(ctx, t, 1, fadeOthers);
  drawClock(ctx, t, fadeOthers);

  // 暗红手写批注：已经花掉的钱。
  if (t > 15.2) {
    ctx.save();
    ctx.globalAlpha = fadeOthers;
    pencil(ctx, [[505, 718], [470, 700], [452, 668], [448, 644]], { seed: 80, t, width: 1.8, color: C.redSoft, progress: prog(t, 15.2, 15.6) });
    pencil(ctx, [[440, 656], [448, 642], [458, 655]], { seed: 81, t, width: 1.8, color: C.redSoft, progress: prog(t, 15.5, 15.7) });
    handText(ctx, '已经花掉的钱。', 518, 738, { font: FONT.hand(46), color: C.red, progress: prog(t, 15.5, 16.4), rot: -0.02 });
    ctx.restore();
  }
  ctx.restore();

  drawStamp(ctx, t, c);
  drawSeatMorph(ctx, t, c);
}

// 座位号「12」：离开票面，飘到画面中央，变成排队号码（交给第三幕）
const SEAT_TARGET = { x: 960, y: 520, size: 128 };
function drawSeatMorph(ctx, t, c) {
  if (t < 8.9) return;
  const k = easeInOut(prog(t, 16.3, 17.3));
  const out = 1 - smooth(prog(t, 17.35, 17.6));
  if (out <= 0) return;
  // 票面上的位置（考虑票面旋转）
  const cxT = TK.x + TK.w / 2, cyT = TK.y + TK.h / 2;
  const dx = SEAT.x - cxT, dy = SEAT.y - cyT;
  const wx = cxT + dx * Math.cos(TK.rot) - dy * Math.sin(TK.rot);
  const wy = cyT + dx * Math.sin(TK.rot) + dy * Math.cos(TK.rot);
  const [sx, sy] = toScreen(c, wx, wy);
  const x = lerp(sx, SEAT_TARGET.x, k), y = lerp(sy, SEAT_TARGET.y - 6, k);
  const size = lerp(52 * c.s, SEAT_TARGET.size, k);
  ctx.save();
  ctx.globalAlpha = out * smooth(prog(t, 8.9, 9.4));
  ctx.translate(x, y);
  ctx.rotate(TK.rot * (1 - k));
  ctx.font = FONT.type(size);
  ctx.fillStyle = C.ink;
  ctx.textAlign = 'center';
  ctx.fillText('12', 0, 0);
  ctx.restore();
}

module.exports = { ...S, draw, SEAT_TARGET };
