// 第三幕 · 10.9–21 秒：外卖、衣服、购物车缩成桌上的三张旧档案卡，一根暗红线连起来。
// 中间那张卡变成「一扇门」——没得选的时候，我们想要选择；
// 一扇门又展开成一整排——真的有得选了，我们又开始害怕。
const { W, H } = require('../../../src/config');
const { C, FONT } = require('../../../src/lib/style');
const { pencil, typeText, sketchEllipse } = require('../../../src/lib/draw');
const { prog, smooth, easeInOut, easeOut, lerp, rng } = require('../../../src/lib/util');
const props = require('../../../src/lib/props');

const S = { start: 10.85, end: 22.0 };

const CARDS = [
  { x: 560, rot: -0.04, no: 'NO. 1', label: '外卖', note: '看了 36 家', icon: 'bowl', pin: [500, 418] },
  { x: 960, rot: 0.02, no: 'NO. 2', label: '衣服', note: '看了 12 款', icon: 'shirt', pin: [960, 412] },
  { x: 1360, rot: 0.035, no: 'NO. 3', label: '购物车', note: '已下单 0 件', icon: 'cart', pin: [1410, 420] },
];
const CY = 520, CW = 320, CH = 220;
const DOOR = { x: 960, floor: 790, w: 240, h: 470 };

function icon(ctx, kind, t) {
  const o = { t, width: 1.6, color: C.graphite, passes: 1 };
  if (kind === 'bowl') {
    pencil(ctx, [[-34, -6], [34, -6], [24, 20], [-24, 20], [-34, -6]], { ...o, seed: 701 });
    pencil(ctx, [[-8, -14], [-4, -30]], { ...o, seed: 702 });
    pencil(ctx, [[8, -14], [12, -30]], { ...o, seed: 703 });
  } else if (kind === 'shirt') {
    pencil(ctx, [[-14, -26], [14, -26], [34, -16], [26, -2], [18, -6], [18, 26], [-18, 26], [-18, -6], [-26, -2], [-34, -16], [-14, -26]], { ...o, seed: 704 });
  } else {
    pencil(ctx, [[-40, -24], [-30, -24], [-20, 16], [30, 16]], { ...o, seed: 705 });
    pencil(ctx, [[-28, -14], [40, -14], [32, 8], [-22, 8]], { ...o, seed: 706 });
    sketchEllipse(ctx, -14, 26, 5, 5, { ...o, seed: 707 });
    sketchEllipse(ctx, 26, 26, 5, 5, { ...o, seed: 708 });
  }
}

function archiveCard(ctx, c, t, a) {
  props.paper(ctx, CW, CH, { color: '#dbd0b5', shadow: 0.5 });
  ctx.globalAlpha *= a;
  typeText(ctx, c.no, -CW / 2 + 22, -CH / 2 + 34, { font: FONT.type(20), color: C.gray, seed: 720 });
  ctx.save();
  ctx.translate(-CW / 2 + 82, 4);
  icon(ctx, c.icon, t);
  ctx.restore();
  ctx.font = FONT.serif(36);
  ctx.fillStyle = C.ink;
  ctx.fillText(c.label, -CW / 2 + 150, 0);
  ctx.font = FONT.serif(22);
  ctx.fillStyle = C.brown;
  ctx.fillText(c.note, -CW / 2 + 150, 44);
}

// 门的排布：中间一扇，两侧依次展开
const ROW = Array.from({ length: 13 }, (_, i) => i - 6);
const R = rng(919);
const ROW_OPEN = ROW.map(() => 0.35 + R() * 0.6);
const ROW_SIDE = ROW.map(() => (R() < 0.5 ? -1 : 1));

// 镜头：「害怕」时门向观众压过来
function camS(t) { return lerp(1, 1.09, easeInOut(prog(t, 16.9, 19.0))); }

function draw(ctx, t) {
  // 三张档案卡
  const cardsIn = easeOut(prog(t, 10.9, 11.5));
  const side = easeInOut(prog(t, 12.4, 13.2));
  CARDS.forEach((c, i) => {
    if (i === 1 && t > 12.4) return; // 中间那张交给门
    const a = smooth(prog(t, 10.9, 11.4)) * (1 - side);
    if (a <= 0) return;
    ctx.save();
    ctx.globalAlpha *= a;
    ctx.translate(c.x + (i - 1) * side * 140, CY + side * 30);
    ctx.rotate(c.rot);
    ctx.scale(lerp(0.7, 1, cardsIn), lerp(0.7, 1, cardsIn));
    archiveCard(ctx, c, t, smooth(prog(t, 10.95, 11.25)));
    ctx.restore();
  });
  // 暗红细线
  const tk = prog(t, 11.6, 12.3);
  if (tk > 0 && side < 1) {
    const pts = [];
    for (let i = 0; i < 2; i++) {
      const a = CARDS[i].pin, b = CARDS[i + 1].pin;
      for (let k = i ? 1 : 0; k <= 16; k++) {
        const f = k / 16;
        pts.push([lerp(a[0], b[0], f), lerp(a[1], b[1], f) + Math.sin(f * Math.PI) * 22]);
      }
    }
    pencil(ctx, pts, { seed: 730, t, width: 2.2, color: C.subRed, progress: tk, alpha: 1 - side, passes: 1 });
    CARDS.forEach((c) => {
      ctx.save();
      ctx.globalAlpha *= (1 - side) * smooth(prog(t, 11.5, 11.7));
      ctx.fillStyle = '#6e1f19';
      ctx.beginPath(); ctx.arc(c.pin[0], c.pin[1], 6, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
    });
  }

  if (t < 12.4) return;
  // 中间那张卡 → 一扇门
  const m = easeInOut(prog(t, 12.4, 13.2));
  const s = camS(t);
  ctx.save();
  ctx.translate(W / 2, DOOR.floor);
  ctx.scale(s, s);
  ctx.translate(-W / 2, -DOOR.floor);
  // 地面线
  pencil(ctx, [[-100, DOOR.floor], [W + 100, DOOR.floor]], { seed: 740, t, width: 1, color: C.lightSoft, alpha: m * 0.6, passes: 1 });
  const unfold = (k) => easeInOut(prog(t, 15.3 + Math.abs(k) * 0.07, 15.9 + Math.abs(k) * 0.07));
  const darkOut = (k) => (k === -1 || k === 1 ? 0 : smooth(prog(t, 19.2, 20.2)));
  for (const k of ROW) {
    if (k === 0) continue;
    const u = unfold(k);
    if (u <= 0) continue;
    ctx.save();
    ctx.translate(lerp(DOOR.x, DOOR.x + k * 205, u), DOOR.floor);
    props.door(ctx, lerp(DOOR.w, 160, u), lerp(DOOR.h, 320, u), {
      open: ROW_OPEN[k + 6] * smooth(prog(t, 15.7, 16.4)) * (1 + 0.15 * smooth(prog(t, 17.0, 18.4))), side: ROW_SIDE[k + 6], t, seed: 760 + k,
      alpha: u * (1 - darkOut(k)), glow: 0.9,
    });
    ctx.restore();
  }
  // 中间那扇
  if (m < 1) {
    const x = DOOR.x, y = lerp(CY, DOOR.floor - DOOR.h / 2, m), w = lerp(CW, DOOR.w, m), h = lerp(CH, DOOR.h, m);
    const col = [219, 208, 181].map((v, i) => Math.round(lerp(v, [44, 33, 25][i], m)));
    ctx.fillStyle = `rgb(${col.join(',')})`;
    ctx.fillRect(x - w / 2, y - h / 2, w, h);
  } else {
    const u = unfold(0);
    ctx.save();
    ctx.translate(DOOR.x, DOOR.floor);
    props.door(ctx, lerp(DOOR.w, 170, u), lerp(DOOR.h, 340, u), {
      open: 0.5 * smooth(prog(t, 15.7, 16.4)), side: 1, t, seed: 750, alpha: 1 - smooth(prog(t, 19.2, 20.2)),
    });
    ctx.restore();
  }
  ctx.restore();

  // 门前一个很小的背影：想要选择时往前一步；真的有得选了，又退了半步
  const fa = smooth(prog(t, 12.9, 13.5)) * (1 - smooth(prog(t, 19.4, 20.2)));
  if (fa > 0) {
    const fwd = easeInOut(prog(t, 14.2, 14.9)), back = easeInOut(prog(t, 17.2, 18.3));
    const y = 930 - fwd * 18 + back * 26;
    const sc = 1 - fwd * 0.05 + back * 0.1;
    ctx.save();
    ctx.translate(960, y);
    props.figure(ctx, 200 * sc, { t, alpha: fa, walk: 0 });
    ctx.restore();
  }
}

function light(t) {
  const m = easeInOut(prog(t, 12.4, 13.2));
  const u = easeInOut(prog(t, 15.3, 16.2));
  const f = easeInOut(prog(t, 17.0, 18.6));
  return {
    x: 960, y: lerp(lerp(520, 640, m), 600, u), rx: lerp(lerp(900, 520, m), 1150, u) - f * 260, ry: lerp(lerp(420, 470, m), 470, u),
    i: 1, w: smooth(prog(t, 10.85, 11.3)),
  };
}

module.exports = { ...S, draw, light };
