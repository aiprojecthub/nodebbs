'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { shopApi, creditsApi } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import { ShoppingCart, Coins, Package, Award, Sparkles, Loader2, Check } from 'lucide-react';
import { Loading } from '@/components/common/Loading';
import { toast } from 'sonner';
import Image from 'next/image';

export default function ShopPage() {
  const { user, isAuthenticated } = useAuth();
  const [itemType, setItemType] = useState('all');
  const [items, setItems] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [balance, setBalance] = useState(null);
  const [selectedItem, setSelectedItem] = useState(null);
  const [buyDialogOpen, setBuyDialogOpen] = useState(false);
  const [isBuying, setIsBuying] = useState(false);

  useEffect(() => {
    if (isAuthenticated) {
      fetchBalance();
    }
    fetchItems();
  }, [itemType, isAuthenticated]);

  const fetchBalance = async () => {
    try {
      const data = await creditsApi.getBalance();
      setBalance(data.balance);
    } catch (error) {
      console.error('获取余额失败:', error);
    }
  };

  const fetchItems = async () => {
    setIsLoading(true);
    try {
      const params = itemType !== 'all' ? { type: itemType } : {};
      const data = await shopApi.getItems(params);
      setItems(data.items || []);
    } catch (error) {
      console.error('获取商品列表失败:', error);
      toast.error('获取商品列表失败');
    } finally {
      setIsLoading(false);
    }
  };

  const handleBuyClick = (item) => {
    if (!isAuthenticated) {
      toast.error('请先登录');
      return;
    }
    setSelectedItem(item);
    setBuyDialogOpen(true);
  };

  const handleBuy = async () => {
    if (!selectedItem) return;

    setIsBuying(true);
    try {
      await shopApi.buyItem(selectedItem.id);
      toast.success('购买成功！');

      // 刷新余额和商品列表
      await fetchBalance();
      await fetchItems();

      setBuyDialogOpen(false);
      setSelectedItem(null);
    } catch (error) {
      toast.error(error.message || '购买失败');
    } finally {
      setIsBuying(false);
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

  return (
    <div className="space-y-6">
      {/* 页面标题 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-card-foreground mb-2 flex items-center gap-2">
            <ShoppingCart className="h-6 w-6" />
            积分商城
          </h1>
          <p className="text-muted-foreground">使用积分购买专属装扮</p>
        </div>

        {/* 余额显示 */}
        {isAuthenticated && balance !== null && (
          <Card className="border-yellow-500/20 bg-yellow-500/5">
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <Coins className="h-5 w-5 text-yellow-500" />
                <div>
                  <div className="text-xs text-muted-foreground">我的余额</div>
                  <div className="text-lg font-bold text-yellow-600">{balance}</div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
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
              {items.map((item) => (
                <Card key={item.id} className="hover:shadow-lg transition-shadow">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2">
                        {getTypeIcon(item.type)}
                        <CardTitle className="text-lg">{item.name}</CardTitle>
                      </div>
                      {item.stock !== null && item.stock <= 10 && (
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
                    <div className="flex items-center gap-2">
                      <Coins className="h-5 w-5 text-yellow-500" />
                      <span className="text-xl font-bold text-yellow-600">{item.price}</span>
                    </div>
                    <Button
                      onClick={() => handleBuyClick(item)}
                      disabled={
                        !isAuthenticated ||
                        (item.stock !== null && item.stock <= 0) ||
                        (balance !== null && balance < item.price)
                      }
                    >
                      {item.stock !== null && item.stock <= 0 ? '已售罄' : '购买'}
                    </Button>
                  </CardFooter>
                </Card>
              ))}
            </div>
          ) : (
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
          )}
        </TabsContent>
      </Tabs>

      {/* 购买确认对话框 */}
      <Dialog open={buyDialogOpen} onOpenChange={setBuyDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>确认购买</DialogTitle>
            <DialogDescription>
              你确定要购买这个商品吗？
            </DialogDescription>
          </DialogHeader>

          {selectedItem && (
            <div className="space-y-4">
              <div className="flex items-center gap-4 p-4 bg-muted rounded-lg">
                {selectedItem.imageUrl && (
                  <div className="relative w-16 h-16 rounded-lg overflow-hidden">
                    <img
                      src={selectedItem.imageUrl}
                      alt={selectedItem.name}
                      className="object-cover"
                    />
                  </div>
                )}
                <div className="flex-1">
                  <div className="font-medium">{selectedItem.name}</div>
                  <div className="text-sm text-muted-foreground">
                    {getTypeName(selectedItem.type)}
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between p-4 border rounded-lg">
                <span className="text-muted-foreground">价格</span>
                <div className="flex items-center gap-2">
                  <Coins className="h-5 w-5 text-yellow-500" />
                  <span className="text-xl font-bold text-yellow-600">
                    {selectedItem.price}
                  </span>
                </div>
              </div>

              {balance !== null && (
                <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
                  <span className="text-sm text-muted-foreground">当前余额</span>
                  <span className="font-medium">{balance}</span>
                </div>
              )}

              {balance !== null && balance >= selectedItem.price && (
                <div className="flex items-center justify-between p-4 border border-green-500/20 bg-green-500/5 rounded-lg">
                  <span className="text-sm text-green-600">购买后余额</span>
                  <span className="font-medium text-green-600">
                    {balance - selectedItem.price}
                  </span>
                </div>
              )}
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setBuyDialogOpen(false)}
              disabled={isBuying}
            >
              取消
            </Button>
            <Button onClick={handleBuy} disabled={isBuying}>
              {isBuying ? (
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
    </div>
  );
}
