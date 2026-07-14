/**
 * 通用内容审核服务（gate 行门禁 + stage 字段暂存）。
 *
 * 控制面：moderation_items 统一队列；数据面：各业务行 approval_status 冗余投影。
 * 通过适配器注册表解耦具体内容类型（gate 类 topic/post；stage 类 user_name/bio/avatar/reward_message）。
 *
 * 装饰为 fastify.moderation，见 plugins/moderation.js。
 */
import { and, eq, desc, count, inArray } from 'drizzle-orm';
import db from '../../db/index.js';
import { moderationItems, users } from '../../db/schema.js';

export class ModerationService {
  constructor(fastify) {
    this.fastify = fastify;
    /** @type {Map<string, object>} targetType -> adapter */
    this.adapters = new Map();
  }

  // ============ 适配器注册表 ============
  register(adapter) {
    if (!adapter?.type) throw new Error('审核适配器缺少 type');
    this.adapters.set(adapter.type, adapter);
    return this;
  }

  getAdapter(type) {
    return this.adapters.get(type);
  }

  listTypes() {
    return [...this.adapters.keys()];
  }

  // ============ 配置 ============
  /**
   * 读取审核配置（moderation_config；未配置时默认关闭）。
   * @returns {Promise<{enabled:boolean, types:Record<string,boolean>}>}
   */
  async getConfig() {
    const raw = await this.fastify.settings.get('moderation_config', null);
    if (raw && typeof raw === 'object') {
      return { enabled: !!raw.enabled, types: raw.types || {} };
    }
    // 未配置：默认关闭（新装 seed 会写入 moderation_config，也可在设置页保存生成）
    return { enabled: false, types: {} };
  }

  /** 某内容类型当前是否需要审核。 */
  async isEnabled(type) {
    const adapter = this.getAdapter(type);
    if (!adapter) return false; // 未注册类型：不审核
    const cfg = await this.getConfig();
    if (!cfg.enabled) return false;
    const stored = cfg.types?.[type];
    if (typeof stored === 'boolean') return stored;
    // 未显式配置：用适配器声明的默认（gate 门禁类默认开、stage 暂存类默认关）
    return adapter.defaultEnabled ?? true;
  }

  // ============ 统一入口（按 adapter 分流）============
  /**
   * 创建/提交时的统一审核入口——调用方无需知道内容是行门禁还是字段暂存。
   * 按 adapter.kind 分流：gate（行门禁）→ enqueueIfNeeded（返回 status:'approved'|'pending'），
   * stage（字段暂存）→ stageIfNeeded（返回 status:'applied'|'pending'）。参数为两者超集，原样透传。
   * @param {{targetType:string, targetId:number|string, field?:string, value?:any, oldValue?:any, submittedBy?:number|null, snapshot?:object|null}} params
   */
  async submit(params) {
    const adapter = this.getAdapter(params.targetType);
    if (!adapter) throw new Error(`未注册的审核类型: ${params.targetType}`);
    return adapter.kind === 'stage'
      ? this.stageIfNeeded(params)
      : this.enqueueIfNeeded(params);
  }

  // ============ 入队（创建/编辑时调用）============
  /**
   * 根据配置决定内容是否进入审核。
   * 约定：调用前业务行已持久化（已提交），本方法只翻状态 / 写队列 / 通过时发事件。
   * @returns {Promise<{status:'approved'|'pending', moderated:boolean, itemId?:number}>}
   */
  async enqueueIfNeeded({ targetType, targetId, submittedBy = null, snapshot = null }) {
    const adapter = this.getAdapter(targetType);
    if (!adapter) throw new Error(`未注册的审核类型: ${targetType}`);

    const enabled = await this.isEnabled(targetType);

    if (!enabled) {
      // 直接通过：状态置 approved（幂等）并触发通过副作用（发事件）
      await adapter.setStatus(db, targetId, 'approved');
      try {
        await adapter.onApproved({ targetType, targetId });
      } catch (e) {
        this.fastify.log.error(e, '[审核] onApproved 失败');
      }
      return { status: 'approved', moderated: false };
    }

    // 需要审核：业务行置 pending + 写队列
    const itemId = await this.submitForReview({ targetType, targetId, submittedBy, snapshot });
    return { status: 'pending', moderated: true, itemId };
  }

  /**
   * 将目标转入待审：业务行置 pending，并写入/复用队列项（同一目标最多一条 pending）。
   * 与 enqueueIfNeeded 不同，本方法不判断配置、不含"直接通过"分支、不发事件，
   * 供编辑重审等"调用方已决定需要审核"的场景使用。
   * @returns {Promise<number>} 队列项 id
   */
  async submitForReview({ targetType, targetId, submittedBy = null, snapshot = null }) {
    const adapter = this.getAdapter(targetType);
    if (!adapter) throw new Error(`未注册的审核类型: ${targetType}`);

    await adapter.setStatus(db, targetId, 'pending');

    const [existing] = await db
      .select({ id: moderationItems.id })
      .from(moderationItems)
      .where(
        and(
          eq(moderationItems.targetType, targetType),
          eq(moderationItems.targetId, targetId),
          eq(moderationItems.status, 'pending')
        )
      )
      .limit(1);

    if (existing) {
      await db
        .update(moderationItems)
        .set({ submittedBy, snapshot, reason: null })
        .where(eq(moderationItems.id, existing.id));
      return existing.id;
    }

    const [inserted] = await db
      .insert(moderationItems)
      .values({ targetType, targetId, submittedBy, snapshot, status: 'pending' })
      .returning({ id: moderationItems.id });

    return inserted.id;
  }

  // ============ 字段暂存（创建/编辑字段类内容时调用）============
  /**
   * 字段暂存版入队（P2，供 kind='stage' 适配器/写路径调用）。
   * 审核关：立即 apply（写回线上字段）；审核开：只写队列项，payload 暂存新值，线上字段不动。
   * 同一 (targetType,targetId) 最多一条 pending（最新覆盖）。
   * 约定：调用方不要自行写线上字段——写与否由本方法/适配器决定。
   * @returns {Promise<{status:'applied'|'pending', moderated:boolean, itemId?:number}>}
   */
  async stageIfNeeded({ targetType, targetId, field = null, value, oldValue = null, submittedBy = null, snapshot = null }) {
    const adapter = this.getAdapter(targetType);
    if (!adapter) throw new Error(`未注册的审核类型: ${targetType}`);

    const enabled = await this.isEnabled(targetType);
    if (!enabled) {
      // 审核关：直接写回线上字段
      await adapter.apply(db, targetId, { value });
      return { status: 'applied', moderated: false };
    }

    // 需要审核：只写队列项，payload 暂存新值，snapshot 供审核台展示；线上字段保持不变
    const fieldName = field ?? adapter.field ?? null;
    const payload = { value };
    const snap = snapshot ?? { field: fieldName, old: oldValue, new: value };

    const [existing] = await db
      .select({ id: moderationItems.id })
      .from(moderationItems)
      .where(
        and(
          eq(moderationItems.targetType, targetType),
          eq(moderationItems.targetId, targetId),
          eq(moderationItems.status, 'pending')
        )
      )
      .limit(1);

    if (existing) {
      await db
        .update(moderationItems)
        .set({ field: fieldName, submittedBy, payload, snapshot: snap, reason: null })
        .where(eq(moderationItems.id, existing.id));
      return { status: 'pending', moderated: true, itemId: existing.id };
    }

    const [inserted] = await db
      .insert(moderationItems)
      .values({ targetType, targetId, field: fieldName, submittedBy, payload, snapshot: snap, status: 'pending' })
      .returning({ id: moderationItems.id });

    return { status: 'pending', moderated: true, itemId: inserted.id };
  }

  // ============ 审核（通过/驳回）============
  /**
   * 处理一个审核项。业务落地（gate 翻状态 / stage 写字段）与队列状态在同一事务内双写；通过/驳回副作用在提交后触发。
   */
  async review({ itemId, action, reviewerId, reason = null }) {
    const [item] = await db
      .select()
      .from(moderationItems)
      .where(eq(moderationItems.id, itemId))
      .limit(1);

    if (!item) throw new Error('审核项不存在');
    if (item.status !== 'pending') throw new Error('该审核项已处理');

    const adapter = this.getAdapter(item.targetType);
    if (!adapter) throw new Error(`未注册的审核类型: ${item.targetType}`);

    const newStatus = action === 'approve' ? 'approved' : 'rejected';

    await db.transaction(async (tx) => {
      // 核心落地交给适配器（多态）：gate 翻 approval_status（通过/驳回都翻）；
      // stage 通过时把 payload 写回线上字段，驳回时保持旧值、不动业务行。
      await adapter.settle(tx, item, action);
      await tx
        .update(moderationItems)
        .set({ status: newStatus, reviewedBy: reviewerId, reviewedAt: new Date(), reason })
        .where(eq(moderationItems.id, itemId));
    });

    // 通过/驳回副作用（失败不阻断）：gate 的 onApproved 发领域事件；stage 可选通知/清理
    try {
      if (action === 'approve') await adapter.onApproved?.(item);
      else await adapter.onRejected?.(item);
    } catch (e) {
      this.fastify.log.error(e, '[审核] 通过/驳回副作用失败');
    }

    // 内容审核结果：通知提交者（gate 与 stage 均通知；通过=已发布/生效，驳回=保持隐藏/旧值）
    if (item.submittedBy && this.fastify.notification) {
      const notif =
        action === 'approve'
          ? { type: 'moderation_approved', message: `你提交的${adapter.label}已通过审核` }
          : { type: 'moderation_rejected', message: `你提交的${adapter.label}未通过审核${reason ? `：${reason}` : ''}` };
      // 是否附内容位置链接：
      //   通过：内容已生效，一键去看；
      //   驳回：gate（话题/回复）行仍在且作者本人可访问，附链接可跳去查看/修改；
      //         stage 驳回=新值丢弃、线上字段保持旧值，无新内容可看，不附。
      let link = null;
      if (action === 'approve' || adapter.kind === 'gate') {
        try {
          link = adapter.describe?.(item)?.href ?? null;
        } catch (e) {
          this.fastify.log.error(e, '[审核] 生成通知链接失败');
        }
      }
      try {
        await this.fastify.notification.send({
          userId: item.submittedBy,
          type: notif.type,
          message: notif.message,
          metadata: { targetType: item.targetType, field: item.field, moderationItemId: item.id, link },
        });
      } catch (e) {
        this.fastify.log.error(e, '[审核] 结果通知失败');
      }
    }

    // 审计日志（失败不阻断）：字段类映射到合法 oplog 目标（资料→user、打赏留言→post），字段种类进 targetLabel
    try {
      const ot = adapter.oplogTarget?.(item) || {
        targetType: item.targetType,
        targetId: item.targetId,
        targetLabel: item.snapshot?.title ?? null,
      };
      await this.fastify.oplog.add({
        action: action === 'approve' ? 'approve' : 'reject',
        targetType: ot.targetType,
        targetId: ot.targetId,
        targetLabel: ot.targetLabel ?? null,
        moderatorId: reviewerId,
        previousStatus: 'pending',
        newStatus,
        reason,
        metadata: { moderationItemId: item.id, moderationType: item.targetType, field: item.field },
      });
    } catch (e) {
      this.fastify.log.error(e, '[审核] oplog 记录失败');
    }

    return { ...item, status: newStatus, reviewedBy: reviewerId, reason };
  }

  // ============ 队列查询（审核台）============
  async listQueue({ type = 'all', status = 'pending', page = 1, limit = 20 }) {
    const conditions = [];
    if (type !== 'all') conditions.push(eq(moderationItems.targetType, type));
    if (status !== 'all') conditions.push(eq(moderationItems.status, status));
    const where = conditions.length ? and(...conditions) : undefined;

    const rows = await db
      .select({
        id: moderationItems.id,
        targetType: moderationItems.targetType,
        targetId: moderationItems.targetId,
        field: moderationItems.field,
        status: moderationItems.status,
        payload: moderationItems.payload,
        snapshot: moderationItems.snapshot,
        reason: moderationItems.reason,
        submittedBy: moderationItems.submittedBy,
        createdAt: moderationItems.createdAt,
        reviewedAt: moderationItems.reviewedAt,
        submitterUsername: users.username,
        submitterName: users.name,
      })
      .from(moderationItems)
      .leftJoin(users, eq(moderationItems.submittedBy, users.id))
      .where(where)
      .orderBy(desc(moderationItems.createdAt))
      .limit(limit)
      .offset((page - 1) * limit);

    const items = rows.map((r) => {
      const adapter = this.getAdapter(r.targetType);
      return {
        ...r,
        typeLabel: adapter?.label || r.targetType,
        detail: adapter ? adapter.describe(r) : null,
      };
    });

    const [{ value: total }] = await db
      .select({ value: count() })
      .from(moderationItems)
      .where(where);

    return { items, page, limit, total };
  }

  /** 各类型待审计数（审核台 tab / 统计卡）。 */
  async queueStat() {
    const rows = await db
      .select({ targetType: moderationItems.targetType, value: count() })
      .from(moderationItems)
      .where(eq(moderationItems.status, 'pending'))
      .groupBy(moderationItems.targetType);

    const byType = {};
    let total = 0;
    for (const r of rows) {
      byType[r.targetType] = Number(r.value);
      total += Number(r.value);
    }
    for (const t of this.listTypes()) {
      if (!(t in byType)) byType[t] = 0;
    }
    return { total, byType };
  }

  /**
   * 某用户提交的待审字段暂存项（本人侧回显 pending 用）。
   * @returns {Promise<Array<{targetType:string, field:string|null, value:any, createdAt:Date}>>}
   */
  async listPending({ submittedBy = null, targetId = null, targetTypes = null, status = 'pending' }) {
    const conds = [eq(moderationItems.status, status)];
    if (submittedBy != null) conds.push(eq(moderationItems.submittedBy, submittedBy));
    if (targetId != null) conds.push(eq(moderationItems.targetId, targetId));
    if (targetTypes?.length) conds.push(inArray(moderationItems.targetType, targetTypes));

    const rows = await db
      .select({
        targetType: moderationItems.targetType,
        field: moderationItems.field,
        payload: moderationItems.payload,
        createdAt: moderationItems.createdAt,
      })
      .from(moderationItems)
      .where(and(...conds));

    return rows.map((r) => ({
      targetType: r.targetType,
      field: r.field,
      value: r.payload?.value ?? null,
      createdAt: r.createdAt,
    }));
  }
}
