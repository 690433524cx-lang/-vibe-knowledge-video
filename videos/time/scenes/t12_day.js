// 第十二幕 · 100.8–109.2 秒：稍微不一样的一天。
//   还是那节地铁、同一个机位（与第三幕相同的侧面构图）。但这一次他抬起了头：
//   车窗外在下雨，玻璃上有雨痕；旁边的小孩在纸上画画；远处有人在笑。
//   到站时他没有马上低头看手机——手机收了起来，他还看着窗外。冷色里第一次出现暖色。
const L = require('../lib');
const { W, H, FONT, rng, noise1, lerp, clamp, prog, smooth } = L;

const S = { start: 100.7, end: 109.5 };
const D0 = 100.8, LOOK = 101.6, STOPT = 106.2;

function draw(ctx, d) {
  const look = smooth(prog(d, LOOK, LOOK + 1.0));
  const stop = smooth(prog(d, STOPT, STOPT + 1.6));
  const speed = 1 - stop * 0.92;
  const tt = d - D0;
  ctx.fillStyle = '#4a5654';
  ctx.fillRect(0, 0, W, H);
  // 车窗：地面段，窗外是下雨的城市
  const X0 = 360, Y0 = 150, X1 = 1700, Y1 = 600;
  ctx.save();
  ctx.beginPath(); ctx.roundRect(X0, Y0, X1 - X0, Y1 - Y0, 34); ctx.clip();
  const sky = ctx.createLinearGradient(0, Y0, 0, Y1);
  sky.addColorStop(0, '#7a8690'); sky.addColorStop(1, '#4e5a62');
  ctx.fillStyle = sky; ctx.fillRect(X0, Y0, X1 - X0, Y1 - Y0);
  const off = tt * 380 * (1 - stop * 0.6) - stop * stop * 100;
  L.blurred(ctx, 6, (c) => {
    const r = rng(1201);
    for (let i = 0; i < 14; i++) {
      const x = ((i * 220 - off) % 3080 + 3080) % 3080 - 300;
      c.fillStyle = '#3a4448'; const h = 120 + r() * 220;
      c.fillRect(x, Y1 - h, 180, h);
      c.fillStyle = 'rgba(255,214,150,0.7)';
      for (let k = 0; k < 4; k++) if (r() < 0.6) c.fillRect(x + 20 + (k % 2) * 80, Y1 - h + 30 + Math.floor(k / 2) * 60, 30, 24);
    }
  });
  // 玻璃上的雨痕
  const r = rng(1202);
  ctx.strokeStyle = 'rgba(220,230,235,0.35)';
  ctx.lineWidth = 2;
  for (let i = 0; i < 70; i++) {
    const x = X0 + r() * (X1 - X0), y = Y0 + ((r() * (Y1 - Y0) + tt * (60 + r() * 80)) % (Y1 - Y0));
    ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x - 30 * speed - 3, y + 6 + 10 * (1 - speed)); ctx.stroke();
  }
  ctx.restore();
  ctx.fillStyle = '#3c4846'; ctx.fillRect(0, 600, W, 40);
  ctx.fillStyle = '#4c5e7a'; ctx.beginPath(); ctx.roundRect(0, 640, W, 160, 14); ctx.fill();
  ctx.fillStyle = '#42526c'; ctx.fillRect(0, 790, W, 80);
  ctx.fillStyle = '#262a2e'; ctx.fillRect(0, 870, W, 210);
  ctx.fillStyle = '#b4baba'; ctx.fillRect(250, 0, 16, 1080);
  // 远处有人在笑（暖光里，肩膀在抖）
  const laugh = Math.abs(Math.sin(tt * 7)) * 6 * smooth(prog(d, 102.5, 103)) * (1 - smooth(prog(d, 105, 105.6)));
  L.blurred(ctx, 6, (c) => {
    c.translate(1820, 760 - laugh);
    L.bust(c, { h: 900, pal: { skin: '#a88a70', shirt: '#7a5a48', jacket: '#7a5a48', hair: '#2a2220' }, tilt: -0.12 });
  }, 0.85);
  // 他：先低着头，然后抬起来看窗外；到站时把手机收起来
  const away = smooth(prog(d, STOPT + 0.4, STOPT + 1.4));
  L.lit(ctx, (c) => {
    c.translate(900, 800);
    L.side(c, { h: 860, kind: 'adult', f: 1, yaw: lerp(1, 0.75, look), pose: {
      torso: lerp(0.18, 0.04, look), neck: lerp(0.42, -0.05, look), head: lerp(0.28, -0.2, look),
      reachN: [lerp(150, 60, away), lerp(-110, -10, away)], handN: lerp(2.0, 0.6, away), reachF: [lerp(140, 70, away), lerp(-116, -20, away)], handF: lerp(2.0, 0.6, away),
      thighN: 1.5, shinN: 0.1, thighF: 1.45, shinF: 0.05, footN: 1.57, footF: 1.57,
    } });
    if (away < 0.6) {
      c.save(); c.translate(lerp(162, 80, away), lerp(-140, -40, away)); c.rotate(-1.1);
      c.fillStyle = `rgba(207,220,238,${(1 - look * 0.7) * (1 - away)})`; c.fillRect(-28, -48, 56, 96);
      c.restore();
    }
  }, { light: -1.2, rim: [240, 214, 180], rimA: 0.85, shadow: 0.45, ambient: 0.95, bbox: [760, 200, 520, 700] });
  // 旁边的小孩，在纸上画画（暖色的蜡笔线一点点多起来）
  L.lit(ctx, (c) => {
    c.translate(1560, 800);
    L.side(c, { h: 520, kind: 'child', f: -1, yaw: 1, pal: { ...L.PAL.child, shirt: '#c8a060' }, pose: {
      torso: 0.35, neck: 0.4, head: 0.25, reachN: [-170, -40 + Math.sin(tt * 9) * 6], handN: 1.9, reachF: [-150, -30], handF: 1.8,
      thighN: 1.5, shinN: 0.1, thighF: 1.45, shinF: 0.1, footN: 1.57, footF: 1.57,
    } });
  }, { light: -1.6, rim: [255, 214, 160], rimA: 0.7, shadow: 0.4, ambient: 0.95, bbox: [1100, 400, 400, 500] });
  // 画纸
  ctx.save();
  ctx.translate(1395, 770);
  ctx.rotate(0.06);
  ctx.fillStyle = '#eee6d4'; ctx.fillRect(-90, -40, 180, 120);
  const strokes = Math.floor(clamp((d - D0) / 7) * 9);
  const cols = ['#d0603a', '#e0b040', '#4a8ac0', '#5aa060', '#d0603a', '#e0b040', '#4a8ac0', '#d07aa0', '#5aa060'];
  const rr = rng(1203);
  ctx.lineWidth = 4; ctx.lineCap = 'round';
  for (let i = 0; i < strokes; i++) {
    ctx.strokeStyle = cols[i];
    ctx.beginPath(); const x = -70 + rr() * 130, y = -20 + rr() * 80; ctx.moveTo(x, y); ctx.quadraticCurveTo(x + 20, y - 20 + rr() * 40, x + 30 + rr() * 30, y + rr() * 20); ctx.stroke();
  }
  ctx.restore();
}

function light(d) {
  return [
    { x: 1000, y: 460, rx: 1300, ry: 700, i: 1, color: [190, 205, 220] },
    { x: 1450, y: 720, rx: 420, ry: 320, i: 0.7 * smooth(prog(d, 102, 103.5)) },
  ];
}
function grade(d) { return { warm: lerp(-0.3, 0.0, smooth(prog(d, 102, 107))), ambient: 0.36 }; }

module.exports = { ...S, draw, light, grade };
