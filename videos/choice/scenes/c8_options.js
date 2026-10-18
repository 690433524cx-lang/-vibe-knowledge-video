// 第八幕 · 68.1–74.6：桌上一枚图钉是「你」。五张旧照片——五种可能的人生（海、城市、田野、山路、一扇窗）。
// 每多一张照片，就多一根从你拉出去的细线——放弃线。你选了 A：A 被拿近、亮起来；
// 其余褪色、变暗，却还留在那里；旁边一句句浮现「B 会不会更好？」……
// 第九幕 · 74.4–81.6：镜头落到一张折过的旧城市地图上。A 的路是一道暗红铅笔线；
// 没选的路用铅笔一条条画出来，越画越多，尽头写着「如果当初……」。
// T2（你是在逃避选错）：所有铅笔路线被擦掉，只剩 A 那一条。
const { createCanvas } = require('@napi-rs/canvas');
const { W, H } = require('../../../src/config');
const { C, FONT } = require('../../../src/lib/style');
const { pencil } = require('../../../src/lib/draw');
const { prog, smooth, easeInOut, lerp, rng, noise1 } = require('../../../src/lib/util');
const { spring } = require('../../../src/lib/motion');
const { sheet, sheetTexture, silverGrain, inkText, filtered } = require('../../../src/lib/material');

const T2 = 79.8; // 第二个小重拍（弱于 MAIN_BEAT_T），之后可单独对齐
const S = { start: 68.0, end: 82.2 };

// ---------------- 五张照片 ----------------
const PIN = [400, 560];
const PHOTOS = [
  { k: 'A', x: 1000, y: 330, w: 280, h: 340, rot: -0.05, at: 68.4, scene: 'sea' },
  { k: 'B', x: 1330, y: 300, w: 250, h: 310, rot: 0.06, at: 68.85, scene: 'city', q: 'B 会不会更好？', qa: 72.9 },
  { k: 'C', x: 1610, y: 470, w: 240, h: 300, rot: -0.03, at: 69.3, scene: 'field', q: 'C 是不是更值？', qa: 73.5 },
  { k: 'D', x: 1180, y: 700, w: 260, h: 320, rot: 0.04, at: 69.75, scene: 'road', q: 'D 是不是更适合我？', qa: 74.1 },
  { k: 'E', x: 1520, y: 800, w: 230, h: 290, rot: -0.07, at: 70.2, scene: 'window' },
];
const CHOOSE = 71.4;

// 程序生成的「旧照片」：没有人，只有一种生活的样子；银盐颗粒、偏暖的黑白
function scene(kind, w, h, seed) {
  const c = createCanvas(w, h);
  const x = c.getContext('2d');
  const r = rng(seed);
  const sky = x.createLinearGradient(0, 0, 0, h);
  if (kind === 'sea') {
    sky.addColorStop(0, '#9d958a'); sky.addColorStop(0.5, '#c9c0b2'); sky.addColorStop(0.52, '#57524c'); sky.addColorStop(1, '#2b2825');
    x.fillStyle = sky; x.fillRect(0, 0, w, h);
    for (let i = 0; i < 40; i++) { x.fillStyle = `rgba(230,222,206,${0.1 + r() * 0.25})`; x.fillRect(w * 0.35 + r() * w * 0.3, h * 0.55 + r() * h * 0.4, 6 + r() * 20, 1.5); }
  } else if (kind === 'city') {
    sky.addColorStop(0, '#1d1b19'); sky.addColorStop(1, '#3a3631');
    x.fillStyle = sky; x.fillRect(0, 0, w, h);
    for (let i = 0; i < 14; i++) { const bw = 14 + r() * 30, bh = h * (0.2 + r() * 0.5); x.fillStyle = '#141210'; x.fillRect(r() * w, h - bh, bw, bh); }
    for (let i = 0; i < 70; i++) { const g = x.createRadialGradient(0, 0, 0, 0, 0, 6); x.save(); x.translate(r() * w, h * 0.3 + r() * h * 0.7); g.addColorStop(0, `rgba(240,220,180,${0.3 + r() * 0.5})`); g.addColorStop(1, 'rgba(240,220,180,0)'); x.fillStyle = g; x.fillRect(-6, -6, 12, 12); x.restore(); }
  } else if (kind === 'field') {
    sky.addColorStop(0, '#b9b1a3'); sky.addColorStop(0.62, '#d6cdbd'); sky.addColorStop(0.63, '#6b6459'); sky.addColorStop(1, '#3d3934');
    x.fillStyle = sky; x.fillRect(0, 0, w, h);
    x.fillStyle = '#26231f';
    x.fillRect(w * 0.62, h * 0.38, 4, h * 0.26);
    x.beginPath(); x.ellipse(w * 0.625, h * 0.36, 34, 28, 0, 0, Math.PI * 2); x.fill();
  } else if (kind === 'road') {
    sky.addColorStop(0, '#a8a092'); sky.addColorStop(0.45, '#8f887c'); sky.addColorStop(0.46, '#4a4540'); sky.addColorStop(1, '#2a2723');
    x.fillStyle = sky; x.fillRect(0, 0, w, h);
    x.fillStyle = '#5c5650';
    x.beginPath(); x.moveTo(w * 0.47, h * 0.46); x.lineTo(w * 0.53, h * 0.46); x.lineTo(w * 0.95, h); x.lineTo(w * 0.05, h); x.closePath(); x.fill();
    x.strokeStyle = 'rgba(230,220,200,0.6)'; x.setLineDash([10, 12]); x.lineWidth = 2;
    x.beginPath(); x.moveTo(w * 0.5, h * 0.47); x.lineTo(w * 0.5, h); x.stroke();
  } else {
    sky.addColorStop(0, '#2b2724'); sky.addColorStop(1, '#1c1a18');
    x.fillStyle = sky; x.fillRect(0, 0, w, h);
    const g = x.createLinearGradient(0, h * 0.2, 0, h * 0.75);
    g.addColorStop(0, '#d9d0bf'); g.addColorStop(1, '#a59c8c');
    x.fillStyle = g; x.fillRect(w * 0.22, h * 0.18, w * 0.56, h * 0.56);
    x.fillStyle = '#1f1c19'; x.fillRect(w * 0.49, h * 0.18, 6, h * 0.56); x.fillRect(w * 0.22, h * 0.45, w * 0.56, 6);
  }
  silverGrain(x, 0, 0, w, h, 1, seed);
  const vg = x.createRadialGradient(w / 2, h / 2, h * 0.2, w / 2, h / 2, h * 0.75);
  vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(0,0,0,0.45)');
  x.fillStyle = vg; x.fillRect(0, 0, w, h);
  x.globalCompositeOperation = 'soft-light';
  x.fillStyle = 'rgba(255,210,160,0.25)'; x.fillRect(0, 0, w, h);
  return c;
}
const IMGS = PHOTOS.map((p, i) => scene(p.scene, p.w - 28, p.h - 74, 1800 + i));

function photo(ctx, p, i, t) {
  sheet(ctx, p.w, p.h, { seed: 1810 + i, tone: 'photo', light: -2.3, lift: 0.2, shade: 0.45, rough: 1 });
  ctx.drawImage(IMGS[i], -p.w / 2 + 14, -p.h / 2 + 14);
  inkText(ctx, p.k, -p.w / 2 + 18, p.h / 2 - 20, { font: FONT.en(34), color: '#3a3029', seed: 1820 + i, wear: 0.2 });
}

// ---------------- 地图 ----------------
const MAP = { x: 1000, y: 500, w: 1560, h: 690, rot: -0.018 }; // 上下留出暗处给字幕
const MAP_TEX = (() => {
  const tex = sheetTexture(MAP.w, MAP.h, 1850, 'warm', { crease: true });
  const c = createCanvas(tex.canvas.width, tex.canvas.height);
  const x = c.getContext('2d');
  x.drawImage(tex.canvas, 0, 0);
  x.translate(tex.pad, tex.pad);
  const r = rng(1851);
  // 河
  x.strokeStyle = 'rgba(110,120,120,0.35)'; x.lineWidth = 34;
  x.beginPath(); x.moveTo(-20, MAP.h * 0.7); x.bezierCurveTo(MAP.w * 0.3, MAP.h * 0.5, MAP.w * 0.6, MAP.h * 0.95, MAP.w + 20, MAP.h * 0.62); x.stroke();
  // 街道
  x.strokeStyle = 'rgba(80,66,52,0.28)';
  for (let i = 0; i < 26; i++) { x.lineWidth = r() < 0.3 ? 3 : 1.2; const y = r() * MAP.h; x.beginPath(); x.moveTo(0, y); x.lineTo(MAP.w, y + (r() - 0.5) * 140); x.stroke(); }
  for (let i = 0; i < 30; i++) { x.lineWidth = r() < 0.3 ? 3 : 1.2; const xx = r() * MAP.w; x.beginPath(); x.moveTo(xx, 0); x.lineTo(xx + (r() - 0.5) * 140, MAP.h); x.stroke(); }
  // 街区
  for (let i = 0; i < 90; i++) { x.fillStyle = `rgba(90,74,58,${0.05 + r() * 0.06})`; x.fillRect(r() * MAP.w, r() * MAP.h, 20 + r() * 50, 14 + r() * 40); }
  // 折痕
  x.strokeStyle = 'rgba(60,46,34,0.18)'; x.lineWidth = 1.5;
  for (const f of [1 / 3, 2 / 3]) { x.beginPath(); x.moveTo(MAP.w * f, 0); x.lineTo(MAP.w * f, MAP.h); x.stroke(); }
  x.beginPath(); x.moveTo(0, MAP.h / 2); x.lineTo(MAP.w, MAP.h / 2); x.stroke();
  x.font = FONT.en(22); x.fillStyle = 'rgba(70,58,48,0.6)'; x.letterSpacing = '8px';
  x.fillText('CITY  MAP  ·  1:12 000', 40, MAP.h - 30);
  return { canvas: c, pad: tex.pad };
})();
const MAP_START = [MAP.x - MAP.w / 2 + 190, MAP.y + 40];
const A_ROUTE = (() => {
  const pts = [MAP_START];
  let x = MAP_START[0], y = MAP_START[1];
  const r = rng(1860);
  while (x < MAP.x + MAP.w / 2 - 140) { x += 70; y += (r() - 0.6) * 26; pts.push([x, y]); }
  return pts;
})();
const ROUTES = (() => {
  const r = rng(1870);
  const out = [];
  for (let i = 0; i < 30; i++) {
    const src = i < 8 ? MAP_START : out[Math.floor(r() * out.length)].pts[3 + Math.floor(r() * 4)];
    const pts = [src];
    let [x, y] = src;
    const dir = (r() - 0.5) * 1.6 + (r() < 0.5 ? 0.6 : -0.6);
    for (let k = 0; k < 9 + Math.floor(r() * 7); k++) {
      x += 50 + r() * 40; y += Math.sin(dir) * 40 + (r() - 0.5) * 30;
      x = Math.min(x, MAP.x + MAP.w / 2 - 60); y = Math.max(MAP.y - MAP.h / 2 + 50, Math.min(MAP.y + MAP.h / 2 - 50, y));
      pts.push([x, y]);
    }
    out.push({ pts, at: 75.0 + Math.pow(i / 30, 0.8) * 4.2, label: i % 3 === 0 });
  }
  return out;
})();

function cam(t) {
  const down = easeInOut(prog(t, 74.4, 75.4));
  return { s: lerp(1, 0.96, down), dy: lerp(0, -10, down) };
}

function draw(ctx, t) {
  const out = 1 - smooth(prog(t, 81.4, 82.2));
  const chosen = smooth(prog(t, CHOOSE, CHOOSE + 0.6));
  const toMap = smooth(prog(t, 74.4, 75.2));
  ctx.save();
  ctx.globalAlpha *= out;

  // ---- 地图（第九幕）----
  if (toMap > 0) {
    ctx.save();
    ctx.globalAlpha *= toMap;
    ctx.translate(MAP.x, MAP.y);
    ctx.rotate(MAP.rot);
    ctx.drawImage(MAP_TEX.canvas, -MAP.w / 2 - MAP_TEX.pad, -MAP.h / 2 - MAP_TEX.pad);
    ctx.rotate(-MAP.rot);
    ctx.translate(-MAP.x, -MAP.y);
    // 没选的路：铅笔，越画越多；T2 被擦掉（留下一点擦痕）
    const erase = t >= T2 ? smooth(prog(t, T2, T2 + 0.22)) : 0;
    ROUTES.forEach((ro, i) => {
      const p = prog(t, ro.at, ro.at + 1.2);
      if (p <= 0) return;
      pencil(ctx, ro.pts, { seed: 1880 + i, t, width: 1.8, color: 'rgba(48,40,34,0.75)', progress: p, passes: 2, alpha: 1 - erase * 0.9, pressure: 0.6, boil: t < T2 });
      if (ro.label && p > 0.9) {
        const q = ro.pts[ro.pts.length - 1];
        inkText(ctx, '如果当初……', q[0] - 150, q[1] - 12, { font: FONT.hand(30), color: '#3a3029', seed: 1890 + i, wear: 0.1, alpha: (1 - erase) * smooth(prog(t, ro.at + 1.0, ro.at + 1.4)) });
      }
    });
    // A 的路：暗红铅笔
    pencil(ctx, A_ROUTE, { seed: 1895, t, width: 3.4, color: C.red, progress: prog(t, 74.9, 76.3), passes: 2, pressure: 0.7 });
    ctx.fillStyle = '#6e1f19';
    ctx.beginPath(); ctx.arc(MAP_START[0], MAP_START[1], 9, 0, Math.PI * 2); ctx.fill();
    inkText(ctx, '你', MAP_START[0] - 14, MAP_START[1] + 48, { font: FONT.body(32), color: '#2a221c', seed: 1896, spacing: 4 });
    ctx.restore();
  }

  // ---- 照片与放弃线（第八幕）----
  const photosOut = smooth(prog(t, 74.2, 74.9));
  if (photosOut < 1) {
    ctx.save();
    ctx.globalAlpha *= 1 - photosOut;
    // 放弃线
    PHOTOS.forEach((p, i) => {
      const isA = i === 0;
      const lp = prog(t, p.at, p.at + 0.4);
      if (lp <= 0) return;
      const end = [p.x - p.w / 2 + 10, p.y - p.h / 2 + 18];
      pencil(ctx, [PIN, end], {
        seed: 1830 + i, t, width: isA ? lerp(1.6, 2.6, chosen) : 1.5,
        color: isA ? `rgba(${Math.round(lerp(226, 255, chosen))},${Math.round(lerp(212, 214, chosen))},${Math.round(lerp(190, 160, chosen))},0.9)` : `rgba(226,212,190,${lerp(0.75, 0.3, chosen)})`,
        progress: lp, passes: 1, pressure: 0.3, boil: chosen < 1,
      });
    });
    // 照片：没选的先画（在下面），A 最后画
    [4, 3, 2, 1, 0].forEach((i) => {
      const p = PHOTOS[i];
      const k = spring(t, p.at, 2.6, 0.7);           // 照片：有一点惯性
      if (k <= 0) return;
      const isA = i === 0;
      const lift = isA ? chosen : 0;
      ctx.save();
      ctx.globalAlpha *= Math.min(1, k * 1.5);
      const paint = (c) => {
        c.translate(p.x - lift * 40, p.y + (1 - Math.min(1, k)) * -30 - lift * 10);
        c.rotate(p.rot * (1 - lift * 0.6));
        c.scale(1 + lift * 0.08, 1 + lift * 0.08);
        photo(c, p, i, t);
      };
      if (!isA && chosen > 0.02) filtered(ctx, `grayscale(${(0.6 * chosen).toFixed(2)}) brightness(${(1 - 0.5 * chosen).toFixed(2)})`, paint);
      else paint(ctx);
      ctx.restore();
    });
    // 影子旁的念头（画在所有照片之上）
    PHOTOS.forEach((p) => {
      if (!p.q) return;
      {
        const qa = smooth(prog(t, p.qa, p.qa + 0.5));
        if (qa > 0) {
          ctx.save();
          ctx.font = FONT.hand(44);
          const w = ctx.measureText(p.q).width;
          // 念头写在左边的空处（线的上方），一句一行，不压住照片
          const qi = ['B', 'C', 'D'].indexOf(p.k);
          const tx = 400, ty = 300 + qi * 92;
          ctx.beginPath(); ctx.rect(tx - 6, ty - 60, (w + 12) * Math.min(1, prog(t, p.qa, p.qa + 0.7) * 1.3), 90); ctx.clip();
          ctx.globalAlpha *= qa;
          ctx.fillStyle = '#e2d6c0';
          ctx.shadowColor = 'rgba(0,0,0,0.7)'; ctx.shadowBlur = 10;
          ctx.fillText(p.q, tx, ty);
          ctx.restore();
        }
      }
    });
    // 图钉：你
    const ya = smooth(prog(t, 68.1, 68.5));
    ctx.save();
    ctx.globalAlpha *= ya;
    ctx.fillStyle = '#7a2a1f';
    ctx.shadowColor = 'rgba(0,0,0,0.6)'; ctx.shadowBlur = 8; ctx.shadowOffsetY = 4;
    ctx.beginPath(); ctx.arc(PIN[0], PIN[1], 11, 0, Math.PI * 2); ctx.fill();
    ctx.shadowBlur = 0; ctx.shadowOffsetY = 0;
    ctx.fillStyle = 'rgba(255,220,200,0.6)';
    ctx.beginPath(); ctx.arc(PIN[0] - 3, PIN[1] - 3, 3, 0, Math.PI * 2); ctx.fill();
    ctx.font = FONT.body(38);
    ctx.letterSpacing = '4px';
    ctx.textAlign = 'center';
    ctx.fillStyle = '#efe4cf';
    ctx.fillText('你', PIN[0], PIN[1] + 70);
    ctx.restore();
    ctx.restore();
  }
  ctx.restore();
}

function light(t) {
  const out = 1 - smooth(prog(t, 81.4, 82.2));
  const chosen = smooth(prog(t, CHOOSE, CHOOSE + 0.6));
  const toMap = smooth(prog(t, 74.4, 75.2));
  return [
    { x: 520, y: 560, rx: 520, ry: 420, i: 0.8, w: out * smooth(prog(t, 68.0, 68.6)) * (1 - toMap) },
    { x: 1300, y: 560, rx: 820, ry: 600, i: 0.95, w: out * smooth(prog(t, 68.4, 69.2)) * (1 - toMap) * (1 - chosen * 0.35) },
    { x: 1000, y: 340, rx: 420, ry: 420, i: 1, w: out * chosen * (1 - toMap) },
    { x: 1000, y: 540, rx: 1150, ry: 640, i: 0.95, w: out * toMap * (t >= T2 ? 1 - 0.2 * smooth(prog(t, T2, T2 + 0.3)) : 1) },
  ];
}
function grade(t) { return { warm: lerp(-0.05, 0.25, smooth(prog(t, 74.4, 75.4))), ambient: 0.1 }; }

module.exports = { ...S, draw, light, grade, T2 };
