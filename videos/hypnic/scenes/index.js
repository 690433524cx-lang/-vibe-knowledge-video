// 场景按绘制顺序排列；转场期间相邻场景会重叠绘制。
module.exports = [
  './h1_line', './h3_axis', './h4_mismatch', './h5_falling', './h6_motor', './h7_map', './h8_factors', './h9_danger', './h10_end', './h2_name',
].filter((p) => require('fs').existsSync(require('path').join(__dirname, p + '.js'))).map((p) => require(p));
