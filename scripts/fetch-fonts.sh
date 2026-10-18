#!/usr/bin/env bash
# 下载本片使用的四套开源字体（均为 SIL Open Font License / Apache）到 assets/fonts/
set -euo pipefail
cd "$(dirname "$0")/../assets/fonts"
get() { # $1 = Google Fonts family 参数, $2 = 输出文件名
  url=$(curl -sS "https://fonts.googleapis.com/css2?family=$1" | grep -o 'https://[^)]*' | head -1)
  curl -sS -o "$2" "$url"
  echo "$2"
}
get "Noto+Serif+SC:wght@600" Noto_Serif_SC_wght_600.ttf
get "Noto+Serif+SC:wght@900" Noto_Serif_SC_wght_900.ttf
get "Ma+Shan+Zheng" Ma_Shan_Zheng.ttf
get "Long+Cang" Long_Cang.ttf
get "Special+Elite" Special_Elite.ttf
