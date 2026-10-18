// 全片时间轴配置。
//
// 所有场景都用「设计时间」编写（DESIGN_T = 50 时的时间轴）。
// 渲染时通过 warp() 把真实时间映射回设计时间，因此：
//   - 修改 T（环境变量 T=52.37 或 --T 52.37）即可整体移动高潮点；
//   - T 前后各 RIGID 秒的高潮窗口是刚性的（1:1，不拉伸），保证 T-1.0 / T-0.5 / T-0.15 / T / T+0.5 的精确偏移；
//   - 窗口之前的内容按比例拉伸/压缩，窗口之后的内容整体平移；
//   - 拿到《千年之后》后，可在 EXTRA_ANCHORS 里追加乐句锚点（设计时间 → 真实时间）做分段对齐。

const W = 1920;
const H = 1080;
const FPS = 30;

// 设计时间轴里的高潮点（不要改，场景都按它编写）
const DESIGN_T = 50.0;
// 设计时间轴总长
const DESIGN_END = 109.0;
// 高潮窗口：T-RIGID … T+RIGID 内保持 1:1
const RIGID = 2.0;

function argValue(name) {
  const i = process.argv.indexOf(name);
  return i >= 0 ? process.argv[i + 1] : undefined;
}

// 暂定 T：仅用于当前样片结构，不是最终音乐卡点
const T = parseFloat(argValue('--T') ?? process.env.T ?? '50.0');
// 真实片尾。默认跟随 T 平移；拿到音乐后可单独指定 END。
const END = parseFloat(argValue('--END') ?? process.env.END ?? String(DESIGN_END + (T - DESIGN_T)));

// 额外锚点：[{ design: 秒, real: 秒 }]，需单调递增，且不能落在高潮窗口内
const EXTRA_ANCHORS = JSON.parse(process.env.ANCHORS || '[]');

function buildAnchors() {
  const a = [
    { design: 0, real: 0 },
    ...EXTRA_ANCHORS,
    { design: DESIGN_T - RIGID, real: T - RIGID },
    { design: DESIGN_T + RIGID, real: T + RIGID },
    { design: DESIGN_END, real: END },
  ];
  a.sort((p, q) => p.design - q.design);
  return a;
}
const ANCHORS = buildAnchors();

function interp(pairs, x, from, to) {
  if (x <= pairs[0][from]) return pairs[0][to] + (x - pairs[0][from]);
  for (let i = 1; i < pairs.length; i++) {
    const p = pairs[i - 1], q = pairs[i];
    if (x <= q[from]) {
      const k = (x - p[from]) / (q[from] - p[from]);
      return p[to] + k * (q[to] - p[to]);
    }
  }
  const l = pairs[pairs.length - 1];
  return l[to] + (x - l[from]);
}

// 真实时间 → 设计时间
const toDesign = (real) => interp(ANCHORS, real, 'real', 'design');
// 设计时间 → 真实时间
const toReal = (design) => interp(ANCHORS, design, 'design', 'real');

module.exports = { W, H, FPS, DESIGN_T, DESIGN_END, RIGID, T, END, ANCHORS, toDesign, toReal };
