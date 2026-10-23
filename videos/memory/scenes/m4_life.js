// 第四幕 · 23.6–33.4 秒：三段「你一直记得」的生活片段，每段都在 3 秒内被推翻。
//   A 23.6–27.0 毕业合照（桌上的冲印照片）：你记得自己站在最左边 → 圈移到右数第三个，最左边其实是另一个人
//   B 27.0–30.1 手机聊天（桌上的手机）：最后一句「随便你。」→ 其实是「好，那你早点休息。」
//   C 30.1–33.4 聚会（第一人称）：所有人都转头看着你 → 他们各自转回去说话、看手机，没人在看你
// 三段的「真实版本」也给第五幕的卡片复用（grad / chat / party）。
const { createCanvas } = require('@napi-rs/canvas');
const L = require('../lib');
const { W, H, FONT, rng, noise1, lerp, clamp, prog, smooth } = L;

const S = { start: 23.4, end: 33.6 };
const A0 = 23.6, B0 = 27.0, C0 = 30.1, C1 = 33.4;
const ease = (k) => (k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2);

// ---------------- A 毕业合照 ----------------
const GOWN = '#1f1d24';
const SKINS = ['#c49a7c', '#b88f72', '#caa284', '#bf9576', '#c69c7e', '#b78c70', '#c8a083'];
const XS = [300, 515, 730, 960, 1190, 1405, 1620];
function graduate(x, cx, i, longHair) {
  const h = 640 + (i % 3) * 18;
  const pal = { skin: SKINS[i], shirt: GOWN, jacket: GOWN, hair: '#17110e', pants: GOWN, shoe: '#111' };
  const sy = 600 - (i % 2) * 14;
  x.save();
  x.translate(cx, sy);
  if (longHair) {
    // 长发垂到肩下：画在身体后面
    x.fillStyle = '#17110e';
    x.beginPath(); x.ellipse(0, -h * 0.1, h * 0.075, h * 0.15, 0, 0, Math.PI * 2); x.fill();
  }
  L.bust(x, { h, kind: 'adult', front: true, arms: true, pal });
  // 长袍往下延伸出画
  x.fillStyle = GOWN;
  x.fillRect(-h * 0.115, h * 0.3, h * 0.23, 600);
  // 白色领口
  x.fillStyle = '#bdb4a2';
  x.beginPath(); x.moveTo(-h * 0.04, -h * 0.025); x.lineTo(0, h * 0.05); x.lineTo(h * 0.04, -h * 0.025); x.fill();
  // 学士帽
  const top = -h * 0.19;
  x.fillStyle = '#121116';
  x.beginPath(); x.ellipse(0, top + h * 0.03, h * 0.058, h * 0.028, 0, 0, Math.PI * 2); x.fill();
  x.beginPath(); x.moveTo(-h * 0.11, top); x.lineTo(0, top - h * 0.035); x.lineTo(h * 0.11, top); x.lineTo(0, top + h * 0.03); x.closePath(); x.fill();
  x.strokeStyle = '#8a6a3a'; x.lineWidth = 3;
  x.beginPath(); x.moveTo(0, top); x.lineTo(h * 0.085, top + h * 0.01); x.lineTo(h * 0.09, top + h * 0.09); x.stroke();
  x.restore();
}
function gradScene(x, truth) {
  const g = x.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, '#2a2420'); g.addColorStop(1, '#141110');
  x.fillStyle = g; x.fillRect(0, 0, W, H);
  // 舞台幕布的褶皱
  for (let i = 0; i < 24; i++) { x.fillStyle = `rgba(0,0,0,${0.12 + (i % 2) * 0.1})`; x.fillRect(i * 80, 0, 40, 700); }
  // 顶光
  const lg = x.createRadialGradient(W / 2, 260, 40, W / 2, 360, 900);
  lg.addColorStop(0, 'rgba(255,214,160,0.22)'); lg.addColorStop(1, 'rgba(255,214,160,0)');
  x.fillStyle = lg; x.fillRect(0, 0, W, H);
  XS.forEach((cx, i) => graduate(x, cx, i, truth && i === 0));
}
const gradCache = {};
function grad(truth) {
  const k = truth ? 'T' : 'M';
  if (!gradCache[k]) {
    const c = createCanvas(W, H), x = c.getContext('2d');
    gradScene(x, truth);
    L.finish(x, c, 'photo');
    gradCache[k] = c;
  }
  return gradCache[k];
}

// ---------------- B 聊天 ----------------
const PH = { w: 430, h: 840, r: 54 };
const MSGS = [
  { me: true, text: '今天的事，对不起。' },
  { me: false, text: '嗯。' },
  { me: true, text: '那我先走了。' },
];
function bubble(x, text, me, y, a = 1, size = 38) {
  x.save();
  x.globalAlpha *= a;
  x.font = FONT.body(size);
  const w = x.measureText(text).width + 44, h = size + 30;
  const bx = me ? PH.w / 2 - 26 - w : -PH.w / 2 + 26;
  x.fillStyle = me ? '#4e4034' : '#2b2f35';
  x.beginPath(); x.roundRect(bx, y, w, h, 20); x.fill();
  x.fillStyle = '#ece3d1';
  x.fillText(text, bx + 22, y + size + 8);
  x.restore();
  return { bx, w, h };
}
// k：0 = 你记得的（随便你。），1 = 真实的（好，那你早点休息。）
function chatScreen(x, k, ghost = 0) {
  x.fillStyle = '#121417';
  x.fillRect(-PH.w / 2, -PH.h / 2, PH.w, PH.h);
  x.fillStyle = '#1b1e22';
  x.fillRect(-PH.w / 2, -PH.h / 2, PH.w, 110);
  x.fillStyle = '#3a3e44';
  x.beginPath(); x.arc(-PH.w / 2 + 50, -PH.h / 2 + 68, 20, 0, Math.PI * 2); x.fill();
  x.fillStyle = '#a49c90'; x.font = FONT.en(28);
  x.fillText('· · ·', -PH.w / 2 + 84, -PH.h / 2 + 78);
  x.fillStyle = '#6c665e'; x.font = FONT.en(22); x.textAlign = 'center';
  x.fillText('23:47', 0, -PH.h / 2 + 160);
  x.textAlign = 'left';
  let y = -PH.h / 2 + 190;
  for (const m of MSGS) { bubble(x, m.text, m.me, y); y += 104; }
  const memA = 1 - smooth(clamp(k * 2));
  const truA = smooth(clamp(k * 2 - 1));
  if (memA > 0) bubble(x, '随便你。', false, y, memA, 44);
  if (truA > 0) bubble(x, '好，那你早点休息。', false, y, truA, 38);
  // 被改写的那一句：飘起来、划掉、散开
  if (ghost > 0 && ghost < 1) {
    x.save();
    x.globalAlpha = 1 - ghost;
    x.translate(30 * ghost, -60 * ghost);
    const b = bubble(x, '随便你。', false, y, 0.6, 44);
    x.strokeStyle = '#a5342a'; x.lineWidth = 4;
    x.beginPath(); x.moveTo(b.bx + 14, y + 38); x.lineTo(b.bx + 14 + (b.w - 28) * clamp(ghost * 3), y + 38); x.stroke();
    x.restore();
  }
}
function phoneOnDesk(x, k, ghost, cx = 960, cy = 470, s = 1) {
  x.save();
  x.translate(cx, cy);
  x.rotate(-0.035);
  x.scale(s, s);
  x.save();
  x.shadowColor = 'rgba(0,0,0,0.7)'; x.shadowBlur = 50; x.shadowOffsetY = 20;
  x.fillStyle = '#0b0b0c';
  x.beginPath(); x.roundRect(-PH.w / 2 - 16, -PH.h / 2 - 16, PH.w + 32, PH.h + 32, PH.r + 12); x.fill();
  x.restore();
  x.strokeStyle = 'rgba(200,190,170,0.25)'; x.lineWidth = 2;
  x.beginPath(); x.roundRect(-PH.w / 2 - 16, -PH.h / 2 - 16, PH.w + 32, PH.h + 32, PH.r + 12); x.stroke();
  x.save();
  x.beginPath(); x.roundRect(-PH.w / 2, -PH.h / 2, PH.w, PH.h, PH.r); x.clip();
  chatScreen(x, k, ghost);
  x.restore();
  x.restore();
}
const chatCache = {};
function chat() {
  if (!chatCache.c) {
    const c = createCanvas(W, H), x = c.getContext('2d');
    x.fillStyle = '#16120f'; x.fillRect(0, 0, W, H);
    phoneOnDesk(x, 1, 0, 960, 540, 1.1);
    chatCache.c = c;
  }
  return chatCache.c;
}

// ---------------- C 聚会 ----------------
const SEATS = [
  // x, y（头中心）, 头半径, 朝向（真实版本里转向哪边）, 衣服
  { x: 960, y: 500, r: 30, f: 1, coat: '#33302c', far: true },
  { x: 770, y: 540, r: 36, f: 1, coat: '#3c3430' },
  { x: 1150, y: 540, r: 36, f: -1, coat: '#2e3236' },
  { x: 600, y: 600, r: 50, f: 1, coat: '#463a34', phone: false },
  { x: 1320, y: 600, r: 50, f: -1, coat: '#38332e', phone: true },
  { x: 370, y: 690, r: 68, f: 1, coat: '#2c2a2e' },
  { x: 1550, y: 690, r: 68, f: -1, coat: '#403630' },
];
const HP = { skin: '#c39a7c', hair: '#18120f' };
function person(x, p, turn, i) {
  const r = p.r;
  // 躯干
  x.fillStyle = p.coat;
  x.beginPath();
  x.moveTo(p.x - r * 2.1, p.y + r * 4.6);
  x.quadraticCurveTo(p.x - r * 2.2, p.y + r * 1.5, p.x - r * 0.9, p.y + r * 1.25);
  x.lineTo(p.x + r * 0.9, p.y + r * 1.25);
  x.quadraticCurveTo(p.x + r * 2.2, p.y + r * 1.5, p.x + r * 2.1, p.y + r * 4.6);
  x.closePath(); x.fill();
  x.fillStyle = L.shade(HP.skin, 0.8);
  x.fillRect(p.x - r * 0.3, p.y + r * 0.6, r * 0.6, r * 0.8);
  // 头：0 = 正对镜头（看你），1 = 转向旁边的人
  const yaw = turn;
  const down = p.phone ? 0.35 * turn : 0;
  const B = L.BODY.adult;
  const h = r / (B.headW * 0.5);
  L.head(x, [p.x, p.y], B, h, p.f, down, Math.max(0.001, yaw), { ...HP, skin: SKINS[i % SKINS.length] });
  // 正对镜头时：两只眼睛，直直地看着你
  const eye = 1 - clamp(yaw * 2.5);
  if (eye > 0) {
    x.fillStyle = `rgba(24,16,12,${0.9 * eye})`;
    for (const s of [-1, 1]) { x.beginPath(); x.ellipse(p.x + s * r * 0.36, p.y + r * 0.02, r * 0.09, r * 0.06, 0, 0, Math.PI * 2); x.fill(); }
  }
  // 低头看手机：脸被屏幕照亮
  if (p.phone && turn > 0.3) {
    const g = x.createRadialGradient(p.x - r * 0.8, p.y + r * 1.4, 0, p.x - r * 0.8, p.y + r * 1.4, r * 2);
    g.addColorStop(0, `rgba(200,210,220,${0.35 * turn})`); g.addColorStop(1, 'rgba(200,210,220,0)');
    x.fillStyle = g; x.fillRect(p.x - r * 3, p.y - r, r * 4, r * 4);
    x.fillStyle = `rgba(220,226,232,${0.8 * turn})`;
    x.save(); x.translate(p.x - r * 0.9, p.y + r * 1.7); x.rotate(0.5); x.fillRect(-r * 0.25, -r * 0.4, r * 0.5, r * 0.8); x.restore();
  }
}
function partyScene(x, turn, t = 0) {
  x.fillStyle = '#15110e'; x.fillRect(0, 0, W, H);
  // 远处的暖色光斑
  const r = rng(51);
  for (let i = 0; i < 14; i++) {
    const g = x.createRadialGradient(0, 0, 0, 0, 0, 1);
    x.save(); x.translate(r() * W, 120 + r() * 300); const rr = 30 + r() * 60; x.scale(rr, rr);
    g.addColorStop(0, `rgba(230,180,120,${0.1 + r() * 0.12})`); g.addColorStop(1, 'rgba(230,180,120,0)');
    x.fillStyle = g; x.fillRect(-1, -1, 2, 2); x.restore();
  }
  // 吊灯
  x.strokeStyle = '#2a241e'; x.lineWidth = 3; x.beginPath(); x.moveTo(960, 0); x.lineTo(960, 250); x.stroke();
  x.fillStyle = '#2e2620'; x.beginPath(); x.moveTo(900, 290); x.lineTo(1020, 290); x.lineTo(985, 250); x.lineTo(935, 250); x.fill();
  const lg = x.createRadialGradient(960, 300, 10, 960, 520, 700);
  lg.addColorStop(0, 'rgba(255,206,146,0.28)'); lg.addColorStop(1, 'rgba(255,206,146,0)');
  x.fillStyle = lg; x.fillRect(0, 0, W, H);
  // 坐在远端的人在桌子后面
  person(x, SEATS[0], turn, 0);
  // 桌子（透视）
  x.fillStyle = '#2c2119';
  x.beginPath(); x.moveTo(820, 560); x.lineTo(1100, 560); x.lineTo(1760, 1080); x.lineTo(160, 1080); x.closePath(); x.fill();
  const tg = x.createLinearGradient(0, 560, 0, 1080);
  tg.addColorStop(0, 'rgba(255,210,150,0.10)'); tg.addColorStop(1, 'rgba(0,0,0,0.3)');
  x.fillStyle = tg; x.fill();
  // 盘子和杯子
  const plates = [[880, 600, 30], [1040, 600, 30], [760, 680, 46], [1160, 680, 46], [600, 820, 70], [1320, 820, 70]];
  for (const [px, py, pr] of plates) {
    x.fillStyle = '#6a6056'; x.beginPath(); x.ellipse(px, py, pr, pr * 0.32, 0, 0, Math.PI * 2); x.fill();
    x.fillStyle = '#4e463e'; x.beginPath(); x.ellipse(px, py, pr * 0.6, pr * 0.19, 0, 0, Math.PI * 2); x.fill();
    x.fillStyle = 'rgba(230,220,200,0.35)'; x.fillRect(px + pr * 0.9, py - pr * 0.9, pr * 0.16, pr * 0.8);
  }
  for (let i = 1; i < SEATS.length; i++) person(x, SEATS[i], clamp(turn * 1.6 - (i % 3) * 0.25), i);
  void t;
}

const partyCache = {};
function party(turn) {
  const key = turn.toFixed(2);
  if (!partyCache[key]) {
    const c = createCanvas(W, H), x = c.getContext('2d');
    partyScene(x, turn);
    partyCache[key] = c;
  }
  return partyCache[key];
}

// ---------------- 绘制 ----------------
function draw(ctx, d) {
  // A：桌上的合照
  const aA = smooth(prog(d, A0, A0 + 0.4)) * (1 - smooth(prog(d, B0 - 0.3, B0 + 0.1)));
  if (aA > 0) {
    const reveal = smooth(prog(d, 25.7, 26.1));
    ctx.save();
    ctx.globalAlpha = aA;
    const push = 1 + 0.04 * prog(d, A0, B0);
    ctx.translate(960, 440);
    ctx.rotate(-0.02);
    ctx.scale(push, push);
    const PW = 1180;
    L.print(ctx, grad(false), PW, { border: 22, seed: 12 });
    if (reveal > 0) { ctx.save(); ctx.globalAlpha *= reveal; ctx.drawImage(grad(true), -PW / 2, -PW * 9 / 32, PW, PW * 9 / 16); ctx.restore(); }
    const sc = PW / W;
    ctx.scale(sc, sc);
    ctx.translate(-W / 2, -H / 2);
    // 你记得的位置：最左边（白圈）→ 被划掉；真实的位置：右数第三个（暗红圈）
    L.crayonCircle(ctx, XS[0], 520, 130, 230, prog(d, 24.5, 25.0), { seed: 3, width: 6 / sc, color: `rgba(244,232,210,${0.92 * (1 - 0.7 * reveal)})` });
    if (reveal > 0) {
      ctx.strokeStyle = 'rgba(165,52,42,0.95)'; ctx.lineWidth = 7 / sc; ctx.lineCap = 'round';
      const k = prog(d, 25.9, 26.2);
      ctx.beginPath(); ctx.moveTo(XS[0] - 120, 330); ctx.lineTo(XS[0] - 120 + 240 * k, 330 + 380 * k); ctx.stroke();
      L.crayonCircle(ctx, XS[4], 520, 130, 230, prog(d, 26.1, 26.6), { seed: 8, width: 6 / sc, color: 'rgba(178,58,44,0.95)' });
    }
    ctx.restore();
  }
  // B：桌上的手机
  const aB = smooth(prog(d, B0 - 0.2, B0 + 0.3)) * (1 - smooth(prog(d, C0 - 0.3, C0 + 0.1)));
  if (aB > 0) {
    const k = prog(d, 28.7, 29.1);
    const ghost = prog(d, 28.75, 29.9);
    ctx.save();
    ctx.globalAlpha = aB;
    // 改写的一瞬间：屏幕轻微错层
    const jit = d > 28.7 && d < 28.82 ? 10 : 0;
    phoneOnDesk(ctx, k, ghost, 960 + jit, 560, 1.18 + 0.03 * prog(d, B0, C0));
    ctx.restore();
  }
  // C：聚会
  const aC = smooth(prog(d, C0 - 0.2, C0 + 0.3)) * (1 - smooth(prog(d, C1 - 0.4, C1 + 0.1)));
  if (aC > 0) {
    const turn = ease(prog(d, 31.9, 32.7));
    const s = 1.04 - 0.04 * prog(d, C0, C1);
    ctx.save();
    ctx.globalAlpha = aC;
    ctx.translate(W / 2, H / 2); ctx.scale(s, s); ctx.translate(-W / 2, -H / 2);
    ctx.drawImage(party(Math.round(turn * 20) / 20), 0, 0);
    ctx.restore();
  }
}

function light(d) {
  const wA = 1 - smooth(prog(d, B0 - 0.3, B0 + 0.1));
  const wB = smooth(prog(d, B0 - 0.3, B0 + 0.1)) * (1 - smooth(prog(d, C0 - 0.3, C0 + 0.1)));
  const wC = smooth(prog(d, C0 - 0.3, C0 + 0.1));
  return [
    { x: 960, y: 440, rx: 1000, ry: 640, i: 1.0, w: wA, color: [255, 204, 150] },
    { x: 960, y: 520, rx: 700, ry: 680, i: 0.95, w: wB, color: [200, 206, 214] },
    { x: 960, y: 560, rx: 1300, ry: 760, i: 1.0, w: wC, color: [255, 200, 140] },
  ];
}
function grade() { return { warm: 0.12, ambient: 0.3 }; }

module.exports = { ...S, draw, light, grade, grad, chat, party, phoneOnDesk };
