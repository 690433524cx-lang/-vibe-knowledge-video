// 第三集·愤怒 4:5 竖版封面（1080×1350），排版沿用第一集、第二集的竖版封面：
// 上方间隔小字“七 宗 罪 · 第 三 集”，中间光环里的愤怒脸，下方金属渐变大字“愤怒”和两行问句
// 用法：node tools/cover_frame.js 输出.jpg [秒] [相机JSON]   （window.COVER=1 时片中的字幕、标题、左上角小字都不画）
const fs = require('fs');
const { openBrowser, openPage } = require('./page');
(async () => {
  const [out, t = '3.6', cam] = process.argv.slice(2);
  const c = { w: 1080, h: 1350, t: Number(t), cam: cam ? JSON.parse(cam) : { pos: [-1.40, -0.50, 7.0], target: [-1.40, -0.62, 0], fov: 35 } };
  const { srv, url, browser } = await openBrowser();
  const page = await openPage(browser, url, false, []);
  await page.setViewportSize({ width: 1920, height: 1440 });
  const d = await page.evaluate(async c => {
    const { K } = window; window.COVER = 1;
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
    const ctr = (() => { const v = new K.THREE.Vector3(-1.40, 0.02, 0).project(K.camera); return [(v.x * 0.5 + 0.5) * c.w, (-v.y * 0.5 + 0.5) * c.h]; })();
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    for (const [w, a, b] of [[22, 0.18, 30], [9, 0.45, 18], [3, 0.95, 8]]) { ctx.globalAlpha = a; ctx.strokeStyle = w > 5 ? '#FF2A2A' : '#FF9A88'; ctx.lineWidth = w; ctx.shadowColor = '#FF2A2A'; ctx.shadowBlur = b; ctx.beginPath(); ctx.arc(ctr[0], ctr[1], 285, 0, Math.PI * 2); ctx.stroke(); }
    ctx.restore();
    // 四角压暗（左下角有一段地面圆环的残线）
    { const v = ctx.createRadialGradient(540, 620, 420, 540, 620, 900); v.addColorStop(0, 'rgba(6,1,1,0)'); v.addColorStop(1, 'rgba(6,1,1,0.85)'); ctx.fillStyle = v; ctx.fillRect(0, 0, c.w, c.h); }
    // 下半部分压暗，让大字清楚
    ctx.save(); ctx.translate(540, 1150); ctx.scale(700, 340); const g = ctx.createRadialGradient(0, 0, 0, 0, 0, 1);
    g.addColorStop(0, 'rgba(10,2,2,0.82)'); g.addColorStop(1, 'rgba(10,2,2,0)'); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, 1, 0, Math.PI * 2); ctx.fill(); ctx.restore();
    T.setCtx(ctx, 0);
    const { glowText, fs } = T;
    glowText('七  宗  罪  ·  第  三  集', 540, 92, fs(600, 40), '#FFB4A6', { glow: 14, glowColor: '#FF2A2A', nobox: true });
    glowText('愤怒', 540, 1020, fs(900, 240), 'metal', { size: 240, glow: 50, glow2: 90, glowColor: '#FF2A2A', sweep: false, metal: 'wrath', nobox: true });
    glowText('你吼得最凶的那个人，', 540, 1190, fs(700, 58), '#FFF1EC', { glow: 22, glowColor: '#FF2A2A', nobox: true });
    glowText('为什么偏偏是最亲的人？', 540, 1275, fs(700, 58), '#FFB4A6', { glow: 30, glowColor: '#FF2A2A', nobox: true });
    return out.toDataURL('image/jpeg', 0.95);
  }, c);
  fs.writeFileSync(out, Buffer.from(d.split(',')[1], 'base64'));
  await browser.close(); srv.close();
})();
