// 合成一帧：深色桌面 → 场景 → 局部暖光（其余压暗）→ 字幕 → 暗角 → 胶片颗粒
//
// 视觉基调：深夜昏暗档案室。背景是黑棕色桌面，只有主体被一束很弱的暖光照亮。
// 每个场景通过 light(t) 给出屏幕空间里的光斑（位置、大小、权重），转场时按权重混合。
const { createCanvas } = require('@napi-rs/canvas');
const { W, H, FPS, DESIGN_T, DESIGN_END, toDesign } = require('./config');
const { makeDesk, makeGrain, makeVignette } = require('./lib/paper');
const { drawSubtitles } = require('./subtitles');
const { prog, smooth, noise1, lerp } = require('./lib/util');
const SCENES = require(require('path').join(require('./config').VIDEO_DIR, 'scenes'));
const { FONT, C } = require('./lib/style');

const desk = makeDesk();
const grain = makeGrain();
const vignette = makeVignette();

// 档案页眉：贯穿全片的「同一本档案」感，在暗处只隐约可见。高潮窗口内隐去。
function drawFurniture(ctx, d) {
  const D = DESIGN_T;
  const a = 0.32 * Math.min(1, smooth(prog(d, 1.0, 2.5)) * (1 - smooth(prog(d, D - 1.0, D - 0.6))) + smooth(prog(d, D + 2.5, D + 3.5)));
  if (a <= 0.01) return;
  const page = 1 + SCENES.filter((s) => d >= s.start).length;
  ctx.save();
  ctx.globalAlpha = a;
  ctx.font = FONT.type(18);
  ctx.fillStyle = C.lightText;
  ctx.fillText(require('./config').TL.HEADER, 120, 96);
  ctx.textAlign = 'right';
  ctx.fillText('P. ' + String(page).padStart(2, '0'), W - 120, 96);
  ctx.strokeStyle = 'rgba(200,185,160,0.35)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(120, 112); ctx.lineTo(W - 120, 112);
  ctx.stroke();
  ctx.restore();
}

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

// 混合当前所有场景的光斑
function currentLight(d) {
  let sw = 0;
  const L = { x: 0, y: 0, rx: 0, ry: 0, i: 0 };
  for (const s of SCENES) {
    if (!s.light || d < s.start || d > s.end) continue;
    const l = s.light(d);
    if (!l || l.w <= 0) continue;
    sw += l.w;
    L.x += l.x * l.w; L.y += l.y * l.w; L.rx += l.rx * l.w; L.ry += l.ry * l.w; L.i += (l.i ?? 1) * l.w;
  }
  if (sw <= 0) return { x: W / 2, y: H / 2, rx: 600, ry: 420, i: 1 };
  for (const k of Object.keys(L)) L[k] /= sw;
  // 灯光极轻微地呼吸
  L.i *= 1 + noise1(d * 0.6, 31) * 0.03;
  return L;
}

// 光斑以外压暗；光斑内加一层暖色
function applyLight(ctx, L) {
  ctx.save();
  ctx.translate(L.x, L.y);
  ctx.scale(1, L.ry / L.rx);
  const R = L.rx;
  const dim = Math.max(0, 1 - L.i);
  const outer = Math.min(0.97, 0.9 + dim * 0.1);
  const g = ctx.createRadialGradient(0, 0, R * 0.12, 0, 0, R);
  g.addColorStop(0, `rgba(6,4,3,${dim * 0.9})`);
  g.addColorStop(0.45, `rgba(6,4,3,${Math.max(0.04, 0.18 + (1 - L.i) * 0.7)})`);
  g.addColorStop(1, `rgba(6,4,3,${outer})`);
  ctx.fillStyle = g;
  ctx.fillRect(-W * 3, -H * 6, W * 6, H * 12);
  // 暖光
  ctx.globalCompositeOperation = 'soft-light';
  const w = ctx.createRadialGradient(0, 0, 0, 0, 0, R * 0.8);
  w.addColorStop(0, `rgba(255,196,120,${0.45 * L.i})`);
  w.addColorStop(1, 'rgba(255,196,120,0)');
  ctx.fillStyle = w;
  ctx.fillRect(-R, -R, R * 2, R * 2);
  ctx.restore();
}

function renderFrame(ctx, tReal, frameIndex) {
  const d = toDesign(tReal);
  const [sx, sy] = climaxShake(d);

  const env = { dark: preClimaxDark(d), frameIndex };
  ctx.save();
  ctx.translate(sx, sy);
  const px = -(desk.width - W) / 2 + noise1(d * 0.05, 5) * 40;
  const py = -(desk.height - H) / 2 + noise1(d * 0.05, 6) * 22;
  ctx.drawImage(desk, px, py);

  for (const s of SCENES) {
    if (d >= s.start && d <= s.end) s.draw(ctx, d, env);
  }
  ctx.restore();

  applyLight(ctx, currentLight(d));
  ctx.save();
  ctx.translate(sx, sy);
  for (const s of SCENES) {
    if (s.drawOver && d >= s.start && d <= s.end) s.drawOver(ctx, d, env);
  }
  ctx.restore();

  // 高潮前收暗
  if (env.dark > 0) {
    ctx.fillStyle = `rgba(4,3,2,${env.dark * 0.5})`;
    ctx.fillRect(0, 0, W, H);
  }

  // 片头从黑暗中亮起
  const OPEN = require('./config').TL.OPEN_FADE ?? 0.9;
  const open = OPEN > 0 ? 1 - smooth(prog(d, 0, OPEN)) : 0;
  if (open > 0) {
    ctx.fillStyle = `rgba(3,2,1,${open * 0.85})`;
    ctx.fillRect(0, 0, W, H);
  }

  drawFurniture(ctx, d);
  drawSubtitles(ctx, d);

  // 片尾：问题停留之后，缓缓沉入黑暗
  const close = smooth(prog(d, DESIGN_END - 0.9, DESIGN_END - 0.05));
  if (close > 0) {
    ctx.fillStyle = `rgba(2,1,1,${close})`;
    ctx.fillRect(0, 0, W, H);
  }

  ctx.drawImage(vignette, 0, 0);
  ctx.save();
  ctx.globalCompositeOperation = 'overlay';
  ctx.globalAlpha = 0.1;
  const gr = grain[Math.floor(frameIndex / 2) % grain.length];
  ctx.drawImage(gr, 0, 0, W, H);
  ctx.globalCompositeOperation = 'screen';
  ctx.globalAlpha = 0.025;
  ctx.drawImage(gr, 0, 0, W, H);
  ctx.restore();
  // 极轻微的曝光闪烁
  const fl = noise1(d * 7, 77) * 0.01;
  ctx.fillStyle = fl > 0 ? `rgba(255,240,220,${fl * 0.6})` : `rgba(0,0,0,${-fl})`;
  ctx.fillRect(0, 0, W, H);
}

function makeCanvas() {
  const c = createCanvas(W, H);
  return [c, c.getContext('2d')];
}

module.exports = { renderFrame, makeCanvas, FPS, lerp };
