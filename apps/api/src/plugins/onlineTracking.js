import fp from 'fastify-plugin';
import crypto from 'crypto';

/**
 * 在线用户追踪插件（已重构）
 * 强制使用 Redis（有序集合）来高效追踪在线用户和游客
 *
 * 配置选项:
 * - onlineThreshold: 在线判定阈值，单位毫秒 (默认: 15分钟)
 * - cleanupInterval: 清理间隔，单位毫秒 (默认: 1分钟)
 * - keyPrefix: Redis key 前缀 (默认: 'online:')
 */

class OnlineTracker {
  constructor(redisClient, options = {}) {
    if (!redisClient) {
      throw new Error('在线追踪插件需要已注册的 Redis 客户端实例。');
    }

    this.redis = redisClient;
    this.onlineThreshold = options.onlineThreshold || 15 * 60 * 1000; // 15分钟
    this.cleanupInterval = options.cleanupInterval || 60 * 1000; // 1分钟
    this.keyPrefix = options.keyPrefix || 'online:';

    // Redis ZSET 键名
    this.usersKey = `${this.keyPrefix}users`;
    this.guestsKey = `${this.keyPrefix}guests`;

    // 缓存的统计数据（减少 Redis 请求）
    this.cachedStats = null;
    this.cacheExpiry = 0;
    this.cacheTimeout = 5000; // 缓存5秒

    this.cleanupTimer = null;
  }

  // 生成游客唯一标识
  generateGuestId(request) {
    // 优先使用 session ID
    if (request.session?.sessionId) {
      return request.session.sessionId;
    }

    // 使用 IP + User-Agent 生成标识
    const ip = request.ip;
    const userAgent = request.headers['user-agent'] || '';
    const fingerprint = `${ip}:${userAgent}`;

    return crypto.createHash('md5').update(fingerprint).digest('hex').substring(0, 16);
  }

  // 记录用户活动（使用 ZSET：分数=时间戳，成员=ID）
  async track(userId, guestId) {
    const now = Date.now();
    const pipeline = this.redis.pipeline();

    // 更新用户在线状态
    if (userId) {
      pipeline.zadd(this.usersKey, now, userId.toString());
      // 如果之前是游客，尝试从游客列表移除（可选，为了数据更准确）
      if (guestId) {
        pipeline.zrem(this.guestsKey, guestId);
      }
    } else if (guestId) {
      pipeline.zadd(this.guestsKey, now, guestId);
    }

    // 设置过期时间，防止 ZSET 永久存在（虽然主要靠清理，但加个兜底 TTL 也不错）
    // 这里其实不需要给 ZSET 本身设 TTL，因为里面一直在更新。
    // 只需要定期清理移除旧成员即可。

    await pipeline.exec();
  }

  // 清理过期数据
  async cleanup() {
    const now = Date.now();
    const thresholdTimestamp = now - this.onlineThreshold;
    
    // ZREMRANGEBYSCORE key -inf (now - threshold)
    // 移除所有分数（时间戳）小于 thresholdTimestamp 的成员
    const pipeline = this.redis.pipeline();
    pipeline.zremrangebyscore(this.usersKey, '-inf', thresholdTimestamp);
    pipeline.zremrangebyscore(this.guestsKey, '-inf', thresholdTimestamp);
    
    const results = await pipeline.exec();
    
    // 统计清理数量 (results[0][1] 是 users 清理数, results[1][1] 是 guests 清理数)
    const cleanedUsers = results[0]?.[1] || 0;
    const cleanedGuests = results[1]?.[1] || 0;
    const totalCleaned = cleanedUsers + cleanedGuests;

    if (totalCleaned > 0) {
      this.cachedStats = null; // 清除缓存，强制下次重新计算
    }

    return totalCleaned;
  }

  // 获取统计数据
  async getStats() {
    const now = Date.now();

    // 如果缓存有效，直接返回
    if (this.cachedStats && now < this.cacheExpiry) {
      return this.cachedStats;
    }

    const validStartTimestamp = now - this.onlineThreshold;

    // ZCOUNT key (now - threshold) +inf
    // 统计有效时间范围内的成员数量
    const pipeline = this.redis.pipeline();
    pipeline.zcount(this.usersKey, validStartTimestamp, '+inf');
    pipeline.zcount(this.guestsKey, validStartTimestamp, '+inf');

    const results = await pipeline.exec();
    const members = results[0]?.[1] || 0;
    const guests = results[1]?.[1] || 0;

    const stats = {
      members,
      guests,
      total: members + guests,
    };

    // 更新缓存
    this.cachedStats = stats;
    this.cacheExpiry = now + this.cacheTimeout;

    return stats;
  }

  // 启动定期清理
  startCleanup(logger) {
    // 每次启动时立即执行一次清理（可选）
    // this.cleanup().catch(...)

    this.cleanupTimer = setInterval(() => {
      this.cleanup()
        .then(cleaned => {
          if (cleaned > 0) {
            logger.debug(`[在线追踪] 已清理 ${cleaned} 个过期用户/游客`);
          }
        })
        .catch(error => {
          logger.error('[在线追踪] 清理过期数据时出错:', error);
        });
    }, this.cleanupInterval);
  }

  // 停止清理
  stopCleanup() {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = null;
    }
  }
}

export default fp(async function (fastify, opts) {
  // 1. 强制依赖 Redis
  // 即使 `dependencies` 声明了，这里最好也检查一下，或者直接取 fastify.redis
  if (!fastify.redis) {
    throw new Error('online-tracking 依赖 Redis，请先注册 fastify-redis 插件。');
  }

  // 2. 初始化追踪器
  const tracker = new OnlineTracker(fastify.redis, {
    onlineThreshold: opts.onlineThreshold,
    cleanupInterval: opts.cleanupInterval,
    keyPrefix: opts.keyPrefix,
  });

  // 3. 启动定期清理
  tracker.startCleanup(fastify.log);

  // 4. 服务器关闭钩子
  fastify.addHook('onClose', async () => {
    tracker.stopCleanup();
    fastify.log.info('[在线追踪] 插件已关闭');
  });

  // 5. 核心逻辑: 记录请求
  // 使用 'onResponse' 确保在请求处理完成后执行
  // 此时路由级别的身份验证(preHandler)已执行，request.user 已被正确填充
  fastify.addHook('onResponse', async (request, reply) => {
    try {
      // 仅追踪 API 请求
      const url = request.raw.url || request.url;
      if (!url.startsWith('/api/')) {
         return; 
      }

      const userId = request.user?.id || null;
      
      // 如果没有登录，生成 guestId
      // 注意：如果 request.user 存在，我们传 null 给 guestId
      const guestId = userId ? null : tracker.generateGuestId(request);

      // 异步执行（onResponse 在响应发送后调用，此处仅触发不阻塞）
      tracker.track(userId, guestId).catch(err => {
        request.log.warn({ err }, '[在线追踪] 记录在线用户失败');
      });

    } catch (error) {
      request.log.warn({ error }, '[在线追踪] 追踪钩子执行出错');
    }
  });

  // 6. 装饰器: 获取统计
  fastify.decorate('getOnlineStats', async () => {
    try {
      return await tracker.getStats();
    } catch (error) {
      fastify.log.error('[在线追踪] 获取统计数据失败:', error);
      return { members: 0, guests: 0, total: 0 };
    }
  });

  // 7. 装饰器: 手动清理
  fastify.decorate('cleanupOnlineTracking', async () => {
    return await tracker.cleanup();
  });

  fastify.log.info('[在线追踪] 插件已注册（Redis ZSET 模式）');

}, {
  name: 'online-tracking',
  dependencies: ['redis'], // 声明依赖
});
