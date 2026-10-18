# 动态知识短片（代码逐帧绘制）

| 视频 | 目录 | 状态 |
|---|---|---|
| 《为什么你越舍不得，越容易继续浪费？》沉没成本 | `videos/sunk-cost/` | 无音乐全片 `output/full_v1.mp4` |
| 《悲观主义》悲观解释风格 | `videos/pessimism/` | 无音乐全片 `output/pessimism/full_v1.mp4`（114 s，MAIN_BEAT_T 暂定 66.5），关键帧 `output/pessimism/keyframes_full/`，正式封面 `output/pessimism/cover.png`（A 版），0–20 s 样片 `output/pessimism/sample_0-20s.mp4`（第二版），关键帧 `output/pessimism/keyframes_sample/`，封面三个方向 `output/pessimism/cover_A.png` / `cover_B.png` / `cover_C.png`（`node videos/pessimism/covers.js`，已选 A），分镜 `docs/pessimism/storyboard.md`，自检 `docs/pessimism/review.md`，素材来源 `docs/pessimism/sources.md` |
| 《你是不是也有选择困难？》选择过载 / 满意解 | `videos/choice/` | 精修版无音乐全片 `output/choice/full_v2.mp4`（114.5 s），关键帧 `output/choice/keyframes_full/`，分镜 `docs/choice/storyboard.md`，自检 `docs/choice/review.md`，素材来源 `docs/choice/sources.md` |

所有命令加 `--video choice` / `--video pessimism` 即可切换（默认 `sunk-cost`）。主重拍参数可用 `MAIN_BEAT_T`（或 `T` / `--T`）。
渲染可加 `--workers 4` 多进程并行。新片使用第二版画面管线（`src/look2.js`、`src/lib/material.js`、`src/lib/motion.js`），上一期不受影响。

---

## 《为什么你越舍不得，越容易继续浪费？》

动态知识短片 · 沉没成本 SUNK COST · 1920×1080 / 30fps / H.264

视觉体系：旧心理实验档案 + 复古科学手册 + 纸张拼贴 + 铅笔素描 + 打字机排版。
全部图形由代码逐帧绘制（Node + @napi-rs/canvas），ffmpeg 编码。

## 当前进度

- [x] STEP 1 音乐分析：**跳过**（《千年之后》音频尚未提供；暂定 T = 50 s，仅用于结构）
- [x] STEP 2 分镜表：`docs/storyboard.md`
- [x] STEP 3 前 20 秒样片（深色版，已确认）：`output/sample_0-20s.mp4`，关键帧 `output/keyframes_sample/`
- [x] STEP 4 全片（无音乐版）：`output/full_v1.mp4`
- [x] STEP 5 关键帧：`output/keyframes_full/`（`00_contact_sheet.jpg` 为总览）
- [x] STEP 6 自动检查：`docs/review.md`
- [ ] STEP 7 最终渲染（需要《千年之后》真实音频完成卡点）

## 使用

```bash
npm install
npm run fonts        # 下载四套开源字体到 assets/fonts/
npm run sample       # 渲染 0–20 秒样片
node src/still.js output/keyframes 2 6 10 15 19   # 导出任意时间点
node src/keyframes.js output/keyframes_full       # 导出检查用关键帧（随 T 自动计算）
```

## 时间轴参数（拿到《千年之后》后）

把音频放到 `assets/music/`，分析出真实重拍后：

```bash
T=52.37 node src/render.js --music assets/music/千年之后.mp3 --out output/final.mp4
T=52.37 END=104.8 node src/render.js ...                 # 片尾对齐到乐句结尾
ANCHORS='[{"design":28,"real":28.9}]' T=52.37 node src/render.js ...  # 追加乐句锚点
```

场景、字幕、音效全部按「设计时间」（设计 T = 50）编写，`src/config.js` 中的
`toDesign()` 把真实时间映射回设计时间：T±2 秒内 1:1 刚性，前段按比例伸缩，后段整体平移。

## 目录

```
src/config.js      时间轴与 T 参数
src/frame.js       单帧合成（纸张、页眉、场景、光影、字幕、暗角、颗粒）
src/subtitles.js   全片字幕表
src/audio.js       代码合成音效与编排
src/scenes/        各幕场景
src/render.js      渲染 MP4
src/still.js       导出关键帧
docs/storyboard.md 完整分镜表
```

字体：思源宋体 Noto Serif SC、马善政毛笔楷 Ma Shan Zheng、龙藏体 Long Cang、Special Elite（均为开源字体）。
