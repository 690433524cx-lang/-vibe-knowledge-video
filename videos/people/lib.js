// 《想看清一个人》共用：坐着的人（带眼睛 / 笑 / 视线）、特写的手、餐厅、桌子、账单夹。
// 人物骨架、受光、摄影机沿用《时间错觉》的 lib。
const { createCanvas } = require('@napi-rs/canvas');
const T = require('../time/lib');
const { W, H, FONT, BODY, rng, noise1, lerp, clamp, prog, smooth } = T;
const { mottle } = require('../../src/lib/material');
const { spring } = require('../../src/lib/motion');

// ---------------- 小工具 ----------------
const ease = (k) => (k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2);
const mix = (a, b, k) => a.map((v, i) => lerp(v, b[i], k));
// 在时间点之间分段插值：keys = [[t, v], …]，v 可以是数或数组
function track(t, keys, fn = ease) {
  if (t <= keys[0][0]) return keys[0][1];
  for (let i = 1; i < keys.length; i++) {
    const [t1, v1] = keys[i];
    if (t <= t1) {
      const [t0, v0] = keys[i - 1];
      const k = fn(prog(t, t0, t1));
      return Array.isArray(v0) ? mix(v0, v1, k) : lerp(v0, v1, k);
    }
  }
  return keys[keys.length - 1][1];
}
function glow(x, cx, cy, r, color, a = 1) {
  const g = x.createRadialGradient(cx, cy, 0, cx, cy, r);
  g.addColorStop(0, color.replace('A', String(a)));
  g.addColorStop(1, color.replace('A', '0'));
  x.save();
  x.globalCompositeOperation = 'screen';
  x.fillStyle = g;
  x.fillRect(cx - r, cy - r, r * 2, r * 2);
  x.restore();
}
function rrect(x, a, b, w, h, r) {
  x.beginPath();
  x.moveTo(a + r, b);
  x.arcTo(a + w, b, a + w, b + h, r);
  x.arcTo(a + w, b + h, a, b + h, r);
  x.arcTo(a, b + h, a, b, r);
  x.arcTo(a, b, a + w, b, r);
  x.closePath();
}

// ---------------- 人物 ----------------
// 坐姿：大腿向前、小腿向下。arms / head 由调用方给。
const SEAT = { thighN: Math.PI / 2 - 0.06, shinN: 0.08, thighF: Math.PI / 2 - 0.1, shinF: -0.04, footN: Math.PI / 2, footF: Math.PI / 2 };

// o: { h, f, yaw, pose, pal, laugh(0..1), eye(0 闭 … 1 开), bob(短发女), mouth }
// 原点 = 髋。返回骨架点（局部坐标）。
function figure(c, o) {
  const { h, f = 1, yaw = 1, pose = {}, pal, laugh = 0, bob = false, talk = 0 } = o;
  const P = T.side(c, { h, f, kind: 'adult', pal, pose, yaw, hold: o.hold });
  const B = BODY.adult;
  const ang = (pose.torso || 0) + (pose.neck || 0) + (pose.head || 0);
  const rx = B.headW * h * 0.5, ry = B.head * h * 0.5, s = f * yaw, a = Math.abs(yaw);
  c.save();
  c.translate(P.hc[0], P.hc[1]);
  c.rotate(ang * f);
  const X = (v) => v * rx * s, Y = (v) => v * ry;
  if (bob) {
    // 齐下巴的短发：盖住后脑和耳朵
    c.fillStyle = pal.hair;
    c.beginPath();
    c.moveTo(X(0.55), Y(-0.7));
    c.quadraticCurveTo(X(0.2), Y(-1.12), X(-0.55), Y(-0.98));
    c.quadraticCurveTo(X(-1.25), Y(-0.6), X(-1.12), Y(0.25));
    c.quadraticCurveTo(X(-1.05), Y(0.78), X(-0.55), Y(0.82));
    c.lineTo(X(-0.1), Y(0.7));
    c.quadraticCurveTo(X(-0.35), Y(0.2), X(0.05), Y(-0.3));
    c.quadraticCurveTo(X(0.3), Y(-0.55), X(0.55), Y(-0.7));
    c.fill();
  }
  if (a > 0.3) {
    const ex = X(0.6), ey = Y(-0.1);
    const er = rx * 0.11;
    c.globalAlpha *= clamp((a - 0.3) * 3);
    // 眉
    c.strokeStyle = T.shade(pal.hair, 1);
    c.lineWidth = Math.max(1.5, rx * 0.07);
    c.lineCap = 'round';
    c.beginPath();
    c.moveTo(ex - er * 1.3 * Math.sign(s), ey - ry * 0.2 - laugh * ry * 0.05);
    c.lineTo(ex + er * 0.9 * Math.sign(s), ey - ry * 0.22 - laugh * ry * 0.06 + (o.frown || 0) * ry * 0.07);
    c.stroke();
    // 眼：笑的时候眯成弧
    const open = (o.eye ?? 1) * (1 - laugh);
    c.fillStyle = 'rgba(22,14,10,0.92)';
    c.strokeStyle = 'rgba(22,14,10,0.92)';
    if (open > 0.15) {
      c.beginPath();
      c.ellipse(ex + (o.look || 0) * er * 0.3 * Math.sign(s), ey, er * 0.75, er * 0.55 * open + 0.6, 0, 0, Math.PI * 2);
      c.fill();
    } else {
      c.lineWidth = Math.max(1.4, rx * 0.06);
      c.beginPath();
      c.arc(ex, ey + er * 0.5, er * 0.8, Math.PI * 1.15, Math.PI * 1.85);
      c.stroke();
    }
    // 嘴：笑 / 说话张开一点
    const m = Math.max(laugh, talk);
    if (m > 0.05) {
      c.fillStyle = `rgba(48,20,16,${0.85 * m})`;
      c.beginPath();
      c.ellipse(X(0.8), Y(0.4), rx * 0.12, ry * 0.05 + ry * 0.07 * m, 0.2 * Math.sign(s), 0, Math.PI * 2);
      c.fill();
    } else {
      c.lineWidth = Math.max(1.2, rx * 0.045);
      c.strokeStyle = 'rgba(70,36,28,0.7)';
      c.beginPath();
      c.moveTo(X(0.7), Y(0.42));
      c.lineTo(X(0.86), Y(0.4 + (o.frown || 0) * 0.04));
      c.stroke();
    }
  }
  c.restore();
  return P;
}

// 全片人物的衣服颜色（深色体系，主角最亮）
const CAST = {
  A: { skin: '#c39a7a', shirt: '#9a8063', jacket: '#9a8063', pants: '#2c2722', hair: '#1a1310', shoe: '#1c1816' },   // 驼色毛衣：说「不在乎钱」的人
  B: { skin: '#b88f72', shirt: '#3c4148', jacket: '#3c4148', pants: '#23252a', hair: '#15110e', shoe: '#1a1817' },
  C: { skin: '#cba083', shirt: '#5b3e36', jacket: '#5b3e36', pants: '#2a2422', hair: '#20150f', shoe: '#1c1816' },
  D: { skin: '#b48a6c', shirt: '#4a4a40', jacket: '#4a4a40', pants: '#24231f', hair: '#120e0b', shoe: '#1a1817' },
  waiter: { skin: '#c09878', shirt: '#d8d0c0', jacket: '#d8d0c0', pants: '#1a1918', hair: '#14100d', shoe: '#141210' },
};

// ---------------- 特写的手（俯视，掌心朝下） ----------------
// 原点 = 手腕，手指朝 -y。curl：手指收起；lift：手离开桌面（影子分离）；spread：张开。
function hand(c, o) {
  const { x, y, rot = 0, s = 1, curl = 0, lift = 0, spread = 0, skin = '#c39a7a', sleeve = '#8c7258', mirror = 1, index = 0, arm = 900 } = o;
  c.save();
  c.translate(x, y);
  c.rotate(rot);
  c.scale(s * mirror, s);
  // 影子
  c.save();
  c.translate(18 + lift * 26, 22 + lift * 30);
  c.globalAlpha = 0.28 * (1 - lift * 0.45);
  c.filter = `blur(${10 + lift * 14}px)`;
  c.fillStyle = '#1a120c';
  c.beginPath(); c.ellipse(0, -70, 82, 120, 0, 0, Math.PI * 2); c.fill();
  c.fillRect(-70, 0, 140, arm);
  c.restore();
  // 小臂 + 袖口（针织，带罗纹）
  const fg = c.createLinearGradient(-80, 0, 80, 0);
  fg.addColorStop(0, T.shade(sleeve, 0.7)); fg.addColorStop(0.45, sleeve); fg.addColorStop(1, T.shade(sleeve, 0.62));
  c.fillStyle = fg;
  c.beginPath();
  c.moveTo(-66, 30); c.lineTo(-92, arm); c.lineTo(92, arm); c.lineTo(66, 30);
  c.quadraticCurveTo(0, 16, -66, 30);
  c.fill();
  c.strokeStyle = 'rgba(0,0,0,0.16)';
  c.lineWidth = 3;
  for (let i = -5; i <= 5; i++) { c.beginPath(); c.moveTo(i * 12, 32); c.lineTo(i * 12.6, 96); c.stroke(); }
  c.strokeStyle = 'rgba(255,230,200,0.08)';
  for (let i = 0; i < 8; i++) { c.beginPath(); c.moveTo(-80, 130 + i * 70); c.quadraticCurveTo(0, 120 + i * 70, 84, 132 + i * 70); c.stroke(); }
  // 手掌
  const sk = c.createLinearGradient(-70, -80, 70, 20);
  sk.addColorStop(0, T.shade(skin, 1.0)); sk.addColorStop(1, T.shade(skin, 0.78));
  c.fillStyle = sk;
  c.beginPath();
  c.moveTo(-50, 26);
  c.quadraticCurveTo(-64, -40, -58, -104);
  c.quadraticCurveTo(0, -126, 58, -108);
  c.quadraticCurveTo(66, -40, 52, 26);
  c.closePath();
  c.fill();
  // 四根手指：食指 → 小指（index 单独控制，可以敲桌子）
  const F = [[-40, 0.92, 21], [-13, 1.0, 22], [14, 0.95, 21], [40, 0.74, 18]];
  F.forEach(([fx, len, fw], i) => {
    const cu = clamp(curl + (i === 0 ? index : 0));
    const L0 = 118 * len * (1 - 0.55 * cu);
    const a0 = (i - 1.5) * 0.07 * (1 + spread * 2);
    const bx = fx * 0.95, by = -92 - (i === 1 || i === 2 ? 6 : 0);
    const tx = bx + Math.sin(a0) * L0, ty = by - Math.cos(a0) * L0;
    T.limb(c, [bx, by], [tx, ty], fw * 1.05, fw * 0.86, T.shade(skin, 0.95 - cu * 0.1));
    // 指节的折痕 + 指甲
    c.fillStyle = 'rgba(70,40,26,0.18)';
    c.fillRect(lerp(bx, tx, 0.45) - fw * 0.35, lerp(by, ty, 0.45), fw * 0.7, 2);
    if (cu < 0.6) {
      c.fillStyle = 'rgba(240,214,196,0.5)';
      c.beginPath(); c.ellipse(tx, ty + fw * 0.35, fw * 0.3, fw * 0.4, a0, 0, Math.PI * 2); c.fill();
    }
  });
  // 拇指
  T.limb(c, [-48, -10], [-88 - spread * 20, -74], 30, 23, T.shade(skin, 0.86));
  // 指根的骨节高光
  c.fillStyle = 'rgba(255,226,200,0.14)';
  for (const fx of [-38, -12, 14, 38]) { c.beginPath(); c.ellipse(fx, -98, 10, 6, 0, 0, Math.PI * 2); c.fill(); }
  c.restore();
}

// ---------------- 账单夹 / 小票 ----------------
const RECEIPT = [
  ['招牌烤鸭', '288'], ['清蒸石斑鱼', '368'], ['时令蔬菜', '58'], ['红酒 ×1', '398'], ['甜品', '46'], ['茶位 4 位', '48'], ['服务费', '54'],
];
// 特写里的账单夹（俯视）。中心在 (0,0)，open 0..1：封面向左翻开。
function billFolder(c, o) {
  const { w = 560, h = 380, open = 0, slip = 1, amountGlow = 0, underline = 0, amountA = 1 } = o;
  // 影子
  c.save();
  c.globalAlpha = 0.45;
  c.filter = 'blur(18px)';
  c.fillStyle = '#120c08';
  c.fillRect(-w / 2 + 16, -h / 2 + 22, w * (1 + open * 0.98), h);
  c.restore();
  // 底板（黑色皮面）
  const leather = (x0, w0, k) => {
    const g = c.createLinearGradient(x0, -h / 2, x0 + w0, h / 2);
    g.addColorStop(0, T.shade('#3a332d', k)); g.addColorStop(0.5, T.shade('#28231f', k)); g.addColorStop(1, T.shade('#1a1714', k));
    c.fillStyle = g;
    rrect(c, x0, -h / 2, w0, h, 14);
    c.fill();
    c.strokeStyle = `rgba(150,128,100,${0.25 * k})`;
    c.setLineDash([7, 6]);
    c.lineWidth = 2;
    rrect(c, x0 + 14, -h / 2 + 14, w0 - 28, h - 28, 8);
    c.stroke();
    c.setLineDash([]);
  };
  leather(-w / 2, w, 1);
  // 小票（打开后露出）
  if (open > 0.02 || slip < 1) {
    const sw = w * 0.74, sh = h * 1.12;
    c.save();
    c.translate(-sw / 2 + 4, -sh / 2 - 18 * (1 - slip));
    c.fillStyle = '#e4dccb';
    c.fillRect(0, 0, sw, sh);
    // 锯齿底边
    c.beginPath();
    for (let i = 0; i <= 20; i++) c.lineTo((i / 20) * sw, sh + (i % 2 ? 6 : 0));
    c.lineTo(sw, sh - 2); c.lineTo(0, sh - 2); c.fill();
    c.fillStyle = 'rgba(120,100,70,0.08)';
    c.fillRect(0, 0, sw, sh);
    c.fillStyle = '#2a2420';
    c.font = FONT.body(19);
    c.letterSpacing = '2px';
    c.textAlign = 'center';
    c.fillText('— 桌号 07 · 4 位 —', sw / 2, 40);
    c.textAlign = 'left';
    c.font = FONT.body(17);
    RECEIPT.forEach(([n, p], i) => {
      c.fillStyle = 'rgba(42,36,32,0.82)';
      c.fillText(n, 24, 78 + i * 26);
      c.textAlign = 'right';
      c.fillText(p, sw - 24, 78 + i * 26);
      c.textAlign = 'left';
    });
    c.strokeStyle = 'rgba(42,36,32,0.6)';
    c.setLineDash([4, 4]);
    c.beginPath(); c.moveTo(20, 270); c.lineTo(sw - 20, 270); c.stroke();
    c.setLineDash([]);
    c.font = FONT.body(22);
    c.fillStyle = '#2a2420';
    c.fillText('合计', 24, 322);
    c.font = FONT.serifBlack(54);
    c.letterSpacing = '1px';
    c.textAlign = 'right';
    if (amountGlow > 0) { c.shadowColor = `rgba(255,190,120,${0.6 * amountGlow})`; c.shadowBlur = 16; }
    c.globalAlpha *= amountA;
    c.fillText('¥1260', sw - 22, 332);
    c.globalAlpha /= Math.max(1e-3, amountA);
    c.shadowBlur = 0;
    if (underline > 0) {
      c.strokeStyle = '#8f2a20';
      c.lineWidth = 4;
      c.lineCap = 'round';
      c.beginPath(); c.moveTo(sw - 200, 344); c.lineTo(sw - 200 + 178 * underline, 342 + underline * 2); c.stroke();
    }
    c.restore();
  }
  // 封面：以左边为轴翻开（cos 压缩），翻过去后露出内面
  const ang = open * Math.PI;
  const sx = Math.cos(ang);
  c.save();
  c.translate(-w / 2, 0);
  c.scale(sx, 1);
  if (sx > 0) {
    leather(0, w, 0.95 + 0.25 * (1 - sx));
    // 烫金字
    c.fillStyle = 'rgba(196,162,104,0.55)';
    c.font = FONT.enMed(26);
    c.letterSpacing = '8px';
    c.textAlign = 'center';
    c.fillText('THE BILL', w / 2, 10);
  } else {
    leather(0, w, 0.7);
  }
  c.restore();
}

// ---------------- 餐厅 ----------------
// 远景：深色墙、左边夜色窗、右边后厨门洞、远处几桌的暖光斑。缓存。
let restaurantBg = null;
function restaurant() {
  if (restaurantBg) return restaurantBg;
  const w = Math.round(W * 1.2), h = Math.round(H * 1.2);
  const c = createCanvas(w, h), x = c.getContext('2d');
  x.translate((w - W) / 2, (h - H) / 2);
  const g = x.createLinearGradient(0, -100, 0, H);
  g.addColorStop(0, '#1f1813'); g.addColorStop(0.7, '#2a2019'); g.addColorStop(1, '#16110d');
  x.fillStyle = g; x.fillRect(-200, -120, W + 400, H + 240);
  mottle(x, W, H, 8, 902, 0.25, [10, 8, 6]);
  mottle(x, W, H, 30, 903, 0.08, [70, 52, 38]);
  // 竖条木墙板
  for (let i = -6; i < 60; i++) {
    x.fillStyle = i % 2 ? 'rgba(0,0,0,0.12)' : 'rgba(90,66,46,0.06)';
    x.fillRect(i * 38, -120, 3, 860);
  }
  // 左：夜色窗（极深蓝灰，带城市光斑）
  x.fillStyle = '#121519';
  x.fillRect(60, 80, 420, 520);
  const r = rng(77);
  for (let i = 0; i < 40; i++) {
    const cx = 70 + r() * 400, cy = 120 + r() * 460, rr = 6 + r() * 22;
    const col = r() < 0.7 ? `rgba(150,170,196,${0.1 + r() * 0.18})` : `rgba(220,170,110,${0.12 + r() * 0.2})`;
    const gg = x.createRadialGradient(cx, cy, 0, cx, cy, rr);
    gg.addColorStop(0, col); gg.addColorStop(1, 'rgba(0,0,0,0)');
    x.fillStyle = gg; x.fillRect(cx - rr, cy - rr, rr * 2, rr * 2);
  }
  x.strokeStyle = '#2c241d'; x.lineWidth = 18; x.strokeRect(60, 80, 420, 520);
  x.lineWidth = 8; x.beginPath(); x.moveTo(270, 80); x.lineTo(270, 600); x.stroke();
  // 右：后厨门洞（暖光）
  const dg = x.createLinearGradient(1500, 160, 1500, 700);
  dg.addColorStop(0, '#4a3524'); dg.addColorStop(1, '#2a1f17');
  x.fillStyle = dg; x.fillRect(1540, 170, 250, 560);
  x.fillStyle = 'rgba(255,196,130,0.12)'; x.fillRect(1560, 190, 210, 520);
  x.fillStyle = '#1a140f'; x.fillRect(1528, 160, 18, 580); x.fillRect(1784, 160, 18, 580); x.fillRect(1528, 152, 274, 20);
  // 半帘
  x.fillStyle = '#3d2a20'; x.fillRect(1546, 172, 238, 120);
  x.strokeStyle = 'rgba(0,0,0,0.3)'; x.lineWidth = 2;
  for (let i = 1; i < 4; i++) { x.beginPath(); x.moveTo(1546 + i * 60, 172); x.lineTo(1546 + i * 60, 292); x.stroke(); }
  // 远处几桌的吊灯光斑
  for (const [cx, cy, rr, a] of [[620, 300, 120, 0.14], [760, 250, 70, 0.1], [1300, 280, 110, 0.12], [1180, 230, 60, 0.08], [880, 220, 50, 0.07]]) {
    const gg = x.createRadialGradient(cx, cy, 0, cx, cy, rr);
    gg.addColorStop(0, `rgba(255,196,128,${a * 1.6})`); gg.addColorStop(1, 'rgba(255,196,128,0)');
    x.fillStyle = gg; x.fillRect(cx - rr, cy - rr, rr * 2, rr * 2);
  }
  // 护墙板 + 地面
  x.fillStyle = 'rgba(12,9,7,0.55)'; x.fillRect(-200, 700, W + 400, 100);
  x.fillStyle = 'rgba(150,120,90,0.08)'; x.fillRect(-200, 700, W + 400, 4);
  const fl = x.createLinearGradient(0, 790, 0, H + 120);
  fl.addColorStop(0, '#1d1611'); fl.addColorStop(1, '#0f0c0a');
  x.fillStyle = fl; x.fillRect(-200, 790, W + 400, H);
  restaurantBg = c;
  return c;
}

// 餐桌（侧俯视的透视梯形）+ 桌布垂边。apron 单独画，用来盖住坐在两端的人的腿。
const TBL = { by: 590, bl: 600, br: 1320, fy: 672, fl: 520, fr: 1400, drop: 784 };
function tableTop(x) {
  const t = TBL;
  const g = x.createLinearGradient(0, t.by, 0, t.fy);
  g.addColorStop(0, '#988a73'); g.addColorStop(1, '#b6a88f');
  x.fillStyle = g;
  x.beginPath(); x.moveTo(t.bl, t.by); x.lineTo(t.br, t.by); x.lineTo(t.fr, t.fy); x.lineTo(t.fl, t.fy); x.closePath(); x.fill();
  // 桌布的折痕
  x.strokeStyle = 'rgba(90,74,56,0.12)'; x.lineWidth = 2;
  for (let i = 1; i < 6; i++) { const k = i / 6; x.beginPath(); x.moveTo(lerp(t.bl, t.br, k), t.by); x.lineTo(lerp(t.fl, t.fr, k), t.fy); x.stroke(); }
}
function tableApron(x) {
  const t = TBL;
  const g = x.createLinearGradient(0, t.fy, 0, t.drop);
  g.addColorStop(0, '#94866e'); g.addColorStop(0.25, '#6c604f'); g.addColorStop(1, '#2e2822');
  x.fillStyle = g;
  x.beginPath();
  x.moveTo(t.fl, t.fy); x.lineTo(t.fr, t.fy); x.lineTo(t.fr + 6, t.drop);
  for (let i = 20; i >= 0; i--) x.lineTo(lerp(t.fl - 6, t.fr + 6, i / 20), t.drop + (i % 2 ? 5 : 0));
  x.closePath(); x.fill();
  x.strokeStyle = 'rgba(40,30,22,0.25)'; x.lineWidth = 3;
  for (let i = 1; i < 14; i++) { const xx = lerp(t.fl, t.fr, i / 14); x.beginPath(); x.moveTo(xx, t.fy + 10); x.quadraticCurveTo(xx + 6, (t.fy + t.drop) / 2, xx - 2, t.drop); x.stroke(); }
  x.fillStyle = 'rgba(255,236,206,0.16)';
  x.fillRect(t.fl, t.fy, t.fr - t.fl, 3);
}
// 盘子 / 碗 / 杯子 / 茶壶（屏幕坐标）
function plate(x, cx, cy, r, food) {
  x.fillStyle = 'rgba(30,20,14,0.3)';
  x.beginPath(); x.ellipse(cx + 4, cy + 6, r, r * 0.3, 0, 0, Math.PI * 2); x.fill();
  x.fillStyle = '#d8d0c2'; x.beginPath(); x.ellipse(cx, cy, r, r * 0.3, 0, 0, Math.PI * 2); x.fill();
  x.fillStyle = '#bfb6a6'; x.beginPath(); x.ellipse(cx, cy + 1, r * 0.68, r * 0.2, 0, 0, Math.PI * 2); x.fill();
  if (food) {
    x.fillStyle = food;
    x.beginPath(); x.ellipse(cx - r * 0.1, cy - r * 0.04, r * 0.45, r * 0.13, 0, 0, Math.PI * 2); x.fill();
  }
}
function glass(x, cx, cy, hgt, wine = 0) {
  x.fillStyle = 'rgba(200,210,214,0.18)';
  x.beginPath(); x.ellipse(cx, cy, 14, 4, 0, 0, Math.PI * 2); x.fill();
  x.fillStyle = 'rgba(210,218,222,0.4)'; x.fillRect(cx - 1.5, cy - hgt * 0.45, 3, hgt * 0.45);
  x.fillStyle = 'rgba(200,210,214,0.22)';
  x.beginPath(); x.moveTo(cx - 17, cy - hgt); x.quadraticCurveTo(cx - 18, cy - hgt * 0.45, cx, cy - hgt * 0.42); x.quadraticCurveTo(cx + 18, cy - hgt * 0.45, cx + 17, cy - hgt); x.closePath(); x.fill();
  if (wine) { x.fillStyle = 'rgba(110,22,24,0.75)'; x.beginPath(); x.moveTo(cx - 15, cy - hgt * 0.72); x.quadraticCurveTo(cx, cy - hgt * 0.38, cx + 15, cy - hgt * 0.72); x.closePath(); x.fill(); }
  x.fillStyle = 'rgba(255,246,230,0.55)'; x.fillRect(cx + 9, cy - hgt * 0.95, 2.5, hgt * 0.35);
}
function teapot(x, cx, cy) {
  x.fillStyle = '#3d3a34'; x.beginPath(); x.ellipse(cx, cy - 24, 34, 28, 0, 0, Math.PI * 2); x.fill();
  x.fillStyle = '#4a463e'; x.fillRect(cx - 10, cy - 58, 20, 10);
  x.strokeStyle = '#3d3a34'; x.lineWidth = 7; x.beginPath(); x.moveTo(cx + 30, cy - 34); x.quadraticCurveTo(cx + 56, cy - 40, cx + 52, cy - 52); x.stroke();
  x.beginPath(); x.arc(cx - 36, cy - 26, 14, Math.PI * 0.5, Math.PI * 1.5); x.stroke();
  x.fillStyle = 'rgba(255,230,190,0.25)'; x.beginPath(); x.ellipse(cx + 12, cy - 36, 8, 5, 0, 0, Math.PI * 2); x.fill();
}
// 远景小号账单夹（餐桌上）
function billSmall(x, cx, cy, rot = 0, open = 0) {
  x.save(); x.translate(cx, cy); x.rotate(rot);
  x.fillStyle = 'rgba(20,14,10,0.4)'; x.fillRect(-36 - open * 70, -8, 76 + open * 70, 26);
  x.fillStyle = '#221d19'; x.fillRect(-38, -12, 74, 24);
  if (open > 0) { x.fillStyle = '#1a1613'; x.fillRect(-38 - 72 * open, -12, 72 * open, 24); }
  x.fillStyle = '#e4dccb'; x.fillRect(-26, -18 + open * 8, 44, 8 + open * 12);
  if (!open) { x.fillStyle = 'rgba(196,162,104,0.5)'; x.fillRect(-14, -2, 28, 2); }
  x.restore();
}
// 场景坐标 → 屏幕坐标（与 withCam 一致），用来把光斑跟着镜头走
function camPt(cam, px, py, depth = 1) {
  const s = 1 + (cam.s - 1) * depth;
  const cx = W / 2 + (cam.cx - W / 2) * depth, cy = H / 2 + (cam.cy - H / 2) * depth;
  let dx = (px - cx) * s, dy = (py - cy) * s;
  if (cam.rot) { const c = Math.cos(cam.rot * depth), sn = Math.sin(cam.rot * depth); [dx, dy] = [dx * c - dy * sn, dx * sn + dy * c]; }
  return [W / 2 + dx, H / 2 + dy, s];
}
// 把场景空间里的光斑换到屏幕空间
function camLights(cam, lights) {
  return lights.map((l) => { const [x, y, s] = camPt(cam, l.x, l.y, l.depth ?? 1); return { ...l, x, y, rx: l.rx * s, ry: l.ry * s }; });
}

module.exports = {
  ...T, T, ease, track, glow, rrect, mix, spring, SEAT, figure, CAST, hand, billFolder, restaurant, TBL, tableTop, tableApron,
  plate, glass, teapot, billSmall, RECEIPT, camPt, camLights,
};
