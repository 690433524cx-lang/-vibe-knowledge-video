// 第九幕 · 65.9–72.8 秒：大脑根据线索，重新拼出一个「像真的版本」。
//   回忆被切成一块块碎片，散在黑暗里，一块块飞回来拼成完整的画面。
//   拼好以后接缝还在发微光；其中两块来自另一个版本（藏青色的衣角、晴天的窗）——拼得很像，但不对。
const L = require('../lib');
const { W, H, rng, lerp, clamp, prog, smooth } = L;

const S = { start: 65.8, end: 72.9 };
const COLS = 6, ROWS = 4, PW = 1120, PH = PW * 9 / 16, CX = 960, CY = 440;
const WRONG = new Set(['2,2', '4,1']);

// 抖动的网格顶点（共享，拼回去严丝合缝）
const R = rng(909);
const V = [];
for (let j = 0; j <= ROWS; j++) {
  V.push([]);
  for (let i = 0; i <= COLS; i++) {
    const edge = i === 0 || j === 0 || i === COLS || j === ROWS;
    V[j].push([i / COLS * W + (edge ? 0 : (R() - 0.5) * 120), j / ROWS * H + (edge ? 0 : (R() - 0.5) * 100)]);
  }
}
const SHARDS = [];
for (let j = 0; j < ROWS; j++) for (let i = 0; i < COLS; i++) {
  const poly = [V[j][i], V[j][i + 1], V[j + 1][i + 1], V[j + 1][i]];
  const cx = poly.reduce((s, p) => s + p[0], 0) / 4, cy = poly.reduce((s, p) => s + p[1], 0) / 4;
  SHARDS.push({ poly, cx, cy, wrong: WRONG.has(`${i},${j}`), t: 66.3 + R() * 2.4, dx: (R() - 0.5) * 2600, dy: (R() - 0.5) * 1500, rot: (R() - 0.5) * 2.4 });
}

function draw(ctx, d) {
  const a = smooth(prog(d, 65.9, 66.3)) * (1 - smooth(prog(d, 72.2, 72.8)));
  if (a <= 0) return;
  const mem = L.snapshot(1, 'memory');
  const tru = L.snapshotV('wrongPiece', L.version(0, { rain: 0 }), 'memory');
  const sc = PW / W;
  ctx.save();
  ctx.globalAlpha = a;
  ctx.translate(CX, CY);
  ctx.scale(sc, sc);
  ctx.translate(-W / 2, -H / 2);
  for (const s of SHARDS) {
    const k = L.spring(d, s.t, 0.9, 0.9);
    if (d < s.t - 2) continue;
    const appear = smooth(prog(d, s.t - 0.6, s.t));
    ctx.save();
    ctx.globalAlpha = a * appear;
    ctx.translate(s.cx + s.dx * (1 - k), s.cy + s.dy * (1 - k));
    ctx.rotate(s.rot * (1 - k));
    ctx.scale(0.7 + 0.3 * k, 0.7 + 0.3 * k);
    ctx.translate(-s.cx, -s.cy);
    ctx.beginPath();
    s.poly.forEach((p, i) => (i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1])));
    ctx.closePath();
    ctx.save();
    ctx.clip();
    ctx.drawImage(s.wrong ? tru : mem, 0, 0);
    ctx.restore();
    // 接缝的微光：拼好以后还在
    ctx.strokeStyle = `rgba(255,214,160,${0.18 + 0.22 * k})`;
    ctx.lineWidth = 3 / sc;
    ctx.stroke();
    ctx.restore();
  }
  ctx.restore();
}

function light(d) {
  const k = smooth(prog(d, 66.3, 69.0));
  return [{ x: CX, y: CY, rx: lerp(1500, 900, k), ry: lerp(900, 600, k), i: 1.0 * (1 - smooth(prog(d, 72.2, 72.8))), color: [246, 206, 160] }];
}
function grade() { return { warm: 0.15, ambient: 0.3 }; }

module.exports = { ...S, draw, light, grade };
