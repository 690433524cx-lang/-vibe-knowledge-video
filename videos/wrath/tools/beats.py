# 测节拍：python3 tools/beats.py
# 输出 beats_wrath.json（bpm、beat、拍点、小节第一拍、鼓点进入的位置、淡出）和节拍图 output/wrath/beats_wrath.png
import json, os
import numpy as np
from scipy.io import wavfile
from scipy.signal import stft, find_peaks

HERE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sr, x = wavfile.read(os.path.join(HERE, 'music.wav'))
x = x.astype(np.float64); x = x.mean(1) if x.ndim > 1 else x
x /= np.abs(x).max() + 1e-9
dur = len(x) / sr

hop = int(sr * 0.005); f, t, Z = stft(x, sr, nperseg=1024, noverlap=1024 - hop)
M = np.abs(Z)
def flux(band):
    e = np.log(1e-6 + M[band].sum(0)); d = np.diff(e, prepend=e[0]); d[d < 0] = 0; return d
fa = flux((f > 30)); fl = flux((f > 30) & (f < 150)); fh = flux(f > 4000)
rms_low = np.sqrt((M[(f > 30) & (f < 150)] ** 2).sum(0)); rms_all = np.sqrt((M ** 2).sum(0))
dt = t[1] - t[0]

# ---- 速度：在 160–195 BPM 之间用自相关找周期，再在整段上细调相位（把拍点对齐到谱通量的峰）
env = fa - np.convolve(fa, np.ones(40) / 40, 'same'); env[env < 0] = 0
def score(period, phase):
    ts = np.arange(phase, dur - 0.05, period); idx = np.clip(np.round(ts / dt).astype(int), 0, len(env) - 1)
    return env[idx].mean()
best = (0, 0, 0)
for bpm in np.arange(100, 122, 0.01):   # librosa 与自相关都指向约 110 BPM（不是 177）
    p = 60 / bpm
    for ph in np.arange(0, p, 0.004):
        s = score(p, ph)
        if s > best[0]: best = (s, p, ph)
_, P, PH = best
beats = np.arange(PH, dur - 0.02, P)
# 每一拍再在 ±25 ms 内贴到最近的谱通量峰（只在主段有清楚鼓点时）
def snap(tb, w=0.025):
    k0, k1 = int((tb - w) / dt), int((tb + w) / dt) + 1
    k0 = max(0, k0); k1 = min(len(fa) - 1, k1)
    k = k0 + int(np.argmax(fa[k0:k1])); return t[k] if fa[k] > np.percentile(fa, 90) else tb

# ---- 鼓点进入：低频能量（1 秒平滑）在 10–25 秒之间跳得最猛的那一拍
lowS = np.convolve(rms_low, np.ones(100) / 100, 'same')
cand = [b for b in beats if 10 < b < 25]
jump = [(lowS[min(len(lowS) - 1, int((b + 0.6) / dt))] - lowS[int((b - 0.6) / dt)], b) for b in cand]
drop = max(jump)[1]

# ---- 小节第一拍：4 拍一小节，相位取让鼓点进入那一拍成为第一拍、并且低频重音最强的那一组
bi = int(round((drop - PH) / P))
best_ph, best_s = 0, -1
for ph in range(4):
    s = sum(fl[int(beats[i] / dt)] for i in range(ph, len(beats), 4) if i < len(beats))
    s += 1e3 if (bi - ph) % 4 == 0 else 0
    if s > best_s: best_s, best_ph = s, ph
downs = beats[best_ph::4]

# 淡出：整体能量最后降到主段一半以下的位置
allS = np.convolve(rms_all, np.ones(60) / 60, 'same'); main = np.median(allS[int(drop / dt):int((dur - 3) / dt)])
fade = next((t[k] for k in range(len(allS) - 1, 0, -1) if allS[k] > main * 0.5), dur - 1)

hats_idx, _ = find_peaks(fh, height=np.percentile(fh, 93), distance=int(0.06 / dt)); hats = t[hats_idx]
out = dict(bpm=round(60 / P, 3), beat=round(P, 5), duration=round(dur, 3), beats=[round(b, 4) for b in beats],
           downbeats=[round(b, 4) for b in downs], drop=round(float(drop), 4), fade_start=round(float(fade), 3),
           first_hit=round(float(t[int(np.argmax(fa[:int(0.3 / dt)]))]), 4), hats=[round(float(h), 4) for h in hats])
json.dump(out, open(os.path.join(HERE, 'beats_wrath.json'), 'w'), ensure_ascii=False, indent=1)

# 音频包络（30fps）：低 / 中 / 高 / 鼓点
fps = 30; T = np.arange(0, dur, 1 / fps)
def env30(band):
    e = np.sqrt((M[band] ** 2).sum(0)); e = np.interp(T, t, e); e = e / (np.percentile(e, 98) + 1e-9); return np.clip(e, 0, 1.5).round(4).tolist()
kick = np.interp(T, t, fl); kick = (kick / (np.percentile(kick, 99) + 1e-9)).clip(0, 1.5).round(4).tolist()
json.dump(dict(fps=fps, low=env30((f > 40) & (f < 150)), mid=env30((f > 150) & (f < 2000)), high=env30(f > 4000), kick=kick),
          open(os.path.join(HERE, 'audio_env.json'), 'w'))
print(json.dumps({k: out[k] for k in ['bpm', 'beat', 'duration', 'drop', 'fade_start', 'first_hit']}, ensure_ascii=False))
print('前 10 拍', out['beats'][:10]); print('小节第一拍', out['downbeats'][:16])

# ---- 节拍图
import matplotlib; matplotlib.use('Agg'); import matplotlib.pyplot as plt
plt.rcParams['font.sans-serif'] = ['Noto Sans CJK SC', 'Noto Serif CJK SC']; plt.rcParams['axes.unicode_minus'] = False
fig, ax = plt.subplots(2, 1, figsize=(18, 7), facecolor='#0A0303')
for a in ax: a.set_facecolor('#140606'); a.tick_params(colors='#FFB199'); [s.set_color('#552222') for s in a.spines.values()]
ax[0].plot(t, allS / allS.max(), color='#FF2A2A', lw=1, label='整体能量'); ax[0].plot(t, lowS / lowS.max(), color='#FFB199', lw=1, label='低频（鼓）')
for b in downs: ax[0].axvline(b, color='#FF2A2A', alpha=0.35, lw=0.8)
ax[0].axvline(drop, color='white', lw=2.5); ax[0].text(drop + 0.2, 0.92, f'鼓点进入 {drop:.3f}s', color='white', fontsize=14)
ax[0].axvspan(fade, dur, color='#FF2A2A', alpha=0.12); ax[0].text(fade - 4.5, 0.06, f'淡出 {fade:.2f}s →', color='#FFB199', fontsize=11)
ax[0].set_xlim(0, dur); ax[0].legend(facecolor='#140606', labelcolor='#FFB199', loc='upper left')
ax[0].set_title(f'愤怒 · 音乐  {60 / P:.2f} BPM  一拍 {P:.4f}s  一小节 {4 * P:.4f}s  总长 {dur:.2f}s', color='white', fontsize=15)
w0, w1 = drop - 3, drop + 3; m = (t > w0) & (t < w1)
ax[1].plot(t[m], fa[m] / fa[m].max(), color='#FF8866', lw=1)
for b in beats[(beats > w0) & (beats < w1)]: ax[1].axvline(b, color='#FFB199', alpha=0.5, lw=0.8)
for b in downs[(downs > w0) & (downs < w1)]: ax[1].axvline(b, color='#FF2A2A', lw=2)
ax[1].axvline(drop, color='white', lw=2.5); ax[1].set_xlim(w0, w1)
ax[1].set_title('放大：鼓点进入前后 ±3 秒（细线 = 拍点，粗红线 = 小节第一拍，白线 = 鼓点进入）', color='white', fontsize=12)
os.makedirs(os.path.join(HERE, '../../output/wrath'), exist_ok=True)
plt.tight_layout(); plt.savefig(os.path.join(HERE, '../../output/wrath/beats_wrath.png'), dpi=110, facecolor='#0A0303')
