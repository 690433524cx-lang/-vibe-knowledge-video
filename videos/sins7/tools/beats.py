#!/usr/bin/env python3
"""测节拍：python3 tools/beats.py [音乐文件]       （默认 ../../音乐.mp4，也会在项目目录与仓库根目录里找）
   1. ffmpeg 从第 0 秒原样提取 music.wav（44.1 kHz 立体声，不偏移）
   2. 起音包络（频谱通量）→ 自相关测速度 → 网格相位 → 每拍在 ±40 ms 内对齐到起音峰
   3. 重拍：四个相位里低频（底鼓）通量最强的一组；R0 取离 7.66 秒最近的重拍
   4. 段落：按小节比较能量与音色的突变；淡出：最后一段持续下降的起点；结束：最后一个高于 -50 dB 的时刻
   输出 beats.json 与节拍示意图 output/sins7/beats.png
   python3 tools/beats.py --reference   只按粗测值生成占位的 beats.json（没有音乐文件时用）
"""
import json, os, subprocess, sys
import numpy as np
from PIL import Image, ImageDraw, ImageFont

HERE = os.path.dirname(os.path.abspath(__file__))
PROJ = os.path.dirname(HERE)
ROOT = os.path.abspath(os.path.join(PROJ, '../..'))
OUT_JSON = os.path.join(PROJ, 'beats.json')
OUT_PNG = os.path.join(ROOT, 'output/sins7/beats.png')
SR, HOP, NFFT = 44100, 441, 2048          # 10 ms 一帧
R0_GUESS = 7.66


def reference():
    beats = [round(1.66 + 0.5 * i, 3) for i in range(0, 77)]           # 1.66 … 39.66
    down = [b for b in beats if abs(((b - R0_GUESS) / 2.0) - round((b - R0_GUESS) / 2.0)) < 1e-6]
    R = [b for b in down if b >= R0_GUESS - 1e-6]
    return dict(source='reference', bpm=120.0, period=0.5, firstNote=1.66, beats=beats, downbeats=down, R=R,
                sections=[1.66, R0_GUESS, 35.66], fadeStart=37.5, end=40.0, duration=40.0)


def load(src):
    wav = os.path.join(PROJ, 'music.wav')
    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', src, '-vn', '-ac', '2', '-ar', str(SR), '-c:a', 'pcm_s16le', wav], check=True)
    raw = subprocess.run(['ffmpeg', '-v', 'error', '-i', wav, '-ac', '1', '-f', 'f32le', '-'], check=True, capture_output=True).stdout
    return wav, np.frombuffer(raw, dtype=np.float32).copy()


def stft_mag(x):
    win = np.hanning(NFFT).astype(np.float32)
    n = 1 + max(0, (len(x) - NFFT) // HOP)
    pad = np.pad(x, (NFFT // 2, NFFT // 2))
    frames = np.lib.stride_tricks.sliding_window_view(pad, NFFT)[::HOP][:n + 1]
    return np.abs(np.fft.rfft(frames * win, axis=1)).astype(np.float32)


def analyse(x):
    M = stft_mag(x)
    freqs = np.fft.rfftfreq(NFFT, 1 / SR)
    L = np.log1p(100 * M)
    flux = np.maximum(0, np.diff(L, axis=0, prepend=L[:1])).sum(1)
    low = np.maximum(0, np.diff(L[:, freqs < 150], axis=0, prepend=L[:1, freqs < 150])).sum(1)
    sm = lambda v, k: np.convolve(v, np.ones(k) / k, mode='same')
    onset = np.maximum(0, flux - sm(flux, 31)); onset /= onset.max() + 1e-9
    lowo = np.maximum(0, low - sm(low, 31)); lowo /= lowo.max() + 1e-9
    rms = np.sqrt(sm(x.astype(np.float64) ** 2, HOP)[::HOP][:len(onset)] + 1e-12)
    db = 20 * np.log10(rms / rms.max())
    fps = SR / HOP
    t = np.arange(len(onset)) / fps
    first = float(t[np.argmax(db > -40)])
    end = float(t[len(db) - 1 - np.argmax(db[::-1] > -50)])
    # 速度：起音包络的自相关，60–180 BPM，偏向 120
    ac = np.correlate(onset, onset, mode='full')[len(onset) - 1:]
    lags = np.arange(len(ac)) / fps
    ok = (lags > 60 / 180) & (lags < 1.0)
    w = np.exp(-0.5 * (np.log2(60 / np.maximum(lags, 1e-3) / 120) / 0.6) ** 2)
    lag0 = lags[ok][np.argmax((ac * w)[ok])]
    # 周期与相位精调：在 ±2% 内找让「拍点上的起音总和」最大的周期和起点
    best = (-1, 0, 0)
    for P in np.linspace(lag0 * 0.98, lag0 * 1.02, 81):
        for ph in np.arange(0, P, 0.005):
            bt = np.arange(first + ph, end, P)
            idx = np.clip((bt * fps).round().astype(int), 0, len(onset) - 1)
            s = onset[idx].sum() / len(idx)
            if s > best[0]: best = (s, P, ph)
    _, P, ph = best
    grid = np.arange(first + ph - P * np.floor(ph / P), end + 1e-6, P)
    # 每一拍在 ±40 ms 内对齐到起音峰（只在峰足够明显时移动）
    beats = []
    for b in grid:
        i0, i1 = int((b - 0.04) * fps), int((b + 0.04) * fps) + 1
        seg = onset[max(0, i0):i1]
        if len(seg) and seg.max() > 0.25: beats.append(round((max(0, i0) + int(seg.argmax())) / fps, 3))
        else: beats.append(round(float(b), 3))
    beats = [b for b in beats if b >= first - 0.02]
    # 重拍：四个相位里低频起音最强的一组
    lowE = np.log1p(100 * M[:, freqs < 150].sum(1)); lowE = (lowE - lowE.min()) / (np.ptp(lowE) + 1e-9)
    def score(k):
        # 拍点后 100 ms 内的低频能量（底鼓）加低频起音
        bs = beats[k::4]
        return float(np.mean([lowE[int(b * fps):int(b * fps) + 10].mean() + lowo[int(b * fps):int(b * fps) + 4].max() for b in bs]))
    sc = [score(k) for k in range(4)]
    k = int(np.argmax(sc))
    down = beats[k::4]
    r0 = int(np.argmin([abs(d - R0_GUESS) for d in down]))
    R = down[r0:]
    # 段落：按小节比较响度与 12 段频带包络的变化
    bands = np.array_split(np.arange(M.shape[1]), 12)
    feat = np.stack([L[:, b].mean(1) for b in bands], 1)
    bars = down
    vec = []
    for a, b in zip(bars[:-1], bars[1:]):
        i0, i1 = int(a * fps), int(b * fps)
        vec.append(np.r_[feat[i0:i1].mean(0), db[i0:i1].mean() / 10])
    vec = np.array(vec)
    nov = [0] + [float(np.linalg.norm(vec[i] - vec[i - 1])) for i in range(1, len(vec))]
    thr = np.mean(nov) + 1.0 * np.std(nov)
    sections = [round(first, 3)] + [bars[i] for i in range(1, len(nov)) if nov[i] > thr]
    # 淡出：从结尾往前，找响度持续下降的起点（以前 70% 小节的中位响度为基准，低于它 3 dB 起算）
    base = np.median(db[int(first * fps):int((first + 0.7 * (end - first)) * fps)])
    sm_db = sm(db, 50)
    i = len(sm_db) - 1
    while i > 0 and (sm_db[i] < base - 3 or t[i] > end): i -= 1
    fade = float(t[i])
    return dict(source='measured', bpm=round(60 / P, 2), period=round(float(P), 4), firstNote=round(first, 3), beats=beats,
                downbeats=down, R=R, sections=sections, fadeStart=round(fade, 3), end=round(end, 3), duration=round(len(x) / SR, 3),
                phaseScores=[round(float(s), 3) for s in sc]), (t, onset, lowo, db)


def plot(d, env=None, x=None):
    W, H = 2400, 760
    im = Image.new('RGB', (W, H), (8, 8, 12)); g = ImageDraw.Draw(im)
    try: font = ImageFont.truetype('/usr/share/fonts/opentype/noto/NotoSansCJK-Regular.ttc', 22); big = ImageFont.truetype('/usr/share/fonts/opentype/noto/NotoSansCJK-Bold.ttc', 30)
    except Exception: font = big = ImageFont.load_default()
    T = max(d['duration'], 41)
    X = lambda s: 60 + (W - 120) * s / T
    if x is not None:
        n = W - 120; step = max(1, len(x) // n)
        for i in range(n):
            seg = x[i * step:(i + 1) * step]
            if len(seg): a = float(np.abs(seg).max()); g.line([(60 + i, 200 - a * 110), (60 + i, 200 + a * 110)], fill=(70, 70, 95))
    if env is not None:
        t, onset, lowo, db = env
        pts = [(X(tt), 520 - 150 * o) for tt, o in zip(t[::2], onset[::2])]; g.line(pts, fill=(120, 200, 255), width=1)
        pts = [(X(tt), 520 - 150 * o) for tt, o in zip(t[::2], lowo[::2])]; g.line(pts, fill=(255, 140, 80), width=1)
    for s in range(0, int(T) + 1):
        g.line([(X(s), 680), (X(s), 690)], fill=(120, 120, 140)); g.text((X(s) - 8, 694), str(s), fill=(150, 150, 170), font=font)
    for b in d['beats']: g.line([(X(b), 330), (X(b), 380)], fill=(90, 160, 110), width=2)
    for i, b in enumerate(d['R']):
        g.line([(X(b), 60), (X(b), 640)], fill=(255, 210, 90), width=3)
        g.text((X(b) + 4, 62), f'R{i}', fill=(255, 220, 120), font=font); g.text((X(b) + 4, 88), f'{b:.2f}', fill=(220, 200, 150), font=font)
    g.line([(X(d['firstNote']), 40), (X(d['firstNote']), 660)], fill=(120, 220, 255), width=3)
    g.text((X(d['firstNote']) + 4, 600), f"第一个音 {d['firstNote']:.2f}", fill=(140, 220, 255), font=font)
    g.rectangle([X(d['fadeStart']), 40, X(d['end']), 660], outline=(255, 90, 120), width=3)
    g.text((X(d['fadeStart']) + 6, 610), f"淡出 {d['fadeStart']:.2f}–{d['end']:.2f}", fill=(255, 120, 150), font=font)
    for s in d['sections'][1:]: g.text((X(s) - 30, 395), '◆段落', fill=(200, 160, 255), font=font)
    g.text((60, 6), f"节拍  {d['bpm']} BPM · 一拍 {d['period']} 秒 · 重拍 {len(d['R'])} 个（R0={d['R'][0]:.2f}）· 来源：{'实测' if d['source'] == 'measured' else '粗测参考值（占位）'}", fill=(235, 235, 245), font=big)
    g.text((W - 700, 430), '蓝：起音包络  橙：低频（底鼓）  绿：每一拍  黄：重拍', fill=(170, 170, 190), font=font)
    os.makedirs(os.path.dirname(OUT_PNG), exist_ok=True); im.save(OUT_PNG)


def main():
    if '--reference' in sys.argv:
        d = reference(); plot(d)
    else:
        args = [a for a in sys.argv[1:] if not a.startswith('--')]
        cands = args or [os.path.join(ROOT, '音乐.mp4'), os.path.join(PROJ, '音乐.mp4'), os.path.join(ROOT, 'assets/音乐.mp4')]
        src = next((c for c in cands if os.path.exists(c)), None)
        if not src: sys.exit('找不到音乐文件：' + '、'.join(cands))
        wav, x = load(src)
        d, env = analyse(x); d['file'] = os.path.relpath(src, ROOT)
        plot(d, env, x)
    with open(OUT_JSON, 'w') as f: json.dump(d, f, ensure_ascii=False, indent=1)
    print(json.dumps({k: v for k, v in d.items() if k not in ('beats', 'downbeats')}, ensure_ascii=False))
    print('beats.json →', OUT_JSON, '\n示意图 →', OUT_PNG)


if __name__ == '__main__':
    main()
