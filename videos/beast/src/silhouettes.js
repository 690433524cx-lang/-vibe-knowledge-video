// 片头：每一拍画面中央闪过一只不同动物的发光粒子剪影（0.1 秒亮起、保持、0.08 秒消散），颜色是它所属那一类的颜色。
// 最后一只在“揭晓”那一拍飞散（沿旋涡甩开），同一时刻狼的粒子开始汇聚。
// episode.intro.animals = [{ model, type, color }]，时间来自 T.flashes。
import * as THREE from 'three';
import { loadMesh, samplePoints } from './sample.js';
import { SHARED } from './shaders.js';
import { clamp, smooth, D2R } from './util.js';

function silMaterial(col) {
  return new THREE.ShaderMaterial({
    uniforms: { ...SHARED, uK: { value: 0 }, uScat: { value: 0 }, uCol: { value: new THREE.Color(col) }, uHi: { value: new THREE.Color(col).lerp(new THREE.Color('#FFFFFF'), 0.55) } },
    transparent: true, depthWrite: false, depthTest: false, blending: THREE.AdditiveBlending,
    vertexShader: /* glsl */`
      attribute vec3 aNrm; attribute vec4 aMisc;
      uniform float uPx, uTime, uK, uScat; uniform vec3 uCol, uHi; varying vec3 vCol; varying float vA;
      float h1(float n){ return fract(sin(n*127.1+311.7)*43758.5453); }
      void main(){
        float seed = aMisc.y; vec3 p = position;
        if (uScat > 0.0) {
          vec3 dir = normalize(vec3(h1(seed*3.1), h1(seed*5.7), h1(seed*7.9)) - 0.5);
          float a = uScat*(3.0 + 3.0*h1(seed*2.3));
          p += dir*uScat*(0.4 + 0.8*h1(seed*9.1));
          float c = cos(a), s = sin(a); p.xy = mat2(c, -s, s, c)*p.xy;
        }
        vec4 mv = modelViewMatrix*vec4(p, 1.0); gl_Position = projectionMatrix*mv;
        vec3 n = normalize(normalMatrix*aNrm); float nv = dot(n, normalize(-mv.xyz));
        float rim = pow(1.0 - abs(nv), 2.0);
        float b = (0.22 + 0.5*max(nv, 0.0) + 1.3*rim)*aMisc.x*uK*(0.75 + 0.25*sin(uTime*11.0 + seed*40.0))*(1.0 - 0.6*uScat);
        float px = 0.0075*uPx/max(0.05, -mv.z); if (px < 1.5) { b *= px/1.5; px = 1.5; } gl_PointSize = min(px, 4.0);
        vCol = mix(uCol, uHi, clamp(rim*1.2, 0.0, 1.0))*b; vA = 1.0;
      }`,
    fragmentShader: `varying vec3 vCol; varying float vA; void main(){ vec2 c = gl_PointCoord - 0.5; float d = length(c)*2.0; if (d > 1.0) discard; gl_FragColor = vec4(vCol*(exp(-d*d*3.5)*0.85 + smoothstep(0.45, 0.0, d)*0.4)*vA, 1.0); }`,
  });
}

export async function buildSilhouettes(ep, X) {
  const list = ep.intro?.animals ?? [], E = X.E, T = E.T;
  const items = [];
  for (const a of list) {
    const meta = await (await fetch(`assets/models/${a.model}.json`)).json();
    const buf = await (await fetch(`assets/models/${a.model}.bin`)).arrayBuffer();
    const m = loadMesh(meta, buf);
    const { min, max } = meta.bbox, ctr = [(min[0] + max[0]) / 2, (min[1] + max[1]) / 2, (min[2] + max[2]) / 2];
    const eye = meta.eyes?.length ? meta.eyes[0].c : ctr;
    const yaw = (a.yaw ?? -55) * D2R, camDir = [Math.sin(-yaw), 0.15, Math.cos(-yaw)];
    const pts = samplePoints(m, { n: a.n ?? 36000, seed: 3, cam: [ctr[0] + camDir[0] * 10, ctr[1] + camDir[1] * 10, ctr[2] + camDir[2] * 10], eyeMid: eye, key: [0.2, 1, 0.5], furFrac: 0.05, furLen: 0.03 });
    for (let i = 0; i < pts.count; i++) for (let j = 0; j < 3; j++) pts.pos[i * 3 + j] -= ctr[j];
    const g = X.geo({ position: [pts.pos, 3], aNrm: [pts.nrm, 3], aMisc: [pts.misc, 4] });
    const grp = new THREE.Group(); E.scene.add(grp);
    const mat = silMaterial(a.color);
    X.addPoints(g, mat, 20, grp);
    const h = Math.max(max[1] - min[1], (max[2] - min[2]) * 0.62, (max[0] - min[0]) * 0.62);
    items.push({ grp, mat, h, yaw, a });
  }
  return {
    items,
    update(t, s) {
      const cam = E.camera, d = 6.0, tanh = Math.tan(cam.fov * D2R / 2);
      items.forEach((it, i) => {
        const t0 = T.flashes[i], t1 = (T.flashes[i + 1] ?? T.reveal);
        const last = i === items.length - 1;
        let k = 0, sc = 0;
        if (t >= t0 && t < t1) k = smooth(t0, t0 + 0.1, t) * (last ? 1 : 1 - smooth(t1 - 0.08, t1, t));
        if (last && t >= T.reveal && t < T.hit) { sc = (t - T.reveal) / (T.hit - T.reveal); k = 1 - sc * 0.85; }
        it.grp.visible = k > 0.001;
        if (!it.grp.visible) return;
        it.mat.uniforms.uK.value = k; it.mat.uniforms.uScat.value = sc;
        // 屏幕位置（像素）→ 镜头前 d 处
        const [px, py] = ep.intro?.center ?? [960, 560];
        const ppu = E.H / (2 * d * tanh), worldH = (ep.intro?.height ?? 430) / ppu;
        const pos = cam.position.clone().addScaledVector(s.fwd, d).addScaledVector(s.right, (px - E.W / 2) / ppu).addScaledVector(s.up, (E.H / 2 - py) / ppu);
        it.grp.position.copy(pos);
        it.grp.quaternion.copy(cam.quaternion).multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), it.yaw));
        it.grp.scale.setScalar(worldH / it.h);
      });
    },
  };
}
