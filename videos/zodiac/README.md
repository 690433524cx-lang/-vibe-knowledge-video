# 《星座召唤》视频引擎

抖音竖屏系列，每个星座一条：1080×1920，30 帧，H.264（yuv420p），无声，25 秒，可首尾无缝循环。

```bash
cd videos/zodiac
npm install                          # three@0.160.0（页面通过 importmap 从 node_modules 本地加载，不依赖 CDN）
apt-get install fonts-noto-cjk fonts-noto-cjk-extra   # Noto Serif CJK SC（含 900 字重）
node render.js --sign leo            # 正式版 → out/狮子座_星座召唤.mp4
node render.js --sign leo --preview  # 预览版 540×960 / 15 帧 / 粒子减半 → out/狮子座_星座召唤_预览.mp4
node qa.js --sign leo [--preview]    # 自动验收
node stills.js --sign leo 14.5 18    # 截静帧 → out/stills/狮子座/（不带时间则截默认检查清单）
```

换星座只改 `--sign`：aries taurus gemini cancer leo virgo libra scorpio sagittarius capricorn aquarius pisces。

## 目录

| 路径 | 作用 |
|---|---|
| `engine/index.html` | 渲染页面：`?sign=leo&w=1080&h=1920&q=1`，暴露纯函数 `window.render(t)` |
| `engine/js/main.js` | 导演：事件表、分镜时间线、相机、冲击/闪白/冲击波、2D 合成 |
| `engine/js/particles.js` | 统一粒子材质（呼吸漂移、溶散/汇聚、漩涡、朝向着色、闪烁、柔和圆点） |
| `engine/js/sdf.js` | SDF 小语言：椭球/球/圆锥胶囊/链/螺旋/圆环/圆角盒，光滑并/差/交，采样、法线、环境光遮蔽 |
| `engine/js/creature.js` | 神兽：表面采样（脸部加密）、曲率与五官线条、火焰毛束、胸口星座纹章、眼睛 |
| `engine/js/ring.js` | 十二星座符号环（12 个符号是自己画的路径，不用字体） |
| `engine/js/starmap.js` | 星图：亮核＋光晕＋四芒星芒、生长的粒子连线 |
| `engine/js/background.js` | 星云（两层 5 层 fbm＋丝状结构、尘埃带、银河光带，半分辨率）、星点、浮尘 |
| `engine/js/fx.js` | 火/土/风/水元素粒子、冲击波、火焰旋涡、火花爆发、文字溶散 |
| `engine/js/text.js` | 文字层（召唤字幕、金属大字、台词、特征词、冷知识），记录包围盒 |
| `engine/signs/*.json` | 12 个星座配置 |
| `engine/assets/d3-celestial/` | d3-celestial 的星座连线和恒星星等数据（BSD-3 许可） |
| `engine/assets/starmap/*.json` | 由 `node tools/build-starmap.js` 生成的星图（自动下载数据，失败时用配置里的备用星表） |
| `render.js` / `stills.js` / `qa.js` | 出片、截图、验收 |

## 渲染架构

- 画面只由 `t` 决定：不用 `Math.random`、`Date`、`requestAnimationFrame`。随机数都来自 `hash(i)=fract(sin(i*127.1+311.7)*43758.5453)` 或固定种子的伪随机。所有周期运动取 25 秒的整数分之一，第 750 帧正好接回第 0 帧。
- glCanvas（Three.js，`preserveDrawingBuffer`）→ RenderPass → UnrealBloomPass（1.5 / 0.65 / 0.12，冲击时 ×1.8）→ 色差＋黑场＋暗角 ShaderPass（星云在这里垫底）→ OutputPass；再画到 outCanvas 上叠文字、暗角、噪点、闪白，从 outCanvas 取图。
- 屏幕空间的元素（符号环、星图、旋涡、冲击波、文字粒子）挂在相机前方的“叠加层”，坐标单位就是画面像素。
- `render.js`：无头 Chromium（SwiftShader WebGL），切点 0/4/8/15/20/25 分 5 段、3 页并行，JPEG 写入 ffmpeg，临时文件成功后改名，concat `-c copy` 拼接；每帧文字包围盒写入 `<视频>.boxes.json`。

## 神兽造型（以狮子为例）

1. SDF 组合：胸腔、肩、伸向前方的前爪（狮身人面式的“胸像”姿态，脚趾和爪尖是小球和小锥体）；头部是一个缩放 1.2 倍、昂首 12° 的部件，由头骨、额、颧骨、方形吻部、宽鼻梁、宽鼻头、胡须垫、眉骨、眼窝（减去）、下颌和微张的暗色口腔（减去）组成。
2. 在表面 −0.02～0.01 的薄带里拒绝采样约 70000 点，沿梯度投影到表面，梯度作法线；脸部椭球区域再加密约 15000 点。
3. 光影：主光 × SDF 环境光遮蔽，映射到 暗色→主色→次色→高光色；SDF 拉普拉斯（曲率）让眉骨、鼻梁、颧骨亮起、凹处变暗；掠射角的点压暗（否则粒子在轮廓处堆叠，脸会变成“空洞”）；稀疏的亮点闪烁；流动的熔岩纹。
4. 五官线条：在头部正面画 2D 路径（倒“八”字眉、上眼睑、泪痕、倒三角鼻头、人中、下撇的嘴线、胡须点），沿头部 −z 方向投射到 SDF 表面，生成细亮的粒子线——表情一眼可读。
5. 鬃毛：围绕脸部的三层椭圆环发出 180 束火焰（每束 40–70 个点、带横向绒毛），下巴下方留缺口避免挡脸，另有 260 束短焰组成的“日冕”和胸前的一圈；着色器里用卷曲噪声驱动翻涌，火焰波沿毛束向外传播，末端不断有火星脱离上飘。
6. 胸口纹章：星图的归一化坐标投射到胸口表面；眼睛是始终朝向镜头的发光面片（杏仁形核心、光晕、光芒）。

其余 11 个星座在 `creature` 里按同样的 SDF＋毛束思路写好了初版参数（`sdf.parts`、`strands`、`eyes`、`face`、`emblem`，以及天秤座的 `spin`），等狮子座确认后逐个精修。
