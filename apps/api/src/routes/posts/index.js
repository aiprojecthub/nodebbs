import db from '../../db/index.js';
import { posts, topics, users, likes, notifications, subscriptions, moderationLogs, blockedUsers } from '../../db/schema.js';
import { eq, sql, desc, and, inArray, ne, like, or } from 'drizzle-orm';
import { getSetting } from '../../utils/settings.js';

// 辅助函数：检查两个用户之间是否存在拉黑关系（双向检查）
async function isBlocked(userId1, userId2) {
  if (!userId1 || !userId2) return false;

  const [blockRelation] = await db
    .select()
    .from(blockedUsers)
    .where(
      or(
        and(
          eq(blockedUsers.userId, userId1),
          eq(blockedUsers.blockedUserId, userId2)
        ),
        and(
          eq(blockedUsers.userId, userId2),
          eq(blockedUsers.blockedUserId, userId1)
        )
      )
    )
    .limit(1);

  return !!blockRelation;
}

export default async function postRoutes(fastify, options) {
  // Get posts (by topic or by user, or all for admin)
  fastify.get('/', {
    preHandler: [fastify.optionalAuth],
    schema: {
      tags: ['posts'],
      description: '获取话题或用户的帖子，管理员可获取所有回复',
      querystring: {
        type: 'object',
        properties: {
          topicId: { type: 'number' },
          userId: { type: 'number' },
          page: { type: 'number', default: 1 },
          limit: { type: 'number', default: 20, maximum: 100 },
          search: { type: 'string' },
          // 管理员专用参数
          approvalStatus: { type: 'string', enum: ['all', 'pending', 'approved', 'rejected'] },
          isDeleted: { type: 'boolean' }
        }
      }
    }
  }, async (request, reply) => {
    const { 
      topicId, 
      userId, 
      page = 1, 
      limit = 20, 
      search,
      approvalStatus = 'all',
      isDeleted
    } = request.query;
    const offset = (page - 1) * limit;

    // 检查是否为管理员
    const isAdmin = request.user && request.user.role === 'admin';
    
    // 判断是否为管理员模式：管理员且没有提供 topicId 或 userId
    const isAdminMode = isAdmin && !topicId && !userId;
    const isModerator = request.user && ['moderator', 'admin'].includes(request.user.role);

    // 非管理员必须提供 topicId 或 userId
    if (!isAdmin && !topicId && !userId) {
      return reply.code(400).send({ error: '必须提供 topicId 或 userId' });
    }

    // 非管理员不能使用管理员专用参数
    if (!isAdmin && (approvalStatus !== 'all' || isDeleted !== undefined)) {
      return reply.code(403).send({ error: '无权限使用管理员参数' });
    }

    // If topicId provided, verify topic exists
    if (topicId) {
      const [topic] = await db.select().from(topics).where(eq(topics.id, topicId)).limit(1);

      if (!topic) {
        return reply.code(404).send({ error: '话题不存在' });
      }

      // 只有管理员和版主可以查看已删除话题的回复
      if (topic.isDeleted && !isModerator) {
        return reply.code(404).send({ error: '话题不存在' });
      }
    }

    // Build query conditions
    let whereConditions = [];

    // 管理员模式的特殊处理
    if (isAdminMode) {
      // 排除话题的第一条回复（即话题内容本身）
      whereConditions.push(ne(posts.postNumber, 1));

      // 删除状态过滤逻辑
      if (isDeleted !== undefined) {
        // 如果明确指定 isDeleted，则只显示该状态的回复
        whereConditions.push(eq(posts.isDeleted, isDeleted));
      }
      // 否则默认显示所有（包括已删除的）

      // 审核状态过滤（仅当明确指定时才过滤）
      if (approvalStatus && approvalStatus !== 'all') {
        whereConditions.push(eq(posts.approvalStatus, approvalStatus));
      }
    } else {
      // 普通模式：默认不显示已删除的回复
      whereConditions.push(eq(posts.isDeleted, false));

      // 如果用户已登录，根据场景决定是否过滤被拉黑用户内容
      let blockedUserIds = new Set();
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
          blockedUsersList.forEach(block => {
            if (block.userId === request.user.id) {
              blockedUserIds.add(block.blockedUserId);
            } else {
              blockedUserIds.add(block.userId);
            }
          });

          // 只在非话题详情页（即时间线、用户列表等场景）完全过滤
          // 在话题详情页中，保留被拉黑用户的帖子但标记为屏蔽
          if (!topicId && blockedUserIds.size > 0) {
            whereConditions.push(
              sql`${posts.userId} NOT IN (${Array.from(blockedUserIds).join(',')})`
            );
          }
        }
      }

      if (topicId) {
        whereConditions.push(eq(posts.topicId, topicId));
        // 排除话题的第一条回复（即话题内容本身）
        whereConditions.push(ne(posts.postNumber, 1));
      }
      if (userId) {
        whereConditions.push(eq(posts.userId, userId));
        // 排除话题的第一条回复（即话题内容本身）
        whereConditions.push(ne(posts.postNumber, 1));
      
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

      // 构建审核状态过滤条件（仅普通模式）
      // 规则：
      // 1. 管理员/版主可以看到所有状态
      // 2. 用户可以看到：已批准的回复 或 自己的回复（无论状态）
      // 3. 未登录用户只能看到已批准的回复
      if (!isModerator) {
        if (request.user) {
          // 登录用户：显示已批准的回复 或 自己的回复
          whereConditions.push(
            or(
              eq(posts.approvalStatus, 'approved'),
              eq(posts.userId, request.user.id)
            )
          );
        } else {
          // 未登录用户：只显示已批准的回复
          whereConditions.push(eq(posts.approvalStatus, 'approved'));
        }
      }
      // 管理员/版主：不添加过滤条件，显示所有回复

      // 过滤已封禁用户的回复（非管理员）
      const isAdmin = request.user && request.user.role === 'admin';
      if (!isAdmin) {
        whereConditions.push(eq(users.isBanned, false));
      }
    }

    // 添加搜索条件（所有模式通用）
    if (search && search.trim()) {
      whereConditions.push(like(posts.content, `%${search.trim()}%`));
    }

    // Get posts
    const selectFields = {
      id: posts.id,
      topicId: posts.topicId,
      topicTitle: topics.title,
      topicSlug: topics.slug,
      userId: posts.userId,
      username: users.username,
      userName: users.name,
      userAvatar: users.avatar,
      userRole: users.role,
      userIsBanned: users.isBanned,
      content: posts.content,
      postNumber: posts.postNumber,
      replyToPostId: posts.replyToPostId,
      likeCount: posts.likeCount,
      approvalStatus: posts.approvalStatus,
      editedAt: posts.editedAt,
      editCount: posts.editCount,
      createdAt: posts.createdAt
    };

    // 管理员模式额外返回删除信息
    if (isAdminMode) {
      selectFields.isDeleted = posts.isDeleted;
      selectFields.deletedAt = posts.deletedAt;
    }

    const postsList = await db
      .select(selectFields)
      .from(posts)
      .innerJoin(users, eq(posts.userId, users.id))
      .innerJoin(topics, eq(posts.topicId, topics.id))
      .where(and(...whereConditions))
      .orderBy(isAdminMode ? desc(posts.createdAt) : (topicId ? posts.postNumber : desc(posts.createdAt)))
      .limit(limit)
      .offset(offset);

    // 处理用户头像和拉黑标记
    if (!isAdminMode) {
      const isModerator = request.user && ['moderator', 'admin'].includes(request.user.role);
      let blockedUserIds = new Set();
      
      // 重新获取拉黑用户列表（如果需要）
      if (topicId && request.user) {
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

        blockedUsersList.forEach(block => {
          if (block.userId === request.user.id) {
            blockedUserIds.add(block.blockedUserId);
          } else {
            blockedUserIds.add(block.userId);
          }
        });
      }

      postsList.forEach(post => {
        // 如果用户被封禁且访问者不是管理员/版主，隐藏头像
        if (post.userIsBanned && !isModerator) {
          post.userAvatar = null;
        }
        // 移除 userIsBanned 字段，不返回给客户端
        delete post.userIsBanned;

        // 标记被拉黑用户的帖子（仅在话题详情页）
        if (topicId && blockedUserIds.size > 0) {
          post.isBlockedUser = blockedUserIds.has(post.userId);
        }
      });
    } else {
      // 管理员模式：保留所有信息，只移除 userIsBanned
      postsList.forEach(post => {
        delete post.userIsBanned;
      });
    }

    // Check which posts current user has liked
    if (request.user) {
      const postIds = postsList.map(p => p.id);
      if (postIds.length > 0) {
        // 使用Drizzle ORM的inArray方法替代手动构造ANY查询
        const userLikes = await db
          .select({ postId: likes.postId })
          .from(likes)
          .where(and(eq(likes.userId, request.user.id), inArray(likes.postId, postIds)));

        const likedPostIds = new Set(userLikes.map(l => l.postId));

        postsList.forEach(post => {
          post.isLiked = likedPostIds.has(post.id);
        });
      }
    }

    // Get reply-to post information for posts that have replyToPostId
    const replyToPostIds = postsList
      .filter(p => p.replyToPostId)
      .map(p => p.replyToPostId);
    
    if (replyToPostIds.length > 0) {
      const replyToPosts = await db
        .select({
          id: posts.id,
          postNumber: posts.postNumber,
          userId: posts.userId,
          userName: users.name,
          userUsername: users.username,
          userAvatar: users.avatar,
          userIsBanned: users.isBanned,
        })
        .from(posts)
        .innerJoin(users, eq(posts.userId, users.id))
        .where(inArray(posts.id, replyToPostIds));
      
      // 如果被回复的用户被封禁且访问者不是管理员/版主，隐藏头像
      replyToPosts.forEach(replyPost => {
        if (replyPost.userIsBanned && !isModerator) {
          replyPost.userAvatar = null;
        }
        delete replyPost.userIsBanned;
      });
      
      const replyToPostMap = new Map(replyToPosts.map(p => [p.id, p]));
      
      postsList.forEach(post => {
        if (post.replyToPostId && replyToPostMap.has(post.replyToPostId)) {
          post.replyToPost = replyToPostMap.get(post.replyToPostId);
        }
      });
    }

    // Build count query with same conditions
    const [{ count }] = await db
      .select({ count: sql`count(*)` })
      .from(posts)
      .innerJoin(users, eq(posts.userId, users.id))
      .where(and(...whereConditions));

    return {
      items: postsList,
      page,
      limit,
      total: Number(count)
    };
  });

  // Get post position in topic (for jumping to specific post)
  fastify.get('/:id/position', {
    preHandler: [fastify.optionalAuth],
    schema: {
      tags: ['posts'],
      description: '获取帖子在话题中的位置(用于跳转到指定楼层)',
      params: {
        type: 'object',
        required: ['id'],
        properties: {
          id: { type: 'number' }
        }
      },
      querystring: {
        type: 'object',
        required: ['topicId'],
        properties: {
          topicId: { type: 'number' },
          limit: { type: 'number', default: 20 }
        }
      }
    }
  }, async (request, reply) => {
    const { id } = request.params;
    const { topicId, limit = 20 } = request.query;

    // 1. 验证帖子存在
    const [post] = await db
      .select()
      .from(posts)
      .where(eq(posts.id, id))
      .limit(1);

    if (!post || post.isDeleted) {
      return reply.code(404).send({ error: '回复不存在' });
    }

    if (post.topicId !== topicId) {
      return reply.code(400).send({ error: '回复不属于该话题' });
    }

    // 2. 构建与列表查询相同的过滤条件
    let whereConditions = [
      eq(posts.topicId, topicId),
      ne(posts.postNumber, 1), // 排除话题内容
      eq(posts.isDeleted, false)
    ];

    // 3. 应用审核状态过滤 (与列表逻辑一致)
    const isModerator = request.user && ['moderator', 'admin'].includes(request.user.role);
    if (!isModerator) {
      if (request.user) {
        whereConditions.push(
          or(
            eq(posts.approvalStatus, 'approved'),
            eq(posts.userId, request.user.id)
          )
        );
      } else {
        whereConditions.push(eq(posts.approvalStatus, 'approved'));
      }
    }

    // 4. 应用拉黑用户过滤 (与列表逻辑一致)
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
        const blockedUserIds = new Set();
        blockedUsersList.forEach(block => {
          if (block.userId === request.user.id) {
            blockedUserIds.add(block.blockedUserId);
          } else {
            blockedUserIds.add(block.userId);
          }
        });

        // 在非话题详情场景中过滤拉黑用户 (这里我们保留以保持一致性)
        if (blockedUserIds.size > 0) {
          whereConditions.push(
            sql`${posts.userId} NOT IN (${Array.from(blockedUserIds).join(',')})`
          );
        }
      }
    }

    // 5. 统计该帖子之前有多少条可见回复 (按 postNumber 排序)
    const [{ count }] = await db
      .select({ count: sql`count(*)` })
      .from(posts)
      .where(
        and(
          ...whereConditions,
          sql`${posts.postNumber} < ${post.postNumber}`
        )
      );

    const position = Number(count) + 1; // 位置从1开始
    const page = Math.ceil(position / limit);

    return {
      postId: post.id,
      postNumber: post.postNumber,
      position,
      page,
      limit
    };
  });

  // Get single post
  fastify.get('/:id', {
    preHandler: [fastify.optionalAuth],
    schema: {
      tags: ['posts'],
      description: '根据ID获取单个帖子',
      params: {
        type: 'object',
        required: ['id'],
        properties: {
          id: { type: 'number' }
        }
      }
    }
  }, async (request, reply) => {
    const { id } = request.params;

    const [post] = await db
      .select({
        id: posts.id,
        topicId: posts.topicId,
        userId: posts.userId,
        username: users.username,
        userName: users.name,
        userAvatar: users.avatar,
        userRole: users.role,
        userIsBanned: users.isBanned,
        content: posts.content,
        rawContent: posts.rawContent,
        postNumber: posts.postNumber,
        replyToPostId: posts.replyToPostId,
        likeCount: posts.likeCount,
        editedAt: posts.editedAt,
        editCount: posts.editCount,
        createdAt: posts.createdAt
      })
      .from(posts)
      .innerJoin(users, eq(posts.userId, users.id))
      .where(and(eq(posts.id, id), eq(posts.isDeleted, false)))
      .limit(1);

    if (!post) {
      return reply.code(404).send({ error: '帖子不存在' });
    }

    // 检查用户权限
    const isModerator = request.user && ['moderator', 'admin'].includes(request.user.role);
    
    // 如果用户被封禁且访问者不是管理员/版主，隐藏头像
    if (post.userIsBanned && !isModerator) {
      post.userAvatar = null;
    }
    delete post.userIsBanned;

    // Check if current user has liked
    if (request.user) {
      const [like] = await db
        .select()
        .from(likes)
        .where(and(eq(likes.userId, request.user.id), eq(likes.postId, id)))
        .limit(1);
      post.isLiked = !!like;
    }

    return post;
  });

  // Create post (reply to topic)
  fastify.post('/', {
    preHandler: [fastify.authenticate, fastify.checkBanned, fastify.requireEmailVerification],
    schema: {
      tags: ['posts'],
      description: '创建新帖子（回复）',
      security: [{ bearerAuth: [] }],
      body: {
        type: 'object',
        required: ['topicId', 'content'],
        properties: {
          topicId: { type: 'number' },
          content: { type: 'string', minLength: 1 },
          replyToPostId: { type: 'number' }
        }
      }
    }
  }, async (request, reply) => {
    const { topicId, content, replyToPostId } = request.body;

    // Verify topic exists and is not closed
    const [topic] = await db.select().from(topics).where(eq(topics.id, topicId)).limit(1);

    if (!topic || topic.isDeleted) {
      return reply.code(404).send({ error: '话题不存在' });
    }

    if (topic.isClosed) {
      return reply.code(403).send({ error: '话题已关闭，无法回复' });
    }

    // 检查话题审核状态：待审核和已拒绝的话题不能回复
    if (topic.approvalStatus === 'pending') {
      return reply.code(403).send({ error: '话题正在审核中，暂时无法回复' });
    }

    if (topic.approvalStatus === 'rejected') {
      return reply.code(403).send({ error: '话题已被拒绝，无法回复' });
    }

    // Get next post number
    const [{ maxPostNumber }] = await db
      .select({ maxPostNumber: sql`COALESCE(MAX(${posts.postNumber}), 0)` })
      .from(posts)
      .where(eq(posts.topicId, topicId));

    const postNumber = Number(maxPostNumber) + 1;

    // 检查是否开启内容审核
    const contentModerationEnabled = await getSetting('content_moderation_enabled', false);
    const approvalStatus = contentModerationEnabled ? 'pending' : 'approved';

    // Create post
    const [newPost] = await db.insert(posts).values({
      topicId,
      userId: request.user.id,
      content,
      rawContent: content,
      postNumber,
      replyToPostId,
      approvalStatus
    }).returning();

    // Update topic stats
    await db.update(topics).set({
      postCount: sql`${topics.postCount} + 1`,
      lastPostAt: new Date(),
      lastPostUserId: request.user.id,
      updatedAt: new Date()
    }).where(eq(topics.id, topicId));

    // Create notification for topic owner if not replying to own topic
    // 检查是否存在拉黑关系
    if (topic.userId !== request.user.id) {
      const blocked = await isBlocked(request.user.id, topic.userId);
      if (!blocked) {
        await db.insert(notifications).values({
          userId: topic.userId,
          type: 'reply',
          triggeredByUserId: request.user.id,
          topicId,
          postId: newPost.id,
          message: `${request.user.username} 回复了你的话题`
        });
      }
    }

    // If replying to specific post, notify that user too
    if (replyToPostId) {
      const [replyToPost] = await db.select().from(posts).where(eq(posts.id, replyToPostId)).limit(1);
      if (replyToPost && replyToPost.userId !== request.user.id && replyToPost.userId !== topic.userId) {
        // 检查是否存在拉黑关系
        const blocked = await isBlocked(request.user.id, replyToPost.userId);
        if (!blocked) {
          await db.insert(notifications).values({
            userId: replyToPost.userId,
            type: 'reply',
            triggeredByUserId: request.user.id,
            topicId,
            postId: newPost.id,
            message: `${request.user.username} 回复了你的帖子`
          });
        }
      }
    }

    // Notify all subscribers to this topic (except the replier and topic owner)
    const subscribers = await db
      .select({ userId: subscriptions.userId })
      .from(subscriptions)
      .where(
        and(
          eq(subscriptions.topicId, topicId),
          ne(subscriptions.userId, request.user.id),
          ne(subscriptions.userId, topic.userId)
        )
      );

    if (subscribers.length > 0) {
      // 过滤掉被拉黑的订阅者
      const validSubscribers = [];
      for (const sub of subscribers) {
        const blocked = await isBlocked(request.user.id, sub.userId);
        if (!blocked) {
          validSubscribers.push(sub);
        }
      }

      if (validSubscribers.length > 0) {
        const notificationValues = validSubscribers.map(sub => ({
          userId: sub.userId,
          type: 'topic_reply',
          triggeredByUserId: request.user.id,
          topicId,
          postId: newPost.id,
          message: `${request.user.username} 在 "${topic.title}" 中回复了`
        }));

        await db.insert(notifications).values(notificationValues);
      }
    }

    // 积分奖励：发布回复后发放积分（仅当不需要审核或已批准时，且不是话题的第一个帖子）
    if (approvalStatus === 'approved' && postNumber > 1 && fastify.eventBus) {
      fastify.eventBus.emit('post.created', newPost);
    }

    const message = contentModerationEnabled
      ? '您的回复已提交，等待审核后将公开显示'
      : '回复发布成功';

    return {
      post: newPost,
      message,
      requiresApproval: contentModerationEnabled
    };
  });

  // Update post
  fastify.patch('/:id', {
    preHandler: [fastify.authenticate],
    schema: {
      tags: ['posts'],
      description: '更新帖子（所有者、版主或管理员）',
      security: [{ bearerAuth: [] }],
      params: {
        type: 'object',
        required: ['id'],
        properties: {
          id: { type: 'number' }
        }
      },
      body: {
        type: 'object',
        required: ['content'],
        properties: {
          content: { type: 'string', minLength: 1 }
        }
      }
    }
  }, async (request, reply) => {
    const { id } = request.params;
    const { content } = request.body;

    const [post] = await db.select().from(posts).where(eq(posts.id, id)).limit(1);

    if (!post || post.isDeleted) {
      return reply.code(404).send({ error: '帖子不存在' });
    }

    // Check permissions
    const isModerator = ['moderator', 'admin'].includes(request.user.role);
    const isOwner = post.userId === request.user.id;

    if (!isModerator && !isOwner) {
      return reply.code(403).send({ error: '你没有权限编辑该帖子' });
    }

    // 检查是否开启内容审核
    const contentModerationEnabled = await getSetting(
      'content_moderation_enabled',
      false
    );

    // 准备更新数据
    const updates = {
      content,
      rawContent: content,
      editedAt: new Date(),
      editCount: sql`${posts.editCount} + 1`,
      updatedAt: new Date(),
    };

    // 审核状态变更跟踪
    let statusChanged = false;
    let needsReapproval = false; // 区分是已批准内容的编辑还是被拒绝内容的重新提交
    const previousStatus = post.approvalStatus;

    // 如果内容审核开启，且编辑者是普通用户（非版主/管理员）
    if (contentModerationEnabled && isOwner && !isModerator) {
      // 已批准的回复编辑后需要重新审核
      if (previousStatus === 'approved') {
        updates.approvalStatus = 'pending';
        statusChanged = true;
        needsReapproval = true;
      }
      // 被拒绝的回复编辑后重新提交审核
      else if (previousStatus === 'rejected') {
        updates.approvalStatus = 'pending';
        statusChanged = true;
        needsReapproval = false;
      }
    }

    const [updatedPost] = await db
      .update(posts)
      .set(updates)
      .where(eq(posts.id, id))
      .returning();

    // 记录审核日志
    if (statusChanged) {
      const action = needsReapproval ? 'edit_resubmit' : 'resubmit';
      const note = needsReapproval
        ? '已批准的回复编辑后重新提交审核'
        : '被拒绝的回复编辑后重新提交审核';

      await db.insert(moderationLogs).values({
        action,
        targetType: 'post',
        targetId: id,
        moderatorId: request.user.id,
        previousStatus,
        newStatus: 'pending',
        metadata: JSON.stringify({ note }),
      });
    }

    // 生成返回消息
    let message = '回复更新成功';
    if (needsReapproval) {
      message = '回复已更新，正在等待审核后公开显示';
    } else if (statusChanged) {
      message = '回复已重新提交审核';
    }

    return {
      post: updatedPost,
      message,
      requiresApproval: needsReapproval || statusChanged,
    };
  });

  // Delete post
  fastify.delete('/:id', {
    preHandler: [fastify.authenticate],
    schema: {
      tags: ['posts'],
      description: '删除帖子（软删除或彻底删除）',
      security: [{ bearerAuth: [] }],
      params: {
        type: 'object',
        required: ['id'],
        properties: {
          id: { type: 'number' }
        }
      },
      querystring: {
        type: 'object',
        properties: {
          permanent: { type: 'boolean', default: false }
        }
      }
    }
  }, async (request, reply) => {
    const { id } = request.params;
    const { permanent = false } = request.query;

    const [post] = await db.select().from(posts).where(eq(posts.id, id)).limit(1);

    if (!post) {
      return reply.code(404).send({ error: '帖子不存在' });
    }

    // Cannot delete first post (use topic delete instead)
    if (post.postNumber === 1) {
      return reply.code(400).send({ error: '无法删除第一条帖子，请删除话题' });
    }

    // Check permissions
    const isModerator = ['moderator', 'admin'].includes(request.user.role);
    const isOwner = post.userId === request.user.id;

    if (!isModerator && !isOwner) {
      return reply.code(403).send({ error: '你没有权限删除该帖子' });
    }

    // Only moderators and admins can permanently delete
    if (permanent && !isModerator) {
      return reply.code(403).send({ error: '只有版主和管理员可以永久删除回复' });
    }

    if (permanent) {
      // Hard delete - permanently remove from database
      // First delete related data
      await db.delete(likes).where(eq(likes.postId, id));

      // Delete replies to this post (set replyToPostId to null)
      await db.update(posts).set({
        replyToPostId: null,
        updatedAt: new Date()
      }).where(eq(posts.replyToPostId, id));

      // Then delete the post
      await db.delete(posts).where(eq(posts.id, id));

      // Update topic post count (only if not already soft deleted)
      // If the post was already soft deleted, postCount was already decremented
      if (!post.isDeleted) {
        await db.update(topics).set({
          postCount: sql`${topics.postCount} - 1`,
          updatedAt: new Date()
        }).where(eq(topics.id, post.topicId));
      }

      return { message: '回复已永久删除' };
    } else {
      // Soft delete
      await db.update(posts).set({
        isDeleted: true,
        deletedAt: new Date(),
        deletedBy: request.user.id,
        updatedAt: new Date()
      }).where(eq(posts.id, id));

      // Update topic post count (only if not already deleted)
      if (!post.isDeleted) {
        await db.update(topics).set({
          postCount: sql`${topics.postCount} - 1`,
          updatedAt: new Date()
        }).where(eq(topics.id, post.topicId));
      }

      return { message: '回复删除成功' };
    }
  });

  // Like post
  fastify.post('/:id/like', {
    preHandler: [fastify.authenticate, fastify.checkBanned],
    schema: {
      tags: ['posts'],
      description: '点赞帖子',
      security: [{ bearerAuth: [] }],
      params: {
        type: 'object',
        required: ['id'],
        properties: {
          id: { type: 'number' }
        }
      }
    }
  }, async (request, reply) => {
    const { id } = request.params;

    const [post] = await db.select().from(posts).where(eq(posts.id, id)).limit(1);

    if (!post || post.isDeleted) {
      return reply.code(404).send({ error: '帖子不存在' });
    }

    // Check if already liked
    const [existing] = await db
      .select()
      .from(likes)
      .where(and(eq(likes.userId, request.user.id), eq(likes.postId, id)))
      .limit(1);

    if (existing) {
      return reply.code(400).send({ error: '帖子已点赞' });
    }

    // Create like
    await db.insert(likes).values({
      userId: request.user.id,
      postId: id
    });

    // Update post like count
    await db.update(posts).set({
      likeCount: sql`${posts.likeCount} + 1`
    }).where(eq(posts.id, id));

    // Create notification for post owner
    if (post.userId !== request.user.id) {
      // 检查是否存在拉黑关系
      const blocked = await isBlocked(request.user.id, post.userId);
      if (!blocked) {
        await db.insert(notifications).values({
          userId: post.userId,
          type: 'like',
          triggeredByUserId: request.user.id,
          topicId: post.topicId,
          postId: id,
          message: `${request.user.username} 赞了你的帖子`
        });
      }

      // 积分奖励：给被点赞者发放积分
      if (fastify.eventBus) {
        fastify.eventBus.emit('post.liked', {
          postId: id,
          postAuthorId: post.userId,
          userId: request.user.id
        });
      }
    }

    return { message: 'Post liked successfully' };
  });

  // Unlike post
  fastify.delete('/:id/like', {
    preHandler: [fastify.authenticate],
    schema: {
      tags: ['posts'],
      description: '取消点赞帖子',
      security: [{ bearerAuth: [] }],
      params: {
        type: 'object',
        required: ['id'],
        properties: {
          id: { type: 'number' }
        }
      }
    }
  }, async (request, reply) => {
    const { id } = request.params;

    // Delete like
    const deleted = await db
      .delete(likes)
      .where(and(eq(likes.userId, request.user.id), eq(likes.postId, id)))
      .returning();

    if (deleted.length > 0) {
      // Update post like count
      await db.update(posts).set({
        likeCount: sql`${posts.likeCount} - 1`
      }).where(eq(posts.id, id));
    }

    return { message: 'Like removed successfully' };
  });
}












