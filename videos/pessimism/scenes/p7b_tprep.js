// MAIN_BEAT_T 之前（新时间轴，随 MAIN_BEAT_T 移动）：繁杂 → 迅速清空 → 接近静止 → 「最坏」。
//   T-1.6 起地图上浮起越来越多的词（14 个，越来越挤，但每个都还读得出来），地图一点点暗下去；
//   T-0.75 有重量地往中央聚拢；T-0.55 → T-0.42 一下子全部收掉，画面清空；
//   T-0.42 → T 约 0.4 秒接近静止的暗（引擎的 PRE_T_DARK 同时压暗），给《千年之后》的换气留空间。
const { W, H, DESIGN_T: D } = require('../../../src/config');
const { FONT } = require('../../../src/lib/style');
const { prog, smooth, lerp, rng, easeIn } = require('../../../src/lib/util');

const WORDS = ['失败', '失去', '结束', '拒绝', '来不及', '不会成功', '被讨厌', '一个人', '失败', '拒绝', '来不及', '结束', '失去', '不会成功'];
const R = rng(778);
const FLOAT = WORDS.map((w, i) => ({ w, x: 240 + R() * 1440, y: 200 + R() * 560, at: D - 1.6 + i * 0.06, size: 46 + R() * 34, rot: (R() - 0.5) * 0.22 }));

function drawOver(ctx, t) {
  if (t >= D) return;
  // 地图暗下去；T-0.55 起迅速清成全暗
  const dim = 0.45 * smooth(prog(t, D - 1.6, D - 0.75)) + 0.55 * smooth(prog(t, D - 0.55, D - 0.42));
  if (dim > 0) { ctx.fillStyle = `rgba(7,6,5,${dim})`; ctx.fillRect(0, 0, W, H); }
  const clear = smooth(prog(t, D - 0.55, D - 0.42));
  if (clear >= 0.999) return;
  for (const f of FLOAT) {
    const a = smooth(prog(t, f.at, f.at + 0.18));
    if (a <= 0.01) continue;
    const rise = (Math.min(t, D - 0.75) - f.at) * 34;
    const pull = easeIn(prog(t, D - 0.75, D - 0.55));
    const x = lerp(f.x, 960 + (f.x - 960) * 0.28, pull), y = lerp(f.y - rise, 470 + (f.y - 480) * 0.28, pull);
    const size = f.size * lerp(1, 0.85, pull) * (1 - clear * 0.7);
    ctx.save();
    ctx.globalAlpha = a * (1 - clear);
    ctx.font = FONT.hand(size);
    ctx.textAlign = 'center';
    ctx.fillStyle = '#e4d6c2';
    ctx.shadowColor = 'rgba(0,0,0,0.75)'; ctx.shadowBlur = 14;
    ctx.translate(x, y); ctx.rotate(f.rot * (1 - pull));
    ctx.fillText(f.w, 0, 0);
    ctx.restore();
  }
}

module.exports = { start: D - 1.85, end: D - 0.001, draw: () => {}, drawOver };
