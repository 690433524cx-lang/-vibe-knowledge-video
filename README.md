# 动态知识短片（代码逐帧绘制）

| 视频 | 目录 | 状态 |
|---|---|---|
| 《为什么你越舍不得，越容易继续浪费？》沉没成本 | `videos/sunk-cost/` | 无音乐全片 `output/full_v1.mp4` |
| 《你是不是也有选择困难？》选择过载 / 满意解 | `videos/choice/` | 精修版无音乐全片 `output/choice/full_v2.mp4`（114.5 s），关键帧 `output/choice/keyframes_full/`，分镜 `docs/choice/storyboard.md`，自检 `docs/choice/review.md`，素材来源 `docs/choice/sources.md` |
| 《时间错觉》为什么越长大，时间过得越快？ | `videos/time/` | 无 BGM 完整片 `output/time/full_v1.mp4`（120 s），封面 `output/time/cover.jpg`，关键帧 `output/time/keyframes_full/`，时间轴 `docs/time/timeline.md`，分镜 `docs/time/storyboard.md`，验收 `docs/time/review.md`，`docs/time/CHANGELOG.md` |
| 《你最确定的那段回忆，可能是你自己编的》被改写的记忆 | `videos/memory/` | 无 BGM 完整片 `output/memory/full_v1.mp4`（119 s），封面 `output/memory/cover.jpg`，关键帧 `output/memory/keyframes_full/`，分镜 `docs/memory/storyboard.md`，验收 `docs/memory/review.md`，`docs/memory/CHANGELOG.md` |
| 《七宗罪·傲慢》 | `videos/pride/` | 无声全片 `output/pride/傲慢_1080p.mp4`（140 s），静帧 `output/pride/stills/`，缩略图 `output/pride/contact/`。浏览器 Canvas 管线：`index.html` 里的纯函数 `render(t)`，`stills.js` 截静帧，`render.js` 分 9 段、4 页并行渲染后拼接 |
| 《七宗罪·傲慢》粒子版 | `videos/pride3d/` | 无声全片 `output/pride3d/傲慢_1080p.mp4`（128 s，可首尾无缝循环），静帧 `output/pride3d/stills/`，缩略图 `output/pride3d/contact/`。Three.js 粒子管线：MediaPipe 标准人脸模型采样成点云，`src/main.js` 的纯函数 `render(t)` 先渲 WebGL（辉光、色差），再在 2D 画布上叠文字；`render.js` 分 8 段、3 页并行渲染 |

《七宗罪·傲慢》两版都用浏览器管线（粒子版在 `videos/pride3d/`，需先 `npm install` 装 three@0.160.0，已复制到 `vendor/`）：先 `apt-get install fonts-noto-cjk`，再在 `videos/pride/` 下运行 `node stills.js [秒…]` 或 `node render.js`（已存在的 `output/pride/parts/p序号.mp4` 会跳过，删掉某段即可只重渲那段）。

所有命令加 `--video choice` 即可切换到新片（默认 `sunk-cost`）。主重拍参数可用 `MAIN_BEAT_T`（或 `T` / `--T`）。
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
