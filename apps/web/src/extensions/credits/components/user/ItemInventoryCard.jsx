import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, Check, X, Medal, Gift } from 'lucide-react';
import { ItemTypeIcon } from '@/extensions/shop/components/shared/ItemTypeIcon';
import { getItemTypeLabel, isItemExpired } from '@/extensions/shop/utils/itemTypes';
import TimeAgo from '@/components/forum/TimeAgo';

/**
 * 带有装备/卸下控制的用户物品卡片
 * @param {Object} props
 * @param {Object} props.item - 用户物品对象
 * @param {Function} props.onEquip - 点击装备按钮时的回调
 * @param {Function} props.onUnequip - 点击卸下按钮时的回调
 * @param {boolean} props.actioning - 操作进行中
 */
export function ItemInventoryCard({ item, onEquip, onUnequip, actioning }) {
  const expired = isItemExpired(item.expiresAt);

  return (
    <Card
      className={`hover:shadow-lg transition-shadow ${
        item.isEquipped ? 'border-primary' : ''
      } ${expired ? 'opacity-60' : ''}`}
    >
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            <ItemTypeIcon type={item.itemType} />
            <CardTitle className="text-lg">{item.itemName}</CardTitle>
          </div>
          <div className="flex gap-2">
            {item.isEquipped && (
              <Badge className="bg-primary">
                <Check className="h-3 w-3 mr-1" />
                已装备
              </Badge>
            )}
            {expired && (
              <Badge variant="destructive">已过期</Badge>
            )}
          </div>
        </div>
        <CardDescription>
          {item.itemDescription || getItemTypeLabel(item.itemType)}
        </CardDescription>
      </CardHeader>

      {item.itemImageUrl && (
        <CardContent>
          <div className="relative w-full aspect-square overflow-hidden">
            <img
              src={item.itemImageUrl}
              alt={item.itemName}
              className="object-contain"
            />
          </div>
        </CardContent>
      )}

      <CardFooter className="flex flex-col gap-2">
        <div className="w-full flex items-center justify-between text-sm text-muted-foreground">
          <span>获得时间</span>
          <span>
            <TimeAgo date={item.createdAt} />
          </span>
        </div>

        {item.expiresAt && (
          <div className="w-full flex items-center justify-between text-sm text-muted-foreground">
            <span>过期时间</span>
            <span className={expired ? 'text-destructive' : ''}>
              {expired ? '已过期' : <TimeAgo date={item.expiresAt} />}
            </span>
          </div>
        )}

        {/* 礼物信息 */}
        {(() => {
          try {
            if (item.metadata) {
              const meta = typeof item.metadata === 'string' ? JSON.parse(item.metadata) : item.metadata;
              if (meta.fromUserId) {
                return (
                  <div className="w-full mt-1 pt-2 border-t border-border">
                    <div className="flex items-center gap-1.5 text-sm text-amber-600 mb-1">
                      <Gift className="h-3.5 w-3.5" />
                      <span className="font-medium">
                        来自 {meta.fromUsername || '好友'} 的礼物
                      </span>
                    </div>
                    {meta.message && (
                      <p className="text-xs text-muted-foreground italic bg-muted/50 p-2 rounded">
                        "{meta.message}"
                      </p>
                    )}
                  </div>
                );
              }
            }
          } catch (e) {
            // 忽略解析错误
          }
          return null;
        })()}

        {!expired && (
          item.itemType === 'badge' ? (
            <Button
              className="w-full"
              variant="secondary"
              onClick={() => (window.location.href = '/profile/badges')}
            >
              <Medal className="mr-2 h-4 w-4" />
              查看勋章
            </Button>
          ) : (
            <Button
              className="w-full"
              variant={item.isEquipped ? 'outline' : 'default'}
              onClick={() =>
                item.isEquipped ? onUnequip(item.id) : onEquip(item.id)
              }
              disabled={actioning}
            >
              {actioning ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {item.isEquipped ? '卸下中...' : '装备中...'}
                </>
              ) : item.isEquipped ? (
                <>
                  <X className="mr-2 h-4 w-4" />
                  卸下
                </>
              ) : (
                <>
                  <Check className="mr-2 h-4 w-4" />
                  装备
                </>
              )}
            </Button>
          )
        )}
      </CardFooter>
    </Card>
  );
}
