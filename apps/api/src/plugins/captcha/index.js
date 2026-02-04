/**
 * CAPTCHA 插件入口
 * 提供人机验证功能，支持 reCAPTCHA、hCaptcha、Cloudflare Turnstile
 */
import fp from 'fastify-plugin';
import { CaptchaService } from './service.js';

async function captchaPlugin(fastify, options) {
  const service = new CaptchaService();

  // 注册服务到 fastify 实例
  fastify.decorate('captcha', service);

  // 提供验证中间件生成器
  fastify.decorate('verifyCaptcha', (scene) => {
    return async (request, reply) => {
      // 从请求体或请求头获取 token
      const token = request.body?.captchaToken || request.headers['x-captcha-token'];
      const ip = request.ip;

      const result = await service.verify(token, scene, ip);

      if (!result.success) {
        fastify.log.warn(`[CAPTCHA] 验证失败: scene=${scene}, reason=${result.reason}`);
        return reply.code(403).send({
          error: result.message || '请完成人机验证',
          code: 'CAPTCHA_REQUIRED',
          reason: result.reason,
        });
      }

      // 验证通过，将结果挂载到 request 上
      request.captchaResult = result;
    };
  });

  fastify.log.info('[CAPTCHA] 服务已注册');
}

export default fp(captchaPlugin, {
  name: 'captcha',
});
