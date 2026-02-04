import fp from 'fastify-plugin';
import db from '../db/index.js';
import { oauthProviders } from '../db/schema.js';
import { eq } from 'drizzle-orm';

/**
 * OAuth 2.0 插件配置
 * 支持 GitHub、Google、Apple 等提供商
 * 从数据库动态读取配置，无需重启即可生效
 */
async function oauthPlugin(fastify, opts) {
  fastify.log.info('[OAuth] 正在初始化插件（基于数据库配置）');

  // 添加一个装饰器方法，用于获取提供商配置
  // 这个方法会实时从数据库读取最新配置
  fastify.decorate('getOAuthProviderConfig', async (providerName) => {
    const result = await db
      .select()
      .from(oauthProviders)
      .where(eq(oauthProviders.provider, providerName))
      .limit(1);
    
    return result[0] || null;
  });

  fastify.log.info('[OAuth] 插件初始化完成');
}



export default fp(oauthPlugin, {
  name: 'oauth-plugin',
});
