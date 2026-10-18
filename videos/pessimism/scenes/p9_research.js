// 第九幕 · T+5.7 – 78.8 秒：第一次正式进入心理学。
//   「最坏」缩小，落在一页心理研究档案上，成为一个被红铅笔圈住的关键词。台灯从暗处把这页纸照亮。
//   档案标题：EXPLANATORY STYLE / 解释风格。不像课堂，像翻到了一份旧档案。
//   73.6 起 Martin Seligman 人物页（约 5 秒）：左侧约 40% 是真实的黑白肖像（照片待导入时显示标注明确的相片位），
//   右侧 MARTIN SELIGMAN / Psychologist / EXPLANATORY STYLE / 「他研究过人如何解释失败。」
const { W, H } = require('../../../src/config');
const { FONT } = require('../../../src/lib/style');
const { prog, smooth, lerp, rng } = require('../../../src/lib/util');
const { sheet, inkText } = require('../../../src/lib/material');
const { sketchEllipse } = require('../../../src/lib/draw');
const { dossier } = require('../../choice/scenes/c7_scholar');
const worst = require('./p8_worst');

const T0 = worst.SHRINK_T;           // 72.2（随 MAIN_BEAT_T 移动）
const SEL_T = 73.6, SEL_END = 78.75;
const PAGE = { x: 960, y: 560, w: 1180, h: 1500, rot: -0.012 };

const page = {
  start: T0 + 0.2, end: SEL_T + 0.7,
  draw(ctx, t) {
    const a = smooth(prog(t, T0 + 0.25, T0 + 0.85)) * (1 - smooth(prog(t, SEL_T + 0.1, SEL_T + 0.6)));
    if (a <= 0) return;
    ctx.save();
    ctx.globalAlpha *= a;
    ctx.fillStyle = '#211a14';
    ctx.fillRect(0, 0, W, H);
    ctx.save();
    ctx.translate(PAGE.x, PAGE.y + 360);
    ctx.rotate(PAGE.rot);
    sheet(ctx, PAGE.w, PAGE.h, { seed: 909, tone: 'cream', light: -2.2, lift: 0.1, shade: 0.5, crease: true });
    ctx.restore();
    // 页面上的字（屏幕坐标，页面几乎不转）
    inkText(ctx, 'EXPLANATORY STYLE', 470, 250, { font: FONT.type(54), color: '#2a2420', seed: 911, wear: 0.5, spacing: 4 });
    inkText(ctx, '解释风格', 470, 316, { font: FONT.serif(40), color: '#3a3029', seed: 912, wear: 0.3, spacing: 6 });
    ctx.fillStyle = 'rgba(60,50,42,0.5)';
    ctx.fillRect(470, 346, 980, 2);
    const r = rng(913);
    for (let i = 0; i < 9; i++) {
      const y = 410 + i * 46;
      const len = i === 8 ? 420 : 900 - r() * 160;
      if (i === 1) {
        // 这一行里有那个关键词（暗红的「最坏」由上一幕缩小落在这里）
        ctx.fillRect(470, y, 640, 9);
        ctx.fillRect(worst.KEY.x + 60, y, 260, 9);
        continue;
      }
      ctx.fillRect(470, y, len, 9);
    }
    // 关键词：「最坏」落定以后，红铅笔把它圈住
    if (t > T0 + 1.1) inkText(ctx, '最坏', worst.KEY.x, worst.KEY.y + 17, { font: FONT.serifBlack(50), color: '#741f19', seed: 914, wear: 0.4, spacing: 6, align: 'center' });
    sketchEllipse(ctx, worst.KEY.x, worst.KEY.y, 78, 40, { t, seed: 915, width: 3, color: 'rgba(150,40,30,0.85)', progress: prog(t, T0 + 1.2, T0 + 1.6), passes: 2, pressure: 0.5 });
    // 页脚
    inkText(ctx, 'FILE · 悲观主义 / 03', 470, 1010, { font: FONT.type(22), color: 'rgba(60,50,42,0.7)', seed: 916, wear: 0.4 });
    ctx.restore();
  },
  light(t) {
    const w = smooth(prog(t, T0 + 0.2, T0 + 0.9)) * (1 - smooth(prog(t, SEL_T + 0.1, SEL_T + 0.6)));
    return [{ x: 900, y: 460, rx: 950, ry: 620, i: 0.95, w, color: [255, 214, 160], core: 0.3 }];
  },
  grade() { return { warm: 0.25, ambient: 0.1 }; },
};

const seligman = dossier({
  start: SEL_T, end: SEL_END, side: 'left', file: 'martin_seligman', seed: 61, litSide: 1, focus: [0.5, 0.33], zoom: 1,
  name: 'MARTIN SELIGMAN', role: 'Psychologist', work: 'EXPLANATORY STYLE',
  cn: '他研究过人如何解释失败。',
  credit: 'Photo: D. Myles Cullen / U.S. Army · Public domain · via Wikimedia Commons',
});

module.exports = { page, seligman, SEL_END };
