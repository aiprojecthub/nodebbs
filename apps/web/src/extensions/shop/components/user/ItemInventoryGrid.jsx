import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Package } from 'lucide-react';
import { Loading } from '@/components/common/Loading';
import { ItemInventoryCard } from './ItemInventoryCard';
import { getItemTypeLabel } from '@/extensions/shop/utils/itemTypes';

/**
 * 用户物品网格
 * @param {Object} props
 * @param {Array} props.items - 用户物品数组
 * @param {Function} props.onEquip - 点击装备按钮时的回调
 * @param {Function} props.onUnequip - 点击卸下按钮时的回调
 * @param {Function} props.onUse - 点击使用按钮时的回调（消耗品）
 * @param {number} props.actioningItemId - 当前正在操作的物品 ID
 * @param {boolean} props.loading - 加载状态
 * @param {string} props.itemType - 当前物品类型筛选
 */
export function ItemInventoryGrid({ items, onEquip, onUnequip, onUse, actioningItemId, loading, itemType }) {
  if (loading) {
    return (
      <div className="grid grid-cols-2 gap-3 md:gap-4 md:grid-cols-3 lg:grid-cols-4 lg:grid-cols-5">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="aspect-[3/4] rounded-2xl bg-muted/20 animate-pulse border border-border/50" />
        ))}
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <Card className="shadow-none">
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
    <div className="grid grid-cols-2 gap-3 md:gap-4 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
      {items.map((item) => (
        <ItemInventoryCard
          key={item.id}
          item={item}
          onEquip={onEquip}
          onUnequip={onUnequip}
          onUse={onUse}
          actioning={actioningItemId === item.id}
        />
      ))}
    </div>
  );
}
