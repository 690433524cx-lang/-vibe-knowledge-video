// 旧档案纸：一次性生成，逐帧复用。
const { createCanvas } = require('@napi-rs/canvas');
const { W, H } = require('../config');
const { rng } = require('./util');

// 用「小随机图放大」得到平滑的低频斑驳
function blotch(ctx, w, h, cells, seed, alpha, dark) {
  const r = rng(seed);
  const cw = Math.ceil(cells), ch = Math.ceil(cells * h / w);
  const small = createCanvas(cw, ch);
  const s = small.getContext('2d');
  const img = s.createImageData(cw, ch);
  for (let i = 0; i < cw * ch; i++) {
    const v = r();
    img.data[i * 4] = dark[0]; img.data[i * 4 + 1] = dark[1]; img.data[i * 4 + 2] = dark[2];
    img.data[i * 4 + 3] = Math.floor(v * v * 255 * alpha);
  }
  s.putImageData(img, 0, 0);
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(small, 0, 0, w, h);
}

function makePaper(seed = 7, scale = 1.12) {
  const w = Math.round(W * scale), h = Math.round(H * scale);
  const c = createCanvas(w, h);
  const x = c.getContext('2d');
  const r = rng(seed);

  x.fillStyle = '#e8ddc4';
  x.fillRect(0, 0, w, h);
  // 低频泛黄斑驳
  blotch(x, w, h, 7, seed + 1, 0.22, [178, 150, 98]);
  blotch(x, w, h, 18, seed + 2, 0.12, [160, 135, 90]);
  blotch(x, w, h, 60, seed + 3, 0.06, [120, 100, 70]);
  // 浅色提亮
  blotch(x, w, h, 12, seed + 4, 0.18, [246, 240, 225]);

  // 纸纤维
  x.lineCap = 'round';
  for (let i = 0; i < 9000; i++) {
    const px = r() * w, py = r() * h;
    const a = r() * Math.PI, len = 3 + r() * 14;
    x.strokeStyle = r() < 0.5 ? `rgba(110,90,60,${0.03 + r() * 0.05})` : `rgba(255,250,235,${0.05 + r() * 0.07})`;
    x.lineWidth = 0.6 + r() * 0.8;
    x.beginPath();
    x.moveTo(px, py);
    x.quadraticCurveTo(px + Math.cos(a) * len * 0.5 + (r() - 0.5) * 3, py + Math.sin(a) * len * 0.5 + (r() - 0.5) * 3,
      px + Math.cos(a) * len, py + Math.sin(a) * len);
    x.stroke();
  }
  // 细小杂点
  for (let i = 0; i < 2600; i++) {
    x.fillStyle = `rgba(80,62,40,${0.05 + r() * 0.15})`;
    const s = 0.5 + r() * 1.4;
    x.fillRect(r() * w, r() * h, s, s);
  }
  // 两处很淡的水渍环
  for (let k = 0; k < 2; k++) {
    const cx = (k ? 0.82 : 0.12) * w, cy = (k ? 0.18 : 0.8) * h, rad = 90 + r() * 70;
    for (let j = 0; j < 3; j++) {
      x.strokeStyle = `rgba(150,115,60,${0.035 + r() * 0.03})`;
      x.lineWidth = 2 + r() * 5;
      x.beginPath();
      x.ellipse(cx + r() * 6, cy + r() * 6, rad + j * 3, rad * 0.92 + j * 2, r(), 0, Math.PI * 2);
      x.stroke();
    }
  }
  // 折痕：一条竖折、一条横折（亮暗相邻的一对细线）
  const fold = (x0, y0, x1, y1) => {
    const g = 1.2;
    x.lineWidth = 2;
    x.strokeStyle = 'rgba(120,100,70,0.10)';
    x.beginPath(); x.moveTo(x0, y0); x.lineTo(x1, y1); x.stroke();
    x.strokeStyle = 'rgba(255,252,240,0.22)';
    x.beginPath(); x.moveTo(x0 + g * 2, y0 + g); x.lineTo(x1 + g * 2, y1 + g); x.stroke();
  };
  fold(w * 0.63, 0, w * 0.635, h);
  fold(0, h * 0.41, w, h * 0.405);
  return c;
}

// 深色档案室桌面：黑棕底、极淡木纹与斑驳。只有被灯照到的地方才看得见纹理。
function makeDesk(seed = 17, scale = 1.12) {
  const w = Math.round(W * scale), h = Math.round(H * scale);
  const c = createCanvas(w, h);
  const x = c.getContext('2d');
  const r = rng(seed);
  x.fillStyle = '#2a2019';
  x.fillRect(0, 0, w, h);
  blotch(x, w, h, 6, seed + 1, 0.35, [12, 9, 7]);
  blotch(x, w, h, 16, seed + 2, 0.18, [70, 54, 40]);
  blotch(x, w, h, 50, seed + 3, 0.10, [10, 8, 6]);
  // 横向木纹
  for (let i = 0; i < 420; i++) {
    const y0 = r() * h, len = 200 + r() * 900, x0 = r() * w - 200;
    x.strokeStyle = r() < 0.6 ? `rgba(10,7,5,${0.06 + r() * 0.08})` : `rgba(110,86,62,${0.03 + r() * 0.05})`;
    x.lineWidth = 0.8 + r() * 2.2;
    x.beginPath();
    x.moveTo(x0, y0);
    x.bezierCurveTo(x0 + len * 0.3, y0 + (r() - 0.5) * 8, x0 + len * 0.7, y0 + (r() - 0.5) * 8, x0 + len, y0 + (r() - 0.5) * 6);
    x.stroke();
  }
  for (let i = 0; i < 1800; i++) {
    x.fillStyle = r() < 0.5 ? `rgba(0,0,0,${0.1 + r() * 0.2})` : `rgba(140,115,85,${0.04 + r() * 0.08})`;
    const s = 0.6 + r() * 1.4;
    x.fillRect(r() * w, r() * h, s, s);
  }
  return c;
}

function makeGrain(count = 6, seed = 99) {
  const frames = [];
  const gw = W / 2, gh = H / 2;
  for (let k = 0; k < count; k++) {
    const r = rng(seed + k * 31);
    const c = createCanvas(gw, gh);
    const x = c.getContext('2d');
    const img = x.createImageData(gw, gh);
    for (let i = 0; i < gw * gh; i++) {
      const v = Math.floor(128 + (r() + r() + r() - 1.5) * 120);
      img.data[i * 4] = img.data[i * 4 + 1] = img.data[i * 4 + 2] = v;
      img.data[i * 4 + 3] = 255;
    }
    x.putImageData(img, 0, 0);
    frames.push(c);
  }
  return frames;
}

function makeVignette() {
  const c = createCanvas(W, H);
  const x = c.getContext('2d');
  const g = x.createRadialGradient(W / 2, H / 2, H * 0.35, W / 2, H / 2, H * 1.05);
  g.addColorStop(0, 'rgba(0,0,0,0)');
  g.addColorStop(1, 'rgba(0,0,0,0.55)');
  x.fillStyle = g;
  x.fillRect(0, 0, W, H);
  return c;
}

module.exports = { makeDesk, makePaper, makeGrain, makeVignette };
