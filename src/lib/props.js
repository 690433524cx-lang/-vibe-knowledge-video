// 可复用的「生活证据」：纸片、旧照片、小票、取号单、小钟。
// 均以中心点 (0,0) 绘制，调用方负责 translate / rotate / scale。
const { C, FONT } = require('./style');
const { pencil, rectPts, typeText, sketchEllipse } = require('./draw');
const { rng } = require('./util');

// 带投影的纸片
function paper(ctx, w, h, o = {}) {
  const { color = '#ece3cc', shadow = 0.5, aged = true } = o;
  ctx.save();
  ctx.shadowColor = `rgba(0,0,0,${shadow})`;
  ctx.shadowBlur = 18; ctx.shadowOffsetX = 5; ctx.shadowOffsetY = 9;
  ctx.fillStyle = color;
  ctx.fillRect(-w / 2, -h / 2, w, h);
  ctx.restore();
  if (aged) {
    const g = ctx.createLinearGradient(-w / 2, -h / 2, w / 2, h / 2);
    g.addColorStop(0, 'rgba(170,135,80,0.12)');
    g.addColorStop(0.55, 'rgba(170,135,80,0)');
    g.addColorStop(1, 'rgba(150,115,70,0.18)');
    ctx.fillStyle = g;
    ctx.fillRect(-w / 2, -h / 2, w, h);
  }
}

// 旧照片：白边 + 泛黄画面 + 两个靠在一起的模糊人影（没有脸）
function photo(ctx, w, h, o = {}) {
  const { t = 0, seed = 5, crease = true, fade = 0 } = o;
  paper(ctx, w, h, { color: '#e6dcc5' });
  const b = Math.max(10, w * 0.06);
  const iw = w - b * 2, ih = h - b * 2.6;
  const ix = -w / 2 + b, iy = -h / 2 + b;
  ctx.save();
  ctx.beginPath();
  ctx.rect(ix, iy, iw, ih);
  ctx.clip();
  const g = ctx.createLinearGradient(0, iy, 0, iy + ih);
  g.addColorStop(0, '#a99273');
  g.addColorStop(0.62, '#8b7457');
  g.addColorStop(1, '#5e4b37');
  ctx.fillStyle = g;
  ctx.fillRect(ix, iy, iw, ih);
  // 远处的地平线
  ctx.fillStyle = 'rgba(70,55,40,0.35)';
  ctx.fillRect(ix, iy + ih * 0.62, iw, ih * 0.38);
  // 两个人影
  ctx.filter = `blur(${Math.max(1.5, w * 0.012)}px)`;
  ctx.fillStyle = 'rgba(45,34,26,0.85)';
  const fig = (cx, hgt, lean) => {
    const hr = hgt * 0.11;
    ctx.beginPath();
    ctx.arc(cx + lean * hgt * 0.1, iy + ih - hgt + hr, hr, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(cx - hgt * 0.17 + lean * hgt * 0.06, iy + ih - hgt + hr * 2.2);
    ctx.quadraticCurveTo(cx + lean * hgt * 0.08, iy + ih - hgt + hr * 1.6, cx + hgt * 0.17 + lean * hgt * 0.06, iy + ih - hgt + hr * 2.2);
    ctx.lineTo(cx + hgt * 0.15, iy + ih + 4);
    ctx.lineTo(cx - hgt * 0.15, iy + ih + 4);
    ctx.closePath();
    ctx.fill();
  };
  fig(-iw * 0.08, ih * 0.62, 0.6);
  fig(iw * 0.1, ih * 0.56, -0.5);
  ctx.filter = 'none';
  // 褪色
  ctx.fillStyle = `rgba(220,205,180,${0.12 + fade * 0.5})`;
  ctx.fillRect(ix, iy, iw, ih);
  ctx.restore();
  pencil(ctx, rectPts(ix, iy, iw, ih), { seed, t, width: 1, color: 'rgba(60,45,35,0.35)', passes: 1, amp: 0.4 });
  if (crease) {
    ctx.strokeStyle = 'rgba(255,250,235,0.35)';
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.moveTo(-w * 0.12, -h / 2); ctx.lineTo(w * 0.05, h / 2);
    ctx.stroke();
    ctx.strokeStyle = 'rgba(60,45,30,0.18)';
    ctx.beginPath();
    ctx.moveTo(-w * 0.12 + 2, -h / 2); ctx.lineTo(w * 0.05 + 2, h / 2);
    ctx.stroke();
  }
}

// 迷你电影票
function ticket(ctx, w, h, o = {}) {
  const { t = 0 } = o;
  paper(ctx, w, h, { color: '#efe5cc' });
  const s = w / 820;
  pencil(ctx, rectPts(-w / 2 + 8 * s * 2, -h / 2 + 8 * s * 2, w * 0.76, h - 32 * s), { seed: 401, t, width: 1, color: C.graphiteSoft, passes: 1 });
  ctx.save();
  ctx.setLineDash([5, 5]);
  ctx.strokeStyle = C.graphiteSoft;
  ctx.beginPath(); ctx.moveTo(w * 0.29, -h / 2 + 4); ctx.lineTo(w * 0.29, h / 2 - 4); ctx.stroke();
  ctx.restore();
  ctx.fillStyle = C.ink;
  ctx.font = FONT.serif(Math.round(46 * s * 1.15));
  ctx.fillText('城南电影院', -w / 2 + 40 * s, -h / 2 + 140 * s);
  ctx.font = FONT.serif(Math.round(40 * s * 1.15));
  ctx.fillText('第 7 排  12 座', -w / 2 + 40 * s, -h / 2 + 222 * s);
  ctx.font = FONT.type(Math.round(28 * s * 1.2));
  ctx.fillText('¥45.00', -w / 2 + 40 * s, -h / 2 + 290 * s);
  sketchEllipse(ctx, w * 0.39, -h * 0.1, 64 * s, 64 * s, { seed: 402, t, width: 2, color: C.redSoft, passes: 1 });
}

// 迷你取号单
function slip(ctx, w, h, o = {}) {
  paper(ctx, w, h, { color: '#f0e8d4' });
  const s = w / 390;
  ctx.textAlign = 'center';
  ctx.fillStyle = C.ink;
  ctx.font = FONT.serif(Math.round(34 * s));
  ctx.fillText('取 号 单', 0, -h / 2 + 70 * s);
  ctx.font = FONT.type(Math.round(128 * s));
  ctx.fillText('A147', 0, 20 * s);
  ctx.font = FONT.serif(Math.round(28 * s));
  ctx.fillStyle = C.brown;
  ctx.fillText('您前面还有 23 位', 0, 100 * s);
  ctx.textAlign = 'left';
}

// 迷你钟（纸面）
function clock(ctx, r, o = {}) {
  const { t = 0, minutes = 60 } = o;
  ctx.save();
  ctx.shadowColor = 'rgba(0,0,0,0.5)';
  ctx.shadowBlur = 12; ctx.shadowOffsetY = 6;
  ctx.fillStyle = '#e8ddc4';
  ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
  sketchEllipse(ctx, 0, 0, r, r, { seed: 410, t, width: 1.6, passes: 1 });
  const a = -Math.PI / 2 + (minutes / 60) * Math.PI * 2 * 0.999;
  ctx.fillStyle = 'rgba(90,70,50,0.25)';
  ctx.beginPath(); ctx.moveTo(0, 0); ctx.arc(0, 0, r * 0.85, -Math.PI / 2, a); ctx.closePath(); ctx.fill();
  pencil(ctx, [[0, 0], [0, -r * 0.75]], { seed: 411, t, width: 2, color: C.ink, passes: 1 });
  pencil(ctx, [[0, 0], [r * 0.45, r * 0.1]], { seed: 412, t, width: 2.6, color: C.ink, passes: 1 });
}

// 铅笔（「努力」）
function pencilIcon(ctx, len, o = {}) {
  const { t = 0 } = o;
  ctx.save();
  ctx.rotate(-0.5);
  ctx.shadowColor = 'rgba(0,0,0,0.5)'; ctx.shadowBlur = 8; ctx.shadowOffsetY = 4;
  ctx.fillStyle = '#b58a4a';
  ctx.fillRect(-len / 2, -9, len * 0.82, 18);
  ctx.shadowColor = 'transparent';
  ctx.fillStyle = '#e2cfa5';
  ctx.beginPath(); ctx.moveTo(len * 0.32, -9); ctx.lineTo(len / 2, 0); ctx.lineTo(len * 0.32, 9); ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#2a2420';
  ctx.beginPath(); ctx.moveTo(len * 0.44, -3); ctx.lineTo(len / 2, 0); ctx.lineTo(len * 0.44, 3); ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#7a6a58';
  ctx.fillRect(-len / 2 - 12, -9, 14, 18);
  ctx.restore();
  void t;
}

// 一个手写的、带页眉的档案卡底
function card(ctx, w, h, o = {}) {
  paper(ctx, w, h, { color: o.color || '#ebe2ca', shadow: 0.55 });
  ctx.strokeStyle = 'rgba(125,35,28,0.35)';
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.moveTo(-w / 2 + 70, -h / 2 + 4); ctx.lineTo(-w / 2 + 70, h / 2 - 4);
  ctx.stroke();
  ctx.strokeStyle = 'rgba(70,90,110,0.16)';
  for (let y = -h / 2 + 110; y < h / 2 - 20; y += 52) {
    ctx.beginPath(); ctx.moveTo(-w / 2 + 6, y); ctx.lineTo(w / 2 - 6, y); ctx.stroke();
  }
}

module.exports = { paper, photo, ticket, slip, clock, pencilIcon, card, rng };
