// 场景按绘制顺序排列；转场期间相邻场景会重叠绘制。
const research = require('./p9_research');
const life = require('./p12_life');
module.exports = [
  require('./p1_party'),
  require('./p2_newyear'),
  require('./p3_train'),
  require('./p4_message'),
  require('./p5_interview'),
  require('./p6_echo'),
  require('./p7_map'),
  require('./p8_worst'),
  research.page,
  research.seligman,
  require('./p10_explain'),
  life.relation,
  life.work,
  require('./p14_rewrite'),
  require('./p16_routes'),
  require('./p17_end'),
];
