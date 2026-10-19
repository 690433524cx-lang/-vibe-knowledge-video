// MAIN_BEAT_T 之前（新时间轴，随 MAIN_BEAT_T 移动）：
//   T-1.2  失败 / 失去 / 结束 / 拒绝 一个接一个浮起来（手写，压在地图上），地图开始暗下去；
//   T-0.6  它们很快地往中央聚拢；
//   T-0.3  绝大部分一下子消失（画面清空）；
//   T-0.15 几乎完全静止的暗（引擎的 PRE_T_DARK 同时压暗）→ T「最坏」。
const { W, H, DESIGN_T: D } = require('../../../src/config');
const { FONT } = require('../../../src/lib/style');
const { prog, smooth, lerp, easeIn } = require('../../../src/lib/util');

const FLOAT = [
  { w: '失败', x: 520, y: 330, at: D - 1.2, size: 96, rot: -0.06 },
  { w: '失去', x: 1420, y: 300, at: D - 1.12, size: 90, rot: 0.05 },
  { w: '结束', x: 620, y: 700, at: D - 1.04, size: 100, rot: 0.04 },
  { w: '拒绝', x: 1330, y: 690, at: D - 0.96, size: 94, rot: -0.05 },
  { w: '失败', x: 980, y: 210, at: D - 0.9, size: 70, rot: 0.02 },
  { w: '拒绝', x: 300, y: 520, at: D - 0.86, size: 64, rot: 0.06 },
  { w: '结束', x: 1640, y: 500, at: D - 0.82, size: 66, rot: -0.04 },
  { w: '失去', x: 960, y: 800, at: D - 0.78, size: 68, rot: 0.03 },
];

function drawOver(ctx, t) {
  if (t >= D) return;
  // 地图暗下去；T-0.32 起迅速清成全暗
  const dim = 0.4 * smooth(prog(t, D - 1.2, D - 0.6)) + 0.6 * smooth(prog(t, D - 0.32, D - 0.2));
  if (dim > 0) { ctx.fillStyle = `rgba(7,6,5,${dim})`; ctx.fillRect(0, 0, W, H); }
  const clear = smooth(prog(t, D - 0.32, D - 0.24));
  if (clear >= 0.999) return;
  const pull = easeIn(prog(t, D - 0.6, D - 0.36));
  for (const f of FLOAT) {
    const a = smooth(prog(t, f.at, f.at + 0.14));
    if (a <= 0.01) continue;
    const rise = (Math.min(t, D - 0.6) - f.at) * 30;
    const x = lerp(f.x, 960 + (f.x - 960) * 0.22, pull), y = lerp(f.y - rise, 480 + (f.y - 480) * 0.22, pull);
    ctx.save();
    ctx.globalAlpha = a * (1 - clear);
    ctx.font = FONT.hand(f.size * lerp(1, 0.86, pull));
    ctx.textAlign = 'center';
    ctx.fillStyle = '#e6d8c4';
    ctx.shadowColor = 'rgba(0,0,0,0.75)'; ctx.shadowBlur = 14;
    ctx.translate(x, y); ctx.rotate(f.rot * (1 - pull));
    ctx.fillText(f.w, 0, 0);
    ctx.restore();
  }
}

module.exports = { start: D - 1.25, end: D - 0.001, draw: () => {}, drawOver };
