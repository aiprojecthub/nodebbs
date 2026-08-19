import { Badge } from '@/components/ui/badge';
import { getTransactionTypeLabel, getTransactionTypeColor } from '../../utils/transactionTypes';

/**
 * Display transaction type badge
 * @param {Object} props
 * @param {string} props.type - Transaction type key
 */
export function TransactionTypeBadge({ type, amount, meta }) {
  let label = getTransactionTypeLabel(type);
  let variant = getTransactionTypeColor(type);

  // 特殊处理：打赏帖子 (Reward Post)
  if (type === 'reward_post') {
    const isTopic = meta?.isTopic;

    if (amount > 0) {
      // 收入：收到打赏
      label = isTopic ? '收到话题打赏' : '收到回复打赏';
      variant = getTransactionTypeColor('receive_reward') || 'default';
    } else {
      // 支出：打赏他人
      label = isTopic ? '打赏话题' : '打赏回复';
      // keep default destructive variant
    }
  }

  // 附件购买与打赏同理：ledger.transfer 给转出/转入两侧写的是同一个 type，
  // 收支只能按金额正负区分（表里登记的是购买者视角）
  if (type === 'attachment_purchase') {
    label = amount > 0 ? '附件被购买' : '购买附件';
    variant = amount > 0 ? 'default' : 'destructive';
  } else if (type === 'attachment_purchase_refund') {
    label = amount > 0 ? '附件购买退款' : '附件退款支出';
    variant = amount > 0 ? 'default' : 'destructive';
  }

  return (
    <Badge variant={variant} className="text-sm border-0">
      {label}
    </Badge>
  );
}
