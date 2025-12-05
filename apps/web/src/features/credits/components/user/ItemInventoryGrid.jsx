import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Package } from 'lucide-react';
import { Loading } from '@/components/common/Loading';
import { ItemInventoryCard } from './ItemInventoryCard';
import { getItemTypeLabel } from '../../utils/itemTypes';

/**
 * Grid of user's items
 * @param {Object} props
 * @param {Array} props.items - Array of user items
 * @param {Function} props.onEquip - Callback when equip button clicked
 * @param {Function} props.onUnequip - Callback when unequip button clicked
 * @param {number} props.actioningItemId - ID of item currently being actioned
 * @param {boolean} props.loading - Loading state
 * @param {string} props.itemType - Current item type filter
 */
export function ItemInventoryGrid({ items, onEquip, onUnequip, actioningItemId, loading, itemType }) {
  if (loading) {
    return <Loading text="加载中..." className="py-12" />;
  }

  if (items.length === 0) {
    return (
      <Card>
        <CardContent className="text-center py-12">
          <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-50" />
          <h3 className="text-lg font-medium text-card-foreground mb-2">
            暂无道具
          </h3>
          <p className="text-muted-foreground mb-4">
            {itemType === 'all'
              ? '你还没有购买任何道具'
              : `你还没有购买${getItemTypeLabel(itemType)}`}
          </p>
          <Button onClick={() => (window.location.href = '/profile/shop')}>
            前往商城
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {items.map((item) => (
        <ItemInventoryCard
          key={item.id}
          item={item}
          onEquip={onEquip}
          onUnequip={onUnequip}
          actioning={actioningItemId === item.id}
        />
      ))}
    </div>
  );
}
