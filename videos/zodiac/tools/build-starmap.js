// 生成星图：engine/assets/starmap/<id>.json
// 优先用 d3-celestial 的星座连线（constellations.lines.json）和恒星星等（stars.6.json）；
// 本地没有就下载；下载失败就用星座配置里的备用星表（starmap.stars + starmap.chains）。
// 投影：以星座中心为切点的球心投影；赤经向左增大（画面左右镜像，与肉眼看到的夜空一致）。
// 用法：node tools/build-starmap.js [id…]（不带参数时生成全部）
const fs = require('fs');
const path = require('path');
const https = require('https');

const ROOT = path.join(__dirname, '..');
const D3_DIR = path.join(ROOT, 'engine/assets/d3-celestial');
const OUT_DIR = path.join(ROOT, 'engine/assets/starmap');
const SIGNS_DIR = path.join(ROOT, 'engine/signs');
const SRC = 'https://raw.githubusercontent.com/ofrohn/d3-celestial/master/data/';
const D2R = Math.PI / 180;

function download(url, file) {
  return new Promise((resolve, reject) => {
    https.get(url, res => {
      if (res.statusCode !== 200) { res.resume(); return reject(new Error(`${url} → HTTP ${res.statusCode}`)); }
      const chunks = []; res.on('data', c => chunks.push(c));
      res.on('end', () => { fs.mkdirSync(path.dirname(file), { recursive: true }); fs.writeFileSync(file, Buffer.concat(chunks)); resolve(); });
    }).on('error', reject).setTimeout(20000, function () { this.destroy(new Error('超时')); });
  });
}
async function loadD3() {
  const files = { lines: 'constellations.lines.json', stars: 'stars.6.json' };
  const out = {};
  for (const [k, f] of Object.entries(files)) {
    const p = path.join(D3_DIR, f);
    if (!fs.existsSync(p)) {
      try { await download(SRC + f, p); console.log('已下载', f); }
      catch (e) { console.warn('下载失败，改用备用星表：', e.message); return null; }
    }
    try { out[k] = JSON.parse(fs.readFileSync(p, 'utf8')); } catch (e) { console.warn(f, '解析失败：', e.message); return null; }
  }
  return out;
}

// 两点角距（度）
function angDist(ra1, de1, ra2, de2) {
  const c = Math.sin(de1 * D2R) * Math.sin(de2 * D2R) + Math.cos(de1 * D2R) * Math.cos(de2 * D2R) * Math.cos((ra1 - ra2) * D2R);
  return Math.acos(Math.max(-1, Math.min(1, c))) / D2R;
}

function fromD3(d3, iau, cfgStars) {
  const feat = d3.lines.features.filter(f => f.id === iau);
  if (!feat.length) return null;
  const stars = [], segs = [];
  const find = (ra, dec) => {
    for (let i = 0; i < stars.length; i++) if (angDist(stars[i].ra, stars[i].dec, ra, dec) < 0.02) return i;
    stars.push({ ra, dec }); return stars.length - 1;
  };
  for (const f of feat) for (const line of f.geometry.coordinates) {
    for (let k = 0; k < line.length; k++) {
      const [lon, dec] = line[k]; const ra = lon < 0 ? lon + 360 : lon;
      const i = find(ra, dec);
      if (k > 0) {
        const [plon, pdec] = line[k - 1]; const j = find(plon < 0 ? plon + 360 : plon, pdec);
        if (i !== j && !segs.some(s => (s[0] === i && s[1] === j) || (s[0] === j && s[1] === i))) segs.push([j, i]);
      }
    }
  }
  // 星等：在 stars.6.json 里找最近的恒星
  for (const s of stars) {
    let best = null, bd = 0.3;
    for (const f of d3.stars.features) {
      const [lon, dec] = f.geometry.coordinates; if (Math.abs(dec - s.dec) > bd) continue;
      const d = angDist(s.ra, s.dec, lon < 0 ? lon + 360 : lon, dec);
      if (d < bd) { bd = d; best = f; }
    }
    s.mag = best ? best.properties.mag : 4.5;
  }
  // 中文名：与配置里的星表按坐标对应
  for (const s of stars) {
    for (const c of cfgStars || []) if (angDist(s.ra, s.dec, c.ra * 15, c.dec) < 0.5) { s.name = c.name; break; }
  }
  return { stars, segs, source: 'd3-celestial' };
}

function fromFallback(cfg) {
  const stars = cfg.starmap.stars.map(s => ({ ra: s.ra * 15, dec: s.dec, mag: s.mag, name: s.name }));
  const segs = [];
  for (const ch of cfg.starmap.chains || []) for (let k = 1; k < ch.length; k++) {
    const a = stars.findIndex(s => s.name === ch[k - 1]), b = stars.findIndex(s => s.name === ch[k]);
    if (a >= 0 && b >= 0 && !segs.some(s => (s[0] === a && s[1] === b) || (s[0] === b && s[1] === a))) segs.push([a, b]);
  }
  return { stars, segs, source: '备用星表' };
}

// 连线顺序：先按配置的 chains（例如狮子座先画“镰刀”头鬃，再画身体），剩下的按原数据顺序
function orderSegments(data, cfg) {
  const out = [], used = new Set();
  const key = (a, b) => (a < b ? `${a}-${b}` : `${b}-${a}`);
  const has = new Map(data.segs.map(s => [key(s[0], s[1]), s]));
  for (const ch of cfg.starmap?.chains || []) for (let k = 1; k < ch.length; k++) {
    const a = data.stars.findIndex(s => s.name === ch[k - 1]), b = data.stars.findIndex(s => s.name === ch[k]);
    if (a < 0 || b < 0) continue;
    const kk = key(a, b); if (!has.has(kk) || used.has(kk)) continue;
    used.add(kk); out.push([a, b]);
  }
  for (const s of data.segs) { const kk = key(s[0], s[1]); if (!used.has(kk)) { used.add(kk); out.push(s); } }
  return out;
}

function layout(data, cfg) {
  // 切点：所有星的单位向量平均
  let vx = 0, vy = 0, vz = 0;
  for (const s of data.stars) { const a = s.ra * D2R, d = s.dec * D2R; vx += Math.cos(d) * Math.cos(a); vy += Math.cos(d) * Math.sin(a); vz += Math.sin(d); }
  const a0 = Math.atan2(vy, vx), d0 = Math.atan2(vz, Math.hypot(vx, vy));
  for (const s of data.stars) {
    const a = s.ra * D2R, d = s.dec * D2R;
    const cosc = Math.sin(d0) * Math.sin(d) + Math.cos(d0) * Math.cos(d) * Math.cos(a - a0);
    const x = Math.cos(d) * Math.sin(a - a0) / cosc;
    const y = (Math.cos(d0) * Math.sin(d) - Math.sin(d0) * Math.cos(d) * Math.cos(a - a0)) / cosc;
    s.gx = -x; s.gy = y; // 赤经向左增大：左右镜像
  }
  const xs = data.stars.map(s => s.gx), ys = data.stars.map(s => s.gy);
  const minx = Math.min(...xs), maxx = Math.max(...xs), miny = Math.min(...ys), maxy = Math.max(...ys);
  const w = maxx - minx, h = maxy - miny;
  let scale = 820 / w; if (h * scale > 900) scale = 900 / h;
  const cx = (minx + maxx) / 2, cy = (miny + maxy) / 2;
  const norm = Math.max(w, h);
  for (const s of data.stars) {
    s.x = +(540 + (s.gx - cx) * scale).toFixed(2);
    s.y = +(820 - (s.gy - cy) * scale).toFixed(2);
    s.nx = +((s.gx - cx) / norm).toFixed(5); // 归一化坐标（y 向上），给胸口纹章用
    s.ny = +((s.gy - cy) / norm).toFixed(5);
    delete s.gx; delete s.gy;
  }
  return { w: w * scale, h: h * scale, aspect: w / h };
}

async function build(ids) {
  const d3 = await loadD3();
  fs.mkdirSync(OUT_DIR, { recursive: true });
  const all = fs.readdirSync(SIGNS_DIR).filter(f => f.endsWith('.json')).map(f => JSON.parse(fs.readFileSync(path.join(SIGNS_DIR, f), 'utf8')));
  for (const cfg of all) {
    if (ids.length && !ids.includes(cfg.id)) continue;
    let data = d3 && cfg.iau ? fromD3(d3, cfg.iau, cfg.starmap?.stars) : null;
    if (!data) data = fromFallback(cfg);
    data.segs = orderSegments(data, cfg);
    const box = layout(data, cfg);
    let main = data.stars.findIndex(s => s.name === cfg.mainStar);
    if (main < 0) { main = data.stars.reduce((bi, s, i, a) => (s.mag < a[bi].mag ? i : bi), 0); data.stars[main].name = cfg.mainStar; }
    const out = { id: cfg.id, source: data.source, main, size: box, stars: data.stars.map(s => ({ ...s, ra: +s.ra.toFixed(4), dec: +s.dec.toFixed(4), mag: +(+s.mag).toFixed(2) })), lines: data.segs };
    fs.writeFileSync(path.join(OUT_DIR, cfg.id + '.json'), JSON.stringify(out, null, 1));
    console.log(`${cfg.name}：${out.stars.length} 颗星，${out.lines.length} 条连线，主星 ${out.stars[main].name}（${out.stars[main].mag}），来源 ${out.source}，尺寸 ${box.w.toFixed(0)}×${box.h.toFixed(0)}`);
  }
}

module.exports = { build };
if (require.main === module) build(process.argv.slice(2)).catch(e => { console.error(e); process.exit(1); });
