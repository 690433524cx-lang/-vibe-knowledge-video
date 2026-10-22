// 第四幕 · 22.7–33.6 秒：第一次。
//   上一幕留下的空白时间轴变暖、变亮，镜头开始横移，经过一排童年的「第一次」：
//   进校门 → 坐火车 → 看到海 → 自己买东西 → 骑车摔倒 → 在同学家过夜 → 喜欢一个人。
//   每一格经过画面中心时亮起来，角落里一个铅笔写的「第一次」。最后停住，中央出现锚词「第一次」。
const L = require('../lib');
const { W, H, FONT, rng, noise1, lerp, clamp, prog, smooth } = L;

const S = { start: 22.5, end: 34.0 };
const T0 = 22.7, PAN0 = 23.0, PAN1 = 31.3, ANCHOR = 31.5;
const PW = 1180, GAP = 40; // 每一格的宽度、格间的暗缝

// ---------------- 七个「第一次」：局部坐标 0..PW × 0..H ----------------
function sky(ctx, a, b, h = H) {
  const g = ctx.createLinearGradient(0, 0, 0, h);
  g.addColorStop(0, a); g.addColorStop(1, b);
  ctx.fillStyle = g; ctx.fillRect(0, 0, PW, h);
}
const LIT = (o = {}) => ({ light: -0.6, rim: [255, 220, 170], rimA: 0.85, rimW: 4, shadow: 0.45, ambient: 0.9, bbox: [0, 0, W, H], ...o });
function bag(c, sh) { c.fillStyle = '#7a3a2c'; c.beginPath(); c.roundRect(sh[0] - 70, sh[1] - 10, 60, 120, 14); c.fill(); }

// 1 第一次进校门：早晨，背着书包走进铁门
function school(ctx, t) {
  sky(ctx, '#e6d8b8', '#cdbb94', 700);
  ctx.fillStyle = '#9c8e76';
  ctx.fillRect(0, 700, PW, 380);
  // 校门：两根砖柱 + 打开的铁门
  ctx.fillStyle = '#8a6e5a';
  ctx.fillRect(160, 180, 120, 560); ctx.fillRect(880, 180, 120, 560);
  ctx.fillStyle = '#6e5646';
  ctx.fillRect(140, 160, 160, 30); ctx.fillRect(860, 160, 160, 30);
  ctx.strokeStyle = '#3a3a3c'; ctx.lineWidth = 5;
  for (let i = 0; i < 6; i++) { ctx.beginPath(); ctx.moveTo(300 + i * 28, 330); ctx.lineTo(300 + i * 28, 740); ctx.stroke(); }
  ctx.beginPath(); ctx.moveTo(280, 340); ctx.lineTo(450, 350); ctx.moveTo(280, 720); ctx.lineTo(450, 715); ctx.stroke();
  // 门里：操场和教学楼（远、淡）
  L.blurred(ctx, 4, (c) => {
    c.fillStyle = '#d9c7a2'; c.fillRect(300, 300, 580, 400);
    c.fillStyle = '#b29a7a'; for (let i = 0; i < 5; i++) c.fillRect(330 + i * 110, 360, 70, 60);
  });
  const x = 520 + t * 24;
  L.lit(ctx, (c) => {
    c.translate(x, 900);
    const ph = t * 5;
    const p = L.side(c, { h: 470, kind: 'child', f: 1, pose: { torso: 0.08, thighN: Math.sin(ph) * 0.35, shinN: Math.sin(ph) * 0.2 - 0.1, thighF: -Math.sin(ph) * 0.35, shinF: -Math.sin(ph) * 0.2 - 0.1, uArmN: -Math.sin(ph) * 0.3, fArmN: 0.1, uArmF: Math.sin(ph) * 0.3, fArmF: 0.2 } });
    bag(c, p.sh);
  }, LIT({ light: -0.9 }));
}

// 2 第一次坐火车：跪在座位上，趴着车窗看外面的田
function train(ctx, t) {
  ctx.fillStyle = '#5a5248'; ctx.fillRect(0, 0, PW, H);
  // 车窗外：田野和电线杆飞过
  ctx.save();
  ctx.beginPath(); ctx.roundRect(170, 180, 820, 420, 30); ctx.clip();
  sky(ctx, '#ecdcb6', '#d8c79c', 600);
  ctx.fillStyle = '#8fa070'; ctx.fillRect(170, 430, 820, 200);
  ctx.fillStyle = '#7a8c5c';
  for (let i = 0; i < 8; i++) { const x = ((i * 160 - t * 900) % 1280 + 1280) % 1280 - 100; ctx.fillRect(x, 470 + (i % 3) * 30, 140, 6); }
  ctx.fillStyle = '#4a4238';
  for (let i = 0; i < 3; i++) { const x = ((i * 500 - t * 1600) % 1500 + 1500) % 1500 - 200; ctx.fillRect(x, 220, 10, 300); }
  ctx.restore();
  ctx.fillStyle = '#3a342e'; ctx.fillRect(140, 600, 880, 30);
  // 座椅
  ctx.fillStyle = '#3c5a6e'; ctx.fillRect(120, 720, 700, 120); ctx.fillRect(120, 560, 90, 280);
  L.lit(ctx, (c) => {
    c.translate(520, 700);
    L.side(c, { h: 470, kind: 'child', f: 1, pose: { torso: 0.35, neck: 0.1, head: -0.2, reachN: [210, -110], handN: 1.6, reachF: [200, -118], handF: 1.6, ankleN: [-120, 100], footN: -1.5, ankleF: [-130, 96], footF: -1.5 } });
  }, LIT({ light: -0.2 }));
}

// 3 第一次看到海：小小的背影站在浪边
function sea(ctx, t) {
  sky(ctx, '#e8dcc0', '#cfd2c4', 520);
  ctx.fillStyle = '#6f8a8c'; ctx.fillRect(0, 500, PW, 260);
  ctx.strokeStyle = 'rgba(240,236,222,0.6)'; ctx.lineWidth = 3;
  for (let i = 0; i < 7; i++) {
    const y = 540 + i * 34 + Math.sin(t * 2 + i) * 4;
    ctx.beginPath(); ctx.moveTo(0, y); for (let x = 0; x <= PW; x += 40) ctx.lineTo(x, y + Math.sin(x * 0.02 + t * 3 + i) * 3); ctx.stroke();
  }
  ctx.fillStyle = '#d6c4a0'; ctx.fillRect(0, 760, PW, 320);
  // 浪花漫上沙滩
  const k = 0.5 + 0.5 * Math.sin(t * 1.8);
  ctx.fillStyle = 'rgba(245,240,228,0.75)';
  ctx.beginPath(); ctx.moveTo(0, 760); for (let x = 0; x <= PW; x += 30) ctx.lineTo(x, 770 + k * 50 + Math.sin(x * 0.03 + t) * 10); ctx.lineTo(PW, 760); ctx.fill();
  L.lit(ctx, (c) => {
    c.translate(600, 880);
    L.side(c, { h: 360, kind: 'child', f: 1, yaw: 0.6, pose: { torso: 0.02, neck: -0.1, head: -0.25, uArmN: 0.4, fArmN: 0.6, uArmF: 0.35, fArmF: 0.5 } });
  }, LIT({ light: -0.4 }));
}

// 4 第一次自己买东西：踮着脚把钱递上柜台
function shop(ctx, t) {
  ctx.fillStyle = '#6a5240'; ctx.fillRect(0, 0, PW, H);
  // 货架上的罐子和零食
  for (let r = 0; r < 4; r++) {
    ctx.fillStyle = '#4a3828'; ctx.fillRect(80, 140 + r * 150, 1000, 12);
    const rr = rng(40 + r);
    for (let i = 0; i < 12; i++) {
      ctx.fillStyle = ['#c0603a', '#d8b050', '#6a8a5a', '#d8d0b8', '#a03a3a'][Math.floor(rr() * 5)];
      ctx.fillRect(100 + i * 82, 60 + r * 150, 56, 80);
    }
  }
  // 柜台
  ctx.fillStyle = '#8a6a4c'; ctx.fillRect(560, 560, 620, 520);
  ctx.fillStyle = '#a07e5c'; ctx.fillRect(540, 540, 640, 26);
  const up = smooth(prog(t, 0.2, 0.7));
  L.lit(ctx, (c) => {
    c.translate(420, 930 - up * 14);
    L.side(c, { h: 470, kind: 'child', f: 1, pose: { torso: 0.08, neck: -0.2, head: -0.3, reachN: [190, -360 - up * 30], handN: 2.6, uArmF: 0.1, fArmF: 0.3, footN: 2.2 * up + 1.57 * (1 - up), footF: 2.2 * up + 1.57 * (1 - up) } });
    // 钱
    c.fillStyle = '#7aa070'; c.fillRect(190, -420 - up * 30, 70, 36);
  }, LIT({ light: -0.5 }));
  // 店主的手（从柜台后伸过来）
  L.limb(ctx, [1180, 470], [760, 500 - up * 20], 70, 54, '#9c7a60');
}

// 5 第一次骑车摔倒：车倒在一边，坐在地上抱着膝盖
function fall(ctx, t) {
  sky(ctx, '#e2cfa6', '#c9b48c', 640);
  ctx.fillStyle = '#9a8a72'; ctx.fillRect(0, 640, PW, 440);
  // 倒在地上的车（侧躺）
  ctx.save(); ctx.translate(780, 860); ctx.scale(1, 0.55);
  ctx.strokeStyle = '#2a2a2c'; ctx.lineWidth = 6;
  for (const wx of [-150, 150]) { ctx.beginPath(); ctx.arc(wx, 0, 92, 0, Math.PI * 2); ctx.stroke(); }
  ctx.strokeStyle = '#7a2c24'; ctx.lineWidth = 8;
  ctx.beginPath(); ctx.moveTo(-150, 0); ctx.lineTo(-30, -10); ctx.lineTo(-60, -130); ctx.lineTo(110, -120); ctx.lineTo(150, 0); ctx.stroke();
  ctx.restore();
  const wob = Math.sin(t * 3) * 0.04;
  L.lit(ctx, (c) => {
    c.translate(420, 900);
    L.side(c, { h: 470, kind: 'child', f: 1, yaw: 0.8, pose: { torso: -0.1 + wob, neck: 0.3, head: 0.3, thighN: 2.4, shinN: 0.2, thighF: 2.2, shinF: 0.4, reachN: [150, -70], handN: 1.2, reachF: [140, -60], handF: 1.2 } });
  }, LIT({ light: -0.7 }));
}

// 6 第一次在同学家过夜：被窝里打着手电，墙上一只手影兔子
function sleepover(ctx, t) {
  ctx.fillStyle = '#26262e'; ctx.fillRect(0, 0, PW, H);
  // 手电的光圈打在墙上 + 手影
  const g = ctx.createRadialGradient(560, 330, 0, 560, 330, 300);
  g.addColorStop(0, 'rgba(255,230,180,0.85)'); g.addColorStop(1, 'rgba(255,220,160,0)');
  ctx.fillStyle = g; ctx.fillRect(200, 0, 760, 700);
  ctx.fillStyle = 'rgba(30,28,30,0.85)';
  const e = Math.sin(t * 4) * 0.15;
  ctx.save(); ctx.translate(560, 360);
  ctx.beginPath(); ctx.ellipse(0, 0, 90, 60, 0, 0, Math.PI * 2); ctx.fill();
  ctx.save(); ctx.rotate(-0.3 + e); ctx.beginPath(); ctx.ellipse(-20, -110, 22, 80, 0, 0, Math.PI * 2); ctx.fill(); ctx.restore();
  ctx.save(); ctx.rotate(0.2 - e); ctx.beginPath(); ctx.ellipse(30, -110, 22, 80, 0, 0, Math.PI * 2); ctx.fill(); ctx.restore();
  ctx.restore();
  // 床和被子，两个小脑袋
  ctx.fillStyle = '#4a4e5e'; ctx.fillRect(80, 760, 1020, 320);
  ctx.fillStyle = '#6a7088';
  ctx.beginPath(); ctx.moveTo(80, 780); ctx.quadraticCurveTo(600, 700, 1100, 780); ctx.lineTo(1100, 1080); ctx.lineTo(80, 1080); ctx.fill();
  for (const [x, hc] of [[380, '#1e1714'], [560, '#2a1e18']]) {
    ctx.fillStyle = '#c99a76'; ctx.beginPath(); ctx.ellipse(x, 730, 50, 56, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = hc; ctx.beginPath(); ctx.ellipse(x, 712, 54, 44, 0, Math.PI, Math.PI * 2); ctx.fill();
  }
  // 手电筒
  ctx.fillStyle = '#d0c4a8'; ctx.save(); ctx.translate(470, 700); ctx.rotate(-1.2); ctx.fillRect(-12, -50, 24, 90); ctx.restore();
}

// 7 第一次喜欢一个人：台阶上两个小小的背影，中间隔着一点距离
function crush(ctx, t) {
  sky(ctx, '#d8a07a', '#f0c890', 700);
  ctx.fillStyle = '#7a5a4a'; ctx.fillRect(0, 700, PW, 380);
  ctx.fillStyle = '#8a6a58'; for (let i = 0; i < 4; i++) ctx.fillRect(0, 760 + i * 80, PW, 10);
  const look = smooth(prog(t, 0.4, 0.8)) * (1 - smooth(prog(t, 1.2, 1.5)));
  L.lit(ctx, (c) => {
    c.translate(400, 780);
    L.side(c, { h: 460, kind: 'child', f: 1, yaw: lerp(1, 0.2, look), pose: { torso: 0.2, neck: 0.1, head: 0, thighN: 1.4, shinN: 0.1, thighF: 1.35, shinF: 0.15, uArmN: 0.4, fArmN: 1.4, uArmF: 0.35, fArmF: 1.3 } });
  }, LIT({ light: 0.1, rim: [255, 200, 140] }));
  L.lit(ctx, (c) => {
    c.translate(720, 780);
    L.side(c, { h: 450, kind: 'child', f: 1, pal: { ...L.PAL.child, shirt: '#c08a7a', hair: '#2a1a14' }, pose: { torso: 0.15, neck: 0.1, head: -0.05, thighN: 1.4, shinN: 0.1, thighF: 1.35, shinF: 0.15, uArmN: 0.4, fArmN: 1.4, uArmF: 0.35, fArmF: 1.3 } });
  }, LIT({ light: 0.1, rim: [255, 200, 140] }));
}

const PANELS = [school, train, sea, shop, fall, sleepover, crush];
const STRIP = PANELS.length * (PW + GAP);

// 一格：画到 clip 里，经过画面中心时变亮
function panel(ctx, i, x, t, lightK) {
  ctx.save();
  ctx.translate(x, 0);
  ctx.beginPath(); ctx.rect(0, 0, PW, H); ctx.clip();
  PANELS[i](ctx, t);
  // 暖色、轻微褪色，像记忆
  ctx.fillStyle = `rgba(20,12,8,${0.6 * (1 - lightK)})`;
  ctx.fillRect(0, 0, PW, H);
  // 角落里铅笔写的「第一次」
  ctx.globalAlpha = 0.25 + 0.6 * lightK;
  ctx.font = FONT.hand(46);
  ctx.fillStyle = '#efe2c6';
  ctx.fillText('第一次', 40, 96);
  ctx.globalAlpha = 1;
  ctx.restore();
}

const camX = (d) => {
  const k = prog(d, PAN0, PAN1);
  return lerp(-W * 0.25, STRIP - W * 0.85, k * k * (3 - 2 * k) * 0.25 + k * 0.75);
};

function draw(ctx, d) {
  ctx.fillStyle = '#120e0c';
  ctx.fillRect(0, 0, W, H);
  const cx = camX(d);
  const enter = smooth(prog(d, T0, PAN0 + 0.6));
  const end = smooth(prog(d, ANCHOR - 0.2, ANCHOR + 0.6));
  ctx.save();
  ctx.globalAlpha = enter;
  PANELS.forEach((_, i) => {
    const x = i * (PW + GAP) - cx;
    if (x > W || x + PW < 0) return;
    const center = x + PW / 2 - W / 2;
    const lightK = clamp(1 - Math.abs(center) / 1100) * (1 - end * 0.9);
    panel(ctx, i, x, d - T0 + i * 0.3, lightK);
  });
  ctx.restore();
  if (end > 0) { ctx.fillStyle = `rgba(14,10,8,${0.5 * end})`; ctx.fillRect(0, 0, W, H); }
  // 起头：从上一幕的那条线里亮起来
  const lineA = 1 - smooth(prog(d, T0, PAN0 + 0.4));
  if (lineA > 0) { ctx.fillStyle = `rgba(230,200,150,${0.5 * lineA})`; ctx.fillRect(160, 539, W - 320, 2); }
}

function drawOver(ctx, d) {
  L.halation(ctx, 0.25 * smooth(prog(d, PAN0, PAN0 + 1)) * (1 - smooth(prog(d, 33.3, 33.8))));
  const a = smooth(prog(d, ANCHOR, ANCHOR + 0.5)) * (1 - smooth(prog(d, 33.2, 33.7)));
  L.anchorWord(ctx, '第一次', { alpha: a, size: 132, y: 420, seed: 401 });
}

function light(d) { return [{ x: 960, y: 520, rx: 1300, ry: 820, i: 0.95, core: 0.4 }]; }
function grade(d) { return { warm: 0.3, ambient: 0.42 }; }

module.exports = { ...S, draw, drawOver, light, grade, PANELS, PW };
