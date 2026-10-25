// 《提前焦虑》的同一个空间：所有对象的世界坐标 + 全片相机路径（设计时间）。
//
//   NOW（现在）在左；未来向右、向深处展开。
//   0–3 s   预测树：1 → 3 → 7 → 15 → 微分支 → 五种结果（最坏结果被放大）
//   3–7 s   钻进「最坏结果」→ 脉冲向下 → 身体四个警报节点
//   7–13 s  沿警报线回溯，掠过四个生活里的「未知」，每个都自动长出未来
//   13–17 s 全部分支向中央汇聚 →「预期性焦虑」
//   17–22 s 顺着金线进入「预测」核心，四路输入依次接入
const { rng, makeCamera } = require('./lib');

const NOW = [-700, -40, 1000];
const UNK = [-450, -40, 1030];

// ---------- 预测树 ----------
const r = rng(77);
const jit = (a) => (r() - 0.5) * 2 * a;
const L1 = [-220, 0, 220].map((dy) => [-170 + jit(25), -40 + dy + jit(12), 1110 + jit(30)]);
const L2 = Array.from({ length: 7 }, (_, i) => [180 + jit(40), -470 + i * (790 / 6) + jit(18), 1210 + jit(50)]);
const L2P = [0, 0, 1, 1, 1, 2, 2];
const L3 = Array.from({ length: 15 }, (_, i) => [530 + jit(50), -520 + i * (880 / 14) + jit(14), 1320 + jit(60)]);
const L3P = [0, 0, 1, 1, 2, 2, 3, 3, 3, 4, 4, 5, 5, 6, 6];
// 末端标签（都还没发生：虚线环）
const TIP_LABELS = { 1: '失败', 3: '被拒绝', 5: '搞砸', 7: '出问题', 9: '关系恶化', 11: '失去机会', 13: '最坏结果' };
// 1–2 s 每个末端再长出 2～3 根细小分支
const L4 = [], L4P = [];
L3.forEach((p, i) => {
  const n = 2 + (i % 3 === 0 ? 1 : 0);
  for (let j = 0; j < n; j++) {
    L4.push([p[0] + 150 + jit(40), p[1] + (j - (n - 1) / 2) * 34 + jit(8), p[2] + 70 + jit(30)]);
    L4P.push(i);
  }
});

// 五种结果（从上到下）。最坏在最下面——脉冲之后向下进入身体。
const OUT_LABELS = ['没事', '一般', '有点糟', '失败', '最坏结果'];
const OUT_EN = ['FINE', 'OK', 'NOT GREAT', 'FAIL', 'WORST CASE'];
const OUT = [-430, -225, -20, 180, 370].map((y) => [930, y, 1540]);
// 末端 → 结果：按高度分桶
const L3O = L3.map((p) => Math.min(4, Math.max(0, Math.round((p[1] + 520) / 880 * 4.4 - 0.2))));
// 最后一个桶（最坏）多拉几根：焦虑时，大部分路径都通往最坏结果
L3O[12] = 4; L3O[11] = 3;
const WORST = OUT[4];

// ---------- 身体警报 ----------
const BUS = [WORST[0], WORST[1] + 470, WORST[2] + 40];
const BODY = [-540, -180, 180, 540].map((dx) => [WORST[0] + dx, WORST[1] + 740, WORST[2] + 70]);
const BODY_LABELS = [['心率', 'HEART RATE'], ['呼吸', 'BREATHING'], ['肌肉', 'MUSCLE TENSION'], ['警觉', 'VIGILANCE']];
const BODY_T = [4.3, 4.5, 4.7, 4.9];

// ---------- 生活里的四个未知 ----------
// 相机 7.2 → 12.4 s 从右向左掠过（x 1150 → -950），每个事件在经过时长出三步推演
const camX = (t) => 1150 - (t - 7.2) * 400;
const EV_T = [7.85, 9.15, 10.45, 11.75];
const EVENTS = [
  { text: '明天考试', chain: ['会不会考砸？', '是不是复习错了？', '是不是全完了？'] },
  { text: '老板：“明天来找我一下”', chain: ['是不是做错了？', '是不是要批评我？', '是不是工作出问题了？'] },
  { text: '体检结果还没出来', chain: ['会不会有问题？', '要是很严重呢？', '家里怎么办？'] },
  { text: '消息还没回复', chain: ['是不是生气了？', '是不是我说错话了？', '关系是不是要变了？'] },
].map((e, i) => {
  const up = i % 2 === 0;
  const p = [camX(EV_T[i]) - 380, up ? -60 : 250, 700];
  const cp = e.chain.map((_, j) => [p[0] + 250 * (j + 1), p[1] + (up ? 40 : -40) * (j + 1), p[2] + 150 * (j + 1)]);
  return { ...e, p, cp, t: EV_T[i], up };
});

// ---------- 命名 / 预测核心 ----------
const TITLE = [-230, -40, 820];
const CORE = [-230, -40, 4700];
const INPUTS = [
  { cn: '过去经验', en: 'PAST EXPERIENCE', o: [-600, -300, -120], t: 18.2 },
  { cn: '当前线索', en: 'CURRENT SIGNALS', o: [600, -300, 80], t: 18.7 },
  { cn: '身体状态', en: 'BODY STATE', o: [-600, 260, 120], t: 19.2 },
  { cn: '环境信息', en: 'ENVIRONMENT', o: [600, 260, -80], t: 19.7 },
].map((q) => ({ ...q, p: CORE.map((v, i) => v + q.o[i]) }));

// ---------- 相机 ----------
const cam = makeCamera([
  { t: 0, p: [-40, 95, -20] },
  { t: 2.0, p: [150, 105, 210], ease: 'lin' },
  { t: 3.05, p: [300, 140, 330], ease: 'lin' },
  // 3–4 s：冲向最坏结果
  { t: 3.85, p: [WORST[0], WORST[1] + 10, WORST[2] - 640], ease: 'in' },
  // 4–5 s：跟着脉冲向下
  { t: 5.0, p: [WORST[0], WORST[1] + 560, WORST[2] - 1180], ease: 'io' },
  { t: 6.55, p: [WORST[0] - 40, WORST[1] + 600, WORST[2] - 1250], yaw: 0.05, ease: 's' },
  // 6.6–7.2：沿警报线高速回溯
  { t: 7.2, p: [camX(7.2), 80, 30], yaw: 0, ease: 'in' },
  // 7.2–12.4：匀速掠过四个未知
  { t: 12.4, p: [camX(12.4), 60, -60], ease: 'lin', straight: true },
  // 12.4–13.4：拉远，看见所有分支
  { t: 13.4, p: [-300, -30, -620], ease: 'out' },
  // 13.4–14.6：汇聚，轻推向中央
  { t: 14.6, p: [-250, -30, -330], ease: 'io' },
  { t: 16.9, p: [-238, -34, -250], ease: 's' },
  // 16.9–18.3：顺着金线飞向预测核心（穿过标题）
  { t: 18.3, p: [CORE[0], CORE[1] + 20, CORE[2] - 1350], ease: 'io' },
  { t: 21.5, p: [CORE[0] - 40, CORE[1] + 30, CORE[2] - 1520], yaw: -0.035, ease: 's' },
]);

module.exports = {
  NOW, UNK, L1, L2, L2P, L3, L3P, L4, L4P, TIP_LABELS, OUT, OUT_LABELS, OUT_EN, L3O, WORST,
  BUS, BODY, BODY_LABELS, BODY_T, EVENTS, TITLE, CORE, INPUTS, cam,
};
