import { userEnricher } from '../../services/userEnricher.js';
import db from '../../db/index.js';
import { users } from '../../db/schema.js';
import { eq } from 'drizzle-orm';
import { normalizePhone, isPhoneNumber } from '../../utils/normalization.js';
import {
  verifyCode,
  deleteVerificationCode,
} from '../../plugins/message/utils/verificationCode.js';

/**
 * 生成唯一用户名
 * 格式: phone_{后4位}_{随机4位}
 */
async function generateUniqueUsername(phone) {
  const last4 = phone.slice(-4);
  for (let i = 0; i < 10; i++) {
    const rand = Math.floor(1000 + Math.random() * 9000);
    const username = `phone_${last4}_${rand}`;
    const [existing] = await db
      .select()
      .from(users)
      .where(eq(users.username, username))
      .limit(1);
    if (!existing) return username;
  }
  // 极端情况：使用时间戳
  return `phone_${last4}_${Date.now().toString(36)}`;
}

export default async function phoneLoginRoute(fastify) {
  // 手机号验证码登录（用户不存在则自动注册）
  // 手机号+密码登录复用已有的 /auth/login 接口
  fastify.post(
    '/',
    {
      schema: {
        tags: ['auth'],
        description: '手机号验证码登录（用户不存在则自动注册）',
        body: {
          type: 'object',
          required: ['phone', 'code'],
          properties: {
            phone: { type: 'string' },
            code: { type: 'string' },
          },
        },
      },
    },
    async (request, reply) => {
      const { code } = request.body;
      const phone = normalizePhone(request.body.phone);

      if (!phone || !isPhoneNumber(phone)) {
        return reply.code(400).send({ error: '请输入有效的手机号' });
      }

      // 验证验证码
      const verification = await verifyCode(phone, code, 'phone_login');
      if (!verification.valid) {
        return reply.code(400).send({ error: verification.error });
      }

      // 查找用户
      let [user] = await db
        .select()
        .from(users)
        .where(eq(users.phone, phone))
        .limit(1);

      let isNewUser = false;
      let needSetPassword = false;

      if (user) {
        // 用户已存在
        if (user.isDeleted) {
          return reply.code(403).send({ error: '该账号已被删除' });
        }

        const banStatus = await fastify.checkUserBanStatus(user);
        if (banStatus.isBanned) {
          return reply.code(403).send({ error: fastify.getBanMessage(banStatus) });
        }

        needSetPassword = !user.passwordHash;
      } else {
        // 用户不存在，自动注册
        isNewUser = true;
        needSetPassword = true;

        const username = await generateUniqueUsername(phone);

        const [newUser] = await db
          .insert(users)
          .values({
            username,
            email: null,
            passwordHash: null,
            phone,
            isPhoneVerified: true,
            role: 'user',
            registrationIp: request.ip,
          })
          .returning();

        // 分配默认角色
        await fastify.permission.assignDefaultRoleToUser(newUser.id, { isFirstUser: false });

        user = newUser;
      }

      // 删除验证码
      await deleteVerificationCode(phone, 'phone_login');

      // 更新登录 IP & 确保手机已验证
      await db
        .update(users)
        .set({ isPhoneVerified: true, lastLoginIp: request.ip })
        .where(eq(users.id, user.id));

      // 生成 Token
      const token = reply.generateAuthToken({ id: user.id });

      // 丰富用户信息
      await userEnricher.enrich(user);

      // 移除敏感数据
      delete user.passwordHash;

      return { user, token, isNewUser, needSetPassword };
    }
  );
}
