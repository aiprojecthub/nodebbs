/**
 * RBAC 权限系统配置
 *
 * 定义权限模块、操作类型、条件类型等
 * 这是 RBAC 系统的唯一数据源（Single Source of Truth）
 */

// ============ 权限模块定义 ============

// 权限模块选项
export const MODULE_OPTIONS = [
  { value: 'topic', label: '话题' },
  { value: 'post', label: '回复' },
  { value: 'user', label: '用户' },
  { value: 'category', label: '分类' },
  { value: 'upload', label: '上传' },
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
    { value: 'move', label: '移动' },
    { value: 'approve', label: '审核' },
  ],
  post: [
    { value: 'approve', label: '审核' },
  ],
  user: [
    { value: 'ban', label: '封禁' },
    { value: 'role.assign', label: '分配角色' },
  ],
  category: [],
  upload: [],
};

// ============ 条件类型定义 ============

/**
 * 条件类型元数据定义
 * - key: 条件标识
 * - label: 显示名称
 * - type: 数据类型 (boolean | number | string | array | object)
 * - component: 前端渲染组件 (switch | number | tags | rate | time)
 * - description: 描述说明
 * - schema: 复合类型的字段定义（可选）
 *
 * 注意：哪个权限能用哪些条件，由 SYSTEM_PERMISSIONS.conditions 决定
 */
export const CONDITION_TYPES = {
  // ===== 通用条件 =====
  own: {
    key: 'own',
    label: '仅限自己的资源',
    type: 'boolean',
    component: 'switch',
    description: '只能操作自己创建的内容',
  },

  // ===== 范围限制 =====
  categories: {
    key: 'categories',
    label: '限定分类',
    type: 'array',
    component: 'tags',
    description: '只在指定分类ID内有效',
  },
  timeRange: {
    key: 'timeRange',
    label: '生效时间段',
    type: 'object',
    component: 'time',
    description: '权限生效的时间段',
    schema: {
      start: { type: 'string', label: '开始时间', format: 'HH:mm' },
      end: { type: 'string', label: '结束时间', format: 'HH:mm' },
    },
  },

  // ===== 用户门槛 =====
  minPosts: {
    key: 'minPosts',
    label: '最低发帖数',
    type: 'number',
    component: 'number',
    description: '用户发帖数需达到指定值',
  },
  accountAge: {
    key: 'accountAge',
    label: '账号注册天数',
    type: 'number',
    component: 'number',
    description: '账号注册天数需达到指定值',
  },

  // ===== 频率限制 =====
  rateLimit: {
    key: 'rateLimit',
    label: '频率限制',
    type: 'object',
    component: 'rate',
    description: '限制操作频率（次数/时间段）',
    schema: {
      count: { type: 'number', label: '次数', min: 1 },
      period: { type: 'string', label: '周期', enum: ['minute', 'hour', 'day'] },
    },
  },

  // ===== 上传限制 =====
  maxFileSize: {
    key: 'maxFileSize',
    label: '最大文件大小(KB)',
    type: 'number',
    component: 'number',
    description: '单个文件最大大小，单位KB',
  },
  maxFilesPerDay: {
    key: 'maxFilesPerDay',
    label: '每日上传数量',
    type: 'number',
    component: 'number',
    description: '每天最多上传文件数量',
  },
  allowedFileTypes: {
    key: 'allowedFileTypes',
    label: '允许的文件类型',
    type: 'array',
    component: 'tags',
    description: '允许上传的文件扩展名（如: jpg,png,gif）',
  },
  uploadTypes: {
    key: 'uploadTypes',
    label: '允许的上传类型',
    type: 'array',
    component: 'tags',
    description: '允许的上传目录类型（如: avatar,topic,badge,common,item,frame,site）',
  },
};

// ============ 系统权限定义（唯一数据源） ============

/**
 * 系统权限定义
 * 包含权限基本信息和支持的条件类型
 */
export const SYSTEM_PERMISSIONS = [
  // ========== 话题权限 ==========
  {
    slug: 'topic.create',
    name: '创建话题',
    module: 'topic',
    action: 'create',
    isSystem: true,
    conditions: ['categories', 'rateLimit', 'minPosts', 'accountAge', 'timeRange'],
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
    conditions: ['own', 'categories'],
  },
  {
    slug: 'topic.delete',
    name: '删除话题',
    module: 'topic',
    action: 'delete',
    isSystem: true,
    conditions: ['own', 'categories'],
  },
  {
    slug: 'topic.pin',
    name: '置顶话题',
    module: 'topic',
    action: 'pin',
    isSystem: true,
    conditions: ['categories'],
  },
  {
    slug: 'topic.close',
    name: '关闭话题',
    module: 'topic',
    action: 'close',
    isSystem: true,
    conditions: ['categories'],
  },
  {
    slug: 'topic.approve',
    name: '审核话题',
    module: 'topic',
    action: 'approve',
    isSystem: true,
    conditions: ['categories'],
  },
  {
    slug: 'topic.move',
    name: '移动话题',
    module: 'topic',
    action: 'move',
    isSystem: true,
    conditions: ['categories'],
  },

  // ========== 回复权限 ==========
  {
    slug: 'post.create',
    name: '发表回复',
    module: 'post',
    action: 'create',
    isSystem: true,
    conditions: ['categories', 'rateLimit', 'minPosts', 'accountAge', 'timeRange'],
  },
  {
    slug: 'post.read',
    name: '查看回复',
    module: 'post',
    action: 'read',
    isSystem: true,
    conditions: ['categories'],
  },
  {
    slug: 'post.update',
    name: '编辑回复',
    module: 'post',
    action: 'update',
    isSystem: true,
    conditions: ['own'],
  },
  {
    slug: 'post.delete',
    name: '删除回复',
    module: 'post',
    action: 'delete',
    isSystem: true,
    conditions: ['own', 'categories'],
  },
  {
    slug: 'post.approve',
    name: '审核回复',
    module: 'post',
    action: 'approve',
    isSystem: true,
    conditions: ['categories'],
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
    conditions: ['own'],
  },
  {
    slug: 'user.delete',
    name: '删除用户',
    module: 'user',
    action: 'delete',
    isSystem: true,
    conditions: [],
  },
  {
    slug: 'user.ban',
    name: '封禁用户',
    module: 'user',
    action: 'ban',
    isSystem: true,
    conditions: [],
  },
  {
    slug: 'user.role.assign',
    name: '分配角色',
    module: 'user',
    action: 'role.assign',
    isSystem: true,
    conditions: [],
  },

  // ========== 分类权限 ==========
  {
    slug: 'category.create',
    name: '创建分类',
    module: 'category',
    action: 'create',
    isSystem: true,
    conditions: [],
  },
  {
    slug: 'category.read',
    name: '查看分类',
    module: 'category',
    action: 'read',
    isSystem: true,
    conditions: [],
  },
  {
    slug: 'category.update',
    name: '编辑分类',
    module: 'category',
    action: 'update',
    isSystem: true,
    conditions: [],
  },
  {
    slug: 'category.delete',
    name: '删除分类',
    module: 'category',
    action: 'delete',
    isSystem: true,
    conditions: [],
  },

  // ========== 上传权限 ==========
  {
    slug: 'upload.create',
    name: '上传文件',
    module: 'upload',
    action: 'create',
    isSystem: true,
    conditions: ['uploadTypes', 'maxFileSize', 'maxFilesPerDay', 'allowedFileTypes', 'rateLimit'],
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
    parentSlug: null,
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
    parentSlug: null,
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
    parentSlug: null,
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
    // 用户：查看、编辑自己的资料
    'user.read', 'user.update',
    // 分类：查看
    'category.read',
    // 上传
    'upload.create',
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
    'topic.update': { own: true },  // 只能编辑自己的话题
    'topic.delete': { own: true },  // 只能删除自己的话题
    'post.update': { own: true },   // 只能编辑自己的回复
    'post.delete': { own: true },   // 只能删除自己的回复
    'user.update': { own: true },   // 只能编辑自己的资料
    'upload.create': { uploadTypes: ['avatar'] }, // 只能上传头像
  },
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

  // 5. 检查 SYSTEM_ROLES 中 parentSlug 的有效性
  const roleSlugs = new Set(SYSTEM_ROLES.map(r => r.slug));
  for (const role of SYSTEM_ROLES) {
    if (role.parentSlug && !roleSlugs.has(role.parentSlug)) {
      errors.push(`SYSTEM_ROLES "${role.slug}" 的 parentSlug "${role.parentSlug}" 未找到`);
    }
  }

  // 6. 检查 ROLE_PERMISSION_MAP 中的角色是否都在 SYSTEM_ROLES 中定义
  for (const roleSlug of Object.keys(ROLE_PERMISSION_MAP)) {
    if (!roleSlugs.has(roleSlug)) {
      errors.push(`ROLE_PERMISSION_MAP 中定义了角色 "${roleSlug}"，但 SYSTEM_ROLES 中未找到`);
    }
  }

  // 7. 检查 ROLE_PERMISSION_CONDITIONS 中的角色是否都在 SYSTEM_ROLES 中定义
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
