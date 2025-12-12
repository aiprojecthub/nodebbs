import { Card, CardContent } from '@/components/ui/card';
import { ShoppingCart } from 'lucide-react';
import { Loading } from '@/components/common/Loading';
import { ShopItemCard } from './ShopItemCard';

/**
 * Grid layout of shop items
 * @param {Object} props
 * @param {Array} props.items - Array of shop items
 * @param {number} props.userBalance - User's current balance
 * @param {Function} props.onPurchase - Callback when purchase button clicked
 * @param {boolean} props.isAuthenticated - Whether user is authenticated
 * @param {boolean} props.loading - Loading state
 */
export function ShopItemGrid({ items, userBalance, onPurchase, isAuthenticated, loading }) {
  if (loading) {
    return <Loading text="加载中..." className="py-12" />;
  }

  if (items.length === 0) {
    return (
      <Card>
        <CardContent className="text-center py-12">
          <ShoppingCart className="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-50" />
          <h3 className="text-lg font-medium text-card-foreground mb-2">
            暂无商品
          </h3>
          <p className="text-muted-foreground">
            该分类下暂时没有商品
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {items.map((item) => (
        <ShopItemCard
          key={item.id}
          item={item}
          userBalance={userBalance}
          onPurchase={onPurchase}
          isAuthenticated={isAuthenticated}
        />
      ))}
    </div>
  );
}
