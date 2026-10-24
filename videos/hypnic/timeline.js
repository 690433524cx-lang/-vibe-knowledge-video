// 《为什么你快睡着时，有时会突然"踩空"惊醒？》时间轴常量
module.exports = {
  DESIGN_T: 95.6,     // 主重拍：知识图谱的金色脉冲到达「入睡抽动」（原片 88.6 + 插段 7.0，暂定）
  DESIGN_END: 121.6,  // 原片 114.6 + 插段 7.0
  // 插段：标题出现后（原片 13.65 s）插入 7 s「长个」误区反转，之后全片顺延
  INSERT: { at: 13.65, dur: 7.0 },
  RIGID: 2.0,
  LOOK: 'v3',
  CLOSE_FADE: 0.5,
  VIGNETTE: 0.5,
  GRID: 48,
  GRID_ALPHA: 0.05,
  GRAIN: 0.035,
  SUB_PX: 64,     // 普通字幕（v0.2：54 → 64，手机端）
  SUB_Y: 978,
  HEADER: '',
};
