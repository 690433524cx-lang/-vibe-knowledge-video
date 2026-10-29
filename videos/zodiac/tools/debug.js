// 调试：node tools/debug.js <输出1.jpg,输出2.jpg…> <t1,t2…> [JS1|||JS2…] [--preview]
// 例：node tools/debug.js /tmp/a.jpg 16 "DEBUG.cam={pos:[0,1.5,9],tgt:[0,1.2,0]}"
const fs = require('fs');
const { spec, ensureStarmap, openBrowser, openPage, grab } = require('./page');
(async () => {
  const [out, t, js] = process.argv.slice(2);
  const sign = process.env.SIGN || 'leo';
  await ensureStarmap(sign);
  const ctx = await openBrowser(); const errors = [];
  const page = await openPage(ctx, sign, spec(process.argv.includes('--preview')), errors);
  const shots = out.split(',');
  const jss = (js || '').split('|||');
  for (let i = 0; i < shots.length; i++) {
    if (jss[i] || jss[0]) await page.evaluate(jss[i] ?? jss[0]);
    const ts = String(t).split(','); const { jpg, info } = await grab(page, +(ts[i] ?? ts[0]));
    fs.writeFileSync(shots[i], jpg); console.log(shots[i], JSON.stringify(info.face));
  }
  await ctx.browser.close(); ctx.srv.close();
  if (errors.length) console.error([...new Set(errors)].join('\n'));
})().catch(e => { console.error(e); process.exit(1); });
