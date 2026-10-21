// 第二幕 · 6.0–10.3 秒：一年。
//   6.0–6.75  墙上日历的特写，镜头推向「7」。
//   6.5–6.9   内容转场：日历上的「7 月」→ 手机锁屏上的月份（同一位置叠化）。
//   6.75–10.3 成年人的手拿着手机：JAN → MAR → JUN → SEP → DEC，越翻越快；DEC 停住，屏幕自动熄灭。
const L = require('../lib');
const { W, H, FONT, rng, noise1, lerp, prog, smooth } = L;
const { spring } = require('../../../src/lib/motion');
const summer = require('./t1_summer');

const S = { start: 5.9, end: 10.35 };
const CAL0 = 5.95, PH0 = 6.55, MIXD = 0.35;
const MONTHS = [['JAN', 6.55], ['MAR', 7.55], ['JUN', 8.1], ['SEP', 8.5], ['DEC', 8.8]];
const OFF0 = 9.75, OFF1 = 10.15; // 屏幕变暗 → 熄灭

// 日历特写：从窗边那一镜的日历位置推进
function drawCalendar(ctx, d) {
  const k = smooth(prog(d, CAL0, PH0 + MIXD));
  ctx.drawImage(L.wallTex(W, H, [196, 182, 156], 501), 0, 0);
  ctx.save();
  // 日历中心 → 画面中心偏右（与手机屏幕上的月份对齐）
  const s = lerp(2.3, 2.7, k);
  ctx.translate(lerp(960, 930, k), lerp(560, 600, k));
  ctx.scale(s, s);
  ctx.translate(-470, -440);
  summer.calendar(ctx, d);
  ctx.restore();
  // 窗光从右边打来
  const g = ctx.createLinearGradient(0, 0, W, 0);
  g.addColorStop(0, 'rgba(20,14,10,0.35)');
  g.addColorStop(1, 'rgba(255,220,160,0.12)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
}

// 当前月份（带滚动过渡）：返回 [当前, 上一个, 过渡进度]
function monthAt(d) {
  let i = 0;
  for (let j = 0; j < MONTHS.length; j++) if (d >= MONTHS[j][1]) i = j;
  const k = i > 0 ? Math.min(1, spring(d, MONTHS[i][1], 4.2, 0.9)) : 1;
  return [MONTHS[i][0], i > 0 ? MONTHS[i - 1][0] : null, k, i];
}

const PHONE = { x: 985, y: 510, w: 420, h: 860, r: 54, rot: -0.07 };
// 锁屏壁纸随季节换一点色温
const TINT = { JAN: ['#26303c', '#11161d'], MAR: ['#2b3530', '#121813'], JUN: ['#33352c', '#17170f'], SEP: ['#3a3029', '#171210'], DEC: ['#262a33', '#0f1116'] };

function screen(ctx, d, on) {
  const [m, prev, k, idx] = monthAt(d);
  const { w, h } = PHONE;
  // 壁纸
  const [a, b] = TINT[m];
  const g = ctx.createLinearGradient(0, -h / 2, 0, h / 2);
  g.addColorStop(0, a);
  g.addColorStop(1, b);
  ctx.fillStyle = g;
  ctx.fillRect(-w / 2, -h / 2, w, h);
  // 壁纸上一点模糊的光（像一张夜景照片）
  ctx.save();
  ctx.filter = 'blur(30px)';
  const r = rng(91);
  for (let i = 0; i < 6; i++) {
    ctx.fillStyle = `rgba(${200 + r() * 55},${150 + r() * 60},${100 + r() * 50},0.18)`;
    ctx.beginPath();
    ctx.arc(-w / 2 + r() * w, h * 0.05 + r() * h * 0.4, 30 + r() * 60, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
  // 状态栏
  ctx.fillStyle = 'rgba(232,226,214,0.7)';
  ctx.font = FONT.en(24);
  ctx.textAlign = 'left';
  ctx.fillText('7:12', -w / 2 + 40, -h / 2 + 52);
  ctx.textAlign = 'right';
  ctx.fillRect(w / 2 - 74, -h / 2 + 34, 34, 16);
  // 月份：大字，旧的向上滑走，新的从下面升上来
  ctx.save();
  ctx.beginPath();
  ctx.rect(-w / 2, -h / 2 + 90, w, 220);
  ctx.clip();
  ctx.textAlign = 'center';
  ctx.font = FONT.enMed(150);
  ctx.letterSpacing = '6px';
  const y0 = -h / 2 + 250;
  if (prev && k < 1) {
    ctx.fillStyle = `rgba(240,234,222,${1 - k})`;
    ctx.fillText(prev, 0, y0 - k * 150);
  }
  ctx.fillStyle = `rgba(240,234,222,${prev ? k : 1})`;
  ctx.fillText(m, 0, y0 + (1 - k) * 150);
  ctx.restore();
  // 日期 + 星期（小）
  ctx.textAlign = 'center';
  ctx.font = FONT.en(30);
  ctx.letterSpacing = '4px';
  ctx.fillStyle = 'rgba(220,212,198,0.75)';
  const days = ['14  ·  TUE', '11  ·  TUE', '17  ·  TUE', '16  ·  TUE', '15  ·  TUE'];
  ctx.fillText(days[idx], 0, -h / 2 + 310);
  ctx.letterSpacing = '0px';
  // 一条通知
  ctx.fillStyle = 'rgba(255,255,255,0.08)';
  ctx.beginPath(); ctx.roundRect(-w / 2 + 28, -h / 2 + 400, w - 56, 92, 22); ctx.fill();
  ctx.fillStyle = 'rgba(220,212,198,0.5)';
  ctx.fillRect(-w / 2 + 56, -h / 2 + 428, 180, 10);
  ctx.fillRect(-w / 2 + 56, -h / 2 + 456, 280, 10);
  // 屏幕变暗 → 熄灭
  const off = 1 - on;
  if (off > 0) {
    ctx.fillStyle = `rgba(4,5,7,${off})`;
    ctx.fillRect(-w / 2, -h / 2, w, h);
  }
}

function hand(ctx, d) {
  const { w, h } = PHONE;
  ctx.fillStyle = '#a07a62';
  // 手掌：托在手机背后，从右下方伸进来，手腕出画
  ctx.beginPath();
  ctx.moveTo(w / 2 + 70, h / 2 + 460);
  ctx.quadraticCurveTo(w / 2 + 120, h * 0.3, w / 2 + 30, h * 0.04);
  ctx.lineTo(-w / 2 + 30, h * 0.2);
  ctx.quadraticCurveTo(-w / 2 - 90, h * 0.36, -w / 2 - 60, h / 2 + 460);
  ctx.closePath();
  ctx.fill();
  // 大拇指：沿着左边框，指尖压在屏幕边上
  ctx.save();
  ctx.translate(-w / 2 - 18, h * 0.3);
  ctx.rotate(0.32);
  ctx.beginPath(); ctx.roundRect(-34, -210, 70, 250, 34); ctx.fill();
  ctx.fillStyle = 'rgba(255,230,210,0.18)';
  ctx.beginPath(); ctx.ellipse(10, -180, 16, 22, 0, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
}
function fingers(ctx) {
  const { w, h } = PHONE;
  // 四根手指从背后绕过右边框，指尖搭在屏幕边缘
  for (let i = 0; i < 4; i++) {
    const y = -h * 0.06 + i * 76 + i * i * 3;
    ctx.fillStyle = i % 2 ? '#a07a62' : '#a8826a';
    ctx.beginPath();
    ctx.roundRect(w / 2 - 30 - i * 4, y, 110, 68, [34, 20, 20, 34]);
    ctx.fill();
    ctx.fillStyle = 'rgba(60,36,26,0.35)';
    ctx.fillRect(w / 2 - 6 - i * 4, y + 6, 3, 56);
  }
}

function drawPhone(ctx, d) {
  // 背景：夜里的房间，远处几点暖色虚光
  ctx.fillStyle = '#16181c';
  ctx.fillRect(0, 0, W, H);
  ctx.save();
  ctx.filter = 'blur(40px)';
  const r = rng(93);
  for (let i = 0; i < 5; i++) {
    ctx.fillStyle = `rgba(${180 + r() * 60},${130 + r() * 40},90,0.16)`;
    ctx.beginPath();
    ctx.arc(r() * 700, 200 + r() * 600, 60 + r() * 80, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
  const on = 1 - smooth(prog(d, OFF0, OFF1));
  const lt = d - PH0;
  const push = 1 + lt * 0.01;
  const dr = L.drift(d, 95, 5);
  ctx.save();
  ctx.translate(PHONE.x + dr.x, PHONE.y + dr.y);
  ctx.scale(push, push);
  ctx.rotate(PHONE.rot + noise1(d * 0.5, 96) * 0.008);
  const { w, h, r: rr } = PHONE;
  L.lit(ctx, (c) => {
    // lit() 用的是当前变换：这里已经在手机坐标系里
    hand(c, d);
  }, { light: -1.9, rim: [170, 190, 220], rimA: 0.6 * on + 0.15, shadow: 0.5, ambient: 0.55 + 0.35 * on, bbox: [600, 400, 900, 700] });
  // 机身
  ctx.fillStyle = '#0c0d10';
  ctx.beginPath(); ctx.roundRect(-w / 2 - 12, -h / 2 - 12, w + 24, h + 24, rr + 10); ctx.fill();
  ctx.save();
  ctx.beginPath(); ctx.roundRect(-w / 2, -h / 2, w, h, rr); ctx.clip();
  screen(ctx, d, on);
  // 玻璃反光
  const gl = ctx.createLinearGradient(-w / 2, -h / 2, w / 2, h / 2);
  gl.addColorStop(0, 'rgba(255,255,255,0.06)');
  gl.addColorStop(0.4, 'rgba(255,255,255,0)');
  ctx.fillStyle = gl;
  ctx.fillRect(-w / 2, -h / 2, w, h);
  ctx.restore();
  L.lit(ctx, (c) => fingers(c), { light: Math.PI, rim: [200, 210, 230], rimA: 0.5 * on, shadow: 0.4, ambient: 0.5 + 0.4 * on, bbox: [1100, 500, 300, 400] });
  ctx.restore();
}

function draw(ctx, d) {
  if (d < PH0 + MIXD) {
    ctx.save();
    ctx.globalAlpha = smooth(prog(d, CAL0, CAL0 + 0.18));
    drawCalendar(ctx, d);
    ctx.restore();
  }
  if (d >= PH0) {
    ctx.save();
    ctx.globalAlpha = smooth(prog(d, PH0, PH0 + MIXD));
    drawPhone(ctx, d);
    ctx.restore();
  }
}

function light(d) {
  const k = smooth(prog(d, PH0, PH0 + MIXD));
  const on = 1 - smooth(prog(d, OFF0, OFF1));
  return [
    { x: 960, y: 540, rx: 1200, ry: 800, i: 0.9, w: 1 - k },
    { x: PHONE.x, y: PHONE.y - 120, rx: 760, ry: 760, i: 0.95 * on + 0.1, w: k, color: [190, 205, 230] },
  ];
}
function grade(d) {
  return d < PH0 + 0.2 ? { warm: 0.4, ambient: 0.5 } : { warm: -0.35, ambient: 0.18 };
}

module.exports = { ...S, draw, light, grade };
