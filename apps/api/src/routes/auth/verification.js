import db from '../../db/index.js';
import { users } from '../../db/schema.js';
import { eq } from 'drizzle-orm';
import { normalizeIdentifier } from '../../utils/normalization.js';
import {
  createVerificationCode,
  verifyCode,
  deleteVerificationCode,
  validateVerificationRequest,
} from '../../plugins/message/utils/verificationCode.js';
import {
  VerificationCodeType,
  VerificationChannel,
} from '../../plugins/message/config/verificationCode.js';
import { isDev } from '../../config/env.js';

export default async function verificationRoute(fastify, options) {
  // 使用验证码验证邮箱
  fastify.post(
    '/verify-email',
    {
      preHandler: [fastify.authenticate],
      schema: {
        tags: ['auth'],
        description: '使用验证码验证邮箱',
        security: [{ bearerAuth: [] }],
        body: {
          type: 'object',
          required: ['code'],
          properties: {
            code: { type: 'string', description: '6位验证码' },
          },
        },
        response: {
          200: {
            type: 'object',
            properties: {
              message: { type: 'string' },
              user: {
                type: 'object',
                properties: {
                  id: { type: 'number' },
                  username: { type: 'string' },
                  email: { type: ['string', 'null'] },
                  isEmailVerified: { type: 'boolean' },
                },
              },
            },
          },
        },
      },
    },
    async (request, reply) => {
      const { code } = request.body;
      const userId = request.user.id;

      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.id, userId))
        .limit(1);

      if (!user) {
        return reply.code(404).send({ error: '用户不存在' });
      }

      if (user.isEmailVerified) {
        return reply.code(400).send({ error: '邮箱已经验证过了' });
      }

      // 验证验证码
      const result = await verifyCode(
        user.email,
        code,
        VerificationCodeType.EMAIL_VERIFY
      );

      if (!result.valid) {
        return reply.code(400).send({
          error: result.error || '验证码错误或已过期'
        });
      }

      // 更新邮箱验证状态
      const [updatedUser] = await db
        .update(users)
        .set({
          isEmailVerified: true,
        })
        .where(eq(users.id, userId))
        .returning();

      // 删除已使用的验证码
      await deleteVerificationCode(user.email, VerificationCodeType.EMAIL_VERIFY);

      // 清除用户缓存
      await fastify.clearUserCache(userId);

      fastify.log.info(`[邮箱验证] 用户 ${user.email} 邮箱验证成功`);

      return {
        message: '邮箱验证成功',
        user: {
          id: updatedUser.id,
          username: updatedUser.username,
          email: updatedUser.email,
          isEmailVerified: updatedUser.isEmailVerified,
        },
      };
    }
  );

  // ============ 验证码相关接口 ============

  // 发送验证码
  fastify.post(
    '/send-code',
    {
      preHandler: [fastify.optionalAuth],
      schema: {
        tags: ['auth'],
        description: '发送验证码（根据类型自动选择邮件或短信渠道）',
        body: {
          type: 'object',
          required: ['identifier', 'type'],
          properties: {
            identifier: {
              type: 'string',
              description: '标识符（邮箱或手机号，根据 type 决定）',
            },
            type: {
              type: 'string',
              enum: Object.values(VerificationCodeType),
              description: '验证码类型（类型决定发送渠道）',
            },
          },
        },
        response: {
          200: {
            type: 'object',
            properties: {
              message: { type: 'string' },
              expiresIn: { type: 'number', description: '过期时间（分钟）' },
              channel: { type: 'string', description: '发送渠道' },
            },
          },
        },
      },
    },
    async (request, reply) => {
      let { identifier } = request.body;
      const { type } = request.body;

      // 规范化标识符
      identifier = normalizeIdentifier(identifier);

      try {
        // 使用工具函数统一处理参数校验、权限校验和用户状态校验
        const validation = await validateVerificationRequest(
          identifier, 
          type, 
          request.user
        );

        if (!validation.isValid) {
          // 如果需要伪造成功响应（防账号枚举）
          if (validation.shouldFakeSuccess) {
            // 引入随机延迟（500ms - 1500ms）以防御时序攻击
            // 模拟真实发送邮件/短信的网络耗时
            const delay = Math.floor(Math.random() * 1000) + 500;
            await new Promise(resolve => setTimeout(resolve, delay));

            fastify.log.warn(
              `[发送验证码] 标识符不存在但返回成功消息以防止枚举: ${identifier}`
            );
            return {
              message: '验证码已发送',
              expiresIn: validation.config.expiryMinutes,
              channel: validation.config.channel,
            };
          }
          
          return reply.code(validation.statusCode || 400).send({ error: validation.error });
        }

        const { config, user } = validation;

        // 创建验证码（会自动检查频率限制）
        const { code, expiresAt } = await createVerificationCode(
          identifier,
          type,
          user?.id || request.user?.id
        );

        // 根据配置的渠道发送验证码
        try {
          await fastify.message.send(type, {
            to: identifier,
            data: { code },
          });

          fastify.log.info(
            `[发送验证码] 已发送至 ${identifier}, 类型: ${config.description}, 渠道: ${config.channel}`
          );
        } catch (error) {
          fastify.log.error(`[发送验证码] 发送失败: ${error.message}`);
          // 开发环境下，在日志中显示验证码
          if (isDev) {
            fastify.log.info(
              `[发送验证码] 验证码: ${code}, 过期时间: ${expiresAt}`
            );
          }
          return reply.code(500).send({ error: '发送验证码失败，请稍后重试' });
        }

        return {
          message: `验证码已发送，请查收${
            config.channel === VerificationChannel.EMAIL ? '邮件' : '短信'
          }`,
          expiresIn: config.expiryMinutes,
          channel: config.channel,
        };
      } catch (error) {
        // 处理频率限制错误
        if (error.message.includes('发送过于频繁')) {
          return reply.code(429).send({ error: error.message });
        }

        fastify.log.error(`[发送验证码] 错误: ${error.message}`);
        return reply.code(500).send({ error: '发送验证码失败，请稍后重试' });
      }
    }
  );

  // 校验验证码路由（仅校验，不参与业务逻辑）
  // 业务逻辑: 校验验证码 -> 处理业务逻辑 -> 删除验证码
  fastify.post(
    '/verify-code',
    {
      preHandler: [fastify.optionalAuth],
      schema: {
        tags: ['auth'],
        description: '校验验证码',
        body: {
          type: 'object',
          required: ['identifier', 'code', 'type'],
          properties: {
            identifier: {
              type: 'string',
              description: '标识符（邮箱或手机号）',
            },
            code: { type: 'string', minLength: 4, maxLength: 8 },
            type: {
              type: 'string',
              enum: Object.values(VerificationCodeType),
              description: '验证码类型',
            },
          },
        },
        response: {
          200: {
            type: 'object',
            properties: {
              valid: { type: 'boolean' },
              message: { type: 'string' },
            },
          },
        },
      },
    },
    async (request, reply) => {
      let { identifier } = request.body;
      const { code, type } = request.body;

      // 规范化标识符
      identifier = normalizeIdentifier(identifier);

      try {
        // 使用工具函数统一处理配置校验和参数格式校验
        const validation = await validateVerificationRequest(
          identifier, 
          type, 
          request.user
        );

        if (!validation.isValid) {
           // 如果 validateVerificationRequest 返回 shouldFakeSuccess，说明用户不存在但规则要求必须存在
           // 在验证码校验场景下，直接返回错误即可，因为如果用户不存在，验证码肯定也不存在
           if (validation.shouldFakeSuccess) {
              return reply.code(400).send({ 
                valid: false, 
                message: '验证码错误或已过期'
              });
           }

           return reply.code(validation.statusCode || 400).send({ 
             valid: false,
             message: validation.error 
           });
        }

        const { config } = validation;

        // 验证验证码
        const result = await verifyCode(identifier, code, type);

        if (!result.valid) {
          return reply.code(400).send({
            valid: false,
            message: result.error || '验证码错误',
          });
        }

        // 根据不同类型执行不同的后续操作
        let response = {
          valid: true,
          message: '验证成功',
        };

        fastify.log.info(
          `[验证码校验] 成功 - 标识符: ${identifier}, 类型: ${config.description}`
        );

        return response;
      } catch (error) {
        fastify.log.error(`[验证码校验] 错误: ${error.message}`);
        return reply.code(500).send({ error: '验证失败，请稍后重试' });
      }
    }
  );
}
