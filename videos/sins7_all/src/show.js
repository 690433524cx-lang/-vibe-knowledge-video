// 《七宗罪，其实是大脑的七种出厂设置》合集：抽签 → 灰色的脸 → 变身 → 反转 → 结尾卡，每宗 4 小节；最后七个角色排成一排
import * as THREE from 'three';
import { K, glow, project } from './core.js';
import { FACE } from './geo.js';
import { cloudMaterial } from './mat.js';
import { clamp, lerp, lerp3, prog, sine, outExpo, outBack, inOut, hash, TAU } from './util.js';
import { glowText, fs, BOXES } from './text.js';
import { idolMaterial } from './idol.js';
import * as H from './halo.js';
import * as PR from './props.js';

export const SINS = [
  { id: 'pride', name: '傲慢', col: '#A24BFF', icon: 'crown', first: '〔傲慢〕说：我也会犯错。', twist: '只是〔还没发生过〕。', fact: '多数人觉得，自己比平均强。' },
  { id: 'envy', name: '嫉妒', col: '#2BE36B', icon: 'snake', first: '〔嫉妒〕说：我真心为你高兴。', twist: '只要你〔别比我好太多〕。', fact: '别人比你好时，大脑的疼痛区会亮。' },
  { id: 'wrath', name: '愤怒', col: '#FF2A2A', icon: 'bolt', first: '〔愤怒〕说：我一点都没生气。', twist: '〔你再说一遍？〕', fact: '怒气走近路，比理智快一步。' },
  { id: 'sloth', name: '懒惰', col: '#2BC8E0', icon: 'moon', first: '〔懒惰〕说：明天我一定开始。', twist: '这句话我〔说了三年〕。', fact: '大脑天生爱省电，能躺就不想动。' },
  { id: 'greed', name: '贪婪', col: '#FFC23D', icon: 'coin', first: '〔贪婪〕说：我一点也不贪心。', twist: '我只是〔全都想要〕。', fact: '多巴胺爱的，是‘快得到’。' },
  { id: 'gluttony', name: '暴食', col: '#FF7A1F', icon: 'bowl', first: '〔暴食〕说：我就尝一口。', twist: '这是今晚的〔第七口〕。', fact: '吃饱的信号，要晚到约20分钟。' },
  { id: 'lust', name: '色欲', col: '#FF3D8B', icon: 'heart', first: '〔色欲〕说：我很专一的。', twist: '〔每一次〕都是。', fact: '心动时，大脑的奖励回路全亮。' },
];
const C3 = h => new THREE.Color(h);
const hexs = c => '#' + c.getHexString();
const tone = (hex, k) => hexs(C3(hex).lerp(C3('#FFFFFF'), k));
const GRAY = '#8A8798';

let S, BT, B, R, TL;
export const SLOT_DX = 1.6;
const slotX = i => (i - 3) * SLOT_DX;
// 头部中心（光环、镜头都对着它）
const HEAD_C = [0, 0.05, 0];

// ------------------------------------------------------------ 构建
export function build(scene, beats, heads) {
  S = scene; BT = beats; B = beats.beats; R = beats.R; TL = beats.duration;
  S.chars = SINS.map((sin, i) => makeChar(sin, i, heads));
  S.spot = makeSpot();
}
function pts(geo, mat, parent, order = 0) { const p = new THREE.Points(geo, mat); p.frustumCulled = false; p.renderOrder = order; parent.add(p); K.mats.push(mat); return p; }
function propMat(hex, o = {}) {
  return cloudMaterial({ size: o.size ?? 0.008, bright: o.bright ?? 0.9, depthRef: 4, maxPx: 6, drift: 0.002, colA: tone(hex, 0.75), colB: hex,
    uniforms: { uGray: { value: 0 }, uA: { value: 0 }, uB: { value: 0 }, uC: { value: 0 }, uAsm: { value: 1 }, ...(o.uniforms || {}) },
    uniformDecl: 'uniform float uGray, uA, uB, uC, uAsm;' + (o.uniformDecl || ''),
    posHook: (o.posHook || '') + /* glsl */`
      { // 道具从粒子中汇聚出来：未汇聚时散在四周
        float k = clamp(uAsm*1.25 - h1(aSeed*5.7)*0.25, 0.0, 1.0); k = k*k*(3.0 - 2.0*k);
        p = mix(p + normalize(h3(aSeed*9.1) - 0.5)*(0.6 + 0.6*h1(aSeed*2.1)), p, k); vis *= smoothstep(0.0, 0.3, k); }`,
    colHook: '{ float gl = dot(col, vec3(0.3, 0.59, 0.11)); col = mix(mix(uColB, uColA, h1(aSeed*3.1)), vec3(gl), uGray); }' + (o.colHook || '') });
}
function makeChar(sin, i, heads) {
  const g = new THREE.Group(); g.position.set(slotX(i), 0, 0); K.scene.add(g);
  const head = new THREE.Group(); g.add(head);
  const mGray = idolMaterial(sin.col, { bright: 0.75, cran: 1.25, rim: 1.2 }), mCol = idolMaterial(sin.col, { bright: 0.8, cran: 1.25, rim: 1.2 });
  mGray.uniforms.uGray.value = 1; mGray.uniforms.uEyeOpen.value = 0; mCol.uniforms.uEyeOpen.value = 0;
  const C = {
    sin, i, g, head,
    gray: pts(heads.neutral, mGray, head), col: pts(heads[sin.id], mCol, head),
    grayLite: pts(heads.neutralLite, mGray, head), colLite: pts(heads[sin.id + 'Lite'], mCol, head),
    body: pts(heads.body, idolMaterial(sin.col, { bright: 0.5, rim: 1.5, size: 0.0085 }), g),
  };
  C.mats = [mGray, mCol, C.body.material];
  // 眼睛的光（睁眼）
  C.eyes = [FACE.eyeR, FACE.eyeL].map(p => { const m = glow(2, sin.col, [0.34, 0.2], head, { billboard: false, order: 45, core: '#FFFFFF' }); m.position.set(p[0], p[1], p[2] + 0.03); return m; });
  // 光环：一圈细而干净的环 + 一圈很淡的刻度
  C.halo = new THREE.Group(); C.halo.position.set(HEAD_C[0], HEAD_C[1], -0.55); g.add(C.halo);
  C.haloMats = [['rings', 0.98, 1.0], ['ticks', 1.14, 0.35]].map(([type, r, br], j) => { const m = H.ringMaterial(sin.col, br); m.uniforms.uColA.value.set(tone(sin.col, 0.8)); pts(H.ringPB(type, r, 500 + i * 7 + j, 1).geometry(THREE), m, C.halo, -5); return m; });
  // 道具
  C.props = new THREE.Group(); head.add(C.props); C.propMats = [];
  const P = (pb, o = {}, parent = C.props) => { const m = propMat(o.col ?? sin.col, o); const p = pts(pb.geometry(THREE), m, parent, o.order ?? 30); C.propMats.push(m); return p; };
  if (sin.id === 'pride') {
    C.crown = P(PR.crown(), { bright: 1.0, posHook: '{ float sp = 1.0 + uB*aExtra.x*0.8; p.y = 0.86 + (p.y - 0.86)*sp; float a = uA; vec3 q = p - vec3(0.0, 0.0, -0.1); p.xz = mat2(cos(a), -sin(a), sin(a), cos(a))*q.xz + vec2(0.0, -0.1); }' });
    C.collar = P(PR.collar(), { bright: 0.7 }, g);
  } else if (sin.id === 'envy') {
    const sk = PR.snake();
    C.snakeHead = sk.head;
    C.snake = P(sk.pb, { bright: 1.0, uniforms: { uH: { value: new THREE.Vector3(...sk.head) } }, uniformDecl: 'uniform vec3 uH;',
      posHook: /* glsl */`
        if (aExtra.y < 0.5) p += vec3(0.0, 0.012*sin(aExtra.x*34.0 - uTime*3.0), 0.01*cos(aExtra.x*30.0 - uTime*2.6));
        else { vec3 q = p - uH; float a = -1.1 + uA; q.xz = mat2(cos(a), -sin(a), sin(a), cos(a))*q.xz; p = uH + q; }
        if (aExtra.y > 2.5) { float f = fract(uTime*0.9 + 0.3); vis *= step(f, 0.22); p = uH + (p - uH)*vec3(1.0, 1.0, 1.0); }` }, g);
  } else if (sin.id === 'wrath') {
    C.horns = P(PR.lightningHorns(), { bright: 1.2, col: tone(sin.col, 0.3), posHook: '{ float id = aExtra.y; float on = step(0.35, fract(sin(floor(uTime*14.0 + id*3.7)*43.1)*91.7)); vis *= mix(1.0, on, step(0.5, mod(id, 3.0))); p *= 1.0 + uB*0.35; }' });
  } else if (sin.id === 'sloth') {
    C.hat = P(PR.beanie(), { bright: 0.75, posHook: '{ p.y -= uB*0.32; p.z += uB*0.06; }' });
    C.scarf = P(PR.scarf(), { bright: 0.7 }, g);
    C.zz = P(PR.zees(), { bright: 1.3, posHook: '{ float f = fract(uTime*0.35 + aExtra.y*0.33); p += vec3(0.08*sin(f*6.0 + aExtra.y), f*0.5, 0.0); vis *= uB*sin(3.14159*f); }' });
  } else if (sin.id === 'greed') {
    C.coins = P(PR.coins(90), { bright: 1.1, posHook: /* glsl */`{
        float c = aExtra.y, n = 90.0, a = c/n*6.28318*3.0 + uTime*0.8*(0.8 + 0.4*h1(c)), rr = 0.85 + 0.25*h1(c*3.1), yy = 0.05 + 0.25*(h1(c*7.3) - 0.5);
        float spin = uTime*3.0 + c; vec3 q = vec3(p.x*cos(spin), p.y, p.x*sin(spin) + p.z);
        vec3 orbit = vec3(cos(a)*rr, yy + 0.15*sin(a)*0.3, sin(a)*rr*0.45 - 0.1);
        vec3 far = normalize(h3(c*1.7) - 0.5)*4.0;
        p = mix(far, orbit, clamp(uB*1.4 - h1(c*2.3)*0.4, 0.0, 1.0)) + q;
        vis *= step(c, uC); }` });
  } else if (sin.id === 'gluttony') {
    C.beard = P(PR.beard(), { bright: 0.8, posHook: '{ p.x += 0.01*sin(uTime*2.0 + p.y*20.0)*(0.1 - p.y); }' });
    C.food = P(PR.food(), { bright: 1.0, col: tone(sin.col, 0.2), posHook: /* glsl */`{
        float c = aExtra.y, a = c/6.0*6.28318 + uTime*0.35;
        vec3 home = vec3(cos(a)*1.05, 0.15 + 0.35*sin(a*1.7 + c), sin(a)*0.35 + 0.2);
        vec3 mouth = vec3(0.0, -0.3, 0.45) + vec3(0.0, 0.0, 0.25*c*0.2);
        float k = clamp(uB*1.6 - c*0.12, 0.0, 1.0);
        p = mix(home, mouth, k*k) + p*(1.0 - 0.8*k); vis *= 1.0 - smoothstep(0.85, 1.0, k); }` }, g);
  } else if (sin.id === 'lust') {
    C.hearts = P(PR.hearts(14), { bright: 1.1, posHook: /* glsl */`{
        float c = aExtra.y, a = c/14.0*6.28318 + uTime*0.4, rr = 0.82 + 0.1*sin(uTime + c);
        vec3 home = vec3(cos(a)*rr, 0.05 + 0.55*sin(a)*0.8, 0.25 + 0.1*cos(a));
        float burst = uB; vec3 out_ = home + normalize(home - vec3(0.0, 0.05, 0.0))*burst*(1.5 + h1(c)*2.0);
        p = out_ + p*(1.0 + 0.25*uA + burst*0.8); }` });
  }
  // 抽签图标：画在 2D 层（额头上方的小发光图标）
  return C;
}
function makeSpot() {
  // 聚光灯：从画面上方打下来的光锥 + 落在脸上的光斑
  const mat = new THREE.ShaderMaterial({
    uniforms: { uCol: { value: C3('#FFFFFF') }, uInt: { value: 0 }, uW: { value: 0.35 } },
    transparent: true, depthWrite: false, depthTest: false, blending: THREE.AdditiveBlending,
    vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix*modelViewMatrix*vec4(position, 1.0); }',
    fragmentShader: /* glsl */`uniform vec3 uCol; uniform float uInt, uW; varying vec2 vUv;
      void main(){ float y = vUv.y; float w = mix(uW, 0.04, y); float x = (vUv.x - 0.5)/w;
        float cone = exp(-x*x*3.0)*smoothstep(0.0, 0.25, y)*(0.35 + 0.65*(1.0 - y));
        gl_FragColor = vec4(uCol*cone*uInt, 1.0); }`,
  });
  const m = new THREE.Mesh(new THREE.PlaneGeometry(2.2, 9), mat); m.renderOrder = -8; m.frustumCulled = false; K.scene.add(m);
  return m;
}

// ------------------------------------------------------------ 时间工具
const lastBeat = t => { let lo = 0, hi = B.length - 1, r = -1; while (lo <= hi) { const m = (lo + hi) >> 1; if (B[m] <= t + 1e-9) { r = m; lo = m + 1; } else hi = m - 1; } return r; };
const D = i => R[4 * i];
export function events() {
  const ev = [];
  SINS.forEach((s, i) => { ev.push({ name: `${s.name} 抽中`, t: D(i) }, { name: `${s.name} 变身`, t: D(i) + 2 }, { name: `${s.name} 反转`, t: D(i) + 4 }, { name: `${s.name} 结尾卡`, t: D(i) + 6 }); });
  return ev;
}
// 各事件用实测拍点（不是 D + 整秒）
const bar = (i, k) => R[4 * i + k];

// ------------------------------------------------------------ 镜头
const LINEUP = { pos: [0, 0.3, 10.6], target: [0, 0.0, 0], fov: 35 };
const close = i => ({ pos: [slotX(i), 0.02, 3.35], target: [slotX(i), -0.08, 0], fov: 35 });
const card = i => ({ pos: [slotX(i) - 1.55, 0.1, 4.25], target: [slotX(i) - 1.55, -0.2, 0], fov: 35 });
const camLerp = (a, b, k) => ({ pos: lerp3(a.pos, b.pos, k), target: lerp3(a.target, b.target, k), fov: lerp(a.fov, b.fov, k) });

// ------------------------------------------------------------ 每帧
export function frame(t) {
  const F = { flash: 0, flashCol: '#FFFFFF', shake: 0, shock: null, bloom: 1.0, fogCol: GRAY, fogK: 0.6, subs: [], card: null, icons: [], names: null, big: null, header: null };
  const pulse = (() => { const j = lastBeat(t); return j < 0 ? 0 : Math.exp(-(t - B[j]) / 0.12); })();
  // 默认：抽签那一排
  S.chars.forEach(C => setState(C, { lite: true, gray: true, eyes: 0, halo: 0, props: 0, scatter: 0, vis: 1, pulse }));
  let cam = LINEUP, spotX = slotX(3), spotInt = 0.55, spotW = 0.35;
  const done = i => t >= bar(i, 2);                      // 这一宗已经变身过
  const R0 = R[0];
  if (t < R0) {
    // 开头：聚光灯在七张脸之间来回扫，每次停顿都在拍点上
    const stops = B.filter(x => x < R0), order = [3, 1, 5, 0, 6, 2, 4, 3, 2, 1];
    let j = stops.findIndex(x => x > t) - 1; if (j < -1) j = stops.length - 1;
    const from = j >= 0 ? order[j % order.length] : 3, to = j + 1 < stops.length ? order[(j + 1) % order.length] : 0;
    const t0 = j >= 0 ? stops[j] : 0, t1 = j + 1 < stops.length ? stops[j + 1] : R0;
    const k = clamp((t - t0) / Math.max(0.1, (t1 - t0) * 0.45));
    spotX = lerp(slotX(from), slotX(to), sine(k));
    const lit = j >= 0 ? order[j % order.length] : 3, lk = j >= 0 ? Math.exp(-(t - t0) / 0.25) : 0;
    for (const m of S.chars[lit].mats) m.uniforms.uDim.value = 0.35 + 0.65 * lk;      // 被照到的脸亮一下
    F.subs.push({ text: '七宗罪，其实是大脑的〔亮〕七种出厂设置〔/亮〕。', t0: 0.2, t1: 2.45, size: 50 });
    F.subs.push({ text: '刷到这条，看看你是哪一宗——', t0: 2.5, t1: R0 - 0.12, size: 50 });
    // 结尾回到第 0 帧：音乐淡出后与开头相同
  } else if (t < R[28]) {
    let i = 0; while (i < 6 && t >= D(i + 1) - 0.5) i++;
    const d = D(i), C = S.chars[i], sin = SINS[i];
    const tIn = t - d;
    // 第 1 小节：抽中（镜头 0.4 秒推进去，其他脸散开）
    const push = outExpo(clamp(tIn / 0.4));
    const leave = clamp((t - (D(i + 1) - 0.5)) / 0.5);            // 最后 0.5 秒：卡片化成粒子、拉回那一排（下一宗才用到，这里只在 i 的末尾）
    const endT = i < 6 ? D(i + 1) - 0.5 : R[28] - 0.5;
    const back = clamp((t - endT) / 0.5);
    spotX = slotX(i);
    const b2 = bar(i, 1), b3 = bar(i, 2), b4 = bar(i, 3), b5 = bar(i, 4) ?? d + 8;
    // 状态
    const transformed = t >= b2;
    const inhale = Math.pow(clamp((t - (b2 - 0.3)) / 0.3), 3) * (t < b2 ? 1 : 0);
    const dt2 = t - b2, dt3 = t - b3, dt4 = t - b4;
    const scatterOthers = 2.2 * push * (1 - back);
    // 其他脸：已经出现过的保持彩色、眼睛发光；还没出现的是灰色；镜头推进去时散开
    S.chars.forEach((O, j) => { if (j !== i) setState(O, done(j) ? { lite: true, gray: false, eyes: 1, halo: 0.6, props: 1, scatter: scatterOthers, vis: 1, pulse } : { lite: true, gray: true, eyes: 0, halo: 0, props: 0, scatter: scatterOthers, vis: 1, pulse }); });
    setState(C, { lite: false, gray: !transformed, eyes: transformed ? outExpo(clamp(dt2 / 0.12)) : 0, halo: transformed ? outExpo(clamp(dt2 / 0.3)) : 0,
      props: transformed ? clamp(dt2 / 0.3) : 0, scatter: back * 2.2, vis: 1, pulse, inhale, dim: t < b2 ? 0.55 : 1 });
    // 镜头
    let cm = camLerp(LINEUP, close(i), push);
    if (t >= b3 && t < b4) { const k = dt3 < 0.25 ? outExpo(dt3 / 0.25) : 1 - inOut(clamp((dt3 - 0.25) / 0.6)); cm = camLerp(cm, { pos: [slotX(i), 0.45, 2.75], target: [slotX(i), 0.42, 0], fov: 35 }, 0.55 * k); }
    if (t >= b4) cm = camLerp(close(i), card(i), outExpo(clamp(dt4 / 0.35)));
    if (back > 0) cm = camLerp(t >= b4 ? card(i) : cm, LINEUP, inOut(back));
    if (inhale > 0) cm = camLerp(cm, { pos: [cm.pos[0], cm.pos[1], cm.pos[2] * 0.97], target: cm.target, fov: cm.fov }, inhale);
    cam = cm;
    spotInt = (transformed ? 0.06 : 0.16) * push * (1 - back) + 0.55 * (1 - push) + 0.55 * back; spotW = lerp(0.3, 0.18, inhale);
    // 重拍特效
    const hit = [b2, b3, b4].map(x => t - x).filter(x => x >= 0).sort((a, b) => a - b)[0];
    if (hit != null && hit < 0.5) { F.shake = hit < 0.15 ? 1 - hit / 0.15 : 0; }
    if (dt2 >= 0 && dt2 < 0.5) F.shock = { c: projHead(C), r: 0.7 * outExpo(dt2 / 0.5), a: 0.8 * (1 - dt2 / 0.5), col: tone(sin.col, 0.5) };
    if (dt2 >= 0 && dt2 < 0.2) { F.flash = 0.32 * (1 - dt2 / 0.2); F.flashCol = tone(sin.col, 0.35); }
    if (dt4 >= 0 && dt4 < 0.2) { F.flash = 0.28 * (1 - dt4 / 0.2); F.flashCol = tone(sin.col, 0.4); }
    F.bloom = 1.0 + 0.3 * Math.max(dt2 >= 0 ? Math.exp(-dt2 * 4) : 0, dt4 >= 0 ? Math.exp(-dt4 * 4) : 0);
    if (transformed) { F.fogCol = sin.col; F.fogK = 1; } else { F.fogK = 0.6 - 0.25 * inhale; }
    // 角色的动画与笑点
    animate(C, t, dt2, dt3, transformed);
    // 文字
    F.header = i;
    if (t < b4) {
      F.subs.push({ text: sin.first, t0: d + 0.2, t1: b3 - 0.06, size: 48, col: sin.col });
      if (t >= b3) F.subs.push({ text: sin.twist, t0: b3, t1: b4 - 0.06, size: 48, col: tone(sin.col, 0.55), pop: b3 });
    } else F.card = { i, t0: b4, fade: back };
    F.dim = 1 - 0.15 * inhale;
  } else {
    // 结尾：七个变身后的角色排成一排
    const e1 = R[28], e2 = R[29], fade = BT.fade_start, end = TL;
    S.chars.forEach((O, j) => {
      const off = fade + (j / 6) * (end - 0.6 - fade) * 0.9, k = clamp((t - off) / 0.5);   // 从左到右依次闭眼、变回灰色
      setState(O, { lite: true, gray: k >= 0.5, eyes: 1 - k, halo: (1 - k) * outExpo(clamp((t - e1) / 0.35)), props: 1 - k, scatter: 0, vis: 1, pulse });
      animate(O, t, t - e1 + 3, -9, k < 0.5);
    });
    spotX = slotX(3); spotInt = lerp(0.2, 0.55, clamp((t - fade) / (end - fade - 0.3)));
    const de = t - e1; if (de < 0.5) F.shock = { c: [960, 470], r: 0.7 * outExpo(de / 0.5), a: 0.8 * (1 - de / 0.5), col: '#FFFFFF' };
    if (de < 0.15) F.shake = 1 - de / 0.15;
    F.names = clamp((t - e1) / 0.2) * (1 - clamp((t - fade) / 1.2));
    if (t >= e2) F.subs.push({ text: '你身上，哪一宗最重？', t0: e2, t1: fade + 1.0, size: 60, sub: '评论区告诉我。' });
    F.fogCol = '#9A86C8'; F.fogK = 0.9 * (1 - clamp((t - fade) / (end - fade - 0.3))) + 0.6 * clamp((t - fade) / (end - fade - 0.3));
  }
  // 聚光灯
  S.spot.position.set(spotX, 4.6, -0.6); S.spot.material.uniforms.uInt.value = spotInt * 0.35; S.spot.material.uniforms.uW.value = spotW;
  F.cam = cam; F.pulse = pulse;
  // 抽签图标（2D）：每张脸额头上方
  if (t < R[28] || true) S.chars.forEach(C => { if (C.st.lite && (C.st.scatter ?? 0) < 0.3) F.icons.push({ i: C.i, p: project([slotX(C.i), 1.12, 0]), gray: C.st.gray }); });
  return F;
}
const projHead = C => project([C.g.position.x, HEAD_C[1], 0.3]);

function setState(C, s) {
  C.st = s;
  C.gray.visible = s.gray && !s.lite; C.col.visible = !s.gray && !s.lite;
  C.grayLite.visible = s.gray && s.lite; C.colLite.visible = !s.gray && s.lite;
  C.body.visible = !s.lite;
  const sc = s.scatter ?? 0, dim = (s.dim ?? 1) * (s.gray ? (s.lite ? 0.6 : 0.8) : 1);
  for (const m of C.mats) { m.uniforms.uDim.value = dim * (1 - 0.15 * (s.inhale ?? 0)); m.uniforms.uScatter.value = sc; m.uniforms.uScatterDist.value = 1.4; m.uniforms.uScatFade.value = 1; }
  C.mats[2].uniforms.uDim.value *= 0.9;
  C.eyes.forEach(m => { m.visible = s.eyes > 0.01 && sc < 1; m.material.uniforms.uInt.value = 0.9 * s.eyes * (1 + 0.3 * (s.pulse ?? 0)); m.material.uniforms.uOpen.value = 0.35 + 0.65 * s.eyes; });
  C.halo.visible = s.halo > 0.01 && sc < 1.2;
  C.halo.scale.setScalar(lerp(0.2, 1, s.halo) * (1 - 0.3 * clamp(sc)));
  C.haloMats.forEach((m, j) => { m.uniforms.uBright.value = (j ? 0.35 : 0.95) * s.halo * (1 + 0.4 * (s.pulse ?? 0)) * (1 - clamp(sc)); });
  C.props.visible = s.props > 0.01; C.propMats.forEach(m => { m.uniforms.uAsm.value = s.props; m.uniforms.uScatter.value = sc; m.uniforms.uScatterDist.value = 1.4; });
  for (const o of [C.collar, C.snake, C.scarf, C.food]) if (o) o.visible = s.props > 0.01 && !s.lite;
  if (s.lite) { for (const o of [C.collar, C.snake, C.scarf, C.food]) if (o) o.visible = s.props > 0.01; }
}

// 角色动起来：头微微转动、呼吸；各宗的道具动画与笑点
function animate(C, t, dt2, dt3, on) {
  const id = C.sin.id;
  const breathe = 0.01 * Math.sin(TAU * t / 3.2);
  C.head.rotation.set(0, on ? 0.08 * Math.sin(t * 0.9) : 0, on ? 0.03 * Math.sin(t * 0.7) : 0);
  C.head.scale.setScalar(1 + breathe);
  const gag = dt3 >= 0 ? Math.exp(-Math.pow((dt3 - 0.35) / 0.25, 2)) : 0;           // 反转那一拍的笑点（0.35 秒左右最大）
  const gagHold = dt3 >= 0 ? clamp(dt3 / 0.2) : 0;
  const u = (m, k, v) => { m.uniforms[k].value = v; };
  if (id === 'pride') {
    C.head.rotation.x = on ? -0.12 : 0;                                              // 下巴微微抬起
    if (C.crown) { u(C.crown.material, 'uA', t * 0.6); u(C.crown.material, 'uB', gag); C.crown.scale.setScalar(1 + 0.45 * gag); }
  } else if (id === 'envy') {
    C.eyes.forEach((m, e) => { m.position.x = [FACE.eyeR, FACE.eyeL][e][0] + 0.03; m.material.uniforms.uInt.value *= 1 + 1.5 * gagHold; });
    if (C.snake) u(C.snake.material, 'uA', 1.1 * outBack(gagHold));
  } else if (id === 'wrath') {
    C.head.rotation.x = on ? 0.06 : 0;
    if (C.horns) u(C.horns.material, 'uB', gag);
  } else if (id === 'sloth') {
    C.head.rotation.x = on ? 0.12 + 0.06 * Math.pow(0.5 + 0.5 * Math.sin(t * 2.2), 4) : 0;   // 一点一点地打瞌睡
    for (const o of [C.hat, C.zz]) if (o) u(o.material, 'uB', gagHold);
  } else if (id === 'greed') {
    if (C.coins) { u(C.coins.material, 'uB', 1); u(C.coins.material, 'uC', on ? 30 + 20 * clamp(dt2 / 2) + 40 * gagHold : 0); }
  } else if (id === 'gluttony') {
    if (C.food) u(C.food.material, 'uB', gagHold);
  } else if (id === 'lust') {
    if (C.hearts) { u(C.hearts.material, 'uA', C.st.pulse ?? 0); u(C.hearts.material, 'uB', gag * 0.8 + gagHold * 0.2); }
  }
}

// ------------------------------------------------------------ 2D 层
export function draw2D(t, ctx, F) {
  // 左上角常驻小字；右上角第几宗
  glowText('七宗罪 · 出厂设置', 60, 58, fs(700, 24), 'rgba(255,255,255,0.6)', { align: 'left', glow: 6, nobox: true });
  if (F.header != null) glowText(`0${F.header + 1} / 07`, 1860, 58, fs(700, 24), tone(SINS[F.header].col, 0.4), { align: 'right', glow: 10, glowColor: SINS[F.header].col, nobox: true });
  // 抽签图标
  for (const ic of F.icons) drawIcon(ctx, SINS[ic.i].icon, ic.p[0], ic.p[1], ic.gray ? GRAY : SINS[ic.i].col, ic.gray ? 0.55 : 1);
  // 结尾的罪名
  if (F.names > 0) S.chars.forEach(C => { const p = project([slotX(C.i), -1.05, 0]); glowText(C.sin.name, p[0], p[1], fs(700, 40), C.sin.col, { alpha: F.names, glow: 18, glowColor: C.sin.col }); });
  // 结尾卡
  if (F.card) drawCard(t, ctx, F.card);
  // 字幕
  for (const s of F.subs) drawSub(t, ctx, s);
  // 冲击波与闪光
  if (F.shock) { ctx.save(); ctx.globalAlpha = F.shock.a; ctx.strokeStyle = F.shock.col; ctx.lineWidth = lerp(6, 1, 1 - F.shock.a / 0.8); ctx.shadowColor = F.shock.col; ctx.shadowBlur = 18; ctx.beginPath(); ctx.arc(F.shock.c[0], F.shock.c[1], F.shock.r * 1920, 0, TAU); ctx.stroke(); ctx.restore(); }
  if (F.flash > 0) { ctx.save(); ctx.globalAlpha = F.flash; ctx.fillStyle = F.flashCol; ctx.fillRect(0, 0, 1920, 1080); ctx.restore(); }
}
function drawSub(t, ctx, s) {
  if (t < s.t0 || t > s.t1 + 0.12) return;
  const a = Math.min(clamp((t - s.t0) / 0.15), 1 - clamp((t - s.t1) / 0.12)), rise = 12 * (1 - outExpo(clamp((t - s.t0) / 0.15)));
  // 暗色渐变底
  ctx.save(); const g = ctx.createLinearGradient(0, 780, 0, 1080); g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, `rgba(0,0,0,${0.65 * a})`); ctx.fillStyle = g; ctx.fillRect(0, 780, 1920, 300); ctx.restore();
  const y = (s.sub ? 930 : 975) + rise;
  marked(ctx, s.text, 960, y, s.size, a, s.col, s.pop != null ? 1 + 0.18 * Math.exp(-Math.pow((t - s.pop - 0.12) / 0.1, 2)) : 1);
  if (s.sub) glowText(s.sub, 960, y + 66, fs(700, 34), 'rgba(255,255,255,0.8)', { alpha: a, glow: 8 });
}
// 〔…〕里的关键词用这一宗的颜色（或高光色），〔亮〕…〔/亮〕用白色高亮加光晕
function marked(ctx, text, cx, y, size, a, keyCol, pop = 1) {
  const segs = []; let cur = '', key = false;
  for (let i = 0; i < text.length;) {
    if (text.startsWith('〔亮〕', i)) { segs.push([cur, key]); cur = ''; key = 'hi'; i += 3; continue; }
    if (text.startsWith('〔/亮〕', i)) { segs.push([cur, key]); cur = ''; key = false; i += 4; continue; }
    if (text[i] === '〔') { segs.push([cur, key]); cur = ''; key = true; i++; continue; }
    if (text[i] === '〕') { segs.push([cur, key]); cur = ''; key = false; i++; continue; }
    cur += text[i++];
  }
  segs.push([cur, key]);
  ctx.save(); ctx.font = fs(700, size); const ws = segs.map(([s]) => ctx.measureText(s).width); ctx.restore();
  let x = cx - ws.reduce((p, q) => p + q, 0) / 2;
  segs.forEach(([s, k], j) => {
    if (s) {
      const col = k === 'hi' ? '#FFFFFF' : k ? keyCol : '#FFFFFF', sc = k === true ? pop : 1;
      ctx.save(); ctx.translate(x + ws[j] / 2, y); ctx.scale(sc, sc);
      glowText(s, 0, 0, fs(700, size), col, { alpha: a, glow: k === 'hi' ? 30 : k ? 20 : 10, glow2: k === 'hi' ? 50 : 0, glowColor: k === 'hi' ? '#FFFFFF' : k ? keyCol : '#000000', nobox: true });
      ctx.restore();
    }
    x += ws[j];
  });
  BOXES.push({ x0: cx - ws.reduce((p, q) => p + q, 0) / 2, x1: cx + ws.reduce((p, q) => p + q, 0) / 2, y0: y - size * 0.6, y1: y + size * 0.6, label: text, alpha: a });
}
function drawCard(t, ctx, c) {
  const sin = SINS[c.i], a = clamp((t - c.t0) / 0.15) * (1 - c.fade);
  if (a <= 0) return;
  ctx.save(); const g = ctx.createLinearGradient(0, 0, 900, 0); g.addColorStop(0, `rgba(0,0,0,${0.5 * a})`); g.addColorStop(1, 'rgba(0,0,0,0)'); ctx.fillStyle = g; ctx.fillRect(0, 0, 900, 1080); ctx.restore();
  const pop = 1 + 0.12 * Math.exp(-(t - c.t0) * 8);
  ctx.save(); ctx.translate(420, 420); ctx.scale(pop, pop);
  glowText(sin.name, 0, 0, fs(900, 190), sin.col, { alpha: a, glow: 40, glow2: 80, glowColor: sin.col, shadowBlur: 18 });
  ctx.restore();
  glowText(`出厂设置 · 0${c.i + 1} / 07`, 420, 560, fs(700, 28), tone(sin.col, 0.5), { alpha: a, glow: 10, glowColor: sin.col });
  ctx.save(); const g2 = ctx.createLinearGradient(0, 800, 0, 1080); g2.addColorStop(0, 'rgba(0,0,0,0)'); g2.addColorStop(1, `rgba(0,0,0,${0.65 * a})`); ctx.fillStyle = g2; ctx.fillRect(0, 800, 1920, 280); ctx.restore();
  marked(ctx, sin.twist, 960, 925, 38, a, tone(sin.col, 0.55));
  glowText(sin.fact, 960, 995, fs(700, 42), tone(sin.col, 0.6), { alpha: a, glow: 18, glowColor: sin.col });
}
// 抽签的小发光图标
function drawIcon(ctx, kind, x, y, col, a) {
  ctx.save(); ctx.globalAlpha = a; ctx.translate(x, y); ctx.strokeStyle = col; ctx.fillStyle = col; ctx.lineWidth = 2.5; ctx.shadowColor = col; ctx.shadowBlur = 12; ctx.lineJoin = 'round';
  const s = 14; ctx.beginPath();
  if (kind === 'crown') { ctx.moveTo(-s, s * 0.6); ctx.lineTo(-s, -s * 0.3); ctx.lineTo(-s * 0.5, s * 0.1); ctx.lineTo(0, -s * 0.7); ctx.lineTo(s * 0.5, s * 0.1); ctx.lineTo(s, -s * 0.3); ctx.lineTo(s, s * 0.6); ctx.closePath(); ctx.stroke(); }
  else if (kind === 'snake') { ctx.moveTo(-s, s * 0.5); ctx.bezierCurveTo(-s * 0.3, s * 0.9, -s * 0.2, -s * 0.2, s * 0.3, -s * 0.1); ctx.bezierCurveTo(s * 0.8, 0, s, -s * 0.6, s * 0.5, -s * 0.8); ctx.stroke(); }
  else if (kind === 'bolt') { ctx.moveTo(s * 0.2, -s); ctx.lineTo(-s * 0.5, s * 0.1); ctx.lineTo(0, s * 0.1); ctx.lineTo(-s * 0.2, s); ctx.lineTo(s * 0.5, -s * 0.15); ctx.lineTo(0, -s * 0.15); ctx.closePath(); ctx.fill(); }
  else if (kind === 'moon') { ctx.arc(0, 0, s * 0.8, Math.PI * 0.35, Math.PI * 1.65); ctx.arc(s * 0.35, -s * 0.05, s * 0.6, Math.PI * 1.45, Math.PI * 0.55, true); ctx.closePath(); ctx.fill(); }
  else if (kind === 'coin') { ctx.arc(0, 0, s * 0.8, 0, TAU); ctx.stroke(); ctx.strokeRect(-s * 0.25, -s * 0.25, s * 0.5, s * 0.5); }
  else if (kind === 'bowl') { ctx.moveTo(-s, -s * 0.1); ctx.lineTo(s, -s * 0.1); ctx.arc(0, -s * 0.1, s, 0, Math.PI); ctx.stroke(); ctx.beginPath(); ctx.moveTo(-s * 0.3, -s * 0.4); ctx.quadraticCurveTo(-s * 0.1, -s * 0.8, -s * 0.3, -s); ctx.moveTo(s * 0.2, -s * 0.4); ctx.quadraticCurveTo(s * 0.4, -s * 0.8, s * 0.2, -s); ctx.stroke(); }
  else if (kind === 'heart') { ctx.moveTo(0, s * 0.8); ctx.bezierCurveTo(-s * 1.2, 0, -s * 0.6, -s, 0, -s * 0.35); ctx.bezierCurveTo(s * 0.6, -s, s * 1.2, 0, 0, s * 0.8); ctx.fill(); }
  ctx.restore();
}
