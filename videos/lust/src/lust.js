// 《七宗罪》第七集（最终集）：色欲（短版）。角色、字幕、律动沿用合集与前几集。合集的场景与时间轴（数据与音频工具在 show_core.js）
import * as THREE from 'three';
import { K, glow, project } from './core.js';
import { FACE, PB } from './geo.js';
import { cloudMaterial } from './mat.js';
import { clamp, lerp, lerp3, prog, sine, outExpo, outBack, inOut, hash, TAU } from './util.js';
import { glowText, fs, BOXES, setCtx } from './text.js';
import { idolMaterial, brainMaterial } from './idol.js';
import { buildBrainSide } from './long_assets.js';
import * as H from './halo.js';
import * as PR from './props.js';
import { SINS, C3, hexs, tone, GRAY, SLOT_DX, slotX, HEAD_C, A, setAudio, env, lastIdx, kickSpring, beatInBar } from './show_core.js';
export { SINS };

let S, BT, B, R, TL;
function pts(geo, mat, parent, order = 0) { const p = new THREE.Points(geo, mat); p.frustumCulled = false; p.renderOrder = order; parent.add(p); K.mats.push(mat); return p; }
function makeStars(n, z, size, seed) {
  const g = new THREE.BufferGeometry(), P = new Float32Array(n * 3), Sd = new Float32Array(n);
  for (let i = 0; i < n; i++) { const k = (12.5 - z) / 12.5; P[i * 3] = (hash(i * 1.7 + seed) - 0.5) * 22 * k; P[i * 3 + 1] = (hash(i * 2.9 + seed) - 0.5) * 12 * k; P[i * 3 + 2] = z; Sd[i] = hash(i * 4.1 + seed); }
  g.setAttribute('position', new THREE.BufferAttribute(P, 3)); g.setAttribute('aSeed', new THREE.BufferAttribute(Sd, 1));
  const m = new THREE.ShaderMaterial({ uniforms: { uTime: { value: 0 }, uSize: { value: size }, uScale: { value: 1 }, uSpeed: { value: z < -15 ? 0.8 : 2.4 } }, transparent: true, depthWrite: false, depthTest: false, blending: THREE.AdditiveBlending,
    vertexShader: `attribute float aSeed; uniform float uTime, uSize, uScale, uSpeed; varying float vB;
      void main(){ vec3 p = position; float w = 6.28318530718/${TL.toFixed(4)}; p.x += uSpeed/w*(0.6 + 0.8*aSeed)*sin(uTime*w + aSeed*40.0); p.y += 0.15*sin(uTime*w*6.0 + aSeed*20.0);   // 周期 = 成片时长
        gl_Position = projectionMatrix*modelViewMatrix*vec4(p, 1.0); gl_PointSize = uSize*(0.6 + 1.4*aSeed*aSeed)*uScale; vB = (0.25 + 0.75*aSeed)*(0.7 + 0.3*sin(uTime*6.28318530718/${TL.toFixed(4)}*21.0 + aSeed*50.0)); }`,
    fragmentShader: `varying float vB; void main(){ vec2 c = gl_PointCoord - 0.5; if (length(c) > 0.5) discard; gl_FragColor = vec4(vec3(0.85, 0.85, 0.95)*vB*0.5, 1.0); }` });
  const p = new THREE.Points(g, m); p.frustumCulled = false; p.renderOrder = -60; K.scene.add(p); K.mats.push(m); return p;
}
// 蓄力：灰色阶段脸周围的粒子慢慢向内聚集（uK 0→1），在变身的重拍上一起爆开（uB 0→1）
function makeGather(n = 6000) {
  const g = new THREE.BufferGeometry(), D = new Float32Array(n * 3), Sd = new Float32Array(n);
  for (let i = 0; i < n; i++) { let x, y, z, l; do { x = hash(i * 1.31) * 2 - 1; y = hash(i * 2.17 + 0.3) * 2 - 1; z = hash(i * 3.71 + 0.7) * 2 - 1; l = Math.hypot(x, y, z); i += 0; } while (false); l = l || 1; D[i * 3] = x / l; D[i * 3 + 1] = y / l; D[i * 3 + 2] = z / l * 0.5; Sd[i] = hash(i * 4.93 + 1.1); }
  g.setAttribute('position', new THREE.BufferAttribute(D, 3)); g.setAttribute('aSeed', new THREE.BufferAttribute(Sd, 1));
  const m = new THREE.ShaderMaterial({ uniforms: { uK: { value: 0 }, uB: { value: 0 }, uC: { value: new THREE.Vector3() }, uCol: { value: C3('#FFFFFF') }, uInt: { value: 1 }, uScale: { value: 1 }, uTime: { value: 0 } },
    transparent: true, depthWrite: false, depthTest: false, blending: THREE.AdditiveBlending,
    vertexShader: `attribute float aSeed; uniform float uK, uB, uInt, uScale, uTime; uniform vec3 uC; varying float vB;
      void main(){ float r0 = 1.1 + 1.6*aSeed, r1 = 0.55 + 0.12*aSeed; float k = uK*uK*(3.0 - 2.0*uK);
        float r = mix(r0, r1, k) + uB*(1.5 + 3.0*aSeed); float sw = (1.0 - k)*1.2 + k*0.3 + aSeed*6.28;
        vec3 d = position; float ang = sw + uTime*0.4*(0.5 + aSeed); d.xy = mat2(cos(ang), -sin(ang), sin(ang), cos(ang))*d.xy;
        vec3 p = uC + d*r*vec3(1.0, 0.9, 1.0);
        gl_Position = projectionMatrix*modelViewMatrix*vec4(p, 1.0); gl_PointSize = (3.0 + 4.0*aSeed*aSeed)*uScale*(1.0 + 1.2*uB);
        vB = uInt*(0.25 + 0.75*k)*(1.0 - uB)*(0.5 + 0.5*aSeed); }`,
    fragmentShader: `uniform vec3 uCol; varying float vB; void main(){ vec2 c = gl_PointCoord - 0.5; float d = length(c); if (d > 0.5) discard; gl_FragColor = vec4(uCol*vB*exp(-d*d*12.0), 1.0); }` });
  const p = new THREE.Points(g, m); p.frustumCulled = false; p.renderOrder = 35; p.visible = false; K.scene.add(p); return p;
}
function propMat(hex, o = {}) {
  return cloudMaterial({ size: o.size ?? 0.008, bright: o.bright ?? 0.9, depthRef: 4, maxPx: 6, drift: 0.002, colA: tone(hex, 0.75), colB: hex,
    uniforms: { uGray: { value: 0 }, uA: { value: 0 }, uB: { value: 0 }, uC: { value: 0 }, uD: { value: 0 }, uAsm: { value: 1 }, uL: { value: 0 }, ...(o.uniforms || {}) },
    uniformDecl: 'uniform float uGray, uA, uB, uC, uD, uAsm, uL;' + (o.uniformDecl || ''),   // uL = 1：排成一排时的精简小道具
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
  const mk = () => idolMaterial(sin.col, { bright: 0.85, cran: 0.3, rim: 0.15, cranEdge: 1, size: 0.0105 });
  const mGray = mk(), mCol = mk(), mGag = mk(), mCalm = mk();
  mGray.uniforms.uGray.value = 1; [mGray, mCol, mGag].forEach(m => { m.uniforms.uEyeOpen.value = 0; });
  mCol.uniforms.uRamp.value = mGag.uniforms.uRamp.value = mCalm.uniforms.uRamp.value = 1; mCalm.uniforms.uEyeOpen.value = 0;                       // 变色：保留灰色阶段的明暗，只映射颜色
  const C = { sin, i, g, rig, head,
    gray: pts(heads.neutral, mGray, head), col: pts(heads[sin.id], mCol, head), gag: pts(heads[sin.id + 'Gag'] ?? heads[sin.id], mGag, head),
    calm: heads[sin.id + 'Calm'] ? pts(heads[sin.id + 'Calm'], mCalm, head) : null,
    grayLite: pts(heads.neutralLite, mGray, head), colLite: pts(heads[sin.id + 'Lite'], mCol, head),
    body: pts(heads.body, idolMaterial(sin.col, { bright: 0.75, rim: 0.45, size: 0.0085, cran: 0.8, dust: true }), rig) };
  C.bodyLite = pts(heads.bodyLite, C.body.material, rig);                           // 那一排里的脸也带着脖子和肩膀
  C.mats = [mGray, mCol, mGag, mCalm, C.body.material];
  // 身后的颜色光晕、放射的细光线、光环（完整的细圆环，在头后面，比头大一圈）
  C.aura = glowMesh(sin.col, 5.0, g, -1.2, -15); C.aura.material = H.glowPlane(1); C.aura.material.uniforms.uCol.value.set(sin.col);
  C.rays = new THREE.Mesh(new THREE.PlaneGeometry(7, 7), H.raysPlane()); C.rays.position.set(HEAD_C[0], HEAD_C[1], -1.0); C.rays.renderOrder = -14; g.add(C.rays);
  C.rays.material.uniforms.uCol.value.set(tone(sin.col, 0.3)); C.rays.material.uniforms.uN.value = 72;
  C.halo = new THREE.Group(); C.halo.position.set(HEAD_C[0], HEAD_C[1], -0.7); rig.add(C.halo);
  C.haloMats = [['rings', 1.22, 1.0], ['ticks', 1.4, 0.3]].map(([type, r, br], j) => { const m = H.ringMaterial(sin.col, br); m.uniforms.uColA.value.set(tone(sin.col, 0.8)); pts(H.ringPB(type, r, 500 + i * 7 + j, 1).geometry(THREE), m, C.halo, -5); return m; });
  // 眼睛：两团强烈的光，带辉光和向外的光晕
  C.eyes = [FACE.eyeR, FACE.eyeL].map(p => { const m = glow(2, sin.col, [0.5, 0.28], head, { billboard: false, order: 46, core: sin.id === 'sloth' ? '#EFFFFF' : sin.id === 'lust' ? '#FFD9E8' : '#FFC8B8' }); m.position.set(p[0], p[1], p[2] + 0.04); return m; });
  C.eyeHalo = [FACE.eyeR, FACE.eyeL].map(p => { const m = glow(0, sin.col, [0.55, 0.55], head, { billboard: false, order: 45, core: tone(sin.col, 0.6) }); m.position.set(p[0], p[1], p[2] + 0.03); return m; });
  // 道具
  C.props = new THREE.Group(); head.add(C.props); C.propMats = []; C.bodyProps = [];
  const P = (pb, o = {}, parent = C.props) => { const m = propMat(o.col ?? sin.col, o); const p = pts(pb.geometry(THREE), m, parent, o.order ?? 30); C.propMats.push(m); if (parent !== C.props) C.bodyProps.push(p); return p; };
  if (sin.id === 'pride') {
    // 王冠：uB 笑点时尖角伸长；uC 宝石闪（每一拍）
    C.crown = P(PR.crown(), { bright: 0.95, size: 0.0085, posHook: `{ float y0 = ${PR.CROWN_TOP.toFixed(3)}; if (p.y > y0) p.y = y0 + (p.y - y0)*(1.0 + uB*0.6); }`,
      colHook: 'if (aExtra.y > 4.5) col = vec3(1.0, 0.86, 0.6); else if (aExtra.y > 0.5) { col = vec3(1.0, 0.95, 1.0); b *= 1.0 + 1.2*uC; }' });
  } else if (sin.id === 'envy') {
    const sk = PR.snake(); C.snakeHead = sk.head; const SL = sk.L.toFixed(3);
    C.snake = P(sk.pb, { bright: 1.35, size: 0.009, uniforms: { uH: { value: new THREE.Vector3(...sk.head) } }, uniformDecl: 'uniform vec3 uH;',
      posHook: `
        if (uL > 0.5 && aExtra.y < 0.5 && aExtra.x < 0.24) vis = 0.0;   /* 排成一排时不要垂下来的长尾巴 */
        if (aExtra.y < 0.5) { float w = sin(aExtra.x*40.0 - uTime*qw(3.0)); p += vec3(0.0, 0.016*w*(0.5 + uD), 0.01*cos(aExtra.x*34.0 - uTime*qw(2.4))); }   // 蛇身随低音起伏
        else {
          vec3 q = p - uH;
          if (aExtra.y > 3.5) { float ja = 0.22 + uB*0.45; /* 嘴一直微微张着 */ q.yz = mat2(cos(ja), sin(ja), -sin(ja), cos(ja))*q.yz; }        // 下颌张开
          if (aExtra.y > 2.5 && aExtra.y < 3.5) { q.z = ${SL} + (q.z - ${SL})*uC; vis *= step(0.05, uC); }           // 信子伸出
          float pt = 0.55*(1.0 - 0.6*uB); q.yz = mat2(cos(pt), -sin(pt), sin(pt), cos(pt))*q.yz; float a = uA; q.xz = mat2(cos(a), -sin(a), sin(a), cos(a))*q.xz; p = uH + q;   /* 蛇头微微低头，三角形的头顶朝向镜头 */                             // 蛇头转向
        }`, colHook: 'if (aExtra.y > 1.5 && aExtra.y < 2.5) { col = vec3(1.0, 0.95, 0.55); b *= 1.6 + 1.2*uB; } if (aExtra.y > 2.5 && aExtra.y < 3.5) col = vec3(1.0, 0.45, 0.55);' }, rig);
  } else if (sin.id === 'wrath') {
    if (heads.wrathCracks) { const m = propMat('#FF7A3A', { bright: 2.8, size: 0.008, colHook: '{ b *= 0.8 + 0.5*sin(uTime*qw(7.0) + aExtra.y*1.7); col = mix(col, vec3(1.0, 0.85, 0.6), 0.35); }' }); C.cracks = pts(heads.wrathCracks, m, C.props, 31); C.propMats.push(m); }   // 脸上发光的裂纹
    C.horns = P(PR.lightningHorns(), { bright: 1.0, col: tone(sin.col, 0.3), posHook: '{ float id = aExtra.y; float on = step(0.35, fract(sin(floor(mod(uTime, ' + TL.toFixed(4) + ')*14.0 + id*3.7)*43.1)*91.7)); vis *= mix(1.0, on, step(0.5, mod(id, 3.0))); p *= 1.0 + uB*0.35; }' });
  } else if (sin.id === 'sloth') {
    C.hat = P(PR.beanie(), { bright: 2.4, size: 0.0095, posHook: '{ p.y -= uB*0.32; p.z += uB*0.06; }', colHook: '{ float gl = dot(col, vec3(0.3, 0.59, 0.11)); col = aExtra.y > 0.5 ? vec3(0.72, 0.96, 0.99) : vec3(0.13, 0.56, 0.65); col = mix(col, vec3(gl), uGray); }' });
    C.scarf = P(PR.scarf(), { bright: 1.9, size: 0.0095, colHook: '{ float gl = dot(col, vec3(0.3, 0.59, 0.11)); col = mix(vec3(0.16, 0.62, 0.7), vec3(0.72, 0.96, 0.99), 0.3*h1(aSeed*3.1)); col = mix(col, vec3(gl), uGray); }', posHook: '{ if (uL > 0.5 && aExtra.y > 0.5 && p.y < -1.08) vis = 0.0; }' }, rig);   // 排成一排时垂下的部分不超过肩膀
    C.zz = P(PR.zees(), { bright: 1.3, posHook: '{ float f = fract(uTime*floor(0.35*uLoop + 0.5)/uLoop + aExtra.y*0.33); p += vec3(0.08*sin(f*6.0 + aExtra.y), f*0.5, 0.0); vis *= uB*sin(3.14159*f); }' });
  } else if (sin.id === 'greed') {
    // 贪婪：金币像星环一样绕着头转（环面略倾斜），每枚金币正面朝镜头轻轻摆动，表面有一道扫过的金属反光
    // 金币环：20–30 枚古钱（扁圆、有厚度、亮边、方孔）像行星环一样绕着头转，环面倾斜、前半圈从下巴下面经过，不挡脸
    // uC 枚数；uC0 + uFly：最近飞来的一批从四周飞进环里；uKick 鼓点向外弹；uPhase 转角（每秒约 30 度）；uTight 收紧到胸口；uLoose 松开飘远
    C.coins = P(PR.coins(64, 2), { bright: 4.0, size: 0.012,
      uniforms: { uC0: { value: 0 }, uFly: { value: 1 }, uKick: { value: 0 }, uPhase: { value: 0 }, uTight: { value: 0 }, uLoose: { value: 0 }, uMid: { value: 0 } },
      uniformDecl: 'uniform float uC0, uFly, uKick, uPhase, uTight, uLoose, uMid;',
      posHook: `{
        float c = aExtra.y, a = c*2.39996 + uPhase, th = 0.05 + 0.006*uC;
        float rr = (1.02 + 0.24*h1(c*3.1) + th*(h1(c*5.3) - 0.5)*2.0)*(1.0 + 0.08*uKick)*(1.0 + 1.6*uLoose*h1(c*9.1));
        float spin = 0.55*sin(uTime*qw(1.7) + c*1.3); vec3 q = vec3(p.x*cos(spin) + p.z*sin(spin), p.y, -p.x*sin(spin) + p.z*cos(spin));
        vec3 orbit = vec3(cos(a)*rr*1.08, 0.08 - sin(a)*rr*0.72 + (h1(c*7.3) - 0.5)*th, sin(a)*rr*0.55 - 0.1 - uLoose*1.2*h1(c*6.1));   /* 前半圈从下巴下面经过 */
        vec3 chest = vec3(cos(a)*(0.5 + 0.12*h1(c*3.1)), -1.05 + 0.12*sin(a) + 0.06*(h1(c*7.3) - 0.5), 0.35 + sin(a)*0.22);   /* 搂进怀里 */
        orbit = mix(orbit, chest, uTight);
        vec3 far = normalize(h3(c*1.7) - 0.5)*4.0 + vec3(0.0, 0.5, 0.0);
        if (uL > 0.5) { float a2 = c/8.0*6.28318 + uTime*qw(0.55); orbit = vec3(cos(a2)*0.6, 0.1 - sin(a2)*0.12, sin(a2)*0.3 - 0.05); q *= 0.5; vis *= step(c, 7.5); p = orbit + q; }   /* 排成一排：贴着头的一小圈，最多 8 枚 */
        else { float k = c >= uC0 ? clamp(uFly*1.5 - h1(c*2.3)*0.5, 0.0, 1.0) : 1.0; k = k*k*(3.0 - 2.0*k); p = mix(far, orbit, k) + q*(1.0 - 0.35*uTight); vis *= step(c, uC - 0.5); vis *= 1.0 - smoothstep(0.55, 1.0, uLoose*h1(c*4.4)*1.4); } }`,
      colHook: '{ float gl = exp(-pow(aExtra.x - 1.3*sin(uTime*qw(2.2) + aExtra.y*0.7), 2.0)*10.0); col = mix(col, vec3(1.0, 0.97, 0.85), gl*0.8); b *= (0.75 + 1.4*gl)*(0.85 + 0.5*uMid)*(1.0 - 0.78*uTight); }' });
    { const cm = C.coins.material.uniforms; cm.uColA.value.set('#FFE7A3'); cm.uColB.value.set('#E8A82A'); cm.uFacing.value = 0; }   // 实心的金色古钱
    C.eyeShapes = [FACE.eyeR, FACE.eyeL].map(e => { const m = propMat('#FFD25A', { bright: 1.3, size: 0.008 }); const o = pts(PR.coinEye(1.6).geometry(THREE), m, head, 47); o.position.set(e[0], e[1], e[2] + 0.03); o.scale.setScalar(1.25); return o; });
  } else if (sin.id === 'gluttony') {
    // 暴食：一圈飘浮的食物（鸡腿、包子、碗、汉堡），反转时一个个被吸进嘴里
    C.food = P(PR.food(2), { bright: 2.3, size: 0.0095, col: tone(sin.col, 0.35), posHook: `{
        float c = aExtra.y, a = c/8.0*6.28318 + uTime*qw(0.3); vec3 home = vec3(cos(a)*1.25, 0.12 + sin(a)*0.82, 0.3);   /* 一圈绕在头四周、彼此分开，不挡脸 */
        vec3 mouth = vec3(0.0, -0.3, 0.45); float k = clamp(uB*2.4 - c*0.2, 0.0, 1.0);   // 一个接一个被吸进嘴里
        if (uL > 0.5) { vis *= (c < 0.5 || abs(c - 2.0) < 0.5) ? 1.0 : 0.0; float sd = c < 0.5 ? -1.0 : 1.0; home = vec3(sd*0.52, 0.02 + 0.07*sin(uTime*qw(1.3) + c), 0.3 + 0.06*cos(uTime*qw(1.3) + c)); k = 0.0; }   /* 排成一排：只留碗和鸡腿，贴着头两侧 */
        p = mix(home, mouth, k*k) + p*mix(1.55, 0.62, uL)*(1.0 - 0.8*k); vis *= 1.0 - smoothstep(0.85, 1.0, k); vis *= step(0.5, uL); }` }, rig);   /* 只在排成一排时显示（和前几集一样） */
    // 特写用的大餐、大胡子、餐巾只在暴食那一集里用；这里只要排成一排时的小食物圈
  } else if (sin.id === 'lust') {
    C.hearts = P(PR.hearts(24), { bright: 2.0, size: 0.0095, posHook: `{
        float c = aExtra.y, a = c/24.0*6.28318 + uTime*qw(0.4), rr = 0.84 + 0.18*h1(c*5.1) + 0.08*sin(uTime*qw(1.0) + c);
        vec3 home = vec3(cos(a)*rr, 0.05 + 0.6*sin(a)*0.85, 0.25 + 0.1*cos(a));
        float hs = 1.0;
        if (uL > 0.5) { float a2 = c/8.0*6.28318 + uTime*qw(0.4); home = vec3(cos(a2)*0.52, 0.08 + sin(a2)*0.66, 0.3); hs = 0.46; vis *= step(c, 7.5); }   /* 排成一排：贴着头的一小圈，最多 8 颗 */
        vec3 o = home + normalize(home - vec3(0.0, 0.05, 0.0))*uB*(1.5 + h1(c)*2.0); p = o + p*hs*(1.0 + 0.25*uA + uB*0.8); }` });
    C.eyeShapes = [FACE.eyeR, FACE.eyeL].map(e => { const m = propMat('#FF7FB5', { bright: 1.8, size: 0.008 }); const o = pts(PR.heartEye().geometry(THREE), m, head, 47); o.position.set(e[0], e[1], e[2] + 0.03); return o; });
    C.veil = makeVeil(head);   // 脸前一层半透明、飘动的粒子薄纱（五官处留空）
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


const camLerp = (a, b, k) => ({ pos: lerp3(a.pos, b.pos, k), target: lerp3(a.target, b.target, k), fov: lerp(a.fov, b.fov, k) });
const orbit = (c, ang, cx) => { const dx = c.pos[0] - cx, dz = c.pos[2]; return { ...c, pos: [cx + dx * Math.cos(ang) + dz * Math.sin(ang), c.pos[1], -dx * Math.sin(ang) + dz * Math.cos(ang)] }; };
const qw = w => TAU * Math.max(1, Math.round(w * TL / TAU)) / TL;   // 角频率按成片时长（56 秒）量化   // 角频率按成片时长量化
const projHead = C => project([C.g.position.x, HEAD_C[1], 0.3]);

function setState(C, s) {
  C.st = s;
  const a = s.aud, kick = a ? a.kick : 0, mid = a ? a.mid : 0;
  const gag = !!s.gag;
  const calm = !!C.calm && (s.calm ?? 0) > 0.5 && !gag;
  C.gray.visible = s.gray && !s.lite; C.col.visible = !s.gray && !s.lite && !gag && !calm; C.gag.visible = !s.gray && !s.lite && gag; if (C.calm) C.calm.visible = !s.gray && !s.lite && calm;
  C.grayLite.visible = s.gray && s.lite; C.colLite.visible = !s.gray && s.lite;
  C.body.visible = !s.lite; C.bodyLite.visible = s.lite;
  C.body.material.uniforms.uGray.value = s.gray ? 1 : 0; C.body.material.uniforms.uRamp.value = s.gray ? 0 : 1;
  const sc = s.scatter ?? 0;
  // 灰色闭眼的脸：亮度提高到 2.5 倍，聚光灯从上方照着；变身后人物是画面里最亮的东西
  const c = C3(C.sin.col), luma = 0.299 * c.r + 0.587 * c.g + 0.114 * c.b;
  const base = s.gray ? (s.lite ? 6.2 : 6.0) :   // 灰色脸亮度提高 60%
     (s.lite ? 3.0 : 4.8 * (C.sin.id === 'greed' ? 1.12 : C.sin.id === 'gluttony' ? 1.15 : C.sin.id === 'lust' ? 0.5 : 1)) * clamp(0.42 / luma, 0.7, 1.15);   // 金色亮度高，按亮度补偿会压得太暗：贪婪特写再提一点   // 亮度靠人物本身（亮部仍是红色）       // 按颜色的亮度补偿：绿色不过曝、紫色不发暗
  const live = s.gray ? 0 : 1;
  for (const m of C.mats) {
    m.uniforms.uDim.value = base * (1 - 0.15 * (s.inhale ?? 0)) * (1 + 0.2 * Math.max(0, kick)) * (1 + 0.9 * (s.pop ?? 0)) * Math.pow(s.shrink ?? 1, 2);   // 缩小时粒子挤在一起，按面积压暗，不过曝
    m.uniforms.uScatter.value = sc + live * 0.008 * mid; m.uniforms.uScatterDist.value = sc > 0.1 ? 1.4 : 0.35; m.uniforms.uScatFade.value = 1;
    m.uniforms.uDrift.value = 0.018 + live * 0.016 * mid;                                           // 粒子持续流动（中音时多一点），但不糊掉五官
  }
  C.rig.scale.setScalar((1 + (s.lite ? 0.03 : 0.06) * kick) * (1 + 0.1 * (s.pop ?? 0)));   // 每一拍放大 6% 再回弹；被聚光灯照到时猛地放大 10%                // 灰色脸也跟着鼓点轻轻弹动                                                     // 低音：整体放大 4% 再回弹
  const eo = s.eyes;
  const shp = !!C.eyeShapes && (C.sin.id !== 'greed' || s.lite || (s.coinEye ?? 0) > 0.5);   // 贪婪：平时是两团金光，兴奋时才变成金币眼（排成一排时和前几集一样是金币眼）
  if (C.eyeShapes) C.eyeShapes.forEach(o => { o.visible = shp && eo > 0.02 && sc < 1; o.scale.setScalar(0.35 + 0.65 * Math.min(1, eo * 1.5)); o.material.uniforms.uScatter.value = 0; });   // 贪婪的金币眼、色欲的心形眼
  if (C.sin.id === 'lust' && !s.lite) {                                      // 色欲特写：平时是两团柔和的玫红光，心动时变成发光的心形
    const h = s.heart ?? 0, hs = s.heartScale ?? 1;
    C.eyeShapes.forEach(o => { o.visible = h > 0.02 && eo > 0.02 && sc < 1; o.scale.setScalar((0.3 + 0.7 * h) * hs); o.material.uniforms.uBright.value = 1.8 * Math.pow(hs, 1.6); });   // 放大后粒子变稀，按面积补亮度
  }
  else if (C.sin.id === 'lust') C.eyeShapes.forEach(o => { o.material.uniforms.uBright.value = 1.8; });   // 每帧都重设，渲染结果只由 t 决定
  if (C.veil) { C.veil.visible = !s.lite && !s.gray && (s.props ?? 0) > 0.01; C.veil.material.uniforms.uA.value = (s.veil ?? 1) * clamp(s.props ?? 0) * (1 - clamp(sc)); }
  const lustH = C.sin.id === 'lust' && !s.lite ? (s.heart ?? 0) : -1;
  C.eyes.forEach(m => { m.visible = (lustH >= 0 ? lustH < 0.98 : !shp) && eo > 0.01 && sc < 1; m.material.uniforms.uInt.value = 0.95 * eo * (1 + 0.3 * Math.max(0, kick)) * (lustH >= 0 ? 1 - lustH : 1); m.material.uniforms.uOpen.value = 0.45 + 0.55 * eo; m.material.uniforms.uRays.value = 0.8 * eo; });
  C.eyeHalo.forEach(m => { m.visible = eo > 0.01 && sc < 1; m.material.uniforms.uInt.value = 0.28 * eo; });
  C.halo.visible = s.halo > 0.01 && sc < 1.2; C.halo.rotation.z = qw(s.lite ? 0.35 : 1.1) * (a ? a.t : 0) + C.i;   // 光环一直慢慢转
  // 排成一排时光环缩小：直径不超过格子宽度的 85%、互不重叠，亮度降到 60%，外圈刻度不要
  C.halo.scale.setScalar((s.lite ? 0.42 : lerp(0.2, 1, s.halo)) * (1 - 0.3 * clamp(sc)) * (1 + (s.lite ? 0.04 : 0.1) * Math.max(0, kick)));
  C.haloMats.forEach((m, j) => { m.uniforms.uBright.value = (j ? (s.lite ? 0 : 0.3) : 0.95 * (s.lite ? 0.6 : 1)) * s.halo * (1 + 1.0 * Math.max(0, kick)) * (1 - clamp(sc)); });
  C.aura.visible = !s.gray && sc < 1.5; C.rays.visible = !s.gray && !s.lite && sc < 1.5;   // 排成一排时不要放射光线（会越过格子）
  C.aura.material.uniforms.uInt.value = (s.lite ? 0.015 : 0.045) * (1 + 1.4 * Math.max(0, kick)) * (1 - clamp(sc / 1.5));
  C.aura.scale.setScalar((s.lite ? 0.27 : 0.62) * (1 + 0.08 * Math.max(0, kick)));   // 光晕半径不超过主体高度的 1.2 倍
  C.rays.material.uniforms.uInt.value = (s.lite ? 0.03 : 0.06) * (1 + 1.5 * Math.max(0, kick)) * (1 - clamp(sc / 1.5));
  C.rays.material.uniforms.uRot.value = qw(0.6) * (a ? a.t : 0); C.rays.material.uniforms.uBurst.value = 1 + 0.45 * Math.max(0, kick);   // 放射光线随鼓点伸长
  C.g.scale.setScalar(s.shrink != null ? s.shrink : 1);
  if (s.lite) C.body.material.uniforms.uDim.value *= 0.5; else if (!s.gray) C.body.material.uniforms.uDim.value *= 1.9;
  C.bodyLite.scale.set(0.47, 1, 0.8); C.halo.position.z = s.lite ? -0.25 : -0.7;   // 光环贴近头部，不因透视偏到旁边的格子   // 排成一排时肩膀收窄，不越过格子   // 排成一排时肩膀和身体淡一半，视线集中在脸上
  C.propMats.forEach(m => { m.uniforms.uL.value = s.lite ? 1 : 0; });
  C.propMats.forEach(m => { if (m.baseBright == null) m.baseBright = m.uniforms.uBright.value; m.uniforms.uBright.value = m.baseBright * (s.lite ? (LITE_DIM[C.sin.id] ?? 0.85) : 1); });   // 排成一排时道具压暗
  C.props.visible = s.props > 0.01; C.propMats.forEach(m => { m.uniforms.uAsm.value = s.props; m.uniforms.uScatter.value = sc; m.uniforms.uScatterDist.value = 1.4; m.uniforms.uGray.value = s.gray ? 1 : 0; });   // 灰色阶段戴着灰色版本的道具
  for (const o of C.bodyProps) o.visible = s.props > 0.01;
}

// 角色动起来：头微微转动、呼吸；道具跟着节奏；反转那一拍的笑点
function animate(C, t, dt2, dt3, on, a) {
  const id = C.sin.id, bb = beatInBar(t), beatK = Math.exp(-bb.d / 0.12) * (a.endK ?? 1);
  C.head.rotation.set(0, (on ? 0.2 : 0.07) * Math.sin(t * qw(on ? 3.2 : 1.6) + C.i), (on ? 0.08 : 0.025) * Math.sin(t * qw(on ? 2.5 : 1.3) + C.i));   // 头一直在晃（懒洋洋地左右摇）   // 头一直在轻轻转动（灰色的脸也是）
  C.head.scale.setScalar(1 + 0.01 * Math.sin(t * qw(TAU / 3.2)));
  C.rig.position.y = on ? 0.06 * Math.sin(t * qw(3.4) + C.i) : 0; C.rig.rotation.z = on ? 0.05 * Math.sin(t * qw(2.3) + C.i) : 0;   // 身体轻轻摇晃
  const gag = dt3 >= 0 ? Math.exp(-Math.pow((dt3 - 0.3) / 0.28, 2)) : 0, hold = dt3 >= 0 ? clamp(dt3 / 0.15) : 0;
  const u = (m, k, v) => { m.uniforms[k].value = v; };
  if (id === 'pride') {
    C.head.rotation.x = on ? -0.13 : 0;
    if (C.crown) { u(C.crown.material, 'uB', gag); u(C.crown.material, 'uC', on ? beatK : 0); C.crown.scale.setScalar(1 + 0.15 * gag); }
    C.eyes.forEach(m => { m.material.uniforms.uInt.value *= 1 + 1.0 * gag; });
  } else if (id === 'envy') {
    C.eyes.forEach((m, e) => { m.position.x = [FACE.eyeR, FACE.eyeL][e][0] + 0.05; m.material.uniforms.uInt.value *= 1 + 1.6 * hold * (1 - 0.5 * clamp(dt3 - 0.8)); });
    C.eyeHalo.forEach((m, e) => { m.position.x = [FACE.eyeR, FACE.eyeL][e][0] + 0.05; m.material.uniforms.uInt.value *= 1 + 1.2 * hold; });
    if (C.snake) {
      // 蛇头平时侧着；反转那一拍突然转向镜头、张嘴吐信；平时信子每两拍吐一次
      const turn = dt3 >= 0 ? outBack(clamp(dt3 / 0.22)) : 0;
      u(C.snake.material, 'uA', -0.75 * (1 - turn));
      u(C.snake.material, 'uB', dt3 >= 0 ? clamp(dt3 / 0.12) * (1 - clamp((dt3 - 1.0) / 0.3)) : 0.25 * beatK);
      const flick = (bb.k === 0 || bb.k === 2) ? Math.sin(Math.PI * clamp(bb.d / 0.3)) : 0;
      u(C.snake.material, 'uC', Math.max(flick, dt3 >= 0 ? clamp(dt3 / 0.12) * (1 - clamp((dt3 - 1.0) / 0.3)) : 0));
      u(C.snake.material, 'uD', a.low);
    }
  } else if (id === 'wrath') {
    C.head.rotation.x = on ? 0.06 : 0;
    if (C.horns) u(C.horns.material, 'uB', gag);
  } else if (id === 'sloth') {
    C.head.rotation.x = on ? 0.12 + 0.06 * Math.pow(0.5 + 0.5 * Math.sin(t * qw(2.2)), 4) : 0;
    C.eyes.forEach(m => { m.scale.set(1, 0.4, 1); m.position.y = FACE.eyeR[1] - 0.012; });   // 眼皮半垂：眼睛的光只剩下半
    for (const o of [C.hat, C.zz]) if (o) u(o.material, 'uB', hold);
  } else if (id === 'greed') {
    if (C.coins) { u(C.coins.material, 'uB', 1); if (!on) u(C.coins.material, 'uC', 0); else if (C.coins.material.uniforms.uC.value < 1) u(C.coins.material, 'uC', 8); }
  } else if (id === 'gluttony') {
    if (C.food) u(C.food.material, 'uB', dt3 >= 0 ? clamp(dt3 / 1.0) : 0);
  } else if (id === 'lust') {
    if (C.hearts) { u(C.hearts.material, 'uA', 1.4 * Math.max(0, a.kick)); u(C.hearts.material, 'uB', 0); }   // 心形小粒子圈：每两拍跳一下
  }
}

const popScale = d => d < 0 ? 0.85 : d < 0.12 ? lerp(0.85, 1.05, outExpo(d / 0.12)) : d < 0.2 ? lerp(1.05, 1, sine((d - 0.12) / 0.08)) : 1;
function drawSub(t, ctx, s) {
  if (t < s.t0 || t > s.t1 + 0.12) return;
  const a = Math.min(clamp((t - s.t0) / 0.08), 1 - clamp((t - s.t1) / 0.12));
  ctx.save(); const g = ctx.createLinearGradient(0, 780, 0, 1080); g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, `rgba(0,0,0,${0.65 * a})`); ctx.fillStyle = g; ctx.fillRect(0, 780, 1920, 300); ctx.restore();
  const y = s.sub ? (s.size > 60 ? 900 : 930) : 975, sc = s.pop != null ? popScale(t - s.pop) : 1;
  const keyFlash = s.flash != null && t >= s.flash ? Math.exp(-(t - s.flash) / 0.15) : 0;
  ctx.save(); ctx.translate(960, y); ctx.scale(sc, sc);
  marked(ctx, s.text, 0, 0, s.size, a, s.col, 1 + 0.12 * keyFlash, keyFlash);
  ctx.restore();
  if (s.sub) glowText(s.sub, 960, y + 30 + s.size * 0.62, fs(700, s.subSize ?? 34), 'rgba(255,255,255,0.85)', { alpha: a, glow: 8 });
}
// 吸气：把整张结尾卡（罪名大字、字幕、四字词）画到离屏画布，再切成小方块，旋转着向画面中心收缩、淡出
let OC = null;
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
      const col = k === 'hi' ? '#F2E4DE' : k ? keyCol : '#EFE6E2', sc = k === true ? pop : 1;
      ctx.save(); ctx.translate(x + ws[j] / 2, y); ctx.scale(sc, sc);
      glowText(s, 0, 0, fs(700, size), col, { alpha: a, glow: k === 'hi' ? 30 : k ? 20 + 30 * flash : 10, glow2: k === 'hi' ? 50 : k ? 60 * flash : 0, glowColor: k === 'hi' ? '#FFFFFF' : k ? keyCol : '#000000', nobox: true });
      ctx.restore();
    }
    x += ws[j];
  });
  BOXES.push({ x0: cx - ws.reduce((p, q) => p + q, 0) / 2, x1: cx + ws.reduce((p, q) => p + q, 0) / 2, y0: y - size * 0.6, y1: y + size * 0.6, label: text, alpha: a });
}


// ============================================================ 《七宗罪》第七集（最终集）：色欲（短版，约 19 秒，横屏）
// 第 0–1 小节 转盘（假停暴食半拍 → 右移一格落在色欲）→ 第 2 小节 灰色闭眼特写 + 标题 → STOP1 定格 → 变身、每拍一个剪影“心动 +1…+6”
// → STOP2 定格在第七个剪影 → 反转“心动 +7” → 第 6–7 小节 大脑奖励回路 → 第 8–10 小节 结尾卡 → 第 11–13 小节 七宗罪完结阵容（最后 0.3 秒回到第 0 帧）
const CY = '#FF3D8B', HI = '#FFB3D1', DK = '#4A0A26', WH = '#FFF0F6', SL = 6;   // 色欲：主色玫红、高光、深色、最亮处
const RED = CY;
const TXTW = '#F0E6EA';   // 文字的“白色”：亮度约 233，不超过 240
const LITE_DIM = { pride: 0.85, envy: 0.85, wrath: 0.9, sloth: 0.8, greed: 0.32, gluttony: 0.3, lust: 0.6 };   // 排成一排时道具压暗
let DN, BEAT, EV, TXT, STOPS = [];
const nb = x => B.reduce((a, b) => Math.abs(b - x) < Math.abs(a - x) ? b : a, B[0]);
const nextBeat = x => B.find(b => b > x + 1e-4) ?? x + BEAT;
const beatAtOrAfter = x => B.find(b => b >= x - 1e-4) ?? x;
const plain = s => s.replace(/[〔〕]/g, '');
const charCount = s => plain(s).replace(/[，。：、；？！—…“”‘’\s]/g, '').length;
const readT = s => 1.0 + 0.17 * charCount(s);
// 急停：画面里的一切（粒子、镜头、光环、律动）定格在急停开始的那一刻；音乐回来的那一拍再继续
export const vt = t => { for (const s of STOPS) if (t >= s.start && t < s.end) return s.start; return t; };
const inStop = t => STOPS.find(s => t >= s.start && t < s.end);

const TEXT_LIST = [
  { id: 'A', kind: 'hook', text: '刷到这条，你的〔出厂设置〕是——', suffix: '色欲', want: 0.1, exact: true, size: 72, endAt: 's1' },
  { id: 'S1', kind: 'sub', text: '色欲说：我真的〔不是颜控〕。', ev: 'zoom1', size: 56, endAt: 5 },
  { id: 'S2', kind: 'hook', text: '——只是喜欢的人，〔刚好都好看〕。', ev: 'rev', size: 72, endAt: 8 },
  { id: 'K', kind: 'sub', text: '出厂设置：心动和上瘾，用的是〔同一套〕奖励回路。', ev: 'know', size: 56, endAt: 11 },   // 进入结尾卡后，这句知识以结尾卡第一行的样子继续留在下方
  { id: 'N', kind: 'hook', text: '七种出厂设置，〔你中了几个〕？', ev: 'ask2', size: 60, endAt: 'fin' },
];
function scheduleText() {
  return TEXT_LIST.map(o => {
    const t0 = o.exact ? o.want : EV[o.ev];
    const t1 = typeof o.endAt === 'number' ? DN[o.endAt] - 0.06 : o.endAt === 's1' ? EV.s1 - 0.06 : TL - 0.45;
    return { ...o, t0, t1, minD: readT(o.text + (o.suffix ?? '')), size: o.size ?? 56 };
  });
}
const TX = id => TXT.find(s => s.id === id);

export function build(scene, beats, heads, audioEnv) {
  S = scene; BT = beats; B = beats.beats; TL = beats.duration; DN = beats.downbeats; BEAT = beats.beat;
  STOPS = [beats.stop1, beats.stop2];
  setAudio(audioEnv, beats);
  const bi = x => B.findIndex(b => Math.abs(b - x) < 2e-3);
  EV = { zoom: DN[2], s1: beats.stop1.start, change: beats.stop1.end, s2: beats.stop2.start, rev: beats.stop2.end, know: DN[6], card: DN[8], ask: DN[9], end: DN[11] };
  EV.zoom1 = B[bi(EV.zoom) + 1];
  { const q = BEAT / 4, g = n => B[0] + n * q;   // 转盘：先快后慢，假停在暴食半拍，再往右挪一格落在色欲（0.15 秒滑过去），停留两拍
    EV.spots = [[2, 0], [3, 1], [4, 2], [5, 3], [6, 4], [7, 5], [8, 6], [9, 5], [10, 4], [11, 3], [12, 2], [14, 3], [17, 4], [22, 5], [24, 6]].map(([n, i]) => ({ t: g(n), i }));
    EV.pick = EV.spots[EV.spots.length - 1].t; EV.fake = EV.spots[EV.spots.length - 2].t; }
  { const i = bi(EV.change); EV.sils = [0, 1, 2, 3, 4, 5].map(k => B[i + k]); }          // 变身那一拍起，每拍一个剪影：心动 +1 … +6
  EV.sil7 = EV.s2 - 0.12;                                                                  // 第七个剪影刚出现，急停
  { const i = bi(EV.know); EV.segs = [1, 2, 3, 4, 5, 6].map(k => B[i + k]); }              // 奖励回路：四节 + “心动”“上瘾”两个分支，一拍一节
  { const i = bi(EV.card); EV.words = [0, 1, 2, 3].map(k => B[i + k]); EV.wink = B[i + 6]; }
  { const i = bi(EV.end); EV.flash7 = B[i + 1]; EV.ask2 = B[i + 2]; }
  TXT = scheduleText();
  S.chars = SINS.map((sin, i) => makeChar(sin, i, heads)); S.extra = [];
  S.spot = makeSpot();
  S.stars = [makeStars(14000, -22, 1.1, 11), makeStars(11000, -9, 2.0, 12)];
  S.brain = makeBrain(); S.sils = makeSils(7);
  window.__S = S;
}

// ------------------------------------------------------------ 薄纱：脸前一层稀疏的玫红粒子，像丝一样缓缓往下飘、左右摆；眼睛、鼻子、嘴的位置几乎是空的
function makeVeil(parent) {
  const n = 9000, g = new THREE.BufferGeometry(), P = new Float32Array(n * 3), Sd = new Float32Array(n);
  for (let i = 0; i < n; i++) { P[i * 3] = (hash(i * 1.37 + 0.2) - 0.5) * 1.75; P[i * 3 + 1] = hash(i * 2.71 + 0.9); P[i * 3 + 2] = 0.66 + 0.12 * (hash(i * 3.3) - 0.5); Sd[i] = hash(i * 4.4 + 0.5); }
  g.setAttribute('position', new THREE.BufferAttribute(P, 3)); g.setAttribute('aSeed', new THREE.BufferAttribute(Sd, 1));
  const m = new THREE.ShaderMaterial({ uniforms: { uTime: { value: 0 }, uA: { value: 0 }, uScale: { value: 1 }, uCol: { value: C3('#FF6FA8') }, uHot: { value: C3('#FFD3E4') } },
    transparent: true, depthWrite: false, depthTest: false, blending: THREE.AdditiveBlending,
    vertexShader: `attribute float aSeed; uniform float uTime, uA, uScale; varying float vB; varying float vH;
      void main(){ float w = 6.28318530718/${TL.toFixed(4)};
        float f = fract(position.y + uTime*w*2.0*(0.6 + 0.4*aSeed));                 /* 从上往下飘（周期 = 成片时长的整数分之一） */
        vec3 p = vec3(position.x, 0.62 - 1.55*f, position.z);
        p.x += 0.06*sin(p.y*3.4 + uTime*w*9.0 + aSeed*6.28) + 0.02*sin(uTime*w*23.0 + aSeed*40.0);   /* 像丝一样左右摆 */
        p.z += 0.03*sin(p.x*5.0 + uTime*w*11.0);
        vec2 q = p.xy;
        float dE = min(length((q - vec2(-0.2, 0.17))/vec2(0.15, 0.09)), length((q - vec2(0.2, 0.17))/vec2(0.15, 0.09)));
        float dM = length((q - vec2(0.0, -0.27))/vec2(0.2, 0.1)), dN = length((q - vec2(0.0, 0.0))/vec2(0.09, 0.2));
        float clear = smoothstep(0.9, 1.5, min(dE, min(dM, dN)));                     /* 五官处留空 */
        float face = length((q - vec2(0.0, -0.05))/vec2(0.5, 0.6));
        float side = mix(0.35, 1.0, smoothstep(0.7, 1.15, face));                     /* 脸中间更稀，两侧更密 */
        float fade = smoothstep(0.0, 0.12, f)*(1.0 - smoothstep(0.82, 1.0, f))*(1.0 - smoothstep(0.7, 0.9, abs(p.x)));
        float tw = 0.55 + 0.45*sin(uTime*w*31.0 + aSeed*80.0);
        vB = uA*clear*side*fade*(0.3 + 0.7*aSeed)*tw; vH = step(0.93, aSeed);
        vec4 mv = modelViewMatrix*vec4(p, 1.0); gl_Position = projectionMatrix*mv; gl_PointSize = (1.4 + 2.6*aSeed*aSeed)*uScale*(3.7/max(1.0, -mv.z)); }`,
    fragmentShader: `uniform vec3 uCol, uHot; varying float vB; varying float vH; void main(){ vec2 c = gl_PointCoord - 0.5; float d = length(c); if (d > 0.5) discard; gl_FragColor = vec4(mix(uCol, uHot, vH)*vB*1.3*exp(-d*d*9.0), 1.0); }` });
  const p = new THREE.Points(g, m); p.frustumCulled = false; p.renderOrder = 49; p.visible = false; parent.add(p); K.mats.push(m); return p;
}
// ------------------------------------------------------------ 剪影：优雅、闪着细光、不分男女的头肩轮廓（只有头和肩膀，没有五官）
function silPB() {
  const pb = new PB(), R = n => hash(n * 1.913 + 0.37); let n = 0;
  const add = (p, br) => { pb.add([p[0], p[1], (p[2] ?? 0) + (R(n++) - 0.5) * 0.02], [0, 0, 1], R(n++), [0, 0, 0], [R(n++), 0, 0, 1], [br, 30]); };
  const bz = (a, b, c, d, u) => { const v = 1 - u; return [0, 1].map(k => v * v * v * a[k] + 3 * v * v * u * b[k] + 3 * v * u * u * c[k] + u * u * u * d[k]); };
  const head = (a, r) => [Math.cos(a) * 0.16 * r * (1 - 0.14 * Math.max(0, -Math.sin(a))), 0.37 + Math.sin(a) * 0.205 * r];   // 略呈蛋形的头
  for (let i = 0; i < 2200; i++) { const a = R(n++) * TAU; add(head(a, 1 + (R(n++) - 0.5) * 0.03), 1.25); }
  for (let i = 0; i < 1800; i++) add(head(R(n++) * TAU, Math.sqrt(R(n++)) * 0.96), 0.42);
  // 修长的脖子 + 圆润的肩膀（三次贝塞尔），手臂外缘往下渐隐
  const neck = [[0.062, 0.2], [0.064, 0.12], [0.07, 0.08], [0.085, 0.05]];
  const sh1 = [[0.085, 0.05], [0.16, 0.0], [0.36, 0.0], [0.46, -0.1]], sh2 = [[0.46, -0.1], [0.51, -0.16], [0.52, -0.3], [0.5, -0.48]];
  for (const sd of [-1, 1]) for (const [cv, cnt, br] of [[neck, 500, 1.1], [sh1, 1300, 1.25], [sh2, 700, 1.0]]) for (let i = 0; i < cnt; i++) { const u = R(n++), p = bz(...cv, u); add([sd * p[0], p[1]], cv === sh2 ? br * (1 - 0.8 * u) : br); }
  const top = x => { const ax = Math.abs(x); if (ax < 0.085) return 0.2 - (0.2 - 0.05) * (ax / 0.085) ** 4; let best = sh1[0][1]; for (let u = 0; u <= 1; u += 0.02) { const p = bz(...sh1, u); if (p[0] <= ax) best = p[1]; } return ax > 0.46 ? -0.1 : best; };
  for (let i = 0; i < 2600; i++) { const x = (R(n++) - 0.5) * 0.96, t0 = top(x), y = t0 - Math.pow(R(n++), 1.4) * 0.5; add([x, y], 0.4 * (1 - (t0 - y) / 0.5)); }   // 身体里淡淡的一层，往下渐隐
  for (let i = 0; i < 110; i++) { const a = R(n++) * TAU, r = 0.12 + 0.5 * R(n++); add([Math.cos(a) * r * 0.9, 0.2 + Math.sin(a) * r * 0.75, 0.03], 2.4); }   // 周围几颗亮闪闪的小星
  return pb;
}
function makeSils(n) {
  const geo = silPB().geometry(THREE);
  return Array.from({ length: n }, (_, k) => {
    const m = propMat('#FFC2DA', { bright: 1.0, size: 0.0095, colHook: `{ b *= 0.55 + 1.6*pow(0.5 + 0.5*sin(uTime*qw(13.0) + aSeed*70.0 + ${(k * 1.7).toFixed(2)}), 8.0); col = mix(col, vec3(1.0, 0.86, 0.93), 0.35); }` });
    m.uniforms.uAsm.value = 1; m.uniforms.uFacing.value = 0;
    const g = new THREE.Group(); K.scene.add(g); const p = new THREE.Points(geo, m); p.frustumCulled = false; p.renderOrder = 12; g.add(p); K.mats.push(m); g.visible = false;
    return { g, m };
  });
}
// ------------------------------------------------------------ 粒子大脑（侧面，沿用前几集的大脑模型），玫红
const REWARD = [[0.05, -0.42, -0.15], [-0.18, -0.32, -0.17], [-0.42, -0.18, -0.2], [-0.66, -0.02, -0.22], [-0.9, 0.16, -0.22]];
function makeBrain() {
  const g = new THREE.Group(); g.position.set(1.4, 0.15, 0); g.scale.setScalar(1.15); g.rotation.y = Math.PI; K.scene.add(g); g.visible = false;
  const m = brainMaterial(CY); m.uniforms.uSeeX.value = 99; m.uniforms.uBright.value = 6.0; m.uniforms.uRegR.value = 0.02; m.uniforms.uSize.value = 0.019; m.uniforms.uMaxPx.value = 10; m.uniforms.uHot.value.set('#FFD6E6');
  pts(buildBrainSide(511, 1).geometry(THREE), m, g, 20);
  const glowM = new THREE.Mesh(new THREE.PlaneGeometry(5.5, 5.5), H.glowPlane(0.0)); glowM.material.uniforms.uCol.value.set(CY); glowM.material.blending = THREE.AdditiveBlending; glowM.material.transparent = true; glowM.material.depthWrite = false; glowM.position.set(1.4, 0.15, -1.6); glowM.renderOrder = -15; glowM.visible = false; K.scene.add(glowM);
  return { g, m, glow: glowM };
}
const brainAsm = k => { const u = S.brain.m.uniforms; u.uScatter.value = 2.2 * (1 - k); u.uScatterDist.value = 1.4; u.uAlpha.value = clamp(k * 1.5); S.brain.g.visible = k > 0.001; };

// ------------------------------------------------------------ 律动：每两拍主体放大 5%、光环闪一下，0.3 秒回弹
let PULSE_B = null;
function pulse(t) {
  if (!PULSE_B) PULSE_B = B.filter((_, i) => i % 2 === 0);
  let v = 0; const j = lastIdx(PULSE_B, t);
  for (let k = Math.max(0, j - 1); k <= j; k++) { if (k < 0) continue; const d = t - PULSE_B[k]; if (d < 0 || d > 0.4) continue; v += Math.exp(-d * 13) * Math.cos(d * 26); }
  return 0.833 * v;
}
const LINEUP = { pos: [0, 0.25, 9.6], target: [0, -0.05, 0], fov: 35 };
const lineupCam = t => orbit({ ...LINEUP, pos: [0, LINEUP.pos[1] + 0.06 * Math.sin(t * qw(1.7)), LINEUP.pos[2] - 0.18 * Math.sin(t * qw(1.1))] }, 0.03 * Math.sin(t * qw(1.9)), 0);
const camAt = (x, y, d, ty = y) => ({ pos: [x, y + 0.08, d], target: [x, ty, 0], fov: 35 });
const HW = d => Math.tan(17.5 * Math.PI / 180) * d * 16 / 9;
const live = (c, t, t0, cx) => { const k = 1 - 0.015 * Math.max(0, t - t0); const p = lerp3(c.target, c.pos, k); return orbit({ ...c, pos: p }, 0.07 * Math.sin(t * qw(4.4)), cx); };
function heroLineup(t, F, AUD0, pop) {
  const AUD = { ...AUD0, mid: 0, low: 0 };
  S.chars.forEach(O => { O.g.visible = true; setState(O, { lite: true, gray: false, eyes: 1, halo: 0.85, props: 1, scatter: 0, aud: AUD, pop: pop ? pop(O.i) : 0 }); animate(O, t, 9, -9, true, AUD); });
  F.names = 1; F.series = 1; F.aired = 1; F.auraCol = '#C8A0B4'; F.auraK = 0.45;
  return lineupCam(t);
}
// 眨一只眼（画面右侧那只）：k = 0 睁开，1 闭上
function wink(C, k) { if (k <= 0) return; const s = 1 - 0.9 * k; if (C.eyeShapes) C.eyeShapes[1].scale.y *= s; C.eyes[1].scale.y *= s; C.eyeHalo[1].scale.y *= Math.max(0.3, s); }
const winkK = (t, t0) => { const u = t - t0; return u < 0 || u > 0.36 ? 0 : u < 0.08 ? u / 0.08 : u < 0.2 ? 1 : 1 - (u - 0.2) / 0.16; };

export const subsList = () => TXT.map(s => ({ text: plain(s.text) + (s.suffix ?? ''), t0: +s.t0.toFixed(3), t1: +s.t1.toFixed(3), minD: +s.minD.toFixed(3) }));
export function events() {
  const big = [['推进特写（灰色闭眼）', EV.zoom], ['STOP1 结束拍：变身', EV.change], ['STOP2 结束拍：反转“心动 +7”', EV.rev], ['拉远、大脑奖励回路', EV.know], ['结尾卡', EV.card], ['结尾卡第二行', EV.ask], ['七宗罪完结阵容', EV.end]];
  const small = [['转盘假停在暴食', EV.fake], ['右移一格落在色欲（抽中）', EV.pick], ['字幕“我真的不是颜控”', EV.zoom1], ...EV.sils.slice(1).map((b, i) => [`剪影 / 心动 +${i + 2}`, b]), ...EV.segs.map((b, i) => [i < 4 ? `回路第 ${i + 1} 节` : i === 4 ? '分支：心动' : '分支：上瘾', b]),
    ...EV.words.map((b, i) => [`四字词 ${i + 1}`, b]), ['眨眼', EV.wink], ['七色闪光 + 七宗罪 · 完结', EV.flash7], ['你中了几个', EV.ask2]];
  return [...big.map(([name, t]) => ({ name, t, kind: 'big' })), ...small.map(([name, t]) => ({ name, t, kind: name === '转盘假停在暴食' ? 'half' : 'small' }))];   // 假停：抽中前半拍（半拍网格）
}
export const charsList = () => S ? [...(S.chars ?? []), ...(S.extra ?? [])] : [];

// 剪影 k 的状态：出现时间、心动那一拍
const silT = k => k < 6 ? EV.sils[k] - 0.3 : EV.sil7;
const silBeat = k => k < 6 ? EV.sils[k] : EV.rev;

// ------------------------------------------------------------ 每帧（tr = 真实时间；t = 画面时间，急停时定格）
export function frame(tr) {
  const stop = inStop(tr), t = vt(tr);
  const F = { shake: 0, shock: null, bloom: 1.0, auraCol: CY, auraK: 0.5, subs: [], hooks: [], names: 0, series: 0, aired: 0, bursts: [], ca: 0, labels: [], corner: 0, sparkCol: HI, dark: 0 };
  const endK = 1 - clamp((t - (TL - 0.9)) / 0.6);
  const kick = pulse(t) * endK, low = env(t, 'low'), mid = env(t, 'mid'), high = env(t, 'high');
  const bb = beatInBar(t);
  const off = bb.k === 0 ? Math.exp(-bb.d / 0.1) * endK : 0;                // 每小节第一拍：镜头推一下 + 4px 震动
  F.shake = off * 0.67;
  const AUD = { kick, low, mid, high, t, endK };
  S.chars.forEach(O => { O.g.position.set(slotX(O.i), 0, 0); O.g.rotation.set(0, 0, 0); O.g.visible = false; O.g.scale.setScalar(1); animate(O, t, -9, -9, false, AUD); });
  S.brain.g.visible = false; S.brain.glow.visible = false; S.sils.forEach(s => { s.g.visible = false; });
  const W = S.chars[SL];
  let cam, subj = null;
  F.corner = clamp((tr - EV.s1 - 0.18) / 0.1) * (1 - clamp((t - EV.end) / 0.25));
  F.title = tr >= EV.zoom - 0.05 && tr < EV.s1 + 0.25 ? { a: clamp((tr - EV.zoom) / 0.12), fly: outExpo(clamp((tr - EV.s1) / 0.2)), pop: tr - EV.zoom } : null;   // STOP1 开始：标题飞到左上角
  const close = camAt(-0.33 * HW(3.7), 0.2, 3.7);

  if (t < EV.zoom) {
    // ---- 第 0–1 小节：七个彩色角色排成一排（六个“已播出”）；转盘一张脸一张脸地跳，先快后慢，假停在暴食半拍，再右移一格落在色欲
    cam = heroLineup(t, F, AUD);
    const j = lastIdx(EV.spots.map(o => o.t), t);
    if (j >= 0) {
      const cur = EV.spots[j], dt = t - cur.t, on = outExpo(clamp(dt / 0.05));
      S.chars.forEach(O => {
        const me = O.i === cur.i;
        O.mats.forEach(m => { m.uniforms.uDim.value *= lerp(1, me ? 1.7 : 0.5, me ? on : 1); });
        O.propMats.forEach(m => { m.uniforms.uBright.value *= me ? 1 + 0.5 * on : 0.5; });
        O.eyes.forEach(m => { m.material.uniforms.uInt.value *= me ? 1 + 0.6 * on : 0.5; });
        O.haloMats.forEach(m => { m.uniforms.uBright.value *= me ? 1 + 1.2 * on : 0.5; });
        if (me) { O.rig.scale.multiplyScalar(1 + 0.12 * on); O.g.position.y += 0.1 * on + 0.12 * Math.sin(Math.PI * clamp(dt / 0.22)) * (dt < 0.22 ? 1 : 0); }
      });
      if (cur.t === EV.pick) wink(W, winkK(t, EV.pick + 0.12));                 // 抽中：色欲亮起、放大回弹，眨一只眼
      const prev = EV.spots[Math.max(0, j - 1)], glide = cur.t === EV.pick ? outExpo(clamp(dt / 0.15)) : 1;
      F.spot = { x: lerp(slotX(prev.i), slotX(cur.i), glide), a: cur.t === EV.pick ? 1 : on };
      F.tick = { c: project([slotX(cur.i), -1.5, 0.2]), k: clamp(dt / 0.28), w: project([slotX(cur.i) + 0.5, -1.5, 0.2])[0] - project([slotX(cur.i), -1.5, 0.2])[0] };
    }
  } else if (t < EV.change) {
    // ---- 第 2 小节：镜头猛地推到色欲的脸（灰色、闭眼），左侧大标题；粒子慢慢向内收；STOP1：一切定格、画面暗 20%，标题飞到左上角
    const dt = t - EV.zoom, k = outExpo(clamp(dt / 0.25)), inh = sine(clamp((t - EV.zoom1) / (EV.s1 - EV.zoom1)));
    S.chars.forEach(O => { if (O === W) return; O.g.visible = k < 0.999; setState(O, { lite: true, gray: false, eyes: 1, halo: 0.85 * (1 - k), props: 1, scatter: 0, aud: AUD }); animate(O, t, 9, -9, true, AUD); O.g.position.x = slotX(O.i) + Math.sign(O.i - SL) * 9 * k; });
    W.g.visible = true; W.g.position.x = lerp(slotX(SL), 0, k);
    setState(W, { lite: dt < 0.04, gray: dt >= 0.04, eyes: 0, halo: 0, props: 0, scatter: 0, aud: AUD, inhale: inh });
    animate(W, t, 9, -9, true, AUD); W.rig.scale.multiplyScalar(1 - 0.04 * inh);
    cam = camLerp(lineupCam(t), live({ ...close, pos: lerp3(close.target, close.pos, 1 - 0.08 * inh) }, t, EV.zoom, 0), k);
    F.names = 1 - clamp(dt / 0.015); F.aired = F.names; F.series = 1 - clamp(dt / 0.08);
    if (dt < 0.4) F.shock = { c: project([W.g.position.x, HEAD_C[1], 0.3]), r: 0.5 * outExpo(dt / 0.4), a: 0.4 * (1 - dt / 0.4), col: HI };
    F.dark = 0.12 * inh;
    subj = [W.g.position.x, HEAD_C[1], 0];
  } else if (t < EV.know) {
    // ---- STOP1 结束拍：变身（玫红闪光 + 冲击波，薄纱、心形粒子圈、光环一起汇聚）；之后每拍一个剪影从右往左飘过，眼睛闪成心形，“心动 +1…+6”，笑容越来越大
    // ---- STOP2：定格在第七个剪影刚出现、眼睛正要变成心形；STOP2 结束拍：反转（巨大心形眼、心形粒子爆开、“心动 +7”）
    const dt = t - EV.change, rv = t - EV.rev;
    W.g.visible = true; W.g.position.set(0, 0, 0);
    const n = EV.sils.filter(b => t >= b - 1e-4).length + (rv >= 0 ? 1 : 0);
    let heart = 0, hs = 1;
    for (const b of EV.sils) { const u = t - b; if (u >= -0.04 && u < 0.5) heart = Math.max(heart, u < 0 ? (u + 0.04) / 0.04 : u < 0.22 ? 1 : 1 - (u - 0.22) / 0.28); if (u >= 0 && u < 0.3) hs = Math.max(hs, 1 + 0.35 * Math.exp(-u / 0.1)); }
    if (rv < 0) heart = Math.max(heart, 0.5 * clamp((t - EV.sil7) / 0.12));               // 第七个：眼睛正要变成心形
    else { heart = 1; hs = rv < 0.12 ? lerp(1.0, 2.7, outExpo(rv / 0.12)) : rv < 0.35 ? lerp(2.7, 2.2, sine((rv - 0.12) / 0.23)) : 2.2; }
    const smile = rv >= 0 ? 2 : n >= 5 ? 2 : n >= 2 ? 1 : 0;
    setState(W, { lite: false, gray: false, eyes: outExpo(clamp(dt / 0.15)), halo: outExpo(clamp(dt / 0.35)), props: clamp(dt / 0.4), scatter: 0, aud: AUD,
      pop: 0.5 * Math.exp(-dt / 0.25) + (rv >= 0 ? 0.15 * Math.exp(-rv / 0.25) : 0), heart, heartScale: hs, calm: smile === 1 ? 1 : 0, gag: smile === 2 });
    animate(W, t, 9, -9, true, AUD);
    W.head.rotation.y += rv < 0 ? -0.12 * clamp(dt / 0.5) : -0.12 * (1 - clamp(rv / 0.4));   // 视线跟着左边飘过的剪影
    let c = live(close, t, EV.change, 0);
    if (rv >= 0 && rv < 0.6) { const pz = Math.sin(Math.PI * clamp(rv / 0.6)); c = { ...c, pos: lerp3(c.target, c.pos, 1 - 0.1 * pz) }; }   // 反转：镜头快速推近再弹回
    cam = c;
    if (dt < 0.5) F.shock = { c: project([0, HEAD_C[1], 0.3]), r: 0.08 + 0.5 * outExpo(dt / 0.5), a: 0.6 * (1 - dt / 0.5), col: HI };
    if (dt < 0.25) F.flash = { c: project([0, HEAD_C[1], 0.3]), a: 0.28 * Math.exp(-dt / 0.12), r: 520 };
    if (dt < 0.15) F.shake = Math.max(F.shake, 1 - dt / 0.15);
    F.bursts.push({ t0: EV.change, pos: [0, HEAD_C[1], 0.4], n: 120, speed: 1.6, life: 0.7, grav: -0.2, seed: 5, bright: 1.6 });
    if (rv >= 0) {
      if (rv < 0.6) F.shock = { c: project([0, HEAD_C[1], 0.3]), r: 0.1 + 0.6 * outExpo(rv / 0.6), a: 0.7 * (1 - rv / 0.6), col: HI };
      if (rv < 0.2) F.shake = Math.max(F.shake, 1.2 * (1 - rv / 0.2));
      if (rv < 0.25) F.flash = { c: project([0, HEAD_C[1], 0.3]), a: 0.24 * Math.exp(-rv / 0.12), r: 600 };
      F.bursts.push({ t0: EV.rev, pos: [0, HEAD_C[1], 0.45], n: 170, speed: 2.0, life: 0.9, grav: -0.1, seed: 9, bright: 1.7 });
      if (W.hearts) W.hearts.material.uniforms.uB.value = 0.85 * Math.sin(Math.PI * clamp(rv / 1.0));   // 心形粒子圈爆开再收回
    }
    // 剪影：从脸的左后方出现，往左飘走；心动那一拍亮一下；反转后一起淡出
    S.sils.forEach((s, k) => {
      const t0 = silT(k), u = t - t0; if (u < 0) return;
      const life = k < 6 ? 1.25 : 9, a = clamp(u / 0.25) * (1 - clamp((u - life + 0.3) / 0.3)) * (rv >= 0 ? 1 - clamp((rv - (k === 6 ? 0.5 : 0)) / 0.4) : 1);
      if (a <= 0.003) return;
      const x = k < 6 ? lerp(-0.95, -3.45, Math.pow(clamp(u / life), 0.85)) : lerp(-0.95, -1.5, clamp(u / 0.6)) - 0.25 * clamp(rv / 1.2);
      s.g.visible = true; s.g.position.set(x, -0.25 + 0.1 * Math.sin(k * 1.9), -0.9); s.g.scale.setScalar(0.92 + 0.08 * hash(k * 3.1));
      const hb = t - silBeat(k), fl = hb >= 0 ? Math.exp(-hb / 0.2) : 0;
      s.m.uniforms.uBright.value = 1.5 * a * (1 + 0.8 * fl); s.m.uniforms.uScatter.value = 0;
      if (hb >= 0 && hb < 0.2) F.bursts.push({ t0: silBeat(k), pos: [x, 0.15, -0.85], n: 16, speed: 0.4, life: 0.4, grav: 0, seed: 40 + k, bright: 1.3 });
    });
    F.count = { n, pop: n > 0 ? t - (n === 7 ? EV.rev : EV.sils[n - 1]) : 9, big: n >= 7, fade: 1 - clamp((t - EV.know + 0.25) / 0.2) };
    if (rv >= 0 && rv < 0.5) F.shock2 = { c: [1600, 200], r: 0.04 + 0.2 * outExpo(rv / 0.5), a: 0.75 * (1 - rv / 0.5) };
    subj = [0, HEAD_C[1], 0];
  } else if (t < EV.card) {
    // ---- 第 6–7 小节：拉远。色欲在左边（心形眼），右边粒子大脑；奖励回路一节一节亮起，一头通到“心动”，另一个分支通到“上瘾”；每拍脉冲一次
    const dt = t - EV.know, k = inOut(clamp(dt / 0.45)), D = 7.4, wx = -2.0;
    cam = camLerp(live(close, t, EV.change, 0), live(camAt(0, -0.1, D), t, EV.know, 0), k);
    W.g.visible = true; W.g.position.set(lerp(0, wx, k), 0, 0);
    setState(W, { lite: false, gray: false, eyes: 1, halo: 1, props: 1, scatter: 0, aud: AUD, heart: 1, heartScale: lerp(1.7, 1.25, k), gag: dt < 0.5, calm: dt >= 0.5 ? 1 : 0 }); animate(W, t, 9, -9, true, AUD);
    W.mats.forEach(m => { m.uniforms.uDim.value *= 0.88; });
    const Bn = S.brain; brainAsm(outExpo(clamp((dt - 0.1) / 0.45)));
    const bk = Math.exp(-Math.max(0, bb.d) / 0.15) * (bb.k >= 0 ? 1 : 0);               // 每拍脉冲
    Bn.m.uniforms.uBright.value = 7.0 * (1 + 0.25 * bk);
    Bn.glow.visible = true; Bn.glow.material.uniforms.uInt.value = 0.05 + 0.04 * bk; Bn.glow.quaternion.copy(K.camera.quaternion);
    Bn.g.rotation.y = Math.PI + 0.18 * Math.sin(t * qw(1.5)); Bn.g.rotation.x = 0.06 * Math.sin(t * qw(1.9)); Bn.g.scale.setScalar(1.15 * (1 + 0.04 * Math.max(0, kick))); Bn.g.position.y = 0.15 + 0.04 * Math.sin(t * qw(2.3));
    Bn.g.updateMatrixWorld(true);
    const segK = i => clamp((t - EV.segs[i]) / 0.15);
    const lit = [0, 1, 2, 3].reduce((a, i) => a + segK(i), 0);
    F.path = { pts: REWARD.map(p => { const v = new THREE.Vector3(...p); Bn.g.localToWorld(v); return project(v.toArray()); }), lit, b1: segK(4), b2: segK(5), pulse: bk, a: clamp((dt - 0.2) / 0.3) };
    subj = [wx, HEAD_C[1], 0];
  } else if (t < EV.end) {
    // ---- 第 8–10 小节：结尾卡。左边“色欲”大字 + “出厂设置 · 07 / 07”；右边色欲（约 65% 高），心形眼慢慢变回柔光，眨一下眼，身后更大的光环
    const dt = t - EV.card, k = inOut(clamp(dt / 0.35)), D = 6.8, wx = 1.45;
    cam = camLerp(live(camAt(0, -0.1, 7.4), t, EV.know, 0), live(camAt(0, -0.25, D, -0.3), t, EV.card, 0), k);
    W.g.visible = true; W.g.position.set(lerp(-2.0, wx, k), 0, 0);
    setState(W, { lite: false, gray: false, eyes: 1, halo: 1, props: 1, scatter: 0, aud: AUD, heart: 1 - clamp((dt - 0.2) / 0.6), heartScale: 1.25, calm: 1 }); animate(W, t, 9, -9, true, AUD);
    W.halo.scale.multiplyScalar(1.35);
    wink(W, winkK(t, EV.wink));
    if (dt < 0.35) F.flash = { c: [960, 540], a: 0.25 * Math.sin(Math.PI * dt / 0.35), r: 900 };
    const WP = [[-1.4, 0.75, 'left'], [0.95, 0.75, 'right'], [1.05, -0.3, 'right'], [-1.45, -0.3, 'left']];
    F.words = ['一见钟情', '心猿意马', '见异思迁', '情不自禁'].map((s, i) => { const u = t - EV.words[i]; const p = project([wx + WP[i][0], HEAD_C[1] + WP[i][1], 0.3]); return { s, x: p[0], y: p[1], a: clamp(u / 0.12), pop: u, side: WP[i][2] }; });
    F.card = { a: clamp((dt - 0.15) / 0.3), q: clamp((t - EV.ask) / 0.08), qpop: t - EV.ask };
    subj = [wx, HEAD_C[1], 0];
  } else {
    // ---- 第 11–13 小节：七宗罪完结阵容（七个都上色、睁眼、光环亮着）；下一拍七色交织闪光 + “七宗罪 · 完结”；再下一拍“你中了几个”；最后 0.3 秒回到第 0 帧
    const dt = t - EV.end, k = inOut(clamp(dt / 0.45)), fin = t >= TL - 0.3;
    cam = camLerp(live(camAt(0, -0.25, 6.8, -0.3), t, EV.card, 0), lineupCam(t), k);
    if (fin) cam = heroLineup(t, F, AUD);
    else {
      const A0 = { ...AUD, mid: 0, low: 0 }, fu = t - EV.flash7, fl = fu >= 0 ? Math.exp(-fu / 0.35) : 0;
      S.chars.forEach(O => { O.g.visible = true;
        setState(O, { lite: k > 0.5 || O !== W, gray: false, eyes: 1, halo: 1, props: 1, scatter: 0, aud: A0, pop: 0.6 * fl, heart: 0 }); animate(O, t, 9, -9, true, A0);
        O.haloMats.forEach(m => { m.uniforms.uBright.value *= 1 + 1.5 * fl; });
        if (fu >= 0 && fu < 0.3) O.g.position.y += 0.1 * Math.sin(Math.PI * fu / 0.3);
        if (O !== W) O.g.position.x = slotX(O.i) + Math.sign(O.i - SL) * 7 * (1 - outExpo(clamp((dt - 0.05) / 0.4))); });
      W.g.position.x = lerp(1.45, slotX(SL), k);
      if (fu >= 0) { F.weave = { k: fu, a: 1 - clamp((t - (TL - 0.45)) / 0.15), c: S.chars.map(O => project([O.g.position.x, HEAD_C[1], 0.3])) }; F.finTitle = { a: clamp(fu / 0.1) * (1 - clamp((t - (TL - 0.45)) / 0.15)), pop: fu };
        F.bursts.push(...S.chars.map((O, i) => ({ t0: EV.flash7, pos: [slotX(O.i), HEAD_C[1], 0.4], n: 26, speed: 0.9, life: 0.7, grav: 0.1, seed: 70 + i, bright: 1.4 }))); }
      F.names = clamp((dt - 0.3) / 0.3); F.auraCol = '#C8A0B4'; F.auraK = 0.45;
    }
  }
  // 高音：小火花
  if (subj && high > 0.15) for (let h = Math.max(0, lastIdx(A.hats, t) - 2); h <= lastIdx(A.hats, t); h++) {
    const ht = A.hats[h]; if (h < 0 || t - ht > 0.15) continue;
    const a = hash(h * 3.1) * TAU, rr = 1.1 + 0.6 * hash(h * 5.7);
    F.bursts.push({ t0: ht, pos: [subj[0] + Math.cos(a) * rr, subj[1] + Math.sin(a) * rr * 0.8, 0.3], n: 2, speed: 0.15, life: 0.15, grav: 0, seed: h, bright: 1.8 });
  }
  const bk = bb.k >= 0 ? Math.exp(-bb.d / 0.16) * endK : 0;
  cam = { ...cam, pos: lerp3(cam.target, cam.pos, 1 - 0.02 * off - 0.025 * bk) };
  { const hx = 0.07 * Math.sin(t * qw(5.1)) * endK, hy = 0.05 * Math.sin(t * qw(4.3) + 1) * endK; cam = { ...cam, pos: [cam.pos[0] + hx, cam.pos[1] + hy, cam.pos[2]], target: [cam.target[0] + hx, cam.target[1] + hy, cam.target[2]] }; }
  S.spot.material.uniforms.uInt.value = F.spot ? 0.22 * F.spot.a : 0; if (F.spot) { S.spot.position.set(F.spot.x, 2.2, 0.6); S.spot.material.uniforms.uCol.value.set('#FFEFF5'); }
  S.stars.forEach(s => { s.material.uniforms.uScale.value = K.scale; });
  if (W.veil) W.veil.material.uniforms.uScale.value = K.scale;
  for (const s of TXT) if (tr >= s.t0 - 0.01 && tr <= s.t1 + 0.12) (s.kind === 'sub' ? F.subs : F.hooks).push(s);
  if (W.g.visible && !W.st?.lite) { const dd = Math.hypot(cam.pos[0] - W.g.position.x, cam.pos[1] - W.g.position.y, cam.pos[2] - W.g.position.z), f = lerp(0.6, 1, clamp((dd - 3.4) / 5)); W.mats.forEach(m => { m.uniforms.uDim.value *= f; }); }
  if (window.COVER && W.g.visible) { W.mats.forEach(m => { m.uniforms.uDim.value *= 1.3; }); }
  if (stop) F.dark = Math.max(F.dark, 0) + 0.2;                                // 急停：画面暗 20%
  F.subjBoxes = [];
  if (W.g.visible && t >= EV.zoom && t < EV.end) { const hp = W.g.position, s = W.g.scale.x, a2 = project([hp.x - 0.55 * s, HEAD_C[1] + 0.5 * s, hp.z + 0.2]), b2 = project([hp.x + 0.55 * s, HEAD_C[1] - 0.45 * s, hp.z + 0.2]); F.subjBoxes.push({ name: '色欲的脸', x0: a2[0], y0: a2[1], x1: b2[0], y1: b2[1] }); }
  F.cam = cam; F.kick = kick; F.tr = tr;
  return F;
}

// ------------------------------------------------------------ 2D 层
function segs(text) {
  const out = []; let cur = '', key = false;
  for (const ch of text) { if (ch === '〔') { out.push([cur, key]); cur = ''; key = true; } else if (ch === '〕') { out.push([cur, key]); cur = ''; key = false; } else cur += ch; }
  out.push([cur, key]); return out.filter(s => s[0]);
}
// 一行分段上色的文字：base 白色，关键词用 key 色；hook = 钩子大字（Heavy，2px 暗色描边 + 轻微同色发光）
function richText(ctx, text, cx, y, size, a, keyCol, o = {}) {
  const sg = segs(text), font = fs(o.hook ? 900 : 700, size);
  ctx.save(); ctx.font = font; const ws = sg.map(([s]) => ctx.measureText(s).width); ctx.restore();
  const W2 = ws.reduce((p, q) => p + q, 0); let x = o.align === 'left' ? cx : o.align === 'right' ? cx - W2 : cx - W2 / 2;
  const x0 = x;
  sg.forEach(([s, k], j) => {
    const col = k ? keyCol : TXTW;
    ctx.save(); ctx.globalAlpha = a; ctx.font = font; ctx.textBaseline = 'middle'; ctx.textAlign = 'left';
    if (o.hook) { ctx.lineJoin = 'round'; ctx.lineWidth = 4; ctx.strokeStyle = 'rgba(20,3,10,0.92)'; ctx.strokeText(s, x, y); }
    ctx.shadowColor = k ? keyCol : (o.hook ? 'rgba(255,179,209,0.35)' : 'rgba(0,0,0,0.8)'); ctx.shadowBlur = k ? 14 : o.hook ? 8 : 6;
    ctx.fillStyle = col; ctx.fillText(s, x, y);
    ctx.restore(); x += ws[j];
  });
  { const T = ctx.getTransform(), q = K.scale; BOXES.push({ x0: (T.e + T.a * x0) / q, x1: (T.e + T.a * (x0 + W2)) / q, y0: (T.f + T.d * (y - size * 0.6)) / q, y1: (T.f + T.d * (y + size * 0.6)) / q, label: plain(text), alpha: a }); }   // 画布坐标（扣掉平移和缩放）
  return { x0, x1: x0 + W2 };
}
function drawSub2(t, ctx, s) {
  if (t < s.t0 || t > s.t1 + 0.12) return;
  const a = Math.min(clamp((t - s.t0) / 0.06), 1 - clamp((t - s.t1) / 0.12));
  ctx.save(); const g = ctx.createLinearGradient(0, 842, 0, 1080); g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, `rgba(0,0,0,${0.65 * a})`); ctx.fillStyle = g; ctx.fillRect(0, 842, 1920, 238); ctx.restore();
  const sc = popScale(t - s.t0);
  if (s.id === 'K' && t >= EV.card) return;                                // 进入结尾卡后，这句移到结尾卡下方（见 drawCard）
  ctx.save(); ctx.translate(960, 965); ctx.scale(sc, sc); richText(ctx, s.text, 0, 0, s.size ?? 56, a, CY); ctx.restore();   // 基线约在画面高度 91%
}
function hookPos(s, t) {
  if (s.id === 'A') { const k = outExpo(clamp((t - EV.zoom + 0.12) / 0.12)); return [lerp(960, 110, k), lerp(940, 735, k), k > 0.5 ? 'left' : 'center']; }   // 推进特写后缩小，移到左侧标题下方
  if (s.id === 'S2') { const k = outExpo(clamp((t - EV.know) / 0.3)); return [960, lerp(955, 118, k), 'center']; }   // 反转：画面下方；拉远后移到画面上方（下方换成知识字幕）
  if (s.id === 'N') return [960, 985, 'center'];
  return [960, 930, 'center'];
}
function drawHook(t, ctx, s) {
  if (t < s.t0 || t > s.t1 + 0.12) return;
  const a = Math.min(clamp((t - s.t0) / (s.id === 'B' ? 0.15 : 0.06)), 1 - clamp((t - s.t1) / 0.12)), [x, y, al] = hookPos(s, t), sc = popScale(t - s.t0);
  if (s.suffix && t >= EV.pick) {                                          // 抽中那一拍补全罪名：整句（含“懒惰”）一起排版
    const sz2 = s.size + 8; ctx.save(); ctx.font = fs(900, s.size); const w1 = segs(s.text).reduce((p, [q]) => p + ctx.measureText(q).width, 0); ctx.font = fs(900, sz2); const w2 = ctx.measureText(s.suffix).width; ctx.restore();
    const kk = outExpo(clamp((t - EV.pick) / 0.25)), x0 = al === 'left' ? x : x - (w1 + w2) / 2;
    const shr = s.id === 'A' ? lerp(1, 0.62, outExpo(clamp((t - EV.zoom + 0.12) / 0.12))) : 1;   // 推进特写后缩小、移到脸的左下方
    ctx.save(); ctx.translate(x, y); ctx.scale(shr, shr); ctx.translate(-x, -y);
    ctx.save(); ctx.translate(x0, y); richText(ctx, s.text, 0, 0, s.size, a, s.key ?? CY, { hook: true, align: 'left' }); ctx.restore();
    const d = t - EV.pick, ps = d < 0.12 ? lerp(0.6, 1.25, outExpo(d / 0.12)) : d < 0.3 ? lerp(1.25, 1, sine((d - 0.12) / 0.18)) : 1;   // 放大回弹
    ctx.save(); ctx.translate(x0 + w1 + w2 / 2, y); ctx.scale(ps, ps);
    const glowK = Math.exp(-d / 0.35);
    ctx.globalAlpha = a; ctx.font = fs(900, sz2); ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.lineJoin = 'round'; ctx.lineWidth = 4; ctx.strokeStyle = 'rgba(20,3,10,0.92)'; ctx.strokeText(s.suffix, 0, 0);
    ctx.shadowColor = CY; ctx.shadowBlur = 16 + 40 * glowK; ctx.fillStyle = CY; ctx.fillText(s.suffix, 0, 0); ctx.shadowBlur = 30 * glowK; ctx.fillText(s.suffix, 0, 0);
    ctx.restore();
    { const T = ctx.getTransform(), q = K.scale; BOXES.push({ x0: (T.e + T.a * (x0 + w1)) / q, x1: (T.e + T.a * (x0 + w1 + w2)) / q, y0: (T.f + T.d * (y - sz2 * 0.6)) / q, y1: (T.f + T.d * (y + sz2 * 0.6)) / q, label: s.suffix, alpha: a }); }
    ctx.restore();
    return;
  }
  ctx.save(); ctx.translate(x, y); ctx.scale(sc, sc); richText(ctx, s.text, 0, 0, s.size, a, s.key ?? CY, { hook: true, align: al }); ctx.restore();
}
// 大标题亮相：脸的左侧，两行（“七宗罪 · 第四宗” 36px 白色 80% + “懒惰” 170px Heavy 青色发光）；“你不是懒。”那一拍缩小飞到左上角
function drawTitle2(ctx, t, T) {
  const k = T.fly, a = T.a * (1 - clamp((k - 0.85) / 0.15));
  if (a <= 0.003) return;
  const cx = lerp(470, 140, k), cy = lerp(500, 58, k), sc = lerp(1, 0.17, k) * (T.pop < 0.3 ? popScale(T.pop) : 1);
  ctx.save(); ctx.translate(cx, cy); ctx.scale(sc, sc); ctx.globalAlpha = a; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.font = fs(700, 36); ctx.fillStyle = 'rgba(240,230,234,0.8)'; ctx.shadowColor = 'rgba(0,0,0,0.8)'; ctx.shadowBlur = 6; ctx.fillText('七宗罪 · 第七宗', 0, -125);
  ctx.font = fs(900, 160); ctx.shadowColor = CY; ctx.shadowBlur = 40; ctx.fillStyle = CY; ctx.fillText('色欲', 0, 10);
  { const g = ctx.createLinearGradient(0, -70, 0, 90); g.addColorStop(0, '#FFE6F0'); g.addColorStop(0.45, '#FF4F95'); g.addColorStop(1, '#9A1648'); ctx.shadowBlur = 12; ctx.fillStyle = g; ctx.fillText('色欲', 0, 10); }
  ctx.restore();
  if (k < 0.5) BOXES.push({ x0: cx - 180 * sc, x1: cx + 180 * sc, y0: cy - 150 * sc, y1: cy + 100 * sc, label: '色欲（标题）', alpha: a });
}
// 标签：44px 白字，半透明暗色圆角底（内边距 10px），贴在物体旁边，不用长引线
function drawTag(ctx, L) {
  if (!(L.a > 0.01)) return;
  const size = L.small ? 36 : 44;
  ctx.save(); ctx.font = fs(700, size); const w = ctx.measureText(L.text).width + 20, h = size + 20;
  const cx = L.align === 'left' ? L.x + w / 2 : L.align === 'right' ? L.x - w / 2 : L.x;
  ctx.globalAlpha = L.a; ctx.fillStyle = 'rgba(18,4,10,0.66)'; ctx.beginPath(); ctx.roundRect(cx - w / 2, L.y - h / 2, w, h, 10); ctx.fill();
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.shadowColor = CY; ctx.shadowBlur = 8; ctx.fillStyle = TXTW; ctx.fillText(L.text, cx, L.y + 2);
  ctx.restore();
  { const T = ctx.getTransform(), q = K.scale; BOXES.push({ x0: (T.e + T.a * (cx - w / 2)) / q, x1: (T.e + T.a * (cx + w / 2)) / q, y0: (T.f + T.d * (L.y - h / 2)) / q, y1: (T.f + T.d * (L.y + h / 2)) / q, label: L.text, alpha: L.a }); }
}

// 结尾卡：左边“色欲”大字 + “出厂设置 · 07 / 07”；角色周围的四字词；下方两行
function drawCard(t, ctx, F) {
  const C5 = F.card, a = C5.a; if (a <= 0.003) return;
  ctx.save(); ctx.globalAlpha = a; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.font = fs(900, 200);
  ctx.shadowColor = CY; ctx.shadowBlur = 44; ctx.fillStyle = CY; ctx.fillText('色欲', 520, 420);
  { const g = ctx.createLinearGradient(0, 330, 0, 510); g.addColorStop(0, '#FFE6F0'); g.addColorStop(0.45, '#FF4F95'); g.addColorStop(1, '#9A1648'); ctx.shadowBlur = 12; ctx.fillStyle = g; ctx.fillText('色欲', 520, 420); }
  ctx.font = fs(700, 28); ctx.shadowBlur = 6; ctx.shadowColor = 'rgba(0,0,0,0.8)'; ctx.fillStyle = 'rgba(240,230,234,0.85)'; ctx.fillText('出厂设置 · 07 / 07', 520, 565); ctx.restore();
  BOXES.push({ x0: 320, x1: 720, y0: 320, y1: 590, label: '色欲（结尾卡）', alpha: a });
  for (const w of F.words) { if (w.a <= 0.01) continue; const sc = w.pop < 0.25 ? popScale(w.pop) : 1, dx = w.side === 'left' ? -1 : 1;
    ctx.save(); ctx.translate(w.x, w.y); ctx.scale(sc, sc); richText(ctx, '〔' + w.s + '〕', 0, 0, 42, w.a * a, '#FFC4DC', { hook: true, align: w.side === 'left' ? 'right' : 'left' }); ctx.restore();
    ctx.save(); ctx.globalAlpha = w.a * a; ctx.fillStyle = '#FFE0EC'; ctx.shadowColor = CY; ctx.shadowBlur = 12; ctx.beginPath(); ctx.arc(w.x + dx * -14, w.y, 6, 0, TAU); ctx.fill(); ctx.restore(); }
  ctx.save(); const g = ctx.createLinearGradient(0, 800, 0, 1080); g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, `rgba(0,0,0,${0.65 * a})`); ctx.fillStyle = g; ctx.fillRect(0, 800, 1920, 280); ctx.restore();
  richText(ctx, '心动和上瘾，用的是〔同一套〕奖励回路。', 960, 900, 52, a, CY);
  if (C5.q > 0) { const sc = popScale(C5.qpop); ctx.save(); ctx.translate(960, 985); ctx.scale(sc, sc); richText(ctx, '说实话，你是〔颜控〕吗？', 0, 0, 56, C5.q * a, CY); ctx.restore(); }
}
// 心形路径（中心 x, y，大小 r）
function heartPath(ctx, x, y, r) {
  ctx.beginPath();
  for (let i = 0; i <= 60; i++) { const a = i / 60 * TAU, hx = 16 * Math.pow(Math.sin(a), 3), hy = 13 * Math.cos(a) - 5 * Math.cos(2 * a) - 2 * Math.cos(3 * a) - Math.cos(4 * a); const px = x + hx / 17 * r, py = y - hy / 17 * r; i ? ctx.lineTo(px, py) : ctx.moveTo(px, py); }
  ctx.closePath();
}
// 循环箭头（上瘾）
function loopIcon(ctx, x, y, r, k) {
  ctx.beginPath(); ctx.arc(x, y, r, -Math.PI * 0.35, Math.PI * 1.45); ctx.stroke();
  const a = Math.PI * 1.45, ex = x + Math.cos(a) * r, ey = y + Math.sin(a) * r;
  ctx.beginPath(); ctx.moveTo(ex - 14, ey - 10); ctx.lineTo(ex + 4, ey + 2); ctx.lineTo(ex - 16, ey + 12); ctx.stroke();
}
let T2v = 0; const T2 = () => T2v;
export function draw2D(tr, ctx, F) {
  const t = vt(tr); T2v = t;
  if (F.dark > 0) { ctx.save(); ctx.fillStyle = `rgba(0,0,0,${F.dark})`; ctx.fillRect(0, 0, 1920, 1080); ctx.restore(); }   // 急停 / 吸气：画面暗一点（文字不暗）
  if (!window.COVER && F.series > 0.001) glowText('七宗罪 · 最终集', 960, 92, fs(700, 60), '#FAEEF2', { glow: 22, glowColor: '#FFFFFF', nobox: true, alpha: F.series });
  if (!window.COVER && F.corner > 0.001) { ctx.save(); ctx.globalAlpha = 0.7 * F.corner; ctx.font = fs(700, 28); ctx.textBaseline = 'middle'; ctx.fillStyle = TXTW; ctx.shadowColor = 'rgba(0,0,0,0.8)'; ctx.shadowBlur = 6; ctx.fillText('七宗罪 · 07 / 07 · 色欲', 60, 58); ctx.restore(); }
  if (F.title && !window.COVER) drawTitle2(ctx, tr, F.title);
  if (F.names > 0) S.chars.forEach(C => {
    const p = project([C.g.position.x, -1.78, 0]);
    ctx.save(); ctx.globalAlpha = 0.62 * F.names; ctx.fillStyle = '#0B0910'; ctx.beginPath(); ctx.roundRect(p[0] - 60, p[1] - 27, 120, 54, 10); ctx.fill(); ctx.restore();
    glowText(C.sin.name, p[0], p[1] + 2, fs(700, 38), tone(C.sin.col, 0.25), { alpha: F.names, glow: 12, glowColor: C.sin.col });
  });
  if (F.aired > 0) [0, 1, 2, 3, 4, 5].forEach(i => { const C = S.chars[i], p = project([C.g.position.x, 1.18, 0]); glowText('已播出', p[0], p[1], fs(700, 24), tone(C.sin.col, 0.4), { alpha: F.aired, glow: 10, glowColor: C.sin.col }); });
  if (F.tick && F.tick.k < 1) { const T3 = F.tick, r = T3.w * (0.6 + 0.6 * outExpo(T3.k)); ctx.save(); ctx.globalAlpha = 0.9 * (1 - T3.k); ctx.strokeStyle = '#FFD6E6'; ctx.lineWidth = 2; ctx.shadowColor = CY; ctx.shadowBlur = 10; ctx.beginPath(); ctx.ellipse(T3.c[0], T3.c[1], r, r * 0.22, 0, 0, TAU); ctx.stroke(); ctx.restore(); }
  if (F.flash && F.flash.a > 0.01) { const f = F.flash; ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = f.a; const g = ctx.createRadialGradient(f.c[0], f.c[1], 0, f.c[0], f.c[1], f.r); g.addColorStop(0, 'rgba(255,179,209,0.75)'); g.addColorStop(0.4, 'rgba(255,61,139,0.35)'); g.addColorStop(1, 'rgba(255,61,139,0)'); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(f.c[0], f.c[1], f.r, 0, TAU); ctx.fill(); ctx.restore(); }
  if (F.path && F.path.a > 0.01) {                                          // 奖励回路：一节一节亮起，每拍脉冲；末端分成“心动”“上瘾”两支
    const P3 = F.path, n = P3.pts.length - 1, upto = P3.lit, br = 1 + 0.6 * P3.pulse; ctx.save(); ctx.globalAlpha = P3.a; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    const end = P3.pts[n], hpos = [end[0] + 150, end[1] - 150], lpos = [end[0] + 150, end[1] + 170];
    ctx.strokeStyle = 'rgba(255,61,139,0.22)'; ctx.lineWidth = 6; ctx.beginPath(); P3.pts.forEach((p, i) => i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1])); ctx.stroke();
    for (const q of [hpos, lpos]) { ctx.beginPath(); ctx.moveTo(end[0], end[1]); ctx.lineTo(q[0], q[1]); ctx.stroke(); }
    ctx.globalCompositeOperation = 'lighter'; ctx.shadowColor = CY; ctx.shadowBlur = 16 + 16 * P3.pulse;
    ctx.strokeStyle = `rgba(255,140,190,${clamp(0.8 * br)})`; ctx.lineWidth = 7 + 3 * P3.pulse; ctx.beginPath();
    for (let i = 0; i <= n; i++) { if (i > upto + 1e-6) { const f = upto - (i - 1); if (f > 0) { const a = P3.pts[i - 1], b = P3.pts[i]; ctx.lineTo(lerp(a[0], b[0], f), lerp(a[1], b[1], f)); } break; } const p = P3.pts[i]; i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1]); } ctx.stroke();
    for (const [q, kk] of [[hpos, P3.b1], [lpos, P3.b2]]) if (kk > 0) { ctx.beginPath(); ctx.moveTo(end[0], end[1]); ctx.lineTo(lerp(end[0], q[0], kk), lerp(end[1], q[1], kk)); ctx.stroke(); }
    P3.pts.forEach((p, i) => { if (i > upto + 1e-6) return; ctx.fillStyle = `rgba(255,214,230,${clamp(0.85 * br)})`; ctx.beginPath(); ctx.arc(p[0], p[1], 7 + 3 * P3.pulse, 0, TAU); ctx.fill(); });
    // 末端的图标：心形（心动）、循环箭头（上瘾）
    if (P3.b1 > 0) { const s = P3.b1 >= 1 ? 1 + 0.12 * P3.pulse : outBack(P3.b1); ctx.globalAlpha = P3.a * clamp(P3.b1 * 2); ctx.fillStyle = `rgba(255,120,175,${0.75 + 0.2 * P3.pulse})`; ctx.shadowBlur = 20 + 14 * P3.pulse; heartPath(ctx, hpos[0], hpos[1], 34 * s); ctx.fill(); }
    if (P3.b2 > 0) { const s = P3.b2 >= 1 ? 1 + 0.12 * P3.pulse : outBack(P3.b2); ctx.globalAlpha = P3.a * clamp(P3.b2 * 2); ctx.strokeStyle = `rgba(255,150,195,${0.8 + 0.15 * P3.pulse})`; ctx.lineWidth = 6; ctx.shadowBlur = 18 + 14 * P3.pulse; loopIcon(ctx, lpos[0], lpos[1], 30 * s); }
    ctx.restore();
    const m = P3.pts[2]; drawTag(ctx, { text: '奖励回路', x: m[0], y: m[1] + 70, a: P3.a * clamp(P3.lit * 2) });
    if (P3.b1 > 0) drawTag(ctx, { text: '心动', x: hpos[0], y: hpos[1] + 72, a: P3.a * clamp(P3.b1 * 2) });
    if (P3.b2 > 0) drawTag(ctx, { text: '上瘾', x: lpos[0], y: lpos[1] + 70, a: P3.a * clamp(P3.b2 * 2) });
  }
  if (F.count && F.count.n > 0 && !window.COVER && F.count.fade > 0.003) {      // 右上方的计数：“心动 +1…+6”（100px），反转那一拍“心动 +7”（200px）
    const C4 = F.count, big = C4.big, size = big ? 200 : 100, u = C4.pop, sc = big ? (u < 0.18 ? lerp(1.8, 0.94, outExpo(u / 0.18)) : u < 0.35 ? lerp(0.94, 1, sine((u - 0.18) / 0.17)) : 1) : (u < 0.1 ? lerp(0.7, 1.15, u / 0.1) : u < 0.25 ? lerp(1.15, 1, sine((u - 0.1) / 0.15)) : 1);
    const x1 = 1870, y = big ? 158 : 175;
    ctx.save(); ctx.font = fs(900, size); const wNum = ctx.measureText('+' + C4.n).width; ctx.font = fs(900, size * 0.62); const wTxt = ctx.measureText('心动 ').width; ctx.restore();
    const W2 = wNum + wTxt, cx = x1 - W2 / 2;
    ctx.save(); ctx.translate(cx, y); ctx.scale(sc, sc); ctx.globalAlpha = C4.fade; ctx.textAlign = 'left'; ctx.textBaseline = 'middle'; ctx.lineJoin = 'round';
    ctx.font = fs(900, size * 0.62); ctx.lineWidth = 6; ctx.strokeStyle = 'rgba(16,3,8,0.9)'; ctx.strokeText('心动 ', -W2 / 2, size * 0.06); ctx.shadowColor = 'rgba(0,0,0,0.8)'; ctx.shadowBlur = 8; ctx.fillStyle = TXTW; ctx.fillText('心动 ', -W2 / 2, size * 0.06);
    ctx.font = fs(900, size); ctx.shadowBlur = 0; ctx.strokeText('+' + C4.n, -W2 / 2 + wTxt, 0); ctx.shadowColor = CY; ctx.shadowBlur = big ? 40 : 22; ctx.fillStyle = CY; ctx.fillText('+' + C4.n, -W2 / 2 + wTxt, 0);
    ctx.restore();
    BOXES.push({ x0: x1 - W2, x1, y0: y - size * 0.55, y1: y + size * 0.55, label: '心动计数', alpha: C4.fade });
  }
  if (F.shock2) { const s2 = F.shock2; ctx.save(); ctx.globalAlpha = s2.a; ctx.strokeStyle = HI; ctx.lineWidth = 4; ctx.shadowColor = CY; ctx.shadowBlur = 16; ctx.beginPath(); ctx.arc(s2.c[0], s2.c[1], s2.r * 1920, 0, TAU); ctx.stroke(); ctx.restore(); }
  if (F.card) drawCard(t, ctx, F);
  if (F.weave && F.weave.a > 0.01) {                                        // 七色交织：每个人头上一圈自己颜色的光环扩散；七条颜色的光带在头顶上方交织
    const Wv = F.weave, k = Wv.k, fl = Math.exp(-k / 0.5);
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    S.chars.forEach((C, i) => { const c = Wv.c[i], r = 60 + 260 * outExpo(clamp(k / 0.7)); ctx.globalAlpha = Wv.a * 0.75 * (1 - clamp(k / 0.7)); ctx.strokeStyle = C.sin.col; ctx.lineWidth = 4; ctx.shadowColor = C.sin.col; ctx.shadowBlur = 18; ctx.beginPath(); ctx.arc(c[0], c[1], r, 0, TAU); ctx.stroke(); });
    const y0 = 258, amp = 34;
    S.chars.forEach((C, i) => { ctx.globalAlpha = Wv.a * (0.18 + 0.55 * fl) * clamp(k / 0.15); ctx.strokeStyle = C.sin.col; ctx.lineWidth = 3; ctx.shadowColor = C.sin.col; ctx.shadowBlur = 12; ctx.beginPath();
      for (let x = 120; x <= 1800; x += 12) { const y = y0 + amp * Math.sin(x / 1920 * TAU * 2.0 + i / 7 * TAU + k * 2.2) + 6 * Math.sin(x / 140 + i); x === 120 ? ctx.moveTo(x, y) : ctx.lineTo(x, y); } ctx.stroke(); });
    ctx.restore();
  }
  if (F.finTitle && F.finTitle.a > 0.003) { const f = F.finTitle, sc = f.pop < 0.25 ? popScale(f.pop) : 1; ctx.save(); ctx.translate(960, 110); ctx.scale(sc, sc); ctx.translate(-960, -110); glowText('七宗罪 · 完结', 960, 110, fs(900, 72), '#FAEEF2', { glow: 26, glowColor: '#FFFFFF', alpha: f.a }); ctx.restore(); }
  if (!window.COVER) for (const s of F.hooks) drawHook(tr, ctx, s);
  if (!window.COVER) for (const s of F.subs) drawSub2(tr, ctx, s);
  if (F.shock) { ctx.save(); ctx.globalAlpha = F.shock.a; ctx.strokeStyle = F.shock.col; ctx.lineWidth = lerp(5, 1, 1 - F.shock.a / 0.45); ctx.shadowColor = CY; ctx.shadowBlur = 14; ctx.beginPath(); ctx.arc(F.shock.c[0], F.shock.c[1], F.shock.r * 1920, 0, TAU); ctx.stroke(); ctx.restore(); }
}
