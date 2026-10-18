// 第五幕 · 共性：照片的白边长成一张档案页。电影票、取号单、旧照片并排别在纸上，
// 一根暗红细线把它们串起来。T-1.0 起开始减少信息，最后只剩一根拉紧的线。
const { W, H, DESIGN_T: D } = require('../config');
const { C, FONT } = require('../lib/style');
const { pencil, typeText } = require('../lib/draw');
const { prog, smooth, easeInOut, easeOut, lerp, clamp, noise1 } = require('../lib/util');
const props = require('../lib/props');
const { PAGE } = require('./s4_table');

const S = { start: 40.15, end: D - 1e-6 };

const ITEMS = [
  { kind: 'ticket', x: 600, y: 505, w: 330, h: 134, rot: -0.05, pin: [520, 450], label: '钱', lt: 41.2, at: 40.2 },
  { kind: 'slip', x: 960, y: 500, w: 150, h: 230, rot: 0.03, pin: [960, 398], label: '时间', lt: 41.8, at: 40.35 },
  { kind: 'photo', x: 1320, y: 505, w: 236, h: 180, rot: 0.05, pin: [1310, 428], label: '感情', lt: 42.4, at: 40.5 },
];
const LINE_A = [380, 540], LINE_B = [1540, 540];

// 镜头：缓慢推近，T-1.4 前减速停下
function cam(t) {
  const k = easeInOut(prog(t, 40.6, D - 1.4));
  return lerp(1, 1.06, k);
}
function withCam(ctx, t, fn) {
  const s = cam(t);
  ctx.save();
  ctx.translate(W / 2, 520);
  ctx.scale(s, s);
  ctx.translate(-W / 2, -520);
  fn();
  ctx.restore();
}

// 线的松紧：铺开时有下垂，「不甘心」时拉紧
function sag(t) {
  return lerp(lerp(34, 10, smooth(prog(t, 44.0, 44.6))), 2, smooth(prog(t, 46.3, 47.4)));
}

function threadPts(t) {
  const sg = sag(t);
  const pts = [];
  for (let i = 0; i < 2; i++) {
    const a = ITEMS[i].pin, b = ITEMS[i + 1].pin;
    for (let k = i ? 1 : 0; k <= 20; k++) {
      const f = k / 20;
      pts.push([lerp(a[0], b[0], f), lerp(a[1], b[1], f) + Math.sin(f * Math.PI) * sg]);
    }
  }
  return pts;
}

// T-1.0 → T-0.35：三件证物的线被拉直成「过去 —— 现在」
function straightPts(t) {
  const src = threadPts(t);
  const k = easeInOut(prog(t, D - 1.0, D - 0.35));
  // 颤动：T-0.5 起增大，T-0.15 起完全停住
  const amp = smooth(prog(t, D - 0.5, D - 0.2)) * 5 * (t < D - 0.15 ? 1 : 0);
  return src.map((p, i) => {
    const f = i / (src.length - 1);
    const tx = lerp(LINE_A[0], LINE_B[0], f), ty = LINE_A[1];
    const tremble = amp * Math.sin(f * Math.PI) * noise1(t * 38 + i * 0.7, 9);
    return [lerp(p[0], tx, k), lerp(p[1], ty, k) + tremble];
  });
}

function drawItem(ctx, t, it, a) {
  const k = smooth(prog(t, it.at, it.at + 0.6));
  if (k <= 0) return;
  ctx.save();
  ctx.globalAlpha = a * k;
  ctx.translate(it.x, it.y + (1 - easeOut(k)) * -16);
  ctx.rotate(it.rot);
  if (it.kind === 'ticket') props.ticket(ctx, it.w, it.h, { t });
  if (it.kind === 'slip') props.slip(ctx, it.w, it.h, { t });
  if (it.kind === 'photo') props.photo(ctx, it.w, it.h, { t, fade: 0.4 });
  ctx.restore();
  // 图钉
  ctx.save();
  ctx.globalAlpha = a * k;
  ctx.fillStyle = '#6e1f19';
  ctx.beginPath(); ctx.arc(it.pin[0], it.pin[1], 6, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = 'rgba(255,230,210,0.5)';
  ctx.beginPath(); ctx.arc(it.pin[0] - 2, it.pin[1] - 2, 2, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
  // 证物标签（宋体，像档案上的分类签）
  const lk = smooth(prog(t, it.lt, it.lt + 0.4));
  if (lk > 0) {
    ctx.save();
    ctx.globalAlpha = a * lk;
    ctx.font = FONT.serif(38);
    ctx.fillStyle = C.brown;
    ctx.textAlign = 'center';
    ctx.fillText(it.label, it.x, 700 + (1 - lk) * 6);
    ctx.restore();
  }
}

function draw(ctx, t, env) {
  // T-1.0 起：证物失去颜色并淡出；页面退回黑暗
  const gray = smooth(prog(t, D - 1.0, D - 0.6));
  const itemsA = 1 - smooth(prog(t, D - 0.95, D - 0.45));
  const pageA = 1 - smooth(prog(t, D - 0.85, D - 0.4));
  withCam(ctx, t, () => {
    if (pageA > 0 && t >= 40.45) {
      ctx.save();
      ctx.globalAlpha = pageA;
      ctx.translate(PAGE.x, PAGE.y);
      props.paper(ctx, PAGE.w, PAGE.h, { color: '#d9cdb1' });
      ctx.restore();
      typeText(ctx, 'CASE 07', PAGE.x - PAGE.w / 2 + 60, PAGE.y - PAGE.h / 2 + 72, { font: FONT.type(28), color: C.ink, progress: prog(t, 40.6, 41.0), seed: 601, alpha: pageA });
      typeText(ctx, 'EXHIBITS A — C', PAGE.x + PAGE.w / 2 - 60, PAGE.y - PAGE.h / 2 + 72, { font: FONT.type(18), color: C.gray, progress: prog(t, 40.8, 41.3), seed: 602, align: 'right', alpha: pageA });
      pencil(ctx, [[PAGE.x - PAGE.w / 2 + 60, PAGE.y - PAGE.h / 2 + 92], [PAGE.x + PAGE.w / 2 - 60, PAGE.y - PAGE.h / 2 + 92]],
        { seed: 603, t, width: 1, color: C.graphiteSoft, alpha: pageA, progress: prog(t, 40.6, 41.2) });
    }
    if (itemsA > 0) {
      ctx.save();
      if (gray > 0) ctx.filter = `grayscale(${gray.toFixed(2)})`;
      for (const it of ITEMS) drawItem(ctx, t, it, itemsA);
      ctx.restore();
    }
    // 暗红细线
    const dk = prog(t, 42.4, 44.0);
    if (dk > 0) {
      const pts = t < D - 1.0 ? threadPts(t) : straightPts(t);
      if (t < D - 0.85) pencil(ctx, pts, { seed: 610, t, width: 2.4, color: C.subRed, progress: dk, amp: 0.5, passes: 1, boil: t < D - 0.15 });
    }
  });
  void env;
}

// T-0.85 起页面退回黑暗：只剩的那根线画在光照层之上，保证在收暗时依然清楚
function drawOver(ctx, t) {
  if (t < D - 0.85) return;
  withCam(ctx, t, () => {
    {
      const pts = straightPts(t);
      ctx.save();
      ctx.shadowColor = 'rgba(210,80,60,0.45)';
      ctx.shadowBlur = 10;
      pencil(ctx, pts, { seed: 610, t, width: 3, color: '#cf5e4d', amp: 0.5, passes: 1, boil: t < D - 0.15 });
      ctx.restore();
      // 过去 / 现在
      const lk = smooth(prog(t, D - 0.75, D - 0.4));
      if (lk > 0) {
        ctx.save();
        ctx.globalAlpha = lk * 0.9;
        ctx.font = FONT.serif(28);
        ctx.fillStyle = C.lightText;
        ctx.textAlign = 'center';
        ctx.fillText('过去', LINE_A[0], LINE_A[1] + 56);
        ctx.fillText('现在', LINE_B[0], LINE_B[1] + 56);
        ctx.restore();
      }
    }
  });
}

function light(t) {
  const k = easeInOut(prog(t, D - 1.0, D - 0.4));
  return {
    x: 960, y: lerp(520, 545, k), rx: lerp(900, 780, k), ry: lerp(500, 240, k), i: lerp(1, 0.72, k),
    w: smooth(prog(t, 40.3, 40.6)),
  };
}

module.exports = { ...S, draw, drawOver, light, LINE_A, LINE_B, straightPts };
