import db from '../../db/index.js';
import { users } from '../../db/schema.js';
import { eq } from 'drizzle-orm';
import { getSetting } from '../../utils/settings.js';
import {
  createEmailVerification,
  createPasswordReset,
  verifyToken,
  deleteVerification,
  VerificationType,
} from '../../utils/verification.js';
import {
  createVerificationCode,
  verifyCode,
  deleteVerificationCode,
} from '../../utils/verificationCode.js';
import {
  VerificationCodeType,
  VerificationChannel,
  UserValidation,
  getVerificationCodeConfig,
} from '../../config/verificationCode.js';
import {
  validateUsername,
  normalizeUsername,
} from '../../utils/validateUsername.js';
import { checkSpammer, formatSpamCheckMessage } from '../../utils/stopforumspam.js';
import qrLoginRoutes from './qr-login.js';

export default async function authRoutes(fastify, options) {
  // 注册扫码登录路由
  fastify.register(qrLoginRoutes, { prefix: '/qr-login' });

  // 注册 OAuth 路由
  // Register
  fastify.post(
    '/register',
    {
      schema: {
        tags: ['auth'],
        description: '注册新用户',
        body: {
          type: 'object',
          required: ['username', 'email', 'password'],
          properties: {
            username: { type: 'string', minLength: 3, maxLength: 50 },
            email: { type: 'string', format: 'email' },
            password: { type: 'string', minLength: 6 },
            name: { type: 'string', maxLength: 255 },
            invitationCode: { type: 'string' },
          },
        },
        response: {
          200: {
            type: 'object',
            properties: {
              user: {
                type: 'object',
                properties: {
                  id: { type: 'number' },
                  username: { type: 'string' },
                  email: { type: 'string' },
                  name: { type: 'string' },
                  role: { type: 'string' },
                  isEmailVerified: { type: 'boolean' },
                  createdAt: { type: 'string' },
                },
              },
              token: { type: 'string' },
            },
          },
        },
      },
    },
    async (request, reply) => {
      const { username, email, password, name, invitationCode } = request.body;

      // 规范化并验证用户名格式
      const normalizedUsername = normalizeUsername(username);
      const usernameValidation = validateUsername(normalizedUsername);

      if (!usernameValidation.valid) {
        return reply.code(400).send({ error: usernameValidation.error });
      }

      // 检查注册模式
      const registrationMode = await getSetting('registration_mode', 'open');

      // 如果注册已关闭
      if (registrationMode === 'closed') {
        return reply.code(403).send({ error: '注册功能已关闭' });
      }

      // 如果是邀请码模式，验证邀请码
      const isInvitationMode = registrationMode === 'invitation';
      if (isInvitationMode) {
        if (!invitationCode) {
          return reply
            .code(400)
            .send({ error: '邀请码注册模式下必须提供邀请码' });
        }

        // 动态导入邀请码验证函数
        const { validateInvitationCode } = await import(
          '../../utils/invitation.js'
        );
        const validation = await validateInvitationCode(invitationCode.trim());

        if (!validation.valid) {
          return reply.code(400).send({ error: validation.message });
        }
      }

      // ============ StopForumSpam 垃圾注册检查 ============
      const spamProtectionEnabled = await getSetting('spam_protection_enabled', false);

      if (spamProtectionEnabled && !isInvitationMode) {
        // 获取检查配置
        const checkIP = await getSetting('spam_protection_check_ip', true);
        const checkEmail = await getSetting('spam_protection_check_email', true);
        const checkUsername = await getSetting('spam_protection_check_username', true);
        const apiKey = await getSetting('spam_protection_api_key', '');

        // 构建检查类型数组
        const checkTypes = [];
        if (checkIP) checkTypes.push('ip');
        if (checkEmail) checkTypes.push('email');
        if (checkUsername) checkTypes.push('username');

        // 如果至少有一种检查类型
        if (checkTypes.length > 0) {
          // 获取用户 IP（从请求头或 socket 地址获取）
          const userIP =
            request.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
            request.headers['x-real-ip'] ||
            request.ip ||
            request.socket.remoteAddress;

          // 调用 StopForumSpam API 检查
          const spamCheckResult = await checkSpammer(
            {
              ip: userIP,
              email: email,
              username: normalizedUsername,
            },
            checkTypes,
            apiKey
          );

          // 记录检查结果
          fastify.log.info(
            `[StopForumSpam] 注册检查: ${email} | IP: ${userIP} | 用户名: ${normalizedUsername} | 结果: ${spamCheckResult.isSpammer ? '拦截' : '通过'}`
          );

          // 如果检测到垃圾注册
          if (spamCheckResult.isSpammer) {
            const errorMessage = formatSpamCheckMessage(spamCheckResult);
            fastify.log.warn(
              `[StopForumSpam] 拦截垃圾注册: ${email} | 置信度: ${spamCheckResult.confidence}% | 详情: ${JSON.stringify(spamCheckResult.details)}`
            );
            return reply.code(403).send({
              error: errorMessage || '检测到垃圾注册行为，注册已被拦截',
              details: spamCheckResult.details,
            });
          }

          // 如果 API 调用失败但有错误信息，记录日志但允许继续注册
          if (spamCheckResult.error) {
            fastify.log.warn(
              `[StopForumSpam] API 调用失败，跳过检查: ${spamCheckResult.error}`
            );
          }
        }
      }
      // ============ StopForumSpam 检查结束 ============

      // Check if user exists
      const existingUser = await db
        .select()
        .from(users)
        .where(eq(users.email, email))
        .limit(1);
      if (existingUser.length > 0) {
        return reply.code(400).send({ error: '邮箱已被注册' });
      }

      const existingUsername = await db
        .select()
        .from(users)
        .where(eq(users.username, normalizedUsername))
        .limit(1);
      if (existingUsername.length > 0) {
        return reply.code(400).send({ error: '用户名已被占用' });
      }

      // Hash password
      const passwordHash = await fastify.hashPassword(password);

      // 检查是否是第一个用户
      const userCount = await db.select({ count: users.id }).from(users);
      const isFirstUser = userCount.length === 0;

      // Create user
      const [newUser] = await db
        .insert(users)
        .values({
          username: normalizedUsername,
          email,
          passwordHash,
          name: name || normalizedUsername,
          role: isFirstUser ? 'admin' : 'user', // 第一个用户设为管理员
          isEmailVerified: false,
        })
        .returning();

      // 先检查邮件服务是否配置，避免创建无用的验证码
      const emailProvider = await fastify.getDefaultEmailProvider();

      if (!emailProvider || !emailProvider.isEnabled) {
        // 邮件服务未配置，记录警告但不阻止注册
        fastify.log.warn(`[注册] 邮件服务未配置或未启用，跳过发送欢迎邮件和验证链接`);
      } else {
        // 创建邮箱验证码
        const verificationToken = await createEmailVerification(
          email,
          newUser.id
        );

        // 发送欢迎邮件 + 邮箱验证链接
        try {
          await fastify.sendEmail({
            to: email,
            template: 'welcome',
            data: {
              username: newUser.username,
              verificationLink: `${
                process.env.APP_URL || 'http://localhost:3000'
              }/verify-email?token=${verificationToken}`,
            },
          });
          fastify.log.info(`[注册] 欢迎邮件已发送至 ${email}`);
        } catch (error) {
          // 邮件发送失败不应阻止注册流程
          fastify.log.error(`[注册] 发送欢迎邮件失败: ${error.message}`);
          // 开发环境下，在日志中显示验证链接
          fastify.log.info(
            `[注册] 验证链接: ${
              process.env.APP_URL || 'http://localhost:3000'
            }/verify-email?token=${verificationToken}`
          );
        }
      }

      // 如果使用了邀请码，标记为已使用
      if (registrationMode === 'invitation' && invitationCode) {
        const { markInvitationCodeAsUsed } = await import(
          '../../utils/invitation.js'
        );
        await markInvitationCodeAsUsed(invitationCode.trim(), newUser.id);
      }

      // Generate JWT token (只包含用户ID，其他信息从数据库实时获取)
      const token = fastify.jwt.sign({
        id: newUser.id,
      });

      // Remove sensitive data
      delete newUser.passwordHash;

      return { user: newUser, token };
    }
  );

  // Login
  fastify.post(
    '/login',
    {
      schema: {
        tags: ['auth'],
        description: '用户登录（支持用户名或邮箱）',
        body: {
          type: 'object',
          required: ['identifier', 'password'],
          properties: {
            identifier: { type: 'string', description: '用户名或邮箱' },
            password: { type: 'string' },
          },
        },
        response: {
          200: {
            type: 'object',
            properties: {
              user: {
                type: 'object',
                properties: {
                  id: { type: 'number' },
                  username: { type: 'string' },
                  email: { type: 'string' },
                  name: { type: 'string' },
                  role: { type: 'string' },
                  isEmailVerified: { type: 'boolean' },
                },
              },
              token: { type: 'string' },
            },
          },
        },
      },
    },
    async (request, reply) => {
      const { identifier, password } = request.body;

      // 判断 identifier 是邮箱还是用户名
      const isEmail = identifier.includes('@');
      
      // Find user by email or username
      const [user] = await db
        .select()
        .from(users)
        .where(isEmail ? eq(users.email, identifier) : eq(users.username, identifier))
        .limit(1);
      
      if (!user) {
        return reply.code(401).send({ error: '用户名/邮箱或密码错误' });
      }

      // Check if deleted
      if (user.isDeleted) {
        return reply.code(403).send({ error: '该账号已被删除' });
      }

      // Check if banned
      if (user.isBanned) {
        return reply.code(403).send({ error: '账号已被封禁' });
      }

      // Verify password
      const isValidPassword = await fastify.verifyPassword(
        password,
        user.passwordHash
      );
      if (!isValidPassword) {
        return reply.code(401).send({ error: '用户名/邮箱或密码错误' });
      }

      // Update last seen
      await db
        .update(users)
        .set({ lastSeenAt: new Date() })
        .where(eq(users.id, user.id));

      // Generate JWT token (只包含用户ID，其他信息从数据库实时获取)
      const token = fastify.jwt.sign({
        id: user.id,
      });

      // Remove sensitive data
      delete user.passwordHash;

      return { user, token };
    }
  );

  // Get current user
  fastify.get(
    '/me',
    {
      preHandler: [fastify.authenticate],
      schema: {
        tags: ['auth'],
        description: '获取当前认证用户',
        security: [{ bearerAuth: [] }],
        response: {
          200: {
            type: 'object',
            properties: {
              id: { type: 'number' },
              username: { type: 'string' },
              email: { type: 'string' },
              name: { type: 'string' },
              bio: { type: 'string' },
              avatar: { type: 'string' },
              role: { type: 'string' },
              isEmailVerified: { type: 'boolean' },
              isBanned: { type: 'boolean' },
              createdAt: { type: 'string' },
              lastSeenAt: { type: 'string' },
              messagePermission: { type: 'string' },
              contentVisibility: { type: 'string' },
              usernameChangeCount: { type: 'number' },
              usernameChangedAt: { type: ['string', 'null'] },
            },
          },
        },
      },
    },
    async (request, reply) => {
      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.id, request.user.id))
        .limit(1);

      if (!user) {
        return reply.code(404).send({ error: '用户不存在' });
      }

      delete user.passwordHash;

      return user;
    }
  );

  // Request password reset
  fastify.post(
    '/forgot-password',
    {
      schema: {
        tags: ['auth'],
        description: '请求密码重置',
        body: {
          type: 'object',
          required: ['email'],
          properties: {
            email: { type: 'string', format: 'email' },
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
      const { email } = request.body;

      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.email, email))
        .limit(1);

      // Always return success to prevent email enumeration
      if (!user) {
        return { message: '如果邮箱存在，密码重置链接已发送' };
      }

      // 先检查邮件服务是否配置，避免创建无用的验证码
      const emailProvider = await fastify.getDefaultEmailProvider();

      if (!emailProvider || !emailProvider.isEnabled) {
        // 邮件服务未配置，记录错误但返回成功消息（防止邮箱枚举）
        fastify.log.error(`[密码重置] 邮件服务未配置或未启用，无法发送重置邮件至 ${email}`);
        return { message: '如果邮箱存在，密码重置链接已发送' };
      }

      // 创建密码重置验证码
      const resetToken = await createPasswordReset(email, user.id);

      // 发送密码重置邮件
      try {
        await fastify.sendEmail({
          to: email,
          template: 'password-reset',
          data: {
            username: user.username,
            resetLink: `${
              process.env.APP_URL || 'http://localhost:3000'
            }/reset-password?token=${resetToken}`,
            expiresIn: '1小时',
          },
        });
        fastify.log.info(`[密码重置] 重置邮件已发送至 ${email}`);
      } catch (error) {
        fastify.log.error(`[密码重置] 发送邮件失败: ${error.message}`);
        // 开发环境下，在日志中显示重置链接
        fastify.log.info(
          `[密码重置] 重置链接: ${
            process.env.APP_URL || 'http://localhost:3000'
          }/reset-password?token=${resetToken}`
        );
        return reply.code(500).send({ error: error.message || '发送邮件失败' });
      }

      return { message: '如果邮箱存在，密码重置链接已发送' };
    }
  );

  // Reset password
  fastify.post(
    '/reset-password',
    {
      schema: {
        tags: ['auth'],
        description: '使用令牌重置密码',
        body: {
          type: 'object',
          required: ['token', 'password'],
          properties: {
            token: { type: 'string' },
            password: { type: 'string', minLength: 6 },
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
      const { token, password } = request.body;

      // 验证 token
      const verification = await verifyToken(
        token,
        VerificationType.PASSWORD_RESET
      );

      if (!verification || !verification.userId) {
        return reply.code(400).send({ error: '重置令牌无效或已过期' });
      }

      const passwordHash = await fastify.hashPassword(password);

      await db
        .update(users)
        .set({
          passwordHash,
        })
        .where(eq(users.id, verification.userId));

      // 删除已使用的验证码
      await deleteVerification(token, VerificationType.PASSWORD_RESET, verification.identifier);

      return { message: '密码重置成功' };
    }
  );

  // Verify email
  fastify.post(
    '/verify-email',
    {
      schema: {
        tags: ['auth'],
        description: '使用令牌验证邮箱',
        body: {
          type: 'object',
          required: ['token'],
          properties: {
            token: { type: 'string' },
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
                  email: { type: 'string' },
                  isEmailVerified: { type: 'boolean' },
                },
              },
            },
          },
        },
      },
    },
    async (request, reply) => {
      const { token } = request.body;

      // 验证 token
      const verification = await verifyToken(
        token,
        VerificationType.EMAIL_VERIFICATION
      );

      if (!verification || !verification.userId) {
        return reply.code(400).send({ error: '无效的验证链接' });
      }

      // 获取用户信息
      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.id, verification.userId))
        .limit(1);

      if (!user) {
        return reply.code(400).send({ error: '用户不存在' });
      }

      if (user.isEmailVerified) {
        return reply.code(400).send({ error: '邮箱已经验证过了' });
      }

      // Update user email verification status
      const [updatedUser] = await db
        .update(users)
        .set({
          isEmailVerified: true,
        })
        .where(eq(users.id, user.id))
        .returning();

      // 清除用户缓存，使邮箱验证状态立即生效
      await fastify.clearUserCache(user.id);

      // 删除已使用的验证码
      await deleteVerification(token, VerificationType.EMAIL_VERIFICATION, verification.identifier);

      // Remove sensitive data
      delete updatedUser.passwordHash;

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

  // Resend verification email
  fastify.post(
    '/resend-verification',
    {
      preHandler: [fastify.authenticate],
      schema: {
        tags: ['auth'],
        description: '重新发送邮箱验证链接',
        security: [{ bearerAuth: [] }],
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
      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.id, request.user.id))
        .limit(1);

      if (!user) {
        return reply.code(404).send({ error: '用户不存在' });
      }

      if (user.isEmailVerified) {
        return reply.code(400).send({ error: '邮箱已经验证过了' });
      }

      // 先检查邮件服务是否配置
      const emailProvider = await fastify.getDefaultEmailProvider();

      if (!emailProvider || !emailProvider.isEnabled) {
        fastify.log.warn(`[重发验证] 邮件服务未配置或未启用`);
        return reply.code(503).send({
          error: '邮件服务暂不可用，请联系管理员配置邮件服务'
        });
      }

      // 创建新的验证码
      const verificationToken = await createEmailVerification(
        user.email,
        user.id
      );

      // 重新发送邮箱验证邮件
      try {
        await fastify.sendEmail({
          to: user.email,
          template: 'email-verification',
          data: {
            username: user.username,
            verificationLink: `${
              process.env.APP_URL || 'http://localhost:3000'
            }/verify-email?token=${verificationToken}`,
          },
        });
        fastify.log.info(`[重发验证] 验证邮件已发送至 ${user.email}`);
      } catch (error) {
        fastify.log.error(`[重发验证] 发送邮件失败: ${error.message}`);
        // 开发环境下，在日志中显示验证链接
        fastify.log.info(
          `[重发验证] 验证链接: ${
            process.env.APP_URL || 'http://localhost:3000'
          }/verify-email?token=${verificationToken}`
        );
        return reply.code(500).send({ error: error.message || '发送邮件失败' });
      }

      return { message: '验证邮件已发送，请查收' };
    }
  );

  // ============ 验证码相关接口 ============

  // Send verification code
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
      const { identifier, type } = request.body;

      try {
        // 获取验证码配置
        const config = getVerificationCodeConfig(type);
        if (!config) {
          return reply.code(400).send({ error: '无效的验证码类型' });
        }

        // 检查是否需要认证
        if (config.requireAuth && !request.user) {
          return reply.code(401).send({ error: '需要登录后才能执行此操作' });
        }

        // 根据渠道验证标识符格式
        const isEmailChannel = config.channel === VerificationChannel.EMAIL;
        const isSmsChannel = config.channel === VerificationChannel.SMS;

        if (isEmailChannel) {
          // 邮件渠道：验证邮箱格式
          const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
          if (!emailRegex.test(identifier)) {
            return reply.code(400).send({ error: '请输入有效的邮箱地址' });
          }
        } else if (isSmsChannel) {
          // 短信渠道：验证手机号格式（中国大陆）
          const phoneRegex = /^1[3-9]\d{9}$/;
          if (!phoneRegex.test(identifier)) {
            return reply
              .code(400)
              .send({ error: '请输入有效的手机号（仅支持中国大陆手机号）' });
          }
        }

        // 根据配置的用户验证规则进行验证
        let user = null;

        if (config.userValidation === UserValidation.MUST_EXIST) {
          // 用户必须存在（登录、密码重置、更换账号）
          const [existingUser] = await db
            .select()
            .from(users)
            .where(
              isEmailChannel
                ? eq(users.email, identifier)
                : eq(users.phone, identifier)
            )
            .limit(1);

          // 为了防止账号枚举，即使用户不存在也返回成功
          if (!existingUser) {
            fastify.log.warn(
              `[发送验证码] 标识符不存在但返回成功消息以防止枚举: ${identifier}`
            );
            return {
              message: '验证码已发送',
              expiresIn: config.expiryMinutes,
              channel: config.channel,
            };
          }

          user = existingUser;

          // 如果需要认证且用户存在，额外检查所有权（更换账号场景）
          if (config.requireAuth && user.id !== request.user.id) {
            return reply.code(403).send({
              error: `该${isEmailChannel ? '邮箱' : '手机号'}不属于您`,
            });
          }
        } else if (config.userValidation === UserValidation.MUST_NOT_EXIST) {
          // 用户必须不存在（注册）
          const [existingUser] = await db
            .select()
            .from(users)
            .where(
              isEmailChannel
                ? eq(users.email, identifier)
                : eq(users.phone, identifier)
            )
            .limit(1);

          if (existingUser) {
            return reply.code(400).send({
              error: `该${isEmailChannel ? '邮箱' : '手机号'}已被注册`,
            });
          }
        } else {
          // 未设置 userValidation（绑定账号、敏感操作）
          // 对于绑定账号场景，检查标识符是否被其他用户占用
          if (config.requireAuth) {
            const [existingUser] = await db
              .select()
              .from(users)
              .where(
                isEmailChannel
                  ? eq(users.email, identifier)
                  : eq(users.phone, identifier)
              )
              .limit(1);

            if (existingUser && existingUser.id !== request.user.id) {
              return reply.code(400).send({
                error: `该${isEmailChannel ? '邮箱' : '手机号'}已被其他用户使用`,
              });
            }
          }
        }

        // 创建验证码（会自动检查频率限制）
        const { code, expiresAt } = await createVerificationCode(
          identifier,
          type,
          user?.id || request.user?.id
        );

        // 根据配置的渠道发送验证码
        try {
          if (config.channel === VerificationChannel.EMAIL) {
            // ========== 邮件渠道 ==========
            // 检查邮件服务是否配置
            const emailProvider = await fastify.getDefaultEmailProvider();
            if (!emailProvider || !emailProvider.isEnabled) {
              fastify.log.error(`[发送验证码] 邮件服务未配置或未启用`);
              return reply
                .code(503)
                .send({ error: '邮件服务暂不可用，请稍后重试' });
            }

            // 发送邮件验证码
            await fastify.sendEmail({
              to: identifier,
              template: config.template,
              data: {
                code,
                type: config.description,
                expiryMinutes: config.expiryMinutes,
                identifier,
              },
            });

            fastify.log.info(
              `[发送验证码] 邮件已发送至 ${identifier}, 类型: ${config.description}`
            );
          } else if (config.channel === VerificationChannel.SMS) {
            // ========== 短信渠道 ==========
            // TODO: 集成短信服务
            // 推荐服务商：
            // - 阿里云短信：https://help.aliyun.com/product/44282.html
            // - 腾讯云短信：https://cloud.tencent.com/product/sms
            //
            // 示例代码：
            // await sendSMS({
            //   phone: identifier,
            //   code: code,
            //   template: config.template
            // });

            fastify.log.warn(
              `[发送验证码] 短信服务暂未实现，验证码: ${code}, 手机号: ${identifier}, 模板: ${config.template}`
            );

            // 开发环境下返回验证码（生产环境删除此段）
            if (process.env.NODE_ENV === 'development') {
              return {
                message: `验证码已生成（开发模式）: ${code}`,
                expiresIn: config.expiryMinutes,
                channel: config.channel,
                _devCode: code, // 仅开发环境
                _template: config.template,
              };
            }

            return reply.code(501).send({ error: '短信服务暂未开通' });
          }
        } catch (error) {
          fastify.log.error(`[发送验证码] 发送失败: ${error.message}`);
          // 开发环境下，在日志中显示验证码
          if (process.env.NODE_ENV === 'development') {
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

  // Verify code 仅校验，不参与业务逻辑
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
      const { identifier, code, type } = request.body;

      try {
        // 获取验证码配置
        const config = getVerificationCodeConfig(type);
        if (!config) {
          return reply.code(400).send({ error: '无效的验证码类型' });
        }

        // 检查是否需要认证
        if (config.requireAuth && !request.user) {
          return reply.code(401).send({ error: '需要登录后才能执行此操作' });
        }

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
