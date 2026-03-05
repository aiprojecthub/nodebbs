import qrLoginRoutes from './qr-login.js';
import phoneLoginRoutes from './phone-login.js';
import registerRoutes from './register.js';
import loginRoutes from './login.js';
import userRoutes from './user.js';
import passwordRoutes from './password.js';
import verificationRoutes from './verification.js';

export default async function authRoutes(fastify, options) {
  // 注册各个子模块
  // 注意：不需要添加 prefix，因为这些文件内部定义的路由已经是直接挂在 /auth 下的相对路径了
  // (例如 register.js 里定义的是 /register，加上外层的 /auth 前缀变成 /auth/register)

  fastify.register(qrLoginRoutes, { prefix: '/qr-login' });
  fastify.register(phoneLoginRoutes, { prefix: '/phone-login' });
  fastify.register(registerRoutes);
  fastify.register(loginRoutes);
  fastify.register(userRoutes);
  fastify.register(passwordRoutes);
  fastify.register(verificationRoutes);
}
