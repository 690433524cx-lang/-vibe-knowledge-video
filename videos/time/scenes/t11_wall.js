// 第十一幕 · 90.4–100.8 秒：空墙。
//   夜里的房间，人坐在床边，手机的光照着手；他关掉手机，房间一下子很安静。
//   镜头慢慢拉远。他面前是一整面空墙：月光一样的冷光落在墙上，墙上只有一块颜色浅一点的方印——
//   那里曾经挂过什么。最后一句停留 3 秒以上。
const L = require('../lib');
const { W, H, FONT, rng, noise1, lerp, clamp, prog, smooth } = L;

const S = { start: 90.3, end: 101.0 };
const W0 = 90.4, OFF = 91.9;

function room(ctx, d) {
  // 墙
  const g = ctx.createLinearGradient(0, 0, W, 0);
  g.addColorStop(0, '#20252c');
  g.addColorStop(1, '#2c333c');
  ctx.fillStyle = g;
  ctx.fillRect(-200, -200, W + 400, H + 400);
  ctx.save();
  ctx.globalCompositeOperation = 'multiply';
  ctx.globalAlpha = 0.5;
  ctx.drawImage(L.wallTex(W, H, [200, 205, 212], 1101, { cells: 8 }), 0, 0);
  ctx.restore();
  // 窗外照进来的冷光，落在空墙上
  L.blurred(ctx, 20, (c) => {
    c.fillStyle = 'rgba(170,190,215,0.32)';
    c.beginPath(); c.moveTo(880, 180); c.lineTo(1560, 140); c.lineTo(1620, 760); c.lineTo(900, 820); c.closePath(); c.fill();
    c.globalCompositeOperation = 'destination-out';
    c.fillStyle = 'rgba(0,0,0,0.6)';
    c.fillRect(1210, 120, 24, 760);
  });
  // 曾经挂过画的地方：一块浅一点的方印 + 一个钉子
  ctx.fillStyle = 'rgba(200,210,220,0.07)';
  ctx.fillRect(1080, 300, 300, 220);
  ctx.strokeStyle = 'rgba(200,210,220,0.08)';
  ctx.lineWidth = 2;
  ctx.strokeRect(1080, 300, 300, 220);
  ctx.fillStyle = '#4a4e54';
  ctx.beginPath(); ctx.arc(1230, 284, 4, 0, Math.PI * 2); ctx.fill();
  // 地面和踢脚线
  ctx.fillStyle = '#16191d';
  ctx.fillRect(-200, 900, W + 400, 400);
  ctx.fillStyle = '#2a2f36';
  ctx.fillRect(-200, 890, W + 400, 12);
  // 床（左边）
  ctx.fillStyle = '#2c3038';
  ctx.fillRect(-200, 700, 760, 210);
  ctx.fillStyle = '#3a404a';
  ctx.fillRect(-200, 680, 760, 40);
  ctx.fillStyle = '#4a515c';
  ctx.beginPath(); ctx.roundRect(-160, 610, 300, 90, 40); ctx.fill();
}

function person(ctx, d) {
  const off = smooth(prog(d, OFF, OFF + 0.5));
  const up = smooth(prog(d, 95.6, 97.2)); // 抬头看向墙
  L.lit(ctx, (c) => {
    c.translate(440, 700);
    L.side(c, { h: 760, kind: 'adult', f: 1, yaw: 1, pose: {
      torso: lerp(0.32, 0.22, up), neck: lerp(0.45, 0.05, up), head: lerp(0.25, -0.12, up),
      reachN: [lerp(170, 120, off), lerp(-130, -40, off)], handN: lerp(2.2, 1.0, off),
      reachF: [lerp(160, 140, off), lerp(-140, -20, off)], handF: lerp(2.2, 1.2, off),
      thighN: 1.45, shinN: 0.05, thighF: 1.4, shinF: 0.0, footN: 1.57, footF: 1.57,
    } });
    // 手机
    c.save();
    c.translate(lerp(225, 160, off), lerp(-200, -60, off));
    c.rotate(lerp(-1.0, -0.2, off));
    c.fillStyle = '#0c0d10'; c.fillRect(-32, -56, 64, 112);
    c.fillStyle = `rgba(200,215,235,${0.9 * (1 - off)})`; c.fillRect(-28, -52, 56, 104);
    c.restore();
  }, { light: -0.3, rim: [180, 200, 225], rimA: 0.8, rimW: 3.5, shadow: 0.55, ambient: 0.85, bbox: [300, 200, 500, 700] });
  if (off < 1) {
    const gl = ctx.createRadialGradient(640, 520, 0, 640, 520, 300);
    gl.addColorStop(0, `rgba(180,205,240,${0.3 * (1 - off)})`);
    gl.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = gl;
    ctx.fillRect(340, 220, 600, 600);
  }
}

function draw(ctx, d) {
  const k = smooth(prog(d, W0, 100.8));
  const cam = { cx: lerp(760, 960, k), cy: lerp(560, 540, k), s: lerp(1.22, 1.0, k) };
  ctx.fillStyle = '#101216';
  ctx.fillRect(0, 0, W, H);
  ctx.save();
  ctx.globalAlpha = smooth(prog(d, W0 - 0.1, W0 + 0.5));
  L.withCam(ctx, cam, 1, () => { room(ctx, d); person(ctx, d); });
  ctx.restore();
}

function light(d) {
  const off = smooth(prog(d, OFF, OFF + 0.5));
  return [
    { x: 1240, y: 480, rx: 900, ry: 700, i: 0.85, color: [170, 190, 215] },
    { x: 620, y: 520, rx: 520, ry: 520, i: 0.75 * (1 - off) + 0.25, color: [180, 205, 240] },
  ];
}
function grade(d) { return { warm: -0.45, ambient: 0.3 }; }

module.exports = { ...S, draw, light, grade };
