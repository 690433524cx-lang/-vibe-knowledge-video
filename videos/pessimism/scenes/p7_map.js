// 第七 / 八幕 · 51.5 秒 – MAIN_BEAT_T：悲观的人，真的更清醒吗？
//   俯拍桌面：一张手绘地图，台灯从左上照下来，他的手拿着铅笔从右边入画。
//   53.6 起铅笔把近路上的风险一个个圈出来：天气（暴雨）、施工、桥上的裂缝；
//   57.0 他画出一条绕开的路线；58.2 那座桥真的断了（地图上那一小块暗下去）——悲观有时候确实有用。
//   59.4 起镜头移到下一个十字路口：前面的路其实是正常的、空的。可是铅笔开始自己在路上画：
//        断桥、暴雨、失败、拒绝、结束……越画越快、越画越重。左边是「看见风险」，右边是「相信失败一定会发生」。
//   T-1.2  地图上浮起越来越多的词（不超过 12 个，仍然可读）；T-0.7 有重量地向中央聚拢，手退进黑暗；
//   T-0.3  只剩「失败 失去 拒绝 结束」；T-0.15 全部静止。T 那一帧交给「最坏」。
const { createCanvas } = require('@napi-rs/canvas');
const { W, H, DESIGN_T: D } = require('../../../src/config');
const { FONT, C } = require('../../../src/lib/style');
const { prog, smooth, lerp, rng, noise1, easeInOut, easeIn } = require('../../../src/lib/util');
const { spring } = require('../../../src/lib/motion');
const { pencil, sketchEllipse, polyLength } = require('../../../src/lib/draw');
const { sheetTexture } = require('../../../src/lib/material');
const { withCam, toScreen, smoothPath } = require('../lib');

const S = { start: 51.3, end: D - 0.001 };   // T 那一帧不再画任何小词
const MAP = { w: 2700, h: 1650, rot: -0.025 };
const ORIGIN = [960, 540];   // 地图中心在世界坐标里的位置

// 地图坐标（以地图中心为原点）
const START = [-980, 430], DEST = [980, -470];
const ROUTE_A = [START, [-700, 330], [-420, 190], [-150, 70], [120, -60], [420, -200], [700, -330], DEST];
const ROUTE_B = [START, [-930, 120], [-800, -180], [-560, -420], [-200, -520], [200, -560], [600, -560], DEST];
const RIVER = [[-420, -820], [-300, -500], [-170, -200], [-140, 60], [-200, 360], [-120, 640], [-40, 860]];
const BRIDGE = [-150, 70];
const CLOUD = [-470, 210], CONES = [200, -100];
// 第二个十字路口（地图右下）
const CROSS = [640, 360];
const ROAD_H = [[180, 360], [1300, 360]], ROAD_V = [[640, -60], [640, 820]];

// ---------------- 静态底图（只画一次） ----------------
const BASE = (() => {
  const tex = sheetTexture(MAP.w, MAP.h, 7070, 'cream', { rough: 4, crease: true });
  const c = createCanvas(tex.canvas.width, tex.canvas.height);
  const x = c.getContext('2d');
  x.drawImage(tex.canvas, 0, 0);
  x.translate(tex.pad + MAP.w / 2, tex.pad + MAP.h / 2);
  // 等高线
  const r = rng(71);
  for (let k = 0; k < 7; k++) {
    const cx = -900 + r() * 1800, cy = -600 + r() * 1200;
    for (let j = 1; j < 4; j++) pencil(x, Array.from({ length: 40 }, (_, i) => { const a = (i / 39) * Math.PI * 2; const rr = j * 60 + Math.sin(a * 3 + k) * 14; return [cx + Math.cos(a) * rr * 1.4, cy + Math.sin(a) * rr]; }), { seed: 100 + k * 5 + j, width: 1, color: 'rgba(120,100,76,0.28)', passes: 1, boil: false });
  }
  // 河：一条淡蓝灰的水彩
  x.save();
  x.strokeStyle = 'rgba(96,120,132,0.32)';
  x.lineWidth = 120; x.lineCap = 'round'; x.lineJoin = 'round';
  smoothPath(x, RIVER, false); x.stroke();
  x.strokeStyle = 'rgba(96,120,132,0.22)'; x.lineWidth = 170; x.stroke();
  x.restore();
  pencil(x, RIVER.map(([a, b]) => [a - 58, b]), { seed: 11, width: 1.3, color: 'rgba(70,86,96,0.55)', passes: 1, boil: false });
  pencil(x, RIVER.map(([a, b]) => [a + 58, b]), { seed: 12, width: 1.3, color: 'rgba(70,86,96,0.55)', passes: 1, boil: false });
  // 房子和树
  for (let i = 0; i < 70; i++) {
    const bx = -1250 + r() * 2500, by = -760 + r() * 1520;
    if (Math.abs(bx + 150) < 180) continue;
    if (r() < 0.55) {
      x.fillStyle = 'rgba(150,126,96,0.22)'; x.fillRect(bx, by, 26 + r() * 40, 20 + r() * 30);
      x.strokeStyle = 'rgba(80,66,50,0.4)'; x.lineWidth = 1; x.strokeRect(bx, by, 26 + r() * 40, 20 + r() * 30);
    } else {
      x.strokeStyle = 'rgba(80,96,70,0.45)'; x.lineWidth = 1.2;
      x.beginPath(); x.arc(bx, by, 9 + r() * 8, 0, Math.PI * 2); x.stroke();
    }
  }
  // 路：双线
  const road = (pts, seed) => {
    x.save(); x.strokeStyle = 'rgba(230,220,196,0.9)'; x.lineWidth = 30; x.lineCap = 'round'; x.lineJoin = 'round'; smoothPath(x, pts, false); x.stroke(); x.restore();
    for (const off of [-16, 16]) pencil(x, pts.map(([a, b]) => [a, b + off]), { seed: seed + off, width: 1.6, color: 'rgba(60,50,42,0.7)', passes: 2, boil: false });
  };
  road(ROUTE_A, 200); road(ROUTE_B, 300); road(ROAD_H, 400); road(ROAD_V, 500);
  road([[-1300, 40], [-930, 120]], 600); road([[700, -330], [1300, -100]], 700);
  // 桥
  x.fillStyle = 'rgba(120,96,70,0.6)'; x.fillRect(BRIDGE[0] - 80, BRIDGE[1] - 24, 160, 48);
  x.fillStyle = 'rgba(120,96,70,0.6)'; x.fillRect(-120 - 80, -470 - 24, 160, 48);
  // 起点、终点
  x.fillStyle = 'rgba(60,50,42,0.85)';
  x.beginPath(); x.arc(START[0], START[1], 12, 0, Math.PI * 2); x.fill();
  x.beginPath(); x.arc(DEST[0], DEST[1], 12, 0, Math.PI * 2); x.fill();
  x.font = FONT.hand(48);
  x.fillText('起点', START[0] - 40, START[1] + 70);
  x.fillText('终点', DEST[0] - 30, DEST[1] - 34);
  // 风险符号：云和雨、施工锥、桥上的裂缝
  x.strokeStyle = 'rgba(60,50,42,0.8)'; x.lineWidth = 2;
  x.beginPath(); x.arc(CLOUD[0] - 30, CLOUD[1], 26, Math.PI * 0.9, Math.PI * 2.05); x.arc(CLOUD[0] + 10, CLOUD[1] - 14, 32, Math.PI, Math.PI * 2.1); x.arc(CLOUD[0] + 48, CLOUD[1] + 4, 22, Math.PI * 1.2, Math.PI * 2.4); x.stroke();
  for (let i = 0; i < 5; i++) { x.beginPath(); x.moveTo(CLOUD[0] - 40 + i * 20, CLOUD[1] + 34); x.lineTo(CLOUD[0] - 50 + i * 20, CLOUD[1] + 64); x.stroke(); }
  for (let i = 0; i < 3; i++) { const cx = CONES[0] - 40 + i * 40; x.beginPath(); x.moveTo(cx, CONES[1] - 26); x.lineTo(cx - 14, CONES[1] + 12); x.lineTo(cx + 14, CONES[1] + 12); x.closePath(); x.stroke(); x.beginPath(); x.moveTo(cx - 9, CONES[1] - 2); x.lineTo(cx + 9, CONES[1] - 2); x.stroke(); }
  x.beginPath(); x.moveTo(BRIDGE[0] - 10, BRIDGE[1] - 24); x.lineTo(BRIDGE[0] + 6, BRIDGE[1] - 4); x.lineTo(BRIDGE[0] - 6, BRIDGE[1] + 8); x.lineTo(BRIDGE[0] + 8, BRIDGE[1] + 24); x.stroke();
  return { canvas: c, pad: tex.pad };
})();

// ---------------- 摄影机（俯拍，缓慢） ----------------
function cam(t) {
  const a = { cx: 960, cy: 560, s: 0.62 };
  const b = { cx: 960 + 240, cy: 560 + 120, s: 0.82 };    // 能同时看到左边圈过的风险和右边的十字路口
  const c = { cx: 960 + CROSS[0] - 40, cy: 540 + CROSS[1] - 20, s: 1.12 };
  const k1 = easeInOut(prog(t, 51.6, 58.8)) * 0.15;
  const k2 = easeInOut(prog(t, 59.2, 61.0));
  const k3 = easeInOut(prog(t, 63.9, D - 1.25));
  let cam = { cx: a.cx, cy: a.cy - k1 * 40, s: a.s + k1 * 0.4 };
  cam = { cx: lerp(cam.cx, b.cx, k2), cy: lerp(cam.cy, b.cy, k2), s: lerp(cam.s, b.s, k2) };
  cam = { cx: lerp(cam.cx, c.cx, k3), cy: lerp(cam.cy, c.cy, k3), s: lerp(cam.s, c.s, k3) };
  return cam;
}
// 地图坐标 → 世界坐标
const M = (p) => { const c = Math.cos(MAP.rot), s = Math.sin(MAP.rot); return [ORIGIN[0] + p[0] * c - p[1] * s, ORIGIN[1] + p[0] * s + p[1] * c]; };

// ---------------- 铅笔的位置（随时间） ----------------
// 关键帧：[时间, 地图坐标]
const PEN = [
  [51.3, [700, 700]], [53.3, [-380, 150]], [53.6, CLOUD], [54.2, [60, -40]], [54.5, CONES], [55.1, [-100, 120]], [55.4, BRIDGE], [56.6, [-900, 300]],
  [57.0, ROUTE_B[0]], [58.4, DEST], [59.2, [700, 100]], [60.0, [480, 360]], [60.4, [520, 380]], [61.0, [760, 300]], [61.6, [380, 280]], [62.2, [800, 430]],
  [62.8, [560, 520]], [63.3, [700, 340]], [65.0, [660, 380]], [D - 0.9, [900, 520]], [D - 0.4, [1500, 900]],
];
// 沿折线按长度取点
function along(pts, k) {
  const L = polyLength(pts) * Math.max(0, Math.min(1, k));
  let acc = 0;
  for (let i = 1; i < pts.length; i++) {
    const [x0, y0] = pts[i - 1], [x1, y1] = pts[i];
    const l = Math.hypot(x1 - x0, y1 - y0);
    if (acc + l >= L) { const f = (L - acc) / (l || 1); return [x0 + (x1 - x0) * f, y0 + (y1 - y0) * f]; }
    acc += l;
  }
  return pts[pts.length - 1];
}
function penAt(t) {
  if (t > 57.0 && t < 58.4) return along(ROUTE_B, prog(t, 57.0, 58.4));   // 画绕行路线时，笔尖真的沿着路线走
  if (t <= PEN[0][0]) return PEN[0][1];
  for (let i = 1; i < PEN.length; i++) {
    const [t1, p1] = PEN[i], [t0, p0] = PEN[i - 1];
    if (t <= t1) { const k = easeInOut((t - t0) / (t1 - t0)); return [lerp(p0[0], p1[0], k), lerp(p0[1], p1[1], k)]; }
  }
  return PEN[PEN.length - 1][1];
}
// 63.3–65.0：乱涂（铅笔在原地抖着画）
function scribbleJitter(t) {
  const k = smooth(prog(t, 63.2, 63.8)) * (1 - smooth(prog(t, 65.0, 65.3)));
  return [noise1(t * 9, 81) * 90 * k, noise1(t * 9, 82) * 60 * k];
}

// 手：俯视，从右下入画，三根手指捏着铅笔；袖子伸出画面；影子落在右下（灯在左上）
function hand(ctx, tip, t, alpha = 1) {
  if (alpha <= 0.01) return;
  const ang = -2.3;                       // 铅笔从笔尖指向右下的方向的反向
  const dx = -Math.cos(ang), dy = -Math.sin(ang); // 从笔尖往手的方向（右下）
  const P = (d, side = 0) => [tip[0] + dx * d - dy * side, tip[1] + dy * d + dx * side];
  ctx.save();
  ctx.globalAlpha *= alpha;
  const shape = (c, ox = 0, oy = 0) => {
    // 手掌 + 握着的手指（一团略扁的形状），手腕，袖子
    c.save(); c.translate(ox, oy);
    c.beginPath();
    const pts = [P(128, -18), P(146, -36), P(196, -50), P(250, -44), P(292, -26), P(322, 6), P(312, 44), P(266, 56), P(206, 48), P(158, 28), P(130, 12)];
    smoothPath(c, pts);
    c.restore();
  };
  // 影子
  ctx.save();
  ctx.filter = 'blur(12px)';
  ctx.fillStyle = 'rgba(30,20,12,0.38)';
  shape(ctx, 22, 30); ctx.fill();
  ctx.strokeStyle = 'rgba(30,20,12,0.3)'; ctx.lineWidth = 12;
  ctx.beginPath(); ctx.moveTo(tip[0] + 22, tip[1] + 30); ctx.lineTo(P(250)[0] + 22, P(250)[1] + 30); ctx.stroke();
  ctx.restore();
  // 袖子（伸出画面）
  ctx.fillStyle = '#39423a';
  smoothPath(ctx, [P(290, -50), P(360, -70), P(720, -100), P(780, 150), P(360, 100), P(300, 60)]);
  ctx.fill();
  ctx.fillStyle = 'rgba(255,230,190,0.08)';
  smoothPath(ctx, [P(300, -50), P(720, -98), P(725, -70), P(310, -32)]);
  ctx.fill();
  // 铅笔：削尖的木头 + 石墨笔尖 + 黄色的六棱笔杆（尾部被手挡住）
  ctx.lineCap = 'butt';
  ctx.strokeStyle = '#d0a63e'; ctx.lineWidth = 17;
  ctx.beginPath(); ctx.moveTo(...P(46)); ctx.lineTo(...P(270)); ctx.stroke();
  ctx.strokeStyle = 'rgba(255,240,200,0.5)'; ctx.lineWidth = 3;
  ctx.beginPath(); ctx.moveTo(...P(48, -4)); ctx.lineTo(...P(250, -4)); ctx.stroke();
  ctx.fillStyle = '#dcc49a';
  ctx.beginPath(); ctx.moveTo(...P(8, -2)); ctx.lineTo(...P(46, -7.5)); ctx.lineTo(...P(46, 7.5)); ctx.lineTo(...P(8, 2)); ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#2a2420';
  ctx.beginPath(); ctx.moveTo(...P(0, 0)); ctx.lineTo(...P(12, -2.4)); ctx.lineTo(...P(12, 2.4)); ctx.closePath(); ctx.fill();
  // 手
  const g = ctx.createLinearGradient(...P(70, -60), ...P(260, 60));
  g.addColorStop(0, '#9a7258'); g.addColorStop(1, '#6e503e');
  ctx.fillStyle = g;
  shape(ctx); ctx.fill();
  // 食指压在笔杆上 + 拇指
  ctx.strokeStyle = '#8a6650'; ctx.lineCap = 'round';
  ctx.lineWidth = 20; ctx.beginPath(); ctx.moveTo(...P(196, -28)); ctx.quadraticCurveTo(...P(150, -16), ...P(112, -6)); ctx.stroke();
  ctx.lineWidth = 18; ctx.beginPath(); ctx.moveTo(...P(196, 36)); ctx.quadraticCurveTo(...P(150, 24), ...P(120, 10)); ctx.stroke();
  // 指节的暗线
  ctx.strokeStyle = 'rgba(60,40,30,0.35)'; ctx.lineWidth = 2;
  for (const d of [222, 250, 278]) { ctx.beginPath(); ctx.moveTo(...P(d, -44)); ctx.lineTo(...P(d - 10, -22)); ctx.stroke(); }
  ctx.restore();
}

// ---------------- 动态的铅笔痕迹 ----------------
const graphite = 'rgba(48,40,34,0.88)';
function marks(ctx, t) {
  const o = { t, color: graphite, passes: 2, pressure: 0.5 };
  // 1. 圈出风险
  sketchEllipse(ctx, CLOUD[0] + 8, CLOUD[1] + 20, 110, 80, { ...o, seed: 1, width: 3, progress: prog(t, 53.6, 54.1) });
  sketchEllipse(ctx, CONES[0], CONES[1], 100, 60, { ...o, seed: 2, width: 3, progress: prog(t, 54.5, 55.0) });
  sketchEllipse(ctx, BRIDGE[0], BRIDGE[1], 120, 70, { ...o, seed: 3, width: 3, progress: prog(t, 55.4, 55.9) });
  // 2. 绕开的路线（虚线，重一点）
  const pb = prog(t, 57.0, 58.4);
  if (pb > 0) {
    ctx.save(); ctx.setLineDash([22, 14]);
    pencil(ctx, ROUTE_B, { ...o, seed: 4, width: 4.5, progress: pb, color: 'rgba(40,34,30,0.9)', pressure: 0.3 });
    ctx.restore();
  }
  // 3. 那座桥真的断了：断口 + 一小块暗下去
  const br = smooth(prog(t, 58.2, 58.7));
  if (br > 0) {
    ctx.save();
    ctx.fillStyle = `rgba(30,24,20,${0.5 * br})`;
    ctx.beginPath(); ctx.moveTo(BRIDGE[0] - 22, BRIDGE[1] - 30); ctx.lineTo(BRIDGE[0] + 18, BRIDGE[1] - 30); ctx.lineTo(BRIDGE[0] + 10, BRIDGE[1] + 32); ctx.lineTo(BRIDGE[0] - 16, BRIDGE[1] + 32); ctx.closePath(); ctx.fill();
    const g = ctx.createRadialGradient(BRIDGE[0], BRIDGE[1], 10, BRIDGE[0], BRIDGE[1], 170);
    g.addColorStop(0, `rgba(40,30,22,${0.35 * br})`); g.addColorStop(1, 'rgba(40,30,22,0)');
    ctx.fillStyle = g; ctx.fillRect(BRIDGE[0] - 180, BRIDGE[1] - 180, 360, 360);
    ctx.restore();
  }
  // 4. 第二个路口：路其实是空的，但铅笔自己画起来——越来越快、越来越重
  const heavy = (t0, t1) => ({ ...o, progress: prog(t, t0, t1), width: lerp(3, 5.5, prog(t, 60, 64)), color: 'rgba(36,30,26,0.92)' });
  // 断桥
  pencil(ctx, [[CROSS[0] - 120, CROSS[1] - 26], [CROSS[0] - 60, CROSS[1] - 26], [CROSS[0] - 48, CROSS[1] + 6], [CROSS[0] - 70, CROSS[1] + 30]], { ...heavy(60.0, 60.5), seed: 10 });
  pencil(ctx, [[CROSS[0] + 60, CROSS[1] - 26], [CROSS[0] + 120, CROSS[1] - 26]], { ...heavy(60.2, 60.5), seed: 11 });
  // 暴雨
  for (let i = 0; i < 9; i++) pencil(ctx, [[CROSS[0] + 60 + i * 18, CROSS[1] - 160], [CROSS[0] + 40 + i * 18, CROSS[1] - 90]], { ...heavy(60.5 + i * 0.04, 60.62 + i * 0.04), seed: 20 + i, passes: 1 });
  // 字：失败 / 拒绝 / 结束（手写，越写越重）
  const word = (s, x, y, t0, size, rot) => {
    const k = prog(t, t0, t0 + 0.35);
    if (k <= 0) return;
    ctx.save();
    ctx.translate(x, y); ctx.rotate(rot);
    ctx.font = FONT.hand(size);
    const w = ctx.measureText(s).width;
    ctx.beginPath(); ctx.rect(-10, -size, (w + 20) * k, size * 1.4); ctx.clip();
    ctx.fillStyle = 'rgba(40,32,28,0.92)';
    ctx.fillText(s, 0, 0);
    ctx.restore();
  };
  word('失败', CROSS[0] - 260, CROSS[1] + 90, 61.6, 74, -0.08);
  word('拒绝', CROSS[0] + 120, CROSS[1] + 110, 62.2, 80, 0.06);
  word('结束', CROSS[0] - 70, CROSS[1] + 200, 62.8, 92, -0.04);
  // 乱涂：越来越密的螺旋线
  const sk = prog(t, 63.3, 65.0);
  if (sk > 0) {
    const r = rng(90);
    const n = Math.floor(sk * 26);
    for (let i = 0; i < n; i++) {
      const cx = CROSS[0] + (r() - 0.5) * 520, cy = CROSS[1] + (r() - 0.3) * 380;
      const pts = Array.from({ length: 30 }, (_, j) => { const a = j * 0.7; const rr = 18 + j * 2.2; return [cx + Math.cos(a) * rr, cy + Math.sin(a) * rr * 0.7]; });
      pencil(ctx, pts, { ...o, seed: 200 + i, width: 2.2, passes: 1, color: 'rgba(36,30,26,0.6)' });
    }
  }
}

// ---------------- T 之前：浮起来的词 ----------------
const WORDS = ['失败', '失去', '结束', '拒绝', '来不及', '不会成功', '失败', '拒绝', '来不及', '结束', '失去', '不会成功'];
const KEEP = { 0: [-270, -70], 1: [270, -70], 3: [-270, 95], 2: [270, 95] };    // 最后留下的四个（相对画面中心）
const R2 = rng(777);
const FLOAT = WORDS.map((w, i) => ({ w, x: 260 + R2() * 1400, y: 300 + R2() * 520, at: D - 1.2 + i * 0.045, size: 46 + R2() * 26, rot: (R2() - 0.5) * 0.2 }));
function floatWords(ctx, t) {
  const tt = Math.min(t, D - 0.15);                 // T-0.15 起全部静止
  for (let i = 0; i < FLOAT.length; i++) {
    const f = FLOAT[i];
    const a = smooth(prog(tt, f.at, f.at + 0.22));
    if (a <= 0.01) continue;
    const keep = KEEP[i];
    const gone = keep ? 0 : smooth(prog(tt, D - 0.42, D - 0.3));
    if (gone >= 0.999) continue;
    // 先轻轻往上浮，T-0.7 起有重量地向中央聚拢
    const rise = (tt - f.at) * 30;
    const pull = easeIn(prog(tt, D - 0.7, D - 0.3));
    const target = keep ? [960 + keep[0], 500 + keep[1]] : [960 + (f.x - 960) * 0.35, 500 + (f.y - 520) * 0.35];
    const x = lerp(f.x, target[0], pull), y = lerp(f.y - rise, target[1], pull);
    const size = lerp(f.size, keep ? 76 : f.size * 0.8, pull);
    ctx.save();
    ctx.globalAlpha = a * (1 - gone);
    ctx.font = FONT.hand(size);
    ctx.textAlign = 'center';
    // 起初像铅笔写在纸上（深色），四周暗下去以后变成浅色
    const lit = smooth(prog(tt, D - 0.85, D - 0.45));
    const cc = [lerp(44, keep ? 228 : 214, lit), lerp(36, keep ? 214 : 200, lit), lerp(30, keep ? 196 : 180, lit)].map(Math.round);
    ctx.fillStyle = `rgba(${cc.join(',')},${keep ? 1 : 0.88})`;
    ctx.shadowColor = `rgba(0,0,0,${0.7 * lit})`; ctx.shadowBlur = 16;
    ctx.translate(x, y); ctx.rotate(f.rot * (1 - pull));
    ctx.fillText(f.w, 0, 0);
    ctx.restore();
  }
}

function draw(ctx, t) {
  const c = cam(t);
  const a = smooth(prog(t, 51.45, 51.95));
  ctx.save();
  ctx.globalAlpha *= a;
  // 桌面
  ctx.fillStyle = '#2a2018';
  ctx.fillRect(0, 0, W, H);
  withCam(ctx, c, 1, () => {
    ctx.save();
    ctx.translate(ORIGIN[0], ORIGIN[1]);
    ctx.rotate(MAP.rot);
    ctx.save();
    ctx.shadowColor = 'rgba(0,0,0,0.6)'; ctx.shadowBlur = 50; ctx.shadowOffsetX = 24; ctx.shadowOffsetY = 30;
    ctx.fillStyle = '#d6c9ab'; ctx.fillRect(-MAP.w / 2, -MAP.h / 2, MAP.w, MAP.h);
    ctx.restore();
    ctx.drawImage(BASE.canvas, -MAP.w / 2 - BASE.pad, -MAP.h / 2 - BASE.pad);
    marks(ctx, t);
    ctx.restore();
    // 手：T-0.9 起退出画面（退进黑暗）
    const p = penAt(t);
    const j = scribbleJitter(t);
    const tip = M([p[0] + j[0], p[1] + j[1]]);
    hand(ctx, tip, t, 1 - smooth(prog(t, D - 0.7, D - 0.35)));
  });
  ctx.restore();
}

function drawOver(ctx, t) { if (t < D) floatWords(ctx, t); }

// 光：台灯从左上照下来；T 之前灯光一起收暗（引擎再整体压暗）
function light(t) {
  const c = cam(t);
  const w = smooth(prog(t, 51.45, 51.95));
  const dim = 1 - 0.55 * smooth(prog(t, D - 0.9, D - 0.3));
  const p = penAt(t);
  const [px, py] = toScreen(c, ...M(p));
  return [
    { x: W * 0.42, y: H * 0.42, rx: 1150, ry: 760, i: 0.95 * dim, w, color: [255, 214, 160], core: 0.3, rot: -0.2 },
    { x: px, y: py, rx: 420, ry: 340, i: 0.55 * dim, w, color: [255, 214, 160] },
  ];
}
function grade(t) { return { warm: 0.3, ambient: lerp(0.12, 0.06, smooth(prog(t, D - 0.9, D - 0.3))) }; }

module.exports = { ...S, draw, drawOver, light, grade, BASE, MAP, ORIGIN, ROUTE_A, ROUTE_B, START, DEST, BRIDGE, CLOUD, CONES, M, hand, marks, along };
