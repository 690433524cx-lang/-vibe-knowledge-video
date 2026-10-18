// 《悲观主义》视频封面（单独设计，不是视频第 0 帧）。
//   node videos/pessimism/cover.js [out.png]
// 画面：聚会散场后的客厅。桌上还有杯子、盘子、纸巾；门已经关上；一个人坐在沙发一端，只作背景情绪。
// 中央：「悲观主义」四个大字——电影片名感，克制、留白；下方一行很小的副标题。
process.argv.push('--video', 'pessimism');
const fs = require('fs');
const path = require('path');
const { W, H } = require('../../src/config');
const { makeCanvas } = require('../../src/frame');
const { renderFrameV2 } = require('../../src/look2');
const { FONT } = require('../../src/lib/style');
const party = require('./scenes/p1_party');
const { person } = require('./people');
const { withCam, toScreen } = require('./lib');

const CAM = { cx: 1010, cy: 585, s: 1.04 };
const HERO = { x: 1665, y: 640, u: 290 };
const FLAMP = { x: 1790, y: 770 };   // 落地灯（沙发右边），封面的主光

function floorLamp(ctx) {
  ctx.save();
  ctx.translate(FLAMP.x, FLAMP.y);
  ctx.fillStyle = '#1a1612';
  ctx.fillRect(-3, -420, 6, 420);
  ctx.beginPath(); ctx.ellipse(0, 0, 46, 10, 0, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.moveTo(-40, -470); ctx.lineTo(40, -470); ctx.lineTo(64, -390); ctx.lineTo(-64, -390); ctx.closePath();
  ctx.fillStyle = '#6a5a44'; ctx.fill();
  ctx.restore();
}
function floorLampGlow(ctx) {
  ctx.save();
  ctx.translate(FLAMP.x, FLAMP.y - 430);
  const g = ctx.createRadialGradient(0, 0, 0, 0, 0, 90);
  g.addColorStop(0, 'rgba(255,224,170,0.75)'); g.addColorStop(1, 'rgba(255,200,130,0)');
  ctx.fillStyle = g; ctx.fillRect(-90, -90, 180, 180);
  ctx.restore();
}

const scene = {
  start: -1e9, end: 1e9,
  draw(ctx) {
    party.setStatic({ close: 1, hall: 0, strings: 0 });
    withCam(ctx, CAM, 1, () => {
      party.drawRoom(ctx, 30, { people: false, hero: false, lamp: false, mess: 1 });
      floorLamp(ctx);
      person(ctx, HERO.x, HERO.y, HERO.u, { sit: true, face: 1, lean: 0.5, hd: 0.4, arms: { near: [0.55, 1.0], far: [0.5, 1.0] },
        top: '#4a5246', bottom: '#24221f', hair: '#120e0b', hairStyle: 'short', skin: '#86624a', light: -0.4, rim: 0.4 });
    });
  },
  drawOver(ctx) {
    withCam(ctx, CAM, 1, () => { party.cityLights(ctx, 30); floorLampGlow(ctx); });
    // 片名区域：压暗一层，让字从暗处浮出来
    const g = ctx.createRadialGradient(W / 2, 420, 60, W / 2, 420, 820);
    g.addColorStop(0, 'rgba(8,6,5,0.5)'); g.addColorStop(1, 'rgba(8,6,5,0)');
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    ctx.save();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = FONT.serifBlack(226);
    ctx.letterSpacing = '56px';
    ctx.shadowColor = 'rgba(0,0,0,0.55)'; ctx.shadowBlur = 40;
    ctx.fillStyle = '#efe5d0';
    ctx.fillText('悲观主义', W / 2 + 28, 400);
    ctx.shadowBlur = 0;
    ctx.fillStyle = 'rgba(200,184,156,0.55)';
    ctx.fillRect(W / 2 - 40, 566, 80, 1.5);
    ctx.font = FONT.body(36);
    ctx.letterSpacing = '10px';
    ctx.fillStyle = 'rgba(232,222,204,0.82)';
    ctx.fillText('悲观的人，真的更清醒吗？', W / 2 + 5, 630);
    ctx.restore();
  },
  light() {
    const sc = (x, y) => toScreen(CAM, x, y);
    const [lx, ly] = sc(FLAMP.x - 80, 560);
    const [tx, ty] = sc(1000, 800);
    const [wx, wy] = sc(1610, 300);
    const [cx, cy] = sc(960, 400);
    return [
      { x: lx, y: ly, rx: 620, ry: 560, i: 1, color: [255, 200, 140], core: 0.25 },
      { x: tx, y: ty, rx: 760, ry: 260, i: 0.7, color: [255, 196, 140] },
      { x: wx, y: wy, rx: 300, ry: 320, i: 0.55, color: [170, 190, 225] },
      { x: cx, y: cy, rx: 1000, ry: 420, i: 0.35, color: [255, 210, 160] },
    ];
  },
  grade() { return { warm: 0.3, ambient: 0.12 }; },
};

const out = process.argv.slice(2).find((a) => a.endsWith('.png') || a.endsWith('.jpg')) || path.join(__dirname, '../../output/pessimism/cover.png');
fs.mkdirSync(path.dirname(out), { recursive: true });
const [canvas, ctx] = makeCanvas();
renderFrameV2(ctx, 30, 900, [scene], () => {});
fs.writeFileSync(out, out.endsWith('.jpg') ? canvas.toBuffer('image/jpeg', 94) : canvas.toBuffer('image/png'));
console.log(out);
