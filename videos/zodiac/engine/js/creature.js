// 神兽：SDF 组合造型 → 表面附近采样粒子（脸部加密）+ 火焰毛束 + 胸口星座纹章 + 发光双眼
import * as THREE from 'three';
import { compileSDF, bounds, sampleSurface, ambientOcclusion, rayToSurface, buildStrands, eulerMat, mulM, grad } from './sdf.js';
import { particleMaterial, PB, makePoints, PAL } from './particles.js';
import { rng, lerp, clamp, D2R } from './util.js';

const strSeed = s => [...s].reduce((a, c) => (a * 31 + c.charCodeAt(0)) >>> 0, 7);

// 身体：熔金到琥珀的渐变，正对镜头偏亮白；表面有缓慢流动的熔岩纹；主光 + 边缘光 + 环境光遮蔽
const BODY_COL = /* glsl */`
  if (aTone.y > 1.5 && aTone.y < 2.5) {
    // 五官线条：眉骨、眼睑、泪痕、鼻头、嘴线——高光色的细亮线，让表情一眼可读
    col = mix(uColHi, uColAlt, 0.2 + 0.2*h1(seed*7.0));
    b *= uFeat*(0.85 + 0.3*sin(uTime*LW*floor(10.0 + seed*20.0) + seed*30.0))*mix(1.0, smoothstep(-0.1, 0.5, facing), 0.8);
    sizeK *= 0.42;
  } else {
    vec3 wp = position;
    float lv1 = sin(dot(wp, vec3(1.9, 3.1, 0.7)) + 1.6*sin(dot(wp, vec3(-2.3, 1.2, 1.9)) + uTime*LW*3.0) - uTime*LW*5.0);
    float lv2 = sin(dot(wp, vec3(-3.3, 1.7, 2.4)) + 1.2*lv1 - uTime*LW*4.0);
    float vein = smoothstep(0.5, 1.0, (lv1*0.5 + 0.5)*(lv2*0.5 + 0.5)*1.9);
    // 主光从左上方打来；凹处被环境光遮蔽压暗。明暗映射到 暗色 → 主色 → 次色 → 高光色
    vec3 Lv = normalize(vec3(-0.45, 0.42, 0.8));
    float lam = max(dot(nv, Lv), 0.0);
    float ao = aTone.z*aTone.z;
    float sh = clamp(lam*ao*1.15 + 0.02, 0.0, 1.0);
    sh = clamp(sh*(1.0 + 0.55*aTone.w), 0.0, 1.0);
    vec3 c1 = mix(uColDark, uColMain, smoothstep(0.0, 0.32, sh));
    vec3 c2 = mix(c1, uColAlt, smoothstep(0.3, 0.72, sh));
    col = mix(c2, uColHi, smoothstep(0.75, 1.0, sh)*0.6);
    col = mix(col, mix(uColMain, uColHi, 0.5), vein*0.4);
    // 掠射角的点在屏幕上会堆叠变亮，压暗它们，脸的正面才立得起来
    float edge = smoothstep(0.05, 0.75, facing);
    b *= 1.0 + 0.5*max(aTone.w, 0.0) - 0.45*max(-aTone.w, 0.0);
    float spark = pow(h1(seed*91.3), 10.0)*4.0;
    b *= mix(1.0, (0.05 + 1.5*sh*sh)*(0.22 + 0.78*edge)*(0.8 + 1.0*vein) + spark*sh*3.0, uLight);
    sizeK *= mix(1.0, 0.45, step(0.98, h1(seed*91.3)));
    if (aTone.y > 2.5) { col = uColDark; b *= 0.12; }
    // 散开时不再受光照：变成自发光的火焰粒子
    float qq = smoothstep(0.05, 0.5, q);
    col = mix(col, mix(uColMain, mix(uColAlt, uColHi, h1(seed*5.5)), h1(seed*2.1)*0.8), qq);
    b = mix(b*(1.0 + uGlow), aTone.x*uBright*6.0*(0.6 + 0.4*sin(uTime*LW*floor(20.0 + seed*30.0) + seed*9.0)), qq);
    if (uDbg > 0.5) { b = 0.5; col = uDbg < 1.5 ? vec3(aTone.z) : uDbg < 2.5 ? vec3(max(aTone.w,0.0), 0.0, max(-aTone.w,0.0)) : vec3(lam); }
  }`;

// 毛束：根部固定，越往外受卷曲噪声驱动越强，火焰沿毛束向外翻涌；uGrow 控制长出，uExpand 控制张开
const STRAND_POS = /* glsl */`
  {
    float u = aTone.z, ss = aTone.w;
    vec3 off = (p - aRoot)*uExpand;
    vis *= step(u, uGrow + 0.001);
    float L = length(off);
    vec3 sway = curlN(aRoot*0.8 + vec3(ss*9.0, ss*3.0, 0.0), uTime);
    vec3 turb = curlN(p*1.6 + vec3(0.0, -uTime*LW*0.0, ss), uTime*1.0 + ss*4.0);
    p = aRoot + off + (sway*0.9 + turb*0.55)*uCurl*pow(u, 1.3)*(0.4 + L*0.6);
    // 沿毛束向外传播的火焰波
    p += N*sin(u*8.0 - uTime*LW*30.0 + ss*30.0)*0.07*u*uCurl;
    p.y += uLick*u*u*(0.55 + 0.45*sin(uTime*LW*22.0 + ss*17.0));
  }`;
const STRAND_COL = /* glsl */`
  {
    float u = aTone.z;
    float fl = 0.5 + 0.5*sin(uTime*LW*floor(30.0 + seed*40.0) + seed*50.0);
    // 根部熔金 → 中段亮橙 → 末端高光白（只有最外一截）
    vec3 root = mix(uColAlt, uColMain, 0.5);
    col = u < 0.6 ? mix(root, uColMain, u/0.6) : mix(uColMain, mix(uColAlt, uColHi, fl), smoothstep(0.7, 1.0, u));
    col = mix(col, uColDark*1.5, (1.0 - u)*0.25*h1(seed*3.3));
    b *= mix(0.55, 1.5, u*u)*(0.7 + 0.6*fl);
    sizeK = mix(1.3, 0.55, u);
  }`;

// 纹章：九颗星和连线，微微发光；主星可以单独闪一下
const EMBLEM_COL = /* glsl */`
  {
    col = mix(uColHi, uColAlt, 0.25);
    float isStar = step(4.5, aTone.y);
    float pulse = 0.75 + 0.25*sin(uTime*LW*10.0 + aTone.w*1.7);
    b *= uEmblem*pulse*(1.0 + isStar*1.6);
    if (isStar > 0.5 && abs(aTone.w - uMainIdx) < 0.5) { b *= 1.0 + uMainFlash*5.0; sizeK *= 1.0 + uMainFlash*1.2; }
    sizeK *= 1.0 + isStar*aTone.z;
  }`;

function eyeMaterial() {
  return new THREE.ShaderMaterial({
    uniforms: { uOpen: { value: 0.3 }, uInt: { value: 0 }, uRays: { value: 0 }, uTilt: { value: 0 },
      uCore: { value: PAL.highlight.clone() }, uOuter: { value: PAL.primary.clone() } },
    transparent: true, depthWrite: false, depthTest: false, blending: THREE.AdditiveBlending,
    vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.0); }`,
    fragmentShader: /* glsl */`
      uniform float uOpen, uInt, uRays, uTilt; uniform vec3 uCore, uOuter; varying vec2 vUv;
      void main(){
        vec2 p = vUv*2.0 - 1.0;
        float cs = cos(uTilt), sn = sin(uTilt);
        vec2 q = mat2(cs, sn, -sn, cs)*p;
        float o = max(uOpen, 0.05);
        // 杏仁形的眼光：半眯时被压扁、变暗
        vec2 e = vec2(q.x/0.13, q.y/(0.075*o + 0.012));
        float er = length(e);
        float core = exp(-er*er*2.5)*1.1 + exp(-er*er*16.0)*1.6;
        float r = length(p);
        float halo = exp(-r*r*55.0)*0.55 + exp(-r*r*10.0)*0.12;
        float ang = atan(q.y, q.x);
        float rays = exp(-abs(q.y)*70.0)*exp(-abs(q.x)*1.6)*1.4
                   + pow(abs(cos(ang*2.0 + 0.0)), 80.0)*exp(-r*2.4)*0.6
                   + pow(abs(cos(ang*3.0 + 0.5)), 120.0)*exp(-r*3.2)*0.5;
        vec3 c = uOuter*(halo*(0.4 + 0.6*o) + rays*uRays) + uCore*core*(0.35 + 0.65*o);
        gl_FragColor = vec4(c*uInt, 1.0);
      }`,
  });
}

export function buildCreature(cfg, starmap, Q, parent) {
  const C = cfg.creature;
  const rand = rng(strSeed(cfg.id) + 101);
  const { sdf, parts } = compileSDF(C.sdf);
  const box = bounds(sdf);
  const partOf = name => C.sdf.parts.find(p => p.name === name);
  const partToWorld = (name, v) => {
    const P = name ? partOf(name) : null;
    if (!P || !P.tf) return v.slice();
    const sc = P.tf.s ?? 1, vs = [v[0] * sc, v[1] * sc, v[2] * sc];
    const w = P.tf.r ? mulM(eulerMat(P.tf.r), vs) : vs;
    const T = P.tf.p || [0, 0, 0];
    return [w[0] + T[0], w[1] + T[1], w[2] + T[2]];
  };

  // ---------------------------------------------------- 身体表面
  const body = new PB();
  const label = (x, y, z) => { let bi = 0, bd = 1e9; for (const P of parts) { const d = P.f(x, y, z); if (d < bd) { bd = d; bi = P.index; } } return bi; };
  const addSurface = (list, faceBoost) => {
    for (const s of list) {
      const [x, y, z] = s.p;
      const pi = label(x, y, z), P = parts[pi];
      let kind = 0;
      for (const tg of P.tagged) if (tg.tag === 'dark' && tg.f(x, y, z) < 0.035) kind = 3;
      const ao = ambientOcclusion(sdf, s.p, s.n);
      // 曲率（SDF 的拉普拉斯）：凸起处（眉骨、鼻梁、颧骨）提亮，凹处（眼窝、嘴缝）压暗
      const e = 0.05, d0 = sdf(x, y, z);
      const lap = (sdf(x + e, y, z) + sdf(x - e, y, z) + sdf(x, y + e, z) + sdf(x, y - e, z) + sdf(x, y, z + e) + sdf(x, y, z - e) - 6 * d0) / (e * e);
      const delay = lerp(P.delay[0], P.delay[1], rand());
      body.add(s.p, s.n, rand(), delay, [(0.75 + 0.5 * rand()) * (faceBoost ? 0.85 : 1), kind, ao, clamp((lap - 2.2) * 0.12, -1, 1)]);
    }
  };
  addSurface(sampleSurface(sdf, box, Math.round((C.samples ?? 70000) * Q), rand), false);
  // 脸部加密：在脸部椭球区域内再采一批
  let faceCenter = [0, 0, 0], faceR = 1;
  if (C.face) {
    const P = partOf(C.face.part), M = P?.tf?.r ? eulerMat(P.tf.r) : null, T = P?.tf?.p || [0, 0, 0], SC = P?.tf?.s ?? 1;
    const [rx, ry, rz] = C.face.r, [cx, cy, cz] = C.face.c;
    const region = (x, y, z) => {
      let l = [x - T[0], y - T[1], z - T[2]];
      if (M) l = [M[0] * l[0] + M[3] * l[1] + M[6] * l[2], M[1] * l[0] + M[4] * l[1] + M[7] * l[2], M[2] * l[0] + M[5] * l[1] + M[8] * l[2]];
      l = l.map(v => v / SC);
      const dx = (l[0] - cx) / rx, dy = (l[1] - cy) / ry, dz = (l[2] - cz) / rz;
      return dx * dx + dy * dy + dz * dz < 1;
    };
    addSurface(sampleSurface(sdf, box, Math.round((C.faceSamples ?? 15000) * Q), rand, region), true);
    faceCenter = partToWorld(C.face.part, C.face.c); faceR = Math.max(rx, ry) * SC;
  }

  if (C.features) {
    const F = C.features, P = partOf(F.part), M = P?.tf?.r ? eulerMat(P.tf.r) : [1, 0, 0, 0, 1, 0, 0, 0, 1];
    const dir = mulM(M, [0, 0, -1]);
    const headDelay = P?.delay || [0.5, 0.9];
    const onFace = (x, y) => {
      const o = partToWorld(F.part, [x, y, 3 / (P?.tf?.s ?? 1)]);
      let tt = 0;
      for (let i = 0; i < 200; i++) {
        const q = [o[0] + dir[0] * tt, o[1] + dir[1] * tt, o[2] + dir[2] * tt], d = sdf(...q);
        if (d < 0.002) { const g = grad(sdf, ...q); return { p: q.map((v, k) => v + g[k] * 0.025), n: g }; }
        tt += Math.max(d * 0.9, 0.004); if (tt > 6) break;
      }
      return null;
    };
    const addLine = (pts, w) => {
      for (let k = 1; k < pts.length; k++) {
        const [ax, ay] = pts[k - 1], [bx, by] = pts[k], L = Math.hypot(bx - ax, by - ay), n = Math.max(2, Math.round(L / 0.006 * Math.sqrt(Q)));
        for (let j = 0; j < n; j++) {
          const u = j / n, s = onFace(lerp(ax, bx, u) + (rand() - 0.5) * 0.012, lerp(ay, by, u) + (rand() - 0.5) * 0.012); if (!s) continue;
          body.add(s.p, s.n, rand(), lerp(headDelay[0], headDelay[1], rand()), [w * (0.8 + 0.4 * rand()), 2, 1, 0]);
        }
      }
    };
    for (const L of F.lines || []) { addLine(L.pts, L.w ?? 1); if (L.mirror) addLine(L.pts.map(([x, y]) => [-x, y]), L.w ?? 1); }
    if (F.dots) for (const [x, y] of [...F.dots.pts, ...(F.dots.mirror ? F.dots.pts.map(([x, y]) => [-x, y]) : [])]) {
      for (let j = 0; j < Math.round(10 * Q) + 2; j++) { const s = onFace(x + (rand() - 0.5) * 0.02, y + (rand() - 0.5) * 0.02); if (s) body.add(s.p, s.n, rand(), lerp(headDelay[0], headDelay[1], rand()), [0.7, 2, 1, 0]); }
    }
  }

  const group = new THREE.Group(); parent.add(group);
  const pose = new THREE.Group(); group.add(pose); // 前倾等姿态
  const bodyMat = particleMaterial({ size: 0.36, bright: 0.14, facing: 1, light: 1, colHook: BODY_COL, uniformDecl: 'uniform float uDbg, uFeat, uGlow;', uniforms: { uDbg: { value: 0 }, uFeat: { value: 7.0 }, uGlow: { value: 0 } } });
  const bodyPts = makePoints(body, bodyMat, pose, 10);

  // ---------------------------------------------------- 毛束
  const strandObjs = [], tips = [];
  for (const g of C.strands || []) {
    const pb = new PB(); const roots = [];
    const strands = buildStrands(g, sdf, rand);
    const [lmin, lmax] = [Math.min(...strands.map(s => s.length)), Math.max(...strands.map(s => s.length))];
    const [p0, p1] = g.pts || [30, 60];
    const fuzz = Math.max(1, Math.round((g.fuzz ?? 3) * Q)), width = g.width ?? 0.1;
    const [d0, d1] = g.delay || [0.85, 1];
    for (const s of strands) {
      const np = Math.round(lerp(p0, p1, (s.length - lmin) / Math.max(1e-3, lmax - lmin)));
      // 垂直于毛束的两个方向
      const t = s.dir, a = Math.abs(t[1]) < 0.9 ? [0, 1, 0] : [1, 0, 0];
      let e1 = [t[1] * a[2] - t[2] * a[1], t[2] * a[0] - t[0] * a[2], t[0] * a[1] - t[1] * a[0]];
      const l1 = Math.hypot(...e1); e1 = e1.map(v => v / l1);
      const e2 = [t[1] * e1[2] - t[2] * e1[1], t[2] * e1[0] - t[0] * e1[2], t[0] * e1[1] - t[1] * e1[0]];
      for (let k = 0; k < np; k++) {
        const u = Math.pow(k / (np - 1), 0.85); // 越往外越稀
        const c = s.curve(u);
        for (let f = 0; f < fuzz; f++) {
          const ang = rand() * Math.PI * 2, rr = Math.sqrt(rand()) * width * (1 - 0.7 * u);
          const p = [c[0] + (e1[0] * Math.cos(ang) + e2[0] * Math.sin(ang)) * rr, c[1] + (e1[1] * Math.cos(ang) + e2[1] * Math.sin(ang)) * rr, c[2] + (e1[2] * Math.cos(ang) + e2[2] * Math.sin(ang)) * rr];
          pb.add(p, s.dir, rand(), lerp(d0, d1, rand()), [0.8 + 0.4 * rand(), 1, u, s.seed]);
          roots.push(...s.root);
        }
      }
      if (g.sparks) tips.push({ p: s.curve(0.85), dir: s.dir, seed: s.seed });
    }
    pb.extra.aRoot = { size: 3, v: roots };
    const mat = particleMaterial({
      size: g.size ?? 0.16, bright: 0.32 * (g.bright ?? 1), attrDecl: 'attribute vec3 aRoot;',
      uniformDecl: 'uniform float uGrow, uExpand, uCurl, uLick;',
      uniforms: { uGrow: { value: 1 }, uExpand: { value: 1 }, uCurl: { value: g.curl ?? 1 }, uLick: { value: g.lick ?? 0.35 } },
      posHook: STRAND_POS, colHook: STRAND_COL,
    });
    mat.userData.baseCurl = g.curl ?? 1; mat.userData.baseBright = 0.32 * (g.bright ?? 1);
    strandObjs.push(makePoints(pb, mat, pose, 12));
  }

  // ---------------------------------------------------- 胸口星座纹章
  let emblemPts = null, emblemInfo = null;
  if (C.emblem && starmap) {
    const pb = new PB();
    const [ecx, ecy] = C.emblem.c, ew = C.emblem.w;
    const toBody = (nx, ny) => {
      const x = ecx + nx * ew, y = ecy + ny * ew;
      const z = rayToSurface(sdf, x, y, 5);
      if (z == null) return null;
      const g = grad(sdf, x, y, z);
      return { p: [x + g[0] * 0.035, y + g[1] * 0.035, z + g[2] * 0.035], n: g };
    };
    for (const [a, b] of starmap.lines) {
      const A = starmap.stars[a], B = starmap.stars[b];
      const L = Math.hypot(B.nx - A.nx, B.ny - A.ny) * ew, n = Math.max(4, Math.round(L / 0.012 * Q));
      for (let k = 0; k <= n; k++) {
        const u = k / n, s = toBody(lerp(A.nx, B.nx, u), lerp(A.ny, B.ny, u)); if (!s) continue;
        pb.add(s.p, s.n, rand(), -0.3, [0.55, 4, 0, -1]);
      }
    }
    starmap.stars.forEach((st, i) => {
      const s = toBody(st.nx, st.ny); if (!s) return;
      const big = clamp(1.6 - st.mag * 0.3, 0.2, 1.4);
      for (let k = 0; k < Math.round(14 * Q) + 2; k++) pb.add(s.p.map(v => v + (rand() - 0.5) * 0.02), s.n, rand(), -0.3, [0.8, 5, big, i]);
    });
    const mat = particleMaterial({
      size: 0.11, bright: 1, flicker: 0.3,
      uniformDecl: 'uniform float uEmblem, uMainIdx, uMainFlash;',
      uniforms: { uEmblem: { value: 1 }, uMainIdx: { value: starmap.main }, uMainFlash: { value: 0 } },
      colHook: EMBLEM_COL,
    });
    emblemPts = makePoints(pb, mat, pose, 14);
    const m = starmap.stars[starmap.main], mp = toBody(m.nx, m.ny);
    emblemInfo = { main: mp ? mp.p : null };
  }

  // ---------------------------------------------------- 眼睛
  const eyes = [];
  if (C.eyes) {
    // 每只眼可以是 [x,y,z]（属于 eyes.part）或 {part, p:[x,y,z]}（例如双鱼座两条鱼各一只眼）
    const size = C.eyes.size ?? 0.6;
    C.eyes.pts.forEach(e => {
      const part = Array.isArray(e) ? C.eyes.part : e.part, pp = Array.isArray(e) ? e : e.p;
      const sc = partOf(part)?.tf?.s ?? 1;
      const m = new THREE.Mesh(new THREE.PlaneGeometry(size * 4 * sc, size * 4 * sc), eyeMaterial());
      m.frustumCulled = false; m.renderOrder = 30; m.userData.billboard = true;
      m.position.set(...partToWorld(part, pp));
      m.material.uniforms.uTilt.value = (pp[0] < 0 ? -1 : 1) * 0.2;
      pose.add(m); eyes.push(m);
    });
  }

  group.rotation.y = (C.yaw ?? 0) * D2R;
  return {
    group, pose, body: bodyPts, strands: strandObjs, emblem: emblemPts, eyes, tips,
    faceCenter, faceR, emblemMain: emblemInfo?.main, headCenter: partToWorld('head', [0, 0, 0]),
    mats: [bodyMat, ...strandObjs.map(s => s.material), ...(emblemPts ? [emblemPts.material] : [])],
  };
}
