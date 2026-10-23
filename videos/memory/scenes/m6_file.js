// 第六幕 · 37.0–50.6 秒：记忆像一份文件，每次打开都会被重新保存一次。
//   37.0  档案窗口打开：memory_01（照片里的那天）
//   40.6–44.6  一次次打开、保存：memory_02 光线 → 03 站位 → 05 天气 → 07 外套的颜色。
//              旧版本一层层压到后面，形成一叠历史。每次右下角出现「已修改：…」
//   44.8  历史版本微微散开
//   47.4  中央：「其实，你是在重建。」——窗口退远、收暗
const L = require('../lib');
const { W, H, FONT, lerp, clamp, prog, smooth } = L;

const S = { start: 36.9, end: 50.8 };
const OPEN = 37.1, ANCHOR = 47.4, OUT = 50.0;
const VERS = [
  { n: '01', t: OPEN, k: 0, tag: null },
  { n: '02', t: 40.6, k: 0.1, cold: 0.45, tag: '光线' },
  { n: '03', t: 41.6, k: 0.4, tag: '站位' },
  { n: '05', t: 42.6, k: 0.72, tag: '天气' },
  { n: '07', t: 43.6, k: 1, tag: '外套的颜色' },
];
const IW = 900, IH = IW * 9 / 16, CX = 960, CY = 430;

function img(v) {
  return L.snapshotV(`file${v.n}`, L.version(v.k, { cold: v.cold || 0 }), v.k >= 0.5 ? 'memory' : 'photo');
}
function current(d) { let i = 0; VERS.forEach((v, j) => { if (d >= v.t) i = j; }); return i; }

function windowFrame(ctx, v, alpha, saving) {
  ctx.save();
  ctx.globalAlpha *= alpha;
  // 档案夹：深色纸板、标签页
  ctx.shadowColor = 'rgba(0,0,0,0.7)'; ctx.shadowBlur = 40; ctx.shadowOffsetY = 16;
  ctx.fillStyle = '#231d18';
  ctx.beginPath(); ctx.roundRect(-IW / 2 - 30, -IH / 2 - 30, IW + 60, IH + 100, 10); ctx.fill();
  ctx.shadowColor = 'transparent';
  ctx.beginPath(); ctx.roundRect(-IW / 2 - 30, -IH / 2 - 92, 360, 70, [10, 10, 0, 0]); ctx.fill();
  ctx.strokeStyle = 'rgba(200,180,150,0.22)'; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.roundRect(-IW / 2 - 30, -IH / 2 - 30, IW + 60, IH + 100, 10); ctx.stroke();
  ctx.font = FONT.enMed(40);
  ctx.letterSpacing = '3px';
  ctx.fillStyle = '#e6dac2';
  ctx.fillText(`memory_${v.n}`, -IW / 2 - 4, -IH / 2 - 42);
  ctx.drawImage(img(v), -IW / 2, -IH / 2, IW, IH);
  ctx.strokeStyle = 'rgba(0,0,0,0.5)'; ctx.strokeRect(-IW / 2, -IH / 2, IW, IH);
  // 底部：保存状态
  ctx.letterSpacing = '2px';
  ctx.font = FONT.body(30);
  ctx.fillStyle = '#b8ab94';
  ctx.fillText(saving ? '正在保存……' : '上次保存：刚刚', -IW / 2, IH / 2 + 50);
  ctx.restore();
}

function draw(ctx, d) {
  const a = smooth(prog(d, 36.9, OPEN + 0.5)) * (1 - smooth(prog(d, OUT, OUT + 0.6)));
  if (a <= 0) return;
  const i = current(d);
  const anchor = smooth(prog(d, ANCHOR - 0.2, ANCHOR + 0.6));
  const fan = smooth(prog(d, 44.8, 46.0));
  const s = (0.96 + 0.04 * smooth(prog(d, 36.9, OPEN + 0.6))) * (1 - 0.1 * anchor);
  ctx.save();
  ctx.globalAlpha = a * (1 - 0.72 * anchor);
  ctx.translate(CX, CY);
  ctx.scale(s, s);
  // 旧版本压在后面：越旧越暗、越靠后
  for (let j = 0; j < i; j++) {
    const back = i - j;
    const off = back * (22 + 34 * fan);
    ctx.save();
    ctx.translate(-off, -off * 0.7);
    ctx.globalAlpha *= Math.max(0.15, 0.7 - back * 0.14);
    ctx.rotate(-back * 0.012 * (1 + fan));
    windowFrame(ctx, VERS[j], 1, false);
    ctx.fillStyle = 'rgba(12,9,7,0.45)'; ctx.fillRect(-IW / 2 - 30, -IH / 2 - 92, IW + 60, IH + 162);
    ctx.restore();
  }
  // 当前版本：每次保存时轻轻往前一推
  const v = VERS[i];
  const since = d - v.t;
  const bump = i > 0 ? Math.exp(-since * 6) * 0.025 : 0;
  ctx.save();
  ctx.scale(1 + bump, 1 + bump);
  windowFrame(ctx, v, 1, i > 0 && since < 0.3);
  // 保存瞬间：上一版本在新画面上残留一下
  if (i > 0 && since < 0.35) {
    ctx.globalAlpha = 1 - since / 0.35;
    ctx.drawImage(img(VERS[i - 1]), -IW / 2 + 12, -IH / 2, IW, IH);
  }
  ctx.restore();
  // 已修改：……
  if (v.tag) {
    const ta = smooth(prog(d, v.t + 0.15, v.t + 0.4)) * (1 - anchor);
    ctx.save();
    ctx.globalAlpha *= ta;
    ctx.font = FONT.body(34);
    ctx.letterSpacing = '3px';
    ctx.textAlign = 'right';
    ctx.fillStyle = '#e8dcc4';
    ctx.fillText(`已修改：${v.tag}`, IW / 2, IH / 2 + 52);
    const w = ctx.measureText(`已修改：${v.tag}`).width;
    ctx.fillStyle = '#a5342a';
    ctx.beginPath(); ctx.arc(IW / 2 - w - 22, IH / 2 + 40, 8, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  }
  ctx.restore();
}

// 中央定论：画在光照之后，保持暖白
function drawOver(ctx, d) {
  const anchor = smooth(prog(d, ANCHOR - 0.2, ANCHOR + 0.6));
  L.anchorWord(ctx, '其实，你是在重建。', { y: 560, size: 104, alpha: anchor * (1 - smooth(prog(d, OUT, OUT + 0.6))), spacing: 14, seed: 4 });
}

function light(d) {
  const anchor = smooth(prog(d, ANCHOR - 0.2, ANCHOR + 0.6));
  const out = 1 - smooth(prog(d, OUT, OUT + 0.6));
  return [
    { x: CX, y: CY, rx: 1000, ry: 640, i: (1 - 0.5 * anchor) * out, color: [246, 210, 168] },
    { x: W / 2, y: 540, rx: 900, ry: 380, i: 0.6 * anchor * out, color: [255, 214, 170] },
  ];
}
function grade() { return { warm: 0.1, ambient: 0.3 }; }

module.exports = { ...S, draw, drawOver, light, grade };
