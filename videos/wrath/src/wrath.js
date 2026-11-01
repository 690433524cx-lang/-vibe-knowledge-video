// 合集的场景与时间轴（数据与音频工具在 show_core.js）
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
export const charsList = () => S?.chars ?? [];

let S, BT, B, R, TL;
function pts(geo, mat, parent, order = 0) { const p = new THREE.Points(geo, mat); p.frustumCulled = false; p.renderOrder = order; parent.add(p); K.mats.push(mat); return p; }
function makeStars(n, z, size, seed) {
  const g = new THREE.BufferGeometry(), P = new Float32Array(n * 3), Sd = new Float32Array(n);
  for (let i = 0; i < n; i++) { const k = (12.5 - z) / 12.5; P[i * 3] = (hash(i * 1.7 + seed) - 0.5) * 22 * k; P[i * 3 + 1] = (hash(i * 2.9 + seed) - 0.5) * 12 * k; P[i * 3 + 2] = z; Sd[i] = hash(i * 4.1 + seed); }
  g.setAttribute('position', new THREE.BufferAttribute(P, 3)); g.setAttribute('aSeed', new THREE.BufferAttribute(Sd, 1));
  const m = new THREE.ShaderMaterial({ uniforms: { uTime: { value: 0 }, uSize: { value: size }, uScale: { value: 1 }, uSpeed: { value: z < -15 ? 0.12 : 0.32 } }, transparent: true, depthWrite: false, depthTest: false, blending: THREE.AdditiveBlending,
    vertexShader: `attribute float aSeed; uniform float uTime, uSize, uScale, uSpeed; varying float vB;
      void main(){ vec3 p = position; float w = 6.28318530718/56.0; p.x += uSpeed/w*(0.6 + 0.8*aSeed)*sin(uTime*w + aSeed*40.0); p.y += 0.15*sin(uTime*w*6.0 + aSeed*20.0);   // 周期 = 成片时长
        gl_Position = projectionMatrix*modelViewMatrix*vec4(p, 1.0); gl_PointSize = uSize*(0.6 + 1.4*aSeed*aSeed)*uScale; vB = (0.25 + 0.75*aSeed)*(0.7 + 0.3*sin(uTime*6.28318530718/56.0*21.0 + aSeed*50.0)); }`,
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
  C.eyes = [FACE.eyeR, FACE.eyeL].map(p => { const m = glow(2, sin.col, [0.5, 0.28], head, { billboard: false, order: 46, core: '#FFC8B8' }); m.position.set(p[0], p[1], p[2] + 0.04); return m; });
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
    C.horns = P(PR.lightningHorns(), { bright: 1.0, col: tone(sin.col, 0.3), posHook: '{ float id = aExtra.y; float on = step(0.35, fract(sin(floor(mod(uTime, 56.0)*14.0 + id*3.7)*43.1)*91.7)); vis *= mix(1.0, on, step(0.5, mod(id, 3.0))); p *= 1.0 + uB*0.35; }' });
  } else if (sin.id === 'sloth') {
    C.hat = P(PR.beanie(), { bright: 1.3, posHook: '{ p.y -= uB*0.32; p.z += uB*0.06; }' });
    C.scarf = P(PR.scarf(), { bright: 1.2, posHook: '{ if (uL > 0.5 && aExtra.y > 0.5 && p.y < -1.08) vis = 0.0; }' }, rig);   // 排成一排时垂下的部分不超过肩膀
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
const qw = w => TAU * Math.max(1, Math.round(w * 56 / TAU)) / 56;   // 角频率按成片时长（56 秒）量化   // 角频率按成片时长量化
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
     (s.lite ? 3.0 : 3.8) * clamp(0.42 / luma, 0.7, 1.15);   // 亮度靠人物本身（亮部仍是红色）       // 按颜色的亮度补偿：绿色不过曝、紫色不发暗
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
  C.haloMats.forEach((m, j) => { m.uniforms.uBright.value = (j ? (s.lite ? 0 : 0.3) : 0.95 * (s.lite ? 0.6 : 1)) * s.halo * (1 + 0.8 * Math.max(0, kick)) * (1 - clamp(sc)); });
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

// ============================================================ 《七宗罪》第三集：愤怒（56 秒，横屏）
// 七个彩色角色（系列开头）→ 褪灰，傲慢、嫉妒“已播出” → 扫描抽中愤怒 → 三圈人群（闪电大多打在最亲的人身上）
// → 粒子大脑（近路的彗星在鼓点进来那一拍撞进杏仁核）→ 半身像 → … → 回到第 0 帧（首尾一样）
const RED = '#FF2A2A', HI = '#FFB199', WR = 2;
let DN, BEAT, DROP, EV, SUBS;
const nb = x => B.reduce((a, b) => Math.abs(b - x) < Math.abs(a - x) ? b : a, B[0]);           // 最近的拍点
const nd = x => DN.reduce((a, b) => Math.abs(b - x) < Math.abs(a - x) ? b : a, DN[0]);         // 最近的小节第一拍
const nextBeat = x => B.find(b => b > x + 1e-4) ?? x + BEAT;
const SUB_LIST = [
  [0.2, '你吼得〔最凶〕的那个人，', 64, true], [4.4, '往往不是陌生人，而是你〔最亲〕的人。', 64], [8.0, '调查发现：大多数人生气的对象，是〔家人、伴侣和朋友〕。'],
  [12.9, '〔陌生人〕？反而很少。'], [15.3, '因为愤怒，比〔理智〕快一步。'], [18.2, '危险信号会走一条〔近路〕，先到〔杏仁核〕；'],
  [21.9, '绕远路的〔理智〕，还在半路上。'], [25.0, '生气时，〔手指温度〕会升高：血液正涌向你的手。'], [29.2, '那打沙袋、摔东西，能把火〔发出去〕吗？'],
  [33.0, '2002年的一项实验：边想着惹你的人边〔打沙袋〕——'], [37.8, '火反而〔更大〕；安静坐着的那组，最先〔平静〕下来。'],
  [42.1, '愤怒下面，常常压着〔委屈、害怕或失望〕。'], [46.0, '所以你最生气的那个人——'], [48.9, '也许正是你最〔怕失去〕的人。'], [51.8, '你上一次发火，是对谁？', 64],
];
const plain = s => s.replace(/[〔〕]/g, '');
const charCount = s => plain(s).replace(/[，。：、；？！—…“”‘’\s]/g, '').length;
function scheduleSubs() {
  // 字幕切换对齐到拍点；每条至少显示 1.0 + 0.17 × 字数 秒（不缩短），前一条没显示够就往后顺延
  let prevEnd = 0; const out = [];
  for (const [want, text, size, exact] of SUB_LIST) {
    const minD = Math.max(1.0 + 0.17 * charCount(text), size === 64 && !exact && want > 50 ? 3.0 : 0);
    let t0 = exact ? want : nb(want); if (t0 < prevEnd - 0.02) t0 = B.find(b => b >= prevEnd - 0.02);
    out.push({ text, t0, size: size ?? 52, minD }); prevEnd = t0 + minD;
  }
  out.forEach((s, i) => { s.t1 = i + 1 < out.length ? out[i + 1].t0 - 0.06 : Math.min(TL - 0.3, s.t0 + Math.max(s.minD, 3.0)); });
  return out;
}
const LITE_DIM = { pride: 0.85, envy: 0.85, wrath: 0.9, sloth: 0.8, greed: 0.32, gluttony: 0.3, lust: 0.6 };   // 排成一排时道具压暗（金币、食物不能过曝）

export function build(scene, beats, heads, audioEnv) {
  S = scene; BT = beats; B = beats.beats; TL = beats.duration; DN = beats.downbeats; BEAT = beats.beat; DROP = beats.drop;
  setAudio(audioEnv, beats);
  EV = {
    gray: nb(0.5), sweep1: nb(0.5), off: nb(1.0), back: nb(1.5), swing: nb(2.3), stop: nb(3.4), title: nb(3.6),
    rings: nd(4.4), outer: nb(12.9), thin: nextBeat(nb(12.9)), brain: nd(15.3), go: nb(15.6), drop: DROP, bust: nb(25.0),
  };
  // 人群段的闪电：每半小节（第 1、3 拍）一次，共 7 次；第 3、6 次打中圈，其余打内圈；外圈一次都不打（最后只有一道细的闪了一下）
  EV.bolts = B.filter(b => b >= EV.rings - 1e-3 && b < EV.outer - 0.1 && Math.round((b - EV.rings) / BEAT) % 2 === 0);   // 每小节第一拍（以及第 3 拍）都劈，一次不漏
  SUBS = scheduleSubs();
  EV.slow = SUBS[6].t0;
  EV.bust0 = EV.bust - 2 * BEAT;
  S.chars = SINS.map((sin, i) => makeChar(sin, i, heads));
  S.spot = makeSpot();
  S.stars = [makeStars(14000, -22, 1.1, 11), makeStars(5000, -9, 1.7, 12)];
  S.gather = makeGather();
  S.minis = makeMinis(heads);
  S.groundRings = RINGS.map(r => makeGroundRing(r.r));
  S.brain = makeBrain();
  const W = S.chars[WR];
  S.heat = makeHeat(W.rig); S.cup = makeCup(); S.bag = makeSandbag(); S.ice = makeIceberg(); S.irises = makeIris(W.head);
  if (W.cracks) { const old = W.cracks.material, m = propMat('#FF7A3A', { bright: 2.8, size: 0.008, colHook: '{ b *= (0.8 + 0.5*sin(uTime*qw(7.0) + aExtra.y*1.7))*(1.0 + 3.0*uB); col = mix(col, vec3(1.0, 0.85, 0.6), 0.35 + 0.4*uB); }' }); W.cracks.material = m; W.propMats.splice(W.propMats.indexOf(old), 1, m); }
}
// ------------------------------------------------------------ 三圈同心圆：地面上发光的细圆线 + 站在线上的灰色半身像（内 5、中 8、外 12）
const GROUND = -1.25, MINI = 0.62, CENTER = 1.24;
const RINGS = [{ n: 5, r: 2.4, label: '家人 / 伴侣 / 朋友' }, { n: 8, r: 4.0, label: '同事 / 熟人' }, { n: 12, r: 5.7, label: '陌生人' }];
function makeMinis(heads) {
  const out = [], bodyMat = idolMaterial(RED, { bright: 0.75, rim: 0.4, size: 0.0085, cran: 0.8 });
  bodyMat.uniforms.uGray.value = 1; K.mats.push(bodyMat);
  RINGS.forEach((ring, ri) => {
    for (let k = 0; k < ring.n; k++) {
      const a = (k / ring.n) * TAU + ri * 0.3 + 0.2, g = new THREE.Group();
      g.position.set(Math.cos(a) * ring.r, 0, Math.sin(a) * ring.r); g.scale.setScalar(MINI); K.scene.add(g);
      const m = idolMaterial(RED, { bright: 0.85, cran: 0.04, rim: 0.1, cranEdge: 1, size: 0.0105, light: 0.55 }); m.uniforms.uGray.value = 1;   // 和合集一样的灰色粒子（顶光调弱，脸上没有白色反光） m.uniforms.uEyeOpen.value = 0;
      pts(heads.neutralLite, m, g, 10); const body = pts(heads.bodyLite, bodyMat, g, 9); body.scale.set(0.6, 1, 0.8);
      out.push({ g, m, ring: ri, a });
    }
  });
  out.bodyMat = bodyMat;
  return out;
}
function makeGroundRing(r) {
  const n = Math.round(900 * r), P = new Float32Array(n * 3), Sd = new Float32Array(n);
  for (let i = 0; i < n; i++) { const a = i / n * TAU, j = (hash(i * 1.7) - 0.5) * 0.02; P[i * 3] = Math.cos(a) * (r + j); P[i * 3 + 1] = GROUND; P[i * 3 + 2] = Math.sin(a) * (r + j); Sd[i] = hash(i * 3.1); }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(P, 3)); g.setAttribute('aSeed', new THREE.BufferAttribute(Sd, 1));
  const m = new THREE.ShaderMaterial({ uniforms: { uInt: { value: 0 }, uScale: { value: 1 }, uTime: { value: 0 } }, transparent: true, depthWrite: false, depthTest: false, blending: THREE.AdditiveBlending,
    vertexShader: `attribute float aSeed; uniform float uInt, uScale, uTime; varying float vB; void main(){ vec4 mv = modelViewMatrix*vec4(position, 1.0); gl_Position = projectionMatrix*mv; gl_PointSize = (2.0 + 2.0*aSeed)*uScale*clamp(9.0/(-mv.z), 0.6, 1.6); vB = uInt*(0.6 + 0.4*sin(uTime*3.0 + aSeed*40.0)); }`,
    fragmentShader: `varying float vB; void main(){ vec2 c = gl_PointCoord - 0.5; float d = length(c); if (d > 0.5) discard; gl_FragColor = vec4(vec3(1.0, 0.42, 0.34)*vB*exp(-d*d*10.0), 1.0); }` });
  const p = new THREE.Points(g, m); p.frustumCulled = false; p.renderOrder = 5; p.visible = false; K.scene.add(p); return p;
}
// ------------------------------------------------------------ 红色的粒子大脑（嫉妒那一集的模型），侧面，前额朝右
const BR = { eye: [-1.22, -0.26, -0.2], amyg: [-0.24, -0.33, -0.12], pfc: [-0.98, 0.34, -0.22] };
const SHORT = [BR.eye, BR.amyg];                                              // 近路：又短又直
const LONG = (() => {                                                         // 远路：又长又弯的弧线（从眼睛往下、绕到脑后、越过头顶，再回到前额）
  const c = [BR.eye, [-0.85, -0.66, -0.2], [-0.1, -0.8, -0.2], [0.6, -0.55, -0.2], [0.92, 0.05, -0.2], [0.62, 0.66, -0.2], [-0.05, 0.86, -0.2], [-0.66, 0.7, -0.22], BR.pfc];
  const cat = (P0, P1, P2, P3, u) => P0.map((_, j) => 0.5 * ((2 * P1[j]) + (-P0[j] + P2[j]) * u + (2 * P0[j] - 5 * P1[j] + 4 * P2[j] - P3[j]) * u * u + (-P0[j] + 3 * P1[j] - 3 * P2[j] + P3[j]) * u * u * u));
  const out = []; for (let i = 0; i < c.length - 1; i++) for (let k = 0; k < 10; k++) out.push(cat(c[Math.max(0, i - 1)], c[i], c[i + 1], c[Math.min(c.length - 1, i + 2)], k / 10)); out.push(BR.pfc); return out;
})();
function makeBrain() {
  const g = new THREE.Group(); g.position.set(-0.45, 0.05, 0); g.scale.setScalar(1.15); g.rotation.y = Math.PI; K.scene.add(g);   // 转半圈（不用负缩放，法线才对）
  const m = brainMaterial(RED); m.uniforms.uSeeX.value = 99; m.uniforms.uBright.value = 7.0; m.uniforms.uRegR.value = 0.02; m.uniforms.uSize.value = 0.014; m.uniforms.uHot.value.set('#F2D8CC');
  pts(buildBrainSide(511, 1).geometry(THREE), m, g, 20);
  const glowM = new THREE.Mesh(new THREE.PlaneGeometry(6.5, 6.5), H.glowPlane(0.0)); glowM.material.uniforms.uCol.value.set(RED); glowM.position.set(-0.45, 0.05, -1.6); glowM.renderOrder = -15; glowM.visible = false; K.scene.add(glowM);   // 红色只在大脑身后
  return { g, m, glow: glowM };
}
const pathAt = (P, u) => { const L = []; let tot = 0; for (let i = 0; i < P.length - 1; i++) { const l = Math.hypot(...P[i + 1].map((v, j) => v - P[i][j])); L.push(l); tot += l; }
  let d = clamp(u) * tot; for (let i = 0; i < L.length; i++) { if (d <= L[i] || i === L.length - 1) { const f = L[i] ? d / L[i] : 0; return P[i].map((v, j) => lerp(v, P[i + 1][j], clamp(f))); } d -= L[i]; } return P[P.length - 1]; };
const brainAsm = k => { const u = S.brain.m.uniforms; u.uScatter.value = 2.2 * (1 - k); u.uScatterDist.value = 1.4; u.uAlpha.value = clamp(k * 1.5); };
const brainScreen = p => { const v = new THREE.Vector3(...p); S.brain.g.updateMatrixWorld(true); S.brain.g.localToWorld(v); return project(v.toArray()); };

// ------------------------------------------------------------ 律动：前奏只在小节第一拍轻轻弹 4%；鼓点进来后每两拍弹 6%
function pulse(t) {
  let v = 0;
  const list = t < DROP ? DN : B.filter(b => b >= DROP - 1e-3 && Math.round((b - DROP) / BEAT) % 2 === 0);
  const j = lastIdx(list, t);
  for (let k = Math.max(0, j - 1); k <= j; k++) { if (k < 0) continue; const d = t - list[k]; if (d < 0 || d > 0.5) continue; v += Math.exp(-d * 13) * Math.cos(d * 26); }
  return (t < DROP ? 0.67 : 1) * v;
}
const LINEUP = { pos: [0, 0.25, 9.6], target: [0, -0.05, 0], fov: 35 };
const lineupCam = t => orbit({ ...LINEUP, pos: [0, LINEUP.pos[1] + 0.06 * Math.sin(t * qw(1.7)), LINEUP.pos[2] - 0.18 * Math.sin(t * qw(1.1))] }, 0.03 * Math.sin(t * qw(1.9)), 0);
const charCam = (x, y, d) => ({ pos: [x, y + 0.08, d], target: [x, y, 0], fov: 35 });
// 七个彩色角色排成一排（第 0 帧和最后一帧共用）
function heroLineup(t, F, AUD0) {
  const AUD = { ...AUD0, mid: 0, low: 0 };
  S.chars.forEach(O => { setState(O, { lite: true, gray: false, eyes: 1, halo: 0.85, props: 1, scatter: 0, aud: AUD }); animate(O, t, 9, -9, true, AUD); });
  F.names = 1; F.series = 1; F.auraCol = '#B49CE0'; F.auraK = 0.45;
  return lineupCam(t);
}

export const subsList = () => SUBS.map(s => ({ text: plain(s.text), t0: +s.t0.toFixed(3), t1: +s.t1.toFixed(3), minD: +s.minD.toFixed(3) }));
export function events() {
  return [{ name: '褪色开始扫描', t: EV.gray }, { name: '抽中愤怒', t: EV.stop }, { name: '三圈人群', t: EV.rings }, ...EV.bolts.map((b, i) => ({ name: `闪电 ${i + 1}`, t: b })), { name: '粒子大脑', t: EV.brain }, { name: '杏仁核爆发', t: EV.drop }, { name: '半身像', t: EV.bust }, { name: '杯子炸开', t: SUBS[8].t0 }, { name: '沙袋对比高潮', t: BT.onset_fix?.climax ?? SUBS[10].t0 }, { name: '冰山', t: SUBS[11].t0 }, { name: '沉到水下', t: DN.find(d => d >= SUBS[11].t0 - 0.01) }, { name: '结尾直视', t: SUBS[14].t0 }, { name: '回到那一排', t: nb(54.8) }];
}

// ------------------------------------------------------------ 每帧
export function frame(t) {
  const F = { shake: 0, shock: null, ground: [], bloom: 1.0, auraCol: RED, auraK: 1.0, subs: [], names: 0, series: 0, aired: 0, bursts: [], ca: 0, labels: [], bolts: [], paths: null, scan: null, title: null, spinner: null, header: t >= EV.title - 0.25 && t < TL - 0.75 ? clamp((t - EV.title + 0.25) / 0.6) : 0 };
  const endK = 1 - clamp((t - (TL - 0.9)) / 0.6);
  const kick = pulse(t) * endK, low = env(t, 'low'), mid = env(t, 'mid'), high = env(t, 'high');
  const bb = beatInBar(t), after = t >= DROP;
  const off = after && bb.k === 0 ? Math.exp(-bb.d / 0.1) * endK : 0;          // 鼓点进来后：每小节第一拍镜头推一下 + 4px 震动
  F.shake = 0.67 * off;
  const AUD = { kick, low, mid, high, t, endK };
  S.chars.forEach(O => { O.g.position.set(slotX(O.i), 0, 0); O.g.visible = true; animate(O, t, -9, -9, false, AUD); });
  S.chars.forEach(O => setState(O, { lite: true, gray: true, eyes: 0, halo: 0, props: 1, scatter: 0, aud: AUD }));
  S.minis.forEach(m => { m.g.visible = false; }); S.groundRings.forEach(r => { r.visible = false; }); S.brain.g.visible = false; S.brain.glow.visible = false; S.gather.visible = false;
  S.heat.visible = false; S.cup.g.visible = false; S.bag.g.visible = false; S.ice.g.visible = false; S.irises.forEach(o => { o.visible = false; });
  S.gather.material.uniforms.uTime.value = t; S.gather.material.uniforms.uScale.value = K.scale;
  const W = S.chars[WR];
  if (W.cracks) { W.cracks.material.uniforms.uB.value = 0; W.cracks.visible = true; }
  let cam = lineupCam(t);
  const sway = 0.052 * Math.sin(t * qw(0.9));                                // ±3 度持续绕转
  if (t < EV.gray) {
    // ---- 第 0 帧：七个彩色角色排成一排 + “七宗罪 · 第三集”；0.2 秒钩子句弹出
    cam = heroLineup(t, F, AUD);
  } else if (t < EV.rings) {
    // ---- 褪色：只有傲慢、嫉妒保持彩色（已播出）；扫描线来回扫，被扫到的脸亮一下、放大 10%；愤怒的灰脸上偶尔闪过一道红色裂纹
    const dG = t - EV.gray;
    let sx = null;
    const X = i => project([slotX(i), HEAD_C[1], 0])[0], L0 = -80, R0 = 2000;
    if (t >= EV.sweep1 && t < EV.off) sx = lerp(L0, R0, inOut((t - EV.sweep1) / (EV.off - EV.sweep1)));
    else if (t >= EV.back && t < EV.swing) sx = lerp(R0, X(0), inOut((t - EV.back) / (EV.swing - EV.back)));
    else if (t >= EV.swing && t < EV.stop) { const mid2 = nextBeat(EV.swing); sx = t < mid2 ? lerp(X(0), X(4) + 40, inOut((t - EV.swing) / (mid2 - EV.swing))) : lerp(X(4) + 40, X(WR), outExpo((t - mid2) / (EV.stop - mid2))); }
    else if (t >= EV.stop) sx = X(WR);
    F.scan = sx != null ? { x: sx, a: (t < EV.stop ? 1 : 1 - clamp((t - EV.stop) / 0.3)) * clamp(dG / 0.1) } : null;
    const won = t >= EV.stop, k = won ? outExpo(clamp((t - EV.stop) / 0.5)) : 0;
    S.chars.forEach((O, i) => {
      if (won && i === WR) return;
      const aired = i < 2, shut = clamp(dG / 0.15);
      const pop = sx != null && !won && !aired ? Math.exp(-Math.pow((sx - X(i)) / 70, 2)) : 0;
      setState(O, aired ? { lite: true, gray: false, eyes: 1, halo: 0.7, props: 1, scatter: 2.4 * k, aud: AUD } : { lite: true, gray: dG >= 0.06, eyes: 1 - shut, halo: 0.85 * (1 - shut), props: 1, scatter: 2.4 * k, aud: AUD, pop });
      if (aired) animate(O, t, 9, -9, true, AUD);
      if (won) O.g.position.x += Math.sign(i - WR) * 5 * k;                  // 其他角色（包括傲慢、嫉妒）向两侧散开
    });
    F.aired = won ? 1 - k : clamp(dG / 0.2); F.names = (1 - clamp(dG / 0.3));
    if (dG < 0.5) F.shock = { c: [960, 470], r: 0.7 * outExpo(dG / 0.5), a: 0.8 * (1 - dG / 0.5), col: '#EEDDD8' };
    if (dG < 0.15) F.shake = Math.max(F.shake, 1 - dG / 0.15);
    if (!won && W.cracks) {                                                  // 压着火：裂纹在灰色的脸上一闪而过
      const fl = [EV.off, nd(2.2), nextBeat(nextBeat(nd(2.2)))].reduce((m, x) => Math.max(m, t >= x ? Math.exp(-(t - x) / 0.12) : 0), 0);
      W.cracks.visible = fl > 0.02; W.cracks.material.uniforms.uGray.value = 0; W.cracks.material.uniforms.uB.value = 0.6 * fl; W.cracks.material.uniforms.uAsm.value = 1;
    }
    F.series = 1; F.auraK = 0.3;
    if (won) {
      const dt = t - EV.stop;
      setState(W, { lite: false, gray: false, eyes: outExpo(clamp(dt / 0.12)), halo: outExpo(clamp(dt / 0.3)), props: 1, scatter: 0, aud: AUD, pop: Math.exp(-dt / 0.25) });
      animate(W, t, 9, -9, true, AUD);
      if (W.cracks) { W.cracks.visible = true; W.cracks.material.uniforms.uB.value = Math.exp(-dt / 0.35); }
      if (W.horns) W.horns.material.uniforms.uB.value = 0.6 * Math.exp(-dt / 0.3);
      cam = camLerp(lineupCam(t), charCam(slotX(WR) - 0.55, 0.12, 4.4), outExpo(clamp(dt / 0.7)));   // 脸在画面右侧一点，左边留给“愤怒”大标题
      if (dt < 0.5) F.shock = { c: project([slotX(WR), HEAD_C[1], 0.3]), r: 0.7 * outExpo(dt / 0.5), a: 0.8 * (1 - dt / 0.5), col: HI };
      if (dt < 0.15) F.shake = Math.max(F.shake, 1 - dt / 0.15);
      if (dt < 1 / 30 + 1e-4) F.ca = 1;
      F.auraK = 0.3 + 0.9 * k;
      F.bursts.push({ t0: EV.stop, pos: [slotX(WR), HEAD_C[1] + 0.6, 0.2], n: 60, speed: 1.4, life: 0.6, grav: -0.2, seed: 7, bright: 2.4 });
      F.series = 1 - clamp((t - EV.title + 0.25) / 0.6);
    }
    if (t >= EV.title - 0.25) F.title = { t0: EV.title - 0.25, x: 560, y: 420 };
    F.sparkCol = HI;
  }
  if (t >= EV.rings) S.chars.forEach((O, i) => { if (i !== WR) { setState(O, { lite: true, gray: true, eyes: 0, halo: 0, props: 0, scatter: 3, aud: AUD }); O.g.visible = false; } });
  if (t < EV.rings) {} else if (t < EV.brain + 0.55) {
    // ---- 三圈人群：透视俯视，地面上三个发光的同心圆；愤怒站在圆心（比别人大一倍）；镜头绕圆心转约 30 度并缓慢下降
    const tr = clamp((t - EV.rings) / (2 * BEAT)), up = inOut(tr), gone = clamp((t - EV.brain) / 0.6);
    const prog = clamp((t - EV.rings) / (EV.brain - EV.rings));
    const ang = -0.3 + 0.55 * prog, R = 10.5 - 1.2 * prog, H = 7.4 - 1.8 * prog;   // 一直匀速绕圆心转、缓慢下降，不停
    let over = { pos: [Math.sin(ang) * R, H, Math.cos(ang) * R], target: [0, -0.4, 0], fov: 38 };
    const toOuter = t >= EV.outer ? inOut(clamp((t - EV.outer) / 1.0)) : 0;     // “陌生人？反而很少”：镜头推向外圈
    const oA = Math.atan2(over.pos[0], over.pos[2]);
    let tgO = null; { let bd = 9; S.minis.forEach(m => { if (m.ring !== 2) return; const a = Math.atan2(Math.sin(m.a) * 0 + m.g.position.x, m.g.position.z); const d = Math.abs(Math.atan2(Math.sin(a - oA - 0.5), Math.cos(a - oA - 0.5))); if (d < bd) { bd = d; tgO = [Math.sin(a) * RINGS[2].r, GROUND + 0.4, Math.cos(a) * RINGS[2].r]; } }); }   // 对准外圈上真实的一个人
    { const dir = [tgO[0] / 5.7, 0, tgO[2] / 5.7]; over = { pos: lerp3(over.pos, [tgO[0] + dir[0] * 4.6, 3.1, tgO[2] + dir[2] * 4.6], toOuter), target: lerp3(over.target, [tgO[0] - dir[0] * 0.6, -0.55, tgO[2] - dir[2] * 0.6], toOuter), fov: 38 }; }   // 只推到外圈的一小段：画面里 3–4 个外圈的人，完整不切
    if (toOuter > 0) over = orbit(over, 0.12 * Math.sin((t - EV.outer) * 1.6) * toOuter, 0);   // 推到外圈后镜头继续绕着走，不停下
    cam = camLerp(charCam(slotX(WR) - 0.55, 0.12, 4.4), over, up);
    W.g.position.set(lerp(slotX(WR), 0, up), 0, 0);
    setState(W, { lite: false, gray: false, eyes: 1, halo: 1, props: 1, scatter: 2.2 * gone, aud: AUD });
    animate(W, t, 9, -9, true, AUD); W.g.scale.setScalar(lerp(1, CENTER, up));
    const cp = cam.pos;
    const strike = [];                                                       // [时间, 圈, 第几个]
    EV.bolts.forEach((bt, k) => { const mid2 = k === 3 || k === 6; strike.push([bt, mid2 ? 1 : 0, [0, 2, 4, 1, 3, 0, 5, 2][k % 8] % RINGS[mid2 ? 1 : 0].n]); });
    S.groundRings.forEach((g, ri) => { g.visible = true; g.material.uniforms.uInt.value = 1.2 * up * (1 - gone) * clamp((t - EV.rings - 0.3 - ri * 0.2) / 0.5); g.material.uniforms.uTime.value = t; g.material.uniforms.uScale.value = K.scale; });
    let wHit = 0;
    S.minis.forEach((m, n) => {
      m.g.visible = true;
      const base = RINGS.slice(0, m.ring).reduce((a, r) => a + r.n, 0);
      let h = 0; for (const [bt, ri, idx] of strike) { const d = t - bt; if (d >= 0 && d < 0.7 && m.ring === ri && base + idx === n) h = Math.max(h, Math.exp(-d / 0.2)); }

      const back = h * 0.35;                                                 // 被打中：向后一震
      m.g.position.set(Math.cos(m.a) * (RINGS[m.ring].r + back), 0, Math.sin(m.a) * (RINGS[m.ring].r + back));
      m.g.rotation.set(0.05 - 0.3 * h, Math.atan2(cp[0] - m.g.position.x, cp[2] - m.g.position.z), 0, 'YXZ');
      const appear = clamp((t - EV.rings + 0.05 - m.ring * 0.2) / 0.4);
      m.m.uniforms.uGray.value = 1 - h; m.m.uniforms.uDim.value = 6.0 * (1 - 0.35 * toOuter) * (1 + 1.6 * h) * (0.15 + 0.85 * appear) * (1 - gone);
      m.m.uniforms.uScatter.value = 2.0 * (1 - appear) + 2.4 * gone; m.m.uniforms.uScatterDist.value = 1.4; m.m.uniforms.uDrift.value = 0.006;
      m.g.scale.setScalar(MINI * (1 + 0.04 * Math.max(0, kick)));
      wHit = Math.max(wHit, h);
    });
    S.minis.bodyMat.uniforms.uDim.value = 2.6 * up * (1 - gone);
    for (const [bt, ri, idx] of strike) {
      const d = t - bt; if (d < 0 || d > 0.4) continue;
      const m = S.minis[RINGS.slice(0, ri).reduce((a, r) => a + r.n, 0) + idx];
      F.bolts.push({ a: project([0, HEAD_C[1] * CENTER + 0.2, 0]), b: project([m.g.position.x, HEAD_C[1] * MINI + 0.1, m.g.position.z]), k: d / 0.4, w: 1.6, seed: Math.round(bt * 10) });
      F.ground.push({ c: [m.g.position.x, GROUND, m.g.position.z], r: 0.2 + 2.6 * outExpo(d / 0.4), a: 0.9 * (1 - d / 0.4) });   // 冲击波沿着地面散开
    }
    if (t >= EV.thin && t < EV.thin + 0.35) { let best = null, bd = 1e9; S.minis.forEach(m => { if (m.ring !== 2) return; const q = project([m.g.position.x, 0, m.g.position.z]); const d = Math.abs(q[0] - 960); if (q[2] < 1 && d < bd) { bd = d; best = m; } }); if (best) { const tp = project([best.g.position.x, HEAD_C[1] * MINI + 0.1, best.g.position.z]); F.bolts.push({ a: [tp[0] - 80, -40], b: tp, k: (t - EV.thin) / 0.35, w: 0.55, seed: 77 }); } }   // 很细的一道，清楚地闪一下再熄灭
    if (W.cracks) W.cracks.material.uniforms.uB.value = 0.5 * EV.bolts.reduce((mm, bt) => Math.max(mm, t >= bt ? Math.exp(-(t - bt) / 0.2) : 0), 0);
    // 标签直接贴在对应那一圈的圆线旁边（画面右前方的那一段圆线上）
    { // 标签贴在各自那一圈的圆线上：内圈在左前方、中圈在右前方、外圈在左侧，分开排列，互不重叠
      const A0 = Math.atan2(cp[0], cp[2]);
      [[0, -0.62], [1, 0.62], [2, -1.25]].forEach(([ri, da]) => {
        const ring = RINGS[ri], a = A0 + da, q = project([Math.sin(a) * ring.r, GROUND, Math.cos(a) * ring.r]);
        const right = q[0] >= 960, w = ring.label.length * 40 + 36;
        let x = right ? q[0] + 18 : q[0] - 18, y = clamp(q[1] + 4, 140, 830);
        if (right && x + w > 1890) x = 1890 - w; if (!right && x - w < 30) x = 30 + w;
        F.labels.push({ text: ring.label, x, y, a: up * (1 - gone) * (1 - toOuter) * clamp((t - EV.rings - 0.5 - ri * 0.25) / 0.3), anchor: right ? 'left' : 'right', plain: true, dot: q });
      });
    }
    if (t >= EV.brain - 0.35) { S.brain.g.visible = true; brainAsm(clamp((t - EV.brain + 0.35) / 0.8)); }
    if (t >= EV.brain - 0.2) cam = camLerp(cam, { pos: [0.35, 0.05, 5.0], target: [0.35, 0.0, 0], fov: 35 }, inOut(clamp((t - EV.brain + 0.2) / 0.75)));
    F.auraK = 1.0;
  } else if (t < EV.bust0 + 2 * BEAT) {
    // ---- 粒子大脑：近路（又短又亮的直线）和远路（又长又弯的虚线弧）出发前就画好；两颗带拖尾的彗星同时出发
    const BCAM = { pos: [0.35, 0.05, 5.0], target: [0.35, 0.0, 0], fov: 35 };
    const fromOver = clamp((t - EV.brain - 0.55) / 0.5);
    cam = orbit({ ...BCAM, pos: [BCAM.pos[0], BCAM.pos[1], BCAM.pos[2] * (1 - 0.06 * clamp((t - EV.brain) / 8))] }, sway, 0.35);
    const leaving = clamp((t - EV.bust0) / (2 * BEAT));
    if (leaving <= 0) W.g.visible = false;
    S.brain.g.visible = true; brainAsm(1 - leaving); S.brain.glow.visible = true; S.brain.glow.material.uniforms.uInt.value = (0.08 + 0.05 * Math.max(0, kick)) * (1 - leaving) * fromOver;
    const beat2 = after ? Math.max(0, kick) : 0;                             // 鼓点进来后：每两拍跟着低音脉动一次（放大 5% 再回弹）
    S.brain.g.scale.setScalar(1.15 * (1 + (after ? 0.05 : 0.02) * Math.max(0, kick)));
    const dD = t - EV.drop;
    S.brain.m.uniforms.uRegC.value[0].set(...BR.amyg, dD >= 0 ? 2.4 * Math.exp(-dD / 0.6) + 0.6 + 0.4 * beat2 : 0.3 * clamp((t - EV.go) / (EV.drop - EV.go)));
    S.brain.m.uniforms.uRegC.value[1].set(...BR.pfc, t >= EV.slow ? 0.9 * Math.exp(-(t - EV.slow) / 0.8) + 0.25 : 0);
    S.brain.m.uniforms.uAll.value = (dD >= 0 ? 0.32 * Math.exp(-dD / 0.35) : 0) + (after ? 0.28 * beat2 : 0.04 * Math.max(0, kick));   // 沟回的光一亮一暗
    if (dD >= 0 && dD < 0.6) F.shock = { c: brainScreen(BR.amyg), r: 0.45 * outExpo(dD / 0.6), a: 0.9 * (1 - dD / 0.6), col: HI };
    else if (after && bb.k === 0 && bb.d < 0.5) F.shock = { c: brainScreen(BR.amyg), r: 0.32 * outExpo(bb.d / 0.5), a: 0.6 * (1 - bb.d / 0.5), col: HI };   // 每小节第一拍一次冲击波
    if (dD >= 0 && dD < 0.15) F.shake = Math.max(F.shake, 1 - dD / 0.15);
    if (dD >= 0 && dD < 1 / 30 + 1e-4) F.ca = 1;
    const uS = clamp((t - EV.go) / (EV.drop - EV.go)), uL = clamp((t - EV.go) / (EV.slow - EV.go));
    const trail = (P, u, du, n) => { const out = []; for (let k = 0; k < n; k++) out.push(brainScreen(pathAt(P, Math.max(0, u - du * k / n)))); return out; };
    const la = fromOver * (1 - leaving);
    F.paths = { short: SHORT.map(brainScreen), long: LONG.map(brainScreen), a: la, t,
      cs: t >= EV.go && dD < 0 ? trail(SHORT, Math.pow(uS, 1.6), 0.35, 14) : null, cl: t >= EV.go ? trail(LONG, uL, 0.05, 14) : null, slow: t >= EV.slow ? t - EV.slow : -1 };
    F.labels.push({ text: '杏仁核', x: 1560, y: 650, to: brainScreen(BR.amyg), a: la * clamp((t - EV.brain - 0.6) / 0.3) });
    F.labels.push({ text: '理智', x: 1560, y: 300, to: brainScreen(BR.pfc), a: la * clamp((t - EV.brain - 0.8) / 0.3) });
    F.labels.push({ text: '近路', x: 1220, y: 790, to: brainScreen(pathAt(SHORT, 0.5)), a: la * clamp((t - EV.brain - 1.0) / 0.3), small: true });
    F.labels.push({ text: '远路', x: 560, y: 150, to: brainScreen(pathAt(LONG, 0.68)), a: la * clamp((t - EV.brain - 1.2) / 0.3), small: true });
    if (t >= EV.go && t < EV.slow + 0.3) F.spinner = { x: 1660, y: 300, t, a: la * (t < EV.slow ? 1 : 1 - clamp((t - EV.slow) / 0.3)) };   // “理智”还在加载
    F.auraK = 1.15; F.bloom = 1.0 + 0.4 * (dD >= 0 ? Math.exp(-dD / 0.4) : 0) + 0.15 * beat2;
    if (after && high > 0.25) for (let h = Math.max(0, lastIdx(A.hats, t) - 2); h <= lastIdx(A.hats, t); h++) {   // 火花随高音闪烁
      const ht = A.hats[h]; if (h < 0 || t - ht > 0.15) continue;
      const a = hash(h * 3.1) * TAU, rr = 1.5 + 0.4 * hash(h * 5.7), c = S.brain.g.position;
      F.bursts.push({ t0: ht, pos: [c.x + Math.cos(a) * rr * 1.2, c.y + Math.sin(a) * rr * 0.8, 0.4], n: Math.round(4 + 12 * env(ht, 'high')), speed: 0.7, life: 0.18, grav: 0, seed: h, bright: 2.4 });
    }
    if (leaving > 0) {                                                       // 大脑飞回、汇聚成愤怒的半身像
      W.g.position.set(0, 0, 0);
      setState(W, { lite: false, gray: false, eyes: leaving, halo: leaving, props: leaving, scatter: 2.4 * (1 - outExpo(leaving)), aud: AUD });
      animate(W, t, 9, -9, true, AUD);
      cam = camLerp(cam, charCam(0, -0.45, 5.6), inOut(leaving));
      F.labels.forEach(L => { L.a *= 1 - clamp(leaving * 3); }); F.paths.a *= 1 - clamp(leaving * 3); if (F.spinner) F.spinner.a *= 1 - clamp(leaving * 3);
    }
    F.sparkCol = HI;
  } else {
    cam = frame2(t, F, AUD, W);
  }
  if (t > EV.stop && t < EV.brain && high > 0.2) for (let h = Math.max(0, lastIdx(A.hats, t) - 2); h <= lastIdx(A.hats, t); h++) {
    const ht = A.hats[h]; if (h < 0 || t - ht > 0.15) continue;
    const c = W.g.position, a = hash(h * 3.1) * TAU, rr = 0.9 + 0.5 * hash(h * 5.7);
    F.bursts.push({ t0: ht, pos: [c.x + Math.cos(a) * rr, HEAD_C[1] + Math.sin(a) * rr * 0.7, 0.3], n: Math.round(3 + 10 * env(ht, 'high')), speed: 0.5, life: 0.15, grav: 0, seed: h, bright: 2.0 });
  }
  cam = { ...cam, pos: [cam.pos[0], cam.pos[1], cam.pos[2] * (1 - 0.03 * off)] };
  S.spot.material.uniforms.uInt.value = 0;
  S.stars.forEach(s => { s.material.uniforms.uScale.value = K.scale; });
  for (const s of SUBS) if (t >= s.t0 - 0.01 && t <= s.t1 + 0.12) F.subs.push({ text: s.text, t0: s.t0, t1: s.t1, size: s.size, pop: s.t0, col: s.size === 64 ? RED : HI });
  F.cam = cam; F.kick = kick;
  return F;
}

// ------------------------------------------------------------ 2D 层
const titleCanvas = { c: null };
export function draw2D(t, ctx, F) {
  // “七宗罪 · 第三集”：第 0 帧在画面上方（60px），愤怒标题出现时缩小飞到左上角，变成常驻的小字
  const hk = F.header, sk = F.series;
  if (sk > 0.001 || hk > 0.001) {
    const k = inOut(hk), x = lerp(960, 60, k), y = lerp(92, 58, k), size = Math.round(lerp(60, 24, k));
    glowText(k > 0.98 ? '七宗罪 · 第三集 · 愤怒' : '七宗罪 · 第三集', x, y, fs(700, size), k > 0.5 ? 'rgba(255,215,205,0.75)' : '#EEE4E8', { align: k > 0.5 ? 'left' : 'center', glow: lerp(22, 6, k), glowColor: k > 0.5 ? RED : '#FFFFFF', nobox: true, alpha: hk > 0.001 && sk < 0.001 ? hk * (1 - clamp((t - (TL - 1.0)) / 0.3)) : Math.max(sk, hk) });
  }
  // 名字（排成一排时，在肩膀下方，带暗色底）
  if (F.names > 0) S.chars.forEach(C => {
    const p = project([C.g.position.x, -1.78, 0]);
    ctx.save(); ctx.globalAlpha = 0.62 * F.names; ctx.fillStyle = '#0B0912'; ctx.beginPath(); ctx.roundRect(p[0] - 60, p[1] - 27, 120, 54, 10); ctx.fill(); ctx.restore();
    glowText(C.sin.name, p[0], p[1] + 2, fs(700, 38), tone(C.sin.col, 0.25), { alpha: F.names, glow: 12, glowColor: C.sin.col });
  });
  // 已播出
  if (F.aired > 0) [0, 1].forEach(i => { const C = S.chars[i], p = project([C.g.position.x, 1.18, 0]); glowText(`0${i + 1} · 已播出`, p[0], p[1], fs(700, 28), tone(C.sin.col, 0.4), { alpha: F.aired, glow: 10, glowColor: C.sin.col }); });
  // 扫描线
  if (F.scan) {
    const x = F.scan.x; ctx.save(); ctx.globalAlpha = F.scan.a; ctx.globalCompositeOperation = 'lighter';
    const g = ctx.createLinearGradient(x - 70, 0, x + 70, 0); g.addColorStop(0, 'rgba(255,42,42,0)'); g.addColorStop(0.5, 'rgba(255,120,100,0.35)'); g.addColorStop(1, 'rgba(255,42,42,0)');
    ctx.fillStyle = g; ctx.fillRect(x - 70, 140, 140, 760); ctx.fillStyle = 'rgba(255,225,215,0.95)'; ctx.fillRect(x - 1.5, 140, 3, 760); ctx.restore();
  }
  // 地面上的冲击波（透视的椭圆）
  for (const G of F.ground) {
    ctx.save(); ctx.globalAlpha = G.a; ctx.globalCompositeOperation = 'lighter'; ctx.strokeStyle = HI; ctx.lineWidth = 3; ctx.shadowColor = RED; ctx.shadowBlur = 14; ctx.beginPath();
    for (let k = 0; k <= 48; k++) { const a = k / 48 * TAU, q = project([G.c[0] + Math.cos(a) * G.r, G.c[1], G.c[2] + Math.sin(a) * G.r]); k ? ctx.lineTo(q[0], q[1]) : ctx.moveTo(q[0], q[1]); }
    ctx.stroke(); ctx.restore();
  }
  draw2D2(t, ctx, F);
  for (const b of F.bolts) drawBolt(ctx, b, t);
  if (F.paths) drawPaths(ctx, F.paths, t);
  for (const L of F.labels) drawLabel(ctx, L);
  if (F.spinner && F.spinner.a > 0.01) { const s = F.spinner; ctx.save(); ctx.globalAlpha = s.a; ctx.translate(s.x, s.y); for (let k = 0; k < 8; k++) { const a = k / 8 * TAU + s.t * 5; ctx.globalAlpha = s.a * (0.2 + 0.8 * ((k + Math.floor(s.t * 10)) % 8) / 7); ctx.fillStyle = HI; ctx.beginPath(); ctx.arc(Math.cos(a) * 16, Math.sin(a) * 16, 3.5, 0, TAU); ctx.fill(); } ctx.restore(); }
  for (const s of F.subs) drawSub(t, ctx, s);
  if (F.title) drawTitle(ctx, t, F.title);
  if (F.shock) { ctx.save(); ctx.globalAlpha = F.shock.a; ctx.strokeStyle = F.shock.col; ctx.lineWidth = lerp(6, 1, 1 - F.shock.a / 0.9); ctx.shadowColor = RED; ctx.shadowBlur = 18; ctx.beginPath(); ctx.arc(F.shock.c[0], F.shock.c[1], F.shock.r * 1920, 0, TAU); ctx.stroke(); ctx.restore(); }
}
function drawBolt(ctx, b, t) {
  const R = n => hash(b.seed * 13.7 + n * 7.31 + Math.floor(t * 30) * 0.17);
  const zig = (a, c, n, amp, s0) => { const dx = c[0] - a[0], dy = c[1] - a[1], L = Math.hypot(dx, dy) || 1, nx = -dy / L, ny = dx / L, out = [a]; for (let i = 1; i < n; i++) { const f = i / n, o = (R(s0 + i) - 0.5) * amp * L * Math.sin(Math.PI * f); out.push([a[0] + dx * f + nx * o, a[1] + dy * f + ny * o]); } out.push(c); return out; };
  const main = zig(b.a, b.b, 10, 0.22, 0), branches = [];
  if (b.w > 0.5) for (let k = 0; k < 3; k++) { const p0 = main[3 + k * 2], ang = Math.atan2(b.b[1] - b.a[1], b.b[0] - b.a[0]) + (R(40 + k) - 0.5) * 1.6, L = (60 + 90 * R(50 + k)) * b.w; branches.push(zig(p0, [p0[0] + Math.cos(ang) * L, p0[1] + Math.sin(ang) * L], 5, 0.4, 60 + k * 10)); }
  const a = (1 - b.k) * (0.75 + 0.25 * R(99));
  ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.lineJoin = 'round';
  const stroke = (pts, w, col, al) => { ctx.globalAlpha = a * al; ctx.strokeStyle = col; ctx.lineWidth = w; ctx.shadowColor = RED; ctx.shadowBlur = 24; ctx.beginPath(); pts.forEach((p, i) => i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1])); ctx.stroke(); };
  for (const [w, col, al] of [[18 * b.w, RED, 0.35], [8 * b.w, '#FF6A50', 0.75], [3 * b.w, '#F4D4C6', 1]]) { stroke(main, w, col, al); branches.forEach(br => stroke(br, w * 0.45, col, al * 0.8)); }
  ctx.restore();
}
function drawPaths(ctx, P, t) {
  const line = (pts, w, col, al) => { ctx.globalAlpha = al; ctx.strokeStyle = col; ctx.lineWidth = w; ctx.beginPath(); pts.forEach((p, i) => i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1])); ctx.stroke(); };
  ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.lineJoin = 'round'; ctx.lineCap = 'round'; ctx.shadowColor = RED; ctx.shadowBlur = 16;
  ctx.setLineDash([14, 14]); ctx.lineDashOffset = -t * 40; line(P.long, 4, HI, 0.75 * P.a); ctx.setLineDash([]);   // 远路：长长的虚线弧
  line(P.short, 22, RED, 0.5 * P.a); line(P.short, 11, '#FF6A50', 0.85 * P.a); line(P.short, 4, '#F4D4C6', P.a);   // 近路：又短又粗、很亮
  const comet = (tr, r) => {                                                 // 带拖尾的发光彗星
    ctx.save(); ctx.globalCompositeOperation = 'source-over';               // 普通叠加：拖尾挤在一起时也不会叠成纯白
    for (let k = tr.length - 1; k >= 0; k--) { const p = tr[k], f = 1 - k / tr.length, rr = r * (0.35 + 0.65 * f);
      const g = ctx.createRadialGradient(p[0], p[1], 0, p[0], p[1], rr); g.addColorStop(0, `rgba(235,150,125,${0.62 * f})`); g.addColorStop(0.35, `rgba(235,95,70,${0.6 * f})`); g.addColorStop(1, 'rgba(255,42,42,0)');
      ctx.globalAlpha = P.a; ctx.fillStyle = g; ctx.beginPath(); ctx.arc(p[0], p[1], rr, 0, TAU); ctx.fill(); }
    ctx.restore();
  };
  if (P.cs) comet(P.cs, 80);
  if (P.cl) comet(P.cl, P.slow >= 0 ? 46 + 26 * Math.exp(-P.slow / 0.4) : 46);
  ctx.restore();
}
function drawLabel(ctx, L) {
  if (!(L.a > 0.01)) return;
  const size = L.small ? 40 : 44;
  ctx.save(); ctx.globalAlpha = L.a; ctx.font = fs(700, size); const w = ctx.measureText(L.text).width + 36, h = size + 22;
  const cx = L.anchor === 'left' ? L.x + w / 2 : L.anchor === 'right' ? L.x - w / 2 : L.x;
  if (!L.plain) { ctx.strokeStyle = 'rgba(255,177,153,0.85)'; ctx.lineWidth = 2; ctx.shadowColor = RED; ctx.shadowBlur = 8; ctx.beginPath(); ctx.moveTo(L.to[0], L.to[1]); ctx.lineTo(L.to[0] < cx ? cx - w / 2 - 6 : cx + w / 2 + 6, L.y); ctx.stroke(); ctx.fillStyle = '#F2D8CC'; ctx.beginPath(); ctx.arc(L.to[0], L.to[1], 5, 0, TAU); ctx.fill(); }
  if (L.dot) { ctx.fillStyle = '#F2D8CC'; ctx.shadowColor = RED; ctx.shadowBlur = 10; ctx.beginPath(); ctx.arc(L.dot[0], L.dot[1], 5, 0, TAU); ctx.fill(); ctx.strokeStyle = 'rgba(255,177,153,0.8)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(L.dot[0], L.dot[1]); ctx.lineTo(L.anchor === 'right' ? cx + w / 2 : cx - w / 2, L.y); ctx.stroke(); }
  ctx.shadowBlur = 0; ctx.fillStyle = 'rgba(14,4,4,0.72)'; ctx.beginPath(); ctx.roundRect(cx - w / 2, L.y - h / 2, w, h, 10); ctx.fill();
  ctx.restore();
  glowText(L.text, cx, L.y + 2, fs(700, size), HI, { alpha: L.a, glow: 10, glowColor: RED });
}
function drawTitle(ctx, t, T) {
  // “愤怒”大标题：在脸的左侧（不压脸），红色、大号、发光，带热浪扭曲和往上飘的火星
  const d = t - T.t0, a = clamp(d / 0.15) * (1 - clamp((d - 1.15) / 0.35)); if (a <= 0) return;
  if (!titleCanvas.c) { const c = document.createElement('canvas'); c.width = 900; c.height = 360; titleCanvas.c = c; }
  const c = titleCanvas.c, x = c.getContext('2d'); x.setTransform(1, 0, 0, 1, 0, 0); x.clearRect(0, 0, 900, 360);
  x.font = fs(900, 200); x.textAlign = 'center'; x.textBaseline = 'middle';
  x.shadowColor = RED; x.shadowBlur = 50; x.fillStyle = RED; x.fillText('愤怒', 450, 185); x.shadowBlur = 16; x.fillStyle = '#FF5A44'; x.fillText('愤怒', 450, 185);
  x.shadowBlur = 0; x.globalAlpha = 0.55; x.fillStyle = HI; x.fillText('愤怒', 450, 182); x.globalAlpha = 1;
  const sc = popScale(d), cx = T.x, cy = T.y;
  ctx.save(); ctx.globalAlpha = a; ctx.translate(cx, cy); ctx.scale(sc, sc);
  for (let y = 0; y < 360; y += 4) { const o = 6 * Math.sin(y * 0.09 + t * 14) * (0.4 + 0.6 * (1 - y / 360)); ctx.drawImage(c, 0, y, 900, 4, -450 + o, y - 180, 900, 4); }
  ctx.restore();
  ctx.save(); ctx.globalCompositeOperation = 'lighter';
  for (let i = 0; i < 40; i++) { const f = (d * 0.8 + hash(i * 1.7)) % 1, sx = cx + (hash(i * 3.3) - 0.5) * 460 + 30 * Math.sin(f * 6 + i), sy = cy + 90 - f * 260; ctx.globalAlpha = a * (1 - f) * 0.9; ctx.fillStyle = f < 0.4 ? '#F2D8CC' : HI; ctx.beginPath(); ctx.arc(sx, sy, 2 + 2 * hash(i * 9.1), 0, TAU); ctx.fill(); }
  ctx.restore();
}

// ============================================================ 第二部分：手指温度 → 杯子炸开、沙袋对比 → 冰山 → 结尾直视 → 回到第 0 帧
// ------------------------------------------------------------ 热流：从胸口沿着肩膀往两侧手臂涌出，每小节涌一股；颜色从暗红 → 橙红 → 接近白热
function makeHeat(parent) {
  const n = 9000, P = new Float32Array(n * 3), Sd = new Float32Array(n), Sg = new Float32Array(n);
  for (let i = 0; i < n; i++) { P[i * 3] = hash(i * 1.3) - 0.5; P[i * 3 + 1] = hash(i * 2.7) - 0.5; P[i * 3 + 2] = hash(i * 4.1) - 0.5; Sd[i] = hash(i * 5.3); Sg[i] = i % 2 ? 1 : -1; }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(P, 3)); g.setAttribute('aSeed', new THREE.BufferAttribute(Sd, 1)); g.setAttribute('aSide', new THREE.BufferAttribute(Sg, 1));
  const m = new THREE.ShaderMaterial({ uniforms: { uTime: { value: 0 }, uSurge: { value: 0 }, uHeat: { value: 0 }, uInt: { value: 0 }, uScale: { value: 1 } }, transparent: true, depthWrite: false, depthTest: false, blending: THREE.AdditiveBlending,
    vertexShader: `attribute float aSeed, aSide; uniform float uTime, uSurge, uHeat, uInt, uScale; varying vec3 vC;
      vec3 path(float u, float s){ vec3 a = vec3(0.0, -1.45, 0.34), b = vec3(s*0.95, -1.5, 0.2), c = vec3(s*1.4, -2.55, 0.12);
        return u < 0.45 ? mix(a, b, u/0.45) : mix(b, c, (u - 0.45)/0.55); }
      void main(){ float u = fract(uTime*0.42 + aSeed*3.7); vec3 p = path(u, aSide) + position*vec3(0.16, 0.16, 0.12)*(0.6 + 0.8*u);
        vec4 mv = modelViewMatrix*vec4(p, 1.0); gl_Position = projectionMatrix*mv; gl_PointSize = (2.0 + 3.0*aSeed)*uScale*clamp(6.0/(-mv.z), 0.5, 2.0);
        float front = exp(-pow(u - fract(uTime*0.42), 2.0)*30.0);
        float b = uInt*(0.25 + 1.4*uSurge*(0.4 + 0.6*front))*(1.0 - 0.5*u);
        vec3 c1 = vec3(0.55, 0.05, 0.03), c2 = vec3(1.0, 0.35, 0.12), c3 = vec3(1.0, 0.92, 0.8);
        float h = clamp(uHeat*0.85 + 0.25*front, 0.0, 1.0); vC = (h < 0.5 ? mix(c1, c2, h*2.0) : mix(c2, c3, (h - 0.5)*2.0))*b; }`,
    fragmentShader: `varying vec3 vC; void main(){ vec2 c = gl_PointCoord - 0.5; float d = length(c); if (d > 0.5) discard; gl_FragColor = vec4(vC*exp(-d*d*10.0), 1.0); }` });
  const p = new THREE.Points(g, m); p.frustumCulled = false; p.renderOrder = 40; p.visible = false; parent.add(p); return p;
}
// ------------------------------------------------------------ 杯子（有把手的马克杯）
function makeCup() {
  const pb = new PB(), R = n => hash(n * 1.37 + 0.11); let n = 0;
  const add = (p, br) => pb.add(p, [0, 0, 0], R(n++), [0, 0, 0], [R(n), 0, 0, 1], [br, 30]);
  for (let i = 0; i < 9000; i++) { const a = R(i * 3) * TAU, y = R(i * 3 + 1) * 0.6 - 0.3, rim = y > 0.27, base = y < -0.27; add([Math.cos(a) * 0.3, y, Math.sin(a) * 0.3], rim || base ? 1.5 : 0.6); }
  for (let i = 0; i < 2500; i++) { const a = R(i * 7) * TAU, r = 0.3 * Math.sqrt(R(i * 7 + 1)); add([Math.cos(a) * r, -0.3, Math.sin(a) * r], 0.5); }
  for (let i = 0; i < 2500; i++) { const a = (R(i * 11) - 0.5) * Math.PI * 1.1, b = R(i * 11 + 1) * TAU; add([0.3 + 0.13 * Math.cos(a) + 0.035 * Math.cos(b) * Math.cos(a), 0.13 * Math.sin(a), 0.035 * Math.sin(b)], 1.1); }
  const m = propMat(RED, { bright: 3.0, size: 0.02 }); m.uniforms.uAsm.value = 1;
  const g = new THREE.Group(); K.scene.add(g); const p = new THREE.Points(pb.geometry(THREE), m); p.frustumCulled = false; p.renderOrder = 30; g.add(p); K.mats.push(m); g.visible = false;
  return { g, m };
}
// ------------------------------------------------------------ 沙袋：挂在铁链上的圆柱，有缝线纹理，上下有扣环
function makeSandbag() {
  const pb = new PB(), R = n => hash(n * 2.13 + 0.7); let n = 0;
  const add = (p, br, id = 0) => pb.add(p, [0, 0, 0], R(n++), [0, 0, 0], [R(n), id, 0, 1], [br, 30]);
  const top = -0.35, bot = -1.95, rad = 0.42;
  for (let i = 0; i < 26000; i++) {
    const a = R(i * 3) * TAU, y = lerp(bot, top, R(i * 3 + 1)), bulge = 1 + 0.05 * Math.sin(Math.PI * (y - bot) / (top - bot));
    const seamV = [0, 1, 2, 3].some(k => Math.abs(((a / TAU * 4 + 0.125) % 1) - 0.5) < 0.012 * 4), seamH = [0.25, 0.5, 0.75].some(f => Math.abs((y - bot) / (top - bot) - f) < 0.012);
    const stitch = (seamV && Math.abs(Math.sin(y * 70)) > 0.4) || (seamH && Math.abs(Math.sin(a * 60)) > 0.4);
    add([Math.cos(a) * rad * bulge, y, Math.sin(a) * rad * bulge], stitch ? 1.5 : 0.55);
  }
  for (const yc of [top, bot]) for (let i = 0; i < 4000; i++) { const a = R(i * 5 + yc * 9) * TAU, r = rad * Math.sqrt(R(i * 5 + 1 + yc)); add([Math.cos(a) * r, yc, Math.sin(a) * r], 0.7); }   // 上下底面
  for (const [yc, rr] of [[top - 0.08, 0.13], [bot - 0.08, 0.1]]) for (let i = 0; i < 1600; i++) { const a = R(i * 13 + yc) * TAU, b = R(i * 13 + 2 + yc) * TAU; add([Math.cos(a) * (rr + 0.03 * Math.cos(b)), yc - 0.03 * Math.sin(b) * 0, Math.sin(a) * (rr + 0.03 * Math.cos(b))], 1.4); }   // 扣环
  for (let k = 0; k < 8; k++) for (let i = 0; i < 700; i++) { const a = R(i * 17 + k * 99) * TAU, b = R(i * 17 + 3 + k) * TAU, yc = top - 0.2 - k * 0.24, r1 = 0.11, r2 = 0.025, x = Math.cos(a) * (r1 + r2 * Math.cos(b)), y = Math.sin(a) * (r1 * 1.5 + r2 * Math.cos(b)), z = r2 * Math.sin(b);
    add(k % 2 ? [z, yc + y, x] : [x, yc + y, z], 1.3); }                                   // 铁链：一节横一节竖的椭圆环
  const m = propMat(RED, { bright: 2.0, size: 0.018 }); m.uniforms.uAsm.value = 1;
  const g = new THREE.Group(); K.scene.add(g); const p = new THREE.Points(pb.geometry(THREE), m); p.frustumCulled = false; p.renderOrder = 30; g.add(p); K.mats.push(m); g.visible = false;
  return { g, m };
}
// ------------------------------------------------------------ 冰山：水面上一个红得发亮、棱角锋利的尖；水面下巨大的深暗主体；暗红色的液面（波纹、反光）
function makeIceberg() {
  const R = n => hash(n * 3.17 + 0.3);
  const tip = new PB(), body = new PB(); let n = 0;
  const facet = (pb, apex, base, br, edgeBr, cnt, id) => {                    // 由三角面拼成的棱角形状（面上取点 + 棱线更亮）
    for (let f = 0; f < base.length; f++) { const A = apex, Bv = base[f], Cv = base[(f + 1) % base.length];
      for (let i = 0; i < cnt; i++) { let u = R(n++), v = R(n++); if (u + v > 1) { u = 1 - u; v = 1 - v; } const p = [0, 1, 2].map(j => A[j] + (Bv[j] - A[j]) * u + (Cv[j] - A[j]) * v);
        const edge = v < 0.02 || u < 0.02 || u + v > 0.98; pb.add(p, [0, 0, 0], R(n++), [0, 0, 0], [R(n), id, 0, 1], [edge ? edgeBr : br, 30]); } }
  };
  const ring = (k, r, y, jit) => Array.from({ length: k }, (_, i) => { const a = i / k * TAU + jit * (R(i + y * 10) - 0.5); return [Math.cos(a) * r * (0.75 + 0.5 * R(i * 3 + y)), y, Math.sin(a) * r * (0.75 + 0.5 * R(i * 5 + y))]; });
  const rT = ring(7, 1.05, 0.0, 0.5);
  facet(tip, [0.1, 1.85, 0.05], rT, 0.75, 2.0, 2600, 0);
  facet(tip, [0.55, 1.05, 0.25], ring(5, 0.5, 0.0, 0.6).map(p => [p[0] + 0.5, p[1], p[2] + 0.2]), 0.65, 1.8, 1500, 0);   // 旁边一个小尖，更有棱角
  const rB1 = ring(9, 2.7, -1.2, 0.4), rB2 = ring(9, 3.1, -2.8, 0.4);
  facet(body, [0, -0.02, 0], rB1, 0.22, 0.7, 2600, 1);
  for (let f = 0; f < 9; f++) facet(body, rB1[f], [rB2[f], rB2[(f + 1) % 9], rB1[(f + 1) % 9]], 0.18, 0.6, 1400, 1);
  facet(body, [0.2, -4.6, 0.1], rB2, 0.16, 0.55, 2400, 1);
  const mT = propMat(RED, { bright: 3.6, size: 0.026 }), mB = propMat('#B3221A', { bright: 3.6, size: 0.034 });
  const g = new THREE.Group(); K.scene.add(g); g.visible = false;
  const pT = new THREE.Points(tip.geometry(THREE), mT), pB = new THREE.Points(body.geometry(THREE), mB); [pT, pB].forEach(p => { p.frustumCulled = false; p.renderOrder = 30; g.add(p); }); K.mats.push(mT, mB);
  // 液面
  const N = 26000, P = new Float32Array(N * 3), Sd = new Float32Array(N);
  for (let i = 0; i < N; i++) { const a = hash(i * 1.1) * TAU, r = 9 * Math.sqrt(hash(i * 2.3)); P[i * 3] = Math.cos(a) * r; P[i * 3 + 1] = 0; P[i * 3 + 2] = Math.sin(a) * r; Sd[i] = hash(i * 3.9); }
  const wg = new THREE.BufferGeometry(); wg.setAttribute('position', new THREE.BufferAttribute(P, 3)); wg.setAttribute('aSeed', new THREE.BufferAttribute(Sd, 1));
  const wm = new THREE.ShaderMaterial({ uniforms: { uTime: { value: 0 }, uInt: { value: 1 }, uScale: { value: 1 } }, transparent: true, depthWrite: false, depthTest: false, blending: THREE.AdditiveBlending,
    vertexShader: `attribute float aSeed; uniform float uTime, uInt, uScale; varying float vB; varying float vG;
      void main(){ vec3 p = position; float r = length(p.xz); float w = sin(r*3.2 - uTime*2.2)*0.04 + sin(p.x*1.7 + uTime*1.3)*0.03; p.y += w;
        vec4 mv = modelViewMatrix*vec4(p, 1.0); gl_Position = projectionMatrix*mv; gl_PointSize = (1.6 + 2.0*aSeed)*uScale*clamp(8.0/(-mv.z), 0.4, 2.0);
        vG = pow(max(0.0, sin(r*3.2 - uTime*2.2)), 12.0)*smoothstep(0.8, 1.6, r)*(1.0 - smoothstep(5.0, 9.0, r)); vB = uInt*(0.28 + 1.3*vG)*(1.0 - smoothstep(6.0, 9.0, r)); }`,
    fragmentShader: `varying float vB; varying float vG; void main(){ vec2 c = gl_PointCoord - 0.5; float d = length(c); if (d > 0.5) discard; gl_FragColor = vec4(mix(vec3(0.55, 0.06, 0.04), vec3(1.0, 0.7, 0.6), vG)*vB*exp(-d*d*9.0), 1.0); }` });
  const water = new THREE.Points(wg, wm); water.frustumCulled = false; water.renderOrder = 25; g.add(water);
  return { g, mT, mB, water };
}
// ------------------------------------------------------------ 结尾直视的眼睛：虹膜圆环 + 瞳孔（红色）
function makeIris(head) {
  return [FACE.eyeR, FACE.eyeL].map(e => {
    const pb = new PB(); let n = 0;
    for (let i = 0; i < 3200; i++) { const a = hash(i * 1.7) * TAU, r = 0.04 * Math.sqrt(hash(i * 2.9)), ring = r > 0.028, pupil = r < 0.012; if (pupil) continue; pb.add([Math.cos(a) * r, Math.sin(a) * r, 0], [0, 0, 0], hash(i), [0, 0, 0], [hash(i * 5), 0, 0, 1], [ring ? 2.2 : 0.9, 30]); n++; }
    for (let i = 0; i < 500; i++) { const a = hash(i * 7.1) * TAU; pb.add([Math.cos(a) * 0.042, Math.sin(a) * 0.042, 0], [0, 0, 0], hash(i * 3), [0, 0, 0], [0, 0, 0, 1], [2.6, 30]); }
    const m = propMat('#FF3A2A', { bright: 1.6, size: 0.006 }); m.uniforms.uAsm.value = 1;
    const o = new THREE.Points(pb.geometry(THREE), m); o.frustumCulled = false; o.renderOrder = 48; o.position.set(e[0], e[1], e[2] + 0.035); head.add(o); K.mats.push(m); o.visible = false; return o;
  });
}

// ------------------------------------------------------------ 第二部分的每帧（t ≥ 半身像）
function frame2(t, F, AUD, W) {
  const kick = AUD.kick, bb = beatInBar(t), sway = 0.052 * Math.sin(t * qw(0.9));
  const cupT = SUBS[8].t0, climaxT = BT.onset_fix?.climax ?? SUBS[10].t0,   // 高潮对齐到实测的那一下鼓点（固定速度的拍点网格在这里偏后约 75 毫秒）
    iceT = SUBS[11].t0 - BEAT, sinkT = DN.find(d => d >= SUBS[11].t0 - 0.01), riseT = SUBS[12].t0, endT = SUBS[14].t0, backT = nb(54.8);
  let cam;
  const showW = (s, scale = 1) => { W.g.visible = true; setState(W, { lite: false, gray: false, eyes: 1, halo: 1, props: 1, scatter: 0, aud: AUD, ...s }); animate(W, t, 9, -9, true, AUD); W.g.scale.setScalar(scale); };
  if (t < cupT - 0.55) {
    // ---- 身体已经准备好了：半身像占画面高度约 75%，镜头从脸慢慢下摇到肩膀和胸口；热流每小节从胸口往两侧手臂涌一股；右侧温度条每小节涨一格
    W.g.position.set(0, 0, 0); showW({});
    const k = clamp((t - EV.bust) / (cupT - 0.55 - EV.bust));
    cam = orbit({ pos: [0, lerp(-0.2, -1.05, inOut(k)), lerp(5.4, 5.0, k)], target: [0, lerp(-0.3, -1.25, inOut(k)), 0], fov: 35 }, sway, 0);
    const lastD = DN[lastIdx(DN, t)] ?? EV.bust, surge = t >= EV.bust ? Math.exp(-(t - lastD) / 0.7) : 0;
    S.heat.visible = true; const hu = S.heat.material.uniforms; hu.uTime.value = t; hu.uSurge.value = surge; hu.uHeat.value = k; hu.uInt.value = 0.7 * clamp((t - EV.bust) / 0.5); hu.uScale.value = K.scale;
    const steps = DN.filter(d => d >= EV.bust - 0.01 && d <= t).length;
    F.thermo = { level: clamp(0.18 + steps * 0.2 + 0.04 * surge), a: clamp((t - EV.bust) / 0.4) };
    F.haze = 0.6 + 0.6 * k;
    F.auraK = 1.2;
  } else if (t < iceT) {
    // ---- 杯子摔向地面炸开，画面一分为二：左边打沙袋（火越打越大），右边安静坐着（火慢慢熄成一颗余烬）
    const dC = t - cupT;
    cam = orbit({ pos: [0.45 * Math.sin(t * 1.3), 0.15 + 0.2 * Math.sin(t * 1.9), 10.2 - 0.8 * clamp((t - cupT) / 10) + 0.25 * Math.sin(t * 1.1)], target: [0.15 * Math.sin(t * 0.9), -0.35, 0], fov: 35 }, 0.07 * Math.sin(t * 1.5), 0);   // 镜头一直在动
    if (dC < 0) {
      // 杯子下落（半身像化成粒子散开，杯子从上面掉下来）
      const f = clamp((t - (cupT - 0.55)) / 0.55), form = clamp(f / 0.45), fall = clamp((f - 0.45) / 0.55);
      W.g.position.set(0, 0, 0); showW({ scatter: 0.7 * form + 1.2 * fall });               // 半身像的粒子直接飞成杯子
      S.cup.g.visible = true;
      S.cup.g.scale.setScalar(2.0); S.cup.g.position.set(0, lerp(-0.4, -0.9, fall * fall), 0.6); S.cup.g.rotation.set(0.5 * fall, 0.6 + fall * 2.0, 0.4 * fall); S.cup.m.uniforms.uScatter.value = 0.9 * (1 - form); S.cup.m.uniforms.uScatterDist.value = 1.0; S.cup.m.uniforms.uAlpha.value = 1;
      cam = camLerp(orbit({ pos: [0, -1.05, 5.0], target: [0, -1.25, 0], fov: 35 }, sway, 0), { pos: [0, 0.2, 6.2], target: [0, -0.2, 0], fov: 35 }, inOut(f));
    } else {
      if (dC < 0.7) { S.cup.g.visible = true; S.cup.g.scale.setScalar(2.0); S.cup.g.position.set(0, -0.9, 0.6); S.cup.m.uniforms.uScatter.value = 3.2 * outExpo(dC / 0.7); S.cup.m.uniforms.uScatterDist.value = 1.6; S.cup.m.uniforms.uAlpha.value = 1 - clamp((dC - 0.3) / 0.4); }
      if (dC < 0.5) F.shock = { c: project([0, -0.9, 0]), r: 0.5 * outExpo(dC / 0.5), a: 0.9 * (1 - dC / 0.5), col: HI };
      if (dC < 0.15) F.shake = Math.max(F.shake, 1 - dC / 0.15);
      if (dC < 1 / 30 + 1e-4) F.ca = 1;
      F.bursts.push({ t0: cupT, pos: [0, -0.9, 0.2], n: 90, speed: 2.2, life: 0.9, grav: 1.2, seed: 11, bright: 2.6 });
      F.split = clamp(dC / 0.35);
      // 左：沙袋 + 缩小的愤怒（头顶一团火，每打一下火窜高一截）
      const hits = B.filter(b => b > cupT + 0.3 && b < iceT - 0.2 && Math.round((b - cupT) / BEAT) % 2 === 1);
      const done = hits.filter(h => h <= t), last = done.length ? t - done[done.length - 1] : 9;
      const punch = last < 0.35 ? Math.exp(-last / 0.1) : 0;   // 每打一下镜头跟着推一下
      let swing = 0; for (const h of done) { const d = t - h; swing += 0.46 * Math.exp(-d * 1.1) * Math.sin(d * 5.2); }   // 每打一下大幅摆动（20 度以上），铁链跟着晃
      const inK = clamp(dC / 0.3);                                           // 杯子的碎片直接飞成沙袋和两个人
      cam = { ...cam, pos: [cam.pos[0] - 0.25 * punch, cam.pos[1], cam.pos[2] * (1 - 0.05 * punch)] };
      S.bag.g.visible = true; S.bag.g.scale.setScalar(1.55); S.bag.g.position.set(-3.55, 2.55, 0); S.bag.g.rotation.set(0.12 * Math.sin(t * 2.1) * Math.min(1, Math.abs(swing) * 3), 0.4, swing);
      if (last < 0.4) {
        const ip = new THREE.Vector3(-0.42, -1.2, 0.1); S.bag.g.updateMatrixWorld(true); S.bag.g.localToWorld(ip);
        F.shock2 = { c: project(ip.toArray()), r: 0.17 * outExpo(last / 0.4), a: 1.0 * (1 - last / 0.4) };
        F.bursts.push({ t0: done[done.length - 1], pos: ip.toArray(), n: 110, speed: 2.4, life: 0.6, grav: 0.8, seed: done.length, bright: 2.8 });
        if (last < 0.12) F.shake = Math.max(F.shake, 0.8 * (1 - last / 0.12));
      }
      const fireL = Math.min(2.3, 0.35 + 0.17 * done.length + 0.3 * Math.exp(-last / 0.2)) * (t >= climaxT ? 1.08 + 0.2 * Math.exp(-(t - climaxT) / 0.4) : 1);   // 每被打一次就明显窜高，最后冲到画面上方
      W.g.position.set(-1.45, -0.15, 0.5); showW({ halo: 0.6, scatter: 0.9 * (1 - inK) }, 0.62);
      const C2 = S.chars[3];                                                 // 右：安静坐着的人（灰色、闭眼）
      C2.g.visible = true; C2.g.position.set(2.7, -0.15, 0.5); setState(C2, { lite: false, gray: true, eyes: 0, halo: 0, props: 0, scatter: 0.9 * (1 - inK), aud: { ...AUD, kick: 0 } }); C2.g.scale.setScalar(0.62); C2.mats.forEach(m => { m.uniforms.uDim.value *= 0.5; });
      const bars = DN.filter(d => d > cupT && d < climaxT + 0.01), bdone = bars.filter(d => d <= t).length;
      const fireR = bdone >= bars.length ? 0.05 : 0.75 * (1 - bdone / bars.length) + 0.04 * Math.sin(t * 9);   // 每小节缩小一圈，最后只剩一颗小余烬
      const hp = C => project([C.g.position.x, C.g.position.y + 0.85 * 0.62, C.g.position.z]);
      F.fires = [{ p: hp(W), h: fireL, seed: 1, climax: t >= climaxT ? t - climaxT : -1 }, { p: hp(C2), h: fireR, seed: 2, ember: fireR < 0.1 }];
      F.anger = { x: project([-0.3, 0, 0.5])[0], level: fireL / 1.4, a: F.split };
      F.labels.push({ text: '打沙袋的人', x: project([-2.4, 0, 0])[0], y: 900, a: F.split * clamp((dC - 0.4) / 0.3), plain: true });
      F.labels.push({ text: '安静坐着的人', x: project([2.7, 0, 0])[0], y: 900, a: F.split * clamp((dC - 0.6) / 0.3), plain: true });
      F.year = clamp((t - SUBS[9].t0 + 0.5) / 0.3);
      if (t >= climaxT && t - climaxT < 0.6) F.ring = { c: hp(W), k: (t - climaxT) / 0.6 };   // 火冲到最高、爆出一圈火星
      // 进入冰山：两边的粒子飞散
      const out = clamp((t - (iceT - 0.5)) / 0.5);
      if (out > 0) { S.ice.g.visible = true; S.ice.g.position.set(0, -0.6, 0); S.ice.mT.uniforms.uAsm.value = out; S.ice.mB.uniforms.uAsm.value = out; S.ice.mT.uniforms.uScatter.value = 0; S.ice.mB.uniforms.uScatter.value = 0; S.ice.water.material.uniforms.uInt.value = out; S.ice.water.material.uniforms.uTime.value = t; cam = camLerp(cam, { pos: [0, 1.1, 7.4], target: [0, 0.35, 0], fov: 35 }, inOut(out)); setState(W, { ...W.st, scatter: 1.2 * out }); setState(C2, { ...C2.st, scatter: 1.2 * out }); S.bag.m.uniforms.uScatter.value = 1.2 * out; F.split *= 1 - out; F.fires.forEach(f => { f.h *= 1 - out; }); F.labels.forEach(L => { L.a *= 1 - out; }); F.year *= 1 - out; }
      else S.bag.m.uniforms.uScatter.value = 0.9 * (1 - inK);
    }
    F.auraK = 0.9;
  } else if (t < riseT + 0.6) {
    // ---- 冰山的尖：红得发亮的尖浮在暗红色液面上；下一个两小节开头镜头沉到液面以下，露出巨大的深暗主体，每两拍亮起一个词
    const g = S.ice.g; g.visible = true; g.position.set(0, -0.6, 0); W.g.visible = false;
    const asm = 1; S.ice.mT.uniforms.uAsm.value = asm; S.ice.mB.uniforms.uAsm.value = asm;
    S.ice.water.material.uniforms.uTime.value = t; S.ice.water.material.uniforms.uScale.value = K.scale; S.ice.water.material.uniforms.uInt.value = asm;
    const sink = inOut(clamp((t - sinkT) / 0.9)), rise = inOut(clamp((t - riseT) / 0.6));
    const above = { pos: [Math.sin(t * 0.15) * 1.2, 1.1, 7.4], target: [0, 0.35, 0], fov: 35 }, below = { pos: [Math.sin(t * 0.15) * 1.4, -2.9, 9.6], target: [0, -2.7, 0], fov: 38 };
    cam = camLerp(camLerp(above, below, sink), above, rise);
    S.ice.mT.uniforms.uBright.value = 3.6 * (1 + 0.25 * Math.max(0, kick));
    if (t < sinkT + 0.5) F.labels.push({ text: '愤怒', x: project([1.6, 1.4, 0])[0] + 60, y: project([1.6, 1.4, 0])[1], to: project([0.1, 1.25, 0]), a: asm * (1 - sink) });
    const words = ['委屈', '害怕', '失望'], wpos = [[-1.1, -2.0, 1.2], [1.0, -2.8, 1.3], [-0.2, -3.7, 1.4]];
    F.words = words.map((w, i) => { const tw = sinkT + i * 2 * BEAT, d = t - tw; return { text: w, p: project([wpos[i][0], wpos[i][1] - 0.6, wpos[i][2]]), a: d >= 0 ? clamp(d / 0.25) * (1 - rise) * (0.85 + 0.15 * Math.sin(t * 3 + i)) : 0, pop: d }; });
    if (rise > 0) { S.ice.mT.uniforms.uScatter.value = 2.6 * rise; S.ice.mB.uniforms.uScatter.value = 2.6 * rise; S.ice.mT.uniforms.uScatterDist.value = 1.6; S.ice.mB.uniforms.uScatterDist.value = 1.6; S.ice.water.material.uniforms.uInt.value = asm * (1 - rise); }
    else { S.ice.mT.uniforms.uScatter.value = 0; S.ice.mB.uniforms.uScatter.value = 0; }
    if (rise > 0) { W.g.position.set(0, 0, 0); showW({ scatter: 2.4 * (1 - rise), props: 1 - 0.3 * rise }); cam = camLerp(cam, charCam(0, 0.05, 3.9), rise); }
    F.auraK = 0.9;
  } else if (t < backT) {
    // ---- 冰山的粒子汇聚回愤怒的脸；闪电角慢慢熄灭、裂纹变暗、表情松弛；最后正面直视镜头（虹膜圆环和瞳孔清楚），问话停留至少 3 秒
    const calm = clamp((t - riseT) / (endT - riseT));
    const direct = clamp((t - endT + 0.4) / 0.6);
    W.g.position.set(0, 0, 0);
    showW({ props: 1 - 0.85 * calm, halo: 1 - 0.5 * calm, eyes: 1 - 0.35 * calm * (1 - direct) });
    W.head.rotation.set(0, (1 - direct) * 0.06 * Math.sin(t * qw(1.6) + 2), 0);
    if (W.cracks) { W.cracks.material.uniforms.uB.value = 0; W.cracks.material.uniforms.uBright.value = 2.8 * (1 - 0.8 * calm); }
    if (W.horns) W.horns.material.uniforms.uBright.value = 1.0 * (1 - 0.9 * calm);
    S.irises.forEach(o => { o.visible = direct > 0.02; o.material.uniforms.uBright.value = 1.3 * direct; });
    W.eyes.forEach(m => { m.material.uniforms.uInt.value *= 1 - 0.8 * direct; }); W.eyeHalo.forEach(m => { m.material.uniforms.uInt.value *= 1 - 0.6 * direct; });
    cam = camLerp(orbit(charCam(0, 0.05, 3.9 - 0.25 * calm), sway * (1 - direct), 0), { pos: [0, -0.3, 3.2], target: [0, -0.32, 0], fov: 35 }, inOut(direct));   // 脸在画面上方约 60% 的区域
    F.auraK = 1.1;
  } else {
    // ---- 愤怒缩小、回到那一排；其他六个角色从两侧飞回，最后停在第 0 帧那个七个彩色角色排成一排的画面
    const k = inOut(clamp((t - backT) / 0.45));
    cam = camLerp({ pos: [0, -0.3, 3.2], target: [0, -0.32, 0], fov: 35 }, lineupCam(t), k);
    S.chars.forEach(O => { O.g.visible = true; setState(O, { lite: true, gray: false, eyes: 1, halo: 0.85, props: 1, scatter: 0, aud: { ...AUD, mid: 0, low: 0 } }); animate(O, t, 9, -9, true, { ...AUD, mid: 0, low: 0 }); if (O.i !== WR) O.g.position.x = slotX(O.i) + Math.sign(O.i - WR) * 7 * (1 - inOut(clamp((t - backT - 0.3) / 0.6))); });
    W.g.position.set(lerp(0, slotX(WR), k), 0, 0);
    if (W.cracks) W.cracks.material.uniforms.uBright.value = 2.8; if (W.horns) W.horns.material.uniforms.uBright.value = 1.0;
    F.names = clamp((t - backT - 0.4) / 0.4); F.series = clamp((t - backT - 0.5) / 0.4); F.auraCol = '#B49CE0'; F.auraK = 0.45;
  }
  return cam;
}
// ------------------------------------------------------------ 第二部分的 2D 层
function draw2D2(t, ctx, F) {
  if (F.haze > 0) {                                                          // 热浪：画面左右边缘轻微扭曲
    const c = ctx.canvas, s = K.scale, w = Math.round(260 * s);
    ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0);
    for (let y = 0; y < c.height; y += 6) { const o = F.haze * 4 * s * Math.sin(y * 0.045 / s + t * 9); ctx.drawImage(c, 0, y, w, 6, o, y, w, 6); ctx.drawImage(c, c.width - w, y, w, 6, c.width - w + o, y, w, 6); }
    ctx.restore();
  }
  if (F.thermo) {                                                            // 温度条（画面右侧）
    const T = F.thermo, x = 1700, y0 = 230, y1 = 780; ctx.save(); ctx.globalAlpha = T.a;
    ctx.fillStyle = 'rgba(20,5,5,0.75)'; ctx.strokeStyle = 'rgba(255,177,153,0.8)'; ctx.lineWidth = 3; ctx.beginPath(); ctx.roundRect(x - 22, y0, 44, y1 - y0, 22); ctx.fill(); ctx.stroke();
    ctx.beginPath(); ctx.arc(x, y1 + 30, 42, 0, TAU); ctx.fill(); ctx.stroke();
    const lv = y1 - (y1 - y0 - 30) * T.level, g = ctx.createLinearGradient(0, y1, 0, y0); g.addColorStop(0, RED); g.addColorStop(0.6, '#FF7A40'); g.addColorStop(1, '#FFE8D8');
    ctx.fillStyle = g; ctx.shadowColor = RED; ctx.shadowBlur = 20; ctx.beginPath(); ctx.roundRect(x - 12, lv, 24, y1 + 10 - lv, 12); ctx.fill(); ctx.beginPath(); ctx.arc(x, y1 + 30, 32, 0, TAU); ctx.fillStyle = RED; ctx.fill();
    ctx.shadowBlur = 0; ctx.strokeStyle = 'rgba(255,177,153,0.6)'; ctx.lineWidth = 2; for (let k = 1; k < 6; k++) { const yy = y1 - (y1 - y0 - 30) * k / 6; ctx.beginPath(); ctx.moveTo(x + 26, yy); ctx.lineTo(x + 40, yy); ctx.stroke(); }
    ctx.restore();
    drawLabel(ctx, { text: '手指温度', x: x, y: y0 - 50, a: T.a, plain: true });
  }
  if (F.split > 0) {                                                         // 画面一分为二
    ctx.save(); ctx.globalAlpha = F.split; ctx.globalCompositeOperation = 'lighter'; const h = 540 * F.split;
    const g = ctx.createLinearGradient(940, 0, 980, 0); g.addColorStop(0, 'rgba(255,42,42,0)'); g.addColorStop(0.5, 'rgba(255,170,150,0.9)'); g.addColorStop(1, 'rgba(255,42,42,0)');
    ctx.fillStyle = g; ctx.fillRect(940, 540 - h, 40, 2 * h); ctx.restore();
  }
  if (F.shock2) { const s = F.shock2; ctx.save(); ctx.globalAlpha = s.a; ctx.strokeStyle = HI; ctx.lineWidth = 4; ctx.shadowColor = RED; ctx.shadowBlur = 16; ctx.beginPath(); ctx.arc(s.c[0], s.c[1], s.r * 1920, 0, TAU); ctx.stroke(); ctx.restore(); }
  if (F.fires) for (const f of F.fires) drawFire(ctx, f, t);
  if (F.ring) { ctx.save(); ctx.globalCompositeOperation = 'lighter'; for (let i = 0; i < 36; i++) { const a = i / 36 * TAU, r = 40 + 260 * outExpo(F.ring.k); ctx.globalAlpha = 1 - F.ring.k; ctx.fillStyle = i % 2 ? HI : '#F2D8CC'; ctx.beginPath(); ctx.arc(F.ring.c[0] + Math.cos(a) * r, F.ring.c[1] - 60 + Math.sin(a) * r * 0.7, 4, 0, TAU); ctx.fill(); } ctx.restore(); }
  if (F.anger && F.anger.a > 0) {                                            // 火气条
    const A2 = F.anger, x = A2.x, y0 = 300, y1 = 720; ctx.save(); ctx.globalAlpha = A2.a;
    ctx.fillStyle = 'rgba(20,5,5,0.75)'; ctx.strokeStyle = 'rgba(255,177,153,0.7)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.roundRect(x - 14, y0, 28, y1 - y0, 14); ctx.fill(); ctx.stroke();
    const lv = y1 - (y1 - y0) * clamp(A2.level), g = ctx.createLinearGradient(0, y1, 0, y0); g.addColorStop(0, RED); g.addColorStop(1, '#FFD0B8');
    ctx.fillStyle = g; ctx.shadowColor = RED; ctx.shadowBlur = 14; ctx.beginPath(); ctx.roundRect(x - 8, lv, 16, y1 - lv, 8); ctx.fill(); ctx.restore();
    glowText('火气', x, y0 - 34, fs(700, 32), HI, { alpha: A2.a, glow: 8, glowColor: RED });
  }
  if (F.year > 0) glowText('2002年', 960, 120, fs(700, 44), '#EFE2DC', { alpha: F.year, glow: 14, glowColor: RED });
  if (F.words) for (const w of F.words) if (w.a > 0.01) { const sc = w.pop < 0.25 ? lerp(0.8, 1, outExpo(w.pop / 0.25)) : 1; ctx.save(); ctx.translate(w.p[0], w.p[1]); ctx.scale(sc, sc); glowText(w.text, 0, 0, fs(700, 64), '#FFD9C8', { alpha: w.a, glow: 30, glow2: 60, glowColor: '#FF9A6A' }); ctx.restore(); }
}
function drawFire(ctx, f, t) {
  // 头顶的一团火：几层摇曳的火舌（外红、中橙、芯白）；余烬时只剩一颗暗红的小点
  const [x, y] = f.p, H = 260 * f.h, W2 = 70 + 90 * f.h;
  ctx.save(); ctx.globalCompositeOperation = 'source-over';   // 普通叠加：火舌重叠也不会叠成纯白
  if (f.ember) { const g = ctx.createRadialGradient(x, y - 8, 0, x, y - 8, 22); g.addColorStop(0, 'rgba(255,120,90,0.9)'); g.addColorStop(1, 'rgba(255,42,42,0)'); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y - 8, 22, 0, TAU); ctx.fill(); ctx.restore(); return; }
  for (const [k, col, al] of [[1, 'rgba(255,42,42,', 0.55], [0.72, 'rgba(255,110,60,', 0.7], [0.42, 'rgba(255,175,140,', 0.75]]) {
    for (let j = 0; j < 3; j++) {
      const ph = t * (11 + j * 2.1) + f.seed * 3 + j * 2, w = W2 * k * (0.62 + 0.38 * Math.sin(ph)), h = H * k * (0.72 + 0.28 * Math.sin(ph * 1.7)), sx = x + (j - 1) * w * 0.35 + 24 * Math.sin(ph * 0.7);   // 火舌摇得更猛
      const g = ctx.createLinearGradient(0, y, 0, y - h); g.addColorStop(0, col + al + ')'); g.addColorStop(1, col + '0)');
      ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(sx - w / 2, y); ctx.bezierCurveTo(sx - w / 2, y - h * 0.5, sx + w * 0.15 * Math.sin(ph), y - h * 0.7, sx + 14 * Math.sin(ph * 1.3), y - h);
      ctx.bezierCurveTo(sx - w * 0.1 * Math.sin(ph), y - h * 0.6, sx + w / 2, y - h * 0.45, sx + w / 2, y); ctx.closePath(); ctx.fill();
    }
  }
  ctx.restore();
}
