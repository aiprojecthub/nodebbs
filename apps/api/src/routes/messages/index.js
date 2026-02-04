import db from '../../db/index.js';
import { messages, users, blockedUsers, follows } from '../../db/schema.js';
import { eq, sql, desc, and, or, like, count } from 'drizzle-orm';

export default async function messageRoutes(fastify) {
  // Get conversations list (grouped by user)
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

      // Step 1: Get all messages involving current user
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

      // Step 2: Group by conversation partner and get latest message
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

        // Count unread messages from this user
        if (
          msg.senderId === otherUserId &&
          msg.recipientId === currentUserId &&
          !msg.isRead
        ) {
          conversationMap.get(otherUserId).unreadCount++;
        }
      }

      // Step 3: Convert to array and apply pagination
      const allConversations = Array.from(conversationMap.values());
      const paginatedConversations = allConversations.slice(
        offset,
        offset + limit
      );

      // Step 4: Get user details for paginated conversations
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

      // Step 5: Get total unread count
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

  // Get user's messages (inbox and sent) - kept for backward compatibility
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

      // Get total count with same conditions
      const [{ count: total }] = await db
        .select({ count: count() })
        .from(messages)
        .where(and(...conditions));

      // Get unread count (for inbox only)
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

  // Get single message
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

      // Check permissions
      if (
        message.senderId !== request.user.id &&
        message.recipientId !== request.user.id
      ) {
        return reply
          .code(403)
          .send({ error: '你没有权限查看该消息' });
      }

      // Mark as read if recipient is viewing
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

  // Send message
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

      // Check if recipient exists and get their settings
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

      // Cannot send message to self
      if (recipientId === request.user.id) {
        return reply
          .code(400)
          .send({ error: '不能给自己发消息' });
      }

      // Check recipient's message permission
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

      // Check if current user has disabled messages
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

      // Check if either user has blocked the other
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

      // Create message
      const [newMessage] = await db
        .insert(messages)
        .values({
          senderId: request.user.id,
          recipientId,
          subject: subject || null,
          content,
        })
        .returning();

      // Create notification for recipient
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

  // Delete message
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

      // Check permissions
      if (
        message.senderId !== request.user.id &&
        message.recipientId !== request.user.id
      ) {
        return reply
          .code(403)
          .send({ error: '你没有权限删除该消息' });
      }

      // Soft delete based on user role
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

  // Delete all messages with a specific user (conversation)
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

      // Check if the other user exists
      const [otherUser] = await db
        .select({ id: users.id })
        .from(users)
        .where(eq(users.id, userId))
        .limit(1);

      if (!otherUser) {
        return reply.code(404).send({ error: '用户不存在' });
      }

      // Soft delete all messages between current user and specified user
      // For messages sent by current user
      await db
        .update(messages)
        .set({ isDeletedBySender: true })
        .where(
          and(
            eq(messages.senderId, currentUserId),
            eq(messages.recipientId, userId)
          )
        );

      // For messages received by current user
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

  // Mark message as read
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

      // Only recipient can mark as read
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

  // Get conversation with a specific user
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

      // Check if the other user exists
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

      // Get all messages between current user and the specified user
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

      // Get total count
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

      // Mark all unread messages from this user as read
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
