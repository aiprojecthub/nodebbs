import fp from 'fastify-plugin';
import formBody from '@fastify/formbody';

/**
 * 此插件增加了对 application/x-www-form-urlencoded 内容类型的支持
 * 这对于处理 Apple Sign In 回调 (form_post 模式) 是必需的
 */
async function formBodyPlugin(fastify) {
  await fastify.register(formBody);
}

export default fp(formBodyPlugin);
