# 把静帧目录拼成缩略图总览：python3 tools/sheet.py <目录> <输出.jpg> [列数]
import sys, glob, os
from PIL import Image, ImageDraw
d, out = sys.argv[1], sys.argv[2]; cols = int(sys.argv[3]) if len(sys.argv) > 3 else 7
fs = sorted(glob.glob(os.path.join(d, 't_*.jpg')))
w, h = 270, 480
rows = (len(fs) + cols - 1) // cols
sheet = Image.new('RGB', (cols * w, rows * (h + 22)), (20, 20, 20))
dr = ImageDraw.Draw(sheet)
for i, f in enumerate(fs):
    im = Image.open(f).resize((w, h)); x, y = (i % cols) * w, (i // cols) * (h + 22)
    sheet.paste(im, (x, y)); dr.text((x + 6, y + h + 4), os.path.basename(f)[2:-4] + 's', fill=(230, 230, 230))
sheet.save(out, quality=85)
