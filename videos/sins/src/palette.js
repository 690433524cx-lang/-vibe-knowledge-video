// 配色：片头的中性色，以及每一期自己的配色。片头 1.3–2.0 秒从中性色过渡到本期配色（PAL.tide 0→1）。
import { hex, mixc } from './util.js';

// 七宗罪的颜色（从左到右对应第 1 到第 7 张脸）
export const SIN = [
  { key: 'pride', name: '傲慢', col: '#A855F7' },
  { key: 'envy', name: '嫉妒', col: '#3DDC84' },
  { key: 'wrath', name: '愤怒', col: '#EF4444' },
  { key: 'sloth', name: '懒惰', col: '#3B82F6' },
  { key: 'greed', name: '贪婪', col: '#F5B700' },
  { key: 'gluttony', name: '暴食', col: '#F97316' },
  { key: 'lust', name: '色欲', col: '#EC4899' },
];

// 每套配色的字段：
// neb[底色, 暗色, 中间色, 高光]  faceA/faceB 粒子亮面/暗面  crack 裂纹  dust[两种浮尘色]  bolt 闪电
// text 正文字 key 中性关键词 neg 负面关键词 glow 文字外发光  flash 闪白
export const PALETTES = {
  neutral: {
    neb: ['#07060C', '#1C1A2A', '#3A3550', '#8E88A8'], faceA: '#E8E8F0', faceB: '#9C98B4', crack: '#E8E8F0',
    dust: ['#C8C4D8', '#F2F0FA'], bolt: '#B8B4CC', text: '#F4F3F8', key: '#E8E8F0', neg: '#E8E8F0', glow: '#B8B4CC', flash: '#E8E8F0',
  },
  pride: {
    neb: ['#07030F', '#2A0E4A', '#6D28D9', '#A78BFA'], faceA: '#C9A8FF', faceB: '#8B5CF6', crack: '#C084FC',
    dust: ['#BF9EFF', '#F5F0FF'], bolt: '#B794F6', text: '#F5F0FF', key: '#C9A8FF', neg: '#F0457A', glow: '#7C3AED', flash: '#F0E6FF',
  },
  envy: {
    neb: ['#020A06', '#0B3A22', '#3DDC84', '#A7F3C9'], faceA: '#5FE49A', faceB: '#3DDC84', crack: '#C6F432',
    dust: ['#7FE8B0', '#F0FFF5'], bolt: '#A7F3C9', text: '#F0FFF5', key: '#A7F3C9', neg: '#C6F432', glow: '#3DDC84', flash: '#A7F3C9',
    main: '#3DDC84', dark: '#0B3A22', bright: '#A7F3C9', high: '#F0FFF5', toxic: '#C6F432', other: '#FFD27A',
  },
};

// 当前帧的配色（每帧由导演更新）
export const PAL = { ep: 'envy', tide: 0 };
export function palRGB(field, i) {
  const a = PALETTES.neutral[field], b = PALETTES[PAL.ep][field];
  const pa = hex(i == null ? a : a[i]), pb = hex(i == null ? b : b[i]);
  return mixc(pa, pb, PAL.tide);
}
export function palHex(field) {
  const c = palRGB(field);
  return '#' + c.map(v => Math.round(Math.max(0, Math.min(1, v)) * 255).toString(16).padStart(2, '0')).join('');
}
