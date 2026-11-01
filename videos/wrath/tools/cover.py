# 第三集·愤怒 4:5 封面（1080×1350）：上方系列名 + 大标题“愤怒”，中间愤怒的脸（角、裂纹、红眼），底部钩子句
# 用法：python3 tools/cover.py 无字幕帧.png 输出.png   （无字幕帧：node tools/cover_frame.js 目录 3.6）
import sys
from PIL import Image, ImageDraw, ImageFilter, ImageFont
import numpy as np

src, out = sys.argv[1:3]
W, H = 1080, 1350
F = '/usr/share/fonts/opentype/noto/NotoSerifCJK-%s.ttc'
font = lambda w, s: ImageFont.truetype(F % w, s, index=0)

# 背景：近黑的暗红（和视频一致），中间一团很淡的红光
yy, xx = np.mgrid[0:H, 0:W].astype(np.float32)
g = np.exp(-(((xx - W / 2) / 560) ** 2 + ((yy - 700) / 520) ** 2))
bg = np.stack([10 + 34 * g, 3 + 6 * g, 3 + 6 * g], -1)
canvas = Image.fromarray(bg.clip(0, 255).astype(np.uint8)).convert('RGBA')

# 脸：从无字幕帧里裁出来，四周渐隐融进背景
im = Image.open(src).convert('RGB').crop((645, 150, 1605, 1080))
S = W / im.width; im = im.resize((W, round(im.height * S)), Image.LANCZOS)
w, h = im.size; a = np.ones((h, w), np.float32)
f = 120; a[:f] *= np.linspace(0, 1, f)[:, None]; a[-260:] *= np.linspace(1, 0, 260)[:, None]
s = 110; a[:, :s] *= np.linspace(0, 1, s)[None]; a[:, -s:] *= np.linspace(1, 0, s)[None]
im.putalpha(Image.fromarray((a * 255).astype(np.uint8)))
canvas.alpha_composite(im, (0, 250))

def text(xy, s, f, fill, glow=None, gr=14, anchor='mm', stroke=0):
    if glow:
        layer = Image.new('RGBA', canvas.size, (0, 0, 0, 0))
        ImageDraw.Draw(layer).text(xy, s, font=f, fill=glow, anchor=anchor)
        canvas.alpha_composite(layer.filter(ImageFilter.GaussianBlur(gr)))
        canvas.alpha_composite(layer.filter(ImageFilter.GaussianBlur(gr / 3)))
    ImageDraw.Draw(canvas).text(xy, s, font=f, fill=fill, anchor=anchor, stroke_width=stroke, stroke_fill=(14, 4, 4))

def line(y, parts, size, gr=14):
    """一行里分段上色：parts = [(文字, 颜色, 光晕色)]，整行居中"""
    f = font('Black', size); ws = [ImageDraw.Draw(canvas).textlength(p[0], font=f) for p in parts]
    x = (W - sum(ws)) / 2
    for (t, col, gl), wd in zip(parts, ws):
        text((x, y), t, f, col, glow=gl, gr=gr, anchor='lm', stroke=3); x += wd

text((W / 2, 70), '七宗罪 · 第三集', font('Bold', 44), (240, 226, 222), glow=(255, 90, 70, 180), gr=10)
text((W / 2, 185), '愤怒', font('Black', 150), (255, 150, 135), glow=(255, 42, 42, 235), gr=26, stroke=2)
WHITE, RED = (255, 244, 240), (255, 70, 60)
line(1168, [('你吼得最凶的那个人，', WHITE, (255, 60, 50, 150))], 64)
line(1262, [('往往是你', WHITE, (255, 60, 50, 150)), ('最亲', RED, (255, 30, 30, 230)), ('的人', WHITE, (255, 60, 50, 150))], 76, 16)
canvas.convert('RGB').save(out)
print(out, canvas.size)
