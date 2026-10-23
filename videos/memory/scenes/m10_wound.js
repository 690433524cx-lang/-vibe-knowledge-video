// 第十幕 · 72.6–89.3 秒：你放不下的，也许不是那件事，而是那个版本。
//   72.6  回到那间客厅，冷了一点；妈妈那句话浮出来：「你怎么又这样。」
//   75.6  台灯下一张考卷：红叉、圈起来的 58。
//   78.5  真正发生的：同一个客厅、同一句话——很小、很平常。
//   81.7  同一段回忆被反复播放四遍：一遍比一遍冷、锐、近；那句话越来越大、越来越重，
//         暗红的划线和批注一层层堆上去（「她就是这样」「每次都是」「从来没变过」）。
//   85.5  被批注淹没的这一帧退远、沉进黑暗（接 T）。
const L = require('../lib');
const { W, H, FONT, rng, noise1, lerp, clamp, prog, smooth } = L;
const { sheet } = require('../../../src/lib/material');

const S = { start: 72.5, end: 89.4 };
const W1 = 72.6, W2 = 75.6, W3 = 78.5, W4 = 81.7, PASS = 0.95, W5 = W4 + PASS * 4, END = 89.2;
const LINE = '「你怎么又这样。」';
const NOTES = [
  { p: 1, text: '她就是这样', x: 1300, y: 640, rot: -0.08 },
  { p: 2, text: '每次都是', x: 330, y: 300, rot: 0.06 },
  { p: 3, text: '从来没变过', x: 1460, y: 820, rot: -0.04 },
];

function room(ctx, img, push, cx = 900, cy = 450) {
  ctx.save();
  ctx.translate(cx, cy); ctx.scale(push, push); ctx.translate(-cx, -cy);
  ctx.drawImage(img, 0, 0, W, H);
  ctx.restore();
}
function quote(ctx, size, o = {}) {
  const { x = 1240, y = 330, alpha = 1, color = '#ece2cd', font = FONT.body, under = 0, echo = 0 } = o;
  ctx.save();
  ctx.globalAlpha *= alpha;
  ctx.font = font(size);
  ctx.letterSpacing = `${Math.round(size * 0.08)}px`;
  ctx.textAlign = 'center';
  ctx.shadowColor = 'rgba(0,0,0,0.75)'; ctx.shadowBlur = 16;
  for (let e = echo; e >= 1; e--) {
    ctx.globalAlpha = alpha * 0.18 / e;
    ctx.fillStyle = color;
    ctx.fillText(LINE, x + e * size * 0.08, y + e * size * 0.06);
  }
  ctx.globalAlpha = alpha;
  ctx.fillStyle = color;
  ctx.fillText(LINE, x, y);
  if (under > 0) {
    const w = ctx.measureText(LINE).width;
    ctx.shadowBlur = 0;
    ctx.strokeStyle = '#a5342a'; ctx.lineCap = 'round';
    for (let u = 0; u < under; u++) {
      ctx.lineWidth = 4 + u * 2;
      ctx.beginPath(); ctx.moveTo(x - w / 2, y + size * 0.25 + u * 12); ctx.lineTo(x + w / 2, y + size * 0.22 + u * 12 + (u % 2 ? 4 : -3)); ctx.stroke();
    }
  }
  ctx.restore();
}

// 第 p 遍（0..3）：越来越冷、越锐、越近
function pass(ctx, d, p, t0) {
  const lt = d - t0;
  const img = L.snapshotV(`wound${p}`, L.version(1, { cold: 0.3 + 0.18 * p }), 'memory');
  ctx.save();
  ctx.filter = `contrast(${(1 + 0.16 * p).toFixed(2)}) saturate(${(1 - 0.12 * p).toFixed(2)})`;
  room(ctx, img, 1.0 + 0.06 * p + lt * 0.03, 860, 440);
  ctx.restore();
  // 四周一遍比一遍收紧
  const vg = ctx.createRadialGradient(860, 440, 200 - p * 20, 860, 440, 1100 - p * 160);
  vg.addColorStop(0, 'rgba(8,7,8,0)'); vg.addColorStop(1, `rgba(8,7,8,${0.35 + p * 0.15})`);
  ctx.fillStyle = vg; ctx.fillRect(0, 0, W, H);
  if (p >= 2) L.crayonCircle(ctx, 770, 520, 120, 260, 1, { seed: 60 + p, width: 5 + p, color: 'rgba(165,52,42,0.85)' });
  quote(ctx, 46 + 18 * p, { font: p >= 2 ? FONT.serif : FONT.body, under: p, echo: p, y: 300 - p * 10 });
  for (const n of NOTES) {
    if (n.p > p) continue;
    ctx.save();
    ctx.translate(n.x, n.y); ctx.rotate(n.rot);
    ctx.font = FONT.hand(58 + 8 * (p - n.p));
    ctx.fillStyle = 'rgba(178,58,44,0.95)';
    ctx.shadowColor = 'rgba(0,0,0,0.7)'; ctx.shadowBlur = 10;
    ctx.fillText(n.text, 0, 0);
    ctx.restore();
  }
  // 换遍时：放映机闪一下
  if (lt < 0.07) { ctx.fillStyle = 'rgba(6,5,5,0.7)'; ctx.fillRect(0, 0, W, H); }
}

function exam(ctx, d) {
  ctx.save();
  ctx.translate(960, 470 + (1 - smooth(prog(d, W2, W2 + 0.5))) * 30);
  ctx.rotate(-0.045);
  sheet(ctx, 640, 820, { seed: 77, tone: 'warm', lift: 0.15 });
  ctx.fillStyle = 'rgba(60,50,40,0.5)';
  ctx.fillRect(-260, -330, 300, 16);
  ctx.fillRect(-260, -290, 200, 10);
  const r = rng(12);
  for (let i = 0; i < 9; i++) {
    const y = -200 + i * 62;
    ctx.fillStyle = 'rgba(60,50,40,0.32)';
    ctx.fillRect(-250, y, 300 + r() * 160, 9);
    ctx.fillRect(-250, y + 20, 160 + r() * 200, 9);
    if ([1, 3, 4, 6, 8].includes(i)) {
      const k = prog(d, W2 + 0.3 + i * 0.07, W2 + 0.45 + i * 0.07);
      ctx.strokeStyle = '#a5342a'; ctx.lineWidth = 6; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(200, y - 14); ctx.lineTo(200 + 40 * k, y - 14 + 40 * k); ctx.stroke();
      if (k > 0.5) { ctx.beginPath(); ctx.moveTo(240, y - 14); ctx.lineTo(240 - 40 * (k - 0.5) * 2, y - 14 + 40 * (k - 0.5) * 2); ctx.stroke(); }
    }
  }
  const sk = smooth(prog(d, W2 + 1.0, W2 + 1.4));
  ctx.globalAlpha *= sk;
  ctx.font = FONT.hand(150);
  ctx.fillStyle = '#9e3127';
  ctx.fillText('58', 110, -250);
  L.crayonCircle(ctx, 190, -300, 120, 90, prog(d, W2 + 1.3, W2 + 1.7), { seed: 5, width: 6, color: 'rgba(158,49,39,0.9)' });
  ctx.restore();
}

function draw(ctx, d) {
  // W1：冷了一点的客厅 + 那句话
  const a1 = smooth(prog(d, W1 - 0.1, W1 + 0.4)) * (1 - smooth(prog(d, W2 - 0.3, W2 + 0.1)));
  if (a1 > 0) {
    ctx.save(); ctx.globalAlpha = a1;
    room(ctx, L.snapshotV('wound-a', L.version(1, { cold: 0.25 }), 'memory'), 1.0 + 0.03 * prog(d, W1, W2));
    quote(ctx, 48, { alpha: a1 * smooth(prog(d, W1 + 0.8, W1 + 1.3)) });
    ctx.restore();
  }
  // W2：考卷
  const a2 = smooth(prog(d, W2 - 0.2, W2 + 0.3)) * (1 - smooth(prog(d, W3 - 0.3, W3 + 0.1)));
  if (a2 > 0) { ctx.save(); ctx.globalAlpha = a2; exam(ctx, d); ctx.restore(); }
  // W3：真正发生的——很普通
  const a3 = smooth(prog(d, W3 - 0.2, W3 + 0.4)) * (1 - smooth(prog(d, W4 - 0.1, W4)));
  if (a3 > 0) {
    ctx.save(); ctx.globalAlpha = a3;
    room(ctx, L.snapshot(0, 'photo'), 1.0 + 0.02 * prog(d, W3, W4));
    quote(ctx, 34, { alpha: a3 * 0.75, color: '#bcb2a2', x: 1060, y: 330 });
    ctx.restore();
  }
  // W4：一遍又一遍
  if (d >= W4 && d < W5) {
    const p = Math.min(3, Math.floor((d - W4) / PASS));
    pass(ctx, d, p, W4 + p * PASS);
  }
  // W5：退远、沉进黑暗
  if (d >= W5 && d < END + 0.2) {
    const k = smooth(prog(d, W5, END - 0.6));
    const s = lerp(1, 0.42, k);
    ctx.save();
    ctx.translate(W / 2, H / 2 - 40 * k); ctx.scale(s, s); ctx.translate(-W / 2, -H / 2);
    ctx.beginPath(); ctx.rect(0, 0, W, H); ctx.clip();
    pass(ctx, d, 3, W5 - 1);
    ctx.restore();
    ctx.fillStyle = `rgba(8,7,6,${0.75 * smooth(prog(d, W5 + 1.2, END))})`;
    ctx.fillRect(0, 0, W, H);
  }
}

function light(d) {
  const inExam = smooth(prog(d, W2 - 0.2, W2 + 0.3)) * (1 - smooth(prog(d, W3 - 0.3, W3 + 0.1)));
  const fade = 1 - smooth(prog(d, W5 + 0.6, END));
  return [
    { x: 860, y: 520, rx: 1150, ry: 780, i: 0.95 * (1 - inExam) * fade, color: [220, 212, 204] },
    { x: 960, y: 470, rx: 760, ry: 700, i: 0.85 * inExam, color: [255, 204, 150] },
  ];
}
function grade(d) { return { warm: d > W4 ? -0.15 : 0.05, ambient: 0.3 }; }

module.exports = { ...S, draw, light, grade };
