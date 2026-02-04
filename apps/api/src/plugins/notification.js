import fp from 'fastify-plugin';
import notificationService from '../services/notificationService.js';

/**
 * 通知服务插件
 * 
 * 将 notificationService 注册为 fastify.notification
 * 使用方式：fastify.notification.send({ ... })
 */
async function notificationPlugin(fastify, options) {
  // 注册通知服务
  fastify.decorate('notification', notificationService);

  fastify.log.info('[通知] 服务已注册');
}

export default fp(notificationPlugin, {
  name: 'notification',
  dependencies: []
});
