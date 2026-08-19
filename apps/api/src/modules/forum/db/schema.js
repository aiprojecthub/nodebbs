/**
 * 论坛模块数据库 schema（P2：从 src/db/schema.js 拆出）。
 *
 * 依赖方向：modules/forum → core（仅引用 core 的 users 表与公共列定义）。
 * core 的 src/db/schema.js 在末尾 `export *` 本文件，作为 drizzle 的 schema 组合入口，
 * 因此现有从 '#core/db/schema.js' 导入论坛表的代码无需改动。
 */
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
import { $defaults, $createdAt } from '#core/db/columns.js';
import { users, files } from '#core/db/schema.js';

// ============ Categories (分类) ============
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

// ============ Topics (话题) ============
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
      .default('approved'), // 'pending' (待审核), 'approved' (已通过), 'rejected' (已拒绝)
    lastPostAt: timestamp('last_post_at'),
    lastPostUserId: integer('last_post_user_id').references(() => users.id, {
      onDelete: 'set null',
    }),
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

// ============ Posts (帖子) ============
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
      .default('approved'), // 'pending' (待审核), 'approved' (已通过), 'rejected' (已拒绝)
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
}));

// ============ Tags (标签) ============
export const tags = pgTable(
  'tags',
  {
    ...$defaults,
    name: varchar('name', { length: 50 }).notNull().unique(),
    slug: varchar('slug', { length: 50 }).notNull().unique(),
    description: text('description'),
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

// ============ Topic Tags (话题标签关联) ============
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

// ============ Likes (点赞) ============
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

// ============ Bookmarks (收藏) ============
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

// ============ Subscriptions (关注话题) ============
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

// ============ Polls (话题投票) ============
export const polls = pgTable(
  'polls',
  {
    ...$defaults,
    topicId: integer('topic_id').references(() => topics.id, { onDelete: 'cascade' }), // 允许 NULL：创建到绑定的过渡期
    userId: integer('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    question: text('question').notNull(),
    selectionType: varchar('selection_type', { length: 20 }).notNull(), // 'single' | 'multiple'
    maxChoices: integer('max_choices'), // 仅 selectionType='multiple' 用
    isAnonymous: boolean('is_anonymous').notNull().default(false),
    closedAt: timestamp('closed_at', { withTimezone: true }), // NULL = 永久开放
    totalVoters: integer('total_voters').notNull().default(0),
  },
  (table) => [
    index('polls_topic_idx').on(table.topicId),
    index('polls_user_idx').on(table.userId),
  ]
);

export const pollsRelations = relations(polls, ({ one, many }) => ({
  topic: one(topics, {
    fields: [polls.topicId],
    references: [topics.id],
  }),
  user: one(users, {
    fields: [polls.userId],
    references: [users.id],
  }),
  options: many(pollOptions),
  votes: many(pollVotes),
}));

// ============ Poll Options (投票选项) ============
export const pollOptions = pgTable(
  'poll_options',
  {
    ...$defaults,
    pollId: integer('poll_id')
      .notNull()
      .references(() => polls.id, { onDelete: 'cascade' }),
    text: text('text').notNull(),
    displayOrder: integer('display_order').notNull(),
    voteCount: integer('vote_count').notNull().default(0),
  },
  (table) => [
    uniqueIndex('poll_options_poll_order_idx').on(table.pollId, table.displayOrder),
  ]
);

export const pollOptionsRelations = relations(pollOptions, ({ one, many }) => ({
  poll: one(polls, {
    fields: [pollOptions.pollId],
    references: [polls.id],
  }),
  votes: many(pollVotes),
}));

// ============ Poll Votes (投票记录) ============
export const pollVotes = pgTable(
  'poll_votes',
  {
    ...$defaults,
    pollId: integer('poll_id')
      .notNull()
      .references(() => polls.id, { onDelete: 'cascade' }),
    optionId: integer('option_id')
      .notNull()
      .references(() => pollOptions.id, { onDelete: 'cascade' }),
    userId: integer('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
  },
  (table) => [
    uniqueIndex('poll_votes_poll_user_option_idx').on(table.pollId, table.userId, table.optionId),
    index('poll_votes_poll_option_idx').on(table.pollId, table.optionId),
  ]
);

export const pollVotesRelations = relations(pollVotes, ({ one }) => ({
  poll: one(polls, {
    fields: [pollVotes.pollId],
    references: [polls.id],
  }),
  option: one(pollOptions, {
    fields: [pollVotes.optionId],
    references: [pollOptions.id],
  }),
  user: one(users, {
    fields: [pollVotes.userId],
    references: [users.id],
  }),
}));

// ============ Lotteries (话题抽奖) ============
export const lotteries = pgTable(
  'lotteries',
  {
    ...$defaults,
    topicId: integer('topic_id').references(() => topics.id, { onDelete: 'cascade' }), // NULL = 草稿
    userId: integer('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    title: text('title').notNull(),
    description: text('description'),
    winnersCount: integer('winners_count').notNull(),
    pointsPerWinner: integer('points_per_winner').notNull().default(0),
    prizeDescription: text('prize_description'),
    prizeItems: jsonb('prize_items'), // 逐项奖品池：string[] | null；非空时跟 prizeDescription 互斥
    minAccountDays: integer('min_account_days').notNull().default(0),
    requireReply: boolean('require_reply').notNull().default(false),
    drawAt: timestamp('draw_at', { withTimezone: true }).notNull(),
    drawnAt: timestamp('drawn_at', { withTimezone: true }),
    status: varchar('status', { length: 20 }).notNull().default('pending'), // 'pending' | 'drawn' | 'cancelled'
    participantsCount: integer('participants_count').notNull().default(0),
    frozenPoints: integer('frozen_points').notNull().default(0),
  },
  (table) => [
    index('lotteries_topic_idx').on(table.topicId),
    index('lotteries_user_idx').on(table.userId),
    index('lotteries_status_drawat_idx').on(table.status, table.drawAt),
  ]
);

export const lotteryParticipants = pgTable(
  'lottery_participants',
  {
    ...$defaults,
    lotteryId: integer('lottery_id')
      .notNull()
      .references(() => lotteries.id, { onDelete: 'cascade' }),
    userId: integer('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    isWinner: boolean('is_winner').notNull().default(false),
    prizeItem: text('prize_item'), // 逐项模式下分到的奖品项；未中奖或共享模式为 NULL
  },
  (table) => [
    uniqueIndex('lottery_participants_lottery_user_idx').on(table.lotteryId, table.userId),
    index('lottery_participants_winner_idx').on(table.lotteryId, table.isWinner),
  ]
);

export const lotteryLedgerRefs = pgTable(
  'lottery_ledger_refs',
  {
    ...$defaults,
    lotteryId: integer('lottery_id')
      .notNull()
      .references(() => lotteries.id, { onDelete: 'cascade' }),
    referenceType: varchar('reference_type', { length: 20 }).notNull(), // 'freeze' | 'grant' | 'refund'
    referenceId: varchar('reference_id', { length: 100 }).notNull(),
    userId: integer('user_id').notNull().references(() => users.id),
    amount: integer('amount').notNull(),
  },
  (table) => [
    uniqueIndex('lottery_ledger_refs_type_ref_idx').on(table.referenceType, table.referenceId),
    index('lottery_ledger_refs_lottery_idx').on(table.lotteryId),
  ]
);

export const lotteriesRelations = relations(lotteries, ({ one, many }) => ({
  topic: one(topics, { fields: [lotteries.topicId], references: [topics.id] }),
  user: one(users, { fields: [lotteries.userId], references: [users.id] }),
  participants: many(lotteryParticipants),
  ledgerRefs: many(lotteryLedgerRefs),
}));

export const lotteryParticipantsRelations = relations(lotteryParticipants, ({ one }) => ({
  lottery: one(lotteries, { fields: [lotteryParticipants.lotteryId], references: [lotteries.id] }),
  user: one(users, { fields: [lotteryParticipants.userId], references: [users.id] }),
}));

export const lotteryLedgerRefsRelations = relations(lotteryLedgerRefs, ({ one }) => ({
  lottery: one(lotteries, { fields: [lotteryLedgerRefs.lotteryId], references: [lotteries.id] }),
  user: one(users, { fields: [lotteryLedgerRefs.userId], references: [users.id] }),
}));

// ============ Topic Attachments (话题附件) ============
//
// 一条附件 = 一个「附件组」，正文里对应一个 ::attachment{id="N"} 指令，组内可含多个文件。
// 下载策略、积分购买、权限判定都在组级别；下载与计数按文件粒度（见 topic_attachment_files）。
//
// 文件本体仍存 core 的 files 表（category='attachments'），本表只承载论坛语义。
// 之所以不在 files 上直接加 topic_id，是因为 files 属 core、topics 属 forum 模块，
// core 不得依赖 modules（见 AGENTS.md 铁律）。
//
// 下载不经 /uploads 公开路径（plugins/static.js 已拦截 attachments 前缀），
// 一律走 /api/attachments/:id/files/:fileId/download 鉴权后出内容。
export const topicAttachments = pgTable(
  'topic_attachments',
  {
    ...$defaults,
    topicId: integer('topic_id').references(() => topics.id, { onDelete: 'cascade' }), // NULL = 草稿（与 polls/lotteries 一致）
    userId: integer('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    title: varchar('title', { length: 255 }), // 组名，为空时由服务端按文件数回退
    description: text('description'),
    policy: varchar('policy', { length: 20 }).notNull().default('none'), // 'none' | 'login' | 'reply' | 'points' | 'role'
    pointsCost: integer('points_cost').notNull().default(0), // 仅 policy='points'
    allowedRoleIds: jsonb('allowed_role_ids'), // 仅 policy='role'：number[]
  },
  (table) => [
    index('topic_attachments_topic_idx').on(table.topicId),
    index('topic_attachments_user_idx').on(table.userId),
  ]
);

// ============ Topic Attachment Files (附件组内的文件) ============
export const topicAttachmentFiles = pgTable(
  'topic_attachment_files',
  {
    ...$defaults,
    attachmentId: integer('attachment_id')
      .notNull()
      .references(() => topicAttachments.id, { onDelete: 'cascade' }),
    fileId: integer('file_id')
      .notNull()
      .references(() => files.id, { onDelete: 'cascade' }),
    displayOrder: integer('display_order').notNull().default(0),
    downloadCount: integer('download_count').notNull().default(0),
  },
  (table) => [
    index('topic_attachment_files_attachment_idx').on(table.attachmentId),
    // 一个文件只能归属一个附件组，避免同一份文件被挂出两套下载策略
    uniqueIndex('topic_attachment_files_file_idx').on(table.fileId),
  ]
);

// ============ Attachment Purchases (附件积分购买记录) ============
// policy='points' 时首次付费后组内文件永久可下载；UNIQUE 兜底防并发重复扣费
export const attachmentPurchases = pgTable(
  'attachment_purchases',
  {
    ...$defaults,
    attachmentId: integer('attachment_id')
      .notNull()
      .references(() => topicAttachments.id, { onDelete: 'cascade' }),
    userId: integer('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    amountPaid: integer('amount_paid').notNull(),
  },
  (table) => [
    uniqueIndex('attachment_purchases_att_user_idx').on(table.attachmentId, table.userId),
    index('attachment_purchases_user_idx').on(table.userId),
  ]
);

export const topicAttachmentsRelations = relations(topicAttachments, ({ one, many }) => ({
  topic: one(topics, { fields: [topicAttachments.topicId], references: [topics.id] }),
  user: one(users, { fields: [topicAttachments.userId], references: [users.id] }),
  files: many(topicAttachmentFiles),
  purchases: many(attachmentPurchases),
}));

export const topicAttachmentFilesRelations = relations(topicAttachmentFiles, ({ one }) => ({
  attachment: one(topicAttachments, {
    fields: [topicAttachmentFiles.attachmentId],
    references: [topicAttachments.id],
  }),
  file: one(files, { fields: [topicAttachmentFiles.fileId], references: [files.id] }),
}));

export const attachmentPurchasesRelations = relations(attachmentPurchases, ({ one }) => ({
  attachment: one(topicAttachments, {
    fields: [attachmentPurchases.attachmentId],
    references: [topicAttachments.id],
  }),
  user: one(users, { fields: [attachmentPurchases.userId], references: [users.id] }),
}));
