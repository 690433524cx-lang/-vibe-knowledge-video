// 专属能量特效：觉醒后一直存在，跟着音乐律动。每个特效返回 { update(a, s) }
// s = { pulse 拍点脉冲, after 是否已觉醒, da 觉醒后秒数, right/up/fwd 镜头方向, behind 头后方的点, t 真实时间 }
import { fxPointsMaterial } from './shaders.js';
import { rng, hash, smooth, clamp, mixHex, outCubic } from './util.js';

export function buildFX(type, X) {
  const f = { moon, startrail, foxfire, shadow }[type];
  if (!f) return { update() {} };
  return f(X);
}

const appear = s => s.after ? outCubic(clamp(s.da / 0.45)) : 0;

// 跟着镜头转的面板（局部 xy 平面朝向镜头）
function panel(X) { const g = new X.THREE.Group(); X.E.scene.add(g); return g; }
function face(g, X, pos, scale) { g.position.copy(pos); g.quaternion.copy(X.E.camera.quaternion); g.scale.setScalar(scale); }

// ------------------------------------------------------------ 狼：身后一轮巨大的粒子月亮 + 寒风
function moon(X) {
  const { THREE, E, hex } = X, R = rng(21);
  const g = panel(X);
  // 月面：圆盘里的点，边缘（月面边缘）稍亮，几块暗色的“海”
  const n = 60000, P = new Float32Array(n * 3), M = new Float32Array(n * 4);
  const maria = Array.from({ length: 9 }, () => [R() * 1.4 - 0.7, R() * 1.4 - 0.7, 0.12 + R() * 0.3, 0.35 + R() * 0.4]);
  for (let i = 0; i < n; i++) {
    const r = Math.sqrt(R()), a = R() * Math.PI * 2, x = Math.cos(a) * r, y = Math.sin(a) * r;
    let b = 0.55 + 0.45 * Math.pow(r, 6);
    for (const [mx, my, mr, md] of maria) { const d = Math.hypot(x - mx, y - my); b *= 1 - md * Math.exp(-d * d / (mr * mr)); }
    b *= 0.8 + 0.4 * R();
    P.set([x, y, 0], i * 3); M.set([b, R(), r, 0], i * 4);
  }
  const mat = fxPointsMaterial({ col: mixHex(hex, '#FFFFFF', 0.55), hi: '#FFFFFF', size: 0.05, maxPx: 3, bright: 0.42,
    uniforms: { uK: { value: 0 }, uP: { value: 0 } }, uniformDecl: 'uniform float uK, uP;',
    posHook: `
      float r = aMisc.z; float k = clamp(uK*1.4 - r*0.4, 0.0, 1.0);
      p = position*(0.9 + 0.1*k);
      vis = k; b *= 1.0 + uP*0.25*smoothstep(0.75, 1.0, r); hot = smoothstep(0.85, 1.0, r)*0.5;` });
  const disc = X.addPoints(X.geo({ position: [P, 3], aMisc: [M, 4] }), mat, -20, g);
  const halo = X.addGlow(0, mixHex(hex, '#FFFFFF', 0.3), 1, -21);
  // 寒风：一缕缕细长的光点从镜头前横着掠过，向动物身后吹
  const ns = 520, per = 9, Q = new Float32Array(ns * per * 3), W = new Float32Array(ns * per * 4);
  for (let i = 0; i < ns; i++) for (let j = 0; j < per; j++) {
    const k = i * per + j;
    Q.set([R() * 2 - 1, (R() - 0.5) * 2.4, (R() - 0.5) * 3.2], k * 3);
    if (j) Q.set(Q.subarray(i * per * 3, i * per * 3 + 3), k * 3);
    W.set([1 - j / per, hash(i * 3.1), j, 0.5 + hash(i * 5.3)], k * 4);
  }
  const wmat = fxPointsMaterial({ col: mixHex(hex, '#DFFFF0', 0.6), hi: '#FFFFFF', size: 0.009, maxPx: 3, bright: 0.55,
    uniforms: { uO: { value: new THREE.Vector3() }, uR: { value: new THREE.Vector3(1, 0, 0) }, uU: { value: new THREE.Vector3(0, 1, 0) }, uF: { value: new THREE.Vector3(0, 0, 1) }, uK: { value: 0 }, uP: { value: 0 } },
    uniformDecl: 'uniform vec3 uO, uR, uU, uF; uniform float uK, uP;',
    posHook: `
      float sp = aMisc.w*(2.6 + 1.2*uP);
      float x = fract(position.x*0.5 + 0.5 - uTime*sp*0.16 - aMisc.y)*2.0 - 1.0;
      float L = 4.2;
      vec3 q = uO + uR*(x*L + aMisc.z*0.045) + uU*(position.y + 0.08*sin(x*3.0 + aMisc.y*20.0) - x*0.25) + uF*position.z;
      p = q; b *= aMisc.x*uK*smoothstep(1.0, 0.6, abs(x))*(0.6 + 0.6*uP); hot = aMisc.x;` });
  const windP = X.addPoints(X.geo({ position: [Q, 3], aMisc: [W, 4] }), wmat, 50);
  return {
    update(a, s) {
      const k = appear(s);
      const mo = (X.E.mode === 'card' ? X.E.ep.cardMoon : null) ?? X.E.ep.moon ?? [3.3, 2.0, 7.5];
      const pos = X.E.moonPos ? X.E.moonPos.clone() : X.C.clone().addScaledVector(s.fwd, mo[2]).addScaledVector(s.up, mo[1]).addScaledVector(s.right, mo[0]);
      // 嚎叫那一拍月亮亮度提高 40%，再慢慢回落
      const boost = s.after ? 1 + 0.4 * Math.exp(-Math.max(0, s.da) / 1.1) : 1;
      face(g, X, pos, X.E.ep.moonR ?? 1.3);
      mat.uniforms.uK.value = k; mat.uniforms.uP.value = s.pulse * s.after; mat.uniforms.uBright.value = 0.7 * boost;
      g.visible = k > 0.001;
      halo.position.copy(pos); halo.scale.setScalar(5.2); halo.material.uniforms.uInt.value = 0.05 * k * boost * (1 + 0.15 * s.pulse);
      halo.visible = k > 0.001;
      const wu = wmat.uniforms; wu.uO.value.copy(X.C).addScaledVector(s.fwd, 0.4).addScaledVector(s.up, -0.3);
      wu.uR.value.copy(s.right).multiplyScalar(-1); wu.uU.value.copy(s.up); wu.uF.value.copy(s.fwd); wu.uK.value = k; wu.uP.value = s.pulse;
      windP.visible = k > 0.001;
    },
  };
}

// ------------------------------------------------------------ 猫头鹰：缓缓旋转的星轨 + 发光的几何符文
function glyphLines(type, R) {
  const L = [], circ = (r, n = 48, a0 = 0, a1 = Math.PI * 2) => { const pts = []; for (let i = 0; i <= n; i++) { const a = a0 + (a1 - a0) * i / n; pts.push([Math.cos(a) * r, Math.sin(a) * r]); } L.push(pts); };
  const poly = (r, n, rot = 0, step = 1) => { const pts = []; for (let i = 0; i <= n; i++) { const a = rot + (i * step) * Math.PI * 2 / n; pts.push([Math.cos(a) * r, Math.sin(a) * r]); } L.push(pts); };
  const seg = (a, b) => L.push([a, b]);
  switch (type % 6) {
    case 0: circ(1); poly(0.95, 3, Math.PI / 2); circ(0.3); break;
    case 1: poly(1, 3, Math.PI / 2); poly(1, 3, -Math.PI / 2); circ(1.12); break;
    case 2: circ(1); seg([-1, 0], [1, 0]); seg([0, -1], [0, 1]); circ(0.45); break;
    case 3: poly(1, 4, 0); circ(0.55); poly(0.55, 4, Math.PI / 4); break;
    case 4: circ(1); circ(0.7); for (let i = 0; i < 12; i++) { const a = i * Math.PI / 6; seg([Math.cos(a) * 0.7, Math.sin(a) * 0.7], [Math.cos(a), Math.sin(a)]); } break;
    case 5: poly(1, 5, Math.PI / 2, 2); circ(1.08); break;
  }
  return L;
}
function linesToPoints(lines, spacing) { const out = []; for (const l of lines) for (let i = 0; i < l.length - 1; i++) { const [a, b] = [l[i], l[i + 1]]; const n = Math.max(1, Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1]) / spacing)); for (let j = 0; j < n; j++) out.push([a[0] + (b[0] - a[0]) * j / n, a[1] + (b[1] - a[1]) * j / n]); } return out; }

function startrail(X) {
  const { THREE, hex } = X, R = rng(33);
  const g = panel(X);
  const P = [], M = [];
  // 星轨：同心圆弧，弧头亮、弧尾渐暗
  for (let ring = 0; ring < 34; ring++) {
    const r = 0.55 + ring * 0.085 + R() * 0.03;
    const arcs = 1 + (R() < 0.5 ? 1 : 0);
    for (let k = 0; k < arcs; k++) {
      const len = (0.4 + R() * 1.9), a0 = R() * Math.PI * 2, n = Math.ceil(len * r * 260);
      for (let i = 0; i < n; i++) { const u = i / n, a = a0 + u * len; P.push(Math.cos(a) * r, Math.sin(a) * r, 0); M.push(Math.pow(u, 1.6) * (0.7 + 0.5 * R()), R(), r, ring); }
    }
  }
  const tmat = fxPointsMaterial({ col: hex, hi: '#FFFFFF', size: 0.006, maxPx: 3, bright: 0.85,
    uniforms: { uK: { value: 0 }, uP: { value: 0 } }, uniformDecl: 'uniform float uK, uP;',
    posHook: `
      float r = aMisc.z; float ang = -uTime*(0.10 + 0.012*aMisc.w) - (1.0 - uK)*1.2;
      float c = cos(ang), s = sin(ang); p = vec3(c*position.x - s*position.y, s*position.x + c*position.y, 0.0)*(0.85 + 0.15*uK);
      vis = clamp(uK*1.6 - (r - 0.5)*0.5, 0.0, 1.0); b *= (0.7 + 0.5*uP*step(0.95, h1(aMisc.y*9.0 + floor(uTime*2.0)))) ; hot = aMisc.x*0.8;` });
  X.addPoints(X.geo({ position: [new Float32Array(P), 3], aMisc: [new Float32Array(M), 4] }), tmat, -18, g);
  // 符文：六个几何符号在一圈上，反向缓慢转动，按拍轮流亮起
  const RP = [], RM = [];
  for (let k = 0; k < 6; k++) {
    for (const [x, y] of linesToPoints(glyphLines(k, R), 0.035)) { RP.push(x, y, 0); RM.push(1, R(), k, 0); }
  }
  const rmat = fxPointsMaterial({ col: mixHex(hex, '#FFFFFF', 0.25), hi: '#FFFFFF', size: 0.007, maxPx: 3, bright: 0.85,
    uniforms: { uK: { value: 0 }, uB: { value: 0 }, uBi: { value: 0 } }, uniformDecl: 'uniform float uK, uB, uBi;',
    posHook: `
      float k = aMisc.z; float ang = k*1.0472 + uTime*0.16 + 0.5;
      vec2 c = vec2(cos(ang), sin(ang))*vec2(2.05, 1.55);
      float spin = uTime*0.4*(mod(k, 2.0) < 0.5 ? 1.0 : -1.0);
      vec2 q = mat2(cos(spin), -sin(spin), sin(spin), cos(spin))*position.xy*0.2;
      p = vec3(c + q, 0.0);
      float on = abs(k - uBi) < 0.5 ? uB : 0.0;
      vis = uK; b *= 0.55 + 1.1*on; hot = on;` });
  X.addPoints(X.geo({ position: [new Float32Array(RP), 3], aMisc: [new Float32Array(RM), 4] }), rmat, -17, g);
  return {
    update(a, s) {
      const k = appear(s);
      face(g, X, X.C.clone().addScaledVector(s.fwd, 1.8).addScaledVector(s.up, 0.05), 1.2);
      g.visible = k > 0.001;
      tmat.uniforms.uK.value = k; tmat.uniforms.uP.value = s.pulse;
      const bi = s.after ? Math.floor(s.da / X.E.beat) % 6 : -1;
      rmat.uniforms.uK.value = k; rmat.uniforms.uB.value = s.pulse; rmat.uniforms.uBi.value = bi;
    },
  };
}

// ------------------------------------------------------------ 狐狸：身后几团跳动的狐火，排成扇形
function foxfire(X) {
  const { THREE, hex } = X, R = rng(44);
  const NF = 7, per = 2600, P = new Float32Array(NF * per * 3), M = new Float32Array(NF * per * 4);
  for (let f = 0; f < NF; f++) for (let i = 0; i < per; i++) { const k = f * per + i; P.set([R() - 0.5, R(), R() - 0.5], k * 3); M.set([0.7 + 0.6 * R(), R(), f, R()], k * 4); }
  const mat = fxPointsMaterial({ col: hex, hi: '#FFFFFF', size: 0.011, maxPx: 5, bright: 0.75,
    uniforms: { uK: { value: 0 }, uO: { value: new THREE.Vector3() }, uR: { value: new THREE.Vector3(1, 0, 0) }, uU: { value: new THREE.Vector3(0, 1, 0) }, uF: { value: new THREE.Vector3(0, 0, 1) }, uFl: { value: new Array(7).fill(0) } },
    uniformDecl: 'uniform float uK; uniform vec3 uO, uR, uU, uF; uniform float uFl[7];',
    posHook: `
      int fi = int(aMisc.z + 0.5); float fl = uFl[fi];
      float th = (aMisc.z/6.0 - 0.5)*2.3;               // 扇形：-66° 到 66°
      vec3 dir = uU*cos(th) + uR*sin(th);
      vec3 side = uR*cos(th) - uU*sin(th);
      vec3 base = uO + dir*1.15;
      float u = fract(aMisc.w + uTime*(0.9 + 0.3*h1(aMisc.z*3.7)));   // 粒子的一生：从火根升到火尖
      float h = (0.75 + 0.35*fl)*u;
      float w = 0.24*(1.0 + 0.3*fl)*pow(1.0 - u, 0.7)*sin(min(u*3.0, 1.5708));
      float wob = sin(uTime*7.0 + aMisc.z*2.0 + u*6.0)*0.06*u;
      p = base + dir*h + side*(position.x*w*2.0 + wob) + uF*position.z*w*1.2;
      vis = uK*smoothstep(0.0, 0.08, u); b *= (1.0 - u)*(1.0 - u)*1.6*(1.0 + 0.6*fl); hot = (1.0 - u)*1.2 - abs(position.x)*1.4;` });
  X.addPoints(X.geo({ position: [P, 3], aMisc: [M, 4] }), mat, -16);
  const halos = Array.from({ length: NF }, () => X.addGlow(0, hex, 1, -17));
  return {
    update(a, s) {
      const k = appear(s);
      const O = X.C.clone().addScaledVector(s.fwd, 1.5).addScaledVector(s.up, -0.55);
      const u = mat.uniforms; u.uK.value = k; u.uO.value.copy(O); u.uR.value.copy(s.right); u.uU.value.copy(s.up); u.uF.value.copy(s.fwd);
      const bi = s.after ? Math.floor(s.da / X.E.beat + 0.0001) : -99;
      for (let f = 0; f < NF; f++) {
        // 每拍一团火跳一下（从两边往中间轮流）
        const order = [0, 6, 1, 5, 2, 4, 3][((bi % 7) + 7) % 7];
        u.uFl.value[f] = (order === f ? s.pulse : 0) + 0.15 * Math.sin(s.t * 5 + f);
        const th = (f / 6 - 0.5) * 2.3, dir = s.up.clone().multiplyScalar(Math.cos(th)).addScaledVector(s.right, Math.sin(th));
        halos[f].position.copy(O).addScaledVector(dir, 1.5); halos[f].scale.setScalar(0.9);
        halos[f].material.uniforms.uInt.value = k * (0.09 + 0.08 * u.uFl.value[f]);
      }
    },
  };
}

// ------------------------------------------------------------ 猫：脚下流动的影子 + 身边偶尔闪过的细小电光
function shadow(X) {
  const { THREE, E, hex } = X, R = rng(55);
  const n = 30000, P = new Float32Array(n * 3), M = new Float32Array(n * 4);
  for (let i = 0; i < n; i++) { const r = Math.pow(R(), 0.7), a = R() * Math.PI * 2; P.set([Math.cos(a) * r, 0, Math.sin(a) * r], i * 3); M.set([0.5 + R() * 0.8, R(), r, a], i * 4); }
  const mat = fxPointsMaterial({ col: mixHex(hex, '#000000', 0.35), hi: hex, size: 0.013, maxPx: 4, bright: 0.55,
    uniforms: { uK: { value: 0 }, uO: { value: new THREE.Vector3() }, uP: { value: 0 } }, uniformDecl: 'uniform float uK, uP; uniform vec3 uO;',
    posHook: `
      float r = aMisc.z, a0 = aMisc.w;
      float a = a0 + uTime*(0.25 + 0.2*h1(aMisc.y*3.0))*(1.2 - r);
      float rr = r*(1.0 + 0.12*sin(a*3.0 + uTime*1.3) + 0.15*uP);
      p = uO + vec3(cos(a)*rr*2.6, 0.01*sin(uTime*2.0 + a0*5.0), sin(a)*rr*1.6 - rr*0.6);
      vis = uK; b *= smoothstep(1.0, 0.3, r)*(0.6 + 0.4*sin(a*5.0 - uTime*2.0)); hot = 0.3*uP*(1.0 - r);` });
  const pool = X.addPoints(X.geo({ position: [P, 3], aMisc: [M, 4] }), mat, 1);
  // 电光：预先生成 8 条折线，按拍轮流闪一下
  const bolts = [], BP = [], BM = [];
  for (let b = 0; b < 8; b++) {
    const ang = (b / 8) * Math.PI * 2 + R() * 0.5, rr = 0.9 + R() * 0.5;
    let x = Math.cos(ang) * rr, y = Math.sin(ang) * rr * 0.8 - 0.1;
    const pts = [[x, y]]; let dir = ang + Math.PI * (0.6 + R() * 0.8);
    for (let s = 0; s < 7; s++) { dir += (R() - 0.5) * 1.6; x += Math.cos(dir) * 0.07; y += Math.sin(dir) * 0.07; pts.push([x, y]); if (R() < 0.3) { const bx = x + Math.cos(dir + 1.2) * 0.06, by = y + Math.sin(dir + 1.2) * 0.06; bolts.push(0); for (const [px, py] of linesToPoints([[[x, y], [bx, by]]], 0.006)) { BP.push(px, py, 0); BM.push(1, R(), b, 0.6); } } }
    for (const [px, py] of linesToPoints([pts], 0.006)) { BP.push(px, py, 0); BM.push(1, R(), b, 1); }
  }
  const g = panel(X);
  const bmat = fxPointsMaterial({ col: mixHex(hex, '#FFFFFF', 0.3), hi: '#FFFFFF', size: 0.006, maxPx: 3, bright: 1.2,
    uniforms: { uOn: { value: new Array(8).fill(0) } }, uniformDecl: 'uniform float uOn[8];',
    posHook: `int bi = int(aMisc.z + 0.5); float on = uOn[bi]; vis = step(0.01, on); b *= on*aMisc.w*(0.7 + 0.3*h1(aMisc.y + uTime*30.0)); hot = on; p.xy += (vec2(h1(aMisc.y*3.0 + floor(uTime*30.0)), h1(aMisc.y*5.0 + floor(uTime*30.0))) - 0.5)*0.01;` });
  X.addPoints(X.geo({ position: [new Float32Array(BP), 3], aMisc: [new Float32Array(BM), 4] }), bmat, 45, g);
  return {
    update(a, s) {
      const k = appear(s);
      mat.uniforms.uK.value = k; mat.uniforms.uO.value.set(X.C.x, E.groundY + 0.02, X.C.z - 0.5); mat.uniforms.uP.value = s.pulse;
      face(g, X, X.C.clone().addScaledVector(s.fwd, 0.3).addScaledVector(s.up, -0.35), 1.0);
      // 每两拍闪一条电光（拍上），持续约 0.12 秒；觉醒那一下两条一起
      const on = bmat.uniforms.uOn.value; on.fill(0);
      if (s.after) {
        const bi = Math.floor(s.da / X.E.beat + 1e-4), ph = s.da - bi * X.E.beat;
        const f = ph < 0.13 ? Math.pow(1 - ph / 0.13, 1.5) * (ph < 0.03 ? 1 : 0.6 + 0.4 * (Math.floor(ph * 60) % 2)) : 0;
        if (bi === 0) { on[0] = on[4] = f; } else if (bi % 2 === 0) on[(bi * 3) % 8] = f;
      }
    },
  };
}
