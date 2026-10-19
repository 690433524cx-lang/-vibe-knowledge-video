// 时间重映射：把一个按旧时间轴写好的场景，压缩 / 平移到新的时间轴上，内容不用重写。
//   remap(scene, [[新时间, 旧时间], …], { start, end, clampOld })
// 两个锚点之间线性插值，范围外按 1:1 外推；clampOld 可以把旧时间钳在某个值（之后画面停在那一刻）。
// 互相引用的场景（如杯口高光 → 窗花）只要在交接的那一段用同样的映射，就依然对得上。
function interp(pairs, x, from, to) {
  if (x <= pairs[0][from]) return pairs[0][to] + (x - pairs[0][from]);
  for (let i = 1; i < pairs.length; i++) {
    const p = pairs[i - 1], q = pairs[i];
    if (x <= q[from]) return p[to] + ((x - p[from]) / (q[from] - p[from])) * (q[to] - p[to]);
  }
  const l = pairs[pairs.length - 1];
  return l[to] + (x - l[from]);
}

function remap(scene, pairs, o = {}) {
  const toOld = (t) => { const v = interp(pairs, t, 0, 1); return o.clampOld != null ? Math.min(v, o.clampOld) : v; };
  const toNew = (t) => interp(pairs, t, 1, 0);
  return {
    start: o.start ?? toNew(scene.start),
    end: o.end ?? toNew(scene.end),
    draw: (ctx, t, env) => scene.draw(ctx, toOld(t), env),
    drawOver: scene.drawOver && ((ctx, t, env) => scene.drawOver(ctx, toOld(t), env)),
    light: scene.light && ((t) => scene.light(toOld(t))),
    grade: scene.grade && ((t) => scene.grade(toOld(t))),
    toOld,
    toNew,
  };
}

module.exports = { remap, interp };
