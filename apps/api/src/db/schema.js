import {
  pgTable,
  varchar,
  text,
  timestamp,
  boolean,
  index,
  unique,
  uniqueIndex,
  integer,
  jsonb,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { $createdAt, $defaults } from './columns.js';

// ============ Users (用户) ============
export const users = pgTable(
  'users',
  {
    ...$defaults,
    username: varchar('username', { length: 50 }).notNull().unique(),
    email: varchar('email', { length: 255 }).unique(),
    passwordHash: varchar('password_hash', { length: 255 }), // 可选，OAuth 用户可能没有密码
    phone: varchar('phone', { length: 20 }).unique(),
    isPhoneVerified: boolean('is_phone_verified').notNull().default(false),
    name: varchar('name', { length: 255 }),
    bio: text('bio'),
    avatar: varchar('avatar', { length: 500 }),
    role: varchar('role', { length: 20 }).notNull().default('user'), // user (用户), admin (管理员)
    isBanned: boolean('is_banned').notNull().default(false),
    bannedUntil: timestamp('banned_until', { withTimezone: true }), // 封禁到期时间（null=永久）
    bannedReason: text('banned_reason'), // 封禁原因
    bannedBy: integer('banned_by'), // 封禁操作者 ID
    isEmailVerified: boolean('is_email_verified').notNull().default(false),
    isDeleted: boolean('is_deleted').notNull().default(false),
    deletedAt: timestamp('deleted_at'),
    lastSeenAt: timestamp('last_seen_at'),
    messagePermission: varchar('message_permission', { length: 20 })
      .notNull()
      .default('everyone'), // 'everyone' (所有人), 'followers' (粉丝), 'disabled' (关闭)
    contentVisibility: varchar('content_visibility', { length: 20 })
      .notNull()
      .default('everyone'), // 'everyone' (所有人), 'authenticated' (登录用户), 'private' (仅自己)
    // IP 记录
    registrationIp: varchar('registration_ip', { length: 45 }),
    lastLoginIp: varchar('last_login_ip', { length: 45 }),
    // 用户名修改相关字段
    usernameChangedAt: timestamp('username_changed_at'),
    usernameChangeCount: integer('username_change_count').notNull().default(0),
    // 账号注销相关字段
    deletionRequestedAt: timestamp('deletion_requested_at', { withTimezone: true }), // 用户自助注销请求时间
    deletionReason: text('deletion_reason'), // 注销原因（可选）
  },
  (table) => [
    index('users_email_idx').on(table.email),
    index('users_username_idx').on(table.username),
    index('users_phone_idx').on(table.phone),
  ]
);

export const usersRelations = relations(users, ({ one, many }) => ({
  // 论坛内容关联（topics/posts/likes/bookmarks）已随论坛 schema 迁出；
  // 反向关系由 modules/forum/db/schema.js 中的 topicsRelations.user 等承载。
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
  files: many(files),
}));


// ============ Follows (用户关注) ============
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

// ============ Notifications (通知) ============
export const notifications = pgTable(
  'notifications',
  {
    ...$defaults,
    userId: integer('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    type: varchar('type', { length: 50 }).notNull(), // mention (提及), reply (回复), like (点赞), follow (关注), reward_topic (打赏话题), reward_reply (打赏帖子) 等
    triggeredByUserId: integer('triggered_by_user_id').references(
      () => users.id,
      { onDelete: 'cascade' }
    ),
    topicId: integer('topic_id'),
    postId: integer('post_id'),
    message: text('message').notNull(),
    metadata: text('metadata'), // 额外数据的 JSON 字符串（例如徽章信息、打赏金额）
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
  // topic/post 关系已随论坛 schema 迁出；通知路由通过列 topicId/postId + 显式 join 取用，
  // 不再使用 drizzle 关系（原 with:{topic} 未被使用）。
}));

// ============ Conversations (会话) ============
export const conversations = pgTable(
  'conversations',
  {
    ...$defaults,
    user1Id: integer('user1_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }), // 始终为较小的 userId
    user2Id: integer('user2_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }), // 始终为较大的 userId
    lastMessageId: integer('last_message_id'), // FK 在 messages 定义后手动处理
    lastMessageAt: timestamp('last_message_at', { withTimezone: true }),
    user1UnreadCount: integer('user1_unread_count').notNull().default(0),
    user2UnreadCount: integer('user2_unread_count').notNull().default(0),
    isDeletedByUser1: boolean('is_deleted_by_user1').notNull().default(false),
    isDeletedByUser2: boolean('is_deleted_by_user2').notNull().default(false),
  },
  (table) => [
    unique('conversations_user_pair').on(table.user1Id, table.user2Id),
    index('conversations_user1_idx').on(table.user1Id),
    index('conversations_user2_idx').on(table.user2Id),
    index('conversations_last_message_at_idx').on(table.lastMessageAt),
  ]
);

export const conversationsRelations = relations(conversations, ({ one, many }) => ({
  user1: one(users, {
    fields: [conversations.user1Id],
    references: [users.id],
    relationName: 'conversationsAsUser1',
  }),
  user2: one(users, {
    fields: [conversations.user2Id],
    references: [users.id],
    relationName: 'conversationsAsUser2',
  }),
  lastMessage: one(messages, {
    fields: [conversations.lastMessageId],
    references: [messages.id],
  }),
  messages: many(messages),
}));

// ============ Messages (私信) ============
export const messages = pgTable(
  'messages',
  {
    ...$defaults,
    conversationId: integer('conversation_id')
      .notNull()
      .references(() => conversations.id, { onDelete: 'cascade' }),
    senderId: integer('sender_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    recipientId: integer('recipient_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    content: text('content').notNull(),
    isRead: boolean('is_read').notNull().default(false),
    readAt: timestamp('read_at'),
    isDeletedBySender: boolean('is_deleted_by_sender').notNull().default(false),
    isDeletedByRecipient: boolean('is_deleted_by_recipient')
      .notNull()
      .default(false),
  },
  (table) => [
    index('messages_conversation_idx').on(table.conversationId),
    index('messages_sender_idx').on(table.senderId),
    index('messages_recipient_idx').on(table.recipientId),
    index('messages_is_read_idx').on(table.isRead),
    index('messages_created_at_idx').on(table.createdAt),
    index('messages_conversation_created_at_idx').on(table.conversationId, table.createdAt),
  ]
);

export const messagesRelations = relations(messages, ({ one }) => ({
  conversation: one(conversations, {
    fields: [messages.conversationId],
    references: [conversations.id],
  }),
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
    reportType: varchar('report_type', { length: 20 }).notNull(), // topic (话题), post (帖子), user (用户)
    targetId: integer('target_id').notNull(), // 被举报对象的ID
    reporterId: integer('reporter_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }), // 举报人
    reason: text('reason').notNull(), // 举报原因
    status: varchar('status', { length: 20 }).notNull().default('pending'), // pending (待处理), resolved (已解决), dismissed (已驳回)
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

// ============ Operation Logs (操作日志) ============
export const oplogs = pgTable(
  'oplogs',
  {
    ...$defaults,
    // action 值: approve, reject, ban, unban, username_change, email_bind, phone_bind,
    //            email_change, phone_change, request_deletion, restore, anonymize,
    //            edit_resubmit, resubmit
    action: varchar('action', { length: 50 }).notNull(),
    targetType: varchar('target_type', { length: 20 }).notNull(), // 'topic' (话题), 'post' (帖子), 'user' (用户)
    targetId: integer('target_id').notNull(), // 目标对象的ID
    moderatorId: integer('moderator_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }), // 执行操作的管理员/用户
    reason: text('reason'), // 操作原因/备注
    previousStatus: varchar('previous_status', { length: 20 }), // 操作前的状态
    newStatus: varchar('new_status', { length: 20 }), // 操作后的状态
    metadata: text('metadata'), // 额外的元数据（JSON格式）
    ip: varchar('ip', { length: 45 }), // 操作者 IP
    targetLabel: varchar('target_label', { length: 255 }), // 目标快照（话题标题/用户名等）
  },
  (table) => [
    index('oplogs_action_idx').on(table.action),
    index('oplogs_target_type_idx').on(table.targetType),
    index('oplogs_target_id_idx').on(table.targetId),
    index('oplogs_moderator_idx').on(table.moderatorId),
    index('oplogs_created_at_idx').on(table.createdAt),
  ]
);

export const oplogsRelations = relations(oplogs, ({ one }) => ({
  moderator: one(users, {
    fields: [oplogs.moderatorId],
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
    role: varchar('role', { length: 50 }).notNull().default('user').unique(),
    dailyLimit: integer('daily_limit').notNull().default(1),
    maxUsesPerCode: integer('max_uses_per_code').notNull().default(1),
    expireDays: integer('expire_days').notNull().default(30),
    pointsCost: integer('points_cost').notNull().default(0),
  },
  (table) => [
    index('invitation_rules_role_idx').on(table.role),
  ]
);

export const invitationRulesRelations = relations(invitationRules, () => ({}));

// ============ OAuth Providers (OAuth 提供商) ============
export const oauthProviders = pgTable(
  'oauth_providers',
  {
    ...$defaults,
    provider: varchar('provider', { length: 50 }).notNull().unique(), // 'github', 'google', 'apple'
    isEnabled: boolean('is_enabled').notNull().default(false),
    clientId: varchar('client_id', { length: 255 }),
    clientSecret: text('client_secret'), // 加密存储
    callbackUrl: varchar('callback_url', { length: 500 }),
    scope: text('scope'), // 权限范围的 JSON 数组
    additionalConfig: text('additional_config'), // 提供商特定配置的 JSON
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

// ============ Email Providers (邮件服务提供商) ============
export const emailProviders = pgTable(
  'email_providers',
  {
    ...$defaults,
    provider: varchar('provider', { length: 50 }).notNull().unique(), // 'smtp', 'sendgrid', 'resend', 'aliyun'
    isEnabled: boolean('is_enabled').notNull().default(false),
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
    additionalConfig: text('additional_config'), // 提供商特定配置的 JSON
    displayName: varchar('display_name', { length: 100 }),
    displayOrder: integer('display_order').notNull().default(0),
  },
  (table) => [
    index('email_providers_provider_idx').on(table.provider),
    index('email_providers_is_enabled_idx').on(table.isEnabled),
    index('email_providers_display_order_idx').on(table.displayOrder),
  ]
);

export const emailProvidersRelations = relations(emailProviders, () => ({}));

// ============ CAPTCHA Providers (人机验证提供商) ============
export const captchaProviders = pgTable(
  'captcha_providers',
  {
    ...$defaults,
    // === 核心字段（可索引、可查询）===
    provider: varchar('provider', { length: 50 }).notNull().unique(), // 'recaptcha', 'hcaptcha', 'turnstile'
    isEnabled: boolean('is_enabled').notNull().default(false),
    displayName: varchar('display_name', { length: 100 }),
    displayOrder: integer('display_order').notNull().default(0),
    // === 灵活配置（JSON 存储）===
    config: text('config'), // { siteKey, secretKey, verifyEndpoint, scoreThreshold, mode, ... }
    enabledScenes: text('enabled_scenes'), // { "register": true, "login": false, ... }
  },
  (table) => [
    index('captcha_providers_provider_idx').on(table.provider),
    index('captcha_providers_is_enabled_idx').on(table.isEnabled),
  ]
);

export const captchaProvidersRelations = relations(captchaProviders, () => ({}));

// ============ Verifications (验证码) ============
export const verifications = pgTable(
  'verifications',
  {
    ...$defaults,
    identifier: varchar('identifier', { length: 255 }).notNull(), // 邮箱、手机号等标识符
    value: varchar('value', { length: 255 }).notNull(), // 验证码或 token
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    type: varchar('type', { length: 50 }).notNull(), // 'email_verification' (邮箱验证), 'password_reset' (密码重置), '2fa' (双因素认证) 等
    attempts: integer('attempts').notNull().default(0), // 验证失败尝试次数
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

// ============ Files (文件管理) ============
export const files = pgTable(
  'files',
  {
    id: integer('id').primaryKey().generatedAlwaysAsIdentity(),
    userId: integer('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),

    // 文件信息
    filename: varchar('filename', { length: 255 }).notNull(), // UUID.ext
    originalName: varchar('original_name', { length: 255 }), // 原始文件名
    url: varchar('url', { length: 500 }).notNull(), // 访问路径
    category: varchar('category', { length: 50 }).notNull(), // avatars/topics/assets
    mimetype: varchar('mimetype', { length: 100 }).notNull(),
    size: integer('size').notNull(), // 字节

    // 图片属性（独立字段，查询频繁）
    width: integer('width'),
    height: integer('height'),

    // 存储服务商标识（记录文件存储在哪个服务商，便于旧文件读取）
    provider: varchar('provider', { length: 50 }).default('local'),

    // 扩展元数据（JSON）
    metadata: text('metadata'), // blurhash, exif, duration 等

    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  },
  (table) => [
    index('files_user_id_idx').on(table.userId),
    index('files_category_idx').on(table.category),
    index('files_created_at_idx').on(table.createdAt),
  ]
);

export const filesRelations = relations(files, ({ one }) => ({
  user: one(users, {
    fields: [files.userId],
    references: [users.id],
  }),
}));

// ============ Pages (页面管理) ============
export const pages = pgTable(
  'pages',
  {
    ...$defaults,
    title: varchar('title', { length: 255 }).notNull(),
    slug: varchar('slug', { length: 500 }).notNull().unique(),
    type: varchar('type', { length: 20 }).notNull(), // text | html | markdown | json
    content: text('content').notNull(),
    isPublished: boolean('is_published').notNull().default(false),
    standalone: boolean('standalone').notNull().default(false),
  },
  (table) => [
    index('pages_slug_idx').on(table.slug),
    index('pages_type_idx').on(table.type),
    index('pages_is_published_idx').on(table.isPublished),
  ]
);

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


// ============ Credit System (积分系统) ============
export * from '../extensions/rewards/schema.js';
export * from '../extensions/shop/schema.js';
export * from '../extensions/badges/schema.js';

// ============ Ledger System (账本系统) ============
export * from '../extensions/ledger/schema.js';

// ============ Ads System (广告系统) ============
export * from '../extensions/ads/schema.js';

// ============ Message System (消息系统) ============
export * from '../plugins/message/schema.js';

// ============ Storage System (存储系统) ============
export * from '../plugins/storage/schema.js';

// ============ RBAC System (权限系统) ============
export * from './rbac-schema.js';

// ============ Moderation System (通用内容审核) ============
export * from './moderation-schema.js';

// ============ Emoji Groups (表情包分组) ============
export * from '../extensions/emojis/schema.js';

// ============ 业务模块 schema（组合入口）============
// 论坛模块表（categories/topics/posts/tags/polls/lotteries/...）由模块自有 schema 定义，
// 在此 re-export，使 drizzle（db/index.js + drizzle.config.js）能看到全部表。
// core 不反向依赖模块（仅此组合入口知晓模块）。
//
// ⚠️ 加载顺序：本 re-export 必须保持在文件末尾（users 等 core 表已定义之后）。
//    模块 schema 会 `import { users } from '#core/db/schema.js'`，形成 core↔module 循环；
//    因 users 在文件靠前已定义、且模块仅在函数/关系内引用，循环可安全解析。勿将本行上移。
export * from '../modules/forum/db/schema.js';
