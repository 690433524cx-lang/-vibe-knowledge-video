// 场景按绘制顺序排列；转场期间相邻场景会重叠绘制。
module.exports = [
  require('./m1_desk'),
  require('./m2_room'),
  require('./m3_strip'),
  require('./m4_life'),
].concat(['./m5_cards', './m6_file', './m7_cues', './m8_exp', './m9_assemble', './m10_wound', './m11_climax', './m12_end']
  .filter((p) => require('fs').existsSync(require('path').join(__dirname, p + '.js'))).map((p) => require(p)));
