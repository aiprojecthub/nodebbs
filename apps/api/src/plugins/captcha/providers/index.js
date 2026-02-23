/**
 * 人机验证提供商工厂
 * 动态导入对应的 provider 实现，避免未安装的依赖导致启动失败
 */
import { CaptchaError, CaptchaErrorCode } from '../errors.js';

/**
 * 提供商映射表
 * key: 提供商标识（与数据库中的 provider 字段一致）
 * value: 异步工厂函数，返回 provider 实例
 */
const providerFactories = {
  recaptcha: async () => {
    const { ReCaptchaProvider } = await import('./recaptcha.js');
    return new ReCaptchaProvider();
  },
  hcaptcha: async () => {
    const { HCaptchaProvider } = await import('./hcaptcha.js');
    return new HCaptchaProvider();
  },
  turnstile: async () => {
    const { TurnstileProvider } = await import('./turnstile.js');
    return new TurnstileProvider();
  },
  cap: async () => {
    const { CapProvider } = await import('./cap.js');
    return new CapProvider();
  },
};

/**
 * 根据提供商类型创建对应的验证提供商实例
 * @param {string} type - 提供商类型
 * @returns {Promise<BaseCaptchaProvider>}
 */
export async function createCaptchaProvider(type) {
  const factory = providerFactories[type];
  if (!factory) {
    throw new CaptchaError(
      CaptchaErrorCode.UNSUPPORTED_PROVIDER,
      `不支持的人机验证提供商: ${type}`
    );
  }
  return factory();
}

/**
 * 获取所有支持的提供商类型列表
 */
export function getSupportedProviders() {
  return Object.keys(providerFactories);
}
