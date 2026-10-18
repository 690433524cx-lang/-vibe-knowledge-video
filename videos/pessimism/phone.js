// 手机特写：同一部手机、同一只手、同一个机位，贯穿「返程票 → 聊天框 → 输入光标 → 门缝」。
// 坐标：手机中心在屏幕 (1080, 560)，转 -0.1 弧度；屏幕内容以屏幕中心为原点（sw × sh）。
const { W, H } = require('../../src/config');
const { FONT } = require('../../src/lib/style');
const { smoothPath } = require('./lib');

const PW = 470, PH = 940, SW = PW - 34, SH = PH - 34;
const CENTER = [1080, 560], ROT = -0.1;

function roundRect(ctx, x, y, w, h, r) {
  r = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

// bg: 'lap'（列车上，深色裤子）/ 'bed'（深夜卧室，床单）；push：极慢推近；thumb：拇指推动量
function phoneShell(ctx, o, content) {
  const { bg = 'lap', push = 1, thumb = 0 } = o;
  ctx.save();
  const g = ctx.createLinearGradient(0, 0, W, H);
  if (bg === 'lap') { g.addColorStop(0, '#22252a'); g.addColorStop(1, '#16181b'); }
  else { g.addColorStop(0, '#262a33'); g.addColorStop(1, '#14161b'); }
  ctx.fillStyle = g;
  ctx.fillRect(-100, -100, W + 200, H + 200);
  ctx.strokeStyle = bg === 'lap' ? 'rgba(0,0,0,0.35)' : 'rgba(0,0,0,0.25)';
  ctx.lineWidth = bg === 'lap' ? 18 : 26;
  for (const [a, b] of [[200, 900], [1500, 1000], [400, 1080]]) { ctx.beginPath(); ctx.moveTo(a, -50); ctx.quadraticCurveTo(a + 200, 500, b, 1150); ctx.stroke(); }
  ctx.translate(CENTER[0], CENTER[1]);
  ctx.scale(push, push);
  ctx.rotate(ROT);
  // 手：从右下握住手机
  ctx.fillStyle = '#3d2c22';
  smoothPath(ctx, [[PW * 0.32, PH * 0.18], [PW * 0.62, PH * 0.26], [PW * 0.9, PH * 0.62], [PW * 0.8, PH * 0.9], [PW * 0.2, PH * 0.72], [PW * 0.32, PH * 0.4]]);
  ctx.fill();
  ctx.save();
  ctx.shadowColor = 'rgba(0,0,0,0.7)'; ctx.shadowBlur = 50; ctx.shadowOffsetX = 20; ctx.shadowOffsetY = 30;
  ctx.fillStyle = '#0f0f11';
  roundRect(ctx, -PW / 2, -PH / 2, PW, PH, 58); ctx.fill();
  ctx.restore();
  ctx.strokeStyle = 'rgba(200,200,205,0.3)'; ctx.lineWidth = 2;
  roundRect(ctx, -PW / 2, -PH / 2, PW, PH, 58); ctx.stroke();
  ctx.save();
  roundRect(ctx, -SW / 2, -SH / 2, SW, SH, 44); ctx.clip();
  ctx.fillStyle = '#1b2026';
  ctx.fillRect(-SW / 2, -SH / 2, SW, SH);
  content(ctx, SW, SH);
  const gl = ctx.createLinearGradient(-SW / 2, -SH / 2, SW / 2, SH / 2);
  gl.addColorStop(0.2, 'rgba(255,255,255,0)'); gl.addColorStop(0.28, 'rgba(255,255,255,0.06)'); gl.addColorStop(0.36, 'rgba(255,255,255,0)');
  ctx.fillStyle = gl;
  ctx.fillRect(-SW / 2, -SH / 2, SW, SH);
  ctx.restore();
  // 拇指
  ctx.fillStyle = '#4a3528';
  smoothPath(ctx, [[PW * 0.5, PH * 0.08 - thumb * 60], [PW * 0.22, PH * 0.06 - thumb * 60], [PW * 0.1, PH * 0.12 - thumb * 50], [PW * 0.34, PH * 0.36], [PW * 0.6, PH * 0.3]]);
  ctx.fill();
  ctx.restore();
}

// 屏幕局部坐标 → 画面坐标
function toScreen(x, y, push = 1) {
  const c = Math.cos(ROT), s = Math.sin(ROT);
  return [CENTER[0] + (x * c - y * s) * push, CENTER[1] + (x * s + y * c) * push];
}

// 聊天界面：他发出去的那一句停在中间，下面什么都没有
const BUBBLE = { w: 330, h: 112, x: SW / 2 - 26 - 330, y: -60 };
const INPUT = { y: SH / 2 - 120, h: 74 };
function chat(ctx, sw, sh, o = {}) {
  const { alpha = 1, text = 1, status = 1, cursor = 0, sentBubble = true } = o;
  ctx.save();
  ctx.globalAlpha *= alpha;
  ctx.fillStyle = '#1b2026';
  ctx.fillRect(-sw / 2, -sh / 2, sw, sh);
  // 顶栏
  ctx.fillStyle = 'rgba(240,234,222,0.9)';
  ctx.font = FONT.body(32);
  ctx.textAlign = 'center';
  ctx.fillText('Y', 0, -sh / 2 + 92);
  ctx.textAlign = 'left';
  ctx.fillStyle = 'rgba(232,224,206,0.08)';
  ctx.fillRect(-sw / 2, -sh / 2 + 124, sw, 1);
  // 很久以前的一句
  ctx.font = FONT.body(20);
  ctx.fillStyle = 'rgba(230,222,206,0.4)';
  ctx.textAlign = 'center';
  ctx.fillText('上周五 21:06', 0, -sh / 2 + 200);
  ctx.textAlign = 'left';
  ctx.fillStyle = 'rgba(232,224,206,0.1)';
  roundRect(ctx, -sw / 2 + 26, -sh / 2 + 230, 170, 84, 28); ctx.fill();
  ctx.fillStyle = 'rgba(240,234,222,0.85)';
  ctx.font = FONT.body(30);
  ctx.fillText('哈哈 好', -sw / 2 + 56, -sh / 2 + 284);
  // 他发的这一句
  if (sentBubble) {
    ctx.fillStyle = '#56685c';
    roundRect(ctx, BUBBLE.x, BUBBLE.y, BUBBLE.w, BUBBLE.h, 30); ctx.fill();
    ctx.save();
    ctx.globalAlpha *= text;
    ctx.fillStyle = 'rgba(244,240,230,0.95)';
    ctx.font = FONT.body(29);
    ctx.fillText('下周有空吗？', BUBBLE.x + 30, BUBBLE.y + 46);
    ctx.fillText('一起吃个饭', BUBBLE.x + 30, BUBBLE.y + 88);
    ctx.restore();
    ctx.save();
    ctx.globalAlpha *= status;
    ctx.font = FONT.body(20);
    ctx.fillStyle = 'rgba(230,222,206,0.5)';
    ctx.textAlign = 'right';
    ctx.fillText('已发送', BUBBLE.x + BUBBLE.w - 6, BUBBLE.y + BUBBLE.h + 32);
    ctx.restore();
  }
  // 输入框 + 光标
  ctx.fillStyle = 'rgba(232,224,206,0.08)';
  roundRect(ctx, -sw / 2 + 26, INPUT.y, sw - 52, INPUT.h, 36); ctx.fill();
  if (cursor > 0) {
    ctx.fillStyle = `rgba(150,196,255,${cursor})`;
    ctx.fillRect(-sw / 2 + 60, INPUT.y + 18, 3, INPUT.h - 36);
  }
  ctx.restore();
}
const CURSOR = { x: -SW / 2 + 61.5, y: INPUT.y + INPUT.h / 2 };

module.exports = { phoneShell, chat, toScreen, roundRect, BUBBLE, CURSOR, SW, SH, PW, PH };
