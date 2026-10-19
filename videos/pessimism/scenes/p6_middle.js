// 中段（留存优化版）· 28.6–46.8 秒
//   candle  28.6–35.6  核心句二的独立镜头：一小块蛋糕上的一根蜡烛，火苗还在烧，背后是虚掉的聚会灯串。
//                      「有些人不是不快乐。」「是不敢快乐太久。」——画面几乎不动，只有火苗和极慢的推近。
//   crowd   35.6–40.4  他明明还在人群里，周围的人还在笑（慢动作）。他短暂地安静下来，一动不动；
//                      37.0 起周围的声音降下去、人群虚掉、光收到他身上；38.2 墙上浮出「提前难过」——情绪的结果，不是标题。
//   montage 40.4–46.8  核心句三：倒着回闪（面试门口 → 没有回复 → 返程票 → 空了的年夜饭 → 散场的客厅），
//                      停在第一幕他想象出来的那个空房间上：悲观不是等坏事发生。它会提前活一遍。
const { W, H } = require('../../../src/config');
const { FONT } = require('../../../src/lib/style');
const { prog, smooth, lerp, rng, noise1, easeInOut } = require('../../../src/lib/util');
const { withCam, toScreen } = require('../lib');
const party = require('./p1_party');

// ================= 蜡烛 =================
const CANDLE = { start: 28.6, end: 35.75 };
const CK = { x: 1010, y: 690 };      // 蛋糕底部中心
function candleDraw(ctx, t) {
  const a = 1 - smooth(prog(t, 35.4, 35.75));
  const push = lerp(1, 1.07, easeInOut(prog(t, 28.6, 35.6)));
  ctx.save();
  ctx.globalAlpha *= a;
  ctx.fillStyle = '#1a1411';
  ctx.fillRect(0, 0, W, H);
  ctx.translate(W / 2, H / 2); ctx.scale(push, push); ctx.translate(-W / 2, -H / 2);
  // 桌面
  const g = ctx.createLinearGradient(0, 600, 0, H);
  g.addColorStop(0, '#2c2119'); g.addColorStop(1, '#3a2a1f');
  ctx.fillStyle = g;
  ctx.fillRect(-200, 640, W + 400, H);
  // 盘子
  ctx.fillStyle = 'rgba(0,0,0,0.4)';
  ctx.beginPath(); ctx.ellipse(CK.x + 16, CK.y + 30, 300, 62, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#d8d0c0';
  ctx.beginPath(); ctx.ellipse(CK.x, CK.y + 20, 290, 58, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#c6bdac';
  ctx.beginPath(); ctx.ellipse(CK.x, CK.y + 24, 210, 40, 0, 0, Math.PI * 2); ctx.fill();
  // 一块三角形的蛋糕：奶油、夹层、顶上的一颗草莓
  ctx.save();
  ctx.translate(CK.x, CK.y);
  ctx.fillStyle = '#efe4cf';
  ctx.beginPath(); ctx.moveTo(-170, 0); ctx.lineTo(150, 18); ctx.lineTo(150, -150); ctx.lineTo(-170, -170); ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#e0cfae';
  ctx.beginPath(); ctx.moveTo(150, 18); ctx.lineTo(230, -40); ctx.lineTo(230, -200); ctx.lineTo(150, -150); ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#f6eedd';
  ctx.beginPath(); ctx.moveTo(-170, -170); ctx.lineTo(150, -150); ctx.lineTo(230, -200); ctx.lineTo(-90, -222); ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#b4704e';
  ctx.fillRect(-170, -96, 320, 14);
  ctx.fillStyle = '#9b3b2c';
  ctx.beginPath(); ctx.ellipse(40, -200, 26, 18, 0.2, 0, Math.PI * 2); ctx.fill();
  // 蜡烛（细长、有一圈螺纹）
  ctx.fillStyle = '#d9c7a4';
  ctx.fillRect(-36, -360, 18, 150);
  ctx.strokeStyle = 'rgba(150,60,40,0.55)'; ctx.lineWidth = 3;
  for (let i = 0; i < 6; i++) { ctx.beginPath(); ctx.moveTo(-36, -350 + i * 24); ctx.lineTo(-18, -340 + i * 24); ctx.stroke(); }
  // 一滴往下流的蜡
  const drip = smooth(prog(t, 29.5, 35.4));
  ctx.fillStyle = '#e9dcc0';
  ctx.beginPath(); ctx.ellipse(-19, -340 + drip * 70, 4, 7 + drip * 10, 0, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = '#1a1411'; ctx.lineWidth = 2.5;
  ctx.beginPath(); ctx.moveTo(-27, -360); ctx.lineTo(-26, -376); ctx.stroke();
  ctx.restore();
}
function flame(ctx, t) {
  const a = 1 - smooth(prog(t, 35.4, 35.75));
  const push = lerp(1, 1.07, easeInOut(prog(t, 28.6, 35.6)));
  const fl = noise1(t * 7, 3), fl2 = noise1(t * 11, 4);
  ctx.save();
  ctx.globalAlpha *= a;
  ctx.translate(W / 2, H / 2); ctx.scale(push, push); ctx.translate(-W / 2, -H / 2);
  const fx = CK.x - 26 + fl2 * 3, fy = CK.y - 404;
  const glow = ctx.createRadialGradient(fx, fy, 0, fx, fy, 200);
  glow.addColorStop(0, 'rgba(255,200,120,0.32)'); glow.addColorStop(1, 'rgba(255,180,100,0)');
  ctx.fillStyle = glow; ctx.fillRect(fx - 200, fy - 200, 400, 400);
  ctx.save();
  ctx.translate(fx, fy + 22);
  ctx.rotate(fl * 0.08);
  ctx.scale(1, 1 + fl2 * 0.08);
  const g = ctx.createRadialGradient(0, -8, 2, 0, -14, 34);
  g.addColorStop(0, 'rgba(255,250,230,1)'); g.addColorStop(0.45, 'rgba(255,206,120,0.95)'); g.addColorStop(1, 'rgba(255,140,60,0)');
  ctx.fillStyle = g;
  ctx.beginPath(); ctx.moveTo(0, -56); ctx.bezierCurveTo(14, -30, 14, -6, 0, 0); ctx.bezierCurveTo(-14, -6, -14, -30, 0, -56); ctx.fill();
  ctx.fillStyle = 'rgba(90,120,200,0.5)';
  ctx.beginPath(); ctx.ellipse(0, -4, 4, 6, 0, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
  // 背后虚掉的聚会灯串
  ctx.globalCompositeOperation = 'screen';
  const r = rng(2828);
  for (let i = 0; i < 14; i++) {
    const x = -40 + i * 150 + r() * 40, y = 170 + Math.sin(i * 0.8) * 40;
    const bg = ctx.createRadialGradient(x, y, 0, x, y, 46);
    bg.addColorStop(0, 'rgba(255,200,130,0.22)'); bg.addColorStop(1, 'rgba(255,200,130,0)');
    ctx.fillStyle = bg; ctx.fillRect(x - 46, y - 46, 92, 92);
  }
  ctx.restore();
}
const candle = {
  ...CANDLE, draw: candleDraw, drawOver: flame,
  light: (t) => [{ x: CK.x - 20, y: CK.y - 250, rx: 640, ry: 520, i: 0.95 + noise1(t * 7, 3) * 0.04, w: 1 - smooth(prog(t, 35.4, 35.75)), color: [255, 196, 130], core: 0.2 }],
  grade: () => ({ warm: 0.5, ambient: 0.07 }),
};

// ================= 人群里的提前难过 =================
const CROWD = { start: 35.6, end: 40.55 };
const crowdCam = (t) => { const k = easeInOut(prog(t, 35.6, 40.4)); return { cx: lerp(1300, 1340, k), cy: lerp(480, 470, k), s: lerp(1.5, 1.68, k) }; };
const oldT = (t) => 0.55 + (t - 35.6) * 0.5;       // 周围的人：第一幕热闹那几秒的慢动作
const hush = (t) => smooth(prog(t, 37.0, 38.0));   // 声音降下去、人群虚掉
function crowdDraw(ctx, t) {
  const c = crowdCam(t);
  ctx.save();
  ctx.globalAlpha *= smooth(prog(t, 35.6, 35.75)) * (1 - smooth(prog(t, 40.3, 40.55)));
  withCam(ctx, c, 1, () => party.drawRoom(ctx, oldT(t), { heroT: 4.8, castBlur: hush(t) * 7, exclude: ['snack'] }));
  ctx.restore();
}
function crowdOver(ctx, t) {
  const c = crowdCam(t);
  ctx.save();
  ctx.globalAlpha *= smooth(prog(t, 35.6, 35.75)) * (1 - smooth(prog(t, 40.3, 40.55)));
  withCam(ctx, c, 1, () => { party.lampGlow(ctx, oldT(t)); party.stringGlow(ctx, oldT(t) + hush(t) * 0); });
  // 周围暗下去，只剩他
  const h = hush(t);
  if (h > 0) {
    const [hx, hy] = toScreen(c, party.HERO.x - 40, 520);
    const g = ctx.createRadialGradient(hx, hy, 160, hx, hy, 900);
    g.addColorStop(0, 'rgba(8,6,5,0)'); g.addColorStop(1, `rgba(8,6,5,${0.62 * h})`);
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  }
  // 提前难过：像投影一样，从虚到实
  const a = smooth(prog(t, 38.2, 38.7));
  if (a > 0) {
    const focus = 1 - smooth(prog(t, 38.2, 39.2));
    const flick = 0.94 + 0.06 * noise1(t * 18, 61);
    ctx.globalAlpha = a * flick;
    ctx.font = FONT.brush(150);
    ctx.letterSpacing = '24px';
    ctx.textAlign = 'center';
    ctx.filter = `blur(${(10 + focus * 12).toFixed(1)}px)`;
    ctx.fillStyle = 'rgba(190,70,50,0.45)';
    ctx.fillText('提前难过', W / 2 + 12, 300);
    ctx.filter = `blur(${(focus * 8).toFixed(1)}px)`;
    ctx.fillStyle = '#ad3a2c';
    ctx.fillText('提前难过', W / 2 + 12, 300);
    ctx.filter = 'none';
  }
  ctx.restore();
}
function crowdLight(t) {
  const c = crowdCam(t);
  const w = smooth(prog(t, 35.6, 35.75)) * (1 - smooth(prog(t, 40.3, 40.55)));
  const h = hush(t);
  const sc = (x, y) => toScreen(c, x, y);
  const [hx, hy] = sc(party.HERO.x - 40, 470);
  const [lx, ly] = sc(party.LAMP.x + 60, 740);
  const [fx, fy] = sc(1060, 520);
  const [ax, ay] = sc(1680, 520);
  return [
    { x: hx, y: hy, rx: 360 * c.s, ry: 420 * c.s, i: 0.85, w, color: [255, 206, 150], core: 0.25 },
    { x: lx, y: ly, rx: 700 * c.s, ry: 380 * c.s, i: lerp(0.9, 0.5, h), w, color: [255, 200, 140] },
    { x: fx, y: fy, rx: 300 * c.s, ry: 380 * c.s, i: lerp(0.7, 0.25, h), w, color: [255, 200, 140] },
    { x: ax, y: ay, rx: 300 * c.s, ry: 380 * c.s, i: lerp(0.65, 0.2, h), w, color: [255, 200, 140] },
    { x: W / 2, y: 250, rx: 1300, ry: 300, i: lerp(0.5, 0.15, h), w, color: [255, 196, 130] },
  ];
}
const crowd = { ...CROWD, draw: crowdDraw, drawOver: crowdOver, light: crowdLight, grade: (t) => ({ warm: lerp(0.5, 0.25, hush(t)), ambient: lerp(0.14, 0.09, hush(t)) }) };

// ================= 倒着回闪 =================
// 直接调用各幕原始场景（旧时间轴）在某一刻的画面和灯光
const MSHOTS = (() => {
  const src = [[require('./p5_interview'), 37.2], [require('./p4_message'), 31.6], [require('./p3_train'), 24.35], [require('./p2_newyear'), 15.2]];
  let t0 = 40.4;
  const out = src.map(([scene, at]) => { const s = { scene, at, t0, t1: t0 + 0.44, rate: 0.6 }; t0 += 0.44; return s; });
  // 最后停在第一幕他想象出来的空房间（旧时间 5.6 → 6.8，非常慢）
  out.push({ scene: party, at: 5.6, t0, t1: 46.85, rate: (6.8 - 5.6) / (46.85 - t0) });
  return out;
})();
const shotAt = (t) => MSHOTS.find((s) => t >= s.t0 && t < s.t1);
const mt = (s, t) => s.at + (t - s.t0) * s.rate;
const montage = {
  start: 40.4, end: 46.85,
  draw(ctx, t) { const s = shotAt(t); if (s) s.scene.draw(ctx, mt(s, t), {}); },
  drawOver(ctx, t) {
    const s = shotAt(t);
    if (!s) return;
    if (s.scene.drawOver) s.scene.drawOver(ctx, mt(s, t), {});
    if (t - s.t0 < 1 / 30) { ctx.fillStyle = 'rgba(0,0,0,0.5)'; ctx.fillRect(0, 0, W, H); }   // 切换时一帧暗闪
    const out = smooth(prog(t, 46.55, 46.85));
    if (out > 0) { ctx.fillStyle = `rgba(8,6,5,${out})`; ctx.fillRect(0, 0, W, H); }
  },
  light(t) { const s = shotAt(t); return s ? s.scene.light(mt(s, t)) : []; },
  grade(t) { const s = shotAt(t); return s ? s.scene.grade(mt(s, t)) : { warm: 0, ambient: 0.1 }; },
};

module.exports = { candle, crowd, montage };
