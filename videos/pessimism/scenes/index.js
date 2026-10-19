// 场景按绘制顺序排列；转场期间相邻场景会重叠绘制。
//
// 留存优化版：前半段的场景按原来的时间轴编写，这里用 remap 把它们压缩 / 平移到新时间轴上（[新时间, 旧时间]）。
// 互相交接的两幕在交接那一段用同样的斜率，杯口 → 窗花、窗户 → 车窗、返程票 → 聊天框、光标 → 门缝都还对得上。
const { W, H } = require('../../../src/config');
const { FONT } = require('../../../src/lib/style');
const { prog, smooth } = require('../../../src/lib/util');
const { remap } = require('../remap');
const middle = require('./p6_middle');
const life = require('./p12_life');
const method = require('./p15_method');

// 第四个问题：写在地图上方的空白处（画在地图之后、灯光之前）
const q3 = {
  start: 102.3, end: 106.0,
  draw(ctx, t) {
    const a = 1 - smooth(prog(t, 105.4, 105.9));
    ctx.save();
    ctx.globalAlpha *= a;
    method.written(ctx, '除了最坏，还有没有别的可能？', W / 2 + 150, 215, FONT.hand(78), 'rgba(40,32,28,0.92)', prog(t, 102.4, 103.2), 'center');
    ctx.restore();
  },
};

module.exports = [
  remap(require('./p1_party'), [[0, 0.9], [1.6, 2.5], [3.6, 5.2], [4.9, 6.9], [5.15, 7.15], [6.4, 8.6]]),
  require('./p0_chapter'),
  remap(require('./p2_newyear'), [[5.15, 7.15], [6.4, 8.6], [7.4, 10.3], [11.9, 12.6], [13.4, 15.4], [13.6, 15.5], [14.5, 16.9]]),
  remap(require('./p3_train'), [[14.114, 16.3], [14.5, 16.9], [15.3, 18.0], [16.4, 19.5], [17.0, 20.6], [17.9, 22.5], [18.5, 24.7], [19.0, 25.45], [19.5, 26.15], [19.8, 26.6]]),
  remap(require('./p4_message'), [[19.6, 26.3], [20.2, 27.2], [21.6, 29.4], [22.2, 30.4], [22.9, 31.4], [23.4, 32.3], [24.3, 33.6], [24.6, 34.1]]),
  remap(require('./p5_interview'), [[24.1, 33.35], [24.4, 33.75], [26.7, 39.0], [28.6, 40.6]], { end: 28.6 }),   // 最后一个幻象之后硬切
  middle.candle,
  middle.crowd,
  middle.montage,
  remap(require('./p7_map'), [[46.6, 51.3], [51.9, 53.3], [52.2, 53.6], [53.0, 54.5], [53.8, 55.4], [54.2, 57.0], [55.4, 58.4], [55.8, 59.2], [57.9, 61.6], [58.5, 62.2], [59.1, 62.8], [59.4, 63.3], [62.9, 65.0]], { clampOld: 65.0, end: 64.5 }),
  require('./p7b_tprep'),
  require('./p8_worst'),
  require('./p9_portrait'),
  require('./p10_exam'),
  life.relation,
  life.work,
  method.paper,
  method.windowShot,
  method.phoneShot,
  remap(require('./p16_routes'), [[102.2, 102.6], [102.7, 103.0], [104.2, 103.9], [106.1, 106.0], [107.0, 107.0], [107.9, 108.5]]),
  q3,
  method.worst,
  remap(require('./p17_end'), [[107.6, 107.95], [108.3, 108.5], [110.8, 110.95], [112.6, 112.65], [117.95, 118.0]]),
];
