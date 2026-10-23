// 开场一镜到底 · 0–6.9 秒：握手 → 拍肩 → 手落到桌上 → 三枚筹码 → 把「利益」拉向自己 → 推进筹码。
//   全程是同一个空间：上半部分是侧面的两个人（握手、笑、拍肩），往下是俯视的桌面。
//   镜头一直跟着 A 的左手：从画面外抬起来 → 拍对方肩膀两下 → 滑下去 → 落在桌面上。
//   筹码不是 UI：是桌上真实的、有厚度和影子的小物件，会旋转、滑行、被手指按住拖走。
const L = require('../lib');
const K = require('../kit');
const { W, H, lerp, clamp, prog, smooth, noise1, spring, spline, ease } = L;

const S = { start: 0, end: 6.92 };
const HS = [960, 330];                 // 两只手握在一起的位置
const TABLE_Y = 860;                   // 往下就是桌面（俯视）
const CH = { 机会: [1265, 1290], 利益: [1135, 1440], 功劳: [1345, 1495] };
const CR = 74;

// ---------------- 筹码 ----------------
// 3.35 从右边滑进来（旋转、减速）；利益在 4.75 被 A 的两根手指按住，拖向自己；功劳被对方的手拨走
function chipState(d, name) {
  const i = ['机会', '利益', '功劳'].indexOf(name);
  const t0 = 3.3 + i * 0.12;
  const k = 1 - Math.exp(-Math.max(0, d - t0) * 5.5);
  const [tx, ty] = CH[name];
  let x = lerp(2500 + i * 120, tx, k), y = ty + (1 - k) * (i - 1) * 60;
  let rot = (1 - k) * 9 + i;
  if (name === '利益') {
    const drag = ease(prog(d, 4.95, 5.95));
    x -= 175 * drag; y += 18 * drag;
    rot += drag * 0.8 + Math.max(0, d - 6.0) * 6 * prog(d, 6.0, 6.9);
  }
  if (name === '功劳') {
    const take = ease(prog(d, 5.3, 6.1));
    x += 150 * take; y -= 70 * take; rot -= take * 0.6;
  }
  return { x, y, rot, a: d > t0 ? 1 : 0 };
}

// ---------------- A 的左手 ----------------
// 先在画面外 → 拍肩 → 滑下来 → 落在桌上 → 手指动 → 两指按住「利益」往回拖
function handState(d) {
  const tap = (t0) => Math.max(0, Math.sin(Math.PI * prog(d, t0, t0 + 0.24)));
  const pat = tap(1.62) + tap(1.92);
  const path = spline(d, [[1.05, [320, 760]], [1.55, [1300, -150]], [2.2, [1300, -150]], [2.6, [1060, 440]], [3.05, [780, 1590]], [4.7, [790, 1590]], [5.0, [930, 1610]], [5.95, [760, 1630]]]);
  const twitch = Math.max(0, Math.sin(Math.PI * prog(d, 3.95, 4.15))) + Math.max(0, Math.sin(Math.PI * prog(d, 4.25, 4.45)));
  return {
    x: path[0], y: path[1] - pat * 26,
    rot: spline(d, [[1.05, 0.9], [1.55, 0.62], [2.2, 0.62], [3.05, 0.5], [4.7, 0.5], [5.0, 0.38], [5.95, 0.6]]),
    sy: spline(d, [[1.4, 0.72], [2.2, 0.72], [3.05, 1.0]]),
    s: 1.0, lift: pat * 0.5 + (d < 3.0 ? 0.6 : 0) + 0.25 * smooth(prog(d, 4.6, 4.95)) * (1 - smooth(prog(d, 4.95, 5.05))),
    curl: 0.1 + 0.25 * twitch, index: 0, point: 0.85 * smooth(prog(d, 4.55, 4.9)), middle: 1,
    vis: d > 1.0,
  };
}

// 对方的手：4.4 从右上伸进来，悬在筹码上方 → 拨走「功劳」
function vipHand(d) {
  const p = spline(d, [[4.3, [2150, 980]], [4.9, [1600, 1220]], [5.3, [1560, 1240]], [6.1, [1710, 1170]]]);
  return { x: p[0], y: p[1], rot: -2.2, s: 0.95, curl: 0.2 + 0.2 * smooth(prog(d, 5.0, 5.3)), lift: 0.35 * (1 - smooth(prog(d, 5.2, 5.35))), sleeve: K.NAVY, skin: K.SKIN_V, vis: d > 4.3 };
}

// ---------------- 镜头 ----------------
function cam(d) {
  if (d < 6.0) {
    const p = spline(d, [[0, [860, 360, 1.62]], [1.1, [1060, 300, 1.4]], [1.6, [1230, -110, 1.02]], [2.15, [1250, -90, 1.02]], [2.6, [1080, 460, 0.94]], [3.15, [900, 1420, 1.0]], [3.7, [1010, 1430, 0.98]], [4.7, [1060, 1450, 1.12]], [6.0, [1010, 1455, 1.75]]]);
    return { cx: p[0] + noise1(d * 0.8, 3) * 6, cy: p[1] + noise1(d * 0.8, 4) * 4, s: p[2], rot: noise1(d * 0.3, 5) * 0.012 };
  }
  // 6.0–6.9：一路推进「利益」，直到它铺满画面；镜头跟着筹码一起转
  const k = prog(d, 6.0, 6.9);
  const ch = chipState(d, '利益');
  const e = k * k;
  return { cx: lerp(1010, ch.x, ease(Math.min(1, k * 1.6))), cy: lerp(1455, ch.y, ease(Math.min(1, k * 1.6))), s: 1.75 * Math.pow(17.5 / 1.75, e), rot: 0.9 * e };
}

// ---------------- 绘制 ----------------
function people(c, d) {
  const laugh = 1 - smooth(prog(d, 2.3, 3.0));
  const pump = Math.sin(d * 7.5) * (1.25 - 0.25 * smooth(prog(d, 0, 1.2))) * (1 - smooth(prog(d, 1.6, 2.5)));
  // 两个人的上半身（只露到下巴、耳朵、肩）——在握手后面，略暗
  c.save();
  c.beginPath(); c.rect(-2000, -2000, 6000, 1950); c.clip();
  L.lit(c, (x) => {
    x.save(); x.translate(330, 205);
    L.figure(x, { h: 1900, f: 1, yaw: 1, pal: L.CAST.A, laugh: laugh * (0.7 + 0.3 * Math.sin(d * 9)), talk: 0,
      pose: { torso: 0.08 + 0.02 * pump, neck: 0.05, head: -0.1 * laugh + 0.03 * Math.sin(d * 9) * laugh, uArmN: 0.02, fArmN: 0.04, uArmF: 0.0, fArmF: 0.02, thighN: 0.3, thighF: 0.2 } });
    x.restore();
    x.save(); x.translate(1600, 205);
    L.figure(x, { h: 1900, f: -1, yaw: 1, pal: { ...L.CAST.B, shirt: K.NAVY, jacket: K.NAVY }, laugh: laugh * (0.7 + 0.3 * Math.sin(d * 8 + 1)),
      pose: { torso: 0.06 - 0.04 * smooth(prog(d, 1.6, 1.75)) * (1 - smooth(prog(d, 2.0, 2.3))), neck: 0.04, head: -0.12 * laugh + 0.04 * Math.sin(d * 8 + 1) * laugh, uArmN: 0.02, fArmN: 0.04, uArmF: 0.0, fArmF: 0.02, thighN: 0.3, thighF: 0.2 } });
    x.restore();
  }, { light: -1.2, rim: [255, 214, 160], rimA: 0.7, rimW: 5, shadow: 0.5, ambient: 0.82, bbox: [-200, -1400, 2400, 1700] });
  c.restore();
  const fadeG = c.createLinearGradient(0, -420, 0, -50);
  fadeG.addColorStop(0, 'rgba(14,10,8,0)'); fadeG.addColorStop(1, 'rgba(14,10,8,0.85)');
  c.fillStyle = fadeG; c.fillRect(-2000, -420, 6000, 372);
  // 握手（最清楚的一层）
  c.save();
  c.translate(HS[0], HS[1] + pump * 16);
  c.rotate(-0.03 + pump * 0.015);
  L.lit(c, (x) => K.handshake(x, { squeeze: Math.max(0, pump) }), { light: -1.0, rim: [255, 220, 176], rimA: 0.8, rimW: 3, shadow: 0.35, ambient: 1, bbox: [500, 100, 900, 500] });
  c.restore();
}

function table(c, d) {
  const wd = K.wood(2600, 1700, 71);
  c.drawImage(wd, -300, TABLE_Y);
  // 桌子远处的边：一道暖色的高光
  c.fillStyle = 'rgba(255,214,160,0.22)'; c.fillRect(-300, TABLE_Y, 2600, 4);
  c.fillStyle = 'rgba(0,0,0,0.35)'; c.fillRect(-300, TABLE_Y + 4, 2600, 18);
  // 桌上的杯子、餐巾（俯视）
  c.save(); c.translate(560, 1180);
  c.fillStyle = 'rgba(10,6,4,0.4)'; c.beginPath(); c.arc(12, 16, 64, 0, Math.PI * 2); c.fill();
  c.strokeStyle = 'rgba(220,228,232,0.6)'; c.lineWidth = 6; c.beginPath(); c.arc(0, 0, 60, 0, Math.PI * 2); c.stroke();
  c.fillStyle = 'rgba(110,22,24,0.7)'; c.beginPath(); c.arc(0, 4, 44, 0, Math.PI * 2); c.fill();
  c.restore();
  c.save(); c.translate(1700, 1650); c.rotate(0.2);
  c.fillStyle = '#c8bfae'; c.fillRect(-120, -70, 240, 140);
  c.fillStyle = 'rgba(0,0,0,0.12)'; c.fillRect(-120, -4, 240, 8);
  c.restore();
}

function draw(ctx, d) {
  const c = cam(d);
  // 远处：餐厅的散焦光斑（视差最小）
  L.withCam(ctx, c, 0.35, () => { const b = K.bokeh(3200, 2600, 81); ctx.drawImage(b, W / 2 - 1600, H / 2 - 1300); });
  L.withCam(ctx, c, 1, () => {
    table(ctx, d);
    people(ctx, d);
    // 筹码
    for (const n of ['机会', '功劳', '利益']) {
      const st = chipState(d, n);
      if (!st.a) continue;
      ctx.save(); ctx.translate(st.x, st.y);
      const speed = n === '利益' ? 0 : Math.exp(-Math.max(0, d - 3.3) * 5.5);
      const fn = () => K.chip(ctx, n, CR, { rot: st.rot, morph: n === '利益' ? smooth(prog(d, 6.45, 7.2)) : 0, food: n === '利益' ? smooth(prog(d, 6.75, 7.25)) : 0 });
      if (speed > 0.15) K.smear(ctx, -260 * speed, 0, 5, fn); else fn();
      ctx.restore();
    }
    const vh = vipHand(d);
    if (vh.vis) L.hand(ctx, vh);
    const hs = handState(d);
    if (hs.vis) L.hand(ctx, { ...hs, sleeve: K.KNIT, skin: K.SKIN_P, arm: 1100 });
  });
}

function light(d) {
  const c = cam(d);
  const ls = [
    { x: 980, y: 300, rx: 760, ry: 520, i: 1.0, color: [255, 206, 150] },
    { x: 1300, y: -250, rx: 520, ry: 420, i: 0.75, color: [255, 210, 160] },
    { x: 1120, y: 1420, rx: 760, ry: 560, i: 1.0, color: [255, 204, 146] },
    { x: 420, y: -300, rx: 420, ry: 420, i: 0.55, color: [255, 210, 160] },
  ];
  return L.camLights(c, ls);
}
function grade() { return { warm: 0.22, ambient: 0.34 }; }

module.exports = { ...S, draw, light, grade, chipState, cam, CR };
