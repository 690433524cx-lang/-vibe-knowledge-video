// 第一幕 · 钩子：黑暗里一只被顶光照亮的玻璃杯。水一直滴进去，又一直从杯底的裂缝漏走。
// 开场 0.3 秒就把问题抛给观众，镜头一路推向裂缝。
const { W, H } = require('../../../src/config');
const { C, FONT } = require('../../../src/lib/style');
const { pencil, sketchEllipse, ellipsePts, typeText, camera } = require('../../../src/lib/draw');
const { prog, smooth, easeIn, easeInOut, lerp, clamp, rng } = require('../../../src/lib/util');

const S = { start: 0, end: 8.9 };

// 杯子几何（世界坐标）
const G = {
  cx: 960,
  rimY: 360, rimRx: 148, rimRy: 32,
  baseY: 770, baseRx: 116, baseRy: 24,
  water: 650,
};
const DROPS = [1.6, 4.3, 6.6]; // 水滴落入水面的时刻（设计时间）
const FALLS = [1.4, 0.8, 0.8]; // 第一滴落得很慢
const CRACK = [[1018, 784], [1024, 766], [1021, 752], [1031, 734], [1027, 720], [1035, 703]];
const CRACK_BRANCH = [[1024, 766], [1036, 760], [1042, 748]];
const POOL = { x: 1095, y: 806 };

// 镜头：0–1.5 轻推；1.5–4.5 靠近裂缝；4.5–8 继续推近杯底
function cam(t) {
  const k1 = smooth(prog(t, 0, 1.6));
  const k2 = easeInOut(prog(t, 1.5, 4.6));
  const k3 = easeInOut(prog(t, 4.4, 8.4));
  return {
    cx: lerp(lerp(lerp(960, 965, k1), 1000, k2), 1026, k3),
    cy: lerp(lerp(lerp(575, 585, k1), 680, k2), 752, k3),
    s: lerp(lerp(lerp(1.0, 1.06, k1), 1.3, k2), 1.95, k3),
  };
}
const toScreen = (c, x, y) => [W / 2 + (x - c.cx) * c.s, H / 2 + (y - c.cy) * c.s];

const rxAt = (y) => lerp(G.rimRx, G.baseRx, (y - G.rimY) / (G.baseY - G.rimY));

function waterLevel(t) {
  let up = 0;
  for (const d of DROPS) if (t >= d) up += 7 * Math.exp(-(t - d) / 0.9);
  // 整体在一点点变少
  return G.water - up + smooth(prog(t, 1.6, 8.5)) * 14;
}

function bodyPath(ctx) {
  ctx.moveTo(G.cx - G.rimRx, G.rimY);
  ctx.lineTo(G.cx - G.baseRx, G.baseY);
  ctx.ellipse(G.cx, G.baseY, G.baseRx, G.baseRy, 0, Math.PI, 0, true);
  ctx.lineTo(G.cx + G.rimRx, G.rimY);
  ctx.ellipse(G.cx, G.rimY, G.rimRx, G.rimRy, 0, 0, Math.PI, true);
  ctx.closePath();
}

// 顶光：一束很弱的光柱 + 桌面上的光斑
function drawTopLight(ctx, a) {
  ctx.save();
  ctx.globalAlpha = a;
  const g = ctx.createLinearGradient(0, -300, 0, 820);
  g.addColorStop(0, 'rgba(255,226,180,0.10)');
  g.addColorStop(1, 'rgba(255,226,180,0.015)');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.moveTo(G.cx - 70, -300); ctx.lineTo(G.cx + 70, -300);
  ctx.lineTo(G.cx + 330, 810); ctx.lineTo(G.cx - 330, 810);
  ctx.closePath();
  ctx.filter = 'blur(30px)';
  ctx.fill();
  ctx.filter = 'none';
  const p = ctx.createRadialGradient(G.cx, G.baseY + 12, 10, G.cx, G.baseY + 12, 360);
  p.addColorStop(0, 'rgba(255,214,160,0.22)');
  p.addColorStop(1, 'rgba(255,214,160,0)');
  ctx.fillStyle = p;
  ctx.save();
  ctx.translate(G.cx, G.baseY + 12);
  ctx.scale(1, 0.22);
  ctx.translate(-G.cx, -(G.baseY + 12));
  ctx.beginPath();
  ctx.arc(G.cx, G.baseY + 12, 360, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
  ctx.restore();
}

// 桌面上的档案标签：FIG. 01
function drawTag(ctx, t, a) {
  ctx.save();
  ctx.globalAlpha = a;
  ctx.translate(735, 812);
  ctx.rotate(-0.06);
  ctx.shadowColor = 'rgba(0,0,0,0.5)';
  ctx.shadowBlur = 10; ctx.shadowOffsetY = 4;
  ctx.fillStyle = '#d9cdb2';
  ctx.fillRect(-95, -30, 190, 62);
  ctx.shadowColor = 'transparent';
  ctx.strokeStyle = 'rgba(60,45,35,0.5)';
  ctx.lineWidth = 1;
  ctx.strokeRect(-89, -24, 178, 50);
  typeText(ctx, 'FIG. 01', -76, 0, { font: FONT.type(22), color: C.ink, seed: 3 });
  typeText(ctx, 'CONTAINER · CRACKED', -76, 20, { font: FONT.type(12), color: C.brown, seed: 4 });
  ctx.restore();
}

// 漏出的水在桌面上积成一小滩，反着一点光
function drawPool(ctx, t) {
  const k = smooth(prog(t, 1.9, 8.6));
  if (k <= 0) return;
  const r = rng(41);
  ctx.save();
  for (let i = 0; i < 6; i++) {
    const ox = POOL.x - 30 + r() * 60 + k * 40, oy = POOL.y + r() * 10;
    ctx.fillStyle = `rgba(0,0,0,${0.18 + r() * 0.08})`;
    ctx.beginPath();
    ctx.ellipse(ox, oy, (28 + r() * 50) * k, (5 + r() * 6) * k, (r() - 0.5) * 0.15, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.strokeStyle = `rgba(255,228,190,${0.28 * k})`;
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  ctx.ellipse(POOL.x + 20 * k, POOL.y - 2, 70 * k, 7 * k, 0, Math.PI * 1.1, Math.PI * 1.7);
  ctx.stroke();
  ctx.restore();
}

function drawLeak(ctx, t) {
  let pulse = 0.35;
  for (const d of DROPS) if (t >= d) pulse += 0.65 * Math.exp(-(t - d) / 1.2);
  const a = clamp(pulse) * smooth(prog(t, 1.8, 2.5));
  if (a <= 0) return;
  pencil(ctx, [[1033, 712], [1037, 740], [1040, 770], [1050, 796], [1072, 805]],
    { seed: 77, t, width: 2.2, color: 'rgba(205,220,220,0.7)', alpha: a, amp: 0.8 });
  // 沿裂缝滑落的水珠，一颗接一颗
  for (let j = 0; j < 2; j++) {
    const ph = t - 1.9 - j * 0.65;
    if (ph < 0) continue;
    const cyc = (ph % 1.3) / 1.3;
    const y = lerp(716, 800, easeIn(cyc));
    ctx.save();
    ctx.globalAlpha = a * (1 - cyc * 0.5);
    ctx.fillStyle = 'rgba(215,228,228,0.7)';
    ctx.beginPath();
    ctx.ellipse(lerp(1034, 1056, easeIn(cyc)), y, 3.2, 4.6, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

function drawDrops(ctx, t, level) {
  DROPS.forEach((d, idx) => {
    const fall = FALLS[idx];
    const k = prog(t, d - fall, d);
    if (t >= d - fall && t < d) {
      const y = lerp(idx === 0 ? 120 : -200, level - 6, idx === 0 ? Math.pow(k, 1.8) : easeIn(k));
      ctx.save();
      ctx.translate(G.cx + 6, y);
      const st = 1 + k * 0.3;
      ctx.scale(1 / Math.sqrt(st), st);
      ctx.beginPath();
      ctx.moveTo(0, -16);
      ctx.bezierCurveTo(6, -6, 10, 2, 10, 7);
      ctx.arc(0, 7, 10, 0, Math.PI);
      ctx.bezierCurveTo(-10, 2, -6, -6, 0, -16);
      ctx.fillStyle = 'rgba(170,190,195,0.25)';
      ctx.fill();
      ctx.strokeStyle = C.light;
      ctx.lineWidth = 1.4;
      ctx.stroke();
      ctx.fillStyle = 'rgba(255,248,235,0.85)';
      ctx.beginPath();
      ctx.ellipse(-3.5, 4, 2, 3.2, 0.3, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
    // 涟漪与小水花
    const rk = prog(t, d, d + 1.3);
    if (t >= d && rk < 1) {
      const rx = rxAt(level);
      for (let i = 0; i < 2; i++) {
        const kk = clamp(rk * 1.25 - i * 0.25);
        if (kk <= 0 || kk >= 1) continue;
        sketchEllipse(ctx, G.cx + 6, level, rx * 0.85 * kk + 6, 15 * 0.85 * kk + 1.5,
          { seed: 300 + i, t, width: 1.3, color: 'rgba(215,228,228,0.8)', alpha: (1 - kk) * 0.9, amp: 0.4, passes: 1 });
      }
      const sk = prog(t, d, d + 0.28);
      if (sk < 1) {
        ctx.save();
        ctx.fillStyle = 'rgba(220,232,232,0.75)';
        ctx.globalAlpha = 1 - sk;
        for (let i = -1; i <= 1; i += 2) {
          ctx.beginPath();
          ctx.arc(G.cx + 6 + i * (6 + sk * 26), level - 4 - Math.sin(sk * Math.PI) * 26, 2.4, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.restore();
      }
    }
  });
}

function draw(ctx, t) {
  const c = cam(t);
  // 7.3s 起杯身淡出，只留杯底轮廓（交给第二幕变成电影票印章）
  const bodyA = 1 - smooth(prog(t, 7.25, 7.95));
  if (bodyA <= 0) return;
  ctx.save();
  camera(ctx, c.cx, c.cy, c.s);
  ctx.globalAlpha = bodyA;

  drawTopLight(ctx, 1);
  drawTag(ctx, t, 1);

  // 杯底投影
  ctx.save();
  ctx.filter = 'blur(8px)';
  ctx.fillStyle = 'rgba(0,0,0,0.55)';
  ctx.beginPath();
  ctx.ellipse(G.cx + 10, G.baseY + 6, G.baseRx + 18, G.baseRy + 2, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  drawPool(ctx, t);

  // 玻璃体：暗处里只有边缘和高光是亮的
  const level = waterLevel(t);
  ctx.save();
  ctx.beginPath(); bodyPath(ctx);
  const g = ctx.createLinearGradient(G.cx - G.rimRx, 0, G.cx + G.rimRx, 0);
  g.addColorStop(0, 'rgba(255,240,215,0.16)');
  g.addColorStop(0.22, 'rgba(255,240,215,0.03)');
  g.addColorStop(0.75, 'rgba(255,240,215,0.02)');
  g.addColorStop(1, 'rgba(255,240,215,0.12)');
  ctx.fillStyle = g;
  ctx.fill();
  ctx.clip();
  ctx.fillStyle = 'rgba(150,172,176,0.17)';
  ctx.fillRect(G.cx - 200, level, 400, G.baseY + 40 - level);
  ctx.restore();

  // 水面
  ctx.save();
  ctx.fillStyle = 'rgba(200,215,215,0.10)';
  ctx.beginPath();
  ctx.ellipse(G.cx, level, rxAt(level), 15, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
  sketchEllipse(ctx, G.cx, level, rxAt(level), 15, { seed: 21, t, width: 1.3, color: 'rgba(210,224,224,0.6)' });

  // 轮廓线
  pencil(ctx, [[G.cx - G.rimRx, G.rimY], [G.cx - G.baseRx, G.baseY]], { seed: 11, t, width: 2.0, color: C.light });
  pencil(ctx, [[G.cx + G.rimRx, G.rimY], [G.cx + G.baseRx, G.baseY]], { seed: 12, t, width: 2.0, color: C.light });
  sketchEllipse(ctx, G.cx, G.rimY, G.rimRx, G.rimRy, { seed: 20, t, width: 2.1, color: C.light });
  pencil(ctx, ellipsePts(G.cx, G.baseY, G.baseRx, G.baseRy, Math.PI, Math.PI * 2, 60), { seed: 14, t, width: 1.1, color: C.lightSoft });
  pencil(ctx, ellipsePts(G.cx, G.baseY - 18, G.baseRx - 3, G.baseRy - 2, 0, Math.PI, 60), { seed: 15, t, width: 1.1, color: C.lightSoft });
  // 杯底前沿（7.3s 后交给第二幕）
  if (t < 7.3) {
    pencil(ctx, ellipsePts(G.cx, G.baseY, G.baseRx, G.baseRy, 0, Math.PI, 60), { seed: 13, t, width: 2.4, color: C.light });
  }
  // 高光
  pencil(ctx, [[G.cx - 116, 400], [G.cx - 96, 700]], { seed: 16, t, width: 6, color: 'rgba(255,246,228,0.5)', passes: 1 });
  pencil(ctx, [[G.cx - 92, 410], [G.cx - 82, 560]], { seed: 17, t, width: 2.6, color: 'rgba(255,246,228,0.4)', passes: 1 });
  pencil(ctx, [[G.cx + 118, 420], [G.cx + 104, 640]], { seed: 26, t, width: 2, color: 'rgba(255,246,228,0.22)', passes: 1 });
  // 裂缝：边缘反着一点冷光
  pencil(ctx, CRACK, { seed: 18, t, width: 1.7, color: 'rgba(250,240,222,0.95)', amp: 0.3 });
  pencil(ctx, CRACK_BRANCH, { seed: 19, t, width: 1.2, color: 'rgba(250,240,222,0.8)', amp: 0.3 });

  drawLeak(ctx, t);
  drawDrops(ctx, t, level);

  // 暗红批注：配合「你为什么还是舍不得停？」圈出裂缝
  const ck = prog(t, 2.5, 3.2);
  if (ck > 0) {
    sketchEllipse(ctx, 1030, 744, 40, 56, { seed: 23, t, width: 2.2, color: C.subRed, alpha: 0.8, progress: easeInOut(ck), rot: 0.2 });
  }
  ctx.restore();
}

function light(t) {
  const c = cam(t);
  const [x, y] = toScreen(c, 990, 640);
  return { x, y: y - 20, rx: 560 + 160 * (c.s - 1), ry: 470 + 120 * (c.s - 1), i: 1, w: 1 - smooth(prog(t, 7.4, 8.6)) };
}

// 供第二幕使用：杯底前沿在屏幕上的位置
function baseScreen(t) {
  const c = cam(t);
  const [x, y] = toScreen(c, G.cx, G.baseY);
  return { x, y, rx: G.baseRx * c.s, ry: G.baseRy * c.s };
}

module.exports = { ...S, draw, light, baseScreen, DROPS };
