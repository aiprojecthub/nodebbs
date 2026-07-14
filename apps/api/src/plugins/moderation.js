import fp from 'fastify-plugin';
import { ModerationService } from '../services/moderation/moderationService.js';
import {
  createTopicAdapter,
  createPostAdapter,
  createUserNameAdapter,
  createUserBioAdapter,
  createUserAvatarAdapter,
} from '../services/moderation/adapters.js';

/**
 * 通用内容审核插件。
 *
 * 装饰 fastify.moderation（ModerationService 实例），并注册 P1 适配器（topic/post）。
 * 使用方式：
 *   await fastify.moderation.submit({ targetType:'topic', targetId, submittedBy, snapshot })  // 统一入口，按 kind 分流（entity/field）
 *   await fastify.moderation.review({ itemId, action:'approve', reviewerId })
 */
async function moderationPlugin(fastify, options) {
  const service = new ModerationService(fastify);

  service.register(createTopicAdapter(fastify));
  service.register(createPostAdapter(fastify));
  service.register(createUserNameAdapter());
  service.register(createUserBioAdapter());
  service.register(createUserAvatarAdapter());

  fastify.decorate('moderation', service);

  fastify.log.info(`[内容审核] 服务已注册（类型: ${service.listTypes().join(', ')}）`);
}

export default fp(moderationPlugin, {
  name: 'moderation',
  dependencies: ['settings', 'event-bus', 'oplog'],
});
