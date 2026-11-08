// 卡面插画：把一只动物的粒子剪影渲染成一张图（黑底，叠加用）。index.html?mode=art&model=sil_fox&color=%23A24BFF&yaw=-55
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { loadMesh, samplePoints } from './sample.js';
import { SHARED } from './shaders.js';
import { silMaterial } from './silhouettes.js';

export async function initArt(q) {
  const W = 480, H = 480, gl = document.getElementById('gl'), out = document.getElementById('out');
  gl.width = out.width = W; gl.height = out.height = H;
  const renderer = new THREE.WebGLRenderer({ canvas: gl, preserveDrawingBuffer: true, antialias: false });
  renderer.setPixelRatio(1); renderer.setSize(W, H, false); renderer.setClearColor(0, 1);
  const scene = new THREE.Scene(), cam = new THREE.PerspectiveCamera(30, 1, 0.05, 100);
  const comp = new EffectComposer(renderer); comp.addPass(new RenderPass(scene, cam)); comp.addPass(new UnrealBloomPass(new THREE.Vector2(W, H), 0.6, 0.4, 0.55)); comp.addPass(new OutputPass());
  SHARED.uPx.value = 300 * H / 1080 * 1.6;
  const model = q.get('model'), col = q.get('color'), yaw = +(q.get('yaw') ?? -55) * Math.PI / 180, pitch = +(q.get('pitch') ?? 8) * Math.PI / 180;
  const meta = await (await fetch(`assets/models/${model}.json`)).json(), buf = await (await fetch(`assets/models/${model}.bin`)).arrayBuffer();
  const m = loadMesh(meta, buf), { min, max } = meta.bbox, c = [(min[0] + max[0]) / 2, (min[1] + max[1]) / 2, (min[2] + max[2]) / 2];
  const dir = [Math.sin(-yaw) * Math.cos(pitch), Math.sin(pitch), Math.cos(-yaw) * Math.cos(pitch)];
  const R = Math.hypot(max[0] - min[0], max[1] - min[1], max[2] - min[2]);
  const camPos = new THREE.Vector3(c[0] + dir[0] * R * 2.1, c[1] + dir[1] * R * 2.1, c[2] + dir[2] * R * 2.1);
  const pts = samplePoints(m, { n: +(q.get('n') ?? 60000), seed: 5, cam: camPos.toArray(), eyeMid: meta.eyes?.[0]?.c ?? c, key: [0.2, 1, 0.5], furFrac: 0.06, furLen: 0.03 });
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pts.pos, 3)); g.setAttribute('aNrm', new THREE.BufferAttribute(pts.nrm, 3)); g.setAttribute('aMisc', new THREE.BufferAttribute(pts.misc, 4));
  const mat = silMaterial(col); mat.uniforms.uK.value = 1.25 * +(q.get('k') ?? 1);
  const p = new THREE.Points(g, mat); p.frustumCulled = false; scene.add(p);
  cam.position.copy(camPos); cam.lookAt(c[0], c[1], c[2]); cam.updateMatrixWorld();
  // 让剪影正好填满画面：按投影后的包围盒调整视野
  let x0 = 1, x1 = -1, y0 = 1, y1 = -1; const v = new THREE.Vector3();
  for (let i = 0; i < pts.count; i += 7) { v.set(pts.pos[i * 3], pts.pos[i * 3 + 1], pts.pos[i * 3 + 2]).project(cam); x0 = Math.min(x0, v.x); x1 = Math.max(x1, v.x); y0 = Math.min(y0, v.y); y1 = Math.max(y1, v.y); }
  const span = Math.max(x1 - x0, y1 - y0) / 2 / 0.86;
  cam.fov = 2 * Math.atan(Math.tan(15 * Math.PI / 180) * span) * 180 / Math.PI; cam.setViewOffset(W, H, (x0 + x1) / 4 * W / span * 1, -(y0 + y1) / 4 * H / span * 1, W, H); cam.updateProjectionMatrix();
  SHARED.uTime.value = 0.3;
  comp.render();
  out.getContext('2d').drawImage(gl, 0, 0);
}
