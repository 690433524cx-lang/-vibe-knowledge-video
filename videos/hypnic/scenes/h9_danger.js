// J · 97.6–106.0 秒：危险吗？
//   上一张图收拢熄灭，中央只剩「危险吗？」，停 0.5 s（声音也空一下）。
//   一条竖线向下，分成左右两路：
//     左：偶尔发生 → 常见 → 通常无需担心（暖白 + 金）
//     右：非常频繁 / 严重影响睡眠 / 白天出现异常抽动 / 伴随其他异常症状 → 建议专业评估
//         （只用极少量暗红：条目前的小点和最后一个节点的外圈）
const L = require('../lib');
const { FONT, G, rgba, lerp, prog, smooth, easeOut, easeInOut } = L;

const S = { start: 97.6, end: 106.1 };
const RED = [168, 71, 59];
const Q = [960, 230];
const LX = 600, RX = 1320, FY = 360;
const LEFT = [{ t: '偶尔发生', y: 450, at: 99.0 }, { t: '常见', y: 555, at: 99.45 }, { t: '通常无需担心', y: 668, at: 99.9, gold: true }];
const RIGHT = [{ t: '非常频繁', y: 445 }, { t: '严重影响睡眠', y: 500 }, { t: '白天出现异常抽动', y: 555 }, { t: '伴随其他异常症状', y: 610 }];
const R0 = 100.6, RSTEP = 0.3, REF = 102.3;

function arrow(ctx, x, y0, y1, a, col) {
  L.goldStroke(ctx, () => {
    ctx.beginPath(); ctx.moveTo(x, y0); ctx.lineTo(x, y1);
    ctx.moveTo(x - 6, y1 - 8); ctx.lineTo(x, y1); ctx.lineTo(x + 6, y1 - 8);
    ctx.stroke();
  }, { a, w: 1.6, glow: 4, color: col });
}

function draw(ctx, d) {
  const a = 1 - smooth(prog(d, 105.4, 106.05));
  if (a <= 0.003) return;
  const qa = smooth(prog(d, 97.75, 98.0)) * a;
  L.text(ctx, '危险吗？', Q[0], Q[1], { font: FONT.sansMed(84), color: G.head, a: qa, ls: 8 });
  // 竖线 + 分叉
  L.grow(ctx, [[Q[0], Q[1] + 40], [Q[0], FY]], easeInOut(prog(d, 98.4, 98.7)), { a: 0.85 * a });
  L.node(ctx, Q[0], FY, { r: 6, a, pop: prog(d, 98.65, 98.9) });
  L.grow(ctx, [[Q[0], FY], [LX, FY], [LX, LEFT[0].y - 52]], easeOut(prog(d, 98.7, 99.05)), { a: 0.8 * a });
  L.grow(ctx, [[Q[0], FY], [RX, FY], [RX, RIGHT[0].y - 52]], easeOut(prog(d, 100.25, 100.6)), { a: 0.8 * a, color: [200, 168, 120] });
  // 左路
  LEFT.forEach((it, i) => {
    const ia = smooth(prog(d, it.at, it.at + 0.3)) * a;
    if (i > 0) arrow(ctx, LX, LEFT[i - 1].y + 22, it.y - 58, ia * 0.8);
    L.text(ctx, it.t, LX, it.y, { font: it.gold ? FONT.sansMed(50) : FONT.sans(44), color: it.gold ? G.bright : G.text, a: ia, ls: 3, glow: it.gold ? 8 : 0 });
  });
  // 右路：条目逐条出现，前面一个暗红小点
  RIGHT.forEach((it, i) => {
    const t = R0 + i * RSTEP, ia = smooth(prog(d, t, t + 0.3)) * a;
    ctx.save(); ctx.font = FONT.sans(36); ctx.letterSpacing = '2px'; const w = ctx.measureText(it.t).width; ctx.restore();
    L.node(ctx, RX - w / 2 - 22, it.y - 12, { r: 4.5, a: ia, color: RED });
    L.text(ctx, it.t, RX, it.y, { font: FONT.sans(36), color: G.text, a: ia, ls: 2 });
  });
  const ra = smooth(prog(d, REF, REF + 0.3)) * a;
  arrow(ctx, RX, RIGHT[3].y + 20, 668, ra * 0.8, [200, 168, 120]);
  L.node(ctx, RX, 692, { r: 7, a: ra, color: RED, ring: ra, hollow: true });
  L.text(ctx, '建议专业评估', RX, 750, { font: FONT.sansMed(46), color: G.head, a: ra, ls: 3 });
}

module.exports = { ...S, draw };
