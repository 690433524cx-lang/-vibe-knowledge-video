// 结尾（最终精修版）· 107.4–119.1 秒（设计时间）：散场以后，回到开头那间客厅。
//   桌上是喝剩的杯子、盘子、纸巾和吃剩的东西；门关着，灯串熄了，只有窗外城市的冷光。他一个人坐在沙发上。
//   108.0 慢慢站起来 → 109.3 弯腰拿起一只杯子 → 110.3 停住，看着手里的杯子 → 111.6 抬头看这间屋子
//   → 112.9 拿着杯子走到墙边那盏没开的小台灯旁 → 115.5 伸手 → 116.3 打开它。
//   灯很小、很暖、很克制：只照亮小桌、他的半边和身边一小块墙，不是阳光，也不是升华的光。
//   开灯以后停 2.1 s，画面自然淡出（引擎 CLOSE_FADE 0.7 s）。最后一句「别先离开。」在字幕里，小一号、暖白。没有 CTA、没有尾题。
const { W, H } = require('../../../src/config');
const { prog, smooth, lerp, easeInOut } = require('../../../src/lib/util');
const { withCam, toScreen, glassShape } = require('../lib');
const { person } = require('../people');
const party = require('./p1_party');

const S = { start: 107.4, end: 119.15 };
const U = 300, SEAT_Y = 640, FEET_Y = 790;
const SIDE = { x: 780, top: 590, floor: 704 };          // 墙边的小桌
const SL = { x: 772, y: 590 };                          // 小台灯（底座）
const ON_T = 116.3;
const STAND_X = 1290, LAMP_X = 900;                     // 他站起来的位置 / 停在小灯旁边的位置
const CUP = { x: 1195, y: 822 };                        // 桌上那只杯子（他拿起来的那只）
const on = (t) => smooth(prog(t, ON_T, ON_T + 0.22));
const fadeIn = (t) => smooth(prog(t, 107.4, 107.6));

const cam = (t) => { const k = easeInOut(prog(t, 107.4, 119.5)); return { cx: lerp(1040, 990, k), cy: lerp(545, 535, k), s: lerp(1.04, 1.08, k) }; };

// 他的动作
function hero(t) {
  const look = { top: '#4a5246', bottom: '#24221f', hair: '#120e0b', hairStyle: 'short', skin: '#86624a' };
  const up = easeInOut(prog(t, 108.0, 109.2));                       // 站起来（慢、有重量）
  const bend = Math.sin(Math.PI * prog(t, 109.3, 110.4));            // 弯腰拿杯子
  const holding = t > 109.9;
  const pause = smooth(prog(t, 110.4, 110.8)) * (1 - smooth(prog(t, 111.4, 111.8)));   // 看着手里的杯子
  const lookRoom = smooth(prog(t, 111.6, 112.3));                    // 抬头，看这间屋子
  const walk = prog(t, 112.9, 115.3);
  const reach = smooth(prog(t, 115.5, 116.2)) * (1 - smooth(prog(t, 116.7, 117.4)));
  let x = lerp(1400, STAND_X, up), y = lerp(SEAT_Y, FEET_Y - 0.97 * U, up);
  if (walk > 0) x = lerp(STAND_X, LAMP_X, easeInOut(walk));
  const ph = walk > 0 && walk < 1 ? walk * Math.PI * 2 * 2.6 : 0;
  const stride = walk > 0 && walk < 1 ? Math.sin(Math.PI * walk) : 0;
  y += stride * Math.abs(Math.sin(ph)) * -4;
  const legs = up < 1
    ? { near: [lerp(1.45, 0, up), lerp(1.45, 0, up)], far: [lerp(1.4, 0, up), lerp(1.4, 0, up)] }
    : { near: [Math.sin(ph) * 0.32 * stride + bend * 0.25, Math.max(0, -Math.cos(ph)) * 0.42 * stride + bend * 0.5], far: [-Math.sin(ph) * 0.32 * stride + bend * 0.15, Math.max(0, Math.cos(ph)) * 0.42 * stride + bend * 0.35] };
  const lean = up < 1 ? lerp(0.5, 0.12, up) : 0.06 + bend * 0.8;
  // 近手：拿杯子（拿起来以后举在胸前）；远手：最后伸向台灯
  const near = up < 1 ? [lerp(0.3, 0.1, up), lerp(1.4, 0.3, up)]
    : holding ? [0.35 + pause * 0.15 - Math.sin(ph) * 0.12 * stride, 1.55 + pause * 0.25] : [0.1 + bend * 0.85, 0.3 + bend * 0.2];
  const far = up < 1 ? [lerp(0.25, 0.1, up), lerp(1.35, 0.3, up)] : [0.1 + Math.sin(ph) * 0.3 * stride + reach * 1.2, 0.3 + reach * 0.2];
  const face = t < 111.6 ? 1 : -1;        // 先朝着桌子；抬头看屋子时转过来，之后朝小灯走
  const hd = up < 1 ? lerp(0.4, 0.08, up) : 0.08 + bend * 0.2 + pause * 0.3 - lookRoom * 0.12 + reach * 0.06;
  return { x, y, holding, p: { sit: true, face, lean, hd, legs, arms: { near, far }, ...look, holding: holding ? 'glass' : null,
    light: face === 1 ? -2.4 : -0.7, rim: 0.5, rimCol: on(t) > 0.5 ? [255, 214, 160] : [190, 206, 236] } };
}

function sideTable(ctx, t) {
  ctx.fillStyle = '#241b14';
  ctx.fillRect(SIDE.x - 70, SIDE.top, 140, 14);
  ctx.fillStyle = '#1a140f';
  ctx.fillRect(SIDE.x - 62, SIDE.top + 14, 8, SIDE.floor - SIDE.top - 14);
  ctx.fillRect(SIDE.x + 54, SIDE.top + 14, 8, SIDE.floor - SIDE.top - 14);
  ctx.fillRect(SIDE.x - 62, SIDE.top + 60, 124, 6);
  // 小台灯：底座、细杆、布灯罩（没开的时候是暗的）
  ctx.save();
  ctx.translate(SL.x, SL.y);
  ctx.fillStyle = '#1e1a16';
  ctx.beginPath(); ctx.ellipse(0, 0, 24, 6, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillRect(-3, -64, 6, 64);
  ctx.beginPath(); ctx.moveTo(-26, -104); ctx.lineTo(26, -104); ctx.lineTo(38, -60); ctx.lineTo(-38, -60); ctx.closePath();
  const k = on(t);
  ctx.fillStyle = `rgb(${Math.round(lerp(78, 226, k))},${Math.round(lerp(70, 196, k))},${Math.round(lerp(62, 150, k))})`;
  ctx.fill();
  ctx.restore();
}

function draw(ctx, t) {
  const c = cam(t);
  ctx.save();
  ctx.globalAlpha *= fadeIn(t);
  withCam(ctx, c, 1, () => {
    party.setStatic({ close: 1, hall: 0, strings: 0 });
    const h = hero(t);
    party.drawRoom(ctx, 6.6, { people: false, hero: false, table: false });
    // 他在桌子和沙发之间：先画他，再画桌子（盖住他的腿）
    sideTable(ctx, t);
    person(ctx, h.x, h.y, U, h.p);
    party.table(ctx, t, { mess: 1, hide: h.holding ? ['glassR'] : [] });
    party.setStatic(null);
  });
  ctx.restore();
}

function drawOver(ctx, t) {
  const c = cam(t);
  ctx.save();
  ctx.globalAlpha *= fadeIn(t);
  withCam(ctx, c, 1, () => {
    party.cityLights(ctx, t);
    // 灯罩透出来的一点光（很小）
    const k = on(t);
    if (k > 0) {
      ctx.save();
      ctx.globalCompositeOperation = 'screen';
      const g = ctx.createRadialGradient(SL.x, SL.y - 82, 0, SL.x, SL.y - 82, 70);
      g.addColorStop(0, `rgba(255,222,166,${0.55 * k})`); g.addColorStop(1, 'rgba(255,200,130,0)');
      ctx.fillStyle = g; ctx.fillRect(SL.x - 70, SL.y - 152, 140, 140);
      ctx.restore();
    }
  });
  ctx.restore();
}

// 光：开灯之前只有窗外城市的冷光（他是一个安静的剪影，但看得清）；开灯以后，一小圈暖光
function light(t) {
  const c = cam(t);
  const w = fadeIn(t);
  const k = on(t);
  const sc = (x, y) => toScreen(c, x, y);
  const h = hero(t);
  const [wx, wy] = sc(1615, 300);
  const [hx, hy] = sc(h.x, 520);
  const [tx, ty] = sc(1000, 800);
  const [lx, ly] = sc(SL.x + 30, SL.y - 60);
  return [
    { x: wx, y: wy, rx: 420 * c.s, ry: 460 * c.s, i: 0.8, w, color: [176, 196, 230] },
    { x: hx, y: hy, rx: 300 * c.s, ry: 420 * c.s, i: lerp(0.62, 0.4, k), w, color: [184, 200, 232] },
    { x: tx, y: ty, rx: 760 * c.s, ry: 260 * c.s, i: 0.45, w, color: [176, 192, 224] },
    { x: W * 0.5, y: H * 0.45, rx: 1400, ry: 700, i: 0.16, w, color: [170, 186, 214] },
    // 小台灯：一小圈
    { x: lx, y: ly, rx: 380 * c.s, ry: 330 * c.s, i: 0.95 * k, w, color: [255, 202, 140], core: 0.25 },
  ];
}
function grade(t) { return { warm: lerp(-0.2, 0.1, on(t)), ambient: 0.13 }; }

module.exports = { ...S, draw, drawOver, light, grade };
