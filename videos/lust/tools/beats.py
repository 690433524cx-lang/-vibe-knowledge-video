# 测节拍：python3 tools/beats.py
# 输出 beats_lust.json（bpm、beat、拍点、小节第一拍、鼓点进入的位置、淡出）和节拍图 output/lust/beats_lust.png
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
envs = fl + 0.3 * fa; env = envs - np.convolve(envs, np.ones(40) / 40, 'same'); env[env < 0] = 0   # 按低频鼓点（kick）定拍
def score(period, phase):
    ts = np.arange(phase, dur - 0.05, period); idx = np.clip(np.round(ts / dt).astype(int), 0, len(env) - 1)
    return env[idx].mean()
best = (0, 0, 0)
for bpm in np.arange(176.0, 181.0, 0.005):   # 色欲：约 178.6 BPM（半速 89）
    p = 60 / bpm
    for ph in np.arange(0, p, 0.002):
        s = score(p, ph)
        if s > best[0]: best = (s, p, ph)
_, P, PH = best
beats = np.arange(PH, dur - 0.02, P)
# 每一拍再在 ±25 ms 内贴到最近的谱通量峰（只在主段有清楚鼓点时）
def snap(tb, w=0.025):  # （未使用）
    k0, k1 = int((tb - w) / dt), int((tb + w) / dt) + 1
    k0 = max(0, k0); k1 = min(len(fa) - 1, k1)
    k = k0 + int(np.argmax(fa[k0:k1])); return t[k] if fa[k] > np.percentile(fa, 90) else tb

# ---- 鼓点进入：低频能量（1 秒平滑）在 10–25 秒之间跳得最猛的那一拍
lowS = np.convolve(rms_low, np.ones(100) / 100, 'same')
cand = [b for b in beats if 0 < b < 1]
jump = [(lowS[min(len(lowS) - 1, int((b + 0.6) / dt))] - lowS[int((b - 0.6) / dt)], b) for b in cand]
drop = float(beats[0])   # 色欲：没有“鼓点进入”，第 0 拍就是重拍

# ---- 小节第一拍：4 拍一小节，相位取让鼓点进入那一拍成为第一拍、并且低频重音最强的那一组
bi = int(round((drop - PH) / P))
best_ph, best_s = 0, -1
if True:   # 色欲：第 0 秒就是重拍 —— 第一拍就是第 0 小节的第一拍
    pass
for ph in range(4):
    s = sum(fl[int(beats[i] / dt)] for i in range(ph, len(beats), 4) if i < len(beats))
    s += 1e3 if (bi - ph) % 4 == 0 else 0
    if s > best_s: best_s, best_ph = s, ph
downs = beats[0::4]   # 第 0 小节从第一拍开始

# 淡出：整体能量最后降到主段一半以下的位置
allS = np.convolve(rms_all, np.ones(60) / 60, 'same'); main = np.median(allS[int(drop / dt):int((dur - 3) / dt)])
fade = next((t[k] for k in range(len(allS) - 1, 0, -1) if allS[k] > main * 0.5), dur - 1)


# ---- 急停：整体能量掉到 -30 dB 以下（相对 99 分位）的空白段；结束 = 音乐重新进来的那一拍（取最近的拍点）
db = 20 * np.log10(rms_all + 1e-9); db -= np.percentile(db, 99)
def gaps(t0, t1, thr=-30):
    q = (db < thr) & (t > t0) & (t < t1); out, k = [], 0
    while k < len(q):
        if q[k]:
            j = k
            while j < len(q) and q[j]: j += 1
            out.append((float(t[k]), float(t[j]))); k = j
        k += 1
    return out
def near_beat(x): return float(beats[np.argmin(np.abs(beats - x))])
g1 = [g for g in gaps(3.2, 4.2) if g[1] - g[0] > 0.005]
stop1 = dict(start=round(g1[0][0], 4), end_onset=round(g1[-1][1], 4), end=round(near_beat(g1[-1][1]), 4))
g2 = gaps(5.3, 7.2)   # 第二次：先整段断掉，再按三连音一开一关地“卡顿”，到下一小节第一拍整段回来
stop2 = dict(start=round(g2[0][0], 4), end_onset=round(g2[-1][1], 4), end=round(near_beat(g2[-1][1]), 4),
             chops=[[round(a, 4), round(b, 4)] for a, b in g2])

hats_idx, _ = find_peaks(fh, height=np.percentile(fh, 93), distance=int(0.06 / dt)); hats = t[hats_idx]
out = dict(bpm=round(60 / P, 3), beat=round(P, 5), duration=round(dur, 3), beats=[round(b, 4) for b in beats],
           downbeats=[round(b, 4) for b in downs], drop=round(float(drop), 4), fade_start=round(float(fade), 3),
           end=round(dur, 3), first_hit=round(float(t[int(np.argmax(fa[:int(0.3 / dt)]))]), 4), hats=[round(float(h), 4) for h in hats], stop1=stop1, stop2=stop2)
json.dump(out, open(os.path.join(HERE, 'beats_lust.json'), 'w'), ensure_ascii=False, indent=1)

# 音频包络（30fps）：低 / 中 / 高 / 鼓点
fps = 30; T = np.arange(0, dur, 1 / fps)
def env30(band):
    e = np.sqrt((M[band] ** 2).sum(0)); e = np.interp(T, t, e); e = e / (np.percentile(e, 98) + 1e-9); return np.clip(e, 0, 1.5).round(4).tolist()
kick = np.interp(T, t, fl); kick = (kick / (np.percentile(kick, 99) + 1e-9)).clip(0, 1.5).round(4).tolist()
json.dump(dict(fps=fps, low=env30((f > 40) & (f < 150)), mid=env30((f > 150) & (f < 2000)), high=env30(f > 4000), kick=kick),
          open(os.path.join(HERE, 'audio_env.json'), 'w'))
print(json.dumps({k: out[k] for k in ['bpm', 'beat', 'duration', 'drop', 'fade_start', 'first_hit']}, ensure_ascii=False))
print('STOP1', stop1); print('STOP2', stop2); print('前 10 拍', out['beats'][:10]); print('小节第一拍', out['downbeats'][:16])

# ---- 节拍图
import matplotlib; matplotlib.use('Agg'); import matplotlib.pyplot as plt
plt.rcParams['font.sans-serif'] = ['Noto Sans CJK SC', 'Noto Serif CJK SC']; plt.rcParams['axes.unicode_minus'] = False
END = float(beats[56]) if len(beats) > 56 else dur   # 第 14 小节结束（约 19 秒）
fig, ax = plt.subplots(2, 1, figsize=(18, 7.5), facecolor='#0A0306')
for a in ax: a.set_facecolor('#16060D'); a.tick_params(colors='#FFB3D1'); [s_.set_color('#4A0A26') for s_ in a.spines.values()]
ax[0].plot(t, allS / allS.max(), color='#FF3D8B', lw=1, label='整体能量'); ax[0].plot(t, lowS / lowS.max(), color='#FFB3D1', lw=1, label='低频（鼓）')
for i_, b in enumerate(downs):
    ax[0].axvline(b, color='#FF3D8B', alpha=0.35, lw=0.8)
    if b < END - 0.1: ax[0].text(b + 0.04, 1.02, str(i_), color='#FFB3D1', fontsize=8)
for st, lab in [(stop1, 'STOP1'), (stop2, 'STOP2')]:
    ax[0].axvspan(st['start'], st['end'], color='white', alpha=0.18)
    ax[0].text(st['start'], 0.80 if lab == 'STOP1' else 0.66, f"{lab}\n{st['start']:.3f}→{st['end']:.3f}s", color='white', fontsize=11)
ax[0].axvline(END, color='white', lw=2); ax[0].text(END - 2.6, 0.9, f'结尾（小节末）{END:.3f}s', color='white', fontsize=11)
ax[0].axvspan(END - 0.3, END, color='#FF3D8B', alpha=0.3)
ax[0].set_xlim(0, min(dur, END + 1.5)); ax[0].set_ylim(0, 1.1); ax[0].legend(facecolor='#16060D', labelcolor='#FFB3D1', loc='lower right')
ax[0].set_title(f'色欲 · 音乐  {60 / P:.2f} BPM（半速 {30 / P:.2f}）  一拍 {P:.4f}s  一小节 {4 * P:.4f}s  （数字 = 小节号，白色 = 急停）', color='white', fontsize=14)
w0, w1 = 2.6, 7.4; m = (t > w0) & (t < w1)
ax[1].plot(t[m], np.clip((db[m] + 60) / 60, 0, 1), color='#FF7AAE', lw=1)
for b in beats[(beats > w0) & (beats < w1)]: ax[1].axvline(b, color='#FFB3D1', alpha=0.5, lw=0.8)
for b in downs[(downs > w0) & (downs < w1)]: ax[1].axvline(b, color='#FF3D8B', lw=2)
for st, lab in [(stop1, 'STOP1'), (stop2, 'STOP2')]:
    ax[1].axvspan(st['start'], st['end'], color='white', alpha=0.15)
    ax[1].axvline(st['end'], color='white', lw=2.5); ax[1].text(st['end'] + 0.03, 0.05, f"{lab} 结束拍 {st['end']:.3f}", color='white', fontsize=11)
    ax[1].text(st['start'] + 0.02, 0.9, f"{lab} 开始 {st['start']:.3f}", color='white', fontsize=10)
for a_, b_ in stop2['chops']: ax[1].axvspan(a_, b_, color='#FF3D8B', alpha=0.25)
ax[1].set_xlim(w0, w1)
ax[1].set_title('放大 2.6–7.4 秒（响度 dB；细线 = 拍点，粗线 = 小节第一拍，粉色块 = STOP2 里的三连音卡顿空隙）', color='white', fontsize=12)
os.makedirs(os.path.join(HERE, '../../output/lust'), exist_ok=True)
plt.tight_layout(); plt.savefig(os.path.join(HERE, '../../output/lust/beats_lust.png'), dpi=110, facecolor='#0A0306')
