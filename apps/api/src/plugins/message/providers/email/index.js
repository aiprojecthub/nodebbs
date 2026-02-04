/**
 * Email 提供商索引
 * 使用动态导入实现按需加载，避免未配置的提供商依赖导致启动失败
 */
export const emailProviderSenders = {
  smtp: async (config, options) => {
    const { sendViaSMTP } = await import('./smtp.js');
    return sendViaSMTP(config, options);
  },
  sendgrid: async (config, options) => {
    const { sendViaSendGrid } = await import('./sendgrid.js');
    return sendViaSendGrid(config, options);
  },
  resend: async (config, options) => {
    const { sendViaResend } = await import('./resend.js');
    return sendViaResend(config, options);
  },
  // 阿里云邮件推送使用 SMTP 方式
  aliyun: async (config, options) => {
    const { sendViaSMTP } = await import('./smtp.js');
    return sendViaSMTP(config, options);
  },
};
