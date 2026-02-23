/**
 * OAuth 2.0 插件
 * 支持 GitHub、Google、Apple、微信等提供商
 * 从数据库动态读取配置，无需重启即可生效
 */
import fp from 'fastify-plugin';
import { eq } from 'drizzle-orm';
import db from '../../db/index.js';
import { oauthProviders } from '../../db/schema.js';
import { createOAuthProvider } from './providers/index.js';

async function oauthPlugin(fastify, opts) {
  fastify.log.info('[OAuth] 正在初始化插件');

  // 缓存已实例化的 provider
  const providerInstances = new Map();

  /**
   * 获取或创建 provider 实例（lazy + 缓存）
   */
  async function getProvider(name) {
    if (providerInstances.has(name)) {
      return providerInstances.get(name);
    }
    const instance = await createOAuthProvider(name);
    providerInstances.set(name, instance);
    return instance;
  }

  /**
   * 获取提供商数据库配置
   */
  async function getProviderConfig(providerName) {
    const [result] = await db
      .select()
      .from(oauthProviders)
      .where(eq(oauthProviders.provider, providerName))
      .limit(1);

    return result || null;
  }

  // OAuth 服务对象
  const oauthService = {
    /**
     * 获取提供商数据库配置
     */
    getProviderConfig,

    /**
     * 获取提供商实例
     */
    getProvider,

    /**
     * 清除 provider 缓存
     */
    invalidateCache(name) {
      if (name) {
        providerInstances.delete(name);
      } else {
        providerInstances.clear();
      }
    },
  };

  fastify.decorate('oauth', oauthService);

  fastify.log.info('[OAuth] 插件初始化完成');
}

export default fp(oauthPlugin, {
  name: 'oauth',
});
