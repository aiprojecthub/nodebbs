import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ItemTypeIcon } from '@/features/shop/components/shared/ItemTypeIcon';
import { CreditsBadge } from '../shared/CreditsBadge';
import { getItemTypeLabel } from '@/features/shop/utils/itemTypes';

/**
 * Single shop item card with purchase button
 * @param {Object} props
 * @param {Object} props.item - Shop item object
 * @param {number} props.userBalance - User's current balance
 * @param {Function} props.onPurchase - Callback when purchase button clicked
 * @param {boolean} props.isAuthenticated - Whether user is authenticated
 */
export function ShopItemCard({ item, userBalance, onPurchase, isAuthenticated }) {
  const isOutOfStock = item.stock !== null && item.stock <= 0;
  const canAfford = userBalance !== null && userBalance >= item.price;
  const canPurchase = isAuthenticated && !isOutOfStock && canAfford;

  return (
    <Card className="hover:shadow-lg transition-shadow">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            <ItemTypeIcon type={item.type} />
            <CardTitle className="text-lg">{item.name}</CardTitle>
          </div>
          {item.stock !== null && item.stock <= 10 && item.stock > 0 && (
            <Badge variant="destructive" className="text-xs">
              仅剩 {item.stock}
            </Badge>
          )}
        </div>
        <CardDescription>{item.description || '暂无描述'}</CardDescription>
      </CardHeader>

      {item.imageUrl && (
        <CardContent>
          <div className="relative w-full aspect-square overflow-hidden">
            <img
              src={item.imageUrl}
              alt={item.name}
              className="object-contain"
            />
          </div>
        </CardContent>
      )}

      <CardFooter className="flex items-center justify-between">
        <CreditsBadge amount={item.price} variant="large" />
        <Button
          onClick={() => onPurchase(item)}
          disabled={!canPurchase}
        >
          {isOutOfStock ? '已售罄' : '购买'}
        </Button>
      </CardFooter>
    </Card>
  );
}
