# 《想看清一个人》CHANGELOG

## v0.2 · 开场 0–21.3 s 重做：一镜到底

上一版的动画语言太像 PPT（正面全景、人物排排坐、硬切进特写、黑底换场、门）。这一版整段重做：
- 握手极近景 → 跟着拍肩的手 → 手落到桌上 → 三枚筹码滑进来 → 两指拖走「利益」→ 推进到筹码铺满 → 筹码 morph 成盘子 → 俯视跟拍盘子穿过餐厅 → 对服务员敲桌、推盘、不抬头 → 盘子冲向镜头、盘底 match 成钟面 → 办公室从钟周围长出来 → 压力（电话 / ERROR / 打印机 / 消息 / 咖啡）→ 前景柱子擦过、绕到反打：同事和负责人 → 甩到钟 → 秒针变成手、扫三圈（筹码 / 敲桌 / 指人）→ 画面缩成圆 → 三个圆撞碎四句自我评价 → 「看他反复怎么选择」→ 圆放大进第一章（俯视会议桌）
- 新文件：`videos/people/kit.js`（握手、筹码 ↔ 盘子、盘底 ↔ 钟面、俯视人物、木桌、散焦背景、拖影）、`scenes/o1_open.js`、`o2_plate.js`、`o3_office.js`、`o4_flow.js`、`c1_meeting.js`
- `lib.js`：`spline`（经过关键点、速度连续的镜头路径），手增加 `point` / `middle` / `sy`
- 删除旧的 `p1_dinner` / `p2_hands` / `p3_doors` / `insert.js` 和旧样片；`p4_team.js` 暂时保留（第一章后半段可能复用）
- 字幕、声音按新时间轴重写
- 输出：`output/people/sample_0-20s_v2.mp4`、`output/people/keyframes_v2/`、`docs/people/review.md`

## v0.1 · 分镜 + 0–25.5 秒样片

- `docs/people/storyboard.md`：完整分镜表（118 s，MAIN_BEAT_T 暂定 98.0 s），按 时间 / 场景 / 镜头 / 人物动作 / 动态事件 / 字幕 / 转场 / 环境声 / 视觉目的 列出
- `videos/people/`：
  - `lib.js`：坐着的人（眼、眉、嘴，会笑、说话、皱眉）、特写的手（四指 + 拇指 + 针织袖口，可敲桌 / 悬停 / 收指）、餐厅、餐桌、账单夹和小票（合计 ¥1260）、场景坐标 → 屏幕坐标（光斑跟着镜头走）
  - `insert.js`：桌面俯视特写（账单 / 手共用）
  - `scenes/p1_dinner.js`（0–11.8）、`p2_hands.js`（11.8–15.95）、`p3_doors.js`（15.95–21.45）、`p4_team.js`（21.45–）
  - `subtitles.js`、`audio.js`（无音乐，只有环境声和拟音）
- 字幕引擎新增可选 `reveal`：同一行逐段出现、整行平滑重新居中（其他片输出不变）
- 输出：`output/people/sample_0-25s.mp4`、`output/people/keyframes_sample/`、`docs/people/review.md`
