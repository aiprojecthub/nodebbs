import db from '../../db/index.js';
import {
  topics,
  posts,
  categories,
  users,
  bookmarks,
  topicTags,
  tags,
  subscriptions,
  likes,
  notifications,
  moderationLogs,
} from '../../db/schema.js';
import { eq, sql, desc, and, or, like, inArray } from 'drizzle-orm';
import slugify from 'slug';
import { getSetting } from '../../utils/settings.js';

// 辅助函数：获取分类及其所有子孙分类的 ID
async function getCategoryWithDescendants(categoryId) {
  const categoryIds = [categoryId];
  
  // 获取所有子分类
  const subcategories = await db
    .select({ id: categories.id })
    .from(categories)
    .where(eq(categories.parentId, categoryId));
  
  // 递归获取子分类的子分类
  for (const sub of subcategories) {
    const descendants = await getCategoryWithDescendants(sub.id);
    categoryIds.push(...descendants);
  }
  
  return categoryIds;
}

export default async function topicRoutes(fastify, options) {
  // List topics
  fastify.get(
    '/',
    {
      preHandler: [fastify.optionalAuth],
      schema: {
        tags: ['topics'],
        description: '分页和过滤获取话题列表',
        querystring: {
          type: 'object',
          properties: {
            page: { type: 'number', default: 1 },
            limit: { type: 'number', default: 20, maximum: 100 },
            categoryId: { type: 'number' },
            userId: { type: 'number' },
            tag: { type: 'string' },
            search: { type: 'string' },
            isPinned: { type: 'boolean' },
            isClosed: { type: 'boolean' },
            isDeleted: { type: 'boolean' },
            includeDeleted: { type: 'boolean', default: false },
            approvalStatus: {
              type: 'string',
              enum: ['pending', 'approved', 'rejected'],
            },
            sort: {
              type: 'string',
              enum: ['latest', 'popular', 'trending'],
              default: 'latest',
            },
          },
        },
      },
    },
    async (request, reply) => {
      const {
        page = 1,
        limit = 20,
        categoryId,
        userId,
        tag,
        search,
        isPinned,
        isClosed,
        isDeleted,
        includeDeleted = false,
        approvalStatus,
        sort = 'latest',
      } = request.query;
      const offset = (page - 1) * limit;

      // 构建基础查询条件
      const conditions = [];

      // 添加搜索条件
      if (search && search.trim()) {
        conditions.push(like(topics.title, `%${search.trim()}%`));
      }

      // 管理员可以查看已删除的话题
      const isAdmin = request.user && request.user.role === 'admin';
      if (isDeleted !== undefined) {
        // 明确指定查询已删除或未删除的话题
        conditions.push(eq(topics.isDeleted, isDeleted));
      } else if (!includeDeleted || !isAdmin) {
        // 默认不显示已删除的话题，除非是管理员且明确要求包含
        conditions.push(eq(topics.isDeleted, false));
      }

      // 如果不是版主/管理员，只显示已批准的内容
      // 如果是查看自己的话题，显示所有状态
      const isModerator =
        request.user && ['moderator', 'admin'].includes(request.user.role);
      const isOwnTopics = userId && request.user && userId === request.user.id;

      if (!isModerator && !isOwnTopics) {
        conditions.push(eq(topics.approvalStatus, 'approved'));
      }

      // 添加筛选条件 - 包含子孙分类
      if (categoryId) {
        const categoryIds = await getCategoryWithDescendants(categoryId);
        if (categoryIds.length === 1) {
          conditions.push(eq(topics.categoryId, categoryId));
        } else {
          conditions.push(inArray(topics.categoryId, categoryIds));
        }
      }
      if (userId) {
        conditions.push(eq(topics.userId, userId));
        
        // 检查用户的内容可见性设置
        const [targetUser] = await db
          .select({ contentVisibility: users.contentVisibility })
          .from(users)
          .where(eq(users.id, userId))
          .limit(1);
        
        if (targetUser) {
          const isViewingSelf = request.user && request.user.id === userId;
          
          // 如果不是查看自己的内容，需要检查权限
          if (!isViewingSelf) {
            if (targetUser.contentVisibility === 'private') {
              // 仅自己可见，返回空结果
              return { items: [], page, limit, total: 0 };
            } else if (targetUser.contentVisibility === 'authenticated' && !request.user) {
              // 需要登录才能查看，但用户未登录
              return { items: [], page, limit, total: 0 };
            }
          }
        }
      }
      if (isPinned !== undefined) {
        conditions.push(eq(topics.isPinned, isPinned));
      }
      if (isClosed !== undefined) {
        conditions.push(eq(topics.isClosed, isClosed));
      }
      if (approvalStatus) {
        conditions.push(eq(topics.approvalStatus, approvalStatus));
      }

      // 过滤私有分类（只有管理员和版主可以看到）
      if (!isModerator) {
        conditions.push(eq(categories.isPrivate, false));
      }

      let query = db
        .select({
          id: topics.id,
          title: topics.title,
          slug: topics.slug,
          categoryId: topics.categoryId,
          categoryName: categories.name,
          categorySlug: categories.slug,
          categoryColor: categories.color,
          userId: topics.userId,
          username: users.username,
          userAvatar: users.avatar,
          viewCount: topics.viewCount,
          // 注意：likeCount 已从 topics 表移除，如需显示请从第一条帖子获取
          postCount: topics.postCount,
          isPinned: topics.isPinned,
          isClosed: topics.isClosed,
          isDeleted: topics.isDeleted,
          approvalStatus: topics.approvalStatus,
          lastPostAt: topics.lastPostAt,
          createdAt: topics.createdAt,
          updatedAt: topics.updatedAt,
        })
        .from(topics)
        .innerJoin(categories, eq(topics.categoryId, categories.id))
        .innerJoin(users, eq(topics.userId, users.id))
        .where(and(...conditions));
      if (tag) {
        const [tagRecord] = await db
          .select()
          .from(tags)
          .where(eq(tags.slug, tag))
          .limit(1);
        if (tagRecord) {
          const topicIds = await db
            .select({ topicId: topicTags.topicId })
            .from(topicTags)
            .where(eq(topicTags.tagId, tagRecord.id));

          if (topicIds.length > 0) {
            query = query.where(
              inArray(
                topics.id,
                topicIds.map((t) => t.topicId)
              )
            );
          } else {
            return { topics: [], page, limit, total: 0 };
          }
        }
      }

      // Apply sorting
      if (sort === 'latest') {
        query = query.orderBy(desc(topics.isPinned), desc(topics.lastPostAt));
      } else if (sort === 'popular') {
        // 受欢迎排序：综合浏览量和回复数，不考虑时间衰减
        // 人气分数 = 浏览量 * 0.3 + 回复数 * 5
        // 回复数权重更高，因为回复代表更深度的互动
        query = query.orderBy(
          desc(topics.isPinned),
          desc(sql`(${topics.viewCount} * 0.3 + ${topics.postCount} * 5)`)
        );
      } else if (sort === 'trending') {
        // 热门排序：综合考虑浏览量、回复数和时间衰减
        // 热度分数 = (浏览量 * 0.1 + 回复数 * 2) / (天数 + 2)^1.5
        // 这样可以让新话题有更高的权重，同时考虑互动程度
        query = query.orderBy(
          desc(topics.isPinned),
          desc(sql`(
            (${topics.viewCount} * 0.1 + ${topics.postCount} * 2) / 
            POWER(EXTRACT(EPOCH FROM (NOW() - ${topics.createdAt})) / 86400 + 2, 1.5)
          )`)
        );
      }

      const results = await query.limit(limit).offset(offset);

      // 获取所有用户ID以检查封禁状态
      const userIds = [...new Set(results.map(r => r.userId))];
      const bannedUsers = userIds.length > 0 
        ? await db.select({ id: users.id }).from(users).where(and(inArray(users.id, userIds), eq(users.isBanned, true)))
        : [];
      const bannedUserIds = new Set(bannedUsers.map(u => u.id));

      // 根据用户权限过滤敏感字段
      const finalResults = results.map((topic) => {
        // 如果用户被封禁且访问者不是管理员/版主，隐藏头像
        if (bannedUserIds.has(topic.userId) && !isModerator) {
          topic.userAvatar = null;
        }

        // 管理员和版主可以看到所有字段
        if (isModerator) {
          return topic;
        }

        // 话题作者可以看到自己话题的审核状态，但不能看到 isDeleted
        if (request.user && topic.userId === request.user.id) {
          const { isDeleted, ...topicWithoutDeleted } = topic;
          return topicWithoutDeleted;
        }

        // 普通用户不能看到 isDeleted 和 approvalStatus
        const { isDeleted, approvalStatus, ...topicWithoutSensitive } = topic;
        return topicWithoutSensitive;
      });

      // Get total count with same filters
      const countConditions = [];

      // Apply same search filter
      if (search && search.trim()) {
        countConditions.push(like(topics.title, `%${search.trim()}%`));
      }

      // Apply same isDeleted filter
      if (isDeleted !== undefined) {
        countConditions.push(eq(topics.isDeleted, isDeleted));
      } else if (!includeDeleted || !isAdmin) {
        countConditions.push(eq(topics.isDeleted, false));
      }

      // Apply same permission filters for count
      if (!isModerator && !isOwnTopics) {
        countConditions.push(eq(topics.approvalStatus, 'approved'));
      }

      // Apply same filters for count
      if (categoryId) {
        countConditions.push(eq(topics.categoryId, categoryId));
      }
      if (userId) {
        countConditions.push(eq(topics.userId, userId));
      }
      if (isPinned !== undefined) {
        countConditions.push(eq(topics.isPinned, isPinned));
      }
      if (isClosed !== undefined) {
        countConditions.push(eq(topics.isClosed, isClosed));
      }
      if (approvalStatus) {
        countConditions.push(eq(topics.approvalStatus, approvalStatus));
      }

      let countQuery = db
        .select({ count: sql`count(*)` })
        .from(topics)
        .where(and(...countConditions));

      if (tag) {
        const [tagRecord] = await db
          .select()
          .from(tags)
          .where(eq(tags.slug, tag))
          .limit(1);
        if (tagRecord) {
          const topicIds = await db
            .select({ topicId: topicTags.topicId })
            .from(topicTags)
            .where(eq(topicTags.tagId, tagRecord.id));

          if (topicIds.length > 0) {
            countQuery = countQuery.where(
              inArray(
                topics.id,
                topicIds.map((t) => t.topicId)
              )
            );
          }
        }
      }

      const [{ count }] = await countQuery;

      return {
        items: finalResults,
        page,
        limit,
        total: Number(count),
      };
    }
  );

  // Get single topic
  fastify.get(
    '/:id',
    {
      preHandler: [fastify.optionalAuth],
      schema: {
        tags: ['topics'],
        description: '根据ID获取话题',
        params: {
          type: 'object',
          required: ['id'],
          properties: {
            id: { type: 'number' },
          },
        },
      },
    },
    async (request, reply) => {
      const { id } = request.params;

      const isModerator =
        request.user && ['moderator', 'admin'].includes(request.user.role);

      // 构建查询条件：管理员和版主可以查看已删除的话题
      const conditions = [eq(topics.id, id)];
      if (!isModerator) {
        conditions.push(eq(topics.isDeleted, false));
      }

      const [topic] = await db
        .select({
          id: topics.id,
          title: topics.title,
          slug: topics.slug,
          categoryId: topics.categoryId,
          categoryName: categories.name,
          categoryColor: categories.color,
          categorySlug: categories.slug,
          categoryIsPrivate: categories.isPrivate,
          userId: topics.userId,
          username: users.username,
          userName: users.name,
          userAvatar: users.avatar,
          viewCount: topics.viewCount,
          // 注意：likeCount 已从 topics 表移除，通过 firstPostLikeCount 获取
          postCount: topics.postCount,
          isPinned: topics.isPinned,
          isClosed: topics.isClosed,
          isDeleted: topics.isDeleted,
          approvalStatus: topics.approvalStatus,
          lastPostAt: topics.lastPostAt,
          createdAt: topics.createdAt,
          updatedAt: topics.updatedAt,
        })
        .from(topics)
        .innerJoin(categories, eq(topics.categoryId, categories.id))
        .innerJoin(users, eq(topics.userId, users.id))
        .where(and(...conditions))
        .limit(1);

      if (!topic) {
        return reply.code(404).send({ error: '话题不存在' });
      }

      const isAuthor = request.user && request.user.id === topic.userId;

      // 检查用户是否被封禁，如果是且访问者不是管理员/版主，隐藏头像
      const [topicUser] = await db.select({ isBanned: users.isBanned }).from(users).where(eq(users.id, topic.userId)).limit(1);
      if (topicUser && topicUser.isBanned && !isModerator) {
        topic.userAvatar = null;
      }

      // 检查私有分类访问权限
      if (topic.categoryIsPrivate && !isModerator) {
        return reply.code(404).send({ error: '话题不存在' });
      }

      // 检查访问权限：待审核或已拒绝的话题只有版主/管理员或作者本人可以访问
      if (topic.approvalStatus !== 'approved' && !isModerator && !isAuthor) {
        return reply.code(404).send({ error: '话题不存在' });
      }

      // 检查已删除话题的访问权限：只有管理员和版主可以查看
      if (topic.isDeleted && !isModerator) {
        return reply.code(404).send({ error: '话题不存在' });
      }

      // Increment view count (only for approved topics or when accessed by author/moderator)
      await db
        .update(topics)
        .set({ viewCount: sql`${topics.viewCount} + 1` })
        .where(eq(topics.id, id));

      // Get the first post (topic content)
      const [firstPost] = await db
        .select({
          id: posts.id,
          content: posts.content,
          editCount: posts.editCount,
          editedAt: posts.editedAt,
          likeCount: posts.likeCount,
        })
        .from(posts)
        .where(
          and(
            eq(posts.topicId, id),
            eq(posts.postNumber, 1),
            eq(posts.isDeleted, false)
          )
        )
        .limit(1);

      // Get the last post to get the max postNumber
      const [lastPost] = await db
        .select({
          postNumber: posts.postNumber,
        })
        .from(posts)
        .where(and(eq(posts.topicId, id), eq(posts.isDeleted, false)))
        .orderBy(desc(posts.postNumber))
        .limit(1);

      // Check if current user liked the first post
      let isFirstPostLiked = false;
      if (request.user && firstPost) {
        const [like] = await db
          .select()
          .from(likes)
          .where(
            and(
              eq(likes.userId, request.user.id),
              eq(likes.postId, firstPost.id)
            )
          )
          .limit(1);
        isFirstPostLiked = !!like;
      }

      // Get tags
      const topicTagsList = await db
        .select({
          id: tags.id,
          name: tags.name,
          slug: tags.slug,
          color: tags.color,
        })
        .from(topicTags)
        .innerJoin(tags, eq(topicTags.tagId, tags.id))
        .where(eq(topicTags.topicId, id));

      // Check if bookmarked by current user
      let isBookmarked = false;
      let isSubscribed = false;
      if (request.user) {
        const [bookmark] = await db
          .select()
          .from(bookmarks)
          .where(
            and(
              eq(bookmarks.userId, request.user.id),
              eq(bookmarks.topicId, id)
            )
          )
          .limit(1);
        isBookmarked = !!bookmark;

        const [subscription] = await db
          .select()
          .from(subscriptions)
          .where(
            and(
              eq(subscriptions.userId, request.user.id),
              eq(subscriptions.topicId, id)
            )
          )
          .limit(1);
        isSubscribed = !!subscription;
      }

      return {
        ...topic,
        content: firstPost?.content || '',
        firstPostId: firstPost?.id,
        firstPostLikeCount: firstPost?.likeCount || 0,
        isFirstPostLiked,
        editCount: firstPost?.editCount || 0,
        editedAt: firstPost?.editedAt,
        lastPostNumber: lastPost?.postNumber || 1,
        tags: topicTagsList,
        isBookmarked,
        isSubscribed,
        viewCount: topic.viewCount + 1, // Return incremented count
      };
    }
  );

  // Create topic
  fastify.post(
    '/',
    {
      preHandler: [fastify.authenticate, fastify.checkBanned, fastify.requireEmailVerification],
      schema: {
        tags: ['topics'],
        description: '创建新话题',
        security: [{ bearerAuth: [] }],
        body: {
          type: 'object',
          required: ['title', 'categoryId', 'content'],
          properties: {
            title: { type: 'string', minLength: 3, maxLength: 255 },
            categoryId: { type: 'number' },
            content: { type: 'string', minLength: 1 },
            tags: { type: 'array', items: { type: 'string' }, maxItems: 5 },
          },
        },
      },
    },
    async (request, reply) => {
      const { title, categoryId, content, tags: tagNames } = request.body;

      // Verify category exists
      const [category] = await db
        .select()
        .from(categories)
        .where(eq(categories.id, categoryId))
        .limit(1);
      if (!category) {
        return reply.code(404).send({ error: '分类不存在' });
      }

      // 检查私有分类权限
      const isModerator = ['moderator', 'admin'].includes(request.user.role);
      if (category.isPrivate && !isModerator) {
        return reply.code(403).send({
          error: '访问被拒绝',
          message: '你没有权限在该私有分类中发帖',
        });
      }

      // 检查是否开启内容审核
      const contentModerationEnabled = await getSetting(
        'content_moderation_enabled',
        false
      );
      const approvalStatus = contentModerationEnabled ? 'pending' : 'approved';

      // Generate slug
      const slug = slugify(title) + '-' + Date.now();

      // Create topic
      const [newTopic] = await db
        .insert(topics)
        .values({
          title,
          slug,
          categoryId,
          userId: request.user.id,
          postCount: 1,
          lastPostAt: new Date(),
          approvalStatus,
        })
        .returning();

      // Create first post
      const [firstPost] = await db
        .insert(posts)
        .values({
          topicId: newTopic.id,
          userId: request.user.id,
          content,
          rawContent: content,
          postNumber: 1,
          approvalStatus,
        })
        .returning();

      // Handle tags
      if (tagNames && tagNames.length > 0) {
        for (const tagName of tagNames) {
          const tagSlug = slugify(tagName);

          // Get or create tag
          let [tag] = await db
            .select()
            .from(tags)
            .where(eq(tags.slug, tagSlug))
            .limit(1);

          if (!tag) {
            [tag] = await db
              .insert(tags)
              .values({
                name: tagName,
                slug: tagSlug,
                topicCount: 1,
              })
              .returning();
          } else {
            await db
              .update(tags)
              .set({ topicCount: sql`${tags.topicCount} + 1` })
              .where(eq(tags.id, tag.id));
          }

          // Link tag to topic
          await db.insert(topicTags).values({
            topicId: newTopic.id,
            tagId: tag.id,
          });
        }
      }

      const message = contentModerationEnabled
        ? '您的话题已提交，等待审核后将公开显示'
        : '话题创建成功';

      return {
        topic: newTopic,
        firstPost,
        message,
        requiresApproval: contentModerationEnabled,
      };
    }
  );

  // Update topic
  fastify.patch(
    '/:id',
    {
      preHandler: [fastify.authenticate],
      schema: {
        tags: ['topics'],
        description: '更新话题（所有者、版主或管理员）',
        security: [{ bearerAuth: [] }],
        params: {
          type: 'object',
          required: ['id'],
          properties: {
            id: { type: 'number' },
          },
        },
        body: {
          type: 'object',
          properties: {
            title: { type: 'string', minLength: 3, maxLength: 255 },
            content: { type: 'string', minLength: 1 },
            categoryId: { type: 'number' },
            tags: { type: 'array', items: { type: 'string' }, maxItems: 5 },
            isPinned: { type: 'boolean' },
            isClosed: { type: 'boolean' },
          },
        },
      },
    },
    async (request, reply) => {
      const { id } = request.params;

      const [topic] = await db
        .select()
        .from(topics)
        .where(eq(topics.id, id))
        .limit(1);

      if (!topic) {
        return reply.code(404).send({ error: '话题不存在' });
      }

      // Check permissions
      const isModerator = ['moderator', 'admin'].includes(request.user.role);
      const isOwner = topic.userId === request.user.id;

      if (!isModerator && !isOwner) {
        return reply
          .code(403)
          .send({ error: '你没有权限编辑该话题' });
      }

      // Only moderators can pin/close
      if (
        (request.body.isPinned !== undefined ||
          request.body.isClosed !== undefined) &&
        !isModerator
      ) {
        return reply
          .code(403)
          .send({ error: '只有版主可以置顶或关闭话题' });
      }

      // 检查是否开启内容审核
      const contentModerationEnabled = await getSetting(
        'content_moderation_enabled',
        false
      );

      // Prepare topic updates (exclude content and tags as they need special handling)
      const { content, tags: tagNames, ...topicUpdates } = request.body;
      const updates = { ...topicUpdates, updatedAt: new Date() };

      // Update slug if title changed
      if (request.body.title) {
        updates.slug = slugify(request.body.title) + '-' + topic.id;
      }

      // 审核状态变更跟踪
      let statusChanged = false;
      let needsReapproval = false; // 区分是已批准内容的编辑还是被拒绝内容的重新提交
      const previousStatus = topic.approvalStatus;

      // 如果内容审核开启，且编辑者是普通用户（非版主/管理员）
      if (contentModerationEnabled && isOwner && !isModerator) {
        // 编辑标题或内容时，需要重新审核
        if (request.body.title || content !== undefined) {
          // 已批准的内容编辑后需要重新审核
          if (previousStatus === 'approved') {
            updates.approvalStatus = 'pending';
            statusChanged = true;
            needsReapproval = true;
          }
          // 被拒绝的内容编辑后重新提交审核
          else if (previousStatus === 'rejected') {
            updates.approvalStatus = 'pending';
            statusChanged = true;
            needsReapproval = false;
          }
        }
      }

      // Update topic
      const [updatedTopic] = await db
        .update(topics)
        .set(updates)
        .where(eq(topics.id, id))
        .returning();

      // If content is provided, update the first post (topic content)
      if (content !== undefined) {
        const [firstPost] = await db
          .select()
          .from(posts)
          .where(and(eq(posts.topicId, id), eq(posts.postNumber, 1)))
          .limit(1);

        if (firstPost) {
          const postUpdates = {
            content,
            rawContent: content,
            editedAt: new Date(),
            editCount: sql`${posts.editCount} + 1`,
            updatedAt: new Date(),
          };

          // 如果话题状态被重置，第一条回复也需要重置
          if (statusChanged) {
            postUpdates.approvalStatus = 'pending';
          }

          await db
            .update(posts)
            .set(postUpdates)
            .where(eq(posts.id, firstPost.id));
        }
      }

      // 记录审核日志
      if (statusChanged) {
        const action = needsReapproval ? 'edit_resubmit' : 'resubmit';
        const note = needsReapproval
          ? '已批准的话题编辑后重新提交审核'
          : '被拒绝的话题编辑后重新提交审核';

        await db.insert(moderationLogs).values({
          action,
          targetType: 'topic',
          targetId: id,
          moderatorId: request.user.id,
          previousStatus,
          newStatus: 'pending',
          metadata: JSON.stringify({ note }),
        });
      }

      // If tags are provided, update them
      if (tagNames !== undefined) {
        // Get current tags
        const currentTags = await db
          .select({ tagId: topicTags.tagId })
          .from(topicTags)
          .where(eq(topicTags.topicId, id));

        const currentTagIds = currentTags.map((t) => t.tagId);

        // Remove all current tag associations
        if (currentTagIds.length > 0) {
          await db.delete(topicTags).where(eq(topicTags.topicId, id));

          // Decrement topic count for removed tags
          for (const tagId of currentTagIds) {
            await db
              .update(tags)
              .set({ topicCount: sql`${tags.topicCount} - 1` })
              .where(eq(tags.id, tagId));
          }
        }

        // Add new tags
        if (tagNames.length > 0) {
          for (const tagName of tagNames) {
            const tagSlug = slugify(tagName);

            // Get or create tag
            let [tag] = await db
              .select()
              .from(tags)
              .where(eq(tags.slug, tagSlug))
              .limit(1);

            if (!tag) {
              [tag] = await db
                .insert(tags)
                .values({
                  name: tagName,
                  slug: tagSlug,
                  topicCount: 1,
                })
                .returning();
            } else {
              await db
                .update(tags)
                .set({ topicCount: sql`${tags.topicCount} + 1` })
                .where(eq(tags.id, tag.id));
            }

            // Link tag to topic
            await db.insert(topicTags).values({
              topicId: id,
              tagId: tag.id,
            });
          }
        }
      }

      // 生成返回消息
      let message = '话题更新成功';
      if (needsReapproval) {
        message = '话题已更新，正在等待审核后公开显示';
      } else if (statusChanged) {
        message = '话题已重新提交审核';
      }

      return {
        topic: updatedTopic,
        message,
        requiresApproval: needsReapproval || statusChanged,
      };
    }
  );

  // Delete topic
  fastify.delete(
    '/:id',
    {
      preHandler: [fastify.authenticate],
      schema: {
        tags: ['topics'],
        description:
          'Delete topic (soft delete by default, hard delete with permanent=true)',
        security: [{ bearerAuth: [] }],
        params: {
          type: 'object',
          required: ['id'],
          properties: {
            id: { type: 'number' },
          },
        },
        querystring: {
          type: 'object',
          properties: {
            permanent: { type: 'boolean', default: false },
          },
        },
      },
    },
    async (request, reply) => {
      const { id } = request.params;
      const { permanent = false } = request.query;

      const [topic] = await db
        .select()
        .from(topics)
        .where(eq(topics.id, id))
        .limit(1);

      if (!topic) {
        return reply.code(404).send({ error: '话题不存在' });
      }

      // Check permissions
      const isModerator = ['moderator', 'admin'].includes(request.user.role);
      const isOwner = topic.userId === request.user.id;

      if (!isModerator && !isOwner) {
        return reply
          .code(403)
          .send({ error: '你没有权限删除该话题' });
      }

      // Only moderators and admins can permanently delete
      if (permanent && !isModerator) {
        return reply
          .code(403)
          .send({
            error: '只有版主和管理员可以永久删除话题',
          });
      }

      if (permanent) {
        // Hard delete - permanently remove from database
        // First delete related data
        await db.delete(topicTags).where(eq(topicTags.topicId, id));
        await db.delete(bookmarks).where(eq(bookmarks.topicId, id));
        await db.delete(subscriptions).where(eq(subscriptions.topicId, id));
        await db.delete(posts).where(eq(posts.topicId, id));

        // Then delete the topic
        await db.delete(topics).where(eq(topics.id, id));

        return { message: '话题已永久删除' };
      } else {
        // Soft delete
        await db
          .update(topics)
          .set({ isDeleted: true, updatedAt: new Date() })
          .where(eq(topics.id, id));

        return { message: '话题删除成功' };
      }
    }
  );

  // Bookmark topic
  fastify.post(
    '/:id/bookmark',
    {
      preHandler: [fastify.authenticate],
      schema: {
        tags: ['topics'],
        description: '收藏话题',
        security: [{ bearerAuth: [] }],
        params: {
          type: 'object',
          required: ['id'],
          properties: {
            id: { type: 'number' },
          },
        },
      },
    },
    async (request, reply) => {
      const { id } = request.params;

      const [topic] = await db
        .select()
        .from(topics)
        .where(eq(topics.id, id))
        .limit(1);

      if (!topic) {
        return reply.code(404).send({ error: '话题不存在' });
      }

      // Check if already bookmarked
      const [existing] = await db
        .select()
        .from(bookmarks)
        .where(
          and(eq(bookmarks.userId, request.user.id), eq(bookmarks.topicId, id))
        )
        .limit(1);

      if (existing) {
        return reply.code(400).send({ error: '话题已收藏' });
      }

      await db.insert(bookmarks).values({
        userId: request.user.id,
        topicId: id,
      });

      return { message: '收藏成功' };
    }
  );

  // Remove bookmark
  fastify.delete(
    '/:id/bookmark',
    {
      preHandler: [fastify.authenticate],
      schema: {
        tags: ['topics'],
        description: '取消收藏话题',
        security: [{ bearerAuth: [] }],
        params: {
          type: 'object',
          required: ['id'],
          properties: {
            id: { type: 'number' },
          },
        },
      },
    },
    async (request, reply) => {
      const { id } = request.params;

      await db
        .delete(bookmarks)
        .where(
          and(eq(bookmarks.userId, request.user.id), eq(bookmarks.topicId, id))
        );

      return { message: '取消收藏成功' };
    }
  );

  // Subscribe to topic
  fastify.post(
    '/:id/subscribe',
    {
      preHandler: [fastify.authenticate],
      schema: {
        tags: ['topics'],
        description: '订阅话题通知',
        security: [{ bearerAuth: [] }],
        params: {
          type: 'object',
          required: ['id'],
          properties: {
            id: { type: 'number' },
          },
        },
      },
    },
    async (request, reply) => {
      const { id } = request.params;

      const [topic] = await db
        .select()
        .from(topics)
        .where(eq(topics.id, id))
        .limit(1);

      if (!topic) {
        return reply.code(404).send({ error: '话题不存在' });
      }

      // Check if already subscribed
      const [existing] = await db
        .select()
        .from(subscriptions)
        .where(
          and(
            eq(subscriptions.userId, request.user.id),
            eq(subscriptions.topicId, id)
          )
        )
        .limit(1);

      if (existing) {
        return reply
          .code(400)
          .send({ error: '已订阅该话题' });
      }

      await db.insert(subscriptions).values({
        userId: request.user.id,
        topicId: id,
      });

      return { message: '订阅成功' };
    }
  );

  // Unsubscribe from topic
  fastify.delete(
    '/:id/subscribe',
    {
      preHandler: [fastify.authenticate],
      schema: {
        tags: ['topics'],
        description: '取消订阅话题通知',
        security: [{ bearerAuth: [] }],
        params: {
          type: 'object',
          required: ['id'],
          properties: {
            id: { type: 'number' },
          },
        },
      },
    },
    async (request, reply) => {
      const { id } = request.params;

      await db
        .delete(subscriptions)
        .where(
          and(
            eq(subscriptions.userId, request.user.id),
            eq(subscriptions.topicId, id)
          )
        );

      return { message: '取消订阅成功' };
    }
  );
}
