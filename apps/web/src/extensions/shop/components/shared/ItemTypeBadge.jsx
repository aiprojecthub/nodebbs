import { Badge } from '@/components/ui/badge';
import { getItemTypeLabel } from '../../utils/itemTypes';

/**
 * Display item type badge
 * @param {Object} props
 * @param {string} props.type - Item type
 * @param {string} props.variant - Badge variant
 */
export function ItemTypeBadge({ type, variant = 'default' }) {
  const label = getItemTypeLabel(type);

  return (
    <Badge variant={variant}>
      {label}
    </Badge>
  );
}
