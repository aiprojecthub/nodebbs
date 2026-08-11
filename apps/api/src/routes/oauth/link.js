/**
 * 三方账号「关联 / 解绑」路由
 *
 * 与登录流程的关系：
 * - 登录流程走各 provider 自己的 /:provider/connect + /:provider/callback，
 *   回调最终调用 handleOAuthLogin —— 若该三方账号已属于他人，会直接签发**那个人**的
 *   token，把当前登录用户顶掉。因此关联流程必须完全独立，不能复用登录回调。
 * - 隔离手段是**独立的 state cookie**：关联流程写 `oauth_link_state`，登录流程写
 *   `oauth_state`。即便有人把关联流程拿到的 code/state 喂给登录回调，state 也对不上
 *   而被拒；反之亦然。隔离是结构性的，无需改动任何现有登录路由。
 *
 * 通用 :provider 路由，一份实现覆盖所有平台。
 */
import db from '../../db/index.js';
import { accounts, users } from '../../db/schema.js';
import { and, eq } from 'drizzle-orm';
import {
  generateLinkState,
  isLinkState,
  linkOAuthAccountForUser,
  unlinkOAuthAccount,
  OAuthLinkError,
} from '../../services/oauthService.js';
import { isProd } from '../../config/env.js';

/**
 * 支持 Web 授权关联的提供商
 *
 * 排除项说明：
 * - apple：回调由 Apple 服务器 form_post 直连 API，跨站请求带不上登录态 cookie，
 *   需要额外的签名 cookie + 服务端重定向，单独一期实现。已关联的 Apple 仍可解绑。
 * - wechat_miniprogram：无 Web 授权 URL（getAuthorizationUrl 直接 throw）。
 */
export const LINKABLE_PROVIDERS = ['github', 'google', 'wechat_open', 'wechat_mp'];

const LINK_STATE_COOKIE = 'oauth_link_state';

const LINK_STATE_COOKIE_OPTIONS = {
  path: '/',
  httpOnly: true,
  secure: isProd,
  maxAge: 600,
  sameSite: 'lax',
};

/**
 * 将业务错误映射为 HTTP 响应，其余错误按 400 兜底并记录日志
 */
function sendLinkError(fastify, reply, error, context) {
  if (error instanceof OAuthLinkError) {
    return reply
      .code(error.statusCode)
      .send({ error: error.message, code: error.code });
  }
  fastify.log.error(error, context);
  return reply.code(400).send({ error: error.message || '操作失败' });
}

/**
 * 写审计日志：失败只记警告，不影响已完成的主流程
 *
 * 关联/解绑都是先落库再记日志，若让日志异常冒泡到 catch，
 * 用户会看到「失败」但数据其实已经改了。
 */
async function writeOplog(fastify, payload) {
  try {
    await fastify.oplog.add(payload);
  } catch (error) {
    fastify.log.warn(error, `[OAuth] 写操作日志失败: ${payload.action}`);
  }
}

export default async function oauthLinkRoutes(fastify, options) {
  /**
   * 发起关联：返回授权链接
   */
  fastify.get(
    '/:provider/link/connect',
    {
      preHandler: [fastify.authenticate],
      schema: {
        tags: ['auth'],
        description: '获取三方账号关联授权链接（需登录）',
        security: [{ bearerAuth: [] }],
        params: {
          type: 'object',
          required: ['provider'],
          properties: {
            provider: { type: 'string' },
          },
        },
        response: {
          200: {
            type: 'object',
            properties: {
              authorizationUri: { type: 'string' },
            },
          },
        },
      },
    },
    async (request, reply) => {
      const { provider: providerName } = request.params;
      const userId = request.user.id;

      if (!LINKABLE_PROVIDERS.includes(providerName)) {
        return reply.code(400).send({ error: '该平台暂不支持关联' });
      }

      try {
        const providerConfig = await fastify.oauth.getProviderConfig(providerName);
        if (!providerConfig || !providerConfig.isEnabled) {
          return reply.code(400).send({ error: '该平台未启用' });
        }

        const provider = await fastify.oauth.getProvider(providerName);
        const validation = provider.validateConfig(providerConfig);
        if (!validation.valid) {
          return reply
            .code(400)
            .send({ error: `该平台配置不完整: ${validation.message}` });
        }

        // 提前拦截：已关联同平台时不必跳一圈授权再失败
        const [existing] = await db
          .select({ id: accounts.id })
          .from(accounts)
          .where(
            and(eq(accounts.userId, userId), eq(accounts.provider, providerName))
          )
          .limit(1);

        if (existing) {
          return reply.code(409).send({
            error: '已关联该平台账号，请先解绑后再关联新账号',
            code: 'PROVIDER_ALREADY_LINKED',
          });
        }

        const state = generateLinkState();
        const authorizationUri = await provider.getAuthorizationUrl(
          providerConfig,
          state
        );

        reply.setCookie(LINK_STATE_COOKIE, state, LINK_STATE_COOKIE_OPTIONS);

        return { authorizationUri };
      } catch (error) {
        return sendLinkError(fastify, reply, error, '[OAuth] 发起账号关联失败');
      }
    }
  );

  /**
   * 关联回调：用 code 换取三方身份并写入 accounts
   */
  fastify.post(
    '/:provider/link/callback',
    {
      preHandler: [fastify.authenticate],
      schema: {
        tags: ['auth'],
        description: '三方账号关联回调（需登录）',
        security: [{ bearerAuth: [] }],
        params: {
          type: 'object',
          required: ['provider'],
          properties: {
            provider: { type: 'string' },
          },
        },
        body: {
          type: 'object',
          required: ['code'],
          properties: {
            code: { type: 'string' },
            state: { type: 'string' },
          },
        },
        response: {
          200: {
            type: 'object',
            properties: {
              message: { type: 'string' },
              account: {
                type: 'object',
                properties: {
                  id: { type: 'number' },
                  provider: { type: 'string' },
                  createdAt: { type: 'string' },
                },
              },
            },
          },
        },
      },
    },
    async (request, reply) => {
      const { provider: providerName } = request.params;
      const { code, state } = request.body;
      const userId = request.user.id;

      if (!LINKABLE_PROVIDERS.includes(providerName)) {
        return reply.code(400).send({ error: '该平台暂不支持关联' });
      }

      // state 必须来自本次关联流程：既要与 cookie 一致，也要带关联流程前缀，
      // 防止把登录流程的 state 拿来走关联通道
      const savedState = request.cookies[LINK_STATE_COOKIE];
      if (!state || !savedState || state !== savedState || !isLinkState(state)) {
        return reply
          .code(400)
          .send({ error: '关联请求已失效，请重新发起关联' });
      }
      reply.clearCookie(LINK_STATE_COOKIE, { path: '/' });

      try {
        const providerConfig = await fastify.oauth.getProviderConfig(providerName);
        if (!providerConfig || !providerConfig.isEnabled) {
          return reply.code(400).send({ error: '该平台未启用' });
        }

        const provider = await fastify.oauth.getProvider(providerName);
        const { providerAccountId, tokenData } = await provider.handleCallback(
          providerConfig,
          code
        );

        const { account, alreadyLinked } = await linkOAuthAccountForUser({
          userId,
          provider: providerName,
          providerAccountId,
          tokenData,
        });

        if (!alreadyLinked) {
          // 关联已经落库，审计日志失败不能反过来把成功报成失败
          await writeOplog(fastify, {
            action: 'oauth_link',
            targetType: 'user',
            targetId: userId,
            moderatorId: userId,
            newStatus: providerName,
            metadata: { provider: providerName },
            ip: request.ip,
            targetLabel: request.user.username,
          });

          fastify.log.info(
            `[OAuth] 用户 ${userId} 关联了 ${providerName} 账号`
          );
        }

        return {
          message: alreadyLinked ? '该账号已关联' : '关联成功',
          account: {
            id: account.id,
            provider: account.provider,
            createdAt: account.createdAt,
          },
        };
      } catch (error) {
        return sendLinkError(fastify, reply, error, '[OAuth] 账号关联失败');
      }
    }
  );

  /**
   * 解除关联
   *
   * 用 POST 而非 DELETE：apiClient.delete 会把参数拼进 query string，
   * 密码不能出现在 URL 里（会进访问日志）。
   */
  fastify.post(
    '/unlink/:provider',
    {
      preHandler: [fastify.authenticate],
      schema: {
        tags: ['auth'],
        description: '解除三方账号关联',
        security: [{ bearerAuth: [] }],
        params: {
          type: 'object',
          required: ['provider'],
          properties: {
            provider: { type: 'string' },
          },
        },
        body: {
          type: 'object',
          properties: {
            password: { type: 'string' },
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
      const { provider: providerName } = request.params;
      const { password } = request.body || {};
      const userId = request.user.id;

      try {
        const [user] = await db
          .select({
            username: users.username,
            passwordHash: users.passwordHash,
          })
          .from(users)
          .where(eq(users.id, userId))
          .limit(1);

        if (!user) {
          return reply.code(404).send({ error: '用户不存在' });
        }

        // 无密码用户（纯三方注册）自动跳过验证，否则无从解绑
        const requiresPassword = await fastify.settings.get(
          'oauth_unlink_requires_password',
          true
        );

        if (requiresPassword && user.passwordHash) {
          if (!password) {
            return reply.code(400).send({ error: '请提供当前密码' });
          }
          const isValidPassword = await fastify.verifyPassword(
            password,
            user.passwordHash
          );
          if (!isValidPassword) {
            return reply.code(400).send({ error: '当前密码不正确' });
          }
        }

        await unlinkOAuthAccount(userId, providerName);

        // 关联记录已删除，审计日志失败不能反过来把成功报成失败
        await writeOplog(fastify, {
          action: 'oauth_unlink',
          targetType: 'user',
          targetId: userId,
          moderatorId: userId,
          previousStatus: providerName,
          metadata: { provider: providerName },
          ip: request.ip,
          targetLabel: user.username,
        });

        fastify.log.info(`[OAuth] 用户 ${userId} 解绑了 ${providerName} 账号`);

        // 平台展示名由前端渲染，此处不回传 provider slug
        return { message: '已解除关联' };
      } catch (error) {
        return sendLinkError(fastify, reply, error, '[OAuth] 账号解绑失败');
      }
    }
  );
}
