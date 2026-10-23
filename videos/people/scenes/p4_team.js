// 第四幕 · 21.2 秒起：第一种——有东西可以争的时候。先是「没东西可争」的合作。
//   夜里的会议室，四个人围着一张长桌：文件从一个人手里滑到另一个人手里，
//   白板上的便利贴一张张多起来，墙上屏幕的项目进度往前走，有人把电脑转过去给旁边的人看。
//   drawTeam 也给第三幕的第一扇门当门里的画面（同一个空间、同一个时间）。
const { createCanvas } = require('@napi-rs/canvas');
const L = require('../lib');
const { W, H, FONT, lerp, clamp, prog, smooth, noise1, rng, track, spring } = L;
const { mottle } = require('../../../src/lib/material');

const S = { start: 21.45, end: 30.0 };

const PAL = {
  W1: { skin: '#c09676', shirt: '#2f3a48', jacket: '#2f3a48', pants: '#22252a', hair: '#15110e', shoe: '#1a1817' },
  W2: { skin: '#cba083', shirt: '#6a5446', jacket: '#6a5446', pants: '#2a2422', hair: '#1e140e', shoe: '#1c1816' },
  W3: { skin: '#b48a6c', shirt: '#44483f', jacket: '#44483f', pants: '#24231f', hair: '#120e0b', shoe: '#1a1817' },
  W4: { skin: '#bd9374', shirt: '#7c7468', jacket: '#7c7468', pants: '#26241f', hair: '#191310', shoe: '#1a1817' },
};
const TB = { by: 600, bl: 590, br: 1330, fy: 680, fl: 520, fr: 1400, edge: 18 };

let bg = null;
function office() {
  if (bg) return bg;
  const c = createCanvas(W, H), x = c.getContext('2d');
  const g = x.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, '#16191d'); g.addColorStop(0.7, '#1d2024'); g.addColorStop(1, '#121315');
  x.fillStyle = g; x.fillRect(0, 0, W, H);
  mottle(x, W, H, 8, 611, 0.2, [8, 9, 11]);
  // 大窗：城市夜景的光斑（冷）
  x.fillStyle = '#0e1116'; x.fillRect(560, 70, 940, 500);
  const r = rng(612);
  for (let i = 0; i < 70; i++) {
    const cx = 570 + r() * 920, cy = 200 + r() * 360, rr = 4 + r() * 16;
    const gg = x.createRadialGradient(cx, cy, 0, cx, cy, rr);
    gg.addColorStop(0, r() < 0.75 ? `rgba(150,172,204,${0.18 + r() * 0.25})` : `rgba(230,180,110,${0.2 + r() * 0.2})`);
    gg.addColorStop(1, 'rgba(0,0,0,0)');
    x.fillStyle = gg; x.fillRect(cx - rr, cy - rr, rr * 2, rr * 2);
  }
  // 远处的楼
  x.fillStyle = 'rgba(30,36,44,0.9)';
  for (const [bx, bw, bh] of [[600, 120, 260], [760, 90, 330], [900, 160, 220], [1100, 110, 300], [1250, 140, 250], [1400, 90, 310]]) x.fillRect(bx, 570 - bh, bw, bh);
  x.fillStyle = 'rgba(200,190,150,0.18)';
  for (let i = 0; i < 90; i++) x.fillRect(600 + r() * 880, 300 + r() * 260, 4, 5);
  x.strokeStyle = '#25292e'; x.lineWidth = 14; x.strokeRect(560, 70, 940, 500);
  x.lineWidth = 6;
  for (const xx of [795, 1030, 1265]) { x.beginPath(); x.moveTo(xx, 70); x.lineTo(xx, 570); x.stroke(); }
  // 左墙白板（便利贴另外画）
  x.fillStyle = '#2b2e30'; x.fillRect(80, 180, 400, 330);
  x.fillStyle = '#9e9b92'; x.fillRect(92, 192, 376, 306);
  x.strokeStyle = 'rgba(40,40,44,0.5)'; x.lineWidth = 3;
  x.beginPath(); x.moveTo(120, 260); x.lineTo(300, 250); x.moveTo(120, 300); x.lineTo(250, 296); x.stroke();
  x.fillStyle = '#3a3c3e'; x.fillRect(92, 498, 376, 10);
  // 右墙屏幕框
  x.fillStyle = '#0c0d0f'; x.fillRect(1560, 220, 300, 190);
  // 地面
  const fl = x.createLinearGradient(0, 790, 0, H);
  fl.addColorStop(0, '#191a1c'); fl.addColorStop(1, '#0d0e0f');
  x.fillStyle = fl; x.fillRect(0, 790, W, H - 790);
  x.fillStyle = 'rgba(160,180,200,0.05)'; x.fillRect(0, 790, W, 3);
  bg = c;
  return c;
}

// 便利贴：一张张贴上去（d 越大越多）
const NOTES = [16.8, 17.9, 19.1, 20.6, 22.35, 23.55, 24.6, 26.0, 27.2];
function notes(x, d) {
  const cols = ['#c9b56c', '#c78f6a', '#9fb08a', '#c9b56c', '#b8a0c0', '#c78f6a', '#9fb08a', '#c9b56c', '#c78f6a'];
  NOTES.forEach((t0, i) => {
    if (d < t0) return;
    const k = spring(d, t0, 3.2, 0.55);
    const nx = 130 + (i % 4) * 82, ny = 340 + Math.floor(i / 4) * 66 - (i % 2) * 8;
    x.save();
    x.translate(nx, ny);
    x.rotate((i % 3 - 1) * 0.06);
    x.scale(0.4 + 0.6 * k, 0.4 + 0.6 * k);
    x.globalAlpha = clamp(k * 2);
    x.fillStyle = 'rgba(0,0,0,0.25)'; x.fillRect(-26, -22, 56, 52);
    x.fillStyle = cols[i]; x.fillRect(-30, -28, 56, 52);
    x.fillStyle = 'rgba(40,36,30,0.55)'; x.fillRect(-22, -14, 36, 3); x.fillRect(-22, -4, 28, 3);
    x.restore();
  });
}
// 墙上屏幕：项目进度
function progress(d) { return clamp(0.28 + Math.max(0, d - 16) * 0.045, 0, 0.82); }
function screen(x, d) {
  const p = progress(d);
  x.fillStyle = '#1b2430'; x.fillRect(1572, 232, 276, 166);
  x.fillStyle = 'rgba(200,214,230,0.75)';
  x.font = FONT.body(20); x.letterSpacing = '3px'; x.textAlign = 'left';
  x.fillText('项目进度', 1596, 280);
  x.font = FONT.enMed(30);
  x.textAlign = 'right';
  x.fillText(`${Math.round(p * 100)}%`, 1824, 282);
  x.fillStyle = 'rgba(200,214,230,0.15)'; x.fillRect(1596, 316, 228, 16);
  x.fillStyle = '#c9a46a'; x.fillRect(1596, 316, 228 * p, 16);
  x.fillStyle = 'rgba(200,214,230,0.3)';
  for (let i = 0; i < 4; i++) x.fillRect(1596, 350 + i * 10, 80 + ((i * 53) % 120), 4);
}
// 笔记本电脑（侧面）：屏幕背对 / 面向
function laptop(x, cx, cy, f, open = 1, glowA = 1) {
  x.save();
  x.translate(cx, cy);
  x.scale(f, 1);
  x.fillStyle = '#3a3d42'; x.fillRect(-46, -5, 92, 6);
  x.save(); x.translate(-44, -4); x.rotate(-Math.PI / 2 + 0.28 - (1 - open) * 1.2);
  x.fillStyle = '#4a4e54'; x.fillRect(0, -3, 74, 6);
  x.fillStyle = `rgba(190,210,235,${0.55 * glowA})`; x.fillRect(4, 3, 66, 3);
  x.restore();
  x.restore();
}

function tableTop(x) {
  const t = TB;
  const g = x.createLinearGradient(0, t.by, 0, t.fy);
  g.addColorStop(0, '#3b3029'); g.addColorStop(1, '#56463a');
  x.fillStyle = g;
  x.beginPath(); x.moveTo(t.bl, t.by); x.lineTo(t.br, t.by); x.lineTo(t.fr, t.fy); x.lineTo(t.fl, t.fy); x.closePath(); x.fill();
  x.strokeStyle = 'rgba(255,230,200,0.05)'; x.lineWidth = 2;
  for (let i = 1; i < 9; i++) { x.beginPath(); x.moveTo(t.bl + i * 80, t.by); x.lineTo(t.fl + i * 98, t.fy); x.stroke(); }
}
function tableFront(x) {
  const t = TB;
  x.fillStyle = '#2a211b'; x.fillRect(t.fl, t.fy, t.fr - t.fl, t.edge);
  x.fillStyle = 'rgba(255,226,190,0.18)'; x.fillRect(t.fl, t.fy, t.fr - t.fl, 2);
  x.fillStyle = '#1d1712';
  x.fillRect(t.fl + 30, t.fy + t.edge, 18, 112); x.fillRect(t.fr - 48, t.fy + t.edge, 18, 112);
}

// 来回传递的文件夹：每 4.8 秒从 W2 滑到 W3，再滑回来
function folderPos(d) {
  const ph = ((d - 16.9) % 4.8 + 4.8) % 4.8;
  const k = smooth(prog(ph, 0.3, 1.1));
  const dir = Math.floor((d - 16.9) / 4.8) % 2 === 0;
  const x0 = 860, x1 = 1110;
  return { x: dir ? lerp(x0, x1, k) : lerp(x1, x0, k), ph, k, dir };
}

function cast(x, d, layer) {
  const typing = (seed) => Math.sin(d * 13 + seed) * 4;
  const fp = folderPos(d);
  const hand2 = fp.ph < 1.25 && fp.dir ? fp.x - 790 : -0;
  if (layer === 'back') {
    // W2（面向右）、W3（面向左）坐在桌子后面
    const W2pose = {
      h: 580, f: 1, yaw: 1, eye: 1, talk: Math.abs(Math.sin(d * 3)) > 0.8 ? 0.4 : 0,
      pose: { ...L.SEAT, torso: 0.1, neck: 0.05, head: 0.15 + 0.1 * Math.sin(d * 0.7),
        reachN: fp.ph < 1.25 && fp.dir ? [Math.min(hand2, 190), -42] : [70 + typing(1), -44], reachF: [40, -46] },
    };
    const W3pose = {
      h: 580, f: -1, yaw: 1, eye: 1,
      pose: { ...L.SEAT, torso: 0.1, neck: 0.05, head: 0.2,
        reachN: fp.ph < 1.25 && !fp.dir ? [-(Math.min(1150 - fp.x, 190)), -42] : fp.ph < 1.4 && fp.dir && fp.k > 0.6 ? [fp.x - 1150, -42] : [-70 + typing(2), -44], reachF: [-40, -46] },
    };
    for (const [P, hx, key] of [[W2pose, 790, 'W2'], [W3pose, 1150, 'W3']]) {
      L.lit(x, (c) => {
        c.save(); c.beginPath(); c.rect(0, 0, W, TB.by + 1); c.clip();
        c.translate(hx, 660); L.figure(c, { ...P, pal: PAL[key] }); c.restore();
        c.save(); c.beginPath(); c.rect(hx - 260, TB.by, 520, 34); c.clip();
        c.translate(hx, 660); L.figure(c, { ...P, pal: PAL[key] }); c.restore();
      }, { light: -1.5, rim: [210, 224, 240], rimA: 0.6, shadow: 0.4, ambient: 0.95, bbox: [hx - 240, 300, 480, 380] });
    }
    return;
  }
  // W1（左端，面向右）：19.4 转身指白板；W4（右端，面向左）：23.4 把电脑转给 W1 看
  const point = smooth(prog(d, 19.3, 19.7)) * (1 - smooth(prog(d, 20.6, 21.0)));
  const lean = smooth(prog(d, 23.5, 24.0)) * (1 - smooth(prog(d, 25.6, 26.0)));
  const W1 = { h: 640, f: 1, yaw: 1 - 2 * point, eye: 1, talk: point * 0.6,
    pose: { ...L.SEAT, torso: 0.1 + 0.08 * lean, neck: 0.05, head: 0.2 - 0.25 * point, reachN: point > 0.05 ? L.mix([180, -104], [-120, -260], point) : [180 + typing(3), -104], reachF: [160, -100] } };
  const turn = smooth(prog(d, 23.2, 23.6)) * (1 - smooth(prog(d, 25.8, 26.2)));
  const W4 = { h: 640, f: -1, yaw: 1, eye: 1, talk: turn * 0.5,
    pose: { ...L.SEAT, torso: 0.08, neck: 0.05, head: 0.22, reachN: L.mix([-185 + typing(4), -104], [-235, -112], turn), reachF: [-160, -100] } };
  L.lit(x, (c) => { c.save(); c.translate(455, 770); L.figure(c, { ...W1, pal: PAL.W1 }); c.restore(); },
    { light: -0.8, rim: [215, 228, 245], rimA: 0.75, shadow: 0.42, ambient: 1, bbox: [240, 360, 440, 480] });
  L.lit(x, (c) => { c.save(); c.translate(1465, 770); L.figure(c, { ...W4, pal: PAL.W4 }); c.restore(); },
    { light: -2.3, rim: [215, 228, 245], rimA: 0.7, shadow: 0.45, ambient: 0.95, bbox: [1240, 360, 440, 480] });
  return { turn };
}

function drawTeam(x, d) {
  x.drawImage(office(), 0, 0);
  notes(x, d);
  screen(x, d);
  // 吊灯（长条）
  x.fillStyle = '#26282b'; x.fillRect(700, 150, 520, 14);
  x.fillStyle = 'rgba(255,236,206,0.85)'; x.fillRect(708, 164, 504, 4);
  x.strokeStyle = '#26282b'; x.lineWidth = 2; x.beginPath(); x.moveTo(760, 0); x.lineTo(760, 150); x.moveTo(1160, 0); x.lineTo(1160, 150); x.stroke();
  tableTop(x);
  cast(x, d, 'back');
  // 桌上的东西：笔记本、纸、杯子、来回传的文件夹
  const turn = smooth(prog(d, 23.2, 23.6)) * (1 - smooth(prog(d, 25.8, 26.2)));
  laptop(x, 640, 640, 1);
  laptop(x, 1280, 640, lerp(-1, -0.2, turn), 1, 1);
  laptop(x, 860, 612, 1, 1, 0.8);
  laptop(x, 1080, 612, -1, 1, 0.8);
  x.fillStyle = '#d2cbbb';
  x.save(); x.translate(720, 660); x.rotate(-0.05); x.fillRect(-40, -8, 80, 10); x.restore();
  x.fillStyle = '#c9c2b2';
  x.save(); x.translate(1180, 664); x.rotate(0.08); x.fillRect(-36, -8, 70, 10); x.restore();
  L.glass(x, 760, 630, 40, 0);
  const fp = folderPos(d);
  x.fillStyle = 'rgba(0,0,0,0.3)'; x.fillRect(fp.x - 46, 628, 96, 10);
  x.fillStyle = '#b89a62'; x.fillRect(fp.x - 50, 620, 96, 12);
  x.fillStyle = '#e2dccd'; x.fillRect(fp.x - 44, 616, 80, 5);
  cast(x, d, 'front');
  tableFront(x);
}

function cam(d) {
  // 从第三幕推进门的最后一帧（不带镜头）无缝接上，再慢慢横移、推近
  const k = smooth(prog(d, S.start, S.start + 1.2));
  return { cx: 960 + (noise1(d * 0.3, 9) * 10 + (d - S.start) * 6) * k, cy: 540 + 20 * k, s: 1.0 + (d - S.start) * 0.012 * k };
}

function draw(ctx, d) {
  const c = cam(d);
  L.withCam(ctx, c, 1, () => drawTeam(ctx, d));
  // 前景：桌角的一摞文件，散焦
  L.withCam(ctx, c, 1.4, () => {
    L.blurred(ctx, 10, (x) => {
      x.fillStyle = '#3a332c'; x.fillRect(1600, 930, 360, 50);
      x.fillStyle = '#5a5246'; x.fillRect(1610, 920, 340, 12);
      x.fillStyle = '#1e1b18'; x.fillRect(40, 880, 140, 260);
    }, 0.9);
  });
}

// 标题出现时，画面中间压暗一些，让居中的字读得清
function drawOver(ctx, d) {
  const a = smooth(prog(d, 21.4, 21.9)) * (1 - smooth(prog(d, 24.4, 24.9)));
  if (a <= 0) return;
  const g = ctx.createRadialGradient(W / 2, 560, 80, W / 2, 560, 900);
  g.addColorStop(0, `rgba(8,7,6,${0.62 * a})`); g.addColorStop(1, `rgba(8,7,6,${0.25 * a})`);
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
}

// 场景空间的光（第三幕的门也用）
function teamLights(d) {
  const turn = smooth(prog(d, 23.2, 23.6)) * (1 - smooth(prog(d, 25.8, 26.2)));
  return [
    { x: 960, y: 560, rx: 900, ry: 480, i: 1.0, color: [255, 222, 186] },
    { x: 960, y: 470, rx: 420, ry: 240, i: 0.6, color: [255, 222, 186] },
    { x: 520, y: 520, rx: 260, ry: 300, i: 0.7, color: [200, 214, 236] },
    { x: 1420, y: 520, rx: 260, ry: 300, i: 0.65 + 0.15 * turn, color: [200, 214, 236] },
    { x: 1710, y: 320, rx: 260, ry: 200, i: 0.55, color: [170, 196, 230] },
    { x: 280, y: 360, rx: 300, ry: 240, i: 0.4, color: [220, 214, 196] },
  ];
}
function light(d) { return L.camLights(cam(d), teamLights(d)); }
function grade() { return { warm: 0.02, ambient: 0.34 }; }

module.exports = { ...S, draw, drawOver, light, grade, drawTeam, teamLights };
