import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ItemTypeIcon } from '@/extensions/shop/components/shared/ItemTypeIcon';
import { CreditsBadge } from '../../../ledger/components/common/CreditsBadge';
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
    <Card className="shadow-sm hover:border-primary/30 flex flex-col h-full border-border/50">
      <CardHeader className="p-3 md:p-6 space-y-1 md:space-y-1.5 pb-0">
        <div className="flex items-start justify-between min-w-0 gap-2">
          <div className="flex items-center gap-1.5 md:gap-2 min-w-0 flex-1">
            <div className="hidden md:block">
               <ItemTypeIcon type={item.type} />
            </div>
            <CardTitle className="text-sm md:text-lg font-bold truncate leading-tight w-full" title={item.name}>
                {item.name}
            </CardTitle>
          </div>
          {item.stock !== null && item.stock <= 10 && item.stock > 0 && (
            <Badge variant="destructive" className="text-[10px] md:text-xs px-1 h-5 md:h-auto whitespace-nowrap flex-shrink-0">
              仅 {item.stock}
            </Badge>
          )}
        </div>
        <CardDescription className="text-xs md:text-sm line-clamp-1 md:line-clamp-2 min-h-0 md:min-h-[2.5rem]">
            {item.description || '暂无描述'}
        </CardDescription>
      </CardHeader>

      <CardContent className="flex-1 p-3 md:p-6 pt-2 md:pt-0 flex items-center justify-center">
        {item.imageUrl ? (
          <div className="relative w-full aspect-square flex items-center justify-center rounded-lg bg-muted/20">
            <img
              src={item.imageUrl}
              alt={item.name}
              className="object-contain max-h-full transition-transform duration-300 hover:scale-110"
            />
          </div>
        ) : (
             <div className="w-full aspect-square bg-muted/10 rounded-lg flex items-center justify-center">
                <ItemTypeIcon type={item.type} className="h-8 w-8 text-muted-foreground/30" />
             </div>
        )}
      </CardContent>

      <CardFooter className="p-3 md:p-6 pt-0 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div className="w-full md:w-auto flex justify-center md:justify-start">
             <CreditsBadge amount={item.price} currencyCode={item.currencyCode} variant="default" className="scale-90 md:scale-100 origin-left" />
        </div>
        <Button
          onClick={() => onPurchase(item)}
          disabled={!canPurchase}
          size="sm"
          className="w-full md:w-auto h-8 md:h-10 text-xs md:text-sm"
        >
          {isOutOfStock ? '售罄' : '购买'}
        </Button>
      </CardFooter>
    </Card>
  );
}
