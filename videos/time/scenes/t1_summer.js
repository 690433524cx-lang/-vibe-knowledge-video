// 第一幕 · 0–5.9 秒：记忆里的夏天。
//   0–1.5   窗边：孩子坐在窗下的书桌前，手托着下巴；转头看墙上「7 月」的日历，腿在桌下晃。
//           阳光穿过被风吹起的纱帘，光柱里有灰尘，墙上的树影在动。
//   1.5–3.0 三个暑假记忆一闪而过：冰棍 → 窗上的雨 → 屋顶的晚霞
//   3.0–5.9 四个生活碎片（各约 0.7 秒）：凉席和电风扇 → 阳台上晾的衣服 → 傍晚骑车回家 → 雷阵雨后的水洼
const L = require('../lib');
const { W, H, FONT, rng, noise1, lerp, clamp, prog, smooth } = L;
const { inkText } = require('../../../src/lib/material');

// ---------------- 窗边 ----------------
const WIN = { x0: 1080, y0: 110, x1: 1640, y1: 600 };
const DESK = 640; // 桌面高度

function foliage(ctx, t, seed, o = {}) {
  const r = rng(seed);
  const { n = 46, x0 = WIN.x0 - 60, x1 = WIN.x1 + 60, y0 = WIN.y0 - 80, y1 = WIN.y0 + 300, cols = ['#4f6238', '#5f7444', '#3f4f30', '#6c8248'], sx = 1, amp = 14 } = o;
  for (let i = 0; i < n; i++) {
    const bx = lerp(x0, x1, r()), by = lerp(y0, y1, r() * r());
    const sw = noise1(t * 0.9 + i * 0.37, seed + i) * amp + noise1(t * 2.3, seed) * amp * 0.3;
    ctx.fillStyle = cols[i % cols.length];
    ctx.beginPath();
    ctx.ellipse(bx + sw, by + sw * 0.3, (40 + r() * 70) * sx, (30 + r() * 50) * sx, r() * 3, 0, Math.PI * 2);
    ctx.fill();
  }
}

// 墙：暖灰的旧石灰墙，靠窗一侧被照亮，越往左越沉
function wall(ctx) {
  const g = ctx.createLinearGradient(0, 0, W, 0);
  g.addColorStop(0, '#4a3b30');
  g.addColorStop(0.45, '#7a634f');
  g.addColorStop(1, '#8e7660');
  ctx.fillStyle = g;
  ctx.fillRect(-100, -100, W + 200, H + 200);
  ctx.save();
  ctx.globalCompositeOperation = 'multiply';
  ctx.globalAlpha = 0.55;
  ctx.drawImage(L.wallTex(W, H, [210, 196, 176], 502, { cells: 9 }), 0, 0);
  ctx.restore();
  const v = ctx.createLinearGradient(0, 0, 0, H);
  v.addColorStop(0, 'rgba(30,22,16,0.35)');
  v.addColorStop(0.3, 'rgba(30,22,16,0)');
  v.addColorStop(0.8, 'rgba(30,22,16,0)');
  v.addColorStop(1, 'rgba(30,22,16,0.4)');
  ctx.fillStyle = v;
  ctx.fillRect(-100, -100, W + 200, H + 200);
  // 墙裙、踢脚线、木地板
  ctx.fillStyle = '#4c5446';
  ctx.fillRect(-100, 820, W + 200, 160);
  ctx.fillStyle = 'rgba(255,230,190,0.08)';
  ctx.fillRect(-100, 820, W + 200, 4);
  ctx.fillStyle = '#2e2620';
  ctx.fillRect(-100, 980, W + 200, 14);
  ctx.fillStyle = '#3e2f24';
  ctx.fillRect(-100, 994, W + 200, 200);
}

// 窗光投在墙上：窗格的形状 + 晃动的树影
function sunPatch(ctx, t) {
  L.blurred(ctx, 14, (c) => {
    c.fillStyle = 'rgba(255,206,140,0.42)';
    for (const [ox, oy] of [[0, 0], [250, -18]]) {
      c.beginPath();
      c.moveTo(170 + ox, 300 + oy); c.lineTo(400 + ox, 282 + oy); c.lineTo(430 + ox, 720 + oy); c.lineTo(200 + ox, 760 + oy);
      c.closePath();
      c.fill();
    }
    c.globalCompositeOperation = 'destination-out';
    const r = rng(77);
    for (let i = 0; i < 46; i++) {
      const bx = 160 + r() * 560, by = 260 + r() * 520;
      const sw = noise1(t * 1.1 + i * 0.37, 31 + i) * 16;
      c.fillStyle = `rgba(0,0,0,${0.35 + r() * 0.4})`;
      c.beginPath();
      c.ellipse(bx + sw, by + sw * 0.4, 10 + r() * 26, 7 + r() * 16, r() * 3, 0, Math.PI * 2);
      c.fill();
    }
  });
}

// 光柱：从窗口斜着落向左下
const BEAM = [[WIN.x0, WIN.y0 + 60], [WIN.x0 + 260, WIN.y0 + 40], [700, 1000], [180, 820]];
function inBeam(x, y) {
  const ax = WIN.x0 + 130, ay = WIN.y0 + 50, bx = 440, by = 910;
  const dx = bx - ax, dy = by - ay, L2 = dx * dx + dy * dy;
  const k = clamp(((x - ax) * dx + (y - ay) * dy) / L2);
  const px = ax + dx * k, py = ay + dy * k;
  const d = Math.hypot(x - px, y - py);
  return clamp(1 - d / (140 + k * 160)) * (0.4 + 0.6 * k);
}
function beams(ctx, t) {
  L.blurred(ctx, 22, (c) => {
    c.globalCompositeOperation = 'lighter';
    const g = c.createLinearGradient(WIN.x0, WIN.y0, 300, 950);
    g.addColorStop(0, 'rgba(255,214,150,0.30)');
    g.addColorStop(1, 'rgba(255,214,150,0.02)');
    c.fillStyle = g;
    c.beginPath();
    c.moveTo(...BEAM[0]); c.lineTo(...BEAM[1]); c.lineTo(...BEAM[2]); c.lineTo(...BEAM[3]);
    c.closePath();
    c.fill();
    // 光柱被树叶切开的几道暗缝
    c.globalCompositeOperation = 'destination-out';
    for (let i = 0; i < 5; i++) {
      const s = noise1(t * 0.6 + i, 90 + i) * 30;
      c.fillStyle = 'rgba(0,0,0,0.5)';
      c.beginPath();
      c.moveTo(WIN.x0 + 40 + i * 50 + s, WIN.y0 + 50);
      c.lineTo(WIN.x0 + 52 + i * 50 + s, WIN.y0 + 50);
      c.lineTo(260 + i * 90 + s * 3, 980);
      c.lineTo(230 + i * 90 + s * 3, 980);
      c.fill();
    }
  });
}

function outside(ctx, t) {
  L.blurred(ctx, 4, (c) => {
    c.beginPath();
    c.rect(WIN.x0, WIN.y0, WIN.x1 - WIN.x0, WIN.y1 - WIN.y0);
    c.clip();
    const g = c.createLinearGradient(0, WIN.y0, 0, WIN.y1);
    g.addColorStop(0, '#fff3d8');
    g.addColorStop(1, '#f0dcb4');
    c.fillStyle = g;
    c.fillRect(WIN.x0, WIN.y0, WIN.x1 - WIN.x0, WIN.y1 - WIN.y0);
    c.fillStyle = '#d9c39c';
    c.fillRect(WIN.x0 + 280, WIN.y0 + 140, 400, 400);
    c.fillStyle = '#b89f78';
    for (let i = 0; i < 3; i++) for (let j = 0; j < 4; j++) c.fillRect(WIN.x0 + 316 + i * 104, WIN.y0 + 176 + j * 92, 56, 46);
    foliage(c, t, 31);
    foliage(c, t * 0.8, 32, { n: 30, x0: WIN.x0 - 40, x1: WIN.x0 + 260, y0: WIN.y0 + 140, y1: WIN.y1 + 40 });
  });
}

function windowFrame(ctx) {
  // 墙的厚度：窗洞左侧和上沿的阴影面
  ctx.fillStyle = '#5c4a3c';
  ctx.beginPath();
  ctx.moveTo(WIN.x0 - 26, WIN.y0 - 20); ctx.lineTo(WIN.x0, WIN.y0); ctx.lineTo(WIN.x0, WIN.y1); ctx.lineTo(WIN.x0 - 26, WIN.y1 + 14);
  ctx.fill();
  ctx.fillStyle = '#6a5646';
  ctx.beginPath();
  ctx.moveTo(WIN.x0 - 26, WIN.y0 - 20); ctx.lineTo(WIN.x1 + 20, WIN.y0 - 20); ctx.lineTo(WIN.x1, WIN.y0); ctx.lineTo(WIN.x0, WIN.y0);
  ctx.fill();
  const col = '#8a937c', dk = '#5d6655';
  ctx.fillStyle = col;
  const fw = 14;
  ctx.fillRect(WIN.x0, WIN.y0, WIN.x1 - WIN.x0, fw);
  ctx.fillRect(WIN.x0, WIN.y1 - fw, WIN.x1 - WIN.x0, fw);
  ctx.fillRect(WIN.x0, WIN.y0, fw, WIN.y1 - WIN.y0);
  ctx.fillRect(WIN.x1 - fw, WIN.y0, fw, WIN.y1 - WIN.y0);
  const mx = (WIN.x0 + WIN.x1) / 2;
  ctx.fillRect(mx - 8, WIN.y0, 16, WIN.y1 - WIN.y0);
  ctx.fillRect(WIN.x0, WIN.y0 + 150, WIN.x1 - WIN.x0, 12);
  ctx.fillStyle = dk;
  ctx.fillRect(mx + 8, WIN.y0, 3, WIN.y1 - WIN.y0);
  ctx.fillRect(WIN.x0, WIN.y0 + 162, WIN.x1 - WIN.x0, 3);
  ctx.fillStyle = '#9c8b72';
  ctx.fillRect(WIN.x0 - 30, WIN.y1, WIN.x1 - WIN.x0 + 50, 14);
}

// 被风吹起的纱帘：透光、有褶皱
function curtain(ctx, t) {
  const gust = 0.5 + 0.5 * Math.sin(t * 1.7 + 0.6) * (0.6 + 0.4 * noise1(t * 0.9, 63));
  const top = WIN.y0 - 40;
  ctx.save();
  ctx.translate(WIN.x1 + 40, 0);
  ctx.scale(-1, 1);
  ctx.translate(-(WIN.x0 - 40), 0);
  for (let k = 0; k < 4; k++) {
    const x0 = WIN.x0 - 90 + k * 46;
    const blow = (40 + k * 30) * gust + noise1(t * 1.2 + k, 70 + k) * 14;
    ctx.fillStyle = `rgba(248,232,206,${0.22 + 0.04 * k})`;
    ctx.beginPath();
    ctx.moveTo(x0, top);
    ctx.lineTo(x0 + 70, top);
    ctx.bezierCurveTo(x0 + 80 + blow * 0.3, top + 200, x0 + 80 + blow, top + 400, x0 + 70 + blow * 1.25, WIN.y1 + 150);
    ctx.lineTo(x0 + blow * 1.1, WIN.y1 + 170);
    ctx.bezierCurveTo(x0 + blow * 0.8, top + 400, x0 - 6 + blow * 0.2, top + 200, x0, top);
    ctx.fill();
  }
  ctx.strokeStyle = 'rgba(255,240,215,0.35)';
  ctx.lineWidth = 2;
  for (let k = 0; k < 6; k++) {
    const x0 = WIN.x0 - 70 + k * 30, blow = (50 + k * 20) * gust;
    ctx.beginPath();
    ctx.moveTo(x0, top);
    ctx.bezierCurveTo(x0 + blow * 0.3, top + 220, x0 + blow * 0.9, top + 420, x0 + blow * 1.2, WIN.y1 + 150);
    ctx.stroke();
  }
  ctx.restore();
  ctx.fillStyle = '#4a3b30';
  ctx.fillRect(WIN.x0 - 140, top - 10, WIN.x1 - WIN.x0 + 260, 8);
}

// 墙上的日历：「7 月」，前十几天被铅笔划掉
function calendar(ctx, t, o = {}) {
  const { x = 470, y = 300, sc = 1, crossed = 14 } = o;
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(sc, sc);
  ctx.rotate(-0.015 + Math.sin(t * 1.7) * 0.004);
  ctx.strokeStyle = 'rgba(40,32,26,0.7)';
  ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.moveTo(-40, -8); ctx.lineTo(0, -40); ctx.lineTo(40, -8); ctx.stroke();
  ctx.fillStyle = '#3a3028';
  ctx.beginPath(); ctx.arc(0, -40, 4, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = 'rgba(0,0,0,0.3)';
  ctx.fillRect(-124, 6, 264, 360);
  ctx.fillStyle = '#ddd2ba';
  ctx.fillRect(-132, -6, 264, 360);
  const g = ctx.createLinearGradient(-132, 0, 132, 0);
  g.addColorStop(0, 'rgba(60,40,24,0.18)');
  g.addColorStop(1, 'rgba(255,240,210,0.1)');
  ctx.fillStyle = g;
  ctx.fillRect(-132, -6, 264, 360);
  ctx.fillStyle = '#b8a98c';
  ctx.fillRect(-132, -6, 264, 8);
  inkText(ctx, '7', -96, 140, { font: FONT.serifBlack(150), color: '#8a2a20', seed: 71, wear: 0.5 });
  inkText(ctx, '月', -2, 136, { font: FONT.serif(54), color: '#3a302a', seed: 72, wear: 0.4 });
  inkText(ctx, 'JULY', 4, 72, { font: FONT.en(30), color: '#6b5e52', seed: 73, wear: 0.3 });
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

// 书桌（侧面）+ 桌上的东西
function desk(ctx) {
  ctx.fillStyle = '#3a2a1e';
  ctx.fillRect(1170, DESK + 20, 22, 380);
  ctx.fillRect(1610, DESK + 20, 22, 380);
  ctx.fillStyle = '#5e4230';
  ctx.fillRect(1120, DESK, 560, 24);
  ctx.fillStyle = 'rgba(255,220,170,0.35)';
  ctx.fillRect(1120, DESK, 560, 3);
  ctx.fillStyle = '#4a3426';
  ctx.fillRect(1192, DESK + 24, 418, 90);
  // 一杯水：玻璃反光
  ctx.fillStyle = 'rgba(220,230,220,0.18)';
  ctx.fillRect(1490, DESK - 92, 54, 92);
  ctx.fillStyle = 'rgba(255,245,220,0.55)';
  ctx.fillRect(1496, DESK - 88, 6, 80);
  ctx.fillStyle = 'rgba(200,215,200,0.25)';
  ctx.fillRect(1490, DESK - 50, 54, 50);
  // 摊开的作业本
  ctx.fillStyle = '#d9cfb8';
  ctx.beginPath(); ctx.moveTo(1330, DESK); ctx.lineTo(1470, DESK - 6); ctx.lineTo(1478, DESK); ctx.closePath(); ctx.fill();
}

// 孩子：坐在书桌前，一只手托着下巴，另一只胳膊搭在桌上；腿在桌下晃
function child(ctx, t) {
  const look = smooth(prog(t, 0.25, 0.6)) * (1 - smooth(prog(t, 1.05, 1.4))); // 转头看日历
  const swingN = Math.sin(t * 4.2) * 0.32, swingF = Math.sin(t * 4.2 + 2.2) * 0.3;
  const hip = [1110, 792];
  const rel = (x, y) => [x - hip[0], y - hip[1]];
  L.lit(ctx, (c) => {
    // 椅子
    c.fillStyle = '#4a3324';
    c.fillRect(980, hip[1] + 4, 170, 16);
    c.fillRect(992, hip[1] + 20, 14, 980 - hip[1] - 20);
    c.fillRect(1124, hip[1] + 20, 14, 980 - hip[1] - 20);
    c.fillRect(986, hip[1] - 230, 14, 240);
    c.translate(hip[0], hip[1]);
    L.side(c, {
      h: 600, kind: 'child', f: 1, yaw: lerp(1, -0.35, look),
      pose: {
        torso: 0.5 + Math.sin(t * 2.4) * 0.012, neck: 0.15 - look * 0.25, head: -0.3 + look * 0.15,
        reachN: rel(1228, 612), handN: Math.PI * 0.85,
        reachF: rel(1290, DESK - 12), handF: Math.PI / 2,
        thighN: 1.5, shinN: 0.25 + swingN, thighF: 1.45, shinF: 0.2 + swingF, footN: 1.6 + swingN * 0.5, footF: 1.6 + swingF * 0.5,
      },
    });
  }, { light: -0.35, rim: [255, 214, 160], rimA: 0.95, rimW: 4, shadow: 0.55, ambient: 0.95, bbox: [960, 380, 420, 620] });
}

function drawWindow(ctx, t) {
  const cam = { cx: 940 + t * 14, cy: 540 + t * 4, s: 1.03 + t * 0.02 };
  L.withCam(ctx, cam, 1, () => {
    wall(ctx);
    sunPatch(ctx, t);
    calendar(ctx, t);
    outside(ctx, t);
    windowFrame(ctx);
    desk(ctx);
    child(ctx, t);
    curtain(ctx, t);
    beams(ctx, t);
    L.dust(ctx, t, { n: 140, seed: 8, x0: 150, y0: 120, x1: 1400, y1: 1000, inBeam, size: 1.2 });
  });
  // 前景：门框（失焦）
  L.blurred(ctx, 14, (c) => {
    c.fillStyle = '#1e1712';
    c.fillRect(-20, -20, 120, H + 40);
  });
}

// ---------------- 暑假记忆 ----------------

// 冰棍：逆光的手部特写，阳光从树叶缝里刺过来
function shotIce(ctx, lt) {
  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, '#e8cf9c');
  g.addColorStop(1, '#a08860');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
  L.blurred(ctx, 18, (c) => foliage(c, lt + 3, 41, { n: 40, x0: -100, x1: 2000, y0: -150, y1: 520, cols: ['#3e4a2a', '#4c5a32', '#56653a'] }));
  const sx = 1420 + lt * 30;
  const sg = ctx.createRadialGradient(sx, 180, 0, sx, 180, 520);
  sg.addColorStop(0, 'rgba(255,248,226,0.95)');
  sg.addColorStop(0.2, 'rgba(255,230,180,0.5)');
  sg.addColorStop(1, 'rgba(255,220,160,0)');
  ctx.fillStyle = sg;
  ctx.fillRect(0, 0, W, H);
  const x = 980 + lt * 24, y = 520 - lt * 14;
  L.lit(ctx, (c) => {
    c.translate(x, y);
    c.rotate(-0.1);
    c.fillStyle = '#c9ad7c';
    c.fillRect(-11, 110, 22, 200);
    c.fillStyle = '#86a07a';
    c.beginPath(); c.roundRect(-78, -170, 156, 290, [44, 44, 30, 30]); c.fill();
    c.fillStyle = 'rgba(255,255,240,0.35)';
    c.fillRect(-56, -150, 16, 240);
    const k = (lt * 1.6) % 1;
    c.fillStyle = '#93ae86';
    c.beginPath(); c.ellipse(46, 128 + k * k * 280, 8, 12, 0, 0, Math.PI * 2); c.fill();
    // 手：四指握住木棍，拇指在前
    c.fillStyle = '#b98a68';
    c.beginPath(); c.roundRect(-30, 220, 120, 420, 50); c.fill();
    for (let i = 0; i < 4; i++) { c.beginPath(); c.roundRect(-70 + i * 6, 226 + i * 40, 92, 44, 22); c.fill(); }
    c.fillStyle = '#c4956f';
    c.beginPath(); c.roundRect(-52, 200, 46, 92, 23); c.fill();
  }, { light: -0.8, rim: [255, 236, 200], rimA: 1, rimW: 5, shadow: 0.55, ambient: 0.8, bbox: [800, 300, 400, 780] });
}

// 窗上的雨：屋里暗，外面是湿的绿色
function shotRain(ctx, lt) {
  L.blurred(ctx, 16, (c) => {
    const g = c.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, '#9aa49a');
    g.addColorStop(1, '#55634e');
    c.fillStyle = g;
    c.fillRect(0, 0, W, H);
    foliage(c, lt, 61, { n: 50, x0: -100, x1: 2000, y0: 300, y1: 1100, cols: ['#3e4e34', '#4a5c3c', '#33402c'] });
  });
  const r = rng(71);
  ctx.strokeStyle = 'rgba(230,236,230,0.3)';
  ctx.lineWidth = 1.5;
  for (let i = 0; i < 120; i++) {
    const x = r() * W, sp = 1800 + r() * 900;
    const y = ((r() * H + lt * sp) % (H + 200)) - 100;
    ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x - 8, y + 50); ctx.stroke();
  }
  for (let i = 0; i < 110; i++) {
    const x = r() * W, y = r() * H + (r() < 0.15 ? lt * 140 : 0), s = 3 + r() * 10;
    ctx.fillStyle = 'rgba(30,40,34,0.28)';
    ctx.beginPath(); ctx.ellipse(x, y + 1, s, s * 1.1, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = 'rgba(240,244,236,0.5)';
    ctx.beginPath(); ctx.arc(x - s * 0.3, y - s * 0.3, s * 0.3, 0, Math.PI * 2); ctx.fill();
  }
  ctx.fillStyle = '#2a2620';
  ctx.fillRect(0, 0, W, 60);
  ctx.fillRect(1180, 0, 34, H);
  ctx.save();
  ctx.translate(780, 660);
  ctx.rotate(-0.12);
  ctx.fillStyle = '#6e5242';
  ctx.beginPath(); ctx.ellipse(0, 0, 88, 104, 0, 0, Math.PI * 2); ctx.fill();
  for (const [fx, fy, a, len] of [[-78, -58, -0.55, 64], [-38, -106, -0.2, 100], [5, -118, 0, 112], [46, -108, 0.18, 102], [82, -72, 0.4, 80]]) {
    ctx.save(); ctx.translate(fx, fy); ctx.rotate(a);
    ctx.beginPath(); ctx.roundRect(-16, -len, 32, len + 30, 16); ctx.fill();
    ctx.restore();
  }
  ctx.fillRect(-64, 60, 128, 400);
  ctx.restore();
}

// 屋顶的晚霞：坐在楼顶边上的背影
function shotDusk(ctx, lt) {
  const g = ctx.createLinearGradient(0, 0, 0, 780);
  g.addColorStop(0, '#3e3e58');
  g.addColorStop(0.45, '#a46e5e');
  g.addColorStop(0.8, '#e0a062');
  g.addColorStop(1, '#f0c98a');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
  const sg = ctx.createRadialGradient(1300, 720, 0, 1300, 720, 600);
  sg.addColorStop(0, 'rgba(255,236,190,0.95)');
  sg.addColorStop(0.1, 'rgba(255,210,140,0.6)');
  sg.addColorStop(1, 'rgba(255,190,120,0)');
  ctx.fillStyle = sg;
  ctx.fillRect(0, 0, W, H);
  const r = rng(51);
  L.blurred(ctx, 3, (c) => {
    c.fillStyle = '#4a3436';
    let x = -40;
    while (x < W + 40) {
      const w = 120 + r() * 240, h = 80 + r() * 200;
      c.fillRect(x, 770 - h, w, h + 400);
      if (r() < 0.4) c.fillRect(x + w * 0.3, 770 - h - 50, 40, 50);
      x += w - 10;
    }
  });
  ctx.strokeStyle = 'rgba(40,28,30,0.8)';
  ctx.lineWidth = 2;
  for (let i = 0; i < 3; i++) {
    ctx.beginPath();
    ctx.moveTo(-20, 220 + i * 30);
    ctx.quadraticCurveTo(960, 330 + i * 34 + Math.sin(lt * 2 + i) * 3, 1940, 200 + i * 28);
    ctx.stroke();
  }
  ctx.fillStyle = '#2b2124';
  ctx.fillRect(0, 760, W, 108);
  ctx.fillStyle = '#1c1517';
  ctx.fillRect(0, 868, W, 212);
  ctx.fillStyle = 'rgba(240,170,110,0.35)';
  ctx.fillRect(0, 864, W, 4);
  L.lit(ctx, (c) => {
    c.translate(820, 868);
    L.side(c, { h: 600, kind: 'child', f: 1, yaw: 1, pose: { torso: 0.18, neck: 0.05, head: -0.2, thighN: 1.45, shinN: 0.15 + Math.sin(lt * 3) * 0.15, thighF: 1.4, shinF: 0.3, uArmN: 0.3, fArmN: 0.5, uArmF: 0.2, fArmF: 0.4 } });
  }, { light: -0.15, rim: [255, 196, 130], rimA: 1, rimW: 4, ambient: 0.35, shadow: 0.3, bbox: [700, 480, 360, 520] });
}

// 凉席和电风扇：低机位侧面，孩子侧躺着，前景电扇在转
function shotFan(ctx, lt) {
  const g = ctx.createLinearGradient(0, 0, W, 0);
  g.addColorStop(0, '#6e5a48');
  g.addColorStop(1, '#8a7258');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
  L.blurred(ctx, 18, (c) => {
    c.fillStyle = 'rgba(255,214,150,0.45)';
    for (let i = 0; i < 4; i++) c.fillRect(900 + i * 150 + lt * 20, 120, 70, 560);
  });
  ctx.fillStyle = '#b08e58';
  ctx.beginPath(); ctx.moveTo(0, 760); ctx.lineTo(W, 740); ctx.lineTo(W, 1080); ctx.lineTo(0, 1080); ctx.fill();
  ctx.fillStyle = 'rgba(90,64,34,0.35)';
  for (let y = 770; y < H; y += 16 + (y - 760) * 0.06) ctx.fillRect(0, y, W, 2 + (y - 760) * 0.01);
  L.lit(ctx, (c) => {
    c.translate(1150, 812);
    c.rotate(-Math.PI / 2 + 0.04);
    L.side(c, { h: 640, kind: 'child', f: -1, yaw: 0.9, pose: {
      torso: 0.1 + Math.sin(lt * 2.2) * 0.012, neck: 0.15, head: 0.25,
      thighN: 0.3, shinN: -0.05, thighF: 0.15, shinF: 0.2, footN: 1.2, footF: 1.3,
      uArmN: 0.25, fArmN: 0.5, uArmF: 2.8, fArmF: 2.0,
    } });
  }, { light: -1.2, rim: [255, 220, 170], rimA: 0.8, shadow: 0.45, ambient: 0.85, bbox: [700, 560, 900, 300] });
  L.blurred(ctx, 10, (c) => {
    c.translate(330, 520);
    c.strokeStyle = '#d4cfc2';
    c.lineWidth = 10;
    c.beginPath(); c.arc(0, 0, 260, 0, Math.PI * 2); c.stroke();
    c.lineWidth = 3;
    for (let i = 1; i < 6; i++) { c.beginPath(); c.arc(0, 0, i * 48, 0, Math.PI * 2); c.stroke(); }
    c.save();
    c.rotate(lt * 40);
    c.fillStyle = 'rgba(160,180,175,0.5)';
    for (let i = 0; i < 3; i++) { c.rotate(Math.PI * 2 / 3); c.beginPath(); c.ellipse(0, -120, 70, 120, 0, 0, Math.PI * 2); c.fill(); }
    c.restore();
    c.fillStyle = '#bdb6a8';
    c.fillRect(-20, 260, 40, 600);
  });
}

// 阳台上晾的衣服：逆光，被风吹动
function shotLaundry(ctx, lt) {
  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, '#d8d4c4');
  g.addColorStop(1, '#b8a888');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
  const sg = ctx.createRadialGradient(400, 120, 0, 400, 120, 900);
  sg.addColorStop(0, 'rgba(255,244,214,0.95)');
  sg.addColorStop(1, 'rgba(255,230,180,0)');
  ctx.fillStyle = sg;
  ctx.fillRect(0, 0, W, H);
  L.blurred(ctx, 6, (c) => {
    c.fillStyle = '#b4a68c';
    c.fillRect(1100, 260, 700, 700);
    c.fillStyle = '#9a8c72';
    for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) c.fillRect(1150 + i * 160, 300 + j * 150, 90, 80);
  });
  ctx.strokeStyle = 'rgba(60,50,40,0.8)';
  ctx.lineWidth = 3;
  ctx.beginPath(); ctx.moveTo(-20, 230); ctx.quadraticCurveTo(960, 300, 1940, 220); ctx.stroke();
  const cloth = [
    { x: 300, w: 240, h: 300, col: [236, 230, 214], kind: 'shirt' },
    { x: 640, w: 200, h: 420, col: [180, 70, 60], kind: 'towel' },
    { x: 960, w: 230, h: 260, col: [92, 110, 140], kind: 'shorts' },
    { x: 1300, w: 260, h: 330, col: [222, 214, 190], kind: 'shirt' },
  ];
  cloth.forEach((c, i) => {
    const y = 230 + 70 * Math.sin(Math.PI * (c.x + 20) / 1960) * 0.9;
    const sw = Math.sin(lt * 3 + i) * 0.06 + noise1(lt * 2 + i, 200 + i) * 0.05;
    ctx.save();
    ctx.translate(c.x, y);
    ctx.rotate(sw);
    ctx.transform(1, 0, sw * 1.5, 1, 0, 0);
    ctx.fillStyle = `rgba(${c.col.join(',')},0.92)`;
    ctx.beginPath();
    if (c.kind === 'shirt') {
      ctx.moveTo(-c.w / 2, 0); ctx.lineTo(c.w / 2, 0); ctx.lineTo(c.w / 2 + 60, 80); ctx.lineTo(c.w / 2 + 20, 110); ctx.lineTo(c.w / 2 - 10, 80);
      ctx.lineTo(c.w / 2 - 10, c.h); ctx.lineTo(-c.w / 2 + 10, c.h); ctx.lineTo(-c.w / 2 + 10, 80); ctx.lineTo(-c.w / 2 - 20, 110); ctx.lineTo(-c.w / 2 - 60, 80);
    } else if (c.kind === 'towel') {
      ctx.rect(-c.w / 2, 0, c.w, c.h);
    } else {
      ctx.moveTo(-c.w / 2, 0); ctx.lineTo(c.w / 2, 0); ctx.lineTo(c.w / 2 + 10, c.h); ctx.lineTo(20, c.h); ctx.lineTo(0, c.h * 0.4); ctx.lineTo(-20, c.h); ctx.lineTo(-c.w / 2 - 10, c.h);
    }
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = 'rgba(80,60,40,0.18)';
    ctx.fillRect(-c.w / 2, c.h * 0.6, c.w, c.h * 0.4);
    ctx.fillStyle = '#5a4a3a';
    ctx.fillRect(-c.w / 2 + 10, -8, 10, 22);
    ctx.fillRect(c.w / 2 - 20, -8, 10, 22);
    ctx.restore();
  });
  // 阳台栏杆（前景）
  ctx.fillStyle = '#4a4440';
  ctx.fillRect(0, 820, W, 16);
  for (let x = 20; x < W; x += 70) ctx.fillRect(x, 836, 10, 260);
  ctx.fillStyle = '#3a3430';
  ctx.fillRect(0, 990, W, 90);
  L.blurred(ctx, 8, (c) => {
    c.fillStyle = '#7a4a34';
    c.fillRect(1560, 720, 180, 140);
    foliage(c, lt, 210, { n: 16, x0: 1520, x1: 1780, y0: 560, y1: 740, sx: 0.6 });
  });
}

// 自行车（侧面）
function bike(ctx, bx, by, crank, col = '#7a2c24', wheel = '#2a2a2c') {
  const wr = 92;
  ctx.save();
  ctx.translate(bx, by);
  ctx.strokeStyle = wheel;
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
  ctx.strokeStyle = col;
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
}
function rider(ctx, bx, by, crank, o) {
  const hip = [bx - 70, by - 190];
  const pr = 34;
  const pN = [bx - 30 + Math.cos(crank) * pr, by - 10 + Math.sin(crank) * pr];
  const pF = [bx - 30 - Math.cos(crank) * pr, by - 10 - Math.sin(crank) * pr];
  L.lit(ctx, (c) => {
    bike(c, bx, by, crank, o.frame, o.wheel);
    c.translate(hip[0], hip[1]);
    const rel = (p) => [p[0] - hip[0], p[1] - hip[1]];
    L.side(c, { h: 540, kind: 'child', f: 1, yaw: 1, pose: {
      torso: 0.42, neck: -0.1, head: -0.1,
      reachN: rel([bx + 56, by - 196]), reachF: rel([bx + 50, by - 200]), handN: 1.6, handF: 1.6,
      ankleN: rel(pN), ankleF: rel(pF), footN: 1.7, footF: 1.7,
    } });
  }, o.lit);
}

// 傍晚骑车回家：街上的路灯刚亮，长长的影子
function shotRideHome(ctx, lt) {
  const off = -lt * 520;
  const g = ctx.createLinearGradient(0, 0, 0, 700);
  g.addColorStop(0, '#465068');
  g.addColorStop(0.7, '#c08a6a');
  g.addColorStop(1, '#e2b07a');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
  L.blurred(ctx, 3, (c) => {
    const r = rng(81);
    for (let k = 0; k < 9; k++) {
      const bx = ((k * 320 + off * 0.5) % 2880 + 2880) % 2880 - 400;
      c.fillStyle = '#3a3036';
      const h = 260 + r() * 200;
      c.fillRect(bx, 700 - h, 280, h);
      c.fillStyle = 'rgba(255,200,130,0.75)';
      if (r() < 0.6) c.fillRect(bx + 60, 700 - h + 60, 40, 34);
      if (r() < 0.5) c.fillRect(bx + 170, 700 - h + 140, 40, 34);
    }
  });
  const lx = ((1500 + off * 0.9) % 2600 + 2600) % 2600 - 300;
  ctx.fillStyle = '#2a2428';
  ctx.fillRect(lx, 260, 12, 520);
  ctx.fillRect(lx - 60, 260, 72, 10);
  const lg = ctx.createRadialGradient(lx - 50, 278, 0, lx - 50, 278, 200);
  lg.addColorStop(0, 'rgba(255,220,160,0.9)');
  lg.addColorStop(1, 'rgba(255,200,130,0)');
  ctx.fillStyle = lg;
  ctx.fillRect(lx - 260, 80, 420, 400);
  ctx.fillStyle = '#4a3c3a';
  ctx.fillRect(0, 700, W, 380);
  ctx.fillStyle = 'rgba(255,200,140,0.15)';
  ctx.fillRect(0, 700, W, 6);
  // 长影子（向左后方）
  ctx.save();
  ctx.translate(880, 990);
  ctx.transform(1, 0, -2.2, 0.25, 0, 0);
  ctx.fillStyle = 'rgba(20,14,14,0.45)';
  ctx.beginPath(); ctx.ellipse(0, -300, 140, 300, 0, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
  rider(ctx, 880 + Math.sin(lt * 3) * 6, 990, lt * 8, { frame: '#5a2a26', wheel: '#1e1a1c', lit: { light: -0.15, rim: [255, 200, 140], rimA: 1, rimW: 4, shadow: 0.4, ambient: 0.45, bbox: [700, 420, 500, 600] } });
}

// 雷阵雨后的水洼：倒映着天、树和站在水边的孩子，涟漪
function shotPuddle(ctx, lt) {
  ctx.fillStyle = '#3a3634';
  ctx.fillRect(0, 0, W, H);
  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, 'rgba(200,190,170,0.35)');
  g.addColorStop(1, 'rgba(40,36,34,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
  const r = rng(91);
  for (let i = 0; i < 400; i++) {
    ctx.fillStyle = `rgba(${r() < 0.5 ? '20,18,16' : '120,110,100'},${0.15 + r() * 0.2})`;
    ctx.fillRect(r() * W, r() * H, 2 + r() * 4, 2 + r() * 3);
  }
  ctx.save();
  ctx.beginPath();
  ctx.ellipse(1000, 560, 760, 300, -0.04, 0, Math.PI * 2);
  ctx.clip();
  const sky = ctx.createLinearGradient(0, 260, 0, 860);
  sky.addColorStop(0, '#f2dcae');
  sky.addColorStop(0.6, '#c9b494');
  sky.addColorStop(1, '#8a8a90');
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, W, H);
  L.blurred(ctx, 2, (c) => {
    foliage(c, lt, 95, { n: 30, x0: 300, x1: 1100, y0: 560, y1: 900, cols: ['#3a4a30', '#46583a'] });
    c.fillStyle = '#2a2a2c';
    c.fillRect(1380, 300, 16, 600);
  });
  ctx.strokeStyle = 'rgba(255,245,225,0.45)';
  ctx.lineWidth = 2;
  for (const [cx, cy, t0] of [[820, 520, 0], [1260, 640, 0.25], [640, 700, 0.4]]) {
    const k = ((lt + t0) % 0.8) / 0.8;
    ctx.globalAlpha = 1 - k;
    ctx.beginPath(); ctx.ellipse(cx, cy, 20 + k * 160, (20 + k * 160) * 0.35, 0, 0, Math.PI * 2); ctx.stroke();
  }
  ctx.restore();
  ctx.strokeStyle = 'rgba(20,18,16,0.6)';
  ctx.lineWidth = 6;
  ctx.beginPath(); ctx.ellipse(1000, 560, 760, 300, -0.04, 0, Math.PI * 2); ctx.stroke();
  // 一只纸船慢慢漂过
  ctx.save();
  ctx.translate(860 + lt * 90, 560 + Math.sin(lt * 4) * 4);
  ctx.rotate(Math.sin(lt * 3) * 0.04);
  ctx.fillStyle = 'rgba(0,0,0,0.25)';
  ctx.beginPath(); ctx.ellipse(10, 40, 130, 18, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#e8e2d2';
  ctx.beginPath(); ctx.moveTo(-120, 0); ctx.lineTo(120, 0); ctx.lineTo(80, 36); ctx.lineTo(-80, 36); ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#d6cdb8';
  ctx.beginPath(); ctx.moveTo(-60, 0); ctx.lineTo(0, -110); ctx.lineTo(60, 0); ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#f2ecdf';
  ctx.beginPath(); ctx.moveTo(0, -110); ctx.lineTo(60, 0); ctx.lineTo(10, 0); ctx.closePath(); ctx.fill();
  ctx.restore();
}

// ---------------- 序列 ----------------
const MIX = 0.1;
const SHOTS = [
  [0, (c, lt) => drawWindow(c, lt)],
  [1.5, shotIce],
  [2.0, shotRain],
  [2.5, shotDusk],
  [3.0, shotFan],
  [3.72, shotLaundry],
  [4.44, shotRideHome],
  [5.16, shotPuddle],
];
const seq = L.sequence(SHOTS.map(([at, fn], i) => ({ at, draw: (ctx, lt) => fn(ctx, lt + (i ? MIX : 0)) })), MIX);
const M_END = 5.9;
const S = { start: 0, end: M_END + 0.25 };

function draw(ctx, d) { seq.draw(ctx, d); }
function drawOver(ctx, d) { L.halation(ctx, 0.32 * (1 - smooth(prog(d, M_END - 0.1, M_END + 0.2)))); }

function light(d) {
  if (d < 1.5) return [
    { x: 1250, y: 440, rx: 900, ry: 700, i: 1, core: 0.35 },
    { x: 430, y: 520, rx: 560, ry: 460, i: 0.85 },
  ];
  return [{ x: 960, y: 520, rx: 1300, ry: 900, i: 1, core: 0.45 }];
}
function grade(d) { return { warm: 0.22, ambient: d < 1.5 ? 0.42 : 0.5 }; }

module.exports = { ...S, draw, drawOver, light, grade, calendar, M_END };
