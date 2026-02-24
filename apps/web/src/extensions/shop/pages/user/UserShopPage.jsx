'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ShoppingCart } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useDefaultCurrencyName, DEFAULT_CURRENCY_CODE } from '@/extensions/ledger/contexts/LedgerContext';
import { shopApi, rewardsApi, ledgerApi } from '@/lib/api';
import { toast } from 'sonner';
import { useShopItems } from '@/extensions/shop/hooks/useShopItems';
import { ItemTypeSelector } from '@/extensions/shop/components/shared/ItemTypeSelector';
import { PurchaseDialog } from '../../components/user/PurchaseDialog';
import { ItemPurchaseSuccessDialog } from '../../components/user/ItemPurchaseSuccessDialog';
import { BadgeUnlockDialog } from '../../components/user/BadgeUnlockDialog';
import { ShopItemGrid } from '../../components/user/ShopItemGrid';

export default function UserShopPage() {
  const router = useRouter();
  const { isAuthenticated } = useAuth();
  const currencyName = useDefaultCurrencyName();
  const [itemType, setItemType] = useState('all');
  const [selectedItem, setSelectedItem] = useState(null);
  const [buyDialogOpen, setBuyDialogOpen] = useState(false);
  const [isBuying, setIsBuying] = useState(false);
  
  // 勋章解锁状态
  const [unlockedBadge, setUnlockedBadge] = useState(null);
  const [showUnlockDialog, setShowUnlockDialog] = useState(false);
  
  // 购买成功跳转状态
  const [showViewItemsDialog, setShowViewItemsDialog] = useState(false);
  const [purchasedItem, setPurchasedItem] = useState(null); // Track purchased item for success dialog

  const [accounts, setAccounts] = useState([]);
  const { items, loading, refetch: refetchItems, setItems } = useShopItems({ type: itemType });
  
  const fetchAccounts = async () => {
    try {
      if (isAuthenticated) {
        const data = await ledgerApi.getAccounts();
        setAccounts(data);
      }
    } catch (error) {
       console.error('Failed to fetch accounts', error);
    }
  };

  useEffect(() => {
    fetchAccounts();
  }, [isAuthenticated]);

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
    const { isGift, receiverId, message, quantity = 1 } = data;

    setIsBuying(true);
    try {
      if (isGift) {
        await shopApi.giftItem(selectedItem.id, receiverId, message, quantity);
        toast.success('赠送成功！');
      } else {
        await shopApi.buyItem(selectedItem.id, quantity);
        
        // 显示成功反馈
        if (selectedItem.type === 'badge') {
          setUnlockedBadge(selectedItem);
          setShowUnlockDialog(true);
        } else {
          setPurchasedItem(selectedItem);
          setShowViewItemsDialog(true);
        }
      }
      
      // 关闭购买对话框
      setBuyDialogOpen(false);
      
      // 刷新余额
      fetchAccounts();

      // 乐观更新：手动更新本地商品状态
      if (!isGift && selectedItem) {
          setItems(prevItems => prevItems.map(item => {
              if (item.id === selectedItem.id) {
                  const newStock = item.stock !== null ? Math.max(0, item.stock - quantity) : null;
                  const consumeType = item.consumeType || 'non_consumable';
                  return {
                      ...item,
                      stock: newStock,
                      owned: true,
                      ownedCount: (item.ownedCount || 0) + (consumeType !== 'non_consumable' ? quantity : 1),
                  };
              }
              return item;
          }));
      }

      setSelectedItem(null);
    } catch (error) {
      toast.error(error.message || '购买失败');
    } finally {
      setIsBuying(false);
    }
  };

  const currentPointsBalance = accounts.find(a => a.currency.code === DEFAULT_CURRENCY_CODE)?.balance || 0;

  return (
    <div className="space-y-6">
      {/* Hero Header - Compact & Theme Consistent */}
      <div className="relative overflow-hidden rounded-2xl bg-muted/30 border border-border/50 p-6">
        <div className="relative z-10 flex flex-col md:flex-row items-center md:items-start text-center md:text-left justify-between gap-6">
          
          <div className="space-y-2 max-w-2xl">
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-foreground flex items-center justify-center md:justify-start gap-3">
              <span className="p-2 rounded-lg bg-primary/10 text-primary">
                 <ShoppingCart className="h-5 w-5" />
              </span>
              {currencyName}商城
            </h1>
            <p className="text-muted-foreground text-sm md:text-base max-w-lg">
              探索独家装扮，定制您的个性化形象。使用{currencyName}兑换专属商品。
            </p>
          </div>

          {/* 余额卡片 - Compact */}
          {isAuthenticated && (
            <div className="flex-shrink-0 w-full md:w-auto">
               <div className="bg-card/50 backdrop-blur-sm border border-border/50 rounded-xl px-5 py-3 shadow-none min-w-[180px]">
                  <div className="flex flex-col md:items-end items-center gap-1">
                     <span className="text-xs font-medium text-muted-foreground">当前余额</span>
                     <div className="text-2xl font-bold text-foreground flex items-baseline gap-1">
                        {currentPointsBalance.toLocaleString()}
                        <span className="text-xs font-normal text-muted-foreground">{currencyName}</span>
                     </div>
                  </div>
               </div>
            </div>
          )}
        </div>
      </div>

      {/* 商品类型选择器 & 网格 */}
      <ItemTypeSelector value={itemType} onChange={setItemType} excludedTypes={[]}>
        <ShopItemGrid
          items={items}
          accounts={accounts}
          onPurchase={handleBuyClick}
          isAuthenticated={isAuthenticated}
          loading={loading}
        />
      </ItemTypeSelector>

      {/* 购买对话框 */}
      <PurchaseDialog
        open={buyDialogOpen}
        item={selectedItem}
        accounts={accounts}
        onConfirm={handleBuy}
        onCancel={() => setBuyDialogOpen(false)}

        purchasing={isBuying}
      />

      {/* 购买成功跳转对话框 */}
      <ItemPurchaseSuccessDialog
        open={showViewItemsDialog}
        onOpenChange={setShowViewItemsDialog}
        item={purchasedItem}
        onView={() => router.push('/profile/items')}
        onStay={() => setShowViewItemsDialog(false)}
      />

      {/* 勋章解锁对话框 */}
      <BadgeUnlockDialog
        open={showUnlockDialog}
        onOpenChange={setShowUnlockDialog}
        badgeItem={unlockedBadge}
      />
    </div>
  );
}
