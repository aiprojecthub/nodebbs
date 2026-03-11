/**
 * 事件总线 - 事件名常量
 * 所有事件的 emit/on 均应通过此文件的常量引用，避免字符串硬编码。
 *
 * Payload 约定：
 *   TOPIC_CREATED → { id, userId, title, categoryId, slug, ... }  (完整 DB row)
 *   POST_CREATED  → { id, userId, topicId, postNumber, ... }      (完整 DB row)
 *   POST_LIKED    → { postId, postAuthorId, userId }
 *   USER_CHECKIN  → { userId, streak }
 */
export const EVENTS = {
  TOPIC_CREATED: 'topic.created',
  POST_CREATED: 'post.created',
  POST_LIKED: 'post.liked',
  USER_CHECKIN: 'user.checkin',
};
