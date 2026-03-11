import fp from 'fastify-plugin';
import { EventEmitter } from 'node:events';

/**
 * 事件总线插件
 * 提供简易事件总线，用于模块解耦。
 * - safeOn: 自动包裹 async listener 的异常，防止未捕获错误
 * - onClose: Fastify 关闭时自动清理所有监听器
 */
async function eventBusPlugin(fastify, options) {
  const emitter = new EventEmitter();

  /**
   * 包裹监听器，自动捕获 async 异常
   */
  const wrapListener = (event, listener) => {
    return async (...args) => {
      try {
        await listener(...args);
      } catch (err) {
        fastify.log.error({ err, event }, '[事件总线] 事件处理异常');
      }
    };
  };

  // 为 fastify 实例挂载事件总线方法
  fastify.decorate('eventBus', {
    emit: (event, ...args) => {
      fastify.log.debug(`[事件总线] 触发事件: ${event}`);
      emitter.emit(event, ...args);
    },
    on: (event, listener) => {
      fastify.log.debug(`[事件总线] 注册监听器: ${event}`);
      emitter.on(event, wrapListener(event, listener));
    },
    off: (event, listener) => {
      emitter.off(event, listener);
    },
    once: (event, listener) => {
      emitter.once(event, wrapListener(event, listener));
    }
  });

  // Fastify 关闭时清理所有监听器
  fastify.addHook('onClose', () => {
    emitter.removeAllListeners();
    fastify.log.debug('[事件总线] 所有监听器已清理');
  });
}

export default fp(eventBusPlugin, {
  name: 'event-bus'
});
