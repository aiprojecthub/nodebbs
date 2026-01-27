/**
 * RBAC 权限系统配置
 *
 * 定义权限模块、操作类型、条件类型等
 */

// ============ 权限模块定义 ============

// 权限模块选项
export const MODULE_OPTIONS = [
  { value: 'topic', label: '话题' },
  { value: 'post', label: '回复' },
  { value: 'user', label: '用户' },
  { value: 'category', label: '分类' },
  { value: 'system', label: '系统' },
  { value: 'upload', label: '上传' },
  { value: 'invitation', label: '邀请' },
  { value: 'moderation', label: '审核' },
];

// 通用操作 - 适用于大多数模块
export const COMMON_ACTIONS = [
  { value: 'create', label: '创建' },
  { value: 'read', label: '查看' },
  { value: 'update', label: '编辑' },
  { value: 'delete', label: '删除' },
  { value: 'manage', label: '管理' },
];

// 模块特殊操作
export const MODULE_SPECIAL_ACTIONS = {
  topic: [
    { value: 'pin', label: '置顶' },
    { value: 'close', label: '关闭' },
    { value: 'move', label: '移动' },
    { value: 'approve', label: '审核' },
  ],
  post: [
    { value: 'approve', label: '审核' },
  ],
  user: [
    { value: 'ban', label: '封禁' },
    { value: 'mute', label: '禁言' },
    { value: 'role.assign', label: '分配角色' },
  ],
  category: [],
  system: [
    { value: 'settings', label: '设置' },
    { value: 'dashboard', label: '后台' },
    { value: 'logs', label: '日志' },
  ],
  upload: [
    { value: 'image', label: '图片' },
    { value: 'file', label: '文件' },
  ],
  invitation: [],
  moderation: [
    { value: 'reports', label: '举报' },
    { value: 'content', label: '内容' },
    { value: 'approve', label: '审核' },
  ],
};

// ============ 条件类型定义 ============

// 所有可用的条件类型
export const CONDITION_TYPES = {
  // 资源归属
  own: {
    key: 'own',
    label: '仅限自己的资源',
    type: 'boolean',
    description: '只能操作自己创建的内容',
  },
  // 分类限制
  categories: {
    key: 'categories',
    label: '限定分类',
    type: 'array',
    description: '只在指定分类ID内有效（逗号分隔）',
  },
  // 用户门槛
  level: {
    key: 'level',
    label: '最低等级要求',
    type: 'number',
    description: '用户等级需达到指定值',
  },
  minCredits: {
    key: 'minCredits',
    label: '最低积分要求',
    type: 'number',
    description: '用户积分需达到指定值',
  },
  minPosts: {
    key: 'minPosts',
    label: '最低发帖数',
    type: 'number',
    description: '用户发帖数需达到指定值',
  },
  accountAge: {
    key: 'accountAge',
    label: '账号年龄(天)',
    type: 'number',
    description: '账号注册天数需达到指定值',
  },
  // 频率限制
  rateLimit: {
    key: 'rateLimit',
    label: '频率限制',
    type: 'rateLimit',
    description: '限制操作频率（次数/时间段）',
    schema: { count: 'number', period: 'string' }, // period: minute/hour/day
  },
  // 上传限制
  maxFileSize: {
    key: 'maxFileSize',
    label: '最大文件大小(KB)',
    type: 'number',
    description: '单个文件最大大小，单位KB',
  },
  maxFilesPerDay: {
    key: 'maxFilesPerDay',
    label: '每日上传数量',
    type: 'number',
    description: '每天最多上传文件数量',
  },
  allowedFileTypes: {
    key: 'allowedFileTypes',
    label: '允许的文件类型',
    type: 'array',
    description: '允许上传的文件扩展名（逗号分隔，如: jpg,png,gif）',
  },
  // 时间段限制
  timeRange: {
    key: 'timeRange',
    label: '生效时间段',
    type: 'timeRange',
    description: '权限生效的时间段',
    schema: { start: 'string', end: 'string' }, // HH:mm 格式
  },
  // 字段过滤
  fieldFilter: {
    key: 'fieldFilter',
    label: '字段过滤',
    type: 'fieldFilter',
    description: '控制返回字段，* 表示全部，!field 表示排除',
  },
};

// ============ 权限与条件的映射 ============

// 定义每个权限支持哪些条件类型
export const PERMISSION_CONDITIONS = {
  // 话题相关
  'topic.create': ['categories', 'rateLimit', 'level', 'minCredits', 'minPosts', 'accountAge', 'timeRange'],
  'topic.read': ['categories', 'fieldFilter'],
  'topic.update': ['own', 'categories'],
  'topic.delete': ['own', 'categories'],
  'topic.manage': ['categories', 'fieldFilter'],
  'topic.pin': ['categories'],
  'topic.close': ['categories'],
  'topic.move': ['categories'],
  'topic.approve': ['categories'],

  // 回复相关
  'post.create': ['categories', 'rateLimit', 'level', 'minCredits', 'accountAge', 'timeRange'],
  'post.read': ['categories', 'fieldFilter'],
  'post.update': ['own'],
  'post.delete': ['own', 'categories'],
  'post.manage': ['categories', 'fieldFilter'],
  'post.approve': ['categories'],

  // 用户相关
  'user.read': ['fieldFilter'],
  'user.update': ['own'],
  'user.delete': [],
  'user.manage': ['fieldFilter'],
  'user.ban': [],
  'user.mute': [],
  'user.role.assign': [],

  // 分类相关
  'category.create': [],
  'category.read': ['fieldFilter'],
  'category.update': [],
  'category.delete': [],
  'category.manage': ['fieldFilter'],

  // 上传相关
  'upload.create': ['maxFileSize', 'maxFilesPerDay', 'allowedFileTypes', 'rateLimit'],
  'upload.image': ['maxFileSize', 'maxFilesPerDay', 'rateLimit'],
  'upload.file': ['maxFileSize', 'maxFilesPerDay', 'allowedFileTypes', 'rateLimit'],

  // 邀请相关
  'invitation.create': ['rateLimit', 'level', 'minCredits'],
  'invitation.read': ['own', 'fieldFilter'],
  'invitation.manage': ['fieldFilter'],

  // 审核相关
  'moderation.reports': ['fieldFilter'],
  'moderation.content': ['categories', 'fieldFilter'],
  'moderation.approve': ['categories'],
  'moderation.manage': ['fieldFilter'],

  // 系统相关
  'system.settings': [],
  'system.dashboard': [],
  'system.logs': ['fieldFilter'],
  'system.manage': [],
};

// 默认条件（当权限未在映射中定义时使用）
export const DEFAULT_CONDITIONS = ['own', 'categories', 'level'];

// ============ 辅助函数 ============

/**
 * 获取权限支持的条件类型
 * @param {string} permissionSlug - 权限标识
 * @returns {Array} 条件类型列表
 */
export function getPermissionConditionTypes(permissionSlug) {
  const conditions = PERMISSION_CONDITIONS[permissionSlug] || DEFAULT_CONDITIONS;
  return conditions.map(key => CONDITION_TYPES[key]).filter(Boolean);
}

/**
 * 获取模块的所有操作（通用 + 特殊）
 * @param {string} module - 模块名
 * @returns {Array} 操作列表
 */
export function getModuleActions(module) {
  const specialActions = MODULE_SPECIAL_ACTIONS[module] || [];
  return [...COMMON_ACTIONS, ...specialActions];
}

/**
 * 获取完整的 RBAC 配置（用于 API 返回）
 * @returns {Object} RBAC 配置对象
 */
export function getRbacConfig() {
  return {
    modules: MODULE_OPTIONS,
    commonActions: COMMON_ACTIONS,
    moduleSpecialActions: MODULE_SPECIAL_ACTIONS,
    conditionTypes: CONDITION_TYPES,
    permissionConditions: PERMISSION_CONDITIONS,
  };
}
