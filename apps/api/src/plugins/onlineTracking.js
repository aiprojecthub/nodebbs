import fp from 'fastify-plugin';
import crypto from 'crypto';

/**
 * 在线用户追踪插件
 * 支持 Redis 或内存存储来追踪在线用户和游客
 *
 * 配置选项:
 * - useRedis: 是否使用 Redis (默认: 自动检测 fastify.redis 是否可用)
 * - redisClient: Redis 客户端实例 (默认: 自动使用 fastify.redis)
 * - onlineThreshold: 在线判定阈值，单位毫秒 (默认: 15分钟)
 * - cleanupInterval: 清理间隔，单位毫秒 (默认: 1分钟)
 * - keyPrefix: Redis key 前缀 (默认: 'online:')
 *
 * 注意:
 * - 插件会自动检测 Redis 是否可用，无需手动配置
 * - 如果 Redis 不可用，会使用内存模式
 * - Redis 模式使用 SET 数据结构，避免 KEYS 命令的性能问题
 */

class OnlineTracker {
  constructor(options = {}) {
    this.useRedis = options.useRedis ?? false;
    this.redisClient = options.redisClient;
    this.onlineThreshold = options.onlineThreshold || 15 * 60 * 1000; // 15分钟
    this.cleanupInterval = options.cleanupInterval || 60 * 1000; // 1分钟
    this.keyPrefix = options.keyPrefix || 'online:';

    // Redis SET 键名
    this.usersSetKey = `${this.keyPrefix}users`;
    this.guestsSetKey = `${this.keyPrefix}guests`;

    // 内存存储
    this.onlineUsers = new Map(); // userId -> lastSeen
    this.onlineGuests = new Map(); // sessionId -> lastSeen

    // 缓存的统计数据（减少计算频率）
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

    // 使用 IP + User-Agent 生成更准确的标识
    const ip = request.ip;
    const userAgent = request.headers['user-agent'] || '';
    const fingerprint = `${ip}:${userAgent}`;

    // 生成短哈希作为标识
    return crypto.createHash('md5').update(fingerprint).digest('hex').substring(0, 16);
  }

  // 记录用户活动（内存模式）
  async trackMemory(userId, guestId) {
    const now = Date.now();

    if (userId) {
      this.onlineUsers.set(userId, now);
      // 如果之前是游客，从游客列表中移除
      if (guestId) {
        this.onlineGuests.delete(guestId);
      }
    } else if (guestId) {
      this.onlineGuests.set(guestId, now);
    }
  }

  // 记录用户活动（Redis 模式）
  async trackRedis(userId, guestId) {
    if (!this.redisClient) return;

    const ttlSeconds = Math.ceil(this.onlineThreshold / 1000);

    try {
      if (userId) {
        // 使用 pipeline 批量执行 Redis 命令，提高性能
        const pipeline = this.redisClient.pipeline();

        // 设置用户在线状态（带 TTL）
        pipeline.setex(
          `${this.keyPrefix}user:${userId}`,
          ttlSeconds,
          Date.now().toString()
        );

        // 添加到在线用户 SET
        pipeline.sadd(this.usersSetKey, userId.toString());

        // 如果之前是游客，从游客列表中移除
        if (guestId) {
          pipeline.del(`${this.keyPrefix}guest:${guestId}`);
          pipeline.srem(this.guestsSetKey, guestId);
        }

        await pipeline.exec();
      } else if (guestId) {
        const pipeline = this.redisClient.pipeline();

        // 设置游客在线状态（带 TTL）
        pipeline.setex(
          `${this.keyPrefix}guest:${guestId}`,
          ttlSeconds,
          Date.now().toString()
        );

        // 添加到在线游客 SET
        pipeline.sadd(this.guestsSetKey, guestId);

        await pipeline.exec();
      }
    } catch (error) {
      // Redis 错误时记录日志但不降级，保持数据一致性
      console.error('Redis tracking error:', error);
    }
  }

  // 记录用户活动
  async track(userId, guestId) {
    if (this.useRedis) {
      await this.trackRedis(userId, guestId);
    } else {
      await this.trackMemory(userId, guestId);
    }

    // 不再每次都清除缓存，让缓存自然过期
    // 这样可以减少高流量下的统计计算次数
  }

  // 清理过期数据（内存模式）
  cleanupMemory() {
    const now = Date.now();
    let cleaned = 0;

    // 清理过期的注册用户
    for (const [userId, lastSeen] of this.onlineUsers.entries()) {
      if (now - lastSeen > this.onlineThreshold) {
        this.onlineUsers.delete(userId);
        cleaned++;
      }
    }

    // 清理过期的游客
    for (const [guestId, lastSeen] of this.onlineGuests.entries()) {
      if (now - lastSeen > this.onlineThreshold) {
        this.onlineGuests.delete(guestId);
        cleaned++;
      }
    }

    // 清理后清除缓存，强制重新计算
    if (cleaned > 0) {
      this.cachedStats = null;
    }

    return cleaned;
  }

  // 清理 Redis 中过期的 SET 成员
  async cleanupRedis() {
    if (!this.redisClient) return 0;

    try {
      let cleaned = 0;
      const now = Date.now();

      // 获取所有在线用户 ID
      const userIds = await this.redisClient.smembers(this.usersSetKey);

      // 检查每个用户是否还在线
      for (const userId of userIds) {
        const exists = await this.redisClient.exists(`${this.keyPrefix}user:${userId}`);
        if (!exists) {
          // 键已过期，从 SET 中移除
          await this.redisClient.srem(this.usersSetKey, userId);
          cleaned++;
        }
      }

      // 同样处理游客
      const guestIds = await this.redisClient.smembers(this.guestsSetKey);

      for (const guestId of guestIds) {
        const exists = await this.redisClient.exists(`${this.keyPrefix}guest:${guestId}`);
        if (!exists) {
          await this.redisClient.srem(this.guestsSetKey, guestId);
          cleaned++;
        }
      }

      // 清理后清除缓存
      if (cleaned > 0) {
        this.cachedStats = null;
      }

      return cleaned;
    } catch (error) {
      console.error('Redis cleanup error:', error);
      return 0;
    }
  }

  // 获取统计数据（内存模式）
  async getStatsMemory() {
    const now = Date.now();

    // 过滤出仍然在线的用户
    const activeUsers = Array.from(this.onlineUsers.entries()).filter(
      ([_, lastSeen]) => now - lastSeen <= this.onlineThreshold
    );

    const activeGuests = Array.from(this.onlineGuests.entries()).filter(
      ([_, lastSeen]) => now - lastSeen <= this.onlineThreshold
    );

    return {
      members: activeUsers.length,
      guests: activeGuests.length,
      total: activeUsers.length + activeGuests.length,
    };
  }

  // 获取统计数据（Redis 模式）
  async getStatsRedis() {
    if (!this.redisClient) {
      return { members: 0, guests: 0, total: 0 };
    }

    try {
      // 使用 SCARD 命令获取 SET 大小，O(1) 时间复杂度
      const [members, guests] = await Promise.all([
        this.redisClient.scard(this.usersSetKey),
        this.redisClient.scard(this.guestsSetKey),
      ]);

      return {
        members,
        guests,
        total: members + guests,
      };
    } catch (error) {
      console.error('Error getting Redis stats:', error);
      return { members: 0, guests: 0, total: 0 };
    }
  }

  // 获取统计数据（带缓存）
  async getStats() {
    const now = Date.now();

    // 如果缓存有效，直接返回
    if (this.cachedStats && now < this.cacheExpiry) {
      return this.cachedStats;
    }

    // 获取新数据
    const stats = this.useRedis
      ? await this.getStatsRedis()
      : await this.getStatsMemory();

    // 更新缓存
    this.cachedStats = stats;
    this.cacheExpiry = now + this.cacheTimeout;

    return stats;
  }

  // 启动定期清理
  startCleanup(logger) {
    this.cleanupTimer = setInterval(() => {
      try {
        if (this.useRedis) {
          // Redis 模式也需要清理 SET 中的过期成员
          this.cleanupRedis().then(cleaned => {
            if (cleaned > 0) {
              logger.debug(`Cleaned ${cleaned} expired Redis SET members`);
            }
          }).catch(error => {
            logger.error('Error during Redis cleanup:', error);
          });
        } else {
          // 内存模式清理
          const cleaned = this.cleanupMemory();
          if (cleaned > 0) {
            logger.debug(`Cleaned ${cleaned} expired online tracking entries`);
          }
        }
      } catch (error) {
        logger.error('Error during online tracking cleanup:', error);
      }
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
  // 自动检测 Redis 可用性
  const hasRedis = !!fastify.redis;
  const useRedis = opts.useRedis !== undefined ? opts.useRedis : hasRedis;
  const redisClient = opts.redisClient || (hasRedis ? fastify.redis : null);

  // 初始化追踪器
  const tracker = new OnlineTracker({
    useRedis,
    redisClient,
    onlineThreshold: opts.onlineThreshold,
    cleanupInterval: opts.cleanupInterval,
    keyPrefix: opts.keyPrefix,
  });

  // 启动定期清理
  tracker.startCleanup(fastify.log);

  // 在服务器关闭时清理
  fastify.addHook('onClose', async () => {
    tracker.stopCleanup();
    fastify.log.info('Online tracking plugin closed');
  });

  // 添加请求钩子，追踪在线用户
  fastify.addHook('onRequest', async (request, reply) => {
    try {
      const userId = request.user?.id || null;
      const guestId = userId ? null : tracker.generateGuestId(request);

      // 异步追踪，不阻塞请求
      tracker.track(userId, guestId).catch(error => {
        fastify.log.error('Error tracking online user:', error);
      });
    } catch (error) {
      // 追踪失败不应影响正常请求
      fastify.log.error('Error in online tracking hook:', error);
    }
  });

  // 提供获取在线统计的方法
  fastify.decorate('getOnlineStats', async () => {
    try {
      return await tracker.getStats();
    } catch (error) {
      fastify.log.error('Error getting online stats:', error);
      return {
        members: 0,
        guests: 0,
        total: 0,
      };
    }
  });

  // 提供手动清理方法（用于测试或管理）
  fastify.decorate('cleanupOnlineTracking', async () => {
    if (tracker.useRedis) {
      return await tracker.cleanupRedis();
    } else {
      return tracker.cleanupMemory();
    }
  });

  fastify.log.info(`Online tracking plugin registered (mode: ${tracker.useRedis ? 'Redis' : 'Memory'})`);
}, {
  name: 'online-tracking',
  dependencies: ['redis'],
});
