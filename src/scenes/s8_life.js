// 第八幕 · 更多生活：道路压平成游戏存档的进度条（128 HOURS），
// 再变成半年的复习计划。最后五件「证据」并排，被同一根暗红线串起来。
const { W, H } = require('../config');
const { C, FONT } = require('../lib/style');
const { pencil, typeText, handText, hatch, rectPts, sketchEllipse } = require('../lib/draw');
const { prog, smooth, easeInOut, easeOut, lerp, clamp } = require('../lib/util');
const props = require('../lib/props');
const road = require('./s7_road');

const S = { start: 72.6, end: 82.8 };

const BAR = { x0: 560, x1: 1360, y0: 500, y1: 548 };
const CARD = { x: 960, y: 520, w: 1000, h: 450 };

// 路的两条边 → 进度条的上下边（屏幕坐标）
function barEdges(t) {
  const k = easeInOut(prog(t, 72.6, 73.6));
  const g = road.road(t);
  const c = road.cam(t);
  const toS = ([x, y]) => [W / 2 + (x - W / 2) * c.s, c.cy + (y - c.cy) * c.s];
  const L = road.edgePts(g.nl, g.cl, g.F).map(toS);
  const R = road.edgePts(g.nr, g.cr, g.F).map(toS);
  const n = L.length - 1;
  const top = L.map((p, i) => [lerp(p[0], lerp(BAR.x0, BAR.x1, i / n), k), lerp(p[1], BAR.y0, k)]);
  const bot = R.map((p, i) => [lerp(p[0], lerp(BAR.x0, BAR.x1, i / n), k), lerp(p[1], BAR.y1, k)]);
  return { top, bot, k };
}

const GAME_OUT = (t) => 1 - smooth(prog(t, 76.0, 76.6));
const PLAN_IN = (t) => smooth(prog(t, 76.2, 76.8));
const COLLAGE = (t) => easeInOut(prog(t, 79.5, 80.5));

function drawGame(ctx, t, a) {
  if (a <= 0) return;
  const tp = (a0, a1) => prog(t, a0, a1);
  const left = CARD.x - CARD.w / 2 + 70, top = CARD.y - CARD.h / 2;
  typeText(ctx, 'SAVE 03', left, top + 86, { font: FONT.type(32), color: C.ink, progress: tp(73.4, 73.8), seed: 801, alpha: a });
  typeText(ctx, '128 HOURS', CARD.x + CARD.w / 2 - 70, top + 104, { font: FONT.type(78), color: C.ink, progress: tp(73.6, 74.2), seed: 802, align: 'right', alpha: a });
  // 进度条填满
  const fill = easeOut(tp(73.5, 74.4));
  if (fill > 0) {
    hatch(ctx, (c) => c.rect(BAR.x0, BAR.y0, (BAR.x1 - BAR.x0) * fill, BAR.y1 - BAR.y0),
      [BAR.x0, BAR.y0, BAR.x1 - BAR.x0, BAR.y1 - BAR.y0], { seed: 803, t, gap: 7, angle: -1.0, color: 'rgba(40,32,26,0.7)', width: 1.4, alpha: a });
  }
  typeText(ctx, '100%', BAR.x1, BAR.y1 + 44, { font: FONT.type(24), color: C.gray, progress: tp(74.3, 74.5), seed: 804, align: 'right', alpha: a });
  ctx.save();
  ctx.globalAlpha *= a * smooth(tp(74.0, 74.5));
  ctx.font = FONT.serif(26);
  ctx.fillStyle = C.brown;
  ctx.fillText('最后一次打开：三个月前', left, BAR.y1 + 46);
  ctx.restore();
}

// 删除存档？ 是 / 否 —— 光标停在「是」上，又退了回去
function drawDialog(ctx, t) {
  const a = smooth(prog(t, 74.4, 74.8)) * (1 - smooth(prog(t, 75.9, 76.3)));
  if (a <= 0) return;
  const dx = 1110, dy = 700;
  ctx.save();
  ctx.globalAlpha *= a;
  ctx.translate(dx, dy);
  ctx.rotate(0.015);
  props.paper(ctx, 440, 170, { color: '#e6dcc4', shadow: 0.55 });
  ctx.font = FONT.serif(36);
  ctx.fillStyle = C.ink;
  ctx.textAlign = 'center';
  ctx.fillText('删除存档？', 0, -18);
  ctx.font = FONT.serif(30);
  ctx.fillText('是', -80, 54);
  ctx.fillText('否', 80, 54);
  pencil(ctx, rectPts(-130, 18, 100, 50), { seed: 810, t, width: 1.4, color: C.graphite, passes: 1 });
  pencil(ctx, rectPts(30, 18, 100, 50), { seed: 811, t, width: 1.4, color: C.graphite, passes: 1 });
  ctx.restore();
  // 光标
  const go = easeInOut(prog(t, 74.7, 75.2)), back = easeInOut(prog(t, 75.5, 76.1));
  const jit = Math.sin(t * 9) * 2 * (go - back > 0.9 ? 1 : 0);
  const cx = lerp(lerp(1560, dx - 70, go), 1520, back) + jit;
  const cy = lerp(lerp(900, dy + 50, go), 880, back);
  ctx.save();
  ctx.globalAlpha *= a;
  ctx.translate(cx, cy);
  ctx.fillStyle = '#efe6d2';
  ctx.strokeStyle = '#1b1512';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(0, 0); ctx.lineTo(0, 34); ctx.lineTo(9, 26); ctx.lineTo(16, 40); ctx.lineTo(22, 37); ctx.lineTo(15, 23); ctx.lineTo(26, 23); ctx.closePath();
  ctx.fill(); ctx.stroke();
  ctx.restore();
}

const MONTHS = ['一月', '二月', '三月', '四月', '五月', '六月'];
function drawPlan(ctx, t, a) {
  if (a <= 0) return;
  const left = CARD.x - CARD.w / 2 + 70, top = CARD.y - CARD.h / 2;
  ctx.save();
  ctx.globalAlpha *= a;
  ctx.font = FONT.serif(38);
  ctx.fillStyle = C.ink;
  ctx.fillText('复习计划 · 第 182 天', left, top + 88);
  ctx.restore();
  // 「方向？」——暗红的错误决策提示
  const qk = prog(t, 76.6, 77.2);
  if (qk > 0) {
    ctx.save();
    ctx.globalAlpha *= a;
    sketchEllipse(ctx, CARD.x + 320, top + 74, 118, 40, { seed: 820, t, width: 2, color: C.redSoft, progress: qk });
    handText(ctx, '方向？', CARD.x + 320, top + 92, { font: FONT.hand(44), color: C.red, progress: prog(t, 76.8, 77.3), align: 'center' });
    ctx.restore();
  }
  // 6 个月 × 4 周的格子，一格格打勾
  const gx = left + 10, gy = top + 160, cw = 140, ch = 56;
  const gk = prog(t, 76.3, 76.9);
  ctx.save();
  ctx.globalAlpha *= a;
  for (let i = 0; i <= 6; i++) pencil(ctx, [[gx + i * cw, gy], [gx + i * cw, gy + ch * 4]], { seed: 830 + i, t, width: 1, color: C.graphiteSoft, progress: gk, passes: 1 });
  for (let j = 0; j <= 4; j++) pencil(ctx, [[gx, gy + j * ch], [gx + cw * 6, gy + j * ch]], { seed: 840 + j, t, width: 1, color: C.graphiteSoft, progress: gk, passes: 1 });
  ctx.font = FONT.serif(22);
  ctx.fillStyle = C.brown;
  ctx.textAlign = 'center';
  MONTHS.forEach((m, i) => ctx.fillText(m, gx + i * cw + cw / 2, gy - 14));
  for (let i = 0; i < 24; i++) {
    const col = Math.floor(i / 4), row = i % 4;
    const at = 76.8 + i * 0.09;
    const p = prog(t, at, at + 0.12);
    if (p <= 0) continue;
    const x = gx + col * cw + cw / 2 - 14, y = gy + row * ch + ch / 2;
    pencil(ctx, [[x, y], [x + 9, y + 10], [x + 28, y - 12]], { seed: 850 + i, t, width: 2.2, color: C.ink, progress: p, passes: 1 });
  }
  ctx.restore();
}

// 五件证据并排，暗红线串起来
const FIVE = [
  { kind: 'game', x: 330, y: 480, w: 300, h: 140, rot: -0.04 },
  { kind: 'plan', x: 660, y: 610, w: 300, h: 150, rot: 0.03 },
  { kind: 'ticket', x: 980, y: 420, w: 300, h: 122, rot: -0.03 },
  { kind: 'slip', x: 1290, y: 600, w: 120, h: 184, rot: 0.04 },
  { kind: 'photo', x: 1590, y: 450, w: 220, h: 168, rot: 0.05 },
];

function miniGame(ctx, w, h) {
  props.paper(ctx, w, h, { color: '#e3d8bf' });
  ctx.font = FONT.type(30);
  ctx.fillStyle = C.ink;
  ctx.textAlign = 'right';
  ctx.fillText('128 HOURS', w / 2 - 18, -h / 2 + 46);
  ctx.textAlign = 'left';
  ctx.fillStyle = 'rgba(40,32,26,0.6)';
  ctx.fillRect(-w / 2 + 18, 6, w - 36, 22);
  ctx.strokeStyle = C.graphite;
  ctx.strokeRect(-w / 2 + 18, 6, w - 36, 22);
}
function miniPlan(ctx, w, h) {
  props.paper(ctx, w, h, { color: '#e3d8bf' });
  ctx.strokeStyle = C.graphiteSoft;
  ctx.lineWidth = 1;
  for (let i = 0; i <= 6; i++) { ctx.beginPath(); ctx.moveTo(-w / 2 + 18 + i * (w - 36) / 6, -h / 2 + 40); ctx.lineTo(-w / 2 + 18 + i * (w - 36) / 6, h / 2 - 14); ctx.stroke(); }
  for (let j = 0; j <= 4; j++) { ctx.beginPath(); ctx.moveTo(-w / 2 + 18, -h / 2 + 40 + j * (h - 54) / 4); ctx.lineTo(w / 2 - 18, -h / 2 + 40 + j * (h - 54) / 4); ctx.stroke(); }
  ctx.font = FONT.serif(18);
  ctx.fillStyle = C.ink;
  ctx.fillText('复习计划 · 182 天', -w / 2 + 18, -h / 2 + 28);
}

function drawCollage(ctx, t) {
  const k = COLLAGE(t);
  if (k <= 0) return;
  const out = 1 - smooth(prog(t, 81.9, 82.6));
  FIVE.forEach((it, i) => {
    const a = smooth(prog(t, 79.6 + i * 0.12, 80.2 + i * 0.12)) * out;
    if (a <= 0) return;
    // 81.9 起：五件东西向中心收拢（交给第九幕变成决策卡）
    const m = easeInOut(prog(t, 81.9, 82.6));
    ctx.save();
    ctx.globalAlpha *= a;
    ctx.translate(lerp(it.x, 960, m), lerp(it.y, 500, m));
    ctx.rotate(it.rot * (1 - m));
    ctx.scale(lerp(1, 0.4, m), lerp(1, 0.4, m));
    if (it.kind === 'game') miniGame(ctx, it.w, it.h);
    if (it.kind === 'plan') miniPlan(ctx, it.w, it.h);
    if (it.kind === 'ticket') props.ticket(ctx, it.w, it.h, { t });
    if (it.kind === 'slip') props.slip(ctx, it.w, it.h, { t });
    if (it.kind === 'photo') props.photo(ctx, it.w, it.h, { t, fade: 0.3 });
    ctx.restore();
  });
  const tk = prog(t, 80.3, 81.4);
  if (tk > 0) {
    const pts = [];
    FIVE.forEach((it, i) => {
      const p = [it.x, it.y - it.h / 2 - 4];
      if (i) {
        const q = [FIVE[i - 1].x, FIVE[i - 1].y - FIVE[i - 1].h / 2 - 4];
        for (let s = 1; s <= 12; s++) {
          const f = s / 12;
          pts.push([lerp(q[0], p[0], f), lerp(q[1], p[1], f) + Math.sin(f * Math.PI) * 18]);
        }
      } else pts.push(p);
    });
    pencil(ctx, pts, { seed: 870, t, width: 2.2, color: C.subRed, progress: tk, alpha: out, passes: 1 });
    FIVE.forEach((it) => {
      ctx.save();
      ctx.globalAlpha *= out * smooth(tk * 3);
      ctx.fillStyle = '#6e1f19';
      ctx.beginPath(); ctx.arc(it.x, it.y - it.h / 2 - 4, 6, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
    });
  }
}

function draw(ctx, t) {
  const e = barEdges(t);
  const cardA = smooth(prog(t, 73.2, 73.8)) * (1 - COLLAGE(t));
  // 卡片
  if (cardA > 0) {
    ctx.save();
    ctx.globalAlpha *= cardA;
    ctx.translate(CARD.x, CARD.y);
    props.paper(ctx, CARD.w, CARD.h, { color: '#dcd0b5' });
    ctx.restore();
  }
  // 两条边：亮线（路）→ 墨线（进度条）
  const barA = 1 - PLAN_IN(t);
  if (barA > 0) {
    const inkK = smooth(prog(t, 73.2, 73.8));
    ctx.save();
    ctx.globalAlpha *= barA;
    for (const [pts, sd] of [[e.top, 880], [e.bot, 881]]) {
      pencil(ctx, pts, { seed: sd, t, width: 2.2, color: C.light, alpha: 1 - inkK });
      pencil(ctx, pts, { seed: sd + 2, t, width: 2.2, color: C.ink, alpha: inkK });
    }
    if (e.k >= 1) {
      pencil(ctx, [[BAR.x0, BAR.y0], [BAR.x0, BAR.y1]], { seed: 884, t, width: 2.2, color: C.ink, alpha: smooth(prog(t, 73.4, 73.7)) });
      pencil(ctx, [[BAR.x1, BAR.y0], [BAR.x1, BAR.y1]], { seed: 885, t, width: 2.2, color: C.ink, alpha: smooth(prog(t, 73.4, 73.7)) });
    }
    ctx.restore();
  }
  ctx.save();
  ctx.globalAlpha *= 1 - COLLAGE(t);
  drawGame(ctx, t, GAME_OUT(t) * cardA);
  drawDialog(ctx, t);
  drawPlan(ctx, t, PLAN_IN(t));
  ctx.restore();
  drawCollage(ctx, t);
}

function light(t) {
  const k = COLLAGE(t);
  const m = easeInOut(prog(t, 81.9, 82.6));
  return {
    x: 960, y: lerp(520, 520, k), rx: lerp(lerp(860, 1150, k), 820, m), ry: lerp(lerp(470, 520, k), 480, m), i: 1,
    w: smooth(prog(t, 72.8, 73.6)),
  };
}

module.exports = { ...S, draw, light };
