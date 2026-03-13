/**
 * 主题配置文件 - 单一数据源
 * 在 ThemeContext 和 layout 中共享，确保配置一致性
 */

export const THEMES = [
  { value: 'default', label: '默认', class: '', color: 'oklch(0.208 0.042 265.755)' },
  { value: 'sunrise', label: '晨曦', class: 'sunrise', color: 'oklch(0.62 0.24 12)' },
  { value: 'iceblue', label: '冰蓝', class: 'iceblue', color: 'oklch(0.56 0.18 250)' },
  { value: 'nord', label: 'Nord', class: 'nord', color: '#5E81AC' },
  // { value: 'cny', label: '新春', class: 'cny', color: '#DE2910' },
];

export const FONT_SIZES = [
  { value: 'compact', label: '紧凑', class: 'font-scale-compact' },
  { value: 'normal', label: '正常', class: 'font-scale-normal' },
  { value: 'comfortable', label: '宽松', class: 'font-scale-comfortable' },
];

// 默认值
export const DEFAULT_THEME = 'default';
export const DEFAULT_FONT_SIZE = 'normal';

// localStorage 键名
export const STORAGE_KEYS = {
  THEME_STYLE: 'theme-style',
  FONT_SIZE: 'font-size',
};
