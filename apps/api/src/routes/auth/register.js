import { userEnricher } from '../../services/userEnricher.js';
import db from '../../db/index.js';
import { users } from '../../db/schema.js';
import { count, eq } from 'drizzle-orm';
import { validateInvitationCode, markInvitationCodeAsUsed } from '../../services/invitationService.js';
import { validateUsername } from '../../utils/validateUsername.js';
import { normalizeEmail, normalizeUsername } from '../../utils/normalization.js';
import { checkSpammer, formatSpamCheckMessage } from '../../services/spamService.js';
import { DEFAULT_CURRENCY_CODE } from '../../extensions/ledger/constants.js';

export default async function registerRoute(fastify, options) {
  fastify.post(
    '/register',
    {
      preHandler: [fastify.verifyCaptcha('register')],
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
                  email: { type: ['string', 'null'] },
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
                  avatarFrame: {
                    type: ['object', 'null'],
                    properties: {
                      id: { type: 'number' },
                      itemType: { type: 'string' },
                      itemName: { type: 'string' },
                      itemMetadata: { type: ['string', 'null'] },
                      imageUrl: { type: ['string', 'null'] }
                    }
                  },
                },
              },
              token: { type: 'string' },
            },
          },
        },
      },
    },
    async (request, reply) => {
      const { username, password, name, invitationCode } = request.body;
      let { email } = request.body;

      // 规范化邮箱
      email = normalizeEmail(email);

      // 规范化并验证用户名格式
      const normalizedUsername = normalizeUsername(username);
      const usernameValidation = validateUsername(normalizedUsername);

      if (!usernameValidation.valid) {
        return reply.code(400).send({ error: usernameValidation.error });
      }

      // 检查是否是第一个用户（需在注册模式检查之前，第一个用户绕过模式限制以避免系统无法初始化）
      const userCount = await db.select({ count: count() }).from(users);
      const isFirstUser = userCount[0].count === 0;

      // 检查注册模式（第一个用户绕过，否则 closed/invitation 模式下无法创建首个管理员）
      let registrationMode = 'open';
      let isInvitationMode = false;

      if (!isFirstUser) {
        registrationMode = await fastify.settings.get('registration_mode', 'open');

        if (registrationMode === 'closed') {
          return reply.code(403).send({ error: '注册功能已关闭' });
        }

        isInvitationMode = registrationMode === 'invitation';
        if (isInvitationMode) {
          if (!invitationCode) {
            return reply
              .code(400)
              .send({ error: '邀请码注册模式下必须提供邀请码' });
          }

          const validation = await validateInvitationCode(invitationCode.trim());

          if (!validation.valid) {
            return reply.code(400).send({ error: validation.message });
          }
        }
      }

      // ============ StopForumSpam 垃圾注册检查 ============
      const spamProtectionEnabled = await fastify.settings.get('spam_protection_enabled', false);

      if (spamProtectionEnabled && !isInvitationMode) {
        // 获取检查配置
        const checkIP = await fastify.settings.get('spam_protection_check_ip', true);
        const checkEmail = await fastify.settings.get('spam_protection_check_email', true);
        const checkUsername = await fastify.settings.get('spam_protection_check_username', true);
        const apiKey = await fastify.settings.get('spam_protection_api_key', '');

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

      // 检查用户是否存在
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

      // 密码哈希加密
      const passwordHash = await fastify.hashPassword(password);

      // 创建用户
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

      // 分配默认角色（用户-角色关联）
      await fastify.permission.assignDefaultRoleToUser(newUser.id, { isFirstUser });

      // 注册成功后，不再发送邮件
      fastify.log.info(`[注册] 用户 ${email} 注册成功，等待邮箱验证`);

      // 如果使用了邀请码，标记为已使用并处理奖励（不阻断注册流程）
      if (isInvitationMode && invitationCode) {
        try {
          const usedInvitation = await markInvitationCodeAsUsed(invitationCode.trim(), newUser.id);

          if (usedInvitation && usedInvitation.createdBy) {
            const isRewardsActive = await fastify.ledger.isCurrencyActive(DEFAULT_CURRENCY_CODE);

            if (isRewardsActive) {
              const inviteAmount = await fastify.ledger.getCurrencyConfig(DEFAULT_CURRENCY_CODE, 'invite_user_amount', 10);

              if (inviteAmount > 0) {
                await fastify.ledger.grant({
                  userId: usedInvitation.createdBy,
                  amount: inviteAmount,
                  currencyCode: DEFAULT_CURRENCY_CODE,
                  type: 'invite_user',
                  referenceType: 'invite_user',
                  referenceId: `${usedInvitation.createdBy}_invite_${newUser.id}`,
                  description: `邀请新用户注册：${newUser.username}`,
                  metadata: {
                    invitedUserId: newUser.id,
                    invitedUsername: newUser.username,
                    source: 'rewards-extension'
                  }
                });
                fastify.log.info(`[奖励系统] 已给邀请人 ${usedInvitation.createdBy} 发放邀请奖励`);
              }
            }
          }
        } catch (error) {
          fastify.log.error(error, `[注册] 邀请码后处理失败: code=${invitationCode}, userId=${newUser.id}`);
        }
      }

      // 生成 Token 并设置 Cookie
      const token = reply.generateAuthToken({
        id: newUser.id,
      });

      // 丰富用户信息（徽章、头像框等）
      await userEnricher.enrich(newUser);

      // 移除敏感数据
      delete newUser.passwordHash;

      return { user: newUser, token };
    }
  );
}
