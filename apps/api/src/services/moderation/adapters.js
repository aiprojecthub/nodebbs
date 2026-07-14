/**
 * 审核适配器（gate 类：topic / post；stage 类：createFieldAdapter 派生的字段暂存）。
 *
 * 每个适配器封装某内容类型的审核副作用，让通用审核服务无需了解业务细节：
 *   - type / label / kind：类型标识、审核台显示名、审核模型（'gate' 行门禁 | 'stage' 字段暂存）
 *   - defaultEnabled：未显式配置时是否默认需要审核（gate 类 true、stage 类 false，可在工厂覆盖）
 *   - settle(dbx, item, action)：事务内落地审核结果（gate 翻 approval_status；stage 通过写回、驳回 no-op）
 *   - [gate]  setStatus(dbx, targetId, status)：把审核状态落到业务行（入队/直接通过用；写 approval_status）
 *   - [gate]  onApproved(item)：通过后的领域副作用（发 TOPIC_CREATED / POST_CREATED 事件）
 *   - [stage] apply(dbx, targetId, payload)：审核关时把 payload.value 直接写回目标字段（见 createFieldAdapter）
 *   - describe(item)：审核台展示所需的规范化字段（优先用 item.snapshot，避免 N+1）
 *
 * 事件统一由 onApproved 发射（原先分散在 topics/posts 路由内联 emit）。
 */
import { and, eq } from 'drizzle-orm';
import db from '../../db/index.js';
import { topics, posts, users } from '../../db/schema.js';
import { EVENTS } from '../../constants/events.js';

/**
 * 话题适配器。
 * 注意：话题的审核状态与其首帖（postNumber=1，即话题正文）保持一致，
 * 与既有 moderation 路由 approve/reject 同时更新两者的逻辑对齐。
 */
export function createTopicAdapter(fastify) {
  // 提取为闭包，供 setStatus（入队/直接通过）与 settle（审核落地）共用
  const setStatus = async (dbx, targetId, status) => {
    await dbx.update(topics).set({ approvalStatus: status }).where(eq(topics.id, targetId));
    await dbx
      .update(posts)
      .set({ approvalStatus: status })
      .where(and(eq(posts.topicId, targetId), eq(posts.postNumber, 1)));
  };
  return {
    type: 'topic',
    label: '话题',
    kind: 'gate',

    defaultEnabled: true,

    setStatus,

    // 事务内落地审核结果：gate 直接翻 approval_status（通过/驳回都翻）
    async settle(dbx, item, action) {
      await setStatus(dbx, item.targetId, action === 'approve' ? 'approved' : 'rejected');
    },

    async onApproved(item) {
      if (!fastify.eventBus) return;
      const [t] = await db.select().from(topics).where(eq(topics.id, item.targetId)).limit(1);
      if (!t) return;
      fastify.eventBus.emit(EVENTS.TOPIC_CREATED, {
        id: t.id,
        userId: t.userId,
        title: t.title,
        slug: t.slug,
        categoryId: t.categoryId,
        createdAt: t.createdAt,
      });
    },

    describe(item) {
      const s = item.snapshot || {};
      return {
        layout: 'topic',
        title: s.title || null,
        preview: s.preview || null,
        topicId: item.targetId,
        href: `/topic/${item.targetId}`,
      };
    },
  };
}

/**
 * 回复适配器。
 * 与既有逻辑对齐：仅 postNumber>1 的回复在通过时触发 POST_CREATED（话题正文由话题适配器负责）。
 */
export function createPostAdapter(fastify) {
  const setStatus = async (dbx, targetId, status) => {
    await dbx.update(posts).set({ approvalStatus: status }).where(eq(posts.id, targetId));
  };
  return {
    type: 'post',
    label: '回复',
    kind: 'gate',

    defaultEnabled: true,

    setStatus,

    // 事务内落地审核结果：gate 直接翻 approval_status（通过/驳回都翻）
    async settle(dbx, item, action) {
      await setStatus(dbx, item.targetId, action === 'approve' ? 'approved' : 'rejected');
    },

    async onApproved(item) {
      if (!fastify.eventBus) return;
      const [p] = await db.select().from(posts).where(eq(posts.id, item.targetId)).limit(1);
      if (!p || p.postNumber <= 1) return;
      fastify.eventBus.emit(EVENTS.POST_CREATED, {
        id: p.id,
        userId: p.userId,
        topicId: p.topicId,
        postNumber: p.postNumber,
        replyToPostId: p.replyToPostId || null,
        createdAt: p.createdAt,
      });
    },

    describe(item) {
      const s = item.snapshot || {};
      return {
        layout: 'post',
        title: null,
        preview: s.preview || null,
        topicId: s.topicId || null,
        topicTitle: s.topicTitle || null,
        href: s.topicId ? `/topic/${s.topicId}#post-${item.targetId}` : null,
      };
    },
  };
}

/**
 * 字段暂存适配器工厂（P2，kind='stage'）。
 *
 * 用于"某实体上一个字段的待定新值"类审核：待审期间线上字段保持旧值/默认，
 * 新值暂存在 moderation_items.payload；通过时由 apply() 把 payload.value 写回目标字段。
 * 读路径无需改动——未审核值从不进业务列。
 *
 * @param {object} cfg
 * @param {string} cfg.type       类型标识（如 'user_name'）
 * @param {string} cfg.label      审核台显示名（如 '用户昵称'）
 * @param {string} cfg.field      目标列名（'name' | 'bio' | 'avatar' | 'message'），记入 item.field
 * @param {(dbx, targetId, value) => Promise<void>} cfg.applyValue 把新值写回业务行
 * @param {(item) => object} [cfg.describe]   覆写审核台展示（默认取 snapshot.old/new）
 * @param {(item) => Promise<void>} [cfg.onApproved] 通过后副作用（可选，如通知）
 * @param {(item) => Promise<void>} [cfg.onRejected] 驳回后副作用（可选，如驳回通知/清理暂存文件）
 * @param {(item) => object} [cfg.oplogTarget] 映射到合法 oplog 目标 {targetType,targetId,targetLabel}（可选）
 * @param {string} [cfg.layout] 审核台展示布局标识：'text-diff'（默认）| 'image-diff' | 'message'
 */
export function createFieldAdapter({ type, label, field, applyValue, describe, onApproved, onRejected, oplogTarget, layout, defaultEnabled = false }) {
  const apply = async (dbx, targetId, payload) => {
    await applyValue(dbx, targetId, payload?.value ?? null);
  };
  return {
    type,
    label,
    kind: 'stage',
    field,
    defaultEnabled,

    apply,

    // 事务内落地审核结果：stage 通过则写回线上字段；驳回=丢弃新值，字段保持旧值，不动业务行
    async settle(dbx, item, action) {
      if (action === 'approve') await apply(dbx, item.targetId, item.payload);
    },

    describe(item) {
      if (describe) return describe(item);
      const s = item.snapshot || {};
      return {
        layout: layout || 'text-diff',
        field: item.field || field,
        oldValue: s.old ?? null,
        newValue: s.new ?? null,
        preview: typeof s.new === 'string' ? s.new.slice(0, 200) : null,
        href: s.href ?? null,
        username: s.username ?? null,
        meta: s.meta ?? null,
      };
    },

    ...(onApproved ? { onApproved } : {}),
    ...(onRejected ? { onRejected } : {}),
    ...(oplogTarget ? { oplogTarget } : {}),
  };
}

/**
 * 用户资料字段适配器（P2）：昵称 / 简介 / 头像。
 * 均为 kind='stage'——待审期间线上字段保持旧值/默认，通过时写回 users.{name,bio,avatar}。
 * 纯数据映射，不依赖 fastify；驳回通知等副作用可后续通过 onRejected 注入。
 */
export function createUserNameAdapter() {
  return createFieldAdapter({
    type: 'user_name',
    label: '用户昵称',
    field: 'name',
    applyValue: async (dbx, userId, value) => {
      await dbx.update(users).set({ name: value }).where(eq(users.id, userId));
    },
    oplogTarget: (item) => ({ targetType: 'user', targetId: item.targetId, targetLabel: '昵称审核' }),
  });
}

export function createUserBioAdapter() {
  return createFieldAdapter({
    type: 'user_bio',
    label: '用户简介',
    field: 'bio',
    applyValue: async (dbx, userId, value) => {
      await dbx.update(users).set({ bio: value }).where(eq(users.id, userId));
    },
    oplogTarget: (item) => ({ targetType: 'user', targetId: item.targetId, targetLabel: '简介审核' }),
  });
}

export function createUserAvatarAdapter() {
  return createFieldAdapter({
    type: 'user_avatar',
    label: '用户头像',
    field: 'avatar',
    layout: 'image-diff',
    applyValue: async (dbx, userId, value) => {
      await dbx.update(users).set({ avatar: value }).where(eq(users.id, userId));
    },
    oplogTarget: (item) => ({ targetType: 'user', targetId: item.targetId, targetLabel: '头像审核' }),
  });
}
