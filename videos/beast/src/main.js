// 入口：index.html?ep=wolf&mode=video|still|card
// render(t)：t 是成片时间（秒）= 音乐时间（音乐从歌曲第一个音开始，不截取）。静帧和收藏卡固定在 episode.stillT。
// 时间表全部来自实测节拍（beats.json）：E8 = 半拍（八分音符，约 0.333 秒，片头“每一拍”闪一只动物），T_AWAKE = 觉醒那个小节第一拍。
import { initEngine, frame, avoidRegions, toScreen, E } from './engine.js';
import { videoOverlay, cardOverlay, BOXES } from './text.js';
import { buildCards, drawCards } from './cards.js';
let D = null;

const q = new URLSearchParams(location.search);
const MODE = q.get('mode') || 'video', EP = q.get('ep') || 'wolf';
let ep, outCtx, gl, out, T;

export function timeline(ep, beats) {
  const beat = beats.beat, e8 = beat / 2, hb = e8 / 2, reveal = ep.music.reveal, hit = ep.music.awake;
  const g = k => +(reveal + k * e8).toFixed(4);            // 以翻面亮相为原点的拍点网格（一拍 ≈ 0.333 秒）
  const A = ep.action, h = k => +(hit + k * e8).toFixed(4);
  const t1 = h(A.rise), t2 = h(A.rise + A.hold), t3 = h(A.rise + A.hold + A.back);
  const first = -Math.round((reveal - beats.first_onset) / e8);   // 第一个拍点
  // 发牌：从第一个拍点起每半拍飞出 2–3 张（按行，从左到右）
  const deal = []; let i = 0; ep.cards.deal.forEach((n, j) => { for (let k = 0; k < n; k++) deal[i++] = +(g(first) + j * hb).toFixed(4); });
  // 转盘：每跳一下对齐一个拍点（先半拍、再一拍、再两拍；经过主角卡，假停在旁边那张上半拍，再退回主角卡）
  const jumps = ep.cards.jumps.map(([k, idx]) => [g(k), idx]);
  const pop = g(ep.cards.popBeat), rush = +(hit - hb).toFixed(4);
  const outro = h(ep.outroBeats ?? 8), cardHold = +(outro + 1.5 * e8).toFixed(4), cardBack = +(cardHold + e8).toFixed(4);
  const cards = { deal, spin0: jumps[0][0], jumps, pop, rush, cardHold, cardBack, backIn: cardBack, flyBack: +(cardBack + 0.2).toFixed(4), gather: +(cardBack + 1.5 * e8).toFixed(4), end: +(cardBack + 1.5 * e8 + 0.4).toFixed(4) };
  return { beat, e8, hit, reveal, clip: ep.clip, g, cards, asm0: rush, act: [t1, t2, t3], title: t2, sentence: h(A.rise + A.hold + 1), outro, cardHold, cardBack, lift: pop };
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
  T = timeline(ep, { ...beats, first: beats.first_onset ?? 0 });
  await initEngine(gl, ep, { W, H, mode: MODE, T });
  if (MODE === 'video') D = await buildCards(ep);
  const C = T.cards, DK = ['INTJ','INTP','ENTJ','ENTP','INFJ','INFP','ENFJ','ENFP','ISTJ','ISFJ','ESTJ','ESFJ','ISTP','ISFP','ESTP','ESFP'];
  const ev = [{ name: '第 0 帧：一叠卡牌', t: 0 }, ...[...new Set(C.deal)].map((t, j) => ({ name: `发牌 第 ${j + 1} 组（${ep.cards.deal[j]} 张）`, t })),
    ...C.jumps.map(([t, i], j) => ({ name: `转盘 ${j + 1} → ${DK[i]}`, t })),
    { name: `${ep.type} 卡弹出、飞向中央 / “${ep.type} 是——”`, t: C.pop }, { name: 'T_REVEAL 翻面亮相', t: T.reveal }, { name: '镜头冲进卡面（前半拍）', t: C.rush },
    { name: 'T_AWAKE 觉醒 / 嚎叫 / 月亮爆亮', t: T.hit },
    ...Array.from({ length: ep.action.voice.rings }, (_, k) => ({ name: '声波' + (k + 1), t: +(T.hit + k * ep.action.voice.gap * T.e8).toFixed(4) })),
    { name: '嚎叫抬到位', t: T.act[0] }, { name: `嚎叫结束 · 大字 ${ep.type} · ${ep.animal.zh}`, t: T.act[1] }, { name: '一句话', t: T.sentence }, { name: '回到英雄姿态', t: T.act[2] },
    { name: '狼和月亮缩回卡里', t: T.outro }, { name: '收藏卡定格', t: C.cardHold }, { name: '翻回背面', t: C.cardBack }, { name: '16 张收回成一叠', t: C.gather }];
  window.META = { ep, mode: MODE, W, H, T, music: ep.music, count: E.count, surface: E.surface, events: ev };
}

export function render(t) {
  const tt = MODE === 'video' ? t : MODE === 'card' ? (ep.cardT ?? ep.stillT ?? 4.9) : (ep.stillT ?? 4.9);
  frame(tt);
  outCtx.setTransform(1, 0, 0, 1, 0, 0); outCtx.globalAlpha = 1; outCtx.globalCompositeOperation = 'source-over';
  if (MODE === 'card') cardOverlay(outCtx, gl, ep, tt, T);
  else {
    outCtx.drawImage(gl, 0, 0);
    if (D) drawCards(outCtx, D, tt, T);
    videoOverlay(outCtx, tt, ep, T);
  }
  window.LAST = { boxes: BOXES.slice(), avoid: avoidRegions(tt), t: tt, eyes: E.eyeGlows.map(g => toScreen(g.position).slice(0, 2)) };
}
