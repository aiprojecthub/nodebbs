import db from '../../db/index.js';
import { oplogs, posts, topics, users } from '../../db/schema.js';
import { eq, desc, and, like, count, sql } from 'drizzle-orm';
import { alias } from 'drizzle-orm/pg-core';

export default async function oplogsRoutes(fastify, options) {
  // 获取操作日志列表（管理员/版主）
  fastify.get('/', {
    preHandler: [fastify.requirePermission('dashboard.moderation')],
    schema: {
      tags: ['oplogs'],
      description: '获取操作日志列表',
      security: [{ bearerAuth: [] }],
      querystring: {
        type: 'object',
        properties: {
          targetType: { type: 'string', enum: ['topic', 'post', 'user', 'report', 'all'] },
          action: { type: 'string', enum: ['approve', 'reject', 'ban', 'unban', 'username_change', 'email_bind', 'phone_bind', 'email_change', 'phone_change', 'request_deletion', 'restore', 'anonymize', 'edit_resubmit', 'resubmit', 'report_resolve', 'report_dismiss', 'oauth_link', 'oauth_unlink', 'all'] },
          targetId: { type: 'number' },
          moderatorId: { type: 'number' },
          page: { type: 'number', default: 1 },
          limit: { type: 'number', default: 20, maximum: 100 },
          search: { type: 'string' }
        }
      }
    }
  }, async (request, reply) => {
    const {
      targetType = 'all',
      action = 'all',
      targetId,
      moderatorId,
      page = 1,
      limit = 20,
      search
    } = request.query;
    const offset = (page - 1) * limit;

    const conditions = [];
    if (targetType !== 'all') {
      conditions.push(eq(oplogs.targetType, targetType));
    }
    if (action !== 'all') {
      conditions.push(eq(oplogs.action, action));
    }
    if (targetId) {
      conditions.push(eq(oplogs.targetId, targetId));
    }
    if (moderatorId) {
      conditions.push(eq(oplogs.moderatorId, moderatorId));
    }
    if (search && search.trim()) {
      conditions.push(like(users.username, `%${search.trim()}%`));
    }

    const targetUsers = alias(users, 'targetUsers');
    const topicAuthors = alias(users, 'topicAuthors');
    const postAuthors = alias(users, 'postAuthors');
    const postTopics = alias(topics, 'postTopics');

    let query = db
      .select({
        id: oplogs.id,
        action: oplogs.action,
        targetType: oplogs.targetType,
        targetId: oplogs.targetId,
        reason: oplogs.reason,
        previousStatus: oplogs.previousStatus,
        newStatus: oplogs.newStatus,
        targetLabel: oplogs.targetLabel,
        metadata: oplogs.metadata,
        createdAt: oplogs.createdAt,
        moderatorUsername: users.username,
        moderatorName: users.name,
        moderatorRole: users.role,
        topicTitle: topics.title,
        topicSlug: topics.slug,
        topicAuthor: topicAuthors.username,
        postContent: sql`LEFT(${posts.content}, 100)`,
        postAuthor: postAuthors.username,
        postTopicId: posts.topicId,
        postTopicTitle: postTopics.title,
        targetUserUsername: targetUsers.username,
        targetUserName: targetUsers.name,
        targetUserRole: targetUsers.role
      })
      .from(oplogs)
      .innerJoin(users, eq(oplogs.moderatorId, users.id))
      .leftJoin(topics, and(eq(oplogs.targetId, topics.id), eq(oplogs.targetType, 'topic')))
      .leftJoin(topicAuthors, eq(topics.userId, topicAuthors.id))
      .leftJoin(posts, and(eq(oplogs.targetId, posts.id), eq(oplogs.targetType, 'post')))
      .leftJoin(postAuthors, eq(posts.userId, postAuthors.id))
      .leftJoin(postTopics, eq(posts.topicId, postTopics.id))
      .leftJoin(targetUsers, and(eq(oplogs.targetId, targetUsers.id), eq(oplogs.targetType, 'user')));

    if (conditions.length > 0) {
      query = query.where(and(...conditions));
    }

    const logsList = await query
      .orderBy(desc(oplogs.createdAt))
      .limit(limit)
      .offset(offset);

    const enrichedLogs = logsList.map(log => {
      let targetInfo = null;

      if (log.targetType === 'topic' && (log.targetLabel || log.topicTitle)) {
        targetInfo = {
          title: log.targetLabel || log.topicTitle,
          slug: log.topicSlug,
          authorUsername: log.topicAuthor
        };
      } else if (log.targetType === 'post' && (log.targetLabel || log.postContent)) {
        targetInfo = {
          content: log.targetLabel || log.postContent,
          authorUsername: log.postAuthor,
          topicId: log.postTopicId,
          topicTitle: log.postTopicTitle
        };
      } else if (log.targetType === 'user' && log.targetUserUsername) {
        targetInfo = {
          username: log.targetUserUsername,
          name: log.targetUserName,
          role: log.targetUserRole,
          label: log.targetLabel || null
        };
      }

      const {
        targetLabel,
        topicTitle, topicSlug, topicAuthor,
        postContent, postAuthor, postTopicId, postTopicTitle,
        targetUserUsername, targetUserName, targetUserRole,
        ...cleanLog
      } = log;

      return {
        ...cleanLog,
        targetInfo
      };
    });

    let countQuery = db
      .select({ count: count() })
      .from(oplogs)
      .innerJoin(users, eq(oplogs.moderatorId, users.id));

    if (conditions.length > 0) {
      countQuery = countQuery.where(and(...conditions));
    }

    const [{ count: total }] = await countQuery;

    return {
      items: enrichedLogs,
      page,
      limit,
      total,
    };
  });

  // 根据目标ID获取操作日志（查看特定内容的操作历史）
  fastify.get('/:targetType/:targetId', {
    preHandler: [fastify.requirePermission('dashboard.moderation')],
    schema: {
      tags: ['oplogs'],
      description: '获取特定内容的操作日志',
      security: [{ bearerAuth: [] }],
      params: {
        type: 'object',
        required: ['targetType', 'targetId'],
        properties: {
          targetType: { type: 'string', enum: ['topic', 'post', 'user'] },
          targetId: { type: 'number' }
        }
      }
    }
  }, async (request, reply) => {
    const { targetType, targetId } = request.params;

    const logs = await db
      .select({
        id: oplogs.id,
        action: oplogs.action,
        reason: oplogs.reason,
        previousStatus: oplogs.previousStatus,
        newStatus: oplogs.newStatus,
        metadata: oplogs.metadata,
        createdAt: oplogs.createdAt,
        moderatorUsername: users.username,
        moderatorName: users.name,
        moderatorRole: users.role
      })
      .from(oplogs)
      .innerJoin(users, eq(oplogs.moderatorId, users.id))
      .where(
        and(
          eq(oplogs.targetType, targetType),
          eq(oplogs.targetId, targetId)
        )
      )
      .orderBy(desc(oplogs.createdAt));

    return { items: logs };
  });
}
