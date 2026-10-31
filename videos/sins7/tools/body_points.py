#!/usr/bin/env python3
"""神像身体的实心粒子：python3 tools/body_points.py  →  assets/body_points.bin（float32 × (x, y, z, nx, ny, nz)）
   SDF 与第一版 idol.js 的 bodySDF 完全相同（长脖子、斜方肌、肩线、三角肌、上胸、胸肌），另加两条锁骨；
   表面均匀采样，密度与脸接近（第一版的脸约 17 万点 / 1.2 平方单位）。"""
import os
import numpy as np
HERE = os.path.dirname(os.path.abspath(__file__)); PROJ = os.path.dirname(HERE)
rng = np.random.default_rng(811)
A = np.array
def sd_cap(p, a, b, r):
    pa, ba = p - a, b - a; h = np.clip((pa @ ba) / (ba @ ba), 0, 1); return np.linalg.norm(pa - h[:, None] * ba, axis=1) - r
def smin(a, b, k):
    h = np.clip(0.5 + 0.5 * (b - a) / k, 0, 1); return b + (a - b) * h - k * h * (1 - h)
def ell(p, c, r):
    r = A(r); return (np.linalg.norm((p - c) / r, axis=1) - 1) * r.min()
def body_sdf(p):
    d = sd_cap(p, A([0, -0.45, -0.1]), A([0, -1.35, -0.04]), 0.215)
    d = smin(d, ell(p, A([0, -1.6, -0.12]), [0.5, 0.28, 0.34]), 0.3)
    d = smin(d, sd_cap(p, A([-0.98, -1.72, -0.12]), A([0.98, -1.72, -0.12]), 0.28), 0.3)
    for s in (-1, 1): d = smin(d, ell(p, A([1.16 * s, -1.92, -0.1]), [0.32, 0.4, 0.34]), 0.14)
    d = smin(d, ell(p, A([0, -2.55, -0.1]), [1.12, 1.0, 0.48]), 0.28)
    for s in (-1, 1): d = smin(d, ell(p, A([0.4 * s, -2.28, 0.16]), [0.42, 0.3, 0.2]), 0.12)
    for s in (-1, 1): d = smin(d, sd_cap(p, A([0.08 * s, -1.5, 0.16]), A([0.62 * s, -1.57, 0.12]), 0.03), 0.06)   # 锁骨
    return d
def grad(p, e=2e-3):
    d = body_sdf(p); g = np.c_[(body_sdf(p + [e, 0, 0]) - d) / e, (body_sdf(p + [0, e, 0]) - d) / e, (body_sdf(p + [0, 0, e]) - d) / e]
    return g / (np.linalg.norm(g, axis=1, keepdims=True) + 1e-12)
lo, hi = A([-1.6, -3.4, -0.7]), A([1.6, -0.45, 0.6])
want, out = 480_000, []
while sum(len(x) for x in out) < want:
    p = lo + rng.random((500_000, 3)) * (hi - lo)
    p = p[np.abs(body_sdf(p)) < 0.12]
    for _ in range(6): p = p - grad(p) * body_sdf(p)[:, None]
    p = p[np.abs(body_sdf(p)) < 0.004]
    p = p[~((p[:, 1] > -0.66) & (p[:, 2] > -0.02))]          # 下巴前方的脖子点去掉
    p = p[p[:, 2] > -0.45]                                    # 背面基本看不见，少放一些
    out.append(p)
P = np.vstack(out)[:want]
# 锁骨：沿锁骨表面再加一层更密的点（亮线），与第一版一样清楚
def clav_d(p):
    return np.minimum(*[sd_cap(p, A([0.08 * s, -1.5, 0.16]), A([0.62 * s, -1.57, 0.12]), 0.03) for s in (-1, 1)])
extra = P[np.abs(clav_d(P)) < 0.045]
extra = np.repeat(extra, 4, axis=0) + rng.normal(0, 0.004, (len(extra) * 4, 3))
P = np.vstack([P, extra])
N = grad(P)
print('clavicle extra', len(extra))
np.c_[P, N].astype(np.float32).tofile(os.path.join(PROJ, 'assets/body_points.bin'))
print('body points', len(P))
