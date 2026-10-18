# 学者人物素材来源 · Martin Seligman

检索方式：网络搜索 Wikimedia Commons 与相关页面（2026-10-18）。

**当前运行环境无法访问 commons.wikimedia.org / upload.wikimedia.org**（网络策略对这两个域名返回 403，网页抓取工具也无法解析该域名），
所以下表的信息来自搜索结果对文件页的摘录，**图片尚未下载，授权也还没有在文件页上二次核对**。按你的要求，人物照片的最终替换先暂停，其余动画照常继续。

| # | 文件 | 链接 | 作者 | 授权（据搜索摘录） | 判断 |
|---|---|---|---|---|---|
| 1 | File:Martin Seligman George W Casey Jr Karen Reivich.jpg | https://commons.wikimedia.org/wiki/File:Martin_Seligman_George_W_Casey_Jr_Karen_Reivich.jpg | D. Myles Cullen, U.S. Army（美国国防部照片，2009-11-16 宾夕法尼亚大学记者会） | 美国联邦政府作品 → 公有领域（需在文件页确认） | **首选**：真实照片、来源清楚。三人合影，需要裁出 Seligman 一人 |
| 2 | File:Martin Seligman Philadelphia 2009.jpg | （Wikidata Q320927 引用的肖像图；文件页地址：https://commons.wikimedia.org/wiki/File:Martin_Seligman_Philadelphia_2009.jpg） | 待核对（很可能是 #1 同一场活动的裁切） | 待核对 | 分辨率较低（600×560），如授权为公有领域可直接用 |
| 3 | File:Dr. Martin Seligman i gen. George W. Casey Jr.png | https://commons.wikimedia.org/wiki/File:Dr._Martin_Seligman_i_gen._George_W._Casey_Jr.png | The U.S. Army | 公有领域（据摘录） | 同一活动的另一张，可作备选 |
| 4 | File:Martin Seligman.png | Commons 分类 https://commons.wikimedia.org/wiki/Category:Martin_Seligman 中列出（824×886） | 待核对 | 待核对 | 未找到作者 / 授权信息，**授权确认前不使用** |
| 5 | 2019 年照片（第三方网站署名 M.s.ananya, CC BY-SA 4.0, Wikimedia Commons） | 仅见于第三方转载，未找到文件页 | M.s.ananya | CC BY-SA 4.0（第三方声称） | 需在 Commons 上找到原文件页后才能用 |

**不使用**：出版社作者页（Penguin 等，摄影师 Andrew J. Rosenthal，版权所有）、APS 等机构网站的照片、新闻图库、带水印或来源不明的图片；不生成、不伪造任何「像 Martin Seligman 的人」。

## 怎样放进片子

把下载好的原图放到：

```
assets/portraits/martin_seligman.jpg   （.png / .webp 也可以）
```

重新渲染即可。代码会自动按焦点裁切、转黑白低饱和、侧光（一侧脸清楚，另一侧进入阴影，但不压到看不清）、银盐颗粒、白边，并把署名印在相片白边上。
如果用 #1（三人合影），请同时在 `videos/pessimism/scenes/` 的人物页参数里把 `focus` / `zoom` 调到 Seligman 本人（或先自己裁好再放进来）。

照片缺失时，相片位显示「PORTRAIT · 授权照片待导入」，排版与光线照常。

## 片中署名（使用 #1 时）

- Martin Seligman 照片：D. Myles Cullen / U.S. Army, public domain, via Wikimedia Commons
