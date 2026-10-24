// B · 12.4 秒起：名字「入睡抽动」。中央停留约 1.25 秒，13.65 s 缩到左上角，成为全片的小标签。
const L = require('../lib');
const { FONT, G, lerp, prog, smooth, easeOut, easeInOut } = L;

const S = { start: 12.3, end: 112 };
const IN = 12.4, MOVE0 = 13.65, MOVE1 = 14.15;
const PX = 168, TAG_PX = 28;
const CY = 548;

// 片尾和某些段落里，小标签让位（之后的段落按需追加）
const HIDE = [[112.0, 200]];

function draw(ctx, d) {
  const k = easeInOut(prog(d, MOVE0, MOVE1));
  ctx.save();
  ctx.font = FONT.sansMed(PX);
  ctx.letterSpacing = '14px';
  const tw = ctx.measureText('入睡抽动').width;
  ctx.restore();
  const s = lerp(1, TAG_PX / PX, k);
  const cx = lerp(960, 120 + (tw * TAG_PX) / PX / 2, k);
  const cy = lerp(CY, 96, k);
  let hide = 0;
  for (const [h0, h1] of HIDE) hide = Math.max(hide, smooth(prog(d, h0 - 0.4, h0)) * (1 - smooth(prog(d, h1, h1 + 0.4))));
  const a = smooth(prog(d, IN, IN + 0.15)) * lerp(1, 0.62, k) * (1 - hide);
  if (a <= 0.003) return;

  ctx.save();
  ctx.translate(cx, cy);
  ctx.scale(s, s);
  ctx.translate(0, (1 - easeOut(prog(d, IN, IN + 0.3))) * 5);
  L.text(ctx, '入睡抽动', 0, 0, { font: FONT.sansMed(PX), color: G.head, a, ls: 14 });
  // 细金线由中间向两侧生长；英文在下方
  const big = 1 - smooth(prog(d, MOVE0, MOVE0 + 0.3));
  const rw = 620 * easeOut(prog(d, IN + 0.15, IN + 0.65));
  if (rw > 1 && big > 0) L.goldStroke(ctx, () => { ctx.beginPath(); ctx.moveTo(-rw / 2, 56); ctx.lineTo(rw / 2, 56); ctx.stroke(); }, { a: a * big * 0.9, w: 1.5 / s, glow: 8 });
  L.text(ctx, 'HYPNIC JERK', 0, 118, { font: FONT.interSemi(30), color: G.gold, a: a * big * smooth(prog(d, IN + 0.3, IN + 0.6)), ls: 10 });
  L.text(ctx, 'SLEEP START', 0, 158, { font: FONT.inter(20), color: G.grey, a: a * big * smooth(prog(d, IN + 0.5, IN + 0.8)), ls: 8 });
  ctx.restore();

  // 小标签旁的英文
  const ta = smooth(prog(d, MOVE1 - 0.1, MOVE1 + 0.3)) * 0.6 * (1 - hide);
  L.text(ctx, 'HYPNIC JERK', 120 + (tw * TAG_PX) / PX + 18, 94, { font: FONT.inter(15), color: G.gold, a: ta, align: 'left', ls: 4 });
}

module.exports = { ...S, draw, HIDE };
