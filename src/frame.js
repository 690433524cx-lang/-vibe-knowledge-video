// 合成一帧：纸张 → 场景 → 光影 → 字幕 → 暗角 → 胶片颗粒
const { createCanvas } = require('@napi-rs/canvas');
const { W, H, FPS, DESIGN_T, toDesign } = require('./config');
const { makePaper, makeGrain, makeVignette } = require('./lib/paper');
const { drawSubtitles } = require('./subtitles');
const { prog, smooth, noise1, clamp } = require('./lib/util');
const SCENES = require('./scenes');
const { FONT, C } = require('./lib/style');

// 档案页眉：贯穿全片的「同一本档案」感。高潮窗口内隐去。
function drawFurniture(ctx, d) {
  const D = DESIGN_T;
  const a = 0.55 * smooth(prog(d, 0.3, 1.5)) * (1 - smooth(prog(d, D - 1.0, D - 0.6))) + 0.55 * smooth(prog(d, D + 2.5, D + 3.5));
  if (a <= 0.01) return;
  const page = 1 + SCENES.filter((s) => d >= s.start).length;
  ctx.save();
  ctx.globalAlpha = Math.min(a, 0.55);
  ctx.font = FONT.type(18);
  ctx.fillStyle = C.brown;
  ctx.fillText('HUMAN BEHAVIOR STUDIES  ·  FILE 07', 120, 96);
  ctx.textAlign = 'right';
  ctx.fillText('P. ' + String(page).padStart(2, '0'), W - 120, 96);
  ctx.strokeStyle = 'rgba(90,70,54,0.35)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(120, 112); ctx.lineTo(W - 120, 112);
  ctx.moveTo(120, 116); ctx.lineTo(W - 120, 116);
  ctx.stroke();
  ctx.restore();
}

const paper = makePaper();
const grain = makeGrain();
const vignette = makeVignette();

// 高潮前的收暗程度（0..1），场景也会读取它
function preClimaxDark(d) {
  const D = DESIGN_T;
  return smooth(prog(d, D - 0.6, D - 0.15)) * (1 - smooth(prog(d, D, D + 0.35)));
}

// 高潮瞬间的纸面震动（几帧内衰减）
function climaxShake(d) {
  const dt = d - DESIGN_T;
  if (dt < 0 || dt > 0.45) return [0, 0];
  const a = 7 * Math.exp(-dt / 0.09);
  return [noise1(dt * 60, 1) * a, noise1(dt * 60, 2) * a];
}

function renderFrame(ctx, tReal, frameIndex) {
  const d = toDesign(tReal);
  const [sx, sy] = climaxShake(d);

  ctx.save();
  ctx.translate(sx, sy);
  // 纸张：极慢的漂移，营造「纸在呼吸」
  const px = -(paper.width - W) / 2 + noise1(d * 0.05, 5) * 40;
  const py = -(paper.height - H) / 2 + noise1(d * 0.05, 6) * 22;
  ctx.drawImage(paper, px, py);

  drawFurniture(ctx, d);
  const env = { dark: preClimaxDark(d), frameIndex };
  for (const s of SCENES) {
    if (d >= s.start && d <= s.end) s.draw(ctx, d, env);
  }

  // 柔和光斑缓慢移动
  ctx.save();
  ctx.globalCompositeOperation = 'soft-light';
  const lx = W * (0.35 + 0.3 * noise1(d * 0.04, 9)), ly = H * (0.3 + 0.2 * noise1(d * 0.04, 10));
  const lg = ctx.createRadialGradient(lx, ly, 0, lx, ly, H * 0.9);
  lg.addColorStop(0, 'rgba(255,248,230,0.35)');
  lg.addColorStop(1, 'rgba(255,248,230,0)');
  ctx.fillStyle = lg;
  ctx.fillRect(0, 0, W, H);
  ctx.restore();
  ctx.restore();

  // 高潮前收暗
  if (env.dark > 0) {
    ctx.fillStyle = `rgba(22,16,10,${env.dark * 0.42})`;
    ctx.fillRect(0, 0, W, H);
  }

  drawSubtitles(ctx, d);

  ctx.drawImage(vignette, 0, 0);
  ctx.save();
  ctx.globalCompositeOperation = 'overlay';
  ctx.globalAlpha = 0.09;
  ctx.drawImage(grain[Math.floor(frameIndex / 2) % grain.length], 0, 0, W, H);
  ctx.restore();
  // 极轻微的曝光闪烁
  const fl = noise1(d * 7, 77) * 0.012;
  ctx.fillStyle = fl > 0 ? `rgba(255,250,240,${fl})` : `rgba(0,0,0,${-fl})`;
  ctx.fillRect(0, 0, W, H);
}

function makeCanvas() {
  const c = createCanvas(W, H);
  return [c, c.getContext('2d')];
}

module.exports = { renderFrame, makeCanvas, FPS };
