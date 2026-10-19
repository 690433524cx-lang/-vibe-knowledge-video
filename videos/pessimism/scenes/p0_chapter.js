// 片头 · 片名（设计时间 -1.3 … 0，真实时间 0 … 1.3）：视频一打开，先单独看到「悲观主义」。
//   底是极暗、几乎看不清的聚会房间（同一个房间，只是压到接近黑），标题是绝对的视觉中心。
//   0.0–0.25 轻微淡入（从 40% 开始，第一帧就能看见） → 0.25–1.05 稳定停留 → 1.05–1.3 淡出，同时暗底撤掉，直接进入聚会。
//   大、清楚、暖白；字距略开；不描边、不发光、不弹跳、不缩放。片名只在这里出现一次。
const { W, H, LEAD } = require('../../../src/config');
const { FONT } = require('../../../src/lib/style');
const { prog, smooth, lerp } = require('../../../src/lib/util');

const S = { start: -LEAD, end: 0.001 };
const t0 = -LEAD;
function drawOver(ctx, t) {
  const r = t - t0;                                   // 片头内的时间（= 真实时间）
  const a = lerp(0.4, 1, smooth(prog(r, 0, 0.25))) * (1 - smooth(prog(r, 1.05, 1.3)));   // 第 0 帧就能看见标题，0.25 s 内到全亮
  const scrim = 1 - smooth(prog(r, 1.05, 1.3));
  ctx.save();
  // 把聚会房间压到接近黑：只剩极弱的轮廓和一点暖色
  ctx.fillStyle = `rgba(9,7,6,${0.9 * scrim})`;
  ctx.fillRect(0, 0, W, H);
  if (a > 0) {
    ctx.globalAlpha = a;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'alphabetic';
    ctx.font = FONT.serif(176);
    ctx.letterSpacing = '40px';
    ctx.fillStyle = '#efe4cf';
    ctx.fillText('悲观主义', W / 2 + 20, H / 2 + 52);
    ctx.font = FONT.en(24);
    ctx.letterSpacing = '16px';
    ctx.fillStyle = 'rgba(226,214,192,0.55)';
    ctx.fillText('PESSIMISM', W / 2 + 8, H / 2 + 132);
  }
  ctx.restore();
}
module.exports = { ...S, draw: () => {}, drawOver };
