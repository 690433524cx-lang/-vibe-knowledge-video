// 桌面特写（俯视）：桌布、账单夹、主角的手。第一幕的账单特写和第二幕「一双手在做选择」共用。
// st = { cam:{cx,cy,s,rot}, folder:{x,y,rot,open,slip,amountGlow,underline}, handR, handL, phone:{x,y,rot}, t }
const { createCanvas } = require('@napi-rs/canvas');
const L = require('./lib');
const { W, H, rng, noise1 } = L;
const { mottle } = require('../../src/lib/material');

let cloth = null;
function clothTex() {
  if (cloth) return cloth;
  const w = Math.round(W * 1.5), h = Math.round(H * 1.5);
  const c = createCanvas(w, h), x = c.getContext('2d');
  x.fillStyle = '#b5a68b';
  x.fillRect(0, 0, w, h);
  mottle(x, w, h, 6, 401, 0.25, [120, 100, 76]);
  mottle(x, w, h, 40, 402, 0.07, [90, 74, 56]);
  mottle(x, w, h, 12, 403, 0.12, [214, 200, 176]);
  // 亚麻的经纬
  const r = rng(404);
  for (let y = 0; y < h; y += 3) { x.fillStyle = `rgba(70,56,40,${0.025 + r() * 0.035})`; x.fillRect(0, y, w, 1); }
  for (let xx = 0; xx < w; xx += 3) { x.fillStyle = `rgba(255,240,215,${0.015 + r() * 0.02})`; x.fillRect(xx, 0, 1, h); }
  // 两道大的折痕
  for (const [y0, a] of [[h * 0.36, 0.1], [h * 0.71, 0.08]]) {
    const g = x.createLinearGradient(0, y0 - 30, 0, y0 + 30);
    g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(0.48, `rgba(60,44,30,${a})`); g.addColorStop(0.52, `rgba(255,240,215,${a})`); g.addColorStop(1, 'rgba(0,0,0,0)');
    x.fillStyle = g; x.fillRect(0, y0 - 30, w, 60);
  }
  cloth = c;
  return c;
}

function plateTop(x, cx, cy, r) {
  x.fillStyle = 'rgba(30,20,14,0.35)'; x.beginPath(); x.ellipse(cx + 14, cy + 18, r, r * 0.8, 0, 0, Math.PI * 2); x.fill();
  x.fillStyle = '#d6cebf'; x.beginPath(); x.ellipse(cx, cy, r, r * 0.8, 0, 0, Math.PI * 2); x.fill();
  x.fillStyle = '#bdb3a2'; x.beginPath(); x.ellipse(cx, cy, r * 0.7, r * 0.56, 0, 0, Math.PI * 2); x.fill();
  x.fillStyle = '#5a2c1e'; x.beginPath(); x.ellipse(cx - r * 0.1, cy, r * 0.4, r * 0.28, 0.3, 0, Math.PI * 2); x.fill();
  x.fillStyle = '#7a4a2a'; x.beginPath(); x.ellipse(cx + r * 0.12, cy - r * 0.08, r * 0.22, r * 0.14, -0.3, 0, Math.PI * 2); x.fill();
}
function glassTop(x, cx, cy, r) {
  x.fillStyle = 'rgba(20,14,10,0.3)'; x.beginPath(); x.ellipse(cx + 10, cy + 14, r, r * 0.85, 0, 0, Math.PI * 2); x.fill();
  x.strokeStyle = 'rgba(220,226,230,0.55)'; x.lineWidth = 5; x.beginPath(); x.ellipse(cx, cy, r, r * 0.85, 0, 0, Math.PI * 2); x.stroke();
  x.fillStyle = 'rgba(96,18,20,0.6)'; x.beginPath(); x.ellipse(cx, cy + 4, r * 0.7, r * 0.58, 0, 0, Math.PI * 2); x.fill();
  x.fillStyle = 'rgba(255,248,236,0.6)'; x.beginPath(); x.ellipse(cx - r * 0.4, cy - r * 0.45, r * 0.14, r * 0.06, -0.6, 0, Math.PI * 2); x.fill();
}
function phoneTop(x, p) {
  x.save(); x.translate(p.x, p.y); x.rotate(p.rot);
  x.fillStyle = 'rgba(18,12,8,0.4)'; L.rrect(x, -78, -146, 168, 310, 26); x.fill();
  x.fillStyle = '#1c1c1e'; L.rrect(x, -84, -156, 168, 312, 24); x.fill();
  x.fillStyle = '#2c2c30'; L.rrect(x, -60, -130, 54, 54, 14); x.fill();
  x.fillStyle = 'rgba(255,255,255,0.08)'; x.fillRect(-84, -156, 30, 312);
  x.restore();
}

function drawInsert(ctx, st) {
  const cam = st.cam;
  const t = st.t || 0;
  // 桌布（地面层）
  L.withCam(ctx, cam, 1, () => {
    const c = clothTex();
    ctx.drawImage(c, (W - c.width) / 2, (H - c.height) / 2);
    // 远处（上方）的盘子和筷子，散焦
    L.blurred(ctx, 7, (x) => {
      plateTop(x, 330, 150, 210);
      plateTop(x, 1640, 120, 180);
      x.save(); x.translate(560, 330); x.rotate(-0.2);
      x.fillStyle = '#3a2a1c'; x.fillRect(-160, -6, 320, 8); x.fillRect(-160, 10, 320, 8);
      x.restore();
    });
    if (st.phone) phoneTop(ctx, st.phone);
    const f = st.folder;
    if (f) {
      ctx.save();
      ctx.translate(f.x, f.y);
      ctx.rotate(f.rot || 0);
      ctx.scale(f.sc || 1, f.sc || 1);
      L.billFolder(ctx, f);
      ctx.restore();
    }
    if (st.handL) L.hand(ctx, { ...st.handL, sleeve: '#8c7258' });
    if (st.handR) L.hand(ctx, { ...st.handR, sleeve: '#8c7258' });
    if (st.handB) L.hand(ctx, { ...st.handB, sleeve: '#3c4148', skin: '#b88f72' });
  });
  // 前景：酒杯杯口，离镜头更近，散焦、移动更多
  L.withCam(ctx, { ...cam, s: cam.s * 1.0 }, 1.35, () => {
    L.blurred(ctx, 12, (x) => glassTop(x, 1660 + noise1(t * 0.3, 3) * 6, 930, 150), 0.9);
  });
}

// 光：一束落在账单夹 / 手上的暖光
function insertLights(st) {
  const f = st.folder || { x: 960, y: 540 };
  const ls = [
    { x: f.x - 80, y: f.y + 60, rx: 900, ry: 640, i: 1.0, color: [255, 204, 146] },
  ];
  if (st.spot) ls.push({ x: st.spot[0], y: st.spot[1], rx: st.spot[2], ry: st.spot[2] * 0.8, i: 0.8, color: [255, 214, 160] });
  return L.camLights(st.cam, ls).map((l) => ({ ...l, w: (l.w ?? 1) * (st.lightW ?? 1) }));
}

module.exports = { drawInsert, insertLights, clothTex };
