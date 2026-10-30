// 共享系统：渲染器与后期、相机、浮尘、背景闪电、火花、人脸点云
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { cloudMaterial, lineMaterial, glowMaterial, dustMaterial, FinalShader, SHARED } from './mat.js';
import { PB, parseOBJ, buildHead, linesToPB } from './geo.js';
import { rng, hash, clamp, D2R } from './util.js';

// 成片画布（预览版为一半）。文字层始终按 1080×1920 的坐标书写，再整体缩放。
export const FW = 1080, FH = 1920;
export const K = { THREE, mats: [], glows: [], W: FW, H: FH, scale: 1 };
// 傲慢项目的人头（下巴到头顶）约 1.31 个单位；这一系列统一放大到 2 个单位
export const HS = 2 / 1.3075;

export function initCore(glCanvas, cfg) {
  const W = K.W = cfg.W, H = K.H = cfg.H; K.scale = W / FW;
  const renderer = new THREE.WebGLRenderer({ canvas: glCanvas, preserveDrawingBuffer: true, antialias: false, alpha: false });
  renderer.setPixelRatio(1); renderer.setSize(W, H, false); renderer.setClearColor(0x000000, 1);
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(50, W / H, 0.1, 200);
  scene.add(camera);
  const composer = new EffectComposer(renderer);
  composer.setPixelRatio(1); composer.setSize(W, H);
  composer.addPass(new RenderPass(scene, camera));
  const bloom = new UnrealBloomPass(new THREE.Vector2(W, H), 1.4, 0.65, 0.12);
  composer.addPass(bloom);
  // 辉光之后再画一层（眼睛的内层：开口、虹膜、瞳孔），保证细节不被辉光冲掉
  const postScene = new THREE.Scene();
  const post = new RenderPass(postScene, camera); post.clear = false;
  composer.addPass(post);
  const final = new ShaderPass(FinalShader);
  // ShaderPass 会复制 uniform；把共用的那两个换回同一个对象
  final.uniforms.uLoop = SHARED.uLoop; final.uniforms.uPx = SHARED.uPx;
  final.uniforms.uRes.value.set(W, H);
  composer.addPass(final);
  composer.addPass(new OutputPass());
  Object.assign(K, { renderer, scene, camera, composer, bloom, final, postScene });
  // 点的像素大小：与傲慢项目（1080 高、纵向视野 35°、系数 300）保持相同的「世界尺寸 → 像素」比例
  SHARED.uPx.value = 300 * (H / 1080) * Math.tan(17.5 * D2R) / Math.tan(25 * D2R);

  const dg = new THREE.BufferGeometry(); const ds = new Float32Array(3000);
  for (let i = 0; i < 3000; i++) ds[i] = hash(i * 1.37 + 0.5);
  dg.setAttribute('position', new THREE.Float32BufferAttribute(new Float32Array(9000), 3));
  dg.setAttribute('aSeed', new THREE.Float32BufferAttribute(ds, 1));
  const dust = new THREE.Points(dg, dustMaterial()); dust.frustumCulled = false; dust.renderOrder = 50; scene.add(dust); K.dust = dust;
  buildBolts(cfg.bolts || []);
  buildSparks();
}

export function reg(mat) { K.mats.push(mat); return mat; }
export function points(pb, mat, parent) {
  const p = new THREE.Points(pb.geometry ? pb.geometry(THREE) : pb, reg(mat));
  p.frustumCulled = false; (parent || K.scene).add(p); return p;
}
export function glow(mode, color, size, parent, opts = {}) {
  const m = new THREE.Mesh(new THREE.PlaneGeometry(size[0], size[1] ?? size[0]), reg(glowMaterial(mode, color, opts)));
  m.frustumCulled = false; m.renderOrder = opts.order ?? 20; m.userData.billboard = opts.billboard ?? true;
  (parent || K.scene).add(m); K.glows.push(m); return m;
}

// ------------------------------------------------------------ 相机：位置、目标、纵向视野、镜头平移（像素，正值让画面内容上移）
export function setCamera(c) {
  const cam = K.camera;
  cam.position.set(...c.pos); cam.up.set(Math.sin(c.roll ?? 0), Math.cos(c.roll ?? 0), 0); cam.lookAt(new THREE.Vector3(...c.target));
  cam.fov = c.fov ?? 50;
  const sh = (c.shift ?? 0) * K.scale;
  if (Math.abs(sh) > 0.01) cam.setViewOffset(K.W, K.H, 0, sh, K.W, K.H); else cam.clearViewOffset();
  cam.updateProjectionMatrix(); cam.updateMatrixWorld();
}
// 世界坐标 → 1080×1920 屏幕坐标
export function project(p) {
  const v = new THREE.Vector3(...p).project(K.camera);
  return [(v.x * 0.5 + 0.5) * FW, (-v.y * 0.5 + 0.5) * FH, v.z];
}

// ------------------------------------------------------------ 背景闪电（挂在相机上，位于星云深处）
function buildBolts(BOLTS) {
  K.BOLTS = BOLTS;
  const R = rng(91), lines = [];
  BOLTS.forEach(([t, sx, dur, sc], bi) => {
    const D = 60, hh = D * Math.tan(25 * D2R), hw = hh * FW / FH;
    const start = [sx * hw * 0.7 + (R() - 0.5) * 3, hh * 1.05, -D];
    const walk = (p0, dir, n, w, depth) => {
      const pts = [p0]; let p = p0;
      for (let i = 0; i < n; i++) {
        const ang = Math.atan2(dir[1], dir[0]) + (R() - 0.5) * 1.3;
        p = [p[0] + Math.cos(ang) * 1.9 * sc, p[1] + Math.sin(ang) * 1.9 * sc, -D]; pts.push(p);
        if (depth < 2 && R() < 0.16) walk(p, [dir[0] + (R() - 0.5) * 1.6, dir[1], 0], Math.floor(n * 0.4), w * 0.55, depth + 1);
      }
      lines.push({ pts, width: w, bolt: bi });
    };
    walk(start, [(R() - 0.5) * 0.5, -1, 0], Math.round(18 * sc + 8), 2.2, 0);
  });
  const pb = linesToPB(lines.length ? lines : [{ pts: [[0, -999, -60], [0.1, -999, -60]], width: 1, bolt: 0 }], 0.12, 5, 0.12);
  for (let i = 0; i < pb.count; i++) { const li = pb.e[i * 4 + 1]; pb.e[i * 4 + 1] = lines.length ? lines[li].bolt : 0; pb.e[i * 4] = 0; }
  const p = points(pb, lineMaterial({ size: 0.8, bright: 1.05, col: '#B794F6', hot: '#FFFFFF', maxPx: 9 }), K.camera);
  p.renderOrder = -50; K.bolts = p;
}
export function boltState(t) {
  const prog = new Array(32).fill(0), inten = new Array(32).fill(0); let flash = [0.5, 0.6, 0];
  K.BOLTS.forEach(([t0, sx, dur, sc], i) => {
    const d = t - t0; if (d < 0 || d > dur) return;
    const f = (d < dur * 0.35 ? 1 : d < dur * 0.5 ? 0.25 : d < dur * 0.65 ? 0.9 : 1 - (d - dur * 0.65) / (dur * 0.35));
    prog[i] = 1; inten[i] = f * sc;
    if (f * sc > flash[2]) flash = [0.5 + sx * 0.35, 0.75, f * Math.min(1.2, sc)];
  });
  return { prog, inten, flash };
}

// ------------------------------------------------------------ 火花（逐帧由事件表纯函数算出）
const SPARK_N = 5000;
function buildSparks() {
  const pb = new PB();
  for (let i = 0; i < SPARK_N; i++) pb.add([0, -999, 0], [0, 0, 0], hash(i * 3.3), [0, 0, 0], [0, 0, 0, 1], [0, 0]);
  const p = points(pb, cloudMaterial({ size: 0.012, bright: 1, drift: 0, depthRef: 3, maxPx: 14, colA: '#FFFFFF', colB: '#FFFFFF' }));
  p.renderOrder = 60; K.sparks = p;
}
// bursts: [{t0, pos:[x,y,z], n, speed, life, grav, dir, spread, seed, bright, alt}]
export function updateSparks(t, bursts) {
  const pos = K.sparks.geometry.attributes.position.array, misc = K.sparks.geometry.attributes.aMisc.array;
  let k = 0;
  for (const b of bursts) {
    const d = t - b.t0; if (d < 0 || d > b.life) continue;
    for (let j = 0; j < b.n && k < SPARK_N; j++) {
      const s = (b.seed ?? 0) * 97.1 + j * 1.913;
      const life = b.life * (0.5 + 0.5 * hash(s + 1));
      if (d > life) continue;
      let dx = hash(s + 2) - 0.5, dy = hash(s + 3) - 0.5, dz = hash(s + 4) - 0.5;
      const l = Math.hypot(dx, dy, dz) || 1; dx /= l; dy /= l; dz /= l;
      if (b.dir) { const sp = b.spread ?? 0.6; dx = b.dir[0] + dx * sp; dy = b.dir[1] + dy * sp; dz = b.dir[2] + dz * sp; }
      const v = b.speed * (0.4 + 0.8 * hash(s + 5)), e = (1 - Math.exp(-3 * d)) / 3;
      pos[k * 3] = b.pos[0] + dx * v * e; pos[k * 3 + 1] = b.pos[1] + dy * v * e - (b.grav ?? 0.6) * d * d; pos[k * 3 + 2] = b.pos[2] + dz * v * e;
      misc[k * 2] = (1 - d / life) * (b.bright ?? 2.2); misc[k * 2 + 1] = 0;
      k++;
    }
  }
  for (; k < SPARK_N; k++) { pos[k * 3 + 1] = -999; misc[k * 2] = 0; }
  K.sparks.geometry.attributes.position.needsUpdate = true; K.sparks.geometry.attributes.aMisc.needsUpdate = true;
}

// ------------------------------------------------------------ 人脸点云（MediaPipe 标准人脸模型），只生成一次
export function buildFaces(objText, opts = {}) {
  const obj = parseOBJ(objText);
  const { pb: headPB, faceCount } = buildHead(obj, { seed: 7, face: opts.face ?? 85000 });
  K.obj = obj; K.headPB = headPB; K.faceCount = faceCount;
  // 片头七张脸用的轻量人头
  K.litePB = headPB.subset(i => i >= faceCount ? hash(i * 0.37) < 0.25 : (headPB.m[i * 2 + 1] > 0 ? hash(i * 0.71) < 0.55 : hash(i * 0.53) < 0.2));
  return headPB;
}

export function tickMaterials(t) {
  for (const m of K.mats) if (m.uniforms.uTime) m.uniforms.uTime.value = t;
}
