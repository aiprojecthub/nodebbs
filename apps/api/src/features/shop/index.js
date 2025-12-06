import fp from 'fastify-plugin';
import shopRoutes from './routes/index.js';

/**
 * Shop Plugin
 * Handles shop system logic and routes.
 */
async function shopPlugin(fastify, options) {
  // Register routes
  fastify.register(shopRoutes, { prefix: '/api/shop' });
}

export default fp(shopPlugin, {
  name: 'shop-plugin',
  // dependencies: ['credits-plugin'] // Optional: if it depends closely on credits
});
