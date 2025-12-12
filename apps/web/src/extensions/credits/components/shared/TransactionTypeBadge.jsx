import { Badge } from '@/components/ui/badge';
import { getTransactionTypeLabel, getTransactionTypeColor } from '../../utils/transactionTypes';

/**
 * Display transaction type badge
 * @param {Object} props
 * @param {string} props.type - Transaction type key
 */
export function TransactionTypeBadge({ type }) {
  const label = getTransactionTypeLabel(type);
  const variant = getTransactionTypeColor(type);

  return (
    <Badge variant={variant} className="text-sm">
      {label}
    </Badge>
  );
}
