// 七宗罪的道具：全部是粒子点云（头部局部坐标：头顶 0.72、下巴约 −0.59、脸宽约 ±0.5、脸朝 +z）
// 每个点 aExtra = (参数 s, 编号, 0, 1)，aMisc = (亮度, 标记)；动画在 show.js 里由各自的材质 uniform 驱动
import { PB, V3 } from './geo.js';
import { rng, TAU, clamp, lerp } from './util.js';

const { addv, sub, mul, norm, cross, len } = V3;
function P(pb, R, p, br, s = 0, id = 0, flag = 30) { pb.add(p, [0, 0, 0], R(), [0, 0, 0], [s, id, 0, 1], [br, flag]); }
function line(pb, R, a, b, n, br, w = 0.006, s0 = 0, s1 = 1, id = 0) {
  for (let i = 0; i < n; i++) { const f = R(); P(pb, R, [lerp(a[0], b[0], f) + (R() - 0.5) * w, lerp(a[1], b[1], f) + (R() - 0.5) * w, lerp(a[2], b[2], f) + (R() - 0.5) * w], br, lerp(s0, s1, f), id); }
}
function poly(pb, R, pts, n, br, w = 0.006, id = 0) {
  let L = 0; const seg = []; for (let i = 0; i < pts.length - 1; i++) { const l = len(sub(pts[i + 1], pts[i])); seg.push(l); L += l; }
  let acc = 0; pts.slice(0, -1).forEach((a, i) => { line(pb, R, a, pts[i + 1], Math.max(2, Math.round(n * seg[i] / L)), br, w, acc / L, (acc + seg[i]) / L, id); acc += seg[i]; });
}

// ------------------------------------------------------------ 01 傲慢：一顶实心的粒子王冠，戴在头顶（额头上方，不挡眉毛和眼睛）
// 底部是贴合头部的冠环（雕花纹样），上面 7 个尖角、正中最高；只有尖角顶端的宝石是最亮的小点
// aExtra.y：0 紫色的冠身，5 金白色的边与雕花，1 宝石；aExtra.x：在尖角上的高度（0 底 → 1 尖）
export const CROWN_TOP = 0.6;
export function crown(k = 1) {
  const R = rng(77), pb = new PB(), N = n => Math.round(n * k);
  const C = [0, 0.0625, -0.1], RX = 0.5, RY = 0.65, RZ = 0.6125;           // 后脑椭球（和 geo.js 一致）
  const y0 = 0.47, band = CROWN_TOP - 0.47;
  const fy = y => Math.sqrt(Math.max(0.05, 1 - Math.pow((y - C[1]) / RY, 2)));
  const base = fy(y0);
  const ring = (a, y, out = 0) => { const g = 1.05 + 0.05 * clamp((y - y0) / band) + out; return [Math.sin(a) * RX * base * g, y, C[2] + Math.cos(a) * RZ * base * g]; };
  // 冠环：外表面（雕花）+ 内表面（暗）+ 上下两圈金边
  for (let i = 0; i < N(26000); i++) {
    const a = R() * TAU, v = R(), y = y0 + v * band;
    const rim = v < 0.1 || v > 0.9;
    const scroll = Math.abs(Math.sin(a * 14 + Math.sin(v * TAU) * 1.3)) < 0.13 && v > 0.22 && v < 0.78;
    const dot = Math.hypot(((a * 7 / TAU + 0.5) % 1 - 0.5) * 0.9, v - 0.5) < 0.09;
    const outer = R() < 0.78;
    const p = ring(a, y, outer ? 0 : -0.035);
    P(pb, R, p, rim || scroll ? (outer ? 1.0 : 0.3) : outer ? 0.42 : 0.16, 0, (rim || scroll) && outer ? 5 : 0);
    if (dot && outer && R() < 0.5) P(pb, R, ring(a, y, 0.008), 1.1, 0, 5);
  }
  // 7 个尖角：贴着冠环弧度的实心三角板（两层表面），金边 + 中脊；分布在正面 ±105°
  const n = 7;
  for (let sIdx = 0; sIdx < n; sIdx++) {
    const f = sIdx / (n - 1) * 2 - 1, a = f * 1.83, front = 1 - Math.abs(f);
    const h = 0.13 + 0.17 * Math.pow(front, 1.4), w = 0.2 - 0.03 * Math.abs(f);
    for (let j = 0; j < N(4200); j++) {
      const u = Math.pow(R(), 0.9), half = w * (1 - u) * 0.5, off = (R() * 2 - 1) * half;
      const edge = Math.abs(Math.abs(off) - half) < 0.007, ridge = Math.abs(off) < 0.004;
      const flare = 0.035 * u;                                            // 尖角微微向外张
      const p = ring(a + off / (RX * base), CROWN_TOP + u * h, flare + (R() < 0.5 ? 0 : -0.016));
      P(pb, R, p, edge ? 1.0 : ridge ? 0.75 : 0.36, u, edge || ridge ? 5 : 0);
    }
    const tip = ring(a, CROWN_TOP + h + 0.03, 0.035);                    // 顶端的宝石：一个小而亮的点
    for (let j = 0; j < N(260); j++) { const q = R() * TAU, r = 0.02 * Math.cbrt(R()), e = (R() * 2 - 1) * 0.02; P(pb, R, [tip[0] + Math.cos(q) * r, tip[1] + e, tip[2] + Math.sin(q) * r], 1.5, 1, 1); }
  }
  return pb;
}
export function collar(k = 1) {
  // 吸血鬼式的高立领：从肩膀立起，在头的两侧和后面高高张开（正前方开口）
  const R = rng(78), pb = new PB();
  for (let i = 0; i < Math.round(42000 * k); i++) {
    const a = lerp(0.55, TAU - 0.55, R()) + Math.PI / 2, v = Math.pow(R(), 0.9);
    const y = lerp(-1.15, 0.55, v), r = lerp(0.42, 1.05, Math.pow(v, 1.25));
    const side = Math.abs(Math.cos(a - Math.PI / 2));                       // 越靠两侧越高
    const yy = y + 0.25 * v * side, scallop = 0.05 * Math.sin(a * 7) * v;
    const top = v > 0.975, rib = Math.abs(Math.sin(a * 9)) > 0.97;
    P(pb, R, [Math.cos(a) * r, yy + scallop, -0.22 + Math.sin(a) * r * 0.75], top ? 2.0 : rib ? 1.2 : 0.4 + 0.4 * v, v);
  }
  return pb;
}

// ------------------------------------------------------------ 02 嫉妒：一条蛇——尾巴从右肩垂到胸前，往上绕过右肩、脖子后面、左侧，横过喉咙前面一圈，蛇头搭在右肩上
// 蛇身从尾到头逐渐变粗（颈部稍收），身上是菱形鳞片纹；蛇头是立体的三角楔形，两只发光的小眼睛，嘴前分叉的信子
// aExtra.y：0 蛇身，1 蛇头（上颌），4 下颌，2 眼睛，3 信子；aExtra.x：蛇身上从尾（0）到头（1）的位置
export function snake(k = 1) {
  const R = rng(91), pb = new PB();
  const ctrl = [[0.6, -2.0, 0.3], [0.56, -1.6, 0.34], [0.5, -1.22, 0.24], [0.4, -0.98, -0.02], [0.16, -0.84, -0.3], [-0.18, -0.82, -0.3], [-0.34, -0.88, 0.0], [-0.2, -0.98, 0.28], [0.08, -1.02, 0.36], [0.34, -0.94, 0.4], [0.52, -0.74, 0.4], [0.56, -0.52, 0.38]];   // 绕脖子一圈后，蛇头抬起到脸的一侧、下巴的高度
  const cat = (P0, P1, P2, P3, u) => P0.map((_, j) => 0.5 * ((2 * P1[j]) + (-P0[j] + P2[j]) * u + (2 * P0[j] - 5 * P1[j] + 4 * P2[j] - P3[j]) * u * u + (-P0[j] + 3 * P1[j] - 3 * P2[j] + P3[j]) * u * u * u));
  const path = s => { const m = ctrl.length - 1, x = s * m, i = Math.min(m - 1, Math.floor(x)), u = x - i; return cat(ctrl[Math.max(0, i - 1)], ctrl[i], ctrl[i + 1], ctrl[Math.min(m, i + 2)], u); };
  const N = Math.round(70000 * k);
  for (let i = 0; i < N; i++) {
    const s = Math.pow(R(), 0.85), c = path(s), c2 = path(Math.min(1, s + 0.003)), tg = norm(sub(c2, c));
    const n1 = norm(cross(tg, [0, 1, 0])), n2 = cross(n1, tg);
    const rad = lerp(0.012, 0.085, Math.pow(s, 0.55)) * (s > 0.94 ? lerp(1, 0.72, (s - 0.94) / 0.06) : 1);   // 尾细头粗，接近头部的颈子略收
    const th = R() * TAU;
    // 菱形鳞片：格线亮、鳞片中间暗；腹部偏暗；绕到脖子后面的一段更暗（被脖子挡住）
    const sc = 55 / Math.max(0.3, rad / 0.085);
    const g1 = Math.abs(Math.sin(s * sc + th * 2.5)), g2 = Math.abs(Math.sin(s * sc - th * 2.5));
    const scale = Math.min(g1, g2) < 0.2 ? 1.4 : 0.22 + 0.2 * Math.min(g1, g2);   // 鳞片格线更亮、鳞片中间更暗：花纹更明显
    const belly = Math.sin(th) < -0.55 ? 0.55 : 1;
    const behind = c[2] < -0.05 ? 0.25 : 1;
    P(pb, R, addv(c, addv(mul(n1, Math.cos(th) * rad), mul(n2, Math.sin(th) * rad))), scale * belly * behind, s, 0);
  }
  // 蛇头：立体楔形。俯视是圆角三角形（后颌宽、吻部尖），侧面上平下斜；只在表面取点，轮廓线亮
  const H = path(1), L = 0.46;
  const halfW = u => 0.16 * (1 - 0.72 * u) * Math.sqrt(Math.max(0, 1 - Math.pow(u, 6))) + 0.012;
  const top = u => 0.065 * (1 - 0.55 * u), bot = u => 0.045 * (1 - 0.6 * u);
  const head = (id, upper) => {
    for (let i = 0; i < Math.round(12000 * k); i++) {
      const u = R(), w = halfW(u), v = R() * 2 - 1, sg = upper ? 1 : -1, hh = upper ? top(u) : bot(u);
      const side = R() < 0.3;
      let p, br;
      if (side) { const e = R(); p = [Math.sign(v) * w, sg * hh * e * 0.95, u * L]; br = 0.3; }        // 侧面
      else {
        const prof = Math.sqrt(Math.max(0, 1 - Math.pow(Math.abs(v), 4)));
        p = [v * w, sg * hh * prof, u * L];
        const outline = Math.abs(v) > 0.9 || u > 0.975;
        const brow = upper && Math.abs(Math.abs(v) - 0.62) < 0.07 && u > 0.18 && u < 0.6;              // 眉脊
        const plates = upper && (Math.abs(Math.sin(u * 22 + Math.abs(v) * 2)) < 0.14 || Math.abs(v) < 0.05);
        br = outline ? 1.1 : brow ? 0.9 : plates ? 0.6 : upper ? 0.3 : 0.22;
      }
      P(pb, R, [H[0] + p[0], H[1] + p[1], H[2] + p[2]], br, u, id);
    }
    // 下颌和上颌之间的嘴线
    if (!upper) for (let i = 0; i < 900; i++) { const u = R(), sx = R() < 0.5 ? -1 : 1; P(pb, R, [H[0] + sx * halfW(u) * 0.98, H[1], H[2] + u * L], 0.9, u, id); }
  };
  head(1, true); head(4, false);
  // 眼睛：头顶两侧靠后（各一团小而亮的点，略微凸出）
  for (const sx of [-1, 1]) for (let i = 0; i < 260; i++) { const a = R() * TAU, r = 0.022 * Math.sqrt(R()), u = 0.36; P(pb, R, [H[0] + sx * (halfW(u) * 0.78) + Math.cos(a) * r * 0.5, H[1] + top(u) * 0.9 + Math.sin(a) * r * 0.6, H[2] + u * L + Math.cos(a + 1) * r], 2.2, 0, 2); }
  // 分叉的信子
  for (let i = 0; i < 1400; i++) { const u = R(), fork = u > 0.6 ? (i % 2 ? 1 : -1) * (u - 0.6) * 0.2 : 0; P(pb, R, [H[0] + fork, H[1] - 0.006, H[2] + L + u * 0.22], 1.4, u, 3); }
  return { pb, head: H, L };
}

// ------------------------------------------------------------ 03 愤怒：头顶两侧两道粗的折线闪电角（实心、由粗到细、带小分叉），id = 第几道（噼啪闪烁用）
export function lightningHorns(k = 1) {
  const R = rng(31), pb = new PB();
  const bolt = (start, dir0, turn, segs, len, w0, id, br) => {
    let p = start, ang = dir0; const pts = [p];
    for (let j = 0; j < segs; j++) {
      ang += turn; const zig = (j % 2 ? 1 : -1) * 0.55;
      const d = [Math.cos(ang + zig), Math.sin(ang + zig)];
      p = [p[0] + d[0] * len, p[1] + d[1] * len, p[2] - 0.01]; pts.push(p);
    }
    for (let j = 0; j < segs; j++) {
      const a0 = pts[j], a1 = pts[j + 1], dx = a1[0] - a0[0], dy = a1[1] - a0[1], l = Math.hypot(dx, dy), nx = -dy / l, ny = dx / l;
      for (let i = 0; i < Math.round(1500 * k); i++) {
        const f = R(), u = (j + f) / segs, w = w0 * (1 - 0.8 * u), o = (R() * 2 - 1) * w, edge = Math.abs(o) > w * 0.75;
        P(pb, R, [a0[0] + dx * f + nx * o, a0[1] + dy * f + ny * o, a0[2] + (R() - 0.5) * w * 0.8], edge ? 1.2 : 0.75 + 0.5 * (1 - u), u, id);
      }
    }
    return pts;
  };
  for (const sx of [-1, 1]) {
    const pts = bolt([sx * 0.27, 0.56, -0.02], sx > 0 ? 1.15 : Math.PI - 1.15, sx * 0.1, 6, 0.075, 0.042, sx > 0 ? 3 : 0, 1);
    bolt(pts[2], sx > 0 ? 0.35 : Math.PI - 0.35, 0, 3, 0.05, 0.016, sx > 0 ? 4 : 1, 1);       // 小分叉
    bolt(pts[4], sx > 0 ? 1.9 : Math.PI - 1.9, 0, 2, 0.045, 0.012, sx > 0 ? 5 : 2, 1);
  }
  return pb;
}

// ------------------------------------------------------------ 04 懒惰：一顶软塌塌的毛线帽（圆顶 + 粗翻边 + 顶上的毛线球，帽尖耷拉向一边，整顶往一边歪）+ 粗软的围巾（一端垂下）
// 帽子 id：0 帽身，1 翻边，2 毛线球；围巾 id：0 绕脖子的一圈，1 垂下的一端
export function beanie(k = 1) {
  const R = rng(41), pb = new PB(), N = n => Math.round(n * k);
  const tilt = 0.28, ct = Math.cos(tilt), st = Math.sin(tilt);
  const T = p => { const x = p[0], y = p[1] - 0.25; return [x * ct - y * st, x * st + y * ct + 0.25, p[2]]; };   // 整顶往画面左边歪
  // 帽身：从翻边往上的软圆顶，越往上越向一侧耷拉（帽尖垂到一边）
  for (let i = 0; i < N(42000); i++) {
    const v = Math.pow(R(), 0.8), a = R() * TAU;
    const r = 0.6 * Math.sqrt(Math.max(0.02, 1 - v * v * 0.85)) * (1 + 0.04 * Math.sin(a * 3 + v * 4));
    const droop = 0.32 * v * v;                                             // 帽尖往右边软塌下来
    const x = Math.cos(a) * r * (1 - 0.15 * v) + droop * 0.9, y = 0.36 + v * 0.5 - droop * 0.55, z = -0.1 + Math.sin(a) * r * 0.95;
    const knit = Math.abs(Math.sin(a * 22 + Math.sin(v * 40) * 0.6)) < 0.3 ? 1 : 0;   // 竖条罗纹
    P(pb, R, T([x, y, z]), knit ? 0.9 : 0.45, v, 0);
  }
  // 粗翻边：一圈厚厚的罗纹带（外表面 + 上下两道亮边）
  for (let i = 0; i < N(20000); i++) {
    const a = R() * TAU, v = R(), rib = Math.abs(Math.sin(a * 36)) < 0.35;
    const r = 0.635 + 0.03 * Math.sin(Math.PI * v), edge = v < 0.06 || v > 0.94;
    P(pb, R, T([Math.cos(a) * r, 0.22 + v * 0.17, -0.1 + Math.sin(a) * r * 0.95]), edge ? 1.2 : rib ? 0.95 : 0.5, v, 1);
  }
  // 毛线球：耷拉的帽尖上一团毛茸茸的球
  const tip = T([0.32 * 0.9 + 0.06, 0.36 + 0.5 - 0.32 * 0.55 + 0.05, -0.1]);
  for (let i = 0; i < N(5000); i++) {
    const d = [R() * 2 - 1, R() * 2 - 1, R() * 2 - 1], l = Math.hypot(...d); if (l > 1 || l < 0.05) continue;
    const r = 0.13 * Math.pow(R(), 0.25) * (1 + 0.25 * (R() - 0.5));
    P(pb, R, [tip[0] + d[0] / l * r, tip[1] + d[1] / l * r, tip[2] + d[2] / l * r], 0.6 + 0.6 * R(), 0, 2);
  }
  return pb;
}
export function scarf(k = 1) {
  const R = rng(42), pb = new PB(), N = n => Math.round(n * k);
  // 绕脖子的一圈：粗粗的管子（管半径 0.11），表面有织纹，软软地起伏
  for (let i = 0; i < N(42000); i++) {
    const a = R() * TAU, b = R() * TAU, tube = 0.11 * (1 + 0.08 * Math.sin(a * 5));
    const rr = 0.4 + tube * Math.cos(b), y = -0.8 + tube * Math.sin(b) + 0.05 * Math.sin(a * 2 + 0.6);
    const knit = Math.abs(Math.sin(a * 48 + Math.sin(b * 3) * 1.2)) < 0.3, stripe = Math.abs(Math.sin(a * 6)) > 0.93;
    const front = Math.sin(a) > -0.3 ? 1 : 0.35;
    P(pb, R, [Math.cos(a) * rr, y, -0.08 + Math.sin(a) * rr * 0.95], (stripe ? 1.15 : knit ? 0.85 : 0.42) * front, a / TAU, 0);
  }
  // 垂下的一端：宽而厚的布条，从左胸前垂下，末端有流苏
  for (let i = 0; i < N(16000); i++) {
    const v = R(), w = (R() * 2 - 1) * 0.11, th = (R() - 0.5) * 0.05, sway = 0.04 * Math.sin(v * 3);
    const knit = Math.abs(Math.sin(v * 70 + w * 20)) < 0.3, edge = Math.abs(w) > 0.1;
    P(pb, R, [-0.2 + w + sway, -0.86 - v * 0.75, 0.36 - v * 0.04 + th], edge ? 1.1 : knit ? 0.85 : 0.42, v, 1);
  }
  for (let f = 0; f < 9; f++) for (let i = 0; i < N(260); i++) { const v = R(); P(pb, R, [-0.29 + f * 0.022 + (R() - 0.5) * 0.006, -1.61 - v * 0.09, 0.32], 1.0, 1, 1); }   // 流苏
  return pb;
}
export function zees(k = 1) {
  const R = rng(43), pb = new PB();
  for (let z = 0; z < 3; z++) { const s = 0.08 + z * 0.03, c = [0.45 + z * 0.18, 0.95 + z * 0.22, 0.1]; poly(pb, R, [[c[0] - s, c[1] + s, c[2]], [c[0] + s, c[1] + s, c[2]], [c[0] - s, c[1] - s, c[2]], [c[0] + s, c[1] - s, c[2]]], Math.round(1400 * k), 1.6, 0.01, z); }
  return pb;
}

// ------------------------------------------------------------ 05 贪婪：一枚枚扁圆的金币（厚边 + 中间方孔 + 孔边凸框），像星环一样绕着头转；aExtra.x = 金币上的位置（用来做一道扫过的金属反光）
export function coins(n = 64, k = 1) {
  const R = rng(51), pb = new PB();
  for (let c = 0; c < n; c++) coinInto(pb, R, 0.12, Math.round(800 * k), c);
  return pb;
}
function coinInto(pb, R, r0, n, id, off = [0, 0, 0]) {
  const h = r0 * 0.27;
  for (let i = 0; i < n; i++) {
    const a = R() * TAU, r = r0 * Math.sqrt(R()), x = Math.cos(a) * r, y = Math.sin(a) * r;
    if (Math.max(Math.abs(x), Math.abs(y)) < h) continue;                              // 方孔
    const rim = r > r0 * 0.83, frame = Math.max(Math.abs(x), Math.abs(y)) < h * 1.55;
    const face = R() < 0.5 ? 1 : -1;
    P(pb, R, [off[0] + x, off[1] + y, off[2] + face * r0 * (rim || frame ? 0.1 : 0.06)], rim || frame ? 1.4 : 0.6, (x + y) / (2 * r0), id);
  }
  for (let i = 0; i < Math.round(n * 0.25); i++) { const a = R() * TAU; P(pb, R, [off[0] + Math.cos(a) * r0, off[1] + Math.sin(a) * r0, off[2] + (R() * 2 - 1) * r0 * 0.1], 1.1, 0, id); }   // 厚边
}
// 眼睛的形状：贪婪是两枚金币，色欲是两颗心（以原点为中心，show.js 里放到两只眼睛的位置）
export function coinEye(k = 1) { const R = rng(55), pb = new PB(); coinInto(pb, R, 0.062, Math.round(1600 * k), 0); return pb; }
export function heartEye(k = 1) {
  const R = rng(75), pb = new PB();
  for (let i = 0; i < Math.round(1800 * k); i++) {
    const t = R() * TAU, x = 16 * Math.pow(Math.sin(t), 3), y = 13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t);
    const fill = R() < 0.7 ? Math.sqrt(R()) : 1;
    P(pb, R, [x * 0.0028 * fill, y * 0.0028 * fill + 0.004, 0], fill === 1 ? 1.5 : 1.0, 0, 0);
  }
  return pb;
}

// ------------------------------------------------------------ 06 暴食：一圈飘浮的食物，正面朝镜头、轮廓清楚：鸡腿、包子、碗（米饭冒尖 + 热气）、汉堡，各两份；aExtra.y = 份号
export function food(k = 1) {
  const R = rng(62), pb = new PB(), N = n => Math.round(n * k);
  const add = (copy, p, br) => P(pb, R, [p[0], p[1], p[2] + (R() - 0.5) * 0.012], br, copy / 8, copy);
  const fillShape = (copy, inside, box, n, br, edgeTest) => { let m = 0, g = 0; while (m < n && g++ < n * 20) { const x = box[0] + R() * (box[2] - box[0]), y = box[1] + R() * (box[3] - box[1]); if (!inside(x, y)) continue; add(copy, [x, y, 0], edgeTest && edgeTest(x, y) ? 1.35 : br); m++; } };
  for (let copy = 0; copy < 8; copy++) {
    const kind = copy % 4;
    if (kind === 0) {                                                        // 鸡腿：水滴形的肉 + 骨头 + 骨头末端两个圆头
      const meat = (x, y) => { const u = (x - 0.04) / 0.12, v = (y - 0.03) / (0.085 * (1 - 0.35 * Math.max(0, -u))); return u * u + v * v < 1; };
      fillShape(copy, meat, [-0.1, -0.07, 0.17, 0.12], N(2600), 0.6, (x, y) => !meat(x + 0.012, y) || !meat(x - 0.012, y) || !meat(x, y + 0.012) || !meat(x, y - 0.012));
      for (let i = 0; i < N(500); i++) { const f = R(), w = (R() - 0.5) * 0.028; add(copy, [-0.07 - f * 0.11 - w * 0.3, -0.01 - f * 0.06 + w, 0], 1.1); }
      for (const o of [[-0.19, -0.055], [-0.175, -0.095]]) for (let i = 0; i < N(260); i++) { const a = R() * TAU, r = 0.022 * Math.sqrt(R()); add(copy, [o[0] + Math.cos(a) * r, o[1] + Math.sin(a) * r, 0], 1.2); }
    } else if (kind === 1) {                                                 // 包子：白白胖胖的圆顶 + 顶上的旋涡褶子
      const bun = (x, y) => y > -0.06 && (x / 0.14) ** 2 + ((y + 0.06) / 0.13) ** 2 < 1;
      fillShape(copy, bun, [-0.14, -0.06, 0.14, 0.07], N(2600), 0.5, (x, y) => !bun(x, y + 0.013) || !bun(x + 0.013, y) || !bun(x - 0.013, y) || y < -0.052);
      for (let f = 0; f < 9; f++) for (let i = 0; i < N(140); i++) { const u = R(), a = (f / 8 - 0.5) * 2.2; add(copy, [Math.sin(a + u * 0.4) * 0.11 * u, 0.068 - u * 0.075 * Math.cos(a * 0.6) + 0.01 * Math.sin(u * 9), 0.005], 1.25); }   // 包子顶上放射状的褶子
      for (let i = 0; i < N(80); i++) { const a = R() * TAU, r = 0.012 * Math.sqrt(R()); add(copy, [Math.cos(a) * r, 0.068 + Math.sin(a) * r, 0.006], 1.4); }
    } else if (kind === 2) {                                                 // 碗：碗身（梯形弧）+ 碗脚 + 冒尖的米饭 + 三缕热气
      const bowl = (x, y) => y < 0 && y > -0.11 && Math.abs(x) < 0.16 - 0.05 * (-y / 0.11) - 0.02 * (y / 0.11) ** 2 * 0;
      fillShape(copy, bowl, [-0.16, -0.11, 0.16, 0], N(2200), 0.85, (x, y) => y > -0.01 || !bowl(x + 0.013, y) || !bowl(x - 0.013, y) || y < -0.1);
      for (let i = 0; i < N(300); i++) add(copy, [(R() - 0.5) * 0.12, -0.115 - R() * 0.02, 0], 1.1);
      for (let i = 0; i < N(500); i++) add(copy, [(R() - 0.5) * 0.34, (R() - 0.5) * 0.008, 0.005], 1.5);   // 碗口：一道亮的口沿
      for (let i = 0; i < N(500); i++) { const x = (R() - 0.5) * 0.24; add(copy, [x, -0.05 + 0.006 * Math.sin(x * 80), 0.005], 1.3); }   // 碗身上的一道花纹
      const rice = (x, y) => y >= 0 && (x / 0.15) ** 2 + (y / 0.07) ** 2 < 1;
      fillShape(copy, rice, [-0.15, 0, 0.15, 0.07], N(1600), 0.5, null);
      for (let s2 = -1; s2 <= 1; s2++) for (let i = 0; i < N(220); i++) { const u = R(); add(copy, [s2 * 0.05 + 0.018 * Math.sin(u * 9 + s2), 0.09 + u * 0.12, 0], 0.8 * (1 - u)); }
    } else {                                                                 // 汉堡：上面包（圆顶 + 芝麻）、生菜（波浪）、肉饼、芝士、下面包
      const top = (x, y) => y > 0.02 && (x / 0.15) ** 2 + ((y - 0.02) / 0.09) ** 2 < 1;
      fillShape(copy, top, [-0.15, 0.02, 0.15, 0.11], N(1600), 0.6, (x, y) => !top(x, y + 0.012) || !top(x + 0.012, y) || !top(x - 0.012, y));
      for (let d = 0; d < 9; d++) { const sx = (hashN(d) - 0.5) * 0.2, sy = 0.05 + hashN(d + 9) * 0.04; for (let i = 0; i < 40; i++) add(copy, [sx + (R() - 0.5) * 0.012, sy + (R() - 0.5) * 0.006, 0.01], 1.4); }
      for (let i = 0; i < N(500); i++) { const x = (R() - 0.5) * 0.33; add(copy, [x, 0.012 + 0.012 * Math.sin(x * 60), 0], 1.2); }            // 生菜
      for (let i = 0; i < N(900); i++) add(copy, [(R() - 0.5) * 0.31, -0.012 - R() * 0.035, 0], R() < 0.3 ? 1.1 : 0.7);                   // 肉饼
      for (let i = 0; i < N(300); i++) { const x = (R() - 0.5) * 0.3; add(copy, [x, -0.05 - (Math.abs(Math.sin(x * 25)) < 0.3 ? 0.02 * R() : 0), 0], 1.2); }   // 芝士
      const bot = (x, y) => y < -0.055 && y > -0.1 && Math.abs(x) < 0.15 - 0.02 * ((-0.055 - y) / 0.045);
      fillShape(copy, bot, [-0.15, -0.1, 0.15, -0.055], N(700), 0.6, (x, y) => y < -0.092);
    }
  }
  return pb;
}
const hashN = n => { const x = Math.sin(n * 127.1 + 31.7) * 43758.5453; return x - Math.floor(x); };

// ------------------------------------------------------------ 07 色欲：一圈心形（实心 + 亮边，每颗心 id = 第几颗）
export function hearts(n = 24, k = 1) {
  const R = rng(71), pb = new PB();
  for (let h = 0; h < n; h++) for (let i = 0; i < Math.round(1300 * k); i++) {
    const t = R() * TAU, x = 16 * Math.pow(Math.sin(t), 3), y = 13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t);
    const fill = R() < 0.6 ? Math.sqrt(R()) : 1;
    P(pb, R, [x * 0.0072 * fill, y * 0.0072 * fill, (R() - 0.5) * 0.01], fill === 1 ? 1.7 : 0.8, h / n, h);
  }
  return pb;
}
