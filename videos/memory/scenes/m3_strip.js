// 第三幕 · 16.0–22.6 秒：「因为记忆不是录像。」
//   一条胶片从右边走进来，像录像一样匀速放过去，然后减速停住。
//   停住后才看清：五格不是同一个画面。第 1 格是照片里的那天（晴天、藏青、孩子在窗边），
//   一格一格漂移，到第 N 格变成你现在记得的样子（下雨、红衣、孩子在沙发前）。
//   每格上方：「第 1 次想起」…「第 N 次想起」；亮光从左往右一格格走过，最后停在第 N 格。
const L = require('../lib');
const { W, H, FONT, rng, noise1, lerp, clamp, prog, smooth } = L;

const S = { start: 16.0, end: 24.0 };
const IN0 = 16.0, STOP = 18.4, LAB = 18.5, PASS = 19.9;
const N = 5, FW = 352, FH = FW * 9 / 16, PITCH = 380, Y = 520;
const KS = [0, 0.22, 0.45, 0.72, 1];
const NAMES = ['第 1 次想起', '第 2 次想起', '第 3 次想起', '第 7 次想起', '第 N 次想起'];

const ease = (k) => 1 - Math.pow(1 - k, 3);
function offset(d) { return 2300 * (1 - ease(prog(d, IN0, STOP))); }
function speed(d) { return (offset(d - 1 / 30) - offset(d)) * 30; }
// 第 i 格什么时候被「照亮」
function focus(d) { return clamp((d - PASS) / 0.55, -1, N - 1); }

function strip(ctx, d, dx) {
  const x0 = W / 2 - (N - 1) / 2 * PITCH + dx;
  const left = x0 - PITCH * 1.6, right = x0 + PITCH * (N + 0.6);
  // 片基
  ctx.fillStyle = '#17130f';
  ctx.fillRect(left, Y - FH / 2 - 54, right - left, FH + 108);
  // 齿孔
  ctx.fillStyle = 'rgba(64,56,46,0.9)';
  for (let x = left + 10; x < right; x += 36) {
    ctx.beginPath(); ctx.roundRect(x, Y - FH / 2 - 40, 18, 22, 4); ctx.fill();
    ctx.beginPath(); ctx.roundRect(x, Y + FH / 2 + 18, 18, 22, 4); ctx.fill();
  }
  const f = focus(d);
  for (let i = -1; i <= N; i++) {
    const cx = x0 + i * PITCH;
    if (cx < -FW || cx > W + FW) continue;
    const k = KS[clamp(i, 0, N - 1)];
    const img = L.snapshot(k, k >= 0.5 ? 'memory' : 'photo');
    // 格子很小：单独提亮，保证手机上能看清每格的差别
    ctx.save();
    ctx.filter = 'brightness(1.55) contrast(1.06)';
    ctx.drawImage(img, cx - FW / 2, Y - FH / 2, FW, FH);
    ctx.restore();
    // 两头多出来的格子是暗的（片头 / 片尾）
    let dim = i < 0 || i >= N ? 0.85 : 0;
    // 亮光走过：被照亮的那一格亮，其余压暗
    if (i >= 0 && i < N && d > PASS - 0.3) {
      const on = Math.max(0, 1 - Math.abs(f - i) * 1.2);
      const passed = i < f ? 0.3 : 0.4;
      dim = Math.max(0, passed * (1 - on)) * smooth(prog(d, PASS - 0.3, PASS + 0.2));
      if (i === N - 1) dim *= 1 - smooth(prog(d, PASS + 0.55 * (N - 1) - 0.2, PASS + 0.55 * (N - 1) + 0.3));
    }
    if (dim > 0) { ctx.fillStyle = `rgba(14,11,9,${dim})`; ctx.fillRect(cx - FW / 2, Y - FH / 2, FW, FH); }
    ctx.strokeStyle = 'rgba(0,0,0,0.6)'; ctx.lineWidth = 2;
    ctx.strokeRect(cx - FW / 2, Y - FH / 2, FW, FH);
  }
}

function draw(ctx, d) {
  const a = smooth(prog(d, IN0, IN0 + 0.5)) * (1 - smooth(prog(d, 23.0, 23.55)));
  if (a <= 0) return;
  const dx = offset(d);
  const v = Math.abs(speed(d));
  ctx.save();
  ctx.globalAlpha = a;
  // 走带时的运动模糊：几层错开的半透明
  const blur = clamp(v / 2500, 0, 1);
  if (blur > 0.05) {
    for (let j = 1; j <= 3; j++) {
      ctx.save();
      ctx.globalAlpha = a * 0.22 * blur;
      strip(ctx, d, dx + j * v / 30 / 3);
      ctx.restore();
    }
    ctx.globalAlpha = a * (1 - 0.35 * blur);
  }
  strip(ctx, d, dx);
  ctx.restore();

  // 走带时左上角的「PLAY」：像录像一样回放——停下以后消失
  const pa = a * smooth(prog(d, 16.2, 16.6)) * (1 - smooth(prog(d, 17.9, 18.4)));
  L.label(ctx, '▶  PLAY', W / 2 - (N - 1) / 2 * PITCH - FW / 2, Y - FH / 2 - 92, { size: 30, alpha: pa, align: 'left', font: FONT.enMed, ls: 6 });

  // 每格上方的「第几次想起」
  for (let i = 0; i < N; i++) {
    const la = a * smooth(prog(d, LAB + i * 0.16, LAB + i * 0.16 + 0.4));
    const f = focus(d);
    const lit = i === N - 1 ? smooth(prog(f, N - 1.6, N - 1)) : Math.max(0, 1 - Math.abs(f - i) * 1.2);
    const cx = W / 2 + (i - (N - 1) / 2) * PITCH + dx;
    L.label(ctx, NAMES[i], cx, Y - FH / 2 - 86, { size: 31, alpha: la * (0.7 + 0.3 * lit), color: lit > 0.5 ? '#efe4cc' : '#b8ab94', ls: 3 });
  }
}

function light(d) {
  const f = clamp(focus(d), 0, N - 1);
  const fx = W / 2 + (f - (N - 1) / 2) * PITCH;
  const on = smooth(prog(d, PASS - 0.3, PASS + 0.2));
  return [
    { x: W / 2, y: Y, rx: 1300, ry: 460, i: 1.0 * smooth(prog(d, IN0, IN0 + 0.6)), color: [240, 220, 196] },
    { x: fx, y: Y, rx: 420, ry: 320, i: 0.8 * on, color: [255, 200, 140] },
  ];
}
function grade() { return { warm: 0.1, ambient: 0.3 }; }

module.exports = { ...S, draw, light, grade };
