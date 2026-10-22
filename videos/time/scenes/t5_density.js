// 第五幕 · 33.6–45.6 秒：记忆密度。
//   33.6–40.6 一条长走廊，两边墙上挂着刚才那些「第一次」，每一张上方一盏小灯；镜头缓慢向前。
//   40.6–42.2 镜头拉远：走廊缩小、照片变成一颗颗光点，落到一条时间轴上。
//   42.2–45.6 时间轴：左边「童年的一年」里密密麻麻全是光点，右边「成年的一年」只有几颗；
//             说到「这段时间往往就越长」时，左边那段被撑长，右边那段被压短。
const { createCanvas } = require('@napi-rs/canvas');
const L = require('../lib');
const { W, H, FONT, rng, noise1, lerp, clamp, prog, smooth } = L;
const first = require('./t4_first');

const S = { start: 33.4, end: 45.9 };
const C0 = 33.6, C1 = 40.6, P1 = 42.2;
const VX = 960, VY = 470, F = 820;
const WALL = 1.6, FLOOR = 1.0, CEIL = -1.25;

// 照片：用第四幕的七个场景（缓存成小图）
let pics = null;
function photos() {
  if (pics) return pics;
  pics = first.PANELS.map((fn, i) => {
    const c = createCanvas(first.PW, H);
    const x = c.getContext('2d');
    fn(x, 0.6 + i * 0.2);
    const s = createCanvas(472, 432);
    s.getContext('2d').drawImage(c, 0, 0, 472, 432);
    return s;
  });
  return pics;
}
// 12 张照片：左右墙各 6 张
const FRAMES = Array.from({ length: 12 }, (_, i) => ({ side: i % 2 ? 1 : -1, z0: 1.4 + Math.floor(i / 2) * 1.9 + (i % 2) * 0.5, pic: i % 7 }));

const proj = (X, Y, dz) => [VX + (X * F) / dz, VY + (Y * F) / dz];

function corridor(ctx, cz, t) {
  // 墙、地、天花板（远处更暗）
  ctx.fillStyle = '#2a201a';
  ctx.fillRect(0, 0, W, H);
  const far = 14;
  const quad = (pts, col) => { ctx.fillStyle = col; ctx.beginPath(); pts.forEach((p, i) => (i ? ctx.lineTo(...p) : ctx.moveTo(...p))); ctx.closePath(); ctx.fill(); };
  const n0 = 0.35, n1 = far;
  quad([proj(-WALL, CEIL, n0), proj(-WALL, FLOOR, n0), proj(-WALL, FLOOR, n1), proj(-WALL, CEIL, n1)], '#5a4636');
  quad([proj(WALL, CEIL, n0), proj(WALL, FLOOR, n0), proj(WALL, FLOOR, n1), proj(WALL, CEIL, n1)], '#5a4636');
  quad([proj(-WALL, FLOOR, n0), proj(WALL, FLOOR, n0), proj(WALL, FLOOR, n1), proj(-WALL, FLOOR, n1)], '#3e2e24');
  quad([proj(-WALL, CEIL, n0), proj(WALL, CEIL, n0), proj(WALL, CEIL, n1), proj(-WALL, CEIL, n1)], '#30261f');
  // 远处的门（一点暖光）
  const [fx0, fy0] = proj(-0.5, -0.4, n1), [fx1, fy1] = proj(0.5, FLOOR, n1);
  ctx.fillStyle = 'rgba(240,200,140,0.45)';
  ctx.fillRect(fx0, fy0, fx1 - fx0, fy1 - fy0);
  // 地板缝
  ctx.strokeStyle = 'rgba(20,14,10,0.4)';
  ctx.lineWidth = 2;
  for (let z = Math.ceil(cz * 2) / 2; z < cz + far; z += 0.5) {
    const dz = z - cz; if (dz < 0.4) continue;
    const [a0, b0] = proj(-WALL, FLOOR, dz), [a1] = proj(WALL, FLOOR, dz);
    ctx.beginPath(); ctx.moveTo(a0, b0); ctx.lineTo(a1, b0); ctx.stroke();
  }
  // 照片：远的先画
  const ps = photos();
  const list = FRAMES.map((f) => ({ ...f, dz: f.z0 - cz })).filter((f) => f.dz > 0.3).sort((a, b) => b.dz - a.dz);
  for (const f of list) {
    const X = f.side * (WALL - 0.01), Y0 = -0.55, Y1 = 0.35, Wd = 1.3;
    const img = ps[f.pic];
    const N = Math.round(clamp(90 / f.dz, 16, 90));
    // 画框
    const corners = [proj(X, Y0 - 0.05, f.dz - 0.05), proj(X, Y1 + 0.05, f.dz - 0.05), proj(X, Y1 + 0.05, f.dz + Wd + 0.05), proj(X, Y0 - 0.05, f.dz + Wd + 0.05)];
    quad(corners, '#1e1612');
    for (let s = 0; s < N; s++) {
      const za = f.dz + (s / N) * Wd, zb = f.dz + ((s + 1) / N) * Wd;
      if (za < 0.3) continue;
      const [xa, ya0] = proj(X, Y0, za), [, ya1] = proj(X, Y1, za);
      const [xb] = proj(X, Y0, zb);
      // 左墙：照片左边在近处；右墙：照片右边在近处
      const u = f.side < 0 ? s / N : 1 - (s + 1) / N;
      const sx = u * img.width, sw = img.width / N;
      ctx.drawImage(img, sx, 0, sw, img.height, Math.min(xa, xb), ya0, Math.abs(xb - xa) + 0.8, ya1 - ya0);
    }
    // 画框上方的小灯
    const [lx, ly] = proj(X - f.side * 0.05, Y0 - 0.22, f.dz + Wd / 2);
    const r = 320 / f.dz;
    const g = ctx.createRadialGradient(lx, ly, 0, lx, ly + r * 0.8, r * 1.8);
    g.addColorStop(0, 'rgba(255,214,150,0.35)');
    g.addColorStop(1, 'rgba(255,214,150,0)');
    ctx.fillStyle = g;
    ctx.fillRect(lx - r * 2, ly - r, r * 4, r * 4);
  }
  // 远处更暗（空气透视）
  const fog = ctx.createRadialGradient(VX, VY, 0, VX, VY, 260);
  fog.addColorStop(0, 'rgba(20,14,10,0.6)');
  fog.addColorStop(1, 'rgba(20,14,10,0)');
  ctx.fillStyle = fog;
  ctx.fillRect(VX - 300, VY - 300, 600, 600);
}

// 时间轴上的光点
const R = rng(551);
const KID = Array.from({ length: 46 }, () => ({ u: R(), s: 0.5 + R() * R() * 1.6, at: R() * 0.8 }));
const ADULT = [0.12, 0.38, 0.55, 0.81, 0.93].map((u) => ({ u, s: 0.55 + R() * 0.3 }));
function timeline(ctx, t, a) {
  if (a <= 0.01) return;
  const grow = smooth(prog(t, 43.0, 44.8));
  const y = 520;
  const x0 = 220, mid = lerp(960, 1160, grow), x1 = 1700;
  ctx.save();
  ctx.globalAlpha = a;
  // 两段轴
  ctx.fillStyle = 'rgba(230,200,150,0.55)';
  ctx.fillRect(x0, y - 1, mid - x0 - 30, 2);
  ctx.fillStyle = 'rgba(170,185,205,0.45)';
  ctx.fillRect(mid + 30, y - 1, x1 - mid - 30, 2);
  for (const x of [x0, mid - 30, mid + 30, x1]) { ctx.fillRect(x - 1, y - 12, 2, 24); }
  // 童年的一年：密密麻麻
  KID.forEach((k, i) => {
    const p = smooth(prog(t, P1 - 0.6 + k.at, P1 - 0.3 + k.at));
    if (p <= 0) return;
    const x = lerp(x0 + 20, mid - 50, k.u), yy = y + Math.sin(i * 2.3) * 26 * k.s;
    const r = 4 + 6 * k.s;
    const g = ctx.createRadialGradient(x, yy, 0, x, yy, r * 3);
    g.addColorStop(0, `rgba(255,220,160,${0.9 * p})`);
    g.addColorStop(0.3, `rgba(255,200,130,${0.4 * p})`);
    g.addColorStop(1, 'rgba(255,190,120,0)');
    ctx.fillStyle = g;
    ctx.fillRect(x - r * 3, yy - r * 3, r * 6, r * 6);
  });
  // 成年的一年：只有几颗，偏冷、偏暗
  ADULT.forEach((k, i) => {
    const p = smooth(prog(t, P1 + 0.3 + i * 0.12, P1 + 0.6 + i * 0.12));
    const x = lerp(mid + 50, x1 - 20, k.u);
    ctx.fillStyle = `rgba(190,205,225,${0.6 * p})`;
    ctx.beginPath(); ctx.arc(x, y, 5 * k.s + 2, 0, Math.PI * 2); ctx.fill();
  });
  ctx.font = FONT.body(32);
  ctx.letterSpacing = '4px';
  ctx.textAlign = 'center';
  ctx.fillStyle = 'rgba(232,214,184,0.8)';
  ctx.fillText('童年的一年', (x0 + mid) / 2, y + 110);
  ctx.fillStyle = 'rgba(190,200,215,0.7)';
  ctx.fillText('成年的一年', (mid + x1) / 2, y + 110);
  ctx.restore();
}

function draw(ctx, d) {
  const k = prog(d, C0, C1);
  const cz = lerp(-0.2, 4.6, k * k * (3 - 2 * k) * 0.3 + k * 0.7);
  const pull = smooth(prog(d, C1, P1));
  const enter = smooth(prog(d, C0 - 0.2, C0 + 0.5));
  ctx.fillStyle = '#100c0a';
  ctx.fillRect(0, 0, W, H);
  if (pull < 1) {
    ctx.save();
    ctx.globalAlpha = enter * (1 - pull);
    ctx.translate(W / 2, H / 2);
    const s = lerp(1, 0.18, pull);
    ctx.scale(s, s);
    ctx.translate(-W / 2, -H / 2 + pull * 300);
    corridor(ctx, cz, d);
    ctx.restore();
  }
  // 照片化成光点，飞向时间轴（拉远时）
  if (pull > 0 && pull < 1) {
    FRAMES.forEach((f, i) => {
      const sx = VX + f.side * (300 + i * 18) * (1 - pull), sy = VY + Math.sin(i) * 80 * (1 - pull);
      const tx = lerp(240, 900, KID[i].u), ty = 520;
      const x = lerp(sx, tx, pull), y = lerp(sy, ty, pull);
      ctx.fillStyle = `rgba(255,215,150,${0.8 * Math.sin(Math.PI * pull)})`;
      ctx.beginPath(); ctx.arc(x, y, lerp(30, 6, pull), 0, Math.PI * 2); ctx.fill();
    });
  }
  timeline(ctx, d, smooth(prog(d, C1 + 0.8, P1 + 0.2)) * (1 - smooth(prog(d, 45.3, 45.8))));
}

function light(d) {
  return [{ x: 960, y: 500, rx: 1300, ry: 820, i: 0.9, core: 0.4 }];
}
function grade(d) { return { warm: 0.25, ambient: d < C1 + 0.8 ? 0.4 : 0.5 }; }

module.exports = { ...S, draw, light, grade };
