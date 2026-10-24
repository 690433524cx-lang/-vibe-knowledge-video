// 第三版画面管线（timeline.js 里 LOOK: 'v3' 时启用）：黑金科学图解。
//
//   底：炭黑，中心极轻的提亮 + 一层几乎看不见的点阵（只给「精密」的质感）。
//   没有台灯、纸张、胶片晃动——主角是图形本身，必须干净、稳定、锐利。
//   只保留：极轻的暗角、极细的颗粒（防止暗部渐变出现色带）、片尾收黑。
const { createCanvas } = require('@napi-rs/canvas');
const { W, H, DESIGN_END, toDesign, TL, splitTime } = require('./config');
const { prog, smooth, rng } = require('./lib/util');

function makeGround() {
  const c = createCanvas(W, H);
  const x = c.getContext('2d');
  x.fillStyle = '#0b0a09';
  x.fillRect(0, 0, W, H);
  const g = x.createRadialGradient(W / 2, H * 0.44, 0, W / 2, H * 0.44, H * 0.95);
  g.addColorStop(0, 'rgba(34,29,23,0.75)');
  g.addColorStop(0.6, 'rgba(20,17,14,0.35)');
  g.addColorStop(1, 'rgba(0,0,0,0)');
  x.fillStyle = g;
  x.fillRect(0, 0, W, H);
  // 点阵：48 px 一格，越靠边越淡
  const step = TL.GRID ?? 48;
  for (let gx = step / 2; gx < W; gx += step) {
    for (let gy = step / 2; gy < H; gy += step) {
      const dx = (gx - W / 2) / (W / 2), dy = (gy - H / 2) / (H / 2);
      const a = (TL.GRID_ALPHA ?? 0.05) * Math.max(0, 1 - 0.55 * (dx * dx + dy * dy));
      x.fillStyle = `rgba(214,196,160,${a.toFixed(4)})`;
      x.fillRect(gx - 1, gy - 1, 2, 2);
    }
  }
  // 暗角
  const v = x.createRadialGradient(W / 2, H / 2, H * 0.4, W / 2, H / 2, H * 1.05);
  v.addColorStop(0, 'rgba(0,0,0,0)');
  v.addColorStop(1, `rgba(0,0,0,${TL.VIGNETTE ?? 0.45})`);
  x.fillStyle = v;
  x.fillRect(0, 0, W, H);
  return c;
}

function makeGrain(count = 3, seed = 901) {
  const out = [];
  for (let k = 0; k < count; k++) {
    const r = rng(seed + k * 31);
    const c = createCanvas(W, H);
    const x = c.getContext('2d');
    const img = x.createImageData(W, H);
    const d = img.data;
    for (let i = 0; i < W * H; i++) {
      const v = 128 + (r() + r() - 1) * 60;
      d[i * 4] = d[i * 4 + 1] = d[i * 4 + 2] = v;
      d[i * 4 + 3] = 255;
    }
    x.putImageData(img, 0, 0);
    out.push(c);
  }
  return out;
}

const ground = makeGround();
const grain = makeGrain();
const layer = createCanvas(W, H);
const layerCtx = layer.getContext('2d');

function renderFrameV3(ctx, tReal, frameIndex, SCENES, drawSubtitles) {
  const raw = toDesign(tReal);
  const { d, ins } = splitTime(raw);
  const env = { frameIndex, raw, ins };
  ctx.save();
  ctx.globalCompositeOperation = 'source-over';
  ctx.globalAlpha = 1;
  ctx.drawImage(ground, 0, 0);
  ctx.restore();

  if (ins == null) {
    for (const s of SCENES) if (!s.insert && d >= s.start && d <= s.end) { ctx.save(); s.draw(ctx, d, env); ctx.restore(); }
  } else {
    // 插段：原片停在 at 那一帧，画到图层上，由插段场景决定它显示多少（淡出 / 从中心展开）
    layerCtx.clearRect(0, 0, W, H);
    for (const s of SCENES) if (!s.insert && d >= s.start && d <= s.end) { layerCtx.save(); s.draw(layerCtx, d, env); layerCtx.restore(); }
    for (const s of SCENES) if (s.insert) { ctx.save(); s.draw(ctx, ins, { ...env, layer }); ctx.restore(); }
  }

  drawSubtitles(ctx, d, raw, ins != null);

  const cf = TL.CLOSE_FADE ?? 1.0;
  const close = smooth(prog(raw, DESIGN_END - cf, DESIGN_END - 0.05));
  if (close > 0) {
    ctx.fillStyle = `rgba(6,5,4,${close})`;
    ctx.fillRect(0, 0, W, H);
  }

  ctx.save();
  ctx.globalCompositeOperation = 'overlay';
  ctx.globalAlpha = TL.GRAIN ?? 0.035;
  ctx.drawImage(grain[frameIndex % grain.length], 0, 0);
  ctx.restore();
}

module.exports = { renderFrameV3 };
