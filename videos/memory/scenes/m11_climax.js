// 第十一幕 · T = 89.6 秒：全片最狠的一句。
//   极暗。背后只有那张被反复改写的照片极淡的残影。
//   T：「而是你后来一遍又一遍，」  T+1.1：「讲给自己的那个版本。」  停留到 94 秒后慢慢淡出。
const L = require('../lib');
const { DESIGN_T } = require('../../../src/config');
const { W, H, lerp, prog, smooth } = L;

const S = { start: DESIGN_T - 0.3, end: DESIGN_T + 5.4 };
const OUT0 = DESIGN_T + 4.4, OUT1 = DESIGN_T + 5.2;

function draw(ctx, d) {
  const out = 1 - smooth(prog(d, OUT0, OUT1));
  // 残影
  const ga = 0.07 * smooth(prog(d, DESIGN_T + 0.3, DESIGN_T + 1.6)) * out;
  if (ga > 0) {
    ctx.save();
    ctx.globalAlpha = ga;
    ctx.filter = 'blur(6px)';
    ctx.drawImage(L.snapshotV('wound3', L.version(1, { cold: 0.84 }), 'memory'), W * 0.21, H * 0.21, W * 0.58, H * 0.58);
    ctx.restore();
  }
}

// 字放在光照之后画：不被压暗，保持暖白
function drawOver(ctx, d) {
  const out = 1 - smooth(prog(d, OUT0, OUT1));
  const a1 = (d >= DESIGN_T ? 1 : 0) * out;
  const a2 = smooth(prog(d, DESIGN_T + 1.1, DESIGN_T + 1.6)) * out;
  L.anchorWord(ctx, '而是你后来一遍又一遍，', { y: 500, size: 88, alpha: a1, spacing: 10, seed: 9 });
  L.anchorWord(ctx, '讲给自己的那个版本。', { y: 640, size: 88, alpha: a2, spacing: 10, seed: 10 });
}

function light(d) {
  return [{ x: W / 2, y: 560, rx: 1000, ry: 420, i: 0.55 * (1 - smooth(prog(d, OUT0, OUT1))), color: [255, 210, 160] }];
}
function grade() { return { warm: 0.1, ambient: 0.2 }; }

module.exports = { ...S, draw, drawOver, light, grade };
