// 人物系统：同一套骨架画所有人（聚会的朋友、年夜饭的一家人、主人公）。
//
// 骨架按真实比例（身高 1.7 m 时：大腿 0.45、小腿 0.45、躯干 0.5、上臂 0.29、前臂 0.26），
// 每个部位是一块有体积的剪影（底色 → 受光侧略亮 → 一道很细的边缘光），远侧的手脚更暗。
// 视角：'side' 侧面（face 1 朝左 / -1 朝右）、'front' 正面、'back' 背面。
// 原点：站着时在脚底；坐着时在髋（坐面上）。单位米，u = 像素 / 米。
//
// 姿势参数（弧度，0 = 竖直向下，正 = 朝前 / 朝外）：
//   lean 上身前倾，hd 低头（负 = 仰头，笑的时候），roll 歪头（仅正面）
//   arms: { near: [上臂角, 肘弯], far: [...] }   （正面：left / right）
//   legs: { near: [大腿角, 膝弯], far: [...] }  sit: true 坐着
const { lerp } = require('../../src/lib/util');
const { smoothPath, shade, rot, glassShape } = require('./lib');

const D = (a) => [-Math.sin(a), Math.cos(a)];
const U = (a) => [-Math.sin(a), -Math.cos(a)];
const add = (p, q, k = 1) => [p[0] + q[0] * k, p[1] + q[1] * k];

// 侧脸轮廓（相对颈根，面朝左）
const HEAD = [
  [-0.055, -0.015], [-0.095, -0.04], [-0.112, -0.067], [-0.112, -0.091], [-0.128, -0.12], [-0.136, -0.133], [-0.118, -0.15],
  [-0.124, -0.18], [-0.112, -0.225], [-0.06, -0.265], [0.02, -0.273], [0.075, -0.245], [0.1, -0.185], [0.09, -0.115], [0.055, -0.07], [0.05, -0.025],
];

function limbPts(a, b, c, w0, w1, w2) {
  const side = (p, q, w, s) => {
    const dx = q[0] - p[0], dy = q[1] - p[1], L = Math.hypot(dx, dy) || 1;
    return [p[0] - (dy / L) * w * s, p[1] + (dx / L) * w * s];
  };
  return [
    side(a, b, w0, 1), side(b, c, w1, 1), side(c, b, w2, -1), [c[0] + (c[0] - b[0]) * 0.12, c[1] + (c[1] - b[1]) * 0.12],
    side(c, b, w2, 1), side(b, c, w1, -1), side(a, b, w0, -1), [a[0] - (b[0] - a[0]) * 0.1, a[1] - (b[1] - a[1]) * 0.1],
  ];
}

const darker = (hex, k) => {
  const n = parseInt(hex.slice(1), 16);
  const c = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => Math.round(v * (1 - k)));
  return `rgb(${c.join(',')})`;
};

// 骨架（侧面）
function skeleton(p) {
  const hs = p.h ?? 1, b = p.build ?? 1;
  const L = { thigh: 0.45 * hs, shin: 0.45 * hs, torso: 0.5 * hs, ua: 0.29 * hs, fa: 0.26 * hs };
  const hip = p.sit ? [0, 0] : [0, -(L.thigh + L.shin + 0.07 * hs)];
  const lean = p.lean ?? 0, hd = p.hd ?? 0;
  const legs = {};
  for (const k of ['near', 'far']) {
    const [th, kn] = (p.legs && p.legs[k]) || (p.sit ? [1.45, 1.45] : [0, 0]);
    const knee = add(hip, D(th), L.thigh);
    const ankle = add(knee, D(th - kn), L.shin);
    legs[k] = { knee, ankle, toe: add(ankle, [-0.2 * hs, 0.05 * hs]) };
  }
  const neck = add(hip, U(lean), L.torso);
  const sh = add(hip, U(lean), L.torso * 0.88);
  const arms = {};
  for (const k of ['near', 'far']) {
    const [sa, eb] = (p.arms && p.arms[k]) || [0.1, 0.25];
    const el = add(sh, D(sa), L.ua);
    const hand = add(el, D(sa + eb), L.fa);
    arms[k] = { el, hand };
  }
  return { hs, b, L, hip, lean, hd, legs, neck, sh, arms };
}

function headPts(S) {
  const NECK = [0, 0];
  return HEAD.map((q) => rot(add(S.neck, [q[0] * S.hs, q[1] * S.hs]), S.neck, -(S.lean + S.hd)));
}
function headCenter(S) { return rot(add(S.neck, [-0.01 * S.hs, -0.15 * S.hs]), S.neck, -(S.lean + S.hd)); }

function torsoPts(S, coat) {
  const { hip, lean, hs, b } = S;
  const up = U(lean), fw = [-Math.cos(lean), Math.sin(lean)];
  const sp = (u, v) => [hip[0] + (up[0] * u + fw[0] * v) * hs, hip[1] + (up[1] * u + fw[1] * v) * hs];
  const low = coat ? -0.4 : -0.06;
  const pts = [
    sp(low, -0.12 * b - (coat ? 0.02 : 0)), sp(0.15, -0.115 * b), sp(0.32, -0.12 * b), sp(0.44, -0.1), sp(0.5, -0.05),
    sp(0.5, 0.04), sp(0.45, 0.1 * b), sp(0.32, 0.125 * b), sp(0.16, 0.115 * b), sp(0.02, 0.11 * b), sp(low, 0.1 * b + (coat ? 0.03 : 0)),
  ];
  return pts;
}

// ---------------- 侧面 ----------------
function drawSide(ctx, u, p) {
  const S = skeleton(p);
  const face = p.face ?? 1;
  const light = p.light ?? -2.4;
  const L = face > 0 ? light : Math.PI - light;
  const rim = p.rim ?? 0.3, rimCol = p.rimCol || [255, 214, 160], rimW = 1.5 / u;
  const top = p.top || '#3a4038', bottom = p.bottom || '#24211e', skin = p.skin || '#7a5a46', hair = p.hair || '#16110e';
  const o = { light: L, rimCol, rimW };
  ctx.save();
  ctx.scale(u * face, u);
  const part = (pts, base, r = rim) => shade(ctx, (c) => smoothPath(c, pts), { ...o, base, rim: r, lit: 'rgba(255,224,190,0.14)', bbox: bboxOf(pts) });
  // 远侧：手臂、腿（暗一些）
  const fa = S.arms.far, fl = S.legs.far;
  part(limbPts(S.hip, fl.knee, fl.ankle, 0.075 * S.b, 0.06, 0.045), darker(bottom, 0.3), rim * 0.4);
  part([fl.ankle, add(fl.ankle, [0.03, -0.03]), add(fl.toe, [0, -0.04]), fl.toe, add(fl.ankle, [0.04, 0.05])], '#120f0d', 0);
  part(limbPts(S.sh, fa.el, fa.hand, 0.055 * S.b, 0.047, 0.036), darker(top, 0.3), rim * 0.4);
  hand(ctx, fa, darker(skin, 0.3));
  // 近侧的腿
  const nl = S.legs.near;
  part(limbPts(S.hip, nl.knee, nl.ankle, 0.08 * S.b, 0.062, 0.046), bottom);
  part([nl.ankle, add(nl.ankle, [0.03, -0.03]), add(nl.toe, [0, -0.04]), nl.toe, add(nl.ankle, [0.04, 0.05])], '#15110f', rim * 0.5);
  // 躯干 + 脖子 + 头
  part(torsoPts(S, p.coat && !p.sit), top);
  part(limbPts(add(S.neck, [0, 0.04]), S.neck, add(S.neck, U(S.lean + S.hd), 0.06), 0.045, 0.042, 0.04), skin, rim * 0.6);
  const hp = headPts(S);
  part(hp, skin);
  hairSide(ctx, S, p, hair, hp);
  // 近侧手臂
  const na = S.arms.near;
  part(limbPts(S.sh, na.el, na.hand, 0.06 * S.b, 0.05, 0.038), p.sleeve || top);
  hand(ctx, na, skin);
  if (p.holding === 'glass') { ctx.save(); ctx.translate(na.hand[0] - 0.02, na.hand[1] + 0.02); ctx.rotate(p.glassTilt || 0); glassShape(ctx, 0.07, 0.12, { fill: 0.4, liquid: p.liquid || [170, 80, 40] }); ctx.restore(); }
  if (p.holding === 'cup') { ctx.save(); ctx.translate(na.hand[0] - 0.01, na.hand[1] + 0.02); glassShape(ctx, 0.05, 0.055, { fill: 0.5, liquid: [210, 180, 120] }); ctx.restore(); }
  if (p.holding === 'chopsticks') {
    ctx.strokeStyle = '#c9a26a'; ctx.lineWidth = 0.008; ctx.lineCap = 'round';
    const d = D((p.arms.near[0] + p.arms.near[1]) + 0.5);
    ctx.beginPath(); ctx.moveTo(na.hand[0], na.hand[1]); ctx.lineTo(na.hand[0] + d[0] * 0.24, na.hand[1] + d[1] * 0.24); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(na.hand[0], na.hand[1] - 0.01); ctx.lineTo(na.hand[0] + d[0] * 0.24, na.hand[1] + d[1] * 0.24 - 0.015); ctx.stroke();
  }
  ctx.restore();
  return S;
}

function hand(ctx, a, col) {
  ctx.save();
  ctx.translate(a.hand[0], a.hand[1]);
  ctx.rotate(Math.atan2(a.hand[1] - a.el[1], a.hand[0] - a.el[0]));
  ctx.beginPath();
  ctx.ellipse(0.02, 0, 0.048, 0.03, 0, 0, Math.PI * 2);
  ctx.fillStyle = col;
  ctx.fill();
  ctx.restore();
}

function hairSide(ctx, S, p, hair, hp) {
  const c = headCenter(S), a = -(S.lean + S.hd), hs = S.hs;
  ctx.save();
  ctx.fillStyle = hair;
  const style = p.hairStyle || 'short';
  ctx.translate(c[0], c[1]);
  ctx.rotate(a);
  ctx.scale(hs, hs);
  ctx.beginPath();
  if (style === 'short') {
    // 从额头一直盖到后脑和后颈
    ctx.moveTo(-0.112, -0.035);
    ctx.quadraticCurveTo(-0.11, -0.13, -0.01, -0.135);
    ctx.quadraticCurveTo(0.1, -0.13, 0.11, -0.03);
    ctx.quadraticCurveTo(0.112, 0.05, 0.075, 0.09);
    ctx.lineTo(0.04, 0.06);
    ctx.quadraticCurveTo(0.03, -0.02, -0.04, -0.05);
    ctx.quadraticCurveTo(-0.08, -0.06, -0.112, -0.035);
  } else if (style === 'long') {
    ctx.moveTo(-0.112, -0.035);
    ctx.quadraticCurveTo(-0.11, -0.13, -0.01, -0.135);
    ctx.quadraticCurveTo(0.1, -0.13, 0.11, -0.03);
    ctx.lineTo(0.0, 0.0);
    ctx.closePath();
    ctx.moveTo(-0.11, -0.06);
    ctx.quadraticCurveTo(-0.05, -0.14, 0.05, -0.125);
    ctx.quadraticCurveTo(0.14, -0.08, 0.13, 0.08);
    ctx.quadraticCurveTo(0.12, 0.24, 0.07, 0.3);
    ctx.lineTo(0.0, 0.27);
    ctx.quadraticCurveTo(0.05, 0.12, 0.02, 0.0);
    ctx.quadraticCurveTo(-0.04, -0.06, -0.11, -0.06);
  } else if (style === 'bun') {
    ctx.moveTo(-0.112, -0.035);
    ctx.quadraticCurveTo(-0.11, -0.13, -0.01, -0.135);
    ctx.quadraticCurveTo(0.1, -0.13, 0.11, -0.03);
    ctx.quadraticCurveTo(0.112, 0.04, 0.07, 0.07);
    ctx.lineTo(0.03, 0.04);
    ctx.quadraticCurveTo(0.02, -0.03, -0.04, -0.05);
    ctx.quadraticCurveTo(-0.08, -0.06, -0.112, -0.035);
    ctx.moveTo(0.16, -0.06);
    ctx.ellipse(0.11, -0.07, 0.05, 0.045, 0, 0, Math.PI * 2);
  } else if (style === 'grey') {
    ctx.fillStyle = '#6a645c';
    ctx.moveTo(-0.1, -0.06);
    ctx.quadraticCurveTo(-0.09, -0.13, -0.01, -0.132);
    ctx.quadraticCurveTo(0.1, -0.13, 0.11, -0.03);
    ctx.quadraticCurveTo(0.112, 0.04, 0.07, 0.07);
    ctx.lineTo(0.03, 0.04);
    ctx.quadraticCurveTo(0.0, -0.06, -0.1, -0.06);
  }
  ctx.fill();
  ctx.restore();
}

// ---------------- 正面 / 背面 ----------------
// arms: { left: [上臂角(正=外), 肘弯], right: [...] }；hands 往里弯时肘弯为负
function drawFront(ctx, u, p) {
  const back = p.view === 'back';
  const hs = p.h ?? 1, b = p.build ?? 1;
  const light = p.light ?? -1.9;
  const rim = p.rim ?? 0.35, rimCol = p.rimCol || [255, 214, 160], rimW = 1.6 / u;
  const top = p.top || '#3a4038', bottom = p.bottom || '#24211e', skin = p.skin || '#7a5a46', hair = p.hair || '#16110e';
  const o = { light, rimCol, rimW };
  const hipY = p.sit ? 0 : -(0.97 * hs);
  const lean = p.lean ?? 0;
  const neck = [Math.sin(p.sway || 0) * 0.02, hipY - 0.5 * hs * Math.cos(lean * 0.6)];
  ctx.save();
  ctx.scale(u, u);
  const part = (pts, base, r = rim) => shade(ctx, (c) => smoothPath(c, pts), { ...o, base, rim: r, lit: 'rgba(255,224,190,0.12)', bbox: bboxOf(pts) });
  // 腿
  for (const s of [-1, 1]) {
    const hp = [s * 0.09 * b * hs, hipY];
    if (p.sit) {
      const knee = [s * 0.11 * hs, hipY + 0.06 * hs];
      part(limbPts(hp, knee, [s * 0.12 * hs, hipY + 0.5 * hs], 0.085 * b, 0.075, 0.055), bottom);
    } else {
      const step = (p.step || 0) * s;
      const knee = [s * 0.1 * hs + step * 0.05, hipY + 0.45 * hs];
      part(limbPts(hp, knee, [s * 0.11 * hs + step * 0.08, -0.06 * hs], 0.085 * b, 0.065, 0.05), bottom);
    }
  }
  // 躯干
  const shY = neck[1] + 0.06 * hs;
  const tor = [
    [-0.17 * b * hs, hipY + 0.04], [-0.15 * b * hs, hipY - 0.2 * hs], [-0.19 * b * hs, shY + 0.02], [-0.1 * hs, shY - 0.035 * hs],
    [0.1 * hs, shY - 0.035 * hs], [0.19 * b * hs, shY + 0.02], [0.15 * b * hs, hipY - 0.2 * hs], [0.17 * b * hs, hipY + 0.04],
  ];
  if (p.coat && !p.sit) { tor[0][1] += 0.35 * hs; tor[7][1] += 0.35 * hs; tor[0][0] -= 0.03; tor[7][0] += 0.03; }
  part(tor, top);
  // 脖子 + 头
  part(limbPts([neck[0], shY], [neck[0], neck[1]], [neck[0], neck[1] - 0.05], 0.045, 0.042, 0.04), skin, rim * 0.5);
  const hd = p.hd ?? 0, roll = p.roll ?? 0;
  const hc = [neck[0] + Math.sin(roll) * 0.1, neck[1] - 0.12 * hs + hd * 0.03];
  ctx.save();
  ctx.translate(hc[0], hc[1]);
  ctx.rotate(roll);
  const headPath = (c) => { c.beginPath(); c.ellipse(0, 0, 0.088 * hs, 0.112 * hs, 0, 0, Math.PI * 2); };
  shade(ctx, headPath, { ...o, base: back ? hair : skin, rim: rim * 0.8, lit: 'rgba(255,224,190,0.12)', bbox: [-0.09, -0.11, 0.09, 0.11] });
  ctx.fillStyle = (p.hairStyle === 'grey') ? '#6a645c' : hair;
  ctx.beginPath();
  if (!back) {
    // 头发：额头以上 + 两侧；低头越多，露出的头发越多
    const cover = 0.02 + hd * 0.06;
    ctx.ellipse(0, -0.02 * hs, 0.094 * hs, 0.1 * hs, 0, Math.PI * (1.02 - cover), Math.PI * (1.98 + cover));
    ctx.closePath();
    ctx.fill();
    if (p.hairStyle === 'long') { ctx.fillRect(-0.1 * hs, -0.03 * hs, 0.03 * hs, 0.2 * hs); ctx.fillRect(0.07 * hs, -0.03 * hs, 0.03 * hs, 0.2 * hs); }
    if (p.hairStyle === 'bun' || p.hairStyle === 'grey') { ctx.beginPath(); ctx.ellipse(0, -0.12 * hs, 0.05 * hs, 0.04 * hs, 0, 0, Math.PI * 2); ctx.fill(); }
  } else {
    if (p.hairStyle === 'long') { ctx.ellipse(0, 0.06 * hs, 0.1 * hs, 0.16 * hs, 0, 0, Math.PI * 2); ctx.fill(); }
    if (p.hairStyle === 'bun' || p.hairStyle === 'grey') { ctx.ellipse(0, -0.1 * hs, 0.05 * hs, 0.04 * hs, 0, 0, Math.PI * 2); ctx.fill(); }
  }
  ctx.restore();
  // 手臂
  const arms = p.arms || {};
  for (const [k, s] of [['left', -1], ['right', 1]]) {
    const [sa, eb] = arms[k] || [0.12, 0.1];
    const sh = [s * 0.17 * b * hs, shY + 0.03 * hs];
    const el = [sh[0] + s * Math.sin(sa) * 0.29 * hs, sh[1] + Math.cos(sa) * 0.29 * hs];
    const hd2 = [el[0] + s * Math.sin(sa + eb) * 0.26 * hs, el[1] + Math.cos(sa + eb) * 0.26 * hs];
    part(limbPts(sh, el, hd2, 0.055 * b, 0.048, 0.037), top);
    if (!back) hand(ctx, { el, hand: hd2 }, skin);
    if (p.holding === 'glass' && k === p.holdHand) { ctx.save(); ctx.translate(hd2[0], hd2[1] + 0.02); glassShape(ctx, 0.07, 0.12, { fill: 0.4, liquid: p.liquid || [170, 80, 40] }); ctx.restore(); }
    if (p.holding === 'cup' && k === p.holdHand) { ctx.save(); ctx.translate(hd2[0], hd2[1] + 0.02); glassShape(ctx, 0.05, 0.055, { fill: 0.5, liquid: [210, 180, 120] }); ctx.restore(); }
  }
  ctx.restore();
}

function bboxOf(pts) {
  let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
  for (const [x, y] of pts) { x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y); }
  return [x0, y0, x1, y1];
}

// 画一个人：p.view 'side' | 'front' | 'back'；alpha 用于「消失」
function person(ctx, x, y, u, p) {
  const a = p.alpha ?? 1;
  if (a <= 0.003) return;
  ctx.save();
  ctx.translate(x, y);
  ctx.globalAlpha *= a;
  if (p.view === 'front' || p.view === 'back') drawFront(ctx, u, p);
  else drawSide(ctx, u, p);
  ctx.restore();
}

// 整个人先画到离屏层，再整体半透明 / 模糊地贴上来（避免各部位重叠处透出来）
const { createCanvas } = require('@napi-rs/canvas');
let LAYER = null;
function layer(ctx, alpha, blur, fn) {
  const W = ctx.canvas.width, H = ctx.canvas.height;
  if (!LAYER || LAYER.width !== W) LAYER = createCanvas(W, H);
  const lx = LAYER.getContext('2d');
  lx.setTransform(1, 0, 0, 1, 0, 0);
  lx.clearRect(0, 0, W, H);
  lx.setTransform(ctx.getTransform());
  fn(lx);
  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.globalAlpha *= alpha;
  if (blur > 0.2) ctx.filter = `blur(${blur.toFixed(1)}px)`;
  ctx.drawImage(LAYER, 0, 0);
  ctx.restore();
}

module.exports = { person, skeleton, layer, D, U };
