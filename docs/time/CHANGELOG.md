# 《时间错觉》CHANGELOG

## v0.2 · 0–22.7 秒：留存率与视觉质感优化

- 童年窗边重做成真实空间：纱帘透光并被风吹起、光柱、灰尘、墙上窗格投影里的树影、书桌和水杯、腿在桌下晃；童年段加高光晕开
- 前 3 秒提速：窗边 1.5 s → 冰棍 / 雨 / 晚霞各 0.5 s
- 去掉俯拍午睡，换成凉席电扇、阳台晾衣、傍晚骑车回家、雨后水洼
- 锁屏改为十二个月转盘（JAN / MAR / JUN / SEP / DEC 停顿，其余带运动模糊滑过）
- 通勤重写为 6 个构图不同的镜头 × 5 天，周三起重影、周四轨迹叠加、周五只剩残影；提亮约 20%
- 新增 17.7–22.7 s 记忆卡片小高潮：浮现 → 叠起 → 模糊 → 压扁 → 只剩空白时间轴
- `lib.js` 新增 `halation`（高光晕开）和 `dust`（光柱里的灰尘）

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
