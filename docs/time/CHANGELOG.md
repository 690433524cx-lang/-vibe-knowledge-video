# 《时间错觉》CHANGELOG

## v0.1 · 分镜 + 0–22.5 秒样片

- 新增 `docs/time/storyboard.md`：完整分镜表（118 s，MAIN_BEAT_T 暂定 65 s）
- 新增 `videos/time/`：
  - `lib.js`：本片的二维人物骨架（真实比例、侧面 / 背面 / 正面、IK 伸手和落脚、转头）、受光与轮廓光、景深模糊、镜头序列
  - `scenes/t1_summer.js`：窗边的暑假 + 五个暑假碎片
  - `scenes/t2_phone.js`：日历「7 月」→ 锁屏 JAN…DEC
  - `scenes/t3_commute.js`：十个通勤镜头 × 三天加速 + 地铁车窗倒影
  - `subtitles.js`、`audio.js`（只有环境声和音效，无旋律）
- `src/audio.js`：导出 `biquad` / `rng`，供各片自己合成环境声（其他两片输出不变）
- 输出：`output/time/sample_0-22s.mp4`、`output/time/keyframes_sample/`、`docs/time/review.md`
