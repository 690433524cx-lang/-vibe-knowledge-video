// 第九幕 · 真正该问的问题：五件证据收拢成一张决策卡。
// 「我已经投入多少？」被一根铅笔线克制地划掉；下面留下「从现在开始，还值得吗？」
// 第十幕 · 一个能用的方法：卡片翻到背面——「如果今天才第一次遇见它——」
const { W, H } = require('../config');
const { C, FONT } = require('../lib/style');
const { pencil, typeText } = require('../lib/draw');
const { prog, smooth, easeInOut, easeOut, lerp } = require('../lib/util');
const props = require('../lib/props');

const S = { start: 82.1, end: 99.4 };
const CARD = { x: 960, y: 500, w: 980, h: 560 };

const L1 = '我已经投入多少？';
const L2 = '从现在开始，还值得吗？';
const BACK = [
  { text: '如果今天才第一次遇见它——', at: 89.7, y: -96, size: 46 },
  { text: '你还会买吗？', at: 90.9, y: 6, size: 50, icon: 'ticket' },
  { text: '你还会等吗？', at: 91.8, y: 96, size: 50, icon: 'slip' },
  { text: '你还会继续吗？', at: 92.7, y: 186, size: 50, icon: 'photo' },
];

// 镜头：极慢推近
function camS(t) { return lerp(1, 1.05, smooth(prog(t, 83, 99))); }

function front(ctx, t) {
  const left = -CARD.w / 2 + 110;
  typeText(ctx, 'DECISION CARD  ·  NO. 07', left, -CARD.h / 2 + 62, { font: FONT.type(20), color: C.gray, progress: prog(t, 82.7, 83.1), seed: 901 });
  typeText(ctx, L1, left, -40, { font: FONT.serif(58), color: C.ink, progress: prog(t, 83.0, 83.6), seed: 902 });
  // 划掉：一根克制的铅笔线
  ctx.font = FONT.serif(58);
  const w1 = ctx.measureText(L1).width;
  pencil(ctx, [[left - 8, -58], [left + w1 * 0.5, -61], [left + w1 + 10, -57]], { seed: 903, t, width: 3, color: C.graphite, progress: easeInOut(prog(t, 84.7, 85.25)), amp: 0.8 });
  typeText(ctx, L2, left, 110, { font: FONT.serif(58), color: C.ink, progress: prog(t, 85.4, 86.1), seed: 904 });
  // 暗红关键划线
  const w2 = ctx.measureText(L2).width;
  pencil(ctx, [[left - 4, 134], [left + w2 + 6, 131]], { seed: 905, t, width: 2.6, color: C.red, progress: easeInOut(prog(t, 86.5, 87.2)), passes: 1 });
}

function back(ctx, t) {
  const left = -CARD.w / 2 + 110;
  ctx.save();
  ctx.globalAlpha *= smooth(prog(t, 89.2, 89.6));
  ctx.font = FONT.serif(32);
  ctx.fillStyle = C.brown;
  ctx.fillText('一个简单的问题', left, -CARD.h / 2 + 80);
  ctx.restore();
  for (const l of BACK) {
    const k = smooth(prog(t, l.at, l.at + 0.6));
    if (k <= 0) continue;
    const x = l.icon ? left + 100 : left;
    ctx.save();
    ctx.globalAlpha *= k;
    ctx.translate(0, (1 - easeOut(k)) * 8);
    ctx.font = FONT.serif(l.size);
    ctx.fillStyle = C.ink;
    ctx.fillText(l.text, x, l.y);
    if (l.icon) {
      ctx.translate(left + 36, l.y - 16);
      if (l.icon === 'ticket') { ctx.rotate(-0.06); props.ticket(ctx, 104, 44, { t }); }
      if (l.icon === 'slip') { ctx.rotate(0.05); props.slip(ctx, 46, 70, { t }); }
      if (l.icon === 'photo') { ctx.rotate(0.06); props.photo(ctx, 78, 60, { t, crease: false }); }
    }
    ctx.restore();
  }
  // 「你只是终于开始看现在。」——在「今天」下面划一道暗红
  const uk = easeInOut(prog(t, 96.9, 97.5));
  if (uk > 0) {
    ctx.font = FONT.serif(46);
    const pre = ctx.measureText('如果').width, w = ctx.measureText('今天').width;
    pencil(ctx, [[left + pre - 2, -80], [left + pre + w + 4, -82]], { seed: 910, t, width: 2.8, color: C.red, progress: uk, passes: 1 });
  }
}

function draw(ctx, t) {
  // 82.2 起：卡片从五件证据收拢的中心长出来
  const g = easeOut(prog(t, 82.2, 82.9));
  // 88.5–89.3：纸张翻面（只做水平压扁，不做 3D 旋转）
  const f = prog(t, 88.5, 89.3);
  const sx = Math.abs(Math.cos(easeInOut(f) * Math.PI));
  const isBack = f >= 0.5;
  // 99.0 起交给尾声：内容先淡出
  const contentA = 1 - smooth(prog(t, 98.8, 99.3));
  const cardA = t < 99.35 ? 1 : 0; // 之后由尾声的门接管同一个矩形
  const s = camS(t) * lerp(0.4, 1, g);
  ctx.save();
  ctx.globalAlpha *= smooth(prog(t, 82.2, 82.6)) * cardA;
  ctx.translate(CARD.x, CARD.y);
  ctx.scale(s * Math.max(0.02, sx), s);
  props.card(ctx, CARD.w, CARD.h, { color: isBack ? '#e1d6bc' : '#dfd3b8' });
  // 翻面时的明暗
  if (f > 0 && f < 1) {
    ctx.fillStyle = `rgba(30,20,12,${(1 - sx) * 0.35})`;
    ctx.fillRect(-CARD.w / 2, -CARD.h / 2, CARD.w, CARD.h);
  }
  ctx.globalAlpha *= contentA;
  if (isBack) back(ctx, t); else front(ctx, t);
  ctx.restore();
}

function light(t) {
  return { x: 960, y: 500, rx: lerp(820, 860, smooth(prog(t, 88, 90))), ry: 500, i: 1, w: smooth(prog(t, 82.0, 82.6)) * (1 - smooth(prog(t, 99.0, 99.4))) };
}

module.exports = { ...S, draw, light, CARD, camS };
