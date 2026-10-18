// 第七幕 · 走错的路：时间轴「现在」之后的那一段长成一条路。
// 一个很小的背影沿路往前走，经过「走错了」的路牌也没停。镜头拉远：路正弯离原本的方向。
const { W, H } = require('../../../src/config');
const { C, FONT } = require('../../../src/lib/style');
const { pencil, handText, typeText } = require('../../../src/lib/draw');
const { prog, smooth, easeInOut, easeOut, lerp, clamp } = require('../../../src/lib/util');
const props = require('../../../src/lib/props');
const { LY, NOW, X1 } = require('./s6_timeline');

const S = { start: 64.6, end: 73.8 };

const NL = [600, 1130], NR = [1340, 1130];
const F0 = [1000, 420], F1 = [1500, 440]; // 远端：起初正前方，拉远后弯向右边

// 道路几何（世界坐标，未加镜头）
function road(t) {
  const m = easeInOut(prog(t, 64.9, 66.0));     // 线 → 路
  const b = easeInOut(prog(t, 68.8, 72.6));     // 弯离方向
  const a0 = [NOW + 10, LY], b0 = [X1, LY];
  const F = [lerp(lerp(b0[0], F0[0], m), F1[0], b), lerp(lerp(b0[1], F0[1], m), F1[1], b)];
  const nl = [lerp(a0[0], NL[0], m), lerp(a0[1], NL[1], m)];
  const nr = [lerp(a0[0], NR[0], m), lerp(a0[1], NR[1], m)];
  const bend = (p) => [lerp((p[0] + F[0]) / 2, (p[0] + F[0]) / 2 - 160, b), lerp((p[1] + F[1]) / 2, (p[1] + F[1]) / 2 + 20, b)];
  return { F, nl, nr, cl: bend(nl), cr: bend(nr), m, b };
}
const qb = (p0, c, p1, f) => [
  (1 - f) * (1 - f) * p0[0] + 2 * f * (1 - f) * c[0] + f * f * p1[0],
  (1 - f) * (1 - f) * p0[1] + 2 * f * (1 - f) * c[1] + f * f * p1[1],
];
const edgePts = (p0, c, p1, n = 24) => Array.from({ length: n + 1 }, (_, i) => qb(p0, c, p1, i / n));
// 路中线上的点与透视比例（u: 0 近 → 1 远）
function along(g, u) {
  const l = qb(g.nl, g.cl, g.F, u), r = qb(g.nr, g.cr, g.F, u);
  return { x: (l[0] + r[0]) / 2, y: (l[1] + r[1]) / 2, w: Math.hypot(r[0] - l[0], r[1] - l[1]), l, r };
}

// 镜头：68.6 起慢慢拉远
function cam(t) {
  const k = easeInOut(prog(t, 68.6, 72.8));
  return { s: lerp(1, 0.72, k), cy: lerp(640, 600, k) };
}
function withCam(ctx, t, fn) {
  const c = cam(t);
  ctx.save();
  ctx.translate(W / 2, c.cy);
  ctx.scale(c.s, c.s);
  ctx.translate(-W / 2, -c.cy);
  fn(c);
  ctx.restore();
}

// 极简背影：头、肩、两条走动的腿。没有脸。
function figure(ctx, x, y, h, t, a) {
  const sw = Math.sin(t * 6.2) * 0.22;
  ctx.save();
  ctx.globalAlpha = a;
  ctx.translate(x, y);
  ctx.fillStyle = '#120d0a';
  // 腿
  for (const s of [-1, 1]) {
    ctx.save();
    ctx.translate(s * h * 0.06, -h * 0.44);
    ctx.rotate(s * sw);
    ctx.fillRect(-h * 0.045, 0, h * 0.09, h * 0.44);
    ctx.restore();
  }
  // 身体
  ctx.beginPath();
  ctx.moveTo(-h * 0.16, -h * 0.78);
  ctx.quadraticCurveTo(0, -h * 0.84, h * 0.16, -h * 0.78);
  ctx.lineTo(h * 0.13, -h * 0.42);
  ctx.lineTo(-h * 0.13, -h * 0.42);
  ctx.closePath();
  ctx.fill();
  // 头
  ctx.beginPath();
  ctx.arc(0, -h * 0.9, h * 0.095, 0, Math.PI * 2);
  ctx.fill();
  // 肩头的一点暖色轮廓光
  ctx.strokeStyle = 'rgba(255,214,160,0.35)';
  ctx.lineWidth = Math.max(1, h * 0.012);
  ctx.beginPath();
  ctx.moveTo(-h * 0.15, -h * 0.79); ctx.quadraticCurveTo(0, -h * 0.85, h * 0.15, -h * 0.79);
  ctx.stroke();
  ctx.restore();
}

const U = (t) => lerp(0.16, 0.66, prog(t, 65.6, 73.2));
const OUT = (t) => 1 - smooth(prog(t, 72.7, 73.3));

function draw(ctx, t) {
  const g = road(t);
  const out = OUT(t);
  withCam(ctx, t, () => {
    // 路面
    const fk = smooth(prog(t, 65.4, 66.2)) * out;
    if (fk > 0) {
      ctx.save();
      ctx.globalAlpha = fk;
      ctx.fillStyle = 'rgba(92,72,54,0.55)';
      ctx.beginPath();
      ctx.moveTo(g.nl[0], g.nl[1]);
      ctx.quadraticCurveTo(g.cl[0], g.cl[1], g.F[0], g.F[1]);
      ctx.quadraticCurveTo(g.cr[0], g.cr[1], g.nr[0], g.nr[1]);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
      // 地平线
      pencil(ctx, [[-400, 430], [W + 400, 430]], { seed: 701, t, width: 1, color: C.lightSoft, alpha: fk * 0.5 });
    }
    // 原本该走的方向：一条笔直的虚线
    const dk = smooth(prog(t, 69.4, 70.6)) * out;
    if (dk > 0) {
      ctx.save();
      ctx.setLineDash([10, 12]);
      pencil(ctx, [[970, 1130], [990, 430]], { seed: 702, t, width: 1.6, color: C.lightSoft, alpha: dk, passes: 1, boil: false });
      ctx.restore();
    }
    // 路的两条边
    // 72.6 起两条边交给第八幕变成进度条
    if (t < 72.6) {
      pencil(ctx, edgePts(g.nl, g.cl, g.F), { seed: 703, t, width: 2.2, color: C.light });
      pencil(ctx, edgePts(g.nr, g.cr, g.F), { seed: 704, t, width: 2.2, color: C.light });
    }

    // 公里桩：人走过时才亮起来
    [[0.24, '8 KM', 66.4], [0.42, '9 KM', 68.0], [0.58, '10 KM', 69.5]].forEach(([u, label, at], i) => {
      const k = smooth(prog(t, at, at + 0.5)) * out;
      if (k <= 0) return;
      const p = along(g, u);
      const s = p.w / 740;
      const x = p.l[0] - 60 * s, y = p.l[1];
      pencil(ctx, [[x, y], [x, y - 120 * s]], { seed: 710 + i, t, width: 2.2 * s + 0.5, color: C.light, alpha: k });
      ctx.save();
      ctx.globalAlpha = k;
      ctx.translate(x, y - 140 * s);
      ctx.scale(s, s);
      props.paper(ctx, 120, 44, { color: '#d9cdb1', shadow: 0.4 });
      ctx.restore();
      typeText(ctx, label, x, y - 132 * s, { font: FONT.type(Math.round(24 * s)), color: C.ink, align: 'center', seed: 720 + i, alpha: k });
    });

    // 路牌：走错了
    const sk = smooth(prog(t, 65.8, 66.5)) * out;
    if (sk > 0) {
      const p = along(g, 0.34);
      const s = p.w / 740;
      const x = p.r[0] + 70 * s, y = p.r[1];
      pencil(ctx, [[x, y], [x, y - 200 * s]], { seed: 730, t, width: 3 * s + 0.5, color: C.light, alpha: sk });
      ctx.save();
      ctx.globalAlpha = sk;
      ctx.translate(x, y - 220 * s);
      ctx.rotate(0.04);
      ctx.scale(s, s);
      props.paper(ctx, 230, 96, { color: '#d9cdb1', shadow: 0.5 });
      ctx.restore();
      handText(ctx, '走错了', x - 40 * s, y - 205 * s, { font: FONT.hand(Math.round(50 * s)), color: C.red, alpha: sk, align: 'center' });
      // 指向身后的箭头
      pencil(ctx, [[x + 50 * s, y - 214 * s], [x + 92 * s, y - 214 * s]], { seed: 731, t, width: 2.4 * s, color: C.red, alpha: sk });
      pencil(ctx, [[x + 76 * s, y - 230 * s], [x + 92 * s, y - 214 * s], [x + 76 * s, y - 198 * s]], { seed: 732, t, width: 2.4 * s, color: C.red, alpha: sk });
    }

    // 背影
    const fa = smooth(prog(t, 65.5, 66.1)) * out;
    if (fa > 0) {
      const p = along(g, U(t));
      figure(ctx, p.x, p.y, 210 * (p.w / 740), t, fa);
    }
  });
}

function light(t) {
  const g = road(t);
  const c = cam(t);
  const p = along(g, U(t));
  const toS = (x, y) => [W / 2 + (x - W / 2) * c.s, c.cy + (y - c.cy) * c.s];
  const [x, y] = toS(p.x, p.y - 80);
  const k = smooth(prog(t, 64.8, 65.8));
  return { x: lerp(1300, x, k), y: lerp(460, y, k), rx: 640, ry: 420, i: 0.95, w: smooth(prog(t, 64.6, 65.4)) * (1 - smooth(prog(t, 72.8, 73.6))) };
}

module.exports = { ...S, draw, light, road, edgePts, cam };
