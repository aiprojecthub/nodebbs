import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ItemTypeIcon } from '@/extensions/shop/components/shared/ItemTypeIcon';
import { CreditsBadge } from '../shared/CreditsBadge';
import { getItemTypeLabel } from '@/extensions/shop/utils/itemTypes';

/**
 * 带有购买按钮的单个商品卡片
 * @param {Object} props
 * @param {Object} props.item - 商品对象
 * @param {number} props.userBalance - 用户当前余额
 * @param {Function} props.onPurchase - 点击购买按钮时的回调
 * @param {boolean} props.isAuthenticated - 用户是否已认证
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
