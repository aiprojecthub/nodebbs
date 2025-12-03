/**
 * 验证码类型和配置
 * 统一管理不同场景的验证码参数
 */

// 发送渠道枚举
export const VerificationChannel = {
  EMAIL: 'email',
  SMS: 'sms',
};

// 用户验证规则枚举
export const UserValidation = {
  MUST_EXIST: 'must_exist', // 用户必须存在（如：登录、密码重置）
  MUST_NOT_EXIST: 'must_not_exist', // 用户必须不存在（如：注册）
  // 注：其他场景通过组合 requireAuth 和以上规则实现
  // - 绑定账号：不设置 userValidation，在业务逻辑中检查是否被占用
  // - 更换账号：MUST_EXIST + requireAuth，在业务逻辑中检查所有权
  // - 敏感操作：不设置 userValidation
};

// 验证码类型枚举
export const VerificationCodeType = {
  // ========== 邮箱渠道 ==========
  // 邮箱注册验证
  EMAIL_REGISTER: 'email_register',

  // 邮箱登录
  EMAIL_LOGIN: 'email_login',

  // 邮箱密码重置
  EMAIL_PASSWORD_RESET: 'email_password_reset',

  // 绑定邮箱（需要登录）
  EMAIL_BIND: 'email_bind',

  // 更换邮箱（需要登录）
  EMAIL_CHANGE: 'email_change',

  // ========== 短信渠道 ==========
  // 手机号注册验证
  PHONE_REGISTER: 'phone_register',

  // 手机号登录
  PHONE_LOGIN: 'phone_login',

  // 手机号密码重置
  PHONE_PASSWORD_RESET: 'phone_password_reset',

  // 绑定手机号（需要登录）
  PHONE_BIND: 'phone_bind',

  // 更换手机号（需要登录）
  PHONE_CHANGE: 'phone_change',

  // ========== 通用 ==========
  // 敏感操作验证（默认邮件，可配置）
  SENSITIVE_OPERATION: 'sensitive_operation',
};

/**
 * 验证码配置
 * 每个类型可以配置：
 * - channel: 发送渠道 ('email' | 'sms')
 * - digits: 验证码位数
 * - expiryMinutes: 过期时间（分钟）
 * - requireAuth: 是否需要认证（登录）
 * - userValidation: 用户验证规则 (可选: 'must_exist' | 'must_not_exist')
 * - maxRetries: 最大验证失败次数
 * - rateLimitSeconds: 发送间隔限制（秒）
 * - template: 模板名称/代码（邮件模板名或短信模板代码）
 */
export const VerificationCodeConfig = {
  // ========== 邮箱渠道配置 ==========
  [VerificationCodeType.EMAIL_REGISTER]: {
    channel: VerificationChannel.EMAIL,
    digits: 6,
    expiryMinutes: 10,
    requireAuth: false,
    userValidation: UserValidation.MUST_NOT_EXIST,
    maxRetries: 5,
    rateLimitSeconds: 60,
    description: '注册验证',
    template: 'verification-code',
  },

  [VerificationCodeType.EMAIL_LOGIN]: {
    channel: VerificationChannel.EMAIL,
    digits: 6,
    expiryMinutes: 5,
    requireAuth: false,
    userValidation: UserValidation.MUST_EXIST,
    maxRetries: 3,
    rateLimitSeconds: 60,
    description: '登录验证',
    template: 'verification-code',
  },

  [VerificationCodeType.EMAIL_PASSWORD_RESET]: {
    channel: VerificationChannel.EMAIL,
    digits: 6,
    expiryMinutes: 10,
    requireAuth: false,
    userValidation: UserValidation.MUST_EXIST,
    maxRetries: 5,
    rateLimitSeconds: 120,
    description: '密码重置',
    template: 'verification-code',
  },

  [VerificationCodeType.EMAIL_BIND]: {
    channel: VerificationChannel.EMAIL,
    digits: 6,
    expiryMinutes: 10,
    requireAuth: true,
    // userValidation: 不设置，在业务逻辑中检查是否被其他用户占用
    maxRetries: 5,
    rateLimitSeconds: 60,
    description: '绑定邮箱',
    template: 'verification-code',
  },

  [VerificationCodeType.EMAIL_CHANGE]: {
    channel: VerificationChannel.EMAIL,
    digits: 6,
    expiryMinutes: 10,
    requireAuth: true,
    userValidation: UserValidation.MUST_EXIST, // 在业务逻辑中额外检查所有权
    maxRetries: 5,
    rateLimitSeconds: 60,
    description: '更换邮箱',
    template: 'verification-code',
  },

  // ========== 短信渠道配置 ==========
  [VerificationCodeType.PHONE_REGISTER]: {
    channel: VerificationChannel.SMS,
    digits: 6,
    expiryMinutes: 10,
    requireAuth: false,
    userValidation: UserValidation.MUST_NOT_EXIST,
    maxRetries: 5,
    rateLimitSeconds: 60,
    description: '注册验证',
    template: 'SMS_REGISTER',
  },

  [VerificationCodeType.PHONE_LOGIN]: {
    channel: VerificationChannel.SMS,
    digits: 6,
    expiryMinutes: 5,
    requireAuth: false,
    userValidation: UserValidation.MUST_EXIST,
    maxRetries: 3,
    rateLimitSeconds: 60,
    description: '登录验证',
    template: 'SMS_LOGIN',
  },

  [VerificationCodeType.PHONE_PASSWORD_RESET]: {
    channel: VerificationChannel.SMS,
    digits: 6,
    expiryMinutes: 10,
    requireAuth: false,
    userValidation: UserValidation.MUST_EXIST,
    maxRetries: 5,
    rateLimitSeconds: 120,
    description: '密码重置',
    template: 'SMS_PASSWORD_RESET',
  },

  [VerificationCodeType.PHONE_BIND]: {
    channel: VerificationChannel.SMS,
    digits: 6,
    expiryMinutes: 10,
    requireAuth: true,
    // userValidation: 不设置，在业务逻辑中检查是否被其他用户占用
    maxRetries: 5,
    rateLimitSeconds: 60,
    description: '绑定手机号',
    template: 'SMS_BIND',
  },

  [VerificationCodeType.PHONE_CHANGE]: {
    channel: VerificationChannel.SMS,
    digits: 6,
    expiryMinutes: 10,
    requireAuth: true,
    userValidation: UserValidation.MUST_EXIST, // 在业务逻辑中额外检查所有权
    maxRetries: 5,
    rateLimitSeconds: 60,
    description: '更换手机号',
    template: 'SMS_CHANGE',
  },

  // ========== 通用配置 ==========
  [VerificationCodeType.SENSITIVE_OPERATION]: {
    channel: VerificationChannel.EMAIL,
    digits: 6,
    expiryMinutes: 5,
    requireAuth: true,
    // userValidation: 不设置，敏感操作不需要验证用户存在性
    maxRetries: 3,
    rateLimitSeconds: 30,
    description: '敏感操作验证',
    template: 'verification-code',
  },
};

/**
 * 获取验证码配置
 * @param {string} type - 验证码类型
 * @returns {object|null} 配置对象
 */
export function getVerificationCodeConfig(type) {
  return VerificationCodeConfig[type] || null;
}

/**
 * 验证类型是否有效
 * @param {string} type - 验证码类型
 * @returns {boolean}
 */
export function isValidVerificationCodeType(type) {
  return Object.values(VerificationCodeType).includes(type);
}
