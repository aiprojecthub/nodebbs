/**
 * CAPTCHA 核心验证服务
 * 管理 CAPTCHA 配置和验证逻辑
 */
import { eq } from 'drizzle-orm';
import db from '../../db/index.js';
import { captchaProviders } from '../../db/schema.js';
import { ReCaptchaProvider } from './providers/recaptcha.js';
import { HCaptchaProvider } from './providers/hcaptcha.js';
import { TurnstileProvider } from './providers/turnstile.js';
import { CapProvider } from './providers/cap.js';

// 默认启用场景
const DEFAULT_SCENES = {
  register: false,
  login: false,
};

export class CaptchaService {
  constructor() {
    // 注册各验证服务提供商
    this.providers = {
      recaptcha: new ReCaptchaProvider(),
      hcaptcha: new HCaptchaProvider(),
      turnstile: new TurnstileProvider(),
      cap: new CapProvider(),
    };
  }



  /**
   * 获取当前启用的默认 CAPTCHA 配置
   * @returns {Object|null} 配置对象或 null（未启用）
   */
  async getActiveConfig() {
    const [provider] = await db
      .select()
      .from(captchaProviders)
      .where(eq(captchaProviders.isEnabled, true))
      .limit(1);

    if (!provider) {
      return null;
    }

    return this._parseConfig(provider);
  }

  /**
   * 获取前端所需的公开配置
   * @returns {Object|null} 公开配置（不包含 secretKey）
   */
  async getPublicConfig() {
    const fullConfig = await this.getActiveConfig();
    if (!fullConfig) return null;

    // 排除敏感信息和内部字段
    const {
      secretKey,
      provider,
      isEnabled,
      displayName,
      enabledScenes,
      siteKey,
      version,
      mode,
      ...otherConfig
    } = fullConfig;

    return {
      provider,
      siteKey,
      enabledScenes,
      version,
      mode,
      config: otherConfig, // 包含 apiEndpoint 等剩余配置
    };
  }

  /**
   * 检查指定场景是否需要验证
   * @param {string} scene - 场景名称
   * @returns {boolean}
   */
  async isRequired(scene) {
    const config = await this.getActiveConfig();
    if (!config) return false;
    return config.enabledScenes[scene] === true;
  }

  /**
   * 验证 CAPTCHA token
   * @param {string} token - 用户提交的 token
   * @param {string} scene - 验证场景
   * @param {string} ip - 用户 IP 地址
   * @returns {Object} 验证结果
   */
  async verify(token, scene, ip) {
    const config = await this.getActiveConfig();

    // 如果未启用 CAPTCHA，直接通过
    if (!config) {
      return { success: true, skipReason: 'captcha_disabled' };
    }

    // 如果该场景未开启验证，直接通过
    if (!config.enabledScenes[scene]) {
      return { success: true, skipReason: 'scene_not_required' };
    }

    // token 为空，需要验证
    if (!token) {
      return {
        success: false,
        reason: 'token_missing',
        message: '请完成人机验证',
      };
    }

    // 获取对应的 provider 进行验证
    const provider = this.providers[config.provider];
    if (!provider) {
      console.error(`[CAPTCHA] 未知的提供商: ${config.provider}`);
      return {
        success: false,
        reason: 'unknown_provider',
        message: '验证服务配置错误',
      };
    }

    try {
      const result = await provider.verify(token, config, ip);

      // 服务端请求错误（网络不通、配置错误等）→ 降级放行
      // 仅当验证服务本身不可用时放行，明确的验证失败（token 无效）仍然阻断
      if (!result.success && result.reason === 'request_error') {
        console.warn(`[CAPTCHA] 验证服务不可用，降级放行: provider=${config.provider}, scene=${scene}`);
        return { success: true, skipReason: 'service_unavailable_fallback' };
      }

      return result;
    } catch (error) {
      // 未预期的异常（代码 bug、网络超时等）→ 降级放行，避免阻断用户操作
      console.error(`[CAPTCHA] 验证异常，降级放行: ${error.message}`);
      return { success: true, skipReason: 'service_error_fallback' };
    }
  }



  /**
   * 解析数据库中的配置
   */
  _parseConfig(provider) {
    let config = {};
    let enabledScenes = {};

    try {
      config = provider.config ? JSON.parse(provider.config) : {};
    } catch (e) {
      console.error('[CAPTCHA] 解析 config 失败:', e);
    }

    try {
      const parsed = provider.enabledScenes ? JSON.parse(provider.enabledScenes) : {};
      
      // 合并默认值，确保包含所有场景且已有配置生效
      enabledScenes = { ...DEFAULT_SCENES, ...parsed };
    } catch (e) {
      console.error('[CAPTCHA] 解析 enabledScenes 失败:', e);
      enabledScenes = { ...DEFAULT_SCENES };
    }

    // 将 config 中的所有属性展开到顶层，方便访问自定义属性（如 apiEndpoint）
    return {
      provider: provider.provider,
      isEnabled: provider.isEnabled,
      displayName: provider.displayName,
      enabledScenes,
      
      // 默认值 (如果 config 中有则会被覆盖)
      siteKey: '',
      secretKey: '',
      
      // 展开配置
      ...config,
    };
  }
}
