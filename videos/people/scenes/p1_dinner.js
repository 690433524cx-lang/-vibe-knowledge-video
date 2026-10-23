// 第一幕 · 0–11.8 秒：餐桌。
//   0.0  四个人在笑，A（驼色毛衣）正说着「我这个人其实不太在乎钱」；服务员从后面走来
//   1.55 账单夹落在桌子中央，笑声停住，镜头猛推
//   2.0  特写：账单夹翻开，¥1260；A 的手指一收，手往回撤
//   3.45 中景：A 的视线落在账单上，手从桌面退到腿上；其他人也看过来
//   6.0  横移：「都可以」「你们决定」「我没关系」——谁都没去碰那张账单
//   9.0  拉回全景：每个人的脸被一个词盖住（大方 / 重感情 / 善良 / 理性 / 情绪稳定）
//   11.1 所有词退进黑暗，光收到 A 的手上 → 接第二幕特写
const L = require('../lib');
const { W, H, FONT, lerp, clamp, prog, smooth, noise1, track, ease, spring } = L;
const { drawInsert, insertLights } = require('../insert');

const S = { start: 0, end: 11.85 };
const BILL = [990, 634];
const SH = { wide: 0, insert: 2.0, medA: 3.45, truck: 6.0, words: 9.0, recede: 11.1 };

// ---------------- 摄影机 ----------------
function cam(d) {
  if (d < SH.insert) {
    const p = Math.pow(prog(d, 1.62, 2.0), 2.2);
    return { cx: lerp(960, BILL[0], p), cy: lerp(578 + d * 3, BILL[1] - 20, p), s: lerp(1.13 + d * 0.025, 2.2, p) };
  }
  if (d < SH.truck) {
    const k = smooth(prog(d, SH.medA, SH.truck));
    return { cx: lerp(750, 780, k), cy: lerp(560, 556, k), s: lerp(1.86, 1.98, k) + (1 - spring(d, SH.medA, 2.4, 0.8)) * 0.12 };
  }
  if (d < SH.words) {
    const cx = track(d, [[6.0, 780], [6.35, 820], [7.0, 820], [7.3, 1140], [7.8, 1140], [8.1, 1360], [9.0, 1380]]);
    const cy = track(d, [[6.0, 556], [6.35, 500], [7.8, 500], [8.1, 540]]);
    const s = track(d, [[6.0, 1.98], [6.4, 1.55], [9.0, 1.5]]);
    return { cx, cy, s };
  }
  const k = ease(prog(d, 9.0, 9.9));
  const r = ease(prog(d, 11.1, 11.85));
  return {
    cx: lerp(lerp(1380, 960, k), 680, r),
    cy: lerp(lerp(540, 560, k), 640, r),
    s: lerp(lerp(1.5, 1.12, k), 2.6, r * r),
  };
}

// ---------------- 人物的动作 ----------------
function laughOf(d, ph) {
  const k = 1 - smooth(prog(d, 1.5, 1.85));
  return clamp(k * (0.75 + 0.25 * Math.sin(d * 8.5 + ph)));
}
const say = (d, a, b) => (d > a && d < b ? 0.35 + 0.35 * Math.abs(Math.sin((d - a) * 13)) : 0);

function poseA(d) {
  const lg = laughOf(d, 0);
  const look = smooth(prog(d, 1.62, 2.0));
  const back = smooth(prog(d, 2.85, 4.6));
  const torso = 0.08 - 0.07 * lg * (0.6 + 0.4 * Math.sin(d * 8.5)) + 0.08 * look - 0.06 * back;
  const head = lerp(-0.12 - 0.06 * lg * Math.sin(d * 8.5), 0.36, look) - 0.08 * smooth(prog(d, 9.2, 10)) * 0;
  const gesture = [150 + 18 * Math.sin(d * 3), -176 + 14 * Math.sin(d * 4.2)];
  const onTable = [205, -108];
  let reachN = L.mix(gesture, onTable, smooth(prog(d, 1.62, 1.95)));
  reachN = L.mix(reachN, [150, -96], smooth(prog(d, 2.85, 3.4)));
  reachN = L.mix(reachN, [96, -30], smooth(prog(d, 3.6, 4.7)));
  const reachF = L.mix([188 + 6 * Math.sin(d * 2), -120], [110, -50], smooth(prog(d, 3.9, 5.0)));
  return {
    h: 640, f: 1, yaw: 1, laugh: lg, talk: say(d, 0, 1.45) * (1 - lg), eye: 1, frown: 0.6 * look,
    pose: { ...L.SEAT, torso, neck: 0.04, head, reachN, reachF, handN: Math.PI / 2 - 0.2, handF: Math.PI / 2 - 0.1 },
  };
}
function poseB(d) {
  const lg = laughOf(d, 1.3);
  const look = smooth(prog(d, 1.7, 2.1));
  const sp = say(d, 7.75, 8.6);
  const chest = smooth(prog(d, 7.7, 8.0)) * (1 - smooth(prog(d, 8.7, 9.2)));
  const shake = Math.sin((d - 7.8) * 14) * 0.08 * chest;
  return {
    h: 640, f: -1, yaw: 1, laugh: lg, talk: sp, eye: 1,
    pose: { ...L.SEAT, torso: 0.06 - 0.06 * lg + 0.06 * look, neck: shake, head: lerp(-0.08 * lg, 0.3, look) - 0.2 * chest,
      reachN: L.mix([190, -112], [62, -150], chest).map((v, i) => (i === 0 ? -v : v)), reachF: [-170, -118], handN: Math.PI / 2 - 0.3 },
  };
}
// 短发的头转过正面时会穿帮：转头时直接跨过正面（像一次很快的回头）
const noEdge = (y) => Math.sign(y || 1) * Math.max(0.6, Math.abs(y));
function poseC(d) {
  const lg = laughOf(d, 2.1) * 0.8;
  const look = smooth(prog(d, 1.7, 2.15));
  const sp = say(d, 6.1, 6.95);
  const palms = smooth(prog(d, 6.05, 6.35)) * (1 - smooth(prog(d, 7.0, 7.5)));
  // 5.0 C 侧过头，瞟了 A 一眼
  const glance = smooth(prog(d, 4.95, 5.2)) * (1 - smooth(prog(d, 7.2, 7.6)));
  return {
    h: 580, f: -1, yaw: noEdge(clamp(lerp(1, -0.6, look) + 1.6 * glance + spring(d, 6.02, 2.2, 0.8) * 1.6 * (1 - glance) * (1 - smooth(prog(d, 7.2, 7.6))), -1, 1)), laugh: lg, talk: sp, eye: 1, bob: true,
    pose: { ...L.SEAT, torso: 0.05 - 0.05 * lg, neck: 0.05, head: lerp(-0.05, 0.3, look) - 0.25 * palms,
      reachN: L.mix([-70, -48], [-112, -150], palms), reachF: L.mix([-40, -40], [-60, -128], palms), handN: lerp(Math.PI / 2, Math.PI * 0.85, palms) },
  };
}
function poseD(d) {
  const lg = laughOf(d, 0.7) * 0.9;
  const look = smooth(prog(d, 1.75, 2.2));
  const sp = say(d, 6.95, 7.75);
  const lean = smooth(prog(d, 6.85, 7.2)) * (1 - smooth(prog(d, 7.9, 8.5)));
  return {
    h: 580, f: -1, yaw: 1, laugh: lg, talk: sp, eye: 1,
    pose: { ...L.SEAT, torso: 0.06 - 0.05 * lg + 0.04 * look - 0.2 * lean, neck: 0.04, head: lerp(-0.06, 0.34, look) - 0.22 * lean,
      reachN: L.mix([-66, -44], [-130, -140], lean), reachF: [-36, -42], handN: lerp(Math.PI / 2, Math.PI * 0.75, lean) },
  };
}
// 服务员：从右后方走来 → 弯腰放下账单 → 收手离开
function poseW(d) {
  const x = track(d, [[0, 1700], [1.15, 1092], [2.1, 1092], [3.6, 1900]], (k) => k);
  const walk = d < 1.15 || d > 2.1;
  const ph = d * 7.2;
  const put = smooth(prog(d, 1.1, 1.5)) * (1 - smooth(prog(d, 1.68, 2.05)));
  return {
    x, put,
    o: {
      h: 660, f: d > 2.1 ? 1 : -1, yaw: 1, eye: 1,
      pose: {
        torso: 0.04 + put * 0.42, neck: 0.1, head: 0.15 + put * 0.2,
        thighN: walk ? Math.sin(ph) * 0.35 : 0.02, shinN: walk ? Math.sin(ph) * 0.2 - 0.05 : 0, thighF: walk ? -Math.sin(ph) * 0.35 : -0.02, shinF: walk ? -Math.sin(ph) * 0.2 - 0.05 : 0,
        reachN: put > 0.02 ? L.mix([-60, -60], [BILL[0] - x, BILL[1] - 602 - 6], put) : null,
        uArmN: walk ? -Math.sin(ph) * 0.3 : 0.1, fArmN: walk ? -Math.sin(ph) * 0.2 + 0.3 : 0.35,
        uArmF: walk ? Math.sin(ph) * 0.3 : 0, fArmF: 0.2,
      },
    },
  };
}

// 正在桌上的账单夹：1.5 秒前在服务员手里
function billAt(d, Wp) {
  if (d < 1.52) return null;
  return BILL;
}

// 两端的椅子（在人身后）
function chair(c, x, y, f) {
  c.save();
  c.translate(x, y);
  c.scale(f, 1);
  c.fillStyle = '#2a1f17';
  c.fillRect(-58, -250, 16, 450);
  c.fillRect(-60, 28, 150, 18);
  c.fillRect(70, 40, 13, 160);
  c.fillRect(-58, 40, 13, 160);
  c.fillStyle = 'rgba(255,214,160,0.12)';
  c.fillRect(-46, -250, 3, 270);
  c.fillRect(-60, 28, 150, 3);
  c.restore();
}

// 每帧记下头的位置，给 drawOver 的「词」用
let heads = {};

function drawCast(ctx, d, layer) {
  const A = poseA(d), B = poseB(d), Cc = poseC(d), D = poseD(d), Wt = poseW(d);
  const by = L.TBL.by;
  if (layer === 'back') {
    // 服务员（在 C、D 后面），只画桌面以上
    if (Wt.x < 1960) {
      L.lit(ctx, (c) => {
        c.save(); c.beginPath(); c.rect(0, 0, W, by + 2); c.clip();
        c.translate(Wt.x, 602);
        L.figure(c, { ...Wt.o, pal: L.CAST.waiter });
        c.restore();
      }, { light: -1.2, rim: [255, 214, 160], rimA: 0.55, shadow: 0.45, ambient: 0.85, bbox: [Wt.x - 200, 200, 400, 420] });
    }
    // C、D：坐在桌子后面。第一遍只画桌面以上，第二遍画落在桌面上的手
    for (const [P, hx, key] of [[Cc, 790, 'C'], [D, 1190, 'D']]) {
      let hp;
      L.lit(ctx, (c) => {
        c.save(); c.beginPath(); c.rect(0, 0, W, by + 1); c.clip();
        c.translate(hx, 655);
        hp = L.figure(c, { ...P, pal: L.CAST[key] });
        c.restore();
        c.save(); c.beginPath(); c.rect(hx - 260, by, 220, 34); c.clip();
        c.translate(hx, 655);
        L.figure(c, { ...P, pal: L.CAST[key] });
        c.restore();
      }, { light: -1.45, rim: [255, 214, 160], rimA: 0.7, shadow: 0.4, ambient: 0.95, bbox: [hx - 240, 300, 480, 380] });
      heads[key] = [hx + hp.hc[0], 655 + hp.hc[1]];
    }
    // 服务员伸过来的手臂（桌面以上那一段已经画过）
    if (Wt.put > 0.02) {
      L.lit(ctx, (c) => {
        c.save(); c.beginPath(); c.rect(BILL[0] - 70, by, Wt.x - BILL[0] + 10, 70); c.clip();
        c.translate(Wt.x, 602);
        L.figure(c, { ...Wt.o, pal: L.CAST.waiter });
        c.restore();
      }, { light: -1.2, rimA: 0.4, shadow: 0.3, ambient: 0.95, bbox: [900, 500, 300, 200] });
    }
    return Wt;
  }
  // 两端：A、B
  let pa, pb;
  L.lit(ctx, (c) => { chair(c, 455, 760, 1); c.save(); c.translate(455, 760); pa = L.figure(c, { ...A, pal: L.CAST.A }); c.restore(); },
    { light: -0.75, rim: [255, 220, 170], rimA: 0.85, rimW: 3.5, shadow: 0.42, ambient: 1, bbox: [280, 360, 420, 480] });
  L.lit(ctx, (c) => { chair(c, 1465, 760, -1); c.save(); c.translate(1465, 760); pb = L.figure(c, { ...B, pal: L.CAST.B }); c.restore(); },
    { light: -2.4, rim: [255, 214, 160], rimA: 0.75, shadow: 0.45, ambient: 0.95, bbox: [1240, 360, 420, 480] });
  heads.A = [455 + pa.hc[0], 760 + pa.hc[1]];
  heads.B = [1465 + pb.hc[0], 760 + pb.hc[1]];
}

function drawTableItems(ctx, d, Wt) {
  L.plate(ctx, 640, 640, 62, '#5c3424');
  L.plate(ctx, 1280, 640, 62, '#4e3a22');
  L.plate(ctx, 820, 606, 48, '#6a4a2a');
  L.plate(ctx, 1150, 606, 48, '#5a2c22');
  L.plate(ctx, 880, 652, 58, '#3e2a1c');
  L.teapot(ctx, 1080, 612);
  L.glass(ctx, 700, 618, 62, 1);
  L.glass(ctx, 1224, 618, 62, 1);
  L.glass(ctx, 872, 596, 52, 1);
  L.glass(ctx, 1100, 596, 52, 0);
  // 账单：先在服务员手里，落下后留在桌子中央
  const b = billAt(d, Wt);
  if (b) {
    const land = spring(d, 1.52, 4, 0.5);
    L.billSmall(ctx, b[0], b[1] - (1 - land) * 10, -0.04, d > 2.0 ? 1 : 0);
  } else if (Wt.put > 0.3) {
    // 手里拿着
    L.billSmall(ctx, lerp(Wt.x - 60, BILL[0], Wt.put), lerp(560, BILL[1] - 14, Wt.put), -0.2 * (1 - Wt.put));
  }
}

function drawWide(ctx, d) {
  const c = cam(d);
  heads = {};
  // 远景（视差小）
  L.withCam(ctx, c, 0.55, () => {
    const bg = L.restaurant();
    ctx.drawImage(bg, (W - bg.width) / 2 + noise1(d * 0.05, 3) * 6, (H - bg.height) / 2);
  });
  L.withCam(ctx, c, 1, () => {
    // 吊灯（轻轻摆）
    const sw = L.pendulum ? 0 : 0;
    void sw;
    const lx = 960 + Math.sin(d * 0.9) * 4;
    ctx.strokeStyle = '#2a221b'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(960, -200); ctx.lineTo(lx, 236); ctx.stroke();
    ctx.fillStyle = '#3a2d22';
    ctx.beginPath(); ctx.moveTo(lx - 74, 290); ctx.lineTo(lx + 74, 290); ctx.lineTo(lx + 30, 236); ctx.lineTo(lx - 30, 236); ctx.closePath(); ctx.fill();
    ctx.fillStyle = 'rgba(255,214,150,0.9)'; ctx.beginPath(); ctx.ellipse(lx, 290, 70, 9, 0, 0, Math.PI * 2); ctx.fill();
    L.glow(ctx, lx, 292, 240, 'rgba(255,200,130,A)', 0.35);
    L.tableTop(ctx);
    const Wt = drawCast(ctx, d, 'back');
    drawTableItems(ctx, d, Wt);
    drawCast(ctx, d, 'front');
    L.tableApron(ctx);
  });
  // 前景：酒瓶和杯子，散焦，视差大
  L.withCam(ctx, c, 1.4, () => {
    L.blurred(ctx, 9, (x) => {
      x.fillStyle = '#1c2a22'; L.rrect(x, 150, 760, 90, 420, 20); x.fill();
      x.fillRect(178, 640, 34, 140);
      x.fillStyle = 'rgba(220,230,220,0.25)'; x.fillRect(166, 790, 10, 300);
      x.fillStyle = 'rgba(200,210,214,0.18)'; x.beginPath(); x.ellipse(1720, 860, 70, 24, 0, 0, Math.PI * 2); x.fill();
      x.fillStyle = 'rgba(200,210,214,0.2)'; x.fillRect(1652, 860, 136, 260);
      x.fillStyle = 'rgba(255,246,230,0.4)'; x.fillRect(1760, 870, 8, 200);
    }, 0.95);
  });
}

// 特写：账单夹翻开 → ¥1260 → 手指收起，手往回撤
function insertState(d) {
  const t = d - SH.insert;
  const back = smooth(prog(t, 0.88, 1.42));
  return {
    t,
    cam: { cx: 960, cy: 540, s: 1.06 - 0.12 * (1 - spring(t, 0, 2.6, 0.75)) + t * 0.02, rot: -0.02 },
    folder: { x: 1080, y: 500, sc: 1.3, rot: -0.015, open: 0.62 * spring(t, 0.08, 1.6, 0.7), amountGlow: smooth(prog(t, 0.4, 0.7)), underline: smooth(prog(t, 0.55, 0.85)) },
    handR: { x: lerp(560, 260, back), y: lerp(1000, 1260, back), rot: 0.66 + 0.1 * back, s: 1.4, curl: smooth(prog(t, 0.72, 1.0)) * 0.55, lift: back * 0.6 + smooth(prog(t, 0.75, 0.9)) * 0.25 },
    phone: { x: 1600, y: 760, rot: 0.3 },
  };
}

function draw(ctx, d) {
  if (d >= SH.insert && d < SH.medA) return drawInsert(ctx, insertState(d));
  drawWide(ctx, d);
}

// 「词」：盖住每个人的脸（在光照之后画，保持清楚）
const WORDS = [['A', '大方', 9.25, [0, -6]], ['C', '善良', 9.5, [0, 0]], ['D', '理性', 9.75, [0, 0]], ['B', '情绪稳定', 10.0, [0, -4]], ['A', '重感情', 10.25, [0, 62]]];
function drawOver(ctx, d) {
  if (d < SH.words || d >= S.end) return;
  const c = cam(d);
  const rec = smooth(prog(d, 11.1, 11.6));
  // 退场时整个场景一起往暗里沉，只留 A 的手
  if (rec > 0) {
    ctx.save();
    const [hx, hy] = L.camPt(c, 640, 640);
    const g = ctx.createRadialGradient(hx, hy, 60, hx, hy, 900);
    g.addColorStop(0, `rgba(8,6,5,${0.2 * rec})`); g.addColorStop(0.35, `rgba(8,6,5,${0.85 * rec})`); g.addColorStop(1, `rgba(8,6,5,${0.95 * rec})`);
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    ctx.restore();
  }
  for (const [who, word, t0, off] of WORDS) {
    const hp = heads[who];
    if (!hp) continue;
    const a = smooth(prog(d, t0, t0 + 0.3)) * (1 - rec);
    if (a <= 0.01) continue;
    const pop = spring(d, t0, 3.2, 0.62);
    // 后退：飞向远处、变小、变暗
    const vx = 960, vy = 400;
    const k = smooth(prog(d, 11.05 + (t0 - 9.25) * 0.08, 11.55 + (t0 - 9.25) * 0.08));
    const [sx, sy, s] = L.camPt(c, hp[0] + off[0], hp[1] + off[1]);
    const x = lerp(sx, vx, k * 0.85), y = lerp(sy, vy, k * 0.85);
    const sc = lerp(0.85 + 0.15 * pop, 0.25, k) * Math.min(1.35, s);
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(sc, sc);
    ctx.globalAlpha = a * (1 - k * 0.9);
    // 一张暗色的「面具」盖住脸
    const big = word.length > 2 ? 1.25 : 1;
    const g = ctx.createRadialGradient(0, 0, 0, 0, 0, 92 * big);
    g.addColorStop(0, 'rgba(14,11,9,0.92)'); g.addColorStop(0.65, 'rgba(14,11,9,0.8)'); g.addColorStop(1, 'rgba(14,11,9,0)');
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.ellipse(0, 0, 100 * big, 70, 0, 0, Math.PI * 2); ctx.fill();
    if (k > 0.05) ctx.filter = `blur(${(k * 6).toFixed(1)}px)`;
    ctx.font = FONT.body(word.length > 2 ? 40 : 46);
    ctx.letterSpacing = '6px';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.shadowColor = 'rgba(255,214,160,0.35)';
    ctx.shadowBlur = 16;
    ctx.fillStyle = '#efe6d3';
    ctx.fillText(word, 3, 2);
    ctx.restore();
  }
}

function light(d) {
  if (d >= SH.insert && d < SH.medA) return insertLights(insertState(d));
  const c = cam(d);
  const quiet = smooth(prog(d, 1.6, 2.0));
  const ls = [
    { x: 960, y: 560, rx: 900, ry: 470, i: 1.0, color: [255, 202, 140] },
    { x: 520, y: 520, rx: 300, ry: 340, i: 0.75 + 0.15 * quiet, color: [255, 210, 160] },
    { x: 1430, y: 530, rx: 280, ry: 320, i: 0.6, color: [255, 206, 150] },
    { x: 1665, y: 440, rx: 260, ry: 340, i: 0.45, color: [255, 180, 110], depth: 0.55 },
    { x: 270, y: 340, rx: 260, ry: 300, i: 0.3, color: [150, 170, 200], depth: 0.55 },
  ];
  // 说话的人身上多一点光
  for (const [t0, t1, x, y] of [[6.05, 7.0, 800, 470], [6.9, 7.8, 1170, 470], [7.7, 8.7, 1430, 520]]) {
    const w = smooth(prog(d, t0, t0 + 0.25)) * (1 - smooth(prog(d, t1 - 0.2, t1)));
    if (w > 0) ls.push({ x, y, rx: 220, ry: 260, i: 0.6, w, color: [255, 214, 160] });
  }
  const rec = smooth(prog(d, 11.1, 11.6));
  return L.camLights(c, ls).map((l, i) => ({ ...l, w: (l.w ?? 1) * (i === 0 ? 1 - rec * 0.5 : 1 - rec) }));
}
function grade(d) { return { warm: 0.22, ambient: d >= SH.insert && d < SH.medA ? 0.34 : 0.36 }; }

module.exports = { ...S, draw, drawOver, light, grade, cam };
