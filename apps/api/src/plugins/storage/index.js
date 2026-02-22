/**
 * 存储服务插件
 * 提供统一的文件存储接口，支持本地存储和云存储
 *
 * 注册 fastify.storage 装饰器，暴露以下方法：
 * - upload(fileData, key, options) - 上传文件
 * - delete(key, slug?) - 删除文件
 * - getUrl(key, slug?) - 获取文件 URL
 * - exists(key) - 检查文件是否存在
 * - getProvider(slug?) - 获取指定 provider 实例
 * - testConnection(slug) - 测试连接

 */
import fp from 'fastify-plugin';
import { eq } from 'drizzle-orm';
import { storageProviders } from './schema.js';
import { createStorageProvider } from './providers/index.js';
import { StorageError, StorageErrorCode } from './errors.js';

async function storagePlugin(fastify) {
  fastify.log.info('[存储] 正在初始化存储服务插件');

  // 缓存已实例化的 provider
  const providerInstances = new Map();

  /**
   * 获取已启用的存储提供商记录
   */
  async function getEnabledProviderRecord() {
    const [record] = await fastify.db
      .select()
      .from(storageProviders)
      .where(eq(storageProviders.isEnabled, true))
      .limit(1);
    return record || null;
  }

  /**
   * 获取指定 provider 的数据库记录
   */
  async function getProviderRecord(slug) {
    const [record] = await fastify.db
      .select()
      .from(storageProviders)
      .where(eq(storageProviders.slug, slug))
      .limit(1);
    return record || null;
  }

  /**
   * 解析 provider 配置
   */
  function parseConfig(record) {
    if (!record) return {};
    try {
      return record.config ? JSON.parse(record.config) : {};
    } catch {
      fastify.log.error(`[存储] 解析 ${record.slug} 配置失败`);
      return {};
    }
  }

  /**
   * 获取或创建 provider 实例
   */
  async function getProvider(slug) {
    // 尝试缓存
    if (providerInstances.has(slug)) {
      return providerInstances.get(slug);
    }

    const record = await getProviderRecord(slug);
    if (!record) {
      throw new StorageError(
        StorageErrorCode.PROVIDER_NOT_CONFIGURED,
        `存储服务商 ${slug} 未配置`
      );
    }

    const config = parseConfig(record);
    const instance = await createStorageProvider(record.type, config);
    providerInstances.set(slug, instance);
    return instance;
  }

  /**
   * 获取当前活跃的 provider（已启用的，或 fallback 到 local）
   */
  async function getActiveProvider() {
    const record = await getEnabledProviderRecord();
    const slug = record ? record.slug : 'local';
    return { provider: await getProvider(slug), name: slug };
  }

  /**
   * 清除 provider 缓存（配置更新后调用）
   */
  function invalidateCache(slug) {
    if (slug) {
      providerInstances.delete(slug);
    } else {
      providerInstances.clear();
    }
  }

  // 注册 fastify.storage 装饰器
  const storageService = {
    /**
     * 上传文件到当前活跃的存储服务商
     * @param {Buffer|Stream} fileData
     * @param {string} key - 存储路径 (如 'topics/uuid.jpg')
     * @param {object} options - { mimetype, size }
     * @returns {Promise<{ url: string, key: string, provider: string }>}
     */
    async upload(fileData, key, options = {}) {
      const { provider, name } = await getActiveProvider();
      const result = await provider.upload(fileData, key, options);
      return { ...result, provider: name };
    },

    /**
     * 从本地临时文件上传（本地存储直接 rename，S3 读取后上传）
     * @param {string} tmpPath - 临时文件路径
     * @param {string} key - 存储路径
     * @param {object} options - { mimetype, size }
     * @returns {Promise<{ url: string, key: string, provider: string }>}
     */
    async uploadFromFile(tmpPath, key, options = {}) {
      const { provider, name } = await getActiveProvider();
      const result = await provider.uploadFromFile(tmpPath, key, options);
      return { ...result, provider: name };
    },

    /**
     * 删除文件
     * @param {string} key
     * @param {string} slug - 指定 provider（用于删除旧文件）
     */
    async delete(key, slug) {
      if (slug) {
        const provider = await getProvider(slug);
        return provider.delete(key);
      }
      const { provider } = await getActiveProvider();
      return provider.delete(key);
    },

    /**
     * 获取文件 URL
     * @param {string} key
     * @param {string} slug - 指定 provider
     */
    getUrl(key, slug) {
      // 同步方法不能查数据库，需要已有缓存或指定 provider
      if (slug && providerInstances.has(slug)) {
        return providerInstances.get(slug).getUrl(key);
      }
      // fallback: 本地路径
      return `/uploads/${key}`;
    },

    /**
     * 异步获取文件 URL（可查数据库）
     */
    async getUrlAsync(key, slug) {
      if (slug) {
        const provider = await getProvider(slug);
        return provider.getUrl(key);
      }
      const { provider } = await getActiveProvider();
      return provider.getUrl(key);
    },

    /**
     * 检查文件是否存在
     */
    async exists(key, slug) {
      if (slug) {
        const provider = await getProvider(slug);
        return provider.exists(key);
      }
      const { provider } = await getActiveProvider();
      return provider.exists(key);
    },

    /**
     * 获取 provider 实例
     */
    getProvider,

    /**
     * 测试指定 provider 的连接
     */
    async testConnection(slug) {
      // 先验证配置
      const record = await getProviderRecord(slug);
      if (!record) {
        return { success: false, message: `存储服务商 ${slug} 未配置` };
      }
      const config = parseConfig(record);

      // 每次测试创建新实例（不使用缓存，确保用最新配置）
      const instance = await createStorageProvider(record.type, config);
      const validation = instance.validateConfig(config);
      if (!validation.valid) {
        return { success: false, message: validation.message };
      }

      return instance.testConnection();
    },

    /**
     * 获取预签名上传 URL（客户端直传）
     */
    async presign(key, options = {}) {
      const { provider, name } = await getActiveProvider();
      const result = await provider.getPresignedUrl(key, options);
      return result.supported ? { ...result, provider: name } : { supported: false };
    },

    /**
     * 清除缓存
     */
    invalidateCache,
  };

  fastify.decorate('storage', storageService);
}

export default fp(storagePlugin, {
  name: 'storage',
  dependencies: ['db'],
});
