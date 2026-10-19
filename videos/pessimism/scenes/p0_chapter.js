// 片名：第 0.95–2.6 秒，「悲观主义」像电影片名一样叠在热闹的聚会上（完全可见约 1.15 s）。
// 大，但克制：暖白、字距很开、常规字重的宋体；不发光、不描边、不缩放、不飞入，只是淡入淡出。
// 画面中央只压一层极淡的暗，让字在灯串和人群上也读得清；故事不停，人还在笑。
const { W, H } = require('../../../src/config');
const { FONT } = require('../../../src/lib/style');
const { prog, smooth } = require('../../../src/lib/util');

const S = { start: 0.9, end: 2.7 };
function drawOver(ctx, t) {
  const a = smooth(prog(t, 0.95, 1.2)) * (1 - smooth(prog(t, 2.35, 2.62)));
  if (a <= 0) return;
  ctx.save();
  // 极淡的暗：只在字的周围
  const g = ctx.createRadialGradient(W / 2, 455, 60, W / 2, 455, 720);
  g.addColorStop(0, `rgba(10,8,6,${0.3 * a})`); g.addColorStop(1, 'rgba(10,8,6,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
  ctx.globalAlpha = a;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';
  // 一点点很近的暗影，只为把字从亮处分开（不是光晕）
  ctx.shadowColor = 'rgba(0,0,0,0.35)'; ctx.shadowBlur = 6; ctx.shadowOffsetY = 2;
  ctx.font = FONT.body(138);
  ctx.letterSpacing = '46px';
  ctx.fillStyle = '#efe5d2';
  ctx.fillText('悲观主义', W / 2 + 23, 505);
  ctx.font = FONT.en(22);
  ctx.letterSpacing = '14px';
  ctx.fillStyle = 'rgba(232,220,198,0.66)';
  ctx.fillText('PESSIMISM', W / 2 + 7, 572);
  ctx.restore();
}
module.exports = { ...S, draw: () => {}, drawOver };
