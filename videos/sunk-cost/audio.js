// 《舍不得》音效编排
const { DESIGN_T } = require('../../src/config');
const { drop, paper, tick, printer, photoDrop, threadTight, impact, stamp, pencilScratch, door } = require('../../src/audio').synth;

// 编排（设计时间）。gain 为线性增益。
const CUES = [
  { t: 2.2, fx: () => drop(11), gain: 0.32 },
  { t: 4.4, fx: () => drop(12), gain: 0.22 },
  { t: 6.6, fx: () => drop(13), gain: 0.16 },
  { t: 7.75, fx: () => paper(21, 0.8), gain: 0.18 },
  { t: 9.6, fx: () => tick(31), gain: 0.16 },
  { t: 11.6, fx: () => tick(32), gain: 0.14 },
  { t: 13.9, fx: () => tick(33), gain: 0.13 },
  { t: 17.45, fx: () => printer(41), gain: 0.16 },
  { t: 29.05, fx: () => photoDrop(51), gain: 0.22 },
  { t: 44.0, fx: () => threadTight(61), gain: 0.12 },
  { t: DESIGN_T, fx: () => impact(71), gain: 0.5 },          // T：与音乐重拍同时
  { t: DESIGN_T + 1.0, fx: () => stamp(81), gain: 0.3 },    // T+1.0：沉没成本
  { t: 84.7, fx: () => pencilScratch(91, 0.55), gain: 0.14 },
  { t: 86.5, fx: () => pencilScratch(92, 0.6), gain: 0.1 },
  { t: 88.5, fx: () => paper(22, 0.8), gain: 0.16 },
  { t: 100.0, fx: () => door(101), gain: 0.14 },
];

module.exports = CUES;
