// 第二幕 · 4.45–16.6 秒：进入回忆 → 真实照片压上来 → 左右比对 → 「确定」盖在错的那张上。
//   4.45–8.8  记忆本身：下雨、红外套、孩子站在沙发前。暖、柔、边缘化开。
//   8.8–10.2  一张冲印照片从右下滑进来：晴天、藏青外套、孩子站在窗边。
//   10.2–11.2 镜头拉远到桌面：左「记忆」，右「照片」。
//   11.0–12.6 蜡笔依次圈出三处不同：外套、窗外、孩子的位置。
//   13.9      红色印章「确定」盖在记忆（错的那张）上。
const L = require('../lib');
const { W, H, FONT, rng, noise1, lerp, clamp, prog, smooth } = L;

const S = { start: 4.45, end: 16.7 };
const SLIDE = 8.8, PULL0 = 10.15, PULL1 = 11.25, STAMP = 13.9, OUT0 = 15.9, OUT1 = 16.6;
const LEFT = { x: 500, y: 430, w: 800, rot: -0.02 };
const RIGHT = { x: 1420, y: 440, w: 800, rot: 0.022 };
const MARKS = [
  { t: 11.0, mem: [770, 560, 92, 210], tru: [770, 560, 92, 210] },     // 外套
  { t: 11.55, mem: [1450, 430, 245, 250], tru: [1450, 430, 245, 250] }, // 窗外
  { t: 12.1, mem: [430, 720, 95, 190], tru: [1150, 720, 95, 190] },    // 孩子站在哪
];

const ease = (k) => (k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2);

function memRect(d) {
  const k = ease(prog(d, PULL0, PULL1));
  // 回忆里：缓慢推近 + 横移
  const s = 1 + 0.06 * smooth(prog(d, 4.45, 10.2));
  const full = { x: W / 2 - 40 * smooth(prog(d, 4.45, 10.2)), y: H / 2, w: W * s, rot: 0 };
  return { x: lerp(full.x, LEFT.x, k), y: lerp(full.y, LEFT.y, k), w: lerp(full.w, LEFT.w, k), rot: lerp(0, LEFT.rot, k), k };
}
function truthRect(d) {
  const a = L.spring(d, SLIDE, 1.5, 0.82);
  const rest = { x: 1290, y: 610, w: 880, rot: -0.05 };
  const from = { x: 2400, y: 1320, w: 880, rot: 0.26 };
  const r0 = { x: lerp(from.x, rest.x, a), y: lerp(from.y, rest.y, a), w: rest.w, rot: lerp(from.rot, rest.rot, a) };
  const k = ease(prog(d, PULL0, PULL1));
  return { x: lerp(r0.x, RIGHT.x, k), y: lerp(r0.y, RIGHT.y, k), w: lerp(r0.w, RIGHT.w, k), rot: lerp(r0.rot, RIGHT.rot, k) };
}

// 窗上的雨（图像坐标），只在回忆全屏时画，让雨是活的
function rain(ctx, t, a) {
  const { x: wx, y: wy, w: ww, h: wh } = L.WIN;
  const r = rng(91);
  ctx.save();
  ctx.beginPath(); ctx.rect(wx + 8, wy + 8, ww - 16, wh - 16); ctx.clip();
  ctx.lineCap = 'round';
  for (let i = 0; i < 120; i++) {
    const sx = r(), sy = r(), sp = 0.7 + r() * 0.6, len = 26 + r() * 34;
    const px = wx + ((sx * ww + t * 70 * sp) % ww);
    const py = wy + ((sy * (wh + 80) + t * 1100 * sp) % (wh + 80)) - 40;
    ctx.strokeStyle = `rgba(226,234,240,${(0.25 + r() * 0.3) * a})`;
    ctx.lineWidth = 1.2 + r() * 1.2;
    ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(px - len * 0.18, py + len); ctx.stroke();
  }
  ctx.restore();
}

function draw(ctx, d) {
  const out = smooth(prog(d, OUT0, OUT1));
  const enter = smooth(prog(d, 4.45, 4.72));
  const mem = L.snapshot(1, 'memory');
  const truth = L.snapshot(0, 'photo');
  const M = memRect(d);

  ctx.save();
  ctx.globalAlpha = enter * (1 - out);
  // 记忆
  ctx.save();
  ctx.translate(M.x, M.y);
  ctx.rotate(M.rot);
  ctx.save();
  ctx.globalAlpha *= 1 - M.k;
  L.print(ctx, mem, M.w, { border: 0 });
  ctx.restore();
  if (M.k > 0) { ctx.save(); ctx.globalAlpha *= M.k; L.print(ctx, mem, M.w, { border: 0, feather: true }); ctx.restore(); }
  const sc = M.w / W;
  ctx.save();
  ctx.scale(sc, sc);
  ctx.translate(-W / 2, -H / 2);
  rain(ctx, d, 1 - 0.6 * M.k);
  // 照片压上来时，回忆暗下去一点
  const dim = smooth(prog(d, SLIDE, SLIDE + 0.6)) * (1 - M.k) * 0.35;
  if (dim > 0) { ctx.fillStyle = `rgba(10,8,6,${dim})`; ctx.fillRect(0, 0, W, H); }
  for (const m of MARKS) L.crayonCircle(ctx, m.mem[0], m.mem[1], m.mem[2], m.mem[3], prog(d, m.t, m.t + 0.45), { seed: m.t * 10, width: 5 / sc });
  ctx.restore();
  ctx.restore();

  // 照片
  if (d >= SLIDE) {
    const R = truthRect(d);
    ctx.save();
    ctx.translate(R.x, R.y);
    ctx.rotate(R.rot);
    L.print(ctx, truth, R.w, { border: 20, bottom: 0, seed: 7 });
    const s2 = R.w / W;
    ctx.scale(s2, s2);
    ctx.translate(-W / 2, -H / 2);
    for (const m of MARKS) L.crayonCircle(ctx, m.tru[0], m.tru[1], m.tru[2], m.tru[3], prog(d, m.t + 0.05, m.t + 0.5), { seed: m.t * 10 + 3, width: 5 / s2 });
    ctx.restore();
  }

  // 标签
  const la = smooth(prog(d, 10.9, 11.5));
  L.label(ctx, '记 忆', LEFT.x, LEFT.y + 300, { size: 38, alpha: la, ls: 10, color: '#e4d8c0' });
  L.label(ctx, '照 片', RIGHT.x, RIGHT.y + 300, { size: 38, alpha: la, ls: 10, color: '#e4d8c0' });
  // 「确定」盖在记忆上
  L.stamp(ctx, '确定', LEFT.x + 200, LEFT.y + 150, d, STAMP, { size: 100, rot: -0.12, color: '#b23a2c' });
  ctx.restore();
}

function light(d) {
  const k = ease(prog(d, PULL0, PULL1));
  const out = 1 - smooth(prog(d, OUT0, OUT1));
  return [
    // 回忆全屏：光只落在妈妈、孩子和窗上，四周沉在暗里
    { x: lerp(780, LEFT.x, k), y: lerp(600, LEFT.y, k), rx: lerp(1050, 760, k), ry: lerp(760, 560, k), i: 1.0 * out, color: [246, 204, 156] },
    { x: 1450, y: 440, rx: 560, ry: 480, i: 0.7 * out * (1 - k), color: [200, 210, 220] },
    { x: lerp(1290, RIGHT.x, k), y: lerp(610, RIGHT.y, k), rx: 760, ry: 560, i: 0.95 * smooth(prog(d, SLIDE, SLIDE + 0.5)) * out, color: [236, 230, 220] },
  ];
}
function grade(d) { return { warm: lerp(0.25, 0.1, smooth(prog(d, PULL0, PULL1))), ambient: 0.3 }; }

module.exports = { ...S, draw, light, grade };
