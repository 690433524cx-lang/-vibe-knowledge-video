// 背景空间：微弱地面网格、稀疏坐标、数据点。全程存在，随相机产生视差。
const L = require('../lib');
const { cam } = require('../world');

module.exports = {
  start: -1, end: 999,
  draw(ctx, d) { L.space(ctx, cam(d), d); },
};
