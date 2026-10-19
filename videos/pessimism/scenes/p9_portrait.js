// Martin Seligman · 75.9–81.3 秒：纪录片式的人物出场（不是百科卡片）。
//   左侧约 42% 是一张真实照片：黑白、极低饱和、从文字那一侧打来的侧光，脸是清楚的，不做剪影；
//   照片没有边框，右缘慢慢融进暗处；极慢的推近。右侧大量负空间里只有：
//   MARTIN SELIGMAN / Psychologist / EXPLANATORY STYLE / 一句中文。
// 照片：assets/portraits/martin_seligman.png（或 .jpg / .webp）；同名 .txt 里可以写一行署名，会印在照片角上。
// 照片缺失时显示标注明确的相片位（PORTRAIT · 授权照片待导入），不伪造人像。
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const { createCanvas } = require('@napi-rs/canvas');
const { W, H } = require('../../../src/config');
const { FONT } = require('../../../src/lib/style');
const { prog, smooth, lerp, easeOut } = require('../../../src/lib/util');
const { silverGrain } = require('../../../src/lib/material');

const S = { start: 75.9, end: 81.4 };
const DIR = path.join(__dirname, '../../../assets/portraits');
const PW = Math.round(W * 0.42);
const FOCUS = [0.5, 0.36];    // 裁切焦点（脸大概在照片的哪里），换照片后可微调

function loadPhoto() {
  for (const ext of ['.png', '.jpg', '.jpeg', '.webp']) {
    const p = path.join(DIR, 'martin_seligman' + ext);
    if (!fs.existsSync(p)) continue;
    const [w, h] = execFileSync('ffprobe', ['-v', 'error', '-select_streams', 'v:0', '-show_entries', 'stream=width,height', '-of', 'csv=p=0', p]).toString().trim().split(',').map(Number);
    const raw = execFileSync('ffmpeg', ['-v', 'error', '-i', p, '-frames:v', '1', '-f', 'rawvideo', '-pix_fmt', 'rgba', '-'], { maxBuffer: 1 << 28 });
    const c = createCanvas(w, h);
    const x = c.getContext('2d');
    const img = x.createImageData(w, h);
    img.data.set(raw.subarray(0, w * h * 4));
    x.putImageData(img, 0, 0);
    let credit = '';
    const txt = path.join(DIR, 'martin_seligman.txt');
    if (fs.existsSync(txt)) credit = fs.readFileSync(txt, 'utf8').trim().split('\n')[0];
    return { c, credit };
  }
  return null;
}

// 把照片冲成一块左侧的画面：裁切 → 黑白 → 侧光 → 银盐颗粒 → 右缘融进暗处
const PANEL = (() => {
  const c = createCanvas(PW, H);
  const x = c.getContext('2d');
  const ph = loadPhoto();
  if (ph) {
    const img = ph.c;
    const s = Math.max(PW / img.width, H / img.height) * 1.04;
    const dw = img.width * s, dh = img.height * s;
    const dx = Math.min(0, Math.max(PW - dw, PW / 2 - dw * FOCUS[0]));
    const dy = Math.min(0, Math.max(H - dh, H * 0.42 - dh * FOCUS[1]));
    x.filter = 'grayscale(1) contrast(1.1) brightness(1.05)';
    x.drawImage(img, dx, dy, dw, dh);
    x.filter = 'none';
    x.globalCompositeOperation = 'soft-light';
    x.fillStyle = 'rgba(255,214,170,0.16)';
    x.fillRect(0, 0, PW, H);
    x.globalCompositeOperation = 'source-over';
    // 侧光：从右边（文字那一侧）来，左侧沉一点——但不压到看不清脸
    const g = x.createLinearGradient(PW, 0, 0, 0);
    g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(0.6, 'rgba(0,0,0,0.12)'); g.addColorStop(1, 'rgba(0,0,0,0.42)');
    x.fillStyle = g; x.fillRect(0, 0, PW, H);
    silverGrain(x, 0, 0, PW, H, 0.6, 61);
    if (ph.credit) { x.font = FONT.enItalic(18); x.fillStyle = 'rgba(220,210,190,0.55)'; x.fillText(ph.credit, 28, H - 30); }
  } else {
    x.fillStyle = '#1f1c19';
    x.fillRect(0, 0, PW, H);
    silverGrain(x, 0, 0, PW, H, 0.4, 61);
    x.strokeStyle = 'rgba(214,198,172,0.3)'; x.lineWidth = 1;
    x.strokeRect(60, 80, PW - 120, H - 160);
    x.textAlign = 'center';
    x.fillStyle = 'rgba(214,198,172,0.6)';
    x.font = FONT.en(30); x.letterSpacing = '10px';
    x.fillText('PORTRAIT', PW / 2, H / 2 - 10);
    x.font = FONT.body(26); x.letterSpacing = '4px';
    x.fillText('授权照片待导入', PW / 2, H / 2 + 36);
  }
  // 右缘融进暗处（没有相框）
  x.globalCompositeOperation = 'destination-in';
  const m = x.createLinearGradient(0, 0, PW, 0);
  m.addColorStop(0, 'rgba(0,0,0,1)'); m.addColorStop(0.72, 'rgba(0,0,0,1)'); m.addColorStop(1, 'rgba(0,0,0,0)');
  x.fillStyle = m; x.fillRect(0, 0, PW, H);
  return c;
})();

function draw(ctx, t) {
  const a = smooth(prog(t, S.start, S.start + 0.5)) * (1 - smooth(prog(t, S.end - 0.4, S.end)));
  ctx.save();
  ctx.globalAlpha *= a;
  ctx.fillStyle = '#141210';
  ctx.fillRect(0, 0, W, H);
  const push = lerp(1.0, 1.045, prog(t, S.start, S.end));
  ctx.save();
  ctx.translate(PW * 0.45, H * 0.42);
  ctx.scale(push, push);
  ctx.drawImage(PANEL, -PW * 0.45, -H * 0.42);
  ctx.restore();
  ctx.restore();
}

function drawOver(ctx, t) {
  const base = smooth(prog(t, S.start, S.start + 0.5)) * (1 - smooth(prog(t, S.end - 0.4, S.end)));
  const item = (d0) => { const k = prog(t, S.start + d0, S.start + d0 + 0.5); return { a: smooth(k) * base, y: (1 - easeOut(k)) * 8 }; };
  const X = 960;
  ctx.save();
  ctx.textBaseline = 'alphabetic';
  ctx.shadowColor = 'rgba(0,0,0,0.6)'; ctx.shadowBlur = 10;
  let it = item(0.35);
  ctx.globalAlpha = it.a; ctx.font = FONT.enMed(88); ctx.letterSpacing = '9px'; ctx.fillStyle = '#efe6d3';
  ctx.fillText('MARTIN SELIGMAN', X, 430 + it.y);
  it = item(0.6);
  ctx.globalAlpha = it.a; ctx.font = FONT.enItalic(42); ctx.letterSpacing = '1px'; ctx.fillStyle = '#d4c8b2';
  ctx.fillText('Psychologist', X + 4, 500 + it.y);
  ctx.globalAlpha = it.a; ctx.fillStyle = 'rgba(200,184,156,0.6)'; ctx.fillRect(X + 4, 548, 90, 1.5);
  it = item(0.85);
  ctx.globalAlpha = it.a; ctx.font = FONT.en(32); ctx.letterSpacing = '10px'; ctx.fillStyle = '#d8ccb6';
  ctx.fillText('EXPLANATORY STYLE', X + 4, 612 + it.y);
  it = item(1.15);
  ctx.globalAlpha = it.a; ctx.font = FONT.body(46); ctx.letterSpacing = '5px'; ctx.fillStyle = '#e6dcc8';
  ctx.fillText('他研究人们如何解释失败。', X + 2, 710 + it.y);
  ctx.restore();
}

function light(t) {
  const w = smooth(prog(t, S.start, S.start + 0.5)) * (1 - smooth(prog(t, S.end - 0.4, S.end)));
  return [
    { x: PW * 0.62, y: H * 0.4, rx: 640, ry: 720, i: 1, w, color: [240, 228, 210], core: 0.35 },
    { x: 1350, y: 560, rx: 760, ry: 420, i: 0.55, w, color: [240, 222, 196] },
  ];
}
function grade() { return { warm: 0.05, ambient: 0.12 }; }

module.exports = { ...S, draw, drawOver, light, grade };
