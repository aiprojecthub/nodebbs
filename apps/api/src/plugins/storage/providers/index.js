/**
 * 存储服务商工厂
 * 动态导入对应的 provider 实现，避免未安装的 SDK 导致启动失败
 */
import { StorageError, StorageErrorCode } from '../errors.js';

/**
 * 提供商映射表
 * key: 存储类型标识（与数据库中的 type 字段一致）
 * value: 异步工厂函数，返回 provider 实例
 */
const providerFactories = {
  local: async (config) => {
    const { LocalStorageProvider } = await import('./local.js');
    return new LocalStorageProvider(config);
  },
  s3: async (config) => {
    const { S3Provider } = await import('./s3.js');
    return new S3Provider(config);
  },
};

/**
 * 根据存储类型创建对应的存储提供商实例
 * @param {string} type - 存储类型（'local' | 's3'）
 * @param {object} config - 配置
 * @returns {Promise<BaseStorageProvider>}
 */
export async function createStorageProvider(type, config = {}) {
  const factory = providerFactories[type];
  if (!factory) {
    throw new StorageError(
      StorageErrorCode.UNSUPPORTED_PROVIDER,
      `不支持的存储类型: ${type}`
    );
  }
  return factory(config);
}

/**
 * 获取所有支持的存储类型列表
 */
export function getSupportedProviders() {
  return Object.keys(providerFactories);
}
