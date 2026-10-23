// 场景按绘制顺序排列；转场期间相邻场景会重叠绘制。
const fs = require('fs');
const path = require('path');
module.exports = ['./p1_dinner', './p2_hands', './p3_doors', './p4_team']
  .filter((p) => fs.existsSync(path.join(__dirname, p + '.js'))).map((p) => require(p));
