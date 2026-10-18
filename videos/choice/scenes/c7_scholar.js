// 人物档案（第七幕 Barry Schwartz / 第十一幕 Herbert Simon）：纪录片式的人物介绍。
// 肖像只占画面一侧约 35%，被画面边缘裁掉一部分，另一侧大量留黑，只有很小的排版。
// 授权照片暂时无法下载（见 docs/choice/sources.md），这里用剪影肖像代替，不伪造照片。
const { createCanvas } = require('@napi-rs/canvas');
const { W, H } = require('../../../src/config');
const { FONT } = require('../../../src/lib/style');
const { prog, smooth, lerp, rng } = require('../../../src/lib/util');
const { spring } = require('../../../src/lib/motion');
const { silverGrain, inkText } = require('../../../src/lib/material');

// 剪影肖像：侧面、头肩，一侧受光、一侧沉入黑暗
function makePortrait(facing, seed) {
  const w = 720, h = 1080;
  const c = createCanvas(w, h);
  const x = c.getContext('2d');
  // 背景：摄影棚的灰，受光一侧亮
  const bg = x.createLinearGradient(facing > 0 ? 0 : w, 0, facing > 0 ? w : 0, 0);
  bg.addColorStop(0, '#1a1714');
  bg.addColorStop(0.65, '#4a443c');
  bg.addColorStop(1, '#2a2622');
  x.fillStyle = bg;
  x.fillRect(0, 0, w, h);
  const r = rng(seed);
  x.save();
  if (facing < 0) { x.translate(w, 0); x.scale(-1, 1); }
  // 侧脸 + 颈 + 肩（朝右）
  x.beginPath();
  x.moveTo(40, h);
  x.bezierCurveTo(60, 860, 150, 800, 250, 780);
  x.bezierCurveTo(300, 770, 320, 720, 318, 680);
  x.bezierCurveTo(330, 640, 360, 640, 380, 610);
  x.bezierCurveTo(398, 588, 392, 566, 405, 548);
  x.bezierCurveTo(420, 530, 432, 520, 428, 500);
  x.bezierCurveTo(424, 486, 440, 476, 436, 456);
  x.bezierCurveTo(432, 440, 448, 430, 452, 412);
  x.bezierCurveTo(456, 398, 440, 392, 438, 380);
  x.bezierCurveTo(436, 340, 430, 300, 400, 262);
  x.bezierCurveTo(360, 212, 290, 196, 230, 208);
  x.bezierCurveTo(160, 222, 118, 280, 112, 350);
  x.bezierCurveTo(106, 420, 130, 480, 150, 530);
  x.bezierCurveTo(166, 580, 160, 640, 150, 700);
  x.bezierCurveTo(110, 760, 20, 820, -20, 880);
  x.lineTo(-20, h);
  x.closePath();
  x.fillStyle = '#0d0b0a';
  x.fill();
  // 轮廓光：沿着脸的一侧
  x.save();
  x.clip();
  x.globalCompositeOperation = 'lighter';
  x.filter = 'blur(10px)';
  x.strokeStyle = 'rgba(210,190,160,0.55)';
  x.lineWidth = 12;
  x.beginPath();
  x.moveTo(250, 780); x.bezierCurveTo(300, 770, 320, 720, 318, 680);
  x.bezierCurveTo(330, 640, 360, 640, 380, 610); x.bezierCurveTo(398, 588, 392, 566, 405, 548);
  x.bezierCurveTo(420, 530, 432, 520, 428, 500); x.bezierCurveTo(424, 486, 440, 476, 436, 456);
  x.bezierCurveTo(432, 440, 448, 430, 452, 412); x.bezierCurveTo(456, 398, 440, 392, 438, 380);
  x.bezierCurveTo(436, 340, 430, 300, 400, 262);
  x.stroke();
  x.restore();
  x.restore();
  // 银盐颗粒 + 暗角，让它像一张放大的旧照片局部
  silverGrain(x, 0, 0, w, h, 0.9, seed);
  const vg = x.createRadialGradient(w * 0.55, h * 0.45, h * 0.2, w * 0.55, h * 0.45, h * 0.8);
  vg.addColorStop(0, 'rgba(0,0,0,0)');
  vg.addColorStop(1, 'rgba(0,0,0,0.6)');
  x.fillStyle = vg;
  x.fillRect(0, 0, w, h);
  void r;
  return c;
}

const PORTRAITS = { schwartz: makePortrait(1, 31), simon: makePortrait(-1, 47) };

// side: 'left'（肖像在左）或 'right'；lines: 排版内容
function dossier(o) {
  const { start, end, side, portrait, name, role, work, cn } = o;
  const img = PORTRAITS[portrait];
  const S = { start, end };
  const inK = (t) => spring(t, start, 0.55, 1.0);            // 人物档案：慢
  const outK = (t) => smooth(prog(t, end - 0.6, end));
  const draw = (ctx, t) => {
    const k = Math.min(1, inK(t)), out = outK(t);
    const pw = 680;
    ctx.save();
    // 肖像：从画面外滑进来，靠画面边缘裁切；内侧边缘融进黑暗
    const x0 = side === 'left' ? lerp(-pw, -40, k) - out * 120 : lerp(W, W - pw + 40, k) + out * 120;
    const push = 1 + 0.03 * prog(t, start, end);
    ctx.globalAlpha *= (1 - out);
    ctx.save();
    ctx.beginPath();
    ctx.rect(x0, 0, pw, H);
    ctx.clip();
    ctx.translate(x0 + pw / 2, H / 2);
    ctx.scale(push, push);
    ctx.drawImage(img, -img.width / 2, -img.height / 2);
    ctx.restore();
    const fx = side === 'left' ? x0 + pw : x0;
    const g = ctx.createLinearGradient(side === 'left' ? fx - 220 : fx + 220, 0, fx, 0);
    g.addColorStop(0, 'rgba(14,12,10,0)');
    g.addColorStop(1, 'rgba(14,12,10,1)');
    ctx.fillStyle = g;
    ctx.fillRect(side === 'left' ? fx - 220 : fx, 0, 220, H);
    // 排版：很小，大量留白
    const tx = side === 'left' ? 900 : 300;
    const a1 = smooth(prog(t, start + 0.5, start + 1.1));
    const a2 = smooth(prog(t, start + 0.8, start + 1.4));
    const a3 = smooth(prog(t, start + 1.1, start + 1.8));
    inkText(ctx, name, tx, 430, { font: FONT.enMed(44), color: '#e9dfcb', seed: 1701, wear: 0.15, spacing: 9, alpha: a1 });
    inkText(ctx, role, tx, 486, { font: FONT.enItalic(30), color: '#bdb19c', seed: 1702, wear: 0.1, spacing: 1, alpha: a2 });
    ctx.fillStyle = `rgba(200,184,156,${0.5 * a2})`;
    ctx.fillRect(tx, 530, 64, 1);
    inkText(ctx, work, tx, 588, { font: FONT.en(26), color: '#cbbfa8', seed: 1703, wear: 0.1, spacing: 7, alpha: a3 });
    if (cn) inkText(ctx, cn, tx, 650, { font: FONT.body(28), color: '#a99c86', seed: 1704, wear: 0.1, spacing: 3, alpha: a3 });
    ctx.restore();
  };
  const light = (t) => [
    { x: side === 'left' ? 420 : W - 420, y: 470, rx: 520, ry: 640, i: 0.9, w: smooth(prog(t, start, start + 0.6)) * (1 - outK(t)), color: [235, 222, 200] },
    { x: side === 'left' ? 1150 : 650, y: 560, rx: 640, ry: 420, i: 0.5, w: smooth(prog(t, start + 0.4, start + 1.2)) * (1 - outK(t)) },
  ];
  const grade = () => ({ warm: -0.05, ambient: 0.08 });
  return { ...S, draw, light, grade };
}

const schwartz = dossier({
  start: 64.3, end: 68.3, side: 'left', portrait: 'schwartz',
  name: 'BARRY SCHWARTZ', role: 'Psychologist', work: 'THE PARADOX OF CHOICE  ·  2004',
  cn: '讨论过：更多选择，可能带来更多焦虑与后悔。',
});
const simon = dossier({
  start: 88.4, end: 92.6, side: 'right', portrait: 'simon',
  name: 'HERBERT A. SIMON', role: 'Economist  ·  Decision Scientist', work: 'SATISFICING  ·  1956',
  cn: '满意解：不求最好，找到足够好的就停下。',
});

module.exports = { schwartz, simon };
