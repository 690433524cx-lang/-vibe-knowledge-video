// 第六幕 · 45.6–56.6 秒：成年以后的重复。
//   同一个机位、同一张办公桌，连拍五天（MON … FRI，日期印和童年用的是同一种）。
//   画面几乎不变：只有杯子挪了一点、窗外的光差一点。
//   53.6 起五天的画面半透明叠在一起，慢慢重合成一张；中央出现锚词「重复」。
const { createCanvas } = require('@napi-rs/canvas');
const L = require('../lib');
const { W, H, FONT, rng, noise1, lerp, clamp, prog, smooth } = L;

const S = { start: 45.5, end: 56.9 };
const D0 = 45.6, DD = 1.6, OV = 53.6, ANCHOR = 54.8;
const DAYS = ['MON', 'TUE', 'WED', 'THU', 'FRI'];

// 一天：侧面，人坐在桌前打字；窗在左边，显示器在右边
function day(ctx, i, lt) {
  const r = rng(700 + i);
  ctx.fillStyle = '#3c4448';
  ctx.fillRect(0, 0, W, H);
  // 窗：白天的城市（每天的天色差一点点）
  const sk = ctx.createLinearGradient(0, 120, 0, 700);
  sk.addColorStop(0, ['#8a98a4', '#8e9aa2', '#86949e', '#8c9aa6', '#909ca2'][i]);
  sk.addColorStop(1, '#b8c0c2');
  ctx.fillStyle = sk;
  ctx.fillRect(120, 120, 620, 580);
  L.blurred(ctx, 5, (c) => {
    c.fillStyle = '#6a7680';
    for (let k = 0; k < 6; k++) c.fillRect(140 + k * 100, 420 - (k % 3) * 70, 80, 300);
  });
  ctx.fillStyle = '#2c3236';
  ctx.fillRect(110, 110, 640, 16); ctx.fillRect(110, 694, 640, 16); ctx.fillRect(110, 110, 16, 600); ctx.fillRect(734, 110, 16, 600); ctx.fillRect(422, 110, 12, 600);
  // 桌子
  ctx.fillStyle = '#5a5e60';
  ctx.fillRect(820, 690, 1100, 22);
  ctx.fillStyle = '#44484a';
  ctx.fillRect(860, 712, 20, 400); ctx.fillRect(1840, 712, 20, 400);
  // 显示器（侧面看过去的一点亮面）
  ctx.fillStyle = '#16191b';
  ctx.fillRect(1440, 380, 40, 300); ctx.fillRect(1400, 670, 140, 20);
  ctx.fillStyle = 'rgba(190,210,230,0.75)';
  ctx.fillRect(1430, 392, 10, 276);
  // 杯子：每天的位置差一点
  const cx = 1600 + (r() - 0.5) * 60;
  ctx.fillStyle = '#d6d2c8';
  ctx.fillRect(cx, 620, 56, 70);
  ctx.fillStyle = '#4a3a2e';
  ctx.fillRect(cx + 6, 624, 44, 10);
  // 人：同一个坐姿，手在键盘上
  const tap = Math.sin(lt * 22) * 3;
  L.lit(ctx, (c) => {
    c.fillStyle = '#1e2124';
    c.fillRect(1000, 760, 200, 20); c.fillRect(1010, 470, 24, 300); c.fillRect(1090, 780, 20, 300);
    c.translate(1100, 760);
    L.side(c, { h: 760, kind: 'adult', f: 1, pose: {
      torso: 0.18, neck: 0.15, head: 0.02 + Math.sin(lt * 0.8 + i) * 0.015,
      reachN: [250, -86 + tap], handN: 1.6, reachF: [240, -90 - tap], handF: 1.6,
      thighN: 1.5, shinN: 0.05, thighF: 1.45, shinF: 0.0, footN: 1.57, footF: 1.57,
    } });
  }, { light: 0.2, rim: [200, 220, 240], rimA: 0.8, shadow: 0.4, ambient: 0.92, bbox: [900, 200, 600, 900] });
  // 键盘
  ctx.fillStyle = '#26292c';
  ctx.fillRect(1290, 680, 150, 12);
}

const BUF = Array.from({ length: 5 }, () => createCanvas(W, H));
function draw(ctx, d) {
  if (d < OV) {
    const i = Math.min(4, Math.floor((d - D0) / DD));
    day(ctx, Math.max(0, i), d - D0 - Math.max(0, i) * DD);
    return;
  }
  // 五天叠在一起：先错开一点，再慢慢重合
  const t = d - OV;
  const merge = smooth(prog(t, 0.6, 2.4));
  const offs = [[-50, -16], [40, 10], [-24, 26], [60, -24], [0, 0]];
  ctx.fillStyle = '#2c3236';
  ctx.fillRect(0, 0, W, H);
  BUF.forEach((b, i) => {
    const x = b.getContext('2d');
    x.setTransform(1, 0, 0, 1, 0, 0);
    x.clearRect(0, 0, W, H);
    day(x, i, 1.2 + t * 0.6 + i * 0.3);
    ctx.save();
    ctx.globalAlpha = smooth(prog(t, i * 0.08, i * 0.08 + 0.3)) * (i === 0 ? 1 : 1 / (i + 1) + 0.15);
    ctx.drawImage(b, offs[i][0] * (1 - merge), offs[i][1] * (1 - merge));
    ctx.restore();
  });
  // 重合以后：变暗、褪色
  ctx.fillStyle = `rgba(20,22,24,${0.45 * smooth(prog(t, 1.2, 2.6))})`;
  ctx.fillRect(0, 0, W, H);
}

function drawOver(ctx, d) {
  if (d < OV) {
    const i = Math.max(0, Math.min(4, Math.floor((d - D0) / DD)));
    L.dateStamp(ctx, DAYS[i], { alpha: smooth(prog(d - D0 - i * DD, 0.03, 0.15)) });
  } else {
    L.dateStamp(ctx, 'MON – FRI', { alpha: 1 - smooth(prog(d, OV + 0.8, OV + 1.6)) });
  }
  const a = smooth(prog(d, ANCHOR, ANCHOR + 0.5)) * (1 - smooth(prog(d, 56.2, 56.7)));
  L.anchorWord(ctx, '重复', { alpha: a, size: 140, y: 260, seed: 601, spacing: 40 });
}

function light(d) {
  return [{ x: 900, y: 480, rx: 1300, ry: 800, i: 0.95, color: [175, 195, 220] }];
}
function grade(d) { return { warm: -0.3, ambient: 0.38 }; }

module.exports = { ...S, draw, drawOver, light, grade };
