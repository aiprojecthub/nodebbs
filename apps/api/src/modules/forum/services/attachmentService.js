import db from '#core/db/index.js';
import {
  topicAttachments,
  topicAttachmentFiles,
  attachmentPurchases,
  categories,
  topics,
  posts,
} from '#modules/forum/db/schema.js';
import { files } from '#core/db/schema.js';
import { and, asc, desc, eq, gt, inArray, isNull, lt, sql } from 'drizzle-orm';
import { DEFAULT_CURRENCY_CODE } from '#core/extensions/ledger/constants.js';
import {
  extractAttachmentIds,
  stripAttachmentDirectives,
} from '../utils/extractAttachmentIds.js';

/**
 * 话题附件业务模块
 *
 * 模型：一条 topic_attachments = 一个「附件组」，正文里对应一个 ::attachment{id="N"}，
 * 组内可含多个文件（topic_attachment_files）。下载策略、积分购买、权限判定都在组级别；
 * 下载与计数按文件粒度。
 *
 * 与投票/抽奖同构的「草稿 → 绑定」流程：
 *   1. 前端先调 /api/upload?category=attachments 逐个上传文件（落 core 的 files 表）
 *   2. 再调 POST /api/attachments 把一批 fileIds 登记成一个附件组并设下载策略
 *   3. 编辑器插入一条 `::attachment{id="N"}`
 *   4. 话题提交时 bindAttachmentsToTopic 把草稿绑到 topicId，非法/盗用引用从正文剥离
 *
 * 下载不经公开的 /uploads 路径（plugins/static.js 已拦截 attachments 前缀），
 * 一律走 /api/attachments/:id/files/:fileId/download，由 resolveDownloadAccess 判权后出内容。
 */

// 下载策略。'none' = 不限制（含未登录访客），为默认值
export const ATTACHMENT_POLICIES = ['none', 'login', 'reply', 'points', 'role'];

/** 单个附件组最多可含的文件数 */
export const MAX_FILES_PER_ATTACHMENT = 20;

/** 草稿保留天数，超时未绑定话题即回收（含存储对象） */
const DRAFT_TTL_DAYS = 7;

/**
 * 校验附件表单数据。createAttachment 与 updateDraft 共用。
 * @param {object} data
 * @throws {Error & {statusCode: 400}}
 */
function validateAttachmentData(data) {
  const { policy, pointsCost, allowedRoleIds } = data;

  if (!ATTACHMENT_POLICIES.includes(policy)) {
    throw Object.assign(new Error(`policy 必须为 ${ATTACHMENT_POLICIES.join(' / ')}`), {
      statusCode: 400,
    });
  }
  if (policy === 'points') {
    if (!Number.isInteger(pointsCost) || pointsCost <= 0) {
      throw Object.assign(new Error('积分下载需要设置大于 0 的积分价'), { statusCode: 400 });
    }
  }
  if (policy === 'role') {
    if (!Array.isArray(allowedRoleIds) || allowedRoleIds.length === 0) {
      throw Object.assign(new Error('限定角色下载需要至少选择一个角色'), { statusCode: 400 });
    }
    if (allowedRoleIds.some((id) => !Number.isInteger(id) || id <= 0)) {
      throw Object.assign(new Error('allowedRoleIds 必须为正整数数组'), { statusCode: 400 });
    }
  }
}

/**
 * 归一化策略相关字段：非对应策略的字段一律清空，避免残留脏数据影响判权
 * @param {object} data
 */
function normalizePolicyFields(data) {
  return {
    policy: data.policy,
    pointsCost: data.policy === 'points' ? data.pointsCost : 0,
    allowedRoleIds: data.policy === 'role' ? data.allowedRoleIds : null,
  };
}

/** 组内文件的联合查询列 */
const attachmentFileSelect = {
  itemId: topicAttachmentFiles.id,
  fileId: topicAttachmentFiles.fileId,
  displayOrder: topicAttachmentFiles.displayOrder,
  downloadCount: topicAttachmentFiles.downloadCount,
  filename: files.filename,
  originalName: files.originalName,
  category: files.category,
  mimetype: files.mimetype,
  size: files.size,
  provider: files.provider,
};

/**
 * 读取附件组（不含文件）
 * @param {number} attachmentId
 * @returns {Promise<object|null>}
 */
async function findGroup(attachmentId) {
  const [row] = await db
    .select()
    .from(topicAttachments)
    .where(eq(topicAttachments.id, attachmentId))
    .limit(1);
  return row || null;
}

/**
 * 读取组内文件（含 storage 定位所需字段，仅内部使用）
 * @param {number|number[]} attachmentIds
 * @returns {Promise<Array>}
 */
async function findGroupFiles(attachmentIds) {
  const ids = Array.isArray(attachmentIds) ? attachmentIds : [attachmentIds];
  if (ids.length === 0) return [];
  return db
    .select({ attachmentId: topicAttachmentFiles.attachmentId, ...attachmentFileSelect })
    .from(topicAttachmentFiles)
    .innerJoin(files, eq(files.id, topicAttachmentFiles.fileId))
    .where(inArray(topicAttachmentFiles.attachmentId, ids))
    .orderBy(asc(topicAttachmentFiles.displayOrder), asc(topicAttachmentFiles.id));
}

/**
 * 组名回退：用户没填就按文件数生成
 * @param {object} group
 * @param {Array} groupFiles
 * @returns {string}
 */
function resolveTitle(group, groupFiles) {
  if (group.title) return group.title;
  // 单文件：卡片不再渲染下方的文件列表，文件名只能由标题承载，
  // 换成「附件」会让人点下载前根本不知道要下的是什么。
  // originalName 缺失时不退到 filename——那是个 UUID，摆出来毫无意义
  if (groupFiles.length === 1) {
    return groupFiles[0].originalName || '附件';
  }
  // 多文件：文件数在 meta 行、逐个文件名在下方列表，标题再报一遍纯属重复
  return '附件';
}

/**
 * 拼成对外的附件组信息（永不含真实存储 URL / storage key）
 * @param {object} group
 * @param {Array} groupFiles
 */
function toPublicShape(group, groupFiles) {
  return {
    id: group.id,
    topicId: group.topicId,
    userId: group.userId,
    title: resolveTitle(group, groupFiles),
    // 用户实际填写的标题，未填为 null。编辑表单必须回填这个而不是 title——
    // 回填兜底名会把「3 个文件」当成真标题存回去，此后不再随文件变化
    customTitle: group.title || null,
    description: group.description,
    policy: group.policy,
    pointsCost: group.pointsCost,
    allowedRoleIds: group.allowedRoleIds || null,
    fileCount: groupFiles.length,
    totalSize: groupFiles.reduce((sum, f) => sum + (f.size || 0), 0),
    downloadCount: groupFiles.reduce((sum, f) => sum + (f.downloadCount || 0), 0),
    createdAt: group.createdAt,
    files: groupFiles.map((f) => ({
      fileId: f.fileId,
      name: f.originalName || f.filename,
      size: f.size,
      mimetype: f.mimetype,
      downloadCount: f.downloadCount,
    })),
  };
}

/**
 * 批量组装多个组的对外形态（一次查完文件，避免 N+1）
 * @param {Array} groups
 * @returns {Promise<Array>}
 */
async function toPublicShapes(groups) {
  if (groups.length === 0) return [];
  const allFiles = await findGroupFiles(groups.map((g) => g.id));
  const byGroup = new Map();
  for (const f of allFiles) {
    if (!byGroup.has(f.attachmentId)) byGroup.set(f.attachmentId, []);
    byGroup.get(f.attachmentId).push(f);
  }
  return groups.map((g) => toPublicShape(g, byGroup.get(g.id) || []));
}

/**
 * 创建附件组草稿（不绑定 topic）
 *
 * @param {object} data - { fileIds, title, description, policy, pointsCost, allowedRoleIds }
 * @param {number} userId - 上传者
 * @returns {Promise<{id: number}>}
 * @throws {Error & {statusCode}} 400 / 403 / 404 / 409
 */
export async function createAttachment(data, userId) {
  validateAttachmentData(data);

  const fileIds = [...new Set((data.fileIds || []).map(Number))].filter(
    (n) => Number.isInteger(n) && n > 0
  );
  if (fileIds.length === 0) {
    throw Object.assign(new Error('请至少选择一个文件'), { statusCode: 400 });
  }
  if (fileIds.length > MAX_FILES_PER_ATTACHMENT) {
    throw Object.assign(
      new Error(`单个附件最多包含 ${MAX_FILES_PER_ATTACHMENT} 个文件`),
      { statusCode: 400 }
    );
  }

  const rows = await db
    .select({ id: files.id, userId: files.userId, category: files.category })
    .from(files)
    .where(inArray(files.id, fileIds));

  if (rows.length !== fileIds.length) {
    throw Object.assign(new Error('部分文件不存在'), { statusCode: 404 });
  }
  if (rows.some((f) => f.userId !== userId)) {
    throw Object.assign(new Error('没有权限使用该文件'), { statusCode: 403 });
  }
  if (rows.some((f) => f.category !== 'attachments')) {
    throw Object.assign(new Error('存在非附件类型的文件'), { statusCode: 400 });
  }

  // 一个文件只能归属一个附件组（DB 也有 UNIQUE 兜底，这里先给出可读的报错）
  const used = await db
    .select({ fileId: topicAttachmentFiles.fileId })
    .from(topicAttachmentFiles)
    .where(inArray(topicAttachmentFiles.fileId, fileIds));
  if (used.length > 0) {
    throw Object.assign(new Error('部分文件已被其他附件占用'), { statusCode: 409 });
  }

  try {
    // 必须 await：不然事务里的 UNIQUE 冲突会绕过下面的 catch 直接冒泡成 500
    return await db.transaction(async (tx) => {
      const [group] = await tx
        .insert(topicAttachments)
        .values({
          topicId: null,
          userId,
          title: data.title ? String(data.title).slice(0, 255) : null,
          description: data.description ? String(data.description).slice(0, 2000) : null,
          ...normalizePolicyFields(data),
        })
        .returning({ id: topicAttachments.id });

      await tx.insert(topicAttachmentFiles).values(
        fileIds.map((fileId, idx) => ({
          attachmentId: group.id,
          fileId,
          displayOrder: idx,
        }))
      );

      return { id: group.id };
    });
  } catch (err) {
    // 上面的占用预检查与这里的插入不是原子的：并发（例如双击「插入附件」）时
    // 第二个请求会在事务内撞上 topic_attachment_files 的 UNIQUE 索引。PG 错误
    // 不带 statusCode，不映射就成了 500——但这与预检查命中是同一种情况
    if (err.code === '23505' || err.cause?.code === '23505') {
      throw Object.assign(new Error('部分文件已被其他附件占用'), { statusCode: 409 });
    }
    throw err;
  }
}

/**
 * 编辑草稿的元信息与策略（仅 owner，仅未绑话题）。
 * 组内文件不可增删——需要改文件就删掉草稿重建。
 *
 * @param {number} attachmentId
 * @param {object} data - { title, description, policy, pointsCost, allowedRoleIds }
 * @param {number} userId
 * @returns {Promise<{success: true}>}
 * @throws {Error & {statusCode}} 400 / 403 / 404
 */
export async function updateDraft(attachmentId, data, userId) {
  validateAttachmentData(data);

  const group = await findGroup(attachmentId);
  if (!group) {
    throw Object.assign(new Error('附件不存在'), { statusCode: 404 });
  }
  if (group.userId !== userId) {
    throw Object.assign(new Error('没有权限修改此附件'), { statusCode: 403 });
  }
  // 已发布的附件若还能改策略，已付费用户的权益会被架空，故与投票一致：只允许改草稿
  if (group.topicId !== null) {
    throw Object.assign(new Error('已发布的附件不允许修改'), { statusCode: 400 });
  }

  await db
    .update(topicAttachments)
    .set({
      title: data.title ? String(data.title).slice(0, 255) : null,
      description: data.description ? String(data.description).slice(0, 2000) : null,
      ...normalizePolicyFields(data),
    })
    .where(eq(topicAttachments.id, attachmentId));

  return { success: true };
}

/**
 * 删除附件组（同时清理组内 files 行与存储对象）
 *
 * 业务规则与 deletePoll 一致：已绑话题的需先从正文移除引用（admin 可跳过）。
 *
 * @param {number} attachmentId
 * @param {number} userId
 * @param {{isAdmin?: boolean, storage?: object}} options
 * @throws {Error & {statusCode}} 400 / 403 / 404
 */
export async function deleteAttachment(attachmentId, userId, { isAdmin = false, storage } = {}) {
  const group = await findGroup(attachmentId);
  if (!group) {
    throw Object.assign(new Error('附件不存在'), { statusCode: 404 });
  }
  if (!isAdmin && group.userId !== userId) {
    throw Object.assign(new Error('没有权限删除此附件'), { statusCode: 403 });
  }
  if (!isAdmin && group.topicId !== null) {
    throw Object.assign(
      new Error('已发布的附件不允许删除，请先从话题正文中移除引用'),
      { statusCode: 400 }
    );
  }

  const groupFiles = await findGroupFiles(attachmentId);
  await purgeAttachmentGroups([attachmentId], storage, groupFiles);
}

/**
 * 物理清除一批附件组：存储对象 → files 行 → 组本身。
 * topic_attachment_files 随 files / 组的 FK CASCADE 一并清除。
 *
 * @param {number[]} groupIds
 * @param {object} [storage] - fastify.storage
 * @param {Array} [knownFiles] - 已查好的 findGroupFiles 结果，避免重复查询
 * @returns {Promise<number>} 清除的组数
 */
async function purgeAttachmentGroups(groupIds, storage, knownFiles) {
  if (groupIds.length === 0) return 0;

  const groupFiles = knownFiles ?? (await findGroupFiles(groupIds));
  await removeFilesFromStorage(groupFiles, storage);

  if (groupFiles.length > 0) {
    await db.delete(files).where(inArray(files.id, groupFiles.map((f) => f.fileId)));
  }
  await db.delete(topicAttachments).where(inArray(topicAttachments.id, groupIds));

  return groupIds.length;
}

/**
 * 删除某批话题下的全部附件（含 files 行与存储对象）。
 *
 * topic_attachments.topic_id 是 ON DELETE CASCADE，话题被彻底删除时组行会自动消失，
 * 但 files 行与存储对象不会——且届时已无从反查，只能成为永久孤儿。
 * 故话题彻底删除前必须先调用本函数。
 *
 * @param {number|number[]} topicIds
 * @param {object} [storage] - fastify.storage
 * @returns {Promise<number>} 清除的附件组数
 */
export async function deleteAttachmentsByTopicIds(topicIds, storage) {
  const ids = (Array.isArray(topicIds) ? topicIds : [topicIds]).filter((n) =>
    Number.isInteger(n)
  );
  if (ids.length === 0) return 0;

  const groups = await db
    .select({ id: topicAttachments.id })
    .from(topicAttachments)
    .where(inArray(topicAttachments.topicId, ids));

  return purgeAttachmentGroups(groups.map((g) => g.id), storage);
}

/**
 * 删除一个尚未登记进附件组的上传文件（供上传弹窗里「移除」用）。
 *
 * 仅限本人上传的 category='attachments' 且未被任何组占用的文件——已登记的文件
 * 必须经 deleteAttachment 走附件组的业务规则。
 *
 * @param {number} fileId
 * @param {number} userId
 * @param {object} [storage] - fastify.storage
 * @throws {Error & {statusCode}} 400 / 403 / 404 / 409
 */
export async function deleteUnboundAttachmentFile(fileId, userId, storage) {
  const [file] = await db
    .select({
      id: files.id,
      userId: files.userId,
      category: files.category,
      filename: files.filename,
      provider: files.provider,
    })
    .from(files)
    .where(eq(files.id, fileId))
    .limit(1);

  if (!file) {
    throw Object.assign(new Error('文件不存在'), { statusCode: 404 });
  }
  if (file.userId !== userId) {
    throw Object.assign(new Error('没有权限删除该文件'), { statusCode: 403 });
  }
  if (file.category !== 'attachments') {
    throw Object.assign(new Error('该文件不是话题附件'), { statusCode: 400 });
  }

  const [used] = await db
    .select({ id: topicAttachmentFiles.id })
    .from(topicAttachmentFiles)
    .where(eq(topicAttachmentFiles.fileId, fileId))
    .limit(1);
  if (used) {
    throw Object.assign(new Error('该文件已登记为附件，请删除对应附件'), { statusCode: 409 });
  }

  await removeFilesFromStorage([file], storage);
  await db.delete(files).where(eq(files.id, fileId));
}

/**
 * 删除一批文件对应的存储对象（失败只记日志，不阻断 DB 清理）
 * @param {Array} groupFiles - findGroupFiles 的返回
 * @param {object} [storage] - fastify.storage
 */
async function removeFilesFromStorage(groupFiles, storage) {
  if (!storage) return;
  for (const f of groupFiles) {
    try {
      // provider 可为 NULL（列只有 default('local')）；传假值会让 storage 回退到
      // 当前激活的 provider，切换存储后会删错桶
      await storage.delete(`${f.category}/${f.filename}`, f.provider || 'local');
    } catch {
      // 存储对象可能已不存在或 provider 已下线；DB 记录仍应清理
    }
  }
}

/**
 * 列出当前用户的草稿（topicId IS NULL）
 *
 * @param {number} userId
 * @param {{page?: number, limit?: number}} pagination
 * @returns {Promise<{drafts: Array, total: number}>}
 */
export async function listDrafts(userId, { page = 1, limit = 20 } = {}) {
  const safeLimit = Math.min(Math.max(1, limit), 100);
  const offset = (Math.max(1, page) - 1) * safeLimit;

  const where = and(eq(topicAttachments.userId, userId), isNull(topicAttachments.topicId));

  const groups = await db
    .select()
    .from(topicAttachments)
    .where(where)
    .orderBy(desc(topicAttachments.createdAt))
    .limit(safeLimit)
    .offset(offset);

  const [{ count }] = await db
    .select({ count: sql`count(*)::int` })
    .from(topicAttachments)
    .where(where);

  return { drafts: await toPublicShapes(groups), total: count };
}

/**
 * 列出某话题已绑的所有附件组
 *
 * @param {number} topicId
 * @returns {Promise<{attachments: Array}>}
 */
export async function listByTopic(topicId) {
  const groups = await db
    .select()
    .from(topicAttachments)
    .where(eq(topicAttachments.topicId, topicId))
    .orderBy(asc(topicAttachments.createdAt));

  return { attachments: await toPublicShapes(groups) };
}

/**
 * 判断用户是否在该话题下发过有效回复（供 policy='reply' 用）
 *
 * 判定条件与话题详情里 :::protected{type="reply"} 的处理保持一致：
 * postNumber > 1（排除首帖）、未软删、审核已通过。
 *
 * @param {number} topicId
 * @param {number} userId
 * @returns {Promise<boolean>}
 */
export async function hasRepliedToTopic(topicId, userId) {
  const rows = await db
    .select({ id: posts.id })
    .from(posts)
    .where(
      and(
        eq(posts.topicId, topicId),
        eq(posts.userId, userId),
        gt(posts.postNumber, 1),
        eq(posts.isDeleted, false),
        eq(posts.approvalStatus, 'approved')
      )
    )
    .limit(1);
  return rows.length > 0;
}

/**
 * 不可见的附件一律按「不存在」应答，避免用状态码差异探测私密内容
 * @returns {{allowed: false, statusCode: 404, error: string}}
 */
function notFound() {
  return { allowed: false, statusCode: 404, error: '附件不存在' };
}

/**
 * 解析当前用户对某附件组的下载权限（组内所有文件共用同一结论）。
 *
 * 判定顺序：
 *   1. 草稿仅 owner 可见
 *   2. 话题不存在 / 已软删 → 404
 *   3. 私密分类、分类读权限、待审核 → 与话题详情（routes/topics）逐条对齐，
 *      保证附件的可见范围不宽于承载它的话题本身
 *   4. 作者本人 或 该分类下有 dashboard.topics 的版主/管理员 → 放行
 *   5. 按 policy 逐档判定
 *
 * @param {object} params
 * @param {object} params.attachment - 附件组行
 * @param {object|null} params.user - request.user
 * @param {object} params.permission - fastify.permission
 * @returns {Promise<{allowed: boolean, statusCode?: number, error?: string, needPurchase?: boolean, purchased?: boolean}>}
 *          purchased 仅在「因已购买而放行」时为 true——作者与版主是策略豁免，不置该位
 */
export async function resolveDownloadAccess({ attachment, user, permission }) {
  // 草稿（未绑话题）只有 owner 能取
  if (attachment.topicId == null) {
    if (user && user.id === attachment.userId) return { allowed: true };
    return notFound();
  }

  const [topic] = await db
    .select({
      id: topics.id,
      userId: topics.userId,
      categoryId: topics.categoryId,
      categoryIsPrivate: categories.isPrivate,
      isDeleted: topics.isDeleted,
      approvalStatus: topics.approvalStatus,
    })
    .from(topics)
    .innerJoin(categories, eq(categories.id, topics.categoryId))
    .where(eq(topics.id, attachment.topicId))
    .limit(1);

  if (!topic || topic.isDeleted) {
    return notFound();
  }

  // userId 为 null 时权限引擎按 guest 角色判定
  const userId = user?.id ?? null;
  const isAuthor = userId !== null && userId === topic.userId;

  // 分类作用域条件只在带上 categoryId 时才生效；
  // 私密分类对作者也要判定，故这里不按 isAuthor 短路
  const canManage = userId
    ? await permission.hasPermission(userId, 'dashboard.topics', {
        categoryId: topic.categoryId,
      })
    : false;

  // 私密分类仅管理者可穿透
  if (topic.categoryIsPrivate && !canManage) {
    return notFound();
  }

  // 分类读权限（RBAC topic.read 的 categories 条件）
  const canRead = await permission.hasPermission(userId, 'topic.read', {
    categoryId: topic.categoryId,
  });
  if (!canRead) {
    return notFound();
  }

  // 待审核话题只对作者与管理者可见
  if (topic.approvalStatus !== 'approved' && !isAuthor && !canManage) {
    return notFound();
  }

  // 作者与管理者豁免所有下载策略
  if (isAuthor || canManage) return { allowed: true };

  // 不限制：未登录访客也能下载（附件默认策略）
  if (attachment.policy === 'none') return { allowed: true };

  if (!user) {
    return { allowed: false, statusCode: 401, error: '请先登录后下载' };
  }

  switch (attachment.policy) {
    case 'login':
      return { allowed: true };

    case 'reply': {
      const replied = await hasRepliedToTopic(topic.id, user.id);
      return replied
        ? { allowed: true }
        : { allowed: false, statusCode: 403, error: '回复本话题后才能下载' };
    }

    case 'role': {
      const roleIds = Array.isArray(attachment.allowedRoleIds) ? attachment.allowedRoleIds : [];
      if (roleIds.length === 0) {
        return { allowed: false, statusCode: 403, error: '没有下载权限' };
      }
      const userRoleList = await permission.getUserRoles(user.id);
      const hit = userRoleList.some((r) => roleIds.includes(r.id));
      return hit
        ? { allowed: true }
        : { allowed: false, statusCode: 403, error: '当前角色没有下载权限' };
    }

    case 'points': {
      const purchased = await hasPurchased(attachment.id, user.id);
      return purchased
        ? { allowed: true, purchased: true }
        : {
            allowed: false,
            statusCode: 403,
            error: `需要支付 ${attachment.pointsCost} 积分后下载`,
            needPurchase: true,
          };
    }

    default:
      return { allowed: false, statusCode: 403, error: '没有下载权限' };
  }
}

/**
 * 读取附件所属话题的分类 ID；草稿（未绑话题）与不存在的附件均返回 null。
 *
 * 供路由在做 dashboard.topics 判权前取到 categoryId——RBAC 的 categories 作用域条件
 * 只在 context 带上 categoryId 时才评估，漏传等于把分类限定整个跳过。
 *
 * @param {number} attachmentId
 * @returns {Promise<number|null>}
 */
export async function getAttachmentCategoryId(attachmentId) {
  const [row] = await db
    .select({ categoryId: topics.categoryId })
    .from(topicAttachments)
    .innerJoin(topics, eq(topics.id, topicAttachments.topicId))
    .where(eq(topicAttachments.id, attachmentId))
    .limit(1);
  return row?.categoryId ?? null;
}

/**
 * 是否已购买过该附件组
 * @param {number} attachmentId
 * @param {number} userId
 * @returns {Promise<boolean>}
 */
export async function hasPurchased(attachmentId, userId) {
  const rows = await db
    .select({ id: attachmentPurchases.id })
    .from(attachmentPurchases)
    .where(
      and(
        eq(attachmentPurchases.attachmentId, attachmentId),
        eq(attachmentPurchases.userId, userId)
      )
    )
    .limit(1);
  return rows.length > 0;
}

/**
 * 获取附件组详情（供 AttachmentWidget 渲染）。不含真实存储 URL。
 *
 * @param {number} attachmentId
 * @param {object|null} user
 * @param {object} permission - fastify.permission
 * @returns {Promise<object|null>}
 */
export async function getAttachmentForView(attachmentId, user, permission) {
  const group = await findGroup(attachmentId);
  if (!group) return null;

  const access = await resolveDownloadAccess({ attachment: group, user, permission });
  if (!access.allowed && access.statusCode === 404) return null;

  const groupFiles = await findGroupFiles(attachmentId);

  return {
    ...toPublicShape(group, groupFiles),
    canDownload: access.allowed,
    needPurchase: !!access.needPurchase,
    // 已购买 ≠ 有下载权：作者与版主是策略豁免，卡片上要与真金白银买过的区分开
    purchased: !!access.purchased,
    accessMessage: access.allowed ? null : access.error,
  };
}

/**
 * 读取组内某个文件用于下载（含 storage 定位所需字段），并校验文件确属该组
 *
 * @param {number} attachmentId
 * @param {number} fileId
 * @returns {Promise<{group: object, file: object}|null>}
 */
export async function getAttachmentFileForDownload(attachmentId, fileId) {
  const group = await findGroup(attachmentId);
  if (!group) return null;

  const [row] = await db
    .select(attachmentFileSelect)
    .from(topicAttachmentFiles)
    .innerJoin(files, eq(files.id, topicAttachmentFiles.fileId))
    .where(
      and(
        eq(topicAttachmentFiles.attachmentId, attachmentId),
        eq(topicAttachmentFiles.fileId, fileId)
      )
    )
    .limit(1);

  if (!row) return null;
  return { group, file: row };
}

/**
 * 单文件下载计数 +1
 * @param {number} itemId - topic_attachment_files.id
 */
export async function incrementDownloadCount(itemId) {
  await db
    .update(topicAttachmentFiles)
    .set({ downloadCount: sql`${topicAttachmentFiles.downloadCount} + 1` })
    .where(eq(topicAttachmentFiles.id, itemId));
}

/**
 * 积分购买附件组：从购买者转账给话题作者，并落购买记录。
 *
 * 事务边界与抽奖一致：ledger 自带事务、无法并入本地事务，故先转账后写记录；
 * 记录写入撞 UNIQUE（并发重复购买）时回退退款，避免重复扣费。
 *
 * @param {number} attachmentId
 * @param {object} user - 购买者（request.user）
 * @param {object} deps
 * @param {object} deps.ledger - fastify.ledger
 * @param {object} deps.permission - fastify.permission
 * @param {object} [deps.logger] - fastify.log，用于记录需要人工核对的退款失败
 * @returns {Promise<{success: true, amountPaid: number}>}
 * @throws {Error & {statusCode}} 400 / 403 / 404
 */
export async function purchaseAttachment(attachmentId, user, { ledger, permission, logger } = {}) {
  if (!ledger) {
    throw Object.assign(new Error('积分系统未启用'), { statusCode: 400 });
  }

  const userId = user.id;
  const group = await findGroup(attachmentId);
  if (!group || group.topicId == null) {
    throw Object.assign(new Error('附件不存在'), { statusCode: 404 });
  }
  if (group.policy !== 'points') {
    throw Object.assign(new Error('该附件无需购买'), { statusCode: 400 });
  }
  if (group.userId === userId) {
    throw Object.assign(new Error('不能购买自己的附件'), { statusCode: 400 });
  }

  // 复用下载判权：话题被软删 / 转入待审核 / 移到不可读分类之后就不该再收费，
  // 否则积分扣掉了、下载路由却一直 404，且没有退款路径。
  // needPurchase 正是「可购买」状态；allowed 说明已购或本就有权，幂等返回。
  const access = await resolveDownloadAccess({ attachment: group, user, permission });
  if (access.allowed) {
    return { success: true, amountPaid: 0 };
  }
  if (!access.needPurchase) {
    throw Object.assign(new Error(access.error || '附件不存在'), {
      statusCode: access.statusCode || 403,
    });
  }

  const amount = group.pointsCost;
  const groupFiles = await findGroupFiles(attachmentId);
  // 流水描述会长期留在双方账单里，要能事后辨认出买的是什么，
  // 故不用 resolveTitle 的展示兜底（多文件时是「附件」），退到首个文件名
  const label = group.title || groupFiles[0]?.originalName || '附件';

  try {
    await ledger.transfer({
      fromUserId: userId,
      toUserId: group.userId,
      amount,
      currencyCode: DEFAULT_CURRENCY_CODE,
      type: 'attachment_purchase',
      referenceType: 'attachment',
      referenceId: String(attachmentId),
      description: `购买附件「${label}」`,
      metadata: { attachmentId, topicId: group.topicId },
    });
  } catch (err) {
    if (/Insufficient/i.test(err?.message || '')) {
      const currencyName = await ledger
        .getCurrencyName(DEFAULT_CURRENCY_CODE)
        .catch(() => DEFAULT_CURRENCY_CODE);
      throw Object.assign(new Error(`${currencyName}余额不足，下载该附件需要 ${amount}`), {
        statusCode: 400,
      });
    }
    throw err;
  }

  try {
    await db.insert(attachmentPurchases).values({
      attachmentId,
      userId,
      amountPaid: amount,
    });
  } catch (err) {
    // 转账已经提交，购买记录却没落库——无论什么原因都必须把钱退回去，
    // 否则用户既下不了载、重试还会被再扣一次
    const isDuplicate = err.code === '23505' || err.cause?.code === '23505';
    try {
      await ledger.transfer({
        fromUserId: group.userId,
        toUserId: userId,
        amount,
        currencyCode: DEFAULT_CURRENCY_CODE,
        type: 'attachment_purchase_refund',
        referenceType: 'attachment',
        referenceId: String(attachmentId),
        description: isDuplicate ? '重复购买附件退款' : '附件购买失败退款',
        metadata: { attachmentId },
      });
    } catch (refundErr) {
      // 退款可能因作者余额已被花掉 / 货币停用而失败。此时用户被重复扣费，
      // 必须留下可检索的记录供人工核对，不能静默吞掉。
      logger?.error(
        { err: refundErr, attachmentId, userId, payeeUserId: group.userId, amount },
        '附件购买退款失败，需人工核对'
      );
    }

    // UNIQUE 冲突 = 并发下已有一笔购买成功，用户实际已拥有该附件，按成功返回
    if (isDuplicate) {
      return { success: true, amountPaid: 0 };
    }

    // 其他失败（连接中断 / 死锁 / 语句超时…）：钱已退回，把错误抛给调用方让用户重试
    logger?.error({ err, attachmentId, userId }, '附件购买记录写入失败，已退款');
    throw err;
  }

  return { success: true, amountPaid: amount };
}

/**
 * 把正文里所有 ::attachment{id="..."} 指令绑定到 topic。
 * 规则与 bindPollsToTopic 完全一致：
 *   - 只允许绑定 userId 本人的附件
 *   - 已绑到当前 topicId → 跳过（编辑话题幂等）
 *   - topicId 为 null → UPDATE 为当前 topicId
 *   - 绑在别的话题上 → 视为盗用，剥离该指令
 *
 * @param {number} topicId
 * @param {string} content - 原始 markdown
 * @param {number} userId - 话题作者 ID
 * @returns {Promise<string>} 清洗后的 content
 */
export async function bindAttachmentsToTopic(topicId, content, userId) {
  const ids = extractAttachmentIds(content);
  if (ids.length === 0) return content;

  const numericIds = ids
    .map((s) => Number(s))
    .filter((n) => Number.isInteger(n) && n > 0);

  if (numericIds.length === 0) {
    return stripAttachmentDirectives(content, ids);
  }

  const rows = await db
    .select({
      id: topicAttachments.id,
      topicId: topicAttachments.topicId,
      userId: topicAttachments.userId,
    })
    .from(topicAttachments)
    .where(inArray(topicAttachments.id, numericIds));

  const rowsById = new Map(rows.map((r) => [r.id, r]));
  const invalidIds = [];
  const toBindIds = [];

  for (const idStr of ids) {
    const idNum = Number(idStr);
    const row = rowsById.get(idNum);
    if (!row || row.userId !== userId) {
      invalidIds.push(idStr);
      continue;
    }
    if (row.topicId == null) {
      toBindIds.push(idNum);
    } else if (row.topicId !== topicId) {
      invalidIds.push(idStr);
    }
    // else: 已绑到本 topic，幂等跳过
  }

  if (toBindIds.length > 0) {
    await db
      .update(topicAttachments)
      .set({ topicId })
      .where(inArray(topicAttachments.id, toBindIds));
  }

  return invalidIds.length > 0 ? stripAttachmentDirectives(content, invalidIds) : content;
}

/**
 * 清理两类过期的附件残留（均以 DRAFT_TTL_DAYS 为界，存储对象一并删除）：
 *   1. 未绑定 topic 的附件组草稿
 *   2. 已上传但从未登记进任何组的 category='attachments' 文件——
 *      用户在弹窗里「移除」后直接关窗、或提交前放弃，都会留下这类文件。
 *      它们不在 topic_attachments 里，只扫组是扫不到的，且因 static.js 拦截了
 *      /uploads/attachments/ 前缀而完全不可达，纯占空间。
 *
 * 由 modules/forum/index.js 注册到 core 的 cleanup 调度器。
 *
 * @param {object} [storage] - fastify.storage
 * @returns {Promise<number>} 清理的附件组数 + 游离文件数
 */
export async function cleanupExpiredDraftAttachments(storage) {
  const threshold = new Date(Date.now() - DRAFT_TTL_DAYS * 24 * 60 * 60 * 1000);

  const groups = await db
    .select({ id: topicAttachments.id })
    .from(topicAttachments)
    .where(and(isNull(topicAttachments.topicId), lt(topicAttachments.createdAt, threshold)));

  const purgedGroups = await purgeAttachmentGroups(groups.map((g) => g.id), storage);

  // 组清理完再扫游离文件：上一步刚删掉的 files 行不会重复计入
  const orphans = await db
    .select({
      id: files.id,
      category: files.category,
      filename: files.filename,
      provider: files.provider,
    })
    .from(files)
    .leftJoin(topicAttachmentFiles, eq(topicAttachmentFiles.fileId, files.id))
    .where(
      and(
        eq(files.category, 'attachments'),
        lt(files.createdAt, threshold),
        isNull(topicAttachmentFiles.id)
      )
    );

  if (orphans.length > 0) {
    await removeFilesFromStorage(orphans, storage);
    await db.delete(files).where(inArray(files.id, orphans.map((f) => f.id)));
  }

  return purgedGroups + orphans.length;
}
