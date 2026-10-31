// 音画同步检查：node sync_check.js [视频.mp4]
// 1) 从页面读出所有画面事件（抽中 / 变身 / 反转 / 结尾卡 / 结尾）的时间；事件实际落在第 round(t*30) 帧
// 2) 从音乐（music_extended.wav，或给定视频的音轨）里用全频段谱通量找起音（5 毫秒一格，窗长 1024 点）
// 3) 每个事件取 ±0.12 秒内谱通量最大的那一格作为起音，误差 = |事件所在帧的时间 − 起音时间|，要求最大误差 < 0.04 秒
const { spawnSync } = require('child_process');
const path = require('path');
const { openBrowser, openPage } = require('./tools/page');
const FPS = 30, SR = 22050, HOP = 110, WIN = 1024;     // 22.05 kHz，5 毫秒一格

function fft(re, im) {                                    // 原地基 2 FFT
  const n = re.length;
  for (let i = 1, j = 0; i < n; i++) { let bit = n >> 1; for (; j & bit; bit >>= 1) j ^= bit; j ^= bit; if (i < j) { [re[i], re[j]] = [re[j], re[i]]; [im[i], im[j]] = [im[j], im[i]]; } }
  for (let len = 2; len <= n; len <<= 1) {
    const ang = -2 * Math.PI / len, wr = Math.cos(ang), wi = Math.sin(ang);
    for (let i = 0; i < n; i += len) { let cr = 1, ci = 0;
      for (let k = 0; k < len / 2; k++) { const a = i + k, b = a + len / 2, tr = re[b] * cr - im[b] * ci, ti = re[b] * ci + im[b] * cr;
        re[b] = re[a] - tr; im[b] = im[a] - ti; re[a] += tr; im[a] += ti; const nr = cr * wr - ci * wi; ci = cr * wi + ci * wr; cr = nr; } }
  }
}
function onsetEnvelope(file) {
  const r = spawnSync('ffmpeg', ['-v', 'error', '-i', file, '-ac', '1', '-ar', String(SR), '-f', 's16le', '-'], { maxBuffer: 1 << 30 });
  if (r.status !== 0) throw new Error(String(r.stderr));
  const pcm = new Int16Array(r.stdout.buffer, r.stdout.byteOffset, r.stdout.length >> 1);
  const n = Math.floor((pcm.length - WIN) / HOP), d = new Float64Array(n), hann = Float64Array.from({ length: WIN }, (_, i) => 0.5 - 0.5 * Math.cos(2 * Math.PI * i / WIN));
  let prev = null; const re = new Float64Array(WIN), im = new Float64Array(WIN);
  for (let k = 0; k < n; k++) {
    for (let i = 0; i < WIN; i++) { re[i] = pcm[k * HOP + i] * hann[i]; im[i] = 0; }
    fft(re, im);
    const mag = new Float64Array(WIN / 2); for (let i = 0; i < WIN / 2; i++) mag[i] = Math.log(1 + Math.hypot(re[i], im[i]));
    if (prev) { let s = 0; for (let i = 0; i < WIN / 2; i++) s += Math.max(0, mag[i] - prev[i]); d[k] = s; }
    prev = mag;
  }
  return d;
}

(async () => {
  const file = process.argv[2] || path.join(__dirname, 'music_extended.wav');
  const { srv, url, browser } = await openBrowser();
  const page = await openPage(browser, url, false, []);
  const events = await page.evaluate(() => window.META.events);
  await browser.close(); srv.close();
  const d = onsetEnvelope(file), dt = HOP / SR;
  let worst = 0; const rows = [];
  for (const ev of events) {
    const tf = Math.round(ev.t * FPS) / FPS;              // 事件实际出现的那一帧
    const k0 = Math.max(0, Math.floor((ev.t - 0.12) / dt)), k1 = Math.min(d.length - 1, Math.ceil((ev.t + 0.12) / dt));
    let best = k0; for (let k = k0; k <= k1; k++) if (d[k] > d[best]) best = k;
    const onset = best * dt + WIN / 2 / SR, err = Math.abs(tf - onset);   // 窗的中心对应的时刻
    worst = Math.max(worst, err);
    rows.push(`${ev.name.padEnd(14, '　')} 画面 ${tf.toFixed(3)}s  鼓点 ${onset.toFixed(3)}s  误差 ${(err * 1000).toFixed(0)} ms`);
  }
  console.log(rows.join('\n'));
  console.log(`[${worst < 0.04 ? '通过' : '失败'}] 最大误差 ${(worst * 1000).toFixed(0)} ms（上限 40 ms），共 ${events.length} 个事件`);
  process.exit(worst < 0.04 ? 0 : 1);
})().catch(e => { console.error(e); process.exit(2); });
