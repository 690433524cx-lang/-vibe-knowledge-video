// 卡面插画：node tools/card_art.js  → assets/cards/art_<类型>.png（程序化动物库里有的动物）
const fs = require('fs'), path = require('path');
const { openBrowser, openPage, grab } = require('./page');
const NT = '#A24BFF', NF = '#2BE36B', SJ = '#3AA8FF', SP = '#FFC23D';
const LIST = [['INTJ', 'sil_crow', NT, -50, 10, 0.55], ['ENTJ', 'sil_bear', NT, -50, 8, 1.4], ['ENTP', 'sil_fox', NT, -55, 8], ['ENFJ', 'sil_dog', NF, -55, 8, 1.3],
  ['ISFJ', 'sil_deer', SJ, -55, 6, 2.0], ['ESTJ', 'sil_lion', SJ, -50, 8, 2.0], ['ESFJ', 'sil_horse', SJ, -55, 6, 2.0], ['ISTP', 'sil_cat', SP, -55, 10, 0.8], ['ESTP', 'sil_cheetah', SP, -55, 8]];
(async () => {
  const out = path.resolve(__dirname, '../assets/cards'); fs.mkdirSync(out, { recursive: true });
  const { srv, url, browser } = await openBrowser();
  for (const [type, model, col, yaw, pitch, k = 1] of LIST) {
    const page = await openPage(browser, url, `mode=art&model=${model}&color=${encodeURIComponent(col)}&yaw=${yaw}&pitch=${pitch}&k=${k}`);
    fs.writeFileSync(path.join(out, `art_${type}.png`), await grab(page)); await page.close(); console.log(type, model);
  }
  await browser.close(); srv.close();
})().catch(e => { console.error(e); process.exit(1); });
