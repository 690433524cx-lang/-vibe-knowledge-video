// 方法 · 97.3–103.9 秒：三个问题不写成一张学习笔记，而是一条一条出现在真实的物体上。
//   97.3  纸：台灯下的一张纸，手写「最坏会发生什么？」
//   99.0  窗：起雾的玻璃上，像用手指写出来——「它真的一定会发生吗？」字迹里透出窗外的城市
//   100.6 手机：备忘录里打出——「如果发生了，我能做什么？」
//   102.2 地图：「除了最坏，还有没有别的可能？」（在 scenes/p16_routes.js 里，写在地图边上）
// 贯穿这四个镜头的「最坏的未来」：画面四周很淡的几层词和暗（失败 / 拒绝 / 结束 / 来不及……），
// 每出现一个问题，就少一层，画面也亮一点。
const { W, H } = require('../../../src/config');
const { FONT } = require('../../../src/lib/style');
const { prog, smooth, lerp, rng, noise1 } = require('../../../src/lib/util');
const { sheet } = require('../../../src/lib/material');
const { phoneShell, roundRect } = require('../phone');

const Q_DONE = [98.4, 100.0, 101.6, 103.2];       // 每个问题写完的时刻（第四个在地图上）

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

// ---------------- 纸 ----------------
const paper = {
  start: 97.25, end: 99.15,
  draw(ctx, t) {
    const a = smooth(prog(t, 97.3, 97.55)) * (1 - smooth(prog(t, 98.85, 99.15)));
    ctx.save();
    ctx.globalAlpha *= a;
    ctx.fillStyle = '#251c15'; ctx.fillRect(0, 0, W, H);
    ctx.strokeStyle = 'rgba(0,0,0,0.14)'; ctx.lineWidth = 3;
    for (let i = 0; i < 30; i++) { const y = i * 40; ctx.beginPath(); ctx.moveTo(0, y); ctx.bezierCurveTo(600, y + 10, 1300, y - 8, W, y + 6); ctx.stroke(); }
    const push = 1 + 0.03 * prog(t, 97.3, 99.1);
    ctx.translate(W / 2, H / 2); ctx.scale(push, push); ctx.translate(-W / 2, -H / 2);
    ctx.save(); ctx.translate(980, 600); ctx.rotate(-0.03);
    sheet(ctx, 1120, 760, { seed: 1501, tone: 'bone', light: -2.3, lift: 0.1, shade: 0.45 });
    ctx.restore();
    // 一支铅笔放在纸边
    ctx.save(); ctx.translate(1500, 820); ctx.rotate(-0.5);
    ctx.fillStyle = '#c9a24a'; ctx.fillRect(-160, -9, 300, 18);
    ctx.fillStyle = '#dcc49a'; ctx.beginPath(); ctx.moveTo(140, -9); ctx.lineTo(186, 0); ctx.lineTo(140, 9); ctx.closePath(); ctx.fill();
    ctx.restore();
    written(ctx, '最坏会发生什么？', 980, 560, FONT.hand(118), 'rgba(40,32,28,0.95)', prog(t, 97.5, 98.4), 'center');
    ctx.restore();
  },
  light: (t) => [{ x: 960, y: 520, rx: 900, ry: 600, i: 0.95, w: smooth(prog(t, 97.3, 97.55)) * (1 - smooth(prog(t, 98.85, 99.15))), color: [255, 214, 166], core: 0.3 }],
  grade: () => ({ warm: 0.28, ambient: 0.09 }),
};

// ---------------- 窗 ----------------
const { createCanvas } = require('@napi-rs/canvas');
const FOGL = createCanvas(W, H);
const FOG = (() => { const r = rng(1502); return Array.from({ length: 70 }, () => ({ x: r(), y: r(), s: 0.8 + r() * 2.2, w: r() < 0.6, a: 0.25 + r() * 0.5 })); })();
const windowShot = {
  start: 98.85, end: 100.75,
  draw(ctx, t) {
    const a = smooth(prog(t, 98.9, 99.15)) * (1 - smooth(prog(t, 100.45, 100.75)));
    ctx.save();
    ctx.globalAlpha *= a;
    // 窗外：夜里的城市
    const g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, '#141b26'); g.addColorStop(1, '#262c36');
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = '#0e1218';
    for (let i = 0; i < 9; i++) ctx.fillRect(i * 230 - 40, 380 + (i % 3) * 70, 190, 800);
    ctx.restore();
  },
  drawOver(ctx, t) {
    const a = smooth(prog(t, 98.9, 99.15)) * (1 - smooth(prog(t, 100.45, 100.75)));
    ctx.save();
    ctx.globalAlpha *= a;
    for (const p of FOG) { ctx.fillStyle = p.w ? `rgba(255,204,140,${p.a})` : `rgba(186,202,230,${p.a * 0.8})`; ctx.beginPath(); ctx.arc(p.x * W, 420 + p.y * 600, p.s, 0, Math.PI * 2); ctx.fill(); }
    // 起雾的玻璃：一层灰白的雾（单独一层），字的地方被手指擦开，透出后面的城市
    const fx = FOGL.getContext('2d');
    fx.setTransform(1, 0, 0, 1, 0, 0);
    fx.globalCompositeOperation = 'source-over';
    fx.clearRect(0, 0, W, H);
    fx.fillStyle = 'rgba(196,204,214,0.52)';
    fx.fillRect(0, 0, W, H);
    fx.globalCompositeOperation = 'destination-out';
    written(fx, '它真的一定会发生吗？', W / 2, 560, FONT.hand(118), 'rgba(0,0,0,0.95)', prog(t, 99.2, 100.0), 'center');
    ctx.drawImage(FOGL, 0, 0);
    // 字迹边缘的水汽：一道很细的亮边
    ctx.save(); ctx.translate(-2, -2);
    written(ctx, '它真的一定会发生吗？', W / 2, 560, FONT.hand(118), 'rgba(236,242,248,0.4)', prog(t, 99.2, 100.0), 'center');
    ctx.restore();
    ctx.globalCompositeOperation = 'destination-out';
    ctx.globalCompositeOperation = 'source-over';
    // 窗框
    ctx.fillStyle = '#2a2e33';
    ctx.fillRect(0, 0, W, 50); ctx.fillRect(0, H - 60, W, 60); ctx.fillRect(W / 2 - 14 + 620, 0, 28, H);
    ctx.restore();
  },
  light: (t) => [{ x: W / 2, y: 520, rx: 1200, ry: 700, i: 0.6, w: smooth(prog(t, 98.9, 99.15)) * (1 - smooth(prog(t, 100.45, 100.75))), color: [180, 196, 226], core: 0.3 }],
  grade: () => ({ warm: -0.35, ambient: 0.14 }),
};

// ---------------- 手机 ----------------
const phoneShot = {
  start: 100.45, end: 102.45,
  draw(ctx, t) {
    const a = smooth(prog(t, 100.5, 100.75)) * (1 - smooth(prog(t, 102.15, 102.45)));
    ctx.save();
    ctx.globalAlpha *= a;
    phoneShell(ctx, { bg: 'bed', push: 1 + 0.02 * prog(t, 100.5, 102.4) }, (x, sw, sh) => {
      x.fillStyle = '#e8e2d4';
      x.fillRect(-sw / 2, -sh / 2, sw, sh);
      x.fillStyle = '#2a2420';
      x.font = FONT.body(30); x.fillText('备忘录', -sw / 2 + 44, -sh / 2 + 92);
      x.fillStyle = 'rgba(42,36,32,0.12)'; x.fillRect(-sw / 2, -sh / 2 + 124, sw, 1);
      const str = '如果发生了，\n我能做什么？';
      const k = prog(t, 100.8, 101.6);
      const shown = [...str].slice(0, Math.ceil(k * str.length)).join('');
      x.fillStyle = '#2a2420';
      x.font = FONT.body(46);
      shown.split('\n').forEach((l, i) => x.fillText(l, -sw / 2 + 44, -sh / 2 + 230 + i * 70));
      const lines = shown.split('\n');
      if (Math.floor(t * 2.4) % 2 === 0) { x.fillStyle = '#c9732a'; x.fillRect(-sw / 2 + 44 + x.measureText(lines[lines.length - 1]).width + 4, -sh / 2 + 192 + (lines.length - 1) * 70, 3, 50); }
    });
    ctx.restore();
  },
  light: (t) => [{ x: 1080, y: 540, rx: 720, ry: 780, i: 0.95, w: smooth(prog(t, 100.5, 100.75)) * (1 - smooth(prog(t, 102.15, 102.45))), color: [236, 228, 214], core: 0.35 }],
  grade: () => ({ warm: 0.05, ambient: 0.1 }),
};

// ---------------- 「最坏的未来」：每个问题少一层 ----------------
const LAYERS = [
  [['失败', 210, 230], ['结束', 1720, 860]],
  [['拒绝', 1640, 210], ['来不及', 280, 880]],
  [['一个人', 120, 560], ['不会成功', 1600, 540]],
  [['失去', 960, 140], ['被讨厌', 980, 1000]],
];
const worst = {
  start: 97.3, end: 103.9,
  draw: () => {},
  drawOver(ctx, t) {
    const base = smooth(prog(t, 97.3, 97.6)) * (1 - smooth(prog(t, 103.5, 103.9)));
    LAYERS.forEach((layer, i) => {
      const left = 1 - smooth(prog(t, Q_DONE[i], Q_DONE[i] + 0.5));
      const a = base * left;
      if (a <= 0.01) return;
      // 一层暗
      const g = ctx.createRadialGradient(W / 2, H / 2, H * 0.3, W / 2, H / 2, H * 1.0);
      g.addColorStop(0, 'rgba(6,5,4,0)'); g.addColorStop(1, `rgba(6,5,4,${0.2 * a})`);
      ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
      // 一层词
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

module.exports = { paper, windowShot, phoneShot, worst, Q_DONE, written };
