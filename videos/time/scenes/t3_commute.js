// 第三幕 · 10.0–22.5 秒：日子开始复制自己。
//   五天，每天同样六个镜头：闹钟 → 刷牙 → 地铁车窗 → 办公室（一排排一样的屏幕）→ 回家开门开灯 → 俯拍床和手机
//   第一天正常；第二天几乎一样、更快；第三天开始重影；第四天几条相同的轨迹叠在一起；第五天只剩残影。
//   17.7–22.5 小高潮：办公室、地铁、床、手机……像记忆卡片一样浮现 → 叠在一起 → 变模糊 → 压扁 → 消失，
//             最后只剩几条极淡的光线 / 一条空白的时间轴。
const { createCanvas } = require('@napi-rs/canvas');
const L = require('../lib');
const { W, H, FONT, rng, noise1, lerp, clamp, prog, smooth } = L;

const T0 = 10.0;
const DAYS = [
  { dur: 0.45, day: '周一', mode: 0 },
  { dur: 0.28, day: '周二', mode: 0 },
  { dur: 0.22, day: '周三', mode: 1 }, // 开始重影
  { dur: 0.18, day: '周四', mode: 2 }, // 几条轨迹叠在一起
  { dur: 0.15, day: '周五', mode: 3 }, // 只剩残影
];
const COOL = [160, 185, 215];

// ---------------- 共用 ----------------
function fill(ctx, c) { ctx.fillStyle = c; ctx.fillRect(0, 0, W, H); }
function vgrad(ctx, y0, y1, a, b, x0 = 0, x1 = W) {
  const g = ctx.createLinearGradient(0, y0, 0, y1);
  g.addColorStop(0, a); g.addColorStop(1, b);
  ctx.fillStyle = g; ctx.fillRect(x0, y0, x1 - x0, y1 - y0);
}
function glow(ctx, x, y, r, rgba) {
  const g = ctx.createRadialGradient(x, y, 0, x, y, r);
  g.addColorStop(0, rgba); g.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = g; ctx.fillRect(x - r, y - r, r * 2, r * 2);
}

// ---------------- 六个镜头 ----------------
// draw(ctx, k, lt, day)：k = 镜头内进度 0..1，lt = 镜头内时间（秒）

// 1 闹钟：天没亮，床头柜上的手机亮了，一只手从被子里伸过来按掉
function alarm(ctx, k, lt, day) {
  fill(ctx, '#232a33');
  vgrad(ctx, 0, 620, '#3e4c5e', '#252d36', 120, 300);
  ctx.fillStyle = '#36404c';
  ctx.beginPath();
  ctx.moveTo(1050, 1080); ctx.quadraticCurveTo(1150, 520, 1600, 470); ctx.quadraticCurveTo(1900, 450, 1920, 500); ctx.lineTo(1920, 1080);
  ctx.fill();
  ctx.fillStyle = '#3a2f27';
  ctx.beginPath(); ctx.moveTo(0, 690); ctx.lineTo(1120, 660); ctx.lineTo(1180, 1080); ctx.lineTo(0, 1080); ctx.fill();
  ctx.fillStyle = '#4c3e33';
  ctx.beginPath(); ctx.moveTo(0, 690); ctx.lineTo(1120, 660); ctx.lineTo(1124, 676); ctx.lineTo(0, 708); ctx.fill();
  ctx.save();
  ctx.translate(700, 800);
  ctx.transform(1, 0, -0.35, 0.42, 0, 0);
  ctx.fillStyle = '#08090b';
  ctx.beginPath(); ctx.roundRect(-175, -330, 350, 660, 40); ctx.fill();
  const pulse = 0.85 + 0.15 * Math.sin(lt * 18);
  ctx.fillStyle = `rgba(206,220,238,${0.95 * pulse})`;
  ctx.beginPath(); ctx.roundRect(-160, -315, 320, 630, 30); ctx.fill();
  ctx.fillStyle = '#1c2633';
  ctx.textAlign = 'center';
  ctx.font = FONT.enMed(130);
  ctx.fillText('07:00', 0, -40);
  ctx.font = FONT.body(54);
  ctx.fillText(day, 0, 60);
  ctx.restore();
  glow(ctx, 700, 790, 460, 'rgba(170,195,230,0.28)');
  const e = smooth(clamp(k * 1.6));
  const hx = lerp(1450, 900, e), hy = lerp(640, 772, e);
  L.lit(ctx, (c) => {
    L.limb(c, [1980, 560], [hx + 150, hy - 30], 92, 70, '#4a525c');
    L.limb(c, [hx + 160, hy - 32], [hx + 20, hy], 64, 52, '#a7846c');
    c.fillStyle = '#a7846c';
    c.beginPath(); c.ellipse(hx, hy + 4, 58, 34, 0.15, 0, Math.PI * 2); c.fill();
    L.limb(c, [hx - 20, hy], [hx - 80, hy + 14], 22, 18, '#a7846c');
  }, { light: Math.PI * 0.85, rim: [190, 210, 240], rimA: 0.8, shadow: 0.45, ambient: 0.9, bbox: [800, 500, 1100, 400] });
}

// 2 刷牙：日光灯下的洗手台，侧面，镜子里是同一个人
function brushPose(c, x, y, f, lt) {
  c.save();
  c.translate(x, y);
  const b = Math.sin(lt * 34) * 10;
  L.side(c, { h: 980, kind: 'adult', f, yaw: 1, longSleeve: false, sleeve: 0.5,
    pal: { ...L.PAL.adult, shirt: '#9a9fa3', jacket: null },
    pose: { torso: 0.1, neck: 0.12, head: 0.05, reachN: [f * (112 + b * 0.5), -318], handN: Math.PI * 0.8, uArmF: -0.1, fArmF: 0.2 } });
  c.fillStyle = '#e4eaee';
  c.save();
  c.translate(f * (122 + b * 0.5), -358);
  c.rotate(f > 0 ? 0.12 : -0.12);
  c.fillRect(f > 0 ? -84 : -6, -6, 90, 12);
  c.restore();
  c.restore();
}
function brush(ctx, k, lt) {
  fill(ctx, '#66726e');
  ctx.strokeStyle = 'rgba(30,36,34,0.3)';
  ctx.lineWidth = 2;
  for (let x = 0; x < W; x += 96) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke(); }
  for (let y = 0; y < H; y += 96) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }
  vgrad(ctx, 150, 700, '#3a4446', '#2a3234', 160, 860);
  ctx.fillStyle = '#eef3f4';
  ctx.fillRect(200, 118, 620, 14);
  glow(ctx, 510, 130, 560, 'rgba(225,238,242,0.3)');
  ctx.save();
  ctx.beginPath(); ctx.rect(160, 150, 700, 550); ctx.clip();
  ctx.globalAlpha = 0.6;
  brushPose(ctx, 470, 1010, 1, lt);
  ctx.restore();
  ctx.fillStyle = '#d4dad7';
  ctx.fillRect(0, 820, 1250, 260);
  ctx.fillStyle = '#a4adaa';
  ctx.fillRect(0, 820, 1250, 12);
  L.lit(ctx, (c) => brushPose(c, 1180, 1010, -1, lt), { light: -2.4, rim: [225, 238, 242], rimA: 0.7, shadow: 0.45, ambient: 0.95, bbox: [850, 200, 600, 880] });
}

// 3 地铁：侧面，人物坐在车窗前，黑玻璃里映着他自己
function subwayPose(c, x, y, lt, o = {}) {
  c.save();
  c.translate(x, y);
  if (o.mirror) c.scale(-1, 1);
  L.side(c, { h: 860, kind: 'adult', f: 1, yaw: 1, pose: {
    torso: 0.05, neck: 0.05, head: 0.05 + Math.sin(lt * 1.5) * 0.02,
    reachN: [150, -110], handN: 2.0, reachF: [140, -116], handF: 2.0,
    thighN: 1.5, shinN: 0.1, thighF: 1.45, shinF: 0.05, footN: 1.57, footF: 1.57,
  } });
  c.restore();
}
function subway(ctx, k, lt) {
  fill(ctx, '#4a5654');
  const X0 = 360, Y0 = 150, X1 = 1700, Y1 = 600;
  ctx.fillStyle = '#0d1114';
  ctx.beginPath(); ctx.roundRect(X0, Y0, X1 - X0, Y1 - Y0, 34); ctx.fill();
  ctx.save();
  ctx.beginPath(); ctx.roundRect(X0, Y0, X1 - X0, Y1 - Y0, 34); ctx.clip();
  const r = rng(402);
  for (let i = 0; i < 10; i++) {
    const y = Y0 + 30 + r() * (Y1 - Y0 - 60), len = 160 + r() * 300;
    const x = ((r() * 3000 - (lt + i * 0.37) * 4200) % 3000 + 3000) % 3000 - 400;
    ctx.fillStyle = `rgba(255,220,160,${0.3 + r() * 0.4})`;
    ctx.fillRect(x, y, len, 4 + r() * 4);
  }
  // 玻璃里的倒影：同一个人，朝着另一边
  ctx.globalAlpha = 0.42;
  L.blurred(ctx, 2, (c) => subwayPose(c, 1330, 800, lt, { mirror: true }));
  ctx.restore();
  ctx.fillStyle = '#3c4846';
  ctx.fillRect(0, 600, W, 40);
  ctx.fillStyle = '#4c5e7a';
  ctx.beginPath(); ctx.roundRect(0, 640, W, 160, 14); ctx.fill();
  ctx.fillStyle = '#42526c';
  ctx.fillRect(0, 790, W, 80);
  ctx.fillStyle = '#262a2e';
  ctx.fillRect(0, 870, W, 210);
  ctx.fillStyle = '#b4baba';
  ctx.fillRect(250, 0, 16, 1080);
  L.lit(ctx, (c) => {
    subwayPose(c, 900, 800, lt);
    c.save(); c.translate(1062, 690); c.rotate(-1.1);
    c.fillStyle = '#cfdcee'; c.fillRect(-28, -48, 56, 96);
    c.restore();
  }, { light: -1.7, rim: [220, 230, 240], rimA: 0.75, shadow: 0.45, ambient: 0.92, bbox: [760, 200, 520, 700] });
  glow(ctx, 1060, 640, 200, 'rgba(185,210,240,0.3)');
}

// 4 办公室：中远景，一排排一模一样的工位和屏幕
function worker(ctx, x, y, s, k, seed) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(s, s);
  ctx.fillStyle = '#4a5054';
  ctx.fillRect(-170, -20, 340, 16);
  ctx.fillStyle = '#0f1214';
  ctx.fillRect(-50, -150, 170, 110);
  ctx.fillStyle = '#c2d0dc';
  ctx.fillRect(-44, -144, 158, 98);
  ctx.fillStyle = 'rgba(40,60,80,0.35)';
  for (let i = 0; i < 6; i++) ctx.fillRect(-36, -134 + i * 14, 90 + ((seed * 7 + i * 13) % 50), 4);
  ctx.translate(-70, 30);
  L.bust(ctx, { h: 330, kind: 'adult', arms: true, tilt: Math.sin(k * 6 + seed) * 0.03 });
  ctx.restore();
}
function office(ctx, k, lt) {
  fill(ctx, '#3a4248');
  const vx = 960, vy = 330;
  ctx.fillStyle = '#2c3236';
  ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(W, 0); ctx.lineTo(vx + 400, vy); ctx.lineTo(vx - 400, vy); ctx.fill();
  for (let i = 0; i < 6; i++) {
    const z = 1 / (1 + i * 0.7);
    const y = vy - 300 * z;
    ctx.fillStyle = `rgba(236,242,244,${0.5 + 0.4 * z})`;
    ctx.fillRect(vx - 520 * z, y, 1040 * z, 10 * z + 2);
  }
  vgrad(ctx, vy - 40, vy + 160, '#6c7a84', '#4a565e', 520, 1400);
  ctx.fillStyle = '#42494e';
  ctx.beginPath(); ctx.moveTo(0, H); ctx.lineTo(W, H); ctx.lineTo(vx + 440, vy + 160); ctx.lineTo(vx - 440, vy + 160); ctx.fill();
  const rows = [0.32, 0.42, 0.56, 0.76, 1.04];
  rows.forEach((s, ri) => {
    const y = vy + 160 + (H - vy - 160) * Math.pow((s - 0.3) / 0.8, 1.1) + 60 * s;
    const n = Math.round(3 + (1.1 - s) * 6);
    const gap = 440 * s;
    for (let i = 0; i < n; i++) {
      const x = vx + (i - (n - 1) / 2) * gap;
      if (ri < rows.length - 1) {
        L.blurred(ctx, (1.1 - s) * 3, (c) => worker(c, x, y, s, k, ri * 10 + i), 0.95);
      } else {
        L.lit(ctx, (c) => worker(c, x, y, s, k, ri * 10 + i), { light: -1.6, rim: [200, 220, 240], rimA: 0.6, shadow: 0.35, ambient: 0.9, bbox: [x - 300, y - 400, 600, 500] });
      }
    }
  });
  glow(ctx, 960, 760, 700, 'rgba(180,205,235,0.14)');
}

// 5 回家：门打开，放下包，灯亮了一下
function home(ctx, k, lt) {
  const lampOn = smooth(prog(k, 0.62, 0.7));
  fill(ctx, lampOn > 0 ? `rgb(${Math.round(lerp(40, 92, lampOn))},${Math.round(lerp(42, 84, lampOn))},${Math.round(lerp(46, 72, lampOn))})` : '#282a2e');
  ctx.fillStyle = `rgba(20,18,16,${0.5 - lampOn * 0.2})`;
  ctx.fillRect(1260, 300, 260, 190);
  ctx.fillStyle = '#3a3230';
  ctx.fillRect(1100, 700, 520, 200);
  ctx.fillStyle = 'rgba(255,230,190,0.1)';
  ctx.fillRect(1100, 700, 520, 4);
  const open = smooth(prog(k, 0.0, 0.3));
  ctx.fillStyle = '#1a1a1c';
  ctx.fillRect(520, 200, 360, 700);
  ctx.fillStyle = `rgba(214,200,170,${0.9 * open})`;
  ctx.fillRect(520, 200, 360, 700);
  // 门扇：以左边为轴，向屋里打开（变窄）
  const dw = 360 * (1 - open * 0.82);
  ctx.fillStyle = '#4e4036';
  ctx.beginPath(); ctx.moveTo(520, 200); ctx.lineTo(520 + dw, 200 - open * 30); ctx.lineTo(520 + dw, 900 + open * 30); ctx.lineTo(520, 900); ctx.fill();
  ctx.fillStyle = '#c8b48a';
  ctx.beginPath(); ctx.arc(520 + dw - 30 * (1 - open), 560, 8, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = `rgba(214,200,170,${0.25 * open})`;
  ctx.beginPath(); ctx.moveTo(560, 900); ctx.lineTo(880, 900); ctx.lineTo(1100, 1080); ctx.lineTo(500, 1080); ctx.fill();
  // 人：走进来，把包放到鞋柜上
  const walk = smooth(prog(k, 0.15, 0.6));
  const x = lerp(700, 980, walk);
  const put = smooth(prog(k, 0.45, 0.62));
  L.lit(ctx, (c) => {
    c.translate(x, 600);
    const ph = walk * 6;
    L.side(c, { h: 760, kind: 'adult', f: 1, yaw: 1, pose: {
      torso: 0.06 + put * 0.25, neck: 0.1 + put * 0.2, head: 0,
      thighN: Math.sin(ph) * 0.35 * (1 - put), shinN: Math.sin(ph) * 0.2 - 0.05, thighF: -Math.sin(ph) * 0.35 * (1 - put), shinF: -Math.sin(ph) * 0.2 - 0.05,
      reachN: [lerp(40, 260, put), lerp(-10, 80, put)], handN: 0.4 + put,
      uArmF: -Math.sin(ph) * 0.3, fArmF: -Math.sin(ph) * 0.2 + 0.2,
    } });
    c.fillStyle = '#2a2420';
    c.beginPath(); c.roundRect(lerp(10, 230, put), lerp(-30, 70, put), 120, 90, 14); c.fill();
  }, { light: lampOn > 0 ? -1.6 : Math.PI, rim: lampOn > 0 ? [255, 230, 190] : [230, 215, 185], rimA: 0.8, shadow: 0.5, ambient: lerp(0.7, 0.95, lampOn), bbox: [600, 200, 600, 800] });
  ctx.fillStyle = lampOn > 0 ? '#fff0d4' : '#5a5650';
  ctx.beginPath(); ctx.ellipse(1250, 40, 120, 26, 0, 0, Math.PI * 2); ctx.fill();
  if (lampOn > 0) glow(ctx, 1250, 60, 900, `rgba(255,226,180,${0.22 * lampOn})`);
}

// 6 俯拍床和手机：最后屏幕熄灭
function bed(ctx, k, lt) {
  const off = smooth(prog(k, 0.78, 0.92));
  fill(ctx, '#1e2226');
  ctx.fillStyle = '#3c3430';
  ctx.fillRect(520, 40, 900, 1100);
  ctx.fillStyle = '#7c8690';
  ctx.fillRect(545, 65, 850, 1100);
  ctx.fillStyle = '#a2acb4';
  ctx.beginPath(); ctx.roundRect(660, 220, 520, 190, 70); ctx.fill();
  // 人（仰躺，俯视）：头在枕头上，双手举着手机
  L.lit(ctx, (c) => {
    c.translate(920, 450);
    L.bust(c, { h: 900, kind: 'adult', front: true, arms: false });
    // 手臂从肩膀抬到胸前，手机举在下巴下方
    L.limb(c, [-118, 20], [-62, 70], 62, 52, '#4a5058');
    L.limb(c, [118, 20], [62, 70], 62, 52, '#4a5058');
    c.fillStyle = '#a7846c';
    c.beginPath(); c.ellipse(-56, 80, 30, 36, 0, 0, Math.PI * 2); c.fill();
    c.beginPath(); c.ellipse(56, 80, 30, 36, 0, 0, Math.PI * 2); c.fill();
    c.fillStyle = '#0c0d10';
    c.beginPath(); c.roundRect(-66, 30, 132, 220, 16); c.fill();
  }, { light: -1.57, rim: [190, 210, 240], rimA: 0.6 * (1 - off), shadow: 0.45, ambient: 0.85, bbox: [700, 200, 450, 700] });
  ctx.fillStyle = '#56626e';
  ctx.beginPath(); ctx.moveTo(545, 600); ctx.quadraticCurveTo(960, 560, 1395, 610); ctx.lineTo(1395, 1080); ctx.lineTo(545, 1080); ctx.fill();
  ctx.strokeStyle = 'rgba(30,36,42,0.4)';
  ctx.lineWidth = 6;
  for (let i = 0; i < 4; i++) { ctx.beginPath(); ctx.moveTo(600 + i * 200, 650); ctx.quadraticCurveTo(650 + i * 210, 850, 620 + i * 200, 1080); ctx.stroke(); }
  glow(ctx, 920, 400, 420, `rgba(175,200,240,${0.35 * (1 - off)})`);
  if (off > 0) { ctx.fillStyle = `rgba(6,7,9,${0.6 * off})`; ctx.fillRect(0, 0, W, H); }
}

const SHOTS = [
  { fn: alarm, light: () => [{ x: 760, y: 760, rx: 700, ry: 460, i: 1, color: COOL }, { x: 1300, y: 640, rx: 760, ry: 460, i: 0.7 }] },
  { fn: brush, light: () => [{ x: 900, y: 440, rx: 1100, ry: 760, i: 1, color: COOL }] },
  { fn: subway, light: () => [{ x: 1000, y: 520, rx: 1300, ry: 700, i: 1, color: COOL }] },
  { fn: office, light: () => [{ x: 960, y: 640, rx: 1400, ry: 760, i: 1, color: COOL }] },
  { fn: home, light: (k) => [{ x: 700, y: 560, rx: 600, ry: 600, i: 0.9 }, { x: 1150, y: 400, rx: 1100, ry: 700, i: 0.95 * smooth(prog(k, 0.62, 0.7)) + 0.05 }] },
  { fn: bed, light: (k) => [{ x: 920, y: 420, rx: 800, ry: 700, i: 1 - 0.6 * smooth(prog(k, 0.78, 0.92)), color: COOL }] },
];

// ---------------- 重影 ----------------
const GH = createCanvas(W, H), GHx = GH.getContext('2d');
function renderShot(fn, k, lt, day) {
  GHx.setTransform(1, 0, 0, 1, 0, 0);
  GHx.globalAlpha = 1;
  GHx.globalCompositeOperation = 'source-over';
  GHx.filter = 'none';
  GHx.clearRect(0, 0, W, H);
  fn(GHx, k, lt, day);
}
// mode 0：正常；1：叠一层「昨天」；2：几条轨迹叠在一起；3：只剩残影
function drawDay(ctx, S, k, lt, D) {
  if (D.mode === 0) { S.fn(ctx, k, lt, D.day); return; }
  const layers = D.mode === 1 ? [[0, 0, 0, 1], [-0.3, 14, -6, 0.38]]
    : D.mode === 2 ? [[0, 0, 0, 0.62], [-0.25, 22, -8, 0.3], [-0.5, -18, 10, 0.26], [0.25, 36, 4, 0.22]]
      : [[0, 0, 0, 0.3], [-0.2, 26, -10, 0.24], [-0.4, -22, 12, 0.22], [0.2, 44, 6, 0.2], [-0.6, -40, -4, 0.18]];
  S.fn(ctx, clamp(k + layers[0][0]), lt, D.day);
  if (D.mode === 3) {
    // 残影：底色压暗，画面只剩重复动作的痕迹
    ctx.fillStyle = 'rgba(14,15,17,0.72)';
    ctx.fillRect(0, 0, W, H);
  }
  for (let i = 1; i < layers.length; i++) {
    const [dk, dx, dy, a] = layers[i];
    renderShot(S.fn, clamp(k + dk), lt + dk * 0.3, D.day);
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalAlpha *= a;
    ctx.globalCompositeOperation = D.mode === 3 ? 'screen' : 'source-over';
    if (D.mode === 3) ctx.filter = 'blur(3px) grayscale(0.6)';
    ctx.drawImage(GH, dx, dy);
    ctx.restore();
  }
}

// ---------------- 小高潮：重复的生活场景叠加 → 重合 → 压缩 → 消失 ----------------
const C0 = T0 + DAYS.reduce((a, d) => a + d.dur * SHOTS.length, 0); // ≈ 17.68
// 叠加顺序：办公室、地铁、床、手机闹钟、刷牙、回家；每层一点错位（像几条没对齐的轨迹）
const LAYERS = [
  { shot: 3, at: 0.0, dx: -60, dy: 20, s: 1.04 },
  { shot: 2, at: 0.16, dx: 50, dy: -24, s: 1.06 },
  { shot: 5, at: 0.32, dx: -30, dy: -36, s: 1.03 },
  { shot: 0, at: 0.48, dx: 70, dy: 30, s: 1.05 },
  { shot: 1, at: 0.64, dx: -80, dy: -10, s: 1.07 },
  { shot: 4, at: 0.8, dx: 30, dy: 40, s: 1.02 },
];
let stills = null;
function sceneStills() {
  if (stills) return stills;
  stills = LAYERS.map((l) => {
    renderShot(SHOTS[l.shot].fn, 0.55, 0.3, '周五');
    const cv = createCanvas(W, H);
    cv.getContext('2d').drawImage(GH, 0, 0);
    return cv;
  });
  return stills;
}
const STACK = createCanvas(W, H), STx = STACK.getContext('2d');
function memory(ctx, d) {
  const t = d - C0;
  fill(ctx, '#121417');
  const align = smooth(prog(t, 1.0, 2.0));     // 错位的轨迹慢慢重合
  const squash = smooth(prog(t, 2.0, 3.25));   // 压缩成一条线
  const blur = smooth(prog(t, 1.6, 3.0));
  const vanish = smooth(prog(t, 3.1, 3.8));
  const st = sceneStills();
  STx.setTransform(1, 0, 0, 1, 0, 0);
  STx.globalCompositeOperation = 'source-over';
  STx.globalAlpha = 1;
  STx.filter = 'none';
  STx.fillStyle = '#121417';
  STx.fillRect(0, 0, W, H);
  LAYERS.forEach((l, i) => {
    const a = smooth(prog(t, l.at, l.at + 0.22));
    if (a <= 0) return;
    const k = 1 - align;
    const sc = 1 + (l.s - 1) * k + t * 0.004;
    const x = l.dx * k + noise1(t * 0.8, 400 + i) * 10 * k, y = l.dy * k + noise1(t * 0.8, 410 + i) * 8 * k;
    STx.save();
    STx.globalAlpha = a * (i === 0 ? 1 : lerp(0.55, 1 / (i + 1), align));
    STx.translate(W / 2 + x, H / 2 + y);
    STx.scale(sc, sc);
    STx.drawImage(st[i], -W / 2, -H / 2);
    STx.restore();
  });
  // 重合之后褪色：分不清是哪一天
  if (align > 0) {
    STx.globalCompositeOperation = 'saturation';
    STx.globalAlpha = align * 0.8;
    STx.fillStyle = '#808080';
    STx.fillRect(0, 0, W, H);
    STx.globalCompositeOperation = 'source-over';
  }
  ctx.save();
  ctx.globalAlpha *= 1 - vanish;
  ctx.translate(W / 2, H / 2);
  ctx.scale(lerp(1, 1.08, squash), lerp(1, 0.008, squash * squash));
  if (blur > 0.02) ctx.filter = `blur(${(blur * 10).toFixed(1)}px)`;
  ctx.drawImage(STACK, -W / 2, -H / 2);
  ctx.restore();
  // 最后：几条极淡的光线 + 一条空白的时间轴
  const lines = smooth(prog(t, 3.0, 3.7));
  if (lines > 0) {
    ctx.save();
    ctx.globalAlpha = lines;
    const g = ctx.createLinearGradient(160, 0, W - 160, 0);
    g.addColorStop(0, 'rgba(220,214,200,0)');
    g.addColorStop(0.5, 'rgba(220,214,200,0.45)');
    g.addColorStop(1, 'rgba(220,214,200,0)');
    ctx.fillStyle = g;
    ctx.fillRect(160, 539, W - 320, 2);
    for (let i = 0; i < 24; i++) {
      ctx.fillStyle = `rgba(220,214,200,${0.12 + 0.08 * Math.sin(i * 1.7)})`;
      ctx.fillRect(260 + i * 60, 532, 1, 16);
    }
    const r = rng(612);
    for (let i = 0; i < 5; i++) {
      const y = 400 + r() * 280, len = 300 + r() * 600, x = 200 + r() * 1100;
      ctx.fillStyle = `rgba(200,210,225,${0.05 + r() * 0.05})`;
      ctx.fillRect(x + t * 10 * (r() - 0.5), y, len, 1);
    }
    ctx.restore();
  }
}

// ---------------- 序列 ----------------
const list = [];
let t = T0;
DAYS.forEach((D, di) => {
  SHOTS.forEach((S, si) => {
    const dur = D.dur;
    list.push({
      at: t,
      draw: (ctx, lt) => drawDay(ctx, S, clamp(lt / dur), lt + di * 0.37 + si * 0.11, D),
      light: (lt) => S.light(clamp(lt / dur)),
      grade: { warm: si === 4 ? 0.1 : -0.3, ambient: D.mode === 3 ? 0.26 : 0.34 },
    });
    t += dur;
  });
});
list.push({
  at: C0,
  draw: (ctx, lt, d) => memory(ctx, d),
  light: (lt) => [{ x: 960, y: 540, rx: 1400, ry: 800, i: 0.95 * (1 - smooth(prog(lt, 3.2, 4.2))) + 0.25, color: COOL }],
  grade: { warm: -0.2, ambient: 0.3 },
});
const seq = L.sequence(list, 0);

const S = { start: T0, end: 24.0 };
module.exports = { ...S, draw: (ctx, d) => seq.draw(ctx, d), light: (d) => seq.light(d), grade: (d) => seq.grade(d), C0, DAYS, SHOT_COUNT: SHOTS.length };
