import fp from 'fastify-plugin';
import creditsRoutes from './routes/index.js';
import shopRoutes from './routes/shop.js';
import { grantCredits } from './services/creditService.js';

/**
 * Credits Plugin
 * Handles credit system logic, routes, and event listeners.
 */
async function creditsPlugin(fastify, options) {
  // Register routes
  fastify.register(creditsRoutes, { prefix: '/api/credits' });
  fastify.register(shopRoutes, { prefix: '/api/shop' });

  // Register event listeners
  const eventBus = fastify.eventBus;
  if (eventBus) {
    // Topic Creation Reward
    eventBus.on('topic.created', async (topic) => {
      try {
        const { getCreditConfig, isCreditSystemEnabled } = await import('./services/creditService.js');
        const systemEnabled = await isCreditSystemEnabled();
        if (!systemEnabled) return;

        fastify.log.info(`[Credits] Processing reward for topic ${topic.id}`);
        const amount = await getCreditConfig('post_topic_amount', 5);
        
        await grantCredits({
          userId: topic.userId,
          amount,
          type: 'post_topic',
          relatedTopicId: topic.id,
          description: `发布话题：${topic.title}`,
        });
      } catch (error) {
        fastify.log.error(`[Credits] Failed to reward topic creation: ${error.message}`);
      }
    });

    // Post Creation Reward
    eventBus.on('post.created', async (post) => {
      try {
        const { getCreditConfig, isCreditSystemEnabled } = await import('./services/creditService.js');
        const systemEnabled = await isCreditSystemEnabled();
        if (!systemEnabled) return;

        // Don't reward first post of a topic (it's covered by topic.created)
        if (post.postNumber === 1) return;

        fastify.log.info(`[Credits] Processing reward for post ${post.id}`);
        const amount = await getCreditConfig('post_reply_amount', 2);

        await grantCredits({
          userId: post.userId,
          amount,
          type: 'post_reply',
          relatedPostId: post.id,
          relatedTopicId: post.topicId,
          description: '发布回复',
        });
      } catch (error) {
        fastify.log.error(`[Credits] Failed to reward post creation: ${error.message}`);
      }
    });

    // Post Like Reward
    eventBus.on('post.liked', async ({ postId, postAuthorId, userId }) => {
      try {
        const { getCreditConfig, isCreditSystemEnabled } = await import('./services/creditService.js');
        const systemEnabled = await isCreditSystemEnabled();
        if (!systemEnabled) return;

        // Don't reward self-likes
        if (postAuthorId === userId) return;

        fastify.log.info(`[Credits] Processing reward for like on post ${postId}`);
        const amount = await getCreditConfig('receive_like_amount', 1);

        await grantCredits({
          userId: postAuthorId,
          amount,
          type: 'receive_like',
          relatedPostId: postId,
          relatedUserId: userId,
          description: '获得点赞奖励',
        });
      } catch (error) {
        fastify.log.error(`[Credits] Failed to reward post like: ${error.message}`);
      }
    });
  } else {
    fastify.log.warn('[Credits] EventBus not found, event listeners skipped.');
  }
}

export default fp(creditsPlugin, {
  name: 'credits-plugin',
  dependencies: ['event-bus']
});
