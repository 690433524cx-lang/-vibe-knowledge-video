// 两个新的生活镜头（最终精修版）
//   leave   82.75–88.6  聚会还在：沙发上的人在碰杯、站着的两个人还在大笑。只有他已经站在门口，
//                       一只手往外套袖子里伸，回头看了一眼屋里——最先离开的人。
//                       「很多悲观的人。并不是在预测未来。」「他们是在提前适应失去。」
//   grandma 88.5–96.6   年夜饭，一家人都还在，热气还在冒。他看着桌对面的奶奶。
//                       91.6 起只有奶奶淡下去，椅子空着（他提前痛了一次）；94.6 她又回来了，还在低头夹菜。
//                       「有时候。我们提前想最坏。」「只是因为觉得——提前痛一次。」「真正失去的时候。就不会那么突然。」
const { W, H } = require('../../../src/config');
const { prog, smooth, lerp, easeInOut } = require('../../../src/lib/util');
const { withCam, toScreen } = require('../lib');
const { person } = require('../people');
const party = require('./p1_party');
const ny = require('./p2_newyear');

// ================= 先离开的人 =================
const LV = { start: 82.75, end: 88.65 };
const lvFade = (t) => smooth(prog(t, 82.75, 82.9)) * (1 - smooth(prog(t, 88.45, 88.65)));
const lvCam = (t) => { const k = easeInOut(prog(t, 82.8, 88.6)); return { cx: lerp(900, 800, k), cy: lerp(520, 505, k), s: lerp(1.06, 1.16, k) }; };
const lvOld = (t) => 0.6 + (t - 82.75) * 0.5;      // 屋里的人：第一幕热闹的那几秒
const COAT = party.CAST.find((c) => c.id === 'coat');
function leaver(ctx, t) {
  // 穿外套的动作（第一幕门口那个人的动作，慢一点），87.4 起转向门口
  const pose = COAT.pose(0.2 + (t - 82.75) * 0.32);
  const back = easeInOut(prog(t, 83.6, 84.6)) * (1 - easeInOut(prog(t, 87.2, 87.9)));
  person(ctx, 430, 703, 290, { ...pose, coat: true, face: t < 87.55 ? 1 : -1, hd: lerp(0.18, -0.02, back), lean: 0.03,
    top: '#3c443c', bottom: '#24221f', hair: '#120e0b', hairStyle: 'short', skin: '#86624a', h: 1.0, light: -2.3, rim: 0.45 });
}
const leave = {
  ...LV,
  draw(ctx, t) {
    ctx.save();
    ctx.globalAlpha *= lvFade(t);
    withCam(ctx, lvCam(t), 1, () => {
      party.drawRoom(ctx, lvOld(t), { hero: false, exclude: ['coat', 'snack'] });
      leaver(ctx, t);
    });
    ctx.restore();
  },
  drawOver(ctx, t) {
    ctx.save();
    ctx.globalAlpha *= lvFade(t);
    withCam(ctx, lvCam(t), 1, () => { party.cityLights(ctx, lvOld(t)); party.lampGlow(ctx, lvOld(t)); party.stringGlow(ctx, lvOld(t)); });
    ctx.restore();
  },
  light(t) {
    const c = lvCam(t);
    const [hx, hy] = toScreen(c, 430, 470);
    return [...party.lightsFor(c, lvOld(t), lvFade(t)), { x: hx, y: hy, rx: 260 * c.s, ry: 380 * c.s, i: 0.6, w: lvFade(t), color: [255, 204, 150] }];
  },
  grade: () => ({ warm: 0.5, ambient: 0.15 }),
};

// ================= 奶奶还在 =================
const GM = { start: 88.5, end: 96.65 };
const gmFade = (t) => smooth(prog(t, 88.5, 88.65)) * (1 - smooth(prog(t, 96.45, 96.65)));
const gmOld = (t) => 10.6 + (t - 88.5) * 0.2;       // 很慢：一家人还在吃、还在说话
const gone = (t) => smooth(prog(t, 91.6, 92.5)) * (1 - smooth(prog(t, 94.6, 95.5)));
// 机位：年夜饭原来的机位上，再极慢地推近奶奶和他
const zoom = (t) => lerp(1, 1.12, easeInOut(prog(t, 88.5, 96.6)));
const ZC = [1260, 600];
function zoomed(ctx, t, fn) {
  const z = zoom(t);
  ctx.save();
  ctx.translate(ZC[0], ZC[1]); ctx.scale(z, z); ctx.translate(-ZC[0], -ZC[1]);
  fn();
  ctx.restore();
}
function withOverride(t, fn) {
  const g = gone(t);
  ny.setOverride({ away: (id) => (id === 'grandma' ? g : 0), noChild: true });
  try { return fn(); } finally { ny.setOverride(null); }
}
const grandma = {
  ...GM,
  draw(ctx, t) {
    ctx.save();
    ctx.globalAlpha *= gmFade(t);
    zoomed(ctx, t, () => withOverride(t, () => ny.draw(ctx, gmOld(t), {})));
    ctx.restore();
  },
  drawOver(ctx, t) {
    ctx.save();
    ctx.globalAlpha *= gmFade(t);
    zoomed(ctx, t, () => withOverride(t, () => ny.drawOver(ctx, gmOld(t), {})));
    ctx.restore();
  },
  light(t) {
    const z = zoom(t);
    return ny.light(gmOld(t)).map((l) => ({ ...l, x: ZC[0] + (l.x - ZC[0]) * z, y: ZC[1] + (l.y - ZC[1]) * z, rx: l.rx * z, ry: l.ry * z, w: l.w * gmFade(t) }));
  },
  grade: (t) => ({ ...ny.grade(gmOld(t)), warm: lerp(0.5, 0.36, gone(t)), w: gmFade(t) }),
};

module.exports = { leave, grandma };
