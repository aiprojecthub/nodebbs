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
  { value: 'user', label: '用户' },
  { value: 'category', label: '分类' },
  { value: 'upload', label: '上传' },
  { value: 'invitation', label: '邀请' },
  { value: 'dashboard', label: '管理后台' },
];

// 通用操作 - 适用于大多数模块
export const COMMON_ACTIONS = [
  { value: 'read', label: '查看' },
  { value: 'create', label: '创建' },
  { value: 'update', label: '编辑' },
  { value: 'delete', label: '删除' },
];

// 模块特殊操作
export const MODULE_SPECIAL_ACTIONS = {
  topic: [
    { value: 'pin', label: '置顶' },
    { value: 'close', label: '关闭' },
  ],
  post: [],
  user: [
    { value: 'ban', label: '封禁' },
  ],
  category: [],
  upload: [],
  invitation: [],
  dashboard: [
    { value: 'access', label: '访问后台' },
    { value: 'topics', label: '话题管理' },
    { value: 'posts', label: '回复管理' },
    { value: 'categories', label: '分类管理' },
    { value: 'tags', label: '标签管理' },
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
  // ===== 通用条件 =====
  
  // ===== 操作范围 =====
  scope: {
    key: 'scope',
    label: '操作范围',
    type: 'array',
    component: 'multiSelect',
    description: '限制操作的查询/访问范围',
    excludeRoles: ['guest'],  // 完全排除的角色
    excludeRolePermissions: {  // 特定角色的特定权限排除（支持通配符 *）
      user: ['*.read'],  // user 角色的所有读权限不显示 scope
    },
    options: [
      { value: 'own', label: '仅自己' },
      { value: 'list', label: '全部' },
    ],
  },

  // ===== 范围限制 =====
  categories: {
    key: 'categories',
    label: '限定分类',
    type: 'array',
    component: 'multiSelect',
    dataSource: 'categories', // 前端从分类 API 动态获取
    description: '只在指定分类内有效',
  },
  timeRange: {
    key: 'timeRange',
    label: '生效时间段',
    type: 'object',
    component: 'timeRange',
    description: '权限生效的时间段',
    schema: {
      start: { type: 'string', label: '开始时间', format: 'HH:mm' },
      end: { type: 'string', label: '结束时间', format: 'HH:mm' },
    },
  },

  // ===== 用户门槛 =====
  accountAge: {
    key: 'accountAge',
    label: '账号注册天数',
    type: 'number',
    component: 'number',
    description: '账号注册天数需达到指定值',
    placeholder: '不限制',
    min: 0,
  },

  // ===== 频率限制 =====
  rateLimit: {
    key: 'rateLimit',
    label: '频率限制',
    type: 'object',
    component: 'rateLimit',
    description: '限制操作频率（次数/时间段）',
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

  // ===== 上传限制 =====
  maxFileSize: {
    key: 'maxFileSize',
    label: '最大文件大小(KB)',
    type: 'number',
    component: 'number',
    description: '单个文件最大大小，单位KB',
    placeholder: '不限制',
    min: 0,
  },
  allowedFileTypes: {
    key: 'allowedFileTypes',
    label: '允许的文件类型',
    type: 'array',
    component: 'multiSelect',
    description: '允许上传的文件扩展名',
    options: Object.keys(EXT_MIME_MAP).map(ext => ({
      value: ext,
      label: ext.toUpperCase(),
    })),
  },
  uploadTypes: {
    key: 'uploadTypes',
    label: '允许的上传类型',
    type: 'array',
    component: 'multiSelect',
    description: '允许的上传目录类型',
    options: [
      { value: 'avatars', label: '头像' },
      { value: 'topics', label: '话题' },
      { value: 'badges', label: '徽章' },
      { value: 'items', label: '道具' },
      { value: 'frames', label: '头像框' },
      { value: 'emojis', label: '表情' },
      { value: 'assets', label: '通用' },
    ],
  },
};

// ============ 系统权限定义（唯一数据源） ============

/**
 * 系统权限定义
 * 包含权限基本信息和支持的条件类型
 *
 * conditions 设计原则：
 * - 内容创建类：支持 scope（操作范围）、categories（分类限制）、rateLimit（频率限制）、accountAge（账号门槛）、timeRange（时间段）
 * - 内容修改类：支持 scope（own 仅自己）、categories（分类限制）、timeRange（时间段）
 * - 内容查看类：支持 scope（查询范围）、categories（分类限制）
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
    // 场景：限制新用户发帖、限制发帖频率、限制在特定分类发帖、限制发帖时间段
    conditions: ['categories', 'rateLimit', 'accountAge', 'timeRange'],
  },
  {
    slug: 'topic.read',
    name: '查看话题',
    module: 'topic',
    action: 'read',
    isSystem: true,
    // 场景：限制查看特定分类的话题、支持查询范围控制
    conditions: ['scope', 'categories'],
  },
  {
    slug: 'topic.update',
    name: '编辑话题',
    module: 'topic',
    action: 'update',
    isSystem: true,
    // 场景：普通用户只能编辑自己的话题、版主可编辑特定分类的话题、限制编辑时间段
    conditions: ['scope', 'categories', 'timeRange'],
  },
  {
    slug: 'topic.delete',
    name: '删除话题',
    module: 'topic',
    action: 'delete',
    isSystem: true,
    // 场景：普通用户只能删除自己的话题、版主可删除特定分类的话题
    conditions: ['scope', 'categories'],
  },
  {
    slug: 'topic.pin',
    name: '置顶话题',
    module: 'topic',
    action: 'pin',
    isSystem: true,
    // 场景：版主只能置顶自己管辖分类的话题
    conditions: ['categories'],
  },
  {
    slug: 'topic.close',
    name: '关闭话题',
    module: 'topic',
    action: 'close',
    isSystem: true,
    // 场景：用户可关闭自己的话题、版主可关闭特定分类的话题
    conditions: ['scope', 'categories'],
  },

  // ========== 回复权限 ==========
  {
    slug: 'post.create',
    name: '发表回复',
    module: 'post',
    action: 'create',
    isSystem: true,
    // 回复依附于话题，分类限制由 topic.read 统一控制
    // 场景：限制新用户回复、限制回复频率、限制回复时间段
    conditions: ['rateLimit', 'accountAge', 'timeRange'],
  },
  {
    slug: 'post.read',
    name: '查看回复',
    module: 'post',
    action: 'read',
    isSystem: true,
    // 场景：支持查询范围控制（管理员可无参数列表查询）
    conditions: ['scope'],
  },
  {
    slug: 'post.update',
    name: '编辑回复',
    module: 'post',
    action: 'update',
    isSystem: true,
    // 回复依附于话题，分类限制由 topic.read 统一控制
    // 场景：普通用户只能编辑自己的回复、限制编辑时间段
    conditions: ['scope', 'timeRange'],
  },
  {
    slug: 'post.delete',
    name: '删除回复',
    module: 'post',
    action: 'delete',
    isSystem: true,
    // 回复依附于话题，分类限制由 topic.read 统一控制
    // 场景：普通用户只能删除自己的回复
    conditions: ['scope'],
  },

  // ========== 用户权限 ==========
  {
    slug: 'user.read',
    name: '查看用户',
    module: 'user',
    action: 'read',
    isSystem: true,
    // 场景：支持查询范围控制（管理员可列表查询）
    conditions: ['scope'],
  },
  {
    slug: 'user.update',
    name: '编辑用户',
    module: 'user',
    action: 'update',
    isSystem: true,
    // 场景：普通用户只能编辑自己的资料
    conditions: ['scope'],
  },
  {
    slug: 'user.delete',
    name: '删除用户',
    module: 'user',
    action: 'delete',
    isSystem: true,
    // 场景：用户可注销自己的账号（scope: own）、管理员可删除任意用户
    conditions: ['scope'],
  },
  {
    slug: 'user.ban',
    name: '封禁用户',
    module: 'user',
    action: 'ban',
    isSystem: true,
    // 场景：管理操作，可限制频率防止滥用
    conditions: ['rateLimit'],
  },

  // ========== 分类权限 ==========
  {
    slug: 'category.create',
    name: '创建分类',
    module: 'category',
    action: 'create',
    isSystem: true,
    // 场景：管理操作，通常无限制
    conditions: [],
  },
  {
    slug: 'category.read',
    name: '查看分类',
    module: 'category',
    action: 'read',
    isSystem: true,
    // 场景：通常无限制
    conditions: [],
  },
  {
    slug: 'category.update',
    name: '编辑分类',
    module: 'category',
    action: 'update',
    isSystem: true,
    // 场景：管理操作，通常无限制
    conditions: [],
  },
  {
    slug: 'category.delete',
    name: '删除分类',
    module: 'category',
    action: 'delete',
    isSystem: true,
    // 场景：管理操作，通常无限制
    conditions: [],
  },

  // ========== 上传权限 ==========
  {
    slug: 'upload.create',
    name: '上传文件',
    module: 'upload',
    action: 'create',
    isSystem: true,
    // 场景：限制上传类型、文件大小、文件格式、上传频率（含每日限制）、账号门槛
    conditions: ['uploadTypes', 'maxFileSize', 'allowedFileTypes', 'rateLimit', 'accountAge'],
  },

  // ========== 邀请权限 ==========
  {
    slug: 'invitation.create',
    name: '生成邀请码',
    module: 'invitation',
    action: 'create',
    isSystem: true,
    // 场景：限制邀请频率、账号门槛
    conditions: ['rateLimit', 'accountAge'],
  },

  // ========== 管理后台权限 ==========
  {
    slug: 'dashboard.access',
    name: '访问后台',
    module: 'dashboard',
    action: 'access',
    isSystem: true,
    description: '允许访问管理后台概览页',
    conditions: [],
  },
  {
    slug: 'dashboard.topics',
    name: '话题管理',
    module: 'dashboard',
    action: 'topics',
    isSystem: true,
    description: '管理后台话题列表和操作',
    conditions: [],
  },
  {
    slug: 'dashboard.posts',
    name: '回复管理',
    module: 'dashboard',
    action: 'posts',
    isSystem: true,
    description: '管理后台回复列表和操作',
    conditions: [],
  },
  {
    slug: 'dashboard.categories',
    name: '分类管理',
    module: 'dashboard',
    action: 'categories',
    isSystem: true,
    description: '管理后台分类管理',
    conditions: [],
  },
  {
    slug: 'dashboard.tags',
    name: '标签管理',
    module: 'dashboard',
    action: 'tags',
    isSystem: true,
    description: '管理后台标签管理',
    conditions: [],
  },
  {
    slug: 'dashboard.users',
    name: '用户管理',
    module: 'dashboard',
    action: 'users',
    isSystem: true,
    description: '管理后台用户列表和操作',
    conditions: [],
  },
  {
    slug: 'dashboard.roles',
    name: '角色权限',
    module: 'dashboard',
    action: 'roles',
    isSystem: true,
    description: '管理后台角色和权限配置',
    conditions: [],
  },
  {
    slug: 'dashboard.invitations',
    name: '邀请码管理',
    module: 'dashboard',
    action: 'invitations',
    isSystem: true,
    description: '管理后台邀请码和规则管理',
    conditions: [],
  },
  {
    slug: 'dashboard.reports',
    name: '举报管理',
    module: 'dashboard',
    action: 'reports',
    isSystem: true,
    description: '管理后台举报列表和处理',
    conditions: [],
  },
  {
    slug: 'dashboard.moderation',
    name: '内容审核',
    module: 'dashboard',
    action: 'moderation',
    isSystem: true,
    description: '管理后台内容审核队列',
    conditions: [],
  },
  {
    slug: 'dashboard.extensions',
    name: '扩展功能',
    module: 'dashboard',
    action: 'extensions',
    isSystem: true,
    description: '管理后台扩展功能（货币、商城、勋章等）',
    conditions: [],
  },
  {
    slug: 'dashboard.ads',
    name: '广告管理',
    module: 'dashboard',
    action: 'ads',
    isSystem: true,
    description: '管理后台广告位管理',
    conditions: [],
  },
  {
    slug: 'dashboard.settings',
    name: '系统配置',
    module: 'dashboard',
    action: 'settings',
    isSystem: true,
    description: '管理后台系统设置',
    conditions: [],
  },
];

// ============ 权限条件映射（自动生成） ============

/**
 * 权限支持的条件类型映射
 * 从 SYSTEM_PERMISSIONS 自动生成，保持向后兼容
 */
export const PERMISSION_CONDITIONS = Object.fromEntries(
  SYSTEM_PERMISSIONS.map(p => [p.slug, p.conditions || []])
);

// 默认条件（当权限未定义 conditions 时使用）
export const DEFAULT_CONDITIONS = ['own', 'categories', 'rateLimit'];

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
    // 分类：查看
    'category.read',
    // 上传
    'upload.create',
    // 邀请
    'invitation.create',
  ],

  // 访客：只有查看权限
  guest: [
    'topic.read',
    'post.read',
    'user.read',
    'category.read',
  ],
};

/**
 * 角色权限条件配置
 * 定义角色对某些权限的限制条件
 */
export const ROLE_PERMISSION_CONDITIONS = {
  user: {
    // 话题权限
    'topic.update': { scope: ['own'] },  // 只能编辑自己的话题
    'topic.delete': { scope: ['own'] },  // 只能删除自己的话题
    
    // 回复权限
    'post.update': { scope: ['own'] },   // 只能编辑自己的回复
    'post.delete': { scope: ['own'] },   // 只能删除自己的回复
    
    // 用户权限
    'user.update': { scope: ['own'] },   // 只能编辑自己的资料
    'user.delete': { scope: ['own'] },   // 只能删除自己的账号
    
    // 上传权限
    'upload.create': { 
      uploadTypes: ['avatars'],
      maxFileSize: 5120, // 5MB (单位：KB)
      allowedFileTypes: ['jpg', 'jpeg', 'png', 'gif', 'webp'],
    },
  },
  // guest 角色不需要 scope 限制（路由层已控制）
};

/**
 * 角色允许配置的权限白名单
 * 如果未定义，默认允许配置所有非系统权限
 * 用于前端界面限制某些角色只能配置特定权限
 */
export const ALLOWED_ROLES_PERMISSIONS = {
  guest: [
    'topic.read',
    'post.read',
    'user.read',
    'category.read',
  ],
  user: SYSTEM_PERMISSIONS
    .filter(p => !p.slug.startsWith('dashboard.') && // 排除所有后台权限
                 !['topic.pin', 'topic.close', 'user.ban', 'category.create', 'category.update', 'category.delete'].includes(p.slug))
    .map(p => p.slug),
};

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
