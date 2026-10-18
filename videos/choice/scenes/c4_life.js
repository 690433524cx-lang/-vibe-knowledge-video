// 第四幕 · 20.3–34 秒：从生活小事升级到人生选择。
//   走廊里剩下的两扇门 → 两封录用通知（焦点在两封信之间移动）——工作怎么选？
//   信的下沿撕下来，变成两张车票——城市怎么选？
//   车票的撕线拉长，变成俯瞰的两条夜路：一条有路灯，一条通向黑暗——越重要的选择……
//   左上角留白里写下「不会后悔的答案。」，暗红铅笔圈住「不会后悔」。
const { W, H } = require('../../../src/config');
const { C, FONT } = require('../../../src/lib/style');
const { pencil, sketchEllipse } = require('../../../src/lib/draw');
const { prog, smooth, easeInOut, lerp, rng, noise1 } = require('../../../src/lib/util');
const { spring } = require('../../../src/lib/motion');
const { sheet, inkText, filtered } = require('../../../src/lib/material');
const corridor = require('./c3_paradox');

const S = { start: 20.0, end: 35.6 };

// ---------------- 两封信 ----------------
const LETTERS = [
  { x: 690, y: 520, w: 430, h: 580, rot: -0.045, seed: 1201, head: '录用通知', tag: 'A',
    lines: [['月薪', '18,000'], ['稳定', ''], ['很忙，常常加班', '']] },
  { x: 1270, y: 575, w: 430, h: 580, rot: 0.05, seed: 1202, head: '录用通知', tag: 'B',
    lines: [['月薪', '12,000'], ['自由', ''], ['成长空间更大', '']] },
];

function letter(ctx, L, t, typed) {
  sheet(ctx, L.w, L.h, { seed: L.seed, tone: 'bone', light: -2.3, lift: 0.12, shade: 0.55, crease: true });
  const x0 = -L.w / 2 + 44;
  inkText(ctx, L.head, x0, -L.h / 2 + 76, { font: FONT.serif(30), color: '#2a221c', seed: L.seed + 1, wear: 0.5, spacing: 6 });
  inkText(ctx, L.tag, L.w / 2 - 44, -L.h / 2 + 76, { font: FONT.en(40), color: '#6b5e52', align: 'right', seed: L.seed + 2, wear: 0.3 });
  ctx.fillStyle = 'rgba(60,48,40,0.35)';
  ctx.fillRect(x0, -L.h / 2 + 100, L.w - 88, 1);
  // 几行模糊的正文（看不清的部分就是「信」的质感）
  const r = rng(L.seed + 3);
  for (let i = 0; i < 4; i++) {
    ctx.fillStyle = 'rgba(70,58,48,0.28)';
    ctx.fillRect(x0, -L.h / 2 + 134 + i * 24, (L.w - 88) * (0.6 + r() * 0.4), 5);
  }
  L.lines.forEach(([a, b], i) => {
    const k = smooth(prog(typed, i * 0.33, i * 0.33 + 0.3));
    if (k <= 0) return;
    const y = -L.h / 2 + 290 + i * 70;
    inkText(ctx, a, x0, y, { font: FONT.body(36), color: '#2a221c', seed: L.seed + 10 + i, wear: 0.4, spacing: 3, alpha: k });
    if (b) inkText(ctx, b, L.w / 2 - 44, y, { font: FONT.en(40), color: '#2a221c', align: 'right', seed: L.seed + 20 + i, wear: 0.3, alpha: k });
  });
}

// ---------------- 两张车票 ----------------
const TICKETS = [
  { x: 640, y: 470, w: 560, h: 236, rot: -0.03, seed: 1301, words: '熟悉  ·  安全  ·  稳定', tone: [206, 196, 172] },
  { x: 1280, y: 640, w: 560, h: 236, rot: 0.045, seed: 1302, words: '陌生  ·  可能性  ·  风险', tone: [186, 178, 160] },
];
function ticket(ctx, T, t) {
  sheet(ctx, T.w, T.h, { seed: T.seed, tone: T.tone, light: -2.2, lift: 0.1, shade: 0.5, rough: 2 });
  const x0 = -T.w / 2 + 34;
  inkText(ctx, '车  票', x0, -T.h / 2 + 52, { font: FONT.serif(26), color: '#3a3029', seed: T.seed + 1, wear: 0.6, spacing: 6 });
  inkText(ctx, 'No. 08 — 12F', T.w / 2 - 150, -T.h / 2 + 52, { font: FONT.type(18), color: '#6b5e52', seed: T.seed + 2, wear: 0.8 });
  // 目的地留白
  inkText(ctx, '→', x0, 0, { font: FONT.en(54), color: '#2a221c', seed: T.seed + 3, wear: 0.2 });
  pencil(ctx, [[x0 + 60, 6], [x0 + 300, 4]], { seed: T.seed + 4, t, width: 1.4, color: 'rgba(48,40,34,0.6)', passes: 1, pressure: 0.5 });
  inkText(ctx, T.words, x0, T.h / 2 - 40, { font: FONT.body(28), color: '#2a221c', seed: T.seed + 5, wear: 0.4, spacing: 2 });
  // 撕线
  ctx.save();
  ctx.setLineDash([6, 7]);
  ctx.strokeStyle = 'rgba(60,48,40,0.45)';
  ctx.lineWidth = 1.2;
  ctx.beginPath(); ctx.moveTo(T.w / 2 - 110, -T.h / 2 + 10); ctx.lineTo(T.w / 2 - 110, T.h / 2 - 10); ctx.stroke();
  ctx.restore();
}

// ---------------- 两条夜路（俯瞰） ----------------
const ROADS = {
  stable: [[930, 1150], [920, 860], [905, 560], [895, 260], [890, -60]],
  risk: [[960, 1150], [1010, 880], [1180, 700], [1320, 600], [1420, 420], [1600, 300], [1760, 120]],
};
function roadPts(pts, n = 60) {
  // Catmull-Rom 平滑
  const out = [];
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[Math.max(0, i - 1)], p1 = pts[i], p2 = pts[i + 1], p3 = pts[Math.min(pts.length - 1, i + 2)];
    for (let k = 0; k < n / pts.length; k++) {
      const u = k / (n / pts.length);
      const u2 = u * u, u3 = u2 * u;
      out.push([0, 1].map((j) => 0.5 * ((2 * p1[j]) + (-p0[j] + p2[j]) * u + (2 * p0[j] - 5 * p1[j] + 4 * p2[j] - p3[j]) * u2 + (-p0[j] + 3 * p1[j] - 3 * p2[j] + p3[j]) * u3)));
    }
  }
  out.push(pts[pts.length - 1]);
  return out;
}
const STABLE = roadPts(ROADS.stable), RISK = roadPts(ROADS.risk);

function drawRoad(ctx, pts, t, progress, width, seed) {
  if (progress <= 0) return;
  const n = Math.max(2, Math.floor(pts.length * progress));
  const p = pts.slice(0, n);
  ctx.save();
  ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  ctx.strokeStyle = 'rgba(92,82,72,0.95)';
  ctx.lineWidth = width;
  ctx.beginPath(); p.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y))); ctx.stroke();
  ctx.restore();
  // 路边线（铅笔）
  for (const side of [-1, 1]) {
    const e = p.map(([x, y], i) => {
      const [x2, y2] = p[Math.min(p.length - 1, i + 1)], [x1, y1] = p[Math.max(0, i - 1)];
      const dx = x2 - x1, dy = y2 - y1, L = Math.hypot(dx, dy) || 1;
      return [x - (dy / L) * side * width / 2, y + (dx / L) * side * width / 2];
    });
    pencil(ctx, e, { seed: seed + side, t, width: 2, color: 'rgba(232,218,192,0.75)', passes: 1, pressure: 0.5 });
  }
}

function lamps(ctx, t, k) {
  // 稳定的那条路：规律的路灯
  for (let i = 0; i < 9; i++) {
    const p = STABLE[Math.floor((i + 0.5) / 9 * (STABLE.length - 1))];
    const a = smooth(prog(k, i / 12, i / 12 + 0.2));
    if (a <= 0) continue;
    // 路灯照在路面上的一小块（偏向路的一侧），不是悬浮的光球
    const g = ctx.createRadialGradient(p[0] - 14, p[1], 0, p[0] - 14, p[1], 46);
    g.addColorStop(0, `rgba(255,214,150,${0.55 * a})`);
    g.addColorStop(1, 'rgba(255,214,150,0)');
    ctx.fillStyle = g;
    ctx.save(); ctx.translate(p[0] - 14, p[1]); ctx.scale(1, 0.55); ctx.translate(-(p[0] - 14), -p[1]);
    ctx.fillRect(p[0] - 70, p[1] - 50, 112, 100);
    ctx.restore();
    ctx.fillStyle = `rgba(255,236,200,${0.9 * a})`;
    ctx.beginPath(); ctx.arc(p[0] - 44, p[1], 3, 0, Math.PI * 2); ctx.fill();
  }
  // 冒险的那条：只有很远处一点光
  const e = RISK[RISK.length - 6];
  const a = smooth(prog(k, 0.6, 1)) * (0.8 + 0.2 * noise1(t * 2, 1400));
  const g = ctx.createRadialGradient(e[0], e[1], 0, e[0], e[1], 90);
  g.addColorStop(0, `rgba(255,220,170,${0.55 * a})`);
  g.addColorStop(1, 'rgba(255,220,170,0)');
  ctx.fillStyle = g;
  ctx.fillRect(e[0] - 90, e[1] - 90, 180, 180);
}

function draw(ctx, t) {
  // 1) 门 → 信
  const docIn = (i) => spring(t, 20.1 + i * 0.1, 2.3, 0.78);
  const toTicket = (i) => spring(t, 24.5 + i * 0.1, 1.6, 0.8);
  const kept = corridor.keptDoors(20.3);
  const toRoad = smooth(prog(t, 28.4, 29.4));
  if (t < 29.6) {
    // 摄影机：先看 A，再慢慢摇到 B（焦点也跟着过去）
    const pan = easeInOut(prog(t, 22.2, 23.6));
    ctx.save();
    ctx.translate(-pan * 60, 0);
    LETTERS.forEach((L, i) => {
      const k = Math.min(1, docIn(i));
      const tk = toTicket(i);
      if (tk >= 1 && t > 25.5) return;
      const D = kept[i];
      const x = lerp(D.x, L.x, k), y = lerp(D.y, L.y, k), w = lerp(D.w, L.w, k), h = lerp(D.h, L.h, k);
      ctx.save();
      ctx.globalAlpha *= (1 - smooth(prog(t, 24.5, 25.3)));
      const focus = i === 0 ? pan : 1 - pan;
      const paint = (c) => {
        c.translate(x, y);
        c.rotate(L.rot * k);
        if (k < 0.35) {
          const col = [44, 33, 25].map((v, j) => Math.round(lerp(v, [228, 220, 202][j], k / 0.35)));
          c.fillStyle = `rgb(${col.join(',')})`;
          c.fillRect(-w / 2, -h / 2, w, h);
        } else {
          c.scale(w / L.w, h / L.h);
          letter(c, L, t, prog(t, 20.9 + i * 0.6, 22.2 + i * 0.6));
        }
      };
      // 焦点在两封信之间转移：失焦的那封整体模糊一次
      if (t < 24.5 && focus > 0.05) filtered(ctx, `blur(${(focus * 3).toFixed(1)}px)`, paint);
      else paint(ctx);
      ctx.restore();
    });
    // 两封信之间的铅笔问号
    const q = prog(t, 23.3, 23.9);
    if (q > 0 && t < 24.6) {
      ctx.save();
      ctx.globalAlpha *= 1 - smooth(prog(t, 24.3, 24.6));
      inkText(ctx, '？', 990, 330, { font: FONT.hand(120), color: 'rgba(214,198,172,0.8)', align: 'center', seed: 1250, wear: 0.4, alpha: q });
      ctx.restore();
    }
    ctx.restore();
    // 2) 信 → 车票
    TICKETS.forEach((T, i) => {
      const k = toTicket(i);
      if (k <= 0) return;
      const L = LETTERS[i];
      const x = lerp(L.x, T.x, Math.min(1, k)), y = lerp(L.y + L.h / 2 - 60, T.y, Math.min(1, k));
      ctx.save();
      ctx.globalAlpha *= smooth(prog(t, 24.5, 25.0)) * (1 - toRoad);
      ctx.translate(x, y);
      ctx.rotate(lerp(L.rot, T.rot, Math.min(1, k)));
      const sc = lerp(0.7, 1, Math.min(1, k));
      ctx.scale(sc, sc * (1 - toRoad * 0.8));
      ticket(ctx, T, t);
      ctx.restore();
    });
  }
  // 3) 车票 → 两条夜路
  if (t > 28.4) {
    const pull = 1 + 0.1 * (1 - easeInOut(prog(t, 28.6, 34.0)));
    ctx.save();
    ctx.translate(W / 2, H / 2);
    ctx.scale(pull, pull);
    ctx.translate(-W / 2, -H / 2);
    ctx.globalAlpha *= toRoad * (1 - smooth(prog(t, 34.6, 35.5)));
    drawRoad(ctx, STABLE, t, spring(t, 28.6, 0.9, 1.0), 76, 1401);
    drawRoad(ctx, RISK, t, spring(t, 28.8, 0.8, 1.0), 68, 1403);
    // 稳定的那条路上，一辆车的车灯慢慢往前开
    const cp = prog(t, 29.6, 34.6);
    if (cp > 0 && cp < 1) {
      const p = STABLE[Math.floor((1 - cp) * (STABLE.length - 1))];
      for (const dx of [-9, 9]) {
        const g = ctx.createRadialGradient(p[0] + dx, p[1], 0, p[0] + dx, p[1], 22);
        g.addColorStop(0, 'rgba(255,240,210,0.95)');
        g.addColorStop(1, 'rgba(255,240,210,0)');
        ctx.fillStyle = g;
        ctx.fillRect(p[0] + dx - 22, p[1] - 22, 44, 44);
      }
    }
    lamps(ctx, t, prog(t, 29.2, 31.5));
    const la = smooth(prog(t, 30.0, 30.8));
    inkText(ctx, '稳定', 812, 640, { font: FONT.body(38), color: '#cbbfa8', align: 'right', seed: 1410, wear: 0.2, spacing: 6, alpha: la });
    inkText(ctx, '冒险', 1262, 770, { font: FONT.body(38), color: '#cbbfa8', seed: 1411, wear: 0.2, spacing: 6, alpha: la });
    ctx.restore();
    // 左上的留白里：不会后悔的答案。
    const hk = prog(t, 32.4, 33.2);
    if (hk > 0) {
      ctx.save();
      ctx.globalAlpha *= 1 - smooth(prog(t, 34.6, 35.4));
      ctx.font = FONT.hand(76);
      const w = ctx.measureText('不会后悔的答案。').width;
      ctx.beginPath(); ctx.rect(150, 160, w * Math.min(1, hk * 1.2) + 10, 140); ctx.clip();
      ctx.fillStyle = '#e6dac3';
      ctx.fillText('不会后悔的答案。', 160, 260);
      ctx.restore();
      ctx.font = FONT.hand(76);
      const w4 = ctx.measureText('不会后悔').width;
      sketchEllipse(ctx, 160 + w4 / 2, 236, w4 / 2 + 26, 54, { seed: 1420, t, width: 3, color: C.subRed, progress: easeInOut(prog(t, 33.0, 33.7)), alpha: 1 - smooth(prog(t, 34.6, 35.4)), pressure: 0.6 });
    }
  }
}

function light(t) {
  const docs = smooth(prog(t, 20.1, 20.8)) * (1 - smooth(prog(t, 28.6, 29.4)));
  const pan = easeInOut(prog(t, 22.2, 23.6));
  const road = smooth(prog(t, 28.6, 29.6)) * (1 - smooth(prog(t, 34.6, 35.5)));
  return [
    { x: lerp(760, 1180, pan), y: 560, rx: 760, ry: 560, i: 0.95, w: docs, rot: 0.15 },
    { x: 1080, y: 560, rx: 1050, ry: 680, i: 1, w: road, color: [255, 200, 140] },
    { x: 360, y: 230, rx: 520, ry: 220, i: 0.6, w: road * smooth(prog(t, 32.2, 33)) },
  ];
}
function grade(t) { return { warm: lerp(0.25, -0.15, smooth(prog(t, 28.6, 30))), ambient: 0.1 }; }

module.exports = { ...S, draw, light, grade, STABLE, RISK, drawRoad };
