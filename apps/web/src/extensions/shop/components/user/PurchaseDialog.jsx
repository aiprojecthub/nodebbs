import { useState, useEffect } from 'react';
import {
  DialogFooter,
} from '@/components/ui/dialog';
import { FormDialog } from '@/components/common/FormDialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Loader2, Check, Search, X, Gift } from 'lucide-react';
import { CreditsBadge } from '../../../ledger/components/common/CreditsBadge';
import { getItemTypeLabel } from '@/extensions/shop/utils/itemTypes';
import UserAvatar from '@/components/user/UserAvatar';
import { searchApi } from '@/lib/api';

/**
 * 购买确认对话框
 * @param {Object} props
 * @param {boolean} props.open - 对话框打开状态
 * @param {Object} props.item - 要购买的商品
 * @param {Array} props.accounts - User's accounts list
 * @param {Function} props.onConfirm - 确认时的回调。如果是赠送，包含 { isGift, receiverId, message }。
 * @param {Function} props.onCancel - 取消时的回调
 * @param {boolean} props.purchasing - 购买进行中
 */
export function PurchaseDialog({ open, item, accounts = [], onConfirm, onCancel, purchasing }) {
  const [mode, setMode] = useState('buy'); // 'buy' | 'gift'
  const [receiver, setReceiver] = useState(null);
  const [message, setMessage] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);

  // 对话框打开/关闭时重置状态
  useEffect(() => {
    if (open) {
      setMode('buy');
      setReceiver(null);
      setMessage('');
      setSearchQuery('');
      setSearchResults([]);
    }
  }, [open]);

  // 搜索用户
  useEffect(() => {
    const searchUsers = async () => {
      if (!searchQuery.trim()) {
        setSearchResults([]);
        return;
      }
      
      setSearching(true);
      try {
        // 使用 searchApi 查找用户。假设它返回 { users: [] } 或仅 []
        // 基于 api.js: searchApi.search(query, type, page, limit)
        // 后端期望 'users' (复数)，并返回 { users: { items: [] } }
        const res = await searchApi.search(searchQuery, 'users', 1, 5);
        if (res && res.users && Array.isArray(res.users.items)) {
           setSearchResults(res.users.items);
        } else if (res && Array.isArray(res.users)) {
            // 如果 API 更改，则进行回退处理
           setSearchResults(res.users);
        } else {
           setSearchResults([]);
        }
      } catch (err) {
        console.error('Search failed', err);
      } finally {
        setSearching(false);
      }
    };

    const timer = setTimeout(searchUsers, 500);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  if (!item) return null;

  const account = accounts.find(a => a.currency.code === item.currencyCode);
  const balance = account ? Number(account.balance) : 0;
  const canAfford = balance >= item.price;
  
  const handleConfirm = () => {
    if (mode === 'gift') {
      if (!receiver) return;
      onConfirm({ isGift: true, receiverId: receiver.id, message });
    } else {
      onConfirm({}); // 普通购买
    }
  };

  return (
    <FormDialog
      open={open}
      onOpenChange={onCancel}
      maxWidth="sm:max-w-[425px]"
      title="购买商品"
      description={item.name}
      footer={
        <DialogFooter>
          <Button
            variant="outline"
            onClick={onCancel}
            disabled={purchasing}
          >
            取消
          </Button>
          <Button 
            onClick={handleConfirm} 
            disabled={purchasing || !canAfford || (mode === 'gift' && !receiver)}
          >
            {purchasing ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                处理中...
              </>
            ) : (
              <>
                {mode === 'gift' ? <Gift className="h-4 w-4" /> : <Check className="h-4 w-4" />}
                {mode === 'gift' ? '确认赠送' : '确认购买'}
              </>
            )}
          </Button>
        </DialogFooter>
      }
    >
        <Tabs value={mode} onValueChange={setMode} className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="buy">自用购买</TabsTrigger>
            <TabsTrigger value="gift">赠送好友</TabsTrigger>
          </TabsList>
          
          <div className="mt-4 space-y-4">
             {/* 商品信息 */}
            <div className="flex items-center gap-4 p-4 bg-muted/50 rounded-lg">
              {item.imageUrl && (
                <div className="relative w-12 h-12 rounded-lg overflow-hidden shrink-0">
                  <img
                    src={item.imageUrl}
                    alt={item.name}
                    className="object-cover w-full h-full"
                  />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <div className="font-medium truncate">{item.name}</div>
                <div className="text-xs text-muted-foreground">
                  {getItemTypeLabel(item.type)}
                </div>
              </div>
              <CreditsBadge amount={item.price} currencyCode={item.currencyCode} />
            </div>

            <TabsContent value="buy" className="mt-0 space-y-4">
              <div className="text-sm text-muted-foreground">
                购买后将直接发放到您的背包中。
              </div>
            </TabsContent>

            <TabsContent value="gift" className="mt-0 space-y-4">
              {!receiver ? (
                <div className="space-y-2">
                  <Label>搜索用户</Label>
                  <div className="relative">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="输入用户名搜索..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-9"
                    />
                  </div>
                  
                  {/* 搜索结果 */}
                  {searchQuery && (
                    <div className="border rounded-md mt-2 max-h-[200px] overflow-y-auto">
                      {searching ? (
                        <div className="p-4 text-center text-sm text-muted-foreground flex items-center justify-center">
                          <Loader2 className="h-4 w-4 animate-spin mr-2" />
                          搜索中...
                        </div>
                      ) : searchResults.length > 0 ? (
                        <div className="divide-y">
                          {searchResults.map(user => (
                            <div 
                              key={user.id}
                              className="flex items-center gap-3 p-3 hover:bg-muted cursor-pointer transition-colors"
                              onClick={() => {
                                setReceiver(user);
                                setSearchQuery('');
                                setSearchResults([]);
                              }}
                            >
                              <UserAvatar url={user.avatar} name={user.name || user.username} size="sm" />
                              <div className="text-sm font-medium">{user.username || user.name}</div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="p-4 text-center text-sm text-muted-foreground">
                          未找到相关用户
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="space-y-2">
                     <Label>接收者</Label>
                     <div className="flex items-center justify-between p-3 border rounded-lg bg-card">
                       <div className="flex items-center gap-3">
                         <UserAvatar url={receiver.avatar} name={receiver.name || receiver.username} size="sm" />
                         <span className="font-medium text-sm">{receiver.username || receiver.name}</span>
                       </div>
                       <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setReceiver(null)}>
                         <X className="h-4 w-4" />
                       </Button>
                     </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label>赠言 (可选)</Label>
                    <Textarea 
                      placeholder="写点什么..." 
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      maxLength={200}
                      className="resize-none"
                    />
                    <div className="text-xs text-right text-muted-foreground">{message.length}/200</div>
                  </div>
                </div>
              )}
            </TabsContent>

            {/* 余额信息 */}
            {(() => {
              const account = accounts.find(a => a.currency.code === item.currencyCode);
              const balance = account ? Number(account.balance) : 0;
              const canAfford = balance >= item.price;
              
              return (
                  <div className="flex items-center justify-between py-2 text-sm border-t">
                    <span className="text-muted-foreground">当前余额</span>
                    <div className="flex flex-col items-end">
                      <div className={canAfford ? 'font-medium' : 'font-medium text-destructive'}>
                        <CreditsBadge amount={balance} currencyCode={item.currencyCode} />
                      </div>
                      {!canAfford && <span className="text-xs text-destructive">余额不足</span>}
                    </div>
                  </div>
              );
            })()}
            
          </div>
        </Tabs>
    </FormDialog>
  );
}
