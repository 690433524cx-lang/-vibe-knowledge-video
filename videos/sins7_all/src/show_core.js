// 《七宗罪，其实是大脑的七种出厂设置》合集：抽签 → 灰色的脸 → 变身 → 反转 → 结尾卡，每宗 4 小节；最后七个角色排成一排
// 律动：低音（鼓点）驱动人物弹动、光环与光晕；中音驱动脸上粒子的流动；高音的细碎重音在人物周围闪出火花
import * as THREE from 'three';
import { K, glow, project } from './core.js';
import { FACE } from './geo.js';
import { cloudMaterial } from './mat.js';
import { clamp, lerp, lerp3, prog, sine, outExpo, outBack, inOut, hash, TAU } from './util.js';
import { glowText, fs, BOXES } from './text.js';
import { idolMaterial } from './idol.js';
import * as H from './halo.js';
import * as PR from './props.js';

export const SINS = [
  { id: 'pride', tags: ['目中无人', '自命不凡', '唯我独尊', '不可一世'], name: '傲慢', col: '#A24BFF', icon: 'crown', first: '〔傲慢〕说：我也会犯错。', twist: '只是〔还没发生过〕。', fact: '多数人觉得，自己比平均强。' },
  { id: 'envy', tags: ['眼红心热', '患得患失', '耿耿于怀', '心有不甘'], name: '嫉妒', col: '#2BE36B', icon: 'snake', first: '〔嫉妒〕说：我真心为你高兴。', twist: '只要你〔别比我好太多〕。', fact: '别人比你好时，大脑的疼痛区会亮。' },
  { id: 'wrath', tags: ['火冒三丈', '怒发冲冠', '暴跳如雷', '一点就着'], name: '愤怒', col: '#FF2A2A', icon: 'bolt', first: '〔愤怒〕说：我一点都没生气。', twist: '〔你再说一遍？〕', fact: '怒气走近路，比理智快一步。' },
  { id: 'sloth', tags: ['得过且过', '明日再说', '能躺不坐', '养精蓄锐'], name: '懒惰', col: '#2BC8E0', icon: 'moon', first: '〔懒惰〕说：明天我一定开始。', twist: '这句话我〔说了三年〕。', fact: '大脑天生爱省电，能躺就不想动。' },
  { id: 'greed', tags: ['得寸进尺', '欲壑难填', '多多益善', '贪得无厌'], name: '贪婪', col: '#FFC23D', icon: 'coin', first: '〔贪婪〕说：我一点也不贪心。', twist: '我只是〔全都想要〕。', fact: '多巴胺爱的，是‘快得到’。' },
  { id: 'gluttony', tags: ['胡吃海塞', '来者不拒', '欲罢不能', '再来一碗'], name: '暴食', col: '#FF7A1F', icon: 'bowl', first: '〔暴食〕说：我就尝一口。', twist: '这是今晚的〔第七口〕。', fact: '吃饱的信号，要晚到约20分钟。' },
  { id: 'lust', tags: ['见异思迁', '心猿意马', '一见钟情', '情不自禁'], name: '色欲', col: '#FF3D8B', icon: 'heart', first: '〔色欲〕说：我很专一的。', twist: '〔每一次〕都是。', fact: '心动时，大脑的奖励回路全亮。' },
];
export const C3 = h => new THREE.Color(h);
export const hexs = c => '#' + c.getHexString();
export const tone = (hex, k) => hexs(C3(hex).lerp(C3('#FFFFFF'), k));
export const GRAY = '#8A8798';
export const SLOT_DX = 1.4;
export const slotX = i => (i - 3) * SLOT_DX;
export const HEAD_C = [0, 0.1, 0];

// ------------------------------------------------------------ 音频包络（30fps）与节拍工具
export const A = { env: null, B: [], R: [], hats: [], down: [] };
export function setAudio(env, beats) { A.env = env; A.B = beats.beats; A.R = beats.R; A.hats = beats.hats ?? []; A.down = beats.downbeats; }
export function env(t, band) {
  const e = A.env[band], x = t * A.env.fps, i = Math.floor(x), f = x - i;
  if (i < 0) return e[0]; if (i >= e.length - 1) return e[e.length - 1];
  return e[i] * (1 - f) + e[i + 1] * f;
}
export const lastIdx = (arr, t) => { let lo = 0, hi = arr.length - 1, r = -1; while (lo <= hi) { const m = (lo + hi) >> 1; if (arr[m] <= t + 1e-9) { r = m; lo = m + 1; } else hi = m - 1; } return r; };
// 鼓点弹簧：每一拍放大再回弹（0.18 秒内回落、带一点过冲），强度按那一拍的低音冲击
export function kickSpring(t) {
  let v = 0;
  for (let j = Math.max(0, lastIdx(A.B, t) - 1); j <= lastIdx(A.B, t); j++) {
    if (j < 0) continue; const d = t - A.B[j]; if (d < 0 || d > 0.45) continue;
    const amp = 0.55 + 0.45 * env(A.B[j] + 0.03, 'kick');
    v += amp * Math.exp(-d * 13) * Math.cos(d * 26);
  }
  return v;
}
// 这一拍是小节里的第几拍（0 = 重拍）
export function beatInBar(t) {
  const j = lastIdx(A.B, t); if (j < 0) return { k: -1, d: 9 };
  const b = A.B[j], di = lastIdx(A.down, b + 1e-4), k = di < 0 ? 0 : Math.round((b - A.down[di]) / (A.B[1] - A.B[0])) % 4;
  return { k, d: t - b };
}
