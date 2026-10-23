// 开场一镜到底 · 15.0–21.35 秒：回流 → 拉远 → 自我评价被动作撞碎 → 进入第一章。
//   15.0  镜头从站起来的 A 猛地甩向墙上的钟，钟面铺满画面
//   15.55 红色秒针变粗，变成 A 的胳膊和手；它像秒针一样扫过去，扫过的地方换成另一个场景（径向擦除，不淡入淡出）：
//         第一圈 → 会议桌上的筹码：手指按住「利益」
//         第二圈 → 餐厅：同一只手的食指敲两下桌面，把盘子推开
//         第三圈 → 办公室：同一只手，指向低着头的同事
//   18.0  整个画面缩成一个圆，退到黑暗里；另外两个圆（筹码、盘子）从画外飞进来，三个圆围着站在中央的 A 转
//   18.65 他身边浮出四句自我评价；19.2 起三个圆依次撞过去，字被撞碎
//   19.75 「看他反复怎么选择。」；20.7 筹码那个圆冲到中央、放大铺满，里面的镜头拉远——第一章的会议桌
const { createCanvas } = require('@napi-rs/canvas');
const L = require('../lib');
const K = require('../kit');
const { W, H, FONT, lerp, clamp, prog, smooth, noise1, spring, spline, ease, rng } = L;
const O2 = require('./o2_plate');
const O3 = require('./o3_office');
const C1 = require('./c1_meeting');

const S = { start: 15.0, end: 21.35 };
const C0 = [W / 2, H / 2], RC = 560, RT = 400;
const FULL = 1150;
const easeIO = (k) => (k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2);

// ---------------- 背景（缓存的场景画面） ----------------
const cache = {};
function snap(key, fn) {
  if (!cache[key]) {
    const c = createCanvas(W, H), x = c.getContext('2d');
    fn(x);
    // 回流里的场景压暗一些，主体是那只手
    x.fillStyle = 'rgba(8,6,5,0.38)'; x.fillRect(0, 0, W, H);
    const g = x.createRadialGradient(W / 2, H / 2, 300, W / 2, H / 2, 1100);
    g.addColorStop(0, 'rgba(8,6,5,0)'); g.addColorStop(1, 'rgba(8,6,5,0.6)');
    x.fillStyle = g; x.fillRect(0, 0, W, H);
    cache[key] = c;
  }
  return cache[key];
}
// 把世界里的点 (wx, wy) 放到屏幕上的 (sx, sy)
const camTo = (wx, wy, sx, sy, s) => ({ cx: wx - (sx - W / 2) / s, cy: wy - (sy - H / 2) / s, s, rot: 0 });

// 三圈结束时手尖的方向：上 → 右下 → 左下
const tipAt = (a) => [C0[0] + Math.cos(a) * RT, C0[1] + Math.sin(a) * RT];
const T1 = tipAt(-Math.PI / 2), T2 = tipAt(Math.PI / 6), T3 = tipAt(Math.PI * 5 / 6);

const ghostPlate = () => snap('plate', (x) => {
  const p = O2.plate(8.45);
  O2.draw(x, 8.45, { cam: camTo(p.x - 70, p.y + 40, T2[0], T2[1], 1.25), noHand: true });
});
const ghostOffice = () => snap('office', (x) => {
  L.withCam(x, camTo(790, 450, T3[0] - 60, T3[1] - 150, 1.15), 1, () => O3.officeB(x, 14.95, { noA: true }));
});
// 会议桌是活的（筹码那一圈之后还要进第一章）
function meeting(x, d, camOverride, grab = 0) {
  const ch = C1.CHIPS['利益'];
  L.withCam(x, camOverride || camTo(ch[0], ch[1] - 30, T1[0], T1[1] + 30, 1.9), 1, () => C1.world(x, d, { grab }));
}
function meetingDim(x) {
  x.fillStyle = 'rgba(8,6,5,0.3)'; x.fillRect(0, 0, W, H);
}

// ---------------- 秒针 / 手 ----------------
const secAngle = (d) => (O3.clockTime(d).sec / 60) * Math.PI * 2 - Math.PI / 2;
const A0 = secAngle(15.55);
const nextAt = (from, target) => { let a = target; while (a < from + Math.PI * 2) a += Math.PI * 2; return a; };
const A1 = nextAt(A0, -Math.PI / 2);
const A2 = nextAt(A1, Math.PI / 6);
const A3 = nextAt(A2, Math.PI * 5 / 6);
const SW = [[15.6, 16.15, A0, A1], [16.5, 17.0, A1, A2], [17.32, 17.8, A2, A3]];
function armAngle(d) {
  let a = A0;
  for (const [t0, t1, a0, a1] of SW) if (d >= t0) a = lerp(a0, a1, easeIO(prog(d, t0, t1)));
  return a;
}
function stage(d) { return d < 15.6 ? 0 : d < 16.5 ? 1 : d < 17.32 ? 2 : 3; }

function heroHand(d) {
  const st = stage(d);
  const k1 = prog(d, 15.6, 16.15), k2 = prog(d, 16.5, 17.0), k3 = prog(d, 17.32, 17.8);
  const tap = (t0) => Math.max(0, Math.sin(Math.PI * prog(d, t0, t0 + 0.11)));
  const taps = tap(17.02) + tap(17.17);
  let point = 0.85, middle = 1, lift = 0.4, reach = 0, index = 0;
  if (st >= 1) { lift = lerp(0.4, 0, smooth(prog(d, 16.12, 16.25))); reach = -30 * smooth(prog(d, 16.2, 16.45)); }
  if (st >= 2) { middle = 1 - smooth(k2); point = lerp(0.85, 0.9, k2); index = taps * 0.7; lift = taps * 0.4; reach = 30 * smooth(prog(d, 17.22, 17.32)); }
  if (st >= 3) { point = lerp(0.9, 1, k3); index = 0; lift = 0.25; reach = 26 * Math.max(0, Math.sin(Math.PI * prog(d, 17.82, 18.0))); }
  void k1;
  return { point, middle, lift, reach, index };
}

function drawHero(ctx, d, a) {
  const widen = smooth(prog(d, 15.55, 15.85));
  const hp = heroHand(d);
  const hs = 1.25, wristR = RT + hp.reach - 235 * hs;
  ctx.save();
  ctx.translate(C0[0], C0[1]);
  ctx.rotate(a);
  ctx.scale(1, lerp(0.05, 1, widen));
  L.hand(ctx, { x: wristR, y: 0, rot: Math.PI / 2, s: hs, curl: 0.08, point: hp.point, middle: hp.middle, lift: hp.lift, index: hp.index, sleeve: K.KNIT, skin: K.SKIN_P, arm: wristR / hs + 30 });
  ctx.restore();
  // 秒针（红）还在的时候
  if (widen < 1) {
    ctx.save(); ctx.translate(C0[0], C0[1]); ctx.rotate(a);
    ctx.globalAlpha = 1 - widen;
    ctx.fillStyle = '#9a2c24'; ctx.fillRect(-RC * 0.12, -RC * 0.006, RC * 0.9, RC * 0.012 * (1 + widen * 6));
    ctx.restore();
  }
  // 中心的轴（钟的轴 = 这只胳膊的「肩」）
  ctx.fillStyle = '#1c1816'; ctx.beginPath(); ctx.arc(C0[0], C0[1], 34, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = 'rgba(255,214,160,0.45)'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(C0[0], C0[1], 34, 0, Math.PI * 2); ctx.stroke();
  ctx.fillStyle = '#9a2c24'; ctx.beginPath(); ctx.arc(C0[0], C0[1], 9, 0, Math.PI * 2); ctx.fill();
}

// 扇形：从 a0 顺时针到 a1（超过一整圈就是整个画面）
function wedge(ctx, a0, a1) {
  ctx.beginPath();
  if (a1 - a0 >= Math.PI * 2) { ctx.rect(0, 0, W, H); return; }
  ctx.moveTo(C0[0], C0[1]);
  ctx.arc(C0[0], C0[1], 2400, a0, a1);
  ctx.closePath();
}

// 15.0–15.55：从站起来的 A 甩向钟
function whipCam(d) {
  const k = prog(d, 15.0, 15.55), e = k * k * (3 - 2 * k);
  const b = O3.camB(15.0);
  const ck = O3.CKB, s1 = RC / O3.CKR;
  return { cx: lerp(b.cx, ck[0], e), cy: lerp(b.cy, ck[1], e), s: Math.exp(lerp(Math.log(b.s), Math.log(s1), k * k)), rot: 0 };
}
function clockBg(ctx, d) {
  L.withCam(ctx, whipCam(Math.min(d, 15.55)), 1, () => O3.officeB(ctx, d, { noA: d >= 15.55 }));
}

// 回流（15.0–18.0）画到给定的 ctx 上
function drawFlow(ctx, d) {
  const st = stage(d);
  if (d < 15.55) { clockBg(ctx, d); return; }
  const bgs = [(x) => clockBg(x, d), (x) => { meeting(x, d); meetingDim(x); }, (x) => x.drawImage(ghostPlate(), 0, 0), (x) => x.drawImage(ghostOffice(), 0, 0)];
  const a = armAngle(d);
  // 当前已经完整显示的场景
  const base = st === 0 ? 0 : d >= SW[st - 1][1] ? st : st - 1;
  bgs[base](ctx);
  // 正在扫的那一圈：扫过的扇形里是下一个场景
  const sw = SW.find(([t0, t1]) => d >= t0 && d < t1);
  if (sw) {
    const i = SW.indexOf(sw);
    ctx.save(); wedge(ctx, sw[2], a); ctx.clip(); bgs[i + 1](ctx); ctx.restore();
  }
  // 扫的时候，手后面拖一道光（速度感）
  if (sw) {
    const g = ctx.createConicGradient ? null : null; void g;
    ctx.save(); ctx.globalCompositeOperation = 'screen';
    for (let j = 1; j <= 6; j++) {
      ctx.globalAlpha = 0.05 * (1 - j / 7);
      ctx.save(); ctx.translate(C0[0], C0[1]); ctx.rotate(a - j * 0.06);
      ctx.fillStyle = 'rgb(255,214,160)'; ctx.fillRect(0, -40, RT + 60, 80);
      ctx.restore();
    }
    ctx.restore();
  }
  drawHero(ctx, d, a);
}

// ---------------- 拉远：三个圆 + 站着的人 + 被撞碎的字 ----------------
const flowSnap = () => {
  if (!cache.flow) { const c = createCanvas(W, H); drawFlow(c.getContext('2d'), 18.0); cache.flow = c; }
  return cache.flow;
};
const ORB = [960, 470];
function orbitPos(i, d) {
  const spread = smooth(prog(d, 19.6, 20.1));
  const rx = lerp(560, 860, spread), ry = lerp(250, 420, spread);
  const base = [Math.PI * 1.1, Math.PI * 1.5, Math.PI * 1.9][i] + (d - 18.0) * 0.22;
  return [ORB[0] + Math.cos(base) * rx, ORB[1] + Math.sin(base) * ry];
}
const WORDS = [
  { text: '“我很善良”', p: [640, 560], t: 18.65 },
  { text: '“我很讲义气”', p: [1290, 520], t: 18.75 },
  { text: '“我不计较”', p: [600, 745], t: 18.85 },
  { text: '“我情绪很稳定”', p: [1320, 705], t: 18.95 },
];
// 哪个圆、在什么时候撞哪句话：筹码撞「我不计较」，盘子撞「我很善良」，指人的手撞「讲义气」「情绪稳定」
const HITS = [[0, 2, 19.2], [1, 0, 19.36], [2, 1, 19.5], [2, 3, 19.64]];

// 圆 i 的位置 / 半径（含冲刺撞字）
function circle(i, d) {
  let p = orbitPos(i, d);
  let r = 200;
  if (i === 2) {
    // 回流的画面本身缩成这个圆
    const k = ease(prog(d, 18.0, 18.6));
    p = [lerp(C0[0], p[0], k), lerp(C0[1], p[1], k)];
    r = Math.exp(lerp(Math.log(FULL), Math.log(200), k));
  } else {
    const k = ease(prog(d, 18.1, 18.65));
    const from = i === 0 ? [-300, 260] : [960, -320];
    p = [lerp(from[0], p[0], k), lerp(from[1], p[1], k)];
  }
  for (const [ci, wi, th] of HITS) {
    if (ci !== i) continue;
    const w = WORDS[wi].p;
    const go = ease(prog(d, th - 0.24, th)), back = ease(prog(d, th + 0.06, th + 0.42));
    const dir = [w[0] - p[0], w[1] - p[1]];
    const over = [w[0] + dir[0] * 0.25, w[1] + dir[1] * 0.25];
    const hit = L.mix(L.mix(p, over, go), p, back);
    p = hit;
    r *= 1 - 0.25 * go * (1 - back);
  }
  // 进第一章：筹码那个圆冲到中央、放大到铺满
  if (i === 0) {
    const k = ease(prog(d, 20.7, 21.3));
    p = [lerp(p[0], C0[0], k), lerp(p[1], C0[1], k)];
    r = Math.exp(lerp(Math.log(r), Math.log(FULL), k * k));
  }
  return { p, r };
}
// 圆里的画面：整幅画面按 r / FULL 缩小，focus 点对准圆心
function drawCircle(ctx, i, d) {
  const { p, r } = circle(i, d);
  const k = r / FULL;
  const focus = i === 2 ? L.mix(C0, [(T3[0] + C0[0]) / 2, T3[1] - 60], smooth(prog(d, 18.0, 18.6))) : i === 1 ? T2 : C0;
  ctx.save();
  ctx.beginPath(); ctx.arc(p[0], p[1], r, 0, Math.PI * 2); ctx.clip();
  ctx.translate(p[0], p[1]); ctx.scale(k, k); ctx.translate(-focus[0], -focus[1]);
  if (i === 2) ctx.drawImage(flowSnap(), 0, 0);
  if (i === 1) ctx.drawImage(ghostPlate(), 0, 0);
  if (i === 0) {
    // 第一章那张会议桌：A 的手按着「利益」往回拖；进第一章时手收回去、镜头拉远
    meeting(ctx, d, C1.cam(Math.max(d, 20.9)), C1.grabOf(d));
  }
  ctx.restore();
  // 圆的边：一圈暖色细光
  if (r < FULL * 0.9) {
    ctx.strokeStyle = `rgba(255,214,160,${0.5 * (1 - r / FULL)})`; ctx.lineWidth = 2.5;
    ctx.beginPath(); ctx.arc(p[0], p[1], r, 0, Math.PI * 2); ctx.stroke();
  }
}
// 碎字：每个字切成几块，沿撞击方向飞出去、旋转、下坠
const SHARDS = WORDS.map((w, wi) => {
  const r = rng(300 + wi);
  return [...w.text].flatMap((ch, ci) => Array.from({ length: 4 }, (_, k) => ({ ch, ci, k, vx: (r() - 0.5) * 900, vy: -200 - r() * 500, vr: (r() - 0.5) * 14 })));
});
function drawWords(ctx, d) {
  ctx.save();
  ctx.font = FONT.body(44);
  ctx.letterSpacing = '4px';
  ctx.textBaseline = 'middle';
  WORDS.forEach((w, wi) => {
    const hit = HITS.find(([, i]) => i === wi);
    const th = hit[2];
    const pop = spring(d, w.t, 3, 0.6);
    if (d < w.t) return;
    const cw = ctx.measureText(w.text).width;
    const x0 = w.p[0] - cw / 2, step = cw / [...w.text].length;
    if (d < th) {
      ctx.save(); ctx.globalAlpha = clamp(pop * 1.5);
      ctx.translate(w.p[0], w.p[1]); ctx.scale(0.8 + 0.2 * pop, 0.8 + 0.2 * pop);
      ctx.shadowColor = 'rgba(255,214,160,0.35)'; ctx.shadowBlur = 14;
      ctx.fillStyle = '#efe6d3'; ctx.textAlign = 'center'; ctx.fillText(w.text, 0, 0);
      ctx.restore();
      return;
    }
    // 撞击方向：从撞它的圆指向字
    const src = orbitPos(hit[0], th - 0.24);
    const dx = w.p[0] - src[0], dy = w.p[1] - src[1], dl = Math.hypot(dx, dy) || 1;
    const t = d - th;
    for (const sh of SHARDS[wi]) {
      const cx = x0 + step * (sh.ci + 0.5);
      const qx = (sh.k % 2) - 0.5, qy = Math.floor(sh.k / 2) - 0.5;
      const px = cx + qx * step * 0.5 + (dx / dl * 700 + sh.vx) * t, py = w.p[1] + qy * 22 + (dy / dl * 500 + sh.vy) * t + 1400 * t * t;
      ctx.save();
      ctx.globalAlpha = 1 - smooth(prog(t, 0.25, 0.75));
      ctx.translate(px, py); ctx.rotate(sh.vr * t);
      ctx.beginPath(); ctx.rect(qx < 0 ? -step / 2 : 0, qy < 0 ? -26 : 0, step / 2, 26); ctx.clip();
      ctx.fillStyle = '#efe6d3'; ctx.textAlign = 'center';
      ctx.translate(-qx * step * 0.5, -qy * 22);
      ctx.fillText(sh.ch, 0, 0);
      ctx.restore();
    }
    // 撞上那一下的闪光
    const fl = 1 - smooth(prog(t, 0, 0.18));
    if (fl > 0) L.glow(ctx, w.p[0], w.p[1], 160, 'rgba(255,220,180,A)', 0.6 * fl);
  });
  ctx.restore();
}

// 站在中央的 A
function standing(ctx, d) {
  const look = WORDS.reduce((acc, w, i) => (d > w.t ? (i % 2 ? 1 : -1) : acc), 1);
  L.lit(ctx, (x) => {
    x.save(); x.translate(960, 640);
    L.figure(x, { h: 430, f: look, yaw: 1, pal: L.CAST.A, eye: 1, frown: smooth(prog(d, 19.2, 19.7)),
      pose: { torso: 0.0, neck: 0.02, head: -0.04 + 0.03 * Math.sin(d * 1.3), uArmN: 0.04, fArmN: 0.08, uArmF: -0.03, fArmF: 0, ankleN: [12, 205], ankleF: [-10, 207] } });
    x.restore();
  }, { light: -1.6, rim: [255, 214, 160], rimA: 0.85, shadow: 0.4, ambient: 1, bbox: [800, 380, 320, 520] });
}

function draw(ctx, d) {
  if (d < 18.0) { drawFlow(ctx, d); return; }
  // 黑暗的空间：地面一圈很淡的光
  ctx.fillStyle = '#0e0c0b'; ctx.fillRect(0, 0, W, H);
  const g = ctx.createRadialGradient(960, 860, 20, 960, 860, 520);
  g.addColorStop(0, 'rgba(120,96,70,0.35)'); g.addColorStop(1, 'rgba(120,96,70,0)');
  ctx.fillStyle = g; ctx.save(); ctx.translate(0, 860); ctx.scale(1, 0.25); ctx.translate(0, -860); ctx.fillRect(0, 300, W, 1100); ctx.restore();
  standing(ctx, d);
  drawWords(ctx, d);
  // 远的先画；进第一章时筹码那个圆最后画（盖住一切）
  const order = d >= 20.7 ? [1, 2, 0] : [1, 0, 2];
  for (const i of order) drawCircle(ctx, i, d);
}

function light(d) {
  if (d < 18.0) {
    return [
      { x: C0[0], y: C0[1], rx: 1300, ry: 1000, i: 0.95, color: [240, 226, 206] },
      { x: tipAt(armAngle(d))[0], y: tipAt(armAngle(d))[1], rx: 420, ry: 420, i: 0.9, color: [255, 214, 170] },
    ];
  }
  const ls = [{ x: 960, y: 640, rx: 380, ry: 460, i: 0.95, color: [255, 214, 170] }];
  for (const i of [0, 1, 2]) { const { p, r } = circle(i, d); ls.push({ x: p[0], y: p[1], rx: r * 1.5 + 80, ry: r * 1.5 + 80, i: 0.9, color: [255, 220, 180] }); }
  for (const w of WORDS) if (d > w.t) ls.push({ x: w.p[0], y: w.p[1], rx: 260, ry: 120, i: 0.6, color: [255, 220, 180] });
  return ls;
}
function grade(d) { return { warm: 0.12, ambient: d < 18 ? 0.4 : 0.32 }; }

module.exports = { ...S, draw, light, grade };
