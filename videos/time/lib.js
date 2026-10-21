// 《时间错觉》共用：人物骨架（真实比例、简化五官）、受光轮廓、镜头序列、摄影机。
const { createCanvas } = require('@napi-rs/canvas');
const { W, H } = require('../../src/config');
const { C, FONT } = require('../../src/lib/style');
const { rng, hash, noise1, lerp, clamp, prog, smooth } = require('../../src/lib/util');
const { mottle } = require('../../src/lib/material');

// ---------------- 摄影机 ----------------
// 看向 (cx, cy)，缩放 s。depth < 1 的层移动得更少（远景），> 1 更多（前景）。
function withCam(ctx, cam, depth, fn) {
  const d = depth ?? 1;
  const s = 1 + (cam.s - 1) * d;
  ctx.save();
  ctx.translate(W / 2, H / 2);
  if (cam.rot) ctx.rotate(cam.rot * d);
  ctx.scale(s, s);
  ctx.translate(-(W / 2 + (cam.cx - W / 2) * d), -(H / 2 + (cam.cy - H / 2) * d));
  fn();
  ctx.restore();
}
// 手持感：极轻的漂移，不同镜头用不同 seed
function drift(t, seed, amp = 4) {
  return { x: noise1(t * 0.7, seed) * amp, y: noise1(t * 0.6, seed + 1) * amp * 0.6 };
}

// ---------------- 镜头序列 ----------------
// shots: [{ at, dur, draw(ctx, lt, d, k), light?(lt, d), grade? }]，lt 为镜头内时间。
// 相邻镜头可叠化（mix 秒）；mix = 0 为硬切。
function sequence(shots, mix = 0) {
  const at = (d) => {
    for (let i = shots.length - 1; i >= 0; i--) if (d >= shots[i].at) return i;
    return 0;
  };
  function draw(ctx, d) {
    const i = at(d);
    const s = shots[i];
    const n = shots[i + 1];
    s.draw(ctx, d - s.at, d, i);
    if (mix > 0 && n && d > n.at - mix) {
      const k = smooth(prog(d, n.at - mix, n.at));
      ctx.save();
      ctx.globalAlpha = k;
      n.draw(ctx, d - n.at, d, i + 1);
      ctx.restore();
    }
  }
  function light(d) {
    const i = at(d);
    const s = shots[i];
    const out = s.light ? [].concat(s.light(d - s.at, d) || []) : [];
    const n = shots[i + 1];
    if (mix > 0 && n && n.light && d > n.at - mix) {
      const k = smooth(prog(d, n.at - mix, n.at));
      for (const l of out) l.w = (l.w ?? 1) * (1 - k);
      for (const l of [].concat(n.light(d - n.at, d) || [])) out.push({ ...l, w: (l.w ?? 1) * k });
    }
    return out;
  }
  function grade(d) {
    const s = shots[at(d)];
    return s.grade ? s.grade : { warm: 0, ambient: 0.2 };
  }
  return { draw, light, grade, at };
}

// ---------------- 人物 ----------------
// 骨架比例（以身高为 1）。成人约 7.5 头身，8 岁孩子约 6 头身。
const BODY = {
  adult: { head: 0.128, headW: 0.098, neck: 0.035, torso: 0.3, shoulderW: 0.115, hipW: 0.095, uArm: 0.175, fArm: 0.15, hand: 0.075, thigh: 0.245, shin: 0.235, foot: 0.12 },
  child: { head: 0.16, headW: 0.125, neck: 0.03, torso: 0.285, shoulderW: 0.105, hipW: 0.09, uArm: 0.165, fArm: 0.14, hand: 0.07, thigh: 0.215, shin: 0.215, foot: 0.12 },
};
const PAL = {
  child: { skin: '#c99a76', shirt: '#d8ccb0', pants: '#3d4654', hair: '#1e1714', shoe: '#e0d8c8' },
  adult: { skin: '#b38c70', shirt: '#4a4e52', pants: '#26282c', hair: '#18130f', shoe: '#1a1817', jacket: '#33373b' },
};

// 一段两端粗细不同的肢体（圆头）
function limb(ctx, a, b, w0, w1, color) {
  const dx = b[0] - a[0], dy = b[1] - a[1];
  const L = Math.hypot(dx, dy) || 1e-3;
  const ang = Math.atan2(dy, dx);
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(a[0], a[1], w0 / 2, ang + Math.PI / 2, ang - Math.PI / 2);
  ctx.arc(b[0], b[1], w1 / 2, ang - Math.PI / 2, ang + Math.PI / 2);
  ctx.closePath();
  ctx.fill();
  void L;
}

// 角度：四肢从「正下方」量起，朝面向方向为正；躯干从「正上方」量起，前倾为正。全部是绝对角度。
const dir = (ang, f) => [Math.sin(ang) * f, Math.cos(ang)];
const add = (p, v, l) => [p[0] + v[0] * l, p[1] + v[1] * l];

// 侧面人物。原点是髋关节。
//   pose: torso, neck, head(抬头为负), uArmN/fArmN/uArmF/fArmF, thighN/shinN/thighF/shinF, footN/footF, handN/handF
//   yaw: 1 = 面向 f 方向的侧脸；-1 = 转向另一侧；中间值是转头的过程
function side(ctx, o) {
  const { h, f = 1, kind = 'adult', pose = {}, pal = PAL[kind], yaw = 1, sleeve = kind === 'child' ? 0.45 : 1, hold } = o;
  const B = BODY[kind];
  const P = { torso: 0, neck: 0, head: 0, uArmN: 0.05, fArmN: 0.1, uArmF: -0.05, fArmF: 0, thighN: 0, shinN: 0, thighF: 0, shinF: 0, footN: Math.PI / 2, footF: Math.PI / 2, handN: null, handF: null, ...pose };
  const hip = [0, 0];
  const tv = [Math.sin(P.torso) * f, -Math.cos(P.torso)];
  const sh = add(hip, tv, B.torso * h);
  const nv = [Math.sin(P.torso + P.neck) * f, -Math.cos(P.torso + P.neck)];
  const neckTop = add(sh, nv, B.neck * h);
  const hc = add(neckTop, nv, B.head * h * 0.42);
  const shoulder = add(sh, [tv[0], tv[1]], -B.torso * h * 0.06);

  // 目标点（局部坐标）→ IK：reachN/reachF 是手腕位置，ankleN/ankleF 是脚踝位置
  const sOf = (far) => add(shoulder, [f, 0], (far ? -0.012 : 0.012) * h);
  const hOf = (far) => [hip[0] - (far ? 0.01 : -0.01) * h * f, hip[1]];
  if (P.reachN) [P.uArmN, P.fArmN] = ik2(sOf(false), P.reachN, B.uArm * h, B.fArm * h, f, -1);
  if (P.reachF) [P.uArmF, P.fArmF] = ik2(sOf(true), P.reachF, B.uArm * h, B.fArm * h, f, -1);
  if (P.ankleN) [P.thighN, P.shinN] = ik2(hOf(false), P.ankleN, B.thigh * h, B.shin * h, f, 1);
  if (P.ankleF) [P.thighF, P.shinF] = ik2(hOf(true), P.ankleF, B.thigh * h, B.shin * h, f, 1);
  const leg = (th, shn, ft, far) => {
    const knee = add(hOf(far), dir(th, f), B.thigh * h);
    const ankle = add(knee, dir(shn, f), B.shin * h);
    const toe = add(ankle, dir(ft, f), B.foot * h * 0.85);
    return { knee, ankle, toe };
  };
  const arm = (ua, fa, ha, far) => {
    const s0 = sOf(far);
    const elbow = add(s0, dir(ua, f), B.uArm * h);
    const wrist = add(elbow, dir(fa, f), B.fArm * h);
    const hand = add(wrist, dir(ha ?? fa, f), B.hand * h * 0.75);
    return { s0, elbow, wrist, hand };
  };
  const lN = leg(P.thighN, P.shinN, P.footN, false), lF = leg(P.thighF, P.shinF, P.footF, true);
  const aN = arm(P.uArmN, P.fArmN, P.handN, false), aF = arm(P.uArmF, P.fArmF, P.handF, true);

  const dim = (c, k) => shade(c, k);
  const drawLeg = (L, k) => {
    limb(ctx, hip, L.knee, B.hipW * h * 0.95, B.hipW * h * 0.62, dim(pal.pants, k));
    const shinColor = kind === 'child' ? dim(pal.skin, k) : dim(pal.pants, k);
    limb(ctx, L.knee, L.ankle, B.hipW * h * 0.6, B.hipW * h * 0.38, shinColor);
    limb(ctx, L.ankle, L.toe, B.hipW * h * 0.42, B.hipW * h * 0.32, dim(pal.shoe, k));
  };
  const drawArm = (A, k) => {
    const uw = B.shoulderW * h * 0.42, fw = B.shoulderW * h * 0.32;
    // 袖子：child 短袖（上臂只盖一部分）
    const mid = [lerp(A.s0[0], A.elbow[0], sleeve), lerp(A.s0[1], A.elbow[1], sleeve)];
    limb(ctx, A.s0, A.elbow, uw, fw * 1.05, dim(pal.skin, k));
    limb(ctx, A.s0, mid, uw * 1.12, uw * 1.02, dim(pal.jacket || pal.shirt, k));
    limb(ctx, A.elbow, A.wrist, fw, fw * 0.78, dim(sleeve >= 1 && kind === 'adult' && o.longSleeve !== false ? (pal.jacket || pal.shirt) : pal.skin, k));
    limb(ctx, A.wrist, A.hand, fw * 0.95, fw * 0.8, dim(pal.skin, k));
  };

  ctx.save();
  // 远侧肢体（略暗）
  drawLeg(lF, 0.72);
  drawArm(aF, 0.7);
  // 躯干：肩到髋，胸背略有弧度
  const n = [-tv[1], tv[0]];
  const sw = B.shoulderW * h, hw = B.hipW * h;
  ctx.fillStyle = shade(pal.jacket || pal.shirt, 1);
  ctx.beginPath();
  const front = (p, w) => [p[0] + n[0] * w * 0.5 * -f, p[1] + n[1] * w * 0.5 * -f];
  const back = (p, w) => [p[0] - n[0] * w * 0.5 * -f, p[1] - n[1] * w * 0.5 * -f];
  const s1 = front(sh, sw * 0.95), s2 = back(sh, sw);
  const h1 = front(hip, hw * 1.05), h2 = back(hip, hw * 1.15);
  const chest = add(front(lerp2(sh, hip, 0.3), sw * 1.05), [f * Math.cos(P.torso), Math.sin(P.torso) * f * 0], 0);
  ctx.moveTo(s2[0], s2[1]);
  ctx.quadraticCurveTo((s2[0] + s1[0]) / 2 + nv[0] * sw * 0.25, (s2[1] + s1[1]) / 2 + nv[1] * sw * 0.25, s1[0], s1[1]);
  ctx.quadraticCurveTo(chest[0], chest[1], h1[0], h1[1]);
  ctx.lineTo(h2[0], h2[1]);
  const bk = back(lerp2(sh, hip, 0.45), sw * 1.12);
  ctx.quadraticCurveTo(bk[0], bk[1], s2[0], s2[1]);
  ctx.fill();
  // 脖子
  limb(ctx, sh, add(neckTop, nv, B.head * h * 0.05), B.headW * h * 0.42, B.headW * h * 0.4, shade(pal.skin, 0.85));
  drawLeg(lN, 1);
  // 头
  head(ctx, hc, B, h, f, P.torso + P.neck + P.head, yaw, pal);
  if (hold) hold(aN.hand, aN.wrist);
  drawArm(aN, 1);
  ctx.restore();
  return { hip, sh, hc, hand: aN.hand, handF: aF.hand, knee: lN.knee, toe: lN.toe, ankle: lN.ankle };
}

// 两段骨骼的 IK：从关节 a 伸向 target，返回两段的绝对角度（同 side() 的约定）。
//   bend = 1：中间关节朝面向方向弯（膝盖）；-1：朝后弯（手肘）
function ik2(a, target, l1, l2, f, bend = 1) {
  const dx = target[0] - a[0], dy = target[1] - a[1];
  const d = Math.min(Math.hypot(dx, dy), (l1 + l2) * 0.999);
  const base = Math.atan2(dy, dx);
  const off = Math.acos(clamp((l1 * l1 + d * d - l2 * l2) / (2 * l1 * d), -1, 1));
  const ang1 = base - off * bend * f;
  const j = [a[0] + Math.cos(ang1) * l1, a[1] + Math.sin(ang1) * l1];
  const toAbs = (vx, vy) => Math.atan2(vx * f, vy);
  return [toAbs(j[0] - a[0], j[1] - a[1]), toAbs(target[0] - j[0], target[1] - j[1])];
}

function lerp2(a, b, k) { return [lerp(a[0], b[0], k), lerp(a[1], b[1], k)]; }

// 头：头骨 + 侧脸轮廓（额—眉骨—鼻—唇—下巴）+ 头发 + 耳朵。
//   yaw：1 = 朝 f 方向的侧脸，-1 = 朝另一侧，0 = 正对镜头。中间值就是转头过程（五官沿横向收拢）。
function head(ctx, c, B, h, f, ang, yaw, pal) {
  const rx = B.headW * h * 0.5, ry = B.head * h * 0.5;
  const s = f * yaw; // 带符号：五官朝哪边、伸出多少
  const a = Math.abs(yaw);
  const X = (x) => x * rx * s, Y = (y) => y * ry;
  ctx.save();
  ctx.translate(c[0], c[1]);
  ctx.rotate(ang * f);
  // 头骨：后脑比脸宽一点
  ctx.fillStyle = pal.skin;
  ctx.beginPath();
  ctx.ellipse(-rx * 0.1 * s, -ry * 0.08, rx * (0.92 + 0.1 * a), ry * 0.9, 0, 0, Math.PI * 2);
  ctx.fill();
  // 脸：额头 → 眉骨 → 鼻尖 → 人中 → 唇 → 下巴 → 下颌
  ctx.beginPath();
  ctx.moveTo(X(0.55), Y(-0.62));
  ctx.quadraticCurveTo(X(0.86), Y(-0.45), X(0.86), Y(-0.18));
  ctx.lineTo(X(0.82), Y(-0.1));
  ctx.quadraticCurveTo(X(0.98), Y(0.06), X(1.04), Y(0.14));
  ctx.lineTo(X(0.86), Y(0.22));
  ctx.lineTo(X(0.9), Y(0.34));
  ctx.lineTo(X(0.84), Y(0.44));
  ctx.quadraticCurveTo(X(0.86), Y(0.62), X(0.66), Y(0.72));
  ctx.quadraticCurveTo(X(0.3), Y(0.74), X(0.05), Y(0.58));
  ctx.lineTo(X(-0.2), Y(0.3));
  ctx.lineTo(X(0.1), Y(-0.6));
  ctx.closePath();
  ctx.fill();
  // 下颌下的影子
  ctx.fillStyle = 'rgba(40,22,14,0.22)';
  ctx.beginPath();
  ctx.moveTo(X(0.66), Y(0.72));
  ctx.quadraticCurveTo(X(0.3), Y(0.74), X(0.05), Y(0.58));
  ctx.lineTo(X(0.05), Y(0.8));
  ctx.lineTo(X(0.6), Y(0.8));
  ctx.fill();
  // 头发：头顶和后脑，鬓角在耳前
  ctx.fillStyle = pal.hair;
  ctx.beginPath();
  ctx.moveTo(X(0.62), Y(-0.58));
  ctx.quadraticCurveTo(X(0.5), Y(-1.08), X(-0.2), Y(-1.02));
  ctx.quadraticCurveTo(X(-1.12), Y(-0.85), X(-1.06), Y(-0.05));
  ctx.quadraticCurveTo(X(-1.0), Y(0.35), X(-0.72), Y(0.5));
  ctx.lineTo(X(-0.45), Y(0.22));
  ctx.quadraticCurveTo(X(-0.15), Y(-0.2), X(0.12), Y(-0.08));
  ctx.lineTo(X(0.18), Y(-0.42));
  ctx.quadraticCurveTo(X(0.4), Y(-0.5), X(0.62), Y(-0.58));
  ctx.fill();
  // 转向镜头时：头发变成盖住头顶的一顶「帽子」
  if (a < 0.95) {
    ctx.save();
    ctx.globalAlpha *= Math.min(1, (1 - a) * 1.6);
    ctx.beginPath();
    ctx.ellipse(-rx * 0.1 * s, -ry * 0.2, rx * 1.02, ry * 0.86, 0, Math.PI * 1.0, Math.PI * 2.0);
    ctx.quadraticCurveTo(rx * 0.6, -ry * 0.5, rx * 0.1 * s, -ry * 0.48);
    ctx.quadraticCurveTo(-rx * 0.6, -ry * 0.5, -rx * 1.1, -ry * 0.2);
    ctx.fill();
    ctx.restore();
  }
  // 耳朵（正对镜头时两侧各一只，侧脸时只有一只）
  ctx.fillStyle = shade(pal.skin, 0.86);
  if (a > 0.25) {
    ctx.beginPath();
    ctx.ellipse(X(-0.12), Y(0.1), rx * 0.13, ry * 0.19, 0, 0, Math.PI * 2);
    ctx.fill();
  } else {
    for (const k of [-1, 1]) {
      ctx.beginPath();
      ctx.ellipse(k * rx * 0.97, Y(0.1), rx * 0.11, ry * 0.18, 0, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.restore();
}

// 背面 / 正面半身：头、脖子、肩、躯干，可带手臂。原点是两肩中点。
function bust(ctx, o) {
  const { h, kind = 'adult', pal = PAL[kind], tilt = 0, arms = true, armsOut = 0, front = false, turn = 0 } = o;
  const B = BODY[kind];
  const sw = B.shoulderW * h * 2.05, hw = B.hipW * h * 2.1;
  const hr = B.headW * h * 0.5, hry = B.head * h * 0.5;
  ctx.save();
  // 躯干（到腰）
  ctx.fillStyle = pal.jacket || pal.shirt;
  ctx.beginPath();
  ctx.moveTo(-sw / 2, sw * 0.08);
  ctx.quadraticCurveTo(-sw / 2 - sw * 0.02, -sw * 0.08, -sw * 0.25, -sw * 0.12);
  ctx.lineTo(sw * 0.25, -sw * 0.12);
  ctx.quadraticCurveTo(sw / 2 + sw * 0.02, -sw * 0.08, sw / 2, sw * 0.08);
  ctx.lineTo(hw / 2, B.torso * h * 1.05);
  ctx.lineTo(-hw / 2, B.torso * h * 1.05);
  ctx.closePath();
  ctx.fill();
  if (arms) {
    for (const s of [-1, 1]) {
      const a = [s * sw * 0.47, sw * 0.02];
      const e = [s * (sw * 0.52 + armsOut * h * 0.05), B.uArm * h];
      limb(ctx, a, e, B.shoulderW * h * 0.46, B.shoulderW * h * 0.36, shade(pal.jacket || pal.shirt, 0.92));
    }
  }
  // 脖子
  ctx.fillStyle = shade(pal.skin, 0.8);
  ctx.fillRect(-hr * 0.42, -sw * 0.12 - B.neck * h * 1.3, hr * 0.84, B.neck * h * 1.6);
  // 头
  ctx.translate(0, -sw * 0.12 - B.neck * h - hry * 0.92);
  ctx.rotate(tilt);
  ctx.fillStyle = front ? pal.skin : pal.hair;
  ctx.beginPath();
  ctx.ellipse(0, 0, hr, hry, 0, 0, Math.PI * 2);
  ctx.fill();
  // 耳朵
  ctx.fillStyle = shade(pal.skin, 0.85);
  for (const s of [-1, 1]) {
    ctx.beginPath();
    ctx.ellipse(s * hr * (0.98 + turn * s * 0.08), hry * 0.08, hr * 0.14, hry * 0.2, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  if (front) {
    // 正面：头发只盖在头顶，脸上没有五官，只有一点鼻梁的阴影
    ctx.fillStyle = pal.hair;
    ctx.beginPath();
    ctx.ellipse(0, -hry * 0.18, hr * 1.04, hry * 0.88, 0, Math.PI * 1.02, Math.PI * 1.98);
    ctx.quadraticCurveTo(hr * 0.5, -hry * 0.55, 0, -hry * 0.5);
    ctx.quadraticCurveTo(-hr * 0.6, -hry * 0.55, -hr * 1.0, -hry * 0.1);
    ctx.fill();
    ctx.fillStyle = 'rgba(40,24,16,0.18)';
    ctx.beginPath();
    ctx.ellipse(turn * hr * 0.2, hry * 0.12, hr * 0.1, hry * 0.22, 0, 0, Math.PI * 2);
    ctx.fill();
  } else {
    // 背面：后颈的发际线
    ctx.fillStyle = shade(pal.skin, 0.75);
    ctx.beginPath();
    ctx.ellipse(0, hry * 0.82, hr * 0.42, hry * 0.18, 0, 0, Math.PI);
    ctx.fill();
  }
  ctx.restore();
}

// 颜色明暗：k < 1 变暗
function shade(hex, k) {
  if (k === 1 || hex[0] !== '#') return hex;
  const n = parseInt(hex.slice(1), 16);
  const r = Math.round(((n >> 16) & 255) * k), g = Math.round(((n >> 8) & 255) * k), b = Math.round((n & 255) * k);
  return `rgb(${r},${g},${b})`;
}

// ---------------- 受光：明暗 + 轮廓光 ----------------
// 先把人物画到离屏层，再加：背光面压暗、受光边一道细轮廓光。
//   light: 光从哪个方向来（弧度，0 = 从右边来，-PI/2 = 从上面来）
const FL = createCanvas(W, H), FLx = FL.getContext('2d');
const RL = createCanvas(W, H), RLx = RL.getContext('2d');
function lit(ctx, fn, o = {}) {
  const { light = -0.6, rim = [255, 214, 160], rimA = 0.75, rimW = 3, shadow = 0.55, ambient = 1, bbox = [0, 0, W, H], alpha = 1 } = o;
  const T = ctx.getTransform();
  FLx.setTransform(1, 0, 0, 1, 0, 0);
  FLx.globalCompositeOperation = 'source-over';
  FLx.globalAlpha = 1;
  FLx.clearRect(0, 0, W, H);
  FLx.setTransform(T);
  fn(FLx);
  FLx.setTransform(1, 0, 0, 1, 0, 0);
  const ux = Math.cos(light), uy = Math.sin(light);
  // 整体压暗（人物比环境暗一点）+ 背光面渐暗
  FLx.globalCompositeOperation = 'source-atop';
  if (ambient < 1) {
    FLx.fillStyle = `rgba(8,6,5,${1 - ambient})`;
    FLx.fillRect(0, 0, W, H);
  }
  const [bx, by, bw, bh] = bbox;
  const cx = bx + bw / 2, cy = by + bh / 2, R = Math.hypot(bw, bh) / 2;
  const g = FLx.createLinearGradient(cx + ux * R, cy + uy * R, cx - ux * R, cy - uy * R);
  g.addColorStop(0, 'rgba(0,0,0,0)');
  g.addColorStop(0.45, `rgba(6,4,3,${shadow * 0.35})`);
  g.addColorStop(1, `rgba(6,4,3,${shadow})`);
  FLx.fillStyle = g;
  FLx.fillRect(bx - 20, by - 20, bw + 40, bh + 40);
  // 轮廓光：形状 减去 朝光反方向平移后的形状
  if (rimA > 0) {
    RLx.setTransform(1, 0, 0, 1, 0, 0);
    RLx.globalCompositeOperation = 'source-over';
    RLx.clearRect(0, 0, W, H);
    RLx.drawImage(FL, 0, 0);
    RLx.globalCompositeOperation = 'source-in';
    RLx.fillStyle = `rgb(${rim.join(',')})`;
    RLx.fillRect(0, 0, W, H);
    RLx.globalCompositeOperation = 'destination-out';
    RLx.drawImage(FL, -ux * rimW, -uy * rimW);
    FLx.globalCompositeOperation = 'source-atop';
    FLx.globalAlpha = rimA;
    FLx.drawImage(RL, 0, 0);
    FLx.globalAlpha = 1;
  }
  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.globalAlpha *= alpha;
  ctx.drawImage(FL, 0, 0);
  ctx.restore();
}

// 离屏模糊：把一组绘制模糊后贴回（景深）。缩小绘制再放大，便宜。
const BL = createCanvas(W / 2, H / 2), BLx = BL.getContext('2d');
function blurred(ctx, px, fn, alpha = 1) {
  BLx.setTransform(1, 0, 0, 1, 0, 0);
  BLx.clearRect(0, 0, W / 2, H / 2);
  BLx.setTransform(0.5, 0, 0, 0.5, 0, 0);
  BLx.transform(...(() => { const m = ctx.getTransform(); return [m.a, m.b, m.c, m.d, m.e, m.f]; })());
  BLx.save();
  fn(BLx);
  BLx.restore();
  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.globalAlpha *= alpha;
  ctx.filter = `blur(${px}px)`;
  ctx.drawImage(BL, 0, 0, W, H);
  ctx.restore();
}

// 带纹理的墙 / 平面（缓存）
const texCache = new Map();
function wallTex(w, h, rgb, seed, o = {}) {
  const key = `${w}x${h}:${rgb}:${seed}:${o.cells || 0}`;
  if (texCache.has(key)) return texCache.get(key);
  const c = createCanvas(w, h);
  const x = c.getContext('2d');
  x.fillStyle = `rgb(${rgb.join(',')})`;
  x.fillRect(0, 0, w, h);
  mottle(x, w, h, o.cells || 6, seed, 0.22, rgb.map((v) => v * 0.6));
  mottle(x, w, h, 24, seed + 1, 0.08, rgb.map((v) => v * 0.5));
  mottle(x, w, h, 9, seed + 2, 0.12, rgb.map((v) => Math.min(255, v * 1.25)));
  const r = rng(seed + 3);
  for (let i = 0; i < (w * h) / 900; i++) {
    x.fillStyle = `rgba(0,0,0,${0.04 + r() * 0.06})`;
    x.fillRect(r() * w, r() * h, 1 + r() * 1.5, 1 + r() * 1.5);
  }
  texCache.set(key, c);
  return c;
}

module.exports = { ik2, withCam, drift, sequence, side, bust, head, limb, lit, blurred, wallTex, shade, PAL, BODY, W, H, C, FONT, rng, hash, noise1, lerp, clamp, prog, smooth };
