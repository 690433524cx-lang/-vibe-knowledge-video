#!/usr/bin/env python3
"""神像粒子点集（按光照决定疏密）：python3 tools/idol_points.py  →  assets/idol_points.bin + assets/idol_points.json
   头：罗马大理石头像（Igea 扫描，assets/models/igea.obj）表面采样 120 万个候选点
   身体：SDF 搭出的长脖子、宽肩、锁骨、上胸，表面采样候选点
   每个点的亮度 = 顶光 max(0, N·L)（从正上方偏前 30 度）+ 轮廓光 pow(1 − N·V, 2.5)；按 (亮度 / 95% 分位)^1.6 作为保留概率
   坐标与原来的人头一致：头顶 0.72，脸朝 +z；头部点存的是低头之前的坐标（低头 10 度在渲染时转）"""
import json, os
import numpy as np

HERE = os.path.dirname(os.path.abspath(__file__)); PROJ = os.path.dirname(HERE)
rng = np.random.default_rng(1201)
TILT = np.radians(10)
L = np.array([0, np.cos(np.pi / 6), np.sin(np.pi / 6)])
V = np.array([0, -0.15, 1.0]); V /= np.linalg.norm(V)


def keep_by_light(P, N, want, tilt=0.0):
    c, s = np.cos(tilt), np.sin(tilt)
    Nt = np.c_[N[:, 0], N[:, 1] * c - N[:, 2] * s, N[:, 1] * s + N[:, 2] * c]
    fv = Nt @ V
    b = np.maximum(0, Nt @ L) + 0.45 * np.power(1 - np.clip(fv, 0, 1), 2.5)
    b[fv < 0.08] = 0.004                                   # 背面和侧后方几乎不要：粒子留给看得见的那一面
    ref = np.quantile(b[fv >= 0.08], 0.9)
    pr = np.power(np.minimum(1, b / ref), 1.6)
    k = min(4.0, want / pr.sum())
    m = rng.random(len(P)) < pr * k
    return P[m], N[m]


def igea():
    Vs, Fs = [], []
    for line in open(os.path.join(PROJ, 'assets/models/igea.obj')):
        if line.startswith('v '): Vs.append([float(x) for x in line.split()[1:4]])
        elif line.startswith('f '): Fs.append([int(x.split('/')[0]) - 1 for x in line.split()[1:4]])
    Vs = np.array(Vs); Fs = np.array(Fs)
    cen = (Vs.min(0) + Vs.max(0)) / 2; sz = (Vs.max(0) - Vs.min(0)).max()
    P0 = (Vs - cen) / sz * 2
    SC = 1.34 / 1.45
    T = lambda p: np.c_[(p[:, 0] - 0.05) * SC, (p[:, 1] - 1) * SC + 0.72, (p[:, 2] - 0.35) * SC]
    P = T(P0)
    a, b_, c = P[Fs[:, 0]], P[Fs[:, 1]], P[Fs[:, 2]]
    fn = np.cross(b_ - a, c - a); area = np.linalg.norm(fn, axis=1) / 2
    vn = np.zeros_like(P)
    for j in range(3): np.add.at(vn, Fs[:, j], fn)
    vn /= np.linalg.norm(vn, axis=1, keepdims=True) + 1e-12
    if np.mean(np.sum(vn * (P - P.mean(0)), axis=1)) < 0: vn = -vn      # 扫描的三角形绕向是反的：法线翻到朝外
    n = 1_200_000
    fi = rng.choice(len(Fs), n, p=area / area.sum())
    u, v = rng.random(n), rng.random(n); m = u + v > 1; u[m], v[m] = 1 - u[m], 1 - v[m]; w = 1 - u - v
    f = Fs[fi]
    pts = P[f[:, 0]] * w[:, None] + P[f[:, 1]] * u[:, None] + P[f[:, 2]] * v[:, None]
    nrm = vn[f[:, 0]] * w[:, None] + vn[f[:, 1]] * u[:, None] + vn[f[:, 2]] * v[:, None]
    nrm /= np.linalg.norm(nrm, axis=1, keepdims=True) + 1e-12
    eyes = T(np.array([[-0.1, 0.0, 0.86], [0.2, 0.0, 0.86]]))
    print('chin y (world)', round(float(P[(P[:, 2] > 0.15)][:, 1].min()), 3))
    top = float(P[:, 1].max()); chin_band = P[(P[:, 2] > 0.3)]
    return keep_by_light(pts, nrm, 250_000, TILT), eyes, top


# ------------------------------------------------------------ 身体 SDF（与 idol.js 的 bodySDF 相同，肩宽略收）
def sd_cap(p, a, b, r):
    pa, ba = p - a, b - a
    h = np.clip((pa @ ba) / (ba @ ba), 0, 1)
    return np.linalg.norm(pa - h[:, None] * ba, axis=1) - r
def smin(a, b, k):
    h = np.clip(0.5 + 0.5 * (b - a) / k, 0, 1)
    return b + (a - b) * h - k * h * (1 - h)
def ell(p, c, r):
    r = np.array(r); return (np.linalg.norm((p - c) / r, axis=1) - 1) * r.min()
def body_sdf(p):
    A = np.array
    d = sd_cap(p, A([0, -0.45, -0.1]), A([0, -1.35, -0.04]), 0.235)                 # 粗壮的长脖子
    d = smin(d, ell(p, A([0, -1.6, -0.12]), [0.48, 0.28, 0.34]), 0.3)               # 斜方肌
    d = smin(d, sd_cap(p, A([-0.86, -1.72, -0.12]), A([0.86, -1.72, -0.12]), 0.27), 0.3)   # 肩线
    for s in (-1, 1): d = smin(d, ell(p, A([1.03 * s, -1.92, -0.1]), [0.3, 0.38, 0.32]), 0.14)   # 三角肌
    d = smin(d, ell(p, A([0, -2.55, -0.1]), [1.0, 1.0, 0.46]), 0.28)                # 上胸
    for s in (-1, 1): d = smin(d, ell(p, A([0.37 * s, -2.28, 0.15]), [0.4, 0.29, 0.2]), 0.12)    # 胸肌
    for s in (-1, 1): d = smin(d, sd_cap(p, A([0.07 * s, -1.47, 0.12]), A([0.5 * s, -1.54, 0.1]), 0.035), 0.05)  # 锁骨
    return d
def body():
    lo, hi = np.array([-1.5, -3.3, -0.7]), np.array([1.5, -0.45, 0.6])
    out_p = []
    while sum(len(x) for x in out_p) < 600_000:
        p = lo + rng.random((400_000, 3)) * (hi - lo)
        d = body_sdf(p); p = p[np.abs(d) < 0.12]
        e = 2e-3
        for _ in range(6):
            d = body_sdf(p)
            g = np.c_[(body_sdf(p + [e, 0, 0]) - d) / e, (body_sdf(p + [0, e, 0]) - d) / e, (body_sdf(p + [0, 0, e]) - d) / e]
            g /= np.linalg.norm(g, axis=1, keepdims=True) + 1e-12
            p = p - g * d[:, None]
        p = p[np.abs(body_sdf(p)) < 0.004]
        p = p[~((p[:, 1] > -0.66) & (p[:, 2] > -0.02))]       # 下巴前方的脖子点去掉
        out_p.append(p)
    P = np.vstack(out_p)
    e = 2e-3; d = body_sdf(P)
    N = np.c_[(body_sdf(P + [e, 0, 0]) - d) / e, (body_sdf(P + [0, e, 0]) - d) / e, (body_sdf(P + [0, 0, e]) - d) / e]
    N /= np.linalg.norm(N, axis=1, keepdims=True) + 1e-12
    return keep_by_light(P, N, 120_000)


if __name__ == '__main__':
    (hp, hn), eyes, top = igea()
    bp, bn = body()
    head = np.c_[hp, hn].astype(np.float32); bod = np.c_[bp, bn].astype(np.float32)
    with open(os.path.join(PROJ, 'assets/idol_points.bin'), 'wb') as f:
        f.write(np.array([len(head), len(bod)], dtype=np.float32).tobytes()); f.write(head.tobytes()); f.write(bod.tobytes())
    json.dump({'eyes': eyes.round(4).tolist(), 'headTop': round(top, 4), 'head': len(head), 'body': len(bod)}, open(os.path.join(PROJ, 'assets/idol_points.json'), 'w'))
    print('head', len(head), 'body', len(bod), 'eyes', eyes.round(3).tolist(), 'top', round(top, 3))
