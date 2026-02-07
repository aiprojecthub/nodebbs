import { userEnricher } from '../../services/userEnricher.js';
import db from '../../db/index.js';
import { users, accounts } from '../../db/schema.js';
import { eq } from 'drizzle-orm';

export default async function userRoute(fastify, options) {
  // 获取当前登录用户
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
              hasPassword: { type: 'boolean' },
              oauthProviders: { 
                type: 'array',
                items: { type: 'string' }
              },
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
              badges: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    id: { type: 'number' },
                    isDisplayed: { type: 'boolean' },
                    earnedAt: { type: ['string', 'null'] },
                    badge: {
                      type: 'object',
                      properties: {
                        id: { type: 'number' },
                        name: { type: 'string' },
                        slug: { type: 'string' },
                        iconUrl: { type: 'string' },
                        description: { type: ['string', 'null'] },
                        metadata: { type: ['string', 'null'] },
                        unlockCondition: { type: ['string', 'null'] }
                      }
                    }
                  }
                }
              },
              // RBAC 权限数据
              userRoles: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    id: { type: 'number' },
                    slug: { type: 'string' },
                    name: { type: 'string' },
                    color: { type: 'string' },
                    icon: { type: 'string' },
                    priority: { type: 'number' },
                    isDisplayed: { type: 'boolean' },
                  },
                },
              },
              permissions: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    slug: { type: 'string' },
                    conditions: { 
                      type: ['object', 'null'],
                      additionalProperties: true,  // 允许任意属性通过序列化
                    },
                  },
                },
                description: '用户权限列表，包含权限标识和条件',
              },
              displayRole: {
                type: ['object', 'null'],
                properties: {
                  slug: { type: 'string' },
                  name: { type: 'string' },
                  color: { type: 'string' },
                  icon: { type: 'string' },
                },
              },
            },
          },
        },
      },
    },
    async (request, reply) => {
      const userId = request.user.id;

      // 直接利用 request.user (由 auth 插件中的 authenticate preHandler 提供)
      // authenticate 已经通过 permission.enrichUser 注入了完整的 RBAC 数据
      // 不做复合缓存，各数据源已有独立缓存（user:${id}, user:${id}:roles, role:*:permissions）
      const user = { ...request.user };

      // 并行获取 OAuth 账号和密码状态（这些不属于 RBAC 增强范畴，仅在此接口需要）
      const [userAccounts, pwdResult] = await Promise.all([
        db.select().from(accounts).where(eq(accounts.userId, user.id)),
        db.select({ passwordHash: users.passwordHash }).from(users).where(eq(users.id, userId)).limit(1),
      ]);

      // 丰富用户信息（徽章、头像框等）
      await userEnricher.enrich(user);

      const oauthProviders = userAccounts.map(acc => acc.provider);
      const userHasPassword = !!(pwdResult[0]?.passwordHash);

      return {
        ...user,
        hasPassword: userHasPassword,
        oauthProviders,
        // userRoles, permissions, displayRole 已经在 user 对象中（由 auth 插件注入）
        // 保持 API 返回的权限结构兼容性
        permissions: user.permissions.map(p => ({
          slug: p.slug,
          conditions: p.conditions || null,
        })),
      };
    }
  );

  // 用户登出
  fastify.post(
    '/logout',
    {
      schema: {
        tags: ['auth'],
        description: '用户登出',
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
      // 清除 Cookie
      reply.clearCookie('auth_token', { path: '/', domain: process.env.COOKIE_DOMAIN || undefined });
      return { message: '登出成功' };
    }
  );
}
