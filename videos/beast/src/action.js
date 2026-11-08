// 专属动作：觉醒那一拍开始，用模型的骨骼链做一个动作（狼：抬头对月嚎叫、张嘴），保持，再收回英雄姿态。
// episode.action = { type, bones: [{ name, pitch, yaw }]（链从根到梢，后一根是前一根的子骨骼）, rise, hold, back（拍数）, voice: { rings, gap（拍）} }
// 每根骨骼绕自己的起点转：pitch 向上抬为正（绕头部的横轴），yaw 向左右转（绕竖直轴）；子骨骼带着父骨骼的变换。
import * as THREE from 'three';
import { clamp, smooth, inOut } from './util.js';

export function makeAction(meta, ep, HIT, beat) {
  const A = ep.action; if (!A || !meta.chain?.length) return null;
  const J = meta.joints, V = a => new THREE.Vector3(...a);
  const up = new THREE.Vector3(0, 1, 0);
  const noseDir = V(J.nose).sub(V(J.occiput)).normalize();
  const lateral = new THREE.Vector3().crossVectors(up, noseDir).normalize();   // 抬头的转轴
  const t0 = HIT, t1 = HIT + A.rise * beat, t2 = t1 + A.hold * beat, t3 = t2 + A.back * beat;
  // 动作强度 0–1：抬起（缓入缓出）→ 保持 → 收回
  const weight = a => a < t0 ? 0 : a < t1 ? inOut((a - t0) / (t1 - t0)) : a < t2 ? 1 : a < t3 ? 1 - inOut((a - t2) / (t3 - t2)) : 0;
  const mats = [0, 1, 2, 3].map(() => new THREE.Matrix4());
  const tmp = new THREE.Matrix4(), R = new THREE.Matrix4(), Ry = new THREE.Matrix4();
  function pose(w) {
    meta.chain.forEach((b, i) => {
      const p = V(b.pivot);
      R.makeRotationAxis(lateral, -(b.pitch ?? 0) * w * Math.PI / 180);
      Ry.makeRotationAxis(up, (b.yaw ?? 0) * w * Math.PI / 180);
      tmp.makeTranslation(p.x, p.y, p.z).multiply(Ry).multiply(R).multiply(new THREE.Matrix4().makeTranslation(-p.x, -p.y, -p.z));
      const parent = b.parent ?? i - 1;
      mats[i].copy(parent >= 0 ? mats[parent] : new THREE.Matrix4()).multiply(tmp);
    });
    for (let i = meta.chain.length; i < 4; i++) mats[i].identity();
    return mats;
  }
  const slot = n => meta.chain.findIndex(b => b.name === n);
  const head = slot('head'), jaw = slot('jaw');
  // 嘴的位置和嚎叫方向（随动作）
  function mouth(w) {
    pose(w);
    const nose = V(J.nose).applyMatrix4(mats[head]), occ = V(J.occiput).applyMatrix4(mats[head]);
    const jt = V(J.jawTip).applyMatrix4(mats[jaw >= 0 ? jaw : head]);
    const m = nose.clone().lerp(jt, 0.5);
    return { pos: m, dir: nose.clone().sub(occ).normalize() };
  }
  return { t0, t1, t2, t3, weight, pose, mouth, headSlot: head, mats };
}
