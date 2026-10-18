const path = require('path');
const { GlobalFonts } = require('@napi-rs/canvas');

const FONT_DIR = path.join(__dirname, '../../assets/fonts');
GlobalFonts.registerFromPath(path.join(FONT_DIR, 'Noto_Serif_SC_wght_600.ttf'), 'SerifSC');
GlobalFonts.registerFromPath(path.join(FONT_DIR, 'Noto_Serif_SC_wght_900.ttf'), 'SerifSCBlack');
GlobalFonts.registerFromPath(path.join(FONT_DIR, 'Ma_Shan_Zheng.ttf'), 'Brush');
GlobalFonts.registerFromPath(path.join(FONT_DIR, 'Long_Cang.ttf'), 'Hand');
GlobalFonts.registerFromPath(path.join(FONT_DIR, 'Special_Elite.ttf'), 'Typewriter');
// 第二版排版（选择困难起）：正文用常规字重，英文人名 / 术语用 EB Garamond
for (const [file, name] of [
  ['Noto_Serif_SC_wght_400.ttf', 'SerifSCReg'],
  ['EB_Garamond_wght_400.ttf', 'Garamond'],
  ['EB_Garamond_wght_500.ttf', 'GaramondMed'],
  ['EB_Garamond_ital_wght_1_400.ttf', 'GaramondItalic'],
  ['ZCOOL_XiaoWei.ttf', 'XiaoWei'],   // 《悲观主义》封面：文学感的标题宋体
]) {
  const f = path.join(FONT_DIR, file);
  if (require('fs').existsSync(f)) GlobalFonts.registerFromPath(f, name);
}

// 全片只用四套字体：
//   正文字幕 / 术语  → 思源宋体（SerifSC / SerifSCBlack）
//   锚词「舍不得」    → 马善政毛笔楷（Brush）
//   手写批注          → 龙藏体（Hand）
//   英文 / 编号       → Special Elite 打字机体（Typewriter）
const FONT = {
  serif: (px) => `${px}px SerifSC`,
  serifBlack: (px) => `${px}px SerifSCBlack`,
  brush: (px) => `${px}px Brush`,
  hand: (px) => `${px}px Hand`,
  type: (px) => `${px}px Typewriter`,
  body: (px) => `${px}px SerifSCReg`,
  en: (px) => `${px}px Garamond`,
  enMed: (px) => `${px}px GaramondMed`,
  enItalic: (px) => `${px}px GaramondItalic`,
  xiaowei: (px) => `${px}px XiaoWei`,
};

const C = {
  paper: '#e7dcc3',      // 泛黄米白
  paperLight: '#efe6d0',
  paperDark: '#d9caa6',  // 旧纸黄
  ink: '#2a2420',        // 灰黑
  graphite: 'rgba(52,46,41,0.82)',
  graphiteSoft: 'rgba(60,54,48,0.45)',
  brown: '#5a4636',      // 深褐
  gray: '#6f6a62',       // 暗灰
  red: '#7d231c',        // 暗红（仅用于核心词、批注、印章、关键线）
  redSoft: 'rgba(125,35,28,0.75)',
  water: 'rgba(96,112,118,0.22)',
  // 深色环境用
  sub: '#e6dac3',            // 字幕：浅米白
  subRed: '#b5493d',         // 字幕中的暗红强调（深底上略提亮）
  light: 'rgba(226,212,188,0.78)',     // 深底上的亮铅笔线
  lightSoft: 'rgba(214,198,172,0.38)',
  lightText: '#cbbfa8',      // 深底上的说明文字（暖灰白）
  dimText: '#8d8070',
};

module.exports = { FONT, C };
