// 开场一镜到底 · 9.6–15.0 秒：盘底 → 挂钟 → 办公室从钟的周围「长」出来 → 压力 → 绕到另一边 → 两个人站在他面前。
//   9.6  盘底铺满画面，圈足变成刻度，钟针长出来：17:54
//   9.9  镜头往后退，墙、百叶窗、桌子、显示器、人，按离钟的远近依次长出来；秒针越转越快
//   11.6 电话响 · 12.0 屏幕 ERROR · 12.3 打印机不停吐纸 · 12.6 消息一条条弹出 · A 的动作越来越快
//   13.35 胳膊碰倒咖啡 · 13.65 镜头绕到另一边（前景柱子擦过）· 14.0 犯错的同事和负责人站在他面前
//   14.4 A 站起来，手抬起来——要指向谁
const L = require('../lib');
const K = require('../kit');
const { W, H, FONT, lerp, clamp, prog, smooth, noise1, spring, spline, ease, rng } = L;

const S = { start: 9.6, end: 15.02 };
const CK = [1250, 215], CKR = 70;
const DESK_Y = 690;
const HAND0 = require('./o2_plate').endState();
// 交接时的转角折回 (-π, π]，退镜头时转回水平用最短的方向
const ROT0 = Math.atan2(Math.sin(HAND0.rot), Math.cos(HAND0.rot));

// 钟上的时间：分钟一格一格跳，秒针越转越快
function clockTime(d) {
  const t = Math.max(0, d - 9.6);
  const min = 54 + Math.min(3, Math.floor(t / 0.45)) + (d > 13.0 ? 1 : 0) + (d > 14.9 ? 1 : 0);
  const sec = 60 * (t * 0.7 + t * t * 0.32);
  return { hr: 17, min, sec };
}
const label = (d) => `17:${clockTime(d).min}`;

// 物体「长出来」：离钟越远越晚
function grow(d, x, y) {
  const dist = Math.hypot(x - CK[0], y - CK[1]);
  return spring(d, 9.85 + dist / 1400, 2.6, 0.7);
}
function at(c, d, x, y, fn, ax = x, ay = y) {
  const g = grow(d, x, y);
  if (g <= 0.01) return;
  c.save();
  c.translate(ax, ay);
  c.scale(g, g);
  c.translate(-ax, -ay);
  c.globalAlpha *= clamp(g * 1.5);
  fn();
  c.restore();
}

// ---------------- 物件 ----------------
function monitor(c, d) {
  c.fillStyle = '#2a2d31'; c.fillRect(1004, 600, 14, 90); c.fillRect(960, 684, 100, 8);
  c.fillStyle = '#16181b';
  c.beginPath(); c.moveTo(880, 410); c.lineTo(1150, 440); c.lineTo(1150, 620); c.lineTo(880, 610); c.closePath(); c.fill();
  c.save();
  c.beginPath(); c.moveTo(890, 420); c.lineTo(1140, 448); c.lineTo(1140, 610); c.lineTo(890, 600); c.closePath(); c.clip();
  c.fillStyle = '#1d2733'; c.fillRect(880, 410, 280, 220);
  const r = rng(5);
  for (let i = 0; i < 12; i++) { c.fillStyle = `rgba(170,196,224,${0.25 + r() * 0.3})`; c.fillRect(902, 440 + i * 13 + ((d * 40) % 13), 40 + r() * 150, 4); }
  const err = smooth(prog(d, 11.95, 12.1));
  if (err > 0) {
    const blink = Math.sin(d * 10) > -0.3 ? 1 : 0.6;
    c.fillStyle = `rgba(150,38,32,${0.92 * err * blink})`; c.fillRect(915, 478, 210, 92);
    c.fillStyle = `rgba(240,226,214,${err})`; c.font = FONT.enMed(40); c.textAlign = 'center'; c.fillText('ERROR', 1020, 538);
  }
  c.restore();
}
function phone(c, d) {
  const ring = d > 11.6 && d < 13.4 ? Math.sin(d * 70) * 3 : 0;
  c.save(); c.translate(1215 + ring, 682);
  c.fillStyle = '#18181a'; c.fillRect(-46, -8, 92, 9);
  const on = d > 11.6 ? 1 : 0;
  if (on) { c.fillStyle = 'rgba(170,200,230,0.8)'; c.fillRect(-42, -10, 84, 3); L.glow(c, 0, -10, 60, 'rgba(160,190,230,A)', 0.5); }
  // 震动的弧线
  if (ring) { c.strokeStyle = 'rgba(220,228,236,0.55)'; c.lineWidth = 3; for (const k of [1, 2]) { c.beginPath(); c.arc(0, -10, 30 + k * 16 + (d * 60) % 16, Math.PI * 1.2, Math.PI * 1.8); c.stroke(); } }
  c.restore();
  // 消息一条条弹出来，往上堆
  [12.6, 12.85, 13.1, 13.3, 13.5, 13.7].forEach((t0, i) => {
    if (d < t0) return;
    const k = spring(d, t0, 3.2, 0.6);
    c.save(); c.translate(1215, 640 - i * 40 - (1 - k) * 10); c.scale(k, k); c.globalAlpha *= clamp(k * 1.5);
    c.fillStyle = i % 2 ? 'rgba(214,224,234,0.9)' : 'rgba(234,222,200,0.92)';
    L.rrect(c, -80, -16, 160, 32, 10); c.fill();
    c.fillStyle = 'rgba(30,30,32,0.75)'; c.fillRect(-64, -5, 70 + (i * 23) % 50, 4); c.fillRect(-64, 4, 40, 3);
    c.restore();
  });
}
function mug(c, d) {
  const tip = ease(prog(d, 13.35, 13.55));
  c.save(); c.translate(1370 + tip * 18, DESK_Y); c.rotate(tip * 1.45);
  c.fillStyle = '#d8d0c2'; c.fillRect(-26, -62, 52, 62);
  c.strokeStyle = '#d8d0c2'; c.lineWidth = 8; c.beginPath(); c.arc(30, -32, 14, -1.2, 1.2); c.stroke();
  c.fillStyle = '#3a2416'; c.fillRect(-22, -60, 44, 6);
  c.restore();
  // 洒出来的咖啡：桌面上一摊，沿桌边往下滴
  const sp = smooth(prog(d, 13.45, 14.2));
  if (sp > 0) {
    c.fillStyle = 'rgba(58,34,20,0.92)';
    c.beginPath(); c.ellipse(1440, DESK_Y + 1, 140 * sp, 6, 0, 0, Math.PI * 2); c.fill();
    for (let i = 0; i < 3; i++) { const k = clamp(sp * 1.6 - i * 0.25); c.fillRect(1500 + i * 30, DESK_Y + 20, 5, 70 * k); }
  }
}
function printer(c, d) {
  c.fillStyle = '#26282b'; c.fillRect(1600, 600, 230, 300);
  c.fillStyle = '#3a3d41'; c.fillRect(1610, 520, 210, 90);
  c.fillStyle = '#121315'; c.fillRect(1612, 556, 30, 12);
  // 纸：从出纸口滑出来，一张接一张掉下去
  const n = Math.max(0, Math.floor((d - 12.3) / 0.22));
  for (let i = Math.max(0, n - 5); i <= n; i++) {
    const t = d - 12.3 - i * 0.22;
    if (t < 0) continue;
    const out = Math.min(1, t / 0.18), fall = Math.max(0, t - 0.18);
    const x = 1600 - out * 70 - fall * 140, y = 562 + fall * fall * 900;
    if (y > 920) continue;
    c.save(); c.translate(x, y); c.rotate(-fall * 2.4);
    c.fillStyle = '#e2dccd'; c.fillRect(-60, -3, 110, 5);
    c.restore();
  }
  // 地上的一摞
  const pile = Math.min(14, Math.max(0, n - 3));
  for (let i = 0; i < pile; i++) { c.fillStyle = i % 2 ? '#d8d2c2' : '#cfc8b8'; c.fillRect(1420 + (i * 37) % 60, 902 - i * 3, 120, 3); }
}
function office(c, d, side) {
  // 墙、百叶窗（窗外城市冷光）、顶灯
  c.fillStyle = '#1b1e22'; c.fillRect(-900, -900, 3800, 1700);
  at(c, d, 360, 300, () => {
    c.fillStyle = '#0e1116'; c.fillRect(90, 90, 560, 430);
    c.drawImage(K.bokeh(560, 430, 33, false), 90, 90);
    c.fillStyle = 'rgba(40,44,50,0.9)';
    for (let y = 96; y < 520; y += 22) c.fillRect(90, y, 560, 9);
    c.strokeStyle = '#2a2e33'; c.lineWidth = 12; c.strokeRect(90, 90, 560, 430);
  });
  for (const x of [400, 960, 1520]) at(c, d, x, 30, () => { c.fillStyle = '#2a2c2f'; c.fillRect(x - 160, 20, 320, 10); c.fillStyle = 'rgba(240,236,224,0.8)'; c.fillRect(x - 150, 30, 300, 3); });
  // 远处的工位（暗、散焦）
  at(c, d, 1700, 420, () => {
    c.fillStyle = 'rgba(30,33,37,0.9)'; c.fillRect(1560, 420, 420, 30);
    c.fillStyle = 'rgba(60,70,84,0.6)'; c.fillRect(1640, 330, 120, 80);
  });
  // 地面
  at(c, d, 960, 900, () => { c.fillStyle = '#141517'; c.fillRect(-900, 860, 3800, 600); c.fillStyle = 'rgba(160,180,200,0.05)'; c.fillRect(-900, 860, 3800, 3); });
  // 桌子
  at(c, d, 1000, DESK_Y, () => {
    c.fillStyle = '#3a2f27'; c.fillRect(420, DESK_Y, 1180, 22);
    c.fillStyle = 'rgba(255,226,190,0.2)'; c.fillRect(420, DESK_Y, 1180, 2);
    c.fillStyle = '#211a15'; c.fillRect(450, DESK_Y + 22, 22, 150); c.fillRect(1550, DESK_Y + 22, 22, 150);
  }, 1000, DESK_Y + 40);
  at(c, d, 1015, 520, () => monitor(c, d), 1015, DESK_Y);
  at(c, d, 940, 684, () => { c.fillStyle = '#2c2f33'; c.fillRect(880, 680, 130, 9); });
  at(c, d, 1215, 682, () => phone(c, d), 1215, DESK_Y);
  at(c, d, 1370, 660, () => mug(c, d), 1370, DESK_Y);
  at(c, d, 1700, 700, () => printer(c, d), 1700, 900);
  // 钟下面的小牌子：数字时间
  c.save(); c.translate(CK[0], CK[1] + CKR + 34);
  c.fillStyle = '#121416'; L.rrect(c, -58, -20, 116, 40, 6); c.fill();
  c.fillStyle = d > 13.0 ? '#d0523e' : '#cfd6dc'; c.font = FONT.enMed(28); c.textAlign = 'center'; c.textBaseline = 'middle';
  c.fillText(label(d), 0, 2);
  c.restore();
  void side;
}

// A：坐着工作 → 越来越急 → 碰倒咖啡 → （另一边）站起来、手抬起来
function personA(c, d) {
  const busy = smooth(prog(d, 11.6, 12.6));
  const jit = Math.sin(d * (14 + busy * 16)) * (2 + busy * 6);
  const toPhone = smooth(prog(d, 13.15, 13.35)) * (1 - smooth(prog(d, 13.6, 13.8)));
  const turn = Math.sin(d * 5) > 0.3 && busy > 0.5 ? 1 : 0;
  at(c, d, 700, 500, () => {
    L.lit(c, (x) => {
      x.save(); x.translate(700, 770);
      L.figure(x, { h: 620, f: 1, yaw: 1, pal: L.CAST.A, eye: 1, frown: busy, talk: d > 11.7 && d < 12.4 ? 0.5 : 0,
        pose: { ...L.SEAT, torso: 0.12 + busy * 0.12, neck: 0.05, head: 0.18 - turn * 0.35 * busy + toPhone * 0.2,
          reachN: L.mix([250 + jit, -96], [560, -96], toPhone), reachF: [210 - jit, -92] } });
      x.restore();
    }, { light: -0.8, rim: [215, 228, 245], rimA: 0.8, shadow: 0.42, ambient: 1, bbox: [400, 300, 600, 600] });
  }, 700, 770);
}

// ---------------- 另一边：同事和负责人站在他面前 ----------------
const PAL_COL = { skin: '#cba083', shirt: '#6e6a62', jacket: '#6e6a62', pants: '#2a2622', hair: '#20150f', shoe: '#1c1816' };
const PAL_BOSS = { skin: '#b48a6c', shirt: '#24272c', jacket: '#24272c', pants: '#1c1d20', hair: '#110d0a', shoe: '#141210' };
const CKB = [640, 180];
function officeB(c, d, o = {}) {
  c.fillStyle = '#1b1e22'; c.fillRect(-900, -900, 3800, 1700);
  for (const x of [400, 960, 1520]) { c.fillStyle = '#2a2c2f'; c.fillRect(x - 160, 20, 320, 10); c.fillStyle = 'rgba(240,236,224,0.8)'; c.fillRect(x - 150, 30, 300, 3); }
  c.fillStyle = '#141517'; c.fillRect(-900, 860, 3800, 600);
  // 墙上的钟（同一个钟，从另一边看）
  c.save(); c.translate(CKB[0], CKB[1]); K.plateBottomToClock(c, CKR, 1, clockTime(d)); c.restore();
  c.save(); c.translate(CKB[0], CKB[1] + CKR + 34);
  c.fillStyle = '#121416'; L.rrect(c, -58, -20, 116, 40, 6); c.fill();
  c.fillStyle = '#d0523e'; c.font = FONT.enMed(28); c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(label(d), 0, 2);
  c.restore();
  // 他的桌子在右边，屏幕还是红的
  c.fillStyle = '#3a2f27'; c.fillRect(1250, DESK_Y, 900, 22);
  c.fillStyle = '#16181b'; c.fillRect(1560, 430, 250, 180); c.fillStyle = `rgba(150,38,32,${Math.sin(d * 10) > -0.3 ? 0.9 : 0.55})`; c.fillRect(1580, 470, 210, 90);
  c.fillStyle = 'rgba(58,34,20,0.92)'; c.beginPath(); c.ellipse(1450, DESK_Y + 1, 150, 6, 0, 0, Math.PI * 2); c.fill();
  const stand = ease(prog(d, 14.35, 14.75));
  const raise = ease(prog(d, 14.6, 15.2));
  const shrink = smooth(prog(d, 14.3, 15.0));
  L.lit(c, (x) => {
    // 负责人：抱着手臂，看着 A
    x.save(); x.translate(430, 560);
    L.figure(x, { h: 680, f: 1, yaw: 1, pal: PAL_BOSS, eye: 1, frown: 0.7,
      pose: { torso: -0.04, neck: 0.02, head: -0.05, reachN: [40, -140], reachF: [44, -132], handN: -Math.PI / 2, handF: -Math.PI / 2, ankleN: [30, 330], ankleF: [-20, 333] } });
    x.restore();
    // 犯错的同事：低着头，手里攥着那张纸
    x.save(); x.translate(760, 592);
    L.figure(x, { h: 600, f: 1, yaw: 1, pal: PAL_COL, eye: 0.4, frown: 0.5,
      pose: { torso: 0.1 + 0.06 * shrink, neck: 0.15, head: 0.35 + 0.15 * shrink, reachN: [60, -40], reachF: [40, -30], ankleN: [20, 296], ankleF: [-14, 298] },
      hold: (hp) => { x.fillStyle = '#e2dccd'; x.save(); x.translate(hp[0], hp[1]); x.rotate(0.3); x.fillRect(-8, -40, 52, 70); x.restore(); } });
    x.restore();
    // A：从椅子上站起来，转向他们，手抬起来
    if (o.noA) return;
    x.save(); x.translate(1280, lerp(770, 580, stand));
    L.figure(x, { h: 620, f: -1, yaw: 1, pal: L.CAST.A, eye: 1, frown: 1, talk: raise > 0.5 ? 0.5 : 0,
      pose: stand < 0.5 ? { ...L.SEAT, torso: 0.15, neck: 0.05, head: 0.05, reachN: [-200, -96], reachF: [-160, -90] }
        : { torso: 0.05, neck: 0.02, head: -0.02, reachN: L.mix([-80, -40], [-330, -170], raise), handN: lerp(Math.PI / 2, Math.PI * 0.62, raise), reachF: [-30, -20], ankleN: [-20, 300], ankleF: [16, 302] } });
    x.restore();
  }, { light: -1.6, rim: [215, 228, 245], rimA: 0.8, shadow: 0.42, ambient: 1, bbox: [200, 200, 1400, 800] });
}

// ---------------- 镜头 ----------------
function cam(d) {
  const k = prog(d, 9.6, 11.0);
  const e = ease(k);
  const s0 = HAND0.r / CKR;
  if (d < 11.0) {
    return { cx: lerp(CK[0], 960, e), cy: lerp(CK[1], 520, e), s: Math.exp(lerp(Math.log(s0), Math.log(1.0), e)), rot: ROT0 * (1 - ease(prog(d, 9.6, 10.25))) };
  }
  const busy = smooth(prog(d, 11.6, 13.2));
  const shake = busy * 7;
  const p = spline(d, [[11.0, [960, 520, 1.0]], [11.8, [930, 540, 1.18]], [13.2, [960, 580, 1.42]], [13.65, [1010, 580, 1.5]]]);
  return { cx: p[0] + noise1(d * 6, 1) * shake, cy: p[1] + noise1(d * 6, 2) * shake, s: p[2], rot: noise1(d * 3, 3) * 0.01 * busy };
}
function camB(d) {
  const p = spline(d, [[13.75, [1200, 520, 1.25]], [14.3, [980, 520, 1.12]], [15.0, [900, 480, 1.18]]]);
  return { cx: p[0] + noise1(d * 5, 4) * 4, cy: p[1], s: p[2], rot: 0 };
}
// 前景柱子扫过画面（右 → 左）：柱子左边还是原来的角度，右边已经绕到另一边
const WIPE0 = 13.6, WIPE1 = 14.15;
function pillarX(d) { return lerp(2400, -1200, ease(prog(d, WIPE0, WIPE1))); }

function draw(ctx, d) {
  // 9.6–9.95：盘底在 morph 成钟面（铺满画面），办公室在后面长出来
  const px = pillarX(d), half = 520;
  if (d < WIPE1) {
    ctx.save();
    if (d > WIPE0) { ctx.beginPath(); ctx.rect(0, 0, Math.max(0, px - half), H); ctx.clip(); }
    const c = cam(d);
    L.withCam(ctx, c, 1, () => {
      office(ctx, d);
      personA(ctx, d);
      ctx.save(); ctx.translate(CK[0], CK[1]);
      const morph = smooth(prog(d, 9.6, 9.95));
      K.plateBottomToClock(ctx, CKR, morph, clockTime(d));
      ctx.restore();
    });
    ctx.restore();
  }
  if (d > WIPE0) {
    ctx.save();
    if (d < WIPE1) { ctx.beginPath(); ctx.rect(px + half, 0, W, H); ctx.clip(); }
    L.withCam(ctx, camB(d), 1, () => officeB(ctx, d));
    ctx.restore();
    // 柱子本身：很近、散焦、边上一点反光
    if (d < WIPE1) {
      const g = ctx.createLinearGradient(px - half - 80, 0, px + half + 80, 0);
      g.addColorStop(0, 'rgba(10,9,8,0)'); g.addColorStop(0.08, 'rgba(14,12,11,1)'); g.addColorStop(0.5, '#1c1916'); g.addColorStop(0.9, 'rgba(14,12,11,1)'); g.addColorStop(1, 'rgba(10,9,8,0)');
      ctx.fillStyle = g; ctx.fillRect(px - half - 80, 0, half * 2 + 160, H);
      ctx.fillStyle = 'rgba(255,220,180,0.08)'; ctx.fillRect(px + half * 0.55, 0, 6, H);
    }
  }
}

function light(d) {
  const ls = d < WIPE1 ? L.camLights(cam(d), [
    { x: 760, y: 520, rx: 520, ry: 460, i: 1.0, color: [235, 226, 210] },
    { x: 1020, y: 520, rx: 300, ry: 240, i: 0.8, color: [180, 205, 235] },
    { x: CK[0], y: CK[1], rx: 260, ry: 240, i: 0.8, color: [240, 232, 216] },
    { x: 1600, y: 640, rx: 360, ry: 320, i: 0.6, color: [220, 214, 200] },
    { x: 360, y: 300, rx: 360, ry: 300, i: 0.45, color: [160, 182, 214] },
  ]) : [];
  if (d > WIPE0) {
    const w = smooth(prog(d, WIPE0, WIPE1));
    for (const l of L.camLights(camB(d), [
      { x: 700, y: 480, rx: 600, ry: 520, i: 1.0, color: [230, 224, 210] },
      { x: 1250, y: 480, rx: 420, ry: 480, i: 0.95, color: [240, 226, 206] },
      { x: CKB[0], y: CKB[1], rx: 240, ry: 220, i: 0.75, color: [240, 232, 216] },
      { x: 1680, y: 520, rx: 300, ry: 240, i: 0.6, color: [200, 120, 110] },
    ])) ls.push({ ...l, w });
    if (d < WIPE1) for (const l of ls) if (l.w == null) l.w = 1 - w;
  }
  // 9.6：钟面铺满画面时，整片都是亮的
  const full = 1 - smooth(prog(d, 9.75, 10.4));
  if (full > 0) ls.push({ x: W / 2, y: H / 2, rx: 1300, ry: 1000, i: 1.0, w: full, color: [240, 230, 214] });
  return ls;
}
function grade(d) { return { warm: lerp(0.15, -0.05, smooth(prog(d, 9.6, 10.6))), ambient: 0.34 }; }

module.exports = { ...S, draw, light, grade, clockTime, officeB, camB, CKB, CKR, office, personA, cam };
