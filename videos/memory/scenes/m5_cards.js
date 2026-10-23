// 第五幕 · 33.0–37.2 秒：三段生活片段缩成桌上的三张卡片。
//   每张下面手写「你记得的版本」，然后一条暗红线依次划掉——「一个一个，都对不上」。
//   最后三张卡片收拢成一叠，沉进暗处（接「文件」）。
const L = require('../lib');
const life = require('./m4_life');
const { W, H, FONT, lerp, clamp, prog, smooth } = L;

const S = { start: 33.0, end: 37.3 };
const CARDS = [
  { img: () => life.grad(true), note: '我站在最左边', x: 400, rot: -0.04 },
  { img: () => life.chat(), note: '他说：随便你', x: 960, rot: 0.02 },
  { img: () => life.party(1), note: '所有人都在看我', x: 1520, rot: -0.015 },
];
const CW = 470, Y = 420, STRIKE = [34.3, 34.85, 35.4], GATHER = 36.2;

function draw(ctx, d) {
  const a = smooth(prog(d, 33.1, 33.6)) * (1 - smooth(prog(d, 36.7, 37.2)));
  if (a <= 0) return;
  const g = smooth(prog(d, GATHER, GATHER + 0.8));
  CARDS.forEach((c, i) => {
    const enter = L.spring(d, 33.1 + i * 0.12, 1.8, 0.85);
    const x = lerp(c.x, 960 + (i - 1) * 14, g), y = lerp(Y + (1 - enter) * 60, 440 + (i - 1) * 10, g);
    ctx.save();
    ctx.globalAlpha = a * clamp(enter * 1.2);
    ctx.translate(x, y);
    ctx.rotate(lerp(c.rot, (i - 1) * 0.03, g));
    L.print(ctx, c.img(), CW, { border: 14, seed: 30 + i });
    // 你记得的版本（手写）→ 被暗红线划掉
    const na = 1 - g;
    if (na > 0.01) {
      ctx.globalAlpha = a * na;
      ctx.font = FONT.hand(46);
      ctx.textAlign = 'center';
      ctx.fillStyle = '#e8dcc4';
      ctx.shadowColor = 'rgba(0,0,0,0.6)'; ctx.shadowBlur = 8;
      ctx.fillText(c.note, 0, 210);
      ctx.shadowBlur = 0;
      const w = ctx.measureText(c.note).width + 20;
      const k = prog(d, STRIKE[i], STRIKE[i] + 0.3);
      if (k > 0) {
        ctx.strokeStyle = '#a5342a'; ctx.lineWidth = 5; ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(-w / 2, 198); ctx.lineTo(-w / 2 + w * k, 192 - 4 * k); ctx.stroke();
      }
    }
    ctx.restore();
  });
}

function light(d) {
  const g = smooth(prog(d, GATHER, GATHER + 0.8));
  return [{ x: 960, y: 470, rx: lerp(1350, 700, g), ry: lerp(600, 520, g), i: 1.0 * (1 - smooth(prog(d, 36.7, 37.2))), color: [255, 204, 150] }];
}
function grade() { return { warm: 0.12, ambient: 0.3 }; }

module.exports = { ...S, draw, light, grade };
