// 《悲观主义》时间轴常量
module.exports = {
  DESIGN_T: 66.5,     // 设计时间轴里的核心重拍 MAIN_BEAT_T（场景都按它编写；渲染时用 MAIN_BEAT_T 移动）
  DESIGN_END: 114.0,  // 设计时间轴总长
  CLOSE_FADE: 0.7,
  RIGID: 2.0,
  OPEN_FADE: 0,       // 第 0 帧就要完整可读
  LOOK: 'v2',         // 沿用上一期的第二版画面管线
  AMBIENT: 0.13,
  SUBJECT_LIFT: 1.2,
  AMBIENT_LIFT: 1.35,
  VIGNETTE: 0.42,
  SUB_SCALE: 1.17,    // 普通字幕 48 → 56 px，手机上也清楚
  PRE_T_DARK: [-0.7, -0.15],
  PRE_T_DARK_AMOUNT: 0.7,
  HIDE_HEADER: [[0, 999]], // 本片是生活场景短片，不要档案页眉
  KEYFRAMES_EXTRA: [['msg', 29.0], ['interview', 36.0], ['imagine', 39.25], ['echo', 45.0], ['anchor', 49.8], ['map', 55.6], ['two-things', 62.8], ['archive', 73.2], ['seligman', 76.0], ['style', 82.6], ['exam', 85.2], ['relation', 87.9], ['work', 90.6], ['strike', 94.0], ['questions', 101.8], ['routes', 106.8], ['stand', 109.0], ['window', 113.0]],
  HEADER: '',
};
