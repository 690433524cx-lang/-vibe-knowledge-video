#!/bin/bash
# 静帧拼成网格：tools/grid.sh 输出.jpg 列数 宽度 图...
out=$1; cols=$2; w=$3; shift 3
args=(); f=""; i=0
for img in "$@"; do args+=(-i "$img"); f+="[$i]scale=$w:-1,drawtext=text='$(basename $img .jpg | sed 's/t_0*//')':fontcolor=yellow:fontsize=20:x=6:y=6[v$i];"; i=$((i+1)); done
lay=""; for ((k=0;k<i;k++)); do lay+="$(( (k%cols) ))_$(( k/cols ))|"; done
ins=""; for ((k=0;k<i;k++)); do ins+="[v$k]"; done
h=$(( w*9/16 ))
layout=$(for ((k=0;k<i;k++)); do echo -n "$(( (k%cols)*w ))_$(( (k/cols)*h ))|"; done)
ffmpeg -v error -y "${args[@]}" -filter_complex "${f}${ins}xstack=inputs=$i:layout=${layout%|}:fill=black" -q:v 3 "$out"
