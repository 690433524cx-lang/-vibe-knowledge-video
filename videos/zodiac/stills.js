// 截取指定时间点的静帧：node stills.js --sign leo [--preview] 14.5 18.0 …（不带时间时截取默认检查清单）
// 输出到 out/stills/<星座名>/t_XX.XX.jpg
const fs = require('fs');
const path = require('path');
const { ROOT, spec, ensureStarmap, loadSign, openBrowser, openPage, grab } = require('./tools/page');

const DEFAULT = [0, 1.5, 3.2, 3.8, 4.8, 6.0, 7.5, 8.2, 9.0, 11.0, 12.8, 13.5, 15.0, 16.5, 18.2, 19.5, 20.5, 21.8, 23.0, 24.6, 24.97];
const argv = process.argv.slice(2);
const opt = k => { const i = argv.indexOf(k); return i >= 0 ? argv[i + 1] : null; };
const sign = opt('--sign') || 'leo', preview = argv.includes('--preview');
const times = argv.filter((a, i) => !a.startsWith('--') && argv[i - 1] !== '--sign' && argv[i - 1] !== '--out').map(Number).filter(Number.isFinite);

(async () => {
  const cfg = loadSign(sign); await ensureStarmap(sign);
  const outDir = path.resolve(opt('--out') || path.join(ROOT, 'out/stills', cfg.name));
  fs.mkdirSync(outDir, { recursive: true });
  const ctx = await openBrowser(); const errors = [];
  const t0 = Date.now();
  const page = await openPage(ctx, sign, spec(preview), errors);
  console.log(`页面就绪，用时 ${((Date.now() - t0) / 1000).toFixed(1)} 秒`);
  for (const t of (times.length ? times : DEFAULT)) {
    const t1 = Date.now();
    const { jpg, info } = await grab(page, t);
    const file = path.join(outDir, `t_${t.toFixed(2).padStart(5, '0')}.jpg`);
    fs.writeFileSync(file, jpg);
    console.log(file, `${Date.now() - t1}ms`, info.boxes.map(b => `${b.id}[${b.x0},${b.y0},${b.x1},${b.y1}]`).join(' '), info.face ? `脸[${info.face.x0},${info.face.y0},${info.face.x1},${info.face.y1}]` : '');
  }
  await ctx.browser.close(); ctx.srv.close();
  if (errors.length) console.error('页面错误：\n' + [...new Set(errors)].join('\n'));
})().catch(e => { console.error(e); process.exit(1); });
