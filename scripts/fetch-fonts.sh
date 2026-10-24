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
get "Noto+Serif+SC:wght@400" Noto_Serif_SC_wght_400.ttf
get "EB+Garamond:wght@400" EB_Garamond_wght_400.ttf
get "EB+Garamond:ital,wght@1,400" EB_Garamond_ital_wght_1_400.ttf
get "EB+Garamond:wght@500" EB_Garamond_wght_500.ttf
# 第三版（入睡抽动）：无衬线中文 + 英文标签 + 等宽数字
get "Noto+Sans+SC:wght@300" NotoSansSC_300.ttf
get "Noto+Sans+SC:wght@400" NotoSansSC_400.ttf
get "Noto+Sans+SC:wght@500" NotoSansSC_500.ttf
get "Noto+Sans+SC:wght@700" NotoSansSC_700.ttf
get "Inter:wght@400" Inter_400.ttf
get "Inter:wght@600" Inter_600.ttf
get "JetBrains+Mono:wght@400" JBMono_400.ttf
