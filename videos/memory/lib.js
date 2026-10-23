// 《记忆》共用：贯穿全片的「同一段回忆」——旧客厅、门口的妈妈、沙发前的孩子、窗外的天气。
// 同一个画面有两个版本，中间可以连续插值：
//   TRUTH（照片）：晴天、藏青外套、孩子站在窗边
//   MEMORY（记忆）：下雨、红外套、孩子站在沙发前
// version(k)：k = 0 是照片，k = 1 是记忆；中间值就是「每次想起都改一点」。
const { createCanvas } = require('@napi-rs/canvas');
const T = require('../time/lib');
const { W, H, FONT, C, rng, noise1, lerp, clamp, prog, smooth } = T;
const { mottle, inkText } = require('../../src/lib/material');
const { spring } = require('../../src/lib/motion');

const TRUTH = { rain: 0, coat: [46, 58, 78], childX: 1150, childF: -1, motherF: 1, cold: 0 };
const MEMORY = { rain: 1, coat: [158, 44, 34], childX: 430, childF: 1, motherF: -1, cold: 0 };

function version(k, extra = {}) {
  const v = {};
  v.rain = lerp(TRUTH.rain, MEMORY.rain, k);
  v.coat = TRUTH.coat.map((c, i) => Math.round(lerp(c, MEMORY.coat[i], smooth(clamp(k)))));
  v.childX = lerp(TRUTH.childX, MEMORY.childX, smooth(clamp(k)));
  v.childF = v.childX < 800 ? 1 : -1;
  v.motherF = v.childX < 800 ? -1 : 1;
  v.cold = 0;
  return { ...v, ...extra };
}
const rgb = (a, al = 1) => `rgba(${a[0]},${a[1]},${a[2]},${al})`;
const hex = (a) => '#' + a.map((c) => Math.round(clamp(c, 0, 255)).toString(16).padStart(2, '0')).join('');

// ---------------- 客厅 ----------------
const FLOOR = 830;
const WIN = { x: 1250, y: 220, w: 400, h: 420 };
const DOOR = { x: 640, y: 236, w: 270, h: FLOOR - 236 };

function rect(x, a, b, c, d, fill) { x.fillStyle = fill; x.fillRect(a, b, c, d); }

// 窗外：雨天（灰蓝、湿树影）↔ 晴天（暖白、亮绿）
function outside(x, v, t) {
  const { x: wx, y: wy, w: ww, h: wh } = WIN;
  const sun = 1 - v.rain;
  x.save();
  x.beginPath(); x.rect(wx, wy, ww, wh); x.clip();
  const g = x.createLinearGradient(0, wy, 0, wy + wh);
  g.addColorStop(0, hex([lerp(52, 214, sun), lerp(60, 200, sun), lerp(70, 172, sun)]));
  g.addColorStop(1, hex([lerp(32, 176, sun), lerp(38, 164, sun), lerp(46, 136, sun)]));
  x.fillStyle = g;
  x.fillRect(wx, wy, ww, wh);
  // 树：一团团的叶子
  const r = rng(41);
  for (let i = 0; i < 26; i++) {
    const cx = wx + r() * ww, cy = wy + wh * (0.35 + r() * 0.75), rr = 40 + r() * 70;
    x.fillStyle = hex([lerp(26, 92, sun) + r() * 8, lerp(32, 106, sun) + r() * 8, lerp(34, 74, sun)]);
    x.globalAlpha = 0.85;
    x.beginPath(); x.arc(cx + noise1(t * 0.4 + i, 9) * 3, cy, rr, 0, Math.PI * 2); x.fill();
  }
  x.globalAlpha = 1;
  // 对面楼
  x.fillStyle = hex([lerp(42, 150, sun), lerp(46, 136, sun), lerp(52, 118, sun)]);
  x.fillRect(wx + ww * 0.62, wy + wh * 0.08, ww * 0.3, wh * 0.5);
  x.fillStyle = hex([lerp(30, 112, sun), lerp(34, 102, sun), lerp(40, 90, sun)]);
  for (let i = 0; i < 3; i++) for (let j = 0; j < 4; j++) x.fillRect(wx + ww * (0.66 + i * 0.09), wy + wh * (0.13 + j * 0.11), ww * 0.05, wh * 0.06);
  // 雨：玻璃上的水痕 + 斜落的雨丝
  if (v.rain > 0.01) {
    x.save();
    x.beginPath(); x.rect(wx, wy, ww, wh); x.clip();
    x.fillStyle = `rgba(70,80,90,${0.25 * v.rain})`;
    x.fillRect(wx, wy, ww, wh);
    const rr2 = rng(77);
    x.lineCap = 'round';
    for (let i = 0; i < 160; i++) {
      const sx = rr2(), sy = rr2(), sp = 0.7 + rr2() * 0.6, len = 22 + rr2() * 30;
      const px = wx + ((sx * ww + t * 60 * sp) % ww);
      const py = wy + ((sy * wh + t * 900 * sp) % (wh + 60)) - 30;
      x.strokeStyle = `rgba(190,200,206,${(0.16 + rr2() * 0.22) * v.rain})`;
      x.lineWidth = 1 + rr2() * 1.2;
      x.beginPath(); x.moveTo(px, py); x.lineTo(px - len * 0.18, py + len); x.stroke();
    }
    // 玻璃上停着的水珠
    for (let i = 0; i < 70; i++) {
      x.fillStyle = `rgba(230,236,240,${(0.2 + rr2() * 0.3) * v.rain})`;
      x.beginPath(); x.arc(wx + rr2() * ww, wy + rr2() * wh, 1.5 + rr2() * 3, 0, Math.PI * 2); x.fill();
    }
    x.restore();
  }
  x.restore();
}

// 一位穿长外套的妈妈（侧面），原点在脚下
function mother(x, v) {
  const h = 610;
  const coat = hex(v.coat);
  const pal = { skin: '#c49a7c', shirt: coat, jacket: coat, pants: '#2b2826', hair: '#1c1512', shoe: '#1e1a18' };
  x.save();
  x.translate(0, -h * 0.495);
  const f = v.motherF;
  const P = T.side(x, {
    h, f, kind: 'adult', pal,
    pose: { torso: 0.02, uArmN: 0.12, fArmN: 0.32, uArmF: -0.06, fArmF: 0.05, thighN: 0.03, shinN: 0.02, thighF: -0.04, shinF: -0.03 },
  });
  // 长外套下摆：盖到膝盖下面
  x.fillStyle = T.shade(coat, 0.92);
  x.beginPath();
  x.moveTo(-h * 0.06, -h * 0.03);
  x.lineTo(h * 0.065, -h * 0.03);
  x.lineTo(h * 0.085, h * 0.27);
  x.quadraticCurveTo(0, h * 0.285, -h * 0.085, h * 0.27);
  x.closePath();
  x.fill();
  // 外套中缝和腰带
  x.strokeStyle = 'rgba(0,0,0,0.22)';
  x.lineWidth = 3;
  x.beginPath(); x.moveTo(h * 0.02 * f, -h * 0.28); x.lineTo(h * 0.02 * f, h * 0.27); x.stroke();
  x.fillStyle = T.shade(coat, 0.7);
  x.fillRect(-h * 0.065, -h * 0.03, h * 0.13, h * 0.018);
  // 前臂盖在外套上
  x.restore();
  return P;
}

function child(x, v) {
  const h = 360;
  x.save();
  x.translate(0, -h * 0.445);
  T.side(x, {
    h, f: v.childF, kind: 'child',
    pal: { skin: '#cfa384', shirt: '#d9cdb4', pants: '#3b4452', hair: '#1d1613', shoe: '#ddd5c4' },
    pose: { torso: -0.02, head: -0.08, uArmN: 0.02, fArmN: 0.05, uArmF: -0.02, fArmF: 0, thighN: 0.02, shinN: 0, thighF: -0.02, shinF: 0 },
    sleeve: 0.5,
  });
  x.restore();
}

// 局部暖光：只提亮主体周围，不把整个画面一起提亮
function pool(x, cx, cy, r, a) {
  const g = x.createRadialGradient(cx, cy, 0, cx, cy, r);
  g.addColorStop(0, `rgba(240,206,168,${a})`);
  g.addColorStop(1, 'rgba(240,206,168,0)');
  x.save();
  x.globalCompositeOperation = 'screen';
  x.fillStyle = g;
  x.fillRect(cx - r, cy - r, r * 2, r * 2);
  x.restore();
}

// 整个客厅（1920×1080 画面坐标）
function room(x, v, t = 0) {
  const sun = 1 - v.rain;
  // 墙
  x.drawImage(T.wallTex(W, FLOOR, [66, 56, 48], 301, { cells: 7 }), 0, 0);
  // 护墙板
  rect(x, 0, FLOOR - 120, W, 120, 'rgba(22,17,14,0.6)');
  rect(x, 0, FLOOR - 124, W, 6, 'rgba(150,126,98,0.18)');
  // 地板
  const fg = x.createLinearGradient(0, FLOOR, 0, H);
  fg.addColorStop(0, '#2e241d'); fg.addColorStop(1, '#17120e');
  x.fillStyle = fg; x.fillRect(0, FLOOR, W, H - FLOOR);
  x.strokeStyle = 'rgba(20,12,8,0.35)'; x.lineWidth = 2;
  for (let i = 0; i < 9; i++) { const yy = FLOOR + 14 + i * i * 4.2; x.beginPath(); x.moveTo(0, yy); x.lineTo(W, yy); x.stroke(); }
  // 地毯
  x.fillStyle = 'rgba(78,40,32,0.5)';
  x.beginPath(); x.ellipse(820, 940, 560, 70, 0, 0, Math.PI * 2); x.fill();
  x.strokeStyle = 'rgba(170,140,110,0.12)'; x.lineWidth = 4;
  x.beginPath(); x.ellipse(820, 940, 520, 58, 0, 0, Math.PI * 2); x.stroke();
  // 墙上的挂画
  rect(x, 268, 286, 210, 158, '#1e1712');
  rect(x, 282, 300, 182, 130, '#5e5444');
  x.fillStyle = '#46504a'; x.beginPath(); x.moveTo(282, 430); x.lineTo(340, 360); x.lineTo(390, 400); x.lineTo(464, 340); x.lineTo(464, 430); x.fill();
  // 门：门洞里是更暗的走廊，门板向里开
  const D = DOOR;
  rect(x, D.x - 18, D.y - 18, D.w + 36, D.h + 18, '#1a140f');
  const dg = x.createLinearGradient(D.x, 0, D.x + D.w, 0);
  dg.addColorStop(0, '#120e0b'); dg.addColorStop(1, '#221a14');
  x.fillStyle = dg; x.fillRect(D.x, D.y, D.w, D.h);
  x.fillStyle = 'rgba(255,200,140,0.06)'; x.fillRect(D.x + D.w * 0.55, D.y, D.w * 0.45, D.h);
  x.fillStyle = '#2e231b';
  x.beginPath(); x.moveTo(D.x + D.w, D.y); x.lineTo(D.x + D.w + 52, D.y + 26); x.lineTo(D.x + D.w + 52, D.y + D.h - 16); x.lineTo(D.x + D.w, D.y + D.h); x.fill();
  // 窗：窗外 → 窗框 → 窗帘
  outside(x, v, t);
  const { x: wx, y: wy, w: ww, h: wh } = WIN;
  x.strokeStyle = '#8f8574'; x.lineWidth = 16;
  x.strokeRect(wx, wy, ww, wh);
  x.lineWidth = 9;
  x.beginPath(); x.moveTo(wx + ww / 2, wy); x.lineTo(wx + ww / 2, wy + wh); x.moveTo(wx, wy + wh * 0.42); x.lineTo(wx + ww, wy + wh * 0.42); x.stroke();
  rect(x, wx - 30, wy + wh + 6, ww + 60, 18, '#7c7262');
  x.fillStyle = '#3e342b';
  x.beginPath(); x.moveTo(wx - 96, wy - 30); x.lineTo(wx - 14, wy - 30); x.quadraticCurveTo(wx - 40, wy + 260, wx - 22, FLOOR - 40); x.lineTo(wx - 110, FLOOR - 40); x.quadraticCurveTo(wx - 92, wy + 300, wx - 96, wy - 30); x.fill();
  x.strokeStyle = 'rgba(40,28,20,0.25)'; x.lineWidth = 3;
  for (let i = 0; i < 4; i++) { x.beginPath(); x.moveTo(wx - 86 + i * 18, wy - 20); x.quadraticCurveTo(wx - 70 + i * 16, wy + 300, wx - 96 + i * 20, FLOOR - 44); x.stroke(); }
  // 晴天：窗光落在地板和墙上
  if (sun > 0.01) {
    x.save();
    x.globalCompositeOperation = 'screen';
    x.fillStyle = `rgba(255,214,150,${0.16 * sun})`;
    // 窗格的光斑落在地板上（被透视压扁、向左拉长）
    x.beginPath(); x.moveTo(wx - 40, FLOOR + 20); x.lineTo(wx + ww - 120, FLOOR + 20); x.lineTo(wx + ww - 380, H); x.lineTo(wx - 520, H); x.closePath(); x.fill();
    x.fillStyle = `rgba(255,220,170,${0.04 * sun})`;
    x.beginPath(); x.moveTo(wx, wy); x.lineTo(wx + ww, wy + wh); x.lineTo(wx + ww - 120, FLOOR + 20); x.lineTo(wx - 40, FLOOR + 20); x.closePath(); x.fill();
    x.restore();
  }
  // 雨天：屋里是阴的，墙上有一层冷灰
  if (v.rain > 0.01) { x.fillStyle = `rgba(16,20,26,${0.22 * v.rain})`; x.fillRect(0, 0, W, H); }
  // 沙发
  x.fillStyle = '#2a221d';
  x.beginPath(); x.roundRect(70, 590, 520, 180, 26); x.fill();
  x.fillStyle = '#32291f';
  x.beginPath(); x.roundRect(60, 700, 540, 110, 18); x.fill();
  x.fillStyle = '#231c17';
  x.beginPath(); x.roundRect(40, 650, 70, 170, 22); x.fill();
  x.beginPath(); x.roundRect(550, 650, 70, 170, 22); x.fill();
  rect(x, 80, 810, 14, 26, '#120e0b'); rect(x, 566, 810, 14, 26, '#120e0b');
  x.fillStyle = '#4c3f33'; x.beginPath(); x.roundRect(130, 620, 120, 90, 18); x.fill();
  // 背景暗、主体清楚：环境整体压暗，只在人物和窗的位置留出光
  x.save();
  x.globalCompositeOperation = 'multiply';
  x.fillStyle = 'rgb(150,140,132)';
  x.fillRect(0, 0, W, H);
  x.restore();
  pool(x, DOOR.x + 130, 560, 420, 0.22);
  // 走廊深处一点暖光：妈妈的头和肩在暗门洞里也能分出轮廓
  pool(x, DOOR.x + 150, 330, 190, 0.2);
  pool(x, v.childX, 700, 300, 0.18);
  pool(x, WIN.x + WIN.w / 2, WIN.y + WIN.h / 2, 380, 0.1 + 0.1 * sun);
  // 人物（受光：光从窗那边来）
  T.lit(x, (c) => { c.translate(DOOR.x + 130, FLOOR + 4); mother(c, v); },
    { light: v.motherF > 0 ? -0.5 : -2.6, rim: [255, 214, 160], rimA: 0.8, rimW: 3, shadow: 0.4, ambient: 1, bbox: [DOOR.x - 60, 200, 380, 660] });
  T.lit(x, (c) => { c.translate(v.childX, FLOOR + 40); child(c, v); },
    { light: v.childX > 900 ? -0.2 : -0.6, rim: [255, 220, 170], rimA: 0.75, rimW: 3, shadow: 0.35, ambient: 1, bbox: [v.childX - 120, 480, 240, 420] });
  // 冷：越想越冷（P5 用）
  if (v.cold > 0) {
    x.save();
    x.globalCompositeOperation = 'color';
    x.fillStyle = `rgba(90,110,130,${0.55 * v.cold})`;
    x.fillRect(0, 0, W, H);
    x.restore();
  }
}

// 两种「冲印」：照片 = 清楚、中性；记忆 = 柔、暖、高光晕开
const snapCache = new Map();
function snapshot(k, look = k >= 0.5 ? 'memory' : 'photo', t = 0) {
  const key = `${k.toFixed(3)}:${look}:${t}`;
  if (snapCache.has(key)) return snapCache.get(key);
  const c = createCanvas(W, H);
  const x = c.getContext('2d');
  room(x, version(k), t);
  finish(x, c, look);
  snapCache.set(key, c);
  return c;
}
function finish(x, c, look) {
  if (look === 'memory') {
    // 柔：低分辨率模糊叠回
    const s = createCanvas(W / 4, H / 4), sx = s.getContext('2d');
    sx.drawImage(c, 0, 0, W / 4, H / 4);
    x.save();
    x.globalAlpha = 0.4;
    x.filter = 'blur(6px)';
    x.drawImage(s, 0, 0, W, H);
    x.filter = 'none';
    x.globalAlpha = 0.16;
    x.globalCompositeOperation = 'screen';
    x.filter = 'blur(24px)';
    x.drawImage(s, 0, 0, W, H);
    x.restore();
    x.save();
    x.globalCompositeOperation = 'soft-light';
    x.fillStyle = 'rgba(240,170,110,0.15)';
    x.fillRect(0, 0, W, H);
    x.restore();
    // 记忆的边缘是化开的
    const g = x.createRadialGradient(W / 2, H / 2, H * 0.42, W / 2, H / 2, H * 1.05);
    g.addColorStop(0, 'rgba(12,9,7,0)');
    g.addColorStop(1, 'rgba(12,9,7,0.7)');
    x.fillStyle = g;
    x.fillRect(0, 0, W, H);
  } else {
    // 照片：略偏冷、略褪色
    x.save();
    x.globalCompositeOperation = 'soft-light';
    x.fillStyle = 'rgba(110,124,140,0.22)';
    x.fillRect(0, 0, W, H);
    x.globalCompositeOperation = 'source-over';
    x.fillStyle = 'rgba(200,196,188,0.03)';
    x.fillRect(0, 0, W, H);
    x.restore();
  }
}

// ---------------- 冲印照片（白边） ----------------
const borderCache = new Map();
function borderTex(w, h, seed) {
  const key = `${Math.round(w)}x${Math.round(h)}:${seed}`;
  if (borderCache.has(key)) return borderCache.get(key);
  const c = createCanvas(Math.round(w), Math.round(h)), x = c.getContext('2d');
  x.fillStyle = '#d2c9b6'; x.fillRect(0, 0, w, h);
  mottle(x, w, h, 6, seed, 0.18, [150, 126, 92]);
  mottle(x, w, h, 30, seed + 1, 0.07, [120, 100, 70]);
  borderCache.set(key, c);
  return c;
}
// img 以 (0,0) 为中心，宽 w（高按 16:9）。o.border：白边宽度；o.bottom：下边额外留白
function print(ctx, img, w, o = {}) {
  const { border = 22, bottom = 0, alpha = 1, seed = 5, shadow = 1, feather = false } = o;
  const h = w * 9 / 16;
  ctx.save();
  ctx.globalAlpha *= alpha;
  if (border > 0) {
    const bw = w + border * 2, bh = h + border * 2 + bottom;
    ctx.save();
    ctx.shadowColor = `rgba(0,0,0,${0.6 * shadow})`;
    ctx.shadowBlur = 34;
    ctx.shadowOffsetY = 14;
    ctx.fillStyle = '#cfc6b4';
    ctx.fillRect(-bw / 2, -h / 2 - border, bw, bh);
    ctx.restore();
    ctx.drawImage(borderTex(bw, bh, seed), -bw / 2, -h / 2 - border, bw, bh);
  }
  if (feather) {
    // 记忆：没有白边，边缘化进黑暗
    const c = featherCanvas(img);
    ctx.drawImage(c, -w / 2 - w * 0.04, -h / 2 - h * 0.04, w * 1.08, h * 1.08);
  } else {
    ctx.drawImage(img, -w / 2, -h / 2, w, h);
    ctx.strokeStyle = 'rgba(0,0,0,0.25)'; ctx.lineWidth = 1;
    ctx.strokeRect(-w / 2, -h / 2, w, h);
  }
  ctx.restore();
}
const featherMap = new Map();
function featherCanvas(img) {
  if (featherMap.has(img)) return featherMap.get(img);
  const pw = Math.round(W * 1.08), ph = Math.round(H * 1.08);
  const c = createCanvas(pw, ph), x = c.getContext('2d');
  x.drawImage(img, (pw - W) / 2, (ph - H) / 2);
  x.globalCompositeOperation = 'destination-in';
  const g = x.createRadialGradient(pw / 2, ph / 2, H * 0.36, pw / 2, ph / 2, H * 0.62);
  g.addColorStop(0, 'rgba(0,0,0,1)');
  g.addColorStop(1, 'rgba(0,0,0,0)');
  x.save(); x.translate(pw / 2, ph / 2); x.scale(W / H, 1); x.translate(-pw / 2, -ph / 2);
  x.fillStyle = g; x.fillRect(-pw, -ph, pw * 3, ph * 3);
  x.restore();
  featherMap.set(img, c);
  return c;
}

// ---------------- 档案元素 ----------------
// 蜡笔圈：从 k = 0 画到 k = 1，比一整圈多一点，线有抖动
function crayonCircle(ctx, cx, cy, rx, ry, k, o = {}) {
  const { seed = 1, color = 'rgba(244,232,210,0.92)', width = 4 } = o;
  if (k <= 0) return;
  const r = rng(seed);
  const a0 = -2.2 + r() * 0.6, span = Math.PI * 2 * 1.12 * k;
  const j1 = r() * 10, j2 = r() * 10;
  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.lineCap = 'round';
  ctx.shadowColor = 'rgba(0,0,0,0.5)';
  ctx.shadowBlur = 4;
  ctx.beginPath();
  const N = 90;
  for (let i = 0; i <= N; i++) {
    const a = a0 + span * (i / N);
    const g = 1 + 0.06 * Math.sin(a * 2 + j1) + 0.05 * (i / N) + 0.02 * Math.sin(a * 7 + j2);
    const px = cx + Math.cos(a) * rx * g, py = cy + Math.sin(a) * ry * g;
    if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
  }
  ctx.stroke();
  ctx.restore();
}

// 红色印章：k 是落下的进度（0 = 还没落，1 = 已经压实）
function stamp(ctx, text, x, y, t, t0, o = {}) {
  const { size = 112, rot = -0.11, color = '#a5342a', alpha = 1 } = o;
  if (t < t0 - 0.12) return;
  const land = clamp((t - (t0 - 0.12)) / 0.12);
  const s = t < t0 ? lerp(1.7, 1, land * land) : 1 + 0.04 * Math.exp(-(t - t0) * 9) * Math.cos((t - t0) * 30);
  const a = (t < t0 ? land * 0.5 : 1) * alpha;
  const { measure } = { measure: (() => { const m = createCanvas(4, 4).getContext('2d'); m.font = FONT.serif(size); m.letterSpacing = `${size * 0.3}px`; return m.measureText(text).width; })() };
  const bw = measure + size * 0.7, bh = size * 1.5;
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rot);
  ctx.scale(s, s);
  ctx.globalAlpha *= a * 0.92;
  ctx.strokeStyle = color;
  ctx.lineWidth = size * 0.07;
  ctx.strokeRect(-bw / 2, -bh / 2, bw, bh);
  ctx.lineWidth = size * 0.025;
  ctx.strokeRect(-bw / 2 + size * 0.12, -bh / 2 + size * 0.12, bw - size * 0.24, bh - size * 0.24);
  inkText(ctx, text, 0, size * 0.36, { font: FONT.serif(size), color, align: 'center', seed: 31, wear: 0.5, spacing: size * 0.3 });
  // 漏墨的斑点
  const r = rng(77);
  ctx.globalCompositeOperation = 'destination-out';
  for (let i = 0; i < 60; i++) { ctx.fillStyle = `rgba(0,0,0,${0.3 + r() * 0.6})`; ctx.beginPath(); ctx.arc((r() - 0.5) * bw, (r() - 0.5) * bh, 1 + r() * 4, 0, Math.PI * 2); ctx.fill(); }
  ctx.restore();
}

// 打字机 / 档案小标签
function label(ctx, text, x, y, o = {}) {
  const { size = 30, alpha = 1, color = '#d6cab2', align = 'center', font = FONT.body, ls = 4 } = o;
  if (alpha <= 0.01) return;
  ctx.save();
  ctx.globalAlpha *= alpha;
  ctx.font = font(size);
  ctx.letterSpacing = `${ls}px`;
  ctx.textAlign = align;
  ctx.fillStyle = color;
  ctx.shadowColor = 'rgba(0,0,0,0.6)';
  ctx.shadowBlur = 8;
  ctx.fillText(text, x, y);
  ctx.restore();
}

module.exports = { ...T, T, TRUTH, MEMORY, version, room, snapshot, finish, print, crayonCircle, stamp, label, WIN, DOOR, FLOOR, spring, rgb, hex, inkText };
