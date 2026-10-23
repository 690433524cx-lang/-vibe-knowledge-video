// 《想看清一个人》开场一镜到底用的零件：握手特写、筹码、盘子（正面 / 盘底）、挂钟、俯视的人、深色木桌面。
// 所有零件都是「真实空间里的物体」，在自己的局部坐标里画，由镜头决定大小。
const { createCanvas } = require('@napi-rs/canvas');
const L = require('./lib');
const { W, H, FONT, lerp, clamp, rng, noise1 } = L;
const { mottle } = require('../../src/lib/material');

const SKIN_P = '#c39a7a', SKIN_V = '#b48a6c';
const KNIT = '#8c7258', NAVY = '#2c3544';
const mixc = (a, b, k) => a.map((v, i) => Math.round(lerp(v, b[i], k)));
const rgb = (a, al = 1) => `rgba(${a[0]},${a[1]},${a[2]},${al})`;

// ---------------- 握手（侧面极近景）：原点 = 两只手握在一起的中心 ----------------
function handshake(c, o = {}) {
  const { squeeze = 0 } = o;
  // A 的袖子（左，驼色针织）
  const pg = c.createLinearGradient(0, -90, 0, 120);
  pg.addColorStop(0, L.shade(KNIT, 1.15)); pg.addColorStop(0.5, KNIT); pg.addColorStop(1, L.shade(KNIT, 0.55));
  c.fillStyle = pg;
  c.beginPath(); c.moveTo(-1400, -120); c.lineTo(-170, -78); c.quadraticCurveTo(-150, 10, -168, 96); c.lineTo(-1400, 170); c.closePath(); c.fill();
  c.strokeStyle = 'rgba(0,0,0,0.18)'; c.lineWidth = 4;
  for (let i = 0; i < 7; i++) { const x = -250 + i * 13; c.beginPath(); c.moveTo(x, -82); c.lineTo(x - 2, 100); c.stroke(); }
  c.strokeStyle = 'rgba(255,226,190,0.07)'; c.lineWidth = 3;
  for (let i = 0; i < 12; i++) { c.beginPath(); c.moveTo(-1400, -100 + i * 22); c.quadraticCurveTo(-800, -90 + i * 21, -300, -82 + i * 15); c.stroke(); }
  // 对方的西装袖（右，深蓝）+ 白衬衫袖口 + 袖扣
  const vg = c.createLinearGradient(0, -110, 0, 130);
  vg.addColorStop(0, L.shade(NAVY, 1.4)); vg.addColorStop(0.45, NAVY); vg.addColorStop(1, L.shade(NAVY, 0.55));
  c.fillStyle = vg;
  c.beginPath(); c.moveTo(1400, -150); c.lineTo(250, -96); c.lineTo(246, 92); c.lineTo(1400, 160); c.closePath(); c.fill();
  c.strokeStyle = 'rgba(0,0,0,0.25)'; c.lineWidth = 3;
  c.beginPath(); c.moveTo(600, -110); c.quadraticCurveTo(640, 0, 610, 110); c.stroke();
  c.fillStyle = '#d6d0c4'; c.beginPath(); c.moveTo(250, -92); c.lineTo(178, -78); c.lineTo(176, 76); c.lineTo(248, 90); c.closePath(); c.fill();
  c.fillStyle = 'rgba(0,0,0,0.15)'; c.fillRect(176, 30, 72, 50);
  c.fillStyle = '#c9a463'; c.beginPath(); c.arc(214, 4, 9, 0, Math.PI * 2); c.fill();
  // 对方的手掌（大部分被 A 的手挡住）
  c.fillStyle = L.shade(SKIN_V, 0.92);
  c.beginPath(); c.moveTo(182, -70); c.quadraticCurveTo(40, -88 - squeeze * 4, -40, -62); c.lineTo(-40, 70); c.quadraticCurveTo(80, 92, 180, 72); c.closePath(); c.fill();
  // A 的手背：从手腕到指节，四指绕到对方掌后
  const sk = c.createLinearGradient(0, -90, 0, 90);
  sk.addColorStop(0, L.shade(SKIN_P, 1.08)); sk.addColorStop(0.6, SKIN_P); sk.addColorStop(1, L.shade(SKIN_P, 0.68));
  c.fillStyle = sk;
  c.beginPath();
  c.moveTo(-178, -66);
  c.quadraticCurveTo(-60, -96 - squeeze * 6, 70, -74);
  c.quadraticCurveTo(112, -40, 104, 10);
  c.quadraticCurveTo(96, 66, 40, 84);
  c.quadraticCurveTo(-60, 98, -176, 80);
  c.closePath(); c.fill();
  // 指节的起伏 + 骨节高光
  c.strokeStyle = 'rgba(90,50,30,0.25)'; c.lineWidth = 3;
  for (let i = 0; i < 4; i++) { c.beginPath(); c.moveTo(64 + i * 8, -60 + i * 34); c.quadraticCurveTo(84 + i * 4, -48 + i * 34, 92, -30 + i * 32); c.stroke(); }
  c.fillStyle = 'rgba(255,228,204,0.18)';
  for (let i = 0; i < 4; i++) { c.beginPath(); c.ellipse(76 + i * 6, -50 + i * 33, 12, 7, 1.2, 0, Math.PI * 2); c.fill(); }
  c.strokeStyle = 'rgba(120,70,50,0.18)'; c.lineWidth = 2;
  c.beginPath(); c.moveTo(-120, -40); c.quadraticCurveTo(-40, -50, 20, -36); c.stroke();
  // 对方的指尖：从 A 的手下面绕上来
  for (let i = 0; i < 3; i++) L.limb(c, [-60 + i * 34, 64], [-96 + i * 32, 100 - i * 4], 30, 24, L.shade(SKIN_V, 0.85 - i * 0.04));
  // A 的拇指搭在对方手背上
  L.limb(c, [40, -66], [196, -60 + squeeze * 3], 40, 30, L.shade(SKIN_P, 1.04));
  c.fillStyle = 'rgba(240,214,196,0.5)'; c.beginPath(); c.ellipse(186, -60, 12, 9, 0, 0, Math.PI * 2); c.fill();
  // 对方的拇指搭在 A 的手背上
  L.limb(c, [150, -78], [60, -96 - squeeze * 2], 34, 30, L.shade(SKIN_V, 1.0));
  L.limb(c, [60, -96 - squeeze * 2], [-30, -90 - squeeze * 3], 30, 25, L.shade(SKIN_V, 1.02));
  c.fillStyle = 'rgba(232,200,180,0.45)'; c.beginPath(); c.ellipse(-22, -90, 10, 7, 0, 0, Math.PI * 2); c.fill();
}

// ---------------- 俯视的筹码 ----------------
const CHIPS = {
  机会: { face: [214, 206, 188], edge: [120, 112, 98], ink: '#3a332c' },
  利益: { face: [200, 160, 86], edge: [120, 84, 34], ink: '#4a3414' },
  功劳: { face: [128, 42, 34], edge: [70, 22, 18], ink: '#e2cdb0' },
};
// morph：0 = 筹码，1 = 白瓷盘子（同一个圆，颜色 / 边 / 字逐渐变）
function chip(c, name, r, o = {}) {
  const { rot = 0, shadow = 1, morph = 0, food = 0 } = o;
  const C = CHIPS[name];
  const face = mixc(C.face, [226, 220, 208], morph), edge = mixc(C.edge, [196, 188, 174], morph);
  c.save();
  c.rotate(rot);
  if (shadow > 0) {
    c.fillStyle = `rgba(10,6,4,${0.45 * shadow})`;
    c.beginPath(); c.ellipse(r * 0.08, r * 0.12, r * 1.02, r * 1.02, 0, 0, Math.PI * 2); c.fill();
  }
  c.fillStyle = rgb(edge); c.beginPath(); c.arc(0, 0, r, 0, Math.PI * 2); c.fill();
  // 边上的条纹（筹码的标志），盘子时消失
  c.fillStyle = rgb(mixc(face, [245, 240, 230], 0.3), 1 - morph);
  for (let i = 0; i < 8; i++) { c.save(); c.rotate((i / 8) * Math.PI * 2); c.fillRect(-r * 0.12, -r, r * 0.24, r * 0.2); c.restore(); }
  c.fillStyle = rgb(face); c.beginPath(); c.arc(0, 0, r * (0.8 + 0.12 * morph), 0, Math.PI * 2); c.fill();
  // 盘子：内圈的凹陷
  c.strokeStyle = rgb([0, 0, 0], 0.1 + 0.08 * morph); c.lineWidth = r * 0.025;
  c.beginPath(); c.arc(0, 0, r * (0.68 + 0.02 * morph), 0, Math.PI * 2); c.stroke();
  if (morph > 0.3) {
    const g = c.createRadialGradient(-r * 0.2, -r * 0.2, 0, 0, 0, r * 0.66);
    g.addColorStop(0, `rgba(255,255,255,${0.25 * morph})`); g.addColorStop(1, 'rgba(255,255,255,0)');
    c.fillStyle = g; c.beginPath(); c.arc(0, 0, r * 0.66, 0, Math.PI * 2); c.fill();
  }
  // 刻字
  if (morph < 0.9) {
    c.save();
    c.globalAlpha *= 1 - morph / 0.9;
    c.font = FONT.serifBlack(r * 0.42);
    c.textAlign = 'center'; c.textBaseline = 'middle';
    c.fillStyle = C.ink;
    c.fillText(name, 0, r * 0.03);
    c.strokeStyle = C.ink; c.globalAlpha *= 0.5; c.lineWidth = r * 0.02;
    c.beginPath(); c.arc(0, 0, r * 0.62, 0, Math.PI * 2); c.stroke();
    c.restore();
  }
  // 菜
  if (food > 0) {
    c.save(); c.globalAlpha *= food;
    c.fillStyle = '#4a1e14'; c.beginPath(); c.ellipse(-r * 0.05, r * 0.02, r * 0.46, r * 0.36, 0.4, 0, Math.PI * 2); c.fill();
    c.fillStyle = '#7a3a22'; c.beginPath(); c.ellipse(-r * 0.12, -r * 0.05, r * 0.26, r * 0.18, 0.2, 0, Math.PI * 2); c.fill();
    c.fillStyle = '#9a5a30'; c.beginPath(); c.ellipse(r * 0.16, r * 0.12, r * 0.15, r * 0.1, -0.5, 0, Math.PI * 2); c.fill();
    c.fillStyle = '#5c6a3a'; for (let i = 0; i < 5; i++) { c.beginPath(); c.ellipse(r * (0.25 - i * 0.1), -r * (0.25 - i * 0.04), r * 0.05, r * 0.025, i, 0, Math.PI * 2); c.fill(); }
    c.fillStyle = 'rgba(255,240,220,0.35)'; c.beginPath(); c.ellipse(-r * 0.2, -r * 0.12, r * 0.08, r * 0.04, 0.4, 0, Math.PI * 2); c.fill();
    c.restore();
  }
  // 边缘高光
  c.strokeStyle = `rgba(255,240,220,${0.25 + 0.2 * morph})`; c.lineWidth = r * 0.03;
  c.beginPath(); c.arc(0, 0, r * 0.985, Math.PI * 1.05, Math.PI * 1.6); c.stroke();
  c.restore();
}

// 盘底 → 挂钟（k：0 = 盘底，1 = 钟面）。时间 h:m:s 用角度给
function plateBottomToClock(c, r, k, t = {}) {
  const { min = 54, hr = 17, sec = 0, rot = 0 } = t;
  c.save();
  c.rotate(rot);
  // 外圈：瓷边 → 深色钟框
  c.fillStyle = rgb(mixc([206, 198, 184], [34, 30, 28], k)); c.beginPath(); c.arc(0, 0, r, 0, Math.PI * 2); c.fill();
  c.fillStyle = rgb(mixc([222, 214, 200], [222, 214, 196], k)); c.beginPath(); c.arc(0, 0, r * lerp(0.94, 0.88, k), 0, Math.PI * 2); c.fill();
  // 圈足 → 刻度环
  c.strokeStyle = rgb(mixc([170, 160, 144], [40, 36, 32], k), 1); c.lineWidth = r * lerp(0.05, 0.012, k);
  c.beginPath(); c.arc(0, 0, r * lerp(0.6, 0.8, k), 0, Math.PI * 2); c.stroke();
  // 盘底的釉色标记 → 消失
  if (k < 1) {
    c.save(); c.globalAlpha *= 1 - k;
    c.strokeStyle = 'rgba(120,60,40,0.6)'; c.lineWidth = r * 0.02;
    c.beginPath(); c.arc(0, 0, r * 0.14, 0, Math.PI * 2); c.stroke();
    c.font = FONT.enMed(r * 0.08); c.textAlign = 'center'; c.fillStyle = 'rgba(120,60,40,0.6)'; c.fillText('PORCELAIN', 0, r * 0.32);
    c.restore();
  }
  if (k > 0) {
    c.save(); c.globalAlpha *= k;
    c.fillStyle = '#2a2622';
    for (let i = 0; i < 60; i++) {
      c.save(); c.rotate((i / 60) * Math.PI * 2);
      const big = i % 5 === 0;
      c.fillRect(-r * (big ? 0.012 : 0.005), -r * 0.86, r * (big ? 0.024 : 0.01), r * (big ? 0.1 : 0.05));
      c.restore();
    }
    c.font = FONT.enMed(r * 0.07); c.textAlign = 'center'; c.textBaseline = 'middle';
    c.fillText('OFFICE', 0, -r * 0.35);
    // 时针、分针、秒针
    const hand = (ang, len, w, col) => { c.save(); c.rotate(ang); c.fillStyle = col; c.fillRect(-w / 2, -len, w, len + r * 0.12); c.restore(); };
    hand(((hr % 12) + min / 60) / 12 * Math.PI * 2, r * 0.45, r * 0.05, '#1e1a18');
    hand((min / 60) * Math.PI * 2, r * 0.68, r * 0.032, '#1e1a18');
    hand((sec / 60) * Math.PI * 2, r * 0.78, r * 0.012, '#9a2c24');
    c.fillStyle = '#9a2c24'; c.beginPath(); c.arc(0, 0, r * 0.035, 0, Math.PI * 2); c.fill();
    c.restore();
  }
  c.restore();
}

// ---------------- 俯视的人（看头顶和肩） ----------------
// o: { pal, face(朝向，弧度，0 = 朝右), lean, laugh, armN/armF:[x,y]（手的位置，局部坐标）, s }
function topPerson(c, o) {
  const { pal, face = 0, laugh = 0, t = 0, head = 0, chairCol = '#1e1612' } = o;
  c.save();
  c.rotate(face);
  // 椅背
  if (o.chair !== false) { c.fillStyle = chairCol; L.rrect(c, -86, -78, 26, 156, 10); c.fill(); }
  const bob = laugh * Math.sin(t * 9) * 3;
  // 手臂（从肩到手）
  const sh = [[0, -58], [0, 58]];
  const arms = [o.armL || [70, -70], o.armR || [70, 70]];
  arms.forEach((hp, i) => {
    L.limb(c, [sh[i][0] + 6, sh[i][1]], hp, 34, 26, L.shade(pal.shirt, 0.85));
    c.fillStyle = pal.skin; c.beginPath(); c.ellipse(hp[0] + 8, hp[1], 16, 13, 0, 0, Math.PI * 2); c.fill();
  });
  // 肩
  const g = c.createLinearGradient(-40, 0, 40, 0);
  g.addColorStop(0, L.shade(pal.shirt, 0.7)); g.addColorStop(1, L.shade(pal.shirt, 1.12));
  c.fillStyle = g;
  c.beginPath(); c.ellipse(bob * 0.3, 0, 40, 74, 0, 0, Math.PI * 2); c.fill();
  // 头：头发 + 朝前的一点脸（额头、鼻梁）
  c.save();
  c.translate(6 + bob, 0);
  c.rotate(head);
  c.fillStyle = pal.skin; c.beginPath(); c.ellipse(16, 0, 26, 28, 0, 0, Math.PI * 2); c.fill();
  c.fillStyle = L.shade(pal.skin, 0.85); c.beginPath(); c.ellipse(36, 0, 6, 5, 0, 0, Math.PI * 2); c.fill();
  c.fillStyle = pal.hair; c.beginPath(); c.ellipse(-2, 0, 32, 33, 0, 0, Math.PI * 2); c.fill();
  c.fillStyle = 'rgba(255,230,200,0.12)'; c.beginPath(); c.ellipse(-8, -10, 14, 10, 0.5, 0, Math.PI * 2); c.fill();
  c.restore();
  c.restore();
}

// ---------------- 深色木桌面（俯视，缓存） ----------------
const woodCache = new Map();
function wood(w, h, seed = 1, base = [58, 42, 32]) {
  const key = `${w}x${h}:${seed}`;
  if (woodCache.has(key)) return woodCache.get(key);
  const c = createCanvas(w, h), x = c.getContext('2d');
  x.fillStyle = rgb(base); x.fillRect(0, 0, w, h);
  mottle(x, w, h, 8, seed, 0.25, base.map((v) => v * 0.55));
  const r = rng(seed + 1);
  for (let i = 0; i < h / 3; i++) {
    const y = r() * h;
    x.strokeStyle = r() < 0.5 ? `rgba(20,12,8,${0.06 + r() * 0.1})` : `rgba(140,100,70,${0.03 + r() * 0.05})`;
    x.lineWidth = 0.8 + r() * 2.2;
    x.beginPath(); x.moveTo(0, y);
    for (let xx = 0; xx <= w; xx += 80) x.lineTo(xx, y + Math.sin(xx * 0.004 + i) * 6 + (r() - 0.5) * 2);
    x.stroke();
  }
  woodCache.set(key, c);
  return c;
}

// 散焦的暖色光斑背景（餐厅远处）
const bokehCache = new Map();
function bokeh(w, h, seed, warm = true) {
  const key = `${w}x${h}:${seed}:${warm}`;
  if (bokehCache.has(key)) return bokehCache.get(key);
  const c = createCanvas(w, h), x = c.getContext('2d');
  const g = x.createLinearGradient(0, 0, 0, h);
  g.addColorStop(0, warm ? '#211913' : '#15181c'); g.addColorStop(1, warm ? '#120d0a' : '#0c0d0f');
  x.fillStyle = g; x.fillRect(0, 0, w, h);
  const r = rng(seed);
  for (let i = 0; i < 46; i++) {
    const cx = r() * w, cy = r() * h, rr = 30 + r() * 120;
    const gg = x.createRadialGradient(cx, cy, 0, cx, cy, rr);
    const col = warm ? (r() < 0.8 ? [255, 190, 120] : [200, 150, 110]) : (r() < 0.7 ? [150, 172, 204] : [230, 180, 110]);
    gg.addColorStop(0, rgb(col, 0.06 + r() * 0.16)); gg.addColorStop(0.7, rgb(col, 0.03)); gg.addColorStop(1, rgb(col, 0));
    x.fillStyle = gg; x.fillRect(cx - rr, cy - rr, rr * 2, rr * 2);
  }
  bokehCache.set(key, c);
  return c;
}

// 运动拖影：沿速度方向叠几层半透明（只给快速移动的物体用）
function smear(c, vx, vy, n, fn) {
  for (let i = n; i >= 1; i--) {
    c.save();
    c.globalAlpha *= 0.18 * (1 - i / (n + 1));
    c.translate(-vx * i / n, -vy * i / n);
    fn();
    c.restore();
  }
  fn();
}

module.exports = { handshake, chip, CHIPS, plateBottomToClock, topPerson, wood, bokeh, smear, SKIN_P, SKIN_V, KNIT, NAVY, rgb, mixc };
