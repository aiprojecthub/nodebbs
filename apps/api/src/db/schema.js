import {
  integer,
  pgTable,
  varchar,
  text,
  timestamp,
  boolean,
  index,
  unique,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// ============ 通用字段 ============
const $id = integer('id').primaryKey().generatedAlwaysAsIdentity();

export const $createdAt = timestamp('created_at', {
  withTimezone: true,
}).defaultNow();

export const $updatedAt = timestamp('updated_at', {
  withTimezone: true,
})
  .defaultNow()
  .$onUpdate(() => new Date());

export const $ts = {
  createdAt: $createdAt,
  updatedAt: $updatedAt,
};

export const $defaults = {
  id: $id,
  ...$ts,
};

// ============ Users ============
export const users = pgTable(
  'users',
  {
    ...$defaults,
    username: varchar('username', { length: 50 }).notNull().unique(),
    email: varchar('email', { length: 255 }).notNull().unique(),
    passwordHash: varchar('password_hash', { length: 255 }), // 可选，OAuth 用户可能没有密码
    name: varchar('name', { length: 255 }),
    bio: text('bio'),
    avatar: varchar('avatar', { length: 500 }),
    role: varchar('role', { length: 20 }).notNull().default('user'), // user, vip, moderator, admin
    isBanned: boolean('is_banned').notNull().default(false),
    isEmailVerified: boolean('is_email_verified').notNull().default(false),
    isDeleted: boolean('is_deleted').notNull().default(false),
    deletedAt: timestamp('deleted_at'),
    lastSeenAt: timestamp('last_seen_at'),
    messagePermission: varchar('message_permission', { length: 20 })
      .notNull()
      .default('everyone'), // 'everyone', 'followers', 'disabled'
    contentVisibility: varchar('content_visibility', { length: 20 })
      .notNull()
      .default('everyone'), // 'everyone', 'authenticated', 'private'
    // 用户名修改相关字段
    usernameChangedAt: timestamp('username_changed_at'),
    usernameChangeCount: integer('username_change_count').notNull().default(0),
  },
  (table) => [
    index('users_email_idx').on(table.email),
    index('users_username_idx').on(table.username),
  ]
);

export const usersRelations = relations(users, ({ one, many }) => ({
  topicsAuthored: many(topics, { relationName: 'author' }),
  topicsLastPosted: many(topics, { relationName: 'lastPoster' }),
  posts: many(posts),
  likes: many(likes),
  bookmarks: many(bookmarks),
  notificationsReceived: many(notifications, { relationName: 'notificationReceiver' }),
  notificationsSent: many(notifications, { relationName: 'notificationSender' }),
  follows: many(follows, { relationName: 'follower' }),
  followers: many(follows, { relationName: 'following' }),
  accounts: many(accounts),
  sessions: many(sessions),
  verifications: many(verifications),
  createdInvitations: many(invitationCodes, {
    relationName: 'createdInvitations',
  }),
  usedInvitations: many(invitationCodes, { relationName: 'usedInvitations' }),
  // Credit System Relations
  creditAccount: one(userCredits),
  creditTransactions: many(creditTransactions),
  sentRewards: many(postRewards, { relationName: 'sentRewards' }),
  receivedRewards: many(postRewards, { relationName: 'receivedRewards' }),
  userItems: many(userItems),
}));

// ============ Categories ============
export const categories = pgTable(
  'categories',
  {
    ...$defaults,
    name: varchar('name', { length: 100 }).notNull(),
    slug: varchar('slug', { length: 100 }).notNull().unique(),
    description: text('description'),
    color: varchar('color', { length: 7 }).default('#000000'),
    icon: varchar('icon', { length: 50 }),
    parentId: integer('parent_id').references(() => categories.id, {
      onDelete: 'set null',
    }),
    position: integer('position').notNull().default(0),
    isPrivate: boolean('is_private').notNull().default(false),
    isFeatured: boolean('is_featured').notNull().default(false),
  },
  (table) => [
    index('categories_slug_idx').on(table.slug),
    index('categories_parent_idx').on(table.parentId),
    index('categories_is_featured_idx').on(table.isFeatured),
  ]
);

export const categoriesRelations = relations(categories, ({ one, many }) => ({
  parent: one(categories, {
    fields: [categories.parentId],
    references: [categories.id],
    relationName: 'subcategories',
  }),
  subcategories: many(categories, { relationName: 'subcategories' }),
  topics: many(topics),
}));

// ============ Topics ============
export const topics = pgTable(
  'topics',
  {
    ...$defaults,
    title: varchar('title', { length: 255 }).notNull(),
    slug: varchar('slug', { length: 255 }).notNull(),
    categoryId: integer('category_id')
      .notNull()
      .references(() => categories.id, { onDelete: 'cascade' }),
    userId: integer('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    viewCount: integer('view_count').notNull().default(0),
    postCount: integer('post_count').notNull().default(0),
    isPinned: boolean('is_pinned').notNull().default(false),
    isClosed: boolean('is_closed').notNull().default(false),
    isDeleted: boolean('is_deleted').notNull().default(false),
    approvalStatus: varchar('approval_status', { length: 20 })
      .notNull()
      .default('approved'), // 'pending', 'approved', 'rejected'
    lastPostAt: timestamp('last_post_at'),
    lastPostUserId: integer('last_post_user_id').references(() => users.id),
  },
  (table) => [
    index('topics_slug_idx').on(table.slug),
    index('topics_category_idx').on(table.categoryId),
    index('topics_user_idx').on(table.userId),
    index('topics_created_at_idx').on(table.createdAt),
    index('topics_last_post_at_idx').on(table.lastPostAt),
  ]
);

export const topicsRelations = relations(topics, ({ one, many }) => ({
  category: one(categories, {
    fields: [topics.categoryId],
    references: [categories.id],
  }),
  user: one(users, {
    fields: [topics.userId],
    references: [users.id],
    relationName: 'author',
  }),
  lastPostUser: one(users, {
    fields: [topics.lastPostUserId],
    references: [users.id],
    relationName: 'lastPoster',
  }),
  posts: many(posts),
  tags: many(topicTags),
  bookmarks: many(bookmarks),
}));

// ============ Posts ============
export const posts = pgTable(
  'posts',
  {
    ...$defaults,
    topicId: integer('topic_id')
      .notNull()
      .references(() => topics.id, { onDelete: 'cascade' }),
    userId: integer('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    content: text('content').notNull(),
    rawContent: text('raw_content').notNull(),
    postNumber: integer('post_number').notNull(), // Position in topic
    replyToPostId: integer('reply_to_post_id').references(() => posts.id),
    likeCount: integer('like_count').notNull().default(0),
    isDeleted: boolean('is_deleted').notNull().default(false),
    approvalStatus: varchar('approval_status', { length: 20 })
      .notNull()
      .default('approved'), // 'pending', 'approved', 'rejected'
    deletedAt: timestamp('deleted_at'),
    deletedBy: integer('deleted_by').references(() => users.id),
    editedAt: timestamp('edited_at'),
    editCount: integer('edit_count').notNull().default(0),
  },
  (table) => [
    index('posts_topic_idx').on(table.topicId),
    index('posts_user_idx').on(table.userId),
    index('posts_created_at_idx').on(table.createdAt),
    index('posts_reply_to_idx').on(table.replyToPostId),
  ]
);

export const postsRelations = relations(posts, ({ one, many }) => ({
  topic: one(topics, {
    fields: [posts.topicId],
    references: [topics.id],
  }),
  user: one(users, {
    fields: [posts.userId],
    references: [users.id],
  }),
  replyToPost: one(posts, {
    fields: [posts.replyToPostId],
    references: [posts.id],
    relationName: 'replies',
  }),
  replies: many(posts, { relationName: 'replies' }),
  likes: many(likes),
  rewards: many(postRewards),
}));

// ============ Tags ============
export const tags = pgTable(
  'tags',
  {
    ...$defaults,
    name: varchar('name', { length: 50 }).notNull().unique(),
    slug: varchar('slug', { length: 50 }).notNull().unique(),
    description: text('description'),
    color: varchar('color', { length: 7 }).default('#000000'),
    topicCount: integer('topic_count').notNull().default(0),
  },
  (table) => [
    index('tags_slug_idx').on(table.slug),
    index('tags_name_idx').on(table.name),
  ]
);

export const tagsRelations = relations(tags, ({ many }) => ({
  topics: many(topicTags),
}));

// ============ Topic Tags (Join Table) ============
export const topicTags = pgTable(
  'topic_tags',
  {
    topicId: integer('topic_id')
      .notNull()
      .references(() => topics.id, { onDelete: 'cascade' }),
    tagId: integer('tag_id')
      .notNull()
      .references(() => tags.id, { onDelete: 'cascade' }),
    createdAt: $createdAt,
  },
  (table) => [
    unique().on(table.topicId, table.tagId),
    index('topic_tags_topic_idx').on(table.topicId),
    index('topic_tags_tag_idx').on(table.tagId),
  ]
);

export const topicTagsRelations = relations(topicTags, ({ one }) => ({
  topic: one(topics, {
    fields: [topicTags.topicId],
    references: [topics.id],
  }),
  tag: one(tags, {
    fields: [topicTags.tagId],
    references: [tags.id],
  }),
}));

// ============ Likes ============
export const likes = pgTable(
  'likes',
  {
    ...$defaults,
    userId: integer('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    postId: integer('post_id')
      .notNull()
      .references(() => posts.id, { onDelete: 'cascade' }),
  },
  (table) => [
    unique().on(table.userId, table.postId),
    index('likes_user_idx').on(table.userId),
    index('likes_post_idx').on(table.postId),
  ]
);

export const likesRelations = relations(likes, ({ one }) => ({
  user: one(users, {
    fields: [likes.userId],
    references: [users.id],
  }),
  post: one(posts, {
    fields: [likes.postId],
    references: [posts.id],
  }),
}));

// ============ Bookmarks ============
export const bookmarks = pgTable(
  'bookmarks',
  {
    ...$defaults,
    userId: integer('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    topicId: integer('topic_id')
      .notNull()
      .references(() => topics.id, { onDelete: 'cascade' }),
  },
  (table) => [
    unique().on(table.userId, table.topicId),
    index('bookmarks_user_idx').on(table.userId),
    index('bookmarks_topic_idx').on(table.topicId),
  ]
);

export const bookmarksRelations = relations(bookmarks, ({ one }) => ({
  user: one(users, {
    fields: [bookmarks.userId],
    references: [users.id],
  }),
  topic: one(topics, {
    fields: [bookmarks.topicId],
    references: [topics.id],
  }),
}));

// ============ Subscriptions (Topic Watch) ============
export const subscriptions = pgTable(
  'subscriptions',
  {
    ...$defaults,
    userId: integer('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    topicId: integer('topic_id')
      .notNull()
      .references(() => topics.id, { onDelete: 'cascade' }),
  },
  (table) => [
    unique().on(table.userId, table.topicId),
    index('subscriptions_user_idx').on(table.userId),
    index('subscriptions_topic_idx').on(table.topicId),
  ]
);

export const subscriptionsRelations = relations(subscriptions, ({ one }) => ({
  user: one(users, {
    fields: [subscriptions.userId],
    references: [users.id],
  }),
  topic: one(topics, {
    fields: [subscriptions.topicId],
    references: [topics.id],
  }),
}));

// ============ Follows (User following) ============
export const follows = pgTable(
  'follows',
  {
    ...$defaults,
    followerId: integer('follower_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    followingId: integer('following_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
  },
  (table) => [
    unique().on(table.followerId, table.followingId),
    index('follows_follower_idx').on(table.followerId),
    index('follows_following_idx').on(table.followingId),
  ]
);

export const followsRelations = relations(follows, ({ one }) => ({
  follower: one(users, {
    fields: [follows.followerId],
    references: [users.id],
    relationName: 'follower',
  }),
  following: one(users, {
    fields: [follows.followingId],
    references: [users.id],
    relationName: 'following',
  }),
}));

// ============ Notifications ============
export const notifications = pgTable(
  'notifications',
  {
    ...$defaults,
    userId: integer('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    type: varchar('type', { length: 50 }).notNull(), // mention, reply, like, follow, etc.
    triggeredByUserId: integer('triggered_by_user_id').references(
      () => users.id,
      { onDelete: 'cascade' }
    ),
    topicId: integer('topic_id').references(() => topics.id, {
      onDelete: 'cascade',
    }),
    postId: integer('post_id').references(() => posts.id, {
      onDelete: 'cascade',
    }),
    message: text('message').notNull(),
    isRead: boolean('is_read').notNull().default(false),
  },
  (table) => [
    index('notifications_user_idx').on(table.userId),
    index('notifications_is_read_idx').on(table.isRead),
    index('notifications_created_at_idx').on(table.createdAt),
  ]
);

export const notificationsRelations = relations(notifications, ({ one }) => ({
  user: one(users, {
    fields: [notifications.userId],
    references: [users.id],
    relationName: 'notificationReceiver',
  }),
  triggeredByUser: one(users, {
    fields: [notifications.triggeredByUserId],
    references: [users.id],
    relationName: 'notificationSender',
  }),
  topic: one(topics, {
    fields: [notifications.topicId],
    references: [topics.id],
  }),
  post: one(posts, {
    fields: [notifications.postId],
    references: [posts.id],
  }),
}));

// ============ Messages (Private Messages / 站内信) ============
export const messages = pgTable(
  'messages',
  {
    ...$defaults,
    senderId: integer('sender_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    recipientId: integer('recipient_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    subject: varchar('subject', { length: 255 }),
    content: text('content').notNull(),
    isRead: boolean('is_read').notNull().default(false),
    readAt: timestamp('read_at'),
    isDeletedBySender: boolean('is_deleted_by_sender').notNull().default(false),
    isDeletedByRecipient: boolean('is_deleted_by_recipient')
      .notNull()
      .default(false),
  },
  (table) => [
    index('messages_sender_idx').on(table.senderId),
    index('messages_recipient_idx').on(table.recipientId),
    index('messages_is_read_idx').on(table.isRead),
    index('messages_created_at_idx').on(table.createdAt),
  ]
);

export const messagesRelations = relations(messages, ({ one }) => ({
  sender: one(users, {
    fields: [messages.senderId],
    references: [users.id],
    relationName: 'sentMessages',
  }),
  recipient: one(users, {
    fields: [messages.recipientId],
    references: [users.id],
    relationName: 'receivedMessages',
  }),
}));

// ============ Reports (举报) ============
export const reports = pgTable(
  'reports',
  {
    ...$defaults,
    reportType: varchar('report_type', { length: 20 }).notNull(), // topic, post, user
    targetId: integer('target_id').notNull(), // 被举报对象的ID
    reporterId: integer('reporter_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }), // 举报人
    reason: text('reason').notNull(), // 举报原因
    status: varchar('status', { length: 20 }).notNull().default('pending'), // pending, resolved, dismissed
    resolvedBy: integer('resolved_by').references(() => users.id), // 处理人
    resolvedAt: timestamp('resolved_at'), // 处理时间
    resolverNote: text('resolver_note'), // 处理备注
  },
  (table) => [
    index('reports_type_idx').on(table.reportType),
    index('reports_target_idx').on(table.targetId),
    index('reports_reporter_idx').on(table.reporterId),
    index('reports_status_idx').on(table.status),
  ]
);

export const reportsRelations = relations(reports, ({ one }) => ({
  reporter: one(users, {
    fields: [reports.reporterId],
    references: [users.id],
    relationName: 'reporter',
  }),
  resolver: one(users, {
    fields: [reports.resolvedBy],
    references: [users.id],
    relationName: 'resolver',
  }),
}));

// ============ Moderation Logs (审核日志) ============
export const moderationLogs = pgTable(
  'moderation_logs',
  {
    ...$defaults,
    action: varchar('action', { length: 20 }).notNull(), // 'approve', 'reject', 'delete', 'restore', 'close', 'open', 'pin', 'unpin'
    targetType: varchar('target_type', { length: 20 }).notNull(), // 'topic', 'post', 'user'
    targetId: integer('target_id').notNull(), // 目标对象的ID
    moderatorId: integer('moderator_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }), // 执行操作的版主/管理员
    reason: text('reason'), // 操作原因/备注
    previousStatus: varchar('previous_status', { length: 20 }), // 操作前的状态
    newStatus: varchar('new_status', { length: 20 }), // 操作后的状态
    metadata: text('metadata'), // 额外的元数据（JSON格式）
  },
  (table) => [
    index('moderation_logs_action_idx').on(table.action),
    index('moderation_logs_target_type_idx').on(table.targetType),
    index('moderation_logs_target_id_idx').on(table.targetId),
    index('moderation_logs_moderator_idx').on(table.moderatorId),
    index('moderation_logs_created_at_idx').on(table.createdAt),
  ]
);

export const moderationLogsRelations = relations(moderationLogs, ({ one }) => ({
  moderator: one(users, {
    fields: [moderationLogs.moderatorId],
    references: [users.id],
    relationName: 'moderator',
  }),
}));

// ============ Blocked Users (拉黑用户) ============
export const blockedUsers = pgTable(
  'blocked_users',
  {
    ...$defaults,
    userId: integer('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }), // 拉黑操作的用户
    blockedUserId: integer('blocked_user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }), // 被拉黑的用户
    reason: text('reason'), // 拉黑原因（可选）
  },
  (table) => [
    index('blocked_users_user_idx').on(table.userId),
    index('blocked_users_blocked_user_idx').on(table.blockedUserId),
    unique('unique_block').on(table.userId, table.blockedUserId),
  ]
);

export const blockedUsersRelations = relations(blockedUsers, ({ one }) => ({
  user: one(users, {
    fields: [blockedUsers.userId],
    references: [users.id],
    relationName: 'blocker',
  }),
  blockedUser: one(users, {
    fields: [blockedUsers.blockedUserId],
    references: [users.id],
    relationName: 'blocked',
  }),
}));

// ============ System Settings (系统配置) ============
export const systemSettings = pgTable(
  'system_settings',
  {
    ...$defaults,
    key: varchar('key', { length: 100 }).notNull().unique(),
    value: text('value').notNull(),
    valueType: varchar('value_type', { length: 20 }).notNull(), // 'string', 'boolean', 'number'
    description: text('description'),
    updatedBy: integer('updated_by').references(() => users.id),
  },
  (table) => [index('system_settings_key_idx').on(table.key)]
);

export const systemSettingsRelations = relations(systemSettings, ({ one }) => ({
  updater: one(users, {
    fields: [systemSettings.updatedBy],
    references: [users.id],
  }),
}));

// ============ OAuth Accounts (第三方账号关联) ============
export const accounts = pgTable(
  'accounts',
  {
    ...$defaults,
    userId: integer('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    provider: varchar('provider', { length: 50 }).notNull(), // 'github', 'google', 'apple', 'wechat'
    providerAccountId: varchar('provider_account_id', {
      length: 255,
    }).notNull(), // OAuth 提供商的用户 ID
    accessToken: text('access_token'),
    refreshToken: text('refresh_token'),
    expiresAt: timestamp('expires_at'),
    tokenType: varchar('token_type', { length: 50 }),
    scope: text('scope'),
    idToken: text('id_token'),
  },
  (table) => [
    index('accounts_user_id_idx').on(table.userId),
    index('accounts_provider_idx').on(table.provider),
    unique('accounts_provider_account_unique').on(
      table.provider,
      table.providerAccountId
    ),
  ]
);

export const accountsRelations = relations(accounts, ({ one }) => ({
  user: one(users, {
    fields: [accounts.userId],
    references: [users.id],
  }),
}));

// ============ Sessions (会话管理) ============
export const sessions = pgTable(
  'sessions',
  {
    ...$defaults,
    userId: integer('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    token: varchar('token', { length: 255 }).notNull().unique(),
    expiresAt: timestamp('expires_at').notNull(),
    ipAddress: varchar('ip_address', { length: 45 }),
    userAgent: text('user_agent'),
  },
  (table) => [
    index('sessions_user_id_idx').on(table.userId),
    index('sessions_token_idx').on(table.token),
    index('sessions_expires_at_idx').on(table.expiresAt),
  ]
);

export const sessionsRelations = relations(sessions, ({ one }) => ({
  user: one(users, {
    fields: [sessions.userId],
    references: [users.id],
  }),
}));

// ============ Invitation Codes (邀请码) ============
export const invitationCodes = pgTable(
  'invitation_codes',
  {
    ...$defaults,
    code: varchar('code', { length: 32 }).notNull().unique(),
    createdBy: integer('created_by')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    usedBy: integer('used_by').references(() => users.id, {
      onDelete: 'set null',
    }),
    status: varchar('status', { length: 20 }).notNull().default('active'),
    maxUses: integer('max_uses').notNull().default(1),
    usedCount: integer('used_count').notNull().default(0),
    expiresAt: timestamp('expires_at', { withTimezone: true }),
    note: text('note'),
    usedAt: timestamp('used_at', { withTimezone: true }),
  },
  (table) => [
    index('invitation_codes_code_idx').on(table.code),
    index('invitation_codes_created_by_idx').on(table.createdBy),
    index('invitation_codes_used_by_idx').on(table.usedBy),
    index('invitation_codes_status_idx').on(table.status),
    index('invitation_codes_created_at_idx').on(table.createdAt),
    index('invitation_codes_expires_at_idx').on(table.expiresAt),
  ]
);

export const invitationCodesRelations = relations(
  invitationCodes,
  ({ one }) => ({
    creator: one(users, {
      fields: [invitationCodes.createdBy],
      references: [users.id],
      relationName: 'createdInvitations',
    }),
    user: one(users, {
      fields: [invitationCodes.usedBy],
      references: [users.id],
      relationName: 'usedInvitations',
    }),
  })
);

// ============ Invitation Rules (邀请规则) ============
export const invitationRules = pgTable(
  'invitation_rules',
  {
    ...$defaults,
    role: varchar('role', { length: 20 }).notNull().default('user').unique(),
    dailyLimit: integer('daily_limit').notNull().default(1),
    maxUsesPerCode: integer('max_uses_per_code').notNull().default(1),
    expireDays: integer('expire_days').notNull().default(30),
    pointsCost: integer('points_cost').notNull().default(0),
    isActive: boolean('is_active').notNull().default(true),
  },
  (table) => [
    index('invitation_rules_role_idx').on(table.role),
    index('invitation_rules_is_active_idx').on(table.isActive),
  ]
);

export const invitationRulesRelations = relations(invitationRules, () => ({}));

// ============ OAuth Providers (OAuth 提供商配置) ============
export const oauthProviders = pgTable(
  'oauth_providers',
  {
    ...$defaults,
    provider: varchar('provider', { length: 50 }).notNull().unique(), // 'github', 'google', 'apple'
    isEnabled: boolean('is_enabled').notNull().default(false),
    clientId: varchar('client_id', { length: 255 }),
    clientSecret: text('client_secret'), // 加密存储
    callbackUrl: varchar('callback_url', { length: 500 }),
    scope: text('scope'), // JSON array of scopes
    additionalConfig: text('additional_config'), // JSON for provider-specific config
    displayName: varchar('display_name', { length: 100 }),
    displayOrder: integer('display_order').notNull().default(0),
  },
  (table) => [
    index('oauth_providers_provider_idx').on(table.provider),
    index('oauth_providers_is_enabled_idx').on(table.isEnabled),
    index('oauth_providers_display_order_idx').on(table.displayOrder),
  ]
);

export const oauthProvidersRelations = relations(oauthProviders, () => ({}));

// ============ Email Providers (邮件服务提供商配置) ============
export const emailProviders = pgTable(
  'email_providers',
  {
    ...$defaults,
    provider: varchar('provider', { length: 50 }).notNull().unique(), // 'smtp', 'sendgrid', 'resend', 'aliyun'
    isEnabled: boolean('is_enabled').notNull().default(false),
    isDefault: boolean('is_default').notNull().default(false), // 是否为默认提供商
    // SMTP 通用配置
    smtpHost: varchar('smtp_host', { length: 255 }),
    smtpPort: integer('smtp_port'),
    smtpSecure: boolean('smtp_secure').default(true), // 是否使用 TLS/SSL
    smtpUser: varchar('smtp_user', { length: 255 }),
    smtpPassword: text('smtp_password'), // 加密存储
    // 发件人信息
    fromEmail: varchar('from_email', { length: 255 }),
    fromName: varchar('from_name', { length: 255 }),
    // API 配置（用于 SendGrid、Resend 等）
    apiKey: text('api_key'), // 加密存储
    apiEndpoint: varchar('api_endpoint', { length: 500 }),
    // 其他配置
    additionalConfig: text('additional_config'), // JSON for provider-specific config
    displayName: varchar('display_name', { length: 100 }),
    displayOrder: integer('display_order').notNull().default(0),
  },
  (table) => [
    index('email_providers_provider_idx').on(table.provider),
    index('email_providers_is_enabled_idx').on(table.isEnabled),
    index('email_providers_is_default_idx').on(table.isDefault),
    index('email_providers_display_order_idx').on(table.displayOrder),
  ]
);

export const emailProvidersRelations = relations(emailProviders, () => ({}));

// ============ Verifications (验证码表 - Better Auth 规范) ============
export const verifications = pgTable(
  'verifications',
  {
    ...$defaults,
    identifier: varchar('identifier', { length: 255 }).notNull(), // 邮箱、手机号等标识符
    value: varchar('value', { length: 255 }).notNull(), // 验证码或 token
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    type: varchar('type', { length: 50 }).notNull(), // 'email_verification', 'password_reset', '2fa', etc.
    userId: integer('user_id').references(() => users.id, {
      onDelete: 'cascade',
    }), // 可选，关联用户
  },
  (table) => [
    index('verifications_identifier_idx').on(table.identifier),
    index('verifications_value_idx').on(table.value),
    index('verifications_type_idx').on(table.type),
    index('verifications_user_id_idx').on(table.userId),
    index('verifications_expires_at_idx').on(table.expiresAt),
    // 组合索引：快速查找特定类型和标识符的验证码
    index('verifications_type_identifier_idx').on(table.type, table.identifier),
  ]
);

export const verificationsRelations = relations(verifications, ({ one }) => ({
  user: one(users, {
    fields: [verifications.userId],
    references: [users.id],
  }),
}));

// ============ QR Login Requests (扫码登录请求) ============
export const qrLoginRequests = pgTable(
  'qr_login_requests',
  {
    ...$defaults,
    requestId: varchar('request_id', { length: 64 }).notNull().unique(), // 唯一请求ID
    status: varchar('status', { length: 20 }).notNull().default('pending'), // 'pending', 'confirmed', 'expired', 'cancelled'
    userId: integer('user_id').references(() => users.id, {
      onDelete: 'set null',
    }), // 确认登录的用户ID（确认后填充）
    token: text('token'), // 生成的JWT token（确认后填充）
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    ipAddress: varchar('ip_address', { length: 45 }), // 发起请求的IP
    userAgent: text('user_agent'), // 发起请求的User-Agent
    confirmedAt: timestamp('confirmed_at', { withTimezone: true }), // 确认时间
    confirmedIp: varchar('confirmed_ip', { length: 45 }), // 确认登录的IP（App端）
  },
  (table) => [
    index('qr_login_requests_request_id_idx').on(table.requestId),
    index('qr_login_requests_status_idx').on(table.status),
    index('qr_login_requests_expires_at_idx').on(table.expiresAt),
    index('qr_login_requests_user_id_idx').on(table.userId),
  ]
);

export const qrLoginRequestsRelations = relations(qrLoginRequests, ({ one }) => ({
  user: one(users, {
    fields: [qrLoginRequests.userId],
    references: [users.id],
  }),
}));

// ============ Credit System (Imported from Plugin) ============
export * from '../features/credits/schema.js';
export * from '../features/shop/schema.js';
export * from '../features/badges/schema.js';
