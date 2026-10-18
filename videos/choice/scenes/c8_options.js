// 第八幕 · 68.2–74.6：「你」和五个选项。每多一个选项，就多一条从你连出去的线——放弃线。
// 你选了 A：A 亮起来；B–E 暗下去，却留成影子；影子旁一句句浮现「B 会不会更好？」……
// 第九幕 · 74.4–81.6：没选的那些线一直往前长，分叉成一条条平行的人生——后悔版本越来越多。
// T2（你是在逃避选错）：所有没选的路一下子熄灭，只剩 A 那一条。
const { W, H } = require('../../../src/config');
const { C, FONT } = require('../../../src/lib/style');
const { pencil } = require('../../../src/lib/draw');
const { prog, smooth, easeInOut, lerp, rng, noise1 } = require('../../../src/lib/util');
const { spring } = require('../../../src/lib/motion');
const { inkText } = require('../../../src/lib/material');

const T2 = 79.8; // 第二个小重拍（弱于 MAIN_BEAT_T），之后可单独对齐
const S = { start: 68.0, end: 82.2 };

const YOU = [430, 560];
const OPTS = [
  { k: 'A', x: 1250, y: 300, at: 68.5 },
  { k: 'B', x: 1470, y: 430, at: 68.95, q: 'B 会不会更好？', qa: 72.9 },
  { k: 'C', x: 1320, y: 575, at: 69.4, q: 'C 是不是更值？', qa: 73.5 },
  { k: 'D', x: 1530, y: 705, at: 69.85, q: 'D 是不是更适合我？', qa: 74.1 },
  { k: 'E', x: 1280, y: 830, at: 70.3 },
];
const CHOOSE = 71.4;

// 第九幕：每个没选的选项往右长出几条分叉的路
const ROUTES = (() => {
  const r = rng(1800);
  const out = [];
  OPTS.slice(1).forEach((o, oi) => {
    const n = 3 + Math.floor(r() * 3);
    for (let j = 0; j < n; j++) {
      const pts = [[o.x + 40, o.y]];
      let x = o.x + 40, y = o.y;
      const dy = (j - (n - 1) / 2) * (40 + r() * 30) + (r() - 0.5) * 30;
      while (x < W + 900) {
        x += 70 + r() * 50;
        y += dy * 0.18 + (r() - 0.5) * 18;
        pts.push([x, y]);
      }
      out.push({ pts, at: 74.6 + oi * 0.35 + j * 0.28 + r() * 0.3, label: r() < 0.55, li: 4 + Math.floor(r() * 3) });
    }
  });
  // 再往外：更多更细的分叉（视觉上越来越满）
  for (let i = 0; i < 18; i++) {
    const base = out[Math.floor(r() * out.length)];
    const s = 3 + Math.floor(r() * 4);
    const p0 = base.pts[Math.min(base.pts.length - 1, s)];
    const pts = [p0];
    let x = p0[0], y = p0[1];
    const dy = (r() - 0.5) * 120;
    while (x < W + 900) { x += 60 + r() * 50; y += dy * 0.25 + (r() - 0.5) * 22; pts.push([x, y]); }
    out.push({ pts, at: 76.6 + r() * 2.6, label: r() < 0.3, li: 3, thin: true });
  }
  return out;
})();
const A_ROUTE = (() => {
  const pts = [[OPTS[0].x + 40, OPTS[0].y]];
  for (let x = OPTS[0].x + 40, y = OPTS[0].y; x < W + 900; ) { x += 90; y -= 6; pts.push([x, y]); }
  return pts;
})();

function cam(t) {
  const k = easeInOut(prog(t, 74.6, 79.0));
  return { s: lerp(1, 0.8, k), cx: lerp(960, 1060, k), cy: 540 };
}

function draw(ctx, t) {
  const c = cam(t);
  const out = 1 - smooth(prog(t, 81.4, 82.2));
  const chosen = smooth(prog(t, CHOOSE, CHOOSE + 0.5));
  const off = t >= T2 ? 1 - smooth(prog(t, T2, T2 + 0.18)) : 1; // T2：没选的路一下子熄灭
  ctx.save();
  ctx.globalAlpha *= out;
  ctx.translate(W / 2, H / 2);
  ctx.scale(c.s, c.s);
  ctx.translate(-c.cx, -c.cy);
  // 第九幕：平行的后悔版本
  ROUTES.forEach((ro, i) => {
    const p = prog(t, ro.at, ro.at + 1.6);
    if (p <= 0 || off <= 0) return;
    const flick = 1 + 0.12 * noise1(t * 3 + i, 1810 + i);
    pencil(ctx, ro.pts, { seed: 1820 + i, t, width: ro.thin ? 1 : 1.5, color: `rgba(200,184,156,${(ro.thin ? 0.22 : 0.34) * flick})`, progress: p, passes: 1, alpha: off, pressure: 0.4 });
    if (ro.label && p > 0.5) {
      const q = ro.pts[Math.min(ro.pts.length - 1, ro.li)];
      inkText(ctx, '如果当初……', q[0] + 10, q[1] - 10, { font: FONT.body(20), color: '#9d917c', seed: 1830 + i, wear: 0.1, spacing: 2, alpha: off * smooth(prog(t, ro.at + 0.8, ro.at + 1.2)) * 0.8 });
    }
  });
  // A 那一条路（选了以后一直亮着）
  const ap = prog(t, 74.9, 76.4);
  if (ap > 0) pencil(ctx, A_ROUTE, { seed: 1840, t, width: 2.6, color: 'rgba(255,214,160,0.85)', progress: ap, passes: 1, pressure: 0.5 });
  // 放弃线 + 选项
  OPTS.forEach((o, i) => {
    const k = spring(t, o.at, 2.4, 0.8);
    if (k <= 0) return;
    const isA = i === 0;
    const lineA = isA ? 1 : lerp(1, 0.35, chosen) * (t > 74.4 ? off * 0.6 + 0.4 * (1 - smooth(prog(t, T2, T2 + 0.18))) : 1);
    ctx.save();
    if (!isA && chosen > 0) ctx.setLineDash([6, 9]);
    pencil(ctx, [YOU, [o.x - 40, o.y + 6]], {
      seed: 1850 + i, t, width: isA ? lerp(1.6, 2.8, chosen) : 1.5,
      color: isA ? `rgba(${Math.round(lerp(214, 255, chosen))},${Math.round(lerp(198, 214, chosen))},${Math.round(lerp(172, 160, chosen))},0.85)` : 'rgba(214,198,172,0.6)',
      progress: prog(t, o.at, o.at + 0.35), alpha: lineA, passes: 1, boil: chosen < 1, pressure: 0.4,
    });
    ctx.restore();
    const la = isA ? 1 : lerp(1, 0.28, chosen) * (t >= T2 ? 0.5 + 0.5 * off : 1);
    ctx.save();
    ctx.globalAlpha *= Math.min(1, k) * la;
    ctx.font = FONT.en(78);
    ctx.textAlign = 'center';
    ctx.fillStyle = isA ? `rgb(${Math.round(lerp(226, 255, chosen))},${Math.round(lerp(214, 226, chosen))},${Math.round(lerp(192, 190, chosen))})` : '#e2d6c0';
    if (isA && chosen > 0) { ctx.shadowColor = `rgba(255,200,130,${0.6 * chosen})`; ctx.shadowBlur = 24; }
    ctx.fillText(o.k, o.x, o.y + 26);
    ctx.restore();
    // 影子旁的念头
    if (o.q) {
      const qa = smooth(prog(t, o.qa, o.qa + 0.5)) * (1 - smooth(prog(t, 74.8, 75.6)));
      if (qa > 0) {
        ctx.save();
        ctx.font = FONT.hand(42);
        const w = ctx.measureText(o.q).width;
        ctx.beginPath(); ctx.rect(o.x - 70 - w - 6, o.y - 60, (w + 12) * Math.min(1, prog(t, o.qa, o.qa + 0.7) * 1.3), 100); ctx.clip();
        ctx.globalAlpha *= qa;
        ctx.fillStyle = '#c9bca4';
        ctx.fillText(o.q, o.x - 70 - w, o.y + 14);
        ctx.restore();
      }
    }
  });
  // 你
  const ya = smooth(prog(t, 68.1, 68.5));
  ctx.save();
  ctx.globalAlpha *= ya;
  ctx.fillStyle = '#efe4cf';
  ctx.shadowColor = 'rgba(255,214,160,0.6)';
  ctx.shadowBlur = 16;
  ctx.beginPath(); ctx.arc(YOU[0], YOU[1], 8, 0, Math.PI * 2); ctx.fill();
  ctx.shadowBlur = 0;
  ctx.font = FONT.body(32);
  ctx.letterSpacing = '4px';
  ctx.textAlign = 'center';
  ctx.fillText('你', YOU[0], YOU[1] + 62);
  ctx.restore();
  ctx.restore();
}

function light(t) {
  const c = cam(t);
  const out = 1 - smooth(prog(t, 81.4, 82.2));
  const toS = (x, y) => [W / 2 + (x - c.cx) * c.s, H / 2 + (y - c.cy) * c.s];
  const [yx, yy] = toS(YOU[0], YOU[1]);
  const [ax, ay] = toS(OPTS[0].x, OPTS[0].y);
  const chosen = smooth(prog(t, CHOOSE, CHOOSE + 0.5));
  const web = smooth(prog(t, 74.6, 76.5)) * (t >= T2 ? 1 - smooth(prog(t, T2, T2 + 0.3)) * 0.7 : 1);
  return [
    { x: yx, y: yy, rx: 460, ry: 380, i: 0.75, w: out * smooth(prog(t, 68.0, 68.6)) },
    { x: 1400, y: 560, rx: 640, ry: 520, i: 0.6, w: out * smooth(prog(t, 68.6, 69.6)) * (1 - chosen * 0.5) },
    { x: ax, y: ay, rx: 380, ry: 300, i: 0.85, w: out * chosen },
    { x: 1500, y: 560, rx: 1100, ry: 600, i: 0.55, w: out * web },
  ];
}
function grade(t) { return { warm: lerp(-0.15, 0.1, smooth(prog(t, T2, T2 + 1))), ambient: 0.1 }; }

module.exports = { ...S, draw, light, grade, T2 };
