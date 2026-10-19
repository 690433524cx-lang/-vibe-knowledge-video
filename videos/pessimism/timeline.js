// 《悲观主义》时间轴常量（最终精修版）
module.exports = {
  DESIGN_T: 56.8,     // 设计时间轴里的核心重拍 MAIN_BEAT_T（场景都按它编写；渲染时用 MAIN_BEAT_T 移动）
  DESIGN_END: 119.1,  // 设计时间轴总长：小灯亮起（116.3）后停 2.1 s，再自然淡出
  REAL_T: 57.5,       // 真实时间里的 MAIN_BEAT_T：片名 1.3 s 之后，正文到 T 之前整体快约 1%，让全片保持在 120 s 以内
  LEAD: 1.3,          // 片头：真实时间 0–1.3 s 单独的片名「悲观主义」，正文（设计时间 0）从 1.3 s 开始
  CLOSE_FADE: 0.7,
  RIGID: 2.0,
  OPEN_FADE: 0,       // 第 0 帧就要完整可读
  LOOK: 'v2',
  AMBIENT: 0.13,
  SUBJECT_LIFT: 1.2,
  AMBIENT_LIFT: 1.35,
  VIGNETTE: 0.42,
  PRE_T_DARK: [-0.32, -0.16],   // T-0.3 大部分元素消失 → T-0.15 几乎完全静止 → 最坏
  PRE_T_DARK_AMOUNT: 0.86,
  SUB_FIXED: true,              // 固定字幕系统：同一位置、足够的停留、克制的淡入淡出
  HIDE_HEADER: [[0, 999]],
  // 交付要求的关键帧（设计时间）
  KEYFRAMES_EXTRA: [['01s', 1], ['03s', 3], ['08s', 8], ['15s', 15], ['25s', 25], ['35s', 35], ['50s', 50],
    ['T-0.5', 56.3], ['T', 56.8], ['style_69s', 69.2], ['90s', 90], ['100s', 100], ['end-5', 114.55], ['last_line', 118.0]],
  HEADER: '',
};
