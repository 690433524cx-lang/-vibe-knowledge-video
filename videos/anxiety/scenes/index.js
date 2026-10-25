// 同一个空间里的几层对象，按绘制顺序排列（远 → 近）。相机在 ../world.js。
module.exports = ['./a0_space', './a1_forecast', './a2_unknowns', './a3_predict']
  .filter((p) => require('fs').existsSync(require('path').join(__dirname, p + '.js'))).map((p) => require(p));
