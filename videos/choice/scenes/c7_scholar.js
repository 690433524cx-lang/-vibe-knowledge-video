// 人物档案（第七幕 Barry Schwartz / 第十一幕 Herbert Simon）：纪录片式的人物介绍。
// 一张真实照片的冲印件，约占画面 40%，被画面边缘裁掉一部分；另一侧留黑，排版有明确层级：
//   姓名（大）→ 身份（斜体）→ 著作 / 年份 → 一句极短的中文概括；照片白边上印着署名。
// 照片放在 assets/portraits/<file>.jpg（或 .png）。授权与来源见 docs/choice/sources.md。
// 照片缺失时显示一个明确标注「待导入」的相片位，不用剪影、不伪造人像。
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const { createCanvas } = require('@napi-rs/canvas');
const { W, H } = require('../../../src/config');
const { FONT } = require('../../../src/lib/style');
const { prog, smooth, lerp } = require('../../../src/lib/util');
const { spring } = require('../../../src/lib/motion');
const { silverGrain, inkText, sheetTexture } = require('../../../src/lib/material');

const PORTRAIT_DIR = path.join(__dirname, '../../../assets/portraits');
const PW = 780, PH = 1000;     // 冲印件尺寸（含白边）
const BORDER = 22;

// 同步解码（用 ffmpeg 转成 RGBA），渲染器是逐帧同步的
function loadPhoto(file) {
  for (const ext of ['.jpg', '.jpeg', '.png', '.webp']) {
    const p = path.join(PORTRAIT_DIR, file + ext);
    if (!fs.existsSync(p)) continue;
    const [w, h] = execFileSync('ffprobe', ['-v', 'error', '-select_streams', 'v:0', '-show_entries', 'stream=width,height', '-of', 'csv=p=0', p])
      .toString().trim().split(',').map(Number);
    const raw = execFileSync('ffmpeg', ['-v', 'error', '-i', p, '-frames:v', '1', '-f', 'rawvideo', '-pix_fmt', 'rgba', '-'], { maxBuffer: 1 << 28 });
    const c = createCanvas(w, h);
    const x = c.getContext('2d');
    const img = x.createImageData(w, h);
    img.data.set(raw.subarray(0, w * h * 4));
    x.putImageData(img, 0, 0);
    return c;
  }
  return null;
}

// 把原始照片重新冲印：裁切 → 黑白低饱和 → 侧光 → 银盐颗粒 → 暗角 → 白边与署名
function makePrint(o) {
  const c = createCanvas(PW, PH);
  const x = c.getContext('2d');
  const paper = sheetTexture(PW, PH, o.seed, 'bone', { rough: 1 });
  x.drawImage(paper.canvas, -paper.pad, -paper.pad);
  const iw = PW - BORDER * 2, ih = PH - BORDER * 2 - 46;
  const img = loadPhoto(o.file);
  x.save();
  x.beginPath(); x.rect(BORDER, BORDER, iw, ih); x.clip();
  if (img) {
    // 按焦点裁切（cover）
    const [fx, fy] = o.focus || [0.5, 0.4];
    const zoom = o.zoom || 1;
    const s = Math.max(iw / img.width, ih / img.height) * zoom;
    const dw = img.width * s, dh = img.height * s;
    const dx = BORDER + iw / 2 - dw * fx, dy = BORDER + ih / 2 - dh * fy;
    x.filter = 'grayscale(1) contrast(1.12) brightness(1.04)';
    x.drawImage(img, Math.min(BORDER, Math.max(BORDER + iw - dw, dx)), Math.min(BORDER, Math.max(BORDER + ih - dh, dy)), dw, dh);
    x.filter = 'none';
    // 极轻的暖调（像放久了的银盐相纸）
    x.globalCompositeOperation = 'soft-light';
    x.fillStyle = 'rgba(255,214,170,0.22)';
    x.fillRect(BORDER, BORDER, iw, ih);
    x.globalCompositeOperation = 'source-over';
    // 侧光：一侧亮，一侧沉进黑暗
    const lit = o.litSide || 1;
    const g = x.createLinearGradient(lit > 0 ? BORDER + iw : BORDER, 0, lit > 0 ? BORDER : BORDER + iw, 0);
    g.addColorStop(0, 'rgba(0,0,0,0)');
    g.addColorStop(0.55, 'rgba(0,0,0,0.12)');
    g.addColorStop(1, 'rgba(0,0,0,0.55)');
    x.fillStyle = g;
    x.fillRect(BORDER, BORDER, iw, ih);
    silverGrain(x, BORDER, BORDER, iw, ih, 0.8, o.seed);
    const vg = x.createRadialGradient(BORDER + iw * 0.5, BORDER + ih * 0.42, ih * 0.25, BORDER + iw * 0.5, BORDER + ih * 0.42, ih * 0.8);
    vg.addColorStop(0, 'rgba(0,0,0,0)');
    vg.addColorStop(1, 'rgba(0,0,0,0.4)');
    x.fillStyle = vg;
    x.fillRect(BORDER, BORDER, iw, ih);
  } else {
    // 相片位：照片到位前的占位，明确标注
    x.fillStyle = '#26221e';
    x.fillRect(BORDER, BORDER, iw, ih);
    silverGrain(x, BORDER, BORDER, iw, ih, 0.5, o.seed);
    x.strokeStyle = 'rgba(214,198,172,0.35)';
    x.lineWidth = 1;
    x.strokeRect(BORDER + 30, BORDER + 30, iw - 60, ih - 60);
    x.textAlign = 'center';
    x.fillStyle = 'rgba(214,198,172,0.6)';
    x.font = FONT.en(30);
    x.letterSpacing = '10px';
    x.fillText('PORTRAIT', BORDER + iw / 2, BORDER + ih / 2 - 10);
    x.font = FONT.body(26);
    x.letterSpacing = '4px';
    x.fillText('授权照片待导入', BORDER + iw / 2, BORDER + ih / 2 + 36);
  }
  x.restore();
  // 白边上的署名
  if (img && o.credit) {
    x.font = FONT.enItalic(19);
    x.fillStyle = 'rgba(70,58,48,0.8)';
    x.fillText(o.credit, BORDER + 4, PH - BORDER - 12);
  }
  return { canvas: c, hasPhoto: !!img };
}

function dossier(o) {
  const { start, end, side } = o;
  const print = makePrint(o);
  const S = { start, end };
  const inK = (t) => spring(t, start, 0.95, 1.0);   // 档案：慢，但不拖
  const outK = (t) => smooth(prog(t, end - 0.5, end));
  const draw = (ctx, t) => {
    const k = Math.min(1, inK(t)), out = outK(t);
    ctx.save();
    ctx.globalAlpha *= 1 - out;
    // 冲印件：从画面外滑进来，靠画面边缘裁切，略微倾斜
    const tx = side === 'left' ? lerp(-PW / 2, PW / 2 - 70, k) - out * 80 : lerp(W + PW / 2, W - PW / 2 + 70, k) + out * 80;
    const push = 1 + 0.025 * prog(t, start, end);
    ctx.save();
    ctx.translate(tx, H / 2 + 6);
    ctx.rotate(side === 'left' ? -0.012 : 0.012);
    ctx.scale(push, push);
    ctx.shadowColor = 'rgba(0,0,0,0.6)';
    ctx.shadowBlur = 40; ctx.shadowOffsetX = side === 'left' ? 18 : -18; ctx.shadowOffsetY = 20;
    ctx.drawImage(print.canvas, -PW / 2, -PH / 2);
    ctx.restore();
    // 排版：明确的层级，大量留白
    const x0 = side === 'left' ? 860 : 170;
    const a = (d0) => smooth(prog(t, start + d0, start + d0 + 0.45));
    inkText(ctx, o.name, x0, 420, { font: FONT.enMed(70), color: '#efe6d3', seed: 1701, wear: 0.1, spacing: 6, alpha: a(0.3) });
    inkText(ctx, o.role, x0, 482, { font: FONT.enItalic(38), color: '#cfc3ad', seed: 1702, wear: 0.05, spacing: 1, alpha: a(0.45) });
    ctx.fillStyle = `rgba(200,184,156,${0.6 * a(0.55)})`;
    ctx.fillRect(x0, 528, 80, 1.5);
    inkText(ctx, o.work, x0, 588, { font: FONT.en(30), color: '#d8ccb6', seed: 1703, wear: 0.05, spacing: 6, alpha: a(0.6) });
    inkText(ctx, o.cn, x0, 652, { font: FONT.body(32), color: '#b9ad97', seed: 1704, wear: 0.05, spacing: 3, alpha: a(0.75) });
    ctx.restore();
  };
  const light = (t) => {
    const w = smooth(prog(t, start, start + 0.4)) * (1 - outK(t));
    return [
      // 照片：一盏侧灯，从排版那一侧打过来
      { x: side === 'left' ? 470 : W - 470, y: 470, rx: 640, ry: 700, i: 1, w, color: [240, 226, 204], rot: side === 'left' ? 0.2 : -0.2 },
      { x: side === 'left' ? 1250 : 520, y: 540, rx: 720, ry: 440, i: 0.72, w },
    ];
  };
  const grade = () => ({ warm: 0.05, ambient: 0.1 });
  return { ...S, draw, light, grade, hasPhoto: print.hasPhoto };
}

const schwartz = dossier({
  start: 64.4, end: 68.2, side: 'left', file: 'barry_schwartz', seed: 31, litSide: 1, focus: [0.36, 0.34], zoom: 1.05,
  name: 'BARRY SCHWARTZ', role: 'Psychologist', work: 'THE PARADOX OF CHOICE  ·  2004',
  cn: '讨论过：更多选择，可能带来更多焦虑与后悔。',
  credit: 'Photo: Bill Holsinger-Robinson · CC BY 2.0 · via Wikimedia Commons',
});
const simon = dossier({
  start: 88.4, end: 92.5, side: 'right', file: 'herbert_simon', seed: 47, litSide: -1, focus: [0.56, 0.3], zoom: 1.35,
  name: 'HERBERT A. SIMON', role: 'Economist  ·  Decision Scientist', work: 'SATISFICING  ·  1956',
  cn: '满意解：不求最好，找到足够好的就停下。',
  credit: 'Portrait: Richard Rappaport · CC BY 3.0 · via Wikimedia Commons',
});

module.exports = { schwartz, simon };
