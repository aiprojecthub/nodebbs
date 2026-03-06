import { userEnricher } from '../../services/userEnricher.js';
import db from '../../db/index.js';
import { users } from '../../db/schema.js';
import { eq } from 'drizzle-orm';
import { normalizeIdentifier, isPhoneNumber } from '../../utils/normalization.js';

export default async function loginRoute(fastify, options) {
  fastify.post(
    '/login',
    {
      preHandler: [fastify.verifyCaptcha('login')],
      schema: {
        tags: ['auth'],
        description: '用户登录（支持用户名、邮箱或手机号）',
        body: {
          type: 'object',
          required: ['identifier', 'password'],
          properties: {
            identifier: { type: 'string', description: '用户名、邮箱或手机号' },
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
      let { identifier } = request.body;
      const { password } = request.body;

      // 规范化标识符 (Trim + Lowercase if email)
      identifier = normalizeIdentifier(identifier);

      if (!identifier) {
        return reply.code(400).send({ error: '请输入用户名、邮箱或手机号' });
      }

      // 判断 identifier 是邮箱、手机号还是用户名
      const isEmail = identifier.includes('@');
      const isPhone = isPhoneNumber(identifier);

      // 使用邮箱、手机号或用户名查找用户
      const whereClause = isEmail
        ? eq(users.email, identifier)
        : isPhone
          ? eq(users.phone, identifier)
          : eq(users.username, identifier);

      const [user] = await db
        .select()
        .from(users)
        .where(whereClause)
        .limit(1);
      
      if (!user) {
        return reply.code(401).send({ error: '用户名/邮箱或密码错误' });
      }

      // 检查账号是否被删除
      if (user.isDeleted) {
        return reply.code(403).send({ error: '该账号已被删除' });
      }

      // 检查账号是否被封禁（支持临时封禁）
      const banStatus = await fastify.checkUserBanStatus(user);
      if (banStatus.isBanned) {
        return reply.code(403).send({ error: fastify.getBanMessage(banStatus) });
      }

      // 检查用户是否设置了密码 (第三方登录用户可能没有密码)
      if (!user.passwordHash) {
        // 该账号未设置密码，请使用第三方登录或找回密码
        return reply.code(401).send({ error: '用户名/邮箱或密码错误ha' });
      }

      // 验证密码
      const isValidPassword = await fastify.verifyPassword(
        password,
        user.passwordHash
      );
      if (!isValidPassword) {
        return reply.code(401).send({ error: '用户名/邮箱或密码错误' });
      }

      // 更新登录 IP
      await db
        .update(users)
        .set({ lastLoginIp: request.ip })
        .where(eq(users.id, user.id));

      // 生成 Token 并设置 Cookie
      const token = reply.generateAuthToken({
        id: user.id,
      });

      // 丰富用户信息（徽章、头像框等）
      await userEnricher.enrich(user);

      // 移除敏感数据
      delete user.passwordHash;

      return { user, token };
    }
  );
}
