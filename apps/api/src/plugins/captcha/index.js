/**
 * CAPTCHA 插件
 * 提供人机验证功能，支持 reCAPTCHA、hCaptcha、Cloudflare Turnstile、Cap
 */
import fp from 'fastify-plugin';
import { eq } from 'drizzle-orm';
import db from '../../db/index.js';
import { captchaProviders } from '../../db/schema.js';
import { createCaptchaProvider } from './providers/index.js';

// 默认启用场景
const DEFAULT_SCENES = {
  register: false,
  login: false,
};

async function captchaPlugin(fastify, options) {
  // 缓存已实例化的 provider
  const providerInstances = new Map();

  /**
   * 获取或创建 provider 实例（lazy + 缓存）
   */
  async function getProvider(type) {
    if (providerInstances.has(type)) {
      return providerInstances.get(type);
    }
    const instance = await createCaptchaProvider(type);
    providerInstances.set(type, instance);
    return instance;
  }

  /**
   * 解析数据库中的配置
   */
  function parseConfig(provider) {
    let config = {};
    let enabledScenes = {};

    try {
      config = provider.config ? JSON.parse(provider.config) : {};
    } catch (e) {
      fastify.log.error('[CAPTCHA] 解析 config 失败:', e);
    }

    try {
      const parsed = provider.enabledScenes ? JSON.parse(provider.enabledScenes) : {};
      enabledScenes = { ...DEFAULT_SCENES, ...parsed };
    } catch (e) {
      fastify.log.error('[CAPTCHA] 解析 enabledScenes 失败:', e);
      enabledScenes = { ...DEFAULT_SCENES };
    }

    return {
      provider: provider.provider,
      isEnabled: provider.isEnabled,
      displayName: provider.displayName,
      enabledScenes,
      siteKey: '',
      secretKey: '',
      ...config,
    };
  }

  /**
   * 获取当前启用的 CAPTCHA 配置
   */
  async function getActiveConfig() {
    const [provider] = await db
      .select()
      .from(captchaProviders)
      .where(eq(captchaProviders.isEnabled, true))
      .limit(1);

    if (!provider) {
      return null;
    }

    return parseConfig(provider);
  }

  /**
   * 获取前端所需的公开配置（不包含 secretKey）
   */
  async function getPublicConfig() {
    const fullConfig = await getActiveConfig();
    if (!fullConfig) return null;

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
      config: otherConfig,
    };
  }

  /**
   * 检查指定场景是否需要验证
   */
  async function isRequired(scene) {
    const config = await getActiveConfig();
    if (!config) return false;
    return config.enabledScenes[scene] === true;
  }

  /**
   * 验证 CAPTCHA token
   */
  async function verify(token, scene, ip) {
    const config = await getActiveConfig();

    if (!config) {
      return { success: true, skipReason: 'captcha_disabled' };
    }

    if (!config.enabledScenes[scene]) {
      return { success: true, skipReason: 'scene_not_required' };
    }

    if (!token) {
      return {
        success: false,
        reason: 'token_missing',
        message: '请完成人机验证',
      };
    }

    let provider;
    try {
      provider = await getProvider(config.provider);
    } catch (err) {
      fastify.log.error(`[CAPTCHA] 加载提供商失败: ${config.provider}`, err);
      return {
        success: false,
        reason: 'unknown_provider',
        message: '验证服务配置错误',
      };
    }

    try {
      const result = await provider.verify(token, config, ip);

      if (!result.success && result.reason === 'request_error') {
        fastify.log.warn(`[CAPTCHA] 验证服务不可用，降级放行: provider=${config.provider}, scene=${scene}`);
        return { success: true, skipReason: 'service_unavailable_fallback' };
      }

      return result;
    } catch (error) {
      fastify.log.error(`[CAPTCHA] 验证异常，降级放行: ${error.message}`);
      return { success: true, skipReason: 'service_error_fallback' };
    }
  }

  // 注册服务
  fastify.decorate('captcha', {
    getActiveConfig,
    getPublicConfig,
    isRequired,
    verify,
  });

  // 验证中间件生成器
  fastify.decorate('verifyCaptcha', (scene) => {
    return async (request, reply) => {
      const token = request.body?.captchaToken || request.headers['x-captcha-token'];
      const ip = request.ip;

      const result = await verify(token, scene, ip);

      if (!result.success) {
        fastify.log.warn(`[CAPTCHA] 验证失败: scene=${scene}, reason=${result.reason}`);
        return reply.code(403).send({
          error: result.message || '请完成人机验证',
          code: 'CAPTCHA_REQUIRED',
          reason: result.reason,
        });
      }

      request.captchaResult = result;
    };
  });

  fastify.log.info('[CAPTCHA] 服务已注册');
}

export default fp(captchaPlugin, {
  name: 'captcha',
});
