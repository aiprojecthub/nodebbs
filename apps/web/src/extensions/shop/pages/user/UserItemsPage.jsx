'use client';

import { useState } from 'react';
import { Package } from 'lucide-react';
import { useUserItems } from '@/extensions/shop/hooks/useUserItems';
import { useItemActions } from '@/extensions/shop/hooks/useItemActions';
import { ItemTypeSelector } from '@/extensions/shop/components/shared/ItemTypeSelector';
import { ItemInventoryGrid } from '@/extensions/rewards/components/user/ItemInventoryGrid';

export default function UserItemsPage() {
  const [itemType, setItemType] = useState('all');
  
  const { items, loading, refetch } = useUserItems({ type: itemType });
  
  // Show all items including badges
  const displayedItems = items;

  const { equip, unequip, actioningItemId } = useItemActions();

  const handleEquip = async (userItemId) => {
    await equip(userItemId, refetch);
  };

  const handleUnequip = async (userItemId) => {
    await unequip(userItemId, refetch);
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-card-foreground mb-2 flex items-center gap-2">
          <Package className="h-6 w-6" />
          我的道具
        </h1>
        <p className="text-muted-foreground">管理你的专属装扮</p>
      </div>

      {/* Item Type Selector & Grid */}
      <ItemTypeSelector value={itemType} onChange={setItemType} excludedTypes={[]}>
        <ItemInventoryGrid
          items={displayedItems}
          onEquip={handleEquip}
          onUnequip={handleUnequip}
          actioningItemId={actioningItemId}
          loading={loading}
          itemType={itemType}
        />
      </ItemTypeSelector>
    </div>
  );
}
