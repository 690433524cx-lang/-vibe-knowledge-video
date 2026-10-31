#!/usr/bin/env python3
"""按小节把 41 秒的音乐延长到约 65 秒：python3 tools/extend_music.py
   段 A：歌曲 [R0 − 4.0 秒, 歌曲 R14) → 视频 0 起（歌曲 R0 落在视频 4.0 秒）
   段 B：歌曲 [R0, R14) 再接一遍（14 小节）；A→B 的接口在重拍上，30 毫秒等功率交叉淡化
   段 C：歌曲 R14 之后的结尾（和 B 的结尾是连续的同一段音频，无需拼接），自然淡出
   输出 music_extended.wav、beats_extended.json、output/sins7_all/beats_extended.png"""
import json, os, subprocess
import numpy as np
from PIL import Image, ImageDraw, ImageFont
HERE = os.path.dirname(os.path.abspath(__file__)); PROJ = os.path.dirname(HERE); ROOT = os.path.abspath(os.path.join(PROJ, '../..'))
SRC = os.path.join(ROOT, 'videos/sins7')
SR = 44100
bt = json.load(open(os.path.join(SRC, 'beats.json')))
raw = subprocess.run(['ffmpeg', '-v', 'error', '-i', os.path.join(SRC, 'music.wav'), '-f', 's16le', '-ac', '2', '-ar', str(SR), '-'], check=True, capture_output=True).stdout
x = np.frombuffer(raw, dtype=np.int16).reshape(-1, 2).astype(np.float32) / 32768
R = bt['R']; R0s, R14s = R[0], R[14]
start = R0s - 4.0
S = lambda t: int(round(t * SR))
h = S(0.015); XF = 2 * h
A = x[S(start):S(R14s)]
B = x[S(R0s):S(R14s)]
C = x[S(R14s):]
# 接口：A 的末尾和 B 的开头各多取 15 毫秒，在接口两侧 30 毫秒内等功率交叉

a_tail = x[S(R14s) - h:S(R14s) + h]          # A 原本接下去的声音
b_head = x[S(R0s) - h:S(R0s) + h]            # B 从 R0 前 15 毫秒开始
w = np.linspace(0, np.pi / 2, XF)[:, None]
mix = a_tail * np.cos(w) + b_head * np.sin(w)
y = np.vstack([A[:-h], mix, B[h:], C])
# B 的结尾（歌曲 R14 之前）和 C（歌曲 R14 之后）是原曲里连续的音频，不需要淡化
out = os.path.join(PROJ, 'music_extended.wav')
subprocess.run(['ffmpeg', '-v', 'error', '-y', '-f', 's16le', '-ar', str(SR), '-ac', '2', '-i', '-', out], input=(np.clip(y, -1, 1) * 32767).astype(np.int16).tobytes(), check=True)
# 节拍映射
tA0 = 0.0; tB0 = R14s - start; tC0 = tB0 + (R14s - R0s)
def mapbeats(lst):
    o = []
    for b in lst:
        if start - 1e-6 <= b < R14s - 1e-6: o.append(b - start)
    for b in lst:
        if R0s - 1e-6 <= b < R14s - 1e-6: o.append(tB0 + b - R0s)
    for b in lst:
        if b >= R14s - 1e-6: o.append(tC0 + b - R14s)
    return [round(v, 4) for v in sorted(o)]
beats = mapbeats(bt['beats']); down = mapbeats(bt['downbeats'])
RR = [d for d in down if d >= 4.0 - 0.05]
hits = [round(h_ - start, 4) for g in bt['intro_groups'] for h_ in g if h_ >= start]
d = dict(bpm=bt['bpm'], beat=bt['beat'], beats=beats, downbeats=down, R=RR, splice=round(tB0, 4), splice_song=[R14s, R0s],
         tail_start=round(tC0, 4), fade_start=round(tC0 + bt['fade_start'] - R14s, 3), end=round(tC0 + bt['end'] - R14s, 3), duration=round(len(y) / SR, 3),
         song_offset=round(start, 4), intro_hits=hits)
json.dump(d, open(os.path.join(PROJ, 'beats_extended.json'), 'w'), ensure_ascii=False, indent=1)
# 示意图
W, H = 2600, 760
im = Image.new('RGB', (W, H), (8, 8, 12)); g = ImageDraw.Draw(im)
f = ImageFont.truetype('/usr/share/fonts/opentype/noto/NotoSansCJK-Regular.ttc', 20); big = ImageFont.truetype('/usr/share/fonts/opentype/noto/NotoSansCJK-Bold.ttc', 28)
T = d['duration'] + 0.5; X = lambda s: 50 + (W - 100) * s / T
mono = y.mean(1); step = len(mono) // (W - 100)
for i in range(W - 100):
    a = float(np.abs(mono[i * step:(i + 1) * step]).max()); g.line([(50 + i, 230 - a * 120), (50 + i, 230 + a * 120)], fill=(70, 70, 95))
g.rectangle([X(0), 380, X(tB0), 400], fill=(80, 120, 200)); g.text((X(0) + 4, 404), f'段 A：歌曲 {start:.2f}–{R14s:.2f}', fill=(150, 180, 240), font=f)
g.rectangle([X(tB0), 380, X(tC0), 400], fill=(200, 140, 80)); g.text((X(tB0) + 4, 404), f'段 B：歌曲 {R0s:.2f}–{R14s:.2f}（重复）', fill=(240, 190, 140), font=f)
g.rectangle([X(tC0), 380, X(d['duration']), 400], fill=(120, 200, 120)); g.text((X(tC0) + 4, 404), f'段 C：歌曲 {R14s:.2f}–结尾', fill=(160, 230, 160), font=f)
for b in beats: g.line([(X(b), 450), (X(b), 480)], fill=(90, 160, 110), width=2)
for i, r in enumerate(RR):
    g.line([(X(r), 60), (X(r), 520)], fill=(255, 210, 90), width=2)
    if i % 2 == 0 or i < 2: g.text((X(r) + 3, 62 + (i % 4 // 2) * 22), f'R{i} {r:.2f}', fill=(255, 220, 120), font=f)
g.line([(X(tB0), 40), (X(tB0), 560)], fill=(255, 80, 120), width=4); g.text((X(tB0) + 6, 530), f'拼接点 {tB0:.3f} 秒（歌曲 {R14s:.3f} → {R0s:.3f}，30ms 交叉淡化）', fill=(255, 120, 150), font=f)
for s in range(0, int(T) + 1, 2):
    g.line([(X(s), 690), (X(s), 700)], fill=(120, 120, 140)); g.text((X(s) - 8, 704), str(s), fill=(150, 150, 170), font=f)
g.rectangle([X(d['fade_start']), 40, X(d['end']), 640], outline=(255, 90, 120), width=3); g.text((X(d['fade_start']) - 120, 600), f"淡出 {d['fade_start']:.2f}→{d['end']:.2f}", fill=(255, 120, 150), font=f)
g.text((50, 6), f"延长后的音乐 · 总长 {d['duration']:.2f} 秒 · R0={RR[0]:.3f} · R28={RR[28]:.3f} · R29={RR[29]:.3f}", fill=(235, 235, 245), font=big)
os.makedirs(os.path.join(ROOT, 'output/sins7_all'), exist_ok=True); im.save(os.path.join(ROOT, 'output/sins7_all/beats_extended.png'))
print(json.dumps({k: v for k, v in d.items() if k not in ('beats', 'downbeats', 'intro_hits')}, ensure_ascii=False))
