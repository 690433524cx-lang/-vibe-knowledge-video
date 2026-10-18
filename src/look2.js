// 第二版画面管线（timeline.js 里 LOOK: 'v2' 时启用；《舍不得》仍走第一版，输出不变）。
//
//   暗部：不是纯黑。炭黑 / 暖黑 / 烟灰 / 橄榄灰的层次，暗处也有极淡的纹理。
//   光：每个场景可给出多个局部光源（门缝、台灯、侧光），其余区域压暗但不死黑。
//   色温：场景可给出 grade(t) = { warm: -1..1 }，整体统一、场景间略有冷暖差。
//   摄影：极轻的片门晃动、焦点呼吸、曝光起伏、边缘光学柔化、粗细两层胶片颗粒。
const { createCanvas } = require('@napi-rs/canvas');
const { W, H, DESIGN_T, DESIGN_END, toDesign, TL } = require('./config');
const { prog, smooth, noise1, rng, lerp } = require('./lib/util');
const { mottle } = require('./lib/material');
const { FONT, C } = require('./lib/style');

// ---------- 一次性生成的素材 ----------

function makeRoom() {
  const w = Math.round(W * 1.12), h = Math.round(H * 1.12);
  const c = createCanvas(w, h);
  const x = c.getContext('2d');
  const g = x.createLinearGradient(0, 0, 0, h);
  g.addColorStop(0, '#1a1613');
  g.addColorStop(0.55, '#1d1915');
  g.addColorStop(1, '#141210');
  x.fillStyle = g;
  x.fillRect(0, 0, w, h);
  mottle(x, w, h, 5, 11, 0.35, [8, 7, 6]);           // 炭黑
  mottle(x, w, h, 7, 12, 0.18, [44, 42, 32]);        // 橄榄灰
  mottle(x, w, h, 11, 13, 0.16, [52, 38, 28]);       // 深褐
  mottle(x, w, h, 40, 14, 0.08, [70, 62, 54]);       // 烟灰
  // 极淡的墙面 / 桌面肌理
  const r = rng(15);
  for (let i = 0; i < 5200; i++) {
    x.fillStyle = r() < 0.5 ? `rgba(0,0,0,${0.08 + r() * 0.12})` : `rgba(120,104,86,${0.03 + r() * 0.05})`;
    const s = 0.6 + r() * 1.6;
    x.fillRect(r() * w, r() * h, s, s);
  }
  for (let i = 0; i < 260; i++) {
    const y0 = r() * h, x0 = r() * w - 200, len = 200 + r() * 700;
    x.strokeStyle = r() < 0.6 ? `rgba(0,0,0,${0.05 + r() * 0.06})` : `rgba(96,80,62,${0.025 + r() * 0.03})`;
    x.lineWidth = 0.8 + r() * 1.8;
    x.beginPath();
    x.moveTo(x0, y0);
    x.bezierCurveTo(x0 + len * 0.3, y0 + (r() - 0.5) * 6, x0 + len * 0.7, y0 + (r() - 0.5) * 6, x0 + len, y0 + (r() - 0.5) * 5);
    x.stroke();
  }
  return c;
}

function makeFineGrain(count = 4, seed = 701) {
  const out = [];
  for (let k = 0; k < count; k++) {
    const r = rng(seed + k * 17);
    const c = createCanvas(W, H);
    const x = c.getContext('2d');
    const img = x.createImageData(W, H);
    const d = img.data;
    for (let i = 0; i < W * H; i++) {
      const v = 128 + (r() + r() - 1) * 70;
      d[i * 4] = d[i * 4 + 1] = d[i * 4 + 2] = v;
      d[i * 4 + 3] = 255;
    }
    x.putImageData(img, 0, 0);
    out.push(c);
  }
  return out;
}
function makeClumpGrain(count = 4, seed = 801) {
  const out = [];
  const gw = W / 3, gh = H / 3;
  for (let k = 0; k < count; k++) {
    const r = rng(seed + k * 23);
    const c = createCanvas(gw, gh);
    const x = c.getContext('2d');
    const img = x.createImageData(gw, gh);
    const d = img.data;
    for (let i = 0; i < gw * gh; i++) {
      const v = 128 + (r() + r() + r() - 1.5) * 60;
      d[i * 4] = d[i * 4 + 1] = d[i * 4 + 2] = v;
      d[i * 4 + 3] = 255;
    }
    x.putImageData(img, 0, 0);
    out.push(c);
  }
  return out;
}

const room = makeRoom();
const fine = makeFineGrain();
const clump = makeClumpGrain();
const dark = createCanvas(W, H);
const darkCtx = dark.getContext('2d');
const soft = createCanvas(W / 4, H / 4);
const softCtx = soft.getContext('2d');
const edge = createCanvas(W, H);
const edgeCtx = edge.getContext('2d');

// ---------- 光 ----------

function collectLights(SCENES, d) {
  const lights = [];
  let amb = 0, ambW = 0, warm = 0, warmW = 0;
  for (const s of SCENES) {
    if (d < s.start || d > s.end) continue;
    if (s.light) {
      const L = s.light(d);
      const arr = Array.isArray(L) ? L : L ? [L] : [];
      for (const l of arr) if (l && (l.w ?? 1) > 0.001) lights.push(l);
    }
    if (s.grade) {
      const g = s.grade(d);
      const wgt = g.w ?? 1;
      if (g.ambient != null) { amb += g.ambient * wgt; ambW += wgt; }
      if (g.warm != null) { warm += g.warm * wgt; warmW += wgt; }
    }
  }
  return {
    lights,
    ambient: (ambW ? amb / ambW : (TL.AMBIENT ?? 0.14)) * (TL.AMBIENT_LIFT ?? 1),
    warm: warmW ? warm / warmW : 0.2,
  };
}

function applyLights(ctx, { lights, ambient }, d) {
  const x = darkCtx;
  x.globalCompositeOperation = 'source-over';
  x.clearRect(0, 0, W, H);
  x.fillStyle = 'rgb(10,8,7)';
  x.fillRect(0, 0, W, H);
  x.globalCompositeOperation = 'destination-out';
  const breathe = 1 + noise1(d * 0.5, 31) * 0.025;
  for (const l of lights) {
    // SUBJECT_LIFT：主体整体提亮（光斑更亮、衰减更缓），背景仍然是暗的
    const lift = TL.SUBJECT_LIFT ?? 1;
    const i = Math.min(1, (l.i ?? 1) * lift * (l.w ?? 1) * breathe);
    x.save();
    x.translate(l.x, l.y);
    x.rotate(l.rot || 0);
    x.scale(1, l.ry / l.rx);
    const g = x.createRadialGradient(0, 0, 0, 0, 0, l.rx);
    const core = l.core ?? 0.25; // 光斑核心有多「硬」
    g.addColorStop(0, `rgba(0,0,0,${i})`);
    g.addColorStop(core, `rgba(0,0,0,${i * 0.92})`);
    g.addColorStop(0.62, `rgba(0,0,0,${i * (0.42 + 0.25 * (lift - 1))})`);
    g.addColorStop(1, 'rgba(0,0,0,0)');
    x.fillStyle = g;
    x.fillRect(-l.rx, -l.rx, l.rx * 2, l.rx * 2);
    x.restore();
  }
  ctx.save();
  ctx.globalAlpha = 1 - ambient;
  ctx.drawImage(dark, 0, 0);
  // 暖光：只加在光斑里
  ctx.globalCompositeOperation = 'soft-light';
  for (const l of lights) {
    const i = Math.min(1.2, (l.i ?? 1) * (l.w ?? 1));
    ctx.save();
    ctx.globalAlpha = 1;
    ctx.translate(l.x, l.y);
    ctx.rotate(l.rot || 0);
    ctx.scale(1, l.ry / l.rx);
    const g = ctx.createRadialGradient(0, 0, 0, 0, 0, l.rx * 0.75);
    const col = l.color || [255, 196, 128];
    g.addColorStop(0, `rgba(${col.join(',')},${0.42 * i})`);
    g.addColorStop(1, `rgba(${col.join(',')},0)`);
    ctx.fillStyle = g;
    ctx.fillRect(-l.rx, -l.rx, l.rx * 2, l.rx * 2);
    ctx.restore();
  }
  ctx.restore();
}

// ---------- 片子的其余部分 ----------

function preClimaxDark(d) {
  const D = DESIGN_T;
  // PRE_T_DARK：[开始, 完全收暗]（相对 T）。默认 T-0.6 → T-0.15；选择困难提前到 T-0.75 → T-0.45，留出 0.45 秒暗场
  const [a, b] = TL.PRE_T_DARK || [-0.6, -0.15];
  // 设了 PRE_T_DARK 的片子：T 那一帧收暗层立刻撤掉，让高潮的第一帧就是最亮的
  if (TL.PRE_T_DARK && d >= D) return 0;
  return smooth(prog(d, D + a, D + b)) * (1 - smooth(prog(d, D, D + 0.35)));
}
function climaxShake(d) {
  const dt = d - DESIGN_T;
  if (dt < 0 || dt > 0.5) return [0, 0];
  const a = 6 * Math.exp(-dt / 0.08);
  return [noise1(dt * 55, 1) * a, noise1(dt * 55, 2) * a];
}

function drawHeader(ctx, d, SCENES) {
  const D = DESIGN_T;
  // HIDE_HEADER: [[开始, 结束], …] 这些段落里页眉让位给留白
  let hide = 0;
  for (const [h0, h1] of TL.HIDE_HEADER || []) hide = Math.max(hide, smooth(prog(d, h0 - 0.5, h0)) * (1 - smooth(prog(d, h1, h1 + 0.5))));
  const a = 0.26 * smooth(prog(d, 1.5, 3)) * (1 - smooth(prog(d, D - 1.0, D - 0.6)) + smooth(prog(d, D + 3, D + 4))) * (1 - hide);
  if (a <= 0.01) return;
  const page = 1 + SCENES.filter((s) => d >= s.start).length;
  ctx.save();
  ctx.globalAlpha = Math.min(a, 0.26);
  ctx.font = FONT.type(15);
  ctx.letterSpacing = '2px';
  ctx.fillStyle = C.lightText;
  ctx.fillText(TL.HEADER, 132, 84);
  ctx.textAlign = 'right';
  ctx.fillText('P. ' + String(page).padStart(2, '0'), W - 132, 84);
  ctx.restore();
}

function renderFrameV2(ctx, tReal, frameIndex, SCENES, drawSubtitles) {
  const d = toDesign(tReal);
  const [sx, sy] = climaxShake(d);
  const env = { dark: preClimaxDark(d), frameIndex };

  // 片门晃动 + 焦点呼吸（幅度极小，只给影像一点「活」）
  const wx = noise1(d * 9, 41) * 0.45 + sx, wy = noise1(d * 9, 42) * 0.35 + sy;
  const rot = noise1(d * 3, 43) * 0.00025;
  const breath = 1 + noise1(d * 0.6, 44) * 0.0012;

  ctx.save();
  ctx.fillStyle = '#100d0b';
  ctx.fillRect(0, 0, W, H);
  ctx.translate(W / 2 + wx, H / 2 + wy);
  ctx.rotate(rot);
  ctx.scale(breath, breath);
  ctx.translate(-W / 2, -H / 2);
  const px = -(room.width - W) / 2 + noise1(d * 0.04, 5) * 30;
  const py = -(room.height - H) / 2 + noise1(d * 0.04, 6) * 16;
  ctx.drawImage(room, px, py);
  for (const s of SCENES) if (d >= s.start && d <= s.end) s.draw(ctx, d, env);
  ctx.restore();

  const L = collectLights(SCENES, d);
  applyLights(ctx, L, d);

  ctx.save();
  ctx.translate(W / 2 + wx, H / 2 + wy);
  ctx.rotate(rot);
  ctx.scale(breath, breath);
  ctx.translate(-W / 2, -H / 2);
  for (const s of SCENES) if (s.drawOver && d >= s.start && d <= s.end) s.drawOver(ctx, d, env);
  ctx.restore();

  // 色温：整体统一，场景间极轻的冷暖差
  ctx.save();
  ctx.globalCompositeOperation = 'soft-light';
  const warm = L.warm;
  ctx.fillStyle = warm >= 0 ? `rgba(255,186,120,${0.10 * warm})` : `rgba(120,138,118,${-0.12 * warm})`;
  ctx.fillRect(0, 0, W, H);
  ctx.restore();

  if (env.dark > 0) {
    ctx.fillStyle = `rgba(6,5,4,${env.dark * (TL.PRE_T_DARK_AMOUNT ?? 0.55)})`;
    ctx.fillRect(0, 0, W, H);
  }
  const cf = TL.CLOSE_FADE ?? 1.2;
  const close = smooth(prog(d, DESIGN_END - cf, DESIGN_END - 0.05));
  if (close > 0) {
    ctx.fillStyle = `rgba(6,5,4,${close})`;
    ctx.fillRect(0, 0, W, H);
  }

  // 暗部不死黑：最暗也停在暖炭黑
  ctx.save();
  ctx.globalCompositeOperation = 'lighten';
  ctx.fillStyle = 'rgb(13,11,9)';
  ctx.fillRect(0, 0, W, H);
  ctx.restore();

  // 边缘光学柔化：画面四周比中心软一点
  softCtx.drawImage(ctx.canvas, 0, 0, W / 4, H / 4);
  edgeCtx.globalCompositeOperation = 'source-over';
  edgeCtx.clearRect(0, 0, W, H);
  edgeCtx.imageSmoothingQuality = 'high';
  edgeCtx.drawImage(soft, 0, 0, W, H);
  edgeCtx.globalCompositeOperation = 'destination-in';
  const eg = edgeCtx.createRadialGradient(W / 2, H / 2, H * 0.45, W / 2, H / 2, H * 1.0);
  eg.addColorStop(0, 'rgba(0,0,0,0)');
  eg.addColorStop(1, 'rgba(0,0,0,0.75)');
  edgeCtx.fillStyle = eg;
  edgeCtx.fillRect(0, 0, W, H);
  ctx.drawImage(edge, 0, 0);

  // 暗角
  ctx.save();
  const vg = ctx.createRadialGradient(W / 2, H * 0.48, H * 0.32, W / 2, H / 2, H * 1.02);
  vg.addColorStop(0, 'rgba(0,0,0,0)');
  vg.addColorStop(1, `rgba(4,3,2,${TL.VIGNETTE ?? 0.5})`);
  ctx.fillStyle = vg;
  ctx.fillRect(0, 0, W, H);
  ctx.restore();

  drawHeader(ctx, d, SCENES);
  drawSubtitles(ctx, d);

  // 胶片颗粒：细颗粒 + 成团颗粒，暗部也有细节
  ctx.save();
  ctx.globalCompositeOperation = 'overlay';
  ctx.globalAlpha = 0.085;
  ctx.drawImage(fine[frameIndex % fine.length], 0, 0);
  ctx.globalAlpha = 0.06;
  ctx.drawImage(clump[Math.floor(frameIndex / 2) % clump.length], 0, 0, W, H);
  ctx.globalCompositeOperation = 'screen';
  ctx.globalAlpha = 0.018;
  ctx.drawImage(fine[(frameIndex + 2) % fine.length], 0, 0);
  ctx.restore();
  // 曝光起伏：低频的「胶片呼吸」+ 极轻的逐帧闪烁
  const fl = noise1(d * 0.9, 77) * 0.012 + noise1(d * 11, 78) * 0.004;
  ctx.fillStyle = fl > 0 ? `rgba(255,240,220,${fl * 0.7})` : `rgba(0,0,0,${-fl})`;
  ctx.fillRect(0, 0, W, H);
}

module.exports = { renderFrameV2 };
