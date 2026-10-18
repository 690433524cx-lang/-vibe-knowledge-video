// 《你是不是也有选择困难？》字幕表（设计时间，DESIGN_T = MAIN_BEAT_T = 50）。
// 渲染时传入的是设计时间，所以改 T 后字幕会跟随时间轴自动移动。
// style: sub（下方）/ emph（下方略大）/ hand（手写）/ center（中央大字）；{…} 内为暗红强调。
const SUBS = [
  // 第一幕 · 第 0 帧就完整可读
  { t: -0.2, d: 1.55, text: '你是不是也有选择困难？', style: 'hook', x: 150, y: 905, align: 'left', fi: 0.05 },
  { t: 1.75, d: 0.95, text: '为什么选项越多——', style: 'quote', size: 56, x: 150, y: 905, align: 'left', fi: 0.2 },
  { t: 2.95, d: 1.25, text: '你反而越难决定？', style: 'quote', x: 150, y: 905, align: 'left', fi: 0.2 },
  // 第二幕 · 外卖 / 购物 / 购物车
  { t: 4.35, d: 0.75, text: '吃什么？', x: 150, y: 905, align: 'left', fi: 0.15 },
  { t: 5.35, d: 0.7, text: '再看看。', x: 150, y: 905, align: 'left', fi: 0.15 },
  { t: 6.55, d: 0.75, text: '买哪个？', x: 150, y: 905, align: 'left', fi: 0.15 },
  { t: 7.55, d: 0.95, text: '要不再看看别的。', x: 150, y: 905, align: 'left', fi: 0.15 },
  { t: 8.75, d: 0.75, text: '选了半天。', x: 150, y: 905, align: 'left', fi: 0.15 },
  { t: 9.75, d: 1.2, text: '最后什么都没选。', x: 150, y: 905, align: 'left', fi: 0.2 },
  // 第三幕 · 矛盾
  { t: 11.3, d: 1.0, text: '奇怪的是。', style: 'quote', size: 56, x: 1770, y: 330, align: 'right' },
  { t: 12.7, d: 1.1, text: '没得选的时候，', x: 150, y: 905, align: 'left' },
  { t: 14.1, d: 1.1, text: '我们想要选择。', x: 150, y: 905, align: 'left' },
  { t: 15.5, d: 1.2, text: '真的有得选了，', x: 150, y: 905, align: 'left' },
  { t: 17.1, d: 1.9, text: '我们又开始害怕。', style: 'quote', size: 56, x: 150, y: 905, align: 'left' },
  // 第四幕 · 工作 / 城市 / 人生路线
  { t: 21.0, d: 1.6, text: '工作怎么选？', x: 150, y: 905, align: 'left' },
  { t: 25.6, d: 1.6, text: '城市怎么选？', x: 150, y: 905, align: 'left' },
  { t: 29.4, d: 1.2, text: '越重要的选择，', x: 150, y: 905, align: 'left' },
  { t: 30.9, d: 1.6, text: '我们越想找到一个——', x: 150, y: 905, align: 'left' },
  // 第五幕 · 标准堆叠
  { t: 41.6, d: 2.0, text: '真正让你迟迟选不出来的——', x: 150, y: 960, align: 'left' },
  { t: 44.0, d: 1.9, text: '可能不是选择太多。', x: 150, y: 960, align: 'left' },
  // T 之后（MAIN_BEAT_T = 50）
  { t: 51.2, d: 1.3, text: '真正困住你的，', y: 965 },
  { t: 52.8, d: 1.3, text: '可能不是选择。', y: 965 },
  { t: 54.4, d: 2.3, text: '是你太想{选对}。', style: 'quote', y: 975, fi: 0.5 },
  // 第六幕 · 术语
  { t: 57.0, d: 1.1, text: '当选项多到一定程度，', x: 150, y: 905, align: 'left' },
  { t: 58.3, d: 1.5, text: '人反而更难决定。', x: 150, y: 905, align: 'left' },
  { t: 60.2, d: 1.4, text: '更多选择，本该是更多自由。', x: 150, y: 905, align: 'left' },
  { t: 61.9, d: 0.9, text: '可选择太多的时候——', x: 150, y: 905, align: 'left' },
  { t: 63.0, d: 1.3, text: '自由也会变成压力。', x: 150, y: 905, align: 'left' },
  // 第七幕 · Barry Schwartz（右侧栏）
  { t: 65.1, d: 2.6, text: '更多选择，不一定带来更多自由。', x: 860, y: 800, align: 'left', size: 44 },
  // 第八幕 · 放弃线
  { t: 68.4, d: 1.0, text: '因为每多一个选择，', x: 150, y: 905, align: 'left' },
  { t: 69.6, d: 1.5, text: '就多一个必须放弃的可能。', x: 150, y: 905, align: 'left' },
  { t: 71.4, d: 0.8, text: '你选了 A，', x: 150, y: 905, align: 'left' },
  { t: 72.4, d: 1.8, text: '脑子却还在想——', x: 150, y: 905, align: 'left' },
  // 第九幕 · 后悔版本
  { t: 74.8, d: 0.8, text: '选择越多，', x: 150, y: 905, align: 'left' },
  { t: 75.8, d: 1.6, text: '能想象的后悔版本也越多。', style: 'quote', x: 960, y: 112 },
  { t: 77.6, d: 0.8, text: '所以很多时候，', x: 150, y: 905, align: 'left' },
  { t: 78.6, d: 0.9, text: '你不是在找答案，', x: 150, y: 905, align: 'left' },
  { t: 79.8, d: 1.5, text: '你是在逃避{选错}。', style: 'quote', size: 58, x: 150, y: 905, align: 'left' },
  // 第十幕 · 不断比较
  { t: 81.6, d: 0.6, text: '不断比较。', x: 150, y: 905, align: 'left', fi: 0.2 },
  { t: 82.4, d: 0.6, text: '不断搜索。', x: 150, y: 905, align: 'left', fi: 0.2 },
  { t: 83.2, d: 0.6, text: '不断拖延。', x: 150, y: 905, align: 'left', fi: 0.2 },
  { t: 84.0, d: 0.7, text: '直到决定本身——', x: 150, y: 905, align: 'left' },
  { t: 84.9, d: 1.4, text: '比结果更累。', style: 'quote', size: 56, x: 150, y: 905, align: 'left' },
  // 第十一幕 · 简化 + Herbert Simon（左侧栏）
  { t: 87.4, d: 1.3, text: '有一个更现实的思路。', x: 170, y: 905, align: 'left' },
  { t: 89.0, d: 0.9, text: '不要找最好的，', x: 170, y: 800, align: 'left' },
  { t: 90.2, d: 1.8, text: '找一个已经足够好的。', style: 'quote', size: 54, x: 170, y: 800, align: 'left' },
  // 第十二幕 · 三个条件
  { t: 92.4, d: 0.9, text: '下次再纠结的时候，', x: 150, y: 965, align: 'left' },
  { t: 93.6, d: 1.1, text: '不要问：哪个最好？', x: 150, y: 965, align: 'left' },
  { t: 95.0, d: 1.8, text: '换一个问题——', x: 150, y: 965, align: 'left' },
  { t: 97.2, d: 1.5, text: '只要满足最重要的三个条件，', x: 150, y: 965, align: 'left' },
  { t: 99.0, d: 1.5, text: '它可能已经足够好了。', x: 150, y: 965, align: 'left' },
  // 第十三幕 · 回到门
  { t: 101.0, d: 0.8, text: '好的决定，', x: 150, y: 905, align: 'left' },
  { t: 102.0, d: 1.1, text: '不一定是找到最好，', x: 150, y: 905, align: 'left' },
  { t: 103.4, d: 0.8, text: '有时候只是——', x: 150, y: 905, align: 'left' },
  { t: 104.4, d: 1.8, text: '知道什么时候可以停止比较。', style: 'quote', size: 54, x: 150, y: 905, align: 'left' },
  // 结尾：两两出现，停顿约 1 秒，最后一问停到结束
  { t: 106.7, d: 0.9, text: '如果你知道——', x: 200, y: 820, align: 'left', fi: 0.5 },
  { t: 107.9, d: 1.9, text: '没有一个选择，', x: 200, y: 820, align: 'left', fi: 0.5 },
  { t: 108.6, d: 1.2, text: '能让你完全不后悔。', x: 200, y: 890, align: 'left', fi: 0.5 },
  { t: 110.9, d: 3.4, text: '你还会纠结这么久吗？', style: 'quote', x: 200, y: 870, align: 'left', fi: 0.6, fo: 0.6 },
];

module.exports = SUBS;
