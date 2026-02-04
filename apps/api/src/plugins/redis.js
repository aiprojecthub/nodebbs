import fp from 'fastify-plugin'
import fastifyRedis from '@fastify/redis'
import env from '../config/env.js'

export const redisPlugin = async (fastify) => {
  fastify.register(fastifyRedis, {
    url: env.redis.url,
    // 可选：配置 ioredis 原生选项
    connectTimeout: 5000,
    maxRetriesPerRequest: 3,
  })

  // 可选：在 ready 阶段进行连接测试
  fastify.addHook('onReady', async () => {
    try {
      await fastify.redis.ping()
      fastify.log.info('✅ Redis 连接成功')
    } catch (err) {
      fastify.log.error('❌ Redis connection failed:', err)
    }
  })
  // 封装缓存工具对象
  fastify.decorate('cache', {
    remember: async (key, ttl, getter) => {
      // 如果 Redis 未开启，直接执行 getter
      if (!fastify.redis) {
        return await getter()
      }

      try {
        // 尝试获取缓存
        const cached = await fastify.redis.get(key)
        if (cached) {
          return JSON.parse(cached)
        }
      } catch (err) {
        fastify.log.warn(`Redis get error for key ${key}: ${err.message}`)
      }

      // 执行获取数据逻辑
      const result = await getter()

      try {
        // 存入缓存 (仅当结果不为 undefined/null 时)
        if (result !== undefined && result !== null) {
          await fastify.redis.setex(key, ttl, JSON.stringify(result))
        }
      } catch (err) {
        fastify.log.warn(`Redis set error for key ${key}: ${err.message}`)
      }

      return result
    },

    invalidate: async (keys) => {
      if (!fastify.redis) return

      try {
        const keysArray = Array.isArray(keys) ? keys : [keys]
        if (keysArray.length > 0) {
          await fastify.redis.del(...keysArray)
        }
      } catch (err) {
        fastify.log.warn(`Redis invalidate error: ${err.message}`)
      }
    }
  })
}

export default fp(redisPlugin, {
  name: 'redis'
})
