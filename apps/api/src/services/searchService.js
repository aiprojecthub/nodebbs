/**
 * 搜索服务模块
 *
 * 核心优化：
 * 1. 窗口函数 COUNT(*) OVER() 合并 count + data 查询（每种类型仅 1 次查询）
 * 2. 搜索 rawContent 代替 content（避免匹配 HTML 标签）
 * 3. 关键词附近 snippet 截取（而非固定截取前 N 字符）
 * 4. 白名单格式化所有返回数据
 */
import db from '../db/index.js';
import { topics, posts, users, categories, blockedUsers } from '../db/schema.js';
import { eq, sql, desc, and, or, ilike, not, inArray } from 'drizzle-orm';

/**
 * 围绕关键词截取正文摘要
 * @param {string} text - 原始文本
 * @param {string} keyword - 搜索关键词
 * @param {number} contextLength - 关键词前后各截取的字符数
 * @returns {string|null} 截取后的摘要
 */
export function extractSnippet(text, keyword, contextLength = 75) {
  if (!text) return null;
  if (!keyword) return text.substring(0, contextLength * 2);

  const lowerText = text.toLowerCase();
  const lowerKeyword = keyword.toLowerCase();
  const idx = lowerText.indexOf(lowerKeyword);

  // 关键词未命中时，返回文本开头
  if (idx === -1) return text.substring(0, contextLength * 2);

  const start = Math.max(0, idx - contextLength);
  const end = Math.min(text.length, idx + keyword.length + contextLength);
  let snippet = text.substring(start, end);

  if (start > 0) snippet = '...' + snippet;
  if (end < text.length) snippet += '...';

  return snippet;
}

/**
 * 获取当前用户的双向拉黑列表
 * @param {number|null} userId - 当前用户 ID
 * @returns {Promise<Set<number>>} 被拉黑的用户 ID 集合
 */
export async function getBlockedUserIds(userId) {
  const blockedUserIds = new Set();
  if (!userId) return blockedUserIds;

  const blockedUsersList = await db
    .select({
      blockedUserId: blockedUsers.blockedUserId,
      userId: blockedUsers.userId,
    })
    .from(blockedUsers)
    .where(
      or(
        eq(blockedUsers.userId, userId),
        eq(blockedUsers.blockedUserId, userId)
      )
    );

  blockedUsersList.forEach((block) => {
    if (block.userId === userId) {
      blockedUserIds.add(block.blockedUserId);
    } else {
      blockedUserIds.add(block.userId);
    }
  });

  return blockedUserIds;
}

/**
 * 搜索话题（标题 + 主楼正文）
 * 使用 COUNT(*) OVER() 窗口函数一次查询获取数据和总数
 */
export async function searchTopics(keyword, searchPattern, blockedUserIds, page, limit) {
  const offset = (page - 1) * limit;

  // 构建查询条件
  const conditions = [
    eq(topics.isDeleted, false),
    or(
      ilike(topics.title, searchPattern),
      ilike(posts.rawContent, searchPattern)
    ),
  ];

  // 过滤被拉黑用户
  if (blockedUserIds.size > 0) {
    conditions.push(not(inArray(topics.userId, [...blockedUserIds])));
  }

  // 使用窗口函数，一次查询获取数据 + 总数
  const rows = await db
    .select({
      // 话题字段
      id: topics.id,
      title: topics.title,
      slug: topics.slug,
      categoryId: topics.categoryId,
      userId: topics.userId,
      viewCount: topics.viewCount,
      postCount: topics.postCount,
      isPinned: topics.isPinned,
      isClosed: topics.isClosed,
      lastPostAt: topics.lastPostAt,
      createdAt: topics.createdAt,
      // 关联字段
      categoryName: categories.name,
      categorySlug: categories.slug,
      username: users.username,
      userAvatar: users.avatar,
      // 主楼正文（用于生成 snippet）
      rawContent: posts.rawContent,
      // 相关性排序分数
      relevanceScore: sql`
        CASE
          WHEN ${topics.title} ILIKE ${searchPattern} THEN 3
          WHEN ${posts.rawContent} ILIKE ${searchPattern} THEN 1
          ELSE 0
        END
      `.as('relevance_score'),
      // 窗口函数：去重后的总数
      totalCount: sql`COUNT(*) OVER()`.mapWith(Number).as('total_count'),
    })
    .from(topics)
    .innerJoin(categories, eq(topics.categoryId, categories.id))
    .innerJoin(users, eq(topics.userId, users.id))
    .leftJoin(posts, and(eq(topics.id, posts.topicId), eq(posts.postNumber, 1)))
    .where(and(...conditions))
    .orderBy(desc(sql`relevance_score`), desc(topics.createdAt))
    .limit(limit)
    .offset(offset);

  const total = rows[0]?.totalCount ?? 0;

  // 白名单格式化
  const items = rows.map((row) => ({
    id: row.id,
    title: row.title,
    slug: row.slug,
    categoryId: row.categoryId,
    categoryName: row.categoryName,
    categorySlug: row.categorySlug,
    userId: row.userId,
    username: row.username,
    userAvatar: row.userAvatar,
    viewCount: row.viewCount,
    postCount: row.postCount,
    isPinned: row.isPinned,
    isClosed: row.isClosed,
    snippet: extractSnippet(row.rawContent, keyword),
    lastPostAt: row.lastPostAt,
    createdAt: row.createdAt,
  }));

  return { items, total, page, limit };
}

/**
 * 搜索帖子（回复内容，排除主楼 postNumber=1）
 */
export async function searchPosts(keyword, searchPattern, blockedUserIds, page, limit) {
  const offset = (page - 1) * limit;

  const conditions = [
    eq(posts.isDeleted, false),
    eq(topics.isDeleted, false),
    sql`${posts.postNumber} > 1`, // 排除话题主楼
    ilike(posts.rawContent, searchPattern),
  ];

  if (blockedUserIds.size > 0) {
    conditions.push(not(inArray(posts.userId, [...blockedUserIds])));
  }

  const rows = await db
    .select({
      id: posts.id,
      rawContent: posts.rawContent,
      topicId: posts.topicId,
      topicTitle: topics.title,
      username: users.username,
      postNumber: posts.postNumber,
      createdAt: posts.createdAt,
      totalCount: sql`COUNT(*) OVER()`.mapWith(Number).as('total_count'),
    })
    .from(posts)
    .innerJoin(topics, eq(posts.topicId, topics.id))
    .innerJoin(users, eq(posts.userId, users.id))
    .where(and(...conditions))
    .orderBy(desc(posts.createdAt))
    .limit(limit)
    .offset(offset);

  const total = rows[0]?.totalCount ?? 0;

  const items = rows.map((row) => ({
    id: row.id,
    content: extractSnippet(row.rawContent, keyword, 100),
    topicId: row.topicId,
    topicTitle: row.topicTitle,
    username: row.username,
    postNumber: row.postNumber,
    createdAt: row.createdAt,
  }));

  return { items, total, page, limit };
}

/**
 * 搜索用户
 */
export async function searchUsers(searchPattern, blockedUserIds, page, limit) {
  const offset = (page - 1) * limit;

  const conditions = [
    or(
      ilike(users.username, searchPattern),
      ilike(users.name, searchPattern)
    ),
  ];

  if (blockedUserIds.size > 0) {
    conditions.push(not(inArray(users.id, [...blockedUserIds])));
  }

  const rows = await db
    .select({
      id: users.id,
      username: users.username,
      name: users.name,
      avatar: users.avatar,
      bio: users.bio,
      relevanceScore: sql`
        CASE
          WHEN ${users.username} ILIKE ${searchPattern} THEN 2
          WHEN ${users.name} ILIKE ${searchPattern} THEN 1
          ELSE 0
        END
      `.as('relevance_score'),
      totalCount: sql`COUNT(*) OVER()`.mapWith(Number).as('total_count'),
    })
    .from(users)
    .where(and(...conditions))
    .orderBy(desc(sql`relevance_score`), desc(users.createdAt))
    .limit(limit)
    .offset(offset);

  const total = rows[0]?.totalCount ?? 0;

  // 白名单格式化（过滤掉 relevanceScore 和 totalCount）
  const items = rows.map((row) => ({
    id: row.id,
    username: row.username,
    name: row.name,
    avatar: row.avatar,
    bio: row.bio,
  }));

  return { items, total, page, limit };
}

/**
 * 统一搜索入口
 * @param {Object} params - 搜索参数
 * @param {string} params.keyword - 搜索关键词
 * @param {string} params.type - 搜索类型：topics / posts / users
 * @param {number} params.page - 页码
 * @param {number} params.limit - 每页数量
 * @param {number|null} params.userId - 当前用户 ID（用于过滤拉黑用户）
 * @returns {Promise<Object>} 搜索结果 { items, total, page, limit }
 */
export async function search({ keyword, type, page = 1, limit = 20, userId = null }) {
  const searchPattern = `%${keyword}%`;
  const blockedUserIds = await getBlockedUserIds(userId);

  switch (type) {
    case 'topics':
      return searchTopics(keyword, searchPattern, blockedUserIds, page, limit);
    case 'posts':
      return searchPosts(keyword, searchPattern, blockedUserIds, page, limit);
    case 'users':
      return searchUsers(searchPattern, blockedUserIds, page, limit);
    default:
      throw new Error(`不支持的搜索类型: ${type}`);
  }
}
