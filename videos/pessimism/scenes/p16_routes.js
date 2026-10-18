// 真正有用的悲观 · 102.7–108.4 秒：回到地图。
//   危险路线仍然标着（圈出来的风险、断掉的桥、一个红叉）；但这一次，铅笔同时画出了
//   正常路线（石墨）、备用路线（蓝灰）、返回路线（灰绿虚线）。——我知道最坏会是什么，所以我知道该准备什么。
const { W, H } = require('../../../src/config');
const { FONT } = require('../../../src/lib/style');
const { prog, smooth, lerp, easeInOut } = require('../../../src/lib/util');
const { pencil } = require('../../../src/lib/draw');
const { withCam, toScreen } = require('../lib');
const map = require('./p7_map');

const S = { start: 102.6, end: 108.5 };
const BACKUP = [map.START, [-760, 600], [-380, 680], [-110, 660], [300, 600], [700, 320], [900, -90], map.DEST];
const RETURN = map.ROUTE_B.slice().reverse().map(([x, y]) => [x + 34, y + 40]);
const ROUTES = [
  { pts: map.ROUTE_B, t0: 103.9, t1: 104.7, col: 'rgba(40,34,30,0.92)', w: 5, label: '正常', at: [-860, -260] },
  { pts: BACKUP, t0: 104.8, t1: 105.8, col: 'rgba(66,92,118,0.92)', w: 5, label: '备用', at: [-420, 760] },
  { pts: RETURN, t0: 106.0, t1: 107.0, col: 'rgba(70,100,72,0.9)', w: 4.5, label: '返回', at: [300, -640], dash: true },
];

function cam(t) { const k = easeInOut(prog(t, 102.7, 108.4)); return { cx: 960, cy: 545, s: lerp(0.64, 0.6, k) }; }

function penAt(t) {
  for (const r of ROUTES) if (t >= r.t0 - 0.25 && t <= r.t1 + 0.1) return map.along(r.pts, prog(t, r.t0, r.t1));
  if (t < 103.6) return [-150 + 40, 70 + 40];
  return map.along(RETURN, 1);
}

function draw(ctx, t) {
  const c = cam(t);
  ctx.save();
  ctx.globalAlpha *= smooth(prog(t, 102.65, 103.1)) * (1 - smooth(prog(t, 108.0, 108.45)));
  ctx.fillStyle = '#2a2018';
  ctx.fillRect(0, 0, W, H);
  withCam(ctx, c, 1, () => {
    ctx.save();
    ctx.translate(map.ORIGIN[0], map.ORIGIN[1]);
    ctx.rotate(map.MAP.rot);
    ctx.save();
    ctx.shadowColor = 'rgba(0,0,0,0.6)'; ctx.shadowBlur = 50; ctx.shadowOffsetX = 24; ctx.shadowOffsetY = 30;
    ctx.fillStyle = '#d6c9ab'; ctx.fillRect(-map.MAP.w / 2, -map.MAP.h / 2, map.MAP.w, map.MAP.h);
    ctx.restore();
    ctx.drawImage(map.BASE.canvas, -map.MAP.w / 2 - map.BASE.pad, -map.MAP.h / 2 - map.BASE.pad);
    // 之前的痕迹：圈出来的风险、绕行的虚线、断掉的桥
    map.marks(ctx, 58.9);
    // 危险路线：一个红叉 +「危险」
    const xk = prog(t, 103.0, 103.35);
    const B = map.BRIDGE;
    pencil(ctx, [[B[0] - 60, B[1] - 50], [B[0] + 60, B[1] + 50]], { t, seed: 1601, width: 6, color: 'rgba(170,40,30,0.9)', progress: Math.min(1, xk * 2), pressure: 0.7 });
    pencil(ctx, [[B[0] + 60, B[1] - 50], [B[0] - 60, B[1] + 50]], { t, seed: 1602, width: 6, color: 'rgba(170,40,30,0.9)', progress: Math.max(0, xk * 2 - 1), pressure: 0.7 });
    if (xk > 0.5) { ctx.font = FONT.hand(58); ctx.fillStyle = `rgba(160,40,30,${smooth(prog(t, 103.2, 103.5))})`; ctx.fillText('危险', B[0] + 80, B[1] + 110); }
    // 三条新路线
    for (const r of ROUTES) {
      const k = prog(t, r.t0, r.t1);
      if (k <= 0) continue;
      ctx.save();
      if (r.dash) ctx.setLineDash([24, 16]);
      pencil(ctx, r.pts, { t, seed: 1610 + r.t0, width: r.w, color: r.col, progress: k, pressure: 0.35 });
      ctx.restore();
      const la = smooth(prog(t, r.t1 - 0.2, r.t1 + 0.2));
      if (la > 0) { ctx.font = FONT.hand(64); ctx.fillStyle = r.col.replace(/[\d.]+\)$/, `${0.95 * la})`); ctx.fillText(r.label, r.at[0], r.at[1]); }
    }
    ctx.restore();
    const p = penAt(t);
    map.hand(ctx, map.M(p), t, smooth(prog(t, 103.4, 103.8)) * (1 - smooth(prog(t, 107.2, 107.8))));
  });
  ctx.restore();
}

function light(t) {
  const w = smooth(prog(t, 102.65, 103.1)) * (1 - smooth(prog(t, 108.0, 108.45)));
  return [
    { x: W * 0.45, y: H * 0.45, rx: 1300, ry: 820, i: 1, w, color: [255, 216, 168], core: 0.35, rot: -0.2 },
  ];
}
function grade() { return { warm: 0.3, ambient: 0.14 }; }

module.exports = { ...S, draw, light, grade };
