// 时间轴：读 beats.json，把所有事件换算成具体时间；phase(t) 给出这一帧的全部状态（纯函数，同一个 t 永远一样）
import { clamp, lerp, prog, outExpo, outBack, sine } from './lib/util.js';

export const SINS = [
  { id: 'pride', name: '傲慢', ch: '傲', col: '#A24BFF', inner: 'crown', quote: '“这点事，还用问别人？”', fact: '多数人觉得，自己比平均强' },
  { id: 'envy', name: '嫉妒', ch: '妒', col: '#2BE36B', inner: 'snake', quote: '“凭什么是他，不是我？”', fact: '别人比你好，大脑的疼痛区会亮' },
  { id: 'wrath', name: '愤怒', ch: '怒', col: '#FF2A2A', inner: 'flame', quote: '“你再说一遍？”', fact: '怒气走近路，比理智快一步' },
  { id: 'sloth', name: '懒惰', ch: '懒', col: '#2BC8E0', inner: 'moon', quote: '“再躺五分钟，就五分钟。”', fact: '大脑天生爱省电', sub: '它占体重2%，却耗掉约两成能量' },
  { id: 'greed', name: '贪婪', ch: '贪', col: '#FFC23D', inner: 'coin', quote: '“再多一点，我就收手。”', fact: '多巴胺爱的，是‘快得到’' },
  { id: 'gluttony', name: '暴食', ch: '饕', col: '#FF7A1F', inner: 'vortex', quote: '“不饿，就是想吃点什么。”', fact: '吃饱的信号，晚到约20分钟' },
  { id: 'lust', name: '色欲', ch: '欲', col: '#FF3D8B', inner: 'rose', quote: '“明知不该，还是想靠近。”', fact: '心动时，奖励回路全亮' },
];
const NUM = ['01', '02', '03', '04', '05', '06', '07'];

let B, b, R, G, BEATS, TL, EV, FACEX;
// faceX：开头七张脸的横向位置（画面宽度的比例），扫描线据此决定什么时候点亮哪一张
export function setup(beats, faceX) {
  BEATS = beats; B = beats.beats; b = beats.beat; R = beats.R; G = beats.intro_groups; FACEX = faceX;
  TL = beats.end + 0.2;
  EV = buildEvents();
  return { TL, EV };
}
export const duration = () => TL;

// ------------------------------------------------------------ 事件表
function buildEvents() {
  const ev = { morphs: [], big: [], opens: [], lights: [], scan: [], caps: [], inhale: [] };
  // 开头：前三组扫描点亮，第四组一起脉动
  const plan = [[0, 1], [2, 3], [4, 5, 6]];
  let xPrev = 0.02;
  plan.forEach((faces, g) => {
    const hits = G[g], m = hits.length;
    const xEnd = g < 2 ? (FACEX[faces[faces.length - 1]] + FACEX[faces[faces.length - 1] + 1]) / 2 : 0.985;
    const xs = hits.map((h, j) => lerp(xPrev, xEnd, (j + 1) / m));
    hits.forEach((h, j) => ev.scan.push({ t: h, x: xs[j], from: j ? xs[j - 1] : xPrev }));
    faces.forEach(q => {
      let j = xs.findIndex(x => x >= FACEX[q]); j = Math.min(m - 1, j + 1);
      ev.lights.push({ face: q, t: hits[j] });
    });
    xPrev = xEnd;
  });
  ev.scanEnd = G[2][G[2].length - 1] + 0.25;
  ev.pulses = G[3].slice();
  ev.caps.push({ text: '七宗罪里，总有一宗是你。', t0: 0.3, t1: G[1][G[1].length - 1] + 0.13, size: 50, y: 0.9 });
  ev.caps.push({ text: '它们是你大脑的，〔亮〕七种出厂设置〔/亮〕。', t0: G[1][G[1].length - 1] + 0.27, t1: R[0] - 0.5, size: 50, y: 0.9 });
  // 开头的最后一次吸气：七张脸闭眼，全部粒子被吸进画面中心的光点
  ev.morphs.push({ t0: R[0] - 0.5, dur: 0.4, A: 'intro', B: 'pointC', ease: 'in', spin: 0.5, curl: 0.04 });
  ev.inhale.push({ t0: R[0] - 0.5, t1: R[0], k: 1.4 });
  ev.introClose = R[0] - 0.5;
  // 七宗
  SINS.forEach((s, i) => {
    const D = R[2 * i], Dn = R[2 * i + 2];
    ev.morphs.push({ t0: D - 0.1, dur: 0.25, A: i ? `point${i - 1}` : 'pointC', B: `char${i}`, ease: 'out', spin: 1, curl: 0.12 });
    ev.big.push({ t: D, name: `${s.name} 罪名砸出` });
    ev.inhale.push({ t0: D + 3.5 * b, t1: D + 4 * b, k: 1 });
    ev.morphs.push({ t0: D + 4 * b, dur: 0.3, A: `char${i}`, B: `idol${i}`, ease: 'out', spin: 1, curl: 0.12 });
    ev.big.push({ t: D + 4 * b, name: `${s.name} 变成神像` });
    ev.opens.push({ sin: i, t: D + 5 * b, name: `${s.name} 睁眼` });
    if (Dn != null) {
      ev.morphs.push({ t0: D + 7.5 * b, dur: Math.max(0.12, Dn - 0.1 - (D + 7.5 * b)), A: `idol${i}`, B: `point${i}`, ease: 'in', spin: 0.6, curl: 0.04 });
      ev.inhale.push({ t0: D + 7.5 * b, t1: Dn, k: 1 });
    }
    const fade = Dn != null ? D + 7.5 * b : D + 8 * b;
    ev.caps.push({ text: `七宗罪 · ${NUM[i]} · ${s.name}`, t0: D + 0.1, t1: fade, size: 28, y: 0.84, color: s.col });
    ev.caps.push({ text: s.quote, t0: D + 0.1, t1: D + 4 * b, size: 52, y: 0.91 });
    ev.caps.push({ text: s.fact, t0: D + 4 * b + 0.04, t1: fade, size: 52, y: 0.91, color: 'high', sin: i, sub: s.sub });
  });
  return ev;
}
export const events = () => EV;

// ------------------------------------------------------------ 每帧状态
const pulse = (t, list, dur) => { let v = 0; for (const x of list) { const d = t - x; if (d >= 0 && d < dur) v = Math.max(v, 1 - d / dur); } return v; };
const lastBefore = (list, t) => { let r = null; for (const x of list) if (x <= t + 1e-9) r = x; return r; };

export function morphAt(t) {
  let cur = null;
  for (const m of EV.morphs) if (m.t0 - 0.06 <= t) cur = m;
  if (!cur) return { A: 'intro', B: 'intro', t0: -10, dur: 1, ease: 'out', spin: 0, curl: 0, trail: 0 };
  const after = t - (cur.t0 + cur.dur);
  return { ...cur, trail: after < 0 ? 1 : clamp(1 - after / 0.2) };
}

export function phase(t) {
  const P = { t, sin: -1, open: new Array(7).fill(0), lit: new Array(7).fill(0), haloS: new Array(7).fill(0), haloBright: 1,
    contract: 0, pop: 0, mainBoost: 0, exposure: 1, zoom: 1, shake: [0, 0], ca: 0, bloom: 0.9, shock: null,
    scan: null, beam: 0, rayLen: 1, tint: null, tintAmt: 0, caps: [], swirl: 0, morph: morphAt(t), mode: 'intro' };
  // 普通拍：主环 +40%（时间常数 0.12 秒），粒子向外弹 2%（0.15 秒回落）
  const lb = lastBefore(B, t);
  if (lb != null) { const d = t - lb; P.mainBoost = 0.4 * Math.exp(-d / 0.12); P.pop = d < 0.15 ? 0.02 * (1 - d / 0.15) : 0; }
  // 大重拍：冲击波、震动、色差、辉光、镜头弹回
  const bigs = EV.big.map(e => e.t);
  const lbig = lastBefore(bigs, t);
  if (lbig != null) {
    const d = t - lbig;
    if (d < 0.5) { const k = d / 0.5; P.shock = { r: 0.7 * outExpo(k), w: lerp(6, 1, k), a: 0.8 * (1 - k) }; }
    if (d < 0.15) { const a = 6 * (1 - d / 0.15); P.shake = [a * Math.sin(d * 157), a * Math.cos(d * 121)]; }
    if (d < 0.1) P.ca = 4 * (1 - d / 0.1);
    if (d < 0.25) P.bloom = lerp(1.4, 0.9, d / 0.25);
  }
  // 吸气：重拍前 0.3 秒（开头那次 0.5 秒、更强）粒子向中心收缩 20%、整帧暗 15%、镜头推近 3%（easeInCubic）
  let inh = 0, zIn = 0;
  for (const e of EV.inhale) {
    if (t >= e.t0 && t < e.t1) { const k = Math.pow((t - e.t0) / (e.t1 - e.t0), 3); inh = Math.max(inh, k * e.k); zIn = Math.max(zIn, 0.03 * k * e.k); }
    // 重拍之后镜头从推近的 3% 弹回（0.25 秒，带一点回弹）
    const d = t - e.t1; if (d >= 0 && d < 0.25) zIn = Math.max(zIn, 0.03 * e.k * (1 - outBack(d / 0.25)));
  }
  P.contract = 0.2 * inh; P.exposure = 1 - 0.15 * Math.min(1, inh); P.swirl = 0.6 * inh;
  // 开头
  if (t < R[0]) {
    P.mode = 'intro';
    const close = sine(prog(t, EV.introClose, EV.introClose + 0.15));
    for (const L of EV.lights) {
      const d = t - L.t;
      if (d < 0) continue;
      P.open[L.face] = (d < 0.12 ? lerp(0, 1.15, outExpo(d / 0.12)) : lerp(1.15, 1, clamp((d - 0.12) / 0.1))) * (1 - close);
      P.lit[L.face] = clamp(d / 0.1);
      P.haloS[L.face] = outBack(clamp(d / 0.25));
    }
    // 第四组：一起脉动，光环一次比一次大
    const pk = EV.pulses.filter(x => x <= t).length;
    if (pk > 0) { const lp = EV.pulses[pk - 1], d = t - lp; for (let q = 0; q < 7; q++) P.haloS[q] = (1 + 0.1 * pk) * (1 + 0.08 * Math.max(0, 1 - d / 0.15)); P.mainBoost = Math.max(P.mainBoost, 0.6 * Math.exp(-d / 0.12)); }
    for (let q = 0; q < 7; q++) P.haloS[q] *= 1 - close;
    // 扫描线
    if (t >= EV.scan[0].t - 0.15 && t < EV.scanEnd) {
      let s = null; for (const e of EV.scan) if (e.t <= t) s = e;
      const x = s ? lerp(s.from, s.x, outExpo(clamp((t - s.t) / 0.12))) : 0.02;
      const hot = s ? Math.exp(-(t - s.t) / 0.1) : 0;
      P.scan = { x, a: clamp((t - (EV.scan[0].t - 0.15)) / 0.15) * clamp((EV.scanEnd - t) / 0.2), hot };
    }
    P.zoom = 1 + 0.015 * t + zIn;
  } else {
    // 第几宗
    let i = 0; while (i < 6 && t >= R[2 * i + 2]) i++;
    if (t >= R[14]) i = 6;
    const s = SINS[i], D = R[2 * i];
    P.sin = i; P.mode = t < D + 4 * b ? 'char' : 'idol';
    P.lit[i] = 1;
    P.tint = s.col; P.tintAmt = clamp((t - D + 0.05) / 0.2) * (1 - 0.6 * inh);
    // 字背后的主环和放射光：弹出到 60%（字的形状里已按 60% 存放）；变成神像后全部展开
    P.haloS[i] = P.mode === 'char' ? outBack(clamp((t - D) / 0.25)) : 1;
    // 睁眼：0.12 秒内打开到半睁，带 15% 的过冲；两道光 0.3 秒到最亮，然后保持 60%
    const o = EV.opens[i], d = t - o.t;
    if (d >= 0) {
      P.open[i] = d < 0.12 ? lerp(0, 1.15, outExpo(d / 0.12)) : lerp(1.15, 1, clamp((d - 0.12) / 0.1));
      P.beam = d < 0.3 ? sine(d / 0.3) : lerp(1, 0.6, clamp((d - 0.3) / 0.3));
      P.rayLen = 1 + 0.3 * outExpo(clamp(d / 0.2));
      P.haloBright = 1 + 0.6 * Math.exp(-d / 0.5) + 0.25;
      if (d < 0.25) P.bloom = Math.max(P.bloom, lerp(1.4, 0.9, d / 0.25));
    }
    const inhNext = t >= D + 7.5 * b;
    if (inhNext) { const k = clamp((t - D - 7.5 * b) / 0.15); P.open[i] *= 1 - k; P.beam *= 1 - k; }
    P.zoom = 1 + 0.015 * (t - D) + zIn;
  }
  // 文字
  for (const c of EV.caps) {
    if (t < c.t0 || t > c.t1 + 0.12) continue;
    const fi = clamp((t - c.t0) / 0.15), fo = 1 - clamp((t - c.t1) / 0.12);
    P.caps.push({ ...c, alpha: Math.min(fi, fo), rise: 12 * (1 - outExpo(fi)) });
  }
  return P;
}
