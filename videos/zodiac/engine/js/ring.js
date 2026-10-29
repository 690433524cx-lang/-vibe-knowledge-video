// 十二星座符号环：符号是自己用路径画的发光线条（不依赖字体），由密集粒子组成。
// 所有坐标是“叠加层像素”：原点在画面中心，y 向上，1 单位 = 1 像素（叠加层挂在相机前方）。
import * as THREE from 'three';
import { particleMaterial, PB, makePoints, PAL } from './particles.js';
import { rng } from './util.js';

export const SIGN_IDS = ['aries', 'taurus', 'gemini', 'cancer', 'leo', 'virgo', 'libra', 'scorpio', 'sagittarius', 'capricorn', 'aquarius', 'pisces'];
export const SIGN_ELEMENT = ['fire', 'earth', 'air', 'water', 'fire', 'earth', 'air', 'water', 'fire', 'earth', 'air', 'water'];
export const ELEMENT_PRIMARY = { fire: '#FF6A1A', earth: '#2FBF8A', air: '#7FD8FF', water: '#6A5CFF' };

// 路径：单位方框 [-0.5, 0.5]，y 向上。M 起点、L 直线、Q 二次、C 三次贝塞尔、O 整圆(cx cy r)
const G = [
  // 白羊：从底部升起，分成两只向外卷的羊角
  ['M', 0, -0.42, 'L', 0, 0.12, 'C', 0, 0.36, -0.12, 0.44, -0.24, 0.42, 'C', -0.38, 0.40, -0.44, 0.26, -0.40, 0.14, 'C', -0.37, 0.06, -0.30, 0.03, -0.24, 0.05,
   'M', 0, 0.12, 'C', 0, 0.36, 0.12, 0.44, 0.24, 0.42, 'C', 0.38, 0.40, 0.44, 0.26, 0.40, 0.14, 'C', 0.37, 0.06, 0.30, 0.03, 0.24, 0.05],
  // 金牛：圆形牛头 + 新月形牛角
  ['O', 0, -0.15, 0.25, 'M', -0.42, 0.40, 'C', -0.36, 0.12, -0.18, 0.10, 0, 0.10, 'C', 0.18, 0.10, 0.36, 0.12, 0.42, 0.40],
  // 双子：两根立柱 + 上下弧形横梁
  ['M', -0.40, 0.40, 'Q', 0, 0.29, 0.40, 0.40, 'M', -0.40, -0.40, 'Q', 0, -0.29, 0.40, -0.40, 'M', -0.17, 0.345, 'L', -0.17, -0.345, 'M', 0.17, 0.345, 'L', 0.17, -0.345],
  // 巨蟹：两个相拥的“6”和“9”
  ['O', -0.20, 0.10, 0.12, 'M', -0.20, 0.22, 'C', -0.02, 0.36, 0.26, 0.34, 0.42, 0.18, 'O', 0.20, -0.10, 0.12, 'M', 0.20, -0.22, 'C', 0.02, -0.36, -0.26, -0.34, -0.42, -0.18],
  // 狮子：左下的小圆，拱起成鬃毛弧线，向右下甩出尾巴
  ['O', -0.24, -0.16, 0.13, 'M', -0.14, -0.08, 'C', -0.31, 0.20, -0.14, 0.44, 0.08, 0.42, 'C', 0.30, 0.40, 0.34, 0.18, 0.24, 0.0, 'C', 0.14, -0.18, 0.08, -0.34, 0.20, -0.40, 'C', 0.28, -0.44, 0.38, -0.40, 0.42, -0.32],
  // 处女：三道拱 + 右侧打结的尾巴
  ['M', -0.44, 0.26, 'Q', -0.36, 0.38, -0.30, 0.26, 'L', -0.30, -0.38, 'M', -0.30, 0.16, 'Q', -0.18, 0.42, -0.06, 0.16, 'L', -0.06, -0.38,
   'M', -0.06, 0.16, 'Q', 0.06, 0.42, 0.18, 0.16, 'L', 0.18, -0.12, 'C', 0.18, -0.34, 0.30, -0.40, 0.40, -0.30, 'C', 0.46, -0.20, 0.38, -0.08, 0.28, -0.14, 'C', 0.18, -0.20, 0.14, -0.36, 0.06, -0.44],
  // 天秤：底线 + 带拱顶的上横梁
  ['M', -0.42, -0.30, 'L', 0.42, -0.30, 'M', -0.42, -0.08, 'L', -0.17, -0.08, 'C', -0.30, 0.10, -0.20, 0.36, 0, 0.36, 'C', 0.20, 0.36, 0.30, 0.10, 0.17, -0.08, 'L', 0.42, -0.08],
  // 天蝎：三道拱 + 带箭头的尾针
  ['M', -0.44, 0.26, 'Q', -0.36, 0.38, -0.30, 0.26, 'L', -0.30, -0.38, 'M', -0.30, 0.16, 'Q', -0.18, 0.42, -0.06, 0.16, 'L', -0.06, -0.38,
   'M', -0.06, 0.16, 'Q', 0.06, 0.42, 0.18, 0.16, 'L', 0.18, -0.26, 'Q', 0.20, -0.38, 0.42, -0.36, 'M', 0.31, -0.26, 'L', 0.42, -0.36, 'L', 0.33, -0.47],
  // 射手：斜向的箭 + 箭头 + 横杆
  ['M', -0.40, -0.40, 'L', 0.40, 0.40, 'M', 0.06, 0.40, 'L', 0.40, 0.40, 'L', 0.40, 0.06, 'M', -0.28, 0.02, 'L', 0.02, -0.28],
  // 摩羯：V 字羊角 + 打圈的鱼尾
  ['M', -0.44, 0.28, 'Q', -0.34, 0.42, -0.26, 0.28, 'L', -0.10, -0.34, 'L', 0.06, 0.20, 'C', 0.12, 0.40, 0.40, 0.40, 0.40, 0.16,
   'C', 0.40, -0.04, 0.16, -0.06, 0.16, 0.08, 'C', 0.16, 0.18, 0.30, 0.16, 0.30, 0.02, 'C', 0.30, -0.20, 0.16, -0.38, -0.02, -0.42],
  // 水瓶：两道折线水波
  ['M', -0.42, 0.06, 'L', -0.28, 0.22, 'L', -0.14, 0.06, 'L', 0, 0.22, 'L', 0.14, 0.06, 'L', 0.28, 0.22, 'L', 0.42, 0.06,
   'M', -0.42, -0.22, 'L', -0.28, -0.06, 'L', -0.14, -0.22, 'L', 0, -0.06, 'L', 0.14, -0.22, 'L', 0.28, -0.06, 'L', 0.42, -0.22],
  // 双鱼：背对背的两道弧 + 中间的丝带
  ['M', -0.36, 0.42, 'C', -0.14, 0.20, -0.14, -0.20, -0.36, -0.42, 'M', 0.36, 0.42, 'C', 0.14, 0.20, 0.14, -0.20, 0.36, -0.42, 'M', -0.36, 0, 'L', 0.36, 0],
];

// 把路径展开成折线（细分后按弧长均匀取点）
export function glyphPolylines(i, steps = 64) {
  const cmd = G[i], lines = []; let cur = null, x = 0, y = 0, k = 0;
  const push = (px, py) => { cur.push([px, py]); x = px; y = py; };
  while (k < cmd.length) {
    const c = cmd[k++];
    if (c === 'M') { cur = []; lines.push(cur); push(cmd[k++], cmd[k++]); }
    else if (c === 'L') { const nx = cmd[k++], ny = cmd[k++], x0 = x, y0 = y; for (let s = 1; s <= steps; s++) push(x0 + (nx - x0) * s / steps, y0 + (ny - y0) * s / steps); }
    else if (c === 'Q') { const [cx, cy, nx, ny] = cmd.slice(k, k + 4); k += 4; const x0 = x, y0 = y; for (let s = 1; s <= steps; s++) { const u = s / steps, v = 1 - u; push(v * v * x0 + 2 * v * u * cx + u * u * nx, v * v * y0 + 2 * v * u * cy + u * u * ny); } }
    else if (c === 'C') { const [ax, ay, bx, by, nx, ny] = cmd.slice(k, k + 6); k += 6; const x0 = x, y0 = y; for (let s = 1; s <= steps; s++) { const u = s / steps, v = 1 - u; push(v * v * v * x0 + 3 * v * v * u * ax + 3 * v * u * u * bx + u * u * u * nx, v * v * v * y0 + 3 * v * v * u * ay + 3 * v * u * u * by + u * u * u * ny); } }
    else if (c === 'O') { const [cx, cy, r] = cmd.slice(k, k + 3); k += 3; cur = []; lines.push(cur); for (let s = 0; s <= steps * 2; s++) { const a = s / (steps * 2) * Math.PI * 2; push(cx + r * Math.cos(a), cy + r * Math.sin(a)); } }
  }
  return lines;
}
export function resample(line, spacing) {
  const out = [line[0]]; let acc = 0;
  for (let i = 1; i < line.length; i++) {
    const [ax, ay] = line[i - 1], [bx, by] = line[i];
    const L = Math.hypot(bx - ax, by - ay); let d = spacing - acc;
    while (d <= L) { out.push([ax + (bx - ax) * d / L, ay + (by - ay) * d / L]); d += spacing; }
    acc = L - (d - spacing);
  }
  return out;
}

const RING_POS = /* glsl */`
  {
    float kind = aTone.y; int si = int(aTone.w + 0.5);
    vec3 tgt; float bb = 1.0, sx = 0.0, rise = 0.0;
    if (kind < 0.5) {
      float s = uSymS[si]*(1.0 + 0.045*sin(uTime*LW*10.0 + aTone.w*2.1));   // 符号自身微微呼吸
      tgt = uSymC[si] + vec3(p.xy*s, 0.0);
      bb = uSymB[si]; sx = uSymX[si]; rise = uSymR[si];
      col = mix(uSymCol[si], vec3(1.0, 0.97, 0.92), (1.0 - aTone.z)*0.45*uSymW[si]);
      sizeK = mix(1.0, 2.2, aTone.z)*(0.75 + 0.25*s);
    } else if (kind < 3.5) {
      // 装饰圆环和刻度：r = p.x，角度 = p.y（从正上方顺时针）
      float a = p.y + (kind > 1.5 && kind < 2.5 ? -uRingRot*0.7 : uRingRot);
      tgt = vec3(uRingC + vec2(sin(a), cos(a))*p.x, 0.0);
      bb = uDecoA; sx = uDecoX; rise = uDecoR;
      col = mix(uColMain, uColHi, kind > 2.5 ? 0.6 : 0.2);
      sizeK = kind > 2.5 ? 1.6 : 0.9;
    } else {
      tgt = vec3(uPtrC + p.xy, 0.0); bb = uPtrA; sx = uDecoX; rise = uDecoR;
      col = mix(uColMain, uColHi, 0.6 - aTone.z*0.4); sizeK = mix(1.0, 2.0, aTone.z);
    }
    vec3 c3 = vec3(uRingC, 0.0);
    // 碎成粒子向外飞散
    if (sx > 0.0) {
      vec3 outw = normalize(tgt - c3 + vec3(0.0, 0.0, 0.001));
      vec3 dir = normalize(outw*0.9 + (h3(seed*7.13) - 0.5)*1.3);
      float e = 1.0 - pow(1.0 - min(sx, 1.0), 3.0);
      tgt += dir*e*(260.0 + 620.0*h1(seed*3.7));
      tgt.z += (h1(seed*5.3) - 0.3)*e*300.0;
      vis *= 1.0 - smoothstep(0.35, 1.0, sx);
      b *= 0.55 + 0.6*(1.0 - sx);
    }
    // 向上飘散
    if (rise > 0.0) {
      tgt += vec3((h1(seed*9.1) - 0.5)*160.0*rise, rise*(160.0 + 340.0*h1(seed*2.9)), 0.0) + curlN(tgt*0.01, uTime)*120.0*rise;
      vis *= 1.0 - smoothstep(0.3, 1.0, rise);
    }
    // 结尾重新汇聚：沿螺旋从外面飞回来
    if (uForm < 0.999) {
      float k = clamp(uForm*1.45 - h1(seed*3.3)*0.45, 0.0, 1.0);
      float e = 1.0 - pow(1.0 - k, 3.0);
      vec2 rel = tgt.xy - uRingC;
      float ang = (1.0 - e)*(2.6 + 1.4*h1(seed*1.7));
      float sc = 1.0 + (1.0 - e)*(1.6 + 1.6*h1(seed*4.1));
      rel = mat2(cos(ang), -sin(ang), sin(ang), cos(ang))*rel*sc;
      tgt = vec3(uRingC + rel, tgt.z + (1.0 - e)*(h1(seed*6.6) - 0.5)*500.0);
      vis *= smoothstep(0.0, 0.25, k);
      b *= 1.0 + (1.0 - e)*1.5;
    }
    p = tgt; b *= bb;
  }`;

export function buildRing(overlay, Q, signId) {
  const rand = rng(4242);
  const pb = new PB();
  const SYM = 110; // 符号直径（像素）
  for (let i = 0; i < 12; i++) {
    for (const line of glyphPolylines(i)) {
      for (const [x, y] of resample(line, 0.012 / Math.sqrt(Q))) {
        pb.add([x * SYM, y * SYM, 0], [0, 0, 0], rand(), 0, [1.0, 0, 0, i]);
        if (rand() < 0.55 * Q) pb.add([x * SYM + (rand() - 0.5) * 5, y * SYM + (rand() - 0.5) * 5, (rand() - 0.5) * 10], [0, 0, 0], rand(), 0, [0.35, 0, 1, i]);
      }
    }
  }
  // 装饰：内圈实线（r=278）、外圈虚线（r=446）、符号之间的刻度光点（r=360）
  const deg = Math.PI / 180;
  for (let k = 0, n = Math.round(1200 * Q); k < n; k++) pb.add([278 + (rand() - 0.5) * 2, k / n * Math.PI * 2, 0], [0, 0, 0], rand(), 0, [0.5, 1, 0, 0]);
  for (let k = 0, n = Math.round(1500 * Q); k < n; k++) {
    const a = k / n * Math.PI * 2; if (Math.floor(a / deg / 3) % 2) continue;
    pb.add([446 + (rand() - 0.5) * 2, a, 0], [0, 0, 0], rand(), 0, [0.42, 2, 0, 0]);
  }
  for (let i = 0; i < 12; i++) for (let k = 0; k < 10; k++) pb.add([360 + (rand() - 0.5) * 3, (i * 30 + 15) * deg + (rand() - 0.5) * 0.004, 0], [0, 0, 0], rand(), 0, [0.9, 3, 0, 0]);
  // 指针：倒三角光标
  const tri = [[-14, 11], [14, 11], [0, -12], [-14, 11]];
  for (let s = 1; s < tri.length; s++) {
    const [ax, ay] = tri[s - 1], [bx, by] = tri[s];
    for (let k = 0; k < 40; k++) { const u = k / 40; pb.add([ax + (bx - ax) * u, ay + (by - ay) * u, 0], [0, 0, 0], rand(), 0, [1.0, 4, 0, 0]); }
  }
  for (let k = 0; k < 60; k++) { const u = rand(), v = rand() * (1 - u); pb.add([-14 * (1 - u - v) + 14 * u, 11 * (1 - u - v) + 11 * u - 12 * v, 0], [0, 0, 0], rand(), 0, [0.5, 4, 1, 0]); }

  const symCol = SIGN_ELEMENT.map(e => new THREE.Color(ELEMENT_PRIMARY[e]));
  symCol[SIGN_IDS.indexOf(signId)] = PAL.primary.clone();
  const mat = particleMaterial({
    size: 2.9 * 10 / 300, bright: 1, maxPx: 30, flicker: 0.5, drift: 0.6,
    uniformDecl: `uniform vec3 uSymC[12]; uniform float uSymS[12]; uniform float uSymB[12]; uniform float uSymX[12]; uniform float uSymR[12]; uniform float uSymW[12];
      uniform vec3 uSymCol[12]; uniform float uRingRot, uDecoA, uDecoX, uDecoR, uPtrA, uForm; uniform vec2 uRingC, uPtrC;`,
    uniforms: {
      uSymC: { value: Array.from({ length: 12 }, () => new THREE.Vector3()) }, uSymS: { value: new Array(12).fill(1) },
      uSymB: { value: new Array(12).fill(1) }, uSymX: { value: new Array(12).fill(0) }, uSymR: { value: new Array(12).fill(0) },
      uSymW: { value: new Array(12).fill(1) }, uSymCol: { value: symCol },
      uRingRot: { value: 0 }, uDecoA: { value: 1 }, uDecoX: { value: 0 }, uDecoR: { value: 0 }, uPtrA: { value: 0 }, uForm: { value: 1 },
      uRingC: { value: new THREE.Vector2(0, 80) }, uPtrC: { value: new THREE.Vector2(0, 493) },
    },
    posHook: RING_POS,
  });
  const pts = makePoints(pb, mat, overlay, 40);
  return { pts, mat, SYM };
}
