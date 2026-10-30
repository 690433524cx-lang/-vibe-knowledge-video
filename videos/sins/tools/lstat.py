# 静帧的平均亮度（全范围 0–255）与画面中部饱和度：python3 tools/lstat.py 图...
import sys, subprocess
for f in sys.argv[1:]:
    raw = subprocess.run(['ffmpeg','-v','error','-i',f,'-vf','scale=135:240:flags=area','-f','rawvideo','-pix_fmt','rgb24','-'],capture_output=True).stdout
    W,H=135,240; L=0; S=0; n=0
    for y in range(H):
        for x in range(W):
            i=(y*W+x)*3; r,g,b=raw[i]/255,raw[i+1]/255,raw[i+2]/255
            L+=(0.299*r+0.587*g+0.114*b)*255
            if W*0.25<x<W*0.75 and H*0.25<y<H*0.75:
                mx=max(r,g,b); mn=min(r,g,b); S+=(mx-mn)/mx if mx>0.04 else 0; n+=1
    print(f"{f.split('/')[-1]}  亮度 {L/W/H:5.1f}  中部饱和度 {S/n:4.2f}")
