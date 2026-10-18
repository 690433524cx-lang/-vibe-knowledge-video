// 《你是不是也有选择困难？》音效编排（设计时间，随 MAIN_BEAT_T 移动）
// 全片核心音效控制在 8～12 种以内，都很轻，不抢《千年之后》。
const { paper, tick, threadTight, door, scrollTicks } = require('../../src/audio').synth;

const CUES = [
  { t: 0.05, fx: () => door(201, 1.2), gain: 0.10 },          // 门轻响
  { t: 4.95, fx: () => scrollTicks(211, 1.5), gain: 0.10 },   // 菜单滚动
  { t: 6.5, fx: () => paper(221, 0.6), gain: 0.14 },          // 卡片滑出
  { t: 8.85, fx: () => tick(231), gain: 0.10 },               // 购物车数字
  { t: 9.05, fx: () => tick(232), gain: 0.10 },
  { t: 9.25, fx: () => tick(233), gain: 0.10 },
  { t: 9.45, fx: () => tick(234), gain: 0.10 },
  { t: 11.6, fx: () => threadTight(241, 0.6), gain: 0.08 },   // 细线拉紧
  { t: 15.6, fx: () => door(251, 1.4), gain: 0.08 },          // 一排门打开
];

module.exports = CUES;
