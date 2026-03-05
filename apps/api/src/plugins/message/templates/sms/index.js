/**
 * SMS 模板配置
 * 
 * 短信模板由云服务商管理，这里存储模板代码和参数映射。
 * 
 * ═══════════════════════════════════════════════════════════════
 * 双层配置说明
 * ═══════════════════════════════════════════════════════════════
 * 
 * 1. 本文件定义「逻辑模板名」和参数映射：
 *    - 模板名如 SMS_LOGIN、SMS_PASSWORD_RESET 是系统内部使用的标识符
 *    - params 定义模板需要的参数名称（如 code）
 *    - templateCode/templateId 是占位符，实际值需在数据库中配置
 * 
 * 2. 真实模板 ID 需在数据库 messageProviders.config.templates 中配置：
 *    {
 *      "templates": {
 *        "SMS_LOGIN": "SMS_987654321",
 *      }
 *    }
 * 
 * 3. 发送流程：
 *    - 业务代码使用逻辑模板名（如 SMS_LOGIN）
 *    - SmsChannel 根据提供商配置获取真实模板 ID
 *    - 如果未配置映射，将使用本文件中的默认值（会触发警告日志）
 * 
 * ═══════════════════════════════════════════════════════════════
 * 
 * 模板配置结构：
 * - templateCode: 阿里云模板代码（默认占位符）
 * - templateId: 腾讯云模板 ID（默认占位符）
 * - params: 模板参数名称列表（用于参数映射和校验）
 * - description: 模板描述
 */

/**
 * 阿里云短信模板配置
 * 需要在阿里云控制台申请并获取模板代码
 */
const aliyunTemplates = {
  SMS_LOGIN: {
    templateCode: 'SMS_LOGIN',
    params: ['code'],
    description: '登录验证码',
  },
  SMS_PASSWORD_RESET: {
    templateCode: 'SMS_PASSWORD_RESET',
    params: ['code'],
    description: '密码重置验证码',
  },
  SMS_BIND: {
    templateCode: 'SMS_BIND',
    params: ['code'],
    description: '绑定手机号验证码',
  },
  SMS_CHANGE: {
    templateCode: 'SMS_CHANGE',
    params: ['code'],
    description: '更换手机号验证码',
  },
};

/**
 * 腾讯云短信模板配置
 * 需要在腾讯云控制台申请并获取模板 ID
 */
const tencentTemplates = {
  SMS_LOGIN: {
    templateId: 'SMS_LOGIN',
    params: ['code'],
    description: '登录验证码',
  },
  SMS_PASSWORD_RESET: {
    templateId: 'SMS_PASSWORD_RESET',
    params: ['code'],
    description: '密码重置验证码',
  },
  SMS_BIND: {
    templateId: 'SMS_BIND',
    params: ['code'],
    description: '绑定手机号验证码',
  },
  SMS_CHANGE: {
    templateId: 'SMS_CHANGE',
    params: ['code'],
    description: '更换手机号验证码',
  },
};

/**
 * 获取 SMS 模板配置
 * @param {string} templateName - 模板名称（对应 VerificationCodeConfig 中的 template）
 * @param {string} providerType - 提供商类型 ('aliyun' | 'tencent')
 * @returns {object|null} 模板配置
 */
export function getSmsTemplate(templateName, providerType) {
  const templates = providerType === 'tencent' ? tencentTemplates : aliyunTemplates;
  return templates[templateName] || null;
}

/**
 * 获取所有可用的模板名称
 * @param {string} providerType - 提供商类型
 */
export function getAvailableTemplates(providerType) {
  const templates = providerType === 'tencent' ? tencentTemplates : aliyunTemplates;
  return Object.keys(templates);
}

export default {
  getSmsTemplate,
  getAvailableTemplates,
  aliyunTemplates,
  tencentTemplates,
};
