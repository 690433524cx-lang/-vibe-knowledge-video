// 第八幕 · 58.2–66.0 秒：心理学实验（档案卡，不放人名、不放照片）。
//   问卷 A：「两辆车 碰到 的时候，车速大概有多快？」→「碰到」被暗红线划掉，上面手写「猛撞」；
//          右边的事故示意图随之变重：车身变形、冲击线变大、「回忆中的车速」那一条变长。
//   问卷 B（一周后）：「你看到碎玻璃了吗？」→「看到了」被打勾；示意图里浮出本来没有的碎玻璃。
const L = require('../lib');
const { W, H, FONT, rng, lerp, clamp, prog, smooth } = L;
const { sheet } = require('../../../src/lib/material');

const S = { start: 58.1, end: 66.2 };
const SWAP = 59.3, CARD2 = 62.3, CHECK = 63.2, GLASS = 63.5;
const CW = 800, CH = 470;
const INK = '#2a241f';

function cardA(ctx, d) {
  sheet(ctx, CW, CH, { seed: 61, tone: 'warm', lift: 0.2 });
  ctx.fillStyle = '#6a5e50';
  ctx.font = FONT.body(28); ctx.letterSpacing = '3px';
  ctx.fillText('心理学实验 · 问卷 A', -CW / 2 + 50, -CH / 2 + 70);
  ctx.fillStyle = 'rgba(60,50,40,0.3)'; ctx.fillRect(-CW / 2 + 50, -CH / 2 + 90, CW - 100, 2);
  ctx.font = FONT.body(50); ctx.letterSpacing = '4px';
  ctx.fillStyle = INK;
  const x0 = -CW / 2 + 50, y1 = 10;
  let w = ctx.measureText('两辆车 ').width;
  ctx.fillText('两辆车 ', x0, y1);
  const word = '碰到';
  const ww = ctx.measureText(word).width;
  ctx.fillText(word, x0 + w, y1);
  ctx.fillText(' 的时候，', x0 + w + ww, y1);
  ctx.fillText('车速大概有多快？', x0, y1 + 90);
  // 换词
  const k = prog(d, SWAP, SWAP + 0.3);
  if (k > 0) {
    ctx.strokeStyle = '#a5342a'; ctx.lineWidth = 6; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(x0 + w - 6, y1 - 16); ctx.lineTo(x0 + w - 6 + (ww + 12) * k, y1 - 18); ctx.stroke();
    const h = smooth(prog(d, SWAP + 0.25, SWAP + 0.7));
    ctx.save();
    ctx.beginPath(); ctx.rect(x0 + w - 20, y1 - 140, (ww + 80) * h, 100); ctx.clip();
    ctx.font = FONT.hand(64); ctx.fillStyle = '#9e3127';
    ctx.fillText('猛撞', x0 + w - 4, y1 - 64);
    ctx.restore();
  }
  // 答案横线
  ctx.fillStyle = 'rgba(60,50,40,0.35)'; ctx.fillRect(x0, y1 + 150, 320, 2);
  ctx.font = FONT.body(30); ctx.fillStyle = '#6a5e50'; ctx.fillText('km/h', x0 + 330, y1 + 148);
}

function cardB(ctx, d) {
  sheet(ctx, CW, CH, { seed: 62, tone: 'warm', lift: 0.3 });
  ctx.fillStyle = '#6a5e50';
  ctx.font = FONT.body(28); ctx.letterSpacing = '3px';
  ctx.fillText('一周后 · 问卷 B', -CW / 2 + 50, -CH / 2 + 70);
  ctx.fillStyle = 'rgba(60,50,40,0.3)'; ctx.fillRect(-CW / 2 + 50, -CH / 2 + 90, CW - 100, 2);
  ctx.font = FONT.body(50); ctx.letterSpacing = '4px'; ctx.fillStyle = INK;
  const x0 = -CW / 2 + 50;
  ctx.fillText('你看到碎玻璃了吗？', x0, 0);
  ctx.font = FONT.body(44);
  const box = (bx, label) => {
    ctx.strokeStyle = INK; ctx.lineWidth = 3; ctx.strokeRect(bx, 70, 40, 40);
    ctx.fillText(label, bx + 60, 106);
  };
  box(x0, '看到了');
  box(x0 + 300, '没有');
  const k = prog(d, CHECK, CHECK + 0.3);
  if (k > 0) {
    ctx.strokeStyle = '#a5342a'; ctx.lineWidth = 7; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(x0 + 4, 88);
    const p1 = [x0 + 18, 106], p2 = [x0 + 52, 56];
    if (k < 0.4) ctx.lineTo(lerp(x0 + 4, p1[0], k / 0.4), lerp(88, p1[1], k / 0.4));
    else { ctx.lineTo(p1[0], p1[1]); const u = (k - 0.4) / 0.6; ctx.lineTo(lerp(p1[0], p2[0], u), lerp(p1[1], p2[1], u)); }
    ctx.stroke();
  }
}

// 事故示意图（俯视，铅笔线）。heavy：0 = 碰到，1 = 猛撞
function diagram(ctx, d, heavy, glass) {
  ctx.save();
  ctx.strokeStyle = 'rgba(228,218,200,0.85)'; ctx.lineWidth = 3; ctx.lineJoin = 'round';
  // 路
  ctx.strokeStyle = 'rgba(228,218,200,0.25)';
  ctx.beginPath(); ctx.moveTo(-300, -40); ctx.lineTo(300, -40); ctx.moveTo(-300, 120); ctx.lineTo(300, 120);
  ctx.moveTo(-40, -260); ctx.lineTo(-40, -40); ctx.moveTo(120, -260); ctx.lineTo(120, -40); ctx.stroke();
  ctx.strokeStyle = 'rgba(228,218,200,0.85)';
  // 车 A（横向开来）和车 B（纵向开来）
  const dent = 22 * heavy;
  const car = (cx, cy, w, h, rot, front) => {
    ctx.save(); ctx.translate(cx, cy); ctx.rotate(rot);
    ctx.beginPath();
    ctx.moveTo(-w / 2, -h / 2); ctx.lineTo(w / 2 - (front ? dent : 0), -h / 2);
    ctx.lineTo(w / 2 - (front ? dent * 1.6 : 0), 0); ctx.lineTo(w / 2 - (front ? dent * 0.4 : 0), h / 2);
    ctx.lineTo(-w / 2, h / 2); ctx.closePath(); ctx.stroke();
    ctx.strokeRect(-w / 2 + 30, -h / 2 + 10, 40, h - 20);
    ctx.restore();
  };
  car(-150 + 20 * heavy, 40, 170, 80, heavy * 0.25, true);
  car(40, -120 + 18 * heavy, 170, 80, Math.PI / 2 - heavy * 0.2, true);
  // 冲击线
  const n = 6 + Math.round(8 * heavy), R = 30 + 50 * heavy;
  ctx.strokeStyle = heavy > 0.3 ? 'rgba(178,58,44,0.9)' : 'rgba(228,218,200,0.7)';
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2;
    ctx.beginPath(); ctx.moveTo(-20 + Math.cos(a) * 14, 0 + Math.sin(a) * 14); ctx.lineTo(-20 + Math.cos(a) * R, Math.sin(a) * R); ctx.stroke();
  }
  // 碎玻璃：本来没有
  if (glass > 0) {
    const r = rng(7);
    ctx.fillStyle = `rgba(230,236,240,${0.85 * glass})`;
    for (let i = 0; i < 26; i++) {
      const a = r() * Math.PI * 2, rr = 50 + r() * 140, s = 5 + r() * 9;
      const x = -20 + Math.cos(a) * rr, y = Math.sin(a) * rr * 0.8;
      ctx.beginPath(); ctx.moveTo(x, y - s); ctx.lineTo(x + s * 0.8, y + s * 0.5); ctx.lineTo(x - s * 0.6, y + s * 0.7); ctx.closePath(); ctx.fill();
    }
  }
  ctx.restore();
  // 回忆中的车速
  ctx.save();
  ctx.font = FONT.body(30); ctx.letterSpacing = '3px'; ctx.fillStyle = '#cfc2aa';
  ctx.fillText('回忆中的车速', -220, 300);
  ctx.fillStyle = 'rgba(228,218,200,0.2)'; ctx.fillRect(-220, 326, 440, 14);
  ctx.fillStyle = heavy > 0.3 ? '#a5342a' : '#d8cbb2';
  ctx.fillRect(-220, 326, 440 * (0.45 + 0.4 * heavy), 14);
  ctx.restore();
}

function draw(ctx, d) {
  const a = smooth(prog(d, 58.2, 58.7)) * (1 - smooth(prog(d, 65.5, 66.1)));
  if (a <= 0) return;
  const heavy = smooth(prog(d, SWAP + 0.3, SWAP + 1.0));
  const glass = smooth(prog(d, GLASS, GLASS + 0.8));
  const b = L.spring(d, CARD2, 1.6, 0.85);
  ctx.save();
  ctx.globalAlpha = a;
  ctx.save();
  ctx.translate(620, 450 - 20 * (d >= CARD2 ? b : 0));
  ctx.rotate(-0.02);
  if (d >= CARD2) { ctx.globalAlpha *= 1 - 0.55 * b; }
  cardA(ctx, d);
  ctx.restore();
  if (d >= CARD2) {
    ctx.save();
    ctx.translate(lerp(-500, 660, b), 490);
    ctx.rotate(lerp(-0.2, 0.025, b));
    cardB(ctx, d);
    ctx.restore();
  }
  ctx.translate(1420, 400);
  diagram(ctx, d, heavy, glass);
  // 注：现场并没有碎玻璃
  const na = smooth(prog(d, 64.0, 64.4));
  if (na > 0) {
    ctx.globalAlpha = a * na;
    ctx.font = FONT.body(34); ctx.letterSpacing = '3px'; ctx.fillStyle = '#c9bca4';
    ctx.textAlign = 'center';
    ctx.fillText('（现场照片里，没有任何碎玻璃）', 0, -310);
  }
  ctx.restore();
}

function light() {
  return [
    { x: 640, y: 470, rx: 760, ry: 560, i: 1.0, color: [246, 210, 168] },
    { x: 1420, y: 440, rx: 600, ry: 560, i: 0.85, color: [220, 214, 206] },
  ];
}
function grade() { return { warm: 0.05, ambient: 0.3 }; }

module.exports = { ...S, draw, light, grade };
