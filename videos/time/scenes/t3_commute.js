// 第三幕 · 10.25–21.3 秒：重复的通勤。
//   第一天（每镜约 0.42 s）：闹钟 → 刷牙 → 电梯 → 地铁 → 电脑 → 外卖 → 电脑（傍晚）→ 夜里的地铁 → 床上刷手机 → 关灯
//   第二天（每镜约 0.22 s）、第三天（每镜约 0.16 s）：同样的十个镜头，只有闹钟上的星期变了。剪辑越来越快。
//   18.25–21.3 地铁车窗：过肩镜头，人物看着玻璃里的自己；说到「没有留在记忆里」时倒影慢慢淡掉。
const L = require('../lib');
const { W, H, FONT, rng, noise1, lerp, clamp, prog, smooth } = L;

const T0 = 10.25;
const DAYS = [{ dur: 0.42, day: '周一' }, { dur: 0.22, day: '周二' }, { dur: 0.16, day: '周三' }];
const COOL = [150, 175, 205];

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
// 失焦的人影（地铁里站着的乘客）
function bystander(ctx, x, y, h, alpha = 1) {
  L.blurred(ctx, 10, (c) => {
    c.translate(x, y);
    L.bust(c, { h, pal: { skin: '#3a3330', shirt: '#22252a', jacket: '#1d2024', hair: '#141110' } });
  }, alpha);
}

// ---------------- 十个镜头 ----------------
// 每个镜头：draw(ctx, k, lt, day)，k = 镜头内进度 0..1

// 1 闹钟：天没亮，床头柜上的手机亮了，一只手从被子里伸过来
function alarm(ctx, k, lt, day) {
  fill(ctx, '#1a1f26');
  // 窗帘缝里一点天光
  vgrad(ctx, 0, 620, '#2e3a48', '#1c222a', 120, 260);
  // 被子
  ctx.fillStyle = '#2c333c';
  ctx.beginPath();
  ctx.moveTo(1050, 1080); ctx.quadraticCurveTo(1150, 520, 1600, 470); ctx.quadraticCurveTo(1900, 450, 1920, 500); ctx.lineTo(1920, 1080);
  ctx.fill();
  // 床头柜
  ctx.fillStyle = '#2a231e';
  ctx.beginPath(); ctx.moveTo(0, 690); ctx.lineTo(1120, 660); ctx.lineTo(1180, 1080); ctx.lineTo(0, 1080); ctx.fill();
  ctx.fillStyle = '#3a3029';
  ctx.beginPath(); ctx.moveTo(0, 690); ctx.lineTo(1120, 660); ctx.lineTo(1124, 676); ctx.lineTo(0, 708); ctx.fill();
  // 手机（平放）
  ctx.save();
  ctx.translate(700, 800);
  ctx.transform(1, 0, -0.35, 0.42, 0, 0);
  ctx.fillStyle = '#08090b';
  ctx.beginPath(); ctx.roundRect(-175, -330, 350, 660, 40); ctx.fill();
  const pulse = 0.85 + 0.15 * Math.sin(lt * 18);
  ctx.fillStyle = `rgba(200,214,232,${0.9 * pulse})`;
  ctx.beginPath(); ctx.roundRect(-160, -315, 320, 630, 30); ctx.fill();
  ctx.fillStyle = '#1c2633';
  ctx.textAlign = 'center';
  ctx.font = FONT.enMed(130);
  ctx.fillText('07:00', 0, -40);
  ctx.font = FONT.body(54);
  ctx.fillText(day, 0, 60);
  ctx.restore();
  glow(ctx, 700, 790, 420, 'rgba(170,195,230,0.22)');
  // 手：从被子里伸过来按掉闹钟
  const e = smooth(clamp(k * 1.6));
  const hx = lerp(1450, 900, e), hy = lerp(640, 772, e);
  L.lit(ctx, (c) => {
    L.limb(c, [1980, 560], [hx + 150, hy - 30], 92, 70, '#3a414a');
    L.limb(c, [hx + 160, hy - 32], [hx + 20, hy], 64, 52, '#9c7a64');
    c.fillStyle = '#9c7a64';
    c.beginPath(); c.ellipse(hx, hy + 4, 58, 34, 0.15, 0, Math.PI * 2); c.fill();
    L.limb(c, [hx - 20, hy], [hx - 80, hy + 14], 22, 18, '#9c7a64');
  }, { light: Math.PI * 0.85, rim: [190, 210, 240], rimA: 0.8, shadow: 0.5, ambient: 0.7, bbox: [800, 500, 1100, 400] });
}

// 2 刷牙：日光灯下的洗手台，侧面
function brush(ctx, k, lt) {
  fill(ctx, '#56615e');
  // 瓷砖
  ctx.strokeStyle = 'rgba(30,36,34,0.35)';
  ctx.lineWidth = 2;
  for (let x = 0; x < W; x += 96) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke(); }
  for (let y = 0; y < H; y += 96) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }
  // 镜子（左）与镜前灯
  vgrad(ctx, 150, 700, '#2c3436', '#1e2426', 160, 860);
  ctx.fillStyle = '#e8eef0';
  ctx.fillRect(200, 118, 620, 14);
  glow(ctx, 510, 130, 520, 'rgba(220,235,240,0.25)');
  // 镜子里的人（更暗、对着我们这边）
  ctx.save();
  ctx.beginPath(); ctx.rect(160, 150, 700, 550); ctx.clip();
  ctx.globalAlpha = 0.6;
  pose(ctx, 470, 1010, 1, lt);
  ctx.restore();
  // 台面和水池
  ctx.fillStyle = '#c9cfcc';
  ctx.fillRect(0, 820, 1250, 260);
  ctx.fillStyle = '#9aa3a0';
  ctx.fillRect(0, 820, 1250, 12);
  L.lit(ctx, (c) => pose(c, 1180, 1010, -1, lt), { light: -2.4, rim: [220, 235, 240], rimA: 0.7, shadow: 0.5, ambient: 0.85, bbox: [850, 200, 600, 880] });
}
function pose(c, x, y, f, lt) {
  c.save();
  c.translate(x, y);
  const b = Math.sin(lt * 34) * 10;
  L.side(c, { h: 980, kind: 'adult', f, yaw: 1, longSleeve: false, sleeve: 0.5,
    pal: { ...L.PAL.adult, shirt: '#8b9094', jacket: null },
    pose: { torso: 0.1, neck: 0.12, head: 0.05, reachN: [f * (112 + b * 0.5), -318], handN: Math.PI * 0.8, uArmF: -0.1, fArmF: 0.2 } });
  // 牙刷
  c.fillStyle = '#d8dee2';
  c.save();
  c.translate(f * (122 + b * 0.5), -358);
  c.rotate(f > 0 ? 0.12 : -0.12);
  c.fillRect(f > 0 ? -84 : -6, -6, 90, 12);
  c.restore();
  c.restore();
}

// 3 电梯：不锈钢门，楼层数字往下走，背影
function elevator(ctx, k, lt) {
  fill(ctx, '#2a2c2e');
  // 门
  for (const s of [-1, 1]) {
    const x0 = s < 0 ? 620 : 960;
    const g = ctx.createLinearGradient(x0, 0, x0 + 340, 0);
    g.addColorStop(0, '#5c6164'); g.addColorStop(0.5, '#7b8083'); g.addColorStop(1, '#55595c');
    ctx.fillStyle = g;
    ctx.fillRect(x0, 180, 340, 900);
  }
  ctx.fillStyle = '#1a1c1e';
  ctx.fillRect(957, 180, 6, 900);
  // 门上的楼层显示
  ctx.fillStyle = '#121314';
  ctx.fillRect(880, 70, 160, 80);
  const fl = Math.max(1, Math.round(lerp(12, 1, k)));
  ctx.fillStyle = '#d0483a';
  ctx.font = FONT.enMed(58);
  ctx.textAlign = 'center';
  ctx.fillText(String(fl).padStart(2, ' '), 960, 130);
  // 按钮面板
  ctx.fillStyle = '#4a4e51';
  ctx.fillRect(1380, 420, 90, 240);
  ctx.fillStyle = '#c8b27a';
  for (let i = 0; i < 4; i++) { ctx.beginPath(); ctx.arc(1425, 470 + i * 52, 13, 0, Math.PI * 2); ctx.fill(); }
  glow(ctx, 960, 0, 700, 'rgba(240,236,220,0.18)');
  // 背影
  L.lit(ctx, (c) => {
    c.translate(930, 860);
    L.bust(c, { h: 1050, kind: 'adult' });
  }, { light: -1.57, rim: [235, 230, 215], rimA: 0.7, shadow: 0.45, ambient: 0.75, bbox: [650, 300, 560, 780] });
}

// 4 / 8 地铁：车厢侧面，人物坐着低头看手机，窗外隧道的灯掠过
function subway(ctx, k, lt, day, night) {
  fill(ctx, night ? '#262c2c' : '#3a4442');
  // 车窗带
  ctx.fillStyle = '#0a0c0e';
  ctx.beginPath(); ctx.roundRect(120, 190, 1680, 330, 30); ctx.fill();
  ctx.save();
  ctx.beginPath(); ctx.roundRect(120, 190, 1680, 330, 30); ctx.clip();
  const r = rng(night ? 401 : 402);
  for (let i = 0; i < 14; i++) {
    const y = 220 + r() * 270, len = 120 + r() * 260;
    const x = ((r() * 3000 - (lt + i * 0.37) * 4200) % 3000 + 3000) % 3000 - 400;
    ctx.fillStyle = `rgba(255,220,160,${0.25 + r() * 0.4})`;
    ctx.fillRect(x, y, len, 3 + r() * 4);
  }
  ctx.restore();
  // 窗间立柱
  ctx.fillStyle = night ? '#1e2322' : '#2c3432';
  for (const x of [640, 1290]) ctx.fillRect(x, 190, 40, 330);
  // 扶杆
  ctx.fillStyle = '#9ea4a4';
  ctx.fillRect(1500, 0, 16, 1080);
  // 座椅
  ctx.fillStyle = night ? '#2a3546' : '#3a4a62';
  ctx.beginPath(); ctx.roundRect(0, 580, W, 190, 14); ctx.fill();
  ctx.fillStyle = night ? '#232d3c' : '#33425a';
  ctx.fillRect(0, 760, W, 90);
  ctx.fillStyle = '#1a1d20';
  ctx.fillRect(0, 850, W, 230);
  // 人物
  L.lit(ctx, (c) => {
    c.translate(900, 770);
    L.side(c, { h: 840, kind: 'adult', f: 1, yaw: 1, pose: {
      torso: 0.22, neck: 0.42, head: 0.28,
      reachN: [205, -150], handN: 2.2, reachF: [190, -160], handF: 2.2,
      thighN: 1.5, shinN: 0.1, thighF: 1.45, shinF: 0.05, footN: 1.57, footF: 1.57,
    } });
    // 手机：屏幕光
    c.save();
    c.translate(255, -205);
    c.rotate(-0.9);
    c.fillStyle = '#c6d4e6';
    c.fillRect(-30, -52, 60, 104);
    c.restore();
  }, { light: -1.8, rim: night ? [170, 190, 220] : [215, 225, 235], rimA: 0.7, shadow: 0.5, ambient: night ? 0.55 : 0.75, bbox: [750, 220, 500, 700] });
  glow(ctx, 1160, 560, 180, 'rgba(180,205,240,0.25)');
  // 前景失焦的站立乘客
  if (!night) {
    bystander(ctx, 260, 760, 1300, 0.9);
    bystander(ctx, 1760, 820, 1250, 0.85);
  } else {
    bystander(ctx, 1780, 860, 1200, 0.6);
  }
}

// 5 / 7 电脑：从背后看，显示器的光；傍晚那一镜窗外变暗
function desk(ctx, k, lt, day, evening) {
  fill(ctx, evening ? '#1b1e22' : '#2c3236');
  // 远处的窗与天光
  vgrad(ctx, 60, 420, evening ? '#3a2f38' : '#5c6a74', evening ? '#20222a' : '#3c464c', 0, W);
  ctx.fillStyle = evening ? '#14161a' : '#262c30';
  for (let x = 0; x < W; x += 240) ctx.fillRect(x, 60, 18, 360);
  // 远处的工位和屏幕（失焦）
  L.blurred(ctx, 8, (c) => {
    c.fillStyle = evening ? '#16181b' : '#22272a';
    c.fillRect(0, 420, W, 300);
    for (let i = 0; i < 7; i++) {
      c.fillStyle = `rgba(190,210,230,${evening ? 0.35 : 0.5})`;
      c.fillRect(80 + i * 270, 470, 150, 90);
    }
  });
  // 天花板灯带
  if (!evening) { ctx.fillStyle = 'rgba(235,240,240,0.5)'; ctx.fillRect(200, 20, 1500, 10); }
  // 桌面
  ctx.fillStyle = '#3c4044';
  ctx.fillRect(0, 760, W, 320);
  // 显示器
  ctx.fillStyle = '#0d0f11';
  ctx.fillRect(820, 250, 700, 430);
  ctx.fillRect(1140, 680, 60, 90);
  ctx.fillStyle = evening ? '#c3d0de' : '#b7c5d2';
  ctx.fillRect(840, 270, 660, 390);
  ctx.fillStyle = 'rgba(40,60,80,0.35)';
  for (let i = 0; i < 12; i++) { ctx.fillRect(870, 300 + i * 28, 600 * (0.5 + 0.5 * ((i * 37) % 10) / 10), 6); }
  ctx.fillStyle = 'rgba(40,60,80,0.15)';
  for (let j = 0; j < 6; j++) ctx.fillRect(870 + j * 105, 290, 2, 350);
  glow(ctx, 1170, 470, 600, `rgba(170,200,235,${evening ? 0.3 : 0.18})`);
  // 椅背 + 背影
  L.lit(ctx, (c) => {
    c.fillStyle = '#141618';
    c.beginPath(); c.roundRect(470, 760, 420, 400, 30); c.fill();
    c.translate(680, 820);
    L.bust(c, { h: 1000, kind: 'adult', tilt: 0.05 });
  }, { light: -0.35, rim: [185, 210, 240], rimA: 0.8, shadow: 0.55, ambient: evening ? 0.55 : 0.7, bbox: [440, 300, 480, 780] });
}

// 6 外卖：俯拍桌面，同一个外卖盒
function lunch(ctx, k, lt) {
  fill(ctx, '#45484b');
  L.blurred(ctx, 2, (c) => c.drawImage(L.wallTex(W, H, [70, 72, 75], 611), 0, 0));
  // 键盘（画面上沿）
  ctx.fillStyle = '#1f2124';
  ctx.beginPath(); ctx.roundRect(260, -60, 1100, 230, 20); ctx.fill();
  ctx.fillStyle = '#2c2f33';
  for (let i = 0; i < 4; i++) for (let j = 0; j < 15; j++) ctx.fillRect(290 + j * 70, -40 + i * 50, 58, 40);
  // 外卖盒
  ctx.save();
  ctx.translate(900, 640);
  ctx.rotate(-0.06);
  ctx.fillStyle = 'rgba(0,0,0,0.4)';
  ctx.beginPath(); ctx.roundRect(-300, -200, 620, 430, 30); ctx.fill();
  ctx.fillStyle = '#16171a';
  ctx.beginPath(); ctx.roundRect(-310, -215, 620, 430, 30); ctx.fill();
  ctx.fillStyle = '#e4ddcf';
  ctx.beginPath(); ctx.ellipse(-130, 0, 150, 160, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#6a4630';
  ctx.beginPath(); ctx.roundRect(40, -180, 240, 170, 20); ctx.fill();
  ctx.fillStyle = '#4c6a3a';
  ctx.beginPath(); ctx.roundRect(40, 10, 240, 170, 20); ctx.fill();
  ctx.restore();
  // 筷子和手
  const lift = Math.sin(clamp(k) * Math.PI) * 30;
  L.lit(ctx, (c) => {
    c.fillStyle = '#c9b48a';
    c.save(); c.translate(1330, 900 - lift); c.rotate(-2.55);
    c.fillRect(0, -6, 520, 10); c.fillRect(0, 12, 520, 10);
    c.restore();
    c.fillStyle = '#9c7a64';
    c.beginPath(); c.ellipse(1370, 930 - lift, 100, 70, -0.6, 0, Math.PI * 2); c.fill();
    L.limb(c, [1420, 960 - lift], [1700, 1150], 120, 130, '#3a3f45');
  }, { light: -2.2, rim: [220, 225, 230], rimA: 0.5, shadow: 0.4, ambient: 0.8, bbox: [1100, 700, 700, 400] });
}

// 9 床上刷手机：黑暗里只有屏幕光照着侧脸
function bed(ctx, k, lt) {
  fill(ctx, '#101317');
  // 枕头
  ctx.fillStyle = '#232931';
  ctx.beginPath(); ctx.roundRect(200, 600, 470, 230, 90); ctx.fill();
  L.lit(ctx, (c) => {
    c.translate(900, 720);
    c.rotate(-Math.PI / 2);
    L.side(c, { h: 900, kind: 'adult', f: 1, yaw: 1, pose: { torso: 0, neck: 0.05, head: -0.1, reachN: [215 + Math.sin(lt * 3) * 4, -330], handN: Math.PI * 0.75, uArmF: -0.2, fArmF: 0.4 } });
  }, { light: -1.2, rim: [180, 205, 240], rimA: 0.9, shadow: 0.6, ambient: 0.5, bbox: [300, 380, 900, 500] });
  // 被子盖住身体
  ctx.fillStyle = '#1c2128';
  ctx.beginPath(); ctx.moveTo(760, 1080); ctx.quadraticCurveTo(800, 690, 1150, 650); ctx.quadraticCurveTo(1700, 610, 1920, 660); ctx.lineTo(1920, 1080); ctx.fill();
  // 手机：屏幕朝下照着脸
  ctx.save();
  ctx.translate(585, 470);
  ctx.rotate(-0.25);
  ctx.fillStyle = '#0a0b0d';
  ctx.fillRect(-100, -22, 200, 44);
  ctx.fillStyle = 'rgba(200,215,235,0.9)';
  ctx.fillRect(-94, 16, 188, 6);
  ctx.restore();
  glow(ctx, 560, 560, 300, 'rgba(160,190,235,0.3)');
}

// 10 关灯：开关特写，手指按下，房间暗掉
function lightsOff(ctx, k) {
  fill(ctx, '#3a3632');
  L.blurred(ctx, 1, (c) => c.drawImage(L.wallTex(W, H, [70, 64, 58], 621), 0, 0));
  ctx.fillStyle = 'rgba(0,0,0,0.35)';
  ctx.fillRect(1000, 410, 170, 250);
  ctx.fillStyle = '#d8d2c6';
  ctx.beginPath(); ctx.roundRect(990, 400, 170, 250, 12); ctx.fill();
  const pressed = k > 0.5;
  ctx.fillStyle = '#c4beb1';
  ctx.beginPath(); ctx.roundRect(1030, 450, 90, 150, 8); ctx.fill();
  ctx.fillStyle = pressed ? '#aaa496' : '#e6e0d4';
  ctx.fillRect(1030, pressed ? 525 : 450, 90, 75);
  const fx = lerp(1500, 1110, smooth(clamp(k * 2)));
  L.lit(ctx, (c) => {
    L.limb(c, [1980, 760], [fx + 230, 620], 150, 120, '#2e3236');
    c.fillStyle = '#9c7a64';
    c.beginPath(); c.ellipse(fx + 170, 600, 110, 80, -0.3, 0, Math.PI * 2); c.fill();
    L.limb(c, [fx + 120, 560], [fx, pressed ? 545 : 500], 44, 36, '#9c7a64');
  }, { light: -1.9, rim: [255, 230, 200], rimA: 0.5, shadow: 0.5, ambient: 0.8, bbox: [1000, 400, 900, 500] });
  if (pressed) { ctx.fillStyle = `rgba(5,5,6,${0.82 * smooth(prog(k, 0.5, 0.62))})`; ctx.fillRect(0, 0, W, H); }
}

const SHOTS = [
  { fn: alarm, light: () => [{ x: 760, y: 760, rx: 640, ry: 420, i: 0.95, color: COOL }, { x: 1300, y: 640, rx: 700, ry: 400, i: 0.5 }] },
  { fn: brush, light: () => [{ x: 900, y: 420, rx: 1000, ry: 700, i: 0.9, color: COOL }] },
  { fn: elevator, light: () => [{ x: 960, y: 420, rx: 900, ry: 760, i: 0.9, color: [240, 232, 210] }] },
  { fn: (c, k, lt, d) => subway(c, k, lt, d, false), light: () => [{ x: 960, y: 520, rx: 1300, ry: 650, i: 0.9, color: COOL }] },
  { fn: (c, k, lt, d) => desk(c, k, lt, d, false), light: () => [{ x: 1000, y: 520, rx: 1100, ry: 700, i: 0.9, color: COOL }] },
  { fn: lunch, light: () => [{ x: 1000, y: 620, rx: 1100, ry: 700, i: 0.9 }] },
  { fn: (c, k, lt, d) => desk(c, k, lt, d, true), light: () => [{ x: 1100, y: 500, rx: 900, ry: 650, i: 0.85, color: COOL }] },
  { fn: (c, k, lt, d) => subway(c, k, lt, d, true), light: () => [{ x: 1000, y: 500, rx: 1000, ry: 560, i: 0.75, color: COOL }] },
  { fn: bed, light: () => [{ x: 560, y: 600, rx: 600, ry: 460, i: 0.85, color: COOL }] },
  { fn: lightsOff, light: () => [{ x: 1080, y: 540, rx: 800, ry: 600, i: 0.8, color: [255, 220, 180] }] },
];

// ---------------- 地铁车窗：倒影 ----------------
const R0 = T0 + DAYS.reduce((a, d) => a + d.dur * SHOTS.length, 0); // 18.25
function reflection(ctx, lt, d) {
  fill(ctx, '#1e2322');
  // 车窗
  const X0 = 260, Y0 = 110, X1 = 1760, Y1 = 830;
  ctx.fillStyle = '#07090b';
  ctx.beginPath(); ctx.roundRect(X0, Y0, X1 - X0, Y1 - Y0, 40); ctx.fill();
  ctx.save();
  ctx.beginPath(); ctx.roundRect(X0, Y0, X1 - X0, Y1 - Y0, 40); ctx.clip();
  // 隧道：管线和一道道掠过的灯
  ctx.strokeStyle = 'rgba(70,74,70,0.5)';
  ctx.lineWidth = 4;
  for (const y of [260, 300, 690]) { ctx.beginPath(); ctx.moveTo(X0, y); ctx.lineTo(X1, y + 4); ctx.stroke(); }
  const r = rng(501);
  for (let i = 0; i < 9; i++) {
    const per = 0.55 + r() * 0.3, y = 200 + r() * 520;
    const x = X1 + 300 - (((lt + r() * per) % per) / per) * (X1 - X0 + 900);
    ctx.fillStyle = 'rgba(255,214,150,0.55)';
    ctx.filter = 'blur(3px)';
    ctx.fillRect(x, y, 420, 6);
    ctx.filter = 'none';
  }
  // 倒影：正对玻璃的人，说到「没有留在记忆里」时淡掉
  const fade = 1 - smooth(prog(d, 19.9, 21.2));
  ctx.globalCompositeOperation = 'screen';
  L.blurred(ctx, lerp(9, 2, fade), (c) => {
    c.translate(1160, 840);
    L.bust(c, { h: 1300, front: true, pal: { skin: '#a49a90', hair: '#2a2826', shirt: '#4a5056', jacket: '#4a5056' } });
    // 车厢里的扶杆和灯在玻璃上的反光
    c.fillStyle = '#4d5452';
    c.fillRect(600, -900, 14, 1200);
    c.fillStyle = '#9aa0a0';
    c.fillRect(-1200, -760, 3000, 8);
  }, 0.85 * fade + 0.05);
  ctx.globalCompositeOperation = 'source-over';
  // 玻璃上的一道冷光
  const g = ctx.createLinearGradient(X0, Y0, X1, Y1);
  g.addColorStop(0, 'rgba(200,220,230,0.06)');
  g.addColorStop(0.35, 'rgba(200,220,230,0)');
  ctx.fillStyle = g;
  ctx.fillRect(X0, Y0, X1 - X0, Y1 - Y0);
  ctx.restore();
  // 窗下的车厢壁
  ctx.fillStyle = '#2e3534';
  ctx.fillRect(0, 870, W, 210);
  // 前景：人物的后脑和肩膀（过肩）
  L.lit(ctx, (c) => {
    c.translate(420 + lt * 4, 1010);
    L.bust(c, { h: 1600, kind: 'adult', tilt: 0.08 });
  }, { light: -0.3, rim: [190, 210, 230], rimA: 0.85, rimW: 4, shadow: 0.55, ambient: 0.6, bbox: [60, 480, 760, 600] });
}

// ---------------- 序列 ----------------
const list = [];
let t = T0;
DAYS.forEach((D, di) => {
  SHOTS.forEach((S, si) => {
    const dur = D.dur;
    list.push({
      at: t,
      draw: (ctx, lt) => S.fn(ctx, clamp(lt / dur), lt + di * 0.37 + si * 0.11, D.day),
      light: (lt) => S.light(lt),
      grade: { warm: si === 9 ? 0.1 : -0.4, ambient: 0.22 },
    });
    t += dur;
  });
});
list.push({ at: R0, draw: (ctx, lt, d) => reflection(ctx, lt, d), light: () => [{ x: 1150, y: 520, rx: 1000, ry: 600, i: 0.95, color: COOL }, { x: 420, y: 800, rx: 560, ry: 420, i: 0.7 }], grade: { warm: -0.45, ambient: 0.2 } });
const seq = L.sequence(list, 0);

const S = { start: T0, end: 23.0 };
module.exports = { ...S, draw: (ctx, d) => seq.draw(ctx, d), light: (d) => seq.light(d), grade: (d) => seq.grade(d), R0 };
