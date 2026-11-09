// 对拍检查：node sync_check.js <动物>   每个画面事件到最近拍点（实测起音的十六分音符网格）的距离，误差必须 < 0.04 秒
const fs = require('fs'), path = require('path');
const ep = process.argv[2] || 'wolf';
const dir = path.resolve(__dirname, '../../output/beast', ep);
const ev = JSON.parse(fs.readFileSync(path.join(dir, `${ep}_觉醒_events.json`)));
const bt = JSON.parse(fs.readFileSync(path.join(__dirname, 'beats.json')));
const q = bt.beat / 4, a0 = bt.awake_attack, bar = 2 * bt.beat;   // 一拍（八分音符）= beat/2；一小节 = 4 拍
let worst = 0; const rows = [];
for (const e of ev.events) {
  const k = Math.round((e.t - a0) / q), d = Math.abs(a0 + k * q - e.t); worst = Math.max(worst, d);
  const onBar = Math.abs(((e.t - a0) / bar) - Math.round((e.t - a0) / bar)) * bar < 0.04;
  rows.push(`| ${e.t.toFixed(3)} | ${Math.round(e.t * 30)} | ${(d * 1000).toFixed(0)} ms | ${onBar ? '小节第一拍' : ''} | ${e.name} |`);
}
const out = `# ${ep} 对拍检查\n\nT_REVEAL = ${ev.T_REVEAL.toFixed(3)} 秒（第 ${Math.round(ev.T_REVEAL * 30)} 帧），T_AWAKE = ${ev.T_AWAKE.toFixed(3)} 秒（第 ${ev.T_AWAKE_frame} 帧），成片 ${ev.clip.toFixed(2)} 秒\n\n| 时间（秒） | 帧 | 离拍点 | | 事件 |\n|---|---|---|---|---|\n${rows.join('\n')}\n\n最大误差 ${(worst * 1000).toFixed(0)} ms ${worst < 0.04 ? '✓' : '✗'}\n`;
fs.writeFileSync(path.join(dir, 'sync_check.md'), out); console.log(out);
process.exit(worst < 0.04 ? 0 : 1);
