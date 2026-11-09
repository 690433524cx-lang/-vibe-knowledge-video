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
  // 正文：各段从小节第一拍（或拍点）开始；每条字幕显示 ≥ 1.0 + 0.17 × 字数（不计标点）秒，切换往后对齐到下一个拍点 / 小节第一拍
  const S = ep.story, bar = 4 * e8, nextBar = x => +(hit + Math.ceil((x - hit) / bar - 1e-6) * bar).toFixed(4), nextBeat = x => +(hit + Math.ceil((x - hit) / e8 - 1e-6) * e8).toFixed(4);
  const chars = s => s.replace(/[〔〕，。、？！：；“”‘’（）…—\s,.!?:;@]/g, '').length, need = s => 1.0 + 0.17 * chars(s);
  const start = h(S.startBeat);
  const seg2a = nextBar(start + need(S.subs[0])), seg2b = nextBar(seg2a + need(S.subs[1])), seg3 = nextBar(seg2b + need(S.subs[2]));
  const outro = nextBar(seg3 + need(S.subs[3]));
  const subs = [[S.subs[0], start, seg2a], [S.subs[1], seg2a, seg2b], [S.subs[2], seg2b, seg3], [S.subs[3], seg3, outro]].map(([text, t0, t1]) => ({ text, t0, t1, need: +need(text).toFixed(2), chars: chars(text) }));
  const story = { start, seg2a, seg2b, seg3, pathBeats: Math.round((seg3 - seg2b) / e8) - 1, subs };
  story.at = ([k, off]) => story[k] + off;
  // 结尾：收藏卡 + 问句（≥ 1.6 秒）→ 下一个小节第一拍飞回网格 + 下一集 → 收回成一叠 → 回到第 0 帧
  const cardHold = +(outro + 0.5).toFixed(4), question = +(outro + 2 * e8).toFixed(4);
  const next = nextBar(question + (ep.questionMin ?? 1.6)), gather = +(next + 3 * e8).toFixed(4), end = +(gather + 0.5).toFixed(4);
  const cards = { deal, spin0: jumps[0][0], jumps, pop, rush, cardHold, cardBack: next, backIn: next, flyBack: next, gather, end };
  const clip = +(end + (ep.endHold ?? 0.166)).toFixed(4);
  const kw = (ep.keywords ?? []).map((_, i) => h(A.rise + A.hold + 1 + i)), header = h(A.rise + A.hold + 1 + kw.length), sentence = +(header + e8).toFixed(4);
  return { beat, e8, hit, reveal, clip, g, cards, asm0: rush, act: [t1, t2, t3], title: t2, keywords: kw, header, sentence, sentenceOut: +(seg2a + 3 * e8).toFixed(4), outro, cardHold, cardBack: next, lift: pop, story, question, next, nextType: ep.next?.type };
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
    { name: '嚎叫抬到位', t: T.act[0] }, { name: `嚎叫结束 · 大字 ${ep.type} · ${ep.animal.zh}`, t: T.act[1] }, ...T.keywords.map((t, i) => ({ name: `关键词「${ep.keywords[i]}」+ 小冲击波 + 镜头震动`, t })), { name: '大字和关键词移到左上角', t: T.header }, { name: '一句话', t: T.sentence }, { name: '回到英雄姿态', t: T.act[2] },
    ...T.story.subs.map((sb, k) => ({ name: `字幕${k + 1}「${sb.text.replace(/[〔〕]/g, '')}」`, t: sb.t0 })),
    { name: '第 1 段：拉远、狼群影子', t: T.story.start }, { name: '第 2 段：狼转头、狼群散去', t: T.story.seg2a }, { name: '第 2 段：光路开始延伸', t: T.story.seg2b },
    ...Array.from({ length: T.story.pathBeats }, (_, k) => ({ name: `光路延伸 ${k + 1}`, t: +(T.story.seg2b + (k + 1) * T.e8).toFixed(4) })),
    { name: '第 3 段：脸部特写、眼睛亮起', t: T.story.seg3 }, { name: '远处另一双眼睛', t: +(T.story.seg3 + T.e8).toFixed(4) }, { name: '两双眼睛一闪、光连起来', t: +(T.story.seg3 + 2 * T.e8).toFixed(4) },
    { name: '结尾：缩回卡里', t: T.outro }, { name: '问句', t: T.question }, { name: '飞回网格 / 下一集', t: T.next }, { name: '16 张收回成一叠', t: C.gather }];
  window.META_SUBS = T.story.subs;
  window.E = E;
  window.META = { ep, mode: MODE, W, H, T: { ...T, story: { ...T.story, at: undefined } }, subs: T.story.subs, music: ep.music, count: E.count, surface: E.surface, events: ev };
}

export function render(t) {
  const tt = MODE === 'video' ? t : MODE === 'card' ? (ep.cardT ?? ep.stillT ?? 4.9) : (ep.stillT ?? 4.9);
  frame(tt);
  outCtx.setTransform(1, 0, 0, 1, 0, 0); outCtx.globalAlpha = 1; outCtx.globalCompositeOperation = 'source-over';
  if (MODE === 'card') cardOverlay(outCtx, gl, ep, tt, T);
  else {
    // 关键词弹出时的小镜头震动（3px）；正文换镜头时的运动模糊
    let sh = 0; for (const k of T.keywords) if (tt >= k && tt < k + 0.35) sh += Math.exp(-(tt - k) / 0.08);
    const blur = E.story?.blur && tt >= T.story.start && tt < T.outro ? E.story.blur : 0;
    if (blur > 0.3) outCtx.filter = `blur(${blur.toFixed(1)}px)`;
    outCtx.drawImage(gl, 3 * sh * Math.sin(tt * 97), 3 * sh * Math.cos(tt * 83));
    outCtx.filter = 'none';
    if (D) drawCards(outCtx, D, tt, T);
    videoOverlay(outCtx, tt, ep, T);
  }
  window.LAST = { boxes: BOXES.slice(), avoid: avoidRegions(tt), t: tt, eyes: E.eyeGlows.map(g => toScreen(g.position).slice(0, 2)) };
}
