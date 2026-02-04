import fp from 'fastify-plugin';
import { EventEmitter } from 'node:events';

/**
 * 事件总线插件
 * 提供简易事件总线，用于模块解耦。
 */
async function eventBusPlugin(fastify, options) {
  const emitter = new EventEmitter();

  // 为 fastify 实例挂载事件总线方法
  fastify.decorate('eventBus', {
    emit: (event, ...args) => {
      fastify.log.debug(`[事件总线] 触发事件: ${event}`);
      emitter.emit(event, ...args);
    },
    on: (event, listener) => {
      fastify.log.debug(`[事件总线] 注册监听器: ${event}`);
      emitter.on(event, listener);
    },
    off: (event, listener) => {
      emitter.off(event, listener);
    },
    once: (event, listener) => {
      emitter.once(event, listener);
    }
  });
}

export default fp(eventBusPlugin, {
  name: 'event-bus'
});
