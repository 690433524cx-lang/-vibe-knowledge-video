// 章节标题：第 2.2–3.9 秒，左上角很小的「悲观主义」，像一本书的章节名。不挡开头，不做片头。
const { FONT } = require('../../../src/lib/style');
const { prog, smooth } = require('../../../src/lib/util');

const S = { start: 2.0, end: 4.2 };
function drawOver(ctx, t) {
  const a = smooth(prog(t, 2.2, 2.55)) * (1 - smooth(prog(t, 3.6, 3.95)));
  if (a <= 0) return;
  ctx.save();
  ctx.globalAlpha = a * 0.88;
  ctx.shadowColor = 'rgba(0,0,0,0.6)'; ctx.shadowBlur = 10;
  ctx.font = FONT.serif(40);
  ctx.letterSpacing = '16px';
  ctx.fillStyle = '#ebe1cc';
  ctx.fillText('悲观主义', 118, 128);
  ctx.font = FONT.en(17);
  ctx.letterSpacing = '9px';
  ctx.fillStyle = 'rgba(226,214,192,0.7)';
  ctx.fillText('PESSIMISM', 120, 164);
  ctx.restore();
}
module.exports = { ...S, draw: () => {}, drawOver };
