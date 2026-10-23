// 第二幕 · 11.8–15.95 秒：一双手正在做选择（桌面俯视特写）。
//   11.8  光收在 A 的两只手上；账单夹合着，在手的右上方
//   12.3  右手食指在桌布上敲了两下
//   12.9  手伸向账单夹，停在它前面一点，悬着——犹豫
//   14.0  手落下，把账单夹推向桌子另一边
//   14.75 手收回去
//   15.2  桌面开始旋转、退远；账单夹自己翻开，¥1260 浮起来，停在画面中央（接三扇门）
const L = require('../lib');
const { W, H, FONT, lerp, clamp, prog, smooth, track, spring } = L;
const { drawInsert, insertLights } = require('../insert');

const S = { start: 11.8, end: 15.95 };

function state(d) {
  const t = d - S.start;
  const tap = Math.max(0, Math.sin(Math.PI * prog(d, 12.3, 12.55))) + Math.max(0, Math.sin(Math.PI * prog(d, 12.6, 12.85)));
  const reach = smooth(prog(d, 12.95, 13.6));
  const hover = smooth(prog(d, 13.45, 13.7)) * (1 - smooth(prog(d, 13.95, 14.1)));
  const push = smooth(prog(d, 14.05, 14.7));
  const back = smooth(prog(d, 14.75, 15.3));
  const rot = smooth(prog(d, 15.15, 15.95));
  const wrist = L.mix(L.mix(L.mix([620, 1040], [830, 880], reach), [1060, 860], push), [520, 1180], back);
  return {
    t,
    cam: { cx: lerp(900, 980, rot), cy: lerp(640, 560, rot), s: lerp(1.16 + t * 0.012, 0.86, rot), rot: -0.55 * rot * rot },
    folder: {
      x: lerp(1080, 1340, push), y: lerp(560, 600, push), sc: 1.05, rot: lerp(-0.02, 0.1, push),
      open: 0.62 * smooth(prog(d, 15.2, 15.6)), amountGlow: smooth(prog(d, 15.4, 15.7)), amountA: 1 - smooth(prog(d, 15.45, 15.55)),
    },
    handR: { x: wrist[0], y: wrist[1], rot: 0.62 - 0.12 * push + 0.15 * back, s: 1.4, index: tap * 0.6, curl: 0.25 * hover + 0.15 * back, lift: 0.5 * hover + 0.55 * back + 0.2 * reach * (1 - push) },
    handL: { x: 300 + 14 * smooth(prog(d, 13.5, 14.0)), y: 960, rot: 0.32, s: 1.36, curl: 0.15 + 0.25 * smooth(prog(d, 13.4, 13.9)) * (1 - smooth(prog(d, 14.8, 15.2))), lift: 0 },
    phone: { x: 1650, y: 820, rot: 0.3 },
    spot: [lerp(700, 1000, push), 820, 520],
    lightW: 1 - 0.85 * smooth(prog(d, 15.35, 15.9)),
  };
}

function draw(ctx, d) {
  const st = state(d);
  drawInsert(ctx, st);
  // 镜头退远时，桌面沉进黑暗
  const fade = smooth(prog(d, 15.3, 15.92));
  if (fade > 0) { ctx.fillStyle = `rgba(10,8,7,${0.92 * fade})`; ctx.fillRect(0, 0, W, H); }
}

// 浮起来的金额（第三幕从同一个位置、同一个大小接走）
const NUM = { x: W / 2, y: 470, size: 150 };
function amount(ctx, x, y, size, a, glowK = 1) {
  if (a <= 0.01) return;
  ctx.save();
  ctx.globalAlpha = a;
  ctx.font = FONT.serifBlack(size);
  ctx.letterSpacing = `${Math.round(size * 0.04)}px`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.shadowColor = `rgba(255,190,120,${0.55 * glowK})`;
  ctx.shadowBlur = size * 0.35;
  ctx.fillStyle = '#efe4cc';
  ctx.fillText('¥1260', x, y);
  ctx.restore();
}
function drawOver(ctx, d) {
  const k = smooth(prog(d, 15.45, 15.95));
  if (k <= 0) return;
  // 从小票上「¥1260」的位置飘到画面中央
  const st = state(d), f = st.folder;
  const sw = 560 * 0.74, sh = 380 * 1.12;
  const lx = (sw / 2 - 20 - 75) * f.sc, ly = (-sh / 2 + 314) * f.sc;
  const c = Math.cos(f.rot), s = Math.sin(f.rot);
  const [px, py, ss] = L.camPt(st.cam, f.x + lx * c - ly * s, f.y + lx * s + ly * c);
  const x = lerp(px, NUM.x, k), y = lerp(py, NUM.y, k);
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate((st.cam.rot + f.rot) * (1 - k));
  amount(ctx, 0, 0, lerp(54 * f.sc * ss, NUM.size, k), smooth(prog(d, 15.45, 15.55)), k);
  ctx.restore();
}

function light(d) { return insertLights(state(d)); }
function grade() { return { warm: 0.2, ambient: 0.3 }; }

module.exports = { ...S, draw, drawOver, light, grade, amount, NUM };
