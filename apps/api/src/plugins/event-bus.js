import fp from 'fastify-plugin';
import { EventEmitter } from 'node:events';

/**
 * Event Bus Plugin
 * Provides a simple event bus for decoupling modules.
 */
async function eventBusPlugin(fastify, options) {
  const emitter = new EventEmitter();

  // Decorate fastify instance with event bus methods
  fastify.decorate('eventBus', {
    emit: (event, ...args) => {
      fastify.log.debug(`[EventBus] Emitting event: ${event}`);
      emitter.emit(event, ...args);
    },
    on: (event, listener) => {
      fastify.log.debug(`[EventBus] Registering listener for: ${event}`);
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
