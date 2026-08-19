import db from '#core/db/index.js';
import {
  lotteries,
  lotteryParticipants,
  lotteryLedgerRefs,
  topics,
  posts,
} from '#modules/forum/db/schema.js';
import { users } from '#core/db/schema.js';
import { and, asc, desc, eq, gt, inArray, isNull, lte, lt, sql } from 'drizzle-orm';
import { DEFAULT_CURRENCY_CODE } from '#core/extensions/ledger/constants.js';
import { extractLotteryIds, stripLotteryDirectives } from '../utils/extractLotteryIds.js';
import notificationService from '#core/services/notificationService.js';

/**
 * 抽奖业务模块
 *
 * 与 ledger 的事务边界：
 *  - LedgerService.deduct/grant 各自启动自己的事务，无法嵌入外层业务事务
 *  - 因此 ledger 调用与 lottery 行写入分两段执行，依靠 try/catch 反向补偿
 *  - lottery_ledger_refs.referenceId 的唯一索引兜底"重复扣发"
 */

const MAX_LOTTERY_TITLE = 200;
const MAX_LOTTERY_DESC = 2000;
const MAX_PRIZE_DESC = 1000;
const MAX_WINNERS = 1000;

function makeRefId(action, lotteryHint, userId) {
  return `lottery_${lotteryHint}_${action}_${userId}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function err(message, statusCode) {
  return Object.assign(new Error(message), { statusCode });
}

/**
 * 校验 lottery 表单数据。createLottery 与 updateDraftLottery 共用。
 */
function validateLotteryData(data, { requireFutureDrawAt = true } = {}) {
  const {
    title,
    description,
    winnersCount,
    pointsPerWinner,
    prizeDescription,
    prizeItems,
    minAccountDays,
    requireReply,
    drawAt,
  } = data;

  if (!title || !String(title).trim()) {
    throw err('标题不能为空', 400);
  }
  if (String(title).length > MAX_LOTTERY_TITLE) {
    throw err(`标题最长 ${MAX_LOTTERY_TITLE} 字`, 400);
  }
  if (description && String(description).length > MAX_LOTTERY_DESC) {
    throw err(`描述最长 ${MAX_LOTTERY_DESC} 字`, 400);
  }
  if (prizeDescription && String(prizeDescription).length > MAX_PRIZE_DESC) {
    throw err(`奖品描述最长 ${MAX_PRIZE_DESC} 字`, 400);
  }
  if (!Number.isInteger(winnersCount) || winnersCount < 1 || winnersCount > MAX_WINNERS) {
    throw err(`名额必须在 1-${MAX_WINNERS} 之间`, 400);
  }
  if (!Number.isInteger(pointsPerWinner) || pointsPerWinner < 0) {
    throw err('每人积分必须是非负整数', 400);
  }
  if (minAccountDays != null && (!Number.isInteger(minAccountDays) || minAccountDays < 0)) {
    throw err('账号天数门槛必须是非负整数', 400);
  }
  if (typeof requireReply !== 'undefined' && typeof requireReply !== 'boolean') {
    throw err('requireReply 必须为布尔值', 400);
  }
  if (!drawAt) {
    throw err('截止时间不能为空', 400);
  }
  const drawAtDate = drawAt instanceof Date ? drawAt : new Date(drawAt);
  if (Number.isNaN(drawAtDate.getTime())) {
    throw err('截止时间格式不正确', 400);
  }
  if (requireFutureDrawAt && drawAtDate.getTime() <= Date.now()) {
    throw err('截止时间必须晚于当前时间', 400);
  }

  // 逐项奖品池：可选；非空时与 prizeDescription 互斥
  if (prizeItems != null) {
    if (!Array.isArray(prizeItems)) {
      throw err('prizeItems 必须是数组', 400);
    }
    if (prizeItems.length !== winnersCount) {
      throw err(`奖品数量 (${prizeItems.length}) 必须等于中奖名额 (${winnersCount})`, 400);
    }
    if (prizeItems.some((s) => typeof s !== 'string' || !s.trim())) {
      throw err('奖品项不能为空', 400);
    }
    if (prizeItems.some((s) => s.length > 500)) {
      throw err('单个奖品项最长 500 字', 400);
    }
    if (prizeDescription) {
      throw err('奖品池与奖品描述只能选一种', 400);
    }
  }
}

function buildPayload(data) {
  const hasPrizeItems = Array.isArray(data.prizeItems) && data.prizeItems.length > 0;
  return {
    title: String(data.title).trim().slice(0, MAX_LOTTERY_TITLE),
    description: data.description ? String(data.description).slice(0, MAX_LOTTERY_DESC) : null,
    winnersCount: data.winnersCount,
    pointsPerWinner: data.pointsPerWinner,
    prizeDescription: hasPrizeItems
      ? null
      : (data.prizeDescription ? String(data.prizeDescription).slice(0, MAX_PRIZE_DESC) : null),
    prizeItems: hasPrizeItems ? data.prizeItems.map((s) => String(s).slice(0, 500)) : null,
    minAccountDays: data.minAccountDays ?? 0,
    requireReply: !!data.requireReply,
    drawAt: data.drawAt instanceof Date ? data.drawAt : new Date(data.drawAt),
  };
}

/**
 * 创建抽奖（草稿，未绑 topic）。
 * 余额不足 → 400；ledger 故障 → 503。
 */
export async function createLottery(data, userId, ledger) {
  validateLotteryData(data);
  const payload = buildPayload(data);
  const totalFreeze = payload.winnersCount * payload.pointsPerWinner;

  // 1. 先扣积分（独立事务）
  let freezeRefId = null;
  if (totalFreeze > 0) {
    freezeRefId = makeRefId('freeze', 'new', userId);
    try {
      await ledger.deduct({
        userId,
        amount: totalFreeze,
        currencyCode: DEFAULT_CURRENCY_CODE,
        type: 'lottery_freeze',
        referenceType: 'lottery',
        referenceId: freezeRefId,
        description: '抽奖冻结',
        metadata: { phase: 'create' },
      });
    } catch (e) {
      if (/Insufficient/.test(e?.message || '')) {
        throw err('积分余额不足', 400);
      }
      throw err(`账本服务不可用：${e.message}`, 503);
    }
  }

  // 2. 写入 lottery + ref（一个事务里）
  try {
    return await db.transaction(async (tx) => {
      const [row] = await tx
        .insert(lotteries)
        .values({
          ...payload,
          topicId: null,
          userId,
          frozenPoints: totalFreeze,
        })
        .returning({ id: lotteries.id });

      if (freezeRefId) {
        await tx.insert(lotteryLedgerRefs).values({
          lotteryId: row.id,
          referenceType: 'freeze',
          referenceId: freezeRefId,
          userId,
          amount: totalFreeze,
        });
      }

      return { id: row.id };
    });
  } catch (insertErr) {
    // 反向补偿：把已扣的积分发回
    if (freezeRefId && totalFreeze > 0) {
      try {
        await ledger.grant({
          userId,
          amount: totalFreeze,
          currencyCode: DEFAULT_CURRENCY_CODE,
          type: 'lottery_refund',
          referenceType: 'lottery',
          referenceId: `${freezeRefId}_rollback`,
          description: '抽奖创建失败回滚',
          metadata: { phase: 'create-rollback' },
        });
      } catch (refundErr) {
        // 不再抛 — 让原错误冒泡，refund 失败仅记录日志
        console.error('[lottery] create rollback refund failed:', refundErr);
      }
    }
    throw insertErr;
  }
}

/**
 * 进程内 in-flight 表：同一 lottery 的并发惰性开奖合并为一次调用。
 * 跨进程/多实例并发由 drawLottery 内的 SELECT FOR UPDATE + ledger ref 唯一索引兜底。
 */
const drawInFlight = new Map();

/**
 * 惰性开奖：读取抽奖时若已到截止时间且仍 pending，立即开奖，
 * 不必等待 2 小时一次的 cleanup 调度（cleanup 仍作为无人访问时的兜底）。
 *
 * 设计取舍：
 *  - 先做一次极轻量的预检查（3 列），绝大多数请求在此直接返回，不额外加锁
 *  - ledger 缺失（如内部调用未传）时跳过，退回定时任务
 *  - 开奖失败只记日志，不影响本次读取——调用方拿到的仍是 pending 状态
 *
 * @returns {Promise<boolean>} 是否实际触发了开奖（调用方据此决定是否重新读取）
 */
export async function maybeDrawDue(lotteryId, ledger, { triggerSource = 'lazy-read' } = {}) {
  if (!ledger) return false;

  const [row] = await db
    .select({
      status: lotteries.status,
      drawAt: lotteries.drawAt,
      topicId: lotteries.topicId,
    })
    .from(lotteries)
    .where(eq(lotteries.id, lotteryId))
    .limit(1);

  if (!row) return false;
  // 草稿（未绑话题）不参与自动开奖，与 drawDueLotteries 的筛选保持一致
  if (row.status !== 'pending' || row.topicId == null) return false;
  if (new Date(row.drawAt).getTime() > Date.now()) return false;

  const existing = drawInFlight.get(lotteryId);
  if (existing) return existing;

  const task = (async () => {
    try {
      const res = await drawLottery(lotteryId, ledger, { triggerSource });
      return !!res?.success && !res.alreadyDrawn;
    } catch (e) {
      console.error(`[lottery lazy-draw ${lotteryId}] failed:`, e?.message || e);
      return false;
    } finally {
      drawInFlight.delete(lotteryId);
    }
  })();

  drawInFlight.set(lotteryId, task);
  return task;
}

/**
 * 获取抽奖详情。
 * - 关联 topic 软删 → 返回 null
 * - prizeDescription 仅对中奖者或创建者返回
 * - 传入 ledger 时：到期未开奖会先惰性开奖，再返回最新结果
 */
export async function getLottery(lotteryId, userId, ledger = null) {
  if (ledger) {
    await maybeDrawDue(lotteryId, ledger);
  }

  const [row] = await db
    .select()
    .from(lotteries)
    .where(eq(lotteries.id, lotteryId))
    .limit(1);

  if (!row) return null;

  if (row.topicId) {
    const [topic] = await db
      .select({ isDeleted: topics.isDeleted })
      .from(topics)
      .where(eq(topics.id, row.topicId))
      .limit(1);
    if (!topic || topic.isDeleted) return null;
  }

  let myParticipated = false;
  let myIsWinner = false;
  let myPrizeItem = null;
  if (userId) {
    const [p] = await db
      .select({
        isWinner: lotteryParticipants.isWinner,
        prizeItem: lotteryParticipants.prizeItem,
      })
      .from(lotteryParticipants)
      .where(and(
        eq(lotteryParticipants.lotteryId, lotteryId),
        eq(lotteryParticipants.userId, userId),
      ))
      .limit(1);
    if (p) {
      myParticipated = true;
      myIsWinner = !!p.isWinner;
      myPrizeItem = p.prizeItem ?? null;
    }
  }

  const isCreator = userId && row.userId === userId;

  let winners = [];
  if (row.status === 'drawn') {
    const winnerRows = await db
      .select({
        userId: users.id,
        username: users.username,
        name: users.name,
        avatar: users.avatar,
        prizeItem: lotteryParticipants.prizeItem,
      })
      .from(lotteryParticipants)
      .innerJoin(users, eq(users.id, lotteryParticipants.userId))
      .where(and(
        eq(lotteryParticipants.lotteryId, lotteryId),
        eq(lotteryParticipants.isWinner, true),
      ))
      .orderBy(asc(lotteryParticipants.id));
    // 仅 creator 看得到对照表里每人分到的奖品项
    winners = winnerRows.map((w) =>
      isCreator ? w : { userId: w.userId, username: w.username, name: w.name, avatar: w.avatar }
    );
  }

  const participants = await db
    .select({
      userId: users.id,
      username: users.username,
      name: users.name,
      avatar: users.avatar,
    })
    .from(lotteryParticipants)
    .innerJoin(users, eq(users.id, lotteryParticipants.userId))
    .where(eq(lotteryParticipants.lotteryId, lotteryId))
    .orderBy(asc(lotteryParticipants.id));

  const canSeePrize = isCreator || (myParticipated && myIsWinner);

  return {
    id: row.id,
    topicId: row.topicId,
    userId: row.userId,
    title: row.title,
    description: row.description,
    winnersCount: row.winnersCount,
    pointsPerWinner: row.pointsPerWinner,
    prizeDescription: canSeePrize ? row.prizeDescription : null,
    prizeItems: isCreator ? (row.prizeItems ?? null) : null,
    myPrizeItem,
    minAccountDays: row.minAccountDays,
    requireReply: row.requireReply,
    drawAt: row.drawAt,
    drawnAt: row.drawnAt,
    status: row.status,
    participantsCount: row.participantsCount,
    frozenPoints: row.frozenPoints,
    createdAt: row.createdAt,
    myParticipated,
    myIsWinner,
    winners,
    participants,
  };
}

/**
 * 用户参与抽奖。
 * - 校验：status='pending'、未截止、账号天数、回复门槛、非创建者
 * - 事务：INSERT participant + participantsCount + 1
 * - UNIQUE 违例 → 409
 */
export async function enterLottery(lotteryId, userId) {
  const [row] = await db
    .select()
    .from(lotteries)
    .where(eq(lotteries.id, lotteryId))
    .limit(1);
  if (!row) throw err('抽奖不存在', 404);
  if (row.status !== 'pending') throw err('抽奖已开奖或已取消', 400);
  if (new Date(row.drawAt).getTime() <= Date.now()) throw err('抽奖已截止', 400);
  if (row.userId === userId) throw err('不能参与自己创建的抽奖', 400);
  if (!row.topicId) throw err('草稿抽奖不能参与', 400);

  // 关联 topic 软删 → 403
  const [topic] = await db
    .select({ isDeleted: topics.isDeleted })
    .from(topics)
    .where(eq(topics.id, row.topicId))
    .limit(1);
  if (!topic || topic.isDeleted) throw err('抽奖所在话题不可用', 400);

  // 账号天数门槛
  if (row.minAccountDays > 0) {
    const [u] = await db
      .select({ createdAt: users.createdAt })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);
    if (!u) throw err('用户不存在', 404);
    const days = (Date.now() - new Date(u.createdAt).getTime()) / (24 * 60 * 60 * 1000);
    if (days < row.minAccountDays) {
      throw err(`需注册满 ${row.minAccountDays} 天才能参与`, 400);
    }
  }

  // 回复门槛
  if (row.requireReply) {
    const [post] = await db
      .select({ id: posts.id })
      .from(posts)
      .where(and(
        eq(posts.topicId, row.topicId),
        eq(posts.userId, userId),
        gt(posts.postNumber, 1),
      ))
      .limit(1);
    if (!post) throw err('需先回复该话题才能参与', 400);
  }

  try {
    await db.transaction(async (tx) => {
      await tx.insert(lotteryParticipants).values({
        lotteryId,
        userId,
        isWinner: false,
      });
      await tx
        .update(lotteries)
        .set({ participantsCount: sql`${lotteries.participantsCount} + 1` })
        .where(eq(lotteries.id, lotteryId));
    });
    return { success: true };
  } catch (e) {
    if (e.code === '23505' || e.cause?.code === '23505') {
      throw err('您已参与该抽奖', 409);
    }
    throw e;
  }
}

/**
 * Fisher-Yates 随机洗牌。
 */
function shuffle(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/**
 * 开奖。triggerSource: 'user-early' | 'admin-early' | 'system-auto'
 *
 * 流程（分步执行，靠 ref 唯一索引兜底重复发放）：
 *  1. 事务 A：SELECT FOR UPDATE + 校验 status='pending' + 随机选 winners +
 *             标 isWinner + UPDATE lottery status='drawn' drawnAt=now
 *  2. 事务 A 外：循环对每个 winner 调 ledger.grant + 写 ref(grant)
 *  3. 退还差额（actualWinners < winnersCount）→ ledger.grant 给 creator + 写 ref(refund)
 *
 * 任意 grant 失败：日志记录，依赖 ref 唯一索引 + 下次重跑保证幂等。
 */
export async function drawLottery(lotteryId, ledger, { triggerSource = 'user-early' } = {}) {
  let preparedWinnerIds = [];
  let row = null;
  let actualWinnersCount = 0;

  await db.transaction(async (tx) => {
    const [locked] = await tx
      .select()
      .from(lotteries)
      .where(eq(lotteries.id, lotteryId))
      .for('update')
      .limit(1);
    if (!locked) throw err('抽奖不存在', 404);
    if (locked.status !== 'pending') {
      // 并发开奖兜底：直接返回，不报错
      row = locked;
      return;
    }
    row = locked;

    const participants = await tx
      .select({ id: lotteryParticipants.id, userId: lotteryParticipants.userId })
      .from(lotteryParticipants)
      .where(eq(lotteryParticipants.lotteryId, lotteryId));

    if (participants.length > 0) {
      const winners = shuffle(participants).slice(0, locked.winnersCount);
      const winnerIds = winners.map((w) => w.id);
      preparedWinnerIds = winners.map((w) => w.userId);
      actualWinnersCount = winners.length;

      await tx
        .update(lotteryParticipants)
        .set({ isWinner: true })
        .where(inArray(lotteryParticipants.id, winnerIds));

      // 逐项奖品分配（仅 prize_items 非空时）：洗牌奖品池后 1:1 写入
      if (Array.isArray(locked.prizeItems) && locked.prizeItems.length > 0) {
        const shuffledPrizes = shuffle(locked.prizeItems);
        for (let i = 0; i < winners.length; i++) {
          const prizeItem = shuffledPrizes[i];
          if (prizeItem == null) continue;
          await tx
            .update(lotteryParticipants)
            .set({ prizeItem })
            .where(eq(lotteryParticipants.id, winners[i].id));
        }
      }
    }

    await tx
      .update(lotteries)
      .set({ status: 'drawn', drawnAt: new Date() })
      .where(eq(lotteries.id, lotteryId));
  });

  if (!row || row.status !== 'pending') {
    return { success: true, alreadyDrawn: true };
  }

  // 2. 发放积分（幂等：refId 与 triggerSource 无关，重试时同一个 lottery+winner 永远命中已有 ref）
  if (row.pointsPerWinner > 0 && preparedWinnerIds.length > 0) {
    for (const winnerUserId of preparedWinnerIds) {
      const refId = `lottery_${lotteryId}_grant_${winnerUserId}`;
      // 已发过 → 跳过
      const existing = await db
        .select({ id: lotteryLedgerRefs.id })
        .from(lotteryLedgerRefs)
        .where(and(
          eq(lotteryLedgerRefs.referenceType, 'grant'),
          eq(lotteryLedgerRefs.referenceId, refId),
        ))
        .limit(1);
      if (existing.length > 0) continue;
      try {
        await ledger.grant({
          userId: winnerUserId,
          amount: row.pointsPerWinner,
          currencyCode: DEFAULT_CURRENCY_CODE,
          type: 'lottery_grant',
          referenceType: 'lottery',
          referenceId: refId,
          description: '抽奖中奖发放',
          metadata: { lotteryId, triggerSource },
        });
        await db.insert(lotteryLedgerRefs).values({
          lotteryId,
          referenceType: 'grant',
          referenceId: refId,
          userId: winnerUserId,
          amount: row.pointsPerWinner,
        }).onConflictDoNothing();
      } catch (e) {
        console.error(`[lottery ${lotteryId}] grant failed for user ${winnerUserId}:`, e?.message || e);
      }
    }
  }

  // 3. 退还差额给创建者（同样幂等）
  const refundAmount = (row.winnersCount - actualWinnersCount) * row.pointsPerWinner;
  if (refundAmount > 0) {
    const refundRefId = `lottery_${lotteryId}_refund_draw`;
    const existing = await db
      .select({ id: lotteryLedgerRefs.id })
      .from(lotteryLedgerRefs)
      .where(and(
        eq(lotteryLedgerRefs.referenceType, 'refund'),
        eq(lotteryLedgerRefs.referenceId, refundRefId),
      ))
      .limit(1);
    if (existing.length === 0) {
      try {
        await ledger.grant({
          userId: row.userId,
          amount: refundAmount,
          currencyCode: DEFAULT_CURRENCY_CODE,
          type: 'lottery_refund',
          referenceType: 'lottery',
          referenceId: refundRefId,
          description: '抽奖未中名额退还',
          metadata: { lotteryId, triggerSource },
        });
        await db.insert(lotteryLedgerRefs).values({
          lotteryId,
          referenceType: 'refund',
          referenceId: refundRefId,
          userId: row.userId,
          amount: refundAmount,
        }).onConflictDoNothing();
      } catch (e) {
        console.error(`[lottery ${lotteryId}] refund failed:`, e?.message || e);
      }
    }
  }

  // 4. 发开奖通知（事务已 commit，失败仅日志，不影响开奖结果）
  try {
    await sendDrawNotifications({
      lotteryId,
      creatorId: row.userId,
      topicId: row.topicId,
      title: row.title,
      pointsPerWinner: row.pointsPerWinner,
      winnerUserIds: preparedWinnerIds,
      refundedAmount: refundAmount,
    });
  } catch (e) {
    console.error(`[lottery ${lotteryId}] notification dispatch failed:`, e?.message || e);
  }

  return {
    success: true,
    winnersCount: actualWinnersCount,
    refundedAmount: refundAmount,
  };
}

/**
 * 给中奖者 / 未中奖参与者 / 创建者发开奖通知。
 * 拆出独立函数便于测试与失败隔离。
 */
async function sendDrawNotifications({
  lotteryId,
  creatorId,
  topicId,
  title,
  pointsPerWinner,
  winnerUserIds,
  refundedAmount,
}) {
  // 拉全部参与者（不含创建者）
  const participantRows = await db
    .select({ userId: lotteryParticipants.userId, isWinner: lotteryParticipants.isWinner })
    .from(lotteryParticipants)
    .where(eq(lotteryParticipants.lotteryId, lotteryId));

  const winnerSet = new Set(winnerUserIds);
  const payloads = [];

  for (const p of participantRows) {
    if (winnerSet.has(p.userId)) {
      payloads.push({
        userId: p.userId,
        type: 'lottery_won',
        triggeredByUserId: creatorId,
        topicId,
        message: `恭喜！你在抽奖「${title}」中中奖了`,
        metadata: { lotteryId, pointsAwarded: pointsPerWinner || 0 },
      });
    } else {
      payloads.push({
        userId: p.userId,
        type: 'lottery_lost',
        triggeredByUserId: creatorId,
        topicId,
        message: `抽奖「${title}」已开奖，可惜没有中奖`,
        metadata: { lotteryId },
      });
    }
  }

  // 创建者总结
  payloads.push({
    userId: creatorId,
    type: 'lottery_drawn',
    triggeredByUserId: null,
    topicId,
    message: winnerUserIds.length > 0
      ? `你的抽奖「${title}」已开奖，${winnerUserIds.length} 人中奖${refundedAmount > 0 ? `，已退还 ${refundedAmount} 积分` : ''}`
      : `你的抽奖「${title}」已开奖，无人参与，已退还 ${refundedAmount} 积分`,
    metadata: { lotteryId, winnersCount: winnerUserIds.length, refundedAmount },
  });

  if (payloads.length > 0) {
    await notificationService.sendBatch(payloads);
  }
}

/**
 * 编辑草稿。仅 owner + 未绑 + status='pending'。
 * 改 N×P 多退少补。
 */
export async function updateDraftLottery(lotteryId, data, userId, ledger) {
  validateLotteryData(data);
  const payload = buildPayload(data);
  const newFreeze = payload.winnersCount * payload.pointsPerWinner;

  // 1. 锁 + 校验 + 读取旧 frozen
  const oldFrozen = await db.transaction(async (tx) => {
    const [row] = await tx
      .select()
      .from(lotteries)
      .where(eq(lotteries.id, lotteryId))
      .for('update')
      .limit(1);
    if (!row) throw err('抽奖不存在', 404);
    if (row.userId !== userId) throw err('没有权限修改此抽奖', 403);
    if (row.topicId !== null) throw err('已发布的抽奖不允许修改', 400);
    if (row.status !== 'pending') throw err('已开奖的抽奖不允许修改', 400);
    return row.frozenPoints;
  });

  const delta = newFreeze - oldFrozen;

  // 2. 调整积分（独立事务）
  let extraRefId = null;
  let refundRefId = null;
  if (delta > 0) {
    extraRefId = makeRefId('freeze', `${lotteryId}_edit`, userId);
    try {
      await ledger.deduct({
        userId,
        amount: delta,
        currencyCode: DEFAULT_CURRENCY_CODE,
        type: 'lottery_freeze',
        referenceType: 'lottery',
        referenceId: extraRefId,
        description: '抽奖编辑追加冻结',
        metadata: { lotteryId, phase: 'edit' },
      });
    } catch (e) {
      if (/Insufficient/.test(e?.message || '')) {
        throw err('积分余额不足', 400);
      }
      throw err(`账本服务不可用：${e.message}`, 503);
    }
  } else if (delta < 0) {
    refundRefId = makeRefId('refund', `${lotteryId}_edit`, userId);
    try {
      await ledger.grant({
        userId,
        amount: -delta,
        currencyCode: DEFAULT_CURRENCY_CODE,
        type: 'lottery_refund',
        referenceType: 'lottery',
        referenceId: refundRefId,
        description: '抽奖编辑减少名额退还',
        metadata: { lotteryId, phase: 'edit' },
      });
    } catch (e) {
      throw err(`账本服务不可用：${e.message}`, 503);
    }
  }

  // 3. 写入 lottery + ref
  try {
    await db.transaction(async (tx) => {
      await tx
        .update(lotteries)
        .set({ ...payload, frozenPoints: newFreeze })
        .where(eq(lotteries.id, lotteryId));

      if (extraRefId) {
        await tx.insert(lotteryLedgerRefs).values({
          lotteryId,
          referenceType: 'freeze',
          referenceId: extraRefId,
          userId,
          amount: delta,
        });
      } else if (refundRefId) {
        await tx.insert(lotteryLedgerRefs).values({
          lotteryId,
          referenceType: 'refund',
          referenceId: refundRefId,
          userId,
          amount: -delta,
        });
      }
    });
    return { success: true };
  } catch (e) {
    // 反向补偿：把已经走完的 ledger 调用反向回滚
    if (extraRefId) {
      // 之前 deduct 过 delta，现在补 grant 回去
      try {
        await ledger.grant({
          userId,
          amount: delta,
          currencyCode: DEFAULT_CURRENCY_CODE,
          type: 'lottery_refund',
          referenceType: 'lottery',
          referenceId: `${extraRefId}_rollback`,
          description: '抽奖编辑回滚退还',
          metadata: { lotteryId, phase: 'edit-rollback' },
        });
      } catch (rb) {
        console.error('[lottery] edit rollback refund failed:', rb);
      }
    } else if (refundRefId) {
      // 之前 grant 过 -delta 给创建者，现在反向 deduct 回去
      try {
        await ledger.deduct({
          userId,
          amount: -delta,
          currencyCode: DEFAULT_CURRENCY_CODE,
          type: 'lottery_freeze',
          referenceType: 'lottery',
          referenceId: `${refundRefId}_rollback`,
          description: '抽奖编辑回滚再冻结',
          metadata: { lotteryId, phase: 'edit-rollback' },
          allowNegative: true,
        });
      } catch (rb) {
        console.error('[lottery] edit rollback re-deduct failed:', rb);
      }
    }
    throw e;
  }
}

/**
 * 列出某话题已绑的抽奖（详情列表，不含 winners 完整解析）。
 * 传入 ledger 时同样支持到期惰性开奖。
 */
export async function listLotteriesByTopic(topicId, ledger = null) {
  const rows = await db
    .select({ id: lotteries.id })
    .from(lotteries)
    .where(eq(lotteries.topicId, topicId))
    .orderBy(asc(lotteries.createdAt));
  const detailed = await Promise.all(rows.map((r) => getLottery(r.id, null, ledger)));
  return { lotteries: detailed.filter(Boolean) };
}

/**
 * 列出当前用户的草稿（topicId IS NULL）。
 */
export async function listDraftLotteries(userId, { page = 1, limit = 20 } = {}) {
  const safeLimit = Math.min(Math.max(1, limit), 100);
  const offset = (Math.max(1, page) - 1) * safeLimit;

  const drafts = await db
    .select({
      id: lotteries.id,
      title: lotteries.title,
      winnersCount: lotteries.winnersCount,
      pointsPerWinner: lotteries.pointsPerWinner,
      drawAt: lotteries.drawAt,
      frozenPoints: lotteries.frozenPoints,
      createdAt: lotteries.createdAt,
    })
    .from(lotteries)
    .where(and(eq(lotteries.userId, userId), isNull(lotteries.topicId)))
    .orderBy(desc(lotteries.createdAt))
    .limit(safeLimit)
    .offset(offset);

  const [{ count }] = await db
    .select({ count: sql`count(*)::int` })
    .from(lotteries)
    .where(and(eq(lotteries.userId, userId), isNull(lotteries.topicId)));

  return { drafts, total: count };
}

/**
 * 把 markdown 正文里所有 ::lottery{id="..."} 指令绑定到 topic。
 * 规则同投票：只绑定属于 userId 的 lottery 草稿，盗用引用从内容里剥离。
 */
export async function bindLotteriesToTopic(topicId, content, userId) {
  const ids = extractLotteryIds(content);
  if (ids.length === 0) return content;

  const numericIds = ids
    .map((s) => Number(s))
    .filter((n) => Number.isInteger(n) && n > 0);

  if (numericIds.length === 0) {
    return stripLotteryDirectives(content, ids);
  }

  const rows = await db
    .select({
      id: lotteries.id,
      topicId: lotteries.topicId,
      userId: lotteries.userId,
    })
    .from(lotteries)
    .where(inArray(lotteries.id, numericIds));

  const rowsById = new Map(rows.map((r) => [r.id, r]));
  const invalidIds = [];
  const toBindIds = [];

  for (const idStr of ids) {
    const idNum = Number(idStr);
    const row = rowsById.get(idNum);
    if (!row) {
      invalidIds.push(idStr);
      continue;
    }
    if (row.userId !== userId) {
      invalidIds.push(idStr);
      continue;
    }
    if (row.topicId == null) {
      toBindIds.push(idNum);
    } else if (row.topicId !== topicId) {
      invalidIds.push(idStr);
    }
  }

  if (toBindIds.length > 0) {
    await db
      .update(lotteries)
      .set({ topicId })
      .where(inArray(lotteries.id, toBindIds));
  }

  return invalidIds.length > 0 ? stripLotteryDirectives(content, invalidIds) : content;
}

/**
 * 删除抽奖。
 * 业务规则：
 *  - owner 删未绑草稿：退 frozenPoints，删
 *  - owner 删已绑：400
 *  - admin 删已绑 pending：退 frozenPoints，删
 *  - admin 删已绑 drawn：不退，删
 *  - admin 删未绑：同 owner 删草稿
 */
export async function deleteLottery(lotteryId, { isAdmin = false } = {}, ledger) {
  const [row] = await db
    .select()
    .from(lotteries)
    .where(eq(lotteries.id, lotteryId))
    .limit(1);
  if (!row) throw err('抽奖不存在', 404);

  const isDraft = row.topicId == null;
  if (!isDraft && !isAdmin) {
    throw err('已发布的抽奖不允许删除，请先从话题正文中移除引用', 400);
  }

  // 决定是否退积分
  const shouldRefund =
    (isDraft && row.frozenPoints > 0) ||
    (isAdmin && !isDraft && row.status === 'pending' && row.frozenPoints > 0);

  if (shouldRefund) {
    const refId = `lottery_${lotteryId}_refund_delete`;
    try {
      await ledger.grant({
        userId: row.userId,
        amount: row.frozenPoints,
        currencyCode: DEFAULT_CURRENCY_CODE,
        type: 'lottery_refund',
        referenceType: 'lottery',
        referenceId: refId,
        description: isDraft ? '抽奖草稿删除退还' : '抽奖管理员取消退还',
        metadata: { lotteryId, phase: 'delete' },
      });
      await db.insert(lotteryLedgerRefs).values({
        lotteryId,
        referenceType: 'refund',
        referenceId: refId,
        userId: row.userId,
        amount: row.frozenPoints,
      }).onConflictDoNothing();
    } catch (e) {
      // 退款失败：记录但仍允许删除（避免锁死管理员/草稿）
      console.error(`[lottery ${lotteryId}] delete refund failed:`, e?.message || e);
    }
  }

  await db.delete(lotteries).where(eq(lotteries.id, lotteryId));
  return { success: true };
}

/**
 * 清理过期草稿（创建超过 7 天未绑 topic）+ 退还冻结积分。
 */
export async function cleanupExpiredDraftLotteries(ledger) {
  const threshold = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const rows = await db
    .select({ id: lotteries.id, userId: lotteries.userId, frozenPoints: lotteries.frozenPoints })
    .from(lotteries)
    .where(and(isNull(lotteries.topicId), lt(lotteries.createdAt, threshold)));

  let processed = 0;
  for (const r of rows) {
    if (r.frozenPoints > 0) {
      const refId = `lottery_${r.id}_refund_cleanup`;
      try {
        await ledger.grant({
          userId: r.userId,
          amount: r.frozenPoints,
          currencyCode: DEFAULT_CURRENCY_CODE,
          type: 'lottery_refund',
          referenceType: 'lottery',
          referenceId: refId,
          description: '过期草稿抽奖退还',
          metadata: { lotteryId: r.id, phase: 'cleanup' },
        });
        await db.insert(lotteryLedgerRefs).values({
          lotteryId: r.id,
          referenceType: 'refund',
          referenceId: refId,
          userId: r.userId,
          amount: r.frozenPoints,
        }).onConflictDoNothing();
      } catch (e) {
        console.error(`[lottery cleanup ${r.id}] refund failed:`, e?.message || e);
        continue; // 跳过删除，下次重试
      }
    }
    await db.delete(lotteries).where(eq(lotteries.id, r.id));
    processed++;
  }
  return processed;
}

/**
 * 由 cleanup 任务调度：到期且仍 pending 的抽奖自动开奖。
 */
export async function drawDueLotteries(ledger) {
  const rows = await db
    .select({ id: lotteries.id })
    .from(lotteries)
    .where(and(
      eq(lotteries.status, 'pending'),
      lte(lotteries.drawAt, new Date()),
      sql`${lotteries.topicId} IS NOT NULL`,
    ));

  let drawn = 0;
  for (const r of rows) {
    try {
      const res = await drawLottery(r.id, ledger, { triggerSource: 'system-auto' });
      if (res?.success && !res.alreadyDrawn) drawn++;
    } catch (e) {
      console.error(`[lottery auto-draw ${r.id}] failed:`, e?.message || e);
    }
  }
  return drawn;
}
