// 开场 0–20 秒是一镜到底：每一段的最后一个物体变成下一段的第一个物体。
// 场景按绘制顺序排列；交接的那一帧，后一段画在前一段上面。
const fs = require('fs');
const path = require('path');
module.exports = ['./o1_open', './o2_plate', './o3_office', './o4_flow', './c1_meeting']
  .filter((p) => fs.existsSync(path.join(__dirname, p + '.js'))).map((p) => require(p));
