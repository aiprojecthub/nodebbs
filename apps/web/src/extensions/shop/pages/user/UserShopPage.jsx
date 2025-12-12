'use client';

import { useState } from 'react';
import { ShoppingCart } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { shopApi } from '@/lib/api';
import { toast } from 'sonner';
import { useCreditsBalance } from '@/extensions/credits/hooks/useCreditsBalance';
import { useShopItems } from '@/extensions/shop/hooks/useShopItems';
import { BalanceCard } from '@/extensions/credits/components/user/BalanceCard';
import { ItemTypeSelector } from '@/extensions/shop/components/shared/ItemTypeSelector';
import { ShopItemGrid } from '@/extensions/credits/components/user/ShopItemGrid';
import { PurchaseDialog } from '@/extensions/credits/components/user/PurchaseDialog';
import { BadgeUnlockDialog } from '@/extensions/credits/components/user/BadgeUnlockDialog';

export default function UserShopPage() {
  const { isAuthenticated } = useAuth();
  const [itemType, setItemType] = useState('all');
  const [selectedItem, setSelectedItem] = useState(null);
  const [buyDialogOpen, setBuyDialogOpen] = useState(false);
  const [isBuying, setIsBuying] = useState(false);
  
  // Badge unlock state
  const [unlockedBadge, setUnlockedBadge] = useState(null);
  const [showUnlockDialog, setShowUnlockDialog] = useState(false);

  const { balance, refetch: refetchBalance } = useCreditsBalance();
  const { items, loading, refetch: refetchItems } = useShopItems({ type: itemType });

  const handleBuyClick = (item) => {
    if (!isAuthenticated) {
      toast.error('请先登录');
      return;
    }
    setSelectedItem(item);
    setBuyDialogOpen(true);
  };

  const handleBuy = async (data = {}) => {
    if (!selectedItem) return;
    const { isGift, receiverId, message } = data;

    setIsBuying(true);
    try {
      if (isGift) {
        await shopApi.giftItem(selectedItem.id, receiverId, message);
        toast.success('赠送成功！');
      } else {
        await shopApi.buyItem(selectedItem.id);
        
        // Show success feedback
        if (selectedItem.type === 'badge') {
          setUnlockedBadge(selectedItem);
          setShowUnlockDialog(true);
        } else {
          toast.success('购买成功！');
        }
      }
      
      // Close buy dialog
      setBuyDialogOpen(false);
      
      // Update data
      await refetchBalance();
      await refetchItems();

      setSelectedItem(null);
    } catch (error) {
      toast.error(error.message || '购买失败');
    } finally {
      setIsBuying(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-card-foreground mb-2 flex items-center gap-2">
            <ShoppingCart className="h-6 w-6" />
            积分商城
          </h1>
          <p className="text-muted-foreground">使用积分购买专属装扮</p>
        </div>

        {/* Balance Display */}
        {isAuthenticated && balance?.balance !== undefined && balance?.balance !== null && (
          <BalanceCard balance={balance.balance} />
        )}
      </div>

      {/* Item Type Selector & Grid */}
      <ItemTypeSelector value={itemType} onChange={setItemType} excludedTypes={[]}>
        <ShopItemGrid
          items={items}
          userBalance={balance?.balance ?? null}
          onPurchase={handleBuyClick}
          isAuthenticated={isAuthenticated}
          loading={loading}
        />
      </ItemTypeSelector>

      {/* Purchase Dialog */}
      <PurchaseDialog
        open={buyDialogOpen}
        item={selectedItem}
        userBalance={balance?.balance ?? null}
        onConfirm={handleBuy}
        onCancel={() => setBuyDialogOpen(false)}
        purchasing={isBuying}
      />

      {/* Badge Unlock Dialog */}
      <BadgeUnlockDialog
        open={showUnlockDialog}
        onOpenChange={setShowUnlockDialog}
        badgeItem={unlockedBadge}
      />
    </div>
  );
}
