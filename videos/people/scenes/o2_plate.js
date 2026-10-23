// 开场一镜到底 · 6.9–9.6 秒：筹码 → 盘子。俯视镜头跟着盘子穿过餐厅。
//   6.9  铺满画面的「利益」已经变成一只白瓷盘；镜头一边转一边拉远——盘子在服务员手上
//   7.2  跟着盘子穿过餐厅，远处 A 正和那位客人（深蓝西装）笑着聊天
//   8.05 盘子放到 A 手边。A 的头一直朝着客人，没有抬
//   8.3  食指在桌上敲两下；8.65 指尖把盘子往前一推
//   9.05 服务员把盘子端起来，盘子翻过来、冲向镜头，盘底铺满画面（接办公室的挂钟）
const L = require('../lib');
const K = require('../kit');
const { W, H, lerp, clamp, prog, smooth, noise1, spring, spline, ease } = L;

const S = { start: 6.88, end: 9.62 };
const PR = 95;
// 交接那一帧筹码自己的转角（盘子从同一个角度接着转）
const ROT0 = require('./o1_open').chipState(6.9, '利益').rot;                       // 盘子半径（世界坐标）
const TB = { x: 900, y: 900, w: 560, h: 320 };
const SPOT = [1048, 948];            // 盘子放下的位置
const PALS = {
  A: { skin: K.SKIN_P, shirt: K.KNIT, hair: '#1a1310' },
  V: { skin: K.SKIN_V, shirt: K.NAVY, hair: '#15110e' },
  waiter: { skin: '#c09878', shirt: '#d6cfc2', hair: '#14100d' },
  x1: { skin: '#c8a084', shirt: '#5b3e36', hair: '#20150f' },
  x2: { skin: '#b48a6c', shirt: '#4a4a40', hair: '#120e0b' },
  x3: { skin: '#bd9374', shirt: '#3a3f46', hair: '#191310' },
  x4: { skin: '#c39a7a', shirt: '#6a5446', hair: '#1e140e' },
};
const OTHERS = [
  { x: 2050, y: 450, seats: [['x1', -1], ['x2', 1]] },
  { x: 2250, y: 1650, seats: [['x3', -1], ['x4', 1]] },
  { x: 1250, y: 1950, seats: [['x2', -1], ['x1', 1]] },
  { x: 250, y: 1700, seats: [['x4', -1], ['x3', 1]] },
  { x: 2900, y: 1050, seats: [['x1', -1], ['x3', 1]] },
  { x: 150, y: 350, seats: [['x3', -1], ['x2', 1]] },
];

// 服务员的位置与朝向
function waiter(d) {
  const p = spline(d, [[6.88, [2300, 1500]], [7.4, [1900, 1380]], [7.85, [1450, 1120]], [8.1, [1300, 1010]], [9.0, [1300, 1010]], [9.4, [1330, 1000]]]);
  const v = spline(d + 0.05, [[6.88, [2300, 1500]], [7.4, [1900, 1380]], [7.85, [1450, 1120]], [8.1, [1300, 1010]], [9.0, [1300, 1010]], [9.4, [1330, 1000]]]);
  const moving = Math.hypot(v[0] - p[0], v[1] - p[1]) > 0.5;
  const face = moving ? Math.atan2(v[1] - p[1], v[0] - p[0]) : Math.PI;
  return { x: p[0], y: p[1], face: d < 8.1 ? face : lerp(face, Math.PI, 1), walk: moving ? 1 : 0 };
}
// 盘子：托在服务员手上 → 放到 A 手边 → 被推开 → 被端走、翻过来、冲向镜头
function plate(d) {
  const w = waiter(d);
  const held = [w.x + Math.cos(w.face) * 120 - Math.sin(w.face) * 40, w.y + Math.sin(w.face) * 120 + Math.cos(w.face) * 40];
  const put = ease(prog(d, 7.98, 8.2));
  const push = ease(prog(d, 8.68, 8.95));
  const take = ease(prog(d, 9.02, 9.22));
  let x = lerp(held[0], SPOT[0], put), y = lerp(held[1], SPOT[1], put);
  x += 70 * push; y -= 46 * push;
  x = lerp(x, held[0] - 20, take); y = lerp(y, held[1] - 30, take);
  const rise = prog(d, 9.18, 9.6);
  return { x, y, rise, flip: smooth(prog(d, 9.25, 9.6)), sc: 1 };
}
// A 的手：放在桌上 → 敲两下 → 推盘子
function aHand(d) {
  const tap = (t0) => Math.max(0, Math.sin(Math.PI * prog(d, t0, t0 + 0.16)));
  const t = tap(8.3) + tap(8.5);
  const push = ease(prog(d, 8.62, 8.95)), back = ease(prog(d, 9.0, 9.3));
  return { x: 960 + 70 * push - 50 * back, y: 1040 - 40 * push + 30 * back, rot: 0.25 + 0.45 * push, s: 0.44, index: t * 0.75, curl: 0.12, lift: t * 0.5 + 0.2 * back, point: 0.3 * push };
}

function cam(d) {
  const p = plate(d);
  const k = prog(d, 6.88, 7.7);
  // 6.9 盘子铺满画面（半径与上一段的筹码相同）→ 拉远
  const sPull = Math.exp(lerp(Math.log(13.6), Math.log(0.72), ease(k)));
  const rot = 0.9 + 0.65 * (1 - Math.pow(1 - prog(d, 6.88, 8.3), 3));
  if (d < 7.9) return { cx: p.x, cy: p.y, s: sPull, rot };
  const m = ease(prog(d, 7.9, 8.35));
  let cx = lerp(p.x, 1000, m), cy = lerp(p.y, 960, m), s = lerp(0.72, 1.3, m) + (d - 8.35 > 0 ? (d - 8.35) * 0.08 : 0);
  // 9.15 起：镜头追着冲上来的盘子
  const r = prog(d, 9.15, 9.6);
  if (r > 0) { cx = lerp(cx, p.x, ease(r)); cy = lerp(cy, p.y, ease(r)); s = lerp(s, 2.2, r * r); }
  return { cx, cy, s, rot };
}

function table(c, x, y, w, h, seed) {
  c.fillStyle = 'rgba(6,4,3,0.5)'; L.rrect(c, x - w / 2 + 14, y - h / 2 + 18, w, h, 16); c.fill();
  c.save(); L.rrect(c, x - w / 2, y - h / 2, w, h, 16); c.clip();
  c.drawImage(K.wood(700, 420, seed), x - w / 2, y - h / 2, w, h);
  c.restore();
  c.strokeStyle = 'rgba(255,214,160,0.18)'; c.lineWidth = 3; L.rrect(c, x - w / 2, y - h / 2, w, h, 16); c.stroke();
}

// o.cam / o.noHand：开场「回流」时把这一幕当背景重画（换镜头、去掉 A 的手）
function draw(ctx, d, o = {}) {
  const c = o.cam || cam(d);
  L.withCam(ctx, c, 1, () => {
    // 地面：深色木地板
    ctx.fillStyle = '#17110d'; ctx.fillRect(-2000, -2000, 6500, 6000);
    ctx.globalAlpha = 0.5; ctx.drawImage(K.wood(2400, 2400, 93, [40, 30, 24]), -1200, -1000, 5200, 4200); ctx.globalAlpha = 1;
    // 其他几桌
    OTHERS.forEach((T, i) => {
      table(ctx, T.x, T.y, 380, 240, 120 + i);
      for (const [k, sd] of [[-1, 0], [1, 1]]) {
        ctx.save(); ctx.translate(T.x + 130 * k, T.y + 25 * (i % 2 ? 1 : -1)); ctx.translate(0, 0);
        ctx.save(); ctx.translate(-60 * k, 0); K.chip(ctx, '利益', 52, { morph: 1, food: 1, shadow: 0.6 }); ctx.restore();
        K.topPerson(ctx, { pal: PALS[T.seats[sd][0]], face: k < 0 ? 0 : Math.PI, t: d + i, laugh: (i + sd) % 3 === 0 ? 0.6 : 0, head: noise1(d * 0.6 + i * 3 + sd, 7) * 0.4, armL: [80, -50 + noise1(d + i, 2) * 10], armR: [90, 46] });
        ctx.restore();
      }
    });
    // A 这一桌
    table(ctx, TB.x, TB.y, TB.w, TB.h, 140);
    ctx.save(); ctx.translate(780, 830); K.chip(ctx, '利益', 70, { morph: 1, food: 1, shadow: 0.6 }); ctx.restore();
    ctx.save(); ctx.translate(1080, 820); ctx.fillStyle = 'rgba(220,228,232,0.5)'; ctx.lineWidth = 5; ctx.strokeStyle = 'rgba(220,228,232,0.6)'; ctx.beginPath(); ctx.arc(0, 0, 34, 0, Math.PI * 2); ctx.stroke(); ctx.fillStyle = 'rgba(110,22,24,0.7)'; ctx.beginPath(); ctx.arc(0, 2, 24, 0, Math.PI * 2); ctx.fill(); ctx.restore();
    const laugh = 1 - smooth(prog(d, 8.0, 8.6)) * 0.6;
    // 客人（对面，朝下）：比手势、笑
    ctx.save(); ctx.translate(TB.x - 20, TB.y - 210);
    K.topPerson(ctx, { pal: PALS.V, face: Math.PI / 2, t: d, laugh, head: 0.1 * Math.sin(d * 2), armL: [110 + 20 * Math.sin(d * 4), -70], armR: [105, 64] });
    ctx.restore();
    // A（这边，朝上）：头一直朝着客人
    ctx.save(); ctx.translate(TB.x - 40, TB.y + 210);
    K.topPerson(ctx, { pal: PALS.A, face: -Math.PI / 2, t: d + 0.3, laugh: laugh * 0.9, head: -0.15 + 0.05 * Math.sin(d * 3), armL: [100, -60], armR: [125, 92] });
    ctx.restore();
    // A 的右手（细节）
    if (!o.noHand) L.hand(ctx, { ...aHand(d), sleeve: K.KNIT, skin: K.SKIN_P, arm: 260 });
    // 服务员
    const w = waiter(d);
    const swing = w.walk * Math.sin(d * 9);
    ctx.save(); ctx.translate(w.x, w.y);
    K.topPerson(ctx, { pal: PALS.waiter, face: w.face, t: d, chair: false, head: 0, armL: [lerp(120, 40, ease(prog(d, 7.98, 8.2)) * (1 - ease(prog(d, 9.0, 9.2)))), -40], armR: [20 + 30 * swing, 66] });
    ctx.restore();
  });
  // 盘子（在最上层：冲向镜头时要盖住一切）
  const p = plate(d);
  const [sx, sy, ss] = L.camPt(c, p.x, p.y);
  const lift = 1 + 9 * Math.pow(p.rise, 2.4);
  ctx.save();
  ctx.translate(sx + (W / 2 - sx) * ease(p.rise), sy + (H / 2 - sy) * ease(p.rise));
  ctx.rotate(c.rot + ROT0);
  const r = PR * ss * p.sc * lift;
  // 翻过来：先压扁成一条线，再展开成盘底
  const fl = p.flip;
  const sxk = Math.abs(Math.cos(fl * Math.PI));
  ctx.scale(Math.max(0.02, sxk), 1);
  if (fl < 0.5) K.chip(ctx, '利益', r, { morph: smooth(prog(d, 6.45, 7.2)), food: smooth(prog(d, 6.75, 7.25)), shadow: 1 - p.rise });
  else K.plateBottomToClock(ctx, r, 0, {});
  ctx.restore();
  // 6.9 交接：上一段的盘子还在 morph（0.6 → 1）
}

function light(d) {
  const c = cam(d);
  const ls = [
    { x: TB.x, y: TB.y, rx: 560, ry: 460, i: 1.0, color: [255, 204, 146] },
    ...OTHERS.map((T) => ({ x: T.x, y: T.y, rx: 360, ry: 300, i: 0.75, color: [255, 200, 140] })),
  ];
  const p = plate(d);
  ls.push({ x: p.x, y: p.y, rx: 300, ry: 300, i: 0.8, color: [255, 214, 170] });
  const out = L.camLights(c, ls);
  // 盘子冲到镜头前：光跟着它铺满画面（与办公室第一帧的亮度接上）
  const full = smooth(prog(d, 9.3, 9.6));
  if (full > 0) out.push({ x: W / 2, y: H / 2, rx: 1300, ry: 1000, i: 1.0, w: full, color: [240, 230, 214] });
  return out;
}
function grade() { return { warm: 0.22, ambient: 0.32 }; }

// 交接给办公室的那一帧：盘底在屏幕中央的半径和转角
function endState() {
  const d = 9.6, c = cam(d), p = plate(d);
  const [, , ss] = L.camPt(c, p.x, p.y);
  return { r: PR * ss * (1 + 9 * Math.pow(p.rise, 2.4)), rot: c.rot + ROT0 };
}

module.exports = { ...S, draw, light, grade, plate, cam, PR, endState };
