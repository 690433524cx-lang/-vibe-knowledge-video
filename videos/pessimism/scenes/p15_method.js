// 方法（最终精修版）· 96.4–107.4 秒：三个问题不写成教程卡片，而是出现在真实的地方。
//   q1   96.4–98.75   深夜的桌子，回到那张地图的十字路口——他自己画上去的断桥、暴雨、失败、拒绝还在。
//                     铅笔在地图边上写下「它真的一定会发生吗？」；写完以后，那几个自己画上去的灾难淡下去。
//   q2   98.65–100.95 同一张桌子，台灯下的一张黄色便利贴：他亲手写「如果发生，我能做什么？」
//   q3   100.85–107.4 起雾的窗：玻璃上被手指擦出「除了最坏，还有没有别的可能？」，字迹里透出外面的城市；
//                     之后雾慢慢散开，外面的灯越来越清楚（空间重新打开）。
//                     「你可以想到最坏。」「但别把最坏——当成未来唯一的版本。」在这扇窗前读完。
// 贯穿三个镜头的「最坏的未来」：画面四周很淡的几层词和暗（失败 / 拒绝 / 结束……），每写完一个问题就少一层，画面也亮一点。
const { createCanvas } = require('@napi-rs/canvas');
const { W, H } = require('../../../src/config');
const { FONT } = require('../../../src/lib/style');
const { prog, smooth, lerp, rng, noise1, easeInOut } = require('../../../src/lib/util');
const { withCam, toScreen } = require('../lib');
const map = require('./p7_map');

const Q_DONE = [97.6, 99.9, 102.0];       // 每个问题写完的时刻

// 手写出来（从左到右露出）
function written(ctx, s, x, y, font, color, k, align = 'left') {
  if (k <= 0) return;
  ctx.save();
  ctx.font = font;
  const w = ctx.measureText(s).width;
  const left = align === 'center' ? x - w / 2 : x;
  ctx.beginPath(); ctx.rect(left - 10, y - 200, (w + 20) * Math.min(1, k), 300); ctx.clip();
  ctx.fillStyle = color;
  ctx.fillText(s, left, y);
  ctx.restore();
}
// 正在写的那一个字的位置（笔尖跟着字走）
function writingTip(ctx, s, x, y, font, k, align = 'left') {
  ctx.save(); ctx.font = font;
  const w = ctx.measureText(s).width;
  ctx.restore();
  const left = align === 'center' ? x - w / 2 : x;
  return [left + w * Math.min(1, k), y - 10 + Math.sin(k * 60) * 8];
}

// ---------------- Q1 · 地图 ----------------
const Q1 = { start: 96.4, end: 98.8 };
const q1Fade = (t) => smooth(prog(t, 96.4, 96.55)) * (1 - smooth(prog(t, 98.6, 98.8)));
const q1Cam = (t) => { const k = easeInOut(prog(t, 96.4, 98.8)); return { cx: lerp(1480, 1440, k), cy: lerp(760, 740, k), s: lerp(0.6, 0.64, k) }; };
const Q1_POS = [map.CROSS[0] - 30, map.CROSS[1] - 300];       // 地图坐标：十字路口上方的空白
const Q1_FONT = FONT.hand(84);
const q1k = (t) => prog(t, 96.7, 97.6);
const calm = (t) => smooth(prog(t, 97.6, 98.4));               // 写完以后，自己画上去的灾难淡下去
const q1 = {
  ...Q1,
  draw(ctx, t) {
    const c = q1Cam(t);
    ctx.save();
    ctx.globalAlpha *= q1Fade(t);
    ctx.fillStyle = '#1c1611'; ctx.fillRect(0, 0, W, H);
    withCam(ctx, c, 1, () => {
      map.desk(ctx, t);
      ctx.save();
      ctx.translate(map.ORIGIN[0], map.ORIGIN[1]);
      ctx.rotate(map.MAP.rot);
      ctx.save();
      ctx.shadowColor = 'rgba(0,0,0,0.6)'; ctx.shadowBlur = 50; ctx.shadowOffsetX = 24; ctx.shadowOffsetY = 30;
      ctx.fillStyle = '#d6c9ab'; ctx.fillRect(-map.MAP.w / 2, -map.MAP.h / 2, map.MAP.w, map.MAP.h);
      ctx.restore();
      ctx.drawImage(map.BASE.canvas, -map.MAP.w / 2 - map.BASE.pad, -map.MAP.h / 2 - map.BASE.pad);
      ctx.save();
      ctx.globalAlpha *= lerp(1, 0.28, calm(t));
      map.marks(ctx, 63.25);
      ctx.restore();
      written(ctx, '它真的一定会发生吗？', Q1_POS[0], Q1_POS[1], Q1_FONT, 'rgba(40,32,28,0.94)', q1k(t), 'center');
      ctx.restore();
      const tip = writingTip(ctx, '它真的一定会发生吗？', Q1_POS[0], Q1_POS[1], Q1_FONT, q1k(t), 'center');
      map.hand(ctx, map.M(tip), t, smooth(prog(t, 96.45, 96.7)) * (1 - smooth(prog(t, 97.7, 98.2))));
    });
    ctx.restore();
  },
  drawOver(ctx, t) {
    ctx.save();
    ctx.globalAlpha *= q1Fade(t);
    withCam(ctx, q1Cam(t), 1, () => map.lampGlow(ctx));
    ctx.restore();
  },
  light(t) {
    const c = q1Cam(t), w = q1Fade(t);
    const [lx, ly] = toScreen(c, ...map.M([map.CROSS[0] - 60, map.CROSS[1] - 120]));
    return [
      { x: lx, y: ly, rx: 1500 * c.s, ry: 1000 * c.s, i: lerp(0.86, 0.95, calm(t)), w, color: [255, 210, 150], core: 0.25, rot: -0.2 },
      { x: W / 2, y: H / 2, rx: 1400, ry: 800, i: 0.2, w, color: [255, 214, 170] },
    ];
  },
  grade: () => ({ warm: 0.34, ambient: 0.09 }),
};

// ---------------- Q2 · 便利贴 ----------------
const Q2 = { start: 98.65, end: 101.0 };
const q2Fade = (t) => smooth(prog(t, 98.65, 98.8)) * (1 - smooth(prog(t, 100.8, 101.0)));
const NOTE = { x: -760, y: 560, w: 470, h: 450, rot: -0.05 };   // 桌上的世界坐标：地图左边、台灯下
const q2Cam = (t) => { const k = easeInOut(prog(t, 98.65, 101.0)); return { cx: lerp(-640, -660, k), cy: lerp(470, 500, k), s: lerp(1.0, 1.05, k) }; };
const Q2_FONT = FONT.hand(70);
const Q2_LINES = [['如果发生，', 98.9, 99.35], ['我能做什么？', 99.35, 99.9]];
const q2 = {
  ...Q2,
  draw(ctx, t) {
    const c = q2Cam(t);
    ctx.save();
    ctx.globalAlpha *= q2Fade(t);
    ctx.fillStyle = '#1c1611'; ctx.fillRect(0, 0, W, H);
    withCam(ctx, c, 1, () => {
      map.desk(ctx, t);
      // 地图的一角
      ctx.save();
      ctx.translate(map.ORIGIN[0], map.ORIGIN[1]); ctx.rotate(map.MAP.rot);
      ctx.drawImage(map.BASE.canvas, -map.MAP.w / 2 - map.BASE.pad, -map.MAP.h / 2 - map.BASE.pad);
      ctx.restore();
      // 便利贴：略卷的一角、很淡的影子
      ctx.save();
      ctx.translate(NOTE.x, NOTE.y); ctx.rotate(NOTE.rot);
      ctx.fillStyle = 'rgba(0,0,0,0.35)';
      ctx.fillRect(-NOTE.w / 2 + 14, -NOTE.h / 2 + 18, NOTE.w, NOTE.h);
      const g = ctx.createLinearGradient(0, -NOTE.h / 2, 0, NOTE.h / 2);
      g.addColorStop(0, '#e6cd6c'); g.addColorStop(1, '#dcc05a');
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.moveTo(-NOTE.w / 2, -NOTE.h / 2); ctx.lineTo(NOTE.w / 2, -NOTE.h / 2); ctx.lineTo(NOTE.w / 2, NOTE.h / 2 - 40); ctx.quadraticCurveTo(NOTE.w / 2 - 10, NOTE.h / 2 - 6, NOTE.w / 2 - 50, NOTE.h / 2); ctx.lineTo(-NOTE.w / 2, NOTE.h / 2); ctx.closePath(); ctx.fill();
      ctx.fillStyle = 'rgba(160,130,40,0.25)'; ctx.fillRect(-NOTE.w / 2, -NOTE.h / 2, NOTE.w, 46);
      Q2_LINES.forEach(([l, t0, t1], i) => written(ctx, l, -NOTE.w / 2 + 44, -40 + i * 100, Q2_FONT, 'rgba(36,30,40,0.94)', prog(t, t0, t1)));
      ctx.restore();
      // 他的手：拿着铅笔，笔尖跟着字走
      const cur = Q2_LINES.find(([, t0, t1]) => t >= t0 - 0.05 && t <= t1) || Q2_LINES[t < 99.0 ? 0 : 1];
      const i = Q2_LINES.indexOf(cur);
      const [lx, ly] = writingTip(ctx, cur[0], -NOTE.w / 2 + 44, -40 + i * 100, Q2_FONT, prog(t, cur[1], cur[2]));
      const cs = Math.cos(NOTE.rot), sn = Math.sin(NOTE.rot);
      map.hand(ctx, [NOTE.x + lx * cs - ly * sn, NOTE.y + lx * sn + ly * cs], t, smooth(prog(t, 98.7, 98.9)) * (1 - smooth(prog(t, 100.05, 100.5))));
    });
    ctx.restore();
  },
  drawOver(ctx, t) {
    ctx.save();
    ctx.globalAlpha *= q2Fade(t);
    withCam(ctx, q2Cam(t), 1, () => map.lampGlow(ctx));
    ctx.restore();
  },
  light(t) {
    const c = q2Cam(t), w = q2Fade(t);
    const [nx, ny] = toScreen(c, NOTE.x + 40, NOTE.y - 40);
    const [gx, gy] = toScreen(c, map.LAMP_HEAD[0], map.LAMP_HEAD[1]);
    return [
      { x: nx, y: ny, rx: 900 * c.s, ry: 700 * c.s, i: 0.95, w, color: [255, 214, 160], core: 0.3 },
      { x: gx, y: gy, rx: 380 * c.s, ry: 320 * c.s, i: 0.6, w, color: [255, 210, 150] },
    ];
  },
  grade: () => ({ warm: 0.3, ambient: 0.1 }),
};

// ---------------- Q3 · 起雾的窗 ----------------
const FOGL = createCanvas(W, H);
const FOG = (() => { const r = rng(1502); return Array.from({ length: 90 }, () => ({ x: r(), y: r(), s: 0.8 + r() * 2.4, w: r() < 0.6, a: 0.25 + r() * 0.5 })); })();
const Q3 = { start: 100.85, end: 107.45 };
const q3Fade = (t) => smooth(prog(t, 100.85, 101.0)) * (1 - smooth(prog(t, 107.25, 107.45)));
const clear = (t) => easeInOut(prog(t, 102.6, 106.8));       // 雾慢慢散开
const Q3_LINES = [['除了最坏，', 101.0, 101.4, 450], ['还有没有别的可能？', 101.4, 102.0, 600]];
const q3 = {
  ...Q3,
  draw(ctx, t) {
    ctx.save();
    ctx.globalAlpha *= q3Fade(t);
    // 窗外：夜里的城市
    const g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, '#141b26'); g.addColorStop(1, '#262c36');
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = '#0e1218';
    for (let i = 0; i < 9; i++) ctx.fillRect(i * 230 - 40, 380 + (i % 3) * 70, 190, 800);
    ctx.restore();
  },
  drawOver(ctx, t) {
    const a = q3Fade(t), cl = clear(t);
    ctx.save();
    ctx.globalAlpha *= a;
    const push = 1 + 0.03 * prog(t, 100.9, 107.4);
    ctx.translate(W / 2, H / 2); ctx.scale(push, push); ctx.translate(-W / 2, -H / 2);
    for (const p of FOG) { ctx.fillStyle = p.w ? `rgba(255,204,140,${p.a * lerp(0.8, 1, cl)})` : `rgba(186,202,230,${p.a * 0.8})`; ctx.beginPath(); ctx.arc(p.x * W, 420 + p.y * 600, p.s * lerp(1, 1.3, cl), 0, Math.PI * 2); ctx.fill(); }
    // 起雾的玻璃：一层灰白的雾（单独一层），字的地方被手指擦开；之后雾整体变薄
    const fx = FOGL.getContext('2d');
    fx.setTransform(1, 0, 0, 1, 0, 0);
    fx.globalCompositeOperation = 'source-over';
    fx.clearRect(0, 0, W, H);
    fx.fillStyle = `rgba(200,208,218,${lerp(0.7, 0.2, cl)})`;
    fx.fillRect(0, 0, W, H);
    fx.globalCompositeOperation = 'destination-out';
    for (const [l, t0, t1, y] of Q3_LINES) written(fx, l, W / 2, y, FONT.hand(118), 'rgba(0,0,0,0.95)', prog(t, t0, t1), 'center');
    ctx.drawImage(FOGL, 0, 0);
    // 字迹边缘的水汽：一道很细的亮边（雾散开以后也跟着淡）
    ctx.save(); ctx.translate(-2, -2); ctx.globalAlpha *= lerp(1, 0.3, cl);
    for (const [l, t0, t1, y] of Q3_LINES) written(ctx, l, W / 2, y, FONT.hand(118), 'rgba(236,242,248,0.4)', prog(t, t0, t1), 'center');
    ctx.restore();
    // 窗框
    ctx.fillStyle = '#2a2e33';
    ctx.fillRect(-40, -40, W + 80, 90); ctx.fillRect(-40, H - 60, W + 80, 100); ctx.fillRect(W / 2 - 14 + 620, -40, 28, H + 80);
    ctx.restore();
  },
  light: (t) => [{ x: W / 2, y: 520, rx: 1200, ry: 700, i: lerp(0.6, 0.75, clear(t)), w: q3Fade(t), color: [180, 196, 226], core: 0.3 }],
  grade: (t) => ({ warm: -0.35, ambient: lerp(0.14, 0.16, clear(t)) }),
};

// ---------------- 「最坏的未来」：每个问题少一层 ----------------
const LAYERS = [
  [['失败', 210, 230], ['结束', 1720, 820]],
  [['拒绝', 1640, 210], ['来不及', 280, 800]],
  [['一个人', 140, 520], ['失去', 1660, 520]],
];
const worst = {
  start: 96.4, end: 104.0,
  draw: () => {},
  drawOver(ctx, t) {
    const base = smooth(prog(t, 96.4, 96.7)) * (1 - smooth(prog(t, 103.4, 104.0)));
    LAYERS.forEach((layer, i) => {
      const a = base * (1 - smooth(prog(t, Q_DONE[i], Q_DONE[i] + 0.5)));
      if (a <= 0.01) return;
      const g = ctx.createRadialGradient(W / 2, H / 2, H * 0.3, W / 2, H / 2, H * 1.0);
      g.addColorStop(0, 'rgba(6,5,4,0)'); g.addColorStop(1, `rgba(6,5,4,${0.2 * a})`);
      ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
      ctx.save();
      ctx.filter = 'blur(2px)';
      ctx.font = FONT.hand(64);
      ctx.textAlign = 'center';
      for (const [w, x, y] of layer) {
        ctx.globalAlpha = a * 0.24;
        ctx.fillStyle = '#d8cebe';
        ctx.fillText(w, x + noise1(t * 0.3, x) * 16, y + noise1(t * 0.3, y) * 10);
      }
      ctx.restore();
    });
  },
};

module.exports = { q1, q2, q3, worst, Q_DONE, written };
