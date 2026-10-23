// 第三幕 · 15.95–21.6 秒：三扇门。
//   15.95 ¥1260 悬在黑暗中央，发亮、轻轻一震
//   16.15 数字散成三团光，飞向左 / 中 / 右
//   16.4  三团光各自变成一个物件：一摞钱（利益）、一部手机（不需要你）、一只闹钟（压力）
//   16.75 物件落到地面，从落点向上裂开一道光——三扇门在黑暗里依次打开，门里是三个正在发生的场景
//   20.0  第一扇门亮起来，另外两扇暗下去
//   20.3  镜头推进第一扇门，门里的会议室铺满画面（接第四幕）
const L = require('../lib');
const { W, H, FONT, lerp, clamp, prog, smooth, noise1, rng, spring, ease } = L;
const P2 = require('./p2_hands');
const team = require('./p4_team');

const S = { start: 15.95, end: 21.46 };
const FLOOR = 808;
const DOORS = [
  { x: 500, label: '利益', t0: 16.75 },
  { x: 960, label: '不需要你', t0: 16.95 },
  { x: 1420, label: '压力', t0: 17.15 },
];
const DW = 330, DH = 580;
const PUSH0 = 20.3, PUSH1 = 21.45;

// ---------------- 物件 ----------------
function coins(x, s) {
  x.save(); x.scale(s, s);
  for (let i = 0; i < 6; i++) {
    const y = 40 - i * 14;
    x.fillStyle = '#7a5a2c'; x.beginPath(); x.ellipse(0, y + 5, 54, 16, 0, 0, Math.PI * 2); x.fill();
    x.fillStyle = i === 5 ? '#d4ae6a' : '#b8914f'; x.beginPath(); x.ellipse(0, y, 54, 16, 0, 0, Math.PI * 2); x.fill();
  }
  x.fillStyle = 'rgba(90,60,20,0.7)'; x.font = FONT.serifBlack(22); x.textAlign = 'center'; x.textBaseline = 'middle';
  x.fillText('¥', 0, -30);
  x.restore();
}
function phone(x, s, t) {
  x.save(); x.scale(s, s);
  x.fillStyle = '#18181a'; L.rrect(x, -40, -76, 80, 152, 14); x.fill();
  x.fillStyle = '#25303c'; L.rrect(x, -34, -66, 68, 132, 8); x.fill();
  x.fillStyle = 'rgba(214,226,240,0.9)'; L.rrect(x, -26, -50, 44, 16, 6); x.fill();
  x.fillStyle = 'rgba(176,206,170,0.9)'; L.rrect(x, -14, -26 + Math.sin(t * 3) * 0, 40, 16, 6); x.fill();
  x.fillStyle = 'rgba(214,226,240,0.9)'; L.rrect(x, -26, -2, 36, 16, 6); x.fill();
  x.restore();
}
function clock(x, s, t) {
  x.save(); x.scale(s, s);
  x.fillStyle = '#2a2624'; x.beginPath(); x.arc(0, 0, 56, 0, Math.PI * 2); x.fill();
  x.fillStyle = '#d8d0c0'; x.beginPath(); x.arc(0, 0, 46, 0, Math.PI * 2); x.fill();
  for (const sx of [-1, 1]) { x.fillStyle = '#2a2624'; x.beginPath(); x.arc(sx * 34, -50, 14, 0, Math.PI * 2); x.fill(); }
  x.strokeStyle = '#1e1a18'; x.lineWidth = 5; x.lineCap = 'round';
  x.beginPath(); x.moveTo(0, 0); x.lineTo(-6, -26); x.stroke();
  x.strokeStyle = '#a3322a'; x.lineWidth = 3;
  const a = t * 6;
  x.beginPath(); x.moveTo(0, 0); x.lineTo(Math.sin(a) * 38, -Math.cos(a) * 38); x.stroke();
  x.restore();
}
const OBJ = [coins, phone, clock];

// ---------------- 门里的画面 ----------------
// 第二扇：深夜的手机屏幕，一条条消息
function phoneRoom(x, d) {
  x.fillStyle = '#0f1216'; x.fillRect(0, 0, W, H);
  const g = x.createRadialGradient(960, 540, 0, 960, 540, 700);
  g.addColorStop(0, 'rgba(120,150,190,0.35)'); g.addColorStop(1, 'rgba(0,0,0,0)');
  x.fillStyle = g; x.fillRect(0, 0, W, H);
  x.fillStyle = '#1a1a1c'; L.rrect(x, 760, 140, 400, 800, 50); x.fill();
  x.fillStyle = '#1f2a36'; L.rrect(x, 780, 160, 360, 760, 36); x.fill();
  const msgs = [['有空吗？', 0, 16.9], ['在的', 1, 17.4], ['能帮我一下吗？', 0, 17.9], ['好，我看看', 1, 18.5], ['谢谢你！！', 0, 19.2]];
  msgs.forEach(([m, me, t0], i) => {
    const k = spring(d, t0, 3, 0.7);
    if (d < t0) return;
    x.save();
    x.globalAlpha = clamp(k * 1.5);
    x.font = FONT.body(34);
    const w = x.measureText(m).width + 40;
    const bx = me ? 1110 - w : 810, by = 250 + i * 110 + (1 - k) * 30;
    x.fillStyle = me ? '#9fb38c' : '#dde3ea';
    L.rrect(x, bx, by, w, 66, 18); x.fill();
    x.fillStyle = '#1a1c1e';
    x.fillText(m, bx + 20, by + 45);
    x.restore();
  });
}
// 第三扇：办公室里，屏幕上的红色 ERROR，钟停在 17:58
function stressRoom(x, d) {
  x.fillStyle = '#121416'; x.fillRect(0, 0, W, H);
  const blink = Math.sin(d * 9) > 0 ? 1 : 0.55;
  x.fillStyle = '#20262c'; x.fillRect(600, 260, 720, 440);
  x.fillStyle = '#0f1418'; x.fillRect(620, 280, 680, 400);
  x.fillStyle = `rgba(150,40,34,${0.85 * blink})`; x.fillRect(760, 390, 400, 160);
  x.fillStyle = '#efe0d4'; x.font = FONT.enMed(70); x.textAlign = 'center'; x.fillText('ERROR', 960, 500);
  x.fillStyle = 'rgba(220,226,232,0.8)'; x.font = FONT.enMed(54); x.fillText(d < 18.6 ? '17:52' : '17:58', 960, 200);
  x.fillStyle = '#1a1816'; x.fillRect(880, 700, 160, 30); x.fillRect(930, 730, 60, 120);
  // 低着头的人（背影）
  x.save(); x.translate(960, 980);
  L.bust(x, { h: 1000, kind: 'adult', pal: { skin: '#a88466', shirt: '#33373c', jacket: '#33373c', hair: '#141110' }, tilt: Math.sin(d * 2) * 0.05 });
  x.restore();
}
function interior(i) { return [(x, d) => team.drawTeam(x, d), phoneRoom, stressRoom][i]; }

// 门的打开程度：先是一道细缝，再向两边打开
function doorOpen(d, i) {
  const t0 = DOORS[i].t0;
  return { slit: smooth(prog(d, t0, t0 + 0.35)), wide: ease(prog(d, t0 + 0.3, t0 + 0.85)) };
}

function cam(d) {
  const k = ease(prog(d, PUSH0, PUSH1));
  return { cx: lerp(960 + (d - 16) * 5, DOORS[0].x, k), cy: lerp(560, FLOOR - DH / 2, k), s: 1.0 + (d - 16) * 0.016 };
}

function draw(ctx, d) {
  ctx.fillStyle = '#0d0b0a'; ctx.fillRect(0, 0, W, H);
  const push = ease(prog(d, PUSH0, PUSH1));
  const c = cam(d);
  L.withCam(ctx, c, 1, () => {
    // 地面：极暗，只有门里漏出来的光
    const fl = ctx.createLinearGradient(0, FLOOR, 0, H + 200);
    fl.addColorStop(0, '#191512'); fl.addColorStop(1, '#0b0908');
    ctx.fillStyle = fl; ctx.fillRect(-400, FLOOR, W + 800, H);
    ctx.fillStyle = 'rgba(255,220,180,0.05)'; ctx.fillRect(-400, FLOOR, W + 800, 2);
    DOORS.forEach((D, i) => {
      const o = doorOpen(d, i);
      if (o.slit <= 0) return;
      const focus = i === 0 ? 1 + 0.4 * smooth(prog(d, 20.0, 20.4)) : 1 - 0.6 * smooth(prog(d, 20.0, 20.4));
      const w = lerp(6, DW, o.wide), h = DH * o.slit;
      // 门里的光洒到地面上（梯形）
      ctx.save();
      ctx.globalCompositeOperation = 'screen';
      const sg = ctx.createLinearGradient(0, FLOOR, 0, FLOOR + 300);
      sg.addColorStop(0, `rgba(255,206,150,${0.22 * o.wide * focus})`); sg.addColorStop(1, 'rgba(255,206,150,0)');
      ctx.fillStyle = sg;
      ctx.beginPath(); ctx.moveTo(D.x - w / 2, FLOOR); ctx.lineTo(D.x + w / 2, FLOOR); ctx.lineTo(D.x + w * 1.1, FLOOR + 300); ctx.lineTo(D.x - w * 1.1, FLOOR + 300); ctx.closePath(); ctx.fill();
      ctx.restore();
      if (i === 0 && push > 0) return; // 第一扇门在推进时单独画（在最上层）
      drawDoor(ctx, d, i, w, h, focus, 0);
    });
  });
  // 推进第一扇门：门洞放大到全屏，门里的画面从「门里的一小块」变成完整的会议室
  if (push > 0) {
    const o = doorOpen(d, 0);
    const [sx, sy, s] = L.camPt(c, DOORS[0].x, FLOOR - DH / 2);
    const w0 = lerp(6, DW, o.wide) * s, h0 = DH * o.slit * s;
    const k = push;
    const rx = lerp(sx - w0 / 2, 0, k), ry = lerp(sy - h0 / 2, 0, k), rw = lerp(w0, W, k), rh = lerp(h0, H, k);
    ctx.save();
    ctx.beginPath(); ctx.rect(rx, ry, rw, rh); ctx.clip();
    const sc = lerp(h0 / H * 1.0, 1, k);
    ctx.translate(lerp(sx, W / 2, k), lerp(sy, H / 2, k));
    ctx.scale(sc, sc);
    ctx.translate(-W / 2, -H / 2);
    team.drawTeam(ctx, d);
    ctx.restore();
    // 门框的光边
    ctx.save();
    ctx.globalAlpha = 1 - k;
    ctx.strokeStyle = 'rgba(255,214,160,0.7)'; ctx.lineWidth = 3;
    ctx.strokeRect(rx, ry, rw, rh);
    ctx.restore();
  }
}

function drawDoor(ctx, d, i, w, h, focus) {
  const D = DOORS[i];
  const x0 = D.x - w / 2, y0 = FLOOR - h;
  ctx.save();
  ctx.beginPath(); ctx.rect(x0, y0, w, h); ctx.clip();
  // 门里：完整画面缩到门的高度，居中
  const sc = DH / H;
  ctx.translate(D.x, FLOOR - DH / 2);
  ctx.scale(sc, sc);
  ctx.translate(-W / 2, -H / 2);
  interior(i)(ctx, d);
  ctx.restore();
  // 不是焦点的门压暗
  if (focus < 1) { ctx.fillStyle = `rgba(10,8,7,${(1 - focus) * 0.8})`; ctx.fillRect(x0, y0, w, h); }
  // 门框
  ctx.strokeStyle = `rgba(255,220,176,${0.55 * Math.min(1, focus)})`;
  ctx.lineWidth = 3;
  ctx.strokeRect(x0, y0, w, h);
}

// ¥1260 → 三团光 → 三个物件 → 落地变成门
function drawOver(ctx, d) {
  const c = cam(d);
  const N = P2.NUM;
  const burst = smooth(prog(d, 16.12, 16.3));
  // 数字：亮一下、震一下，然后散开
  if (d < 16.35) {
    const shake = (1 - burst) * smooth(prog(d, 15.95, 16.1)) * 4;
    P2.amount(ctx, N.x + noise1(d * 40, 1) * shake, N.y, N.size * (1 + burst * 0.15), 1 - burst, 1 + burst);
  }
  DOORS.forEach((D, i) => {
    const fly = ease(prog(d, 16.15, 16.5));
    if (d < 16.15) return;
    const [dx, dy] = L.camPt(c, D.x, 500);
    const ox = lerp(N.x + (i - 1) * 120, dx, fly), oy = lerp(N.y, dy, fly) - Math.sin(Math.PI * fly) * 60;
    // 光团（飞行中）
    const orb = 1 - smooth(prog(d, 16.45, 16.65));
    if (orb > 0) L.glow(ctx, ox, oy, 70, 'rgba(255,214,160,A)', 0.9 * orb);
    // 物件：出现 → 落到地面 → 被门吞掉
    const bloom = spring(d, 16.4, 2.6, 0.62);
    const fall = ease(prog(d, D.t0 - 0.2, D.t0 + 0.15));
    const [fx, fy, fs] = L.camPt(c, D.x, FLOOR - 70);
    const a = clamp(bloom * 2) * (1 - smooth(prog(d, D.t0 + 0.05, D.t0 + 0.4)));
    if (a > 0.01) {
      ctx.save();
      ctx.globalAlpha = a;
      ctx.translate(lerp(ox, fx, fall), lerp(oy, fy, fall));
      OBJ[i](ctx, (0.3 + 0.7 * bloom) * lerp(1, 0.6, fall) * fs, d);
      ctx.restore();
    }
    // 门下的字
    const la = smooth(prog(d, D.t0 + 0.5, D.t0 + 0.9)) * (1 - smooth(prog(d, PUSH0, PUSH0 + 0.4)));
    if (la > 0.01) {
      const [lx, ly] = L.camPt(c, D.x, FLOOR + 58);
      const focus = i === 0 ? 1 : 1 - 0.55 * smooth(prog(d, 20.0, 20.4));
      ctx.save();
      ctx.globalAlpha = la * focus;
      ctx.font = FONT.body(44);
      ctx.letterSpacing = '8px';
      ctx.textAlign = 'center';
      ctx.fillStyle = '#e8dfcc';
      ctx.shadowColor = 'rgba(0,0,0,0.6)'; ctx.shadowBlur = 12;
      ctx.fillText(D.label, lx + 4, ly);
      ctx.restore();
    }
  });
}

function light(d) {
  const c = cam(d);
  const push = ease(prog(d, PUSH0, PUSH1));
  const ls = [];
  DOORS.forEach((D, i) => {
    const o = doorOpen(d, i);
    const focus = i === 0 ? 1 : 1 - 0.6 * smooth(prog(d, 20.0, 20.4));
    ls.push({ x: D.x, y: FLOOR - DH / 2, rx: 300, ry: 380, i: 0.9 * o.slit * focus * (1 - push), color: [255, 214, 160] });
    ls.push({ x: D.x, y: FLOOR + 80, rx: 260, ry: 120, i: 0.6 * o.wide * focus * (1 - push), color: [255, 206, 150] });
  });
  ls.push({ x: 960, y: 470, rx: 500, ry: 400, i: 0.8 * (1 - smooth(prog(d, 16.4, 16.9))), color: [255, 210, 150] });
  const out = L.camLights(c, ls);
  if (push > 0) for (const l of team.teamLights(d)) out.push({ ...l, w: push });
  return out;
}
function grade(d) { return { warm: lerp(0.15, 0.02, smooth(prog(d, PUSH0, PUSH1))), ambient: lerp(0.3, 0.34, smooth(prog(d, PUSH0, PUSH1))) }; }

module.exports = { ...S, draw, drawOver, light, grade };
