import db from '../../db/index.js';
import { users, qrLoginRequests } from '../../db/schema.js';
import { eq, and, gt } from 'drizzle-orm';
import { getSetting } from '../../utils/settings.js';
import crypto from 'crypto';

export default async function qrLoginRoutes(fastify, options) {

  // 生成二维码登录请求
  fastify.post(
    '/generate',
    {
      schema: {
        tags: ['auth'],
        description: '生成扫码登录请求',
        response: {
          200: {
            type: 'object',
            properties: {
              requestId: { type: 'string' },
              expiresAt: { type: 'string' },
              qrCodeUrl: { type: 'string' },
            },
          },
        },
      },
    },
    async (request, reply) => {
      // 检查扫码登录是否启用
      const qrLoginEnabled = await getSetting('qr_login_enabled', false);
      if (!qrLoginEnabled) {
        return reply.code(403).send({ error: '扫码登录功能未启用' });
      }

      // 获取二维码有效期配置
      const timeout = await getSetting('qr_login_timeout', 300);

      // 生成唯一的请求ID
      const requestId = crypto.randomBytes(32).toString('hex');

      // 计算过期时间
      const expiresAt = new Date(Date.now() + timeout * 1000);

      // 创建登录请求记录
      const [loginRequest] = await db
        .insert(qrLoginRequests)
        .values({
          requestId,
          status: 'pending',
          expiresAt,
          ipAddress: request.ip,
          userAgent: request.headers['user-agent'],
        })
        .returning();

      // 生成二维码URL（App端扫码后解析）
      const qrCodeUrl = `nodebbs://qr-login?requestId=${requestId}`;

      return {
        requestId,
        expiresAt: expiresAt.toISOString(),
        qrCodeUrl,
      };
    }
  );

  // 查询登录请求状态
  fastify.get(
    '/status/:requestId',
    {
      schema: {
        tags: ['auth'],
        description: '查询扫码登录状态',
        params: {
          type: 'object',
          required: ['requestId'],
          properties: {
            requestId: { type: 'string' },
          },
        },
        response: {
          200: {
            type: 'object',
            properties: {
              requestId: { type: 'string' },
              status: { type: 'string' },
              token: { type: 'string' },
              ipAddress: { type: 'string' },
              userAgent: { type: 'string' },
              expiresAt: { type: 'string' },
              createdAt: { type: 'string' },
              user: {
                type: 'object',
                properties: {
                  id: { type: 'number' },
                  username: { type: 'string' },
                  email: { type: 'string' },
                  name: { type: 'string' },
                  avatar: { type: 'string' },
                  role: { type: 'string' },
                },
              },
            },
          },
        },
      },
    },
    async (request, reply) => {
      const { requestId } = request.params;

      const [loginRequest] = await db
        .select()
        .from(qrLoginRequests)
        .where(eq(qrLoginRequests.requestId, requestId))
        .limit(1);

      if (!loginRequest) {
        return reply.code(404).send({ error: '登录请求不存在' });
      }

      // 检查是否过期
      if (new Date() > loginRequest.expiresAt) {
        // 更新状态为已过期
        await db
          .update(qrLoginRequests)
          .set({ status: 'expired' })
          .where(eq(qrLoginRequests.requestId, requestId));

        return { status: 'expired' };
      }

      // 如果已确认，返回token和用户信息
      if (loginRequest.status === 'confirmed' && loginRequest.token) {
        const [user] = await db
          .select()
          .from(users)
          .where(eq(users.id, loginRequest.userId))
          .limit(1);

        if (user) {
          delete user.passwordHash;
          
          // 设置 Auth Cookie
          reply.setAuthCookie(loginRequest.token);

          return {
            status: 'confirmed',
            token: loginRequest.token,
            user,
          };
        }
      }

      // pending 状态返回完整信息供 App 端确认
      return {
        requestId: loginRequest.requestId,
        status: loginRequest.status,
        ipAddress: loginRequest.ipAddress,
        userAgent: loginRequest.userAgent,
        expiresAt: loginRequest.expiresAt.toISOString(),
        createdAt: loginRequest.createdAt.toISOString(),
      };
    }
  );

  // App端确认登录
  fastify.post(
    '/confirm',
    {
      preHandler: [fastify.authenticate],
      schema: {
        tags: ['auth'],
        description: 'App端确认扫码登录',
        security: [{ bearerAuth: [] }],
        body: {
          type: 'object',
          required: ['requestId'],
          properties: {
            requestId: { type: 'string' },
          },
        },
        response: {
          200: {
            type: 'object',
            properties: {
              message: { type: 'string' },
            },
          },
        },
      },
    },
    async (request, reply) => {
      const { requestId } = request.body;
      const userId = request.user.id;

      // 查找登录请求
      const [loginRequest] = await db
        .select()
        .from(qrLoginRequests)
        .where(
          and(
            eq(qrLoginRequests.requestId, requestId),
            eq(qrLoginRequests.status, 'pending'),
            gt(qrLoginRequests.expiresAt, new Date())
          )
        )
        .limit(1);

      if (!loginRequest) {
        return reply.code(404).send({ error: '登录请求不存在或已过期' });
      }

      // 获取用户信息
      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.id, userId))
        .limit(1);

      if (!user) {
        return reply.code(404).send({ error: '用户不存在' });
      }

      // 生成Web端JWT token (只包含用户ID，其他信息从数据库实时获取)
      const token = fastify.jwt.sign({
        id: user.id,
      });

      // 更新登录请求状态
      await db
        .update(qrLoginRequests)
        .set({
          status: 'confirmed',
          userId,
          token,
          confirmedAt: new Date(),
          confirmedIp: request.ip,
        })
        .where(eq(qrLoginRequests.requestId, requestId));

      // 更新用户最后登录时间
      await db
        .update(users)
        .set({ lastSeenAt: new Date() })
        .where(eq(users.id, userId));

      return { message: '登录确认成功' };
    }
  );

  // 取消登录请求
  fastify.post(
    '/cancel',
    {
      schema: {
        tags: ['auth'],
        description: '取消扫码登录请求',
        body: {
          type: 'object',
          required: ['requestId'],
          properties: {
            requestId: { type: 'string' },
          },
        },
        response: {
          200: {
            type: 'object',
            properties: {
              message: { type: 'string' },
            },
          },
        },
      },
    },
    async (request, reply) => {
      const { requestId } = request.body;

      await db
        .update(qrLoginRequests)
        .set({ status: 'cancelled' })
        .where(eq(qrLoginRequests.requestId, requestId));

      return { message: '已取消登录请求' };
    }
  );


}
