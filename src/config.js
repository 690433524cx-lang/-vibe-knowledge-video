// 全片时间轴配置（引擎通用）。
//
// 选择视频：--video choice 或环境变量 VIDEO=choice（默认 sunk-cost）。
// 每支视频在 videos/<名字>/timeline.js 里给出 DESIGN_T / DESIGN_END / HEADER。
//
// 所有场景都用「设计时间」编写（DESIGN_T = 50 时的时间轴）。
// 渲染时通过 warp() 把真实时间映射回设计时间，因此：
//   - 修改 T（环境变量 MAIN_BEAT_T=52.37 / T=52.37，或 --T 52.37）即可整体移动高潮点；
//   - T 前后各 RIGID 秒的高潮窗口是刚性的（1:1，不拉伸），保证 T-1.0 / T-0.5 / T-0.15 / T / T+0.5 的精确偏移；
//   - 窗口之前的内容按比例拉伸/压缩，窗口之后的内容整体平移；
//   - 拿到《千年之后》后，可在 EXTRA_ANCHORS 里追加乐句锚点（设计时间 → 真实时间）做分段对齐。

const W = 1920;
const H = 1080;
const FPS = 30;

const path = require('path');

function argValue(name) {
  const i = process.argv.indexOf(name);
  return i >= 0 ? process.argv[i + 1] : undefined;
}

const VIDEO = argValue('--video') ?? process.env.VIDEO ?? 'sunk-cost';
const VIDEO_DIR = path.join(__dirname, '..', 'videos', VIDEO);
const TL = require(path.join(VIDEO_DIR, 'timeline.js'));

// 插段（timeline.js 里 INSERT = { at, dur }）：原片在 at 处「暂停」dur 秒，插入一段独立场景，之后整体顺延。
// 场景、字幕、音效都仍按原时间轴编写；raw 是插段之后的总时间轴。
const INSERT = TL.INSERT || null;
function splitTime(raw) {
  if (!INSERT || raw < INSERT.at) return { d: raw, ins: null };
  if (raw < INSERT.at + INSERT.dur) return { d: INSERT.at, ins: raw - INSERT.at };
  return { d: raw - INSERT.dur, ins: null };
}
const baseToRaw = (d) => (INSERT && d >= INSERT.at ? d + INSERT.dur : d);

// 阅读节奏（timeline.js 里 READ_PACE）：每句字幕按字数算出最少停留时间，
// 不够的部分在这句字幕显示期间把画面「放慢」补出来（动画不变，只是走得慢一点）；
// 冲击瞬间（READ_PACE.protect）附近保持原速。字幕、画面、音效共用这一条时间映射。
//   raw（插段之后的时间轴）→ 成片时间：paceOut()；反过来：paceIn()
const PACE = (() => {
  const RP = TL.READ_PACE;
  if (!RP) return null;
  const subs = require(path.join(VIDEO_DIR, 'subtitles.js')).map((x) => ({ ...x }));
  // 与字幕渲染相同的防交叠处理
  for (let i = 0; i < subs.length; i++) for (let j = i + 1; j < subs.length; j++) {
    const a = subs[i], b = subs[j];
    if (!!a.raw !== !!b.raw) continue;
    if (Math.abs((a.y ?? 968) - (b.y ?? 968)) < 60 && b.t < a.t + a.d + 0.32) a.d = Math.max(0.6, b.t - a.t - 0.32);
  }
  const STEP = 0.01, N = Math.ceil((TL.DESIGN_END + 1) / STEP);
  const rate = new Float32Array(N).fill(1);
  const prot = (t) => (RP.protect || []).some(([a, b]) => t >= a && t <= b);
  const need = (s) => {
    const n = s.text.replace(/[{}\s，。、？！：；——…“”「」『』,.?!·\n-]/g, '').replace(/—/g, '').length;
    let r = n < 6 ? 1.5 : n < 10 ? 1.8 : n < 16 ? 2.5 : n <= 24 ? 3.0 + 0.5 * (n - 16) / 8 : 3.5 + 0.1 * (n - 24);
    if (s.concept) r += s.text.includes('\n') ? 0.75 : 0.5;
    if (s.extra) r += s.extra;
    return r;
  };
  const stretch = (a, b, extra) => {
    const cells = [];
    for (let k = Math.ceil(Math.max(0, a) / STEP); k < Math.floor(b / STEP) && k < N; k++) if (!prot(k * STEP)) cells.push(k);
    if (!cells.length || extra <= 0) return;
    const f = 1 + extra / (cells.length * STEP);
    for (const k of cells) rate[k] = Math.max(rate[k], f);
  };
  const report = [];
  for (const s of subs) {
    const t = s.raw ? s.t : baseToRaw(s.t);
    const shown = t + s.d - Math.max(0, t) + 0.2;   // 淡出的前 0.2 s 仍可读
    const extra = need(s) - shown;
    report.push({ t, text: s.text.replace(/\n/g, ''), shown, need: need(s) });
    stretch(Math.max(0, t) + 0.1, t + s.d, extra);
  }
  for (const w of RP.extra || []) stretch(w.at, w.at + w.dur, w.add);
  const cum = new Float64Array(N + 1);
  for (let k = 0; k < N; k++) cum[k + 1] = cum[k] + rate[k] * STEP;
  const out = (x) => { const k = Math.min(N - 1, Math.max(0, Math.floor(x / STEP))); return x < 0 ? x : x >= N * STEP ? cum[N] + (x - N * STEP) : cum[k] + (x - k * STEP) * rate[k]; };
  const inv = (y) => {
    if (y < 0) return y;
    if (y >= cum[N]) return N * STEP + (y - cum[N]);
    let lo = 0, hi = N;
    while (hi - lo > 1) { const m = (lo + hi) >> 1; if (cum[m] <= y) lo = m; else hi = m; }
    return lo * STEP + (y - cum[lo]) / rate[lo];
  };
  return { out, inv, report };
})();
const paceOut = (raw) => (PACE ? PACE.out(raw) : raw);
const paceIn = (fin) => (PACE ? PACE.inv(fin) : fin);

// 设计时间轴里的高潮点（成片时间）
const DESIGN_T = paceOut(TL.DESIGN_T);
// 设计时间轴总长（成片时间）
const DESIGN_END = paceOut(TL.DESIGN_END);
// 高潮窗口：T-RIGID … T+RIGID 内保持 1:1
const RIGID = TL.RIGID ?? 2.0;

// 暂定 T：仅用于当前样片结构，不是最终音乐卡点
const T = parseFloat(argValue('--T') ?? process.env.MAIN_BEAT_T ?? process.env.T ?? String(DESIGN_T));
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

module.exports = { INSERT, splitTime, baseToRaw, PACE, paceOut, paceIn, W, H, FPS, VIDEO, VIDEO_DIR, TL, DESIGN_T, DESIGN_END, RIGID, T, END, ANCHORS, toDesign, toReal };
