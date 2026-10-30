// 系列片头与片尾循环的公共事件（所有期数相同，只有闪白颜色随罪名变化）
import { SIN } from './palette.js';

export function introEvents(N) {
  return {
    PUNCH: [[1.3, 1]],
    FLASH: [[1.3, 0.30, SIN[N - 1].col]],
    BOLTS: [[1.3, 0.75, 0.28, 0.6]],
  };
}
// 片头辉光：1.4
export const INTRO_BLOOM = 1.4;
