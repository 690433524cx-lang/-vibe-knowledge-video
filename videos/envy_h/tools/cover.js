// 生成 4:5 竖版封面 1080×1350，排版沿用第一集《傲慢》的竖版封面。画面取自神像成形、「别人」出现之后（成片 10.8 秒，此时没有字幕）。
// 用法：node tools/cover.js [时间]      OUT=目录 指定输出目录（默认 output/envy_h/cover）
const fs = require('fs');
const path = require('path');
const { openBrowser, openPage } = require('./page');

const outDir = path.resolve(process.env.OUT || path.join(__dirname, '../../../output/envy_h/cover'));
const T0 = Number(process.argv[2] || 10.8);
const COVERS = [
  { name: '封面_竖版_1080x1350', w: 1080, h: 1350, t: T0, cam: { pos: [0, -0.05, 7.4], target: [0, -0.62, 0], fov: 35 } },
];

async function compose(page, c) {
  return page.evaluate(async c => {
    const { K } = window;
    const T = await import('./src/text.js');
    const THREE = K.THREE;
    const out = document.getElementById('out'); out.width = c.w; out.height = c.h;
    K.renderer.setSize(c.w, c.h, false); K.composer.setSize(c.w, c.h);
    K.camera.aspect = c.w / c.h; K.final.uniforms.uRes.value.set(c.w, c.h);
    // 在后期之前改相机，并重新让公告板朝向相机
    window.DBG = (K) => {
      const cam = K.camera;
      cam.position.set(...c.cam.pos); cam.up.set(0, 1, 0); cam.lookAt(new THREE.Vector3(...c.cam.target));
      cam.fov = c.cam.fov; cam.updateProjectionMatrix(); cam.updateMatrixWorld();
      const q = new THREE.Quaternion(); cam.getWorldQuaternion(q);
      for (const g of K.glows) if (g.userData.billboard && g.visible) { const pq = new THREE.Quaternion(); g.parent.getWorldQuaternion(pq); g.quaternion.copy(pq.invert().multiply(q)); }
    };
    window.render(c.t);
    window.DBG = null;
    const ctx = out.getContext('2d');
    ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = 1;
    // 片中噪点只铺到 1920×1080，下方补一层同强度的噪点
    if (c.h > 1080) {
      const g = document.createElement('canvas'); g.width = c.w / 2; g.height = (c.h - 1080) / 2;
      const gx = g.getContext('2d'), im = gx.createImageData(g.width, g.height);
      for (let i = 0; i < g.width * g.height; i++) { const v = Math.random() * 255 | 0; im.data[i * 4] = im.data[i * 4 + 1] = im.data[i * 4 + 2] = v; im.data[i * 4 + 3] = 255; }
      gx.putImageData(im, 0, 0);
      ctx.save(); ctx.globalAlpha = 0.04; ctx.drawImage(g, 0, 1080, c.w, c.h - 1080); ctx.restore();
    }
    T.setCtx(ctx, 0);
    const { glowText, fs, C } = T;
    const shade = (x, y, rx, ry, a) => {
      ctx.save(); ctx.translate(x, y); ctx.scale(rx, ry);
      const g = ctx.createRadialGradient(0, 0, 0, 0, 0, 1);
      g.addColorStop(0, `rgba(2,10,6,${a})`); g.addColorStop(1, 'rgba(2,10,6,0)');
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, 1, 0, Math.PI * 2); ctx.fill(); ctx.restore();
    };
    const metal = (s, x, y, size) => glowText(s, x, y, fs(900, size), 'metal', { size, glow: 50, glow2: 90, glowColor: '#3DDC84', sweep: false });
    const dy = c.h - 1440;
    shade(540, 1160 + dy, 680, 380, 0.8);
    glowText('七  宗  罪  ·  第  二  集', 540, 92, fs(600, 40), C.key, { glow: 14 });
    metal('嫉妒', 540, 1080 + dy, 240);
    glowText('别人过得好的时候，', 540, 1250 + dy, fs(700, 58), C.text, { glow: 22 });
    glowText('为什么心里会疼？', 540, 1335 + dy, fs(700, 58), C.key, { glow: 30, glowColor: '#3DDC84' });
    return out.toDataURL('image/jpeg', 0.95);
  }, c);
}

(async () => {
  fs.mkdirSync(outDir, { recursive: true });
  const { srv, url, browser } = await openBrowser();
  const errors = [];
  for (const c of COVERS) {
    const page = await openPage(browser, url, false, errors);
    await page.setViewportSize({ width: 1920, height: 1440 });
    const data = await compose(page, c);
    const file = path.join(outDir, c.name + '.jpg');
    fs.writeFileSync(file, Buffer.from(data.split(',')[1], 'base64'));
    console.log(file);
    await page.close();
  }
  await browser.close(); srv.close();
  if (errors.length) { console.error('页面错误：\n' + errors.join('\n')); process.exit(1); }
})();
