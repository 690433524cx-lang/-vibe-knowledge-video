// 第六幕 · 41.6–51.8 秒：回闪 → 清空 → 第一锚词「提前难过」。
//   41.7–43.3 快速回闪（越来越快）：散场的客厅 / 空了的年夜饭 / 返程票 / 没有回复的消息 / 面试门口。
//            每一张都是那一幕里真实的画面（直接调用那一幕在某一时刻的画面和灯光），全片唯一一组硬切。
//   43.3 起   画面清空，只剩他坐在暗处，头顶一盏很弱的灯，光里有灰尘在浮。
//   48.5 起   墙上像旧放映机投出来一样，慢慢对焦出暗红的四个字：提前难过。
const { W, H } = require('../../../src/config');
const { FONT } = require('../../../src/lib/style');
const { prog, smooth, lerp, rng, noise1 } = require('../../../src/lib/util');
const { withCam, toScreen } = require('../lib');
const { person } = require('../people');

const S = { start: 41.6, end: 51.9 };
const SHOTS = (() => {
  const src = [['./p1_party', 6.0], ['./p2_newyear', 15.2], ['./p3_train', 24.35], ['./p4_message', 31.6], ['./p5_interview', 37.2]];
  const durs = [0.42, 0.36, 0.32, 0.28, 0.26];
  let t0 = 41.7;
  return src.map(([m, at], i) => { const s = { scene: require(m), at, t0, t1: t0 + durs[i] }; t0 += durs[i]; return s; });
})();
const EMPTY_T = SHOTS[SHOTS.length - 1].t1;   // ≈ 43.34
const ANCHOR_T = 48.5;
const shotAt = (t) => SHOTS.find((s) => t >= s.t0 && t < s.t1);

const HERO = { x: 1270, y: 742, u: 232 };
const FLOOR = 830;
const cam = (t) => { const k = smooth(prog(t, EMPTY_T, S.end)); return { cx: lerp(960, 1000, k), cy: 540, s: lerp(1.0, 1.06, k) }; };

function emptyRoom(ctx, t) {
  ctx.fillStyle = '#2a2622';
  ctx.fillRect(-300, -300, W + 600, FLOOR + 300);
  ctx.fillStyle = '#1e1b18';
  ctx.fillRect(-300, FLOOR, W + 600, H + 400);
  ctx.fillStyle = 'rgba(220,200,170,0.05)';
  ctx.fillRect(-300, FLOOR, W + 600, 2);
  // 一把椅子
  ctx.fillStyle = '#16120f';
  ctx.fillRect(HERO.x - 60, HERO.y + 6, 120, 12);
  ctx.fillRect(HERO.x - 56, HERO.y + 18, 8, FLOOR - HERO.y - 18);
  ctx.fillRect(HERO.x + 46, HERO.y + 18, 8, FLOOR - HERO.y - 18);
  ctx.fillRect(HERO.x + 46, HERO.y - 130, 8, 140);
  // 头顶的灯（只看到一根线和一个小灯罩）
  ctx.strokeStyle = 'rgba(20,16,14,0.9)'; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(HERO.x - 20, -300); ctx.lineTo(HERO.x - 20, 250); ctx.stroke();
  ctx.fillStyle = '#3a332b';
  ctx.beginPath(); ctx.moveTo(HERO.x - 44, 250); ctx.lineTo(HERO.x + 4, 250); ctx.lineTo(HERO.x + 20, 290); ctx.lineTo(HERO.x - 60, 290); ctx.closePath(); ctx.fill();
  person(ctx, HERO.x, HERO.y, HERO.u, { sit: true, face: 1, lean: 0.5, hd: 0.45, arms: { near: [0.3, 1.4], far: [0.25, 1.35] },
    top: '#4a5246', bottom: '#24221f', hair: '#120e0b', hairStyle: 'short', skin: '#86624a', light: -1.4, rim: 0.5 });
}

// 光里的灰尘
const DUST = (() => { const r = rng(606); return Array.from({ length: 46 }, () => ({ x: r(), y: r(), s: 0.6 + r() * 1.6, v: 0.2 + r() * 0.6, ph: r() * 6 })); })();
function dust(ctx, t) {
  for (const d of DUST) {
    const y = 290 + ((d.y * 560 + t * 12 * d.v) % 560);
    const spread = (y - 290) / 560;
    const x = HERO.x - 20 + (d.x - 0.5) * (60 + spread * 420) + Math.sin(t * d.v + d.ph) * 8;
    ctx.fillStyle = `rgba(255,230,190,${0.25 + 0.25 * Math.sin(t * 1.3 + d.ph)})`;
    ctx.beginPath(); ctx.arc(x, y, d.s, 0, Math.PI * 2); ctx.fill();
  }
}
// 很淡的光锥
function cone(ctx) {
  const g = ctx.createLinearGradient(0, 290, 0, FLOOR);
  g.addColorStop(0, 'rgba(255,224,180,0.10)'); g.addColorStop(1, 'rgba(255,224,180,0.02)');
  ctx.fillStyle = g;
  ctx.beginPath(); ctx.moveTo(HERO.x - 60, 290); ctx.lineTo(HERO.x + 20, 290); ctx.lineTo(HERO.x + 230, FLOOR); ctx.lineTo(HERO.x - 290, FLOOR); ctx.closePath(); ctx.fill();
}

// 墙上的投影：一块很淡的暖光框 + 从虚到实对焦的四个字，暗红，带一点放映的光晕与闪烁
const AX = 660, AY = 470;
function anchor(ctx, t) {
  const a = smooth(prog(t, ANCHOR_T, ANCHOR_T + 0.5)) * (1 - smooth(prog(t, 51.4, 51.85)));
  if (a <= 0.01) return;
  const focus = 1 - smooth(prog(t, ANCHOR_T, ANCHOR_T + 1.1));
  const flick = 0.93 + 0.07 * noise1(t * 18, 61);
  ctx.save();
  ctx.globalAlpha = a * flick;
  // 投影出来的光框（很淡）
  const g = ctx.createRadialGradient(AX, AY - 50, 40, AX, AY - 50, 520);
  g.addColorStop(0, 'rgba(255,226,180,0.12)'); g.addColorStop(1, 'rgba(255,226,180,0)');
  ctx.fillStyle = g;
  ctx.fillRect(AX - 560, AY - 380, 1120, 660);
  ctx.font = FONT.brush(168);
  ctx.letterSpacing = '26px';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';
  // 光晕（halation）：一层模糊的暖红
  ctx.filter = `blur(${(10 + focus * 14).toFixed(1)}px)`;
  ctx.fillStyle = 'rgba(190,70,50,0.45)';
  ctx.fillText('提前难过', AX + 13, AY);
  ctx.filter = `blur(${(focus * 9).toFixed(1)}px)`;
  ctx.fillStyle = '#a3362a';
  ctx.fillText('提前难过', AX + 13, AY);
  ctx.restore();
}

function draw(ctx, t) {
  const sh = shotAt(t);
  if (sh) { sh.scene.draw(ctx, sh.at + (t - sh.t0) * 0.6, {}); return; }
  if (t < EMPTY_T) return;
  const c = cam(t);
  ctx.save();
  ctx.globalAlpha *= smooth(prog(t, EMPTY_T, EMPTY_T + 0.5)) * (1 - smooth(prog(t, 51.45, 51.9)));
  withCam(ctx, c, 1, () => emptyRoom(ctx, t));
  ctx.restore();
}
function drawOver(ctx, t) {
  const sh = shotAt(t);
  if (sh) {
    if (sh.scene.drawOver) sh.scene.drawOver(ctx, sh.at + (t - sh.t0) * 0.6, {});
    // 每次切换：一帧放映机的暗闪
    if (t - sh.t0 < 1 / 30) { ctx.fillStyle = 'rgba(0,0,0,0.5)'; ctx.fillRect(0, 0, W, H); }
    return;
  }
  if (t < EMPTY_T) return;
  const c = cam(t);
  ctx.save();
  ctx.globalAlpha *= smooth(prog(t, EMPTY_T, EMPTY_T + 0.5)) * (1 - smooth(prog(t, 51.45, 51.9)));
  withCam(ctx, c, 1, () => { cone(ctx); dust(ctx, t); anchor(ctx, t); });
  ctx.restore();
}

function light(t) {
  const sh = shotAt(t);
  if (sh) return sh.scene.light(sh.at + (t - sh.t0) * 0.6);
  const c = cam(t);
  const w = smooth(prog(t, EMPTY_T, EMPTY_T + 0.5)) * (1 - smooth(prog(t, 51.45, 51.9)));
  const sc = (x, y) => toScreen(c, x, y);
  const [px, py] = sc(HERO.x - 20, 640);
  const [fx, fy] = sc(HERO.x - 30, FLOOR + 10);
  const [ax, ay] = sc(AX, AY - 60);
  const an = smooth(prog(t, ANCHOR_T, ANCHOR_T + 0.6));
  return [
    { x: px, y: py, rx: 260 * c.s, ry: 420 * c.s, i: 0.8, w, color: [255, 210, 160], core: 0.2 },
    { x: fx, y: fy, rx: 330 * c.s, ry: 70 * c.s, i: 0.55, w, color: [255, 210, 160] },
    { x: ax, y: ay, rx: 560 * c.s, ry: 300 * c.s, i: 0.4, w: w * an, color: [255, 214, 170] },
  ];
}
function grade(t) {
  const sh = shotAt(t);
  if (sh) return sh.scene.grade(sh.at + (t - sh.t0) * 0.6);
  return { warm: 0.2, ambient: 0.07, w: 1 };
}

module.exports = { ...S, draw, drawOver, light, grade };
