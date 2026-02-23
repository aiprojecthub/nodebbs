/**
 * 系统设置统一配置文件
 * 包含所有系统设置的定义、默认值、类型、描述、权限级别等
 */

/**
 * 设置访问级别
 */
export const ACCESS_LEVEL = {
  PUBLIC: 'public', // 所有人可见
  ADMIN: 'admin', // 仅管理员可见
};

/**
 * 设置分类名称映射
 */
export const CATEGORY_NAMES = {
  general: '通用设置',
  features: '功能开关',
  user_settings: '用户设置',
  spam_protection: '垃圾注册拦截',
  rate_limit: '访问限速',
  other: '其他设置',
};

/**
 * 系统设置定义
 */
export const SETTING_KEYS = {
  // ============ 通用设置 ============
  SITE_NAME: {
    key: 'site_name',
    defaultValue: 'NodeBBS',
    valueType: 'string',
    description: '站点名称',
    category: 'general',
    accessLevel: ACCESS_LEVEL.PUBLIC,
  },
  SHOW_LOGO_TEXT: {
    key: 'show_logo_text',
    defaultValue: 'true',
    valueType: 'boolean',
    description: '在 Logo 旁显示站点名称',
    category: 'general',
    accessLevel: ACCESS_LEVEL.PUBLIC,
  },
  SITE_DESCRIPTION: {
    key: 'site_description',
    defaultValue: '一个基于 Node.js 和 React 的现代化论坛系统',
    valueType: 'string',
    description: '站点描述',
    category: 'general',
    accessLevel: ACCESS_LEVEL.PUBLIC,
  },
  SITE_FOOTER_HTML: {
    key: 'site_footer_html',
    defaultValue: '',
    valueType: 'string',
    description: '页脚自定义 HTML 内容（支持 ICP 备案号、公安备案等显示）',
    category: 'general',
    accessLevel: ACCESS_LEVEL.PUBLIC,
  },
  SITE_ANALYTICS_SCRIPTS: {
    key: 'site_analytics_scripts',
    defaultValue: '',
    valueType: 'string',
    description: '自定义统计脚本（支持 Google Analytics、百度统计等，将被插入到页面中）',
    category: 'general',
    accessLevel: ACCESS_LEVEL.PUBLIC,
  },
  SITE_LOGO: {
    key: 'site_logo',
    defaultValue: '',
    valueType: 'string',
    description: '站点 Logo（SVG/PNG 格式，建议尺寸 128x128 或更高）',
    category: 'general',
    accessLevel: ACCESS_LEVEL.PUBLIC,
  },
  SITE_FAVICON: {
    key: 'site_favicon',
    defaultValue: '',
    valueType: 'string',
    description: '站点 Favicon（ICO/PNG 格式，建议尺寸 48x48 或更高）',
    category: 'general',
    accessLevel: ACCESS_LEVEL.PUBLIC,
  },
  SITE_APPLE_TOUCH_ICON: {
    key: 'site_apple_touch_icon',
    defaultValue: '',
    valueType: 'string',
    description: 'Apple Touch Icon（PNG 格式，建议尺寸 180x180）',
    category: 'general',
    accessLevel: ACCESS_LEVEL.PUBLIC,
  },
  SITE_URL: {
    key: 'site_url',
    defaultValue: '',
    valueType: 'string',
    description: '站点 URL（用于 SEO 和社交分享，如 https://example.com）',
    category: 'general',
    accessLevel: ACCESS_LEVEL.PUBLIC,
  },
  SITE_KEYWORDS: {
    key: 'site_keywords',
    defaultValue: '',
    valueType: 'string',
    description: 'SEO 关键词（多个关键词用英文逗号分隔）',
    category: 'general',
    accessLevel: ACCESS_LEVEL.PUBLIC,
  },

  // ============ 功能开关 ============
  REGISTRATION_MODE: {
    key: 'registration_mode',
    defaultValue: 'open',
    valueType: 'string',
    description: '注册模式：open（开放注册）、invitation（邀请码注册）、closed（关闭注册）',
    category: 'features',
    accessLevel: ACCESS_LEVEL.PUBLIC,
    validValues: ['open', 'invitation', 'closed'],
  },
  EMAIL_VERIFICATION_REQUIRED: {
    key: 'email_verification_required',
    defaultValue: 'false',
    valueType: 'boolean',
    description: '是否要求用户验证邮箱后才能进行创建话题、回复、发站内信等操作',
    category: 'features',
    accessLevel: ACCESS_LEVEL.PUBLIC,
  },
  CONTENT_MODERATION_ENABLED: {
    key: 'content_moderation_enabled',
    defaultValue: 'false',
    valueType: 'boolean',
    description: '是否启用内容审核（新发布的内容需要审核后才能公开显示）',
    category: 'features',
    accessLevel: ACCESS_LEVEL.ADMIN,
  },
  QR_LOGIN_ENABLED: {
    key: 'qr_login_enabled',
    defaultValue: 'false',
    valueType: 'boolean',
    description: '是否启用扫码登录功能',
    category: 'features',
    accessLevel: ACCESS_LEVEL.PUBLIC,
  },
  QR_LOGIN_TIMEOUT: {
    key: 'qr_login_timeout',
    defaultValue: '300',
    valueType: 'number',
    description: '二维码登录请求的有效期（秒），默认5分钟',
    category: 'features',
    accessLevel: ACCESS_LEVEL.PUBLIC,
  },

  // ============ 用户设置 ============
  ALLOW_USERNAME_CHANGE: {
    key: 'allow_username_change',
    defaultValue: 'false',
    valueType: 'boolean',
    description: '是否允许用户修改用户名',
    category: 'user_settings',
    accessLevel: ACCESS_LEVEL.PUBLIC,
  },
  USERNAME_CHANGE_COOLDOWN_DAYS: {
    key: 'username_change_cooldown_days',
    defaultValue: '30',
    valueType: 'number',
    description: '用户名修改冷却期（天），0表示无冷却期',
    category: 'user_settings',
    accessLevel: ACCESS_LEVEL.PUBLIC,
  },
  USERNAME_CHANGE_LIMIT: {
    key: 'username_change_limit',
    defaultValue: '3',
    valueType: 'number',
    description: '用户名修改次数限制，0表示无限制',
    category: 'user_settings',
    accessLevel: ACCESS_LEVEL.PUBLIC,
  },
  USERNAME_CHANGE_REQUIRES_PASSWORD: {
    key: 'username_change_requires_password',
    defaultValue: 'true',
    valueType: 'boolean',
    description: '修改用户名是否需要密码验证',
    category: 'user_settings',
    accessLevel: ACCESS_LEVEL.PUBLIC,
  },
  ALLOW_EMAIL_CHANGE: {
    key: 'allow_email_change',
    defaultValue: 'true',
    valueType: 'boolean',
    description: '是否允许用户修改邮箱',
    category: 'user_settings',
    accessLevel: ACCESS_LEVEL.PUBLIC,
  },
  EMAIL_CHANGE_REQUIRES_PASSWORD: {
    key: 'email_change_requires_password',
    defaultValue: 'true',
    valueType: 'boolean',
    description: '修改邮箱是否需要密码验证',
    category: 'user_settings',
    accessLevel: ACCESS_LEVEL.PUBLIC,
  },


  // ============ StopForumSpam 垃圾注册拦截 ============
  SPAM_PROTECTION_ENABLED: {
    key: 'spam_protection_enabled',
    defaultValue: 'false',
    valueType: 'boolean',
    description: '是否启用垃圾注册拦截（使用 StopForumSpam API）',
    category: 'spam_protection',
    accessLevel: ACCESS_LEVEL.ADMIN,
  },
  SPAM_PROTECTION_API_KEY: {
    key: 'spam_protection_api_key',
    defaultValue: '',
    valueType: 'string',
    description: 'StopForumSpam API Key（可选，用于提高请求限制）',
    category: 'spam_protection',
    accessLevel: ACCESS_LEVEL.ADMIN,
  },
  SPAM_PROTECTION_CHECK_IP: {
    key: 'spam_protection_check_ip',
    defaultValue: 'true',
    valueType: 'boolean',
    description: '是否检查 IP 地址',
    category: 'spam_protection',
    accessLevel: ACCESS_LEVEL.ADMIN,
  },
  SPAM_PROTECTION_CHECK_EMAIL: {
    key: 'spam_protection_check_email',
    defaultValue: 'true',
    valueType: 'boolean',
    description: '是否检查邮箱地址',
    category: 'spam_protection',
    accessLevel: ACCESS_LEVEL.ADMIN,
  },
  SPAM_PROTECTION_CHECK_USERNAME: {
    key: 'spam_protection_check_username',
    defaultValue: 'true',
    valueType: 'boolean',
    description: '是否检查用户名',
    category: 'spam_protection',
    accessLevel: ACCESS_LEVEL.ADMIN,
  },

  // ============ 访问限速 ============
  RATE_LIMIT_ENABLED: {
    key: 'rate_limit_enabled',
    defaultValue: 'true',
    valueType: 'boolean',
    description: '是否启用访问限速',
    category: 'rate_limit',
    accessLevel: ACCESS_LEVEL.ADMIN,
  },
  RATE_LIMIT_WINDOW_MS: {
    key: 'rate_limit_window_ms',
    defaultValue: '60000',
    valueType: 'number',
    description: '限速时间窗口（毫秒），默认60秒',
    category: 'rate_limit',
    accessLevel: ACCESS_LEVEL.ADMIN,
  },
  RATE_LIMIT_MAX_REQUESTS: {
    key: 'rate_limit_max_requests',
    defaultValue: '100',
    valueType: 'number',
    description: '时间窗口内最大请求数',
    category: 'rate_limit',
    accessLevel: ACCESS_LEVEL.ADMIN,
  },
  RATE_LIMIT_AUTH_MULTIPLIER: {
    key: 'rate_limit_auth_multiplier',
    defaultValue: '2',
    valueType: 'number',
    description: '已登录用户的限速倍数',
    category: 'rate_limit',
    accessLevel: ACCESS_LEVEL.ADMIN,
  },
};

/**
 * 获取所有设置的 Map 用于快速查找 (key -> config)
 */
export const SETTINGS_MAP = Object.values(SETTING_KEYS).reduce((acc, setting) => {
  acc[setting.key] = setting;
  return acc;
}, {});

/**
 * 将配置按分类分组
 */
export const SETTINGS_BY_CATEGORY = Object.values(SETTING_KEYS).reduce((acc, setting) => {
  const category = setting.category || 'other';
  if (!acc[category]) {
    acc[category] = [];
  }
  acc[category].push(setting);
  return acc;
}, {});
