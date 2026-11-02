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
  const m = new THREE.ShaderMaterial({ uniforms: { uTime: { value: 0 }, uSize: { value: size }, uScale: { value: 1 }, uSpeed: { value: z < -15 ? 0.12 : 0.32 } }, transparent: true, depthWrite: false, depthTest: false, blending: THREE.AdditiveBlending,
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
  const mGray = mk(), mCol = mk(), mGag = mk();
  mGray.uniforms.uGray.value = 1; [mGray, mCol, mGag].forEach(m => { m.uniforms.uEyeOpen.value = 0; });
  mCol.uniforms.uRamp.value = mGag.uniforms.uRamp.value = 1;                       // 变色：保留灰色阶段的明暗，只映射颜色
  const C = { sin, i, g, rig, head,
    gray: pts(heads.neutral, mGray, head), col: pts(heads[sin.id], mCol, head), gag: pts(heads[sin.id + 'Gag'] ?? heads[sin.id], mGag, head),
    grayLite: pts(heads.neutralLite, mGray, head), colLite: pts(heads[sin.id + 'Lite'], mCol, head),
    body: pts(heads.body, idolMaterial(sin.col, { bright: 0.75, rim: 0.45, size: 0.0085, cran: 0.8, dust: true }), rig) };
  C.bodyLite = pts(heads.bodyLite, C.body.material, rig);                           // 那一排里的脸也带着脖子和肩膀
  C.mats = [mGray, mCol, mGag, C.body.material];
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
    C.hat = P(PR.beanie(), { bright: 1.25, posHook: '{ p.y -= uB*0.32; p.z += uB*0.06; }', colHook: '{ float gl = dot(col, vec3(0.3, 0.59, 0.11)); col = aExtra.y > 0.5 ? vec3(0.62, 0.92, 0.97) : vec3(0.07, 0.36, 0.42); col = mix(col, vec3(gl), uGray); }' });
    C.scarf = P(PR.scarf(), { bright: 0.95, colHook: '{ float gl = dot(col, vec3(0.3, 0.59, 0.11)); col = mix(vec3(0.1, 0.5, 0.57), vec3(0.62, 0.92, 0.97), 0.25*h1(aSeed*3.1)); col = mix(col, vec3(gl), uGray); }', posHook: '{ if (uL > 0.5 && aExtra.y > 0.5 && p.y < -1.08) vis = 0.0; }' }, rig);   // 排成一排时垂下的部分不超过肩膀
    C.zz = P(PR.zees(), { bright: 1.3, posHook: '{ float f = fract(uTime*floor(0.35*uLoop + 0.5)/uLoop + aExtra.y*0.33); p += vec3(0.08*sin(f*6.0 + aExtra.y), f*0.5, 0.0); vis *= uB*sin(3.14159*f); }' });
  } else if (sin.id === 'greed') {
    // 贪婪：金币像星环一样绕着头转（环面略倾斜），每枚金币正面朝镜头轻轻摆动，表面有一道扫过的金属反光
    C.coins = P(PR.coins(64), { bright: 2.2, size: 0.0095, posHook: `{
        float c = aExtra.y, n = 64.0, a = c/n*6.28318*2.0 + uTime*qw(0.55), rr = 0.98 + 0.22*h1(c*3.1) + 0.05*sin(c*2.7);
        float spin = 0.55*sin(uTime*qw(1.7) + c*1.3); vec3 q = vec3(p.x*cos(spin) + p.z*sin(spin), p.y, -p.x*sin(spin) + p.z*cos(spin));
        vec3 orbit = vec3(cos(a)*rr, 0.08 + 0.03*h1(c*7.3) - sin(a)*rr*0.22, sin(a)*rr*0.5 - 0.1); vec3 far = normalize(h3(c*1.7) - 0.5)*4.0;
        if (uL > 0.5) { float a2 = c/8.0*6.28318 + uTime*qw(0.55); orbit = vec3(cos(a2)*0.6, 0.1 - sin(a2)*0.12, sin(a2)*0.3 - 0.05); q *= 0.5; vis *= step(c, 7.5); }   /* 排成一排：贴着头的一小圈，最多 8 枚 */
        p = mix(far, orbit, clamp(uB*1.4 - h1(c*2.3)*0.4, 0.0, 1.0)) + q; vis *= step(c, uC); }`,
      colHook: '{ float gl = exp(-pow(aExtra.x - 1.3*sin(uTime*qw(2.2) + aExtra.y*0.7), 2.0)*10.0); col = mix(col, vec3(1.0, 0.97, 0.85), gl*0.8); b *= 0.75 + 1.4*gl; }' });
    C.eyeShapes = [FACE.eyeR, FACE.eyeL].map(e => { const m = propMat('#FFD25A', { bright: 0.85, size: 0.007 }); const o = pts(PR.coinEye().geometry(THREE), m, head, 47); o.position.set(e[0], e[1], e[2] + 0.03); return o; });
  } else if (sin.id === 'gluttony') {
    // 暴食：一圈飘浮的食物（鸡腿、包子、碗、汉堡），反转时一个个被吸进嘴里
    C.food = P(PR.food(2), { bright: 2.3, size: 0.0095, col: tone(sin.col, 0.35), posHook: `{
        float c = aExtra.y, a = c/8.0*6.28318 + uTime*qw(0.3); vec3 home = vec3(cos(a)*1.25, 0.12 + sin(a)*0.82, 0.3);   /* 一圈绕在头四周、彼此分开，不挡脸 */
        vec3 mouth = vec3(0.0, -0.3, 0.45); float k = clamp(uB*2.4 - c*0.2, 0.0, 1.0);   // 一个接一个被吸进嘴里
        if (uL > 0.5) { vis *= (c < 0.5 || abs(c - 2.0) < 0.5) ? 1.0 : 0.0; float sd = c < 0.5 ? -1.0 : 1.0; home = vec3(sd*0.52, 0.02 + 0.07*sin(uTime*qw(1.3) + c), 0.3 + 0.06*cos(uTime*qw(1.3) + c)); k = 0.0; }   /* 排成一排：只留碗和鸡腿，贴着头两侧 */
        p = mix(home, mouth, k*k) + p*mix(1.55, 0.62, uL)*(1.0 - 0.8*k); vis *= 1.0 - smoothstep(0.85, 1.0, k); }` }, rig);
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
  C.gray.visible = s.gray && !s.lite; C.col.visible = !s.gray && !s.lite && !gag; C.gag.visible = !s.gray && !s.lite && gag;
  C.grayLite.visible = s.gray && s.lite; C.colLite.visible = !s.gray && s.lite;
  C.body.visible = !s.lite; C.bodyLite.visible = s.lite;
  C.body.material.uniforms.uGray.value = s.gray ? 1 : 0; C.body.material.uniforms.uRamp.value = s.gray ? 0 : 1;
  const sc = s.scatter ?? 0;
  // 灰色闭眼的脸：亮度提高到 2.5 倍，聚光灯从上方照着；变身后人物是画面里最亮的东西
  const c = C3(C.sin.col), luma = 0.299 * c.r + 0.587 * c.g + 0.114 * c.b;
  const base = s.gray ? (s.lite ? 6.2 : 6.0) :   // 灰色脸亮度提高 60%
     (s.lite ? 3.0 : 5.0) * clamp(0.42 / luma, 0.7, 1.15);   // 亮度靠人物本身（亮部仍是红色）       // 按颜色的亮度补偿：绿色不过曝、紫色不发暗
  const live = s.gray ? 0 : 1;
  for (const m of C.mats) {
    m.uniforms.uDim.value = base * (1 - 0.15 * (s.inhale ?? 0)) * (1 + 0.2 * Math.max(0, kick)) * (1 + 0.9 * (s.pop ?? 0)) * Math.pow(s.shrink ?? 1, 2);   // 缩小时粒子挤在一起，按面积压暗，不过曝
    m.uniforms.uScatter.value = sc + live * 0.008 * mid; m.uniforms.uScatterDist.value = sc > 0.1 ? 1.4 : 0.35; m.uniforms.uScatFade.value = 1;
    m.uniforms.uDrift.value = 0.005 + live * 0.006 * mid;                                           // 粒子持续流动（中音时多一点），但不糊掉五官
  }
  C.rig.scale.setScalar((1 + (s.lite ? 0.03 : 0.06) * kick) * (1 + 0.1 * (s.pop ?? 0)));   // 每一拍放大 6% 再回弹；被聚光灯照到时猛地放大 10%                // 灰色脸也跟着鼓点轻轻弹动                                                     // 低音：整体放大 4% 再回弹
  const eo = s.eyes;
  if (C.eyeShapes) C.eyeShapes.forEach(o => { o.visible = eo > 0.02 && sc < 1; o.scale.setScalar(0.35 + 0.65 * Math.min(1, eo * 1.5)); o.material.uniforms.uScatter.value = 0; });   // 贪婪的金币眼、色欲的心形眼
  C.eyes.forEach(m => { m.visible = !C.eyeShapes && eo > 0.01 && sc < 1; m.material.uniforms.uInt.value = 0.95 * eo * (1 + 0.3 * Math.max(0, kick)); m.material.uniforms.uOpen.value = 0.45 + 0.55 * eo; m.material.uniforms.uRays.value = 0.8 * eo; });
  C.eyeHalo.forEach(m => { m.visible = eo > 0.01 && sc < 1; m.material.uniforms.uInt.value = 0.28 * eo; });
  C.halo.visible = s.halo > 0.01 && sc < 1.2; C.halo.rotation.z = qw(0.35) * (a ? a.t : 0) + C.i;   // 光环一直慢慢转
  // 排成一排时光环缩小：直径不超过格子宽度的 85%、互不重叠，亮度降到 60%，外圈刻度不要
  C.halo.scale.setScalar((s.lite ? 0.42 : lerp(0.2, 1, s.halo)) * (1 - 0.3 * clamp(sc)) * (1 + (s.lite ? 0.04 : 0.1) * Math.max(0, kick)));
  C.haloMats.forEach((m, j) => { m.uniforms.uBright.value = (j ? (s.lite ? 0 : 0.3) : 0.95 * (s.lite ? 0.6 : 1)) * s.halo * (1 + 0.5 * Math.max(0, kick)) * (1 - clamp(sc)); });
  C.aura.visible = !s.gray && sc < 1.5; C.rays.visible = !s.gray && !s.lite && sc < 1.5;   // 排成一排时不要放射光线（会越过格子）
  C.aura.material.uniforms.uInt.value = (s.lite ? 0.015 : 0.045) * (1 + 0.6 * Math.max(0, kick)) * (1 - clamp(sc / 1.5));
  C.aura.scale.setScalar((s.lite ? 0.27 : 0.62) * (1 + 0.08 * Math.max(0, kick)));   // 光晕半径不超过主体高度的 1.2 倍
  C.rays.material.uniforms.uInt.value = (s.lite ? 0.03 : 0.06) * (1 + 0.5 * Math.max(0, kick)) * (1 - clamp(sc / 1.5));
  C.rays.material.uniforms.uRot.value = qw(0.22) * (a ? a.t : 0); C.rays.material.uniforms.uBurst.value = 1 + 0.45 * Math.max(0, kick);   // 放射光线随鼓点伸长
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
  C.head.rotation.set(0, (on ? 0.12 : 0.07) * Math.sin(t * qw(1.6) + C.i), (on ? 0.04 : 0.025) * Math.sin(t * qw(1.3) + C.i));   // 头一直在轻轻转动（灰色的脸也是）
  C.head.scale.setScalar(1 + 0.01 * Math.sin(t * qw(TAU / 3.2)));
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
    if (C.coins) { u(C.coins.material, 'uB', 1); u(C.coins.material, 'uC', on ? 14 + 8 * clamp(dt2 / 2) + 18 * hold : 0); }
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
const CY = '#2BC8E0', HI = '#A8F0FA', DK = '#0B3A42', WH = '#EFFFFF', GOLD = '#FFC23D', SL = 3;
const RED = CY;   // 通用代码里的“这一集的主色”
const TXTW = '#E9F1F2';   // 文字的“白色”：亮度约 238，不超过 240（大段白字不算进过曝像素）
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
  // A：抽中那一拍，“——”后面弹出“懒惰”（大一号、青色、放大回弹 + 光晕）；阅读时间按补全后的整句算
  { id: 'A', kind: 'hook', text: '刷到这条，〔你〕抽中的是——', suffix: '懒惰', want: 0.1, exact: true, size: 64 },
  { id: 'B', kind: 'hook', text: '你不是〔懒〕。', want: 4.366, size: 72 },
  { id: 'C', kind: 'hook', text: '是你的大脑，把“明天的你”当成了〔陌生人〕。', want: 6.535, size: 64 },
  { id: 'D', kind: 'sub', text: '研究发现：想到“十年后的自己”，大脑的反应像在想〔陌生人〕。', want: 10.874 },
  { id: 'E', kind: 'sub', text: '所以把事情推给明天，就像〔推给了别人〕。', want: 15.212 },
  { id: 'F', kind: 'sub', text: '大脑只占体重的〔2%〕，却耗掉约〔两成能量〕。', want: 19.551 },
  { id: 'G', kind: 'sub', text: '所以它天生想〔省力〕，能躺就不想动。', want: 22.8 },
  { id: 'H', kind: 'sub', text: '研究发现：拖延，常常不是〔时间问题〕，', want: 26.058 },
  { id: 'I', kind: 'sub', text: '而是在躲开一种〔难受的感觉〕。', want: 30.0 },
  { id: 'J', kind: 'sub', text: '先不碰它，心里就能〔舒服一会儿〕。', want: 33.1 },
  { id: 'K', kind: 'sub', text: '所以那个总说“明天再说”的你——', want: 36.904 },
  { id: 'L', kind: 'sub', text: '不是懒，只是还没〔准备好〕面对它。', want: 39.9 },
  { id: 'M', kind: 'hook', text: '你最近在拖的〔那件事〕，是什么？', want: 43.412, size: 64, minD: 3.0 },
  { id: 'N', kind: 'hook', text: '下一集：〔贪婪〕', want: 48.292, size: 56, key: GOLD },
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
  out.filter(s => s.chain === false).forEach(s => { s.t1 = beatAtOrAfter(s.t0 + s.minD); });
  return out;
}
const TX = id => TXT.find(s => s.id === id);

export function build(scene, beats, heads, audioEnv) {
  S = scene; BT = beats; B = beats.beats; TL = beats.duration; DN = beats.downbeats; BEAT = beats.beat; DROP = beats.drop;
  setAudio(audioEnv, beats);
  EV = {
    pick: nb(2.74), step1: nd(8.7), step2: nb(9.79), trio: nd(10.9), cube: nd(15.2),
    brain: nd(19.5), back: nd(28.2), calm: nd(39.07), gaze: nd(43.4), end: nd(47.7),
  };
  TXT = scheduleText();
  EV.title = EV.pick + BEAT / 2;                                        // 亮相：抽中后半拍，大标题出现、打一个大哈欠
  // 抽奖转盘：聚光灯一张脸一张脸地跳，每一跳都在节拍网格上（1/4 拍 → 1/2 拍 → 1 拍，越来越慢）；
  // 从左到右、再从右往左，慢慢经过懒惰，假停在贪婪上半拍，再退回一格落在懒惰上（= 抽中）
  { const q = BEAT / 4, g = n => B[0] + n * q;
    EV.spots = [[2, 0], [3, 1], [4, 2], [5, 3], [6, 4], [7, 5], [8, 6], [9, 5], [10, 4], [11, 3], [12, 2], [14, 3], [18, 4], [20, 3]].map(([n, i]) => ({ t: g(n), i }));
    EV.pick = EV.spots[EV.spots.length - 1].t; EV.fake = EV.spots[EV.spots.length - 2].t; }
  EV.wake = TX('B').t0;                                                  // “你不是懒。”：标题飞到左上角，同时猛地睁眼
  EV.pull = TX('C').t0;                                                  // 镜头拉远，“明天的你”出现
  EV.cols = [1, 2, 3].map(k => B[B.indexOf(EV.trio) + k]);            // 三根柱子：在三个拍点上依次升起
  EV.yawn = nextBeat(EV.cube);                                          // 打哈欠（0.6 秒张开、0.4 秒合上）
  EV.push = DROP;                                                        // 轻轻一推：正好在 drop 上
  EV.next = TX('N').t0;                                                  // 贪婪亮起（和“下一集：贪婪”同一拍）
  { const i0 = B.indexOf(nd(21.7)); EV.drain = [0, 2, 4, 6, 8].map(k => B[i0 + k]); }   // 电量：每两拍掉一格
  { const j = DN.indexOf(EV.back); EV.thornLab = [DN[j + 1], DN[j + 2], DN[j + 3]]; EV.hatDown = DN[j + 4]; }   // 三个标签：每个小节第一拍一个
  S.chars = SINS.map((sin, i) => makeChar(sin, i, heads));
  S.future = makeChar(SINS[SL], 8, heads); S.decade = makeChar(SINS[SL], 9, heads);
  S.extra = [S.future, S.decade];
  S.spot = makeSpot();
  S.stars = [makeStars(14000, -22, 1.1, 11), makeStars(5000, -9, 1.7, 12)];   // 远景小、慢；前景大、快
  S.zs = makeZs(10);
  S.cube = makeCube(); S.brain = makeBrain(); S.sand = makeSand(); S.thorns = makeThorns(); S.irises = makeIris(S.chars[SL].head);
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
// 什么时候飘 Z：抽中那一下一个；打瞌睡时每次点头到最低点一个；帽子盖住眼睛时连着三个
function scheduleZ() {
  const z = [{ t0: EV.pick + 0.12, s: 0.16 }, { t0: EV.title + 0.25, s: 0.18 }, { t0: EV.title + 0.75, s: 0.22 }, { t0: EV.title + 1.25, s: 0.2 }];
  for (const t0 of NODS()) z.push({ t0: t0 + 1.2, s: 0.18 + 0.05 * hash(t0) });
  z.push({ t0: EV.drain[4] + 0.35, s: 0.24, pos: [-1.0, 0.8, 0.3] });                          // 电量见底：大脑上方飘起一个 Z
  for (const d of [0, 0.35, 0.7]) z.push({ t0: EV.hatDown + d, s: 0.2 + 0.03 * d });            // 帽子盖住眼睛：连着三个 Z
  return z.filter(o => o.t0 < TL - 2).sort((a, b) => a.t0 - b.t0);
}
// 打瞌睡：每两小节一次（从“明天的你”出现之后），头慢慢往下点约 8 度，再缓缓抬起
const NODS = () => DN.filter((d, i) => d >= EV.step1 - 1e-3 && d < EV.brain - 2.4 && Math.round((d - EV.step1) / (4 * BEAT)) % 2 === 0);
function nodAt(t) {
  if (t >= EV.wake && t < EV.wake + 0.12) return 1 - outExpo((t - EV.wake) / 0.12);                                 // 被吓醒：猛地抬头
  for (const d of NODS()) { const u = (t - d) / (8 * BEAT); if (u >= 0 && u < 1) return u < 0.35 ? sine(u / 0.35) : u < 0.5 ? 1 : u < 0.85 ? 1 - sine((u - 0.5) / 0.35) : 0; }
  return 0;
}

// ------------------------------------------------------------ “那件事”：青白色的小方块，表面有细纹理
function makeCube() {
  const pb = new PB(), R = n => hash(n * 1.37 + 0.41);
  for (let i = 0; i < 26000; i++) {
    const f = i % 6, a = R(i * 3) - 0.5, b = R(i * 3 + 1) - 0.5, ax = f >> 1, sg = f & 1 ? 0.5 : -0.5;
    const p = ax === 0 ? [sg, a, b] : ax === 1 ? [a, sg, b] : [a, b, sg];
    const edge = Math.max(Math.abs(a), Math.abs(b)) > 0.47, line = Math.abs(Math.sin(a * 40)) < 0.12 || Math.abs(Math.sin(b * 40)) < 0.12;
    pb.add(p, [0, 0, 1], R(i * 5), [0, 0, 0], [R(i * 7), f, 0, 1], [edge ? 1.6 : line ? 0.95 : 0.5, 30]);
  }
  const m = propMat('#C8F6FC', { bright: 1.0, size: 0.012 }); m.uniforms.uAsm.value = 1;
  const g = new THREE.Group(); K.scene.add(g); const p = new THREE.Points(pb.geometry(THREE), m); p.frustumCulled = false; p.renderOrder = 32; g.add(p); K.mats.push(m); g.visible = false;
  const gl = new THREE.Mesh(new THREE.PlaneGeometry(3, 3), H.glowPlane(1)); gl.material.uniforms.uCol.value.set(CY); gl.renderOrder = 31; gl.position.z = -0.6; g.add(gl);
  return { g, m, glow: gl };
}

// ------------------------------------------------------------ 粒子大脑（侧面，沿用嫉妒/愤怒的大脑模型），青色
function makeBrain() {
  const g = new THREE.Group(); g.position.set(-1.4, 0.05, 0); g.scale.setScalar(1.15); g.rotation.y = Math.PI; K.scene.add(g); g.visible = false;
  const m = brainMaterial(CY); m.uniforms.uSeeX.value = 99; m.uniforms.uBright.value = 6.0; m.uniforms.uRegR.value = 0.02; m.uniforms.uSize.value = 0.014; m.uniforms.uHot.value.set('#CFF7FC');
  pts(buildBrainSide(511, 1).geometry(THREE), m, g, 20);
  const glowM = new THREE.Mesh(new THREE.PlaneGeometry(5.5, 5.5), H.glowPlane(0.0)); glowM.material.uniforms.uCol.value.set(CY); glowM.position.set(-1.4, 0.05, -1.6); glowM.renderOrder = -15; glowM.visible = false; K.scene.add(glowM);
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
      const k = s * per + i, u = Math.pow(hash(k * 0.913), 0.8), ang = hash(k * 1.77) * TAU, r = 0.07 * (1 - u) * Math.sqrt(hash(k * 2.31));
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
        float sq = (1.0 - uStill)*0.06*u*sin(u*7.0 - uT*2.4 + sd*17.0);   /* 缓慢蠕动 */
        vec3 p = position + d*len*uGrow*u + side*sq;
        p += normalize(vec3(sin(rr*91.0), cos(rr*53.0), sin(rr*37.0)))*uMist*(0.6 + 1.6*rr);   /* 散成雾 */
        vec4 mv = modelViewMatrix*vec4(p, 1.0); gl_Position = projectionMatrix*mv; gl_PointSize = (2.2 + 2.6*(1.0 - u))*uScale*(1.0 + 1.5*uMist);
        float b = uFade*(0.55 + 0.45*(1.0 - u))*(1.0 - 0.85*uMist)*step(u, 0.999);
        vC = mix(vec3(0.06, 0.24, 0.27), vec3(0.02, 0.08, 0.09), u)*b; }`,
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
    const m = propMat('#5FD8EA', { bright: 1.6, size: 0.006 }); m.uniforms.uAsm.value = 1;
    const o = new THREE.Points(pb.geometry(THREE), m); o.frustumCulled = false; o.renderOrder = 48; o.position.set(e[0], e[1], e[2] + 0.035); head.add(o); K.mats.push(m); o.visible = false; return o;
  });
}

// ------------------------------------------------------------ 律动：每两拍主体放大 4%（drop 之后 6%），0.3 秒回弹
function pulse(t) {
  let v = 0;
  const list = B.filter((b, i) => i % 2 === 0);
  const j = lastIdx(list, t);
  for (let k = Math.max(0, j - 1); k <= j; k++) { if (k < 0) continue; const d = t - list[k]; if (d < 0 || d > 0.4) continue; v += Math.exp(-d * 13) * Math.cos(d * 26); }
  return (t < DROP ? 0.67 : 1) * v;
}
const LINEUP = { pos: [0, 0.25, 9.6], target: [0, -0.05, 0], fov: 35 };
const lineupCam = t => orbit({ ...LINEUP, pos: [0, LINEUP.pos[1] + 0.06 * Math.sin(t * qw(1.7)), LINEUP.pos[2] - 0.18 * Math.sin(t * qw(1.1))] }, 0.03 * Math.sin(t * qw(1.9)), 0);
const camAt = (x, y, d, ty = y) => ({ pos: [x, y + 0.08, d], target: [x, ty, 0], fov: 35 });
const HW = d => Math.tan(17.5 * Math.PI / 180) * d * 16 / 9;   // 距离 d 处画面的半宽（世界单位）
// 镜头永远在动：每个场景持续缓慢推近（每秒 1%）+ 轻微环绕（±3 度）
const live = (c, t, t0, cx) => { const k = 1 - 0.01 * Math.max(0, t - t0); const p = lerp3(c.target, c.pos, k); return orbit({ ...c, pos: p }, 0.052 * Math.sin(t * qw(0.9)), cx); };
function heroLineup(t, F, AUD0, pop) {
  const AUD = { ...AUD0, mid: 0, low: 0 };
  S.chars.forEach(O => { O.g.visible = true; setState(O, { lite: true, gray: false, eyes: 1, halo: 0.85, props: 1, scatter: 0, aud: AUD, pop: pop ? pop(O.i) : 0 }); animate(O, t, 9, -9, true, AUD); });
  F.names = 1; F.series = 1; F.aired = 1; F.auraCol = '#8FB8C8'; F.auraK = 0.45;
  return lineupCam(t);
}
function setCol(C, hex) { C.mats.forEach(m => m.uniforms.uSin.value.set(hex)); C.aura.material.uniforms.uCol.value.set(hex); }

export const subsList = () => TXT.map(s => ({ text: plain(s.text), t0: +s.t0.toFixed(3), t1: +s.t1.toFixed(3), minD: +s.minD.toFixed(3) }));
export function events() {
  const big = [['转盘落在懒惰（抽中）', EV.pick], ['标题飞到左上角、睁眼', EV.wake], ['拉远、明天的你', EV.pull], ['明天的你：浅青', EV.step1], ['三个半身像', EV.trio], ['那件事', EV.cube], ['粒子大脑', EV.brain], ['回到懒惰、荆棘', EV.back], ...EV.thornLab.map((d, i) => [`荆棘标签 ${i + 1}`, d]), ['帽子盖住眼睛', EV.hatDown], ['荆棘散开、方块变柔和', EV.calm], ['正面直视', EV.gaze], ['结尾阵容', EV.end]];
  const small = [['明天的你：陌生人（第 3 拍）', EV.step2], ...EV.spots.filter(o => Math.abs(o.t - nb(o.t)) < 0.01).map((o, k) => [`转盘落在第 ${o.i + 1} 格`, o.t]), ['亮相：标题、哈欠（半拍）', EV.title], ...EV.cols.map((b, i) => [`柱子 ${i + 1}`, b]), ['打哈欠', EV.yawn], ['推方块（drop）', EV.push], ...EV.drain.map((d, i) => [`电量掉一格 ${i + 1}`, d]), ['贪婪亮起', EV.next]];
  return [...big.map(([name, t]) => ({ name, t, kind: 'big' })), ...small.map(([name, t]) => ({ name, t, kind: 'small' }))];
}
export const charsList = () => S ? [...(S.chars ?? []), ...(S.extra ?? [])] : [];

// ------------------------------------------------------------ 每帧
export function frame(t) {
  const F = { shake: 0, shock: null, bloom: 1.0, auraCol: CY, auraK: 1.0, subs: [], hooks: [], names: 0, series: 0, aired: 0, bursts: [], ca: 0, labels: [], scan: null, cols: null, corner: 0, sparkCol: HI };
  const endK = 1 - clamp((t - (TL - 0.9)) / 0.6);
  const kick = pulse(t) * endK, low = env(t, 'low'), mid = env(t, 'mid'), high = env(t, 'high');
  const bb = beatInBar(t), after = t >= DROP;
  const off = bb.k === 0 ? Math.exp(-bb.d / 0.1) * endK : 0;                // 每小节第一拍：镜头推 2% + 轻微震动（3px，drop 之后 4px）
  F.shake = off * (after ? 0.67 : 0.5);
  const AUD = { kick, low, mid, high, t, endK };
  S.chars.forEach(O => { O.g.position.set(slotX(O.i), 0, 0); O.g.rotation.set(0, 0, 0); O.g.visible = false; animate(O, t, -9, -9, false, AUD); });
  S.extra.forEach(O => { O.g.visible = false; });
  S.zs.forEach(z => { z.g.visible = false; }); S.cube.g.visible = false;
  S.brain.g.visible = false; S.brain.glow.visible = false; S.sand.visible = false; S.thorns.visible = false; S.irises.forEach(o => { o.visible = false; });
  const W = S.chars[SL];
  let cam, subj = null;                                                     // subj：主体的世界坐标（高音的小星点、Z 都围着它）
  F.corner = clamp((t - EV.wake - 0.45) / 0.1) * (1 - clamp((t - EV.end) / 0.25));
  F.title = t >= EV.title - 0.05 && t < EV.wake + 0.5 ? { a: clamp((t - EV.title) / 0.15), fly: outExpo(clamp((t - EV.wake) / 0.4)), pop: t - EV.title } : null;

  if (t < EV.pick) {
    // ---- 场景 1：第 0 帧七个彩色角色排成一排；扫描线从左扫到右、再扫回来，停在懒惰上
    cam = heroLineup(t, F, AUD);
    const j = lastIdx(EV.spots.map(o => o.t), t);
    if (j >= 0) {
      const cur = EV.spots[j], dt = t - cur.t, on = outExpo(clamp(dt / 0.05));
      S.chars.forEach(O => {
        const lit = O.i === cur.i ? on : 0, fade = O.i === cur.i ? 0 : 1;
        const k = lit ? 1.7 : 0.5;                                            // 被照到的猛地亮起；其他角色同时变暗到 50%
        O.mats.forEach(m => { m.uniforms.uDim.value *= lerp(1, k, O.i === cur.i ? on : 1); });
        O.propMats.forEach(m => { m.uniforms.uBright.value *= O.i === cur.i ? 1 + 0.5 * on : 0.5; });
        O.eyes.forEach(m => { m.material.uniforms.uInt.value *= O.i === cur.i ? 1 + 0.6 * on : 0.5; });
        O.haloMats.forEach(m => { m.uniforms.uBright.value *= O.i === cur.i ? 1 + 1.2 * on : 0.5; });
        if (O.i === cur.i) { O.rig.scale.multiplyScalar(1 + 0.12 * on); O.g.position.y += 0.1 * on + 0.12 * Math.sin(Math.PI * clamp(dt / 0.22)) * (dt < 0.22 ? 1 : 0); }   // 放大 12%、轻轻往上一弹
      });
      F.spot = { x: slotX(cur.i), a: on };
      F.tick = { c: project([slotX(cur.i), -1.5, 0.2]), k: clamp(dt / 0.28), w: project([slotX(cur.i) + 0.5, -1.5, 0.2])[0] - project([slotX(cur.i), -1.5, 0.2])[0] };   // 脚下闪一下细光环（“嗒”）
    }
  } else if (t < EV.pull) {
    // ---- 抽中：镜头 0.25 秒猛地推到懒惰的脸（占画面高约 70%，居中偏右），其他角色被甩出画面；眼睛亮起，飘出一个 Z，一次柔和的冲击波
    const dt = t - EV.pick, k = outExpo(clamp(dt / 0.25));
    S.chars.forEach(O => {
      if (O === W) return; O.g.visible = k < 0.999;
      setState(O, { lite: true, gray: false, eyes: 1, halo: 0.85 * (1 - k), props: 1, scatter: 0, aud: AUD }); animate(O, t, 9, -9, true, AUD);
      O.g.position.x = slotX(O.i) + Math.sign(O.i - SL) * 9 * k;
    });
    W.g.visible = true;
    setState(W, { lite: dt < 0.04, gray: false, eyes: 0.5 + 0.5 * outExpo(clamp(dt / 0.12)), halo: 0.85 + 0.15 * k, props: 1, scatter: 0, aud: AUD, pop: 0.6 * Math.exp(-dt / 0.25) });
    // 亮相：慢慢打一个大哈欠（0.6 秒张开、停一下、0.4 秒合上），毛线帽往下滑一点；“你不是懒。”那一拍猛地睁眼、帽子弹回去
    const yu = t - EV.title, yawn = yu < 0 ? 0 : yu < 0.6 ? sine(yu / 0.6) : yu < 0.85 ? 1 : yu < 1.25 ? 1 - sine((yu - 0.85) / 0.4) : 0;
    if (yawn > 0.5) { W.gag.visible = true; W.col.visible = false; }
    W.eyes.forEach(m => { m.material.uniforms.uInt.value *= 1 - 0.6 * yawn; });
    animate(W, t, 9, -9, true, AUD);
    W.head.rotation.x -= 0.1 * yawn;                                         // 打哈欠时头往后仰一点
    const hs = t < EV.wake ? 0.3 * sine(clamp((t - EV.title) / 1.1)) : 0.3 * (1 - outExpo(clamp((t - EV.wake) / 0.15)));
    if (W.hat) W.hat.material.uniforms.uB.value = hs;
    const close = camAt(-0.30 * HW(3.7), 0.2, 3.7);
    cam = camLerp(lineupCam(t), live(close, t, EV.pick, 0), k);
    F.names = 1 - clamp(dt / 0.15); F.aired = F.names; F.series = 1 - clamp(dt / 0.08);
    if (dt < 0.5) F.shock = { c: project([0, HEAD_C[1], 0.3]), r: 0.55 * outExpo(dt / 0.5), a: 0.45 * (1 - dt / 0.5), col: HI };
    if (dt < 0.12) F.shake = Math.max(F.shake, 0.5 * (1 - dt / 0.12));
    F.bursts.push({ t0: EV.pick, pos: [0, HEAD_C[1] + 0.5, 0.3], n: 30, speed: 0.8, life: 0.6, grav: -0.1, seed: 7, bright: 1.6 });
    subj = [0, HEAD_C[1], 0];
  } else if (t < EV.trio) {
    // ---- 被吓醒：猛地睁眼，镜头拉远，懒惰移到画面左侧 1/3；右侧远处的雾里出现一个一模一样的“明天的你”
    const dt = t - EV.pull, k = inOut(clamp(dt / 0.5));
    W.g.visible = true;
    setState(W, { lite: false, gray: false, eyes: 1, halo: 1, props: 1, scatter: 0, aud: AUD }); animate(W, t, 9, -9, true, AUD);
    const D = 8.2, cx = 0.333 * HW(D);
    const close = live(camAt(-0.30 * HW(3.7), 0.2, 3.7), t, EV.pick, 0), wide = live(camAt(cx, -0.35, D), t, EV.pull, cx);
    cam = camLerp(close, wide, k);
    // 明天的你：每个小节第一拍往远处退一步，颜色褪掉一层（青 → 浅青 → 灰），五官变模糊，帽子和围巾消失
    const U = S.future, s1 = inOut(clamp((t - EV.step1) / 1.4)), s2 = inOut(clamp((t - EV.step2) / 0.9));
    const z = lerp(lerp(-6, -9.5, s1), -13, s2), fx = cx + 0.5 * HW(D - z), asm = clamp(dt / 0.5);
    U.g.visible = true; U.g.position.set(fx, -0.1 * (1 - s2), z);
    setState(U, { lite: false, gray: s2 > 0.5, eyes: lerp(1, 0.35, s1) * (1 - s2), halo: 0, props: lerp(1, 0.45, s1) * (1 - s2), scatter: 1.6 * (1 - asm) + 0.012 * s1 + 0.03 * s2, aud: AUD });
    animate(U, t, 9, -9, true, AUD);
    setCol(U, hexs(C3(CY).lerp(C3('#7FC9D4'), s1)));
    U.mats.forEach(m => { m.uniforms.uDim.value *= lerp(0.8, 0.55, s2) * asm; }); U.aura.material.uniforms.uInt.value *= 0.6;
    const lp = project([fx, -1.75, z]);
    F.labels.push({ text: s2 > 0.5 ? '陌生人' : '明天的你', x: lp[0], y: lp[1] + 34, a: asm * (s2 > 0.5 ? clamp((t - EV.step2 - 0.3) / 0.2) : 1 - clamp((t - EV.step2) / 0.15)) });
    subj = [0, HEAD_C[1], 0];
  } else if (t < EV.cube) {
    // ---- 三个并排的半身像：现在的你（青）、十年后的你（变淡、没有帽子）、陌生人（灰）；头顶“大脑的反应”柱子在三个拍点上依次升起
    const dt = t - EV.trio, k = inOut(clamp(dt / 0.5));
    const D0 = 8.2, cx0 = 0.333 * HW(D0), D = 10.6, XS = [-2.9, 0, 2.9];
    cam = camLerp(live(camAt(cx0, -0.35, D0), t, EV.pull, cx0), live(camAt(0, 0.05, D, 0.0), t, EV.trio, 0), k);
    W.g.visible = true; W.g.position.set(lerp(0, XS[0], k), 0, 0);
    setState(W, { lite: false, gray: false, eyes: 1, halo: 1, props: 1, scatter: 0, aud: AUD }); animate(W, t, 9, -9, true, AUD);
    const Dc = S.decade; Dc.g.visible = true; Dc.g.position.set(XS[1], 0, 0);
    setState(Dc, { lite: false, gray: false, eyes: 0.55, halo: 0, props: 1, scatter: 2.2 * (1 - k), aud: AUD }); animate(Dc, t, 9, -9, true, AUD);
    setCol(Dc, '#6FB7C3'); Dc.mats.forEach(m => { m.uniforms.uDim.value *= 0.62; }); if (Dc.hat) Dc.hat.visible = false; if (Dc.zz) Dc.zz.visible = false;
    Dc.aura.material.uniforms.uInt.value *= 0.5;
    const U = S.future, cxw = 0.333 * HW(D0), fx = cxw + 0.5 * HW(D0 + 13);
    U.g.visible = true; U.g.position.set(lerp(fx, XS[2], k), 0, lerp(-13, 0, k));
    setState(U, { lite: false, gray: true, eyes: 0, halo: 0, props: 0, scatter: 0.03 * (1 - k), aud: AUD }); animate(U, t, 9, -9, true, AUD); U.mats.forEach(m => { m.uniforms.uDim.value *= lerp(0.55, 0.7, k); });
    const la = clamp((dt - 0.45) / 0.25);
    ['现在的你', '十年后的你', '陌生人'].forEach((s, i) => { const p = project([XS[i], -1.72, 0.3]); F.labels.push({ text: s, x: p[0], y: p[1] + 40, a: la }); });
    // 柱子：现在的你最高最亮；十年后的你只有一半左右；陌生人和十年后的你差不多高
    const H0 = [1.0, 0.5, 0.47], BR0 = [1.0, 0.55, 0.5];
    F.cols = XS.map((x, i) => { const u = t - EV.cols[i], h = u < 0 ? 0 : outBack(clamp(u / 0.35)); const b = project([x, 1.38, 0]), tp = project([x, 1.38 + 1.75 * H0[i] * h, 0]); return { x: b[0], y0: b[1], y1: tp[1], a: clamp(u / 0.1) * (u >= 0 ? 1 : 0), br: BR0[i], flash: u >= 0 ? Math.exp(-u / 0.2) : 0 }; });
    F.colLabel = clamp((t - EV.cols[0]) / 0.25);
    subj = [W.g.position.x, HEAD_C[1], 0];
  } else if (t < EV.brain - 0.45) {
    // ---- 三个半身像散开，懒惰回到画面中央偏左；面前出现“那件事”。打一个哈欠，轻轻一推，方块滑向远处的灰色陌生人，停在它脚下
    const dt = t - EV.cube, k = inOut(clamp(dt / 0.5));
    const XS = [-2.9, 0, 2.9], D = 7.6, home = -1.35;
    cam = camLerp(live(camAt(0, 0.05, 10.6, 0.0), t, EV.trio, 0), live(camAt(0, -0.3, D), t, EV.cube, 0), k);
    W.g.visible = true; W.g.position.set(lerp(XS[0], home, k), 0, 0);
    // 哈欠：0.6 秒张开、0.4 秒合上（张嘴的脸和平常的脸交替显示）
    const yu = t - EV.yawn, yawn = yu < 0 ? 0 : yu < 0.6 ? sine(yu / 0.6) : yu < 0.8 ? 1 : yu < 1.2 ? 1 - sine((yu - 0.8) / 0.4) : 0;
    setState(W, { lite: false, gray: false, eyes: 1 - 0.5 * yawn, halo: 1, props: 1, scatter: 0, aud: AUD, gag: yawn > 0.5 }); animate(W, t, 9, -9, true, AUD);
    const Dc = S.decade; if (k < 1) { Dc.g.visible = true; Dc.g.position.set(0, 0, 0); setState(Dc, { lite: false, gray: false, eyes: 0.55 * (1 - k), halo: 0, props: 1, scatter: 2.4 * k, aud: AUD }); setCol(Dc, '#6FB7C3'); Dc.mats.forEach(m => { m.uniforms.uDim.value *= 0.62 * (1 - k); }); if (Dc.hat) Dc.hat.visible = false; }
    const U = S.future, far = [4.2, -0.2, -9]; U.g.visible = true; U.g.position.set(...lerp3([XS[2], 0, 0], far, k));
    setState(U, { lite: false, gray: true, eyes: 0, halo: 0, props: 0, scatter: 0.02, aud: AUD }); animate(U, t, 9, -9, true, AUD); U.mats.forEach(m => { m.uniforms.uDim.value *= lerp(1, 0.7, k); });
    // 方块：先在懒惰面前聚起来，推的那一拍沿地面滑向远处的陌生人
    const c0 = [home + 1.25, -1.55, 1.0], c1 = [far[0] - 0.1, far[1] - 2.45, far[2] + 0.4];
    const pu = clamp((t - EV.push) / 1.7), sl = 1 - Math.pow(1 - pu, 3), ca = clamp((dt - 0.15) / 0.4);
    const cp = lerp3(c0, c1, sl); cp[1] += 0.05 * Math.sin(Math.PI * sl);
    S.cube.g.visible = ca > 0; S.cube.g.position.set(...cp); S.cube.g.scale.setScalar(lerp(0.62, 0.5, sl) * (0.6 + 0.4 * outBack(ca)));
    S.cube.g.rotation.set(0.35, 0.6 + 0.3 * sl + 0.1 * Math.sin(t * qw(0.8)), 0);
    S.cube.m.uniforms.uScatter.value = 1.2 * (1 - ca); S.cube.m.uniforms.uBright.value = 2.2 * ca * (1 + 0.4 * Math.max(0, kick));
    S.cube.glow.material.uniforms.uInt.value = 0.08 * ca; S.cube.glow.quaternion.copy(K.camera.quaternion);
    const pd = t - EV.push; if (pd >= 0 && pd < 0.45) W.head.rotation.x += 0.12 * Math.sin(Math.PI * pd / 0.45);   // 用头轻轻一顶
    const cpp = project(cp); F.labels.push({ text: '那件事', x: cpp[0] + 44 + 40 * (1 - sl), y: cpp[1] - 70 * (1 - 0.6 * sl), a: ca * (1 - clamp((pu - 0.12) / 0.15)), align: 'left' });
    const sp = project([far[0], -1.75, far[2]]); F.labels.push({ text: '陌生人', x: sp[0], y: sp[1] + 30, a: clamp((dt - 0.5) / 0.3) * 0.9 * (1 - clamp((t - EV.push) / 0.2) * (1 - clamp((pu - 0.4) / 0.2))), small: true });
    subj = [W.g.position.x, HEAD_C[1], 0];
  } else if (t < EV.back) {
    // ---- 场景 3：大脑天生爱省电。所有粒子飞散，汇聚成青色的粒子大脑（侧面，占画面高约 60%，偏左）；右侧电池（5 格）+ 小人形（大脑亮一小块）
    const t0 = EV.brain - 0.45, dt = t - t0, k = clamp(dt / 0.45);
    const camB = live(camAt(0, 0.0, 5.4), t, EV.brain, 0);
    cam = camLerp(live(camAt(0, -0.3, 7.6), t, EV.cube, 0), camB, inOut(clamp(dt / 0.5)));
    if (dt < 0.6) {                                                           // 上一个场景的主体化成粒子飞走（和大脑的汇聚重叠，主体不会消失）
      const out = clamp(dt / 0.45); W.g.visible = out < 1; W.g.position.set(-1.35, 0, 0);
      setState(W, { lite: false, gray: false, eyes: 1 - out, halo: 1 - out, props: 1, scatter: 2.4 * outExpo(out), aud: AUD }); animate(W, t, 9, -9, true, AUD);
      W.mats.forEach(m => { m.uniforms.uDim.value *= 1 - 0.7 * out; });
    }
    const Bn = S.brain; Bn.g.visible = true; brainAsm(outExpo(k));
    // 电量：每两拍掉一格（第 1、3 拍），掉的那一下大脑亮一下（像在思考）、一次小冲击波
    const lvl = 5 - EV.drain.filter(d => t >= d).length, last = EV.drain.filter(d => t >= d).pop();
    const think = last != null ? Math.exp(-(t - last) / 0.22) : 0, endD = EV.drain[EV.drain.length - 1], dead = clamp((t - endD - 0.1) / 0.8);
    Bn.m.uniforms.uBright.value = 6.0 * (1 + 0.9 * think) * (1 - 0.65 * dead) * (1 + 0.15 * Math.max(0, kick));
    Bn.glow.visible = true; Bn.glow.material.uniforms.uInt.value = (0.05 + 0.06 * think) * (1 - 0.7 * dead); Bn.glow.quaternion.copy(K.camera.quaternion);
    Bn.g.rotation.y = Math.PI + 0.12 * Math.sin(t * qw(0.7));
    S.sand.visible = dead > 0; S.sand.material.uniforms.uOn.value = dead * (1 - clamp((t - EV.back + 0.6) / 0.5)); S.sand.material.uniforms.uT.value = t - endD;
    const ba = clamp((t - EV.brain - 0.1) / 0.3) * (1 - clamp((t - EV.back + 0.35) / 0.3));
    F.battery = { a: ba, lvl, drop: last != null ? clamp((t - last) / 0.18) : 1, empty: lvl === 0 ? t - endD : -1 };
    if (last != null && t - last < 0.45) F.shock = { c: [1500, 575], r: 0.06 + 0.12 * outExpo((t - last) / 0.45), a: 0.4 * (1 - (t - last) / 0.45), col: HI };
    subj = [-1.4, 0.1, 0];
  } else if (t < EV.calm) {
    // ---- 场景 4：拖延，是在躲一种感觉。大脑的粒子汇聚回懒惰（左侧，约 60% 高）；右侧“那件事”回来了，三倍大，渗出暗色荆棘
    const dt = t - EV.back, k = clamp(dt / 0.5), D = 7.4;
    cam = camLerp(live(camAt(0, 0.0, 5.4), t, EV.brain, 0), live(camAt(0, -0.4, D), t, EV.back, 0), inOut(k));
    if (k < 1) { const Bn = S.brain; Bn.g.visible = true; brainAsm(1 - outExpo(k)); Bn.m.uniforms.uBright.value = 2.1; }
    const steps = EV.thornLab.filter(d => t >= d).length, sk = EV.thornLab.reduce((a, d) => a + outExpo(clamp((t - d) / 0.4)), 0);   // 每亮一个标签，荆棘伸长一点
    const hd = outExpo(clamp((t - EV.hatDown) / 0.5));                      // 第三个标签之后的下一个小节第一拍：帽子整个滑下来盖住眼睛
    W.g.visible = true; W.g.position.set(-2.45 - 0.0 * sk, 0, -0.28 * sk);
    setState(W, { lite: false, gray: false, eyes: 1 - hd, halo: 1, props: 1, scatter: 2.2 * (1 - outExpo(k)), aud: AUD }); animate(W, t, 9, -9, true, AUD);
    W.head.rotation.x += 0.05 * sk - 0.04 * hd; W.g.rotation.y = 0.12 * sk / 3;                       // 往后缩一点
    if (W.hat) W.hat.material.uniforms.uB.value = 0.3 * sk / 3 * (1 - hd) + 1.35 * hd;          // 把帽子往下拉一点 → 整个盖住
    W.eyes.forEach(m => { m.visible = m.visible && hd < 0.6; });
    const cc = [2.0, -0.55, 0.2], ck = clamp((dt - 0.15) / 0.45);
    S.cube.g.visible = true; S.cube.g.position.set(...cc); S.cube.g.scale.setScalar(1.45 * (0.5 + 0.5 * outBack(ck)));
    S.cube.g.rotation.set(0.32, 0.55 + 0.08 * Math.sin(t * qw(0.6)), 0.05 * Math.sin(t * qw(0.9)));
    S.cube.m.uniforms.uScatter.value = 1.4 * (1 - ck); S.cube.m.uniforms.uBright.value = 3.4 * ck * (1 + 0.3 * Math.max(0, kick)); setCubeCol('#C8F6FC');
    S.cube.glow.material.uniforms.uInt.value = 0.04 * ck; S.cube.glow.quaternion.copy(K.camera.quaternion);
    const T = S.thorns; T.visible = true; T.material.uniforms.uGrow.value = clamp(dt / 0.8) * (0.32 + 0.22 * sk) * (1 + 0.03 * Math.sin(t * qw(1.3)));
    T.material.uniforms.uLean.value = 0.25 + 0.2 * sk; T.material.uniforms.uFade.value = ck; T.material.uniforms.uT.value = t; T.material.uniforms.uStill.value = hd;
    const cs = project(cc);
    ['怕做不好', '没有头绪', '太累了'].forEach((s, i) => { const d = t - EV.thornLab[i]; if (d < 0) return; F.labels.push({ text: s, x: 1640, y: cs[1] - 150 + 150 * i, a: clamp(d / 0.12), align: 'left', pop: d }); });
    subj = [W.g.position.x, HEAD_C[1], W.g.position.z];
  } else if (t < EV.gaze) {
    // ---- 场景 5：只是还没准备好。荆棘像雾一样散开，方块缩小、变柔和（浅青色）；懒惰慢慢把帽子往上推，眼睛慢慢睁开，镜头缓慢推近到脸
    const dt = t - EV.calm, u = clamp(dt / (EV.gaze - EV.calm)), fog = clamp(dt / 1.6);
    const px = lerp(-2.45, -0.9, inOut(u));
    cam = camLerp(live(camAt(0, -0.4, 7.4), t, EV.back, 0), { pos: [px + 0.15, 0.15, 4.2], target: [px + 0.15, 0.05, 0], fov: 35 }, inOut(clamp(dt / 4.2)));
    const up = sine(clamp((dt - 0.5) / 1.8)), open = sine(clamp((dt - 1.6) / 1.8));
    W.g.visible = true; W.g.position.set(px, 0, -0.84 * (1 - inOut(u)));
    setState(W, { lite: false, gray: false, eyes: open, halo: 1, props: 1, scatter: 0, aud: AUD }); animate(W, t, 9, -9, true, AUD);
    W.g.rotation.y = 0.12 * (1 - u);
    if (W.hat) W.hat.material.uniforms.uB.value = 1.35 * (1 - up);
    W.eyes.forEach(m => { m.visible = m.visible && up > 0.5; m.material.uniforms.uInt.value *= 0.75; });
    const T = S.thorns; T.visible = fog < 1; T.material.uniforms.uFade.value = 1 - fog; T.material.uniforms.uMist.value = fog; T.material.uniforms.uT.value = t; T.material.uniforms.uStill.value = 1 - fog;
    T.material.uniforms.uGrow.value = 0.98 + 0.2 * fog;
    const cs = lerp(1.45, 0.55, inOut(clamp(dt / 1.6))), cp = lerp3([2.0, -0.55, 0.2], [px + 1.5, -1.25, 0.9], inOut(u));
    S.cube.g.visible = true; S.cube.g.position.set(...cp); S.cube.g.scale.setScalar(cs); S.cube.g.rotation.set(0.32, 0.55 + 0.25 * u, 0);
    setCubeCol(hexs(C3('#C8F6FC').lerp(C3('#A8F0FA'), fog))); S.cube.m.uniforms.uBright.value = lerp(3.4, 2.0, fog); S.cube.m.uniforms.uScatter.value = 0.03 * fog;   // 变柔和
    S.cube.glow.material.uniforms.uInt.value = 0.04 + 0.03 * fog; S.cube.glow.quaternion.copy(K.camera.quaternion);
    subj = [px, HEAD_C[1], 0];
  } else if (t < EV.end) {
    // ---- 场景 6：正面直视镜头，脸在画面上方约 60%；眼睛是两团清楚的青光（虹膜圆环 + 瞳孔），嘴角放松
    const dt = t - EV.gaze, k = inOut(clamp(dt / 0.6));
    const from = { pos: [-0.9 + 0.15, 0.15, 4.2], target: [-0.9 + 0.15, 0.05, 0], fov: 35 }, to = { pos: [0, -0.42, 3.75], target: [0, -0.45, 0], fov: 35 };
    cam = camLerp(from, { ...to, pos: lerp3(to.target, to.pos, 1 - 0.008 * Math.max(0, dt - 0.6)) }, k);
    W.g.visible = true; W.g.position.set(lerp(-0.9, 0, k), 0, 0);
    setState(W, { lite: false, gray: false, eyes: 1, halo: 1, props: 1, scatter: 0, aud: AUD }); animate(W, t, 9, -9, true, AUD);
    W.head.rotation.set(0.04 * (1 - k), 0.05 * (1 - k) * Math.sin(t * qw(1.6)), 0);
    W.mats.forEach(m => { m.uniforms.uDim.value *= lerp(1, 0.74, k); });   // 特写时脸压暗一点：亮于 240 的像素不超过 0.3%
    if (W.hat) W.hat.material.uniforms.uB.value = 0;
    S.irises.forEach(o => { o.visible = k > 0.02; o.material.uniforms.uBright.value = 1.25 * k; });
    W.eyes.forEach(m => { m.scale.y = 1; m.position.y = FACE.eyeR[1]; m.material.uniforms.uInt.value *= 1 - 0.75 * k; });
    W.eyeHalo.forEach(m => { m.material.uniforms.uInt.value *= 1 - 0.5 * k; });
    const ca = 1 - clamp(dt / 0.4); S.cube.g.visible = ca > 0; S.cube.g.position.set(-0.9 + 1.5, -1.25, 0.9); S.cube.g.scale.setScalar(0.55); S.cube.m.uniforms.uScatter.value = 1.5 * (1 - ca); S.cube.m.uniforms.uBright.value = 1.1 * ca;
    subj = [W.g.position.x, HEAD_C[1], 0];
  } else {
    // ---- 场景 7：下集预告。懒惰缩小回到那一排；其他六个角色从两侧飞回。傲慢、嫉妒、愤怒、懒惰彩色睁眼（已播出），贪婪、暴食、色欲灰色闭眼
    // 下一拍贪婪亮起一圈金光、睁一下眼，头顶“下一集”；最后 0.3 秒回到第 0 帧（七个都是彩色）
    const dt = t - EV.end, k = inOut(clamp(dt / 0.5)), fin = t >= TL - 0.3;
    cam = camLerp({ pos: [0, -0.42, 3.75], target: [0, -0.45, 0], fov: 35 }, lineupCam(t), k);
    if (fin) { cam = heroLineup(t, F, AUD); }
    else {
      const A0 = { ...AUD, mid: 0, low: 0 };
      S.chars.forEach(O => {
        O.g.visible = true; const aired = O.i <= SL;
        setState(O, { lite: k > 0.5 || O !== W, gray: !aired, eyes: aired ? 1 : 0, halo: aired ? 0.85 : 0, props: 1, scatter: 0, aud: A0 }); animate(O, t, 9, -9, true, A0);
        if (O !== W) O.g.position.x = slotX(O.i) + Math.sign(O.i - SL) * 7 * (1 - outExpo(clamp((dt - 0.1) / 0.5)));
      });
      const G = S.chars[4], gu = t - EV.next;
      if (gu >= 0) {                                                       // 贪婪：睁一下眼（金色），一圈金光
        const blink = Math.exp(-gu / 0.5); G.eyes.forEach(m => { m.visible = true; m.material.uniforms.uInt.value = 0.95 * blink; m.material.uniforms.uOpen.value = 0.5 + 0.5 * blink; });
        F.goldRing = { c: project([slotX(4), HEAD_C[1], 0.3]), a: clamp(gu / 0.1) * (1 - clamp((t - (TL - 0.45)) / 0.15)), k: gu };
        const p = project([slotX(4), 1.18, 0]); F.nextTag = { x: p[0], y: p[1], a: clamp(gu / 0.15) * (1 - clamp((t - (TL - 0.45)) / 0.15)) };
      }
      F.names = clamp((dt - 0.35) / 0.35); F.aired4 = F.names; F.auraCol = '#8FB8C8'; F.auraK = 0.45;
    }
    subj = null;
  }
  // 打瞌睡（头往下点约 8 度）
  if (W.g.visible && t >= EV.pick) W.head.rotation.x += 0.14 * nodAt(t);
  // 刚被吓醒：眼睛睁圆 1.5 秒，再慢慢回到半睁
  if (W.g.visible && t < EV.gaze) { const wu = t - EV.wake, open = wu < 0 ? 0 : wu < 1.5 ? 1 : 1 - clamp((wu - 1.5) / 0.6); W.eyes.forEach(m => { m.scale.y = lerp(0.4, 1, open); m.position.y = lerp(FACE.eyeR[1] - 0.012, FACE.eyeR[1], open); m.material.uniforms.uInt.value *= 1 + 0.5 * open; }); }
  // 头顶飘出的 Z
  if (subj) ZS.forEach((z, i) => {
    const u = (t - z.t0) / 1.5; if (u < 0 || u >= 1) return;
    const o = S.zs[i % S.zs.length], hp = z.pos ? { x: z.pos[0] - 0.78, y: 0, z: 0 } : W.g.position, hy = z.pos ? z.pos[1] - HEAD_C[1] - 0.42 : 0;
    o.g.visible = true; o.g.position.set(hp.x + 0.78 + 0.25 * u + 0.06 * Math.sin(u * 7), HEAD_C[1] + 0.42 + 0.42 * u + hy, 0.25 + (hp.z || 0)); o.g.rotation.z = -0.25 + 0.2 * Math.sin(u * 5);
    o.g.scale.setScalar(z.s * (0.6 + 0.6 * u)); o.g.quaternion.multiply(new THREE.Quaternion());
    o.m.uniforms.uBright.value = 1.1 * clamp(u / 0.15) * (1 - clamp((u - 0.6) / 0.4)); o.m.uniforms.uScatter.value = 0.6 * clamp((u - 0.55) / 0.45); o.m.uniforms.uScatterDist.value = 0.6;
  });
  // 高音：每个 hats 在主体周围随机位置闪一颗青白色小星点（0.15 秒消失）
  if (subj && high > 0.15) for (let h = Math.max(0, lastIdx(A.hats, t) - 2); h <= lastIdx(A.hats, t); h++) {
    const ht = A.hats[h]; if (h < 0 || t - ht > 0.15) continue;
    const a = hash(h * 3.1) * TAU, rr = 1.0 + 0.6 * hash(h * 5.7);
    F.bursts.push({ t0: ht, pos: [subj[0] + Math.cos(a) * rr, subj[1] + Math.sin(a) * rr * 0.8, 0.3], n: 2, speed: 0.15, life: 0.15, grav: 0, seed: h, bright: 1.8 });
  }
  // 每小节第一拍镜头推 2%
  cam = { ...cam, pos: lerp3(cam.target, cam.pos, 1 - 0.02 * off) };
  S.spot.material.uniforms.uInt.value = F.spot ? 0.22 * F.spot.a : 0; if (F.spot) { S.spot.position.set(F.spot.x, 2.2, 0.6); S.spot.material.uniforms.uCol.value.set('#DFFBFF'); }
  S.stars.forEach(s => { s.material.uniforms.uScale.value = K.scale; });
  for (const s of TXT) if (t >= s.t0 - 0.01 && t <= s.t1 + 0.12) (s.kind === 'sub' ? F.subs : F.hooks).push(s);
  // 给检查用：主体的脸（含帽子）和道具在屏幕上的范围（用这一帧的镜头投影）
  F.subjBoxes = [];
  if (W.g.visible && t >= EV.pick && t < EV.end) { const hp = W.g.position, a2 = project([hp.x - 0.62, HEAD_C[1] + 0.95, hp.z + 0.2]), b2 = project([hp.x + 0.62, HEAD_C[1] - 0.82, hp.z + 0.2]); F.subjBoxes.push({ name: '懒惰的脸和帽子', x0: a2[0], y0: a2[1], x1: b2[0], y1: b2[1] }); }
  if (S.cube.g.visible) { const c = S.cube.g.position, r = 0.62 * S.cube.g.scale.x, a2 = project([c.x - r, c.y + r, c.z]), b2 = project([c.x + r, c.y - r, c.z]); F.subjBoxes.push({ name: '那件事', x0: a2[0], y0: a2[1], x1: b2[0], y1: b2[1] }); }
  F.cam = cam; F.kick = kick;
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
    if (o.hook) { ctx.lineJoin = 'round'; ctx.lineWidth = 4; ctx.strokeStyle = 'rgba(2,10,12,0.92)'; ctx.strokeText(s, x, y); }
    ctx.shadowColor = k ? keyCol : (o.hook ? 'rgba(168,240,250,0.35)' : 'rgba(0,0,0,0.8)'); ctx.shadowBlur = k ? 14 : o.hook ? 8 : 6;
    ctx.fillStyle = col; ctx.fillText(s, x, y);
    ctx.restore(); x += ws[j];
  });
  BOXES.push({ x0, x1: x0 + W2, y0: y - size * 0.6, y1: y + size * 0.6, label: plain(text), alpha: a });
  return { x0, x1: x0 + W2 };
}
function drawSub2(t, ctx, s) {
  if (t < s.t0 || t > s.t1 + 0.12) return;
  const a = Math.min(clamp((t - s.t0) / 0.06), 1 - clamp((t - s.t1) / 0.12));
  ctx.save(); const g = ctx.createLinearGradient(0, 842, 0, 1080); g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, `rgba(0,0,0,${0.65 * a})`); ctx.fillStyle = g; ctx.fillRect(0, 842, 1920, 238); ctx.restore();
  const sc = popScale(t - s.t0);
  ctx.save(); ctx.translate(960, 965); ctx.scale(sc, sc); richText(ctx, s.text, 0, 0, 52, a, HI); ctx.restore();   // 基线约在画面高度 91%
}
function hookPos(s, t) {
  if (s.id === 'A') { const k = outExpo(clamp((t - EV.pick) / 0.25)); return [lerp(960, 90, k), 905, k > 0.5 ? 'left' : 'center']; }   // 抽中后跟着镜头移到脸的左边
  if (s.id === 'B') return [470, 700, 'center'];                         // 脸的左侧，不压脸
  if (s.id === 'C') return [960, 120, 'center'];                         // 画面上方（拉远后人物在左、“明天的你”在右）
  if (s.id === 'N') return [960, 905, 'center'];
  if (s.id === 'M') return [960, 985, 'center'];                         // 脸在上方 60%，问话放在最下面，不压围巾
  return [960, 930, 'center'];
}
function drawHook(t, ctx, s) {
  if (t < s.t0 || t > s.t1 + 0.12) return;
  const a = Math.min(clamp((t - s.t0) / 0.06), 1 - clamp((t - s.t1) / 0.12)), [x, y, al] = hookPos(s, t), sc = popScale(t - s.t0);
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
  ctx.font = fs(700, 36); ctx.fillStyle = 'rgba(233,241,242,0.8)'; ctx.shadowColor = 'rgba(0,0,0,0.8)'; ctx.shadowBlur = 6; ctx.fillText('七宗罪 · 第四宗', 0, -125);
  ctx.font = fs(900, 170); ctx.shadowColor = CY; ctx.shadowBlur = 40; ctx.fillStyle = CY; ctx.fillText('懒惰', 0, 10); ctx.shadowBlur = 14; ctx.fillStyle = '#5FD8EA'; ctx.fillText('懒惰', 0, 10);
  ctx.restore();
  if (k < 0.5) BOXES.push({ x0: cx - 180 * sc, x1: cx + 180 * sc, y0: cy - 150 * sc, y1: cy + 100 * sc, label: '懒惰（标题）', alpha: a });
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
  BOXES.push({ x0: cx - w / 2, x1: cx + w / 2, y0: L.y - h / 2, y1: L.y + h / 2, label: L.text, alpha: L.a });
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
  if (B2.empty >= 0) { const fl = [0.5, 1.0].reduce((m, s) => Math.max(m, Math.exp(-Math.pow((B2.empty - s) / 0.08, 2))), 0); ctx.globalAlpha = B2.a * fl; ctx.fillStyle = DK; ctx.shadowColor = DK; ctx.shadowBlur = 20; ctx.beginPath(); ctx.roundRect(x - w / 2 + 8, y0 + 8, w - 16, y1 - y0 - 16, 10); ctx.fill(); }
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
export function draw2D(t, ctx, F) {
  // 第 0 帧：上方“七宗罪 · 第四集”（和愤怒第 0 帧同一套）
  if (!window.COVER && F.series > 0.001) glowText('七宗罪 · 第四集', 960, 92, fs(700, 60), '#EEF8FA', { glow: 22, glowColor: '#FFFFFF', nobox: true, alpha: F.series });
  // 左上角常驻小字
  if (!window.COVER && F.corner > 0.001) { ctx.save(); ctx.globalAlpha = 0.7 * F.corner; ctx.font = fs(700, 28); ctx.textBaseline = 'middle'; ctx.fillStyle = TXTW; ctx.shadowColor = 'rgba(0,0,0,0.8)'; ctx.shadowBlur = 6; ctx.fillText('七宗罪 · 04 / 07 · 懒惰', 60, 58); ctx.restore(); }
  if (F.title) drawTitle2(ctx, t, F.title);
  // 名字（排成一排时，在肩膀下方，带暗色底）
  if (F.names > 0) S.chars.forEach(C => {
    const p = project([C.g.position.x, -1.78, 0]);
    ctx.save(); ctx.globalAlpha = 0.62 * F.names; ctx.fillStyle = '#0B0912'; ctx.beginPath(); ctx.roundRect(p[0] - 60, p[1] - 27, 120, 54, 10); ctx.fill(); ctx.restore();
    glowText(C.sin.name, p[0], p[1] + 2, fs(700, 38), tone(C.sin.col, 0.25), { alpha: F.names, glow: 12, glowColor: C.sin.col });
  });
  // 已播出（傲慢、嫉妒、愤怒）
  if (F.aired > 0) [0, 1, 2].forEach(i => { const C = S.chars[i], p = project([C.g.position.x, 1.18, 0]); glowText('已播出', p[0], p[1], fs(700, 24), tone(C.sin.col, 0.4), { alpha: F.aired, glow: 10, glowColor: C.sin.col }); });
  // 扫描线
  if (F.scan) {
    const x = F.scan.x; ctx.save(); ctx.globalAlpha = F.scan.a; ctx.globalCompositeOperation = 'lighter';
    const g = ctx.createLinearGradient(x - 70, 0, x + 70, 0); g.addColorStop(0, 'rgba(43,200,224,0)'); g.addColorStop(0.5, 'rgba(120,225,240,0.35)'); g.addColorStop(1, 'rgba(43,200,224,0)');
    ctx.fillStyle = g; ctx.fillRect(x - 70, 140, 140, 760); ctx.fillStyle = 'rgba(225,250,255,0.95)'; ctx.fillRect(x - 1.5, 140, 3, 760); ctx.restore();
  }
  if (F.tick && F.tick.k < 1) { const T2 = F.tick, r = T2.w * (0.6 + 0.6 * outExpo(T2.k)); ctx.save(); ctx.globalAlpha = 0.9 * (1 - T2.k); ctx.strokeStyle = '#CFF7FC'; ctx.lineWidth = 2; ctx.shadowColor = CY; ctx.shadowBlur = 10; ctx.beginPath(); ctx.ellipse(T2.c[0], T2.c[1], r, r * 0.22, 0, 0, TAU); ctx.stroke(); ctx.restore(); }
  // 大脑的反应：三根发光的竖柱
  if (F.cols) {
    for (const c of F.cols) { if (c.a <= 0) continue;
      ctx.save(); ctx.globalAlpha = c.a; const w = 48, g = ctx.createLinearGradient(0, c.y0, 0, c.y1);
      g.addColorStop(0, `rgba(43,200,224,${0.55 * c.br})`); g.addColorStop(1, `rgba(168,240,250,${0.9 * c.br})`);
      ctx.shadowColor = CY; ctx.shadowBlur = 18 * c.br + 20 * c.flash; ctx.fillStyle = g; ctx.beginPath(); ctx.roundRect(c.x - w / 2, Math.min(c.y1, c.y0 - 2), w, Math.max(2, c.y0 - c.y1), 8); ctx.fill();
      ctx.fillStyle = `rgba(239,255,255,${0.7 * c.br})`; ctx.fillRect(c.x - w / 2 + 4, c.y1 + 2, w - 8, 3);
      ctx.restore(); }
    if (F.colLabel > 0) { const c = F.cols[0]; drawTag(ctx, { text: '大脑的反应', x: c.x - 40, y: c.y0 - 26, a: F.colLabel, align: 'right' }); }
  }
  if (F.battery && F.battery.a > 0.01) drawBattery(ctx, F.battery);
  for (const L of F.labels) { if (L.pop != null && L.pop < 0.25) { const sc = popScale(L.pop); ctx.save(); ctx.translate(L.x, L.y); ctx.scale(sc, sc); drawTag(ctx, { ...L, x: 0, y: 0 }); ctx.restore(); } else drawTag(ctx, L); }
  if (F.aired4 > 0) [0, 1, 2, 3].forEach(i => { const C = S.chars[i], p = project([C.g.position.x, 1.18, 0]); glowText('已播出', p[0], p[1], fs(700, 24), tone(C.sin.col, 0.4), { alpha: F.aired4, glow: 10, glowColor: C.sin.col }); });
  if (F.goldRing && F.goldRing.a > 0) { const G2 = F.goldRing, r = 120 + 14 * Math.exp(-G2.k / 0.3); ctx.save(); ctx.globalAlpha = G2.a * (0.75 + 0.25 * Math.exp(-G2.k / 0.4)); ctx.strokeStyle = '#FFD27A'; ctx.lineWidth = 3; ctx.shadowColor = GOLD; ctx.shadowBlur = 22; ctx.beginPath(); ctx.arc(G2.c[0], G2.c[1], r, 0, TAU); ctx.stroke(); ctx.restore(); }
  if (F.nextTag && F.nextTag.a > 0) glowText('下一集', F.nextTag.x, F.nextTag.y, fs(700, 28), '#FFD27A', { alpha: F.nextTag.a, glow: 12, glowColor: GOLD });
  for (const s of F.hooks) drawHook(t, ctx, s);
  if (!window.COVER) for (const s of F.subs) drawSub2(t, ctx, s);
  if (F.shock) { ctx.save(); ctx.globalAlpha = F.shock.a; ctx.strokeStyle = F.shock.col; ctx.lineWidth = lerp(5, 1, 1 - F.shock.a / 0.45); ctx.shadowColor = CY; ctx.shadowBlur = 14; ctx.beginPath(); ctx.arc(F.shock.c[0], F.shock.c[1], F.shock.r * 1920, 0, TAU); ctx.stroke(); ctx.restore(); }
}
