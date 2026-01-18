import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Loader2, Check, X, Medal, Gift } from 'lucide-react';
import { ItemTypeIcon } from '@/extensions/shop/components/shared/ItemTypeIcon';
import { getItemTypeLabel, isItemExpired } from '@/extensions/shop/utils/itemTypes';
import Time from '@/components/common/Time';

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
      className={`shadow-sm hover:border-primary/30 flex flex-col h-full border-border/50 ${
        item.isEquipped ? 'border-primary/50 bg-primary/5 ring-1 ring-primary/20' : ''
      } ${expired ? 'opacity-60 grayscale' : ''}`}
    >
      <CardHeader className="p-3 md:p-6 space-y-1 md:space-y-1.5 pb-0">
        <div className="flex items-start justify-between min-w-0 gap-2">
          <div className="flex items-center gap-1.5 md:gap-2 min-w-0 flex-1">
             <div className="hidden md:block">
               <ItemTypeIcon type={item.itemType} />
            </div>
            <CardTitle className="text-sm md:text-lg font-bold truncate leading-tight w-full" title={item.itemName}>
                {item.itemName}
            </CardTitle>
          </div>
          <div className="flex gap-1 flex-shrink-0">
            {item.isEquipped && (
              <Badge className="bg-primary text-[10px] md:text-xs px-1.5 h-5 md:h-auto">
                <Check className="h-2.5 w-2.5 md:h-3 md:w-3 mr-0.5" />
                <span className="md:inline hidden">已装备</span>
                <span className="md:hidden inline">装备</span>
              </Badge>
            )}
            {expired && (
              <Badge variant="destructive" className="text-[10px] md:text-xs px-1.5 h-5 md:h-auto">过期</Badge>
            )}
          </div>
        </div>
        <CardDescription className="text-xs md:text-sm line-clamp-1 md:line-clamp-2 min-h-0 md:min-h-[2.5rem]">
          {item.itemDescription || getItemTypeLabel(item.itemType)}
        </CardDescription>
      </CardHeader>

      <CardContent className="flex-1 p-3 md:p-6 pt-2 md:pt-0 flex items-center justify-center">
         {item.itemImageUrl ? (
          <div className="relative w-full aspect-square flex items-center justify-center rounded-lg bg-muted/20">
            <img
              src={item.itemImageUrl}
              alt={item.itemName}
              className="object-contain max-h-full transition-transform duration-300 hover:scale-110"
            />
          </div>
        ) : (
             <div className="w-full aspect-square bg-muted/10 rounded-lg flex items-center justify-center">
                <ItemTypeIcon type={item.itemType} className="h-8 w-8 text-muted-foreground/30" />
             </div>
        )}
      </CardContent>

      <CardFooter className="p-3 md:p-6 pt-0 flex flex-col gap-2">
        {/* 获取时间行 - 固定高度 */}
        <div className="w-full flex items-center justify-between text-[10px] md:text-sm text-muted-foreground h-5 md:h-8">
          <span>获得: <Time date={item.createdAt} fromNow className="ml-1" /></span>

          {/* 礼物图标 - 点击弹出详情 */}
          {(() => {
            try {
              if (item.metadata) {
                const meta = typeof item.metadata === 'string' ? JSON.parse(item.metadata) : item.metadata;
                if (meta.fromUserId) {
                  return (
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant='ghost' size='icon' className="h-5 w-5 md:h-8 md:w-8 text-amber-500 hover:text-amber-600 transition-colors" title="查看礼物详情">
                          <Gift className="h-3 w-3 md:h-4 md:w-4" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-64 p-3">
                        <div className="space-y-2">
                          <p className="text-sm font-medium text-amber-600 flex items-center gap-1.5">
                            <Gift className="h-4 w-4" />
                            来自 {meta.fromUsername || '好友'} 的礼物
                          </p>
                          {meta.message && (
                            <p className="text-sm text-muted-foreground italic bg-muted/50 p-2 rounded">
                              "{meta.message}"
                            </p>
                          )}
                        </div>
                      </PopoverContent>
                    </Popover>
                  );
                }
              }
            } catch (e) {
              // 忽略解析错误
            }
            return null;
          })()}
        </div>

        {item.expiresAt && (
          <div className="w-full flex items-center justify-between text-[10px] md:text-sm text-muted-foreground">
            <span>过期: </span>
            <span className={expired ? 'text-destructive' : ''}>
              {expired ? '已过期' : <Time date={item.expiresAt} fromNow />}
            </span>
          </div>
        )}

        {!expired && (
          item.itemType === 'badge' ? (
            <Button
              className="w-full h-8 md:h-10 text-xs md:text-sm"
              variant="secondary"
              onClick={() => (window.location.href = '/profile/badges')}
              size="sm"
            >
              <Medal className="h-3 w-3 md:h-4 md:w-4" />
              查看
            </Button>
          ) : (
            <Button
              className="w-full h-8 md:h-10 text-xs md:text-sm"
              variant={item.isEquipped ? 'outline' : 'default'}
              size="sm"
              onClick={() =>
                item.isEquipped ? onUnequip(item.id) : onEquip(item.id)
              }
              disabled={actioning}
            >
              {actioning ? (
                <>
                  <Loader2 className="h-3 w-3 md:h-4 md:w-4 animate-spin" />
                  <span className="md:inline hidden">{item.isEquipped ? '卸下中...' : '装备中...'}</span>
                  <span className="md:hidden inline">...</span>
                </>
              ) : item.isEquipped ? (
                <>
                  <X className="h-3 w-3 md:h-4 md:w-4" />
                  卸下
                </>
              ) : (
                <>
                  <Check className="h-3 w-3 md:h-4 md:w-4" />
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
