// 第十二 / 十三幕 · 85.8–91.6 秒：生活例子二、三。
//   关系（手机侧光）：夜里，手机的光照着他的侧脸。聊天停在对方最后一句「嗯」，之后再没有消息。
//     87.7 一句话像打字一样出现：不会有人喜欢我。——然后一点点变淡、散开：这是解释，不是事实。
//   工作（较远的办公室）：夜里大半个楼层都暗了，只剩一个工位亮着；屏幕上一份文件，一道红色的错误标记。
//     他停在那里不动。90.4 空荡荡的办公室上方浮出：我什么都做不好。
//     91.2 起红色错误标记被拉长，交给下一幕成为红铅笔线。
const { W, H } = require('../../../src/config');
const { FONT } = require('../../../src/lib/style');
const { prog, smooth, lerp, rng, noise1, easeInOut } = require('../../../src/lib/util');
const { withCam, toScreen, smoothPath } = require('../lib');
const { person } = require('../people');
const { roundRect } = require('../phone');
const { BADGE } = require('./p10_explain');

// ================= 关系 =================
const REL = { start: 85.75, end: 88.9 };
const PH = { x: 1300, y: 560, w: 250, h: 500, rot: 0.16 };   // 手机（画面坐标）
const FACE = { x: 760, y: 1240, u: 1050 };                   // 一个很近的侧影（只看到头和肩）

function relDraw(ctx, t) {
  const a = smooth(prog(t, 85.8, 86.1)) * (1 - smooth(prog(t, 88.55, 88.9)));
  ctx.save();
  ctx.globalAlpha *= a;
  ctx.fillStyle = '#15171b';
  ctx.fillRect(0, 0, W, H);
  const push = 1 + 0.03 * prog(t, 85.8, 88.9);
  ctx.translate(W / 2, H / 2); ctx.scale(push, push); ctx.translate(-W / 2, -H / 2);
  person(ctx, FACE.x, FACE.y, FACE.u, { sit: true, face: -1, lean: 0.12, hd: 0.32 + Math.sin(t * 0.7) * 0.01, arms: { near: [0.2, 0.3], far: [0.2, 0.3] },
    top: '#2c333c', bottom: '#202226', hair: '#0f0c0a', hairStyle: 'short', skin: '#6e5242', light: 0, rim: 0.7, rimCol: [200, 218, 246] });
  // 手机：屏幕朝着他，镜头只看到一点点屏幕
  ctx.save();
  ctx.translate(PH.x, PH.y); ctx.rotate(PH.rot);
  ctx.fillStyle = '#0c0d0f';
  roundRect(ctx, -PH.w / 2, -PH.h / 2, PH.w, PH.h, 30); ctx.fill();
  // 手
  ctx.fillStyle = '#5a4234';
  smoothPath(ctx, [[PH.w * 0.1, PH.h * 0.2], [PH.w * 0.55, PH.h * 0.1], [PH.w * 0.7, PH.h * 0.5], [PH.w * 0.3, PH.h * 0.7], [-PH.w * 0.2, PH.h * 0.55]]);
  ctx.fill();
  ctx.restore();
  ctx.restore();
}
function relOver(ctx, t) {
  const a = smooth(prog(t, 85.8, 86.1)) * (1 - smooth(prog(t, 88.55, 88.9)));
  ctx.save();
  ctx.globalAlpha *= a;
  const push = 1 + 0.03 * prog(t, 85.8, 88.9);
  ctx.translate(W / 2, H / 2); ctx.scale(push, push); ctx.translate(-W / 2, -H / 2);
  // 发光的屏幕：对方最后一句「嗯」，之后什么都没有
  ctx.save();
  ctx.translate(PH.x, PH.y); ctx.rotate(PH.rot);
  roundRect(ctx, -PH.w / 2 + 10, -PH.h / 2 + 10, PH.w - 20, PH.h - 20, 22); ctx.clip();
  ctx.fillStyle = '#c9d4e2';
  ctx.fillRect(-PH.w / 2, -PH.h / 2, PH.w, PH.h);
  ctx.fillStyle = '#2a3038'; ctx.font = FONT.body(22); ctx.textAlign = 'center';
  ctx.fillText('Y', 0, -PH.h / 2 + 52);
  ctx.textAlign = 'left';
  ctx.fillStyle = 'rgba(40,46,56,0.18)'; roundRect(ctx, -PH.w / 2 + 22, -PH.h / 2 + 110, 150, 46, 18); ctx.fill();
  ctx.fillStyle = 'rgba(40,46,56,0.18)'; roundRect(ctx, -PH.w / 2 + 70, -PH.h / 2 + 176, 150, 46, 18); ctx.fill();
  ctx.fillStyle = 'rgba(40,46,56,0.22)'; roundRect(ctx, -PH.w / 2 + 22, -PH.h / 2 + 242, 66, 46, 18); ctx.fill();
  ctx.fillStyle = '#2a3038'; ctx.font = FONT.body(24); ctx.fillText('嗯', -PH.w / 2 + 42, -PH.h / 2 + 274);
  ctx.fillStyle = 'rgba(40,46,56,0.45)'; ctx.font = FONT.body(14); ctx.fillText('三天前', -PH.w / 2 + 22, -PH.h / 2 + 312);
  ctx.restore();
  // 上一幕飞来的红点：落在手机角上，很快熄掉
  const d = 1 - smooth(prog(t, 86.15, 86.6));
  if (d > 0) { ctx.fillStyle = `rgba(184,53,42,${d})`; ctx.beginPath(); ctx.arc(BADGE[0], BADGE[1], 9, 0, Math.PI * 2); ctx.fill(); }
  // 念头：打出来，然后变淡、散开
  const k = prog(t, 87.7, 88.15);
  if (k > 0) {
    const fade = smooth(prog(t, 88.2, 88.85));
    const str = '不会有人喜欢我';
    const shown = [...str].slice(0, Math.ceil(k * str.length)).join('');
    ctx.save();
    ctx.globalAlpha *= 0.92 * (1 - fade * 0.85);
    ctx.filter = fade > 0.02 ? `blur(${(fade * 7).toFixed(1)}px)` : 'none';
    ctx.font = FONT.hand(80);
    ctx.fillStyle = '#dfe6f0';
    ctx.shadowColor = 'rgba(0,0,0,0.6)'; ctx.shadowBlur = 12;
    ctx.fillText(shown, 260 - fade * 30, 300 - fade * 20);
    ctx.restore();
  }
  ctx.restore();
}
function relLight(t) {
  const w = smooth(prog(t, 85.8, 86.1)) * (1 - smooth(prog(t, 88.55, 88.9)));
  return [
    { x: PH.x - 60, y: PH.y - 40, rx: 640, ry: 620, i: 1, w, color: [200, 216, 244], core: 0.25 },
    { x: 860, y: 520, rx: 420, ry: 460, i: 0.45, w, color: [190, 206, 236] },
  ];
}
const relation = { ...REL, draw: relDraw, drawOver: relOver, light: relLight, grade: () => ({ warm: -0.5, ambient: 0.07 }) };

// ================= 工作 =================
const WRK = { start: 88.55, end: 91.75 };
const DESK = { x: 640, y: 690 };
const ERR_T = 89.2;
const cam = (t) => ({ cx: 980 - (t - 88.6) * 6, cy: 540, s: 1.0 + (t - 88.6) * 0.008 });

function office(ctx, t) {
  ctx.fillStyle = '#1e2124';
  ctx.fillRect(-300, -300, W + 600, H + 600);
  // 后面一整排落地窗：夜里的城市
  ctx.fillStyle = '#161a22';
  ctx.fillRect(-200, 120, W + 400, 380);
  const r = rng(1313);
  for (let i = 0; i < 160; i++) { ctx.fillStyle = `rgba(${r() < 0.6 ? '255,206,150' : '186,202,230'},${0.12 + r() * 0.3})`; ctx.fillRect(-200 + r() * (W + 400), 260 + r() * 230, 3, 3); }
  ctx.fillStyle = '#25292d';
  for (let x = -200; x < W + 300; x += 240) ctx.fillRect(x, 120, 12, 380);
  ctx.fillRect(-200, 500, W + 400, 14);
  // 天花板的灯（都关着）
  ctx.fillStyle = '#2a2e32';
  for (let i = 0; i < 6; i++) ctx.fillRect(140 + i * 300, 60, 180, 10);
  // 地面
  ctx.fillStyle = '#191b1d';
  ctx.fillRect(-300, 560, W + 600, H);
  // 一排排的工位（暗的显示器、椅背）
  for (let row = 0; row < 3; row++) {
    const y = 600 + row * 140, sc = 0.7 + row * 0.25;
    for (let i = 0; i < 7; i++) {
      const x = 120 + i * 270 + row * 40;
      if (row === 1 && i === 2) continue;   // 那个亮着的工位单独画
      ctx.fillStyle = '#26292c';
      ctx.fillRect(x - 100 * sc, y, 200 * sc, 12 * sc);
      ctx.fillStyle = '#121416';
      ctx.fillRect(x - 40 * sc, y - 70 * sc, 80 * sc, 56 * sc);
      ctx.fillRect(x - 4 * sc, y - 14 * sc, 8 * sc, 14 * sc);
    }
  }
}
function workstation(ctx, t) {
  const { x, y } = DESK;
  ctx.fillStyle = '#34383b';
  ctx.fillRect(x - 170, y, 340, 16);
  ctx.fillRect(x - 160, y + 16, 10, 120); ctx.fillRect(x + 150, y + 16, 10, 120);
  ctx.fillStyle = '#0e0f10';
  ctx.fillRect(x - 110, y - 130, 170, 108);
  ctx.fillRect(x - 30, y - 22, 12, 22);
  person(ctx, x + 150, y + 30, 165, { sit: true, face: 1, lean: 0.25, hd: 0.15, arms: { near: [0.9, 0.9], far: [0.85, 0.85] },
    top: '#3a4246', bottom: '#202325', hair: '#120e0b', hairStyle: 'short', skin: '#7a5a48', light: Math.PI, rim: 0.5, rimCol: [210, 222, 240] });
}
// 发光的屏幕和红色错误标记
function screen(ctx, t) {
  const { x, y } = DESK;
  ctx.fillStyle = '#d6dce4';
  ctx.fillRect(x - 104, y - 124, 158, 96);
  ctx.fillStyle = 'rgba(40,46,56,0.45)';
  for (let i = 0; i < 7; i++) ctx.fillRect(x - 94, y - 112 + i * 12, i === 3 ? 90 : 128, 4);
  const blink = t > ERR_T ? (Math.floor((t - ERR_T) * 3) % 2 === 0 ? 1 : 0.55) : 0;
  if (blink > 0) { ctx.fillStyle = `rgba(200,40,30,${0.9 * blink})`; ctx.fillRect(x - 96, y - 78, 120, 8); }
}
function thought(ctx, t) {
  const a = smooth(prog(t, 90.4, 90.9)) * (1 - smooth(prog(t, 91.3, 91.7)));
  if (a <= 0) return;
  ctx.save();
  ctx.globalAlpha = a * 0.85;
  ctx.font = FONT.hand(78);
  ctx.textAlign = 'center';
  ctx.fillStyle = '#d6dce4';
  ctx.shadowColor = 'rgba(0,0,0,0.6)'; ctx.shadowBlur = 14;
  ctx.fillText('我什么都做不好', 1180, 330);
  ctx.restore();
}
function wrkDraw(ctx, t) {
  const c = cam(t);
  ctx.save();
  ctx.globalAlpha *= smooth(prog(t, 88.6, 88.95)) * (1 - smooth(prog(t, 91.3, 91.7)));
  withCam(ctx, c, 1, () => { office(ctx, t); workstation(ctx, t); });
  ctx.restore();
}
function wrkOver(ctx, t) {
  const c = cam(t);
  ctx.save();
  ctx.globalAlpha *= smooth(prog(t, 88.6, 88.95)) * (1 - smooth(prog(t, 91.3, 91.7)));
  withCam(ctx, c, 1, () => screen(ctx, t));
  thought(ctx, t);
  ctx.restore();
  // 红色错误标记被拉长、移到下一幕第一道红铅笔线的位置
  const k = smooth(prog(t, 91.15, 91.7));
  if (k > 0) {
    const [sx, sy] = toScreen(c, DESK.x - 36, DESK.y - 74);
    const x0 = lerp(sx - 60, STRIKE[0][0], k), x1 = lerp(sx + 60, STRIKE[0][1], k), y = lerp(sy, STRIKE[0][2], k);
    ctx.save();
    ctx.globalAlpha = 1 - smooth(prog(t, 91.6, 91.75));
    ctx.fillStyle = '#b8352a';
    ctx.fillRect(x0, y - lerp(4, 3, k), x1 - x0, lerp(8, 6, k));
    ctx.restore();
  }
}
const STRIKE = [[500, 1060, 420]];   // 下一幕第一道红线（画面坐标：x0, x1, y），与 p14 一致
function wrkLight(t) {
  const c = cam(t);
  const w = smooth(prog(t, 88.6, 88.95)) * (1 - smooth(prog(t, 91.3, 91.7)));
  const [x, y] = toScreen(c, DESK.x - 20, DESK.y - 80);
  return [
    { x, y, rx: 300 * c.s, ry: 260 * c.s, i: 0.95, w, color: [214, 224, 244], core: 0.25 },
    { x: W / 2, y: 320, rx: 1300, ry: 300, i: 0.42, w, color: [170, 186, 214] },
    { x: W / 2, y: 720, rx: 1100, ry: 260, i: 0.22, w, color: [170, 186, 214] },
  ];
}
const work = { ...WRK, draw: wrkDraw, drawOver: wrkOver, light: wrkLight, grade: () => ({ warm: -0.35, ambient: 0.13 }) };

module.exports = { relation, work, STRIKE };
