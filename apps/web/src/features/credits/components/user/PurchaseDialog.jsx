import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Loader2, Check } from 'lucide-react';
import { CreditsBadge } from '../shared/CreditsBadge';
import { getItemTypeLabel } from '@/features/shop/utils/itemTypes';

/**
 * Purchase confirmation dialog
 * @param {Object} props
 * @param {boolean} props.open - Dialog open state
 * @param {Object} props.item - Shop item to purchase
 * @param {number} props.userBalance - User's current balance
 * @param {Function} props.onConfirm - Callback when confirmed
 * @param {Function} props.onCancel - Callback when cancelled
 * @param {boolean} props.purchasing - Purchase in progress
 */
export function PurchaseDialog({ open, item, userBalance, onConfirm, onCancel, purchasing }) {
  if (!item) return null;

  const balanceAfterPurchase = userBalance - item.price;
  const canAfford = userBalance >= item.price;

  return (
    <Dialog open={open} onOpenChange={onCancel}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>确认购买</DialogTitle>
          <DialogDescription>
            你确定要购买这个商品吗?
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex items-center gap-4 p-4 bg-muted rounded-lg">
            {item.imageUrl && (
              <div className="relative w-16 h-16 rounded-lg overflow-hidden">
                <img
                  src={item.imageUrl}
                  alt={item.name}
                  className="object-cover"
                />
              </div>
            )}
            <div className="flex-1">
              <div className="font-medium">{item.name}</div>
              <div className="text-sm text-muted-foreground">
                {getItemTypeLabel(item.type)}
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between p-4 border rounded-lg">
            <span className="text-muted-foreground">价格</span>
            <CreditsBadge amount={item.price} variant="large" />
          </div>

          {userBalance !== null && (
            <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
              <span className="text-sm text-muted-foreground">当前余额</span>
              <span className="font-medium">{userBalance}</span>
            </div>
          )}

          {canAfford && (
            <div className="flex items-center justify-between p-4 border border-green-500/20 bg-green-500/5 rounded-lg">
              <span className="text-sm text-green-600">购买后余额</span>
              <span className="font-medium text-green-600">
                {balanceAfterPurchase}
              </span>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={onCancel}
            disabled={purchasing}
          >
            取消
          </Button>
          <Button onClick={onConfirm} disabled={purchasing}>
            {purchasing ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                购买中...
              </>
            ) : (
              <>
                <Check className="mr-2 h-4 w-4" />
                确认购买
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
