/**
 * Upload Constants
 * 上传相关常量配置
 */

// 全局上传大小限制 (100MB) - 对应 Fastify Multipart 插件的物理限制
export const MAX_UPLOAD_SIZE_GLOBAL_BYTES = 100 * 1024 * 1024;

// 管理员上传大小限制 - 通常与全局限制一致
export const MAX_UPLOAD_SIZE_ADMIN_KB = MAX_UPLOAD_SIZE_GLOBAL_BYTES / 1024;

// 普通用户默认上传大小限制 (5MB) - 若 RBAC 未配置时的后备值
export const MAX_UPLOAD_SIZE_DEFAULT_KB = 5 * 1024;

// 图片类上传默认允许的扩展名。
// 适用于 attachments 之外的全部分类：assets/avatars/badges/topics/items/frames/emojis
export const DEFAULT_IMAGE_EXTENSIONS = [
  'jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'ico'
];

// 附件（category='attachments'）默认允许的扩展名
// 刻意不含 html/htm/xhtml/svg/js —— 这些在同源下可执行脚本。附件下载路由虽已强制
// Content-Disposition: attachment + X-Content-Type-Options: nosniff，默认仍不放开；
// 确有需要由管理员在 RBAC 的「允许的文件类型」里自行添加。
export const DEFAULT_ATTACHMENT_EXTENSIONS = [
  'zip', 'rar', '7z', 'gz', 'tar',
  'pdf', 'txt', 'md', 'csv',
  'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx',
];

// 附件在 RBAC 后台「允许的文件类型」里的可勾选候选。
// 与 DEFAULT_ATTACHMENT_EXTENSIONS 的区别：这是「候选」（管理员能勾什么），
// 后者是「兜底」（不配置时按什么），候选比兜底宽。
// 同样不含 svg/html —— 候选列表带有「系统认可」的暗示，不该把同源可执行脚本的
// 类型摆进去；确有需要仍可由管理员手动输入（见 rbac.js 的 creatable: true）。
export const ATTACHMENT_EXTENSION_CHOICES = [
  ...DEFAULT_ATTACHMENT_EXTENSIONS,
  'mp3', 'mp4', 'apk', 'torrent',
  'jpg', 'jpeg', 'png', 'gif', 'webp', 'ico',
];

/**
 * 取某上传分类的默认扩展名白名单（RBAC 未配置 allowedFileTypes 时的后备值）。
 *
 * 上传路由与 RBAC 引擎必须用同一份映射，否则「不配置就按系统默认」在两处会给出
 * 不同答案。放在 constants 而非路由里，就是为了让 plugins/rbac 也能取用。
 *
 * @param {string} [category] - 上传分类；非上传场景传 null/undefined 即取图片白名单
 * @returns {string[]}
 */
export function defaultExtensionsFor(category) {
  return category === 'attachments' ? DEFAULT_ATTACHMENT_EXTENSIONS : DEFAULT_IMAGE_EXTENSIONS;
}

// 扩展名与 MIME 类型的映射关系 (用于安全校验)
// 未收录的扩展名不做 MIME 一致性校验（管理员可在 RBAC 条件里自由输入扩展名）
export const EXT_MIME_MAP = {
  // 图片
  'jpg': ['image/jpeg'],
  'jpeg': ['image/jpeg'],
  'png': ['image/png'],
  'gif': ['image/gif'],
  'webp': ['image/webp'],
  'svg': ['image/svg+xml'],
  'ico': ['image/x-icon', 'image/vnd.microsoft.icon'],
  // 压缩包
  'zip': ['application/zip', 'application/x-zip-compressed', 'application/octet-stream'],
  'rar': ['application/vnd.rar', 'application/x-rar-compressed', 'application/octet-stream'],
  '7z': ['application/x-7z-compressed', 'application/octet-stream'],
  'gz': ['application/gzip', 'application/x-gzip', 'application/octet-stream'],
  'tar': ['application/x-tar', 'application/octet-stream'],
  // 文档
  'pdf': ['application/pdf'],
  'txt': ['text/plain'],
  'md': ['text/markdown', 'text/x-markdown', 'text/plain'],
  'csv': ['text/csv', 'application/vnd.ms-excel', 'text/plain'],
  'doc': ['application/msword'],
  'docx': ['application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
  'xls': ['application/vnd.ms-excel'],
  'xlsx': ['application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'],
  'ppt': ['application/vnd.ms-powerpoint'],
  'pptx': ['application/vnd.openxmlformats-officedocument.presentationml.presentation'],
  // 音视频
  'mp3': ['audio/mpeg'],
  'mp4': ['video/mp4'],
  // 其他
  'apk': ['application/vnd.android.package-archive', 'application/octet-stream'],
  'torrent': ['application/x-bittorrent', 'application/octet-stream'],
};
