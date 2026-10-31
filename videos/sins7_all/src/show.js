// 合集的场景与时间轴（数据与音频工具在 show_core.js）
import * as THREE from 'three';
import { K, glow, project } from './core.js';
import { FACE } from './geo.js';
import { cloudMaterial } from './mat.js';
import { clamp, lerp, lerp3, prog, sine, outExpo, outBack, inOut, hash, TAU } from './util.js';
import { glowText, fs, BOXES } from './text.js';
import { idolMaterial } from './idol.js';
import * as H from './halo.js';
import * as PR from './props.js';
import { SINS, C3, tone, GRAY, SLOT_DX, slotX, HEAD_C, A, setAudio, env, lastIdx, kickSpring, beatInBar } from './show_core.js';
export { SINS };
export const charsList = () => S?.chars ?? [];

let S, BT, B, R, TL;
export function build(scene, beats, heads, audioEnv) {
  S = scene; BT = beats; B = beats.beats; R = beats.R; TL = beats.duration;
  setAudio(audioEnv, beats);
  S.chars = SINS.map((sin, i) => makeChar(sin, i, heads));
  S.spot = makeSpot();
  S.stars = [makeStars(4000, -22, 1.0, 11), makeStars(1500, -9, 1.6, 12)];   // 前后两层星点，速度不同
}
function pts(geo, mat, parent, order = 0) { const p = new THREE.Points(geo, mat); p.frustumCulled = false; p.renderOrder = order; parent.add(p); K.mats.push(mat); return p; }
function makeStars(n, z, size, seed) {
  const g = new THREE.BufferGeometry(), P = new Float32Array(n * 3), Sd = new Float32Array(n);
  for (let i = 0; i < n; i++) { const k = (12.5 - z) / 12.5; P[i * 3] = (hash(i * 1.7 + seed) - 0.5) * 22 * k; P[i * 3 + 1] = (hash(i * 2.9 + seed) - 0.5) * 12 * k; P[i * 3 + 2] = z; Sd[i] = hash(i * 4.1 + seed); }
  g.setAttribute('position', new THREE.BufferAttribute(P, 3)); g.setAttribute('aSeed', new THREE.BufferAttribute(Sd, 1));
  const m = new THREE.ShaderMaterial({ uniforms: { uTime: { value: 0 }, uSize: { value: size }, uScale: { value: 1 }, uSpeed: { value: z < -15 ? 0.04 : 0.11 } }, transparent: true, depthWrite: false, depthTest: false, blending: THREE.AdditiveBlending,
    vertexShader: `attribute float aSeed; uniform float uTime, uSize, uScale, uSpeed; varying float vB;
      void main(){ vec3 p = position; p.x += uTime*uSpeed*(0.6 + 0.8*aSeed); p.x = mod(p.x + 30.0, 60.0) - 30.0; p.y += 0.15*sin(uTime*0.1 + aSeed*20.0);
        gl_Position = projectionMatrix*modelViewMatrix*vec4(p, 1.0); gl_PointSize = uSize*(0.6 + 1.4*aSeed*aSeed)*uScale; vB = (0.25 + 0.75*aSeed)*(0.7 + 0.3*sin(uTime*2.0 + aSeed*50.0)); }`,
    fragmentShader: `varying float vB; void main(){ vec2 c = gl_PointCoord - 0.5; if (length(c) > 0.5) discard; gl_FragColor = vec4(vec3(0.85, 0.85, 0.95)*vB*0.5, 1.0); }` });
  const p = new THREE.Points(g, m); p.frustumCulled = false; p.renderOrder = -60; K.scene.add(p); K.mats.push(m); return p;
}
function propMat(hex, o = {}) {
  return cloudMaterial({ size: o.size ?? 0.008, bright: o.bright ?? 0.9, depthRef: 4, maxPx: 6, drift: 0.002, colA: tone(hex, 0.75), colB: hex,
    uniforms: { uGray: { value: 0 }, uA: { value: 0 }, uB: { value: 0 }, uC: { value: 0 }, uD: { value: 0 }, uAsm: { value: 1 }, ...(o.uniforms || {}) },
    uniformDecl: 'uniform float uGray, uA, uB, uC, uD, uAsm;' + (o.uniformDecl || ''),
    posHook: (o.posHook || '') + `
      { float k = clamp(uAsm*1.25 - h1(aSeed*5.7)*0.25, 0.0, 1.0); k = k*k*(3.0 - 2.0*k);
        p = mix(p + normalize(h3(aSeed*9.1) - 0.5)*(0.6 + 0.6*h1(aSeed*2.1)), p, k); vis *= smoothstep(0.0, 0.3, k); }`,
    colHook: '{ float gl = dot(col, vec3(0.3, 0.59, 0.11)); col = mix(mix(uColB, uColA, h1(aSeed*3.1)), vec3(gl), uGray); }' + (o.colHook || '') });
}
function glowMesh(hex, size, parent, z, order) { const m = new THREE.Mesh(new THREE.PlaneGeometry(size, size), H.glowPlane()); m.material.uniforms.uCol.value.set(hex); m.position.set(HEAD_C[0], HEAD_C[1], z); m.renderOrder = order; parent.add(m); return m; }

function makeChar(sin, i, heads) {
  const g = new THREE.Group(); g.position.set(slotX(i), 0, 0); K.scene.add(g);
  const rig = new THREE.Group(); g.add(rig);                  // 整体弹动（鼓点）
  const head = new THREE.Group(); rig.add(head);
  const mk = () => idolMaterial(sin.col, { bright: 0.85, cran: 0.3, rim: 0.15, cranEdge: 1 });
  const mGray = mk(), mCol = mk(), mGag = mk();
  mGray.uniforms.uGray.value = 1; [mGray, mCol, mGag].forEach(m => { m.uniforms.uEyeOpen.value = 0; });
  const C = { sin, i, g, rig, head,
    gray: pts(heads.neutral, mGray, head), col: pts(heads[sin.id], mCol, head), gag: pts(heads[sin.id + 'Gag'] ?? heads[sin.id], mGag, head),
    grayLite: pts(heads.neutralLite, mGray, head), colLite: pts(heads[sin.id + 'Lite'], mCol, head),
    body: pts(heads.body, idolMaterial(sin.col, { bright: 0.5, rim: 0.9, size: 0.0085, cran: 0.8 }), rig) };
  C.mats = [mGray, mCol, mGag, C.body.material];
  // 身后的颜色光晕、放射的细光线、光环（完整的细圆环，在头后面，比头大一圈）
  C.aura = glowMesh(sin.col, 4.2, g, -1.2, -15);
  C.rays = new THREE.Mesh(new THREE.PlaneGeometry(7, 7), H.raysPlane()); C.rays.position.set(HEAD_C[0], HEAD_C[1], -1.0); C.rays.renderOrder = -14; g.add(C.rays);
  C.rays.material.uniforms.uCol.value.set(tone(sin.col, 0.3)); C.rays.material.uniforms.uN.value = 72;
  C.halo = new THREE.Group(); C.halo.position.set(HEAD_C[0], HEAD_C[1], -0.7); rig.add(C.halo);
  C.haloMats = [['rings', 1.22, 1.0], ['ticks', 1.4, 0.3]].map(([type, r, br], j) => { const m = H.ringMaterial(sin.col, br); m.uniforms.uColA.value.set(tone(sin.col, 0.8)); pts(H.ringPB(type, r, 500 + i * 7 + j, 1).geometry(THREE), m, C.halo, -5); return m; });
  // 眼睛：两团强烈的光，带辉光和向外的光晕
  C.eyes = [FACE.eyeR, FACE.eyeL].map(p => { const m = glow(2, sin.col, [0.5, 0.28], head, { billboard: false, order: 46, core: '#FFFFFF' }); m.position.set(p[0], p[1], p[2] + 0.04); return m; });
  C.eyeHalo = [FACE.eyeR, FACE.eyeL].map(p => { const m = glow(0, sin.col, [0.55, 0.55], head, { billboard: false, order: 45, core: tone(sin.col, 0.6) }); m.position.set(p[0], p[1], p[2] + 0.03); return m; });
  // 道具
  C.props = new THREE.Group(); head.add(C.props); C.propMats = []; C.bodyProps = [];
  const P = (pb, o = {}, parent = C.props) => { const m = propMat(o.col ?? sin.col, o); const p = pts(pb.geometry(THREE), m, parent, o.order ?? 30); C.propMats.push(m); if (parent !== C.props) C.bodyProps.push(p); return p; };
  if (sin.id === 'pride') {
    // 王冠：uB 笑点时尖角伸长；uC 宝石闪（每一拍）
    C.crown = P(PR.crown(), { bright: 1.0, posHook: '{ float y0 = 0.61; if (p.y > y0) p.y = y0 + (p.y - y0)*(1.0 + uB*0.55); }', colHook: 'if (aExtra.y > 0.5) { col = vec3(1.0); b *= 1.0 + 2.5*uC; } else b *= 1.4;' });
    C.collar = P(PR.collar(), { bright: 1.6 }, rig);
  } else if (sin.id === 'envy') {
    const sk = PR.snake(); C.snakeHead = sk.head;
    C.snake = P(sk.pb, { bright: 1.9, size: 0.009, uniforms: { uH: { value: new THREE.Vector3(...sk.head) } }, uniformDecl: 'uniform vec3 uH;',
      posHook: `
        if (aExtra.y < 0.5) { float w = sin(aExtra.x*40.0 - uTime*3.0); p += vec3(0.0, 0.014*w*(0.5 + uD), 0.01*cos(aExtra.x*34.0 - uTime*2.4)); }   // 蛇身随低音起伏
        else {
          vec3 q = p - uH;
          if (aExtra.y > 3.5) { float ja = uB*0.55; q.yz = mat2(cos(ja), sin(ja), -sin(ja), cos(ja))*q.yz; }        // 下颌张开
          if (aExtra.y > 2.5 && aExtra.y < 3.5) { q.z = 0.3 + (q.z - 0.3)*uC; vis *= step(0.05, uC); }           // 信子伸出
          float a = uA; q.xz = mat2(cos(a), -sin(a), sin(a), cos(a))*q.xz; p = uH + q;                             // 蛇头转向
        }`, colHook: 'if (aExtra.y > 1.5 && aExtra.y < 2.5) { col = vec3(1.0, 0.95, 0.55); b *= 1.8 + 1.5*uB; } if (aExtra.y > 2.5 && aExtra.y < 3.5) col = vec3(1.0, 0.45, 0.55);' }, rig);
  } else if (sin.id === 'wrath') {
    C.horns = P(PR.lightningHorns(), { bright: 1.2, col: tone(sin.col, 0.3), posHook: '{ float id = aExtra.y; float on = step(0.35, fract(sin(floor(uTime*14.0 + id*3.7)*43.1)*91.7)); vis *= mix(1.0, on, step(0.5, mod(id, 3.0))); p *= 1.0 + uB*0.35; }' });
  } else if (sin.id === 'sloth') {
    C.hat = P(PR.beanie(), { bright: 0.75, posHook: '{ p.y -= uB*0.32; p.z += uB*0.06; }' });
    C.scarf = P(PR.scarf(), { bright: 0.7 }, rig);
    C.zz = P(PR.zees(), { bright: 1.3, posHook: '{ float f = fract(uTime*0.35 + aExtra.y*0.33); p += vec3(0.08*sin(f*6.0 + aExtra.y), f*0.5, 0.0); vis *= uB*sin(3.14159*f); }' });
  } else if (sin.id === 'greed') {
    C.coins = P(PR.coins(90), { bright: 1.1, posHook: `{
        float c = aExtra.y, n = 90.0, a = c/n*6.28318*3.0 + uTime*0.8*(0.8 + 0.4*h1(c)), rr = 0.85 + 0.25*h1(c*3.1), yy = 0.05 + 0.25*(h1(c*7.3) - 0.5);
        float spin = uTime*3.0 + c; vec3 q = vec3(p.x*cos(spin), p.y, p.x*sin(spin) + p.z);
        vec3 orbit = vec3(cos(a)*rr, yy + 0.15*sin(a)*0.3, sin(a)*rr*0.45 - 0.1); vec3 far = normalize(h3(c*1.7) - 0.5)*4.0;
        p = mix(far, orbit, clamp(uB*1.4 - h1(c*2.3)*0.4, 0.0, 1.0)) + q; vis *= step(c, uC); }` });
  } else if (sin.id === 'gluttony') {
    C.beard = P(PR.beard(), { bright: 0.8, posHook: '{ p.x += 0.01*sin(uTime*2.0 + p.y*20.0)*(0.1 - p.y); }' });
    C.food = P(PR.food(), { bright: 1.0, col: tone(sin.col, 0.2), posHook: `{
        float c = aExtra.y, a = c/6.0*6.28318 + uTime*0.35; vec3 home = vec3(cos(a)*1.05, 0.15 + 0.35*sin(a*1.7 + c), sin(a)*0.35 + 0.2);
        vec3 mouth = vec3(0.0, -0.3, 0.45); float k = clamp(uB*1.6 - c*0.12, 0.0, 1.0);
        p = mix(home, mouth, k*k) + p*(1.0 - 0.8*k); vis *= 1.0 - smoothstep(0.85, 1.0, k); }` }, rig);
  } else if (sin.id === 'lust') {
    C.hearts = P(PR.hearts(14), { bright: 1.1, posHook: `{
        float c = aExtra.y, a = c/14.0*6.28318 + uTime*0.4, rr = 0.82 + 0.1*sin(uTime + c);
        vec3 home = vec3(cos(a)*rr, 0.05 + 0.55*sin(a)*0.8, 0.25 + 0.1*cos(a));
        vec3 o = home + normalize(home - vec3(0.0, 0.05, 0.0))*uB*(1.5 + h1(c)*2.0); p = o + p*(1.0 + 0.25*uA + uB*0.8); }` });
  }
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


// ------------------------------------------------------------ 时间
const D = i => R[4 * i];
const bar = (i, k) => R[4 * i + k];
export function events() {
  const ev = [];
  SINS.forEach((s, i) => { ev.push({ name: `${s.name} 抽中`, t: D(i) }, { name: `${s.name} 变身`, t: bar(i, 1) }, { name: `${s.name} 反转`, t: bar(i, 2) }, { name: `${s.name} 结尾卡`, t: bar(i, 3) }); });
  ev.push({ name: '结尾 七个角色排成一排', t: R[28] }, { name: '结尾 问话', t: R[29] });
  return ev;
}

// ------------------------------------------------------------ 镜头（每宗的特写取景：头顶、王冠到下巴、肩膀上的道具都在画面里）
const LINEUP = { pos: [0, 0.3, 10.6], target: [0, 0.0, 0], fov: 35 };
const FRAME = { pride: [0.25, 3.7], envy: [-0.3, 3.9] };
const fr = i => FRAME[SINS[i].id] ?? [0.1, 3.6];
const close = (i, k = 1) => { const [ty, d] = fr(i); return { pos: [slotX(i), ty + 0.1, d * k], target: [slotX(i), ty, 0], fov: 35 }; };
const face = i => SINS[i].id === 'envy' ? { pos: [slotX(i), -0.05, 2.9], target: [slotX(i), -0.1, 0], fov: 35 } : { pos: [slotX(i), 0.37, 3.5], target: [slotX(i), 0.35, 0], fov: 35 };
const card = (i, k = 1) => ({ pos: [slotX(i) - 1.1, 0.1, 5.0 * k], target: [slotX(i) - 1.1, -0.05, 0], fov: 35 });
const camLerp = (a, b, k) => ({ pos: lerp3(a.pos, b.pos, k), target: lerp3(a.target, b.target, k), fov: lerp(a.fov, b.fov, k) });
const orbit = (c, ang, cx) => { const dx = c.pos[0] - cx, dz = c.pos[2]; return { ...c, pos: [cx + dx * Math.cos(ang) + dz * Math.sin(ang), c.pos[1], -dx * Math.sin(ang) + dz * Math.cos(ang)] }; };

// ------------------------------------------------------------ 每帧
export function frame(t) {
  const F = { flash: 0, flashCol: '#FFFFFF', shake: 0, shock: null, bloom: 1.0, auraCol: GRAY, auraK: 0.35, subs: [], card: null, icons: [], names: null, header: null, ripples: [], bursts: [], blur: 0, ca: 0 };
  const kick = kickSpring(t), low = env(t, 'low'), mid = env(t, 'mid'), high = env(t, 'high');
  const bb = beatInBar(t);
  // 每两拍（第 2、4 拍）：镜头 2% 推近冲击 + 3px 轻微震动
  const off = (bb.k === 1 || bb.k === 3) ? Math.exp(-bb.d / 0.1) : 0;
  F.shake = 0.5 * off;
  const AUD = { kick, low, mid, high, t };
  S.chars.forEach(C => setState(C, { lite: true, gray: true, eyes: 0, halo: 0, props: 0, scatter: 0, aud: AUD }));
  let cam = LINEUP, spotX = slotX(3), spotInt = 0.55, focus = -1;
  const done = i => t >= bar(i, 1);
  const R0 = R[0];
  if (t < R0) {
    // 开头：聚光灯在七张脸之间来回扫，每次停顿都在拍点上，被照到的脸亮一下
    const stops = B.filter(x => x < R0 - 0.05), order = [3, 1, 5, 0, 6, 2, 4, 3, 1, 5];
    let j = lastIdx(stops, t);
    const from = j >= 0 ? order[j % order.length] : 3, to = j + 1 < stops.length ? order[(j + 1) % order.length] : 0;
    const t0 = j >= 0 ? stops[j] : 0, t1 = j + 1 < stops.length ? stops[j + 1] : R0;
    spotX = lerp(slotX(from), slotX(to), sine(clamp((t - t0) / Math.max(0.1, (t1 - t0) * 0.45))));
    const lit = j >= 0 ? from : 3, lk = j >= 0 ? Math.exp(-(t - t0) / 0.25) : 0;
    for (const m of S.chars[lit].mats) m.uniforms.uDim.value *= 1 + 0.9 * lk;
    cam = { ...LINEUP, pos: [Math.sin(t * 0.4) * 0.25, 0.3, 10.6 - 0.12 * t] };
    F.subs.push({ text: '七宗罪，其实是大脑的〔亮〕七种出厂设置〔/亮〕。', t0: 0.2, t1: 2.45, size: 52 });
    F.subs.push({ text: '刷到这条，看看你是哪一宗——', t0: B[lastIdx(B, 2.45)] > 2.3 ? B[lastIdx(B, 2.45)] : 2.5, t1: R0 - 0.12, size: 52 });
  } else if (t < R[28]) {
    let i = 0; while (i < 6 && t >= D(i + 1)) i++;
    const d = D(i), C = S.chars[i], sin = SINS[i]; focus = i;
    const b2 = bar(i, 1), b3 = bar(i, 2), b4 = bar(i, 3), next = i < 6 ? D(i + 1) : R[28];
    const tIn = t - d, push = outExpo(clamp(tIn / 0.4)), leave = clamp((t - (next - 0.32)) / 0.32);
    const transformed = t >= b2, inhale = Math.pow(clamp((t - (b2 - 0.3)) / 0.3), 3) * (t < b2 ? 1 : 0);
    const dt2 = t - b2, dt3 = t - b3, dt4 = t - b4;
    const scatterOthers = 2.2 * push * (1 - leave);
    S.chars.forEach((O, j) => { if (j !== i) setState(O, done(j) ? { lite: true, gray: false, eyes: 1, halo: 0.6, props: 1, scatter: scatterOthers, aud: AUD } : { lite: true, gray: true, eyes: 0, halo: 0, props: 0, scatter: scatterOthers, aud: AUD }); });
    setState(C, { lite: false, gray: !transformed, eyes: transformed ? outExpo(clamp(dt2 / 0.12)) : 0, halo: transformed ? outExpo(clamp(dt2 / 0.3)) : 0,
      props: transformed ? clamp(dt2 / 0.3) : 0, scatter: leave * 2.4, aud: AUD, inhale, gag: dt3 >= 0 && dt3 < 1.2 && t < b4, spotlit: !transformed });
    // 镜头：第 1 小节缓慢推近｜第 2 小节重拍上猛地后拉再缓慢推近，绕人物 ±4 度｜第 3 小节快速推到脸部特写、停一拍、弹回｜第 4 小节缓慢后拉
    let cm;
    if (t < b2) cm = camLerp(LINEUP, close(i, 1 - 0.06 * clamp(tIn / 2)), push);
    else if (t < b3) { const jolt = Math.exp(-dt2 * 5) * (1 - Math.exp(-dt2 * 40)); cm = close(i, 1.12 * (1 + 0.25 * jolt) - 0.1 * clamp(dt2 / 2)); cm = orbit(cm, 0.07 * Math.sin(dt2 * 1.6), slotX(i)); }
    else if (t < b4) { const go = outExpo(clamp(dt3 / 0.18)), back = inOut(clamp((dt3 - 0.18 - (B[1] - B[0])) / 0.4)); cm = camLerp(close(i, 1.0), face(i), go * (1 - back)); }
    else cm = card(i, 1 + 0.08 * clamp(dt4 / 1.5));
    if (inhale > 0) cm = { ...cm, pos: [cm.pos[0], cm.pos[1], cm.pos[2] * (1 - 0.03 * inhale)] };
    // 换宗：甩镜头（快速横移到下一张脸，粒子被拉出运动模糊的拖尾）
    if (leave > 0) {
      const j = Math.min(6, i + 1), whip = inOut(leave);
      const to = i < 6 ? { pos: [slotX(j), 0.3, 6.5], target: [slotX(j), 0.0, 0], fov: 35 } : LINEUP;
      cm = camLerp(cm, to, whip);
      F.blur = Math.sin(Math.PI * leave) * (slotX(j) > slotX(i) ? 1 : -1);
    }
    if (tIn < 0.4 && i > 0) { const from = { pos: [slotX(i), 0.3, 6.5], target: [slotX(i), 0.0, 0], fov: 35 }; cm = camLerp(from, close(i, 1 - 0.06 * clamp(tIn / 2)), push); }
    cam = { ...cm, pos: [cm.pos[0], cm.pos[1], cm.pos[2] * (1 - 0.02 * off)] };
    spotX = slotX(i); spotInt = transformed ? 0 : 0.18 * (1 - push) + 0.06;
    // 大重拍：冲击波、震动、色差
    const hits = [b2, b3, b4].map(x => t - x).filter(x => x >= 0);
    const hit = hits.length ? Math.min(...hits) : 9;
    if (hit < 0.15) F.shake = Math.max(F.shake, 1 - hit / 0.15);
    if (hit < 1 / 30 + 1e-4) F.ca = 1;
    const hp = projHead(C);
    if (hit < 0.5) F.shock = { c: hp, r: 0.7 * outExpo(hit / 0.5), a: 0.8 * (1 - hit / 0.5), col: tone(sin.col, 0.5) };
    if (dt2 >= 0 && dt2 < 0.2) { F.flash = 0.3 * (1 - dt2 / 0.2); F.flashCol = tone(sin.col, 0.35); }
    if (dt4 >= 0 && dt4 < 0.2) { F.flash = 0.26 * (1 - dt4 / 0.2); F.flashCol = tone(sin.col, 0.4); }
    F.bloom = 0.72 + 0.3 * Math.exp(-hit * 4) + 0.15 * kick;
    if (transformed) { F.auraCol = sin.col; F.auraK = 1 - 0.7 * leave; }
    animate(C, t, dt2, dt3, transformed, AUD);
    // 律动：鼓点涟漪、高音火花
    if (transformed && leave < 0.5) {
      const kb = lastIdx(B, t); if (kb >= 0 && t - B[kb] < 0.6) F.ripples.push({ c: hp, k: (t - B[kb]) / 0.6, col: sin.col, r0: 230 });
      for (let h = Math.max(0, lastIdx(A.hats, t) - 3); h <= lastIdx(A.hats, t); h++) {
        const ht = A.hats[h]; if (h < 0 || t - ht > 0.15) continue;
        const n = Math.round(3 + 16 * env(ht, 'high')), a = hash(h * 3.1) * TAU, rr = 1.0 + 0.6 * hash(h * 5.7);
        F.bursts.push({ t0: ht, pos: [slotX(i) + Math.cos(a) * rr, HEAD_C[1] + Math.sin(a) * rr * 0.75, 0.3], n, speed: 0.6, life: 0.15, grav: 0, seed: h, bright: 2.2 });
      }
      F.sparkCol = tone(sin.col, 0.6);
    }
    F.header = i;
    const beatAfter = x => { const j = lastIdx(B, x); return B[j + 1] ?? x + 0.5; };
    if (t < b4) {
      F.subs.push({ text: sin.first, t0: d + 0.02, t1: b3 - 0.06, size: 52, col: sin.col, pop: d + 0.02 });
      if (t >= b3) F.subs.push({ text: sin.twist, t0: b3, t1: b4 - 0.06, size: 52, col: tone(sin.col, 0.55), pop: b3, flash: beatAfter(b3 + 0.01) });
    } else F.card = { i, t0: b4, fade: leave };
    F.dim = 1 - 0.15 * inhale;
  } else {
    // 结尾：七个变身后的角色排成一排；音乐淡出时从左到右依次闭眼、道具消散、变回灰色
    const e1 = R[28], e2 = R[29], fade = BT.fade_start, end = TL;
    S.chars.forEach((O, j) => {
      const offT = fade + (j / 6) * (end - 0.7 - fade) * 0.92, k = clamp((t - offT) / 0.45);
      setState(O, { lite: true, gray: k >= 0.5, eyes: 1 - k, halo: (1 - k) * outExpo(clamp((t - e1) / 0.35)), props: 1 - k, scatter: 0, aud: AUD });
      animate(O, t, t - e1 + 3, -9, k < 0.5, AUD);
    });
    const de = t - e1; if (de < 0.5) F.shock = { c: [960, 470], r: 0.7 * outExpo(de / 0.5), a: 0.8 * (1 - de / 0.5), col: '#FFFFFF' };
    if (de < 0.15) F.shake = 1 - de / 0.15;
    const g = clamp((t - fade) / (end - fade - 0.3));
    cam = { ...LINEUP, pos: [Math.sin(t * 0.4) * 0.25 * g, 0.3, 10.6 - 0.12 * (t - end + 65) * 0] };
    spotX = slotX(3); spotInt = 0.55 * g;
    F.names = clamp(de / 0.2) * (1 - clamp((t - fade) / 1.2));
    if (t >= e2) F.subs.push({ text: '你身上，哪一宗最重？', t0: e2, t1: fade + 1.0, size: 60, sub: '评论区告诉我。', pop: e2 });
    F.auraCol = '#B49CE0'; F.auraK = 0.6 * (1 - g) + 0.35 * g;
  }
  S.spot.position.set(spotX, 4.6, -0.6); S.spot.material.uniforms.uInt.value = spotInt * 0.35; S.spot.material.uniforms.uW.value = 0.3;
  S.stars.forEach(s => { s.material.uniforms.uScale.value = K.scale; });
  F.cam = cam; F.kick = kick; F.focus = focus;
  S.chars.forEach(C => { if (C.st.lite && (C.st.scatter ?? 0) < 0.3) F.icons.push({ i: C.i, p: project([slotX(C.i), 1.12, 0]), gray: C.st.gray }); });
  return F;
}
const projHead = C => project([C.g.position.x, HEAD_C[1], 0.3]);

function setState(C, s) {
  C.st = s;
  const a = s.aud, kick = a ? a.kick : 0, mid = a ? a.mid : 0;
  const gag = !!s.gag;
  C.gray.visible = s.gray && !s.lite; C.col.visible = !s.gray && !s.lite && !gag; C.gag.visible = !s.gray && !s.lite && gag;
  C.grayLite.visible = s.gray && s.lite; C.colLite.visible = !s.gray && s.lite;
  C.body.visible = !s.lite;
  const sc = s.scatter ?? 0;
  // 灰色闭眼的脸：亮度提高到 2.5 倍，聚光灯从上方照着；变身后人物是画面里最亮的东西
  const c = C3(C.sin.col), luma = 0.299 * c.r + 0.587 * c.g + 0.114 * c.b;
  const base = s.gray ? (s.lite ? 1.4 : 2.6) : 1.35 * clamp(0.42 / luma, 0.62, 1.25);       // 按颜色的亮度补偿：绿色不过曝、紫色不发暗
  const live = s.gray ? 0 : 1;
  for (const m of C.mats) {
    m.uniforms.uDim.value = base * (1 - 0.15 * (s.inhale ?? 0)) * (1 + (0.12 + 0.13 * live) * Math.max(0, kick));
    m.uniforms.uScatter.value = sc + live * 0.035 * mid; m.uniforms.uScatterDist.value = sc > 0.1 ? 1.4 : 0.35; m.uniforms.uScatFade.value = 1;
    m.uniforms.uDrift.value = 0.0015 + live * 0.02 * mid;                                           // 中音：脸上的粒子轻微地向外流动
  }
  C.rig.scale.setScalar(1 + (s.lite ? 0 : 0.015 + 0.025 * live) * kick);                // 灰色脸也跟着鼓点轻轻弹动                                                     // 低音：整体放大 4% 再回弹
  const eo = s.eyes;
  C.eyes.forEach(m => { m.visible = eo > 0.01 && sc < 1; m.material.uniforms.uInt.value = 0.95 * eo * (1 + 0.3 * Math.max(0, kick)); m.material.uniforms.uOpen.value = 0.45 + 0.55 * eo; m.material.uniforms.uRays.value = 0.8 * eo; });
  C.eyeHalo.forEach(m => { m.visible = eo > 0.01 && sc < 1; m.material.uniforms.uInt.value = 0.28 * eo; });
  C.halo.visible = s.halo > 0.01 && sc < 1.2;
  C.halo.scale.setScalar(lerp(0.2, 1, s.halo) * (1 - 0.3 * clamp(sc)) * (1 + 0.06 * Math.max(0, kick)));
  C.haloMats.forEach((m, j) => { m.uniforms.uBright.value = (j ? 0.3 : 0.95) * s.halo * (1 + 0.8 * Math.max(0, kick)) * (1 - clamp(sc)); });
  C.aura.visible = C.rays.visible = !s.gray && sc < 1.5;
  C.aura.material.uniforms.uInt.value = (s.lite ? 0.04 : 0.09) * (1 + 0.6 * Math.max(0, kick)) * (1 - clamp(sc / 1.5));
  C.aura.scale.setScalar(1 + 0.12 * Math.max(0, kick));
  C.rays.material.uniforms.uInt.value = (s.lite ? 0.03 : 0.12) * (1 + 0.5 * Math.max(0, kick)) * (1 - clamp(sc / 1.5));
  C.rays.material.uniforms.uRot.value = 0.05 * (a ? a.t : 0); C.rays.material.uniforms.uBurst.value = 1;
  C.props.visible = s.props > 0.01; C.propMats.forEach(m => { m.uniforms.uAsm.value = s.props; m.uniforms.uScatter.value = sc; m.uniforms.uScatterDist.value = 1.4; });
  for (const o of C.bodyProps) o.visible = s.props > 0.01;
}

// 角色动起来：头微微转动、呼吸；道具跟着节奏；反转那一拍的笑点
function animate(C, t, dt2, dt3, on, a) {
  const id = C.sin.id, bb = beatInBar(t), beatK = Math.exp(-bb.d / 0.12);
  C.head.rotation.set(0, on ? 0.09 * Math.sin(t * 0.9) : 0, on ? 0.035 * Math.sin(t * 0.7) : 0);
  C.head.scale.setScalar(1 + 0.01 * Math.sin(TAU * t / 3.2));
  const gag = dt3 >= 0 ? Math.exp(-Math.pow((dt3 - 0.3) / 0.28, 2)) : 0, hold = dt3 >= 0 ? clamp(dt3 / 0.15) : 0;
  const u = (m, k, v) => { m.uniforms[k].value = v; };
  if (id === 'pride') {
    C.head.rotation.x = on ? -0.13 : 0;
    if (C.crown) { u(C.crown.material, 'uB', gag); u(C.crown.material, 'uC', on ? beatK : 0); C.crown.scale.setScalar(1 + 0.15 * gag); }
  } else if (id === 'envy') {
    C.eyes.forEach((m, e) => { m.position.x = [FACE.eyeR, FACE.eyeL][e][0] + 0.05; m.material.uniforms.uInt.value *= 1 + 1.6 * hold * (1 - 0.5 * clamp(dt3 - 0.8)); });
    C.eyeHalo.forEach((m, e) => { m.position.x = [FACE.eyeR, FACE.eyeL][e][0] + 0.05; m.material.uniforms.uInt.value *= 1 + 1.2 * hold; });
    if (C.snake) {
      // 蛇头平时侧着；反转那一拍突然转向镜头、张嘴吐信；平时信子每两拍吐一次
      const turn = dt3 >= 0 ? outBack(clamp(dt3 / 0.22)) : 0;
      u(C.snake.material, 'uA', -1.0 * (1 - turn));
      u(C.snake.material, 'uB', dt3 >= 0 ? clamp(dt3 / 0.12) * (1 - clamp((dt3 - 1.0) / 0.3)) : 0);
      const flick = (bb.k === 0 || bb.k === 2) ? Math.sin(Math.PI * clamp(bb.d / 0.3)) : 0;
      u(C.snake.material, 'uC', Math.max(flick, dt3 >= 0 ? clamp(dt3 / 0.12) * (1 - clamp((dt3 - 1.0) / 0.3)) : 0));
      u(C.snake.material, 'uD', a.low);
    }
  } else if (id === 'wrath') {
    C.head.rotation.x = on ? 0.06 : 0;
    if (C.horns) u(C.horns.material, 'uB', gag);
  } else if (id === 'sloth') {
    C.head.rotation.x = on ? 0.12 + 0.06 * Math.pow(0.5 + 0.5 * Math.sin(t * 2.2), 4) : 0;
    for (const o of [C.hat, C.zz]) if (o) u(o.material, 'uB', hold);
  } else if (id === 'greed') {
    if (C.coins) { u(C.coins.material, 'uB', 1); u(C.coins.material, 'uC', on ? 30 + 20 * clamp(dt2 / 2) + 40 * hold : 0); }
  } else if (id === 'gluttony') {
    if (C.food) u(C.food.material, 'uB', hold);
  } else if (id === 'lust') {
    if (C.hearts) { u(C.hearts.material, 'uA', beatK); u(C.hearts.material, 'uB', gag * 0.8 + hold * 0.2); }
  }
}

// ------------------------------------------------------------ 2D 层
export function draw2D(t, ctx, F) {
  glowText('七宗罪 · 出厂设置', 60, 58, fs(700, 24), 'rgba(255,255,255,0.6)', { align: 'left', glow: 6, nobox: true });
  if (F.header != null) glowText(`0${F.header + 1} / 07`, 1860, 58, fs(700, 24), tone(SINS[F.header].col, 0.4), { align: 'right', glow: 10, glowColor: SINS[F.header].col, nobox: true });
  for (const ic of F.icons) drawIcon(ctx, SINS[ic.i].icon, ic.p[0], ic.p[1], ic.gray ? GRAY : SINS[ic.i].col, ic.gray ? 0.55 : 1);
  if (F.names > 0) S.chars.forEach(C => { const p = project([slotX(C.i), -1.05, 0]); glowText(C.sin.name, p[0], p[1], fs(700, 40), C.sin.col, { alpha: F.names, glow: 18, glowColor: C.sin.col }); });
  // 鼓点涟漪：从人物身后向外推出一圈很淡的光环
  for (const r of F.ripples) { ctx.save(); ctx.globalAlpha = 0.22 * (1 - r.k); ctx.strokeStyle = r.col; ctx.lineWidth = 2; ctx.shadowColor = r.col; ctx.shadowBlur = 14; ctx.beginPath(); ctx.arc(r.c[0], r.c[1], r.r0 * (1 + 1.2 * r.k), 0, TAU); ctx.stroke(); ctx.restore(); }
  if (F.card) drawCard(t, ctx, F.card);
  for (const s of F.subs) drawSub(t, ctx, s);
  if (F.shock) { ctx.save(); ctx.globalAlpha = F.shock.a; ctx.strokeStyle = F.shock.col; ctx.lineWidth = lerp(6, 1, 1 - F.shock.a / 0.8); ctx.shadowColor = F.shock.col; ctx.shadowBlur = 18; ctx.beginPath(); ctx.arc(F.shock.c[0], F.shock.c[1], F.shock.r * 1920, 0, TAU); ctx.stroke(); ctx.restore(); }
  if (F.flash > 0) { ctx.save(); ctx.globalAlpha = F.flash; ctx.fillStyle = F.flashCol; ctx.fillRect(0, 0, 1920, 1080); ctx.restore(); }
}
// 字幕在拍点上弹出：85% → 105% → 100%（0.2 秒）；反转句的关键词在下一拍再闪亮一次
const popScale = d => d < 0 ? 0.85 : d < 0.12 ? lerp(0.85, 1.05, outExpo(d / 0.12)) : d < 0.2 ? lerp(1.05, 1, sine((d - 0.12) / 0.08)) : 1;
function drawSub(t, ctx, s) {
  if (t < s.t0 || t > s.t1 + 0.12) return;
  const a = Math.min(clamp((t - s.t0) / 0.08), 1 - clamp((t - s.t1) / 0.12));
  ctx.save(); const g = ctx.createLinearGradient(0, 780, 0, 1080); g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, `rgba(0,0,0,${0.65 * a})`); ctx.fillStyle = g; ctx.fillRect(0, 780, 1920, 300); ctx.restore();
  const y = s.sub ? 930 : 975, sc = s.pop != null ? popScale(t - s.pop) : 1;
  const keyFlash = s.flash != null && t >= s.flash ? Math.exp(-(t - s.flash) / 0.15) : 0;
  ctx.save(); ctx.translate(960, y); ctx.scale(sc, sc);
  marked(ctx, s.text, 0, 0, s.size, a, s.col, 1 + 0.12 * keyFlash, keyFlash);
  ctx.restore();
  if (s.sub) glowText(s.sub, 960, y + 66, fs(700, 34), 'rgba(255,255,255,0.8)', { alpha: a, glow: 8 });
}
function drawCard(t, ctx, c) {
  const sin = SINS[c.i], a = clamp((t - c.t0) / 0.12) * (1 - c.fade);
  if (a <= 0) return;
  ctx.save(); const g = ctx.createLinearGradient(0, 0, 900, 0); g.addColorStop(0, `rgba(0,0,0,${0.45 * a})`); g.addColorStop(1, 'rgba(0,0,0,0)'); ctx.fillStyle = g; ctx.fillRect(0, 0, 900, 1080); ctx.restore();
  const sc = popScale(t - c.t0);
  ctx.save(); ctx.translate(430, 420); ctx.scale(sc, sc);
  glowText(sin.name, 0, 0, fs(900, 190), sin.col, { alpha: a, glow: 40, glow2: 80, glowColor: sin.col, shadowBlur: 18 });
  ctx.restore();
  glowText(`出厂设置 · 0${c.i + 1} / 07`, 430, 560, fs(700, 28), tone(sin.col, 0.5), { alpha: a, glow: 10, glowColor: sin.col });
  ctx.save(); const g2 = ctx.createLinearGradient(0, 800, 0, 1080); g2.addColorStop(0, 'rgba(0,0,0,0)'); g2.addColorStop(1, `rgba(0,0,0,${0.65 * a})`); ctx.fillStyle = g2; ctx.fillRect(0, 800, 1920, 280); ctx.restore();
  marked(ctx, sin.twist, 960, 922, 44, a, tone(sin.col, 0.55));
  glowText(sin.fact, 960, 995, fs(700, 48), tone(sin.col, 0.6), { alpha: a, glow: 18, glowColor: sin.col });
  drawTags(t, ctx, c);
}

// 结尾卡的四个四字词：沿光环的弧度摆在左上、右上、左下、右下；发光小圆点 + 细线连到光环上，像标注
// 结尾卡出现后每一拍弹出一个（80%→100% 并淡入，0.15 秒）；之后跟着低音轻闪、上下漂浮 6px；结尾卡散开时一起化成粒子散开
const TAG_ANG = [128, 50, 210, 330].map(d => d * Math.PI / 180);
const tagCache = new Map();
function tagSprite(word, col) {
  const key = word + col; if (tagCache.has(key)) return tagCache.get(key);
  const c = document.createElement('canvas'), pad = 18; const x = c.getContext('2d'); x.font = fs(700, 34);
  const w = Math.ceil(x.measureText(word).width) + pad * 2, h = 34 + pad * 2; c.width = w; c.height = h;
  x.font = fs(700, 34); x.textAlign = 'center'; x.textBaseline = 'middle';
  x.shadowColor = col; x.shadowBlur = 12; x.fillStyle = col; x.fillText(word, w / 2, h / 2 + 1);
  x.shadowBlur = 4; x.fillText(word, w / 2, h / 2 + 1);
  const o = { c, w, h }; tagCache.set(key, o); return o;
}
function drawTags(t, ctx, c) {
  const sin = SINS[c.i], C = S.chars[c.i]; if (!sin.tags || !C) return;
  const hi = tone(sin.col, 0.6), j0 = lastIdx(A.B, c.t0 + 0.02), kick = Math.max(0, kickSpring(t)), fade = c.fade ?? 0;
  const cen = new THREE.Vector3(), q = new THREE.Vector3();
  C.halo.updateMatrixWorld(); C.halo.getWorldPosition(cen);
  const pc = project(cen.toArray());
  sin.tags.forEach((word, k) => {
    const tk = A.B[j0 + k] ?? c.t0 + k * 0.5, d = t - tk; if (d < 0) return;
    const pin = clamp(d / 0.15), pop = 0.8 + 0.2 * outBack(pin), a = pin * (1 - fade) * (0.88 + 0.12 * kick);
    if (a <= 0.003 && fade < 0.01) return;
    const ang = TAG_ANG[k], right = Math.cos(ang) > 0;
    q.set(1.22 * Math.cos(ang), 1.22 * Math.sin(ang), 0); C.halo.localToWorld(q);
    const pr = project(q.toArray());                                         // 光环上的连接点
    const ux = pr[0] - pc[0], uy = pr[1] - pc[1], ul = Math.hypot(ux, uy) || 1;
    const fl = 6 * Math.sin(TAU * t / 2.6 + k * 1.7);                        // 上下漂浮 6px
    const elbow = [pr[0] + ux / ul * 40, pr[1] + uy / ul * 40 + fl], dot = [elbow[0] + (right ? 34 : -34), elbow[1]];
    const sp = tagSprite(word, hi), tx = dot[0] + (right ? 16 + sp.w / 2 - 18 : -16 - sp.w / 2 + 18), ty = dot[1];
    if (fade < 0.01) {
      ctx.save(); ctx.globalAlpha = a * 0.55; ctx.strokeStyle = hi; ctx.lineWidth = 1; ctx.shadowColor = sin.col; ctx.shadowBlur = 4;
      ctx.beginPath(); ctx.moveTo(pr[0], pr[1]); ctx.lineTo(elbow[0], elbow[1]); ctx.lineTo(dot[0], dot[1]); ctx.stroke();
      ctx.globalAlpha = a; ctx.fillStyle = '#FFFFFF'; ctx.shadowBlur = 10 + 8 * kick; ctx.beginPath(); ctx.arc(dot[0], dot[1], 3.2, 0, TAU); ctx.fill();
      ctx.beginPath(); ctx.arc(pr[0], pr[1], 1.8, 0, TAU); ctx.fill();
      ctx.translate(tx, ty); ctx.scale(pop, pop); ctx.globalAlpha = a; ctx.shadowBlur = 0;
      ctx.drawImage(sp.c, -sp.w / 2, -sp.h / 2);
      ctx.restore();
    } else {
      // 化成粒子散开：把字切成小方块，各自向外飘散、淡出
      const cell = 4, al = 1 - fade, f = fade;
      ctx.save(); ctx.globalAlpha = al;
      for (let yy = 0; yy < sp.h; yy += cell) for (let xx = 0; xx < sp.w; xx += cell) {
        const hsh = hash(xx * 0.131 + yy * 7.31 + k * 91.7), hs2 = hash(xx * 3.7 + yy * 0.73 + k * 13.1);
        const dx = (ux / ul * 0.6 + (hsh - 0.5)) * 220 * f * (0.4 + hs2), dy = (uy / ul * 0.6 + (hs2 - 0.5)) * 220 * f * (0.4 + hsh) - 40 * f;
        ctx.drawImage(sp.c, xx, yy, cell, cell, tx - sp.w / 2 + xx + dx, ty - sp.h / 2 + yy + dy, cell, cell);
      }
      ctx.restore();
    }
  });
}

// 〔…〕里的关键词用这一宗的颜色（或高光色），〔亮〕…〔/亮〕用白色高亮加光晕
function marked(ctx, text, cx, y, size, a, keyCol, pop = 1, flash = 0) {
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
      glowText(s, 0, 0, fs(700, size), col, { alpha: a, glow: k === 'hi' ? 30 : k ? 20 + 30 * flash : 10, glow2: k === 'hi' ? 50 : k ? 60 * flash : 0, glowColor: k === 'hi' ? '#FFFFFF' : k ? keyCol : '#000000', nobox: true });
      ctx.restore();
    }
    x += ws[j];
  });
  BOXES.push({ x0: cx - ws.reduce((p, q) => p + q, 0) / 2, x1: cx + ws.reduce((p, q) => p + q, 0) / 2, y0: y - size * 0.6, y1: y + size * 0.6, label: text, alpha: a });
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
