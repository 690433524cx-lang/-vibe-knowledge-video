// K · 105.6–114.6 秒：回到开头那一条金色水平线。
//   这一次不再断裂：线上依次是 清醒 → 困倦 → 睡眠，下面还是那个很淡的平躺人体（不抽动）。
//   金色位置点从左向右稳定移动，平稳进入睡眠区。
//   111.8 起其余元素淡出，中央只剩「入睡抽动 / HYPNIC JERK / 发生在清醒与睡眠之间。」，停约 2 s。
const L = require('../lib');
const { FONT, G, rgba, lerp, prog, smooth, easeOut, easeInOut } = L;

const S = { start: 105.6, end: 114.6 };
const LN = { x0: 200, x1: 1720, y: 400 };
const ST = [{ zh: '清醒', en: 'AWAKE', u: 0.06 }, { zh: '困倦', en: 'DROWSY', u: 0.5 }, { zh: '睡眠', en: 'SLEEP', u: 0.94 }];
const FADE0 = 111.8, TITLE = 112.3;

function draw(ctx, d) {
  const fade = 1 - smooth(prog(d, FADE0, FADE0 + 0.8));
  const a = smooth(prog(d, 105.8, 106.4)) * fade;
  if (a > 0.003) {
    // 线从左到右长出来
    L.grow(ctx, [[LN.x0, LN.y], [LN.x1, LN.y]], easeInOut(prog(d, 105.8, 106.6)), { a: a, w: 1.8, glow: 10, color: [226, 180, 102], tip: false });
    ST.forEach((s, i) => {
      const x = lerp(LN.x0, LN.x1, s.u), t = 106.2 + i * 0.25;
      L.node(ctx, x, LN.y, { r: 7.5, a: a * (i === 2 ? 0.8 : 1), pop: prog(d, t, t + 0.3), hollow: i === 2 });
      L.label(ctx, s.zh, s.en, x, LN.y - 36, { a: a * smooth(prog(d, t + 0.1, t + 0.4)), zhPx: 44, enPx: 18, gap: 80 });
    });
    L.body(ctx, 660, 800, { a: 0.36 * a * smooth(prog(d, 106.0, 106.8)), scale: 1.15 });
    // 位置点：稳定地走进睡眠区，进入后光变柔
    const u = lerp(0.06, 0.94, easeInOut(prog(d, 106.7, 111.6)));
    const soft = smooth(prog(d, 110.6, 111.8));
    const x = lerp(LN.x0, LN.x1, u);
    L.node(ctx, x, LN.y, { r: 9.75 * (1 - 0.15 * soft), a: a * smooth(prog(d, 106.4, 106.7)), color: G.brightRGB });
    if (soft > 0) L.ripple(ctx, lerp(LN.x0, LN.x1, 0.94), LN.y, d, 111.6, { dur: 1.2, r0: 12, r1: 70, w: 1.2 });
  }
  // 标题：与第 13 秒标题页同一套设计
  const ta = smooth(prog(d, TITLE, TITLE + 0.4));
  if (ta > 0.003) {
    const y = 520;
    L.text(ctx, '入睡抽动', 960, y, { font: FONT.sansMed(168), color: G.head, a: ta, ls: 14 });
    const rw = 620 * easeOut(prog(d, TITLE + 0.2, TITLE + 0.7));
    L.goldStroke(ctx, () => { ctx.beginPath(); ctx.moveTo(960 - rw / 2, y + 56); ctx.lineTo(960 + rw / 2, y + 56); ctx.stroke(); }, { a: ta * 0.9, w: 1.5, glow: 8 });
    L.text(ctx, 'HYPNIC JERK', 960, y + 118, { font: FONT.interSemi(30), color: G.gold, a: ta * smooth(prog(d, TITLE + 0.3, TITLE + 0.6)), ls: 10 });
    L.text(ctx, '发生在清醒与睡眠之间。', 960, y + 196, { font: FONT.sans(34), color: G.text, a: ta * smooth(prog(d, TITLE + 0.6, TITLE + 1.0)) * 0.85, ls: 4 });
  }
}

module.exports = { ...S, draw };
