import db from '../../db/index.js';
import { messages, users, blockedUsers, follows } from '../../db/schema.js';
import { eq, sql, desc, and, or, like, count } from 'drizzle-orm';

export default async function messageRoutes(fastify) {
  // 获取会话列表（按用户分组）
  fastify.get(
    '/conversations',
    {
      preHandler: [fastify.authenticate],
      schema: {
        tags: ['messages'],
        description: '获取按用户分组的会话列表',
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
    async (request, reply) => {
      const { page = 1, limit = 20 } = request.query;
      const offset = (page - 1) * limit;
      const currentUserId = request.user.id;

      // 第 1 步：获取包含当前用户的所有消息
      const allMessages = await db
        .select({
          id: messages.id,
          senderId: messages.senderId,
          recipientId: messages.recipientId,
          content: messages.content,
          isRead: messages.isRead,
          createdAt: messages.createdAt,
        })
        .from(messages)
        .where(
          or(
            and(
              eq(messages.senderId, currentUserId),
              eq(messages.isDeletedBySender, false)
            ),
            and(
              eq(messages.recipientId, currentUserId),
              eq(messages.isDeletedByRecipient, false)
            )
          )
        )
        .orderBy(desc(messages.createdAt));

      // 第 2 步：按会话对象分组并获取最新消息
      const conversationMap = new Map();
      for (const msg of allMessages) {
        const otherUserId =
          msg.senderId === currentUserId ? msg.recipientId : msg.senderId;

        if (!conversationMap.has(otherUserId)) {
          conversationMap.set(otherUserId, {
            userId: otherUserId,
            latestMessage: msg,
            unreadCount: 0,
          });
        }

        // 统计来自该用户的未读消息数
        if (
          msg.senderId === otherUserId &&
          msg.recipientId === currentUserId &&
          !msg.isRead
        ) {
          conversationMap.get(otherUserId).unreadCount++;
        }
      }

      // 第 3 步：转为数组并进行分页
      const allConversations = Array.from(conversationMap.values());
      const paginatedConversations = allConversations.slice(
        offset,
        offset + limit
      );

      // 第 4 步：为分页后的会话获取用户信息
      const conversationsWithDetails = await Promise.all(
        paginatedConversations.map(async (conv) => {
          const [otherUser] = await db
            .select({
              id: users.id,
              username: users.username,
              name: users.name,
              avatar: users.avatar,
            })
            .from(users)
            .where(eq(users.id, conv.userId))
            .limit(1);

          return {
            user: otherUser,
            latestMessage: {
              id: conv.latestMessage.id,
              content: conv.latestMessage.content,
              isRead: conv.latestMessage.isRead,
              isSentByMe: conv.latestMessage.senderId === currentUserId,
              createdAt: conv.latestMessage.createdAt,
            },
            unreadCount: conv.unreadCount,
          };
        })
      );

      // 第 5 步：获取未读总数
      const totalUnread = allMessages.filter(
        (msg) => msg.recipientId === currentUserId && !msg.isRead
      ).length;

      return {
        items: conversationsWithDetails,
        page,
        limit,
        total: allConversations.length,
        totalUnread,
      };
    }
  );

  // 获取用户消息（收件箱与已发送）- 保留用于兼容旧接口
  fastify.get(
    '/',
    {
      preHandler: [fastify.authenticate],
      schema: {
        tags: ['messages'],
        description: '获取当前用户消息',
        security: [{ bearerAuth: [] }],
        querystring: {
          type: 'object',
          properties: {
            box: { type: 'string', enum: ['inbox', 'sent'], default: 'inbox' },
            page: { type: 'number', default: 1 },
            limit: { type: 'number', default: 20, maximum: 100 },
            search: { type: 'string' }
          },
        },
      },
    },
    async (request, reply) => {
      const { box = 'inbox', page = 1, limit = 20, search } = request.query;
      const offset = (page - 1) * limit;

      // 构建查询条件
      let conditions;
      if (box === 'inbox') {
        conditions = [
          eq(messages.recipientId, request.user.id),
          eq(messages.isDeletedByRecipient, false)
        ];
      } else {
        conditions = [
          eq(messages.senderId, request.user.id),
          eq(messages.isDeletedBySender, false)
        ];
      }

      // 添加搜索条件
      if (search && search.trim()) {
        conditions.push(
          or(
            like(messages.content, `%${search.trim()}%`),
            like(messages.subject, `%${search.trim()}%`)
          )
        );
      }

      let query;
      if (box === 'inbox') {
        query = db
          .select({
            id: messages.id,
            senderId: messages.senderId,
            senderUsername: users.username,
            senderName: users.name,
            senderAvatar: users.avatar,
            recipientId: messages.recipientId,
            subject: messages.subject,
            content: messages.content,
            isRead: messages.isRead,
            readAt: messages.readAt,
            createdAt: messages.createdAt,
          })
          .from(messages)
          .innerJoin(users, eq(messages.senderId, users.id))
          .where(and(...conditions));
      } else {
        query = db
          .select({
            id: messages.id,
            senderId: messages.senderId,
            recipientId: messages.recipientId,
            recipientUsername: users.username,
            recipientName: users.name,
            recipientAvatar: users.avatar,
            subject: messages.subject,
            content: messages.content,
            isRead: messages.isRead,
            readAt: messages.readAt,
            createdAt: messages.createdAt,
          })
          .from(messages)
          .innerJoin(users, eq(messages.recipientId, users.id))
          .where(and(...conditions));
      }

      const messagesList = await query
        .orderBy(desc(messages.createdAt))
        .limit(limit)
        .offset(offset);

      // 按相同条件获取总数
      const [{ count: total }] = await db
        .select({ count: count() })
        .from(messages)
        .where(and(...conditions));

      // 获取未读数量（仅收件箱）
      let unreadCount = 0;
      if (box === 'inbox') {
        const [{ count: unread }] = await db
          .select({ count: count() })
          .from(messages)
          .where(
            and(
              eq(messages.recipientId, request.user.id),
              eq(messages.isRead, false),
              eq(messages.isDeletedByRecipient, false)
            )
          );
        unreadCount = unread;
      }

      return {
        items: messagesList,
        page,
        limit,
        total,
        unreadCount,
      };
    }
  );

  // 获取单条消息
  fastify.get(
    '/:id',
    {
      preHandler: [fastify.authenticate],
      schema: {
        tags: ['messages'],
        description: '根据ID获取单条消息',
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

      const [message] = await db
        .select({
          id: messages.id,
          senderId: messages.senderId,
          senderUsername: users.username,
          senderName: users.name,
          senderAvatar: users.avatar,
          recipientId: messages.recipientId,
          subject: messages.subject,
          content: messages.content,
          isRead: messages.isRead,
          readAt: messages.readAt,
          createdAt: messages.createdAt,
        })
        .from(messages)
        .innerJoin(users, eq(messages.senderId, users.id))
        .where(eq(messages.id, id))
        .limit(1);

      if (!message) {
        return reply.code(404).send({ error: '消息不存在' });
      }

      // 检查权限
      if (
        message.senderId !== request.user.id &&
        message.recipientId !== request.user.id
      ) {
        return reply
          .code(403)
          .send({ error: '你没有权限查看该消息' });
      }

      // 接收者查看时标记为已读
      if (message.recipientId === request.user.id && !message.isRead) {
        await db
          .update(messages)
          .set({ isRead: true, readAt: new Date() })
          .where(eq(messages.id, id));
        message.isRead = true;
        message.readAt = new Date();
      }

      return message;
    }
  );

  // 发送消息
  fastify.post(
    '/',
    {
      preHandler: [fastify.authenticate, fastify.requireEmailVerification],
      schema: {
        tags: ['messages'],
        description: '发送新消息',
        security: [{ bearerAuth: [] }],
        body: {
          type: 'object',
          required: ['recipientId', 'content'],
          properties: {
            recipientId: { type: 'number' },
            subject: { type: 'string', maxLength: 255 },
            content: { type: 'string', minLength: 1 },
          },
        },
      },
    },
    async (request, reply) => {
      const { recipientId, subject, content } = request.body;

      // 检查接收者是否存在并读取其设置
      const [recipient] = await db
        .select({
          id: users.id,
          username: users.username,
          messagePermission: users.messagePermission,
        })
        .from(users)
        .where(eq(users.id, recipientId))
        .limit(1);

      if (!recipient) {
        return reply.code(404).send({ error: '收件人不存在' });
      }

      // 不能给自己发送消息
      if (recipientId === request.user.id) {
        return reply
          .code(400)
          .send({ error: '不能给自己发消息' });
      }

      // 检查接收者的消息权限
      const recipientPermission = recipient.messagePermission || 'everyone';
      
      if (recipientPermission === 'disabled') {
        return reply
          .code(403)
          .send({ error: '该用户已禁用站内信功能' });
      }
      
      // 如果对方只接收关注者的站内信，检查当前用户是否关注他们
      if (recipientPermission === 'followers') {
        const [followRelation] = await db
          .select()
          .from(follows)
          .where(
            and(
              eq(follows.followerId, request.user.id),
              eq(follows.followingId, recipientId)
            )
          )
          .limit(1);
        
        if (!followRelation) {
          return reply
            .code(403)
            .send({ error: '该用户只接收关注者的站内信' });
        }
      }

      // 检查当前用户是否禁用私信
      const [currentUser] = await db
        .select({ messagePermission: users.messagePermission })
        .from(users)
        .where(eq(users.id, request.user.id))
        .limit(1);

      const currentUserPermission = currentUser.messagePermission || 'everyone';
      if (currentUserPermission === 'disabled') {
        return reply
          .code(403)
          .send({
            error: '你已禁用站内信功能，请在设置中启用后再发送消息',
          });
      }

      // 检查双方是否存在拉黑关系
      const [blockRelation] = await db
        .select()
        .from(blockedUsers)
        .where(
          or(
            and(
              eq(blockedUsers.userId, request.user.id),
              eq(blockedUsers.blockedUserId, recipientId)
            ),
            and(
              eq(blockedUsers.userId, recipientId),
              eq(blockedUsers.blockedUserId, request.user.id)
            )
          )
        )
        .limit(1);

      if (blockRelation) {
        if (blockRelation.userId === request.user.id) {
          return reply
            .code(403)
            .send({ error: '你已拉黑该用户' });
        } else {
          return reply
            .code(403)
            .send({ error: '你不能给该用户发消息' });
        }
      }

      // 创建消息
      const [newMessage] = await db
        .insert(messages)
        .values({
          senderId: request.user.id,
          recipientId,
          subject: subject || null,
          content,
        })
        .returning();

      // 为接收者创建通知
      await fastify.notification.send({
        userId: recipientId,
        type: 'message',
        triggeredByUserId: request.user.id,
        message: `${request.user.username} 给你发送了一条新消息${
          subject ? `：${subject}` : ''
        }`,
        metadata: {
          messageId: newMessage.id,
          subject: subject || null
        }
      });

      return newMessage;
    }
  );

  // 删除消息
  fastify.delete(
    '/:id',
    {
      preHandler: [fastify.authenticate],
      schema: {
        tags: ['messages'],
        description: '删除消息',
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

      const [message] = await db
        .select()
        .from(messages)
        .where(eq(messages.id, id))
        .limit(1);

      if (!message) {
        return reply.code(404).send({ error: '消息不存在' });
      }

      // 检查权限
      if (
        message.senderId !== request.user.id &&
        message.recipientId !== request.user.id
      ) {
        return reply
          .code(403)
          .send({ error: '你没有权限删除该消息' });
      }

      // 根据用户角色执行软删除
      const updates = {};
      if (message.senderId === request.user.id) {
        updates.isDeletedBySender = true;
      }
      if (message.recipientId === request.user.id) {
        updates.isDeletedByRecipient = true;
      }

      await db.update(messages).set(updates).where(eq(messages.id, id));

      return { message: 'Message deleted successfully' };
    }
  );

  // 删除与指定用户的全部消息（会话）
  fastify.delete(
    '/conversation/:userId',
    {
      preHandler: [fastify.authenticate],
      schema: {
        tags: ['messages'],
        description: '删除与特定用户的所有消息',
        security: [{ bearerAuth: [] }],
        params: {
          type: 'object',
          required: ['userId'],
          properties: {
            userId: { type: 'number' },
          },
        },
      },
    },
    async (request, reply) => {
      const { userId } = request.params;
      const currentUserId = request.user.id;

      // 检查对方用户是否存在
      const [otherUser] = await db
        .select({ id: users.id })
        .from(users)
        .where(eq(users.id, userId))
        .limit(1);

      if (!otherUser) {
        return reply.code(404).send({ error: '用户不存在' });
      }

      // 软删除当前用户与指定用户之间的所有消息
      // 针对当前用户发送的消息
      await db
        .update(messages)
        .set({ isDeletedBySender: true })
        .where(
          and(
            eq(messages.senderId, currentUserId),
            eq(messages.recipientId, userId)
          )
        );

      // 针对当前用户接收的消息
      await db
        .update(messages)
        .set({ isDeletedByRecipient: true })
        .where(
          and(
            eq(messages.senderId, userId),
            eq(messages.recipientId, currentUserId)
          )
        );

      return { message: 'Conversation deleted successfully' };
    }
  );

  // 标记消息为已读
  fastify.patch(
    '/:id/read',
    {
      preHandler: [fastify.authenticate],
      schema: {
        tags: ['messages'],
        description: '标记消息为已读',
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

      const [message] = await db
        .select()
        .from(messages)
        .where(eq(messages.id, id))
        .limit(1);

      if (!message) {
        return reply.code(404).send({ error: '消息不存在' });
      }

      // 仅接收者可标记为已读
      if (message.recipientId !== request.user.id) {
        return reply
          .code(403)
          .send({ error: '只有收件人可以标记消息为已读' });
      }

      const [updated] = await db
        .update(messages)
        .set({ isRead: true, readAt: new Date() })
        .where(eq(messages.id, id))
        .returning();

      return updated;
    }
  );

  // 获取与指定用户的会话
  fastify.get(
    '/conversation/:userId',
    {
      preHandler: [fastify.authenticate],
      schema: {
        tags: ['messages'],
        description: '获取与特定用户的会话历史',
        security: [{ bearerAuth: [] }],
        params: {
          type: 'object',
          required: ['userId'],
          properties: {
            userId: { type: 'number' },
          },
        },
        querystring: {
          type: 'object',
          properties: {
            page: { type: 'number', default: 1 },
            limit: { type: 'number', default: 20, maximum: 100 },
          },
        },
      },
    },
    async (request, reply) => {
      const { userId } = request.params;
      const { page = 1, limit = 20 } = request.query;
      const offset = (page - 1) * limit;

      // 检查对方用户是否存在
      const [otherUser] = await db
        .select({
          id: users.id,
          username: users.username,
          name: users.name,
          avatar: users.avatar,
        })
        .from(users)
        .where(eq(users.id, userId))
        .limit(1);

      if (!otherUser) {
        return reply.code(404).send({ error: '用户不存在' });
      }

      // 获取当前用户与指定用户之间的所有消息
      const conversation = await db
        .select({
          id: messages.id,
          senderId: messages.senderId,
          recipientId: messages.recipientId,
          subject: messages.subject,
          content: messages.content,
          isRead: messages.isRead,
          readAt: messages.readAt,
          createdAt: messages.createdAt,
          senderUsername: users.username,
          senderName: users.name,
          senderAvatar: users.avatar,
        })
        .from(messages)
        .innerJoin(users, eq(messages.senderId, users.id))
        .where(
          or(
            and(
              eq(messages.senderId, request.user.id),
              eq(messages.recipientId, userId),
              eq(messages.isDeletedBySender, false)
            ),
            and(
              eq(messages.senderId, userId),
              eq(messages.recipientId, request.user.id),
              eq(messages.isDeletedByRecipient, false)
            )
          )
        )
        .orderBy(desc(messages.createdAt))
        .limit(limit)
        .offset(offset);

      // 获取总数量
      const [{ count: total }] = await db
        .select({ count: count() })
        .from(messages)
        .where(
          or(
            and(
              eq(messages.senderId, request.user.id),
              eq(messages.recipientId, userId),
              eq(messages.isDeletedBySender, false)
            ),
            and(
              eq(messages.senderId, userId),
              eq(messages.recipientId, request.user.id),
              eq(messages.isDeletedByRecipient, false)
            )
          )
        );

      // 将该用户的未读消息全部标记为已读
      await db
        .update(messages)
        .set({ isRead: true, readAt: new Date() })
        .where(
          and(
            eq(messages.senderId, userId),
            eq(messages.recipientId, request.user.id),
            eq(messages.isRead, false)
          )
        );

      return {
        otherUser,
        items: conversation,
        page,
        limit,
        total,
      };
    }
  );
}
