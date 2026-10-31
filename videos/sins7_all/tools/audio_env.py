#!/usr/bin/env python3
"""音频驱动的包络：python3 tools/audio_env.py → audio_env.json；并把高音的细碎重音写进 beats_extended.json 的 hats[]
   逐帧（30fps）三个频段：低音 40–150Hz（鼓点）、中音 150–2000Hz、高音 4000Hz 以上（镲片），各自归一化到 0–1
   高音频段做频谱通量的起音检测，得到 hats（时间，秒）"""
import json, os, subprocess
import numpy as np
from scipy.signal import stft, find_peaks
PROJ = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SR, FPS = 44100, 30
raw = subprocess.run(['ffmpeg', '-v', 'error', '-i', os.path.join(PROJ, 'music_extended.wav'), '-ac', '1', '-f', 'f32le', '-'], check=True, capture_output=True).stdout
x = np.frombuffer(raw, dtype=np.float32)
hop = SR // FPS // 2                                   # 每帧两次，再平均成 30fps
f, t, Z = stft(x, SR, nperseg=4096, noverlap=4096 - hop, boundary='zeros')
M = np.abs(Z)
def band(lo, hi):
    e = np.sqrt((M[(f >= lo) & (f < hi)] ** 2).sum(0))
    e = np.log1p(e / np.median(e[e > 0]) * 4)
    return e
def norm01(e):
    lo, hi = np.quantile(e, 0.05), np.quantile(e, 0.995)
    return np.clip((e - lo) / (hi - lo + 1e-9), 0, 1)
n = int(np.ceil(len(x) / SR * FPS))
def to_frames(e):
    tt = np.arange(n) / FPS
    return np.interp(tt, t, e)
low, mid, high = [norm01(to_frames(band(*b))) for b in [(40, 150), (150, 2000), (4000, 16000)]]
# 低音的「瞬态」：鼓点打下去时的冲击（包络减去慢速平均，再归一化）——用于弹动
def transient(e, k=9):
    sm = np.convolve(e, np.ones(k) / k, 'same')
    return np.clip((e - sm) / (np.quantile(e - sm, 0.995) + 1e-9), 0, 1)
kick = transient(low)
# 高音起音
hb = band(4000, 16000); flux = np.maximum(0, np.diff(hb, prepend=hb[0])); flux /= flux.max()
pk, _ = find_peaks(flux, height=0.12, distance=int(0.09 * SR / hop))
hats = [round(float(t[p]), 4) for p in pk]
r = lambda a: [round(float(v), 3) for v in a]
json.dump({'fps': FPS, 'low': r(low), 'mid': r(mid), 'high': r(high), 'kick': r(kick)}, open(os.path.join(PROJ, 'audio_env.json'), 'w'))
bj = json.load(open(os.path.join(PROJ, 'beats_extended.json'))); bj['hats'] = hats
json.dump(bj, open(os.path.join(PROJ, 'beats_extended.json'), 'w'), ensure_ascii=False, indent=1)
print('frames', n, 'hats', len(hats), 'first hats', hats[:12])
print('low mean', low.mean().round(3), 'mid mean', mid.mean().round(3), 'high mean', high.mean().round(3))
