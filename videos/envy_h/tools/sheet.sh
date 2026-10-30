#!/bin/bash
# 把若干张静帧横向拼成一张对比图：tools/sheet.sh 输出.jpg 宽度 图1 图2 ...
out=$1; w=$2; shift 2
args=(); f=""; i=0
for img in "$@"; do args+=(-i "$img"); f+="[$i]scale=$w:-1,drawtext=text='$(basename $img .jpg | sed 's/t_0*//')':fontcolor=yellow:fontsize=22:x=6:y=6[v$i];"; i=$((i+1)); done
ins=""; for ((k=0;k<i;k++)); do ins+="[v$k]"; done
ffmpeg -v error -y "${args[@]}" -filter_complex "${f}${ins}hstack=inputs=$i" -q:v 3 "$out"
