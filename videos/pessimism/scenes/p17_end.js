// 结尾 · 108.0–114.0 秒：回到开头那间客厅，构图与第一幕几乎一样。
//   桌上还是那些杯子，房间还是安静，人还是一个人。但这次他不再一直坐着：
//   108.5 站起来（慢、有重量）→ 109.4 弯腰把杯子收到一起 → 110.7 转身，关掉桌边那盏小灯（屋里暗一档，
//   窗外的城市成为主光）→ 111.2 走到窗边 → 站定。窗外的城市仍然亮着。
//   字幕：你可以知道。/ 快乐会结束。/ 但不用在快乐开始的时候—— / 就提前难过。（停到结尾）
//   最后黑场之前，右下角极小的「悲观主义」，像一本书最后一页的章节名。
const { W, H, DESIGN_END } = require('../../../src/config');
const { FONT } = require('../../../src/lib/style');
const { prog, smooth, lerp, easeInOut } = require('../../../src/lib/util');
const { withCam, toScreen, glassShape } = require('../lib');
const { person } = require('../people');
const party = require('./p1_party');

const S = { start: 107.95, end: DESIGN_END + 0.1 };
const U = 300, SEAT_Y = 640, FEET_Y = 790;
const TLAMP = { x: 1418, y: 792 };       // 茶几右端的小台灯
const OFF_T = 110.95;
const GLASSES = [[905, 812], [1150, 826], [990, 846]].map(([x, y], i) => ({ x, y, to: [1210 + i * 30, 818 - (i % 2) * 6], i }));

const cam = (t) => { const k = easeInOut(prog(t, 108.0, 114.0)); return { cx: lerp(960, 990, k), cy: lerp(540, 530, k), s: lerp(1.02, 0.97, k) }; };

// 他的动作：坐 → 起身 → 弯腰收杯子 → 转身关灯 → 走到窗边 → 站定
function hero(t) {
  const look = { top: '#4a5246', bottom: '#24221f', hair: '#120e0b', hairStyle: 'short', skin: '#86624a' };
  const up = easeInOut(prog(t, 108.5, 109.35));
  const bend = Math.sin(Math.PI * prog(t, 109.4, 110.6));
  const turn = t > 110.65;
  const reach = Math.sin(Math.PI * prog(t, 110.7, 111.15));
  const walk = prog(t, 111.25, 112.65);
  const standX = 1288;
  let x = lerp(1400, standX, up), y = lerp(SEAT_Y, FEET_Y - 0.97 * U, up);
  if (walk > 0) x = lerp(standX, 1590, easeInOut(walk));
  const ph = walk > 0 && walk < 1 ? walk * Math.PI * 2 * 3.2 : 0;
  const stride = walk > 0 && walk < 1 ? Math.sin(Math.PI * walk) : 0;
  y += stride * Math.abs(Math.sin(ph)) * -4;
  const legs = up < 1
    ? { near: [lerp(1.45, 0, up), lerp(1.45, 0, up)], far: [lerp(1.4, 0, up), lerp(1.4, 0, up)] }
    : { near: [Math.sin(ph) * 0.35 * stride + bend * 0.25, Math.max(0, -Math.cos(ph)) * 0.45 * stride + bend * 0.5], far: [-Math.sin(ph) * 0.35 * stride + bend * 0.15, Math.max(0, Math.cos(ph)) * 0.45 * stride + bend * 0.35] };
  const lean = up < 1 ? lerp(0.5, 0.12, up) : 0.08 + bend * 0.85 + reach * 0.35;
  const arms = up < 1
    ? { near: [lerp(0.3, 0.1, up), lerp(1.4, 0.3, up)], far: [lerp(0.25, 0.1, up), lerp(1.35, 0.3, up)] }
    : { near: [0.1 + bend * 0.7 + reach * 1.0 - Math.sin(ph) * 0.3 * stride, 0.3 + bend * 0.2], far: [0.1 + bend * 0.5 + Math.sin(ph) * 0.3 * stride, 0.3] };
  const atWindow = smooth(prog(t, 112.5, 113.0));
  return { x, y, p: { sit: true, face: turn ? -1 : 1, lean, hd: up < 1 ? lerp(0.4, 0.05, up) : 0.05 + bend * 0.2 - atWindow * 0.12, legs, arms, ...look,
    light: turn ? -0.6 : -2.4, rim: turn ? 0.55 : 0.4, rimCol: t > OFF_T ? [190, 206, 236] : [255, 214, 160] } };
}

function tableLamp(ctx, t) {
  ctx.save();
  ctx.translate(TLAMP.x, TLAMP.y);
  ctx.fillStyle = '#1e1a16';
  ctx.beginPath(); ctx.ellipse(0, 0, 26, 7, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillRect(-3, -70, 6, 70);
  ctx.beginPath(); ctx.moveTo(-28, -112); ctx.lineTo(28, -112); ctx.lineTo(40, -66); ctx.lineTo(-40, -66); ctx.closePath();
  ctx.fillStyle = t < OFF_T ? '#d8c09a' : '#5a5046';
  ctx.fill();
  ctx.restore();
}
function lampGlow(ctx, t) {
  if (t >= OFF_T) return;
  ctx.save();
  ctx.globalCompositeOperation = 'screen';
  const g = ctx.createRadialGradient(TLAMP.x, TLAMP.y - 88, 0, TLAMP.x, TLAMP.y - 88, 90);
  g.addColorStop(0, 'rgba(255,226,170,0.7)'); g.addColorStop(1, 'rgba(255,200,130,0)');
  ctx.fillStyle = g; ctx.fillRect(TLAMP.x - 90, TLAMP.y - 178, 180, 180);
  ctx.restore();
}

function draw(ctx, t) {
  const c = cam(t);
  ctx.save();
  ctx.globalAlpha *= smooth(prog(t, 108.0, 108.45));
  withCam(ctx, c, 1, () => {
    party.setStatic({ close: 1, hall: 0, strings: 0 });
    party.wall(ctx);
    party.windowFrame(ctx, t);
    party.floor(ctx);
    party.sofa(ctx);
    const h = hero(t);
    const beforeTable = h.x > 1460 || t > 111.4;     // 走到茶几右边以后画在茶几前面
    if (!beforeTable) person(ctx, h.x, h.y, U, h.p);
    party.lamp(ctx, t);
    party.table(ctx, t, { minimal: true, mess: 0 });
    tableLamp(ctx, t);
    // 他把杯子收到一起
    for (const g of GLASSES) {
      const k = easeInOut(prog(t, 109.7 + g.i * 0.18, 110.25 + g.i * 0.18));
      ctx.save(); ctx.translate(lerp(g.x, g.to[0], k), lerp(g.y, g.to[1], k)); glassShape(ctx, 46, 80, { fill: 0.12, liquid: [150, 60, 36] }); ctx.restore();
    }
    if (beforeTable) person(ctx, h.x, h.y, U, h.p);
    party.setStatic(null);
  });
  ctx.restore();
}

function drawOver(ctx, t) {
  const c = cam(t);
  ctx.save();
  ctx.globalAlpha *= smooth(prog(t, 108.0, 108.45));
  withCam(ctx, c, 1, () => { party.cityLights(ctx, t); lampGlow(ctx, t); });
  ctx.restore();
  // 尾题：像一本书最后一页的章节名
  const a = smooth(prog(t, 113.0, 113.35)) * (1 - smooth(prog(t, DESIGN_END - 0.35, DESIGN_END - 0.05)));
  if (a > 0) {
    ctx.save();
    ctx.globalAlpha = a * 0.7;
    ctx.font = FONT.serif(24);
    ctx.letterSpacing = '12px';
    ctx.textAlign = 'right';
    ctx.fillStyle = '#d8ccb6';
    ctx.fillText('悲观主义', W - 120, H - 92);
    ctx.restore();
  }
}

// 光：先是茶几上那盏小灯（暖）；关灯以后只剩窗外的城市（冷），他站在窗前成为剪影
function light(t) {
  const c = cam(t);
  const w = smooth(prog(t, 108.0, 108.45));
  const on = t < OFF_T ? 1 : 0;
  const sc = (x, y) => toScreen(c, x, y);
  const [lx, ly] = sc(TLAMP.x - 80, 700);
  const [wx, wy] = sc(1615, 300);
  const [hx, hy] = sc(hero(t).x, 520);
  const [rx, ry] = sc(1050, 760);
  return [
    { x: lx, y: ly, rx: 620 * c.s, ry: 440 * c.s, i: 0.95 * on, w, color: [255, 204, 146], core: 0.22 },
    { x: rx, y: ry, rx: 520 * c.s, ry: 220 * c.s, i: 0.5 * on, w, color: [255, 200, 140] },
    { x: wx, y: wy, rx: 380 * c.s, ry: 420 * c.s, i: on ? 0.5 : 0.85, w, color: [176, 196, 230] },
    { x: hx, y: hy, rx: 260 * c.s, ry: 380 * c.s, i: on ? 0.4 : 0.5, w, color: on ? [255, 210, 160] : [180, 198, 232] },
    { x: W * 0.5, y: H * 0.5, rx: 1400, ry: 700, i: on ? 0.12 : 0.18, w, color: [170, 186, 214] },
  ];
}
function grade(t) { return { warm: t < OFF_T ? 0.35 : -0.15, ambient: t < OFF_T ? 0.12 : 0.1 }; }

module.exports = { ...S, draw, drawOver, light, grade };
