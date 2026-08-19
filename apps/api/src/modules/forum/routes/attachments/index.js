import {
  ATTACHMENT_POLICIES,
  MAX_FILES_PER_ATTACHMENT,
  createAttachment,
  updateDraft,
  deleteAttachment,
  deleteUnboundAttachmentFile,
  listDrafts,
  listByTopic,
  getAttachmentCategoryId,
  getAttachmentForView,
  getAttachmentFileForDownload,
  resolveDownloadAccess,
  purchaseAttachment,
  incrementDownloadCount,
} from '../../services/attachmentService.js';
import db from '#core/db/index.js';
import { topics } from '#modules/forum/db/schema.js';
import { eq } from 'drizzle-orm';

// 附件表单字段（创建与编辑共用）
const attachmentBodyProperties = {
  title: { type: ['string', 'null'], maxLength: 255 },
  description: { type: ['string', 'null'], maxLength: 2000 },
  policy: { type: 'string', enum: ATTACHMENT_POLICIES, default: 'none' },
  pointsCost: { type: 'integer', minimum: 0, default: 0 },
  allowedRoleIds: {
    type: ['array', 'null'],
    items: { type: 'integer' },
    maxItems: 50,
  },
};

/**
 * 把 service 抛出的带 statusCode 的错误转成响应；其余继续上抛给全局错误处理
 */
function sendServiceError(reply, err) {
  if (err.statusCode) {
    return reply.code(err.statusCode).send({ error: err.message });
  }
  throw err;
}

export default async function attachmentRoutes(fastify, options) {
  // POST /attachments — 把已上传的文件登记为附件草稿
  fastify.post(
    '/',
    {
      preHandler: [fastify.authenticate],
      schema: {
        tags: ['attachments'],
        description: '把一批已上传的文件（category=attachments）登记为一个附件组草稿，由后续话题提交时绑定',
        security: [{ bearerAuth: [] }],
        body: {
          type: 'object',
          required: ['fileIds', 'policy'],
          properties: {
            fileIds: {
              type: 'array',
              items: { type: 'integer' },
              minItems: 1,
              maxItems: MAX_FILES_PER_ATTACHMENT,
            },
            ...attachmentBodyProperties,
          },
        },
        response: {
          200: {
            type: 'object',
            properties: { id: { type: 'number' } },
          },
        },
      },
    },
    async (request, reply) => {
      try {
        // 用 can 而非 check：上传本体时 check 已计过一次频率限制，
        // 登记步骤再 check 会让同一个附件消耗两次配额
        const allowed = await fastify.permission.can(request, 'upload.attachments');
        if (!allowed) {
          return reply.code(403).send({ error: '没有上传附件的权限' });
        }
        return await createAttachment(request.body, request.user.id);
      } catch (err) {
        return sendServiceError(reply, err);
      }
    }
  );

  // GET /attachments/drafts — 列出当前用户的草稿
  fastify.get(
    '/drafts',
    {
      preHandler: [fastify.authenticate],
      schema: {
        tags: ['attachments'],
        description: '列出当前用户的附件草稿（未绑话题）',
        security: [{ bearerAuth: [] }],
        querystring: {
          type: 'object',
          properties: {
            page: { type: 'number', default: 1 },
            limit: { type: 'number', default: 20, maximum: 100 },
          },
        },
      },
    },
    async (request) => {
      return listDrafts(request.user.id, {
        page: request.query.page,
        limit: request.query.limit,
      });
    }
  );

  // GET /attachments/topic/:topicId — 列出某话题已绑附件
  //
  // 只服务于编辑器的「本话题已有」，故与 polls 的 /by-topic 同规则：仅作者或该分类版主。
  // 返回的是附件全量元信息（含下载策略与积分价），对普通读者开放没有意义且会泄漏。
  fastify.get(
    '/topic/:topicId',
    {
      preHandler: [fastify.authenticate],
      schema: {
        tags: ['attachments'],
        description: '列出某话题已绑定的附件（仅作者或 dashboard.topics，用于编辑器「本话题已有」）',
        security: [{ bearerAuth: [] }],
        params: {
          type: 'object',
          required: ['topicId'],
          properties: { topicId: { type: 'number' } },
        },
      },
    },
    async (request, reply) => {
      const [topic] = await db
        .select({ id: topics.id, userId: topics.userId, categoryId: topics.categoryId })
        .from(topics)
        .where(eq(topics.id, request.params.topicId))
        .limit(1);

      if (!topic) {
        return reply.code(404).send({ error: '话题不存在' });
      }

      const isOwner = request.user.id === topic.userId;
      const hasDashboard = await fastify.permission.can(request, 'dashboard.topics', {
        categoryId: topic.categoryId,
      });
      if (!isOwner && !hasDashboard) {
        return reply.code(403).send({ error: '没有权限查看此话题的附件列表' });
      }

      return listByTopic(request.params.topicId);
    }
  );

  // GET /attachments/:id — 附件详情（不含真实存储 URL）
  fastify.get(
    '/:id',
    {
      preHandler: [fastify.optionalAuth],
      schema: {
        tags: ['attachments'],
        description: '获取附件详情与当前用户的下载资格',
        params: {
          type: 'object',
          required: ['id'],
          properties: { id: { type: 'number' } },
        },
      },
    },
    async (request, reply) => {
      const result = await getAttachmentForView(
        request.params.id,
        request.user || null,
        fastify.permission
      );
      if (!result) {
        return reply.code(404).send({ error: '附件不存在' });
      }
      return result;
    }
  );

  // PUT /attachments/:id — 编辑草稿
  fastify.put(
    '/:id',
    {
      preHandler: [fastify.authenticate],
      schema: {
        tags: ['attachments'],
        description: '编辑附件草稿（仅未绑话题的）',
        security: [{ bearerAuth: [] }],
        params: {
          type: 'object',
          required: ['id'],
          properties: { id: { type: 'number' } },
        },
        body: {
          type: 'object',
          required: ['policy'],
          properties: attachmentBodyProperties,
        },
      },
    },
    async (request, reply) => {
      try {
        return await updateDraft(request.params.id, request.body, request.user.id);
      } catch (err) {
        return sendServiceError(reply, err);
      }
    }
  );

  // DELETE /attachments/files/:fileId — 移除尚未登记成附件的上传文件
  //
  // 上传与登记分两步，中间用户可能反悔（移除某个文件、或直接关掉弹窗）。
  // 没有这个入口，那些文件会一直躺在存储里且无人可达——/api/files/:id 需要
  // dashboard.files，普通用户用不了。静态路径 /files 排在 /:id 之前，不会冲突。
  fastify.delete(
    '/files/:fileId',
    {
      preHandler: [fastify.authenticate],
      schema: {
        tags: ['attachments'],
        description: '删除本人上传但尚未登记进任何附件组的文件',
        security: [{ bearerAuth: [] }],
        params: {
          type: 'object',
          required: ['fileId'],
          properties: { fileId: { type: 'number' } },
        },
      },
    },
    async (request, reply) => {
      try {
        await deleteUnboundAttachmentFile(
          request.params.fileId,
          request.user.id,
          fastify.storage
        );
        return { success: true };
      } catch (err) {
        return sendServiceError(reply, err);
      }
    }
  );

  // DELETE /attachments/:id — 删除附件（含存储对象）
  fastify.delete(
    '/:id',
    {
      preHandler: [fastify.authenticate],
      schema: {
        tags: ['attachments'],
        description: '删除附件；已绑话题的需先从正文移除引用（管理员除外）',
        security: [{ bearerAuth: [] }],
        params: {
          type: 'object',
          required: ['id'],
          properties: { id: { type: 'number' } },
        },
      },
    },
    async (request, reply) => {
      try {
        // dashboard.topics 带分类作用域条件，不传 categoryId 会让分类限定整个失效，
        // 只管某个分类的版主就能删掉全站附件；草稿没有分类，管理豁免只给真管理员
        const categoryId = await getAttachmentCategoryId(request.params.id);
        const isAdmin =
          categoryId == null
            ? request.user.isAdmin === true
            : await fastify.permission.can(request, 'dashboard.topics', { categoryId });
        await deleteAttachment(request.params.id, request.user.id, {
          isAdmin,
          storage: fastify.storage,
        });
        return { success: true };
      } catch (err) {
        return sendServiceError(reply, err);
      }
    }
  );

  // POST /attachments/:id/purchase — 积分购买
  fastify.post(
    '/:id/purchase',
    {
      preHandler: [fastify.authenticate],
      schema: {
        tags: ['attachments'],
        description: '用积分购买附件下载权（转账给话题作者，一次购买永久有效）',
        security: [{ bearerAuth: [] }],
        params: {
          type: 'object',
          required: ['id'],
          properties: { id: { type: 'number' } },
        },
      },
    },
    async (request, reply) => {
      try {
        return await purchaseAttachment(request.params.id, request.user, {
          ledger: fastify.ledger,
          permission: fastify.permission,
          logger: fastify.log,
        });
      } catch (err) {
        return sendServiceError(reply, err);
      }
    }
  );

  // GET /attachments/:id/files/:fileId/download — 鉴权后出内容
  //
  // 权限判定在附件组级别，组内文件共用同一结论；下载计数按文件记。
  // 浏览器侧可直接用 <a href> 触发原生下载：本站认证走 httpOnly Cookie，
  // 且 /api 由 Next 同源代理，无需 JS 取流。
  fastify.get(
    '/:id/files/:fileId/download',
    {
      preHandler: [fastify.optionalAuth],
      schema: {
        tags: ['attachments'],
        description: '下载附件组内的某个文件（按附件的下载策略鉴权）',
        params: {
          type: 'object',
          required: ['id', 'fileId'],
          properties: {
            id: { type: 'number' },
            fileId: { type: 'number' },
          },
        },
      },
    },
    async (request, reply) => {
      const found = await getAttachmentFileForDownload(
        request.params.id,
        request.params.fileId
      );
      if (!found) {
        return reply.code(404).send({ error: '附件不存在' });
      }
      const { group, file } = found;

      const access = await resolveDownloadAccess({
        attachment: group,
        user: request.user || null,
        permission: fastify.permission,
      });
      if (!access.allowed) {
        return reply.code(access.statusCode || 403).send({
          error: access.error,
          ...(access.needPurchase
            ? { needPurchase: true, pointsCost: group.pointsCost }
            : {}),
        });
      }

      const key = `${file.category}/${file.filename}`;
      const downloadName = file.originalName || file.filename;
      // provider 是可空列（schema 只给了 default('local')，没有 notNull）。不兜底的话
      // storage 会回退到「当前激活的 provider」，站点切到 S3 后，历史的 NULL 行就会
      // 被拿去 S3 桶里找，必然 404。与 routes/files 的处理保持一致。
      const provider = file.provider || 'local';

      // 只有无访问限制的附件才走 302 预签名直连。
      // 预签名 URL 里带着对象 key，而站点若用 S3/R2 托管图片，桶通常是 public-read——
      // 去掉查询串就得到一条永久有效的公开直链。对 login/reply/points/role 这些受限附件，
      // 那等于把下载策略永久绕过（尤其积分附件：付一次费即可无限转发）。
      // 受限附件一律由 API 转发，对象 key 不出服务端。
      if (group.policy === 'none') {
        try {
          const signed = await fastify.storage.getSignedDownloadUrl(key, provider, {
            expiresIn: 300,
            filename: downloadName,
          });
          if (signed?.supported && signed.url) {
            await incrementDownloadCount(file.itemId);
            return reply.redirect(signed.url, 302);
          }
        } catch (err) {
          fastify.log.warn({ err }, '附件预签名下载失败，回退到服务端转发');
        }
      }

      // 本地存储等无私有读能力的 provider：由 API 流式转发
      // 计数放在确认能取到内容之后，避免文件已丢失时仍然计数
      let stored;
      try {
        stored = await fastify.storage.getDownloadStream(key, provider);
      } catch (err) {
        fastify.log.error({ err }, '附件读取失败');
        return reply.code(404).send({ error: '附件文件不存在' });
      }

      await incrementDownloadCount(file.itemId);

      reply
        // 一律以二进制附件下发：即便上传时混入了 html/svg，浏览器也不会在同源下渲染执行
        .header('Content-Type', 'application/octet-stream')
        .header(
          'Content-Disposition',
          `attachment; filename*=UTF-8''${encodeURIComponent(downloadName)}`
        )
        .header('X-Content-Type-Options', 'nosniff')
        .header('Cache-Control', 'private, no-store');

      if (stored.size) {
        reply.header('Content-Length', stored.size);
      }

      return reply.send(stored.stream);
    }
  );
}
