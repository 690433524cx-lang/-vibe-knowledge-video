// 场景按绘制顺序排列；转场期间相邻场景会重叠绘制。
const scholar = require('./c7_scholar');
module.exports = [
  require('./c1_doors'),
  require('./c2_shop'),
  require('./c3_paradox'),
  require('./c4_life'),
  require('./c5_criteria'),
  require('./c6_terms'),
  require('./cx_climax'), // 画在研究笔记之上：「选对」缩小时不被纸挡住
  scholar.schwartz,
  require('./c8_options'),
  require('./c10_loop'),
  scholar.simon,
  require('./c12_card'),
  require('./c13_end'),
];
