// 第三幕 · 10.9–21 秒：
//   桌上三件旧物（外卖单、吊牌、购物车便签），一根暗红线把它们串起来——奇怪的是。
//   吊牌长成一扇门，门的打孔变成门把手；门前一个很小的背影——没得选的时候，我们想要选择。
//   摄影机后退：一条两侧全是门的走廊——真的有得选了，我们又开始害怕。
const { W, H } = require('../../../src/config');
const { C, FONT } = require('../../../src/lib/style');
const { pencil } = require('../../../src/lib/draw');
const { prog, smooth, easeInOut, easeOut, lerp, rng, noise1 } = require('../../../src/lib/util');
const { spring } = require('../../../src/lib/motion');
const { sheet, inkText } = require('../../../src/lib/material');
const { door, figure, jit } = require('../lib');
const shop = require('./c2_shop');

const S = { start: 10.85, end: 21.2 };

// ---------------- 桌上的三件旧物 ----------------
const FLYER = { x: 470, y: 640, w: 330, h: 440, rot: -0.07 };
const TAG = { x: 860, y: 560, w: 178, h: 262, rot: 0.11 };
const NOTE = { x: 1170, y: 690, s: 0.6, rot: -0.04 };
const PINS = [[470, 448], [858, 450], [1176, 584]];

function flyer(ctx, t) {
  sheet(ctx, FLYER.w, FLYER.h, { seed: 811, tone: 'warm', light: -2.4, lift: 0.05, shade: 0.6, crease: true });
  inkText(ctx, '外卖菜单', -FLYER.w / 2 + 30, -FLYER.h / 2 + 58, { font: FONT.serif(30), color: '#2a221c', seed: 812, wear: 0.6, spacing: 4 });
  const r = rng(813);
  for (let i = 0; i < 9; i++) {
    const y = -FLYER.h / 2 + 100 + i * 34;
    ctx.fillStyle = 'rgba(50,40,32,0.55)';
    ctx.fillRect(-FLYER.w / 2 + 30, y, 90 + r() * 90, 6);
    ctx.fillRect(FLYER.w / 2 - 70, y, 40, 6);
  }
  // 杯底留下的一圈咖啡渍
  ctx.strokeStyle = 'rgba(120,80,40,0.22)';
  ctx.lineWidth = 6;
  ctx.beginPath(); ctx.ellipse(60, 120, 52, 48, 0.2, 0.3, Math.PI * 1.85); ctx.stroke();
  // 用铅笔勾掉了几家
  for (let i = 0; i < 4; i++) pencil(ctx, [[-FLYER.w / 2 + 24, -FLYER.h / 2 + 103 + i * 68], [-FLYER.w / 2 + 210, -FLYER.h / 2 + 99 + i * 68]], { seed: 820 + i, t, width: 1.6, color: 'rgba(48,40,34,0.7)', passes: 1, pressure: 0.6 });
}

function drawDesk(ctx, t) {
  const inK = spring(t, 10.9, 1.6, 0.9);
  const leave = easeInOut(prog(t, 12.35, 13.1));
  if (leave >= 1) return;
  ctx.save();
  // 摄影机向上摇：桌面滑出画面下方
  ctx.translate(0, leave * 520);
  ctx.globalAlpha *= Math.min(1, inK * 1.4) * (1 - leave * 0.6);
  ctx.save();
  ctx.translate(FLYER.x, FLYER.y);
  ctx.rotate(FLYER.rot);
  flyer(ctx, t);
  ctx.restore();
  // 购物车便签：从第二幕的位置缩小落下
  const m = spring(t, 10.9, 1.4, 1.0);
  ctx.save();
  ctx.translate(lerp(shop.NOTE.x, NOTE.x, m), lerp(shop.NOTE.y, NOTE.y, m));
  ctx.rotate(lerp(shop.NOTE.rot, NOTE.rot, m));
  ctx.scale(lerp(1, NOTE.s, m), lerp(1, NOTE.s, m));
  shop.cartNote(ctx, Math.max(t, 10.8));
  ctx.restore();
  ctx.restore();
  // 中间的吊牌：12.35 后不随桌面下滑，而是长成门
  if (t < 12.35) {
    ctx.save();
    ctx.globalAlpha *= Math.min(1, inK * 1.4);
    ctx.translate(TAG.x, TAG.y);
    ctx.rotate(TAG.rot);
    sheet(ctx, TAG.w, TAG.h, { seed: 601, tone: 'bone', light: -2.2, lift: 0.1, shade: 0.6, rough: 2 });
    ctx.fillStyle = '#16110e';
    ctx.beginPath(); ctx.arc(0, -TAG.h / 2 + 22, 7, 0, Math.PI * 2); ctx.fill();
    inkText(ctx, '黑色', 0, 70, { font: FONT.serif(32), color: '#2a221c', align: 'center', seed: 600, wear: 0.4, spacing: 2 });
    ctx.restore();
  }
  // 暗红细线 + 图钉
  const tk = prog(t, 11.55, 12.25);
  if (tk > 0) {
    ctx.save();
    ctx.translate(0, leave * 520);
    ctx.globalAlpha *= 1 - leave;
    const pts = [];
    for (let i = 0; i < 2; i++) {
      const a = PINS[i], b = PINS[i + 1];
      for (let k = i ? 1 : 0; k <= 18; k++) {
        const f = k / 18;
        pts.push([lerp(a[0], b[0], f), lerp(a[1], b[1], f) + Math.sin(f * Math.PI) * (26 - i * 8)]);
      }
    }
    pencil(ctx, pts, { seed: 830, t, width: 2.2, color: C.subRed, progress: tk, passes: 1, pressure: 0.3 });
    PINS.forEach((p, i) => {
      ctx.fillStyle = '#6e1f19';
      ctx.globalAlpha = (1 - leave) * smooth(prog(t, 11.45 + i * 0.06, 11.6 + i * 0.06));
      ctx.beginPath(); ctx.arc(p[0], p[1], 6.5, 0, Math.PI * 2); ctx.fill();
    });
    ctx.restore();
  }
}

// ---------------- 门与走廊 ----------------
// 透视：屏幕 = VP + P / (z - zc)。门所在平面 z = Z_END；zc 是摄影机位置（越小越远）。
const VP = { x: 1290, y: 570 };
const Z_END = 4;
const DW = 230, DH = 460;          // 尽头那扇门（世界尺寸；zc = 3 时等于屏幕尺寸）
const YF = 230, YC = 420, XW = 640; // 地面、天花板、两侧墙
const zc = (t) => lerp(3, 0.55, easeInOut(prog(t, 15.15, 16.9)));
const P = (x, y, z, c) => [VP.x + x / (z - c), VP.y + y / (z - c)];

const SIDE = Array.from({ length: 12 }, (_, i) => {
  const r = rng(900 + i);
  return { left: i % 2 === 0, z: 1.05 + Math.floor(i / 2) * 0.48 + r() * 0.08, open: 0.35 + r() * 0.65, at: 15.5 + Math.floor(i / 2) * 0.09 + r() * 0.1, seed: 910 + i };
});

// 侧墙上的一扇门：画成透视四边形
function sideDoor(ctx, d, c, t, alpha, lit) {
  const zn = d.z, zf = d.z + 0.2;
  if (zn - c < 0.15) return;
  const X = d.left ? -XW : XW;
  const [x0, t0] = P(X, YF - DH, zn, c), [, b0] = P(X, YF, zn, c);
  const [x1, t1] = P(X, YF - DH, zf, c), [, b1] = P(X, YF, zf, c);
  ctx.save();
  ctx.globalAlpha *= alpha;
  ctx.fillStyle = '#2d221a';
  ctx.beginPath(); ctx.moveTo(x0, t0); ctx.lineTo(x1, t1); ctx.lineTo(x1, b1); ctx.lineTo(x0, b0); ctx.closePath(); ctx.fill();
  // 门缝：靠近走廊深处的一侧
  const g = d.open * 0.28 * lit;
  if (g > 0.01) {
    const gx0 = lerp(x1, x0, g), gt0 = lerp(t1, t0, g), gb0 = lerp(b1, b0, g);
    ctx.save();
    ctx.fillStyle = `rgba(255,236,196,${0.95 * lit})`;
    ctx.shadowColor = `rgba(255,200,130,${0.8 * lit})`;
    ctx.shadowBlur = 24 / (zn - c);
    ctx.beginPath(); ctx.moveTo(gx0, gt0); ctx.lineTo(x1, t1); ctx.lineTo(x1, b1); ctx.lineTo(gx0, gb0); ctx.closePath(); ctx.fill();
    ctx.restore();
    // 地上的光
    const [fx0, fy0] = P(X * 0.55, YF, zf, c), [fx1, fy1] = P(X * 0.55, YF, zn, c);
    ctx.fillStyle = `rgba(255,212,150,${0.16 * lit})`;
    ctx.beginPath(); ctx.moveTo(x1, b1); ctx.lineTo(gx0, gb0); ctx.lineTo(fx1, fy1); ctx.lineTo(fx0, fy0); ctx.closePath(); ctx.fill();
  }
  ctx.strokeStyle = `rgba(222,206,178,${0.35})`;
  ctx.lineWidth = Math.max(0.8, 3 / (zn - c));
  ctx.beginPath(); ctx.moveTo(x0, b0); ctx.lineTo(x0, t0); ctx.lineTo(x1, t1); ctx.lineTo(x1, b1); ctx.stroke();
  ctx.restore();
}

// 走廊里最后只剩下最近的这两扇亮着（交给第四幕）
const KEEP = [4, 5];

function drawCorridor(ctx, t) {
  const c = zc(t);
  const wallA = smooth(prog(t, 15.2, 16.2));
  // 墙角线、地面线
  if (wallA > 0) {
    const lines = [[-XW, YF], [XW, YF], [-XW, -YC], [XW, -YC]];
    for (const [x, y] of lines) {
      const [ax, ay] = P(x, y, c + 0.2, c), [bx, by] = P(x, y, Z_END, c);
      pencil(ctx, [[ax, ay], [bx, by]], { seed: 940 + x + y, t, width: 1.4, color: 'rgba(214,198,172,0.28)', alpha: wallA, passes: 1, pressure: 0.4 });
    }
  }
  const darkOut = smooth(prog(t, 19.2, 20.3));
  SIDE.forEach((d, i) => {
    const a = smooth(prog(t, d.at - 0.2, d.at + 0.2));
    if (a <= 0) return;
    const lit = smooth(prog(t, d.at, d.at + 0.5)) * (1 + 0.15 * noise1(t * 4 + i, 950 + i)) * (KEEP.includes(i) ? 1 : 1 - darkOut);
    sideDoor(ctx, d, c, t, a * (KEEP.includes(i) ? 1 : 1 - darkOut * 0.85), lit);
  });
  // 尽头那扇门（由吊牌长成）
  const m = spring(t, 12.35, 1.1, 1.0);
  const [ex, eyb] = P(0, YF, Z_END, c);
  const s = 1 / (Z_END - c);
  const tx = ex, tyb = eyb;
  const fx = lerp(TAG.x, tx, Math.min(1, m)), fyb = lerp(TAG.y + TAG.h / 2, tyb, Math.min(1, m));
  const fw = lerp(TAG.w, DW * s, Math.min(1, m)), fh = lerp(TAG.h, DH * s, Math.min(1, m));
  ctx.save();
  ctx.translate(fx, fyb);
  ctx.rotate(TAG.rot * (1 - Math.min(1, m)));
  if (m < 0.98) {
    const col = [226, 218, 200].map((v, i) => Math.round(lerp(v, [44, 33, 25][i], Math.min(1, m))));
    ctx.fillStyle = `rgb(${col.join(',')})`;
    ctx.fillRect(-fw / 2, -fh, fw, fh);
    // 吊牌上的打孔慢慢移到门把手的位置
    ctx.fillStyle = `rgba(${m > 0.5 ? '232,210,170' : '22,17,14'},0.9)`;
    ctx.beginPath(); ctx.arc(lerp(0, fw * 0.39, m), lerp(-fh + 22, -fh * 0.48, m), lerp(7, 3, m), 0, Math.PI * 2); ctx.fill();
  } else {
    // 关着的门：光只从四周的门缝漏出来；有得选之后它也开了一条缝
    const open = 0.5 * smooth(prog(t, 15.8, 16.6));
    const edgeGlow = 0.6 * (1 - smooth(prog(t, 15.4, 16.2))) * smooth(prog(t, 13.0, 13.6));
    if (edgeGlow > 0) {
      ctx.save();
      ctx.strokeStyle = `rgba(255,220,170,${edgeGlow})`;
      ctx.shadowColor = `rgba(255,200,140,${edgeGlow})`;
      ctx.shadowBlur = 18 * s * 3;
      ctx.lineWidth = 2.2;
      ctx.strokeRect(-fw / 2 - 1, -fh - 1, fw + 2, fh + 1);
      ctx.restore();
    }
    door(ctx, fw, fh, { open, side: 1, t, seed: 960, glow: 0.95, alpha: 1 - darkOut * 0.9, variant: 1 });
  }
  ctx.restore();
}

// 门前的背影：想要选择时往前走几步；真的有得选了，又退半步
function drawFigure(ctx, t) {
  const a = smooth(prog(t, 12.9, 13.5)) * (1 - smooth(prog(t, 19.6, 20.4)));
  if (a <= 0) return;
  const walk = smooth(prog(t, 14.15, 14.4)) * (1 - smooth(prog(t, 15.0, 15.3)));
  const fwd = spring(t, 14.15, 0.55, 1.0);
  const dolly = easeInOut(prog(t, 15.15, 16.9));
  const back = spring(t, 17.15, 0.8, 0.85);
  let x = lerp(640, 820, fwd), y = lerp(935, 912, fwd), h = lerp(200, 186, fwd);
  x = lerp(x, 1170, dolly); y = lerp(y, 860, dolly); h = lerp(h, 210, dolly);
  y += back * 34; h *= 1 + back * 0.12; x -= back * 14;
  ctx.save();
  ctx.translate(x, y);
  // 地上的一点影子
  ctx.fillStyle = 'rgba(0,0,0,0.45)';
  ctx.beginPath(); ctx.ellipse(0, 2, h * 0.16, h * 0.025, 0, 0, Math.PI * 2); ctx.fill();
  figure(ctx, h, { t, walk, alpha: a, rim: 0.6, lean: -back * 0.03 });
  ctx.restore();
}

function draw(ctx, t) {
  drawDesk(ctx, t);
  if (t > 12.3) {
    // 「害怕」：门向观众压过来
    const push = 1 + 0.07 * easeInOut(prog(t, 17.0, 19.4));
    ctx.save();
    ctx.translate(VP.x, VP.y);
    ctx.scale(push, push);
    ctx.translate(-VP.x, -VP.y);
    drawCorridor(ctx, t);
    ctx.restore();
    drawFigure(ctx, t);
  }
}

// 供第四幕：最后亮着的两扇门在屏幕上的位置
function keptDoors(t) {
  const c = zc(t);
  return KEEP.map((i) => {
    const d = SIDE[i];
    const X = d.left ? -XW : XW;
    const [x0, t0] = P(X, YF - DH, d.z, c), [, b0] = P(X, YF, d.z, c);
    const [x1, t1] = P(X, YF - DH, d.z + 0.2, c), [, b1] = P(X, YF, d.z + 0.2, c);
    return { x: (x0 + x1) / 2, y: (t0 + b0 + t1 + b1) / 4, w: Math.abs(x1 - x0), h: (b0 - t0 + b1 - t1) / 2 };
  });
}

function light(t) {
  const desk = smooth(prog(t, 10.9, 11.3)) * (1 - smooth(prog(t, 12.4, 13.0)));
  const doorL = smooth(prog(t, 12.6, 13.4)) * (1 - smooth(prog(t, 15.4, 16.4)));
  const cor = smooth(prog(t, 15.3, 16.3));
  const fear = easeInOut(prog(t, 17.0, 18.6));
  const kept = keptDoors(t);
  return [
    { x: 760, y: 600, rx: 820, ry: 520, i: 0.95, w: desk, rot: 0.2 },
    { x: 1290, y: 600, rx: 360, ry: 470, i: 0.85, w: doorL, core: 0.15 },
    // 背影脚下一小片光，让人从黑暗里浮出来
    { x: lerp(640, 820, spring(t, 14.15, 0.55, 1.0)), y: 860, rx: 260, ry: 190, i: 0.55, w: doorL },
    { x: 1250, y: 600, rx: lerp(1150, 900, fear), ry: 520, i: 0.85, w: cor * (1 - smooth(prog(t, 19.2, 20.3)) * 0.5) },
    { x: kept[0].x, y: kept[0].y, rx: 380, ry: 560, i: 0.8, w: smooth(prog(t, 19.0, 20.2)) },
    { x: kept[1].x, y: kept[1].y, rx: 380, ry: 560, i: 0.8, w: smooth(prog(t, 19.0, 20.2)) },
  ];
}
function grade(t) { return { warm: lerp(0.3, 0.1, smooth(prog(t, 15, 18))), ambient: 0.1 }; }

module.exports = { ...S, draw, light, grade, keptDoors };
