// 开场 0–25 秒：夜晚的商务酒会。一个空间、一个主角、一件连续发生的事。
//   镜头 1（0–7）    他正在和一位重要人物握手：前倾、微笑、另一只手轻碰对方手臂 → 对方离开，他还跟了半步
//                    → 服务员端着托盘过来，他伸手拿酒，托盘没摆顺，他得等半秒
//   （7.0 一位客人从镜头前走过，挡住画面——隐藏剪辑）
//   镜头 2（7–19.4）  反打：服务员在前景。他的笑没了，眼睛不看服务员，托盘还没放稳就把杯子拿走；服务员说「不好意思」，他没回答
//                    → 服务员走远；另一个穿正式的人从右边进来，他立刻转身、站直、笑、伸手——同一个手势
//                    → 镜头往后退，他穿过酒会：有的人他主动靠过去，有的人跟他打招呼他没看一眼
//   （19.4 他朝镜头走过来，身体挡满画面——隐藏剪辑）
//   镜头 3（19.4–25） 稍高的位置往下看：人群一圈一圈；有人把一个深红色信封递进人群，周围的头都转过去，他也停下了
const L = require('../lib');
const K = require('../kit');
const { W, H, FONT, lerp, clamp, prog, smooth, noise1, spring, spline, ease, rng } = L;

const S = { start: 0, end: 25.2 };
const CUT1 = 7.0, CUT2 = 19.4;
const HM = 820;                      // 主要人物的身高（像素，镜头 s = 1 时）
const FLOOR = 1000;                  // 中景人物脚下
const hipY = (h, floor = FLOOR) => floor - 0.49 * h;

const PAL = {
  P: { skin: '#c39a7a', shirt: '#2f3136', jacket: '#2f3136', pants: '#1c1d20', hair: '#16110e', shoe: '#141212' },
  V1: { skin: '#b89274', shirt: '#17181b', jacket: '#17181b', pants: '#121315', hair: '#8c867c', shoe: '#0f0f10' },
  E1: { skin: '#c8a084', shirt: '#3a3530', jacket: '#3a3530', pants: '#22201d', hair: '#1c140f', shoe: '#141212' },
  V2: { skin: '#b48a6c', shirt: '#22293a', jacket: '#22293a', pants: '#171a22', hair: '#120e0b', shoe: '#101012' },
  W: { skin: '#c09878', shirt: '#d4ccbe', jacket: '#d4ccbe', pants: '#151416', hair: '#120e0b', shoe: '#121010' },
};
const GUESTS = [
  { skin: '#c8a084', shirt: '#4a3a32', pants: '#201c1a', hair: '#1c140f' }, { skin: '#b48a6c', shirt: '#2a2c30', pants: '#18191b', hair: '#120e0b' },
  { skin: '#cfa889', shirt: '#5a2a26', pants: '#1e1a19', hair: '#2a1c14' }, { skin: '#bd9374', shirt: '#3c4148', pants: '#1c1d20', hair: '#191310' },
  { skin: '#c39a7a', shirt: '#6a5e4e', pants: '#24211d', hair: '#3a2a20' }, { skin: '#a8805f', shirt: '#24262a', pants: '#151618', hair: '#0f0c0a' },
  { skin: '#d0a98c', shirt: '#3e3a44', pants: '#1d1c20', hair: '#5a4434' }, { skin: '#b88f72', shirt: '#2d3a36', pants: '#1a1d1c', hair: '#15110e' },
].map((p) => ({ ...p, jacket: p.shirt, shoe: '#121010' }));

// 手里端着杯子 / 抿一口 / 说话时比个手势（用关节角度，不用 IK，免得胳膊肘翻上去）
const HOLD = { uArmN: 0.12, fArmN: 1.5, handN: 1.75 };
const SIP = { uArmN: 0.55, fArmN: 2.75, handN: 2.9 };
const GEST = { uArmN: 0.35, fArmN: 1.25, handN: 1.0 };

// ---------------- 小零件 ----------------
// 领口 + 深酒红领带：主角唯一的颜色记号
function tie(c, P, o) {
  const B = L.BODY.adult, h = o.h, f = o.f, th = o.pose.torso || 0;
  const u = [Math.sin(th) * f, -Math.cos(th)], n = [f * Math.cos(th), Math.sin(th)];
  const sw = B.shoulderW * h;
  const c0 = [P.sh[0] + n[0] * sw * 0.36 - u[0] * 6, P.sh[1] + n[1] * sw * 0.36 - u[1] * 6];
  const c1 = [c0[0] - u[0] * B.torso * h * 0.5, c0[1] - u[1] * B.torso * h * 0.5];
  c.fillStyle = '#d8d2c6';
  c.beginPath(); c.moveTo(c0[0] - n[0] * 14, c0[1] - n[1] * 14); c.lineTo(c0[0] + n[0] * 4, c0[1] + n[1] * 4); c.lineTo(c0[0] - u[0] * 30, c0[1] - u[1] * 30); c.closePath(); c.fill();
  c.strokeStyle = '#5a1a1c'; c.lineWidth = 9; c.lineCap = 'round';
  c.beginPath(); c.moveTo(c0[0] - n[0] * 3, c0[1] - n[1] * 3); c.lineTo(c1[0] - n[0] * 2, c1[1] - n[1] * 2); c.stroke();
  c.fillStyle = 'rgba(255,214,190,0.25)'; c.fillRect(c0[0] - 1, c0[1] + 4, 2, 30);
}
function flute(c, x, y, s = 1, wine = 'rgba(214,180,110,0.75)') {
  c.save(); c.translate(x, y); c.scale(s, s);
  c.fillStyle = 'rgba(214,222,224,0.35)'; c.fillRect(-1.5, 0, 3, 34); c.fillRect(-10, 32, 20, 3);
  c.fillStyle = 'rgba(214,222,224,0.22)'; c.beginPath(); c.moveTo(-9, -56); c.lineTo(9, -56); c.lineTo(6, 0); c.lineTo(-6, 0); c.closePath(); c.fill();
  c.fillStyle = wine; c.beginPath(); c.moveTo(-8, -40); c.lineTo(8, -40); c.lineTo(6, -2); c.lineTo(-6, -2); c.closePath(); c.fill();
  c.fillStyle = 'rgba(255,248,236,0.6)'; c.fillRect(4, -52, 2, 30);
  c.restore();
}
// 服务员的托盘（局部：托盘中心），lean：没摆顺的倾斜，taken：被拿走的那一杯
function tray(c, lean, taken) {
  c.save(); c.rotate(lean);
  c.fillStyle = '#1e1c1b'; c.beginPath(); c.ellipse(0, 0, 110, 14, 0, 0, Math.PI * 2); c.fill();
  c.fillStyle = 'rgba(255,220,180,0.25)'; c.fillRect(-108, -3, 216, 2);
  [-70, -28, 14, 56].forEach((x, i) => { if (i === 2 && taken) return; flute(c, x, -4, 1); });
  c.restore();
}

// 站着的人：o = { h, f, pal, pose, … }，at = 脚下的位置
function standingPose(o) {
  const walk = o.walk || 0, ph = o.ph || 0;
  return {
    torso: 0, neck: 0.04, head: 0, uArmN: 0.06, fArmN: 0.12, uArmF: -0.04, fArmF: 0.05,
    thighN: walk ? Math.sin(ph) * 0.32 * walk : 0.02, shinN: walk ? (Math.sin(ph) * 0.2 - 0.06) * walk : 0,
    thighF: walk ? -Math.sin(ph) * 0.32 * walk : -0.02, shinF: walk ? (-Math.sin(ph) * 0.2 - 0.06) * walk : 0,
    ...o.pose,
  };
}
function person(c, o, at, extra) {
  c.save(); c.translate(at[0], at[1]);
  if (o.scale) c.scale(o.scale, o.scale);
  c.translate(0, -0.49 * o.h);
  const P = L.figure(c, { ...o, pose: standingPose(o) });
  if (o.tie) tie(c, P, { ...o, pose: standingPose(o) });
  if (extra) extra(c, P);
  c.restore();
  return P;
}
// 受光（主要人物）：暖色轮廓光
function litPerson(ctx, o, at, light = -1.2, extra) {
  let P;
  L.lit(ctx, (x) => { P = person(x, o, at, extra); }, { light, rim: [255, 210, 160], rimA: 0.85, rimW: 3, shadow: 0.5, ambient: 1, bbox: [0, 0, W, H] });
  return P;
}

// ---------------- 背景：酒会的空间 + 人群 ----------------
// 人群按「小圈子」排：每个圈子 2–4 人，相对站着，各自有说话、点头、举杯、换重心的节奏（相位各不相同，不重复）
function makeCrowd(seed, n, x0, x1, floor, h0) {
  const r = rng(seed), groups = [];
  let x = x0;
  for (let g = 0; g < n && x < x1; g++) {
    const k = 2 + Math.floor(r() * 3), people = [];
    for (let i = 0; i < k; i++) people.push({ dx: i * (h0 * 0.28) + r() * 30, f: i < k / 2 ? 1 : -1, h: h0 * (0.9 + r() * 0.18), pal: GUESTS[Math.floor(r() * GUESTS.length)], ph: r() * 10, glass: r() < 0.6, bob: r() < 0.3 });
    groups.push({ x, floor: floor + (r() - 0.5) * 30, people });
    x += k * h0 * 0.28 + h0 * (0.9 + r() * 1.1);
  }
  return groups;
}
const CROWD_FAR = makeCrowd(71, 22, -1600, 5200, 780, 430);
const CROWD_MID = makeCrowd(83, 9, -1400, 5200, 860, 600);
function crowd(c, d, groups) {
  for (const G of groups) for (const p of G.people) {
    const t = d + p.ph;
    const sip = Math.max(0, Math.sin(t * 0.7)) > 0.92 ? 1 : 0;
    const gest = Math.sin(t * 1.3) > 0.6 ? 1 : 0;
    person(c, {
      h: p.h, f: p.f, pal: p.pal, bob: p.bob, eye: 1, smile: 0.4, talk: Math.sin(t * 2.1) > 0.5 ? 0.4 * Math.abs(Math.sin(t * 11)) : 0,
      pose: { torso: 0.02 + Math.sin(t * 0.6) * 0.02, head: Math.sin(t * 1.7) * 0.06, ...(p.glass ? (sip ? SIP : HOLD) : gest ? GEST : {}) },
    }, [G.x + p.dx + Math.sin(t * 0.5) * 3, G.floor], p.glass ? (cc, P) => flute(cc, P.hand[0], P.hand[1] - 4, p.h / 820) : null);
  }
}
// 空间：深色墙、暖色壁灯、吊灯的光斑、远处的吧台、高窗外的城市（极深蓝灰）
let ROOM = null;
function room() {
  if (ROOM) return ROOM;
  const { createCanvas } = require('@napi-rs/canvas');
  const w = 6400, h = 2200, c = createCanvas(w, h), x = c.getContext('2d');
  x.drawImage(K.bokeh(w, h, 515), 0, 0);
  x.save(); x.translate(2200, 560);
  for (let i = -60; i < 120; i++) { x.fillStyle = i % 2 ? 'rgba(0,0,0,0.14)' : 'rgba(80,60,44,0.05)'; x.fillRect(i * 52, -900, 3, 1400); }
  // 高窗
  for (const wx of [-1400, -400, 2600, 3600]) {
    x.fillStyle = '#0d1014'; x.fillRect(wx, -460, 520, 820);
    x.drawImage(K.bokeh(520, 820, wx + 9000, false), wx, -460);
    x.strokeStyle = '#1f1a16'; x.lineWidth = 16; x.strokeRect(wx, -460, 520, 820);
    x.lineWidth = 6; x.beginPath(); x.moveTo(wx + 260, -460); x.lineTo(wx + 260, 360); x.stroke();
  }
  // 吧台
  x.fillStyle = '#1a130e'; x.fillRect(800, 120, 1200, 260);
  for (let k = 0; k < 22; k++) { x.fillStyle = `rgba(${150 + (k * 37) % 90},${90 + (k * 23) % 50},50,0.4)`; x.fillRect(830 + k * 52, -60, 18, 80); }
  x.fillStyle = 'rgba(255,196,128,0.12)'; x.fillRect(800, 110, 1200, 12);
  // 壁灯 + 吊灯
  for (const sx of [-1800, -800, 200, 1400, 2300, 3300, 4200]) {
    const g = x.createRadialGradient(sx, -360, 0, sx, -360, 340);
    g.addColorStop(0, 'rgba(255,200,130,0.3)'); g.addColorStop(1, 'rgba(255,200,130,0)');
    x.fillStyle = g; x.fillRect(sx - 340, -700, 680, 680);
    x.fillStyle = 'rgba(255,226,180,0.8)'; x.beginPath(); x.ellipse(sx, -360, 22, 8, 0, 0, Math.PI * 2); x.fill();
  }
  x.restore();
  ROOM = c;
  return c;
}

// 背景人群：两层，都很虚、很暗——只是「在流动的空间」，不和主角抢
function bgCrowd(ctx, c, d, extraBlur = 0) {
  L.withCam(ctx, c, 0.55, () => L.blurred(ctx, 9 + extraBlur, (b) => crowd(b, d, CROWD_FAR), 0.75));
  ctx.save(); ctx.fillStyle = 'rgba(12,9,8,0.35)'; ctx.fillRect(0, 0, W, H); ctx.restore();
  L.withCam(ctx, c, 0.78, () => L.blurred(ctx, 6 + extraBlur, (b) => crowd(b, d + 2, CROWD_MID), 0.85));
  ctx.save(); ctx.fillStyle = 'rgba(12,9,8,0.25)'; ctx.fillRect(0, 0, W, H); ctx.restore();
}

// ---------------- 前景：从镜头前经过的客人（很近、很暗、散焦） ----------------
function passer(c, d, t0, t1, dir, seed, scale = 2.6) {
  if (d < t0 || d > t1) return;
  const k = (d - t0) / (t1 - t0);
  const x = dir > 0 ? lerp(-700, W + 700, k) : lerp(W + 700, -700, k);
  L.blurred(c, 16, (b) => {
    b.save(); b.setTransform(1, 0, 0, 1, 0, 0); b.scale(0.5, 0.5);
    b.translate(x, 1400); b.scale(scale, scale);
    const pal = GUESTS[seed % GUESTS.length];
    L.figure(b, { h: 820, f: dir, yaw: 1, pal: { skin: '#2a2220', hair: '#0e0c0b', shirt: '#141313', jacket: '#141313', pants: '#0f0f10', shoe: '#0c0c0c' }, pose: standingPose({ walk: 1, ph: d * 7, pose: { torso: 0.05 } }) });
    b.restore();
  });
}

// ===================== 镜头 1：0–7 =====================
const A = { P: 820, V1: 1095, E1: 1330 };
function shot1(ctx, d) {
  const cam = spline(d, [[0, [960, 420, 1.72]], [2.9, [985, 430, 1.6]], [4.4, [1040, 445, 1.42]], [7.0, [1080, 450, 1.38]]]);
  const c = { cx: cam[0] + noise1(d * 0.7, 1) * 6, cy: cam[1] + noise1(d * 0.6, 2) * 4, s: cam[2], rot: noise1(d * 0.3, 3) * 0.004 };
  const shake = d < 3.0 ? Math.sin(d * 7.2) * 9 * (1 - smooth(prog(d, 2.4, 3.0))) : 0;
  const release = smooth(prog(d, 2.9, 3.25));
  // 对方：握手 → 松手、转身走开、渐渐走进人群深处
  const leave = smooth(prog(d, 3.15, 3.5));
  const vx = lerp(A.V1, 1900, ease(prog(d, 3.4, 6.8)));
  const vScale = lerp(1, 0.72, ease(prog(d, 3.6, 6.8)));
  const vFloor = lerp(FLOOR, 880, ease(prog(d, 3.6, 6.8)));
  // 主角：握手（前倾、微笑、另一只手轻碰对方胳膊）→ 跟半步 → 伸手拿酒 → 等半秒
  const step = ease(prog(d, 3.25, 4.1));
  const px = A.P + 70 * step;
  const G = [A.P + 140 + 12 * Math.sin(d * 0.8), hipY(HM) - 30 + shake];
  // 服务员：从右边端着托盘走过来，4.9 停在他面前；托盘没摆顺，往回挪了一下
  const wx = lerp(2000, px + 330, ease(prog(d, 4.1, 5.1)));
  const fix = smooth(prog(d, 5.45, 6.05));
  const trayLean = d > 5.0 ? 0.12 * (1 - fix) * Math.sin(d * 9) * 0.3 + 0.09 * (1 - fix) : 0;
  const reach = smooth(prog(d, 5.15, 5.5));
  const take = smooth(prog(d, 6.1, 6.45));
  const fade = smooth(prog(d, 5.6, 6.6));
  L.withCam(ctx, c, 0.35, () => { const r = room(); ctx.drawImage(r, W / 2 - 2200, H / 2 - 560 - 200); });
  bgCrowd(ctx, c, d, 0);
  L.withCam(ctx, c, 1, () => {
    // 随从：在对方身后半步，拿着文件夹，一直看着对方
    litPerson(ctx, { h: 790, f: -1, pal: PAL.E1, eye: 1, smile: 0.3, pose: { torso: 0.06, head: 0.08, reachN: [-0.1 * 790, -0.2 * 790], reachF: [-0.08 * 790, -0.19 * 790] } },
      [lerp(A.E1, 2050, ease(prog(d, 3.6, 7))), lerp(FLOOR, 880, ease(prog(d, 3.7, 7)))].map((v, i) => v), -2.3);
    // 重要人物
    litPerson(ctx, {
      h: HM, f: leave > 0.5 ? 1 : -1, scale: vScale, yaw: 1, pal: PAL.V1, eye: 1, smile: 0.45 * (1 - leave), talk: d > 1.2 && d < 2.2 ? 0.4 * Math.abs(Math.sin(d * 10)) : 0,
      walk: d > 3.4 ? 1 : 0, ph: d * 6.5,
      pose: { torso: -0.02, head: -0.04, reachN: release < 1 ? [G[0] - A.V1, G[1] - hipY(HM)] : null, uArmN: 0.05, fArmN: 0.1 },
    }, [vx, vFloor], -2.2, (cc, P) => { cc.fillStyle = '#e8e2d6'; cc.fillRect(P.sh[0] - 22 * (leave > 0.5 ? 1 : -1) - 6, P.sh[1] + 30, 14, 7); });
    // 服务员
    if (d > 4.0) {
      litPerson(ctx, { h: 800, f: -1, pal: PAL.W, eye: 1, walk: d < 5.1 ? 1 : 0, ph: d * 7, talk: d > 5.5 && d < 5.9 ? 0.4 : 0,
        pose: { torso: 0.04 + 0.05 * fix, head: 0.1, reachF: [-60, -250], reachN: [-40, -40] } },
      [wx, FLOOR], -2.4, (cc, P) => { cc.save(); cc.translate(P.handF[0] - 10, P.handF[1] - 6); tray(cc, trayLean, take > 0.5); cc.restore(); });
    }
    // 主角
    const trayAt = [wx - 70 - 10, hipY(800) - 250 - 10];
    let reachN = release < 1 ? [G[0] - px, G[1] - hipY(HM)] : [60, -40 - 30 * Math.sin(d * 3) * (1 - reach)];
    if (d > 3.3 && d < 4.4) reachN = [80 + 30 * Math.sin((d - 3.3) * 5), -180];                    // 走的时候轻轻挥一下
    if (reach > 0) reachN = L.mix(reachN, [trayAt[0] - px - 20, trayAt[1] - hipY(HM) + 60 + 20 * (1 - fix)], reach);   // 伸手、悬着等
    if (take > 0) reachN = L.mix(reachN, [70, -150], take);
    litPerson(ctx, {
      h: HM, f: 1, pal: PAL.P, tie: true, eye: 1, look: 0.6, smile: lerp(1, 0.25, fade), talk: (d > 0.4 && d < 1.0) || (d > 3.4 && d < 3.9) ? 0.45 * Math.abs(Math.sin(d * 11)) : 0,
      walk: d > 3.25 && d < 4.1 ? 1 : 0, ph: d * 7,
      pose: { torso: lerp(0.13, 0.06, release) + 0.05 * step * (1 - step) * 4 - 0.03 * fade, neck: 0.05, head: 0.02 + Math.sin(d * 3.1) * 0.035 * (1 - release) + 0.06 * reach,
        reachN, handN: Math.PI / 2 - 0.1,
        reachF: release < 0.6 ? [G[0] - px + 20, G[1] - hipY(HM) - 34] : [30, -10] },
    }, [px, FLOOR], -0.8, take > 0.4 ? (cc, P) => flute(cc, P.hand[0], P.hand[1] - 4, 1) : null);
  });
  passer(ctx, d, 0.3, 1.5, 1, 3);
  passer(ctx, d, 6.55, 7.45, -1, 5, 3.2);         // 隐藏剪辑：一位客人从镜头前走过，挡满画面
  return c;
}

// ===================== 镜头 2：7–19.4（反打 → 第二次握手 → 穿过酒会） =====================
const B = { P: 1180, Wf: 640 };
const GROUPS = [
  { x: 2060, people: [{ dx: 0, f: -1, pal: GUESTS[1], h: 830 }, { dx: 260, f: 1, pal: GUESTS[3], h: 800, sc: 0.84, back: 90 }], kind: 'senior' },
  { x: 2580, people: [{ dx: 0, f: -1, pal: GUESTS[6], h: 740, bob: true, sc: 0.9, back: 60 }], kind: 'junior' },
  { x: 3020, people: [{ dx: 0, f: -1, pal: GUESTS[2], h: 790, bob: true }, { dx: 240, f: -1, pal: GUESTS[0], h: 830, sc: 0.86, back: 100 }], kind: 'peer' },
];
function shot2(ctx, d) {
  const cam = camAt2(d);
  const c = { cx: cam[0] + noise1(d * 0.7, 4) * 6, cy: cam[1] + noise1(d * 0.6, 5) * 4, s: cam[2], rot: noise1(d * 0.3, 6) * 0.004 };
  // 焦点：先在他身上 → 8.4 拉到服务员 → 9.2 回到他
  const focusW = smooth(prog(d, 8.35, 8.6)) * (1 - smooth(prog(d, 9.15, 9.4)));
  // 服务员：前景 → 走远（缩小、往画面深处）
  const away = ease(prog(d, 9.4, 12.6));
  const wx = lerp(B.Wf, 500, away), wS = lerp(1.22, 0.5, away), wFloor = lerp(1180, 820, away);
  // 第二位重要人物：11.0 从右边进来
  const v2x = lerp(2000, 1520, ease(prog(d, 10.9, 11.9)));
  const v2Leave = ease(prog(d, 14.7, 16.0));
  // 主角
  const turn = smooth(prog(d, 11.05, 11.35));          // 转身
  const toV2 = ease(prog(d, 11.4, 12.0));
  const walkOn = prog(d, 14.9, 19.4);
  let px = lerp(B.P, 1290, toV2);
  if (d > 14.9) px = pxWalk(d);
  const shake = d > 12.1 && d < 14.6 ? Math.sin(d * 7.2) * 9 * (1 - smooth(prog(d, 13.9, 14.6))) : 0;
  const G = [lerp(px, v2x, 0.5) + 10, hipY(HM) - 30 + shake];
  const grip = smooth(prog(d, 11.75, 12.1)) * (1 - smooth(prog(d, 14.4, 14.75)));
  const sip = smooth(prog(d, 9.7, 10.0)) * (1 - smooth(prog(d, 10.4, 10.7)));
  const take = smooth(prog(d, 7.25, 7.5));
  const frown = smooth(prog(d, 7.85, 8.05)) * (1 - smooth(prog(d, 8.5, 8.9)));
  // 穿过酒会：16.2 主动拍一位长辈的肩；17.0 一个年轻人跟他打招呼，他没看；17.8 又主动凑近另一圈人
  const pat = smooth(prog(d, 16.05, 16.3)) * (1 - smooth(prog(d, 16.7, 16.95)));
  const ignore = d > 16.8 && d < 17.5;
  const lean = smooth(prog(d, 17.75, 18.0)) * (1 - smooth(prog(d, 18.35, 18.6)));
  const walking = (d > 11.4 && d < 12.0) || (d > 14.9 && Math.abs(pxWalk(d + 0.05) - pxWalk(d)) > 1);

  L.withCam(ctx, c, 0.35, () => { const r = room(); ctx.drawImage(r, W / 2 - 2200, H / 2 - 560 - 200); });
  bgCrowd(ctx, c, d + 3, 2 * focusW);
  // 服务员走远以后在人群里（中景以后）
  const mid = () => {
    // 穿过酒会时遇到的人（主角从他们面前走过）
    for (const Gp of GROUPS) for (const p of Gp.people) {
      const isJunior = Gp.kind === 'junior';
      const wave = isJunior ? smooth(prog(d, 16.85, 17.05)) * (1 - smooth(prog(d, 17.45, 17.75))) : 0;
      const isPat = Gp.kind === 'senior' && p.dx === 0;
      litPerson(ctx, { h: p.h, f: p.f, pal: p.pal, bob: p.bob, eye: 1, smile: isJunior ? 0.7 * (1 - smooth(prog(d, 17.4, 17.8))) : isPat ? 0.5 + 0.4 * pat : Gp.kind === 'peer' ? 0.4 + 0.4 * lean : 0.3,
        talk: Gp.kind === 'peer' && lean > 0.3 ? 0.4 * Math.abs(Math.sin(d * 10)) : 0,
        scale: p.sc || 0.94, pose: { torso: 0.03, head: isJunior ? -0.05 - 0.1 * wave : 0.04 * Math.sin(d * 1.5 + p.dx), ...(isJunior ? { uArmN: lerp(0.05, 2.5, wave), fArmN: lerp(0.1, 2.9, wave), handN: lerp(0.1, 3.1, wave) } : HOLD) } },
      [Gp.x + p.dx, FLOOR - (p.back || 40)], -1.7, isJunior ? null : (cc, P) => flute(cc, P.hand[0], P.hand[1] - 4, 1));
    }
  };
  L.withCam(ctx, c, 1, () => {
    if (away > 0.35) {
      ctx.save(); ctx.filter = 'blur(2px)';
      litPerson(ctx, { h: 800, f: -1, scale: wS, pal: PAL.W, walk: 1, ph: d * 6, pose: { reachF: [-60, -250] } }, [wx, wFloor], -1.5, (cc, P) => { cc.save(); cc.translate(P.handF[0] - 10, P.handF[1] - 6); tray(cc, 0, true); cc.restore(); });
      ctx.restore();
    }
    mid();
    // 第二位重要人物
    if (d > 10.8 && v2Leave < 1) {
      litPerson(ctx, { h: 840, f: v2Leave > 0.3 ? 1 : -1, pal: PAL.V2, eye: 1, smile: 0.5, walk: d < 11.9 || d > 14.8 ? 1 : 0, ph: d * 6.5,
        talk: d > 12.4 && d < 13.4 ? 0.4 * Math.abs(Math.sin(d * 10)) : 0,
        pose: { torso: 0, head: -0.03, reachN: grip > 0.02 ? [G[0] - v2x, G[1] - hipY(840)] : null } },
      [lerp(v2x, 2300, v2Leave), lerp(FLOOR, 860, v2Leave)], -2.2);
    }
    // 主角
    const f = turn > 0.5 ? 1 : -1;
    const yaw = turn > 0 && turn < 1 ? Math.max(0.35, Math.abs(1 - 2 * turn)) : 1;
    let reachN = take < 1 ? L.mix([-260, -330], [-80, -150], take) : [-80, -150];          // 不等托盘放稳就把杯子拿走
    const sipping = sip > 0.35 && turn < 0.5;
    if (sipping) reachN = null;
    if (turn > 0.5) reachN = null;
    if (grip > 0) reachN = L.mix(reachN || [100, -150], [G[0] - px, G[1] - hipY(HM)], grip);
    if (pat > 0) reachN = L.mix(reachN || [100, -150], [GROUPS[0].x - 20 - px, -0.27 * HM], pat);
    if (lean > 0) reachN = L.mix(reachN || [100, -150], [150, -220], lean);
    const holdGlass = turn < 0.5 || walkOn > 0.05;
    litPerson(ctx, {
      h: HM, f, yaw, pal: PAL.P, tie: true, eye: 1, look: turn < 0.5 ? -0.4 : 0.6,
      smile: turn < 0.5 ? 0 : 0.95 * (1 - 0.6 * (ignore ? 1 : 0)), frown: frown * 0.9, talk: (d > 12.6 && d < 13.3) || lean > 0.4 ? 0.4 * Math.abs(Math.sin(d * 11)) : 0,
      walk: walking ? 1 : 0, ph: d * 7,
      pose: { torso: turn < 0.5 ? -0.03 : 0.12 * grip + 0.05 + 0.1 * lean, neck: 0.04,
        head: turn < 0.5 ? 0.16 + 0.05 * Math.sin(d * 2) : -0.02 + 0.05 * grip * Math.sin(d * 3) + (ignore ? -0.04 : 0),
        reachN, handN: Math.PI / 2 - 0.1, ...(reachN ? {} : sipping ? SIP : { uArmN: 0.14, fArmN: 1.5 }),
        reachF: grip > 0.5 ? [G[0] - px + 20, G[1] - hipY(HM) - 34] : null, uArmF: 0.02, fArmF: 0.08 },
    }, [px, FLOOR], turn > 0.5 ? -0.8 : -2.3, (cc, P) => { if (holdGlass && grip < 0.3 && pat < 0.3) flute(cc, P.hand[0], P.hand[1] - 4, 1); });
    // 服务员（前景、背光、略散焦），说「不好意思」时微微欠身
    if (away <= 0.35) {
      const blur = lerp(6, 0, focusW);
      ctx.save(); if (blur > 0.3) ctx.filter = `blur(${blur.toFixed(1)}px)`;
      litPerson(ctx, { h: 800, f: 1, scale: wS, pal: PAL.W, eye: 1, smile: 0.2, talk: d > 7.6 && d < 8.15 ? 0.45 * Math.abs(Math.sin(d * 12)) : 0, walk: away > 0.02 ? 1 : 0, ph: d * 6,
        pose: { torso: 0.08 + 0.1 * smooth(prog(d, 7.55, 7.8)) * (1 - smooth(prog(d, 8.3, 8.6))), head: 0.12, reachF: [70, -250], reachN: [40, -40] } },
      [wx, wFloor], -2.6, (cc, P) => { cc.save(); cc.translate(P.handF[0] + 10, P.handF[1] - 6); tray(cc, 0.08 * (1 - take) * Math.sin(d * 14), take > 0.5); cc.restore(); });
      ctx.restore();
    }
  });
  // 焦点在服务员身上时，后面的主角和人群一起虚掉
  if (focusW > 0.01) { ctx.save(); ctx.globalAlpha = 0.35 * focusW; ctx.fillStyle = '#0c0a09'; ctx.fillRect(0, 0, W, H); ctx.restore(); }
  passer(ctx, d, 13.2, 14.2, 1, 6, 2.4);
  // 隐藏剪辑：他转身朝镜头走过来，身体挡满画面
  const fill = prog(d, 18.75, 19.4);
  if (fill > 0) {
    const [sx, sy] = L.camPt(c, px, hipY(HM) - 100);
    const r = lerp(120, 1500, Math.pow(fill, 2.2));
    const g = ctx.createRadialGradient(lerp(sx, W / 2, fill), lerp(sy, H / 2, fill), r * 0.6, lerp(sx, W / 2, fill), lerp(sy, H / 2, fill), r);
    g.addColorStop(0, 'rgba(22,22,25,1)'); g.addColorStop(1, 'rgba(22,22,25,0)');
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = `rgba(70,22,24,${0.25 * Math.sin(Math.PI * fill)})`;
    ctx.fillRect(lerp(sx, W / 2, fill) - 4 * (1 + fill * 4), lerp(sy, H / 2, fill) - 60 * (1 + fill * 6), 8 * (1 + fill * 4), 200 * (1 + fill * 6));
  }
  return c;
}

// ===================== 镜头 3：19.4–25（稍高的机位：看得到地面，人群一圈一圈分开） =====================
// 还是侧面的同一个酒会，只是镜头抬高了：三排人按远近排开，中间露出地面和一块块的光。
const ROWS = [
  { floor: 620, sc: 0.42, groups: [[-260, 3], [520, 4], [1500, 3], [2250, 3]] },
  { floor: 780, sc: 0.6, groups: [[-80, 3], [1250, 4], [2150, 3]] },
  { floor: 1000, sc: 0.82, groups: [[1880, 2]] },
];
const ENV = [1180, 760];                       // 信封递进去的那一圈（中排）
function shot3(ctx, d) {
  const k = ease(prog(d, CUT2, 25.2));
  const c = { cx: lerp(820, 1020, k) + noise1(d * 0.5, 7) * 6, cy: lerp(600, 640, k), s: lerp(1.05, 1.45, k), rot: 0 };
  // 主角在中排：从左往右穿过去，22.5 停下、转头看信封
  const px = spline(d, [[19.4, 280], [21.3, 760], [22.5, 960], [25.2, 975]]);
  const stop = smooth(prog(d, 22.3, 22.6));
  const lookEnv = smooth(prog(d, 22.55, 22.9));
  const give = smooth(prog(d, 22.1, 22.45));
  const hx = spline(d, [[19.4, 2300], [21.6, 1560], [22.2, 1290], [25.2, 1285]]);
  L.withCam(ctx, c, 0.35, () => { const r = room(); ctx.drawImage(r, W / 2 - 2200, H / 2 - 560 - 360); });
  L.withCam(ctx, c, 1, () => {
    // 地面：深色木地板 + 地毯 + 每一圈人脚下的一块光
    const fg = ctx.createLinearGradient(0, 560, 0, 1300);
    fg.addColorStop(0, '#1a140f'); fg.addColorStop(1, '#0c0a08');
    ctx.fillStyle = fg; ctx.fillRect(-1500, 560, 5000, 900);
    ctx.strokeStyle = 'rgba(255,214,160,0.05)'; ctx.lineWidth = 2;
    for (let i = 0; i < 9; i++) { const y = 580 + i * i * 9; ctx.beginPath(); ctx.moveTo(-1500, y); ctx.lineTo(3500, y); ctx.stroke(); }
    ctx.fillStyle = 'rgba(90,26,28,0.18)'; ctx.beginPath(); ctx.ellipse(1000, 800, 900, 120, 0, 0, Math.PI * 2); ctx.fill();
    ROWS.forEach((R, ri) => {
      // 远的排先画，虚一点
      const draw = (x) => {
        R.groups.forEach(([gx, n], gi) => {
          const cx0 = gx + n * 60 * R.sc;
          const g = x.createRadialGradient(cx0, R.floor, 0, cx0, R.floor, 300 * R.sc + 60);
          g.addColorStop(0, 'rgba(255,200,140,0.13)'); g.addColorStop(1, 'rgba(255,200,140,0)');
          x.fillStyle = g; x.save(); x.translate(0, R.floor); x.scale(1, 0.3); x.translate(0, -R.floor); x.fillRect(cx0 - 400, R.floor - 400, 800, 800); x.restore();
          // 一圈人：站在一个扁椭圆上，都朝着圈子中间；后面的先画
          const mem = [];
          for (let i = 0; i < n; i++) {
            const a = (i / n) * Math.PI * 2 + gi * 0.9 + ri;
            mem.push({ i, a, x: cx0 + Math.cos(a) * 150 * R.sc * (n > 2 ? 1 : 0.8), fl: R.floor + Math.sin(a) * 46 * R.sc });
          }
          mem.sort((p, q) => p.fl - q.fl);
          for (const m of mem) {
            const i = m.i;
            const pal = GUESTS[(gi * 3 + i + ri * 2) % GUESTS.length];
            const towardEnv = ri === 1 && Math.abs(cx0 - ENV[0]) < 650;
            const turnK = towardEnv ? smooth(prog(d, 22.35 + i * 0.09, 22.7 + i * 0.09)) : 0;
            const f0 = m.x < cx0 ? 1 : -1;
            const fEnv = ENV[0] > m.x ? 1 : -1;
            const sc = R.sc * (1 + Math.sin(m.a) * 0.05);
            person(x, { h: 820, scale: sc, f: turnK > 0.5 ? fEnv : f0, pal, bob: (i + gi) % 3 === 0, eye: 1, smile: 0.4 * (1 - turnK),
              talk: Math.sin(d * 2 + i + gi) > 0.6 && turnK < 0.5 ? 0.4 * Math.abs(Math.sin(d * 10)) : 0,
              pose: { torso: 0.02, head: Math.sin(d * 1.3 + i * 2 + gi) * 0.05 + 0.05 * turnK, ...((i + gi) % 2 ? HOLD : {}) } },
            [m.x, m.fl], (i + gi) % 2 ? (cc, P) => flute(cc, P.hand[0], P.hand[1] - 4, 1) : null);
          }
        });
      };
      if (ri === 0) L.blurred(ctx, 4, draw, 0.85); else draw(ctx);
      if (ri === 1) {
        // 递信封的人（中排，从右边走进来）
        person(ctx, { h: 820, scale: R.sc, f: -1, pal: { ...GUESTS[5], shirt: '#0e0e10', jacket: '#0e0e10' }, eye: 1, walk: d < 22.2 ? 1 : 0, ph: d * 6.5,
          pose: { torso: 0.04, head: 0.08, reachN: L.mix([0.1 * 820, -0.2 * 820], [-0.3 * 820, -0.24 * 820], give) } },
        [hx, R.floor], (cc, P) => {
          cc.save(); cc.translate(P.hand[0] - 10, P.hand[1] - 6); cc.rotate(-0.2);
          cc.fillStyle = '#6a1c1e'; cc.fillRect(-46, -30, 92, 58);
          cc.strokeStyle = '#b48a4e'; cc.lineWidth = 3; cc.beginPath(); cc.moveTo(-46, -30); cc.lineTo(0, 4); cc.lineTo(46, -30); cc.stroke();
          cc.fillStyle = '#c49a58'; cc.beginPath(); cc.arc(0, 4, 7, 0, Math.PI * 2); cc.fill();
          cc.restore();
        });
        // 主角：中排、受光；穿过人群 → 停下 → 转头看信封
        litPerson(ctx, { h: HM, scale: R.sc, f: 1, pal: PAL.P, tie: true, eye: 1, look: 0.6, smile: 0.5 * (1 - lookEnv), walk: stop < 0.5 ? 1 : 0, ph: d * 7,
          pose: { torso: 0.03, head: -0.03 + 0.06 * lookEnv, ...HOLD, uArmF: 0.05 } },
        [px, R.floor + 30], -1.2, (cc, P) => flute(cc, P.hand[0], P.hand[1] - 4, 1));
      }
    });
  });
  // 前景：一位客人从镜头下方经过
  passer(ctx, d, 19.4, 20.9, -1, 7, 3.0);
  return { c, px };
}

// ---------------- 合成 ----------------
let lastCam = null, lastP = null;
function draw(ctx, d) {
  if (d < CUT1) lastCam = shot1(ctx, d);
  else if (d < CUT2) lastCam = shot2(ctx, d);
  else { const r = shot3(ctx, d); lastCam = r.c; lastP = r.px; }
}
function light(d) {
  const flick = 1 + noise1(d * 2, 9) * 0.03;
  if (d < CUT1) {
    const c = camAt1(d);
    return L.camLights(c, [
      { x: 960, y: 330, rx: 520, ry: 460, i: 1.0 * flick, color: [255, 206, 150] },
      { x: 1500, y: 360, rx: 420, ry: 420, i: 0.75, color: [255, 210, 160] },
      { x: 960, y: 120, rx: 1600, ry: 340, i: 0.4, color: [255, 196, 128], depth: 0.4 },
    ]);
  }
  if (d < CUT2) {
    const cc2 = camAt2(d), c = { cx: cc2[0], cy: cc2[1], s: cc2[2] };
    const px = d < 14.9 ? 1250 : pxWalk(d);
    return L.camLights(c, [
      { x: px, y: 330, rx: 520, ry: 480, i: 1.0 * flick, color: [255, 206, 150] },
      { x: 700, y: 400, rx: 360, ry: 420, i: 0.45, color: [255, 200, 140] },
      { x: 1600, y: 360, rx: 420, ry: 420, i: 0.8 * smooth(prog(d, 10.8, 11.6)), color: [255, 210, 160] },
      { x: 2100, y: 380, rx: 520, ry: 420, i: 0.7, color: [255, 206, 150] },
      { x: 3000, y: 380, rx: 520, ry: 420, i: 0.7, color: [255, 206, 150] },
      { x: 960, y: 120, rx: 2400, ry: 340, i: 0.4, color: [255, 196, 128], depth: 0.4 },
    ]);
  }
  const k = ease(prog(d, CUT2, 25.2));
  const c = { cx: lerp(820, 1020, k), cy: lerp(600, 640, k), s: lerp(1.05, 1.45, k) };
  const px = spline(d, [[19.4, 280], [21.3, 760], [22.5, 960], [25.2, 975]]);
  return L.camLights(c, [
    { x: px, y: 620, rx: 280, ry: 330, i: 1.0, color: [255, 210, 160] },
    { x: ENV[0], y: 640, rx: 300, ry: 280, i: 0.55 + 0.45 * smooth(prog(d, 22.1, 22.6)), color: [255, 196, 140] },
    ...ROWS.flatMap((R) => R.groups.map(([gx, n]) => ({ x: gx + n * 80 * R.sc, y: R.floor - 300 * R.sc, rx: 260 * R.sc + 80, ry: 300 * R.sc + 60, i: 0.55, color: [255, 200, 140] }))),
    { x: 960, y: 120, rx: 2400, ry: 340, i: 0.35, color: [255, 196, 128], depth: 0.4 },
  ]);
}
// 光照需要的镜头（与 shot1 / shot2 里的同一条路径，去掉手持抖动的影响可以忽略）
function camAt1(d) { const p = spline(d, [[0, [960, 420, 1.72]], [2.9, [985, 430, 1.6]], [4.4, [1040, 445, 1.42]], [7.0, [1080, 450, 1.38]]]); return { cx: p[0], cy: p[1], s: p[2] }; }
function camAt2(d) {
  const p = spline(d, [[7.0, [1000, 430, 1.5]], [9.0, [975, 430, 1.46]], [10.9, [1080, 430, 1.42]], [12.3, [1300, 420, 1.55]], [14.6, [1330, 420, 1.6]],
    [15.6, [1640, 450, 1.25]], [16.5, [1990, 455, 1.22]], [17.4, [2450, 460, 1.18]], [18.3, [2930, 455, 1.2]], [19.4, [2990, 440, 1.32]]]);
  return [p[0], p[1], p[2]];
}
// 穿过酒会：走 → 在长辈那儿停（拍肩）→ 从年轻人面前走过 → 在另一圈停（凑近）
function pxWalk(d) { return spline(d, [[14.9, 1290], [15.95, 1880], [16.9, 1890], [17.6, 2560], [17.85, 2790], [18.6, 2810], [19.4, 2900]]); }
function grade(d) { return { warm: 0.2, ambient: d < CUT2 ? 0.33 : 0.3 }; }
// 第一章标题出现时，中间压暗一点
function drawOver(ctx, d) {
  const a = smooth(prog(d, 22.7, 23.2));
  if (a <= 0) return;
  const g = ctx.createRadialGradient(W / 2, 520, 80, W / 2, 520, 900);
  g.addColorStop(0, `rgba(8,7,6,${0.5 * a})`); g.addColorStop(1, `rgba(8,7,6,${0.15 * a})`);
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
}

module.exports = { ...S, draw, drawOver, light, grade };
