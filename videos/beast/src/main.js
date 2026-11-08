// 入口：index.html?ep=wolf&mode=video|still|card[&preview=1]
// render(t)：t 是成片里的真实时间（秒）。觉醒片段里 a = t（a = 2.0 为觉醒时刻）；静帧和收藏卡固定在英雄姿态。
import { initEngine, frame, faceBox, HIT, E } from './engine.js';
import { videoOverlay, cardOverlay, BOXES } from './text.js';

const q = new URLSearchParams(location.search);
const MODE = q.get('mode') || 'video', EP = q.get('ep') || 'wolf';
let ep, outCtx, gl, out, T;

export async function init() {
  ep = await (await fetch(`episodes/${EP}.json`)).json();
  const card = MODE === 'card';
  const W = card ? 1080 : 1920, H = card ? 1350 : 1080;
  gl = document.getElementById('gl'); out = document.getElementById('out');
  gl.width = out.width = W; gl.height = out.height = H;
  outCtx = out.getContext('2d');
  const f = new FontFace('Cinzel', 'url(assets/fonts/Cinzel.ttf)', { weight: '400 900' }); await f.load(); document.fonts.add(f);
  for (const w of [700, 900]) { outCtx.font = `${w} 20px "Noto Serif CJK SC"`; outCtx.fillText('兽格觉醒' + ep.title + ep.talents.join(''), -500, -500); }
  outCtx.font = '900 20px Cinzel'; outCtx.fillText('INTP', -500, -500);
  await document.fonts.ready;
  const beat = ep.music?.beat ?? 0.5;
  // 拍点上的事件（觉醒时间）：眼睛 0、汇聚 0.5、觉醒 2.0、天赋词在觉醒后的每半拍
  // 汇聚从觉醒前两拍开始；天赋词落在觉醒后的三个十六分音符上
  const asm0 = Math.max(0.3, HIT - 2 * beat);
  T = { hit: HIT, beat, asm0, titleY: ep.layout?.titleY ?? 880, talentTimes: [1, 2, 3].map(i => HIT + i * (ep.talentStep ?? 0.25) * beat) };
  await initEngine(gl, ep, { W, H, mode: MODE, beat, asm0 });
  window.META = {
    ep, mode: MODE, W, H, music: ep.music, start: (ep.music?.hit ?? HIT) - HIT, count: E.count, surface: E.surface,
    events: [{ name: '眼睛亮起', a: 0 }, { name: '粒子开始汇聚', a: T.asm0 }, { name: '觉醒', a: HIT }, { name: '称号', a: HIT },
      ...(E.act ? [{ name: '动作抬到位', a: E.act.t1 }, { name: '动作开始收回', a: E.act.t2 }, { name: '回到英雄姿态', a: E.act.t3 }, ...Array.from({ length: ep.action.voice?.rings ?? 0 }, (_, k) => ({ name: '声波' + (k + 1), a: HIT + k * ep.action.voice.gap * beat }))] : []), ...T.talentTimes.map((a, i) => ({ name: '天赋词' + (i + 1), a }))],
  };
}

export function render(t) {
  const still = MODE !== 'video';
  const a = still ? (ep.stillA ?? 3.35) : t;
  frame(a, still ? (ep.stillT ?? 3.35) : t);
  outCtx.setTransform(1, 0, 0, 1, 0, 0); outCtx.globalAlpha = 1; outCtx.globalCompositeOperation = 'source-over';
  if (MODE === 'card') cardOverlay(outCtx, gl, ep, a, { holo: 0.2 });
  else { outCtx.drawImage(gl, 0, 0); videoOverlay(outCtx, a, ep, T); }
  window.LAST = { boxes: BOXES.slice(), face: faceBox(), a };
}
