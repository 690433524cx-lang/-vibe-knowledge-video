// 第一章开头 · 俯视的会议桌：四个人围着桌子工作，桌子中间放着三枚筹码（机会 / 利益 / 功劳）。
//   这张桌子也是开场「秒针 → 抢筹码的手」和「三个悬浮的圆」里第一个圆的内容：
//   圆冲到画面中央、放大铺满，里面的镜头从筹码特写拉远到整张会议桌——直接进入第一章。
const L = require('../lib');
const K = require('../kit');
const { W, H, lerp, clamp, prog, smooth, noise1, spring, spline, ease } = L;

const S = { start: 21.3, end: 30.0 };
const TB = { x: 960, y: 540, w: 980, h: 440 };
const PALS = {
  A: { skin: K.SKIN_P, shirt: K.KNIT, hair: '#1a1310' },
  W2: { skin: '#cba083', shirt: '#6a4a3e', hair: '#1e140e' },
  W3: { skin: '#b48a6c', shirt: '#44483f', hair: '#120e0b' },
  W4: { skin: '#bd9374', shirt: '#2f3a48', hair: '#191310' },
};
const SEATS = [
  { k: 'A', x: 740, y: 840, face: -Math.PI / 2 },
  { k: 'W2', x: 1180, y: 840, face: -Math.PI / 2 },
  { k: 'W3', x: 740, y: 240, face: Math.PI / 2 },
  { k: 'W4', x: 1180, y: 240, face: Math.PI / 2 },
];
const CHIPS = { 机会: [905, 545], 利益: [990, 520], 功劳: [1060, 575] };

// grab：A 的手按住「利益」往自己这边拖（开场里用）；0 = 手放在自己的电脑旁边
function aHand(d, grab) {
  const drag = grab * (0.5 + 0.5 * Math.sin(d * 2.2));
  const tip = L.mix([840, 700], [985, 545 + 40 * drag], grab);
  return { x: tip[0] - 40, y: tip[1] + 150, rot: lerp(0.15, 0.25, grab), s: 0.62, curl: 0.12, point: 0.85 * grab, middle: 1, lift: 0.15 * (1 - grab), sleeve: K.KNIT, skin: K.SKIN_P, arm: 520 };
}

function laptop(c, x, y, rot, glowA = 1) {
  c.save(); c.translate(x, y); c.rotate(rot);
  c.fillStyle = 'rgba(6,4,3,0.4)'; c.fillRect(-66, -40, 140, 96);
  c.fillStyle = '#3a3d42'; L.rrect(c, -70, -6, 140, 50, 6); c.fill();
  c.fillStyle = '#25282c'; L.rrect(c, -70, -48, 140, 44, 6); c.fill();
  c.fillStyle = `rgba(160,190,226,${0.5 * glowA})`; c.fillRect(-62, -44, 124, 36);
  c.restore();
}

// 会议桌的世界（俯视），o.grab 见上
function world(c, d, o = {}) {
  const grab = o.grab ?? 0;
  c.fillStyle = '#121416'; c.fillRect(-2000, -2000, 6000, 5000);
  c.globalAlpha = 0.35; c.drawImage(K.wood(2400, 2000, 55, [34, 34, 36]), -400, -500, 2800, 2200); c.globalAlpha = 1;
  // 桌子
  c.fillStyle = 'rgba(6,4,3,0.5)'; L.rrect(c, TB.x - TB.w / 2 + 16, TB.y - TB.h / 2 + 20, TB.w, TB.h, 24); c.fill();
  c.save(); L.rrect(c, TB.x - TB.w / 2, TB.y - TB.h / 2, TB.w, TB.h, 24); c.clip();
  c.drawImage(K.wood(1000, 460, 61), TB.x - TB.w / 2, TB.y - TB.h / 2, TB.w, TB.h);
  c.restore();
  c.strokeStyle = 'rgba(255,214,160,0.16)'; c.lineWidth = 3; L.rrect(c, TB.x - TB.w / 2, TB.y - TB.h / 2, TB.w, TB.h, 24); c.stroke();
  // 电脑、纸
  laptop(c, 760, 690, 0); laptop(c, 1180, 690, 0, 0.8); laptop(c, 740, 390, Math.PI, 0.8); laptop(c, 1180, 390, Math.PI);
  c.fillStyle = '#d6cfbf'; c.save(); c.translate(600, 560); c.rotate(-0.1); c.fillRect(-50, -36, 100, 72); c.restore();
  c.fillStyle = '#cfc8b8'; c.save(); c.translate(1330, 520); c.rotate(0.12); c.fillRect(-50, -36, 100, 72); c.restore();
  // 来回传的文件夹：W2 → W4 → W2 …
  const ph = ((d - 21.6) % 3.2 + 3.2) % 3.2;
  const dir = Math.floor((d - 21.6) / 3.2) % 2 === 0;
  const k = ease(prog(ph, 0.3, 1.0));
  const fy = dir ? lerp(700, 380, k) : lerp(380, 700, k);
  c.save(); c.translate(1300, fy); c.rotate(0.1);
  c.fillStyle = 'rgba(6,4,3,0.4)'; c.fillRect(-44, -54, 96, 120);
  c.fillStyle = '#b89a62'; c.fillRect(-48, -60, 96, 120);
  c.fillStyle = '#e2dccd'; c.fillRect(-40, -66, 80, 10);
  c.restore();
  // 三枚筹码
  for (const [n, [x, y]] of Object.entries(CHIPS)) {
    c.save();
    const g = n === '利益' ? aHand(d, grab) : null;
    const dy = g ? 40 * grab * (0.5 + 0.5 * Math.sin(d * 2.2)) : 0;
    c.translate(x, y + dy);
    K.chip(c, n, 34, { rot: n.charCodeAt(0) * 0.01 });
    c.restore();
  }
  // 人
  SEATS.forEach((P, i) => {
    const typing = Math.sin(d * 11 + i * 2) * 5;
    const toFolder = i === 1 || i === 3 ? (ph < 1.1 ? Math.sin(Math.PI * clamp(ph / 1.1)) : 0) : 0;
    c.save(); c.translate(P.x, P.y);
    K.topPerson(c, { pal: PALS[P.k], face: P.face, t: d + i, head: noise1(d * 0.7 + i * 5, 3) * 0.35, armL: [96 + typing, -46], armR: [96 - typing + toFolder * 60, 46 + toFolder * 70] });
    c.restore();
  });
  // A 的手（细节）
  if (grab > 0.01 || o.handAlways) L.hand(c, aHand(d, grab));
}

function cam(d) {
  // 21.3 起：从筹码特写一路拉远到整张桌子，然后慢慢转
  const k = ease(prog(d, 20.9, 22.1));
  return { cx: lerp(990, 960, k), cy: lerp(560, 540, k), s: Math.exp(lerp(Math.log(2.6), Math.log(1.12), k)) + Math.max(0, d - 22.1) * 0.035, rot: 0.06 * Math.sin(d * 0.35) };
}
function grabOf(d) { return 1 - smooth(prog(d, 20.9, 21.7)); }

function draw(ctx, d) {
  L.withCam(ctx, cam(d), 1, () => world(ctx, d, { grab: grabOf(d) }));
}
// 标题出现时中间压暗一点
function drawOver(ctx, d) {
  const a = smooth(prog(d, 22.0, 22.5)) * (1 - smooth(prog(d, 24.8, 25.3)));
  if (a <= 0) return;
  const g = ctx.createRadialGradient(W / 2, 520, 80, W / 2, 520, 900);
  g.addColorStop(0, `rgba(8,7,6,${0.6 * a})`); g.addColorStop(1, `rgba(8,7,6,${0.2 * a})`);
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
}
function lightsFor(c) {
  return L.camLights(c, [
    { x: TB.x, y: TB.y, rx: 760, ry: 520, i: 1.0, color: [255, 222, 186] },
    { x: 960, y: 540, rx: 360, ry: 260, i: 0.6, color: [255, 214, 170] },
  ]);
}
function light(d) { return lightsFor(cam(d)); }
function grade() { return { warm: 0.08, ambient: 0.34 }; }

module.exports = { ...S, draw, drawOver, light, grade, world, cam, grabOf, CHIPS, lightsFor };
