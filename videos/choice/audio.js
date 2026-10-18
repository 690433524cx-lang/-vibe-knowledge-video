// 《你是不是也有选择困难？》音效编排（设计时间，随 MAIN_BEAT_T 移动）
// 全片 9 种核心音效，都很轻，不抢《千年之后》。T 处的冲击只作增强。
const { DESIGN_T } = require('../../src/config');
const { paper, tick, threadTight, door, scrollTicks, impact, stamp, pencilScratch, lightsOut } = require('../../src/audio').synth;
const T2 = 79.8; // 第二个小重拍（与 scenes/c8_options.js 一致）

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
  { t: 20.4, fx: () => paper(261, 0.7), gain: 0.12 },         // 信落在桌上
  { t: 24.6, fx: () => paper(262, 0.6), gain: 0.10 },         // 车票
  { t: 33.0, fx: () => pencilScratch(271, 0.6), gain: 0.10 }, // 红铅笔圈住「不会后悔」
  { t: DESIGN_T, fx: () => impact(281), gain: 0.45 },         // T：与音乐重拍同时
  { t: DESIGN_T, fx: () => stamp(282), gain: 0.32 },          // T：印章压下
  { t: T2, fx: () => lightsOut(291), gain: 0.16 },            // T2：没选的路一下子熄灭
  { t: 81.5, fx: () => paper(301, 0.4), gain: 0.10 },         // 纸条拍下
  { t: 82.4, fx: () => paper(302, 0.4), gain: 0.10 },
  { t: 83.3, fx: () => paper(303, 0.4), gain: 0.10 },
  { t: 94.3, fx: () => pencilScratch(311, 0.55), gain: 0.12 },// 划掉「哪个最好」
  { t: 96.4, fx: () => tick(321), gain: 0.08 },               // 三个勾
  { t: 96.9, fx: () => tick(322), gain: 0.08 },
  { t: 97.4, fx: () => tick(323), gain: 0.08 },
  { t: 106.9, fx: () => door(331, 1.8), gain: 0.10 },         // 最后一扇门开启
];

module.exports = CUES;
