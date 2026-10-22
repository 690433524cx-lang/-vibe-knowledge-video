// 第七幕 · 56.6–65.0 秒：365 页。
//   俯拍深色桌面：一整年的日历纸一页页铺开（真实的纸，不是卡通翻页）。
//   前面几十页有照片、有铅笔记号；越往后越空。
//   「三个月，像三个星期」：前 90 页互相压到一起，只剩二十来叠。
//   「一年，像刚刚开始」：整年继续压缩，365 → 70 → 30 → 12，只剩几张有画面的纸；环境声变低，画面收暗。
//   T-1.0 快速收拢，T-0.5 几乎全部消失，T-0.2 接近静止的暗场。
const L = require('../lib');
const { W, H, FONT, rng, noise1, lerp, clamp, prog, smooth } = L;
const { DESIGN_T } = require('../../../src/config');

const S = { start: 56.5, end: DESIGN_T + 0.05 };
const P0 = 56.6;
const COLS = 26, ROWS = 14, PWD = 52, PHT = 62, GX = 6, GY = 6;
const OX = (W - COLS * (PWD + GX)) / 2, OY = (H - ROWS * (PHT + GY)) / 2 - 10;

const R = rng(1365);
// 哪些天有画面：前面多，后面越来越少；最后留下的 12 张一定有画面
const PAGES = Array.from({ length: 365 }, (_, i) => {
  const density = i < 60 ? 0.55 : i < 150 ? 0.16 : 0.05;
  return { i, pic: R() < density, mark: R() < density * 0.8, col: ['#c08a5a', '#7a9a8a', '#c0a060', '#8a6a9a', '#6a8aa8', '#b06a5a'][Math.floor(R() * 6)], rot: (R() - 0.5) * 0.06 };
});
const KEEP = [3, 11, 19, 30, 44, 58, 77, 120, 168, 230, 301, 352];
KEEP.forEach((i) => { PAGES[i].pic = true; });
const FIRST_Q = []; // 前 90 页的 21 个落点（三个星期）
for (let k = 0; k < 21; k++) FIRST_Q.push(Math.round((k / 21) * 90));

const grid = (i) => [OX + (i % COLS) * (PWD + GX) + PWD / 2, OY + Math.floor(i / COLS) * (PHT + GY) + PHT / 2];
const finalPos = (k) => [W / 2 + (k - 5.5) * 118, H / 2 - 30];

// 每一页在时间 d 的位置、大小、透明度
function pageState(p, d) {
  const appear = smooth(prog(d, P0 + p.i * 0.0034, P0 + p.i * 0.0034 + 0.25));
  let [x, y] = grid(p.i);
  // 第一段：前 90 页压成 21 叠
  const q1 = smooth(prog(d, 58.8, 60.6));
  if (p.i < 90 && q1 > 0) {
    const k = Math.min(20, Math.floor((p.i / 90) * 21));
    const [tx, ty] = grid(FIRST_Q[k]);
    x = lerp(x, tx, q1); y = lerp(y, ty, q1);
  }
  // 第二段：整年压到 12 张
  const q2 = smooth(prog(d, 61.5, 63.6));
  let keep = KEEP.indexOf(p.i);
  if (q2 > 0) {
    let k = keep;
    if (k < 0) { k = 0; while (k < 11 && KEEP[k + 1] <= p.i) k++; }
    const [tx, ty] = finalPos(k);
    x = lerp(x, tx, q2); y = lerp(y, ty, q2);
  }
  const s = q2 > 0 && keep >= 0 ? lerp(1, 1.5, q2) : 1;
  let a = appear;
  if (keep < 0) a *= 1 - smooth(prog(q2, 0.6, 1)); // 没画面的那些，最后被吸进去
  // T 之前收拢、消失
  const end = smooth(prog(d, DESIGN_T - 1.0, DESIGN_T - 0.5));
  x = lerp(x, W / 2, end); y = lerp(y, H / 2 - 30, end);
  a *= 1 - end;
  return { x, y, s: s * (1 - end * 0.8), a };
}

function page(ctx, p, st, d) {
  if (st.a <= 0.01) return;
  ctx.save();
  ctx.translate(st.x, st.y);
  ctx.rotate(p.rot);
  ctx.scale(st.s, st.s);
  ctx.globalAlpha *= st.a;
  ctx.fillStyle = 'rgba(0,0,0,0.35)';
  ctx.fillRect(-PWD / 2 + 2, -PHT / 2 + 3, PWD, PHT);
  ctx.fillStyle = '#d8d0bc';
  ctx.fillRect(-PWD / 2, -PHT / 2, PWD, PHT);
  ctx.fillStyle = 'rgba(120,96,70,0.25)';
  ctx.fillRect(-PWD / 2, -PHT / 2, PWD, 6);
  ctx.fillStyle = '#5a4a3e';
  ctx.font = FONT.en(14);
  ctx.textAlign = 'left';
  ctx.fillText(String((p.i % 30) + 1), -PWD / 2 + 4, -PHT / 2 + 20);
  if (p.pic) {
    // 一小张照片
    ctx.fillStyle = p.col;
    ctx.fillRect(-PWD / 2 + 6, -PHT / 2 + 26, PWD - 12, PHT - 34);
    ctx.fillStyle = 'rgba(255,240,210,0.35)';
    ctx.fillRect(-PWD / 2 + 6, -PHT / 2 + 26, PWD - 12, (PHT - 34) * 0.45);
    ctx.fillStyle = 'rgba(30,24,20,0.5)';
    ctx.beginPath(); ctx.arc(-4, PHT / 2 - 18, 6, 0, Math.PI * 2); ctx.fill();
  } else if (p.mark) {
    ctx.strokeStyle = 'rgba(70,56,46,0.6)';
    ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.ellipse(6, 4, 14, 10, 0.2, 0, Math.PI * 2); ctx.stroke();
  }
  ctx.restore();
}

function draw(ctx, d) {
  // 深色桌面
  ctx.drawImage(L.wallTex(W, H, [46, 36, 30], 771, { cells: 7 }), 0, 0);
  const r = rng(772);
  ctx.strokeStyle = 'rgba(20,14,10,0.35)';
  ctx.lineWidth = 2;
  for (let i = 0; i < 40; i++) { const y = r() * H; ctx.beginPath(); ctx.moveTo(0, y); ctx.bezierCurveTo(600, y + 6, 1300, y - 6, W, y + 3); ctx.stroke(); }
  // 有画面的画在上面
  const order = PAGES.slice().sort((a, b) => (a.pic === b.pic ? a.i - b.i : a.pic ? 1 : -1));
  for (const p of order) page(ctx, p, pageState(p, d), d);
}

// 数字只是一闪：365 → 70 → 30 → 12
function drawOver(ctx, d) {
  let n = null;
  if (d > 57.6 && d < 61.5) n = '365';
  else if (d >= 61.5 && d < 62.2) n = '70';
  else if (d >= 62.2 && d < 62.9) n = '30';
  else if (d >= 62.9 && d < DESIGN_T - 0.9) n = '12';
  if (!n) return;
  const a = smooth(prog(d, 57.6, 58.0)) * (1 - smooth(prog(d, DESIGN_T - 1.2, DESIGN_T - 0.9)));
  L.dateStamp(ctx, n, { alpha: a * 0.9, x: W - 150, y: 140, size: 44 });
}

// 光：越往后越暗，最后只照着中间
function light(d) {
  const dim = smooth(prog(d, 61.5, DESIGN_T - 0.3));
  return [{ x: 960, y: 520, rx: lerp(1400, 700, dim), ry: lerp(860, 420, dim), i: lerp(1, 0.55, dim), core: 0.35 }];
}
function grade(d) { return { warm: 0.15, ambient: lerp(0.4, 0.15, smooth(prog(d, 61.5, DESIGN_T - 0.3))) }; }

module.exports = { ...S, draw, drawOver, light, grade };
