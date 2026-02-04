/**
 * SMS 提供商索引
 * 使用动态导入实现按需加载，避免未配置的提供商依赖导致启动失败
 */
export const smsProviderSenders = {
  aliyun: async (config, options) => {
    const { sendViaAliyun } = await import('./aliyun.js');
    return sendViaAliyun(config, options);
  },
  tencent: async (config, options) => {
    const { sendViaTencent } = await import('./tencent.js');
    return sendViaTencent(config, options);
  },
};
