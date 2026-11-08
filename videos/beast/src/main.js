// 入口：index.html?ep=wolf&mode=video|still|card
// render(t)：t 是成片时间（秒）= 音乐时间（音乐从歌曲第一个音开始，不截取）。静帧和收藏卡固定在 episode.stillT。
// 时间表全部来自实测节拍（beats.json）：E8 = 半拍（八分音符，约 0.333 秒，片头“每一拍”闪一只动物），T_AWAKE = 觉醒那个小节第一拍。
import { initEngine, frame, avoidRegions, E } from './engine.js';
import { videoOverlay, cardOverlay, BOXES } from './text.js';

const q = new URLSearchParams(location.search);
const MODE = q.get('mode') || 'video', EP = q.get('ep') || 'wolf';
let ep, outCtx, gl, out, T;

export function timeline(ep, beats) {
  const beat = beats.beat, e8 = beat / 2, hit = ep.music.awake;
  const g = k => +(hit + k * e8).toFixed(4);                // 以觉醒为原点的八分音符网格
  const n = ep.intro?.animals?.length ?? 6;
  const A = ep.action;
  const t1 = g(A.rise), t2 = g(A.rise + A.hold), t3 = g(A.rise + A.hold + A.back);
  return {
    beat, e8, hit, clip: ep.clip,
    flashes: Array.from({ length: n }, (_, i) => g(-(n + 1) + i)),   // 每一拍闪一只
    reveal: g(-1), asm0: g(-1),                                  // 最后一个拍点：剪影消失、揭晓、汇聚
    act: [t1, t2, t3], title: t2, sentence: g(A.rise + A.hold + 1),
    outro: g(ep.outroBeats ?? 8),                                // 回到第 0 帧（循环）
  };
}

export async function init() {
  ep = await (await fetch(`episodes/${EP}.json`)).json();
  const beats = await (await fetch('beats.json')).json();
  const card = MODE === 'card';
  const W = card ? 1080 : 1920, H = card ? 1350 : 1080;
  gl = document.getElementById('gl'); out = document.getElementById('out');
  gl.width = out.width = W; gl.height = out.height = H;
  outCtx = out.getContext('2d');
  const f = new FontFace('Cinzel', 'url(assets/fonts/Cinzel.ttf)', { weight: '400 900' }); await f.load(); document.fonts.add(f);
  const allText = '兽格觉醒' + ep.concept + ep.revealText + ep.animal.zh + ep.line + '·——';
  for (const w of [700, 900]) { outCtx.font = `${w} 20px "Noto Serif CJK SC"`; outCtx.fillText(allText, -900, -500); }
  outCtx.font = '900 20px Cinzel'; outCtx.fillText('INTPESFJ', -500, -500);
  await document.fonts.ready;
  T = timeline(ep, beats);
  await initEngine(gl, ep, { W, H, mode: MODE, T });
  const ev = [{ name: '概念大字（第 0 帧）', t: 0 }, ...T.flashes.map((t, i) => ({ name: `剪影 ${ep.intro.animals[i].type}`, t })),
    { name: '揭晓（INFJ 的动物是——）', t: T.reveal }, { name: 'T_AWAKE 觉醒 / 嚎叫 / 月亮爆亮', t: T.hit },
    ...Array.from({ length: ep.action.voice.rings }, (_, k) => ({ name: '声波' + (k + 1), t: +(T.hit + k * ep.action.voice.gap * T.e8).toFixed(4) })),
    { name: '嚎叫抬到位', t: T.act[0] }, { name: '嚎叫结束 · 大字 INFJ · 狼', t: T.act[1] }, { name: '一句话', t: T.sentence }, { name: '回到英雄姿态', t: T.act[2] }, { name: '开始回到第 0 帧', t: T.outro }];
  window.META = { ep, mode: MODE, W, H, T, music: ep.music, count: E.count, surface: E.surface, events: ev };
}

export function render(t) {
  const tt = MODE === 'video' ? t : MODE === 'card' ? (ep.cardT ?? ep.stillT ?? 4.9) : (ep.stillT ?? 4.9);
  frame(tt);
  outCtx.setTransform(1, 0, 0, 1, 0, 0); outCtx.globalAlpha = 1; outCtx.globalCompositeOperation = 'source-over';
  if (MODE === 'card') cardOverlay(outCtx, gl, ep, tt, T);
  else { outCtx.drawImage(gl, 0, 0); videoOverlay(outCtx, tt, ep, T); }
  window.LAST = { boxes: BOXES.slice(), avoid: avoidRegions(tt), t: tt };
}
