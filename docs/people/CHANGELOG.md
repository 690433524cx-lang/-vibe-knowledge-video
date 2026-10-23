# 《想看清一个人》CHANGELOG

## v0.1 · 分镜 + 0–25.5 秒样片

- `docs/people/storyboard.md`：完整分镜表（118 s，MAIN_BEAT_T 暂定 98.0 s），按 时间 / 场景 / 镜头 / 人物动作 / 动态事件 / 字幕 / 转场 / 环境声 / 视觉目的 列出
- `videos/people/`：
  - `lib.js`：坐着的人（眼、眉、嘴，会笑、说话、皱眉）、特写的手（四指 + 拇指 + 针织袖口，可敲桌 / 悬停 / 收指）、餐厅、餐桌、账单夹和小票（合计 ¥1260）、场景坐标 → 屏幕坐标（光斑跟着镜头走）
  - `insert.js`：桌面俯视特写（账单 / 手共用）
  - `scenes/p1_dinner.js`（0–11.8）、`p2_hands.js`（11.8–15.95）、`p3_doors.js`（15.95–21.45）、`p4_team.js`（21.45–）
  - `subtitles.js`、`audio.js`（无音乐，只有环境声和拟音）
- 字幕引擎新增可选 `reveal`：同一行逐段出现、整行平滑重新居中（其他片输出不变）
- 输出：`output/people/sample_0-25s.mp4`、`output/people/keyframes_sample/`、`docs/people/review.md`
