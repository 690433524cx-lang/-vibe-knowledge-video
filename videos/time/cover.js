// 封面：node videos/time/cover.js --video time output/time/cover.jpg
//   黑暗房间里一个成年人的背影；身后是大量模糊、重复的日历页和通勤画面；
//   前景只有一张童年照片被暖光照亮。标题「时间错觉」，英文小字 TIME PERCEPTION。
const fs = require('fs');
const path = require('path');
const { createCanvas } = require('@napi-rs/canvas');
const L = require('./lib');
const { W, H, FONT, rng, lerp } = L;
const summer = require('./scenes/t1_summer');
const commute = require('./scenes/t3_commute');
const { inkText } = require('../../src/lib/material');

const out = process.argv.filter((a) => a.endsWith('.jpg') || a.endsWith('.png'))[0] || 'output/time/cover.jpg';
const c = createCanvas(W, H);
const x = c.getContext('2d');
x.fillStyle = '#0f1013';
x.fillRect(0, 0, W, H);

// 身后：重复的日子（通勤画面 + 日历页），模糊、偏冷、一层压一层
const layer = createCanvas(W, H), lx = layer.getContext('2d');
const r = rng(2024);
for (let i = 0; i < 9; i++) {
  lx.setTransform(1, 0, 0, 1, 0, 0);
  lx.clearRect(0, 0, W, H);
  commute.draw(lx, 10.0 + (i % 6) * 0.45 + 0.2);
  x.save();
  x.globalAlpha = 0.16;
  x.filter = 'blur(10px) grayscale(0.5)';
  x.drawImage(layer, (r() - 0.5) * 240, (r() - 0.5) * 120);
  x.restore();
}
for (let i = 0; i < 60; i++) {
  x.save();
  x.translate(r() * W, r() * H * 0.8);
  x.rotate((r() - 0.5) * 0.3);
  x.globalAlpha = 0.07 + r() * 0.06;
  x.filter = 'blur(4px)';
  x.fillStyle = '#c8c0b0';
  x.fillRect(-40, -50, 80, 100);
  x.restore();
}
x.fillStyle = 'rgba(10,11,14,0.55)';
x.fillRect(0, 0, W, H);

// 成年人的背影（腰以上，偏左）
L.lit(x, (cx) => {
  cx.translate(640, 1060);
  L.bust(cx, { h: 1700, kind: 'adult', tilt: 0.05 });
}, { light: -0.15, rim: [255, 200, 140], rimA: 0.9, rimW: 6, shadow: 0.6, ambient: 0.5, bbox: [260, 180, 760, 900] });

// 前景：一张童年照片，被暖光照亮
lx.setTransform(1, 0, 0, 1, 0, 0);
lx.clearRect(0, 0, W, H);
summer.draw(lx, 0.6);
const PW = 560, PH = 315;
x.save();
x.translate(1420, 760);
x.rotate(-0.06);
x.shadowColor = 'rgba(0,0,0,0.7)';
x.shadowBlur = 40;
x.shadowOffsetY = 16;
x.fillStyle = '#e4dccb';
x.fillRect(-PW / 2 - 18, -PH / 2 - 18, PW + 36, PH + 64);
x.shadowColor = 'transparent';
x.drawImage(layer, -PW / 2, -PH / 2, PW, PH);
L.dateStamp(x, 'JUL 14', { alpha: 0 });
x.restore();
// 暖光只照着这张照片
const g = x.createRadialGradient(1420, 760, 0, 1420, 760, 520);
g.addColorStop(0, 'rgba(255,200,130,0.22)');
g.addColorStop(1, 'rgba(255,200,130,0)');
x.globalCompositeOperation = 'screen';
x.fillStyle = g;
x.fillRect(0, 0, W, H);
x.globalCompositeOperation = 'source-over';
// 暗角
const v = x.createRadialGradient(W / 2, H / 2, H * 0.3, W / 2, H / 2, H);
v.addColorStop(0, 'rgba(0,0,0,0)');
v.addColorStop(1, 'rgba(0,0,0,0.65)');
x.fillStyle = v;
x.fillRect(0, 0, W, H);

// 标题
x.shadowColor = 'rgba(0,0,0,0.8)';
x.shadowBlur = 30;
inkText(x, '时间错觉', 1000, 320, { font: FONT.serif(168), color: '#efe6d3', seed: 2025, wear: 0.08, spacing: 26 });
x.shadowBlur = 0;
x.font = FONT.en(40);
x.letterSpacing = '18px';
x.fillStyle = 'rgba(232,220,198,0.75)';
x.fillText('TIME PERCEPTION', 1010, 400);

// 颗粒
const grain = createCanvas(W, H), gx = grain.getContext('2d');
const img = gx.createImageData(W, H);
const rr = rng(77);
for (let i = 0; i < W * H; i++) { const val = 128 + (rr() + rr() - 1) * 60; img.data[i * 4] = img.data[i * 4 + 1] = img.data[i * 4 + 2] = val; img.data[i * 4 + 3] = 255; }
gx.putImageData(img, 0, 0);
x.globalCompositeOperation = 'overlay';
x.globalAlpha = 0.08;
x.drawImage(grain, 0, 0);

fs.mkdirSync(path.dirname(out), { recursive: true });
fs.writeFileSync(out, c.toBuffer('image/jpeg', 93));
console.log(out);
