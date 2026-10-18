// 《悲观主义》封面 · 三个方向（A 电影海报 / B 文艺纪录片 / C 杂志专题）。
//   node videos/pessimism/covers.js            → output/pessimism/cover_A.png / cover_B.png / cover_C.png
//   node videos/pessimism/covers.js B          → 只出 B
//
// 同一个主题、同一个房间，但画面是「提炼」过的：桌上只留一只盘子、一瓶酒、一只杯子；
// 每版只有一盏关键灯；人只是情绪支点。片名是设计过的字，不是压上去的字：
// 暖米白、不发光、极轻的压印缺墨；最后整张加一层很淡的纸纹与颗粒（字也在里面）。
process.argv.push('--video', 'pessimism');
const fs = require('fs');
const path = require('path');
const { createCanvas } = require('@napi-rs/canvas');
const { W, H } = require('../../src/config');
const { renderFrameV2 } = require('../../src/look2');
const { FONT } = require('../../src/lib/style');
const { rng } = require('../../src/lib/util');
const { mottle, filtered } = require('../../src/lib/material');
const party = require('./scenes/p1_party');
const { person } = require('./people');
const { withCam, toScreen, glassShape, bottle } = require('./lib');

const OUT = path.join(__dirname, '../../output/pessimism');
const INK = '#e8dec8';       // 片名：带一点旧纸感的暖米白
const INK_DIM = 'rgba(226,216,196,0.62)';

// ---------------- 画面（世界坐标，复用第一幕的房间） ----------------
const LOOK = { top: '#4a5246', bottom: '#24221f', hair: '#120e0b', hairStyle: 'short', skin: '#86624a' };

function floorLamp(ctx, x, y) {
  ctx.save();
  ctx.translate(x, y);
  ctx.fillStyle = '#16120f';
  ctx.fillRect(-3, -430, 6, 430);
  ctx.beginPath(); ctx.ellipse(0, 0, 44, 9, 0, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.moveTo(-38, -480); ctx.lineTo(38, -480); ctx.lineTo(60, -400); ctx.lineTo(-60, -400); ctx.closePath();
  ctx.fillStyle = '#6e5c44'; ctx.fill();
  ctx.restore();
}
function lampGlow(ctx, x, y, a = 1) {
  ctx.save();
  ctx.globalCompositeOperation = 'screen';
  const g = ctx.createRadialGradient(x, y - 400, 0, x, y - 400, 110);
  g.addColorStop(0, `rgba(255,226,176,${0.8 * a})`); g.addColorStop(0.35, `rgba(255,200,130,${0.25 * a})`); g.addColorStop(1, 'rgba(255,190,120,0)');
  ctx.fillStyle = g; ctx.fillRect(x - 110, y - 510, 220, 220);
  // 灯罩下沿的一道亮
  ctx.fillStyle = `rgba(255,232,190,${0.7 * a})`;
  ctx.beginPath(); ctx.ellipse(x, y - 400, 58, 7, 0, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
}
// 窗外的城市：比视频里更安静（灯更少、更暗、略虚）
const CITY = (() => { const r = rng(4141); return Array.from({ length: 34 }, () => ({ x: r(), y: r(), s: 0.8 + r() * 1.8, w: r() < 0.6, a: 0.2 + r() * 0.45 })); })();
function quietCity(ctx, blur = 1.2, gain = 1) {
  const x0 = 1447, x1 = 1740, y0 = 125, y1 = 439;
  filtered(ctx, `blur(${blur}px)`, (c) => {
    c.save();
    c.beginPath(); c.rect(x0, y0, x1 - x0, y1 - y0); c.clip();
    for (const p of CITY) {
      c.fillStyle = p.w ? `rgba(255,206,146,${p.a * gain})` : `rgba(186,202,228,${p.a * gain * 0.8})`;
      c.beginPath(); c.arc(x0 + p.x * (x1 - x0), y0 + 110 + p.y * (y1 - y0 - 120), p.s, 0, Math.PI * 2); c.fill();
    }
    c.restore();
  });
}

function room(ctx, o = {}) {
  party.setStatic({ close: 1, hall: 0, strings: 0 });
  party.wall(ctx);
  party.windowFrame(ctx, 30);
  party.floor(ctx);
  party.sofa(ctx);
  if (o.lamp) floorLamp(ctx, o.lamp[0], o.lamp[1]);
  person(ctx, o.hero[0], o.hero[1], o.hero[2], { sit: true, face: 1, lean: 0.52, hd: 0.42, arms: { near: [0.28, 1.45], far: [0.22, 1.35] }, ...LOOK, light: o.heroLight ?? -0.5, rim: o.heroRim ?? 0.45, rimCol: o.rimCol });
  if (o.table !== false) party.table(ctx, 30, { minimal: true, mess: 0 });
}

// 把一个「场景」交给第二版画面管线渲染：光照、色温、边缘柔化、暗角、胶片颗粒
function renderScene(sc) {
  const c = createCanvas(W, H);
  const ctx = c.getContext('2d');
  renderFrameV2(ctx, 30, 900, [{ start: -1e9, end: 1e9, ...sc }], () => {});
  return c;
}
const lights = (cam, list) => list.map((l) => { const [x, y] = toScreen(cam, l.x, l.y); return { ...l, x, y, rx: l.rx * cam.s, ry: l.ry * cam.s }; });

// ---------------- 海报的最后一层：纸纹 + 颗粒 + 柔和暗角（字也在里面） ----------------
const FINISH = (() => {
  const c = createCanvas(W, H);
  const x = c.getContext('2d');
  x.fillStyle = 'rgb(128,128,128)';
  x.fillRect(0, 0, W, H);
  mottle(x, W, H, 6, 51, 0.35, [96, 86, 72]);
  mottle(x, W, H, 40, 52, 0.18, [150, 140, 120]);
  const r = rng(53);
  const img = x.getImageData(0, 0, W, H);
  for (let i = 0; i < W * H; i++) {
    const n = (r() + r() - 1) * 26;
    img.data[i * 4] += n; img.data[i * 4 + 1] += n; img.data[i * 4 + 2] += n;
  }
  x.putImageData(img, 0, 0);
  // 纸纤维
  x.lineCap = 'round';
  for (let i = 0; i < 2600; i++) {
    const px = r() * W, py = r() * H, a = r() * Math.PI, len = 3 + r() * 10;
    x.strokeStyle = r() < 0.5 ? 'rgba(170,160,140,0.25)' : 'rgba(80,72,60,0.2)';
    x.lineWidth = 0.6;
    x.beginPath(); x.moveTo(px, py); x.lineTo(px + Math.cos(a) * len, py + Math.sin(a) * len); x.stroke();
  }
  return c;
})();
function finish(ctx, o = {}) {
  ctx.save();
  ctx.globalCompositeOperation = 'overlay';
  ctx.globalAlpha = o.paper ?? 0.32;
  ctx.drawImage(FINISH, 0, 0);
  ctx.restore();
  const vg = ctx.createRadialGradient(W / 2, H / 2, H * 0.42, W / 2, H / 2, H * 1.05);
  vg.addColorStop(0, 'rgba(0,0,0,0)');
  vg.addColorStop(1, `rgba(6,5,4,${o.vignette ?? 0.35})`);
  ctx.fillStyle = vg;
  ctx.fillRect(0, 0, W, H);
}

// 印刷感的字：先在离屏画好，再用极细的噪点让墨色有 ±10% 的不均，边缘轻微不齐。
// 不是「斑点」——近看才看得出墨没有完全吃透。
const pressCache = new Map();
function pressed(ctx, str, x, y, o) {
  const { font, color = INK, align = 'left', spacing = 0, seed = 1 } = o;
  const key = `${str}|${font}|${color}|${spacing}|${seed}`;
  let e = pressCache.get(key);
  if (!e) {
    const m = createCanvas(4, 4).getContext('2d');
    m.font = font; m.letterSpacing = `${spacing}px`;
    const tw = m.measureText(str).width, size = parseFloat(font);
    const w = Math.ceil(tw + size * 0.5), h = Math.ceil(size * 1.6);
    const c = createCanvas(w, h);
    const x2 = c.getContext('2d');
    x2.font = font; x2.letterSpacing = `${spacing}px`;
    x2.fillStyle = color;
    x2.fillText(str, size * 0.25, size * 1.18);
    const img = x2.getImageData(0, 0, w, h);
    const r = rng(seed);
    // 低频的墨量起伏 + 高频的纸纹
    const cw = Math.max(2, Math.round(w / 40)), ch = Math.max(2, Math.round(h / 40));
    const low = Array.from({ length: cw * ch }, () => r());
    for (let yy = 0; yy < h; yy++) for (let xx = 0; xx < w; xx++) {
      const i = (yy * w + xx) * 4;
      if (!img.data[i + 3]) continue;
      // 双线性插值，墨量起伏是连续的，不出方块
      const fx = (xx / w) * (cw - 1), fy = (yy / h) * (ch - 1);
      const x0 = Math.floor(fx), y0 = Math.floor(fy), x1 = Math.min(cw - 1, x0 + 1), y1 = Math.min(ch - 1, y0 + 1);
      const ax = fx - x0, ay = fy - y0;
      const v = (low[y0 * cw + x0] * (1 - ax) + low[y0 * cw + x1] * ax) * (1 - ay) + (low[y1 * cw + x0] * (1 - ax) + low[y1 * cw + x1] * ax) * ay;
      const k = 0.9 + v * 0.1 - (r() < 0.06 ? r() * 0.2 : r() * 0.05);
      img.data[i + 3] = Math.round(img.data[i + 3] * k);
    }
    x2.putImageData(img, 0, 0);
    e = { c, tw, ox: size * 0.25, oy: size * 1.18 };
    pressCache.set(key, e);
  }
  const left = align === 'center' ? x - e.tw / 2 : align === 'right' ? x - e.tw : x;
  ctx.drawImage(e.c, left - e.ox, y - e.oy);
}
// 逐字排的片名（每个字单独放，字距由我们控制；可横排、可竖排）
function titleChars(ctx, chars, pos, o) {
  chars.forEach((ch, i) => {
    const [x, y] = pos(i);
    pressed(ctx, ch, x, y, { font: o.font, color: o.color || INK, align: 'center', seed: 900 + i + (o.seed || 0) });
  });
}
function hairline(ctx, x0, y0, x1, y1, a = 0.5) {
  ctx.save();
  ctx.strokeStyle = `rgba(226,214,190,${a})`;
  ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.stroke();
  ctx.restore();
}
function text(ctx, s, x, y, o) {
  ctx.save();
  ctx.font = o.font;
  ctx.letterSpacing = `${o.ls ?? 0}px`;
  ctx.textAlign = o.align || 'left';
  ctx.textBaseline = 'alphabetic';
  ctx.fillStyle = o.color || INK_DIM;
  ctx.fillText(s, x, y);
  ctx.restore();
}

// ================= A · 电影海报 =================
// 2.39:1 画幅（上下黑边）。画面拉远：房间沉进黑暗，只有右下一盏落地灯照着他和桌角。
// 片名在上三分之一的暗处，宽字距、中等字重，像影院海报的片名；英文与副标题都极小。
function coverA() {
  const cam = { cx: 935, cy: 600, s: 0.9 };
  const HERO = [1585, 640, 290], LAMP = [1835, 772];
  const scene = renderScene({
    draw: (ctx) => withCam(ctx, cam, 1, () => room(ctx, { hero: HERO, lamp: LAMP, heroLight: -0.45, heroRim: 0.5 })),
    drawOver: (ctx) => withCam(ctx, cam, 1, () => { quietCity(ctx, 1.6, 0.7); lampGlow(ctx, LAMP[0], LAMP[1]); }),
    light: () => lights(cam, [
      { x: 1700, y: 600, rx: 560, ry: 470, i: 1, color: [255, 198, 136], core: 0.2 },
      { x: 1250, y: 820, rx: 420, ry: 150, i: 0.55, color: [255, 192, 130] },
      { x: 1615, y: 290, rx: 230, ry: 220, i: 0.35, color: [170, 190, 225] },
      { x: 960, y: 330, rx: 900, ry: 260, i: 0.16, color: [220, 200, 170] },
    ]),
    grade: () => ({ warm: 0.22, ambient: 0.1 }),
  });
  const c = createCanvas(W, H);
  const ctx = c.getContext('2d');
  ctx.drawImage(scene, 0, 0);
  // 片名
  const size = 150, adv = size + 92;
  titleChars(ctx, [...'悲观主义'], (i) => [W / 2 + (i - 1.5) * adv, 392], { font: FONT.serif(size) });
  text(ctx, 'P  E  S  S  I  M  I  S  M', W / 2, 206, { font: FONT.en(22), ls: 6, align: 'center', color: 'rgba(226,216,196,0.5)' });
  hairline(ctx, W / 2 - 34, 452, W / 2 + 34, 452, 0.45);
  text(ctx, '悲观的人，真的更清醒吗？', W / 2, 500, { font: FONT.body(26), ls: 9, align: 'center', color: 'rgba(226,216,196,0.58)' });
  finish(ctx, { paper: 0.26, vignette: 0.4 });
  // 2.39:1 黑边（放在最后，保持干净）
  const bar = Math.round((H - W / 2.39) / 2);
  ctx.fillStyle = '#0b0a09';
  ctx.fillRect(0, 0, W, bar);
  ctx.fillRect(0, H - bar, W, bar);
  text(ctx, 'A SHORT FILM', W / 2, H - bar / 2 + 7, { font: FONT.en(18), ls: 10, align: 'center', color: 'rgba(200,190,170,0.4)' });
  return c;
}

// ================= B · 文艺纪录片 =================
// 近景、浅景深：前景一只失焦的酒杯，中景他坐在沙发上，背后窗外的城市虚成光斑。
// 左侧大面积暗墙上竖排片名（站酷小薇，书卷气），旁边一条极细的暗红线和一行竖排小字。
function coverB() {
  const cam = { cx: 1390, cy: 575, s: 1.72 };
  const HERO = [1600, 640, 290], LAMP = [1835, 772];
  const scene = renderScene({
    draw: (ctx) => {
      withCam(ctx, cam, 1, () => room(ctx, { hero: HERO, lamp: LAMP, table: false, heroLight: -0.25, heroRim: 0.6 }));
      // 前景：桌角上的一只杯子和酒瓶，离镜头很近，失焦
      withCam(ctx, cam, 1.12, () => filtered(ctx, 'blur(9px)', (fc) => {
        fc.save(); fc.translate(1215, 850); glassShape(fc, 62, 108, { fill: 0.22, liquid: [150, 60, 36] }); fc.restore();
        fc.save(); fc.translate(1300, 842); bottle(fc, 36, 150, { col: [30, 54, 40], label: false }); fc.restore();
        fc.fillStyle = '#3a2c22'; fc.fillRect(900, 852, 600, 40);
      }));
    },
    drawOver: (ctx) => withCam(ctx, cam, 1, () => { quietCity(ctx, 4, 0.9); lampGlow(ctx, LAMP[0], LAMP[1], 0.8); }),
    light: () => lights(cam, [
      { x: 1835, y: 420, rx: 300, ry: 340, i: 1, color: [255, 200, 140], core: 0.25 },
      { x: 1660, y: 560, rx: 170, ry: 230, i: 0.5, color: [255, 196, 140] },
      { x: 1260, y: 840, rx: 220, ry: 100, i: 0.5, color: [255, 196, 134] },
      { x: 1600, y: 290, rx: 220, ry: 200, i: 0.42, color: [170, 190, 225] },
    ]),
    grade: () => ({ warm: 0.18, ambient: 0.08 }),
  });
  const c = createCanvas(W, H);
  const ctx = c.getContext('2d');
  ctx.drawImage(scene, 0, 0);
  // 左侧压暗一层，给竖排片名一块安静的底
  const g = ctx.createLinearGradient(0, 0, 900, 0);
  g.addColorStop(0, 'rgba(10,8,7,0.62)'); g.addColorStop(1, 'rgba(10,8,7,0)');
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  // 竖排片名
  const size = 132, adv = 178, x = 330, y0 = 300;
  titleChars(ctx, [...'悲观主义'], (i) => [x, y0 + i * adv], { font: FONT.xiaowei(size), seed: 20 });
  // 暗红细线 + 竖排小字
  ctx.fillStyle = 'rgba(150,44,34,0.85)';
  ctx.fillRect(452, 196, 2, 120);
  [...'悲观的人 真的更清醒吗'].forEach((ch, i) => text(ctx, ch, 470, 360 + i * 44, { font: FONT.body(28), align: 'left', color: 'rgba(226,216,196,0.6)' }));
  text(ctx, 'PESSIMISM', 268, 990, { font: FONT.enItalic(26), ls: 4, color: 'rgba(226,216,196,0.45)' });
  finish(ctx, { paper: 0.3, vignette: 0.32 });
  return c;
}

// ================= C · 杂志专题 =================
// 左栏是一页深色的纸：小栏目名 → 两行大片名「悲观 / 主义」→ 细线 → 导语；
// 右侧是一张有白边的「照片」：他背对窗外的城市，被窗光勾出轮廓，旁边一盏小灯。
function coverC() {
  const cam = { cx: 1430, cy: 505, s: 1.5 };
  const HERO = [1560, 640, 290], LAMP = [1835, 772];
  const scene = renderScene({
    draw: (ctx) => withCam(ctx, cam, 1, () => room(ctx, { hero: HERO, lamp: LAMP, heroLight: -1.25, heroRim: 0.7, rimCol: [196, 212, 236] })),
    drawOver: (ctx) => withCam(ctx, cam, 1, () => { quietCity(ctx, 1.4, 1.15); lampGlow(ctx, LAMP[0], LAMP[1], 0.9); }),
    light: () => lights(cam, [
      { x: 1615, y: 330, rx: 330, ry: 330, i: 0.85, color: [176, 196, 230], core: 0.3 },
      { x: 1760, y: 620, rx: 330, ry: 330, i: 0.8, color: [255, 196, 134] },
      { x: 1300, y: 820, rx: 330, ry: 120, i: 0.4, color: [255, 192, 130] },
    ]),
    grade: () => ({ warm: 0.0, ambient: 0.1 }),
  });
  const c = createCanvas(W, H);
  const ctx = c.getContext('2d');
  // 纸面底
  ctx.fillStyle = '#16130f';
  ctx.fillRect(0, 0, W, H);
  mottle(ctx, W, H, 5, 61, 0.25, [40, 34, 28]);
  // 右侧照片：白边 + 投影
  const P = { x: 820, y: 86, w: 1010, h: 908, b: 16 };
  ctx.save();
  ctx.shadowColor = 'rgba(0,0,0,0.6)'; ctx.shadowBlur = 40; ctx.shadowOffsetX = 14; ctx.shadowOffsetY = 18;
  ctx.fillStyle = '#d8cfbc';
  ctx.fillRect(P.x - P.b, P.y - P.b, P.w + P.b * 2, P.h + P.b * 2);
  ctx.restore();
  ctx.drawImage(scene, P.x, P.y, P.w, P.h, P.x, P.y, P.w, P.h);
  text(ctx, 'NIGHT, AFTER THE PARTY', P.x, P.y + P.h + P.b + 30, { font: FONT.enItalic(20), ls: 3, color: 'rgba(214,204,184,0.5)' });
  // 左栏排版
  const L = 112;
  text(ctx, '专题  ·  心理与情绪', L, 158, { font: FONT.body(24), ls: 8, color: 'rgba(226,216,196,0.7)' });
  text(ctx, 'NO. 03', 700, 158, { font: FONT.en(22), ls: 6, align: 'right', color: 'rgba(226,216,196,0.5)' });
  hairline(ctx, L, 186, 700, 186, 0.35);
  pressed(ctx, '悲观', L - 8, 452, { font: FONT.serifBlack(236), seed: 961, spacing: 18 });
  pressed(ctx, '主义', L - 8, 712, { font: FONT.serifBlack(236), seed: 962, spacing: 18 });
  hairline(ctx, L, 800, L + 90, 800, 0.6);
  text(ctx, '悲观的人，', L, 862, { font: FONT.body(34), ls: 6, color: 'rgba(232,222,204,0.86)' });
  text(ctx, '真的更清醒吗？', L, 914, { font: FONT.body(34), ls: 6, color: 'rgba(232,222,204,0.86)' });
  text(ctx, 'On pessimism, and grieving in advance.', L, 980, { font: FONT.enItalic(22), ls: 1, color: 'rgba(214,204,184,0.5)' });
  finish(ctx, { paper: 0.34, vignette: 0.22 });
  return c;
}

const ALL = { A: coverA, B: coverB, C: coverC };
const which = process.argv.slice(2).filter((a) => ALL[a]);
fs.mkdirSync(OUT, { recursive: true });
for (const k of which.length ? which : Object.keys(ALL)) {
  const file = path.join(OUT, `cover_${k}.png`);
  fs.writeFileSync(file, ALL[k]().toBuffer('image/png'));
  console.log(file);
}
