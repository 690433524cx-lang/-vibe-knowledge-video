// 第九幕 · 71.6–81.0 秒：年龄比例（只是其中一层，不是唯一解释）。
//   一个人的侧影站在一圈细细的年轮旁边：8 岁的孩子 → 20 岁 → 30 岁 → 40 岁。
//   年轮上「这一年」那一段越来越窄：1/8、1/20、1/30、1/40 只是一闪，不做成数学课。
//   最后一句「往往不只是年龄」时，年轮淡掉，只剩那一小段光。
const L = require('../lib');
const { W, H, FONT, rng, noise1, lerp, clamp, prog, smooth } = L;
const { pencil, ellipsePts } = require('../../../src/lib/draw');

const S = { start: 71.5, end: 81.3 };
const STAGES = [
  { at: 71.6, age: 8, kind: 'child', h: 430 },
  { at: 74.4, age: 20, kind: 'adult', h: 620 },
  { at: 75.8, age: 30, kind: 'adult', h: 630 },
  { at: 77.1, age: 40, kind: 'adult', h: 625, hair: '#4a4440' },
];
const RC = [1220, 500], RR = 290;

function stageAt(d) {
  let i = 0;
  for (let k = 0; k < STAGES.length; k++) if (d >= STAGES[k].at) i = k;
  return i;
}

function person(ctx, st, a, d) {
  if (a <= 0.01) return;
  L.lit(ctx, (c) => {
    c.translate(640, 880);
    const pal = { ...L.PAL[st.kind], ...(st.hair ? { hair: st.hair } : {}) };
    L.side(c, { h: st.h, kind: st.kind, f: 1, pal, yaw: 1, pose: { torso: 0.02, neck: 0.05, head: 0.02 + Math.sin(d * 0.8) * 0.01, uArmN: 0.06, fArmN: 0.1, uArmF: -0.04, fArmF: 0.05 } });
  }, { light: -0.2, rim: [255, 214, 160], rimA: 0.85, rimW: 4, shadow: 0.5, ambient: 0.85, bbox: [450, 200, 400, 700], alpha: a });
}

function draw(ctx, d) {
  ctx.drawImage(L.wallTex(W, H, [52, 44, 38], 911, { cells: 6 }), 0, 0);
  ctx.fillStyle = '#2a221c';
  ctx.fillRect(0, 880, W, 200);
  const i = stageAt(d);
  const st = STAGES[i];
  const k = smooth(prog(d, st.at, st.at + 0.5));
  // 人物交叉淡化
  if (i > 0 && k < 1) person(ctx, STAGES[i - 1], 1 - k, d);
  person(ctx, st, i > 0 ? k : smooth(prog(d, 71.6, 72.2)), d);
  // 年轮：一圈细铅笔线
  const fade = 1 - smooth(prog(d, 78.4, 79.6));
  const enter = smooth(prog(d, 71.8, 72.6));
  ctx.save();
  ctx.globalAlpha = enter;
  pencil(ctx, ellipsePts(RC[0], RC[1], RR, RR, 0, Math.PI * 2, 120), { t: d, seed: 91, width: 1.6, color: `rgba(220,206,180,${0.55 * fade})`, passes: 1, pressure: 0.6, amp: 0.4 });
  // 这一年：从顶上开始的一段弧，随年龄变窄
  const prev = i > 0 ? STAGES[i - 1].age : st.age;
  const age = lerp(prev, st.age, k);
  const span = (Math.PI * 2) / age;
  ctx.strokeStyle = 'rgba(255,200,130,0.95)';
  ctx.lineWidth = 14;
  ctx.lineCap = 'round';
  ctx.shadowColor = 'rgba(255,190,110,0.8)';
  ctx.shadowBlur = 20;
  ctx.beginPath();
  ctx.arc(RC[0], RC[1], RR, -Math.PI / 2, -Math.PI / 2 + span);
  ctx.stroke();
  ctx.restore();
}

// 数字只是一闪
function drawOver(ctx, d) {
  const i = stageAt(d);
  const st = STAGES[i];
  const a = smooth(prog(d, st.at + 0.3, st.at + 0.6)) * (1 - smooth(prog(d, st.at + 1.1, st.at + 1.4))) * (1 - smooth(prog(d, 78.4, 78.8)));
  if (a <= 0.01) return;
  ctx.save();
  ctx.globalAlpha = a;
  ctx.font = FONT.body(38);
  ctx.letterSpacing = '4px';
  ctx.fillStyle = '#e8dcc4';
  ctx.textAlign = 'left';
  ctx.fillText(`${st.age} 岁`, RC[0] + RR + 50, RC[1] - 40);
  ctx.font = FONT.en(52);
  ctx.fillStyle = '#f0c890';
  ctx.fillText(`1/${st.age}`, RC[0] + RR + 50, RC[1] + 30);
  ctx.restore();
}

function light(d) {
  return [{ x: 900, y: 520, rx: 1200, ry: 760, i: 0.9, core: 0.35 }];
}
function grade(d) { return { warm: 0.25, ambient: 0.35 }; }

module.exports = { ...S, draw, drawOver, light, grade };
