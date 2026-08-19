/**
 * Transaction type mappings and utilities
 */

export const TRANSACTION_TYPES = {
  CHECK_IN: 'check_in',
  POST_TOPIC: 'post_topic',
  POST_REPLY: 'post_reply',
  RECEIVE_LIKE: 'receive_like',
  REWARD_POST: 'reward_post',
  RECEIVE_REWARD: 'receive_reward',
  BUY_AVATAR_FRAME: 'buy_avatar_frame',
  BUY_BADGE: 'buy_badge',
  BUY_ITEM: 'buy_item',
  INVITE_USER: 'invite_user',
  ADMIN_GRANT: 'admin_grant',
  ADMIN_DEDUCT: 'admin_deduct',
  GIFT_SENT: 'gift_sent',
  SHOP_PURCHASE: 'shop_purchase',
  GENERATE_INVITATION: 'generate_invitation',
  LOTTERY_FREEZE: 'lottery_freeze',
  LOTTERY_GRANT: 'lottery_grant',
  LOTTERY_REFUND: 'lottery_refund',
  ATTACHMENT_PURCHASE: 'attachment_purchase',
  ATTACHMENT_PURCHASE_REFUND: 'attachment_purchase_refund',
};

export const TRANSACTION_TYPE_LABELS = {
  [TRANSACTION_TYPES.CHECK_IN]: '签到',
  [TRANSACTION_TYPES.POST_TOPIC]: '发布话题',
  [TRANSACTION_TYPES.POST_REPLY]: '发布回复',
  [TRANSACTION_TYPES.RECEIVE_LIKE]: '获得点赞',
  [TRANSACTION_TYPES.REWARD_POST]: '打赏帖子',
  [TRANSACTION_TYPES.RECEIVE_REWARD]: '收到打赏',
  [TRANSACTION_TYPES.BUY_AVATAR_FRAME]: '购买头像框',
  [TRANSACTION_TYPES.BUY_BADGE]: '购买勋章',
  [TRANSACTION_TYPES.BUY_ITEM]: '购买商品',
  [TRANSACTION_TYPES.INVITE_USER]: '邀请用户',
  [TRANSACTION_TYPES.ADMIN_GRANT]: '管理员发放',
  [TRANSACTION_TYPES.ADMIN_DEDUCT]: '管理员扣除',
  [TRANSACTION_TYPES.GIFT_SENT]: '赠送商品',
  [TRANSACTION_TYPES.SHOP_PURCHASE]: '购买商品',
  [TRANSACTION_TYPES.GENERATE_INVITATION]: '生成邀请码',
  [TRANSACTION_TYPES.LOTTERY_FREEZE]: '抽奖冻结',
  [TRANSACTION_TYPES.LOTTERY_GRANT]: '抽奖中奖',
  [TRANSACTION_TYPES.LOTTERY_REFUND]: '抽奖退还',
  [TRANSACTION_TYPES.ATTACHMENT_PURCHASE]: '购买附件',
  [TRANSACTION_TYPES.ATTACHMENT_PURCHASE_REFUND]: '附件购买退款',
};

export const TRANSACTION_TYPE_COLORS = {
  [TRANSACTION_TYPES.CHECK_IN]: 'default',
  [TRANSACTION_TYPES.POST_TOPIC]: 'default',
  [TRANSACTION_TYPES.POST_REPLY]: 'default',
  [TRANSACTION_TYPES.RECEIVE_LIKE]: 'default',
  [TRANSACTION_TYPES.REWARD_POST]: 'destructive',
  [TRANSACTION_TYPES.RECEIVE_REWARD]: 'default',
  [TRANSACTION_TYPES.BUY_AVATAR_FRAME]: 'destructive',
  [TRANSACTION_TYPES.BUY_BADGE]: 'destructive',
  [TRANSACTION_TYPES.BUY_ITEM]: 'destructive',
  [TRANSACTION_TYPES.INVITE_USER]: 'default',
  [TRANSACTION_TYPES.ADMIN_GRANT]: 'default',
  [TRANSACTION_TYPES.ADMIN_DEDUCT]: 'destructive',
  [TRANSACTION_TYPES.GIFT_SENT]: 'destructive',
  [TRANSACTION_TYPES.SHOP_PURCHASE]: 'destructive',
  [TRANSACTION_TYPES.GENERATE_INVITATION]: 'destructive',
  [TRANSACTION_TYPES.LOTTERY_FREEZE]: 'destructive',
  [TRANSACTION_TYPES.LOTTERY_GRANT]: 'default',
  [TRANSACTION_TYPES.LOTTERY_REFUND]: 'default',
  [TRANSACTION_TYPES.ATTACHMENT_PURCHASE]: 'destructive',
  [TRANSACTION_TYPES.ATTACHMENT_PURCHASE_REFUND]: 'default',
};

/**
 * Get the label for a transaction type
 * @param {string} type - Transaction type key
 * @returns {string} Human-readable label
 */
export function getTransactionTypeLabel(type) {
  return TRANSACTION_TYPE_LABELS[type] || type;
}

/**
 * Get the badge color variant for a transaction type
 * @param {string} type - Transaction type key
 * @returns {string} Badge variant
 */
export function getTransactionTypeColor(type) {
  return TRANSACTION_TYPE_COLORS[type] || 'default';
}

/**
 * Check if a transaction type is a debit (negative amount)
 * @param {string} type - Transaction type key
 * @returns {boolean}
 */
export function isDebitTransaction(type) {
  return TRANSACTION_TYPE_COLORS[type] === 'destructive';
}
