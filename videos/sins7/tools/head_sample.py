#!/usr/bin/env python3
"""把 Lee Perry-Smith 头部扫描（assets/LeePerrySmith.glb）按面积均匀采样成粒子：python3 tools/head_sample.py [点数]
   输出 assets/head_points.bin：float32 × (x, y, z, nx, ny, nz)，已换算到世界单位（头顶到下巴 = HEAD_H）
   另输出 output/sins7/head_views.png：正面 / 3/4 / 侧面的法线着色预览（检查是否为实心的头）"""
import json, os, struct, sys
import numpy as np
from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__)); PROJ = os.path.dirname(HERE)
GLB = os.path.join(PROJ, 'assets/LeePerrySmith.glb')

def load():
    b = open(GLB, 'rb').read()
    jl = struct.unpack('<I', b[12:16])[0]; j = json.loads(b[20:20 + jl])
    bin0 = 20 + jl + 8
    def acc(i):
        a = j['accessors'][i]; v = j['bufferViews'][a['bufferView']]
        n = {'SCALAR': 1, 'VEC2': 2, 'VEC3': 3}[a['type']]; dt = {5126: np.float32, 5125: np.uint32, 5123: np.uint16}[a['componentType']]
        off = bin0 + v.get('byteOffset', 0) + a.get('byteOffset', 0)
        return np.frombuffer(b, dtype=dt, count=a['count'] * n, offset=off).reshape(-1, n) if n > 1 else np.frombuffer(b, dtype=dt, count=a['count'], offset=off)
    p = j['meshes'][0]['primitives'][0]
    return acc(p['attributes']['POSITION']).astype(np.float64), acc(p['attributes']['NORMAL']).astype(np.float64), acc(p['indices']).reshape(-1, 3)

def sample(V, N, F, n, seed=7):
    r = np.random.default_rng(seed)
    a, b, c = V[F[:, 0]], V[F[:, 1]], V[F[:, 2]]
    area = np.linalg.norm(np.cross(b - a, c - a), axis=1) / 2
    fi = r.choice(len(F), n, p=area / area.sum())
    u, v = r.random(n), r.random(n); m = u + v > 1; u[m], v[m] = 1 - u[m], 1 - v[m]; w = 1 - u - v
    P = a[fi] * w[:, None] + b[fi] * u[:, None] + c[fi] * v[:, None]
    Nn = N[F[fi, 0]] * w[:, None] + N[F[fi, 1]] * u[:, None] + N[F[fi, 2]] * v[:, None]
    Nn /= np.linalg.norm(Nn, axis=1, keepdims=True) + 1e-9
    return P, Nn

def views(P, Nn, path):
    tiles = []
    for yaw in (0, 40, 90):
        t = np.radians(yaw); R = np.array([[np.cos(t), 0, np.sin(t)], [0, 1, 0], [-np.sin(t), 0, np.cos(t)]])
        q, nq = P @ R.T, Nn @ R.T
        S = 600; img = np.zeros((S, S)); zb = np.full((S, S), -1e9)
        span = np.abs(P).max() * 1.05
        xs = ((q[:, 0] / span * 0.5 + 0.5) * S).astype(int); ys = ((-q[:, 1] / span * 0.5 + 0.5) * S).astype(int)
        L = np.array([-0.4, 0.7, 0.6]); L /= np.linalg.norm(L); sh = np.clip(nq @ L, 0, 1) * 0.9 + 0.1
        ok = (xs >= 0) & (xs < S) & (ys >= 0) & (ys < S)
        for x, y, z, s in zip(xs[ok], ys[ok], q[ok, 2], sh[ok]):
            if z > zb[y, x]: zb[y, x] = z; img[y, x] = s
        tiles.append((img * 255).astype(np.uint8))
    Image.fromarray(np.hstack(tiles)).save(path)

if __name__ == '__main__':
    V, N, F = load()
    print('bounds', V.min(0).round(3), V.max(0).round(3), 'faces', len(F))
    n = int(sys.argv[1]) if len(sys.argv) > 1 else 200000
    P, Nn = sample(V, N, F, n)
    os.makedirs(os.path.join(PROJ, '../../output/sins7'), exist_ok=True)
    views(P[:150000], Nn[:150000], os.path.join(PROJ, '../../output/sins7/head_views.png'))
