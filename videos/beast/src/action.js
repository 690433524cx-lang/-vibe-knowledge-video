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
  const mats = [0, 1, 2, 3, 4, 5, 6, 7].map(() => new THREE.Matrix4());
  const tmp = new THREE.Matrix4(), R = new THREE.Matrix4(), Ry = new THREE.Matrix4();
  // 正文里的其他动作（例如转头）：同一条骨骼链，各有自己的时间 [t0 开始, t1 到位, t2 开始收回, t3 收回]
  const idle = ep.idle;
  const moves = (ep.moves ?? []).map(m => ({ ...m, w: a => a < m.t[0] ? 0 : a < m.t[1] ? inOut((a - m.t[0]) / (m.t[1] - m.t[0])) : a < m.t[2] ? 1 : a < m.t[3] ? 1 - inOut((a - m.t[2]) / (m.t[3] - m.t[2])) : 0 }));
  function pose(w, t = -1) {
    meta.chain.forEach((b, i) => {
      const p = V(b.pivot);
      let pitch = (b.pitch ?? 0) * w, yaw = (b.yaw ?? 0) * w;
      for (const m of moves) { const mb = m.bones[b.name]; if (!mb) continue; const k = m.w(t); pitch += (mb.pitch ?? 0) * k; yaw += (mb.yaw ?? 0) * k; }
      // 正文里持续的小动作：头微微转向不同方向、耳朵跟着拍子转、尾巴偶尔摆动（ep.idle，时间 [起, 止]）
      if (idle && t >= idle.t[0] && t < idle.t[1] + 0.6) {
        const k = smooth(idle.t[0], idle.t[0] + 0.6, t) * (1 - smooth(idle.t[1], idle.t[1] + 0.6, t)), ib = idle.bones[b.name];
        if (ib) {
          const bp = ((t - HIT) / beat) % 1, onBeat = Math.exp(-bp * 5), bi = Math.floor((t - HIT) / beat);
          yaw += k * ((ib.yaw ?? 0) * Math.sin(t * (ib.f ?? 0.7) * 6.2832 + (ib.ph ?? 0)) + (ib.beatYaw ?? 0) * onBeat * (bi % 2 ? 1 : -1));
          pitch += k * ((ib.pitch ?? 0) * Math.sin(t * (ib.f ?? 0.7) * 4.1 + 1.3 + (ib.ph ?? 0)) + (ib.beatPitch ?? 0) * onBeat);
          if (ib.sway) yaw += k * ib.sway * Math.sin(t * 2.4) * (0.5 + 0.5 * Math.sin(t * 0.7));
        }
      }
      R.makeRotationAxis(lateral, -pitch * Math.PI / 180);
      Ry.makeRotationAxis(up, yaw * Math.PI / 180);
      tmp.makeTranslation(p.x, p.y, p.z).multiply(Ry).multiply(R).multiply(new THREE.Matrix4().makeTranslation(-p.x, -p.y, -p.z));
      const parent = b.parent ?? i - 1;
      mats[i].copy(parent >= 0 ? mats[parent] : new THREE.Matrix4()).multiply(tmp);
    });
    for (let i = meta.chain.length; i < 8; i++) mats[i].identity();
    return mats;
  }
  const slot = n => meta.chain.findIndex(b => b.name === n);
  const head = slot('head'), jaw = slot('jaw');
  // 嘴的位置和嚎叫方向（随动作）
  function mouth(w, t = -1) {
    pose(w, t);
    const nose = V(J.nose).applyMatrix4(mats[head]), occ = V(J.occiput).applyMatrix4(mats[head]);
    const jt = V(J.jawTip).applyMatrix4(mats[jaw >= 0 ? jaw : head]);
    const m = nose.clone().lerp(jt, 0.5);
    return { pos: m, dir: nose.clone().sub(occ).normalize() };
  }
  return { t0, t1, t2, t3, weight, pose, mouth, headSlot: head, mats };
}
