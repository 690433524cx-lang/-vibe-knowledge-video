#!/usr/bin/env python3
"""侧脸剪影：Lee Perry-Smith 头部扫描的正侧面投影 → 轮廓线与粒子（python3 tools/profile.py）
   画面坐标：x 向右、y 向上，脸朝左（x = -z）。世界单位 = 模型单位 × SC。
   输出 assets/profile.bin（float32 记录，见 write()）与 assets/profile.json（关键点、大脑放置），预览 output/sins7/profile_preview.png"""
import json, os, sys
import numpy as np
from PIL import Image, ImageDraw
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from head_sample import load

HERE = os.path.dirname(os.path.abspath(__file__)); PROJ = os.path.dirname(HERE)
SC = 0.5            # 模型单位 → 世界单位
RES = 220           # 每个模型单位的像素数（掩膜分辨率）
X0, X1, Y0, Y1 = -3.6, 9.0, -7.5, 4.6   # 掩膜覆盖范围（模型单位，含延伸出去的肩膀）

YAW, PITCH, TAG = 15.0, 0.0, ''
PIV = np.array([0.0, -0.9, -0.3])           # 低头的转轴（脖子上段）
def xf(V):
    """模型坐标 → 转头后的模型坐标：头部（脖子以上平滑过渡）先绕脖子低头 PITCH 度，再整体朝镜头转 YAW 度"""
    V = np.atleast_2d(np.asarray(V, dtype=np.float64)).copy()
    w = np.clip((V[:, 1] + 1.6) / 1.0, 0, 1); w = w * w * (3 - 2 * w)
    th = np.radians(PITCH) * w
    q = V - PIV
    y = q[:, 1] * np.cos(th) - q[:, 2] * np.sin(th); z = q[:, 1] * np.sin(th) + q[:, 2] * np.cos(th)
    V = np.c_[q[:, 0], y, z] + PIV
    ya = np.radians(YAW)
    x = V[:, 0] * np.cos(ya) + V[:, 2] * np.sin(ya); z = -V[:, 0] * np.sin(ya) + V[:, 2] * np.cos(ya)
    return np.c_[x, V[:, 1], z]
to2 = lambda V: np.c_[-xf(V)[:, 2], xf(V)[:, 1]]    # 画面坐标（脸朝左）

def mask_from_model():
    V, N, F = load()
    V = xf(V)
    W, H = int((X1 - X0) * RES), int((Y1 - Y0) * RES)
    im = Image.new('L', (W, H), 0); d = ImageDraw.Draw(im)
    px = lambda x, y: ((x - X0) * RES, (Y1 - y) * RES)
    P2 = np.c_[-V[:, 2], V[:, 1]]
    for f in F: d.polygon([px(*P2[i]) for i in f], fill=255)
    return im, px, P2

def trace(m):
    """Moore 邻域边界追踪：返回外轮廓像素序列（顺时针）"""
    H, W = m.shape
    ys, xs = np.nonzero(m)
    i = np.argmin(ys * W + xs); start = (xs[i], ys[i])
    nb = [(1, 0), (1, 1), (0, 1), (-1, 1), (-1, 0), (-1, -1), (0, -1), (1, -1)]
    out = [start]; cur = start; back = 4
    for _ in range(400000):
        for k in range(8):
            dd = (back + 1 + k) % 8; nx, ny = cur[0] + nb[dd][0], cur[1] + nb[dd][1]
            if 0 <= nx < W and 0 <= ny < H and m[ny, nx]:
                back = (dd + 4) % 8; cur = (nx, ny); break
        if cur == start: break
        out.append(cur)
    return np.array(out, dtype=np.float64)

def extension(d, px):
    """在扫描半身像下面补出肩膀和上胸，往右下一直延伸出画面"""
    pts = [(-0.95, -2.7), (-1.15, -3.3), (-1.35, -4.4), (-1.6, -7.5), (9.0, -7.5), (9.0, -3.75), (6.0, -3.35), (4.2, -3.0), (3.0, -2.62), (2.25, -2.1), (1.75, -1.2), (1.2, -1.2), (0.0, -2.0)]
    d.polygon([px(x, y) for x, y in pts], fill=255)

def build():
    im, px, P2 = mask_from_model()
    extension(ImageDraw.Draw(im), px)
    from PIL import ImageFilter
    im = im.filter(ImageFilter.GaussianBlur(RES * 0.05)).point(lambda v: 255 if v > 127 else 0)
    m = np.array(im) > 0
    c = trace(m)
    # 像素 → 模型坐标；平滑；按等弧长重采样
    P = np.c_[c[:, 0] / RES + X0, Y1 - c[:, 1] / RES]
    k = 9; P = np.array([np.convolve(np.r_[P[-k:, i], P[:, i], P[:k, i]], np.ones(2 * k + 1) / (2 * k + 1), 'valid') for i in range(2)]).T
    P = P[::-1]                                        # 反向：从头顶开始先沿额头、脸往下走
    seg = np.linalg.norm(np.diff(np.r_[P, P[:1]], axis=0), axis=1); L = np.r_[0, np.cumsum(seg)]
    step = 0.004; s = np.arange(0, L[-1], step)
    Q = np.c_[np.interp(s, L, np.r_[P[:, 0], P[0, 0]]), np.interp(s, L, np.r_[P[:, 1], P[0, 1]])]
    # 起点挪到头顶最前面一点（额头上缘），s 从这里沿脸往下增加
    top = np.argmax(Q[:, 1] - 0.15 * np.maximum(0, Q[:, 0] + 0.3))
    i0 = int(np.argmax((Q[:, 1] > 3.2) & (Q[:, 0] < -1.4))) if np.any((Q[:, 1] > 3.2) & (Q[:, 0] < -1.4)) else top
    Q = np.roll(Q, -i0, axis=0); s = np.arange(len(Q)) * step
    T = np.gradient(Q, axis=0); T /= np.linalg.norm(T, axis=1, keepdims=True)
    Nrm = np.c_[T[:, 1], -T[:, 0]]                     # 法线；朝里还是朝外用掩膜判断
    probe = Q + Nrm * 0.03
    inside = m[np.clip(((Y1 - probe[:, 1]) * RES).astype(int), 0, m.shape[0] - 1), np.clip(((probe[:, 0] - X0) * RES).astype(int), 0, m.shape[1] - 1)]
    Nin = np.where(inside[:, None], Nrm, -Nrm)
    x, y = Q[:, 0], Q[:, 1]
    face = (x < -0.6) & (y > -0.9) & (y < 3.6)          # 额头到下巴
    w = np.where(face, 1.0, 0.2)
    w = np.where((x < -0.5) & (y <= -0.9), 0.62, w)       # 喉结、脖子前侧、胸口
    w = np.convolve(np.r_[w[-60:], w, w[:60]], np.ones(121) / 121, 'valid')
    vis = (y > -4.6) & (x < 6.5)                          # 画面外的补形边不画
    return m, Q, s, Nin, w * vis, P2

def write():
    m, Q, s, Nin, w, P2 = build()
    r = np.random.default_rng(3)
    # 轮廓光带：核心在轮廓上，往内约 20px（0.14 模型单位）渐变；depth = 0…1
    rim = []
    for rep in range(int(sys.argv[1]) if len(sys.argv) > 1 else 10):
        j = r.random(len(Q)) * 0.004
        dep = np.minimum(1, r.exponential(0.28, len(Q)))
        pos = Q + Nin * (dep[:, None] * 0.14) + (r.random((len(Q), 2)) - 0.5) * 0.006
        rim.append(np.c_[pos * SC, s * SC + j, dep, w])
    for rep in range(4):
        # 轮廓外侧的柔光（depth < 0，往外约 12px）
        dep = -np.minimum(1, r.exponential(0.35, len(Q)))
        pos = Q - Nin * (-dep[:, None] * 0.09) + (r.random((len(Q), 2)) - 0.5) * 0.006
        rim.append(np.c_[pos * SC, s * SC, dep, w])
    rim = np.vstack(rim); rim = rim[rim[:, 4] > 0.01]
    # 剪影内部的淡粒子
    H, W = m.shape; fill = []
    while sum(len(f) for f in fill) < 90000:
        xs = r.random(40000) * (X1 - X0) + X0; ys = r.random(40000) * (Y1 - Y0) + Y0
        ok = m[np.clip(((Y1 - ys) * RES).astype(int), 0, H - 1), np.clip(((xs - X0) * RES).astype(int), 0, W - 1)] & (ys > -4.6) & (xs < 6.5)
        fill.append(np.c_[xs[ok], ys[ok]] * SC)
    fill = np.vstack(fill)[:90000]
    out = os.path.join(PROJ, f'assets/profile{TAG}.bin')
    hdr = np.array([len(rim), len(fill)], dtype=np.float32)
    with open(out, 'wb') as f: f.write(hdr.tobytes()); f.write(rim.astype(np.float32).tobytes()); f.write(fill.astype(np.float32).tobytes())
    # 关键点（模型坐标，转头前）：头顶、下巴、头部中心（耳朵附近）、靠镜头一侧的眼睛、大脑中心
    V0, _, _ = load()
    topi = np.argmax(V0[:, 1]); top3 = V0[topi]; chin3 = np.array([0, -0.62, 1.55])
    head = V0[V0[:, 1] > -0.62]
    eye3 = np.array([1.05, 1.52, 1.75]); cen3 = np.array([0.0, 1.15, -0.05]); brain3 = np.array([0.0, 2.12, 0.1])
    T = lambda p: (to2(p)[0] * SC).round(4).tolist()
    top2 = float((xf(head)[:, 1]).max()); chin2 = float(xf(chin3)[0, 1])
    meta = dict(scale=SC, yaw=YAW, pitch=PITCH, headTop=top2 * SC, chin=chin2 * SC, headH=(top2 - chin2) * SC, center=T(cen3), eye=T(eye3),
                noseTip=[float(Q[:, 0].min() * SC), 0], brain=dict(pos=T(brain3), scale=1.72 * SC, rot=float(np.radians(PITCH))),
                contour=(Q[::12] * SC).round(4).tolist(), rimLen=float(s[-1] * SC), counts=[len(rim), len(fill)])
    json.dump(meta, open(os.path.join(PROJ, f'assets/profile{TAG}.json'), 'w'), indent=1)
    # 预览
    S = 120; img = Image.new('RGB', (int((X1 - X0) * S), int((Y1 - Y0) * S)), (6, 3, 10)); d = ImageDraw.Draw(img)
    for x, y in fill[::6] / SC: d.point(((x - X0) * S, (Y1 - y) * S), fill=(40, 25, 60))
    for x, y, ss, dep, ww in rim[::4]:
        x, y = x / SC, y / SC; v = int(255 * ww * (1 - dep)); d.point(((x - X0) * S, (Y1 - y) * S), fill=(v, int(v * 0.85), 255 if v else 0))
    ex, ey = meta['eye'][0] / SC, meta['eye'][1] / SC; d.ellipse([(ex - X0) * S - 4, (Y1 - ey) * S - 4, (ex - X0) * S + 4, (Y1 - ey) * S + 4], outline=(0, 255, 0))
    cx, cy = meta['center'][0] / SC, meta['center'][1] / SC; d.ellipse([(cx - X0) * S - 6, (Y1 - cy) * S - 6, (cx - X0) * S + 6, (Y1 - cy) * S + 6], outline=(255, 0, 0))
    bx, by = meta['brain']['pos'][0] / SC, meta['brain']['pos'][1] / SC; d.rectangle([(bx - 1.1 * 1.72 - X0) * S, (Y1 - by - 0.74 * 1.72) * S, (bx + 1.12 * 1.72 - X0) * S, (Y1 - by + 0.62 * 1.72) * S], outline=(255, 200, 0))
    img.save(os.path.join(PROJ, f'../../output/sins7/profile_preview{TAG}.png'))
    print(json.dumps({k: v for k, v in meta.items() if k != 'contour'}))

if __name__ == '__main__':
    # python3 tools/profile.py [层数] [低头角度] [文件名后缀]
    if len(sys.argv) > 2: PITCH = float(sys.argv[2])
    if len(sys.argv) > 3: TAG = sys.argv[3]
    write()
