// 第十二幕 · 92.2–100.8 秒：一页笔记。三栏：必须满足 / 可以接受 / 不重要。
// 「哪个最好？」被铅笔划掉；换一个问题：我最重要的三个条件是什么？三个空格，一个一个打上勾。
// 后半段的画面越来越干净：只有一张纸、一盏灯、几行字。
const { W, H } = require('../../../src/config');
const { C, FONT } = require('../../../src/lib/style');
const { pencil } = require('../../../src/lib/draw');
const { prog, smooth, easeInOut, lerp } = require('../../../src/lib/util');
const { spring } = require('../../../src/lib/motion');
const { sheet, inkText } = require('../../../src/lib/material');

const S = { start: 92.1, end: 101.4 };
const PAGE = { x: 900, y: 500, w: 980, h: 660, rot: -0.022 };

function lines(ctx) {
  ctx.strokeStyle = 'rgba(70,90,110,0.14)';
  ctx.lineWidth = 1;
  for (let y = -PAGE.h / 2 + 130; y < PAGE.h / 2 - 30; y += 56) {
    ctx.beginPath(); ctx.moveTo(-PAGE.w / 2 + 10, y); ctx.lineTo(PAGE.w / 2 - 10, y); ctx.stroke();
  }
  ctx.strokeStyle = 'rgba(125,35,28,0.28)';
  ctx.beginPath(); ctx.moveTo(-PAGE.w / 2 + 78, -PAGE.h / 2 + 6); ctx.lineTo(-PAGE.w / 2 + 78, PAGE.h / 2 - 6); ctx.stroke();
}

function draw(ctx, t) {
  const k = spring(t, 92.1, 0.9, 0.95);
  const out = 1 - smooth(prog(t, 100.6, 101.4));
  const push = 1 + 0.04 * smooth(prog(t, 93, 100.6));
  ctx.save();
  ctx.globalAlpha *= Math.min(1, k * 1.4) * out;
  ctx.translate(PAGE.x, PAGE.y + (1 - Math.min(1, k)) * 40);
  ctx.scale(push, push);
  ctx.rotate(PAGE.rot);
  sheet(ctx, PAGE.w, PAGE.h, { seed: 2101, tone: 'bone', light: -2.4, lift: 0.06, shade: 0.5 });
  lines(ctx);
  const x0 = -PAGE.w / 2 + 110;
  // 三栏
  const cols = [['必须满足', x0], ['可以接受', x0 + 300], ['不重要', x0 + 590]];
  cols.forEach(([s, x], i) => {
    const a = smooth(prog(t, 92.6 + i * 0.15, 93.0 + i * 0.15));
    inkText(ctx, s, x, -PAGE.h / 2 + 98, { font: FONT.body(28), color: '#3a3029', seed: 2110 + i, wear: 0.4, spacing: 4, alpha: a });
  });
  // 哪个最好？—— 划掉
  const qa = prog(t, 93.6, 94.2);
  if (qa > 0) {
    ctx.save();
    ctx.font = FONT.hand(66);
    const w = ctx.measureText('哪个最好？').width;
    ctx.beginPath(); ctx.rect(x0 - 6, -100, (w + 12) * Math.min(1, qa * 1.3), 120); ctx.clip();
    ctx.fillStyle = '#2f2722';
    ctx.fillText('哪个最好？', x0, -6);
    ctx.restore();
    ctx.font = FONT.hand(66);
    const w2 = ctx.measureText('哪个最好？').width;
    pencil(ctx, [[x0 - 10, -30], [x0 + w2 * 0.5, -36], [x0 + w2 + 12, -28]], { seed: 2120, t, width: 3.2, color: 'rgba(40,32,26,0.85)', progress: easeInOut(prog(t, 94.3, 94.8)), pressure: 0.7 });
  }
  // 换一个问题
  inkText(ctx, '我最重要的三个条件是什么？', x0, 84, { font: FONT.serif(38), color: '#231c17', seed: 2130, wear: 0.35, spacing: 3, alpha: smooth(prog(t, 95.0, 95.6)) });
  // 三个空格 + 勾
  for (let i = 0; i < 3; i++) {
    const y = 160 + i * 56;
    const a = smooth(prog(t, 95.8 + i * 0.15, 96.2 + i * 0.15));
    ctx.save();
    ctx.globalAlpha *= a;
    ctx.strokeStyle = 'rgba(48,40,34,0.6)';
    ctx.lineWidth = 1.4;
    ctx.strokeRect(x0, y - 26, 30, 30);
    ctx.restore();
    inkText(ctx, `条件 ${i + 1}`, x0 + 52, y, { font: FONT.body(28), color: '#4a3d33', seed: 2140 + i, wear: 0.3, spacing: 3, alpha: a });
    pencil(ctx, [[x0 + 170, y + 4], [x0 + 470, y + 2]], { seed: 2150 + i, t, width: 1.2, color: 'rgba(48,40,34,0.5)', progress: a, passes: 1 });
    const ck = prog(t, 96.4 + i * 0.5, 96.6 + i * 0.5);
    if (ck > 0) pencil(ctx, [[x0 + 4, y - 12], [x0 + 13, y - 1], [x0 + 34, y - 34]], { seed: 2160 + i, t, width: 3, color: 'rgba(40,32,26,0.9)', progress: ck, passes: 1, pressure: 0.7 });
  }
  ctx.restore();
}

function light(t) {
  const warm = smooth(prog(t, 99.0, 100.2));
  return [{ x: 820, y: 470, rx: 860, ry: 560, i: lerp(0.95, 1.05, warm), w: smooth(prog(t, 92.1, 92.8)) * (1 - smooth(prog(t, 100.6, 101.4))), rot: 0.15 }];
}
function grade(t) { return { warm: 0.35, ambient: 0.16 }; }

module.exports = { ...S, draw, light, grade };
