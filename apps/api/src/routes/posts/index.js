import db from '../../db/index.js';
import { posts, topics, users, likes, subscriptions, moderationLogs, blockedUsers, userItems, shopItems } from '../../db/schema.js';
import { eq, sql, desc, and, inArray, ne, like, or, not, count } from 'drizzle-orm';
import { userEnricher } from '../../services/userEnricher.js';
import { sysCurrencies, sysAccounts } from '../../extensions/ledger/schema.js';
import { DEFAULT_CURRENCY_CODE } from '../../extensions/ledger/constants.js';
import { getPassiveEffects } from '../../extensions/badges/services/badgeService.js';
import { applyUserInfoVisibility, shouldHideUserInfo } from '../../utils/visibility.js';

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
  // 获取帖子（按话题或用户，或管理员获取所有）
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

    // 检查查看权限 (post.read)
    const canRead = await fastify.permissionService.hasPermission(request.user?.id, 'post.read');
    if (!canRead) {
      return { items: [], page, limit, total: 0 };
    }

    // 检查是否为管理员
    const isAdmin = request.user?.isAdmin;
    
    // 判断是否为管理员模式：管理员且没有提供 topicId 或 userId
    const isAdminMode = isAdmin && !topicId && !userId;

    // 非管理员必须提供 topicId 或 userId
    if (!isAdmin && !topicId && !userId) {
      return reply.code(400).send({ error: '必须提供 topicId 或 userId' });
    }

    // 非管理员不能使用管理员专用参数
    if (!isAdmin && (approvalStatus !== 'all' || isDeleted !== undefined)) {
      return reply.code(403).send({ error: '无权限使用管理员参数' });
    }

    // 如果提供了 topicId，验证话题是否存在
    if (topicId) {
      const [topic] = await db.select().from(topics).where(eq(topics.id, topicId)).limit(1);

      if (!topic) {
        return reply.code(404).send({ error: '话题不存在' });
      }

      // 只有管理员和版主可以查看已删除话题的回复
      if (topic.isDeleted && !isAdmin) {
        return reply.code(404).send({ error: '话题不存在' });
      }

      // 检查用户是否有权限查看该话题的分类（基于 RBAC topic.read）
      if (!await fastify.hasPermission(request, 'topic.read', { categoryId: topic.categoryId })) {
        return reply.code(404).send({ error: '话题不存在' });
      }
    }

    // 构建查询条件
    let whereConditions = [];

    // 提前声明 blockedUserIds，在后续处理拉黑标记时复用
    let blockedUserIds = new Set();

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
              not(inArray(posts.userId, [...blockedUserIds]))
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
      if (!isAdmin) {
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
      if (!isAdmin) {
        whereConditions.push(eq(users.isBanned, false));
      }

      // 如果没有指定 topicId，需要基于 topic.read 权限过滤分类
      // （指定 topicId 时已在上面单独检查过）
      if (!topicId) {
        const allowedCategoryIds = await fastify.getAllowedCategoryIds(request);

        if (allowedCategoryIds !== null) {
          if (allowedCategoryIds.length === 0) {
            return { items: [], page, limit, total: 0 };
          }
          whereConditions.push(inArray(topics.categoryId, allowedCategoryIds));
        }
      }
    }

    // 添加搜索条件（所有模式通用）
    if (search && search.trim()) {
      whereConditions.push(like(posts.content, `%${search.trim()}%`));
    }

    // 获取帖子
    const selectFields = {
      id: posts.id,
      topicId: posts.topicId,
      topicUserId: topics.userId,
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
      
      // 复用之前查询的 blockedUserIds（已在第121-154行处理）
      // 无需重复查询数据库

      // 1. 统一应用可见性规则（如隐藏被封禁用户的头像）
      applyUserInfoVisibility(postsList, isAdmin);

      postsList.forEach(post => {
        // 2. 标记被拉黑用户的帖子（仅在话题详情页）
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

    // 检查当前用户点赞了哪些帖子
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

    // 获取有 replyToPostId 的帖子的被回复帖子信息
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
      applyUserInfoVisibility(replyToPosts, isAdmin);
      
      const replyToPostMap = new Map(replyToPosts.map(p => [p.id, p]));
      
      postsList.forEach(post => {
        if (post.replyToPostId && replyToPostMap.has(post.replyToPostId)) {
          post.replyToPost = replyToPostMap.get(post.replyToPostId);
        }
      });
    }

    // 获取所有相关用户（作者和被回复用户）的头像框
    const usersToEnrichMap = new Map();
    
    // 添加用户到充实列表的辅助函数
    const addUserToEnrich = (userId) => {
        if (!userId) return;
        if (!usersToEnrichMap.has(userId)) {
            usersToEnrichMap.set(userId, { id: userId });
        }
    };

    postsList.forEach(p => {
        addUserToEnrich(p.userId);
        if (p.replyToPost) {
            addUserToEnrich(p.replyToPost.userId);
        }
    });

    const usersToEnrich = Array.from(usersToEnrichMap.values());

    if (usersToEnrich.length > 0) {
        await userEnricher.enrichMany(usersToEnrich, { request });

        // 映射回帖子
        const enrichedUserMap = new Map(usersToEnrich.map(u => [u.id, u]));

        postsList.forEach(post => {
            // 作者
            const author = enrichedUserMap.get(post.userId);
            if (author) {
                post.userAvatarFrame = author.avatarFrame;
            }

            // 被回复用户
            if (post.replyToPost) {
                const replyUser = enrichedUserMap.get(post.replyToPost.userId);
                if (replyUser) {
                    post.replyToPost.userAvatarFrame = replyUser.avatarFrame;
                }
            }
        });
    }
    // 使用相同条件构建计数查询
    const [{ count: total }] = await db
      .select({ count: count() })
      .from(posts)
      .innerJoin(users, eq(posts.userId, users.id))
      .innerJoin(topics, eq(posts.topicId, topics.id))
      .where(and(...whereConditions));

    return {
      items: postsList,
      page,
      limit,
      total,
    };
  });

  // 获取帖子在话题中的位置（用于跳转到特定楼层）
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

    const isAdmin = request.user?.isAdmin;

    // 检查查看权限 (post.read)
    const canRead = await fastify.permissionService.hasPermission(request.user?.id, 'post.read');
    if (!canRead) {
      return reply.code(404).send({ error: '回复不存在' });
    }

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
    if (!isAdmin) {
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
            not(inArray(posts.userId, [...blockedUserIds]))
          );
        }
      }
    }

    // 5. 统计该帖子之前有多少条可见回复 (按 postNumber 排序)
    const [{ count: total }] = await db
      .select({ count: count() })
      .from(posts)
      .where(
        and(
          ...whereConditions,
          sql`${posts.postNumber} < ${post.postNumber}`
        )
      );

    const position = total + 1; // 位置从1开始
    const page = Math.ceil(position / limit);

    return {
      postId: post.id,
      postNumber: post.postNumber,
      position,
      page,
      limit
    };
  });

  // 获取单个帖子
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

    const isAdmin = request.user?.isAdmin;

    // 检查查看权限 (post.read)
    const canRead = await fastify.permissionService.hasPermission(request.user?.id, 'post.read');
    if (!canRead) {
      return reply.code(404).send({ error: '帖子不存在' });
    }

    const [post] = await db
      .select({
        id: posts.id,
        topicId: posts.topicId,
        categoryId: topics.categoryId,
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
      .innerJoin(topics, eq(posts.topicId, topics.id))
      .where(and(eq(posts.id, id), eq(posts.isDeleted, false)))
      .limit(1);

    if (!post) {
      return reply.code(404).send({ error: '帖子不存在' });
    }

    // 检查用户是否有权限查看该话题的分类（基于 RBAC topic.read）
    if (!await fastify.hasPermission(request, 'topic.read', { categoryId: post.categoryId })) {
      return reply.code(404).send({ error: '帖子不存在' });
    }

    // 如果用户被封禁且访问者不是管理员/版主，隐藏头像
    if (shouldHideUserInfo({ isBanned: post.userIsBanned }, isAdmin)) {
      post.userAvatar = null;
    }
    delete post.userIsBanned;
    delete post.categoryId; // 不返回 categoryId 给前端

    // 检查当前用户是否已点赞
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

  // 创建帖子（回复话题）
  fastify.post('/', {
    preHandler: [
      fastify.authenticate,
      fastify.checkBanned,
      fastify.requireEmailVerification
    ],
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

    // 验证话题是否存在且未关闭
    const [topic] = await db.select().from(topics).where(eq(topics.id, topicId)).limit(1);

    if (!topic || topic.isDeleted) {
      return reply.code(404).send({ error: '话题不存在' });
    }

    // 检查用户是否有权限访问该话题的分类
    if (!await fastify.hasPermission(request, 'topic.read', { categoryId: topic.categoryId })) {
      return reply.code(404).send({ error: '话题不存在' });
    }

    // 检查创建回复权限
    await fastify.checkPermission(request, 'post.create');

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

    // 获取下一个楼层号
    const [{ maxPostNumber }] = await db
      .select({ maxPostNumber: sql`COALESCE(MAX(${posts.postNumber}), 0)` })
      .from(posts)
      .where(eq(posts.topicId, topicId));

    const postNumber = Number(maxPostNumber) + 1;

    // 检查是否开启内容审核
    const contentModerationEnabled = await fastify.settings.get('content_moderation_enabled', false);
    const approvalStatus = contentModerationEnabled ? 'pending' : 'approved';

    // ============ 积分扣除逻辑 (Reply Cost) ============
    // 4. 检查积分扣除 (如果配置为负数)
    if (postNumber > 1) {
      try {
        const replyCreditChange = await fastify.ledger.getCurrencyConfig(DEFAULT_CURRENCY_CODE, 'post_reply_amount', 2); // 默认值2，表示回复奖励2积分
        const replyCost = replyCreditChange < 0 ? Math.abs(Number(replyCreditChange)) : 0;
        
        if (replyCost > 0) {
           const effects = await getPassiveEffects(request.user.id);
           let finalCost = Number(replyCost);

           // Apply discount
           if (effects.replyCostReductionPercent) {
             const discount = Math.floor(finalCost * (effects.replyCostReductionPercent / 100));
             finalCost = Math.max(0, finalCost - discount);
           }
           
           // Deduct credits via Ledger
           if (fastify.ledger) {
              await fastify.ledger.deduct({
                  userId: request.user.id,
                  currencyCode: DEFAULT_CURRENCY_CODE,
                  amount: finalCost,
                  type: 'post_reply',
                  referenceType: 'topic',
                  referenceId: String(topicId),
                  description: `发布回复扣费 (原价: ${replyCost}, 减免: ${replyCost - finalCost})`,
                  metadata: {
                    topicId,
                    originalCost: replyCost,
                    discountPercent: effects.replyCostReductionPercent || 0
                  }
              });
           }
        }
      } catch (err) {
        // 如果是余额不足，返回 400
        if (err.message.includes('余额不足') || err.message.includes('Insufficient funds')) {
           const currencyName = await fastify.ledger.getCurrencyName(DEFAULT_CURRENCY_CODE).catch(() => DEFAULT_CURRENCY_CODE);
           const cost = Math.abs(await fastify.ledger.getCurrencyConfig(DEFAULT_CURRENCY_CODE, 'post_reply_amount', 0));
           return reply.code(400).send({ error: `${currencyName}余额不足，发表回复需要 ${cost} ${currencyName}` });
        }
        // 其他积分系统错误（如未启用），记录日志但允许发帖（或者也可以选择拦截）
        // 这里选择允许发帖，避免积分系统故障影响核心功能，除非是余额不足这种明确的业务限制
        console.error('[Reply Cost] Deduction failed:', err);
      }
    }
    // ===============================================

    // 创建帖子
    const [newPost] = await db.insert(posts).values({
      topicId,
      userId: request.user.id,
      content,
      rawContent: content,
      postNumber,
      replyToPostId,
      approvalStatus
    }).returning();

    // 更新话题统计
    await db.update(topics).set({
      postCount: sql`${topics.postCount} + 1`,
      lastPostAt: new Date(),
      lastPostUserId: request.user.id,
      updatedAt: sql`${topics.updatedAt}` // Explicitly keep same to avoid $onUpdate trigger
    }).where(eq(topics.id, topicId));

    // 如果不是回复自己的话题，为话题所有者创建通知
    // 检查是否存在拉黑关系
    if (topic.userId !== request.user.id) {
      const blocked = await isBlocked(request.user.id, topic.userId);
      if (!blocked) {
        await fastify.notification.send({
          userId: topic.userId,
          type: 'reply',
          triggeredByUserId: request.user.id,
          topicId,
          postId: newPost.id,
          message: `${request.user.username} 回复了你的话题`
        });
      }
    }

    // 如果是回复特定帖子，也通知该用户
    if (replyToPostId) {
      const [replyToPost] = await db.select().from(posts).where(eq(posts.id, replyToPostId)).limit(1);
      if (replyToPost && replyToPost.userId !== request.user.id && replyToPost.userId !== topic.userId) {
        // 检查是否存在拉黑关系
        const blocked = await isBlocked(request.user.id, replyToPost.userId);
        if (!blocked) {
          await fastify.notification.send({
            userId: replyToPost.userId,
            type: 'reply',
            triggeredByUserId: request.user.id,
            topicId,
            postId: newPost.id,
            message: `${request.user.username} 回复了你`
          });
        }
      }
    }

    // 通知该话题的所有订阅者（除回复者和话题所有者外）
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
      // 优化：批量查询 blockedUsers 表来过滤被拉黑的订阅者
      // 我们需要排除：
      // 1. 我拉黑的订阅者 (blockedUsers.userId = me, blockedUsers.blockedUserId = subscriber)
      // 2. 拉黑我的订阅者 (blockedUsers.userId = subscriber, blockedUsers.blockedUserId = me)
      
      const subscriberIds = subscribers.map(s => s.userId);
      
      // 只有当有订阅者时才查询
      let blockedSubscriberIds = new Set();
      
      if (subscriberIds.length > 0) {
        const blocks = await db
          .select()
          .from(blockedUsers)
          .where(
            or(
              and(
                 eq(blockedUsers.userId, request.user.id),
                 inArray(blockedUsers.blockedUserId, subscriberIds)
              ),
              and(
                 inArray(blockedUsers.userId, subscriberIds),
                 eq(blockedUsers.blockedUserId, request.user.id)
              )
            )
          );
          
         blocks.forEach(block => {
           if (block.userId === request.user.id) {
             blockedSubscriberIds.add(block.blockedUserId);
           } else {
             blockedSubscriberIds.add(block.userId); 
           }
         });
      }

      const validSubscribers = subscribers.filter(sub => !blockedSubscriberIds.has(sub.userId));

      if (validSubscribers.length > 0) {
        const notificationList = validSubscribers.map(sub => ({
          userId: sub.userId,
          type: 'topic_reply',
          triggeredByUserId: request.user.id,
          topicId,
          postId: newPost.id,
          message: `${request.user.username} 在 "${topic.title}" 中回复了`
        }));

        await fastify.notification.sendBatch(notificationList);
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

  // 更新帖子
  fastify.patch('/:id', {
    preHandler: [fastify.authenticate],
    schema: {
      tags: ['posts'],
      description: '更新帖子（所有者或管理员）',
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

    // 获取话题以检查分类权限
    const [topic] = await db.select({ categoryId: topics.categoryId })
      .from(topics).where(eq(topics.id, post.topicId)).limit(1);

    // 检查用户是否有权限访问该话题的分类
    if (!await fastify.hasPermission(request, 'topic.read', { categoryId: topic?.categoryId })) {
      return reply.code(404).send({ error: '帖子不存在' });
    }

    // 权限检查：dashboard.posts 或 owner
    const hasDashboardAccess = await fastify.hasPermission(request, 'dashboard.posts', {
      categoryId: topic?.categoryId,
    });
    const isOwner = request.user.id === post.userId;

    if (!hasDashboardAccess && !isOwner) {
      return reply.code(403).send({ error: '没有权限编辑此回复' });
    }

    // 如果是普通用户（owner），检查 post.update 权限（可能有 timeRange 等条件限制）
    if (!hasDashboardAccess) {
      await fastify.checkPermission(request, 'post.update');
    }

    // 检查是否开启内容审核
    const contentModerationEnabled = await fastify.settings.get(
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

    // 如果内容审核开启，且编辑者是普通用户（非管理员）
    if (contentModerationEnabled && isOwner && !request.user.isAdmin) {
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

  // 删除帖子
  fastify.delete('/:id', {
    preHandler: [fastify.authenticate],
    schema: {
      tags: ['posts'],
      description: '删除帖子（逻辑删除或彻底删除）',
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

    // 获取话题以检查分类权限
    const [topic] = await db.select({ categoryId: topics.categoryId })
      .from(topics).where(eq(topics.id, post.topicId)).limit(1);

    // 检查用户是否有权限访问该话题的分类
    if (!await fastify.hasPermission(request, 'topic.read', { categoryId: topic?.categoryId })) {
      return reply.code(404).send({ error: '帖子不存在' });
    }

    // 权限检查：dashboard.posts 或 owner
    const hasDashboardAccess = await fastify.hasPermission(request, 'dashboard.posts', {
      categoryId: topic?.categoryId,
    });
    const isOwner = request.user.id === post.userId;

    if (!hasDashboardAccess && !isOwner) {
      return reply.code(403).send({ error: '没有权限删除此回复' });
    }

    // 如果是普通用户（owner），检查 post.delete 权限
    if (!hasDashboardAccess) {
      await fastify.checkPermission(request, 'post.delete');
    }

    // 无法删除第一条帖子（请改为删除话题）
    if (post.postNumber === 1) {
      return reply.code(400).send({ error: '无法删除第一条帖子，请删除话题' });
    }

    // 只有管理员可以永久删除
    if (permanent && !request.user.isAdmin) {
      return reply.code(403).send({ error: '只有管理员可以永久删除回复' });
    }

    if (permanent) {
      // 彻底删除 - 从数据库中永久移除
      // 首先删除相关数据
      await db.delete(likes).where(eq(likes.postId, id));

      // 删除对此帖子的回复（将 replyToPostId 设置为 null）
      await db.update(posts).set({
        replyToPostId: null,
        updatedAt: new Date()
      }).where(eq(posts.replyToPostId, id));

      // 然后删除帖子
      await db.delete(posts).where(eq(posts.id, id));

      // 更新话题帖子计数（仅当尚未逻辑删除时）
      // 如果帖子已经逻辑删除，则 postCount 已经减少过
      if (!post.isDeleted) {
        await db.update(topics).set({
          postCount: sql`${topics.postCount} - 1`,
          updatedAt: sql`${topics.updatedAt}`
        }).where(eq(topics.id, post.topicId));
      }

      return { message: '回复已永久删除' };
    } else {
      // 逻辑删除
      await db.update(posts).set({
        isDeleted: true,
        deletedAt: new Date(),
        deletedBy: request.user.id,
        updatedAt: new Date()
      }).where(eq(posts.id, id));

      // 更新话题帖子计数（仅当尚未删除时）
      if (!post.isDeleted) {
        await db.update(topics).set({
          postCount: sql`${topics.postCount} - 1`,
          updatedAt: sql`${topics.updatedAt}`
        }).where(eq(topics.id, post.topicId));
      }

      return { message: '回复删除成功' };
    }
  });

  // 点赞帖子
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

    // 检查是否已点赞
    const [existing] = await db
      .select()
      .from(likes)
      .where(and(eq(likes.userId, request.user.id), eq(likes.postId, id)))
      .limit(1);

    if (existing) {
      return reply.code(400).send({ error: '帖子已点赞' });
    }

    // 创建点赞
    await db.insert(likes).values({
      userId: request.user.id,
      postId: id
    });

    // 更新帖子点赞数
    await db.update(posts).set({
      likeCount: sql`${posts.likeCount} + 1`
    }).where(eq(posts.id, id));

    // 为帖子所有者创建通知
    if (post.userId !== request.user.id) {
      // 检查是否存在拉黑关系
      const blocked = await isBlocked(request.user.id, post.userId);
      if (!blocked) {
        await fastify.notification.send({
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

  // 取消点赞帖子
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

    // 删除点赞
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












