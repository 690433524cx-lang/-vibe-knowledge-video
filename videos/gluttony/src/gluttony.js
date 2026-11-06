// 《七宗罪》第四集：懒惰（角色、字幕、律动沿用合集与愤怒）。合集的场景与时间轴（数据与音频工具在 show_core.js）
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
  C.eyes = [FACE.eyeR, FACE.eyeL].map(p => { const m = glow(2, sin.col, [0.5, 0.28], head, { billboard: false, order: 46, core: sin.id === 'sloth' ? '#EFFFFF' : '#FFC8B8' }); m.position.set(p[0], p[1], p[2] + 0.04); return m; });
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
    C.feast = P(feastPB(), { bright: 5.4, size: 0.0125,
      uniforms: { uE: { value: [0, 0, 0, 0, 0, 0, 0] }, uR: { value: [1, 1, 1, 1, 1, 1, 1] }, uShow6: { value: 0 }, uPhase: { value: 0 }, uKick: { value: 0 } },
      uniformDecl: 'uniform float uE[7]; uniform float uR[7]; uniform float uShow6, uPhase, uKick;',
      posHook: `{
        float c = aExtra.y; int ci = int(c + 0.5); float e = uE[ci], r = uR[ci];
        float a = c/6.0*6.28318 + uPhase; vec3 home = vec3(cos(a)*1.38, 0.12 + sin(a)*0.9, 0.3)*(1.0 + 0.06*uKick);   /* 一圈绕在头四周，不挡脸 */
        if (c > 5.5) home = vec3(1.2, 0.8, 0.7);
        vec3 mouth = vec3(0.0, -0.28, 0.5), far = home + normalize(h3(c*3.7) - 0.5)*3.0;
        float rr = r*r*(3.0 - 2.0*r); vec3 base = mix(far, home, rr);
        p = mix(base, mouth, e*e) + p*1.6*(1.0 - 0.8*e)*(0.4 + 0.6*rr);
        vis *= (1.0 - step(0.98, e))*step(0.02, r)*(c > 5.5 ? uShow6 : 1.0)*(1.0 - step(0.5, uL)); }`,
      colHook: '{ float gl = exp(-pow(aExtra.x - fract(uTime*0.35 + aExtra.y*0.21), 2.0)*30.0); col = mix(col, vec3(1.0, 0.95, 0.88), gl*0.5); b *= 0.85 + 0.8*gl; }' }, rig);
    C.beard = P(beardPB(), { bright: 3.4, size: 0.0105, col: '#E0702A', posHook: '{ vis *= 1.0 - step(0.5, uL); p.x += 0.012*sin(uTime*3.0 + aExtra.x*6.0)*aExtra.x; }' });   // 大胡子（跟着头动）
    C.napkin = P(napkinPB(), { bright: 3.0, size: 0.011, col: '#FFD8BC', posHook: '{ vis *= 1.0 - step(0.5, uL); p.z += 0.015*sin(uTime*2.0 + p.x*9.0); }' }, rig);   // 下巴下面塞着的餐巾
    if (C.feast) { const u = C.feast.material.uniforms; u.uColA.value.set('#FFB88A'); u.uColB.value.set('#FF7A1F'); u.uFacing.value = 0; }   // 实心、橙色系
    for (const o of [C.beard, C.napkin]) if (o) o.material.uniforms.uFacing.value = 0;
  } else if (sin.id === 'lust') {
    C.hearts = P(PR.hearts(24), { bright: 2.0, size: 0.0095, posHook: `{
        float c = aExtra.y, a = c/24.0*6.28318 + uTime*qw(0.4), rr = 0.84 + 0.18*h1(c*5.1) + 0.08*sin(uTime*qw(1.0) + c);
        vec3 home = vec3(cos(a)*rr, 0.05 + 0.6*sin(a)*0.85, 0.25 + 0.1*cos(a));
        float hs = 1.0;
        if (uL > 0.5) { float a2 = c/8.0*6.28318 + uTime*qw(0.4); home = vec3(cos(a2)*0.52, 0.08 + sin(a2)*0.66, 0.3); hs = 0.46; vis *= step(c, 7.5); }   /* 排成一排：贴着头的一小圈，最多 8 颗 */
        vec3 o = home + normalize(home - vec3(0.0, 0.05, 0.0))*uB*(1.5 + h1(c)*2.0); p = o + p*hs*(1.0 + 0.25*uA + uB*0.8); }` });
    C.eyeShapes = [FACE.eyeR, FACE.eyeL].map(e => { const m = propMat('#FF7FB5', { bright: 1.8, size: 0.008 }); const o = pts(PR.heartEye().geometry(THREE), m, head, 47); o.position.set(e[0], e[1], e[2] + 0.03); return o; });
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
     (s.lite ? 3.0 : 4.8 * (C.sin.id === 'greed' ? 1.12 : C.sin.id === 'gluttony' ? 1.15 : 1)) * clamp(0.42 / luma, 0.7, 1.15);   // 金色亮度高，按亮度补偿会压得太暗：贪婪特写再提一点   // 亮度靠人物本身（亮部仍是红色）       // 按颜色的亮度补偿：绿色不过曝、紫色不发暗
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
  C.eyes.forEach(m => { m.visible = !shp && eo > 0.01 && sc < 1; m.material.uniforms.uInt.value = 0.95 * eo * (1 + 0.3 * Math.max(0, kick)); m.material.uniforms.uOpen.value = 0.45 + 0.55 * eo; m.material.uniforms.uRays.value = 0.8 * eo; });
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
    if (C.hearts) { u(C.hearts.material, 'uA', beatK); u(C.hearts.material, 'uB', gag * 0.8 + hold * 0.2); }
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

// 抽签的小发光图标

// ============================================================ 《七宗罪》第四集：懒惰（约 48 秒，横屏）
// 场景 1 抽签 → 场景 2 你不是懒（明天的你 → 陌生人；三根柱子；把“那件事”推给陌生人）→ 场景 3 大脑与电池
// → 场景 4 荆棘与三个标签 → 场景 5 只是还没准备好 → 场景 6 直视提问 → 场景 7 下集预告（回到第 0 帧）
const CY = '#FF7A1F', HI = '#FFC49A', DK = '#4A1E05', WH = '#FFF3E8', GOLD = '#FF3D8B', SL = 5;   // 暴食：主色橙、高光、深色、最亮处；GOLD 这里是下一集（色欲）的玫红   // 贪婪：主色金、高光、深色、最亮处；GOLD 这里是下一集（暴食）的橙色
const RED = CY;   // 通用代码里的“这一集的主色”
const TXTW = '#EEE8E2';   // 文字的“白色”：亮度约 238，不超过 240（大段白字不算进过曝像素）
const LITE_DIM = { pride: 0.85, envy: 0.85, wrath: 0.9, sloth: 0.8, greed: 0.32, gluttony: 0.3, lust: 0.6 };   // 排成一排时道具压暗（和愤怒一致）
let DN, BEAT, DROP, EV, TXT;
const nb = x => B.reduce((a, b) => Math.abs(b - x) < Math.abs(a - x) ? b : a, B[0]);           // 最近的拍点
const nd = x => DN.reduce((a, b) => Math.abs(b - x) < Math.abs(a - x) ? b : a, DN[0]);         // 最近的小节第一拍
const nextBeat = x => B.find(b => b > x + 1e-4) ?? x + BEAT;
const beatAtOrAfter = x => B.find(b => b >= x - 1e-4) ?? x;
const plain = s => s.replace(/[〔〕]/g, '');
const charCount = s => plain(s).replace(/[，。：、；？！—…“”‘’\s]/g, '').length;
const readT = s => 1.0 + 0.17 * charCount(s);

// 全片的文字（钩子大字 + 字幕）。want = 想要的时间（会对齐到拍点，只往后延）；chain = 和前一条互相替换
const TEXT_LIST = [
  { id: 'A', kind: 'hook', text: '刷到这条，你的〔出厂设置〕是——', suffix: '暴食', want: 0.1, exact: true, size: 64, chain: false, endAt: 2 },
  { id: 'S1', kind: 'sub', text: '暴食说：我就尝〔一口〕。', want: 3.452, size: 56, chain: false, endAt: 5 },
  { id: 'S2', kind: 'hook', text: '——这是今晚的〔第七口〕。', want: 8.477, size: 64, chain: false, endAt: 'card' },
  { id: 'K', kind: 'sub', text: '出厂设置：吃饱的信号，要〔晚到约20分钟〕。', want: 10.152, size: 56, chain: false, endAt: 10 },   // 进入结尾卡后这句知识继续留在下方（第 7–9 小节），一共显示到结尾卡结束
  { id: 'N', kind: 'hook', text: '下一集：〔色欲〕', want: 17.27, size: 56, key: GOLD, chain: false, endAt: 'fin' },
];
function scheduleText() {
  let prevEnd = 0; const out = [];
  for (const o of TEXT_LIST) {
    const minD = Math.max(readT(o.text + (o.suffix ?? '')), o.minD ?? 0);
    let t0 = o.exact ? o.want : nb(o.want);
    if (o.chain !== false && t0 < prevEnd - 1e-3) t0 = beatAtOrAfter(prevEnd);
    const s = { ...o, t0, minD, size: o.size ?? 52 };
    out.push(s); if (o.chain !== false) prevEnd = t0 + minD;
  }
  const chain = out.filter(s => s.chain !== false);
  chain.forEach((s, i) => { s.t1 = i + 1 < chain.length ? chain[i + 1].t0 - 0.06 : TL - 0.45; });
  out.filter(s => s.chain === false).forEach(s => { s.t1 = typeof s.endAt === 'number' ? DN[s.endAt] - 0.06 : s.endAt === 'card' ? DN[7] - 0.06 : s.endAt === 'fin' ? TL - 0.45 : beatAtOrAfter(s.t0 + s.minD); });
  return out;
}
const TX = id => TXT.find(s => s.id === id);

export function build(scene, beats, heads, audioEnv) {
  S = scene; BT = beats; B = beats.beats; TL = beats.duration; DN = beats.downbeats; BEAT = beats.beat; DROP = beats.drop;
  setAudio(audioEnv, beats);
  EV = { zoom: DN[2], change: DN[3], seven: DN[5], wide: DN[6], card: DN[7], ask: DN[8], full: DN[9], end: DN[10], gaze: 9e9 };
  TXT = scheduleText();
  { const q = BEAT / 4, g = n => B[0] + n * q;   // 转盘：先快后慢，经过暴食，假停在色欲半拍，下一拍退回暴食
    EV.spots = [[2, 0], [3, 1], [4, 2], [5, 3], [6, 4], [7, 5], [8, 6], [9, 5], [10, 4], [11, 3], [12, 2], [14, 3], [17, 4], [20, 5], [22, 6], [24, 5]].map(([n, i]) => ({ t: g(n), i }));
    EV.pick = EV.spots[EV.spots.length - 1].t; EV.fake = EV.spots[EV.spots.length - 2].t; }
  EV.fly = EV.zoom + 2 * BEAT;                                           // 第 2 小节最后半小节：吸气，标题飞到左上角
  { const i = B.indexOf(EV.change); EV.eats = [1, 2, 3, 4, 5, 6].map((k, j) => ({ t: B[i + k], s: [1, 2, 3, 4, 5, 0][j] })); EV.eats.push({ t: EV.seven, s: 6 });
    const w = B.indexOf(EV.wide); [1, 2, 3].forEach((k, j) => EV.eats.push({ t: B[w + k], s: [1, 2, 3][j] })); EV.pat = B[B.indexOf(EV.seven) + 1]; }
  { const w = B.indexOf(EV.wide); EV.ticks = Array.from({ length: 12 }, (_, k) => B[w + k]); const c = B.indexOf(EV.card); EV.words = [0, 1, 2, 3].map(k => B[c + k]); }
  EV.next = nextBeat(EV.end); EV.yawns = []; EV.cols = []; EV.batches = [];
  S.chars = SINS.map((sin, i) => makeChar(sin, i, heads));
  S.future = makeChar(SINS[SL], 8, heads); S.decade = makeChar(SINS[SL], 9, heads);
  S.extra = [S.future, S.decade];
  S.spot = makeSpot();
  S.stars = [makeStars(14000, -22, 1.1, 11), makeStars(11000, -9, 2.0, 12)];   // 远景小、慢；前景大、快
  S.zs = makeZs(10);
  window.__S = S; S.box = makeBox(); S.ticket = makeTicket(); S.scale = makeScale(); S.cube = makeCube(); S.brain = makeBrain(); S.sand = makeSand(); S.thorns = makeThorns(); S.irises = makeIris(S.chars[SL].head);
  ZS = scheduleZ();
}

// ------------------------------------------------------------ 粒子“Z”：头顶飘出、1.5 秒后消散
let ZS = [];
function makeZs(n) {
  const out = [];
  for (let k = 0; k < n; k++) {
    const pb = new PB(), R = j => hash(j * 1.913 + k * 7.31 + 0.17);
    const segs = [[[-0.5, 0.5], [0.5, 0.5]], [[0.5, 0.5], [-0.5, -0.5]], [[-0.5, -0.5], [0.5, -0.5]]];
    for (let i = 0; i < 2400; i++) {
      const sg = segs[i % 3], u = R(i * 3), w = (R(i * 3 + 1) - 0.5) * 0.16, dz = (R(i * 3 + 2) - 0.5) * 0.06;
      const x = lerp(sg[0][0], sg[1][0], u), y = lerp(sg[0][1], sg[1][1], u), dx = sg[1][0] - sg[0][0], dy = sg[1][1] - sg[0][1], l = Math.hypot(dx, dy);
      const edge = Math.abs(w) > 0.065;
      pb.add([x - dy / l * w, y + dx / l * w, dz], [0, 0, 1], R(i * 7), [0, 0, 0], [R(i * 11), 0, 0, 1], [edge ? 1.3 : 0.8, 30]);
    }
    const m = propMat(HI, { bright: 1.0, size: 0.011 }); m.uniforms.uAsm.value = 1;
    const g = new THREE.Group(); K.scene.add(g); const p = new THREE.Points(pb.geometry(THREE), m); p.frustumCulled = false; p.renderOrder = 44; g.add(p); K.mats.push(m); g.visible = false;
    out.push({ g, m });
  }
  return out;
}
// 什么时候飘 Z：亮相时连着三个；之后每小节第一拍头顶飘一个（大脑场景从大脑上方飘）；帽子盖住眼睛时再连着三个
function scheduleZ() {
  return [];
  const z = [{ t0: EV.zoom + 0.12, s: 0.18 }, { t0: EV.zoom + 0.55, s: 0.22 }, { t0: EV.zoom + 0.95, s: 0.2 }];
  for (const d of DN) if (d >= EV.pull - 1e-3 && d < EV.gaze - 0.1) { const inBrain = d >= EV.brain - 0.5 && d < EV.back + 0.4; z.push({ t0: d + 0.05, s: 0.18 + 0.06 * hash(d), pos: inBrain ? [-1.0, 0.85, 0.3] : null }); }
  z.push({ t0: EV.drain[4] + 0.35, s: 0.26, pos: [-1.0, 0.85, 0.3] });                          // 电量见底：大脑上方飘起一个 Z
  for (const d of [0, 0.35, 0.7]) z.push({ t0: EV.hatDown + d, s: 0.2 + 0.03 * d });            // 帽子盖住眼睛：连着三个 Z
  return z.filter(o => o.t0 < TL - 2).sort((a, b) => a.t0 - b.t0);
}
// 打瞌睡：每两小节一次（从“明天的你”出现之后），头慢慢往下点约 8 度，再缓缓抬起
const NODS = () => [] && DN.filter((d, i) => d >= EV.pull - 1e-3 && d < EV.gaze - 2.0 && !(d > EV.brain - 4.6 && d < EV.back) && Math.round((d - EV.pull) / (4 * BEAT)) % 2 === 0);   // 每两小节一次（大脑场景除外）
function nodAt(t) {
  if (t >= EV.wake && t < EV.wake + 0.12) return 1 - outExpo((t - EV.wake) / 0.12);                                 // 被吓醒：猛地抬头
  for (const d of NODS()) { const u = (t - d) / (8 * BEAT); if (u >= 0 && u < 1) return u < 0.35 ? sine(u / 0.35) : u < 0.5 ? 1 : u < 0.85 ? 1 - sine((u - 0.5) / 0.35) : 0; }
  return 0;
}

// ------------------------------------------------------------ 快递盒：实心发光的粒子立方体，顶面和侧面有胶带十字纹，侧面一个小箭头图标；uOpen：盒盖翻开
function makeBox() {
  const pb = new PB(), R = n => hash(n * 1.37 + 0.91);
  for (let i = 0; i < 34000; i++) pb.add([R(i * 9) - 0.5, R(i * 9 + 1) - 0.5, R(i * 9 + 2) - 0.5], [0, 0, 1], R(i * 9 + 3), [0, 0, 0], [R(i * 9 + 4), 0, 0, 1], [0.55, 30]);   // 实心
  for (let i = 0; i < 40000; i++) {
    const f = i % 6, a = R(i * 3) - 0.5, b = R(i * 3 + 1) - 0.5, ax = f >> 1, sg = f & 1 ? 0.5 : -0.5;
    const p = ax === 0 ? [sg, a, b] : ax === 1 ? [a, sg, b] : [a, b, sg];
    const edge = Math.max(Math.abs(a), Math.abs(b)) > 0.47, tape = ax === 1 ? (Math.abs(a) < 0.07 || Math.abs(b) < 0.07) : Math.abs(ax === 0 ? b : a) < 0.07;
    const arrow = ax === 2 && sg > 0 && ((Math.abs(a + 0.25) < 0.025 && b > -0.32 && b < -0.08) || (Math.abs(Math.abs(a + 0.25) - (b + 0.08) * -0.6 - 0.0) < 0.022 && b > -0.16 && b < -0.06));   // 侧面的小箭头
    const lid = ax === 1 && sg > 0 ? 1 : 0;
    pb.add(p, [0, 0, 1], R(i * 5), [0, 0, 0], [R(i * 7), lid, 0, 1], [edge ? 1.6 : tape ? 1.35 : arrow ? 1.8 : 0.55, 30]);
  }
  const m = propMat('#FFD27A', { bright: 1.0, size: 0.02, uniforms: { uOpen: { value: 0 } }, uniformDecl: 'uniform float uOpen;',
    posHook: '{ if (aExtra.y > 0.5) { float sd = sign(p.x + 1e-4); float ang = uOpen*2.1; vec3 h = vec3(sd*0.5, 0.5, p.z); vec3 r = p - h; p = h + vec3(r.x*cos(ang) - r.y*sin(ang)*sd, r.x*sin(ang)*sd + r.y*cos(ang), r.z); } }' });   // 盒盖从中间向两边翻开
  m.uniforms.uAsm.value = 1; m.uniforms.uFacing.value = 0;
  const g = new THREE.Group(); K.scene.add(g); const p = new THREE.Points(pb.geometry(THREE), m); p.frustumCulled = false; p.renderOrder = 32; g.add(p); K.mats.push(m); g.visible = false;
  const gl = new THREE.Mesh(new THREE.PlaneGeometry(3.4, 3.4), H.glowPlane(0)); gl.material.uniforms.uCol.value.set(CY); gl.material.blending = THREE.AdditiveBlending; gl.material.transparent = true; gl.material.depthWrite = false; gl.renderOrder = 31; gl.position.z = -0.6; g.add(gl);
  return { g, m, glow: gl };
}
// 金币环的状态：枚数（每两小节飞来几枚）、转角、鼓点弹一下；tight 收紧到胸口，loose 松开飘远
function coinState(W, t, AUD, o = {}) {
  if (!W.coins) return; const u = W.coins.material.uniforms;
  let cnt = 14, last = null, prev = 14; for (const b of EV.batches) { if (t >= b.t - 1e-4) { prev = cnt; cnt += b.n; last = b; } }
  cnt = Math.min(64, cnt + (o.extra ?? 0)); if (o.max != null) cnt = Math.min(cnt, o.max);
  u.uC.value = cnt; u.uC0.value = last ? Math.min(prev, cnt) : 0; u.uFly.value = last ? clamp((t - last.t) / 0.7) : 1;
  u.uBright.value *= o.dim ?? 1;
  u.uKick.value = Math.max(0, AUD.kick); u.uPhase.value = 0.5236 * t * (o.spin ?? 1) + (o.phase ?? 0); u.uTight.value = o.tight ?? 0; u.uLoose.value = o.loose ?? 0; u.uMid.value = AUD.mid;
}
// ------------------------------------------------------------ 奖励回路：从中脑（大脑中部深处）到前方的奖励区（大脑模型的局部坐标）
const REWARD = [[0.05, -0.42, -0.15], [-0.18, -0.32, -0.17], [-0.42, -0.18, -0.2], [-0.66, -0.02, -0.22], [-0.9, 0.16, -0.22]];
// ------------------------------------------------------------ 彩票：发光的粒子卡片（亮边、锯齿边、一排号码圆圈）
function makeTicket() {
  const pb = new PB(), R = n => hash(n * 2.71 + 0.33), W2 = 0.62, H2 = 0.36;
  for (let i = 0; i < 16000; i++) { const x = (R(i * 3) - 0.5) * 2 * W2, y = (R(i * 3 + 1) - 0.5) * 2 * H2, edge = Math.abs(x) > W2 - 0.03 || Math.abs(y) > H2 - 0.03;
    const circ = [0, 1, 2, 3, 4, 5].some(c => { const cx = -0.42 + c * 0.17, cy = -0.06; const d = Math.hypot(x - cx, y - cy); return Math.abs(d - 0.06) < 0.012; });
    const band = Math.abs(y - 0.2) < 0.04 && Math.abs(x) < 0.45;
    pb.add([x, y, (R(i * 3 + 2) - 0.5) * 0.02], [0, 0, 1], R(i * 5), [0, 0, 0], [R(i * 7), 0, 0, 1], [edge ? 1.6 : circ ? 1.7 : band ? 1.3 : 0.45, 30]); }
  const m = propMat('#FFE7A3', { bright: 1.0, size: 0.012 }); m.uniforms.uAsm.value = 1; m.uniforms.uFacing.value = 0;
  const g = new THREE.Group(); K.scene.add(g); const p = new THREE.Points(pb.geometry(THREE), m); p.frustumCulled = false; p.renderOrder = 33; g.add(p); K.mats.push(m); g.visible = false;
  const gl = new THREE.Mesh(new THREE.PlaneGeometry(2.4, 2.4), H.glowPlane(0)); gl.material.uniforms.uCol.value.set(CY); gl.material.blending = THREE.AdditiveBlending; gl.material.transparent = true; gl.material.depthWrite = false; gl.renderOrder = 31; gl.position.z = -0.3; g.add(gl);
  return { g, m, glow: gl };
}
// ------------------------------------------------------------ 天平：底座 + 立柱 + 横梁（可以倾斜）+ 两个吊盘（左：一小堆金币；右：暗色、裂开的金币堆）
function makeScale() {
  const R = n => hash(n * 1.91 + 0.57);
  const mk = (hex, bright, size) => { const m = propMat(hex, { bright: 1, size }); m.uniforms.uAsm.value = 1; m.uniforms.uFacing.value = 0; m.baseB = bright; K.mats.push(m); return m; };
  const cloud = (fill, m, parent, order = 30) => { const pb = new PB(); fill(pb); const p = new THREE.Points(pb.geometry(THREE), m); p.frustumCulled = false; p.renderOrder = order; parent.add(p); return p; };
  const add = (pb, p, br, n) => pb.add(p, [0, 0, 1], R(n), [0, 0, 0], [R(n + 1), 0, 0, 1], [br, 30]);
  const g = new THREE.Group(); K.scene.add(g); g.visible = false;
  const mG = mk('#FFC23D', 2.9, 0.016), mDark = mk('#8A6624', 2.2, 0.015), mPile = mk('#FFD86A', 2.6, 0.014);
  cloud(pb => { let n = 0;
    for (let i = 0; i < 16000; i++) { const a = R(n++) * TAU, r = 0.1 * Math.sqrt(R(n++)); add(pb, [Math.cos(a) * r, -1.35 + 2.55 * R(n++), Math.sin(a) * r], r > 0.085 ? 1.4 : 0.7, n++); }   // 立柱
    for (let i = 0; i < 7000; i++) { const a = R(n++) * TAU, r = 0.55 * Math.sqrt(R(n++)); add(pb, [Math.cos(a) * r, -1.35 + 0.05 * R(n++), Math.sin(a) * r * 0.6], r > 0.5 ? 1.5 : 0.6, n++); }   // 底座
    for (let i = 0; i < 1500; i++) { const a = R(n++) * TAU, b = R(n++) * TAU; add(pb, [0.09 * Math.cos(a) * Math.cos(b), 1.22 + 0.09 * Math.sin(b), 0.09 * Math.sin(a) * Math.cos(b)], 1.6, n++); }   // 顶上的轴
  }, mG, g);
  const pivot = new THREE.Group(); pivot.position.y = 1.2; g.add(pivot);
  const beam = new THREE.Group(); pivot.add(beam);
  cloud(pb => { let n = 0; for (let i = 0; i < 18000; i++) { const x = (R(n++) - 0.5) * 3.1, y = (R(n++) - 0.5) * 0.14, z = (R(n++) - 0.5) * 0.12, edge = Math.abs(y) > 0.06 || Math.abs(z) > 0.05; add(pb, [x, y, z], edge ? 1.3 : 0.7, n++); } }, mG, beam);
  const pans = [0, 1].map(side => {
    const pg = new THREE.Group(); pivot.add(pg);
    cloud(pb => { let n = 100 + side * 99;
      for (let s = 0; s < 3; s++) { const a = s / 3 * TAU + 0.5, ex = Math.cos(a) * 0.42, ez = Math.sin(a) * 0.25; for (let i = 0; i < 900; i++) { const u = R(n++); add(pb, [ex * u, -0.95 * u, ez * u], 1.1, n++); } }   // 三根吊绳
      for (let i = 0; i < 10000; i++) { const a = R(n++) * TAU, r = 0.46 * Math.sqrt(R(n++)); add(pb, [Math.cos(a) * r, -0.95 - 0.06 * (r / 0.46) ** 2 * -1, Math.sin(a) * r * 0.55], r > 0.42 ? 1.5 : 0.65, n++); }   // 盘子
    }, mG, pg);
    cloud(pb => { let n = 900 + side * 77;
      for (let c = 0; c < (side ? 22 : 8); c++) { const cx = (R(n++) - 0.5) * (side ? 0.62 : 0.45), cy = -0.86 + (side ? 0.06 + 0.36 * R(n++) * (1 - Math.abs(cx)) : 0.05 + 0.14 * R(n++)), cz = (R(n++) - 0.5) * 0.25;
        for (let i = 0; i < 520; i++) { const a = R(n++) * TAU, r = 0.11 * Math.sqrt(R(n++)); if (Math.max(Math.abs(Math.cos(a) * r), Math.abs(Math.sin(a) * r)) < 0.028) continue;
          const crack = side && Math.abs(Math.sin(a * 3 + c) * r - 0.01) < 0.006;                       // 右盘：裂开的纹
          add(pb, [cx + Math.cos(a) * r, cy + 0.015 * Math.sin(a), cz + Math.sin(a) * r * 0.5], r > 0.075 ? 1.4 : crack ? 0.2 : 0.75, n++); } }
    }, side ? mDark : mPile, pg, 31);
    return pg;
  });
  return { g, beam, pans, mats: [mG, mDark, mPile] };
}
// ------------------------------------------------------------ 暴食的道具：一圈食物（鸡腿、包子、奶茶、汉堡、薯条、一碗面，第 7 个是一整只大鸡腿）、大胡子、餐巾
// 每个食物 aExtra.y = 编号（0–6），aExtra.x = 0–1（用于反光）
function feastPB() {
  const pb = new PB(); let n = 0; const R = () => hash(n++ * 0.7131 + 0.37);
  const add = (id, p, br) => pb.add([p[0], p[1], p[2] + (R() - 0.5) * 0.014], [0, 0, 1], R(), [0, 0, 0], [R(), id, 0, 1], [br, 30]);
  const fill = (id, inside, box, cnt, br, edge) => { let m = 0, g = 0; while (m < cnt && g++ < cnt * 30) { const x = box[0] + R() * (box[2] - box[0]), y = box[1] + R() * (box[3] - box[1]); if (!inside(x, y)) continue; add(id, [x, y, 0], edge && edge(x, y) ? 1.5 : br); m++; } };
  const drum = (id, s) => {                                                  // 鸡腿：水滴形的肉 + 骨头 + 骨头末端两个圆头
    const meat = (x, y) => { const u = (x - 0.04) / 0.12, v = (y - 0.03) / (0.085 * (1 - 0.35 * Math.max(0, -u))); return u * u + v * v < 1; };
    const sc = (x, y) => [x * s, y * s];
    fill(id, (x, y) => meat(x / s, y / s), [-0.1 * s, -0.07 * s, 0.17 * s, 0.12 * s], 3200, 0.65, (x, y) => !meat(x / s + 0.014, y / s) || !meat(x / s - 0.014, y / s) || !meat(x / s, y / s + 0.014) || !meat(x / s, y / s - 0.014));
    for (let i = 0; i < 700; i++) { const f = R(), w = (R() - 0.5) * 0.028; const [x, y] = sc(-0.07 - f * 0.11 - w * 0.3, -0.01 - f * 0.06 + w); add(id, [x, y, 0], 1.2); }
    for (const o of [[-0.19, -0.055], [-0.175, -0.095]]) for (let i = 0; i < 360; i++) { const a = R() * TAU, r = 0.022 * Math.sqrt(R()); const [x, y] = sc(o[0] + Math.cos(a) * r, o[1] + Math.sin(a) * r); add(id, [x, y, 0], 1.4); }
  };
  drum(0, 1);
  { const bun = (x, y) => y > -0.06 && (x / 0.14) ** 2 + ((y + 0.06) / 0.13) ** 2 < 1;   // 包子：圆顶 + 顶上的褶
    fill(1, bun, [-0.14, -0.06, 0.14, 0.07], 3000, 0.55, (x, y) => !bun(x, y + 0.013) || !bun(x + 0.013, y) || !bun(x - 0.013, y) || y < -0.052);
    for (let f = 0; f < 10; f++) for (let i = 0; i < 160; i++) { const u = R(), a = (f / 9 - 0.5) * 2.4; add(1, [Math.sin(a) * 0.11 * u, 0.068 - u * 0.08 * Math.cos(a * 0.6), 0.004], 1.4); } }
  { const cup = (x, y) => y > -0.13 && y < 0.08 && Math.abs(x) < 0.075 + 0.03 * (y + 0.13) / 0.21;   // 奶茶：杯子 + 杯盖 + 吸管 + 珍珠
    fill(2, cup, [-0.11, -0.13, 0.11, 0.08], 2600, 0.55, (x, y) => !cup(x + 0.012, y) || !cup(x - 0.012, y) || y < -0.12);
    for (let i = 0; i < 500; i++) add(2, [(R() - 0.5) * 0.24, 0.085 + (R() - 0.5) * 0.02, 0.003], 1.4);                 // 杯盖
    for (let i = 0; i < 600; i++) { const u = R(); add(2, [0.02 + u * 0.05 + (R() - 0.5) * 0.012, 0.09 + u * 0.13, 0.004], 1.5); }   // 吸管
    for (let b = 0; b < 9; b++) { const cx = -0.06 + (b % 5) * 0.03, cy = -0.11 + Math.floor(b / 5) * 0.026; for (let i = 0; i < 60; i++) { const a = R() * TAU, r = 0.011 * Math.sqrt(R()); add(2, [cx + Math.cos(a) * r, cy + Math.sin(a) * r, 0.006], 1.3); } } }
  { const top = (x, y) => y > 0.02 && (x / 0.15) ** 2 + ((y - 0.02) / 0.09) ** 2 < 1;   // 汉堡：上面包 + 芝麻 + 生菜 + 肉饼 + 芝士 + 下面包
    fill(3, top, [-0.15, 0.02, 0.15, 0.11], 1900, 0.6, (x, y) => !top(x, y + 0.012) || !top(x + 0.012, y) || !top(x - 0.012, y));
    for (let d = 0; d < 9; d++) { const sx = (hash(d * 3.3) - 0.5) * 0.2, sy = 0.05 + hash(d * 7.7) * 0.04; for (let i = 0; i < 45; i++) add(3, [sx + (R() - 0.5) * 0.012, sy + (R() - 0.5) * 0.006, 0.004], 1.6); }
    for (let i = 0; i < 600; i++) { const x = (R() - 0.5) * 0.33; add(3, [x, 0.012 + 0.012 * Math.sin(x * 60), 0], 1.25); }
    for (let i = 0; i < 1000; i++) add(3, [(R() - 0.5) * 0.31, -0.012 - R() * 0.035, 0], R() < 0.3 ? 1.1 : 0.7);
    for (let i = 0; i < 360; i++) { const x = (R() - 0.5) * 0.3; add(3, [x, -0.05 - (Math.abs(Math.sin(x * 25)) < 0.3 ? 0.02 * R() : 0), 0], 1.25); }
    const bot = (x, y) => y < -0.055 && y > -0.1 && Math.abs(x) < 0.15 - 0.02 * ((-0.055 - y) / 0.045); fill(3, bot, [-0.15, -0.1, 0.15, -0.055], 800, 0.6, (x, y) => y < -0.092); }
  { const box = (x, y) => y > -0.13 && y < 0.02 && Math.abs(x) < 0.075 + 0.035 * (y + 0.13) / 0.15;   // 薯条：一盒（盒子 + 盒上的弧线 + 一根根竖着的薯条）
    fill(4, box, [-0.12, -0.13, 0.12, 0.02], 2000, 0.6, (x, y) => !box(x + 0.012, y) || !box(x - 0.012, y) || y < -0.12);
    for (let i = 0; i < 300; i++) { const x = (R() - 0.5) * 0.18; add(4, [x, -0.03 + 0.03 * Math.cos(x * 16), 0.004], 1.5); }
    for (let f = 0; f < 9; f++) { const fx = -0.085 + f * 0.021, h = 0.06 + 0.06 * hash(f * 5.1), tilt = (hash(f * 2.3) - 0.5) * 0.25; for (let i = 0; i < 150; i++) { const u = R(); add(4, [fx + tilt * u * h + (R() - 0.5) * 0.012, 0.0 + u * h, -0.002], u > 0.92 ? 1.5 : 0.9); } } }
  { const bowl = (x, y) => y < 0 && y > -0.11 && Math.abs(x) < 0.16 - 0.05 * (-y / 0.11);   // 一碗面：碗 + 口沿 + 弯弯的面条 + 三缕热气
    fill(5, bowl, [-0.16, -0.11, 0.16, 0], 2400, 0.8, (x, y) => y > -0.01 || !bowl(x + 0.013, y) || !bowl(x - 0.013, y) || y < -0.1);
    for (let i = 0; i < 600; i++) add(5, [(R() - 0.5) * 0.34, (R() - 0.5) * 0.008, 0.005], 1.5);
    for (let l = 0; l < 6; l++) for (let i = 0; i < 160; i++) { const x = (R() - 0.5) * 0.26; add(5, [x, 0.012 + 0.008 * l + 0.012 * Math.sin(x * 50 + l * 1.7), 0.004], 1.2); }
    for (let s2 = -1; s2 <= 1; s2++) for (let i = 0; i < 260; i++) { const u = R(); add(5, [s2 * 0.05 + 0.018 * Math.sin(u * 9 + s2), 0.09 + u * 0.14, 0], 0.85 * (1 - u)); } }
  drum(6, 1.9);                                                              // 第 7 口：一整只大鸡腿
  return pb;
}
function beardPB() {                                                         // 浓密的大胡子：从下巴垂下的一缕缕粒子发丝
  const pb = new PB(); let n = 0; const R = () => hash(n++ * 0.531 + 0.77);
  for (let s = 0; s < 150; s++) {
    const a = (R() - 0.5) * 2.3, x0 = Math.sin(a) * 0.34, y0 = -0.24 - 0.18 * Math.cos(a) ** 2, z0 = 0.2 + 0.22 * Math.cos(a), len = 0.32 + 0.3 * R() * Math.cos(a * 0.6), curl = (R() - 0.5) * 0.12;
    for (let i = 0; i < 110; i++) { const u = R(); pb.add([x0 * (1 - 0.35 * u) + curl * Math.sin(u * 5), y0 - len * u, z0 + 0.06 * u], [0, 0, 1], R(), [0, 0, 0], [u, 0, 0, 1], [u > 0.9 ? 1.3 : 0.75 + 0.3 * R(), 30]); }
  }
  for (let i = 0; i < 5000; i++) { const a = (R() - 0.5) * 2.6, r = 0.36 + 0.03 * R(); pb.add([Math.sin(a) * r, -0.18 - 0.2 * Math.cos(a) ** 2 + (R() - 0.5) * 0.06, 0.16 + 0.26 * Math.cos(a)], [0, 0, 1], R(), [0, 0, 0], [0, 0, 0, 1], [0.7, 30]); }   // 腮边连着的一圈
  return pb;
}
function napkinPB() {                                                        // 餐巾：塞在下巴下面的三角形布，有几道褶
  const pb = new PB(); let n = 0; const R = () => hash(n++ * 0.917 + 0.13);
  for (let i = 0; i < 14000; i++) {
    const v = R(), w = (R() - 0.5) * 2 * (1 - v), x = w * 0.42, y = -0.72 - v * 0.72, fold = Math.sin(w * 9 + v * 2) * 0.03, edge = Math.abs(Math.abs(w) - (1 - v)) < 0.03 || v < 0.03;
    const crease = Math.abs(Math.sin(w * 9 + v * 2)) > 0.96;
    pb.add([x, y, 0.42 + fold - 0.05 * v], [0, 0, 1], R(), [0, 0, 0], [v, 0, 0, 1], [edge ? 1.4 : crease ? 1.15 : 0.6, 30]);
  }
  return pb;
}
// 吃东西的时间表：每次 {t: 吃进嘴里的那一拍, s: 食物编号}
function eatAt(t, s) {
  let e = 0, r = 1, last = null; for (const ev of EV.eats) if (ev.s === s && t >= ev.t - 0.3) last = ev;
  if (last) { if (t < last.t) e = clamp((t - (last.t - 0.3)) / 0.3); else { const d = t - last.t; if (s === 6) { e = 1; r = 0; } else if (d < 0.12) { e = 1; r = 0; } else { e = 0; r = clamp((d - 0.12) / 0.4); } } }
  return [e, r];
}
// ------------------------------------------------------------ “那件事”：青白色的小方块，表面有细纹理
function makeCube() {
  const pb = new PB(), R = n => hash(n * 1.37 + 0.41);
  for (let i = 0; i < 16000; i++) pb.add([R(i * 9) - 0.5, R(i * 9 + 1) - 0.5, R(i * 9 + 2) - 0.5], [0, 0, 1], R(i * 9 + 3), [0, 0, 0], [R(i * 9 + 4), 0, 0, 1], [0.45, 30]);   // 实心：里面也填满
  for (let i = 0; i < 30000; i++) {
    const f = i % 6, a = R(i * 3) - 0.5, b = R(i * 3 + 1) - 0.5, ax = f >> 1, sg = f & 1 ? 0.5 : -0.5;
    const p = ax === 0 ? [sg, a, b] : ax === 1 ? [a, sg, b] : [a, b, sg];
    const edge = Math.max(Math.abs(a), Math.abs(b)) > 0.47, line = Math.abs(Math.sin(a * 40)) < 0.12 || Math.abs(Math.sin(b * 40)) < 0.12;
    pb.add(p, [0, 0, 1], R(i * 5), [0, 0, 0], [R(i * 7), f, 0, 1], [edge ? 1.6 : line ? 0.95 : 0.5, 30]);
  }
  const m = propMat('#BFF4FA', { bright: 1.0, size: 0.014 }); m.uniforms.uAsm.value = 1; m.uniforms.uFacing.value = 0;   // 每一面都亮（实心发光）
  const g = new THREE.Group(); K.scene.add(g); const p = new THREE.Points(pb.geometry(THREE), m); p.frustumCulled = false; p.renderOrder = 32; g.add(p); K.mats.push(m); g.visible = false;
  const gl = new THREE.Mesh(new THREE.PlaneGeometry(3.4, 3.4), H.glowPlane(0)); gl.material.uniforms.uCol.value.set(CY); gl.material.blending = THREE.AdditiveBlending; gl.material.transparent = true; gl.material.depthWrite = false;   // 周围一圈柔光（叠加，不挡背景） gl.renderOrder = 31; gl.position.z = -0.6; g.add(gl);
  return { g, m, glow: gl };
}

// ------------------------------------------------------------ 粒子大脑（侧面，沿用嫉妒/愤怒的大脑模型），青色
function makeBrain() {
  const g = new THREE.Group(); g.position.set(-1.4, 0.05, 0); g.scale.setScalar(1.15); g.rotation.y = Math.PI; K.scene.add(g); g.visible = false;
  const m = brainMaterial(CY); m.uniforms.uSeeX.value = 99; m.uniforms.uBright.value = 6.0; m.uniforms.uRegR.value = 0.02; m.uniforms.uSize.value = 0.019; m.uniforms.uMaxPx.value = 10; m.uniforms.uHot.value.set('#CFF7FC');
  pts(buildBrainSide(511, 1).geometry(THREE), m, g, 20);
  const glowM = new THREE.Mesh(new THREE.PlaneGeometry(5.5, 5.5), H.glowPlane(0.0)); glowM.material.uniforms.uCol.value.set(CY); glowM.material.blending = THREE.AdditiveBlending; glowM.material.transparent = true; glowM.material.depthWrite = false; glowM.position.set(-1.4, 0.05, -1.6); glowM.renderOrder = -15; glowM.visible = false; K.scene.add(glowM);
  return { g, m, glow: glowM };
}
const brainAsm = k => { const u = S.brain.m.uniforms; u.uScatter.value = 2.2 * (1 - k); u.uScatterDist.value = 1.4; u.uAlpha.value = clamp(k * 1.5); S.brain.g.visible = k > 0.001; };
// 电量见底：粒子像沙子一样从大脑底部往下流
function makeSand(n = 5000) {
  const g = new THREE.BufferGeometry(), P = new Float32Array(n * 3), Sd = new Float32Array(n);
  for (let i = 0; i < n; i++) { P[i * 3] = -2.3 + 1.6 * hash(i * 1.7); P[i * 3 + 1] = -0.75 - 0.1 * hash(i * 2.3); P[i * 3 + 2] = (hash(i * 3.1) - 0.5) * 0.6; Sd[i] = hash(i * 4.7); }
  g.setAttribute('position', new THREE.BufferAttribute(P, 3)); g.setAttribute('aSeed', new THREE.BufferAttribute(Sd, 1));
  const m = new THREE.ShaderMaterial({ uniforms: { uT: { value: 0 }, uOn: { value: 0 }, uScale: { value: 1 } }, transparent: true, depthWrite: false, depthTest: false, blending: THREE.AdditiveBlending,
    vertexShader: `attribute float aSeed; uniform float uT, uOn, uScale; varying float vB;
      void main(){ vec3 p = position; float u = fract(uT*0.55 + aSeed*3.17); float started = step(aSeed*1.2, uT);
        p.y -= 2.2*u*u; p.x += 0.08*sin(aSeed*40.0 + u*6.0)*u; p.x = mix(p.x, -1.45 + (p.x + 1.45)*0.35, u);
        vec4 mv = modelViewMatrix*vec4(p, 1.0); gl_Position = projectionMatrix*mv; gl_PointSize = (1.6 + 2.2*aSeed)*uScale;
        vB = uOn*started*(1.0 - u)*(0.4 + 0.6*aSeed); }`,
    fragmentShader: `varying float vB; void main(){ vec2 c = gl_PointCoord - 0.5; float d = length(c); if (d > 0.5) discard; gl_FragColor = vec4(vec3(0.17, 0.62, 0.7)*vB*exp(-d*d*8.0), 1.0); }` });
  const p = new THREE.Points(g, m); p.frustumCulled = false; p.renderOrder = 22; p.visible = false; K.scene.add(p); return p;
}
// 荆棘：从方块表面渗出的暗色尖刺（深青到接近黑色，尖刺向外伸，缓慢蠕动）；uGrow 长度、uLean 往懒惰那边伸、uMist 散成雾
function makeThorns() {
  const N = 72, per = 150, n = N * per;
  const P = new Float32Array(n * 3), D = new Float32Array(n * 3), A = new Float32Array(n * 4);
  for (let s = 0; s < N; s++) {
    const f = s % 6, a = (hash(s * 1.3) - 0.5) * 0.9, b = (hash(s * 2.1) - 0.5) * 0.9, ax = f >> 1, sg = f & 1 ? 1 : -1;
    const base = ax === 0 ? [0.45 * sg, a, b] : ax === 1 ? [a, 0.45 * sg, b] : [a, b, 0.45 * sg];
    const nrm = ax === 0 ? [sg, 0, 0] : ax === 1 ? [0, sg, 0] : [0, 0, sg];
    let d = nrm.map((v, j) => v + (hash(s * 3.7 + j) - 0.5) * 0.9); const l = Math.hypot(...d); d = d.map(v => v / l);
    const len = 0.45 + 0.75 * hash(s * 5.3), sd = hash(s * 6.1);
    for (let i = 0; i < per; i++) {
      const k = s * per + i, u = Math.pow(hash(k * 0.913), 0.8), ang = hash(k * 1.77) * TAU, r = 0.05 * Math.pow(1 - u, 1.5) * Math.sqrt(hash(k * 2.31));
      P.set([base[0] + Math.cos(ang) * r, base[1] + Math.sin(ang) * r, base[2] + Math.cos(ang + 1) * r * 0.7], k * 3); D.set(d, k * 3); A.set([u, sd, len, hash(k * 3.9)], k * 4);
    }
  }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(P, 3)); g.setAttribute('aDir', new THREE.BufferAttribute(D, 3)); g.setAttribute('aInfo', new THREE.BufferAttribute(A, 4));
  const m = new THREE.ShaderMaterial({ uniforms: { uGrow: { value: 0 }, uLean: { value: 0 }, uFade: { value: 0 }, uMist: { value: 0 }, uT: { value: 0 }, uStill: { value: 0 }, uScale: { value: 1 } },
    transparent: true, depthWrite: false, depthTest: false, blending: THREE.AdditiveBlending,
    vertexShader: `attribute vec3 aDir; attribute vec4 aInfo; uniform float uGrow, uLean, uFade, uMist, uT, uStill, uScale; varying vec3 vC;
      void main(){ float u = aInfo.x, sd = aInfo.y, len = aInfo.z, rr = aInfo.w;
        vec3 d = normalize(aDir + vec3(-uLean*(0.6 + 0.8*sd), -0.1*uLean, 0.15*uLean));
        vec3 side = normalize(cross(d, vec3(0.0, 0.0, 1.0)) + vec3(1e-4));
        float sq = (1.0 - uStill)*0.09*u*sin(u*7.0 - uT*3.6 + sd*17.0) + (1.0 - uStill)*0.04*u*sin(uT*1.7 + sd*31.0);   /* 缓慢蠕动 */
        vec3 p = position + d*len*uGrow*u + side*sq;
        p += normalize(vec3(sin(rr*91.0), cos(rr*53.0), sin(rr*37.0)))*uMist*(0.6 + 1.6*rr);   /* 散成雾 */
        vec4 mv = modelViewMatrix*vec4(p, 1.0); gl_Position = projectionMatrix*mv; gl_PointSize = (1.8 + 2.2*(1.0 - u))*uScale*(1.0 + 1.5*uMist);
        float b = uFade*(0.55 + 0.45*(1.0 - u))*(1.0 - 0.85*uMist)*step(u, 0.999);
        vC = mix(vec3(0.13, 0.46, 0.52), vec3(0.04, 0.15, 0.17), u)*b; }`,
    fragmentShader: `varying vec3 vC; void main(){ vec2 c = gl_PointCoord - 0.5; float d = length(c); if (d > 0.5) discard; gl_FragColor = vec4(vC*exp(-d*d*7.0), 1.0); }` });
  const p = new THREE.Points(g, m); p.frustumCulled = false; p.renderOrder = 31; p.visible = false; K.scene.add(p); return p;
}
function setCubeCol(hex) { S.cube.m.uniforms.uColA.value.set(tone(hex, 0.6)); S.cube.m.uniforms.uColB.value.set(hex); }
// 结尾直视的眼睛：虹膜圆环 + 瞳孔（青色）
function makeIris(head) {
  return [FACE.eyeR, FACE.eyeL].map(e => {
    const pb = new PB();
    for (let i = 0; i < 3200; i++) { const a = hash(i * 1.7) * TAU, r = 0.04 * Math.sqrt(hash(i * 2.9)), ring = r > 0.028, pupil = r < 0.012; if (pupil) continue; pb.add([Math.cos(a) * r, Math.sin(a) * r, 0], [0, 0, 0], hash(i), [0, 0, 0], [hash(i * 5), 0, 0, 1], [ring ? 2.2 : 0.9, 30]); }
    for (let i = 0; i < 500; i++) { const a = hash(i * 7.1) * TAU; pb.add([Math.cos(a) * 0.042, Math.sin(a) * 0.042, 0], [0, 0, 0], hash(i * 3), [0, 0, 0], [0, 0, 0, 1], [2.6, 30]); }
    const m = propMat('#FFD86A', { bright: 1.6, size: 0.006 }); m.uniforms.uAsm.value = 1;
    const o = new THREE.Points(pb.geometry(THREE), m); o.frustumCulled = false; o.renderOrder = 48; o.position.set(e[0], e[1], e[2] + 0.035); head.add(o); K.mats.push(m); o.visible = false; return o;
  });
}

// ------------------------------------------------------------ 律动：每两拍主体放大 4%（drop 之后 6%），0.3 秒回弹
function pulse(t) {
  let v = 0;
  const list = B;   // 暴食：每一拍放大 5% 再回弹
  const j = lastIdx(list, t);
  for (let k = Math.max(0, j - 1); k <= j; k++) { if (k < 0) continue; const d = t - list[k]; if (d < 0 || d > 0.4) continue; v += Math.exp(-d * 13) * Math.cos(d * 26); }
  return 0.833 * v;   // 每两拍放大 5% 再回弹
}
const LINEUP = { pos: [0, 0.25, 9.6], target: [0, -0.05, 0], fov: 35 };
const lineupCam = t => orbit({ ...LINEUP, pos: [0, LINEUP.pos[1] + 0.06 * Math.sin(t * qw(1.7)), LINEUP.pos[2] - 0.18 * Math.sin(t * qw(1.1))] }, 0.03 * Math.sin(t * qw(1.9)), 0);
const camAt = (x, y, d, ty = y) => ({ pos: [x, y + 0.08, d], target: [x, ty, 0], fov: 35 });
const HW = d => Math.tan(17.5 * Math.PI / 180) * d * 16 / 9;   // 距离 d 处画面的半宽（世界单位）
// 镜头永远在动：每个场景持续缓慢推近（每秒 1%）+ 轻微环绕（±3 度）
const live = (c, t, t0, cx) => { const k = 1 - 0.015 * Math.max(0, t - t0); const p = lerp3(c.target, c.pos, k); return orbit({ ...c, pos: p }, 0.07 * Math.sin(t * qw(4.4)), cx); };   // 每秒推近 1.5%，环绕 ±4 度
function heroLineup(t, F, AUD0, pop) {
  const AUD = { ...AUD0, mid: 0, low: 0 };
  S.chars.forEach(O => { O.g.visible = true; setState(O, { lite: true, gray: false, eyes: 1, halo: 0.85, props: 1, scatter: 0, aud: AUD, pop: pop ? pop(O.i) : 0 }); animate(O, t, 9, -9, true, AUD); });
  F.names = 1; F.series = 1; F.aired = 1; F.auraCol = '#8FB8C8'; F.auraK = 0.45;
  return lineupCam(t);
}
function setCol(C, hex) { C.mats.forEach(m => m.uniforms.uSin.value.set(hex)); C.aura.material.uniforms.uCol.value.set(hex); }

export const subsList = () => TXT.map(s => ({ text: plain(s.text), t0: +s.t0.toFixed(3), t1: +s.t1.toFixed(3), minD: +s.minD.toFixed(3) }));
export function events() {
  const big = [['推进特写（灰色）', EV.zoom], ['变身', EV.change], ['第七口（“7”砸下来）', EV.seven], ['拉远、信号点', EV.wide], ['结尾卡', EV.card], ['结尾卡第二行', EV.ask], ['信号点到头顶“饱”', EV.full], ['结尾阵容', EV.end]];
  const small = [['转盘退回一格落在暴食（抽中）', EV.pick], ['标题飞到左上角、吸气', EV.fly], ...EV.eats.filter(e => e.t !== EV.seven).map((e, i) => [`吃第 ${i + 1} 个`, e.t]), ['拍肚子', EV.pat], ...EV.words.map((b, i) => [`四字词 ${i + 1}`, b]), ['色欲亮起', EV.next]];
  return [...big.map(([name, t]) => ({ name, t, kind: 'big' })), ...small.map(([name, t]) => ({ name, t, kind: 'small' }))];
}
export const charsList = () => S ? [...(S.chars ?? []), ...(S.extra ?? [])] : [];

// ------------------------------------------------------------ 每帧
export function frame(t) {
  const F = { shake: 0, shock: null, bloom: 1.0, auraCol: CY, auraK: 0.5, subs: [], hooks: [], names: 0, series: 0, aired: 0, bursts: [], ca: 0, labels: [], scan: null, cols: null, corner: 0, sparkCol: HI };
  const endK = 1 - clamp((t - (TL - 0.9)) / 0.6);
  const kick = pulse(t) * endK, low = env(t, 'low'), mid = env(t, 'mid'), high = env(t, 'high');
  const bb = beatInBar(t);
  const off = bb.k === 0 ? Math.exp(-bb.d / 0.1) * endK : 0;                // 每小节第一拍：镜头推一下 + 4px 震动
  F.shake = off * 0.67;
  const AUD = { kick, low, mid, high, t, endK };
  S.chars.forEach(O => { O.g.position.set(slotX(O.i), 0, 0); O.g.rotation.set(0, 0, 0); O.g.visible = false; O.g.scale.setScalar(1); animate(O, t, -9, -9, false, AUD); });
  S.extra.forEach(O => { O.g.visible = false; });
  S.zs.forEach(z => { z.g.visible = false; }); S.cube.g.visible = false; S.box.g.visible = false; S.ticket.g.visible = false; S.scale.g.visible = false;
  S.brain.g.visible = false; S.brain.glow.visible = false; S.sand.visible = false; S.thorns.visible = false; S.irises.forEach(o => { o.visible = false; });
  const W = S.chars[SL];
  let cam, subj = null, full = false;
  F.corner = clamp((t - EV.fly - 0.4) / 0.1) * (1 - clamp((t - EV.end) / 0.25));
  F.title = t >= EV.zoom - 0.05 && t < EV.fly + 0.45 ? { a: clamp((t - EV.zoom) / 0.12), fly: outExpo(clamp((t - EV.fly) / 0.4)), pop: t - EV.zoom } : null;
  const close = camAt(-0.33 * HW(3.7), 0.2, 3.7);

  if (t < EV.zoom) {
    // ---- 第 0 帧：七个彩色角色排成一排；转盘：一张脸一张脸地跳，先快后慢，经过暴食，假停在色欲半拍，下一拍退回一格落在暴食（停留两拍）
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
      const prev = EV.spots[Math.max(0, j - 1)], glide = cur.t === EV.pick ? outExpo(clamp(dt / 0.15)) : 1;
      F.spot = { x: lerp(slotX(prev.i), slotX(cur.i), glide), a: cur.t === EV.pick ? 1 : on };
      F.tick = { c: project([slotX(cur.i), -1.5, 0.2]), k: clamp(dt / 0.28), w: project([slotX(cur.i) + 0.5, -1.5, 0.2])[0] - project([slotX(cur.i), -1.5, 0.2])[0] };
    }
  } else if (t < EV.change) {
    // ---- 第 2 小节：镜头猛地推到暴食的脸（灰色、闭眼），左侧大标题；最后半拍吸气（粒子向内收、画面暗一点、镜头推近），标题飞到左上角
    const dt = t - EV.zoom, k = outExpo(clamp(dt / 0.25)), inh = sine(clamp((t - EV.fly) / (EV.change - EV.fly)));
    S.chars.forEach(O => { if (O === W) return; O.g.visible = k < 0.999; setState(O, { lite: true, gray: false, eyes: 1, halo: 0.85 * (1 - k), props: 1, scatter: 0, aud: AUD }); animate(O, t, 9, -9, true, AUD); O.g.position.x = slotX(O.i) + Math.sign(O.i - SL) * 9 * k; });
    W.g.visible = true; W.g.position.x = lerp(slotX(SL), 0, k);
    setState(W, { lite: dt < 0.04, gray: dt >= 0.04, eyes: 0, halo: 0, props: 0, scatter: 0, aud: AUD, inhale: inh });
    animate(W, t, 9, -9, true, AUD); W.rig.scale.multiplyScalar(1 - 0.05 * inh);
    cam = camLerp(lineupCam(t), live({ ...close, pos: lerp3(close.target, close.pos, 1 - 0.12 * inh) }, t, EV.zoom, 0), k);
    F.names = 1 - clamp(dt / 0.015); F.aired = F.names; F.series = 1 - clamp(dt / 0.08);
    if (dt < 0.4) F.shock = { c: project([W.g.position.x, HEAD_C[1], 0.3]), r: 0.5 * outExpo(dt / 0.4), a: 0.4 * (1 - dt / 0.4), col: HI };
    F.dark = 0.25 * inh;
    subj = [W.g.position.x, HEAD_C[1], 0];
  } else if (t < EV.wide) {
    // ---- 第 3–5 小节：变身（橙色闪光 + 冲击波，大胡子、餐巾、食物圈从粒子中汇聚，身后展开光环），然后每拍吃一个，第 5 小节第七口
    const dt = t - EV.change; full = true;
    W.g.visible = true; W.g.position.set(0, 0, 0);
    setState(W, { lite: false, gray: false, eyes: outExpo(clamp(dt / 0.15)), halo: outExpo(clamp(dt / 0.35)), props: clamp(dt / 0.4), scatter: 0, aud: AUD, pop: 0.5 * Math.exp(-dt / 0.25) });
    animate(W, t, 9, -9, true, AUD);
    let c = live(close, t, EV.change, 0);
    const su = t - EV.seven; if (su >= 0 && su < 0.6) { const pz = Math.sin(Math.PI * clamp(su / 0.6)); c = { ...c, pos: lerp3(c.target, c.pos, 1 - 0.16 * pz) }; }   // “7”：镜头快速推到脸再弹回
    cam = c;
    if (dt < 0.5) F.shock = { c: project([0, HEAD_C[1], 0.3]), r: 0.08 + 0.5 * outExpo(dt / 0.5), a: 0.6 * (1 - dt / 0.5), col: HI };
    if (dt < 0.25) F.flash = { c: project([0, HEAD_C[1], 0.3]), a: 0.28 * Math.exp(-dt / 0.12), r: 520 };
    if (dt < 0.15) F.shake = Math.max(F.shake, 1 - dt / 0.15);
    F.bursts.push({ t0: EV.change, pos: [0, HEAD_C[1], 0.4], n: 120, speed: 1.6, life: 0.7, grav: -0.2, seed: 5, bright: 1.6 });
    // 计数：1–6，第七口一个巨大的“7”砸下来
    const n = EV.eats.filter(e => e.t <= t + 1e-4 && e.t < EV.seven + 0.01).length;
    F.count = { n, pop: n > 0 ? t - EV.eats[n - 1].t : 9, big: n >= 7 };
    if (su >= 0 && su < 0.5) { F.shock2 = { c: [1812, 260], r: 0.04 + 0.2 * outExpo(su / 0.5), a: 0.75 * (1 - su / 0.5) }; if (su < 0.18) F.shake = Math.max(F.shake, 1.2 * (1 - su / 0.18)); }
    // 拍肚子 + 餐巾上掉下几粒发光的碎屑
    const pu = t - EV.pat; if (pu >= 0 && pu < 0.5) W.rig.scale.y *= 1 + 0.05 * Math.sin(Math.PI * pu / 0.25) * Math.exp(-pu / 0.3);
    F.bursts.push({ t0: EV.pat, pos: [0.1, -1.1, 0.5], n: 14, speed: 0.25, life: 0.9, grav: 0.9, seed: 31, bright: 1.6 });
    subj = [0, HEAD_C[1], 0];
  } else if (t < EV.card) {
    // ---- 第 6 小节：镜头拉远，暴食在左侧，嘴一刻不停地吃；胸口的“吃饱了”信号点像加载条一样慢慢往上爬，旁边“约20分钟”的计时圆环一格一格地走
    const dt = t - EV.wide, k = inOut(clamp(dt / 0.4)), D = 7.4, cx = 0.333 * HW(D); full = true;
    cam = camLerp(live(close, t, EV.change, 0), live(camAt(cx, -0.3, D), t, EV.wide, cx), k);
    W.g.visible = true; W.g.position.set(0, 0, 0);
    setState(W, { lite: false, gray: false, eyes: 1, halo: 1, props: 1, scatter: 0, aud: AUD }); animate(W, t, 9, -9, true, AUD); W.mats.forEach(m => { m.uniforms.uDim.value *= 0.86; });   // 拉远时脸的亮度不冲高
    F.signal = { p: sig(t), a: clamp((dt - 0.4) / 0.25), x: project([0.72, 0, 0.5])[0], hx: 0 };
    F.timer = { c: [cx * 0 + 1450, 470], n: EV.ticks.filter(b => t >= b).length, a: clamp((dt - 0.15) / 0.3) };
    subj = [0, HEAD_C[1], 0];
  } else if (t < EV.end) {
    // ---- 第 7–9 小节：结尾卡。左边“暴食”大字 + “出厂设置 · 06 / 07”；右边暴食（约 65% 高）满足地眯着眼，身后更大的光环；信号点终于爬到头顶，冒出“饱”
    const dt = t - EV.card, k = inOut(clamp(dt / 0.35)), D = 6.8, wx = 1.45; full = true;
    cam = camLerp(live(camAt(0.333 * HW(7.4), -0.3, 7.4), t, EV.wide, 0.333 * HW(7.4)), live(camAt(0, -0.25, D, -0.3), t, EV.card, 0), k);
    W.g.visible = true; W.g.position.set(lerp(0, wx, k), 0, 0);
    setState(W, { lite: false, gray: false, eyes: 0.8, halo: 1, props: 1, scatter: 0, aud: AUD, calm: 1 }); animate(W, t, 9, -9, true, AUD);
    W.halo.scale.multiplyScalar(1.35);
    W.eyes.forEach(m => { m.scale.y = 0.45; });                               // 满足地眯着眼
    if (dt < 0.35) F.flash = { c: [960, 540], a: 0.3 * Math.sin(Math.PI * dt / 0.35), r: 900 };   // 柔和的闪光转场
    const hp = project([wx + 0.72, HEAD_C[1] + 0.95, 0.3]);
    F.signal = { p: sig(t), a: 1 - clamp((t - EV.full - 0.8) / 0.4), x: project([wx + 0.72, 0, 0.5])[0], hx: wx };
    if (t >= EV.full) { const u = t - EV.full; F.bao = { x: hp[0], y: hp[1] - 30 - 30 * outExpo(clamp(u / 0.4)), a: clamp(u / 0.1), pop: u }; if (u < 0.4) F.headFlash = { c: [hp[0], hp[1] + 60], a: 1 - u / 0.4 }; }
    const WP = [[-1.4, 0.75, 'left'], [0.95, 0.75, 'right'], [1.05, -0.3, 'right'], [-1.45, -0.3, 'left']];
    F.words = ['胡吃海塞', '来者不拒', '欲罢不能', '再来一碗'].map((s, i) => { const u = t - EV.words[i]; const p = project([wx + WP[i][0], HEAD_C[1] + WP[i][1], 0.3]); return { s, x: p[0], y: p[1], a: clamp(u / 0.12), pop: u, side: WP[i][2] }; });
    F.card = { a: clamp((dt - 0.15) / 0.3), q: clamp((t - EV.ask) / 0.08), qpop: t - EV.ask };
    subj = [wx, HEAD_C[1], 0];
  } else {
    // ---- 第 10 小节：结尾阵容 + 下一集（色欲）；最后 0.3 秒回到第 0 帧
    const dt = t - EV.end, k = inOut(clamp(dt / 0.45)), fin = t >= TL - 0.3;
    cam = camLerp(live(camAt(0, -0.25, 6.8, -0.3), t, EV.card, 0), lineupCam(t), k);
    if (fin) cam = heroLineup(t, F, AUD);
    else {
      const A0 = { ...AUD, mid: 0, low: 0 };
      S.chars.forEach(O => { O.g.visible = true; const aired = O.i <= SL;
        setState(O, { lite: k > 0.5 || O !== W, gray: !aired, eyes: aired ? 1 : 0, halo: aired ? 0.85 : 0, props: 1, scatter: 0, aud: A0 }); animate(O, t, 9, -9, true, A0);
        if (O !== W) O.g.position.x = slotX(O.i) + Math.sign(O.i - SL) * 7 * (1 - outExpo(clamp((dt - 0.05) / 0.4))); });
      W.g.position.x = lerp(1.45, slotX(SL), k);
      const G = S.chars[6], gu = t - EV.next;
      if (gu >= 0) { const blink = Math.exp(-gu / 0.5); G.eyes.forEach(m => { m.visible = true; m.material.uniforms.uInt.value = 0.95 * blink; m.material.uniforms.uOpen.value = 0.5 + 0.5 * blink; });
        F.goldRing = { c: project([slotX(6), HEAD_C[1], 0.3]), a: clamp(gu / 0.1) * (1 - clamp((t - (TL - 0.45)) / 0.15)), k: gu };
        const p = project([slotX(6), 1.18, 0]); F.nextTag = { x: p[0], y: p[1], a: clamp(gu / 0.15) * (1 - clamp((t - (TL - 0.45)) / 0.15)) }; }
      F.names = clamp((dt - 0.3) / 0.3); F.aired4 = F.names; F.auraCol = '#C8A08F'; F.auraK = 0.4;
    }
  }
  // 吃：食物飞进嘴里（嘴张开、腮帮鼓一下、眼睛满足地眯起来）
  if (full && W.feast) {
    const u = W.feast.material.uniforms; for (let s = 0; s < 7; s++) { const [e, r] = eatAt(t, s); u.uE.value[s] = e; u.uR.value[s] = r; }
    u.uShow6.value = t >= EV.seven - 0.65 && t < EV.seven + 0.2 ? 1 : 0; u.uPhase.value = 0.45 * t; u.uKick.value = Math.max(0, kick);
    const last = EV.eats.filter(e => e.t <= t + 0.12).pop(), d = last ? t - last.t : 9;
    const chew = d > -0.12 && d < 0.1;
    if (chew && !W.st?.calm) { W.gag.visible = true; W.col.visible = false; if (W.calm) W.calm.visible = false; W.mats.forEach(m => { m.uniforms.uDim.value *= 0.82; }); }   // 张大嘴时粒子更密，压暗一点
    const puff = d >= 0 ? Math.exp(-d / 0.25) * (d < 1 ? 1 : 0) : 0;
    W.head.scale.set(1.08 + 0.07 * puff, 1, 1 + 0.03 * puff);                // 圆一点的脸，吃完腮帮鼓一下
    W.eyes.forEach(m => { m.scale.y = Math.min(m.scale.y, 1 - 0.55 * Math.max(puff, chew ? 1 : 0)); m.material.uniforms.uInt.value *= 0.8; });
  }
  // 高音：橙色小火花
  if (subj && high > 0.15) for (let h = Math.max(0, lastIdx(A.hats, t) - 2); h <= lastIdx(A.hats, t); h++) {
    const ht = A.hats[h]; if (h < 0 || t - ht > 0.15) continue;
    const a = hash(h * 3.1) * TAU, rr = 1.1 + 0.6 * hash(h * 5.7);
    F.bursts.push({ t0: ht, pos: [subj[0] + Math.cos(a) * rr, subj[1] + Math.sin(a) * rr * 0.8, 0.3], n: 2, speed: 0.15, life: 0.15, grav: 0, seed: h, bright: 1.8 });
  }
  const bk = bb.k >= 0 ? Math.exp(-bb.d / 0.16) * endK : 0;
  cam = { ...cam, pos: lerp3(cam.target, cam.pos, 1 - 0.02 * off - 0.025 * bk) };
  { const hx = 0.07 * Math.sin(t * qw(5.1)) * endK, hy = 0.05 * Math.sin(t * qw(4.3) + 1) * endK; cam = { ...cam, pos: [cam.pos[0] + hx, cam.pos[1] + hy, cam.pos[2]], target: [cam.target[0] + hx, cam.target[1] + hy, cam.target[2]] }; }
  S.spot.material.uniforms.uInt.value = F.spot ? 0.22 * F.spot.a : 0; if (F.spot) { S.spot.position.set(F.spot.x, 2.2, 0.6); S.spot.material.uniforms.uCol.value.set('#FFF1E6'); }
  S.stars.forEach(s => { s.material.uniforms.uScale.value = K.scale; });
  for (const s of TXT) if (t >= s.t0 - 0.01 && t <= s.t1 + 0.12) (s.kind === 'sub' ? F.subs : F.hooks).push(s);
  if (W.g.visible && !W.st?.lite) { const dd = Math.hypot(cam.pos[0] - W.g.position.x, cam.pos[1] - W.g.position.y, cam.pos[2] - W.g.position.z), f = lerp(0.6, 1, clamp((dd - 3.4) / 5)); W.mats.forEach(m => { m.uniforms.uDim.value *= f; }); }
  if (window.COVER && W.g.visible) { W.mats.forEach(m => { m.uniforms.uDim.value *= 1.3; }); }
  F.subjBoxes = [];
  if (W.g.visible && t >= EV.zoom && t < EV.end) { const hp = W.g.position, s = W.g.scale.x, a2 = project([hp.x - 0.55 * s, HEAD_C[1] + 0.5 * s, hp.z + 0.2]), b2 = project([hp.x + 0.55 * s, HEAD_C[1] - 0.45 * s, hp.z + 0.2]); F.subjBoxes.push({ name: '暴食的脸', x0: a2[0], y0: a2[1], x1: b2[0], y1: b2[1] }); }
  F.cam = cam; F.kick = kick;
  return F;
}
// 信号点的进度（0 = 胸口，1 = 头顶）：第 6 小节开始慢慢爬，结尾卡里终于到头顶
const sig = t => t < EV.wide ? 0 : t < EV.full ? 0.9 * Math.pow(clamp((t - EV.wide) / (EV.full - EV.wide)), 1.3) : 0.9 + 0.1 * outExpo(clamp((t - EV.full) / 0.25));

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
    if (o.hook) { ctx.lineJoin = 'round'; ctx.lineWidth = 4; ctx.strokeStyle = 'rgba(2,10,12,0.92)'; ctx.strokeText(s, x, y); }
    ctx.shadowColor = k ? keyCol : (o.hook ? 'rgba(168,240,250,0.35)' : 'rgba(0,0,0,0.8)'); ctx.shadowBlur = k ? 14 : o.hook ? 8 : 6;
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
  if (s.id === 'A') { const k = outExpo(clamp((t - EV.zoom + 0.12) / 0.12)); return [lerp(960, 60, k), lerp(940, 905, k), k > 0.5 ? 'left' : 'center']; }   // 抽中后跟着镜头移到脸的左边
  if (s.id === 'B' || s.id === 'C') return [960, 965, 'center'];           // 画面中下方
  if (s.id === 'C') return [960, 120, 'center'];                         // 画面上方（拉远后人物在左、“明天的你”在右）
  if (s.id === 'N') return [960, 905, 'center'];
  if (s.id === 'S2') return [960, 130, 'center'];                       // 第七口：画面上方
  if (s.id === 'M') return [960, 985, 'center'];                         // 脸在上方 60%，问话放在最下面，不压围巾
  return [960, 930, 'center'];
}
function drawHook(t, ctx, s) {
  if (t < s.t0 || t > s.t1 + 0.12) return;
  const a = Math.min(clamp((t - s.t0) / (s.id === 'B' ? 0.15 : 0.06)), 1 - clamp((t - s.t1) / 0.12)), [x, y, al] = hookPos(s, t), sc = popScale(t - s.t0);
  if (s.suffix && t >= EV.pick) {                                          // 抽中那一拍补全罪名：整句（含“懒惰”）一起排版
    const sz2 = s.size + 8; ctx.save(); ctx.font = fs(900, s.size); const w1 = segs(s.text).reduce((p, [q]) => p + ctx.measureText(q).width, 0); ctx.font = fs(900, sz2); const w2 = ctx.measureText(s.suffix).width; ctx.restore();
    const kk = outExpo(clamp((t - EV.pick) / 0.25)), x0 = al === 'left' ? x : x - (w1 + w2) / 2;
    ctx.save(); ctx.translate(x0, y); richText(ctx, s.text, 0, 0, s.size, a, s.key ?? CY, { hook: true, align: 'left' }); ctx.restore();
    const d = t - EV.pick, ps = d < 0.12 ? lerp(0.6, 1.25, outExpo(d / 0.12)) : d < 0.3 ? lerp(1.25, 1, sine((d - 0.12) / 0.18)) : 1;   // 放大回弹
    ctx.save(); ctx.translate(x0 + w1 + w2 / 2, y); ctx.scale(ps, ps);
    const glowK = Math.exp(-d / 0.35);
    ctx.globalAlpha = a; ctx.font = fs(900, sz2); ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.lineJoin = 'round'; ctx.lineWidth = 4; ctx.strokeStyle = 'rgba(2,10,12,0.92)'; ctx.strokeText(s.suffix, 0, 0);
    ctx.shadowColor = CY; ctx.shadowBlur = 16 + 40 * glowK; ctx.fillStyle = CY; ctx.fillText(s.suffix, 0, 0); ctx.shadowBlur = 30 * glowK; ctx.fillText(s.suffix, 0, 0);
    ctx.restore();
    BOXES.push({ x0: x0 + w1, x1: x0 + w1 + w2, y0: y - sz2 * 0.6, y1: y + sz2 * 0.6, label: s.suffix, alpha: a });
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
  ctx.font = fs(700, 36); ctx.fillStyle = 'rgba(233,241,242,0.8)'; ctx.shadowColor = 'rgba(0,0,0,0.8)'; ctx.shadowBlur = 6; ctx.fillText('七宗罪 · 第六宗', 0, -125);
  ctx.font = fs(900, 160); ctx.shadowColor = CY; ctx.shadowBlur = 40; ctx.fillStyle = CY; ctx.fillText('暴食', 0, 10);
  { const g = ctx.createLinearGradient(0, -70, 0, 90); g.addColorStop(0, '#FFE6D2'); g.addColorStop(0.45, '#FF8A30'); g.addColorStop(1, '#B04A0C'); ctx.shadowBlur = 12; ctx.fillStyle = g; ctx.fillText('暴食', 0, 10); }
  ctx.restore();
  if (k < 0.5) BOXES.push({ x0: cx - 180 * sc, x1: cx + 180 * sc, y0: cy - 150 * sc, y1: cy + 100 * sc, label: '暴食（标题）', alpha: a });
}
// 标签：44px 白字，半透明暗色圆角底（内边距 10px），贴在物体旁边，不用长引线
function drawTag(ctx, L) {
  if (!(L.a > 0.01)) return;
  const size = L.small ? 36 : 44;
  ctx.save(); ctx.font = fs(700, size); const w = ctx.measureText(L.text).width + 20, h = size + 20;
  const cx = L.align === 'left' ? L.x + w / 2 : L.align === 'right' ? L.x - w / 2 : L.x;
  ctx.globalAlpha = L.a; ctx.fillStyle = 'rgba(3,14,17,0.66)'; ctx.beginPath(); ctx.roundRect(cx - w / 2, L.y - h / 2, w, h, 10); ctx.fill();
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.shadowColor = CY; ctx.shadowBlur = 8; ctx.fillStyle = TXTW; ctx.fillText(L.text, cx, L.y + 2);
  ctx.restore();
  { const T = ctx.getTransform(), q = K.scale; BOXES.push({ x0: (T.e + T.a * (cx - w / 2)) / q, x1: (T.e + T.a * (cx + w / 2)) / q, y0: (T.f + T.d * (L.y - h / 2)) / q, y1: (T.f + T.d * (L.y + h / 2)) / q, label: L.text, alpha: L.a }); }
}
// 结尾卡：左边“暴食”大字 + “出厂设置 · 06 / 07”；角色周围的四字词；下方两行
function drawCard(t, ctx, F) {
  const C5 = F.card, a = C5.a; if (a <= 0.003) return;
  ctx.save(); ctx.globalAlpha = a; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.font = fs(900, 200);
  ctx.shadowColor = CY; ctx.shadowBlur = 44; ctx.fillStyle = CY; ctx.fillText('暴食', 520, 420);
  { const g = ctx.createLinearGradient(0, 330, 0, 510); g.addColorStop(0, '#FFE6D2'); g.addColorStop(0.45, '#FF8A30'); g.addColorStop(1, '#B04A0C'); ctx.shadowBlur = 12; ctx.fillStyle = g; ctx.fillText('暴食', 520, 420); }
  ctx.font = fs(700, 28); ctx.shadowBlur = 6; ctx.shadowColor = 'rgba(0,0,0,0.8)'; ctx.fillStyle = 'rgba(238,232,226,0.85)'; ctx.fillText('出厂设置 · 06 / 07', 520, 565); ctx.restore();
  BOXES.push({ x0: 320, x1: 720, y0: 320, y1: 590, label: '暴食（结尾卡）', alpha: a });
  for (const w of F.words) { if (w.a <= 0.01) continue; const sc = w.pop < 0.25 ? popScale(w.pop) : 1, dx = w.side === 'left' ? -1 : 1;
    ctx.save(); ctx.translate(w.x, w.y); ctx.scale(sc, sc); richText(ctx, '〔' + w.s + '〕', 0, 0, 42, w.a * a, '#FFD2B0', { hook: true, align: w.side === 'left' ? 'right' : 'left' }); ctx.restore();
    ctx.save(); ctx.globalAlpha = w.a * a; ctx.fillStyle = '#FFE6D2'; ctx.shadowColor = CY; ctx.shadowBlur = 12; ctx.beginPath(); ctx.arc(w.x + dx * -14, w.y, 6, 0, TAU); ctx.fill(); ctx.restore(); }
  // 下方两行：知识（接着第 6 小节那句字幕）+ 提问
  ctx.save(); const g = ctx.createLinearGradient(0, 800, 0, 1080); g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, `rgba(0,0,0,${0.65 * a})`); ctx.fillStyle = g; ctx.fillRect(0, 800, 1920, 280); ctx.restore();
  richText(ctx, '吃饱的信号，要〔晚到约20分钟〕。', 960, 900, 52, a, CY);
  if (C5.q > 0) { const sc = popScale(C5.qpop); ctx.save(); ctx.translate(960, 985); ctx.scale(sc, sc); richText(ctx, '你吃到第几口，才会真的停下来？', 0, 0, 56, C5.q * a, CY); ctx.restore(); }
}
// 电池（画面右侧，细线框外壳、5 格电量）+ 上方的小人形（大脑的位置亮一小块）
function drawBattery(ctx, B2) {
  const x = 1500, y0 = 330, y1 = 820, w = 150, ch = (y1 - y0 - 24) / 5;
  ctx.save(); ctx.globalAlpha = B2.a;
  ctx.strokeStyle = 'rgba(168,240,250,0.8)'; ctx.lineWidth = 3; ctx.shadowColor = CY; ctx.shadowBlur = 8;
  ctx.beginPath(); ctx.roundRect(x - w / 2, y0, w, y1 - y0, 14); ctx.stroke(); ctx.beginPath(); ctx.roundRect(x - 30, y0 - 20, 60, 20, 5); ctx.stroke();
  for (let c = 0; c < 5; c++) {
    const yb = y1 - 12 - c * ch, on = c < B2.lvl, going = c === B2.lvl && B2.drop < 1;
    if (!on && !going) continue;
    ctx.globalAlpha = B2.a * (going ? 1 - B2.drop : 1); ctx.fillStyle = going ? '#DFFBFF' : CY; ctx.shadowBlur = going ? 30 : 14;
    ctx.beginPath(); ctx.roundRect(x - w / 2 + 12, yb - ch + 6, w - 24, ch - 10, 6); ctx.fill();
  }
  if (B2.empty >= 0) { const fl = [0.5, 1.0].reduce((m, s) => Math.max(m, Math.exp(-Math.pow((B2.empty - s) / 0.08, 2))), 0); if (fl > 0.01) ctx.globalAlpha = B2.a * fl; ctx.fillStyle = DK; ctx.shadowColor = DK; ctx.shadowBlur = 20; ctx.beginPath(); ctx.roundRect(x - w / 2 + 8, y0 + 8, w - 16, y1 - y0 - 16, 10); if (fl > 0.01) ctx.fill(); }
  // 小人形
  ctx.globalAlpha = B2.a; ctx.shadowBlur = 6; ctx.strokeStyle = 'rgba(168,240,250,0.75)'; ctx.lineWidth = 2.5;
  const hx = x, hy = 165;
  ctx.beginPath(); ctx.arc(hx, hy, 24, 0, TAU); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(hx - 34, hy + 92); ctx.quadraticCurveTo(hx - 36, hy + 36, hx, hy + 34); ctx.quadraticCurveTo(hx + 36, hy + 36, hx + 34, hy + 92); ctx.stroke();
  const g = ctx.createRadialGradient(hx - 3, hy - 6, 0, hx - 3, hy - 6, 14); g.addColorStop(0, 'rgba(223,251,255,0.95)'); g.addColorStop(1, 'rgba(43,200,224,0)'); ctx.fillStyle = g; ctx.shadowBlur = 16; ctx.beginPath(); ctx.arc(hx - 3, hy - 6, 14, 0, TAU); ctx.fill();
  ctx.restore();
  drawTag(ctx, { text: '2%', x: hx + 52, y: hy - 6, a: B2.a, align: 'left' });
  drawTag(ctx, { text: '约20%', x: x + w / 2 + 28, y: (y0 + y1) / 2, a: B2.a, align: 'left' });
}
let T2v = 0; const T2 = () => T2v;
export function draw2D(t, ctx, F) {
  T2v = t; if (F.count && t >= EV.wide) F.countFade = clamp((t - EV.wide) / 0.3);
  // 第 0 帧：上方“七宗罪 · 第四集”（和愤怒第 0 帧同一套）
  if (!window.COVER && F.series > 0.001) glowText('七宗罪 · 第六集', 960, 92, fs(700, 60), '#FAF0E8', { glow: 22, glowColor: '#FFFFFF', nobox: true, alpha: F.series });
  // 左上角常驻小字
  if (!window.COVER && F.corner > 0.001) { ctx.save(); ctx.globalAlpha = 0.7 * F.corner; ctx.font = fs(700, 28); ctx.textBaseline = 'middle'; ctx.fillStyle = TXTW; ctx.shadowColor = 'rgba(0,0,0,0.8)'; ctx.shadowBlur = 6; ctx.fillText('七宗罪 · 06 / 07 · 暴食', 60, 58); ctx.restore(); }
  if (F.title && !window.COVER) drawTitle2(ctx, t, F.title);
  // 名字（排成一排时，在肩膀下方，带暗色底）
  if (F.names > 0) S.chars.forEach(C => {
    const p = project([C.g.position.x, -1.78, 0]);
    ctx.save(); ctx.globalAlpha = 0.62 * F.names; ctx.fillStyle = '#0B0912'; ctx.beginPath(); ctx.roundRect(p[0] - 60, p[1] - 27, 120, 54, 10); ctx.fill(); ctx.restore();
    glowText(C.sin.name, p[0], p[1] + 2, fs(700, 38), tone(C.sin.col, 0.25), { alpha: F.names, glow: 12, glowColor: C.sin.col });
  });
  // 已播出（傲慢、嫉妒、愤怒）
  if (F.aired > 0) [0, 1, 2, 3, 4].forEach(i => { const C = S.chars[i], p = project([C.g.position.x, 1.18, 0]); glowText('已播出', p[0], p[1], fs(700, 24), tone(C.sin.col, 0.4), { alpha: F.aired, glow: 10, glowColor: C.sin.col }); });
  // 扫描线
  if (F.scan) {
    const x = F.scan.x; ctx.save(); ctx.globalAlpha = F.scan.a; ctx.globalCompositeOperation = 'lighter';
    const g = ctx.createLinearGradient(x - 70, 0, x + 70, 0); g.addColorStop(0, 'rgba(43,200,224,0)'); g.addColorStop(0.5, 'rgba(120,225,240,0.35)'); g.addColorStop(1, 'rgba(43,200,224,0)');
    ctx.fillStyle = g; ctx.fillRect(x - 70, 140, 140, 760); ctx.fillStyle = 'rgba(225,250,255,0.95)'; ctx.fillRect(x - 1.5, 140, 3, 760); ctx.restore();
  }
  if (F.tick && F.tick.k < 1) { const T2 = F.tick, r = T2.w * (0.6 + 0.6 * outExpo(T2.k)); ctx.save(); ctx.globalAlpha = 0.9 * (1 - T2.k); ctx.strokeStyle = '#CFF7FC'; ctx.lineWidth = 2; ctx.shadowColor = CY; ctx.shadowBlur = 10; ctx.beginPath(); ctx.ellipse(T2.c[0], T2.c[1], r, r * 0.22, 0, 0, TAU); ctx.stroke(); ctx.restore(); }
  if (F.flash && F.flash.a > 0.01) { const f = F.flash; ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = f.a; const g = ctx.createRadialGradient(f.c[0], f.c[1], 0, f.c[0], f.c[1], f.r); g.addColorStop(0, 'rgba(255,231,163,0.75)'); g.addColorStop(0.4, 'rgba(255,194,61,0.35)'); g.addColorStop(1, 'rgba(255,194,61,0)'); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(f.c[0], f.c[1], f.r, 0, TAU); ctx.fill(); ctx.restore(); }
  if (F.prog && F.prog.a > 0.01) {                                          // 进度条：每拍走一格，最新一格弹一下
    const P2 = F.prog, w = 440, h = 26, x0 = P2.x - w / 2, sw = w / P2.N; ctx.save(); ctx.globalAlpha = P2.a;
    ctx.strokeStyle = 'rgba(255,231,163,0.8)'; ctx.lineWidth = 2.5; ctx.shadowColor = CY; ctx.shadowBlur = 8; ctx.beginPath(); ctx.roundRect(x0, P2.y - h / 2, w, h, 13); ctx.stroke();
    for (let i = 0; i < P2.n; i++) { const pop = i === P2.n - 1 && !P2.done ? 1 + 0.35 * Math.exp(-P2.pop / 0.12) : 1; ctx.fillStyle = P2.done ? '#FFE7A3' : CY; ctx.shadowBlur = 12; ctx.beginPath(); ctx.roundRect(x0 + 4 + i * sw, P2.y - (h - 8) * pop / 2, sw - 3, (h - 8) * pop, 4); ctx.fill(); }
    ctx.restore();
    drawTag(ctx, { text: P2.done ? '已送达' : '运输中', x: P2.x, y: P2.y + 58, a: P2.a, pop: P2.done ? P2.dd : null });
  }
  if (F.excite && F.excite.a > 0.01) {                                      // 兴奋度柱：越接近终点涨得越快；到达那一拍猛地掉到约 1/3 并晃一下
    const E2 = F.excite, w = 96, full = E2.y0 - E2.top, y1 = E2.y0 - full * clamp(E2.e, 0, 1.08); ctx.save(); ctx.globalAlpha = E2.a;
    const g = ctx.createLinearGradient(0, E2.y0, 0, y1); g.addColorStop(0, 'rgba(255,194,61,0.8)'); g.addColorStop(1, 'rgba(255,231,163,0.95)');
    ctx.strokeStyle = 'rgba(255,231,163,0.35)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.roundRect(E2.x - w / 2, E2.top, w, full, 10); ctx.stroke();
    ctx.shadowColor = CY; ctx.shadowBlur = 18 + 30 * E2.hit; ctx.fillStyle = g; ctx.beginPath(); ctx.roundRect(E2.x - w / 2, y1, w, Math.max(4, E2.y0 - y1), 10); ctx.fill(); ctx.restore();
    drawTag(ctx, { text: '兴奋度', x: E2.x - w / 2 - 30, y: E2.y0 - 40, a: E2.a, align: 'right' });
  }
  if (F.path && F.path.a > 0.01) {                                          // 奖励回路：一节一节亮起；最高点爆亮；得到后迅速变暗
    const P3 = F.path, n = P3.pts.length - 1, upto = P3.lit * n; ctx.save(); ctx.globalAlpha = P3.a; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    ctx.strokeStyle = 'rgba(255,194,61,0.22)'; ctx.lineWidth = 6; ctx.beginPath(); P3.pts.forEach((p, i) => i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1])); ctx.stroke();
    const br = (1 + 1.5 * P3.flare) * (1 - 0.75 * P3.dim); ctx.globalCompositeOperation = 'lighter'; ctx.shadowColor = CY; ctx.shadowBlur = 16 + 30 * P3.flare;
    ctx.strokeStyle = `rgba(255,214,120,${clamp(0.85 * br)})`; ctx.lineWidth = 7 + 6 * P3.flare; ctx.beginPath();
    for (let i = 0; i <= n; i++) { if (i > upto + 1e-6) { const f = upto - (i - 1); if (f > 0) { const a = P3.pts[i - 1], b = P3.pts[i]; ctx.lineTo(lerp(a[0], b[0], f), lerp(a[1], b[1], f)); } break; } const p = P3.pts[i]; i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1]); } ctx.stroke();
    P3.pts.forEach((p, i) => { if (i > upto + 1e-6) return; ctx.fillStyle = `rgba(255,240,200,${clamp(0.9 * br)})`; ctx.beginPath(); ctx.arc(p[0], p[1], 7 + 5 * P3.flare, 0, TAU); ctx.fill(); });
    ctx.restore();
    const m = P3.pts[2]; drawTag(ctx, { text: '奖励回路', x: m[0], y: m[1] + 70, a: P3.a * clamp(P3.lit * 3) });
  }
  if (F.chart && F.chart.a > 0.01) {                                        // 折线：随时间画出来；最高点“快要得到”，迅速往下掉到“真得到了”
    const C2 = F.chart, x0 = 1110, x1 = 1760, yb = 760, yt = 330, f = u => u <= 0.72 ? Math.pow(u / 0.72, 1.8) : u <= 0.92 ? 1 - 0.78 * sine((u - 0.72) / 0.2) : 0.22 - 0.04 * (u - 0.92) / 0.08;
    const P = u => [lerp(x0, x1, u), lerp(yb, yt, f(u))];
    ctx.save(); ctx.globalAlpha = C2.a; ctx.strokeStyle = 'rgba(255,231,163,0.35)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x0, yt - 20); ctx.lineTo(x0, yb); ctx.lineTo(x1 + 20, yb); ctx.stroke();
    ctx.globalCompositeOperation = 'lighter'; ctx.shadowColor = CY; ctx.shadowBlur = 14; ctx.strokeStyle = 'rgba(255,200,90,0.95)'; ctx.lineWidth = 5; ctx.lineJoin = 'round'; ctx.beginPath();
    for (let i = 0; i <= 80; i++) { const u = C2.u * i / 80, p = P(u); i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1]); } ctx.stroke();
    const hp = P(C2.u); ctx.fillStyle = '#FFF3D0'; ctx.shadowBlur = 20; ctx.beginPath(); ctx.arc(hp[0], hp[1], 8, 0, TAU); ctx.fill();
    if (C2.u >= 0.72) { const pk = P(0.72); ctx.globalAlpha = C2.a * (0.6 + 0.4 * Math.exp(-0.5)); ctx.fillStyle = `rgba(255,240,200,${0.6 + 0.4 * C2.flare})`; ctx.beginPath(); ctx.arc(pk[0], pk[1], 10 + 16 * C2.flare, 0, TAU); ctx.fill(); }
    ctx.restore();
    if (C2.u >= 0.72) { const pk = P(0.72); drawTag(ctx, { text: '快要得到', x: pk[0], y: pk[1] - 52, a: C2.a, pop: C2.u < 0.75 ? 0 : null }); }
    if (C2.u >= 0.9) { const e = P(0.92); drawTag(ctx, { text: '真得到了', x: e[0] + 20, y: e[1] + 56, a: C2.a * clamp((C2.u - 0.9) / 0.02) }); }
  }
  if (F.hcols) {                                                            // 快乐柱（两个半身像头顶）
    for (const c of F.hcols) { if (c.a <= 0.01) continue; const w = 110, full = c.y0 - 140, y1 = c.y0 - full * clamp(c.e, 0, 1.08);
      ctx.save(); ctx.globalAlpha = c.a; ctx.strokeStyle = 'rgba(255,231,163,0.3)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.roundRect(c.x - w / 2, 140, w, full, 10); ctx.stroke();
      const g = ctx.createLinearGradient(0, c.y0, 0, y1); g.addColorStop(0, 'rgba(255,194,61,0.8)'); g.addColorStop(1, 'rgba(255,231,163,0.95)'); ctx.fillStyle = g; ctx.shadowColor = CY; ctx.shadowBlur = 16 + 30 * c.hit;
      ctx.beginPath(); ctx.roundRect(c.x - w / 2, y1, w, Math.max(4, c.y0 - y1), 10); ctx.fill(); ctx.restore();
      BOXES.push({ x0: c.x - w / 2, x1: c.x + w / 2, y0: 140, y1: c.y0, label: '#柱子', alpha: c.a }); }
    const c0 = F.hcols[0]; drawTag(ctx, { text: '快乐', x: c0.x - 55 - 28, y: c0.y0 - 40, a: c0.a, align: 'right' });
  }
  if (F.dark > 0) { ctx.save(); ctx.fillStyle = `rgba(0,0,0,${F.dark})`; ctx.fillRect(0, 0, 1920, 1080); ctx.restore(); }   // 吸气：画面暗一点
  if (F.count && F.count.n > 0 && !window.COVER) {                                           // 右上方的计数：1–6（120px），第七口一个巨大的“7”（240px）
    const C4 = F.count, big = C4.big, size = big ? 240 : 120, u = C4.pop, sc = big ? (u < 0.18 ? lerp(2.2, 0.92, outExpo(u / 0.18)) : u < 0.35 ? lerp(0.92, 1, sine((u - 0.18) / 0.17)) : 1) : (u < 0.1 ? lerp(0.6, 1.2, u / 0.1) : u < 0.25 ? lerp(1.2, 1, sine((u - 0.1) / 0.15)) : 1);
    const fade = 1 - clamp((F.countFade ?? 0)); ctx.save(); ctx.translate(big ? 1812 : 1745, big ? 260 : 230); ctx.scale(sc, sc); ctx.globalAlpha = fade; ctx.font = fs(900, size); ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.lineJoin = 'round'; ctx.lineWidth = 6; ctx.strokeStyle = 'rgba(14,6,2,0.9)'; ctx.strokeText(String(C4.n), 0, 0); ctx.shadowColor = CY; ctx.shadowBlur = big ? 40 : 22; ctx.fillStyle = CY; ctx.fillText(String(C4.n), 0, 0); ctx.restore();
    BOXES.push({ x0: (big ? 1812 : 1745) - size * 0.4, x1: (big ? 1812 : 1745) + size * 0.4, y0: (big ? 260 : 230) - size * 0.55, y1: (big ? 260 : 230) + size * 0.55, label: '计数', alpha: fade });
  }
  if (F.shock2) { const s2 = F.shock2; ctx.save(); ctx.globalAlpha = s2.a; ctx.strokeStyle = HI; ctx.lineWidth = 4; ctx.shadowColor = CY; ctx.shadowBlur = 16; ctx.beginPath(); ctx.arc(s2.c[0], s2.c[1], s2.r * 1920, 0, TAU); ctx.stroke(); ctx.restore(); }
  if (F.signal && F.signal.a > 0.01) {                                      // “吃饱了”信号点：从胸口沿着脖子慢慢爬向头顶（加载条）
    const G2 = F.signal, x = G2.x, y0 = project([0, -1.35, 0.5])[1] + (G2.x - project([0, -1.35, 0.5])[0]) * 0, yb = G2.yb ?? null;
    const ys = project([G2.hx, -1.35, 0.5])[1], ye = project([G2.hx, HEAD_C[1] + 0.85, 0.5])[1], yy = lerp(ys, ye, G2.p);   // 沿着脖子和脸的一侧往上（不压脸）
    ctx.save(); ctx.globalAlpha = G2.a; ctx.strokeStyle = 'rgba(255,196,154,0.35)'; ctx.lineWidth = 6; ctx.setLineDash([10, 10]); ctx.beginPath(); ctx.moveTo(x, ys); ctx.lineTo(x, ye); ctx.stroke(); ctx.setLineDash([]);
    ctx.strokeStyle = 'rgba(255,160,90,0.95)'; ctx.shadowColor = CY; ctx.shadowBlur = 14; ctx.lineWidth = 6; ctx.beginPath(); ctx.moveTo(x, ys); ctx.lineTo(x, yy); ctx.stroke();
    const g = ctx.createRadialGradient(x, yy, 0, x, yy, 22); g.addColorStop(0, 'rgba(255,243,232,0.95)'); g.addColorStop(0.4, 'rgba(255,122,31,0.7)'); g.addColorStop(1, 'rgba(255,122,31,0)'); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, yy, 22 * (1 + 0.2 * Math.sin(T2() * 9)), 0, TAU); ctx.fill(); ctx.restore();
    if (!F.card) drawTag(ctx, { text: '吃饱了', x: x + 40, y: yy, a: G2.a, align: 'left' });
  }
  if (F.timer && F.timer.a > 0.01) {                                        // “约20分钟”计时圆环：一格一格慢慢走
    const T3 = F.timer, [cx, cy] = T3.c, r = 120; ctx.save(); ctx.globalAlpha = T3.a; ctx.lineCap = 'round';
    for (let i = 0; i < 12; i++) { const a0 = -Math.PI / 2 + i / 12 * TAU + 0.04, a1 = a0 + TAU / 12 - 0.08; ctx.strokeStyle = i < T3.n ? CY : 'rgba(255,196,154,0.2)'; ctx.shadowColor = CY; ctx.shadowBlur = i < T3.n ? 12 : 0; ctx.lineWidth = 16; ctx.beginPath(); ctx.arc(cx, cy, r, a0, a1); ctx.stroke(); }
    const a = -Math.PI / 2 + T3.n / 12 * TAU; ctx.strokeStyle = 'rgba(255,243,232,0.9)'; ctx.lineWidth = 5; ctx.shadowBlur = 8; ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx + Math.cos(a) * r * 0.7, cy + Math.sin(a) * r * 0.7); ctx.stroke(); ctx.restore();
    drawTag(ctx, { text: '约20分钟', x: cx, y: cy + r + 52, a: T3.a });
  }
  if (F.headFlash) { const h2 = F.headFlash; ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = h2.a; const g = ctx.createRadialGradient(h2.c[0], h2.c[1], 0, h2.c[0], h2.c[1], 160); g.addColorStop(0, 'rgba(255,196,154,0.5)'); g.addColorStop(1, 'rgba(255,122,31,0)'); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(h2.c[0], h2.c[1], 160, 0, TAU); ctx.fill(); ctx.restore(); }
  if (F.bao && F.bao.a > 0) { const b3 = F.bao, sc = b3.pop < 0.25 ? popScale(b3.pop) : 1; ctx.save(); ctx.translate(b3.x, b3.y); ctx.scale(sc, sc); richText(ctx, '〔饱〕', 0, 0, 56, b3.a, CY, { hook: true }); ctx.restore(); }
  if (F.card) drawCard(t, ctx, F);
  // 大脑的反应：三根发光的竖柱
  if (F.cols) {
    for (const c of F.cols) { if (c.a <= 0) continue;
      ctx.save(); ctx.globalAlpha = c.a; const w = 144, g = ctx.createLinearGradient(0, c.y0, 0, c.y1);
      g.addColorStop(0, `rgba(43,200,224,${0.75 * c.br})`); g.addColorStop(1, `rgba(150,230,242,${0.95 * c.br})`);
      ctx.shadowColor = CY; ctx.shadowBlur = 18 * c.br + 20 * c.flash; ctx.fillStyle = g; ctx.beginPath(); ctx.roundRect(c.x - w / 2, Math.min(c.y1, c.y0 - 2), w, Math.max(2, c.y0 - c.y1), 8); ctx.fill();
      ctx.restore();
      ctx.save(); ctx.globalAlpha = c.a; const dg = ctx.createRadialGradient(c.x, c.y1, 0, c.x, c.y1, 30); dg.addColorStop(0, 'rgba(239,255,255,0.95)'); dg.addColorStop(0.35, 'rgba(168,240,250,0.8)'); dg.addColorStop(1, 'rgba(43,200,224,0)');
      ctx.fillStyle = dg; ctx.beginPath(); ctx.arc(c.x, c.y1, 30 * (1 + 0.4 * c.flash), 0, TAU); ctx.fill(); ctx.restore(); }   // 顶端发光的小圆点
    if (F.colLabel > 0) { const c = F.cols[0]; drawTag(ctx, { text: '大脑的反应', x: c.x - 72 - 30, y: c.y0 - 30, a: F.colLabel, align: 'right' }); }   // 在三根柱子左侧
  }
  if (F.battery && F.battery.a > 0.01) drawBattery(ctx, F.battery);
  if (!window.COVER) for (const L of F.labels) { if (L.pop != null && L.pop < 0.25) { const sc = popScale(L.pop); ctx.save(); ctx.translate(L.x, L.y); ctx.scale(sc, sc); drawTag(ctx, { ...L, x: 0, y: 0 }); ctx.restore(); } else drawTag(ctx, L); }
  if (F.aired4 > 0) [0, 1, 2, 3, 4, 5].forEach(i => { const C = S.chars[i], p = project([C.g.position.x, 1.18, 0]); glowText('已播出', p[0], p[1], fs(700, 24), tone(C.sin.col, 0.4), { alpha: F.aired4, glow: 10, glowColor: C.sin.col }); });
  if (F.goldRing && F.goldRing.a > 0) { const G2 = F.goldRing, r = 120 + 14 * Math.exp(-G2.k / 0.3); ctx.save(); ctx.globalAlpha = G2.a * (0.75 + 0.25 * Math.exp(-G2.k / 0.4)); ctx.strokeStyle = '#FF8FBA'; ctx.lineWidth = 3; ctx.shadowColor = GOLD; ctx.shadowBlur = 22; ctx.beginPath(); ctx.arc(G2.c[0], G2.c[1], r, 0, TAU); ctx.stroke(); ctx.restore(); }
  if (F.nextTag && F.nextTag.a > 0) glowText('下一集', F.nextTag.x, F.nextTag.y, fs(700, 28), '#FF8FBA', { alpha: F.nextTag.a, glow: 12, glowColor: GOLD });
  if (!window.COVER) for (const s of F.hooks) drawHook(t, ctx, s);   // 封面截图时不画钩子大字、标签
  if (!window.COVER) for (const s of F.subs) drawSub2(t, ctx, s);
  if (F.shock) { ctx.save(); ctx.globalAlpha = F.shock.a; ctx.strokeStyle = F.shock.col; ctx.lineWidth = lerp(5, 1, 1 - F.shock.a / 0.45); ctx.shadowColor = CY; ctx.shadowBlur = 14; ctx.beginPath(); ctx.arc(F.shock.c[0], F.shock.c[1], F.shock.r * 1920, 0, TAU); ctx.stroke(); ctx.restore(); }
}
