// 生成封面：横版 1920×1080、竖版 1080×1440（3:4）与 1080×1350（4:5）。画面取自片头加冕后的神像（17.5 秒，标题砸入之前），文字另行排版。
// 用法：node tools/cover.js            OUT=目录 指定输出目录（默认 output/pride3d/cover）
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const { serve } = require('./server');

const GL_ARGS = ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'];
const outDir = path.resolve(process.env.OUT || path.join(__dirname, '../../../output/pride3d/cover'));

const COVERS = [
  { name: '封面_横版_1920x1080', w: 1920, h: 1080, t: 17.5, cam: null, layout: 'wide' },
  { name: '封面_竖版_1080x1440', w: 1080, h: 1440, t: 17.5, cam: { pos: [0, -0.05, 7.4], target: [0, -0.62, 0], fov: 35 }, layout: 'tall' },
  { name: '封面_竖版_1080x1350', w: 1080, h: 1350, t: 17.5, cam: { pos: [0, -0.05, 7.4], target: [0, -0.62, 0], fov: 35 }, layout: 'tall' },
];

async function compose(page, c) {
  return page.evaluate(async c => {
    const { K } = window;
    const T = await import('./src/text.js');
    const THREE = K.THREE;
    // 改画布与渲染尺寸
    const out = document.getElementById('out'); out.width = c.w; out.height = c.h;
    K.renderer.setSize(c.w, c.h, false); K.composer.setSize(c.w, c.h);
    K.camera.aspect = c.w / c.h; K.final.uniforms.uRes.value.set(c.w, c.h);
    // 竖版另设镜头（在后期之前改相机，并重新让公告板朝向相机）
    window.DBG = c.cam ? (K) => {
      const cam = K.camera;
      cam.position.set(...c.cam.pos); cam.up.set(0, 1, 0); cam.lookAt(new THREE.Vector3(...c.cam.target));
      cam.fov = c.cam.fov; cam.updateProjectionMatrix(); cam.updateMatrixWorld();
      const q = new THREE.Quaternion(); cam.getWorldQuaternion(q);
      for (const g of K.glows) if (g.userData.billboard && g.visible) { const pq = new THREE.Quaternion(); g.parent.getWorldQuaternion(pq); g.quaternion.copy(pq.invert().multiply(q)); }
    } : null;
    window.render(c.t);
    window.DBG = null;
    const ctx = out.getContext('2d');
    ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = 1;
    // 片中噪点只铺到 1920×1080，竖版下方补一层同强度的噪点
    if (c.h > 1080) {
      const g = document.createElement('canvas'); g.width = c.w / 2; g.height = (c.h - 1080) / 2;
      const gx = g.getContext('2d'), im = gx.createImageData(g.width, g.height);
      for (let i = 0; i < g.width * g.height; i++) { const v = Math.random() * 255 | 0; im.data[i * 4] = im.data[i * 4 + 1] = im.data[i * 4 + 2] = v; im.data[i * 4 + 3] = 255; }
      gx.putImageData(im, 0, 0);
      ctx.save(); ctx.globalAlpha = 0.04; ctx.drawImage(g, 0, 1080, c.w, c.h - 1080); ctx.restore();
    }
    T.setCtx(ctx, 0);
    const { glowText, fs, C } = T;
    // 文字背后压暗，保证可读
    const shade = (x, y, rx, ry, a) => {
      ctx.save(); ctx.translate(x, y); ctx.scale(rx, ry);
      const g = ctx.createRadialGradient(0, 0, 0, 0, 0, 1);
      g.addColorStop(0, `rgba(12,4,28,${a})`); g.addColorStop(1, 'rgba(12,4,28,0)');
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, 1, 0, Math.PI * 2); ctx.fill(); ctx.restore();
    };
    const metal = (s, x, y, size, align = 'center') =>
      glowText(s, x, y, fs(900, size), 'metal', { size, glow: 50, glow2: 90, glowColor: '#8B3DFF', sweep: false, align });
    if (c.layout === 'wide') {
      shade(520, 560, 620, 460, 0.55);
      glowText('七  宗  罪  ·  第  一  集', 520, 250, fs(600, 38), C.key, { glow: 14, align: 'center' });
      metal('傲慢', 520, 450, 280);
      glowText('为什么，几乎没有人', 520, 690, fs(700, 64), C.white, { glow: 22 });
      glowText('觉得自己傲慢？', 520, 790, fs(700, 64), C.key, { glow: 30, glowColor: '#8B3DFF' });
    } else {
      const dy = c.h - 1440; // 底部文字块随画面高度整体上移
      shade(540, 1160 + dy, 680, 380, 0.8);
      glowText('七  宗  罪  ·  第  一  集', 540, 92, fs(600, 40), C.key, { glow: 14 });
      metal('傲慢', 540, 1080 + dy, 240);
      glowText('为什么，几乎没有人', 540, 1250 + dy, fs(700, 58), C.white, { glow: 22 });
      glowText('觉得自己傲慢？', 540, 1335 + dy, fs(700, 58), C.key, { glow: 30, glowColor: '#8B3DFF' });
    }
    return out.toDataURL('image/jpeg', 0.95);
  }, c);
}

(async () => {
  fs.mkdirSync(outDir, { recursive: true });
  const { srv, url } = await serve(path.join(__dirname, '..'));
  const browser = await chromium.launch({ args: GL_ARGS });
  const errors = [];
  for (const c of COVERS) {
    // 每张封面用新页面，避免上一张改过的尺寸残留
    const page = await browser.newPage({ viewport: { width: 1920, height: 1440 }, deviceScaleFactor: 1 });
    page.on('pageerror', e => errors.push(String(e)));
    await page.goto(url + '/index.html');
    await page.evaluate(() => document.fonts.ready);
    await page.waitForFunction(() => window.READY === true || window.FAILED, null, { timeout: 120000 });
    const failed = await page.evaluate(() => window.FAILED);
    if (failed) throw new Error(failed);
    const data = await compose(page, c);
    const file = path.join(outDir, c.name + '.jpg');
    fs.writeFileSync(file, Buffer.from(data.split(',')[1], 'base64'));
    console.log(file);
    await page.close();
  }
  await browser.close(); srv.close();
  if (errors.length) { console.error('页面错误：\n' + errors.join('\n')); process.exit(1); }
})();
