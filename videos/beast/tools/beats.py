#!/usr/bin/env python3
"""音乐节拍分析：python3 tools/beats.py [音乐文件=音乐_MBTI.mp4]
   1. 频谱通量 → 起音包络；自相关找节拍周期（70–180 BPM）
   2. 在整首上对齐一个等距网格（最大化网格上的起音能量），再逐拍在 ±40ms 内吸附到最近的起音峰
   3. 小节第一拍：每个拍位（模 4）上低频（< 150Hz，底鼓）能量的总和，最大的那个拍位是第一拍
   输出 beats.json（beat 周期、beats、downbeats）和 output/beast/beats.png"""
import json, os, subprocess, sys
import numpy as np
from PIL import Image, ImageDraw

HERE = os.path.dirname(os.path.abspath(__file__)); PROJ = os.path.dirname(HERE); ROOT = os.path.abspath(os.path.join(PROJ, '../..'))
src = os.path.join(PROJ, sys.argv[1] if len(sys.argv) > 1 else '音乐_MBTI.mp4')
SR = 22050
raw = subprocess.run(['ffmpeg', '-v', 'error', '-i', src, '-f', 's16le', '-ac', '1', '-ar', str(SR), '-'], check=True, capture_output=True).stdout
x = np.frombuffer(raw, dtype=np.int16).astype(np.float32) / 32768
dur = len(x) / SR
N, H = 2048, 256
nf = 1 + (len(x) - N) // H
win = np.hanning(N).astype(np.float32)
frames = np.lib.stride_tricks.as_strided(x, shape=(nf, N), strides=(x.strides[0] * H, x.strides[0]))
S = np.abs(np.fft.rfft(frames * win, axis=1))
freqs = np.fft.rfftfreq(N, 1 / SR)
L = np.log1p(S * 10)
flux = np.maximum(0, np.diff(L, axis=0)).sum(axis=1); flux = np.concatenate([[0], flux])
low = np.maximum(0, np.diff(L[:, freqs < 150], axis=0)).sum(axis=1); low = np.concatenate([[0], low])
fr = SR / H
def norm(v):
    v = v - np.convolve(v, np.ones(16) / 16, mode='same'); v = np.maximum(v, 0); return v / (v.max() + 1e-9)
on, lo = norm(flux), norm(low)
# 节拍周期：起音包络的自相关
ac = np.correlate(on, on, mode='full')[len(on) - 1:]
lags = np.arange(len(ac)) / fr
ok = (lags > 60 / 180) & (lags < 60 / 70)
# 偏好 90–140 BPM
w = np.exp(-0.5 * ((60 / np.maximum(lags, 1e-3) - 118) / 40) ** 2)
lag0 = np.argmax(np.where(ok, ac * w, 0))
# 抛物线细化
y0, y1, y2 = ac[lag0 - 1], ac[lag0], ac[lag0 + 1]
P = (lag0 + 0.5 * (y0 - y2) / (y0 - 2 * y1 + y2)) / fr
# 在周期 ±1% 和相位上搜索等距网格
t_on = lambda t: np.interp(t * fr, np.arange(len(on)), on)
best = (-1, P, 0)
for p in np.linspace(P * 0.99, P * 1.01, 81):
    for ph in np.linspace(0, p, 120, endpoint=False):
        g = np.arange(ph, dur, p); sc = t_on(g).sum()
        if sc > best[0]: best = (sc, p, ph)
_, P, ph = best
grid = np.arange(ph, dur - 0.05, P)
# 吸附到 ±40ms 内的起音峰
beats = []
for g in grid:
    a, b = int((g - 0.04) * fr), int((g + 0.04) * fr) + 1
    a = max(a, 0); seg = on[a:b]
    if len(seg) and seg.max() > 0.25: beats.append((a + int(np.argmax(seg))) / fr * 0.5 + g * 0.5)
    else: beats.append(g)
beats = np.array(beats)
# 小节第一拍
score = [sum(np.interp(beats[k::4] * fr, np.arange(len(lo)), lo)) for k in range(4)]
k0 = int(np.argmax(score))
down = beats[k0::4]
bpm = 60 / P
out = {'file': os.path.basename(src), 'duration': round(dur, 3), 'bpm': round(bpm, 3), 'beat': round(P, 5),
       'beats': [round(float(b), 4) for b in beats], 'downbeats': [round(float(b), 4) for b in down], 'downbeatScore': [round(s, 2) for s in score]}
json.dump(out, open(os.path.join(PROJ, 'beats.json'), 'w'), indent=1)
print(f'时长 {dur:.2f}s  {bpm:.2f} BPM  拍长 {P:.4f}s  拍位得分 {np.round(score, 1)} → 第一拍在拍位 {k0}')
print('小节第一拍：', ' '.join(f'{d:.3f}' for d in down[:12]))
# 图：起音包络、低频包络、拍点、小节线
os.makedirs(os.path.join(ROOT, 'output/beast'), exist_ok=True)
W, Hh = 1800, 360; im = Image.new('RGB', (W, Hh), (10, 10, 16)); dr = ImageDraw.Draw(im)
T = min(dur, 16.0)
X = lambda t: int(t / T * W)
for b in beats:
    if b < T: dr.line([(X(b), 0), (X(b), Hh)], fill=(60, 60, 90))
for d in down:
    if d < T: dr.line([(X(d), 0), (X(d), Hh)], fill=(43, 227, 107), width=3); dr.text((X(d) + 4, 4), f'{d:.2f}', fill=(43, 227, 107))
for i in range(1, int(T * fr)):
    dr.line([(X((i - 1) / fr), 170 - on[i - 1] * 150), (X(i / fr), 170 - on[i] * 150)], fill=(200, 200, 220))
    dr.line([(X((i - 1) / fr), 350 - lo[i - 1] * 150), (X(i / fr), 350 - lo[i] * 150)], fill=(255, 194, 61))
im.save(os.path.join(ROOT, 'output/beast/beats.png'))
