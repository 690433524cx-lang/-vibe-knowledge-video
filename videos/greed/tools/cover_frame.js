// 《七宗罪》第四集·懒惰 4:5 竖版封面（1080×1350），排版和前三集的系列封面一致
// 上方间隔小字“七 宗 罪 · 第 X 集”，中间光环里的脸，下方金属渐变大字和两行问句
// 用法：node tools/cover_frame.js 输出.jpg [秒] [相机JSON]   （window.COVER=1 时片中的字幕、标题、左上角小字都不画）
const fs = require('fs');
const { openBrowser, openPage } = require('./page');
(async () => {
  // 三集共用同一套版式：node tools/cover_frame.js 输出.jpg [wrath|envy|pride] [秒]
  const [out, sin = 'sloth', t = '6.4'] = process.argv.slice(2);
  const SIN = {
    pride: { i: 0, ep: '一', name: '傲慢', col: '#A24BFF', hi: '#C9A6FF', core: '#E9D5FF', bg: '#07030B', metal: 'prideC', l1: '为什么，几乎没有人', l2: '觉得自己傲慢？' },
    envy:  { i: 1, ep: '二', name: '嫉妒', col: '#2BE36B', hi: '#8FF0B5', core: '#D8FFE6', bg: '#030A05', metal: 'envy', l1: '别人过得好的时候，', l2: '为什么心里会疼？' },
    sloth: { i: null, ep: '四', name: '懒惰', col: '#2BC8E0', hi: '#A8F0FA', core: '#CFF7FC', bg: '#03080A', metal: 'sloth', l1: '总说“明天再说”的你，', l2: '真的是懒吗？', cam: { pos: [0, -0.5, 7.0], target: [0, -0.62, 0], fov: 35 }, cx: 0 },
    wrath: { i: null, ep: '三', name: '愤怒', col: '#FF2A2A', hi: '#FF9A88', core: '#FFB4A6', bg: '#0A0303', metal: 'wrath', l1: '你吼得最凶的那个人，', l2: '为什么偏偏是最亲的人？' },
  }[sin];
  const c = { w: 1080, h: 1350, t: Number(t), S: SIN, cam: SIN.cam ?? { pos: [-1.40, -0.50, 7.0], target: [-1.40, -0.62, 0], fov: 35 } };
  const { srv, url, browser } = await openBrowser();
  const page = await openPage(browser, url, false, []);
  await page.setViewportSize({ width: 1920, height: 1440 });
  const d = await page.evaluate(async c => {
    const { K } = window, S = c.S; window.COVER = 1; window.COVER_SIN = S.i; window.COVER_BG = S.bg;
    for (const id of ['gl', 'out']) { const e = document.getElementById(id); e.width = c.w; e.height = c.h; }
    K.W = c.w; K.H = c.h;
    K.renderer.setSize(c.w, c.h, false); K.composer.setSize(c.w, c.h); K.bloom.resolution.set(c.w, c.h);
    K.camera.aspect = c.w / c.h; K.final.uniforms.uRes.value.set(c.w, c.h);
    window.CAM_OVERRIDE = c.cam;
    window.render(c.t);
    const out = document.getElementById('out'), ctx = out.getContext('2d');
    const T = await import('./src/text.js');
    ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = 1;
    // 光环：前两集封面上那一圈亮环，这里是红色（圆心在脸上，按竖版画布换算）
    const ctr = (() => { const v = new K.THREE.Vector3(S.cx ?? -1.40, 0.02, 0).project(K.camera); return [(v.x * 0.5 + 0.5) * c.w, (-v.y * 0.5 + 0.5) * c.h]; })();
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    for (const [w, a, b] of [[22, 0.18, 30], [9, 0.45, 18], [3, 0.95, 8]]) { ctx.globalAlpha = a; ctx.strokeStyle = w > 5 ? S.col : S.hi; ctx.lineWidth = w; ctx.shadowColor = S.col; ctx.shadowBlur = b; ctx.beginPath(); ctx.arc(ctr[0], ctr[1], 285, 0, Math.PI * 2); ctx.stroke(); }
    ctx.restore();
    // 四角压暗（左下角有一段地面圆环的残线）
    { const v = ctx.createRadialGradient(540, 620, 420, 540, 620, 900); v.addColorStop(0, S.bg + '00'); v.addColorStop(1, S.bg + 'D8'); ctx.fillStyle = v; ctx.fillRect(0, 0, c.w, c.h); }
    // 下半部分压暗，让大字清楚
    ctx.save(); ctx.translate(540, 1150); ctx.scale(700, 340); const g = ctx.createRadialGradient(0, 0, 0, 0, 0, 1);
    g.addColorStop(0, S.bg + 'D0'); g.addColorStop(1, S.bg + '00'); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, 1, 0, Math.PI * 2); ctx.fill(); ctx.restore();
    T.setCtx(ctx, 0);
    const { glowText, fs } = T;
    glowText(`七  宗  罪  ·  第  ${S.ep}  集`, 540, 92, fs(600, 40), S.core, { glow: 14, glowColor: S.col, nobox: true });
    glowText(S.name, 540, 1020, fs(900, 240), 'metal', { size: 240, glow: 50, glow2: 90, glowColor: S.col, sweep: false, metal: S.metal, nobox: true });
    glowText(S.l1, 540, 1190, fs(700, 58), '#FFFFFF', { glow: 22, glowColor: S.col, nobox: true });
    glowText(S.l2, 540, 1275, fs(700, 58), S.core, { glow: 30, glowColor: S.col, nobox: true });
    return out.toDataURL('image/jpeg', 0.95);
  }, c);
  fs.writeFileSync(out, Buffer.from(d.split(',')[1], 'base64'));
  await browser.close(); srv.close();
})();
