# 《记忆》CHANGELOG

## v0.1 · 分镜 + 0–22.4 秒样片

- `docs/memory/storyboard.md`：完整分镜表（6 段，119.8 s，MAIN_BEAT_T 暂定 91.4 s）
- `videos/memory/`：
  - `lib.js`：贯穿全片的「同一段回忆」——客厅场景可在 照片版（晴天、藏青外套、孩子在窗边）和 记忆版（下雨、红外套、孩子在沙发前）之间连续插值；冲印照片、蜡笔圈、红色印章、档案标签
  - `scenes/m1_desk.js`：第 0 帧钩子 + 带双重影像的旧照片，推进到照片里
  - `scenes/m2_room.js`：回忆全屏 → 真实照片压上来 → 左右比对 → 三个圈 →「确定」印章
  - `scenes/m3_strip.js`：胶片像录像一样走过，停下后五格逐步漂移（第 1 次想起 … 第 N 次想起）
  - `subtitles.js`、`audio.js`（无音乐，只有环境声和拟音）
- 输出：`output/memory/sample_0-22s.mp4`、`output/memory/keyframes_sample/`、`docs/memory/review.md`
