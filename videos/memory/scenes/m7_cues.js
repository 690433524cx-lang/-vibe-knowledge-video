// 第七幕 · 50.4–58.6 秒：一段记忆会被这些东西悄悄改写。
//   左边五张索引卡依次出现，每张用一根细线连到右边那张照片上；
//   每连上一根，照片里就有一个细节被改掉（从照片版一步步走到记忆版）。
const L = require('../lib');
const { W, H, FONT, lerp, clamp, prog, smooth } = L;

const S = { start: 50.3, end: 58.7 };
const ITEMS = ['之后听到的说法', '别人补充的细节', '一张旧照片的暗示', '你当时的情绪', '你后来想相信的版本'];
const T0 = 51.3, STEP = 1.0;
const KS = [0, 0.22, 0.42, 0.62, 0.82, 1];
const CARD = { x: 130, w: 640, h: 88, y0: 250, gap: 116 };
const PH = { x: 1300, y: 470, w: 820 };

function draw(ctx, d) {
  const a = smooth(prog(d, 50.4, 50.9)) * (1 - smooth(prog(d, 58.0, 58.6)));
  if (a <= 0) return;
  // 照片：每连一根线就改一个细节
  let n = 0;
  for (let i = 0; i < 5; i++) if (d >= T0 + i * STEP + 0.6) n = i + 1;
  const prevK = KS[Math.max(0, n - 1)], k = KS[n];
  const mix = n > 0 ? smooth(prog(d, T0 + (n - 1) * STEP + 0.6, T0 + (n - 1) * STEP + 0.95)) : 1;
  ctx.save();
  ctx.globalAlpha = a;
  ctx.translate(PH.x, PH.y);
  ctx.rotate(0.02);
  L.print(ctx, L.snapshot(prevK, 'photo'), PH.w, { border: 18, seed: 41 });
  if (n > 0 && mix > 0) {
    ctx.globalAlpha = a * mix;
    ctx.drawImage(L.snapshot(k, 'photo'), -PH.w / 2, -PH.w * 9 / 32, PH.w, PH.w * 9 / 16);
  }
  ctx.restore();
  // 索引卡 + 细线
  ITEMS.forEach((text, i) => {
    const t = T0 + i * STEP;
    const ca = smooth(prog(d, t, t + 0.35)) * a;
    if (ca <= 0) return;
    const y = CARD.y0 + i * CARD.gap;
    const slide = (1 - L.spring(d, t, 2.4, 0.85)) * -40;
    ctx.save();
    ctx.globalAlpha = ca;
    ctx.translate(slide, 0);
    ctx.fillStyle = '#26201b';
    ctx.shadowColor = 'rgba(0,0,0,0.6)'; ctx.shadowBlur = 20; ctx.shadowOffsetY = 6;
    ctx.fillRect(CARD.x, y - CARD.h / 2, CARD.w, CARD.h);
    ctx.shadowColor = 'transparent';
    ctx.strokeStyle = 'rgba(200,180,150,0.25)'; ctx.lineWidth = 2;
    ctx.strokeRect(CARD.x, y - CARD.h / 2, CARD.w, CARD.h);
    ctx.font = FONT.en(38);
    ctx.fillStyle = i === 4 ? '#b23a2c' : '#a89a84';
    ctx.fillText(String(i + 1), CARD.x + 28, y + 13);
    ctx.font = FONT.body(40);
    ctx.letterSpacing = '3px';
    ctx.fillStyle = '#ece2cd';
    ctx.fillText(text, CARD.x + 80, y + 14);
    ctx.restore();
    // 细线：从卡片右边拉到照片上
    const lk = prog(d, t + 0.3, t + 0.65);
    if (lk > 0) {
      const x0 = CARD.x + CARD.w, x1 = PH.x - PH.w / 2 + 60 + i * 30, y1 = PH.y - 160 + i * 70;
      ctx.save();
      ctx.globalAlpha = a * 0.75;
      ctx.strokeStyle = i === 4 ? 'rgba(178,58,44,0.9)' : 'rgba(232,220,198,0.7)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      const N = 30;
      for (let s = 0; s <= N * lk; s++) {
        const u = s / N;
        const px = lerp(x0, x1, u), py = lerp(y, y1, u) + Math.sin(Math.PI * u) * 26;
        if (s === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
      }
      ctx.stroke();
      ctx.fillStyle = ctx.strokeStyle;
      if (lk >= 1) { ctx.beginPath(); ctx.arc(x1, y1, 5, 0, Math.PI * 2); ctx.fill(); }
      ctx.restore();
    }
  });
}

function light() {
  return [
    { x: 460, y: 480, rx: 620, ry: 560, i: 0.85, color: [240, 214, 180] },
    { x: PH.x, y: PH.y, rx: 760, ry: 560, i: 1.0, color: [246, 210, 168] },
  ];
}
function grade() { return { warm: 0.08, ambient: 0.3 }; }

module.exports = { ...S, draw, light, grade };
