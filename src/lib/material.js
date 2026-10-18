// 真实材质（第二版）：有纤维、有厚度、边缘磨损、受光不均的纸；银盐颗粒；墨色不均的字。
// 纹理按尺寸和种子缓存，逐帧只做 drawImage。
const { createCanvas } = require('@napi-rs/canvas');
const { rng, lerp, clamp } = require('./util');

const cache = new Map();

// 用小随机图放大得到低频斑驳
function mottle(x, w, h, cells, seed, alpha, rgb) {
  const r = rng(seed);
  const cw = Math.max(2, Math.ceil(cells)), ch = Math.max(2, Math.ceil(cells * h / w));
  const s = createCanvas(cw, ch);
  const sx = s.getContext('2d');
  const img = sx.createImageData(cw, ch);
  for (let i = 0; i < cw * ch; i++) {
    const v = r();
    img.data[i * 4] = rgb[0]; img.data[i * 4 + 1] = rgb[1]; img.data[i * 4 + 2] = rgb[2];
    img.data[i * 4 + 3] = Math.floor(v * v * 255 * alpha);
  }
  sx.putImageData(img, 0, 0);
  x.imageSmoothingEnabled = true;
  x.imageSmoothingQuality = 'high';
  x.drawImage(s, 0, 0, w, h);
}

// 不规则的纸边：每条边上的小起伏（像裁切和磨损）
function edgePath(x, w, h, seed, rough) {
  const r = rng(seed);
  const pts = [];
  const step = 14;
  const jit = () => (r() - 0.5) * rough + (r() < 0.06 ? -rough * 1.5 * r() : 0);
  for (let px = 0; px <= w; px += step) pts.push([px, jit()]);
  for (let py = 0; py <= h; py += step) pts.push([w + jit(), py]);
  for (let px = w; px >= 0; px -= step) pts.push([px, h + jit()]);
  for (let py = h; py >= 0; py -= step) pts.push([jit(), py]);
  x.beginPath();
  x.moveTo(pts[0][0], pts[0][1]);
  for (const p of pts) x.lineTo(p[0], p[1]);
  x.closePath();
}

const TONES = {
  cream: [222, 211, 186],
  warm: [214, 200, 170],
  bone: [228, 220, 202],
  kraft: [196, 176, 140],
  charcoal: [44, 40, 36],   // 黑色档案纸
  photo: [232, 226, 212],
};

// 一张纸的纹理（不含阴影、不含光照）
function sheetTexture(w, h, seed = 1, tone = 'cream', o = {}) {
  const W = Math.round(w), H = Math.round(h);
  const key = `${W}x${H}:${seed}:${tone}:${o.crease ? 1 : 0}:${o.rough ?? 3}`;
  if (cache.has(key)) return cache.get(key);
  const pad = 8;
  const c = createCanvas(W + pad * 2, H + pad * 2);
  const x = c.getContext('2d');
  const base = TONES[tone] || tone;
  const dark = tone === 'charcoal';
  x.save();
  x.translate(pad, pad);
  edgePath(x, W, H, seed, o.rough ?? 3);
  x.clip();
  x.fillStyle = `rgb(${base.join(',')})`;
  x.fillRect(-pad, -pad, W + pad * 2, H + pad * 2);
  const L = dark ? [70, 64, 56] : [255, 250, 238];
  const D = dark ? [18, 15, 13] : [150, 120, 80];
  mottle(x, W, H, 5, seed + 1, dark ? 0.35 : 0.22, D);
  mottle(x, W, H, 14, seed + 2, dark ? 0.2 : 0.12, D);
  mottle(x, W, H, 9, seed + 3, dark ? 0.12 : 0.2, L);
  mottle(x, W, H, 60, seed + 4, 0.06, D);
  // 纤维
  const r = rng(seed + 5);
  const n = Math.round((W * H) / 220);
  x.lineCap = 'round';
  for (let i = 0; i < n; i++) {
    const px = r() * W, py = r() * H, a = r() * Math.PI, len = 2 + r() * 9;
    const lightF = r() < 0.5;
    x.strokeStyle = lightF ? `rgba(${L.join(',')},${0.05 + r() * 0.08})` : `rgba(${D.join(',')},${0.03 + r() * 0.06})`;
    x.lineWidth = 0.4 + r() * 0.7;
    x.beginPath();
    x.moveTo(px, py);
    x.lineTo(px + Math.cos(a) * len, py + Math.sin(a) * len);
    x.stroke();
  }
  // 细小杂点
  for (let i = 0; i < n / 4; i++) {
    x.fillStyle = `rgba(${D.join(',')},${0.06 + r() * 0.18})`;
    const s = 0.4 + r() * 1.1;
    x.fillRect(r() * W, r() * H, s, s);
  }
  // 边缘老化：越靠边越黄 / 越暗
  const g = x.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, `rgba(${D.join(',')},0.12)`);
  g.addColorStop(0.08, `rgba(${D.join(',')},0)`);
  g.addColorStop(0.92, `rgba(${D.join(',')},0)`);
  g.addColorStop(1, `rgba(${D.join(',')},0.16)`);
  x.fillStyle = g;
  x.fillRect(0, 0, W, H);
  const g2 = x.createLinearGradient(0, 0, W, 0);
  g2.addColorStop(0, `rgba(${D.join(',')},0.12)`);
  g2.addColorStop(0.06, `rgba(${D.join(',')},0)`);
  g2.addColorStop(0.94, `rgba(${D.join(',')},0)`);
  g2.addColorStop(1, `rgba(${D.join(',')},0.12)`);
  x.fillStyle = g2;
  x.fillRect(0, 0, W, H);
  // 折痕
  if (o.crease) {
    const cx = W * (0.35 + r() * 0.3);
    x.strokeStyle = `rgba(${D.join(',')},0.14)`;
    x.lineWidth = 1.2;
    x.beginPath(); x.moveTo(cx, 0); x.lineTo(cx + (r() - 0.5) * 12, H); x.stroke();
    x.strokeStyle = `rgba(${L.join(',')},0.22)`;
    x.beginPath(); x.moveTo(cx + 1.6, 0); x.lineTo(cx + 1.6 + (r() - 0.5) * 12, H); x.stroke();
  }
  x.restore();
  const out = { canvas: c, pad };
  cache.set(key, out);
  return out;
}

// 画一张有厚度、有投影、受光不均的纸（以中心为原点）
//   light: 光从哪个方向来（弧度，0 = 右，-PI/2 = 上），lift: 离桌面的高度（0..1）
function sheet(ctx, w, h, o = {}) {
  const { seed = 1, tone = 'cream', light = -2.2, lift = 0.15, shade = 0.5, alpha = 1, crease = false, rough } = o;
  const tex = sheetTexture(w, h, seed, tone, { crease, rough });
  ctx.save();
  ctx.globalAlpha *= alpha;
  // 投影：贴地的一层硬影 + 抬起时的一层软影，方向与光相反
  const sx = -Math.cos(light), sy = -Math.sin(light);
  ctx.save();
  ctx.fillStyle = 'rgba(0,0,0,0.55)';
  ctx.shadowColor = 'rgba(0,0,0,0.55)';
  ctx.shadowBlur = 3 + lift * 6;
  ctx.shadowOffsetX = sx * (1.5 + lift * 4);
  ctx.shadowOffsetY = sy * (1.5 + lift * 4);
  ctx.fillRect(-w / 2 + 2, -h / 2 + 2, w - 4, h - 4);
  ctx.shadowColor = `rgba(0,0,0,${0.35 + lift * 0.25})`;
  ctx.shadowBlur = 14 + lift * 40;
  ctx.shadowOffsetX = sx * (6 + lift * 26);
  ctx.shadowOffsetY = sy * (6 + lift * 26);
  ctx.fillRect(-w / 2 + 4, -h / 2 + 4, w - 8, h - 8);
  ctx.restore();
  ctx.drawImage(tex.canvas, -w / 2 - tex.pad, -h / 2 - tex.pad);
  // 纸的厚度：受光一侧的边缘有一道很细的亮边，背光一侧发暗
  ctx.lineWidth = 1;
  ctx.strokeStyle = 'rgba(255,248,232,0.35)';
  ctx.beginPath();
  ctx.moveTo(-w / 2 + 1, h / 2 - 1); ctx.lineTo(-w / 2 + 1, -h / 2 + 1); ctx.lineTo(w / 2 - 1, -h / 2 + 1);
  ctx.stroke();
  ctx.strokeStyle = 'rgba(30,22,16,0.35)';
  ctx.beginPath();
  ctx.moveTo(w / 2 - 0.5, -h / 2 + 1); ctx.lineTo(w / 2 - 0.5, h / 2 - 0.5); ctx.lineTo(-w / 2 + 1, h / 2 - 0.5);
  ctx.stroke();
  // 受光不均：朝光的一侧亮，另一侧沉下去
  if (shade > 0) {
    const R = Math.hypot(w, h) / 2;
    const lx = Math.cos(light) * R, ly = Math.sin(light) * R;
    const g = ctx.createLinearGradient(lx, ly, -lx, -ly);
    g.addColorStop(0, 'rgba(255,236,200,0.10)');
    g.addColorStop(0.5, 'rgba(0,0,0,0)');
    g.addColorStop(1, `rgba(20,14,10,${0.32 * shade})`);
    ctx.fillStyle = g;
    ctx.fillRect(-w / 2, -h / 2, w, h);
  }
  ctx.restore();
}

// 银盐颗粒（给照片 / 剪影肖像用）：粗细不一的成团颗粒
let silver = null;
function silverTile() {
  if (silver) return silver;
  const S = 512;
  const c = createCanvas(S, S);
  const x = c.getContext('2d');
  const r = rng(4242);
  for (let i = 0; i < 26000; i++) {
    const v = r();
    x.fillStyle = v < 0.5 ? `rgba(0,0,0,${0.08 + r() * 0.22})` : `rgba(255,255,255,${0.05 + r() * 0.16})`;
    const s = 0.5 + r() * r() * 2.6;
    x.beginPath();
    x.arc(r() * S, r() * S, s, 0, Math.PI * 2);
    x.fill();
  }
  silver = c;
  return c;
}
function silverGrain(ctx, x0, y0, w, h, strength = 0.6, phase = 0) {
  const tile = silverTile();
  ctx.save();
  ctx.beginPath();
  ctx.rect(x0, y0, w, h);
  ctx.clip();
  ctx.globalAlpha *= strength;
  ctx.globalCompositeOperation = 'overlay';
  const ox = (phase * 137) % 512, oy = (phase * 251) % 512;
  for (let y = y0 - oy; y < y0 + h; y += 512) for (let x = x0 - ox; x < x0 + w; x += 512) ctx.drawImage(tile, x, y);
  ctx.restore();
}

// 墨色不均的文字：离屏绘制后挖掉细小的点，像打印 / 盖印时没吃透墨
const inkCache = new Map();
function inkText(ctx, text, x, y, o = {}) {
  const { font, color = '#2a2420', align = 'left', seed = 1, wear = 0.5, spacing = 0, alpha = 1 } = o;
  const key = `${text}|${font}|${color}|${seed}|${wear}|${spacing}`;
  let ent = inkCache.get(key);
  if (!ent) {
    const m = createCanvas(4, 4).getContext('2d');
    m.font = font;
    m.letterSpacing = `${spacing}px`;
    const tm = m.measureText(text);
    const size = parseFloat(font);
    const w = Math.ceil(tm.width + size * 0.4), h = Math.ceil(size * 1.6);
    const c = createCanvas(w, h);
    const cx = c.getContext('2d');
    cx.font = font;
    cx.letterSpacing = `${spacing}px`;
    cx.fillStyle = color;
    cx.textBaseline = 'alphabetic';
    cx.fillText(text, size * 0.2, size * 1.15);
    const r = rng(seed);
    cx.globalCompositeOperation = 'destination-out';
    const n = Math.round(w * h * 0.004 * wear);
    for (let i = 0; i < n; i++) {
      cx.fillStyle = `rgba(0,0,0,${0.15 + r() * 0.5})`;
      cx.beginPath();
      cx.arc(r() * w, r() * h, 0.3 + r() * size * 0.025, 0, Math.PI * 2);
      cx.fill();
    }
    ent = { c, w: tm.width, ox: size * 0.2, oy: size * 1.15 };
    inkCache.set(key, ent);
  }
  const left = align === 'center' ? x - ent.w / 2 : align === 'right' ? x - ent.w : x;
  ctx.save();
  ctx.globalAlpha *= alpha;
  ctx.drawImage(ent.c, left - ent.ox, y - ent.oy);
  ctx.restore();
  return ent.w;
}

// 先把一组绘制画到离屏画布，再整体加一次滤镜（模糊 / 调暗）。
// 直接在主画布上给许多小绘制各自加滤镜非常慢。
let layer = null;
function filtered(ctx, filter, fn) {
  const W = ctx.canvas.width, H = ctx.canvas.height;
  if (!layer || layer.width !== W) layer = createCanvas(W, H);
  const lx = layer.getContext('2d');
  lx.setTransform(1, 0, 0, 1, 0, 0);
  lx.clearRect(0, 0, W, H);
  lx.setTransform(ctx.getTransform());
  lx.globalAlpha = ctx.globalAlpha;
  fn(lx);
  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.globalAlpha = 1;
  ctx.filter = filter;
  ctx.drawImage(layer, 0, 0);
  ctx.restore();
}

module.exports = { filtered, sheet, sheetTexture, silverGrain, inkText, mottle, TONES, lerp, clamp };
