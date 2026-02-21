/**
 * RBAC 权限系统配置
 *
 * 定义权限模块、操作类型、条件类型等
 * 这是 RBAC 系统的唯一数据源（Single Source of Truth）
 */

import { EXT_MIME_MAP } from '../constants/upload.js';

// ============ 权限模块定义 ============

// 权限模块选项
export const MODULE_OPTIONS = [
  { value: 'topic', label: '话题' },
  { value: 'post', label: '回复' },
  { value: 'tag', label: '标签' },
  { value: 'user', label: '用户' },
  { value: 'upload', label: '上传' },
  { value: 'invitation', label: '邀请' },
  { value: 'system', label: '系统' },
  { value: 'dashboard', label: '管理后台' },
];

// 通用操作 - 适用于大多数模块
export const COMMON_ACTIONS = [
  { value: 'read', label: '查看' },
  { value: 'create', label: '创建' },
  { value: 'update', label: '编辑' },
  { value: 'delete', label: '删除' },
];

// 模块特殊操作（仅定义有特殊操作的模块）
export const MODULE_SPECIAL_ACTIONS = {
  topic: [
    { value: 'close', label: '关闭' },
  ],
  upload: [
    { value: 'avatars', label: '头像' },
    { value: 'topics', label: '话题图片' },
    { value: 'assets', label: '通用资源' },
  ],
  system: [
    { value: 'stats', label: '统计' },
  ],
  dashboard: [
    { value: 'access', label: '访问后台' },
    { value: 'topics', label: '话题管理' },
    { value: 'posts', label: '回复管理' },
    { value: 'categories', label: '分类管理' },
    { value: 'tags', label: '标签管理' },
    { value: 'files', label: '文件管理' },
    { value: 'emojis', label: '表情管理' },
    { value: 'users', label: '用户管理' },
    { value: 'roles', label: '角色权限' },
    { value: 'invitations', label: '邀请码管理' },
    { value: 'reports', label: '举报管理' },
    { value: 'moderation', label: '内容审核' },
    { value: 'extensions', label: '扩展功能' },
    { value: 'ads', label: '广告管理' },
    { value: 'settings', label: '系统配置' },
  ],
};

// ============ 条件类型定义 ============

/**
 * 组件类型说明:
 * - switch: 布尔开关
 * - number: 数字输入框
 * - select: 单选下拉框 (需要 options 或 dataSource)
 * - multiSelect: 多选下拉框/Combobox (需要 options 或 dataSource)
 * - timeRange: 时间范围选择器 (start + end)
 * - rateLimit: 频率限制选择器 (count + period)
 * - textList: 文本列表输入 (逗号分隔)
 *
 * 数据来源说明:
 * - options: 静态选项数组，直接在配置中定义
 * - dataSource: 动态数据源标识，前端根据标识获取数据
 *   支持的 dataSource 值:
 *   - 'categories': 分类列表，前端从 /api/categories 获取
 *
 * 注意：哪个权限能用哪些条件，由 SYSTEM_PERMISSIONS.conditions 决定
 */
export const CONDITION_TYPES = {
  // ===== 范围限制 =====
  categories: {
    label: '限定分类',
    type: 'array',
    component: 'multiSelect',
    dataSource: 'categories',
    description: '只允许选择父分类，子分类自动继承权限；不设置则不限制',
  },
  timeRange: {
    label: '生效时间段',
    type: 'object',
    component: 'timeRange',
    description: '权限生效的时间段，不设置则全天有效',
    schema: {
      start: { type: 'string', label: '开始时间', format: 'HH:mm' },
      end: { type: 'string', label: '结束时间', format: 'HH:mm' },
    },
  },

  // ===== 用户门槛 =====
  accountAge: {
    label: '账号注册天数',
    type: 'number',
    component: 'number',
    description: '账号注册天数需达到指定值，不设置则不限制',
    placeholder: '不限制',
    min: 0,
  },

  // ===== 频率限制 =====
  rateLimit: {
    label: '频率限制',
    type: 'object',
    component: 'rateLimit',
    description: '限制操作频率（次数/时间段），不设置则不限制',
    schema: {
      count: { type: 'number', label: '次数', min: 1 },
      period: {
        type: 'string',
        label: '周期',
        options: [
          { value: 'minute', label: '每分钟' },
          { value: 'hour', label: '每小时' },
          { value: 'day', label: '每天' },
        ],
      },
    },
  },

  // ===== 操作级别 =====
  allowPermanent: {
    label: '高危操作',
    type: 'boolean',
    component: 'switch',
    description: '是否允许执行高危操作（如彻底删除、不可逆变更）。关闭时仅允许常规操作',
  },

  // ===== 上传限制 =====
  maxFileSize: {
    label: '最大文件大小(KB)',
    type: 'number',
    component: 'number',
    description: '单个文件最大大小(KB)，不设置则使用系统默认限制',
    placeholder: '使用系统默认',
    min: 0,
  },
  allowedFileTypes: {
    label: '允许的文件类型',
    type: 'array',
    component: 'multiSelect',
    description: '允许上传的文件扩展名，不设置则使用系统默认类型',
    options: Object.keys(EXT_MIME_MAP).map(ext => ({
      value: ext,
      label: ext.toUpperCase(),
    })),
  },
};

// ============ 系统权限定义（唯一数据源） ============

/**
 * 系统权限定义
 * 包含权限基本信息和支持的条件类型
 *
 * conditions 设计原则：
 * - 内容创建类：支持 categories（分类限制）、rateLimit（频率限制）、accountAge（账号门槛）、timeRange（时间段）
 * - 内容修改类：支持 categories（分类限制）、timeRange（时间段）；owner检查在路由层
 * - 内容查看类：支持 categories（分类限制）
 * - 管理操作类：支持 categories（分类限制，若适用）
 * - 上传类：支持完整的上传限制条件
 */
export const SYSTEM_PERMISSIONS = [
  // ========== 话题权限 ==========
  {
    slug: 'topic.create',
    name: '创建话题',
    module: 'topic',
    action: 'create',
    isSystem: true,
    conditions: ['rateLimit', 'accountAge', 'timeRange'],
  },
  {
    slug: 'topic.read',
    name: '查看话题',
    module: 'topic',
    action: 'read',
    isSystem: true,
    conditions: ['categories'],
  },
  {
    slug: 'topic.update',
    name: '编辑话题',
    module: 'topic',
    action: 'update',
    isSystem: true,
    conditions: ['timeRange'],
  },
  {
    slug: 'topic.delete',
    name: '删除话题',
    module: 'topic',
    action: 'delete',
    isSystem: true,
    conditions: [],
  },
  {
    slug: 'topic.close',
    name: '关闭话题',
    module: 'topic',
    action: 'close',
    isSystem: true,
    conditions: [],
  },

  // ========== 回复权限 ==========
  {
    slug: 'post.create',
    name: '发表回复',
    module: 'post',
    action: 'create',
    isSystem: true,
    conditions: ['rateLimit', 'accountAge', 'timeRange'],
  },
  {
    slug: 'post.read',
    name: '查看回复',
    module: 'post',
    action: 'read',
    isSystem: true,
    conditions: [],
  },
  {
    slug: 'post.update',
    name: '编辑回复',
    module: 'post',
    action: 'update',
    isSystem: true,
    conditions: ['timeRange'],
  },
  {
    slug: 'post.delete',
    name: '删除回复',
    module: 'post',
    action: 'delete',
    isSystem: true,
    conditions: [],
  },

  // ========== 用户权限 ==========
  {
    slug: 'user.read',
    name: '查看用户',
    module: 'user',
    action: 'read',
    isSystem: true,
    conditions: [],
  },
  {
    slug: 'user.update',
    name: '编辑用户',
    module: 'user',
    action: 'update',
    isSystem: true,
    conditions: [],
  },
  {
    slug: 'user.delete',
    name: '删除用户',
    module: 'user',
    action: 'delete',
    isSystem: true,
    conditions: [],
  },

  // ========== 上传权限 ==========
  {
    slug: 'upload.avatars',
    name: '上传头像',
    module: 'upload',
    action: 'avatars',
    isSystem: true,
    conditions: ['maxFileSize', 'allowedFileTypes', 'rateLimit', 'accountAge'],
  },
  {
    slug: 'upload.topics',
    name: '上传话题图片',
    module: 'upload',
    action: 'topics',
    isSystem: true,
    conditions: ['maxFileSize', 'allowedFileTypes', 'rateLimit', 'accountAge'],
  },
  // {
  //   slug: 'upload.assets',
  //   name: '上传通用资源',
  //   module: 'upload',
  //   action: 'assets',
  //   isSystem: true,
  //   conditions: ['maxFileSize', 'allowedFileTypes', 'rateLimit', 'accountAge'],
  // },

  // ========== 标签权限 ==========
  {
    slug: 'tag.read',
    name: '使用标签',
    module: 'tag',
    action: 'read',
    isSystem: true,
    conditions: [],
  },
  {
    slug: 'tag.create',
    name: '创建标签',
    module: 'tag',
    action: 'create',
    isSystem: true,
    conditions: ['rateLimit', 'accountAge'],
  },

  // ========== 邀请权限 ==========
  {
    slug: 'invitation.create',
    name: '生成邀请码',
    module: 'invitation',
    action: 'create',
    isSystem: true,
    conditions: ['rateLimit', 'accountAge'],
  },

  // ========== 系统权限 ==========
  {
    slug: 'system.stats',
    name: '查看统计',
    module: 'system',
    action: 'stats',
    isSystem: true,
    conditions: [],
  },

  // ========== 管理后台权限 ==========
  {
    slug: 'dashboard.access',
    name: '访问后台',
    module: 'dashboard',
    action: 'access',
    isSystem: true,
    conditions: [],
  },
  {
    slug: 'dashboard.topics',
    name: '话题管理',
    module: 'dashboard',
    action: 'topics',
    isSystem: true,
    conditions: ['categories', 'allowPermanent'],
  },
  {
    slug: 'dashboard.posts',
    name: '回复管理',
    module: 'dashboard',
    action: 'posts',
    isSystem: true,
    conditions: ['categories', 'allowPermanent'],
  },
  {
    slug: 'dashboard.categories',
    name: '分类管理',
    module: 'dashboard',
    action: 'categories',
    isSystem: true,
    conditions: [],
  },
  {
    slug: 'dashboard.tags',
    name: '标签管理',
    module: 'dashboard',
    action: 'tags',
    isSystem: true,
    conditions: [],
  },
  {
    slug: 'dashboard.files',
    name: '文件管理',
    module: 'dashboard',
    action: 'files',
    isSystem: true,
    conditions: [],
  },
  {
    slug: 'dashboard.emojis',
    name: '表情管理',
    module: 'dashboard',
    action: 'emojis',
    isSystem: true,
    conditions: [],
  },
  {
    slug: 'dashboard.users',
    name: '用户管理',
    module: 'dashboard',
    action: 'users',
    isSystem: true,
    conditions: ['allowPermanent'],
  },
  {
    slug: 'dashboard.roles',
    name: '角色权限',
    module: 'dashboard',
    action: 'roles',
    isSystem: true,
    conditions: [],
  },
  {
    slug: 'dashboard.invitations',
    name: '邀请码管理',
    module: 'dashboard',
    action: 'invitations',
    isSystem: true,
    conditions: [],
  },
  {
    slug: 'dashboard.reports',
    name: '举报管理',
    module: 'dashboard',
    action: 'reports',
    isSystem: true,
    conditions: [],
  },
  {
    slug: 'dashboard.moderation',
    name: '内容审核',
    module: 'dashboard',
    action: 'moderation',
    isSystem: true,
    conditions: [],
  },
  {
    slug: 'dashboard.extensions',
    name: '扩展功能',
    module: 'dashboard',
    action: 'extensions',
    isSystem: true,
    conditions: [],
  },
  {
    slug: 'dashboard.ads',
    name: '广告管理',
    module: 'dashboard',
    action: 'ads',
    isSystem: true,
    conditions: [],
  },
  {
    slug: 'dashboard.settings',
    name: '系统配置',
    module: 'dashboard',
    action: 'settings',
    isSystem: true,
    conditions: [],
  },
];

// ============ 权限条件映射（自动生成） ============

/**
 * 权限支持的条件类型映射
 * 从 SYSTEM_PERMISSIONS 自动生成
 */
export const PERMISSION_CONDITIONS = Object.fromEntries(
  SYSTEM_PERMISSIONS.map(p => [p.slug, p.conditions || []])
);

// ============ 系统角色定义 ============

/**
 * 系统角色定义
 * - admin: 管理员，拥有所有权限
 * - user: 普通用户，注册用户默认角色
 * - guest: 访客，未登录用户
 */
export const SYSTEM_ROLES = [
  {
    slug: 'admin',
    name: '管理员',
    description: '系统管理员，拥有所有权限',
    color: '#e74c3c',
    icon: 'Shield',
    isSystem: true,
    isDefault: false,
    isDisplayed: true,
    priority: 100,
  },
  {
    slug: 'user',
    name: '普通用户',
    description: '普通注册用户',
    color: '#3498db',
    icon: 'User',
    isSystem: true,
    isDefault: true, // 注册用户默认角色
    isDisplayed: false,
    priority: 10,
  },
  {
    slug: 'guest',
    name: '访客',
    description: '未登录用户',
    color: '#95a5a6',
    icon: 'UserX',
    isSystem: true,
    isDefault: false,
    isDisplayed: false,
    priority: 0,
  },
];

// ============ 角色权限映射 ============

/**
 * 角色默认权限映射
 * 定义每个角色默认拥有的权限
 * 特殊标记: ['*'] 表示拥有所有权限（用于 admin）
 */
export const ROLE_PERMISSION_MAP = {
  // 管理员：拥有所有权限
  admin: ['*'],

  // 普通用户：基本的内容创建和查看权限
  user: [
    // 话题：创建、查看、编辑/删除自己的
    'topic.create', 'topic.read', 'topic.update', 'topic.delete',
    // 回复：创建、查看、编辑/删除自己的
    'post.create', 'post.read', 'post.update', 'post.delete',
    // 用户：查看、编辑、注销自己的资料
    'user.read', 'user.update', 'user.delete',
    // 系统统计
    'system.stats',
    // 上传
    'upload.avatars',
    // 标签
    'tag.read', 'tag.create',
    // 邀请
    // 'invitation.create',
  ],

  // 访客：只有查看权限
  guest: [
    'topic.read',
    'post.read',
    'user.read',
  ],
};

/**
 * 角色权限条件配置
 * 定义角色对某些权限的限制条件
 */
export const ROLE_PERMISSION_CONDITIONS = {
  user: {
    'upload.avatars': {
      maxFileSize: 5120, // 5MB (单位：KB)
      allowedFileTypes: ['jpg', 'jpeg', 'png', 'gif', 'webp'],
    },
  },
};

/**
 * 角色允许配置的权限白名单
 * 用于前端界面限制某些角色只能配置特定权限
 */
export const ALLOWED_ROLES_PERMISSIONS = {
  guest: [
    'topic.read',
    'post.read',
    'user.read',
    'system.stats',
  ],
  user: SYSTEM_PERMISSIONS
    .filter(p => !p.slug.startsWith('dashboard.'))
    .map(p => p.slug),
};

// ============ 辅助函数 ============

/**
 * 获取权限支持的条件类型
 * @param {string} permissionSlug - 权限标识
 * @returns {Array} 条件类型列表
 */
export function getPermissionConditionTypes(permissionSlug) {
  const conditions = PERMISSION_CONDITIONS[permissionSlug] || [];
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
    allowedRolePermissions: ALLOWED_ROLES_PERMISSIONS,
  };
}

// ============ 数据一致性校验 ============

/**
 * 校验 RBAC 配置的一致性
 * @returns {{ valid: boolean, errors: string[] }}
 */
export function validateRbacConfig() {
  const errors = [];
  const permissionSlugs = new Set(SYSTEM_PERMISSIONS.map(p => p.slug));
  const conditionKeys = new Set(Object.keys(CONDITION_TYPES));

  // 1. 检查 SYSTEM_PERMISSIONS 中的 conditions 引用的条件类型是否有效
  for (const perm of SYSTEM_PERMISSIONS) {
    if (perm.conditions) {
      for (const cond of perm.conditions) {
        if (!conditionKeys.has(cond)) {
          errors.push(`SYSTEM_PERMISSIONS "${perm.slug}" 引用了未定义的条件类型 "${cond}"`);
        }
      }
    }
  }

  // 2. 检查 ROLE_PERMISSION_MAP 中引用的权限是否都在 SYSTEM_PERMISSIONS 中
  for (const [role, perms] of Object.entries(ROLE_PERMISSION_MAP)) {
    // 跳过 ['*'] 特殊标记
    if (perms.length === 1 && perms[0] === '*') {
      continue;
    }
    for (const perm of perms) {
      if (!permissionSlugs.has(perm)) {
        errors.push(`ROLE_PERMISSION_MAP.${role} 引用了 "${perm}"，但 SYSTEM_PERMISSIONS 中未找到`);
      }
    }
  }

  // 3. 检查 ROLE_PERMISSION_CONDITIONS 中引用的权限是否都在 SYSTEM_PERMISSIONS 中
  for (const [role, conditions] of Object.entries(ROLE_PERMISSION_CONDITIONS)) {
    for (const perm of Object.keys(conditions)) {
      if (!permissionSlugs.has(perm)) {
        errors.push(`ROLE_PERMISSION_CONDITIONS.${role} 引用了 "${perm}"，但 SYSTEM_PERMISSIONS 中未找到`);
      }
    }
  }

  // 4. 检查 SYSTEM_PERMISSIONS 中的 module 是否在 MODULE_OPTIONS 中
  const moduleValues = new Set(MODULE_OPTIONS.map(m => m.value));
  for (const perm of SYSTEM_PERMISSIONS) {
    if (!moduleValues.has(perm.module)) {
      errors.push(`SYSTEM_PERMISSIONS "${perm.slug}" 的 module "${perm.module}" 未在 MODULE_OPTIONS 中定义`);
    }
  }

  // 5. 检查 ROLE_PERMISSION_MAP 中的角色是否都在 SYSTEM_ROLES 中定义
  const roleSlugs = new Set(SYSTEM_ROLES.map(r => r.slug));
  for (const roleSlug of Object.keys(ROLE_PERMISSION_MAP)) {
    if (!roleSlugs.has(roleSlug)) {
      errors.push(`ROLE_PERMISSION_MAP 中定义了角色 "${roleSlug}"，但 SYSTEM_ROLES 中未找到`);
    }
  }

  // 6. 检查 ROLE_PERMISSION_CONDITIONS 中的角色是否都在 SYSTEM_ROLES 中定义
  for (const roleSlug of Object.keys(ROLE_PERMISSION_CONDITIONS)) {
    if (!roleSlugs.has(roleSlug)) {
      errors.push(`ROLE_PERMISSION_CONDITIONS 中定义了角色 "${roleSlug}"，但 SYSTEM_ROLES 中未找到`);
    }
  }

  // 7. 检查 ALLOWED_ROLES_PERMISSIONS 中引用的权限是否都在 SYSTEM_PERMISSIONS 中
  for (const [role, perms] of Object.entries(ALLOWED_ROLES_PERMISSIONS)) {
    for (const perm of perms) {
      if (!permissionSlugs.has(perm)) {
        errors.push(`ALLOWED_ROLES_PERMISSIONS.${role} 引用了 "${perm}"，但 SYSTEM_PERMISSIONS 中未找到`);
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * 在开发环境下自动校验配置
 */
if (process.env.NODE_ENV === 'development') {
  const result = validateRbacConfig();
  if (!result.valid) {
    console.warn('⚠️ RBAC 配置校验失败:');
    result.errors.forEach(err => console.warn(`  - ${err}`));
  }
}
