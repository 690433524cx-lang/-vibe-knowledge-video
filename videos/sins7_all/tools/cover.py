# 4:5 封面（1080×1350）：上方标题，下面两排角色（傲慢 嫉妒 愤怒 懒惰 / 贪婪 暴食 色欲），底部一句引导
# 用法：python3 tools/cover.py 第一排截图 第二排截图 输出.png
import sys
from PIL import Image, ImageDraw, ImageFilter, ImageFont
import numpy as np

r1, r2, out = sys.argv[1:4]
W, H = 1080, 1350
F = '/usr/share/fonts/opentype/noto/NotoSerifCJK-%s.ttc'
font = lambda w, s: ImageFont.truetype(F % w, s, index=0)   # index 0 = SC

# 背景：深紫灰，中间偏上一团很淡的光
yy, xx = np.mgrid[0:H, 0:W].astype(np.float32)
g = np.exp(-(((xx - W / 2) / 620) ** 2 + ((yy - 640) / 560) ** 2))
bg = np.stack([30 + 26 * g, 26 + 16 * g, 40 + 34 * g], -1)
canvas = Image.fromarray(bg.clip(0, 255).astype(np.uint8)).convert('RGBA')

def row(path, box, scale, top, side_fade):
    im = Image.open(path).convert('RGB').crop(box)
    im = im.resize((round(im.width * scale), round(im.height * scale)), Image.LANCZOS)
    w, h = im.size
    a = np.ones((h, w), np.float32)
    f = 46
    a[:f] *= np.linspace(0, 1, f)[:, None]; a[-f:] *= np.linspace(1, 0, f)[:, None]
    if side_fade:
        s = 90; a[:, :s] *= np.linspace(0, 1, s)[None]; a[:, -s:] *= np.linspace(1, 0, s)[None]
    im.putalpha(Image.fromarray((a * 255).astype(np.uint8)))
    canvas.alpha_composite(im, ((W - w) // 2, top))

S = 0.72
row(r1, (210, 165, 1710, 800), S, 215, True)           # 傲慢 嫉妒 愤怒 懒惰（裁到下巴以下一点，身体不要）
row(r2, (360, 220, 1600, 760), S, 735, True)           # 贪婪 暴食 色欲
d = ImageDraw.Draw(canvas)
def text(xy, s, f, fill, glow=None, gr=14, anchor='mm', stroke=0):
    if glow:
        layer = Image.new('RGBA', canvas.size, (0, 0, 0, 0))
        ImageDraw.Draw(layer).text(xy, s, font=f, fill=glow, anchor=anchor)
        canvas.alpha_composite(layer.filter(ImageFilter.GaussianBlur(gr)))
        canvas.alpha_composite(layer.filter(ImageFilter.GaussianBlur(gr / 3)))
    ImageDraw.Draw(canvas).text(xy, s, font=f, fill=fill, anchor=anchor, stroke_width=stroke, stroke_fill=(12, 10, 18))

NAMES = [('傲慢', '#A24BFF', 133, 690), ('嫉妒', '#2BE36B', 403, 690), ('愤怒', '#FF2A2A', 677, 690), ('懒惰', '#2BC8E0', 947, 690),
         ('贪婪', '#FFC23D', 223, 1142), ('暴食', '#FF7A1F', 525, 1142), ('色欲', '#FF3D8B', 799, 1142)]
def hexrgb(h, k=0.0): c = [int(h[i:i + 2], 16) for i in (1, 3, 5)]; return tuple(round(v + (255 - v) * k) for v in c)
for n, col, x, y in NAMES:                                  # 名字：半透明暗色底 + 这一宗的颜色
    plate = Image.new('RGBA', canvas.size, (0, 0, 0, 0)); ImageDraw.Draw(plate).rounded_rectangle((x - 66, y - 28, x + 66, y + 28), 12, fill=(10, 8, 16, 170)); canvas.alpha_composite(plate)
    text((x, y), n, font('Bold', 42), hexrgb(col, 0.3), glow=hexrgb(col) + (200,), gr=8)
text((W / 2, 92), '七宗罪', font('Black', 128), (255, 244, 226), glow=(255, 190, 120, 210), gr=22)
text((W / 2, 184), '其实是大脑的七种出厂设置', font('Bold', 50), (236, 228, 255), glow=(170, 120, 255, 200), gr=12)
text((W / 2, 1262), '你是哪一宗？', font('Black', 72), (255, 255, 255), glow=(255, 110, 170, 220), gr=16, stroke=3)
canvas.convert('RGB').save(out, quality=95)
print(out, canvas.size)
