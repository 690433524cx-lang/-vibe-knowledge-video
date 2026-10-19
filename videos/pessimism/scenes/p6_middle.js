// 中段（最终精修版）· 27.85–43.35 秒
//   crowd   27.85–33.95  独立情绪节点：聚会里，周围的人还在笑、还在碰杯（慢一点的动作）；他先跟着笑，
//                        29.6 起短暂地安静下来；30.6 起周围的声音降下去，镜头极慢地推近。
//                        「有些人不是不快乐。」「是不敢快乐太久。」——没有任何复杂动画。
//   ahead   33.8–37.85   列车上：旅行第一天，窗外的灯一阵阵扫过，手机亮起 DAY 1（快乐还在）；
//                        35.2 起画面安静下来：声音变弱、动作变慢、四周暗下去；35.9 才浮出「提前难过」——情绪的总结，不是标题。
//   montage 37.75–43.35  倒着回闪（面试门口 → 没有回复 → 返程票 → 空了的年夜饭），
//                        停在第一幕他想象出来的那个空房间上：悲观不是等坏事发生。它会提前活一遍。
const { W, H } = require('../../../src/config');
const { FONT } = require('../../../src/lib/style');
const { prog, smooth, lerp, noise1, easeInOut } = require('../../../src/lib/util');
const { withCam, toScreen } = require('../lib');
const party = require('./p1_party');
const train = require('./p3_train');

// ================= 不敢快乐太久 =================
const CROWD = { start: 27.85, end: 33.95 };
const crowdCam = (t) => { const k = easeInOut(prog(t, 28.0, 33.9)); return { cx: lerp(1240, 1320, k), cy: lerp(500, 478, k), s: lerp(1.36, 1.55, k) }; };
const oldT = (t) => 0.55 + (t - 27.85) * 0.55;       // 周围的人：第一幕热闹那几秒，略慢
const heroT = (t) => lerp(0.9, 4.7, easeInOut(prog(t, 29.6, 31.4)));   // 他先跟着笑，然后安静下来
const hush = (t) => smooth(prog(t, 30.6, 31.8));     // 周围的声音降下去（人还在笑，只是听不清了）
const cfade = (t) => smooth(prog(t, 27.85, 28.0)) * (1 - smooth(prog(t, 33.8, 33.95)));
function crowdDraw(ctx, t) {
  ctx.save();
  ctx.globalAlpha *= cfade(t);
  withCam(ctx, crowdCam(t), 1, () => party.drawRoom(ctx, oldT(t), { heroT: heroT(t), castBlur: hush(t) * 3, exclude: ['snack'] }));
  ctx.restore();
}
function crowdOver(ctx, t) {
  const c = crowdCam(t);
  ctx.save();
  ctx.globalAlpha *= cfade(t);
  withCam(ctx, c, 1, () => { party.lampGlow(ctx, oldT(t)); party.stringGlow(ctx, oldT(t)); });
  const h = hush(t);
  if (h > 0) {
    const [hx, hy] = toScreen(c, party.HERO.x - 40, 520);
    const g = ctx.createRadialGradient(hx, hy, 220, hx, hy, 1000);
    g.addColorStop(0, 'rgba(8,6,5,0)'); g.addColorStop(1, `rgba(8,6,5,${0.38 * h})`);
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  }
  ctx.restore();
}
function crowdLight(t) {
  const c = crowdCam(t);
  const w = cfade(t);
  const h = hush(t);
  const sc = (x, y) => toScreen(c, x, y);
  const [hx, hy] = sc(party.HERO.x - 40, 470);
  const [lx, ly] = sc(party.LAMP.x + 60, 740);
  const [fx, fy] = sc(1060, 520);
  const [ax, ay] = sc(1680, 520);
  const [tx, ty] = sc(720, 480);
  return [
    { x: hx, y: hy, rx: 360 * c.s, ry: 420 * c.s, i: 0.85, w, color: [255, 206, 150], core: 0.25 },
    { x: lx, y: ly, rx: 700 * c.s, ry: 380 * c.s, i: lerp(0.95, 0.65, h), w, color: [255, 200, 140] },
    { x: fx, y: fy, rx: 300 * c.s, ry: 380 * c.s, i: lerp(0.75, 0.45, h), w, color: [255, 200, 140] },
    { x: ax, y: ay, rx: 300 * c.s, ry: 380 * c.s, i: lerp(0.7, 0.42, h), w, color: [255, 200, 140] },
    { x: tx, y: ty, rx: 360 * c.s, ry: 420 * c.s, i: lerp(0.7, 0.4, h), w, color: [255, 200, 140] },
    { x: W / 2, y: 250, rx: 1300, ry: 300, i: lerp(0.5, 0.3, h), w, color: [255, 196, 130] },
  ];
}
const crowd = { ...CROWD, draw: crowdDraw, drawOver: crowdOver, light: crowdLight, grade: (t) => ({ warm: lerp(0.5, 0.36, hush(t)), ambient: lerp(0.15, 0.12, hush(t)) }) };

// ================= 列车上的提前难过 =================
// 直接调用第三幕的列车（旧时间）：33.8→16.95 正常速度（DAY 1 在 34.6 左右亮起），35.0 以后越来越慢
const AHEAD = { start: 33.8, end: 37.85 };
const aOld = (t) => (t < 35.0 ? 16.95 + (t - 33.8) * (1.0 / 1.2) : 17.95 + (1 - Math.exp(-(t - 35.0) / 1.6)) * 0.85);
const quiet = (t) => smooth(prog(t, 35.2, 36.2));
const afade = (t) => smooth(prog(t, 33.8, 33.95)) * (1 - smooth(prog(t, 37.6, 37.85)));
const ahead = {
  ...AHEAD,
  draw(ctx, t) { ctx.save(); ctx.globalAlpha *= afade(t); train.draw(ctx, aOld(t), {}); ctx.restore(); },
  drawOver(ctx, t) {
    ctx.save();
    ctx.globalAlpha *= afade(t);
    train.drawOver(ctx, aOld(t), {});
    // 四周暗下去，只剩他
    const q = quiet(t);
    if (q > 0) {
      const [hx, hy] = toScreen(train.cam(aOld(t)), 1450, 470);
      const g = ctx.createRadialGradient(hx, hy, 200, hx, hy, 1100);
      g.addColorStop(0, 'rgba(8,6,5,0)'); g.addColorStop(1, `rgba(8,6,5,${0.5 * q})`);
      ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    }
    // 提前难过：像投影一样，从虚到实（画面里的锚词）
    const a = smooth(prog(t, 35.9, 36.4));
    if (a > 0) {
      const focus = 1 - smooth(prog(t, 35.9, 36.9));
      ctx.globalAlpha = afade(t) * a * (0.96 + 0.04 * noise1(t * 6, 61));
      ctx.font = FONT.brush(150);
      ctx.letterSpacing = '24px';
      ctx.textAlign = 'center';
      ctx.filter = `blur(${(10 + focus * 12).toFixed(1)}px)`;
      ctx.fillStyle = 'rgba(190,70,50,0.45)';
      ctx.fillText('提前难过', W / 2 - 120, 330);
      ctx.filter = `blur(${(focus * 8).toFixed(1)}px)`;
      ctx.fillStyle = '#b23d2e';
      ctx.fillText('提前难过', W / 2 - 120, 330);
      ctx.filter = 'none';
    }
    ctx.restore();
  },
  light(t) {
    const q = quiet(t);
    return train.light(aOld(t)).map((l, i) => ({ ...l, i: l.i * (i === 1 ? 1 : lerp(1, 0.6, q)), w: l.w * afade(t) }));
  },
  grade: (t) => ({ ...train.grade(aOld(t)), w: afade(t) }),
};

// ================= 倒着回闪 =================
// 直接调用各幕原始场景（旧时间轴）在某一刻的画面和灯光
const MSHOTS = (() => {
  const src = [[require('./p5_interview'), 37.2], [require('./p4_message'), 31.6], [require('./p3_train'), 24.35], [require('./p2_newyear'), 15.2]];
  let t0 = 37.75;
  const out = src.map(([scene, at]) => { const s = { scene, at, t0, t1: t0 + 0.44, rate: 0.6 }; t0 += 0.44; return s; });
  // 最后停在第一幕他想象出来的空房间（旧时间 5.6 → 6.8，非常慢）
  out.push({ scene: party, at: 5.6, t0, t1: 43.35, rate: (6.8 - 5.6) / (43.35 - t0) });
  return out;
})();
const shotAt = (t) => MSHOTS.find((s) => t >= s.t0 && t < s.t1);
const mt = (s, t) => s.at + (t - s.t0) * s.rate;
const montage = {
  start: 37.75, end: 43.35,
  draw(ctx, t) { const s = shotAt(t); if (s) s.scene.draw(ctx, mt(s, t), {}); },
  drawOver(ctx, t) {
    const s = shotAt(t);
    if (!s) return;
    if (s.scene.drawOver) s.scene.drawOver(ctx, mt(s, t), {});
    if (t - s.t0 < 1 / 30) { ctx.fillStyle = 'rgba(0,0,0,0.5)'; ctx.fillRect(0, 0, W, H); }   // 切换时一帧暗闪
    const out = smooth(prog(t, 43.05, 43.35));
    if (out > 0) { ctx.fillStyle = `rgba(8,6,5,${out})`; ctx.fillRect(0, 0, W, H); }
  },
  light(t) { const s = shotAt(t); return s ? s.scene.light(mt(s, t)) : []; },
  grade(t) { const s = shotAt(t); return s ? s.scene.grade(mt(s, t)) : { warm: 0, ambient: 0.1 }; },
};

module.exports = { crowd, ahead, montage };
