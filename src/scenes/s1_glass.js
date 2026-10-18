// 第一幕 · 钩子：裂了缝的玻璃杯。水一直滴进去，又一直从裂缝流走。
const { C, FONT } = require('../lib/style');
const { pencil, sketchEllipse, ellipsePts, typeText, camera } = require('../lib/draw');
const { prog, smooth, easeIn, easeInOut, lerp, clamp, rng } = require('../lib/util');

const S = { start: 0, end: 8.8 };

// 杯子几何（世界坐标）
const G = {
  cx: 960,
  rimY: 360, rimRx: 148, rimRy: 32,
  baseY: 770, baseRx: 116, baseRy: 24,
  water: 640,
};
const DROPS = [2.2, 4.4, 6.6]; // 水滴落入水面的时刻（设计时间）
const FALL = 0.62;

// 镜头：缓慢推近，结尾加速推向杯口（杯口随后变成电影票印章）
function cam(t) {
  const k1 = smooth(prog(t, 0, 7.2));
  const k2 = easeInOut(prog(t, 7.0, 8.6));
  return {
    cx: G.cx,
    cy: lerp(lerp(565, 545, k1), 400, k2),
    s: lerp(lerp(1.0, 1.1, k1), 1.32, k2),
  };
}

const rxAt = (y) => lerp(G.rimRx, G.baseRx, (y - G.rimY) / (G.baseY - G.rimY));

function waterLevel(t) {
  let up = 0;
  for (const d of DROPS) if (t >= d) up += 7 * Math.exp(-(t - d) / 0.9);
  return G.water - up;
}

function bodyPath(ctx) {
  ctx.moveTo(G.cx - G.rimRx, G.rimY);
  ctx.lineTo(G.cx - G.baseRx, G.baseY);
  ctx.ellipse(G.cx, G.baseY, G.baseRx, G.baseRy, 0, Math.PI, 0, true);
  ctx.lineTo(G.cx + G.rimRx, G.rimY);
  ctx.ellipse(G.cx, G.rimY, G.rimRx, G.rimRy, 0, 0, Math.PI, true);
  ctx.closePath();
}

const CRACK = [[1018, 784], [1024, 766], [1021, 752], [1031, 734], [1027, 720], [1035, 703]];
const CRACK_BRANCH = [[1024, 766], [1036, 760], [1042, 748]];

function drawStain(ctx, t) {
  // 漏出的水在纸上慢慢洇开
  const k = smooth(prog(t, 1.4, 8.5));
  if (k <= 0) return;
  const r = rng(41);
  ctx.save();
  for (let i = 0; i < 7; i++) {
    const ox = 1040 + r() * 70 + k * 30, oy = 800 + r() * 14;
    ctx.fillStyle = `rgba(120,98,62,${0.05 + r() * 0.03})`;
    ctx.beginPath();
    ctx.ellipse(ox, oy, (24 + r() * 46) * k, (6 + r() * 7) * k, (r() - 0.5) * 0.2, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

function drawLeak(ctx, t) {
  // 裂缝外侧的细水线，水滴落下后更明显
  let pulse = 0.25;
  for (const d of DROPS) if (t >= d) pulse += 0.75 * Math.exp(-(t - d) / 1.1);
  const a = clamp(pulse) * smooth(prog(t, 1.6, 2.4));
  if (a <= 0) return;
  pencil(ctx, [[1033, 712], [1037, 740], [1040, 770], [1046, 796], [1062, 803]],
    { seed: 77, t, width: 2.2, color: 'rgba(80,96,104,0.65)', alpha: a, amp: 0.8 });
  // 沿裂缝滑落的一颗小水珠
  const cyc = ((t - 1.6) % 1.4) / 1.4;
  if (t > 1.6) {
    const y = lerp(716, 798, easeIn(cyc));
    ctx.save();
    ctx.globalAlpha = a * (1 - cyc * 0.6);
    ctx.fillStyle = 'rgba(90,108,116,0.55)';
    ctx.beginPath();
    ctx.ellipse(lerp(1034, 1046, cyc), y, 3, 4.2, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

function drawDrop(ctx, t, level) {
  for (const d of DROPS) {
    const k = prog(t, d - FALL, d);
    if (t >= d - FALL && t < d) {
      const y = lerp(-80, level - 6, easeIn(k));
      ctx.save();
      ctx.translate(G.cx + 6, y);
      const st = 1 + easeIn(k) * 0.35; // 下落拉长
      ctx.scale(1 / Math.sqrt(st), st);
      ctx.beginPath();
      ctx.moveTo(0, -16);
      ctx.bezierCurveTo(6, -6, 10, 2, 10, 7);
      ctx.arc(0, 7, 10, 0, Math.PI);
      ctx.bezierCurveTo(-10, 2, -6, -6, 0, -16);
      ctx.fillStyle = 'rgba(110,128,136,0.35)';
      ctx.fill();
      ctx.strokeStyle = C.graphite;
      ctx.lineWidth = 1.4;
      ctx.stroke();
      ctx.fillStyle = 'rgba(255,255,250,0.7)';
      ctx.beginPath();
      ctx.ellipse(-3.5, 4, 2, 3.2, 0.3, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
    // 落水后的涟漪与小水花
    const rk = prog(t, d, d + 1.3);
    if (t >= d && rk < 1) {
      const rx = rxAt(level);
      for (let i = 0; i < 2; i++) {
        const kk = clamp(rk * 1.25 - i * 0.25);
        if (kk <= 0 || kk >= 1) continue;
        sketchEllipse(ctx, G.cx + 6, level, rx * 0.85 * kk + 6, 16 * 0.85 * kk + 1.5,
          { seed: 300 + i, t, width: 1.3, color: 'rgba(70,86,94,0.7)', alpha: (1 - kk) * 0.9, amp: 0.4, passes: 1 });
      }
      const sk = prog(t, d, d + 0.28);
      if (sk < 1) {
        ctx.save();
        ctx.fillStyle = 'rgba(90,108,116,0.6)';
        ctx.globalAlpha = 1 - sk;
        for (let i = -1; i <= 1; i += 2) {
          ctx.beginPath();
          ctx.arc(G.cx + 6 + i * (6 + sk * 26), level - 4 - Math.sin(sk * Math.PI) * 26, 2.4, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.restore();
      }
    }
  }
}

function draw(ctx, t) {
  const c = cam(t);
  // 杯身在 7.2s 后淡出，只留杯口（杯口交给第二幕变成印章）
  const bodyA = 1 - smooth(prog(t, 7.2, 8.2));
  const inA = smooth(prog(t, 0.0, 1.0));
  if (bodyA <= 0) return;
  ctx.save();
  camera(ctx, c.cx, c.cy, c.s);
  ctx.globalAlpha = bodyA;

  // 档案标注
  typeText(ctx, 'FIG. 01', 640, 300, { font: FONT.type(24), color: C.brown, progress: prog(t, 0.5, 1.1), seed: 3 });
  typeText(ctx, 'OBS. NO. 07 — CONTAINER, CRACKED', 640, 330, { font: FONT.type(18), color: C.gray, progress: prog(t, 0.8, 2.0), seed: 4 });
  pencil(ctx, [[760, 340], [800, 380], [812, 420]], { seed: 9, t, width: 1.2, color: C.graphiteSoft, progress: prog(t, 1.0, 1.6) });

  // 纸面投影
  ctx.save();
  ctx.globalAlpha = bodyA * 0.6 * inA;
  ctx.filter = 'blur(10px)';
  ctx.fillStyle = 'rgba(80,60,35,0.22)';
  ctx.beginPath();
  ctx.ellipse(G.cx + 18, G.baseY + 10, G.baseRx + 30, G.baseRy + 4, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  drawStain(ctx, t);

  // 玻璃体：极淡的透明感
  const level = waterLevel(t);
  ctx.save();
  ctx.globalAlpha = bodyA * inA;
  ctx.beginPath(); bodyPath(ctx);
  const g = ctx.createLinearGradient(G.cx - G.rimRx, 0, G.cx + G.rimRx, 0);
  g.addColorStop(0, 'rgba(255,255,250,0.30)');
  g.addColorStop(0.25, 'rgba(255,255,250,0.06)');
  g.addColorStop(0.7, 'rgba(120,130,130,0.06)');
  g.addColorStop(1, 'rgba(255,255,250,0.22)');
  ctx.fillStyle = g;
  ctx.fill();
  // 水体
  ctx.clip();
  ctx.fillStyle = 'rgba(96,114,120,0.20)';
  ctx.fillRect(G.cx - 200, level, 400, G.baseY + 40 - level);
  ctx.restore();

  // 水面
  ctx.save();
  ctx.globalAlpha = bodyA * inA;
  ctx.fillStyle = 'rgba(150,165,168,0.22)';
  ctx.beginPath();
  ctx.ellipse(G.cx, level, rxAt(level), 15, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
  sketchEllipse(ctx, G.cx, level, rxAt(level), 15, { seed: 21, t, width: 1.3, color: 'rgba(70,86,94,0.6)', progress: prog(t, 0.6, 1.4) });

  // 轮廓线
  const draw1 = prog(t, 0.0, 1.3);
  pencil(ctx, [[G.cx - G.rimRx, G.rimY], [G.cx - G.baseRx, G.baseY]], { seed: 11, t, width: 2.2, progress: draw1 });
  pencil(ctx, [[G.cx + G.rimRx, G.rimY], [G.cx + G.baseRx, G.baseY]], { seed: 12, t, width: 2.2, progress: draw1 });
  pencil(ctx, ellipsePts(G.cx, G.baseY, G.baseRx, G.baseRy, 0, Math.PI, 60), { seed: 13, t, width: 2.4, progress: prog(t, 0.6, 1.5) });
  pencil(ctx, ellipsePts(G.cx, G.baseY, G.baseRx, G.baseRy, Math.PI, Math.PI * 2, 60), { seed: 14, t, width: 1.2, color: C.graphiteSoft, progress: prog(t, 0.6, 1.5) });
  pencil(ctx, ellipsePts(G.cx, G.baseY - 18, G.baseRx - 3, G.baseRy - 2, 0, Math.PI, 60), { seed: 15, t, width: 1.1, color: C.graphiteSoft, progress: prog(t, 0.8, 1.6) });
  // 高光
  pencil(ctx, [[G.cx - 116, 400], [G.cx - 96, 700]], { seed: 16, t, width: 7, color: 'rgba(255,255,250,0.55)', progress: draw1, passes: 1 });
  pencil(ctx, [[G.cx - 92, 410], [G.cx - 82, 560]], { seed: 17, t, width: 3, color: 'rgba(255,255,250,0.45)', progress: draw1, passes: 1 });
  // 裂缝
  pencil(ctx, CRACK, { seed: 18, t, width: 1.5, color: C.ink, progress: prog(t, 1.0, 1.8), amp: 0.3 });
  pencil(ctx, CRACK_BRANCH, { seed: 19, t, width: 1.1, color: C.ink, progress: prog(t, 1.5, 1.9), amp: 0.3 });

  drawLeak(ctx, t);
  drawDrop(ctx, t, level);

  // 杯口（7.2s 起交给第二幕）
  if (t < 7.2) {
    sketchEllipse(ctx, G.cx, G.rimY, G.rimRx, G.rimRy, { seed: 20, t, width: 2.3, progress: prog(t, 0.2, 1.2) });
  }

  // 暗红批注：圈出裂缝（配合「你还是舍不得停。」）
  const ck = prog(t, 5.9, 6.6);
  if (ck > 0) {
    sketchEllipse(ctx, 1030, 744, 40, 56, { seed: 23, t, width: 2.2, color: C.redSoft, progress: easeInOut(ck), rot: 0.2 });
  }
  ctx.restore();
}

// 供第二幕使用：杯口在屏幕上的位置
function rimScreen(t) {
  const { W, H } = require('../config');
  const c = cam(t);
  return {
    x: W / 2 + (G.cx - c.cx) * c.s,
    y: H / 2 + (G.rimY - c.cy) * c.s,
    rx: G.rimRx * c.s,
    ry: G.rimRy * c.s,
  };
}

module.exports = { ...S, draw, rimScreen, DROPS };
