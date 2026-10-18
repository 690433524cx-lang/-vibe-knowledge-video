// 场景按绘制顺序排列；转场期间相邻场景会重叠绘制。
module.exports = [
  require('./s1_glass'),
  require('./s2_ticket'),
  require('./s3_queue'),
];
