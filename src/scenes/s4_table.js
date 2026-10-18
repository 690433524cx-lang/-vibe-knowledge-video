// 第四幕 · 感情：号码牌下的细线 → 一条长路 → 一张桌子的前沿。
// 桌上一张旧照片，两把椅子，其中一把被拉开、空着。
const { W, H } = require('../config');
const { C, FONT } = require('../lib/style');
const { pencil, line } = require('../lib/draw');
const { prog, smooth, easeInOut, easeOut, lerp, clamp } = require('../lib/util');
const props = require('../lib/props');

const S = { start: 24.8, end: 40.7 };

const P0 = [915, 766];          // 号码牌底边（屏幕坐标，接第三幕）
const ROAD_Y = 792;
const V = [960, 470];           // 长路的消失点
const TABLE = { nl: [190, 880], nr: [1730, 880], fl: [600, 560], fr: [1320, 560] };
const PHOTO = { x: 960, y: 712, w: 300, h: 230, rot: -0.06 };
const PAGE = { x: 960, y: 520, w: 1180, h: 700 };

const L2 = (a, b, k) => [lerp(a[0], b[0], k), lerp(a[1], b[1], k)];

// 线 → 路 → 桌：返回当前的几何
function rig(t) {
  const kA = easeInOut(prog(t, 25.1, 26.0));
  const kB = easeInOut(prog(t, 26.0, 26.9));
  const kC = easeInOut(prog(t, 26.9, 27.9));
  const mid = [lerp(P0[0], 960, kA), ROAD_Y];
  let left = [lerp(mid[0], -80, kA), ROAD_Y], right = [lerp(mid[0], 2000, kA), ROAD_Y];
  let ml = L2(mid, V, kB), mr = ml;
  left = L2(left, [-80, 1100], kB); right = L2(right, [2000, 1100], kB);
  ml = L2(ml, TABLE.fl, kC); mr = L2(mr, TABLE.fr, kC);
  left = L2(left, TABLE.nl, kC); right = L2(right, TABLE.nr, kC);
  return { left, right, ml, mr, kA, kB, kC };
}

// 镜头漂移（桌子成形之后）
function camOff(t) {
  // 照片长成档案页时镜头回正，保证与第五幕的页面严丝合缝
  const k = smooth(prog(t, 28, 39.5)) * (1 - easeInOut(prog(t, 39.2, 40.5)));
  return { dx: lerp(0, -22, k), s: lerp(1, 1.045, k) };
}
function withCam(ctx, t, fn) {
  const c = camOff(t);
  ctx.save();
  ctx.translate(W / 2 + c.dx, 650);
  ctx.scale(c.s, c.s);
  ctx.translate(-W / 2, -650);
  fn();
  ctx.restore();
}

function chairBack(ctx, x, y, w, h, o) {
  pencil(ctx, [[x - w / 2, y + h], [x - w / 2, y]], o);
  pencil(ctx, [[x + w / 2, y + h], [x + w / 2, y]], { ...o, seed: o.seed + 1 });
  pencil(ctx, [[x - w / 2 - 6, y], [x + w / 2 + 6, y]], { ...o, seed: o.seed + 2, width: (o.width || 2) * 1.4 });
  for (let i = 1; i <= 3; i++) {
    const yy = y + h * 0.12 * i;
    pencil(ctx, [[x - w / 2, yy], [x + w / 2, yy]], { ...o, seed: o.seed + 3 + i, width: 1.1 });
  }
}

function drawChairs(ctx, t, a) {
  const p = prog(t, 27.5, 28.7);
  if (p <= 0) return;
  // 靠着桌子的那把
  chairBack(ctx, 760, 380, 150, 180, { seed: 501, t, width: 2, color: C.light, alpha: a, progress: p });
  // 被拉开的那把：离桌子更远，轻微转开；「再试一次吧」时往回挪了一点，又停住
  const back = 1 - smooth(prog(t, 33.9, 35.0)) * 0.35 + smooth(prog(t, 36.3, 37.6)) * 0.35;
  const cx = 1205 + back * 40, cy = 330 - back * 30, sc = 0.86;
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(0.07 * back);
  ctx.scale(sc, sc);
  chairBack(ctx, 0, 0, 150, 190, { seed: 511, t, width: 2, color: C.lightSoft, alpha: a, progress: p });
  // 拉开后露出的座面
  pencil(ctx, [[-82, 190], [82, 190], [100, 236], [-64, 236], [-82, 190]], { seed: 520, t, width: 1.6, color: C.lightSoft, alpha: a, progress: p });
  pencil(ctx, [[-64, 236], [-64, 300]], { seed: 521, t, width: 1.6, color: C.lightSoft, alpha: a * 0.7, progress: p });
  pencil(ctx, [[100, 236], [100, 290]], { seed: 522, t, width: 1.6, color: C.lightSoft, alpha: a * 0.7, progress: p });
  ctx.restore();
}

function drawTable(ctx, t, a, g) {
  const { nl, nr, fl, fr } = TABLE;
  const fk = smooth(prog(t, 27.2, 28.2)) * a;
  if (fk > 0) {
    ctx.save();
    ctx.globalAlpha = fk;
    ctx.fillStyle = 'rgba(78,58,42,0.75)';
    ctx.beginPath();
    ctx.moveTo(nl[0], nl[1]); ctx.lineTo(nr[0], nr[1]); ctx.lineTo(fr[0], fr[1]); ctx.lineTo(fl[0], fl[1]); ctx.closePath();
    ctx.fill();
    // 桌面木纹
    ctx.strokeStyle = 'rgba(25,18,12,0.25)';
    ctx.lineWidth = 1.2;
    for (let i = 1; i < 12; i++) {
      const k = i / 12;
      ctx.beginPath();
      ctx.moveTo(lerp(nl[0], fl[0], k), lerp(nl[1], fl[1], k));
      ctx.lineTo(lerp(nr[0], fr[0], k), lerp(nr[1], fr[1], k));
      ctx.stroke();
    }
    // 前沿厚度
    ctx.fillStyle = 'rgba(40,29,21,0.95)';
    ctx.fillRect(nl[0], nl[1], nr[0] - nl[0], 28);
    ctx.restore();
  }
  pencil(ctx, [g.left, g.right], { seed: 530, t, width: 2.2, color: C.light, alpha: a * g.kC, progress: g.kC });
  pencil(ctx, [fl, fr], { seed: 531, t, width: 1.6, color: C.lightSoft, alpha: a * g.kC, progress: g.kC });
  const lk = prog(t, 27.6, 28.4);
  pencil(ctx, [[nl[0] + 40, nl[1] + 28], [nl[0] + 40, 1090]], { seed: 532, t, width: 2, color: C.lightSoft, alpha: a, progress: lk });
  pencil(ctx, [[nr[0] - 40, nr[1] + 28], [nr[0] - 40, 1090]], { seed: 533, t, width: 2, color: C.lightSoft, alpha: a, progress: lk });
}

function drawRoad(ctx, t, g) {
  const out = 1 - smooth(prog(t, 26.9, 27.6));
  if (g.kB <= 0 || out <= 0) return;
  // 远方地平线与路中间的虚线
  pencil(ctx, [[0, V[1]], [W, V[1]]], { seed: 540, t, width: 1, color: C.lightSoft, alpha: g.kB * out * 0.6 });
  for (let i = 0; i < 9; i++) {
    const z0 = 1 + i * 0.8, z1 = z0 + 0.35;
    const y0 = V[1] + (1100 - V[1]) / z0, y1 = V[1] + (1100 - V[1]) / z1;
    line(ctx, 960, y0, 960, y1, { seed: 541 + i, t, width: 3 / z0 + 0.6, color: C.light, alpha: g.kB * out * 0.8 });
  }
}

function drawPhoto(ctx, t, a) {
  const k = prog(t, 28.7, 29.15);
  if (k <= 0) return;
  // 落下：从略高处带着阴影落到桌面，轻轻一顿
  const fall = easeOut(k);
  const settle = Math.sin(prog(t, 29.15, 29.5) * Math.PI) * 3;
  // 39.0 起：照片升起、放大，白边长成一张档案页
  const m = easeInOut(prog(t, 39.2, 40.5));
  const x = lerp(PHOTO.x, PAGE.x, m), y = lerp(PHOTO.y - (1 - fall) * 60 - settle, PAGE.y, m);
  const w = lerp(PHOTO.w, PAGE.w, m), h = lerp(PHOTO.h, PAGE.h, m);
  ctx.save();
  ctx.globalAlpha = a * smooth(k);
  ctx.translate(x, y);
  ctx.rotate(lerp(PHOTO.rot, 0, m));
  ctx.scale(lerp(1.2, 1, fall), lerp(1.2, 1, fall));
  if (m <= 0) {
    props.photo(ctx, w, h, { t, fade: smooth(prog(t, 38.1, 39.6)) * 0.6 });
  } else {
    props.paper(ctx, w, h, { color: '#d9cdb1' });
    ctx.globalAlpha = a * (1 - smooth(prog(t, 39.6, 40.4)));
    props.photo(ctx, w, h, { t, fade: 0.6 });
  }
  ctx.restore();
}

function draw(ctx, t) {
  const g = rig(t);
  const tableA = 1 - smooth(prog(t, 39.0, 39.8));
  // 细线（线 → 路）
  if (g.kC < 1) {
    const dropK = prog(t, 24.9, 25.15);
    if (dropK < 1 || g.kA === 0) {
      pencil(ctx, [P0, [P0[0], ROAD_Y]], { seed: 550, t, width: 2, color: C.light, progress: dropK });
    }
    if (dropK >= 1) {
      const a = 1 - g.kC;
      pencil(ctx, [g.left, g.ml], { seed: 551, t, width: 2.2, color: C.light, alpha: a });
      pencil(ctx, [g.mr, g.right], { seed: 552, t, width: 2.2, color: C.light, alpha: a });
    }
  }
  drawRoad(ctx, t, g);
  withCam(ctx, t, () => {
    drawChairs(ctx, t, tableA);
    drawTable(ctx, t, tableA, g);
    drawPhoto(ctx, t, 1);
  });
}

function light(t) {
  const k = easeInOut(prog(t, 26.6, 28.2));
  const m = easeInOut(prog(t, 39.2, 40.5));
  const x = lerp(960, 960, k), y = lerp(lerp(780, 680, k), 520, m);
  return {
    x, y, rx: lerp(lerp(1000, 820, k), 900, m), ry: lerp(lerp(380, 440, k), 500, m),
    i: lerp(0.75, 1, k), w: smooth(prog(t, 25.4, 26.4)),
  };
}

module.exports = { ...S, draw, light, PAGE };
