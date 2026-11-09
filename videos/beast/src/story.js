// 正文三段的画面（GL）：镜头关键帧、岩石、远处山脊、狼群影子、发光小路、远处另一双眼睛、两双眼睛之间的光
// 全部由 episode.story 配置，时间来自 main.js 的 timeline()（T.story）。每个元素都跟着拍点律动，镜头始终在动。
import * as THREE from 'three';
import { beastMaterial, fxPointsMaterial, glowMaterial } from './shaders.js';
import { clamp, lerp, smooth, inOut, outBack, rng, hash, mixHex, D2R } from './util.js';
const outBackS = x => outBack(x, 2.2);

const V = (...a) => new THREE.Vector3(...a);

export function buildStory(X) {
  const { E, addPoints, geo } = X, ep = E.ep, S = ep.story, T = E.T, ST = T.story, hex = ep.color, R = rng(91);
  if (!S) return { cam: () => null, update() {} };
  const C = E.C;
  // ---- 镜头：shot = { yaw, pitch, dist, eyes:[x,y] 眼睛中点在屏幕上的位置, pan 沿镜头右方向平移（世界单位）, fov }
  function shot(sp, aim) {
    const yaw = sp.yaw * D2R, pitch = sp.pitch * D2R, dist = sp.dist, fov = sp.fov ?? 32;
    const dir = V(Math.sin(yaw) * Math.cos(pitch), Math.sin(pitch), Math.cos(yaw) * Math.cos(pitch));
    const fwd = dir.clone().negate(), right = new THREE.Vector3().crossVectors(fwd, V(0, 1, 0)).normalize(), up = new THREE.Vector3().crossVectors(right, fwd);
    const ppu = E.H / (2 * dist * Math.tan(fov * D2R / 2));
    const pos = aim.clone().addScaledVector(dir, dist);
    const target = aim.clone().addScaledVector(right, -(sp.eyes[0] - E.W / 2) / ppu).addScaledVector(up, (sp.eyes[1] - E.H / 2) / ppu);
    if (sp.pan) { pos.addScaledVector(right, sp.pan); target.addScaledVector(right, sp.pan); }
    return { pos, target, fov, right, fwd, up, ppu };
  }
  const tmpCam = new THREE.PerspectiveCamera(32, E.W / E.H, 0.05, 400);
  function unproject(sh, sx, sy, depth) {
    tmpCam.fov = sh.fov; tmpCam.position.copy(sh.pos); tmpCam.lookAt(sh.target); tmpCam.updateProjectionMatrix(); tmpCam.updateMatrixWorld();
    const ndc = V(sx / E.W * 2 - 1, -(sy / E.H * 2 - 1), 0.5).unproject(tmpCam).sub(sh.pos).normalize();
    return sh.pos.clone().addScaledVector(ndc, depth / ndc.dot(sh.fwd));
  }
  // 场景布置用的参考镜头（山脊、狼群、光路终点按这两个镜头在屏幕上的位置放）
  const wide = shot(S.geom.wide, C), panEnd = shot(S.geom.pan, C);
  // 每条字幕一个镜头：[起, 止) 内缓慢推近（距离 × 0.92）、轻微环绕（±4°）；换镜头时 0.3 秒快速推拉 + 运动模糊
  const SH = S.cams.map((c, i) => ({ ...c, t0: ST.subs[i].t0, t1: ST.subs[i].t1 }));
  function shotAt(c, u) {
    const sp = { ...c, dist: c.dist * (1 - (c.push ?? 0.08) * u), yaw: c.yaw + (c.orbit ?? 4) * Math.sin((u - 0.5) * Math.PI), pitch: c.pitch + (c.pitchTo != null ? (c.pitchTo - c.pitch) * u : 0), pan: (c.pan ?? 0) * inOut(u) };
    return shot(sp, c.aim === 'eyes' ? eyeMid(lerp(c.t0, c.t1, u)) : C);
  }

  // ---- 岩石：狼脚下一块突出的岩石（顶面边缘最亮，崖面稀疏）
  {
    const n = 80000, P = new Float32Array(n * 3), M = new Float32Array(n * 4);
    const x0 = C.x - 1.7, x1 = C.x + 1.7, z0 = C.z - 3.4, z1 = C.z + 1.3;   // 向前（狼的前方）突出
    const top = (x, z) => 0.02 - 0.12 * Math.pow((z - z0) / (z1 - z0), 3) + 0.06 * Math.sin(x * 3.1 + z * 1.7);
    for (let i = 0; i < n; i++) {
      let x, y, z, b;
      if (R() < 0.45) { x = lerp(x0, x1, R()); z = lerp(z0, z1, R()); const edge = Math.max(Math.abs((x - C.x) / 1.7), (z - z0) / (z1 - z0)); y = top(x, z) - R() * 0.02; b = 0.35 + 0.9 * Math.pow(edge, 6); }
      else { // 崖面：前沿和两侧往下掉
        const side = R(); const u = R();
        if (side < 0.5) { x = lerp(x0, x1, u); z = z1 - R() * 0.15; } else { x = side < 0.75 ? x0 : x1; z = lerp(z0, z1, u); }
        y = top(x, z) - Math.pow(R(), 0.7) * 4.5; b = 0.75 * Math.pow(1 - (top(x, z) - y) / 4.5, 1.5) + 0.08; if (top(x, z) - y < 0.12) b = 1.2;
      }
      P.set([x, y, z], i * 3); M.set([b, R(), 0, 0], i * 4);
    }
    E.rock = addPoints(geo({ position: [P, 3], aMisc: [M, 4] }), fxPointsMaterial({ col: mixHex(hex, '#8C9690', 0.6), hi: mixHex(hex, '#FFFFFF', 0.5), size: 0.05, maxPx: 3.5, bright: 2.2,
      uniforms: { uK: { value: 0 }, uP: { value: 0 } }, uniformDecl: 'uniform float uK, uP;',
      posHook: `vis = uK; b *= 0.75 + 0.25*sin(uTime*(2.0 + 3.0*aMisc.y) + aMisc.y*40.0) + uP*0.15; hot = smoothstep(0.8, 1.2, aMisc.x)*0.6;` }), 3);
  }
  // ---- 山脊：在屏幕上给出位置，按镜头反投影到远处（左：狼群所在；右：小路的终点）
  function ridge(sh, sx0, sx1, sy, depth, peak, seed) {
    const n = 70000, P = new Float32Array(n * 3), M = new Float32Array(n * 4), RR = rng(seed);
    const a = unproject(sh, sx0, sy, depth), b = unproject(sh, sx1, sy, depth);
    const prof = u => 0.55 * Math.sin(u * Math.PI) * peak + 0.25 * Math.sin(u * 9.0 + seed) * peak * 0.4 + 0.15 * Math.sin(u * 23.0 + seed * 2.0) * peak * 0.2;
    for (let i = 0; i < n; i++) {
      const u = RR(), base = a.clone().lerp(b, u), h = prof(u), rim = RR() < 0.32, d = rim ? RR() * 0.015 : Math.pow(RR(), 0.6);
      const y = base.y + h - d * (h + 6);
      P.set([base.x + (RR() - 0.5) * 0.5, y, base.z + (RR() - 0.5) * 0.5], i * 3);
      M.set([rim ? 0.8 : 0.5 * Math.pow(1 - d, 1.2) + 0.1, RR(), u, 0], i * 4);
    }
    const top = a.clone().lerp(b, 0.5); top.y += prof(0.5);
    return { P, M, a, b, top, prof };
  }
  const rl = ridge(wide, -80, 960, S.leftRidgeY ?? 640, 30, 2.6, 3), rr = ridge(panEnd, 1180, 2100, S.rightRidgeY ?? 600, 34, 3.2, 7);
  const ridgeMat = () => fxPointsMaterial({ col: mixHex(hex, '#5C6A63', 0.7), hi: mixHex(hex, '#DDEDE3', 0.5), size: 0.2, maxPx: 3.5, bright: 1.5,
    uniforms: { uK: { value: 0 } }, uniformDecl: 'uniform float uK;', posHook: `vis = uK; b *= 0.8 + 0.2*sin(uTime*3.0 + aMisc.y*50.0); hot = step(0.9, aMisc.x)*0.4;` });
  E.ridgeL = addPoints(geo({ position: [rl.P, 3], aMisc: [rl.M, 4] }), ridgeMat(), -12);
  E.ridgeR = addPoints(geo({ position: [rr.P, 3], aMisc: [rr.M, 4] }), ridgeMat(), -12);
  // ---- 狼群影子：同一个狼模型，灰色、亮度 20%、半透明、屏幕上约主角的 1/4；挨在一起、背对我们的狼；后来化成粒子飘散
  const pack = [];
  {
    const n = S.pack ?? 6, base = rl.a.clone().lerp(rl.b, 0.42); base.y += rl.prof(0.42) - 0.15;
    const dHero = wide.pos.distanceTo(C), dPack = wide.pos.distanceTo(base), sc = 0.25 * dPack / dHero;
    const away = rl.a.clone().sub(rl.b).setY(0).normalize().addScaledVector(wide.fwd.clone().setY(0).normalize(), 0.6).normalize();   // 朝屏幕左后方：背对主角
    const yaw = Math.atan2(away.x, away.z);
    const packGeo = E.beast.geometry.clone(); packGeo.setDrawRange(0, Math.floor(E.count * 0.22));
    const matOpts = { col: '#7C8681', hi: '#C9D2CD', rim: '#AAB3AE', bright: (ep.bright ?? 2) * (S.packBright ?? 0.35), size: 0.03 };
    for (let k = 0; k < n; k++) {
      const m = beastMaterial(matOpts); m.uniforms.uA.value = 99; m.uniforms.uAsm0.value = 0; m.uniforms.uHit.value = 0.1;
      const pts = new THREE.Points(E.beast.geometry, m); pts.frustumCulled = false; pts.renderOrder = -10;
      const g = new THREE.Group(); g.add(pts); E.scene.add(g); E.mats.push(m);
      const off = (k - (n - 1) / 2) * 0.55 * sc * 2.2;
      g.position.copy(base).addScaledVector(wide.right, off).addScaledVector(wide.fwd, (k % 2) * 0.9 * sc * 2).add(V(0, -C.y * 0 , 0));
      g.position.y -= 0.0;
      g.rotation.y = yaw + Math.PI + (hash(k * 3.1) - 0.5) * 0.5; g.scale.setScalar(sc);
      pts.geometry = packGeo;
      pack.push({ g, m, ph: hash(k * 7.7) });
    }
  }
  // ---- 发光小路：从狼脚下沿地面延伸到右边远处山脊的顶端，每一拍延伸一段；终点亮起柔和的绿色光点
  const p0 = V(C.x + 0.2, 0.06, C.z + 0.6), p3 = rr.top.clone().add(V(0, 0.1, 0));
  const c1 = p0.clone().addScaledVector(panEnd.right, 3.5).add(V(0, 0.02, 0)), c2 = p3.clone().addScaledVector(panEnd.right, -9).add(V(0, -1.2, 0)).addScaledVector(panEnd.fwd, -4);
  const bez = (u) => { const a = 1 - u; return p0.clone().multiplyScalar(a * a * a).addScaledVector(c1, 3 * a * a * u).addScaledVector(c2, 3 * a * u * u).addScaledVector(p3, u * u * u); };
  {
    const n = 42000, P = new Float32Array(n * 3), M = new Float32Array(n * 4);
    for (let i = 0; i < n; i++) { const u = Math.pow(R(), 0.85), q = bez(u); const w = (0.12 + 0.5 * u) * (S.pathWidth ?? 3); P.set([q.x + (R() - 0.5) * w, q.y + R() * 0.04, q.z + (R() - 0.5) * w], i * 3); M.set([0.6 + 0.8 * R(), R(), u, 0], i * 4); }
    E.path = addPoints(geo({ position: [P, 3], aMisc: [M, 4] }), fxPointsMaterial({ col: hex, hi: '#E8FFF0', size: 0.04, maxPx: 4, bright: 1.4,
      uniforms: { uL: { value: 0 }, uK: { value: 0 }, uS: { value: 0 } }, uniformDecl: 'uniform float uL, uK, uS;',
      posHook: `float u = aMisc.z; vis = uK*step(u, uL);
        float head = exp(-pow((uL - u)*14.0, 2.0));
        float flow = 0.6 + 0.4*sin(u*60.0 - uTime*9.0);
        float spark = step(0.92, h1(aMisc.y*13.0 + floor(uTime*20.0)))*head;
        b *= flow*(0.7 + (1.6 + 1.5*uS)*head) + spark*2.0; hot = head + spark; sz = 1.0 + head*(1.0 + uS);` }), 6);
  }
  E.beacon = X.addGlow(0, mixHex(hex, '#FFFFFF', 0.35), 3.2, 20);
  E.beaconCore = X.addGlow(1, mixHex(hex, '#FFFFFF', 0.2), 2.2, 21, { core: '#F2FFF6' });
  // ---- 远处地平线上的另一双眼睛（第 3 段）
  const closeK = { ...S.cams[S.cams.length - 1], aim: 'eyes' };
  const closeSh = () => shot(closeK, eyeMid(T.story.seg3 + 0.5));
  function eyeMid(t) { const mats = E.act ? E.act.pose(E.act.weight(t), t) : null; const a = E.eyes[0].clone(), b = E.eyes[1].clone(); if (mats) { a.applyMatrix4(mats[E.act.headSlot]); b.applyMatrix4(mats[E.act.headSlot]); } return a.add(b).multiplyScalar(0.5); }
  let far = null;
  const farEyes = [0, 1].map(() => X.addGlow(1, mixHex(hex, '#FFFFFF', 0.55), 1, 31, { core: '#F2FFF6' }));
  // 两双眼睛之间的一缕粒子光
  {
    const n = 2600, P = new Float32Array(n * 3), M = new Float32Array(n * 4);
    for (let i = 0; i < n; i++) { P.set([R(), (R() - 0.5), (R() - 0.5)], i * 3); M.set([0.5 + R(), R(), R(), R()], i * 4); }
    E.link = addPoints(geo({ position: [P, 3], aMisc: [M, 4] }), fxPointsMaterial({ col: mixHex(hex, '#FFFFFF', 0.4), hi: '#FFFFFF', size: 0.02, maxPx: 3, bright: 0.9,
      uniforms: { uA: { value: new THREE.Vector3() }, uB: { value: new THREE.Vector3() }, uK: { value: 0 }, uS: { value: 0 }, uU: { value: new THREE.Vector3(0, 1, 0) } }, uniformDecl: 'uniform vec3 uA, uB, uU; uniform float uK, uS;',
      posHook: `float u = position.x; vec3 q = mix(uA, uB, u) + uU*sin(u*3.14159)*0.25*length(uB - uA)*0.05;
        vec3 dir = normalize(vec3(aMisc.z - 0.5, aMisc.w - 0.5, h1(aMisc.y*3.0) - 0.5));
        p = q + uU*position.y*0.02 + dir*uS*(0.4 + 1.6*h1(aMisc.y*7.0));
        vis = uK*(1.0 - smoothstep(0.4, 1.0, uS)); b *= 0.5 + 0.5*sin(u*40.0 - uTime*12.0);` }), 32);
  }

  // 每个小节第一拍：从狼身上向外散出一圈细细的粒子波纹（在镜头平面里）
  {
    const n = 2400, P = new Float32Array(n * 3), M = new Float32Array(n * 4);
    for (let i = 0; i < n; i++) { const a = i / n * Math.PI * 2; P.set([Math.cos(a), Math.sin(a), 0], i * 3); M.set([0.6 + 0.8 * R(), R(), R(), 0], i * 4); }
    E.barRing = addPoints(geo({ position: [P, 3], aMisc: [M, 4] }), fxPointsMaterial({ col: mixHex(hex, '#FFFFFF', 0.35), hi: '#FFFFFF', size: 0.02, maxPx: 3, bright: 1.0,
      uniforms: { uT: { value: -1 }, uO: { value: new THREE.Vector3() }, uR: { value: new THREE.Vector3(1, 0, 0) }, uU: { value: new THREE.Vector3(0, 1, 0) }, uSc: { value: 1 } }, uniformDecl: 'uniform float uT, uSc; uniform vec3 uO, uR, uU;',
      posHook: `float k = clamp(uT/0.9, 0.0, 1.0); vis = step(0.0, uT)*step(uT, 0.9);
        float r = (0.6 + 4.2*(1.0 - pow(1.0 - k, 2.0)) + (aMisc.z - 0.5)*0.15)*uSc;
        p = uO + (uR*position.x + uU*position.y*0.85)*r; b *= pow(1.0 - k, 1.5); hot = 1.0 - k;` }), 44);
  }
  // 空气里的光尘：前景大颗（离镜头 1–4 个单位，虚化）、背景小颗（已有的 E.dust）
  {
    const n = 220, P = new Float32Array(n * 3), M = new Float32Array(n * 4);
    for (let i = 0; i < n; i++) { P.set([(R() - 0.5) * 2, (R() - 0.5) * 2, 0], i * 3); M.set([0.4 + 0.6 * R(), R(), 0.5 + R(), 1.2 + R() * 3]); M.set([0.4 + 0.6 * R(), R(), 0.5 + R(), 1.2 + R() * 3], i * 4); }
    E.fgDust = addPoints(geo({ position: [P, 3], aMisc: [M, 4] }), fxPointsMaterial({ col: mixHex(hex, '#E6F2EA', 0.6), hi: '#FFFFFF', size: 0.035, maxPx: 22, bright: 0.5,
      uniforms: { uK: { value: 0 }, uAsp: { value: E.W / E.H } }, uniformDecl: 'uniform float uK, uAsp;',
      posHook: `float d = aMisc.w, th = 0.2867; vec2 q = position.xy + vec2(uTime*0.03*aMisc.z + 0.05*sin(uTime*0.7 + aMisc.y*30.0), uTime*0.02*aMisc.z + 0.04*sin(uTime*0.9 + aMisc.y*17.0));
        q = mod(q + 1.0, 2.0) - 1.0; p = vec3(q.x*d*th*uAsp, q.y*d*th, -d); vis = uK; b *= 0.35 + 0.25*sin(uTime*2.0 + aMisc.y*40.0); sz = 1.0 + 1.5/d;` }), 60, E.camera);
  }

  return {
    eyeMid,
    // 正文的镜头：关键帧之间缓入缓出；第一帧接上英雄镜头
    cam(t, heroCam) {
      if (t < ST.start || !SH.length) return null;
      let i = SH.findIndex(c => t >= c.t0 && t < c.t1); if (i < 0) i = SH.length - 1;
      const c = SH[i], u = clamp((t - c.t0) / (c.t1 - c.t0)), cur = shotAt(c, u);
      const prev = i === 0 ? heroCam(ST.start) : shotAt(SH[i - 1], 1);
      const e = inOut(clamp((t - c.t0) / 0.3));
      this.blur = Math.sin(Math.PI * clamp((t - c.t0) / 0.3)) * 7;
      if (e >= 1) return { pos: cur.pos, target: cur.target, fov: cur.fov };
      return { pos: prev.pos.clone().lerp(cur.pos, e), target: prev.target.clone().lerp(cur.target, e), fov: lerp(prev.fov, cur.fov, e) };
    },
    blur: 0,
    update(t, s) {
      const after = t >= ST.start ? 1 : 0, out = 1 - smooth(T.outro, T.outro + 0.4, t);
      { const bar = 4 * T.e8, nb = Math.floor((t - T.hit) / bar + 1e-6), tb = T.hit + nb * bar, ru = E.barRing.material.uniforms;
        const on = t >= ST.start - 0.7 && t < T.outro; ru.uT.value = on && nb >= 1 ? t - tb : -1; ru.uO.value.copy(E.C).add(V(0, -0.5, 0)); ru.uR.value.copy(s.right); ru.uU.value.copy(s.up);
        ru.uSc.value = Math.max(0.6, E.camera.position.distanceTo(E.C) / 6); E.barRing.visible = ru.uT.value >= 0; }
      E.fgDust.material.uniforms.uK.value = smooth(T.hit, T.hit + 0.6, t) * out; E.fgDust.visible = E.fgDust.material.uniforms.uK.value > 0.002;
      const sceneOn = smooth(ST.start, ST.start + 0.8, t) * out;
      E.rock.material.uniforms.uK.value = sceneOn; E.rock.material.uniforms.uP.value = s.pulse; E.rock.visible = sceneOn > 0.002;
      E.ridgeL.material.uniforms.uK.value = smooth(ST.start + 0.6, ST.start + 1.6, t) * out * (1 - 0.6 * smooth(ST.seg3, ST.seg3 + 0.6, t)); E.ridgeL.visible = E.ridgeL.material.uniforms.uK.value > 0.002;
      E.ridgeR.material.uniforms.uK.value = smooth(ST.seg2b - 1.0, ST.seg2b, t) * out; E.ridgeR.visible = E.ridgeR.material.uniforms.uK.value > 0.002;
      // 狼群：第 1 段出现；字幕 1 那一拍开始慢慢淡去、化成粒子飘散
      const packIn = smooth(ST.start + 0.8, ST.start + 1.8, t), dis = smooth(ST.seg2a, ST.seg2a + 1.6, t);
      pack.forEach((pk, k) => {
        pk.g.updateMatrixWorld(); const u = pk.m.uniforms, inv = new THREE.Matrix4().copy(pk.g.matrixWorld).invert();
        pk.g.visible = packIn * (1 - dis) > 0.002 || (dis > 0 && dis < 1);
        // 缓慢走动：沿山脊挪动、身体一起一伏
        if (!pk.base) { pk.base = pk.g.position.clone(); pk.dir = rl.a.clone().sub(rl.b).normalize(); }
        const wt = Math.max(0, t - ST.start);
        pk.g.position.copy(pk.base).addScaledVector(pk.dir, wt * (0.18 + 0.08 * pk.ph)).add(V(0, 0.04 * Math.abs(Math.sin(wt * 5 + pk.ph * 6)), 0));
        u.uC.value.copy(E.C); u.uCam.value.copy(E.camera.position).applyMatrix4(inv); u.uAxis.value.set(0, 0, 1);
        u.uFade.value = 0.55 * packIn * (1 - dis); u.uKick.value = dis * (2.5 + pk.ph * 2); u.uWind.value = 0.6 + dis * 2; u.uPulse.value = s.pulse * 0.5;
        u.uWindDir.value.set(-1, 0.4, -0.3).normalize(); u.uFlow.value = 0.3;
      });
      // 小路：字幕 2 那一拍起，每一拍延伸一段
      const beats = (t - ST.seg2b) / T.e8, nb = ST.pathBeats;
      const bf = beats % 1, surge = t < ST.seg2b ? 0 : Math.exp(-bf * 5);
      const L = t < ST.seg2b ? 0 : clamp((Math.floor(beats) + Math.min(1.08, 1.6 * outBackS(clamp(bf / 0.25)))) / nb);
      E.path.material.uniforms.uS.value = surge;
      E.path.material.uniforms.uL.value = L * 1.02; E.path.material.uniforms.uK.value = (t >= ST.seg2b ? 1 : 0) * out * (1 - 0.5 * smooth(ST.seg3, ST.seg3 + 0.6, t)); E.path.visible = t >= ST.seg2b && out > 0.002;
      const bk = smooth(ST.seg2b + (nb - 1) * T.e8, ST.seg2b + nb * T.e8, t) * out;
      E.beacon.position.copy(p3).add(V(0, 0.4, 0)); E.beaconCore.position.copy(E.beacon.position);
      E.beacon.material.uniforms.uInt.value = 0.25 * bk * (0.85 + 0.15 * s.pulse); E.beaconCore.material.uniforms.uInt.value = 0.9 * bk * (0.85 + 0.25 * s.pulse);
      E.beacon.visible = E.beaconCore.visible = bk > 0.002;
      // 第 3 段：远处另一双眼睛（下一拍出现、慢慢清晰）；再下一拍两双眼睛一闪，中间一缕粒子光连起来再散开
      if (!far) { const sh = closeSh(); const c0 = unproject(sh, S.farEyes[0], S.farEyes[1], 40), c1 = unproject(sh, S.farEyes[0] + 18, S.farEyes[1] + 1, 40); far = [c0, c1]; }
      const fe = smooth(ST.seg3 + T.e8, ST.seg3 + T.e8 + 0.7, t) * out, flash = t >= ST.seg3 + 2 * T.e8 ? Math.exp(-(t - ST.seg3 - 2 * T.e8) / 0.25) : 0;
      farEyes.forEach((g, i) => { g.position.copy(far[i]); g.scale.setScalar(5.5); g.visible = fe > 0.002; g.material.uniforms.uInt.value = fe * (0.7 * (E.heroEyeI ?? 1) * (0.9 + 0.1 * Math.sin(t * 5 + i)) + 1.2 * flash); g.material.uniforms.uFlare.value = 0.2 + 1.2 * flash; });
      E.storyFlash = flash;
      const lk = E.link.material.uniforms, lt = t - (ST.seg3 + 2 * T.e8);
      lk.uA.value.copy(eyeMid(t)); lk.uB.value.copy(far[0].clone().lerp(far[1], 0.5)); lk.uU.value.copy(s.up);
      lk.uK.value = (lt >= 0 ? smooth(0, 0.15, lt) : 0) * out; lk.uS.value = clamp((lt - 0.45) / 0.9); E.link.visible = lt >= 0 && lt < 1.5;
    },
  };
}
