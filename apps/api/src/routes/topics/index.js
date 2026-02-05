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
  blockedUsers,
  userItems,
  shopItems,
} from '../../db/schema.js';
import { eq, sql, desc, and, or, like, inArray, not, count } from 'drizzle-orm';
import slugify from 'slug';
import { userEnricher } from '../../services/userEnricher.js';
import { shouldHideUserInfo } from '../../utils/visibility.js';

/**
 * 计算用户对话题的操作权限
 * 权限检查逻辑：
 * 1. dashboard.topics 权限 → 版主/管理员，可操作所有
 * 2. 作者本人 → 可编辑/删除/关闭自己的话题
 *
 * @param {Object} params - 参数
 * @param {Object} params.permission - 权限服务实例
 * @param {Object} params.user - 当前用户
 * @param {Object} params.topic - 话题对象（需包含 userId, categoryId）
 * @returns {Promise<Object>} 权限对象
 */
async function getTopicPermissions({ permission, user, topic }) {
  // 未登录用户无任何操作权限
  if (!user) {
    return {
      canEdit: false,
      canDelete: false,
      canPin: false,
      canClose: false,
    };
  }

  const categoryContext = { categoryId: topic.categoryId };

  // 检查 dashboard.topics 权限（版主/管理员）
  const hasDashboard = await permission.hasPermission(
    user.id,
    'dashboard.topics',
    categoryContext
  );

  if (hasDashboard) {
    // 有后台管理权限，可以执行所有操作
    return {
      canEdit: true,
      canDelete: true,
      canPin: true,
      canClose: true,
    };
  }

  // 检查是否是作者
  const isOwner = user.id === topic.userId;

  if (!isOwner) {
    // 非作者、非版主，无任何操作权限
    return {
      canEdit: false,
      canDelete: false,
      canPin: false,
      canClose: false,
    };
  }

  // 作者：检查各项权限（可能有 timeRange 等条件限制）
  const [canEdit, canDelete, canClose] = await Promise.all([
    permission.hasPermission(user.id, 'topic.update', categoryContext),
    permission.hasPermission(user.id, 'topic.delete', categoryContext),
    permission.hasPermission(user.id, 'topic.close', categoryContext),
  ]);

  return {
    canEdit,
    canDelete,
    canPin: false,  // 作者不能置顶，需要 dashboard.topics 权限
    canClose,
  };
}

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
  // 获取话题列表
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
              enum: ['latest', 'popular', 'trending', 'newest'],
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

      // 如果用户已登录，排除被拉黑用户的内容（双向检查）
      if (request.user) {
        const blockedUsersList = await db
          .select({
            blockedUserId: blockedUsers.blockedUserId,
            userId: blockedUsers.userId
          })
          .from(blockedUsers)
          .where(
            or(
              eq(blockedUsers.userId, request.user.id),
              eq(blockedUsers.blockedUserId, request.user.id)
            )
          );

        if (blockedUsersList.length > 0) {
          // 收集所有需要排除的用户ID（被我拉黑的 + 拉黑我的）
          const excludeUserIds = new Set();
          blockedUsersList.forEach(block => {
            if (block.userId === request.user.id) {
              excludeUserIds.add(block.blockedUserId);
            } else {
              excludeUserIds.add(block.userId);
            }
          });

          if (excludeUserIds.size > 0) {
            conditions.push(
              not(inArray(topics.userId, [...excludeUserIds]))
            );
          }
        }
      }

      // 添加搜索条件
      if (search && search.trim()) {
        conditions.push(like(topics.title, `%${search.trim()}%`));
      }

      // 管理员可以查看已删除的话题
      const isAdmin = request.user?.isAdmin;
      if (isDeleted !== undefined) {
        // 明确指定查询已删除或未删除的话题
        conditions.push(eq(topics.isDeleted, isDeleted));
      } else if (!includeDeleted || !isAdmin) {
        // 默认不显示已删除的话题，除非是管理员且明确要求包含
        conditions.push(eq(topics.isDeleted, false));
      }

      // 如果不是版主/管理员，只显示已批准的内容
      // 如果是查看自己的话题，显示所有状态
      const isOwnTopics = userId && request.user && userId === request.user.id;

      if (!isAdmin && !isOwnTopics) {
        conditions.push(eq(topics.approvalStatus, 'approved'));
      }

      // 过滤已封禁用户的话题（非管理员）
      if (!isAdmin) {
        conditions.push(eq(users.isBanned, false));
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
      if (!isAdmin) {
        conditions.push(eq(categories.isPrivate, false));
      }

      // 获取用户允许访问的分类（基于 RBAC 权限）
      const allowedCategoryIds = await fastify.permission.getAllowedCategories(request);

      // 如果有分类限制
      if (allowedCategoryIds !== null) {
        if (allowedCategoryIds.length === 0) {
          // 无权访问任何分类
          return { items: [], page, limit, total: 0 };
        }
        conditions.push(inArray(topics.categoryId, allowedCategoryIds));
      }

      // 处理标签过滤：先获取 tagRecord，后面构建 query 时使用
      let tagRecord = null;
      if (tag) {
        [tagRecord] = await db
          .select({ id: tags.id })
          .from(tags)
          .where(eq(tags.slug, tag))
          .limit(1);

        if (!tagRecord) {
          // 标签不存在，返回空结果
          return { items: [], page, limit, total: 0 };
        }
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
          userName: users.name,
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
        .innerJoin(users, eq(topics.userId, users.id));

      // 如果有标签过滤，添加 join 和条件
      if (tagRecord) {
        query = query.innerJoin(topicTags, eq(topics.id, topicTags.topicId));
        conditions.push(eq(topicTags.tagId, tagRecord.id));
      }

      // 统一应用所有条件
      query = query.where(and(...conditions));

      // 应用排序
      if (sort === 'latest') {
        query = query.orderBy(desc(topics.isPinned), desc(topics.lastPostAt));
      } else if (sort === 'newest') {
        query = query.orderBy(desc(topics.isPinned), desc(topics.createdAt));
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
        if (bannedUserIds.has(topic.userId) && !isAdmin) {
          topic.userAvatar = null;
        }

        // 管理员和版主可以看到所有字段
        if (isAdmin) {
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

      // 批量获取用户增强数据（头像框、勋章等）
      if (finalResults.length > 0) {
        // 构建临时用户对象列表用于 enrichment
        // 注意：我们为每个 userId 创建新对象，enricher 会修改这些对象
        const usersToEnrich = finalResults.map(topic => ({
            id: topic.userId,
        }));

        await userEnricher.enrichMany(usersToEnrich, { request });

        // 将 enrich 后的数据同步回 results
        const enrichedUserMap = new Map(usersToEnrich.map(u => [u.id, u]));
        
        finalResults.forEach(topic => {
            const enrichedUser = enrichedUserMap.get(topic.userId);
            if (enrichedUser) {
                topic.userAvatarFrame = enrichedUser.avatarFrame;
            }
        });
      }

      // 获取总数，使用相同的过滤条件
      // 复用 conditions（已包含 tag 条件）和相同的 join 结构
      let countQuery = db
        .select({ count: count() })
        .from(topics)
        .innerJoin(categories, eq(topics.categoryId, categories.id))
        .innerJoin(users, eq(topics.userId, users.id));

      if (tagRecord) {
        countQuery = countQuery.innerJoin(topicTags, eq(topics.id, topicTags.topicId));
      }

      countQuery = countQuery.where(and(...conditions));

      const [{ count: total }] = await countQuery;

      return {
        items: finalResults,
        page,
        limit,
        total,
      };
    }
  );

  // 获取单个话题
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

      const isAdmin = request.user?.isAdmin;

      // 构建查询条件：管理员和版主可以查看已删除的话题
      const conditions = [eq(topics.id, id)];
      if (!isAdmin) {
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
          userIsBanned: users.isBanned,
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

      // 检查私有分类访问权限
      if (topic.categoryIsPrivate && !isAdmin) {
        return reply.code(404).send({ error: '话题不存在' });
      }

      // 检查用户是否有权限查看该分类的话题（基于 RBAC）
      if (!await fastify.permission.can(request, 'topic.read', { categoryId: topic.categoryId })) {
        return reply.code(404).send({ error: '话题不存在' });
      }

      // 检查访问权限：待审核或已拒绝的话题只有版主/管理员或作者本人可以访问
      if (topic.approvalStatus !== 'approved' && !isAdmin && !isAuthor) {
        return reply.code(404).send({ error: '话题不存在' });
      }

      // 检查已删除话题的访问权限：只有管理员和版主可以查看
      if (topic.isDeleted && !isAdmin) {
        return reply.code(404).send({ error: '话题不存在' });
      }

      // 异步增加浏览量（不阻塞响应）
      db.update(topics)
        .set({ 
          viewCount: sql`${topics.viewCount} + 1`,
          updatedAt: sql`${topics.updatedAt}`
        })
        .where(eq(topics.id, id))
        .catch(err => fastify.log.error('更新浏览量失败:', err));

      // 并行获取首贴和最后回复
      const [firstPostResult, lastPostResult] = await Promise.all([
        // 获取首贴（话题内容）
        db.select({
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
        .limit(1),
        
        // 获取最后一条回复以确定最大楼层号
        db.select({
          postNumber: posts.postNumber,
        })
        .from(posts)
        .where(and(eq(posts.topicId, id), eq(posts.isDeleted, false)))
        .orderBy(desc(posts.postNumber))
        .limit(1)
      ]);

      const firstPost = firstPostResult[0];
      const lastPost = lastPostResult[0];

      const authorInfo = { id: topic.userId };

      // 构建并行查询数组 - 使用静态结构以避免索引错位
      // 对于不满足条件的情况，返回 Promise.resolve([])
      const [
        topicTagsList,
        // eslint-disable-next-line no-unused-vars
        _enrichResult, 
        likeResult,
        bookmarkResult,
        subscriptionResult,
        blockResult
      ] = await Promise.all([
        // 0. 获取标签
        db.select({
          id: tags.id,
          name: tags.name,
          slug: tags.slug,
          color: tags.color,
        })
        .from(topicTags)
        .innerJoin(tags, eq(topicTags.tagId, tags.id))
        .where(eq(topicTags.topicId, id)),
        
        // 1. 补充作者数据（头像框、勋章）
        userEnricher.enrich(authorInfo, { request }),

        // 2. 点赞状态
        (request.user && firstPost) 
          ? db.select().from(likes).where(and(eq(likes.userId, request.user.id), eq(likes.postId, firstPost.id))).limit(1)
          : Promise.resolve([]),

        // 3. 收藏状态
        request.user 
          ? db.select().from(bookmarks).where(and(eq(bookmarks.userId, request.user.id), eq(bookmarks.topicId, id))).limit(1)
          : Promise.resolve([]),

        // 4. 订阅状态
        request.user 
          ? db.select().from(subscriptions).where(and(eq(subscriptions.userId, request.user.id), eq(subscriptions.topicId, id))).limit(1)
          : Promise.resolve([]),

        // 5. 拉黑状态
        request.user
          ? db.select()
              .from(blockedUsers)
              .where(
                or(
                  and(eq(blockedUsers.userId, request.user.id), eq(blockedUsers.blockedUserId, topic.userId)), // 我屏蔽了他
                  and(eq(blockedUsers.userId, topic.userId), eq(blockedUsers.blockedUserId, request.user.id))  // 他屏蔽了我
                )
              )
              .limit(1)
          : Promise.resolve([])
      ]);

      const isFirstPostLiked = likeResult.length > 0;
      const isBookmarked = bookmarkResult.length > 0;
      const isSubscribed = subscriptionResult.length > 0;
      const isBlockedUser = blockResult.length > 0;

      // 计算用户对该话题的操作权限
      const topicPermissions = await getTopicPermissions({
        permission: fastify.permission,
        user: request.user,
        topic,
      });

      return {
        ...topic,
        content: firstPost?.content || '',
        firstPostId: firstPost?.id,
        firstPostLikeCount: firstPost?.likeCount || 0,
        // 如果被封禁则覆盖头像
        userAvatar: shouldHideUserInfo({ isBanned: topic.userIsBanned }, isAdmin) ? null : topic.userAvatar,

        isFirstPostLiked,
        editCount: firstPost?.editCount || 0,
        editedAt: firstPost?.editedAt,
        lastPostNumber: lastPost?.postNumber || 1,
        tags: topicTagsList,
        isBookmarked,
        isSubscribed,
        viewCount: topic.viewCount + 1, // Return incremented count
        userAvatarFrame: authorInfo.avatarFrame || null,
        userBadges: authorInfo.badges || [],
        userDisplayRole: authorInfo.displayRole || null,
        isBlockedUser,
        // 操作权限
        ...topicPermissions,
      };
    }
  );

  // 创建话题
  fastify.post(
    '/',
    {
      preHandler: [
        fastify.authenticate,
        fastify.checkBanned,
        fastify.requireEmailVerification
      ],
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

      // 验证分类是否存在
      const [category] = await db
        .select()
        .from(categories)
        .where(eq(categories.id, categoryId))
        .limit(1);
      if (!category) {
        return reply.code(404).send({ error: '分类不存在' });
      }

      // 检查创建话题权限（带分类上下文）
      await fastify.permission.check(request, 'topic.create', {
        categoryId: category.id,
      });

      // 检查私有分类权限（管理员可以在私有分类发帖）
      if (category.isPrivate && !request.user.isAdmin) {
        return reply.code(403).send({
          error: '访问被拒绝',
          message: '你没有权限在该私有分类中发帖',
        });
      }

      // 检查是否开启内容审核
      const contentModerationEnabled = await fastify.settings.get(
        'content_moderation_enabled',
        false
      );
      const approvalStatus = contentModerationEnabled ? 'pending' : 'approved';

      // 生成 slug
      const slug = slugify(title) + '-' + Date.now();

      // 创建话题
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

      // 创建首贴
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

      // 处理标签
      if (tagNames && tagNames.length > 0) {
        for (const tagName of tagNames) {
          const tagSlug = slugify(tagName);

          // 获取或创建标签
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

          // 关联标签与话题
          await db.insert(topicTags).values({
            topicId: newTopic.id,
            tagId: tag.id,
          });
        }
      }

      // 积分奖励：发布话题后发放积分（仅当不需要审核或已批准时）
      if (approvalStatus === 'approved' && fastify.eventBus) {
        fastify.eventBus.emit('topic.created', newTopic);
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

  // 更新话题
  fastify.patch(
    '/:id',
    {
      preHandler: [fastify.authenticate],
      schema: {
        tags: ['topics'],
        description: '更新话题（所有者或管理员）',
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

      // 检查更新权限：版主/管理员 或 作者本人
      const hasDashboardAccess = await fastify.permission.can(request, 'dashboard.topics', {
        categoryId: topic.categoryId,
      });
      const isOwner = request.user.id === topic.userId;

      if (!hasDashboardAccess && !isOwner) {
        return reply.code(403).send({ error: '没有权限编辑此话题' });
      }

      // 作者编辑自己的话题，需要检查 topic.update 权限（可能有 timeRange 等条件）
      if (!hasDashboardAccess && isOwner) {
        await fastify.permission.check(request, 'topic.update', {
          categoryId: topic.categoryId,
        });
      }

      // 置顶话题需要 dashboard.topics 权限（版主/管理员）
      if (request.body.isPinned !== undefined) {
        await fastify.permission.check(request, 'dashboard.topics', {
          categoryId: topic.categoryId,
        });
      }

      // 关闭话题：版主可关闭，或作者可关闭自己的话题
      if (request.body.isClosed !== undefined) {
        if (!hasDashboardAccess && !isOwner) {
          return reply.code(403).send({ error: '没有权限关闭此话题' });
        }
      }

      // 检查是否开启内容审核
      const contentModerationEnabled = await fastify.settings.get(
        'content_moderation_enabled',
        false
      );

      // 准备话题更新（排除内容和标签，它们需要特殊处理）
      const { content, tags: tagNames, ...topicUpdates } = request.body;
      const updates = { ...topicUpdates, updatedAt: new Date() };

      // 如果标题变更，更新 slug
      if (request.body.title) {
        updates.slug = slugify(request.body.title) + '-' + topic.id;
      }

      // 审核状态变更跟踪
      let statusChanged = false;
      let needsReapproval = false; // 区分是已批准内容的编辑还是被拒绝内容的重新提交
      const previousStatus = topic.approvalStatus;

      // 如果内容审核开启，且编辑者是普通用户（非管理员）
      if (contentModerationEnabled && isOwner && !request.user.isAdmin) {
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

      // 更新话题
      const [updatedTopic] = await db
        .update(topics)
        .set(updates)
        .where(eq(topics.id, id))
        .returning();

      // 如果提供了内容，更新首贴（话题内容）
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

      // 如果提供了标签，更新标签
      if (tagNames !== undefined) {
        // 获取当前标签
        const currentTags = await db
          .select({ tagId: topicTags.tagId })
          .from(topicTags)
          .where(eq(topicTags.topicId, id));

        const currentTagIds = currentTags.map((t) => t.tagId);

        // 移除所有当前标签关联
        if (currentTagIds.length > 0) {
          await db.delete(topicTags).where(eq(topicTags.topicId, id));

          // 减少被移除标签的话题计数
          for (const tagId of currentTagIds) {
            await db
              .update(tags)
              .set({ topicCount: sql`${tags.topicCount} - 1` })
              .where(eq(tags.id, tagId));
          }
        }

        // 添加新标签
        if (tagNames.length > 0) {
          for (const tagName of tagNames) {
            const tagSlug = slugify(tagName);

            // 获取或创建标签
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

            // 关联标签与话题
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

  // 删除话题
  fastify.delete(
    '/:id',
    {
      preHandler: [fastify.authenticate],
      schema: {
        tags: ['topics'],
        description:
          '删除话题（默认逻辑删除，permanent=true 为彻底删除）',
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

      // 检查删除权限：版主/管理员 或 作者本人
      const hasDashboardAccess = await fastify.permission.can(request, 'dashboard.topics', {
        categoryId: topic.categoryId,
      });
      const isOwner = request.user.id === topic.userId;

      if (!hasDashboardAccess && !isOwner) {
        return reply.code(403).send({ error: '没有权限删除此话题' });
      }

      // 作者删除自己的话题，需要检查 topic.delete 权限
      if (!hasDashboardAccess && isOwner) {
        await fastify.permission.check(request, 'topic.delete', {
          categoryId: topic.categoryId,
        });
      }

      // 仅管理员可以永久删除话题
      if (permanent && !request.user.isAdmin) {
        return reply
          .code(403)
          .send({
            error: '只有管理员可以永久删除话题',
          });
      }

      if (permanent) {
        // 彻底删除 - 从数据库中永久删除
        
        // 1. 获取关联的标签并减少话题计数
        const currentTags = await db
          .select({ tagId: topicTags.tagId })
          .from(topicTags)
          .where(eq(topicTags.topicId, id));
          
        if (currentTags.length > 0) {
           for (const t of currentTags) {
             await db
               .update(tags)
               .set({ topicCount: sql`${tags.topicCount} - 1` })
               .where(eq(tags.id, t.tagId));
           }
        }

        // 2. 删除相关数据
        await db.delete(topicTags).where(eq(topicTags.topicId, id));
        await db.delete(bookmarks).where(eq(bookmarks.topicId, id));
        await db.delete(subscriptions).where(eq(subscriptions.topicId, id));
        await db.delete(posts).where(eq(posts.topicId, id));

        // 然后删除话题
        await db.delete(topics).where(eq(topics.id, id));

        return { message: '话题已永久删除' };
      } else {
        // 逻辑删除
        await db
          .update(topics)
          .set({ isDeleted: true, updatedAt: new Date() })
          .where(eq(topics.id, id));

        return { message: '话题删除成功' };
      }
    }
  );

  // 收藏话题
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

      // 检查是否已收藏
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

  // 取消收藏
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

  // 订阅话题
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

      // 检查是否已订阅
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

  // 取消订阅
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
