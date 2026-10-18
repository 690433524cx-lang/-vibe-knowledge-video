// 第四幕 · 26.3–34.0 秒：深夜，等一条回复。
//   卧室全暗，只有手机屏幕照亮他的手和下巴的一小块。消息已经发出去了。
//   27.2 他把手机放到床头柜上（屏幕朝上，光往墙上漏）；29.4 屏幕自己暗了——屋里更暗一档。
//   28.8 起墙上极淡地浮出三句脑内的假设：没有回复 / 被讨厌 / 关系结束（失焦、透明，明确是想象）。
//   30.4 他又把手机拿起来，点亮——还是没有回复。
//   32.3 切回手机特写：输入框里的光标在闪；32.9 起光标被拉长、变亮、变冷——交给下一幕成为面试室的门缝。
const { W, H } = require('../../../src/config');
const { FONT } = require('../../../src/lib/style');
const { prog, smooth, lerp, rng, noise1, easeInOut } = require('../../../src/lib/util');
const { withCam, toScreen, glassShape, smoothPath } = require('../lib');
const { person, skeleton } = require('../people');
const { phoneShell, chat, toScreen: phoneToScreen, CURSOR } = require('../phone');

const S = { start: 26.3, end: 34.1 };
const CLOSE_T = 32.3;           // 切回手机特写
const CRACK_X = 1168;           // 下一幕门缝在画面上的 x（与 p5 一致）

const FLOOR = 760;
const HERO = { x: 830, y: 632, u: 330 };
const STAND = { x0: 1060, x1: 1260, top: 646 };
const WIN = { x0: 300, x1: 690, y0: 120, y1: 470 };

const cam = (t) => ({ cx: 960 + (t - 26.3) * 4, cy: 540, s: 1.06 + (t - 26.3) * 0.004 });

// ---------------- 动作 ----------------
// 0 拿着看 → 1 放下（伸向床头柜）→ 2 手放膝上等 → 3 再拿起来
function heroPose(t) {
  const down = smooth(prog(t, 27.2, 27.9));          // 伸手放下
  const back = smooth(prog(t, 27.9, 28.4));          // 手收回膝上
  const reach = smooth(prog(t, 30.3, 30.8));         // 又伸手去拿
  const lift = smooth(prog(t, 30.8, 31.3));          // 拿回胸前
  const hold = [0.55, 1.75], put = [1.2, 0.55], knee = [0.32, 1.35];
  let a = hold;
  const mix = (p, q, k) => [lerp(p[0], q[0], k), lerp(p[1], q[1], k)];
  if (t < 27.9) a = mix(hold, put, down);
  else if (t < 30.3) a = mix(put, knee, back);
  else if (t < 30.8) a = mix(knee, put, reach);
  else a = mix(put, hold, lift);
  const waiting = smooth(prog(t, 28.0, 28.6)) * (1 - smooth(prog(t, 30.2, 30.6)));
  return {
    sit: true, face: -1, lean: lerp(0.38, 0.46, down * (1 - back) + reach * (1 - lift)), hd: lerp(0.45, 0.2, waiting) + noise1(t * 0.4, 3) * 0.02,
    arms: { near: a, far: t < 27.9 ? mix([0.6, 1.7], [0.32, 1.3], down) : t < 30.8 ? [0.32, 1.3] : mix([0.32, 1.3], [0.6, 1.7], lift) },
    top: '#3a4450', bottom: '#22242a', hair: '#120e0b', hairStyle: 'short', skin: '#7c5d4a', light: -0.2, rim: 0.42, rimCol: [196, 214, 240],
  };
}
// 手机在哪：手里 / 床头柜上
function phoneState(t) {
  const P = heroPose(t);
  const S2 = skeleton(P);
  const h = S2.arms.near.hand;
  const inHand = [HERO.x - h[0] * HERO.u, HERO.y + h[1] * HERO.u];
  const onStand = [1150, STAND.top - 4];
  const onTable = t >= 27.85 && t < 30.75;
  // 屏幕：手里时亮着；放下后 29.4 自己暗掉；拿起来 31.0 再点亮
  const lit = t < 29.4 ? 1 : t < 29.7 ? 1 - smooth(prog(t, 29.4, 29.7)) : smooth(prog(t, 31.0, 31.15));
  return { pos: onTable ? onStand : inHand, onTable, lit };
}

// ---------------- 房间 ----------------
function room(ctx, t) {
  const g = ctx.createLinearGradient(0, -100, 0, FLOOR);
  g.addColorStop(0, '#2b3038'); g.addColorStop(1, '#343a43');
  ctx.fillStyle = g;
  ctx.fillRect(-300, -300, W + 600, FLOOR + 300);
  ctx.fillStyle = '#23262c';
  ctx.fillRect(-300, FLOOR, W + 600, H + 400);
  ctx.fillStyle = 'rgba(200,210,225,0.06)';
  ctx.fillRect(-300, FLOOR, W + 600, 2);
  // 窗：夜色 + 半拉的窗帘
  ctx.fillStyle = '#161b24';
  ctx.fillRect(WIN.x0, WIN.y0, WIN.x1 - WIN.x0, WIN.y1 - WIN.y0);
  const r = rng(404);
  for (let i = 0; i < 24; i++) { ctx.fillStyle = `rgba(${r() < 0.6 ? '255,206,150' : '180,198,228'},${0.15 + r() * 0.3})`; ctx.fillRect(WIN.x0 + r() * (WIN.x1 - WIN.x0), WIN.y0 + 160 + r() * 170, 3, 3); }
  ctx.strokeStyle = '#3e434b'; ctx.lineWidth = 12;
  ctx.strokeRect(WIN.x0, WIN.y0, WIN.x1 - WIN.x0, WIN.y1 - WIN.y0);
  ctx.fillStyle = '#2a2f37';
  ctx.beginPath(); ctx.moveTo(WIN.x0 + 150, WIN.y0 - 30); ctx.lineTo(WIN.x1 + 40, WIN.y0 - 30); ctx.lineTo(WIN.x1 + 50, FLOOR - 40); ctx.quadraticCurveTo(WIN.x0 + 260, FLOOR - 30, WIN.x0 + 170, FLOOR - 40); ctx.closePath(); ctx.fill();
  ctx.strokeStyle = 'rgba(0,0,0,0.25)'; ctx.lineWidth = 4;
  for (const x of [WIN.x0 + 230, WIN.x0 + 320, WIN.x0 + 420, WIN.x0 + 520]) { ctx.beginPath(); ctx.moveTo(x, WIN.y0 - 28); ctx.quadraticCurveTo(x - 14, 400, x + 10, FLOOR - 42); ctx.stroke(); }
}

function bed(ctx) {
  // 床头板
  ctx.fillStyle = '#2a2622';
  ctx.fillRect(150, 360, 40, 420);
  // 床架
  ctx.fillStyle = '#25211d';
  ctx.fillRect(150, 700, 780, 64);
  ctx.fillRect(160, 764, 16, 26); ctx.fillRect(900, 764, 16, 26);
  // 床垫 + 床单
  ctx.fillStyle = '#5a5f68';
  ctx.beginPath(); ctx.moveTo(190, 616); ctx.lineTo(920, 616); ctx.quadraticCurveTo(936, 618, 936, 640); ctx.lineTo(936, 700); ctx.lineTo(190, 700); ctx.closePath(); ctx.fill();
  // 被子：从床头堆到床尾，一角垂下来
  ctx.fillStyle = '#6b6f76';
  smoothPath(ctx, [[380, 612], [520, 596], [660, 604], [800, 590], [900, 606], [930, 640], [940, 730], [880, 742], [760, 712], [600, 716], [430, 706], [372, 660]]);
  ctx.fill();
  ctx.strokeStyle = 'rgba(0,0,0,0.18)'; ctx.lineWidth = 3;
  for (const [a, b] of [[480, 600], [620, 606], [760, 598]]) { ctx.beginPath(); ctx.moveTo(a, b); ctx.quadraticCurveTo(a + 30, b + 50, a - 10, b + 100); ctx.stroke(); }
  // 枕头
  ctx.fillStyle = '#868a90';
  smoothPath(ctx, [[200, 600], [260, 572], [350, 576], [380, 604], [350, 622], [220, 622]]);
  ctx.fill();
}

function nightstand(ctx) {
  ctx.fillStyle = '#2c2721';
  ctx.fillRect(STAND.x0, STAND.top, STAND.x1 - STAND.x0, 150);
  ctx.fillStyle = '#3a332b';
  ctx.fillRect(STAND.x0 - 6, STAND.top - 8, STAND.x1 - STAND.x0 + 12, 10);
  ctx.strokeStyle = 'rgba(0,0,0,0.4)'; ctx.lineWidth = 2;
  ctx.strokeRect(STAND.x0 + 14, STAND.top + 30, STAND.x1 - STAND.x0 - 28, 50);
  ctx.fillStyle = '#16120f'; ctx.fillRect(STAND.x0 + 6, STAND.top + 150, 10, 10); ctx.fillRect(STAND.x1 - 16, STAND.top + 150, 10, 10);
  // 关着的台灯 + 一杯水
  ctx.save();
  ctx.translate(1225, STAND.top - 8);
  ctx.fillStyle = '#1e1b18';
  ctx.fillRect(-3, -120, 6, 120);
  ctx.beginPath(); ctx.moveTo(-36, -170); ctx.lineTo(36, -170); ctx.lineTo(50, -110); ctx.lineTo(-50, -110); ctx.closePath();
  ctx.fillStyle = '#4a4a48'; ctx.fill();
  ctx.restore();
  ctx.save(); ctx.translate(1088, STAND.top - 8); glassShape(ctx, 34, 60, { fill: 0.6, liquid: [150, 170, 190] }); ctx.restore();
}

// 手机（在手里 / 在床头柜上）；over = 发光的屏幕（画在光照之上）
function phone(ctx, t, over) {
  const st = phoneState(t);
  ctx.save();
  ctx.translate(st.pos[0], st.pos[1]);
  if (st.onTable) {
    // 平放：透视下是一条扁平的亮面
    ctx.fillStyle = '#0d0e10';
    ctx.beginPath(); ctx.ellipse(0, 0, 42, 9, 0, 0, Math.PI * 2); ctx.fill();
    if (over && st.lit > 0) { ctx.fillStyle = `rgba(200,218,245,${0.8 * st.lit})`; ctx.beginPath(); ctx.ellipse(0, -1, 36, 6, 0, 0, Math.PI * 2); ctx.fill(); }
  } else {
    ctx.rotate(0.35);
    ctx.fillStyle = '#0d0e10';
    ctx.fillRect(-8, -40, 16, 76);
    if (over && st.lit > 0) {
      ctx.fillStyle = `rgba(206,222,248,${0.85 * st.lit})`;
      ctx.fillRect(-10, -38, 4, 72);
    }
  }
  ctx.restore();
}

// 墙上的三句假设：很淡、失焦、慢慢漂——是想象，不是现实
const THOUGHTS = [
  { s: '没有回复', x: 1420, y: 280, t0: 28.8, sd: 1 },
  { s: '被讨厌', x: 1640, y: 400, t0: 29.6, sd: 2 },
  { s: '关系结束', x: 1460, y: 520, t0: 30.4, sd: 3 },
];
function thoughts(ctx, t) {
  for (const q of THOUGHTS) {
    const a = smooth(prog(t, q.t0, q.t0 + 0.8)) * (1 - smooth(prog(t, 31.4, 32.2)));
    if (a <= 0.01) continue;
    ctx.save();
    ctx.globalAlpha = a * 0.24;
    ctx.filter = 'blur(2.4px)';
    ctx.font = FONT.hand(64);
    ctx.fillStyle = '#c8d2e0';
    ctx.textAlign = 'center';
    ctx.fillText(q.s, q.x + noise1(t * 0.3, q.sd) * 14, q.y - (t - q.t0) * 6);
    ctx.restore();
  }
}

// ---------------- 结尾的手机特写：光标 → 门缝 ----------------
function closeUp(ctx, t) {
  const blink = Math.floor((t - CLOSE_T) * 2.4) % 2 === 0 ? 1 : 0.15;
  const grow = smooth(prog(t, 32.9, 33.6));
  phoneShell(ctx, { bg: 'bed', push: 1 + 0.02 * prog(t, CLOSE_T, 33.6) }, (x, sw, sh) => {
    chat(x, sw, sh, { text: 1, status: 1, cursor: grow > 0 ? 0 : blink });
  });
  // 手机暗下去，光标那一道光被拉长、变冷，移到下一幕门缝的位置
  if (grow > 0) {
    ctx.fillStyle = `rgba(8,9,11,${grow * 0.92})`;
    ctx.fillRect(0, 0, W, H);
    const [cx, cy] = phoneToScreen(CURSOR.x, CURSOR.y, 1.02);
    const x = lerp(cx, CRACK_X, smooth(prog(t, 33.05, 33.7)));
    const hgt = lerp(38, H * 1.1, grow);
    const wid = lerp(3, 7, grow);
    const col = [lerp(150, 236, grow), lerp(196, 244, grow), 255].map(Math.round);
    ctx.save();
    ctx.shadowColor = `rgba(${col.join(',')},0.9)`;
    ctx.shadowBlur = lerp(6, 40, grow);
    ctx.fillStyle = `rgb(${col.join(',')})`;
    ctx.fillRect(x - wid / 2, lerp(cy, H / 2, grow) - hgt / 2, wid, hgt);
    ctx.restore();
  }
}

function draw(ctx, t) {
  const a = smooth(prog(t, 26.3, 26.5));
  if (t >= CLOSE_T) { closeUp(ctx, t); return; }
  const c = cam(t);
  ctx.save();
  ctx.globalAlpha *= a;
  withCam(ctx, c, 1, () => {
    room(ctx, t);
    bed(ctx);
    person(ctx, HERO.x, HERO.y, HERO.u, heroPose(t));
    nightstand(ctx);
    phone(ctx, t, false);
  });
  ctx.restore();
}

function drawOver(ctx, t) {
  if (t >= CLOSE_T) return;
  const c = cam(t);
  ctx.save();
  ctx.globalAlpha *= smooth(prog(t, 26.3, 26.5));
  withCam(ctx, c, 1, () => { phone(ctx, t, true); thoughts(ctx, t); });
  ctx.restore();
}

// 光：只有手机屏幕（冷）；放在床头柜上时往墙上照；窗外一点点
function light(t) {
  if (t >= CLOSE_T) return [{ x: 1080, y: 540, rx: 720, ry: 780, i: 0.95, color: [196, 212, 238], core: 0.35, w: 1 - smooth(prog(t, 33.0, 33.5)) }];
  const c = cam(t);
  const st = phoneState(t);
  const w = smooth(prog(t, 26.3, 26.5));
  const [px, py] = toScreen(c, st.pos[0] - (st.onTable ? 0 : 30), st.pos[1] - (st.onTable ? 120 : 40));
  const [wx, wy] = toScreen(c, (WIN.x0 + WIN.x1) / 2, 320);
  return [
    { x: px, y: py, rx: (st.onTable ? 260 : 300) * c.s, ry: (st.onTable ? 380 : 320) * c.s, i: 0.95 * st.lit, w, color: [196, 214, 242], core: 0.2 },
    { x: wx, y: wy, rx: 360 * c.s, ry: 320 * c.s, i: 0.32, w, color: [150, 170, 210] },
    { x: W * 0.62, y: 360, rx: 900, ry: 420, i: 0.14, w, color: [170, 186, 214] },
    { x: toScreen(c, 600, 660)[0], y: toScreen(c, 600, 660)[1], rx: 520 * c.s, ry: 200 * c.s, i: 0.3, w, color: [150, 170, 210] },
  ];
}
function grade(t) { return { warm: -0.45, ambient: 0.115, w: smooth(prog(t, 26.3, 26.5)) }; }

module.exports = { ...S, draw, drawOver, light, grade, CRACK_X };
