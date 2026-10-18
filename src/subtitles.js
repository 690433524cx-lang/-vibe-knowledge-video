// 全片字幕表（设计时间，DESIGN_T = 50）。
// 渲染时传入的是设计时间，所以改 T 后字幕会跟随时间轴自动移动。
//
// style:
//   sub    — 下方安全区，正文宋体
//   emph   — 下方安全区，略放大（只给少数关键句）
//   hand   — 手写体，像在档案上随手写下
//   anchor — 毛笔楷「舍不得」的第一次轻声出现（不放大）
// 文本中用 {…} 包住的部分以暗红强调；y / fi 可单独覆盖位置与淡入时长
//   center — 画面中央，大号宋体（只给「回不来。」）
const { W } = require('./config');
const { FONT, C } = require('./lib/style');
const { prog, smooth, easeOut } = require('./lib/util');

const SUBS = [
  // 第一幕 · 钩子：开场 0.3 秒直接抛出问题（两行同屏，第二行更大、更重）
  { t: 0.3, d: 4.2, text: '明知道已经不值得了——', y: 900, fi: 0.9 },
  { t: 1.7, d: 2.8, text: '你为什么还是{舍不得}停？', style: 'emph', y: 990, fi: 0.7 },
  { t: 5.0, d: 1.1, text: '钱是这样。' },
  { t: 6.5, d: 1.3, text: '时间也是这样。' },
  // 第二幕 · 钱
  { t: 9.2, d: 1.7, text: '电影不好看。' },
  { t: 11.4, d: 1.7, text: '可票都买了。' },
  { t: 13.6, d: 1.8, text: '再看一会吧。' },
  // 第三幕 · 时间
  { t: 19.2, d: 2.1, text: '已经排了四十分钟。' },
  { t: 21.8, d: 1.2, text: '现在走。' },
  { t: 23.4, d: 1.7, text: '好像更亏。' },
  // 第四幕 · 感情
  { t: 29.4, d: 1.8, text: '在一起三年了。' },
  { t: 31.7, d: 1.7, text: '都走到这里了。' },
  { t: 33.9, d: 1.7, text: '再试一次吧。' },
  { t: 36.2, d: 1.5, text: '舍不得。', style: 'anchor' },
  { t: 38.1, d: 1.8, text: '已经不只是钱了。' },
  // 第五幕 · 共性
  { t: 42.2, d: 1.8, text: '你以为自己在珍惜。' },
  { t: 44.5, d: 1.3, text: '但很多时候。' },
  { t: 46.3, d: 2.0, text: '你只是不甘心。' },
  // T-1.0 … T+2.0：无字幕（高潮窗口）
  // 第六幕 · 解释（T+2.0 起）
  { t: 52.6, d: 1.2, text: '已经花掉的钱。' },
  { t: 53.9, d: 1.2, text: '已经付出的时间。' },
  { t: 55.2, d: 1.2, text: '已经投入的感情。' },
  { t: 56.6, d: 1.4, text: '它们有一个共同点。' },
  { t: 58.2, d: 1.5, text: '回不来。', style: 'center' },
  { t: 59.9, d: 1.3, text: '可我们最容易犯的错，' },
  { t: 61.4, d: 1.6, text: '就是让这些回不来的东西——' },
  { t: 63.2, d: 1.5, text: '继续替现在做决定。' },
  // 第七幕 · 走错的路
  { t: 65.4, d: 1.3, text: '走错十公里以后，' },
  { t: 66.9, d: 1.6, text: '最危险的想法不是回头。' },
  { t: 68.7, d: 1.4, text: '都走这么远了。', style: 'hand' },
  { t: 70.3, d: 1.4, text: '那就继续走吧。' },
  // 第八幕 · 更多生活
  { t: 72.4, d: 1.5, text: '玩了100多个小时的游戏，' },
  { t: 74.1, d: 1.9, text: '已经不好玩了，可还是不想删。' },
  { t: 76.2, d: 1.0, text: '选错了方向，' },
  { t: 77.4, d: 2.0, text: '却因为已经努力半年，更不敢换。' },
  { t: 79.6, d: 1.9, text: '形式不一样，逻辑却一样。' },
  // 第九幕 · 真正该问的问题
  { t: 82.4, d: 1.0, text: '真正该问的，' },
  { t: 83.6, d: 1.8, text: '从来不是「我已经花了多少」。' },
  { t: 85.6, d: 2.4, text: '而是：从现在开始，还值不值得。', style: 'emph' },
  // 第十幕 · 方法（卡片背面的问句由场景绘制，这里只放收束句）
  { t: 93.6, d: 1.3, text: '如果答案已经变了，' },
  { t: 95.1, d: 1.5, text: '也许你不是突然放弃。' },
  { t: 96.8, d: 1.8, text: '你只是终于开始看现在。' },
  // 尾声 · 问题（由场景绘制在画面中央，不走字幕层）
];

const BASE_Y = 968;

// 解析 {…} 强调片段
function segments(text) {
  const out = [];
  const re = /\{([^}]*)\}/g;
  let last = 0, m;
  while ((m = re.exec(text))) {
    if (m.index > last) out.push([text.slice(last, m.index), false]);
    out.push([m[1], true]);
    last = m.index + m[0].length;
  }
  if (last < text.length) out.push([text.slice(last), false]);
  return out;
}

function fillSegments(ctx, segs, cx, y, base, accent) {
  const widths = segs.map(([s]) => ctx.measureText(s).width);
  let x = cx - widths.reduce((a, b) => a + b, 0) / 2;
  ctx.textAlign = 'left';
  segs.forEach(([s, red], i) => {
    ctx.fillStyle = red ? accent : base;
    ctx.fillText(s, x, y);
    x += widths[i];
  });
}

function drawLine(ctx, s, a, k) {
  const style = s.style || 'sub';
  ctx.save();
  ctx.textBaseline = 'alphabetic';
  const rise = (1 - easeOut(k)) * 8;
  const segs = segments(s.text);
  if (style === 'center') {
    ctx.font = FONT.serifBlack(96);
    ctx.globalAlpha = a;
    ctx.shadowColor = 'rgba(0,0,0,0.9)';
    ctx.shadowBlur = 24;
    fillSegments(ctx, segs, W / 2, (s.y ?? 575) + rise, C.sub, C.subRed);
  } else {
    let font = FONT.serif(52), color = C.sub, y = s.y ?? BASE_Y;
    if (style === 'emph') font = FONT.serif(66);
    if (style === 'hand') { font = FONT.hand(72); color = C.subRed; }
    if (style === 'anchor') { font = FONT.brush(84); y += 6; }
    ctx.font = font;
    // 深色柔影，保证压在亮处时仍然清楚
    ctx.shadowColor = 'rgba(0,0,0,0.85)';
    ctx.shadowBlur = 18;
    ctx.globalAlpha = a;
    if (style === 'hand') {
      const w = ctx.measureText(s.text).width;
      ctx.beginPath();
      ctx.rect(W / 2 - w / 2 - 10, y - 120, (w + 20) * Math.min(1, k * 1.6), 180);
      ctx.clip();
    }
    fillSegments(ctx, segs, W / 2, y + rise, color, C.subRed);
    ctx.shadowBlur = 0;
    fillSegments(ctx, segs, W / 2, y + rise, color, C.subRed);
  }
  ctx.restore();
}

// t 为设计时间
function drawSubtitles(ctx, t) {
  for (const s of SUBS) {
    const fi = s.fi ?? 0.28, fo = 0.3;
    if (t < s.t || t > s.t + s.d + fo) continue;
    const a = smooth(prog(t, s.t, s.t + fi)) * (1 - smooth(prog(t, s.t + s.d, s.t + s.d + fo)));
    drawLine(ctx, s, a, prog(t, s.t, s.t + Math.max(0.6, fi)));
  }
}

module.exports = { SUBS, drawSubtitles };
