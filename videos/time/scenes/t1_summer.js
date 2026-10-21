// 第一幕 · 0–6.1 秒：童年的暑假。
//   0–3.45  窗边：8 岁的孩子跪在凳子上趴着窗台，窗外树影摇动，墙上「7 月」的日历被一天天划掉。
//           1.5 秒转头看日历，再转回窗外。第 0 帧就是完整的画面。
//   3.45–6.1 暑假碎片（各约 0.55 秒，叠化）：骑车 → 冰棍 → 晚霞 → 雨 → 午睡。
const L = require('../lib');
const { W, H, FONT, rng, noise1, lerp, clamp, prog, smooth } = L;
const { inkText } = require('../../../src/lib/material');

const S = { start: 0, end: 6.15 };

// ---------------- 窗边 ----------------
const WIN = { x0: 1010, y0: 150, x1: 1610, y1: 640 }; // 窗洞（墙上的开口）
const SILL = 652;

function foliage(ctx, t, seed, o = {}) {
  const r = rng(seed);
  const { n = 46, x0 = WIN.x0 - 60, x1 = WIN.x1 + 60, y0 = WIN.y0 - 80, y1 = WIN.y0 + 300, cols = ['#5d7044', '#6f8550', '#4c5e3a', '#7f9658'] } = o;
  for (let i = 0; i < n; i++) {
    const bx = lerp(x0, x1, r()), by = lerp(y0, y1, r() * r());
    const sw = noise1(t * 0.9 + i * 0.37, seed + i) * 14 + noise1(t * 2.3, seed) * 4;
    ctx.fillStyle = cols[i % cols.length];
    ctx.beginPath();
    ctx.ellipse(bx + sw, by + sw * 0.3, 40 + r() * 70, 30 + r() * 50, r() * 3, 0, Math.PI * 2);
    ctx.fill();
  }
}

// 窗外：亮的天、对面楼、树
function outside(ctx, t) {
  const g = ctx.createLinearGradient(0, WIN.y0, 0, WIN.y1);
  g.addColorStop(0, '#f1ead2');
  g.addColorStop(1, '#e2dfc6');
  ctx.fillStyle = g;
  ctx.fillRect(WIN.x0, WIN.y0, WIN.x1 - WIN.x0, WIN.y1 - WIN.y0);
  L.blurred(ctx, 3, (c) => {
    c.beginPath();
    c.rect(WIN.x0, WIN.y0, WIN.x1 - WIN.x0, WIN.y1 - WIN.y0);
    c.clip();
    // 对面的旧楼
    c.fillStyle = '#d9cdb0';
    c.fillRect(WIN.x0 + 260, WIN.y0 + 120, 420, 420);
    c.fillStyle = '#bfae8e';
    for (let i = 0; i < 3; i++) for (let j = 0; j < 4; j++) c.fillRect(WIN.x0 + 300 + i * 110, WIN.y0 + 160 + j * 95, 60, 48);
    foliage(c, t, 31);
    foliage(c, t * 0.8, 32, { n: 30, x0: WIN.x0 - 40, x1: WIN.x0 + 280, y0: WIN.y0 + 150, y1: WIN.y1 + 40, cols: ['#55683e', '#667c48', '#47573a'] });
  });
}

function windowFrame(ctx) {
  // 墙洞里侧的阴影（墙的厚度）
  ctx.fillStyle = 'rgba(80,66,50,0.55)';
  ctx.beginPath();
  ctx.moveTo(WIN.x0, WIN.y0); ctx.lineTo(WIN.x0 + 26, WIN.y0 + 22); ctx.lineTo(WIN.x0 + 26, WIN.y1); ctx.lineTo(WIN.x0, WIN.y1);
  ctx.fill();
  ctx.fillStyle = 'rgba(80,66,50,0.35)';
  ctx.fillRect(WIN.x0, WIN.y0, WIN.x1 - WIN.x0, 22);
  // 刷着淡绿漆的木窗框
  const col = '#9aa58e', dk = '#6f7a66';
  ctx.fillStyle = col;
  const fw = 16;
  ctx.fillRect(WIN.x0 + 26, WIN.y0 + 22, WIN.x1 - WIN.x0 - 26, fw);
  ctx.fillRect(WIN.x0 + 26, WIN.y1 - fw, WIN.x1 - WIN.x0 - 26, fw);
  ctx.fillRect(WIN.x0 + 26, WIN.y0 + 22, fw, WIN.y1 - WIN.y0 - 22);
  ctx.fillRect(WIN.x1 - fw, WIN.y0 + 22, fw, WIN.y1 - WIN.y0 - 22);
  const mx = (WIN.x0 + WIN.x1) / 2 + 13;
  ctx.fillRect(mx - 9, WIN.y0 + 22, 18, WIN.y1 - WIN.y0 - 22);
  ctx.fillRect(WIN.x0 + 26, WIN.y0 + 170, WIN.x1 - WIN.x0 - 26, 14);
  ctx.fillStyle = dk;
  ctx.fillRect(mx + 9, WIN.y0 + 22, 3, WIN.y1 - WIN.y0 - 22);
  ctx.fillRect(WIN.x0 + 26, WIN.y0 + 184, WIN.x1 - WIN.x0 - 26, 3);
  // 右扇窗开着：窗扇斜着推出去，只看到一条窄边
  ctx.fillStyle = 'rgba(190,200,180,0.18)';
  ctx.fillRect(mx + 12, WIN.y0 + 190, WIN.x1 - mx - 28, WIN.y1 - WIN.y0 - 206);
  // 窗台
  ctx.fillStyle = '#cfc2a6';
  ctx.fillRect(WIN.x0 - 24, SILL - 14, WIN.x1 - WIN.x0 + 48, 16);
  ctx.fillStyle = '#a89878';
  ctx.fillRect(WIN.x0 - 24, SILL + 2, WIN.x1 - WIN.x0 + 48, 9);
}

// 墙上的日历：「7 月」，前十几天被铅笔划掉
function calendar(ctx, t, o = {}) {
  const { x = 470, y = 300, sc = 1, crossed = 14 } = o;
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(sc, sc);
  ctx.rotate(-0.015);
  // 钉子和挂绳
  ctx.strokeStyle = 'rgba(60,50,40,0.7)';
  ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.moveTo(-40, -8); ctx.lineTo(0, -40); ctx.lineTo(40, -8); ctx.stroke();
  ctx.fillStyle = '#4a4038';
  ctx.beginPath(); ctx.arc(0, -40, 4, 0, Math.PI * 2); ctx.fill();
  // 纸
  ctx.fillStyle = 'rgba(0,0,0,0.25)';
  ctx.fillRect(-128, 4, 264, 360);
  ctx.fillStyle = '#e9e1cd';
  ctx.fillRect(-132, -6, 264, 360);
  ctx.fillStyle = '#c8bda4';
  ctx.fillRect(-132, -6, 264, 8);
  // 7 月
  inkText(ctx, '7', -96, 140, { font: FONT.serifBlack(150), color: '#8a2a20', seed: 71, wear: 0.4 });
  inkText(ctx, '月', -2, 136, { font: FONT.serif(54), color: '#3a302a', seed: 72, wear: 0.4 });
  inkText(ctx, 'JULY', 4, 72, { font: FONT.en(30), color: '#6b5e52', seed: 73, wear: 0.3 });
  // 日期格
  ctx.font = FONT.en(22);
  ctx.textAlign = 'center';
  for (let i = 0; i < 31; i++) {
    const c = (i + 2) % 7, rw = Math.floor((i + 2) / 7);
    const cx = -108 + c * 36, cy = 186 + rw * 34;
    ctx.fillStyle = c === 0 || c === 6 ? '#8a2a20' : '#3a302a';
    ctx.fillText(String(i + 1), cx, cy);
    if (i < crossed) {
      ctx.strokeStyle = 'rgba(50,44,40,0.7)';
      ctx.lineWidth = 1.6;
      const r = rng(900 + i);
      ctx.beginPath();
      ctx.moveTo(cx - 11 + r() * 2, cy - 18); ctx.lineTo(cx + 11, cy + 4 - r() * 2);
      ctx.moveTo(cx + 10, cy - 18 + r() * 2); ctx.lineTo(cx - 11, cy + 4);
      ctx.stroke();
    }
  }
  ctx.textAlign = 'left';
  ctx.restore();
}

// 孩子：跪在凳子上，手肘撑着窗台，双手托着下巴看窗外
function child(ctx, t) {
  // 1.5 秒转头看日历（朝镜头左侧），2.7 秒转回去
  const turn = smooth(prog(t, 1.45, 1.9)) * (1 - smooth(prog(t, 2.55, 3.05)));
  const breathe = Math.sin(t * 2.6) * 0.01;
  const h = 560;
  const hip = [1176, 694];
  const yaw = lerp(1, -0.3, turn);
  const rel = (x, y) => [x - hip[0], y - hip[1]];
  L.lit(ctx, (c) => {
    // 凳子
    c.fillStyle = '#5a4432';
    c.fillRect(1030, hip[1] + 122, 220, 20);
    c.fillStyle = '#4a372a';
    c.fillRect(1044, hip[1] + 142, 18, 1040 - hip[1] - 142);
    c.fillRect(1216, hip[1] + 142, 18, 1040 - hip[1] - 142);
    c.translate(hip[0], hip[1]);
    L.side(c, {
      h, kind: 'child', f: 1, yaw,
      pose: {
        torso: 0.55 + breathe, neck: 0.12 - turn * 0.25, head: -0.32 + turn * 0.2,
        reachN: rel(1322, 572 + turn * 6), handN: Math.PI * 0.92,
        reachF: rel(1308, 576), handF: Math.PI * 0.9,
        ankleN: rel(1056, hip[1] + 116), footN: -1.5,
        ankleF: rel(1046, hip[1] + 112), footF: -1.5,
      },
    });
  }, { light: -0.25, rim: [255, 226, 170], rimA: 0.9, rimW: 3.5, shadow: 0.6, ambient: 0.92, bbox: [1000, 400, 400, 640] });
}

// 窗光投在左墙上：一块斜的亮斑，里面有树影在动
function wallLight(ctx, t) {
  // 柔边的斜光斑：用模糊过的多边形，边缘是渐变的
  L.blurred(ctx, 26, (c) => {
    c.fillStyle = 'rgba(255,222,165,0.55)';
    c.beginPath();
    c.moveTo(170, 260); c.lineTo(700, 205); c.lineTo(740, 630); c.lineTo(230, 740);
    c.closePath();
    c.fill();
    // 树影：淡、软、慢
    c.globalCompositeOperation = 'destination-out';
    const r = rng(77);
    for (let i = 0; i < 18; i++) {
      const bx = 200 + r() * 520, by = 240 + r() * 460;
      const sw = noise1(t * 0.7 + i * 0.37, 31 + i) * 18;
      c.fillStyle = 'rgba(0,0,0,0.45)';
      c.beginPath();
      c.ellipse(bx + sw, by + sw * 0.4, 24 + r() * 36, 14 + r() * 22, r() * 3, 0, Math.PI * 2);
      c.fill();
    }
  });
}

function drawWindow(ctx, t) {
  const cam = { cx: 960 + t * 6, cy: 540 - t * 2, s: 1.0 + t * 0.012 };
  L.withCam(ctx, cam, 1, () => {
    ctx.drawImage(L.wallTex(W, H, [196, 182, 156], 501), 0, 0);
    // 墙裙
    ctx.fillStyle = '#7d8a74';
    ctx.fillRect(0, 880, W, 200);
    ctx.fillStyle = 'rgba(40,36,30,0.4)';
    ctx.fillRect(0, 876, W, 5);
    // 地面
    ctx.fillStyle = '#5c4a3a';
    ctx.fillRect(0, 1040, W, 40);
    wallLight(ctx, t);
    calendar(ctx, t);
    outside(ctx, t);
    windowFrame(ctx);
    // 窗帘：薄棉布，被风轻轻吹动
    const sw = noise1(t * 0.8, 61) * 18 + Math.sin(t * 1.3) * 8;
    ctx.fillStyle = 'rgba(232,224,204,0.72)';
    ctx.beginPath();
    ctx.moveTo(WIN.x0 - 70, WIN.y0 - 30);
    ctx.lineTo(WIN.x0 + 90, WIN.y0 - 30);
    ctx.bezierCurveTo(WIN.x0 + 110 + sw, WIN.y0 + 200, WIN.x0 + 60 - sw, WIN.y0 + 420, WIN.x0 + 70 + sw * 1.4, WIN.y1 + 120);
    ctx.lineTo(WIN.x0 - 70, WIN.y1 + 140);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = 'rgba(160,150,130,0.35)';
    for (let i = 0; i < 4; i++) {
      ctx.fillRect(WIN.x0 - 50 + i * 32 + sw * 0.3 * i / 3, WIN.y0 - 30, 6, WIN.y1 - WIN.y0 + 160);
    }
    ctx.fillStyle = '#6a5a48';
    ctx.fillRect(WIN.x0 - 110, WIN.y0 - 40, WIN.x1 - WIN.x0 + 220, 8);
    child(ctx, t);
  });
}

// ---------------- 暑假碎片 ----------------

// 1 骑车穿过树荫（侧面跟拍）
function shotBike(ctx, lt) {
  const off = -lt * 700;
  ctx.fillStyle = '#d6c6a4';
  ctx.fillRect(0, 0, W, H);
  // 院墙 + 楼
  for (let k = -1; k < 4; k++) {
    const bx = ((k * 760 + off * 0.6) % 3040 + 3040) % 3040 - 760;
    ctx.fillStyle = '#cbb894';
    ctx.fillRect(bx, 80, 640, 560);
    ctx.fillStyle = '#9e8a6a';
    for (let i = 0; i < 4; i++) for (let j = 0; j < 3; j++) ctx.fillRect(bx + 50 + i * 150, 140 + j * 150, 80, 90);
  }
  ctx.fillStyle = '#b7a684';
  ctx.fillRect(0, 600, W, 120);
  // 路
  ctx.fillStyle = '#8f8270';
  ctx.fillRect(0, 720, W, 360);
  // 树影：在路面和墙上缓缓掠过
  ctx.save();
  ctx.globalCompositeOperation = 'multiply';
  ctx.filter = 'blur(8px)';
  const r = rng(301);
  for (let i = 0; i < 40; i++) {
    const bx = ((r() * 2600 + off * 1.0) % 2600 + 2600) % 2600 - 300;
    ctx.fillStyle = 'rgba(120,104,84,0.38)';
    ctx.beginPath();
    ctx.ellipse(bx, 300 + r() * 760, 60 + r() * 120, 30 + r() * 60, r(), 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
  // 前景的树干（失焦，快速掠过）
  L.blurred(ctx, 6, (c) => {
    const tx = ((off * 1.8 + 2200) % 2600 + 2600) % 2600 - 300;
    c.fillStyle = '#3d3326';
    c.fillRect(tx, 0, 70, H);
  });
  // 自行车 + 孩子
  const bx = 880 + Math.sin(lt * 3) * 6, by = 900;
  const wr = 92;
  const crank = lt * 9;
  ctx.save();
  ctx.translate(bx, by);
  ctx.strokeStyle = '#2a2a2c';
  ctx.lineWidth = 6;
  for (const wx of [-150, 150]) {
    ctx.beginPath(); ctx.arc(wx, 0, wr, 0, Math.PI * 2); ctx.stroke();
    ctx.lineWidth = 1.2;
    for (let k = 0; k < 12; k++) {
      const a = k * Math.PI / 6 + crank * 1.6;
      ctx.beginPath(); ctx.moveTo(wx, 0); ctx.lineTo(wx + Math.cos(a) * wr, Math.sin(a) * wr); ctx.stroke();
    }
    ctx.lineWidth = 6;
  }
  ctx.strokeStyle = '#7a2c24';
  ctx.lineWidth = 7;
  ctx.beginPath();
  ctx.moveTo(-150, 0); ctx.lineTo(-30, -10); ctx.lineTo(-60, -130); ctx.lineTo(110, -120); ctx.lineTo(-30, -10);
  ctx.moveTo(110, -120); ctx.lineTo(150, 0);
  ctx.moveTo(110, -120); ctx.lineTo(96, -190); ctx.lineTo(60, -196);
  ctx.moveTo(-60, -130); ctx.lineTo(-70, -165);
  ctx.stroke();
  ctx.fillStyle = '#222';
  ctx.fillRect(-100, -172, 64, 12);
  ctx.restore();
  const hip = [bx - 70, by - 190];
  const pr = 34;
  const pN = [bx - 30 + Math.cos(crank) * pr, by - 10 + Math.sin(crank) * pr];
  const pF = [bx - 30 - Math.cos(crank) * pr, by - 10 - Math.sin(crank) * pr];
  L.lit(ctx, (c) => {
    c.translate(hip[0], hip[1]);
    const rel = (p) => [p[0] - hip[0], p[1] - hip[1]];
    L.side(c, { h: 520, kind: 'child', f: 1, yaw: 1, pose: {
      torso: 0.42, neck: -0.1, head: -0.1,
      reachN: rel([bx + 56, by - 196]), reachF: rel([bx + 50, by - 200]), handN: 1.6, handF: 1.6,
      ankleN: rel(pN), ankleF: rel(pF), footN: 1.7, footF: 1.7,
    } });
  }, { light: -1.0, rim: [255, 230, 180], rimA: 0.8, shadow: 0.5, bbox: [700, 380, 500, 520] });
}

// 2 冰棍（手部特写，逆光）
function shotIce(ctx, lt) {
  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, '#efe4c4');
  g.addColorStop(1, '#d9caa0');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
  L.blurred(ctx, 14, (c) => foliage(c, lt + 3, 41, { n: 40, x0: -100, x1: 2000, y0: -100, y1: 500 }));
  const x = 1060 + lt * 20, y = 470 - lt * 10;
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(-0.08);
  // 冰棍
  ctx.fillStyle = '#d7c49a';
  ctx.fillRect(-12, 120, 24, 220);
  ctx.fillStyle = '#7fa07a';
  ctx.beginPath();
  ctx.roundRect(-82, -170, 164, 300, 40);
  ctx.fill();
  ctx.fillStyle = 'rgba(255,255,240,0.35)';
  ctx.fillRect(-60, -150, 18, 250);
  // 化开的一滴
  const k = (lt * 1.8) % 1;
  ctx.fillStyle = '#8fb08a';
  ctx.beginPath();
  ctx.ellipse(40, 132 + k * k * 260, 9, 13, 0, 0, Math.PI * 2);
  ctx.fill();
  // 手：握着木棍
  ctx.fillStyle = '#c99a76';
  ctx.beginPath();
  ctx.roundRect(-70, 220, 140, 110, 36);
  ctx.fill();
  ctx.fillRect(-60, 300, 110, 300);
  ctx.strokeStyle = 'rgba(110,70,50,0.45)';
  ctx.lineWidth = 3;
  for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.moveTo(10, 250 + i * 26); ctx.lineTo(68, 252 + i * 26); ctx.stroke(); }
  ctx.fillStyle = '#d4a885';
  ctx.beginPath();
  ctx.ellipse(-48, 240, 26, 34, -0.4, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

// 3 屋顶上看晚霞的背影
function shotDusk(ctx, lt) {
  const g = ctx.createLinearGradient(0, 0, 0, 760);
  g.addColorStop(0, '#4a4a66');
  g.addColorStop(0.45, '#b07a68');
  g.addColorStop(0.8, '#e7a868');
  g.addColorStop(1, '#f2cf90');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
  // 远处的楼顶剪影
  const r = rng(51);
  ctx.fillStyle = '#3a2c30';
  let x = -40;
  while (x < W + 40) {
    const w = 120 + r() * 240, h = 80 + r() * 200;
    ctx.fillRect(x, 760 - h, w, h + 400);
    if (r() < 0.4) { ctx.fillRect(x + w * 0.3, 760 - h - 50, 40, 50); }
    x += w - 10;
  }
  // 电线
  ctx.strokeStyle = 'rgba(40,30,34,0.8)';
  ctx.lineWidth = 2;
  for (let i = 0; i < 3; i++) {
    ctx.beginPath();
    ctx.moveTo(-20, 220 + i * 30);
    ctx.quadraticCurveTo(960, 330 + i * 34 + Math.sin(lt * 2 + i) * 3, 1940, 200 + i * 28);
    ctx.stroke();
  }
  // 近处的屋顶边 + 坐着的孩子（侧影）
  ctx.fillStyle = '#2b2124';
  ctx.fillRect(0, 760, W, 108);
  ctx.fillStyle = '#1c1517';
  ctx.fillRect(0, 868, W, 212);
  ctx.fillStyle = 'rgba(240,170,110,0.35)';
  ctx.fillRect(0, 864, W, 4);
  L.lit(ctx, (c) => {
    c.translate(760, 868);
    L.side(c, { h: 600, kind: 'child', f: 1, yaw: 1, pose: { torso: 0.18, neck: 0.05, head: -0.2, thighN: 1.45, shinN: 0.15, thighF: 1.4, shinF: 0.3, uArmN: 0.5, fArmN: 1.3, uArmF: 0.4, fArmF: 1.2 } });
  }, { light: -0.3, rim: [255, 190, 120], rimA: 0.95, rimW: 3, ambient: 0.35, shadow: 0.3, bbox: [640, 480, 360, 520] });
}

// 4 手掌贴在下雨的玻璃上
function shotRain(ctx, lt) {
  L.blurred(ctx, 16, (c) => {
    const g = c.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, '#b9bdb2');
    g.addColorStop(1, '#6f7d66');
    c.fillStyle = g;
    c.fillRect(0, 0, W, H);
    foliage(c, lt, 61, { n: 50, x0: -100, x1: 2000, y0: 300, y1: 1100, cols: ['#4e6040', '#5a6e48', '#3f4e36'] });
  });
  // 雨丝
  const r = rng(71);
  ctx.strokeStyle = 'rgba(230,236,230,0.35)';
  ctx.lineWidth = 1.5;
  for (let i = 0; i < 120; i++) {
    const x = r() * W, sp = 1800 + r() * 900;
    const y = ((r() * H + lt * sp) % (H + 200)) - 100;
    ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x - 8, y + 50); ctx.stroke();
  }
  // 玻璃上的水珠
  for (let i = 0; i < 90; i++) {
    const x = r() * W, y = r() * H + (r() < 0.15 ? lt * 120 : 0), s = 3 + r() * 9;
    ctx.fillStyle = 'rgba(40,50,44,0.25)';
    ctx.beginPath(); ctx.ellipse(x, y + 1, s, s * 1.1, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = 'rgba(240,244,236,0.5)';
    ctx.beginPath(); ctx.arc(x - s * 0.3, y - s * 0.3, s * 0.3, 0, Math.PI * 2); ctx.fill();
  }
  // 小手（从屋里贴在玻璃上，逆光，偏暗）
  ctx.save();
  ctx.translate(820, 640);
  ctx.rotate(-0.12);
  ctx.fillStyle = '#7c5c48';
  ctx.beginPath(); ctx.ellipse(0, 0, 92, 108, 0, 0, Math.PI * 2); ctx.fill();
  const fingers = [[-80, -60, -0.55, 70], [-40, -110, -0.2, 110], [5, -122, 0, 124], [48, -112, 0.18, 112], [85, -76, 0.4, 88]];
  for (const [fx, fy, a, len] of fingers) {
    ctx.save(); ctx.translate(fx, fy); ctx.rotate(a);
    ctx.beginPath(); ctx.roundRect(-17, -len, 34, len + 30, 17); ctx.fill();
    ctx.restore();
  }
  ctx.fillRect(-70, 60, 140, 400);
  ctx.restore();
}

// 5 竹席上睡午觉（俯拍），电扇转头，百叶窗的光条慢慢移动
function shotNap(ctx, lt) {
  ctx.fillStyle = '#c4a46c';
  ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = 'rgba(120,90,50,0.35)';
  for (let y = 0; y < H; y += 26) ctx.fillRect(0, y, W, 3);
  ctx.fillStyle = 'rgba(255,240,200,0.12)';
  for (let y = 10; y < H; y += 26) ctx.fillRect(0, y, W, 6);
  // 枕巾
  ctx.fillStyle = '#d8d0bd';
  ctx.beginPath(); ctx.roundRect(330, 410, 280, 220, 34); ctx.fill();
  // 侧卧的孩子：身体横过来
  L.lit(ctx, (c) => {
    c.translate(930, 560);
    c.rotate(-Math.PI / 2);
    L.side(c, { h: 660, kind: 'child', f: -1, yaw: 0.8, pose: {
      torso: 0.12 + Math.sin(lt * 2) * 0.01, neck: 0.15, head: 0.2,
      thighN: 0.7, shinN: -0.15, thighF: 0.45, shinF: -0.35, footN: 0.8, footF: 0.6,
      uArmN: 1.5, fArmN: 2.75, uArmF: 0.9, fArmF: 1.9,
    } });
  }, { light: -2.4, rim: [255, 230, 180], rimA: 0.5, shadow: 0.4, bbox: [300, 320, 1100, 500] });
  // 电扇（俯视）
  ctx.save();
  ctx.translate(1650, 230);
  ctx.fillStyle = '#d9d4c6';
  ctx.beginPath(); ctx.arc(0, 0, 150, 0, Math.PI * 2); ctx.fill();
  ctx.save();
  ctx.rotate(lt * 30);
  ctx.fillStyle = 'rgba(150,170,170,0.45)';
  ctx.filter = 'blur(6px)';
  for (let i = 0; i < 3; i++) { ctx.rotate(Math.PI * 2 / 3); ctx.beginPath(); ctx.ellipse(0, -70, 40, 70, 0, 0, Math.PI * 2); ctx.fill(); }
  ctx.restore();
  ctx.strokeStyle = 'rgba(90,90,86,0.6)';
  ctx.lineWidth = 2;
  for (let i = 1; i < 5; i++) { ctx.beginPath(); ctx.arc(0, 0, i * 36, 0, Math.PI * 2); ctx.stroke(); }
  ctx.restore();
  // 百叶窗的光条
  ctx.save();
  ctx.globalCompositeOperation = 'screen';
  ctx.filter = 'blur(12px)';
  ctx.fillStyle = 'rgba(255,220,160,0.28)';
  for (let i = 0; i < 6; i++) {
    ctx.save();
    ctx.translate(200 + i * 90 + lt * 40, 0);
    ctx.rotate(0.35);
    ctx.fillRect(0, -200, 40, 1600);
    ctx.restore();
  }
  ctx.restore();
}

const MIX = 0.12;
const M0 = 3.45, MD = 0.53;
const montage = [shotBike, shotIce, shotDusk, shotRain, shotNap];

const seq = L.sequence([
  { at: 0, draw: (ctx, lt) => drawWindow(ctx, lt) },
  ...montage.map((fn, i) => ({ at: M0 + i * MD, draw: (ctx, lt) => fn(ctx, lt + MIX) })),
], MIX);

function draw(ctx, d) { seq.draw(ctx, d); }

function light(d) {
  if (d < M0) return [
    { x: 1300, y: 420, rx: 820, ry: 620, i: 1, core: 0.3 },
    { x: 460, y: 470, rx: 560, ry: 460, i: 0.8 },
  ];
  return [{ x: 960, y: 540, rx: 1300, ry: 900, i: 1, core: 0.4 }];
}
function grade(d) { return { warm: 0.45, ambient: d < M0 ? 0.42 : 0.55 }; }

module.exports = { ...S, draw, light, grade, calendar, M_END: M0 + montage.length * MD };
