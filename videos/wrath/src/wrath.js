// 合集的场景与时间轴（数据与音频工具在 show_core.js）
import * as THREE from 'three';
import { K, glow, project } from './core.js';
import { FACE } from './geo.js';
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
  C.eyes = [FACE.eyeR, FACE.eyeL].map(p => { const m = glow(2, sin.col, [0.5, 0.28], head, { billboard: false, order: 46, core: '#FFFFFF' }); m.position.set(p[0], p[1], p[2] + 0.04); return m; });
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
  const base = s.gray ? (s.lite ? 5.1 : 5.0) :   // 灰色脸亮度提高 60%
     (s.lite ? 2.4 : 1.85) * clamp(0.42 / luma, 0.7, 1.15);       // 按颜色的亮度补偿：绿色不过曝、紫色不发暗
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
  C.aura.material.uniforms.uInt.value = (s.lite ? 0.03 : 0.07) * (1 + 0.6 * Math.max(0, kick)) * (1 - clamp(sc / 1.5));
  C.aura.scale.setScalar((s.lite ? 0.27 : 1) * (1 + 0.12 * Math.max(0, kick)));
  C.rays.material.uniforms.uInt.value = (s.lite ? 0.03 : 0.12) * (1 + 0.5 * Math.max(0, kick)) * (1 - clamp(sc / 1.5));
  C.rays.material.uniforms.uRot.value = qw(0.22) * (a ? a.t : 0); C.rays.material.uniforms.uBurst.value = 1 + 0.45 * Math.max(0, kick);   // 放射光线随鼓点伸长
  C.g.scale.setScalar(s.shrink != null ? s.shrink : 1);
  if (s.lite) C.body.material.uniforms.uDim.value *= 0.5;
  C.bodyLite.scale.set(0.47, 1, 0.8); C.halo.position.z = s.lite ? -0.25 : -0.7;   // 光环贴近头部，不因透视偏到旁边的格子   // 排成一排时肩膀收窄，不越过格子   // 排成一排时肩膀和身体淡一半，视线集中在脸上
  C.propMats.forEach(m => { m.uniforms.uL.value = s.lite ? 1 : 0; });
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

// ============================================================ 《七宗罪》第三集：愤怒（56 秒，横屏）
// 扫描抽中愤怒 → 三圈人群（闪电大多打在最亲的人身上）→ 粒子大脑（近路先到杏仁核，鼓点进来那一拍爆亮）→ 半身像（手指温度）
// → 杯子炸开、沙袋对比 → 冰山 → 结尾直视 → 回到开头那一排（首尾一样）
const RED = '#FF2A2A', HI = '#FFB199', WR = 2;
let DN, BEAT, DROP, EV, SUBS;
const nb = x => B.reduce((a, b) => Math.abs(b - x) < Math.abs(a - x) ? b : a, B[0]);           // 最近的拍点
const nd = x => DN.reduce((a, b) => Math.abs(b - x) < Math.abs(a - x) ? b : a, DN[0]);         // 最近的小节第一拍
const nextBeat = x => B.find(b => b > x + 1e-4) ?? x + BEAT;
const SUB_LIST = [
  [0.2, '你吼得最凶的那个人，'], [4.4, '往往不是陌生人，而是你最〔亲〕的人。'], [8.0, '调查发现：大多数人生气的对象，是〔家人、伴侣和朋友〕。'],
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
  for (const [want, text, size] of SUB_LIST) {
    const minD = Math.max(1.0 + 0.17 * charCount(text), size ? 3.0 : 0);
    let t0 = nb(want); if (t0 < prevEnd - 0.02) t0 = B.find(b => b >= prevEnd - 0.02);
    out.push({ text, t0, size: size ?? 52, minD }); prevEnd = t0 + minD;
  }
  out.forEach((s, i) => { s.t1 = i + 1 < out.length ? out[i + 1].t0 - 0.06 : Math.min(TL - 0.3, s.t0 + Math.max(s.minD, 3.0)); });
  return out;
}

export function build(scene, beats, heads, audioEnv) {
  S = scene; BT = beats; B = beats.beats; TL = beats.duration; DN = beats.downbeats; BEAT = beats.beat; DROP = beats.drop;
  setAudio(audioEnv, beats);
  // 关键事件（全部对齐到拍点 / 小节第一拍）
  EV = {
    sweep1: nb(0.5), off: nb(1.0), back: nb(1.5), swing: nb(2.3), stop: nb(3.4), title: nb(3.6),
    rings: nd(4.4), bolts: [nd(6.5), nd(8.7), nd(10.9)], outer: nb(12.9), thin: nextBeat(nb(12.9)),
    brain: nd(15.3), go: nb(15.6), drop: DROP, slow: 0, bust: nb(25.0),
  };
  SUBS = scheduleSubs();
  EV.slow = SUBS[6].t0;                                                     // 远路的光点在“绕远路的理智……”那一句时才到终点
  EV.bust0 = EV.bust - 2 * BEAT;                                            // 大脑飞回、汇聚成半身像
  S.chars = SINS.map((sin, i) => makeChar(sin, i, heads));
  S.spot = makeSpot();
  S.stars = [makeStars(14000, -22, 1.1, 11), makeStars(5000, -9, 1.7, 12)];
  S.gather = makeGather();
  S.minis = makeMinis(heads);
  S.brain = makeBrain();
  // 愤怒的裂纹：反转 / 变身时爆亮（uB）
  const W = S.chars[WR];
  if (W.cracks) W.cracks.material = (() => { const m = propMat('#FF7A3A', { bright: 2.8, size: 0.008, colHook: '{ b *= (0.8 + 0.5*sin(uTime*qw(7.0) + aExtra.y*1.7))*(1.0 + 3.0*uB); col = mix(col, vec3(1.0, 0.85, 0.6), 0.35 + 0.4*uB); }' }); W.propMats.splice(W.propMats.indexOf(W.cracks.material), 1, m); K.mats.push(m); return m; })();
}
// ------------------------------------------------------------ 三圈同心圆的灰色半身像（内 6、中 10、外 16）
const RINGS = [{ n: 6, r: 2.0, label: '家人 / 伴侣 / 朋友' }, { n: 10, r: 3.35, label: '同事 / 熟人' }, { n: 16, r: 4.8, label: '陌生人' }];
function makeMinis(heads) {
  const out = [], bodyMat = idolMaterial(RED, { bright: 0.75, rim: 0.4, size: 0.0085, cran: 0.8 });
  bodyMat.uniforms.uGray.value = 1; K.mats.push(bodyMat);
  RINGS.forEach((ring, ri) => {
    for (let k = 0; k < ring.n; k++) {
      const a = (k / ring.n) * TAU + ri * 0.35, g = new THREE.Group();
      g.position.set(Math.cos(a) * ring.r, 0, Math.sin(a) * ring.r); g.scale.setScalar(0.42); K.scene.add(g);
      const m = idolMaterial(RED, { bright: 0.85, cran: 0.3, rim: 0.15, cranEdge: 1, size: 0.0105 }); m.uniforms.uGray.value = 1; m.uniforms.uEyeOpen.value = 0;
      const head = pts(heads.neutralLite, m, g, 10), body = pts(heads.bodyLite, bodyMat, g, 9); body.scale.set(0.6, 1, 0.8);
      out.push({ g, m, head, ring: ri, a, hit: -9 });
    }
  });
  out.bodyMat = bodyMat;
  return out;
}
// ------------------------------------------------------------ 红色的粒子大脑（嫉妒那一集的模型），侧面，前额朝右
const BR = { eye: [-1.22, -0.26, -0.2], amyg: [-0.24, -0.33, -0.12], pfc: [-0.98, 0.34, -0.22] };
const SHORT = [BR.eye, [-0.9, -0.33, -0.18], [-0.55, -0.36, -0.15], BR.amyg];
const LONG = [BR.eye, [-0.85, -0.62, -0.2], [-0.2, -0.72, -0.2], [0.45, -0.5, -0.2], [0.78, 0.05, -0.2], [0.55, 0.6, -0.2], [-0.05, 0.82, -0.2], [-0.62, 0.68, -0.22], BR.pfc];
function makeBrain() {
  const g = new THREE.Group(); g.position.set(-0.45, 0.05, 0); g.scale.setScalar(1.15); g.rotation.y = Math.PI; K.scene.add(g);   // 转半圈（不要用负缩放，否则法线反了、整颗大脑变暗）
  const m = brainMaterial(RED); m.uniforms.uSeeX.value = 99; m.uniforms.uBright.value = 4.6; m.uniforms.uRegR.value = 0.025; m.uniforms.uSize.value = 0.014; m.uniforms.uHot.value.set(HI);   // 嫉妒那一集的大脑材质（会正确处理表面的明暗）
  const p = pts(buildBrainSide(511, 1).geometry(THREE), m, g, 20);
  return { g, m, p };
}
const pathAt = (P, u) => { const L = []; let tot = 0; for (let i = 0; i < P.length - 1; i++) { const l = Math.hypot(...P[i + 1].map((v, j) => v - P[i][j])); L.push(l); tot += l; }
  let d = clamp(u) * tot; for (let i = 0; i < L.length; i++) { if (d <= L[i] || i === L.length - 1) { const f = L[i] ? d / L[i] : 0; return P[i].map((v, j) => lerp(v, P[i + 1][j], clamp(f))); } d -= L[i]; } return P[P.length - 1]; };
const brainAsm = k => { const u = S.brain.m.uniforms; u.uScatter.value = 2.2 * (1 - k); u.uScatterDist.value = 1.4; u.uAlpha.value = clamp(k * 1.5); };
const brainScreen = p => { const v = new THREE.Vector3(...p); S.brain.g.updateMatrixWorld(true); S.brain.g.localToWorld(v); return project(v.toArray()); };

// ------------------------------------------------------------ 律动：前奏只在小节第一拍轻轻弹 4%；鼓点进来后每两拍弹 6%
function pulse(t) {
  let v = 0;
  const list = t < DROP ? DN : B.filter((b, i) => b >= DROP - 1e-3 && Math.round((b - DROP) / BEAT) % 2 === 0);
  const j = lastIdx(list, t);
  for (let k = Math.max(0, j - 1); k <= j; k++) { if (k < 0) continue; const d = t - list[k]; if (d < 0 || d > 0.5) continue; v += Math.exp(-d * 13) * Math.cos(d * 26); }
  return (t < DROP ? 0.67 : 1) * v;                                         // setState 里 kick=1 对应放大 6%
}
const LINEUP = { pos: [0, 0.25, 9.6], target: [0, -0.05, 0], fov: 35 };
const lineupCam = t => orbit({ ...LINEUP, pos: [0, LINEUP.pos[1] + 0.06 * Math.sin(t * qw(1.7)), LINEUP.pos[2] - 0.18 * Math.sin(t * qw(1.1))] }, 0.03 * Math.sin(t * qw(1.9)), 0);
const charCam = (x, y, d) => ({ pos: [x, y + 0.08, d], target: [x, y, 0], fov: 35 });

export function events() {
  return [{ name: '抽中愤怒', t: EV.stop }, { name: '三圈人群', t: EV.rings }, ...EV.bolts.map((b, i) => ({ name: `闪电 ${i + 1}`, t: b })), { name: '粒子大脑', t: EV.brain }, { name: '杏仁核爆发', t: EV.drop }, { name: '半身像', t: EV.bust }];
}

// ------------------------------------------------------------ 每帧
export function frame(t) {
  const F = { flash: 0, flashCol: '#FFFFFF', shake: 0, shock: null, bloom: 1.0, auraCol: RED, auraK: 0.6, subs: [], names: null, ripples: [], bursts: [], blur: 0, ca: 0, labels: [], bolts: [], paths: null, scan: null, title: null, header: t >= 3.4 && t < TL - 0.7 };
  const endK = 1 - clamp((t - (TL - 0.9)) / 0.6);
  const kick = pulse(t) * endK, low = env(t, 'low'), mid = env(t, 'mid'), high = env(t, 'high');
  const bb = beatInBar(t), after = t >= DROP;
  const off = after && bb.k === 0 ? Math.exp(-bb.d / 0.1) * endK : 0;          // 鼓点进来后：每小节第一拍镜头推一下 + 4px 震动
  F.shake = 0.67 * off;
  const AUD = { kick, low, mid, high, t, endK };
  S.chars.forEach(O => { O.g.position.set(slotX(O.i), 0, 0); O.g.rotation.set(0, 0, 0); animate(O, t, -9, -9, false, AUD); });
  S.chars.forEach(O => setState(O, { lite: true, gray: true, eyes: 0, halo: 0, props: 1, scatter: 0, aud: AUD }));
  S.minis.forEach(m => { m.g.visible = false; }); S.brain.g.visible = false; S.gather.visible = false;
  S.gather.material.uniforms.uTime.value = t; S.gather.material.uniforms.uScale.value = K.scale;
  const W = S.chars[WR];
  let cam = lineupCam(t), spotX = 0, spotInt = 0;
  const sway = 0.052 * Math.sin(t * qw(0.9));                                // ±3 度持续绕转
  const hits = [EV.stop, EV.drop].map(x => t - x).filter(x => x >= 0), hit = hits.length ? Math.min(...hits) : 9;
  if (t < EV.rings) {
    // ---- 扫描：那一排灰色、闭眼、戴着灰色道具的半身像；扫描线来回扫，被扫到的脸亮一下、放大 10%
    let sx = null;
    const X = i => project([slotX(i), HEAD_C[1], 0])[0], L0 = -80, R0 = 2000;
    if (t >= EV.sweep1 && t < EV.off) sx = lerp(L0, R0, inOut((t - EV.sweep1) / (EV.off - EV.sweep1)));
    else if (t >= EV.back && t < EV.swing) sx = lerp(R0, X(0), inOut((t - EV.back) / (EV.swing - EV.back)));
    else if (t >= EV.swing && t < EV.stop) { const mid2 = nextBeat(EV.swing); sx = t < mid2 ? lerp(X(0), X(4) + 40, inOut((t - EV.swing) / (mid2 - EV.swing))) : lerp(X(4) + 40, X(WR), outExpo((t - mid2) / (EV.stop - mid2))); }
    else if (t >= EV.stop) sx = X(WR);
    F.scan = sx != null ? { x: sx, a: t < EV.stop ? 1 : 1 - clamp((t - EV.stop) / 0.3) } : null;
    const won = t >= EV.stop, k = won ? outExpo(clamp((t - EV.stop) / 0.5)) : 0;
    S.chars.forEach((O, i) => {
      if (won && i === WR) return;
      const pop = sx != null && !won ? Math.exp(-Math.pow((sx - X(i)) / 70, 2)) : 0;
      setState(O, { lite: true, gray: true, eyes: 0, halo: 0, props: 1, scatter: 2.4 * k, aud: AUD, pop });
      if (won) O.g.position.x += Math.sign(i - WR) * 5 * k;                  // 其他六张散开
    });
    if (won) {
      const dt = t - EV.stop;
      setState(W, { lite: false, gray: false, eyes: outExpo(clamp(dt / 0.12)), halo: outExpo(clamp(dt / 0.3)), props: 1, scatter: 0, aud: AUD, pop: Math.exp(-dt / 0.25) });
      animate(W, t, 9, -9, true, AUD);
      if (W.cracks) W.cracks.material.uniforms.uB.value = Math.exp(-dt / 0.35);
      if (W.horns) W.horns.material.uniforms.uB.value = 0.6 * Math.exp(-dt / 0.3);
      cam = camLerp(lineupCam(t), charCam(slotX(WR), 0.12, 4.2), outExpo(clamp(dt / 0.7)));
      if (dt < 0.5) F.shock = { c: project([slotX(WR), HEAD_C[1], 0.3]), r: 0.7 * outExpo(dt / 0.5), a: 0.8 * (1 - dt / 0.5), col: HI };
      if (dt < 0.15) F.shake = Math.max(F.shake, 1 - dt / 0.15);
      if (dt < 1 / 30 + 1e-4) F.ca = 1;
      F.auraK = 0.6 + 0.4 * k;
      F.bursts.push({ t0: EV.stop, pos: [slotX(WR), HEAD_C[1] + 0.6, 0.2], n: 60, speed: 1.4, life: 0.6, grav: -0.2, seed: 7, bright: 2.4 });
    } else F.auraK = 0.25;
    if (t >= EV.title - 0.25) F.title = { t0: EV.title - 0.25 };
    F.sparkCol = HI;
  }
  if (t >= EV.rings) S.chars.forEach((O, i) => { if (i !== WR) { setState(O, { lite: true, gray: true, eyes: 0, halo: 0, props: 0, scatter: 3, aud: AUD }); O.g.visible = false; } });
  else S.chars.forEach(O => { O.g.visible = true; });
  if (t < EV.rings) {} else if (t < EV.brain + 0.55) {
    // ---- 三圈人群：镜头拉高变俯视；中间的愤怒每小节第一拍劈出一道闪电，大部分打在内圈
    const tr = clamp((t - EV.rings) / (2 * BEAT)), up = inOut(tr);
    const gone = clamp((t - EV.brain) / 0.5);                                // 人群化成粒子
    const OVER = { pos: [0, 8.6, 7.6], target: [0, -0.2, 0.4], fov: 35 };
    const toOuter = t >= EV.outer ? 0.45 * inOut(clamp((t - EV.outer) / 1.2)) : 0;   // 镜头推向外圈（只推一半，愤怒还在画面里）
    const tgtO = [Math.cos(0.9) * 4.8, 0, Math.sin(0.9) * 4.8];
    let over = { ...OVER, pos: [OVER.pos[0], OVER.pos[1] - 0.35 * clamp((t - EV.rings) / 10), OVER.pos[2] - 0.5 * clamp((t - EV.rings) / 10)] };
    over = { pos: lerp3(over.pos, [tgtO[0] * 0.55, 5.2, tgtO[2] * 0.55 + 4.6], toOuter), target: lerp3(over.target, [tgtO[0] * 0.8, 0, tgtO[2] * 0.8], toOuter), fov: 35 };
    over = orbit(over, sway, 0);
    cam = camLerp(charCam(slotX(WR), 0.12, 4.2), over, up);
    W.g.position.set(lerp(slotX(WR), 0, up), 0, 0);
    setState(W, { lite: false, gray: false, eyes: 1, halo: 1, props: 1, scatter: 2.2 * gone, aud: AUD });
    animate(W, t, 9, -9, true, AUD); W.g.scale.setScalar(lerp(1, 0.6, up));
    if (W.cracks) W.cracks.material.uniforms.uB.value = 0.3 * Math.exp(-(t - (lastIdx(DN, t) >= 0 ? DN[lastIdx(DN, t)] : 0)) / 0.25);
    S.chars.forEach((O, i) => { if (i !== WR) setState(O, { lite: true, gray: true, eyes: 0, halo: 0, props: 0, scatter: 3, aud: AUD }); });
    // 闪电：大部分打内圈，偶尔中圈；外圈几乎不被打到（最后只有一道很细的闪了一下）
    const plan = [[EV.bolts[0], 0, 1], [EV.bolts[1], 0, 4], [EV.bolts[2], 1, 3], [EV.thin, 2, 2]];
    const camNow = cam;
    S.minis.forEach((m, n) => {
      m.g.visible = true;
      const cp = camNow.pos; m.g.rotation.set(-0.42, Math.atan2(cp[0] - m.g.position.x, cp[2] - m.g.position.z), 0, 'YXZ');
      const appear = clamp((t - EV.rings - 0.2 - m.ring * 0.25) / 0.6);
      let h = 0; for (const [bt, ri, idx] of plan) { const d = t - bt; if (d >= 0 && d < 0.6 && m.ring === ri && RINGS.slice(0, ri).reduce((a, r) => a + r.n, 0) + idx === n) h = Math.max(h, Math.exp(-d / 0.18) * (ri === 2 ? 0.5 : 1)); }
      m.m.uniforms.uGray.value = 1 - 0.85 * h; m.m.uniforms.uDim.value = 3.2 * (1 + 1.4 * h) * (0.15 + 0.85 * appear) * (1 - gone);
      m.m.uniforms.uScatter.value = 2.0 * (1 - appear) + 2.4 * gone; m.m.uniforms.uScatterDist.value = 1.4; m.m.uniforms.uDrift.value = 0.006;
    });
    S.minis.bodyMat.uniforms.uDim.value = 1.6 * up * (1 - gone);
    for (const [bt, ri, idx] of plan) {
      const d = t - bt; if (d < 0 || d > 0.35) continue;
      const m = S.minis[RINGS.slice(0, ri).reduce((a, r) => a + r.n, 0) + idx];
      const a = project([W.g.position.x, HEAD_C[1] * 0.6 + 0.1, 0]), b2 = project([m.g.position.x, 0.3, m.g.position.z]);
      F.bolts.push({ a, b: b2, k: d / 0.35, w: ri === 2 ? 0.35 : 1, seed: Math.round(bt * 10) });
      if (ri < 2 && d < 0.4) F.shock = { c: b2, r: 0.06 * outExpo(d / 0.35), a: 0.7 * (1 - d / 0.35), col: HI };
    }
    if (up > 0.6 && gone < 0.3) {
      const ys = [330, 520, 720];
      RINGS.forEach((ring, ri) => { let p = null, bd = 1e9; S.minis.forEach(m => { if (m.ring !== ri) return; const q = project([m.g.position.x, 0.25, m.g.position.z]); const d = Math.abs(q[0] - 1330) + Math.abs(q[1] - [330, 520, 720][ri]) * 0.6; if (q[0] > 60 && q[0] < 1400 && q[1] > 80 && q[1] < 1000 && d < bd) { bd = d; p = q; } }); if (!p) return; F.labels.push({ text: ring.label, x: 1560, y: ys[ri], to: p, a: clamp((up - 0.6) / 0.4) * (1 - gone) * clamp((t - EV.rings - 0.4 - ri * 0.3) / 0.3) }); });
    }
    if (t >= EV.brain) { S.brain.g.visible = true; brainAsm(clamp((t - EV.brain) / 0.55)); }
  } else if (t < EV.bust0 + 2 * BEAT) {
    // ---- 粒子大脑：一道光从眼睛的位置进来，分成近路（先到杏仁核）和远路（绕到前面的理智）
    const BCAM = { pos: [0.35, 0.05, 5.0], target: [0.35, 0.0, 0], fov: 35 };
    const fromOver = clamp((t - EV.brain - 0.55) / 0.5);
    cam = orbit({ ...BCAM, pos: [BCAM.pos[0], BCAM.pos[1], BCAM.pos[2] * (1 - 0.06 * clamp((t - EV.brain) / 8))] }, sway, 0.35);
    const leaving = clamp((t - EV.bust0) / (2 * BEAT));
    S.brain.g.visible = true; brainAsm(1 - leaving);
    S.brain.g.scale.setScalar(1.15 * (1 + 0.04 * kick));
    const dD = t - EV.drop;
    S.brain.m.uniforms.uRegC.value[0].set(...BR.amyg, dD >= 0 ? 2.2 * Math.exp(-dD / 0.6) + 0.5 : 0.25 * clamp((t - EV.go) / (EV.drop - EV.go)));   // 杏仁核爆亮
    S.brain.m.uniforms.uRegC.value[1].set(...BR.pfc, t >= EV.slow ? 0.9 * Math.exp(-(t - EV.slow) / 0.8) + 0.25 : 0);                              // 理智最后轻轻亮一下
    S.brain.m.uniforms.uAll.value = (dD >= 0 ? 0.55 * Math.exp(-dD / 0.35) : 0) + 0.12 * Math.max(0, kick);                                                                     // 整个大脑泛起一下红光
    if (dD >= 0 && dD < 0.6) F.shock = { c: brainScreen(BR.amyg), r: 0.45 * outExpo(dD / 0.6), a: 0.85 * (1 - dD / 0.6), col: HI };
    if (dD >= 0 && dD < 0.15) F.shake = Math.max(F.shake, 1 - dD / 0.15);
    if (dD >= 0 && dD < 1 / 30 + 1e-4) F.ca = 1;
    const uS = clamp((t - EV.go) / (EV.drop - EV.go)), uL = clamp((t - EV.go) / (EV.slow - EV.go));
    F.paths = { short: SHORT.map(brainScreen), long: LONG.map(brainScreen), ds: t >= EV.go ? brainScreen(pathAt(SHORT, Math.pow(uS, 1.15))) : null, dl: t >= EV.go ? brainScreen(pathAt(LONG, uL)) : null,
      us: uS, ul: uL, arrive: dD >= 0 ? dD : -1, slow: t >= EV.slow ? t - EV.slow : -1, a: fromOver * (1 - leaving) };
    const la = fromOver * (1 - leaving);
    F.labels.push({ text: '杏仁核', x: 1600, y: 640, to: brainScreen(BR.amyg), a: la * clamp((t - EV.go) / 0.3) });
    F.labels.push({ text: '理智', x: 1600, y: 300, to: brainScreen(BR.pfc), a: la * clamp((t - EV.go - 0.3) / 0.3) });
    F.labels.push({ text: '近路', x: 1180, y: 760, to: brainScreen(pathAt(SHORT, 0.45)), a: la * clamp((t - EV.go - 0.6) / 0.3), small: true });
    F.labels.push({ text: '远路', x: 640, y: 170, to: brainScreen(pathAt(LONG, 0.62)), a: la * clamp((t - EV.go - 0.9) / 0.3), small: true });
    F.auraK = 0.8; F.bloom = 1.0 + 0.4 * (dD >= 0 ? Math.exp(-dD / 0.4) : 0);
    // 大脑飞回、汇聚成愤怒的半身像
    if (leaving > 0) {
      W.g.position.set(0, 0, 0);
      setState(W, { lite: false, gray: false, eyes: leaving, halo: leaving, props: leaving, scatter: 2.4 * (1 - outExpo(leaving)), aud: AUD });
      animate(W, t, 9, -9, true, AUD);
      cam = camLerp(cam, charCam(0, -0.45, 5.6), inOut(leaving));
    } else S.chars.forEach(O => setState(O, { lite: true, gray: true, eyes: 0, halo: 0, props: 0, scatter: 3, aud: AUD }));
    F.sparkCol = HI;
  } else {
    // ---- 半身像（预览到这里为止）
    W.g.position.set(0, 0, 0);
    setState(W, { lite: false, gray: false, eyes: 1, halo: 1, props: 1, scatter: 0, aud: AUD });
    animate(W, t, 9, -9, true, AUD);
    cam = orbit(charCam(0, -0.45 - 0.25 * clamp((t - EV.bust) / 4), 5.6 * (1 - 0.03 * clamp((t - EV.bust) / 4))), sway, 0);
    F.auraK = 1;
  }
  // 律动：高音的细碎节奏用小火花表现
  if (t > EV.stop && high > 0.2) for (let h = Math.max(0, lastIdx(A.hats, t) - 2); h <= lastIdx(A.hats, t); h++) {
    const ht = A.hats[h]; if (h < 0 || t - ht > 0.15) continue;
    const c = W.g.position, a = hash(h * 3.1) * TAU, rr = 0.9 + 0.5 * hash(h * 5.7);
    F.bursts.push({ t0: ht, pos: [c.x + Math.cos(a) * rr, HEAD_C[1] + Math.sin(a) * rr * 0.7, 0.3], n: Math.round(3 + 10 * env(ht, 'high')), speed: 0.5, life: 0.15, grav: 0, seed: h, bright: 2.0 });
  }
  if (hit < 0.15) F.shake = Math.max(F.shake, 1 - hit / 0.15);
  cam = { ...cam, pos: [cam.pos[0], cam.pos[1], cam.pos[2] * (1 - 0.03 * off)] };
  S.spot.position.set(spotX, 4.6, -0.6); S.spot.material.uniforms.uInt.value = spotInt * 0.35;
  S.stars.forEach(s => { s.material.uniforms.uScale.value = K.scale; });
  for (const s of SUBS) if (t >= s.t0 - 0.01 && t <= s.t1 + 0.12) F.subs.push({ text: s.text, t0: s.t0, t1: s.t1, size: s.size, pop: s.t0, col: HI });
  F.cam = cam; F.kick = kick;
  return F;
}

// ------------------------------------------------------------ 2D 层
const titleCanvas = { c: null };
export function draw2D(t, ctx, F) {
  if (F.header) glowText('七宗罪 · 第三集 · 愤怒', 60, 58, fs(700, 24), 'rgba(255,215,205,0.7)', { align: 'left', glow: 6, nobox: true, alpha: clamp((t - 3.4) / 0.3) * (1 - clamp((t - (TL - 1.0)) / 0.3)) });
  // 扫描线
  if (F.scan) {
    const x = F.scan.x; ctx.save(); ctx.globalAlpha = F.scan.a; ctx.globalCompositeOperation = 'lighter';
    const g = ctx.createLinearGradient(x - 70, 0, x + 70, 0); g.addColorStop(0, 'rgba(255,42,42,0)'); g.addColorStop(0.5, 'rgba(255,120,100,0.35)'); g.addColorStop(1, 'rgba(255,42,42,0)');
    ctx.fillStyle = g; ctx.fillRect(x - 70, 140, 140, 760);
    ctx.fillStyle = 'rgba(255,225,215,0.95)'; ctx.fillRect(x - 1.5, 140, 3, 760); ctx.restore();
  }
  // 闪电（主干 + 分叉，抖动的折线）
  for (const b of F.bolts) drawBolt(ctx, b, t);
  // 大脑里的两条路
  if (F.paths) drawPaths(ctx, F.paths, t);
  for (const L of F.labels) drawLabel(ctx, L);
  for (const s of F.subs) drawSub(t, ctx, s);
  if (F.title) drawTitle(ctx, t, F.title.t0);
  if (F.shock) { ctx.save(); ctx.globalAlpha = F.shock.a; ctx.strokeStyle = F.shock.col; ctx.lineWidth = lerp(6, 1, 1 - F.shock.a / 0.8); ctx.shadowColor = RED; ctx.shadowBlur = 18; ctx.beginPath(); ctx.arc(F.shock.c[0], F.shock.c[1], F.shock.r * 1920, 0, TAU); ctx.stroke(); ctx.restore(); }
}
function drawBolt(ctx, b, t) {
  const R = n => hash(b.seed * 13.7 + n * 7.31 + Math.floor(t * 30) * 0.17);
  const pts = [b.a]; const N = 9, dx = b.b[0] - b.a[0], dy = b.b[1] - b.a[1], L = Math.hypot(dx, dy), nx = -dy / L, ny = dx / L;
  for (let i = 1; i < N; i++) { const f = i / N, o = (R(i) - 0.5) * 0.18 * L * Math.sin(Math.PI * f); pts.push([b.a[0] + dx * f + nx * o, b.a[1] + dy * f + ny * o]); }
  pts.push(b.b);
  const a = (1 - b.k) * (0.7 + 0.3 * R(99));
  ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.lineJoin = 'round';
  for (const [w, col, al] of [[14 * b.w, RED, 0.35], [6 * b.w, '#FF6A50', 0.7], [2.2 * b.w, '#FFF1EA', 1]]) {
    ctx.globalAlpha = a * al; ctx.strokeStyle = col; ctx.lineWidth = w; ctx.shadowColor = RED; ctx.shadowBlur = 20; ctx.beginPath(); pts.forEach((p, i) => i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1])); ctx.stroke();
  }
  if (b.w > 0.5) { const k = 4 + Math.floor(R(5) * 3), p0 = pts[k]; ctx.globalAlpha = a * 0.7; ctx.lineWidth = 2; ctx.strokeStyle = '#FF9A80'; ctx.beginPath(); ctx.moveTo(p0[0], p0[1]); ctx.lineTo(p0[0] + (R(7) - 0.3) * 120, p0[1] + (R(8) - 0.5) * 120); ctx.stroke(); }
  ctx.restore();
}
function drawPaths(ctx, P, t) {
  const line = (pts, w, col, al) => { ctx.globalAlpha = al; ctx.strokeStyle = col; ctx.lineWidth = w; ctx.beginPath(); pts.forEach((p, i) => i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1])); ctx.stroke(); };
  ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.lineJoin = 'round'; ctx.lineCap = 'round'; ctx.shadowColor = RED; ctx.shadowBlur = 14;
  ctx.setLineDash([2, 10]); line(P.long, 3, HI, 0.55 * P.a); ctx.setLineDash([]);
  line(P.short, 7, '#FF6A50', 0.8 * P.a); line(P.short, 2.5, '#FFF1EA', 0.9 * P.a);
  const dot = (p, r, al) => { const g = ctx.createRadialGradient(p[0], p[1], 0, p[0], p[1], r); g.addColorStop(0, `rgba(255,248,240,${al})`); g.addColorStop(0.35, `rgba(255,140,110,${al * 0.8})`); g.addColorStop(1, 'rgba(255,42,42,0)'); ctx.globalAlpha = P.a; ctx.fillStyle = g; ctx.beginPath(); ctx.arc(p[0], p[1], r, 0, TAU); ctx.fill(); };
  if (P.ds && P.arrive < 0) dot(P.ds, 34, 1);
  if (P.dl) dot(P.dl, P.slow >= 0 ? 26 + 10 * Math.exp(-P.slow / 0.4) : 22, P.slow >= 0 ? 0.6 + 0.4 * Math.exp(-P.slow / 0.4) : 0.75);
  ctx.restore();
}
function drawLabel(ctx, L) {
  if (!(L.a > 0.01)) return;
  const size = L.small ? 40 : 44;
  ctx.save(); ctx.globalAlpha = L.a; ctx.font = fs(700, size); const w = ctx.measureText(L.text).width + 36, h = size + 22;
  ctx.strokeStyle = 'rgba(255,177,153,0.85)'; ctx.lineWidth = 2; ctx.shadowColor = RED; ctx.shadowBlur = 8;
  const ex = L.x - w / 2 - 6; ctx.beginPath(); ctx.moveTo(L.to[0], L.to[1]); ctx.lineTo(L.to[0] < L.x ? ex : L.x + w / 2 + 6, L.y); ctx.stroke();
  ctx.fillStyle = '#FFF1EA'; ctx.beginPath(); ctx.arc(L.to[0], L.to[1], 5, 0, TAU); ctx.fill();
  ctx.shadowBlur = 0; ctx.fillStyle = 'rgba(14,4,4,0.72)'; ctx.beginPath(); ctx.roundRect(L.x - w / 2, L.y - h / 2, w, h, 10); ctx.fill();
  ctx.restore();
  glowText(L.text, L.x, L.y + 2, fs(700, size), HI, { alpha: L.a, glow: 10, glowColor: RED });
}
function drawTitle(ctx, t, t0) {
  // “愤怒”大标题：和前两集同样的样式（红色、大号、发光），加热浪扭曲和往上飘的火星
  const d = t - t0, a = clamp(d / 0.15) * (1 - clamp((d - 1.15) / 0.35)); if (a <= 0) return;
  if (!titleCanvas.c) { const c = document.createElement('canvas'); c.width = 900; c.height = 360; titleCanvas.c = c; }
  const c = titleCanvas.c, x = c.getContext('2d'); x.setTransform(1, 0, 0, 1, 0, 0); x.clearRect(0, 0, 900, 360);
  x.font = fs(900, 220); x.textAlign = 'center'; x.textBaseline = 'middle';
  x.shadowColor = RED; x.shadowBlur = 50; x.fillStyle = RED; x.fillText('愤怒', 450, 185); x.shadowBlur = 16; x.fillStyle = '#FF5A44'; x.fillText('愤怒', 450, 185);
  x.shadowBlur = 0; x.globalAlpha = 0.55; x.fillStyle = HI; x.fillText('愤怒', 450, 182); x.globalAlpha = 1;
  const sc = popScale(d), cx = 960, cy = 330;
  ctx.save(); ctx.globalAlpha = a; ctx.translate(cx, cy); ctx.scale(sc, sc);
  for (let y = 0; y < 360; y += 4) { const o = 6 * Math.sin(y * 0.09 + t * 14) * (0.4 + 0.6 * (1 - y / 360)); ctx.drawImage(c, 0, y, 900, 4, -450 + o, y - 180, 900, 4); }   // 热浪扭曲
  ctx.restore();
  ctx.save(); ctx.globalCompositeOperation = 'lighter';
  for (let i = 0; i < 40; i++) { const f = (d * 0.8 + hash(i * 1.7)) % 1, sx = cx + (hash(i * 3.3) - 0.5) * 520 + 30 * Math.sin(f * 6 + i), sy = cy + 90 - f * 260; ctx.globalAlpha = a * (1 - f) * 0.9; ctx.fillStyle = f < 0.4 ? '#FFF1EA' : HI; ctx.beginPath(); ctx.arc(sx, sy, 2 + 2 * hash(i * 9.1), 0, TAU); ctx.fill(); }   // 火星
  ctx.restore();
}
