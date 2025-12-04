'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { shopApi } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import { Package, Award, Sparkles, Loader2, Check, X } from 'lucide-react';
import { Loading } from '@/components/common/Loading';
import { toast } from 'sonner';
import Image from 'next/image';
import TimeAgo from '@/components/forum/TimeAgo';

export default function MyItemsPage() {
  const { user } = useAuth();
  const [itemType, setItemType] = useState('all');
  const [items, setItems] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [actioningItemId, setActioningItemId] = useState(null);

  useEffect(() => {
    fetchItems();
  }, [itemType]);

  const fetchItems = async () => {
    setIsLoading(true);
    try {
      const params = itemType !== 'all' ? { type: itemType } : {};
      const data = await shopApi.getMyItems(params);
      setItems(data.items || []);
    } catch (error) {
      console.error('获取我的道具失败:', error);
      toast.error('获取我的道具失败');
    } finally {
      setIsLoading(false);
    }
  };

  const handleEquip = async (userItemId) => {
    setActioningItemId(userItemId);
    try {
      await shopApi.equipItem(userItemId);
      toast.success('装备成功');
      await fetchItems();
    } catch (error) {
      toast.error(error.message || '装备失败');
    } finally {
      setActioningItemId(null);
    }
  };

  const handleUnequip = async (userItemId) => {
    setActioningItemId(userItemId);
    try {
      await shopApi.unequipItem(userItemId);
      toast.success('卸下成功');
      await fetchItems();
    } catch (error) {
      toast.error(error.message || '卸下失败');
    } finally {
      setActioningItemId(null);
    }
  };

  const getTypeIcon = (type) => {
    switch (type) {
      case 'avatar_frame':
        return <Package className="h-5 w-5" />;
      case 'badge':
        return <Award className="h-5 w-5" />;
      default:
        return <Sparkles className="h-5 w-5" />;
    }
  };

  const getTypeName = (type) => {
    switch (type) {
      case 'avatar_frame':
        return '头像框';
      case 'badge':
        return '勋章';
      default:
        return '其他';
    }
  };

  const isExpired = (expiresAt) => {
    if (!expiresAt) return false;
    return new Date(expiresAt) < new Date();
  };

  return (
    <div className="space-y-6">
      {/* 页面标题 */}
      <div>
        <h1 className="text-2xl font-bold text-card-foreground mb-2 flex items-center gap-2">
          <Package className="h-6 w-6" />
          我的道具
        </h1>
        <p className="text-muted-foreground">管理你的专属装扮</p>
      </div>

      {/* 分类标签 */}
      <Tabs value={itemType} onValueChange={setItemType}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="all">全部</TabsTrigger>
          <TabsTrigger value="avatar_frame" className="gap-2">
            <Package className="h-4 w-4" />
            头像框
          </TabsTrigger>
          <TabsTrigger value="badge" className="gap-2">
            <Award className="h-4 w-4" />
            勋章
          </TabsTrigger>
          <TabsTrigger value="custom" className="gap-2">
            <Sparkles className="h-4 w-4" />
            其他
          </TabsTrigger>
        </TabsList>

        <TabsContent value={itemType}>
          {isLoading ? (
            <Loading text="加载中..." className="py-12" />
          ) : items.length > 0 ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {items.map((item) => {
                const expired = isExpired(item.expiresAt);
                const isActioning = actioningItemId === item.id;

                return (
                  <Card
                    key={item.id}
                    className={`hover:shadow-lg transition-shadow ${
                      item.isEquipped ? 'border-primary' : ''
                    } ${expired ? 'opacity-60' : ''}`}
                  >
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-2">
                          {getTypeIcon(item.itemType)}
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
                        {item.itemDescription || getTypeName(item.itemType)}
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
                            {expired
                              ? '已过期'
                              : <TimeAgo date={item.expiresAt}/>
                                }
                          </span>
                        </div>
                      )}

                      {!expired && (
                        <Button
                          className="w-full"
                          variant={item.isEquipped ? 'outline' : 'default'}
                          onClick={() =>
                            item.isEquipped
                              ? handleUnequip(item.id)
                              : handleEquip(item.id)
                          }
                          disabled={isActioning}
                        >
                          {isActioning ? (
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
                      )}
                    </CardFooter>
                  </Card>
                );
              })}
            </div>
          ) : (
            <Card>
              <CardContent className="text-center py-12">
                <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-50" />
                <h3 className="text-lg font-medium text-card-foreground mb-2">
                  暂无道具
                </h3>
                <p className="text-muted-foreground mb-4">
                  {itemType === 'all'
                    ? '你还没有购买任何道具'
                    : `你还没有购买${getTypeName(itemType)}`}
                </p>
                <Button onClick={() => (window.location.href = '/profile/shop')}>
                  前往商城
                </Button>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
