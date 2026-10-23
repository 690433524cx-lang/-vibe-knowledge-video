// 封面：node videos/memory/cover.js --video memory output/memory/cover.jpg
//   深色桌面，正中一张旧照片极淡地压在暗处，照片上叠着错位的第二版本（红 / 藏青）。
//   主标题「被改写的记忆」居中、大、稳；副标题一行；角落一枚很小的暗红「确定」印章。
const fs = require('fs');
const path = require('path');
const { createCanvas } = require('@napi-rs/canvas');
const L = require('./lib');
const { W, H, FONT, rng } = L;
const { inkText, mottle } = require('../../src/lib/material');

const out = process.argv.filter((a) => a.endsWith('.jpg') || a.endsWith('.png'))[0] || 'output/memory/cover.jpg';
const c = createCanvas(W, H);
const x = c.getContext('2d');
x.fillStyle = '#100d0b';
x.fillRect(0, 0, W, H);
mottle(x, W, H, 6, 21, 0.3, [40, 32, 26]);
mottle(x, W, H, 14, 22, 0.15, [6, 5, 4]);

// 照片：放在标题后面，被压暗
const PW = 1240, PHh = PW * 9 / 16;
x.save();
x.translate(W / 2, H / 2 - 10);
x.rotate(-0.025);
x.globalAlpha = 0.95;
L.print(x, L.snapshot(1, 'memory'), PW, { border: 26, seed: 3 });
x.save();
x.beginPath(); x.rect(-PW / 2, -PHh / 2, PW, PHh); x.clip();
x.globalAlpha = 0.32;
x.drawImage(L.snapshot(0, 'photo'), -PW / 2 + 18, -PHh / 2 - 10, PW, PHh);
x.restore();
x.restore();
// 压暗：让标题在中间站得住，四周沉下去
x.fillStyle = 'rgba(10,8,7,0.62)';
x.fillRect(0, 0, W, H);
const v = x.createRadialGradient(W / 2, H / 2, H * 0.2, W / 2, H / 2, H * 0.95);
v.addColorStop(0, 'rgba(0,0,0,0)');
v.addColorStop(1, 'rgba(0,0,0,0.7)');
x.fillStyle = v;
x.fillRect(0, 0, W, H);
// 一束很弱的暖光落在标题位置
const g = x.createRadialGradient(W / 2, 500, 0, W / 2, 500, 700);
g.addColorStop(0, 'rgba(255,200,140,0.12)');
g.addColorStop(1, 'rgba(255,200,140,0)');
x.globalCompositeOperation = 'screen';
x.fillStyle = g;
x.fillRect(0, 0, W, H);
x.globalCompositeOperation = 'source-over';

// 标题
x.font = FONT.en(30);
x.letterSpacing = '16px';
x.textAlign = 'center';
x.fillStyle = 'rgba(214,202,180,0.6)';
x.fillText('MEMORY, REWRITTEN', W / 2, 360);
x.shadowColor = 'rgba(0,0,0,0.85)';
x.shadowBlur = 30;
inkText(x, '被改写的记忆', W / 2, 560, { font: FONT.serif(170), color: '#efe6d3', align: 'center', seed: 2026, wear: 0.04, spacing: 30 });
x.shadowBlur = 16;
x.font = FONT.body(48);
x.letterSpacing = '6px';
x.fillStyle = '#e2d7c1';
x.fillText('你最确定的那段回忆，可能是你自己编的', W / 2, 690);
x.shadowBlur = 0;
// 细线
x.fillStyle = 'rgba(214,202,180,0.35)';
x.fillRect(W / 2 - 60, 618, 120, 2);
// 小印章
L.stamp(x, '确定', 1560, 860, 1, 0.5, { size: 54, rot: -0.12, alpha: 0.85 });

// 颗粒
const grain = createCanvas(W, H), gx = grain.getContext('2d');
const img = gx.createImageData(W, H);
const rr = rng(77);
for (let i = 0; i < W * H; i++) { const val = 128 + (rr() + rr() - 1) * 60; img.data[i * 4] = img.data[i * 4 + 1] = img.data[i * 4 + 2] = val; img.data[i * 4 + 3] = 255; }
gx.putImageData(img, 0, 0);
x.globalCompositeOperation = 'overlay';
x.globalAlpha = 0.07;
x.drawImage(grain, 0, 0);

fs.mkdirSync(path.dirname(out), { recursive: true });
fs.writeFileSync(out, c.toBuffer('image/jpeg', 93));
console.log(out);
