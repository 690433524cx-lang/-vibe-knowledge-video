// 七宗罪的表情：在第一版那张粒子脸（MediaPipe 标准人脸 + 程序生成的后脑）的网格上移动顶点，再生成点云
// 中性闭眼（抽签时的灰色脸）+ 每一宗一个表情
import { buildHead, V3 } from './geo.js';

const { addv, sub, mul, norm, cross } = V3;
const LIDS = {
  R: { up: [246, 161, 160, 159, 158, 157, 173], lo: [7, 163, 144, 145, 153, 154, 155], r1: [247, 30, 29, 27, 28, 56, 190], r2: [113, 225, 224, 223, 222, 221, 189] },
  L: { up: [466, 388, 387, 386, 385, 384, 398], lo: [249, 390, 373, 374, 380, 381, 382], r1: [467, 260, 259, 257, 258, 286, 414], r2: [342, 445, 444, 443, 442, 441, 413] },
};
const BROW = { R: [46, 53, 52, 65, 55, 70, 63, 105, 66, 107], L: [276, 283, 282, 295, 285, 300, 293, 334, 296, 336] };
// 嘴角及其周围（[顶点, 权重]）；R 在画面左侧（模型 −x）
const CORNER = {
  R: [[61, 1], [76, 0.8], [62, 0.6], [146, 0.45], [185, 0.45], [91, 0.25], [40, 0.25], [57, 0.5], [186, 0.35]],
  L: [[291, 1], [306, 0.8], [292, 0.6], [375, 0.45], [409, 0.45], [321, 0.25], [270, 0.25], [287, 0.5], [410, 0.35]],
};
const LOWER_LIP = [[14, 1], [87, 1], [178, 0.9], [88, 0.8], [95, 0.6], [317, 1], [402, 0.9], [318, 0.8], [324, 0.6], [17, 0.9], [84, 0.85], [181, 0.7], [91, 0.4], [314, 0.85], [405, 0.7], [321, 0.4], [18, 0.75], [200, 0.6], [199, 0.45], [175, 0.35], [152, 0.25]];

// cfg：close 眼皮闭合比例（0 原样睁开，1 闭上）；smile:[左右嘴角上移（脸高的比例）]；wide 嘴角外拉；jaw 张嘴；brow:[左右眉毛上移（负值压低）]、browIn 眉头内收
export function expression(obj, cfg = {}) {
  const V = obj.V.map(v => v.slice());
  const top = V.reduce((m, v) => Math.max(m, v[1]), -9), H = top - V[152][1];
  const close = cfg.close ?? 0;
  for (const [side, e] of Object.entries(LIDS)) {
    const c = Array.isArray(close) ? close[side === 'R' ? 0 : 1] : close;
    e.up.forEach((u, k) => {
      const d = sub(obj.V[e.lo[k]], obj.V[u]);
      V[u] = addv(V[u], mul(d, c)); V[e.r1[k]] = addv(V[e.r1[k]], mul(d, c * 0.6)); V[e.r2[k]] = addv(V[e.r2[k]], mul(d, c * 0.25));
    });
  }
  const sm = cfg.smile ?? [0, 0], wide = cfg.wide ?? 0;
  [['R', -1, sm[0]], ['L', 1, sm[1]]].forEach(([s, sx, up]) => CORNER[s].forEach(([i, w]) => { V[i] = addv(V[i], [sx * H * wide * w, H * up * w, 0]); }));
  if (cfg.jaw) for (const [i, w] of LOWER_LIP) V[i] = addv(V[i], [0, -H * cfg.jaw * w, -H * cfg.jaw * 0.15 * w]);
  const br = cfg.brow ?? [0, 0];
  [['R', br[0], 1], ['L', br[1], -1]].forEach(([s, up, sx]) => BROW[s].forEach((i, k) => {
    const inner = 1 - k / (BROW[s].length - 1) * 0.5;           // 眉头动得多一些
    V[i] = addv(V[i], [sx * H * (cfg.browIn ?? 0) * inner, H * up * (up < 0 ? inner : 1), 0]);
  }));
  const vn = V.map(() => [0, 0, 0]);
  obj.F.forEach(f => { const n = cross(sub(V[f[1]], V[f[0]]), sub(V[f[2]], V[f[0]])); f.forEach(i => { vn[i] = addv(vn[i], n); }); });
  return { V, F: obj.F, VN: vn.map(n => norm(n)), FN: obj.FN };
}

// 每一宗的表情（中性闭眼 = 抽签时的灰色脸）
export const EXPR = {
  neutral: { close: 1 },
  pride: { close: 0.45, smile: [-0.008, 0.07], wide: 0.02, brow: [0.004, 0.014] },   // 嘴角一侧上挑的坏笑、眼睛往下看（下巴抬起在头部姿态里）
  prideGag: { close: 0.5, smile: [-0.01, 0.11], wide: 0.035, brow: [0.004, 0.022] },  // 反转那一拍：坏笑更明显
  envy: { close: 0.28, smile: [0.05, 0.04], wide: 0.08, brow: [0.014, 0.008] },      // 勉强挤出的笑（嘴角拉宽、上提，眉毛被扯起来）
  wrath: { close: 0.2, smile: [-0.002, -0.002], brow: [-0.02, -0.02], browIn: 0.012 }, // 嘴角平直、眉头压低
  sloth: { close: 0.55, smile: [0.004, 0.004], jaw: 0.006 },                         // 眼睛只睁一半，嘴角放松
  greed: { close: 0.15, smile: [0.03, 0.03], wide: 0.04, jaw: 0.012 },              // 咧开的贪心笑
  gluttony: { close: 0.25, smile: [0.012, 0.012], jaw: 0.04 },                       // 嘴微微张开，一脸满足
  lust: { close: 0.38, smile: [0.008, 0.026], brow: [0.0, 0.016] },                 // 挑眉，嘴角一侧得意
};

export function buildExpressionHead(obj, id, k = 1) {
  const o = expression(obj, EXPR[id]);
  const r = buildHead(o, { seed: 7, face: Math.round(110000 * k), back: Math.round(60000 * k), neck: 0, noJaw: true });
  // 去掉嘴唇那一圈发光的轮廓线（标记 3、嘴附近的点），嘴只用粒子的明暗表现
  const M = [0, -4.27 / 16, 5.3 / 16];
  const keep = r.pb.subset(i => !(r.pb.m[i * 2 + 1] === 3 && Math.hypot((r.pb.p[i * 3] - M[0]) / 1.6, r.pb.p[i * 3 + 1] - M[1], r.pb.p[i * 3 + 2] - M[2]) < 0.14));
  let fc = 0; for (let i = 0; i < r.faceCount; i++) if (!(r.pb.m[i * 2 + 1] === 3 && Math.hypot((r.pb.p[i * 3] - M[0]) / 1.6, r.pb.p[i * 3 + 1] - M[1], r.pb.p[i * 3 + 2] - M[2]) < 0.14)) fc++;
  return { pb: keep, faceCount: fc };
}
