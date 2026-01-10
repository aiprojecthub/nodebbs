import { clsx } from "clsx";
import { twMerge } from "tailwind-merge"

export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

/**
 * IPX 图片处理 modifiers 预设
 * @see https://github.com/unjs/ipx
 */
export const IMAGE_PRESETS = {
  // 头像尺寸
  avatar: {
    xs: 'embed,f_webp,s_48x48',
    sm: 'embed,f_webp,s_64x64',
    md: 'embed,f_webp,s_128x128',
    lg: 'embed,f_webp,s_200x200',
    xl: 'embed,f_webp,s_256x256',
  },
  // 缩略图
  thumbnail: {
    sm: 'embed,f_webp,s_150x150',
    md: 'embed,f_webp,s_300x300',
    lg: 'embed,f_webp,s_600x600',
  },
  // 站点图标
  icon: {
    favicon: 'embed,f_png,s_48x48',
    logo: 'embed,f_webp,s_128x128',
    apple: 'embed,f_png,s_180x180',
  },
};

/**
 * 生成带 IPX modifiers 的图片 URL
 * 
 * IPX modifiers 格式说明：
 * - s_{width}x{height} - 调整尺寸，如 s_200x200
 * - w_{width} - 仅指定宽度
 * - h_{height} - 仅指定高度
 * - f_{format} - 输出格式：webp, png, jpeg, gif, avif
 * - q_{quality} - 质量 1-100，如 q_80
 * - fit_{mode} - 调整模式：cover, contain, fill, inside, outside
 * - embed - 保持纵横比并嵌入到指定尺寸中（类似 contain，但会填充背景）
 * - blur_{amount} - 模糊效果
 * - rotate_{degrees} - 旋转角度
 * 
 * @param {string} url - 图片 URL（相对路径或完整 URL）
 * @param {string|object} modifiers - IPX modifiers 字符串或配置对象
 * @param {object} options - 额外选项
 * @param {string} options.basePath - 需要替换的基础路径，默认 '/uploads/'
 * @returns {string} 处理后的图片 URL
 * 
 * @example
 * // 使用字符串 modifiers
 * getImageUrl('/uploads/avatars/abc.jpg', 'embed,f_webp,s_200x200')
 * // => '/uploads/embed,f_webp,s_200x200/avatars/abc.jpg'
 * 
 * @example
 * // 使用对象 modifiers（自动转换为字符串）
 * getImageUrl('/uploads/avatars/abc.jpg', { width: 200, height: 200, format: 'webp', embed: true })
 * // => '/uploads/embed,f_webp,s_200x200/avatars/abc.jpg'
 * 
 * @example
 * // 使用预设
 * getImageUrl('/uploads/avatars/abc.jpg', IMAGE_PRESETS.avatar.lg)
 */
export function getImageUrl(url, modifiers = '', options = {}) {
  // 空 URL 直接返回
  if (!url) return '';
  
  // 完整 URL（http/https 开头）直接返回，不处理
  if (url.startsWith('http://') || url.startsWith('https://')) {
    return url;
  }
  
  // SVG 格式是矢量图，不需要 IPX 处理，直接返回
  if (url.endsWith('.svg')) {
    return url;
  }
  
  // 无 modifiers 时直接返回原 URL
  if (!modifiers) {
    return url;
  }
  
  const { basePath = '/uploads/' } = options;
  
  // 将对象格式的 modifiers 转换为字符串
  const modifiersStr = typeof modifiers === 'object' 
    ? buildModifiersString(modifiers)
    : modifiers;
  
  // 检查 URL 是否包含基础路径
  if (!url.includes(basePath)) {
    return url;
  }
  
  // 在 basePath 后插入 modifiers
  return url.replace(basePath, `${basePath}${modifiersStr}/`);
}

/**
 * 将对象格式的 modifiers 转换为 IPX 字符串格式
 * @param {object} modifiers - modifiers 配置对象
 * @returns {string} IPX modifiers 字符串
 */
function buildModifiersString(modifiers) {
  const parts = [];
  
  // 处理 embed
  if (modifiers.embed) {
    parts.push('embed');
  }
  
  // 处理 fit
  if (modifiers.fit) {
    parts.push(`fit_${modifiers.fit}`);
  }
  
  // 处理格式
  if (modifiers.format || modifiers.f) {
    parts.push(`f_${modifiers.format || modifiers.f}`);
  }
  
  // 处理质量
  if (modifiers.quality || modifiers.q) {
    parts.push(`q_${modifiers.quality || modifiers.q}`);
  }
  
  // 处理尺寸
  if (modifiers.width && modifiers.height) {
    parts.push(`s_${modifiers.width}x${modifiers.height}`);
  } else if (modifiers.width || modifiers.w) {
    parts.push(`w_${modifiers.width || modifiers.w}`);
  } else if (modifiers.height || modifiers.h) {
    parts.push(`h_${modifiers.height || modifiers.h}`);
  } else if (modifiers.size || modifiers.s) {
    parts.push(`s_${modifiers.size || modifiers.s}`);
  }
  
  // 处理模糊
  if (modifiers.blur) {
    parts.push(`blur_${modifiers.blur}`);
  }
  
  // 处理旋转
  if (modifiers.rotate) {
    parts.push(`rotate_${modifiers.rotate}`);
  }
  
  return parts.join(',');
}
