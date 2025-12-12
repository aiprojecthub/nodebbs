import { grantCredits } from './services/creditService.js';

/**
 * Register credit system event listeners
 * @param {import('fastify').FastifyInstance} fastify
 */
export async function registerCreditListeners(fastify) {
  const { eventBus } = fastify;

  if (!eventBus) {
    fastify.log.warn('[积分系统] EventBus plugin not found, skipping listener registration');
    return;
  }

  // 1. 话题创建奖励 (Topic Created)
  eventBus.on('topic.created', async (topic) => {
    try {
      fastify.log.debug(`[积分系统] 处理话题创建奖励: TopicID=${topic.id}, UserID=${topic.userId}`);
      
      await grantCredits({
        userId: topic.userId,
        amount: 5, // TODO: Read from config
        type: 'post_topic',
        relatedTopicId: topic.id,
        description: `发布话题：${topic.title}`,
      });
    } catch (error) {
      fastify.log.error(error, `[积分系统] 发放话题创建奖励失败: TopicID=${topic.id}`);
    }
  });

  // 2. 回复创建奖励 (Post Created)
  eventBus.on('post.created', async (post) => {
    try {
      // 不奖励第一条帖子（即话题内容）
      if (post.postNumber === 1) return;

      fastify.log.debug(`[积分系统] 处理回复创建奖励: PostID=${post.id}, UserID=${post.userId}`);

      await grantCredits({
        userId: post.userId,
        amount: 2, // TODO: Read from config
        type: 'post_reply',
        relatedPostId: post.id,
        relatedTopicId: post.topicId,
        description: '发布回复',
      });
    } catch (error) {
      fastify.log.error(error, `[积分系统] 发放回复奖励失败: PostID=${post.id}`);
    }
  });

  // 3. 点赞奖励 (Post Liked)
  eventBus.on('post.liked', async ({ postId, postAuthorId, userId }) => {
    try {
      // 不奖励自己点赞自己
      if (postAuthorId === userId) {
        return;
      }

      fastify.log.debug(`[积分系统] 处理点赞奖励: PostID=${postId}, ToUserID=${postAuthorId}`);

      await grantCredits({
        userId: postAuthorId, // 给帖子作者加分
        amount: 1, // TODO: Read from config
        type: 'receive_like',
        relatedPostId: postId,
        relatedUserId: userId,
        description: '获得点赞奖励',
      });
    } catch (error) {
      fastify.log.error(error, `[积分系统] 发放点赞奖励失败: PostID=${postId}`);
    }
  });
  
  fastify.log.info('[积分系统] 事件监听器已注册');
}
