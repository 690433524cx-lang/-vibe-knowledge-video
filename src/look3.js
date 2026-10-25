// 第三版画面管线（timeline.js 里 LOOK: 'v3' 时启用）：未来感的黑色信息空间。
//
//   底：#050505 附近的深黑，中心极轻地抬一点，暗部不糊成一片。
//   没有纸张、台灯、胶片晃动；只有极细的颗粒防止渐变断层。
//   场景自己负责 3D 相机和所有节点 / 线 / 信号；这里只做底色、收边、字幕。
const { createCanvas } = require('@napi-rs/canvas');
const { W, H, DESIGN_END, toDesign, TL } = require('./config');
const { prog, smooth, rng } = require('./lib/util');

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

function makeBase() {
  const c = createCanvas(W, H);
  const x = c.getContext('2d');
  x.fillStyle = '#050505';
  x.fillRect(0, 0, W, H);
  const g = x.createRadialGradient(W / 2, H * 0.46, 0, W / 2, H * 0.46, W * 0.62);
  g.addColorStop(0, 'rgba(22,19,15,0.9)');
  g.addColorStop(0.6, 'rgba(12,11,9,0.5)');
  g.addColorStop(1, 'rgba(0,0,0,0)');
  x.fillStyle = g;
  x.fillRect(0, 0, W, H);
  return c;
}

const grain = makeGrain();
const base = makeBase();
const vignette = (() => {
  const c = createCanvas(W, H);
  const x = c.getContext('2d');
  const g = x.createRadialGradient(W / 2, H / 2, H * 0.42, W / 2, H / 2, H * 1.05);
  g.addColorStop(0, 'rgba(0,0,0,0)');
  g.addColorStop(1, `rgba(0,0,0,${TL.VIGNETTE ?? 0.55})`);
  x.fillStyle = g;
  x.fillRect(0, 0, W, H);
  return c;
})();

function renderFrameV3(ctx, tReal, frameIndex, SCENES, drawSubtitles) {
  const d = toDesign(tReal);
  const env = { frameIndex };
  ctx.save();
  ctx.drawImage(base, 0, 0);
  for (const s of SCENES) if (d >= s.start && d <= s.end) s.draw(ctx, d, env);
  for (const s of SCENES) if (s.drawOver && d >= s.start && d <= s.end) s.drawOver(ctx, d, env);
  ctx.restore();

  ctx.drawImage(vignette, 0, 0);
  const cf = TL.CLOSE_FADE ?? 1.2;
  const close = smooth(prog(d, DESIGN_END - cf, DESIGN_END - 0.05));
  if (close > 0) {
    ctx.fillStyle = `rgba(5,5,5,${close})`;
    ctx.fillRect(0, 0, W, H);
  }
  drawSubtitles(ctx, d);

  ctx.save();
  ctx.globalCompositeOperation = 'overlay';
  ctx.globalAlpha = 0.05;
  ctx.drawImage(grain[frameIndex % grain.length], 0, 0);
  ctx.restore();
}

module.exports = { renderFrameV3 };
