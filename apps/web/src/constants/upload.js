/**
 * Upload Constants (Frontend)
 * 上传相关常量配置 (需与后端 apps/api/src/constants/upload.js 保持一致)
 */

// 全局上传大小限制 (100MB)
export const MAX_UPLOAD_SIZE_GLOBAL_BYTES = 100 * 1024 * 1024;

// 管理员上传大小限制 (KB)
export const MAX_UPLOAD_SIZE_ADMIN_KB = MAX_UPLOAD_SIZE_GLOBAL_BYTES / 1024;

// 普通用户默认上传大小限制 (KB)
export const MAX_UPLOAD_SIZE_DEFAULT_KB = 5 * 1024;

// 图片类上传默认允许的扩展名（对应后端 DEFAULT_IMAGE_EXTENSIONS）
export const DEFAULT_IMAGE_EXTENSIONS = [
  'jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'ico'
];

// 扩展名与 MIME 类型的映射关系
export const EXT_MIME_MAP = {
  'jpg': ['image/jpeg'],
  'jpeg': ['image/jpeg'],
  'png': ['image/png'],
  'gif': ['image/gif'],
  'webp': ['image/webp'],
  'svg': ['image/svg+xml'],
  'ico': ['image/x-icon', 'image/vnd.microsoft.icon'],
};
