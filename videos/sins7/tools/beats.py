#!/usr/bin/env python3
"""测节拍：python3 tools/beats.py            （读 音乐.mp4，输出 beats.json 与 output/sins7/beats.png）
   1. ffmpeg 从第 0 秒原样提取 music.wav（立体声 44.1 kHz，合成用）；分析用单声道 44.1 kHz
   2. 频谱通量起音包络（STFT 2048 点、步长 128 点 ≈ 2.9 ms）→ 自相关测速度 → 网格相位
   3. 每一拍在 ±40 ms 内对齐到起音峰，峰位用抛物线插值到亚帧精度
   4. 重拍：四个相位分数接近时（四拍都有底鼓），以 7.66 秒附近最强的段落进入作为小节第一拍
   5. 前奏重音：R0 之前的起音峰（相邻至少 0.2 秒），按间隔 > 0.5 秒分组
   6. 淡出起点：响度持续低于主体中位响度 3 dB 的起点；结束：最后一个高于 -50 dB 的时刻
"""
import json, os, subprocess
import numpy as np
from scipy.signal import stft, find_peaks
from PIL import Image, ImageDraw, ImageFont

HERE = os.path.dirname(os.path.abspath(__file__)); PROJ = os.path.dirname(HERE); ROOT = os.path.abspath(os.path.join(PROJ, '../..'))
SRC, WAV = os.path.join(PROJ, '音乐.mp4'), os.path.join(PROJ, 'music.wav')
SR, HOP, NFFT, R0_GUESS = 44100, 128, 2048, 7.66


def load():
    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', SRC, '-vn', '-ac', '2', '-ar', str(SR), '-c:a', 'pcm_s16le', WAV], check=True)
    raw = subprocess.run(['ffmpeg', '-v', 'error', '-i', WAV, '-ac', '1', '-f', 'f32le', '-'], check=True, capture_output=True).stdout
    return np.frombuffer(raw, dtype=np.float32).copy()


def refine(env, i, fps):
    """峰位抛物线插值"""
    if 0 < i < len(env) - 1:
        a, b, c = env[i - 1], env[i], env[i + 1]; d = a - 2 * b + c
        if d < 0: return (i + 0.5 * (a - c) / d) / fps
    return i / fps


def analyse(x):
    f, t, Z = stft(x, SR, nperseg=NFFT, noverlap=NFFT - HOP, boundary=None, padded=False)
    fps = SR / HOP; t0 = NFFT / 2 / SR          # 第 k 帧的中心时间 = t0 + k / fps
    L = np.log1p(100 * np.abs(Z))
    flux = np.r_[0, np.maximum(0, np.diff(L, axis=1)).sum(0)]
    low = np.r_[0, np.maximum(0, np.diff(L[f < 150], axis=1)).sum(0)]
    sm = lambda v, k: np.convolve(v, np.ones(k) / k, mode='same')
    onset = np.maximum(0, flux - sm(flux, 101)); onset /= onset.max()
    lowo = np.maximum(0, low - sm(low, 101)); lowo /= lowo.max() + 1e-9
    T = t0 + np.arange(len(onset)) / fps
    rms = np.sqrt(sm(x.astype(np.float64) ** 2, HOP)[::HOP][:len(onset)] + 1e-12)
    db = 20 * np.log10(rms / rms.max())
    tm = np.arange(len(db)) * HOP / SR
    first = float(tm[np.argmax(db > -40)]); end = float(tm[len(db) - 1 - np.argmax(db[::-1] > -50)])
    # 速度
    ac = np.correlate(onset, onset, mode='full')[len(onset) - 1:]
    lags = np.arange(len(ac)) / fps; ok = (lags > 60 / 180) & (lags < 1.0)
    w = np.exp(-0.5 * (np.log2(60 / np.maximum(lags, 1e-3) / 120) / 0.6) ** 2)
    lag0 = lags[ok][np.argmax((ac * w)[ok])]
    best = (-1, 0, 0)
    for P in np.linspace(lag0 * 0.99, lag0 * 1.01, 81):
        for ph in np.arange(0, P, 0.002):
            bt = np.arange(first + ph, end, P); idx = np.clip(((bt - t0) * fps).round().astype(int), 0, len(onset) - 1)
            s = onset[idx].mean()
            if s > best[0]: best = (s, P, ph)
    _, P, ph = best
    grid = np.arange(first + ph, end + 1e-6, P)
    beats = []
    for b in grid:
        i0, i1 = int((b - 0.04 - t0) * fps), int((b + 0.04 - t0) * fps) + 1
        seg = onset[max(0, i0):i1]
        if len(seg) and seg.max() > 0.2: beats.append(round(t0 + refine(onset, max(0, i0) + int(seg.argmax()), fps), 4))
        else: beats.append(round(float(b), 4))
    # 用对齐后的拍点重新拟合等间距网格（拍长 = 线性回归斜率）
    k = np.arange(len(beats)); slope, icpt = np.polyfit(k, beats, 1)
    # 重拍相位
    lowE = np.log1p(100 * np.abs(Z[f < 150]).sum(0)); lowE = np.r_[lowE[:1], lowE]; lowE = (lowE - lowE.min()) / (np.ptp(lowE) + 1e-9)
    def score(kk):
        return float(np.mean([lowE[int((b - t0) * fps):int((b - t0) * fps) + 35].mean() + lowo[int((b - t0) * fps):int((b - t0) * fps) + 12].max() for b in beats[kk::4]]))
    sc = [score(kk) for kk in range(4)]; kk = int(np.argmax(sc))
    if max(sc) - sorted(sc)[-2] < 0.05 * max(sc):
        near = [i for i, b in enumerate(beats) if abs(b - R0_GUESS) < 0.8]
        jump = lambda b: db[int(b * SR / HOP):int(b * SR / HOP) + 40].mean() - db[int(b * SR / HOP) - 50:int(b * SR / HOP) - 8].mean()
        kk = max(near, key=lambda i: jump(beats[i])) % 4
    down = beats[kk::4]
    r0 = int(np.argmin([abs(d - R0_GUESS) for d in down])); R = down[r0:]
    # 前奏重音
    pk, _ = find_peaks(onset, height=0.3, distance=int(0.2 * fps))
    hits = [round(t0 + refine(onset, p, fps), 4) for p in pk if t0 + p / fps < R[0] - 0.05]
    groups = []
    for h in hits:
        if groups and h - groups[-1][-1] < 0.5: groups[-1].append(h)
        else: groups.append([h])
    # 淡出
    base = np.median(db[int(R[0] * SR / HOP):int(R[13] * SR / HOP)])
    sdb = sm(db, 340); i = len(sdb) - 1
    while i > 0 and (sdb[i] < base - 3 or tm[i] > end): i -= 1
    fade = float(tm[i])
    return dict(bpm=round(60 / slope, 3), beat=round(float(slope), 5), beats=beats, downbeats=down, R=R,
                intro_hits=hits, intro_groups=groups, first_note=round(first, 3), fade_start=round(fade, 3), end=round(end, 3),
                duration=round(len(x) / SR, 3), phase_scores=[round(s, 3) for s in sc]), (T, onset, lowo)


def plot(d, env, x):
    W, H = 2400, 820
    im = Image.new('RGB', (W, H), (8, 8, 12)); g = ImageDraw.Draw(im)
    font = ImageFont.truetype('/usr/share/fonts/opentype/noto/NotoSansCJK-Regular.ttc', 22); big = ImageFont.truetype('/usr/share/fonts/opentype/noto/NotoSansCJK-Bold.ttc', 30)
    T = 41.5; X = lambda s: 60 + (W - 120) * s / T
    n = W - 120; step = len(x) // n
    for i in range(n):
        a = float(np.abs(x[i * step:(i + 1) * step]).max()); g.line([(60 + i, 210 - a * 110), (60 + i, 210 + a * 110)], fill=(70, 70, 95))
    t, onset, lowo = env
    g.line([(X(a), 560 - 150 * o) for a, o in zip(t[::4], onset[::4])], fill=(120, 200, 255))
    for s in range(0, 42):
        g.line([(X(s), 740), (X(s), 750)], fill=(120, 120, 140)); g.text((X(s) - 8, 754), str(s), fill=(150, 150, 170), font=font)
    for b in d['beats']: g.line([(X(b), 350), (X(b), 395)], fill=(90, 160, 110), width=2)
    for gi, grp in enumerate(d['intro_groups']):
        for h in grp: g.line([(X(h), 600), (X(h), 640)], fill=(255, 120, 200), width=3)
        g.text((X(grp[0]), 646 + 26 * (gi % 2)), f'第{gi + 1}组 {grp[0]:.2f}–{grp[-1]:.2f}', fill=(255, 150, 210), font=font)
    for i, b in enumerate(d['R'][:16]):
        g.line([(X(b), 70), (X(b), 700)], fill=(255, 210, 90), width=3)
        g.text((X(b) + 4, 72), f'R{i}', fill=(255, 220, 120), font=font); g.text((X(b) + 4, 98), f'{b:.2f}', fill=(220, 200, 150), font=font)
    g.rectangle([X(d['fade_start']), 50, X(d['end']), 720], outline=(255, 90, 120), width=3)
    g.text((X(d['fade_start']) - 160, 690), f"淡出 {d['fade_start']:.2f} → 结束 {d['end']:.2f}", fill=(255, 120, 150), font=font)
    g.text((60, 8), f"实测  {d['bpm']} BPM · 一拍 {d['beat']} 秒 · R0={d['R'][0]:.3f} · R15={d['R'][15]:.3f}", fill=(235, 235, 245), font=big)
    g.text((W - 980, 405), '绿：每一拍   黄：重拍 R   粉：前奏重音   蓝：起音包络   红框：淡出', fill=(170, 170, 190), font=font)
    os.makedirs(os.path.join(ROOT, 'output/sins7'), exist_ok=True); im.save(os.path.join(ROOT, 'output/sins7/beats.png'))


if __name__ == '__main__':
    x = load(); d, env = analyse(x); plot(d, env, x)
    json.dump(d, open(os.path.join(PROJ, 'beats.json'), 'w'), ensure_ascii=False, indent=1)
    print(json.dumps({k: v for k, v in d.items() if k not in ('beats', 'downbeats')}, ensure_ascii=False))
