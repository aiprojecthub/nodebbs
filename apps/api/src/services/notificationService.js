import db from '../db/index.js';
import { notifications } from '../db/schema.js';

/**
 * 统一通知服务
 * 
 * 设计说明：
 * - 统一所有通知创建入口，标准化数据结构
 * - 预留 webhook、push、邮件等扩展渠道
 * - 支持单条和批量发送
 */

/**
 * 通知选项接口
 * @typedef {Object} NotificationOptions
 * @property {number} userId - 必需：接收用户 ID
 * @property {string} type - 必需：通知类型
 * @property {string} message - 必需：通知消息
 * @property {number} [triggeredByUserId] - 触发用户 ID
 * @property {number} [topicId] - 关联话题
 * @property {number} [postId] - 关联帖子
 * @property {object} [metadata] - 扩展数据（自动 JSON.stringify）
 */

/**
 * 标准化通知数据
 * @param {NotificationOptions} options
 * @returns {object} 数据库插入值
 */
function normalizeNotification(options) {
  const {
    userId,
    type,
    message,
    triggeredByUserId = null,
    topicId = null,
    postId = null,
    metadata = null
  } = options;

  // 验证必填字段
  if (!userId || !type || !message) {
    throw new Error('通知缺少必填字段：userId, type, message');
  }

  return {
    userId,
    type,
    message,
    triggeredByUserId,
    topicId,
    postId,
    metadata: metadata ? JSON.stringify(metadata) : null,
    isRead: false
  };
}

/**
 * 发送单条通知
 * @param {NotificationOptions} options
 * @returns {Promise<object>} 创建的通知记录
 */
async function send(options) {
  const values = normalizeNotification(options);
  
  const [notification] = await db
    .insert(notifications)
    .values(values)
    .returning();

  // 预留：分发到其他渠道
  // await dispatchToChannels(notification, ['webhook', 'push']);

  return notification;
}

/**
 * 批量发送通知（用于订阅者通知等场景）
 * @param {NotificationOptions[]} notificationList
 * @returns {Promise<object[]>} 创建的通知记录列表
 */
async function sendBatch(notificationList) {
  if (!notificationList || notificationList.length === 0) {
    return [];
  }

  const values = notificationList.map(normalizeNotification);

  const results = await db
    .insert(notifications)
    .values(values)
    .returning();

  // 预留：批量分发到其他渠道
  // await dispatchToChannels(results, ['webhook', 'push']);

  return results;
}

/**
 * 预留：分发到其他渠道
 * @param {object|object[]} notification
 * @param {string[]} channels - 渠道列表 ['webhook', 'push', 'email']
 */
// async function dispatchToChannels(notification, channels = []) {
//   for (const channel of channels) {
//     switch (channel) {
//       case 'webhook':
//         // await webhookService.send(notification);
//         break;
//       case 'push':
//         // await pushService.send(notification);
//         break;
//       case 'email':
//         // await emailService.send(notification);
//         break;
//     }
//   }
// }

export const notificationService = {
  send,
  sendBatch
};

export default notificationService;
